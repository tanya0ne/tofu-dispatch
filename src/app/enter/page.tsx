'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

function EnterForm() {
  const [code, setCode] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()
  const next = searchParams.get('next') || '/dashboard'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(false)

    const res = await fetch('/api/enter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })

    if (res.ok) {
      router.replace(next)
    } else {
      setError(true)
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#f2ede6', fontFamily: "'Figtree', system-ui, sans-serif",
    }}>
      <div style={{
        background: '#fff', border: '1px solid #dedad4', borderRadius: 16,
        padding: '40px 36px', width: '100%', maxWidth: 360,
        boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
      }}>
        {/* Logo */}
        <div style={{ marginBottom: 28 }}>
          <svg width="52" height="12" viewBox="0 0 85 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M24.041 20H18.3262V9.75488L8.08105 20H0L14.2861 5.71387H4.04102V0H24.041V20ZM50.0166 2.38379C51.5878 2.38386 52.974 2.71928 54.1738 3.39062C55.3736 4.04775 56.3173 4.96249 57.0029 6.13379C57.6884 7.29077 58.0312 8.62665 58.0312 10.1406C58.0312 11.6403 57.6884 12.9762 57.0029 14.1475C56.3316 15.3045 55.3951 16.2192 54.1953 16.8906C52.9954 17.5477 51.6165 17.8759 50.0596 17.876C48.4883 17.876 47.095 17.5476 45.8809 16.8906C44.681 16.2193 43.7384 15.3044 43.0527 14.1475C42.3671 12.9761 42.0244 11.6405 42.0244 10.1406C42.0244 8.62641 42.3671 7.29089 43.0527 6.13379C43.7384 4.9625 44.681 4.04773 45.8809 3.39062C47.0807 2.71935 48.4597 2.38382 50.0166 2.38379ZM75.6953 11.8115C75.6954 12.3113 75.7953 12.7397 75.9951 13.0967C76.1951 13.4537 76.474 13.7255 76.8311 13.9111C77.2023 14.0967 77.6452 14.1894 78.1592 14.1895C78.6733 14.1894 79.117 14.0968 79.4883 13.9111C79.8594 13.7254 80.1386 13.4536 80.3242 13.0967C80.524 12.7397 80.624 12.3111 80.624 11.8115V2.61816H84.5879V11.8115C84.5878 13.0685 84.3306 14.1542 83.8164 15.0684C83.3022 15.9682 82.5591 16.6618 81.5879 17.1475C80.6309 17.633 79.473 17.8759 78.1162 17.876C76.7883 17.8759 75.6453 17.6328 74.6885 17.1475C73.7314 16.6618 72.9948 15.9682 72.4805 15.0684C71.9806 14.1542 71.7315 13.0684 71.7314 11.8115V2.61816H75.6953V11.8115ZM41.1172 6.26172H36.8965V17.6182H32.9316V6.26172H28.6895V2.61816H41.1172V6.26172ZM70.1143 6.26172H63.8145V8.44727H68.7432V12.0898H63.8145V17.6182H59.8496V2.61816H70.1143V6.26172ZM50.0166 6.02637C49.2599 6.0264 48.5812 6.20473 47.9814 6.56152C47.3958 6.90435 46.9307 7.39104 46.5879 8.01953C46.2595 8.63371 46.0957 9.34081 46.0957 10.1406C46.0957 10.9404 46.2667 11.6475 46.6094 12.2617C46.9522 12.8759 47.4173 13.3617 48.0029 13.7188C48.6028 14.0614 49.2884 14.2334 50.0596 14.2334C50.8308 14.2333 51.5101 14.0615 52.0957 13.7188C52.6811 13.3617 53.1384 12.8757 53.4668 12.2617C53.7952 11.6476 53.9599 10.9404 53.96 10.1406C53.96 9.34086 53.788 8.63369 53.4453 8.01953C53.1168 7.3911 52.6525 6.90437 52.0527 6.56152C51.4672 6.20447 50.7878 6.02644 50.0166 6.02637Z" fill="#1a1a18"/>
          </svg>
          <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 600, color: '#555550', verticalAlign: 'middle' }}>Dispatch</span>
        </div>

        <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: '#1a1a18', marginBottom: 6 }}>
          Enter access code
        </h1>
        <p style={{ fontSize: 13.5, color: '#999990', marginBottom: 24 }}>
          This is a private demo. Enter the code to continue.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="Access code"
            autoFocus
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 8,
              border: `1px solid ${error ? '#fca5a5' : '#dedad4'}`,
              background: error ? '#fff5f5' : '#fff',
              fontSize: 15, color: '#1a1a18', outline: 'none',
              marginBottom: 10, boxSizing: 'border-box',
              fontFamily: 'inherit',
            }}
          />
          {error && (
            <p style={{ fontSize: 13, color: '#ef4444', marginBottom: 10 }}>
              Incorrect code. Try again.
            </p>
          )}
          <button
            type="submit"
            disabled={loading || !code}
            style={{
              width: '100%', padding: '11px 0', borderRadius: 8,
              background: loading || !code ? '#e8e4de' : '#1a1a18',
              color: loading || !code ? '#999990' : '#fff',
              fontSize: 14, fontWeight: 600, border: 'none',
              cursor: loading || !code ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {loading ? 'Checking…' : 'Continue →'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function EnterPage() {
  return (
    <Suspense>
      <EnterForm />
    </Suspense>
  )
}
