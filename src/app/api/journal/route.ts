import { NextRequest, NextResponse } from 'next/server';
import { client, ensureInit } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function GET() {
  await ensureInit();
  const result = await client.execute('SELECT * FROM journal_entries ORDER BY date DESC');
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  await ensureInit();
  const body = await req.json().catch(() => ({}));
  const { date, shipped = '', blockers = '', focus = '', notes = '' } = body as {
    date?: string;
    shipped?: string;
    blockers?: string;
    focus?: string;
    notes?: string;
  };

  if (!date) {
    return NextResponse.json({ error: 'date required' }, { status: 400 });
  }

  const id = `journal-${randomUUID()}`;
  await client.execute({
    sql: 'INSERT INTO journal_entries (id, date, shipped, blockers, focus, notes) VALUES (?, ?, ?, ?, ?, ?)',
    args: [id, date, shipped, blockers, focus, notes],
  });

  return NextResponse.json({ ok: true, id }, { status: 201 });
}
