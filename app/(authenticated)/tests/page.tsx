"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Combobox } from "@/components/ui/Combobox";
import { TestManagementGrid } from "@/components/TestManagementGrid";
import { FolderTree, Layers, ListChecks } from 'lucide-react';

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

  return (
    <div className="container mx-auto p-4 md:p-8 flex flex-col gap-8 max-w-7xl">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-black dark:text-white">Test Case Library</h1>
        <p className="text-gray-500">Navigate the hierarchy to manage specific test cases.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Project Selection */}
        <Card className={selectedProjectId ? "border-blue-500/30" : ""}>
          <CardHeader className="pb-3 flex flex-row items-center gap-2">
            <FolderTree size={16} className="text-gray-400" />
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-500">Project</CardTitle>
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
          <CardHeader className="pb-3 flex flex-row items-center gap-2">
            <Layers size={16} className="text-gray-400" />
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-500">Module</CardTitle>
          </CardHeader>
          <CardContent>
            <Combobox 
              options={modules.map(m => ({ value: m.module_id, label: m.name }))}
              value={selectedModuleId || undefined}
              onChange={(val) => setSelectedModuleId(Number(val))}
              placeholder="Select Module..."
              className={!selectedProjectId ? "opacity-50 cursor-not-allowed" : ""}
            />
          </CardContent>
        </Card>

        {/* Scenario Selection */}
        <Card className={selectedScenarioId ? "border-blue-500/30" : ""}>
          <CardHeader className="pb-3 flex flex-row items-center gap-2">
            <ListChecks size={16} className="text-gray-400" />
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-500">Scenario</CardTitle>
          </CardHeader>
          <CardContent>
            <Combobox 
              options={scenarios.map(s => ({ value: s.scenario_id, label: s.name }))}
              value={selectedScenarioId || undefined}
              onChange={(val) => setSelectedScenarioId(Number(val))}
              placeholder="Select Scenario..."
              className={!selectedModuleId ? "opacity-50 cursor-not-allowed" : ""}
            />
          </CardContent>
        </Card>
      </div>

      {selectedScenarioId ? (
        <Card className="shadow-xl border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-950">
          <TestManagementGrid scenarioId={selectedScenarioId} key={selectedScenarioId} />
        </Card>
      ) : (
        <Card className="border-dashed border-2 flex flex-col items-center justify-center p-16 text-gray-400 bg-gray-50/50 dark:bg-gray-900/10">
          <ListChecks size={48} className="mb-4 opacity-20" />
          <p className="text-sm font-medium">Select a project, module, and scenario to manage test cases.</p>
        </Card>
      )}
    </div>
  );
}
