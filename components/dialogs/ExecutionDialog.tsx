"use client";

import React, { useState, useEffect } from 'react';
import { Modal, Button, Label, Input, Combobox, Textarea } from '../ui';
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
    // Simply update the issue with its current data but pass execution_id to trigger a history log
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
        {/* Test Case Info - Compact */}
        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-xs border dark:border-gray-800 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <span className="font-bold text-gray-400 uppercase tracking-widest text-[10px]">Steps</span>
            <p className="mt-1 whitespace-pre-wrap">{execution.steps}</p>
          </div>
          <div>
            <span className="font-bold text-gray-400 uppercase tracking-widest text-[10px]">Expected</span>
            <p className="mt-1">{execution.expected_result}</p>
          </div>
          <div>
            <span className="font-bold text-gray-400 uppercase tracking-widest text-[10px]">Precondition</span>
            <p className="mt-1">{execution.precondition || 'None'}</p>
          </div>
        </div>

        {/* Execution Status */}
        <div className="flex gap-4 items-end">
          <div className="flex-1 space-y-2">
            <Label>Resulting Status</Label>
            <Combobox options={TEST_STATUS_OPTIONS} value={status} onChange={(val) => setStatus(val as string)} />
          </div>
          <Button onClick={handleSaveExecution} disabled={loading} className="px-8 shadow-lg shadow-blue-500/20">
            {loading ? 'Saving...' : 'Save Results'}
          </Button>
        </div>

        <div className="space-y-2">
          <Label>Execution Notes</Label>
          <Textarea 
            placeholder="Minor adjustments or results..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Issues Section */}
        <div className="space-y-4 border-t dark:border-gray-800 pt-6">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-[10px] uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
                <AlertCircle size={14} /> Persistent Bugs ({existingIssues.length})
            </h4>
            <Button variant="outline" size="sm" className="h-7 text-[10px] uppercase font-bold" onClick={() => setShowNewIssueForm(!showNewIssueForm)}>
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
                <Button size="sm" onClick={handleCreateIssue} className="bg-red-600 hover:bg-red-700">Report</Button>
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
                            className="h-7 text-[10px] text-orange-600 bg-orange-50 dark:bg-orange-900/10 hover:bg-orange-100"
                            onClick={(e) => { e.stopPropagation(); handleLogObservation(issue); }}
                        >
                            <History size={12} className="mr-1" /> Still Present
                        </Button>
                    )}
                    {expandedIssueId === issue.issue_id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {expandedIssueId === issue.issue_id && (
                  <div className="p-4 border-t dark:border-gray-800 bg-gray-50/20 space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 italic">{issue.description}</p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-gray-400 uppercase">Change Status</Label>
                        <Combobox 
                          options={ISSUE_STATUS_OPTIONS} 
                          value={issue.status} 
                          onChange={(val) => handleUpdateIssueStatus(issue.issue_id, val as string, issue.severity, issue.title, issue.description)} 
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-gray-400 uppercase">Change Severity</Label>
                        <Combobox 
                          options={ISSUE_SEVERITY_OPTIONS} 
                          value={issue.severity} 
                          onChange={(val) => handleUpdateIssueStatus(issue.issue_id, issue.status, val as string, issue.title, issue.description)} 
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                        <MessageSquare size={12} /> Notes Thread
                      </div>
                      <div className="space-y-2">
                        {(issueNotes[issue.issue_id] || []).map(note => (
                          <div key={note.note_id} className="text-[11px] bg-white dark:bg-gray-900 p-2 rounded border dark:border-gray-800">
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
                          placeholder="Add detail..." 
                          className="h-8 text-xs bg-white dark:bg-gray-950" 
                          value={newNoteContent[issue.issue_id] || ''}
                          onChange={e => setNewNoteContent({...newNoteContent, [issue.issue_id]: e.target.value})}
                        />
                        <Button size="sm" className="h-8" onClick={() => handleAddNote(issue.issue_id)}>Post</Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};
