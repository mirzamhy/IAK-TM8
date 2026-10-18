import csv
import hashlib
import importlib.util
import json
import shutil
import sqlite3
import tempfile
import unittest
from contextlib import closing
from pathlib import Path


HERE = Path(__file__).resolve().parent
SOURCE = HERE.parent / 'data_manufaktur_bps_2025'


class ETLTests(unittest.TestCase):
    def setUp(self):
        script = HERE / 'etl.py'
        self.assertTrue(script.is_file(), 'Pipeline etl.py belum dibuat')
        spec = importlib.util.spec_from_file_location('iak_etl', script)
        self.etl = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.etl)
        self.temp = tempfile.TemporaryDirectory(prefix='iak_etl_test_')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source = self.root / 'sources'
        self.workspace = self.root / 'pipeline'
        shutil.copytree(SOURCE, self.source)

    def run_pipeline(self):
        return self.etl.run_pipeline(self.source, self.workspace, HERE / 'config')

    def query(self, sql, params=()):
        with closing(sqlite3.connect(self.workspace / 'data/03_integrated/manufaktur.sqlite')) as db:
            return db.execute(sql, params).fetchall()

    def edit_input(self, change):
        path = self.source / 'raw_json/442_nilai_input_2025.json'
        data = json.loads(path.read_text(encoding='utf-8-sig'))
        change(data)
        path.write_text(json.dumps(data, ensure_ascii=False), encoding='utf-8')

    def test_import_reads_all_three_formats_and_keeps_national_separate(self):
        original = {p.relative_to(self.source): hashlib.sha256(p.read_bytes()).hexdigest()
                    for p in self.source.rglob('*') if p.is_file()}
        result = self.run_pipeline()
        self.assertEqual(result['status'], 'SUCCEEDED')
        self.assertEqual(result['counts'], {'inserted': 78, 'updated': 0, 'unchanged': 0})
        self.assertEqual(result['extracted_values'], 390)
        self.assertEqual(self.query('SELECT COUNT(*) FROM vw_provinsi')[0][0], 76)
        self.assertEqual(self.query('SELECT COUNT(*) FROM vw_nasional')[0][0], 2)
        aceh = self.query("SELECT jumlah_perusahaan, tenaga_kerja, nilai_input_juta_rupiah, "
                          "nilai_output_juta_rupiah, pengeluaran_tenaga_kerja_juta_rupiah "
                          "FROM fact_manufaktur WHERE kode_wilayah_bps='1100' AND skala='Mikro'")
        self.assertEqual(aceh, [(101654, 150225, 3827146, 7946160, 520617)])
        self.assertEqual({p.relative_to(self.source): hashlib.sha256(p.read_bytes()).hexdigest()
                          for p in self.source.rglob('*') if p.is_file()}, original)

    def test_rerun_is_idempotent_and_does_not_duplicate_raw_snapshots(self):
        first = self.run_pipeline()
        second = self.run_pipeline()
        self.assertEqual(second['counts'], {'inserted': 0, 'updated': 0, 'unchanged': 78})
        self.assertEqual(self.query('SELECT COUNT(*) FROM fact_manufaktur')[0][0], 78)
        self.assertEqual(self.query('SELECT COUNT(*) FROM etl_changes')[0][0], 78)
        raw_files = [p for p in (self.workspace / 'data/01_raw').rglob('*') if p.is_file()]
        self.assertEqual(len(raw_files), 5)
        run_ids = self.query('SELECT DISTINCT updated_run_id FROM fact_manufaktur')
        self.assertEqual(run_ids, [(first['run_id'],)])

    def test_source_revision_updates_one_row_and_records_previous_value(self):
        self.run_pipeline()
        self.edit_input(lambda d: d['records'][0].update(mikro=3827147))
        revision = self.run_pipeline()
        self.assertEqual(revision['counts'], {'inserted': 0, 'updated': 1, 'unchanged': 77})
        change = self.query("SELECT old_values_json,new_values_json FROM etl_changes WHERE action='UPDATE'")
        self.assertEqual(len(change), 1)
        self.assertEqual(json.loads(change[0][0])['nilai_input_juta_rupiah'], 3827146)
        self.assertEqual(json.loads(change[0][1])['nilai_input_juta_rupiah'], 3827147)
        self.assertEqual(self.query('SELECT COUNT(*) FROM fact_manufaktur')[0][0], 78)

    def test_exact_duplicate_is_removed_with_evidence(self):
        self.edit_input(lambda d: d['records'].append(dict(d['records'][0])))
        result = self.run_pipeline()
        self.assertEqual(result['duplicates_removed'], 2)
        self.assertEqual(result['extracted_values'], 392)
        self.assertEqual(self.query('SELECT COUNT(*) FROM fact_manufaktur')[0][0], 78)
        evidence = json.loads(Path(result['staging_dir'], 'duplicates.json').read_text(encoding='utf-8'))
        self.assertEqual(len(evidence), 2)

    def test_conflicting_duplicate_blocks_load_and_preserves_previous_facts(self):
        self.run_pipeline()
        previous = self.query('SELECT * FROM fact_manufaktur ORDER BY kode_wilayah_bps,skala')
        def conflict(data):
            extra = dict(data['records'][0])
            extra['mikro'] += 10
            data['records'].append(extra)
        self.edit_input(conflict)
        with self.assertRaises(self.etl.PipelineError) as caught:
            self.run_pipeline()
        self.assertEqual(self.query('SELECT * FROM fact_manufaktur ORDER BY kode_wilayah_bps,skala'), previous)
        log = json.loads(caught.exception.log_path.read_text(encoding='utf-8'))
        self.assertEqual(log['status'], 'FAILED')
        self.assertFalse(log['load_committed'])
        errors = json.loads(Path(log['staging_dir'], 'errors.json').read_text(encoding='utf-8'))
        self.assertTrue(any(e['type'] == 'conflicting_duplicate' for e in errors))

    def test_missing_value_is_rejected_instead_of_becoming_zero(self):
        self.edit_input(lambda d: d['records'][0].update(mikro=None))
        with self.assertRaises(self.etl.PipelineError):
            self.run_pipeline()
        self.assertFalse((self.workspace / 'data/03_integrated/manufaktur.sqlite').exists())

    def test_missing_province_blocks_partial_join(self):
        self.edit_input(lambda d: d['records'].pop(0))
        with self.assertRaises(self.etl.PipelineError):
            self.run_pipeline()

    def test_wrong_year_is_rejected(self):
        self.edit_input(lambda d: d.update(year=2024))
        with self.assertRaises(self.etl.PipelineError):
            self.run_pipeline()

    def test_real_zero_is_preserved(self):
        self.edit_input(lambda d: d['records'][0].update(mikro=0))
        self.run_pipeline()
        self.assertEqual(self.query("SELECT nilai_input_juta_rupiah FROM fact_manufaktur "
                                    "WHERE kode_wilayah_bps='1100' AND skala='Mikro'"), [(0,)])

    def test_division_by_zero_produces_null_indicator(self):
        path = self.source / 'raw_native/443_nilai_output_2025.csv'
        with path.open(encoding='utf-8-sig', newline='') as handle:
            rows = list(csv.reader(handle))
        rows[4][1] = '0'
        with path.open('w', encoding='utf-8-sig', newline='') as handle:
            csv.writer(handle).writerows(rows)
        self.run_pipeline()
        self.assertEqual(self.query("SELECT rasio_input_persen FROM vw_indikator_dashboard "
                                    "WHERE kode_wilayah_bps='1100' AND skala='Mikro'"), [(None,)])

    def make_multiyear_fixture(self):
        config = self.root / 'config'
        shutil.copytree(HERE / 'config', config)
        definition = json.loads((config / 'sources.json').read_text(encoding='utf-8'))
        old = json.loads((self.source / 'siap_integrasi/data_terintegrasi.json').read_text(encoding='utf-8'))
        rows = old['data_provinsi'] + old['data_nasional']
        for spec in definition['datasets']:
            spec['year'] = 2025
        additions = []
        unreported = ['9200', '9500', '9600', '9700']
        for spec in list(definition['datasets']):
            values = {}
            for row in rows:
                values.setdefault(row['provinsi'], {'provinsi': row['provinsi']})
                values[row['provinsi']][row['skala'].lower()] = (
                    None if row['kode_wilayah_bps'] in unreported else row[spec['column']])
            relative = f"fixture_2021_{spec['id']}.json"
            (self.source / relative).write_text(json.dumps(
                {'year': 2021, 'unit': spec['unit'], 'records': list(values.values()),
                 'method': 'Synthetic integration test only; not actual BPS 2021 values'}), encoding='utf-8')
            additions.append(dict(spec, year=2021, file=relative))
        definition.pop('year')
        definition['years'] = [2021, 2025]
        definition['datasets'] += additions
        definition['coverage_rules'] = {'2021': {
            code: {'status': 'belum_terpisah', 'parent': '9100' if code == '9200' else '9400'}
            for code in unreported}}
        (config / 'sources.json').write_text(json.dumps(definition), encoding='utf-8')
        return config

    def test_multiple_years_keep_year_in_unique_key(self):
        config = self.make_multiyear_fixture()
        first = self.etl.run_pipeline(self.source, self.workspace, config)
        second = self.etl.run_pipeline(self.source, self.workspace, config)
        self.assertEqual(first['counts']['inserted'], 156)
        self.assertEqual(second['counts'], {'inserted': 0, 'updated': 0, 'unchanged': 156})
        with closing(sqlite3.connect(first['database'])) as db:
            self.assertEqual(db.execute('SELECT DISTINCT tahun FROM fact_manufaktur ORDER BY tahun').fetchall(),
                             [(2021,), (2025,)])

    def test_unreported_new_region_remains_null_and_is_excluded_from_trend(self):
        config = self.make_multiyear_fixture()
        result = self.etl.run_pipeline(self.source, self.workspace, config)
        with closing(sqlite3.connect(result['database'])) as db:
            value = db.execute("SELECT jumlah_perusahaan,status_cakupan FROM vw_provinsi "
                               "WHERE kode_wilayah_bps='9200' AND tahun=2021 AND skala='Mikro'").fetchone()
            self.assertEqual(value, (None, 'belum_terpisah'))
            self.assertEqual(db.execute('SELECT COUNT(*) FROM vw_tren_wilayah_sebanding').fetchone()[0], 136)


if __name__ == '__main__':
    unittest.main(verbosity=2)
