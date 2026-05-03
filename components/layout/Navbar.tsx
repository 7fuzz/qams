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
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold tracking-tighter text-text-theme-main">
            ComponentLab
          </Link>
          {!user?.isLoggedIn && (
            <div className="hidden md:flex gap-4">
               <Link href="/" className="text-sm font-medium hover:text-gray-600 dark:hover:text-gray-300">
                Home
              </Link>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={toggleTheme} className="mr-2 h-9 w-9 p-0">
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </Button>
          {user?.isLoggedIn ? (
            <>
              <span className="text-sm text-text-theme-muted mr-2">Hello, {user.name}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>Log out</Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">Log in</Button>
              </Link>
              <Button size="sm">Get Started</Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};
