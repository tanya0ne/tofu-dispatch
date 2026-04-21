'use client'

export default function QuickPicks({
  options,
  targetId,
}: {
  options: string[]
  targetId: string
}) {
  function pick(value: string) {
    const el = document.getElementById(targetId) as HTMLInputElement | null
    if (el) {
      el.value = value
      el.focus()
    }
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
      {options.map(o => (
        <button
          key={o}
          type="button"
          onClick={() => pick(o)}
          style={{
            padding: '6px 12px',
            borderRadius: 999,
            background: '#fff',
            border: '1px solid var(--border)',
            fontSize: 12.5,
            color: 'var(--ink-secondary)',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {o}
        </button>
      ))}
    </div>
  )
}
