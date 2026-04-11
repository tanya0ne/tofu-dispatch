import { NextRequest, NextResponse } from 'next/server'
import { initDb, sqlOne } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await initDb()
  await sqlOne(`UPDATE escalations SET status = 'dismissed' WHERE id = $1`, [Number(id)])
  return NextResponse.json({ success: true })
}
