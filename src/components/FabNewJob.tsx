'use client'

import { useState } from 'react'
import NewJobModal from './NewJobModal'

type Worker = {
  id: number
  name: string
  avatar_initials: string
  avatar_color: string
}

export default function FabNewJob({ workers }: { workers: Worker[] }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Create new job"
        className="fab-new-job"
        style={{
          position: 'fixed',
          bottom: 32,
          right: 32,
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'rgba(26,26,24,0.85)',
          color: '#fff',
          fontSize: 24,
          fontWeight: 400,
          lineHeight: 1,
          cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
          border: 'none',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.15s ease',
        }}
      >
        +
      </button>
      <NewJobModal open={open} onClose={() => setOpen(false)} workers={workers} />
    </>
  )
}
