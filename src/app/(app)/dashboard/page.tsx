import { initDb, sql } from '@/lib/db'
import Link from 'next/link'
import StatusBadge from '@/components/StatusBadge'
import FabNewJob from '@/components/FabNewJob'
import HeaderNewJobButton from '@/components/HeaderNewJobButton'

export const dynamic = 'force-dynamic'

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' })
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 1) return 'just now'
  if (diff < 60) return `${diff}m ago`
  const h = Math.floor(diff / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function daysAgoFromIso(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  return Math.max(0, Math.floor(diffMs / (24 * 60 * 60_000)))
}

function daysOverdue(dueDateIso: string) {
  const due = new Date(dueDateIso).getTime()
  const diffMs = Date.now() - due
  return Math.max(0, Math.floor(diffMs / (24 * 60 * 60_000)))
}

function money(cents: number) {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export default async function DashboardPage() {
  await initDb()

  // Single parallel SQL batch — will be extended in later tasks.
  const [
    jobsToday,
    escalations,
    overdueInvoices,
    stuckEstimates,
    jobsReadyForInvoice,
    tomorrowCountRow,
    tomorrowUnassignedRow,
    weekCountRow,
    sentEstimatesCountRow,
    estimatesWaitingRow,
    invoicesUnpaidRow,
    invoicesOverdueRow,
    remindersRow,
    confirmationsRow,
    translationsRow,
    teamRow,
    workersList,
    remindersYdayRow,
    confirmationsYdayRow,
    translationsYdayRow,
  ] = await Promise.all([
    sql<any>(`
      SELECT j.*, w.name as worker_name, w.avatar_initials, w.avatar_color, w.language
      FROM jobs j JOIN workers w ON j.worker_id = w.id
      WHERE DATE(j.scheduled_at::timestamptz) = (NOW() AT TIME ZONE 'UTC')::date
      ORDER BY j.scheduled_at ASC
    `),
    sql<any>(`
      SELECT e.*, w.name as worker_name, w.avatar_initials, w.avatar_color, w.phone as worker_phone
      FROM escalations e JOIN workers w ON e.worker_id = w.id
      WHERE e.status = 'pending'
      ORDER BY e.created_at DESC
    `),
    sql<any>(`
      SELECT * FROM invoices
      WHERE status = 'unpaid'
        AND due_date::date < (NOW() - INTERVAL '14 days')::date
      ORDER BY due_date ASC
    `),
    sql<any>(`
      SELECT * FROM estimates
      WHERE status = 'sent'
        AND sent_at::timestamptz < NOW() - INTERVAL '5 days'
      ORDER BY sent_at ASC
    `),
    sql<any>(`
      SELECT j.* FROM jobs j
      LEFT JOIN invoices i ON i.job_id = j.id
      WHERE j.status = 'completed' AND i.id IS NULL
      LIMIT 20
    `),
    sql<{ n: string }>(`
      SELECT COUNT(*)::int AS n FROM jobs
      WHERE DATE(scheduled_at::timestamptz) = ((NOW() AT TIME ZONE 'UTC')::date + INTERVAL '1 day')::date
    `),
    sql<{ n: string }>(`
      SELECT COUNT(*)::int AS n FROM jobs
      WHERE DATE(scheduled_at::timestamptz) = ((NOW() AT TIME ZONE 'UTC')::date + INTERVAL '1 day')::date
        AND worker_id IS NULL
    `),
    sql<{ n: string }>(`
      SELECT COUNT(*)::int AS n FROM jobs
      WHERE scheduled_at::timestamptz >= (NOW() AT TIME ZONE 'UTC')::date
        AND scheduled_at::timestamptz <  ((NOW() AT TIME ZONE 'UTC')::date + INTERVAL '7 days')
    `),
    sql<{ n: string }>(`SELECT COUNT(*)::int AS n FROM estimates WHERE status = 'sent'`),
    sql<{ count: number; total_cents: number; oldest_sent_at: string | null }>(`
      SELECT COUNT(*)::int AS count,
             COALESCE(SUM(amount_cents), 0)::int AS total_cents,
             MIN(sent_at) AS oldest_sent_at
      FROM estimates
      WHERE status = 'sent'
    `),
    sql<{ count: number; total_cents: number }>(`
      SELECT COUNT(*)::int AS count,
             COALESCE(SUM(amount_cents), 0)::int AS total_cents
      FROM invoices
      WHERE status = 'unpaid'
    `),
    sql<{ count: number; total_cents: number }>(`
      SELECT COUNT(*)::int AS count,
             COALESCE(SUM(amount_cents), 0)::int AS total_cents
      FROM invoices
      WHERE status = 'unpaid'
        AND due_date::date < (NOW() AT TIME ZONE 'UTC')::date
    `),
    sql<{ n: number }>(`
      SELECT COUNT(*)::int AS n FROM messages
      WHERE msg_type = 'reminder'
        AND DATE(created_at::timestamptz) = (NOW() AT TIME ZONE 'UTC')::date
    `),
    sql<{ n: number }>(`
      SELECT COUNT(*)::int AS n FROM messages
      WHERE direction = 'inbound' AND msg_type = 'chat'
        AND DATE(created_at::timestamptz) = (NOW() AT TIME ZONE 'UTC')::date
    `),
    sql<{ n: number }>(`
      SELECT COUNT(*)::int AS n FROM messages
      WHERE content_translated IS NOT NULL
        AND DATE(created_at::timestamptz) = (NOW() AT TIME ZONE 'UTC')::date
    `),
    sql<{ total: number; on_app: number }>(`
      SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE on_worker_app = true)::int AS on_app
      FROM workers
      WHERE status = 'active'
    `),
    sql<{ id: number; name: string; avatar_initials: string; avatar_color: string }>(`
      SELECT id, name, avatar_initials, avatar_color
      FROM workers
      WHERE status = 'active'
      ORDER BY name ASC
    `),
    sql<{ n: number }>(`
      SELECT COUNT(*)::int AS n FROM messages
      WHERE msg_type = 'reminder'
        AND DATE(created_at::timestamptz) = ((NOW() AT TIME ZONE 'UTC')::date - INTERVAL '1 day')
    `),
    sql<{ n: number }>(`
      SELECT COUNT(*)::int AS n FROM messages
      WHERE direction = 'inbound' AND msg_type = 'chat'
        AND DATE(created_at::timestamptz) = ((NOW() AT TIME ZONE 'UTC')::date - INTERVAL '1 day')
    `),
    sql<{ n: number }>(`
      SELECT COUNT(*)::int AS n FROM messages
      WHERE content_translated IS NOT NULL
        AND DATE(created_at::timestamptz) = ((NOW() AT TIME ZONE 'UTC')::date - INTERVAL '1 day')
    `),
  ])
  const tomorrowCount       = Number(tomorrowCountRow[0]?.n ?? 0)
  const tomorrowUnassigned  = Number(tomorrowUnassignedRow[0]?.n ?? 0)
  const weekCount           = Number(weekCountRow[0]?.n ?? 0)
  const sentEstimatesCount  = Number(sentEstimatesCountRow[0]?.n ?? 0)
  const estimatesWaiting = {
    count: Number(estimatesWaitingRow[0]?.count ?? 0),
    total_cents: Number(estimatesWaitingRow[0]?.total_cents ?? 0),
    oldest_sent_at: estimatesWaitingRow[0]?.oldest_sent_at ?? null,
  }
  const invoicesUnpaid = {
    count: Number(invoicesUnpaidRow[0]?.count ?? 0),
    total_cents: Number(invoicesUnpaidRow[0]?.total_cents ?? 0),
  }
  const invoicesOverdue = {
    count: Number(invoicesOverdueRow[0]?.count ?? 0),
    total_cents: Number(invoicesOverdueRow[0]?.total_cents ?? 0),
  }
  const showMoneyZone = estimatesWaiting.count > 0 || invoicesUnpaid.count > 0

  const remindersSent         = Number(remindersRow[0]?.n ?? 0)
  const confirmationsCollected = Number(confirmationsRow[0]?.n ?? 0)
  const translationsDone      = Number(translationsRow[0]?.n ?? 0)
  const minutesSavedRaw = remindersSent * 3 + translationsDone * 2 + confirmationsCollected * 1
  const minutesSaved = Math.round(minutesSavedRaw / 5) * 5 // round to nearest 5

  const remindersYday = Number(remindersYdayRow[0]?.n ?? 0)
  const confirmationsYday = Number(confirmationsYdayRow[0]?.n ?? 0)
  const translationsYday = Number(translationsYdayRow[0]?.n ?? 0)
  const minutesSavedYdayRaw = remindersYday * 3 + translationsYday * 2 + confirmationsYday * 1
  const minutesSavedYday = Math.round(minutesSavedYdayRaw / 5) * 5
  const teamTotal = Number(teamRow[0]?.total ?? 0)
  const teamOnApp = Number(teamRow[0]?.on_app ?? 0)
  const teamOnAppPct = teamTotal > 0 ? Math.round((teamOnApp / teamTotal) * 100) : 0

  const confirmedLike = ['confirmed', 'on_way', 'on_site', 'completed']
  const confirmedCount = jobsToday.filter((j: any) => confirmedLike.includes(j.status)).length
  const delayEscCount  = escalations.filter((e: any) => e.esc_type === 'delay').length
  const delayedJobsCount = jobsToday.filter((j: any) => j.status === 'delayed').length
  const overdueTodayCount = delayEscCount + delayedJobsCount
  const attentionCount =
    escalations.length +
    overdueInvoices.length +
    stuckEstimates.length +
    (jobsReadyForInvoice.length > 0 ? 1 : 0) // grouped into a single "ready to invoice" card

  const now = new Date()
  const hour = now.getUTCHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC',
  })
  const attentionText = attentionCount === 0
    ? 'Nothing needs attention'
    : `${attentionCount} item${attentionCount === 1 ? '' : 's'} need attention`

  const needsAttentionEmpty =
    escalations.length === 0 &&
    overdueInvoices.length === 0 &&
    stuckEstimates.length === 0 &&
    jobsReadyForInvoice.length === 0

  // Unified priority score — sort all attention sources into one list.
  type AttentionItem =
    | { kind: 'escalation'; score: number; data: any }
    | { kind: 'invoice'; score: number; data: any }
    | { kind: 'estimate'; score: number; data: any }
    | { kind: 'jobsReady'; score: number; data: any[] }

  function moneyFactor(amountCents: number) {
    return 1 + Math.min(2, amountCents / 100000)
  }

  const attentionItems: AttentionItem[] = []

  for (const e of escalations) {
    const urgency =
      e.esc_type === 'no_response' ? 100 :
      e.esc_type === 'overrun'     ? 80  :
      e.esc_type === 'delay'       ? 60  : 50
    attentionItems.push({ kind: 'escalation', score: urgency * 1, data: e })
  }

  for (const inv of overdueInvoices) {
    const days = daysOverdue(inv.due_date)
    const urgency = Math.min(100, days * 3)
    const score = urgency * moneyFactor(Number(inv.amount_cents ?? 0))
    attentionItems.push({ kind: 'invoice', score, data: inv })
  }

  for (const est of stuckEstimates) {
    const days = daysAgoFromIso(est.sent_at)
    const urgency = Math.min(70, days * 5)
    const score = urgency * moneyFactor(Number(est.amount_cents ?? 0))
    attentionItems.push({ kind: 'estimate', score, data: est })
  }

  if (jobsReadyForInvoice.length > 0) {
    const urgency = 30 * jobsReadyForInvoice.length
    attentionItems.push({ kind: 'jobsReady', score: urgency * 1, data: jobsReadyForInvoice })
  }

  attentionItems.sort((a, b) => b.score - a.score)

  // Shared styles
  const cardBase = {
    background: '#f2ede6',
    border: '1px solid #dedad4',
    borderRadius: 12,
    padding: '18px 20px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 14,
  } as const
  const btnLight = {
    padding: '7px 14px', borderRadius: 7, fontSize: 13, fontWeight: 600,
    background: '#fff', color: '#1a1a18', border: '1px solid #dedad4',
    textDecoration: 'none', display: 'inline-flex', alignItems: 'center', cursor: 'pointer',
  } as const
  const btnDark = {
    padding: '7px 14px', borderRadius: 7, fontSize: 13, fontWeight: 600,
    background: '#1a1a18', color: '#fff', textDecoration: 'none',
    border: 'none', display: 'inline-flex', alignItems: 'center', cursor: 'pointer',
  } as const
  const sectionLabel = {
    fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const,
    letterSpacing: '0.1em', color: '#999990', marginBottom: 12,
  }

  return (
    <>
      <style>{`
        .dash-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 32px;
        }
        @media (min-width: 1024px) {
          .dash-grid {
            grid-template-columns: minmax(0, 62fr) minmax(0, 38fr);
            gap: 32px;
            align-items: start;
          }
          .dash-right {
            position: sticky;
            top: 32px;
          }
        }

        .dash-today-header,
        .dash-today-row {
          display: grid;
          grid-template-columns: 80px 170px 120px 1fr 110px 100px 60px;
        }
        @media (max-width: 768px) {
          .dash-today-header { display: none; }
          .dash-today-row {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
          }
          .dash-today-row > * { white-space: normal !important; }
        }

        .dash-metrics {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }
        @media (max-width: 640px) {
          .dash-metrics { grid-template-columns: repeat(2, 1fr); }
        }

        .dash-money {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        @media (max-width: 768px) {
          .dash-money { grid-template-columns: 1fr; }
        }

        @media (max-width: 640px) {
          .dash-header-row {
            flex-direction: column;
            align-items: flex-start !important;
          }
        }
      `}</style>
      <div style={{ padding: '32px 36px', maxWidth: 1280, paddingBottom: 120 }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{
            display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap',
            marginBottom: 4,
          }}>
            <div style={{ fontSize: 13, color: '#999990' }}>{dateStr}</div>
            <div style={{ fontSize: 11, color: '#999990' }}>
              Updated {String(now.getUTCHours()).padStart(2, '0')}:{String(now.getUTCMinutes()).padStart(2, '0')} UTC
            </div>
          </div>
          <div className="dash-header-row" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}>
            <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', color: '#1a1a18' }}>
              {greeting}, James
            </h1>
            <HeaderNewJobButton workers={workersList} />
          </div>
          <p style={{
            fontSize: 14,
            color: attentionCount === 0 ? '#999990' : '#555550',
            marginTop: 4,
          }}>
            {attentionCount === 0 ? (
              <span>{attentionText}</span>
            ) : (
              <>
                {confirmedCount} of {jobsToday.length} jobs confirmed today ·{' '}
                <span style={{ color: '#7f1d1d', fontWeight: 600 }}>{attentionText}</span>
              </>
            )}
          </p>
        </div>

        <div className="dash-grid">
        <div className="dash-left">

        {/* ZONE 1 — Needs Your Attention */}
        <div style={{ marginBottom: 32 }}>
          <div style={sectionLabel}>Needs your attention</div>

          {needsAttentionEmpty ? (
            <div style={{
              background: '#f2ede6',
              border: '1px solid #dedad4',
              borderRadius: 12,
              padding: '28px 20px',
              textAlign: 'center',
              color: '#555550',
              fontSize: 14,
            }}>
              You&apos;re all caught up. Nice.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {attentionItems.map((item) => {
                if (item.kind === 'escalation') {
                  const e = item.data
                  return (
                    <div key={`esc-${e.id}`} style={cardBase}>
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
                        <a href={`tel:${e.worker_phone}`} style={btnLight}>Call</a>
                        <Link href={`/chat/${e.worker_id}`} style={btnDark}>Message</Link>
                        <EscalationDismiss id={e.id} />
                      </div>
                    </div>
                  )
                }
                if (item.kind === 'invoice') {
                  const inv = item.data
                  return (
                    <div key={`inv-${inv.id}`} style={cardBase}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 8,
                        background: '#fff', border: '1px solid #dedad4',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16, flexShrink: 0,
                      }}>$</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 14, fontWeight: 600 }}>
                            Invoice #{inv.id} — {inv.client_name}
                          </span>
                          <span style={{ fontSize: 12, color: '#7f1d1d', fontWeight: 600, marginLeft: 'auto' }}>
                            {daysOverdue(inv.due_date)} days overdue
                          </span>
                        </div>
                        <p style={{ fontSize: 13.5, color: '#555550', lineHeight: 1.5 }}>
                          {money(inv.amount_cents)} overdue — due {new Date(inv.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        <button type="button" style={btnLight}>View</button>
                        <button type="button" style={btnDark}>Send reminder</button>
                      </div>
                    </div>
                  )
                }
                if (item.kind === 'estimate') {
                  const est = item.data
                  return (
                    <div key={`est-${est.id}`} style={cardBase}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 8,
                        background: '#fff', border: '1px solid #dedad4',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, fontWeight: 700, flexShrink: 0,
                      }}>E</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 14, fontWeight: 600 }}>
                            Estimate #{est.id} — {est.client_name}
                          </span>
                          <span style={{ fontSize: 12, color: '#999990', marginLeft: 'auto' }}>
                            sent {daysAgoFromIso(est.sent_at)} days ago
                          </span>
                        </div>
                        <p style={{ fontSize: 13.5, color: '#555550', lineHeight: 1.5 }}>
                          {money(est.amount_cents)} — no response
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        <button type="button" style={btnDark}>Follow up</button>
                        <button type="button" style={btnLight}>View</button>
                      </div>
                    </div>
                  )
                }
                // jobsReady
                const jobs = item.data
                return (
                  <div key="jobs-ready" style={cardBase}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: '#fff', border: '1px solid #dedad4',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 700, flexShrink: 0,
                    }}>✓</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                        {jobs.length} completed job{jobs.length === 1 ? '' : 's'} ready to invoice
                      </div>
                      <p style={{ fontSize: 13.5, color: '#555550', lineHeight: 1.5 }}>
                        {jobs.slice(0, 4).map((j: any) => j.client_name).join(', ')}
                        {jobs.length > 4 ? ` and ${jobs.length - 4} more` : ''}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button type="button" style={btnDark}>Create invoice</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ZONE 2 — Today */}
        <div style={{ marginBottom: 32 }}>
          <div style={sectionLabel}>Today&apos;s schedule</div>
          <div style={{ fontSize: 13, color: '#555550', marginBottom: 12 }}>
            {jobsToday.length} visit{jobsToday.length === 1 ? '' : 's'} today · {confirmedCount} confirmed ·{' '}
            {overdueTodayCount > 0 ? (
              <span style={{ color: '#7f1d1d', fontWeight: 600 }}>{overdueTodayCount} overdue</span>
            ) : (
              <>{overdueTodayCount} overdue</>
            )}
          </div>

          {jobsToday.length === 0 ? (
            <div style={{
              background: '#f6f5f3',
              border: '1px solid #eeece8',
              borderRadius: 12,
              padding: '28px 24px',
              display: 'flex', alignItems: 'center', gap: 16,
            }}>
              <div style={{ flex: 1, fontSize: 14, color: '#555550' }}>
                No visits today. {sentEstimatesCount} estimate{sentEstimatesCount === 1 ? '' : 's'} awaiting client response — Dispatch can send a follow-up.
              </div>
              <button type="button" style={btnDark}>Follow up</button>
            </div>
          ) : (
            <div style={{ background: '#fff', border: '1px solid #eeece8', borderRadius: 12, overflow: 'hidden' }}>
              {/* Header row */}
              <div className="dash-today-header" style={{
                borderBottom: '1px solid #eeece8', padding: '11px 16px',
              }}>
                {['Time', 'Worker', 'Client', 'Address', 'Type', 'Status', ''].map(h => (
                  <div key={h} style={{
                    fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.07em', color: '#999990',
                  }}>{h}</div>
                ))}
              </div>
              {/* Data rows */}
              {jobsToday.map((j: any, i: number) => (
                <Link key={j.id} href={`/chat/${j.worker_id}`} className="dash-today-row" style={{
                  padding: '12px 16px', textDecoration: 'none', color: 'inherit',
                  borderBottom: i < jobsToday.length - 1 ? '1px solid #eeece8' : 'none',
                  background: i % 2 === 1 ? '#faf9f7' : '#fff',
                  alignItems: 'center',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#555550', whiteSpace: 'nowrap' }}>
                    {fmtTime(j.scheduled_at)}
                  </div>
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
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{j.client_name}</div>
                  <div style={{ fontSize: 12, color: '#555550', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {j.address}
                  </div>
                  <div style={{ fontSize: 12, color: '#555550', whiteSpace: 'nowrap' }}>{j.job_type}</div>
                  <div><StatusBadge status={j.status} /></div>
                  <div style={{
                    fontSize: 12, fontWeight: 500, color: '#555550',
                    padding: '4px 10px', border: '1px solid #dedad4', borderRadius: 6, textAlign: 'center',
                  }}>Chat</div>
                </Link>
              ))}
            </div>
          )}

          {/* Under-table row: tomorrow badge + week link */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 16,
            marginTop: 12, fontSize: 13,
          }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '5px 11px', borderRadius: 100,
              background: '#f2ede6', color: '#555550',
              fontSize: 12, fontWeight: 600,
            }}>
              + Tomorrow: {tomorrowCount} visit{tomorrowCount === 1 ? '' : 's'}
              {tomorrowUnassigned > 0 && (
                <>
                  ,&nbsp;<span style={{ color: '#7f1d1d', fontWeight: 700 }}>{tomorrowUnassigned} unassigned</span>
                </>
              )}
            </span>
            <Link href="/jobs?range=week" style={{
              color: '#1a1a18', textDecoration: 'none', fontWeight: 600,
            }}>
              This week: {weekCount} visit{weekCount === 1 ? '' : 's'} →
            </Link>
          </div>
        </div>

        </div>{/* /dash-left */}
        <div className="dash-right">

        {/* ZONE 3 — Money (conditional) */}
        {showMoneyZone && (
          <div style={{ marginBottom: 32 }}>
            <div style={sectionLabel}>Money</div>
            <div className="dash-money">
              {/* Estimates block */}
              <div style={{
                background: '#fff',
                border: '1px solid #eeece8',
                borderRadius: 12,
                padding: '20px 22px',
              }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.07em', color: '#999990', marginBottom: 8,
                }}>Estimates</div>
                {estimatesWaiting.count > 0 ? (
                  <>
                    <div style={{ fontSize: 14, color: '#1a1a18', lineHeight: 1.5 }}>
                      {estimatesWaiting.count} awaiting client · {money(estimatesWaiting.total_cents)} total
                      {estimatesWaiting.oldest_sent_at
                        ? ` · oldest ${daysAgoFromIso(estimatesWaiting.oldest_sent_at)} days old`
                        : ''}
                    </div>
                    <Link href="/jobs" style={{
                      display: 'inline-block', marginTop: 10,
                      fontSize: 13, fontWeight: 600, color: '#1a1a18', textDecoration: 'none',
                    }}>View estimates →</Link>
                  </>
                ) : (
                  <div style={{ fontSize: 13, color: '#999990' }}>No estimates awaiting.</div>
                )}
              </div>

              {/* Invoices block */}
              <div style={{
                background: '#fff',
                border: '1px solid #eeece8',
                borderRadius: 12,
                padding: '20px 22px',
              }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.07em', color: '#999990', marginBottom: 8,
                }}>Invoices</div>
                {invoicesUnpaid.count > 0 ? (
                  <>
                    <div style={{ fontSize: 14, color: '#1a1a18', lineHeight: 1.5 }}>
                      {invoicesUnpaid.count} unpaid · {money(invoicesUnpaid.total_cents)} total
                    </div>
                    {invoicesOverdue.count > 0 && (
                      <div style={{ fontSize: 14, color: '#7f1d1d', lineHeight: 1.5, marginTop: 2 }}>
                        {invoicesOverdue.count} overdue · {money(invoicesOverdue.total_cents)}
                      </div>
                    )}
                    <Link href="/jobs" style={{
                      display: 'inline-block', marginTop: 10,
                      fontSize: 13, fontWeight: 600, color: '#1a1a18', textDecoration: 'none',
                    }}>View invoices →</Link>
                  </>
                ) : (
                  <div style={{ fontSize: 13, color: '#999990' }}>All invoices paid.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ZONE 4 — Automation — today */}
        <div style={{ marginBottom: 8 }}>
          <div style={sectionLabel}>Automation — today</div>

          {/* 4 metric cubes */}
          <div className="dash-metrics" style={{ marginBottom: 14 }}>
            {([
              { label: 'Reminders sent',          value: remindersSent,          yday: remindersYday,         tip: undefined as string | undefined },
              { label: 'Confirmations collected', value: confirmationsCollected, yday: confirmationsYday,     tip: undefined as string | undefined },
              { label: 'Translations done',       value: translationsDone,       yday: translationsYday,      tip: undefined as string | undefined },
              { label: 'Minutes saved',           value: minutesSaved,           yday: minutesSavedYday,      tip: 'Reminders×3 + Translations×2 + Confirmations×1, rounded to 5 min' },
            ]).map((m) => {
              const delta = m.value - m.yday
              const arrow = delta > 0 ? `↑${delta}` : delta < 0 ? `↓${Math.abs(delta)}` : '—'
              const deltaColor = delta > 0 ? '#1a1a18' : delta < 0 ? '#7f1d1d' : '#999990'
              return (
                <div key={m.label} title={m.tip} style={{
                  background: '#fff',
                  border: '1px solid #eeece8',
                  borderRadius: 12,
                  padding: '20px 20px',
                  cursor: m.tip ? 'help' : 'default',
                }}>
                  <div style={{
                    fontSize: 28, fontWeight: 800, letterSpacing: '-0.04em',
                    color: '#1a1a18', lineHeight: 1, marginBottom: 6,
                  }}>{m.value}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a18' }}>{m.label}</div>
                  <div style={{ fontSize: 11, color: '#999990', marginTop: 2 }}>
                    vs {m.yday} yesterday <span style={{ color: deltaColor, fontWeight: 600 }}>({arrow})</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Team-on-app progress bar */}
          <div>
            <div style={{ fontSize: 12, color: '#555550', marginBottom: 6 }}>
              Team on Worker app: {teamOnAppPct}% ({teamOnApp} of {teamTotal})
            </div>
            <div style={{
              width: '100%',
              height: 6,
              background: '#eeece8',
              borderRadius: 3,
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${teamOnAppPct}%`,
                height: '100%',
                background: '#1a1a18',
              }} />
            </div>
          </div>
        </div>

        </div>{/* /dash-right */}
        </div>{/* /dash-grid */}

      </div>
      <FabNewJob workers={workersList} />
    </>
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
