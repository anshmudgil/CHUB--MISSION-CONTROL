'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Command, Search, Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ACPMessage } from '@/types';

const pageNames: Record<string, string> = {
  '/': 'Dashboard',
  '/tasks': 'Tasks Board',
  '/planning': 'Planning',
  '/content-pipeline': 'Content Pipeline',
  '/journal': 'Journal',
  '/ai-team': 'AI Team',
  '/council': 'Council',
  '/calendar': 'Calendar',
  '/memory': 'Memory Bank',
  '/contacts': 'Contacts & CRM',
  '/integrations': 'Integrations',
  '/settings': 'Settings',
};

function timeAgo(iso: string) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}

interface TopBarProps {
  onOpenCommandPalette: () => void;
}

export function TopBar({ onOpenCommandPalette }: TopBarProps) {
  const pathname = usePathname();
  const currentPage = pageNames[pathname] || 'Mission Control';
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<ACPMessage[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showNotifications) {
      fetch('/api/acp?limit=5')
        .then(r => r.json())
        .then((data: ACPMessage[]) => setNotifications(data))
        .catch(() => {});
    }
  }, [showNotifications]);

  useEffect(() => {
    if (!showNotifications) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showNotifications]);

  return (
    <header className="h-12 bg-bg-base border-b border-border-base flex items-center px-4 shrink-0 z-10 relative">
      {/* Left: breadcrumb */}
      <div className="flex-1 flex items-center gap-3">
        <div className="w-6 h-6 rounded-md bg-bg-panel border border-border-base flex items-center justify-center shadow-elevation-card-rest">
          <Command size={12} className="text-text-muted" />
        </div>
        <div className="flex flex-col justify-center">
          <span className="text-sm font-medium text-text-base tracking-tight leading-none">{currentPage}</span>
          {pathname === '/' && (
            <p className="text-[10px] text-text-muted mt-0.5">Velocity Intelligence</p>
          )}
        </div>
      </div>

      {/* Center: search */}
      <div className="flex-shrink-0 w-80">
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center gap-2 w-full bg-bg-subtle border border-border-base rounded-md px-3 py-1.5 text-sm text-text-muted hover:text-text-base hover:border-border-strong transition-colors cursor-pointer"
        >
          <Search size={14} />
          <span className="hidden sm:inline flex-1 text-left">Search</span>
          <kbd className="hidden sm:inline text-[10px] border border-border-strong rounded px-1.5 py-0.5 font-mono bg-bg-panel ml-auto">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: bell */}
      <div className="flex-1 flex justify-end" ref={dropdownRef}>
        <div className="relative">
          <button
            onClick={() => setShowNotifications(v => !v)}
            className="relative p-2 text-text-muted hover:text-text-base hover:bg-bg-panel rounded-md transition-colors"
          >
            <Bell size={16} />
            <Badge variant="info" className="absolute -top-0.5 -right-0.5 px-1 py-0 text-[8px] min-w-0">
              3
            </Badge>
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-1 w-96 bg-bg-panel border border-border-base rounded-xl shadow-elevation-card-hover z-50 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border-base flex items-center justify-between">
                <span className="text-xs font-semibold text-text-base uppercase tracking-wider">Recent Activity</span>
                <span className="text-[10px] text-text-muted">ACP Messages</span>
              </div>
              <div className="max-h-72 overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-text-muted">No recent messages</div>
                ) : (
                  notifications.map((msg) => (
                    <div key={msg.id} className="px-4 py-2.5 border-b border-border-base last:border-0 hover:bg-bg-subtle transition-colors">
                      <p className="text-xs text-text-base leading-relaxed">
                        <span className="font-medium text-accent">{msg.from}</span>
                        <span className="text-text-muted"> → {msg.to}: </span>
                        <span className="text-text-muted">
                          {msg.content.length > 60 ? msg.content.slice(0, 60) + '…' : msg.content}
                        </span>
                      </p>
                      <p className="text-[10px] text-text-muted mt-0.5">{timeAgo(msg.timestamp)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
