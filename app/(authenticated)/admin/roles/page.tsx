"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button, Modal, Input, Label, Checkbox } from "@/components/ui";
import { Shield, Plus, Edit2, Trash2, Lock } from 'lucide-react';

interface Permission {
    permission_id: string;
    name: string;
    description: string;
}

interface Role {
    role_id: string;
    name: string;
    permissions: Permission[];
}

export default function RoleManagementPage() {
    const [roles, setRoles] = useState<Role[]>([]);
    const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [formData, setFormData] = useState({ name: '', permissionIds: [] as string[] });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [rolesRes, permsRes] = await Promise.all([
                fetch('/api/roles'),
                fetch('/api/permissions')
            ]);
            const rolesData = await rolesRes.json();
            const permsData = await permsRes.json();
            setRoles(rolesData);
            setAllPermissions(permsData);
        } catch (err) {
            console.error('Failed to fetch data', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleOpenCreate = () => {
        setSelectedRole(null);
        setFormData({ name: '', permissionIds: [] });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (role: Role) => {
        setSelectedRole(role);
        setFormData({ 
            name: role.name, 
            permissionIds: role.permissions.map(p => p.permission_id) 
        });
        setIsModalOpen(true);
    };

    const handleTogglePermission = (id: string) => {
        setFormData(prev => ({
            ...prev,
            permissionIds: prev.permissionIds.includes(id)
                ? prev.permissionIds.filter(pid => pid !== id)
                : [...prev.permissionIds, id]
        }));
    };

    const handleSave = async () => {
        const method = selectedRole ? 'PUT' : 'POST';
        const body = selectedRole 
            ? { ...formData, role_id: selectedRole.role_id } 
            : formData;

        const res = await fetch('/api/roles', {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (res.ok) {
            setIsModalOpen(false);
            fetchData();
        } else {
            alert('Operation failed');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this role? Users with this role may lose access.')) return;
        const res = await fetch(`/api/roles?id=${id}`, { method: 'DELETE' });
        if (res.ok) fetchData();
    };

    if (loading) return <div className="p-12 text-center text-gray-500 uppercase tracking-widest text-xs font-bold animate-pulse">Loading Permission Matrix...</div>;

    return (
        <div className="container mx-auto p-8 max-w-5xl space-y-8 text-black dark:text-white">
            <div className="flex justify-between items-center border-b dark:border-gray-800 pb-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <Lock size={32} className="text-purple-500" /> Role & Permission Matrix
                    </h1>
                    <p className="text-gray-500 font-medium uppercase tracking-wider text-[10px]">
                        Define access levels and granular capabilities.
                    </p>
                </div>
                <Button onClick={handleOpenCreate} className="bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-500/20">
                    <Plus size={18} className="mr-2" /> New Role
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {roles.map(role => (
                    <div key={role.role_id} className="border dark:border-gray-800 rounded-xl p-6 bg-white dark:bg-gray-950 shadow-sm space-y-4">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    <Shield size={18} className="text-purple-500" /> {role.name}
                                </h3>
                                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                                    {role.permissions.length} PERMISSIONS ASSIGNED
                                </p>
                            </div>
                            <div className="flex gap-1">
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-blue-600" onClick={() => handleOpenEdit(role)}>
                                    <Edit2 size={14} />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600" onClick={() => handleDelete(role.role_id)}>
                                    <Trash2 size={14} />
                                </Button>
                            </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                            {role.permissions.map(p => (
                                <span key={p.permission_id} className="px-2 py-1 rounded-md bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-[10px] font-bold uppercase tracking-tight">
                                    {p.name.replace(':', ' ')}
                                </span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <Modal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                title={selectedRole ? `Edit Role: ${selectedRole.name}` : 'Create System Role'}
            >
                <div className="space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Role Identifier</Label>
                            <Input 
                                value={formData.name} 
                                onChange={e => setFormData({...formData, name: e.target.value})} 
                                placeholder="e.g. Lead Developer"
                                className="bg-white dark:bg-gray-950"
                            />
                        </div>
                        
                        <div className="space-y-3">
                            <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Capabilities</Label>
                            <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2">
                                {allPermissions.map(perm => (
                                    <div 
                                        key={perm.permission_id}
                                        onClick={() => handleTogglePermission(perm.permission_id)}
                                        className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                                            formData.permissionIds.includes(perm.permission_id)
                                                ? "border-purple-500 bg-purple-50/50 dark:bg-purple-900/10"
                                                : "border-transparent bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900"
                                        }`}
                                    >
                                        <Checkbox 
                                            checked={formData.permissionIds.includes(perm.permission_id)}
                                            onCheckedChange={() => handleTogglePermission(perm.permission_id)}
                                        />
                                        <div className="space-y-0.5">
                                            <p className="text-xs font-bold uppercase tracking-wider text-black dark:text-white">{perm.name}</p>
                                            <p className="text-[10px] text-gray-500">{perm.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t dark:border-gray-800">
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700 px-8 shadow-lg shadow-purple-600/20">
                            {selectedRole ? 'Update Access' : 'Provision Role'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
