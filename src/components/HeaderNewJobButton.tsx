'use client'

import { useState } from 'react'
import NewJobModal from './NewJobModal'

type Worker = {
  id: number
  name: string
  avatar_initials: string
  avatar_color: string
}

export default function HeaderNewJobButton({ workers }: { workers: Worker[] }) {
  const [open, setOpen] = useState(false)

  const primaryStyle: React.CSSProperties = {
    padding: '10px 18px',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    background: 'var(--primary)',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    transition: 'background 0.15s',
  }

  const secondaryStyle: React.CSSProperties = {
    padding: '10px 18px',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    background: '#fff',
    color: 'var(--ink)',
    border: '1px solid var(--border)',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    transition: 'background 0.15s',
  }

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <button type="button" onClick={() => setOpen(true)} style={primaryStyle}>
        Add job
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Create a new estimate"
        style={secondaryStyle}
      >
        Add estimate
      </button>
      <NewJobModal open={open} onClose={() => setOpen(false)} workers={workers} />
    </div>
  )
}
