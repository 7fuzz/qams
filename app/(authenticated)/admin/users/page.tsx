"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Button, Modal, Input, Label, Combobox, Pagination } from "@/components/ui";
import { AgGridReact } from 'ag-grid-react';
import { 
  ColDef, 
  AllCommunityModule,
  ModuleRegistry,
  ICellRendererParams,
} from 'ag-grid-community';
import { unifiedGridTheme } from '@/lib/theme';
import { Plus, Edit2, Trash2, Shield, User as UserIcon, Mail, Key } from 'lucide-react';

ModuleRegistry.registerModules([AllCommunityModule]);

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
  const gridRef = useRef<AgGridReact>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Partial<User> | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role_id: '' });

  const fetchUsers = useCallback(() => {
    setLoading(true);
    fetch(`/api/users?page=${page}&limit=${limit}`)
      .then(async res => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Unauthorized');
        }
        return res.json();
      })
      .then(res => {
        if (res.data) {
            setUsers(res.data);
            setTotal(res.total || 0);
            setTotalPages(res.totalPages || 0);
        } else {
            setUsers([]);
            setTotal(0);
            setTotalPages(0);
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setUsers([]);
        setTotal(0);
        setTotalPages(0);
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
    const handleResize = () => {
        gridRef.current?.api?.sizeColumnsToFit();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    } else {
        const data = await res.json();
        alert(data.error || 'Operation failed');
    }
  };

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
        fetchUsers();
    } else {
        const data = await res.json();
        alert(data.error || 'Delete failed');
    }
  }, [fetchUsers]);

  const columnDefs = useMemo<ColDef<User>[]>(() => [
    { 
        field: 'name', 
        headerName: 'Full Name', 
        flex: 1,
        cellRenderer: (p: ICellRendererParams<User>) => (
            <div className="flex items-center gap-2 h-full">
                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center text-[10px] font-bold uppercase">
                    {p.value?.charAt(0)}
                </div>
                <span className="font-medium text-black dark:text-white">{p.value}</span>
            </div>
        )
    },
    { 
        field: 'email', 
        headerName: 'Email Address', 
        flex: 1,
        cellRenderer: (p: ICellRendererParams<User>) => <span className="text-text-theme-muted dark:text-gray-400">{p.value}</span>
    },
    { 
        field: 'role_name', 
        headerName: 'System Role', 
        width: 140,
        cellRenderer: (p: ICellRendererParams<User>) => (
            <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase gap-1 ${
                p.value === 'Admin' ? 'bg-red-100 text-red-700' : 
                p.value === 'Developer' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
            }`}>
                <Shield size={10} />
                {p.value}
            </div>
        )
    },
    { 
      headerName: 'Actions', 
      width: 100, 
      pinned: 'right',
      cellRenderer: (params: ICellRendererParams<User>) => (
        <div className="flex gap-1 h-full items-center justify-center">
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-blue-600" onClick={() => params.data && handleOpenEdit(params.data)}>
            <Edit2 size={14} />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-600" onClick={() => params.data && handleDelete(params.data.user_id)}>
            <Trash2 size={14} />
          </Button>
        </div>
      )
    },
  ], [handleDelete]);

  if (loading && total === 0) return <div className="p-12 text-center text-text-theme-muted uppercase tracking-widest text-xs font-bold animate-pulse">Initializing User Matrix...</div>;
  if (error) return <div className="p-12 text-center text-red-500 font-bold">FAILURE: {error}</div>;

  return (
    <div className="container mx-auto p-8 max-w-5xl space-y-8 text-text-theme-main">
      <div className="flex justify-between items-center border-b border-border-theme pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <UserIcon size={32} className="text-primary-theme" /> User Directory
          </h1>
          <p className="text-text-theme-muted font-medium uppercase tracking-wider text-[10px]">
            Manage system access, roles, and contributor profiles.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="shadow-lg shadow-primary-theme/20">
          <Plus size={18} className="mr-2" /> Add Account
        </Button>
      </div>

      <div className="w-full border border-border-theme rounded-lg overflow-hidden bg-surface shadow-sm">

          <AgGridReact
            ref={gridRef}
            theme={unifiedGridTheme}
            rowData={users}
            columnDefs={columnDefs}
            animateRows={true}
            domLayout="autoHeight"
            pagination={true}
            paginationPageSize={20}
          />
          <Pagination 
            currentPage={page}
            totalPages={totalPages}
            pageSize={limit}
            totalItems={total}
            onPageChange={setPage}
            onPageSizeChange={(s) => { setLimit(s); setPage(1); }}
          />
      </div>

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
    </div>
  );
}
