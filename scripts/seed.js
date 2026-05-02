const Database = require('better-sqlite3');
const path = require('path');
const { randomUUID } = require('crypto');
const bcrypt = require('bcryptjs');

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
    const insertRole = db.prepare('INSERT INTO roles (role_id, name, permissions) VALUES (?, ?, ?)');
    const adminRoleId = randomUUID();
    const devRoleId = randomUUID();
    const qaRoleId = randomUUID();

    insertRole.run(adminRoleId, 'Admin', JSON.stringify({ all: true }));
    insertRole.run(devRoleId, 'Developer', JSON.stringify({ edit: true }));
    insertRole.run(qaRoleId, 'QA', JSON.stringify({ test: true }));

    // 2. Seed Users
    console.log('Seeding users...');
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash('123', salt);
    
    const adminUserId = randomUUID();
    const devUserId = randomUUID();
    const qaUserId = randomUUID();

    const insertUser = db.prepare('INSERT INTO users (user_id, name, email, password, role_id) VALUES (?, ?, ?, ?, ?)');
    insertUser.run(adminUserId, 'System Admin', 'admin@example.com', hashed, adminRoleId);
    insertUser.run(devUserId, 'Lead Developer', 'dev@example.com', hashed, devRoleId);
    insertUser.run(qaUserId, 'Senior QA', 'qa@example.com', hashed, qaRoleId);

    // 3. Seed Projects
    console.log('Seeding projects...');
    const insertProject = db.prepare('INSERT INTO projects (project_id, name, version, owner_id) VALUES (?, ?, ?, ?)');
    const hrProjectId = randomUUID();
    const ecomProjectId = randomUUID();
    
    insertProject.run(hrProjectId, 'HR Management System', '2.4.0', adminUserId);
    insertProject.run(ecomProjectId, 'E-Commerce Platform', '1.0.5', adminUserId);

    // 4. Seed Modules
    console.log('Seeding modules...');
    const insertModule = db.prepare('INSERT INTO modules (module_id, project_id, name, description) VALUES (?, ?, ?, ?)');
    const payrollModId = randomUUID();
    const leaveModId = randomUUID();
    const checkoutModId = randomUUID();

    insertModule.run(payrollModId, hrProjectId, 'Payroll', 'Handles employee salary and tax calculations');
    insertModule.run(leaveModId, hrProjectId, 'Leave Management', 'Employee time-off requests and approvals');
    insertModule.run(checkoutModId, ecomProjectId, 'Checkout & Payment', 'Shopping cart and gateway integration');

    // 5. Seed Scenarios
    console.log('Seeding scenarios...');
    const insertScenario = db.prepare('INSERT INTO scenarios (scenario_id, module_id, name) VALUES (?, ?, ?)');
    const salaryScenarioId = randomUUID();
    const expenseScenarioId = randomUUID();
    const annualLeaveScenarioId = randomUUID();
    const cartScenarioId = randomUUID();

    insertScenario.run(salaryScenarioId, payrollModId, 'Monthly Salary Disbursement');
    insertScenario.run(expenseScenarioId, payrollModId, 'Expense Reimbursement');
    insertScenario.run(annualLeaveScenarioId, leaveModId, 'Annual Leave Request');
    insertScenario.run(cartScenarioId, checkoutModId, 'Cart Persistence');

    // 6. Seed Test Cases
    console.log('Seeding test cases...');
    const insertTC = db.prepare(`
        INSERT INTO test_cases (test_case_id, scenario_id, title, type, precondition, steps, test_data, expected_result)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const tc1 = randomUUID();
    const tc2 = randomUUID();
    const tc3 = randomUUID();
    const tc4 = randomUUID();

    insertTC.run(tc1, salaryScenarioId, 'Verify base salary calculation', 'Positive', 'Employee has active contract', '1. Open Payroll\n2. Select Employee\n3. Calculate', 'EMP-001', 'Salary matches contract terms');
    insertTC.run(tc2, salaryScenarioId, 'Verify tax deduction for high earners', 'Positive', 'Tax rules are updated', '1. Calculate salary for CEO', 'Salary: $20,000', 'Tax deduction is exactly 35%');
    insertTC.run(tc3, expenseScenarioId, 'Reject missing receipt upload', 'Negative', 'User is logged in', '1. New claim\n2. Submit without file', 'Amount: $50', 'System shows "Receipt Required" error');
    insertTC.run(tc4, cartScenarioId, 'Items persist after logout', 'Edge Case', 'Items in cart', '1. Add items\n2. Logout\n3. Login', 'Product: Laptop', 'Cart is not empty after re-login');

    // 7. Seed Test Runs
    console.log('Seeding test runs...');
    const insertRun = db.prepare('INSERT INTO test_runs (run_id, project_id, tester_id, name, status) VALUES (?, ?, ?, ?, ?)');
    const regressionRunId = randomUUID();
    insertRun.run(regressionRunId, hrProjectId, qaUserId, 'Q2 Regression - Sprint 14', 'In Progress');

    // 8. Seed Test Executions
    console.log('Seeding executions...');
    const insertExec = db.prepare('INSERT INTO test_executions (execution_id, run_id, test_case_id, status, notes) VALUES (?, ?, ?, ?, ?)');
    insertExec.run(randomUUID(), regressionRunId, tc1, 'Passed', 'Calculation is precise down to 2 decimals.');
    const failedExecId = randomUUID();
    insertExec.run(failedExecId, regressionRunId, tc2, 'Failed', 'Tax was calculated at 30% instead of 35%');
    insertExec.run(randomUUID(), regressionRunId, tc3, 'Pending', null);

    // 9. Seed Issues
    console.log('Seeding persistent issues...');
    const insertIssue = db.prepare(`
        INSERT INTO issues (issue_id, test_case_id, reporter_id, title, description, severity, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const taxIssueId = randomUUID();
    insertIssue.run(taxIssueId, tc2, qaUserId, 'Incorrect Tax Bracket', 'The 35% bracket is missing for salaries above $15k.', 'High (P1)', 'Open');
    insertIssue.run(randomUUID(), tc4, qaUserId, 'Cart clears randomly', 'Occasionally cart items disappear when session expires.', 'Medium (P2)', 'In Progress');

    // 10. Seed Issue Notes
    console.log('Seeding issue notes...');
    const insertNote = db.prepare('INSERT INTO issue_notes (note_id, issue_id, user_id, content) VALUES (?, ?, ?, ?)');
    insertNote.run(randomUUID(), taxIssueId, adminUserId, 'Checking the tax configuration file now.');
    insertNote.run(randomUUID(), taxIssueId, qaUserId, 'I uploaded the logs to the FTP server.');

    console.log('--- SEEDING COMPLETED SUCCESSFULLY ---');
    db.close();
}

seed().catch(err => {
    console.error('Error during seeding:', err);
    process.exit(1);
});
