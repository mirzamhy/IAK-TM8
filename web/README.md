# Dasbor Manufaktur Mikro & Kecil

Website dashboard untuk data warehouse hasil ETL Pentaho (`../pentaho_sederhana/manufaktur.sqlite`).

## Teknologi

| Lapisan | Pilihan |
| --- | --- |
| Framework | Next.js 16 (App Router, React Server Components, Cache Components / Partial Prerender) |
| Bahasa | TypeScript |
| Tampilan | Tailwind CSS 4, mode terang dan gelap |
| Grafik | Apache ECharts 6 (tooltip, klik untuk cross-filter) |
| Data | `node:sqlite` bawaan Node 24, membaca warehouse secara read-only |
| Login | Session JWT (jose) di cookie httpOnly, password bcrypt, `proxy.ts` mengunci semua halaman |

## Menjalankan

Kebutuhan: Node.js 24 dan database warehouse hasil ETL Pentaho (`pentaho_sederhana/manufaktur.sqlite`).

```
npm install
npm run dev
```

Buka http://localhost:3000. Untuk mode produksi: `npm run build` lalu `npm start`.

Akun demo (dibuat otomatis di `data/users.sqlite` saat login pertama):

| Username | Password | Akses |
| --- | --- | --- |
| admin | admin123 | Semua halaman, termasuk Status ETL |
| viewer | viewer123 | Semua halaman kecuali Status ETL |

Untuk pemakaian di luar kelas, salin `.env.example` menjadi `.env.local` dan isi `SESSION_SECRET` dengan string acak.

## Halaman

| Halaman | Isi |
| --- | --- |
| Ringkasan | KPI nasional dan perubahan dari tahun sebelumnya, tren nilai produksi, usaha dan tenaga kerja, 10 provinsi teratas |
| Provinsi | Peringkat 38 provinsi untuk 9 indikator; klik batang untuk melihat tren provinsi tersebut per skala |
| Mikro vs Kecil | Komposisi tiap indikator, produktivitas per tahun, tabel angka nasional |
| Eksplorasi data | Seluruh isi warehouse: filter, cari, urutkan, unduh CSV |
| Status ETL | Jumlah baris per level (raw, staging, warehouse) dan pemeriksaan kelengkapan (khusus admin) |

Setiap halaman analisis memiliki panel **Temuan** yang dihitung otomatis dari data yang sedang difilter.

## Struktur

```
src/
  proxy.ts               cek session sebelum halaman dirender
  app/
    login/               halaman login (server action + useActionState)
    (dash)/              halaman yang butuh login, berbagi sidebar
    actions.ts           login dan logout
  lib/
    db.ts                koneksi SQLite warehouse dan akun
    data.ts              query warehouse ('use cache')
    auth.ts, session.ts  verifikasi password, JWT, Data Access Layer
    metrics.ts           agregasi dan format angka
  components/            chart ECharts, kontrol filter, kartu
```
