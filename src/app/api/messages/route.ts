import { NextRequest, NextResponse } from 'next/server'
import { initDb, sqlOne } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { worker_id, content, content_translated, direction, job_id } = await req.json()

  if (!worker_id || !content || !direction) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  await initDb()
  const msg = await sqlOne(
    `INSERT INTO messages (worker_id, job_id, direction, content, content_translated, msg_type)
     VALUES ($1, $2, $3, $4, $5, 'chat') RETURNING *`,
    [worker_id, job_id ?? null, direction, content, content_translated ?? null]
  )

  return NextResponse.json(msg)
}
