"""Build a code/tutorial/evidence kit without private ROM or game payloads."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib
import json
import subprocess
import sys

root = Path(__file__).resolve().parents[2]
review = Path(__file__).resolve().parent
previous, baseline, output = map(Path, sys.argv[1:4])
sha = lambda value: hashlib.sha256(value).hexdigest()
html = (root / 'app/mainline/NES_Forge_2.0.0-alpha.11.html').read_bytes()
identity = sha(html)
assert identity == '3cf862ba5210fabe972f1d5c3f7eda32a0e6f7db08b718d35b829de00fb273fc'
assert sha(baseline.read_bytes()) == '90c179abf3360821dc2dd93168ef74fa6ae2282a78ee6c7357958424612c4322'
required = ['Incremental_Verification.json', 'Compatibility_Verification.json',
            'Incremental_DOM_Verification.json', 'Idle_Playback_Verification.json',
            'Full_Pose_Regression.json', 'Full_Pose_DOM_Regression.json',
            'Startup_DOM_Verification.json', 'Source_Preservation.json',
            'Documentation_Verification.json', 'gate/Summary.json']
for name in required:
    report = json.loads((review / name).read_text())
    assert report['status'] == 'passed' and report['htmlSha256'] == identity, name

files = {}
with ZipFile(previous) as archive:
    for name in archive.namelist():
        if name.startswith('Baseline/'):
            files[name] = archive.read(name)
    files['Baseline/Accepted_Main_Build_Inputs.json'] = archive.read('Source/app/build-inputs.json')
    files['Baseline/Accepted_Main_Source_Manifest.json'] = archive.read('Source/app/source-manifest.json')
files['Baseline/NES_Forge_Punch_Out_Native_Pose_Positions.html'] = baseline.read_bytes()

# Explicit tracked paths plus this owned review directory exclude unrelated
# untracked files, private inputs, caches, downloaded dependencies and helpers.
try:
    checkout = Path(subprocess.check_output(['git', 'rev-parse', '--show-toplevel'], cwd=root,
                                           stderr=subprocess.DEVNULL, text=True).strip())
except subprocess.CalledProcessError:
    checkout = None
if checkout == root:
    paths = set(subprocess.check_output(['git', 'ls-files'], cwd=root, text=True).splitlines())
else:
    # The extracted standalone kit intentionally has no .git directory. Its
    # verified outer inventory still supplies an explicit source-file set.
    outer = json.loads((root.parent / 'MANIFEST.json').read_text())
    paths = {name.removeprefix('Source/') for name in outer if name.startswith('Source/')}
paths.update(path.relative_to(root).as_posix() for path in review.rglob('*') if path.is_file())
paths.discard((review / 'Package_Verification.json').relative_to(root).as_posix())
for name in sorted(paths):
    source = root / name
    if source.is_file():
        files['Source/' + name] = source.read_bytes()

files['NES_Forge_Punch_Out_Idle_And_Incremental_Poses.html'] = html
files['NES_Forge_Project_Tutorials.html'] = (root / 'app/docs/PROJECT_HANDBOOK.html').read_bytes()
files['NES_Forge_Developer_Guide.html'] = (root / 'app/docs/NATIVE_RECOVERY_TUTORIAL.html').read_bytes()
files['NES_Forge_Developer_Guide.md'] = (root / 'app/docs/NATIVE_RECOVERY_TUTORIAL.md').read_bytes()
files['Handoff.md'] = (review / 'HANDOFF.md').read_bytes()
files['Owner_Checklist.md'] = (review / 'Owner_Checklist.md').read_bytes()
files['Review.md'] = b'''# Native idle and incremental pose positions

Open NES_Forge_Punch_Out_Idle_And_Incremental_Poses.html. Recovered content ->
Native pose positions / Glass Joe -> incremental $C0 / idle -> Edit native
Glass Joe pose position. Check Keep idle poses together, set X=-12 from its
original -14, leave Y=-97 and Apply. Three ordinary canonical frames move in
one Undo transaction, preserving the native idle bob and timing. Save/reopen,
export/reimport and run the original native opening/punch/dodge replay.

The picker retains thirty full poses and adds five explicit incremental X/Y
records. Native preceding OAM and observed anchors are retained. The original
C-family OAM Y=$50 priority rule is reflected in the preview; raw flags, code,
pointers and attribute streams remain protected. Each physical record affects
all of its native uses. Individual geometry, position-less records, other
opponents, native animation/AI/collision and Audio writers remain unfinished.

Both revisions pass lifecycle, earlier-project/reader compatibility, protected
bytes, art/palette/arena composition and source-state checks. Exported/reimported
real original-engine playback, without RAM seeds, confirms all three idle
selectors across 153 matching idle frames per revision. The 104 retained public
checks and ten strict DOM startup/control checks also pass on this HTML hash.

Read the offline handbook's Punch-Out section 17 for complete UI, RE, exact hex
offsets and direct HTML/modular-code workflows. The developer guide maps assets
and canonical owners. Source contains the complete current code and
current checkpoint evidence; Baseline contains previous code-only applications.
Historical evidence retains its own hash and scope. Root Source/nes-forge.html
and Source/app/mainline/NES_Forge_2.0.0-alpha.11.html match the delivered app.

MMC2 timing remains approximate. Parsed DOM stubs canvas/timers; browser layout,
listening, controllers, independent-emulator and hardware checks remain separate.
No ROM, source-bearing private commercial project, emulator snapshot, game frame
or Audio payload is included. This is a development candidate; no new public
Git push or main promotion is part of this checkpoint.
'''

manifest = json.loads(files['Source/app/source-manifest.json'])
assert b''.join(files['Source/app/' + name] for name in manifest['parts']) == html
assert files['Source/nes-forge.html'] == html
old_manifest = json.loads(files['Baseline/Accepted_Main_Source_Manifest.json'])
old_inputs = json.loads(files['Baseline/Accepted_Main_Build_Inputs.json'])
assert old_manifest['parts'] == manifest['parts']
assert old_inputs['sha256'] == sha(baseline.read_bytes())
cursor, changed = 0, []
old_bytes = baseline.read_bytes()
for item in old_inputs['inputs']:
    assert sha(old_bytes[cursor:cursor + item['bytes']]) == item['sha256'], item['path']
    cursor += item['bytes']
    if sha(files['Source/app/' + item['path']]) != item['sha256']:
        changed.append(item['path'])
assert cursor == len(old_bytes) and len(changed) == 4
for name in files:
    assert not Path(name).is_absolute() and '..' not in Path(name).parts, name
    assert not any(part.startswith('.') and part != '.github' for part in Path(name).parts), name
    assert Path(name).suffix.lower() not in {'.nes', '.nsf', '.bin', '.zip', '.ppm', '.png', '.jpg', '.wav', '.mp3'}, name
inventory = {name: {'bytes': len(data), 'sha256': sha(data)} for name, data in sorted(files.items())}
files['MANIFEST.json'] = (json.dumps(inventory, indent=2) + '\n').encode()
with ZipFile(output, 'w', compression=ZIP_DEFLATED, compresslevel=9) as archive:
    for name, data in sorted(files.items()):
        archive.writestr(name, data)
with ZipFile(output) as archive:
    assert archive.testzip() is None
    for name, item in inventory.items():
        data = archive.read(name)
        assert len(data) == item['bytes'] and sha(data) == item['sha256'], name
result = {'status': 'passed', 'htmlSha256': identity, 'files': len(files),
          'zipBytes': output.stat().st_size, 'zipSha256': sha(output.read_bytes()),
          'sourceInputs': len(manifest['parts']), 'allManifestFilesVerified': True,
          'baselineInputDigestsReproducedWithoutGit': True,
          'predecessorInputsUnchanged': len(manifest['parts']) - len(changed),
          'rootAndGeneratedSourceMatchDeliveredHtml': True,
          'noRomPrivateSnapshotGameFrameOrAudioPayloads': True}
(review / 'Package_Verification.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
