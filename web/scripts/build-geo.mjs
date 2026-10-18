// Membuat public/geo/provinsi.json dari GeoJSON 38 provinsi.
// Sumber: "Indonesia GeoJSON & TopoJSON Maps (38 Provinces)" oleh denyherianto, CC BY 4.0.
// Perubahan: koordinat diproyeksikan ke bidang datar, disederhanakan, pulau sangat kecil dibuang,
// dan setiap provinsi diberi kode wilayah BPS. Jalankan: node scripts/build-geo.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const SRC = path.join(here, 'source', 'indonesia-38-provinces.geojson')
const WILAYAH = path.join(here, '..', '..', 'etl', 'config_2021_2025', 'wilayah.json')
const OUT = path.join(here, '..', 'public', 'geo', 'provinsi.json')

const TOLERANCE = 0.03 // derajat, sekitar 3 km
const MIN_AREA = 0.004 // derajat persegi; pulau lebih kecil dibuang
const LON0 = 118, LAT0 = -2.5

const norm = (s) => s.toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim()
const ALIAS = {
  'DAERAH ISTIMEWA YOGYAKARTA': 'DI YOGYAKARTA',
  'KEPULAUAN BANGKA BELITUNG': 'KEP BANGKA BELITUNG',
  'KEPULAUAN RIAU': 'KEP RIAU',
}

const project = ([lon, lat]) => [lon - LON0, lat - LAT0]

function area(ring) {
  let a = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) a += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1])
  return a / 2
}

function centroid(ring) {
  let x = 0, y = 0, a = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const f = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1]
    x += (ring[j][0] + ring[i][0]) * f
    y += (ring[j][1] + ring[i][1]) * f
    a += f
  }
  return [x / (3 * a), y / (3 * a)]
}

function simplify(points, tol) {
  if (points.length <= 3) return points
  const keep = new Uint8Array(points.length)
  keep[0] = keep[points.length - 1] = 1
  const stack = [[0, points.length - 1]]
  while (stack.length) {
    const [s, e] = stack.pop()
    const [x1, y1] = points[s], [x2, y2] = points[e]
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1e-12
    let max = 0, idx = -1
    for (let i = s + 1; i < e; i++) {
      const d = Math.abs(dy * points[i][0] - dx * points[i][1] + x2 * y1 - y2 * x1) / len
      if (d > max) { max = d; idx = i }
    }
    if (max > tol && idx > 0) { keep[idx] = 1; stack.push([s, idx], [idx, e]) }
  }
  return points.filter((_, i) => keep[i])
}

const round = (v) => Math.round(v * 1000) / 1000

const regions = JSON.parse(fs.readFileSync(WILAYAH, 'utf8')).regions.filter((r) => !r.is_nasional)
const byName = new Map(regions.map((r) => [norm(r.name), r.code]))
const geo = JSON.parse(fs.readFileSync(SRC, 'utf8'))

const provinces = geo.features.map((f) => {
  const raw = norm(f.properties.PROVINSI)
  const kode = byName.get(ALIAS[raw] ?? raw)
  if (!kode) throw new Error(`Provinsi tidak cocok dengan kode BPS: ${f.properties.PROVINSI}`)
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
  // Hanya ring luar; lubang di dalam provinsi tidak relevan untuk peta ini.
  let rings = polys.map((p) => p[0].map(project))
  rings = rings.filter((r) => Math.abs(area(r)) >= MIN_AREA)
  if (!rings.length) rings = [polys.map((p) => p[0].map(project)).sort((a, b) => Math.abs(area(b)) - Math.abs(area(a)))[0]]
  // Provinsi kecil (mis. DKI Jakarta) disederhanakan lebih halus agar bentuknya tidak hilang.
  rings = rings.map((r) => {
    for (const tol of [TOLERANCE, TOLERANCE / 5, TOLERANCE / 25]) {
      const s = simplify(r, tol)
      if (s.length >= 6) return s
    }
    return r
  }).filter((r) => r.length >= 4)
  const biggest = rings.reduce((a, b) => (Math.abs(area(b)) > Math.abs(area(a)) ? b : a))
  return {
    kode,
    nama: f.properties.PROVINSI,
    center: centroid(biggest).map(round),
    rings: rings.map((r) => r.map(([x, y]) => [round(x), round(y)])),
  }
}).sort((a, b) => a.kode.localeCompare(b.kode))

const kodes = new Set(provinces.map((p) => p.kode))
if (kodes.size !== 38 || regions.length !== 38) throw new Error(`Jumlah provinsi tidak 38: ${kodes.size}/${regions.length}`)

const out = {
  attribution: 'Batas provinsi: "Indonesia GeoJSON & TopoJSON Maps (38 Provinces)" oleh denyherianto, CC BY 4.0, disederhanakan.',
  provinces,
}
fs.writeFileSync(OUT, JSON.stringify(out))
const points = provinces.reduce((s, p) => s + p.rings.reduce((t, r) => t + r.length, 0), 0)
console.log(`${provinces.length} provinsi, ${points} titik, ${(fs.statSync(OUT).size / 1024).toFixed(0)} KB -> ${path.relative(process.cwd(), OUT)}`)
