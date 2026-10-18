'use client'

import { fmtInt } from '@/lib/metrics'
import { useVisible } from './reveal'

type Stage = { level: string; title: string; tables: string[]; count: number; note: string }

/** Tiga kolom level data dengan garis aliran yang bergerak saat terlihat. */
export function EtlFlow({ stages }: { stages: Stage[] }) {
  const [ref, visible] = useVisible<HTMLDivElement>()
  return (
    <div ref={ref} className="grid gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-stretch">
      {stages.map((s, i) => (
        <div key={s.level} className="contents">
          {i > 0 && <Connector active={visible} delay={i * 350} />}
          <div
            style={{ transitionDelay: `${i * 350}ms` }}
            className={`rounded-xl border border-line bg-surface p-5 shadow-card transition duration-700 motion-reduce:transition-none ${visible ? 'opacity-100' : 'opacity-0 md:translate-y-4'}`}
          >
            <div className="text-xs font-semibold tracking-wider text-accent uppercase">{s.level}</div>
            <h3 className="mt-1 text-lg font-bold">{s.title}</h3>
            <div className="tabular mt-3 text-4xl font-extrabold tracking-tight">{fmtInt(s.count)}<span className="ml-1.5 text-sm font-medium text-ink-3">baris</span></div>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {s.tables.map((t) => <li key={t}><code className="rounded-md bg-surface-2 px-2 py-0.5 text-xs">{t}</code></li>)}
            </ul>
            <p className="mt-3 text-sm text-ink-2">{s.note}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function Connector({ active, delay }: { active: boolean; delay: number }) {
  return (
    <div className="flex items-center justify-center py-1 md:px-1" aria-hidden>
      <svg viewBox="0 0 64 24" className="h-6 w-16 rotate-90 md:rotate-0">
        <path d="M2 12H56" stroke="var(--line)" strokeWidth="2" />
        <path d="M2 12H56" stroke="var(--accent)" strokeWidth="2" strokeDasharray="6 8"
          className={active ? 'animate-[flow_1s_linear_infinite] motion-reduce:animate-none' : 'opacity-0'}
          style={{ animationDelay: `${delay}ms` }} />
        <path d="M52 6l8 6-8 6" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}
