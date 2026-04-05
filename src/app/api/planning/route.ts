import { NextRequest, NextResponse } from 'next/server';
import { client, ensureInit } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  await ensureInit();
  const quarter = req.nextUrl.searchParams.get('quarter') || 'Q2 2026';
  const objectives = await client.execute({ sql: 'SELECT * FROM planning_objectives WHERE quarter = ? ORDER BY position ASC', args: [quarter] });
  const result = [];
  for (const obj of objectives.rows) {
    const o = obj as Record<string, string | number | null>;
    const initiatives = await client.execute({ sql: 'SELECT * FROM planning_initiatives WHERE objective_id = ? ORDER BY position ASC', args: [o.id as string] });
    const initsWithProjects = [];
    for (const init of initiatives.rows) {
      const i = init as Record<string, string | number | null>;
      const projects = await client.execute({ sql: 'SELECT * FROM planning_projects WHERE initiative_id = ? ORDER BY position ASC', args: [i.id as string] });
      initsWithProjects.push({ ...i, projects: projects.rows });
    }
    result.push({ ...o, initiatives: initsWithProjects });
  }
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  await ensureInit();
  const body = await req.json().catch(() => ({}));
  const { quarter, title, description = '', color = 'blue' } = body as Record<string, string>;
  if (!quarter || !title) return NextResponse.json({ error: 'quarter and title required' }, { status: 400 });
  const id = `obj-${randomUUID()}`;
  const posResult = await client.execute({ sql: 'SELECT COALESCE(MAX(position), -1) + 1 as next_pos FROM planning_objectives WHERE quarter = ?', args: [quarter] });
  const position = (posResult.rows[0] as Record<string, number>).next_pos || 0;
  await client.execute({
    sql: 'INSERT INTO planning_objectives (id, quarter, title, description, color, position) VALUES (?, ?, ?, ?, ?, ?)',
    args: [id, quarter, title, description, color, position],
  });
  return NextResponse.json({ ok: true, id }, { status: 201 });
}
