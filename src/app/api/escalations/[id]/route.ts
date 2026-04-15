import { NextRequest, NextResponse } from 'next/server'
import { initDb, sqlOne } from '@/lib/db'

async function dismiss(id: string) {
  await initDb()
  await sqlOne(`UPDATE escalations SET status = 'dismissed' WHERE id = $1`, [Number(id)])
}

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await dismiss(id)
  return NextResponse.json({ success: true })
}

// HTML <form method="POST"> from the dashboard's Dismiss button.
// Browsers can't emit PATCH, so we accept POST and redirect back.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await dismiss(id)
  const origin = new URL(req.url).origin
  return NextResponse.redirect(new URL('/dashboard', origin), { status: 303 })
}
