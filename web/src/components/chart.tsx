'use client'

import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, LegendComponent, MarkLineComponent, TooltipComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { SVGRenderer } from 'echarts/renderers'
import { useEffect, useRef } from 'react'

echarts.use([BarChart, LineChart, GridComponent, LegendComponent, TooltipComponent, MarkLineComponent, SVGRenderer])

export type Tokens = {
  ink: string; ink2: string; ink3: string; grid: string; line: string; surface: string; series: string[]; font: string
}

function readTokens(): Tokens {
  const s = getComputedStyle(document.documentElement)
  const v = (n: string) => s.getPropertyValue(n).trim()
  return {
    ink: v('--ink'), ink2: v('--ink-2'), ink3: v('--ink-3'), grid: v('--grid'), line: v('--line'), surface: v('--surface'),
    series: [v('--series-1'), v('--series-2'), v('--series-3')],
    font: getComputedStyle(document.body).fontFamily,
  }
}

/** Opsi dasar: tooltip berbingkai permukaan, legend kiri atas, grid & sumbu redup. */
export function baseOption(t: Tokens) {
  return {
    animationDuration: 350,
    textStyle: { fontFamily: t.font, color: t.ink2 },
    tooltip: {
      backgroundColor: t.surface, borderColor: t.line, borderWidth: 1, padding: [8, 12],
      textStyle: { color: t.ink, fontSize: 13, fontFamily: t.font },
      extraCssText: 'box-shadow:0 6px 18px rgba(0,0,0,.12);border-radius:8px;',
    },
    legend: { top: 0, left: 0, icon: 'roundRect', itemWidth: 12, itemHeight: 12, itemGap: 16, textStyle: { color: t.ink2, fontSize: 12 } },
  }
}

export const axis = (t: Tokens) => ({
  axisLine: { lineStyle: { color: t.line } },
  axisTick: { show: false },
  axisLabel: { color: t.ink3, fontSize: 12 },
  splitLine: { lineStyle: { color: t.grid } },
})

type Props = {
  build: (t: Tokens) => echarts.EChartsCoreOption
  deps: unknown[]
  height?: number
  onClick?: (name: string) => void
  ariaLabel: string
}

export function Chart({ build, deps, height = 320, onClick, ariaLabel }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)
  const clickRef = useRef(onClick)
  useEffect(() => { clickRef.current = onClick }, [onClick])

  useEffect(() => {
    const el = ref.current!
    const chart = echarts.init(el, null, { renderer: 'svg' })
    chartRef.current = chart
    chart.on('click', (p) => clickRef.current?.(String(p.name)))
    const ro = new ResizeObserver(() => chart.resize())
    ro.observe(el)
    return () => { ro.disconnect(); chart.dispose(); chartRef.current = null }
  }, [])

  useEffect(() => {
    const render = () => chartRef.current?.setOption(build(readTokens()), true)
    render()
    const mq = matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', render)
    window.addEventListener('themechange', render)
    return () => { mq.removeEventListener('change', render); window.removeEventListener('themechange', render) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return <div ref={ref} role="img" aria-label={ariaLabel} style={{ height }} className="w-full" />
}
