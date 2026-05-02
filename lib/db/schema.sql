-- Roles Table (RBAC)
CREATE TABLE IF NOT EXISTS roles (
    role_id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL, 
    permissions TEXT 
);

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role_id TEXT,
    FOREIGN KEY (role_id) REFERENCES roles(role_id)
);

-- Projects Table
CREATE TABLE IF NOT EXISTS projects (
    project_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    version TEXT,
    owner_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(user_id)
);

-- Project Modules Table
CREATE TABLE IF NOT EXISTS modules (
    module_id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE
);

-- Scenarios Table
CREATE TABLE IF NOT EXISTS scenarios (
    scenario_id TEXT PRIMARY KEY,
    module_id TEXT NOT NULL,
    name TEXT NOT NULL,
    FOREIGN KEY (module_id) REFERENCES modules(module_id) ON DELETE CASCADE
);

-- Test Cases Table
CREATE TABLE IF NOT EXISTS test_cases (
    test_case_id TEXT PRIMARY KEY,
    scenario_id TEXT NOT NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    precondition TEXT,
    steps TEXT,
    test_data TEXT,
    expected_result TEXT,
    FOREIGN KEY (scenario_id) REFERENCES scenarios(scenario_id) ON DELETE CASCADE
);

-- Test Runs (Execution Sessions)
CREATE TABLE IF NOT EXISTS test_runs (
    run_id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    tester_id TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'Draft',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
    FOREIGN KEY (tester_id) REFERENCES users(user_id)
);

-- Test Executions
CREATE TABLE IF NOT EXISTS test_executions (
    execution_id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    test_case_id TEXT NOT NULL,
    status TEXT DEFAULT 'Pending',
    notes TEXT,
    proof_url TEXT,
    executed_at DATETIME,
    FOREIGN KEY (run_id) REFERENCES test_runs(run_id) ON DELETE CASCADE,
    FOREIGN KEY (test_case_id) REFERENCES test_cases(test_case_id) ON DELETE CASCADE
);

-- Issues Table (Persistent across runs)
CREATE TABLE IF NOT EXISTS issues (
    issue_id TEXT PRIMARY KEY,
    test_case_id TEXT NOT NULL,
    snapshot_execution_id TEXT, -- The execution where this issue was FIRST reported/linked
    reporter_id TEXT NOT NULL,
    developer_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    severity TEXT,
    status TEXT DEFAULT 'Open',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (test_case_id) REFERENCES test_cases(test_case_id) ON DELETE CASCADE,
    FOREIGN KEY (reporter_id) REFERENCES users(user_id),
    FOREIGN KEY (developer_id) REFERENCES users(user_id)
);

-- Issue Notes Table
CREATE TABLE IF NOT EXISTS issue_notes (
    note_id TEXT PRIMARY KEY,
    issue_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (issue_id) REFERENCES issues(issue_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Issue History (Tracking status across runs)
CREATE TABLE IF NOT EXISTS issue_history (
    history_id TEXT PRIMARY KEY,
    issue_id TEXT NOT NULL,
    run_id TEXT,
    execution_id TEXT,
    status TEXT NOT NULL,
    user_id TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (issue_id) REFERENCES issues(issue_id) ON DELETE CASCADE,
    FOREIGN KEY (run_id) REFERENCES test_runs(run_id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Activity Log Table
CREATE TABLE IF NOT EXISTS activity_log (
    log_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL, 
    entity_type TEXT NOT NULL, 
    entity_id TEXT NOT NULL,
    details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);
