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
start='''# NES Forge workspace resume complete review kit

Extract the entire NES_Forge directory and open nes-forge.html. The full modular
source, native/hosted editors, server/client, launchers, earlier checkpoints and
verification are included. Start with app/docs/PROJECT_HANDBOOK.html: Punch-Out
section 20 and developer section 16 explain saved pose/editor context.

Open Glass Joe incremental $C0, select a piece, save with Save Project As, then
open that JSON in a fresh application. The pose, piece and editor return. Native
CHR also resumes its pose footprint and return shortcut. Older ambiguous saves
show Choose a pose rather than an unrelated first frame. UI preferences do not
rebind assets or change the configured runtime start. Native editing remains
bounded by existing writers and source-snapshot guards.

Root START_HOSTED_WINDOWS.cmd / START_HOSTED.sh launch the versioned localhost
host after requirements are installed. Follow experiments/hosted-worlds/v17.1/
README_START_HERE.md and the hosted handbook chapter. Hosted fidelity remains
experimental. Source is on the existing draft PR; main merge is separate.

See reviews/workspace-resume-1/HANDOFF.md and Verification_Summary.json for exact
scope. Private ROMs, commercial source projects, screenshots, runtime databases
and keys are excluded. KIT_MANIFEST.json records source hashes; optional
PUBLICATION.json records the confirmed GitHub commit/tree.
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
