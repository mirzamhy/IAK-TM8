import type { ReactNode } from 'react'

export function PageHead({ title, desc, children }: { title: string; desc: string; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-2">{desc}</p>
      </div>
      {children && <div className="flex flex-wrap items-end gap-3">{children}</div>}
    </div>
  )
}

export function Card({ title, desc, action, children, className = '' }: {
  title?: string; desc?: string; action?: ReactNode; children: ReactNode; className?: string
}) {
  return (
    <section className={`min-w-0 rounded-xl border border-line bg-surface p-5 shadow-card ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-base font-semibold tracking-tight">{title}</h2>}
            {desc && <p className="mt-0.5 text-[13px] text-ink-3">{desc}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function Insights({ items }: { items: ReactNode[] }) {
  return (
    <Card title="Temuan" desc="Dihitung otomatis dari data yang sedang difilter">
      <ul className="space-y-2.5 text-sm text-ink-2">
        {items.map((it, i) => (
          <li key={i} className="flex gap-3">
            <span className="mt-[7px] size-1.5 flex-none rounded-full bg-accent" aria-hidden />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export function Skeleton({ h = 320 }: { h?: number }) {
  return <div className="animate-pulse rounded-xl border border-line bg-surface-2" style={{ height: h }} />
}
