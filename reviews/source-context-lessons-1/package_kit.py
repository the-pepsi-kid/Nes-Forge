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
start='''# NES Forge app workflow and lessons complete review kit

Extract the entire NES_Forge directory and open nes-forge.html. This is the
standalone Forge editor with its full modular source and maintained tutorials.
Click Project lessons next to Open ROM / project. Punch-Out section 22 explains
source roles and in-app help; sections 16–21 cover the existing Glass Joe pose,
physical CHR/palette and preview/build workflows. Developer section 18 explains
how this editor workflow connects to independent RE, assembly, hex, JSON and HTML.

Resources > Lesson for this resource opens the relevant project method. In ROM
Audio Library, Lesson for this Audio source follows that exact source. Current
project, independent and detached source labels distinguish source identity from
available native writers. Use current project source or explicitly Continue
independent Audio inspection when a previous Audio session expires. Neither route
changes project assets or starts the emulator. Invalidated intake/prepared import
controls visibly disable; reading lessons never imports or changes assets.

The handbook has fifteen chapters plus a synthetic exercise, all available
without network access. Edit the Markdown in app/docs and run the documented
render/bundle tools to update both the offline and in-app versions. Full source,
launchers, prior checkpoints and exact-hash verification are included. This
checkpoint adds no new native Punch-Out behavior: Glass Joe knockdowns, referee
counts and round transitions remain the next recovery work.

The shared branch's existing experimental localhost host/client is also included.
Root START_HOSTED_WINDOWS.cmd / START_HOSTED.sh launch it after requirements are
installed; follow experiments/hosted-worlds/v17.1/README_START_HERE.md. Its existing
multiplayer gameplay was retained unchanged by this Forge app checkpoint.

See reviews/source-context-lessons-1/HANDOFF.md and Verification_Summary.json for
scope and reproduction. Private ROMs, commercial source projects, screenshots,
runtime databases and keys are excluded. KIT_MANIFEST.json records source hashes;
optional PUBLICATION.json records the confirmed GitHub commit/tree. This remains
a draft PR; main merge, releases and public hosting are separate decisions.
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
