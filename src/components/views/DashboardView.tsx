'use client';

import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle2, Clock, Calendar, PlayCircle } from 'lucide-react';
import { ACPMessage } from '@/types';

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

export function DashboardView() {
  const [messages, setMessages] = useState<ACPMessage[]>([]);
  const [activeTasks, setActiveTasks] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);
  const [contentCount, setContentCount] = useState(0);
  const [mrrValue, setMrrValue] = useState('$0');

  // Fetch real stats
  useEffect(() => {
    fetch('/api/tasks')
      .then(r => r.json())
      .then((data: { columnId: string }[]) => {
        setTotalTasks(data.length);
        setActiveTasks(data.filter((t) => t.columnId === 'in-progress').length);
      })
      .catch(() => {});

    fetch('/api/content')
      .then(r => r.json())
      .then((data: unknown[]) => setContentCount(data.length))
      .catch(() => {});

    fetch('/api/kpis?name=mrr')
      .then(r => r.json())
      .then((data: { value?: string }[]) => {
        if (data && data[0]?.value) setMrrValue('$' + data[0].value);
      })
      .catch(() => {});
  }, []);

  // Seed with recent messages on mount
  useEffect(() => {
    fetch('/api/acp?limit=10')
      .then(r => r.json())
      .then((data: ACPMessage[]) => setMessages(data))
      .catch(() => {});
  }, []);

  // Subscribe to live ACP feed via SSE
  useEffect(() => {
    const es = new EventSource('/api/acp/stream');
    es.onmessage = (e) => {
      try {
        const msg: ACPMessage = JSON.parse(e.data);
        setMessages(prev => [msg, ...prev].slice(0, 20));
      } catch { /* ignore malformed events */ }
    };
    return () => es.close();
  }, []);

  const metrics = [
    { label: 'Active Tasks', value: String(activeTasks), icon: CheckCircle2, color: 'text-blue-400', subtext: `${totalTasks} total` },
    { label: 'Content Pipeline', value: String(contentCount), icon: PlayCircle, color: 'text-purple-400', subtext: 'Items tracked' },
    { label: 'MRR', value: mrrValue, icon: Calendar, color: 'text-green-400', subtext: 'Current MRR' },
    { label: 'ACP Messages', value: String(messages.length), icon: Activity, color: 'text-emerald-400', subtext: 'Live agent messages' },
  ];

  return (
    <div className="h-full flex flex-col bg-bg-base p-8 overflow-y-auto custom-scrollbar">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text-base tracking-tight">Mission Control</h1>
        <p className="text-text-muted mt-1">Velocity OS Autonomous Agent Operating System</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {metrics.map((metric, i) => {
          const Icon = metric.icon;
          return (
            <div key={i} className="bg-bg-panel border border-border-base rounded-xl p-5 shadow-elevation-card-rest hover:shadow-elevation-card-hover transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-text-muted">{metric.label}</span>
                <Icon size={18} className={metric.color} />
              </div>
              <div className="text-3xl font-semibold text-text-base mb-1">{metric.value}</div>
              {metric.subtext && <div className="text-xs text-text-muted">{metric.subtext}</div>}
            </div>
          );
        })}
      </div>

      {/* Live ACP Activity Feed */}
      <div className="flex-1 bg-bg-panel border border-border-base rounded-xl shadow-elevation-card-rest overflow-hidden flex flex-col">
        <div className="p-5 border-b border-border-base flex items-center justify-between">
          <h2 className="text-lg font-medium text-text-base">Live ACP Activity Feed</h2>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          {messages.length === 0 ? (
            <p className="text-text-muted text-sm text-center py-8">
              No agent messages yet. Start the Council or trigger OpenCore.
            </p>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div key={msg.id} className="flex gap-4 relative">
                  {i !== messages.length - 1 && (
                    <div className="absolute left-[9px] top-6 bottom-[-16px] w-[2px] bg-border-base" />
                  )}
                  <div className="relative z-10 mt-1">
                    <div className={`w-5 h-5 rounded-full border-4 border-bg-panel ${getStatusDot(msg.from)}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-text-base font-medium">
                      <span className="text-text-muted font-normal">{msg.from} → {msg.to}: </span>
                      <span className="line-clamp-2">{msg.content}</span>
                    </p>
                    <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1">
                      <Clock size={11} />
                      {timeAgo(msg.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
