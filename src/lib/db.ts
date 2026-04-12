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

async function seedIfEmpty() {
  const today = new Date().toISOString().slice(0, 10)

  // If we already have jobs for today — skip
  const existing = await sqlOne<{ n: string }>(
    `SELECT COUNT(*)::int as n FROM jobs WHERE scheduled_at LIKE $1`,
    [`${today}%`]
  )
  if (existing && Number(existing.n) > 0) return

  // Clear stale data from previous days and re-seed with today's dates
  await pool.query('TRUNCATE workers, jobs, messages, escalations RESTART IDENTITY CASCADE')

  const now = new Date()
  const d = (h: number, m = 0) => {
    const dt = new Date(now)
    dt.setHours(h, m, 0, 0)
    return dt.toISOString()
  }
  const ago = (minutes: number) => {
    const dt = new Date(now)
    dt.setMinutes(dt.getMinutes() - minutes)
    return dt.toISOString()
  }

  const workers = [
    { name: 'Miguel Rodriguez', phone: '+1-555-0101', lang: 'es', initials: 'MR', color: '#d4cfc8', role: 'HVAC Technician' },
    { name: 'Juan López',       phone: '+1-555-0102', lang: 'es', initials: 'JL', color: '#e8e4de', role: 'Plumber' },
    { name: 'David Kim',        phone: '+1-555-0103', lang: 'en', initials: 'DK', color: '#dedad4', role: 'General Contractor' },
    { name: 'Carlos Herrera',   phone: '+1-555-0104', lang: 'es', initials: 'CH', color: '#cac5be', role: 'Cleaner' },
    { name: 'Sarah Johnson',    phone: '+1-555-0105', lang: 'en', initials: 'SJ', color: '#e2ded8', role: 'Painter' },
  ]

  // Insert all workers in one query
  const wVals = workers.flatMap((w, i) => [w.name, w.phone, w.lang, w.initials, w.color, w.role])
  const wRows = workers.map((_, i) => `($${i*6+1},$${i*6+2},$${i*6+3},'active',$${i*6+4},$${i*6+5},$${i*6+6})`).join(',')
  const workerIds = (await sql<{ id: number }>(
    `INSERT INTO workers (name,phone,language,status,avatar_initials,avatar_color,role) VALUES ${wRows} RETURNING id`,
    wVals
  )).map(r => r.id)
  const [miguelId, juanId, davidId, carlosId, sarahId] = workerIds

  const jobDefs = [
    { w: miguelId, client: 'Emily Johnson',  addr: '123 Oak St, Austin TX',       at: d(8,0),   dur: 90,  status: 'completed', type: 'HVAC Repair',     inst: 'AC unit not cooling. Check refrigerant levels first.' },
    { w: miguelId, client: 'Robert Chen',    addr: '456 Maple Ave, Austin TX',    at: d(10,30), dur: 60,  status: 'on_site',   type: 'HVAC Service',    inst: 'Annual maintenance. Filter replacement included.' },
    { w: miguelId, client: 'Linda Marsh',    addr: '789 Pine Rd, Austin TX',      at: d(13,0),  dur: 120, status: 'confirmed', type: 'HVAC Install',    inst: 'New unit install. Customer needs to be home.' },
    { w: juanId,   client: 'James Taylor',   addr: '321 Elm St, Austin TX',       at: d(9,0),   dur: 60,  status: 'delayed',   type: 'Plumbing Repair', inst: 'Leaky pipe under kitchen sink.' },
    { w: juanId,   client: 'Maria Santos',   addr: '654 Cedar Blvd, Austin TX',   at: d(11,30), dur: 90,  status: 'confirmed', type: 'Drain Cleaning',  inst: 'Clogged main drain. Bring snake tool.' },
    { w: davidId,  client: 'Tom Wilson',     addr: '987 Birch Ln, Austin TX',     at: d(8,30),  dur: 120, status: 'completed', type: 'Inspection',      inst: 'Pre-sale home inspection.' },
    { w: davidId,  client: 'Anna Lee',       addr: '159 Willow Way, Austin TX',   at: d(11,0),  dur: 90,  status: 'on_way',    type: 'Repair',          inst: 'Deck repair. Materials already on site.' },
    { w: davidId,  client: 'Gary Brown',     addr: '753 Spruce St, Austin TX',    at: d(14,0),  dur: 60,  status: 'confirmed', type: 'Consultation',    inst: 'Kitchen remodel estimate.' },
    { w: carlosId, client: 'Sophia Chen',    addr: '246 Aspen Dr, Austin TX',     at: d(9,0),   dur: 120, status: 'scheduled', type: 'Deep Clean',      inst: 'Move-out clean. Pay attention to oven and bathrooms.' },
    { w: carlosId, client: 'Michael Brown',  addr: '135 Poplar Ct, Austin TX',    at: d(12,0),  dur: 90,  status: 'scheduled', type: 'Office Clean',    inst: 'Weekly office cleaning. Key under mat.' },
    { w: sarahId,  client: 'Laura Davis',    addr: '864 Hackberry Rd, Austin TX', at: d(8,0),   dur: 180, status: 'completed', type: 'Interior Paint',  inst: 'Living room + hallway. Color: Warm White SW 7012.' },
    { w: sarahId,  client: 'Peter Evans',    addr: '579 Magnolia St, Austin TX',  at: d(13,0),  dur: 120, status: 'confirmed', type: 'Exterior Paint',  inst: 'Front porch only. Primer first.' },
  ]

  // Insert all jobs in one query
  const jVals = jobDefs.flatMap(j => [j.w, j.client, j.addr, j.at, j.dur, j.status, j.type, j.inst])
  const jRows = jobDefs.map((_, i) => `($${i*8+1},$${i*8+2},$${i*8+3},$${i*8+4},$${i*8+5},$${i*8+6},$${i*8+7},$${i*8+8})`).join(',')
  const jobIds = (await sql<{ id: number }>(
    `INSERT INTO jobs (worker_id,client_name,address,scheduled_at,estimated_duration,status,job_type,instructions) VALUES ${jRows} RETURNING id`,
    jVals
  )).map(r => r.id)

  // Insert all messages and escalations in parallel
  const msgRows = [
    [miguelId, jobIds[0], 'outbound', "Good morning Miguel! Reminder: HVAC Repair at 123 Oak St for Emily Johnson at 8:00 AM. Please confirm when you're on your way.", "Buenos días Miguel! Recordatorio: Reparación de HVAC en 123 Oak St para Emily Johnson a las 8:00 AM. Por favor confirma cuando vayas en camino.", d(7,0), 'reminder'],
    [miguelId, jobIds[0], 'inbound',  'Voy en camino', 'On my way', d(7,25), 'chat'],
    [miguelId, jobIds[0], 'outbound', '✓ Got it, Miguel! Status updated. Have a great visit.', '✓ Entendido, Miguel! Estado actualizado. Que tengas una buena visita.', d(7,26), 'chat'],
    [miguelId, jobIds[0], 'inbound',  'Trabajo terminado en Oak St', 'Work done at Oak St', d(9,35), 'chat'],
    [miguelId, jobIds[0], 'outbound', 'Great work! Status marked as completed. Head to 456 Maple Ave next — HVAC Service for Robert Chen at 10:30 AM.', 'Buen trabajo! Estado marcado como completado. Dirígete a 456 Maple Ave — Mantenimiento de HVAC para Robert Chen a las 10:30 AM.', d(9,36), 'chat'],
    [miguelId, jobIds[1], 'inbound',  'Llegué a Maple Ave', 'Arrived at Maple Ave', ago(45), 'chat'],
    [miguelId, jobIds[1], 'outbound', '✓ Marked as on-site. Let me know when done!', '✓ Marcado en sitio. ¡Avísame cuando termines!', ago(44), 'chat'],
    [juanId, jobIds[3], 'outbound', "Good morning Juan! Plumbing Repair at 321 Elm St for James Taylor at 9:00 AM. Confirm you're on your way.", "Buenos días Juan! Reparación de plomería en 321 Elm St para James Taylor a las 9:00 AM. Confirma que vas en camino.", d(8,0), 'reminder'],
    [juanId, jobIds[3], 'inbound',  'Estoy en tráfico, llego tarde 30 min', "I'm in traffic, arriving 30 min late", d(8,45), 'chat'],
    [juanId, jobIds[3], 'outbound', "Understood Juan. I've notified the manager. You'll hear back shortly about next steps.", 'Entendido Juan. He notificado al gerente. Pronto recibirás instrucciones.', d(8,46), 'chat'],
    [davidId, jobIds[6], 'outbound', 'Hi David! Deck repair at 159 Willow Way for Anna Lee at 11:00 AM. Materials are already on site. Confirm when on your way.', null, ago(60), 'reminder'],
    [davidId, jobIds[6], 'inbound',  'Heading over now, should be there in 20 min', null, ago(30), 'chat'],
    [davidId, jobIds[6], 'outbound', '✓ On your way — noted! Anna Lee is expecting you.', null, ago(29), 'chat'],
    [carlosId, jobIds[8], 'outbound', 'Buenos días Carlos! Limpieza profunda en 246 Aspen Dr para Sophia Chen a las 9:00 AM. Confirma que vas en camino.', 'Good morning Carlos! Deep Clean at 246 Aspen Dr for Sophia Chen at 9:00 AM. Confirm you\'re on your way.', d(8,0), 'reminder'],
    [carlosId, jobIds[8], 'outbound', 'Carlos, aún no hemos recibido confirmación. ¿Todo bien? Por favor responde.', "Carlos, we haven't received confirmation yet. Everything OK? Please reply.", ago(30), 'reminder'],
    [sarahId, jobIds[10], 'outbound', 'Good morning Sarah! Interior painting at 864 Hackberry Rd for Laura Davis at 8:00 AM. Let me know when you arrive!', null, d(7,30), 'reminder'],
    [sarahId, jobIds[10], 'inbound',  'On site, starting now!', null, d(7,55), 'chat'],
    [sarahId, jobIds[10], 'inbound',  'All done, looks great!', null, d(11,10), 'chat'],
    [sarahId, jobIds[10], 'outbound', '✓ Marked complete. Head to 579 Magnolia St at 1:00 PM — exterior paint for Peter Evans.', null, d(11,11), 'chat'],
  ]
  const mVals = msgRows.flat()
  const mRowsSql = msgRows.map((_, i) => `($${i*7+1},$${i*7+2},$${i*7+3},$${i*7+4},$${i*7+5},$${i*7+6},$${i*7+7})`).join(',')

  const escRows = [
    [carlosId, jobIds[8], 'no_response', "Carlos hasn't confirmed for 9:00 AM at Sophia Chen (246 Aspen Dr). 2 reminders sent, no reply.", null, 'pending', ago(25)],
    [juanId,   jobIds[3], 'delay',       'Juan is 30 min late for James Taylor (321 Elm St). Juan said: "Estoy en tráfico, llego tarde 30 min."', 'Juan has traffic delay', 'pending', d(8,46)],
    [davidId,  jobIds[5], 'overrun',     "David's inspection at Tom Wilson (987 Birch Ln) ran over by 25 min. Affects next appointment.", null, 'resolved', d(10,55)],
  ]
  const eVals = escRows.flat()
  const eRowsSql = escRows.map((_, i) => `($${i*7+1},$${i*7+2},$${i*7+3},$${i*7+4},$${i*7+5},$${i*7+6},$${i*7+7})`).join(',')

  await Promise.all([
    pool.query(`INSERT INTO messages (worker_id,job_id,direction,content,content_translated,created_at,msg_type) VALUES ${mRowsSql}`, mVals),
    pool.query(`INSERT INTO escalations (worker_id,job_id,esc_type,description,description_translated,status,created_at) VALUES ${eRowsSql}`, eVals),
  ])
}
