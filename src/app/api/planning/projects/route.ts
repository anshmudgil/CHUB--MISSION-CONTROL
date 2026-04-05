import { NextRequest, NextResponse } from 'next/server';
import { client, ensureInit } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  await ensureInit();
  const body = await req.json().catch(() => ({}));
  const { initiative_id, title, description = '' } = body as Record<string, string>;
  if (!initiative_id || !title) return NextResponse.json({ error: 'initiative_id and title required' }, { status: 400 });
  const id = `proj-${randomUUID()}`;
  const posResult = await client.execute({ sql: 'SELECT COALESCE(MAX(position), -1) + 1 as next_pos FROM planning_projects WHERE initiative_id = ?', args: [initiative_id] });
  const position = (posResult.rows[0] as Record<string, number>).next_pos || 0;
  await client.execute({
    sql: 'INSERT INTO planning_projects (id, initiative_id, title, description, position) VALUES (?, ?, ?, ?, ?)',
    args: [id, initiative_id, title, description, position],
  });
  return NextResponse.json({ ok: true, id }, { status: 201 });
}
