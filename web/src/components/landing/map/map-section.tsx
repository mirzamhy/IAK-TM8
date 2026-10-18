'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'
import { Segmented } from '@/components/controls'
import { fmtRp, titleCase } from '@/lib/metrics'
import type { GeoFile, Values } from './geo'
import { MapSvg } from './map-svg'

const IndonesiaMap = dynamic(() => import('./indonesia-map'), { ssr: false })

type Props = {
  years: number[]
  output: Record<string, Record<number, number | null>>
  names: Record<string, string>
}

function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') ?? c.getContext('webgl'))
  } catch {
    return false
  }
}

export function MapSection({ years, output, names }: Props) {
  const [year, setYear] = useState(years.at(-1)!)
  const [hovered, setHovered] = useState<string | null>(null)
  const [geo, setGeo] = useState<GeoFile | null>(null)
  const [webgl, setWebgl] = useState<boolean | null>(null)

  useEffect(() => {
    fetch('/geo/provinsi.json')
      .then((r) => r.json())
      .then((g: GeoFile) => { setWebgl(hasWebGL()); setGeo(g) })
      .catch(() => setGeo(null))
  }, [])

  const values: Values = useMemo(
    () => Object.fromEntries(Object.entries(output).map(([k, byYear]) => [k, byYear[year] ?? null])),
    [output, year],
  )
  const max = useMemo(
    () => Math.max(...Object.values(output).flatMap((byYear) => Object.values(byYear).map((v) => v ?? 0))),
    [output],
  )
  const ranking = useMemo(
    () => Object.entries(values).filter(([, v]) => v != null).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0)).map(([k]) => k),
    [values],
  )

  const tooltip = (kode: string) => {
    const v = values[kode]
    const rank = ranking.indexOf(kode) + 1
    return (
      <div className="w-max max-w-56 rounded-lg border border-line bg-surface px-3 py-2 text-[13px] text-ink shadow-lg">
        <div className="font-semibold">{titleCase(names[kode] ?? kode)}</div>
        {v == null
          ? <div className="text-ink-3">Belum dilaporkan terpisah ({year})</div>
          : <div className="text-ink-2">Output {fmtRp(v)} · peringkat {rank}</div>}
      </div>
    )
  }

  return (
    <>
      <div className="absolute inset-0">
        {geo && webgl && (
          <IndonesiaMap geo={geo} values={values} max={max} hovered={hovered} onHover={setHovered} tooltip={tooltip} />
        )}
        {geo && webgl === false && (
          <div className="absolute inset-x-4 top-24 bottom-64 opacity-80"><MapSvg geo={geo} /></div>
        )}
        {!geo && <div className="absolute inset-x-[10%] top-1/4 h-1/3 animate-pulse rounded-[40%] bg-surface-2 motion-reduce:animate-none" />}
      </div>
      <div className="absolute top-20 right-4 z-10 flex flex-col items-end gap-2 md:top-24 md:right-8">
        <Segmented label="Tahun" value={year} options={years} onChange={setYear} />
        <p className="max-w-56 text-right text-xs text-ink-3">
          Tinggi balok = nilai output industri mikro & kecil per provinsi. {webgl ? 'Arahkan kursor atau sentuh provinsi; seret untuk memutar.' : ''}
        </p>
      </div>
    </>
  )
}
