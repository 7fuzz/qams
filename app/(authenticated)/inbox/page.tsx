"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button, IconButton, Modal, ManagementPage, Column, Combobox, Label } from "@/components/ui";
import { Mail, Trash2, Eye, RefreshCw, Clock, User, Paperclip, Download, Settings2, Eraser } from 'lucide-react';

interface CaughtEmail {
  email_id: string;
  sender: string;
  recipient: string;
  subject: string;
  body_text: string;
  body_html: string;
  created_at: string;
  attachments?: { attachment_id: string, name: string, url: string }[];
}

interface Project {
  project_id: string;
  name: string;
}

export default function MailInboxPage() {
  const [emails, setEmails] = useState<CaughtEmail[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  
  const [selectedEmail, setSelectedEmail] = useState<CaughtEmail | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const fetchProjects = useCallback(() => {
    fetch('/api/projects?limit=1000')
      .then(res => res.json())
      .then(res => {
        const data = res.data || [];
        setProjects(data);
      });
  }, []);

  const fetchEmails = useCallback(() => {
    setLoading(true);
    const url = selectedProjectId === 'all' 
        ? '/api/projects/emails?projectId=all' 
        : `/api/projects/emails?projectId=${selectedProjectId}`;
        
    fetch(url)
      .then(res => res.json())
      .then(res => {
        setEmails(Array.isArray(res) ? res : []);
        setLoading(false);
      })
      .catch(() => {
        setEmails([]);
        setLoading(false);
      });
  }, [selectedProjectId]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this email?')) return;
    const res = await fetch(`/api/projects/emails?id=${id}`, { method: 'DELETE' });
    if (res.ok) fetchEmails();
  };

  const handleView = (email: CaughtEmail) => {
    setSelectedEmail(email);
    setIsViewModalOpen(true);
  };

  const handleClearInbox = async () => {
    if (!selectedProjectId) return;
    if (!confirm('Are you sure you want to delete ALL emails for this project? This cannot be undone.')) return;
    
    const res = await fetch(`/api/projects/emails/clear?projectId=${selectedProjectId}`, { method: 'DELETE' });
    if (res.ok) fetchEmails();
  };

  const columns: Column<CaughtEmail>[] = [
    { 
        header: 'Subject', 
        accessorKey: 'subject',
        cell: (email) => (
            <div className="flex flex-col">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-text-theme-main">{email.subject}</span>
                    {email.attachments && email.attachments.length > 0 && (
                        <Paperclip size={12} className="text-primary-theme" />
                    )}
                </div>
                <span className="text-[10px] text-text-theme-muted uppercase font-bold flex items-center gap-1">
                    <User size={10} /> {email.sender}
                </span>
            </div>
        )
    },
    { 
        header: 'Recipient', 
        accessorKey: 'recipient',
        cell: (email) => <span className="text-sm text-text-theme-muted">{email.recipient}</span>
    },
    {
        header: 'Project',
        accessorKey: 'project_name',
        cell: (email) => (
            <div className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                email.project_name ? "bg-primary-theme/10 text-primary-theme" : "bg-surface-theme-subtle text-text-theme-subtle"
            }`}>
                {email.project_name || "Unassigned"}
            </div>
        )
    },
    { 
        header: 'Received', 
        accessorKey: 'created_at',
        width: 180,
        cell: (email) => (
            <div className="flex items-center gap-2 text-text-theme-subtle">
                <Clock size={14} />
                <span className="text-xs">{new Date(email.created_at).toLocaleString()}</span>
            </div>
        )
    },
    { 
      header: 'Actions', 
      className: 'text-right',
      width: 100,
      cell: (email) => (
        <div className="flex gap-1 justify-end">
          <IconButton icon={Eye} size="sm" variant="ghost" className="text-primary-theme" onClick={() => handleView(email)} title="View Email" />
          <IconButton icon={Trash2} size="sm" variant="ghost" className="text-danger-theme" onClick={() => handleDelete(email.email_id)} title="Delete" />
        </div>
      )
    },
  ];

  return (
    <>
      <ManagementPage
        title="Mail Catcher"
        description="Monitor and inspect development emails in real-time."
        icon={Mail}
        primaryAction={
            <div className="flex items-center gap-3">
                <div className="w-64">
                    <Combobox 
                        options={[
                            { value: 'all', label: 'All Projects' },
                            ...projects.map(p => ({ value: p.project_id, label: p.name }))
                        ]}
                        value={selectedProjectId}
                        onChange={val => setSelectedProjectId(val as string)}
                        placeholder="Select Project..."
                    />
                </div>
                <div className="h-8 w-px bg-border-theme mx-1" /> {/* Separator */}
                <Button variant="outline" size="sm" onClick={fetchEmails} disabled={loading} title="Refresh">
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                </Button>
                <Button variant="outline" size="sm" onClick={handleClearInbox} disabled={loading || emails.length === 0} className="text-danger-theme hover:bg-danger-theme/10" title="Clear Inbox">
                    <Eraser size={16} />
                </Button>
            </div>
        }
        data={emails}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search inbox..."
      />

      <Modal 
        isOpen={isViewModalOpen} 
        onClose={() => setIsViewModalOpen(false)} 
        title={selectedEmail?.subject || 'View Email'}
        size="lg"
      >
        {selectedEmail && (
            <div className="space-y-6">
                <div className="bg-surface-theme-subtle p-4 rounded-lg border border-border-theme space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-text-theme-muted uppercase w-16">From:</span>
                        <span className="text-text-theme-main">{selectedEmail.sender}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-text-theme-muted uppercase w-16">To:</span>
                        <span className="text-text-theme-main">{selectedEmail.recipient}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs border-t border-border-theme pt-2 mt-2">
                        <Clock size={12} className="text-text-theme-muted" />
                        <span className="text-text-theme-muted">{new Date(selectedEmail.created_at).toLocaleString()}</span>
                    </div>
                </div>

                {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-text-theme-muted">Attachments</Label>
                        <div className="grid grid-cols-2 gap-2">
                            {selectedEmail.attachments.map(att => (
                                <a 
                                    key={att.attachment_id} 
                                    href={att.url} 
                                    download={att.name}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-between p-2 text-xs bg-surface-theme-subtle border border-border-theme rounded hover:bg-surface-accent transition-colors"
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <Paperclip size={14} className="text-text-theme-muted" />
                                        <span className="truncate font-medium">{att.name}</span>
                                    </div>
                                    <Download size={14} className="text-primary-theme shrink-0" />
                                </a>
                            ))}
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-text-theme-muted">Content</Label>
                    <div className="border border-border-theme rounded-lg bg-surface-theme-subtle overflow-hidden min-h-[300px]">
                        {selectedEmail.body_html ? (
                            <iframe 
                                srcDoc={`<style>body { background: white; color: black; font-family: sans-serif; padding: 1rem; margin: 0; }</style>${selectedEmail.body_html}`} 
                                className="w-full h-[400px] border-none"
                                title="Email Body"
                            />
                        ) : (
                            <pre className="p-4 text-sm whitespace-pre-wrap font-sans text-text-theme-main">
                                {selectedEmail.body_text}
                            </pre>
                        )}
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>Close</Button>
                </div>
            </div>
        )}
      </Modal>
    </>
  );
}
