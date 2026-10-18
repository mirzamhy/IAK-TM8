export type Province = { kode: string; nama: string; center: [number, number]; rings: [number, number][][] }
export type GeoFile = { attribution: string; provinces: Province[] }

/** Nilai per kode provinsi untuk satu tahun; null = belum dilaporkan terpisah. */
export type Values = Record<string, number | null>

export const MAX_BAR = 7 // tinggi balok tertinggi (satuan scene)

/** Skala akar agar provinsi kecil tetap terlihat di samping Jawa Barat. */
export function barHeight(v: number | null | undefined, max: number) {
  if (v == null || v <= 0 || max <= 0) return 0
  return Math.max(0.15, MAX_BAR * Math.sqrt(v / max))
}

export function readColors() {
  const s = getComputedStyle(document.documentElement)
  const v = (n: string) => s.getPropertyValue(n).trim()
  const dark = (document.documentElement.dataset.theme ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) === 'dark'
  return {
    land: dark ? '#383834' : '#dad6cc',
    landHover: dark ? '#4a4a44' : '#c8c3b5',
    edge: dark ? '#4a4a45' : '#c4c0b4',
    bar: v('--series-1'),
    barHover: v('--series-2'),
    muted: v('--ink-3'),
  }
}
