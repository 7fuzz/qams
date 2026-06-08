"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Checkbox, Label, Input } from '../ui';
import { TestCase } from '@/types/app';
import { Search, Loader2 } from 'lucide-react';

interface AddCasesToRunDialogProps {
  runId: string;
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingTestCaseIds: string[];
}

export const AddCasesToRunDialog = ({ 
  runId, 
  projectId, 
  isOpen, 
  onClose, 
  onSuccess,
  existingTestCaseIds 
}: AddCasesToRunDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchProjectCases = useCallback(async () => {
    if (!isOpen || !projectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/test-cases?projectId=${projectId}&limit=1000`);
      const data = await res.json();
      if (data.data) {
        // Filter out cases already in the run
        const existingSet = new Set(existingTestCaseIds);
        setTestCases(data.data.filter((tc: TestCase) => !existingSet.has(tc.test_case_id)));
      }
    } catch (error) {
      console.error('Failed to fetch project cases:', error);
    } finally {
      setLoading(false);
    }
  }, [isOpen, projectId, existingTestCaseIds]);

  useEffect(() => {
    fetchProjectCases();
  }, [fetchProjectCases]);

  useEffect(() => {
    if (isOpen) {
        setSelectedIds(new Set());
        setSearch('');
    }
  }, [isOpen]);

  const filteredCases = testCases.filter(tc => 
    tc.title.toLowerCase().includes(search.toLowerCase()) || 
    (tc.custom_id && tc.custom_id.toLowerCase().includes(search.toLowerCase()))
  );

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredCases.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCases.map(tc => tc.test_case_id)));
    }
  };

  const handleAdd = async () => {
    if (selectedIds.size === 0) return;
    setSaving(true);
    try {
      const res = await fetch('/api/test-executions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runId,
          testCaseIds: Array.from(selectedIds)
        }),
      });
      if (res.ok) {
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Failed to add test cases:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Test Cases to Run">
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-theme-muted" size={16} />
          <Input 
            placeholder="Search test cases by title or ID..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
                <Checkbox 
                    id="select-all" 
                    checked={filteredCases.length > 0 && selectedIds.size === filteredCases.length}
                    onCheckedChange={handleSelectAll}
                />
                <Label htmlFor="select-all" className="text-xs font-bold uppercase cursor-pointer">
                    Select All ({filteredCases.length})
                </Label>
            </div>
            <div className="text-[10px] font-bold text-primary-theme uppercase">
                {selectedIds.size} Selected
            </div>
        </div>

        <div className="border border-border-theme rounded-lg overflow-hidden bg-surface-muted max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="animate-spin text-primary-theme" size={24} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-text-theme-muted">Fetching Matrix...</span>
            </div>
          ) : filteredCases.length === 0 ? (
            <div className="py-20 text-center text-text-theme-muted italic text-sm">
                No available test cases found.
            </div>
          ) : (
            <div className="divide-y divide-border-theme">
              {filteredCases.map(tc => (
                <div 
                    key={tc.test_case_id} 
                    className={`flex items-start gap-3 p-3 transition-colors cursor-pointer hover:bg-surface-accent ${selectedIds.has(tc.test_case_id) ? 'bg-primary-theme/5' : ''}`}
                    onClick={() => toggleSelect(tc.test_case_id)}
                >
                  <Checkbox 
                    checked={selectedIds.has(tc.test_case_id)}
                    onCheckedChange={() => toggleSelect(tc.test_case_id)}
                    className="mt-0.5"
                  />
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[10px] font-black text-primary-theme uppercase">{tc.custom_id || 'TC-NEW'}</span>
                    <span className="text-sm font-bold truncate">{tc.title}</span>
                    <span className="text-[9px] text-text-theme-muted uppercase font-medium">{tc.scenario_name} • {tc.priority}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border-theme">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleAdd} disabled={saving || selectedIds.size === 0} className="bg-primary-theme hover:bg-primary-theme/90 px-8">
            {saving ? 'Adding...' : `Add ${selectedIds.size} Cases`}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
