import { NextRequest, NextResponse } from 'next/server';
import { client, ensureInit } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function GET() {
  await ensureInit();
  const result = await client.execute('SELECT * FROM agent_configs ORDER BY name ASC');
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  await ensureInit();
  const body = await req.json().catch(() => ({}));
  const { name, role = '', agent_group = 'Core', responsibilities = '', tonality = '', personality_traits = '', resources = '', reports_to = '', color = 'text-blue-500 bg-blue-500/10 border-blue-500/30' } = body as Record<string, string>;
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });
  const id = `agent-${randomUUID()}`;
  await client.execute({
    sql: 'INSERT INTO agent_configs (id, name, role, agent_group, responsibilities, tonality, personality_traits, resources, reports_to, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    args: [id, name, role, agent_group, responsibilities, tonality, personality_traits, resources, reports_to, color],
  });
  return NextResponse.json({ ok: true, id }, { status: 201 });
}
