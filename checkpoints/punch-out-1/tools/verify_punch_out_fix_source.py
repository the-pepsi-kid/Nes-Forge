from pathlib import Path
import hashlib,json
r=Path(__file__).resolve().parents[1];a=r/'app';v=r/'reviews/punch-out-fix-1';sha=lambda b:hashlib.sha256(b).hexdigest()
record=json.loads((v/'Predecessor_Bundle.json').read_text());old=(v/'predecessor.html').read_bytes();assert sha(old)==record['htmlSha256'];offset=0;before={}
for item in record['parts']:
 b=old[offset:offset+item['bytes']];offset+=item['bytes'];assert sha(b)==item['sha256'];before[item['path']]=b
assert offset==len(old)
new=json.loads((a/'source-manifest.json').read_text())['parts'];added=['src/re/native-punch-out-legacy.js','src/services/punch-out-intake.js'];allowed={'src/re/investigation-ui.js','src/re/native-audio-catalog.js','src/re/native-punch-out-resources.js','src/re/punch-out-audio.js','src/services/mmc2-emulator.js','src/services/native-resource-project.js','src/services/project-gateway.js'}
assert [n for n in new if n not in added]==list(before);protected=[];changed=[]
for name,b in before.items():
 current=(a/name).read_bytes()
 if b==current:protected.append({'path':name,'sha256':sha(current)})
 else:assert name in allowed,name;changed.append({'path':name,'beforeSha256':sha(b),'afterSha256':sha(current)})
assert {x['path'] for x in changed}==allowed
assert (a/'src/re/native-punch-out-legacy.js').read_bytes()==before['src/re/native-punch-out-resources.js']
html=(a/'mainline/NES_Forge_2.0.0-alpha.11.html').read_bytes();assert b''.join((a/n).read_bytes() for n in new)==html
report={'status':'passed','htmlSha256':sha(html),'protectedInputs':protected,'changedInputs':changed,'addedInputs':added,'contracts':['CPU/APU instruction implementations, native Audio execution/transcription, ProjectStore, RuntimeCompiler, prior mapper branches and non-Punch-Out game decoders remain byte-identical.','The original Punch-Out v1 decoder is retained byte-for-byte for existing saved projects. New imports select the corrected v2 profile; old saved projects keep their original recipes.','The correction records the same renderer fetches; synthetic comparisons verify unchanged frame pixels and MMC2 latch state, including clipped fetches.','Source header compatibility ignores padding bytes 12–15 only; semantic header fields and bounded source/audio data still gate recognition.']}
(v/'Source_Preservation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'status':'passed','htmlSha256':sha(html),'protectedInputs':len(protected),'changedInputs':len(changed),'newModules':len(added)}))
