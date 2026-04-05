import { NextRequest, NextResponse } from 'next/server';
import { client, ensureInit } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureInit();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const fields: string[] = [];
  const args: (string | number | null)[] = [];
  for (const [key, val] of Object.entries(body as Record<string, string>)) {
    if (['name','role','company','category','handle','timezone','notes','follow_up_stage','last_contacted'].includes(key)) {
      fields.push(`${key} = ?`);
      args.push(val);
    }
  }
  if (fields.length === 0) return NextResponse.json({ error: 'no fields' }, { status: 400 });
  args.push(id);
  await client.execute({ sql: `UPDATE contacts SET ${fields.join(', ')} WHERE id = ?`, args });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureInit();
  const { id } = await params;
  await client.execute({ sql: 'DELETE FROM contacts WHERE id = ?', args: [id] });
  return NextResponse.json({ ok: true });
}
