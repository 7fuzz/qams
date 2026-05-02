"use client";

import React, { use } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { TestExecutionGrid } from "@/components/TestExecutionGrid";

export default function RunExecutionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <div className="container mx-auto p-4 md:p-8 flex flex-col gap-8 max-w-7xl">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-black dark:text-white">Execute Test Run</h1>
        <p className="text-gray-500">Review and update the status of each test case in this run.</p>
      </div>

      <TestExecutionGrid runId={Number(id)} />
    </div>
  );
}
