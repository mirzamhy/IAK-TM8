export type Skala = 'Mikro' | 'Kecil'

/** Satu baris vw_manufaktur: satu wilayah, satu tahun, satu skala usaha. */
export type Row = {
  kode: string
  provinsi: string
  nasional: boolean
  tahun: number
  skala: Skala
  jumlah_perusahaan: number | null
  tenaga_kerja: number | null
  nilai_input: number | null
  nilai_output: number | null
  pengeluaran_tk: number | null
  nilai_tambah: number | null
}

export type Measure = 'jumlah_perusahaan' | 'tenaga_kerja' | 'nilai_input' | 'nilai_output' | 'pengeluaran_tk' | 'nilai_tambah'
export type Ratio = 'output_per_tk' | 'output_per_usaha' | 'tk_per_usaha'
export type Metric = Measure | Ratio

export type EtlLevel = {
  title: string
  tables: { name: string; desc: string; count: number; loadedAt: string | null }[]
}

export type SessionUser = { username: string; role: 'admin' | 'viewer' }
