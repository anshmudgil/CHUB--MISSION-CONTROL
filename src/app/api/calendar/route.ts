import { NextRequest, NextResponse } from 'next/server';
import { client, ensureInit } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function GET() {
  await ensureInit();
  const result = await client.execute('SELECT * FROM calendar_events ORDER BY event_date ASC, time ASC');
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  await ensureInit();
  const body = await req.json().catch(() => ({}));
  const { title, description = '', time = '', type = 'Velocity OS', color = '', event_date } = body as Record<string, string>;
  if (!title || !event_date) return NextResponse.json({ error: 'title and event_date required' }, { status: 400 });
  const id = `ce-${randomUUID()}`;
  await client.execute({
    sql: 'INSERT INTO calendar_events (id, title, description, time, type, color, event_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
    args: [id, title, description, time, type, color, event_date],
  });
  return NextResponse.json({ ok: true, id }, { status: 201 });
}
