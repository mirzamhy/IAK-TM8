# Panduan ETL manufaktur BPS 2021 sampai 2025

Versi aktif mengolah lima indikator manufaktur untuk 2021, 2022, 2023, 2024, dan 2025. Semua sumber serta hasil tersimpan di C:\Mirza Personal\IAK. Paket sumber 2025 dan database awalnya tetap tersedia sebagai arsip.

## Menjalankan

Klik dua kali **jalankan_etl.bat**. Alternatif melalui PowerShell:

```powershell
cd 'C:\Mirza Personal\IAK\etl'
py -3 -B etl.py --config-dir config_2021_2025
```

Pipeline menggunakan Python 3.10+ dan SQLite bawaan Python, tanpa instalasi paket tambahan. Perintah tanpa --config-dir juga memilih konfigurasi lima tahun jika folder tersebut tersedia.

## Sumber dan alur

Folder sumber: ../data_manufaktur_bps_2021_2025. Ada 25 file: 10 CSV dan 10 XLSX unduhan asli BPS serta lima JSON hasil scraping tabel HTML publik. JSON bukan respons WebAPI.

1. Extract membaca file masing-masing serta menyimpan versi raw berdasarkan SHA-256.
2. Transform memeriksa header, satuan, tahun, nama wilayah, nilai kosong, duplikasi, dan cakupan; kemudian menggabungkan lima indikator berdasarkan wilayah, tahun, dan skala.
3. Load memasukkan baris baru atau memperbarui nilai yang direvisi dalam transaksi SQLite. Impor ulang nilai yang sama tidak menggandakan baris.

Data berada pada data/01_raw, data/02_staging, dan data/03_integrated. Pembagian tiga lapisan penyimpanan ini perlu dicocokkan dengan penamaan tiga level data dalam materi dosen. Replikasi, deduplikasi, transformasi, dan sinkronisasi dicatat sebagai mekanisme yang berbeda.

## Hasil lima tahun

| Keluaran | Isi |
| --- | --- |
| data/03_integrated/manufaktur_2021_2025.sqlite | Database lima tahun, 390 baris fakta sumber |
| exports/manufaktur_provinsi_2021_2025.csv | 380 baris provinsi, termasuk 24 baris wilayah yang belum dilaporkan terpisah |
| exports/manufaktur_nasional_2021_2025.csv | 10 baris total Indonesia, lima tahun dikali dua skala |
| exports/indikator_dashboard_2021_2025.csv | Detail dan indikator perbandingan |
| exports/tren_wilayah_sebanding_2021_2025.csv | 340 baris, 34 kelompok wilayah sebanding dikali lima tahun dan dua skala |

Semua exports ada di bawah data/03_integrated. Kolom uang tetap dalam juta rupiah. Nilai kosong di keluaran berarti NULL/tidak tersedia, bukan nol.

Empat provinsi baru Papua pada 2021 sampai 2023 belum dilaporkan terpisah. Tanda - tahun 2021 dan angka 0 tahun 2022 sampai 2023 dipertahankan dalam raw/fakta sumber; tampilan analisis menandainya belum_terpisah dan menghasilkan NULL. Angka provinsi induk tahun lama memiliki cakupan berbeda. Untuk tren antarwaktu, gunakan keluaran wilayah sebanding yang menggabungkan kembali wilayah baru pada 2024 sampai 2025.

Penjelasan rinci, kueri, dan perlakuan cakupan ada di **LIMA_TAHUN.md**. README_2025.md dan PENJELASAN_ETL.md menjelaskan versi awal 2025.

## Hasil verifikasi

- Impor pertama memasukkan 390 baris; impor kedua menambah 0, memperbarui 0, mempertahankan 390.
- Seluruh 25 sumber diperiksa tahun dan strukturnya. Tidak ditemukan duplikat kunci.
- Integritas SQLite: ok. Seluruh 76 baris 2025 cocok dengan hasil pengambilan sebelumnya.
- Ada 32 peringatan selisih agregasi, maksimum absolut 6 dalam satuan indikator masing-masing. Angka sumber tetap dipertahankan, sesuai catatan pembulatan BPS.
- Sebanyak 12 pengujian integrasi lolos, termasuk perubahan nilai, konflik duplikat, impor ulang, nilai kosong, cakupan historis, dan kunci lebih dari satu tahun.

Bukti ada di logs/latest.json, logs/verifikasi_database_2021_2025.json, dan logs/hasil_pengujian.txt.

```powershell
py -3 -B -m unittest discover -v
```

Pengujian memakai salinan sementara dan tidak memasukkan nilai sintetis ke database utama.

## Membaca database

Gunakan vw_provinsi, vw_nasional, vw_indikator_dashboard, atau vw_tren_wilayah_sebanding. Jangan menjumlahkan Indonesia bersama provinsi. Gunakan etl_runs untuk proses berhasil dan etl_changes untuk nilai sebelum/sesudah revisi. Kegagalan dan status load_committed dicatat di file log.

Konfigurasi aktif ada di config_2021_2025. Konfigurasi config tetap untuk versi satu tahun. Database lama manufaktur.sqlite berisi 2025; database lima tahun memiliki nama berbeda agar arsip tetap utuh.

## Batas tahap ini

Sinkronisasi terjadi dari file lokal ke database ketika pipeline dijalankan. Unduhan revisi otomatis, penjadwalan, website, login, dan visualisasi interaktif belum dibuat. Sebelum menarik insight tren, perhatikan cakupan wilayah dan bahwa nilai output merupakan nilai nominal, bukan volume produksi atau laba bersih.
