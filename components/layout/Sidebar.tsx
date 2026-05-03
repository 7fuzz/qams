"use client";

import React, { useLayoutEffect, useState } from "react";
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
  Lock,
  LucideIcon
} from "lucide-react";

interface MenuItem {
    name: string;
    href: string;
    icon: LucideIcon;
    permission?: string;
}

interface MenuGroup {
    label: string;
    items: MenuItem[];
}

interface SidebarProps {
  userPermissions?: string[];
}

export const Sidebar = ({ userPermissions = [] }: SidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  useLayoutEffect(() => {
    const width = isCollapsed ? "4rem" : "16rem";
    document.documentElement.style.setProperty("--app-sidebar-width", width);
  }, [isCollapsed]);

  const groups: MenuGroup[] = [
    {
        label: "Workspace",
        items: [
            { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
            { name: "System Management", href: "/management", icon: FolderTree },
        ]
    },
    {
        label: "Testing Operations",
        items: [
            { name: "Test Library", href: "/tests", icon: ClipboardList },
            { name: "Test Executions", href: "/runs", icon: FileText },
            { name: "Issue Management", href: "/issues", icon: AlertTriangle },
            { name: "Releases", href: "/releases", icon: Tag },
        ]
    }
  ];

  // Admin Group
  const adminItems: MenuItem[] = [];
  if (userPermissions.includes('users:manage')) {
    adminItems.push({ name: "User Admin", href: "/admin/users", icon: Users });
  }
  if (userPermissions.includes('roles:manage')) {
    adminItems.push({ name: "Role Matrix", href: "/admin/roles", icon: Lock });
  }

  if (adminItems.length > 0) {
    groups.push({
        label: "Administration",
        items: adminItems
    });
  }

  // Footer Group
  groups.push({
      label: "Support",
      items: [
          { name: "Settings", href: "/settings", icon: Settings }
      ]
  });

  return (
    <aside 
      style={{ width: isCollapsed ? '4rem' : '16rem', minWidth: isCollapsed ? '4rem' : '16rem' }}
      className={`fixed top-0 left-0 h-screen flex flex-col border-r border-border-theme bg-surface transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-64"
      } z-40`}
    >
      <div className="flex h-16 items-center justify-between px-4 border-b border-border-theme shrink-0">
        {!isCollapsed && <span className="text-lg font-bold tracking-tight text-text-theme-main">Menu</span>}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="rounded-md p-1 hover:bg-surface-accent transition-colors text-text-theme-muted"
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-6 scrollbar-none">
        {groups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
                {!isCollapsed && (
                    <h3 className="px-3 text-[10px] font-black uppercase tracking-[0.2em] text-text-theme-subtle mb-2 opacity-50">
                        {group.label}
                    </h3>
                )}
                <div className="space-y-1">
                    {group.items.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                title={isCollapsed ? item.name : undefined}
                                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all group ${
                                    isActive 
                                    ? "bg-primary-theme/10 text-primary-theme" 
                                    : "text-text-theme-muted hover:bg-surface-accent hover:text-text-theme-main"
                                }`}
                            >
                                <item.icon size={18} className={`shrink-0 transition-transform ${isActive ? "scale-110" : "group-hover:scale-105"}`} />
                                {!isCollapsed && <span className="truncate">{item.name}</span>}
                            </Link>
                        );
                    })}
                </div>
            </div>
        ))}
      </nav>
    </aside>
  );
};
