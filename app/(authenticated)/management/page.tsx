"use client";

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  Button, 
  Input, 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from "@/components/ui";
import { Trash2, Plus, FolderTree, Layers, ListChecks, AlertCircle, Calendar, Clock } from 'lucide-react';

interface Project {
  project_id: string;
  name: string;
  version: string;
  owner_name: string;
  open_issues_count: number;
  created_at: string;
  updated_at: string;
}

interface Module {
  module_id: string;
  name: string;
  project_id: string;
}

interface Scenario {
  scenario_id: string;
  name: string;
  module_id: string;
}

export default function ManagementPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  
  const [newName, setNewName] = useState({ project: '', module: '', scenario: '' });

  const fetchProjects = async () => {
    const res = await fetch('/api/projects');
    const data = await res.json();
    setProjects(data);
  };

  useEffect(() => { fetchProjects(); }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetch(`/api/modules?projectId=${selectedProjectId}`).then(res => res.json()).then(setModules);
    } else {
      setModules([]);
    }
    setSelectedModuleId(null);
    setScenarios([]);
  }, [selectedProjectId]);

  useEffect(() => {
    if (selectedModuleId) {
      fetch(`/api/scenarios?moduleId=${selectedModuleId}`).then(res => res.json()).then(setScenarios);
    } else {
      setScenarios([]);
    }
  }, [selectedModuleId]);

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
    if (type === 'module' && selectedProjectId) fetch(`/api/modules?projectId=${selectedProjectId}`).then(res => res.json()).then(setModules);
    if (type === 'scenario' && selectedModuleId) fetch(`/api/scenarios?moduleId=${selectedModuleId}`).then(res => res.json()).then(setScenarios);
  };

  const handleDelete = async (type: 'project' | 'module' | 'scenario', id: string) => {
    if (!confirm(`Are you sure you want to delete this ${type}? This will delete all child items.`)) return;
    await fetch(`/api/${type}s?id=${id}`, { method: 'DELETE' });
    if (type === 'project') {
      fetchProjects();
      if (selectedProjectId === id) setSelectedProjectId(null);
    }
    if (type === 'module') {
      fetch(`/api/modules?projectId=${selectedProjectId}`).then(res => res.json()).then(setModules);
      if (selectedModuleId === id) setSelectedModuleId(null);
    }
    if (type === 'scenario') {
      fetch(`/api/scenarios?moduleId=${selectedModuleId}`).then(res => res.json()).then(setScenarios);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
  };

  return (
    <div className="container mx-auto p-8 max-w-7xl space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b dark:border-gray-800 pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-black dark:text-white">System Configuration</h1>
          <p className="text-gray-500">Manage projects, define modules, and structure scenarios.</p>
        </div>
        <div className="flex gap-2">
            <Input 
                placeholder="New Project Name" 
                value={newName.project} 
                onChange={e => setNewName({...newName, project: e.target.value})}
                className="max-w-[240px]"
            />
            <Button onClick={() => handleAdd('project')}>
                <Plus size={18} className="mr-2" /> Add Project
            </Button>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-2 text-gray-500">
            <FolderTree size={18} />
            <h2 className="font-bold uppercase tracking-widest text-sm">Projects Overview</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Project Name</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Issues</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Last Update</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((project) => (
              <TableRow 
                key={project.project_id}
                onClick={() => setSelectedProjectId(project.project_id)}
                className={`cursor-pointer transition-colors ${selectedProjectId === project.project_id ? "bg-blue-50/50 dark:bg-blue-900/10 border-l-4 border-l-blue-500" : ""}`}
              >
                <TableCell className="font-semibold">{project.name}</TableCell>
                <TableCell className="text-gray-500">{project.owner_name}</TableCell>
                <TableCell>
                  <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium gap-1 ${project.open_issues_count > 0 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"}`}>
                    <AlertCircle size={12} />
                    {project.open_issues_count} Open
                  </div>
                </TableCell>
                <TableCell className="text-gray-500 text-xs">
                    <div className="flex items-center gap-1.5"><Calendar size={12} /> {formatDate(project.created_at)}</div>
                </TableCell>
                <TableCell className="text-gray-500 text-xs">
                    <div className="flex items-center gap-1.5"><Clock size={12} /> {formatDate(project.updated_at)}</div>
                </TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                    onClick={(e) => { e.stopPropagation(); handleDelete('project', project.project_id); }}
                  >
                    <Trash2 size={16} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-500">
                <Layers size={18} />
                <h2 className="font-bold uppercase tracking-widest text-sm">Modules</h2>
            </div>
            <div className="flex gap-2">
                <Input 
                    placeholder="New Module" 
                    disabled={!selectedProjectId}
                    value={newName.module} 
                    onChange={e => setNewName({...newName, module: e.target.value})}
                    className="h-8 text-xs w-[150px]"
                />
                <Button size="sm" className="h-8" disabled={!selectedProjectId} onClick={() => handleAdd('module')}><Plus size={14} /></Button>
            </div>
          </div>
          
          <div className="min-h-[200px] rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-900/10">
            {!selectedProjectId ? (
              <div className="flex items-center justify-center h-full p-8 text-gray-400 text-xs uppercase tracking-widest italic">Select a project above</div>
            ) : (
              <div className="p-2 space-y-1">
                {modules.map(m => (
                  <div 
                    key={m.module_id}
                    onClick={() => setSelectedModuleId(m.module_id)}
                    className={`flex items-center justify-between p-3 rounded-md cursor-pointer transition-all ${
                      selectedModuleId === m.module_id 
                      ? "bg-white dark:bg-gray-800 shadow-sm border dark:border-gray-700 ring-1 ring-blue-500/50" 
                      : "hover:bg-white/50 dark:hover:bg-gray-800/50 text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    <span className="font-medium text-sm">{m.name}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 w-7 p-0 text-red-500"
                      onClick={(e) => { e.stopPropagation(); handleDelete('module', m.module_id); }}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
                {modules.length === 0 && <div className="p-8 text-center text-gray-400 text-xs">No modules found</div>}
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-500">
                <ListChecks size={18} />
                <h2 className="font-bold uppercase tracking-widest text-sm">Scenarios</h2>
            </div>
            <div className="flex gap-2">
                <Input 
                    placeholder="New Scenario" 
                    disabled={!selectedModuleId}
                    value={newName.scenario} 
                    onChange={e => setNewName({...newName, scenario: e.target.value})}
                    className="h-8 text-xs w-[150px]"
                />
                <Button size="sm" className="h-8" disabled={!selectedModuleId} onClick={() => handleAdd('scenario')}><Plus size={14} /></Button>
            </div>
          </div>

          <div className="min-h-[200px] rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-900/10">
            {!selectedModuleId ? (
              <div className="flex items-center justify-center h-full p-8 text-gray-400 text-xs uppercase tracking-widest italic">Select a module</div>
            ) : (
              <div className="p-2 space-y-1">
                {scenarios.map(s => (
                  <div 
                    key={s.scenario_id}
                    className="flex items-center justify-between p-3 rounded-md bg-white dark:bg-gray-800 border dark:border-gray-700 shadow-sm text-sm"
                  >
                    <span className="font-medium">{s.name}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 w-7 p-0 text-red-500"
                      onClick={() => handleDelete('scenario', s.scenario_id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
                {scenarios.length === 0 && <div className="p-8 text-center text-gray-400 text-xs">No scenarios found</div>}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
