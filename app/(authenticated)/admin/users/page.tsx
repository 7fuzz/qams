"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Modal, Input, Label, Combobox } from "@/components/ui";
import { AgGridReact } from 'ag-grid-react';
import { 
  ColDef, 
  AllCommunityModule,
  ModuleRegistry,
} from 'ag-grid-community';
import { unifiedGridTheme, GRID_CONTAINER_CLASS } from '@/lib/theme';
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
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Partial<User> | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role_id: '' });

  const fetchUsers = () => {
    setLoading(true);
    fetch('/api/users')
      .then(async res => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Unauthorized');
        }
        return res.json();
      })
      .then(data => {
        setUsers(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };

  const fetchRoles = () => {
    fetch('/api/roles')
        .then(res => res.json())
        .then(setRoles);
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

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

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
        fetchUsers();
    } else {
        const data = await res.json();
        alert(data.error || 'Delete failed');
    }
  };

  const columnDefs = useMemo<ColDef[]>(() => [
    { 
        field: 'name', 
        headerName: 'Full Name', 
        flex: 1,
        cellRenderer: (p: any) => (
            <div className="flex items-center gap-2 h-full">
                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center text-[10px] font-bold uppercase">
                    {p.value.charAt(0)}
                </div>
                <span className="font-medium text-black dark:text-white">{p.value}</span>
            </div>
        )
    },
    { 
        field: 'email', 
        headerName: 'Email Address', 
        flex: 1,
        cellRenderer: (p: any) => <span className="text-gray-500 dark:text-gray-400">{p.value}</span>
    },
    { 
        field: 'role_name', 
        headerName: 'System Role', 
        width: 140,
        cellRenderer: (p: any) => (
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
      cellRenderer: (params: any) => (
        <div className="flex gap-1 h-full items-center justify-center">
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-blue-600" onClick={() => handleOpenEdit(params.data)}>
            <Edit2 size={14} />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-600" onClick={() => handleDelete(params.data.user_id)}>
            <Trash2 size={14} />
          </Button>
        </div>
      )
    },
  ], [roles]);

  if (loading) return <div className="p-12 text-center text-gray-500 uppercase tracking-widest text-xs font-bold animate-pulse">Initializing User Matrix...</div>;
  if (error) return <div className="p-12 text-center text-red-500 font-bold">FAILURE: {error}</div>;

  return (
    <div className="container mx-auto p-8 max-w-5xl space-y-8">
      <div className="flex justify-between items-center border-b dark:border-gray-800 pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-black dark:text-white flex items-center gap-3">
              <UserIcon size={32} className="text-blue-500" /> User Directory
          </h1>
          <p className="text-gray-500 font-medium uppercase tracking-wider text-[10px]">
            Manage organizational access and role hierarchy.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="shadow-lg shadow-blue-500/20">
            <Plus size={18} className="mr-2" /> New Account
        </Button>
      </div>

      <Card className="shadow-2xl overflow-hidden border-0">
        <CardContent className="p-0">
          <div className="w-full border dark:border-gray-800 rounded-lg overflow-hidden bg-white dark:bg-gray-950 shadow-sm">
              <AgGridReact
                theme={unifiedGridTheme}
                rowData={users}
                columnDefs={columnDefs}
                animateRows={true}
                pagination={true}
                paginationPageSize={20}
                domLayout="autoHeight"
              />
          </div>
        </CardContent>
      </Card>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={selectedUser ? `Edit Account: ${selectedUser.name}` : 'Provision New Account'}
      >
        <div className="space-y-6">
            <div className="space-y-4">
                <div className="grid gap-4">
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-gray-500 text-[10px] font-bold uppercase tracking-widest"><UserIcon size={12} /> Full Name</Label>
                        <Input 
                            value={formData.name} 
                            onChange={e => setFormData({...formData, name: e.target.value})} 
                            placeholder="John Doe"
                            className="bg-white dark:bg-gray-950 text-black dark:text-white"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-gray-500 text-[10px] font-bold uppercase tracking-widest"><Mail size={12} /> Email Address</Label>
                        <Input 
                            type="email"
                            value={formData.email} 
                            onChange={e => setFormData({...formData, email: e.target.value})} 
                            placeholder="john@example.com"
                            className="bg-white dark:bg-gray-950 text-black dark:text-white"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-gray-500 text-[10px] font-bold uppercase tracking-widest"><Shield size={12} /> System Role</Label>
                        <Combobox 
                            options={roles.map(r => ({ value: r.role_id, label: r.name }))} 
                            value={formData.role_id} 
                            onChange={val => setFormData({...formData, role_id: val as string})}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-gray-500 text-[10px] font-bold uppercase tracking-widest"><Key size={12} /> Password {selectedUser && '(Leave blank to keep current)'}</Label>
                        <Input 
                            type="password"
                            value={formData.password} 
                            onChange={e => setFormData({...formData, password: e.target.value})} 
                            placeholder={selectedUser ? "••••••••" : "Initial password"}
                            className="bg-white dark:bg-gray-950 text-black dark:text-white"
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t dark:border-gray-800">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} className="px-8 shadow-lg shadow-blue-600/20">
                    {selectedUser ? 'Update Account' : 'Create Account'}
                </Button>
            </div>
        </div>
      </Modal>
    </div>
  );
}
