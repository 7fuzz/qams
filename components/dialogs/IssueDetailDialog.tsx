"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Label, Input, Combobox, Textarea, AttachmentManager } from '../ui';
import { 
    MessageSquare, 
    ChevronDown, 
    ChevronUp, 
    History, 
    UserCheck, 
    ShieldCheck, 
    FileText, 
    ExternalLink, 
    LayoutPanelTop, 
    Layers,
    Calendar,
    ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { 
  ISSUE_STATUS_OPTIONS,
  ISSUE_STATUS,
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

interface IssueDetailDialogProps {
  issueId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export const IssueDetailDialog = ({ issueId, isOpen, onClose, onRefresh }: IssueDetailDialogProps) => {
  const [issue, setIssue] = useState<Issue | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [notes, setNotes] = useState<IssueNote[]>([]);
  const [history, setHistory] = useState<IssueHistoryEntry[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [expandedTestCaseId, setExpandedTestCaseId] = useState<string | null>(null);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchIssueData = useCallback(async (id: string) => {
    setLoading(true);
    try {
        const [issueRes, notesRes, historyRes, tcRes] = await Promise.all([
            fetch(`/api/issues?issueId=${id}`),
            fetch(`/api/issues/notes?issueId=${id}`),
            fetch(`/api/issues/history?issueId=${id}`),
            fetch(`/api/issues/test-cases?id=${id}`)
        ]);
        
        const issueData = await issueRes.json();
        if (issueData.data && issueData.data.length > 0) {
            setIssue(issueData.data[0]);
        }
        setNotes(await notesRes.json());
        setHistory(await historyRes.json());
        setTestCases(await tcRes.json());
    } catch (error) {
        console.error("Failed to fetch issue details", error);
    } finally {
        setLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    const res = await fetch('/api/users?limit=1000');
    const resData = await res.json();
    setUsers(resData.data || []);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
        if (issueId && isOpen) {
            fetchIssueData(issueId);
            fetchUsers();
        }
    });
  }, [issueId, isOpen, fetchIssueData, fetchUsers]);

  const handleUpdateIssue = async (data: Partial<Issue>) => {
    if (!issueId) return;
    await fetch('/api/issues', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ issue_id: issueId, ...data }),
    });
    fetchIssueData(issueId);
    onRefresh();
  };

  const handleAddNote = async () => {
    if (!issueId || !newNoteContent) return;
    await fetch('/api/issues/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ issue_id: issueId, content: newNoteContent }),
    });
    setNewNoteContent('');
    fetchIssueData(issueId);
  };

  if (!isOpen) return null;

  const userOptions = users.map(u => ({ value: u.user_id, label: u.name }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={issue?.title || 'Loading Issue...'} maxWidth="max-w-7xl">
      {loading && !issue ? (
          <div className="py-20 text-center animate-pulse text-gray-500 font-bold uppercase tracking-widest text-xs">
              Fetching Issue Context...
          </div>
      ) : issue && (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Details & Primary Info */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Header Info */}
                    <div className="flex flex-wrap items-center gap-3">
                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
                            issue.severity.includes('Critical') || issue.severity.includes('High') 
                            ? 'bg-red-100 text-red-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                            {issue.severity}
                        </span>
                        <span className="text-gray-400">•</span>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-tight">
                            <UserCheck size={14} className="text-primary-theme" /> Reported by: {issue.reporter_name}
                        </div>
                        <span className="text-gray-400">•</span>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-tight">
                            <Calendar size={14} className="text-primary-theme" /> {new Date(issue.created_at).toLocaleDateString()}
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-text-theme-subtle">Issue Description</Label>
                        <div className="p-4 bg-surface-muted rounded-xl border border-border-theme text-sm leading-relaxed whitespace-pre-wrap italic">
                            {issue.description}
                        </div>
                    </div>

                    {/* Triage Controls */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-primary-theme/5 rounded-2xl border border-primary-theme/10">
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-primary-theme flex items-center gap-2">
                                <ShieldCheck size={14} /> Triage & Assignment
                            </h4>
                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold text-text-theme-muted uppercase">Status</Label>
                                    <Combobox 
                                        options={ISSUE_STATUS_OPTIONS} 
                                        value={issue.status} 
                                        onChange={(val) => handleUpdateIssue({ status: val as IssueStatus })} 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold text-text-theme-muted uppercase">Assigned Developer</Label>
                                    <Combobox 
                                        options={userOptions} 
                                        value={issue.developer_id} 
                                        onChange={(val) => handleUpdateIssue({ developer_id: val as string })} 
                                        placeholder="Assign Developer..."
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-primary-theme flex items-center gap-2">
                                <Calendar size={14} /> Schedule & SLA
                            </h4>
                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold text-text-theme-muted uppercase">SLA Resolution Date</Label>
                                    <Input 
                                        type="date" 
                                        value={issue.sla_date ? issue.sla_date.split('T')[0] : ''} 
                                        onChange={(e) => handleUpdateIssue({ sla_date: e.target.value })} 
                                        className="bg-surface"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold text-text-theme-muted uppercase">Actual Fix Date</Label>
                                    <Input 
                                        type="date" 
                                        value={issue.actual_date ? issue.actual_date.split('T')[0] : ''} 
                                        onChange={(e) => handleUpdateIssue({ actual_date: e.target.value })} 
                                        className="bg-surface"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Associated Context */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Test Cases */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-text-theme-muted flex items-center gap-2 border-b border-border-theme pb-2">
                                <FileText size={14} /> Linked Test Cases
                            </h4>
                            <div className="space-y-2">
                                {testCases.map(tc => (
                                    <div key={tc.test_case_id} className="border border-border-theme rounded-xl overflow-hidden bg-surface">
                                        <div 
                                            className="flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-surface-muted transition-colors"
                                            onClick={() => setExpandedTestCaseId(expandedTestCaseId === tc.test_case_id ? null : tc.test_case_id)}
                                        >
                                            <div className="flex items-center gap-2 text-xs font-bold text-primary-theme">
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary-theme" />
                                                {tc.title}
                                            </div>
                                            {expandedTestCaseId === tc.test_case_id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                        </div>
                                        {expandedTestCaseId === tc.test_case_id && (
                                            <div className="px-3 pb-3 pt-1 border-t border-border-theme bg-surface-muted/30 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5 text-[9px] uppercase font-black text-text-theme-subtle">
                                                        <LayoutPanelTop size={10} /> {tc.project_name}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[9px] uppercase font-black text-text-theme-subtle">
                                                        <Layers size={10} /> {tc.module_name} › {tc.scenario_name}
                                                    </div>
                                                </div>
                                                <Link 
                                                    href={`/tests/${tc.test_case_id}`}
                                                    className="inline-flex items-center gap-1 text-[9px] font-black text-primary-theme hover:underline uppercase tracking-widest"
                                                    onClick={onClose}
                                                >
                                                    Explore Full Trace <ExternalLink size={10} />
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Run History */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-text-theme-muted flex items-center gap-2 border-b border-border-theme pb-2">
                                <History size={14} /> Affected Run History
                            </h4>
                            <div className="space-y-2">
                                {history.map(entry => (
                                    <div key={entry.history_id} className="flex items-center justify-between text-[10px] p-2.5 bg-surface border border-border-theme rounded-xl">
                                        <div className="flex items-center gap-2">
                                            {entry.run_id ? (
                                                <Link 
                                                    href={`/runs/${entry.run_id}`} 
                                                    className="font-bold text-primary-theme hover:underline flex items-center gap-1"
                                                    onClick={onClose}
                                                >
                                                    {entry.run_name}
                                                </Link>
                                            ) : (
                                                <span className="font-bold text-text-theme-subtle">{entry.run_name || 'System Auto-Update'}</span>
                                            )}
                                            <ArrowRight size={10} className="text-text-theme-muted" />
                                            <span className={`font-black uppercase tracking-tighter ${
                                                entry.status === ISSUE_STATUS.CLOSED ? 'text-success-theme' : 'text-danger-theme'
                                            }`}>{entry.status}</span>
                                        </div>
                                        <span className="text-[9px] font-bold text-text-theme-subtle">{new Date(entry.timestamp).toLocaleDateString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Interaction Hub (Notes) */}
                <div className="space-y-8 bg-surface-muted/30 p-6 rounded-2xl border border-border-theme">
                    {/* Notes Thread */}
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-text-theme-muted flex items-center gap-2">
                            <MessageSquare size={14} /> Activity Thread
                        </h4>
                        
                        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-none">
                            {notes.map(note => (
                                <div key={note.note_id} className="p-3 bg-surface border border-border-theme rounded-xl space-y-1.5 shadow-sm">
                                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                                        <span className="text-primary-theme">{note.user_name}</span>
                                        <span className="text-text-theme-subtle">{new Date(note.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-xs text-text-theme-main font-medium leading-relaxed">{note.content}</p>
                                </div>
                            ))}
                            {notes.length === 0 && (
                                <div className="py-8 text-center text-xs text-text-theme-muted italic">No comments yet. Start the conversation.</div>
                            )}
                        </div>

                        <div className="flex flex-col gap-2 pt-2">
                            <Textarea 
                                placeholder="Add your note or update here..." 
                                className="text-xs bg-surface min-h-[80px] resize-none" 
                                value={newNoteContent}
                                onChange={e => setNewNoteContent(e.target.value)}
                            />
                            <Button size="sm" onClick={handleAddNote} disabled={!newNoteContent} className="font-bold uppercase tracking-widest text-[10px]">
                                Post Update
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Section: Full Width Artifacts */}
            <div className="mt-8 pt-8 border-t border-border-theme space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-text-theme-muted flex items-center gap-2 px-2">
                    <FileText size={16} className="text-primary-theme" /> Artifacts, Evidence & Proof
                </h4>
                <div className="bg-surface-muted/20 p-6 rounded-2xl border border-dashed border-border-theme">
                    <AttachmentManager entityId={issue.issue_id} entityType="ISSUE" />
                </div>
            </div>
        </>
      )}
    </Modal>
  );
};
