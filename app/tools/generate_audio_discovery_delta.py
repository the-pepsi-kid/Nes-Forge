"""Preserve the immutable Native Audio Library parent and reviewed exact deltas."""
from pathlib import Path
import difflib,hashlib,json,subprocess
root=Path(__file__).resolve().parents[1];parent='a94252364b63f9271cec4b16ca4a4a43478002aa';pin='c3dd4d509cb0df3be1ce60404810ec6e4cc25d95d1edfbc1cda87964f4d2247e';sha=lambda b:hashlib.sha256(b).hexdigest();archive=root/'docs/history/native-audio-library-1'
def old(name):return subprocess.check_output(['git','show',parent+':app/'+name],cwd=root)
def save(name,data):
 p=archive/name;p.parent.mkdir(parents=True,exist_ok=True)
 if p.exists():assert p.read_bytes()==data,'Immutable parent archive changed: '+str(p)
 else:p.write_bytes(data)
base=json.loads(old('build-inputs.json'));manifest=json.loads(old('source-manifest.json'));gate=json.loads(old('test-results/candidate/Summary.json'));assert base['sha256']==gate['sha256']==pin and gate['status']=='passed' and gate['suiteCount']==101 and gate['total']==1916
for name in ['build-inputs.json','source-manifest.json']:save(Path(name),old(name))
compact={k:gate[k] for k in ['sha256','status','suiteCount','total']};compact['suites']=[{k:s[k] for k in ['name','script','scriptSha256','total','passed','failed']} for s in gate['suites']];save(Path('gate-reference.json'),(json.dumps(compact,indent=2)+'\n').encode())
protected=[]
for full in sorted(subprocess.check_output(['git','ls-tree','-r','--name-only','--full-tree',parent],cwd=root).decode().splitlines()):
 if not full.startswith('app/'):continue
 name=full[4:]
 if name.startswith('tests/') or '/' not in name and name.endswith(('-suites.json','-modules.json')):
  b=old(name);protected.append({'path':name,'sha256':sha(b),'bytes':len(b)})
ib=(json.dumps({'candidate':'native-audio-library-1','commit':parent,'htmlSha256':pin,'protectedFiles':protected},indent=2)+'\n').encode();save(Path('Reference_Inventory.json'),ib)
allowed={'src/shell-prefix.html','src/services/release-info.js','src/re/re-analysis.js'};allowed_tests={'tests/native-audio-library-preservation-lib.cjs','tests/services167.cjs','tests/run_candidate.cjs'};added={'src/re/audio-discovery.js','src/re/audio-discovery-references.js','src/audio/audio-discovery-ui.js'}
def change(name,a,b):
 aa,bb=a.decode().splitlines(True),b.decode().splitlines(True);edits=[]
 for g in difflib.SequenceMatcher(None,aa,bb,autojunk=False).get_grouped_opcodes(3):edits.append({'before':''.join(aa[g[0][1]:g[-1][2]]),'after':''.join(bb[g[0][3]:g[-1][4]])})
 restored=b.decode()
 for e in edits:
  assert e['after'] and restored.count(e['after'])==1,(name,'Nonunique reversal');restored=restored.replace(e['after'],e['before'])
 assert restored==a.decode();return {'path':name,'beforeSha256':sha(a),'afterSha256':sha(b),'replacements':edits}
changes=[]
for entry in base['inputs']:
 name=entry['path'];a=old(name);b=(root/name).read_bytes();assert sha(a)==entry['sha256']
 if a!=b:assert name in allowed,name;changes.append(change(name,a,b))
current=json.loads((root/'source-manifest.json').read_text());assert set(current['parts'])-set(manifest['parts'])==added;assert [p for p in current['parts'] if p not in added]==manifest['parts']
for entry in protected:
 name=entry['path'];b=(root/name).read_bytes()
 if sha(b)!=entry['sha256']:assert name in allowed_tests,name;changes.append(change(name,old(name),b))
payload={'referenceCandidate':'native-audio-library-1','candidate':'audio-discovery-1','referenceHtmlSha256':pin,'inventorySha256':sha(ib),'referenceParts':manifest['parts'],'candidateParts':current['parts'],'changes':changes,'added':[{'path':name,'sha256':sha((root/name).read_bytes())} for name in sorted(added)]}
(root/'tests/fixtures/audio-discovery-source-delta.json').write_text(json.dumps(payload,indent=2)+'\n');counts={s['name']:s['total'] for s in gate['suites']};(root/'tests/retained-native-audio-library-suite-counts.json').write_text(json.dumps(counts,indent=2)+'\n');print(json.dumps({'inventorySha256':sha(ib),'protectedFiles':len(protected),'changes':[c['path'] for c in changes]}))
