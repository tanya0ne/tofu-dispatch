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
  const nowMs = now.getTime()
  const nowLabel = now.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC',
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
    background: '#fff',
    border: '1px solid var(--border-light)',
    borderRadius: 12,
    padding: '16px 18px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 14,
  } as const
  const btnLight = {
    padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
    background: '#fff', color: 'var(--ink)', border: '1px solid var(--border)',
    textDecoration: 'none', display: 'inline-flex', alignItems: 'center', cursor: 'pointer',
  } as const
  const btnDark = {
    padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
    background: 'var(--primary)', color: '#fff', textDecoration: 'none',
    border: 'none', display: 'inline-flex', alignItems: 'center', cursor: 'pointer',
  } as const

  return (
    <>
      <style>{`
        .dash-grid {
          display: flex;
          flex-direction: column;
          gap: 32px;
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
      <div style={{ padding: '40px 44px', maxWidth: 960, paddingBottom: 120 }}>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div className="dash-header-row" style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 20,
            flexWrap: 'wrap',
            marginBottom: 8,
          }}>
            <h1 style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-0.035em', color: 'var(--ink)', lineHeight: 1.1 }}>
              {greeting}, James
            </h1>
            <HeaderNewJobButton workers={workersList} />
          </div>
          <p style={{
            fontSize: 15,
            color: attentionCount === 0 ? 'var(--ink-tertiary)' : 'var(--ink-secondary)',
          }}>
            {attentionCount === 0 ? (
              <span>{attentionText}</span>
            ) : (
              <>
                {confirmedCount} of {jobsToday.length} jobs confirmed today ·{' '}
                <span style={{ color: '#8b2424', fontWeight: 600 }}>{attentionText}</span>
              </>
            )}
          </p>
        </div>

        <div className="dash-grid">
        <div className="dash-left">

        {/* ZONE 1 — Needs your decision (show just the top item) */}
        <div style={{ marginBottom: 40 }}>
          {needsAttentionEmpty ? (
            <div style={{
              background: '#fff',
              border: '1px solid var(--border-light)',
              borderRadius: 12,
              padding: '28px 20px',
              textAlign: 'center',
              color: 'var(--ink-secondary)',
              fontSize: 14,
            }}>
              You&apos;re all caught up. Nice.
            </div>
          ) : (() => {
            const topItem = attentionItems[0]
            const inQueue = Math.max(0, attentionCount - 1)

            const renderCard = () => {
              if (topItem.kind === 'escalation') {
                const e = topItem.data
                return (
                  <div style={cardBase}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: e.avatar_color, display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, color: 'var(--ink)', flexShrink: 0,
                    }}>{e.avatar_initials}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{e.worker_name}</span>
                        <StatusBadge status={e.esc_type} />
                        <span style={{ fontSize: 12, color: 'var(--ink-tertiary)', marginLeft: 'auto' }}>{timeAgo(e.created_at)}</span>
                      </div>
                      <p style={{ fontSize: 13.5, color: 'var(--ink-secondary)', lineHeight: 1.5 }}>{e.description}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <a href={`tel:${e.worker_phone}`} style={btnLight}>Call</a>
                      <Link href={`/chat/${e.worker_id}`} style={btnDark}>Message</Link>
                      <EscalationDismiss id={e.id} />
                    </div>
                  </div>
                )
              }
              if (topItem.kind === 'invoice') {
                const inv = topItem.data
                return (
                  <div style={cardBase}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: '#fff', border: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, flexShrink: 0,
                    }}>$</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>
                          Invoice #{inv.id} — {inv.client_name}
                        </span>
                        <span style={{ fontSize: 12, color: '#8b2424', fontWeight: 600, marginLeft: 'auto' }}>
                          {daysOverdue(inv.due_date)} days overdue
                        </span>
                      </div>
                      <p style={{ fontSize: 13.5, color: 'var(--ink-secondary)', lineHeight: 1.5 }}>
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
              if (topItem.kind === 'estimate') {
                const est = topItem.data
                return (
                  <div style={cardBase}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: '#fff', border: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 700, flexShrink: 0,
                    }}>E</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>
                          Estimate #{est.id} — {est.client_name}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--ink-tertiary)', marginLeft: 'auto' }}>
                          sent {daysAgoFromIso(est.sent_at)} days ago
                        </span>
                      </div>
                      <p style={{ fontSize: 13.5, color: 'var(--ink-secondary)', lineHeight: 1.5 }}>
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
              const jobs = topItem.data
              return (
                <div style={cardBase}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: '#fff', border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, flexShrink: 0,
                  }}>✓</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                      {jobs.length} completed job{jobs.length === 1 ? '' : 's'} ready to invoice
                    </div>
                    <p style={{ fontSize: 13.5, color: 'var(--ink-secondary)', lineHeight: 1.5 }}>
                      {jobs.slice(0, 4).map((j: { client_name: string }) => j.client_name).join(', ')}
                      {jobs.length > 4 ? ` and ${jobs.length - 4} more` : ''}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button type="button" style={btnDark}>Create invoice</button>
                  </div>
                </div>
              )
            }

            return (
              <>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  marginBottom: 14,
                  flexWrap: 'wrap',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: 'var(--accent-red-dot)',
                      display: 'inline-block',
                    }} />
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
                      Needs your decision
                    </h2>
                  </div>
                  {inQueue > 0 && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      padding: '4px 12px 4px 10px',
                      borderRadius: 999,
                      background: 'var(--accent-red-pill-bg)',
                      color: 'var(--accent-red-pill-text)',
                      fontSize: 13,
                      fontWeight: 600,
                    }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: 'var(--accent-red-dot)',
                        display: 'inline-block',
                      }} />
                      {inQueue} in queue
                    </span>
                  )}
                </div>
                {renderCard()}
                {inQueue > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <a href="#" style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: 'var(--ink-secondary)',
                      textDecoration: 'underline',
                      textUnderlineOffset: 3,
                    }}>
                      Review all →
                    </a>
                  </div>
                )}
              </>
            )
          })()}
        </div>

        {/* ZONE 2 — Today's visits */}
        <div style={{ marginBottom: 40 }}>
          <div style={{
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
            marginBottom: 6, gap: 12, flexWrap: 'wrap',
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
              Today&apos;s visits
            </h2>
            <div style={{ fontSize: 13, color: 'var(--ink-secondary)' }}>
              {jobsToday.length} visit{jobsToday.length === 1 ? '' : 's'} · {confirmedCount} confirmed
              {overdueTodayCount > 0 && (
                <>
                  {' · '}
                  <span style={{ color: '#8b2424', fontWeight: 600 }}>{overdueTodayCount} overdue</span>
                </>
              )}
            </div>
          </div>

          {jobsToday.length === 0 ? (
            <div style={{
              background: '#fff',
              border: '1px solid var(--border-light)',
              borderRadius: 12,
              padding: '28px 24px',
              display: 'flex', alignItems: 'center', gap: 16,
            }}>
              <div style={{ flex: 1, fontSize: 14, color: 'var(--ink-secondary)' }}>
                No visits today. {sentEstimatesCount} estimate{sentEstimatesCount === 1 ? '' : 's'} awaiting client response — Dispatch can send a follow-up.
              </div>
              <button type="button" style={btnDark}>Follow up</button>
            </div>
          ) : (
            <div style={{
              background: '#fff',
              border: '1px solid var(--border-light)',
              borderRadius: 12,
              overflow: 'hidden',
            }}>
              {(() => {
                let markerInserted = false
                const rows: React.ReactNode[] = []
                jobsToday.forEach((j: any, i: number) => {
                  const jobMs = new Date(j.scheduled_at).getTime()
                  if (!markerInserted && jobMs >= nowMs) {
                    rows.push(
                      <div key="now-marker" style={{
                        position: 'relative',
                        height: 0,
                      }}>
                        <div style={{
                          position: 'absolute',
                          top: -1,
                          left: 20,
                          right: 0,
                          height: 0,
                          borderTop: '1.5px solid var(--now-bg)',
                          zIndex: 1,
                        }} />
                        <div style={{
                          position: 'absolute',
                          top: -11,
                          left: 14,
                          fontSize: 11,
                          fontWeight: 600,
                          color: 'var(--now-text)',
                          background: 'var(--now-bg)',
                          padding: '3px 9px',
                          borderRadius: 999,
                          letterSpacing: '0.01em',
                          zIndex: 2,
                        }}>{nowLabel}</div>
                      </div>
                    )
                    markerInserted = true
                  }
                  rows.push(
                    <Link
                      key={j.id}
                      href={`/chat/${j.worker_id}`}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '96px 1fr auto',
                        gap: 18,
                        alignItems: 'center',
                        padding: '14px 20px',
                        textDecoration: 'none',
                        color: 'inherit',
                        borderBottom: i < jobsToday.length - 1 ? '1px solid var(--border-light)' : 'none',
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-secondary)', whiteSpace: 'nowrap' }}>
                        {fmtTime(j.scheduled_at)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {j.job_type}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--ink-tertiary)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {j.client_name}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <StatusBadge status={j.status} />
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '3px 10px 3px 8px',
                          border: '1px solid var(--border)',
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 500,
                          color: 'var(--ink-secondary)',
                          background: '#fff',
                          whiteSpace: 'nowrap',
                        }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                          </svg>
                          {j.worker_name.split(' ')[0]}
                        </span>
                      </div>
                    </Link>
                  )
                })
                return rows
              })()}
            </div>
          )}

          {/* Under-list row: tomorrow badge + week link */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 16,
            marginTop: 14, fontSize: 13, flexWrap: 'wrap',
          }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '5px 12px', borderRadius: 999,
              background: 'var(--bg-warm)', color: 'var(--ink-secondary)',
              fontSize: 12, fontWeight: 500,
            }}>
              + Tomorrow: {tomorrowCount} visit{tomorrowCount === 1 ? '' : 's'}
              {tomorrowUnassigned > 0 && (
                <>
                  ,&nbsp;<span style={{ color: '#8b2424', fontWeight: 600 }}>{tomorrowUnassigned} unassigned</span>
                </>
              )}
            </span>
            <Link href="/jobs?range=week" style={{
              color: 'var(--ink)', textDecoration: 'none', fontWeight: 500,
            }}>
              This week: {weekCount} visit{weekCount === 1 ? '' : 's'} →
            </Link>
          </div>
        </div>

        </div>{/* /dash-left */}
        <div className="dash-right">

        {/* ZONE 3 — Money (conditional) */}
        {showMoneyZone && (
          <div style={{ marginBottom: 40 }}>
            <h2 style={{
              fontSize: 18, fontWeight: 700, color: 'var(--ink)',
              letterSpacing: '-0.01em', marginBottom: 14,
            }}>Money</h2>
            <div className="dash-money">
              {/* Estimates block */}
              <div style={{
                background: '#fff',
                border: '1px solid var(--border-light)',
                borderRadius: 12,
                padding: '18px 20px',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'var(--bg-alt)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--ink-secondary)', marginBottom: 12,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                </div>
                {estimatesWaiting.count > 0 ? (
                  <>
                    <div style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.45 }}>
                      <strong style={{ fontWeight: 600 }}>{estimatesWaiting.count} awaiting client</strong> · {money(estimatesWaiting.total_cents)} total
                      {estimatesWaiting.oldest_sent_at
                        ? <> · oldest {daysAgoFromIso(estimatesWaiting.oldest_sent_at)} days old</>
                        : null}
                    </div>
                    <Link href="/jobs" style={{
                      display: 'inline-block', marginTop: 12,
                      fontSize: 13, fontWeight: 500, color: 'var(--ink-tertiary)', textDecoration: 'underline', textUnderlineOffset: 3,
                    }}>see pending estimates</Link>
                  </>
                ) : (
                  <div style={{ fontSize: 13, color: '#999990' }}>No estimates awaiting.</div>
                )}
              </div>

              {/* Invoices block */}
              <div style={{
                background: '#fff',
                border: '1px solid var(--border-light)',
                borderRadius: 12,
                padding: '18px 20px',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'var(--bg-alt)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--ink-secondary)', marginBottom: 12,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="6" width="20" height="12" rx="2"/>
                    <circle cx="12" cy="12" r="2"/>
                    <path d="M6 12h.01M18 12h.01"/>
                  </svg>
                </div>
                {invoicesUnpaid.count > 0 ? (
                  <>
                    <div style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.45 }}>
                      <strong style={{ fontWeight: 600 }}>{invoicesUnpaid.count} unpaid</strong> · {money(invoicesUnpaid.total_cents)} total
                    </div>
                    {invoicesOverdue.count > 0 && (
                      <div style={{ fontSize: 13, color: '#8b2424', lineHeight: 1.45, marginTop: 2 }}>
                        {invoicesOverdue.count} overdue · {money(invoicesOverdue.total_cents)}
                      </div>
                    )}
                    <Link href="/jobs" style={{
                      display: 'inline-block', marginTop: 12,
                      fontSize: 13, fontWeight: 500, color: 'var(--ink-tertiary)', textDecoration: 'underline', textUnderlineOffset: 3,
                    }}>see unpaid invoices</Link>
                  </>
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--ink-tertiary)' }}>All invoices paid.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ZONE 4 — Automation — today */}
        <div style={{ marginBottom: 8 }}>
          <h2 style={{
            fontSize: 18, fontWeight: 700, color: 'var(--ink)',
            letterSpacing: '-0.01em', marginBottom: 14,
          }}>Automation — today</h2>

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
              const deltaColor = delta > 0 ? 'var(--ink)' : delta < 0 ? '#8b2424' : 'var(--ink-tertiary)'
              return (
                <div key={m.label} title={m.tip} style={{
                  background: '#fff',
                  border: '1px solid var(--border-light)',
                  borderRadius: 12,
                  padding: '18px 20px',
                  cursor: m.tip ? 'help' : 'default',
                }}>
                  <div style={{
                    fontSize: 28, fontWeight: 700, letterSpacing: '-0.035em',
                    color: 'var(--ink)', lineHeight: 1, marginBottom: 6,
                  }}>{m.value}</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{m.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-tertiary)', marginTop: 2 }}>
                    vs {m.yday} yesterday <span style={{ color: deltaColor, fontWeight: 500 }}>({arrow})</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Team-on-app progress bar */}
          <div>
            <div style={{ fontSize: 12, color: 'var(--ink-secondary)', marginBottom: 6 }}>
              Team on Worker app: {teamOnAppPct}% ({teamOnApp} of {teamTotal})
            </div>
            <div style={{
              width: '100%',
              height: 6,
              background: 'var(--border-light)',
              borderRadius: 3,
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${teamOnAppPct}%`,
                height: '100%',
                background: 'var(--ink)',
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
        padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
        background: '#fff', color: 'var(--ink-secondary)', border: '1px solid var(--border)',
        cursor: 'pointer',
      }}>Dismiss</button>
    </form>
  )
}
