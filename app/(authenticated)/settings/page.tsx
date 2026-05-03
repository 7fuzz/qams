"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Label, Button } from "@/components/ui";
import { Key, ShieldCheck, AlertCircle } from 'lucide-react';

export default function SettingsPage() {
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
        setStatus({ type: 'error', message: 'New passwords do not match' });
        return;
    }
    
    setLoading(true);
    setStatus(null);

    try {
        const res = await fetch('/api/user/password', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                currentPassword: passwords.current,
                newPassword: passwords.new
            })
        });

        const data = await res.json();
        if (res.ok) {
            setStatus({ type: 'success', message: 'Password updated successfully!' });
            setPasswords({ current: '', new: '', confirm: '' });
        } else {
            setStatus({ type: 'error', message: data.error || 'Failed to update password' });
        }
    } catch {
        setStatus({ type: 'error', message: 'An unexpected error occurred' });
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-4xl space-y-8 text-black dark:text-white">
      <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
          <p className="text-gray-500 text-sm">Manage your profile and security preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-4">
            <h2 className="text-lg font-bold">Security</h2>
            <p className="text-xs text-gray-500 leading-relaxed">
                Ensure your account is using a long, random password to stay secure. 
                Google-linked accounts can also set a password for manual login.
            </p>
        </div>

        <Card className="md:col-span-2 shadow-sm border dark:border-gray-800 bg-white dark:bg-gray-950">
            <CardHeader className="border-b dark:border-gray-800">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Key size={20} className="text-indigo-500" /> Password Management
                </CardTitle>
                <CardDescription>Update your login credentials.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
                <form onSubmit={handlePasswordChange} className="space-y-4">
                    {status && (
                        <div className={`p-4 rounded-lg flex items-center gap-3 text-sm font-medium ${
                            status.type === 'success' ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"
                        }`}>
                            {status.type === 'success' ? <ShieldCheck size={18}/> : <AlertCircle size={18}/>}
                            {status.message}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Current Password</Label>
                        <Input 
                            type="password" 
                            value={passwords.current} 
                            onChange={e => setPasswords({...passwords, current: e.target.value})} 
                            placeholder="••••••••"
                            className="bg-white dark:bg-gray-950"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <div className="space-y-2">
                            <Label>New Password</Label>
                            <Input 
                                type="password" 
                                value={passwords.new} 
                                onChange={e => setPasswords({...passwords, new: e.target.value})}
                                placeholder="New password"
                                className="bg-white dark:bg-gray-950"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Confirm New Password</Label>
                            <Input 
                                type="password" 
                                value={passwords.confirm} 
                                onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                                placeholder="Confirm new password"
                                className="bg-white dark:bg-gray-950"
                            />
                        </div>
                    </div>

                    <div className="pt-4">
                        <Button type="submit" disabled={loading} className="w-full md:w-auto px-8 shadow-lg shadow-indigo-500/20">
                            {loading ? 'Updating...' : 'Update Password'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
