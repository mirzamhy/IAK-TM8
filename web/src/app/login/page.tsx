import { Suspense } from 'react'
import { LoginForm } from './login-form'

export default function LoginPage() {
  return (
    <div className="grid min-h-screen md:grid-cols-[1.1fr_1fr]">
      <div className="flex flex-col justify-between gap-10 border-b border-line bg-surface-2 px-4 py-8 md:border-r md:border-b-0 md:p-12">
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-[9px] bg-accent text-sm font-bold text-accent-ink">IK</div>
          <span className="text-sm font-semibold">Integrasi Aplikasi Korporasi</span>
        </div>
        <div>
          <h1 className="max-w-[14em] text-[28px] leading-tight font-bold tracking-tight md:text-[34px]">
            Dasbor industri manufaktur mikro dan kecil Indonesia
          </h1>
          <p className="mt-4 max-w-[34em] text-ink-2">
            Lima tabel BPS dalam tiga format (CSV, Excel, JSON) diintegrasikan lewat ETL Pentaho menjadi satu
            data warehouse, lalu disajikan untuk eksplorasi per provinsi, tahun, dan skala usaha.
          </p>
        </div>
        <dl className="flex flex-wrap gap-8">
          {[['5', 'indikator BPS'], ['3', 'format sumber'], ['38', 'provinsi'], ['2021–2025', 'periode']].map(([v, l]) => (
            <div key={l}>
              <dt className="sr-only">{l}</dt>
              <dd className="text-2xl font-bold">{v}</dd>
              <dd className="text-[13px] text-ink-3">{l}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="grid place-items-center px-4 py-10">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
