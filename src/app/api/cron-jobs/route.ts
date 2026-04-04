import { NextRequest, NextResponse } from 'next/server';
import { client, ensureInit } from '@/lib/db';

function normalizeJob(j: Record<string, unknown>) {
  return {
    id: j.id,
    name: j.name,
    agent: j.agent,
    description: j.description,
    schedule: {
      expr: j.cron_expression,
      humanReadable: j.frequency,
    },
    color: j.color,
    enabled: j.status === 'active',
    lastRunAt: j.last_run_at,
    nextRunAt: j.next_run_at,
    createdAt: j.created_at,
  };
}

export async function GET() {
  await ensureInit();
  const result = await client.execute('SELECT * FROM scheduled_tasks ORDER BY created_at DESC');
  return NextResponse.json(result.rows.map(r => normalizeJob(r as unknown as Record<string, unknown>)));
}

export async function POST(req: NextRequest) {
  await ensureInit();
  const body = await req.json();
  const id = body.id || `cron-${Date.now()}`;

  await client.execute({
    sql: `INSERT OR REPLACE INTO scheduled_tasks
      (id, name, agent, description, frequency, cron_expression, status, color, last_run_at, next_run_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      body.name,
      body.agent || 'VELO',
      body.description || '',
      body.schedule?.humanReadable || body.frequency || 'daily',
      body.schedule?.expr || body.cron_expression || null,
      body.enabled !== false ? 'active' : 'paused',
      body.color || '#3b82f6',
      body.lastRunAt || null,
      body.nextRunAt || null,
      body.createdAt || new Date().toISOString(),
    ],
  });

  return NextResponse.json({ ok: true, id });
}

export async function DELETE(req: NextRequest) {
  await ensureInit();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  await client.execute({ sql: 'DELETE FROM scheduled_tasks WHERE id = ?', args: [id] });
  return NextResponse.json({ ok: true });
}
