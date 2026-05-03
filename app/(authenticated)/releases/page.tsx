"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, CardHeader, CardTitle, CardContent, Button, Modal, Input, Label, Textarea, Combobox
} from "@/components/ui";
import { Tag, Plus, Calendar, Clock, GitCommit, AlertCircle, Trash2, Edit2, Info, ArrowRight, Link as LinkIcon, Layers } from 'lucide-react';
import { Project, Module, Release, Issue, ReleaseChange } from '@/types/app';

const RELEASE_STATUS_OPTIONS = [
  { value: 'Planning', label: 'Planning' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Staging', label: 'Staging' },
  { value: 'Released', label: 'Released' },
  { value: 'Cancelled', label: 'Cancelled' }
];

const CHANGE_TYPE_OPTIONS = [
  { value: 'Feature', label: 'Feature' },
  { value: 'Bugfix', label: 'Bugfix' },
  { value: 'Enhancement', label: 'Enhancement' }
];

export default function ReleasesPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [projectIssues, setProjectIssues] = useState<Issue[]>([]);
  const [projectModules, setProjectModules] = useState<Module[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedReleaseId, setSelectedReleaseId] = useState<string | null>(null);
  const [changes, setChanges] = useState<ReleaseChange[]>([]);

  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false);

  const [releaseForm, setReleaseForm] = useState<Partial<Release>>({ version_name: '', status: 'Planning', description: '' });
  const [changeForm, setChangeForm] = useState<Partial<ReleaseChange>>({ type: 'Feature', title: '', description: '', issue_ids: [], module_ids: [] });

  const fetchProjects = useCallback(() => fetch('/api/projects').then(res => res.json()).then(setProjects), []);

  const fetchReleases = useCallback((pid: string) => {
    fetch(`/api/releases?projectId=${pid}`).then(res => res.json()).then(data => {
      setReleases(data);
      if (data.length > 0 && !selectedReleaseId) {
        setSelectedReleaseId(data[0].release_id);
      }
    });
  }, [selectedReleaseId]);

  const fetchIssues = useCallback((pid: string) => {
    fetch(`/api/issues?projectId=${pid}&limit=1000`).then(res => res.json()).then(resData => {
      setProjectIssues(resData.data || []);
    });
  }, []);

  const fetchModules = useCallback((pid: string) => {
    fetch(`/api/modules?projectId=${pid}`).then(res => res.json()).then(setProjectModules);
  }, []);

  const fetchChanges = useCallback((rid: string) => {
    fetch(`/api/releases/changes?releaseId=${rid}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setChanges(data);
        } else {
          setChanges([]);
        }
      })
      .catch(() => setChanges([]));
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      fetchProjects();
    });
  }, [fetchProjects]);

  useEffect(() => {
    queueMicrotask(() => {
      if (selectedProjectId) {
        fetchReleases(selectedProjectId);
        fetchIssues(selectedProjectId);
        fetchModules(selectedProjectId);
      } else {
        setReleases([]);
        setSelectedReleaseId(null);
        setProjectIssues([]);
        setProjectModules([]);
      }
    });
  }, [selectedProjectId, fetchReleases, fetchIssues, fetchModules]);

  useEffect(() => {
    queueMicrotask(() => {
      if (selectedReleaseId) {
        fetchChanges(selectedReleaseId);
      } else {
        setChanges([]);
      }
    });
  }, [selectedReleaseId, fetchChanges]);

  const handleSaveRelease = async () => {
    if (!selectedProjectId) return;
    const isEdit = !!releaseForm.release_id;
    await fetch('/api/releases', {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...releaseForm, project_id: selectedProjectId }),
    });
    fetchReleases(selectedProjectId);
    setIsReleaseModalOpen(false);
  };

  const handleSaveChange = async () => {
    if (!selectedReleaseId) return;
    const isEdit = !!changeForm.change_id;
    await fetch('/api/releases/changes', {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...changeForm, release_id: selectedReleaseId }),
    });
    fetchChanges(selectedReleaseId);
    setIsChangeModalOpen(false);
  };

  const deleteRelease = async (id: string) => {
    if (!confirm('Delete this version and all its changelog entries?')) return;
    await fetch(`/api/releases?id=${id}`, { method: 'DELETE' });
    if (selectedProjectId) fetchReleases(selectedProjectId);
  };

  const deleteChange = async (id: string) => {
    await fetch(`/api/releases/changes?id=${id}`, { method: 'DELETE' });
    if (selectedReleaseId) fetchChanges(selectedReleaseId);
  };

  const selectedRelease = releases.find(r => r.release_id === selectedReleaseId);

  return (
    <div className="container mx-auto p-4 md:p-8 flex flex-col gap-8 max-w-full text-text-theme-main">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Tag size={32} className="text-primary-theme" /> Release Version Tracker
          </h1>
          <p className="text-text-theme-muted font-medium uppercase tracking-wider text-[10px]">
            Plan milestones, track changelogs, and manage version lifecycle.
          </p>
        </div>

        <div className="w-[300px]">
          <Combobox
            options={projects.map(p => ({ value: p.project_id, label: p.name }))}
            value={selectedProjectId || undefined}
            onChange={val => setSelectedProjectId(val as string)}
            placeholder="Select Project..."
          />
        </div>
      </div>

      {!selectedProjectId ? (
        <Card className="border-dashed border-2 p-20 text-center bg-surface-muted border-border-theme">
          <GitCommit size={48} className="mx-auto mb-4 opacity-20" />
          <p className="text-text-theme-subtle font-medium italic">Please select a project to view its release history.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Version List */}
          <aside className="xl:col-span-1 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-widest text-text-theme-muted">Versions</h2>
              <Button size="sm" variant="ghost" onClick={() => { setReleaseForm({ version_name: '', status: 'Planning' }); setIsReleaseModalOpen(true); }}>
                <Plus size={16} />
              </Button>
            </div>
            <div className="space-y-2">
              {releases.map(release => (
                <div
                  key={release.release_id}
                  onClick={() => setSelectedReleaseId(release.release_id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedReleaseId === release.release_id
                      ? "bg-primary-theme/5 border-primary-theme shadow-md"
                      : "bg-surface hover:bg-surface-accent border-transparent"
                    }`}
                >
                  <div className="flex justify-between items-start mb-1 text-text-theme-main">
                    <span className="font-bold text-sm">{release.version_name}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${release.status === 'Released' ? 'bg-success-theme/10 text-success-theme' : 'bg-primary-theme/10 text-primary-theme'
                      }`}>
                      {release.status}
                    </span>
                  </div>
                  <div className="text-[10px] text-text-theme-muted flex items-center gap-1.5 font-medium uppercase">
                    <Calendar size={10} /> {release.target_date ? new Date(release.target_date).toLocaleDateString() : 'TBD'}
                  </div>
                </div>
              ))}
              {releases.length === 0 && <p className="text-center py-10 text-xs text-text-theme-muted italic">No releases planned.</p>}
            </div>
          </aside>

          {/* Release Detail & Changelog */}
          <main className="xl:col-span-3 space-y-8">
            {selectedRelease ? (
              <>
                <Card className="shadow-lg border border-border-theme bg-surface">
                  <CardHeader className="flex flex-row items-center justify-between border-b border-border-theme pb-6">
                    <div className="space-y-1">
                      <CardTitle className="text-2xl font-bold flex items-center gap-2 text-text-theme-main">
                        Release {selectedRelease.version_name}
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-text-theme-main" onClick={() => { setReleaseForm(selectedRelease); setIsReleaseModalOpen(true); }}><Edit2 size={14} /></Button>
                      </CardTitle>
                      <div className="flex items-center gap-4 text-xs text-text-theme-muted">
                        <span className="flex items-center gap-1"><Clock size={12} /> Target: {selectedRelease.target_date || 'No date set'}</span>
                        <span className="flex items-center gap-1 uppercase font-bold text-primary-theme">{selectedRelease.status}</span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="text-danger-theme" onClick={() => deleteRelease(selectedRelease.release_id)}><Trash2 size={16} className="mr-2" /> Delete Version</Button>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <p className="text-sm text-text-theme-muted mb-8 italic">{selectedRelease.description || 'No description provided for this version.'}</p>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-border-theme pb-2">
                        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-text-theme-muted flex items-center gap-2">
                          <GitCommit size={14} /> Changelog ({changes.length})
                        </h3>
                        <Button size="sm" className="h-7 text-[10px] uppercase font-bold text-text-theme-main" onClick={() => { setChangeForm({ type: 'Feature', title: '', issue_ids: [], module_ids: [] }); setIsChangeModalOpen(true); }}>
                          <Plus size={14} className="mr-1" /> Add Item
                        </Button>
                      </div>

                      <div className="space-y-3">
                        {Array.isArray(changes) && changes.map(change => (
                          <div key={change.change_id} className="group p-4 bg-surface-muted/50 border border-border-theme rounded-xl transition-all hover:bg-surface">
                            <div className="flex justify-between items-start">
                              <div className="flex gap-4">
                                <span className={`mt-1 h-2 w-2 rounded-full shrink-0 ${change.type === 'Feature' ? 'bg-primary-theme' :
                                    change.type === 'Bugfix' ? 'bg-danger-theme' : 'bg-success-theme'
                                  }`} />
                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-text-theme-subtle">{change.type}</span>
                                    <span className="font-bold text-sm text-text-theme-main">{change.title}</span>
                                    {change.module_names?.map((mName, idx) => (
                                      <span key={idx} className="flex items-center gap-1 text-[9px] bg-primary-theme/10 text-primary-theme px-1.5 py-0.5 rounded-full font-bold uppercase">
                                        <Layers size={10} /> {mName}
                                      </span>
                                    ))}
                                  </div>
                                  <p className="text-xs text-text-theme-muted leading-relaxed">{change.description}</p>
                                  <div className="flex flex-wrap gap-2">
                                    {change.issue_titles?.map((iTitle, idx) => (
                                      <div key={idx} className="mt-2 flex items-center gap-2 p-1.5 px-2 bg-danger-theme/10 rounded-md border border-danger-theme/20 w-fit">
                                        <AlertCircle size={10} className="text-danger-theme" />
                                        <span className="text-[9px] font-bold text-danger-theme uppercase tracking-wider">Issue: {iTitle}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-text-theme-main" onClick={() => { setChangeForm(change); setIsChangeModalOpen(true); }}><Edit2 size={14} /></Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-danger-theme" onClick={() => deleteChange(change.change_id)}><Trash2 size={14} /></Button>
                              </div>
                            </div>
                          </div>
                        ))}
                        {changes.length === 0 && <p className="text-center py-20 text-text-theme-muted italic text-sm">No items added to this release yet.</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="h-[400px] flex items-center justify-center border-dashed border-2 text-gray-400 bg-white dark:bg-gray-950">
                <div className="text-center">
                  <Info size={32} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Select a version to see its details and changelog.</p>
                </div>
              </Card>
            )}
          </main>
        </div>
      )}

      {/* Modals */}
      <Modal isOpen={isReleaseModalOpen} onClose={() => setIsReleaseModalOpen(false)} title={releaseForm.release_id ? "Edit Release" : "New Release"}>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-black dark:text-white">Version Name</Label>
            <Input placeholder="e.g. v1.0.0" value={releaseForm.version_name || ''} onChange={e => setReleaseForm({ ...releaseForm, version_name: e.target.value })} className="bg-surface text-text-theme-main" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-black dark:text-white">Status</Label>
              <Combobox options={RELEASE_STATUS_OPTIONS} value={releaseForm.status} onChange={val => setReleaseForm({ ...releaseForm, status: val as string })} />
            </div>
            <div className="space-y-2">
              <Label className="text-black dark:text-white">Target Date</Label>
              <Input type="date" value={releaseForm.target_date?.split(' ')[0] || ''} onChange={e => setReleaseForm({ ...releaseForm, target_date: e.target.value })} className="bg-surface text-text-theme-main" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-black dark:text-white">Description</Label>
            <Textarea value={releaseForm.description || ''} onChange={e => setReleaseForm({ ...releaseForm, description: e.target.value })} placeholder="Focus areas for this release..." className="bg-surface text-text-theme-main" />
          </div>
          <Button onClick={handleSaveRelease} className="w-full mt-4 shadow-lg shadow-indigo-500/20 py-6 font-bold">{releaseForm.release_id ? 'Update Release' : 'Create Release'}</Button>
        </div>
      </Modal>

      <Modal isOpen={isChangeModalOpen} onClose={() => setIsChangeModalOpen(false)} title={changeForm.change_id ? "Edit Item" : "Add Changelog Item"}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-black dark:text-white">Change Type</Label>
              <Combobox options={CHANGE_TYPE_OPTIONS} value={changeForm.type} onChange={val => setChangeForm({ ...changeForm, type: val as 'Feature' | 'Bugfix' | 'Enhancement' })} />
            </div>
            <div className="space-y-2">
              <Label className="text-black dark:text-white flex items-center gap-1.5"><Layers size={12} /> Link Modules</Label>
              <Combobox
                multiSelect
                options={projectModules.map(m => ({ value: m.module_id, label: m.name }))}
                value={changeForm.module_ids || []}
                onChange={val => setChangeForm({ ...changeForm, module_ids: val as string[] })}
                placeholder="Optional..."
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-black dark:text-white flex items-center gap-1.5"><LinkIcon size={12} /> Link Issues</Label>
            <Combobox
              multiSelect
              options={projectIssues.map(i => ({ value: i.issue_id, label: i.title }))}
              value={changeForm.issue_ids || []}
              onChange={val => setChangeForm({ ...changeForm, issue_ids: val as string[] })}
              placeholder="Optional..."
            />
          </div>
          <div className="space-y-2">
            <Label className="text-black dark:text-white">Title</Label>
            <Input placeholder="What was changed?" value={changeForm.title || ''} onChange={e => setChangeForm({ ...changeForm, title: e.target.value })} className="bg-surface text-text-theme-main" />
          </div>
          <div className="space-y-2">
            <Label className="text-black dark:text-white">Detailed Description</Label>
            <Textarea value={changeForm.description || ''} onChange={e => setChangeForm({ ...changeForm, description: e.target.value })} placeholder="Context or technical details..." className="bg-surface text-text-theme-main" />
          </div>
          <Button onClick={handleSaveChange} className="w-full mt-4 shadow-lg shadow-indigo-500/20 py-6 font-bold text-white">{changeForm.change_id ? 'Update Item' : 'Add to Changelog'}</Button>
        </div>
      </Modal>
    </div>
  );
}
