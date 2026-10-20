"""Freeze the exact Native Game RE source and all 112 retained test inventories."""
from pathlib import Path
import difflib,hashlib,json,subprocess
root=Path(__file__).resolve().parents[1]
parent='f11a797bc71b62464d7e485fca5cfd4c5e1be02a'
pin='cf2eb17d33d8ce63067ae04bcb7de082026300bea2bf90670414f65217b2649e'
archive=root/'docs/history/native-game-import-1'
sha=lambda b:hashlib.sha256(b).hexdigest()
def old(name):return subprocess.check_output(['git','show',parent+':app/'+name],cwd=root)
def save(name,b):
 p=archive/name;p.parent.mkdir(parents=True,exist_ok=True)
 if p.exists():assert p.read_bytes()==b,'Immutable reference changed: '+str(p)
 else:p.write_bytes(b)
base=json.loads(old('build-inputs.json'));manifest=json.loads(old('source-manifest.json'));gate=json.loads(old('test-results/candidate/Summary.json'))
assert base['sha256']==gate['sha256']==pin and gate['status']=='passed' and gate['suiteCount']==112 and gate['total']==2010
for name in ['build-inputs.json','source-manifest.json']:save(Path(name),old(name))
compact={k:gate[k] for k in ['sha256','status','suiteCount','total']};compact['suites']=[{k:s[k] for k in ['name','script','scriptSha256','total','passed','failed']} for s in gate['suites']]
save(Path('gate-reference.json'),(json.dumps(compact,indent=2)+'\n').encode())
protected=[]
for full in sorted(subprocess.check_output(['git','ls-tree','-r','--name-only','--full-tree',parent],cwd=root).decode().splitlines()):
 if full.startswith('app/'):
  name=full[4:]
  if name.startswith('tests/') or '/' not in name and name.endswith(('-suites.json','-modules.json')):
   b=old(name);protected.append({'path':name,'sha256':sha(b),'bytes':len(b)})
ib=(json.dumps({'candidate':'native-world-import-1','commit':parent,'htmlSha256':pin,'protectedFiles':protected},indent=2)+'\n').encode();save(Path('Reference_Inventory.json'),ib)
allowed={'src/shell-prefix.html','src/services/release-info.js','src/services/documentation.js','src/services/project-store.js','src/re/game-re-assets.js','src/re/game-re-assets-ui.js','src/re/spatial-re-ui.js','src/audio/native-audio-library-ui.js','tests/native-game-import-preservation-lib.cjs','tests/run_candidate.cjs','tests/services167.cjs','tests/megaman2-audio.cjs','tests/spatial-re.cjs'}
def change(name,a,b):
 aa,bb=a.decode().splitlines(True),b.decode().splitlines(True);edits=[]
 for g in difflib.SequenceMatcher(None,aa,bb,autojunk=False).get_grouped_opcodes(3):edits.append({'before':''.join(aa[g[0][1]:g[-1][2]]),'after':''.join(bb[g[0][3]:g[-1][4]])})
 restored=b.decode()
 for e in edits:
  assert e['after'] and restored.count(e['after'])==1,(name,'Nonunique reversal')
  restored=restored.replace(e['after'],e['before'])
 assert restored==a.decode()
 return {'path':name,'beforeSha256':sha(a),'afterSha256':sha(b),'replacements':edits}
changes=[]
for name in sorted(set([i['path'] for i in base['inputs']]+[i['path'] for i in protected])):
 a=old(name);b=(root/name).read_bytes()
 if a!=b:
  assert name in allowed,name
  changes.append(change(name,a,b))
current=json.loads((root/'source-manifest.json').read_text());added={'src/re/game-re-worlds.js','src/re/game-re-worlds-ui.js'}
assert set(current['parts'])-set(manifest['parts'])==added
assert [p for p in current['parts'] if p not in added]==manifest['parts']
payload={'referenceCandidate':'native-game-import-1','candidate':'native-world-import-1','referenceHtmlSha256':pin,'inventorySha256':sha(ib),'referenceParts':manifest['parts'],'candidateParts':current['parts'],'changes':changes,'added':[{'path':name,'sha256':sha((root/name).read_bytes())} for name in sorted(added)]}
(root/'tests/fixtures/native-world-import-source-delta.json').write_text(json.dumps(payload,indent=2)+'\n')
(root/'tests/retained-native-game-import-suite-counts.json').write_text(json.dumps({s['name']:s['total'] for s in gate['suites']},indent=2)+'\n')
print(json.dumps({'inventorySha256':sha(ib),'protectedFiles':len(protected),'changes':[c['path'] for c in changes]}))
