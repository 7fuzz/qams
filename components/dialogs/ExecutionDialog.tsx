"use client";

import React, { useState, useEffect } from 'react';
import { Modal, Button, Label, Input, Combobox, Textarea, AttachmentManager } from '../ui';
import { AlertCircle, MessageSquare, Plus, ChevronDown, ChevronUp, History, CheckCircle2, FileText, Database, Clock, Link as LinkIcon, BarChart } from 'lucide-react';
import { 
  TEST_STATUS, 
  TEST_STATUS_OPTIONS, 
  ISSUE_SEVERITY, 
  ISSUE_SEVERITY_OPTIONS,
  ISSUE_STATUS_OPTIONS,
  TestStatus,
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
  created_at: string;
}

interface IssueNote {
  note_id: string;
  content: string;
  user_name: string;
  created_at: string;
}

interface Execution {
  execution_id: string;
  test_case_id: string;
  title: string;
  status: TestStatus;
  steps: string;
  expected_result: string;
  precondition: string;
  test_data: string;
  notes: string;
  priority?: string;
  automation_status?: string;
  requirement_link?: string;
  estimated_duration?: number;
}

interface ExecutionDialogProps {
  execution: Execution | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
}

export const ExecutionDialog = ({ execution, isOpen, onClose, onSave }: ExecutionDialogProps) => {
  const [status, setStatus] = useState<string>(execution?.status || TEST_STATUS.PENDING);
  const [notes, setNotes] = useState(execution?.notes || '');
  const [existingIssues, setExistingIssues] = useState<Issue[]>([]);
  const [expandedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [issueNotes, setIssueNotes] = useState<Record<string, IssueNote[]>>({});
  
  const [showNewIssueForm, setShowNewIssueForm] = useState(false);
  const [newIssue, setNewIssue] = useState({ title: '', description: '', severity: ISSUE_SEVERITY.MEDIUM as string });
  const [newNoteContent, setNewNoteContent] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const fetchIssues = async () => {
    if (!execution) return;
    const res = await fetch(`/api/issues?testCaseId=${execution.test_case_id}`);
    const data = await res.json();
    setExistingIssues(data);
  };

  const fetchNotes = async (issueId: string) => {
    const res = await fetch(`/api/issues/notes?issueId=${issueId}`);
    const data = await res.json();
    setIssueNotes(prev => ({ ...prev, [issueId]: data }));
  };

  useEffect(() => {
    if (execution && isOpen) {
      setStatus(execution.status);
      setNotes(execution.notes || '');
      fetchIssues();
      setShowNewIssueForm(false);
    }
  }, [execution, isOpen]);

  const handleSaveExecution = async () => {
    setLoading(true);
    try {
      await fetch('/api/test-executions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          execution_id: execution?.execution_id,
          status,
          notes,
        }),
      });
      onSave({});
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIssue = async () => {
    if (!newIssue.title || !execution) return;
    await fetch('/api/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        test_case_id: execution.test_case_id,
        execution_id: execution.execution_id,
        ...newIssue
      }),
    });
    setNewIssue({ title: '', description: '', severity: ISSUE_SEVERITY.MEDIUM });
    setShowNewIssueForm(false);
    fetchIssues();
  };

  const handleUpdateIssueStatus = async (issueId: string, newStatus: string, currentSeverity: string, title: string, desc: string) => {
    await fetch('/api/issues', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
          issue_id: issueId, 
          status: newStatus, 
          severity: currentSeverity, 
          title, 
          description: desc,
          execution_id: execution?.execution_id 
      }),
    });
    fetchIssues();
  };

  const handleLogObservation = async (issue: Issue) => {
    await fetch('/api/issues', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            issue_id: issue.issue_id, 
            status: issue.status, 
            severity: issue.severity, 
            title: issue.title, 
            description: issue.description,
            execution_id: execution?.execution_id 
        }),
      });
  }

  const handleAddNote = async (issueId: string) => {
    const content = newNoteContent[issueId];
    if (!content) return;
    await fetch('/api/issues/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ issue_id: issueId, content }),
    });
    setNewNoteContent(prev => ({ ...prev, [issueId]: '' }));
    fetchNotes(issueId);
  };

  if (!execution) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Execute: ${execution.title}`}>
      <div className="space-y-8 max-w-2xl mx-auto">
        
        {/* Section 1: Definition */}
        <section className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <FileText size={18} />
                    <h4 className="font-bold text-xs uppercase tracking-widest">Test Definition</h4>
                </div>
                <div className="flex gap-3">
                    {execution.priority && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 flex items-center gap-1">
                            <BarChart size={10} /> {execution.priority}
                        </span>
                    )}
                    {execution.estimated_duration && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 flex items-center gap-1">
                            <Clock size={10} /> {execution.estimated_duration}m
                        </span>
                    )}
                </div>
            </div>
            <div className="grid gap-4 p-5 bg-gray-50 dark:bg-gray-900 rounded-xl border dark:border-gray-800 text-sm">
                <div>
                    <Label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Steps</Label>
                    <p className="mt-1 whitespace-pre-wrap text-gray-900 dark:text-gray-100">{execution.steps}</p>
                </div>
                <div>
                    <Label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Expected Result</Label>
                    <p className="mt-1 text-gray-900 dark:text-gray-100">{execution.expected_result}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    {execution.precondition && (
                        <div>
                            <Label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Precondition</Label>
                            <p className="mt-1 text-gray-900 dark:text-gray-100 italic text-xs">{execution.precondition}</p>
                        </div>
                    )}
                    {execution.requirement_link && (
                        <div>
                            <Label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Requirement</Label>
                            <a href={execution.requirement_link} target="_blank" className="mt-1 flex items-center gap-1 text-blue-500 hover:underline text-xs">
                                <LinkIcon size={12} /> View Doc
                            </a>
                        </div>
                    )}
                </div>
                {execution.test_data && (
                    <div className="pt-2 border-t dark:border-gray-800">
                        <Label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1">
                            <Database size={12} /> Test Data
                        </Label>
                        <pre className="mt-1 p-3 bg-white dark:bg-gray-950 border dark:border-gray-800 rounded font-mono text-[11px] overflow-x-auto text-gray-700 dark:text-gray-300">
                            {execution.test_data}
                        </pre>
                    </div>
                )}
            </div>
            <AttachmentManager entityId={execution.test_case_id} entityType="TEST_CASE" />
        </section>

        {/* Section 2: Results */}
        <section className="space-y-4 pt-4 border-t dark:border-gray-800">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle2 size={18} />
                <h4 className="font-bold text-xs uppercase tracking-widest">Execution Results</h4>
            </div>
            
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Resulting Status</Label>
                        <Combobox options={TEST_STATUS_OPTIONS} value={status} onChange={(val) => setStatus(val as string)} />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Observation Notes</Label>
                    <Textarea 
                        placeholder="Detail any minor deviations or specific results observed..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="min-h-[100px]"
                    />
                </div>
                <Button 
                    onClick={handleSaveExecution} 
                    disabled={loading} 
                    className="w-full h-12 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 border-0"
                >
                    {loading ? 'Processing...' : 'Save & Close Execution'}
                </Button>
            </div>
        </section>

        {/* Section 3: Issues */}
        <section className="space-y-4 pt-4 border-t dark:border-gray-800">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <AlertCircle size={18} />
                    <h4 className="font-bold text-xs uppercase tracking-widest">Linked Issues ({existingIssues.length})</h4>
                </div>
                <Button variant="outline" size="sm" className="h-7 text-[10px] uppercase font-bold" onClick={() => setShowNewIssueForm(!showNewIssueForm)}>
                  <Plus size={14} className="mr-1" /> New Issue
                </Button>
            </div>

            {showNewIssueForm && (
                <div className="p-4 border border-red-100 dark:border-red-900/20 bg-red-50/20 dark:bg-red-900/10 rounded-lg space-y-3 animate-in fade-in slide-in-from-top-2">
                    <Input placeholder="Brief Issue Title" value={newIssue.title} onChange={e => setNewIssue({...newIssue, title: e.target.value})} />
                    <Textarea 
                        placeholder="Detailed steps to reproduce or description..."
                        value={newIssue.description}
                        onChange={e => setNewIssue({...newIssue, description: e.target.value})}
                        className="bg-white dark:bg-gray-950"
                    />
                    <div className="flex gap-3">
                        <div className="flex-1">
                        <Combobox options={ISSUE_SEVERITY_OPTIONS} value={newIssue.severity} onChange={val => setNewIssue({...newIssue, severity: val as string})} />
                        </div>
                        <Button size="sm" onClick={handleCreateIssue} className="bg-red-600 hover:bg-red-700 text-white border-0 px-6 font-bold">Report</Button>
                    </div>
                </div>
            )}

            <div className="space-y-3">
                {existingIssues.map(issue => (
                    <div key={issue.issue_id} className="border dark:border-gray-800 rounded-lg overflow-hidden bg-white dark:bg-gray-950">
                        <div 
                            className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                            onClick={() => {
                                if (expandedIssueId === issue.issue_id) {
                                    setSelectedIssueId(null);
                                } else {
                                    setSelectedIssueId(issue.issue_id);
                                    fetchNotes(issue.issue_id);
                                }
                            }}
                        >
                            <div className="flex items-center gap-3">
                                <AlertCircle size={16} className={issue.status === 'Closed' ? 'text-gray-400' : 'text-red-500'} />
                                <div>
                                    <div className={`text-sm font-semibold ${issue.status === 'Closed' ? 'line-through text-gray-400' : ''}`}>{issue.title}</div>
                                    <div className="text-[10px] text-gray-500 flex gap-2 font-medium">
                                        <span>{issue.severity}</span>
                                        <span>•</span>
                                        <span className="text-blue-500 font-bold uppercase">{issue.status}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {issue.status !== 'Closed' && (
                                    <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        className="h-6 w-6 p-0 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/10"
                                        onClick={(e) => { e.stopPropagation(); handleLogObservation(issue); }}
                                        title="Log Still Present"
                                    >
                                        <History size={12} />
                                    </Button>
                                )}
                                {expandedIssueId === issue.issue_id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </div>
                        </div>

                        {expandedIssueId === issue.issue_id && (
                            <div className="p-4 border-t dark:border-gray-800 bg-gray-50/20 space-y-4">
                                <p className="text-sm text-gray-600 dark:text-gray-400 italic">{issue.description}</p>
                                <AttachmentManager entityId={issue.issue_id} entityType="ISSUE" />
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-gray-400 uppercase">Change Status</Label>
                                    <Combobox 
                                        options={ISSUE_STATUS_OPTIONS} 
                                        value={issue.status} 
                                        onChange={(val) => handleUpdateIssueStatus(issue.issue_id, val as string, issue.severity, issue.title, issue.description)} 
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </section>

        <div className="flex justify-end pt-4">
            <Button variant="ghost" onClick={onClose} className="text-gray-400 hover:text-gray-600">Dismiss</Button>
        </div>
      </div>
    </Modal>
  );
};
