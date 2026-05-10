"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '../ui';
import { IssueItem } from './IssueItem';
import { 
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

interface IssueDetailDialogProps {
  issueId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export const IssueDetailDialog = ({ issueId, isOpen, onClose, onRefresh }: IssueDetailDialogProps) => {
  const [issue, setIssue] = useState<Issue | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [notes, setNotes] = useState<IssueNote[]>([]);
  const [history, setHistory] = useState<IssueHistoryEntry[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
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

  const fetchTags = useCallback(async () => {
    const res = await fetch('/api/tags');
    const resData = await res.json();
    setTags(resData || []);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
        if (issueId && isOpen) {
            fetchIssueData(issueId);
            fetchUsers();
            fetchTags();
        }
    });
  }, [issueId, isOpen, fetchIssueData, fetchUsers, fetchTags]);

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

  const handleAddNote = async (content: string) => {
    if (!issueId) return;
    await fetch('/api/issues/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ issue_id: issueId, content }),
    });
    fetchIssueData(issueId);
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={issue?.title || 'Loading Issue...'} maxWidth="max-w-7xl">
      {loading && !issue ? (
          <div className="py-20 text-center animate-pulse text-gray-500 font-bold uppercase tracking-widest text-xs">
              Fetching Issue Context...
          </div>
      ) : issue && (
        <IssueItem 
            issue={issue}
            isExpanded={true}
            onToggle={() => {}}
            users={users}
            allTags={tags}
            notes={notes}
            history={history}
            testCases={testCases}
            onUpdate={handleUpdateIssue}
            onAddNote={handleAddNote}
            onCloseParent={onClose}
            compact={false}
        />
      )}
    </Modal>
  );
};
