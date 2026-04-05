'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { Activity, CheckCircle2, Clock, PlayCircle, Plus, Crown, Calendar, GitMerge, ArrowRight } from 'lucide-react';
import { ACPMessage } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { staggerContainer, staggerItem } from '@/lib/motion';

function getStatusDot(from: string) {
  const map: Record<string, string> = {
    opencore: 'bg-blue-500',
    hermes: 'bg-purple-500',
    user: 'bg-emerald-500',
    broadcast: 'bg-amber-500',
  };
  return map[from] ?? 'bg-zinc-500';
}

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

export function DashboardView() {
  const [messages, setMessages] = useState<ACPMessage[]>([]);
  const [activeTasks, setActiveTasks] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);
  const [contentCount, setContentCount] = useState(0);
  const [mrrValue, setMrrValue] = useState('$0');
  const [loading, setLoading] = useState(true);
  const [recentTasks, setRecentTasks] = useState<{ id: string; title: string; columnId: string }[]>([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/tasks').then(r => r.json()).then((data: { id: string; title: string; columnId: string }[]) => {
        setTotalTasks(data.length);
        setActiveTasks(data.filter(t => t.columnId === 'in-progress').length);
        setRecentTasks(data.filter(t => t.columnId === 'in-progress').slice(0, 5));
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
          <p className="text-text-muted mt-1 text-sm">{today} — Velocity OS Autonomous Agent Operating System</p>
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

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 px-8 pb-8">
        {/* Live ACP Activity Feed */}
        <div className="lg:col-span-2 bg-bg-panel border border-border-base rounded-xl shadow-elevation-card-rest overflow-hidden flex flex-col">
          <div className="p-5 border-b border-border-base flex items-center justify-between">
            <h2 className="text-sm font-medium text-text-base">Live ACP Activity Feed</h2>
            <Badge variant="success" dot>Live</Badge>
          </div>
          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
            {messages.length === 0 ? (
              <EmptyState
                icon={<Activity size={32} />}
                title="No agent messages yet"
                description="Start the Council or trigger OpenCore to see activity."
              />
            ) : (
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.03 }}
                    className="flex gap-3 relative"
                  >
                    {i !== messages.length - 1 && (
                      <div className="absolute left-[9px] top-6 bottom-[-16px] w-[1.5px] bg-border-base" />
                    )}
                    <div className="relative z-10 mt-1">
                      <div className={`w-[18px] h-[18px] rounded-full border-[3px] border-bg-panel ${getStatusDot(msg.from)}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-text-base">
                        <span className="font-medium">{msg.from}</span>
                        <span className="text-text-muted"> → {msg.to}: </span>
                        <span className="text-text-muted line-clamp-2">{msg.content}</span>
                      </p>
                      <p className="text-[10px] text-text-muted mt-0.5 flex items-center gap-1">
                        <Clock size={10} />
                        {timeAgo(msg.timestamp)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Active Tasks */}
        <div className="bg-bg-panel border border-border-base rounded-xl shadow-elevation-card-rest overflow-hidden flex flex-col">
          <div className="p-5 border-b border-border-base flex items-center justify-between">
            <h2 className="text-sm font-medium text-text-base">In Progress</h2>
            <Link href="/tasks" className="text-xs text-text-muted hover:text-accent flex items-center gap-1 transition-colors">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
            {loading ? (
              <div className="space-y-3 p-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
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
              <div className="flex flex-col gap-1">
                {recentTasks.map((task) => (
                  <Link
                    key={task.id}
                    href="/tasks"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-bg-subtle transition-colors group"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                    <span className="text-sm text-text-base truncate flex-1">{task.title}</span>
                    <ArrowRight size={14} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
