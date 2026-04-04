import { NextRequest, NextResponse } from 'next/server';
import { client, ensureInit } from '@/lib/db';
import { randomUUID } from 'crypto';

function rowToItem(row: Record<string, unknown>) {
  return {
    id: row.id,
    stage: row.stage,
    title: row.title,
    body: row.body,
    contentType: row.content_type,
    platform: row.platform,
    status: row.status,
    scheduledFor: row.scheduled_for,
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET() {
  await ensureInit();
  const result = await client.execute(
    'SELECT * FROM content_items ORDER BY created_at DESC'
  );
  return NextResponse.json(result.rows.map(rowToItem));
}

export async function POST(req: NextRequest) {
  await ensureInit();

  const body = await req.json().catch(() => ({}));
  const {
    title,
    stage = 'ideas',
    body: itemBody = '',
    contentType = 'post',
    platform = 'linkedin',
  } = body as {
    title?: string;
    stage?: string;
    body?: string;
    contentType?: string;
    platform?: string;
  };

  if (!title?.trim()) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }

  const id = `content-${randomUUID()}`;

  await client.execute({
    sql: `INSERT INTO content_items (id, stage, title, body, content_type, platform) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, stage, title.trim(), itemBody, contentType, platform],
  });

  const row = await client.execute({ sql: 'SELECT * FROM content_items WHERE id = ?', args: [id] });
  return NextResponse.json(rowToItem(row.rows[0] as Record<string, unknown>), { status: 201 });
}
