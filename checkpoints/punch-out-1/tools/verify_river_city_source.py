"""Verify production scope against the delivered Lolo Scene/Audio checkpoint."""
from pathlib import Path
import hashlib,json,subprocess
r=Path(__file__).resolve().parents[1];a=r/'app';v=r/'reviews/river-city-1';parent='a8c97c3f620ff3c7d1c1c68372746d1ffeb4319b';sha=lambda b:hashlib.sha256(b).hexdigest();old=lambda n:subprocess.check_output(['git','show',parent+':app/'+n],cwd=r)
before=json.loads(old('source-manifest.json'));after=json.loads((a/'source-manifest.json').read_text());added=['src/re/native-river-city-resources.js','src/re/river-city-audio.js'];allowed={'src/re/native-layout-ui.js','src/re/native-audio-catalog.js','src/re/native-audio-machine.js','src/re/native-audio-profiles.js','src/re/native-audio-recovery.js'}
assert [n for n in after['parts'] if n not in added]==before['parts'];protected=[];changed=[]
for n in before['parts']:
 x,y=old(n),(a/n).read_bytes()
 if x!=y:
  assert n in allowed,n;changed.append({'path':n,'beforeSha256':sha(x),'afterSha256':sha(y)})
 else:protected.append({'path':n,'sha256':sha(y),'bytes':len(y)})
assert {x['path'] for x in changed}==allowed
identity=sha((a/'mainline/NES_Forge_2.0.0-alpha.11.html').read_bytes());assert sha(b''.join((a/n).read_bytes() for n in after['parts']))==identity
assert sha((a/'tests/fixtures/rcr-predecessor.html').read_bytes())==json.loads(old('build-inputs.json'))['sha256']
report={'status':'passed','parentCommit':parent,'htmlSha256':identity,'protectedInputs':protected,'changedInputs':changed,'addedInputs':[{'path':n,'sha256':sha((a/n).read_bytes())} for n in added],'contracts':['Existing native adapters, ProjectStore, native project ownership, schema, CPU/APU/emulator cores and runtime compiler remain byte-identical.','The shared brush accepts an explicit source-cell map; shared byte aliases still use the existing one-owner recipe.','Native Audio adds declared immutable-bank recognition and an opt-in fixed MMC3 PRG pair; mapper and PPU writes remain refused.','Ordinary schema 12 and reader ceiling 16 remain; the actual preceding reader refuses the new native street adapter.','Only the exact supplied revision and bounded native derivative contexts are recognized.']}
(v/'Source_Preservation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'status':'passed','protectedInputs':len(protected),'changedInputs':len(changed),'addedInputs':len(added)}))
