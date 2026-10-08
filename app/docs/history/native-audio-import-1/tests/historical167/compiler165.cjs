#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {loadForge}=require('./harness.cjs'),fixtures=require('./fixtures.cjs');
const htmlPath=path.resolve(process.argv[2]||path.join(__dirname,'../mainline/NES_Forge_1.6.6_No_Code_Workflow.html'));
const tests=[],test=(name,fn)=>tests.push({name,fn}),copy=v=>JSON.parse(JSON.stringify(v));
function fixture(){
  const p=fixtures.composedProject();p.version=7;p.worlds=[];const room=p.scenes[0];
  Object.assign(room,{sceneType:'sideview',scrollDir:'none',view:{x:0,y:0,w:256,h:240,followEnt:-1,hBorder:32,vBorder:24},oam:[],metatiles:[],metaMap:Array(240).fill(-1),nt:Array(960).fill(0)});
  room.tileProps[1]=1;for(let i=26*32;i<960;i++)room.nt[i]=1;
  const frame=(id)=>({metaspriteId:'hero',tileIdx:0,duration:3,hitboxes:id==='attack'?[{id:'hit',name:'Hit',x:8,y:-14,w:16,h:8}]:[],hurtboxes:[{id:'body-'+id,name:'Body',x:-6,y:-22,w:12,h:22}],events:[]});
  p.animations=['idle','walk','attack','hurt'].map(id=>({id,name:id,state:id,loop:id==='idle'||id==='walk',frames:[frame(id)]}));
  const binding={defaultState:'walk',facing:'right',states:p.animations.map(a=>({state:a.id,animationId:a.id}))};
  room.entities=[{id:'player',type:'player',x:40,y:208,animationBinding:copy(binding)},{id:'target',type:'npc',x:160,y:208,animationBinding:{...copy(binding),facing:'left'}}];
  return p;
}
function fresh(change){
  const p=fixture();change?.(p);const h=loadForge(htmlPath);h.context.fixture=p;
  h.context.config={mode:'single-room',sceneId:'scene-a',playerId:'player',targetId:'target',moveSpeed:2,jumpSpeed:9,gravity:1,maxFallSpeed:6,bodyWidth:12,bodyHeight:22};
  h.run('db_deserializeState(fixture);window._buildAndRunMode=true;window.base=buildNesRom()');
  assert.ok(h.run('base instanceof Uint8Array'),'fixture viewer build failed: '+h.get('buildLog').children.map(c=>c.textContent).join('; '));
  return h;
}
function compile(h){h.run('window.spec=Forge165.compileGameplay(base,config)');return h.json('spec');}
function rejected(change,pattern,configChange){const h=fresh(change);if(configChange)Object.assign(h.context.config,configChange);assert.throws(()=>compile(h),pattern);}
test('Compiles actual linked ROM into selected actor and fixed-room specifications',()=>{
  const h=fresh(),before=h.json('projectData()'),spec=compile(h);
  assert.equal(spec.sceneAddress,0xD000);assert.deepEqual([spec.sceneIndex,spec.playerIndex,spec.targetIndex],[0,0,1]);
  assert.deepEqual([spec.player.x,spec.player.y,spec.player.facing],[40,208,0]);assert.equal(spec.target.facing,1);
  assert.equal(spec.collision.length,960);assert.equal(spec.collision[25*32],0);assert.equal(spec.collision[26*32],1);
  assert.equal(spec.player.animations.attack.loop,false);assert.deepEqual(spec.target.animations.idle,spec.player.animations.walk);
  assert.deepEqual(h.json('projectData()'),before,'compiling runtime changed authored data');
});
test('Expands nonadjacent 8×16 tiles with vertical flip, origin, palette, and priority intact',()=>{
  const h=fresh(),spec=compile(h),linked=h.json('Forge163.build.readRomAssets(base)'),source=linked.frames[0];
  assert.deepEqual(spec.player.animations.idle.frames[0].pieces,[
    {x:-4,y:-16,tile:source.pieces[0].tile2,attr:0xA2},{x:-4,y:-8,tile:source.pieces[0].tile,attr:0xA2},
    {x:4,y:-16,tile:source.pieces[1].tile,attr:0x43},{x:4,y:-8,tile:source.pieces[1].tile2,attr:0x43}]);
});
test('Legacy tile animation uses centered eight-pixel geometry and linked tile ID',()=>{
  const h=fresh(p=>{p.animations[0].frames[0]={tileIdx:2,sceneId:'scene-a',duration:7,hitboxes:[],hurtboxes:[],events:[]};}),spec=compile(h),linked=h.json('Forge163.build.readRomAssets(base)');
  assert.deepEqual(spec.player.animations.idle.frames[0].pieces,[{x:-4,y:-4,tile:linked.animations[0].frames[0].tileIdx,attr:0}]);
});
test('Event types become observational bits without rewriting ordered authoring events',()=>{
  const h=fresh(p=>{p.animations[2].frames[0].events=['attack_start','attack_end','footstep','sound','custom','sound'].map((type,i)=>({id:'e'+i,type,name:'Event',value:'marker'}));});
  assert.equal(compile(h).player.animations.attack.frames[0].eventMask,31);assert.equal(h.run('S.animations[2].frames[0].events.length'),6);
});
test('Linked metatile quadrants override tile properties at their exact four cells',()=>{
  const h=fresh(p=>{const r=p.scenes[0];r.nt[0]=1;r.nt[1]=2;r.nt[32]=3;r.nt[33]=1;r.tileProps[2]=1;r.tileProps[3]=1;r.metatiles=[{id:7,name:'Mixed',category:'terrain',tiles:[1,2,3,1],pal:0,collision:[1,0,0,1],flags:0}];r.metaMap[0]=7;});
  const c=compile(h).collision;assert.deepEqual([c[0],c[1],c[32],c[33]],[1,0,0,1]);
});
test('Unsupported raw collision properties fail with a location and named property',()=>rejected(p=>{p.scenes[0].nt[100]=2;p.scenes[0].tileProps[2]=2;},/tile 4,3 uses Platform/));
test('Metatile cells detached by packed-build reconciliation do not add invisible collision',()=>{
  const h=fresh(p=>{const r=p.scenes[0];r.metatiles=[{id:7,name:'Stale link',category:'terrain',tiles:[1,2,3,1],pal:0,collision:[1,1,1,1],flags:0}];r.metaMap[0]=7;});
  const c=compile(h).collision;assert.deepEqual([c[0],c[1],c[32],c[33]],[0,0,0,0]);
});
test('Metatile hazard override fails even when its source raw tile is empty',()=>rejected(p=>{const r=p.scenes[0];r.nt[0]=1;r.nt[1]=2;r.nt[32]=3;r.nt[33]=1;r.metatiles=[{id:7,name:'Hazard',category:'terrain',tiles:[1,2,3,1],pal:0,collision:[4,0,0,0],flags:0}];r.metaMap[0]=7;},/Hazard/));
test('Missing required player state fails explicitly',()=>rejected(p=>{p.scenes[0].entities[0].animationBinding.states=p.scenes[0].entities[0].animationBinding.states.filter(s=>s.state!=='attack');},/player needs an "attack"/));
test('Looping attack is rejected before runtime generation',()=>rejected(p=>{p.animations[2].loop=true;},/attack animation must be nonlooping/));
test('Looping target hurt animation is rejected',()=>rejected(p=>{p.animations[3].loop=true;},/hurt animation must be nonlooping/));
test('Optional target can be omitted without changing the source entity',()=>{
  const h=fresh();h.context.config.targetId='';const spec=compile(h);assert.equal(spec.target,null);assert.equal(spec.targetIndex,-1);assert.equal(h.run('S.scenes[0].entities.length'),2);
});
test('Optional jump binding is compiled separately when authored',()=>{
  const h=fresh(p=>{p.scenes[0].entities[0].animationBinding.states.push({state:'jump',animationId:'hurt'});});assert.deepEqual(compile(h).player.animations.jump,compile(h).target.animations.hurt);
});
test('Empty hit and hurt boxes remain authorable with actionable runtime warnings',()=>{
  const h=fresh(p=>{for(const a of p.animations)for(const f of a.frames){f.hitboxes=[];f.hurtboxes=[];}});assert.equal(compile(h).warnings.length,2);
});
test('Out-of-range piece offsets are rejected without byte wrapping',()=>rejected(p=>{p.metasprites[0].pieces[0].x=100;},/piece X/));
test('Expanded second half of an 8×16 piece also obeys signed offset bounds',()=>rejected(p=>{p.metasprites[0].pieces[0].y=75;},/piece Y/));
test('More than four contact boxes in an executed frame fails clearly',()=>rejected(p=>{p.animations[2].frames[0].hitboxes=Array.from({length:5},(_,i)=>({id:'hit'+i,name:'Hit',x:i,y:-10,w:1,h:1}));},/at most four/));
test('Out-of-range contact dimensions fail clearly',()=>rejected(p=>{p.animations[2].frames[0].hitboxes[0].w=65;},/width/));
test('More than 24 expanded hardware pieces per frame is rejected',()=>rejected(p=>{p.metasprites[0].pieces=Array.from({length:13},(_,i)=>({id:'p'+i,tile:1,tile2:2,x:i%4*8,y:Math.floor(i/4)*16,pal:0,flipH:false,flipV:false,behind:false}));},/at most 24/));
test('Player and fixed target plus static room OAM enforce eight sprites per scanline',()=>rejected(p=>{p.scenes[0].oam=Array.from({length:5},(_,i)=>({x:i*8,y:192,tile:1,attr:0,height:8,active:true}));},/need 9 sprites/));
test('Static decorative OAM uses packed linked bytes and screen Y coordinates',()=>{
  const h=fresh(p=>{p.scenes[0].oam=[{x:200,y:24,tile:1,attr:0x43,height:8,active:true}];}),s=compile(h);assert.equal(s.staticOAM.length,1);assert.deepEqual([s.staticOAM[0].x,s.staticOAM[0].y,s.staticOAM[0].attr],[200,24,0x43]);
});
test('Player feet origin must keep the body inside the room',()=>rejected(p=>{p.scenes[0].entities[0].x=1;},/body must start inside/));
test('Player cannot spawn intersecting the authored solid floor',()=>rejected(p=>{p.scenes[0].entities[0].y=215;},/starts inside a solid tile/));
test('Camera scrolling requires an explicit fixed-room configuration change',()=>rejected(p=>{p.scenes[0].scrollDir='horizontal';},/fixed 256×240/));
test('Excluded or absent selected room is rejected',()=>rejected(null,/selected gameplay room|room.*missing|room.*selected|Select an existing room for gameplay/i,{sceneId:'absent'}));
test('Different visible palette colors in a referenced source scene fail instead of recoloring',()=>rejected(p=>{
  const source=copy(p.scenes[0]);source.id='source';source.name='Different palette';source.entities=[];source.buildOrder=1;source.sprPal[2][1]=12;p.scenes.push(source);p.metasprites[0].sceneId='source';
},/palette 2.*differs/));
test('Unused source palette rows may differ and transparent slot differences are harmless',()=>{
  const h=fresh(p=>{const source=copy(p.scenes[0]);source.id='source';source.entities=[];source.buildOrder=1;source.sprPal[0][1]=12;source.sprPal[2][0]=0;p.scenes.push(source);p.metasprites[0].sceneId='source';});assert.ok(compile(h));
});
test('Changing selected actor identity after the base build fails instead of misbinding',()=>{
  const h=fresh();h.run('S.scenes[0].entities[0].id="replacement"');h.context.config.playerId='replacement';assert.throws(()=>compile(h),/identity does not match/);
});
test('Compiler rejects a gameplay32 KB ROM as the required viewer16 KB input',()=>{
  const h=fresh();h.run('window.invalid=new Uint8Array(16+32768+8192);invalid.set(base.subarray(0,16));invalid[4]=2;base=invalid');assert.throws(()=>compile(h),/current packed 16 KB/);
});

(async()=>{const results=[];for(const {name,fn} of tests){const start=Date.now();try{await fn();results.push({name,passed:true,milliseconds:Date.now()-start});process.stdout.write('PASS '+name+'\n');}catch(error){results.push({name,passed:false,milliseconds:Date.now()-start,error:error.stack});process.stdout.write('FAIL '+name+'\n  '+error.message+'\n');}}
const passed=results.filter(r=>r.passed).length,report={suite:'compiler165',html:path.basename(htmlPath),scope:'Real packed-ROM compilation, linked graphics and palettes, collision provenance, actor bindings, hardware budgets, and invalid-input rejection. Full-script VM; no browser layout claims.',passed,failed:results.length-passed,total:results.length,results};if(process.env.FORGE_TEST_REPORT)fs.writeFileSync(process.env.FORGE_TEST_REPORT,JSON.stringify(report,null,2)+'\n');process.stdout.write('\n'+passed+'/'+results.length+' passed\n');process.exitCode=passed===results.length?0:1;})();
