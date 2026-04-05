'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Command, Search, Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const pageNames: Record<string, string> = {
  '/': 'Dashboard',
  '/tasks': 'Tasks Board',
  '/content-pipeline': 'Content Pipeline',
  '/journal': 'Journal',
  '/ai-team': 'AI Team',
  '/council': 'Council',
  '/calendar': 'Calendar',
  '/memory': 'Memory Bank',
  '/contacts': 'Contacts & CRM',
  '/settings': 'Settings',
};

interface TopBarProps {
  onOpenCommandPalette: () => void;
}

export function TopBar({ onOpenCommandPalette }: TopBarProps) {
  const pathname = usePathname();
  const currentPage = pageNames[pathname] || 'Mission Control';

  return (
    <header className="h-12 bg-bg-base border-b border-border-base flex items-center justify-between px-4 shrink-0 z-10 relative">
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 rounded-md bg-bg-panel border border-border-base flex items-center justify-center shadow-elevation-card-rest">
          <Command size={12} className="text-text-muted" />
        </div>
        <span className="text-sm font-medium text-text-base tracking-tight">{currentPage}</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center gap-2 bg-bg-subtle border border-border-base rounded-md px-3 py-1.5 text-sm text-text-muted hover:text-text-base hover:border-border-strong transition-colors cursor-pointer"
        >
          <Search size={14} />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden sm:inline text-[10px] border border-border-strong rounded px-1.5 py-0.5 font-mono bg-bg-panel ml-4">
            ⌘K
          </kbd>
        </button>

        <button className="relative p-2 text-text-muted hover:text-text-base hover:bg-bg-panel rounded-md transition-colors">
          <Bell size={16} />
          <Badge variant="info" className="absolute -top-0.5 -right-0.5 px-1 py-0 text-[8px] min-w-0">
            3
          </Badge>
        </button>
      </div>
    </header>
  );
}
