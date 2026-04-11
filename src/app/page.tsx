import { initDb, sql } from '@/lib/db'
import Link from 'next/link'
import StatusBadge from '@/components/StatusBadge'

export const dynamic = 'force-dynamic'

function fmt(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 1) return 'just now'
  if (diff < 60) return `${diff}m ago`
  return `${Math.floor(diff / 60)}h ago`
}

export default async function DashboardPage() {
  await initDb()

  const today = new Date().toISOString().slice(0, 10)

  const [jobs, escalations, workers] = await Promise.all([
    sql(`
      SELECT j.*, w.name as worker_name, w.avatar_initials, w.avatar_color, w.language
      FROM jobs j JOIN workers w ON j.worker_id = w.id
      WHERE DATE(j.scheduled_at::timestamptz) = $1::date
      ORDER BY j.scheduled_at ASC
    `, [today]),
    sql(`
      SELECT e.*, w.name as worker_name, w.avatar_initials, w.avatar_color
      FROM escalations e JOIN workers w ON e.worker_id = w.id
      WHERE e.status = 'pending'
      ORDER BY e.created_at DESC
    `),
    sql(`SELECT * FROM workers WHERE status = 'active'`),
  ])

  const stats = {
    total:     jobs.length,
    confirmed: jobs.filter(j => ['confirmed','on_way','on_site'].includes(j.status)).length,
    completed: jobs.filter(j => j.status === 'completed').length,
    issues:    escalations.length,
  }

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1100 }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 13, color: '#999990', marginBottom: 4 }}>{dateStr}</div>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', color: '#1a1a18' }}>
          {greeting}, James
        </h1>
        <p style={{ fontSize: 14, color: '#555550', marginTop: 4 }}>
          {stats.confirmed} of {stats.total} jobs confirmed today · {escalations.length} escalation{escalations.length !== 1 ? 's' : ''} need attention
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 32 }}>
        {[
          { label: 'Jobs today',  value: stats.total,     sub: `${workers.length} active workers` },
          { label: 'Confirmed',   value: stats.confirmed, sub: 'on way or on site' },
          { label: 'Completed',   value: stats.completed, sub: 'visits done' },
          { label: 'Need action', value: escalations.length, sub: 'escalations pending', warn: escalations.length > 0 },
        ].map(s => (
          <div key={s.label} style={{
            background: '#fff',
            border: '1px solid #eeece8',
            borderRadius: 12,
            padding: '20px 20px',
          }}>
            <div style={{
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: '-0.04em',
              color: s.warn ? '#7f1d1d' : '#1a1a18',
              lineHeight: 1,
              marginBottom: 6,
            }}>{s.value}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a18' }}>{s.label}</div>
            <div style={{ fontSize: 12, color: '#999990', marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Escalations */}
      {escalations.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#999990', marginBottom: 12 }}>
            Needs your attention
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {escalations.map((e: any) => (
              <div key={e.id} style={{
                background: '#f2ede6',
                border: '1px solid #dedad4',
                borderRadius: 12,
                padding: '18px 20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 14,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: e.avatar_color, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: '#1a1a18', flexShrink: 0,
                }}>{e.avatar_initials}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{e.worker_name}</span>
                    <StatusBadge status={e.esc_type} />
                    <span style={{ fontSize: 12, color: '#999990', marginLeft: 'auto' }}>{timeAgo(e.created_at)}</span>
                  </div>
                  <p style={{ fontSize: 13.5, color: '#555550', lineHeight: 1.5 }}>{e.description}</p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <Link href={`/chat/${e.worker_id}`} style={{
                    padding: '7px 14px', borderRadius: 7, fontSize: 13, fontWeight: 600,
                    background: '#1a1a18', color: '#fff', textDecoration: 'none',
                  }}>Message</Link>
                  <EscalationDismiss id={e.id} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Today's schedule */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#999990', marginBottom: 12 }}>
          Today&apos;s schedule
        </div>
        <div style={{ background: '#fff', border: '1px solid #eeece8', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #eeece8' }}>
                {['Time', 'Worker', 'Client', 'Address', 'Type', 'Status', ''].map(h => (
                  <th key={h} style={{
                    padding: '11px 16px', textAlign: 'left',
                    fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.07em', color: '#999990',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {jobs.map((j: any, i: number) => (
                <tr key={j.id} style={{
                  borderBottom: i < jobs.length - 1 ? '1px solid #eeece8' : 'none',
                  background: i % 2 === 1 ? '#faf9f7' : '#fff',
                }}>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500, color: '#555550', whiteSpace: 'nowrap' }}>
                    {fmt(j.scheduled_at)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: j.avatar_color, display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 700, color: '#1a1a18', flexShrink: 0,
                      }}>{j.avatar_initials}</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>{j.worker_name}</div>
                        <div style={{ fontSize: 11, color: '#999990' }}>{j.language === 'es' ? '🇲🇽 ES' : '🇺🇸 EN'}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500 }}>{j.client_name}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#555550', maxWidth: 180 }}>
                    <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {j.address}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#555550', whiteSpace: 'nowrap' }}>{j.job_type}</td>
                  <td style={{ padding: '12px 16px' }}><StatusBadge status={j.status} /></td>
                  <td style={{ padding: '12px 16px' }}>
                    <Link href={`/chat/${j.worker_id}`} style={{
                      fontSize: 12, fontWeight: 500, color: '#555550',
                      textDecoration: 'none', padding: '4px 10px',
                      border: '1px solid #dedad4', borderRadius: 6,
                    }}>Chat</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function EscalationDismiss({ id }: { id: number }) {
  return (
    <form action={`/api/escalations/${id}`} method="POST">
      <input type="hidden" name="_method" value="PATCH" />
      <button type="submit" style={{
        padding: '7px 14px', borderRadius: 7, fontSize: 13, fontWeight: 500,
        background: '#fff', color: '#555550', border: '1px solid #dedad4',
        cursor: 'pointer',
      }}>Dismiss</button>
    </form>
  )
}
