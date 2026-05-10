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

    console.log('Connecting to MySQL...');
    const connection = await mysql.createConnection(config);
    
    console.log('Cleaning business data (preserving users/roles)...');
    const businessTables = [
        'activity_log', 'issue_history', 'issue_notes', 'release_change_issues', 
        'release_change_modules', 'release_changes', 'release_issues', 'releases', 
        'issue_test_cases', 'issues', 'test_executions', 'test_runs', 'test_cases', 
        'scenarios', 'modules', 'projects'
    ];
    
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const table of businessTables) {
        await connection.query(`DELETE FROM \`${table}\``);
    }
    // Delete all users EXCEPT the primary admin
    await connection.query("DELETE FROM users WHERE email != 'admin@example.com'");
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash('123', salt);

    // 1. Fetch Existing Roles
    console.log('Fetching system roles...');
    const [roleRows] = await connection.execute('SELECT role_id, name FROM roles');
    const roles = {};
    roleRows.forEach(r => {
        roles[r.name.toLowerCase()] = r.role_id;
    });

    if (!roles.admin || !roles.developer || !roles.qa) {
        console.error('Essential roles missing. Please run npm run db:init first.');
        process.exit(1);
    }

    // 2. Users (Expanded Variant)
    console.log('Generating 25+ Variant Users...');
    const userIds = [];
    const firstNames = ['James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa', 'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];

    for (let i = 0; i < 30; i++) {
        const id = randomUUID();
        const fname = firstNames[i % firstNames.length];
        const lname = lastNames[i % lastNames.length];
        const name = `${fname} ${lname}`;
        const email = `${fname.toLowerCase()}.${lname.toLowerCase()}${i}@example.com`;
        
        let roleId = roles.observer;
        if (i < 8) roleId = roles.developer;
        else if (i < 20) roleId = roles.qa;

        await connection.execute('INSERT INTO users (user_id, name, email, password, role_id) VALUES (?, ?, ?, ?, ?)', 
            [id, name, email, hashed, roleId]);
        userIds.push({ id, role: roleId, name });
    }

    const devUsers = userIds.filter(u => u.role === roles.developer);
    const qaUsers = userIds.filter(u => u.role === roles.qa);
    const [adminRow] = await connection.execute("SELECT user_id FROM users WHERE email = 'admin@example.com'");
    const adminUser = { id: adminRow[0].user_id };

    // 3. Projects & Modules (High Variant)
    console.log('Seeding 10 Diverse Projects with deep module trees...');
    const projectTypes = ['CRM', 'ERP', 'Mobile App', 'Analytics Platform', 'Security Suite', 'Gateway Service', 'Legacy Port', 'Customer Portal', 'Inventory Hub', 'ML Pipeline'];
    const modulePrefixes = ['Core', 'External', 'Background', 'Legacy', 'Alpha', 'Beta', 'Internal', 'UI', 'API', 'DB'];
    const moduleSuffixes = ['Engine', 'Service', 'Layer', 'Adapter', 'Interface', 'Worker', 'Controller', 'Repository', 'Bridge', 'Vault'];

    const allProjectIds = [];
    for (let pIdx = 0; pIdx < projectTypes.length; pIdx++) {
        const projectId = randomUUID();
        const name = `${projectTypes[pIdx]} System`;
        // FIX: owner_id -> lead_developer_id
        await connection.execute('INSERT INTO projects (project_id, name, version, lead_developer_id, description) VALUES (?, ?, ?, ?, ?)', 
            [projectId, name, `v${pIdx + 1}.0.0`, adminUser.id, `Mission-critical ${name} infrastructure.`]);
        allProjectIds.push(projectId);

        const moduleCount = 5 + Math.floor(Math.random() * 5);
        for (let mIdx = 0; mIdx < moduleCount; mIdx++) {
            const moduleId = randomUUID();
            const mName = `${modulePrefixes[Math.floor(Math.random() * modulePrefixes.length)]}-${moduleSuffixes[Math.floor(Math.random() * moduleSuffixes.length)]}`;
            const mDate = new Date();
            mDate.setDate(mDate.getDate() + 30);
            const mDateStr = mDate.toISOString().slice(0, 19).replace('T', ' ');
            
            // Add some actual_dates for older modules
            const actualDate = mIdx % 2 === 0 ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null;

            await connection.execute('INSERT INTO modules (module_id, project_id, name, responsible_id, description, sla_date, actual_date) VALUES (?, ?, ?, ?, ?, ?, ?)', 
                [moduleId, projectId, mName, devUsers[Math.floor(Math.random() * devUsers.length)].id, `Handles ${mName} logic for the ${name}.`, mDateStr, actualDate]);

            const scenarioCount = 3 + Math.floor(Math.random() * 3);
            for (let sIdx = 0; sIdx < scenarioCount; sIdx++) {
                const scenarioId = randomUUID();
                const sName = `Scenario: ${mName} Workflow ${sIdx + 1}`;
                await connection.execute('INSERT INTO scenarios (scenario_id, module_id, name) VALUES (?, ?, ?)', [scenarioId, moduleId, sName]);

                const tcCount = 6 + Math.floor(Math.random() * 6);
                for (let tcIdx = 0; tcIdx < tcCount; tcIdx++) {
                    const types = ['Positive', 'Negative', 'Edge Case', 'Vulnerability', 'Performance'];
                    const priorities = ['P0 - Critical', 'P1 - High', 'P2 - Medium', 'P3 - Low'];
                    const automation = ['Automated', 'Manual', 'Can be automated', 'N/A'];
                    
                    await connection.execute(`
                        INSERT INTO test_cases (test_case_id, custom_id, scenario_id, title, type, priority, automation_status, precondition, steps, expected_result, estimated_duration)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        randomUUID(), `TC-${pIdx}${mIdx}${sIdx}${tcIdx}`, scenarioId, 
                        `Validate ${mName} component behavior during cycle ${tcIdx}`,
                        types[Math.floor(Math.random() * types.length)],
                        priorities[Math.floor(Math.random() * priorities.length)],
                        automation[Math.floor(Math.random() * automation.length)],
                        'Validated environment and active session.',
                        `1. Initialize ${mName}\n2. Pass variant parameters\n3. Capture output buffer`,
                        `Success state indicated by 0x0 status code in ${mName} logs.`,
                        10 + (tcIdx * 5)
                    ]);
                }
            }
        }
    }

    // 4. Historical Test Runs & Executions
    console.log('Seeding 50+ Test Runs across 6-month timeline...');
    const [allTestCases] = await connection.execute('SELECT test_case_id, title FROM test_cases');
    
    for (let rIdx = 0; rIdx < 60; rIdx++) {
        const runId = randomUUID();
        const project = allProjectIds[Math.floor(Math.random() * allProjectIds.length)];
        const tester = qaUsers[Math.floor(Math.random() * qaUsers.length)];
        const status = rIdx < 50 ? 'Completed' : 'In Progress';
        const date = new Date();
        date.setDate(date.getDate() - (60 - rIdx)); // Spread over last 60 days
        
        const runDateStr = date.toISOString().slice(0, 19).replace('T', ' ');
        const runTypes = ['Regression', 'Internal Test', 'UAT', 'Smoke Test', 'Exploratory', 'Hotfix'];
        const runType = runTypes[rIdx % runTypes.length];

        // FIX: Added type column
        await connection.execute('INSERT INTO test_runs (run_id, project_id, tester_id, name, type, status, created_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
            [runId, project, tester.id, `Regression Cycle #${100 + rIdx}`, runType, status, runDateStr, status === 'Completed' ? runDateStr : null]);

        const runTCs = [...allTestCases].sort(() => 0.5 - Math.random()).slice(0, 25);
        for (const tc of runTCs) {
            const execStatus = Math.random() > 0.2 ? 'Passed' : (Math.random() > 0.5 ? 'Failed' : 'On Hold');
            const execId = randomUUID();
            await connection.execute('INSERT INTO test_executions (execution_id, run_id, test_case_id, status, notes, executed_at) VALUES (?, ?, ?, ?, ?, ?)', 
                [execId, runId, tc.test_case_id, execStatus, execStatus === 'Failed' ? 'Discrepancy detected in component output.' : null, runDateStr]);

            if (execStatus === 'Failed' && Math.random() > 0.4) {
                const issueId = randomUUID();
                const severity = ['Critical (P0)', 'High (P1)', 'Medium (P2)'][Math.floor(Math.random() * 3)];
                const issueStatus = Math.random() > 0.5 ? 'Open' : 'Closed';
                const actualFixDate = issueStatus === 'Closed' ? runDateStr : null;

                // FIX: Added sla_date and actual_date
                await connection.execute(`
                    INSERT INTO issues (issue_id, snapshot_execution_id, reporter_id, developer_id, title, description, severity, status, created_at, sla_date, actual_date)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [issueId, execId, tester.id, devUsers[Math.floor(Math.random() * devUsers.length)].id, `Bug: ${tc.title}`, 'Automatic failure report from regression suite.', severity, issueStatus, runDateStr, runDateStr, actualFixDate]);
                
                await connection.execute('INSERT INTO issue_test_cases (issue_id, test_case_id) VALUES (?, ?)', [issueId, tc.test_case_id]);
                
                await connection.execute('INSERT INTO issue_notes (note_id, issue_id, user_id, content) VALUES (?, ?, ?, ?)',
                    [randomUUID(), issueId, devUsers[0].id, 'Investigating the trace logs now.']);
            }
        }
    }

    // 5. Releases & Post-Release Mapping
    console.log('Seeding Releases and complex Changelogs...');
    const [allIssues] = await connection.execute('SELECT issue_id, title FROM issues');
    
    for (const projectId of allProjectIds) {
        for (let v = 1; v <= 3; v++) {
            const releaseId = randomUUID();
            const date = new Date();
            date.setDate(date.getDate() - (40 - (v * 10)));
            const dateStr = date.toISOString().slice(0, 19).replace('T', ' ');

            await connection.execute(`
                INSERT INTO releases (release_id, project_id, version_name, status, sla_date, actual_date, description, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [releaseId, projectId, `v${v}.0.0-final`, 'Released', dateStr, dateStr, `Stable release for milestone ${v}.`, dateStr]);

            const [projModules] = await connection.execute('SELECT module_id FROM modules WHERE project_id = ?', [projectId]);
            for (let c = 0; c < 5; c++) {
                const changeId = randomUUID();
                const type = ['Feature', 'Bugfix', 'Enhancement'][Math.floor(Math.random() * 3)];
                await connection.execute('INSERT INTO release_changes (change_id, release_id, type, title, description) VALUES (?, ?, ?, ?, ?)', 
                    [changeId, releaseId, type, `${type}: Improvement to Core Logic ${c}`, 'Performance and stability enhancements.']);
                
                if (projModules.length > 0) {
                    await connection.execute('INSERT INTO release_change_modules (change_id, module_id) VALUES (?, ?)', [changeId, projModules[c % projModules.length].module_id]);
                }

                if (type === 'Bugfix' && allIssues.length > 0) {
                    await connection.execute('INSERT INTO release_change_issues (change_id, issue_id) VALUES (?, ?)', [changeId, allIssues[Math.floor(Math.random() * allIssues.length)].issue_id]);
                }
            }

            const postReleaseCount = Math.floor(Math.random() * 4);
            for (let pr = 0; pr < postReleaseCount; pr++) {
                const issueId = allIssues[Math.floor(Math.random() * allIssues.length)].issue_id;
                await connection.execute('INSERT IGNORE INTO release_issues (release_id, issue_id, type) VALUES (?, ?, ?)', [releaseId, issueId, 'POST_RELEASE']);
            }
        }
    }

    console.log('--- MASSIVE SEEDING COMPLETED SUCCESSFULLY ---');
    console.log('Admin user preserved.');
    await connection.end();
}

seedLarge().catch(err => {
    console.error('Error during large seeding:', err);
    process.exit(1);
});
