"use client";

import React, { useState, useEffect } from 'react';
import { Button, Card, CardContent } from '../ui';
import { ExecutionDialog } from '../dialogs/ExecutionDialog';
import { Play, CheckCircle2, AlertCircle, Clock, PauseCircle, HelpCircle } from 'lucide-react';
import { TEST_STATUS, TestStatus } from '@/lib/constants';

interface Execution {
  execution_id: number;
  test_case_id: number;
  title: string;
  status: TestStatus;
  steps: string;
  expected_result: string;
  precondition: string;
  notes: string;
}

export const TestExecutionGrid = ({ runId }: { runId: number }) => {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExecution, setSelectedExecution] = useState<Execution | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchExecutions = () => {
    setLoading(true);
    fetch(`/api/test-executions?runId=${runId}`)
      .then(res => res.json())
      .then(data => {
        setExecutions(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchExecutions();
  }, [runId]);

  const getStatusIcon = (status: TestStatus) => {
    switch (status) {
      case TEST_STATUS.PASSED:
        return <CheckCircle2 className="text-green-500" size={20} />;
      case TEST_STATUS.PASSED_WITH_NOTE:
        return <CheckCircle2 className="text-emerald-500" size={20} />;
      case TEST_STATUS.FAILED:
        return <AlertCircle className="text-red-500" size={20} />;
      case TEST_STATUS.ON_HOLD:
        return <PauseCircle className="text-orange-500" size={20} />;
      case TEST_STATUS.PENDING:
        return <Clock className="text-gray-400" size={20} />;
      default:
        return <HelpCircle className="text-gray-400" size={20} />;
    }
  };

  const getStatusClass = (status: TestStatus) => {
    switch (status) {
      case TEST_STATUS.PASSED:
        return 'border-green-500/50 bg-green-50/5 dark:bg-green-500/5';
      case TEST_STATUS.PASSED_WITH_NOTE:
        return 'border-emerald-500/50 bg-emerald-50/5 dark:bg-emerald-500/5';
      case TEST_STATUS.FAILED:
        return 'border-red-500/50 bg-red-50/5 dark:bg-red-500/5';
      case TEST_STATUS.ON_HOLD:
        return 'border-orange-500/50 bg-orange-50/5 dark:bg-orange-500/5';
      default:
        return 'border-gray-200 dark:border-gray-800';
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading execution data...</div>;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {executions.map((exec) => (
          <Card 
            key={exec.execution_id} 
            className={`cursor-pointer transition-all hover:shadow-md hover:scale-[1.01] border-l-4 ${getStatusClass(exec.status)}`}
            onClick={() => {
              setSelectedExecution(exec);
              setIsDialogOpen(true);
            }}
          >
            <CardContent className="p-5 flex flex-col h-full justify-between gap-4">
              <div className="space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <h4 className="font-bold text-sm line-clamp-2 leading-tight flex-1">{exec.title}</h4>
                  {getStatusIcon(exec.status)}
                </div>
                
                <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                  <p className="line-clamp-2 italic">“{exec.notes || 'No notes yet...'}”</p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-auto pt-4 border-t dark:border-gray-800">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  {exec.status}
                </span>
                <Button size="sm" variant="ghost" className="h-8 px-2 text-blue-600">
                  <Play size={14} className="mr-1" fill="currentColor" /> Execute
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ExecutionDialog 
        execution={selectedExecution}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={() => fetchExecutions()}
      />
    </div>
  );
};
