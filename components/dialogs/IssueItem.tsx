"use client";

import React, { useState } from 'react';
import { Button, Label, Input, Combobox, Textarea, AttachmentManager } from '../ui';
import { 
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
    ArrowRight,
    MessageSquare
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

interface IssueItemProps {
  issue: Issue;
  isExpanded: boolean;
  onToggle: () => void;
  users: User[];
  notes: IssueNote[];
  history: IssueHistoryEntry[];
  testCases: TestCase[];
  onUpdate: (data: Partial<Issue>) => Promise<void>;
  onAddNote: (content: string) => Promise<void>;
  onCloseParent: () => void;
  compact?: boolean;
}

export const IssueItem = ({ 
    issue, 
    isExpanded, 
    onToggle, 
    users, 
    notes, 
    history, 
    testCases, 
    onUpdate, 
    onAddNote,
    onCloseParent,
    compact = false
}: IssueItemProps) => {
  const [expandedTestCaseId, setExpandedTestCaseId] = useState<string | null>(null);
  const [newNoteContent, setNewNoteContent] = useState('');
  
  const userOptions = users.map(u => ({ value: u.user_id, label: u.name }));

  const handleAddNoteInternal = async () => {
      if (!newNoteContent) return;
      await onAddNote(newNoteContent);
      setNewNoteContent('');
  };

  return (
    <div className={`border border-border-theme rounded-xl overflow-hidden bg-white dark:bg-gray-950 ${isExpanded ? 'ring-1 ring-primary-theme/20 shadow-lg' : ''}`}>
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-4">
          {issue.status === ISSUE_STATUS.CLOSED ? (
            <ShieldCheck size={20} className="text-success-theme" />
          ) : (
            <div className={`w-2.5 h-2.5 rounded-full ${
                issue.severity.includes('Critical') || issue.severity.includes('High') ? 'bg-danger-theme' : 'bg-primary-theme'
            }`} />
          )}
          <div>
            <div className={`font-bold text-sm text-text-theme-main ${issue.status === ISSUE_STATUS.CLOSED ? 'line-through opacity-50' : ''}`}>{issue.title}</div>
            <div className="text-[10px] text-text-theme-muted flex flex-wrap gap-x-2 gap-y-0.5 font-bold uppercase tracking-wider mt-0.5">
              <span className={issue.severity.includes('Critical') ? 'text-danger-theme' : ''}>{issue.severity}</span>
              <span className="opacity-30">•</span>
              <span className="text-primary-theme">{issue.status}</span>
              {issue.developer_name && (
                <>
                    <span className="opacity-30">•</span>
                    <span className="flex items-center gap-1"><UserCheck size={10} /> {issue.developer_name}</span>
                </>
              )}
            </div>
          </div>
        </div>
        {isExpanded ? <ChevronUp size={18} className="text-text-theme-muted" /> : <ChevronDown size={18} className="text-text-theme-muted" />}
      </div>

      {isExpanded && (
        <div className={`p-6 border-t border-border-theme bg-surface-muted/10 ${compact ? 'space-y-6' : 'space-y-8'}`}>
          
          <div className={`grid grid-cols-1 ${compact ? '' : 'lg:grid-cols-3'} gap-8`}>
            {/* Main Content Area */}
            <div className={compact ? 'space-y-6' : 'lg:col-span-2 space-y-8'}>
                {/* Header Info */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-text-theme-muted uppercase tracking-tight">
                        <UserCheck size={14} className="text-primary-theme" /> Reported by: {issue.reporter_name}
                    </div>
                    <span className="text-gray-400 opacity-30">•</span>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-text-theme-muted uppercase tracking-tight">
                        <Calendar size={14} className="text-primary-theme" /> {new Date(issue.created_at).toLocaleDateString()}
                    </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-text-theme-subtle">Issue Description</Label>
                    <div className="p-4 bg-surface rounded-xl border border-border-theme text-sm leading-relaxed whitespace-pre-wrap italic text-text-theme-muted">
                        {issue.description}
                    </div>
                </div>

                {/* Triage & Dates Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-primary-theme/5 rounded-2xl border border-primary-theme/10">
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-primary-theme flex items-center gap-2">
                            <ShieldCheck size={14} /> Triage
                        </h4>
                        <div className="grid gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold text-text-theme-muted uppercase">Status</Label>
                                <Combobox 
                                    options={ISSUE_STATUS_OPTIONS} 
                                    value={issue.status} 
                                    onChange={(val) => onUpdate({ status: val as IssueStatus })} 
                                    className="bg-surface h-9"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold text-text-theme-muted uppercase">Assigned Developer</Label>
                                <Combobox 
                                    options={userOptions} 
                                    value={issue.developer_id} 
                                    onChange={(val) => onUpdate({ developer_id: val as string })} 
                                    placeholder="Assign..."
                                    className="bg-surface h-9"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-primary-theme flex items-center gap-2">
                            <Calendar size={14} /> Dates
                        </h4>
                        <div className="grid gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold text-text-theme-muted uppercase">SLA Date</Label>
                                <Input 
                                    type="date" 
                                    value={issue.sla_date ? issue.sla_date.split('T')[0] : ''} 
                                    onChange={(e) => onUpdate({ sla_date: e.target.value })} 
                                    className="bg-surface h-9 text-xs"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold text-text-theme-muted uppercase">Actual Date</Label>
                                <Input 
                                    type="date" 
                                    value={issue.actual_date ? issue.actual_date.split('T')[0] : ''} 
                                    onChange={(e) => onUpdate({ actual_date: e.target.value })} 
                                    className="bg-surface h-9 text-xs"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Context: Test Cases & Runs */}
                <div className={`grid grid-cols-1 ${compact ? '' : 'md:grid-cols-2'} gap-8`}>
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
                                        <div className="flex flex-col gap-0.5">
                                            <div className="flex items-center gap-2 text-xs font-bold text-primary-theme">
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary-theme" />
                                                {tc.title}
                                            </div>
                                            <span className="text-[9px] font-mono text-text-theme-subtle ml-3.5 uppercase tracking-tighter">{tc.custom_id || 'TC-NEW'}</span>
                                        </div>
                                        {expandedTestCaseId === tc.test_case_id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                    </div>
                                    {expandedTestCaseId === tc.test_case_id && (
                                        <div className="px-3 pb-3 pt-1 border-t border-border-theme bg-surface-muted/30 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200 text-black dark:text-white">
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
                                                onClick={onCloseParent}
                                            >
                                                Full Trace <ExternalLink size={10} />
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-text-theme-muted flex items-center gap-2 border-b border-border-theme pb-2">
                            <History size={14} /> Affected Run History
                        </h4>
                        <div className="space-y-2">
                            {history.map(entry => (
                                <div key={entry.history_id} className="flex items-center justify-between text-[10px] p-2.5 bg-surface border border-border-theme rounded-xl">
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center gap-2">
                                            {entry.run_id ? (
                                                <Link 
                                                    href={`/runs/${entry.run_id}`} 
                                                    className="font-bold text-primary-theme hover:underline flex items-center gap-1"
                                                    onClick={onCloseParent}
                                                >
                                                    {entry.run_name}
                                                </Link>
                                            ) : (
                                                <span className="font-bold text-text-theme-subtle text-black dark:text-white">Manual Update</span>
                                            )}
                                            <ArrowRight size={10} className="text-text-theme-muted" />
                                            <span className={`font-black uppercase tracking-tighter ${
                                                entry.status === ISSUE_STATUS.CLOSED ? 'text-success-theme' : 'text-danger-theme'
                                            }`}>{entry.status}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-[9px] font-bold text-text-theme-subtle uppercase">
                                            <UserCheck size={10} className="text-primary-theme" /> {entry.user_name}
                                        </div>
                                    </div>
                                    <span className="text-[9px] font-bold text-text-theme-subtle">{new Date(entry.timestamp).toLocaleDateString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Interaction Hub (Notes) */}
            <div className={compact ? 'space-y-6 pt-6 border-t border-border-theme' : 'space-y-8 bg-surface-muted/30 p-6 rounded-2xl border border-border-theme'}>
                {/* Notes Thread */}
                <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-text-theme-muted flex items-center gap-2">
                        <MessageSquare size={14} /> Activity Thread
                    </h4>
                    
                    <div className={`space-y-4 overflow-y-auto pr-2 scrollbar-none ${compact ? 'max-h-[250px]' : 'max-h-[500px]'}`}>
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
                            <div className="py-8 text-center text-xs text-text-theme-muted italic">No comments yet.</div>
                        )}
                    </div>

                    <div className="flex flex-col gap-2 pt-2">
                        <Textarea 
                            placeholder="Add update..." 
                            className="text-xs bg-surface min-h-[80px] resize-none border-border-theme" 
                            value={newNoteContent}
                            onChange={e => setNewNoteContent(e.target.value)}
                        />
                        <Button size="sm" onClick={handleAddNoteInternal} disabled={!newNoteContent} className="font-bold uppercase tracking-widest text-[10px]">
                            Post Update
                        </Button>
                    </div>
                </div>

                {!compact && (
                    <div className="space-y-4 pt-4 border-t border-border-theme">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-text-theme-muted flex items-center gap-2">
                            <FileText size={14} /> Artifacts
                        </h4>
                        <AttachmentManager entityId={issue.issue_id} entityType="ISSUE" />
                    </div>
                )}
            </div>
          </div>

          {compact && (
            <div className="pt-6 border-t border-border-theme">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-text-theme-muted mb-4">Artifacts & Proof</h4>
                <AttachmentManager entityId={issue.issue_id} entityType="ISSUE" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
