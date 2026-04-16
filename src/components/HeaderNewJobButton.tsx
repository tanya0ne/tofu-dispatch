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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          padding: '9px 18px',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          background: '#1a1a18',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        + New Job
      </button>
      <NewJobModal open={open} onClose={() => setOpen(false)} workers={workers} />
    </>
  )
}
