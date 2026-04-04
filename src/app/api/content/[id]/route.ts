import { NextRequest, NextResponse } from 'next/server';
import { client, ensureInit } from '@/lib/db';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureInit();
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const {
    stage,
    title,
    body: itemBody,
    contentType,
    platform,
    status,
    scheduledFor,
    approve,
  } = body as {
    stage?: string;
    title?: string;
    body?: string;
    contentType?: string;
    platform?: string;
    status?: string;
    scheduledFor?: string;
    approve?: boolean;
  };

  const fields: string[] = [];
  const args: (string | null)[] = [];

  if (stage !== undefined) { fields.push('stage = ?'); args.push(stage); }
  if (title !== undefined) { fields.push('title = ?'); args.push(title); }
  if (itemBody !== undefined) { fields.push('body = ?'); args.push(itemBody); }
  if (contentType !== undefined) { fields.push('content_type = ?'); args.push(contentType); }
  if (platform !== undefined) { fields.push('platform = ?'); args.push(platform); }
  if (status !== undefined) { fields.push('status = ?'); args.push(status); }
  if (scheduledFor !== undefined) { fields.push('scheduled_for = ?'); args.push(scheduledFor); }

  if (approve) {
    fields.push('status = ?'); args.push('approved');
    fields.push('approved_at = ?'); args.push(new Date().toISOString());
    fields.push('approved_by = ?'); args.push('Ansh');
  }

  if (fields.length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  fields.push("updated_at = datetime('now')");
  args.push(id);

  await client.execute({
    sql: `UPDATE content_items SET ${fields.join(', ')} WHERE id = ?`,
    args,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureInit();
  const { id } = await params;

  await client.execute({ sql: 'DELETE FROM content_items WHERE id = ?', args: [id] });
  return NextResponse.json({ ok: true });
}
