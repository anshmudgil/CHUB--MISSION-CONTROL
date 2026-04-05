'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter } from 'next/navigation';
import {
  Search, LayoutGrid, CheckCircle, GitMerge, BookOpen, Bot, Crown,
  Calendar, Brain, Users, Settings, ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommandItem {
  id: string;
  label: string;
  icon: React.ElementType;
  href: string;
  group: string;
}

const NAV_COMMANDS: CommandItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid, href: '/', group: 'Navigation' },
  { id: 'tasks', label: 'Tasks Board', icon: CheckCircle, href: '/tasks', group: 'Navigation' },
  { id: 'content', label: 'Content Pipeline', icon: GitMerge, href: '/content-pipeline', group: 'Navigation' },
  { id: 'journal', label: 'Journal', icon: BookOpen, href: '/journal', group: 'Navigation' },
  { id: 'ai-team', label: 'AI Team', icon: Bot, href: '/ai-team', group: 'Navigation' },
  { id: 'council', label: 'Council', icon: Crown, href: '/council', group: 'Navigation' },
  { id: 'calendar', label: 'Calendar', icon: Calendar, href: '/calendar', group: 'Navigation' },
  { id: 'memory', label: 'Memory Bank', icon: Brain, href: '/memory', group: 'Navigation' },
  { id: 'contacts', label: 'Contacts & CRM', icon: Users, href: '/contacts', group: 'Navigation' },
  { id: 'settings', label: 'Settings', icon: Settings, href: '/settings', group: 'Navigation' },
];

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const filtered = query
    ? NAV_COMMANDS.filter(
        (c) =>
          c.label.toLowerCase().includes(query.toLowerCase()) ||
          c.group.toLowerCase().includes(query.toLowerCase())
      )
    : NAV_COMMANDS;

  const handleSelect = useCallback(
    (item: CommandItem) => {
      router.push(item.href);
      onClose();
      setQuery('');
    },
    [router, onClose]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter' && filtered[activeIndex]) {
        handleSelect(filtered[activeIndex]);
      }
    },
    [filtered, activeIndex, handleSelect]
  );

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (open) onClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[20vh]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="relative w-full max-w-lg bg-bg-panel border border-border-strong rounded-xl shadow-elevation-dialog overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 border-b border-border-base">
              <Search size={16} className="text-text-muted shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search commands, pages..."
                className="flex-1 bg-transparent text-sm text-text-base placeholder:text-text-muted py-3.5 focus:outline-none"
              />
              <kbd className="text-[10px] border border-border-base rounded px-1.5 py-0.5 font-mono text-text-muted bg-bg-subtle">
                ESC
              </kbd>
            </div>

            <div className="max-h-[320px] overflow-y-auto custom-scrollbar py-2">
              {filtered.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-text-muted">No results found</div>
              ) : (
                <>
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                    {filtered[0]?.group}
                  </div>
                  {filtered.map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setActiveIndex(i)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 mx-1 rounded-lg text-sm transition-colors',
                          i === activeIndex
                            ? 'bg-bg-subtle text-text-base'
                            : 'text-text-muted hover:text-text-base'
                        )}
                      >
                        <Icon size={16} className="shrink-0" />
                        <span className="flex-1 text-left">{item.label}</span>
                        {i === activeIndex && <ArrowRight size={14} className="text-text-muted" />}
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
