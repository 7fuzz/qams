"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Button,
  IconButton,
  ManagementPage,
  Column,
  Combobox,
  Label
} from "@/components/ui";
import { Play, Trash2, Plus, Info, LayoutPanelTop, User, Filter, ClipboardList, Layers } from 'lucide-react';
import { RunDetailDialog } from '@/components/dialogs/RunDetailDialog';
import { TestRun } from '@/types/app';

interface Project {
  project_id: string;
  name: string;
}

interface Module {
  module_id: string;
  name: string;
}

export default function TestRunsPage() {
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState<TestRun | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Pagination & Search
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  // Filters
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('all');

  const fetchProjects = useCallback(() => {
    fetch('/api/projects?limit=1000')
      .then(res => res.json())
      .then(resData => setProjects(resData.data || []));
  }, []);

  const fetchModules = useCallback((pid: string) => {
    if (pid === 'all') {
      setModules([]);
      return;
    }
    fetch(`/api/modules?projectId=${pid}&limit=1000`)
      .then(res => res.json())
      .then(resData => setModules(resData.data || []));
  }, []);

  const fetchRuns = useCallback(() => {
    setLoading(true);
    let url = `/api/test-runs?page=${page}&limit=${limit}&sortBy=${sortBy}&sortOrder=${sortOrder}`;
    if (selectedProjectId !== 'all') {
      url += `&projectId=${selectedProjectId}`;
    }
    if (selectedModuleId !== 'all') {
      url += `&moduleId=${selectedModuleId}`;
    }
    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }

    fetch(url)
      .then(res => res.json())
      .then(res => {
        setRuns(res.data || []);
        setTotal(res.total || 0);
        setLoading(false);
      })
      .catch(() => {
        setRuns([]);
        setTotal(0);
        setLoading(false);
      });
  }, [page, limit, sortBy, sortOrder, selectedProjectId, selectedModuleId, search]);

  useEffect(() => {
    queueMicrotask(() => {
      fetchProjects();
      fetchRuns();
    });
  }, [fetchProjects, fetchRuns]);

  const deleteRun = useCallback((id: string) => {
    if (!confirm('Are you sure you want to delete this test run? All execution data will be lost.')) return;
    fetch(`/api/test-runs?id=${id}`, { method: 'DELETE' })
      .then(() => fetchRuns());
  }, [fetchRuns]);

  const columns: Column<TestRun>[] = useMemo(() => [
    {
      header: 'Run Name',
      accessorKey: 'name',
      sortable: true,
      width: 250,
      minWidth: 150,
      cell: (item) => (
        <div className="flex flex-col gap-0.5 py-1">
          <div className="font-bold text-primary-theme leading-tight">{item.name}</div>
          {item.type && <div className="text-[9px] font-black uppercase tracking-widest text-text-theme-subtle opacity-70 leading-none">{item.type}</div>}
        </div>
      )
    },
    {
      header: 'Project',
      accessorKey: 'project_name',
      sortable: true,
      width: 200,
      minWidth: 120,
      cell: (item) => (
        <div className="flex items-center gap-2 text-xs font-bold text-text-theme-muted uppercase tracking-tight">
          <LayoutPanelTop size={14} className="text-text-theme-subtle" />
          {item.project_name}
        </div>
      )
    },
    {
      header: 'Status',
      accessorKey: 'status',
      sortable: true,
      width: 120,
      minWidth: 100,
      cell: (item) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${item.status === 'Completed' ? 'bg-success-theme/10 text-success-theme' :
            item.status === 'In Progress' ? 'bg-primary-theme/10 text-primary-theme' :
              'bg-surface-accent text-text-theme-muted'
          }`}>
          {item.status}
        </span>
      )
    },
    {
      header: 'Progress',
      width: 150,
      minWidth: 120,
      cell: (item) => {
        const total = item.total_cases || 0;
        const passed = item.passed_count || 0;
        const percent = total > 0 ? Math.round((passed / total) * 100) : 0;
        return (
          <div className="flex flex-col gap-1.5 min-w-25">
            <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-tighter">
              <span className="text-text-theme-muted">{passed} / {total} Passed</span>
              <span className="text-primary-theme">{percent}%</span>
            </div>
            <div className="w-full bg-surface-muted h-1 rounded-full overflow-hidden">
              <div className="bg-primary-theme h-full transition-all duration-500" style={{ width: `${percent}%` }} />
            </div>
          </div>
        );
      }
    },
    {
      header: 'Testers',
      accessorKey: 'assigned_tester_names',
      width: 200,
      minWidth: 150,
      cell: (item) => (
        <div className="flex flex-wrap gap-1 max-w-50">
          {item.assigned_tester_names && item.assigned_tester_names.length > 0 ? (
            item.assigned_tester_names.map(name => (
              <div key={name} className="flex items-center gap-1 text-[9px] font-bold text-primary-theme bg-primary-theme/5 px-1.5 py-0.5 rounded-full border border-primary-theme/10 uppercase">
                <User size={8} /> {name}
              </div>
            ))
          ) : (
            <span className="text-[10px] text-text-theme-muted italic font-bold">Unassigned</span>
          )}
        </div>
      )
    },
    {
      header: 'Requested By',
      accessorKey: 'requested_by_name',
      sortable: true,
      width: 150,
      minWidth: 120,
      cell: (item) => (
        <div className="flex items-center gap-2 text-[10px] font-bold text-text-theme-subtle uppercase opacity-80 italic">
          {item.requested_by_name || 'System'}
        </div>
      )
    },
    {
      header: 'Date',
      accessorKey: 'created_at',
      sortable: true,
      width: 120,
      minWidth: 100,
      cell: (item) => <span className="text-[10px] font-bold text-text-theme-subtle uppercase">{new Date(item.created_at).toLocaleDateString()}</span>
    },
    {
      header: 'Actions',
      className: 'text-right',
      width: 120,
      minWidth: 120,
      pin: 'right',
      cell: (item) => (
        <div className="flex gap-1 justify-end" onClick={e => e.stopPropagation()}>
          <IconButton
            icon={Info}
            size="sm"
            variant="ghost"
            className="text-text-theme-muted hover:bg-surface-accent"
            title="View Summary"
            aria-label="View summary"
            onClick={() => {
              setSelectedRun(item);
              setIsDetailOpen(true);
            }}
          />
          <Link href={`/runs/${item.run_id}`}>
            <IconButton icon={Play} size="sm" variant="ghost" className="text-primary-theme hover:bg-primary-theme/10" title="Execute" aria-label="Execute run" />
          </Link>
          <IconButton icon={Trash2} size="sm" variant="ghost" className="text-danger-theme hover:bg-danger-theme/10" aria-label="Delete run" title="Delete" onClick={() => deleteRun(item.run_id)} />
        </div>
      )
    },
  ], [deleteRun]);

  const filters = (
    <div className="flex flex-wrap items-center gap-6">
      <div className="flex items-center gap-2 min-w-60">
        <Filter size={16} className="text-text-theme-muted" />
        <Label className="text-[10px] font-black uppercase tracking-widest text-text-theme-subtle mr-2 whitespace-nowrap">Project</Label>
        <div className="flex-1">
          <Combobox
            options={[{ value: 'all', label: 'All Projects' }, ...projects.map(p => ({ value: p.project_id, label: p.name }))]}
            value={selectedProjectId}
            onChange={val => {
              setSelectedProjectId(val as string);
              setSelectedModuleId('all');
              fetchModules(val as string);
              setPage(1);
            }}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 min-w-60">
        <Layers size={16} className="text-text-theme-muted" />
        <Label className="text-[10px] font-black uppercase tracking-widest text-text-theme-subtle mr-2 whitespace-nowrap">Module</Label>
        <div className="flex-1">
          <Combobox
            options={[{ value: 'all', label: 'All Modules' }, ...modules.map(m => ({ value: m.module_id, label: m.name }))]}
            value={selectedModuleId}
            onChange={val => { setSelectedModuleId(val as string); setPage(1); }}
            disabled={selectedProjectId === 'all'}
          />
        </div>
      </div>
    </div>
  );

  return (
    <>
      <ManagementPage
        title="Test Executions"
        description="Track and analyze testing progress across your organization."
        icon={ClipboardList}
        primaryAction={
          <Link href="/runs/new">
            <Button className="shadow-lg shadow-primary-theme/20">
              <Plus size={18} className="mr-2" /> New Test Run
            </Button>
          </Link>
        }
        filters={filters}
        data={runs as object[]}
        columns={columns as Column<object>[]}
        loading={loading}
        totalItems={total}
        currentPage={page}
        pageSize={limit}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setLimit(s); setPage(1); }}
        onSearch={(q) => { setSearch(q); setPage(1); }}
        onSort={(key, order) => { setSortBy(key); setSortOrder(order); }}
        sortBy={sortBy}
        sortOrder={sortOrder}
        searchPlaceholder="Search runs or projects..."
      />

      <RunDetailDialog
        run={selectedRun}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />
    </>
  );
}
