"""Check the bounded UI/lifecycle change against its public source baseline."""
from pathlib import Path
import hashlib
import json
import subprocess

root=Path(__file__).resolve().parents[2]
base='dbef9401786f74facf8f57ce55fbbe5f2df75618'
show=lambda name:subprocess.check_output(['git','show',base+':'+name],cwd=root)
native=json.loads((root/'app/source-manifest.json').read_text())
hosted=json.loads((root/'app/hosted-source-manifest.json').read_text())
old=json.loads(show('app/source-manifest.json'))
assert native['parts'][-1]==hosted['parts'][-1]=='src/shell-suffix.html'
common=native['parts'][:-1];assert hosted['parts'][:len(common)]==common
extras=hosted['parts'][len(common):-1];assert len(extras)==11
added=sorted(set(native['parts'])-set(old['parts']))
changed=[name for name in old['parts'] if (root/'app'/name).read_bytes()!=show('app/'+name)]
assert added==['src/services/editor-view.js']
assert set(changed)=={'src/legacy/13-metasprites.js','src/services/project-store.js','src/re/punch-out-pose-ui.js'}
owners=['src/services/asset-registry.js','src/services/build-services.js','src/services/emulator-bridge.js',
    'src/services/native-resource-project.js','src/services/stage-context.js','src/services/resource-context.js',
    'src/services/punch-out-art-project.js','src/services/punch-out-pose-project.js',
    'src/re/punch-out-art.js','src/re/punch-out-pose.js','src/re/native-punch-out-resources.js',
    'src/re/native-engine-project.js','src/services/recipe-identity.js','src/world/world-config.js',
    'src/legacy/01-emulator.js']
for name in owners+extras:assert (root/'app'/name).read_bytes()==show('app/'+name)
archive='archive/original-pepsi.html';assert (root/archive).read_bytes()==show(archive)
assert (root/'nes-forge.html').read_bytes()==(root/'app'/native['output']).read_bytes()
digest=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
report={'status':'passed','baseCommit':base,'nativeInputs':len(native['parts']),'hostedInputs':len(hosted['parts']),
    'optionalHostedInputs':len(extras),'addedSharedInputs':added,'changedCommonInputs':changed,
    'unchangedOwners':owners,'hostedExtensionsUnchanged':True,'originalPepsiUnchanged':True,
    'nativeHtmlSha256':digest(root/'nes-forge.html'),'hostedHtmlSha256':digest(root/'app'/hosted['output']),
    'scope':'Optional editorView capture/restore and composer/native-shortcut UI only. Default build/authoring capture boundary and native signatures are tested independently. No encoder/span, emulator, asset-registry, recipe algorithm or schema change.'}
Path(__file__).with_name('Source_Convergence.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
