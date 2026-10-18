'use client'

import { useMemo, useState } from 'react'
import { axis, baseOption, Chart } from '@/components/chart'
import { Segmented } from '@/components/controls'
import { Card, Insights, PageHead } from '@/components/ui'
import {
  aggregate, bySkala, fmtCompact, fmtDec, fmtInt, fmtPct, fmtRp, groupBy, pct, reported, type SkalaFilter, titleCase, years,
} from '@/lib/metrics'
import type { Row } from '@/lib/types'

const SKALA: readonly SkalaFilter[] = ['Semua', 'Mikro', 'Kecil']

export function Overview({ rows }: { rows: Row[] }) {
  const allYears = useMemo(() => years(rows), [rows])
  const [tahun, setTahun] = useState(allYears.at(-1)!)
  const [skala, setSkala] = useState<SkalaFilter>('Semua')

  const nasional = useMemo(() => rows.filter((r) => r.nasional && bySkala(skala)(r)), [rows, skala])
  const tren = useMemo(() => allYears.map((y) => ({ tahun: y, ...aggregate(nasional.filter((r) => r.tahun === y)) })), [allYears, nasional])
  const now = tren.find((t) => t.tahun === tahun)!
  const prev = tren.find((t) => t.tahun === tahun - 1)

  const provinsi = useMemo(() => {
    const groups = groupBy(rows.filter((r) => !r.nasional && r.tahun === tahun && bySkala(skala)(r)), (r) => r.provinsi)
    return [...groups].filter(([, g]) => reported(g)).map(([p, g]) => ({ provinsi: p, ...aggregate(g) }))
      .sort((a, b) => b.nilai_output - a.nilai_output)
  }, [rows, tahun, skala])
  const top = provinsi.slice(0, 10)

  const kpis = [
    { label: 'Jumlah usaha', value: fmtInt(now.jumlah_perusahaan), unit: 'unit', d: pct(now.jumlah_perusahaan, prev?.jumlah_perusahaan) },
    { label: 'Tenaga kerja', value: fmtInt(now.tenaga_kerja), unit: 'orang', d: pct(now.tenaga_kerja, prev?.tenaga_kerja) },
    { label: 'Nilai output', value: fmtRp(now.nilai_output), unit: '', d: pct(now.nilai_output, prev?.nilai_output) },
    { label: 'Nilai tambah', value: fmtRp(now.nilai_tambah), unit: '', d: pct(now.nilai_tambah, prev?.nilai_tambah) },
  ]

  const first = tren[0], last = tren.at(-1)!
  const growth = pct(last.nilai_output, first.nilai_output)
  const shareTop5 = now.nilai_output ? (provinsi.slice(0, 5).reduce((s, p) => s + p.nilai_output, 0) / now.nilai_output) * 100 : null
  const label = skala === 'Semua' ? 'industri mikro dan kecil' : `usaha ${skala.toLowerCase()}`
  const insights = [
    <>Nilai output {label} {growth != null && growth >= 0 ? 'naik' : 'turun'} dari <b className="text-ink">{fmtRp(first.nilai_output)}</b> ({first.tahun}) menjadi <b className="text-ink">{fmtRp(last.nilai_output)}</b> ({last.tahun}), perubahan {fmtPct(growth)} secara nominal (belum memperhitungkan inflasi).</>,
    <>Pada {tahun}, lima provinsi teratas — {provinsi.slice(0, 5).map((p) => titleCase(p.provinsi)).join(', ')} — menyumbang <b className="text-ink">{fmtPct(shareTop5)}</b> nilai output nasional.</>,
    <>Setiap Rp100 output pada {tahun} memakai input sekitar <b className="text-ink">Rp{fmtDec(now.nilai_output ? (now.nilai_input / now.nilai_output) * 100 : null, 0)}</b>; sisanya menjadi nilai tambah sebesar {fmtRp(now.nilai_tambah)}.</>,
    <>Rata-rata satu usaha menyerap <b className="text-ink">{fmtDec(now.tk_per_usaha, 2)} orang</b> dan menghasilkan output {fmtRp(now.output_per_usaha)} per tahun.</>,
  ]

  return (
    <>
      <PageHead title="Ringkasan nasional" desc="Gambaran industri manufaktur mikro dan kecil Indonesia. Ubah tahun atau skala untuk memperbarui seluruh angka dan grafik.">
        <Segmented label="Tahun" value={tahun} options={allYears} onChange={setTahun} />
        <Segmented label="Skala usaha" value={skala} options={SKALA} onChange={setSkala} />
      </PageHead>

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <section key={k.label} className="rounded-xl border border-line bg-surface p-5 shadow-card">
            <div className="text-[13px] font-medium text-ink-2">{k.label}</div>
            <div className="tabular mt-1.5 text-xl font-bold tracking-tight whitespace-nowrap xl:text-[26px]">{k.value}</div>
            {k.unit && <div className="text-xs text-ink-3">{k.unit}</div>}
            <div className="mt-1.5 text-[13px] text-ink-2">
              {k.d == null ? <span className="text-ink-3">Tidak ada pembanding</span> : (
                <><span className={`font-semibold ${k.d >= 0 ? 'text-good' : 'text-critical'}`}>{k.d >= 0 ? '▲' : '▼'} {fmtPct(Math.abs(k.d))}</span> dibanding {tahun - 1}</>
              )}
            </div>
          </section>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <Card title="Tren nilai produksi" desc={`Total nasional ${label}, ${first.tahun}–${last.tahun}`}>
          <Chart
            ariaLabel="Grafik garis nilai output, input, dan nilai tambah per tahun"
            deps={[tren]}
            build={(t) => ({
              ...baseOption(t),
              tooltip: { ...baseOption(t).tooltip, trigger: 'axis', valueFormatter: (v: number) => fmtRp(v),
                axisPointer: { type: 'line', lineStyle: { color: t.ink3, type: 'dashed' } } },
              grid: { left: 8, right: 92, top: 40, bottom: 8, containLabel: true },
              xAxis: { type: 'category', data: tren.map((d) => d.tahun), boundaryGap: false, ...axis(t), splitLine: { show: false } },
              yAxis: { type: 'value', ...axis(t), axisLabel: { color: t.ink3, formatter: (v: number) => fmtRp(v) } },
              series: (['nilai_output', 'nilai_input', 'nilai_tambah'] as const).map((k, i) => ({
                name: ['Nilai output', 'Nilai input', 'Nilai tambah'][i], type: 'line', data: tren.map((d) => d[k]),
                symbol: 'circle', symbolSize: 8, lineStyle: { width: 2, color: t.series[i] },
                itemStyle: { color: t.series[i], borderColor: t.surface, borderWidth: 2 }, emphasis: { focus: 'series' },
                endLabel: { show: true, formatter: '{a}', color: t.ink2, fontSize: 12, distance: 8 },
                labelLayout: { moveOverlap: 'shiftY' },
              })),
            })}
          />
        </Card>
        <Card title="Usaha dan tenaga kerja" desc="Perubahan jumlah unit usaha dan pekerja">
          <div className="grid gap-2">
            {([['jumlah_perusahaan', 'Jumlah usaha', 0], ['tenaga_kerja', 'Tenaga kerja', 1]] as const).map(([k, name, i]) => (
              <div key={k}>
                <div className="text-[13px] font-medium text-ink-2">{name}</div>
                <Chart
                  ariaLabel={`Grafik kolom ${name} per tahun`}
                  height={134}
                  deps={[tren]}
                  build={(t) => ({
                    ...baseOption(t),
                    legend: { show: false },
                    tooltip: { ...baseOption(t).tooltip, trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v: number) => fmtInt(v) },
                    grid: { left: 8, right: 8, top: 8, bottom: 4, containLabel: true },
                    xAxis: { type: 'category', data: tren.map((d) => d.tahun), ...axis(t), splitLine: { show: false } },
                    yAxis: { type: 'value', ...axis(t), axisLabel: { color: t.ink3, formatter: (v: number) => fmtCompact(v) }, splitNumber: 2 },
                    series: [{ name, type: 'bar', data: tren.map((d) => d[k]), barMaxWidth: 28,
                      itemStyle: { color: t.series[i], borderRadius: [4, 4, 0, 0] } }],
                  })}
                />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[3fr_2fr]">
        <Card title={`10 provinsi dengan output terbesar, ${tahun}`} desc="Arahkan kursor ke batang untuk melihat detail">
          <Chart
            ariaLabel={`Grafik batang 10 provinsi dengan nilai output terbesar tahun ${tahun}`}
            height={380}
            deps={[top]}
            build={(t) => ({
              ...baseOption(t),
              legend: { show: false },
              tooltip: { ...baseOption(t).tooltip, trigger: 'item',
                formatter: (p: { dataIndex: number }) => {
                  const d = [...top].reverse()[p.dataIndex]
                  return `<b>${titleCase(d.provinsi)}</b><br>Output ${fmtRp(d.nilai_output)}<br>Tenaga kerja ${fmtInt(d.tenaga_kerja)}<br>Output/pekerja ${fmtDec(d.output_per_tk)} jt`
                } },
              grid: { left: 8, right: 76, top: 4, bottom: 4, containLabel: true },
              xAxis: { type: 'value', ...axis(t), axisLabel: { show: false } },
              yAxis: { type: 'category', data: [...top].reverse().map((d) => titleCase(d.provinsi)), ...axis(t), axisLabel: { color: t.ink2, fontSize: 12 } },
              series: [{ type: 'bar', data: [...top].reverse().map((d) => d.nilai_output), barMaxWidth: 18,
                itemStyle: { color: t.series[0], borderRadius: [0, 4, 4, 0] },
                label: { show: true, position: 'right', color: t.ink2, fontSize: 12, formatter: (p: { value: number }) => fmtRp(p.value) } }],
            })}
          />
        </Card>
        <Insights items={insights} />
      </div>
    </>
  )
}
