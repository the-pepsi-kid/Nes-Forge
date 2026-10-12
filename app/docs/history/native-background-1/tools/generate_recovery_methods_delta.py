"""Record only the additive recovery-methods-1 source delta against immutable alpha.8."""
from pathlib import Path
import difflib, hashlib, json
root=Path(__file__).resolve().parents[1]
sha=lambda data:hashlib.sha256(data).hexdigest()
pinned='cbd2547b2a641760045658a16f610c0197490a8493985af4e2ac9deb897423ba'
reference=(root/'baseline/NES_Forge_2.0.0-alpha.8_Native_Audio_Import.html').read_bytes()
assert sha(reference)==pinned
archive=root/'docs/history/native-audio-import-1'
for current,historical in [('native-audio-import-modules.json','root/native-audio-import-modules.json'),('native-audio-import-suites.json','root/native-audio-import-suites.json'),('tests/fixtures/native-audio-import-source-delta.json','tests/fixtures/native-audio-import-source-delta.json')]:
 assert (root/current).read_bytes()==(archive/historical).read_bytes(),'Historical Native Audio contract changed: '+current
baseline=json.loads((archive/'root/build-inputs.json').read_text());assert baseline['sha256']==pinned
modules=json.loads((root/'recovery-methods-modules.json').read_text());assert modules['candidate']=='recovery-methods-1'
manifest=json.loads((root/'source-manifest.json').read_text());assert manifest['release']=='2.0.0-alpha.9' and manifest['output']=='mainline/NES_Forge_2.0.0-alpha.9.html'
parts=[item['path']for item in baseline['inputs']];expected=parts.copy();added=[]
for insertion in modules['insertions']:
 assert insertion['after'] in expected
 position=expected.index(insertion['after'])+1;expected[position:position]=insertion['parts'];added.extend(insertion['parts'])
assert len(set(expected))==len(expected) and manifest['parts']==expected
allowed={'src/shell-prefix.html','src/services/release-info.js','src/re/re-analysis-ui.js','src/re/re-methods.js'}
offset=0;changes=[]
for item in baseline['inputs']:
 before=reference[offset:offset+item['bytes']];offset+=item['bytes'];assert sha(before)==item['sha256']
 after=(root/item['path']).read_bytes()
 if before==after:continue
 assert item['path'] in allowed,'Unreviewed existing-source change: '+item['path']
 a,b=before.decode().splitlines(True),after.decode().splitlines(True);replacements=[]
 for group in difflib.SequenceMatcher(None,a,b,autojunk=False).get_grouped_opcodes(3):
  replacements.append({'before':''.join(a[group[0][1]:group[-1][2]]),'after':''.join(b[group[0][3]:group[-1][4]])})
 restored=after.decode()
 for change in replacements:
  assert change['after'] and restored.count(change['after'])==1,(item['path'],'Nonunique reverse patch')
  restored=restored.replace(change['after'],change['before'])
 assert restored==before.decode()
 changes.append({'path':item['path'],'beforeSha256':sha(before),'afterSha256':sha(after),'replacements':replacements})
assert offset==len(reference)
assert {change['path']for change in changes}==allowed
payload={'referenceCandidate':'native-audio-import-1','candidate':'recovery-methods-1','referenceHtmlSha256':pinned,'referenceParts':parts,'candidateParts':expected,'changes':changes,'added':[{'path':p,'sha256':sha((root/p).read_bytes())}for p in added]}
(root/'tests/fixtures/recovery-methods-source-delta.json').write_text(json.dumps(payload,indent=2)+'\n')
print(json.dumps({'changed':[item['path']for item in changes],'added':added,'reference':pinned}))
