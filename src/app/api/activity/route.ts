import { NextRequest, NextResponse } from 'next/server';
import { client, ensureInit } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  await ensureInit();
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100);

  const result = await client.execute({
    sql: 'SELECT * FROM activity_log ORDER BY timestamp DESC LIMIT ?',
    args: [limit],
  });

  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  await ensureInit();
  const body = await req.json();
  const id = `act-${randomUUID()}`;

  await client.execute({
    sql: 'INSERT INTO activity_log (id, agent_id, action, metadata, timestamp) VALUES (?, ?, ?, ?, ?)',
    args: [
      id,
      body.agent || body.agentId || 'system',
      body.action || body.content || '',
      JSON.stringify(body.metadata ?? {}),
      new Date().toISOString(),
    ],
  });

  return NextResponse.json({ ok: true, id }, { status: 201 });
}
