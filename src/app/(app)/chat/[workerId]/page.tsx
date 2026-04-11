import { initDb, sql, sqlOne } from '@/lib/db'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ChatInterface from '@/components/ChatInterface'

export const dynamic = 'force-dynamic'

export default async function ChatPage({ params }: { params: Promise<{ workerId: string }> }) {
  const { workerId } = await params
  await initDb()

  const [worker, messages, allWorkers] = await Promise.all([
    sqlOne(`SELECT * FROM workers WHERE id = $1`, [Number(workerId)]),
    sql(`SELECT * FROM messages WHERE worker_id = $1 ORDER BY created_at ASC, id ASC`, [Number(workerId)]),
    sql(`SELECT id, name, avatar_initials FROM workers WHERE status = 'active'`),
  ])

  if (!worker) notFound()

  const today = new Date().toISOString().slice(0, 10)
  const todaysJobs = await sql(
    `SELECT * FROM jobs WHERE worker_id = $1 AND DATE(scheduled_at::timestamptz) = $2::date ORDER BY scheduled_at ASC`,
    [Number(workerId), today]
  )

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* Worker list sidebar */}
      <div style={{
        width: 240, borderRight: '1px solid #eeece8', background: '#fff',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid #eeece8' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#999990' }}>Messages</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {allWorkers.map((w: any) => (
            <Link key={w.id} href={`/chat/${w.id}`} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', textDecoration: 'none',
              background: w.id === Number(workerId) ? '#f2ede6' : 'transparent',
              borderLeft: w.id === Number(workerId) ? '2px solid #1a1a18' : '2px solid transparent',
              transition: 'background 0.1s',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: w.id === Number(workerId) ? '#dedad4' : '#f6f5f3',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: '#1a1a18', flexShrink: 0,
              }}>{w.avatar_initials}</div>
              <span style={{ fontSize: 13.5, fontWeight: w.id === Number(workerId) ? 700 : 500, color: '#1a1a18' }}>
                {w.name.split(' ')[0]}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <ChatInterface
        worker={worker}
        initialMessages={messages}
        todaysJobs={todaysJobs}
      />
    </div>
  )
}
