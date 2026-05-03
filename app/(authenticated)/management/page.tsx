"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Input,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Textarea,
  Combobox,
  AttachmentManager,
  Modal,
  Label
} from "@/components/ui";
import { Trash2, Plus, FolderTree, Layers, ListChecks, AlertCircle, User, Save, FileText, Settings2 } from 'lucide-react';

interface Project {
  project_id: string;
  name: string;
  description: string;
  version: string;
  owner_name: string;
  open_issues_count: number;
  created_at: string;
  updated_at: string;
}

interface Module {
  module_id: string;
  name: string;
  description: string;
  project_id: string;
  responsible_id: string;
  responsible_name: string;
}

interface Scenario {
  scenario_id: string;
  name: string;
  module_id: string;
}

interface User {
  user_id: string;
  name: string;
}

interface EditData {
    project_desc?: string;
}

export default function ManagementPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  const [newName, setNewName] = useState({ project: '', module: '', scenario: '' });
  const [editData, setEditData] = useState<EditData>({});

  const fetchProjects = useCallback(async () => {
    const res = await fetch('/api/projects');
    const data = await res.json();
    setProjects(data);
  }, []);

  const fetchUsers = useCallback(async () => {
    const res = await fetch('/api/users?limit=1000');
    const resData = await res.json();
    setUsers(resData.data || []);
  }, []);

  const fetchModules = useCallback(async (pid: string) => {
    const res = await fetch(`/api/modules?projectId=${pid}`);
    const data = await res.json();
    setModules(data);
  }, []);

  const fetchScenarios = useCallback(async (mid: string) => {
    const res = await fetch(`/api/scenarios?moduleId=${mid}`);
    const data = await res.json();
    setScenarios(data);
  }, []);

  useEffect(() => { 
    queueMicrotask(() => {
      fetchProjects(); 
      fetchUsers(); 
    });
  }, [fetchProjects, fetchUsers]);

  const handleProjectSelect = (projectId: string) => {
      setSelectedProjectId(projectId);
      fetchModules(projectId);
      const proj = projects.find(p => p.project_id === projectId);
      if (proj) {
          setEditData({ project_desc: proj.description });
      }
      setSelectedModuleId(null);
      setScenarios([]);
  };

  const handleModuleSelect = (moduleId: string) => {
      setSelectedModuleId(moduleId);
      fetchScenarios(moduleId);
  };

  const handleAdd = async (type: 'project' | 'module' | 'scenario') => {
    const name = newName[type];
    if (!name) return;

    const url = `/api/${type}s`;
    const body: { name: string; project_id?: string | null; module_id?: string | null } = { name };
    if (type === 'module') body.project_id = selectedProjectId;
    if (type === 'scenario') body.module_id = selectedModuleId;

    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    setNewName({ ...newName, [type]: '' });
    if (type === 'project') fetchProjects();
    if (type === 'module' && selectedProjectId) fetchModules(selectedProjectId);
    if (type === 'scenario' && selectedModuleId) fetchScenarios(selectedModuleId);
  };

  const handleSaveProjectDesc = async () => {
    const proj = projects.find(p => p.project_id === selectedProjectId);
    if (!proj) return;
    await fetch('/api/projects', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...proj, description: editData.project_desc }),
    });
    fetchProjects();
    setIsProjectModalOpen(false);
  };

  const handleUpdateModule = async (moduleId: string, data: Partial<Module>) => {
    const mod = modules.find(m => m.module_id === moduleId);
    if (!mod) return;
    await fetch('/api/modules', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...mod, ...data }),
    });
    if (selectedProjectId) fetchModules(selectedProjectId);
  };

  const handleDelete = async (type: 'project' | 'module' | 'scenario', id: string) => {
    if (!confirm(`Are you sure you want to delete this ${type}? This will delete all child items.`)) return;
    await fetch(`/api/${type}s?id=${id}`, { method: 'DELETE' });
    if (type === 'project') {
      fetchProjects();
      if (selectedProjectId === id) {
          setSelectedProjectId(null);
          setModules([]);
          setSelectedModuleId(null);
          setScenarios([]);
      }
    }
    if (type === 'module') {
      if (selectedProjectId) fetchModules(selectedProjectId);
      if (selectedModuleId === id) {
          setSelectedModuleId(null);
          setScenarios([]);
      }
    }
    if (type === 'scenario') {
      if (selectedModuleId) fetchScenarios(selectedModuleId);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const userOptions = users.map(u => ({ value: u.user_id, label: u.name }));

  const currentProject = projects.find(p => p.project_id === selectedProjectId);

  return (
    <div className="container mx-auto p-8 max-w-full space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-theme pb-6 text-text-theme-main">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">System Configuration</h1>
            <p className="text-text-theme-muted font-medium uppercase tracking-widest text-[10px]">Manage projects, define modules, and structure scenarios.</p>
          </div>

        <div className="flex gap-2">
          <Input
            placeholder="New Project Name"
            value={newName.project}
            onChange={e => setNewName({ ...newName, project: e.target.value })}
            className="max-w-[240px]"
          />
          <Button onClick={() => handleAdd('project')} className="shadow-lg shadow-primary-theme/20">
            <Plus size={18} className="mr-2" /> Add Project
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-text-theme-muted">
            <FolderTree size={18} />
            <h2 className="font-bold uppercase tracking-widest text-[10px]">Projects Overview</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Project Name</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Issues</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow
                  key={project.project_id}
                  onClick={() => handleProjectSelect(project.project_id)}
                  className={`cursor-pointer transition-colors ${selectedProjectId === project.project_id ? "bg-primary-theme/5 border-l-4 border-l-primary-theme" : ""}`}
                >
                  <TableCell className="font-semibold text-text-theme-main">{project.name}</TableCell>
                  <TableCell className="text-text-theme-muted">{project.owner_name}</TableCell>
                  <TableCell>
                    <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase gap-1 ${project.open_issues_count > 0 ? "bg-danger-theme/10 text-danger-theme border border-danger-theme/20" : "bg-success-theme/10 text-success-theme border border-success-theme/20"}`}>
                      <AlertCircle size={10} />
                      {project.open_issues_count} Open
                    </div>
                  </TableCell>
                  <TableCell className="text-text-theme-subtle text-[10px] uppercase font-bold">{formatDate(project.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-primary-theme"
                        onClick={(e) => { e.stopPropagation(); setSelectedProjectId(project.project_id); setEditData({ project_desc: project.description }); setIsProjectModalOpen(true); }}
                      >
                        <Settings2 size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-danger-theme"
                        onClick={(e) => { e.stopPropagation(); handleDelete('project', project.project_id); }}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-text-theme-muted">
                <Layers size={18} />
                <h2 className="font-bold uppercase tracking-widest text-[10px]">Modules</h2>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="New Module"
                  disabled={!selectedProjectId}
                  value={newName.module}
                  onChange={e => setNewName({ ...newName, module: e.target.value })}
                  className="h-8 text-xs w-[120px]"
                />
                <Button size="sm" className="h-8" disabled={!selectedProjectId} onClick={() => handleAdd('module')}><Plus size={14} /></Button>
              </div>
            </div>

            <div className="min-h-[400px] rounded-lg border border-border-theme bg-surface-muted/50 p-2 space-y-2">
              {!selectedProjectId ? (
                <div className="flex items-center justify-center h-full p-8 text-text-theme-subtle text-[10px] uppercase tracking-widest font-bold italic">Select a project</div>
              ) : (
                modules.map(m => (
                  <div
                    key={m.module_id}
                    onClick={() => handleModuleSelect(m.module_id)}
                    className={`p-4 rounded-xl border transition-all ${selectedModuleId === m.module_id
                        ? "bg-surface shadow-lg border-primary-theme/50"
                        : "bg-surface/50 hover:bg-surface border-transparent"
                      }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className="font-bold text-sm text-text-theme-main">{m.name}</span>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-danger-theme" onClick={(e) => { e.stopPropagation(); handleDelete('module', m.module_id); }}><Trash2 size={12} /></Button>
                    </div>
                    <div className="space-y-2" onClick={e => e.stopPropagation()}>
                      <Label className="text-[10px] text-text-theme-subtle font-bold uppercase tracking-widest">Responsible Developer</Label>
                      <Combobox
                        options={userOptions}
                        value={m.responsible_id}
                        onChange={(val) => handleUpdateModule(m.module_id, { responsible_id: val as string })}
                        placeholder="Assign Dev..."
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-text-theme-muted">
                <ListChecks size={18} />
                <h2 className="font-bold uppercase tracking-widest text-[10px]">Scenarios</h2>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="New Scenario"
                  disabled={!selectedModuleId}
                  value={newName.scenario}
                  onChange={e => setNewName({ ...newName, scenario: e.target.value })}
                  className="h-8 text-xs w-[120px]"
                />
                <Button size="sm" className="h-8" disabled={!selectedModuleId} onClick={() => handleAdd('scenario')}><Plus size={14} /></Button>
              </div>
            </div>

            <div className="min-h-[400px] rounded-lg border border-border-theme bg-surface-muted/50 p-2 space-y-2">
              {!selectedModuleId ? (
                <div className="flex items-center justify-center h-full p-8 text-text-theme-subtle text-[10px] uppercase tracking-widest font-bold italic">Select a module</div>
              ) : (
                scenarios.map(s => (
                  <div key={s.scenario_id} className="flex items-center justify-between p-3 rounded-md bg-surface border border-border-theme shadow-sm text-sm text-text-theme-main">
                    <span className="font-medium">{s.name}</span>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-danger-theme" onClick={() => handleDelete('scenario', s.scenario_id)}><Trash2 size={14} /></Button>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Project Details Modal */}
      <Modal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        title={`Project Details: ${currentProject?.name}`}
      >
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest">
              <FileText size={18} /> Context & Description
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">PROJECT DESCRIPTION</Label>
              <Textarea
                placeholder="Project objectives, environment details, or key information..."
                value={editData.project_desc || ''}
                onChange={e => setEditData({ ...editData, project_desc: e.target.value })}
                className="min-h-[150px] text-sm bg-white dark:bg-gray-950"
              />
              <Button onClick={handleSaveProjectDesc} className="w-full shadow-lg shadow-blue-500/20">
                <Save size={16} className="mr-2" /> Save Project Context
              </Button>
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
    </div>
  );
}
