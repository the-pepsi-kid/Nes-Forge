"""Multi-format offline ROM inventory, including corrupt input and authority safeguards."""
import copy
import hashlib
import json
import tempfile
import unittest
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from universal_inventory import inventory_bytes,write_inventory,validate_inventory,chr_sheet,parse_ines
from scan_rom import scan,scan_directory

PRG=bytes([i%256 for i in range(16384)])
TILE=bytes([0b11110000]*8+[0b00001111]*8)
CHR=TILE*512

def mk_header(prg=1,chr=1,nes2=False,trainer=False):
    h=bytearray(16);h[:4]=b'NES\x1a';h[4]=prg;h[5]=chr
    if nes2:h[7]=0x08
    if trainer:h[6]|=4
    return bytes(h)

class GenericInventoryTests(unittest.TestCase):
    def test_ines1_with_chr_preview(self):
        rom=mk_header()+PRG+CHR
        with tempfile.TemporaryDirectory() as t:
            target=scan(Path(self._write(t,'game.nes',rom)),Path(t)/'out')
            inv=json.loads((target/'inventory.json').read_text())
            self.assertEqual(inv['metadata']['mapper'],0)
            self.assertEqual(inv['metadata']['chrBytes'],8192)
            self.assertEqual(len(inv['previews']),1)
            self.assertTrue((target/'OPEN_REPORT.html').exists())
            self.assertEqual(validate_inventory(inv,target,rom),[])
            self.assertTrue((target/'chr_000.png').read_bytes().startswith(b'\x89PNG'))
    def test_chr_ram_absence_is_explicit(self):
        inv,seg=inventory_bytes(mk_header(chr=0)+PRG)
        self.assertFalse(seg);self.assertEqual(inv['capabilities']['chr2bppPreview'],'unavailable')
        self.assertIn('CHR-ROM absent',' '.join(inv['warnings']))
    def test_trainer_offset(self):
        inv,_=inventory_bytes(mk_header(trainer=True)+b'T'*512+PRG+CHR)
        self.assertEqual([s['offset'] for s in inv['sections'][:4]],[0,16,528,16912])
    def test_nes2_mapper_submapper(self):
        h=bytearray(mk_header(nes2=True));h[6]=0x10;h[7]=0x28;h[8]=0x33
        inv,_=inventory_bytes(bytes(h)+PRG+CHR)
        self.assertEqual(inv['source']['container'],'NES 2.0')
        self.assertEqual(inv['metadata']['mapper'],0x321)
        self.assertEqual(inv['metadata']['submapper'],3)
    def test_nes2_exponent_byte_sizes(self):
        h=bytearray(mk_header(nes2=True));h[4]=0x35;h[5]=0x34;h[9]=0xff
        # 2^(0x35>>2) *3 = 2^13 *3, 2^(0x34>>2)*1 =8192
        inv,_=inventory_bytes(bytes(h)+b'P'*(8192*3)+CHR)
        self.assertEqual(inv['metadata']['prgBytes'],24576)
        self.assertEqual(inv['metadata']['chrBytes'],8192)
    def test_dirty_ines_header(self):
        h=bytearray(mk_header());h[7]=0xa0;h[12:16]=b'bad!'
        inv,_=inventory_bytes(bytes(h)+PRG+CHR)
        self.assertEqual(inv['metadata']['mapper'],0)
        self.assertTrue(any('upper mapper nibble' in s for s in inv['warnings']))
    def test_unif_chunks(self):
        def chunk(k,v):return k+len(v).to_bytes(4,'little')+v
        u=b'UNIF'+bytes(28)+chunk(b'MAPR',b'TEST_BOARD\0')+chunk(b'PRG0',PRG)+chunk(b'CHR0',CHR)
        inv,seg=inventory_bytes(u)
        self.assertEqual(inv['source']['container'],'UNIF')
        self.assertEqual(inv['metadata']['boardNames'],['TEST_BOARD'])
        self.assertEqual(len(seg),1)
    def test_fds_headered_and_raw(self):
        f=b'FDS\x1a'+bytes(12)+b'\0'*65500
        inv,seg=inventory_bytes(f);self.assertEqual(inv['metadata']['diskSides'],1);self.assertFalse(seg)
        raw,_=inventory_bytes(f[16:],format_hint='fds');self.assertEqual(raw['source']['container'],'FDS raw sides')
    def test_reject_truncation_and_unknown(self):
        for v in [mk_header()+PRG, b'random',b'UNIF'+bytes(28)+b'PRG0\x08\x00\x00\x00BAD']:
            with self.assertRaises(ValueError):inventory_bytes(v)
    def test_reject_false_authority_claim(self):
        with tempfile.TemporaryDirectory() as t:
            inv=write_inventory(mk_header()+PRG+CHR,Path(t))
            inv['capabilities']['collision']='observed'
            self.assertTrue(any('capability' in v for v in validate_inventory(inv,Path(t))))
    def test_tampered_png(self):
        with tempfile.TemporaryDirectory() as t:
            inv=write_inventory(mk_header()+PRG+CHR,Path(t));p=Path(t)/inv['previews'][0]['file'];p.write_bytes(b'tampered')
            self.assertTrue(any('preview' in v for v in validate_inventory(inv,Path(t))))
    def test_original_rom_crosscheck(self):
        with tempfile.TemporaryDirectory() as t:
            rom=mk_header()+PRG+CHR
            inv=write_inventory(rom,Path(t))
            self.assertFalse(validate_inventory(inv,Path(t),rom))
            self.assertTrue(any('source identity' in v for v in validate_inventory(inv,Path(t),rom+b'X')))
    def test_chr_decoder_has_correct_dimensions(self):
        blob,tiles=chr_sheet(TILE)
        self.assertEqual(tiles,1);self.assertEqual(blob[16:24],bytes.fromhex('0000008000000008'))
    def test_batch_rom_folder_multiple_games(self):
        with tempfile.TemporaryDirectory() as t:
            source=Path(t)/'source';source.mkdir()
            (source/'sub').mkdir()
            (source/'first.nes').write_bytes(mk_header()+PRG+CHR)
            (source/'sub'/'other.nes').write_bytes(mk_header(chr=0)+PRG)
            out=Path(t)/'output'
            summary,report=scan_directory(source,out)
            self.assertEqual((summary['scanned'],summary['passed'],summary['failed']),(2,2,0))
            self.assertEqual(json.loads(report.read_text())['authority'],'research-only')
            self.assertEqual(len(list(out.rglob('OPEN_REPORT.html'))),2)

    def test_batch_skips_bad_rom_without_losing_good(self):
        with tempfile.TemporaryDirectory() as t:
            source=Path(t)/'source';source.mkdir()
            (source/'good.nes').write_bytes(mk_header()+PRG+CHR)
            (source/'invalid.nes').write_bytes(b'broken')
            summary,report=scan_directory(source,Path(t)/'output')
            self.assertEqual((summary['passed'],summary['failed']),(1,1))
            self.assertTrue(report.exists())

    @staticmethod
    def _write(t,name,data):
        p=Path(t)/name;p.write_bytes(data);return str(p)

if __name__=='__main__':unittest.main(verbosity=2)
