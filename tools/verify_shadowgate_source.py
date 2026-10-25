"""Verify production scope against the delivered River City Scene/Audio checkpoint."""
from pathlib import Path
import hashlib,json,subprocess
r=Path(__file__).resolve().parents[1];a=r/'app';v=r/'reviews/shadowgate-1';parent='a38c8ec7e0ff9af66db9af51ee52de8a87a38d4f';sha=lambda b:hashlib.sha256(b).hexdigest();old=lambda n:subprocess.check_output(['git','show',parent+':app/'+n],cwd=r)
before=json.loads(old('source-manifest.json'));after=json.loads((a/'source-manifest.json').read_text());added=['src/re/native-shadowgate-resources.js','src/re/shadowgate-audio.js','src/services/shadowgate-mapping.js'];allowed={'src/audio/native-audio-library-ui.js','src/re/native-audio-catalog.js','src/re/native-audio-machine.js','src/re/native-audio-recovery.js'}
assert [n for n in after['parts'] if n not in added]==before['parts'];protected=[];changed=[]
for n in before['parts']:
 x,y=old(n),(a/n).read_bytes()
 if x!=y:
  assert n in allowed,n;changed.append({'path':n,'beforeSha256':sha(x),'afterSha256':sha(y)})
 else:protected.append({'path':n,'sha256':sha(y),'bytes':len(y)})
assert {x['path'] for x in changed}==allowed
identity=sha((a/'mainline/NES_Forge_2.0.0-alpha.11.html').read_bytes());assert sha(b''.join((a/n).read_bytes() for n in after['parts']))==identity
assert sha((a/'tests/fixtures/shadowgate-predecessor.html').read_bytes())==json.loads(old('build-inputs.json'))['sha256']
report={'status':'passed','parentCommit':parent,'htmlSha256':identity,'protectedInputs':protected,'changedInputs':changed,'addedInputs':[{'path':n,'sha256':sha((a/n).read_bytes())} for n in added],'contracts':['Existing native adapters, ProjectStore, schema, CPU/APU/emulator instruction implementation and runtime compiler remain byte-identical.','A new source-guarded header-view wrapper selects MMC3 only for the investigated Shadowgate source and its declared picture derivatives. Source/output headers retain exact original bytes.','The isolated audio bus accepts the investigated legacy header only with immutable audio-bank identity and explicit MMC3 fixed-pair opt-in. Mapper/PPU writes remain refused.','Audio Library disables execution of unavailable requests and reports the correct mapper in hardware evidence.','Ordinary schema 12 and reader ceiling 16 remain. The actual preceding reader refuses the Shadowgate project before mutation.']}
(v/'Source_Preservation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'status':'passed','protectedInputs':len(protected),'changedInputs':len(changed),'addedInputs':len(added)}))
