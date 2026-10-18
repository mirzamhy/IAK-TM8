import 'server-only'
import { cacheLife } from 'next/cache'
import { warehouse } from './db'
import type { EtlLevel, Row } from './types'

/** Seluruh isi warehouse (390 baris) — cukup kecil untuk difilter langsung di browser. */
export async function getRows(): Promise<Row[]> {
  'use cache'
  cacheLife('hours')
  const rows = warehouse().prepare(`
    SELECT kode_wilayah_bps AS kode, provinsi, is_nasional, tahun, skala,
           jumlah_perusahaan, tenaga_kerja,
           nilai_input_juta_rupiah AS nilai_input, nilai_output_juta_rupiah AS nilai_output,
           pengeluaran_tenaga_kerja_juta_rupiah AS pengeluaran_tk, nilai_tambah_juta_rupiah AS nilai_tambah
    FROM vw_manufaktur
    ORDER BY is_nasional, kode_wilayah_bps, tahun, skala`).all()
  return rows.map((r) => ({
    kode: String(r.kode),
    provinsi: String(r.provinsi),
    nasional: Number(r.is_nasional) === 1,
    tahun: Number(r.tahun),
    skala: r.skala as Row['skala'],
    jumlah_perusahaan: r.jumlah_perusahaan as number | null,
    tenaga_kerja: r.tenaga_kerja as number | null,
    nilai_input: r.nilai_input as number | null,
    nilai_output: r.nilai_output as number | null,
    pengeluaran_tk: r.pengeluaran_tk as number | null,
    nilai_tambah: r.nilai_tambah as number | null,
  }))
}

export type LandingData = {
  years: number[]
  /** kode BPS → tahun → nilai output Mikro+Kecil (juta Rp); null bila belum dilaporkan terpisah. */
  output: Record<string, Record<number, number | null>>
  names: Record<string, string>
  latest: { tahun: number; usaha: number; tenagaKerja: number; output: number; nilaiTambah: number; provinsi: number }
  etl: { raw: number; staging: number; fact: number; files: number }
}

/** Angka ringkas untuk landing page publik. */
export async function getLandingData(): Promise<LandingData> {
  'use cache'
  cacheLife('hours')
  const rows = await getRows()
  const years = [...new Set(rows.map((r) => r.tahun))].sort((a, b) => a - b)
  const output: LandingData['output'] = {}
  const names: LandingData['names'] = {}
  for (const r of rows) {
    if (r.nasional) continue
    names[r.kode] = r.provinsi
    const cell = (output[r.kode] ??= {})
    // Wilayah yang belum dilaporkan terpisah (Papua 2021–2023) tercatat 0 atau kosong di BPS.
    const reported = (r.jumlah_perusahaan ?? 0) > 0
    cell[r.tahun] = reported ? (cell[r.tahun] ?? 0) + (r.nilai_output ?? 0) : (cell[r.tahun] ?? null)
  }
  const last = years.at(-1)!
  const nat = rows.filter((r) => r.nasional && r.tahun === last)
  const sum = (k: 'jumlah_perusahaan' | 'tenaga_kerja' | 'nilai_output' | 'nilai_tambah') => nat.reduce((s, r) => s + (r[k] ?? 0), 0)
  const status = await getEtlStatus()
  const count = (name: string) => status.levels.flatMap((l) => l.tables).find((t) => t.name === name)?.count ?? 0
  return {
    years,
    output,
    names,
    latest: {
      tahun: last, usaha: sum('jumlah_perusahaan'), tenagaKerja: sum('tenaga_kerja'), output: sum('nilai_output'),
      nilaiTambah: sum('nilai_tambah'), provinsi: Object.keys(names).length,
    },
    etl: {
      raw: status.levels[0].tables.reduce((s, t) => s + t.count, 0),
      staging: count('stg_manufaktur'),
      fact: count('fact_manufaktur'),
      files: status.files,
    },
  }
}

const LEVELS:{ title: string; tables: [string, string][] }[] = [
  { title: 'Level 1 · Raw', tables: [
    ['raw_csv', 'CSV — jumlah usaha (440), nilai output (443)'],
    ['raw_excel', 'XLSX — tenaga kerja (441), pengeluaran TK (446)'],
    ['raw_json', 'JSON — nilai input (442)'],
  ] },
  { title: 'Level 2 · Staging', tables: [['stg_manufaktur', 'Data bersih per provinsi–tahun–skala']] },
  { title: 'Level 3 · Warehouse', tables: [
    ['dim_wilayah', 'Dimensi wilayah (kode BPS)'],
    ['dim_waktu', 'Dimensi tahun'],
    ['dim_skala', 'Dimensi skala usaha'],
    ['fact_manufaktur', 'Tabel fakta'],
  ] },
]

export async function getEtlStatus(): Promise<{ levels: EtlLevel[]; files: number; viewRows: number }> {
  'use cache'
  cacheLife('minutes')
  const db = warehouse()
  const levels = LEVELS.map(({ title, tables }) => ({
    title,
    tables: tables.map(([name, desc]) => {
      const count = Number(db.prepare(`SELECT COUNT(*) AS n FROM ${name}`).get()?.n ?? 0)
      const loadedAt = name.startsWith('raw_')
        ? ((db.prepare(`SELECT MAX(loaded_at) AS t FROM ${name}`).get()?.t as string | null) ?? null)
        : null
      return { name, desc, count, loadedAt }
    }),
  }))
  const files = Number(db.prepare(`SELECT COUNT(*) AS n FROM (
      SELECT nama_file FROM raw_csv UNION SELECT nama_file FROM raw_excel UNION SELECT nama_file FROM raw_json)`).get()?.n ?? 0)
  const viewRows = Number(db.prepare('SELECT COUNT(*) AS n FROM vw_manufaktur').get()?.n ?? 0)
  return { levels, files, viewRows }
}
