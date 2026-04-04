import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { password } = body as { password?: string };

  const correctPassword = process.env.AUTH_PASSWORD;
  if (!correctPassword) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  if (!password || password !== correctPassword) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const tokenValue = crypto.createHash('sha256').update(correctPassword).digest('hex');

  const response = NextResponse.json({ ok: true });
  response.cookies.set('mc-auth-token', tokenValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
  return response;
}
