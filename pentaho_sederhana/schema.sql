-- Skema database ETL manufaktur BPS 2021-2025 (versi Pentaho sederhana)
-- LEVEL 1 RAW       : raw_csv, raw_excel, raw_json  (salinan teks sumber per format)
-- LEVEL 2 STAGING   : stg_manufaktur                (data bersih, satu baris per provinsi-tahun-skala)
-- LEVEL 3 WAREHOUSE : dim_wilayah, dim_waktu, dim_skala, fact_manufaktur, vw_manufaktur

CREATE TABLE IF NOT EXISTS raw_csv (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nama_file TEXT NOT NULL, provinsi TEXT, mikro TEXT, kecil TEXT,
  loaded_at TEXT NOT NULL DEFAULT (datetime('now','localtime')));

CREATE TABLE IF NOT EXISTS raw_excel (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nama_file TEXT NOT NULL, provinsi TEXT, mikro TEXT, kecil TEXT,
  loaded_at TEXT NOT NULL DEFAULT (datetime('now','localtime')));

CREATE TABLE IF NOT EXISTS raw_json (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nama_file TEXT NOT NULL, provinsi TEXT, mikro TEXT, kecil TEXT,
  loaded_at TEXT NOT NULL DEFAULT (datetime('now','localtime')));

CREATE TABLE IF NOT EXISTS stg_manufaktur (
  provinsi TEXT NOT NULL, tahun INTEGER NOT NULL, skala TEXT NOT NULL,
  jumlah_perusahaan INTEGER, tenaga_kerja INTEGER, nilai_input_juta_rupiah INTEGER,
  nilai_output_juta_rupiah INTEGER, pengeluaran_tenaga_kerja_juta_rupiah INTEGER,
  PRIMARY KEY (provinsi, tahun, skala));

CREATE TABLE IF NOT EXISTS dim_wilayah (
  sk_wilayah INTEGER PRIMARY KEY AUTOINCREMENT,
  kode_wilayah_bps TEXT NOT NULL UNIQUE,
  provinsi TEXT NOT NULL,
  is_nasional INTEGER NOT NULL CHECK (is_nasional IN (0,1)));

CREATE TABLE IF NOT EXISTS dim_waktu (
  sk_waktu INTEGER PRIMARY KEY AUTOINCREMENT,
  tahun INTEGER NOT NULL UNIQUE);

CREATE TABLE IF NOT EXISTS dim_skala (
  sk_skala INTEGER PRIMARY KEY AUTOINCREMENT,
  skala TEXT NOT NULL UNIQUE);

CREATE TABLE IF NOT EXISTS fact_manufaktur (
  sk_wilayah INTEGER NOT NULL REFERENCES dim_wilayah(sk_wilayah),
  sk_waktu INTEGER NOT NULL REFERENCES dim_waktu(sk_waktu),
  sk_skala INTEGER NOT NULL REFERENCES dim_skala(sk_skala),
  jumlah_perusahaan INTEGER,
  tenaga_kerja INTEGER,
  nilai_input_juta_rupiah INTEGER,
  nilai_output_juta_rupiah INTEGER,
  pengeluaran_tenaga_kerja_juta_rupiah INTEGER,
  nilai_tambah_juta_rupiah INTEGER,
  PRIMARY KEY (sk_wilayah, sk_waktu, sk_skala));

CREATE VIEW IF NOT EXISTS vw_manufaktur AS
SELECT w.kode_wilayah_bps, w.provinsi, w.is_nasional, t.tahun, s.skala,
       f.jumlah_perusahaan, f.tenaga_kerja, f.nilai_input_juta_rupiah, f.nilai_output_juta_rupiah,
       f.pengeluaran_tenaga_kerja_juta_rupiah, f.nilai_tambah_juta_rupiah,
       CASE WHEN f.tenaga_kerja > 0 THEN f.nilai_output_juta_rupiah * 1.0 / f.tenaga_kerja END AS output_per_tenaga_kerja,
       CASE WHEN f.jumlah_perusahaan > 0 THEN f.nilai_output_juta_rupiah * 1.0 / f.jumlah_perusahaan END AS output_per_usaha,
       CASE WHEN f.jumlah_perusahaan > 0 THEN f.tenaga_kerja * 1.0 / f.jumlah_perusahaan END AS tenaga_kerja_per_usaha
FROM fact_manufaktur f
JOIN dim_wilayah w ON w.sk_wilayah = f.sk_wilayah
JOIN dim_waktu t ON t.sk_waktu = f.sk_waktu
JOIN dim_skala s ON s.sk_skala = f.sk_skala;
