'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Job {
  id: number
  worker_id: number
  worker_name: string
  avatar_initials: string
  avatar_color: string
  language: string
  client_name: string
  address: string
  job_type: string
  instructions: string | null
  scheduled_at: string
  estimated_duration: number
  status: string
}

type ColumnKey = 'todo' | 'in_progress' | 'done' | 'delayed'

const COLUMNS: { key: ColumnKey; title: string; statuses: string[]; dropStatus: string }[] = [
  { key: 'todo',        title: 'To do',       statuses: ['scheduled', 'confirmed'], dropStatus: 'scheduled' },
  { key: 'in_progress', title: 'In progress', statuses: ['on_way', 'on_site'],      dropStatus: 'on_way' },
  { key: 'done',        title: 'Done',        statuses: ['completed'],              dropStatus: 'completed' },
  { key: 'delayed',     title: 'Delayed',     statuses: ['delayed'],                dropStatus: 'delayed' },
]

const STATUS_COLORS: Record<string, string> = {
  scheduled: '#999990',
  confirmed: '#5b8def',
  on_way:    '#d4a32a',
  on_site:   '#4e9a5a',
  completed: '#8fa690',
  delayed:   '#c54b3c',
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Scheduled',
  confirmed: 'Confirmed',
  on_way:    'On the way',
  on_site:   'On site',
  completed: 'Completed',
  delayed:   'Delayed',
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  const h = String(d.getUTCHours()).padStart(2, '0')
  const m = String(d.getUTCMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

function columnOfStatus(status: string): ColumnKey | null {
  for (const c of COLUMNS) if (c.statuses.includes(status)) return c.key
  return null
}

export default function JobsKanban({ initialJobs }: { initialJobs: Job[] }) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs)
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const [dragOverCol, setDragOverCol] = useState<ColumnKey | null>(null)

  const byColumn: Record<ColumnKey, Job[]> = { todo: [], in_progress: [], done: [], delayed: [] }
  for (const j of jobs) {
    const col = columnOfStatus(j.status)
    if (col) byColumn[col].push(j)
  }

  async function handleDrop(colKey: ColumnKey) {
    const id = draggingId
    setDraggingId(null)
    setDragOverCol(null)
    if (id == null) return

    const job = jobs.find(j => j.id === id)
    if (!job) return

    const column = COLUMNS.find(c => c.key === colKey)!
    if (column.statuses.includes(job.status)) return

    const newStatus = column.dropStatus
    const prevStatus = job.status

    setJobs(prev => prev.map(j => j.id === id ? { ...j, status: newStatus } : j))

    try {
      const res = await fetch(`/api/jobs/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || `HTTP ${res.status}`)
      }
    } catch (err: any) {
      setJobs(prev => prev.map(j => j.id === id ? { ...j, status: prevStatus } : j))
      alert(`Failed to update status: ${err?.message || 'unknown error'}`)
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
      {COLUMNS.map(col => {
        const items = byColumn[col.key]
        const isDragOver = dragOverCol === col.key
        return (
          <div
            key={col.key}
            onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.key) }}
            onDragLeave={(e) => {
              if (e.currentTarget === e.target) setDragOverCol(null)
            }}
            onDrop={(e) => { e.preventDefault(); handleDrop(col.key) }}
            style={{
              background: isDragOver ? '#f2ede6' : '#f6f5f3',
              border: `1px solid ${isDragOver ? '#dedad4' : '#eeece8'}`,
              borderRadius: 12,
              padding: 10,
              minHeight: 200,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              transition: 'background 0.15s, border-color 0.15s',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 6px 8px' }}>
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#555550' }}>
                {col.title}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#999990' }}>{items.length}</span>
            </div>

            {items.length === 0 ? (
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 80,
                color: '#bbb7b0',
                fontSize: 12.5,
                fontStyle: 'italic',
                border: '1px dashed #dedad4',
                borderRadius: 8,
                background: 'transparent',
              }}>
                No jobs
              </div>
            ) : (
              items.map(j => (
                <JobCard
                  key={j.id}
                  job={j}
                  isDragging={draggingId === j.id}
                  onDragStart={() => setDraggingId(j.id)}
                  onDragEnd={() => { setDraggingId(null); setDragOverCol(null) }}
                />
              ))
            )}
          </div>
        )
      })}
    </div>
  )
}

function JobCard({
  job, isDragging, onDragStart, onDragEnd,
}: {
  job: Job
  isDragging: boolean
  onDragStart: () => void
  onDragEnd: () => void
}) {
  const color = STATUS_COLORS[job.status] || '#999990'
  const showSubStatus = job.status === 'on_way' || job.status === 'on_site'

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        onDragStart()
      }}
      onDragEnd={onDragEnd}
      style={{
        background: '#fff',
        border: '1px solid #eeece8',
        borderRadius: 10,
        padding: '10px 12px 10px 14px',
        borderLeft: `3px solid ${color}`,
        cursor: isDragging ? 'grabbing' : 'grab',
        opacity: isDragging ? 0.5 : 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: '#1a1a18', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {job.client_name}
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#555550', flexShrink: 0 }}>
          {fmtTime(job.scheduled_at)}
        </span>
      </div>

      <div style={{ fontSize: 11.5, color: '#777770', lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
        {job.address}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginTop: 2 }}>
        <Link
          href={`/chat/${job.worker_id}`}
          onClick={(e) => e.stopPropagation()}
          onDragStart={(e) => e.preventDefault()}
          style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', color: 'inherit', minWidth: 0 }}
        >
          <span style={{
            width: 22, height: 22, borderRadius: '50%',
            background: job.avatar_color,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 700, color: '#1a1a18', flexShrink: 0,
          }}>{job.avatar_initials}</span>
          <span style={{ fontSize: 11.5, color: '#555550', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {job.worker_name.split(' ')[0]}
          </span>
        </Link>

        {showSubStatus && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, color: '#777770', flexShrink: 0 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
            {STATUS_LABELS[job.status]}
          </span>
        )}
      </div>
    </div>
  )
}
