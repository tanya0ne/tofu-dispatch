import { Pool } from 'pg'

// Singleton pool — reused across hot reloads in dev
const globalForPg = globalThis as unknown as { _pgPool?: Pool }
if (!globalForPg._pgPool) {
  globalForPg._pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  })
}
const pool = globalForPg._pgPool!

// ── Query helpers ─────────────────────────────────────────────────────────────

export async function sql<T = any>(text: string, params?: any[]): Promise<T[]> {
  const res = await pool.query(text, params)
  return res.rows
}

export async function sqlOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const res = await pool.query(text, params)
  return res.rows[0] ?? null
}

// ── Init / seed ───────────────────────────────────────────────────────────────

let _initPromise: Promise<void> | null = null

export function initDb(): Promise<void> {
  if (!_initPromise) _initPromise = _doInit()
  return _initPromise
}

async function _doInit() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS workers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      language TEXT NOT NULL DEFAULT 'en',
      status TEXT NOT NULL DEFAULT 'active',
      avatar_initials TEXT NOT NULL,
      avatar_color TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'Technician'
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id SERIAL PRIMARY KEY,
      worker_id INTEGER NOT NULL REFERENCES workers(id),
      client_name TEXT NOT NULL,
      address TEXT NOT NULL,
      scheduled_at TEXT NOT NULL,
      estimated_duration INTEGER NOT NULL DEFAULT 60,
      status TEXT NOT NULL DEFAULT 'scheduled',
      job_type TEXT NOT NULL DEFAULT 'General',
      instructions TEXT
    );

    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      worker_id INTEGER NOT NULL REFERENCES workers(id),
      job_id INTEGER,
      direction TEXT NOT NULL,
      content TEXT NOT NULL,
      content_translated TEXT,
      created_at TEXT NOT NULL DEFAULT to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      msg_type TEXT NOT NULL DEFAULT 'chat'
    );

    CREATE TABLE IF NOT EXISTS escalations (
      id SERIAL PRIMARY KEY,
      worker_id INTEGER NOT NULL REFERENCES workers(id),
      job_id INTEGER,
      esc_type TEXT NOT NULL,
      description TEXT NOT NULL,
      description_translated TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    );
  `)

  await seedIfEmpty()
}

// ── Seed pools ────────────────────────────────────────────────────────────────

const CLIENTS = [
  'Emily Johnson', 'Robert Chen', 'Linda Marsh', 'James Taylor', 'Maria Santos',
  'Tom Wilson', 'Anna Lee', 'Gary Brown', 'Sophia Chen', 'Michael Brown',
  'Laura Davis', 'Peter Evans', 'Rachel Kim', 'Daniel Garcia', 'Olivia Martinez',
  'Brian Nguyen', 'Chloe Patel', 'Ethan Wright', 'Hannah Rivera', 'Noah Bennett',
  'Grace Foster', 'Lucas Hughes', 'Mia Alvarez', 'Jacob Morales', 'Isabella Reed',
]

const ADDRESSES = [
  '123 Oak St, Austin TX', '456 Maple Ave, Austin TX', '789 Pine Rd, Austin TX',
  '321 Elm St, Austin TX', '654 Cedar Blvd, Austin TX', '987 Birch Ln, Austin TX',
  '159 Willow Way, Austin TX', '753 Spruce St, Austin TX', '246 Aspen Dr, Austin TX',
  '135 Poplar Ct, Austin TX', '864 Hackberry Rd, Austin TX', '579 Magnolia St, Austin TX',
  '211 Sycamore Dr, Austin TX', '488 Redbud Ln, Austin TX', '902 Juniper Ct, Austin TX',
  '337 Mesquite Blvd, Austin TX', '1124 Pecan Grove, Austin TX', '58 Live Oak Rd, Austin TX',
  '1701 Congress Ave, Austin TX', '220 Barton Springs Rd, Austin TX', '4410 Burnet Rd, Austin TX',
  '3350 Lamar Blvd, Austin TX', '75 Riverside Dr, Austin TX', '1900 Rio Grande, Austin TX',
  '606 Guadalupe St, Austin TX',
]

// Per-role: job types + instruction templates
const ROLE_CONFIG: Record<string, { types: string[]; instructions: string[] }> = {
  'HVAC Technician': {
    types: ['HVAC Repair', 'HVAC Service', 'HVAC Install', 'AC Diagnostic', 'Thermostat Setup'],
    instructions: [
      'AC unit not cooling. Check refrigerant levels first.',
      'Annual maintenance. Filter replacement included.',
      'New unit install. Customer needs to be home.',
      'Heater making noise — diagnose and quote.',
      'Install smart thermostat, pair with customer Wi-Fi.',
      'Condenser coils need cleaning, bring brush kit.',
    ],
  },
  'Plumber': {
    types: ['Plumbing Repair', 'Drain Cleaning', 'Water Heater', 'Leak Repair', 'Fixture Install'],
    instructions: [
      'Leaky pipe under kitchen sink.',
      'Clogged main drain. Bring snake tool.',
      'Replace 40-gallon water heater in garage.',
      'Toilet running constantly — replace flapper/valve.',
      'Install new bathroom faucet, customer has part.',
      'Shower low pressure, check cartridge.',
    ],
  },
  'General Contractor': {
    types: ['Inspection', 'Repair', 'Consultation', 'Drywall Patch', 'Door Install'],
    instructions: [
      'Pre-sale home inspection.',
      'Deck repair. Materials already on site.',
      'Kitchen remodel estimate.',
      'Patch drywall in hallway, light texture.',
      'Hang new interior door, shim and trim.',
      'Bathroom tile assessment, photo report to client.',
    ],
  },
  'Cleaner': {
    types: ['Deep Clean', 'Office Clean', 'Move-out Clean', 'Post-Construction', 'Recurring Clean'],
    instructions: [
      'Move-out clean. Pay attention to oven and bathrooms.',
      'Weekly office cleaning. Key under mat.',
      'Post-construction clean, wear mask, lots of dust.',
      'Standard 3-bed deep clean, focus on kitchen.',
      'Recurring bi-weekly, customer has pets.',
      'Airbnb turnover, linens in hall closet.',
    ],
  },
  'Painter': {
    types: ['Interior Paint', 'Exterior Paint', 'Trim & Doors', 'Cabinet Paint', 'Touch-up'],
    instructions: [
      'Living room + hallway. Color: Warm White SW 7012.',
      'Front porch only. Primer first.',
      'Paint trim and baseboards, semi-gloss white.',
      'Kitchen cabinets — sand, prime, 2 coats.',
      'Touch-up in master bedroom, paint in garage.',
      'Accent wall, navy blue, customer to confirm shade.',
    ],
  },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function pickN<T>(arr: T[], n: number): T[] {
  const a = [...arr]
  const out: T[] = []
  for (let i = 0; i < n && a.length; i++) {
    const idx = Math.floor(Math.random() * a.length)
    out.push(a.splice(idx, 1)[0])
  }
  return out
}
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
function isoAt(day: Date, hour: number, minute: number): string {
  const dt = new Date(day)
  dt.setUTCHours(hour, minute, 0, 0)
  return dt.toISOString()
}
function startOfUTCDay(d: Date): Date {
  const x = new Date(d)
  x.setUTCHours(0, 0, 0, 0)
  return x
}

async function seedIfEmpty() {
  // Idempotency: seed ONLY when DB is completely empty.
  // If ANY workers or jobs already exist — do not touch anything.
  const workersCount = await sqlOne<{ n: string }>(`SELECT COUNT(*)::int as n FROM workers`)
  const jobsCount = await sqlOne<{ n: string }>(`SELECT COUNT(*)::int as n FROM jobs`)
  const hasWorkers = workersCount && Number(workersCount.n) > 0
  const hasJobs = jobsCount && Number(jobsCount.n) > 0
  if (hasWorkers || hasJobs) return

  const now = new Date()
  const todayStart = startOfUTCDay(now)

  // Insert workers
  const workers = [
    { name: 'Miguel Rodriguez', phone: '+1-555-0101', lang: 'es', initials: 'MR', color: '#d4cfc8', role: 'HVAC Technician' },
    { name: 'Juan López',       phone: '+1-555-0102', lang: 'es', initials: 'JL', color: '#e8e4de', role: 'Plumber' },
    { name: 'David Kim',        phone: '+1-555-0103', lang: 'en', initials: 'DK', color: '#dedad4', role: 'General Contractor' },
    { name: 'Carlos Herrera',   phone: '+1-555-0104', lang: 'es', initials: 'CH', color: '#cac5be', role: 'Cleaner' },
    { name: 'Sarah Johnson',    phone: '+1-555-0105', lang: 'en', initials: 'SJ', color: '#e2ded8', role: 'Painter' },
  ]
  const wVals = workers.flatMap(w => [w.name, w.phone, w.lang, w.initials, w.color, w.role])
  const wRows = workers.map((_, i) => `($${i*6+1},$${i*6+2},$${i*6+3},'active',$${i*6+4},$${i*6+5},$${i*6+6})`).join(',')
  const workerIds = (await sql<{ id: number }>(
    `INSERT INTO workers (name,phone,language,status,avatar_initials,avatar_color,role) VALUES ${wRows} RETURNING id`,
    wVals
  )).map(r => r.id)

  // Generate jobs for 31 days (today + 30)
  type JobDef = {
    w: number; client: string; addr: string; at: string; dur: number;
    status: string; type: string; inst: string;
    dayOffset: number; // 0 = today, 1 = tomorrow, ...
  }
  const jobDefs: JobDef[] = []

  for (let dayOffset = 0; dayOffset <= 30; dayOffset++) {
    const day = new Date(todayStart)
    day.setUTCDate(day.getUTCDate() + dayOffset)

    const nJobs = randInt(5, 8)

    // Spread jobs across workers + time slots (random worker per job for variety)
    for (let i = 0; i < nJobs; i++) {
      const workerIdx = Math.floor(Math.random() * workers.length)
      const workerId = workerIds[workerIdx]
      const role = workers[workerIdx].role
      const cfg = ROLE_CONFIG[role]

      const hour = randInt(8, 17)
      const minute = pick([0, 15, 30, 45])
      const scheduledAt = isoAt(day, hour, minute)
      const dur = randInt(60, 180)

      // Initial status: depends on day
      let status: string
      if (dayOffset === 0) {
        // Today: align with cron/tick logic at seed time
        const schedMs = new Date(scheduledAt).getTime()
        const endMs = schedMs + dur * 60_000
        const nowMs = now.getTime()
        if (endMs < nowMs) {
          status = Math.random() < 0.85 ? 'completed' : 'delayed'
        } else if (schedMs <= nowMs && nowMs < endMs) {
          status = 'on_site'
        } else if (schedMs < nowMs + 60 * 60_000) {
          status = 'on_way'
        } else {
          status = Math.random() < 0.5 ? 'confirmed' : 'scheduled'
        }
      } else {
        // Future: 50/50 scheduled vs confirmed
        status = Math.random() < 0.5 ? 'scheduled' : 'confirmed'
      }

      jobDefs.push({
        w: workerId,
        client: pick(CLIENTS),
        addr: pick(ADDRESSES),
        at: scheduledAt,
        dur,
        status,
        type: pick(cfg.types),
        inst: pick(cfg.instructions),
        dayOffset,
      })
    }
  }

  // Bulk-insert jobs
  const jVals = jobDefs.flatMap(j => [j.w, j.client, j.addr, j.at, j.dur, j.status, j.type, j.inst])
  const jRows = jobDefs.map((_, i) => `($${i*8+1},$${i*8+2},$${i*8+3},$${i*8+4},$${i*8+5},$${i*8+6},$${i*8+7},$${i*8+8})`).join(',')
  const jobIds = (await sql<{ id: number }>(
    `INSERT INTO jobs (worker_id,client_name,address,scheduled_at,estimated_duration,status,job_type,instructions) VALUES ${jRows} RETURNING id`,
    jVals
  )).map(r => r.id)

  // ── Messages + escalations ONLY for today's jobs ───────────────────────────
  const todayJobs = jobDefs
    .map((j, idx) => ({ ...j, id: jobIds[idx] }))
    .filter(j => j.dayOffset === 0)

  if (todayJobs.length === 0) {
    return
  }

  const ago = (minutes: number) => {
    const dt = new Date(now)
    dt.setUTCMinutes(dt.getUTCMinutes() - minutes)
    return dt.toISOString()
  }

  // Pick a handful of today's jobs to animate with chat/escalations
  const animated = pickN(todayJobs, Math.min(5, todayJobs.length))

  const msgRows: any[][] = []
  const escRows: any[][] = []

  for (const j of animated) {
    const reminderAt = (() => {
      const dt = new Date(j.at); dt.setUTCMinutes(dt.getUTCMinutes() - 60); return dt.toISOString()
    })()

    if (j.status === 'completed') {
      // "Done" messages must come AFTER job end time, not before
      const endMs = new Date(j.at).getTime() + j.dur * 60_000
      const doneMs = Math.min(endMs + 5 * 60_000, now.getTime())
      const doneAt = new Date(doneMs).toISOString()
      const doneReplyAt = new Date(doneMs + 60_000).toISOString()
      msgRows.push([j.w, j.id, 'outbound', `Reminder: ${j.type} at ${j.addr} for ${j.client}. Confirm when on your way.`, null, reminderAt, 'reminder'])
      msgRows.push([j.w, j.id, 'inbound',  'On my way', null, j.at, 'chat'])
      msgRows.push([j.w, j.id, 'outbound', '✓ Status updated. Have a great visit.', null, j.at, 'chat'])
      msgRows.push([j.w, j.id, 'inbound',  'All done, job finished.', null, doneAt, 'chat'])
      msgRows.push([j.w, j.id, 'outbound', '✓ Marked complete. Great work!', null, doneReplyAt, 'chat'])
    } else if (j.status === 'on_site') {
      msgRows.push([j.w, j.id, 'outbound', `Reminder: ${j.type} at ${j.addr} for ${j.client}.`, null, reminderAt, 'reminder'])
      msgRows.push([j.w, j.id, 'inbound',  'Arrived on site', null, ago(20), 'chat'])
      msgRows.push([j.w, j.id, 'outbound', '✓ Marked as on-site. Let me know when done!', null, ago(19), 'chat'])
    } else if (j.status === 'on_way') {
      msgRows.push([j.w, j.id, 'outbound', `Reminder: ${j.type} at ${j.addr} for ${j.client} soon.`, null, reminderAt, 'reminder'])
      msgRows.push([j.w, j.id, 'inbound',  'Heading over now', null, ago(10), 'chat'])
      msgRows.push([j.w, j.id, 'outbound', '✓ On your way — noted!', null, ago(9), 'chat'])
    } else if (j.status === 'delayed') {
      msgRows.push([j.w, j.id, 'outbound', `Reminder: ${j.type} at ${j.addr} for ${j.client}. Confirm when on your way.`, null, reminderAt, 'reminder'])
      msgRows.push([j.w, j.id, 'inbound',  "I'm in traffic, running late", null, ago(40), 'chat'])
      msgRows.push([j.w, j.id, 'outbound', 'Understood. Notified the manager.', null, ago(39), 'chat'])
      escRows.push([j.w, j.id, 'delay', `Worker is running late for ${j.client} at ${j.addr}.`, null, 'pending', ago(38)])
    } else {
      // scheduled / confirmed — just a reminder
      msgRows.push([j.w, j.id, 'outbound', `Reminder: ${j.type} at ${j.addr} for ${j.client} at scheduled time.`, null, reminderAt, 'reminder'])
    }
  }

  // Optional: one "no_response" escalation on a random confirmed/scheduled job for dashboard life
  const silent = todayJobs.find(j => j.status === 'scheduled' || j.status === 'confirmed')
  if (silent) {
    escRows.push([silent.w, silent.id, 'no_response', `No confirmation yet for ${silent.client} at ${silent.addr}. 2 reminders sent.`, null, 'pending', ago(25)])
  }

  if (msgRows.length) {
    const mVals = msgRows.flat()
    const mRowsSql = msgRows.map((_, i) => `($${i*7+1},$${i*7+2},$${i*7+3},$${i*7+4},$${i*7+5},$${i*7+6},$${i*7+7})`).join(',')
    await pool.query(
      `INSERT INTO messages (worker_id,job_id,direction,content,content_translated,created_at,msg_type) VALUES ${mRowsSql}`,
      mVals
    )
  }
  if (escRows.length) {
    const eVals = escRows.flat()
    const eRowsSql = escRows.map((_, i) => `($${i*7+1},$${i*7+2},$${i*7+3},$${i*7+4},$${i*7+5},$${i*7+6},$${i*7+7})`).join(',')
    await pool.query(
      `INSERT INTO escalations (worker_id,job_id,esc_type,description,description_translated,status,created_at) VALUES ${eRowsSql}`,
      eVals
    )
  }
}
