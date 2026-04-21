'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { btnPrimary, btnSecondary } from './WizardButtons'

type Status = 'waiting' | 'detected' | 'linked'

export default function WhatsAppLinker({
  initialLinked,
  initialPhone,
  onSimulateLink,
  onRegenerate,
}: {
  initialLinked: boolean
  initialPhone: string | null
  onSimulateLink: (phone: string) => Promise<void>
  onRegenerate: () => Promise<void>
}) {
  const router = useRouter()
  const [status, setStatus] = useState<Status>(initialLinked ? 'linked' : 'waiting')
  const [phone, setPhone] = useState<string | null>(initialPhone)
  const [busy, setBusy] = useState(false)
  const [showTrouble, setShowTrouble] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(900) // 15 min TTL

  // Countdown
  useEffect(() => {
    if (status === 'linked') return
    const t = setInterval(() => setSecondsLeft(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [status])

  // Poll server for link status (real product uses WebSocket / SSE)
  useEffect(() => {
    if (status === 'linked') return
    const t = setInterval(async () => {
      try {
        const res = await fetch('/api/setup/whatsapp/status', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (data.linked) {
          setStatus('detected')
          setPhone(data.phone)
          setTimeout(() => setStatus('linked'), 900)
          setTimeout(() => router.push('/setup/worker'), 2200)
        }
      } catch {
        // silent — polling will retry
      }
    }, 1800)
    return () => clearInterval(t)
  }, [status, router])

  async function handleFakeScan() {
    if (busy || status === 'linked') return
    setBusy(true)
    const fakePhone = '+1 (512) 555-0188'
    await onSimulateLink(fakePhone)
    setBusy(false)
    // Next poll tick (1.8s) will pick it up. Trigger a manual fetch to speed things up.
    fetch('/api/setup/whatsapp/status', { cache: 'no-store' }).then(r => r.json()).then(data => {
      if (data.linked) {
        setStatus('detected')
        setPhone(data.phone)
        setTimeout(() => setStatus('linked'), 900)
        setTimeout(() => router.push('/setup/worker'), 2200)
      }
    }).catch(() => {})
  }

  async function handleRegenerate() {
    setBusy(true)
    await onRegenerate()
    setSecondsLeft(900)
    setStatus('waiting')
    setBusy(false)
  }

  const expired = secondsLeft === 0 && status !== 'linked'
  const expiringSoon = secondsLeft > 0 && secondsLeft < 120 && status !== 'linked'

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 18,
      padding: '28px 20px',
      background: '#fff',
      border: '1px solid var(--border-light)',
      borderRadius: 16,
    }}>
      {/* QR code (mock visual — 13x13 grid) */}
      <button
        type="button"
        onClick={handleFakeScan}
        disabled={busy || status === 'linked' || expired}
        aria-label="Simulate WhatsApp scan (demo)"
        style={{
          padding: 14,
          border: '1px solid var(--border)',
          borderRadius: 14,
          background: '#fff',
          cursor: busy || status === 'linked' || expired ? 'default' : 'pointer',
          opacity: expired ? 0.35 : 1,
          position: 'relative',
          transition: 'transform 0.12s',
          fontFamily: 'inherit',
        }}
        onMouseDown={e => { if (!(busy || status === 'linked' || expired)) e.currentTarget.style.transform = 'scale(0.98)' }}
        onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
      >
        <QrMock size={168} />
        {expired && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.85)',
            borderRadius: 14,
            fontSize: 13, fontWeight: 600, color: 'var(--ink-secondary)',
          }}>Link expired</div>
        )}
      </button>

      {/* Status pill */}
      <StatusPill status={status} phone={phone} />

      {/* Instructions or action */}
      {status === 'linked' ? (
        <div style={{ fontSize: 13, color: 'var(--ink-tertiary)' }}>
          Taking you to the next step…
        </div>
      ) : expired ? (
        <button type="button" onClick={handleRegenerate} disabled={busy} style={btnPrimary}>
          {busy ? 'Regenerating…' : 'Regenerate link'}
        </button>
      ) : (
        <>
          <p style={{
            fontSize: 13,
            color: 'var(--ink-secondary)',
            textAlign: 'center',
            maxWidth: 340,
            lineHeight: 1.5,
          }}>
            Scan the code with your phone, or tap it to open WhatsApp. You&apos;ll see a prefilled message “Hi” — just send it. We detect the link automatically.
          </p>
          {expiringSoon && (
            <p style={{ fontSize: 12, color: '#8b2424', fontWeight: 500 }}>
              Code expires in {secondsLeft}s.{' '}
              <button onClick={handleRegenerate} style={{
                background: 'none', border: 'none', padding: 0,
                color: '#8b2424', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12,
              }}>Regenerate</button>
            </p>
          )}
          <button
            type="button"
            onClick={handleFakeScan}
            disabled={busy}
            style={{ ...btnSecondary, fontSize: 13 }}
          >
            {busy ? 'Connecting…' : '▸ Demo: simulate scan'}
          </button>
        </>
      )}

      {/* Troubleshoot accordion */}
      {status !== 'linked' && !expired && (
        <div style={{ width: '100%', borderTop: '1px solid var(--border-light)', paddingTop: 14 }}>
          <button
            type="button"
            onClick={() => setShowTrouble(v => !v)}
            style={{
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              color: 'var(--ink-tertiary)', fontSize: 12, fontWeight: 500,
              textDecoration: 'underline', textUnderlineOffset: 3, fontFamily: 'inherit',
            }}
          >
            Didn&apos;t work? Troubleshoot
          </button>
          {showTrouble && (
            <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--ink-secondary)', lineHeight: 1.55 }}>
              Message <strong>+1 (512) 555-0100</strong> from WhatsApp with the word &quot;Hi&quot;. We&apos;ll link automatically within a few seconds.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StatusPill({ status, phone }: { status: Status; phone: string | null }) {
  if (status === 'linked') {
    return (
      <div
        aria-live="polite"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 14px', borderRadius: 999,
          background: 'var(--chip-green-bg)', color: 'var(--chip-green-text)',
          fontSize: 13, fontWeight: 600,
        }}
      >
        <span style={{ fontSize: 14 }}>✓</span>
        Connected{phone ? ` as ${phone}` : ''}
      </div>
    )
  }
  if (status === 'detected') {
    return (
      <div
        aria-live="polite"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 14px', borderRadius: 999,
          background: 'var(--chip-green-bg)', color: 'var(--chip-green-text)',
          fontSize: 13, fontWeight: 600,
        }}
      >
        Got your message!
      </div>
    )
  }
  return (
    <div
      aria-live="polite"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '6px 14px', borderRadius: 999,
        background: 'var(--bg-alt)', color: 'var(--ink-secondary)',
        fontSize: 13, fontWeight: 500,
      }}
    >
      <Spinner />
      Waiting for your &quot;Hi&quot;…
    </div>
  )
}

function Spinner() {
  return (
    <span style={{
      display: 'inline-block',
      width: 11, height: 11,
      border: '2px solid var(--border)',
      borderTopColor: 'var(--ink)',
      borderRadius: '50%',
      animation: 'spin 0.9s linear infinite',
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </span>
  )
}

// Deterministic pseudo-QR visual. Not an actual scannable code — this is a demo.
function QrMock({ size }: { size: number }) {
  const grid = 13
  const cell = size / grid
  const bits: boolean[] = []
  // Deterministic pattern — mix of sines so it looks QR-like
  for (let y = 0; y < grid; y++) {
    for (let x = 0; x < grid; x++) {
      const h = (Math.sin(x * 0.73 + y * 1.31) + Math.cos(x * 1.17 - y * 0.51)) * 0.5
      bits.push(h > 0.05)
    }
  }
  // Force corner markers (typical QR finder patterns)
  for (const [cx, cy] of [[0,0],[grid-3,0],[0,grid-3]]) {
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        bits[(cy+y) * grid + (cx+x)] = true
      }
    }
  }
  return (
    <div style={{
      width: size,
      height: size,
      display: 'grid',
      gridTemplateColumns: `repeat(${grid}, 1fr)`,
      gridTemplateRows: `repeat(${grid}, 1fr)`,
      gap: 1,
      background: '#fff',
    }}>
      {bits.map((b, i) => (
        <div key={i} style={{
          background: b ? '#1a1a18' : '#fff',
          width: cell, height: cell,
        }} />
      ))}
    </div>
  )
}
