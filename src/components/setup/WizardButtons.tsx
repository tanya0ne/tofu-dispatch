import type { CSSProperties } from 'react'

export const btnPrimary: CSSProperties = {
  padding: '11px 18px',
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 600,
  background: 'var(--primary)',
  color: '#fff',
  border: 'none',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  minHeight: 44,
  fontFamily: 'inherit',
}

export const btnSecondary: CSSProperties = {
  padding: '11px 18px',
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 500,
  background: '#fff',
  color: 'var(--ink)',
  border: '1px solid var(--border)',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  minHeight: 44,
  textDecoration: 'none',
  fontFamily: 'inherit',
}

export const btnText: CSSProperties = {
  padding: '11px 14px',
  fontSize: 14,
  fontWeight: 500,
  background: 'transparent',
  color: 'var(--ink-tertiary)',
  border: 'none',
  cursor: 'pointer',
  textDecoration: 'underline',
  textUnderlineOffset: 3,
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: 44,
  fontFamily: 'inherit',
}

export const input: CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: 10,
  border: '1px solid var(--border)',
  fontSize: 15,
  color: 'var(--ink)',
  background: '#fff',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  minHeight: 44,
}

export const label: CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--ink-secondary)',
  marginBottom: 6,
}

export const fieldGap: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
}

export const buttonRow: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 10,
  marginTop: 24,
  flexWrap: 'wrap',
}
