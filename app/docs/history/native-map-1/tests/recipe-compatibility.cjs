#!/usr/bin/env node
'use strict';
// Actual bundled services and handlers; mock DOM, not browser/hardware QA.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{loadForge}=require('./harness.cjs');
const root=path.resolve(__dirname,'..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'))),html=path.resolve(process.argv[2]||path.join(root,manifest.output));
const cp=value=>JSON.parse(JSON.stringify(value)),sha=value=>crypto.createHash('sha256').update(value).digest('hex'),tests=[],test=(name,fn)=>tests.push({name,fn});
const oldDir=path.join(root,'examples/Seeded_Mashup_2.0.0-alpha.10'),oldManifest=JSON.parse(fs.readFileSync(path.join(oldDir,'Manifest.json'))),projects=oldManifest.inputs.map(item=>JSON.parse(fs.readFileSync(path.join(oldDir,item.filename)))),recipe=JSON.parse(fs.readFileSync(path.join(oldDir,oldManifest.outputs[0].recipe)));
function fresh(){const h=loadForge(html,{environment:{crypto:crypto.webcrypto}});assert.deepEqual(h.errors,[]);h.services=h.context.Forge.services;h.model=h.services.MashupModel;h.adapter=h.services.RecipeIdentity;assert.ok(h.adapter);return h;}
function file(value,name='recipe.json'){const text=JSON.stringify(value);return{name,size:Buffer.byteLength(text),text:async()=>text};}
async function open(h,project){assert.equal(await h.services.ProjectStore.openFile({target:{files:[file(project,'base.nesforge.json')],value:'chosen'}}),true);}
function state(h){return{project:h.run('Forge.services.ProjectStore.serialize()'),history:h.json('({undo:undoStack,redo:redoStack,undoBytes})'),emulator:h.json('({loaded:emu.loaded,running:emu.running,PC:emu.PC,frame:emu.frameCount})')};}
function pool(h,{allCurrent=false}={}){const opened=h.json('Forge.services.ProjectStore.capture()');return[opened,...projects.slice(1).map(project=>allCurrent?{...cp(project),foundation:manifest.release}:project)].map(project=>h.model.createSource(project));}
function rejectPattern(){return /identity|identities|exact original|differs|unknown|unsupported|fields|source|recipe|regeneration/i;}

test('Versioned foundation-only contract is bounded and raw alpha.10 source/result hashes remain unchanged',async()=>{
 const h=fresh(),sources=projects.map(project=>h.model.createSource(project)),before=JSON.stringify({projects,recipe}),result=h.model.replay(sources,recipe);
 assert.equal(h.adapter.version,1);assert.equal(h.adapter.method,'exact-v1-foundation-reissue-1');assert.deepEqual(cp(h.adapter.supportedFoundations),['2.0.0-alpha.10','2.0.0-alpha.11']);
 assert.equal(h.model.hash(result.project),recipe.resultSha256);assert.deepEqual(cp(result.recipe),recipe);const bridged=await h.adapter.replayMashup(sources,recipe);assert.deepEqual(cp(bridged),cp(result));assert.equal(bridged.migration,undefined);assert.equal(JSON.stringify({projects,recipe}),before);
});

test('Every shipped alpha.10 recipe opens through current actual handlers, reissues and preserves original bytes',async()=>{
 for(const output of oldManifest.outputs){
  const h=fresh(),original=JSON.parse(fs.readFileSync(path.join(oldDir,output.recipe))),bytes=JSON.stringify(original);await open(h,projects[0]);const ui=h.services.MashupUI,before=state(h);
  assert.equal(ui.captureCurrent(),true);assert.equal(await ui.loadDonors(projects.slice(1).map((project,index)=>file(project,'donor-'+index+'.json'))),true);
  assert.equal(await ui.loadRecipe(file(original)),true,h.get('mashupStatus').textContent);assert.deepEqual(state(h),before);assert.match(h.get('mashupSummary').textContent,/foundation release metadata/);assert.match(h.get('mashupStatus').textContent,/migrated/);
  const current=cp(ui.getState().recipe),migration=cp(ui.getState().migration),currentSources=pool(h),replayed=h.model.replay(currentSources,current),legacy=h.model.replay(projects.map(project=>h.model.createSource(project)),original),expected=cp(legacy.project);expected.foundation=manifest.release;
  assert.deepEqual(cp(replayed.project),expected);assert.notEqual(current.baseSourceId,original.baseSourceId);assert.equal(current.version,1);assert.equal(current.algorithm,original.algorithm);assert.equal(migration.version,1);assert.equal(migration.originalRecipeSha256,h.model.hash(original));assert.equal(migration.currentRecipeSha256,h.model.hash(current));assert.equal(migration.sources.length,1);assert.equal(migration.sources[0].fromFoundation,'2.0.0-alpha.10');assert.equal(migration.sources[0].toFoundation,manifest.release);assert.equal(JSON.stringify(original),bytes);
  for(const domain of h.model.domains)assert.equal(h.get('mashup'+domain[0].toUpperCase()+domain.slice(1)).value,current.choices[domain]);
  const saved=[];h.context.forgeSave.request=async(data,name)=>{saved.push({data:JSON.parse(Buffer.from(data).toString()),name});return{status:'saved'};};await ui.downloadRecipe();assert.deepEqual(saved[0].data,current);
  assert.equal(await ui.apply(),true,h.get('mashupStatus').textContent);assert.deepEqual(h.json('Forge.services.ProjectStore.capture()'),expected);assert.equal(h.run('undoStack.length'),before.history.undo.length+1);h.run('undo()');assert.equal(h.run('Forge.services.ProjectStore.serialize()'),before.project);h.run('redo()');assert.deepEqual(h.json('Forge.services.ProjectStore.capture()'),expected);
  await open(h,expected);assert.deepEqual(h.json('Forge.services.ProjectStore.capture()'),expected);
  await open(h,projects[0]);assert.equal(ui.captureCurrent(),true);assert.equal(await ui.loadRecipe(file(current)),true,h.get('mashupStatus').textContent);assert.deepEqual(cp(ui.getState().recipe),current);assert.equal(ui.getState().migration,null);
 }
});

test('Reopened donors also migrate with all exact source identities and result equivalence checked',async()=>{
 const h=fresh();await open(h,projects[0]);const sources=pool(h,{allCurrent:true}),before=state(h),snap=JSON.stringify(sources),out=await h.adapter.replayMashup(sources,recipe);
 assert.equal(out.migration.sources.length,3);assert.equal(h.model.hash(out.project),out.recipe.resultSha256);assert.deepEqual(cp(h.model.replay(sources,out.recipe).project),cp(out.project));assert.equal(JSON.stringify(sources),snap);assert.deepEqual(state(h),before);assert.equal(Object.isFrozen(out.migration.sources[0]),true);
});

test('Any non-foundation base or donor alteration is refused without weakening exact-source checks',async()=>{
 const h=fresh();await open(h,projects[0]);const originals=pool(h).map(source=>cp(source.project));
 for(const mutate of [p=>p[0].projectName+=' edited',p=>p[0].scenes[0].nt[0]^=1,p=>p[0].worldRuntime.moveSpeed=p[0].worldRuntime.moveSpeed===4?3:4,p=>p[1].projectName+=' edited',p=>p[1].scenes[0].chr[0][0][0]^=1,p=>p[2].tempo++]){
  const changed=cp(originals);mutate(changed);const before=state(h);await assert.rejects(()=>h.adapter.replayMashup(changed.map(project=>h.model.createSource(project)),recipe),rejectPattern());assert.deepEqual(state(h),before);
 }
});

test('Tampered historical recipe hashes, bytes, bindings, choices and gameplay decisions are rejected',async()=>{
 const h=fresh();await open(h,projects[0]);const sources=pool(h),before=state(h);
 for(const mutate of [r=>r.resultSha256='0'.repeat(64),r=>r.sources[0].sha256='0'.repeat(64),r=>r.sources[0].byteLength++,r=>r.sources[0].ignored=true,r=>r.sources.push(cp(r.sources[0])),r=>r.sources.pop(),r=>r.baseSourceId=sources[1].id,r=>r.choices.background='0'.repeat(64)+':scene:missing',r=>r.gameplay.decisions[0].after=999,r=>r.version=2]){
  const changed=cp(recipe);mutate(changed);await assert.rejects(()=>h.adapter.replayMashup(sources,changed),rejectPattern());assert.deepEqual(state(h),before);
 }
});

test('Foundation values outside the reviewed release set are not guessed or stripped',async()=>{
 const h=fresh();await open(h,projects[0]);const sources=pool(h),project=cp(sources[0].project);project.foundation='unreviewed-future-release';const unknown=[h.model.createSource(project),...sources.slice(1)];
 await assert.rejects(()=>h.adapter.replayMashup(unknown,recipe),rejectPattern());
 // Exact v1 replay itself remains usable regardless of metadata text.
 const exact=h.model.preview(unknown,{seed:'exact',baseSourceId:unknown[0].id,choices:Object.fromEntries(h.model.domains.map(domain=>[domain,'keep']))});assert.deepEqual(cp(await h.adapter.replayMashup(unknown,exact.recipe)),cp(h.model.replay(unknown,exact.recipe)));
});

test('A verified legacy base cannot be silently swapped with a loaded donor',async()=>{
 const h=fresh();await open(h,projects[1]);const sources=[h.model.createSource(h.json('Forge.services.ProjectStore.capture()')),h.model.createSource(projects[0]),h.model.createSource(projects[2])];await assert.rejects(()=>h.adapter.replayMashup(sources,recipe),/exact original base project/);
});

test('Movement v1 metadata migration shares the contract, preserves locks and uses current UI Apply/Undo',async()=>{
 const h=fresh(),movement=h.services.MovementRules,source=movement.createSource(projects[0]),first=movement.preview(source,{seed:'before',preset:'high-jump',intensity:3}),legacy=movement.preview(source,{seed:'locked',preset:'sprint',intensity:3,locks:{jumpSpeed:true},previousRecipe:first.recipe}),bytes=JSON.stringify(legacy.recipe);await open(h,projects[0]);
 const ui=h.services.MovementRulesUI,before=state(h);assert.equal(ui.captureCurrent(),true);assert.equal(await ui.loadRecipe(file(legacy.recipe)),true,h.get('movementRulesStatus').textContent);assert.deepEqual(state(h),before);assert.match(h.get('movementRulesSummary').textContent,/foundation release metadata/);const next=cp(ui.getState().recipe),current=movement.createSource(JSON.parse(before.project)),expected=cp(legacy.project);expected.foundation=manifest.release;
 assert.deepEqual(cp(movement.replay(current,next).project),expected);assert.deepEqual(next.locks,cp(legacy.recipe.locks));assert.deepEqual(next.origins,cp(legacy.recipe.origins));assert.equal(JSON.stringify(legacy.recipe),bytes);assert.equal(ui.getState().migration.version,1);assert.equal(await ui.apply(),true,h.get('movementRulesStatus').textContent);assert.deepEqual(h.json('Forge.services.ProjectStore.capture()'),expected);h.run('undo()');assert.equal(h.run('Forge.services.ProjectStore.serialize()'),before.project);
 const changed=cp(current.project);changed.worldRuntime.moveSpeed=changed.worldRuntime.moveSpeed===4?3:4;await assert.rejects(()=>h.adapter.replayMovement(movement.createSource(changed),legacy.recipe),rejectPattern());const tampered=cp(legacy.recipe);tampered.decisions.jumpSpeed=1;await assert.rejects(()=>h.adapter.replayMovement(current,tampered),rejectPattern());
});

test('Failed historical import retains the established preview and original project/history',async()=>{
 const h=fresh();await open(h,projects[0]);const ui=h.services.MashupUI;assert.equal(ui.captureCurrent(),true);assert.equal(await ui.loadDonors(projects.slice(1).map(project=>file(project,'donor.json'))),true);assert.equal(await ui.loadRecipe(file(recipe)),true);const before=state(h),selected=cp(ui.getState()),bad=cp(recipe);bad.resultSha256='0'.repeat(64);assert.equal(await ui.loadRecipe(file(bad)),false);assert.deepEqual(state(h),before);assert.deepEqual(cp(ui.getState()),selected);
});

(async()=>{const results=[];for(const{name,fn}of tests){const started=Date.now();try{await fn();results.push({name,passed:true,milliseconds:Date.now()-started});console.log('PASS '+name);}catch(error){const message=String(error.stack||error);results.push({name,passed:false,milliseconds:Date.now()-started,error:message});console.error('FAIL '+name+'\n'+message.slice(0,7000));}}const passed=results.filter(item=>item.passed).length,report={suite:'recipe-compatibility',htmlSha256:sha(fs.readFileSync(html)),scope:'Exact historical alpha.10 mashup replay through current ProjectStore open and authoring UI; reviewed foundation-only v1 migration, provenance, source/result tamper refusals, current recipe replay, Apply/Undo/Redo/save-reopen, and shared movement recipe migration. Mock DOM; no browser or hardware acceptance.',passed,failed:results.length-passed,total:results.length,results};const output=process.env.FORGE_TEST_REPORT||process.argv[3];if(output){fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');}console.log(passed+'/'+results.length+' passed');process.exitCode=report.failed?1:0;})();
