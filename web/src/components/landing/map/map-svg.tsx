import type { GeoFile } from './geo'

/** Peta 2D statis: tampil selama peta 3D dimuat dan sebagai cadangan tanpa WebGL. */
export function MapSvg({ geo }: { geo: GeoFile }) {
  return (
    <svg viewBox="-24 -8 48 17" className="h-full w-full" aria-hidden preserveAspectRatio="xMidYMid meet">
      <g transform="scale(1,-1)">
        {geo.provinces.map((p) =>
          p.rings.map((r, i) => (
            <path key={`${p.kode}-${i}`} d={`M${r.map(([x, y]) => `${x},${y}`).join('L')}Z`}
              fill="var(--line)" stroke="var(--bg)" strokeWidth={0.05} />
          )),
        )}
      </g>
    </svg>
  )
}
