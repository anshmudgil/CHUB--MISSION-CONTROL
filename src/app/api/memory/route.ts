import { NextRequest, NextResponse } from 'next/server';
import { client, ensureInit } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function GET() {
  await ensureInit();
  const result = await client.execute('SELECT * FROM memory_docs ORDER BY date DESC');
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  await ensureInit();
  const body = await req.json().catch(() => ({}));
  const { title, content = '', tag = 'General', words = 0, size = '0 KB', date } = body as Record<string, unknown>;
  if (!title || !date) return NextResponse.json({ error: 'title and date required' }, { status: 400 });
  const id = `md-${randomUUID()}`;
  await client.execute({
    sql: 'INSERT INTO memory_docs (id, title, content, tag, words, size, date) VALUES (?, ?, ?, ?, ?, ?, ?)',
    args: [id, title as string, content as string, tag as string, words as number, size as string, date as string],
  });
  return NextResponse.json({ ok: true, id }, { status: 201 });
}
