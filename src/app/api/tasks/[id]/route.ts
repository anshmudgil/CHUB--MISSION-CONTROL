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
    columnId,
    title,
    description,
    priority,
    dueDate,
    project,
    assignee,
    position,
  } = body as {
    columnId?: string;
    title?: string;
    description?: string;
    priority?: string;
    dueDate?: string;
    project?: string;
    assignee?: string;
    position?: number;
  };

  const fields: string[] = [];
  const args: (string | number | null)[] = [];

  if (columnId !== undefined) { fields.push('column_id = ?'); args.push(columnId); }
  if (title !== undefined) { fields.push('title = ?'); args.push(title); }
  if (description !== undefined) { fields.push('description = ?'); args.push(description); }
  if (priority !== undefined) { fields.push('priority = ?'); args.push(priority); }
  if (dueDate !== undefined) { fields.push('due_date = ?'); args.push(dueDate ?? null); }
  if (project !== undefined) { fields.push('project = ?'); args.push(project); }
  if (position !== undefined) { fields.push('position = ?'); args.push(position); }
  if (assignee !== undefined) {
    const isVelo = assignee === 'VELO';
    fields.push('assignee_name = ?'); args.push(isVelo ? 'VELO' : 'Ansh');
    fields.push('assignee_initial = ?'); args.push(isVelo ? 'V' : 'A');
    fields.push('assignee_color = ?'); args.push(
      isVelo ? 'bg-purple-500/20 text-purple-500' : 'bg-emerald-500/20 text-emerald-500'
    );
  }

  if (fields.length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  fields.push('updated_at = datetime(\'now\')');
  args.push(id);

  await client.execute({
    sql: `UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`,
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

  await client.execute({ sql: 'DELETE FROM tasks WHERE id = ?', args: [id] });
  return NextResponse.json({ ok: true });
}
