import db from '@/lib/db';
import { TestCase, Scenario } from '@/types/app';
import { generateId } from '@/lib/id-utils';

export const TestCaseModel = {
    async findAll(filters: { scenarioId?: string, projectId?: string, moduleId?: string }, limit: number, offset: number) {
        let whereClause = 'WHERE 1=1';
        const params: string[] = [];

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
        const total = (db.prepare(countQuery).get(...params) as { total: number }).total;

        const dataQuery = `
            SELECT 
                tc.*, 
                s.name as scenario_name, 
                m.name as module_name, 
                p.name as project_name,
                p.project_id,
                m.module_id,
                u.name as owner_name,
                (SELECT COUNT(*) FROM issues i WHERE i.test_case_id = tc.test_case_id AND i.status != 'Closed') as open_issues_count,
                (SELECT COUNT(*) FROM issues i WHERE i.test_case_id = tc.test_case_id AND i.status = 'Closed') as closed_issues_count,
                (SELECT MAX(executed_at) FROM test_executions te WHERE te.test_case_id = tc.test_case_id) as last_executed_at
            FROM test_cases tc
            JOIN scenarios s ON tc.scenario_id = s.scenario_id
            JOIN modules m ON s.module_id = m.module_id
            JOIN projects p ON m.project_id = p.project_id
            JOIN users u ON p.owner_id = u.user_id
            ${whereClause}
            ORDER BY tc.test_case_id DESC
            LIMIT ? OFFSET ?
        `;
        
        const data = db.prepare(dataQuery).all(...params, limit, offset) as TestCase[];

        return { data, total };
    },

    findById(id: string) {
        return db.prepare('SELECT * FROM test_cases WHERE test_case_id = ?').get(id) as TestCase | undefined;
    },

    create(data: Partial<TestCase>) {
        const id = generateId();
        db.prepare(`
            INSERT INTO test_cases (test_case_id, scenario_id, title, type, priority, automation_status, requirement_link, estimated_duration, precondition, steps, test_data, expected_result)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id, data.scenario_id, data.title, data.type, 
            data.priority || null, data.automation_status || null, 
            data.requirement_link || null, data.estimated_duration || null, 
            data.precondition, data.steps, data.test_data, data.expected_result
        );
        return id;
    },

    update(id: string, data: Partial<TestCase>) {
        db.prepare(`
            UPDATE test_cases 
            SET title = ?, type = ?, priority = ?, automation_status = ?, requirement_link = ?, estimated_duration = ?, precondition = ?, steps = ?, test_data = ?, expected_result = ?, scenario_id = ?, updated_at = CURRENT_TIMESTAMP
            WHERE test_case_id = ?
        `).run(
            data.title, data.type, data.priority || null, 
            data.automation_status || null, data.requirement_link || null, 
            data.estimated_duration || null, data.precondition, data.steps, 
            data.test_data, data.expected_result, data.scenario_id, id
        );
        return true;
    },

    delete(id: string) {
        return db.prepare('DELETE FROM test_cases WHERE test_case_id = ?').run(id);
    },

    duplicate(id: string) {
        const source = this.findById(id);
        if (!source) return null;

        const newId = generateId();
        db.prepare(`
            INSERT INTO test_cases (test_case_id, scenario_id, title, type, priority, automation_status, requirement_link, estimated_duration, precondition, steps, test_data, expected_result)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            newId,
            source.scenario_id, 
            source.title + ' (Copy)', 
            source.type, 
            source.priority,
            source.automation_status,
            source.requirement_link,
            source.estimated_duration,
            source.precondition, 
            source.steps, 
            source.test_data, 
            source.expected_result
        );
        return { id: newId, title: source.title + ' (Copy)' };
    },

    // Scenario Logic
    findScenarios(moduleId?: string) {
        let query = `
            SELECT s.*, 
                (SELECT COUNT(*) FROM issues i 
                 JOIN test_cases tc ON i.test_case_id = tc.test_case_id 
                 WHERE tc.scenario_id = s.scenario_id AND i.status != 'Closed') as open_issues_count
            FROM scenarios s
        `;
        const params: string[] = [];
        if (moduleId) {
            query += ' WHERE module_id = ?';
            params.push(moduleId);
        }
        return db.prepare(query).all(...params) as Scenario[];
    },

    createScenario(moduleId: string, name: string) {
        const id = generateId();
        db.prepare('INSERT INTO scenarios (scenario_id, module_id, name) VALUES (?, ?, ?)')
            .run(id, moduleId, name);
        return id;
    },

    updateScenario(id: string, name: string) {
        db.prepare('UPDATE scenarios SET name = ? WHERE scenario_id = ?').run(name, id);
        return true;
    },

    deleteScenario(id: string) {
        db.prepare('DELETE FROM scenarios WHERE scenario_id = ?').run(id);
        return true;
    },

    importTestCases(moduleId: string, cases: any[], normalizers: { type: (value: any) => string | null, priority: (value: any) => string | null, automation: (value: any) => string }) {
        let importedCount = 0;
        let skippedCount = 0;

        const importTransaction = db.transaction((testCases) => {
            const scenarioCache: Record<string, string> = {};

            const insertCase = db.prepare(`
                INSERT INTO test_cases (
                    test_case_id, scenario_id, title, type, priority, 
                    automation_status, requirement_link, estimated_duration, 
                    precondition, steps, test_data, expected_result
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const findScenario = db.prepare('SELECT scenario_id FROM scenarios WHERE name = ? AND module_id = ?');
            const createScenario = db.prepare('INSERT INTO scenarios (scenario_id, module_id, name) VALUES (?, ?, ?)');

            for (const tc of testCases) {
                const type = normalizers.type(tc.type);
                const priority = normalizers.priority(tc.priority);

                if (type === null || priority === null) {
                    skippedCount++;
                    continue;
                }

                const scenarioName = tc.scenario || 'Default Scenario';
                
                let scenarioId = scenarioCache[scenarioName];
                if (!scenarioId) {
                    const existing = findScenario.get(scenarioName, moduleId) as { scenario_id: string };
                    if (existing) {
                        scenarioId = existing.scenario_id;
                    } else {
                        scenarioId = generateId();
                        createScenario.run(scenarioId, moduleId, scenarioName);
                    }
                    scenarioCache[scenarioName] = scenarioId;
                }

                insertCase.run(
                    generateId(),
                    scenarioId,
                    tc.title || tc.case || 'Untitled Case',
                    type,
                    priority,
                    normalizers.automation(tc.automation_status),
                    tc.requirement_link || null,
                    parseInt(tc.estimated_duration) || 0,
                    tc.precondition || '',
                    tc.steps || '',
                    tc.test_data || '',
                    tc.expected_result || ''
                );
                importedCount++;
            }
        });

        importTransaction(cases);
        return { importedCount, skippedCount };
    }
};
