# Penerapan ETL pada data manufaktur BPS

## Tujuan dan sumber data

ETL digunakan untuk mengintegrasikan lima indikator industri manufaktur mikro dan kecil tahun 2025 menurut provinsi: jumlah perusahaan, jumlah tenaga kerja, nilai input, nilai output, dan pengeluaran tenaga kerja. Data berasal dari BPS dan tersedia sebagai dua CSV, dua XLSX, serta satu JSON hasil ekstraksi tabel publik BPS. JSON tersebut bukan respons WebAPI. Database terintegrasi menjadi masukan untuk dashboard perbandingan industri antarprovinsi.

Sumber dibaca langsung dari file masing-masing. Hasil gabungan yang dibuat pada tahap pengambilan sebelumnya hanya digunakan sebagai acuan pemeriksaan akhir, bukan sebagai sumber nilai dalam pipeline. Referensi nama dan kode wilayah digunakan untuk menyamakan identitas provinsi.

## Extract

Pada tahap extract, sistem menyalin setiap file ke penyimpanan raw dan menghitung SHA-256. File dengan isi yang sama memakai snapshot yang sudah ada. Jika isi sumber berubah, sistem menyimpan versi baru dengan checksum berbeda. Langkah ini merupakan replikasi sumber untuk menjaga keterlacakan proses dan menghindari perubahan pada file asli.

Pembaca CSV dan XLSX mengenali empat baris judul/header BPS sebelum mengambil data. Pembaca JSON mengambil tahun, satuan, serta nilai Mikro dan Kecil dari daftar records. Format file yang berbeda diproses oleh pembaca masing-masing, kemudian diarahkan ke struktur yang sama.

## Transform

Nama wilayah dinormalisasi dan dicocokkan dengan referensi kode BPS. Kolom Mikro dan Kecil diubah menjadi baris dengan atribut skala. Tahun dan satuan divalidasi. Angka disimpan tanpa pemisah ribuan, sementara nilai uang tetap menggunakan juta rupiah. Nilai nol dipertahankan; nilai tidak tersedia tidak diganti dengan nol.

Kunci deduplikasi adalah indikator, kode wilayah, tahun, dan skala. Jika dua baris berkunci sama memiliki nilai identik, satu baris dipertahankan dan baris yang disisihkan dicatat. Jika nilainya berbeda, proses dihentikan agar sistem tidak memilih angka secara sembarang.

Setelah pembersihan, setiap indikator harus memuat 39 wilayah, terdiri dari 38 provinsi dan Indonesia, dengan dua skala industri. Kelima indikator digabung berdasarkan kode wilayah, tahun, dan skala. Pemeriksaan cakupan dilakukan sebelum penggabungan sehingga provinsi yang datanya hilang tidak terbuang tanpa pemberitahuan.

## Load dan sinkronisasi

Data dimuat ke SQLite menggunakan kunci unik wilayah, tahun, dan skala. Baris yang belum ada dimasukkan. Baris dengan nilai yang sama dibiarkan tetap. Baris dengan nilai yang direvisi diperbarui, sementara nilai lama dan baru dicatat dalam tabel riwayat perubahan. Dengan mekanisme tersebut, menjalankan pipeline berulang kali tidak menggandakan data.

Load dilakukan dalam transaksi. Jika validasi gagal, fakta lama tidak diubah. Jika transaksi penulisan gagal, perubahan dalam transaksi dibatalkan. Log memuat waktu, sumber, checksum, jumlah data, hasil validasi, serta jumlah baris baru, berubah, dan tetap.

Sinkronisasi pada tahap ini berlangsung dari file lokal ke database saat pipeline dijalankan. Proses belum mengambil revisi secara otomatis dari situs BPS.

## Tiga lapisan penyimpanan

| Lapisan | Penyimpanan | Peran |
| --- | --- | --- |
| Raw | data/01_raw | Salinan sumber asli, versi berdasarkan checksum |
| Staging | data/02_staging | Hasil normalisasi, gabungan, duplikasi, kesalahan, dan peringatan |
| Integrated | data/03_integrated | Database SQLite, tampilan analisis, dan ekspor CSV |

Pembagian ini merupakan arsitektur penyimpanan ETL yang dipakai proyek. Penamaannya perlu disesuaikan dengan definisi tiga level data dalam materi dosen. Replikasi, deduplikasi, transformasi, dan sinkronisasi merupakan mekanisme yang dilakukan pada alur tersebut, bukan nama yang otomatis menggantikan istilah level dari materi kuliah.

## Hasil pelaksanaan dan pemeriksaan

Pada pelaksanaan awal, sistem membaca 390 nilai sumber dan memasukkan 78 baris gabungan. Sebanyak 76 baris merupakan detail provinsi dan dua baris merupakan total Indonesia. Pelaksanaan kedua menghasilkan nol baris baru, nol baris diperbarui, dan 78 baris tetap. Hasil ini menunjukkan impor ulang tidak menggandakan fakta.

Pemeriksaan integritas SQLite menghasilkan status ok. Seluruh 76 baris detail cocok dengan hasil pengambilan data sebelumnya. Checksum kelima file masukan juga sama dengan checksum sebelum ETL, sehingga sumber asli tidak berubah.

Sepuluh pengujian integrasi lolos, termasuk simulasi revisi nilai input Aceh Mikro dari 3.827.146 menjadi 3.827.147 juta rupiah pada salinan data uji. Pipeline memperbarui satu baris, mempertahankan 77 baris, dan menyimpan nilai lama pada riwayat perubahan. Pengujian konflik duplikat menunjukkan load diblokir dan fakta yang sudah tersimpan tetap sama.

Selisih kecil antara jumlah provinsi dan angka nasional dicatat tanpa mengubah sumber. Detail provinsi dan total nasional disediakan melalui tampilan database yang berbeda agar dashboard tidak menghitung Indonesia dua kali.

## Pemanfaatan hasil

Database menyediakan data dasar serta output per tenaga kerja, output per usaha, tenaga kerja per usaha, dan rasio input terhadap output. Pembagian dengan nol menghasilkan nilai tidak tersedia. Angka output merupakan nilai moneter sehingga hasilnya tidak langsung menunjukkan jumlah barang atau produktivitas fisik. Analisis insight dashboard perlu mempertimbangkan komposisi jenis industri dan cakupan indikator.
