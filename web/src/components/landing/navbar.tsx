'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ThemeToggle } from '@/components/theme-toggle'

const LINKS = [['#data', 'Data'], ['#etl', 'Alur ETL'], ['#teknologi', 'Teknologi']] as const

export function Navbar() {
  const [solid, setSolid] = useState(false)
  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <header className={`fixed inset-x-0 top-0 z-30 transition-colors duration-300 ${solid ? 'border-b border-line bg-bg/85 backdrop-blur-md' : 'border-b border-transparent'}`}>
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 md:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-accent text-xs font-bold text-accent-ink">IK</span>
          <span className="text-sm font-semibold max-sm:hidden">Industri Mikro & Kecil</span>
        </Link>
        <nav className="ml-auto flex items-center gap-5 text-sm text-ink-2 max-md:hidden" aria-label="Bagian halaman">
          {LINKS.map(([href, label]) => <a key={href} href={href} className="hover:text-ink">{label}</a>)}
        </nav>
        <div className="flex items-center gap-2 max-md:ml-auto">
          <ThemeToggle />
          <Link href="/dashboard" className="rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-accent-ink hover:brightness-105">
            Masuk dashboard
          </Link>
        </div>
      </div>
    </header>
  )
}
