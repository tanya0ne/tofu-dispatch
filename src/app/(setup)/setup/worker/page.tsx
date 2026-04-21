import Link from 'next/link'
import WizardShell from '@/components/setup/WizardShell'
import SkipButton from '@/components/setup/SkipButton'
import { readState } from '@/lib/setup-state'
import { createWorkerAction, skipWorkerAction } from '@/lib/setup-actions'
import { btnPrimary, btnSecondary, input, label as labelStyle, fieldGap, buttonRow } from '@/components/setup/WizardButtons'

export const dynamic = 'force-dynamic'

export default async function WorkerStep({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const state = await readState()
  if (!state.whatsapp.linked) {
    // Can't enter this step without linked WhatsApp
    const { redirect } = await import('next/navigation')
    redirect('/setup/whatsapp')
  }
  const sp = await searchParams

  return (
    <WizardShell
      step="worker"
      title="Add one worker to start"
      intro="Pick the worker you want to test with first. You can add the rest of your team later."
      help={<>
        <strong>Tip — first message to your tech:</strong><br/>
        &quot;Bro, we&apos;re using this thing so I stop bugging you with texts. Just tap the link 👇&quot;
      </>}
    >
      <form action={createWorkerAction} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {sp.error === 'missing' && (
          <ErrorBanner text="Please fill in name and WhatsApp number." />
        )}

        <div style={fieldGap}>
          <div>
            <label style={labelStyle} htmlFor="w-name">Worker name</label>
            <input
              id="w-name" name="name" type="text" required
              placeholder="e.g. Carlos"
              defaultValue={state.worker.name ?? ''}
              style={input}
            />
          </div>

          <div>
            <label style={labelStyle} htmlFor="w-phone">WhatsApp number</label>
            <input
              id="w-phone" name="phone" type="tel" required
              placeholder="+1 555 123 4567"
              defaultValue={state.worker.phone ?? ''}
              style={input}
            />
          </div>

          <div>
            <label style={labelStyle} htmlFor="w-lang">Language they prefer</label>
            <select id="w-lang" name="language" defaultValue={state.worker.language ?? 'auto'} style={input}>
              <option value="auto">Auto-detect</option>
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="pt">Portuguese</option>
            </select>
          </div>
        </div>

        <div style={buttonRow}>
          <Link href="/setup/whatsapp" style={{ ...btnSecondary, textDecoration: 'none' }}>← Back</Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <SkipButton
              warning="Without a worker the bot has nobody to message. Continue anyway?"
              action={skipWorkerAction}
            />
            <button type="submit" style={btnPrimary}>
              Send invite &amp; next →
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
