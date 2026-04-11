import { initDb, sql } from '@/lib/db'
import Link from 'next/link'
import StatusBadge from '@/components/StatusBadge'

export const dynamic = 'force-dynamic'

function fmt(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

const STATUS_ORDER = ['on_site', 'on_way', 'delayed', 'confirmed', 'scheduled', 'completed', 'cancelled']

export default async function JobsPage() {
  await initDb()
  const today = new Date().toISOString().slice(0, 10)

  const jobs = await sql(`
    SELECT j.*, w.name as worker_name, w.avatar_initials, w.avatar_color, w.language
    FROM jobs j JOIN workers w ON j.worker_id = w.id
    WHERE DATE(j.scheduled_at::timestamptz) = $1::date
    ORDER BY j.scheduled_at ASC
  `, [today])

  const sorted = [...jobs].sort((a, b) =>
    STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
  )

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

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {Object.entries(byStatus).map(([s, n]) => (
          <div key={s} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 12px', borderRadius: 100,
            border: '1px solid #eeece8', background: '#fff',
            fontSize: 12, fontWeight: 500, color: '#555550',
          }}>
            <StatusBadge status={s} />
            <span style={{ marginLeft: 4 }}>{n}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sorted.map((j: any) => (
          <div key={j.id} style={{
            background: '#fff',
            border: '1px solid #eeece8',
            borderRadius: 12,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 16,
          }}>
            <div style={{ width: 68, flexShrink: 0, textAlign: 'right' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a18' }}>{fmt(j.scheduled_at)}</div>
              <div style={{ fontSize: 11, color: '#999990' }}>{j.estimated_duration}min</div>
            </div>

            <div style={{ width: 1, background: '#eeece8', alignSelf: 'stretch', flexShrink: 0 }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: 140, flexShrink: 0 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: j.avatar_color, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, flexShrink: 0,
              }}>{j.avatar_initials}</div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.2 }}>{j.worker_name.split(' ')[0]}</div>
                <div style={{ fontSize: 10.5, color: '#999990' }}>{j.language === 'es' ? '🇲🇽 ES' : '🇺🇸 EN'}</div>
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{j.client_name}</span>
                <span style={{ fontSize: 11.5, color: '#999990', fontWeight: 500 }}>· {j.job_type}</span>
              </div>
              <div style={{ fontSize: 12.5, color: '#555550', marginBottom: 4 }}>📍 {j.address}</div>
              {j.instructions && (
                <div style={{ fontSize: 12, color: '#999990', fontStyle: 'italic', lineHeight: 1.4 }}>
                  {j.instructions.length > 80 ? j.instructions.slice(0, 80) + '…' : j.instructions}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
              <StatusBadge status={j.status} />
              <Link href={`/chat/${j.worker_id}`} style={{
                fontSize: 12, fontWeight: 500, color: '#555550',
                textDecoration: 'none', padding: '4px 10px',
                border: '1px solid #dedad4', borderRadius: 6,
              }}>Chat →</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
