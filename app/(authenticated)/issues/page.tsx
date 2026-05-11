"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Button,
  IconButton,
  ManagementPage,
  Column,
  Combobox
} from "@/components/ui";
import { AlertTriangle, UserCheck, ShieldCheck, ExternalLink, LayoutPanelTop, Layers, Calendar, CheckCircle2 } from 'lucide-react';
import { ISSUE_STATUS_OPTIONS, ISSUE_STATUS } from '@/lib/constants';
import { IssueDetailDialog } from '@/components/dialogs/IssueDetailDialog';
import { Issue } from '@/types/app';

interface Project {
  project_id: string;
  name: string;
}

interface Module {
  module_id: string;
  name: string;
}

interface User {
  user_id: string;
  name: string;
}

interface CurrentUser {
  user_id: string;
  name: string;
  isLoggedIn: boolean;
}

export default function IssueManagementPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedDevId, setSelectedDevId] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Sorting
  const [sortBy, setSortBy] = useState<string>('updated_at');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);

  // Modal
  const [selectedIssue, setSelectedIssue] = useState<{ id: string, title: string } | null>(null);
  const [isIssuesDialogOpen, setIsIssuesDialogOpen] = useState(false);

  const fetchBaseData = useCallback(async () => {
    const [pRes, uRes, userRes] = await Promise.all([
      fetch('/api/projects?limit=1000'),
      fetch('/api/users?limit=1000'),
      fetch('/api/user')
    ]);
    const pData = await pRes.json();
    const uData = await uRes.json();
    const userData = await userRes.json();

    setProjects(pData.data || []);
    setUsers(uData.data || []);
    setCurrentUser(userData);
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

  const fetchIssues = useCallback(() => {
    setLoading(true);
    let url = `/api/issues?page=${page}&limit=${limit}`;
    if (selectedProjectId !== 'all') url += `&projectId=${selectedProjectId}`;
    if (selectedModuleId !== 'all') url += `&moduleId=${selectedModuleId}`;
    if (selectedStatus !== 'all') url += `&status=${selectedStatus}`;
    if (selectedDevId !== 'all') url += `&developerId=${selectedDevId}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    url += `&sortBy=${sortBy}&sortOrder=${sortOrder}`;

    fetch(url)
      .then(res => res.json())
      .then(res => {
        setIssues(res.data || []);
        setTotal(res.total || 0);
        setLoading(false);
      })
      .catch(() => {
        setIssues([]);
        setLoading(false);
      });
  }, [page, limit, selectedProjectId, selectedModuleId, selectedStatus, selectedDevId, sortBy, sortOrder, search]);

  useEffect(() => {
    queueMicrotask(() => {
      fetchBaseData();
    });
  }, [fetchBaseData]);

  useEffect(() => {
    queueMicrotask(() => {
      fetchIssues();
    });
  }, [fetchIssues]);

  const handleProjectChange = (pid: string) => {
    setSelectedProjectId(pid);
    setSelectedModuleId('all');
    setPage(1);
    fetchModules(pid);
  };

  const handleOpenIssue = (issue: Issue) => {
    setSelectedIssue({ id: issue.issue_id, title: issue.title });
    setIsIssuesDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    if (status === ISSUE_STATUS.CLOSED) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (status === ISSUE_STATUS.IN_PROGRESS) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  };

  const columns: Column<Issue>[] = useMemo(() => [
    {
      header: 'Issue Details',
      accessorKey: 'title',
      sortable: true,
      width: 400,
      minWidth: 300,
      cell: (issue) => (
        <div className="space-y-1.5 py-1">
          <div className="flex items-center gap-2">
            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded shrink-0 ${issue.severity.includes('High') ? 'bg-danger-theme text-white' :
              issue.severity.includes('Medium') ? 'bg-warning-theme text-white' : 'bg-primary-theme text-white'
              }`}>{issue.severity.split(' ')[0]}</span>
            <span className="font-bold text-sm text-text-theme-main line-clamp-1">{issue.title}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] text-text-theme-muted font-bold uppercase tracking-tighter shrink-0 italic">Reported by: {issue.reporter_name}</p>
            {issue.tags && issue.tags.length > 0 && (
              <div className="flex gap-1 overflow-hidden">
                {issue.tags.map(t => (
                  <span
                    key={t.tag_id}
                    className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full border shadow-sm text-white shrink-0"
                    style={{ backgroundColor: t.color, borderColor: t.color + '40' }}
                  >
                    {t.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {issue.test_case_titles && (
            <div className="flex items-center gap-1 mt-1 text-[10px] text-blue-500 font-medium bg-blue-50 dark:bg-blue-900/10 px-1.5 py-0.5 rounded-sm w-fit max-w-full">
              <Layers size={10} className="shrink-0" /> <span className="truncate">{issue.test_case_titles}</span>
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Location',
      accessorKey: 'project_name',
      sortable: true,
      width: 220,
      minWidth: 180,
      cell: (issue) => (
        <div className="space-y-1 py-1">
          <div className="text-[10px] font-bold text-primary-theme flex items-center gap-1.5 uppercase">
            <LayoutPanelTop size={14} className="shrink-0 opacity-70" />
            <span className="truncate">{issue.project_name || 'Global / Unlinked'}</span>
          </div>
          <div className="text-[10px] font-medium text-text-theme-muted flex items-center gap-1.5 uppercase">
            <Layers size={14} className="shrink-0 opacity-50" />
            <span className="truncate">{issue.module_name || 'No Module Context'}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Status',
      accessorKey: 'status',
      sortable: true,
      width: 120,
      minWidth: 100,
      cell: (issue) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getStatusColor(issue.status)}`}>
          {issue.status}
        </span>
      )
    },
    {
      header: 'SLA / Actual',
      accessorKey: 'sla_date',
      sortable: true,
      width: 180,
      minWidth: 150,
      cell: (issue) => (
        <div className="flex flex-col gap-1.5 text-[10px] font-medium uppercase text-gray-500">
          <div className="flex items-center gap-1">
            <Calendar size={12} className="text-text-theme-muted shrink-0" />
            <span className="w-8 text-text-theme-muted font-bold">SLA:</span>
            {issue.sla_date ? new Date(issue.sla_date).toLocaleDateString() : 'None'}
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle2 size={12} className="text-success-theme shrink-0" />
            <span className="w-8 text-text-theme-muted font-bold">ACT:</span>
            {issue.actual_date ? new Date(issue.actual_date).toLocaleDateString() : 'None'}
          </div>
        </div>
      )
    },
    {
      header: 'Assignment',
      accessorKey: 'developer_name',
      sortable: true,
      width: 150,
      minWidth: 120,
      cell: (issue) => (
        issue.status === ISSUE_STATUS.CLOSED ? (
          <div className="flex items-center gap-1.5 text-success-theme text-[10px] font-bold uppercase">
            <ShieldCheck size={14} className="shrink-0" /> {issue.developer_name || 'Unassigned'}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-text-theme-muted text-[10px] font-bold uppercase">
            <UserCheck size={14} className="shrink-0" /> {issue.developer_name || 'Unassigned'}
          </div>
        )
      )
    },
    {
      header: 'Last Update',
      accessorKey: 'updated_at',
      sortable: true,
      width: 120,
      minWidth: 100,
      cell: (issue) => <span className="text-[10px] text-text-theme-muted uppercase font-medium">{issue.updated_at ? new Date(issue.updated_at).toLocaleDateString() : 'Never'}</span>
    },
    {
      header: 'Action',
      className: 'text-right',
      width: 80,
      minWidth: 80,
      pin: 'right',
      cell: (issue) => (<IconButton
        icon={ExternalLink}
        size="sm"
        variant="ghost"
        className="text-blue-600"
        aria-label="View details and manage issue"
        title="View Details & Manage"
        onClick={(e) => {
          e.stopPropagation();
          handleOpenIssue(issue);
        }}
      />
      )
    }
  ], []);

  const filters = (
    <div className="flex flex-wrap items-center gap-4">
      <div className="min-w-50 flex-1 lg:flex-none">
        <Combobox
          options={[{ value: 'all', label: 'All Projects' }, ...projects.map(p => ({ value: p.project_id, label: p.name }))]}
          value={selectedProjectId}
          onChange={val => handleProjectChange(val as string)}
          placeholder="Project..."
        />
      </div>
      <div className="min-w-50 flex-1 lg:flex-none">
        <Combobox
          options={[{ value: 'all', label: 'All Modules' }, ...modules.map(m => ({ value: m.module_id, label: m.name }))]}
          value={selectedModuleId}
          onChange={val => { setSelectedModuleId(val as string); setPage(1); }}
          disabled={selectedProjectId === 'all'}
          placeholder="Module..."
        />
      </div>
      <div className="min-w-45 flex-1 lg:flex-none">
        <Combobox
          options={[{ value: 'all', label: 'All Statuses' }, ...ISSUE_STATUS_OPTIONS]}
          value={selectedStatus}
          onChange={val => { setSelectedStatus(val as string); setPage(1); }}
          placeholder="Status..."
        />
      </div>
      <div className="min-w-45 flex-1 lg:flex-none">
        <Combobox
          options={[{ value: 'all', label: 'All Developers' }, ...users.map(u => ({ value: u.user_id, label: u.name }))]}
          value={selectedDevId}
          onChange={val => { setSelectedDevId(val as string); setPage(1); }}
          placeholder="Developer..."
        />
      </div>
      <Button
        variant={selectedDevId === currentUser?.user_id ? 'primary' : 'outline'}
        size="sm"
        onClick={() => {
          const nextId = selectedDevId === currentUser?.user_id ? 'all' : (currentUser?.user_id || 'all');
          setSelectedDevId(nextId);
          setPage(1);
        }}
        className="h-10 px-4 whitespace-nowrap"
      >
        <UserCheck size={16} className="mr-2" /> My Issues
      </Button>
    </div>
  );

  return (
    <>
      <ManagementPage
        title="Issue Management"
        description="Triage, assign, and track bug resolution across all modules."
        icon={AlertTriangle}
        filters={filters}
        data={issues as object[]}
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
        onRowClick={(item) => handleOpenIssue(item as Issue)}
        searchPlaceholder="Search issue title or description..."
      />

      <IssueDetailDialog
        issueId={selectedIssue?.id || null}
        isOpen={isIssuesDialogOpen}
        onClose={() => setIsIssuesDialogOpen(false)}
        onRefresh={() => fetchIssues()}
      />
    </>
  );
}
