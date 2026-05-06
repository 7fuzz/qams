import db from '@/lib/db';
import { Issue } from '@/types/app';
import { generateId } from '@/lib/id-utils';
import { ISSUE_STATUS } from '@/lib/constants';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export const IssueModel = {
    async findAll(filters: { 
        projectId?: string, 
        moduleId?: string, 
        status?: string, 
        developerId?: string,
        runId?: string,
        testCaseId?: string,
        sortBy?: string,
        sortOrder?: 'ASC' | 'DESC'
    }, limit: number, offset: number): Promise<{ data: Issue[], total: number }> {
        
        if (filters.runId) {
            // Special case for Run Detail view
            const [data] = await db.execute<Issue[] & RowDataPacket[]>(`
                SELECT 
                    i.*,
                    u.name as reporter_name,
                    d.name as developer_name,
                    s.name as solver_name,
                    m.name as module_name,
                    p.name as project_name,
                    COALESCE(
                        (SELECT status FROM issue_history h 
                         WHERE h.issue_id = i.issue_id 
                         AND h.timestamp <= (SELECT COALESCE(completed_at, CURRENT_TIMESTAMP) FROM test_runs WHERE run_id = ?) 
                         ORDER BY h.timestamp DESC LIMIT 1),
                        i.status
                    ) as status
                FROM issues i 
                JOIN users u ON i.reporter_id = u.user_id
                LEFT JOIN users d ON i.developer_id = d.user_id
                LEFT JOIN users s ON i.solved_by_id = s.user_id
                JOIN test_cases tc ON i.test_case_id = tc.test_case_id
                JOIN scenarios tc_sc ON tc.scenario_id = tc_sc.scenario_id
                JOIN modules m ON tc_sc.module_id = m.module_id
                JOIN projects p ON m.project_id = p.project_id
                WHERE i.test_case_id IN (SELECT test_case_id FROM test_executions WHERE run_id = ?)
                ORDER BY i.created_at DESC
            `, [filters.runId, filters.runId]);
            
            return { data, total: data.length };
        }

        let whereClause = 'WHERE 1=1';
        const params: any[] = [];

        if (filters.testCaseId) {
            whereClause += ' AND i.test_case_id = ?';
            params.push(filters.testCaseId);
        }
        if (filters.projectId) {
            whereClause += ' AND p.project_id = ?';
            params.push(filters.projectId);
        }
        if (filters.moduleId) {
            whereClause += ' AND m.module_id = ?';
            params.push(filters.moduleId);
        }
        if (filters.status) {
            whereClause += ' AND i.status = ?';
            params.push(filters.status);
        }
        if (filters.developerId) {
            whereClause += ' AND i.developer_id = ?';
            params.push(filters.developerId);
        }

        const baseQuery = `
            FROM issues i 
            JOIN users u ON i.reporter_id = u.user_id
            LEFT JOIN users d ON i.developer_id = d.user_id
            LEFT JOIN users s ON i.solved_by_id = s.user_id
            JOIN test_cases tc ON i.test_case_id = tc.test_case_id
            JOIN scenarios tc_sc ON tc.scenario_id = tc_sc.scenario_id
            JOIN modules m ON tc_sc.module_id = m.module_id
            JOIN projects p ON m.project_id = p.project_id
            ${whereClause}
        `;

        const [countRows] = await db.execute<(RowDataPacket & { total: number })[]>(`SELECT COUNT(*) as total ${baseQuery}`, params);
        const total = countRows[0].total;
        
        const allowedSortColumns: Record<string, string> = {
            'title': 'i.title',
            'severity': 'i.severity',
            'status': 'i.status',
            'project_name': 'p.name',
            'module_name': 'm.name',
            'updated_at': 'i.updated_at',
            'created_at': 'i.created_at',
            'estimated_date': 'i.estimated_date',
            'reporter_name': 'u.name',
            'developer_name': 'd.name'
        };

        const sortColumn = allowedSortColumns[filters.sortBy || ''] || 'i.updated_at';
        const sortOrder = filters.sortOrder === 'ASC' ? 'ASC' : 'DESC';

        const [data] = await db.execute<Issue[] & RowDataPacket[]>(`
            SELECT 
                i.*, 
                u.name as reporter_name, 
                d.name as developer_name, 
                s.name as solver_name,
                m.name as module_name,
                p.name as project_name,
                m.module_id,
                p.project_id
            ${baseQuery}
            ORDER BY ${sortColumn} ${sortOrder}
            LIMIT ? OFFSET ?
        `, [...params, limit, offset]);

        return { data, total };
    },

    async create(data: { 
        test_case_id: string, 
        title: string, 
        description: string, 
        severity: string, 
        reporter_id: string,
        estimated_date?: string,
        execution_id?: string, 
        developer_id?: string 
    }): Promise<string> {
        const issueId = generateId();
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            await connection.execute(`
                INSERT INTO issues (issue_id, test_case_id, snapshot_execution_id, reporter_id, developer_id, title, description, severity, status, estimated_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                issueId, data.test_case_id, data.execution_id || null, data.reporter_id, 
                data.developer_id || null, data.title, data.description, data.severity, ISSUE_STATUS.OPEN, data.estimated_date || null
            ]);

            let runId = null;
            if (data.execution_id) {
                const [execs] = await connection.execute<RowDataPacket[]>('SELECT run_id FROM test_executions WHERE execution_id = ?', [data.execution_id]);
                if (execs.length > 0) runId = execs[0].run_id;
            }

            await connection.execute(`
                INSERT INTO issue_history (history_id, issue_id, run_id, execution_id, status, user_id)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [generateId(), issueId, runId, data.execution_id || null, ISSUE_STATUS.OPEN, data.reporter_id]);

            await connection.commit();
            return issueId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    async update(id: string, data: { 
        status: string, 
        severity: string, 
        title: string, 
        description: string, 
        user_id: string,
        estimated_date?: string,
        execution_id?: string, 
        developer_id?: string 
    }): Promise<void> {
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            let solved_by_id = null;
            if (data.status === ISSUE_STATUS.CLOSED) {
                const [issues] = await connection.execute<RowDataPacket[]>('SELECT solved_by_id FROM issues WHERE issue_id = ?', [id]);
                solved_by_id = issues.length > 0 ? issues[0].solved_by_id : null;
                if (!solved_by_id) solved_by_id = data.user_id;
            }

            await connection.execute(`
                UPDATE issues 
                SET status = ?, severity = ?, title = ?, description = ?, developer_id = ?, solved_by_id = COALESCE(?, solved_by_id), estimated_date = ?
                WHERE issue_id = ?
            `, [data.status, data.severity, data.title, data.description, data.developer_id || null, solved_by_id, data.estimated_date || null, id]);

            let runId = null;
            if (data.execution_id) {
                const [execs] = await connection.execute<RowDataPacket[]>('SELECT run_id FROM test_executions WHERE execution_id = ?', [data.execution_id]);
                if (execs.length > 0) runId = execs[0].run_id;
            }

            await connection.execute(`
                INSERT INTO issue_history (history_id, issue_id, run_id, execution_id, status, user_id)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [generateId(), id, runId, data.execution_id || null, data.status, data.user_id]);

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    async delete(id: string): Promise<void> {
        await db.execute('DELETE FROM issues WHERE issue_id = ?', [id]);
    }
};
