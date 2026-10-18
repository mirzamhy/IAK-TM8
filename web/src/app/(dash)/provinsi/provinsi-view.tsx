'use client'

import { useMemo, useState } from 'react'
import { axis, baseOption, Chart } from '@/components/chart'
import { Segmented, Select } from '@/components/controls'
import { Card, Insights, PageHead } from '@/components/ui'
import {
  aggregate, bySkala, fmtMetric, fmtPct, groupBy, METRIC, reported, type SkalaFilter, titleCase, years,
} from '@/lib/metrics'
import type { Metric, Row } from '@/lib/types'

const SKALA: readonly SkalaFilter[] = ['Semua', 'Mikro', 'Kecil']
const METRICS = Object.entries(METRIC).map(([value, m]) => ({ value: value as Metric, label: m.label }))

export function ProvinsiView({ rows }: { rows: Row[] }) {
  const allYears = useMemo(() => years(rows), [rows])
  const [tahun, setTahun] = useState(allYears.at(-1)!)
  const [skala, setSkala] = useState<SkalaFilter>('Semua')
  const [metric, setMetric] = useState<Metric>('nilai_output')
  const [picked, setPicked] = useState<string | null>(null)

  const ranked = useMemo(() => {
    const g = groupBy(rows.filter((r) => !r.nasional && r.tahun === tahun && bySkala(skala)(r)), (r) => r.provinsi)
    return [...g].filter(([, list]) => reported(list)).map(([provinsi, list]) => ({ provinsi, ...aggregate(list) }))
      .filter((d) => d[metric] != null)
      .sort((a, b) => (b[metric] ?? 0) - (a[metric] ?? 0))
  }, [rows, tahun, skala, metric])

  const selected = picked && ranked.some((r) => r.provinsi === picked) ? picked : ranked[0]?.provinsi
  const detail = useMemo(() => {
    const own = rows.filter((r) => r.provinsi === selected)
    return allYears.map((y) => ({
      tahun: y,
      Mikro: aggregate(own.filter((r) => r.tahun === y && r.skala === 'Mikro'))[metric],
      Kecil: aggregate(own.filter((r) => r.tahun === y && r.skala === 'Kecil'))[metric],
      Total: aggregate(own.filter((r) => r.tahun === y))[metric],
    }))
  }, [rows, selected, allYears, metric])

  const m = METRIC[metric]
  const fmt = (v: number | null | undefined) => fmtMetric(metric, v)
  const total = m.ratio ? null : ranked.reduce((s, r) => s + (r[metric] ?? 0), 0)
  const selRow = ranked.find((r) => r.provinsi === selected)
  const rank = ranked.findIndex((r) => r.provinsi === selected) + 1
  const byProd = [...ranked].sort((a, b) => (b.output_per_tk ?? 0) - (a.output_per_tk ?? 0))
  const top3 = ranked.slice(0, 3)
  const insights = ranked.length ? [
    <><b className="text-ink">{titleCase(ranked[0].provinsi)}</b> tertinggi untuk {m.label.toLowerCase()} pada {tahun} ({fmt(ranked[0][metric])}), sedangkan {titleCase(ranked.at(-1)!.provinsi)} terendah ({fmt(ranked.at(-1)![metric])}).</>,
    total ? <>Tiga provinsi teratas ({top3.map((r) => titleCase(r.provinsi)).join(', ')}) menguasai <b className="text-ink">{fmtPct((top3.reduce((s, r) => s + (r[metric] ?? 0), 0) / total) * 100)}</b> dari total {ranked.length} provinsi — sebaran industri masih terpusat.</> : <>Rasio dihitung dari total provinsi (output dibagi tenaga kerja/usaha), bukan rata-rata rasio.</>,
    <>Produktivitas tertinggi (output per tenaga kerja) ada di <b className="text-ink">{titleCase(byProd[0].provinsi)}</b> sebesar {fmtMetric('output_per_tk', byProd[0].output_per_tk)} juta Rp/orang. Provinsi dengan output terbesar belum tentu yang paling produktif.</>,
    <>Wilayah pemekaran Papua belum dilaporkan terpisah untuk 2021–2023, sehingga tidak masuk peringkat tahun tersebut.</>,
  ] : []

  return (
    <>
      <PageHead title="Perbandingan provinsi" desc="Peringkat 38 provinsi berdasarkan indikator yang dipilih. Klik batang provinsi untuk melihat tren lima tahunnya.">
        <Select label="Indikator" value={metric} options={METRICS} onChange={setMetric} />
        <Segmented label="Tahun" value={tahun} options={allYears} onChange={setTahun} />
        <Segmented label="Skala usaha" value={skala} options={SKALA} onChange={setSkala} />
      </PageHead>

      <div className="grid gap-4 xl:grid-cols-[3fr_2fr]">
        <Card title={`${m.label} per provinsi, ${tahun}`} desc={`${ranked.length} provinsi · satuan ${m.unit}`}>
          <Chart
            ariaLabel={`Grafik batang ${m.label} per provinsi tahun ${tahun}`}
            height={Math.max(420, ranked.length * 22 + 20)}
            deps={[ranked, metric, selected]}
            onClick={(name) => {
              const hit = ranked.find((r) => titleCase(r.provinsi) === name)
              if (hit) setPicked(hit.provinsi)
            }}
            build={(t) => {
              const list = [...ranked].reverse()
              return {
                ...baseOption(t),
                legend: { show: false },
                tooltip: { ...baseOption(t).tooltip, trigger: 'item', formatter: (p: { dataIndex: number }) => {
                  const d = list[p.dataIndex]
                  return `<b>${titleCase(d.provinsi)}</b> · peringkat ${ranked.length - p.dataIndex}<br>${m.label}: ${fmt(d[metric])}<br><span style="opacity:.7">Klik untuk melihat tren</span>`
                } },
                grid: { left: 8, right: 84, top: 4, bottom: 4, containLabel: true },
                xAxis: { type: 'value', ...axis(t), axisLabel: { show: false } },
                yAxis: { type: 'category', data: list.map((d) => titleCase(d.provinsi)), ...axis(t),
                  axisLabel: { color: t.ink2, fontSize: 12 } },
                series: [{
                  type: 'bar', barMaxWidth: 14, cursor: 'pointer',
                  data: list.map((d) => ({ value: d[metric],
                    itemStyle: { color: t.series[0], opacity: d.provinsi === selected ? 1 : 0.55, borderRadius: [0, 4, 4, 0] } })),
                  label: { show: true, position: 'right', color: t.ink2, fontSize: 11, formatter: (p: { value: number }) => fmt(p.value) },
                }],
              }
            }}
          />
        </Card>

        <div className="flex flex-col gap-4">
          <Card title={selected ? titleCase(selected) : '–'} desc={`Peringkat ${rank} dari ${ranked.length} · ${m.label.toLowerCase()} ${tahun}`}>
            <div className="mb-3 grid grid-cols-2 gap-3 text-sm">
              <div><div className="text-xs text-ink-3">{m.label}</div><div className="tabular text-lg font-bold">{fmt(selRow?.[metric])}</div></div>
              <div><div className="text-xs text-ink-3">Output per tenaga kerja</div><div className="tabular text-lg font-bold">{fmtMetric('output_per_tk', selRow?.output_per_tk)} <span className="text-xs font-medium text-ink-3">jt Rp</span></div></div>
            </div>
            <Chart
              ariaLabel={`Tren ${m.label} ${selected} per skala usaha`}
              height={240}
              deps={[detail, metric]}
              build={(t) => ({
                ...baseOption(t),
                tooltip: { ...baseOption(t).tooltip, trigger: 'axis', valueFormatter: (v: number) => fmt(v),
                  axisPointer: { type: 'line', lineStyle: { color: t.ink3, type: 'dashed' } } },
                grid: { left: 8, right: 16, top: 36, bottom: 8, containLabel: true },
                xAxis: { type: 'category', data: detail.map((d) => d.tahun), boundaryGap: false, ...axis(t), splitLine: { show: false } },
                yAxis: { type: 'value', ...axis(t), axisLabel: { color: t.ink3, formatter: (v: number) => fmt(v) } },
                series: (['Mikro', 'Kecil'] as const).map((k, i) => ({
                  name: k, type: 'line', data: detail.map((d) => d[k]), symbol: 'circle', symbolSize: 8,
                  lineStyle: { width: 2, color: t.series[i] }, itemStyle: { color: t.series[i], borderColor: t.surface, borderWidth: 2 },
                })),
              })}
            />
          </Card>
          <Insights items={insights} />
        </div>
      </div>
    </>
  )
}
