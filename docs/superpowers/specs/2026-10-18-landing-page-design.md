# Landing page publik dengan peta Indonesia 3D

Tanggal: 2026-10-18 · Proyek: `web/` (Next.js 16)

## Tujuan

Halaman depan publik yang memperkenalkan proyek ETL manufaktur BPS kepada dosen dan pengunjung tanpa login. Visual utama adalah peta Indonesia 3D dengan balok per provinsi setinggi nilai output industri mikro dan kecil. Dashboard yang ada tetap di balik login.

## Keputusan

| Hal | Keputusan |
| --- | --- |
| Posisi | `/` publik; dashboard pindah ke `/dashboard/*` |
| Visual hero | Peta "kota data": daratan provinsi low-poly + balok 3D per provinsi |
| Isi | Profil proyek: angka kunci, sumber data, alur ETL, teknologi |
| Identitas | Tanpa nama/NIM; hanya "Tugas Integrasi Aplikasi Korporasi" |
| Warna | Token yang sama dengan dashboard (netral hangat + biru, terang/gelap) |
| Teknologi 3D | React Three Fiber + drei |

## Struktur halaman `/`

1. Navbar: nama proyek, anchor (Data · Alur ETL · Teknologi), tombol **Masuk dashboard**. Transparan di atas hero, solid setelah scroll.
2. Hero satu layar: peta 3D; teks kiri bawah berisi label "Tugas Integrasi Aplikasi Korporasi", judul **MANUFAKTUR**, subjudul "Industri mikro & kecil Indonesia, 2021–2025", satu kalimat ringkas, tombol **Masuk dashboard** dan **Lihat alur ETL**. Pemilih tahun di pojok peta.
3. Angka kunci (tahun terbaru, nasional): jumlah usaha, tenaga kerja, nilai output, jumlah provinsi. Angka menghitung naik saat terlihat.
4. Tentang proyek: tujuan dua kalimat + kartu 5 sumber BPS (ID tabel, indikator, badge format).
5. Alur ETL: tiga kolom Raw → Staging → Warehouse dengan nama tabel dan jumlah baris dari database; garis aliran beranimasi saat terlihat. Empat poin: duplikasi, transformasi, deduplikasi, sinkronisasi.
6. Teknologi: Pentaho PDI, SQLite, Next.js, Three.js, ECharts.
7. Penutup: CTA ke login, sumber data BPS, tautan GitHub.

## Peta 3D

Data server: `getLandingData()` dengan `'use cache'` mengembalikan nilai output per kode provinsi × tahun (skala dijumlahkan), angka kunci nasional, dan jumlah baris tiap tabel ETL. GeoJSON 38 provinsi yang disederhanakan disimpan di `public/geo/provinsi.json`, dicocokkan lewat kode BPS.

Komponen client (dimuat `dynamic` tanpa SSR):

| Komponen | Tugas |
| --- | --- |
| `IndonesiaMap` | Canvas R3F, kamera, cahaya, orbit otomatis pelan yang berhenti saat interaksi |
| `Provinces` | Proyeksi GeoJSON ke bidang datar, `ExtrudeGeometry` tipis per provinsi |
| `Bars` | 38 balok di titik tengah provinsi; tinggi berskala akar; animasi saat tahun berganti |
| Tooltip | Hover menyorot provinsi dan menampilkan nama, output, peringkat |
| `YearPicker` | Tombol tahun di luar canvas |

Warna dibaca dari token CSS (`--surface-2` daratan, `--series-1` balok). Wilayah pemekaran Papua 2021–2023 tidak diberi balok; tooltip menulis "belum dilaporkan terpisah".

Cadangan dan performa: placeholder statis selama peta dimuat; tanpa WebGL tampil pesan dan placeholder; `prefers-reduced-motion` mematikan orbit dan animasi; `dpr` dibatasi `[1, 2]`.

## Routing dan auth

- `(dash)` menjadi `app/dashboard/*`; link sidebar, redirect login (`/dashboard`), dan logout (`/`) diperbarui.
- Proxy: publik untuk `/`, `/login`, aset statis dan `/geo/*`; `/dashboard/*` wajib login; `/dashboard/etl` khusus admin; pengguna login yang membuka `/login` diarahkan ke `/dashboard`.

## Pengujian

- `tsc`, `eslint`, `next build` bersih.
- Browser: `/` terbuka tanpa login, peta tampil, hover tooltip, ganti tahun, mode gelap/terang, lebar 375px, `/dashboard` tanpa login dialihkan, viewer tidak bisa membuka `/dashboard/etl`.
- Total output 2025 di landing = Rp623,2 T (sama dengan dashboard).

## Di luar cakupan

Kamera yang mengikuti scroll, versi bahasa Inggris, halaman tim.
