'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid, Bot, GitMerge, CheckCircle, Crown, Calendar,
  Brain, Users, Settings, BookOpen, LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid, href: '/' },
  { id: 'tasks', label: 'Tasks Board', icon: CheckCircle, href: '/tasks' },
  { id: 'content-pipeline', label: 'Content Pipeline', icon: GitMerge, href: '/content-pipeline' },
  { id: 'journal', label: 'Journal', icon: BookOpen, href: '/journal' },
  { id: 'ai-team', label: 'AI Team', icon: Bot, href: '/ai-team' },
  { id: 'council', label: 'Council', icon: Crown, href: '/council' },
  { id: 'calendar', label: 'Calendar', icon: Calendar, href: '/calendar' },
  { id: 'memory', label: 'Memory', icon: Brain, href: '/memory' },
  { id: 'contacts', label: 'Contacts', icon: Users, href: '/contacts' },
  { id: 'settings', label: 'Settings', icon: Settings, href: '/settings' },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-56 bg-bg-base border-r border-border-base h-full flex flex-col shrink-0">
      <div className="flex-1 py-4 px-2 flex flex-col gap-0.5 overflow-y-auto custom-scrollbar">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-150 border",
                isActive
                  ? "bg-bg-panel text-text-base font-medium border-border-base shadow-elevation-card-rest"
                  : "text-text-muted border-transparent hover:text-text-base hover:bg-bg-panel/50"
              )}
            >
              <Icon size={16} className={cn(isActive ? "text-text-base" : "text-text-muted")} />
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-border-base flex flex-col gap-2">
        <a
          href="/api/auth/logout"
          className="flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-text-base rounded-lg hover:bg-bg-panel transition-colors"
        >
          <LogOut size={16} />
          Logout
        </a>
        <div className="flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-bg-panel border border-border-base flex items-center justify-center text-text-muted font-bold">
            A
          </div>
        </div>
      </div>
    </div>
  );
}
