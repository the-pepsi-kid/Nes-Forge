"""Synthetic placement contract checks: no commercial ROM material."""
import importlib.util
from pathlib import Path
import unittest

MODULE = Path(__file__).resolve().parents[1] / 'placement_contract.py'
SPEC = importlib.util.spec_from_file_location('placement_contract', MODULE)
placement = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(placement)

ROM = 'a' * 64
EDITOR = 'b' * 64


def sample_header(trainer=0, prg=16384, chr_bytes=8192):
    return {'mapper': 1, 'trainer_bytes': trainer,
            'prg_bytes': prg, 'chr_bytes': chr_bytes}


def checks():
    return [{'type': 'prg', 'bank': 0, 'size': 16384, 'sha256': 'c'*64},
            {'type': 'chr', 'bank': 0, 'size': 8192, 'sha256': 'd'*64}]


class PlacementContractTests(unittest.TestCase):
    def test_unverified_bank_source_never_claimed(self):
        result = placement.make_placement_ledger(ROM, EDITOR, sample_header())
        self.assertEqual(result['records'], [])
        self.assertEqual(result['verified_raw_banks'], 0)

    def test_trainer_shifts_rom_offsets(self):
        result = placement.make_placement_ledger(ROM, EDITOR, sample_header(512), checks())
        self.assertEqual([x['source']['file_offset'] for x in result['records']], [528, 16912])
        self.assertEqual(result['verified_raw_banks'], 2)

    def test_bank_data_is_not_scene_or_cpu_mapping(self):
        result = placement.make_placement_ledger(ROM, EDITOR, sample_header(), checks())
        for record in result['records']:
            self.assertEqual(record['scene_composition']['status'], 'unverified')
            self.assertIsNone(record['scene_composition']['x'])
            self.assertIsNone(record['rom_runtime_mapping']['address'])
            self.assertEqual(record['native_writeback']['status'], 'unverified')
        self.assertTrue(result['build_targets']['classic_nes']['default'])
        self.assertFalse(result['build_targets']['classic_nes']['requires_network'])
        self.assertFalse(result['build_targets']['enhanced_emulator']['default'])

    def test_reject_missing_or_duplicate_checks(self):
        for malformed in (checks()[:1], checks() + [checks()[0]]):
            with self.subTest(malformed=malformed), self.assertRaises(ValueError):
                placement.make_placement_ledger(ROM, EDITOR, sample_header(), malformed)

    def test_reject_wrong_size_or_bad_hash(self):
        bad = checks()
        bad[0] = {**bad[0], 'size': 8192}
        with self.assertRaises(ValueError):
            placement.make_placement_ledger(ROM, EDITOR, sample_header(), bad)
        with self.assertRaises(ValueError):
            placement.make_placement_ledger('wrong', EDITOR, sample_header(), checks())

    def test_chr_ram_has_no_fake_chr_bank(self):
        result = placement.make_placement_ledger(ROM, EDITOR, sample_header(chr_bytes=0), checks()[:1])
        self.assertEqual(len(result['records']), 1)
        self.assertEqual(result['records'][0]['source']['region'], 'PRG_ROM')

    def test_partial_final_bank(self):
        entries = checks()[:1] + [{'type': 'prg', 'bank': 1, 'size': 123, 'sha256': 'e'*64}] + checks()[1:]
        result = placement.make_placement_ledger(ROM, EDITOR, sample_header(prg=16384+123), entries)
        self.assertEqual(result['records'][1]['source']['file_offset'], 16400)
        self.assertEqual(result['records'][1]['source']['byte_length'], 123)


if __name__ == '__main__':
    unittest.main()
