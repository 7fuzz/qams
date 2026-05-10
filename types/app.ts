export interface Project {
    project_id: string;
    name: string;
    description?: string;
    lead_developer_id?: string;
}

export interface Module {
    module_id: string;
    project_id: string;
    name: string;
    description?: string;
    sla_date?: string | null;
    actual_date?: string | null;
}

export interface Scenario {
    scenario_id: string;
    module_id: string;
    name: string;
    open_issues_count?: number;
}

export interface TestCase {
    test_case_id: string;
    custom_id?: string;
    scenario_id: string;
    title: string;
    type?: string;
    priority?: string;
    automation_status?: string;
    requirement_link?: string;
    estimated_duration?: number;
    precondition: string;
    steps: string;
    test_data: string;
    expected_result: string;
    scenario_name?: string;
    open_issues_count?: number;
    closed_issues_count?: number;
    updated_at?: string;
    last_executed_at?: string;
}

export interface TestRun {
    run_id: string;
    name: string;
    type: string;
    project_id: string;
    project_name: string;
    project_owner: string;
    status: string;
    total_cases: number;
    passed_count: number;
    failed_count: number;
    pending_count: number;
    assigned_tester_ids?: string[];
    assigned_tester_names?: string[];
    requested_by_id?: string;
    requested_by_name?: string;
    created_at: string;
}

export interface Release {
    release_id: string;
    project_id: string;
    version_name: string;
    status: string;
    sla_date?: string | null;
    actual_date?: string | null;
    description: string;
    post_release_issue_ids?: string[];
    post_release_issue_titles?: string[];
}

export interface ReleaseChange {
    change_id: string;
    release_id: string;
    module_ids: string[];
    module_names: string[];
    type: 'Feature' | 'Bugfix' | 'Enhancement';
    title: string;
    description: string;
    issue_ids: string[];
    issue_titles: string[];
}

export interface Issue {
    issue_id: string;
    title: string;
    description: string;
    status: string;
    severity: string;
    project_id: string;
    project_name?: string;
    module_id?: string;
    module_name?: string;
    test_case_id?: string;
    test_case_title?: string;
    test_case_titles?: string;
    reporter_id: string;
    reporter_name?: string;
    developer_id?: string;
    developer_name?: string;
    sla_date?: string | null;
    actual_date?: string | null;
    created_at: string;
    tag_ids?: string[];
    tags?: { tag_id: string, name: string, color: string }[];
}

export interface Attachment {
    attachment_id: string;
    entity_id: string;
    entity_type: string;
    url: string;
    name: string;
    created_at?: string;
}

export interface Role {
    role_id: string;
    name: string;
}
