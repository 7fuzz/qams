"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Button, IconButton } from "../ui";
import { User } from "@/types/auth";
import { useTheme } from "@/lib/theme-provider";
import { Sun, Moon } from "lucide-react";

export const Navbar = () => {
  const [user, setUser] = useState<User | null>(null);
  const [visible, setVisible] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/user");
      const data = await res.json();
      setUser(data);
    } catch {
      setUser({ isLoggedIn: false, role: "", name: "", user_id: "", email: "", permissions: [] });
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      fetchUser();
    });
  }, [fetchUser, pathname]);

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY <= 0) {
        setVisible(true);
      } else if (currentScrollY > lastScrollY) {
        setVisible(false);
      } else if (currentScrollY < lastScrollY) {
        setVisible(true);
      }

      lastScrollY = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    setUser({ isLoggedIn: false, role: "", name: "", user_id: "", email: "", permissions: [] });
    router.push("/login");
    router.refresh();
  };

  return (
    <nav
      style={{ left: "var(--app-sidebar-width, 16rem)" }}
      className={`fixed right-0 top-0 z-50 border-b border-border-theme bg-surface/80 backdrop-blur-md transition-transform duration-300 ${visible ? 'translate-y-0' : '-translate-y-full'}`}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Left: Brand & Navigation */}
        <div className="flex items-center gap-8">
          <Link href={user?.isLoggedIn ? "/dashboard" : "/"} className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-primary-theme rounded-lg flex items-center justify-center text-white font-black shadow-lg shadow-primary-theme/20 group-hover:scale-105 transition-transform">TM</div>
            <span className="text-xl font-bold tracking-tighter text-text-theme-main">Test Management System</span>
          </Link>

          <div className="hidden lg:flex items-center gap-6">
            {user?.isLoggedIn && (
              <>
                {/* Group: Core */}
                <div className="flex items-center gap-4 border-r border-border-theme pr-6">
                  <Link href="/dashboard" className="text-sm font-bold text-text-theme-muted hover:text-text-theme-main transition-colors uppercase tracking-widest text-[10px]">Dashboard</Link>
                  <Link href="/management" className="text-sm font-bold text-text-theme-muted hover:text-text-theme-main transition-colors uppercase tracking-widest text-[10px]">Projects</Link>
                </div>
                
                {/* Group: Testing */}
                <div className="flex items-center gap-4">
                  <Link href="/tests" className="text-sm font-bold text-text-theme-muted hover:text-text-theme-main transition-colors uppercase tracking-widest text-[10px]">Library</Link>
                  <Link href="/runs" className="text-sm font-bold text-text-theme-muted hover:text-text-theme-main transition-colors uppercase tracking-widest text-[10px]">Executions</Link>
                </div>
              </>
            )}
            {!user?.isLoggedIn && (
               <Link href="/" className="text-sm font-bold text-text-theme-muted hover:text-text-theme-main transition-colors uppercase tracking-widest text-[10px]">Home</Link>
            )}
          </div>
        </div>

        {/* Right: Actions & Profile */}
        <div className="flex items-center gap-4">
          {/* Utility Group */}
            <IconButton
              icon={theme === "light" ? Moon : Sun}
              variant="ghost"
              size="md"
              className="h-9 w-9 text-text-theme-muted hover:text-text-theme-main rounded-md transition-all"
              aria-label="Toggle theme"
              onClick={toggleTheme}
            />

          <div className="h-6 w-px bg-border-theme hidden sm:block" />

          {/* User Auth Group */}
          <div className="flex items-center gap-3">
            {user === null ? (
              <div className="w-24 h-8 bg-surface-accent animate-pulse rounded-md" />
            ) : user.isLoggedIn ? (
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
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
