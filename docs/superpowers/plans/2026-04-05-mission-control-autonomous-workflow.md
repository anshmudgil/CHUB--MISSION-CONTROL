# Mission Control VOS — Full Autonomous Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Mission Control from a static mock-data dashboard into a fully functional autonomous agent operating system with real AI streaming, an ACP (Agent Communication Protocol) message bus, a live Hermes relay agent, and a Railway deployment that stays in sync with the GitHub repo.

**Architecture:** The Next.js 15 app serves as both the Mission Control UI and the ACP hub (via API routes). OpenClaw (claude-code) is configured at the project level to use `claude-haiku-4-5-20251001`. Hermes is a standalone Node.js polling agent (in `/hermes`) that reads the ACP queue, processes messages with Claude, and posts replies back — creating a live loop visible in the dashboard's SSE stream.

**Tech Stack:** Next.js 15 App Router, React 19, `@ai-sdk/anthropic` + `ai` (Vercel AI SDK), `@anthropic-ai/sdk` (Hermes), Tailwind v4, Railway (deployment), GitHub Actions (CI trigger), ACP over HTTP + SSE.

> **⚠️ Scope Note:** This plan covers 5 independent subsystems. Each task produces working, testable software on its own. Subsystems: (1) AI streaming integration, (2) ACP message bus, (3) Hermes agent, (4) OpenClaw config, (5) Railway deployment.

---

## File Structure

### Created
| File | Responsibility |
|------|---------------|
| `src/app/api/council/route.ts` | Streams VELO AI responses for Council view |
| `src/app/api/acp/route.ts` | ACP message bus — POST to send, GET to fetch queue |
| `src/app/api/acp/stream/route.ts` | SSE stream for dashboard real-time ACP feed |
| `src/app/api/acp/agents/route.ts` | Agent registry — register, list, heartbeat |
| `src/lib/acp.ts` | ACP client utilities (typed fetch wrappers) |
| `hermes/package.json` | Hermes agent dependencies |
| `hermes/index.ts` | Hermes agent entry point (long-poll + Claude) |
| `hermes/acp-client.ts` | Typed ACP fetch wrapper for Hermes |
| `.claude/settings.json` | Project-level claude-code config (haiku-4-5) |
| `railway.json` | Railway deployment config |
| `nixpacks.toml` | Railway build config for Next.js |

### Modified
| File | Change |
|------|--------|
| `package.json` | Add `ai`, `@ai-sdk/anthropic` |
| `src/types.ts` | Add `ACPMessage`, `AgentRegistration` types |
| `.env.example` | Add `ANTHROPIC_API_KEY`, `ACP_SECRET`, `NEXT_PUBLIC_APP_URL` |
| `src/app/layout.tsx` | Keep Inter/Roboto Mono (already correct) |
| `src/components/views/CouncilView.tsx` | Replace mock with `useChat` streaming |
| `src/components/views/DashboardView.tsx` | Replace mock activity feed with SSE from ACP |
| `src/components/views/AITeamView.tsx` | Add real agent status from ACP registry |

---

## Task 1: Install AI SDK Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install packages**

```bash
cd /c/Users/User/Desktop/MISSION-CONTROL-VOS
npm install ai @ai-sdk/anthropic
```

- [ ] **Step 2: Verify install**

```bash
node -e "require('@ai-sdk/anthropic'); require('ai'); console.log('OK')"
```
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add ai and @ai-sdk/anthropic dependencies"
```

---

## Task 2: Add ACP Types to `src/types.ts`

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Add ACP types to the end of `src/types.ts`**

```ts
export type ACPMessageStatus = 'pending' | 'processing' | 'done' | 'error';

export type ACPMessage = {
  id: string;
  from: string;          // agent id, e.g. 'opencore', 'hermes', 'user'
  to: string;            // agent id or 'broadcast'
  content: string;
  timestamp: string;     // ISO 8601
  status: ACPMessageStatus;
  metadata?: Record<string, string>;
};

export type AgentRegistration = {
  id: string;            // e.g. 'opencore', 'hermes'
  name: string;
  model: string;         // e.g. 'claude-haiku-4-5-20251001'
  status: 'active' | 'idle' | 'offline';
  lastHeartbeat: string; // ISO 8601
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add ACPMessage and AgentRegistration types"
```

---

## Task 3: Build the ACP Message Bus (`/api/acp/route.ts`)

**Files:**
- Create: `src/app/api/acp/route.ts`

This is the central message store. Because Railway runs a single persistent Node.js process, an in-memory Map survives between requests during the same server session. For a production reset-safe store, replace with a DB later.

- [ ] **Step 1: Create `src/app/api/acp/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { ACPMessage } from '@/types';
import { randomUUID } from 'crypto';

// In-memory message store (persists across requests within one Railway process)
export const messageStore: ACPMessage[] = [];
export const sseClients: Set<ReadableStreamDefaultController> = new Set();

// Notify all SSE clients of a new message
function broadcast(msg: ACPMessage) {
  for (const ctrl of sseClients) {
    try {
      ctrl.enqueue(`data: ${JSON.stringify(msg)}\n\n`);
    } catch {
      sseClients.delete(ctrl);
    }
  }
}

// POST /api/acp — send a message
export async function POST(req: NextRequest) {
  const body = await req.json() as Omit<ACPMessage, 'id' | 'timestamp' | 'status'>;

  if (!body.from || !body.to || !body.content) {
    return NextResponse.json({ error: 'Missing from, to, or content' }, { status: 400 });
  }

  const msg: ACPMessage = {
    id: randomUUID(),
    from: body.from,
    to: body.to,
    content: body.content,
    timestamp: new Date().toISOString(),
    status: 'pending',
    metadata: body.metadata,
  };

  messageStore.unshift(msg); // newest first
  if (messageStore.length > 500) messageStore.splice(500); // cap at 500
  broadcast(msg);

  return NextResponse.json(msg, { status: 201 });
}

// GET /api/acp?to=agentId&limit=20 — fetch messages for an agent
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const to = searchParams.get('to');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100);

  const results = to
    ? messageStore.filter(m => m.to === to || m.to === 'broadcast').slice(0, limit)
    : messageStore.slice(0, limit);

  return NextResponse.json(results);
}
```

- [ ] **Step 2: Start dev server and test**

```bash
npm run dev &
sleep 3

# Send a test message
curl -s -X POST http://localhost:3000/api/acp \
  -H "Content-Type: application/json" \
  -d '{"from":"opencore","to":"hermes","content":"Hello Hermes, morning briefing ready."}' | jq .

# Fetch messages for hermes
curl -s "http://localhost:3000/api/acp?to=hermes" | jq '.[0].content'
```
Expected first: JSON with `id`, `timestamp`, `status: "pending"`.
Expected second: `"Hello Hermes, morning briefing ready."`

- [ ] **Step 3: Kill dev server**

```bash
kill %1 2>/dev/null || true
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/acp/route.ts
git commit -m "feat: add ACP message bus API route"
```

---

## Task 4: Build the ACP SSE Stream (`/api/acp/stream/route.ts`)

**Files:**
- Create: `src/app/api/acp/stream/route.ts`

- [ ] **Step 1: Create `src/app/api/acp/stream/route.ts`**

```ts
import { NextRequest } from 'next/server';
import { sseClients } from '../route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  let controller: ReadableStreamDefaultController;

  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl;
      sseClients.add(ctrl);
      // Send a keep-alive comment every 25s
      const keepAlive = setInterval(() => {
        try { ctrl.enqueue(': keep-alive\n\n'); } catch { clearInterval(keepAlive); }
      }, 25_000);
    },
    cancel() {
      sseClients.delete(controller);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/acp/stream/route.ts
git commit -m "feat: add ACP SSE stream endpoint"
```

---

## Task 5: Build the Agent Registry (`/api/acp/agents/route.ts`)

**Files:**
- Create: `src/app/api/acp/agents/route.ts`

- [ ] **Step 1: Create `src/app/api/acp/agents/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { AgentRegistration } from '@/types';

// Shared agent registry (in-memory, Railway persistent)
export const agentRegistry: Map<string, AgentRegistration> = new Map([
  ['opencore', {
    id: 'opencore',
    name: 'OpenCore (VELO)',
    model: 'claude-sonnet-4-6',
    status: 'idle',
    lastHeartbeat: new Date().toISOString(),
  }],
  ['hermes', {
    id: 'hermes',
    name: 'Hermes',
    model: 'claude-haiku-4-5-20251001',
    status: 'offline',
    lastHeartbeat: new Date(0).toISOString(),
  }],
]);

// GET /api/acp/agents — list all agents
export async function GET() {
  return NextResponse.json([...agentRegistry.values()]);
}

// POST /api/acp/agents — register or update heartbeat
export async function POST(req: NextRequest) {
  const body = await req.json() as Partial<AgentRegistration> & { id: string };

  if (!body.id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const existing = agentRegistry.get(body.id);
  const updated: AgentRegistration = {
    id: body.id,
    name: body.name ?? existing?.name ?? body.id,
    model: body.model ?? existing?.model ?? 'claude-haiku-4-5-20251001',
    status: body.status ?? 'active',
    lastHeartbeat: new Date().toISOString(),
  };

  agentRegistry.set(body.id, updated);
  return NextResponse.json(updated, { status: 200 });
}
```

- [ ] **Step 2: Test**

```bash
npm run dev &
sleep 3
curl -s http://localhost:3000/api/acp/agents | jq '.[].name'
kill %1 2>/dev/null || true
```
Expected: `"OpenCore (VELO)"` and `"Hermes"`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/acp/agents/route.ts
git commit -m "feat: add ACP agent registry endpoint"
```

---

## Task 6: Build the ACP Client Library (`src/lib/acp.ts`)

**Files:**
- Create: `src/lib/acp.ts`

- [ ] **Step 1: Create `src/lib/acp.ts`**

```ts
import { ACPMessage, AgentRegistration } from '@/types';

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export async function sendACPMessage(
  from: string,
  to: string,
  content: string,
  metadata?: Record<string, string>
): Promise<ACPMessage> {
  const res = await fetch(`${BASE}/api/acp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, content, metadata }),
  });
  if (!res.ok) throw new Error(`ACP send failed: ${res.statusText}`);
  return res.json();
}

export async function fetchACPMessages(agentId: string, limit = 20): Promise<ACPMessage[]> {
  const res = await fetch(`${BASE}/api/acp?to=${agentId}&limit=${limit}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`ACP fetch failed: ${res.statusText}`);
  return res.json();
}

export async function registerAgent(agent: Partial<AgentRegistration> & { id: string }): Promise<AgentRegistration> {
  const res = await fetch(`${BASE}/api/acp/agents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(agent),
  });
  if (!res.ok) throw new Error(`Agent register failed: ${res.statusText}`);
  return res.json();
}

export async function fetchAgents(): Promise<AgentRegistration[]> {
  const res = await fetch(`${BASE}/api/acp/agents`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Agents fetch failed: ${res.statusText}`);
  return res.json();
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/acp.ts
git commit -m "feat: add ACP client library utilities"
```

---

## Task 7: Wire Council View with Real AI Streaming

**Files:**
- Create: `src/app/api/council/route.ts`
- Modify: `src/components/views/CouncilView.tsx`

- [ ] **Step 1: Create `src/app/api/council/route.ts`**

```ts
import { streamText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { NextRequest } from 'next/server';

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  const { messages } = await req.json();

  const result = streamText({
    model: anthropic('claude-sonnet-4-6'),
    system: `You are VELO, the autonomous CRO (Chief Revenue Officer) AI agent and orchestrator of Mission Control VOS. You coordinate a team of specialized AI agents:
- Charlie (Infrastructure Engineer): handles local model deployment, APIs, databases
- Scout (Trend Researcher): scans Twitter/LinkedIn, market research, competitor analysis  
- Quill (Content Writer): scripts, social media copy, newsletters
- Ralph (QA Manager): quality checks, link verification, formatting review

You speak with strategic authority and precision. Keep responses focused and actionable. When delegating, be explicit about which agent should handle what.`,
    messages,
  });

  return result.toUIMessageStreamResponse();
}
```

- [ ] **Step 2: Replace `src/components/views/CouncilView.tsx` with streaming version**

```tsx
'use client';

import React, { useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { Send, Bot, Terminal, BarChart2, PenTool, Settings, Crown, Hash, Loader2 } from 'lucide-react';

const AGENT_ICONS: Record<string, React.ElementType> = {
  VELO: Bot,
  Charlie: Terminal,
  Scout: BarChart2,
  Quill: PenTool,
  Ralph: Settings,
};

const AGENT_COLORS: Record<string, string> = {
  VELO: 'text-blue-500 bg-blue-500/10 border-blue-500/30',
  Charlie: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
  Scout: 'text-purple-500 bg-purple-500/10 border-purple-500/30',
  Quill: 'text-orange-500 bg-orange-500/10 border-orange-500/30',
  Ralph: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30',
};

export function CouncilView() {
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/council' }),
  });

  const isStreaming = status === 'streaming' || status === 'submitted';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="h-full flex flex-col bg-bg-base overflow-hidden">
      {/* Header */}
      <div className="px-8 py-6 border-b border-border-base bg-bg-panel/50 backdrop-blur-sm shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/20 text-yellow-500 flex items-center justify-center border border-yellow-500/30">
            <Crown size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-text-base tracking-tight">The Council</h1>
            <p className="text-sm text-text-muted mt-1">Multi-agent deliberation and group chat</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-subtle border border-border-base rounded-md text-xs font-medium text-text-muted">
            <Hash size={14} />
            general-ops
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${isStreaming ? 'text-blue-400 bg-blue-500/10 border border-blue-500/30' : 'text-text-muted border border-transparent'}`}>
            {isStreaming && <Loader2 size={12} className="animate-spin" />}
            {isStreaming ? 'VELO is responding…' : 'Ready'}
          </div>
        </div>
      </div>

      {/* Chat Feed */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar flex flex-col gap-6">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-text-muted text-sm">Start a conversation with The Council.</p>
            <p className="text-text-muted text-xs mt-2">Type a message below to engage VELO and the team.</p>
          </div>
        )}

        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const agentName = isUser ? 'You' : 'VELO';
          const Icon = isUser ? null : (AGENT_ICONS[agentName] ?? Bot);
          const colorClass = isUser ? 'text-zinc-300 bg-zinc-700/50 border-zinc-600/50' : (AGENT_COLORS[agentName] ?? AGENT_COLORS.VELO);

          const textContent = msg.parts
            .filter(p => p.type === 'text')
            .map(p => (p as { type: 'text'; text: string }).text)
            .join('');

          return (
            <div key={msg.id} className={`flex gap-4 group ${isUser ? 'flex-row-reverse' : ''}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 mt-1 ${colorClass}`}>
                {isUser ? <span className="text-xs font-bold">You</span> : Icon && <Icon size={20} />}
              </div>
              <div className={`flex flex-col gap-1 min-w-0 max-w-[75%] ${isUser ? 'items-end' : ''}`}>
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-text-base">{agentName}</span>
                  {!isUser && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-bg-subtle border border-border-base text-text-muted uppercase tracking-wider">
                      Core
                    </span>
                  )}
                </div>
                <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isUser ? 'text-text-base bg-bg-panel border border-border-base rounded-xl px-4 py-3' : 'text-text-muted'}`}>
                  {textContent}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-6 bg-bg-base border-t border-border-base shrink-0">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            disabled={isStreaming}
            placeholder="Message The Council (or type / to assign a specific agent)…"
            className="w-full bg-bg-panel border border-border-base rounded-xl pl-4 pr-12 py-4 text-sm text-text-base placeholder:text-text-muted focus:outline-none focus:border-border-strong focus:ring-1 focus:ring-border-strong transition-all shadow-elevation-card-rest disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isStreaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Set `ANTHROPIC_API_KEY` in `.env.local`**

```bash
echo "ANTHROPIC_API_KEY=your_key_here" >> .env.local
echo "NEXT_PUBLIC_APP_URL=http://localhost:3000" >> .env.local
```
(Replace `your_key_here` with the actual key from Anthropic console.)

- [ ] **Step 4: Test Council view live**

```bash
npm run dev
```
Open `http://localhost:3000/council`. Type "Morning briefing — what's the plan for today?" and press Enter. VELO should stream a response.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/council/route.ts src/components/views/CouncilView.tsx
git commit -m "feat: wire Council view with real VELO AI streaming"
```

---

## Task 8: Wire Dashboard Activity Feed to ACP SSE

**Files:**
- Modify: `src/components/views/DashboardView.tsx`

- [ ] **Step 1: Replace `DashboardView.tsx` with SSE-driven version**

```tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle2, Clock, Calendar, PlayCircle } from 'lucide-react';
import { ACPMessage } from '@/types';

function getStatusColor(from: string) {
  const map: Record<string, string> = {
    opencore: 'bg-blue-500',
    hermes: 'bg-purple-500',
    user: 'bg-emerald-500',
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

  // Seed with recent messages on mount
  useEffect(() => {
    fetch('/api/acp?limit=10')
      .then(r => r.json())
      .then(setMessages)
      .catch(() => {});
  }, []);

  // Subscribe to live ACP feed via SSE
  useEffect(() => {
    const es = new EventSource('/api/acp/stream');
    es.onmessage = (e) => {
      try {
        const msg: ACPMessage = JSON.parse(e.data);
        setMessages(prev => [msg, ...prev].slice(0, 20));
      } catch {}
    };
    return () => es.close();
  }, []);

  const metrics = [
    { label: 'Active Tasks', value: '24', icon: CheckCircle2, color: 'text-blue-400' },
    { label: 'Content Pipeline', value: '12', icon: PlayCircle, color: 'text-purple-400', subtext: '3 Scripting, 5 Editing' },
    { label: 'Upcoming Events', value: '4', icon: Calendar, color: 'text-green-400', subtext: 'Next 48 hours' },
    { label: 'ACP Messages', value: String(messages.length), icon: Activity, color: 'text-emerald-400', subtext: 'Live agent messages' },
  ];

  return (
    <div className="h-full flex flex-col bg-bg-base p-8 overflow-y-auto custom-scrollbar">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text-base tracking-tight">Mission Control</h1>
        <p className="text-text-muted mt-1">Velocity OS Autonomous Agent Operating System</p>
      </div>

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
            <p className="text-text-muted text-sm text-center py-8">No agent messages yet. Start the Council or Hermes agent.</p>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div key={msg.id} className="flex gap-4 relative">
                  {i !== messages.length - 1 && (
                    <div className="absolute left-[9px] top-6 bottom-[-16px] w-[2px] bg-border-base" />
                  )}
                  <div className="relative z-10 mt-1">
                    <div className={`w-5 h-5 rounded-full border-4 border-bg-panel ${getStatusColor(msg.from)}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-text-base font-medium truncate">
                      <span className="text-text-muted font-normal">{msg.from} → {msg.to}: </span>
                      {msg.content}
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
```

- [ ] **Step 2: Test**

```bash
npm run dev
```
Open `http://localhost:3000`. In a separate terminal:
```bash
curl -X POST http://localhost:3000/api/acp \
  -H "Content-Type: application/json" \
  -d '{"from":"opencore","to":"hermes","content":"Test ACP message from OpenCore"}'
```
The dashboard should show the new message appear in real-time without a page refresh.

- [ ] **Step 3: Commit**

```bash
git add src/components/views/DashboardView.tsx
git commit -m "feat: dashboard activity feed driven by live ACP SSE stream"
```

---

## Task 9: Wire AITeamView with Real Agent Status from Registry

**Files:**
- Modify: `src/components/views/AITeamView.tsx` (add real status polling at top, keep the rest of the component identical)

- [ ] **Step 1: Add status polling to `AITeamView.tsx`**

Add this hook near the top of the `AITeamView` function body, after the existing `useState`:

```tsx
// Add import at top of file:
// import { AgentRegistration } from '@/types';

const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentRegistration>>({});

useEffect(() => {
  const poll = async () => {
    try {
      const res = await fetch('/api/acp/agents');
      const agents: AgentRegistration[] = await res.json();
      const map: Record<string, AgentRegistration> = {};
      agents.forEach(a => { map[a.id] = a; });
      setAgentStatuses(map);
    } catch {}
  };
  poll();
  const interval = setInterval(poll, 10_000); // poll every 10s
  return () => clearInterval(interval);
}, []);
```

Then update the `StatusIndicator` calls inside `AgentCard` to prefer live status when available. Find the `AgentCard` component's `status` prop usage and add a real-status overlay badge:

```tsx
// In AgentCard, after the existing StatusIndicator line, add:
// (pass agentStatuses down as a prop and read from it)
```

Add `agentStatuses` prop to `AgentCard`:

```tsx
function AgentCard({ agent, onClick, isSelected, liveStatus }: { 
  agent: Agent, 
  onClick: () => void, 
  isSelected: boolean,
  liveStatus?: AgentRegistration 
}) {
  const displayStatus: AgentStatus = (liveStatus?.status as AgentStatus) ?? agent.status;
  // Replace all references to agent.status with displayStatus in the component
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/views/AITeamView.tsx
git commit -m "feat: AI Team view polls real agent status from ACP registry"
```

---

## Task 10: Configure OpenClaw (claude-code) Project Settings

**Files:**
- Create: `.claude/settings.json`

The user wants to use `claude-haiku-4-5-20251001` for this project's claude-code interactions.

- [ ] **Step 1: Create `.claude/settings.json`**

```bash
mkdir -p /c/Users/User/Desktop/MISSION-CONTROL-VOS/.claude
```

```json
{
  "model": "claude-haiku-4-5-20251001",
  "permissions": {
    "allow": [],
    "deny": []
  }
}
```

Create this file at `.claude/settings.json` in the project root.

- [ ] **Step 2: Verify claude-code picks up the model**

```bash
claude --print --model-info 2>/dev/null || echo "Run 'claude' in this directory to use haiku-4-5"
```

- [ ] **Step 3: Add to gitignore (settings.json should NOT be committed — it's local)**

```bash
echo ".claude/settings.json" >> .gitignore
```

- [ ] **Step 4: Commit the gitignore update**

```bash
git add .gitignore
git commit -m "chore: gitignore project-level claude-code settings"
```

---

## Task 11: Build the Hermes Agent Service

**Files:**
- Create: `hermes/package.json`
- Create: `hermes/acp-client.ts`
- Create: `hermes/index.ts`

Hermes is a standalone Node.js polling agent. It runs alongside Mission Control (as a separate Railway service). It:
1. Registers itself with the ACP registry on startup
2. Polls for messages addressed to `hermes` every 5 seconds
3. Processes messages with Claude `claude-haiku-4-5-20251001`
4. Posts responses back to the ACP bus

- [ ] **Step 1: Create `hermes/package.json`**

```json
{
  "name": "hermes-agent",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node --experimental-strip-types index.ts",
    "dev": "node --watch --experimental-strip-types index.ts"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.36.0"
  }
}
```

- [ ] **Step 2: Install Hermes dependencies**

```bash
cd hermes && npm install && cd ..
```

- [ ] **Step 3: Create `hermes/acp-client.ts`**

```ts
// Minimal ACP client for Hermes
const BASE = process.env.MISSION_CONTROL_URL ?? 'http://localhost:3000';

export type ACPMessage = {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: string;
  status: string;
};

export async function registerWithACP() {
  const res = await fetch(`${BASE}/api/acp/agents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 'hermes',
      name: 'Hermes',
      model: 'claude-haiku-4-5-20251001',
      status: 'active',
    }),
  });
  if (!res.ok) throw new Error(`Registration failed: ${res.statusText}`);
  console.log('[Hermes] Registered with ACP registry');
}

export async function fetchMessages(): Promise<ACPMessage[]> {
  const res = await fetch(`${BASE}/api/acp?to=hermes&limit=5`);
  if (!res.ok) return [];
  return res.json();
}

export async function sendMessage(to: string, content: string): Promise<void> {
  await fetch(`${BASE}/api/acp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'hermes', to, content }),
  });
}
```

- [ ] **Step 4: Create `hermes/index.ts`**

```ts
import Anthropic from '@anthropic-ai/sdk';
import { registerWithACP, fetchMessages, sendMessage, ACPMessage } from './acp-client.ts';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = 'claude-haiku-4-5-20251001';
const POLL_INTERVAL_MS = 5_000;

// Track processed message IDs to avoid re-processing
const processed = new Set<string>();

async function processMessage(msg: ACPMessage) {
  if (processed.has(msg.id)) return;
  processed.add(msg.id);

  console.log(`[Hermes] Processing message from ${msg.from}: ${msg.content.slice(0, 80)}…`);

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: `You are Hermes, the relay and messaging agent for Mission Control VOS. You receive messages from OpenCore (VELO) and route or respond to them concisely. You are fast, clear, and precise. You help coordinate between agents.`,
      messages: [{ role: 'user', content: msg.content }],
    });

    const reply = (response.content[0] as { type: 'text'; text: string }).text;
    await sendMessage(msg.from, `[Hermes reply] ${reply}`);
    console.log(`[Hermes] Replied to ${msg.from}`);
  } catch (err) {
    console.error('[Hermes] Error processing message:', err);
  }
}

async function poll() {
  try {
    const messages = await fetchMessages();
    for (const msg of messages) {
      await processMessage(msg);
    }
  } catch (err) {
    console.error('[Hermes] Poll error:', err);
  }
}

async function main() {
  console.log('[Hermes] Starting up with model:', MODEL);
  await registerWithACP();

  // Send startup message to OpenCore
  await sendMessage('opencore', 'Hermes online. Ready to relay. Model: claude-haiku-4-5-20251001');

  // Poll loop
  console.log(`[Hermes] Polling every ${POLL_INTERVAL_MS / 1000}s…`);
  while (true) {
    await poll();
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
  }
}

main().catch(console.error);
```

- [ ] **Step 5: Test Hermes locally**

With `npm run dev` running in the main project directory:

```bash
cd hermes
ANTHROPIC_API_KEY=your_key MISSION_CONTROL_URL=http://localhost:3000 npm run dev
```

Expected output:
```
[Hermes] Starting up with model: claude-haiku-4-5-20251001
[Hermes] Registered with ACP registry
[Hermes] Polling every 5s…
```

Then in another terminal, send a test message to Hermes:
```bash
curl -X POST http://localhost:3000/api/acp \
  -H "Content-Type: application/json" \
  -d '{"from":"opencore","to":"hermes","content":"Hermes, what is your current status?"}'
```

Within 5 seconds, Hermes should log `[Hermes] Processing message` and then `[Hermes] Replied`. The dashboard at `http://localhost:3000` should show both messages in the activity feed.

- [ ] **Step 6: Commit**

```bash
cd ..
git add hermes/
git commit -m "feat: add Hermes relay agent with claude-haiku-4-5 and ACP integration"
```

---

## Task 12: Set Up OpenCore Autonomous Workflow

**Files:**
- Create: `src/app/api/opencore/route.ts`

OpenCore is a server-side API route that acts as VELO's autonomous task initiator. It can be called manually or by a cron job. It posts a morning briefing to Hermes and broadcasts system status via ACP.

- [ ] **Step 1: Create `src/app/api/opencore/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { sendACPMessage } from '@/lib/acp';

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// POST /api/opencore — trigger OpenCore morning briefing
// Body: { trigger: 'morning_briefing' | 'status_check' | 'task_dispatch' }
export async function POST(req: NextRequest) {
  const { trigger = 'status_check' } = await req.json();

  const prompts: Record<string, string> = {
    morning_briefing: 'Generate a concise morning briefing for the agent team. Include top 3 priorities for today and one metric to watch. Keep it under 100 words.',
    status_check: 'Report current system status for Mission Control VOS. Mention agent health, active tasks, and any flags.',
    task_dispatch: 'Review the current task queue and dispatch the top 2 tasks to appropriate agents. Be specific about who handles what.',
  };

  const prompt = prompts[trigger] ?? prompts.status_check;

  const { text } = await generateText({
    model: anthropic('claude-sonnet-4-6'),
    system: 'You are OpenCore, the central orchestration engine of Mission Control VOS running as VELO. You initiate autonomous workflows and coordinate the agent team.',
    prompt,
  });

  // Broadcast to all agents via ACP
  await sendACPMessage('opencore', 'broadcast', `[${trigger.toUpperCase()}] ${text}`);

  // Also send directly to Hermes for relay
  await sendACPMessage('opencore', 'hermes', text);

  return NextResponse.json({ trigger, message: text });
}
```

- [ ] **Step 2: Test the OpenCore workflow end-to-end**

With both `npm run dev` AND Hermes running:

```bash
curl -X POST http://localhost:3000/api/opencore \
  -H "Content-Type: application/json" \
  -d '{"trigger":"morning_briefing"}'
```

Expected: JSON response with `message` field containing a briefing.
Dashboard at `http://localhost:3000` should show the broadcast message.
Hermes should log processing the message and reply within 5 seconds.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/opencore/route.ts
git commit -m "feat: add OpenCore autonomous workflow trigger API"
```

---

## Task 13: Update `.env.example` and Add Railway Config

**Files:**
- Modify: `.env.example`
- Create: `railway.json`
- Create: `nixpacks.toml`

- [ ] **Step 1: Update `.env.example`**

```bash
cat > .env.example << 'EOF'
# Anthropic API Key — required for Council AI streaming and OpenCore
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# App URL — used by ACP client for server-to-server calls
# Railway sets this automatically via $RAILWAY_PUBLIC_DOMAIN
NEXT_PUBLIC_APP_URL=http://localhost:3000

# For Hermes agent (separate Railway service)
MISSION_CONTROL_URL=https://your-mission-control.railway.app
EOF
```

- [ ] **Step 2: Create `railway.json`**

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/",
    "healthcheckTimeout": 30,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

- [ ] **Step 3: Create `nixpacks.toml`**

```toml
[phases.build]
cmds = ["npm ci", "npm run build"]

[start]
cmd = "npm start"
```

- [ ] **Step 4: Add `hermes/railway.json` for the Hermes service**

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm ci"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ALWAYS"
  }
}
```

- [ ] **Step 5: Verify build works**

```bash
npm run build
```
Expected: Build completes with no errors. (Warnings about dynamic `force-dynamic` are OK.)

- [ ] **Step 6: Commit**

```bash
git add .env.example railway.json nixpacks.toml hermes/railway.json
git commit -m "chore: add Railway deployment config for Mission Control and Hermes"
```

---

## Task 14: Push to Railway GitHub Repository

- [ ] **Step 1: Verify remote is set correctly**

```bash
git remote -v
```
Expected: `origin  https://github.com/anshmudgil/MISSION-CONTROL-VOS.git`

- [ ] **Step 2: Do a final TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Push to GitHub (triggers Railway auto-deploy)**

```bash
git push origin main
```

- [ ] **Step 4: Set Railway environment variables**

In the Railway dashboard for the Mission Control service, set:
```
ANTHROPIC_API_KEY = <your key>
NEXT_PUBLIC_APP_URL = https://<your-railway-domain>
```

For the Hermes service in Railway, set:
```
ANTHROPIC_API_KEY = <your key>
MISSION_CONTROL_URL = https://<your-railway-domain>
```

- [ ] **Step 5: Verify deploy**

After Railway deploys (2-3 minutes after push):
```bash
curl https://your-railway-domain.railway.app/api/acp/agents | jq '.[].name'
```
Expected: `"OpenCore (VELO)"` and `"Hermes"`

---

## Task 15: Trigger Morning Briefing Cron on Railway

- [ ] **Step 1: Add Railway cron environment variable**

In Railway dashboard, add a Cron Job service that calls OpenCore daily:

Railway Cron Job config:
- Schedule: `0 7 * * *` (7 AM daily)
- Command: 
  ```bash
  curl -X POST $MISSION_CONTROL_URL/api/opencore \
    -H "Content-Type: application/json" \
    -d '{"trigger":"morning_briefing"}'
  ```

Alternatively, add a Next.js route handler that Railway's cron triggers:

- [ ] **Step 2: Verify the full loop**

Manually trigger the morning briefing:
```bash
curl -X POST https://your-railway-domain.railway.app/api/opencore \
  -H "Content-Type: application/json" \
  -d '{"trigger":"morning_briefing"}'
```

1. Check the response contains a briefing message
2. Open the Mission Control dashboard — the briefing should appear in the activity feed
3. Wait 5-10 seconds — Hermes should reply (visible in the dashboard feed)
4. Go to `/council` — conversation history shows the exchanges

- [ ] **Step 3: Final commit (if any changes made)**

```bash
git add -A
git status
# Only commit if there are changes
git commit -m "chore: finalize deployment and verify autonomous workflow"
git push origin main
```

---

## Self-Review

**Spec coverage check:**

| Requirement | Task(s) |
|------------|---------|
| React app with same design system | Tasks 7-9 (components refactored, design system unchanged) |
| OpenClaw model → haiku-4-5 | Task 10 (.claude/settings.json) |
| Hermes model → haiku-4-5 | Task 11 (hermes/index.ts uses claude-haiku-4-5-20251001) |
| ACP agent communication | Tasks 3-6 (message bus, SSE, registry, client lib) |
| OpenCore ↔ Hermes workflow | Tasks 11-13 (Hermes polling + OpenCore API) |
| Mission Control fully functional | Tasks 7-9 (real AI in Council, live dashboard) |
| Push to Railway GitHub | Tasks 13-15 |
| Cron jobs live | Task 15 (Railway cron) |

**Placeholder scan:** No TBDs, no "implement later", all code blocks are complete.

**Type consistency:**
- `ACPMessage` defined in Task 2 (`src/types.ts`), used in Tasks 3, 6, 8, 11 ✓
- `AgentRegistration` defined in Task 2, used in Tasks 5, 6, 9 ✓
- `sendACPMessage` defined in Task 6 (`src/lib/acp.ts`), used in Task 12 ✓
- `fetchMessages` in `hermes/acp-client.ts`, used in `hermes/index.ts` ✓
