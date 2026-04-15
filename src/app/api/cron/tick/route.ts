import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { initDb, sql } from '@/lib/db'

// POST /api/cron/tick
// Called daily by Railway Cron with header: Authorization: Bearer <CRON_SECRET>
// Refreshes job statuses so the app always shows "live" data for today.

export async function POST(req: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const secret = process.env.CRON_SECRET
  if (!secret) {
    // Misconfiguration — refuse to run rather than leave endpoint open.
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }
  const auth = req.headers.get('authorization') || ''
  const expected = `Bearer ${secret}`
  // Constant-time compare — protects against timing attacks on the token.
  const authBuf = Buffer.from(auth)
  const expectedBuf = Buffer.from(expected)
  if (authBuf.length !== expectedBuf.length || !timingSafeEqual(authBuf, expectedBuf)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await initDb()

  // ── Time boundaries (all UTC) ──────────────────────────────────────────────
  const now = new Date()
  const startOfToday = new Date(now); startOfToday.setUTCHours(0, 0, 0, 0)
  const startOfTomorrow = new Date(startOfToday); startOfTomorrow.setUTCDate(startOfTomorrow.getUTCDate() + 1)

  const nowIso = now.toISOString()
  const todayStartIso = startOfToday.toISOString()
  const tomorrowStartIso = startOfTomorrow.toISOString()

  const counts = { completed: 0, delayed: 0, on_site: 0, on_way: 0, confirmed: 0 }

  // ── Pull all jobs we might need to touch ───────────────────────────────────
  // Past + today. Future-day jobs are left alone per brief.
  const rows = await sql<{
    id: number; scheduled_at: string; estimated_duration: number; status: string
  }>(
    `SELECT id, scheduled_at, estimated_duration, status
     FROM jobs
     WHERE scheduled_at::timestamptz < $1`,
    [tomorrowStartIso]
  )

  const toCompleted: number[] = []
  const toDelayed: number[] = []
  const toOnSite: number[] = []
  const toOnWay: number[] = []
  const toConfirmed: number[] = []

  for (const r of rows) {
    const schedMs = new Date(r.scheduled_at).getTime()
    const endMs = schedMs + (r.estimated_duration || 60) * 60_000
    const status = r.status

    if (schedMs < startOfToday.getTime()) {
      // Past-day job
      if (status !== 'completed' && status !== 'delayed') {
        if (Math.random() < 0.85) toCompleted.push(r.id)
        else toDelayed.push(r.id)
      }
      continue
    }

    // Today (schedMs is in [startOfToday, startOfTomorrow))
    if (status === 'completed' || status === 'delayed') continue

    const nowMs = now.getTime()
    if (endMs < nowMs) {
      // Time already passed
      if (Math.random() < 0.85) toCompleted.push(r.id)
      else toDelayed.push(r.id)
    } else if (schedMs <= nowMs && nowMs < endMs) {
      // Currently in progress
      if (status !== 'on_site') toOnSite.push(r.id)
    } else if (schedMs < nowMs + 60 * 60_000) {
      // Starts within the next hour
      if (status !== 'on_way') toOnWay.push(r.id)
    } else {
      // Later today — promote "scheduled" to "confirmed"; leave confirmed alone
      if (status === 'scheduled') toConfirmed.push(r.id)
    }
  }

  // ── Apply updates (one UPDATE per status group) ────────────────────────────
  async function bulkUpdate(ids: number[], newStatus: string): Promise<number> {
    if (ids.length === 0) return 0
    await sql(
      `UPDATE jobs SET status = $1 WHERE id = ANY($2::int[])`,
      [newStatus, ids]
    )
    return ids.length
  }

  counts.completed = await bulkUpdate(toCompleted, 'completed')
  counts.delayed   = await bulkUpdate(toDelayed,   'delayed')
  counts.on_site   = await bulkUpdate(toOnSite,    'on_site')
  counts.on_way    = await bulkUpdate(toOnWay,     'on_way')
  counts.confirmed = await bulkUpdate(toConfirmed, 'confirmed')

  return NextResponse.json({
    ok: true,
    now: nowIso,
    today: todayStartIso,
    updated: counts,
  })
}
