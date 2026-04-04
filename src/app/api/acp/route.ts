import { NextRequest, NextResponse } from 'next/server';
import { ACPMessage } from '@/types';
import { messageStore, broadcastToSSE } from '@/lib/acp-store';
import { randomUUID } from 'crypto';

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
  if (messageStore.length > 500) messageStore.splice(500);
  broadcastToSSE(msg);

  return NextResponse.json(msg, { status: 201 });
}

// GET /api/acp?to=agentId&limit=20 — fetch messages
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const to = searchParams.get('to');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100);

  const results = to
    ? messageStore.filter(m => m.to === to || m.to === 'broadcast').slice(0, limit)
    : messageStore.slice(0, limit);

  return NextResponse.json(results);
}
