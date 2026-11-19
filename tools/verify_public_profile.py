"""Verify the public editor profile and the authored cartridge fixture identities."""
import argparse
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


def payloads():
    for name in manifest['parts']:
        text = (ROOT/'app'/name).read_text()
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


check('Both launch entries reproduce all manifest source parts', sources)
check('Private compressed capture catalogs are excluded', payloads)
check('Distributed editable projects contain no preserved ROM field', examples)
check('Only the four identified authored cartridge fixtures are shipped', fixtures)
report = {'editorSha256': digest, 'checks': checks, 'total': len(checks),
          'passed': all(row['passed'] for row in checks)}
if args.output:
    args.output.write_text(json.dumps(report, indent=2)+'\n')
print(json.dumps(report, indent=2))
raise SystemExit(0 if report['passed'] else 1)
