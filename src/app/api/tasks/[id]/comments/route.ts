import { NextRequest, NextResponse } from 'next/server';
import { client, ensureInit } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureInit();
  const { id: taskId } = await params;

  const body = await req.json().catch(() => ({}));
  const { author = 'Ansh', text } = body as { author?: string; text?: string };

  if (!text?.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }

  const commentId = `comment-${randomUUID()}`;

  await client.execute({
    sql: 'INSERT INTO task_comments (id, task_id, author, text) VALUES (?, ?, ?, ?)',
    args: [commentId, taskId, author, text.trim()],
  });

  const row = await client.execute({
    sql: 'SELECT * FROM task_comments WHERE id = ?',
    args: [commentId],
  });
  const r = row.rows[0];

  return NextResponse.json(
    {
      id: r.id,
      taskId: r.task_id,
      author: r.author,
      text: r.text,
      timestamp: r.created_at,
    },
    { status: 201 }
  );
}
