'use client'

import { useState, useRef, useEffect } from 'react'
import StatusBadge from './StatusBadge'

interface Message {
  id: number
  worker_id: number
  job_id: number | null
  direction: string
  content: string
  content_translated: string | null
  created_at: string
  msg_type: string
}

interface Job {
  id: number
  client_name: string
  address: string
  scheduled_at: string
  status: string
  job_type: string
}

interface Worker {
  id: number
  name: string
  phone: string
  language: string
  avatar_initials: string
  avatar_color: string
  role: string
}

const QUICK_TEMPLATES = [
  { label: 'Reminder', text: 'Reminder: please confirm your next job.' },
  { label: 'ETA?', text: 'What\'s your estimated arrival time?' },
  { label: 'All good?', text: 'Everything going smoothly?' },
  { label: 'Wrap up', text: 'Please close the job in the system when done.' },
]

// Simulated worker responses per language
const WORKER_RESPONSES: Record<string, string[]> = {
  es: [
    'Sí, voy en camino ahora mismo.',
    'Llegué al lugar, empezando el trabajo.',
    'Trabajo terminado, todo bien.',
    'Hay un pequeño problema, ¿me puede llamar?',
    'Estaré ahí en 20 minutos.',
    'Todo está listo, el cliente está contento.',
  ],
  en: [
    'On my way now, should be there in 15.',
    'Just arrived, starting the job.',
    'All done, job complete!',
    'Running a bit late, about 20 min behind.',
    'Everything looks good here.',
    'Finished up, customer was happy.',
  ],
}

const TRANSLATIONS: Record<string, string> = {
  'Sí, voy en camino ahora mismo.': 'Yes, I\'m on my way right now.',
  'Llegué al lugar, empezando el trabajo.': 'Arrived at the location, starting the job.',
  'Trabajo terminado, todo bien.': 'Job done, all good.',
  'Hay un pequeño problema, ¿me puede llamar?': 'There\'s a small problem, can you call me?',
  'Estaré ahí en 20 minutos.': 'I\'ll be there in 20 minutes.',
  'Todo está listo, el cliente está contento.': 'Everything is ready, the client is happy.',
}

function fmt(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function fmtJob(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

export default function ChatInterface({ worker, initialMessages, todaysJobs }: {
  worker: Worker
  initialMessages: Message[]
  todaysJobs: Job[]
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [simulating, setSimulating] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text: string) {
    if (!text.trim() || sending) return
    setSending(true)
    setInput('')

    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ worker_id: worker.id, content: text, direction: 'outbound' }),
    })
    const msg = await res.json()
    setMessages(prev => [...prev, msg])
    setSending(false)
  }

  async function simulateResponse() {
    if (simulating) return
    setSimulating(true)

    // Show typing indicator
    const fakeId = -1
    const typing: Message = {
      id: fakeId, worker_id: worker.id, job_id: null,
      direction: 'inbound', content: '...', content_translated: null,
      created_at: new Date().toISOString(), msg_type: 'chat',
    }
    setMessages(prev => [...prev, typing])

    await new Promise(r => setTimeout(r, 1400))

    // Pick response
    const pool = WORKER_RESPONSES[worker.language] || WORKER_RESPONSES['en']
    const text = pool[Math.floor(Math.random() * pool.length)]
    const translated = worker.language === 'es' ? TRANSLATIONS[text] || null : null

    setMessages(prev => prev.filter(m => m.id !== fakeId))

    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        worker_id: worker.id,
        content: text,
        content_translated: translated,
        direction: 'inbound',
      }),
    })
    const msg = await res.json()
    setMessages(prev => [...prev, msg])
    setSimulating(false)
  }

  const isTyping = messages[messages.length - 1]?.content === '...' && messages[messages.length - 1]?.id === -1

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

      {/* Chat header */}
      <div style={{
        padding: '14px 20px', background: '#fff', borderBottom: '1px solid #eeece8',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: '50%',
          background: worker.avatar_color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color: '#1a1a18',
        }}>{worker.avatar_initials}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{worker.name}</div>
          <div style={{ fontSize: 12, color: '#999990' }}>
            {worker.role} · {worker.language === 'es' ? '🇲🇽 Spanish' : '🇺🇸 English'} · {worker.phone}
          </div>
        </div>

        {/* Simulate button */}
        <button
          onClick={simulateResponse}
          disabled={simulating}
          style={{
            padding: '7px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 600,
            background: simulating ? '#f6f5f3' : '#f2ede6',
            color: simulating ? '#999990' : '#555550',
            border: '1px solid #dedad4', cursor: simulating ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <span>{simulating ? '⏳' : '💬'}</span>
          {simulating ? 'Worker typing…' : 'Simulate response'}
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 4 }}>

          {messages.map((m, i) => {
            const isOut = m.direction === 'outbound'
            const isTypingMsg = m.id === -1

            return (
              <div key={m.id ?? i} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isOut ? 'flex-end' : 'flex-start',
                marginBottom: 6,
              }}>
                <div style={{
                  maxWidth: '72%',
                  padding: isTypingMsg ? '10px 16px' : '10px 14px',
                  borderRadius: isOut ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: isOut ? '#1a1a18' : '#fff',
                  border: isOut ? 'none' : '1px solid #eeece8',
                  color: isOut ? '#fff' : '#1a1a18',
                  fontSize: 13.5,
                  lineHeight: 1.5,
                }}>
                  {isTypingMsg ? (
                    <span style={{ letterSpacing: 3, fontSize: 18 }}>···</span>
                  ) : m.content}
                </div>

                {/* Translation */}
                {!isTypingMsg && m.content_translated && (
                  <div style={{
                    maxWidth: '72%', marginTop: 3,
                    padding: '5px 10px', borderRadius: 6,
                    background: '#f6f5f3', fontSize: 12, color: '#999990',
                    fontStyle: 'italic',
                  }}>
                    🌐 {m.content_translated}
                  </div>
                )}

                {!isTypingMsg && (
                  <div style={{ fontSize: 10.5, color: '#999990', marginTop: 3, padding: '0 2px' }}>
                    {fmt(m.created_at)} · {isOut ? 'You → Worker' : 'Worker'}
                    {m.msg_type === 'reminder' && ' · Reminder'}
                  </div>
                )}
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {/* Right panel: jobs */}
        <div style={{
          width: 260, borderLeft: '1px solid #eeece8', background: '#faf9f7',
          overflowY: 'auto', padding: '16px',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#999990', marginBottom: 12 }}>
            Today&apos;s jobs
          </div>
          {todaysJobs.length === 0 && (
            <p style={{ fontSize: 12, color: '#999990' }}>No jobs today</p>
          )}
          {todaysJobs.map((j: Job) => (
            <div key={j.id} style={{
              background: '#fff', border: '1px solid #eeece8',
              borderRadius: 10, padding: '12px', marginBottom: 8,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{fmtJob(j.scheduled_at)}</span>
                <StatusBadge status={j.status} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a18', marginBottom: 2 }}>{j.client_name}</div>
              <div style={{ fontSize: 11.5, color: '#999990' }}>{j.job_type}</div>
              <div style={{ fontSize: 11.5, color: '#555550', marginTop: 3 }}>📍 {j.address.split(',')[0]}</div>
            </div>
          ))}

          {/* Quick templates */}
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#999990', marginTop: 16, marginBottom: 10 }}>
            Quick messages
          </div>
          {QUICK_TEMPLATES.map(t => (
            <button key={t.label} onClick={() => sendMessage(t.text)} style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '8px 10px', marginBottom: 6, borderRadius: 8,
              background: '#fff', border: '1px solid #dedad4',
              fontSize: 12, fontWeight: 500, color: '#555550',
              cursor: 'pointer',
            }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div style={{
        padding: '12px 16px', background: '#fff',
        borderTop: '1px solid #eeece8', display: 'flex', gap: 10,
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
          placeholder={`Message ${worker.name.split(' ')[0]} (in English — auto-translated to ${worker.language === 'es' ? 'Spanish' : 'English'})`}
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 8,
            border: '1px solid #dedad4', fontSize: 13.5,
            outline: 'none', background: '#f6f5f3',
            fontFamily: 'Figtree, system-ui, sans-serif',
            color: '#1a1a18',
          }}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={sending || !input.trim()}
          style={{
            padding: '10px 18px', borderRadius: 8, fontSize: 13.5, fontWeight: 600,
            background: sending || !input.trim() ? '#f6f5f3' : '#1a1a18',
            color: sending || !input.trim() ? '#999990' : '#fff',
            border: 'none', cursor: sending || !input.trim() ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s',
          }}
        >
          Send →
        </button>
      </div>
    </div>
  )
}
