"""Finalize only matching, unchanged source/gate/browser verification records."""
from pathlib import Path
import json,hashlib,subprocess
root=Path(__file__).resolve().parents[2];app=root/'app';review=Path(__file__).parent
sha=lambda b:hashlib.sha256(b).hexdigest()
read=lambda p:json.loads(p.read_text())
write=lambda p,v:p.write_text(json.dumps(v,indent=2)+'\n')
digest=sha((app/'mainline/NES_Forge_2.0.0-alpha.11.html').read_bytes());gate=read(app/'test-results/candidate/Summary.json');rom=read(review/'ROM_Verification.json');examples=read(review/'Example_Regeneration.json')
browsers=[('reviews/spatial-re-1/browser/Report.json',13),('reviews/megaman2-native-audio-1/browser/Report.json',10),('reviews/native-audio-library-1/browser/Report.json',14),('reviews/audio-discovery-1/browser/Report.json',10)]
assert gate['status']=='passed' and gate['unchangedCandidate'] and gate['suiteCount']==107 and gate['passed']==gate['total']==1970 and gate['failed']==0
assert gate['sha256']==rom['htmlSha256']==examples['htmlSha256']==digest
assert sum(s['total'] for s in gate['suites'][:105])==1958
for x in gate['provenance']:
 p=app/x['path'];assert p.stat().st_size==x['bytes'] and sha(p.read_bytes())==x['sha256'],x['path']
for s in gate['suites']:
 assert sha((app/s['report']).read_bytes())==s['reportSha256'] and s['passed']==s['total'] and s['failed']==0,s['name']
for name,count in browsers:
 b=read(root/name);assert b['htmlSha256']==digest and b['status']=='passed' and b['passed']==count and b['failed']==0,name
 assert not b.get('pageErrors') and not b.get('crashes'),name
for x in examples['comparisons']:assert sha((app/x['path']).read_bytes())==x['afterSha256'],x['path']
assert [(x['maps'],x['animations']) for x in rom['sources']]==[(616,0),(48,13),(4,0),(79,0)]
assert all(x['sourceUnchanged'] and all(c['status']=='passed' for c in x['checks']) for x in rom['sources'])
c=read(root/'CANDIDATE.json');c.update(candidate='spatial-re-1',branch='implementation/spatial-re-2026-10-19',htmlSha256=digest,parentCommit='d1f3ef5dd3be5150431d74b478fb9a38db300f6e',changes=['Read-only native spatial workbench in RE / DISASM: source-scoped map/category grids, source-byte inspection and selected evidence export.','Mega Man 2: 616 stage-context views across 352 physical screen slots, retaining native stage-dependent collision semantics and offscreen rows.','Ninja Gaiden: 48 room layouts with ground kinds/contact flags, plus 13 native player scripts, durations, poses, OAM pieces and grayscale CHR preview.','Zelda II: four overworld terrain maps; Castlevania II: 79 layouts and raw tile categories before conditional block substitution. Unsupported domains are explicitly labeled.','Prior audio functionality, canonical project schema, CPU/APU, native drivers, compiler and runtime emitters preserved. Original tutorials, guides and examples retained.'])
c['automatedResult']={'status':'passed','suiteCount':107,'passed':1970,'total':1970,'retainedSuites':105,'retainedCases':1958,'addedCases':12,'summary':'app/test-results/candidate/Summary.json'}
c['browserEvidence']=[{'report':name,'passed':count,'htmlSha256':digest} for name,count in browsers]
c['spatialRE']={'guide':'app/docs/SPATIAL_RE.md','verification':'reviews/spatial-re-1/ROM_Verification.json','mapViews':747,'nativePlayerScripts':13,'scope':'Decoded native geometry/categories with explicitly bounded per-title semantics; read-only evidence, not playable conversion.','sourceUnchanged':True,'completeGameRecovery':False,'nativeSceneImport':False,'unknownEngineRecognition':False}
c['retainedNativeAudioOracles']={'sourceCommit':'d1f3ef5dd3be5150431d74b478fb9a38db300f6e','htmlSha256':'216d187d3405d0da25d7d936ac06b533c0ea6ff7ed9f94c5afa8b5484ab6ddfe','rerunThisCheckpoint':False,'currentEvidence':'Exact production native-audio/CPU/APU byte preservation, complete current gate and 34 current audio browser checks. Historical PCM/catalog oracles remain labeled with their original identity.'}
c['ownerAcceptance']='Physical Windows/mobile, NES hardware, complete scene/behavior recovery, conditional collision and generalized engine recognition remain open.'
c['promotion']='Development review checkpoint on its own branch. Standalone app and preserved documentation included; commercial ROMs and sample payloads excluded.'
c['roadmap']='Connect validated native geometry/art to guarded canonical scene import; implement or reject unsupported behavior explicitly. Expand actor/transition and native animation decoders.'
files=sorted(p for p in app.rglob('*') if p.is_file() and p!=app/'SHA256SUMS.txt' and '__pycache__' not in p.parts)
assert not list(app.rglob('__pycache__')),'Do not package Python cache files'
(app/'SHA256SUMS.txt').write_text(''.join(sha(p.read_bytes())+'  '+p.relative_to(app).as_posix()+'\n' for p in files));c['payloadChecksums']=len(files);c['packageFiles']=len(files)+1;write(root/'CANDIDATE.json',c)
subprocess.run(['python3','tools/verify_reference.py'],cwd=root,check=True)
print(json.dumps({'htmlSha256':digest,'suiteCount':107,'passed':1970,'browserChecks':47,'payloadChecksums':len(files)}))
