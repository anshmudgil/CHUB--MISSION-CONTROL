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
  Plus,
  Edit2,
  Check,
} from 'lucide-react';
import { AgentRegistration } from '@/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SkeletonCard } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
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
  tonality?: string;
  personalityTraits?: string;
  resources?: string;
  reportsTo?: string;
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

const BASE_AGENT_CONFIG: AgentConfig[] = [
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
// Color theme map
// ---------------------------------------------------------------------------

const COLOR_THEMES: Record<string, string> = {
  blue: 'text-blue-500 bg-blue-500/10 border-blue-500/30',
  emerald: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
  purple: 'text-purple-500 bg-purple-500/10 border-purple-500/30',
  amber: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
  rose: 'text-rose-500 bg-rose-500/10 border-rose-500/30',
};

// ---------------------------------------------------------------------------
// LocalStorage helpers
// ---------------------------------------------------------------------------

const LS_KEY = 'agent-config-custom';

function loadCustomAgents(): Partial<AgentConfig>[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCustomAgents(agents: AgentConfig[]) {
  if (typeof window === 'undefined') return;
  // Save only the fields that can be customized (no icon — not serializable)
  const serializable = agents.map(({ icon: _icon, ...rest }) => rest);
  localStorage.setItem(LS_KEY, JSON.stringify(serializable));
}

// Icon lookup for deserialized custom agents
const ICON_BY_GROUP: Record<string, React.ElementType> = {
  Core: Bot,
  Developers: Terminal,
  Analysts: BarChart2,
  Writers: PenTool,
  Operators: Settings,
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

const GROUPS = ['Core', 'Developers', 'Analysts', 'Writers', 'Operators'] as const;
const DISPLAY_GROUPS = ['Developers', 'Analysts', 'Writers', 'Operators'] as const;

function mergeAgent(config: AgentConfig, live: AgentLive, registration?: AgentRegistration): Agent {
  return {
    ...config,
    ...live,
    // Override status from live registration if available
    status: (registration?.status as AgentStatus) ?? live.status,
  };
}

function getDefaultLive(): AgentLive {
  return {
    currentTask: 'Awaiting assignment',
    status: 'idle',
    lastActive: 'Never',
    recentWork: [],
    metrics: { tasksCompleted: 0, uptime: 'N/A', avgResponseTime: 'N/A' },
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

      {agent.reportsTo && (
        <p className="text-[11px] text-text-muted border-t border-border-base pt-2">
          Reports to: <span className="text-text-base font-medium">{agent.reportsTo}</span>
        </p>
      )}

      <div className={cn('border-t border-border-base flex flex-col gap-2', agent.reportsTo ? 'pt-2' : 'pt-3')}>
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
// New Agent Modal
// ---------------------------------------------------------------------------

type NewAgentForm = {
  name: string;
  role: string;
  group: AgentConfig['group'];
  responsibilities: string;
  reportsTo: string;
  colorTheme: string;
};

function NewAgentModal({
  open,
  onClose,
  onSave,
  agentNames,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (agent: AgentConfig) => void;
  agentNames: string[];
}) {
  const [form, setForm] = useState<NewAgentForm>({
    name: '',
    role: '',
    group: 'Operators',
    responsibilities: '',
    reportsTo: '',
    colorTheme: 'blue',
  });

  const handleSave = () => {
    if (!form.name.trim() || !form.role.trim()) return;
    const newAgent: AgentConfig = {
      id: form.name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
      name: form.name.trim(),
      role: form.role.trim(),
      group: form.group,
      responsibilities: form.responsibilities
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean),
      reportsTo: form.reportsTo || undefined,
      icon: ICON_BY_GROUP[form.group] ?? Bot,
      color: COLOR_THEMES[form.colorTheme] ?? COLOR_THEMES.blue,
    };
    onSave(newAgent);
    setForm({ name: '', role: '', group: 'Operators', responsibilities: '', reportsTo: '', colorTheme: 'blue' });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} size="md">
      <ModalHeader onClose={onClose}>
        <h2 className="text-lg font-semibold text-text-base">New Agent</h2>
        <p className="text-sm text-text-muted mt-0.5">Add a new agent to your autonomous workforce</p>
      </ModalHeader>
      <ModalBody className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Nova"
              className="bg-bg-subtle border border-border-base rounded-lg px-3 py-2 text-sm text-text-base placeholder:text-text-muted focus:outline-none focus:border-border-strong focus:ring-1 focus:ring-border-strong"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Role</label>
            <input
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              placeholder="e.g. Data Scientist"
              className="bg-bg-subtle border border-border-base rounded-lg px-3 py-2 text-sm text-text-base placeholder:text-text-muted focus:outline-none focus:border-border-strong focus:ring-1 focus:ring-border-strong"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Group</label>
            <select
              value={form.group}
              onChange={(e) => setForm((f) => ({ ...f, group: e.target.value as AgentConfig['group'] }))}
              className="bg-bg-subtle border border-border-base rounded-lg px-3 py-2 text-sm text-text-base focus:outline-none focus:border-border-strong focus:ring-1 focus:ring-border-strong"
            >
              {GROUPS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Color Theme</label>
            <select
              value={form.colorTheme}
              onChange={(e) => setForm((f) => ({ ...f, colorTheme: e.target.value }))}
              className="bg-bg-subtle border border-border-base rounded-lg px-3 py-2 text-sm text-text-base focus:outline-none focus:border-border-strong focus:ring-1 focus:ring-border-strong"
            >
              {Object.keys(COLOR_THEMES).map((c) => (
                <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Responsibilities</label>
          <textarea
            value={form.responsibilities}
            onChange={(e) => setForm((f) => ({ ...f, responsibilities: e.target.value }))}
            placeholder="Comma-separated, e.g. Data Analysis, Report Generation, API Integration"
            rows={3}
            className="bg-bg-subtle border border-border-base rounded-lg px-3 py-2 text-sm text-text-base placeholder:text-text-muted focus:outline-none focus:border-border-strong focus:ring-1 focus:ring-border-strong resize-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Reports To</label>
          <select
            value={form.reportsTo}
            onChange={(e) => setForm((f) => ({ ...f, reportsTo: e.target.value }))}
            className="bg-bg-subtle border border-border-base rounded-lg px-3 py-2 text-sm text-text-base focus:outline-none focus:border-border-strong focus:ring-1 focus:ring-border-strong"
          >
            <option value="">None</option>
            {agentNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={handleSave} disabled={!form.name.trim() || !form.role.trim()}>
          <Plus size={14} />
          Create Agent
        </Button>
      </ModalFooter>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Detail drawer (overlay, no layout push)
// ---------------------------------------------------------------------------

type EditForm = {
  name: string;
  role: string;
  responsibilities: string;
  tonality: string;
  personalityTraits: string;
  resources: string;
  reportsTo: string;
};

function AgentDrawer({
  agent,
  onClose,
  onNavigate,
  onSave,
  allAgentNames,
}: {
  agent: Agent;
  onClose: () => void;
  onNavigate: (section: string) => void;
  onSave: (updated: Partial<AgentConfig>) => void;
  allAgentNames: string[];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    name: agent.name,
    role: agent.role,
    responsibilities: agent.responsibilities.join(', '),
    tonality: agent.tonality ?? '',
    personalityTraits: agent.personalityTraits ?? '',
    resources: agent.resources ?? '',
    reportsTo: agent.reportsTo ?? '',
  });

  // Sync form when agent changes
  useEffect(() => {
    setEditForm({
      name: agent.name,
      role: agent.role,
      responsibilities: agent.responsibilities.join(', '),
      tonality: agent.tonality ?? '',
      personalityTraits: agent.personalityTraits ?? '',
      resources: agent.resources ?? '',
      reportsTo: agent.reportsTo ?? '',
    });
    setIsEditing(false);
  }, [agent.id]);

  const handleSave = () => {
    onSave({
      id: agent.id,
      name: editForm.name.trim() || agent.name,
      role: editForm.role.trim() || agent.role,
      responsibilities: editForm.responsibilities
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean),
      tonality: editForm.tonality || undefined,
      personalityTraits: editForm.personalityTraits || undefined,
      resources: editForm.resources || undefined,
      reportsTo: editForm.reportsTo || undefined,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditForm({
      name: agent.name,
      role: agent.role,
      responsibilities: agent.responsibilities.join(', '),
      tonality: agent.tonality ?? '',
      personalityTraits: agent.personalityTraits ?? '',
      resources: agent.resources ?? '',
      reportsTo: agent.reportsTo ?? '',
    });
    setIsEditing(false);
  };

  // Close on Escape
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEditing) handleCancel();
        else onClose();
      }
    },
    [onClose, isEditing]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  // Other agents for reportsTo select (exclude self)
  const otherAgentNames = allAgentNames.filter((n) => n !== agent.name);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="absolute inset-0 z-30 bg-black/40 backdrop-blur-sm"
        onClick={isEditing ? undefined : onClose}
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
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center border shrink-0', agent.color)}>
              <agent.icon size={20} />
            </div>
            <div className="min-w-0">
              {isEditing ? (
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className="text-sm font-semibold text-text-base bg-bg-subtle border border-border-strong rounded px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-border-strong"
                />
              ) : (
                <h2 className="text-lg font-semibold text-text-base truncate">{agent.name}</h2>
              )}
              {isEditing ? (
                <input
                  value={editForm.role}
                  onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                  className="text-xs text-text-muted bg-bg-subtle border border-border-base rounded px-2 py-0.5 w-full mt-1 focus:outline-none focus:ring-1 focus:ring-border-strong"
                />
              ) : (
                <p className="text-xs text-text-muted truncate">{agent.role}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  className="p-2 hover:bg-bg-subtle rounded-md text-emerald-500 hover:text-emerald-400 transition-colors"
                  title="Save"
                >
                  <Check size={15} />
                </button>
                <button
                  onClick={handleCancel}
                  className="p-2 hover:bg-bg-subtle rounded-md text-text-muted hover:text-text-base transition-colors"
                  title="Cancel"
                >
                  <X size={15} />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 hover:bg-bg-subtle rounded-md text-text-muted hover:text-text-base transition-colors"
                  title="Edit agent"
                >
                  <Edit2 size={15} />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-bg-subtle rounded-md text-text-muted hover:text-text-base transition-colors"
                >
                  <X size={16} />
                </button>
              </>
            )}
          </div>
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
            {isEditing ? (
              <textarea
                value={editForm.responsibilities}
                onChange={(e) => setEditForm((f) => ({ ...f, responsibilities: e.target.value }))}
                placeholder="Comma-separated responsibilities"
                rows={3}
                className="w-full bg-bg-subtle border border-border-base rounded-lg px-3 py-2 text-sm text-text-base placeholder:text-text-muted focus:outline-none focus:border-border-strong focus:ring-1 focus:ring-border-strong resize-none"
              />
            ) : (
              <ul className="space-y-2">
                {agent.responsibilities.map((resp, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-text-base">
                    <CheckCircle size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                    <span>{resp}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Reports To */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Reports To</h3>
            {isEditing ? (
              <select
                value={editForm.reportsTo}
                onChange={(e) => setEditForm((f) => ({ ...f, reportsTo: e.target.value }))}
                className="w-full bg-bg-subtle border border-border-base rounded-lg px-3 py-2 text-sm text-text-base focus:outline-none focus:border-border-strong focus:ring-1 focus:ring-border-strong"
              >
                <option value="">None</option>
                {otherAgentNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-text-base">
                {agent.reportsTo ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    {agent.reportsTo}
                  </span>
                ) : (
                  <span className="text-text-muted italic">No reporting relationship</span>
                )}
              </p>
            )}
          </div>

          {/* Tonality */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Tonality</h3>
            {isEditing ? (
              <textarea
                value={editForm.tonality}
                onChange={(e) => setEditForm((f) => ({ ...f, tonality: e.target.value }))}
                placeholder="e.g. Professional, direct, data-driven"
                rows={2}
                className="w-full bg-bg-subtle border border-border-base rounded-lg px-3 py-2 text-sm text-text-base placeholder:text-text-muted focus:outline-none focus:border-border-strong focus:ring-1 focus:ring-border-strong resize-none"
              />
            ) : (
              <p className="text-sm text-text-base">
                {agent.tonality || <span className="text-text-muted italic">Not defined</span>}
              </p>
            )}
          </div>

          {/* Personality Traits */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Personality Traits</h3>
            {isEditing ? (
              <textarea
                value={editForm.personalityTraits}
                onChange={(e) => setEditForm((f) => ({ ...f, personalityTraits: e.target.value }))}
                placeholder="e.g. Analytical, methodical, detail-oriented"
                rows={2}
                className="w-full bg-bg-subtle border border-border-base rounded-lg px-3 py-2 text-sm text-text-base placeholder:text-text-muted focus:outline-none focus:border-border-strong focus:ring-1 focus:ring-border-strong resize-none"
              />
            ) : (
              <p className="text-sm text-text-base">
                {agent.personalityTraits || <span className="text-text-muted italic">Not defined</span>}
              </p>
            )}
          </div>

          {/* Resources */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Resources</h3>
            {isEditing ? (
              <textarea
                value={editForm.resources}
                onChange={(e) => setEditForm((f) => ({ ...f, resources: e.target.value }))}
                placeholder="e.g. Access to GitHub API, database read, Slack webhooks"
                rows={2}
                className="w-full bg-bg-subtle border border-border-base rounded-lg px-3 py-2 text-sm text-text-base placeholder:text-text-muted focus:outline-none focus:border-border-strong focus:ring-1 focus:ring-border-strong resize-none"
              />
            ) : (
              <p className="text-sm text-text-base">
                {agent.resources || <span className="text-text-muted italic">Not defined</span>}
              </p>
            )}
          </div>

          {/* Recent Work */}
          {agent.recentWork.length > 0 && (
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
          )}
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
  const [agentConfigs, setAgentConfigs] = useState<AgentConfig[]>(BASE_AGENT_CONFIG);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [liveStatuses, setLiveStatuses] = useState<Record<string, AgentRegistration>>({});
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [showNewAgentModal, setShowNewAgentModal] = useState(false);

  // Load customizations from localStorage on mount
  useEffect(() => {
    const custom = loadCustomAgents();
    if (custom.length > 0) {
      // Merge: start with base, override with custom, append new ones
      const baseIds = new Set(BASE_AGENT_CONFIG.map((a) => a.id));
      const merged: AgentConfig[] = BASE_AGENT_CONFIG.map((base) => {
        const override = custom.find((c) => c.id === base.id);
        if (!override) return base;
        return { ...base, ...override, icon: base.icon } as AgentConfig;
      });
      // Append custom agents that aren't in base
      custom.forEach((c) => {
        if (!baseIds.has(c.id ?? '')) {
          merged.push({
            ...c,
            icon: ICON_BY_GROUP[c.group ?? 'Operators'] ?? Bot,
          } as AgentConfig);
        }
      });
      setAgentConfigs(merged);
    }
  }, []);

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
  const agents: Agent[] = agentConfigs.map((cfg) =>
    mergeAgent(cfg, FALLBACK_LIVE[cfg.id] ?? getDefaultLive(), liveStatuses[cfg.id])
  );

  const coreAgents = agents.filter((a) => a.group === 'Core');
  const coreAgent = coreAgents[0]!;
  const groupedAgents = DISPLAY_GROUPS.map((g) => ({
    label: g,
    agents: agents.filter((a) => a.group === g),
  }));

  const allAgentNames = agentConfigs.map((a) => a.name);

  // Navigation helper
  const handleNavigate = (section: string) => {
    setSelectedAgent(null);
    window.dispatchEvent(new CustomEvent('navigate', { detail: section }));
  };

  const handleAddAgent = (newAgent: AgentConfig) => {
    const updated = [...agentConfigs, newAgent];
    setAgentConfigs(updated);
    saveCustomAgents(updated);
  };

  const handleSaveAgent = (updatedFields: Partial<AgentConfig>) => {
    const updated = agentConfigs.map((cfg) =>
      cfg.id === updatedFields.id ? { ...cfg, ...updatedFields } : cfg
    );
    setAgentConfigs(updated);
    saveCustomAgents(updated);
    // Update selected agent display
    if (selectedAgent?.id === updatedFields.id) {
      const updatedFull = updated.find((c) => c.id === updatedFields.id);
      if (updatedFull) {
        setSelectedAgent((prev) => prev ? { ...prev, ...updatedFull } : prev);
      }
    }
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
            <div className="ml-auto flex items-center gap-3">
              {loading && (
                <Loader2 size={16} className="animate-spin text-text-muted" />
              )}
              {!loading && fetchError && (
                <Badge variant="warning" dot>
                  API unreachable -- showing cached data
                </Badge>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowNewAgentModal(true)}
              >
                <Plus size={14} />
                New Agent
              </Button>
            </div>
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
              {/* ---- Core agents ---- */}
              <div className="flex flex-wrap gap-4 justify-center">
                {coreAgents.map((agent) => (
                  <motion.div key={agent.id} variants={staggerItem} className="flex flex-col items-center">
                    <AgentCard
                      agent={agent}
                      onClick={() => setSelectedAgent(agent)}
                      isSelected={selectedAgent?.id === agent.id}
                      isLive={!!liveStatuses[agent.id]}
                    />
                  </motion.div>
                ))}
              </div>

              {/* Vertical connector from Core down */}
              <div className="w-px h-10 bg-border-strong" />

              {/* Horizontal bar spanning the group columns */}
              <div className="w-full max-w-4xl">
                <div className="mx-auto border-t border-border-strong" />
              </div>

              {/* Group columns */}
              <div className="w-full max-w-5xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-8">
                {groupedAgents.map(({ label, agents: groupAgents }) => (
                  <div key={label} className="flex flex-col items-center gap-4">
                    {/* Vertical connector down to group label */}
                    <div className="w-px h-6 bg-border-strong hidden lg:block" />

                    {/* Group label */}
                    <span className="text-xs font-semibold text-text-muted uppercase tracking-wider bg-bg-base px-3 py-1 rounded-full border border-border-base shadow-sm">
                      {label}
                    </span>

                    {/* Agent cards in this group — flex wrap to avoid overlap */}
                    <div className="flex flex-wrap gap-4 justify-center">
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
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* New Agent Modal */}
      <NewAgentModal
        open={showNewAgentModal}
        onClose={() => setShowNewAgentModal(false)}
        onSave={handleAddAgent}
        agentNames={allAgentNames}
      />

      {/* Overlay drawer */}
      <AnimatePresence>
        {selectedAgent && (
          <AgentDrawer
            key={selectedAgent.id}
            agent={selectedAgent}
            onClose={() => setSelectedAgent(null)}
            onNavigate={handleNavigate}
            onSave={handleSaveAgent}
            allAgentNames={allAgentNames}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
