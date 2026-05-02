"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  const [rowData, setRowData] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(() => {
    fetch('/api/logs')
      .then(res => res.json())
      .then(data => {
        setRowData(data);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const columnDefs = useMemo<ColDef<LogEntry>[]>(() => [
    { field: 'timestamp', headerName: 'Time', width: 180, sort: 'desc' },
    { field: 'user_name', headerName: 'User', width: 120 },
    { field: 'action', headerName: 'Action', width: 100 },
    { field: 'entity_type', headerName: 'Entity', width: 120 },
    { field: 'details', headerName: 'Details', flex: 1 },
  ], []);

  if (loading) return <div>Loading logs...</div>;

  return (
    <div className={GRID_CONTAINER_CLASS}>
      <div className="w-full h-[400px]">
        <AgGridReact
          theme={unifiedGridTheme}
          rowData={rowData}
          columnDefs={columnDefs}
        />
      </div>
    </div>
  );
};
