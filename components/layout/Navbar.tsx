"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "../ui/Button";

export const Navbar = () => {
  const [user, setUser] = useState<{ isLoggedIn: boolean; role: string; name: string } | null>(null);
  const router = useRouter();

  const fetchUser = async () => {
    const res = await fetch("/api/user");
    const data = await res.json();
    setUser(data);
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    setUser({ isLoggedIn: false, role: "", name: "" });
    router.push("/login");
    router.refresh();
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md dark:bg-gray-950/80 dark:border-gray-800">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold tracking-tighter">
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
          {user?.isLoggedIn ? (
            <>
              <span className="text-sm text-gray-500 mr-2">Hello, {user.name}</span>
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
