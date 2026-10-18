import { NextResponse, type NextRequest } from 'next/server'
import { decrypt, SESSION_COOKIE } from '@/lib/session'

// Semua halaman wajib login kecuali /login.
export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl
  const user = await decrypt(req.cookies.get(SESSION_COOKIE)?.value)
  const isLogin = pathname === '/login'

  if (!user && !isLogin) {
    const url = new URL('/login', req.nextUrl)
    if (pathname !== '/') url.searchParams.set('next', pathname + search)
    return NextResponse.redirect(url)
  }
  if (user && isLogin) return NextResponse.redirect(new URL('/', req.nextUrl))
  if (user && pathname.startsWith('/etl') && user.role !== 'admin') {
    return NextResponse.redirect(new URL('/?akses=ditolak', req.nextUrl))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|ico|jpg|webp)$).*)'],
}
