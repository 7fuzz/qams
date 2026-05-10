/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv').config();
const mysql = require('mysql2/promise');
const { randomUUID } = require('crypto');
const bcrypt = require('bcryptjs');

async function seedLarge() {
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
        'activity_log', 'issue_history', 'issue_notes', 'release_change_issues', 
        'release_change_modules', 'release_changes', 'release_issues', 'releases', 'issue_test_cases', 'issues', 
        'test_executions', 'test_runs', 'test_cases', 'scenarios', 
        'modules', 'projects', 'users', 'roles', 'permissions'
    ];
    
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const table of tables) {
        await connection.query(`DELETE FROM \`${table}\``);
    }
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash('123', salt);

    // 1. Roles & Permissions
    console.log('Seeding roles and permissions...');
    const roles = {
        admin: randomUUID(),
        dev: randomUUID(),
        qa: randomUUID(),
        observer: randomUUID()
    };
    
    await connection.execute('INSERT INTO roles (role_id, name) VALUES (?, ?)', [roles.admin, 'Admin']);
    await connection.execute('INSERT INTO roles (role_id, name) VALUES (?, ?)', [roles.dev, 'Developer']);
    await connection.execute('INSERT INTO roles (role_id, name) VALUES (?, ?)', [roles.qa, 'QA']);
    await connection.execute('INSERT INTO roles (role_id, name) VALUES (?, ?)', [roles.observer, 'Observer']);

    const perms = [
        { id: randomUUID(), name: 'users:manage', desc: 'Create, update, delete users' },
        { id: randomUUID(), name: 'roles:manage', desc: 'Create, update, delete roles' },
        { id: randomUUID(), name: 'projects:write', desc: 'Create, update, delete projects/modules/scenarios' },
        { id: randomUUID(), name: 'projects:read', desc: 'View projects' },
        { id: randomUUID(), name: 'tests:write', desc: 'Create and update test cases' },
        { id: randomUUID(), name: 'tests:run', desc: 'Execute test runs' },
        { id: randomUUID(), name: 'issues:manage', desc: 'Update/close any issue' },
        { id: randomUUID(), name: 'logs:read', desc: 'View system activity logs' }
    ];

    for (const p of perms) {
        await connection.execute('INSERT INTO permissions (permission_id, name, description) VALUES (?, ?, ?)', [p.id, p.name, p.desc]);
    }

    // Assign Permissions
    for (const p of perms) await connection.execute('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [roles.admin, p.id]);
    
    const devPerms = ['projects:write', 'projects:read', 'tests:write', 'issues:manage'];
    for (const p of perms.filter(p => devPerms.includes(p.name))) await connection.execute('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [roles.dev, p.id]);
    
    const qaPerms = ['projects:read', 'tests:run', 'tests:write'];
    for (const p of perms.filter(p => qaPerms.includes(p.name))) await connection.execute('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [roles.qa, p.id]);

    const obsPerms = ['projects:read'];
    for (const p of perms.filter(p => obsPerms.includes(p.name))) await connection.execute('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [roles.observer, p.id]);

    // 2. Users
    console.log('Seeding users...');
    const userIds = [];
    const mainAdminId = randomUUID();
    await connection.execute('INSERT INTO users (user_id, name, email, password, role_id) VALUES (?, ?, ?, ?, ?)', 
        [mainAdminId, 'Main Admin', 'admin@example.com', hashed, roles.admin]);
    userIds.push(mainAdminId);

    const names = ['Alex', 'Jordan', 'Casey', 'Riley', 'Taylor', 'Morgan', 'Jamie', 'Peyton', 'Quinn', 'Skyler'];
    for (let i = 0; i < 10; i++) {
        const id = randomUUID();
        const role = i < 3 ? roles.dev : (i < 8 ? roles.qa : roles.observer);
        const name = names[i];
        await connection.execute('INSERT INTO users (user_id, name, email, password, role_id) VALUES (?, ?, ?, ?, ?)', 
            [id, `${name} User`, `${name.toLowerCase()}@example.com`, hashed, role]);
        userIds.push(id);
    }

    // 3. Projects, Modules, Scenarios, Test Cases
    console.log('Seeding projects tree (heavy)...');
    for (let pIdx = 1; pIdx <= 5; pIdx++) {
        const projectId = randomUUID();
        await connection.execute('INSERT INTO projects (project_id, name, version, owner_id, description) VALUES (?, ?, ?, ?, ?)', 
            [projectId, `Project ${String.fromCharCode(64 + pIdx)}`, `1.${pIdx}.0`, mainAdminId, `Large scale project ${pIdx} for testing performance.`]);

        for (let mIdx = 1; mIdx <= 4; mIdx++) {
            const moduleId = randomUUID();
            await connection.execute('INSERT INTO modules (module_id, project_id, name, description) VALUES (?, ?, ?, ?)', 
                [moduleId, projectId, `Module ${pIdx}.${mIdx}`, `Handling core functionality ${mIdx} for Project ${pIdx}`]);

            for (let sIdx = 1; sIdx <= 3; sIdx++) {
                const scenarioId = randomUUID();
                await connection.execute('INSERT INTO scenarios (scenario_id, module_id, name) VALUES (?, ?, ?)', 
                    [scenarioId, moduleId, `Scenario ${pIdx}.${mIdx}.${sIdx}`]);

                for (let tcIdx = 1; tcIdx <= 8; tcIdx++) {
                    const testCaseId = randomUUID();
                    const types = ['Positive', 'Negative', 'Edge Case', 'Vulnerability'];
                    const priorities = ['P0 - Critical', 'P1 - High', 'P2 - Medium', 'P3 - Low'];
                    
                    await connection.execute(`
                        INSERT INTO test_cases (test_case_id, custom_id, scenario_id, title, type, priority, automation_status, precondition, steps, expected_result)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        testCaseId, `TC-${pIdx}${mIdx}${sIdx}${tcIdx}`, scenarioId, 
                        `Validate functionality ${tcIdx} for Scenario ${sIdx}`,
                        types[tcIdx % 4], priorities[tcIdx % 4], 'Manual',
                        'User is logged in and on the correct page.',
                        '1. Perform action\n2. Check result\n3. Confirm status',
                        'System should respond correctly within 200ms.'
                    ]);
                }
            }
        }
    }

    // 4. Test Runs & Executions
    console.log('Seeding test runs and executions...');
    const [allTestCases] = await connection.execute('SELECT test_case_id, title FROM test_cases');
    const [allProjects] = await connection.execute('SELECT project_id FROM projects');
    const qaUsers = userIds.slice(4, 9); // Some QA users

    for (let rIdx = 1; rIdx <= 10; rIdx++) {
        const runId = randomUUID();
        const project = allProjects[rIdx % allProjects.length];
        const tester = qaUsers[rIdx % qaUsers.length];
        const status = rIdx < 8 ? 'Completed' : 'In Progress';
        
        await connection.execute('INSERT INTO test_runs (run_id, project_id, tester_id, name, status, created_at) VALUES (?, ?, ?, ?, ?, ?)', 
            [runId, project.project_id, tester, `Regression Pack - Cycle ${rIdx}`, status, `2024-05-${10 + rIdx} 10:00:00`]);

        // Pick 20 random test cases for each run
        const shuffled = [...allTestCases].sort(() => 0.5 - Math.random());
        const runTCs = shuffled.slice(0, 20);

        for (const tc of runTCs) {
            const execId = randomUUID();
            const execStatus = Math.random() > 0.15 ? 'Passed' : (Math.random() > 0.5 ? 'Failed' : 'On Hold');
            await connection.execute('INSERT INTO test_executions (execution_id, run_id, test_case_id, status, notes, executed_at) VALUES (?, ?, ?, ?, ?, ?)', 
                [execId, runId, tc.test_case_id, execStatus, execStatus === 'Failed' ? 'Found a discrepancy during execution.' : null, `2024-05-${10 + rIdx} 14:00:00`]);

            // If failed, maybe create an issue
            if (execStatus === 'Failed' && Math.random() > 0.3) {
                const issueId = randomUUID();
                await connection.execute(`
                    INSERT INTO issues (issue_id, snapshot_execution_id, reporter_id, title, description, severity, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [issueId, execId, tester, `Issue with ${tc.title}`, 'Detailed description of the failure.', 'High (P1)', 'Open']);
                
                // Link via M2M
                await connection.execute('INSERT INTO issue_test_cases (issue_id, test_case_id) VALUES (?, ?)', [issueId, tc.test_case_id]);
            }
        }
    }

    // 5. Releases & Changelog
    console.log('Seeding releases and changelogs...');
    const [allIssues] = await connection.execute('SELECT issue_id, title FROM issues');
    
    for (const project of allProjects) {
        // Create 3 releases per project
        const versions = ['1.0.0', '1.1.0', '2.0.0-beta'];
        const statuses = ['Released', 'Released', 'Planning'];
        
        for (let i = 0; i < 3; i++) {
            const releaseId = randomUUID();
            const targetDate = `2024-${6 + i}-01 00:00:00`;
            
            await connection.execute(`
                INSERT INTO releases (release_id, project_id, version_name, status, target_date, description)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [releaseId, project.project_id, `v${versions[i]}`, statuses[i], targetDate, `Strategic release focusing on ${i === 0 ? 'stability' : (i === 1 ? 'performance' : 'new features')}.`]);

            // Add 4 changelog items per release
            const types = ['Feature', 'Bugfix', 'Enhancement', 'Bugfix'];
            const [projModules] = await connection.execute('SELECT module_id FROM modules WHERE project_id = ?', [project.project_id]);
            
            for (let j = 0; j < 4; j++) {
                const changeId = randomUUID();
                await connection.execute(`
                    INSERT INTO release_changes (change_id, release_id, type, title, description)
                    VALUES (?, ?, ?, ?, ?)
                `, [changeId, releaseId, types[j], `${types[j]} ${j + 1} for ${versions[i]}`, `Detailed implementation of the ${types[j].toLowerCase()} request.`]);

                // Link to a random module from the project
                if (projModules.length > 0) {
                    const mod = projModules[Math.floor(Math.random() * projModules.length)];
                    await connection.execute('INSERT INTO release_change_modules (change_id, module_id) VALUES (?, ?)', [changeId, mod.module_id]);
                }

                // If bugfix, link to a random issue
                if (types[j] === 'Bugfix' && allIssues.length > 0) {
                    const issue = allIssues[Math.floor(Math.random() * allIssues.length)];
                    await connection.execute('INSERT INTO release_change_issues (change_id, issue_id) VALUES (?, ?)', [changeId, issue.issue_id]);
                }
            }
        }
    }

    console.log('--- LARGE SCALE SEEDING COMPLETED SUCCESSFULLY ---');
    await connection.end();
}

seedLarge().catch(err => {
    console.error('Error during large seeding:', err);
    process.exit(1);
});
