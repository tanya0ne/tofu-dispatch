import { initDb, sql } from '@/lib/db'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function WorkersPage() {
  await initDb()
  const today = new Date().toISOString().slice(0, 10)

  const [workers, jobsByWorker, lastMsgByWorker] = await Promise.all([
    sql(`SELECT * FROM workers WHERE status = 'active' ORDER BY name`),
    sql(`
      SELECT worker_id,
        COUNT(*)::int as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)::int as completed,
        SUM(CASE WHEN status IN ('on_site','on_way') THEN 1 ELSE 0 END)::int as active,
        SUM(CASE WHEN status = 'delayed' THEN 1 ELSE 0 END)::int as delayed
      FROM jobs WHERE DATE(scheduled_at::timestamptz) = $1::date
      GROUP BY worker_id
    `, [today]),
    sql(`
      SELECT m.worker_id, m.content, m.direction, m.created_at
      FROM messages m
      INNER JOIN (
        SELECT worker_id, MAX(id) as max_id FROM messages GROUP BY worker_id
      ) latest ON m.id = latest.max_id
    `),
  ])

  const jobMap: Record<number, any> = {}
  for (const j of jobsByWorker) jobMap[j.worker_id] = j

  const msgMap: Record<number, any> = {}
  for (const m of lastMsgByWorker) msgMap[m.worker_id] = m

  function timeAgo(iso: string) {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
    if (diff < 1) return 'just now'
    if (diff < 60) return `${diff}m ago`
    return `${Math.floor(diff / 60)}h ago`
  }

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1100 }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#999990', marginBottom: 6 }}>Crew</div>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em' }}>Your team today</h1>
        <p style={{ fontSize: 14, color: '#555550', marginTop: 4 }}>{workers.length} active workers · {jobsByWorker.reduce((a: number, j: any) => a + j.total, 0)} jobs scheduled</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
        {workers.map((w: any) => {
          const jStats = jobMap[w.id] || { total: 0, completed: 0, active: 0, delayed: 0 }
          const lastMsg = msgMap[w.id]
          const pct = jStats.total > 0 ? Math.round((jStats.completed / jStats.total) * 100) : 0
          const isOverloaded = jStats.total >= 4
          const hasDelay = jStats.delayed > 0

          return (
            <div key={w.id} style={{
              background: '#fff',
              border: '1px solid #eeece8',
              borderRadius: 14,
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: w.avatar_color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700, color: '#1a1a18', flexShrink: 0,
                }}>{w.avatar_initials}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>{w.name}</div>
                  <div style={{ fontSize: 12, color: '#999990', marginTop: 1 }}>{w.role}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 100,
                      background: '#f2ede6', color: '#555550',
                    }}>{w.language === 'es' ? '🇲🇽 Spanish' : '🇺🇸 English'}</span>
                    {isOverloaded && <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 100, background: '#fee2e2', color: '#7f1d1d' }}>Overloaded</span>}
                    {hasDelay && <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 100, background: '#fef3c7', color: '#78350f' }}>Delayed</span>}
                  </div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: '#555550' }}>{jStats.completed} of {jStats.total} jobs done</span>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{pct}%</span>
                </div>
                <div style={{ height: 4, background: '#eeece8', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: '#1a1a18', borderRadius: 2, transition: 'width 0.3s' }} />
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  {[
                    { label: 'Total', val: jStats.total },
                    { label: 'Active', val: jStats.active },
                    { label: 'Done', val: jStats.completed },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.04em' }}>{s.val}</div>
                      <div style={{ fontSize: 10, color: '#999990', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {lastMsg && (
                <div style={{ padding: '10px 12px', background: '#f6f5f3', borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: '#999990', marginBottom: 3 }}>
                    Last message · {timeAgo(lastMsg.created_at)} · {lastMsg.direction === 'inbound' ? '← Worker' : '→ You'}
                  </div>
                  <div style={{ fontSize: 12.5, color: '#555550', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {lastMsg.content}
                  </div>
                </div>
              )}

              <Link href={`/chat/${w.id}`} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '9px 0', borderRadius: 8,
                background: '#1a1a18', color: '#fff',
                fontSize: 13, fontWeight: 600, textDecoration: 'none',
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                Message {w.name.split(' ')[0]}
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}
