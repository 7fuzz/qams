// Test Execution Statuses
export const TEST_STATUS = {
  PASSED: 'Passed',
  PASSED_WITH_NOTE: 'Passed with note',
  FAILED: 'Failed',
  ON_HOLD: 'On Hold',
  UNKNOWN: 'Unknown',
  PENDING: 'Pending',
} as const;

export type TestStatus = typeof TEST_STATUS[keyof typeof TEST_STATUS];

export const TEST_STATUS_OPTIONS = Object.values(TEST_STATUS).map(val => ({
  value: val,
  label: val
}));

// Issue Severities
export const ISSUE_SEVERITY = {
  CRITICAL: 'Critical (P0)',
  HIGH: 'High (P1)',
  MEDIUM: 'Medium (P2)',
  LOW: 'Low (P3)',
  NEGLIGIBLE: 'Negligible (P4)',
} as const;

export type IssueSeverity = typeof ISSUE_SEVERITY[keyof typeof ISSUE_SEVERITY];

export const ISSUE_SEVERITY_OPTIONS = Object.values(ISSUE_SEVERITY).map(val => ({
  value: val,
  label: val
}));

// Issue Statuses
export const ISSUE_STATUS = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  FIXED: 'Fixed',
  REOPENED: 'Re-opened',
  CLOSED: 'Closed',
} as const;

export type IssueStatus = typeof ISSUE_STATUS[keyof typeof ISSUE_STATUS];

export const ISSUE_STATUS_OPTIONS = Object.values(ISSUE_STATUS).map(val => ({
  value: val,
  label: val
}));

// Test Case Types
export const TEST_CASE_TYPE = {
  POSITIVE: 'Positive',
  NEGATIVE: 'Negative',
  EDGE_CASE: 'Edge Case',
  VULNERABILITY: 'Vulnerability',
  UNKNOWN: 'Unknown',
} as const;

export type TestCaseType = typeof TEST_CASE_TYPE[keyof typeof TEST_CASE_TYPE];

export const TEST_CASE_TYPE_OPTIONS = [
  { value: '', label: 'None' },
  ...Object.values(TEST_CASE_TYPE).map(val => ({
    value: val,
    label: val
  }))
];

// Test Run Statuses
export const TEST_RUN_STATUS = {
  DRAFT: 'Draft',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
} as const;

export type TestRunStatus = typeof TEST_RUN_STATUS[keyof typeof TEST_RUN_STATUS];

// Execution Types
export const EXECUTION_TYPE = {
  REGRESSION: 'Regression',
  INTERNAL: 'Internal Test',
  UAT: 'UAT',
  SMOKE: 'Smoke Test',
  EXPLORATORY: 'Exploratory',
  HOTFIX: 'Hotfix',
} as const;

export type ExecutionType = typeof EXECUTION_TYPE[keyof typeof EXECUTION_TYPE];

export const EXECUTION_TYPE_OPTIONS = Object.values(EXECUTION_TYPE).map(val => ({
  value: val,
  label: val
}));

// Test Case Priority
export const TEST_PRIORITY = {
  P0: 'P0 - Critical',
  P1: 'P1 - High',
  P2: 'P2 - Medium',
  P3: 'P3 - Low',
} as const;

export type TestPriority = typeof TEST_PRIORITY[keyof typeof TEST_PRIORITY];

export const TEST_PRIORITY_OPTIONS = [
  { value: '', label: 'None' },
  ...Object.values(TEST_PRIORITY).map(val => ({
    value: val,
    label: val
  }))
];

// Automation Status
export const AUTOMATION_STATUS = {
  MANUAL: 'Manual',
  AUTOMATED: 'Automated',
  CANDIDATE: 'Can be automated',
  NOT_APPLICABLE: 'N/A',
} as const;

export type AutomationStatus = typeof AUTOMATION_STATUS[keyof typeof AUTOMATION_STATUS];

export const AUTOMATION_STATUS_OPTIONS = [
  { value: '', label: 'None' },
  ...Object.values(AUTOMATION_STATUS).map(val => ({
    value: val,
    label: val
  }))
];
