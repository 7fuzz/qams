"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Button, 
  IconButton, 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
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
  ArrowUpDown,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { TEST_STATUS, TestStatus } from '@/lib/constants';

interface Execution {
  execution_id: string;
  test_case_id: string;
  title: string;
  status: TestStatus;
  steps: string;
  expected_result: string;
  precondition: string;
  test_data: string;
  notes: string;
  executed_at: string | null;
}

type SortColumn = 'id' | 'title' | 'status' | 'executed_at';
type SortDirection = 'asc' | 'desc';

export const TestExecutionTable = ({ runId }: { runId: string }) => {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExecution, setSelectedExecution] = useState<Execution | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [sortColumn, setSortColumn] = useState<SortColumn>('title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const fetchExecutions = useCallback(() => {
    setLoading(true);
    fetch(`/api/test-executions?runId=${runId}`)
      .then(res => res.json())
      .then((data: Execution[]) => {
        setExecutions(data);
        setLoading(false);
      })
      .catch(() => {
          setExecutions([]);
          setLoading(false);
      });
  }, [runId]);

  useEffect(() => {
    queueMicrotask(() => {
        fetchExecutions();
    });
  }, [fetchExecutions]);

  const handleQuickPass = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await fetch('/api/test-executions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ execution_id: id, status: TEST_STATUS.PASSED }),
    });
    fetchExecutions();
  };

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

  const toggleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedExecutions = useMemo(() => {
    return [...executions].sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      switch (sortColumn) {
        case 'id':
          valA = a.execution_id;
          valB = b.execution_id;
          break;
        case 'title':
          valA = a.title.toLowerCase();
          valB = b.title.toLowerCase();
          break;
        case 'status':
          valA = a.status;
          valB = b.status;
          break;
        case 'executed_at':
          valA = a.executed_at || '';
          valB = b.executed_at || '';
          break;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [executions, sortColumn, sortDirection]);

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) return <ArrowUpDown size={14} className="ml-1 opacity-50" />;
    return sortDirection === 'asc' ? <ChevronUp size={14} className="ml-1" /> : <ChevronDown size={14} className="ml-1" />;
  };

  if (loading) return <div className="p-8 text-center text-gray-500 text-sm italic uppercase tracking-widest">Loading execution data...</div>;

  return (
    <div className="flex flex-col gap-6 pt-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead 
              className="cursor-pointer hover:bg-surface-accent transition-colors w-[100px]"
              onClick={() => toggleSort('id')}
            >
              <div className="flex items-center">ID <SortIcon column="id" /></div>
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-surface-accent transition-colors"
              onClick={() => toggleSort('title')}
            >
              <div className="flex items-center">Test Case Title <SortIcon column="title" /></div>
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-surface-accent transition-colors w-[150px]"
              onClick={() => toggleSort('status')}
            >
              <div className="flex items-center">Status <SortIcon column="status" /></div>
            </TableHead>
            <TableHead className="w-[250px]">Notes</TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-surface-accent transition-colors w-[180px]"
              onClick={() => toggleSort('executed_at')}
            >
              <div className="flex items-center">Executed At <SortIcon column="executed_at" /></div>
            </TableHead>
            <TableHead className="text-right w-[150px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedExecutions.map((exec) => (
            <TableRow 
              key={exec.execution_id}
              className="group cursor-pointer"
              onClick={() => {
                setSelectedExecution(exec);
                setIsDialogOpen(true);
              }}
            >
              <TableCell className="font-mono text-[10px] text-text-theme-muted uppercase">
                {exec.execution_id.split('-')[0]}
              </TableCell>
              <TableCell className="font-medium">
                {exec.title}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {getStatusIcon(exec.status)}
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${
                    exec.status === TEST_STATUS.PENDING ? 'text-text-theme-muted' : 'text-primary-theme'
                  }`}>
                    {exec.status}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-xs text-text-theme-muted italic line-clamp-1">
                {exec.notes ? `“${exec.notes}”` : '-'}
              </TableCell>
              <TableCell className="text-xs text-text-theme-muted">
                {exec.executed_at ? new Date(exec.executed_at).toLocaleString() : 'Not executed'}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                  {exec.status === TEST_STATUS.PENDING && (
                    <IconButton 
                      icon={FastForward} 
                      size="sm" 
                      variant="ghost" 
                      className="text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20" 
                      label="Quick pass"
                      title="Quick Pass"
                      onClick={(e) => handleQuickPass(e, exec.execution_id)}
                    />
                  )}
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-8 px-2 text-primary-theme font-bold text-[10px] uppercase tracking-wider"
                    onClick={() => {
                      setSelectedExecution(exec);
                      setIsDialogOpen(true);
                    }}
                  >
                    <Play size={12} className="mr-1" fill="currentColor" /> Execute
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {sortedExecutions.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-text-theme-muted italic">
                No test cases found in this run.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <ExecutionDialog 
        execution={selectedExecution}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={() => fetchExecutions()}
      />
    </div>
  );
};
