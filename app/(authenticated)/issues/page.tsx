"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, CardContent, Button, IconButton, Combobox, Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Pagination, Label
} from "@/components/ui";
import { AlertTriangle, UserCheck, ShieldCheck, ExternalLink, LayoutPanelTop, Layers, ChevronUp, ChevronDown, Calendar } from 'lucide-react';
import { ISSUE_STATUS_OPTIONS, ISSUE_STATUS } from '@/lib/constants';
import { IssuesListDialog } from '@/components/dialogs/IssuesListDialog';

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

interface Issue {
  issue_id: string;
  test_case_id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  reporter_name: string;
  developer_id: string;
  developer_name: string;
  solver_name: string;
  module_name: string;
  project_name: string;
  estimated_date: string;
  updated_at: string;
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

  // Sorting
  const [sortBy, setSortBy] = useState<string>('updated_at');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Modal
  const [selectedTestCase, setSelectedTestCase] = useState<{ id: string, title: string } | null>(null);
  const [isIssuesDialogOpen, setIsIssuesDialogOpen] = useState(false);

  const fetchBaseData = useCallback(async () => {
    const [pRes, uRes, userRes] = await Promise.all([
      fetch('/api/projects'),
      fetch('/api/users?limit=1000'),
      fetch('/api/user')
    ]);
    const pData = await pRes.json();
    const uData = await uRes.json();
    const userData = await userRes.json();

    setProjects(pData);
    setUsers(uData.data || []);
    setCurrentUser(userData);
  }, []);

  const fetchModules = useCallback((pid: string) => {
    if (pid === 'all') {
      setModules([]);
      return;
    }
    fetch(`/api/modules?projectId=${pid}`).then(res => res.json()).then(setModules);
  }, []);

  const fetchIssues = useCallback(() => {
    setLoading(true);
    let url = `/api/issues?page=${page}&limit=${limit}`;
    if (selectedProjectId !== 'all') url += `&projectId=${selectedProjectId}`;
    if (selectedModuleId !== 'all') url += `&moduleId=${selectedModuleId}`;
    if (selectedStatus !== 'all') url += `&status=${selectedStatus}`;
    if (selectedDevId !== 'all') url += `&developerId=${selectedDevId}`;
    url += `&sortBy=${sortBy}&sortOrder=${sortOrder}`;

    fetch(url)
      .then(res => res.json())
      .then(res => {
        setIssues(res.data || []);
        setTotal(res.total || 0);
        setTotalPages(res.totalPages || 1);
        setLoading(false);
      })
      .catch(() => {
        setIssues([]);
        setLoading(false);
      });
  }, [page, limit, selectedProjectId, selectedModuleId, selectedStatus, selectedDevId, sortBy, sortOrder]);

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
    setSelectedTestCase({ id: issue.test_case_id, title: issue.title });
    setIsIssuesDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    if (status === ISSUE_STATUS.CLOSED) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (status === ISSUE_STATUS.IN_PROGRESS) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(field);
      setSortOrder('ASC');
    }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return null;
    return sortOrder === 'ASC' ? <ChevronUp size={14} className="ml-1 inline" /> : <ChevronDown size={14} className="ml-1 inline" />;
  };

  return (
    <div className="container mx-auto p-4 md:p-8 flex flex-col gap-8 max-w-full text-text-theme-main">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <AlertTriangle size={32} className="text-danger-theme" /> Issue Management
          </h1>
          <p className="text-text-theme-muted font-medium uppercase tracking-wider text-[10px]">
            Triage, assign, and track bug resolution across all modules.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={selectedDevId === currentUser?.user_id ? 'primary' : 'outline'}
            size="sm"
            onClick={() => {
              const nextId = selectedDevId === currentUser?.user_id ? 'all' : (currentUser?.user_id || 'all');
              setSelectedDevId(nextId);
              setPage(1);
            }}
          >
            <UserCheck size={16} className="mr-2" /> Assigned to Me
          </Button>
        </div>
      </div>

      <Card className="shadow-sm border dark:border-gray-800">
        <CardContent className="p-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-text-theme-muted uppercase flex items-center gap-1"><LayoutPanelTop size={10} /> Project</Label>
              <Combobox
                options={[{ value: 'all', label: 'All Projects' }, ...projects.map(p => ({ value: p.project_id, label: p.name }))]}
                value={selectedProjectId}
                onChange={val => handleProjectChange(val as string)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-text-theme-muted uppercase flex items-center gap-1"><Layers size={10} /> Module</Label>
              <Combobox
                options={[{ value: 'all', label: 'All Modules' }, ...modules.map(m => ({ value: m.module_id, label: m.name }))]}
                value={selectedModuleId}
                onChange={val => { setSelectedModuleId(val as string); setPage(1); }}
                disabled={selectedProjectId === 'all'}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-text-theme-muted uppercase flex items-center gap-1"><AlertTriangle size={10} /> Status</Label>
              <Combobox
                options={[{ value: 'all', label: 'All Statuses' }, ...ISSUE_STATUS_OPTIONS]}
                value={selectedStatus}
                onChange={val => { setSelectedStatus(val as string); setPage(1); }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-text-theme-muted uppercase flex items-center gap-1"><UserCheck size={10} /> Developer</Label>
              <Combobox
                options={[{ value: 'all', label: 'All Developers' }, ...users.map(u => ({ value: u.user_id, label: u.name }))]}
                value={selectedDevId}
                onChange={val => { setSelectedDevId(val as string); setPage(1); }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="w-full border border-border-theme rounded-lg overflow-hidden bg-surface shadow-sm">
        <Table>
          <TableHeader className="bg-surface-muted">
            <TableRow>
              <TableHead 
                className="w-[350px] cursor-pointer hover:bg-surface-accent transition-colors"
                onClick={() => handleSort('title')}
              >
                Issue Details <SortIcon field="title" />
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-surface-accent transition-colors"
                onClick={() => handleSort('project_name')}
              >
                Location <SortIcon field="project_name" />
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-surface-accent transition-colors"
                onClick={() => handleSort('status')}
              >
                Status <SortIcon field="status" />
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-surface-accent transition-colors"
                onClick={() => handleSort('estimated_date')}
              >
                ETA <SortIcon field="estimated_date" />
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-surface-accent transition-colors"
                onClick={() => handleSort('developer_name')}
              >
                Assignment <SortIcon field="developer_name" />
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-surface-accent transition-colors"
                onClick={() => handleSort('updated_at')}
              >
                Last Update <SortIcon field="updated_at" />
              </TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-20 text-text-theme-muted uppercase tracking-widest text-xs font-bold animate-pulse">Syncing Issue Matrix...</TableCell></TableRow>
            ) : issues.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-20 text-text-theme-muted italic">No issues found matching your filters.</TableCell></TableRow>
            ) : (
              issues.map(issue => (
                <TableRow key={issue.issue_id} className="hover:bg-surface-accent transition-colors">
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${issue.severity.includes('High') ? 'bg-danger-theme text-white' :
                          issue.severity.includes('Medium') ? 'bg-warning-theme text-white' : 'bg-primary-theme text-white'
                          }`}>{issue.severity.split(' ')[0]}</span>
                        <span className="font-bold text-sm text-text-theme-main line-clamp-1">{issue.title}</span>
                      </div>
                      <p className="text-xs text-text-theme-muted line-clamp-1 italic">Reported by: {issue.reporter_name}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <div className="text-[10px] font-bold text-primary-theme flex items-center gap-1 uppercase"><LayoutPanelTop size={14} /> {issue.project_name}</div>
                      <div className="text-[10px] font-medium text-text-theme-muted flex items-center gap-1 uppercase"><Layers size={14} /> {issue.module_name}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getStatusColor(issue.status)}`}>
                      {issue.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase text-gray-500">
                      <Calendar size={14} className="text-text-theme-muted" />
                      {issue.estimated_date ? new Date(issue.estimated_date).toLocaleDateString() : 'No ETA'}
                    </div>
                  </TableCell>
                  <TableCell>
                    {issue.status === ISSUE_STATUS.CLOSED ? (
                      <div className="flex items-center gap-1.5 text-success-theme text-[10px] font-bold uppercase">
                        <ShieldCheck size={14} /> {issue.solver_name}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-text-theme-muted text-[10px] font-bold uppercase">
                        <UserCheck size={14} /> {issue.developer_name || 'Unassigned'}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-[10px] text-text-theme-muted uppercase font-medium">
                    {new Date(issue.updated_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <IconButton
                      icon={ExternalLink}
                      size="sm"
                      variant="ghost"
                      className="text-blue-600"
                      aria-label="View details and manage issue"
                      title="View Details & Manage"
                      onClick={() => handleOpenIssue(issue)}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          pageSize={limit}
          totalItems={total}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setLimit(s); setPage(1); }}
        />
      </div>

      <IssuesListDialog
        testCaseId={selectedTestCase?.id || null}
        testCaseTitle={selectedTestCase?.title || ''}
        isOpen={isIssuesDialogOpen}
        onClose={() => setIsIssuesDialogOpen(false)}
        onRefresh={() => fetchIssues()}
      />
    </div>
  );
}
