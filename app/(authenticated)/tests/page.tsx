"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Combobox } from "@/components/ui/Combobox";
import { TestManagementGrid } from "@/components/TestManagementGrid";

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
  
  const [newProjectName, setNewProjectName] = useState('');
  const [newModuleName, setNewModuleName] = useState('');
  const [newScenarioName, setNewScenarioName] = useState('');

  const fetchProjects = () => fetch('/api/projects').then(res => res.json()).then(setProjects);
  const fetchModules = (id: number) => fetch(`/api/modules?projectId=${id}`).then(res => res.json()).then(setModules);
  const fetchScenarios = (id: number) => fetch(`/api/scenarios?moduleId=${id}`).then(res => res.json()).then(setScenarios);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetchModules(selectedProjectId);
      setSelectedModuleId(null);
      setScenarios([]);
      setSelectedScenarioId(null);
    } else {
      setModules([]);
      setSelectedModuleId(null);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (selectedModuleId) {
      fetchScenarios(selectedModuleId);
      setSelectedScenarioId(null);
    } else {
      setScenarios([]);
      setSelectedScenarioId(null);
    }
  }, [selectedModuleId]);

  const addItem = (type: 'PROJECT' | 'MODULE' | 'SCENARIO') => {
    let url = '';
    let name = '';
    let body: any = {};

    if (type === 'PROJECT') {
      url = '/api/projects';
      name = newProjectName;
      body = { name };
    } else if (type === 'MODULE') {
      url = '/api/modules';
      name = newModuleName;
      body = { name, project_id: selectedProjectId };
    } else {
      url = '/api/scenarios';
      name = newScenarioName;
      body = { name, module_id: selectedModuleId };
    }

    if (!name) return;

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    .then(res => res.json())
    .then((data) => {
      if (type === 'PROJECT') {
        setNewProjectName('');
        fetchProjects().then(() => setSelectedProjectId(data.project_id));
      } else if (type === 'MODULE') {
        setNewModuleName('');
        fetchModules(selectedProjectId!).then(() => setSelectedModuleId(data.module_id));
      } else {
        setNewScenarioName('');
        fetchScenarios(selectedModuleId!).then(() => setSelectedScenarioId(data.scenario_id));
      }
    });
  };

  return (
    <div className="container mx-auto p-4 md:p-8 flex flex-col gap-8 max-w-7xl">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Test Library</h1>
        <p className="text-gray-500 dark:text-gray-400">Manage your projects, modules, and test cases.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Project Column */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">Project</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Combobox 
              options={projects.map(p => ({ value: p.project_id, label: p.name }))}
              value={selectedProjectId || undefined}
              onChange={(val) => setSelectedProjectId(Number(val))}
              placeholder="Select Project..."
            />
            <div className="flex gap-2">
              <Input 
                placeholder="New Project" 
                value={newProjectName} 
                onChange={e => setNewProjectName(e.target.value)} 
                className="h-9 text-sm" 
              />
              <Button size="sm" onClick={() => addItem('PROJECT')} className="h-9">Add</Button>
            </div>
          </CardContent>
        </Card>

        {/* Module Column */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">Module</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Combobox 
              options={modules.map(m => ({ value: m.module_id, label: m.name }))}
              value={selectedModuleId || undefined}
              onChange={(val) => setSelectedModuleId(Number(val))}
              placeholder="Select Module..."
            />
            <div className="flex gap-2">
              <Input 
                placeholder="New Module" 
                value={newModuleName} 
                onChange={e => setNewModuleName(e.target.value)} 
                className="h-9 text-sm" 
              />
              <Button size="sm" onClick={() => addItem('MODULE')} disabled={!selectedProjectId} className="h-9">Add</Button>
            </div>
          </CardContent>
        </Card>

        {/* Scenario Column */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">Scenario</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Combobox 
              options={scenarios.map(s => ({ value: s.scenario_id, label: s.name }))}
              value={selectedScenarioId || undefined}
              onChange={(val) => setSelectedScenarioId(Number(val))}
              placeholder="Select Scenario..."
            />
            <div className="flex gap-2">
              <Input 
                placeholder="New Scenario" 
                value={newScenarioName} 
                onChange={e => setNewScenarioName(e.target.value)} 
                className="h-9 text-sm" 
              />
              <Button size="sm" onClick={() => addItem('SCENARIO')} disabled={!selectedModuleId} className="h-9">Add</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedScenarioId ? (
        <Card className="shadow-lg border-gray-200 dark:border-gray-800">
          <CardContent className="p-0">
            <TestManagementGrid scenarioId={selectedScenarioId} key={selectedScenarioId} />
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed flex flex-col items-center justify-center p-12 text-gray-400">
          <p>Please select a project, module, and scenario to view test cases.</p>
        </Card>
      )}
    </div>
  );
}
