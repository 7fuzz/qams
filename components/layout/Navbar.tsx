"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "../ui/Button";
import { User } from "@/types/auth";
import { useTheme } from "@/lib/theme-provider";
import { Sun, Moon } from "lucide-react";

export const Navbar = () => {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  const fetchUser = async () => {
    const res = await fetch("/api/user");
    const data = await res.json();
    setUser(data);
  };

  useEffect(() => {
    queueMicrotask(() => {
      fetchUser();
    });
  }, []);

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    setUser({ isLoggedIn: false, role: "", name: "", user_id: "", email: "", permissions: [] });
    router.push("/login");
    router.refresh();
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border-theme bg-surface/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Left: Brand & Navigation */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-primary-theme rounded-lg flex items-center justify-center text-white font-black shadow-lg shadow-primary-theme/20 group-hover:scale-105 transition-transform">CL</div>
            <span className="text-xl font-bold tracking-tighter text-text-theme-main">ComponentLab</span>
          </Link>

          <div className="hidden md:flex items-center gap-5">
            {!user?.isLoggedIn ? (
               <Link href="/" className="text-sm font-bold text-text-theme-muted hover:text-text-theme-main transition-colors uppercase tracking-widest text-[10px]">Home</Link>
            ) : (
              <Link href="/dashboard" className="text-sm font-bold text-text-theme-muted hover:text-text-theme-main transition-colors uppercase tracking-widest text-[10px]">Dashboard</Link>
            )}
          </div>
        </div>

        {/* Right: Actions & Profile */}
        <div className="flex items-center gap-2">
          {/* Utility Group */}
          <div className="flex items-center border-r border-border-theme pr-4 mr-2">
            <Button variant="ghost" size="sm" onClick={toggleTheme} className="h-9 w-9 p-0 text-text-theme-muted hover:text-text-theme-main">
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </Button>
          </div>

          {/* User Auth Group */}
          <div className="flex items-center gap-3">
            {user?.isLoggedIn ? (
              <>
                <div className="hidden sm:flex flex-col items-end justify-center">
                  <span className="text-xs font-bold text-text-theme-main leading-tight">{user.name}</span>
                  <span className="text-[9px] text-text-theme-subtle font-black uppercase tracking-tighter">{user.role}</span>
                </div>
                <Button variant="outline" size="sm" onClick={handleLogout} className="h-8 border-border-theme text-[10px] font-bold uppercase tracking-widest px-4 hover:bg-danger-theme/5 hover:text-danger-theme hover:border-danger-theme/20 transition-all">Log out</Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="text-[10px] font-bold uppercase tracking-widest">Log in</Button>
                </Link>
                <Button size="sm" className="h-8 bg-primary-theme text-white text-[10px] font-bold uppercase tracking-widest px-6 shadow-lg shadow-primary-theme/20">Get Started</Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
