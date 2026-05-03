"use client";

import React, { useState } from "react";
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
  FolderTree,
  Tag,
  AlertTriangle,
  Lock
} from "lucide-react";

interface SidebarProps {
  userRole: string;
  userPermissions?: string[];
}

export const Sidebar = ({ userRole, userPermissions = [] }: SidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  const menuItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "System Management", href: "/management", icon: FolderTree },
    { name: "Test Library", href: "/tests", icon: ClipboardList },
    { name: "Test Executions", href: "/runs", icon: FileText },
    { name: "Issue Management", href: "/issues", icon: AlertTriangle },
    { name: "Releases", href: "/releases", icon: Tag },
  ];

  if (userPermissions.includes('users:manage')) {
    menuItems.push({ name: "User Admin", href: "/admin/users", icon: Users });
  }

  if (userPermissions.includes('roles:manage')) {
    menuItems.push({ name: "Role Matrix", href: "/admin/roles", icon: Lock });
  }

  menuItems.push({ name: "Settings", href: "/settings", icon: Settings });

  return (
    <aside 
      className={`relative flex flex-col border-r border-border-theme bg-surface transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      <div className="flex h-16 items-center justify-between px-4 border-b border-border-theme">
        {!isCollapsed && <span className="text-lg font-bold tracking-tight text-text-theme-main">Menu</span>}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="rounded-md p-1 hover:bg-surface-accent transition-colors text-text-theme-muted"
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
                  ? "bg-surface-accent text-text-theme-main" 
                  : "text-text-theme-muted hover:bg-surface-muted hover:text-text-theme-main"
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
