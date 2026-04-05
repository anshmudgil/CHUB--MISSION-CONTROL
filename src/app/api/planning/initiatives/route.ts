import { NextRequest, NextResponse } from 'next/server';
import { client, ensureInit } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  await ensureInit();
  const body = await req.json().catch(() => ({}));
  const { objective_id, title, description = '' } = body as Record<string, string>;
  if (!objective_id || !title) return NextResponse.json({ error: 'objective_id and title required' }, { status: 400 });
  const id = `init-${randomUUID()}`;
  const posResult = await client.execute({ sql: 'SELECT COALESCE(MAX(position), -1) + 1 as next_pos FROM planning_initiatives WHERE objective_id = ?', args: [objective_id] });
  const position = (posResult.rows[0] as Record<string, number>).next_pos || 0;
  await client.execute({
    sql: 'INSERT INTO planning_initiatives (id, objective_id, title, description, position) VALUES (?, ?, ?, ?, ?)',
    args: [id, objective_id, title, description, position],
  });
  return NextResponse.json({ ok: true, id }, { status: 201 });
}
