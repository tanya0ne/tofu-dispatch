'use client'

import { useState } from 'react'
import Link from 'next/link'
import StatusBadge from './StatusBadge'

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

function fmt(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

const STATUS_ORDER = ['on_site', 'on_way', 'delayed', 'confirmed', 'scheduled', 'completed', 'cancelled']

export default function JobsList({ jobs }: { jobs: Job[] }) {
  const [activeFilter, setActiveFilter] = useState<string | null>(null)

  const byStatus: Record<string, number> = {}
  for (const j of jobs) byStatus[j.status] = (byStatus[j.status] || 0) + 1

  const sorted = [...jobs].sort((a, b) =>
    STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
  )

  const filtered = activeFilter
    ? sorted.filter(j => j.status === activeFilter)
    : sorted

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {Object.entries(byStatus).map(([s, n]) => {
          const isActive = activeFilter === s
          return (
            <button
              key={s}
              onClick={() => setActiveFilter(isActive ? null : s)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '4px 12px', borderRadius: 100,
                border: '1px solid #eeece8',
                background: isActive ? '#1a1a18' : '#fff',
                color: isActive ? '#fff' : '#555550',
                fontSize: 12, fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <StatusBadge status={s} />
              <span style={{ marginLeft: 4 }}>{n}</span>
            </button>
          )
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map((j) => (
          <div key={j.id} style={{
            background: '#fff',
            border: '1px solid #eeece8',
            borderRadius: 12,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 16,
          }}>
            <div style={{ width: 68, flexShrink: 0, textAlign: 'right' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a18' }}>{fmt(j.scheduled_at)}</div>
              <div style={{ fontSize: 11, color: '#999990' }}>{j.estimated_duration}min</div>
            </div>

            <div style={{ width: 1, background: '#eeece8', alignSelf: 'stretch', flexShrink: 0 }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: 140, flexShrink: 0 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: j.avatar_color, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, flexShrink: 0,
              }}>{j.avatar_initials}</div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.2 }}>{j.worker_name.split(' ')[0]}</div>
                <div style={{ fontSize: 10.5, color: '#999990' }}>{j.language === 'es' ? '🇲🇽 ES' : '🇺🇸 EN'}</div>
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{j.client_name}</span>
                <span style={{ fontSize: 11.5, color: '#999990', fontWeight: 500 }}>· {j.job_type}</span>
              </div>
              <div style={{ fontSize: 12.5, color: '#555550', marginBottom: 4 }}>📍 {j.address}</div>
              {j.instructions && (
                <div style={{ fontSize: 12, color: '#999990', fontStyle: 'italic', lineHeight: 1.4 }}>
                  {j.instructions.length > 80 ? j.instructions.slice(0, 80) + '…' : j.instructions}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
              <StatusBadge status={j.status} />
              {j.status === 'delayed' && (
                <button
                  onClick={() => alert(`Client ${j.client_name} notified about the delay`)}
                  style={{
                    fontSize: 11, fontWeight: 600, color: '#78350f',
                    background: '#fef3c7', border: '1px solid #fde68a',
                    borderRadius: 6, padding: '3px 8px', cursor: 'pointer',
                  }}
                >
                  Notify client
                </button>
              )}
              <Link href={`/chat/${j.worker_id}`} style={{
                fontSize: 12, fontWeight: 500, color: '#555550',
                textDecoration: 'none', padding: '4px 10px',
                border: '1px solid #dedad4', borderRadius: 6,
              }}>Chat →</Link>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
