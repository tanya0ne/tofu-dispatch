import { initDb, sqlOne } from '@/lib/db'
import { redirect } from 'next/navigation'

export default async function ChatIndexPage() {
  await initDb()
  const first = await sqlOne<{ id: number }>(`SELECT id FROM workers WHERE status = 'active' ORDER BY name LIMIT 1`)
  if (first) redirect(`/chat/${first.id}`)
  return null
}
