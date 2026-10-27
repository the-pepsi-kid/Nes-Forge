"""Package a full tracked checkout; never distribute private ROMs or runtime data."""
from pathlib import Path
import argparse
import hashlib
import json
import subprocess
import zipfile

root = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('output', type=Path)
parser.add_argument('--publication', type=Path, help='Optional confirmed publication receipt')
args = parser.parse_args()
tracked = subprocess.check_output(['git','ls-files','-z'],cwd=root).decode().split('\0')
files = sorted(name for name in tracked if name)
assert files and not subprocess.check_output(['git','diff','--name-only','HEAD'],cwd=root).strip(), 'Commit the validated source before packaging'
for name in files:
    parts=Path(name).parts
    assert not Path(name).is_absolute() and '..' not in parts and '.git' not in parts
    assert Path(name).suffix.lower() not in {'.nes','.db','.sqlite','.sqlite3','.png','.jpg','.jpeg','.webp'}, name
    assert not any(part in {'node_modules','__pycache__','.venv','private-roms','runtime'} for part in parts), name
    assert (root/name).is_file() and not (root/name).is_symlink(), name
sha = lambda data: hashlib.sha256(data).hexdigest()
commit = subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
tree = subprocess.check_output(['git','rev-parse','HEAD^{tree}'],cwd=root,text=True).strip()
manifest = {'format':'NESForgeCompleteReviewKit','version':1,'sourceCommit':commit,'sourceTree':tree,
    'nativeHtmlSha256':sha((root/'nes-forge.html').read_bytes()),
    'hostedHtmlSha256':sha((root/'experiments/hosted-worlds/v17.1/NES_Forge_3x_v17_Hosted_Link_Actions_Experimental.html').read_bytes()),
    'files':[{'path':name,'bytes':(root/name).stat().st_size,'sha256':sha((root/name).read_bytes())} for name in files],
    'privateRomsIncluded':False,'runtimeDataIncluded':False,'screenshotsIncluded':False}
start='''# NES Forge connected Resources complete review kit

Extract the whole `NES_Forge` directory. Open `nes-forge.html` for native/offline
work. Start at `app/docs/PROJECT_HANDBOOK.html`; Punch-Out section 19 explains the
new pose, Resources, used-tile and native writer workflow, with code/hex/HTML paths.

Native tools -> Glass Joe pose positions -> incremental $C0 idle -> open ->
Resources or View pose sprite tiles. CHR's Tile view switches between the whole
bank and the selected pose's footprint. Physical CHR and fight colors have
explicit native writers. Known-use coverage is partial; snapshots remain copies.

The hosted editor, server, player client, requirements and versioned launchers are
included under `experiments/hosted-worlds/v17.1`. Root `START_HOSTED_WINDOWS.cmd`
or `START_HOSTED.sh` starts its localhost host after installing requirements.
Follow its README_START_HERE and the hosted handbook chapter. Hosted gameplay
fidelity remains experimental. Main and the original Pepsi archive are preserved.

Full modular source, earlier checkpoints, tutorials and verification are included.
`reviews/connected-resource-workflow-1/HANDOFF.md` explains ownership and test scope.
Private ROMs, source-bearing commercial projects, runtime DBs, keys and screenshots
are excluded. Use your own local ROM inputs. `KIT_MANIFEST.json` records each
source file hash; optional PUBLICATION.json records confirmed GitHub publication.
'''
args.output.parent.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(args.output,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as archive:
    for name in files: archive.write(root/name,'NES_Forge/'+name)
    archive.writestr('NES_Forge/START_HERE.md',start)
    archive.writestr('NES_Forge/KIT_MANIFEST.json',json.dumps(manifest,indent=2)+'\n')
    if args.publication: archive.writestr('NES_Forge/PUBLICATION.json',args.publication.read_bytes())
with zipfile.ZipFile(args.output) as archive:
    assert archive.testzip() is None
    for item in manifest['files']:
        assert sha(archive.read('NES_Forge/'+item['path']))==item['sha256'],item['path']
    members=len(archive.infolist())
report={'status':'passed','file':str(args.output.resolve()),'bytes':args.output.stat().st_size,
    'sha256':sha(args.output.read_bytes()),'sourceFiles':len(files),'zipMembers':members,
    'sourceCommit':commit,'sourceTree':tree,'crcAndAllSourceHashesVerified':True,
    'privateRomsIncluded':False,'runtimeDataIncluded':False,'screenshotsIncluded':False}
args.output.with_suffix('.verification.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
