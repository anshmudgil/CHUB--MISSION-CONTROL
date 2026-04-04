import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100);

  const entries = db.prepare(
    'SELECT * FROM activity_log ORDER BY timestamp DESC LIMIT ?'
  ).all(limit) as Record<string, unknown>[];

  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const id = `act-${randomUUID()}`;

  db.prepare(`
    INSERT INTO activity_log (id, agent_id, action, metadata, timestamp)
    VALUES (@id, @agent_id, @action, @metadata, @timestamp)
  `).run({
    id,
    agent_id: body.agent || body.agentId || 'system',
    action: body.action || body.content || '',
    metadata: JSON.stringify(body.metadata ?? {}),
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, id }, { status: 201 });
}
