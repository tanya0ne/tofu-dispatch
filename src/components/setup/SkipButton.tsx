'use client'

import { useState } from 'react'
import { btnText } from './WizardButtons'

export default function SkipButton({
  warning,
  action,
  label = 'Skip',
}: {
  warning: string
  action: () => Promise<void>
  label?: string
}) {
  const [pending, setPending] = useState(false)

  async function onClick() {
    if (pending) return
    if (!window.confirm(warning)) return
    setPending(true)
    try {
      await action()
    } catch {
      setPending(false)
    }
  }

  return (
    <button type="button" onClick={onClick} disabled={pending} style={btnText}>
      {pending ? '…' : label}
    </button>
  )
}
