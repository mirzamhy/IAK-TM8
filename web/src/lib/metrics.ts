import type { Measure, Metric, Row, Skala } from './types'

export const MEASURES: Measure[] = ['jumlah_perusahaan', 'tenaga_kerja', 'nilai_input', 'nilai_output', 'pengeluaran_tk', 'nilai_tambah']

export const METRIC: Record<Metric, { label: string; unit: string; money?: boolean; ratio?: boolean }> = {
  jumlah_perusahaan: { label: 'Jumlah usaha', unit: 'unit' },
  tenaga_kerja: { label: 'Tenaga kerja', unit: 'orang' },
  nilai_input: { label: 'Nilai input', unit: 'juta Rp', money: true },
  nilai_output: { label: 'Nilai output', unit: 'juta Rp', money: true },
  pengeluaran_tk: { label: 'Pengeluaran tenaga kerja', unit: 'juta Rp', money: true },
  nilai_tambah: { label: 'Nilai tambah', unit: 'juta Rp', money: true },
  output_per_tk: { label: 'Output per tenaga kerja', unit: 'juta Rp/orang', ratio: true },
  output_per_usaha: { label: 'Output per usaha', unit: 'juta Rp/unit', ratio: true },
  tk_per_usaha: { label: 'Tenaga kerja per usaha', unit: 'orang/unit', ratio: true },
}

export type Agg = Record<Measure, number> & Record<'output_per_tk' | 'output_per_usaha' | 'tk_per_usaha', number | null> & { n: number }

/** Jumlahkan indikator, lalu hitung rasio dari total — bukan rata-rata rasio per baris. */
export function aggregate(rows: Row[]): Agg {
  const s = Object.fromEntries(MEASURES.map((m) => [m, 0])) as Record<Measure, number>
  for (const r of rows) for (const m of MEASURES) s[m] += r[m] ?? 0
  return {
    ...s,
    n: rows.length,
    output_per_tk: s.tenaga_kerja > 0 ? s.nilai_output / s.tenaga_kerja : null,
    output_per_usaha: s.jumlah_perusahaan > 0 ? s.nilai_output / s.jumlah_perusahaan : null,
    tk_per_usaha: s.jumlah_perusahaan > 0 ? s.tenaga_kerja / s.jumlah_perusahaan : null,
  }
}

export function groupBy<K extends string | number>(rows: Row[], key: (r: Row) => K): Map<K, Row[]> {
  const out = new Map<K, Row[]>()
  for (const r of rows) {
    const k = key(r)
    const list = out.get(k)
    if (list) list.push(r)
    else out.set(k, [r])
  }
  return out
}

export type SkalaFilter = 'Semua' | Skala
export const bySkala = (s: SkalaFilter) => (r: Row) => s === 'Semua' || r.skala === s

/** Provinsi yang punya data terpisah (wilayah pemekaran Papua 2021–2023 dilaporkan 0 atau kosong). */
export const reported = (rows: Row[]) => rows.some((r) => (r.jumlah_perusahaan ?? 0) > 0)

export const years = (rows: Row[]) => [...new Set(rows.map((r) => r.tahun))].sort((a, b) => a - b)

export function pct(now: number | null | undefined, before: number | null | undefined): number | null {
  if (now == null || !before) return null
  return ((now - before) / before) * 100
}

const nf = (digits: number) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: digits, minimumFractionDigits: 0 })
export const fmtInt = (v: number | null | undefined) => (v == null ? '–' : nf(0).format(v))
export const fmtDec = (v: number | null | undefined, d = 1) => (v == null ? '–' : nf(d).format(v))
export const fmtPct = (v: number | null | undefined, d = 1) => (v == null ? '–' : `${nf(d).format(v)}%`)

/** Nilai di data dalam juta rupiah → teks ringkas. */
export function fmtRp(juta: number | null | undefined): string {
  if (juta == null) return '–'
  const a = Math.abs(juta)
  if (a >= 1e6) return `Rp${nf(1).format(juta / 1e6)} T`
  if (a >= 1e3) return `Rp${nf(1).format(juta / 1e3)} M`
  return `Rp${nf(1).format(juta)} jt`
}

export function fmtCompact(v: number | null | undefined): string {
  if (v == null) return '–'
  const a = Math.abs(v)
  if (a >= 1e6) return `${nf(2).format(v / 1e6)} jt`
  if (a >= 1e3) return `${nf(1).format(v / 1e3)} rb`
  return nf(1).format(v)
}

export function fmtMetric(metric: Metric, v: number | null | undefined): string {
  const m = METRIC[metric]
  if (m.money) return fmtRp(v)
  if (m.ratio) return fmtDec(v, metric === 'tk_per_usaha' ? 2 : 1)
  return fmtInt(v)
}

export const titleCase = (s: string) =>
  s.toLowerCase().replace(/(^|[\s.(-])([a-z])/g, (_, p, c) => p + c.toUpperCase()).replace(/\bDi\b/, 'DI').replace(/\bDki\b/, 'DKI')
