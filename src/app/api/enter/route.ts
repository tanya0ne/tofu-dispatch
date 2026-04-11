import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { code } = await req.json()
  const expected = process.env.ACCESS_CODE

  if (!expected || code !== expected) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set('access', 'granted', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  })
  return res
}
