# Data manufaktur mikro dan kecil BPS tahun 2025

Paket ini berisi lima dataset industri pengolahan skala mikro dan kecil menurut provinsi. Semua data mengacu pada tahun 2025. Pengambilan dilakukan pada 18 Oktober 2026 dengan MCP browser dan agen pemeriksa sumber. Tabel BPS menampilkan tanggal pembaruan 16 September 2026; tahun pembaruan berbeda dari tahun data.

## Lima file masukan

| Indikator | File | Cara pengambilan |
| --- | --- | --- |
| Jumlah perusahaan | raw_native/440_jumlah_perusahaan_2025.csv | Unduhan CSV asli dari menu Unduh BPS |
| Jumlah tenaga kerja | raw_native/441_tenaga_kerja_2025.xlsx | Unduhan XLSX asli dari menu Unduh BPS |
| Nilai input | raw_json/442_nilai_input_2025.json | Ekstraksi tabel yang terlihat melalui MCP browser, disimpan sebagai JSON |
| Nilai output | raw_native/443_nilai_output_2025.csv | Unduhan CSV asli dari menu Unduh BPS |
| Pengeluaran untuk tenaga kerja | raw_native/446_pengeluaran_tenaga_kerja_2025.xlsx | Unduhan XLSX asli dari menu Unduh BPS |

File CSV dan XLSX di raw_native tidak diubah setelah diunduh. Struktur aslinya memiliki empat baris judul/header, kemudian data 38 provinsi dan satu baris Indonesia. Kedua kategori, Mikro dan Kecil, dipertahankan.

**Asal JSON:** tombol JSON pada halaman BPS menampilkan alamat WebAPI dengan parameter kunci akses. Paket ini tidak memakai kunci akses dan tidak mengklaim mengambil respons WebAPI. File JSON nilai input merupakan hasil scraping isi tabel publik yang terlihat di browser, dengan metadata sumber dan metode di dalam file. Pada laporan, jelaskan perbedaan ini. Tiga format masukan yang diproses adalah CSV, XLSX, dan JSON; asal format JSON harus ditulis sebagai hasil ekstraksi HTML, bukan format unduhan asli BPS.

## Data yang sudah digabung

- `siap_integrasi/manufaktur_provinsi_2025.csv`: 76 baris, yaitu 38 provinsi dikali dua skala industri. Gunakan file ini untuk perbandingan antarprovinsi.
- `siap_integrasi/manufaktur_nasional_2025.csv`: dua baris total Indonesia menurut skala, sesuai angka nasional yang diterbitkan BPS.
- `siap_integrasi/data_terintegrasi.json`: data provinsi dan nasional dalam dua kelompok terpisah, disertai satuan.

Kunci penggabungan adalah `kode_wilayah_bps + tahun + skala`. Kode wilayah empat digit mengikuti dimensi wilayah di tabel BPS; kode 9999 menunjuk Indonesia. Nama dan kode wilayah diambil dari data publik pada halaman indikator jumlah perusahaan, kemudian digunakan untuk mencocokkan kelima tabel.

Kolom nilai:

| Kolom | Satuan |
| --- | --- |
| jumlah_perusahaan | Unit |
| tenaga_kerja | Orang |
| nilai_input_juta_rupiah | Juta rupiah |
| nilai_output_juta_rupiah | Juta rupiah |
| pengeluaran_tenaga_kerja_juta_rupiah | Juta rupiah |

CSV siap integrasi menggunakan UTF-8 dengan BOM, pemisah koma, dan angka tanpa pemisah ribuan. Data asli dalam juta rupiah tidak dikalikan satu juta pada file gabungan. Jika dashboard ingin menampilkan rupiah, konversikan secara eksplisit.

## Pemeriksaan yang sudah dilakukan

1. Kelima sumber menunjukkan tahun 2025, 39 wilayah termasuk Indonesia, dan dua skala industri.
2. Sebanyak 390 nilai sumber diperiksa sebagai angka nonnegatif dan lengkap.
3. Tidak ditemukan duplikat kunci atau perbedaan cakupan wilayah antarindikator.
4. Judul, satuan, kategori, dan tahun pada header CSV/XLSX diperiksa sebelum penggabungan.
5. File gabungan dibuka kembali untuk memeriksa jumlah barisnya.
6. Jumlah provinsi dibandingkan dengan total nasional per indikator dan skala. Ada selisih kecil, dengan rincian di `dokumentasi/hasil_validasi.json`. BPS mencantumkan catatan perbedaan digit terakhir akibat pembulatan. Nilai sumber dan total nasional tetap dipertahankan.

Jangan menjumlahkan baris Indonesia bersama baris provinsi. Untuk indikator nasional gunakan angka BPS pada file nasional; jika menampilkan jumlah hasil agregasi provinsi, beri label yang membedakannya.

## Dokumentasi sumber

- `dokumentasi/sumber_data.json`: URL sumber, ID indikator, satuan, metode pengambilan, tanggal, dan SHA-256 file masukan.
- `dokumentasi/kamus_data.csv`: arti kolom dan tipe datanya.
- `dokumentasi/hasil_validasi.json`: hasil pemeriksaan dan selisih agregasi terhadap angka nasional.

Data ini merupakan agregat statistik BPS, bukan data transaksi internal pabrik. Nilai output adalah nilai moneter; output per tenaga kerja bukan jumlah barang fisik. Pengeluaran tenaga kerja dibagi seluruh pekerja juga tidak otomatis berarti rata-rata gaji karena cakupan pekerja dibayar perlu diperiksa terlebih dahulu.

Paket ini menyiapkan sumber dan hasil penggabungan. Fitur login, dashboard, sinkronisasi revisi, dan dokumentasi tiga level data dalam aplikasi belum dibuat dalam tahap pengambilan data ini.
