import { initDb, sql } from '@/lib/db'
import JobsKanban from '@/components/JobsKanban'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

type Range = 'today' | 'week' | 'all'

function parseRange(v: string | string[] | undefined): Range {
  if (v === 'week' || v === 'all') return v
  return 'today'
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  await initDb()
  const sp = await searchParams
  const range = parseRange(sp.range)

  let jobs: any[]
  if (range === 'today') {
    const todayStart = new Date()
    todayStart.setUTCHours(0, 0, 0, 0)
    const tomorrowStart = new Date(todayStart)
    tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1)
    jobs = await sql(
      `SELECT j.*, w.name as worker_name, w.avatar_initials, w.avatar_color, w.language
       FROM jobs j JOIN workers w ON j.worker_id = w.id
       WHERE j.scheduled_at::timestamptz >= $1 AND j.scheduled_at::timestamptz < $2
       ORDER BY j.scheduled_at ASC`,
      [todayStart.toISOString(), tomorrowStart.toISOString()]
    )
  } else if (range === 'week') {
    const todayStart = new Date()
    todayStart.setUTCHours(0, 0, 0, 0)
    const weekEnd = new Date(todayStart)
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7)
    jobs = await sql(
      `SELECT j.*, w.name as worker_name, w.avatar_initials, w.avatar_color, w.language
       FROM jobs j JOIN workers w ON j.worker_id = w.id
       WHERE j.scheduled_at::timestamptz >= $1 AND j.scheduled_at::timestamptz < $2
       ORDER BY j.scheduled_at ASC`,
      [todayStart.toISOString(), weekEnd.toISOString()]
    )
  } else {
    jobs = await sql(
      `SELECT j.*, w.name as worker_name, w.avatar_initials, w.avatar_color, w.language
       FROM jobs j JOIN workers w ON j.worker_id = w.id
       ORDER BY j.scheduled_at ASC`
    )
  }

  const subtitle = range === 'today' ? "Today's jobs" : range === 'week' ? 'This week' : 'All jobs'

  const rangeButtons: { key: Range; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'Week' },
    { key: 'all', label: 'All' },
  ]

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1400 }}>

      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#999990', marginBottom: 6 }}>Jobs</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em' }}>{subtitle}</h1>
          <p style={{ fontSize: 14, color: '#555550', marginTop: 4 }}>
            {jobs.length} total
          </p>
        </div>

        <div style={{ display: 'flex', gap: 0, background: '#f2ede6', padding: 3, borderRadius: 10, border: '1px solid #eeece8' }}>
          {rangeButtons.map(b => {
            const isActive = b.key === range
            return (
              <Link
                key={b.key}
                href={`/jobs?range=${b.key}`}
                prefetch={false}
                style={{
                  padding: '6px 14px',
                  borderRadius: 7,
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: 'none',
                  background: isActive ? '#1a1a18' : 'transparent',
                  color: isActive ? '#fff' : '#555550',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {b.label}
              </Link>
            )
          })}
        </div>
      </div>

      <JobsKanban initialJobs={jobs} />
    </div>
  )
}
