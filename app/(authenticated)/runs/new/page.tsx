"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Label, Input, Button, Checkbox } from "@/components/ui";

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
  module_name: string;
}

export default function NewRunPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedScenarioIds, setSelectedScenarioIds] = useState<number[]>([]);
  const [runName, setRunName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/projects').then(res => res.json()).then(setProjects);
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      // Fetch all scenarios for this project's modules
      // For simplicity, let's assume we can fetch all scenarios by projectId in a new API or nested fetch
      // Let's implement a quick fetch for all scenarios in the project
      fetch(`/api/modules?projectId=${selectedProjectId}`)
        .then(res => res.json())
        .then(async (modules: Module[]) => {
          const allScenarios: Scenario[] = [];
          for (const mod of modules) {
            const res = await fetch(`/api/scenarios?moduleId=${mod.module_id}`);
            const data: Scenario[] = await res.json();
            allScenarios.push(...data.map((s) => ({ ...s, module_name: mod.name })));
          }
          setScenarios(allScenarios);
          setSelectedScenarioIds(allScenarios.map(s => s.scenario_id));
        });
    } else {
      setScenarios([]);
    }
  }, [selectedProjectId]);

  const toggleScenario = (id: number) => {
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
          <h1 className="text-3xl font-bold tracking-tight">Start New Test Run</h1>
          <p className="text-gray-500">Define the scope and name for this execution session.</p>
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
                className="w-full rounded-md border p-2 text-sm"
                value={selectedProjectId || ''}
                onChange={e => setSelectedProjectId(Number(e.target.value))}
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
              />
            </div>
          </CardContent>
        </Card>

        {scenarios.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Select Scenarios</CardTitle>
              <CardDescription>Pick the feature scenarios you want to include in this run.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {scenarios.map(s => (
                  <div key={s.scenario_id} className="flex items-center space-x-2 border p-3 rounded-md hover:bg-gray-50 transition-colors">
                    <Checkbox 
                      id={`s-${s.scenario_id}`} 
                      checked={selectedScenarioIds.includes(s.scenario_id)}
                      onCheckedChange={() => toggleScenario(s.scenario_id)}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label 
                        htmlFor={`s-${s.scenario_id}`}
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        {s.name}
                      </label>
                      <p className="text-xs text-gray-500">{s.module_name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="border-t pt-6">
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
