"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  CardContent,
  Button,
  IconButton,
  Input,
  Combobox,
  Label,
  CRUDTable,
  Column,
  ManagementTemplate
} from "@/components/ui";
import { Plus, Trash2, Layers, LayoutPanelTop, Filter, Calendar, CheckCircle2 } from 'lucide-react';

interface Project {
  project_id: string;
  name: string;
}

interface Module {
  module_id: string;
  name: string;
  description: string;
  project_id: string;
  project_name: string;
  responsible_id: string;
  responsible_name: string;
}

interface User {
  user_id: string;
  name: string;
}

export default function ModuleManagementPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination & Search
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');

  // Filters
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');

  // New Module Form
  const [isAdding, setIsAdding] = useState(false);
  const [newModule, setNewModule] = useState({ name: '', project_id: '', description: '', responsible_id: '', sla_date: '', actual_date: '' });

  const fetchBaseData = useCallback(async () => {
    const [pRes, uRes] = await Promise.all([
      fetch('/api/projects?limit=1000'),
      fetch('/api/users?limit=1000')
    ]);
    const pData = await pRes.json();
    const uData = await uRes.json();
    setProjects(pData.data || []);
    setUsers(uData.data || []);
  }, []);

  const fetchModules = useCallback(async () => {
    setLoading(true);
    let url = `/api/modules?page=${page}&limit=${limit}&sortBy=${sortBy}&sortOrder=${sortOrder}`;
    if (selectedProjectId !== 'all') {
      url += `&projectId=${selectedProjectId}`;
    }
    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }
    const res = await fetch(url);
    const resData = await res.json();
    setModules(resData.data || []);
    setTotal(resData.total || 0);
    setLoading(false);
  }, [page, limit, sortBy, sortOrder, selectedProjectId, search]);

  useEffect(() => {
    queueMicrotask(() => {
        fetchBaseData();
    });
  }, [fetchBaseData]);

  useEffect(() => {
    queueMicrotask(() => {
        fetchModules();
    });
  }, [fetchModules]);

  const handleAddModule = async () => {
    if (!newModule.name || !newModule.project_id) return;
    await fetch('/api/modules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newModule),
    });
    setNewModule({ name: '', project_id: '', description: '', responsible_id: '', sla_date: '', actual_date: '' });
    setIsAdding(false);
    fetchModules();
  };

  const handleUpdateModule = async (moduleId: string, data: Partial<Module>) => {
    const mod = modules.find(m => m.module_id === moduleId);
    if (!mod) return;
    await fetch('/api/modules', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...mod, ...data }),
    });
    fetchModules();
  };

  const handleDeleteModule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this module? All associated scenarios will be deleted.')) return;
    await fetch(`/api/modules?id=${id}`, { method: 'DELETE' });
    fetchModules();
  };

  const userOptions = useMemo(() => users.map(u => ({ value: u.user_id, label: u.name })), [users]);
  const projectOptions = useMemo(() => projects.map(p => ({ value: p.project_id, label: p.name })), [projects]);

  const columns: Column<Module>[] = [
    {
        header: 'Module Name',
        accessorKey: 'name',
        sortable: true,
        cell: (item) => (
            <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-theme/10 rounded-lg text-primary-theme shrink-0">
                    <Layers size={16} />
                </div>
                <div className="font-bold text-sm text-text-theme-main">{item.name}</div>
            </div>
        )
    },
    {
        header: 'Project',
        accessorKey: 'project_name',
        sortable: true,
        cell: (item) => (
            <div className="flex items-center gap-2 text-xs font-bold text-text-theme-muted uppercase tracking-tight">
                <LayoutPanelTop size={14} className="text-text-theme-subtle" />
                {item.project_name}
            </div>
        )
    },
    {
        header: 'SLA / Actual',
        cell: (item) => (
            <div className="flex flex-col gap-1" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-text-theme-muted uppercase w-8">SLA:</span>
                    <input 
                        type="date" 
                        value={item.sla_date ? item.sla_date.split('T')[0] : ''} 
                        onChange={e => handleUpdateModule(item.module_id, { sla_date: e.target.value })}
                        className="text-[10px] bg-transparent border-none p-0 focus:ring-0 text-text-theme-main"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-text-theme-muted uppercase w-8">ACT:</span>
                    <input 
                        type="date" 
                        value={item.actual_date ? item.actual_date.split('T')[0] : ''} 
                        onChange={e => handleUpdateModule(item.module_id, { actual_date: e.target.value })}
                        className="text-[10px] bg-transparent border-none p-0 focus:ring-0 text-text-theme-main"
                    />
                </div>
            </div>
        )
    },
    {
        header: 'Responsible Developer',
        accessorKey: 'responsible_name',
        sortable: true,
        cell: (item) => (
            <div className="max-w-[200px]" onClick={e => e.stopPropagation()}>
                <Combobox 
                    options={userOptions}
                    value={item.responsible_id}
                    onChange={(val) => handleUpdateModule(item.module_id, { responsible_id: val as string })}
                    placeholder="Unassigned"
                    className="h-8 text-xs border-transparent hover:border-border-theme bg-transparent"
                />
            </div>
        )
    },
    {
        header: 'Actions',
        className: 'text-right',
        cell: (item) => (
            <IconButton 
                icon={Trash2} 
                size="sm" 
                variant="ghost" 
                className="text-danger-theme opacity-50 hover:opacity-100 transition-opacity" 
                aria-label="Delete module" 
                onClick={(e) => { e.stopPropagation(); handleDeleteModule(item.module_id); }}
                title="Delete Module"
            />
        )
    }
  ];

  const filters = (
    <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 min-w-[300px]">
            <Filter size={16} className="text-text-theme-muted" />
            <Label className="text-[10px] font-black uppercase tracking-widest text-text-theme-subtle mr-2 whitespace-nowrap">Filter by Project</Label>
            <div className="flex-1">
                <Combobox 
                    options={[{ value: 'all', label: 'All Projects' }, ...projectOptions]}
                    value={selectedProjectId}
                    onChange={val => { setSelectedProjectId(val as string); setPage(1); }}
                />
            </div>
        </div>
    </div>
  );

  return (
    <ManagementTemplate
        title="Module Management"
        description="Define and organize modules across all active projects."
        icon={Layers}
        primaryAction={
            <Button onClick={() => setIsAdding(!isAdding)} variant={isAdding ? 'outline' : 'primary'}>
                {isAdding ? 'Cancel' : <><Plus size={18} className="mr-2" /> Define New Module</>}
            </Button>
        }
        filters={filters}
    >
      {isAdding && (
        <Card className="border-primary-theme/20 bg-primary-theme/5 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-text-theme-muted">Module Name</Label>
                <input 
                  placeholder="e.g. Authentication" 
                  value={newModule.name} 
                  onChange={e => setNewModule({...newModule, name: e.target.value})}
                  className="w-full h-10 px-3 rounded border border-border-theme bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary-theme/20 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-text-theme-muted">Parent Project</Label>
                <Combobox 
                  options={projectOptions} 
                  value={newModule.project_id} 
                  onChange={val => setNewModule({...newModule, project_id: val as string})} 
                  placeholder="Select Project..."
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-text-theme-muted">SLA Date</Label>
                <Input 
                  type="date"
                  value={newModule.sla_date} 
                  onChange={e => setNewModule({...newModule, sla_date: e.target.value})}
                  className="bg-surface"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-text-theme-muted">Lead Developer</Label>
                <Combobox 
                  options={userOptions} 
                  value={newModule.responsible_id} 
                  onChange={val => setNewModule({...newModule, responsible_id: val as string})} 
                  placeholder="Assign Responsible..."
                />
              </div>
              <Button onClick={handleAddModule} className="w-full">Create Module</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <CRUDTable
        data={modules}
        columns={columns}
        loading={loading}
        totalItems={total}
        currentPage={page}
        pageSize={limit}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setLimit(s); setPage(1); }}
        onSearch={(q) => { setSearch(q); setPage(1); }}
        onSort={(key, order) => { setSortBy(key); setSortOrder(order); }}
        sortBy={sortBy}
        sortOrder={sortOrder}
        searchPlaceholder="Search modules..."
        hideHeader={true}
      />
    </ManagementTemplate>
  );
}
