'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ICONS: Record<string, string> = {
  home: 'M3 12l9-8 9 8M5 10v10h14V10',
  map: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14',
  split: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  table: 'M3 5h18v14H3zM3 10h18M3 15h18M9 5v14',
  flow: 'M4 6h6v4H4zM14 14h6v4h-6zM7 10v4a2 2 0 0 0 2 2h5',
}

const ITEMS = [
  { href: '/dashboard', label: 'Ringkasan', icon: 'home' },
  { href: '/dashboard/provinsi', label: 'Provinsi', icon: 'map' },
  { href: '/dashboard/skala', label: 'Mikro vs Kecil', icon: 'split' },
  { href: '/dashboard/data', label: 'Eksplorasi data', icon: 'table' },
  { href: '/dashboard/etl', label: 'Status ETL', icon: 'flow', admin: true },
]

export function Nav({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname()
  return (
    <nav className="flex flex-wrap gap-0.5 md:flex-col" aria-label="Navigasi utama">
      {ITEMS.filter((i) => !i.admin || isAdmin).map((i) => {
        const active = i.href === '/dashboard' ? path === '/dashboard' : path.startsWith(i.href)
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
              active ? 'bg-surface-2 text-ink shadow-[inset_3px_0_0_var(--accent)]' : 'text-ink-2 hover:bg-surface-2 hover:text-ink'}`}
          >
            <svg viewBox="0 0 24 24" className="size-[18px] flex-none" fill="none" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d={ICONS[i.icon]} />
            </svg>
            <span className="max-md:sr-only">{i.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
