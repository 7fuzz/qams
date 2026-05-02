"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui";
import { AgGridReact } from 'ag-grid-react';
import { 
  ColDef, 
  AllCommunityModule,
  ModuleRegistry,
} from 'ag-grid-community';
import { unifiedGridTheme, GRID_CONTAINER_CLASS } from '@/lib/theme';

ModuleRegistry.registerModules([AllCommunityModule]);

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/users')
      .then(async res => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Unauthorized');
        }
        return res.json();
      })
      .then(data => {
        setUsers(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const columnDefs = useMemo<ColDef[]>(() => [
    { field: 'user_id', headerName: 'ID', width: 80 },
    { field: 'name', headerName: 'Name', flex: 1 },
    { field: 'email', headerName: 'Email', flex: 1 },
    { field: 'role', headerName: 'Role', width: 120 },
  ], []);

  if (loading) return <div className="p-8">Loading users...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <div className="flex flex-col gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-black dark:text-white">User Management</h1>
          <p className="text-gray-500 dark:text-gray-400">
            View and manage system users. (Admin Only)
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Users List</CardTitle>
            <CardDescription>All registered users and their roles.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={GRID_CONTAINER_CLASS}>
              <div className="w-full h-[500px]">
                <AgGridReact
                  theme={unifiedGridTheme}
                  rowData={users}
                  columnDefs={columnDefs}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
