"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Input, Button } from "@/components/ui";
import { Combobox } from "@/components/ui/Combobox";
import { TestManagementGrid } from "@/components/grids/TestManagementGrid";
import { Plus, FolderTree, Layers, ListChecks } from 'lucide-react';
import { saveState, loadState } from '@/lib/persistence';

interface Project {
  project_id: number;
  name: string;
}

interface Module {
  module_id: number;
  name: string;
}

export default function TestsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  
  const [newModuleName, setNewModuleName] = useState('');
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const fetchProjects = () => fetch('/api/projects').then(res => res.json()).then(setProjects);
  const fetchModules = (id: number) => fetch(`/api/modules?projectId=${id}`).then(res => res.json()).then(data => {
    setModules(data);
    return data;
  });

  // Load persistent state on mount
  useEffect(() => {
    const savedProject = loadState<number>('test_project_id');
    const savedModule = loadState<number>('test_module_id');
    
    fetchProjects().then(() => {
        if (savedProject) {
            setSelectedProjectId(savedProject);
            fetchModules(savedProject).then((mods: Module[]) => {
                if (savedModule && mods && Array.isArray(mods) && mods.some(m => m.module_id === savedModule)) {
                    setSelectedModuleId(savedModule);
                }
                setIsInitialLoad(false);
            });
        } else {
            setIsInitialLoad(false);
        }
    });
  }, []);

  useEffect(() => {
    if (isInitialLoad) return;
    if (selectedProjectId) {
      fetchModules(selectedProjectId);
      saveState('test_project_id', selectedProjectId);
    } else {
      setModules([]);
    }
    setSelectedModuleId(null);
    saveState('test_module_id', null);
  }, [selectedProjectId]);

  useEffect(() => {
    if (isInitialLoad) return;
    if (selectedModuleId) {
      saveState('test_module_id', selectedModuleId);
    }
  }, [selectedModuleId]);

  const handleAddModule = async () => {
    if (!newModuleName || !selectedProjectId) return;
    await fetch('/api/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newModuleName, project_id: selectedProjectId }),
    });
    setNewModuleName('');
    fetchModules(selectedProjectId);
  };

  if (isInitialLoad) return <div className="p-8 text-center text-gray-500">Restoring session...</div>;

  return (
    <div className="container mx-auto p-4 md:p-8 flex flex-col gap-6 max-w-full">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-black dark:text-white">Test Case Library</h1>
        <p className="text-gray-500 text-sm italic uppercase tracking-wider font-medium">Select a project and module to manage its test cases.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Project Selection */}
        <Card className={selectedProjectId ? "border-blue-500/30" : ""}>
          <CardHeader className="pb-3 flex flex-row items-center gap-2">
            <FolderTree size={16} className="text-gray-400" />
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-500">1. Select Project</CardTitle>
          </CardHeader>
          <CardContent>
            <Combobox 
              options={projects.map(p => ({ value: p.project_id, label: p.name }))}
              value={selectedProjectId || undefined}
              onChange={(val) => setSelectedProjectId(Number(val))}
              placeholder="Select Project..."
            />
          </CardContent>
        </Card>

        {/* Module Selection */}
        <Card className={selectedModuleId ? "border-blue-500/30" : ""}>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
                <Layers size={16} className="text-gray-400" />
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-500">2. Select Module</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Combobox 
              options={modules.map(m => ({ value: m.module_id, label: m.name }))}
              value={selectedModuleId || undefined}
              onChange={(val) => setSelectedModuleId(Number(val))}
              placeholder="Select Module..."
              className={!selectedProjectId ? "opacity-50 pointer-events-none" : ""}
            />
            {selectedProjectId && (
                <div className="flex gap-2">
                    <Input 
                        placeholder="Add New Module..." 
                        value={newModuleName}
                        onChange={e => setNewModuleName(e.target.value)}
                        className="h-8 text-xs"
                    />
                    <Button size="sm" className="h-8 px-2" onClick={handleAddModule}><Plus size={14} /></Button>
                </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedModuleId ? (
        <Card className="shadow-2xl border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-950">
          <TestManagementGrid moduleId={selectedModuleId} key={selectedModuleId} />
        </Card>
      ) : (
        <Card className="border-dashed border-2 flex flex-col items-center justify-center p-16 text-gray-400 bg-gray-50/50 dark:bg-gray-900/10">
          <ListChecks size={48} className="mb-4 opacity-20" />
          <p className="text-sm font-medium italic">Please select a project and a module to view and manage test cases.</p>
        </Card>
      )}
    </div>
  );
}
