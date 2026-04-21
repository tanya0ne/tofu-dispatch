import Link from 'next/link'
import { redirect } from 'next/navigation'
import WizardShell from '@/components/setup/WizardShell'
import { readState } from '@/lib/setup-state'
import { resetSetupAction } from '@/lib/setup-actions'
import { btnPrimary, btnSecondary } from '@/components/setup/WizardButtons'

export const dynamic = 'force-dynamic'

function fmtDateTime(iso: string) {
  const d = new Date(iso)
  return {
    date: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }),
    time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' }),
  }
}

export default async function DoneStep() {
  const state = await readState()
  if (!state.completed) redirect('/setup')

  const ownerName = 'James' // in production: pulled from Sign-up profile
  const variant: 'full' | 'no-worker' | 'no-visit' =
    state.worker.skipped ? 'no-worker' :
    state.visit.skipped  ? 'no-visit' :
    'full'

  const visitInfo = state.visit.scheduledAt ? fmtDateTime(state.visit.scheduledAt) : null
  const workerName = state.worker.name ?? 'your worker'

  const introFull = (
    <>
      <span>Tomorrow at 6:30am, the bot will message {workerName} their schedule for the day.</span>
      <ul style={{
        margin: '14px 0 14px 18px',
        padding: 0,
        lineHeight: 1.55,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}>
        <li>
          <strong>WhatsApp</strong> — instant pings when {workerName} confirms, arrives, or needs a decision.
        </li>
        <li>
          <strong>Dashboard</strong> — live view of every visit and everyone&apos;s status. This is where you run the day.
        </li>
      </ul>
      <span>The bot handles 80% on its own. You step in only when it asks.</span>
    </>
  )

  const introNoVisit = (
    <>The bot is connected and your dashboard is ready. But there are no visits yet — so tomorrow morning will be quiet.</>
  )

  const introNoWorker = (
    <>Your dashboard is live, but without a worker the bot has nobody to coordinate. Add one when you&apos;re ready — here or straight from WhatsApp.</>
  )

  return (
    <WizardShell
      step="done"
      title={variant === 'full' ? `You're all set, ${ownerName}.` : `You're connected, ${ownerName}.`}
      intro={variant === 'full' ? introFull : variant === 'no-visit' ? introNoVisit : introNoWorker}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {variant === 'full' && state.visit.jobId && (
          <div style={{
            background: '#fff',
            border: '1px solid var(--border-light)',
            borderRadius: 14,
            padding: 18,
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-tertiary)' }}>
              Your tomorrow
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.4 }}>
              🕑 {visitInfo?.time} · {state.client.name} · {state.visit.serviceType}
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--ink-secondary)' }}>
              {state.client.address}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <span style={{ color: 'var(--ink-secondary)' }}>👷 {state.worker.name}</span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '3px 10px', borderRadius: 999,
                background: 'var(--chip-amber-bg)', color: 'var(--chip-amber-text)',
                fontSize: 12, fontWeight: 500,
              }}>
                ⏳ waiting to confirm
              </span>
            </div>
          </div>
        )}

        {variant === 'no-visit' && (
          <div style={{
            background: '#fff',
            border: '1px solid var(--border-light)',
            borderRadius: 14,
            padding: 18,
            fontSize: 13.5,
            color: 'var(--ink-secondary)',
            lineHeight: 1.55,
          }}>
            Add your first visit — either here on the dashboard, or by dictating to the bot:
            <code style={{
              display: 'block',
              marginTop: 10,
              padding: '8px 12px',
              background: 'var(--bg-warm)',
              borderRadius: 8,
              fontSize: 13,
              color: 'var(--ink)',
              fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
            }}>
              &quot;tomorrow 2pm at John Smith&apos;s, AC repair, Carlos&quot;
            </code>
          </div>
        )}

        {/* CTAs — primary depends on variant */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {variant === 'no-worker' ? (
            <>
              <Link href="/setup/worker" style={{ ...btnPrimary, textDecoration: 'none' }}>
                Add worker now →
              </Link>
              <Link href="/dashboard" style={{ ...btnSecondary, textDecoration: 'none' }}>
                Open dashboard
              </Link>
            </>
          ) : (
            <>
              <Link href="/dashboard" style={{ ...btnPrimary, textDecoration: 'none' }}>
                Open dashboard →
              </Link>
              {variant === 'full' && (
                <Link href="/setup/visit" style={{ ...btnSecondary, textDecoration: 'none' }}>
                  Add another visit
                </Link>
              )}
              {variant === 'no-visit' && (
                <Link href="/chat" style={{ ...btnSecondary, textDecoration: 'none' }}>
                  Message the bot
                </Link>
              )}
            </>
          )}
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)' }} />

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 13,
          color: 'var(--ink-secondary)',
          lineHeight: 1.5,
        }}>
          <span style={{
            fontSize: 20,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28, height: 28,
            background: 'var(--bg-warm)',
            borderRadius: 8,
          }}>💬</span>
          <span>
            In production, your WhatsApp would now have a confirmation message from the bot. In this demo, we skip that — but your visit is really saved and shows on the dashboard.
          </span>
        </div>

        {/* Demo reset */}
        <form action={resetSetupAction} style={{ textAlign: 'center', marginTop: 12 }}>
          <button type="submit" style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--ink-tertiary)', fontSize: 12,
            textDecoration: 'underline', textUnderlineOffset: 3,
            fontFamily: 'inherit',
          }}>
            Reset demo and run wizard again
          </button>
        </form>
      </div>
    </WizardShell>
  )
}
