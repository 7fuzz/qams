"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/user');
        const data = await res.json();
        
        if (data.isLoggedIn) {
          router.replace('/dashboard');
        } else {
          router.replace('/login');
        }
      } catch {
        router.replace('/login');
      }
    };

    checkAuth();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary-theme border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-widest text-text-theme-subtle animate-pulse">
            Authenticating Session...
        </p>
      </div>
    </div>
  );
}
