'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import {
  Activity, CheckCircle2, Clock, PlayCircle, Plus, Crown, Calendar,
  GitMerge, ArrowRight, X, Lightbulb,
} from 'lucide-react';
import { ACPMessage } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { staggerContainer, staggerItem } from '@/lib/motion';

function timeAgo(iso: string) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const duration = 800;
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);

  return <span>{display}</span>;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

interface QuickNote {
  id: string;
  text: string;
  createdAt: number;
}

export function DashboardView() {
  const [messages, setMessages] = useState<ACPMessage[]>([]);
  const [activeTasks, setActiveTasks] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);
  const [contentCount, setContentCount] = useState(0);
  const [mrrValue, setMrrValue] = useState('$0');
  const [loading, setLoading] = useState(true);
  const [recentTasks, setRecentTasks] = useState<{ id: string; title: string; columnId: string }[]>([]);

  // Quick Capture state
  const [noteInput, setNoteInput] = useState('');
  const [notes, setNotes] = useState<QuickNote[]>([]);
  const noteInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/tasks').then(r => r.json()).then((data: { id: string; title: string; columnId: string }[]) => {
        setTotalTasks(data.length);
        setActiveTasks(data.filter(t => t.columnId === 'in-progress').length);
        setRecentTasks(data.filter(t => t.columnId === 'in-progress').slice(0, 3));
      }).catch(() => {}),
      fetch('/api/content').then(r => r.json()).then((data: unknown[]) => setContentCount(data.length)).catch(() => {}),
      fetch('/api/kpis?name=mrr').then(r => r.json()).then((data: { value?: string }[]) => {
        if (data?.[0]?.value) setMrrValue('$' + data[0].value);
      }).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch('/api/acp?limit=10')
      .then(r => r.json())
      .then((data: ACPMessage[]) => setMessages(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const es = new EventSource('/api/acp/stream');
    es.onmessage = (e) => {
      try {
        const msg: ACPMessage = JSON.parse(e.data);
        setMessages(prev => [msg, ...prev].slice(0, 20));
      } catch { /* ignore */ }
    };
    return () => es.close();
  }, []);

  const addNote = () => {
    const text = noteInput.trim();
    if (!text) return;
    setNotes(prev => [{ id: crypto.randomUUID(), text, createdAt: Date.now() }, ...prev].slice(0, 20));
    setNoteInput('');
    noteInputRef.current?.focus();
  };

  const deleteNote = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  const metrics = [
    { label: 'Active Tasks', value: activeTasks, displayValue: String(activeTasks), icon: CheckCircle2, color: 'text-blue-400', subtext: `${totalTasks} total` },
    { label: 'Content Pipeline', value: contentCount, displayValue: String(contentCount), icon: PlayCircle, color: 'text-purple-400', subtext: 'Items tracked' },
    { label: 'MRR', value: 0, displayValue: mrrValue, icon: Calendar, color: 'text-green-400', subtext: 'Current MRR' },
    { label: 'ACP Messages', value: messages.length, displayValue: String(messages.length), icon: Activity, color: 'text-emerald-400', subtext: 'Live agent messages' },
  ];

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="h-full flex flex-col bg-bg-base overflow-y-auto custom-scrollbar">
      <div className="p-8 pb-0">
        {/* Greeting */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <h1 className="text-2xl font-semibold text-text-base tracking-tight">{getGreeting()}, Ansh</h1>
          <p className="text-text-muted mt-1 text-sm">{today} — Velocity Intelligence</p>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="flex items-center gap-3 mt-6"
        >
          <Link href="/tasks">
            <Button variant="secondary" size="sm"><Plus size={14} /> New Task</Button>
          </Link>
          <Link href="/content-pipeline">
            <Button variant="secondary" size="sm"><GitMerge size={14} /> Content</Button>
          </Link>
          <Link href="/council">
            <Button variant="secondary" size="sm"><Crown size={14} /> Council</Button>
          </Link>
        </motion.div>
      </div>

      {/* Metrics Grid */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-8"
      >
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-bg-panel border border-border-base rounded-xl p-5">
                <Skeleton className="h-4 w-24 mb-4" />
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))
          : metrics.map((metric, i) => {
              const Icon = metric.icon;
              return (
                <motion.div
                  key={i}
                  variants={staggerItem}
                  className="bg-bg-panel border border-border-base rounded-xl p-5 shadow-elevation-card-rest hover:shadow-elevation-card-hover transition-shadow"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-medium text-text-muted uppercase tracking-wider">{metric.label}</span>
                    <Icon size={18} className={metric.color} />
                  </div>
                  <div className="text-3xl font-semibold text-text-base mb-1 font-mono">
                    {metric.value > 0 ? <AnimatedNumber value={metric.value} /> : metric.displayValue}
                  </div>
                  <div className="text-xs text-text-muted">{metric.subtext}</div>
                </motion.div>
              );
            })}
      </motion.div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 px-8 pb-8">
        {/* In Progress panel */}
        <div className="bg-bg-panel border border-border-base rounded-xl shadow-elevation-card-rest overflow-hidden flex flex-col">
          <div className="p-5 border-b border-border-base flex items-center justify-between">
            <h2 className="text-sm font-medium text-text-base">In Progress</h2>
            <Link href="/tasks" className="text-xs text-text-muted hover:text-accent flex items-center gap-1 transition-colors">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col gap-4">
            {/* Task cards */}
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : recentTasks.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 size={24} />}
                title="No tasks in progress"
                description="Create a task to get started."
                className="py-8"
              />
            ) : (
              <div className="flex flex-col gap-2">
                {recentTasks.map((task) => (
                  <div
                    key={task.id}
                    className="bg-bg-subtle border border-border-base rounded-lg p-3.5 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-text-base font-medium truncate">{task.title}</p>
                      <Badge variant="info" className="mt-1.5 text-[10px]">In Progress</Badge>
                    </div>
                    <Link
                      href="/tasks"
                      className="text-xs text-text-muted hover:text-accent transition-colors shrink-0 mt-0.5"
                    >
                      View
                    </Link>
                  </div>
                ))}
              </div>
            )}

            {/* ACP activity strip */}
            {messages.length > 0 && (
              <div className="border-t border-border-base pt-3 mt-auto">
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">Recent ACP</p>
                <div className="flex flex-col gap-1.5">
                  {messages.slice(0, 3).map((msg) => (
                    <p key={msg.id} className="text-[11px] text-text-muted leading-relaxed">
                      <span className="text-text-base font-medium">{msg.from}</span>
                      {' → '}
                      <span>{msg.to}: </span>
                      <span>
                        {msg.content.length > 80 ? msg.content.slice(0, 80) + '…' : msg.content}
                      </span>
                      <span className="text-text-muted opacity-60"> · {timeAgo(msg.timestamp)}</span>
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Capture panel */}
        <div className="bg-bg-panel border border-border-base rounded-xl shadow-elevation-card-rest overflow-hidden flex flex-col">
          <div className="p-5 border-b border-border-base flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb size={14} className="text-amber-400" />
              <h2 className="text-sm font-medium text-text-base">Quick Capture</h2>
            </div>
            <button
              onClick={() => noteInputRef.current?.focus()}
              className="flex items-center gap-1 text-xs text-text-muted hover:text-text-base border border-border-base hover:border-border-strong rounded-md px-2 py-1 transition-colors"
            >
              <Plus size={12} />
              Add Note
            </button>
          </div>

          {/* Input */}
          <div className="p-4 border-b border-border-base">
            <div className="flex gap-2">
              <input
                ref={noteInputRef}
                type="text"
                value={noteInput}
                onChange={e => setNoteInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addNote(); }}
                placeholder="Capture a thought..."
                className="flex-1 bg-bg-subtle border border-border-base rounded-md px-3 py-2 text-sm text-text-base placeholder:text-text-muted focus:outline-none focus:border-border-strong transition-colors"
              />
              <button
                onClick={addNote}
                disabled={!noteInput.trim()}
                className="px-3 py-2 bg-accent text-white rounded-md text-sm font-medium hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Notes list */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {notes.length === 0 ? (
              <EmptyState
                icon={<Lightbulb size={24} />}
                title="No notes yet"
                description="Type a thought above and press Enter."
                className="py-8"
              />
            ) : (
              <div className="flex flex-col gap-2">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="bg-bg-subtle border border-border-base rounded-lg px-3 py-2.5 flex items-start gap-2 group"
                  >
                    <p className="flex-1 text-sm text-text-base leading-relaxed min-w-0 break-words">{note.text}</p>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="p-0.5 text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <X size={12} />
                      </button>
                      <span className="text-[10px] text-text-muted whitespace-nowrap">
                        {timeAgo(new Date(note.createdAt).toISOString())}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
