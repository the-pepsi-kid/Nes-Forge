"""Freeze the Native Room Worlds candidate before native edit/build integration."""
from pathlib import Path
import difflib,hashlib,json,subprocess
root=Path(__file__).resolve().parents[1]
parent='a3fe5d21781059e983fdfb182b28e16e9b5e0c65'
pin='0a973195626991c6277a0ab8e285c623717bfa6d6617d996dbcdfdc934f013d1'
archive=root/'docs/history/native-world-import-1'
sha=lambda b:hashlib.sha256(b).hexdigest()
def old(n):return subprocess.check_output(['git','show',parent+':app/'+n],cwd=root)
def save(n,b):
 p=archive/n;p.parent.mkdir(parents=True,exist_ok=True)
 if p.exists():assert p.read_bytes()==b,str(p)
 else:p.write_bytes(b)
base=json.loads(old('build-inputs.json'));manifest=json.loads(old('source-manifest.json'));gate=json.loads(old('test-results/candidate/Summary.json'))
assert base['sha256']==gate['sha256']==pin and gate['status']=='passed' and gate['suiteCount']==114 and gate['total']==2031
for n in ['source-manifest.json','build-inputs.json']:save(Path(n),old(n))
g={k:gate[k] for k in ['sha256','status','suiteCount','total']};g['suites']=[{k:s[k] for k in ['name','script','scriptSha256','total','passed','failed']}for s in gate['suites']];save(Path('gate-reference.json'),(json.dumps(g,indent=2)+'\n').encode())
protected=[]
for full in sorted(subprocess.check_output(['git','ls-tree','-r','--name-only','--full-tree',parent],cwd=root).decode().splitlines()):
 if full.startswith('app/'):
  n=full[4:]
  if n.startswith('tests/') or '/'not in n and n.endswith(('-suites.json','-modules.json')):
   b=old(n);protected.append({'path':n,'sha256':sha(b),'bytes':len(b)})
ib=(json.dumps({'candidate':'native-world-import-1','commit':parent,'htmlSha256':pin,'protectedFiles':protected},indent=2)+'\n').encode();save(Path('Reference_Inventory.json'),ib)
allowed={'src/mashup/mashup-model.js','src/world/world-rom.js','tests/re-bridge-model.cjs','tests/re-bridge-runtime.cjs','tests/audio-runtime180.cjs','tests/gameplay-core190.cjs','tests/world-runtime170.cjs','tests/native-audio-library.cjs','tests/native-sfx-apu.cjs','tests/rom-compat167.cjs','tests/re-native-map.cjs','src/services/release-info.js','src/services/documentation.js','src/services/project-store.js','src/services/build-services.js','src/re/game-re-native.js','src/re/spatial-re-ui.js','tests/native-world-import-preservation-lib.cjs','tests/run_candidate.cjs','tests/services167.cjs','tests/project-store167.cjs','tests/megaman2-audio.cjs','tests/spatial-re.cjs'}
changes=[]
for n in sorted(set([i['path']for i in base['inputs']]+[i['path']for i in protected])):
 a=old(n);b=(root/n).read_bytes()
 if a==b:continue
 assert n in allowed,n
 aa,bb=a.decode().splitlines(True),b.decode().splitlines(True);edits=[]
 for block in difflib.SequenceMatcher(None,aa,bb,autojunk=False).get_grouped_opcodes(3):edits.append({'before':''.join(aa[block[0][1]:block[-1][2]]),'after':''.join(bb[block[0][3]:block[-1][4]])})
 restored=b.decode()
 for e in edits:
  assert e['after'] and restored.count(e['after'])==1,(n,'Nonunique reversal')
  restored=restored.replace(e['after'],e['before'])
 assert restored==a.decode()
 changes.append({'path':n,'beforeSha256':sha(a),'afterSha256':sha(b),'replacements':edits})
current=json.loads((root/'source-manifest.json').read_text());added={'src/re/native-records.js','src/re/native-engine-format.js','src/re/native-engine-project.js','src/re/native-engine-ui.js'}
assert set(current['parts'])-set(manifest['parts'])==added and [p for p in current['parts'] if p not in added]==manifest['parts']
payload={'referenceCandidate':'native-world-import-1','candidate':'native-transition-edit-1','parentCommit':parent,'referenceHtmlSha256':pin,'inventorySha256':sha(ib),'referenceParts':manifest['parts'],'candidateParts':current['parts'],'changes':changes,'added':[{'path':n,'sha256':sha((root/n).read_bytes())}for n in sorted(added)]}
(root/'tests/fixtures/native-transition-source-delta.json').write_text(json.dumps(payload,indent=2)+'\n')
(root/'tests/retained-native-world-suite-counts.json').write_text(json.dumps({s['name']:s['total']for s in gate['suites']},indent=2)+'\n')
print(json.dumps({'protectedFiles':len(protected),'changes':[c['path']for c in changes],'added':len(added)}))
