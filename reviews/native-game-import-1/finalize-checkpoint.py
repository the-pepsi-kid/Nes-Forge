"""Publish only measured evidence for one immutable import candidate."""
from pathlib import Path
import hashlib,json,subprocess
root=Path(__file__).resolve().parents[2];app=root/'app';review=Path(__file__).parent
sha=lambda b:hashlib.sha256(b).hexdigest()
read=lambda p:json.loads(p.read_text())
write=lambda p,v:p.write_text(json.dumps(v,indent=2)+'\n')
digest=sha((app/'mainline/NES_Forge_2.0.0-alpha.11.html').read_bytes())
gate=read(app/'test-results/candidate/Summary.json');browser=read(review/'Browser_Verification.json');retained=read(review/'browser/Report.json');native=read(review/'ROM_Verification.json')
assert gate['status']=='passed' and gate['unchangedCandidate'] and gate['suiteCount']==112 and gate['passed']==gate['total']==2010 and gate['failed']==0
assert browser['status']==retained['status']==native['status']=='passed'
assert gate['sha256']==browser['htmlSha256']==retained['htmlSha256']==native['htmlSha256']==digest
assert browser['passed']==10 and retained['passed']==20 and not browser['pageErrors'] and not retained['pageErrors'] and not retained['crashes']
assert sum(s['total'] for s in gate['suites'][:110])==1989
for item in gate['provenance']:
 p=app/item['path'];assert sha(p.read_bytes())==item['sha256'] and p.stat().st_size==item['bytes'],item['path']
for s in gate['suites']:
 assert s['passed']==s['total'] and s['failed']==0
 assert sha((app/s['report']).read_bytes())==s['reportSha256']
ng,z2=native['games'];assert ng['availableScenes']==48 and ng['scripts']==80 and ng['poses']==202 and ng['roundTrips']==2
assert [s['id'] for s in ng['refusedScripts']]==['ng-script:15','ng-script:16','ng-script:89']
assert z2['availableScenes']==561 and z2['unavailableSlots']==6 and z2['poses']==30 and z2['roundTrips']==1
projectiles=read(review/'Projectile_Binding_Verification.json');assert projectiles['status']=='passed' and projectiles['htmlSha256']==digest and len(projectiles['checks'])==4
examples=read(review/'Example_Regeneration.json');assert examples['htmlSha256']==digest and examples['files']==58 and examples['byteIdentical']==52 and examples['receiptIdentityOnlyChanges']==6
for entry in examples['comparisons']:assert sha((app/entry['path']).read_bytes())==entry['afterSha256']
base=read(app/'docs/history/ninja-zelda-re-1/build-inputs.json');unchanged=[];modified=[]
for item in base['inputs']:
 current=sha((app/item['path']).read_bytes());entry={'path':item['path'],'parentSha256':item['sha256'],'currentSha256':current}
 (unchanged if current==item['sha256'] else modified).append(entry)
assert {x['path'] for x in modified}=={'src/shell-prefix.html','src/services/release-info.js','src/services/documentation.js','src/services/project-store.js','src/re/game-re-ui.js'}
write(review/'Production_Preservation.json',{'parentCommit':'81338252e1f7a2ee8629c2f23f2e4e1d72c23472','htmlSha256':digest,'unchangedParts':unchanged,'reviewedModifiedParts':modified,'limits':['New importer/UI modules plus the owned ProjectStore append, Game RE export controls, documentation and release identity. CPU/APU/PPU, original RE decoders, capture, audio, runtime/compiler and tutorial styling are byte-identical to the prior checkpoint.']})
prior=read(root/'CANDIDATE.json')
# The previous full release records stay on their published commit; do not
# relabel old browser, package, example or listening reports as current checks.
candidate={'format':'NESForgeCandidateHandoff','version':1,'release':'2.0.0-alpha.11','candidate':'native-game-import-1','schema':12,'status':'review-candidate','branch':'implementation/native-game-import-2026-10-19','parentCommit':'81338252e1f7a2ee8629c2f23f2e4e1d72c23472','html':'mainline/NES_Forge_2.0.0-alpha.11.html','htmlSha256':digest,
 'changes':['Self-contained editable native asset bundle with CHR pixels, palettes, full selected room split into pages, selected 8x16 poses and supported Ninja effective-tick clips.','Bundle preview/reopen without the original ROM, standalone Forge project download, and collision-free current-project append owned by ProjectStore with one Undo/Redo.','Exact pixel/pose/timing verification over investigated native resources, explicit missing-pose refusals, capacity/integrity/reference guards and retained source/test inventories.'],
 'automatedResult':{'status':'passed','suiteCount':112,'passed':2010,'total':2010,'retainedSuites':110,'retainedCases':1989,'addedCases':21,'summary':'app/test-results/candidate/Summary.json','node':gate['runtime']['node']},
 'browserEvidence':[{'report':'reviews/native-game-import-1/Browser_Verification.json','passed':10,'htmlSha256':digest},{'report':'reviews/native-game-import-1/browser/Report.json','passed':20,'htmlSha256':digest}],
 'nativeResourceImport':{'guide':'app/docs/NATIVE_RESOURCE_IMPORT.md','verification':'reviews/native-game-import-1/ROM_Verification.json','ninjaRooms':48,'zeldaAvailableViews':561,'zeldaUnavailableSlots':6,'ninjaImportableScripts':80,'ninjaPartialScripts':[15,16,89],'ninjaPoses':202,'zeldaUntimedLinkPoses':30,'comparedBackgroundPixels':sum(g['comparedPixels'] for g in native['games']),'formats':['NESForgeNativeAssets v1','NESForge project schema 12'],'completeGameRecovery':False,'unknownEngineRecognition':False},
 'retainedExamples':{'files':58,'byteIdentical':52,'receiptIdentityOnlyChanges':6,'unchangedRomFiles':15,'unchangedProjects':19,'unchangedRecipes':6,'evidence':'reviews/native-game-import-1/Example_Regeneration.json'},
 'preservedParent':{'candidate':'ninja-zelda-re-1','commit':'81338252e1f7a2ee8629c2f23f2e4e1d72c23472','htmlSha256':'f12c1cac282bd081c60d25e1b62a99ddce3e578d82573ecca5e930d95af5c233','suiteCount':110,'cases':1989,'protectedFiles':295,'reference':'app/docs/history/ninja-zelda-re-1/Reference_Inventory.json','method':'Exact source/test reversal, retaining all earlier preservation boundaries. Release-only expectation edits preserve retained test cases.'},
 'historicalKit':{'path':'tester-kit/ninja-zelda-re-1/NF_Ninja_Zelda_RE.zip','candidate':'ninja-zelda-re-1','containsNewImporter':False},
 'limits':['Collision responses, physics, AI, executable source integration, state transitions, quest/item behavior and complete gameplay reconstruction remain incomplete.','Initial art only; native origin is recorded while content is adapted to Y=0 in paged scenes. Existing ROM build limits and source-scene dependencies remain.','Zelda poses are untimed; Ninja script update ticks do not reproduce state-dependent update cadence. Scripts 15/16 have unresolved sprite-table context; script 89 has unassigned pose entries. Known throwing-star/windmill clips use the native player pose table.','Checksum is integrity metadata, not a source signature. Keep the editable bundle for full reference evidence; ordinary project saves preserve canonical assets and per-page receipts.','Current 30 browser checks use headless Linux Chromium. Previous audio browser/oracle/example evidence retains its original checkpoint identity; no new physical Windows/mobile, listening or hardware claim.'],
 'promotion':'Development checkpoint on its own branch; use its standalone HTML for the new workflow. Previous complete review ZIP remains preserved and explicitly labeled historical.'}
files=sorted(p for p in app.rglob('*') if p.is_file() and p!=app/'SHA256SUMS.txt');assert not list(app.rglob('__pycache__'))
(app/'SHA256SUMS.txt').write_text(''.join(sha(p.read_bytes())+'  '+p.relative_to(app).as_posix()+'\n' for p in files));candidate['payloadChecksums']=len(files);candidate['packageFiles']=len(files)+1;write(root/'CANDIDATE.json',candidate)
subprocess.run(['python3','tools/verify_reference.py'],cwd=root,check=True)
print(json.dumps({'htmlSha256':digest,'automatedCases':2010,'suites':112,'browserChecks':30,'backgroundPixels':candidate['nativeResourceImport']['comparedBackgroundPixels']}))
