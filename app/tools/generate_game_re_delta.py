"""Preserve the exact Spatial RE parent around reviewed game/PPU additions."""
from pathlib import Path
import difflib,hashlib,json,subprocess
root=Path(__file__).resolve().parents[1]
parent='387b99b5f4bec1e05568482c15ef5bbea1ae4527'
pin='b5f73734aa43356067e8fc0b0a9f45c7cbe434b4a38dfbedde827f1d534c0945'
archive=root/'docs/history/spatial-re-1'
sha=lambda b:hashlib.sha256(b).hexdigest()
def old(name):return subprocess.check_output(['git','show',parent+':app/'+name],cwd=root)
def save(name,b):
 p=archive/name;p.parent.mkdir(parents=True,exist_ok=True)
 if p.exists():assert p.read_bytes()==b,'Immutable spatial parent archive changed: '+str(p)
 else:p.write_bytes(b)
base=json.loads(old('build-inputs.json'));manifest=json.loads(old('source-manifest.json'));gate=json.loads(old('test-results/candidate/Summary.json'))
assert base['sha256']==gate['sha256']==pin and gate['status']=='passed' and gate['suiteCount']==107 and gate['total']==1970
for name in ['build-inputs.json','source-manifest.json']:save(Path(name),old(name))
compact={k:gate[k] for k in ['sha256','status','suiteCount','total']}
compact['suites']=[{k:s[k] for k in ['name','script','scriptSha256','total','passed','failed']} for s in gate['suites']]
save(Path('gate-reference.json'),(json.dumps(compact,indent=2)+'\n').encode())
protected=[]
for full in sorted(subprocess.check_output(['git','ls-tree','-r','--name-only','--full-tree',parent],cwd=root).decode().splitlines()):
 if full.startswith('app/'):
  name=full[4:]
  if name.startswith('tests/') or '/' not in name and name.endswith(('-suites.json','-modules.json')):
   b=old(name);protected.append({'path':name,'sha256':sha(b),'bytes':len(b)})
ib=(json.dumps({'candidate':'spatial-re-1','commit':parent,'htmlSha256':pin,'protectedFiles':protected},indent=2)+'\n').encode()
save(Path('Reference_Inventory.json'),ib)
allowed={'src/shell-prefix.html','src/services/release-info.js','src/services/documentation.js','src/legacy/01-emulator.js','src/re/spatial-re-ui.js','tests/spatial-re-preservation-lib.cjs','tests/run_candidate.cjs','tests/services167.cjs','tests/megaman2-audio.cjs','tests/spatial-re.cjs'}
def change(name,a,b):
 aa,bb=a.decode().splitlines(True),b.decode().splitlines(True);edits=[]
 for g in difflib.SequenceMatcher(None,aa,bb,autojunk=False).get_grouped_opcodes(3):edits.append({'before':''.join(aa[g[0][1]:g[-1][2]]),'after':''.join(bb[g[0][3]:g[-1][4]])})
 restored=b.decode()
 for e in edits:
  assert e['after'] and restored.count(e['after'])==1,(name,'Nonunique game reversal')
  restored=restored.replace(e['after'],e['before'])
 assert restored==a.decode()
 return {'path':name,'beforeSha256':sha(a),'afterSha256':sha(b),'replacements':edits}
changes=[]
for name in sorted(set([i['path'] for i in base['inputs']]+[i['path'] for i in protected])):
 a=old(name);b=(root/name).read_bytes()
 if a!=b:
  assert name in allowed,name
  changes.append(change(name,a,b))
current=json.loads((root/'source-manifest.json').read_text());added={'src/re/game-re-index.js','src/re/game-re-native.js','src/re/game-re-ui.js'}
assert set(current['parts'])-set(manifest['parts'])==added
assert [p for p in current['parts'] if p not in added]==manifest['parts']
payload={'referenceCandidate':'spatial-re-1','candidate':'ninja-zelda-re-1','referenceHtmlSha256':pin,'inventorySha256':sha(ib),'referenceParts':manifest['parts'],'candidateParts':current['parts'],'changes':changes,'added':[{'path':name,'sha256':sha((root/name).read_bytes())} for name in sorted(added)]}
(root/'tests/fixtures/game-re-source-delta.json').write_text(json.dumps(payload,indent=2)+'\n')
(root/'tests/retained-spatial-re-suite-counts.json').write_text(json.dumps({s['name']:s['total'] for s in gate['suites']},indent=2)+'\n')
print(json.dumps({'inventorySha256':sha(ib),'protectedFiles':len(protected),'changes':[c['path'] for c in changes]}))
