'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

/** Menandai elemen dengan data-visible saat masuk layar (sekali saja). */
export function useVisible<T extends Element>() {
  const ref = useRef<T>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); io.disconnect() }
    }, { threshold: 0.25 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return [ref, visible] as const
}

export function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const [ref, visible] = useVisible<HTMLDivElement>()
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition duration-700 ease-out motion-reduce:transition-none ${visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'} ${className}`}
    >
      {children}
    </div>
  )
}

/** Angka yang menghitung naik saat terlihat. */
const nf = (d: number) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: d })
const FORMAT = {
  juta: (v: number) => `${nf(2).format(v / 1e6)} jt`,
  triliun: (v: number) => `Rp${nf(1).format(v / 1e6)} T`,
  bulat: (v: number) => nf(0).format(v),
}

export function CountUp({ value, format }: { value: number; format: keyof typeof FORMAT }) {
  const [ref, visible] = useVisible<HTMLSpanElement>()
  const [shown, setShown] = useState(0)
  useEffect(() => {
    if (!visible) return
    const duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1400
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const p = duration ? Math.min(1, (now - start) / duration) : 1
      setShown(value * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [visible, value])
  return <span ref={ref} className="tabular">{FORMAT[format](shown)}</span>
}
