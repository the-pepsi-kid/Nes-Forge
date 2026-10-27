"""Package the unchanged app, full source, read-only review and evidence."""
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
assert identity == '9ac2c6750561f3e8c2dd5f542f6c6d9930383771000f1fd3cf751d70feb09d66'
required = {'Workflow_Observations.json': 'completed', 'Shared_Resource_Observations.json': 'completed',
            'Architecture_Continuity.json': 'completed', 'Z2_Continuity_Verification.json': 'passed',
            'Document_Verification.json': 'passed'}
for name, status in required.items():
    report = json.loads((review / name).read_text())
    assert report['status'] == status and report['htmlSha256'] == identity, name
files = {}
with ZipFile(previous) as archive:
    for name in archive.namelist():
        if name.startswith('Baseline/'):
            files[name] = archive.read(name)
try:
    checkout = Path(subprocess.check_output(['git', 'rev-parse', '--show-toplevel'], cwd=root,
                                           stderr=subprocess.DEVNULL, text=True).strip())
except subprocess.CalledProcessError:
    checkout = None
if checkout == root:
    paths = set(subprocess.check_output(['git', 'ls-files'], cwd=root, text=True).splitlines())
else:
    outer = json.loads((root.parent / 'MANIFEST.json').read_text())
    paths = {name.removeprefix('Source/') for name in outer if name.startswith('Source/')}
paths.update(p.relative_to(root).as_posix() for p in review.rglob('*') if p.is_file())
paths.discard((review / 'Package_Verification.json').relative_to(root).as_posix())
for name in sorted(paths):
    source = root / name
    if source.is_file():
        files['Source/' + name] = source.read_bytes()
for p in review.iterdir():
    if p.is_file() and p.name != 'Package_Verification.json':
        files['Review/' + p.name] = p.read_bytes()
files['NES_Forge_Current_Reviewed_Build.html'] = html
files['NES_Forge_Connected_Workflow_Review.html'] = (review / 'REVIEW.html').read_bytes()
files['NES_Forge_Connected_Workflow_Review.md'] = (review / 'REVIEW.md').read_bytes()
files['HANDOFF.md'] = (review / 'HANDOFF.md').read_bytes()
files['ISSUES.csv'] = (review / 'ISSUES.csv').read_bytes()
files['NES_Forge_Project_Tutorials.html'] = (root / 'app/docs/PROJECT_HANDBOOK.html').read_bytes()
files['NES_Forge_Developer_Guide.html'] = (root / 'app/docs/NATIVE_RECOVERY_TUTORIAL.html').read_bytes()
files['NES_Forge_Developer_Guide.md'] = (root / 'app/docs/NATIVE_RECOVERY_TUTORIAL.md').read_bytes()
files['START_HERE.md'] = b'''# NES Forge connected workflow review

Open NES_Forge_Connected_Workflow_Review.html for the standalone report.
HANDOFF.md records the paused state. ISSUES.csv lists ten prioritized repair
items, observation IDs and acceptance criteria. Review contains reproducible
read-only probes and their evidence; Source contains the complete modular app,
tutorials and retained checks. Baseline keeps previous code-only applications.

NES_Forge_Current_Reviewed_Build.html is the exact existing alpha.11 reviewed
here. Open it directly in a browser; no server, installation or network is
required. This is an audit package, not a fixed release or an incremental patch.
No application/encoder/schema changes or GitHub publication were made by this
review. The root and generated app inside Source match the reviewed HTML.

Read report section 10 to reproduce the isolated DOM/source probes. jsdom 30.1.3
and the user's supported ROM inputs are separate test dependencies. Source ROMs,
private saved projects, game media, screenshots and emulator snapshots are not
included. Do not confuse parsed-DOM evidence with browser/device or whole-fight
acceptance. Earlier check reports retain their own application hash and scope.

Preserve the current project owners, safe native refusal, working Zelda II
terrain route, original Pepsi archive, and independent RE/code/hex/HTML paths.
The recommended next milestone consolidates workflow before more title support.
'''
manifest = json.loads(files['Source/app/source-manifest.json'])
assert b''.join(files['Source/app/' + name] for name in manifest['parts']) == html
assert files['Source/nes-forge.html'] == html
assert files['Source/app/mainline/NES_Forge_2.0.0-alpha.11.html'] == html
for name in files:
    assert not Path(name).is_absolute() and '..' not in Path(name).parts, name
    assert not any(part.startswith('.') and part != '.github' for part in Path(name).parts), name
    assert Path(name).suffix.lower() not in {'.nes', '.nsf', '.bin', '.zip', '.png', '.jpg', '.ppm', '.wav', '.mp3', '.mp4'}, name
inventory = {name: {'bytes': len(value), 'sha256': sha(value)} for name, value in sorted(files.items())}
files['MANIFEST.json'] = (json.dumps(inventory, indent=2) + '\n').encode()
with ZipFile(output, 'w', compression=ZIP_DEFLATED, compresslevel=9) as archive:
    for name, value in sorted(files.items()):
        archive.writestr(name, value)
with ZipFile(output) as archive:
    assert archive.testzip() is None
    for name, entry in inventory.items():
        value = archive.read(name)
        assert len(value) == entry['bytes'] and sha(value) == entry['sha256'], name
report = {'status': 'passed', 'htmlSha256': identity, 'reviewedRuntimeUnchanged': True,
          'fullSourceInputs': len(manifest['parts']), 'files': len(files),
          'allManifestFilesAndCrcVerified': True, 'privateRomProjectMediaPayloadsIncluded': False,
          'zipBytes': output.stat().st_size, 'zipSha256': sha(output.read_bytes())}
(review / 'Package_Verification.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
