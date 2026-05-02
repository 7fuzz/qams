const Database = require('better-sqlite3');
const path = require('path');
const { randomUUID } = require('crypto');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(process.cwd(), 'test_management.db');

async function seed() {
    const db = new Database(DB_PATH);
    
    console.log('Cleaning existing data...');
    db.exec('DELETE FROM activity_log');
    db.exec('DELETE FROM issue_history');
    db.exec('DELETE FROM issue_notes');
    db.exec('DELETE FROM issues');
    db.exec('DELETE FROM test_executions');
    db.exec('DELETE FROM test_runs');
    db.exec('DELETE FROM test_cases');
    db.exec('DELETE FROM scenarios');
    db.exec('DELETE FROM modules');
    db.exec('DELETE FROM projects');
    db.exec('DELETE FROM users');
    db.exec('DELETE FROM roles');

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash('123', salt);

    // 1. Seed Roles
    console.log('Seeding roles...');
    const adminRoleId = randomUUID();
    const devRoleId = randomUUID();
    const qaRoleId = randomUUID();
    const insertRole = db.prepare('INSERT INTO roles (role_id, name, permissions) VALUES (?, ?, ?)');
    insertRole.run(adminRoleId, 'Admin', JSON.stringify({ all: true }));
    insertRole.run(devRoleId, 'Developer', JSON.stringify({ edit: true }));
    insertRole.run(qaRoleId, 'QA', JSON.stringify({ test: true }));

    // 2. Seed Users
    console.log('Seeding users...');
    const users = {
        admin: { id: randomUUID(), name: 'System Admin', email: 'admin@example.com' },
        dev1: { id: randomUUID(), name: 'Alex Dev', email: 'alex@example.com' },
        dev2: { id: randomUUID(), name: 'Sam Coder', email: 'sam@example.com' },
        qa1: { id: randomUUID(), name: 'Jordan Tester', email: 'qa@example.com' },
        qa2: { id: randomUUID(), name: 'Casey QA', email: 'casey@example.com' }
    };

    const insertUser = db.prepare('INSERT INTO users (user_id, name, email, password, role_id) VALUES (?, ?, ?, ?, ?)');
    insertUser.run(users.admin.id, users.admin.name, users.admin.email, hashed, adminRoleId);
    insertUser.run(users.dev1.id, users.dev1.name, users.dev1.email, hashed, devRoleId);
    insertUser.run(users.dev2.id, users.dev2.name, users.dev2.email, hashed, devRoleId);
    insertUser.run(users.qa1.id, users.qa1.name, users.qa1.email, hashed, qaRoleId);
    insertUser.run(users.qa2.id, users.qa2.name, users.qa2.email, hashed, qaRoleId);

    // 3. Seed Projects
    console.log('Seeding projects...');
    const projects = {
        hr: { id: randomUUID(), name: 'HR Portal', version: '2.5.0' },
        fin: { id: randomUUID(), name: 'Financial Core', version: '1.2.0' },
        inv: { id: randomUUID(), name: 'Inventory Sync', version: '0.9.1' }
    };
    const insertProject = db.prepare('INSERT INTO projects (project_id, name, version, owner_id) VALUES (?, ?, ?, ?)');
    insertProject.run(projects.hr.id, projects.hr.name, projects.hr.version, users.admin.id);
    insertProject.run(projects.fin.id, projects.fin.name, projects.fin.version, users.admin.id);
    insertProject.run(projects.inv.id, projects.inv.name, projects.inv.version, users.dev1.id);

    // 4. Seed Modules
    console.log('Seeding modules...');
    const modules = {
        auth: { id: randomUUID(), name: 'Authentication', pid: projects.hr.id },
        payroll: { id: randomUUID(), name: 'Payroll Engine', pid: projects.hr.id },
        ledger: { id: randomUUID(), name: 'General Ledger', pid: projects.fin.id },
        sync: { id: randomUUID(), name: 'Real-time Sync', pid: projects.inv.id }
    };
    const insertModule = db.prepare('INSERT INTO modules (module_id, project_id, name) VALUES (?, ?, ?)');
    Object.values(modules).forEach(m => insertModule.run(m.id, m.pid, m.name));

    // 5. Seed Scenarios
    console.log('Seeding scenarios...');
    const scenarios = {
        login: { id: randomUUID(), mid: modules.auth.id, name: 'Standard Login' },
        mfa: { id: randomUUID(), mid: modules.auth.id, name: 'MFA Verification' },
        calc: { id: randomUUID(), mid: modules.payroll.id, name: 'Salary Calculation' },
        post: { id: randomUUID(), mid: modules.ledger.id, name: 'Journal Posting' }
    };
    const insertScenario = db.prepare('INSERT INTO scenarios (scenario_id, module_id, name) VALUES (?, ?, ?)');
    Object.values(scenarios).forEach(s => insertScenario.run(s.id, s.mid, s.name));

    // 6. Seed Test Cases
    console.log('Seeding test cases...');
    const tcs = [
        { id: randomUUID(), sid: scenarios.login.id, title: 'Valid email/pass', type: 'Positive', steps: '1. Enter creds\n2. Submit', expected: 'Dashboard loads' },
        { id: randomUUID(), sid: scenarios.login.id, title: 'Invalid password', type: 'Negative', steps: '1. Enter wrong pass\n2. Submit', expected: 'Error shown' },
        { id: randomUUID(), sid: scenarios.mfa.id, title: 'SMS Code receive', type: 'Positive', steps: '1. Login\n2. Wait for SMS', expected: 'SMS arrives in 30s' },
        { id: randomUUID(), sid: scenarios.calc.id, title: 'Overtime 1.5x', type: 'Positive', steps: '1. Add 10h OT\n2. Calc', expected: 'OT pay is 15h base' },
        { id: randomUUID(), sid: scenarios.calc.id, title: 'Tax bracket shift', type: 'Edge Case', steps: '1. Set salary $9999\n2. Set $10001\n3. Calc', expected: 'Tax % changes correctly' },
        { id: randomUUID(), sid: scenarios.post.id, title: 'Unbalanced entry', type: 'Negative', steps: '1. Cr $100, Dr $90\n2. Post', expected: 'Reject with balance error' }
    ];
    const insertTC = db.prepare(`
        INSERT INTO test_cases (test_case_id, scenario_id, title, type, steps, expected_result)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    tcs.forEach(tc => insertTC.run(tc.id, tc.sid, tc.title, tc.type, tc.steps, tc.expected));

    // 7. Seed Test Runs (One completed, one current)
    console.log('Seeding test runs...');
    const runs = {
        old: { id: randomUUID(), name: 'Sprint 12 Regression', status: 'Completed' },
        new: { id: randomUUID(), name: 'Sprint 13 Current', status: 'In Progress' }
    };
    const insertRun = db.prepare('INSERT INTO test_runs (run_id, project_id, tester_id, name, status, created_at) VALUES (?, ?, ?, ?, ?, ?)');
    insertRun.run(runs.old.id, projects.hr.id, users.qa1.id, runs.old.name, runs.old.status, '2024-04-15 10:00:00');
    insertRun.run(runs.new.id, projects.hr.id, users.qa2.id, runs.new.name, runs.new.status, '2024-05-01 09:00:00');

    // 8. Seed Executions
    console.log('Seeding executions...');
    const insertExec = db.prepare('INSERT INTO test_executions (execution_id, run_id, test_case_id, status, notes) VALUES (?, ?, ?, ?, ?)');
    
    // Old Run (mostly passed)
    const oldExecs = [];
    tcs.filter(tc => tc.sid === scenarios.login.id || tc.sid === scenarios.mfa.id).forEach(tc => {
        const eid = randomUUID();
        insertExec.run(eid, runs.old.id, tc.id, 'Passed', 'Legacy passed');
        oldExecs.push({ eid, tcid: tc.id });
    });

    // New Run (some failures)
    const newExecs = [];
    tcs.forEach(tc => {
        const eid = randomUUID();
        const status = tc.title.includes('Tax') ? 'Failed' : (tc.title.includes('SMS') ? 'On Hold' : 'Passed');
        insertExec.run(eid, runs.new.id, tc.id, status, status === 'Failed' ? 'Tax calculation off by $0.02' : null);
        newExecs.push({ eid, tcid: tc.id, status });
    });

    // 9. Seed Issues & History
    console.log('Seeding issues and complex history...');
    const taxTC = tcs.find(t => t.title.includes('Tax'));
    const mfaTC = tcs.find(t => t.title.includes('SMS'));
    
    const issue1Id = randomUUID(); // Tax bug
    db.prepare(`
        INSERT INTO issues (issue_id, test_case_id, snapshot_execution_id, reporter_id, title, description, severity, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(issue1Id, taxTC.id, newExecs.find(e => e.tcid === taxTC.id).eid, users.qa2.id, 'Rounding error in tax', 'Calculation results in $0.02 discrepancy on boundaries.', 'Medium (P2)', 'Open');

    const issue2Id = randomUUID(); // MFA bug from old run
    db.prepare(`
        INSERT INTO issues (issue_id, test_case_id, snapshot_execution_id, reporter_id, title, description, severity, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(issue2Id, mfaTC.id, oldExecs.find(e => e.tcid === mfaTC.id).eid, users.qa1.id, 'SMS Gateway Timeout', 'Service times out intermittently in production environment.', 'High (P1)', 'In Progress');

    // Issue History
    const insertHistory = db.prepare('INSERT INTO issue_history (history_id, issue_id, run_id, status, user_id, timestamp) VALUES (?, ?, ?, ?, ?, ?)');
    insertHistory.run(randomUUID(), issue2Id, runs.old.id, 'Open', users.qa1.id, '2024-04-15 11:30:00');
    insertHistory.run(randomUUID(), issue2Id, runs.new.id, 'In Progress', users.dev1.id, '2024-05-01 14:00:00');
    insertHistory.run(randomUUID(), issue1Id, runs.new.id, 'Open', users.qa2.id, '2024-05-01 10:15:00');

    // Issue Notes
    const insertNote = db.prepare('INSERT INTO issue_notes (note_id, issue_id, user_id, content, created_at) VALUES (?, ?, ?, ?, ?)');
    insertNote.run(randomUUID(), issue2Id, users.dev1.id, 'I am looking into the gateway logs.', '2024-05-01 14:05:00');
    insertNote.run(randomUUID(), issue2Id, users.qa1.id, 'Confirmed, it happened again today.', '2024-05-01 15:20:00');

    console.log('--- ADVANCED SEEDING COMPLETED ---');
    db.close();
}

seed().catch(err => {
    console.error('Error during seeding:', err);
    process.exit(1);
});
