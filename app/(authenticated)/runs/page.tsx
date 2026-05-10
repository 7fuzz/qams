"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Button, IconButton, Pagination } from "@/components/ui";
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
import { TestRun } from '@/types/app';

ModuleRegistry.registerModules([AllCommunityModule]);

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
            <div className="flex flex-col gap-0.5 py-1">
                <div className="font-bold text-primary-theme leading-tight">{params.value}</div>
                {params.data?.type && <div className="text-[9px] font-black uppercase tracking-widest text-text-theme-subtle opacity-70 leading-none">{params.data.type}</div>}
            </div>
        )
    },
    { 
        field: 'project_name', 
        headerName: 'Project', 
        width: 180,
        cellRenderer: (params: ICellRendererParams<TestRun>) => (
            <div className="flex items-center gap-2"><LayoutPanelTop size={14} className="text-text-theme-subtle" /> {params.value}</div>
        )
    },
    { 
        field: 'project_owner', 
        headerName: 'Owner', 
        width: 140,
        cellRenderer: (params: ICellRendererParams<TestRun>) => (
            <div className="flex items-center gap-2"><User size={14} className="text-text-theme-subtle" /> {params.value}</div>
        )
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 130,
      cellClassRules: {
        'text-primary-theme font-bold bg-primary-theme/10': params => params.value === "In Progress",
        'text-success-theme font-bold bg-success-theme/10': params => params.value === "Completed",
        'text-text-theme-muted bg-surface-accent': params => params.value === "Draft",
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
          <IconButton 
            icon={Info} 
            size="sm" 
            variant="ghost" 
            className="text-text-theme-muted hover:bg-surface-accent" 
            title="View Summary"
            aria-label="View summary"
            onClick={() => {
                if (params.data) {
                    setSelectedRun(params.data);
                    setIsDetailOpen(true);
                }
            }}
          />
          <Link href={params.data ? `/runs/${params.data.run_id}` : '#'}>
            <IconButton icon={Play} size="sm" variant="ghost" className="text-primary-theme hover:bg-primary-theme/10" title="Execute" aria-label="Execute run" />
          </Link>
          <IconButton icon={Trash2} size="sm" variant="ghost" className="text-danger-theme hover:bg-danger-theme/10" aria-label="Delete run" title="Delete" onClick={() => params.data && deleteRun(params.data.run_id)} />
        </div>
      )
    },
  ], [deleteRun]);

  if (loading && total === 0) return <div className="p-12 text-center text-text-theme-muted uppercase tracking-widest text-xs font-bold animate-pulse">Loading Test Matrix...</div>;

  return (
    <div className="container mx-auto p-4 md:p-8 flex flex-col gap-8 max-w-full">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-text-theme-main">Test Executions</h1>
          <p className="text-text-theme-muted font-medium">Track and analyze testing progress across your organization.</p>
        </div>
        <Link href="/runs/new">
          <Button className="shadow-lg">
            <Plus size={18} className="mr-2" /> New Test Run
          </Button>
        </Link>
      </div>

      <div className="w-full border border-border-theme rounded-lg overflow-hidden bg-surface shadow-sm">
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
