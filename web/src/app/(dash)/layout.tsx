import { Suspense } from 'react'
import { logout } from '@/app/actions'
import { Nav } from '@/components/nav'
import { ThemeToggle } from '@/components/theme-toggle'
import { getCurrentUser } from '@/lib/auth'

export default function DashLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen md:grid md:grid-cols-[236px_minmax(0,1fr)]">
      <aside className="flex items-center gap-3 border-b border-line bg-surface px-3 py-2.5 md:sticky md:top-0 md:h-screen md:flex-col md:items-stretch md:gap-1 md:border-r md:border-b-0 md:px-3.5 md:py-5">
        <div className="flex items-center gap-2.5 md:px-2 md:pb-5">
          <div className="grid size-9 place-items-center rounded-[9px] bg-accent text-sm font-bold text-accent-ink">IK</div>
          <div className="max-md:hidden">
            <strong className="block text-sm">Industri Mikro & Kecil</strong>
            <span className="text-xs text-ink-3">Data BPS 2021–2025</span>
          </div>
        </div>
        <Suspense fallback={<Nav isAdmin={false} />}>
          <NavForUser />
        </Suspense>
        <div className="ml-auto md:mt-auto md:ml-0 md:border-t md:border-line md:px-2 md:pt-3.5">
          <Suspense fallback={<div className="h-8" />}>
            <UserChip />
          </Suspense>
        </div>
      </aside>
      <main className="w-full max-w-[1280px] px-4 pt-5 pb-12 md:px-8 md:pt-7">{children}</main>
    </div>
  )
}

async function NavForUser() {
  const user = await getCurrentUser()
  return <Nav isAdmin={user.role === 'admin'} />
}

async function UserChip() {
  const user = await getCurrentUser()
  return (
    <div className="flex items-center justify-between gap-2 text-[13px] text-ink-2">
      <div className="max-md:hidden">
        <div className="font-semibold text-ink">{user.username}</div>
        <div className="text-[11px] tracking-wider text-ink-3 uppercase">{user.role}</div>
      </div>
      <div className="flex gap-1.5">
        <ThemeToggle />
        <form action={logout}>
          <button className="rounded-md border border-line px-2 py-1 text-xs text-ink-2 hover:border-ink-3 hover:text-ink">Keluar</button>
        </form>
      </div>
    </div>
  )
}
