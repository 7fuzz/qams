"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, CardHeader, CardTitle, CardContent, Button, Modal, Input, Label, Textarea, Combobox
} from "@/components/ui";
import { Tag, Plus, Calendar, Clock, GitCommit, AlertCircle, Trash2, Edit2, Info, ArrowRight, Link as LinkIcon, Layers } from 'lucide-react';

interface Project {
  project_id: string;
  name: string;
}

interface Module {
  module_id: string;
  name: string;
}

interface Release {
  release_id: string;
  project_id: string;
  version_name: string;
  status: string;
  target_date: string;
  description: string;
}

interface Issue {
    issue_id: string;
    title: string;
}

interface ReleaseChange {
  change_id: string;
  release_id: string;
  module_id: string | null;
  module_name?: string;
  type: 'Feature' | 'Bugfix' | 'Enhancement';
  title: string;
  description: string;
  issue_id: string | null;
  issue_title?: string;
  issue_status?: string;
}

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
  const [changeForm, setChangeForm] = useState<Partial<ReleaseChange>>({ type: 'Feature', title: '', description: '', issue_id: null, module_id: null });

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
      fetch(`/api/releases/changes?releaseId=${rid}`).then(res => res.json()).then(setChanges);
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  useEffect(() => {
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
  }, [selectedProjectId, fetchReleases, fetchIssues, fetchModules]);

  useEffect(() => {
    if (selectedReleaseId) {
        fetchChanges(selectedReleaseId);
    } else {
        setChanges([]);
    }
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
    <div className="container mx-auto p-4 md:p-8 flex flex-col gap-8 max-w-full text-black dark:text-white">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3 text-black dark:text-white">
              <Tag size={32} className="text-indigo-500" /> Release Version Tracker
          </h1>
          <p className="text-gray-500 font-medium uppercase tracking-wider text-[10px]">
            Document version history and coordinate deployment milestones.
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
          <Card className="border-dashed border-2 p-20 text-center bg-gray-50/50 dark:bg-gray-900/10">
              <GitCommit size={48} className="mx-auto mb-4 opacity-20" />
              <p className="text-gray-400 font-medium italic">Please select a project to view its release history.</p>
          </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
            {/* Version List */}
            <aside className="xl:col-span-1 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">Versions</h2>
                    <Button size="sm" variant="ghost" onClick={() => { setReleaseForm({ version_name: '', status: 'Planning' }); setIsReleaseModalOpen(true); }}>
                        <Plus size={16} />
                    </Button>
                </div>
                <div className="space-y-2">
                    {releases.map(release => (
                        <div 
                            key={release.release_id}
                            onClick={() => setSelectedReleaseId(release.release_id)}
                            className={`p-4 rounded-xl border cursor-pointer transition-all ${
                                selectedReleaseId === release.release_id 
                                ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 shadow-md" 
                                : "bg-white dark:bg-gray-950 hover:bg-gray-50 dark:hover:bg-gray-900 border-transparent"
                            }`}
                        >
                            <div className="flex justify-between items-start mb-1 text-black dark:text-white">
                                <span className="font-bold text-sm">{release.version_name}</span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                    release.status === 'Released' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                    {release.status}
                                </span>
                            </div>
                            <div className="text-[10px] text-gray-500 flex items-center gap-1.5 font-medium uppercase">
                                <Calendar size={10} /> {release.target_date ? new Date(release.target_date).toLocaleDateString() : 'TBD'}
                            </div>
                        </div>
                    ))}
                    {releases.length === 0 && <p className="text-center py-10 text-xs text-gray-400 italic">No releases planned.</p>}
                </div>
            </aside>

            {/* Release Detail & Changelog */}
            <main className="xl:col-span-3 space-y-8">
                {selectedRelease ? (
                    <>
                        <Card className="shadow-lg border-0 bg-white dark:bg-gray-950">
                            <CardHeader className="flex flex-row items-center justify-between border-b dark:border-gray-800 pb-6">
                                <div className="space-y-1">
                                    <CardTitle className="text-2xl font-bold flex items-center gap-2">
                                        Release {selectedRelease.version_name}
                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-black dark:text-white" onClick={() => { setReleaseForm(selectedRelease); setIsReleaseModalOpen(true); }}><Edit2 size={14}/></Button>
                                    </CardTitle>
                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                        <span className="flex items-center gap-1"><Clock size={12}/> Target: {selectedRelease.target_date || 'No date set'}</span>
                                        <span className="flex items-center gap-1 uppercase font-bold text-indigo-500">{selectedRelease.status}</span>
                                    </div>
                                </div>
                                <Button variant="outline" size="sm" className="text-red-500" onClick={() => deleteRelease(selectedRelease.release_id)}><Trash2 size={16} className="mr-2"/> Delete Version</Button>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-8 italic">{selectedRelease.description || 'No description provided for this version.'}</p>
                                
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between border-b dark:border-gray-800 pb-2">
                                        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 flex items-center gap-2">
                                            <GitCommit size={14} /> Changelog ({changes.length})
                                        </h3>
                                        <Button size="sm" className="h-7 text-[10px] uppercase font-bold text-black dark:text-white" onClick={() => { setChangeForm({ type: 'Feature', title: '', issue_id: null, module_id: null }); setIsChangeModalOpen(true); }}>
                                            <Plus size={14} className="mr-1" /> Add Item
                                        </Button>
                                    </div>

                                    <div className="space-y-3">
                                        {changes.map(change => (
                                            <div key={change.change_id} className="group p-4 bg-gray-50/50 dark:bg-gray-900/30 border dark:border-gray-800 rounded-xl transition-all hover:bg-white dark:hover:bg-gray-900">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex gap-4">
                                                        <span className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                                                            change.type === 'Feature' ? 'bg-blue-500' : 
                                                            change.type === 'Bugfix' ? 'bg-red-500' : 'bg-green-500'
                                                        }`} />
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">{change.type}</span>
                                                                <span className="font-bold text-sm">{change.title}</span>
                                                                {change.module_name && (
                                                                    <span className="flex items-center gap-1 text-[9px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded-full font-bold uppercase">
                                                                        <Layers size={10} /> {change.module_name}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-gray-500 leading-relaxed">{change.description}</p>
                                                            {change.issue_id && (
                                                                <div className="mt-2 flex items-center gap-2 p-1.5 px-2 bg-red-50 dark:bg-red-900/10 rounded-md border border-red-100 dark:border-red-900/20 w-fit">
                                                                    <AlertCircle size={10} className="text-red-500" />
                                                                    <span className="text-[9px] font-bold text-red-700 dark:text-red-400 uppercase tracking-wider">Related Issue: {change.issue_title}</span>
                                                                    <ArrowRight size={10} className="text-red-300" />
                                                                    <span className="text-[9px] font-medium text-red-500">{change.issue_status}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-black dark:text-white" onClick={() => { setChangeForm(change); setIsChangeModalOpen(true); }}><Edit2 size={14}/></Button>
                                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => deleteChange(change.change_id)}><Trash2 size={14}/></Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {changes.length === 0 && <p className="text-center py-20 text-gray-400 italic text-sm">No items added to this release yet.</p>}
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
                  <Input placeholder="e.g. v1.0.0" value={releaseForm.version_name || ''} onChange={e => setReleaseForm({...releaseForm, version_name: e.target.value})} className="bg-white dark:bg-gray-950 text-black dark:text-white"/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-black dark:text-white">Status</Label>
                    <Combobox options={RELEASE_STATUS_OPTIONS} value={releaseForm.status} onChange={val => setReleaseForm({...releaseForm, status: val as string})} />
                </div>
                <div className="space-y-2">
                    <Label className="text-black dark:text-white">Target Date</Label>
                    <Input type="date" value={releaseForm.target_date?.split(' ')[0] || ''} onChange={e => setReleaseForm({...releaseForm, target_date: e.target.value})} className="bg-white dark:bg-gray-950 text-black dark:text-white" />
                </div>
              </div>
              <div className="space-y-2">
                  <Label className="text-black dark:text-white">Description</Label>
                  <Textarea value={releaseForm.description || ''} onChange={e => setReleaseForm({...releaseForm, description: e.target.value})} placeholder="Focus areas for this release..." className="bg-white dark:bg-gray-950 text-black dark:text-white" />
              </div>
              <Button onClick={handleSaveRelease} className="w-full mt-4 shadow-lg shadow-indigo-500/20 py-6 font-bold">{releaseForm.release_id ? 'Update Release' : 'Create Release'}</Button>
          </div>
      </Modal>

      <Modal isOpen={isChangeModalOpen} onClose={() => setIsChangeModalOpen(false)} title={changeForm.change_id ? "Edit Item" : "Add Changelog Item"}>
          <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-black dark:text-white">Change Type</Label>
                    <Combobox options={CHANGE_TYPE_OPTIONS} value={changeForm.type} onChange={val => setChangeForm({...changeForm, type: val as any})} />
                </div>
                <div className="space-y-2">
                    <Label className="text-black dark:text-white flex items-center gap-1.5"><Layers size={12}/> Link Module</Label>
                    <Combobox 
                        options={projectModules.map(m => ({ value: m.module_id, label: m.name }))} 
                        value={changeForm.module_id || undefined} 
                        onChange={val => setChangeForm({...changeForm, module_id: val as string})}
                        placeholder="Optional..."
                    />
                </div>
              </div>
              <div className="space-y-2">
                  <Label className="text-black dark:text-white flex items-center gap-1.5"><LinkIcon size={12}/> Link Issue</Label>
                  <Combobox 
                      options={projectIssues.map(i => ({ value: i.issue_id, label: i.title }))} 
                      value={changeForm.issue_id || undefined} 
                      onChange={val => setChangeForm({...changeForm, issue_id: val as string})}
                      placeholder="Optional..."
                  />
              </div>
              <div className="space-y-2">
                  <Label className="text-black dark:text-white">Title</Label>
                  <Input placeholder="What was changed?" value={changeForm.title || ''} onChange={e => setChangeForm({...changeForm, title: e.target.value})} className="bg-white dark:bg-gray-950 text-black dark:text-white"/>
              </div>
              <div className="space-y-2">
                  <Label className="text-black dark:text-white">Detailed Description</Label>
                  <Textarea value={changeForm.description || ''} onChange={e => setChangeForm({...changeForm, description: e.target.value})} placeholder="Context or technical details..." className="bg-white dark:bg-gray-950 text-black dark:text-white" />
              </div>
              <Button onClick={handleSaveChange} className="w-full mt-4 shadow-lg shadow-indigo-500/20 py-6 font-bold text-white">{changeForm.change_id ? 'Update Item' : 'Add to Changelog'}</Button>
          </div>
      </Modal>
    </div>
  );
}
