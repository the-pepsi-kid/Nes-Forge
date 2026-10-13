"""Record the explicit roadmap-1 source delta against immutable alpha.5."""
from pathlib import Path
import difflib, hashlib, json
root=Path(__file__).resolve().parents[1]
sha=lambda b:hashlib.sha256(b).hexdigest()
pinned='be63ce7ddd3eec76f1736b9aff78922f0dc10e945ff2a96b26139f2393fff76a'
reference=(root/'baseline/NES_Forge_2.0.0-alpha.5_Audio_Adaptive.html').read_bytes()
assert sha(reference)==pinned
baseline=json.loads((root/'docs/history/audio-adaptive-1/root/build-inputs.json').read_text())
modules=json.loads((root/'roadmap-modules.json').read_text())
manifest=json.loads((root/'source-manifest.json').read_text())
parts=[x['path'] for x in baseline['inputs']]; expected=parts.copy();added=[]
for insertion in modules['insertions']:
 expected[expected.index(insertion['after'])+1:expected.index(insertion['after'])+1]=insertion['parts'];added.extend(insertion['parts'])
assert manifest['parts']==expected
allowed={'src/shell-prefix.html','src/services/release-info.js','src/audio/audio-import.js','src/services/emulator-timeline.js','src/re/re-analysis-ui.js','src/gameplay/gameplay-ui.js','src/services/documentation.js'}
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
  assert change['after'] and restored.count(change['after'])==1,(item['path'],'Nonunique patch')
  restored=restored.replace(change['after'],change['before'])
 assert restored==before.decode()
 changes.append({'path':item['path'],'beforeSha256':sha(before),'afterSha256':sha(after),'replacements':replacements})
assert offset==len(reference)
payload={'referenceCandidate':'audio-adaptive-1','candidate':'roadmap-1','referenceHtmlSha256':pinned,'referenceParts':parts,'candidateParts':expected,'changes':changes,'added':[{'path':p,'sha256':sha((root/p).read_bytes())}for p in added]}
(root/'tests/fixtures/roadmap-source-delta.json').write_text(json.dumps(payload,indent=2)+'\n')
print(json.dumps({'changed':[x['path']for x in changes],'added':added,'reference':pinned}))
