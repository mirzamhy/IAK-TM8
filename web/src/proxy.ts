import { NextResponse, type NextRequest } from 'next/server'
import { decrypt, SESSION_COOKIE } from '@/lib/session'

// Landing page (/) dan /login publik; seluruh /dashboard wajib login.
export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl
  const user = await decrypt(req.cookies.get(SESSION_COOKIE)?.value)

  if (pathname.startsWith('/dashboard')) {
    if (!user) {
      const url = new URL('/login', req.nextUrl)
      url.searchParams.set('next', pathname + search)
      return NextResponse.redirect(url)
    }
    if (pathname.startsWith('/dashboard/etl') && user.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard?akses=ditolak', req.nextUrl))
    }
  }
  if (pathname === '/login' && user) return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
}
