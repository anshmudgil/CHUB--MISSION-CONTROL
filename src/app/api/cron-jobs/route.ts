import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

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
  const jobs = db.prepare('SELECT * FROM scheduled_tasks ORDER BY created_at DESC').all() as Record<string, unknown>[];
  return NextResponse.json(jobs.map(normalizeJob));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const id = body.id || `cron-${Date.now()}`;

  db.prepare(`
    INSERT OR REPLACE INTO scheduled_tasks
      (id, name, agent, description, frequency, cron_expression, status, color, last_run_at, next_run_at, created_at)
    VALUES
      (@id, @name, @agent, @description, @frequency, @cron_expression, @status, @color, @last_run_at, @next_run_at, @created_at)
  `).run({
    id,
    name: body.name,
    agent: body.agent || 'VELO',
    description: body.description || '',
    frequency: body.schedule?.humanReadable || body.frequency || 'daily',
    cron_expression: body.schedule?.expr || body.cron_expression || null,
    status: body.enabled !== false ? 'active' : 'paused',
    color: body.color || '#3b82f6',
    last_run_at: body.lastRunAt || null,
    next_run_at: body.nextRunAt || null,
    created_at: body.createdAt || new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, id });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  db.prepare('DELETE FROM scheduled_tasks WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
