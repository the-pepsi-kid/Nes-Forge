#!/usr/bin/env node
'use strict';
// Contract tests against the full release, using the original VM harness. No
// implementation is copied into these tests, and no browser QA is implied.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {loadForge} = require('./harness.cjs');
const fixtures = require('./fixtures.cjs');
const {schemaFor} = require('./version-expectations.cjs');
const htmlPath = path.resolve(process.argv[2] || path.join(__dirname,'..',JSON.parse(fs.readFileSync(path.join(__dirname,'../source-manifest.json'))).output));
const tests=[];
const test=(name,fn)=>tests.push({name,fn});
const plain=x=>JSON.parse(JSON.stringify(x));
function project() {
  const p=fixtures.composedProject(); p.version=7;
  p.scenes[0].entities=[{id:'entity-player',name:'Scout',type:'player',x:40,y:80,animationBinding:{defaultState:'walk',facing:'right',states:[{state:'walk',animationId:'walk'}]}}];
  p.animations[0].frames.forEach((f,i)=>Object.assign(f,{hitboxes:[],hurtboxes:[{id:'hurt-'+i,name:'Body',x:-3,y:-12,w:6,h:12}],events:[]}));
  p.animations.push({id:'idle',name:'Idle',state:'idle',loop:true,frames:[{tileIdx:1,duration:4,hitboxes:[],hurtboxes:[],events:[]}]});
  return p;
}
function fresh(p=project()) {
  const h=loadForge(htmlPath); h.context.fixture=p;
  h.run('db_deserializeState(fixture);window.M=Forge164.model;window._buildAndRunMode=true;S.selEntity=0;M.ensure()');
  return h;
}
function atomic(h,source,pattern) {
  const before=h.json('projectData()'),undo=h.run('undoStack.length'),redo=h.run('redoStack.length');
  if(pattern)assert.throws(()=>h.run(source),pattern);else assert.throws(()=>h.run(source));
  assert.deepEqual(h.json('projectData()'),before,'invalid edit changed authored data');
  assert.equal(h.run('undoStack.length'),undo,'invalid edit added undo');
  assert.equal(h.run('redoStack.length'),redo,'invalid edit changed redo');
}
function invalidProject(name,mutate,options='{}') {
  test(name,()=>{const h=fresh(),p=project();mutate(p);h.context.bad=p;const raw=JSON.stringify(p);atomic(h,'M.validateProject(bad,'+options+')');assert.equal(JSON.stringify(p),raw,'validator mutated input');});
}
function timeline(h,loop=true) {
  h.context.timeline={id:'timing',loop,frames:[2,3,1].map((duration,i)=>({tileIdx:1,duration,hitboxes:[],hurtboxes:[],events:[{id:'e'+i,type:'custom',name:'Frame '+i,value:String(i)}]}))};
}

test('v7 model APIs and canonical project version are available',()=>{
  const h=fresh();assert.equal(h.run('projectData().version'),schemaFor(h));
  for(const key of ['uid','ensure','animation','entity','selectedEntity','validateProject','assignState','removeState','setBinding','addBox','updateBox','removeBox','addEvent','updateEvent','removeEvent','moveEvent','frameAt','eventsBetween','bounds','drawFrame','resolveEntity'])assert.equal(typeof h.context.Forge164.model[key],'function',key);
});
test('Legacy project migration supplies independent frame arrays and stable IDs',()=>{
  const p=fixtures.project();p.scenes[0].entities=[{name:'Legacy object',type:'enemy',x:3,y:5}];
  const h=fresh(p);assert.ok(h.run('S.animations[0].id'));assert.ok(h.run('S.scenes[0].entities[0].id'));
  assert.equal(h.run('S.animations[0].frames.every(f=>Array.isArray(f.hitboxes)&&Array.isArray(f.hurtboxes)&&Array.isArray(f.events))'),true);
  assert.equal(h.run('S.animations[0].frames[0].hitboxes!==S.animations[0].frames[0].hurtboxes&&S.animations[0].frames[0].events!==S.animations[0].frames[1].events'),true);
  const before=h.json('[S.animations,S.scenes[0].entities]');h.run('M.ensure();M.ensure();db_deserializeState(db_serializeState());M.ensure()');assert.deepEqual(h.json('[S.animations,S.scenes[0].entities]'),before);
});
test('Ensure preserves authored values and existing animation/entity identities',()=>{
  const h=fresh();h.run('window.savedAnim=S.animations[0];window.savedEntity=S.scenes[0].entities[0];window.savedFrame=S.animations[0].frames[0];savedFrame.hurtboxes[0].x=-2048;savedFrame.events.push({id:"kept",type:"custom",name:"界",value:"value"});M.ensure()');
  assert.equal(h.run('savedAnim===S.animations[0]&&savedEntity===S.scenes[0].entities[0]&&savedFrame===S.animations[0].frames[0]'),true);
  assert.equal(h.run('savedFrame.hurtboxes[0].x'),-2048);assert.equal(h.run('savedFrame.events[0].id'),'kept');
  assert.equal(h.run('savedAnim.id'),'walk');assert.equal(h.run('savedEntity.id'),'entity-player');
});
test('Lookup helpers return live selected entity and explicit misses',()=>{
  const h=fresh();assert.equal(h.run('M.animation("walk")===S.animations[0]'),true);assert.equal(h.run('M.entity("scene-a","entity-player")===S.scenes[0].entities[0]'),true);assert.equal(h.run('M.selectedEntity()===S.scenes[0].entities[0]'),true);
  assert.ok(!h.run('M.animation("absent")'));assert.ok(!h.run('M.entity("absent","entity-player")'));h.run('S.selEntity=-1');assert.equal(h.run('M.selectedEntity()'),null);
});
test('UID generation remains unique across repeated requests',()=>{
  const h=fresh();const ids=h.json('Array.from({length:500},()=>M.uid("event"))');assert.equal(new Set(ids).size,500);assert.ok(ids.every(id=>typeof id==='string'&&id.length>0));
});
test('Duplicating a scene regenerates global entity IDs and preserves animation assignments',()=>{
  const h=fresh();h.run('dupScene();M.ensure()');
  assert.equal(h.run('S.scenes.length'),2);assert.notEqual(h.run('S.scenes[0].entities[0].id'),h.run('S.scenes[1].entities[0].id'));
  assert.deepEqual(h.json('S.scenes[1].entities[0].animationBinding'),h.json('S.scenes[0].entities[0].animationBinding'));
  assert.equal(h.run('M.validateProject(projectData(),{references:true})'),true);
  h.run('undo()');assert.equal(h.run('S.scenes.length'),1);h.run('redo()');assert.equal(h.run('S.scenes.length'),2);assert.equal(h.run('M.validateProject(projectData(),{references:true})'),true);
});
test('The legacy animation creation command supplies a stable new ID and normalized frame arrays',()=>{
  const h=fresh();h.run('anim_add();M.ensure()');assert.equal(h.run('S.animations.length'),3);const id=h.run('S.animations[2].id');assert.ok(id);assert.notEqual(id,'walk');assert.notEqual(id,'idle');
  assert.equal(h.run('S.animations[2].frames.every(f=>Array.isArray(f.hitboxes)&&Array.isArray(f.hurtboxes)&&Array.isArray(f.events))'),true);
  h.run('M.ensure();db_deserializeState(db_serializeState())');assert.equal(h.run('S.animations[2].id'),id);
});
test('A new state retains live entity identity, resolves animation and supports undo/redo',()=>{
  const h=fresh();h.run('window.savedEntity=M.selectedEntity();M.assignState(savedEntity,"idle","idle")');
  assert.equal(h.run('savedEntity===M.selectedEntity()'),true);assert.deepEqual(h.json('savedEntity.animationBinding.states'),[{state:'walk',animationId:'walk'},{state:'idle',animationId:'idle'}]);
  assert.equal(h.run('M.resolveEntity(savedEntity,"idle").animation===M.animation("idle")'),true);
  h.run('undo()');assert.equal(h.run('M.selectedEntity().animationBinding.states.length'),1);h.run('redo()');assert.equal(h.run('M.selectedEntity().animationBinding.states.length'),2);
});
test('Reassigning an existing state updates one mapping without duplicate names',()=>{
  const h=fresh();h.run('M.assignState(M.selectedEntity(),"walk","idle")');assert.deepEqual(h.json('M.selectedEntity().animationBinding.states'),[{state:'walk',animationId:'idle'}]);assert.equal(h.run('M.resolveEntity(M.selectedEntity()).animation.id'),'idle');
});
test('Setting default state/facing updates preview resolution and undo restores binding',()=>{
  const h=fresh();h.run('M.assignState(M.selectedEntity(),"idle","idle");M.setBinding(M.selectedEntity(),"defaultState","idle");M.setBinding(M.selectedEntity(),"facing","left")');
  assert.equal(h.run('M.resolveEntity(M.selectedEntity()).state'),'idle');assert.equal(h.run('M.selectedEntity().animationBinding.facing'),'left');h.run('undo()');assert.equal(h.run('M.selectedEntity().animationBinding.facing'),'right');
});
test('Removing a default mapping leaves a valid default and removing all leaves an empty binding',()=>{
  const h=fresh();h.run('M.assignState(M.selectedEntity(),"idle","idle");M.removeState(M.selectedEntity(),"walk")');
  const binding=h.json('M.selectedEntity().animationBinding');assert.equal(binding.states.length,1);assert.ok(binding.defaultState===''||binding.defaultState==='idle');assert.equal(h.run('M.validateProject(projectData())'),true);
  h.run('M.removeState(M.selectedEntity(),"idle")');assert.deepEqual(h.json('M.selectedEntity().animationBinding.states'),[]);assert.equal(h.run('M.selectedEntity().animationBinding.defaultState'),'');
});
test('Missing animation references are preserved for repair and explicitly reported',()=>{
  const p=project();p.scenes[0].entities[0].animationBinding.states[0].animationId='missing-animation';const h=fresh(p);
  assert.equal(h.run('M.validateProject(projectData())'),true);assert.match(h.run('M.resolveEntity(M.selectedEntity()).error'),/missing|unresolved/i);
  atomic(h,'M.validateProject(projectData(),{references:true})');assert.equal(h.run('M.selectedEntity().animationBinding.states[0].animationId'),'missing-animation');
});
test('Unbound entity and unknown state return visible errors instead of a silent fallback',()=>{
  const h=fresh();assert.ok(h.run('M.resolveEntity(M.selectedEntity(),"attack").error'));h.run('delete M.selectedEntity().animationBinding');assert.ok(h.run('M.resolveEntity(M.selectedEntity()).error'));
});
for(const state of ['Walk','9walk','two words','a'.repeat(33),''])test('State assignment rejects invalid state name '+JSON.stringify(state)+' atomically',()=>{
  const h=fresh();h.context.badState=state;atomic(h,'M.assignState(M.selectedEntity(),badState,"walk")');
});
for(const [key,value] of [['defaultState','unknown'],['facing','up'],['defaultState',9],['unknown','right']])test('Binding edit rejects '+key+'='+JSON.stringify(value)+' atomically',()=>{
  const h=fresh();h.context.key=key;h.context.value=value;atomic(h,'M.setBinding(M.selectedEntity(),key,value)');
});
invalidProject('Validation rejects duplicate animation IDs',p=>p.animations[1].id='walk');
invalidProject('Validation rejects entity IDs duplicated across scenes',p=>{const s=fixtures.scene('scene-b');s.entities=[{...p.scenes[0].entities[0]}];p.scenes.push(s);});
invalidProject('Validation rejects duplicate binding state names',p=>p.scenes[0].entities[0].animationBinding.states.push({state:'walk',animationId:'idle'}));
invalidProject('Validation rejects more than sixteen binding states',p=>{const b=p.scenes[0].entities[0].animationBinding;b.states=Array.from({length:17},(_,i)=>({state:'state_'+i,animationId:'walk'}));b.defaultState='state_0';});

test('Hitbox and hurtbox edits preserve independent kinds and live frame/box identity',()=>{
  const h=fresh();h.run('window.frame=S.animations[0].frames[0];window.hit=M.addBox("walk",0,"hitboxes",{name:"Punch",x:3,y:-8,w:9,h:5});window.hurt=frame.hurtboxes[0];M.updateBox("walk",0,"hitboxes",hit.id,{x:7})');
  assert.equal(h.run('frame===S.animations[0].frames[0]&&hit===frame.hitboxes[0]&&hurt===frame.hurtboxes[0]'),true);assert.equal(h.run('hit.x'),7);assert.equal(h.run('hurt.x'),-3);
  const ids=h.json('[hit.id,hurt.id]');assert.equal(new Set(ids).size,2);
});
test('Box add/update/remove are separate undoable edits with full geometry restoration',()=>{
  const h=fresh();const before=h.json('S.animations[0].frames[0]');h.run('window.box=M.addBox("walk",0,"hitboxes",{x:8,y:-5,w:4,h:6});M.updateBox("walk",0,"hitboxes",box.id,{x:9});M.removeBox("walk",0,"hitboxes",box.id)');
  assert.equal(h.run('S.animations[0].frames[0].hitboxes.length'),0);h.run('undo()');assert.equal(h.run('S.animations[0].frames[0].hitboxes[0].x'),9);h.run('undo()');assert.equal(h.run('S.animations[0].frames[0].hitboxes[0].x'),8);h.run('undo()');assert.deepEqual(h.json('S.animations[0].frames[0]'),before);h.run('redo()');assert.equal(h.run('S.animations[0].frames[0].hitboxes.length'),1);
});
for(const [key,value] of [['x',-2049],['x',2048],['x',1.25],['y',-2049],['y',2048],['w',0],['w',2049],['h',-1],['h',2049],['name','界'.repeat(86)]])test('Invalid box '+key+'='+String(value).slice(0,35)+' is atomic',()=>{
  const h=fresh();h.context.patch={[key]:value};atomic(h,'M.updateBox("walk",0,"hurtboxes","hurt-0",patch)');
});
test('Box geometry accepts documented signed coordinate and dimension endpoints',()=>{
  const h=fresh();h.run('M.updateBox("walk",0,"hurtboxes","hurt-0",{x:-2048,y:2047,w:2048,h:1})');assert.deepEqual(h.json('S.animations[0].frames[0].hurtboxes[0]'),{id:'hurt-0',name:'Body',x:-2048,y:2047,w:2048,h:1});
});
test('Adding a seventeenth box of either kind rejects without changing frame or history',()=>{
  // This setup performs 31 complete application edits/notifications. Give that
  // deliberately batched preparation more time than an individual command.
  const h=fresh();h.run('for(let i=0;i<16;i++)M.addBox("walk",0,"hitboxes",{x:i});for(let i=1;i<16;i++)M.addBox("walk",0,"hurtboxes",{x:i})',10000);atomic(h,'M.addBox("walk",0,"hitboxes")');atomic(h,'M.addBox("walk",0,"hurtboxes")');
});
test('Invalid animation/frame/kind cannot create boxes or history entries',()=>{
  const h=fresh();for(const source of ['M.addBox("absent",0,"hitboxes")','M.addBox("walk",999,"hitboxes")','M.addBox("walk",0,"collision")'])atomic(h,source);
});
invalidProject('Box IDs must be unique across hitboxes and hurtboxes in the same frame',p=>p.animations[0].frames[0].hitboxes=[{...p.animations[0].frames[0].hurtboxes[0]}]);
invalidProject('Malformed box arrays fail validation without normalization',p=>p.animations[0].frames[0].hitboxes={});
invalidProject('Non-string box IDs fail validation',p=>p.animations[0].frames[0].hurtboxes[0].id=9);

test('Event creation, update, ordering and removal preserve ordered data with undo/redo',()=>{
  const h=fresh();h.run('window.first=M.addEvent("walk",0,{type:"attack_start",name:"Start",value:"punch"});window.second=M.addEvent("walk",0,{type:"sound",name:"Punch",value:"sfx_punch"});M.updateEvent("walk",0,first.id,{name:"Attack active"});M.moveEvent("walk",0,second.id,-1)');
  assert.deepEqual(h.json('S.animations[0].frames[0].events.map(e=>e.name)'),['Punch','Attack active']);assert.equal(h.run('S.animations[0].frames[0].events[1]===first'),true);
  h.run('M.removeEvent("walk",0,first.id)');assert.equal(h.run('S.animations[0].frames[0].events.length'),1);h.run('undo()');assert.equal(h.run('S.animations[0].frames[0].events.length'),2);h.run('redo()');assert.equal(h.run('S.animations[0].frames[0].events.length'),1);
});
for(const type of ['attack_start','attack_end','footstep','sound','custom'])test('Documented event type '+type+' is accepted and retained',()=>{
  const h=fresh();h.context.eventType=type;h.run('M.addEvent("walk",0,{type:eventType,name:"界",value:"café"})');assert.equal(h.run('S.animations[0].frames[0].events[0].type'),type);assert.equal(h.run('S.animations[0].frames[0].events[0].value'),'café');
});
for(const [key,value] of [['type','execute'],['type',null],['name','界'.repeat(86)],['value','界'.repeat(86)],['value',4]])test('Invalid event '+key+'='+String(value).slice(0,35)+' is atomic',()=>{
  const h=fresh();h.run('window.event=M.addEvent("walk",0,{type:"custom",name:"Existing",value:"value"})');h.context.patch={[key]:value};atomic(h,'M.updateEvent("walk",0,event.id,patch)');
});
test('UTF-8 event text accepts 255 bytes and rejects the next byte',()=>{
  const h=fresh();h.run('window.e=M.addEvent("walk",0,{type:"custom",name:"界".repeat(85),value:"x".repeat(255)})');assert.equal(h.run('new TextEncoder().encode(e.name).length'),255);atomic(h,'M.updateEvent("walk",0,e.id,{value:e.value+"x"})');
});
test('A seventeenth frame event rejects without changing frame or history',()=>{
  const h=fresh();h.run('for(let i=0;i<16;i++)M.addEvent("walk",0,{name:"Event "+i})');atomic(h,'M.addEvent("walk",0)');
});
invalidProject('Duplicate event IDs in one frame fail validation',p=>p.animations[0].frames[0].events=[{id:'same',type:'custom',name:'A',value:''},{id:'same',type:'sound',name:'B',value:''}]);
invalidProject('Malformed event arrays fail validation',p=>p.animations[0].frames[0].events='events');
invalidProject('Oversized UTF-8 event identities fail validation',p=>p.animations[0].frames[0].events=[{id:'界'.repeat(86),type:'custom',name:'A',value:''}]);

test('Duplicating an animation frame deep-copies boxes/events and regenerates their IDs',()=>{
  const h=fresh();h.run('M.addBox("walk",0,"hitboxes",{name:"Attack",x:3,y:-5,w:6,h:4});M.addEvent("walk",0,{type:"attack_start",name:"Active",value:"punch"});S._selAnim=0;S._animFrame=0;anim_addFrame()');
  const frames=h.json('S.animations[0].frames');assert.equal(frames.length,3);assert.equal(h.run('S.animations[0].frames[0]!==S.animations[0].frames[1]'),true);
  for(const kind of ['hitboxes','hurtboxes','events']){
    assert.notEqual(frames[0][kind][0].id,frames[1][kind][0].id,kind+' ID');const a={...frames[0][kind][0]},b={...frames[1][kind][0]};delete a.id;delete b.id;assert.deepEqual(a,b,kind+' content');
    assert.equal(h.run('S.animations[0].frames[0].'+kind+'!==S.animations[0].frames[1].'+kind),true);
  }
  h.run('S.animations[0].frames[1].hurtboxes[0].x=20;S.animations[0].frames[1].events[0].value="changed"');assert.equal(h.run('S.animations[0].frames[0].hurtboxes[0].x'),-3);assert.equal(h.run('S.animations[0].frames[0].events[0].value'),'punch');
});
test('Duplicate frame undo/redo preserves the newly generated identities',()=>{
  const h=fresh();h.run('S._selAnim=0;S._animFrame=0;anim_addFrame()');const duplicated=h.json('S.animations[0].frames[1]');h.run('undo()');assert.equal(h.run('S.animations[0].frames.length'),2);h.run('redo()');assert.deepEqual(h.json('S.animations[0].frames[1]'),duplicated);
});
test('Frame duration boundaries select the correct frame and local tick',()=>{
  const h=fresh();timeline(h);for(const [tick,index,localTick,cycle] of [[0,0,0,0],[1,0,1,0],[2,1,0,0],[4,1,2,0],[5,2,0,0],[6,0,0,1],[8,1,0,1],[17,2,0,2]]){
    h.context.tick=tick;const got=h.json('M.frameAt(timeline,tick)');assert.deepEqual([got.index,got.localTick,got.cycle,got.total,got.ended],[index,localTick,cycle,6,false],'tick '+tick);
  }
});
test('Nonlooping playback ends at total duration and clamps the final frame',()=>{
  const h=fresh();timeline(h,false);for(const tick of [6,7,60]){h.context.tick=tick;const got=h.json('M.frameAt(timeline,tick)');assert.equal(got.index,2);assert.equal(got.ended,true);assert.equal(got.total,6);assert.equal(got.frame.events[0].id,'e2');}
  h.context.tick=5;assert.equal(h.run('M.frameAt(timeline,tick).ended'),false);
});
test('Frame entry includes initial tick, excludes from boundary and preserves same-frame event order',()=>{
  const h=fresh();timeline(h);h.run('timeline.frames[0].events.push({id:"e-extra",type:"sound",name:"Extra",value:""})');
  assert.deepEqual(h.json('M.eventsBetween(timeline,-1,0).map(x=>[x.event.id,x.tick,x.frameIndex,x.cycle])'),[['e0',0,0,0],['e-extra',0,0,0]]);
  assert.deepEqual(h.json('M.eventsBetween(timeline,0,1)'),[]);assert.deepEqual(h.json('M.eventsBetween(timeline,0,2).map(x=>x.event.id)'),['e1']);assert.deepEqual(h.json('M.eventsBetween(timeline,2,2)'),[]);
});
test('Looping event boundaries include each frame once per cycle without duplicates at wrap',()=>{
  const h=fresh();timeline(h);assert.deepEqual(h.json('M.eventsBetween(timeline,-1,12).map(x=>[x.event.id,x.tick,x.frameIndex,x.cycle])'),[['e0',0,0,0],['e1',2,1,0],['e2',5,2,0],['e0',6,0,1],['e1',8,1,1],['e2',11,2,1],['e0',12,0,2]]);
  assert.deepEqual(h.json('[...M.eventsBetween(timeline,-1,6),...M.eventsBetween(timeline,6,12)].map(x=>[x.event.id,x.tick])'),h.json('M.eventsBetween(timeline,-1,12).map(x=>[x.event.id,x.tick])'));
});
test('Nonlooping event delivery does not emit another initial event or replay the final frame',()=>{
  const h=fresh();timeline(h,false);assert.deepEqual(h.json('M.eventsBetween(timeline,-1,100).map(x=>[x.event.id,x.tick])'),[['e0',0],['e1',2],['e2',5]]);assert.deepEqual(h.json('M.eventsBetween(timeline,5,100)'),[]);
});
test('Timing calculations do not mutate animation/event records or invoke authored event values',()=>{
  const h=fresh();timeline(h);h.run('window.effectCount=0;timeline.frames[0].events[0].type="sound";timeline.frames[0].events[0].value="effectCount++";window.beforeTiming=JSON.stringify(timeline);M.eventsBetween(timeline,-1,18);M.frameAt(timeline,18)');assert.equal(h.run('JSON.stringify(timeline)===beforeTiming'),true);assert.equal(h.run('effectCount'),0);
});
test('Origin-relative union bounds include both hit/hurt boxes only when requested',()=>{
  const h=fresh();h.run('M.addBox("walk",0,"hitboxes",{x:20,y:-18,w:5,h:6});M.addBox("walk",1,"hurtboxes",{x:-12,y:10,w:3,h:4})');assert.deepEqual(h.json('M.bounds(S.animations[0],{boxes:false})'),{x:-4,y:-16,w:16,h:20});assert.deepEqual(h.json('M.bounds(S.animations[0],{boxes:true})'),{x:-12,y:-18,w:37,h:32});
});

// A minimal affine canvas recorder makes reflection tests independent of the
// choice to mirror via transforms or explicitly computed coordinates.
function record(h,source) {
  const calls=[],stack=[];let m=[1,0,0,1,0,0];
  const point=(x,y)=>[m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]];
  const rectangle=(kind,x,y,w,z,style)=>{const points=[point(x,y),point(x+w,y),point(x,y+z),point(x+w,y+z)];const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);calls.push({kind,x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys),style});};
  const ctx={fillStyle:'',strokeStyle:'',save(){stack.push({m:[...m],fillStyle:this.fillStyle,strokeStyle:this.strokeStyle});},restore(){const s=stack.pop();if(s){m=s.m;this.fillStyle=s.fillStyle;this.strokeStyle=s.strokeStyle;}},translate(x,y){m[4]+=m[0]*x+m[2]*y;m[5]+=m[1]*x+m[3]*y;},scale(x,y){m[0]*=x;m[1]*=x;m[2]*=y;m[3]*=y;},fillRect(x,y,w,z){rectangle('fill',x,y,w,z,this.fillStyle);},strokeRect(x,y,w,z){rectangle('stroke',x,y,w,z,this.strokeStyle);},setLineDash(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}};
  h.context.drawTestCtx=ctx;h.run(source);return calls;
}
function sortCalls(calls){return calls.sort((a,b)=>a.kind.localeCompare(b.kind)||a.y-b.y||a.x-b.x||a.w-b.w||a.h-b.h||a.style.localeCompare(b.style));}
test('Facing left reflects legacy tile pixels and authored boxes around the same anchor',()=>{
  const h=fresh();h.run('S.sprChr[1]=Array.from({length:8},()=>Array(8).fill(0));S.sprChr[1][1][6]=2;S.animations[0].frames[0]={tileIdx:1,duration:2,hitboxes:[{id:"attack",name:"Hit",x:5,y:-2,w:7,h:3}],hurtboxes:[{id:"body",name:"Hurt",x:-3,y:-5,w:4,h:8}],events:[]}');
  const right=record(h,'M.drawFrame(drawTestCtx,S.animations[0].frames[0],40,50,3,{facing:"right",boxes:true,labels:false})');const left=record(h,'M.drawFrame(drawTestCtx,S.animations[0].frames[0],40,50,3,{facing:"left",boxes:true,labels:false})');assert.ok(right.some(r=>r.kind==='stroke'),'boxes were not outlined');assert.deepEqual(sortCalls(left),sortCalls(right.map(r=>({...r,x:80-r.x-r.w}))));
  const art=record(h,'M.drawFrame(drawTestCtx,S.animations[0].frames[0],40,50,3,{facing:"left",boxes:false,labels:false})');assert.equal(art.length,1);assert.deepEqual([art[0].x,art[0].y,art[0].w,art[0].h],[31,41,3,3]);
});
test('Facing reflection preserves metasprite origin, per-piece flips, palette and geometry',()=>{
  const h=fresh();const right=record(h,'M.drawFrame(drawTestCtx,S.animations[0].frames[0],60,90,2,{facing:"right",boxes:true,labels:false})');const left=record(h,'M.drawFrame(drawTestCtx,S.animations[0].frames[0],60,90,2,{facing:"left",boxes:true,labels:false})');assert.ok(right.length>10);assert.deepEqual(sortCalls(left),sortCalls(right.map(r=>({...r,x:120-r.x-r.w}))));
});

(async()=>{const results=[];for(const {name,fn} of tests){const start=Date.now();try{await fn();results.push({name,passed:true,milliseconds:Date.now()-start});process.stdout.write('PASS '+name+'\n');}catch(error){results.push({name,passed:false,milliseconds:Date.now()-start,error:error.stack});process.stdout.write('FAIL '+name+'\n  '+error.message+'\n');}}
const passed=results.filter(x=>x.passed).length,report={suite:'model164',html:path.basename(htmlPath),scope:'1.6.4 complete-script model contracts, migration, mutation/history, preview timing and recorded drawing math. Mock DOM; no browser visual or native download QA.',passed,failed:results.length-passed,total:results.length,results};if(process.env.FORGE_TEST_REPORT)fs.writeFileSync(process.env.FORGE_TEST_REPORT,JSON.stringify(report,null,2)+'\n');process.stdout.write('\n'+passed+'/'+results.length+' passed\n');process.exitCode=passed===results.length?0:1;})();
