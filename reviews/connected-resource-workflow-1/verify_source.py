"""Verify shared-source order and ownership boundaries without private assets."""
from pathlib import Path
import argparse
import hashlib
import json
import subprocess

root = Path(__file__).resolve().parents[2]
digest = lambda data: hashlib.sha256(data).hexdigest()
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--base',default='ca992a4209dba8a3ede669b9ae6ffd14cd36f468')
previous=parser.parse_args().base
native = json.loads((root/'app/source-manifest.json').read_text())
hosted = json.loads((root/'app/hosted-source-manifest.json').read_text())
common = native['parts'][:-1]
assert native['parts'][-1] == hosted['parts'][-1] == 'src/shell-suffix.html'
assert hosted['parts'][:len(common)] == common
extras = hosted['parts'][len(common):-1]
assert len(extras) == 11
old = json.loads(subprocess.check_output(['git','show',previous+':app/source-manifest.json'],cwd=root))
added = sorted(set(native['parts'])-set(old['parts']))
changed = []
for name in old['parts']:
    original = subprocess.check_output(['git','show',previous+':app/'+name],cwd=root)
    current = (root/'app'/name).read_bytes()
    if original != current:
        changed.append(name)
assert set(added) == {'src/services/resource-context.js','src/ui/resource-usage.js'}
assert set(changed) == {'src/legacy/04-saveas-chr.js','src/services/scene-context.js',
    'src/ui/resource-relationships.js','src/ui/connected-workspace.js'}
owners = ['src/services/project-store.js','src/services/asset-registry.js',
    'src/services/build-services.js','src/services/emulator-bridge.js',
    'src/services/native-resource-project.js','src/services/stage-context.js',
    'src/services/punch-out-pose-project.js','src/services/punch-out-art-project.js',
    'src/re/punch-out-pose.js','src/re/punch-out-art.js','src/re/native-punch-out-resources.js',
    'src/legacy/01-emulator.js']
assert not set(owners).intersection(changed)
for name in extras:
    assert (root/'app'/name).read_bytes() == subprocess.check_output(['git','show',previous+':app/'+name],cwd=root)
archive = 'archive/original-pepsi.html'
assert (root/archive).read_bytes() == subprocess.check_output(['git','show',previous+':'+archive],cwd=root)
native_path = root/'app'/native['output']
hosted_path = root/'app'/hosted['output']
assert native_path.read_bytes() == (root/'nes-forge.html').read_bytes()
report = {'status':'passed','baseCommit':previous,'nativeInputs':len(native['parts']),
    'hostedInputs':len(hosted['parts']),'optionalHostedInputs':len(extras),
    'newSharedInputs':added,'changedCommonInputs':changed,'unchangedOwners':owners,
    'originalPepsiUnchanged':True,'hostedExtensionsUnchanged':True,
    'nativeHtmlSha256':digest(native_path.read_bytes()),'hostedHtmlSha256':digest(hosted_path.read_bytes()),
    'scope':'Read-only projections and UI changes only. No project schema, native codec/span, canonical owner, emulator or optional hosted gameplay change.'}
Path(__file__).with_name('Source_Convergence.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
