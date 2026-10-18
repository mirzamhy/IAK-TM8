# ETL manufaktur BPS tahun 2021 sampai 2025

Kelima indikator kini diambil untuk tahun 2021, 2022, 2023, 2024, dan 2025. Sumber ditempatkan di `../data_manufaktur_bps_2021_2025`, terpisah dari paket awal 2025. Terdapat 25 file masukan: 10 CSV asli BPS, 10 XLSX asli BPS, serta lima JSON hasil scraping tabel publik BPS. JSON bukan respons WebAPI.

## Menjalankan lima tahun sekaligus

Klik dua kali `jalankan_etl.bat`. Perintah setara dari folder ETL:

```powershell
py -3 -B etl.py --config-dir config_2021_2025
```

Konfigurasi lima tahun berada di `config_2021_2025/sources.json`. Konfigurasi satu tahun sebelumnya tetap berada di `config/sources.json`. Pipeline menguji cakupan setiap pasangan indikator dan tahun secara terpisah, kemudian menggabungkan menurut kode wilayah, tahun, dan skala. Tahun menjadi bagian kunci unik sehingga data provinsi yang sama pada tahun berbeda tidak saling menimpa.

Hasil disimpan di `data/03_integrated/manufaktur_2021_2025.sqlite`. Database awal `manufaktur.sqlite` tidak menjadi target pemuatan lima tahun.

## Wilayah Papua dan nilai yang tidak tersedia

Tabel BPS menggunakan daftar 38 provinsi dan Indonesia. Namun empat wilayah baru Papua belum mempunyai angka tersendiri pada data 2021 sampai 2023. Pada 2021 sumber menampilkan tanda `-`; pada 2022 dan 2023 sumber menampilkan angka `0`. Catatan BPS menyebut bahwa angka Papua Barat tahun 2023 mencakup Papua Barat Daya, sedangkan Papua mencakup Papua Selatan, Papua Tengah, dan Papua Pegunungan.

Pipeline menerapkan aturan berikut secara eksplisit dalam konfigurasi:

| Data | Penyimpanan fakta sumber | Tampilan analisis |
| --- | --- | --- |
| Tanda `-` pada empat wilayah baru tahun 2021 | NULL | NULL dengan status belum_terpisah |
| Angka 0 pada empat wilayah baru tahun 2022 dan 2023 | 0 sesuai ekspor asli | NULL dengan status belum_terpisah |
| Angka provinsi induk tahun 2021 sampai 2023 | Nilai asli | Nilai asli dengan status induk_sebelum_pemekaran |
| Data tahun 2024 dan 2025 | Nilai asli menurut 38 provinsi | Nilai asli dengan status terpisah |

Aturan ini hanya berlaku pada kode 9200, 9500, 9600, dan 9700 dalam tahun yang ditentukan. Nilai kosong pada provinsi lain tetap menjadi kesalahan yang menghentikan load. Nilai nol pada wilayah yang sudah dilaporkan terpisah tetap dianggap nol yang valid.

## Keluaran untuk dashboard

- `exports/manufaktur_provinsi_2021_2025.csv`: seluruh kombinasi provinsi, tahun, dan skala, dengan status cakupan. Nilai yang belum dilaporkan terpisah kosong, bukan nol palsu.
- `exports/manufaktur_nasional_2021_2025.csv`: total Indonesia menurut tahun dan skala, langsung dari angka BPS.
- `exports/indikator_dashboard_2021_2025.csv`: detail provinsi beserta rasio dan output per usaha/tenaga kerja. Hasil yang tidak tersedia tetap kosong.
- `exports/tren_wilayah_sebanding_2021_2025.csv`: seri dengan 34 kelompok wilayah agar perubahan cakupan Papua tidak disalahartikan sebagai pertumbuhan atau penurunan.

Semua jalur ekspor di atas berada di `data/03_integrated/exports`.

Pada tampilan tren sebanding, data Papua Barat dan Papua Barat Daya tahun 2024 sampai 2025 dijumlahkan. Papua, Papua Selatan, Papua Tengah, dan Papua Pegunungan juga dijumlahkan. Hasilnya dibandingkan dengan cakupan provinsi induk pada tahun 2021 sampai 2023. Ini merupakan hasil pengolahan wilayah, bukan seri tambahan yang diterbitkan BPS.

Jika dashboard menghitung output per tenaga kerja untuk kelompok sebanding, jumlahkan dulu output dan tenaga kerja kelompok tersebut, baru bagi keduanya. Jangan merata-ratakan rasio setiap provinsi. Nilai output dalam lima tahun ini bersifat nominal; kenaikan nilainya tidak otomatis menunjukkan kenaikan volume produksi setelah memperhitungkan harga.

## Bukti proses

Log menyimpan 25 identitas sumber beserta tahun dan checksum masing-masing. Staging mencatat nilai asli yang dinormalisasi, status cakupan, duplikasi, kesalahan, hasil penggabungan, dan selisih agregasi terhadap total Indonesia.

Jalankan `py -3 -B -m unittest discover -v` untuk pengujian. Selain pengujian awal, tersedia pengujian pemisahan kunci dua tahun dan perlakuan wilayah baru yang belum dilaporkan terpisah. Fixture sintetis dalam pengujian hanya dipakai di folder sementara; nilainya tidak dimasukkan ke paket sumber atau database utama.
