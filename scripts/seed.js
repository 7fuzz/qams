const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(process.cwd(), 'test_management.db');

async function seed() {
    const db = new Database(DB_PATH);
    
    // Clear existing data in correct order to avoid FK violations
    console.log('Cleaning existing data...');
    db.exec('DELETE FROM activity_log');
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

    // 1. Seed Roles
    console.log('Seeding roles...');
    const insertRole = db.prepare('INSERT INTO roles (name, permissions) VALUES (?, ?)');
    insertRole.run('Admin', JSON.stringify({ all: true }));
    insertRole.run('Developer', JSON.stringify({ edit: true }));
    insertRole.run('QA', JSON.stringify({ test: true }));
    
    const roles = db.prepare('SELECT * FROM roles').all();
    const adminRoleId = roles.find(r => r.name === 'Admin').role_id;
    const devRoleId = roles.find(r => r.name === 'Developer').role_id;
    const qaRoleId = roles.find(r => r.name === 'QA').role_id;

    // 2. Seed Users
    console.log('Seeding users...');
    const insertUser = db.prepare('INSERT INTO users (name, email, password, role_id) VALUES (?, ?, ?, ?)');
    insertUser.run('System Admin', 'admin@example.com', '123', adminRoleId);
    insertUser.run('Lead Developer', 'dev@example.com', '123', devRoleId);
    insertUser.run('Senior QA', 'qa@example.com', '123', qaRoleId);
    
    const adminUser = db.prepare('SELECT user_id FROM users WHERE email = ?').get('admin@example.com');
    const qaUser = db.prepare('SELECT user_id FROM users WHERE email = ?').get('qa@example.com');

    // 3. Seed Projects
    console.log('Seeding projects...');
    const insertProject = db.prepare('INSERT INTO projects (name, version, owner_id) VALUES (?, ?, ?)');
    const hrProject = insertProject.run('HR Management System', '2.4.0', adminUser.user_id).lastInsertRowid;
    const ecomProject = insertProject.run('E-Commerce Platform', '1.0.5', adminUser.user_id).lastInsertRowid;

    // 4. Seed Modules
    console.log('Seeding modules...');
    const insertModule = db.prepare('INSERT INTO modules (project_id, name, description) VALUES (?, ?, ?)');
    const payrollMod = insertModule.run(hrProject, 'Payroll', 'Handles employee salary and tax calculations').lastInsertRowid;
    const leaveMod = insertModule.run(hrProject, 'Leave Management', 'Employee time-off requests and approvals').lastInsertRowid;
    const checkoutMod = insertModule.run(ecomProject, 'Checkout & Payment', 'Shopping cart and gateway integration').lastInsertRowid;

    // 5. Seed Scenarios
    console.log('Seeding scenarios...');
    const insertScenario = db.prepare('INSERT INTO scenarios (module_id, name) VALUES (?, ?)');
    const salaryScenario = insertScenario.run(payrollMod, 'Monthly Salary Disbursement').lastInsertRowid;
    const expenseScenario = insertScenario.run(payrollMod, 'Expense Reimbursement').lastInsertRowid;
    const annualLeaveScenario = insertScenario.run(leaveMod, 'Annual Leave Request').lastInsertRowid;
    const cartScenario = insertScenario.run(checkoutMod, 'Cart Persistence').lastInsertRowid;

    // 6. Seed Test Cases
    console.log('Seeding test cases...');
    const insertTC = db.prepare(`
        INSERT INTO test_cases (scenario_id, title, type, precondition, steps, test_data, expected_result)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const tc1 = insertTC.run(salaryScenario, 'Verify base salary calculation', 'Positive', 'Employee has active contract', '1. Open Payroll\n2. Select Employee\n3. Calculate', 'EMP-001', 'Salary matches contract terms').lastInsertRowid;
    const tc2 = insertTC.run(salaryScenario, 'Verify tax deduction for high earners', 'Positive', 'Tax rules are updated', '1. Calculate salary for CEO', 'Salary: $20,000', 'Tax deduction is exactly 35%').lastInsertRowid;
    const tc3 = insertTC.run(expenseScenario, 'Reject missing receipt upload', 'Negative', 'User is logged in', '1. New claim\n2. Submit without file', 'Amount: $50', 'System shows "Receipt Required" error').lastInsertRowid;
    const tc4 = insertTC.run(cartScenario, 'Items persist after logout', 'Edge Case', 'Items in cart', '1. Add items\n2. Logout\n3. Login', 'Product: Laptop', 'Cart is not empty after re-login').lastInsertRowid;

    // 7. Seed Test Runs
    console.log('Seeding test runs...');
    const insertRun = db.prepare('INSERT INTO test_runs (project_id, tester_id, name, status) VALUES (?, ?, ?, ?)');
    const regressionRun = insertRun.run(hrProject, qaUser.user_id, 'Q2 Regression - Sprint 14', 'In Progress').lastInsertRowid;

    // 8. Seed Test Executions
    console.log('Seeding executions...');
    const insertExec = db.prepare('INSERT INTO test_executions (run_id, test_case_id, status, notes) VALUES (?, ?, ?, ?)');
    insertExec.run(regressionRun, tc1, 'Passed', 'Calculation is precise down to 2 decimals.');
    insertExec.run(regressionRun, tc2, 'Failed', 'Tax was calculated at 30% instead of 35%');
    insertExec.run(regressionRun, tc3, 'Pending', null);

    // 9. Seed Issues
    console.log('Seeding persistent issues...');
    const insertIssue = db.prepare(`
        INSERT INTO issues (test_case_id, reporter_id, title, description, severity, status)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    const taxIssue = insertIssue.run(tc2, qaUser.user_id, 'Incorrect Tax Bracket', 'The 35% bracket is missing for salaries above $15k.', 'High (P1)', 'Open').lastInsertRowid;
    insertIssue.run(tc4, qaUser.user_id, 'Cart clears randomly', 'Occasionally cart items disappear when session expires.', 'Medium (P2)', 'In Progress');

    // 10. Seed Issue Notes
    console.log('Seeding issue notes...');
    const insertNote = db.prepare('INSERT INTO issue_notes (issue_id, user_id, content) VALUES (?, ?, ?)');
    insertNote.run(taxIssue, adminUser.user_id, 'Checking the tax configuration file now.');
    insertNote.run(taxIssue, qaUser.user_id, 'I uploaded the logs to the FTP server.');

    console.log('--- SEEDING COMPLETED SUCCESSFULLY ---');
    db.close();
}

seed().catch(err => {
    console.error('Error during seeding:', err);
    process.exit(1);
});
