"""Prove shared builds and preserved owners/codecs against the published resume tree."""
from pathlib import Path
import subprocess,json,hashlib,re
from html.parser import HTMLParser
root=Path(__file__).resolve().parents[2];here=Path(__file__).resolve().parent
base='ac3e4a30cd40ff779adacea42751a0865bccef52'
show=lambda name:subprocess.check_output(['git','show',base+':'+name],cwd=root)
sha=lambda b:hashlib.sha256(b).hexdigest()
native=json.loads((root/'app/source-manifest.json').read_text());hosted=json.loads((root/'app/hosted-source-manifest.json').read_text());old=json.loads(show('app/source-manifest.json'))
common=native['parts'][:-1];assert hosted['parts'][:len(common)]==common
extras=hosted['parts'][len(common):-1];assert len(extras)==11
added=sorted(set(native['parts'])-set(old['parts']));assert added==['src/services/build-diagnostics.js','src/services/resource-preview.js']
changed=[name for name in old['parts'] if (root/'app'/name).read_bytes()!=show('app/'+name)]
assert set(changed)=={'src/legacy/04-saveas-chr.js','src/legacy/13-metasprites.js','src/services/build-services.js','src/services/native-layout-project.js','src/services/native-resource-project.js','src/services/native-world-project.js','src/services/punch-out-art-project.js','src/services/punch-out-pose-project.js','src/ui/connected-workspace.js','src/ui/resource-relationships.js'}
unchanged=['src/services/project-store.js','src/services/asset-registry.js','src/services/emulator-bridge.js','src/services/stage-context.js','src/services/resource-context.js','src/services/recipe-identity.js','src/services/editor-view.js','src/services/project-capabilities.js','src/re/native-engine-project.js','src/re/punch-out-art.js','src/re/punch-out-pose.js','src/re/punch-out-arena-encoder.js','src/re/native-punch-out-resources.js','src/legacy/03-runtime-capture.js','src/legacy/01-emulator.js','src/world/world-config.js']
for name in unchanged+extras:assert (root/'app'/name).read_bytes()==show('app/'+name),name
for p in (root/'docs/design/hosted-worlds-3x').glob('*'):
 if p.is_file():assert p.read_bytes()==show(str(p.relative_to(root))),p
assert (root/'archive/original-pepsi.html').read_bytes()==show('archive/original-pepsi.html')
assert (root/'nes-forge.html').read_bytes()==(root/'app'/native['output']).read_bytes()
# Preserve the exact protected-field projection algorithm, which remains the
# acceptance owner. Diagnostic candidate reads run only after its real refusal.
def function(data,start,end):return data.decode().split(start,1)[1].split(end,1)[0]
path='app/src/services/native-resource-project.js'
assert function((root/path).read_bytes(),'  function baseSignature(','  /* Compose native recipes')==function(show(path),'  function baseSignature(','  /* Compose native recipes')
report={'status':'passed','baseCommit':base,'nativeInputs':len(native['parts']),'hostedInputs':len(hosted['parts']),'optionalHostedInputs':len(extras),'addedSharedInputs':added,'changedCommonInputs':changed,'unchangedOwnersAndCodecs':unchanged,'nativeProjectionAlgorithmUnchanged':True,'hostedExtensionsAndDesignNotesUnchanged':True,'originalPepsiUnchanged':True,'nativeHtmlSha256':sha((root/'nes-forge.html').read_bytes()),'hostedHtmlSha256':sha((root/'app'/hosted['output']).read_bytes()),'scope':'Shared read-only preview context, existing renderer extraction and actual compiler diagnostics. Signatures/schema/spans/codecs remain their existing owners.'}
(here/'Source_Convergence.json').write_text(json.dumps(report,indent=2)+'\n')
class Inspect(HTMLParser):
 def __init__(self):super().__init__();self.ids=[];self.links=[];self.external=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if 'id' in a:self.ids.append(a['id'])
  if a.get('href','').startswith('#'):self.links.append(a['href'][1:])
  if tag in ('script','iframe') and a.get('src'):self.external.append(a['src'])
  if tag=='link' and a.get('rel')=='stylesheet' and a.get('href'):self.external.append(a['href'])
files=[]
for name in ['PROJECT_HANDBOOK.html','NATIVE_RECOVERY_TUTORIAL.html']:
 p=root/'app/docs'/name;parser=Inspect();parser.feed(p.read_text());assert len(set(parser.ids))==len(parser.ids);assert not set(parser.links)-set(parser.ids);assert not parser.external
 files.append({'file':name,'internalLinks':len(parser.links),'duplicateIds':0,'missingAnchors':0,'externalRuntimeDependencies':0,'bytes':p.stat().st_size,'sha256':sha(p.read_bytes())})
(here/'Documentation_Verification.json').write_text(json.dumps({'status':'passed','htmlSha256':report['nativeHtmlSha256'],'files':files},indent=2)+'\n')
print(json.dumps({'status':'passed','nativeInputs':len(native['parts']),'hostedInputs':len(hosted['parts']),'changed':len(changed),'added':len(added),'docs':len(files)}))
