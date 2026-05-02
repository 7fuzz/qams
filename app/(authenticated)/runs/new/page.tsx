"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Label, Input, Button, Checkbox } from "@/components/ui";

interface Project {
  project_id: string;
  name: string;
}

interface Module {
  module_id: string;
  name: string;
}

interface Scenario {
  scenario_id: string;
  name: string;
  module_name: string;
}

export default function NewRunPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedScenarioIds, setSelectedScenarioIds] = useState<string[]>([]);
  const [runName, setRunName] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchProjects = useCallback(() => {
      fetch('/api/projects').then(res => res.json()).then(setProjects);
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleProjectChange = async (pid: string) => {
    setSelectedProjectId(pid);
    if (pid) {
      const res = await fetch(`/api/modules?projectId=${pid}`);
      const modules: Module[] = await res.json();
      
      const allScenarios: Scenario[] = [];
      for (const mod of modules) {
        const sRes = await fetch(`/api/scenarios?moduleId=${mod.module_id}`);
        const data: Scenario[] = await sRes.json();
        allScenarios.push(...data.map((s) => ({ ...s, module_name: mod.name })));
      }
      setScenarios(allScenarios);
      setSelectedScenarioIds(allScenarios.map(s => s.scenario_id));
    } else {
      setScenarios([]);
      setSelectedScenarioIds([]);
    }
  };

  const toggleScenario = (id: string) => {
    setSelectedScenarioIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const startRun = async () => {
    if (!selectedProjectId || !runName || selectedScenarioIds.length === 0) return;
    setLoading(true);

    try {
      const res = await fetch('/api/test-runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: selectedProjectId,
          name: runName,
          scenario_ids: selectedScenarioIds
        }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/runs/${data.run_id}`);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-black dark:text-white">Start New Test Run</h1>
          <p className="text-gray-500 text-sm">Define the scope and name for this execution session.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Run Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="project">Project</Label>
              <select 
                id="project"
                className="w-full rounded-md border border-gray-300 dark:border-gray-800 bg-transparent p-2 text-sm text-black dark:text-white"
                value={selectedProjectId || ''}
                onChange={e => handleProjectChange(e.target.value)}
              >
                <option value="">Select a project...</option>
                {projects.map(p => <option key={p.project_id} value={p.project_id}>{p.name}</option>)}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="run-name">Run Name</Label>
              <Input 
                id="run-name" 
                placeholder="e.g., Regression Q1 2024" 
                value={runName}
                onChange={e => setRunName(e.target.value)}
                className="text-black dark:text-white bg-white dark:bg-gray-950"
              />
            </div>
          </CardContent>
        </Card>

        {scenarios.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-black dark:text-white">Select Scenarios</CardTitle>
              <CardDescription>Pick the feature scenarios you want to include in this run.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {scenarios.map(s => (
                  <div key={s.scenario_id} className="flex items-center space-x-2 border dark:border-gray-800 p-3 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                    <Checkbox 
                      id={`s-${s.scenario_id}`} 
                      checked={selectedScenarioIds.includes(s.scenario_id)}
                      onCheckedChange={() => toggleScenario(s.scenario_id)}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label 
                        htmlFor={`s-${s.scenario_id}`}
                        className="text-sm font-medium leading-none cursor-pointer text-black dark:text-white"
                      >
                        {s.name}
                      </label>
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest">{s.module_name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="border-t dark:border-gray-800 pt-6">
              <Button 
                className="w-full" 
                onClick={startRun}
                disabled={loading || !runName || selectedScenarioIds.length === 0}
              >
                {loading ? 'Initializing Run...' : 'Start Execution'}
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}
