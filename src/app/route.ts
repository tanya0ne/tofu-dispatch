import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// Read once at startup — fails fast if file is missing
const landingHtml = fs.readFileSync(
  path.join(process.cwd(), 'public', 'landing.html'),
  'utf-8'
)

export async function GET() {
  return new NextResponse(landingHtml, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
