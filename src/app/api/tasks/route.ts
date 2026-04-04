import { NextRequest, NextResponse } from 'next/server';
import { client, ensureInit } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function GET() {
  await ensureInit();

  const tasksResult = await client.execute(
    'SELECT * FROM tasks ORDER BY column_id, position ASC'
  );

  const commentsResult = await client.execute(
    'SELECT * FROM task_comments ORDER BY created_at ASC'
  );

  const commentsByTask: Record<string, Array<{ id: string; author: string; text: string; timestamp: string }>> = {};
  for (const row of commentsResult.rows) {
    const taskId = row.task_id as string;
    if (!commentsByTask[taskId]) commentsByTask[taskId] = [];
    commentsByTask[taskId].push({
      id: row.id as string,
      author: row.author as string,
      text: row.text as string,
      timestamp: row.created_at as string,
    });
  }

  const tasks = tasksResult.rows.map((row) => ({
    id: row.id as string,
    columnId: row.column_id as string,
    title: row.title as string,
    description: row.description as string,
    assignee: {
      name: row.assignee_name as string,
      initial: row.assignee_initial as string,
      color: row.assignee_color as string,
    },
    tag: {
      label: row.tag_label as string,
      color: row.tag_color as string,
    },
    priority: row.priority as string,
    dueDate: row.due_date as string | null,
    project: row.project as string,
    timeAgo: row.created_at as string,
    comments: commentsByTask[row.id as string] || [],
  }));

  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  await ensureInit();

  const body = await req.json().catch(() => ({}));
  const {
    title,
    description = '',
    columnId = 'backlog',
    priority = 'medium',
    dueDate,
    project = '',
    assignee = 'Ansh',
  } = body as {
    title?: string;
    description?: string;
    columnId?: string;
    priority?: string;
    dueDate?: string;
    project?: string;
    assignee?: string;
  };

  if (!title?.trim()) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }

  const isVelo = assignee === 'VELO';
  const assigneeName = isVelo ? 'VELO' : 'Ansh';
  const assigneeInitial = isVelo ? 'V' : 'A';
  const assigneeColor = isVelo
    ? 'bg-purple-500/20 text-purple-500'
    : 'bg-emerald-500/20 text-emerald-500';

  // Get max position in column
  const posResult = await client.execute({
    sql: 'SELECT MAX(position) as maxpos FROM tasks WHERE column_id = ?',
    args: [columnId],
  });
  const maxPos = (posResult.rows[0]?.maxpos as number | null) ?? -1;
  const position = maxPos + 1;

  const id = `task-${randomUUID()}`;

  await client.execute({
    sql: `INSERT INTO tasks
      (id, column_id, title, description, assignee_name, assignee_initial, assignee_color, priority, due_date, project, position)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      columnId,
      title.trim(),
      description,
      assigneeName,
      assigneeInitial,
      assigneeColor,
      priority,
      dueDate ?? null,
      project,
      position,
    ],
  });

  const row = await client.execute({ sql: 'SELECT * FROM tasks WHERE id = ?', args: [id] });
  const r = row.rows[0];

  return NextResponse.json(
    {
      id: r.id,
      columnId: r.column_id,
      title: r.title,
      description: r.description,
      assignee: { name: r.assignee_name, initial: r.assignee_initial, color: r.assignee_color },
      tag: { label: r.tag_label, color: r.tag_color },
      priority: r.priority,
      dueDate: r.due_date,
      project: r.project,
      timeAgo: r.created_at,
      comments: [],
    },
    { status: 201 }
  );
}
