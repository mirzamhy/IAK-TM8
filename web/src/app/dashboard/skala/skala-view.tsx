'use client'

import { useMemo, useState } from 'react'
import { axis, baseOption, Chart } from '@/components/chart'
import { Segmented } from '@/components/controls'
import { Card, Insights, PageHead } from '@/components/ui'
import { aggregate, fmtDec, fmtMetric, fmtPct, MEASURES, METRIC, years } from '@/lib/metrics'
import type { Measure, Ratio, Row } from '@/lib/types'

const RATIOS: Ratio[] = ['output_per_tk', 'output_per_usaha', 'tk_per_usaha']

export function SkalaView({ rows }: { rows: Row[] }) {
  const allYears = useMemo(() => years(rows), [rows])
  const [tahun, setTahun] = useState(allYears.at(-1)!)
  const [ratio, setRatio] = useState<Ratio>('output_per_tk')

  const nasional = useMemo(() => rows.filter((r) => r.nasional), [rows])
  const agg = (y: number, s: 'Mikro' | 'Kecil') => aggregate(nasional.filter((r) => r.tahun === y && r.skala === s))
  const mik = agg(tahun, 'Mikro'), kec = agg(tahun, 'Kecil')
  const share = (k: Measure) => {
    const sum = mik[k] + kec[k]
    return sum ? (mik[k] / sum) * 100 : 0
  }
  const trend = allYears.map((y) => ({ tahun: y, Mikro: agg(y, 'Mikro')[ratio], Kecil: agg(y, 'Kecil')[ratio] }))
  const kecFirst = agg(allYears[0], 'Kecil'), kecLast = agg(allYears.at(-1)!, 'Kecil')
  const jump = allYears.slice(1).map((y) => ({
    y, d: ((agg(y, 'Kecil').jumlah_perusahaan - agg(y - 1, 'Kecil').jumlah_perusahaan) / agg(y - 1, 'Kecil').jumlah_perusahaan) * 100,
  })).sort((a, b) => b.d - a.d)[0]

  const insights = [
    <>Pada {tahun}, usaha mikro mencakup <b className="text-ink">{fmtPct(share('jumlah_perusahaan'))}</b> unit usaha dan {fmtPct(share('tenaga_kerja'))} tenaga kerja, tetapi hanya <b className="text-ink">{fmtPct(share('nilai_output'))}</b> nilai output.</>,
    <>Output per tenaga kerja usaha kecil {fmtDec(kec.output_per_tk)} juta Rp/orang, sekitar <b className="text-ink">{fmtDec(mik.output_per_tk ? (kec.output_per_tk ?? 0) / mik.output_per_tk : null)} kali</b> usaha mikro ({fmtDec(mik.output_per_tk)} juta Rp/orang).</>,
    <>Satu usaha kecil rata-rata mempekerjakan {fmtDec(kec.tk_per_usaha)} orang, sedangkan usaha mikro {fmtDec(mik.tk_per_usaha)} orang — usaha mikro umumnya dijalankan pemilik dengan sedikit pekerja.</>,
    <>Jumlah usaha kecil berubah {fmtPct(((kecLast.jumlah_perusahaan - kecFirst.jumlah_perusahaan) / kecFirst.jumlah_perusahaan) * 100)} dari {allYears[0]} ke {allYears.at(-1)}; kenaikan tahunan terbesar terjadi pada {jump.y} ({fmtPct(jump.d)}).</>,
  ]

  return (
    <>
      <PageHead title="Mikro vs Kecil" desc="Perbandingan komposisi dan produktivitas dua skala usaha di tingkat nasional.">
        <Segmented label="Tahun komposisi" value={tahun} options={allYears} onChange={setTahun} />
      </PageHead>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card title={`Komposisi indikator, ${tahun}`} desc="Porsi usaha mikro dan kecil dalam setiap indikator nasional">
          <Chart
            ariaLabel={`Grafik batang bertumpuk komposisi mikro dan kecil tahun ${tahun}`}
            height={330}
            deps={[tahun]}
            build={(t) => {
              const cats = [...MEASURES].reverse()
              return {
                ...baseOption(t),
                tooltip: { ...baseOption(t).tooltip, trigger: 'axis', axisPointer: { type: 'shadow' },
                  formatter: (ps: { dataIndex: number }[]) => {
                    const k = cats[ps[0].dataIndex]
                    return `<b>${METRIC[k].label}</b><br>Mikro: ${fmtMetric(k, mik[k])} (${fmtPct(share(k))})<br>Kecil: ${fmtMetric(k, kec[k])} (${fmtPct(100 - share(k))})`
                  } },
                grid: { left: 8, right: 16, top: 36, bottom: 8, containLabel: true },
                xAxis: { type: 'value', max: 100, ...axis(t), axisLabel: { color: t.ink3, formatter: '{value}%' } },
                yAxis: { type: 'category', data: cats.map((k) => METRIC[k].label), ...axis(t), axisLabel: { color: t.ink2, fontSize: 12 } },
                series: (['Mikro', 'Kecil'] as const).map((name, i) => ({
                  name, type: 'bar', stack: 'total', barMaxWidth: 26,
                  data: cats.map((k) => (i === 0 ? share(k) : 100 - share(k))),
                  itemStyle: { color: t.series[i], borderColor: t.surface, borderWidth: 2, borderRadius: i === 0 ? [4, 0, 0, 4] : [0, 4, 4, 0] },
                  label: { show: true, color: '#fff', fontSize: 12, fontWeight: 600,
                    formatter: (p: { value: number }) => (p.value >= 9 ? `${Math.round(p.value)}%` : '') },
                })),
              }
            }}
          />
        </Card>

        <Card
          title="Produktivitas per tahun"
          desc={`${METRIC[ratio].label} (${METRIC[ratio].unit})`}
          action={<Segmented label="Rasio" value={ratio} options={RATIOS} onChange={setRatio}
            format={(r) => ({ output_per_tk: 'Output/TK', output_per_usaha: 'Output/usaha', tk_per_usaha: 'TK/usaha' })[r]} />}
        >
          <Chart
            ariaLabel={`Grafik kolom ${METRIC[ratio].label} mikro dan kecil per tahun`}
            height={290}
            deps={[trend, ratio]}
            build={(t) => ({
              ...baseOption(t),
              tooltip: { ...baseOption(t).tooltip, trigger: 'axis', axisPointer: { type: 'shadow' },
                valueFormatter: (v: number) => `${fmtMetric(ratio, v)} ${METRIC[ratio].unit}` },
              grid: { left: 8, right: 16, top: 36, bottom: 8, containLabel: true },
              xAxis: { type: 'category', data: trend.map((d) => d.tahun), ...axis(t), splitLine: { show: false } },
              yAxis: { type: 'value', ...axis(t), axisLabel: { color: t.ink3, formatter: (v: number) => fmtMetric(ratio, v) } },
              series: (['Mikro', 'Kecil'] as const).map((k, i) => ({
                name: k, type: 'bar', data: trend.map((d) => d[k]), barMaxWidth: 26, barGap: '12%',
                itemStyle: { color: t.series[i], borderRadius: [4, 4, 0, 0] },
              })),
            })}
          />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[2fr_3fr]">
        <Card title={`Angka nasional ${tahun}`}>
          <table className="tabular w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-3">
                <th className="pb-2 font-medium">Indikator</th>
                <th className="pb-2 text-right font-medium">Mikro</th>
                <th className="pb-2 text-right font-medium">Kecil</th>
              </tr>
            </thead>
            <tbody>
              {[...MEASURES, ...RATIOS].map((k) => (
                <tr key={k} className="border-t border-line">
                  <td className="py-2 text-ink-2">{METRIC[k].label}</td>
                  <td className="py-2 text-right">{fmtMetric(k, mik[k])}</td>
                  <td className="py-2 text-right">{fmtMetric(k, kec[k])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Insights items={insights} />
      </div>
    </>
  )
}
