"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Button, 
  IconButton, 
  CRUDTable,
  Column,
  Combobox,
  Label
} from '../ui';
import { ExecutionDialog } from '../dialogs/ExecutionDialog';
import { 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  PauseCircle, 
  HelpCircle, 
  FastForward,
} from 'lucide-react';
import { TEST_STATUS, TestStatus } from '@/lib/constants';
import { AddCasesToRunDialog } from '../dialogs/AddCasesToRunDialog';
import { Module, Scenario } from '@/types/app';

interface Execution {
  execution_id: string;
  test_case_id: string;
  custom_id: string | null;
  title: string;
  status: TestStatus;
  module_name: string;
  scenario_name: string;
  steps: string;
  expected_result: string;
  precondition: string;
  test_data: string;
  notes: string;
  executed_at: string | null;
}

const getStatusIcon = (status: TestStatus) => {
  switch (status) {
    case TEST_STATUS.PASSED:
      return <CheckCircle2 className="text-green-500" size={18} />;
    case TEST_STATUS.PASSED_WITH_NOTE:
      return <CheckCircle2 className="text-emerald-500" size={18} />;
    case TEST_STATUS.FAILED:
      return <AlertCircle className="text-red-500" size={18} />;
    case TEST_STATUS.ON_HOLD:
      return <PauseCircle className="text-orange-500" size={18} />;
    case TEST_STATUS.PENDING:
      return <Clock className="text-gray-400" size={18} />;
    default:
      return <HelpCircle className="text-gray-400" size={18} />;
  }
};

export const TestExecutionTable = ({ runId, onUpdate }: { runId: string, onUpdate?: () => void }) => {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExecution, setSelectedExecution] = useState<Execution | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddCasesOpen, setIsAddCasesOpen] = useState(false);
  const [projectId, setProjectId] = useState<string>('');
  const [availableModules, setAvailableModules] = useState<Module[]>([]);
  const [availableScenarios, setAvailableScenarios] = useState<Scenario[]>([]);
  
  // Pagination & Search
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('id');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [moduleFilter, setModuleFilter] = useState<string>('');
  const [scenarioFilter, setScenarioFilter] = useState<string>('');

  useEffect(() => {
    fetch(`/api/test-runs/${runId}`)
      .then(res => res.json())
      .then(data => {
        if (data.project_id) setProjectId(data.project_id);
      });
  }, [runId]);

  useEffect(() => {
    if (projectId) {
      fetch(`/api/modules?projectId=${projectId}&limit=1000`)
        .then(res => res.json())
        .then(res => setAvailableModules(res.data || []));
    }
  }, [projectId]);

  useEffect(() => {
    if (moduleFilter) {
      fetch(`/api/scenarios?moduleId=${moduleFilter}`)
        .then(res => res.json())
        .then(res => setAvailableScenarios(res || []));
    } else {
        setAvailableScenarios([]);
        setScenarioFilter('');
    }
  }, [moduleFilter]);

  const fetchExecutions = useCallback(() => {
    setLoading(true);
    let url = `/api/test-executions?runId=${runId}&page=${page}&limit=${limit}&sortBy=${sortBy}&sortOrder=${sortOrder}&search=${encodeURIComponent(search)}`;
    
    if (statusFilter) url += `&status=${statusFilter}`;
    if (moduleFilter) url += `&moduleId=${moduleFilter}`;
    if (scenarioFilter) url += `&scenarioId=${scenarioFilter}`;

    fetch(url)
      .then(res => res.json())
      .then(res => {
        if (res.data) {
            setExecutions(res.data);
            setTotal(res.total || 0);
        } else {
            setExecutions([]);
            setTotal(0);
        }
        setLoading(false);
      })
      .catch(() => {
          setExecutions([]);
          setTotal(0);
          setLoading(false);
      });
  }, [runId, page, limit, sortBy, sortOrder, search, statusFilter, moduleFilter, scenarioFilter]);

  useEffect(() => {
    queueMicrotask(() => {
        fetchExecutions();
    });
  }, [fetchExecutions]);

  const handleQuickPass = useCallback(async (id: string) => {
    await fetch('/api/test-executions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ execution_id: id, status: TEST_STATUS.PASSED }),
    });
    fetchExecutions();
  }, [fetchExecutions]);

  const columns: Column<Execution>[] = useMemo(() => [
    {
        header: 'Case ID',
        accessorKey: 'custom_id',
        sortable: true,
        width: 100,
        className: 'w-[100px] font-mono text-[10px] text-text-theme-muted uppercase',
        cell: (item) => (
            <div className="flex flex-col gap-0.5">
                <span className="font-black text-primary-theme">{item.custom_id || 'TC-NEW'}</span>
                <span className="text-[8px] opacity-50">{item.execution_id.split('-')[0]}</span>
            </div>
        )
    },
    {
        header: 'Module',
        accessorKey: 'module_name' as any,
        sortable: true,
        width: 110,
        className: 'w-[110px] text-[10px] font-bold uppercase text-text-theme-muted',
        cell: (item) => item.module_name
    },
    {
        header: 'Scenario',
        accessorKey: 'scenario_name' as any,
        sortable: true,
        width: 130,
        className: 'w-[130px] text-[10px] font-bold uppercase text-text-theme-muted',
        cell: (item) => item.scenario_name
    },
    {
        header: 'Test Case Title',
        accessorKey: 'title',
        sortable: true,
        width: 300,
        className: 'font-medium',
        cell: (item) => item.title
    },
    {
        header: 'Status',
        accessorKey: 'status',
        sortable: true,
        width: 130,
        className: 'w-[130px]',
        cell: (item) => (
            <div className="flex items-center gap-2">
                {getStatusIcon(item.status)}
                <span className={`text-[10px] font-bold uppercase tracking-widest ${
                    item.status === TEST_STATUS.PENDING ? 'text-text-theme-muted' : 'text-primary-theme'
                }`}>
                    {item.status}
                </span>
            </div>
        )
    },
    {
        header: 'Notes',
        accessorKey: 'notes',
        width: 250,
        className: 'w-[250px] text-xs text-text-theme-muted italic line-clamp-1',
        cell: (item) => item.notes ? `“${item.notes}”` : '-'
    },
    {
        header: 'Executed At',
        accessorKey: 'executed_at',
        sortable: true,
        width: 150,
        className: 'w-[150px] text-xs text-text-theme-muted',
        cell: (item) => item.executed_at ? new Date(item.executed_at).toLocaleString() : 'Not executed'
    },
    {
        header: 'Actions',
        className: 'text-right',
        width: 130,
        minWidth: 130,
        pin: 'right',
        cell: (item) => (
            <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                {item.status === TEST_STATUS.PENDING && (
                    <IconButton 
                        icon={FastForward} 
                        size="sm" 
                        variant="ghost" 
                        className="text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20" 
                        label="Quick pass"
                        title="Quick Pass"
                        onClick={() => handleQuickPass(item.execution_id)}
                    />
                )}
                <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-8 px-2 text-primary-theme font-bold text-[10px] uppercase tracking-wider"
                    onClick={() => {
                        setSelectedExecution(item);
                        setIsDialogOpen(true);
                    }}
                >
                    <Play size={12} className="mr-1" fill="currentColor" /> Execute
                </Button>
            </div>
        )
    }
  ], [handleQuickPass, setSelectedExecution, setIsDialogOpen]);

  return (
    <div className="pt-4 space-y-4">
      <div className="bg-surface border border-border-theme p-4 rounded-xl shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-text-theme-muted">Status</Label>
                <Combobox 
                    options={[
                        { value: '', label: 'All Statuses' },
                        { value: TEST_STATUS.PENDING, label: 'Pending' },
                        { value: TEST_STATUS.PASSED, label: 'Passed' },
                        { value: TEST_STATUS.FAILED, label: 'Failed' },
                        { value: TEST_STATUS.ON_HOLD, label: 'On Hold' },
                    ]}
                    value={statusFilter}
                    onChange={(val) => { setStatusFilter(val as string); setPage(1); }}
                />
            </div>
            <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-text-theme-muted">Module</Label>
                <Combobox 
                    options={[
                        { value: '', label: 'All Modules' },
                        ...availableModules.map(m => ({ value: m.module_id, label: m.name }))
                    ]}
                    value={moduleFilter}
                    onChange={(val) => { setModuleFilter(val as string); setPage(1); }}
                />
            </div>
            <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-text-theme-muted">Scenario</Label>
                <Combobox 
                    options={[
                        { value: '', label: 'All Scenarios' },
                        ...availableScenarios.map(s => ({ value: s.scenario_id, label: s.name }))
                    ]}
                    value={scenarioFilter}
                    onChange={(val) => { setScenarioFilter(val as string); setPage(1); }}
                />
            </div>
            <div className="flex gap-2">
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-10 flex-1 text-[10px] font-bold uppercase tracking-wider"
                    onClick={() => {
                        setStatusFilter('');
                        setModuleFilter('');
                        setScenarioFilter('');
                        setSearch('');
                        setPage(1);
                    }}
                >
                    Clear Filters
                </Button>
            </div>
        </div>
      </div>

      <CRUDTable
        data={executions as object[]}
        columns={columns as Column<object>[]}
        loading={loading}
        totalItems={total}
        currentPage={page}
        pageSize={limit}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setLimit(s); setPage(1); }}
        onSearch={(q) => { setSearch(q); setPage(1); }}
        onSort={(key, order) => { setSortBy(key); setSortOrder(order); }}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onCreate={() => setIsAddCasesOpen(true)}
        createLabel="Add Cases"
        onRowClick={(item) => {
            setSelectedExecution(item as unknown as Execution);
            setIsDialogOpen(true);
        }}
        searchPlaceholder="Search title, status or notes..."
        title="Execution Queue"
        description="Verify and document results for each assigned test case"
      />

      <ExecutionDialog 
        execution={selectedExecution}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={() => {
            fetchExecutions();
            onUpdate?.();
        }}
      />

      <AddCasesToRunDialog 
        runId={runId}
        projectId={projectId}
        isOpen={isAddCasesOpen}
        onClose={() => setIsAddCasesOpen(false)}
        onSuccess={() => {
            fetchExecutions();
            onUpdate?.();
        }}
        existingTestCaseIds={executions.map(e => e.test_case_id)}
      />
    </div>
  );
};
