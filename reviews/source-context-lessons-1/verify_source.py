"""Shared Forge-only UI changes; preserve all canonical/native/gameplay owners."""
from pathlib import Path
from html.parser import HTMLParser
import json,subprocess,hashlib
root=Path(__file__).resolve().parents[2];here=Path(__file__).resolve().parent
base='7d182a57a7a84af78596de4cdf685b7f96a0319a'
show=lambda path:subprocess.check_output(['git','show',base+':'+path],cwd=root)
sha=lambda value:hashlib.sha256(value).hexdigest()
native=json.loads((root/'app/source-manifest.json').read_text());hosted=json.loads((root/'app/hosted-source-manifest.json').read_text());old=json.loads(show('app/source-manifest.json'))
common=native['parts'][:-1];assert hosted['parts'][:len(common)]==common;extras=hosted['parts'][len(common):-1];assert len(extras)==11
added=sorted(set(native['parts'])-set(old['parts']));assert added==['src/docs/project-lessons-data.js','src/services/source-context.js','src/ui/project-lessons.js','src/ui/source-context.js']
changed=[p for p in old['parts'] if (root/'app'/p).read_bytes()!=show('app/'+p)]
assert set(changed)=={'src/audio/native-audio-library-ui.js','src/re/investigation-ui.js','src/re/project-gateway-ui.js','src/services/area-library.js','src/services/documentation.js','src/services/scene-context.js','src/ui/resource-relationships.js'}
unchanged=['src/services/project-store.js','src/services/asset-registry.js','src/services/build-services.js','src/services/emulator-bridge.js','src/services/editor-view.js','src/services/stage-context.js','src/services/resource-context.js','src/services/resource-preview.js','src/services/project-capabilities.js','src/services/native-resource-project.js','src/services/native-world-project.js','src/services/native-layout-project.js','src/re/native-engine-project.js','src/services/punch-out-art-project.js','src/services/punch-out-pose-project.js','src/services/punch-out-replay.js','src/re/punch-out-art.js','src/re/punch-out-pose.js','src/re/punch-out-states.js','src/re/punch-out-arena-encoder.js','src/re/native-punch-out-resources.js','src/services/recipe-identity.js','src/world/world-config.js','src/legacy/01-emulator.js','src/source/source-workspace.js','src/source/source-workspace-ui.js','src/source/source-intake.js','src/re/re-native-audio-import.js']
for name in unchanged+extras:assert (root/'app'/name).read_bytes()==show('app/'+name),name
# Existing multiplayer work belongs to its own scope; only the shared editor's
# generated HTML/inventory and reconciliation count may change in that tree.
paths=subprocess.check_output(['git','ls-tree','-r','--name-only',base,'--','experiments/hosted-worlds/v17.1/host','experiments/hosted-worlds/v17.1/client','experiments/hosted-worlds/v17.1/tests','docs/design'],cwd=root,text=True).splitlines()
for name in paths:assert (root/name).read_bytes()==show(name),name
for name in ['Z2_SOURCE_ROOM_IDENTITY_SLICE_1.md','Z2_SOURCE_ROOM_TRANSITION_NEXT_GATE.md','Z2_NATIVE_SWORD_TECHNIQUES_AUDIT_2026-10-26.md','HOSTED_MULTIPLAYER_DEFECT_CORRECTION_XP.md']:
 path='experiments/hosted-worlds/v17.1/'+name;assert (root/path).read_bytes()==show(path)
assert (root/'archive/original-pepsi.html').read_bytes()==show('archive/original-pepsi.html')
assert (root/'nes-forge.html').read_bytes()==(root/'app'/native['output']).read_bytes()
script=(root/'app/src/docs/project-lessons-data.js').read_text();data=json.loads(script.split('Object.freeze(',1)[1].rsplit(');',1)[0]);assert len(data['chapters'])==16
assert '</script' not in script.lower()
class Inspect(HTMLParser):
 def __init__(self):super().__init__();self.ids=[];self.links=[];self.external=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if 'id' in a:self.ids.append(a['id'])
  if a.get('href','').startswith('#'):self.links.append(a['href'][1:])
  if tag in ['script','iframe','img'] and a.get('src'):self.external.append(a['src'])
  if tag=='link' and a.get('rel')=='stylesheet':self.external.append(a.get('href'))
chapter_ids={c['id'] for c in data['chapters']};all_ids=set(chapter_ids);links=[]
for c in data['chapters']:
 assert sha((root/c['source']).read_bytes())==c['sourceSha256'],c['id']
 parser=Inspect();parser.feed(c['html']);assert not parser.external
 assert len(parser.ids)==len(set(parser.ids));assert not all_ids.intersection(parser.ids)
 all_ids.update(parser.ids);links.extend(parser.links)
assert not set(links)-all_ids
files=[]
for name in ['PROJECT_HANDBOOK.html','NATIVE_RECOVERY_TUTORIAL.html']:
 path=root/'app/docs'/name;parser=Inspect();parser.feed(path.read_text());assert not parser.external
 assert len(parser.ids)==len(set(parser.ids));assert not set(parser.links)-set(parser.ids)
 files.append({'file':name,'internalLinks':len(parser.links),'duplicateIds':0,'missingAnchors':0,'externalRuntimeDependencies':0,'bytes':path.stat().st_size,'sha256':sha(path.read_bytes())})
report={'status':'passed','baseCommit':base,'nativeInputs':len(native['parts']),'hostedInputs':len(hosted['parts']),'optionalHostedInputs':len(extras),'addedSharedInputs':added,'changedCommonInputs':changed,'unchangedOwnersAndCodecs':unchanged,'hostedGameplayAndDesignWorkUnchanged':True,'hostedExtensionsUnchanged':True,'originalPepsiUnchanged':True,'nativeHtmlSha256':sha((root/'nes-forge.html').read_bytes()),'hostedHtmlSha256':sha((root/'app'/hosted['output']).read_bytes()),'scope':'Forge app source-role presentation, guarded source reopening and maintained in-app lessons. No multiplayer gameplay work or new Punch-Out native behavior/writer.'}
(here/'Source_Convergence.json').write_text(json.dumps(report,indent=2)+'\n')
(here/'Documentation_Verification.json').write_text(json.dumps({'status':'passed','htmlSha256':report['nativeHtmlSha256'],'inAppChaptersIncludingExercise':16,'chapterSourcesAndHashesVerified':True,'allInAppAnchorsVerified':True,'scriptDelimitersEscaped':True,'files':files},indent=2)+'\n')
print(json.dumps({'status':'passed','nativeInputs':len(native['parts']),'hostedInputs':len(hosted['parts']),'lessons':16,'existingChanged':len(changed),'newShared':len(added)}))
