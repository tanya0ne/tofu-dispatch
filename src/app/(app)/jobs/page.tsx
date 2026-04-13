import { initDb, sql } from '@/lib/db'
import JobsList from '@/components/JobsList'

export const dynamic = 'force-dynamic'

export default async function JobsPage() {
  await initDb()
  const today = new Date().toISOString().slice(0, 10)

  const jobs = await sql(`
    SELECT j.*, w.name as worker_name, w.avatar_initials, w.avatar_color, w.language
    FROM jobs j JOIN workers w ON j.worker_id = w.id
    WHERE DATE(j.scheduled_at::timestamptz) = $1::date
    ORDER BY j.scheduled_at ASC
  `, [today])

  const byStatus: Record<string, number> = {}
  for (const j of jobs) byStatus[j.status] = (byStatus[j.status] || 0) + 1

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1100 }}>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#999990', marginBottom: 6 }}>Jobs</div>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em' }}>Today&apos;s jobs</h1>
        <p style={{ fontSize: 14, color: '#555550', marginTop: 4 }}>
          {jobs.length} total &nbsp;·&nbsp;
          {byStatus['on_site'] || 0} on site &nbsp;·&nbsp;
          {byStatus['on_way'] || 0} on way &nbsp;·&nbsp;
          {byStatus['completed'] || 0} done
        </p>
      </div>

      <JobsList jobs={jobs} />
    </div>
  )
}
