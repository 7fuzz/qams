"use client";

import React, { use, useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from "@/components/ui";
import { TestExecutionGrid } from "@/components/TestExecutionGrid";
import { CheckCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RunExecutionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [run, setRun] = useState<any>(null);

  const fetchRun = async () => {
    // We could make a specific API for single run but let's just filter from all runs for now or assume a future API
    const res = await fetch('/api/test-runs');
    const data = await res.json();
    const currentRun = data.find((r: any) => r.run_id === Number(id));
    setRun(currentRun);
  };

  useEffect(() => {
    fetchRun();
  }, [id]);

  const completeRun = async () => {
    if (!confirm('Are you sure you want to complete this test run?')) return;
    
    await fetch('/api/test-runs', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ run_id: Number(id), status: 'Completed' }),
    });

    router.push('/runs');
  };

  return (
    <div className="container mx-auto p-4 md:p-8 flex flex-col gap-8 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Link href="/runs" className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                <ArrowLeft size={18} />
            </Link>
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full">
                Run #{id}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-black dark:text-white">
            {run?.name || 'Loading Run...'}
          </h1>
          <p className="text-gray-500">Review and update the status of each test case in this run.</p>
        </div>

        {run?.status !== 'Completed' && (
            <Button onClick={completeRun} className="bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/20">
                <CheckCircle size={18} className="mr-2" /> Complete Test Run
            </Button>
        )}
      </div>

      <TestExecutionGrid runId={Number(id)} />
    </div>
  );
}
