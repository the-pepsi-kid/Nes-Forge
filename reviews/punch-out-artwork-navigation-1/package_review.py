"""Package current code, tutorials and navigation evidence; no private inputs."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib
import json
import subprocess
import sys

root = Path(__file__).resolve().parents[2]
review = Path(__file__).resolve().parent
previous, output = map(Path, sys.argv[1:3])
sha = lambda data: hashlib.sha256(data).hexdigest()
html = (root / 'nes-forge.html').read_bytes()
identity = sha(html)
assert identity == json.loads((root / 'CANDIDATE.json').read_text())['htmlSha256']
for name in ['Navigation_DOM_Verification.json', 'Startup_DOM_Verification.json',
             'Source_Preservation.json', 'Documentation_Verification.json', 'gate/Summary.json']:
    result = json.loads((review / name).read_text())
    assert result['status'] == 'passed' and result['htmlSha256'] == identity, name

app_name = 'NES_Forge_Punch_Out_Idle_And_Incremental_Poses.html'
baseline_name = 'Baseline/Idle_Incremental_Pre_Navigation.html'
inputs_name = 'Baseline/Idle_Incremental_Build_Inputs.json'
manifest_name = 'Baseline/Idle_Incremental_Source_Manifest.json'
files = {}
with ZipFile(previous) as archive:
    for name in archive.namelist():
        if name.startswith('Baseline/'):
            files[name] = archive.read(name)
    files.setdefault(baseline_name, archive.read(app_name))
    files.setdefault(inputs_name, archive.read('Source/app/build-inputs.json'))
    files.setdefault(manifest_name, archive.read('Source/app/source-manifest.json'))

# Explicit tracked paths plus this owned review directory exclude private ROMs,
# unrelated temporary files, downloaded dependencies, helpers and .git state.
try:
    checkout = Path(subprocess.check_output(['git', 'rev-parse', '--show-toplevel'], cwd=root,
                                           stderr=subprocess.DEVNULL, text=True).strip())
except subprocess.CalledProcessError:
    checkout = None
if checkout == root:
    paths = set(subprocess.check_output(['git', 'ls-files'], cwd=root, text=True).splitlines())
else:
    inventory = json.loads((root.parent / 'MANIFEST.json').read_text())
    paths = {name.removeprefix('Source/') for name in inventory if name.startswith('Source/')}
paths.update(path.relative_to(root).as_posix() for path in review.rglob('*') if path.is_file())
paths.discard((review / 'Package_Verification.json').relative_to(root).as_posix())
for name in sorted(paths):
    source = root / name
    if source.is_file():
        files['Source/' + name] = source.read_bytes()

files[app_name] = html
files['NES_Forge_Project_Tutorials.html'] = (root / 'app/docs/PROJECT_HANDBOOK.html').read_bytes()
files['NES_Forge_Developer_Guide.html'] = (root / 'app/docs/NATIVE_RECOVERY_TUTORIAL.html').read_bytes()
files['NES_Forge_Developer_Guide.md'] = (root / 'app/docs/NATIVE_RECOVERY_TUTORIAL.md').read_bytes()
files['Handoff.md'] = (review / 'HANDOFF.md').read_bytes()
files['Owner_Checklist.md'] = (review / 'Owner_Checklist.md').read_bytes()
files['Review.md'] = b'''# Pose and artwork navigation repair

Open NES_Forge_Punch_Out_Idle_And_Incremental_Poses.html and your supported
Punch-Out ROM/native project. Recovered content now shows the expanded native
pose picker above the source-reference preview. Choose incremental $C0 / idle
and Edit native Glass Joe pose position.

CHR SHEET selects Sprite Bank for that pose. The context strip above the sheet
opens the source-verified physical CHR bank in its dedicated BG-buffer writer,
or returns to pose position editing. Metasprites has View pose sprite tiles and
Edit native sprite artwork shortcuts. Copied art remains a reference snapshot;
unsupported reference edits cannot be silently re-signed by navigation.

Both supplied US revisions pass actual DOM button/pixel events, exact native
pixel writes, Undo/Redo, save/reopen, combined idle/art edits and protected-copy
refusal. Ten startup/workstation checks and 104 retained public checks pass.
The codecs, native encoders, source recognition, emulator and project schemas
are unchanged. Earlier native playback reports retain their own preceding hash.

Read Handoff.md, Owner_Checklist.md and the offline handbook's Punch-Out section
17. Source contains the full current modular app/docs and historical evidence;
Baseline contains prior code-only HTML and reproducible source-input hashes.
Parsed DOM stubs canvas/layout/timers. Device/listening/controller, external
emulator and hardware acceptance remain separate. No ROM or private game assets
are included. This is a local development candidate, with no public Git update.
'''

manifest = json.loads(files['Source/app/source-manifest.json'])
assert b''.join(files['Source/app/' + name] for name in manifest['parts']) == html
assert files['Source/app/mainline/NES_Forge_2.0.0-alpha.11.html'] == html
old_inputs = json.loads(files[inputs_name])
old_manifest = json.loads(files[manifest_name])
assert manifest['parts'] == old_manifest['parts']
assert sha(files[baseline_name]) == old_inputs['sha256'] == '3cf862ba5210fabe972f1d5c3f7eda32a0e6f7db08b718d35b829de00fb273fc'
cursor, changed = 0, []
for item in old_inputs['inputs']:
    assert sha(files[baseline_name][cursor:cursor + item['bytes']]) == item['sha256'], item['path']
    cursor += item['bytes']
    if sha(files['Source/app/' + item['path']]) != item['sha256']:
        changed.append(item['path'])
assert cursor == len(files[baseline_name]) and len(changed) == 3
for name in files:
    assert not Path(name).is_absolute() and '..' not in Path(name).parts, name
    assert not any(part.startswith('.') and part != '.github' for part in Path(name).parts), name
    assert Path(name).suffix.lower() not in {'.nes', '.nsf', '.bin', '.zip', '.png', '.jpg', '.ppm', '.wav', '.mp3'}, name
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
report = {'status': 'passed', 'htmlSha256': identity, 'files': len(files),
          'zipBytes': output.stat().st_size, 'zipSha256': sha(output.read_bytes()),
          'allManifestFilesAndCrcVerified': True, 'predecessorInputsReproducedWithoutGit': True,
          'sourceInputs': len(manifest['parts']), 'unchangedPredecessorInputs': 181,
          'changedRuntimeInputs': changed, 'noPrivateRomProjectGameMediaPayloads': True}
(review / 'Package_Verification.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
