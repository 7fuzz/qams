"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AgGridReact } from 'ag-grid-react';
import { 
  ColDef, 
  AllCommunityModule,
  ModuleRegistry,
} from 'ag-grid-community';
import { Play, Trash2, Plus } from 'lucide-react';
import { unifiedGridTheme, GRID_CONTAINER_CLASS } from '@/lib/theme';

ModuleRegistry.registerModules([AllCommunityModule]);

export default function TestRunsPage() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRuns = () => {
    setLoading(true);
    fetch('/api/test-runs')
      .then(res => res.json())
      .then(data => {
        setRuns(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const columnDefs = useMemo<ColDef[]>(() => [
    { field: 'name', headerName: 'Run Name', flex: 1, filter: true },
    { field: 'tester_name', headerName: 'Tester', width: 150 },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 130,
      cellClassRules: {
        'text-blue-600 font-bold': 'x === "In Progress"',
        'text-green-600 font-bold': 'x === "Completed"',
        'text-gray-500': 'x === "Draft"',
      }
    },
    { field: 'created_at', headerName: 'Started At', width: 180 },
    { 
      headerName: 'Actions', 
      width: 150, 
      pinned: 'right',
      cellRenderer: (params: any) => (
        <div className="flex gap-2 h-full items-center">
          <Link href={`/runs/${params.data.run_id}`}>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-blue-600">
              <Play size={16} fill="currentColor" />
            </Button>
          </Link>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600" onClick={() => deleteRun(params.data.run_id)}>
            <Trash2 size={16} />
          </Button>
        </div>
      )
    },
  ], []);

  const deleteRun = (id: number) => {
    if (!confirm('Are you sure you want to delete this test run? All execution data will be lost.')) return;
    fetch(`/api/test-runs?id=${id}`, { method: 'DELETE' })
      .then(() => fetchRuns());
  };

  return (
    <div className="container mx-auto p-4 md:p-8 flex flex-col gap-8 max-w-7xl">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Test Executions</h1>
          <p className="text-gray-500 dark:text-gray-400">View and manage ongoing or past test runs.</p>
        </div>
        <Link href="/runs/new">
          <Button className="shadow-lg">
            <Plus size={18} className="mr-2" /> New Test Run
          </Button>
        </Link>
      </div>

      <div className={GRID_CONTAINER_CLASS}>
        <div className="w-full h-[600px]">
          <AgGridReact
            theme={unifiedGridTheme}
            rowData={runs}
            columnDefs={columnDefs}
            animateRows={true}
          />
        </div>
      </div>
    </div>
  );
}
