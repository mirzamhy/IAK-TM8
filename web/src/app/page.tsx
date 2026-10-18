import Link from 'next/link'
import { EtlFlow } from '@/components/landing/etl-flow'
import { MapSection } from '@/components/landing/map/map-section'
import { Navbar } from '@/components/landing/navbar'
import { CountUp, Reveal } from '@/components/landing/reveal'
import { getLandingData } from '@/lib/data'

const SOURCES = [
  { id: 440, name: 'Jumlah perusahaan', unit: 'unit', format: 'CSV' },
  { id: 441, name: 'Tenaga kerja', unit: 'orang', format: 'XLSX' },
  { id: 442, name: 'Nilai input', unit: 'juta rupiah', format: 'JSON' },
  { id: 443, name: 'Nilai output', unit: 'juta rupiah', format: 'CSV' },
  { id: 446, name: 'Pengeluaran tenaga kerja', unit: 'juta rupiah', format: 'XLSX' },
]

const PROCESS = [
  ['Duplikasi', 'Setiap file sumber disalin apa adanya ke tabel raw per format, sehingga data asli tetap bisa ditelusuri.'],
  ['Transformasi', 'Nama provinsi diseragamkan, tanda "-" menjadi kosong, titik ribuan dihapus, kolom Mikro/Kecil dijadikan baris.'],
  ['Deduplikasi', 'Baris dengan provinsi, tahun, skala, dan indikator yang sama hanya disimpan satu kali.'],
  ['Sinkronisasi', 'Fakta dimuat dengan insert/update per kunci, sehingga ETL bisa dijalankan ulang tanpa menggandakan data.'],
]

const TECH = [
  ['Pentaho Data Integration', 'ETL 8 transformation'],
  ['SQLite', 'Data warehouse skema bintang'],
  ['Next.js 16', 'Website & login'],
  ['Three.js', 'Peta 3D'],
  ['ECharts', 'Grafik interaktif'],
]


export default async function Landing() {
  const d = await getLandingData()
  const stats = [
    { label: 'unit usaha', value: d.latest.usaha, fmt: 'juta' as const },
    { label: 'tenaga kerja', value: d.latest.tenagaKerja, fmt: 'juta' as const },
    { label: 'nilai output', value: d.latest.output, fmt: 'triliun' as const },
    { label: 'provinsi', value: d.latest.provinsi, fmt: 'bulat' as const },
  ]
  const stages = [
    { level: 'Level 1', title: 'Raw', tables: ['raw_csv', 'raw_excel', 'raw_json'], count: d.etl.raw, note: `${d.etl.files} file BPS disalin per format tanpa diubah.` },
    { level: 'Level 2', title: 'Staging', tables: ['stg_manufaktur'], count: d.etl.staging, note: 'Data bersih: satu baris per provinsi, tahun, dan skala usaha.' },
    { level: 'Level 3', title: 'Warehouse', tables: ['dim_wilayah', 'dim_waktu', 'dim_skala', 'fact_manufaktur'], count: d.etl.fact, note: 'Skema bintang yang dibaca dashboard.' },
  ]

  return (
    <>
      <Navbar />
      <main>
        {/* Hero: peta 3D penuh layar, judul di kiri bawah */}
        <section className="relative h-[100svh] min-h-[640px] overflow-hidden">
          <MapSection years={d.years} output={d.output} names={d.names} />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-bg via-bg/70 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10">
            <div className="mx-auto max-w-6xl px-4 pb-10 md:px-8 md:pb-14">
              <p className="text-xs font-semibold tracking-[0.18em] text-ink-3 uppercase">Tugas Integrasi Aplikasi Korporasi</p>
              <h1 className="mt-2 text-[clamp(52px,11vw,152px)] leading-[0.9] font-extrabold tracking-[-0.04em]">MANUFAKTUR</h1>
              <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
                <p className="max-w-xl text-base text-ink-2 md:text-lg">
                  Industri mikro & kecil Indonesia, {d.years[0]}–{d.years.at(-1)}. Lima tabel BPS dalam tiga format
                  diintegrasikan lewat ETL menjadi satu data warehouse.
                </p>
                <div className="pointer-events-auto flex flex-wrap gap-3">
                  <Link href="/dashboard" className="rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-accent-ink hover:brightness-105">Masuk dashboard</Link>
                  <a href="#etl" className="rounded-lg border border-line bg-surface/80 px-5 py-3 text-sm font-semibold backdrop-blur hover:border-ink-3">Lihat alur ETL</a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Angka kunci */}
        <section id="data" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 md:px-8">
          <Reveal>
            <p className="text-sm font-semibold text-accent">Nasional · {d.latest.tahun}</p>
            <h2 className="mt-1 max-w-2xl text-3xl font-bold tracking-tight md:text-4xl">Jutaan usaha kecil yang menggerakkan manufaktur</h2>
          </Reveal>
          <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
            {stats.map((s, i) => (
              <Reveal key={s.label} delay={i * 120}>
                <div className="border-t-2 border-accent pt-4">
                  <div className="text-[clamp(32px,4.5vw,52px)] leading-none font-extrabold tracking-tight"><CountUp value={s.value} format={s.fmt} /></div>
                  <div className="mt-2 text-sm text-ink-2">{s.label}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Tentang dan sumber data */}
        <section className="border-y border-line bg-surface">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 md:grid-cols-[2fr_3fr] md:px-8">
            <Reveal>
              <p className="text-sm font-semibold text-accent">Tentang proyek</p>
              <h2 className="mt-1 text-3xl font-bold tracking-tight">Lima tabel, tiga format, satu sumber kebenaran</h2>
              <p className="mt-4 text-ink-2">
                Data industri manufaktur mikro dan kecil dari Badan Pusat Statistik tersebar di tabel terpisah dengan format
                berbeda. Proyek ini menyatukannya menjadi data warehouse agar bisa dibandingkan per provinsi, tahun, dan skala usaha.
              </p>
            </Reveal>
            <ul className="grid gap-3 sm:grid-cols-2">
              {SOURCES.map((s, i) => (
                <Reveal key={s.id} delay={i * 80}>
                  <li className="flex h-full items-start justify-between gap-3 rounded-xl border border-line bg-bg p-4">
                    <div>
                      <div className="text-xs text-ink-3">Tabel BPS {s.id}</div>
                      <div className="mt-0.5 font-semibold">{s.name}</div>
                      <div className="text-xs text-ink-3">{s.unit} · 2021–2025</div>
                    </div>
                    <span className="rounded-md bg-accent/12 px-2 py-0.5 text-xs font-bold text-accent">{s.format}</span>
                  </li>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>

        {/* Alur ETL */}
        <section id="etl" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 md:px-8">
          <Reveal>
            <p className="text-sm font-semibold text-accent">Alur ETL</p>
            <h2 className="mt-1 max-w-2xl text-3xl font-bold tracking-tight md:text-4xl">Dari file mentah ke data warehouse</h2>
            <p className="mt-3 max-w-2xl text-ink-2">Dikerjakan dengan Pentaho Data Integration dalam delapan transformation. Angka di bawah dibaca langsung dari database.</p>
          </Reveal>
          <div className="mt-10"><EtlFlow stages={stages} /></div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PROCESS.map(([t, desc], i) => (
              <Reveal key={t} delay={i * 100}>
                <h3 className="font-semibold">{t}</h3>
                <p className="mt-1 text-sm text-ink-2">{desc}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Teknologi */}
        <section id="teknologi" className="border-t border-line bg-surface">
          <div className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 md:px-8">
            <p className="text-sm font-semibold text-accent">Teknologi</p>
            <ul className="mt-5 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-5">
              {TECH.map(([name, role]) => (
                <li key={name} className="bg-surface p-4">
                  <div className="font-semibold">{name}</div>
                  <div className="text-xs text-ink-3">{role}</div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Penutup */}
        <section className="mx-auto max-w-6xl px-4 py-20 text-center md:px-8">
          <h2 className="mx-auto max-w-xl text-3xl font-bold tracking-tight md:text-4xl">Jelajahi datanya per provinsi, tahun, dan skala</h2>
          <p className="mx-auto mt-3 max-w-lg text-ink-2">Dashboard berisi grafik interaktif, perbandingan Mikro vs Kecil, tabel lengkap yang bisa diunduh, dan status ETL.</p>
          <Link href="/dashboard" className="mt-8 inline-block rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-accent-ink hover:brightness-105">Masuk dashboard</Link>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-xs text-ink-3 md:flex-row md:justify-between md:px-8">
          <p>Sumber data: Badan Pusat Statistik (bps.go.id), tabel 440, 441, 442, 443, 446.</p>
          <p>
            Batas provinsi:{' '}
            <a className="underline hover:text-ink" href="https://github.com/denyherianto/indonesia-geojson-topojson-maps-with-38-provinces">Indonesia GeoJSON (38 Provinces)</a>,{' '}
            <a className="underline hover:text-ink" href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>, disederhanakan ·{' '}
            <a className="underline hover:text-ink" href="https://github.com/mirzamhy/IAK-TM8">Kode sumber</a>
          </p>
        </div>
      </footer>
    </>
  )
}
