"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui";
import { ActivityLog } from "@/components/grids/ActivityLog";

interface Stats {
  total_projects: number;
  total_users: number;
  recent_activity_count: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="container mx-auto p-8 flex flex-col gap-8 text-text-theme-main">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-text-theme-muted font-medium uppercase tracking-wider text-[10px]">
          Overview of testing activities and system status.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-bold text-text-theme-muted uppercase tracking-widest">Total Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-black">{loading ? '...' : stats?.total_projects}</p>
            <p className="text-[10px] text-text-theme-muted mt-1 font-medium uppercase tracking-tight">Active initiatives in management</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-bold text-text-theme-muted uppercase tracking-widest">Team Size</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-black">{loading ? '...' : stats?.total_users}</p>
            <p className="text-[10px] text-text-theme-muted mt-1 font-medium uppercase tracking-tight">Registered system contributors</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-bold text-text-theme-muted uppercase tracking-widest">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-black text-primary-theme">{loading ? '...' : stats?.recent_activity_count}</p>
            <p className="text-[10px] text-text-theme-muted mt-1 font-medium uppercase tracking-tight">Modifications in the last 24h</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border-theme">
        <CardHeader className="border-b border-border-theme pb-4">
          <CardTitle className="text-lg font-bold">Activity Log</CardTitle>
          <CardDescription>Track who modified what and when.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ActivityLog />
        </CardContent>
      </Card>
    </div>
  );
}
