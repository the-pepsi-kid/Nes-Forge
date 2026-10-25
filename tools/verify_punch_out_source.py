"""Protect all preceding bundle parts except the six reviewed integration seams."""
from pathlib import Path
import hashlib,json,subprocess
r=Path(__file__).resolve().parents[1];a=r/'app';v=r/'reviews/punch-out-1';sha=lambda b:hashlib.sha256(b).hexdigest()
record=json.loads((v/'Predecessor_Bundle.json').read_text());parent=record['parentCommit'];predecessor=(a/'tests/fixtures/punch-out-predecessor.html').read_bytes();assert sha(predecessor)==record['htmlSha256']
original={};offset=0
for part in record['parts']:
 data=predecessor[offset:offset+part['bytes']];offset+=part['bytes'];assert sha(data)==part['sha256'];original[part['path']]=data
assert offset==len(predecessor)
old=lambda n:original[n]
before={'parts':[p['path'] for p in record['parts']]};after=json.loads((a/'source-manifest.json').read_text())
added=['src/re/mmc2.js','src/services/mmc2-emulator.js','src/re/punch-out-layout.js','src/re/native-punch-out-resources.js','src/re/punch-out-audio.js']
allowed={'src/audio/native-audio-library-ui.js','src/re/native-audio-catalog.js','src/re/native-audio-machine.js','src/re/native-audio-profiles.js','src/re/native-audio-recovery.js','src/re/native-layout-ui.js'}
assert [n for n in after['parts'] if n not in added]==before['parts'];protected=[];changed=[]
for n in before['parts']:
 x,y=old(n),(a/n).read_bytes()
 if x!=y:
  assert n in allowed,n;changed.append({'path':n,'beforeSha256':sha(x),'afterSha256':sha(y)})
 else:protected.append({'path':n,'sha256':sha(y),'bytes':len(y)})
assert {x['path'] for x in changed}==allowed
identity=sha((a/'mainline/NES_Forge_2.0.0-alpha.11.html').read_bytes());assert sha(b''.join((a/n).read_bytes() for n in after['parts']))==identity
assert sha(predecessor)==record['htmlSha256']
report={'status':'passed','parentCommit':parent,'htmlSha256':identity,'protectedInputs':protected,'changedInputs':changed,'addedInputs':[{'path':n,'sha256':sha((a/n).read_bytes())} for n in added],'contracts':['Prior adapter modules, ProjectStore, schema, CPU/APU instruction cores and RuntimeCompiler remain byte-identical.','MMC2 live mapping is a separate wrapper delegating non-9 mappers; isolated audio explicitly opts into an 8 KiB selected bank and fixed final 24 KiB.','All native audio writers remain unavailable. Ordinary schema 12 and read ceiling 16 remain unchanged.','Historical 25-suite gate scripts were not all present in the restored checkpoint. Current reruns are scoped to the eight retained public suites and explicitly supplied-input supplements.']}
(v/'Source_Preservation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'status':'passed','protectedInputs':len(protected),'changedInputs':len(changed),'addedInputs':len(added)}))
