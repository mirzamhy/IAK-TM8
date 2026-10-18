import { Suspense } from 'react'
import { Card, PageHead, Skeleton } from '@/components/ui'
import { requireAdmin } from '@/lib/auth'
import { getEtlStatus } from '@/lib/data'
import { fmtInt } from '@/lib/metrics'

export default function Page() {
  return (
    <>
      <PageHead
        title="Status ETL"
        desc="Jumlah baris di setiap level data hasil ETL Pentaho, beserta pemeriksaan kelengkapan. Hanya bisa dibuka admin."
      />
      <Suspense fallback={<Skeleton h={420} />}>
        <Content />
      </Suspense>
    </>
  )
}

async function Content() {
  await requireAdmin()
  const { levels, files, viewRows } = await getEtlStatus()
  const raw = levels[0].tables.reduce((s, t) => s + t.count, 0)
  const stg = levels[1].tables[0].count
  const fact = levels[2].tables.find((t) => t.name === 'fact_manufaktur')!.count
  const checks = [
    { label: 'Raw = 25 file × 39 wilayah', ok: raw === 975, info: `${fmtInt(raw)} baris dari ${files} file` },
    { label: 'Staging = 39 wilayah × 5 tahun × 2 skala', ok: stg === 390, info: `${fmtInt(stg)} baris` },
    { label: 'Setiap fakta terhubung ke 3 dimensi', ok: viewRows === fact && fact > 0, info: `${fmtInt(viewRows)} dari ${fmtInt(fact)} baris fakta` },
  ]
  const loaded = levels[0].tables.map((t) => t.loadedAt).filter(Boolean).sort().at(-1)

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-3">
        {levels.map((lv, i) => (
          <Card key={lv.title} title={lv.title} desc={['Salinan teks sumber per format', 'Data bersih dan seragam', 'Skema bintang untuk analisis'][i]}>
            <ul>
              {lv.tables.map((t) => (
                <li key={t.name} className="flex items-center justify-between gap-3 border-t border-line py-2.5">
                  <div>
                    <code className="text-[13px] font-semibold">{t.name}</code>
                    <div className="text-xs text-ink-3">{t.desc}</div>
                  </div>
                  <span className="tabular text-lg font-bold">{fmtInt(t.count)}</span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <Card title="Pemeriksaan kelengkapan" desc={loaded ? `Raw terakhir dimuat ${loaded}` : undefined}>
          <ul>
            {checks.map((c) => (
              <li key={c.label} className="flex items-start justify-between gap-3 border-t border-line py-2.5 text-sm">
                <div>
                  <div className="font-medium">{c.label}</div>
                  <div className="text-xs text-ink-3">{c.info}</div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${c.ok ? 'bg-good/15 text-good' : 'bg-critical/15 text-critical'}`}>
                  {c.ok ? '✓ Lolos' : '✕ Gagal'}
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Alur proses" desc="Transformation Pentaho yang dijalankan berurutan">
          <ol className="space-y-2 text-sm text-ink-2">
            {[
              ['1–3', 'raw_csv, raw_excel, raw_json', 'Ekstraksi tiap format'],
              ['4', 'stg_manufaktur', 'Pembersihan, deduplikasi, pivot'],
              ['5–7', 'dim_wilayah, dim_waktu, dim_skala', 'Pembentukan dimensi'],
              ['8', 'fact_manufaktur', 'Lookup surrogate key, insert/update'],
            ].map(([n, tbl, d]) => (
              <li key={n} className="flex gap-3">
                <span className="tabular w-9 flex-none rounded-md bg-surface-2 py-0.5 text-center text-xs font-bold text-ink">{n}</span>
                <span><code className="text-[13px] text-ink">{tbl}</code> — {d}</span>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  )
}
