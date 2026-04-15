import { NextRequest, NextResponse } from 'next/server'
import { initDb, sql, sqlOne } from '@/lib/db'

export async function POST(req: NextRequest) {
  await initDb()

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const {
    worker_id,
    client_name,
    address,
    scheduled_at,
    estimated_duration,
    job_type,
    instructions,
  } = body ?? {}

  // worker_id — positive integer
  const workerIdNum = Number(worker_id)
  if (!Number.isInteger(workerIdNum) || workerIdNum <= 0) {
    return NextResponse.json({ error: 'worker_id must be a positive integer' }, { status: 400 })
  }

  // Non-empty strings
  const strFields: Record<string, unknown> = { client_name, address, scheduled_at, job_type }
  for (const [k, v] of Object.entries(strFields)) {
    if (typeof v !== 'string' || v.trim().length === 0) {
      return NextResponse.json({ error: `${k} must be a non-empty string` }, { status: 400 })
    }
  }

  // scheduled_at — valid ISO8601
  const scheduledDate = new Date(scheduled_at)
  if (scheduledDate.toString() === 'Invalid Date') {
    return NextResponse.json({ error: 'scheduled_at must be a valid ISO8601 date' }, { status: 400 })
  }

  // estimated_duration — integer 15..600
  const durationNum = Number(estimated_duration)
  if (!Number.isInteger(durationNum) || durationNum < 15 || durationNum > 600) {
    return NextResponse.json({ error: 'estimated_duration must be an integer between 15 and 600' }, { status: 400 })
  }

  // instructions — optional string up to 2000 chars
  let instructionsValue: string | null = null
  if (instructions !== undefined && instructions !== null) {
    if (typeof instructions !== 'string') {
      return NextResponse.json({ error: 'instructions must be a string' }, { status: 400 })
    }
    if (instructions.length > 2000) {
      return NextResponse.json({ error: 'instructions must be <= 2000 chars' }, { status: 400 })
    }
    instructionsValue = instructions
  }

  // Verify worker exists
  const workerRow = await sqlOne<{ id: number }>(
    `SELECT id FROM workers WHERE id = $1`,
    [workerIdNum]
  )
  if (!workerRow) {
    return NextResponse.json({ error: 'worker_id not found' }, { status: 400 })
  }

  // Insert job
  const rows = await sql<any>(
    `INSERT INTO jobs (worker_id, client_name, address, scheduled_at, estimated_duration, status, job_type, instructions)
     VALUES ($1, $2, $3, $4, $5, 'scheduled', $6, $7)
     RETURNING *`,
    [
      workerIdNum,
      (client_name as string).trim(),
      (address as string).trim(),
      scheduledDate.toISOString(),
      durationNum,
      (job_type as string).trim(),
      instructionsValue,
    ]
  )

  return NextResponse.json({ ok: true, job: rows[0] }, { status: 200 })
}
