"use client";

import React, { use, useState, useEffect, useCallback } from 'react';
import { Card, CardContent, Button, Label, Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui";
import { ArrowLeft, LayoutPanelTop, Layers, Tag, Clock, User, ClipboardList, CheckCircle2, XCircle, AlertCircle, History, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { TestCase } from '@/types/app';

interface ExecutionHistory {
    execution_id: string;
    status: string;
    executed_at: string;
    notes: string | null;
    run_name: string;
    run_id: string;
    tester_name: string;
}

export default function TestCaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [testCase, setTestCase] = useState<TestCase | null>(null);
  const [history, setHistory] = useState<ExecutionHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTestCase = useCallback(async () => {
    try {
        const [tcRes, histRes] = await Promise.all([
            fetch(`/api/test-cases/${id}`),
            fetch(`/api/test-cases/${id}/history`)
        ]);
        const tcData = await tcRes.json();
        const histData = await histRes.json();
        
        setTestCase(tcData);
        setHistory(histData || []);
    } catch (err) {
        console.error("Failed to fetch test case details", err);
    } finally {
        setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    queueMicrotask(() => {
        fetchTestCase();
    });
  }, [fetchTestCase]);

  if (loading) return <div className="container mx-auto p-8 animate-pulse text-text-theme-muted uppercase font-bold tracking-widest text-center py-40">Loading Test Case Details...</div>;
  if (!testCase) return <div className="container mx-auto p-8 text-center py-40">Test Case Not Found.</div>;

  const getStatusIcon = (status: string) => {
    if (status === 'Passed') return <CheckCircle2 size={16} className="text-success-theme" />;
    if (status === 'Failed') return <XCircle size={16} className="text-danger-theme" />;
    return <Clock size={16} className="text-warning-theme" />;
  };

  return (
    <div className="container mx-auto p-4 md:p-8 flex flex-col gap-8 max-w-7xl text-text-theme-main">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Link href="/tests" className="text-text-theme-muted hover:text-text-theme-main transition-colors">
                <ArrowLeft size={18} />
            </Link>
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary-theme bg-primary-theme/10 px-2 py-0.5 rounded-full">
                Test Case Detail
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-text-theme-main flex items-center gap-3">
            {testCase.custom_id && <span className="text-primary-theme bg-primary-theme/5 px-2 py-1 rounded text-lg border border-primary-theme/10">{testCase.custom_id}</span>}
            {testCase.title}
          </h1>
          <div className="flex flex-wrap gap-4 mt-2">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-text-theme-muted uppercase">
                <LayoutPanelTop size={14} className="text-primary-theme" /> {testCase.project_name}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-text-theme-muted uppercase">
                <Layers size={14} className="text-primary-theme" /> {testCase.module_name} › {testCase.scenario_name}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
            <Card className="shadow-sm border-border-theme bg-surface">
                <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-text-theme-muted uppercase flex items-center gap-1"><Tag size={10} /> Type</Label>
                            <div className="text-sm font-bold">{testCase.type}</div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-text-theme-muted uppercase flex items-center gap-1"><AlertCircle size={10} /> Priority</Label>
                            <div className={`text-sm font-bold ${testCase.priority === 'High' ? 'text-danger-theme' : testCase.priority === 'Medium' ? 'text-warning-theme' : 'text-primary-theme'}`}>
                                {testCase.priority}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-text-theme-muted uppercase flex items-center gap-1"><Clock size={10} /> Est. Duration</Label>
                            <div className="text-sm font-bold">{testCase.estimated_duration || 0} min</div>
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-border-theme">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-text-theme-muted uppercase flex items-center gap-1"><ClipboardList size={10} /> Precondition</Label>
                            <div className="text-sm bg-surface-muted p-3 rounded-lg border border-border-theme whitespace-pre-wrap min-h-[60px]">
                                {testCase.precondition || 'No preconditions defined.'}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-text-theme-muted uppercase flex items-center gap-1"><Layers size={10} /> Steps</Label>
                            <div className="text-sm bg-surface-muted p-3 rounded-lg border border-border-theme whitespace-pre-wrap min-h-[100px]">
                                {testCase.steps || 'No steps defined.'}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-text-theme-muted uppercase flex items-center gap-1"><Tag size={10} /> Test Data</Label>
                            <div className="text-sm bg-surface-muted p-3 rounded-lg border border-border-theme whitespace-pre-wrap">
                                {testCase.test_data || 'No specific test data defined.'}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-text-theme-muted uppercase flex items-center gap-1"><CheckCircle2 size={10} /> Expected Result</Label>
                            <div className="text-sm bg-primary-theme/5 p-3 rounded-lg border border-primary-theme/10 text-primary-theme font-medium whitespace-pre-wrap min-h-[60px]">
                                {testCase.expected_result || 'No expected results defined.'}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2 uppercase tracking-tight text-text-theme-muted">
                    <History size={18} className="text-primary-theme" /> Execution History
                </h3>
                <div className="border border-border-theme rounded-xl overflow-hidden bg-surface shadow-sm">
                    <Table>
                        <TableHeader className="bg-surface-muted">
                            <TableRow>
                                <TableHead className="text-[10px] uppercase font-bold">Run Name</TableHead>
                                <TableHead className="text-[10px] uppercase font-bold">Status</TableHead>
                                <TableHead className="text-[10px] uppercase font-bold">Tester</TableHead>
                                <TableHead className="text-[10px] uppercase font-bold">Date</TableHead>
                                <TableHead className="text-[10px] uppercase font-bold text-right">Details</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {history.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-10 text-text-theme-muted italic">No execution history found.</TableCell></TableRow>
                            ) : (
                                history.map(h => (
                                    <TableRow key={h.execution_id} className="hover:bg-surface-accent transition-colors">
                                        <TableCell className="font-bold text-primary-theme">{h.run_name}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5 uppercase text-[9px] font-black tracking-widest">
                                                {getStatusIcon(h.status)}
                                                <span className={h.status === 'Passed' ? 'text-success-theme' : h.status === 'Failed' ? 'text-danger-theme' : 'text-warning-theme'}>
                                                    {h.status}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-[11px] font-medium text-text-theme-muted uppercase tracking-tighter flex items-center gap-1">
                                            <User size={12} /> {h.tester_name}
                                        </TableCell>
                                        <TableCell className="text-[11px] font-medium text-text-theme-muted">
                                            {new Date(h.executed_at).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Link href={`/runs/${h.run_id}`}>
                                                <Button size="sm" variant="ghost" className="h-7 text-primary-theme">
                                                    <ExternalLink size={12} />
                                                </Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>

        <div className="space-y-8">
            <Card className="shadow-sm border-border-theme bg-surface">
                <CardContent className="p-6 space-y-6">
                    <h3 className="text-xs font-black uppercase tracking-widest text-text-theme-muted border-b border-border-theme pb-2 flex items-center gap-2">
                        <Tag size={12} /> Meta Information
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-text-theme-muted font-bold uppercase">Automation:</span>
                            <span className="font-bold bg-surface-muted px-2 py-0.5 rounded border border-border-theme text-[10px] uppercase">{testCase.automation_status || 'Manual'}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-text-theme-muted font-bold uppercase">Requirement:</span>
                            {testCase.requirement_link ? (
                                <a href={testCase.requirement_link} target="_blank" className="text-primary-theme hover:underline font-bold flex items-center gap-1">
                                    Link <ExternalLink size={10} />
                                </a>
                            ) : <span className="text-text-theme-muted italic">N/A</span>}
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-text-theme-muted font-bold uppercase">Created At:</span>
                            <span className="font-medium text-text-theme-muted">{testCase.created_at ? new Date(testCase.created_at).toLocaleDateString() : 'Initial Seed'}</span>
                        </div>                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-sm border-border-theme bg-surface overflow-hidden">
                <div className="p-4 bg-primary-theme/5 border-b border-primary-theme/10">
                    <h3 className="text-xs font-black uppercase tracking-widest text-primary-theme flex items-center gap-2">
                        <LayoutPanelTop size={12} /> Project Owner
                    </h3>
                </div>
                <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-theme/20 flex items-center justify-center text-primary-theme font-black">
                        {testCase.owner_name?.charAt(0)}
                    </div>
                    <div>
                        <div className="text-sm font-bold">{testCase.owner_name}</div>
                        <div className="text-[10px] text-text-theme-muted uppercase font-bold tracking-widest">Lead QA Engineer</div>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
