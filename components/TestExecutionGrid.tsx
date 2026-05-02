"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { 
  ColDef, 
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz
} from 'ag-grid-community';
import { Button } from './ui';
import { ExecutionDialog } from './ExecutionDialog';
import { Play } from 'lucide-react';
import { TEST_STATUS, TestStatus } from '@/lib/constants';
import { unifiedGridTheme, GRID_CONTAINER_CLASS } from '@/lib/theme';

ModuleRegistry.registerModules([AllCommunityModule]);

interface Execution {
  execution_id: number;
  title: string;
  status: TestStatus;
  steps: string;
  expected_result: string;
  precondition: string;
  notes: string;
}

export const TestExecutionGrid = ({ runId }: { runId: number }) => {
  const gridRef = useRef<AgGridReact>(null);
  const [rowData, setRowData] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExecution, setSelectedExecution] = useState<Execution | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchExecutions = () => {
    setLoading(true);
    fetch(`/api/test-executions?runId=${runId}`)
      .then(res => res.json())
      .then(data => {
        setRowData(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchExecutions();
  }, [runId]);

  const columnDefs = useMemo<ColDef[]>(() => [
    { 
      headerName: 'Action', 
      width: 100, 
      cellRenderer: (params: any) => (
        <Button 
          size="sm" 
          variant="ghost" 
          className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          onClick={() => {
            setSelectedExecution(params.data);
            setIsDialogOpen(true);
          }}
        >
          <Play size={16} fill="currentColor" />
        </Button>
      ),
      pinned: 'left'
    },
    { field: 'title', headerName: 'Test Case', width: 200, filter: true },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 150,
      cellClassRules: {
        'bg-green-50 text-green-700 font-semibold border-l-4 border-green-500': `x === "${TEST_STATUS.PASSED}"`,
        'bg-emerald-50 text-emerald-700 font-semibold border-l-4 border-emerald-500': `x === "${TEST_STATUS.PASSED_WITH_NOTE}"`,
        'bg-red-50 text-red-700 font-semibold border-l-4 border-red-500': `x === "${TEST_STATUS.FAILED}"`,
        'bg-orange-50 text-orange-700 font-semibold border-l-4 border-orange-500': `x === "${TEST_STATUS.ON_HOLD}"`,
        'bg-gray-100 text-gray-500 border-l-4 border-gray-400': `x === "${TEST_STATUS.PENDING}"`,
        'bg-gray-50 text-gray-400 border-l-4 border-gray-300': `x === "${TEST_STATUS.UNKNOWN}"`,
      }
    },
    { field: 'notes', headerName: 'Notes', flex: 1, filter: true },
    { field: 'steps', headerName: 'Steps', width: 250, hide: true },
  ], []);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading execution data...</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-300px)]">
      <div className={GRID_CONTAINER_CLASS}>
        <AgGridReact
          ref={gridRef}
          theme={unifiedGridTheme}
          rowData={rowData}
          columnDefs={columnDefs}
          animateRows={true}
          onRowDoubleClicked={(params) => {
            setSelectedExecution(params.data);
            setIsDialogOpen(true);
          }}
        />
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
