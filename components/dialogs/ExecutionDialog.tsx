"use client";

import React, { useState, useEffect } from 'react';
import { Modal, Button, Label, Input, Combobox, Textarea, AttachmentManager } from '../ui';
import { AlertCircle, MessageSquare, Plus, ChevronDown, ChevronUp, History, CheckCircle2 } from 'lucide-react';
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
  notes: string;
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
      alert(`Observation logged for "${issue.title}" in this run.`);
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
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
                {/* Test Case Info - Compact */}
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-xs border dark:border-gray-800 space-y-4">
                    <div>
                        <span className="font-bold text-gray-400 uppercase tracking-widest text-[10px]">Steps</span>
                        <p className="mt-1 whitespace-pre-wrap text-black dark:text-white">{execution.steps}</p>
                    </div>
                    <div>
                        <span className="font-bold text-gray-400 uppercase tracking-widest text-[10px]">Expected</span>
                        <p className="mt-1 text-black dark:text-white">{execution.expected_result}</p>
                    </div>
                    <div>
                        <span className="font-bold text-gray-400 uppercase tracking-widest text-[10px]">Precondition</span>
                        <p className="mt-1 text-black dark:text-white">{execution.precondition || 'None'}</p>
                    </div>
                </div>

                {/* Execution Status */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-black dark:text-white">Resulting Status</Label>
                        <Combobox options={TEST_STATUS_OPTIONS} value={status} onChange={(val) => setStatus(val as string)} />
                    </div>
                    <div className="space-y-2 text-black dark:text-white">
                        <Label>Execution Notes</Label>
                        <Textarea 
                            placeholder="Minor adjustments or results..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                    <Button onClick={handleSaveExecution} disabled={loading} className="w-full shadow-lg shadow-blue-500/20 py-6 text-black dark:text-white border-black dark:border-white">
                        {loading ? 'Saving...' : 'Save Execution Results'}
                    </Button>
                </div>
            </div>

            <div className="space-y-6 border-l dark:border-gray-800 pl-6">
                {/* Attachments for Execution */}
                <AttachmentManager entityId={execution.test_case_id} entityType="TEST_CASE" />

                {/* Issues Section */}
                <div className="space-y-4 pt-4 border-t dark:border-gray-800">
                    <div className="flex items-center justify-between">
                        <h4 className="font-bold text-[10px] uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
                            <AlertCircle size={14} /> Persistent Bugs ({existingIssues.length})
                        </h4>
                        <Button variant="outline" size="sm" className="h-7 text-[10px] uppercase font-bold text-black dark:text-white border-black dark:border-white" onClick={() => setShowNewIssueForm(!showNewIssueForm)}>
                            <Plus size={14} className="mr-1" /> New Bug
                        </Button>
                    </div>

                    {showNewIssueForm && (
                        <div className="p-4 border border-red-100 dark:border-red-900/20 bg-red-50/20 dark:bg-red-900/10 rounded-lg space-y-3 animate-in fade-in slide-in-from-top-2">
                            <Input placeholder="Bug Summary" value={newIssue.title} onChange={e => setNewIssue({...newIssue, title: e.target.value})} />
                            <Textarea 
                                placeholder="Actual vs Expected behavior..."
                                value={newIssue.description}
                                onChange={e => setNewIssue({...newIssue, description: e.target.value})}
                                className="bg-white dark:bg-gray-950"
                            />
                            <div className="flex gap-3">
                                <div className="flex-1">
                                <Combobox options={ISSUE_SEVERITY_OPTIONS} value={newIssue.severity} onChange={val => setNewIssue({...newIssue, severity: val as string})} />
                                </div>
                                <Button size="sm" onClick={handleCreateIssue} className="bg-red-600 hover:bg-red-700 text-black dark:text-white border-black dark:border-white">Report</Button>
                            </div>
                        </div>
                    )}

                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
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
                                    <div className="flex items-center gap-2">
                                        <AlertCircle size={14} className={issue.status === 'Closed' ? 'text-gray-400' : 'text-red-500'} />
                                        <div className="text-[11px] font-semibold truncate max-w-[120px] text-black dark:text-white">{issue.title}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
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
                                    <div className="p-3 border-t dark:border-gray-800 bg-gray-50/20 space-y-4">
                                        <div className="space-y-1">
                                            <Label className="text-[10px] font-bold text-gray-400 uppercase text-black dark:text-white">Change Status</Label>
                                            <Combobox 
                                                options={ISSUE_STATUS_OPTIONS} 
                                                value={issue.status} 
                                                onChange={(val) => handleUpdateIssueStatus(issue.issue_id, val as string, issue.severity, issue.title, issue.description)} 
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            {(issueNotes[issue.issue_id] || []).slice(-1).map(note => (
                                                <div key={note.note_id} className="text-[10px] bg-white dark:bg-gray-900 p-2 rounded border dark:border-gray-800 italic">
                                                    "{note.content}"
                                                </div>
                                            ))}
                                            <div className="flex gap-2">
                                                <Input 
                                                    placeholder="Add note..." 
                                                    className="h-7 text-[10px] bg-white dark:bg-gray-950" 
                                                    value={newNoteContent[issue.issue_id] || ''}
                                                    onChange={e => setNewNoteContent({...newNoteContent, [issue.issue_id]: e.target.value})}
                                                />
                                                <Button size="sm" className="h-7 px-3 text-[10px] text-black dark:text-white border-black dark:border-white" onClick={() => handleAddNote(issue.issue_id)}>Post</Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        <div className="flex justify-end pt-4 border-t dark:border-gray-800">
            <Button variant="outline" onClick={onClose} className="px-8 text-black dark:text-white border-black dark:border-white">Close</Button>
        </div>
      </div>
    </Modal>
  );
};
