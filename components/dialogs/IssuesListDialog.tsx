"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Label, Input, Combobox, Textarea, AttachmentManager } from '../ui';
import { AlertCircle, MessageSquare, Plus, ChevronDown, ChevronUp, CheckCircle2, History, UserCheck, ShieldCheck, FileText, ExternalLink, LayoutPanelTop, Layers } from 'lucide-react';
import Link from 'next/link';
import { 
  ISSUE_SEVERITY_OPTIONS,
  ISSUE_STATUS_OPTIONS,
  ISSUE_STATUS,
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
  estimated_date: string | null;
  created_at: string;
  test_case_titles?: string;
}

interface TestCase {
  test_case_id: string;
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
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);
  const [expandedTestCaseId, setExpandedTestCaseId] = useState<string | null>(null);
  const [issueNotes, setIssueNotes] = useState<Record<string, IssueNote[]>>({});
  const [issueHistory, setIssueHistory] = useState<Record<string, IssueHistoryEntry[]>>({});
  const [issueTestCases, setIssueTestCases] = useState<Record<string, TestCase[]>>({});
  
  const [showNewIssueForm, setShowNewIssueForm] = useState(false);
  const [newIssue, setNewIssue] = useState({ title: '', description: '', severity: ISSUE_SEVERITY.MEDIUM as string, developer_id: '', estimated_date: '' });
  const [newNoteContent, setNewNoteContent] = useState<Record<string, string>>({});

  const fetchDataForIssue = useCallback(async (issueId: string) => {
    const [notesRes, historyRes, tcRes] = await Promise.all([
        fetch(`/api/issues/notes?issueId=${issueId}`),
        fetch(`/api/issues/history?issueId=${issueId}`),
        fetch(`/api/issues/test-cases?id=${issueId}`)
    ]);
    const notes = await notesRes.json();
    const history = await historyRes.json();
    const testCases = await tcRes.json();
    setIssueNotes(prev => ({ ...prev, [issueId]: notes }));
    setIssueHistory(prev => ({ ...prev, [issueId]: history }));
    setIssueTestCases(prev => ({ ...prev, [issueId]: testCases }));
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
    
    // If we were looking for a specific issue, expand it automatically
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

  useEffect(() => {
    queueMicrotask(() => {
        if ((testCaseId || issueId) && isOpen) {
            fetchIssues();
            fetchUsers();
            setShowNewIssueForm(false);
            if (!issueId) setExpandedIssueId(null);
        }
    });
  }, [testCaseId, issueId, isOpen, fetchIssues, fetchUsers]);

  const handleCreateIssue = async () => {
    if (!newIssue.title || !testCaseId) return;
    await fetch('/api/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test_case_id: testCaseId, ...newIssue }),
    });
    setNewIssue({ title: '', description: '', severity: ISSUE_SEVERITY.MEDIUM, developer_id: '', estimated_date: '' });
    setShowNewIssueForm(false);
    fetchIssues();
    onRefresh();
  };

  const handleUpdateIssue = async (issueId: string, data: Partial<Issue>) => {
    await fetch('/api/issues', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ issue_id: issueId, ...data }),
    });
    fetchIssues();
    fetchDataForIssue(issueId);
    onRefresh();
  };

  const handleAddNote = async (issueId: string) => {
    const content = newNoteContent[issueId];
    if (!content) return;
    await fetch('/api/issues/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ issue_id: issueId, content }),
    });
    setNewNoteContent(prev => ({ ...prev, [issueId]: '' }));
    fetchDataForIssue(issueId);
  };

  if (!testCaseId && !issueId) return null;

  const userOptions = users.map(u => ({ value: u.user_id, label: u.name }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Issues History: ${testCaseTitle}`}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-xs uppercase tracking-widest text-gray-500">Known Issues ({issues.length})</h4>
          <Button variant="outline" size="sm" onClick={() => setShowNewIssueForm(!showNewIssueForm)}>
            <Plus size={16} className="mr-1" /> New Issue
          </Button>
        </div>

        {showNewIssueForm && (
          <div className="p-4 border border-red-100 bg-red-50/30 rounded-lg space-y-3 animate-in fade-in slide-in-from-top-2">
            <Input placeholder="Issue Title" value={newIssue.title} onChange={e => setNewIssue({...newIssue, title: e.target.value})} />
            <Textarea 
              placeholder="Description"
              value={newIssue.description}
              onChange={e => setNewIssue({...newIssue, description: e.target.value})}
            />
            <div className="grid grid-cols-2 gap-3">
              <Combobox options={ISSUE_SEVERITY_OPTIONS} value={newIssue.severity} onChange={val => setNewIssue({...newIssue, severity: val as string})} />
              <Combobox options={userOptions} value={newIssue.developer_id} onChange={val => setNewIssue({...newIssue, developer_id: val as string})} placeholder="Assign Dev..." />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-gray-400">ESTIMATED RESOLUTION DATE</Label>
              <Input type="date" value={newIssue.estimated_date} onChange={e => setNewIssue({...newIssue, estimated_date: e.target.value})} className="h-8 text-xs" />
            </div>
            <Button size="sm" onClick={handleCreateIssue} className="w-full">Report Issue</Button>
          </div>
        )}

        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
          {issues.map(issue => (
            <div key={issue.issue_id} className="border dark:border-gray-800 rounded-lg overflow-hidden bg-white dark:bg-gray-950">
              <div 
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                onClick={() => {
                  if (expandedIssueId === issue.issue_id) {
                      setExpandedIssueId(null);
                  } else {
                      setExpandedIssueId(issue.issue_id);
                      fetchDataForIssue(issue.issue_id);
                  }
                }}
              >
                <div className="flex items-center gap-4">
                  {issue.status === ISSUE_STATUS.CLOSED ? (
                    <CheckCircle2 size={20} className="text-green-500" />
                  ) : (
                    <AlertCircle size={20} className="text-red-500" />
                  )}
                  <div>
                    <div className={`font-bold text-black dark:text-white ${issue.status === ISSUE_STATUS.CLOSED ? 'line-through text-gray-400' : ''}`}>{issue.title}</div>
                    <div className="text-[10px] text-gray-500 flex gap-2 font-medium uppercase tracking-wider">
                      <span>{issue.severity}</span>
                      <span>•</span>
                      <span className="text-blue-500">{issue.status}</span>
                      {issue.developer_name && (
                        <>
                            <span>•</span>
                            <span className="flex items-center gap-1"><UserCheck size={10} /> {issue.developer_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {expandedIssueId === issue.issue_id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>

              {expandedIssueId === issue.issue_id && (
                <div className="p-4 border-t dark:border-gray-800 bg-gray-50/20 space-y-6">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400 border-l-2 pl-3 italic">{issue.description}</p>
                        
                        {issue.status === ISSUE_STATUS.CLOSED && issue.solver_name && (
                            <div className="p-2 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20 rounded-md flex items-center gap-2 text-green-700 dark:text-green-400 text-xs font-bold">
                                <ShieldCheck size={14} /> Solved by: {issue.solver_name}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-gray-400">STATUS</Label>
                                <Combobox 
                                    options={ISSUE_STATUS_OPTIONS} 
                                    value={issue.status} 
                                    onChange={(val) => handleUpdateIssue(issue.issue_id, { status: val as IssueStatus })} 
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-gray-400">ASSIGNED TO</Label>
                                <Combobox 
                                    options={userOptions} 
                                    value={issue.developer_id} 
                                    onChange={(val) => handleUpdateIssue(issue.issue_id, { developer_id: val as string })} 
                                    placeholder="Assign..."
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-gray-400 uppercase">Estimated Resolution Date</Label>
                            <Input 
                                type="date" 
                                value={issue.estimated_date ? issue.estimated_date.split('T')[0] : ''} 
                                onChange={(e) => handleUpdateIssue(issue.issue_id, { estimated_date: e.target.value })} 
                                className="h-8 text-xs bg-white dark:bg-gray-950"
                            />
                        </div>

                        {/* Associated Test Cases */}
                        <div className="space-y-3">
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                            <FileText size={12} /> Associated Test Cases
                            </div>
                            <div className="space-y-2">
                                {(issueTestCases[issue.issue_id] || []).map(tc => (
                                    <div key={tc.test_case_id} className="border dark:border-gray-800 rounded-md overflow-hidden bg-white dark:bg-gray-950/50">
                                        <div 
                                            className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/5 transition-colors"
                                            onClick={() => setExpandedTestCaseId(expandedTestCaseId === tc.test_case_id ? null : tc.test_case_id)}
                                        >
                                            <div className="flex items-center gap-2 text-[11px] font-medium text-blue-700 dark:text-blue-400">
                                                <FileText size={12} />
                                                {tc.title}
                                            </div>
                                            {expandedTestCaseId === tc.test_case_id ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                                        </div>
                                        {expandedTestCaseId === tc.test_case_id && (
                                            <div className="px-3 pb-3 pt-1 border-t dark:border-gray-800 space-y-2 bg-blue-50/20 dark:bg-blue-900/5">
                                                <div className="grid grid-cols-1 gap-1.5">
                                                    <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-text-theme-muted">
                                                        <LayoutPanelTop size={10} className="text-primary-theme" /> {tc.project_name}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-text-theme-muted">
                                                        <Layers size={10} className="text-primary-theme" /> {tc.module_name} › {tc.scenario_name}
                                                    </div>
                                                </div>
                                                <Link 
                                                    href={`/tests/${tc.test_case_id}`}
                                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-primary-theme hover:underline uppercase"
                                                    onClick={onClose}
                                                >
                                                    <ExternalLink size={10} /> View Details
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {(issueTestCases[issue.issue_id] || []).length === 0 && (
                                    <span className="text-[11px] text-gray-400 italic">No linked test cases</span>
                                )}
                            </div>
                        </div>

                        {/* Run History */}
                        <div className="space-y-3">
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                            <History size={12} /> Run History
                            </div>
                            <div className="space-y-2 text-black dark:text-white">
                                {(issueHistory[issue.issue_id] || []).map(entry => (
                                    <div key={entry.history_id} className="flex items-center justify-between text-[11px] p-2 bg-white dark:bg-gray-900 border dark:border-gray-800 rounded">
                                        <div className="flex items-center gap-2">
                                            {entry.run_id ? (
                                                <Link 
                                                    href={`/runs/${entry.run_id}`} 
                                                    className="font-bold text-blue-500 hover:underline inline-flex items-center gap-1"
                                                    onClick={onClose}
                                                >
                                                    {entry.run_name} <ExternalLink size={10} />
                                                </Link>
                                            ) : (
                                                <span className="font-bold text-gray-500">{entry.run_name || 'System'}</span>
                                            )}
                                            <span className="text-gray-400">➔</span>
                                            <span className="font-bold">{entry.status}</span>
                                        </div>
                                        <span className="text-gray-400">{new Date(entry.timestamp).toLocaleDateString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6 pl-6 border-l dark:border-gray-800">
                         {/* Attachments for Issue */}
                        <AttachmentManager entityId={issue.issue_id} entityType="ISSUE" />

                        {/* Notes Thread */}
                        <div className="space-y-3">
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                            <MessageSquare size={12} /> Notes Thread
                            </div>
                            <div className="space-y-2">
                            {(issueNotes[issue.issue_id] || []).map(note => (
                                <div key={note.note_id} className="text-xs bg-white dark:bg-gray-900 p-2 rounded border dark:border-gray-800 text-black dark:text-white">
                                <div className="flex justify-between font-bold text-gray-500 mb-1">
                                    <span>{note.user_name}</span>
                                    <span>{new Date(note.created_at).toLocaleDateString()}</span>
                                </div>
                                {note.content}
                                </div>
                            ))}
                            </div>
                            <div className="flex gap-2">
                            <Input 
                                placeholder="Add to thread..." 
                                className="h-8 text-xs shadow-sm bg-white dark:bg-gray-950" 
                                value={newNoteContent[issue.issue_id] || ''}
                                onChange={e => setNewNoteContent({...newNoteContent, [issue.issue_id]: e.target.value})}
                            />
                            <Button size="sm" className="h-8 px-4" onClick={() => handleAddNote(issue.issue_id)}>Post</Button>
                            </div>
                        </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-4 border-t dark:border-gray-800">
          <Button onClick={onClose} className="px-8">Done</Button>
        </div>
      </div>
    </Modal>
  );
};
