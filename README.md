# ETL Data Industri Manufaktur Mikro dan Kecil BPS 2021–2025

Tugas Integrasi Aplikasi Korporasi. Lima indikator industri manufaktur mikro dan kecil menurut provinsi dari BPS diintegrasikan melalui proses ETL dengan tiga level data: raw, staging, dan warehouse.

## Sumber data

| ID BPS | Indikator | Format | Satuan |
| --- | --- | --- | --- |
| 440 | Jumlah perusahaan | CSV | Unit |
| 441 | Tenaga kerja | XLSX | Orang |
| 442 | Nilai input | JSON | Juta rupiah |
| 443 | Nilai output | CSV | Juta rupiah |
| 446 | Pengeluaran tenaga kerja | XLSX | Juta rupiah |

Setiap indikator tersedia untuk tahun 2021 sampai 2025, sehingga ada 25 file di `data_manufaktur_bps_2021_2025/`. Alamat tabel BPS untuk tiap file tercatat di `etl/config_2021_2025/sources.json`.

## Struktur repositori

```
data_manufaktur_bps_2021_2025/   sumber 2021-2025 (raw_native: CSV/XLSX, raw_json: JSON)
data_manufaktur_bps_2025/        paket awal tahun 2025
etl/                             ETL versi Python
pentaho_sederhana/               ETL versi Pentaho, satu transformation per tabel
pentaho/                         ETL versi Pentaho dalam satu job dengan sinkronisasi dan log perubahan
web/                             website dashboard (Next.js) dengan login dan visualisasi
```

## Dashboard

Website di folder `web/` membaca `pentaho_sederhana/manufaktur.sqlite`. Jalankan ETL Pentaho dulu, lalu:

```
cd web
npm install
npm run dev
```

Buka http://localhost:3000 dan masuk dengan akun demo `admin` / `admin123`. Detail teknologi dan halaman ada di `web/README.md`.

## Menjalankan ETL Pentaho (versi sederhana)

Kebutuhan: Pentaho Data Integration (PDI) 9.3 dan Java.

1. Buka Spoon, lalu buka file di `pentaho_sederhana/`.
2. Jalankan berurutan:

| Urutan | File | Level | Isi |
| --- | --- | --- | --- |
| 1 | `1_raw_csv.ktr` | Raw | CSV ke `raw_csv` |
| 2 | `2_raw_excel.ktr` | Raw | XLSX ke `raw_excel` |
| 3 | `3_raw_json.ktr` | Raw | JSON ke `raw_json` |
| 4 | `4_staging.ktr` | Staging | Gabung tiga raw, bersihkan angka, hapus duplikat, satu baris per provinsi-tahun-skala |
| 5 | `5_dim_wilayah.ktr` | Warehouse | Dimensi wilayah dengan kode BPS |
| 6 | `6_dim_waktu.ktr` | Warehouse | Dimensi tahun |
| 7 | `7_dim_skala.ktr` | Warehouse | Dimensi skala (Mikro, Kecil) |
| 8 | `8_fact_manufaktur.ktr` | Warehouse | Lookup surrogate key, hitung nilai tambah, insert/update fakta |

Kedelapan langkah juga bisa dijalankan sekaligus lewat `jalankan_semua.kjb`, atau `jalankan.bat` tanpa membuka Spoon. Sebelum memakai `jalankan.bat`, sesuaikan `PDI_HOME` dengan lokasi folder `data-integration`.

Hasil disimpan di `pentaho_sederhana/manufaktur.sqlite`. Struktur tabelnya ada di `schema.sql`, dan view `vw_manufaktur` siap dipakai dashboard.

## Menjalankan ETL Python

```
py -3 -B etl.py --config-dir config_2021_2025
```

Perintah dijalankan dari folder `etl`. Penjelasan proses ada di `etl/PENJELASAN_ETL.md` dan `etl/LIMA_TAHUN.md`.

## Tiga level data

| Level | Pentaho sederhana | Peran |
| --- | --- | --- |
| Raw | `raw_csv`, `raw_excel`, `raw_json` | Salinan teks sumber per format, tanpa perubahan |
| Staging | `stg_manufaktur` | Nama provinsi diseragamkan, `-` menjadi NULL, titik ribuan dihapus, duplikat dibuang, lima indikator digabung |
| Warehouse | `dim_wilayah`, `dim_waktu`, `dim_skala`, `fact_manufaktur` | Skema bintang; sinkronisasi memakai insert/update sehingga eksekusi ulang tidak menggandakan data |

Hasil fakta Pentaho sama persis dengan hasil ETL Python: 39 wilayah × 5 tahun × 2 skala = 390 baris.
