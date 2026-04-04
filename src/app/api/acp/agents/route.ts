import { NextRequest, NextResponse } from 'next/server';
import { AgentRegistration } from '@/types';

// Shared agent registry — pre-seeded with known agents
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

// GET /api/acp/agents — list all registered agents
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
