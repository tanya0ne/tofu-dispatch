import { cookies } from 'next/headers'

export type SetupStep = 'whatsapp' | 'worker' | 'client' | 'visit' | 'done'

export type SetupState = {
  step: SetupStep
  whatsapp: {
    linked: boolean
    phone: string | null
    linkedAt: string | null
  }
  worker: {
    skipped: boolean
    id: number | null
    name: string | null
    phone: string | null
    language: string | null
  }
  client: {
    skipped: boolean
    name: string | null
    address: string | null
    phone: string | null
  }
  visit: {
    skipped: boolean
    jobId: number | null
    scheduledAt: string | null
    serviceType: string | null
    notes: string | null
  }
  completed: boolean
  completedAt: string | null
}

export const COOKIE_NAME = 'setup_state'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export function emptyState(): SetupState {
  return {
    step: 'whatsapp',
    whatsapp: { linked: false, phone: null, linkedAt: null },
    worker: { skipped: false, id: null, name: null, phone: null, language: null },
    client: { skipped: false, name: null, address: null, phone: null },
    visit: { skipped: false, jobId: null, scheduledAt: null, serviceType: null, notes: null },
    completed: false,
    completedAt: null,
  }
}

export async function readState(): Promise<SetupState> {
  const store = await cookies()
  const raw = store.get(COOKIE_NAME)?.value
  if (!raw) return emptyState()
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<SetupState>
    return { ...emptyState(), ...parsed }
  } catch {
    return emptyState()
  }
}

export async function writeState(state: SetupState): Promise<void> {
  const store = await cookies()
  store.set(COOKIE_NAME, encodeURIComponent(JSON.stringify(state)), {
    path: '/',
    maxAge: COOKIE_MAX_AGE,
    sameSite: 'lax',
    httpOnly: false, // client-side polling needs to read link status change; not security-critical (demo)
  })
}

export async function patchState(patch: (s: SetupState) => SetupState): Promise<SetupState> {
  const current = await readState()
  const next = patch(current)
  await writeState(next)
  return next
}

export async function clearState(): Promise<void> {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}

/** Decide the next step for redirect after a partial state. */
export function firstUnfinishedStep(s: SetupState): SetupStep {
  if (s.completed) return 'done'
  if (!s.whatsapp.linked) return 'whatsapp'
  if (!s.worker.skipped && !s.worker.id) return 'worker'
  if (!s.client.skipped && !s.client.name) return 'client'
  if (!s.visit.skipped && !s.visit.jobId) return 'visit'
  return 'done'
}
