import Link from 'next/link'
import type { SetupStep } from '@/lib/setup-state'

const STEP_ORDER: SetupStep[] = ['whatsapp', 'worker', 'client', 'visit', 'done']

const STEP_LABELS: Record<SetupStep, string> = {
  whatsapp: 'Connect WhatsApp',
  worker:   'Add worker',
  client:   'Add client',
  visit:    'Schedule visit',
  done:     'All set',
}

export default function WizardShell({
  step,
  title,
  intro,
  children,
  demoNote,
  help,
}: {
  step: SetupStep
  title: string
  intro?: React.ReactNode
  children: React.ReactNode
  demoNote?: React.ReactNode
  help?: React.ReactNode
}) {
  const currentIdx = STEP_ORDER.indexOf(step)
  const stepNumber = currentIdx + 1
  const totalSteps = STEP_ORDER.length

  return (
    <div style={{
      width: '100%',
      maxWidth: 560,
      margin: '0 auto',
      padding: '32px 20px 80px',
      display: 'flex',
      flexDirection: 'column',
      gap: 28,
    }}>
      {/* Progress */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}>
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--ink-tertiary)',
          }}>
            Step {stepNumber} of {totalSteps}: {STEP_LABELS[step]}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {STEP_ORDER.map((s, i) => {
            const reached = i <= currentIdx
            return (
              <div key={s} style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                background: reached ? 'var(--ink)' : 'var(--border-light)',
                transition: 'background 0.2s',
              }} />
            )
          })}
        </div>
      </div>

      {/* Demo badge (optional) */}
      {demoNote && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          alignSelf: 'flex-start',
          padding: '6px 12px',
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 500,
          background: 'var(--bg-warm)',
          color: 'var(--ink-secondary)',
        }}>
          <span style={{
            display: 'inline-block',
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--ink-tertiary)',
          }} />
          {demoNote}
        </div>
      )}

      {/* Title + intro */}
      <div>
        <h1 style={{
          fontSize: 30,
          fontWeight: 700,
          letterSpacing: '-0.03em',
          color: 'var(--ink)',
          lineHeight: 1.15,
          marginBottom: intro ? 10 : 0,
        }}>
          {title}
        </h1>
        {intro && (
          <p style={{ fontSize: 15, color: 'var(--ink-secondary)', lineHeight: 1.5 }}>
            {intro}
          </p>
        )}
      </div>

      {/* Step content */}
      <div>{children}</div>

      {/* Help */}
      {help ? (
        <div style={{
          marginTop: 12,
          padding: '14px 16px',
          background: '#fff',
          border: '1px solid var(--border-light)',
          borderRadius: 10,
          fontSize: 13,
          color: 'var(--ink-secondary)',
          lineHeight: 1.5,
        }}>
          {help}
        </div>
      ) : (
        <div style={{ fontSize: 13, color: 'var(--ink-tertiary)', textAlign: 'center' }}>
          Need help? <Link href="/chat" style={{ color: 'var(--ink-secondary)', textDecoration: 'underline', textUnderlineOffset: 3 }}>Message us</Link>
        </div>
      )}
    </div>
  )
}
