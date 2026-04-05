'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import {
  LayoutGrid, Bot, GitMerge, CheckCircle, Crown, Calendar,
  Brain, Users, Settings, BookOpen, LogOut, ChevronsLeft, ChevronsRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/ui/tooltip';
import { Avatar } from '@/components/ui/avatar';

const navGroups = [
  {
    label: 'Main',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid, href: '/' },
      { id: 'tasks', label: 'Tasks Board', icon: CheckCircle, href: '/tasks' },
      { id: 'content-pipeline', label: 'Content Pipeline', icon: GitMerge, href: '/content-pipeline' },
      { id: 'journal', label: 'Journal', icon: BookOpen, href: '/journal' },
    ],
  },
  {
    label: 'AI',
    items: [
      { id: 'ai-team', label: 'AI Team', icon: Bot, href: '/ai-team' },
      { id: 'council', label: 'Council', icon: Crown, href: '/council' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { id: 'calendar', label: 'Calendar', icon: Calendar, href: '/calendar' },
      { id: 'memory', label: 'Memory', icon: Brain, href: '/memory' },
      { id: 'contacts', label: 'Contacts', icon: Users, href: '/contacts' },
    ],
  },
  {
    label: 'System',
    items: [
      { id: 'settings', label: 'Settings', icon: Settings, href: '/settings' },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <motion.div
      animate={{ width: collapsed ? 64 : 224 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="bg-bg-base border-r border-border-base h-full flex flex-col shrink-0 overflow-hidden"
    >
      {/* Collapse toggle */}
      <div className={cn('flex items-center h-14 shrink-0 border-b border-border-base', collapsed ? 'justify-center px-2' : 'justify-between px-4')}>
        {!collapsed && (
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider truncate">
            Mission Control
          </span>
        )}
        <button
          onClick={onToggle}
          className="p-1.5 text-text-muted hover:text-text-base hover:bg-bg-panel rounded-md transition-colors"
        >
          {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
        </button>
      </div>

      {/* Nav items */}
      <div className="flex-1 py-3 px-2 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <div className="px-2 mb-1.5 text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                {group.label}
              </div>
            )}
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

                const link = (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-md text-sm transition-all duration-150',
                      collapsed ? 'justify-center px-2 py-2' : 'px-3 py-2',
                      isActive
                        ? 'bg-bg-panel text-text-base font-medium border border-border-base shadow-elevation-card-rest'
                        : 'text-text-muted border border-transparent hover:text-text-base hover:bg-bg-panel/50'
                    )}
                  >
                    <Icon
                      size={16}
                      className={cn(
                        'shrink-0',
                        isActive ? 'text-accent' : 'text-text-muted'
                      )}
                    />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );

                if (collapsed) {
                  return (
                    <Tooltip key={item.id} content={item.label} side="right">
                      {link}
                    </Tooltip>
                  );
                }
                return <div key={item.id}>{link}</div>;
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom section */}
      <div className={cn('border-t border-border-base', collapsed ? 'p-2' : 'p-3')}>
        <a
          href="/api/auth/logout"
          className={cn(
            'flex items-center gap-2 text-sm text-text-muted hover:text-text-base rounded-lg hover:bg-bg-panel transition-colors',
            collapsed ? 'justify-center p-2' : 'px-3 py-2'
          )}
        >
          <LogOut size={16} />
          {!collapsed && <span>Logout</span>}
        </a>
        <div className={cn('mt-2', collapsed ? 'flex justify-center' : 'px-1')}>
          <Avatar name="Ansh" color="bg-emerald-500/20 text-emerald-400" size={collapsed ? 'md' : 'md'} />
        </div>
      </div>
    </motion.div>
  );
}
