"""Package the unchanged, clean-tested alpha.6 candidate; preserve alpha.5 gates."""
from pathlib import Path
import argparse, hashlib, json, os, subprocess, zipfile
root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--output',type=Path);parser.add_argument('--stage',action='store_true');args=parser.parse_args()
assert not args.stage or args.output and 'staging' in args.output.name.lower()
digest=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
subprocess.run(['python3',str(root/'tools/bundle.py'),'--check'],cwd=root,check=True)
manifest=json.loads((root/'source-manifest.json').read_text());release=manifest['release'];candidate='roadmap-1';html=root/manifest['output']
assert release=='2.0.0-alpha.6' and manifest['output']=='mainline/NES_Forge_2.0.0-alpha.6.html'
extra=json.loads((root/'roadmap-suites.json').read_text());counts=json.loads((root/'tests/retained-suite-counts.json').read_text())
assert len(counts)==45 and sum(counts.values())==990
summary=None;browser=[]
if not args.stage:
 summary=json.loads((root/'test-results/candidate/Summary.json').read_text())
 assert summary['status']=='passed' and summary['failed']==0 and summary['release']==release
 assert summary['unchangedCandidate'] is True and summary['html']==manifest['output'] and summary['sha256']==digest(html)
 suites=summary['suites'];assert len(suites)==45+len(extra)==summary['suiteCount']
 assert len({s['name']for s in suites})==len(suites)
 assert {s['name']for s in suites}==set(counts)|{s[0]for s in extra}
 for s in suites:
  assert s['passed']==s['total']>0 and s['failed']==0
  if s['name'] in counts:assert s['total']==counts[s['name']],s['name']
  assert digest(root/s['script'])==s['scriptSha256']
  assert digest(root/s['report'])==s['reportSha256']
  data=json.loads((root/s['report']).read_text());cases=data.get('results',data.get('tests'))
  assert len(cases)==s['total'] and all(c.get('passed') is True for c in cases)
 assert summary['passed']==summary['total']==sum(s['total']for s in suites)
 for item in summary['provenance']:assert digest(root/item['path'])==item['sha256'],'Changed gate input: '+item['path']
 proof=json.loads((root/'checkpoints/roadmap-1-clean-extraction/Reproduction.json').read_text())
 assert proof['candidate']==candidate and proof['status']=='passed'
 assert proof['htmlSha256']==digest(html) and proof['summarySha256']==digest(root/'test-results/candidate/Summary.json')
 assert all(proof[k]==summary[k]for k in ['passed','total','suiteCount'])
 assert proof['stagingVerifiedPayloads']>0 and len(proof['stagingArchiveSha256'])==64
 for name in ['browser-mobile','browser-re-analysis','browser-re-runtime','browser-audio-adaptive','browser-roadmap']:
  record=json.loads((root/'test-results'/name/'Report.json').read_text())
  assert record['sha256']==digest(html) and record['status'] in {'passed','blocked'},name+' failed or stale'
  if record['status']=='blocked':assert record['passed']==0 and record['failed']==0 and record['checks']==[]
  else:assert record['passed']>0 and record['failed']==0
  browser.append({'suite':name,'status':record['status'],'passed':record['passed']})
names=['README.md','PROJECT_CHARTER.md','ARCHITECTURE_CONTRACT.md','DECISION_LOG.md','ROADMAP.md','CURRENT_BASELINE.md','TEST_POLICY.md','HANDOFF.md','package.json','source-manifest.json','build-inputs.json','roadmap-modules.json','roadmap-suites.json',manifest['output']]
files={root/n for n in names}
directories=['src','tools','tests','stabilization','baseline','examples','docs','checkpoints','hosted']
if not args.stage:directories+=['test-results/candidate','test-results/browser-mobile','test-results/browser-re-analysis','test-results/browser-re-runtime','test-results/browser-audio-adaptive','test-results/browser-roadmap']
for name in directories:
 folder=root/name;assert folder.is_dir(),name
 for p in folder.rglob('*'):
  if p.is_file() and '__pycache__' not in p.parts and p.suffix not in {'.pyc','.rgba'} and not any(x in p.parts for x in ['node_modules','data','.git']):files.add(p)
for p in files:assert p.is_file() and p.resolve().is_relative_to(root),p
files=sorted(files,key=lambda p:p.relative_to(root).as_posix());checksums=root/'SHA256SUMS.txt'
checksums.write_text(''.join(digest(p)+'  '+p.relative_to(root).as_posix()+'\n'for p in files))
target=(args.output or root.parent/'NES_Forge_2.0.0-alpha.6_Roadmap_Workbench_Candidate.zip').resolve();assert not target.is_relative_to(root)
target.parent.mkdir(parents=True,exist_ok=True);temporary=target.with_suffix(target.suffix+'.tmp');prefix='NES_Forge_'+release+'/'
with zipfile.ZipFile(temporary,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9)as archive:
 for p in files+[checksums]:
  entry=zipfile.ZipInfo(prefix+p.relative_to(root).as_posix(),(2026,10,8,0,0,0));entry.external_attr=0o100644<<16;entry.compress_type=zipfile.ZIP_DEFLATED;archive.writestr(entry,p.read_bytes())
with zipfile.ZipFile(temporary)as archive:
 assert archive.testzip() is None
 for p in files:assert hashlib.sha256(archive.read(prefix+p.relative_to(root).as_posix())).hexdigest()==digest(p)
os.replace(temporary,target)
print(json.dumps({'archive':str(target),'archiveSha256':digest(target),'files':len(files)+1,'htmlSha256':digest(html),'release':release,'candidate':candidate,'stagingOnly':args.stage,'browser':browser,'passed':summary['passed']if summary else None,'total':summary['total']if summary else None},indent=2))
