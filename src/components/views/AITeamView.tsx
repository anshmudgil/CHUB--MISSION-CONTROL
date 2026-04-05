'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bot,
  CheckCircle,
  Clock,
  X,
  Terminal,
  BarChart2,
  PenTool,
  Settings,
  ListTodo,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import { AgentRegistration } from '@/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SkeletonCard } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { staggerContainer, staggerItem, slideInRight, easeTransition } from '@/lib/motion';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AgentStatus = 'active' | 'idle' | 'error' | 'offline';

type AgentConfig = {
  id: string;
  name: string;
  role: string;
  group: 'Core' | 'Developers' | 'Analysts' | 'Writers' | 'Operators';
  responsibilities: string[];
  icon: React.ElementType;
  color: string;
};

type AgentLive = {
  currentTask: string;
  status: AgentStatus;
  lastActive: string;
  recentWork: string[];
  metrics: {
    tasksCompleted: number;
    uptime: string;
    avgResponseTime: string;
  };
};

type Agent = AgentConfig & AgentLive;

// ---------------------------------------------------------------------------
// Config — static metadata that never changes at runtime
// ---------------------------------------------------------------------------

const AGENT_CONFIG: AgentConfig[] = [
  {
    id: 'velo',
    name: 'VELO',
    role: 'Autonomous CRO Agent',
    group: 'Core',
    responsibilities: ['Strategic Planning', 'Agent Orchestration', 'Final Approvals', 'System Health Monitoring'],
    icon: Bot,
    color: 'text-blue-500 bg-blue-500/10 border-blue-500/30',
  },
  {
    id: 'charlie',
    name: 'Charlie',
    role: 'Infrastructure Engineer',
    group: 'Developers',
    responsibilities: ['Local Model Deployment', 'API Integration', 'Database Maintenance'],
    icon: Terminal,
    color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
  },
  {
    id: 'scout',
    name: 'Scout',
    role: 'Trend Researcher',
    group: 'Analysts',
    responsibilities: ['Market Research', 'Competitor Analysis', 'Trend Identification'],
    icon: BarChart2,
    color: 'text-purple-500 bg-purple-500/10 border-purple-500/30',
  },
  {
    id: 'quill',
    name: 'Quill',
    role: 'Content Writer',
    group: 'Writers',
    responsibilities: ['Script Writing', 'Social Media Copy', 'Newsletter Drafting'],
    icon: PenTool,
    color: 'text-orange-500 bg-orange-500/10 border-orange-500/30',
  },
  {
    id: 'ralph',
    name: 'Ralph',
    role: 'QA Manager',
    group: 'Operators',
    responsibilities: ['Quality Assurance', 'Link Checking', 'Formatting Review'],
    icon: Settings,
    color: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30',
  },
];

// Fallback live data used when the API hasn't responded yet
const FALLBACK_LIVE: Record<string, AgentLive> = {
  velo: {
    currentTask: 'Orchestrating Q3 Content Pipeline',
    status: 'active',
    lastActive: 'Just now',
    recentWork: ['Approved "Vibe Coding" YouTube Script', 'Deployed new landing page variant', 'Analyzed weekly conversion metrics'],
    metrics: { tasksCompleted: 142, uptime: '99.9%', avgResponseTime: '1.2s' },
  },
  charlie: {
    currentTask: 'Optimizing local model inference',
    status: 'active',
    lastActive: '2m ago',
    recentWork: ['Updated Qwen 3.5 weights', 'Fixed SpacetimeDB connection issue'],
    metrics: { tasksCompleted: 89, uptime: '99.5%', avgResponseTime: '800ms' },
  },
  scout: {
    currentTask: 'Scanning Twitter for AI trends',
    status: 'idle',
    lastActive: '15m ago',
    recentWork: ['Compiled daily trend report', 'Analyzed competitor pricing changes'],
    metrics: { tasksCompleted: 210, uptime: '100%', avgResponseTime: '2.5s' },
  },
  quill: {
    currentTask: 'Drafting LinkedIn post on Vibe Coding',
    status: 'active',
    lastActive: 'Just now',
    recentWork: ['Drafted "Vibe Coding" YouTube Script', 'Wrote 5 tweet threads'],
    metrics: { tasksCompleted: 340, uptime: '99.8%', avgResponseTime: '3.1s' },
  },
  ralph: {
    currentTask: 'Reviewing landing page copy',
    status: 'active',
    lastActive: '5m ago',
    recentWork: ['Approved newsletter draft', 'Flagged broken link in staging'],
    metrics: { tasksCompleted: 512, uptime: '99.9%', avgResponseTime: '900ms' },
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_BADGE_VARIANT: Record<AgentStatus, 'success' | 'muted' | 'error' | 'default'> = {
  active: 'success',
  idle: 'muted',
  error: 'error',
  offline: 'default',
};

const GROUPS = ['Developers', 'Analysts', 'Writers', 'Operators'] as const;

function mergeAgent(config: AgentConfig, live: AgentLive, registration?: AgentRegistration): Agent {
  return {
    ...config,
    ...live,
    // Override status from live registration if available
    status: (registration?.status as AgentStatus) ?? live.status,
  };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusDot({ status }: { status: AgentStatus }) {
  const colors: Record<AgentStatus, string> = {
    active: 'bg-emerald-500',
    idle: 'bg-zinc-500',
    error: 'bg-red-500',
    offline: 'bg-zinc-800',
  };
  return (
    <span
      className={cn(
        'w-2 h-2 rounded-full shrink-0',
        colors[status],
        status === 'active' && 'animate-pulse'
      )}
    />
  );
}

function AgentCard({
  agent,
  onClick,
  isSelected,
  isLive,
}: {
  agent: Agent;
  onClick: () => void;
  isSelected: boolean;
  isLive: boolean;
}) {
  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={cn(
        'w-64 bg-bg-panel border rounded-xl p-4 flex flex-col gap-3 cursor-pointer transition-colors duration-150',
        isSelected
          ? 'border-accent shadow-elevation-card-hover ring-1 ring-accent/50'
          : 'border-border-base shadow-elevation-card-rest hover:border-border-strong hover:shadow-elevation-card-hover'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center border', agent.color)}>
            <agent.icon size={20} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-base">{agent.name}</h3>
            <p className="text-xs text-text-muted">{agent.role}</p>
          </div>
        </div>
        {isLive && (
          <span className="text-[10px] font-mono text-text-muted bg-bg-subtle border border-border-base rounded px-1.5 py-0.5">
            LIVE
          </span>
        )}
      </div>

      <div className="pt-3 border-t border-border-base flex flex-col gap-2">
        <Badge variant={STATUS_BADGE_VARIANT[agent.status]} dot className="self-start">
          {agent.status}
        </Badge>
        <p className="text-xs text-text-base line-clamp-1" title={agent.currentTask}>
          <span className="text-text-muted mr-1">Task:</span>
          {agent.currentTask}
        </p>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Detail drawer (overlay, no layout push)
// ---------------------------------------------------------------------------

function AgentDrawer({
  agent,
  onClose,
  onNavigate,
}: {
  agent: Agent;
  onClose: () => void;
  onNavigate: (section: string) => void;
}) {
  // Close on Escape
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="absolute inset-0 z-30 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <motion.aside
        variants={slideInRight}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={easeTransition}
        className="w-96 bg-bg-panel border-l border-border-base absolute right-0 top-0 bottom-0 z-40 shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-border-base flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center border', agent.color)}>
              <agent.icon size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-base">{agent.name}</h2>
              <p className="text-xs text-text-muted">{agent.role}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-bg-subtle rounded-md text-text-muted hover:text-text-base transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8 custom-scrollbar">
          {/* Status & Current Task */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Current Status</h3>
            <div className="bg-bg-subtle border border-border-base rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusDot status={agent.status} />
                  <Badge variant={STATUS_BADGE_VARIANT[agent.status]} dot>
                    {agent.status}
                  </Badge>
                </div>
                <span className="text-xs text-text-muted flex items-center gap-1">
                  <Clock size={12} /> {agent.lastActive}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-text-base">{agent.currentTask}</p>
                <p className="text-xs text-text-muted mt-1">Active assignment</p>
              </div>
            </div>
          </div>

          {/* Metrics */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Performance Metrics</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-bg-subtle border border-border-base rounded-lg p-3 text-center">
                <div className="text-lg font-semibold text-text-base">{agent.metrics.tasksCompleted}</div>
                <div className="text-[10px] text-text-muted uppercase mt-1">Tasks</div>
              </div>
              <div className="bg-bg-subtle border border-border-base rounded-lg p-3 text-center">
                <div className="text-lg font-semibold text-emerald-500">{agent.metrics.uptime}</div>
                <div className="text-[10px] text-text-muted uppercase mt-1">Uptime</div>
              </div>
              <div className="bg-bg-subtle border border-border-base rounded-lg p-3 text-center">
                <div className="text-lg font-semibold text-blue-500">{agent.metrics.avgResponseTime}</div>
                <div className="text-[10px] text-text-muted uppercase mt-1">Avg Resp</div>
              </div>
            </div>
          </div>

          {/* Responsibilities */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Core Responsibilities</h3>
            <ul className="space-y-2">
              {agent.responsibilities.map((resp, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-text-base">
                  <CheckCircle size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                  <span>{resp}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Recent Work */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Recent Work</h3>
            <div className="space-y-3">
              {agent.recentWork.map((work, i) => (
                <div key={i} className="bg-bg-subtle border border-border-base rounded-lg p-3 text-sm text-text-base">
                  {work}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions footer */}
        <div className="p-4 border-t border-border-base flex gap-3 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={() => onNavigate('tasks')}
          >
            <ListTodo size={14} />
            Assign Task
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={() => onNavigate('council')}
          >
            <MessageSquare size={14} />
            Open Council
          </Button>
        </div>
      </motion.aside>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export function AITeamView() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [liveStatuses, setLiveStatuses] = useState<Record<string, AgentRegistration>>({});
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  // Poll live agent status from ACP registry every 10s
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch('/api/acp/agents');
        if (!res.ok) throw new Error('fetch failed');
        const agents: AgentRegistration[] = await res.json();
        const map: Record<string, AgentRegistration> = {};
        agents.forEach((a) => {
          map[a.id] = a;
        });
        if (!cancelled) {
          setLiveStatuses(map);
          setFetchError(false);
        }
      } catch {
        if (!cancelled) setFetchError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    poll();
    const interval = setInterval(poll, 10_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Build merged agents list
  const agents: Agent[] = AGENT_CONFIG.map((cfg) =>
    mergeAgent(cfg, FALLBACK_LIVE[cfg.id], liveStatuses[cfg.id])
  );

  const coreAgent = agents.find((a) => a.group === 'Core')!;
  const groupedAgents = GROUPS.map((g) => ({
    label: g,
    agents: agents.filter((a) => a.group === g),
  }));

  // Navigation helper — for now dispatches a custom event that App.tsx / layout can handle.
  // When migrated to Next.js this becomes router.push().
  const handleNavigate = (section: string) => {
    setSelectedAgent(null);
    window.dispatchEvent(new CustomEvent('navigate', { detail: section }));
  };

  return (
    <div className="h-full flex bg-bg-base overflow-hidden relative">
      {/* Main view — no margin push, always full width */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="px-8 py-6 border-b border-border-base bg-bg-panel/50 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-500 flex items-center justify-center border border-indigo-500/30">
              <Bot size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-text-base tracking-tight">AI Team Org</h1>
              <p className="text-sm text-text-muted mt-1">Manage your autonomous workforce</p>
            </div>
            {loading && (
              <Loader2 size={16} className="ml-auto animate-spin text-text-muted" />
            )}
            {!loading && fetchError && (
              <Badge variant="warning" dot className="ml-auto">
                API unreachable -- showing cached data
              </Badge>
            )}
          </div>
        </div>

        {/* Org chart */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {loading && agents.length === 0 ? (
            <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-20">
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : agents.length === 0 ? (
            <EmptyState
              icon={<Bot size={40} />}
              title="No agents registered"
              description="Connect agents to the ACP registry to see them here."
            />
          ) : (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="max-w-6xl mx-auto flex flex-col items-center"
            >
              {/* ---- VELO (core) ---- */}
              <motion.div variants={staggerItem} className="flex flex-col items-center">
                <AgentCard
                  agent={coreAgent}
                  onClick={() => setSelectedAgent(coreAgent)}
                  isSelected={selectedAgent?.id === coreAgent.id}
                  isLive={!!liveStatuses[coreAgent.id]}
                />
              </motion.div>

              {/* Vertical connector from VELO down */}
              <div className="w-px h-10 bg-border-strong" />

              {/* Horizontal bar spanning the group columns */}
              <div className="w-full max-w-4xl">
                <div className="mx-auto border-t border-border-strong" />
              </div>

              {/* Group columns */}
              <div className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-8">
                {groupedAgents.map(({ label, agents: groupAgents }) => (
                  <div key={label} className="flex flex-col items-center gap-4">
                    {/* Vertical connector down to group label */}
                    <div className="w-px h-6 bg-border-strong hidden lg:block" />

                    {/* Group label */}
                    <span className="text-xs font-semibold text-text-muted uppercase tracking-wider bg-bg-base px-3 py-1 rounded-full border border-border-base shadow-sm">
                      {label}
                    </span>

                    {/* Agent cards in this group */}
                    {groupAgents.map((agent) => (
                      <AgentCard
                        key={agent.id}
                        agent={agent}
                        onClick={() => setSelectedAgent(agent)}
                        isSelected={selectedAgent?.id === agent.id}
                        isLive={!!liveStatuses[agent.id]}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Overlay drawer */}
      <AnimatePresence>
        {selectedAgent && (
          <AgentDrawer
            key={selectedAgent.id}
            agent={selectedAgent}
            onClose={() => setSelectedAgent(null)}
            onNavigate={handleNavigate}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
