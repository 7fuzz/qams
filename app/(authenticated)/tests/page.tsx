"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Input, Button } from "@/components/ui";
import { Combobox } from "@/components/ui/Combobox";
import { TestManagementGrid } from "@/components/TestManagementGrid";
import { Search, Filter, X, FolderTree, Layers, ListChecks } from 'lucide-react';

interface Project {
  project_id: number;
  name: string;
}

interface Module {
  module_id: number;
  name: string;
}

interface Scenario {
  scenario_id: number;
  name: string;
}

export default function TestsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState<number | null>(null);
  
  const [quickSearch, setQuickSearch] = useState('');
  const [showFilters, setShowFilters] = useState(true);

  useEffect(() => {
    fetch('/api/projects').then(res => res.json()).then(setProjects);
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetch(`/api/modules?projectId=${selectedProjectId}`)
        .then(res => res.json())
        .then(data => {
          setModules(data);
          setSelectedModuleId(null);
          setScenarios([]);
          setSelectedScenarioId(null);
        });
    } else {
      setModules([]);
      setSelectedModuleId(null);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (selectedModuleId) {
      fetch(`/api/scenarios?moduleId=${selectedModuleId}`)
        .then(res => res.json())
        .then(data => {
          setScenarios(data);
          setSelectedScenarioId(null);
        });
    } else {
      setScenarios([]);
      setSelectedScenarioId(null);
    }
  }, [selectedModuleId]);

  const clearFilters = () => {
    setSelectedProjectId(null);
    setSelectedModuleId(null);
    setSelectedScenarioId(null);
    setQuickSearch('');
  };

  return (
    <div className="container mx-auto p-4 md:p-8 flex flex-col gap-6 max-w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-black dark:text-white">Global Test Library</h1>
          <p className="text-gray-500 text-sm italic uppercase tracking-wider font-medium">Explore and manage all test cases across the system.</p>
        </div>
        
        <div className="flex items-center gap-3">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <Input 
                    placeholder="Quick search library..." 
                    className="pl-10 w-full md:w-[300px] shadow-sm"
                    value={quickSearch}
                    onChange={e => setQuickSearch(e.target.value)}
                />
            </div>
            <Button 
                variant={showFilters ? "secondary" : "outline"} 
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
            >
                <Filter size={18} /> {showFilters ? "Hide Filters" : "Show Filters"}
            </Button>
            {(selectedProjectId || quickSearch) && (
                <Button variant="ghost" onClick={clearFilters} className="text-red-500">
                    <X size={18} className="mr-1" /> Reset
                </Button>
            )}
        </div>
      </div>

      {showFilters && (
        <Card className="bg-gray-50/50 dark:bg-gray-900/10 border-dashed animate-in fade-in slide-in-from-top-2 duration-200">
            <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                            <FolderTree size={12} /> Project
                        </label>
                        <Combobox 
                            options={projects.map(p => ({ value: p.project_id, label: p.name }))}
                            value={selectedProjectId || undefined}
                            onChange={(val) => setSelectedProjectId(Number(val))}
                            placeholder="All Projects"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1 text-gray-400">
                            <Layers size={12} /> Module
                        </label>
                        <Combobox 
                            options={modules.map(m => ({ value: m.module_id, label: m.name }))}
                            value={selectedModuleId || undefined}
                            onChange={(val) => setSelectedModuleId(Number(val))}
                            placeholder="All Modules"
                            className={!selectedProjectId ? "opacity-50" : ""}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                            <ListChecks size={12} /> Scenario
                        </label>
                        <Combobox 
                            options={scenarios.map(s => ({ value: s.scenario_id, label: s.name }))}
                            value={selectedScenarioId || undefined}
                            onChange={(val) => setSelectedScenarioId(Number(val))}
                            placeholder="All Scenarios"
                            className={!selectedModuleId ? "opacity-50" : ""}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
      )}

      <div className="overflow-x-auto pb-4">
        <TestManagementGrid 
            scenarioId={selectedScenarioId} 
            projectId={selectedProjectId}
            moduleId={selectedModuleId}
            quickSearch={quickSearch}
        />
      </div>
    </div>
  );
}
