import Link from 'next/link'
import { redirect } from 'next/navigation'
import WizardShell from '@/components/setup/WizardShell'
import SkipButton from '@/components/setup/SkipButton'
import QuickPicks from '@/components/setup/QuickPicks'
import { readState } from '@/lib/setup-state'
import { createVisitAction, skipVisitAction } from '@/lib/setup-actions'
import { btnPrimary, btnSecondary, input, label as labelStyle, fieldGap, buttonRow } from '@/components/setup/WizardButtons'

export const dynamic = 'force-dynamic'

const QUICK_PICKS = ['AC repair', 'AC install', 'Tune-up', 'Diagnostic', 'Maintenance']

export default async function VisitStep({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const state = await readState()
  if (!state.whatsapp.linked) redirect('/setup/whatsapp')

  const sp = await searchParams

  // Default to tomorrow (UTC)
  const tomorrow = new Date()
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  const defaultDate = tomorrow.toISOString().slice(0, 10)
  const defaultTime = '14:00'

  const hasClient = !!state.client.name

  return (
    <WizardShell
      step="visit"
      title="Schedule your first visit"
      intro={`Tomorrow morning the bot will message ${state.worker.name ?? 'your worker'} about this visit. Let's set it up.`}
      help={<>
        <strong>Why tomorrow?</strong> Setting up a concrete visit for tomorrow is how the bot shows its value on Day 1 — you&apos;ll see live updates as {state.worker.name ?? 'the worker'} moves through the day, without calling anyone.
      </>}
    >
      {!hasClient ? (
        <div style={{
          background: '#fff',
          border: '1px solid var(--border-light)',
          borderRadius: 12,
          padding: '22px 18px',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>You need a client first</div>
          <p style={{ fontSize: 13.5, color: 'var(--ink-secondary)', lineHeight: 1.5 }}>
            We can&apos;t create tomorrow&apos;s visit without a client. Go back and add one — it takes 30 seconds.
          </p>
          <div>
            <Link href="/setup/client" style={{ ...btnPrimary, textDecoration: 'none' }}>← Add a client</Link>
          </div>
        </div>
      ) : (
        <form action={createVisitAction} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {sp.error === 'missing' && (
            <ErrorBanner text="Please pick a date, time, and service type." />
          )}
          {sp.error === 'bad_datetime' && (
            <ErrorBanner text="That date/time doesn't look right." />
          )}

          {/* Prefilled client + worker summary */}
          <div style={{
            background: 'var(--bg-warm)',
            borderRadius: 10,
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            fontSize: 13,
          }}>
            <div><span style={{ color: 'var(--ink-tertiary)' }}>Client: </span><strong>{state.client.name}</strong> · {state.client.address}</div>
            <div>
              <span style={{ color: 'var(--ink-tertiary)' }}>Worker: </span>
              <strong>{state.worker.name ?? '—'}</strong>
              {state.worker.skipped && (
                <span style={{ color: '#8b2424', marginLeft: 6 }}> (skipped — will auto-pick the first active worker)</span>
              )}
            </div>
          </div>

          <div style={fieldGap}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle} htmlFor="v-date">Date</label>
                <input id="v-date" name="date" type="date" required defaultValue={defaultDate} style={input} />
              </div>
              <div>
                <label style={labelStyle} htmlFor="v-time">Time</label>
                <input id="v-time" name="time" type="time" required defaultValue={defaultTime} style={input} />
              </div>
            </div>

            <div>
              <label style={labelStyle} htmlFor="v-service">Service type</label>
              <input
                id="v-service" name="service_type" type="text" required
                placeholder="e.g. AC repair"
                defaultValue={state.visit.serviceType ?? 'AC repair'}
                style={input}
              />
              <QuickPicks options={QUICK_PICKS} targetId="v-service" />
            </div>

            <div>
              <label style={labelStyle} htmlFor="v-notes">Notes <span style={{ color: 'var(--ink-tertiary)', fontWeight: 400 }}>(optional)</span></label>
              <textarea
                id="v-notes" name="notes" rows={3}
                placeholder="e.g. Key under doormat. Dog in yard."
                defaultValue={state.visit.notes ?? ''}
                style={{ ...input, resize: 'vertical', paddingTop: 10 }}
              />
            </div>
          </div>

          <div style={buttonRow}>
            <Link href="/setup/client" style={{ ...btnSecondary, textDecoration: 'none' }}>← Back</Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <SkipButton
                warning="Without a visit, tomorrow morning will be quiet for the bot. Skip anyway?"
                action={skipVisitAction}
              />
              <button type="submit" style={btnPrimary}>
                Create visit &amp; finish →
              </button>
            </div>
          </div>
        </form>
      )}
    </WizardShell>
  )
}

function ErrorBanner({ text }: { text: string }) {
  return (
    <div style={{
      fontSize: 13,
      color: '#7f1d1d',
      background: '#fef2f2',
      border: '1px solid #fecaca',
      borderRadius: 8,
      padding: '9px 12px',
    }}>{text}</div>
  )
}
