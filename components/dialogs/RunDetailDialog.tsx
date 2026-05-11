"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../ui';
import { AlertCircle, User, LayoutPanelTop, Calendar, Send } from 'lucide-react';
import { ISSUE_STATUS } from '@/lib/constants';
import { TestRun as Run } from '@/types/app';

interface RunIssue {
  issue_id: string;
  title: string;
  status: string;
  severity: string;
  reporter_name: string;
  created_at: string;
}

interface RunDetailDialogProps {
  run: Run | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RunDetailDialog = ({ run, isOpen, onClose }: RunDetailDialogProps) => {
  const [issues, setIssues] = useState<RunIssue[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchIssues = useCallback(() => {
    if (run) {
      setLoading(true);
      fetch(`/api/issues?runId=${run.run_id}`)
        .then(res => res.json())
        .then(res => {
          setIssues(res.data || []);
          setLoading(false);
        });
    }
  }, [run]);

  useEffect(() => {
    queueMicrotask(() => {
        if (run && isOpen) {
            fetchIssues();
        }
    });
  }, [run, isOpen, fetchIssues]);

  if (!run) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Run Details: ${run.name}`}>
      <div className="space-y-8">
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border dark:border-gray-800">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Project Info</span>
                <div className="mt-2 space-y-1">
                    <p className="text-sm font-bold flex items-center gap-1.5"><LayoutPanelTop size={14} className="text-blue-500" /> {run.project_name}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1.5"><User size={14} /> Owner: {run.project_owner}</p>
                </div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border dark:border-gray-800">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Progress</span>
                <div className="mt-2 flex items-end justify-between">
                    <p className="text-2xl font-bold">{Math.round((run.passed_count / (run.total_cases || 1)) * 100) || 0}%</p>
                    <p className="text-xs text-gray-500">{run.passed_count} / {run.total_cases} Passed</p>
                </div>
                <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-green-500 transition-all" style={{ width: `${(run.passed_count / (run.total_cases || 1)) * 100 || 0}%` }}></div>
                </div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border dark:border-gray-800">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Timeline</span>
                <div className="mt-2 space-y-1">
                    <p className="text-xs flex items-center gap-1.5 text-gray-600 dark:text-gray-400"><Calendar size={14} /> Started: {new Date(run.created_at).toLocaleDateString()}</p>
                    {run.requested_by_name && (
                        <p className="text-[10px] flex items-center gap-1.5 text-gray-500 dark:text-gray-500 italic"><Send size={12} /> Req. by: {run.requested_by_name}</p>
                    )}
                </div>
            </div>
        </div>

        {/* Issues List */}
        <section className="space-y-4">
            <div className="flex items-center justify-between border-b dark:border-gray-800 pb-2">
                <h4 className="font-bold text-sm uppercase tracking-widest text-gray-500 flex items-center gap-2">
                    <AlertCircle size={16} className="text-red-500" /> Active Issues ({issues.length})
                </h4>
            </div>

            {loading ? (
                <div className="py-8 text-center text-gray-500 text-sm">Loading issues history...</div>
            ) : issues.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-sm italic bg-gray-50/50 dark:bg-gray-900/10 rounded-lg border border-dashed">
                    No issues found for this run.
                </div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Issue Title</TableHead>
                            <TableHead>Severity</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Reported By</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {issues.map(issue => (
                            <TableRow key={issue.issue_id}>
                                <TableCell className="font-medium text-sm">{issue.title}</TableCell>
                                <TableCell className="text-xs text-gray-500">{issue.severity}</TableCell>
                                <TableCell>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${issue.status === ISSUE_STATUS.CLOSED ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {issue.status}
                                    </span>
                                </TableCell>
                                <TableCell className="text-xs text-gray-500">{issue.reporter_name}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </section>

        <div className="flex justify-end pt-4 border-t dark:border-gray-800">
            <Button onClick={onClose}>Close Summary</Button>
        </div>
      </div>
    </Modal>
  );
};
