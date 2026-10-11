#!/usr/bin/env node
'use strict';
// Executes the full application using the same small DOM harness as the baseline.
// These are data/command/codec tests, not browser layout or real Save As QA.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {loadForge}=require('./harness.cjs'),fixtures=require('./fixtures.cjs');
const {schemaFor,foundationFor}=require('./version-expectations.cjs');
const root=path.resolve(__dirname,'..'),html=path.resolve(process.argv[2]||path.join(root,'mainline/NES_Forge_1.6.6_No_Code_Workflow.html'));
const tests=[],test=(name,fn)=>tests.push({name,fn}),plain=x=>JSON.parse(JSON.stringify(x));
function project(){
  const p=fixtures.composedProject();p.version=7;p.projectName='Entity animation roundtrip';
  p.scenes[0].entities=[{id:'actor-a',type:'player',name:'Scout',x:32,y:48,w:16,h:24,sprTile:1,
    animationBinding:{defaultState:'idle',facing:'left',states:[{state:'idle',animationId:'walk'},{state:'attack',animationId:'walk'}]}},
    {id:'actor-b',type:'npc',name:'Observer',x:88,y:48,w:16,h:24,sprTile:2}];
  p.animations[0].frames[0].hitboxes=[{id:'hitbox-a',name:'Blade — 攻撃',x:-13,y:-20,w:25,h:8}];
  p.animations[0].frames[0].hurtboxes=[{id:'hurtbox-a',name:'Body',x:-4,y:-16,w:8,h:16}];
  p.animations[0].frames[0].events=[{id:'event-a',type:'attack_start',name:'Blade active',value:'blade'},
    {id:'event-b',type:'sound',name:'Swing',value:'音'}];
  p.animations[0].frames[1].hitboxes=[];p.animations[0].frames[1].hurtboxes=[];
  p.animations[0].frames[1].events=[{id:'event-c',type:'attack_end',name:'Blade inactive',value:''}];return p;
}
function fresh(p=project(),target=html){const h=loadForge(target);h.context.fixture=p;h.run('db_deserializeState(fixture);window._buildAndRunMode=true');return h;}
function build(h){const rom=h.run('buildNesRom()',5000);assert.ok(rom instanceof Uint8Array,'ROM failed: '+h.errors.at(-1));h.context.rom=rom;return rom;}
function chunk(h){h.run('window.chunk=Forge164.persistence.encodeAssets(Forge16.build.plan())');return h.run('chunk');}
function resign(h,bytes){h.context.mutated=Uint8Array.from(bytes);return h.run('Forge164.persistence.sign(mutated.slice(13))');}
function addOffset(c){return 13+4+new DataView(c.buffer,c.byteOffset+13,4).getUint32(0,true);}
function mutateTextByte(c,text,delta,value){const at=Buffer.from(c).indexOf(Buffer.from(text));assert.ok(at>=0,'fixture marker '+text);const b=c.slice();b[at+Buffer.byteLength(text)+delta]=value;return b;}
function assertAtomicProject(h,bad){h.run('snapshot();S.projectName="Unsaved changes"');const before=h.json('projectData()'),history=h.run('undoStack.length');h.context.bad=bad;assert.throws(()=>h.run('db_deserializeState(bad)'));assert.deepEqual(h.json('projectData()'),before);assert.equal(h.run('undoStack.length'),history);}
function frameExtras(frame){return {hitboxes:frame.hitboxes,hurtboxes:frame.hurtboxes,events:frame.events};}

test('v7 JSON save/reopen retains entity identities, bindings, all contacts, ordered events and existing assets',()=>{
  const h=fresh(),before=h.json('projectData()');assert.equal(before.version,schemaFor(h));assert.equal(before.foundation,foundationFor(h));
  h.run('window.saved=db_serializeState();S.animations=[];S.metasprites=[];db_deserializeState(saved)');const after=h.json('projectData()');
  for(const key of ['scenes','worlds','metasprites','animations'])assert.deepEqual(after[key],before[key],key);
});
test('Portable ZIP contains independent extension manifest and restores v7 project completely',async()=>{
  const h=fresh(),before=h.json('projectData()');h.run('window.zipBlob=buildZip([{name:"project.json",data:new TextEncoder().encode(db_serializeState())}])');h.context.zip=new Uint8Array(await h.run('zipBlob.arrayBuffer()'));
  const names=h.json('Object.keys(parseZip(zip))');assert.ok(names.includes('metasprites.json'));assert.ok(names.includes('entity-animations.json'));
  assert.equal(h.run('JSON.parse(new TextDecoder().decode(parseZip(zip)["entity-animations.json"].bytes)).version'),1);
  h.run('S.animations=[];S.metasprites=[]');assert.equal(await h.run('loadZipPack(zip)',5000),true);const after=h.json('projectData()');
  for(const key of ['scenes','worlds','metasprites','animations'])assert.deepEqual(after[key],before[key],key);
});
test('Legacy v5 migration supplies stable IDs and empty frame extension arrays without changing graphics',()=>{
  const p=fixtures.project(),h=fresh(p);assert.equal(h.run('projectData().version'),schemaFor(h));assert.ok(h.run('S.animations[0].id'));
  assert.deepEqual(h.json('S.animations[0].frames.map(f=>({tileIdx:f.tileIdx,duration:f.duration}))'),p.animations[0].frames);
  assert.deepEqual(h.json('S.animations[0].frames[0].hitboxes'),[]);assert.deepEqual(h.json('S.animations[0].frames[0].events'),[]);
  const id=h.run('S.animations[0].id');h.run('db_deserializeState(db_serializeState())');assert.equal(h.run('S.animations[0].id'),id);
});
test('Legacy v6 composer migration retains animation and metasprite IDs with scene source associations',()=>{
  const p=fixtures.composedProject(),h=fresh(p);assert.deepEqual(h.json('S.metasprites'),p.metasprites);assert.equal(h.run('S.animations[0].id'),'walk');
  assert.equal(h.run('S.animations[0].frames[0].metaspriteId'),'hero');assert.equal(h.run('S.animations[0].frames[1].sceneId'),'scene-a');
});
for(const [name,change] of [
  ['duplicate entity ID',p=>p.scenes[0].entities[1].id='actor-a'],
  ['missing entity ID',p=>delete p.scenes[0].entities[0].id],
  ['duplicate box ID across hit/hurt kinds',p=>p.animations[0].frames[0].hurtboxes[0].id='hitbox-a'],
  ['fractional box coordinate',p=>p.animations[0].frames[0].hitboxes[0].x=.5],
  ['zero box width',p=>p.animations[0].frames[0].hitboxes[0].w=0],
  ['null box array',p=>p.animations[0].frames[0].hitboxes=null],
  ['null event array',p=>p.animations[0].frames[0].events=null],
  ['null binding',p=>p.scenes[0].entities[0].animationBinding=null],
  ['duplicate event ID',p=>p.animations[0].frames[0].events[1].id='event-a'],
  ['unknown event type',p=>p.animations[0].frames[0].events[0].type='execute'],
  ['event UTF-8 byte overflow',p=>p.animations[0].frames[0].events[0].value='音'.repeat(86)],
  ['invalid binding default',p=>p.scenes[0].entities[0].animationBinding.defaultState='missing'],
  ['duplicate binding state',p=>p.scenes[0].entities[0].animationBinding.states[1].state='idle'],
  ['invalid facing',p=>p.scenes[0].entities[0].animationBinding.facing='up'],
  ['unknown future schema',p=>p.version=999],
])test('Malformed '+name+' rejects before live project/history mutation',()=>{const h=fresh(),bad=project();change(bad);assertAtomicProject(h,bad);});
test('Repairable missing binding source survives project reopen but prevents a ROM build',()=>{
  const p=project();p.scenes[0].entities[0].animationBinding.states[0].animationId='missing';const h=fresh(p);
  h.run('db_deserializeState(db_serializeState());window._buildAndRunMode=true');assert.equal(h.run('S.scenes[0].entities[0].animationBinding.states[0].animationId'),'missing');
  assert.equal(h.run('buildNesRom()'),null);assert.match(h.errors.at(-1),/missing animation/i);assert.equal(h.run('window._lastBuiltRom'),null);
});
test('MS16 v2 encodes all frame extensions and entity binding identities in a bounded signed block',()=>{
  const h=fresh(),c=chunk(h);assert.equal(c[4],2);const d=plain(h.run('Forge164.persistence.decodeAssets(chunk)')),p=project();
  assert.equal(d.version,2);assert.deepEqual(d.animations[0].frames.map(frameExtras),p.animations[0].frames.map(frameExtras));
  assert.deepEqual(d.entities.map(e=>e.id),['actor-a','actor-b']);assert.deepEqual(d.entities[0].animationBinding,p.scenes[0].entities[0].animationBinding);
  assert.deepEqual(d.sceneEntityCounts,[2]);assert.deepEqual([d.entities[1].buildSceneIndex,d.entities[1].entityIndex],[0,1]);
});
test('MS16 preserves empty bindings independently of absent bindings',()=>{
  const p=project();p.scenes[0].entities[0].animationBinding={defaultState:'',facing:'right',states:[]};const h=fresh(p);chunk(h);
  const es=h.json('Forge164.persistence.decodeAssets(chunk).entities');assert.deepEqual(es[0].animationBinding,p.scenes[0].entities[0].animationBinding);assert.equal(es[1].animationBinding,undefined);
});
test('ROM loop flag preserves implicit default looping and explicit stop semantics',()=>{
  const p=project();delete p.animations[0].loop;const h=fresh(p);chunk(h);assert.equal(h.run('Forge164.persistence.decodeAssets(chunk).animations[0].loop'),true);
  h.run('S.animations[0].loop=false');chunk(h);assert.equal(h.run('Forge164.persistence.decodeAssets(chunk).animations[0].loop'),false);
});
test('MS16 v2 stores entity identities when no composer or animation assets exist',()=>{
  const p=project();p.metasprites=[];p.animations=[];delete p.scenes[0].entities[0].animationBinding;const h=fresh(p);build(h);
  const d=h.json('Forge164.persistence.readRomAssets(rom)');assert.equal(d.version,2);assert.equal(d.animations.length,0);assert.equal(d.entities.length,2);
});
test('ROM build scene ordering maps each entity binding to its own scene/entity ordinal',()=>{
  const p=project(),second=fixtures.scene('scene-b');second.name='Second source';second.buildOrder=0;p.scenes[0].buildOrder=1;second.entities=[{id:'actor-c',type:'enemy',name:'Enemy',x:64,y:64,w:8,h:16,sprTile:2,animationBinding:{defaultState:'walk',facing:'right',states:[{state:'walk',animationId:'walk'}]}}];p.scenes.push(second);const h=fresh(p);build(h);
  const es=h.json('Forge164.persistence.readRomAssets(rom).entities');assert.deepEqual(es.map(e=>[e.id,e.buildSceneIndex,e.entityIndex]),[['actor-c',0,0],['actor-a',1,0],['actor-b',1,1]]);
  assert.equal(h.run('importRom(rom,"Ordered.nes")',20000),true,h.errors.join('; '));
  assert.equal(h.run('S.scenes[2].entities[0].name'),'Enemy');assert.equal(h.run('S.scenes[3].entities[0].name'),'Scout');
  assert.equal(h.run('S.scenes[2].entities[0].animationBinding.states[0].animationId===S.animations[1].id'),true);
});
test('Reimport into original project preserves existing assets and rekeys every appended asset/reference',()=>{
  const h=fresh(),before=h.json('projectData()');build(h);assert.equal(h.run('importRom(rom,"Bound.nes")',20000),true,h.errors.join('; '));const after=h.json('projectData()');
  assert.deepEqual(after.scenes[0],before.scenes[0]);assert.deepEqual(after.animations[0],before.animations[0]);assert.deepEqual(after.metasprites[0],before.metasprites[0]);
  assert.notEqual(after.animations[1].id,after.animations[0].id);assert.notEqual(after.scenes[1].entities[0].id,after.scenes[0].entities[0].id);
  assert.equal(after.scenes[1].entities[0].animationBinding.states[0].animationId,after.animations[1].id);assert.equal(after.animations[1].frames[0].metaspriteId,after.metasprites[1].id);
  assert.equal(after.animations[1].frames[1].sceneId,after.scenes[1].id);assert.equal(after.metasprites[1].sceneId,after.scenes[1].id);
  const imported=after.animations[1].frames[0],source=before.animations[0].frames[0];
  for(const key of ['hitboxes','hurtboxes','events']){assert.notEqual(imported[key][0].id,source[key][0].id);assert.deepEqual(imported[key].map(({id,...x})=>x),source[key].map(({id,...x})=>x));}
  assert.equal(new Set(after.scenes.flatMap(sc=>sc.entities.map(e=>e.id))).size,4);
});
test('Older MS16 v1 ROM imports into 1.6.4 with normalized frame extensions',()=>{
  const baseline=path.join(root,'baseline','NES_Forge_1.6.3_Metasprite_Composer.html'),old=fresh(fixtures.composedProject(),baseline),rom=build(old),h=fresh();h.context.rom=rom;
  assert.equal(h.run('importRom(rom,"Legacy v1.nes")',20000),true,h.errors.join('; '));assert.equal(h.run('S.animations.length'),2);
  assert.deepEqual(h.json('S.animations[1].frames[0].hitboxes'),[]);assert.deepEqual(h.json('S.animations[1].frames[0].events'),[]);
});
test('MS16 checksum and outer size reject byte corruption and truncation',()=>{
  const h=fresh(),c=chunk(h),bad=c.slice();bad[bad.length-1]^=1;h.context.bad=bad;assert.throws(()=>h.run('Forge164.persistence.decodeAssets(bad)'),/checksum/i);
  assert.throws(()=>h.run('Forge164.persistence.decodeAssets(chunk.slice(0,-1))'),/length/i);
});
for(const [name,mutate,match] of [
  ['animation count mismatch',(c)=>{const b=c.slice();b[addOffset(c)]=2;return b;},/animation extension count/],
  ['frame count mismatch',(c)=>{const b=c.slice();b[addOffset(c)+2]=9;return b;},/frame extension count/],
  ['box count overflow',(c)=>{const b=c.slice();b[addOffset(c)+4]=17;return b;},/box count/],
  ['unknown event type',c=>mutateTextByte(c,'event-a',0,9),/event type/],
  ['invalid UTF-8',c=>{const b=c.slice(),at=Buffer.from(c).indexOf(Buffer.from('hitbox-a'));b[at]=255;return b;},/encoded data|encoding|utf-8/i],
  ['duplicate entity ID',c=>{const b=c.slice(),at=Buffer.from(c).indexOf(Buffer.from('actor-b'));b[at+6]=97;return b;},/duplicate entity/i],
  ['unresolved bound animation index',c=>{const b=c.slice(),at=Buffer.from(c).lastIndexOf(Buffer.from('attack'));b[at+6]=255;b[at+7]=255;return b;},/animation index/],
])test('Rechecksummed malformed v2 '+name+' is structurally rejected',()=>{const h=fresh(),c=chunk(h);h.context.bad=resign(h,mutate(c));assert.throws(()=>h.run('Forge164.persistence.decodeAssets(bad)'),match);});
test('Rechecksummed trailing extension bytes reject before any ROM import mutation',()=>{
  const h=fresh(),rom=build(h),at=Buffer.from(rom).indexOf(Buffer.from('MS16')),length=new DataView(rom.buffer,rom.byteOffset+at+5,4).getUint32(0,true)+13;
  const data=Uint8Array.from([...rom.slice(at+13,at+length),99]);h.context.extraData=data;const bad=h.run('Forge164.persistence.sign(extraData)'),badRom=rom.slice();badRom.set(bad,at);
  const marker=16+0xFF0,oldLength=badRom[marker+12]|badRom[marker+13]<<8;badRom[marker+12]=(oldLength+1)&255;badRom[marker+13]=(oldLength+1)>>8;
  h.run('snapshot();S.projectName="Unsaved"');const before=h.json('projectData()'),history=h.run('undoStack.length');h.context.badRom=badRom;
  assert.equal(h.run('importRom(badRom,"Trailing.nes")',10000),false);assert.match(h.errors.at(-1),/trailing/i);assert.deepEqual(h.json('projectData()'),before);assert.equal(h.run('undoStack.length'),history);
});
test('Rechecksummed entity table mismatch with NFEX rejects before project/history mutation',()=>{
  const h=fresh(),rom=build(h),at=Buffer.from(rom).indexOf(Buffer.from('NFEX'));assert.ok(at>=0);const b=rom.slice(),ro=b[at+8]|b[at+9]<<8;
  // NFEX name starts after fifteen fixed bytes, followed by the entity count.
  b[at+ro+16+b[at+ro+15]]=1;h.context.badRom=b;h.run('snapshot()');const before=h.json('projectData()'),history=h.run('undoStack.length');
  assert.equal(h.run('importRom(badRom,"Mismatch.nes")',10000),false);assert.match(h.errors.at(-1),/does not match/i);assert.deepEqual(h.json('projectData()'),before);assert.equal(h.run('undoStack.length'),history);
});
test('Excluded animation source and exhausted metadata capacity fail with no stale ROM',()=>{
  const p=project(),excluded=fixtures.scene('excluded');excluded.buildInclude=false;p.scenes.push(excluded);p.animations[0].frames[1].sceneId='excluded';const h=fresh(p);
  assert.equal(h.run('buildNesRom()'),null);assert.match(h.errors.at(-1),/excluded/i);
  h.run('S.animations[0].frames[1].sceneId="scene-a";S.animations[0].frames[0].events=Array.from({length:16},(_,i)=>({id:"capacity-"+i,type:"custom",name:"Long marker",value:"x".repeat(255)}));window._lastBuiltRom=new Uint8Array([1])');
  assert.equal(h.run('buildNesRom()',5000),null);assert.match(h.errors.at(-1),/space|capacity/i);assert.equal(h.run('window._lastBuiltRom'),null);
});

(async()=>{const results=[];for(const {name,fn} of tests){const start=Date.now();try{await fn();results.push({name,passed:true,milliseconds:Date.now()-start});process.stdout.write('PASS '+name+'\n');}catch(error){results.push({name,passed:false,milliseconds:Date.now()-start,error:error.stack});process.stdout.write('FAIL '+name+'\n  '+error.message+'\n');}}
const passed=results.filter(x=>x.passed).length,report={html:path.basename(html),scope:'1.6.4 full-script schema v7/ZIP/MS16 v2 and legacy v1 preservation, identity remapping, malformed input atomicity, and capacity rejection; Node VM with mock DOM.',passed,failed:results.length-passed,total:results.length,results};if(process.env.FORGE_TEST_REPORT)fs.writeFileSync(process.env.FORGE_TEST_REPORT,JSON.stringify(report,null,2)+'\n');process.stdout.write('\n'+passed+'/'+results.length+' passed\n');process.exitCode=passed===results.length?0:1;})();
