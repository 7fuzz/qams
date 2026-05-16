"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button, IconButton, Modal, Input, Label, ManagementPage, Column, Combobox } from "@/components/ui";
import { Plus, Trash2, Mail, Server, Shield, Link as LinkIcon, X } from 'lucide-react';

interface MailCredential {
    credential_id: string;
    name: string;
    smtp_user: string;
    smtp_password: string;
}

interface Project {
    project_id: string;
    name: string;
}

export default function MailCredentialManagementPage() {
  const [credentials, setCredentials] = useState<MailCredential[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedCred, setSelectedCred] = useState<MailCredential | null>(null);
  const [formData, setFormData] = useState({ name: '', smtp_user: '', smtp_password: '' });
  
  const [assignedProjects, setAssignedProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');

  const fetchCredentials = useCallback(() => {
    setLoading(true);
    fetch('/api/mail/credentials')
      .then(res => res.json())
      .then(res => {
        setCredentials(Array.isArray(res) ? res : []);
        setLoading(false);
      })
      .catch(() => {
        setCredentials([]);
        setLoading(false);
      });
  }, []);

  const fetchProjects = useCallback(() => {
    fetch('/api/projects')
        .then(res => res.json())
        .then(res => setProjects(res.data || []));
  }, []);

  useEffect(() => {
    fetchCredentials();
    fetchProjects();
  }, [fetchCredentials, fetchProjects]);

  const handleOpenCreate = () => {
    setFormData({ name: '', smtp_user: '', smtp_password: '' });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    const res = await fetch('/api/mail/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
    });

    if (res.ok) {
        setIsModalOpen(false);
        fetchCredentials();
    }
  };

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Are you sure you want to delete this credential? This will also delete all caught emails for it.')) return;
    const res = await fetch(`/api/mail/credentials?id=${id}`, { method: 'DELETE' });
    if (res.ok) fetchCredentials();
  }, [fetchCredentials]);

  const handleOpenAssign = async (cred: MailCredential) => {
    setSelectedCred(cred);
    const res = await fetch(`/api/projects/mail?projectId=dummy&credentialId=${cred.credential_id}`); // Needs a better API or just fetch all projects and filter
    // For simplicity, let's just fetch assigned projects for this credential
    // I'll need a new API route for that or use the existing one with filters
    const assignedRes = await fetch(`/api/projects/mail?credentialId=${cred.credential_id}`);
    const assigned = await assignedRes.json();
    setAssignedProjects(assigned);
    setIsAssignModalOpen(true);
  };

  const handleAssignProject = async () => {
    if (!selectedCred || !selectedProjectId) return;
    const res = await fetch('/api/projects/mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: selectedProjectId, credentialId: selectedCred.credential_id }),
    });
    if (res.ok) {
        // Refresh assigned projects
        const assignedRes = await fetch(`/api/projects/mail?credentialId=${selectedCred.credential_id}`);
        setAssignedProjects(await assignedRes.json());
        setSelectedProjectId('');
    }
  };

  const handleUnassignProject = async (projectId: string) => {
    if (!selectedCred) return;
    const res = await fetch(`/api/projects/mail?projectId=${projectId}&credentialId=${selectedCred.credential_id}`, {
        method: 'DELETE',
    });
    if (res.ok) {
        setAssignedProjects(prev => prev.filter(p => p.project_id !== projectId));
    }
  };

  const columns: Column<MailCredential>[] = [
    { 
        header: 'Credential Name', 
        accessorKey: 'name',
        cell: (cred) => (
            <div className="flex items-center gap-2">
                <Server size={16} className="text-primary-theme" />
                <span className="font-medium text-text-theme-main">{cred.name}</span>
            </div>
        )
    },
    { 
        header: 'SMTP Username', 
        accessorKey: 'smtp_user',
        cell: (cred) => <code className="text-xs bg-surface-theme-subtle px-1.5 py-0.5 rounded text-text-theme-muted">{cred.smtp_user}</code>
    },
    { 
        header: 'SMTP Password', 
        accessorKey: 'smtp_password',
        cell: (cred) => <code className="text-xs bg-surface-theme-subtle px-1.5 py-0.5 rounded text-text-theme-muted">••••••••</code>
    },
    { 
      header: 'Actions', 
      className: 'text-right',
      cell: (cred) => (
        <div className="flex gap-1 justify-end">
          <IconButton icon={LinkIcon} size="sm" variant="ghost" className="text-primary-theme" onClick={() => handleOpenAssign(cred)} title="Assign to Projects" />
          <IconButton icon={Trash2} size="sm" variant="ghost" className="text-danger-theme" onClick={() => handleDelete(cred.credential_id)} title="Delete" />
        </div>
      )
    },
  ];

  return (
    <>
      <ManagementPage
        title="Mail Catcher Administration"
        description="Manage SMTP credentials for catching development emails."
        icon={Mail}
        primaryAction={
            <Button onClick={handleOpenCreate} className="shadow-lg shadow-primary-theme/20">
                <Plus size={18} className="mr-2" /> Add Credential
            </Button>
        }
        data={credentials}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search credentials..."
      />

      {/* Create Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="New SMTP Credential"
      >
        <div className="space-y-4">
            <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-text-theme-muted">Display Name</Label>
                <Input 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    placeholder="e.g. Development Server"
                />
            </div>
            <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-text-theme-muted">SMTP Username</Label>
                <Input 
                    value={formData.smtp_user} 
                    onChange={e => setFormData({...formData, smtp_user: e.target.value})} 
                    placeholder="Unique username"
                />
            </div>
            <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-text-theme-muted">SMTP Password</Label>
                <Input 
                    type="password"
                    value={formData.smtp_password} 
                    onChange={e => setFormData({...formData, smtp_password: e.target.value})} 
                    placeholder="Password"
                />
            </div>
            <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button onClick={handleSave}>Create</Button>
            </div>
        </div>
      </Modal>

      {/* Assign Modal */}
      <Modal 
        isOpen={isAssignModalOpen} 
        onClose={() => setIsAssignModalOpen(false)} 
        title={`Assign Projects: ${selectedCred?.name}`}
      >
        <div className="space-y-6">
            <div className="flex gap-2">
                <div className="flex-1">
                    <Combobox 
                        options={projects
                            .filter(p => !assignedProjects.find(ap => ap.project_id === p.project_id))
                            .map(p => ({ value: p.project_id, label: p.name }))}
                        value={selectedProjectId}
                        onChange={val => setSelectedProjectId(val as string)}
                        placeholder="Select project to link..."
                    />
                </div>
                <Button onClick={handleAssignProject} disabled={!selectedProjectId}>
                    <Plus size={18} />
                </Button>
            </div>

            <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-text-theme-muted">Linked Projects</Label>
                <div className="border border-border-theme rounded-lg divide-y divide-border-theme bg-surface-theme-subtle">
                    {assignedProjects.length === 0 ? (
                        <div className="p-4 text-center text-sm text-text-theme-muted italic">No projects linked yet</div>
                    ) : (
                        assignedProjects.map(p => (
                            <div key={p.project_id} className="p-3 flex items-center justify-between">
                                <span className="text-sm font-medium text-text-theme-main">{p.name}</span>
                                <IconButton 
                                    icon={X} 
                                    size="sm" 
                                    variant="ghost" 
                                    className="text-text-theme-muted hover:text-danger-theme" 
                                    onClick={() => handleUnassignProject(p.project_id)}
                                />
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <Button variant="outline" onClick={() => setIsAssignModalOpen(false)}>Close</Button>
            </div>
        </div>
      </Modal>
    </>
  );
}
