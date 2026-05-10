"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Button,
  IconButton,
  Input,
  Textarea,
  AttachmentManager,
  Modal,
  Label,
  ManagementPage,
  Column,
  Combobox,
} from "@/components/ui";
import { Trash2, Plus, FolderTree, AlertCircle, Save, FileText, Settings2, UserPlus, X } from 'lucide-react';

interface Project {
  project_id: string;
  name: string;
  description: string;
  version: string;
  lead_developer_name: string;
  lead_developer_id: string;
  open_issues_count: number;
  created_at: string;
  updated_at: string;
}

interface User {
  user_id: string;
  name: string;
  email: string;
}

interface EditData {
  project_desc?: string;
  project_name?: string;
  project_version?: string;
  lead_developer_id?: string;
}

export default function ProjectManagementPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [assignedUsers, setAssignedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination & Search
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [newName, setNewName] = useState({ project: '', project_version: '1.0.0', project_desc: '', lead_developer_id: '' });
  const [editData, setEditData] = useState<EditData>({});

  const fetchUsers = useCallback(async () => {
    const res = await fetch('/api/users?limit=1000');
    const data = await res.json();
    setUsers(data.data || []);
  }, []);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    let url = `/api/projects?page=${page}&limit=${limit}&sortBy=${sortBy}&sortOrder=${sortOrder}`;
    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }
    const res = await fetch(url);
    const data = await res.json();
    setProjects(data.data || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [page, limit, sortBy, sortOrder, search]);

  const fetchAssignedUsers = useCallback(async (pid: string) => {
    const res = await fetch(`/api/projects/assignments?projectId=${pid}`);
    const data = await res.json();
    setAssignedUsers(data);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      fetchUsers();
      fetchProjects();
    });
  }, [fetchUsers, fetchProjects]);

  const handleAddProject = async () => {
    if (!newName.project) return;
    await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newName.project,
        version: newName.project_version,
        description: newName.project_desc,
        lead_developer_id: newName.lead_developer_id
      }),
    });
    setNewName({ project: '', project_desc: '', project_version: '1.0.0', lead_developer_id: '' }); 
    setIsCreateModalOpen(false);
    fetchProjects();
  };

  const handleSaveProjectDetails = async () => {
    if (!selectedProjectId) return;
    await fetch('/api/projects', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: selectedProjectId,
        name: editData.project_name,
        version: editData.project_version,
        description: editData.project_desc,
        lead_developer_id: editData.lead_developer_id
      }),
    });
    fetchProjects();
    setIsProjectModalOpen(false);
  };

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Are you sure you want to delete this project? This will delete all child items.')) return;
    await fetch(`/api/projects?id=${id}`, { method: 'DELETE' });
    fetchProjects();
  }, [fetchProjects]);

  const handleAssignUser = async (userId: string) => {
    if (!selectedProjectId) return;
    const res = await fetch('/api/projects/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: selectedProjectId, user_id: userId }),
    });
    if (res.ok) fetchAssignedUsers(selectedProjectId);
  };

  const handleUnassignUser = async (userId: string) => {
    if (!selectedProjectId) return;
    const res = await fetch(`/api/projects/assignments?projectId=${selectedProjectId}&userId=${userId}`, {
      method: 'DELETE',
    });
    if (res.ok) fetchAssignedUsers(selectedProjectId);
  };

  const formatDate = useCallback((dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }, []);

  const currentProject = projects.find(p => p.project_id === selectedProjectId);
  const userOptions = useMemo(() => users.map(u => ({ value: u.user_id, label: u.name })), [users]);
  
  const columns = useMemo(() => [
    {
      header: 'Project Name',
      accessorKey: 'name',
      sortable: true,
      cell: (item: Project) => (
        <div className="flex flex-col">
          <span className="font-semibold text-text-theme-main">{item.name}</span>
          <span className="text-[10px] text-text-theme-subtle font-bold uppercase tracking-tighter">{item.version}</span>
        </div>
      )
    },
    {
      header: 'Lead Developer',
      accessorKey: 'lead_developer_name',
      sortable: true,
      cell: (item: Project) => <span className="text-text-theme-muted">{item.lead_developer_name}</span>
    },
    {
      header: 'Issues',
      cell: (item: Project) => (
        <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase gap-1 ${item.open_issues_count > 0 ? "bg-danger-theme/10 text-danger-theme border border-danger-theme/20" : "bg-success-theme/10 text-success-theme border border-success-theme/20"}`}>
          <AlertCircle size={10} />
          {item.open_issues_count} Open
        </div>
      )
    },
    {
      header: 'Created',
      accessorKey: 'created_at',
      sortable: true,
      cell: (item: Project) => <span className="text-text-theme-subtle text-[10px] uppercase font-bold">{formatDate(item.created_at)}</span>
    },
    {
      header: 'Actions',
      className: 'text-right',
      cell: (item: Project) => {
        return (
          <div className="flex gap-1 justify-end" onClick={e => e.stopPropagation()}>
            <IconButton
              icon={Settings2}
              size="sm"
              variant="ghost"
              className="text-primary-theme"
              aria-label="Edit project"
              onClick={() => {
                setSelectedProjectId(item.project_id);
                setEditData({
                  project_desc: item.description,
                  project_name: item.name,
                  project_version: item.version,
                  lead_developer_id: item.lead_developer_id
                });
                fetchAssignedUsers(item.project_id);
                setIsProjectModalOpen(true);
              }}
              title="Edit"
            />
            <IconButton
              icon={Trash2}
              size="sm"
              variant="ghost"
              className="text-danger-theme"
              aria-label="Delete project"
              onClick={() => handleDelete(item.project_id)}
              title="Delete"
            />
          </div>
        );
      }
    }
  ], [fetchAssignedUsers, formatDate, handleDelete]);

  return (
    <>
      <ManagementPage
        title="Project Management"
        description="Manage projects, define modules, and structure scenarios."
        icon={FolderTree}
        primaryAction={
          <Button onClick={() => setIsCreateModalOpen(true)} className="shadow-lg shadow-primary-theme/20">
            <Plus size={18} className="mr-2" /> Add Project
          </Button>
        }
        data={projects as unknown as Record<string, unknown>[]}
        columns={columns as unknown as Column<Record<string, unknown>>[]}
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
        searchPlaceholder="Search projects..."
      />

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add New Project"
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase">Project Name</Label>
                <Input
                  value={newName.project}
                  onChange={e => setNewName({ ...newName, project: e.target.value })}
                  placeholder="Project Alpha"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase">Lead Developer</Label>
                <Combobox
                  options={userOptions}
                  value={newName.lead_developer_id}
                  onChange={val => setNewName({ ...newName, lead_developer_id: val as string })}
                  placeholder="Select Lead..."
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase">Initial Version</Label>
              <Input
                value={newName.project_version}
                onChange={e => setNewName({ ...newName, project_version: e.target.value })}
                placeholder="1.0.0"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase">Description</Label>
              <Textarea
                value={newName.project_desc}
                onChange={e => setNewName({ ...newName, project_desc: e.target.value })}
                placeholder="Context about this project..."
                className="min-h-[100px]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddProject}>Create Project</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        title={`Edit Project: ${currentProject?.name}`}
      >
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary-theme font-bold text-xs uppercase tracking-widest">
              <FileText size={18} /> Context & Details
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-text-theme-subtle uppercase tracking-wider">PROJECT NAME</Label>
                <Input
                  value={editData.project_name || ''}
                  onChange={e => setEditData({ ...editData, project_name: e.target.value })}
                  className="bg-surface"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-text-theme-subtle uppercase tracking-wider">LEAD DEVELOPER</Label>
                <Combobox
                  options={userOptions}
                  value={editData.lead_developer_id}
                  onChange={val => setEditData({ ...editData, lead_developer_id: val as string })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-text-theme-subtle uppercase tracking-wider">VERSION</Label>
              <Input
                value={editData.project_version || ''}
                onChange={e => setEditData({ ...editData, project_version: e.target.value })}
                className="bg-surface"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-text-theme-subtle uppercase tracking-wider">PROJECT DESCRIPTION</Label>
              <Textarea
                placeholder="Project objectives, environment details, or key information..."
                value={editData.project_desc || ''}
                onChange={e => setEditData({ ...editData, project_desc: e.target.value })}
                className="min-h-[100px] text-sm bg-surface"
              />
              <Button onClick={handleSaveProjectDetails} className="w-full shadow-lg shadow-blue-500/20">
                <Save size={16} className="mr-2" /> Save Project Changes
              </Button>
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t border-border-theme">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary-theme font-bold text-xs uppercase tracking-widest">
                <UserPlus size={18} /> Team Assignments
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex gap-2">
                <Combobox 
                  options={userOptions.filter(u => !assignedUsers.some(au => au.user_id === u.value))}
                  placeholder="Assign new team member..."
                  onChange={val => handleAssignUser(val as string)}
                  value=""
                  className="flex-1"
                />
              </div>
              
              <div className="flex flex-wrap gap-2">
                {assignedUsers.map(user => (
                  <div key={user.user_id} className="flex items-center gap-2 px-3 py-1.5 bg-surface-muted rounded-full border border-border-theme text-xs font-medium">
                    <span>{user.name}</span>
                    <button onClick={() => handleUnassignUser(user.user_id)} className="text-text-theme-muted hover:text-danger-theme transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {assignedUsers.length === 0 && (
                  <span className="text-xs text-text-theme-muted italic">No team members assigned yet.</span>
                )}
              </div>
            </div>
          </div>

          <div className="pt-6 border-t dark:border-gray-800">
            <AttachmentManager entityId={selectedProjectId || ''} entityType="PROJECT" />
          </div>

          <div className="flex justify-end pt-4 border-t dark:border-gray-800">
            <Button variant="outline" onClick={() => setIsProjectModalOpen(false)}>Dismiss</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
