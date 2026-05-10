"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  Button,
  IconButton,
  Input,
  Label,
  CRUDTable,
  Column,
  ManagementTemplate
} from "@/components/ui";
import { Plus, Trash2, Tag as TagIcon, Hash, Palette, FileText } from 'lucide-react';
import { Tag } from '@/models/Tag';

export default function TagManagementPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newTag, setNewModule] = useState({ name: '', color: '#3b82f6', description: '' });

  const fetchTags = useCallback(async () => {
    setLoading(true);
    try {
        const res = await fetch('/api/tags');
        const data = await res.json();
        setTags(data || []);
    } catch (error) {
        console.error('Failed to fetch tags', error);
    } finally {
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
        fetchTags();
    });
  }, [fetchTags]);

  const handleAddTag = async () => {
    if (!newTag.name) return;
    await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTag),
    });
    setNewModule({ name: '', color: '#3b82f6', description: '' });
    setIsAdding(false);
    fetchTags();
  };

  const handleUpdateTag = async (tagId: string, data: Partial<Tag>) => {
    await fetch('/api/tags', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag_id: tagId, ...data }),
    });
    fetchTags();
  };

  const handleDeleteTag = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tag? It will be removed from all associated issues.')) return;
    await fetch(`/api/tags?id=${id}`, { method: 'DELETE' });
    fetchTags();
  };

  const columns: Column<Tag>[] = [
    {
        header: 'Tag Name',
        accessorKey: 'name',
        sortable: true,
        width: 250,
        minWidth: 150,
        cell: (item) => (
            <div className="flex items-center gap-3">
                <div 
                    className="w-4 h-4 rounded-full border border-border-theme shadow-sm shrink-0" 
                    style={{ backgroundColor: item.color }} 
                />
                <div className="font-bold text-sm text-text-theme-main">{item.name}</div>
            </div>
        )
    },
    {
        header: 'Visual Identity',
        accessorKey: 'color',
        width: 200,
        minWidth: 150,
        cell: (item) => (
            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-1.5 px-2 py-1 bg-surface-muted rounded-md border border-border-theme">
                    <Hash size={12} className="text-text-theme-muted" />
                    <input 
                        type="text" 
                        value={item.color} 
                        onChange={e => handleUpdateTag(item.tag_id, { color: e.target.value })}
                        className="bg-transparent border-none p-0 w-16 text-[10px] font-mono focus:ring-0 uppercase"
                    />
                    <input 
                        type="color" 
                        value={item.color} 
                        onChange={e => handleUpdateTag(item.tag_id, { color: e.target.value })}
                        className="w-4 h-4 p-0 border-none bg-transparent cursor-pointer"
                    />
                </div>
            </div>
        )
    },
    {
        header: 'Description',
        accessorKey: 'description',
        width: 400,
        minWidth: 250,
        cell: (item) => (
            <div className="max-w-full" onClick={e => e.stopPropagation()}>
                <input 
                    type="text" 
                    placeholder="Describe usage..."
                    value={item.description || ''} 
                    onChange={e => handleUpdateTag(item.tag_id, { description: e.target.value })}
                    className="w-full bg-transparent border-none p-0 text-xs italic text-text-theme-muted focus:ring-0"
                />
            </div>
        )
    },
    {
        header: 'Actions',
        className: 'text-right',
        width: 80,
        minWidth: 80,
        pin: 'right',
        cell: (item) => (
            <IconButton 
                icon={Trash2} 
                size="sm" 
                variant="ghost" 
                className="text-danger-theme opacity-50 hover:opacity-100 transition-opacity" 
                aria-label="Delete tag" 
                onClick={(e) => { e.stopPropagation(); handleDeleteTag(item.tag_id); }}
                title="Delete Tag"
            />
        )
    }
  ];

  return (
    <ManagementTemplate
        title="Tag Management"
        description="Define dynamic labels for classifying and filtering issues."
        icon={TagIcon}
        primaryAction={
            <Button onClick={() => setIsAdding(!isAdding)} variant={isAdding ? 'outline' : 'primary'}>
                {isAdding ? 'Cancel' : <><Plus size={18} className="mr-2" /> Define New Tag</>}
            </Button>
        }
    >
      {isAdding && (
        <Card className="border-primary-theme/20 bg-primary-theme/5 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-text-theme-muted flex items-center gap-2">
                    <TagIcon size={12} /> Tag Name
                </Label>
                <input 
                  placeholder="e.g. Vulnerability" 
                  value={newTag.name} 
                  onChange={e => setNewModule({...newTag, name: e.target.value})}
                  className="w-full h-10 px-3 rounded border border-border-theme bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary-theme/20 transition-all font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-text-theme-muted flex items-center gap-2">
                    <Palette size={12} /> Brand Color
                </Label>
                <div className="flex gap-2">
                    <Input 
                        value={newTag.color} 
                        onChange={e => setNewModule({...newTag, color: e.target.value})} 
                        className="bg-surface font-mono uppercase"
                    />
                    <input 
                        type="color" 
                        value={newTag.color} 
                        onChange={e => setNewModule({...newTag, color: e.target.value})}
                        className="w-10 h-10 p-1 border border-border-theme rounded bg-surface cursor-pointer"
                    />
                </div>
              </div>
              <div className="space-y-1.5 lg:col-span-1">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-text-theme-muted flex items-center gap-2">
                    <FileText size={12} /> Description
                </Label>
                <Input 
                  placeholder="Optional context..."
                  value={newTag.description} 
                  onChange={e => setNewModule({...newTag, description: e.target.value})}
                  className="bg-surface italic"
                />
              </div>
              <Button onClick={handleAddTag} className="w-full h-10 shadow-lg shadow-primary-theme/20 font-black uppercase tracking-widest text-[10px]">Create Tag</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <CRUDTable
        data={tags as object[]}
        columns={columns as Column<object>[]}
        loading={loading}
        totalItems={tags.length}
        currentPage={1}
        pageSize={tags.length || 1}
        onPageChange={() => {}}
        onPageSizeChange={() => {}}
        hideHeader={true}
      />
    </ManagementTemplate>
  );
}
