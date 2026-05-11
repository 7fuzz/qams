/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv').config();
const mysql = require('mysql2/promise');
const { randomUUID } = require('crypto');
const bcrypt = require('bcryptjs');

async function seed() {
    const dbName = process.env.MYSQL_DATABASE || 'test_management';
    const config = {
        host: process.env.MYSQL_HOST || 'localhost',
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        database: dbName
    };

    console.log('Connecting to MySQL at:', config.host);
    const connection = await mysql.createConnection(config);
    
    console.log('Cleaning existing data...');
    const tables = [
        'activity_log', 'issue_history', 'issue_notes', 'issue_tags', 'tags', 'release_change_issues', 
        'release_change_modules', 'release_changes', 'release_issues', 'releases', 'issues', 
        'test_executions', 'test_runs', 'test_run_assignments', 'test_cases', 'scenarios', 
        'modules', 'projects', 'users', 'roles', 'permissions'
    ];
    
    // Disable foreign key checks to allow clearing tables
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const table of tables) {
        await connection.query(`DELETE FROM \`${table}\``);
    }
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash('123', salt);

    // 1. Seed Roles & Permissions
    console.log('Seeding roles and permissions...');
    const adminRoleId = randomUUID();
    const devRoleId = randomUUID();
    const qaRoleId = randomUUID();
    const observerRoleId = randomUUID();
    
    await connection.execute('INSERT INTO roles (role_id, name) VALUES (?, ?)', [adminRoleId, 'Admin']);
    await connection.execute('INSERT INTO roles (role_id, name) VALUES (?, ?)', [devRoleId, 'Developer']);
    await connection.execute('INSERT INTO roles (role_id, name) VALUES (?, ?)', [qaRoleId, 'QA']);
    await connection.execute('INSERT INTO roles (role_id, name) VALUES (?, ?)', [observerRoleId, 'Observer']);

    const perms = [
        { id: randomUUID(), name: 'users:manage', desc: 'Create, update, delete users' },
        { id: randomUUID(), name: 'roles:manage', desc: 'Create, update, delete roles' },
        { id: randomUUID(), name: 'projects:write', desc: 'Create, update, delete projects/modules/scenarios' },
        { id: randomUUID(), name: 'projects:read', desc: 'View projects' },
        { id: randomUUID(), name: 'tests:write', desc: 'Create and update test cases' },
        { id: randomUUID(), name: 'tests:run', desc: 'Execute test runs' },
        { id: randomUUID(), name: 'issues:manage', desc: 'Update/close any issue' },
        { id: randomUUID(), name: 'tags:manage', desc: 'Manage issue tags (Master Data)' },
        { id: randomUUID(), name: 'logs:read', desc: 'View system activity logs' }
    ];

    for (const p of perms) {
        await connection.execute('INSERT INTO permissions (permission_id, name, description) VALUES (?, ?, ?)', [p.id, p.name, p.desc]);
    }

    // Admin gets everything
    for (const p of perms) {
        await connection.execute('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [adminRoleId, p.id]);
    }
    
    // Dev gets projects:write, projects:read, tests:write, issues:manage
    const devPermNames = ['projects:write', 'projects:read', 'tests:write', 'issues:manage'];
    for (const p of perms.filter(p => devPermNames.includes(p.name))) {
        await connection.execute('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [devRoleId, p.id]);
    }
         
    // QA gets projects:read, tests:run, tests:write
    const qaPermNames = ['projects:read', 'tests:run', 'tests:write'];
    for (const p of perms.filter(p => qaPermNames.includes(p.name))) {
        await connection.execute('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [qaRoleId, p.id]);
    }

    // 1b. Seed Initial Tags
    console.log('Seeding tags...');
    const initialTags = [
        { id: randomUUID(), name: 'Vulnerability', color: '#ef4444' },
        { id: randomUUID(), name: 'Software Bug', color: '#f97316' },
        { id: randomUUID(), name: 'UI/UX', color: '#8b5cf6' },
        { id: randomUUID(), name: 'Performance', color: '#10b981' },
        { id: randomUUID(), name: 'Enhancement', color: '#3b82f6' }
    ];

    for (const tag of initialTags) {
        await connection.execute('INSERT INTO tags (tag_id, name, color) VALUES (?, ?, ?)', [tag.id, tag.name, tag.color]);
    }

    // Observer gets projects:read
    const obsPermNames = ['projects:read'];
    for (const p of perms.filter(p => obsPermNames.includes(p.name))) {
        await connection.execute('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [observerRoleId, p.id]);
    }

    // 2. Seed Users
    console.log('Seeding users...');
    const adminId = randomUUID();
    const users = {
        admin: { id: adminId, name: 'System Admin', email: 'admin@example.com' },
        dev1: { id: randomUUID(), name: 'Alex Dev', email: 'alex@example.com' },
        dev2: { id: randomUUID(), name: 'Sam Coder', email: 'sam@example.com' },
        qa1: { id: randomUUID(), name: 'Jordan Tester', email: 'qa@example.com' },
        qa2: { id: randomUUID(), name: 'Casey QA', email: 'casey@example.com' },
        obs1: { id: randomUUID(), name: 'Riley Observer', email: 'observer@example.com' }
    };

    const userEntries = [
        [users.admin.id, users.admin.name, users.admin.email, hashed, adminRoleId],
        [users.dev1.id, users.dev1.name, users.dev1.email, hashed, devRoleId],
        [users.dev2.id, users.dev2.name, users.dev2.email, hashed, devRoleId],
        [users.qa1.id, users.qa1.name, users.qa1.email, hashed, qaRoleId],
        [users.qa2.id, users.qa2.name, users.qa2.email, hashed, qaRoleId],
        [users.obs1.id, users.obs1.name, users.obs1.email, hashed, observerRoleId]
    ];

    for (const u of userEntries) {
        await connection.execute('INSERT INTO users (user_id, name, email, password, role_id) VALUES (?, ?, ?, ?, ?)', u);
    }

    // 3. Seed Projects
    console.log('Seeding projects...');
    const projects = {
        hr: { id: randomUUID(), name: 'HR Portal', version: '2.5.0' },
        fin: { id: randomUUID(), name: 'Financial Core', version: '1.2.0' },
        inv: { id: randomUUID(), name: 'Inventory Sync', version: '0.9.1' }
    };
    
    await connection.execute('INSERT INTO projects (project_id, name, version, owner_id) VALUES (?, ?, ?, ?)', [projects.hr.id, projects.hr.name, projects.hr.version, users.admin.id]);
    await connection.execute('INSERT INTO projects (project_id, name, version, owner_id) VALUES (?, ?, ?, ?)', [projects.fin.id, projects.fin.name, projects.fin.version, users.admin.id]);
    await connection.execute('INSERT INTO projects (project_id, name, version, owner_id) VALUES (?, ?, ?, ?)', [projects.inv.id, projects.inv.name, projects.inv.version, users.dev1.id]);

    // 4. Seed Modules
    console.log('Seeding modules...');
    const modules = {
        auth: { id: randomUUID(), name: 'Authentication', pid: projects.hr.id },
        payroll: { id: randomUUID(), name: 'Payroll Engine', pid: projects.hr.id },
        ledger: { id: randomUUID(), name: 'General Ledger', pid: projects.fin.id },
        sync: { id: randomUUID(), name: 'Real-time Sync', pid: projects.inv.id }
    };
    
    for (const m of Object.values(modules)) {
        await connection.execute('INSERT INTO modules (module_id, project_id, name, sla_date) VALUES (?, ?, ?, ?)', [m.id, m.pid, m.name, '2024-06-01 00:00:00']);
    }

    // 5. Seed Scenarios
    console.log('Seeding scenarios...');
    const scenarios = {
        login: { id: randomUUID(), mid: modules.auth.id, name: 'Standard Login' },
        mfa: { id: randomUUID(), mid: modules.auth.id, name: 'MFA Verification' },
        calc: { id: randomUUID(), mid: modules.payroll.id, name: 'Salary Calculation' },
        post: { id: randomUUID(), mid: modules.ledger.id, name: 'Journal Posting' }
    };
    
    for (const s of Object.values(scenarios)) {
        await connection.execute('INSERT INTO scenarios (scenario_id, module_id, name) VALUES (?, ?, ?)', [s.id, s.mid, s.name]);
    }

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
    
    for (const tc of tcs) {
        await connection.execute(`
            INSERT INTO test_cases (test_case_id, scenario_id, title, type, steps, expected_result, automation_status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [tc.id, tc.sid, tc.title, tc.type, tc.steps, tc.expected, 'Manual']);
    }

    // 7. Seed Test Runs
    console.log('Seeding test runs...');
    const runs = {
        old: { id: randomUUID(), name: 'Sprint 12 Regression', status: 'Completed' },
        new: { id: randomUUID(), name: 'Sprint 13 Current', status: 'In Progress' }
    };
    
    await connection.execute('INSERT INTO test_runs (run_id, project_id, requested_by_id, name, status, created_at) VALUES (?, ?, ?, ?, ?, ?)', 
        [runs.old.id, projects.hr.id, users.lead1.id, runs.old.name, runs.old.status, '2024-04-15 10:00:00']);
    await connection.execute('INSERT INTO test_runs (run_id, project_id, requested_by_id, name, status, created_at) VALUES (?, ?, ?, ?, ?, ?)', 
        [runs.new.id, projects.hr.id, users.lead1.id, runs.new.name, runs.new.status, '2024-05-01 09:00:00']);

    // 7b. Seed Assignments
    console.log('Seeding assignments...');
    await connection.execute('INSERT INTO test_run_assignments (run_id, user_id) VALUES (?, ?)', [runs.old.id, users.qa1.id]);
    await connection.execute('INSERT INTO test_run_assignments (run_id, user_id) VALUES (?, ?)', [runs.new.id, users.qa2.id]);

    // 8. Seed Executions
    console.log('Seeding executions...');
    for (const tc of tcs) {
        const eid = randomUUID();
        const status = tc.title.includes('Tax') ? 'Failed' : 'Passed';
        await connection.execute('INSERT INTO test_executions (execution_id, run_id, test_case_id, status, notes) VALUES (?, ?, ?, ?, ?)', 
            [eid, runs.new.id, tc.id, status, status === 'Failed' ? 'Tax calculation off by $0.02' : null]);
    }

    // 9. Seed Issues
    console.log('Seeding issues...');
    const taxTC = tcs.find(t => t.title.includes('Tax'));
    const issueId = randomUUID();
    await connection.execute(`
        INSERT INTO issues (issue_id, snapshot_execution_id, reporter_id, title, description, severity, status, sla_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [issueId, null, users.qa2.id, 'Rounding error in tax', 'Discrepancy on boundaries.', 'Medium (P2)', 'Open', '2024-05-20 00:00:00']);

    // Link issue to test case via junction table
    await connection.execute(`
        INSERT INTO issue_test_cases (issue_id, test_case_id)
        VALUES (?, ?)
    `, [issueId, taxTC.id]);

    // Link issue to tags
    const [tagRows] = await connection.execute('SELECT tag_id FROM tags WHERE name IN ("Software Bug", "Performance")');
    for (const tag of tagRows) {
        await connection.execute('INSERT INTO issue_tags (issue_id, tag_id) VALUES (?, ?)', [issueId, tag.tag_id]);
    }

    // 10. Seed Releases & Changes
    console.log('Seeding releases...');
    const releaseId = randomUUID();
    await connection.execute(`
        INSERT INTO releases (release_id, project_id, version_name, status, sla_date, description)
        VALUES (?, ?, ?, ?, ?, ?)
    `, [releaseId, projects.hr.id, 'v2.5.0', 'Released', '2024-05-15', 'Major Q2 update with new auth features.']);

    const change1Id = randomUUID();
    await connection.execute('INSERT INTO release_changes (change_id, release_id, type, title, description) VALUES (?, ?, ?, ?, ?)', 
        [change1Id, releaseId, 'Feature', 'Support for MFA', 'Added Google Authenticator integration.']);
    await connection.execute('INSERT INTO release_change_modules (change_id, module_id) VALUES (?, ?)', [change1Id, modules.auth.id]);

    const change2Id = randomUUID();
    await connection.execute('INSERT INTO release_changes (change_id, release_id, type, title, description) VALUES (?, ?, ?, ?, ?)', 
        [change2Id, releaseId, 'Bugfix', 'Fix Tax Rounding', 'Corrected decimal precision in payroll engine.']);
    await connection.execute('INSERT INTO release_change_modules (change_id, module_id) VALUES (?, ?)', [change2Id, modules.payroll.id]);
    await connection.execute('INSERT INTO release_change_issues (change_id, issue_id) VALUES (?, ?)', [change2Id, issueId]);

    console.log('--- SEEDING COMPLETED SUCCESSFULLY ---');
    await connection.end();
}

seed().catch(err => {
    console.error('Error during seeding:', err);
    process.exit(1);
});
