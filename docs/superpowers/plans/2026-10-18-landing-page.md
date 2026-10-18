# Landing Page 3D Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Landing page publik di `/` dengan peta Indonesia 3D (balok output per provinsi), dashboard dipindah ke `/dashboard/*`.

**Architecture:** Server component membaca warehouse (`'use cache'`) dan mengirim angka ringkas ke komponen client. Peta 3D memakai React Three Fiber, dimuat `dynamic` tanpa SSR, membaca geometri provinsi dari `public/geo/provinsi.json` yang dibuat sekali oleh skrip Node dari GeoJSON CC BY 4.0.

**Tech Stack:** Next.js 16.4 (App Router, Cache Components, `proxy.ts`), React 19.3, three, @react-three/fiber, @react-three/drei, Tailwind 4, node:sqlite.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-10-18-landing-page-design.md`.
- Warna hanya dari token CSS di `web/src/app/globals.css` (terang dan gelap).
- Tanpa nama/NIM; label proyek "Tugas Integrasi Aplikasi Korporasi".
- Atribusi GeoJSON: “Indonesia GeoJSON & TopoJSON Maps (38 Provinces)” oleh denyherianto, CC BY 4.0, disederhanakan.
- Akses: `/`, `/login`, `/geo/*` publik; `/dashboard/*` login; `/dashboard/etl` admin.
- Next 16: gunakan `proxy.ts`, `await cookies()`, `await connection()` sebelum verifikasi JWT.

---

### Task 1: Pindahkan dashboard ke `/dashboard`

**Files:**
- Move: `web/src/app/(dash)/**` → `web/src/app/dashboard/**`
- Modify: `web/src/components/nav.tsx` (href diawali `/dashboard`), `web/src/proxy.ts`, `web/src/app/actions.ts` (redirect login `/dashboard`, logout `/`), `web/src/lib/auth.ts` (`requireAdmin` redirect `/dashboard?akses=ditolak`), `web/src/app/login/login-form.tsx` (default `next` `/dashboard`)

**Interfaces:** Produces route `/dashboard` (ringkasan) dan sub-halaman `provinsi`, `skala`, `data`, `etl`.

- [ ] Pindahkan folder, perbarui link dan redirect.
- [ ] Proxy: tanpa session + path diawali `/dashboard` → `/login?next=…`; ada session + `/login` → `/dashboard`; viewer + `/dashboard/etl` → `/dashboard?akses=ditolak`; selain itu lewat.
- [ ] Verifikasi: `npx tsc --noEmit` bersih; `curl -I /dashboard` → 307 ke `/login`; `curl -I /` → 200 setelah Task 3.
- [ ] Commit `refactor: pindahkan dashboard ke /dashboard`.

### Task 2: Geometri provinsi

**Files:**
- Create: `web/scripts/build-geo.mjs`, `web/public/geo/provinsi.json`, `web/scripts/source/indonesia-38-provinces.geojson`

**Interfaces:** Produces `public/geo/provinsi.json`:
```ts
type GeoFile = { attribution: string; provinces: { kode: string; nama: string; center: [number, number]; rings: [number, number][][] }[] }
```
Koordinat sudah diproyeksikan (equirectangular, x = (lon − 118) × k, y = (lat + 2) × k) dan disederhanakan Douglas–Peucker; `kode` = kode BPS dari `etl/config_2021_2025/wilayah.json`.

- [ ] Skrip membaca GeoJSON, mencocokkan `PROVINSI` ke nama BPS (normalisasi + alias: Daerah Istimewa Yogyakarta→DI YOGYAKARTA, Kepulauan Bangka Belitung→KEP. BANGKA BELITUNG, Kepulauan Riau→KEP. RIAU), gagal bila ada yang tak cocok.
- [ ] Buang ring dengan luas sangat kecil, simplifikasi, bulatkan 3 desimal, titik tengah = centroid ring terbesar.
- [ ] Verifikasi: skrip mencetak `38 provinsi`, ukuran file < 150 KB.
- [ ] Commit `feat: geometri 38 provinsi untuk peta 3D`.

### Task 3: Data landing dan halaman statis

**Files:**
- Create: `web/src/app/page.tsx`, `web/src/components/landing/*` (navbar, hero, stats, sources, etl-flow, tech, footer)
- Modify: `web/src/lib/data.ts` (tambah `getLandingData`)

**Interfaces:**
```ts
type LandingData = {
  years: number[]
  output: Record<string, Record<number, number | null>> // kode BPS → tahun → output juta Rp (Mikro+Kecil), null bila belum dilaporkan terpisah
  names: Record<string, string>
  latest: { tahun: number; usaha: number; tenagaKerja: number; output: number; provinsi: number }
  etl: { raw: number; staging: number; fact: number; files: number }
}
```
- [ ] `getLandingData()` dengan `'use cache'` + `cacheLife('hours')`.
- [ ] Halaman tampil lengkap tanpa peta (placeholder di area hero).
- [ ] Verifikasi: build bersih; total output 2025 = Rp623,2 T.
- [ ] Commit `feat: landing page publik`.

### Task 4: Peta 3D

**Files:**
- Create: `web/src/components/landing/map/indonesia-map.tsx` (Canvas), `provinces.tsx`, `bars.tsx`, `map-section.tsx` (state tahun + tooltip + dynamic import)

**Interfaces:** `IndonesiaMap({ geo, values, year, hovered, onHover })` dengan `values: Record<string, number | null>`.

- [ ] Daratan `ExtrudeGeometry` tipis per provinsi; balok per provinsi tinggi ∝ √output; animasi tinggi saat tahun berganti; hover menyorot dan memunculkan tooltip HTML; orbit otomatis pelan, mati saat reduced motion; cadangan tanpa WebGL.
- [ ] Verifikasi browser: peta tampil, hover, ganti tahun, gelap/terang, lebar 375px.
- [ ] Commit `feat: peta Indonesia 3D di hero`.

### Task 5: Verifikasi akhir dan dokumentasi

- [ ] `tsc`, `eslint`, `next build` bersih; uji akses login/viewer.
- [ ] README `web/` dan root diperbarui (rute baru, atribusi peta).
- [ ] Commit dan push setelah persetujuan.
