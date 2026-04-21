import { NextResponse } from 'next/server'
import { readState } from '@/lib/setup-state'

export const dynamic = 'force-dynamic'

export async function GET() {
  const state = await readState()
  return NextResponse.json({
    linked: state.whatsapp.linked,
    phone: state.whatsapp.phone,
  })
}
