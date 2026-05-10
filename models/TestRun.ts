import db from '@/lib/db';
import { TestRun } from '@/types/app';
import { generateId } from '@/lib/id-utils';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export const TestRunModel = {
    async findAll(projectId: string | null, limit: number, offset: number) {
        let baseQuery = `
            FROM test_runs tr 
            JOIN users u ON tr.tester_id = u.user_id
            JOIN projects p ON tr.project_id = p.project_id
            JOIN users po ON p.lead_developer_id = po.user_id
        `;
        const params: unknown[] = [];
        if (projectId) {
            baseQuery += ' WHERE tr.project_id = ?';
            params.push(projectId);
        }

        const [countRows] = await db.execute<(RowDataPacket & { total: number })[]>(`SELECT COUNT(*) as total ${baseQuery}`, params);
        const total = countRows[0].total;
        
        const [data] = await db.execute<TestRun[] & RowDataPacket[]>(`
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
        `, [...params, limit, offset]);

        return { data, total };
    },

    async create(data: { project_id: string, name: string, tester_id: string, scenario_ids: string[] }) {
        const runId = generateId();
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            await connection.execute(
                'INSERT INTO test_runs (run_id, project_id, tester_id, name, status) VALUES (?, ?, ?, ?, ?)',
                [runId, data.project_id, data.tester_id, data.name, 'In Progress']
            );

            if (data.scenario_ids.length > 0) {
                const placeholders = data.scenario_ids.map(() => '?').join(',');
                const [testCases] = await connection.execute<RowDataPacket[]>(
                    `SELECT test_case_id FROM test_cases WHERE scenario_id IN (${placeholders})`,
                    data.scenario_ids
                );

                for (const tc of testCases as { test_case_id: string }[]) {
                    await connection.execute(
                        'INSERT INTO test_executions (execution_id, run_id, test_case_id, status) VALUES (?, ?, ?, ?)',
                        [generateId(), runId, tc.test_case_id, 'Pending']
                    );
                }
            }

            await connection.commit();
            return runId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    async updateStatus(id: string, status: string) {
        let updateQuery = 'UPDATE test_runs SET status = ?';
        const params: unknown[] = [status];

        if (status === 'Completed') {
            updateQuery += ', completed_at = CURRENT_TIMESTAMP';
        }

        updateQuery += ' WHERE run_id = ?';
        params.push(id);

        const [result] = await db.execute<ResultSetHeader>(updateQuery, params);
        return result;
    },

    async delete(id: string) {
        const [result] = await db.execute<ResultSetHeader>('DELETE FROM test_runs WHERE run_id = ?', [id]);
        return result;
    },

    // Execution Logic
    async findExecutions(runId: string) {
        const [rows] = await db.execute<RowDataPacket[]>(`
            SELECT te.*, tc.title, tc.steps, tc.expected_result, tc.precondition, tc.test_data
            FROM test_executions te
            JOIN test_cases tc ON te.test_case_id = tc.test_case_id
            WHERE te.run_id = ?
        `, [runId]);
        return rows;
    },

    async findExecutionById(id: string) {
        const [rows] = await db.execute<RowDataPacket[]>(`
            SELECT te.*, tc.title 
            FROM test_executions te
            JOIN test_cases tc ON te.test_case_id = tc.test_case_id
            WHERE te.execution_id = ?
        `, [id]);
        return rows[0] as { execution_id: string, run_id: string, test_case_id: string, title: string } | undefined;
    },

    async updateExecution(id: string, data: { status: string, notes?: string, proof_url?: string }) {
        const [result] = await db.execute<ResultSetHeader>(`
            UPDATE test_executions 
            SET status = ?, notes = COALESCE(?, notes), proof_url = COALESCE(?, proof_url), executed_at = CURRENT_TIMESTAMP 
            WHERE execution_id = ?
        `, [data.status, data.notes || null, data.proof_url || null, id]);
        return result;
    },

    async findExecutionHistory(testCaseId: string) {
        const [rows] = await db.execute<RowDataPacket[]>(`
            SELECT 
                te.execution_id,
                te.status,
                te.executed_at,
                te.notes,
                tr.name as run_name,
                tr.run_id,
                u.name as tester_name
            FROM test_executions te
            JOIN test_runs tr ON te.run_id = tr.run_id
            JOIN users u ON tr.tester_id = u.user_id
            WHERE te.test_case_id = ?
            ORDER BY te.executed_at DESC
        `, [testCaseId]);
        return rows;
    }
};
