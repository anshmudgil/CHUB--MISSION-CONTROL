import { NextRequest, NextResponse } from 'next/server';
import { client, ensureInit } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function GET() {
  await ensureInit();
  const result = await client.execute('SELECT * FROM contacts ORDER BY name ASC');
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  await ensureInit();
  const body = await req.json().catch(() => ({}));
  const { name, role = '', company = '', category = 'Internal Team', handle = '', timezone = '', notes = '', follow_up_stage = 'New Lead', last_contacted } = body as Record<string, string>;
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });
  const id = `ct-${randomUUID()}`;
  await client.execute({
    sql: 'INSERT INTO contacts (id, name, role, company, category, handle, timezone, notes, follow_up_stage, last_contacted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    args: [id, name, role, company, category, handle, timezone, notes, follow_up_stage, last_contacted || null],
  });
  return NextResponse.json({ ok: true, id }, { status: 201 });
}
