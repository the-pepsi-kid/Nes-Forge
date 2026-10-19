"""Finalize only measured, matching evidence for the unchanged application."""
from pathlib import Path
import json,hashlib,subprocess
root=Path(__file__).resolve().parents[2];app=root/'app';review=Path(__file__).parent
sha=lambda b:hashlib.sha256(b).hexdigest()
read=lambda p:json.loads(p.read_text())
write=lambda p,v:p.write_text(json.dumps(v,indent=2)+'\n')
digest=sha((app/'mainline/NES_Forge_2.0.0-alpha.11.html').read_bytes())
gate=read(app/'test-results/candidate/Summary.json');native=read(review/'ROM_Verification.json');browser=read(review/'browser/Report.json');retained=read(review/'Retained_Browser_Verification.json');examples=read(review/'Example_Regeneration.json');source_index=read(review/'Source_Index_Verification.json')
assert gate['status']=='passed' and gate['unchangedCandidate'] and gate['suiteCount']==110 and gate['total']==gate['passed']==1989 and gate['failed']==0
assert native['status']==browser['status']==retained['status']=='passed'
assert native['htmlSha256']==browser['htmlSha256']==examples['htmlSha256']==gate['sha256']==digest
assert browser['passed']==20 and browser['failed']==0 and not browser['pageErrors'] and not browser['crashes']
assert retained['checks']==47
for item in retained['reports']:
 report=read(root/item['report']);assert report['htmlSha256']==item['htmlSha256']==digest and report['status']=='passed' and report['passed']==item['passed'] and report['failed']==0
 assert not report.get('pageErrors') and not report.get('crashes')
for item in gate['provenance']:
 p=app/item['path'];assert p.stat().st_size==item['bytes'] and sha(p.read_bytes())==item['sha256'],item['path']
for suite in gate['suites']:
 assert suite['passed']==suite['total'] and suite['failed']==0
 assert sha((app/suite['report']).read_bytes())==suite['reportSha256']
assert sum(s['total'] for s in gate['suites'][:107])==1970
assert all(s['sourceUnchanged'] and all(c['status']=='passed' for c in s['checks']) for s in native['sources'])
assert examples['files']==58 and examples['byteIdentical']==52 and examples['receiptIdentityOnlyChanges']==6
for item in examples['comparisons']:assert sha((app/item['path']).read_bytes())==item['afterSha256'],item['path']
assert source_index['outputSha256']==sha((app/'src/re/game-re-index.js').read_bytes())

# These production components are checked byte-for-byte, separately from tests.
base=read(app/'docs/history/spatial-re-1/build-inputs.json')
unchanged=[];modified=[]
for item in base['inputs']:
 p=app/item['path'];same=sha(p.read_bytes())==item['sha256'];record={'path':item['path'],'parentSha256':item['sha256'],'currentSha256':sha(p.read_bytes()),'byteIdentical':same}
 (unchanged if same else modified).append(record)
assert {x['path'] for x in modified}=={'src/shell-prefix.html','src/services/release-info.js','src/services/documentation.js','src/legacy/01-emulator.js','src/re/spatial-re-ui.js'}
write(review/'Production_Preservation.json',{'parentCommit':'387b99b5f4bec1e05568482c15ef5bbea1ae4527','htmlSha256':digest,'unchangedParts':unchanged,'reviewedModifiedParts':modified,'limits':['The frame runner/PPU write path has the scoped visible-address correction. CPU instruction code, APU, capture implementation, native audio drivers, project/schema, compiler and runtime emitters are byte-identical.']})

candidate=read(root/'CANDIDATE.json')
candidate.update(candidate='ninja-zelda-re-1',branch='implementation/ninja-zelda-re-2026-10-19',parentCommit='387b99b5f4bec1e05568482c15ef5bbea1ae4527',htmlSha256=digest)
candidate['changes']=[
 'Connected native game resource catalog inside RE / DISASM, with original initial scene art, geometry, objects, actor parameter/dispatch tables, sprite resources, CHR banks, source annotations and evidence export.',
 'Ninja Gaiden: 48 rooms, 423 enemy and 281 lantern records, entrances/palettes, 44 actor selectors, 202 poses and 83 nonempty shared scripts with native reader timing.',
 'Zelda II: nine world/table contexts, 567 slots with 561 available scene views, object/enemy/connection/location records and 30 native Link pose/facing samples.',
 'Zelda II title-screen ground/tree corruption corrected by honoring visible second PPUADDR writes in the scanline renderer and matching capture coordinates.',
 'Canonical schema, CPU instructions, APU, capture implementation, compiler/runtime emitters and native audio remain preserved; source reversal restores the exact Spatial RE parent and all 288 protected files.'
]
candidate['automatedResult']={'status':'passed','suiteCount':110,'passed':1989,'total':1989,'retainedSuites':107,'retainedCases':1970,'addedCases':19,'summary':'app/test-results/candidate/Summary.json'}
candidate['retainedSuites']=107
candidate['retainedCases']=1970
if candidate.get('preservedParent',{}).get('candidate')!='spatial-re-1':
 prior=candidate.get('preservedParent')
 if prior:candidate.setdefault('historicalPreservation',{})[prior['candidate']]=prior
candidate['preservedParent']={'candidate':'spatial-re-1','commit':'387b99b5f4bec1e05568482c15ef5bbea1ae4527','htmlSha256':'b5f73734aa43356067e8fc0b0a9f45c7cbe434b4a38dfbedde827f1d534c0945','suiteCount':107,'cases':1970,'reference':'app/docs/history/spatial-re-1/Reference_Inventory.json','protectedFiles':288,'method':'Exact parent source/test reconstruction around the reviewed additions; all earlier preservation boundaries retained. Three retained test edits update release identity only, with no cases removed.'}
candidate['retainedExamples']['evidence']='reviews/ninja-zelda-re-1/Example_Regeneration.json'
candidate['browserEvidence']=[{'report':'reviews/ninja-zelda-re-1/browser/Report.json','passed':20,'htmlSha256':digest},*retained['reports']]
candidate['nativeGameRE']={'guide':'app/docs/NINJA_ZELDA_RE.md','verification':'reviews/ninja-zelda-re-1/ROM_Verification.json','ninjaRooms':48,'zeldaSceneContextSlots':567,'zeldaAvailableViews':561,'zeldaUnavailableSlots':6,'ninjaPoses':202,'ninjaNonemptyScripts':83,'zeldaLinkPoseFacingSamples':30,'sourceUnchanged':True,'nativeSceneImport':False,'completeGameRecovery':False,'unknownEngineRecognition':False}
candidate['spatialRE']['retainedAndVerified']=True
candidate['ownerAcceptance']='Physical Windows/mobile, NES hardware, listening, full collision/physics/AI/quest behavior, native scene import and complete game reconstruction remain open.'
candidate['promotion']='Development review checkpoint on its own branch. Complete app and preserved review-kit content; commercial ROMs and extracted commercial payloads excluded.'
candidate['roadmap']='Continue native collision response, movement/AI/state transitions, animation bindings and guarded canonical import; preserve exact source and unresolved behavior.'
candidate['retainedNativeAudioOracles']['currentEvidence']='Unchanged production native audio/CPU/APU byte checks, complete current gate and 34 current audio browser checks. Historical PCM/catalog oracles remain labeled with their original identity.'
files=sorted(p for p in app.rglob('*') if p.is_file() and p!=app/'SHA256SUMS.txt' and '__pycache__' not in p.parts)
assert not list(app.rglob('__pycache__'))
(app/'SHA256SUMS.txt').write_text(''.join(sha(p.read_bytes())+'  '+p.relative_to(app).as_posix()+'\n' for p in files))
candidate['payloadChecksums']=len(files);candidate['packageFiles']=len(files)+1;write(root/'CANDIDATE.json',candidate)
subprocess.run(['python3','tools/verify_reference.py'],cwd=root,check=True)
print(json.dumps({'htmlSha256':digest,'automatedCases':1989,'automatedSuites':110,'browserChecks':67,'payloadChecksums':len(files)}))
