import db from '@/lib/db';
import { TestCase, Scenario } from '@/types/app';
import { generateId } from '@/lib/id-utils';
import { RowDataPacket } from 'mysql2';

export const TestCaseModel = {
    async findAll(filters: { 
        scenarioId?: string, 
        projectId?: string, 
        moduleId?: string,
        sortBy?: string,
        sortOrder?: 'ASC' | 'DESC'
    }, limit: number, offset: number): Promise<{ data: TestCase[], total: number }> {
        let whereClause = 'WHERE 1=1';
        const params: any[] = [];

        if (filters.scenarioId) {
            whereClause += ' AND tc.scenario_id = ?';
            params.push(filters.scenarioId);
        } else if (filters.moduleId) {
            whereClause += ' AND m.module_id = ?';
            params.push(filters.moduleId);
        } else if (filters.projectId) {
            whereClause += ' AND p.project_id = ?';
            params.push(filters.projectId);
        }

        const countQuery = `
            SELECT COUNT(*) as total 
            FROM test_cases tc
            JOIN scenarios s ON tc.scenario_id = s.scenario_id
            JOIN modules m ON s.module_id = m.module_id
            JOIN projects p ON m.project_id = p.project_id
            ${whereClause}
        `;
        const [countRows] = await db.execute<(RowDataPacket & { total: number })[]>(countQuery, params);
        const total = countRows[0].total;

        const allowedSortColumns: Record<string, string> = {
            'custom_id': 'tc.custom_id',
            'title': 'tc.title',
            'type': 'tc.type',
            'priority': 'tc.priority',
            'automation_status': 'tc.automation_status',
            'updated_at': 'tc.updated_at',
            'last_executed_at': 'last_executed_at'
        };

        const sortColumn = allowedSortColumns[filters.sortBy || ''] || 'tc.test_case_id';
        const sortOrder = filters.sortOrder === 'ASC' ? 'ASC' : 'DESC';

        const dataQuery = `
            SELECT 
                tc.*, 
                s.name as scenario_name, 
                m.name as module_name, 
                p.name as project_name,
                p.project_id,
                m.module_id,
                u.name as owner_name,
                (SELECT COUNT(*) FROM issue_test_cases itc JOIN issues i ON itc.issue_id = i.issue_id WHERE itc.test_case_id = tc.test_case_id AND i.status != 'Closed') as open_issues_count,
                (SELECT COUNT(*) FROM issue_test_cases itc JOIN issues i ON itc.issue_id = i.issue_id WHERE itc.test_case_id = tc.test_case_id AND i.status = 'Closed') as closed_issues_count,
                (SELECT MAX(executed_at) FROM test_executions te WHERE te.test_case_id = tc.test_case_id) as last_executed_at
            FROM test_cases tc
            JOIN scenarios s ON tc.scenario_id = s.scenario_id
            JOIN modules m ON s.module_id = m.module_id
            JOIN projects p ON m.project_id = p.project_id
            JOIN users u ON p.lead_developer_id = u.user_id
            ${whereClause}
            ORDER BY ${sortColumn} ${sortOrder}
            LIMIT ? OFFSET ?
        `;
        
        const [data] = await db.execute<TestCase[] & RowDataPacket[]>(dataQuery, [...params, limit, offset]);

        return { data, total };
    },

    async findById(id: string): Promise<TestCase | undefined> {
        const [rows] = await db.query<TestCase[] & RowDataPacket[]>(`
            SELECT 
                tc.*, 
                s.name as scenario_name, 
                m.name as module_name, 
                p.name as project_name,
                p.project_id,
                m.module_id,
                u.name as owner_name
            FROM test_cases tc
            JOIN scenarios s ON tc.scenario_id = s.scenario_id
            JOIN modules m ON s.module_id = m.module_id
            JOIN projects p ON m.project_id = p.project_id
            JOIN users u ON p.lead_developer_id = u.user_id
            WHERE tc.test_case_id = ?
        `, [id]);
        return rows[0];
    },

    async create(data: Partial<TestCase>): Promise<string> {
        const id = generateId();
        let customId = data.custom_id;
        let codeIndex = 0;

        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            if (!customId) {
                // Fetch codes to generate hierarchical ID
                const [rows] = await connection.execute<RowDataPacket[]>(`
                    SELECT p.code as p_code, m.code as m_code, s.code as s_code,
                           (SELECT MAX(code_index) FROM test_cases WHERE scenario_id = s.scenario_id) as max_index
                    FROM scenarios s
                    JOIN modules m ON s.module_id = m.module_id
                    JOIN projects p ON m.project_id = p.project_id
                    WHERE s.scenario_id = ?
                `, [data.scenario_id]);

                if (rows.length > 0) {
                    const row = rows[0];
                    codeIndex = (row.max_index || 0) + 1;
                    const pCode = row.p_code || 'PRJ';
                    const mCode = row.m_code || 'MOD';
                    const sCode = row.s_code || 'SCE';
                    customId = `${pCode}-${mCode}-${sCode}-${String(codeIndex).padStart(3, '0')}`;
                }
            }

            const params: any[] = [
                id, customId ?? null, codeIndex, data.scenario_id, data.title, data.type ?? null, 
                data.priority ?? null, data.automation_status ?? null, 
                data.requirement_link ?? null, data.estimated_duration ?? null, 
                data.precondition ?? null, data.steps ?? null, data.test_data ?? null, data.expected_result ?? null
            ];

            await connection.execute(`
                INSERT INTO test_cases (test_case_id, custom_id, code_index, scenario_id, title, type, priority, automation_status, requirement_link, estimated_duration, precondition, steps, test_data, expected_result)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, params);

            await connection.commit();
            return id;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    async update(id: string, data: Partial<TestCase>): Promise<void> {
        await db.execute(`
            UPDATE test_cases 
            SET custom_id = COALESCE(?, custom_id), 
                title = COALESCE(?, title), 
                type = COALESCE(?, type), 
                priority = COALESCE(?, priority), 
                automation_status = COALESCE(?, automation_status), 
                requirement_link = COALESCE(?, requirement_link), 
                estimated_duration = COALESCE(?, estimated_duration), 
                precondition = COALESCE(?, precondition), 
                steps = COALESCE(?, steps), 
                test_data = COALESCE(?, test_data), 
                expected_result = COALESCE(?, expected_result), 
                scenario_id = COALESCE(?, scenario_id)
            WHERE test_case_id = ?
        `, [
            data.custom_id ?? null, 
            data.title ?? null, 
            data.type ?? null, 
            data.priority ?? null, 
            data.automation_status ?? null, 
            data.requirement_link ?? null, 
            data.estimated_duration ?? null, 
            data.precondition ?? null, 
            data.steps ?? null, 
            data.test_data ?? null, 
            data.expected_result ?? null, 
            data.scenario_id ?? null, 
            id
        ]);
    },

    async delete(id: string): Promise<void> {
        await db.execute('DELETE FROM test_cases WHERE test_case_id = ?', [id]);
    },

    async duplicate(id: string): Promise<{ id: string, title: string } | null> {
        const source = await this.findById(id);
        if (!source) return null;

        const newTitle = source.title + ' (Copy)';
        const newId = await this.create({
            ...source,
            test_case_id: undefined,
            custom_id: undefined, // Force regeneration
            title: newTitle
        });
        
        return { id: newId, title: newTitle };
    },

    // Scenario Logic
    async findScenarios(moduleId?: string): Promise<Scenario[]> {
        let query = `
            SELECT s.*, 
                (SELECT COUNT(*) 
                 FROM issue_test_cases itc 
                 JOIN issues i ON itc.issue_id = i.issue_id 
                 JOIN test_cases tc ON itc.test_case_id = tc.test_case_id
                 WHERE tc.scenario_id = s.scenario_id AND i.status != 'Closed') as open_issues_count
            FROM scenarios s
        `;
        const params: any[] = [];
        if (moduleId) {
            query += ' WHERE module_id = ?';
            params.push(moduleId);
        }
        const [rows] = await db.execute<Scenario[] & RowDataPacket[]>(query, params);
        return rows;
    },

    async createScenario(moduleId: string, name: string, code?: string): Promise<string> {
        const id = generateId();
        await db.execute('INSERT INTO scenarios (scenario_id, module_id, name, code) VALUES (?, ?, ?, ?)', [id, moduleId, name, code || null]);
        return id;
    },

    async updateScenario(id: string, name: string, code?: string): Promise<void> {
        await db.execute('UPDATE scenarios SET name = ?, code = COALESCE(?, code) WHERE scenario_id = ?', [name, code ?? null, id]);
    },

    async deleteScenario(id: string): Promise<void> {
        await db.execute('DELETE FROM scenarios WHERE scenario_id = ?', [id]);
    },

    async importTestCases(
        moduleId: string, 
        testCases: Record<string, unknown>[], 
        normalizers: { 
            type: (value: unknown) => string, 
            priority: (value: unknown) => string, 
            automation: (value: unknown) => string 
        },
        options: { createMissingModules?: boolean } = {}
    ): Promise<{ importedCount: number, skippedCount: number }> {
        let importedCount = 0;
        let skippedCount = 0;

        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // Get project_id from the initial moduleId to ensure all modules stay within the same project
            const [baseModule] = await connection.execute<RowDataPacket[]>(
                'SELECT project_id FROM modules WHERE module_id = ?',
                [moduleId]
            );
            
            if (baseModule.length === 0) {
                throw new Error('Base module not found');
            }
            
            const projectId = baseModule[0].project_id;
            const moduleCache: Record<string, string> = {};
            const scenarioCache: Record<string, string> = {};

            for (const tc of testCases) {
                const title = (tc.title || tc.case) as string;
                if (!title) {
                    skippedCount++;
                    continue;
                }

                const type = normalizers.type(tc.type);
                const priority = normalizers.priority(tc.priority);

                // Determine target moduleId
                const targetModuleName = (tc.module || tc.module_name) as string | undefined;
                const targetModuleCode = (tc.module_code || tc.code) as string | undefined;
                let currentModuleId = moduleId;

                if (targetModuleName && targetModuleName.trim()) {
                    const mName = targetModuleName.trim();
                    if (moduleCache[mName]) {
                        currentModuleId = moduleCache[mName];
                    } else {
                        const [existingModules] = await connection.execute<RowDataPacket[]>(
                            'SELECT module_id FROM modules WHERE name = ? AND project_id = ?',
                            [mName, projectId]
                        );
                        
                        if (existingModules.length > 0) {
                            currentModuleId = existingModules[0].module_id;
                        } else if (options.createMissingModules) {
                            currentModuleId = generateId();
                            await connection.execute(
                                'INSERT INTO modules (module_id, project_id, name, code) VALUES (?, ?, ?, ?)',
                                [currentModuleId, projectId, mName, targetModuleCode || null]
                            );
                        } else {
                            // Fallback to initial moduleId if not found and creation not allowed
                            currentModuleId = moduleId;
                        }
                        moduleCache[mName] = currentModuleId;
                    }
                }

                const scenarioName = (tc.scenario || 'Default Scenario') as string;
                const scenarioCode = (tc.scenario_code || tc.s_code) as string | undefined;
                const scenarioCacheKey = `${currentModuleId}:${scenarioName}`;
                
                let scenarioId = scenarioCache[scenarioCacheKey];
                if (!scenarioId) {
                    const [existingScenarios] = await connection.execute<RowDataPacket[]>(
                        'SELECT scenario_id FROM scenarios WHERE name = ? AND module_id = ?', 
                        [scenarioName, currentModuleId]
                    );
                    
                    if (existingScenarios.length > 0) {
                        scenarioId = existingScenarios[0].scenario_id;
                    } else {
                        scenarioId = generateId();
                        await connection.execute(
                            'INSERT INTO scenarios (scenario_id, module_id, name, code) VALUES (?, ?, ?, ?)',
                            [scenarioId, currentModuleId, scenarioName, scenarioCode || null]
                        );
                    }
                    scenarioCache[scenarioCacheKey] = scenarioId;
                }

                const customId = (tc.id || tc.custom_id || null) as string | null;
                let existingId = null;

                if (customId) {
                    const [existingCases] = await connection.execute<RowDataPacket[]>(`
                        SELECT tc.test_case_id 
                        FROM test_cases tc
                        JOIN scenarios s ON tc.scenario_id = s.scenario_id
                        WHERE tc.custom_id = ? AND s.module_id = ?
                    `, [customId, currentModuleId]);
                    
                    if (existingCases.length > 0) {
                        existingId = existingCases[0].test_case_id;
                    }
                }

                if (existingId) {
                    await connection.execute(`
                        UPDATE test_cases 
                        SET scenario_id = ?, title = ?, type = ?, priority = ?, 
                            automation_status = ?, requirement_link = ?, estimated_duration = ?, 
                            precondition = ?, steps = ?, test_data = ?, expected_result = ?
                        WHERE test_case_id = ?
                    `, [
                        scenarioId, title, type, priority,
                        normalizers.automation(tc.automation_status),
                        tc.requirement_link || null,
                        parseInt(tc.estimated_duration as string) || 0,
                        tc.precondition || '',
                        tc.steps || '',
                        tc.test_data || '',
                        tc.expected_result || '',
                        existingId
                    ]);
                } else {
                    // Use the existing create method to leverage hierarchical ID auto-generation
                    await this.create({
                        custom_id: customId,
                        scenario_id: scenarioId,
                        title,
                        type,
                        priority,
                        automation_status: normalizers.automation(tc.automation_status),
                        requirement_link: tc.requirement_link as string,
                        estimated_duration: parseInt(tc.estimated_duration as string) || 0,
                        precondition: tc.precondition as string,
                        steps: tc.steps as string,
                        test_data: tc.test_data as string,
                        expected_result: tc.expected_result as string
                    });
                }
                importedCount++;
            }
            await connection.commit();
            return { importedCount, skippedCount };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
};
