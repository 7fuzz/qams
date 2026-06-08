require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'test_management',
    multipleStatements: true
  });

  console.log('Starting migration for hierarchical codes...');

  try {
    // 1. Add columns if they don't exist
    await connection.query(`
        ALTER TABLE projects ADD COLUMN IF NOT EXISTS code VARCHAR(50) UNIQUE AFTER name;
        ALTER TABLE modules ADD COLUMN IF NOT EXISTS code VARCHAR(50) AFTER name;
        ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS code VARCHAR(50) AFTER name;
        ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS code_index INTEGER DEFAULT 0 AFTER custom_id;
    `);

    console.log('Columns added successfully.');

    // 2. Derive default codes for projects
    const [projects] = await connection.query('SELECT project_id, name FROM projects WHERE code IS NULL OR code = ""');
    for (const p of projects) {
        const defaultCode = p.name.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, 'P');
        await connection.query('UPDATE projects SET code = ? WHERE project_id = ?', [defaultCode, p.project_id]);
    }

    // 3. Derive default codes for modules
    const [modules] = await connection.query('SELECT module_id, name FROM modules WHERE code IS NULL OR code = ""');
    for (const m of modules) {
        const defaultCode = m.name.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, 'M');
        await connection.query('UPDATE modules SET code = ? WHERE module_id = ?', [defaultCode, m.module_id]);
    }

    // 4. Derive default codes for scenarios
    const [scenarios] = await connection.query('SELECT scenario_id, name FROM scenarios WHERE code IS NULL OR code = ""');
    for (const s of scenarios) {
        const defaultCode = s.name.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, 'S');
        await connection.query('UPDATE scenarios SET code = ? WHERE scenario_id = ?', [defaultCode, s.scenario_id]);
    }

    console.log('Default codes populated for projects, modules, and scenarios.');

    // 5. Generate hierarchical IDs for existing test cases
    // We group by scenario to correctly set the index
    const [testCases] = await connection.query(`
        SELECT tc.test_case_id, tc.scenario_id, s.code as s_code, m.code as m_code, p.code as p_code
        FROM test_cases tc
        JOIN scenarios s ON tc.scenario_id = s.scenario_id
        JOIN modules m ON s.module_id = m.module_id
        JOIN projects p ON m.project_id = p.project_id
        ORDER BY tc.created_at ASC
    `);

    const scenarioCounters = {};
    for (const tc of testCases) {
        if (!scenarioCounters[tc.scenario_id]) scenarioCounters[tc.scenario_id] = 0;
        scenarioCounters[tc.scenario_id]++;
        
        const index = scenarioCounters[tc.scenario_id];
        const indexStr = String(index).padStart(3, '0');
        const hierarchicalId = `${tc.p_code}-${tc.m_code}-${tc.s_code}-${indexStr}`;

        await connection.query(
            'UPDATE test_cases SET custom_id = ?, code_index = ? WHERE test_case_id = ?',
            [hierarchicalId, index, tc.test_case_id]
        );
    }

    console.log(`Generated hierarchical IDs for ${testCases.length} test cases.`);
    console.log('Migration completed successfully.');

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await connection.end();
  }
}

migrate();
