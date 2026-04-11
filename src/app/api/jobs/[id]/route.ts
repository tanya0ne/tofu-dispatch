import { NextRequest, NextResponse } from 'next/server'
import { initDb, sqlOne } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { status } = await req.json()

  const allowed = ['scheduled', 'confirmed', 'on_way', 'on_site', 'completed', 'delayed', 'cancelled']
  if (!allowed.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  await initDb()
  const job = await sqlOne(
    `UPDATE jobs SET status = $1 WHERE id = $2 RETURNING *`,
    [status, Number(id)]
  )
  return NextResponse.json(job)
}
