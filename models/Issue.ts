import db from '@/lib/db';
import { Issue } from '@/types/app';
import { generateId } from '@/lib/id-utils';
import { ISSUE_STATUS } from '@/lib/constants';
import { RowDataPacket } from 'mysql2';

export const IssueModel = {
    async findAll(filters: { 
        projectId?: string, 
        moduleId?: string, 
        status?: string, 
        developerId?: string,
        runId?: string,
        testCaseId?: string,
        issueId?: string,
        issueIds?: string[],
        search?: string,
        sortBy?: string,
        sortOrder?: 'ASC' | 'DESC'
    }, limit: number, offset: number): Promise<{ data: Issue[], total: number }> {
        
        let whereClause = 'WHERE 1=1';
        const params: unknown[] = [];

        if (filters.issueId) {
            whereClause += ' AND i.issue_id = ?';
            params.push(filters.issueId);
        }

        if (filters.issueIds && filters.issueIds.length > 0) {
            whereClause += ` AND i.issue_id IN (${filters.issueIds.map(() => '?').join(',')})`;
            params.push(...filters.issueIds);
        }

        if (filters.search) {
            whereClause += ' AND (i.title LIKE ? OR i.description LIKE ?)';
            params.push(`%${filters.search}%`, `%${filters.search}%`);
        }

        if (filters.runId) {
            whereClause += ' AND i.issue_id IN (SELECT itc.issue_id FROM issue_test_cases itc JOIN test_executions te ON itc.test_case_id = te.test_case_id WHERE te.run_id = ?)';
            params.push(filters.runId);
        }

        if (filters.testCaseId) {
            whereClause += ' AND i.issue_id IN (SELECT issue_id FROM issue_test_cases WHERE test_case_id = ?)';
            params.push(filters.testCaseId);
        }

        if (filters.projectId) {
            // This is complex now because an issue can have multiple test cases across different projects theoretically, 
            // but usually they stay within a project. We'll filter issues that have AT LEAST one test case in this project.
            whereClause += ` AND i.issue_id IN (
                SELECT itc.issue_id 
                FROM issue_test_cases itc 
                JOIN test_cases tc ON itc.test_case_id = tc.test_case_id 
                JOIN scenarios s ON tc.scenario_id = s.scenario_id 
                JOIN modules m ON s.module_id = m.module_id 
                WHERE m.project_id = ?
            )`;
            params.push(filters.projectId);
        }
        
        if (filters.moduleId) {
            whereClause += ` AND i.issue_id IN (
                SELECT itc.issue_id 
                FROM issue_test_cases itc 
                JOIN test_cases tc ON itc.test_case_id = tc.test_case_id 
                JOIN scenarios s ON tc.scenario_id = s.scenario_id 
                WHERE s.module_id = ?
            )`;
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
            ${whereClause}
        `;

        const [countRows] = await db.execute<(RowDataPacket & { total: number })[]>(`SELECT COUNT(*) as total ${baseQuery}`, params);
        const total = countRows[0].total;
        
        const allowedSortColumns: Record<string, string> = {
            'title': 'i.title',
            'severity': 'i.severity',
            'status': 'i.status',
            'updated_at': 'i.updated_at',
            'created_at': 'i.created_at',
            'sla_date': 'i.sla_date',
            'actual_date': 'i.actual_date',
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
                (SELECT GROUP_CONCAT(tc.title SEPARATOR ', ') 
                 FROM issue_test_cases itc 
                 JOIN test_cases tc ON itc.test_case_id = tc.test_case_id 
                 WHERE itc.issue_id = i.issue_id) as test_case_titles
            ${baseQuery}
            ORDER BY ${sortColumn} ${sortOrder}
            LIMIT ? OFFSET ?
        `, [...params, limit, offset]);

        // Fetch tags for each issue
        for (const issue of data) {
            const [tagRows] = await db.execute<RowDataPacket[]>(`
                SELECT t.tag_id, t.name, t.color
                FROM tags t
                JOIN issue_tags it ON t.tag_id = it.tag_id
                WHERE it.issue_id = ?
            `, [issue.issue_id]);
            issue.tags = tagRows as { tag_id: string, name: string, color: string }[];
            issue.tag_ids = (tagRows as { tag_id: string }[]).map(t => t.tag_id);
        }

        return { data, total };
    },

    async create(data: { 
        test_case_ids: string[], 
        title: string, 
        description: string, 
        severity: string, 
        reporter_id: string,
        sla_date?: string,
        actual_date?: string,
        execution_id?: string, 
        developer_id?: string,
        tag_ids?: string[]
    }): Promise<string> {
        const issueId = generateId();
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            await connection.execute(`
                INSERT INTO issues (issue_id, snapshot_execution_id, reporter_id, developer_id, title, description, severity, status, sla_date, actual_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                issueId, data.execution_id || null, data.reporter_id, 
                data.developer_id || null, data.title, data.description, data.severity, ISSUE_STATUS.OPEN, data.sla_date || null, data.actual_date || null
            ]);

            // Add junction entries for test cases
            for (const tcId of data.test_case_ids) {
                await connection.execute(`
                    INSERT INTO issue_test_cases (issue_id, test_case_id)
                    VALUES (?, ?)
                `, [issueId, tcId]);
            }

            // Add junction entries for tags
            if (data.tag_ids && data.tag_ids.length > 0) {
                for (const tagId of data.tag_ids) {
                    await connection.execute(`
                        INSERT INTO issue_tags (issue_id, tag_id)
                        VALUES (?, ?)
                    `, [issueId, tagId]);
                }
            }

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
        status?: string, 
        severity?: string, 
        title?: string, 
        description?: string, 
        user_id: string,
        test_case_ids?: string[],
        sla_date?: string,
        actual_date?: string,
        execution_id?: string, 
        developer_id?: string,
        tag_ids?: string[]
    }): Promise<void> {
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            let solved_by_id = null;
            let historyStatus = data.status;

            // Fetch existing data for history and status logic
            const [existingIssues] = await connection.execute<RowDataPacket[]>('SELECT status, solved_by_id FROM issues WHERE issue_id = ?', [id]);
            const existing = existingIssues[0];

            if (!historyStatus && existing) {
                historyStatus = existing.status;
            }

            if (data.status === ISSUE_STATUS.CLOSED) {
                solved_by_id = existing?.solved_by_id;
                if (!solved_by_id) solved_by_id = data.user_id;
            }

            await connection.execute(`
                UPDATE issues 
                SET status = COALESCE(?, status), 
                    severity = COALESCE(?, severity), 
                    title = COALESCE(?, title), 
                    description = COALESCE(?, description), 
                    developer_id = COALESCE(?, developer_id), 
                    solved_by_id = COALESCE(?, solved_by_id), 
                    sla_date = COALESCE(?, sla_date), 
                    actual_date = COALESCE(?, actual_date)
                WHERE issue_id = ?
            `, [
                data.status ?? null, 
                data.severity ?? null, 
                data.title ?? null, 
                data.description ?? null, 
                data.developer_id ?? null, 
                solved_by_id, 
                data.sla_date ?? null, 
                data.actual_date ?? null, 
                id
            ]);

            if (data.test_case_ids) {
                // Refresh junction table
                await connection.execute('DELETE FROM issue_test_cases WHERE issue_id = ?', [id]);
                for (const tcId of data.test_case_ids) {
                    await connection.execute(`
                        INSERT INTO issue_test_cases (issue_id, test_case_id)
                        VALUES (?, ?)
                    `, [id, tcId]);
                }
            }

            if (data.tag_ids) {
                // Refresh tag junction
                await connection.execute('DELETE FROM issue_tags WHERE issue_id = ?', [id]);
                for (const tagId of data.tag_ids) {
                    await connection.execute(`
                        INSERT INTO issue_tags (issue_id, tag_id)
                        VALUES (?, ?)
                    `, [id, tagId]);
                }
            }

            let runId = null;
            if (data.execution_id) {
                const [execs] = await connection.execute<RowDataPacket[]>('SELECT run_id FROM test_executions WHERE execution_id = ?', [data.execution_id]);
                if (execs.length > 0) runId = execs[0].run_id;
            }

            await connection.execute(`
                INSERT INTO issue_history (history_id, issue_id, run_id, execution_id, status, user_id)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [generateId(), id, runId, data.execution_id ?? null, historyStatus ?? 'Updated', data.user_id]);

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
    },

    async getTestCases(issueId: string): Promise<{ test_case_id: string, title: string, custom_id: string | null, project_name: string, module_name: string, scenario_name: string }[]> {
        const [rows] = await db.execute<RowDataPacket[]>(`
            SELECT 
                tc.test_case_id, 
                tc.title,
                tc.custom_id,
                p.name as project_name,
                m.name as module_name,
                s.name as scenario_name
            FROM issue_test_cases itc
            JOIN test_cases tc ON itc.test_case_id = tc.test_case_id
            JOIN scenarios s ON tc.scenario_id = s.scenario_id
            JOIN modules m ON s.module_id = m.module_id
            JOIN projects p ON m.project_id = p.project_id
            WHERE itc.issue_id = ?
        `, [issueId]);
        return rows as { test_case_id: string, title: string, custom_id: string | null, project_name: string, module_name: string, scenario_name: string }[];
    },

    async getProjectIdsFromIssue(issueId: string): Promise<string[]> {
        const [rows] = await db.execute<RowDataPacket[]>(`
            SELECT DISTINCT m.project_id
            FROM issue_test_cases itc
            JOIN test_cases tc ON itc.test_case_id = tc.test_case_id
            JOIN scenarios s ON tc.scenario_id = s.scenario_id
            JOIN modules m ON s.module_id = m.module_id
            WHERE itc.issue_id = ?
        `, [issueId]);
        return rows.map(r => r.project_id) as string[];
    }
};
