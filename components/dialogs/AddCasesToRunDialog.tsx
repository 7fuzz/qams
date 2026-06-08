"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Checkbox, Label, Input, Combobox, Textarea } from '../ui';
import { TestCase, Module, Scenario } from '@/types/app';
import { Search, Loader2, List, Box, Layers, Plus } from 'lucide-react';
import { TEST_CASE_TYPE_OPTIONS, TEST_PRIORITY_OPTIONS, AUTOMATION_STATUS_OPTIONS } from '@/lib/constants';

interface AddCasesToRunDialogProps {
  runId: string;
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingTestCaseIds: string[];
}

type Tab = 'cases' | 'modules' | 'scenarios' | 'create';

export const AddCasesToRunDialog = ({ 
  runId, 
  projectId, 
  isOpen, 
  onClose, 
  onSuccess,
  existingTestCaseIds 
}: AddCasesToRunDialogProps) => {
  const [activeTab, setActiveTab] = useState<Tab>('cases');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Data for tabs
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  
  // Selection state
  const [search, setSearch] = useState('');
  const [selectedCaseIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedModuleIds, setSelectedModuleIds] = useState<Set<string>>(new Set());
  const [selectedScenarioIds, setSelectedScenarioIds] = useState<Set<string>>(new Set());

  // Quick Create state
  const [newCase, setNewCase] = useState<Partial<TestCase>>({
    type: 'Positive',
    priority: 'P2 - Medium',
    automation_status: 'Manual',
    title: '',
    steps: '',
    expected_result: ''
  });

  const fetchData = useCallback(async () => {
    if (!isOpen || !projectId) return;
    setLoading(true);
    try {
      if (activeTab === 'cases') {
        const res = await fetch(`/api/test-cases?projectId=${projectId}&limit=1000`);
        const data = await res.json();
        if (data.data) {
          const existingSet = new Set(existingTestCaseIds);
          setTestCases(data.data.filter((tc: TestCase) => !existingSet.has(tc.test_case_id)));
        }
      } else if (activeTab === 'modules') {
        const res = await fetch(`/api/modules?projectId=${projectId}&limit=1000`);
        const data = await res.json();
        setModules(data.data || []);
      } else if (activeTab === 'scenarios') {
        // Fetch all scenarios for project
        const res = await fetch(`/api/scenarios?projectId=${projectId}&limit=1000`);
        const data = await res.json();
        setScenarios(data.data || data || []); // Handle both paginated and non-paginated
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, [isOpen, projectId, existingTestCaseIds, activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (isOpen) {
        setSelectedIds(new Set());
        setSelectedModuleIds(new Set());
        setSelectedScenarioIds(new Set());
        setSearch('');
    }
  }, [isOpen]);

  const handleAdd = async () => {
    setSaving(true);
    try {
      let body: any = { runId };
      
      if (activeTab === 'cases') {
        if (selectedCaseIds.size === 0) return;
        body.testCaseIds = Array.from(selectedCaseIds);
      } else if (activeTab === 'modules') {
        if (selectedModuleIds.size === 0) return;
        body.moduleIds = Array.from(selectedModuleIds);
      } else if (activeTab === 'scenarios') {
        if (selectedScenarioIds.size === 0) return;
        body.scenarioIds = Array.from(selectedScenarioIds);
      } else if (activeTab === 'create') {
        if (!newCase.title || !newCase.scenario_id) return;
        // 1. Create the test case
        const createRes = await fetch('/api/test-cases', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newCase)
        });
        const created = await createRes.json();
        if (createRes.ok) {
            body.testCaseIds = [created.test_case_id];
        } else {
            throw new Error(created.error || 'Failed to create test case');
        }
      }

      const res = await fetch('/api/test-executions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      if (res.ok) {
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Failed to add:', error);
      alert(error instanceof Error ? error.message : 'Failed to add items');
    } finally {
      setSaving(false);
    }
  };

  const toggleSelect = (id: string, type: 'case' | 'module' | 'scenario') => {
    let set: Set<string>;
    let setter: React.Dispatch<React.SetStateAction<Set<string>>>;
    
    if (type === 'case') { set = selectedCaseIds; setter = setSelectedIds; }
    else if (type === 'module') { set = selectedModuleIds; setter = setSelectedModuleIds; }
    else { set = selectedScenarioIds; setter = setSelectedScenarioIds; }

    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  };

  const filteredCases = testCases.filter(tc => 
    tc.title.toLowerCase().includes(search.toLowerCase()) || 
    (tc.custom_id && tc.custom_id.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredModules = modules.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredScenarios = scenarios.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add to Test Run" maxWidth="max-w-4xl">
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex bg-surface-muted p-1 rounded-xl gap-1">
            {[
                { id: 'cases', label: 'Test Cases', icon: List },
                { id: 'modules', label: 'Modules', icon: Box },
                { id: 'scenarios', label: 'Scenarios', icon: Layers },
                { id: 'create', label: 'Quick Create', icon: Plus }
            ].map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as Tab)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${
                        activeTab === tab.id 
                        ? 'bg-surface text-primary-theme shadow-sm' 
                        : 'text-text-theme-muted hover:text-text-theme-main'
                    }`}
                >
                    <tab.icon size={14} /> {tab.label}
                </button>
            ))}
        </div>

        {activeTab !== 'create' && (
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-theme-muted" size={16} />
                <Input 
                    placeholder={`Search ${activeTab}...`} 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-10"
                />
            </div>
        )}

        <div className="min-h-[300px]">
            {activeTab === 'cases' && (
                <div className="border border-border-theme rounded-lg overflow-hidden bg-surface-muted max-h-[400px] overflow-y-auto">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-3">
                            <Loader2 className="animate-spin text-primary-theme" size={24} />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-text-theme-muted">Loading Matrix...</span>
                        </div>
                    ) : filteredCases.length === 0 ? (
                        <div className="py-20 text-center text-text-theme-muted italic text-sm">No available test cases.</div>
                    ) : (
                        <div className="divide-y divide-border-theme">
                            {filteredCases.map(tc => (
                                <div key={tc.test_case_id} className="flex items-center gap-3 p-3 hover:bg-surface-accent cursor-pointer" onClick={() => toggleSelect(tc.test_case_id, 'case')}>
                                    <Checkbox checked={selectedCaseIds.has(tc.test_case_id)} onCheckedChange={() => toggleSelect(tc.test_case_id, 'case')} />
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[10px] font-black text-primary-theme uppercase">{tc.custom_id || 'TC-NEW'}</span>
                                        <span className="text-sm font-bold truncate">{tc.title}</span>
                                        <span className="text-[9px] text-text-theme-muted uppercase">{tc.module_name} • {tc.scenario_name}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'modules' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2">
                    {modules.map(m => (
                        <div key={m.module_id} className={`p-4 border rounded-xl flex items-center gap-4 cursor-pointer transition-all ${selectedModuleIds.has(m.module_id) ? 'border-primary-theme bg-primary-theme/5 ring-1 ring-primary-theme' : 'border-border-theme bg-surface hover:border-primary-theme/50'}`} onClick={() => toggleSelect(m.module_id, 'module')}>
                            <Checkbox checked={selectedModuleIds.has(m.module_id)} onCheckedChange={() => toggleSelect(m.module_id, 'module')} />
                            <div className="flex flex-col gap-0.5">
                                <span className="text-sm font-bold">{m.name}</span>
                                <span className="text-[10px] text-text-theme-muted uppercase font-bold tracking-wider">Module Container</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'scenarios' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2">
                    {scenarios.map(s => (
                        <div key={s.scenario_id} className={`p-4 border rounded-xl flex items-center gap-4 cursor-pointer transition-all ${selectedScenarioIds.has(s.scenario_id) ? 'border-primary-theme bg-primary-theme/5 ring-1 ring-primary-theme' : 'border-border-theme bg-surface hover:border-primary-theme/50'}`} onClick={() => toggleSelect(s.scenario_id, 'scenario')}>
                            <Checkbox checked={selectedScenarioIds.has(s.scenario_id)} onCheckedChange={() => toggleSelect(s.scenario_id, 'scenario')} />
                            <div className="flex flex-col gap-0.5">
                                <span className="text-sm font-bold">{s.name}</span>
                                <span className="text-[10px] text-text-theme-muted uppercase font-bold tracking-wider">Test Scenario</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'create' && (
                <div className="space-y-4 bg-surface p-6 border border-border-theme rounded-xl shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Scenario</Label>
                            <Combobox 
                                options={scenarios.map(s => ({ value: s.scenario_id, label: s.name }))}
                                value={newCase.scenario_id}
                                onChange={val => setNewCase(prev => ({...prev, scenario_id: val as string}))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Type</Label>
                            <Combobox 
                                options={TEST_CASE_TYPE_OPTIONS}
                                value={newCase.type}
                                onChange={val => setNewCase(prev => ({...prev, type: val as string}))}
                            />
                        </div>
                        <div className="space-y-2 col-span-2">
                            <Label>Title</Label>
                            <Input value={newCase.title} onChange={e => setNewCase(prev => ({...prev, title: e.target.value}))} placeholder="Brief description of the test case" />
                        </div>
                        <div className="space-y-2">
                            <Label>Priority</Label>
                            <Combobox 
                                options={TEST_PRIORITY_OPTIONS}
                                value={newCase.priority}
                                onChange={val => setNewCase(prev => ({...prev, priority: val as string}))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Automation</Label>
                            <Combobox 
                                options={AUTOMATION_STATUS_OPTIONS}
                                value={newCase.automation_status}
                                onChange={val => setNewCase(prev => ({...prev, automation_status: val as string}))}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Steps</Label>
                        <Textarea value={newCase.steps} onChange={e => setNewCase(prev => ({...prev, steps: e.target.value}))} className="h-24" />
                    </div>
                    <div className="space-y-2">
                        <Label>Expected Result</Label>
                        <Textarea value={newCase.expected_result} onChange={e => setNewCase(prev => ({...prev, expected_result: e.target.value}))} className="h-24" />
                    </div>
                </div>
            )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border-theme">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleAdd} disabled={saving || (activeTab === 'cases' && selectedCaseIds.size === 0) || (activeTab === 'modules' && selectedModuleIds.size === 0) || (activeTab === 'scenarios' && selectedScenarioIds.size === 0) || (activeTab === 'create' && (!newCase.title || !newCase.scenario_id))} className="bg-primary-theme hover:bg-primary-theme/90 px-8">
            {saving ? 'Adding...' : activeTab === 'create' ? 'Create & Add' : `Add Selected`}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
