import { NextRequest, NextResponse } from 'next/server';
import { client, ensureInit } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  await ensureInit();
  const { searchParams } = new URL(req.url);
  const name = searchParams.get('name');

  let result;
  if (name) {
    result = await client.execute({
      sql: 'SELECT * FROM kpis WHERE name = ? ORDER BY recorded_at DESC LIMIT 1',
      args: [name],
    });
  } else {
    result = await client.execute(
      'SELECT * FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY name ORDER BY recorded_at DESC) as rn FROM kpis) WHERE rn = 1'
    );
  }

  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  await ensureInit();
  const body = await req.json().catch(() => ({}));
  const { name, value, target, unit = '', category = 'product' } = body as {
    name?: string;
    value?: string;
    target?: string;
    unit?: string;
    category?: string;
  };

  if (!name || value === undefined) {
    return NextResponse.json({ error: 'name and value required' }, { status: 400 });
  }

  const id = `kpi-${randomUUID()}`;
  await client.execute({
    sql: 'INSERT INTO kpis (id, name, value, target, unit, category) VALUES (?, ?, ?, ?, ?, ?)',
    args: [id, name, String(value), target ?? null, unit, category],
  });

  return NextResponse.json({ ok: true, id }, { status: 201 });
}
