#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {loadForge}=require('./harness.cjs'),{loadStoredForge,settle}=require('./storage-harness167.cjs');
const {project,scene}=require('./fixtures.cjs');
const root=path.resolve(__dirname,'..'),html=path.resolve(process.argv[2]||path.join(root,JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'))).output));
const baseline=path.join(root,'baseline/NES_Forge_1.6.6_Visual_Workspace.html');
const tests=[],test=(name,fn)=>tests.push({name,fn}),cp=value=>JSON.parse(JSON.stringify(value));
async function fresh(){const h=loadStoredForge(html);await settle();assert.ok(h.context.Forge?.services?.ProjectStore,'Candidate must expose the production ProjectStore service');assert.deepEqual(h.errors,[]);return h;}
function state(h){return h.json('({project:projectData(),identity:S.projectId,undo:undoStack,redo:redoStack,undoBytes,epoch:Forge.services.ProjectStore.state.epoch,runtime:{loaded:emu.loaded,running:emu.running,frame:emu.frameCount,name:emu.romName}})');}
function fixture(h,data=project()){h.context.input=data;assert.equal(h.run('db_deserializeState(input)'),true);return data;}
function rejected(h,input,pattern){h.context.input=input;const before=state(h);assert.throws(()=>h.run('db_deserializeState(input)'),pattern);assert.deepEqual(state(h),before);}
function count(h,names){h.context.names=names;h.run(`window.calls167={};window.originals167={};for(const name of names){originals167[name]=Forge.services.ProjectStore[name];calls167[name]=0;Forge.services.ProjectStore[name]=function(...args){calls167[name]++;return originals167[name].apply(this,args);};}`);}

test('Schema 12 is the actual portable output and explicit schema downgrade is rejected',async()=>{
  const h=await fresh();fixture(h);assert.equal(h.run('Forge.services.ProjectStore.schema'),12);assert.equal(h.run('projectData().version'),12);assert.equal(h.run('JSON.parse(db_serializeState()).version'),12);
  assert.equal(h.run('projectData().foundation'),'2.0.0-alpha.10');const before=state(h);
  for(const targetVersion of [8,9,10]){
    h.context.targetVersion=targetVersion;
    assert.throws(()=>h.run('Forge.services.ProjectStore.capture({targetVersion})'),/downgrade|schema|version/i);
    assert.throws(()=>h.run('Forge.services.ProjectStore.serialize({targetVersion})'),/downgrade|schema|version/i);assert.deepEqual(state(h),before);
  }
});
test('Actual frozen 1.6.6 loses the v8 unresolved cell but rejects the current-schema snapshot atomically',async()=>{
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(baseline)).digest('hex'),'d9e3c44d0349e50cca1be800a630486bba1ad9584623c99a81f84bf058df33cb');
  const h=await fresh(),p=project();p.worlds[0].map[0]=254;fixture(h,p);const saved=h.json('projectData()');
  const old=loadForge(baseline);old.context.input={...saved,version:8};old.run('db_deserializeState(input)');assert.equal(old.run('S.worlds[0].map[0]'),-1,'This is the real prior data-loss behavior, not a mock old reader');
  const before=old.json('({project:projectData(),undo:undoStack,redo:redoStack,id:S.projectId})');old.context.input=saved;assert.throws(()=>old.run('db_deserializeState(input)'),/newer|version/i);assert.deepEqual(old.json('({project:projectData(),undo:undoStack,redo:redoStack,id:S.projectId})'),before);
});
test('Legacy through v11 project inputs migrate to v12 with Gameplay Core disabled and without modifying input objects',async()=>{
  const h=await fresh();for(const version of [undefined,1,2,3,4,5,6,7,8,9,10,11]){const p=project();if(version===undefined)delete p.version;else p.version=version;if(version>=6)p.animations.forEach((a,i)=>a.id='legacy-animation-'+i);if(version>=8)p.gameplay=h.json('Forge165.config.defaults()');const before=cp(p);fixture(h,p);assert.equal(h.run('projectData().version'),12);assert.equal(h.run('projectData().worldRuntime.enabled'),false);assert.equal(h.run('projectData().audioRuntime.enabled'),false);assert.equal(h.run('projectData().gameplayCore.enabled'),false);assert.deepEqual(p,before);assert.equal(h.run('S.scenes[0].id'),'scene-a');}
});
for(const version of [0,-1,3.5,'8','future',null,{}])test('Malformed or unsupported schema '+JSON.stringify(version)+' rejects before mutation',async()=>{const h=await fresh();fixture(h);h.run('snapshot();S.projectName="Current edit";S.projectId=74;emu.loaded=true;emu.running=true;emu.frameCount=17');rejected(h,{...h.json('projectData()'),version},/version|schema/i);});
test('The next unsupported schema rejects before mutation',async()=>{const h=await fresh();fixture(h);h.run('snapshot();S.projectName="Current edit";S.projectId=74;emu.loaded=true;emu.running=true;emu.frameCount=17');rejected(h,{...h.json('projectData()'),version:h.run('Forge.services.ProjectStore.schema')+1},/version|schema/i);});
test('Unsupported extension declarations reject before project mutation',async()=>{const h=await fresh();fixture(h);for(const [key,value] of [['romLayout',5],['worldAuthoring',4],['metatileExtension',2],['metaspriteExtension',3],['entityAnimationExtension',2],['romLayout','3']])rejected(h,{...h.json('projectData()'),[key]:value},/version|unsupported/i);});
test('Duplicate scene identities reject before runtime, history, project or lifecycle mutation',async()=>{const h=await fresh();fixture(h);const p=h.json('projectData()');p.scenes.push({...cp(p.scenes[0]),name:'Alias with duplicate ID'});rejected(h,p,/duplicate|unique/i);});
test('Duplicate world and nested room identities reject atomically',async()=>{const h=await fresh();fixture(h);for(const mutate of [p=>p.worlds.push(cp(p.worlds[0])),p=>p.worlds[0].rooms.push(cp(p.worlds[0].rooms[0]))]){const p=h.json('projectData()');mutate(p);rejected(h,p,/duplicate|unique/i);}});
test('Pure preparation validates detached input without committing an active editor mirror',async()=>{
  const h=await fresh();fixture(h);h.run('S.nt[2]=123;S.chr[2][0][0]=3');const before=h.json('({nt:S.nt,chr:S.chr,scenes:S.scenes,undo:undoStack,epoch:Forge.services.ProjectStore.state.epoch})');h.context.input=project();h.run('window.prepared167=Forge.services.ProjectStore.prepareLoad(input)');assert.deepEqual(h.json('({nt:S.nt,chr:S.chr,scenes:S.scenes,undo:undoStack,epoch:Forge.services.ProjectStore.state.epoch})'),before);h.context.input.projectName='Mutated original';h.run('Forge.services.ProjectStore.commit(prepared167)');assert.equal(h.run('S.projectName'),'Regression fixture');
});
test('Authoritative capture includes live scene edits and returns detached project data',async()=>{
  const h=await fresh();const p=project();p.scenes.push(scene('other-scene'));p.activeScene=1;fixture(h,p);h.run('S.nt[3]=17;S.chr[17][2][4]=3;S.sprChr[4][5][6]=2;S.tileProps[17]=1;document.getElementById("codeInput").value="; retained author ASM"');const saved=h.json('projectData()');assert.equal(saved.scenes[1].nt[3],17);assert.equal(saved.scenes[1].chr[17][2][4],3);assert.equal(saved.scenes[1].sprChr[4][5][6],2);assert.equal(saved.scenes[1].tileProps[17],1);assert.equal(saved.asmSource,'; retained author ASM');assert.notEqual(saved.scenes[0].nt[3],17);h.context.saved=saved;h.run('saved.scenes[1].nt[3]=99');assert.equal(h.run('S.nt[3]'),17);
});
test('Unresolved authored world map and destinations survive save/open and history round trips',async()=>{
  const h=await fresh(),p=project();p.worlds[0].map[0]=254;p.worlds[0].markers[0].targetWorldId='missing-world';p.worlds[0].markers[0].targetMarkerId='missing-entrance';fixture(h,p);const worlds=h.json('S.worlds');h.run('window.saved167=db_serializeState();db_deserializeState(saved167)');assert.deepEqual(h.json('S.worlds'),worlds);h.run('snapshot();S.worlds[0].map[0]=253;undo()');assert.equal(h.run('S.worlds[0].map[0]'),254);h.run('redo()');assert.equal(h.run('S.worlds[0].map[0]'),253);
});
test('Global capture, serialization and load entrypoints route to the authoritative service exactly once',async()=>{
  const h=await fresh();count(h,['capture','serialize','load','prepareLoad','commit']);h.run('projectData()');assert.equal(h.run('calls167.capture'),1);h.run('calls167.capture=0;db_serializeState()');assert.equal(h.run('calls167.serialize'),1);assert.equal(h.run('calls167.capture'),1);h.context.input=project();h.run('db_deserializeState(input)');for(const method of ['load','prepareLoad','commit'])assert.equal(h.run('calls167.'+method),1,method+' is one authoritative route');
});
test('Ordinary load clears history; native replacement records exactly one boundary and one commit',async()=>{
  const h=await fresh();fixture(h);h.run('snapshot();S.projectName="Edit 1";snapshot();S.projectName="Edit 2";S.projectId=99');count(h,['load','prepareLoad','commit']);const epoch=h.run('Forge.services.ProjectStore.state.epoch'),depth=h.run('undoStack.length');h.run('Forge166.project.create("blank")');assert.equal(h.run('calls167.commit'),1);assert.equal(h.run('Forge.services.ProjectStore.state.epoch'),epoch+1);assert.equal(h.run('undoStack.length'),depth+1);assert.equal(h.run('S.projectId'),null);assert.equal(h.run('S.gameplay.mode'),'single-room');h.run('undo()');assert.equal(h.run('S.projectName'),'Edit 2');assert.equal(h.run('S.projectId'),null);h.run('redo()');assert.equal(h.run('S.gameplay.mode'),'single-room');h.context.input=project();h.run('db_deserializeState(input)');assert.equal(h.run('undoStack.length'),0);assert.equal(h.run('redoStack.length'),0);
});
test('Ordinary history replay preserves emulator and browser identity while using ProjectStore commit',async()=>{
  const h=await fresh();fixture(h);h.run('S.projectId=31;emu.loaded=true;emu.running=true;emu.frameCount=22;snapshot();S.nt[0]=42');count(h,['commit']);h.run('undo()');assert.equal(h.run('calls167.commit'),1);assert.deepEqual(h.json('({id:S.projectId,loaded:emu.loaded,running:emu.running,frame:emu.frameCount})'),{id:31,loaded:true,running:true,frame:22});h.run('redo()');assert.equal(h.run('calls167.commit'),2);assert.equal(h.run('S.nt[0]'),42);
});
test('Production Scout creation is rejected and an external Scout file remains an ordinary project',async()=>{
  const h=await fresh(),before=state(h);assert.throws(()=>h.run('Forge166.project.create("scout")'),/blank|example|starter|unsupported/i);assert.deepEqual(state(h),before);const file=path.join(root,'examples/Scout_Authored_in_Editor_1.6.6.nesforge.json');fixture(h,JSON.parse(fs.readFileSync(file,'utf8')));assert.equal(h.run('S.scenes.length'),1);assert.equal(h.run('S.metasprites.length'),4);assert.equal(h.run('S.animations.length'),4);
});
async function bounded(fn){let timer;try{return await Promise.race([fn(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Controlled storage test did not settle within 10 seconds')),10000);})]);}finally{clearTimeout(timer);}}
(async()=>{const results=[];for(const {name,fn}of tests){const start=Date.now();try{await bounded(fn);results.push({name,passed:true,milliseconds:Date.now()-start});console.log('PASS '+name);}catch(error){results.push({name,passed:false,error:error.stack});console.log('FAIL '+name+'\n'+error.message);}}const passed=results.filter(result=>result.passed).length,report={suite:'project-store167',scope:'Full production application VM with mock DOM: authoritative service routing, v10 preservation with disabled legacy World Runtime migration and actual frozen-1.6.6 downgrade rejection, atomic loading and history intent. Not a real browser test.',passed,total:results.length,results};const output=process.env.FORGE_TEST_REPORT||process.argv[3];if(output)fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(passed+'/'+results.length+' passed');process.exitCode=passed===results.length?0:1;})();
