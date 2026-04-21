import Link from 'next/link'
import WizardShell from '@/components/setup/WizardShell'
import SkipButton from '@/components/setup/SkipButton'
import { readState } from '@/lib/setup-state'
import { saveClientAction, skipClientAction } from '@/lib/setup-actions'
import { btnPrimary, btnSecondary, input, label as labelStyle, fieldGap, buttonRow } from '@/components/setup/WizardButtons'

export const dynamic = 'force-dynamic'

export default async function ClientStep({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const state = await readState()
  if (!state.whatsapp.linked) {
    const { redirect } = await import('next/navigation')
    redirect('/setup/whatsapp')
  }
  const sp = await searchParams

  return (
    <WizardShell
      step="client"
      title="Add your first client"
      intro="Pick the client you have a visit with tomorrow. You'll add the rest as you go."
      help={<>
        <strong>Why we need the address:</strong> the bot uses it so workers can&apos;t accidentally mark themselves on-site from the wrong place. Tomorrow-morning reminders also include the address.
      </>}
    >
      <form action={saveClientAction} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {sp.error === 'missing' && (
          <ErrorBanner text="Please fill in client name and service address." />
        )}

        <div style={fieldGap}>
          <div>
            <label style={labelStyle} htmlFor="c-name">Client name</label>
            <input
              id="c-name" name="name" type="text" required
              placeholder="e.g. John Smith"
              defaultValue={state.client.name ?? ''}
              style={input}
            />
          </div>

          <div>
            <label style={labelStyle} htmlFor="c-address">Service address</label>
            <input
              id="c-address" name="address" type="text" required
              placeholder="123 Oak St, Austin TX"
              defaultValue={state.client.address ?? ''}
              style={input}
            />
            <p style={{ fontSize: 12, color: 'var(--ink-tertiary)', marginTop: 6 }}>
              Demo — full address autocomplete via Google Places is part of the real product.
            </p>
          </div>

          <div>
            <label style={labelStyle} htmlFor="c-phone">Phone <span style={{ color: 'var(--ink-tertiary)', fontWeight: 400 }}>(optional)</span></label>
            <input
              id="c-phone" name="phone" type="tel"
              placeholder="+1 555 987 6543"
              defaultValue={state.client.phone ?? ''}
              style={input}
            />
          </div>
        </div>

        <div style={buttonRow}>
          <Link href="/setup/worker" style={{ ...btnSecondary, textDecoration: 'none' }}>← Back</Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <SkipButton
              warning="Without a client you can't schedule tomorrow's visit. Skip anyway?"
              action={skipClientAction}
            />
            <button type="submit" style={btnPrimary}>
              Next →
            </button>
          </div>
        </div>
      </form>
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
