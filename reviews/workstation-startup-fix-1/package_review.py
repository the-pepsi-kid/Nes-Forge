"""Refresh the preceding source/tutorial kit with the bounded startup repair."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib
import json
import sys

root = Path(__file__).resolve().parents[2]
review = Path(__file__).resolve().parent
previous, baseline, output = map(Path, sys.argv[1:4])
sha = lambda data: hashlib.sha256(data).hexdigest()
html = (root / 'app/mainline/NES_Forge_2.0.0-alpha.11.html').read_bytes()
assert sha(html) == '9d448a050dc480b165ef3ec75a7c400786c927754c395814315d1974f8afc5d0'
assert sha(baseline.read_bytes()) == 'cf5825b600fc8f8c028e9df0def70cc1cac483408ad49b8327715b02a4598e08'
for name in ['Startup_DOM_Verification.json', 'Source_Preservation.json', 'gate/Summary.json']:
    report = json.loads((review / name).read_text())
    assert report['status'] == 'passed' and report['htmlSha256'] == sha(html)
with ZipFile(previous) as archive:
    files = {name: archive.read(name) for name in archive.namelist() if name != 'MANIFEST.json'}
for name in list(files):
    if name.startswith('Source/'):
        source = root / name.removeprefix('Source/')
        if source.is_file():
            files[name] = source.read_bytes()
for source in [root / 'app/tests/workstation-startup-dom.cjs', *review.rglob('*')]:
    if source.is_file() and source.name != 'Package_Verification.json':
        files['Source/' + source.relative_to(root).as_posix()] = source.read_bytes()
files['NES_Forge_Retro_Punch_Out_Native_Workflows.html'] = html
files['Baseline/NES_Forge_Broken_Workstation_Before_Fix.html'] = baseline.read_bytes()
files['Handoff.md'] = (review / 'HANDOFF.md').read_bytes()
files['Owner_Checklist.md'] = (review / 'Owner_Checklist.md').read_bytes()
files['Review.md'] = b'''# Fixed workstation startup

Open NES_Forge_Retro_Punch_Out_Native_Workflows.html from this corrected kit.
Retro Workstation and its density selector are in the upper toolbar. Resources
and Connected Workspace are available with either appearance.

The previous combined HTML crashed before mounting all adopted UI. Its replay
panel used a canvas that Play view had already moved into a wrapper as a direct
insertion anchor. The fixed insertion retains the existing canvas owner and
the supplied appearance/resource modules unchanged.

Read Handoff.md for the exact failure, source scope, before/after DOM evidence,
and reproduction commands. The strict parsed-DOM startup/control checks and all
104 retained checks pass on this app. These are not a fresh browser layout,
mobile/controller/listening or hardware acceptance pass. Earlier title evidence
under Source/reviews retains its recorded scope and HTML hash; the preceding
permissive Workstation_Verification.json did not establish real DOM startup.

NES_Forge_Project_Tutorials.html remains the offline asset/developer/title book.
Source contains all modular inputs, tests and evidence. The Baseline directory
contains source-only app snapshots for regression comparisons, including the
broken preceding delivery. No ROM, private source-bearing project, emulator
snapshot, commercial game frame or Audio payload is included.
'''
assert files['Source/app/mainline/NES_Forge_2.0.0-alpha.11.html'] == html
manifest = json.loads(files['Source/app/source-manifest.json'])
assert b''.join(files['Source/app/' + name] for name in manifest['parts']) == html
for name in files:
    assert not any(part.startswith('.') for part in Path(name).parts), name
    assert Path(name).suffix.lower() not in {'.nes', '.bin', '.ppm', '.png', '.jpg', '.wav', '.mp3'}, name
inventory = {name: {'bytes': len(data), 'sha256': sha(data)} for name, data in files.items()}
files['MANIFEST.json'] = (json.dumps(inventory, indent=2) + '\n').encode()
with ZipFile(output, 'w', compression=ZIP_DEFLATED, compresslevel=9) as archive:
    for name, data in files.items():
        archive.writestr(name, data)
with ZipFile(output) as archive:
    assert archive.testzip() is None
    for name, expected in inventory.items():
        data = archive.read(name)
        assert len(data) == expected['bytes'] and sha(data) == expected['sha256'], name
report = {'status': 'passed', 'htmlSha256': sha(html), 'files': len(files),
          'bytes': output.stat().st_size, 'zipSha256': sha(output.read_bytes()),
          'sourceInputs': len(manifest['parts']), 'allManifestFilesVerified': True,
          'sourceBundleMatchesDeliveredHtml': True, 'noRomPrivateSnapshotGameFrameOrAudioPayloads': True}
(review / 'Package_Verification.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
