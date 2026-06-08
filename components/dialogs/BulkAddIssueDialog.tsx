"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Label, Input } from '../ui';
import { Issue } from '@/types/app';
import { Search, Loader2, AlertCircle } from 'lucide-react';

interface BulkAddIssueDialogProps {
  projectId: string;
  testCaseIds: string[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BulkAddIssueDialog = ({ 
  projectId, 
  testCaseIds, 
  isOpen, 
  onClose, 
  onSuccess 
}: BulkAddIssueDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [search, setSearch] = useState('');
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

  const fetchProjectIssues = useCallback(async () => {
    if (!isOpen || !projectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/issues?projectId=${projectId}&limit=1000`);
      const data = await res.json();
      if (data.data) {
        setIssues(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch project issues:', error);
    } finally {
      setLoading(false);
    }
  }, [isOpen, projectId]);

  useEffect(() => {
    fetchProjectIssues();
  }, [fetchProjectIssues]);

  useEffect(() => {
    if (isOpen) {
        setSelectedIssueId(null);
        setSearch('');
    }
  }, [isOpen]);

  const filteredIssues = issues.filter(i => 
    i.title.toLowerCase().includes(search.toLowerCase()) || 
    i.issue_id.toLowerCase().includes(search.toLowerCase())
  );

  const handleLink = async () => {
    if (!selectedIssueId || testCaseIds.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch('/api/issues/test-cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issueId: selectedIssueId,
          testCaseIds: testCaseIds
        }),
      });
      if (res.ok) {
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Failed to link issue:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Link Issue to ${testCaseIds.length} Test Cases`}>
      <div className="space-y-4">
        <div className="bg-primary-theme/5 border border-primary-theme/10 p-3 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-primary-theme mt-0.5" size={16} />
            <div className="text-[11px] text-text-theme-muted leading-relaxed">
                Selecting an issue will link it to all {testCaseIds.length} selected test cases. 
                Test cases already linked to the issue will be skipped.
            </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-theme-muted" size={16} />
          <Input 
            placeholder="Search issues by title or ID..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="border border-border-theme rounded-lg overflow-hidden bg-surface-muted max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="animate-spin text-primary-theme" size={24} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-text-theme-muted">Fetching Issues...</span>
            </div>
          ) : filteredIssues.length === 0 ? (
            <div className="py-20 text-center text-text-theme-muted italic text-sm">
                No issues found for this project.
            </div>
          ) : (
            <div className="divide-y divide-border-theme">
              {filteredIssues.map(issue => (
                <div 
                    key={issue.issue_id} 
                    className={`flex items-start gap-3 p-3 transition-colors cursor-pointer hover:bg-surface-accent ${selectedIssueId === issue.issue_id ? 'bg-primary-theme/10 border-l-2 border-primary-theme' : 'border-l-2 border-transparent'}`}
                    onClick={() => setSelectedIssueId(issue.issue_id)}
                >
                  <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-black text-primary-theme uppercase">{issue.issue_id.split('-')[0]}</span>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                            issue.status === 'Open' ? 'bg-danger-theme/10 text-danger-theme' : 'bg-success-theme/10 text-success-theme'
                        }`}>{issue.status}</span>
                    </div>
                    <span className="text-sm font-bold truncate">{issue.title}</span>
                    <span className="text-[9px] text-text-theme-muted uppercase font-medium line-clamp-1">{issue.description}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border-theme">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleLink} disabled={saving || !selectedIssueId} className="bg-primary-theme hover:bg-primary-theme/90 px-8">
            {saving ? 'Linking...' : 'Link Issue'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
