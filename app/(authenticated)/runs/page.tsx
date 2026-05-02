"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Button, Pagination } from "@/components/ui";
import { AgGridReact } from 'ag-grid-react';
import { 
  ColDef, 
  AllCommunityModule,
  ModuleRegistry,
  ICellRendererParams,
} from 'ag-grid-community';
import { Play, Trash2, Plus, Info, LayoutPanelTop, User } from 'lucide-react';
import { unifiedGridTheme } from '@/lib/theme';
import { RunDetailDialog } from '@/components/dialogs/RunDetailDialog';

ModuleRegistry.registerModules([AllCommunityModule]);

interface TestRun {
    run_id: string;
    name: string;
    project_name: string;
    project_owner: string;
    status: string;
    total_cases: number;
    passed_count: number;
    tester_name: string;
    created_at: string;
}

export default function TestRunsPage() {
  const gridRef = useRef<AgGridReact>(null);
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState<TestRun | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const fetchRuns = useCallback(() => {
    setLoading(true);
    fetch(`/api/test-runs?page=${page}&limit=${limit}`)
      .then(res => res.json())
      .then(res => {
        if (res.data) {
            setRuns(res.data);
            setTotal(res.total || 0);
            setTotalPages(res.totalPages || 0);
        } else {
            setRuns([]);
            setTotal(0);
            setTotalPages(0);
        }
        setLoading(false);
      })
      .catch(() => {
        setRuns([]);
        setTotal(0);
        setTotalPages(0);
        setLoading(false);
      });
  }, [page, limit]);

  useEffect(() => {
    queueMicrotask(() => {
        fetchRuns();
    });
  }, [fetchRuns]);

  useEffect(() => {
    const handleResize = () => {
        gridRef.current?.api?.sizeColumnsToFit();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const deleteRun = useCallback((id: string) => {
    if (!confirm('Are you sure you want to delete this test run? All execution data will be lost.')) return;
    fetch(`/api/test-runs?id=${id}`, { method: 'DELETE' })
      .then(() => fetchRuns());
  }, [fetchRuns]);

  const columnDefs = useMemo<ColDef<TestRun>[]>(() => [
    { 
        field: 'name', 
        headerName: 'Run Name', 
        flex: 1.5, 
        filter: true,
        pinned: 'left',
        cellRenderer: (params: ICellRendererParams<TestRun>) => (
            <div className="font-bold text-blue-600 dark:text-blue-400">{params.value}</div>
        )
    },
    { 
        field: 'project_name', 
        headerName: 'Project', 
        width: 180,
        cellRenderer: (params: ICellRendererParams<TestRun>) => (
            <div className="flex items-center gap-2"><LayoutPanelTop size={14} className="text-gray-400" /> {params.value}</div>
        )
    },
    { 
        field: 'project_owner', 
        headerName: 'Owner', 
        width: 140,
        cellRenderer: (params: ICellRendererParams<TestRun>) => (
            <div className="flex items-center gap-2"><User size={14} className="text-gray-400" /> {params.value}</div>
        )
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 130,
      cellClassRules: {
        'text-blue-600 font-bold bg-blue-50 dark:bg-blue-900/10': 'x === "In Progress"',
        'text-green-600 font-bold bg-green-50 dark:bg-green-900/10': 'x === "Completed"',
        'text-gray-500 bg-gray-50 dark:bg-gray-900/10': 'x === "Draft"',
      }
    },
    {
        headerName: 'Progress',
        width: 120,
        valueGetter: (params) => {
            if (!params.data) return '';
            const total = params.data.total_cases || 0;
            const passed = params.data.passed_count || 0;
            return `${passed} / ${total} Passed`;
        }
    },
    { field: 'tester_name', headerName: 'Tester', width: 140 },
    { field: 'created_at', headerName: 'Date', width: 140, valueFormatter: (p) => p.value ? new Date(p.value).toLocaleDateString() : '' },
    { 
      headerName: 'Actions', 
      width: 140, 
      pinned: 'right',
      cellRenderer: (params: ICellRendererParams<TestRun>) => (
        <div className="flex gap-1 h-full items-center justify-center">
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-7 w-7 p-0 text-gray-500 hover:bg-gray-100" 
            title="View Summary"
            onClick={() => {
                if (params.data) {
                    setSelectedRun(params.data);
                    setIsDetailOpen(true);
                }
            }}
          >
            <Info size={14} />
          </Button>
          <Link href={params.data ? `/runs/${params.data.run_id}` : '#'}>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50" title="Execute">
              <Play size={14} fill="currentColor" />
            </Button>
          </Link>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-600 hover:bg-red-50" onClick={() => params.data && deleteRun(params.data.run_id)} title="Delete">
            <Trash2 size={14} />
          </Button>
        </div>
      )
    },
  ], [deleteRun]);

  if (loading && total === 0) return <div className="p-12 text-center text-gray-500 uppercase tracking-widest text-xs font-bold animate-pulse">Loading Test Matrix...</div>;

  return (
    <div className="container mx-auto p-4 md:p-8 flex flex-col gap-8 max-w-full">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-black dark:text-white">Test Executions</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Track and analyze testing progress across your organization.</p>
        </div>
        <Link href="/runs/new">
          <Button className="shadow-lg">
            <Plus size={18} className="mr-2" /> New Test Run
          </Button>
        </Link>
      </div>

      <div className="w-full border dark:border-gray-800 rounded-lg overflow-hidden bg-white dark:bg-gray-950 shadow-sm">
          <AgGridReact
            ref={gridRef}
            theme={unifiedGridTheme}
            rowData={runs}

            columnDefs={columnDefs}
            animateRows={true}
            domLayout="autoHeight"
          />
          <Pagination 
            currentPage={page}
            totalPages={totalPages}
            pageSize={limit}
            totalItems={total}
            onPageChange={setPage}
            onPageSizeChange={(s) => { setLimit(s); setPage(1); }}
          />
      </div>

      <RunDetailDialog 
        run={selectedRun}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />
    </div>
  );
}
