import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/enter', '/api/enter', '/api/health', '/_next', '/favicon.ico']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow public paths and static assets
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Check access cookie
  const granted = req.cookies.get('access')?.value
  if (granted === 'granted') {
    return NextResponse.next()
  }

  // Redirect to entry page, preserving the intended destination
  const url = req.nextUrl.clone()
  url.pathname = '/enter'
  url.searchParams.set('next', pathname)
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
