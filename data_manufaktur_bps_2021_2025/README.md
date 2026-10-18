# Data manufaktur BPS 2021 sampai 2025

Lima indikator diambil untuk lima tahun, menghasilkan 25 file sumber. Folder raw_native memuat 10 CSV dan 10 XLSX unduhan BPS. Folder raw_json memuat lima JSON hasil scraping tabel HTML publik; bukan respons WebAPI.

Tahun yang tertera adalah tahun data. Pengambilan dilakukan pada 18 Oktober 2026. Metadata URL, metode, checksum, serta catatan sumber ada di dokumentasi/sumber_data_25_file.json, metadata_a.json, dan metadata_b.json.

Setiap tabel mengikuti daftar 38 provinsi dan Indonesia, dengan dua skala Mikro/Kecil. Daftar tersebut tidak berarti seluruh provinsi sudah memiliki angka tersendiri pada seluruh tahun. Empat provinsi baru Papua ditandai - pada 2021 dan 0 pada 2022-2023. Jangan mengartikan nilai tersebut sebagai pengukuran aktivitas nol; angka masih tercakup dalam provinsi induk.

ETL di ../etl telah menggabungkan kelima indikator untuk seluruh tahun. Lihat ../etl/LIMA_TAHUN.md untuk perlakuan nilai yang belum tersedia, sumber asli, dan wilayah sebanding. Keluaran terbaru ada di ../etl/data/03_integrated/exports.
