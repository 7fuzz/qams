"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui";
import { Trash2, Edit2, Plus, FolderTree, Layers, ListChecks } from 'lucide-react';

interface Project {
  project_id: number;
  name: string;
}

interface Module {
  module_id: number;
  name: string;
  project_id: number;
}

interface Scenario {
  scenario_id: number;
  name: string;
  module_id: number;
}

export default function ManagementPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  
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
    const body: { name: string; project_id?: number | null; module_id?: number | null } = { name };
    if (type === 'module') body.project_id = selectedProjectId;
    if (type === 'scenario') body.module_id = selectedModuleId;

    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    setNewName({ ...newName, [type]: '' });
    // Refresh lists
    if (type === 'project') fetchProjects();
    if (type === 'module' && selectedProjectId) fetch(`/api/modules?projectId=${selectedProjectId}`).then(res => res.json()).then(setModules);
    if (type === 'scenario' && selectedModuleId) fetch(`/api/scenarios?moduleId=${selectedModuleId}`).then(res => res.json()).then(setScenarios);
  };

  const handleDelete = async (type: 'project' | 'module' | 'scenario', id: number) => {
    if (!confirm(`Are you sure you want to delete this ${type}? This will delete all child items.`)) return;
    await fetch(`/api/${type}s?id=${id}`, { method: 'DELETE' });
    if (type === 'project') {
      fetchData();
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

  return (
    <div className="container mx-auto p-8 max-w-6xl space-y-8">
      <div className="space-y-2 text-center md:text-left">
        <h1 className="text-3xl font-bold tracking-tight">System Configuration</h1>
        <p className="text-gray-500">Manage the structural hierarchy of your testing environment.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Projects Management */}
        <Card className={selectedProjectId ? "ring-2 ring-blue-500/20" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider text-gray-500">
              <FolderTree size={16} /> Projects
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input 
                placeholder="Project Name" 
                value={newName.project} 
                onChange={e => setNewName({...newName, project: e.target.value})}
                className="h-9"
              />
              <Button size="sm" onClick={() => handleAdd('project')}><Plus size={16} /></Button>
            </div>
            <div className="space-y-1">
              {projects.map(p => (
                <div 
                  key={p.project_id}
                  onClick={() => setSelectedProjectId(p.project_id)}
                  className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors text-sm ${
                    selectedProjectId === p.project_id 
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" 
                    : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
                  }`}
                >
                  <span className="font-medium truncate">{p.name}</span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete('project', p.project_id); }}
                    className={`p-1 rounded-md transition-colors ${selectedProjectId === p.project_id ? "hover:bg-blue-700" : "hover:bg-red-50 text-red-500"}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Modules Management */}
        <Card className={selectedModuleId ? "ring-2 ring-blue-500/20" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider text-gray-500">
              <Layers size={16} /> Modules
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input 
                placeholder="Module Name" 
                disabled={!selectedProjectId}
                value={newName.module} 
                onChange={e => setNewName({...newName, module: e.target.value})}
                className="h-9"
              />
              <Button size="sm" disabled={!selectedProjectId} onClick={() => handleAdd('module')}><Plus size={16} /></Button>
            </div>
            {!selectedProjectId ? (
              <p className="text-[10px] text-center text-gray-400 py-8 italic uppercase tracking-widest">Select a project</p>
            ) : (
              <div className="space-y-1">
                {modules.map(m => (
                  <div 
                    key={m.module_id}
                    onClick={() => setSelectedModuleId(m.module_id)}
                    className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors text-sm ${
                      selectedModuleId === m.module_id 
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" 
                      : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    <span className="font-medium truncate">{m.name}</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete('module', m.module_id); }}
                      className={`p-1 rounded-md transition-colors ${selectedModuleId === m.module_id ? "hover:bg-blue-700" : "hover:bg-red-50 text-red-500"}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scenarios Management */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider text-gray-500">
              <ListChecks size={16} /> Scenarios
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input 
                placeholder="Scenario Name" 
                disabled={!selectedModuleId}
                value={newName.scenario} 
                onChange={e => setNewName({...newName, scenario: e.target.value})}
                className="h-9"
              />
              <Button size="sm" disabled={!selectedModuleId} onClick={() => handleAdd('scenario')}><Plus size={16} /></Button>
            </div>
            {!selectedModuleId ? (
              <p className="text-[10px] text-center text-gray-400 py-8 italic uppercase tracking-widest">Select a module</p>
            ) : (
              <div className="space-y-1">
                {scenarios.map(s => (
                  <div 
                    key={s.scenario_id}
                    className="flex items-center justify-between p-2 rounded-md transition-colors text-sm hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
                  >
                    <span className="font-medium truncate">{s.name}</span>
                    <button 
                      onClick={() => handleDelete('scenario', s.scenario_id)}
                      className="p-1 rounded-md transition-colors hover:bg-red-50 text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
