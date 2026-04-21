import { redirect } from 'next/navigation'
import { readState, firstUnfinishedStep } from '@/lib/setup-state'

export const dynamic = 'force-dynamic'

export default async function SetupIndex() {
  const state = await readState()
  const step = firstUnfinishedStep(state)
  redirect(`/setup/${step}`)
}
