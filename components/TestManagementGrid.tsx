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
import { Trash2, Plus } from 'lucide-react';
import { TEST_CASE_TYPE, TEST_CASE_TYPE_OPTIONS } from '@/lib/constants';
import { unifiedGridTheme, GRID_CONTAINER_CLASS } from '@/lib/theme';

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
}

export const TestManagementGrid = ({ scenarioId }: { scenarioId: number }) => {
  const gridRef = useRef<AgGridReact>(null);
  const [rowData, setRowData] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTestCases = () => {
    setLoading(true);
    fetch(`/api/test-cases?scenarioId=${scenarioId}`)
      .then(res => res.json())
      .then(data => {
        setRowData(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTestCases();
  }, [scenarioId]);

  const columnDefs = useMemo<ColDef[]>(() => [
    { 
      field: 'title', 
      headerName: 'Case Title', 
      width: 250, 
      checkboxSelection: true, 
      headerCheckboxSelection: true,
      pinned: 'left'
    },
    { 
      field: 'type', 
      headerName: 'Type', 
      width: 130,
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
    { field: 'precondition', headerName: 'Precondition', width: 200 },
    { field: 'steps', headerName: 'Test Steps', width: 300, autoHeight: true, wrapText: true, cellEditor: 'agLargeTextCellEditor' },
    { field: 'test_data', headerName: 'Test Data', width: 150 },
    { field: 'expected_result', headerName: 'Expected Result', width: 250 },
  ], []);

  const defaultColDef = useMemo<ColDef>(() => ({
    resizable: true,
    editable: true,
    sortable: true,
    filter: true,
    suppressHeaderMenuButton: true,
  }), []);

  const addRow = () => {
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
    .then(savedRow => {
      setRowData([...rowData, savedRow]);
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

  if (loading) return <div className="p-8 text-center text-gray-500 text-sm">Loading test cases...</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-450px)]">
      <div className="flex justify-between items-center px-6 py-3 border-b dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Test Cases</h3>
        <div className="flex gap-2">
          <Button onClick={deleteSelected} variant="ghost" size="sm" className="h-8 text-red-600 hover:bg-red-50">
            <Trash2 size={16} className="mr-2" /> Delete
          </Button>
          <Button onClick={addRow} size="sm" className="h-8">
            <Plus size={16} className="mr-2" /> Add Case
          </Button>
        </div>
      </div>
      
      <div className={GRID_CONTAINER_CLASS}>
        <AgGridReact
          ref={gridRef}
          theme={unifiedGridTheme}
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
