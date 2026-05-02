"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { 
  ColDef, 
  AllCommunityModule,
  ModuleRegistry,
} from 'ag-grid-community';
import { unifiedGridTheme, GRID_CONTAINER_CLASS } from '@/lib/theme';

ModuleRegistry.registerModules([AllCommunityModule]);

interface LogEntry {
  timestamp: string;
  user_name: string;
  action: string;
  entity_type: string;
  details: string;
}

export const ActivityLog = () => {
  const gridRef = useRef<AgGridReact>(null);
  const [rowData, setRowData] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(() => {
    fetch('/api/logs')
      .then(res => res.json())
      .then((data: LogEntry[]) => {
        setRowData(data);
        setLoading(false);
      })
      .catch(() => {
          setRowData([]);
          setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    const handleResize = () => {
        gridRef.current?.api?.sizeColumnsToFit();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const columnDefs = useMemo<ColDef<LogEntry>[]>(() => [
    { field: 'timestamp', headerName: 'Time', width: 180, sort: 'desc' },
    { field: 'user_name', headerName: 'User', width: 120 },
    { field: 'action', headerName: 'Action', width: 100 },
    { field: 'entity_type', headerName: 'Entity', width: 120 },
    { field: 'details', headerName: 'Details', flex: 1 },
  ], []);

  if (loading) return <div className="p-4 text-center text-gray-500 uppercase tracking-widest text-[10px] font-bold animate-pulse">Retrieving System Logs...</div>;

  return (
    <div className={GRID_CONTAINER_CLASS}>
      <div className="w-full h-[400px]">
        <AgGridReact
          ref={gridRef}
          theme={unifiedGridTheme}
          rowData={rowData}
          columnDefs={columnDefs}
          onGridReady={(params) => params.api.sizeColumnsToFit()}
        />
      </div>
    </div>
  );
};
