import db from '@/lib/db';
import { TestRun } from '@/types/app';
import { generateId } from '@/lib/id-utils';

export const TestRunModel = {
    async findAll(projectId: string | null, limit: number, offset: number) {
        let baseQuery = `
            FROM test_runs tr 
            JOIN users u ON tr.tester_id = u.user_id
            JOIN projects p ON tr.project_id = p.project_id
            JOIN users po ON p.owner_id = po.user_id
        `;
        const params: unknown[] = [];
        if (projectId) {
            baseQuery += ' WHERE tr.project_id = ?';
            params.push(projectId);
        }

        const total = (db.prepare(`SELECT COUNT(*) as total ${baseQuery}`).get(...params) as { total: number }).total;
        
        const data = db.prepare(`
            SELECT 
                tr.*, 
                u.name as tester_name, 
                p.name as project_name, 
                po.name as project_owner,
                (SELECT COUNT(*) FROM test_executions WHERE run_id = tr.run_id) as total_cases,
                (SELECT COUNT(*) FROM test_executions WHERE run_id = tr.run_id AND status = 'Passed') as passed_count,
                (SELECT COUNT(*) FROM test_executions WHERE run_id = tr.run_id AND status = 'Failed') as failed_count,
                (SELECT COUNT(*) FROM test_executions WHERE run_id = tr.run_id AND status = 'Pending') as pending_count
            ${baseQuery}
            ORDER BY tr.created_at DESC
            LIMIT ? OFFSET ?
        `).all(...params, limit, offset) as TestRun[];

        return { data, total };
    },

    create(data: { project_id: string, name: string, tester_id: string, scenario_ids: string[] }) {
        const runId = generateId();
        
        const createRun = db.transaction(() => {
            db.prepare('INSERT INTO test_runs (run_id, project_id, tester_id, name, status) VALUES (?, ?, ?, ?, ?)')
                .run(runId, data.project_id, data.tester_id, data.name, 'In Progress');

            const placeholders = data.scenario_ids.map(() => '?').join(',');
            const testCases = db.prepare(`SELECT test_case_id FROM test_cases WHERE scenario_id IN (${placeholders})`)
                .all(...data.scenario_ids) as { test_case_id: string }[];

            const insertExecution = db.prepare('INSERT INTO test_executions (execution_id, run_id, test_case_id, status) VALUES (?, ?, ?, ?)');
            for (const tc of testCases) {
                insertExecution.run(generateId(), runId, tc.test_case_id, 'Pending');
            }

            return runId;
        });

        return createRun();
    },

    updateStatus(id: string, status: string) {
        let updateQuery = 'UPDATE test_runs SET status = ?';
        const params: unknown[] = [status];

        if (status === 'Completed') {
            updateQuery += ', completed_at = CURRENT_TIMESTAMP';
        }

        updateQuery += ' WHERE run_id = ?';
        params.push(id);

        return db.prepare(updateQuery).run(...params);
    },

    delete(id: string) {
        return db.prepare('DELETE FROM test_runs WHERE run_id = ?').run(id);
    },

    // Execution Logic
    findExecutions(runId: string) {
        return db.prepare(`
            SELECT te.*, tc.title, tc.steps, tc.expected_result, tc.precondition, tc.test_data
            FROM test_executions te
            JOIN test_cases tc ON te.test_case_id = tc.test_case_id
            WHERE te.run_id = ?
        `).all(runId);
    },

    findExecutionById(id: string) {
        return db.prepare(`
            SELECT te.*, tc.title 
            FROM test_executions te
            JOIN test_cases tc ON te.test_case_id = tc.test_case_id
            WHERE te.execution_id = ?
        `).get(id) as { execution_id: string, run_id: string, test_case_id: string, title: string } | undefined;
    },

    updateExecution(id: string, data: { status: string, notes?: string, proof_url?: string }) {
        return db.prepare(`
            UPDATE test_executions 
            SET status = ?, notes = COALESCE(?, notes), proof_url = COALESCE(?, proof_url), executed_at = CURRENT_TIMESTAMP 
            WHERE execution_id = ?
        `).run(data.status, data.notes || null, data.proof_url || null, id);
    }
};
