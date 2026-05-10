"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Label, Input, Combobox, Textarea } from '../ui';
import { Plus } from 'lucide-react';
import { IssueItem } from './IssueItem';
import { 
  ISSUE_SEVERITY_OPTIONS,
  ISSUE_SEVERITY,
  IssueStatus,
  IssueSeverity
} from '@/lib/constants';

interface Issue {
  issue_id: string;
  test_case_id: string;
  title: string;
  description: string;
  severity: IssueSeverity;
  status: IssueStatus;
  reporter_name: string;
  developer_id: string;
  developer_name: string;
  solver_name: string;
  sla_date: string | null;
  actual_date: string | null;
  created_at: string;
  test_case_titles?: string;
  tag_ids?: string[];
  tags?: { tag_id: string, name: string, color: string }[];
}

interface Tag {
    tag_id: string;
    name: string;
    color: string;
}

interface TestCase {
  test_case_id: string;
  custom_id: string | null;
  title: string;
  project_name: string;
  module_name: string;
  scenario_name: string;
}

interface IssueNote {
  note_id: string;
  content: string;
  user_name: string;
  created_at: string;
}

interface IssueHistoryEntry {
    history_id: string;
    run_id: string | null;
    run_name: string | null;
    status: string;
    user_name: string;
    timestamp: string;
}

interface User {
    user_id: string;
    name: string;
}

interface IssuesListDialogProps {
  testCaseId: string | null;
  issueId?: string | null;
  testCaseTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export const IssuesListDialog = ({ testCaseId, issueId, testCaseTitle, isOpen, onClose, onRefresh }: IssuesListDialogProps) => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);
  const [issueNotes, setIssueNotes] = useState<Record<string, IssueNote[]>>({});
  const [issueHistory, setIssueHistory] = useState<Record<string, IssueHistoryEntry[]>>({});
  const [issueTestCases, setIssueTestCases] = useState<Record<string, TestCase[]>>({});
  
  const [showNewIssueForm, setShowNewIssueForm] = useState(false);
  const [newIssue, setNewIssue] = useState({ title: '', description: '', severity: ISSUE_SEVERITY.MEDIUM as string, developer_id: '', sla_date: '', tag_ids: [] as string[] });

  const fetchDataForIssue = useCallback(async (id: string) => {
    const [notesRes, historyRes, tcRes] = await Promise.all([
        fetch(`/api/issues/notes?issueId=${id}`),
        fetch(`/api/issues/history?issueId=${id}`),
        fetch(`/api/issues/test-cases?id=${id}`)
    ]);
    const notes = await notesRes.json();
    const history = await historyRes.json();
    const testCases = await tcRes.json();
    setIssueNotes(prev => ({ ...prev, [id]: notes }));
    setIssueHistory(prev => ({ ...prev, [id]: history }));
    setIssueTestCases(prev => ({ ...prev, [id]: testCases }));
  }, []);

  const fetchIssues = useCallback(async () => {
    let url = '';
    if (testCaseId) {
        url = `/api/issues?testCaseId=${testCaseId}&limit=1000`;
    } else if (issueId) {
        url = `/api/issues?issueId=${issueId}`;
    } else {
        return;
    }
    
    const res = await fetch(url);
    const resData = await res.json();
    const fetchedIssues = resData.data || [];
    setIssues(fetchedIssues);
    
    if (issueId && fetchedIssues.length > 0) {
        setExpandedIssueId(fetchedIssues[0].issue_id);
        fetchDataForIssue(fetchedIssues[0].issue_id);
    }
  }, [testCaseId, issueId, fetchDataForIssue]);

  const fetchUsers = useCallback(async () => {
    const res = await fetch('/api/users?limit=1000');
    const resData = await res.json();
    setUsers(resData.data || []);
  }, []);

  const fetchTags = useCallback(async () => {
    const res = await fetch('/api/tags');
    const resData = await res.json();
    setTags(resData || []);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
        if ((testCaseId || issueId) && isOpen) {
            fetchIssues();
            fetchUsers();
            fetchTags();
            setShowNewIssueForm(false);
            if (!issueId) setExpandedIssueId(null);
        }
    });
  }, [testCaseId, issueId, isOpen, fetchIssues, fetchUsers, fetchTags]);

  const handleCreateIssue = async () => {
    if (!newIssue.title || !testCaseId) return;
    await fetch('/api/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test_case_id: testCaseId, ...newIssue }),
    });
    setNewIssue({ title: '', description: '', severity: ISSUE_SEVERITY.MEDIUM, developer_id: '', sla_date: '', tag_ids: [] });
    setShowNewIssueForm(false);
    fetchIssues();
    onRefresh();
  };

  const handleUpdateIssue = async (id: string, data: Partial<Issue>) => {
    await fetch('/api/issues', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ issue_id: id, ...data }),
    });
    fetchIssues();
    fetchDataForIssue(id);
    onRefresh();
  };

  const handleAddNote = async (id: string, content: string) => {
    await fetch('/api/issues/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ issue_id: id, content }),
    });
    fetchDataForIssue(id);
  };

  if (!testCaseId && !issueId) return null;

  const userOptions = users.map(u => ({ value: u.user_id, label: u.name }));
  const tagOptions = tags.map(t => ({ value: t.tag_id, label: t.name }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Issues History: ${testCaseTitle}`} maxWidth="max-w-7xl">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-xs uppercase tracking-widest text-text-theme-muted">Known Issues ({issues.length})</h4>
          <Button variant="outline" size="sm" onClick={() => setShowNewIssueForm(!showNewIssueForm)}>
            <Plus size={16} className="mr-1" /> New Issue
          </Button>
        </div>

        {showNewIssueForm && (
          <div className="p-5 border border-primary-theme/20 bg-primary-theme/5 rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-2">
            <div className="grid gap-4">
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-text-theme-muted">Issue Title</Label>
                    <Input placeholder="Describe the problem..." value={newIssue.title} onChange={e => setNewIssue({...newIssue, title: e.target.value})} className="bg-surface" />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-text-theme-muted">Description</Label>
                    <Textarea 
                    placeholder="Provide details for reproduction..."
                    value={newIssue.description}
                    onChange={e => setNewIssue({...newIssue, description: e.target.value})}
                    className="bg-surface min-h-[100px]"
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase text-text-theme-muted">Severity</Label>
                        <Combobox options={ISSUE_SEVERITY_OPTIONS} value={newIssue.severity} onChange={val => setNewIssue({...newIssue, severity: val as string})} className="bg-surface" />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase text-text-theme-muted">Assign Developer</Label>
                        <Combobox options={userOptions} value={newIssue.developer_id} onChange={val => setNewIssue({...newIssue, developer_id: val as string})} placeholder="Select Dev..." className="bg-surface" />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase text-text-theme-muted">SLA Resolution</Label>
                        <Input type="date" value={newIssue.sla_date} onChange={e => setNewIssue({...newIssue, sla_date: e.target.value})} className="h-10 text-xs bg-surface" />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-text-theme-muted">Tags</Label>
                    <Combobox 
                        options={tagOptions} 
                        value={newIssue.tag_ids} 
                        onChange={val => setNewIssue({...newIssue, tag_ids: val as string[]})} 
                        placeholder="Select Tags..." 
                        className="bg-surface"
                        multiSelect={true}
                    />
                </div>
            </div>
            <Button size="sm" onClick={handleCreateIssue} className="w-full h-11 font-bold uppercase tracking-widest shadow-lg shadow-primary-theme/10">Report Issue</Button>
          </div>
        )}

        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1 scrollbar-none">
          {issues.map(issue => (
            <IssueItem 
                key={issue.issue_id}
                issue={issue}
                isExpanded={expandedIssueId === issue.issue_id}
                onToggle={() => {
                    if (expandedIssueId === issue.issue_id) {
                        setExpandedIssueId(null);
                    } else {
                        setExpandedIssueId(issue.issue_id);
                        fetchDataForIssue(issue.issue_id);
                    }
                }}
                users={users}
                allTags={tags}
                notes={issueNotes[issue.issue_id] || []}
                history={issueHistory[issue.issue_id] || []}
                testCases={issueTestCases[issue.issue_id] || []}
                onUpdate={(data) => handleUpdateIssue(issue.issue_id, data)}
                onAddNote={(content) => handleAddNote(issue.issue_id, content)}
                onCloseParent={onClose}
                compact={true}
            />
          ))}
          {issues.length === 0 && !showNewIssueForm && (
              <div className="py-20 text-center border-2 border-dashed border-border-theme rounded-2xl bg-surface-muted/30">
                  <p className="text-sm text-text-theme-muted italic">No issues linked to this test case.</p>
              </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t border-border-theme">
          <Button onClick={onClose} variant="outline" className="px-8">Dismiss</Button>
        </div>
      </div>
    </Modal>
  );
};
