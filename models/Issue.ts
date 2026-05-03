import db from '@/lib/db';
import { Issue } from '@/types/app';
import { generateId } from '@/lib/id-utils';
import { ISSUE_STATUS } from '@/lib/constants';

export const IssueModel = {
    async findAll(filters: { 
        projectId?: string, 
        moduleId?: string, 
        status?: string, 
        developerId?: string,
        runId?: string,
        testCaseId?: string
    }, limit: number, offset: number) {
        
        if (filters.runId) {
            // Special case for Run Detail view
            const data = db.prepare(`
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
                JOIN scenarios sc ON tc.scenario_id = sc.scenario_id
                JOIN modules m ON sc.module_id = m.module_id
                JOIN projects p ON m.project_id = p.project_id
                WHERE i.test_case_id IN (SELECT test_case_id FROM test_executions WHERE run_id = ?)
                ORDER BY i.created_at DESC
            `).all(filters.runId, filters.runId) as Issue[];
            
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
            JOIN scenarios sc ON tc.scenario_id = sc.scenario_id
            JOIN modules m ON sc.module_id = m.module_id
            JOIN projects p ON m.project_id = p.project_id
            ${whereClause}
        `;

        const total = (db.prepare(`SELECT COUNT(*) as total ${baseQuery}`).get(...params) as { total: number }).total;
        
        const data = db.prepare(`
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
            ORDER BY i.updated_at DESC
            LIMIT ? OFFSET ?
        `).all(...params, limit, offset) as Issue[];

        return { data, total };
    },

    create(data: { 
        test_case_id: string, 
        title: string, 
        description: string, 
        severity: string, 
        reporter_id: string,
        execution_id?: string, 
        developer_id?: string 
    }) {
        const issueId = generateId();
        
        const transaction = db.transaction(() => {
            db.prepare(`
                INSERT INTO issues (issue_id, test_case_id, snapshot_execution_id, reporter_id, developer_id, title, description, severity, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                issueId, data.test_case_id, data.execution_id || null, data.reporter_id, 
                data.developer_id || null, data.title, data.description, data.severity, ISSUE_STATUS.OPEN
            );

            let runId = null;
            if (data.execution_id) {
                const exec = db.prepare('SELECT run_id FROM test_executions WHERE execution_id = ?').get(data.execution_id) as { run_id: string } | undefined;
                if (exec) runId = exec.run_id;
            }

            db.prepare(`
                INSERT INTO issue_history (history_id, issue_id, run_id, execution_id, status, user_id)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(generateId(), issueId, runId, data.execution_id || null, ISSUE_STATUS.OPEN, data.reporter_id);

            return issueId;
        });

        return transaction();
    },

    update(id: string, data: { 
        status: string, 
        severity: string, 
        title: string, 
        description: string, 
        user_id: string,
        execution_id?: string, 
        developer_id?: string 
    }) {
        const transaction = db.transaction(() => {
            let solved_by_id = null;
            if (data.status === ISSUE_STATUS.CLOSED) {
                const currentIssue = db.prepare('SELECT solved_by_id FROM issues WHERE issue_id = ?').get(id) as { solved_by_id: string | null } | undefined;
                solved_by_id = currentIssue?.solved_by_id || data.user_id;
            }

            db.prepare(`
                UPDATE issues 
                SET status = ?, severity = ?, title = ?, description = ?, developer_id = ?, solved_by_id = COALESCE(?, solved_by_id), updated_at = CURRENT_TIMESTAMP
                WHERE issue_id = ?
            `).run(data.status, data.severity, data.title, data.description, data.developer_id || null, solved_by_id, id);

            let runId = null;
            if (data.execution_id) {
                const exec = db.prepare('SELECT run_id FROM test_executions WHERE execution_id = ?').get(data.execution_id) as { run_id: string } | undefined;
                if (exec) runId = exec.run_id;
            }

            db.prepare(`
                INSERT INTO issue_history (history_id, issue_id, run_id, execution_id, status, user_id)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(generateId(), id, runId, data.execution_id || null, data.status, data.user_id);
        });

        transaction();
        return true;
    },

    delete(id: string) {
        return db.prepare('DELETE FROM issues WHERE issue_id = ?').run(id);
    }
};
