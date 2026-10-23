"""Bound the Lolo Audio correction against the exact prior Scene checkpoint."""
from pathlib import Path
import json,hashlib,subprocess
r=Path(__file__).resolve().parents[1];a=r/'app';v=r/'reviews/lolo-audio-1';parent='7812fc3'
old=lambda n:subprocess.check_output(['git','show',parent+':app/'+n],cwd=r)
sha=lambda b:hashlib.sha256(b).hexdigest()
before=json.loads(old('source-manifest.json'));after=json.loads((a/'source-manifest.json').read_text());allowed={'src/re/native-audio-catalog.js','src/re/native-audio-profiles.js','src/re/native-audio-machine.js','src/re/native-audio-recovery.js','src/re/native-lolo-resources.js'};added=['src/re/lolo-audio.js']
assert [n for n in after['parts'] if n not in added]==before['parts'];protected=[];changes=[]
for n in before['parts']:
 x,y=old(n),(a/n).read_bytes()
 if x!=y:
  assert n in allowed,n;changes.append({'path':n,'beforeSha256':sha(x),'afterSha256':sha(y)})
 else:protected.append({'path':n,'bytes':len(y),'sha256':sha(y)})
assert {x['path'] for x in changes}==allowed
x,y=old('src/re/native-lolo-resources.js'),(a/'src/re/native-lolo-resources.js').read_bytes()
assert x.replace(b'Moving sprites, HUD counters, animation, Audio and gameplay traversal are not recovered assets.',b'Moving sprites, HUD counters, animation and gameplay traversal are not recovered assets. Native Audio is available separately in the ROM Audio Library.')==y
identity=sha((a/'mainline/NES_Forge_2.0.0-alpha.11.html').read_bytes());assert sha(b''.join((a/n).read_bytes() for n in after['parts']))==identity
report={'status':'passed','parentCommit':subprocess.check_output(['git','rev-parse',parent],cwd=r,text=True).strip(),'parentHtmlSha256':json.loads(old('build-inputs.json'))['sha256'],'htmlSha256':identity,'protectedInputs':protected,'changedInputs':changes,'addedInputs':[{'path':n,'sha256':sha((a/n).read_bytes())} for n in added],'contracts':['No CPU, APU, emulator, runtime compiler, scene codec/writer logic, canonical schema or gameplay runtime source changed. The existing Lolo adapter changes only its outdated Audio description.','Four shared native-audio modules add one decoder, immutable audio-prefix recognition and a default-off unused-FDS write policy.','All preceding driver paths keep their existing behavior; synthetic bus/routing tests and retained Metroid Audio checks run on the current HTML.','Audio is a required part of every project verification; unsupported drivers and native audio writers stay explicit.']}
(v/'Source_Preservation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'status':'passed','protectedInputs':len(protected),'changedInputs':len(changes),'addedInputs':len(added)}))
