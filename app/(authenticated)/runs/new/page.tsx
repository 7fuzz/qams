"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Label,
  Input,
  Button,
  Checkbox,
  Combobox,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from "@/components/ui";
import { Search, CheckSquare, Square, Layers, LayoutPanelTop, Play, FileText, Calendar, CheckCircle2, UserCheck, Send } from 'lucide-react';
import { EXECUTION_TYPE_OPTIONS } from '@/lib/constants';

interface Project {
  project_id: string;
  name: string;
}

interface Module {
  module_id: string;
  name: string;
  sla_date: string | null;
  actual_date: string | null;
}

interface User {
  user_id: string;
  name: string;
}

export default function NewRunPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([]);
  const [selectedTesterIds, setSelectedTesterIds] = useState<string[]>([]);
  const [runName, setRunName] = useState('');
  const [executionType, setExecutionType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchInitialData = useCallback(async () => {
      const [pRes, uRes, meRes] = await Promise.all([
          fetch('/api/projects?limit=1000'),
          fetch('/api/users?limit=1000'),
          fetch('/api/user')
      ]);

      const pData = await pRes.json();
      const uData = await uRes.json();
      const meData = await meRes.json();

      setProjects(pData.data || []);
      setUsers(uData.data || []);
      setSelectedTesterIds([meData.user_id]);
  }, []);
  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleProjectChange = async (pid: string) => {
    setSelectedProjectId(pid);
    if (pid) {
      const res = await fetch(`/api/modules?projectId=${pid}&limit=1000`);
      const resData = await res.json();
      const projectModules: Module[] = resData.data || [];
      setModules(projectModules);
      setSelectedModuleIds(projectModules.map(m => m.module_id));
    } else {
      setModules([]);
      setSelectedModuleIds([]);
    }
  };

  const toggleModule = (id: string) => {
    setSelectedModuleIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const filteredModules = useMemo(() => {
    return modules.filter(m =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [modules, searchTerm]);

  const handleSelectAll = () => {
    setSelectedModuleIds(filteredModules.map(m => m.module_id));
  };

  const handleClearAll = () => {
    setSelectedModuleIds([]);
  };

  const createRun = async (isRequest: boolean = false) => {
    if (!selectedProjectId || !runName || selectedModuleIds.length === 0) return;
    setLoading(true);

    try {
      const res = await fetch('/api/test-runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: selectedProjectId,
          name: runName,
          type: executionType,
          module_ids: selectedModuleIds,
          tester_id: selectedTesterIds[0] || null, // Primary tester
          assigned_tester_ids: selectedTesterIds, // All assigned testers
          status: isRequest ? 'Draft' : 'In Progress'
        }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(isRequest ? '/runs' : `/runs/${data.run_id}`);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const userOptions = useMemo(() => users.map(u => ({ value: u.user_id, label: u.name })), [users]);

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-6xl text-text-theme-main">
      <div className="flex flex-col gap-8">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Play size={32} className="text-primary-theme" /> Start New Test Run
          </h1>
          <p className="text-text-theme-muted font-medium uppercase tracking-widest text-[10px]">Define scope, assign accountability, and select modules for this execution cycle.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Configuration */}
          <div className="space-y-6">
            <Card className="shadow-sm border-border-theme">
              <CardHeader className="bg-surface-muted/50 border-b border-border-theme">
                <CardTitle className="text-sm font-black uppercase tracking-widest">Run Configuration</CardTitle>
                <CardDescription className="text-[10px] uppercase font-bold text-text-theme-muted">Target project and identification</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-text-theme-subtle flex items-center gap-1">
                    <LayoutPanelTop size={12} /> Target Project
                  </Label>
                  <Combobox
                    options={projects.map(p => ({ value: p.project_id, label: p.name }))}
                    value={selectedProjectId || undefined}
                    onChange={val => handleProjectChange(val as string)}
                    placeholder="Select a project..."
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-text-theme-subtle flex items-center gap-1">
                    <FileText size={12} /> Run Identification
                  </Label>
                  <Input
                    placeholder="e.g., Regression Q1 2024"
                    value={runName}
                    onChange={e => setRunName(e.target.value)}
                    className="bg-surface border-border-theme h-10 font-bold"
                  />
                </div>

                <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-text-theme-subtle flex items-center gap-1">
                        <UserCheck size={12} /> Assign Tester(s)
                    </Label>
                    <Combobox 
                        options={userOptions}
                        value={selectedTesterIds}
                        onChange={val => setSelectedTesterIds(val as string[])}
                        placeholder="Select Tester(s)..."
                        multiSelect={true}
                    />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-text-theme-subtle flex items-center gap-1">
                    <Layers size={12} /> Execution Context
                  </Label>
                  <Combobox
                    options={EXECUTION_TYPE_OPTIONS}
                    value={executionType || undefined}
                    onChange={val => setExecutionType(val as string)}
                    placeholder="Select Type..."
                  />
                </div>
              </CardContent>
              <CardFooter className="bg-surface-muted/30 border-t border-border-theme pt-6 flex flex-col gap-3">
                <Button
                  className="w-full h-12 font-black uppercase tracking-widest shadow-lg shadow-primary-theme/20"
                  onClick={() => createRun(false)}
                  disabled={loading || !runName || selectedModuleIds.length === 0 || !selectedProjectId}
                >
                  {loading ? 'Initializing...' : <><Play size={16} className="mr-2" /> Start Run Now</>}
                </Button>

                <Button
                  variant="outline"
                  className="w-full h-11 font-bold uppercase tracking-widest border-2"
                  onClick={() => createRun(true)}
                  disabled={loading || !runName || selectedModuleIds.length === 0 || !selectedProjectId}
                >
                  <Send size={16} className="mr-2" /> Request Test Run
                </Button>
                <p className="text-[9px] text-center text-text-theme-muted font-bold uppercase">
                  &quot;Request&quot; saves as Draft for Tester pickup
                </p>
              </CardFooter>
            </Card>
          </div>

          {/* Right: Module Selection */}
          <div className="lg:col-span-2 space-y-6">
            {!selectedProjectId ? (
              <Card className="h-full border-dashed border-2 flex flex-col items-center justify-center p-20 text-text-theme-subtle bg-surface-muted/20">
                <LayoutPanelTop size={48} className="mb-4 opacity-10" />
                <p className="text-xs font-bold uppercase tracking-widest italic">Please select a project to load modules</p>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-theme-muted" size={16} />
                    <Input
                      placeholder="Search modules..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="pl-10 h-11 bg-surface"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleSelectAll} className="h-11 px-4 text-[10px] font-bold uppercase tracking-widest">
                      <CheckSquare size={14} className="mr-2" /> Select All
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleClearAll} className="h-11 px-4 text-[10px] font-bold uppercase tracking-widest">
                      <Square size={14} className="mr-2" /> Clear
                    </Button>
                  </div>
                </div>

                <div className="border border-border-theme rounded-xl overflow-hidden bg-surface shadow-sm">
                  <Table>
                    <TableHeader className="bg-surface-muted">
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest">Module Name</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest">SLA / Actual</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredModules.map(m => (
                        <TableRow
                          key={m.module_id}
                          className={`cursor-pointer transition-colors ${selectedModuleIds.includes(m.module_id) ? 'bg-primary-theme/[0.03]' : ''}`}
                          onClick={() => toggleModule(m.module_id)}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedModuleIds.includes(m.module_id)}
                              onCheckedChange={() => toggleModule(m.module_id)}
                              onClick={e => e.stopPropagation()}
                            />
                          </TableCell>
                          <TableCell className="font-bold text-sm text-text-theme-main">
                            <div className="flex items-center gap-2">
                              <Layers size={14} className="text-primary-theme opacity-70" />
                              {m.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-0.5 text-[10px] font-bold uppercase tracking-tighter">
                              <div className="flex items-center gap-1.5 text-text-theme-muted">
                                <Calendar size={10} /> SLA: {m.sla_date ? new Date(m.sla_date).toLocaleDateString() : 'TBD'}
                              </div>
                              {m.actual_date && (
                                <div className="flex items-center gap-1.5 text-success-theme">
                                  <CheckCircle2 size={10} /> ACT: {new Date(m.actual_date).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredModules.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="py-20 text-center text-text-theme-muted italic">
                            No modules found matching your search.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  <div className="bg-surface-muted/50 p-3 border-t border-border-theme flex justify-between items-center px-6">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-theme-muted">
                      Execution Scope
                    </span>
                    <span className="text-[10px] font-black uppercase text-primary-theme bg-primary-theme/10 px-3 py-1 rounded-full">
                      {selectedModuleIds.length} / {modules.length} Modules Selected
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
