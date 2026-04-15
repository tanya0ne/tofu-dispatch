import { NextRequest, NextResponse } from 'next/server'
import { initDb, sqlOne } from '@/lib/db'

const ALLOWED_STATUSES = ['scheduled', 'confirmed', 'on_way', 'on_site', 'completed', 'delayed'] as const
type AllowedStatus = typeof ALLOWED_STATUSES[number]

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const idNum = Number(id)
  if (!Number.isInteger(idNum) || idNum <= 0 || String(idNum) !== id) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const status = (body as { status?: unknown })?.status
  if (typeof status !== 'string' || !ALLOWED_STATUSES.includes(status as AllowedStatus)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  await initDb()
  const job = await sqlOne(
    `UPDATE jobs SET status = $1 WHERE id = $2 RETURNING *`,
    [status, idNum]
  )

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true, job })
}
