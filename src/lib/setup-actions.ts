'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { initDb, sql } from '@/lib/db'
import { patchState, clearState } from '@/lib/setup-state'

// ─── Step 3a — WhatsApp (mocked) ─────────────────────────────────────────────

export async function linkWhatsAppAction(phone?: string) {
  // In the real product this fires on webhook event from WhatsApp Business API.
  // In this demo it's triggered by clicking the QR code.
  await patchState(s => ({
    ...s,
    step: 'worker',
    whatsapp: {
      linked: true,
      phone: phone ?? '+1 (555) 010-0000',
      linkedAt: new Date().toISOString(),
    },
  }))
}

export async function resetWhatsAppAction() {
  await patchState(s => ({
    ...s,
    whatsapp: { linked: false, phone: null, linkedAt: null },
  }))
}

export async function continueAfterWhatsApp() {
  const state = await patchState(s => ({ ...s, step: 'worker' }))
  if (!state.whatsapp.linked) redirect('/setup/whatsapp')
  redirect('/setup/worker')
}

// ─── Step 3b — Worker ────────────────────────────────────────────────────────

const LANG_MAP: Record<string, string> = {
  auto: 'en',
  en: 'en',
  es: 'es',
  pt: 'pt',
}

const AVATAR_COLORS = ['#d4cfc8', '#e8e4de', '#dedad4', '#cac5be', '#e2ded8']

export async function createWorkerAction(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()
  const language = String(formData.get('language') ?? 'auto')

  if (!name || !phone) {
    redirect('/setup/worker?error=missing')
  }

  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map(s => s.charAt(0).toUpperCase())
    .join('') || 'W'

  const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]
  const lang = LANG_MAP[language] ?? 'en'

  await initDb()

  const rows = await sql<{ id: number }>(
    `INSERT INTO workers (name, phone, language, status, avatar_initials, avatar_color, role, on_worker_app)
     VALUES ($1, $2, $3, 'active', $4, $5, 'Technician', false)
     RETURNING id`,
    [name, phone, lang, initials, color]
  )
  const workerId = rows[0].id

  await patchState(s => ({
    ...s,
    step: 'client',
    worker: {
      skipped: false,
      id: workerId,
      name,
      phone,
      language: lang,
    },
  }))

  revalidatePath('/dashboard')
  revalidatePath('/workers')
  redirect('/setup/client')
}

export async function skipWorkerAction() {
  await patchState(s => ({
    ...s,
    step: 'client',
    worker: { skipped: true, id: null, name: null, phone: null, language: null },
  }))
  redirect('/setup/client')
}

// ─── Step 3c — Client ────────────────────────────────────────────────────────

export async function saveClientAction(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim()
  const address = String(formData.get('address') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()

  if (!name || !address) {
    redirect('/setup/client?error=missing')
  }

  await patchState(s => ({
    ...s,
    step: 'visit',
    client: {
      skipped: false,
      name,
      address,
      phone: phone || null,
    },
  }))

  redirect('/setup/visit')
}

export async function skipClientAction() {
  await patchState(s => ({
    ...s,
    step: 'visit',
    client: { skipped: true, name: null, address: null, phone: null },
  }))
  redirect('/setup/visit')
}

// ─── Step 3d — Visit ─────────────────────────────────────────────────────────

export async function createVisitAction(formData: FormData) {
  const dateStr = String(formData.get('date') ?? '').trim()
  const timeStr = String(formData.get('time') ?? '').trim()
  const serviceType = String(formData.get('service_type') ?? '').trim()
  const notes = String(formData.get('notes') ?? '').trim()

  if (!dateStr || !timeStr || !serviceType) {
    redirect('/setup/visit?error=missing')
  }

  // Combine date + time. Treat input as UTC for simplicity (matches seed/demo).
  const iso = new Date(`${dateStr}T${timeStr}:00Z`).toISOString()
  const scheduledDate = new Date(iso)
  if (scheduledDate.toString() === 'Invalid Date') {
    redirect('/setup/visit?error=bad_datetime')
  }

  await initDb()

  // Read current state to know worker_id / client_name / address
  const { readState } = await import('@/lib/setup-state')
  const state = await readState()

  let workerId = state.worker.id
  if (!workerId) {
    // Fallback: pick the first active worker (shouldn't happen if user followed flow)
    const firstWorker = await sql<{ id: number }>(
      `SELECT id FROM workers WHERE status = 'active' ORDER BY id ASC LIMIT 1`
    )
    workerId = firstWorker[0]?.id ?? null
  }

  if (!workerId) {
    redirect('/setup/worker?error=missing')
  }

  const clientName = state.client.name ?? 'New client'
  const address = state.client.address ?? 'Address to be confirmed'

  const rows = await sql<{ id: number }>(
    `INSERT INTO jobs (worker_id, client_name, address, scheduled_at, estimated_duration, status, job_type, instructions)
     VALUES ($1, $2, $3, $4, 60, 'scheduled', $5, $6)
     RETURNING id`,
    [workerId, clientName, address, iso, serviceType, notes || null]
  )
  const jobId = rows[0].id

  await patchState(s => ({
    ...s,
    step: 'done',
    visit: {
      skipped: false,
      jobId,
      scheduledAt: iso,
      serviceType,
      notes: notes || null,
    },
    completed: true,
    completedAt: new Date().toISOString(),
  }))

  revalidatePath('/dashboard')
  revalidatePath('/jobs')
  redirect('/setup/done')
}

export async function skipVisitAction() {
  await patchState(s => ({
    ...s,
    step: 'done',
    visit: { skipped: true, jobId: null, scheduledAt: null, serviceType: null, notes: null },
    completed: true,
    completedAt: new Date().toISOString(),
  }))
  redirect('/setup/done')
}

// ─── Reset (useful during demo / interviews) ────────────────────────────────

export async function resetSetupAction() {
  await clearState()
  redirect('/setup/whatsapp')
}
