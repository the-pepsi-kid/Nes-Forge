"""Full runnable kit: current app/source/tutorials, audit, repair and baselines."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib
import json
import subprocess
import sys

review = Path(__file__).resolve().parent
root = review.parents[1]
previous, output = map(Path, sys.argv[1:3])
sha = lambda value: hashlib.sha256(value).hexdigest()
html = (root / 'nes-forge.html').read_bytes()
identity = sha(html)
candidate = json.loads((root / 'CANDIDATE.json').read_text())
assert candidate['htmlSha256'] == identity and candidate['htmlBytes'] == len(html)
required = ['Verification_Summary.json', 'Capabilities_DOM_Verification.json', 'Startup_DOM_Verification.json',
            'Navigation_DOM_Verification.json', 'Source_Preservation.json', 'Documentation_Verification.json', 'gate/Summary.json']
for name in required:
    report = json.loads((review / name).read_text())
    assert report['status'] == 'passed' and report['htmlSha256'] == identity, name
assert json.loads((review / 'gate/Summary.json').read_text())['passed'] == 104
assert json.loads((review / 'Capabilities_DOM_Verification.json').read_text())['total'] == 12
assert json.loads((review / 'Startup_DOM_Verification.json').read_text())['passed'] == 10
assert len(json.loads((review / 'Navigation_DOM_Verification.json').read_text())['results']) == 2

files = {}
with ZipFile(previous) as archive:
    for name in archive.namelist():
        if name.startswith('Baseline/'):
            files[name] = archive.read(name)
    old = archive.read('NES_Forge_Current_Reviewed_Build.html')
    assert sha(old) == '9ac2c6750561f3e8c2dd5f542f6c6d9930383771000f1fd3cf751d70feb09d66'
    files['Baseline/NES_Forge_Previous_Connected_Review.html'] = old
paths = set(subprocess.check_output(['git', 'ls-files'], cwd=root, text=True).splitlines())
paths.update(p.relative_to(root).as_posix() for p in review.rglob('*') if p.is_file())
paths.add('app/src/services/project-capabilities.js')
paths.discard((review / 'Package_Verification.json').relative_to(root).as_posix())
for name in sorted(paths):
    source = root / name
    if source.is_file():
        files['Source/' + name] = source.read_bytes()
for p in review.rglob('*'):
    if p.is_file() and p.name != 'Package_Verification.json':
        files['Review/' + p.relative_to(review).as_posix()] = p.read_bytes()
files['NES_Forge_Punch_Out_Idle_And_Incremental_Poses.html'] = html
files['HANDOFF.md'] = (review / 'HANDOFF.md').read_bytes()
files['Owner_Checklist.md'] = (review / 'Owner_Checklist.md').read_bytes()
files['NES_Forge_Project_Tutorials.html'] = (root / 'app/docs/PROJECT_HANDBOOK.html').read_bytes()
files['NES_Forge_Developer_Guide.html'] = (root / 'app/docs/NATIVE_RECOVERY_TUTORIAL.html').read_bytes()
files['NES_Forge_Developer_Guide.md'] = (root / 'app/docs/NATIVE_RECOVERY_TUTORIAL.md').read_bytes()
for name in ['REVIEW.html', 'REVIEW.md', 'ISSUES.csv', 'HANDOFF.md']:
    files['Original_Audit/' + name] = (root / 'reviews/connected-workflow-review-1' / name).read_bytes()
files['START_HERE.md'] = b'''# NES Forge connected native workflows: first repair batch

Open NES_Forge_Punch_Out_Idle_And_Incremental_Poses.html directly in a browser.
It is the current complete alpha application, including this repair, with the
existing download filename retained. No server, installation or network is
required. Source/nes-forge.html and the generated app inside Source match it.

Start with Owner_Checklist.md. HANDOFF.md explains what changed, verification,
limits and the next batch. Review includes reproducible probes and fresh reports.
Source contains the complete modular checkout, existing tests, tutorials,
historical checkpoints and original Pepsi archive. This is not a patch ZIP.
Baseline retains code-only previous builds; Original_Audit is the frozen review
of the older 9ac2... application, not a report of the current repaired runtime.

The first repair fixes project capability scope and inapplicable build controls.
Used-resource footprints, source/physical-owner navigation and shared consumers
remain next. The full connected-workflow review and Punch-Out recovery are open.
Save Project As preserves project source. Native writers remain bounded, and
unsupported copied edits still refuse native builds. No schema or native encoder
was added. No GitHub publication is part of this checkpoint.

The offline project tutorials and developer guide cover authoring, native work,
independent RE/6502/hex editing and changing the standalone HTML or modular source.
Private ROMs, commercial saved projects, media and emulator snapshots are not
included. Browser/device/listening/controller/hardware and visible game acceptance
remain distinct from stubbed parsed-DOM and byte checks. Initial_Concurrent_*
records an earlier different-hash run with VM timeouts; final reports carry the
current application hash and run one worker on frozen inputs.
'''
manifest = json.loads(files['Source/app/source-manifest.json'])
assert b''.join(files['Source/app/' + p] for p in manifest['parts']) == html
assert files['Source/app/mainline/NES_Forge_2.0.0-alpha.11.html'] == html
for name in files:
    assert not Path(name).is_absolute() and '..' not in Path(name).parts, name
    assert not any(part.startswith('.') and part != '.github' for part in Path(name).parts), name
    assert Path(name).suffix.lower() not in {'.nes', '.nsf', '.bin', '.zip', '.png', '.jpg', '.ppm', '.wav', '.mp3', '.mp4'}, name
inventory = {name: {'bytes': len(data), 'sha256': sha(data)} for name, data in sorted(files.items())}
files['MANIFEST.json'] = (json.dumps(inventory, indent=2) + '\n').encode()
with ZipFile(output, 'w', compression=ZIP_DEFLATED, compresslevel=9) as archive:
    for name, data in sorted(files.items()):
        archive.writestr(name, data)
with ZipFile(output) as archive:
    assert archive.testzip() is None
    for name, expected in inventory.items():
        data = archive.read(name)
        assert len(data) == expected['bytes'] and sha(data) == expected['sha256'], name
report = {'status': 'passed', 'htmlSha256': identity, 'fullSourceInputs': len(manifest['parts']), 'files': len(files),
          'allManifestFilesAndCrcVerified': True, 'privateRomProjectMediaPayloadsIncluded': False,
          'zipBytes': output.stat().st_size, 'zipSha256': sha(output.read_bytes())}
(review / 'Package_Verification.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
