"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Input, Button, ManagementTemplate, Combobox } from "@/components/ui";
import { TestManagementGrid } from "@/components/grids/TestManagementGrid";
import { Plus, FolderTree, Layers, ListChecks, ClipboardList } from 'lucide-react';
import { saveState, loadState } from '@/lib/persistence';

interface Project {
  project_id: string;
  name: string;
}

interface Module {
  module_id: string;
  name: string;
}

export default function TestsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  
  const [newModuleName, setNewModuleName] = useState('');
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const fetchProjects = useCallback(() => fetch('/api/projects?limit=1000').then(res => res.json()).then(data => {
    if (data && data.data && Array.isArray(data.data)) setProjects(data.data);
    else setProjects([]);
  }).catch(() => setProjects([])), []);
  
  const fetchModules = useCallback((id: string) => fetch(`/api/modules?projectId=${id}`).then(res => res.json()).then(data => {
    if (data && data.data && Array.isArray(data.data)) {
        setModules(data.data);
        return data.data;
    }
    setModules([]);
    return [];
  }).catch(() => {
    setModules([]);
    return [];
  }), []);

  // Use a ref to track if we're doing the initial load to avoid redundant saves
  const isInitialLoadRef = useRef(true);

  // Load persistent state on mount
  useEffect(() => {
    const savedProject = loadState<string>('test_project_id');
    const savedModule = loadState<string>('test_module_id');
    
    fetchProjects().then(() => {
        if (savedProject) {
            setSelectedProjectId(savedProject);
            fetchModules(savedProject).then((mods: Module[]) => {
                if (savedModule && mods && Array.isArray(mods) && mods.some(m => m.module_id === savedModule)) {
                    setSelectedModuleId(savedModule);
                }
                setIsInitialLoad(false);
                isInitialLoadRef.current = false;
            });
        } else {
            setIsInitialLoad(false);
            isInitialLoadRef.current = false;
        }
    });
  }, [fetchProjects, fetchModules]);

  const handleProjectChange = (id: string | null) => {
    if (isInitialLoadRef.current) return;
    
    setSelectedProjectId(id);
    if (id) {
      fetchModules(id);
      saveState('test_project_id', id);
    } else {
      setModules([]);
      saveState('test_project_id', null);
    }
    
    setSelectedModuleId(null);
    saveState('test_module_id', null);
  };

  const handleModuleChange = (id: string | null) => {
    if (isInitialLoadRef.current) return;
    
    setSelectedModuleId(id);
    if (id) {
      saveState('test_module_id', id);
    } else {
      saveState('test_module_id', null);
    }
  };

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

  if (isInitialLoad) return <div className="p-8 text-center text-text-theme-muted font-medium uppercase tracking-widest text-[10px] animate-pulse">Restoring session...</div>;

  const filters = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Project Selection */}
        <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-text-theme-muted flex items-center gap-1">
                <FolderTree size={12} /> 1. Select Project
            </Label>
            <Combobox 
              options={projects.map(p => ({ value: p.project_id, label: p.name }))}
              value={selectedProjectId || undefined}
              onChange={(val) => handleProjectChange(val ? String(val) : null)}
              placeholder="Select Project..."
            />
        </div>

        {/* Module Selection */}
        <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-text-theme-muted flex items-center gap-1">
                <Layers size={12} /> 2. Select Module
            </Label>
            <div className="flex gap-2">
                <div className="flex-1">
                    <Combobox 
                        options={modules.map(m => ({ value: m.module_id, label: m.name }))}
                        value={selectedModuleId || undefined}
                        onChange={(val) => handleModuleChange(val ? String(val) : null)}
                        placeholder="Select Module..."
                        className={!selectedProjectId ? "opacity-50 pointer-events-none" : ""}
                    />
                </div>
                {selectedProjectId && (
                    <div className="flex gap-1">
                        <Input 
                            placeholder="New Module..." 
                            value={newModuleName}
                            onChange={e => setNewModuleName(e.target.value)}
                            className="h-10 text-xs w-[120px]"
                        />
                        <Button className="h-10 px-3" onClick={handleAddModule}><Plus size={16} /></Button>
                    </div>
                )}
            </div>
        </div>
    </div>
  );

  return (
    <ManagementTemplate
        title="Test Library"
        description="Comprehensive repository of all test cases and scenarios."
        icon={ClipboardList}
        filters={filters}
    >
      {selectedModuleId ? (
        <Card className="shadow-2xl border-border-theme overflow-hidden bg-surface">
          <TestManagementGrid moduleId={selectedModuleId} key={selectedModuleId} />
        </Card>
      ) : (
        <Card className="border-dashed border-2 flex flex-col items-center justify-center p-16 text-text-theme-subtle bg-surface-muted/50 border-border-theme">
          <ListChecks size={48} className="mb-4 opacity-20" />
          <p className="text-sm font-medium italic">Please select a project and a module to view and manage test cases.</p>
        </Card>
      )}
    </ManagementTemplate>
  );
}

// Internal Label for simpler file
const Label = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
    <label className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}>
        {children}
    </label>
);
