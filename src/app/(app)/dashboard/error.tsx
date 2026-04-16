'use client'

import { useEffect } from 'react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <div style={{
      padding: '64px 36px',
      maxWidth: 640,
      margin: '0 auto',
      textAlign: 'center',
    }}>
      <h1 style={{
        fontSize: 22,
        fontWeight: 700,
        color: '#1a1a18',
        letterSpacing: '-0.02em',
        marginBottom: 10,
      }}>
        Couldn&apos;t load dashboard data.
      </h1>
      <p style={{ fontSize: 14, color: '#555550', marginBottom: 22 }}>
        Try refreshing. If the problem persists, check your connection.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        style={{
          padding: '10px 22px',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          background: '#1a1a18',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        Try again
      </button>
    </div>
  )
}
