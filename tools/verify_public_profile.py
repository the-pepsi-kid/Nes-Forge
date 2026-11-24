"""Verify the public editor profile and the authored cartridge fixture identities."""
import argparse
import base64
import hashlib
import json
import sys
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output', type=Path)
args = parser.parse_args()
manifest = json.loads((ROOT/'app/source-manifest.json').read_text())
editor = (ROOT/'NES_Forge.html').read_bytes()
digest = hashlib.sha256(editor).hexdigest()
checks = []


def check(name, action):
    try:
        action()
        checks.append({'name': name, 'passed': True})
    except (AssertionError, OSError, ValueError) as error:
        checks.append({'name': name, 'passed': False, 'error': str(error)})


def sources():
    parts = [(ROOT/'app'/name).read_bytes() for name in manifest['parts']]
    assert len(parts) == len(manifest['parts']) and len(parts) >= 219, 'Unexpected source part count'
    assert b''.join(parts) == editor, 'Editor does not match ordered source parts'
    assert (ROOT/'nes-forge.html').read_bytes() == editor, 'Launch entries differ'
    sys.path.insert(0, str(ROOT/'tools'))
    from release_identity import release_name
    assert release_name().encode() in editor, 'Stale build identity'


SYNTHETIC = ROOT/'QA/fixtures/al-exp-01'
SYNTHETIC_SUITES = [ROOT/'QA/fixtures/al-exp-01', ROOT/'QA/fixtures/al-exp-02']
MARKER = b'NESFORGE-SYNTHETIC/1 '


def synthetic_cartridge(data):
    # an AL-EXP-01/02 fixture: iNES NROM-128, 16 KiB PRG + 8 KiB CHR, the marker at the start of the last 256 PRG bytes
    prg_start = 16 + (512 if data[6] & 4 else 0)
    return data[:4] == b'NES\x1a' and data[4] == 1 and data[5] == 1 and data[prg_start+0x3f00:prg_start+0x3f00+len(MARKER)] == MARKER


def payloads():
    seeds = json.loads((SYNTHETIC/'seeds.json').read_text())
    pinned = {row['seed']: row['sha256'] for row in seeds['fixtures']}
    for name in manifest['parts']:
        text = (ROOT/'app'/name).read_text()
        if name == 'src/re/experiment-demo-fixture.js':
            # The one reviewed exception: the experimental panel's original synthetic cartridge, identified by its pinned
            # SHA-256 and marker. Anything else in this part fails.
            blob = re.findall(r'"base64":"([A-Za-z0-9+/=]+)"', text)
            assert len(blob) == 1, name
            data = base64.b64decode(blob[0])
            assert hashlib.sha256(data).hexdigest() == pinned[seeds['demoSeed']] and synthetic_cartridge(data), name
            text = text.replace(blob[0], '')
        assert not re.search(r'[A-Za-z0-9+/]{501,}={0,2}', text), name
    text = (ROOT/'app/src/re/external-recovery-catalog.js').read_text()
    assert 'function find(){return null;}' in text, 'Captured-project catalog enabled'
    text = (ROOT/'app/src/re/recovery-evidence-catalog.js').read_text()
    assert 'function list(){return [];}' in text, 'Embedded raw evidence enabled'


def examples():
    for folder in ['Examples', 'QA/p']:
        for file in (ROOT/folder).glob('*.json'):
            project = json.loads(file.read_text())
            assert not project.get('importedRom'), str(file.relative_to(ROOT))


def fixtures():
    expected = {
        # Rebuilt for 2.0.0-alpha.12: only the embedded project's foundation string changed (13 bytes in the source record).
        'game.nes': '91faa45ceefd32b1288e1b276777eb77d4ada6e5a3a28fdf6d08c65505c844b2',
        'EightStages.nes': '541e081cfb59def407987588eef2794328082f063aa3761198db0a88a9e685a7',
        'Teapot418.nes': '12a6d3c2380c479f52c544a85bba30bcb2f3281e94a109c811c7e2e5c464ed6e',
        'BeaconIsland.nes': 'a3280ef03d91b2521d7a61b7016e55891065407f83d033aae835fdae781accb0',
    }
    found = {file.name for file in (ROOT/'QA/r').iterdir() if file.is_file()}
    assert found == set(expected), 'Unexpected authored cartridge fixture'
    for name, sha in expected.items():
        assert hashlib.sha256((ROOT/'QA/r'/name).read_bytes()).hexdigest() == sha, name
    # AL-EXP-01 and AL-EXP-02 synthetic fixtures: exactly the pinned sets, each regenerable and marked as synthetic
    allowed = {ROOT/'QA/r'/name for name in expected}
    for suite in SYNTHETIC_SUITES:
        seeds = {row['file']: row['sha256'] for row in json.loads((suite/'seeds.json').read_text())['fixtures']}
        roms = {file.name for file in (suite/'roms').iterdir() if file.is_file()}
        assert roms == set(seeds), 'Unexpected synthetic fixture in '+str(suite.relative_to(ROOT))
        for name, sha in seeds.items():
            data = (suite/'roms'/name).read_bytes()
            assert hashlib.sha256(data).hexdigest() == sha and synthetic_cartridge(data), name
        allowed |= {suite/'roms'/name for name in seeds}
    # no cartridge anywhere else in the source tree
    for folder in ['app', 'QA', 'tools', 'docs', 'Examples']:
        for file in (ROOT/folder).rglob('*.nes'):
            if 'node_modules' in file.parts:
                continue
            assert file in allowed, 'Unidentified cartridge '+str(file.relative_to(ROOT))


check('Both launch entries reproduce all manifest source parts', sources)
check('Private compressed capture catalogs are excluded', payloads)
check('Distributed editable projects contain no preserved ROM field', examples)
check('Only the four identified authored cartridges and the pinned synthetic AL-EXP-01/02 fixtures are shipped', fixtures)
report = {'editorSha256': digest, 'checks': checks, 'total': len(checks),
          'passed': all(row['passed'] for row in checks)}
if args.output:
    args.output.write_text(json.dumps(report, indent=2)+'\n')
print(json.dumps(report, indent=2))
raise SystemExit(0 if report['passed'] else 1)
