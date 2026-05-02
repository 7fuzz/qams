"use client";

import React, { use } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { TestExecutionGrid } from "@/components/TestExecutionGrid";

export default function RunExecutionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <div className="container mx-auto p-4 md:p-8 flex flex-col gap-8 max-w-7xl">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Execute Test Run</h1>
        <p className="text-gray-500">Update the status of each test case as you perform them.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Test Cases</CardTitle>
          <CardDescription>Double-click a cell to edit status or actual results.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <TestExecutionGrid runId={Number(id)} />
        </CardContent>
      </Card>
    </div>
  );
}
