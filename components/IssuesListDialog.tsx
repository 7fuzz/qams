"use client";

import React, { useState, useEffect } from 'react';
import { Modal, Button, Label, Input, Combobox, Textarea } from './ui';
import { AlertCircle, MessageSquare, Plus, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { 
  ISSUE_SEVERITY_OPTIONS,
  ISSUE_STATUS_OPTIONS,
  ISSUE_STATUS,
  ISSUE_SEVERITY,
  IssueStatus,
  IssueSeverity
} from '@/lib/constants';

interface Issue {
  issue_id: number;
  test_case_id: number;
  title: string;
  description: string;
  severity: IssueSeverity;
  status: IssueStatus;
  reporter_name: string;
  created_at: string;
}

interface IssueNote {
  note_id: number;
  content: string;
  user_name: string;
  created_at: string;
}

interface IssuesListDialogProps {
  testCaseId: number | null;
  testCaseTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export const IssuesListDialog = ({ testCaseId, testCaseTitle, isOpen, onClose, onRefresh }: IssuesListDialogProps) => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [expandedIssueId, setExpandedIssueId] = useState<number | null>(null);
  const [issueNotes, setIssueNotes] = useState<Record<number, IssueNote[]>>({});
  const [showNewIssueForm, setShowNewIssueForm] = useState(false);
  const [newIssue, setNewIssue] = useState({ title: '', description: '', severity: ISSUE_SEVERITY.MEDIUM as string });
  const [newNoteContent, setNewNoteContent] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);

  const fetchIssues = async () => {
    if (!testCaseId) return;
    const res = await fetch(`/api/issues?testCaseId=${testCaseId}`);
    const data = await res.json();
    setIssues(data);
  };

  const fetchNotes = async (issueId: number) => {
    const res = await fetch(`/api/issues/notes?issueId=${issueId}`);
    const data = await res.json();
    setIssueNotes(prev => ({ ...prev, [issueId]: data }));
  };

  useEffect(() => {
    if (testCaseId && isOpen) {
      fetchIssues();
      setShowNewIssueForm(false);
      setExpandedIssueId(null);
    }
  }, [testCaseId, isOpen]);

  const handleCreateIssue = async () => {
    if (!newIssue.title || !testCaseId) return;
    await fetch('/api/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test_case_id: testCaseId, ...newIssue }),
    });
    setNewIssue({ title: '', description: '', severity: ISSUE_SEVERITY.MEDIUM });
    setShowNewIssueForm(false);
    fetchIssues();
    onRefresh();
  };

  const handleUpdateIssue = async (issueId: number, data: Partial<Issue>) => {
    await fetch('/api/issues', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ issue_id: issueId, ...data }),
    });
    fetchIssues();
    onRefresh();
  };

  const handleAddNote = async (issueId: number) => {
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

  if (!testCaseId) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Issues for: ${testCaseTitle}`}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-sm uppercase tracking-widest text-gray-500">Persistent Issues ({issues.length})</h4>
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
            <div className="flex gap-3">
              <div className="flex-1">
                <Combobox options={ISSUE_SEVERITY_OPTIONS} value={newIssue.severity} onChange={val => setNewIssue({...newIssue, severity: val as string})} />
              </div>
              <Button size="sm" onClick={handleCreateIssue}>Report Issue</Button>
            </div>
          </div>
        )}

        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
          {issues.length === 0 && !showNewIssueForm && (
            <div className="text-center py-12 text-gray-400 italic text-sm">No issues reported for this test case.</div>
          )}
          {issues.map(issue => (
            <div key={issue.issue_id} className="border dark:border-gray-800 rounded-lg overflow-hidden bg-white dark:bg-gray-950">
              <div 
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                onClick={() => {
                  if (expandedIssueId === issue.issue_id) {
                      setExpandedIssueId(null);
                  } else {
                      setExpandedIssueId(issue.issue_id);
                      fetchNotes(issue.issue_id);
                  }
                }}
              >
                <div className="flex items-center gap-3">
                  {issue.status === ISSUE_STATUS.CLOSED ? (
                    <CheckCircle2 size={16} className="text-green-500" />
                  ) : (
                    <AlertCircle size={16} className="text-red-500" />
                  )}
                  <div>
                    <div className={`text-sm font-semibold ${issue.status === ISSUE_STATUS.CLOSED ? 'line-through text-gray-400' : ''}`}>{issue.title}</div>
                    <div className="text-[10px] text-gray-500 flex gap-2">
                      <span>{issue.severity}</span>
                      <span>•</span>
                      <span>{issue.status}</span>
                    </div>
                  </div>
                </div>
                {expandedIssueId === issue.issue_id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>

              {expandedIssueId === issue.issue_id && (
                <div className="p-4 border-t dark:border-gray-800 bg-gray-50/30 space-y-4">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Description</Label>
                    <Textarea 
                      value={issue.description} 
                      onChange={e => handleUpdateIssue(issue.issue_id, { description: e.target.value })}
                      className="text-xs bg-white dark:bg-gray-900"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-[10px]">Status</Label>
                      <Combobox 
                        options={ISSUE_STATUS_OPTIONS} 
                        value={issue.status} 
                        onChange={(val) => handleUpdateIssue(issue.issue_id, { status: val as IssueStatus })} 
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Severity</Label>
                      <Combobox 
                        options={ISSUE_SEVERITY_OPTIONS} 
                        value={issue.severity} 
                        onChange={(val) => handleUpdateIssue(issue.issue_id, { severity: val as IssueSeverity })} 
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                      <MessageSquare size={12} /> Notes
                    </div>
                    <div className="space-y-2">
                      {(issueNotes[issue.issue_id] || []).map(note => (
                        <div key={note.note_id} className="text-xs bg-white dark:bg-gray-900 p-2 rounded border dark:border-gray-800">
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
                        placeholder="Add a note..." 
                        className="h-8 text-xs" 
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

        <div className="flex justify-end border-t dark:border-gray-800 pt-6">
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </Modal>
  );
};
