"use client";

import React, { use, useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui";
import { TestExecutionTable } from "@/components/grids/TestExecutionTable";
import { CheckCircle, ArrowLeft, User, Calendar, Layout, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Run {
  run_id: string;
  name: string;
  type: string;
  status: string;
  assigned_tester_names?: string[];
  project_name: string;
  created_at: string;
  completed_at: string | null;
  total_cases: number;
  passed_count: number;
  failed_count: number;
  pending_count: number;
}

export default function RunExecutionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [run, setRun] = useState<Run | null>(null);

  const fetchRun = useCallback(async () => {
    const res = await fetch('/api/test-runs?limit=1000');
    const resData = await res.json();
    const currentRun = (resData.data || []).find((r: Run) => r.run_id === id);
    setRun(currentRun || null);
  }, [id]);

  useEffect(() => {
    queueMicrotask(() => {
        fetchRun();
    });
  }, [fetchRun]);

  const completeRun = async () => {
    if (!confirm('Are you sure you want to complete this test run?')) return;
    
    await fetch('/api/test-runs', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ run_id: id, status: 'Completed' }),
    });

    router.push('/runs');
  };

  const completionRate = run ? Math.round(((run.passed_count + run.failed_count) / run.total_cases) * 100) : 0;

  return (
    <div className="container mx-auto p-4 md:p-8 flex flex-col gap-8 max-w-7xl text-text-theme-main">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Link href="/runs" className="text-text-theme-muted hover:text-text-theme-main transition-colors">
                <ArrowLeft size={18} />
            </Link>
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary-theme bg-primary-theme/10 px-2 py-0.5 rounded-full">
                Run Details
            </span>
            {run?.type && (
                <span className="text-[10px] font-bold uppercase tracking-widest text-text-theme-subtle bg-surface-accent px-2 py-0.5 rounded-full">
                    {run.type}
                </span>
            )}
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-text-theme-main">
            {run?.name || 'Loading Run...'}
          </h1>
          <p className="text-text-theme-muted">Review and update the status of each test case in this run.</p>
        </div>

        {run && run.status !== 'Completed' && (
            <Button onClick={completeRun} className="bg-success-theme hover:bg-success-theme/80 shadow-lg shadow-success-theme/20">
                <CheckCircle size={18} className="mr-2" /> Complete Test Run
            </Button>
        )}
      </div>

      {run && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-surface border border-border-theme p-4 rounded-xl shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-[10px] font-bold text-text-theme-muted uppercase tracking-wider">
                    <Layout size={14} className="text-primary-theme" /> Project Context
                </div>
                <div className="text-sm font-bold truncate">{run.project_name}</div>
                <div className="flex flex-wrap gap-2 pt-1">
                    {run.assigned_tester_names && run.assigned_tester_names.map(name => (
                        <div key={name} className="flex items-center gap-1.5 text-[10px] font-bold text-primary-theme bg-primary-theme/5 px-2 py-0.5 rounded-full border border-primary-theme/10 uppercase">
                            <User size={10} /> {name}
                        </div>
                    ))}
                    {(!run.assigned_tester_names || run.assigned_tester_names.length === 0) && (
                         <div className="text-[10px] text-text-theme-muted italic font-bold">Unassigned</div>
                    )}
                </div>
            </div>

            <div className="bg-surface border border-border-theme p-4 rounded-xl shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-[10px] font-bold text-text-theme-muted uppercase tracking-wider">
                    <Calendar size={14} className="text-primary-theme" /> Timeline
                </div>
                <div className="space-y-1">
                    <div className="text-[11px] font-bold flex justify-between">
                        <span className="text-text-theme-muted">STARTED:</span>
                        <span>{new Date(run.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="text-[11px] font-bold flex justify-between">
                        <span className="text-text-theme-muted">STATUS:</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${run.status === 'Completed' ? 'bg-success-theme/10 text-success-theme' : 'bg-warning-theme/10 text-warning-theme'}`}>{run.status}</span>
                    </div>
                </div>
            </div>

            <div className="bg-surface border border-border-theme p-4 rounded-xl shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-[10px] font-bold text-text-theme-muted uppercase tracking-wider">
                    <BarChart3 size={14} className="text-primary-theme" /> Execution Progress
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between items-end">
                        <span className="text-2xl font-black">{completionRate}%</span>
                        <span className="text-[10px] font-bold text-text-theme-muted uppercase">{run.passed_count + run.failed_count} / {run.total_cases} CASES</span>
                    </div>
                    <div className="w-full bg-surface-muted h-1.5 rounded-full overflow-hidden">
                        <div className="bg-primary-theme h-full transition-all duration-500" style={{ width: `${completionRate}%` }} />
                    </div>
                </div>
            </div>

            <div className="bg-surface border border-border-theme p-4 rounded-xl shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-[10px] font-bold text-text-theme-muted uppercase tracking-wider">
                    <BarChart3 size={14} className="text-primary-theme" /> Metrics
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-success-theme/5 p-1.5 rounded border border-success-theme/10">
                        <div className="text-[9px] font-bold text-success-theme uppercase">Pass</div>
                        <div className="text-sm font-black text-success-theme">{run.passed_count}</div>
                    </div>
                    <div className="bg-danger-theme/5 p-1.5 rounded border border-danger-theme/10">
                        <div className="text-[9px] font-bold text-danger-theme uppercase">Fail</div>
                        <div className="text-sm font-black text-danger-theme">{run.failed_count}</div>
                    </div>
                    <div className="bg-warning-theme/5 p-1.5 rounded border border-warning-theme/10">
                        <div className="text-[9px] font-bold text-warning-theme uppercase">Pend</div>
                        <div className="text-sm font-black text-warning-theme">{run.pending_count}</div>
                    </div>
                </div>
            </div>
        </div>
      )}

      <TestExecutionTable runId={id} onUpdate={fetchRun} />
    </div>
  );
}
