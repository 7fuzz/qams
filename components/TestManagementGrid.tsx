"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { 
  ColDef, 
  CellValueChangedEvent,
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz
} from 'ag-grid-community';
import { Button } from './ui/Button';
import { Trash2, Plus, Copy, AlertCircle } from 'lucide-react';
import { TEST_CASE_TYPE, TEST_CASE_TYPE_OPTIONS } from '@/lib/constants';
import { GRID_CONTAINER_CLASS } from '@/lib/theme';

ModuleRegistry.registerModules([AllCommunityModule]);

interface TestCase {
  test_case_id?: number;
  scenario_id: number;
  title: string;
  type: string;
  precondition: string;
  steps: string;
  test_data: string;
  expected_result: string;
  project_name?: string;
  module_name?: string;
  scenario_name?: string;
  owner_name?: string;
  open_issues_count?: number;
}

interface TestManagementGridProps {
  scenarioId?: number | null;
  projectId?: number | null;
  moduleId?: number | null;
  quickSearch?: string;
}

export const TestManagementGrid = ({ scenarioId, projectId, moduleId, quickSearch }: TestManagementGridProps) => {
  const gridRef = useRef<AgGridReact>(null);
  const [rowData, setRowData] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTestCases = () => {
    setLoading(true);
    let url = '/api/test-cases';
    if (scenarioId) url += `?scenarioId=${scenarioId}`;
    else if (moduleId) url += `?moduleId=${moduleId}`;
    else if (projectId) url += `?projectId=${projectId}`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        setRowData(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTestCases();
  }, [scenarioId, projectId, moduleId]);

  useEffect(() => {
    if (gridRef.current?.api) {
        gridRef.current.api.setGridOption('quickFilterText', quickSearch);
    }
  }, [quickSearch]);

  const columnDefs = useMemo<ColDef[]>(() => [
    { 
      field: 'title', 
      headerName: 'Case Title', 
      width: 200, 
      checkboxSelection: true, 
      headerCheckboxSelection: true,
      pinned: 'left',
      filter: true
    },
    { 
        field: 'project_name', 
        headerName: 'Project', 
        width: 150, 
        hide: !!scenarioId || !!projectId || !!moduleId,
        filter: true 
    },
    { 
        field: 'module_name', 
        headerName: 'Module', 
        width: 150, 
        hide: !!scenarioId || !!moduleId,
        filter: true 
    },
    { 
        field: 'scenario_name', 
        headerName: 'Scenario', 
        width: 150, 
        hide: !!scenarioId,
        filter: true 
    },
    { 
      field: 'type', 
      headerName: 'Type', 
      width: 120,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: TEST_CASE_TYPE_OPTIONS.map(o => o.value),
      },
      cellClassRules: {
        'text-blue-600 font-medium': `x === "${TEST_CASE_TYPE.POSITIVE}"`,
        'text-red-600 font-medium': `x === "${TEST_CASE_TYPE.NEGATIVE}"`,
        'text-orange-600 font-medium': `x === "${TEST_CASE_TYPE.EDGE_CASE}"`,
      }
    },
    { 
        field: 'open_issues_count', 
        headerName: 'Issues', 
        width: 100,
        cellRenderer: (params: any) => {
            if (!params.value) return null;
            return (
                <div className="flex items-center gap-1 text-red-500 font-bold">
                    <AlertCircle size={14} /> {params.value}
                </div>
            );
        }
    },
    { field: 'owner_name', headerName: 'Owner', width: 120 },
    { field: 'precondition', headerName: 'Precondition', width: 200 },
    { field: 'steps', headerName: 'Test Steps', width: 300, autoHeight: true, wrapText: true, cellEditor: 'agLargeTextCellEditor' },
    { field: 'expected_result', headerName: 'Expected Result', width: 250 },
  ], [scenarioId, projectId, moduleId]);

  const defaultColDef = useMemo<ColDef>(() => ({
    resizable: true,
    editable: true,
    sortable: true,
    filter: true,
    suppressHeaderMenuButton: true,
    minWidth: 100,
  }), []);

  const addRow = () => {
    if (!scenarioId) {
        alert("Please select a specific Scenario to add a new test case.");
        return;
    }
    const newRow: TestCase = {
      scenario_id: scenarioId,
      title: 'New Test Case',
      type: TEST_CASE_TYPE.POSITIVE,
      precondition: '',
      steps: '',
      test_data: '',
      expected_result: '',
    };

    fetch('/api/test-cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRow),
    })
    .then(res => res.json())
    .then(() => {
      fetchTestCases();
    });
  };

  const deleteSelected = () => {
    const selectedNodes = gridRef.current?.api.getSelectedNodes();
    if (!selectedNodes || selectedNodes.length === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedNodes.length} test cases?`)) return;

    const idsToDelete = selectedNodes.map(node => node.data.test_case_id);
    
    Promise.all(idsToDelete.map(id => 
      fetch(`/api/test-cases?id=${id}`, { method: 'DELETE' })
    )).then(() => {
      fetchTestCases();
    });
  };

  const duplicateSelected = () => {
    const selectedNodes = gridRef.current?.api.getSelectedNodes();
    if (!selectedNodes || selectedNodes.length === 0) return;

    const idsToDuplicate = selectedNodes.map(node => node.data.test_case_id);
    
    Promise.all(idsToDuplicate.map(id => 
      fetch(`/api/test-cases`, { 
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test_case_id: id })
      })
    )).then(() => {
      fetchTestCases();
    });
  };

  const onCellValueChanged = (event: CellValueChangedEvent) => {
    const data = event.data;
    if (data.test_case_id) {
      fetch('/api/test-cases', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500 text-sm">Loading library data...</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-280px)] min-w-[800px]">
      <div className="flex justify-between items-center px-6 py-3 border-b dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            Library
            <span className="bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full text-[10px] font-bold">
                {rowData.length} Cases
            </span>
        </h3>
        <div className="flex gap-2">
          <Button onClick={deleteSelected} variant="ghost" size="sm" className="h-8 text-red-600 hover:bg-red-50">
            <Trash2 size={16} className="mr-2" /> Delete
          </Button>
          <Button onClick={duplicateSelected} variant="ghost" size="sm" className="h-8 text-blue-600 hover:bg-blue-50">
            <Copy size={16} className="mr-2" /> Duplicate
          </Button>
          <Button onClick={addRow} size="sm" className="h-8" disabled={!scenarioId}>
            <Plus size={16} className="mr-2" /> Add Case
          </Button>
        </div>
      </div>
      
      <div className={GRID_CONTAINER_CLASS}>
        <AgGridReact
          ref={gridRef}
          theme={themeQuartz.withParams({
            accentColor: '#3b82f6',
            backgroundColor: 'transparent',
            foregroundColor: 'inherit',
            headerBackgroundColor: 'transparent',
            headerTextColor: 'inherit',
          })}
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          onCellValueChanged={onCellValueChanged}
          rowSelection="multiple"
          animateRows={true}
        />
      </div>
    </div>
  );
};
