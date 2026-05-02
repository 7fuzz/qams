"use client";

import React, { useState, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { 
  ColDef, 
  CellValueChangedEvent,
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz
} from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);
import { Button } from './ui/Button';

// AG Grid styles are now handled via the theme object in v33+

interface RowData {
  id: number;
  [key: string]: string | number | boolean | undefined;
}

export const SpreadsheetEditor = () => {
  const gridRef = useRef<AgGridReact>(null);
  const [rowData, setRowData] = useState<RowData[]>([
    { id: 1, A: 'Data 1', B: 100, C: true },
    { id: 2, A: 'Data 2', B: 200, C: false },
    { id: 3, A: 'Data 3', B: 300, C: true },
  ]);

  const [columnDefs, setColumnDefs] = useState<ColDef[]>([
    { field: 'id', headerName: 'ID', width: 70, editable: false },
    { field: 'A', headerName: 'Col A', editable: true, resizable: true },
    { field: 'B', headerName: 'Col B', editable: true, resizable: true },
    { field: 'C', headerName: 'Col C', editable: true, resizable: true, cellRenderer: (params: { value: boolean }) => params.value ? '✅' : '❌' },
  ]);

  const defaultColDef = useMemo<ColDef>(() => ({
    flex: 1,
    minWidth: 100,
    resizable: true,
    editable: true,
  }), []);

  const onGridReady = () => {
    // Grid is ready
  };

  const addRow = () => {
    const newRow = { id: rowData.length + 1 };
    setRowData([...rowData, newRow]);
  };

  const removeSelectedRows = () => {
    const selectedNodes = gridRef.current?.api.getSelectedNodes();
    if (!selectedNodes || selectedNodes.length === 0) {
      alert("Please select a row to remove");
      return;
    }
    const selectedData = selectedNodes.map(node => node.data);
    const newRowData = rowData.filter(row => !selectedData.includes(row));
    setRowData(newRowData);
  };

  const addColumn = () => {
    const newFieldName = `Col_${columnDefs.length}`;
    const newCol: ColDef = {
      field: newFieldName,
      headerName: `Col ${columnDefs.length}`,
      editable: true,
      resizable: true,
    };
    setColumnDefs([...columnDefs, newCol]);
  };

  const removeLastColumn = () => {
    if (columnDefs.length <= 1) return;
    setColumnDefs(columnDefs.slice(0, -1));
  };

  const onCellValueChanged = (event: CellValueChangedEvent) => {
    console.log('Data updated:', event.data);
  };

  return (
    <div className="flex flex-col gap-4 w-full h-[600px]">
      <div className="flex flex-wrap gap-2">
        <Button onClick={addRow} size="sm">Add Row</Button>
        <Button onClick={removeSelectedRows} variant="outline" size="sm">Remove Selected</Button>
        <Button onClick={addColumn} size="sm">Add Column</Button>
        <Button onClick={removeLastColumn} variant="outline" size="sm">Remove Last Column</Button>
      </div>
      
      <div className="w-full h-full">
        <AgGridReact
          ref={gridRef}
          theme={themeQuartz}
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          rowSelection="multiple"
          onGridReady={onGridReady}
          onCellValueChanged={onCellValueChanged}
          animateRows={true}
        />
      </div>
    </div>
  );
};
