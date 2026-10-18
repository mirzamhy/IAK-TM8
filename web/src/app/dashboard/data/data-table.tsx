'use client'

import { useMemo, useState } from 'react'
import { Segmented } from '@/components/controls'
import { Card, PageHead } from '@/components/ui'
import { aggregate, fmtMetric, METRIC, titleCase, years } from '@/lib/metrics'
import type { Metric, Row } from '@/lib/types'

type Col = { key: 'provinsi' | 'tahun' | 'skala' | Metric; label: string; num?: boolean }
const COLS: Col[] = [
  { key: 'provinsi', label: 'Wilayah' },
  { key: 'tahun', label: 'Tahun', num: true },
  { key: 'skala', label: 'Skala' },
  ...(Object.keys(METRIC) as Metric[]).map((k) => ({ key: k, label: METRIC[k].label, num: true })),
]

type View = Row & ReturnType<typeof ratiosOf>
function ratiosOf(r: Row) {
  const a = aggregate([r])
  return { output_per_tk: a.output_per_tk, output_per_usaha: a.output_per_usaha, tk_per_usaha: a.tk_per_usaha }
}

export function DataTable({ rows }: { rows: Row[] }) {
  const allYears = useMemo(() => ['Semua', ...years(rows).map(String)] as const, [rows])
  const [tahun, setTahun] = useState<string>('Semua')
  const [skala, setSkala] = useState<'Semua' | 'Mikro' | 'Kecil'>('Semua')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<{ key: Col['key']; dir: 1 | -1 }>({ key: 'provinsi', dir: 1 })

  const view = useMemo<View[]>(() => {
    const needle = q.trim().toUpperCase()
    const list = rows
      .filter((r) => (tahun === 'Semua' || r.tahun === Number(tahun)) && (skala === 'Semua' || r.skala === skala))
      .filter((r) => !needle || r.provinsi.includes(needle) || r.kode.includes(needle))
      .map((r) => ({ ...r, ...ratiosOf(r) }))
    return list.sort((a, b) => {
      if (sort.key === 'provinsi') return (a.nasional === b.nasional ? a.kode.localeCompare(b.kode) : a.nasional ? 1 : -1) * sort.dir
      const x = a[sort.key], y = b[sort.key]
      if (x == null) return 1
      if (y == null) return -1
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir
    })
  }, [rows, tahun, skala, q, sort])

  function download() {
    const head = ['kode_wilayah_bps', 'wilayah', 'tahun', 'skala', ...(Object.keys(METRIC) as Metric[])]
    const lines = view.map((r) => [r.kode, `"${r.provinsi}"`, r.tahun, r.skala,
      ...(Object.keys(METRIC) as Metric[]).map((k) => r[k] ?? '')].join(','))
    const blob = new Blob(['﻿' + [head.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'manufaktur_bps_filter.csv' })
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const toggle = (key: Col['key']) => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : key === 'provinsi' ? 1 : -1 }))

  return (
    <>
      <PageHead title="Eksplorasi data" desc="Seluruh isi data warehouse. Filter, cari, urutkan kolom dengan mengeklik judulnya, lalu unduh hasilnya sebagai CSV.">
        <Segmented label="Tahun" value={tahun} options={allYears} onChange={setTahun} />
        <Segmented label="Skala" value={skala} options={['Semua', 'Mikro', 'Kecil'] as const} onChange={setSkala} />
      </PageHead>
      <Card>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <label className="flex flex-col gap-1 text-xs text-ink-3">
            Cari provinsi atau kode BPS
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="mis. jawa, 3500"
              className="w-64 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink" />
          </label>
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-ink-3">{view.length} baris</span>
            <button onClick={download} className="rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-accent-ink hover:brightness-105">
              Unduh CSV
            </button>
          </div>
        </div>
        <div className="max-h-[640px] overflow-auto rounded-lg border border-line">
          <table className="tabular w-full border-collapse text-[13px]">
            <thead>
              <tr>
                {COLS.map((c) => (
                  <th key={c.key} scope="col" aria-sort={sort.key === c.key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}
                    className={`sticky top-0 z-10 border-b border-line bg-surface-2 px-3 py-2 font-semibold whitespace-nowrap text-ink-2 ${c.num ? 'text-right' : 'text-left'}`}>
                    <button onClick={() => toggle(c.key)} className="inline-flex items-center gap-1 hover:text-ink">
                      {c.label}<span className="text-ink-3">{sort.key === c.key ? (sort.dir === 1 ? '↑' : '↓') : ''}</span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {view.map((r) => (
                <tr key={`${r.kode}-${r.tahun}-${r.skala}`} className={`hover:bg-surface-2 ${r.nasional ? 'font-semibold' : ''}`}>
                  {COLS.map((c) => (
                    <td key={c.key} className={`border-b border-line px-3 py-1.5 whitespace-nowrap ${c.num ? 'text-right' : ''}`}>
                      {c.key === 'provinsi' ? titleCase(r.provinsi) : c.key === 'tahun' || c.key === 'skala' ? r[c.key] : fmtMetric(c.key, r[c.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-ink-3">Nilai uang dalam rupiah (T = triliun, M = miliar, jt = juta). Tanda – berarti data belum dilaporkan terpisah oleh BPS.</p>
      </Card>
    </>
  )
}
