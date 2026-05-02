"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  ClipboardList,
  FileText,
  FolderTree
} from "lucide-react";

interface SidebarProps {
  userRole: string;
}

export const Sidebar = ({ userRole }: SidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  const menuItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "System Management", href: "/management", icon: FolderTree },
    { name: "Test Library", href: "/tests", icon: ClipboardList },
    { name: "Test Executions", href: "/runs", icon: FileText },
  ];

  if (userRole === 'Admin') {
    menuItems.push({ name: "User Admin", href: "/admin/users", icon: Users });
  }

  menuItems.push({ name: "Settings", href: "/settings", icon: Settings });

  return (
    <aside 
      className={`relative flex flex-col border-r bg-white dark:bg-gray-950 transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      <div className="flex h-16 items-center justify-between px-4 border-b">
        {!isCollapsed && <span className="text-lg font-bold tracking-tight">Menu</span>}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="rounded-md p-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive 
                  ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100" 
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-gray-100"
              }`}
            >
              <item.icon size={20} />
              {!isCollapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};
