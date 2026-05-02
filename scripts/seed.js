const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(process.cwd(), 'test_management.db');

async function seed() {
    const db = new Database(DB_PATH);
    
    // Get a user to be the owner
    const owner = db.prepare('SELECT user_id FROM users WHERE name = ?').get('Admin User');
    
    // 1. Project
    const info = db.prepare('INSERT INTO projects (name, version, owner_id) VALUES (?, ?, ?)')
        .run('HR Management System', '1.0.0', owner.user_id);
    const projectId = info.lastInsertRowid;

    // 2. Modules
    const productivityInfo = db.prepare('INSERT INTO modules (project_id, name) VALUES (?, ?)').run(projectId, 'Productivity');
    const monetaryInfo = db.prepare('INSERT INTO modules (project_id, name) VALUES (?, ?)').run(projectId, 'Monetary');
    
    const prodModuleId = productivityInfo.lastInsertRowid;
    const monModuleId = monetaryInfo.lastInsertRowid;

    // 3. Scenarios
    const expenseInfo = db.prepare('INSERT INTO scenarios (module_id, name) VALUES (?, ?)').run(monModuleId, 'Expense Claim');
    const travelInfo = db.prepare('INSERT INTO scenarios (module_id, name) VALUES (?, ?)').run(monModuleId, 'Travel Claim');
    
    const expenseScenarioId = expenseInfo.lastInsertRowid;

    // 4. Test Cases
    db.prepare(`
        INSERT INTO test_cases (scenario_id, title, type, precondition, steps, expected_result)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(expenseScenarioId, 'Submit valid expense claim', 'Positive', 'User is logged in', '1. Click New Claim\n2. Enter Details\n3. Submit', 'Claim status is Pending Approval');

    console.log('Advanced seeding completed.');
    db.close();
}

seed().catch(console.error);
