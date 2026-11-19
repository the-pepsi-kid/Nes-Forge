import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from forge_agent import canonical_identity, rom_list, write_dashboard
from forge_pipeline import parse_header, verify_extracted_banks, build_public_summary, init_domains


def make_rom(p):
    h = bytearray(16)
    h[:4] = b'NES\x1a'; h[4] = 1; h[5] = 1
    p.write_bytes(h + bytes([0xAC] * 16384) + bytes([0xF0] * 8192))


class Tests(unittest.TestCase):
    def test_roma_header_and_truncation(self):
        with tempfile.TemporaryDirectory() as d:
            rom = Path(d)/'game.nes'; make_rom(rom)
            h = parse_header(rom)
            self.assertEqual((h['prg_bytes'], h['chr_bytes']), (16384,8192))
            rom.write_bytes(rom.read_bytes()[:-1])
            with self.assertRaisesRegex(ValueError, 'truncated'):
                parse_header(rom)

    def test_verify_against_original_bytes_even_with_forged_hash(self):
        import hashlib
        def sha(d): return hashlib.sha256(d).hexdigest()
        with tempfile.TemporaryDirectory() as d:
            r = Path(d); rom = r / 'game.nes'; make_rom(rom)
            raw = r / 'raw'; (raw / 'assets/prg').mkdir(parents=True); (raw / 'assets/chr').mkdir(parents=True)
            (raw/'assets/prg/prg_bank_000.bin').write_bytes(bytes([0xAA] * 16384))
            (raw/'assets/chr/chr_bank_000.bin').write_bytes(bytes([0xF0] * 8192))
            banks=[{'type': k, 'bank': 0, 'size': len(v), 'sha256': sha(v)} for k,v in [('prg',bytes([0xAA]*16384)),('chr',bytes([0xF0]*8192))]]
            checks = {'bank_hashes_verified': True, 'header_valid': True, 'bank_checks': banks}
            manifest = {'extracted': {'prg_banks': 1, 'chr_banks': 1}}
            ok,note = verify_extracted_banks(raw, checks, manifest, parse_header(rom), rom)
            self.assertFalse(ok);self.assertIn('original ROM',note)

    def test_source_identity_rejects_unmatched_html(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d); (p/'QA/t/u').mkdir(parents=True); (p/'app').mkdir()
            (p/'NES_Forge.html').write_text('<html>broken</html>')
            (p/'QA/t/u/harness.cjs').write_text('// test')
            (p/'app/build-inputs.json').write_text('{"sha256":"wrong"}')
            with self.assertRaisesRegex(ValueError,'differs'):
                canonical_identity(p)

    def test_batch_dedup(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d); make_rom(p/'one.nes');(p/'two.nes').write_bytes((p/'one.nes').read_bytes())
            self.assertEqual(len(rom_list(None,str(p),10)),1)

    def test_review_allowlist_no_paths_or_original_assets(self):
        from forge_pipeline import stage_result
        public = build_public_summary('a'*64,parse_header_fixture(),[stage_result('extract','passed')],
            init_domains(parse_header_fixture()),{},[],{'sha256':'b'*64,'build_family':'owner_selected'})
        serialized = json.dumps(public)
        for secret in ('C:\\', '.nesforge.json', 'rom_path', 'RAW_ROM', 'native/', 'Qwen'):
            self.assertNotIn(secret, serialized)
        self.assertEqual(public['publication_status'], 'manual_review_required')

    def test_loopback_model_returns_unverified_suggestions(self):
        import threading
        from http.server import HTTPServer, BaseHTTPRequestHandler
        from forge_pipeline import ask_qwen
        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *args): pass
            def do_GET(self):
                payload = {'data': [{'id':'local-test-model'}]}
                b=json.dumps(payload).encode();self.send_response(200)
                self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(b)
            def do_POST(self):
                length = int(self.headers['Content-Length'])
                body=json.loads(self.rfile.read(length))
                self.server.input = body
                payload={'choices':[{'message':{'content':json.dumps({'suggested_tasks':['Trace bank mapping at runtime']})}}]}
                b=json.dumps(payload).encode();self.send_response(200)
                self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(b)
        server=HTTPServer(('127.0.0.1',0),Handler)
        t=threading.Thread(target=server.serve_forever,daemon=True);t.start()
        try:
            evidence = build_public_summary('a'*64,parse_header_fixture(),[],init_domains(parse_header_fixture()),{},[],{'sha256':'b'*64})
            result = ask_qwen(evidence, f'http://127.0.0.1:{server.server_port}/v1', None)
            self.assertEqual(result['state'],'connected')
            self.assertEqual(result['suggested_tasks'],['Trace bank mapping at runtime'])
            data=json.dumps(server.input)
            self.assertNotIn('rom_path',data)
            self.assertNotIn('source_bytes',data)
        finally:
            server.shutdown();server.server_close();t.join(timeout=5)

    def test_dashboard_only_current_editor(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d);review=p/'review'
            hdr = {'mapper':1,'prg_bytes':16384,'chr_bytes':8192}
            for num,editor in enumerate(['a','b']):
                folder=review/str(num);folder.mkdir(parents=True)
                (folder/'evidence.json').write_text(json.dumps({
                    'schema':'NESForgeCompatibilityEvidence/v0.3',
                    'editor':{'sha256':editor},'source_sha256':str(num)*64,
                    'header':hdr,'domains':{'physical_banks':{'state':'extracted'}}}))
            write_dashboard(p,{'editor_sha256':'a','release':'test'})
            self.assertEqual(json.loads((review/'index.json').read_text())['rom_count'],1)


def parse_header_fixture():
    return {'mapper':0, 'prg_bytes':16384, 'chr_bytes':8192, 'trainer_bytes':0}

if __name__ == '__main__':unittest.main()
