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
import { Button, Input } from './ui';
import { Trash2, Plus, Copy, AlertCircle, ListChecks } from 'lucide-react';
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
  scenario_name?: string;
  open_issues_count?: number;
}

interface Scenario {
    scenario_id: number;
    name: string;
}

interface TestManagementGridProps {
  moduleId: number;
}

export const TestManagementGrid = ({ moduleId }: TestManagementGridProps) => {
  const gridRef = useRef<AgGridReact>(null);
  const [rowData, setRowData] = useState<TestCase[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [newScenarioName, setNewScenarioName] = useState('');

  const fetchScenarios = () => fetch(`/api/scenarios?moduleId=${moduleId}`).then(res => res.json()).then(setScenarios);
  
  const fetchTestCases = () => {
    setLoading(true);
    fetch(`/api/test-cases?moduleId=${moduleId}`)
      .then(res => res.json())
      .then(data => {
        setRowData(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchScenarios();
    fetchTestCases();
  }, [moduleId]);

  const handleAddScenario = async () => {
    if (!newScenarioName) return;
    await fetch('/api/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newScenarioName, module_id: moduleId }),
    });
    setNewScenarioName('');
    fetchScenarios();
  };

  const columnDefs = useMemo<ColDef[]>(() => [
    { 
        field: 'scenario_id', 
        headerName: 'Scenario', 
        width: 180,
        pinned: 'left',
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: {
            values: scenarios.map(s => s.scenario_id),
            formatValue: (id: number) => scenarios.find(s => s.scenario_id === id)?.name || id,
        },
        valueFormatter: (params) => scenarios.find(s => s.scenario_id === params.value)?.name || params.value,
        filter: true,
    },
    { 
      field: 'title', 
      headerName: 'Case Title', 
      width: 250, 
      checkboxSelection: true, 
      headerCheckboxSelection: true,
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
        width: 90,
        editable: false,
        cellRenderer: (params: any) => {
            if (!params.value) return null;
            return <div className="flex items-center gap-1 text-red-500 font-bold"><AlertCircle size={14} /> {params.value}</div>;
        }
    },
    { field: 'precondition', headerName: 'Precondition', width: 200 },
    { 
        field: 'steps', 
        headerName: 'Test Steps', 
        width: 350, 
        autoHeight: true, 
        wrapText: true, 
        cellEditor: 'agLargeTextCellEditor',
        cellEditorParams: {
            cols: 50,
            rows: 6
        }
    },
    { field: 'expected_result', headerName: 'Expected Result', width: 250 },
    { field: 'test_data', headerName: 'Test Data', width: 150 },
  ], [scenarios]);

  const defaultColDef = useMemo<ColDef>(() => ({
    resizable: true,
    editable: true,
    sortable: true,
    filter: true,
    suppressHeaderMenuButton: true,
    minWidth: 100,
    cellClass: 'border-r dark:border-gray-800', // Explicit cell borders
  }), []);

  const addRow = () => {
    if (scenarios.length === 0) {
        alert("Please create at least one Scenario first.");
        return;
    }
    const newRow: TestCase = {
      scenario_id: scenarios[0].scenario_id,
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
    .then(() => fetchTestCases());
  };

  const deleteSelected = () => {
    const selectedNodes = gridRef.current?.api.getSelectedNodes();
    if (!selectedNodes || selectedNodes.length === 0) return;
    if (!confirm(`Delete ${selectedNodes.length} test cases?`)) return;
    Promise.all(selectedNodes.map(node => fetch(`/api/test-cases?id=${node.data.test_case_id}`, { method: 'DELETE' })))
      .then(() => fetchTestCases());
  };

  const duplicateSelected = () => {
    const selectedNodes = gridRef.current?.api.getSelectedNodes();
    if (!selectedNodes || selectedNodes.length === 0) return;
    Promise.all(selectedNodes.map(node => fetch(`/api/test-cases`, { 
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test_case_id: node.data.test_case_id })
      })))
      .then(() => fetchTestCases());
  };

  const onCellValueChanged = (event: CellValueChangedEvent) => {
    if (event.data.test_case_id) {
      fetch('/api/test-cases', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event.data),
      });
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500 text-sm">Loading library data...</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-320px)] min-w-[1000px]">
      <div className="flex justify-between items-center px-6 py-3 border-b dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
        <div className="flex items-center gap-6">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                Cases <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 px-2 py-0.5 rounded-full text-[10px]">{rowData.length}</span>
            </h3>
            <div className="flex items-center gap-2 border-l dark:border-gray-800 pl-6">
                <ListChecks size={14} className="text-gray-400" />
                <Input 
                    placeholder="New Scenario..." 
                    value={newScenarioName}
                    onChange={e => setNewScenarioName(e.target.value)}
                    className="h-7 text-[10px] w-[140px]"
                />
                <Button size="sm" variant="outline" className="h-7 px-2" onClick={handleAddScenario}><Plus size={14} /></Button>
            </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={deleteSelected} variant="ghost" size="sm" className="h-8 text-red-600 hover:bg-red-50">
            <Trash2 size={16} className="mr-2" /> Delete
          </Button>
          <Button onClick={duplicateSelected} variant="ghost" size="sm" className="h-8 text-blue-600 hover:bg-blue-50">
            <Copy size={16} className="mr-2" /> Duplicate
          </Button>
          <Button onClick={addRow} size="sm" className="h-8">
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
            rowBorderColor: 'rgba(128, 128, 128, 0.1)',
          })}
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          onCellValueChanged={onCellValueChanged}
          rowSelection="multiple"
          animateRows={true}
          rowClassRules={{
            'bg-gray-50/30 dark:bg-gray-900/20': 'node.rowIndex % 2 !== 0', // Zebra striping
          }}
        />
      </div>
    </div>
  );
};
