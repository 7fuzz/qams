import db from '@/lib/db';
import { TestRun } from '@/types/app';
import { generateId } from '@/lib/id-utils';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export const TestRunModel = {
    async findAll(filters: { 
        projectId?: string, 
        moduleId?: string,
        search?: string, 
        sortBy?: string, 
        sortOrder?: 'ASC' | 'DESC' 
    } = {}, limit: number, offset: number) {
        let whereClause = 'WHERE 1=1';
        const params: any[] = [];
        
        if (filters.projectId) {
            whereClause += ' AND tr.project_id = ?';
            params.push(filters.projectId);
        }

        if (filters.moduleId) {
            // A test run is linked to a module if at least one of its executions is for a test case in that module
            whereClause += ` AND tr.run_id IN (
                SELECT DISTINCT te.run_id 
                FROM test_executions te 
                JOIN test_cases tc ON te.test_case_id = tc.test_case_id 
                JOIN scenarios s ON tc.scenario_id = s.scenario_id 
                WHERE s.module_id = ?
            )`;
            params.push(filters.moduleId);
        }

        if (filters.search) {
            whereClause += ' AND (tr.name LIKE ? OR p.name LIKE ?)';
            params.push(`%${filters.search}%`, `%${filters.search}%`);
        }

        const baseQuery = `
            FROM test_runs tr 
            LEFT JOIN users rb ON tr.requested_by_id = rb.user_id
            JOIN projects p ON tr.project_id = p.project_id
            JOIN users po ON p.lead_developer_id = po.user_id
            ${whereClause}
        `;

        const [countRows] = await db.execute<(RowDataPacket & { total: number })[]>(`SELECT COUNT(*) as total ${baseQuery}`, params);
        const total = countRows[0].total;

        const allowedSortColumns: Record<string, string> = {
            'name': 'tr.name',
            'project_name': 'p.name',
            'requested_by_name': 'rb.name',
            'status': 'tr.status',
            'created_at': 'tr.created_at'
        };

        const sortColumn = allowedSortColumns[filters.sortBy ?? ''] ?? 'tr.created_at';
        const sortOrder = filters.sortOrder === 'ASC' ? 'ASC' : 'DESC';
        
        const [data] = await db.execute<TestRun[] & RowDataPacket[]>(`
            SELECT 
                tr.*, 
                rb.name as requested_by_name,
                p.name as project_name, 
                po.name as project_owner,
                (SELECT COUNT(*) FROM test_executions WHERE run_id = tr.run_id) as total_cases,
                (SELECT COUNT(*) FROM test_executions WHERE run_id = tr.run_id AND status = 'Passed') as passed_count,
                (SELECT COUNT(*) FROM test_executions WHERE run_id = tr.run_id AND status = 'Failed') as failed_count,
                (SELECT COUNT(*) FROM test_executions WHERE run_id = tr.run_id AND status = 'Pending') as pending_count
            ${baseQuery}
            ORDER BY ${sortColumn} ${sortOrder}
            LIMIT ? OFFSET ?
        `, [...params, limit, offset]);

        // Fetch assigned testers for each run
        for (const run of data) {
            const [assignments] = await db.execute<RowDataPacket[]>(`
                SELECT u.user_id, u.name 
                FROM test_run_assignments tra
                JOIN users u ON tra.user_id = u.user_id
                WHERE tra.run_id = ?
            `, [run.run_id]);
            run.assigned_tester_ids = assignments.map(a => a.user_id);
            run.assigned_tester_names = assignments.map(a => a.name);
        }

        return { data, total };
    },

    async findById(id: string): Promise<TestRun | undefined> {
        const [rows] = await db.execute<TestRun[] & RowDataPacket[]>(`
            SELECT 
                tr.*, 
                rb.name as requested_by_name,
                p.name as project_name, 
                po.name as project_owner,
                (SELECT COUNT(*) FROM test_executions WHERE run_id = tr.run_id) as total_cases,
                (SELECT COUNT(*) FROM test_executions WHERE run_id = tr.run_id AND status = 'Passed') as passed_count,
                (SELECT COUNT(*) FROM test_executions WHERE run_id = tr.run_id AND status = 'Failed') as failed_count,
                (SELECT COUNT(*) FROM test_executions WHERE run_id = tr.run_id AND status = 'Pending') as pending_count
            FROM test_runs tr 
            LEFT JOIN users rb ON tr.requested_by_id = rb.user_id
            JOIN projects p ON tr.project_id = p.project_id
            JOIN users po ON p.lead_developer_id = po.user_id
            WHERE tr.run_id = ?
        `, [id]);
        
        if (rows.length === 0) return undefined;
        const run = rows[0];

        // Fetch assigned testers
        const [assignments] = await db.execute<RowDataPacket[]>(`
            SELECT u.user_id, u.name 
            FROM test_run_assignments tra
            JOIN users u ON tra.user_id = u.user_id
            WHERE tra.run_id = ?
        `, [run.run_id]);
        run.assigned_tester_ids = assignments.map(a => a.user_id);
        run.assigned_tester_names = assignments.map(a => a.name);

        return run;
    },

    async create(data: { project_id: string, name: string, type: string | null, requested_by_id?: string, scenario_ids?: string[], module_ids?: string[], status?: string, assigned_tester_ids?: string[] }) {
        const runId = generateId();
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            await connection.execute(
                'INSERT INTO test_runs (run_id, project_id, requested_by_id, name, type, status) VALUES (?, ?, ?, ?, ?, ?)',
                [runId, data.project_id, data.requested_by_id || null, data.name, data.type || null, data.status || 'In Progress']
            );

            // Handle multiple tester assignments
            if (data.assigned_tester_ids && data.assigned_tester_ids.length > 0) {
                for (const tId of data.assigned_tester_ids) {
                    await connection.execute(
                        'INSERT INTO test_run_assignments (run_id, user_id) VALUES (?, ?)',
                        [runId, tId]
                    );
                }
            }

            const finalScenarioIds = new Set<string>(data.scenario_ids || []);

            // If module_ids are provided, fetch all scenarios for those modules
            if (data.module_ids && data.module_ids.length > 0) {
                const placeholders = data.module_ids.map(() => '?').join(',');
                const [rows] = await connection.execute<RowDataPacket[]>(
                    `SELECT scenario_id FROM scenarios WHERE module_id IN (${placeholders})`,
                    data.module_ids
                );
                rows.forEach((r: any) => finalScenarioIds.add(r.scenario_id));
            }

            if (finalScenarioIds.size > 0) {
                const scenarioIdArray = Array.from(finalScenarioIds);
                const placeholders = scenarioIdArray.map(() => '?').join(',');
                const [testCases] = await connection.execute<RowDataPacket[]>(
                    `SELECT test_case_id FROM test_cases WHERE scenario_id IN (${placeholders})`,
                    scenarioIdArray
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
        const params: any[] = [status];

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

    async addExecutions(runId: string, testCaseIds: string[]) {
        if (!testCaseIds || testCaseIds.length === 0) return;

        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // Filter out test cases that are already in this run
            const placeholders = testCaseIds.map(() => '?').join(',');
            const [existing] = await connection.execute<RowDataPacket[]>(
                `SELECT test_case_id FROM test_executions WHERE run_id = ? AND test_case_id IN (${placeholders})`,
                [runId, ...testCaseIds]
            );

            const existingIds = new Set(existing.map(e => e.test_case_id));
            const newIds = testCaseIds.filter(id => !existingIds.has(id));

            for (const tcId of newIds) {
                await connection.execute(
                    'INSERT INTO test_executions (execution_id, run_id, test_case_id, status) VALUES (?, ?, ?, ?)',
                    [generateId(), runId, tcId, 'Pending']
                );
            }

            await connection.commit();
            return newIds.length;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    // Execution Logic
    async findExecutions(
        runId: string, 
        sortBy?: string, 
        sortOrder?: 'ASC' | 'DESC', 
        search?: string, 
        limit?: number, 
        offset?: number,
        filters: { status?: string, moduleId?: string, scenarioId?: string } = {}
    ) {
        let whereClause = 'WHERE te.run_id = ?';
        const params: any[] = [runId];

        if (search) {
            whereClause += ' AND (tc.title LIKE ? OR te.status LIKE ? OR te.notes LIKE ?)';
            const searchParam = `%${search}%`;
            params.push(searchParam, searchParam, searchParam);
        }

        if (filters.status) {
            whereClause += ' AND te.status = ?';
            params.push(filters.status);
        }

        if (filters.moduleId) {
            whereClause += ' AND s.module_id = ?';
            params.push(filters.moduleId);
        }

        if (filters.scenarioId) {
            whereClause += ' AND tc.scenario_id = ?';
            params.push(filters.scenarioId);
        }

        const countQuery = `
            SELECT COUNT(*) as total 
            FROM test_executions te
            JOIN test_cases tc ON te.test_case_id = tc.test_case_id
            JOIN scenarios s ON tc.scenario_id = s.scenario_id
            ${whereClause}
        `;
        const [countRows] = await db.execute<(RowDataPacket & { total: number })[]>(countQuery, params);
        const total = countRows[0].total;

        const allowedSortColumns: Record<string, string> = {
            'id': 'tc.custom_id',
            'title': 'tc.title',
            'status': 'te.status',
            'executed_at': 'te.executed_at',
            'module': 'm.name',
            'scenario': 's.name'
        };

        const sortColumn = allowedSortColumns[sortBy || ''] || 'tc.custom_id';
        const order = sortOrder === 'DESC' ? 'DESC' : 'ASC';

        const dataQuery = `
            SELECT 
                te.*, 
                tc.title, tc.custom_id, tc.steps, tc.expected_result, tc.precondition, tc.test_data,
                s.name as scenario_name,
                m.name as module_name
            FROM test_executions te
            JOIN test_cases tc ON te.test_case_id = tc.test_case_id
            JOIN scenarios s ON tc.scenario_id = s.scenario_id
            JOIN modules m ON s.module_id = m.module_id
            ${whereClause}
            ORDER BY ${sortColumn} ${order}
        `;

        const queryWithLimit = limit !== undefined && offset !== undefined 
            ? `${dataQuery} LIMIT ? OFFSET ?` 
            : dataQuery;

        if (limit !== undefined && offset !== undefined) {
            params.push(limit, offset);
        }

        const [rows] = await db.execute<RowDataPacket[]>(queryWithLimit, params);
        return { data: rows, total };
    },

    async findExecutionById(id: string) {
        const [rows] = await db.execute<RowDataPacket[]>(`
            SELECT te.*, tc.title 
            FROM test_executions te
            JOIN test_cases tc ON te.test_case_id = tc.test_case_id
            WHERE te.execution_id = ?
        `, [id]);
        return rows[0];
    },

    async updateExecution(id: string, data: { status?: string, notes?: string, proof_url?: string }) {
        await db.execute(`
            UPDATE test_executions 
            SET status = COALESCE(?, status), 
                notes = COALESCE(?, notes), 
                proof_url = COALESCE(?, proof_url),
                executed_at = CURRENT_TIMESTAMP
            WHERE execution_id = ?
        `, [data.status || null, data.notes || null, data.proof_url || null, id]);
    },

    async bulkUpdateStatus(ids: string[], status: string) {
        if (!ids || ids.length === 0) return;
        const placeholders = ids.map(() => '?').join(',');
        await db.execute(`
            UPDATE test_executions 
            SET status = ?, executed_at = CURRENT_TIMESTAMP
            WHERE execution_id IN (${placeholders})
        `, [status, ...ids]);
    },

    async findExecutionHistory(testCaseId: string) {
        const [rows] = await db.execute<RowDataPacket[]>(`
            SELECT te.*, tr.name as run_name, u.name as tester_name, tr.created_at as run_date
            FROM test_executions te
            JOIN test_runs tr ON te.run_id = tr.run_id
            JOIN test_run_assignments tra ON tr.run_id = tra.run_id
            JOIN users u ON tra.user_id = u.user_id
            WHERE te.test_case_id = ?
            ORDER BY te.executed_at DESC
        `, [testCaseId]);
        return rows;
    }
};
