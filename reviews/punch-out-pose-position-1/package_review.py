"""Refresh the preceding source/tutorial kit with verified native pose placement."""
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
assert sha(html) == '90c179abf3360821dc2dd93168ef74fa6ae2282a78ee6c7357958424612c4322'
assert sha(baseline.read_bytes()) == '9d448a050dc480b165ef3ec75a7c400786c927754c395814315d1974f8afc5d0'
for name in ['Pose_Verification.json', 'Pose_DOM_Verification.json', 'Pose_Playback_Verification.json',
             'Startup_DOM_Verification.json', 'Source_Preservation.json', 'gate/Summary.json']:
    result = json.loads((review / name).read_text())
    assert result['status'] == 'passed' and result['htmlSha256'] == sha(html), name
with ZipFile(previous) as archive:
    files = {name: archive.read(name) for name in archive.namelist() if name != 'MANIFEST.json'}
for name in list(files):
    if name.startswith('Source/'):
        source = root / name.removeprefix('Source/')
        if source.is_file():
            files[name] = source.read_bytes()
for source in [root / 'app/src/re/punch-out-pose.js', root / 'app/src/services/punch-out-pose-project.js',
               root / 'app/src/re/punch-out-pose-ui.js', *review.rglob('*')]:
    if source.is_file() and source.name != 'Package_Verification.json':
        files['Source/' + source.relative_to(root).as_posix()] = source.read_bytes()
for name in list(files):
    if '/' not in name and name.endswith('.html') and name != 'NES_Forge_Project_Tutorials.html':
        del files[name]
files['NES_Forge_Punch_Out_Native_Pose_Positions.html'] = html
files['NES_Forge_Project_Tutorials.html'] = (root / 'app/docs/PROJECT_HANDBOOK.html').read_bytes()
files['Baseline/NES_Forge_Retro_Workstation_Startup_Fixed.html'] = baseline.read_bytes()
files['Handoff.md'] = (review / 'HANDOFF.md').read_bytes()
files['Owner_Checklist.md'] = (review / 'Owner_Checklist.md').read_bytes()
files['Review.md'] = b'''# Native Glass Joe full-pose positions

Open NES_Forge_Punch_Out_Native_Pose_Positions.html. Recovered content ->
Native pose positions / Glass Joe -> select a full pose -> Edit native Glass Joe
pose position. Apply signed Native X/Y in Metasprites, then Undo/Redo,
save/reopen, build/download and reimport the exported ROM.

The writer owns only the two position bytes of each opened full pose. All 30
full poses roundtrip/move through the original shape reader on both revisions.
Actual exported/reimported original-engine intro/punch/dodge playback checks
live OAM translation and video hashes with no RAM seeds. Strict parsed-DOM
controls and the 104 retained public checks also pass on this application hash.

Full and incremental poses have separate source records. A full-pose edit need
not move later delta-based idle frames. Individual geometry, tiles/flags/order,
delta poses, other opponents, native animation/timing, AI/damage/collision and
Audio writing remain separate work. Visual placement leaves original hit rules
intact; inspect alignment. Full game recovery is unfinished.

Read Handoff.md and Owner_Checklist.md. NES_Forge_Project_Tutorials.html contains
the updated title lesson, source/asset connections, independent RE/hex/HTML and
authored-game workflows. Source contains the modular build, scripts and fresh
checkpoint evidence. Baseline contains code-only previous apps for regression.
Historical evidence retains its own HTML hash and scope. No browser layout,
device/listening, external-emulator or hardware acceptance is claimed here.
No ROM, private source project, emulator snapshot, commercial game frame or
Audio payload is included. No new public Git push is part of this checkpoint.
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
result = {'status': 'passed', 'htmlSha256': sha(html), 'files': len(files),
          'bytes': output.stat().st_size, 'zipSha256': sha(output.read_bytes()),
          'sourceInputs': len(manifest['parts']), 'allManifestFilesVerified': True,
          'sourceBundleMatchesDeliveredHtml': True, 'noRomPrivateSnapshotGameFrameOrAudioPayloads': True}
(review / 'Package_Verification.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
