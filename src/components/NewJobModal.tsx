'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type Worker = {
  id: number
  name: string
  avatar_initials: string
  avatar_color: string
}

export default function NewJobModal({
  open,
  onClose,
  workers,
}: {
  open: boolean
  onClose: () => void
  workers: Worker[]
}) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [workerId, setWorkerId] = useState<number | ''>(workers[0]?.id ?? '')
  const [clientName, setClientName] = useState('')
  const [address, setAddress] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [duration, setDuration] = useState(60)
  const [jobType, setJobType] = useState('General')
  const [instructions, setInstructions] = useState('')

  function resetForm() {
    setWorkerId(workers[0]?.id ?? '')
    setClientName('')
    setAddress('')
    setScheduledAt('')
    setDuration(60)
    setJobType('General')
    setInstructions('')
    setError(null)
  }

  function close() {
    onClose()
    resetForm()
  }

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!workerId || !clientName.trim() || !address.trim() || !scheduledAt || !jobType.trim()) {
      setError('Please fill in all required fields.')
      return
    }

    setSubmitting(true)
    try {
      const iso = new Date(scheduledAt).toISOString()
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          worker_id: Number(workerId),
          client_name: clientName.trim(),
          address: address.trim(),
          scheduled_at: iso,
          estimated_duration: Number(duration),
          job_type: jobType.trim(),
          instructions: instructions.trim() || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.error ?? 'Failed to create job.')
        setSubmitting(false)
        return
      }
      close()
      router.refresh()
    } catch {
      setError('Network error. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    borderRadius: 8,
    border: '1px solid #dedad4',
    fontSize: 14,
    color: '#1a1a18',
    background: '#fff',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: '#555550',
    marginBottom: 4,
  }

  return (
    <div
      onClick={close}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.3)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 14,
          padding: 28,
          maxWidth: 500,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
        }}
      >
        <h2 style={{
          fontSize: 20,
          fontWeight: 700,
          color: '#1a1a18',
          marginBottom: 18,
          letterSpacing: '-0.02em',
        }}>New job</h2>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle} htmlFor="njm-worker">Worker</label>
            <select
              id="njm-worker"
              value={workerId}
              onChange={(e) => setWorkerId(e.target.value ? Number(e.target.value) : '')}
              style={inputStyle}
              required
            >
              {workers.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle} htmlFor="njm-client">Client name</label>
            <input
              id="njm-client"
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              style={inputStyle}
              required
            />
          </div>

          <div>
            <label style={labelStyle} htmlFor="njm-address">Address</label>
            <input
              id="njm-address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              style={inputStyle}
              required
            />
          </div>

          <div>
            <label style={labelStyle} htmlFor="njm-when">Scheduled at</label>
            <input
              id="njm-when"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              style={inputStyle}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle} htmlFor="njm-duration">Duration (min)</label>
              <input
                id="njm-duration"
                type="number"
                min={15}
                max={600}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label style={labelStyle} htmlFor="njm-type">Job type</label>
              <input
                id="njm-type"
                type="text"
                value={jobType}
                onChange={(e) => setJobType(e.target.value)}
                style={inputStyle}
                required
              />
            </div>
          </div>

          <div>
            <label style={labelStyle} htmlFor="njm-instr">Instructions</label>
            <textarea
              id="njm-instr"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
              maxLength={2000}
            />
          </div>

          {error && (
            <div style={{
              fontSize: 13,
              color: '#7f1d1d',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 8,
              padding: '8px 12px',
            }}>{error}</div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
            <button
              type="button"
              onClick={close}
              disabled={submitting}
              style={{
                padding: '9px 16px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                background: '#fff',
                color: '#1a1a18',
                border: '1px solid #dedad4',
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >Cancel</button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '9px 18px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                background: submitting ? '#555550' : '#1a1a18',
                color: '#fff',
                border: 'none',
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >{submitting ? 'Creating…' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
