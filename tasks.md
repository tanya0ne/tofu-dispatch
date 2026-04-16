# Task list — Tofu FSM dashboard rewrite

Each task must be implemented, then sent for review to BOTH reviewers (security-reviewer + logic-reviewer) via SendMessage. Do NOT move to the next task until the current one is approved by both.

## Task 1 — DB schema + seed (estimates, invoices, on_worker_app)

**File:** `src/lib/db.ts`

- In `initDb()`:
  - Add `CREATE TABLE IF NOT EXISTS estimates (...)` with fields: id SERIAL PK, client_name TEXT, address TEXT, amount_cents INTEGER, status TEXT DEFAULT 'draft', sent_at TEXT, created_at TEXT default now UTC
  - Add `CREATE TABLE IF NOT EXISTS invoices (...)` with fields: id SERIAL PK, job_id INTEGER REFERENCES jobs(id), client_name TEXT, amount_cents INTEGER, status TEXT DEFAULT 'unpaid', due_date TEXT, paid_at TEXT, created_at TEXT
  - Add `ALTER TABLE workers ADD COLUMN IF NOT EXISTS on_worker_app BOOLEAN NOT NULL DEFAULT true`
- In `seedIfEmpty()` (after existing job seeding), add seed logic that runs only if new tables are empty:
  - Seed 6 estimates: 1 draft, 3 sent (ages 1 day, 6 days, 9 days — the last two must be > 5 days to trigger "stuck"), 1 accepted, 1 rejected. Amounts $500–$5000 (in cents).
  - Seed 8 invoices linked to random completed jobs from today. 2 paid, 6 unpaid. Of unpaid: 2 overdue (due_date = today - 18d, today - 20d), 4 not overdue.
  - After seed, also do `UPDATE workers SET on_worker_app = false WHERE id = (SELECT id FROM workers ORDER BY id LIMIT 1 OFFSET 4)` to make 1 of 5 workers not on app.
- **Idempotency critical:** new tables seed ONLY if their count is 0. Must not duplicate data on restart.

## Task 2 — POST /api/jobs (create new job endpoint)

**File:** `src/app/api/jobs/route.ts` (new)

- Export `POST(req)` function.
- Parse body: `{ worker_id, client_name, address, scheduled_at, estimated_duration, job_type, instructions }`.
- Validate:
  - worker_id → positive integer, and exists in DB (check with a SELECT)
  - client_name, address, scheduled_at, job_type → non-empty strings
  - scheduled_at → valid ISO8601 (`new Date(scheduled_at).toString() !== 'Invalid Date'`)
  - estimated_duration → integer 15–600
  - instructions → optional, string up to 2000 chars
- On invalid: 400 + `{ error: '...' }`
- On success: insert via parameterized SQL, status='scheduled'; return 200 + `{ ok: true, job: {...} }`
- Use `sql`/`sqlOne` helpers from `@/lib/db`.

## Task 3 — Dashboard page rewrite (layout + Header)

**File:** `src/app/(app)/dashboard/page.tsx`

- Full rewrite. Keep `export const dynamic = 'force-dynamic'` and `await initDb()`.
- Top-level structure:
  ```
  <div style={{ padding: '32px 36px', maxWidth: 1100, paddingBottom: 120 }}>
    <Header greeting={...} dateStr={...} summary={...} />
    <NeedsAttention escalations={...} overdueInvoices={...} stuckEstimates={...} jobsReadyForInvoice={...} />
    <Today jobs={...} tomorrowCount={...} tomorrowUnassigned={...} weekCount={...} />
    {showMoneyZone && <Money estimatesSummary={...} invoicesSummary={...} />}
    <TofuWorkedForYou metrics={...} teamOnApp={...} />
  </div>
  <FabNewJob workers={...} />
  ```
- Header: dateStr + "Good [morning/afternoon/evening], James" + 1-line summary "N of M jobs confirmed today · K items need attention"
- Use inline styles matching existing palette (#1a1a18, #eeece8, #f6f5f3, #f2ede6, #555550, #999990).
- Single SQL batch at top fetches all needed data in parallel via `Promise.all([...])`.

## Task 4 — Zone 1: NeedsAttention block

Same file as Task 3. Inline components (no separate files).

- SQL queries needed:
  - Escalations (reuse existing query: `status='pending'`)
  - Overdue invoices: `SELECT * FROM invoices WHERE status='unpaid' AND due_date::date < (NOW() - INTERVAL '14 days')::date ORDER BY due_date ASC`
  - Stuck estimates: `SELECT * FROM estimates WHERE status='sent' AND sent_at::timestamptz < NOW() - INTERVAL '5 days' ORDER BY sent_at ASC`
  - Completed jobs without invoice: `SELECT j.* FROM jobs j LEFT JOIN invoices i ON i.job_id = j.id WHERE j.status='completed' AND i.id IS NULL LIMIT 20`
- Render each source as its own card style. Priority order: escalations → overdue invoices → stuck estimates → ready-to-invoice.
- Each card has 1-2 action buttons (Call/Message for escalations; View/Send reminder for invoices; Follow up/View for estimates; Create invoice for ready-to-invoice — Note: these buttons can be non-functional placeholders except Call/Message/Dismiss on escalations which already work).
- Empty state (all 4 sources empty): card `<div>` with text "You're all caught up. Nice." on `#f2ede6` background.
- Section header: "Needs your attention" (same style as existing).

## Task 5 — Zone 2: Today block

Same file.

- Summary line under section header: `{N} visits today · {confirmed} confirmed · {overdue} overdue`
  - confirmed = jobs with status in ('confirmed','on_way','on_site','completed')
  - overdue = escalations of type 'delay' or jobs with status 'delayed'
- Re-use the existing visits table (columns Time/Worker/Client/Address/Type/Status/Chat) — adapt inline.
- Under the table, two pieces:
  - Badge: `+ Tomorrow: X visits, Y unassigned` (Y = jobs with null worker_id for tomorrow — if schema doesn't allow null, Y=0). Query: tomorrow's jobs count.
  - Link: `This week: Z visits →` ( `Link` to `/jobs?range=week`). Query: count of jobs from today 00:00 UTC up to today+7 00:00 UTC.
- **Empty state (no visits today):** Replace table with a prompt: "No visits today. {K} estimates awaiting client response — Dispatch can send a follow-up." + button "Follow up" (non-functional, just visual).
- Section header: "Today's schedule" (same style).

## Task 6 — Zone 3: Money block (exception-based)

Same file.

- Compute:
  - estimatesWaiting = `{ count, total_cents, oldest_sent_at }` from estimates WHERE status='sent'
  - invoicesUnpaid = `{ count, total_cents }` from invoices WHERE status='unpaid'
  - invoicesOverdue = `{ count, total_cents }` from invoices WHERE status='unpaid' AND due_date < today
- Show the zone ONLY if `estimatesWaiting.count > 0 || invoicesUnpaid.count > 0`. Otherwise skip entirely.
- Two side-by-side blocks (`display: grid; gridTemplateColumns: '1fr 1fr'; gap: 16`):
  - **Estimates:** "3 awaiting client · $4,500 total · oldest 7 days old" + link "View estimates →" (`/jobs` for now since no estimates page yet; use `/jobs` as placeholder)
  - **Invoices:** "5 unpaid · $3,200 total" + if overdue > 0: second line "2 overdue · $1,240" in red color (#7f1d1d) + link "View invoices →" (`/jobs` placeholder)
- Section header: "Money"

## Task 7 — Zone 4: Tofu worked for you today + FAB

Same dashboard file + new file `src/components/FabNewJob.tsx`.

**Zone 4 (in page.tsx):**
- SQL metrics for today (UTC date):
  - remindersSent = COUNT messages WHERE msg_type='reminder' AND DATE(created_at)=today
  - confirmationsCollected = COUNT messages WHERE direction='inbound' AND msg_type='chat' AND DATE(created_at)=today
  - translationsDone = COUNT messages WHERE content_translated IS NOT NULL AND DATE(created_at)=today
  - minutesSaved = remindersSent*3 + translationsDone*2 + confirmationsCollected*1 (integer, rounded to nearest 5)
  - teamOnAppPct + teamOnAppCount + teamTotalCount from workers WHERE status='active'
- Render as 4 stat cubes (same style as existing stats row), under them a thin horizontal progress bar:
  - Bar label above: `Team on Worker app: {pct}% ({count} of {total})`
  - Bar: background `#eeece8`, fill `#1a1a18`, height 6px, width 100%
- Section header: "Tofu worked for you today"

**FAB (`src/components/FabNewJob.tsx`) — client component:**
- `'use client'` at top.
- Accepts prop `workers: Array<{id, name, avatar_initials, avatar_color}>`.
- State: `open: boolean`, form fields.
- Renders `<button>` with `position: fixed; bottom: 32px; right: 32px; width: 56px; height: 56px; borderRadius: 50%; background: '#1a1a18'; color: '#fff'; fontSize: 28; cursor: pointer; boxShadow: '0 4px 14px rgba(0,0,0,0.15)'; z-index: 50`. Content: "+".
- On click: `open=true`. Renders modal: fixed full-screen backdrop (`rgba(0,0,0,0.3)`, z-index 100) + centered form card (max-width 500, padding 28, background #fff, borderRadius 14).
- Form fields (HTML form with onSubmit):
  - Worker `<select>` populated from props
  - Client name `<input type="text">`
  - Address `<input type="text">`
  - Scheduled at `<input type="datetime-local">`
  - Duration (min) `<input type="number" min=15 max=600 default=60>`
  - Job type `<input type="text" default="General">`
  - Instructions `<textarea>` (optional)
- On submit: fetch('/api/jobs', { method: 'POST', body: JSON.stringify({...}) }). Convert datetime-local to ISO. On 200: close modal, call `router.refresh()` (from 'next/navigation'). On error: show inline error message in modal.
- Cancel button closes modal, ESC also closes.

---

## Definition of done (for each task)

- Code compiles (`cd product-mvp && npm run build` passes).
- Both reviewers approved it via direct SendMessage to coder.
- No hardcoded secrets, only parameterized SQL.
- Matches the brief exactly.

## Review workflow

After coder finishes each task:
1. `SendMessage` to `security-reviewer` with diff summary + files changed.
2. `SendMessage` to `logic-reviewer` with same info.
3. Wait for both to reply. Fix any issues and re-review.
4. Only after both approve — move to next task.
