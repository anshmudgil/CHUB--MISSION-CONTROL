import { NextRequest, NextResponse } from 'next/server';
import { client, ensureInit } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureInit();
  const { id } = await params;
  const result = await client.execute({ sql: 'SELECT * FROM memory_docs WHERE id = ?', args: [id] });
  if (result.rows.length === 0) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(result.rows[0]);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureInit();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const fields: string[] = [];
  const args: (string | number | null)[] = [];
  for (const [key, val] of Object.entries(body as Record<string, string | number | null>)) {
    if (['title','content','tag','words','size','date'].includes(key)) {
      fields.push(`${key} = ?`);
      args.push(val);
    }
  }
  if (fields.length > 0) {
    fields.push("updated_at = datetime('now')");
    args.push(id);
    await client.execute({ sql: `UPDATE memory_docs SET ${fields.join(', ')} WHERE id = ?`, args });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureInit();
  const { id } = await params;
  await client.execute({ sql: 'DELETE FROM memory_docs WHERE id = ?', args: [id] });
  return NextResponse.json({ ok: true });
}
