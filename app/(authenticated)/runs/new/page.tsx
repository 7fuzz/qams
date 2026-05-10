"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Label, Input, Button, Checkbox, Combobox } from "@/components/ui";
import { AlertTriangle } from 'lucide-react';
import { EXECUTION_TYPE_OPTIONS } from '@/lib/constants';

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
  open_issues_count?: number;
}

export default function NewRunPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedScenarioIds, setSelectedScenarioIds] = useState<string[]>([]);
  const [runName, setRunName] = useState('');
  const [executionType, setExecutionType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchProjects = useCallback(() => {
      fetch('/api/projects?limit=1000')
        .then(res => res.json())
        .then(resData => setProjects(resData.data || []));
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleProjectChange = async (pid: string) => {
    setSelectedProjectId(pid);
    if (pid) {
      const res = await fetch(`/api/modules?projectId=${pid}&limit=1000`);
      const resData = await res.json();
      const modules: Module[] = resData.data || [];
      
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
          type: executionType,
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
          <h1 className="text-3xl font-bold tracking-tight text-text-theme-main">Start New Test Run</h1>
          <p className="text-text-theme-muted text-sm">Define the scope and name for this execution session.</p>
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
                className="w-full rounded-md border border-border-theme bg-transparent p-2 text-sm text-text-theme-main"
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
                className="bg-surface text-text-theme-main"
              />
            </div>
            <div className="grid gap-2">
              <Label>Execution Type</Label>
              <Combobox
                options={EXECUTION_TYPE_OPTIONS}
                value={executionType || undefined}
                onChange={val => setExecutionType(val as string)}
                placeholder="Select Type..."
              />
            </div>
          </CardContent>
        </Card>

        {scenarios.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-text-theme-main">Select Scenarios</CardTitle>
              <CardDescription>Pick the feature scenarios you want to include in this run.</CardDescription>
              <div className="grid gap-2">
                <Label htmlFor="search">Search Scenarios</Label>
                <Input 
                  id="search" 
                  placeholder="Type to search scenarios..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="bg-surface text-text-theme-main"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {scenarios.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map(s => (
                  <div key={s.scenario_id} className="flex items-center space-x-2 border border-border-theme p-3 rounded-md hover:bg-surface-accent transition-colors">
                    <Checkbox 
                      id={`s-${s.scenario_id}`} 
                      checked={selectedScenarioIds.includes(s.scenario_id)}
                      onCheckedChange={() => toggleScenario(s.scenario_id)}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label 
                        htmlFor={`s-${s.scenario_id}`}
                        className="text-sm font-medium leading-none cursor-pointer text-text-theme-main flex items-center gap-2"
                      >
                        {s.name}
                        {s.open_issues_count && s.open_issues_count > 0 && (
                          <span title={`${s.open_issues_count} open issue${s.open_issues_count > 1 ? 's' : ''}`}>
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                          </span>
                        )}
                      </label>
                      <p className="text-[10px] text-text-theme-muted uppercase tracking-widest">{s.module_name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="border-t border-border-theme pt-6">
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
