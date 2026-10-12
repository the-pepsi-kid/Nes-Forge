"""Freeze exact native SFX edits against committed A2; never renew a historical oracle."""
from pathlib import Path
import difflib, hashlib, json
root=Path(__file__).resolve().parents[1]
sha=lambda data:hashlib.sha256(data).hexdigest()
pinned='d7087da3100ad82ace657ec5010e70bd0e627466df89ad247a84f87775a269be'
archive=root/'docs/history/native-map-1'
reference=(root/'baseline/NES_Forge_2.0.0-alpha.11_Native_Map.html').read_bytes()
assert sha(reference)==pinned
baseline=json.loads((archive/'root/build-inputs.json').read_text());assert baseline['sha256']==pinned
modules=json.loads((root/'native-sfx-modules.json').read_text());assert modules['candidate']=='native-sfx-1'
manifest=json.loads((root/'source-manifest.json').read_text());assert manifest['release']=='2.0.0-alpha.11' and manifest['output']=='mainline/NES_Forge_2.0.0-alpha.11.html'
parts=[item['path'] for item in baseline['inputs']];expected=parts.copy();added=[]
for insertion in modules['insertions']:
 assert insertion['after'] in expected
 position=expected.index(insertion['after'])+1;expected[position:position]=insertion['parts'];added.extend(insertion['parts'])
assert len(set(expected))==len(expected) and manifest['parts']==expected
allowed={'src/shell-prefix.html','src/services/release-info.js','src/services/project-store.js','src/re/re-native-audio-import-ui.js','src/re/recovery-profiles.js'}
# Scope expansions require explicit review; metadata exceptions do not authorize weakened tests.
allowed_tests={'tests/native-map-preservation-lib.cjs','tests/run_candidate.cjs','tests/services167.cjs','tests/native-audio-import-preservation.cjs'}
def exact_change(name,before,after):
 a,b=before.decode().splitlines(True),after.decode().splitlines(True);replacements=[]
 for group in difflib.SequenceMatcher(None,a,b,autojunk=False).get_grouped_opcodes(3):
  replacements.append({'before':''.join(a[group[0][1]:group[-1][2]]),'after':''.join(b[group[0][3]:group[-1][4]])})
 restored=after.decode()
 for edit in replacements:
  assert edit['after'] and restored.count(edit['after'])==1,(name,'Nonunique exact reverse patch')
  restored=restored.replace(edit['after'],edit['before'])
 assert restored==before.decode()
 return {'path':name,'beforeSha256':sha(before),'afterSha256':sha(after),'replacements':replacements}
offset=0;changes=[]
for item in baseline['inputs']:
 before=reference[offset:offset+item['bytes']];offset+=item['bytes'];assert sha(before)==item['sha256']
 assert before==(archive/item['path']).read_bytes(),item['path']
 after=(root/item['path']).read_bytes()
 if before==after:continue
 assert item['path'] in allowed,'Unreviewed existing-source change: '+item['path']
 changes.append(exact_change(item['path'],before,after))
assert offset==len(reference)
test_changes=[]
for original in sorted((archive/'tests').rglob('*')):
 if not original.is_file():continue
 name=original.relative_to(archive).as_posix();before=original.read_bytes();after=(root/name).read_bytes()
 if before==after:continue
 assert name in allowed_tests,'Historical fixture/test changed without explicit review: '+name
 test_changes.append(exact_change(name,before,after))
payload={'referenceCandidate':'native-map-1','candidate':'native-sfx-1','referenceHtmlSha256':pinned,'referenceParts':parts,'candidateParts':expected,'changes':changes,'added':[{'path':p,'sha256':sha((root/p).read_bytes())} for p in added],'testChanges':test_changes}
(root/'tests/fixtures/native-sfx-source-delta.json').write_text(json.dumps(payload,indent=2)+'\n')
print(json.dumps({'changed':[item['path'] for item in changes],'added':added,'testChanges':[item['path'] for item in test_changes],'reference':pinned}))
