import { NextRequest, NextResponse } from 'next/server';
import { client, ensureInit } from '@/lib/db';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureInit();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { shipped, blockers, focus, notes } = body as {
    shipped?: string;
    blockers?: string;
    focus?: string;
    notes?: string;
  };

  const fields: string[] = [];
  const args: string[] = [];

  if (shipped !== undefined) { fields.push('shipped = ?'); args.push(shipped); }
  if (blockers !== undefined) { fields.push('blockers = ?'); args.push(blockers); }
  if (focus !== undefined) { fields.push('focus = ?'); args.push(focus); }
  if (notes !== undefined) { fields.push('notes = ?'); args.push(notes); }

  if (fields.length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

  args.push(id);
  await client.execute({
    sql: `UPDATE journal_entries SET ${fields.join(', ')} WHERE id = ?`,
    args,
  });

  return NextResponse.json({ ok: true });
}
