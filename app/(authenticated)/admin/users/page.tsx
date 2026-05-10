"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button, IconButton, Modal, Input, Label, Combobox, ManagementPage, Column } from "@/components/ui";
import { Plus, Edit2, Trash2, Shield, User as UserIcon, Mail, Key } from 'lucide-react';

interface User {
    user_id: string;
    name: string;
    email: string;
    role_name: string;
    role_id: string;
}

interface Role {
    role_id: string;
    name: string;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Partial<User> | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role_id: '' });

  const fetchUsers = useCallback(() => {
    setLoading(true);
    fetch(`/api/users?page=${page}&limit=${limit}`)
      .then(res => res.json())
      .then(res => {
        setUsers(res.data || []);
        setTotal(res.total || 0);
        setLoading(false);
      })
      .catch(() => {
        setUsers([]);
        setLoading(false);
      });
  }, [page, limit]);

  const fetchRoles = useCallback(() => {
    fetch('/api/roles')
        .then(res => res.json())
        .then(setRoles);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      fetchUsers();
    });
  }, [fetchUsers]);

  useEffect(() => {
    queueMicrotask(() => {
      fetchRoles();
    });
  }, [fetchRoles]);

  const handleOpenCreate = () => {
    setSelectedUser(null);
    setFormData({ name: '', email: '', password: '', role_id: roles[0]?.role_id || '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setSelectedUser(user);
    setFormData({ name: user.name, email: user.email, password: '', role_id: user.role_id });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    const isEdit = !!selectedUser;
    const url = '/api/users';
    const method = isEdit ? 'PUT' : 'POST';
    const body = isEdit ? { ...formData, user_id: selectedUser.user_id } : formData;

    const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (res.ok) {
        setIsModalOpen(false);
        fetchUsers();
    }
  };

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
    if (res.ok) fetchUsers();
  }, [fetchUsers]);

  const columns: Column<User>[] = [
    { 
        header: 'Full Name', 
        accessorKey: 'name',
        width: 300,
        minWidth: 200,
        cell: (user) => (
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary-theme/10 text-primary-theme flex items-center justify-center text-xs font-bold uppercase">
                    {user.name?.charAt(0)}
                </div>
                <span className="font-medium text-text-theme-main">{user.name}</span>
            </div>
        )
    },
    { 
        header: 'Email Address', 
        accessorKey: 'email',
        width: 300,
        minWidth: 200,
        cell: (user) => <span className="text-text-theme-muted">{user.email}</span>
    },
    { 
        header: 'System Role', 
        accessorKey: 'role_name',
        width: 200,
        minWidth: 150,
        cell: (user) => (
            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase gap-1.5 ${
                user.role_name === 'Admin' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 
                user.role_name === 'Developer' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 
                'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            }`}>
                <Shield size={12} />
                {user.role_name}
            </div>
        )
    },
    { 
      header: 'Actions', 
      className: 'text-right',
      width: 120,
      minWidth: 100,
      pin: 'right',
      cell: (user) => (
        <div className="flex gap-1 justify-end">
          <IconButton icon={Edit2} size="sm" variant="ghost" className="text-primary-theme" aria-label="Edit user" onClick={() => handleOpenEdit(user)} title="Edit" />
          <IconButton icon={Trash2} size="sm" variant="ghost" className="text-danger-theme" aria-label="Delete user" onClick={() => handleDelete(user.user_id)} title="Delete" />
        </div>
      )
    },
  ];

  return (
    <>
      <ManagementPage
        title="User Administration"
        description="Manage system access, roles, and contributor profiles."
        icon={UserIcon}
        primaryAction={
            <Button onClick={handleOpenCreate} className="shadow-lg shadow-primary-theme/20">
                <Plus size={18} className="mr-2" /> Add Account
            </Button>
        }
        data={users}
        columns={columns}
        loading={loading}
        totalItems={total}
        currentPage={page}
        pageSize={limit}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setLimit(s); setPage(1); }}
        searchPlaceholder="Search users..."
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={selectedUser ? `Edit Account: ${selectedUser.name}` : 'Provision New Account'}
      >
        <div className="space-y-6">
            <div className="space-y-4">
                <div className="grid gap-4">
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-text-theme-muted text-[10px] font-bold uppercase tracking-widest"><UserIcon size={12} /> Full Name</Label>
                        <Input 
                            value={formData.name} 
                            onChange={e => setFormData({...formData, name: e.target.value})} 
                            placeholder="John Doe"
                            className="bg-surface text-text-theme-main"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-text-theme-muted text-[10px] font-bold uppercase tracking-widest"><Mail size={12} /> Email Address</Label>
                        <Input 
                            type="email"
                            value={formData.email} 
                            onChange={e => setFormData({...formData, email: e.target.value})} 
                            placeholder="john@example.com"
                            className="bg-surface text-text-theme-main"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-text-theme-muted text-[10px] font-bold uppercase tracking-widest"><Shield size={12} /> System Role</Label>
                        <Combobox 
                            options={roles.map(r => ({ value: r.role_id, label: r.name }))} 
                            value={formData.role_id} 
                            onChange={val => setFormData({...formData, role_id: val as string})}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-text-theme-muted text-[10px] font-bold uppercase tracking-widest">
                            <Key size={12} /> Password {selectedUser ? '(Leave blank to keep current)' : '(Optional for Google users)'}
                        </Label>
                        <Input 
                            type="password"
                            value={formData.password} 
                            onChange={e => setFormData({...formData, password: e.target.value})} 
                            placeholder={selectedUser ? "••••••••" : "Initial password or leave empty for Google Login"}
                            className="bg-surface text-text-theme-main"
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-border-theme">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} className="px-8 shadow-lg shadow-primary-theme/20">
                    {selectedUser ? 'Update Account' : 'Create Account'}
                </Button>
            </div>
        </div>
      </Modal>
    </>
  );
}
