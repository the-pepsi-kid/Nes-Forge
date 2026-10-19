"""Record exact reviewed changes against the immutable survey parent.
Never regenerate old test expectations or parent identities.
"""
from pathlib import Path
import difflib,hashlib,json,subprocess
root=Path(__file__).resolve().parents[1];parent='2bdb4d728089d96ac43e50bf028e0c2907dc5d8c';pin='16d29e4082bc0377e03a54903e13fa9129c46ee9cf5a39e7ffdced6779591417';sha=lambda b:hashlib.sha256(b).hexdigest();archive=root/'docs/history/audio-driver-survey-1'
def original(name):return subprocess.check_output(['git','show',parent+':app/'+name],cwd=root)
def save(name,data):
 p=archive/name;p.parent.mkdir(parents=True,exist_ok=True)
 if p.exists():assert p.read_bytes()==data,'Never renew parent archive: '+str(p)
 else:p.write_bytes(data)
base=json.loads(original('build-inputs.json'));assert base['sha256']==pin
manifest=json.loads(original('source-manifest.json'));assert manifest['parts']==[x['path'] for x in base['inputs']]
for name in ['build-inputs.json','source-manifest.json','test-results/candidate/Summary.json']:save(Path('root')/Path(name).name,original(name))
paths=subprocess.check_output(['git','ls-tree','-r','--name-only','--full-tree',parent],cwd=root).decode().splitlines()
protected=[]
for full in sorted(set(paths)):
 if not full.startswith('app/'):continue
 name=full[4:]
 if name.startswith('tests/') or '/' not in name and name.endswith(('-suites.json','-modules.json')):
  b=original(name);protected.append({'path':name,'sha256':sha(b),'bytes':len(b)})
inventory={'candidate':'audio-driver-survey-1','commit':parent,'htmlSha256':pin,'protectedFiles':protected}
ib=(json.dumps(inventory,indent=2)+'\n').encode();save(Path('Reference_Inventory.json'),ib)
allowed={'src/shell-prefix.html','src/services/release-info.js','src/legacy/01-emulator.js','src/re/re-native-audio-import.js'}
allowed_tests={'tests/audio-driver-survey-preservation-lib.cjs','tests/run_candidate.cjs','tests/services167.cjs','tests/recovery-methods-ui.cjs'}
new={'src/services/cpu6502-core.js','src/re/native-audio-catalog.js','src/re/native-audio-profiles.js','src/re/native-audio-machine.js','src/re/native-audio-recovery.js','src/audio/native-audio-library-ui.js'}
def change(name,a,b):
 aa,bb=a.decode().splitlines(True),b.decode().splitlines(True);edits=[]
 for g in difflib.SequenceMatcher(None,aa,bb,autojunk=False).get_grouped_opcodes(3):edits.append({'before':''.join(aa[g[0][1]:g[-1][2]]),'after':''.join(bb[g[0][3]:g[-1][4]])})
 restored=b.decode()
 for e in edits:
  assert e['after'] and restored.count(e['after'])==1,(name,'Nonunique reverse patch');restored=restored.replace(e['after'],e['before'])
 assert restored==a.decode();return {'path':name,'beforeSha256':sha(a),'afterSha256':sha(b),'replacements':edits}
changes=[]
for part in base['inputs']:
 name=part['path'];a=original(name);b=(root/name).read_bytes();assert sha(a)==part['sha256']
 if a!=b:assert name in allowed,name;changes.append(change(name,a,b))
current=json.loads((root/'source-manifest.json').read_text());assert set(current['parts'])-set(manifest['parts'])==new;assert [p for p in current['parts'] if p not in new]==manifest['parts']
tests=[]
for item in protected:
 name=item['path'];b=(root/name).read_bytes()
 if sha(b)!=item['sha256']:assert name in allowed_tests,name;tests.append(change(name,original(name),b))
payload={'referenceCandidate':'audio-driver-survey-1','candidate':'native-audio-library-1','referenceHtmlSha256':pin,'inventorySha256':sha(ib),'referenceParts':manifest['parts'],'candidateParts':current['parts'],'changes':changes,'testChanges':tests,'added':[{'path':name,'sha256':sha((root/name).read_bytes())} for name in sorted(new)]}
(root/'tests/fixtures/native-audio-library-source-delta.json').write_text(json.dumps(payload,indent=2)+'\n');print(json.dumps({'sourceChanges':[x['path'] for x in changes],'testChanges':[x['path'] for x in tests],'newModules':len(new),'protectedParentFiles':len(protected),'inventorySha256':sha(ib)}))
