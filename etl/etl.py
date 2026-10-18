"""ETL manufaktur BPS dari CSV, XLSX, dan JSON ke SQLite. Python 3.10+."""
import argparse
import csv
import hashlib
import io
import json
import re
import sqlite3
import uuid
import zipfile
from contextlib import closing
from datetime import datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path
from xml.etree import ElementTree as ET


HERE = Path(__file__).resolve().parent
WIB = timezone(timedelta(hours=7))
METRICS = [
    'jumlah_perusahaan', 'tenaga_kerja', 'nilai_input_juta_rupiah',
    'nilai_output_juta_rupiah', 'pengeluaran_tenaga_kerja_juta_rupiah',
]
KEYS = ['kode_wilayah_bps', 'tahun', 'skala']
NS = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}


class PipelineError(Exception):
    def __init__(self, message, log_path):
        super().__init__(message)
        self.log_path = Path(log_path)


def now():
    return datetime.now(WIB).isoformat(timespec='milliseconds')


def write_bytes(path, data):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + '.' + uuid.uuid4().hex[:8] + '.tmp')
    temporary.write_bytes(data)
    temporary.replace(path)


def write_json(path, value):
    write_bytes(path, json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False).encode('utf-8'))


def write_csv(path, rows, columns):
    buffer = io.StringIO(newline='')
    writer = csv.DictWriter(buffer, fieldnames=columns, extrasaction='ignore')
    writer.writeheader()
    writer.writerows(rows)
    write_bytes(path, buffer.getvalue().encode('utf-8-sig'))


def normalize_name(value):
    return re.sub(r'[^A-Z0-9]+', ' ', str(value).upper()).strip()


def parse_integer(value):
    if value is None or isinstance(value, bool):
        raise ValueError('Nilai kosong atau bukan angka')
    text = str(value).strip().replace('\u00a0', '').replace(' ', '')
    if text.upper() in {'', '-', '...', 'NA', 'N/A', 'NULL', 'NAN', 'NONE'}:
        raise ValueError('Nilai tidak tersedia; tidak boleh diubah menjadi nol')
    # Koma desimal menandai format Indonesia; ekspor numerik BPS memakai angka polos.
    if ',' in text:
        text = text.replace('.', '').replace(',', '.')
    try:
        number = Decimal(text)
    except InvalidOperation as exc:
        raise ValueError(f'Angka tidak valid: {value!r}') from exc
    if not number.is_finite() or number < 0 or number != number.to_integral_value():
        raise ValueError(f'Harus bilangan bulat nonnegatif dalam satuan sumber: {value!r}')
    if number > 9223372036854775807:
        raise ValueError('Angka melebihi kapasitas integer SQLite')
    return int(number)


def read_xlsx(path):
    """Membaca tiga kolom pertama tabel BPS tanpa menjalankan formula atau macro."""
    with zipfile.ZipFile(path) as archive:
        strings = []
        if 'xl/sharedStrings.xml' in archive.namelist():
            tree = ET.fromstring(archive.read('xl/sharedStrings.xml'))
            strings = [''.join(t.text or '' for t in item.findall('.//s:t', NS))
                       for item in tree.findall('s:si', NS)]
        tree = ET.fromstring(archive.read('xl/worksheets/sheet1.xml'))
        rows = []
        for row in tree.findall('s:sheetData/s:row', NS):
            values = [None, None, None]
            for cell in row.findall('s:c', NS):
                label = re.match(r'[A-Z]+', cell.attrib['r'])[0]
                column = 0
                for letter in label:
                    column = column * 26 + ord(letter) - 64
                if column > 3:
                    continue
                if cell.find('s:f', NS) is not None:
                    raise ValueError('Formula ditemukan pada tabel sumber; diperlukan nilai statis BPS')
                value = cell.find('s:v', NS)
                if cell.attrib.get('t') == 's':
                    value = strings[int(value.text)] if value is not None else None
                elif cell.attrib.get('t') == 'inlineStr':
                    value = ''.join(t.text or '' for t in cell.findall('.//s:t', NS))
                else:
                    value = value.text if value is not None else None
                values[column - 1] = value
            rows.append(values)
        return rows


def extract_rows(path, spec, year):
    if path.suffix == '.json':
        data = json.loads(path.read_text(encoding='utf-8-sig'))
        if data.get('year') != year:
            raise ValueError(f"Tahun JSON {data.get('year')} tidak sama dengan {year}")
        if normalize_name(data.get('unit', '')) != normalize_name(spec['unit']):
            raise ValueError('Satuan JSON tidak sesuai konfigurasi')
        records = data.get('records')
        if not isinstance(records, list):
            raise ValueError('JSON harus memiliki daftar records')
        return [(index + 1, r.get('provinsi'), r.get('mikro'), r.get('kecil'))
                for index, r in enumerate(records)]
    if path.suffix == '.xlsx':
        table = read_xlsx(path)
    elif path.suffix == '.csv':
        with path.open(encoding='utf-8-sig', newline='') as handle:
            table = list(csv.reader(handle))
    else:
        raise ValueError(f'Format tidak didukung: {path.suffix}')
    if len(table) < 5 or any(len(r) < 3 for r in table[:4]):
        raise ValueError('Header tabel BPS tidak lengkap')
    if [normalize_name(v) for v in table[2][1:3]] != ['MIKRO', 'KECIL']:
        raise ValueError('Header kategori bukan Mikro/Kecil')
    if any(parse_integer(v) != year for v in table[3][1:3]):
        raise ValueError('Tahun pada header tabel tidak sesuai')
    if f"({spec['unit']})" not in str(table[1][1]):
        raise ValueError('Satuan pada judul tabel tidak sesuai')
    result = []
    for index, row in enumerate(table[4:], start=5):
        if not any(v is not None and str(v).strip() for v in row):
            continue
        padded = (list(row) + [None, None, None])[:3]
        result.append((index, *padded))
    return result


SCHEMA = """
CREATE TABLE IF NOT EXISTS dim_wilayah (
 kode_wilayah_bps TEXT PRIMARY KEY, provinsi TEXT NOT NULL,
 is_nasional INTEGER NOT NULL CHECK(is_nasional IN (0,1)));
CREATE TABLE IF NOT EXISTS dim_cakupan_wilayah (
 kode_wilayah_bps TEXT NOT NULL, tahun INTEGER NOT NULL, status TEXT NOT NULL,
 PRIMARY KEY(kode_wilayah_bps,tahun));
CREATE TABLE IF NOT EXISTS etl_runs (
 run_id TEXT PRIMARY KEY, started_at TEXT NOT NULL, finished_at TEXT NOT NULL,
 inserted_rows INTEGER NOT NULL, updated_rows INTEGER NOT NULL,
 unchanged_rows INTEGER NOT NULL, source_manifest_json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS fact_manufaktur (
 kode_wilayah_bps TEXT NOT NULL REFERENCES dim_wilayah(kode_wilayah_bps),
 tahun INTEGER NOT NULL, skala TEXT NOT NULL CHECK(skala IN ('Mikro','Kecil')),
 jumlah_perusahaan INTEGER CHECK(jumlah_perusahaan>=0),
 tenaga_kerja INTEGER CHECK(tenaga_kerja>=0),
 nilai_input_juta_rupiah INTEGER CHECK(nilai_input_juta_rupiah>=0),
 nilai_output_juta_rupiah INTEGER CHECK(nilai_output_juta_rupiah>=0),
 pengeluaran_tenaga_kerja_juta_rupiah INTEGER CHECK(pengeluaran_tenaga_kerja_juta_rupiah>=0),
 row_hash TEXT NOT NULL, created_run_id TEXT NOT NULL, updated_run_id TEXT NOT NULL,
 PRIMARY KEY(kode_wilayah_bps,tahun,skala));
CREATE TABLE IF NOT EXISTS etl_changes (
 change_id INTEGER PRIMARY KEY AUTOINCREMENT, run_id TEXT NOT NULL REFERENCES etl_runs(run_id),
 kode_wilayah_bps TEXT NOT NULL, tahun INTEGER NOT NULL, skala TEXT NOT NULL,
 action TEXT NOT NULL CHECK(action IN ('INSERT','UPDATE')),
 old_values_json TEXT, new_values_json TEXT NOT NULL);
CREATE VIEW IF NOT EXISTS vw_provinsi AS
 SELECT f.kode_wilayah_bps,w.provinsi,f.tahun,f.skala,
 CASE WHEN c.status='belum_terpisah' THEN NULL ELSE f.jumlah_perusahaan END AS jumlah_perusahaan,
 CASE WHEN c.status='belum_terpisah' THEN NULL ELSE f.tenaga_kerja END AS tenaga_kerja,
 CASE WHEN c.status='belum_terpisah' THEN NULL ELSE f.nilai_input_juta_rupiah END AS nilai_input_juta_rupiah,
 CASE WHEN c.status='belum_terpisah' THEN NULL ELSE f.nilai_output_juta_rupiah END AS nilai_output_juta_rupiah,
 CASE WHEN c.status='belum_terpisah' THEN NULL ELSE f.pengeluaran_tenaga_kerja_juta_rupiah END AS pengeluaran_tenaga_kerja_juta_rupiah,
 COALESCE(c.status,'terpisah') AS status_cakupan
 FROM fact_manufaktur f JOIN dim_wilayah w USING(kode_wilayah_bps)
 LEFT JOIN dim_cakupan_wilayah c ON c.kode_wilayah_bps=f.kode_wilayah_bps AND c.tahun=f.tahun
 WHERE w.is_nasional=0;
CREATE VIEW IF NOT EXISTS vw_nasional AS
 SELECT f.kode_wilayah_bps,w.provinsi,f.tahun,f.skala,f.jumlah_perusahaan,
 f.tenaga_kerja,f.nilai_input_juta_rupiah,f.nilai_output_juta_rupiah,
 f.pengeluaran_tenaga_kerja_juta_rupiah
 FROM fact_manufaktur f JOIN dim_wilayah w USING(kode_wilayah_bps) WHERE w.is_nasional=1;
CREATE VIEW IF NOT EXISTS vw_indikator_dashboard AS
 SELECT *,
 CASE WHEN tenaga_kerja>0 THEN nilai_output_juta_rupiah*1.0/tenaga_kerja END AS output_per_tenaga_kerja_juta_rupiah,
 CASE WHEN jumlah_perusahaan>0 THEN nilai_output_juta_rupiah*1.0/jumlah_perusahaan END AS output_per_usaha_juta_rupiah,
 CASE WHEN jumlah_perusahaan>0 THEN tenaga_kerja*1.0/jumlah_perusahaan END AS tenaga_kerja_per_usaha,
 CASE WHEN nilai_output_juta_rupiah>0 THEN nilai_input_juta_rupiah*100.0/nilai_output_juta_rupiah END AS rasio_input_persen
 FROM vw_provinsi;
CREATE VIEW IF NOT EXISTS vw_tren_wilayah_sebanding AS
 WITH grouped AS (
 SELECT CASE WHEN kode_wilayah_bps IN ('9100','9200') THEN '9100'
             WHEN kode_wilayah_bps IN ('9400','9500','9600','9700') THEN '9400'
             ELSE kode_wilayah_bps END AS kode_kelompok,
 CASE WHEN kode_wilayah_bps IN ('9100','9200') THEN 'PAPUA BARAT (cakupan sebelum pemekaran)'
      WHEN kode_wilayah_bps IN ('9400','9500','9600','9700') THEN 'PAPUA (cakupan sebelum pemekaran)'
      ELSE provinsi END AS wilayah, tahun,skala,jumlah_perusahaan,tenaga_kerja,
 nilai_input_juta_rupiah,nilai_output_juta_rupiah,pengeluaran_tenaga_kerja_juta_rupiah
 FROM vw_provinsi WHERE status_cakupan!='belum_terpisah')
 SELECT kode_kelompok,wilayah,tahun,skala,SUM(jumlah_perusahaan) AS jumlah_perusahaan,
 SUM(tenaga_kerja) AS tenaga_kerja,SUM(nilai_input_juta_rupiah) AS nilai_input_juta_rupiah,
 SUM(nilai_output_juta_rupiah) AS nilai_output_juta_rupiah,
 SUM(pengeluaran_tenaga_kerja_juta_rupiah) AS pengeluaran_tenaga_kerja_juta_rupiah
 FROM grouped GROUP BY kode_kelompok,wilayah,tahun,skala;
"""


def load_database(path, rows, regions, log):
    path.parent.mkdir(parents=True, exist_ok=True)
    counts = {'inserted': 0, 'updated': 0, 'unchanged': 0}
    with closing(sqlite3.connect(path)) as db:
        db.row_factory = sqlite3.Row
        db.execute('PRAGMA foreign_keys=ON')
        db.executescript(SCHEMA)
        with db:
            db.execute('INSERT INTO etl_runs VALUES (?,?,?,?,?,?,?)',
                       (log['run_id'], log['started_at'], now(), 0, 0, 0,
                        json.dumps(log['sources'], ensure_ascii=False)))
            for region in regions:
                db.execute('INSERT INTO dim_wilayah VALUES (?,?,?) ON CONFLICT(kode_wilayah_bps) '
                           'DO UPDATE SET provinsi=excluded.provinsi,is_nasional=excluded.is_nasional',
                           (region['code'], region['name'], int(region['is_nasional'])))
            for row in rows:
                key = tuple(row[k] for k in KEYS)
                db.execute('INSERT INTO dim_cakupan_wilayah VALUES (?,?,?) '
                           'ON CONFLICT(kode_wilayah_bps,tahun) DO UPDATE SET status=excluded.status',
                           (row['kode_wilayah_bps'],row['tahun'],row.get('status_cakupan','terpisah')))
                values = {column: row[column] for column in METRICS}
                canonical = json.dumps(values, sort_keys=True, separators=(',', ':'))
                row_hash = hashlib.sha256(canonical.encode()).hexdigest()
                previous = db.execute('SELECT * FROM fact_manufaktur WHERE '
                                      'kode_wilayah_bps=? AND tahun=? AND skala=?', key).fetchone()
                if previous is not None and previous['row_hash'] == row_hash:
                    counts['unchanged'] += 1
                    continue
                if previous is None:
                    columns = KEYS + METRICS + ['row_hash', 'created_run_id', 'updated_run_id']
                    db.execute(f"INSERT INTO fact_manufaktur ({','.join(columns)}) VALUES "
                               f"({','.join('?' for _ in columns)})",
                               key + tuple(values.values()) + (row_hash, log['run_id'], log['run_id']))
                    action, old = 'INSERT', None
                    counts['inserted'] += 1
                else:
                    assignments = ','.join(f'{column}=?' for column in METRICS)
                    db.execute(f'UPDATE fact_manufaktur SET {assignments},row_hash=?,updated_run_id=? '
                               'WHERE kode_wilayah_bps=? AND tahun=? AND skala=?',
                               tuple(values.values()) + (row_hash, log['run_id']) + key)
                    action = 'UPDATE'
                    old = json.dumps({column: previous[column] for column in METRICS}, ensure_ascii=False)
                    counts['updated'] += 1
                db.execute('INSERT INTO etl_changes (run_id,kode_wilayah_bps,tahun,skala,action,'
                           'old_values_json,new_values_json) VALUES (?,?,?,?,?,?,?)',
                           (log['run_id'],) + key + (action, old, json.dumps(values, ensure_ascii=False)))
            db.execute('UPDATE etl_runs SET finished_at=?,inserted_rows=?,updated_rows=?,unchanged_rows=? '
                       'WHERE run_id=?', (now(), counts['inserted'], counts['updated'],
                                         counts['unchanged'], log['run_id']))
    return counts


def export_database(path, years):
    exports = path.parent / 'exports'
    period = str(years[0]) if len(years)==1 else f'{years[0]}_{years[-1]}'
    for view, filename in [('vw_provinsi', f'manufaktur_provinsi_{period}.csv'),
                           ('vw_nasional', f'manufaktur_nasional_{period}.csv'),
                           ('vw_indikator_dashboard', f'indikator_dashboard_{period}.csv'),
                           ('vw_tren_wilayah_sebanding', f'tren_wilayah_sebanding_{period}.csv')]:
        with closing(sqlite3.connect(path)) as db:
            db.row_factory = sqlite3.Row
            cursor = db.execute(f'SELECT * FROM {view} ORDER BY 1,3,4')
            columns = [c[0] for c in cursor.description]
            rows = [dict(r) for r in cursor.fetchall()]
        write_csv(exports / filename, rows, columns)
    return str(exports)


def run_pipeline(source_dir, workspace, config_dir=None):
    source_dir, workspace = Path(source_dir).resolve(), Path(workspace).resolve()
    config_dir = Path(config_dir or HERE / 'config')
    run_id = datetime.now(WIB).strftime('%Y%m%dT%H%M%S') + '_' + uuid.uuid4().hex[:8]
    stage = workspace / 'data/02_staging' / run_id
    database = workspace / 'data/03_integrated/manufaktur.sqlite'
    log_path = workspace / 'logs' / f'{run_id}.json'
    log = {'run_id': run_id, 'started_at': now(), 'status': 'RUNNING', 'phase': 'config',
           'source_dir': str(source_dir), 'staging_dir': str(stage), 'database': str(database),
           'load_committed': False, 'sources': [], 'errors': [], 'warnings': [],
           'duplicates_removed': 0, 'extracted_values': 0}
    normalized, duplicates = [], []
    try:
        configuration = json.loads((config_dir / 'sources.json').read_text(encoding='utf-8-sig'))
        regions = json.loads((config_dir / 'wilayah.json').read_text(encoding='utf-8-sig'))['regions']
        years = sorted(configuration.get('years', [configuration.get('year',2025)]))
        specs = configuration['datasets']
        for year in years:
            annual_specs = [s for s in specs if s.get('year',configuration.get('year'))==year]
            if len(annual_specs)!=5 or {s['column'] for s in annual_specs}!=set(METRICS):
                raise ValueError(f'Konfigurasi {year} harus berisi lima indikator yang berbeda')
        if len(specs)!=5*len(years):
            raise ValueError('Ada sumber di luar rentang tahun atau tahun duplikat')
        if len(years)>1:
            database=workspace/'data/03_integrated'/f'manufaktur_{years[0]}_{years[-1]}.sqlite'
            log['database']=str(database)
        by_name = {normalize_name(r['name']): r for r in regions}
        if len(by_name) != 39 or len({r['code'] for r in regions}) != 39:
            raise ValueError('Referensi harus memuat 38 provinsi dan Indonesia tanpa duplikat')
        log['years'] = years
        coverage_rules = configuration.get('coverage_rules',{})
        log['phase'] = 'extract'
        for spec in specs:
            year = spec.get('year',configuration.get('year'))
            source = (source_dir / spec['file']).resolve()
            try:
                source.relative_to(source_dir)
                body = source.read_bytes()
                digest = hashlib.sha256(body).hexdigest()
                snapshot = workspace / 'data/01_raw' / str(spec['id']) / (digest + source.suffix)
                if snapshot.exists():
                    if hashlib.sha256(snapshot.read_bytes()).hexdigest() != digest:
                        raise ValueError('Checksum snapshot raw berubah')
                else:
                    write_bytes(snapshot, body)
                item = {'id': spec['id'], 'indicator': spec['column'], 'unit': spec['unit'],
                        'source_file': str(source), 'snapshot': str(snapshot), 'sha256': digest,
                        'source_url': spec['source_url'], 'method': spec['method'], 'year':year,'extracted_at': now()}
                log['sources'].append(item)
                for source_row, region_name, micro, small in extract_rows(snapshot, spec, year):
                    for scale, value in [('Mikro', micro), ('Kecil', small)]:
                        log['extracted_values'] += 1
                        try:
                            region = by_name.get(normalize_name(region_name))
                            if region is None:
                                raise ValueError(f'Wilayah tidak dikenal: {region_name!r}')
                            coverage = coverage_rules.get(str(year),{}).get(region['code'],{}).get('status','terpisah')
                            is_missing = value is None or str(value).strip().upper() in {'','-','...','NA','N/A'}
                            parsed = None if coverage=='belum_terpisah' and is_missing else parse_integer(value)
                            if coverage=='belum_terpisah' and parsed not in (None,0):
                                raise ValueError('Angka sudah terpisah; aturan cakupan perlu diperiksa')
                            normalized.append({'dataset_id': spec['id'], 'indicator': spec['column'],
                                               'kode_wilayah_bps': region['code'], 'provinsi': region['name'],
                                               'tahun': year, 'skala': scale, 'nilai': parsed,
                                               'status_cakupan':coverage,'satuan': spec['unit'], 'source_row': source_row})
                        except (ValueError, TypeError) as exc:
                            log['errors'].append({'type': 'invalid_record', 'dataset_id': spec['id'],
                                                  'source_row': source_row, 'wilayah': region_name,
                                                  'skala': scale, 'value': value, 'message': str(exc)})
            except (OSError, ValueError, KeyError, TypeError, zipfile.BadZipFile, ET.ParseError) as exc:
                log['errors'].append({'type': 'source_error', 'dataset_id': spec['id'], 'message': str(exc)})
        log['phase'] = 'transform'
        unique = {}
        for row in normalized:
            key = (row['dataset_id'],) + tuple(row[k] for k in KEYS)
            previous = unique.get(key)
            if previous is None:
                unique[key] = row
            elif previous['nilai'] == row['nilai']:
                duplicates.append({'key': list(key), 'nilai': row['nilai'],
                                   'kept_source_row': previous['source_row'],
                                   'removed_source_row': row['source_row']})
            else:
                log['errors'].append({'type': 'conflicting_duplicate', 'key': list(key),
                                      'first_value': previous['nilai'], 'second_value': row['nilai'],
                                      'first_source_row': previous['source_row'], 'second_source_row': row['source_row']})
        log['duplicates_removed'] = len(duplicates)
        for spec in specs:
            year=spec.get('year',configuration.get('year'))
            expected={(r['code'],year,scale) for r in regions for scale in ['Mikro','Kecil']}
            actual = {tuple(row[k] for k in KEYS) for row in unique.values() if row['dataset_id']==spec['id'] and row['tahun']==year}
            if actual != expected:
                log['errors'].append({'type': 'coverage_mismatch', 'dataset_id': spec['id'],
                                      'missing_keys': [list(k) for k in sorted(expected - actual)],
                                      'extra_keys': [list(k) for k in sorted(actual - expected)]})
        stage.mkdir(parents=True, exist_ok=True)
        write_csv(stage / 'normalized.csv', list(unique.values()),
                  ['dataset_id', 'indicator', 'kode_wilayah_bps', 'provinsi', 'tahun', 'skala', 'nilai', 'status_cakupan','satuan', 'source_row'])
        write_json(stage / 'duplicates.json', duplicates)
        write_json(stage / 'errors.json', log['errors'])
        write_json(stage / 'source_manifest.json', log['sources'])
        if log['errors']:
            raise ValueError(f"Validasi gagal: {len(log['errors'])} masalah; database tidak dimuat")
        joined = {}
        for row in unique.values():
            key = tuple(row[k] for k in KEYS)
            if key not in joined:
                joined[key] = {k: row[k] for k in ['kode_wilayah_bps', 'provinsi', 'tahun', 'skala','status_cakupan']}
            joined[key][row['indicator']] = row['nilai']
        wide = sorted(joined.values(), key=lambda r: tuple(r[k] for k in KEYS))
        for spec in specs:
            year=spec.get('year',configuration.get('year'))
            for scale in ['Mikro', 'Kecil']:
                detail = sum(r[spec['column']] or 0 for r in wide if r['kode_wilayah_bps']!='9999' and r['skala']==scale and r['tahun']==year)
                national = joined[('9999', year, scale)][spec['column']]
                if detail != national:
                    log['warnings'].append({'type': 'aggregation_difference', 'indicator': spec['column'],
                                            'skala': scale,'tahun':year, 'sum_provinces': detail, 'national_bps': national,
                                            'difference': detail - national,
                                            'message': 'Angka sumber dipertahankan. Catatan BPS menyebut pembulatan digit terakhir.'})
        write_csv(stage / 'joined.csv', wide, ['kode_wilayah_bps', 'provinsi', 'tahun', 'skala','status_cakupan'] + METRICS)
        write_json(stage / 'warnings.json', log['warnings'])
        log['phase'] = 'load'
        log['counts'] = load_database(database, wide, regions, log)
        log['load_committed'] = True
        log['phase'] = 'export'
        log['exports_dir'] = export_database(database, years)
        log['province_rows']=sum(r['kode_wilayah_bps']!='9999' for r in wide)
        log['national_rows']=len(wide)-log['province_rows']
        log['status'], log['phase'] = 'SUCCEEDED', 'complete'
    except Exception as exc:
        log['status'], log['error'] = 'FAILED', str(exc)
        log['finished_at'] = now()
        write_json(log_path, log)
        write_json(workspace / 'logs/latest.json', log)
        raise PipelineError(str(exc), log_path) from exc
    log['finished_at'] = now()
    write_json(log_path, log)
    write_json(workspace / 'logs/latest.json', log)
    return log


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-dir', type=Path)
    parser.add_argument('--config-dir',type=Path,default=HERE/('config_2021_2025' if (HERE/'config_2021_2025').exists() else 'config'))
    parser.add_argument('--workspace', type=Path, default=HERE)
    args = parser.parse_args()
    try:
        config=json.loads((args.config_dir/'sources.json').read_text(encoding='utf-8'))
        source=args.source_dir or HERE.parent/config.get('source_folder','data_manufaktur_bps_2025')
        result = run_pipeline(source, args.workspace,args.config_dir)
    except PipelineError as exc:
        print(json.dumps({'status': 'FAILED', 'error': str(exc), 'log': str(exc.log_path)}, ensure_ascii=True))
        return 1
    print(json.dumps({k: result[k] for k in ['status', 'run_id', 'counts', 'duplicates_removed',
                                            'extracted_values', 'database', 'exports_dir']}, ensure_ascii=True, indent=2))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
