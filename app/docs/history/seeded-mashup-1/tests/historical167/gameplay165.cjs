#!/usr/bin/env node
'use strict';
// Tests the generated 6502 program in the application's actual bundled emulator.
// Fixtures below are original pixels and rooms; no JS physics model substitutes
// for execution. The DOM harness is not browser/native Save As verification.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {loadForge}=require('./harness.cjs'),fixtures=require('./fixtures.cjs');
const root=path.resolve(__dirname,'..');
const html=path.resolve(process.argv[2]||path.join(root,'mainline/NES_Forge_1.6.6_No_Code_Workflow.html'));
const tests=[],test=(name,fn)=>tests.push({name,fn}),plain=x=>JSON.parse(JSON.stringify(x));
const STATES={idle:0,walk:1,jump:2,attack:3};
function gameplayProject(options={}){
 const p=fixtures.project(),sc=p.scenes[0];p.version=8;p.projectName='Original gameplay regression room';p.worlds=[];
 sc.name='Training room';sc.sceneType='sideview';sc.scrollDir='none';sc.view={x:0,y:0,w:256,h:240,followEnt:-1,hBorder:32,vBorder:24};
 sc.nt=Array(960).fill(0);sc.attr=Array(64).fill(0);sc.oam=[];sc.entities=[];sc.links=[];sc.metatiles=[];sc.metaMap=Array(240).fill(-1);sc.tileProps=Array(256).fill(0);sc.tileProps[1]=1;
 sc.chr=Array.from({length:256},()=>fixtures.tile());sc.chr[1]=Array.from({length:8},(_,y)=>Array.from({length:8},(_,x)=>y===0||x===0?2:1));
 sc.sprChr=Array.from({length:256},()=>fixtures.tile());
 sc.sprChr[10]=Array.from({length:8},(_,y)=>Array.from({length:8},(_,x)=>x<3&&y<6?1:y===6?2:0));
 sc.sprChr[11]=Array.from({length:8},(_,y)=>Array.from({length:8},(_,x)=>x===y||x===7?3:0));
 sc.sprChr[12]=Array.from({length:8},(_,y)=>Array.from({length:8},(_,x)=>y===3&&x>0?2:0));
 for(let y=26;y<30;y++)for(let x=0;x<32;x++)sc.nt[y*32+x]=1;
 if(options.wall)for(let y=15;y<26;y++)sc.nt[y*32+24]=1;
 if(options.ceiling)for(let x=3;x<10;x++)sc.nt[19*32+x]=1;
 if(options.platform)for(let x=12;x<17;x++)sc.nt[21*32+x]=1;
 if(options.metatile){sc.metatiles=[{id:7,name:'Diagonal contact',category:'test',tiles:[1,1,1,1],pal:0,collision:[1,0,0,1],flags:0}];sc.metaMap[4*16+10]=7;for(const off of [0,1,32,33])sc.nt[8*32+20+off]=1;}
 const pose=(id,shift=0,attack=false)=>({id,name:id,sceneId:sc.id,spriteMode:8,originX:8,originY:24,pieces:[{id:id+'-a',tile:10,tile2:11,x:shift,y:0,pal:0,flipH:false,flipV:false,behind:false},{id:id+'-b',tile:11,tile2:12,x:8,y:8,pal:0,flipH:false,flipV:false,behind:false},...(attack?[{id:id+'-c',tile:12,tile2:13,x:16,y:8,pal:0,flipH:false,flipV:false,behind:false}]:[])]});
 p.metasprites=[pose('idle'),pose('step',2),pose('strike',0,true)];
 let serial=0;
 const frame=(metaspriteId,duration,eventTypes=[],hit=false)=>{const id=++serial;return {metaspriteId,tileIdx:10,duration,hitboxes:hit?[{id:'hit'+id,name:'Attack',x:8,y:-18,w:24,h:8}]:[],hurtboxes:[{id:'hurt'+id,name:'Body',x:-6,y:-22,w:12,h:22}],events:eventTypes.map((type,i)=>({id:'ev'+id+'-'+i,type,name:type,value:''}))};};
 p.animations=[{id:'idle',name:'Idle',state:'idle',loop:true,frames:[frame('idle',4)]},{id:'walk',name:'Walk',state:'walk',loop:true,frames:[frame('idle',2,['footstep']),frame('step',3,['footstep'])]},{id:'attack',name:'Attack',state:'attack',loop:false,frames:[frame('idle',2,['attack_start']),frame('strike',3,['sound','custom'],true),frame('idle',2,['attack_end'])]},{id:'hurt',name:'Hurt',state:'hurt',loop:false,frames:[frame('step',8),frame('idle',4)]}];
 const player={id:'player',type:'player',name:'Scout',x:options.playerX??40,y:options.playerY??208,sprTile:-1,animationBinding:{defaultState:'idle',facing:options.facing||'right',states:['idle','walk','attack'].map(state=>({state,animationId:state}))}};
 const target={id:'target',type:'npc',name:'Target',x:options.targetX??120,y:options.targetY??208,sprTile:-1,animationBinding:{defaultState:'idle',facing:'left',states:[{state:'idle',animationId:'idle'},{state:'hurt',animationId:'hurt'}]}};
 sc.entities=[player,...(options.noTarget?[]:[target])];
 p.gameplay={mode:'single-room',sceneId:sc.id,playerId:'player',targetId:options.noTarget?'':'target',moveSpeed:2,jumpSpeed:9,gravity:1,maxFallSpeed:6,bodyWidth:12,bodyHeight:22,...options.physics};
 return p;
}
function fresh(p=gameplayProject()){
 const h=loadForge(html);h.context.fixture=p;h.run('db_deserializeState(fixture);window._buildAndRunMode=true');assert.equal(h.errors.length,0,h.errors.join('; '));return h;
}
function compile(p=gameplayProject()){
 const desired=plain(p.gameplay),viewer=plain(p);viewer.gameplay.mode='viewer';const h=fresh(viewer);h.context.baseRom=h.run('buildNesRom()',5000);assert.ok(h.context.baseRom instanceof Uint8Array,h.errors.join('; '));
 h.context.desired=desired;h.run('Forge165.config.setAll(desired)');h.context.spec=h.run('Forge165.compileGameplay(baseRom,Forge165.config.get())',5000);return h;
}
function built(p=gameplayProject()){
 const h=compile(p);h.context.engine=h.run('Forge165.makeGameplayEngine(spec)',10000);h.context.rom=h.run('buildNesRom()',10000);assert.ok(h.context.rom instanceof Uint8Array,'Gameplay build failed: '+h.errors.join('; '));h.context.symbols=h.run('engine.symbols');return h;
}
function value(h,key){const addr=h.context.symbols[key];assert.ok(Number.isInteger(addr)&&addr>=0&&addr<0x800,'Missing RAM symbol '+key);return h.run('emu.ram['+addr+']');}
function tick(h){return value(h,'tickLo')+256*value(h,'tickHi');}
function state(h){return Object.fromEntries(['ready','playerX','playerY','velocityY','grounded','playerState','playerFrame','playerFacing','targetHits','targetHurtTimer','targetFrame','eventMask','eventCount'].filter(k=>Number.isInteger(h.context.symbols[k])).map(k=>[k,value(h,k)]));}
function keys(h,names=[]){h.context.keyNames=names;h.run('clearEmuKeys();S.tab="emu";for(const key of keyNames)emuKeys[key]=true');}
function frames(h,count=1,names){if(names)keys(h,names);
 // NMI begins late in an emulator frame. Finish any pending actual 6502
 // update at its main-loop boundary before observing committed actor state.
 h.run('for(let i=0;i<'+count+';i++){emuRunFrame();if(emu.ram[symbols.ready]){let steps=0;while(emu.PC!==symbols.labels.main||emu.ram[symbols.frameReady]){cpuStep();if(++steps>20000)throw Error("Gameplay update did not reach its committed main-loop boundary");}}}',Math.max(15000,count*250));
 assert.equal(h.run('emu.opsMissed'),0);return state(h);}
function boot(p=gameplayProject()){
 const h=built(p);assert.equal(h.run('emuLoadRomData(rom,"Generated gameplay",0)',15000),true,h.errors.join('; '));keys(h,[]);
 for(let i=0;i<120;i++){frames(h);if(value(h,'ready')&&tick(h)>=3)return h;}throw Error('Gameplay did not become ready within 120 frames');
}
function runUntil(h,predicate,max=120){for(let i=0;i<max;i++){const s=frames(h);if(predicate(s))return s;}throw Error('Runtime condition did not occur within'+max+'frames: '+JSON.stringify(state(h)));}
function digest(h,expression){return crypto.createHash('sha256').update(Buffer.from(h.run(expression))).digest('hex');}
function assertBuildFails(p,pattern){const h=fresh(p);h.run('window._lastBuiltRom=new Uint8Array([1])');assert.equal(h.run('buildNesRom()',10000),null);assert.equal(h.run('window._lastBuiltRom'),null);assert.match(h.errors.at(-1)||'',pattern);}

test('Schema8 migration defaults legacy projects to viewer and preserves authored state',()=>{
 const p=fixtures.composedProject(),h=fresh(p);assert.equal(h.run('projectData().version'),require('./version-expectations.cjs').schemaFor(h));assert.equal(h.run('projectData().foundation'),require('./version-expectations.cjs').foundationFor(h));assert.equal(h.run('Forge165.config.get().mode'),'viewer');assert.deepEqual(h.json('S.metasprites'),p.metasprites);
});
test('Gameplay configuration survives JSON, undo and redo',()=>{
 const h=fresh(),before=h.json('Forge165.config.get()');h.run('Forge165.config.set("moveSpeed",3)');assert.equal(h.run('Forge165.config.get().moveSpeed'),3);h.run('undo()');assert.deepEqual(h.json('Forge165.config.get()'),before);h.run('redo();db_deserializeState(db_serializeState())');assert.equal(h.run('Forge165.config.get().moveSpeed'),3);
});
for(const [field,bad] of [['moveSpeed',0],['jumpSpeed',13],['gravity',4],['maxFallSpeed',9],['bodyWidth',13],['bodyHeight',49],['mode','platformer']])test('Invalid gameplay '+field+' rejects atomically',()=>{
 const h=fresh(),before=h.json('projectData()'),depth=h.run('undoStack.length');h.context.bad=bad;assert.throws(()=>h.run('Forge165.config.set('+JSON.stringify(field)+',bad)'));assert.deepEqual(h.json('projectData()'),before);assert.equal(h.run('undoStack.length'),depth);
});
test('Viewer mode preserves the complete original 16 KB ROM bytes',()=>{
 const p=gameplayProject();p.gameplay.mode='viewer';const h=fresh(p),old=loadForge(path.join(root,'baseline','NES_Forge_1.6.4_Animation_Entity_Binding.html'));const legacy=plain(p);legacy.version=7;delete legacy.gameplay;old.context.fixture=legacy;old.run('db_deserializeState(fixture);window._buildAndRunMode=true');assert.deepEqual(Buffer.from(h.run('buildNesRom()',5000)),Buffer.from(old.run('buildNesRom()',5000)));
});
test('Gameplay build emits 32 KB NROM with unchanged linked CHR and legacy metadata',()=>{
 const h=built(),base=h.context.baseRom,rom=h.context.rom;assert.equal(rom[4],2);assert.equal(rom.length,16+32768+8192);assert.equal(rom[6]>>4|rom[7]&240,0);assert.deepEqual(Buffer.from(rom.slice(16+32768)),Buffer.from(base.slice(16+16384)));assert.deepEqual(Buffer.from(rom.slice(16+0x4000,16+0x7ffa)),Buffer.from(base.slice(16,16+0x3ffa)));assert.equal(rom[16+0x7ffc]|rom[16+0x7ffd]<<8,h.context.engine.reset);assert.deepEqual(Buffer.from(rom.slice(16,16+h.context.engine.bytes.length)),Buffer.from(h.context.engine.bytes));assert.ok(h.context.engine.bytes.length<=0x3800);
});
test('Compiler uses raw tile collision and linked metatile quadrant overrides',()=>{
 const h=compile(gameplayProject({metatile:true})),c=h.context.spec.collision;assert.equal(c.length,960);assert.equal(c[26*32+4],1);assert.equal(c[10*32+4],0);assert.deepEqual([c[8*32+20],c[8*32+21],c[9*32+20],c[9*32+21]],[1,0,0,1]);
});
test('Unsupported collision values fail without a stale ROM',()=>{const p=gameplayProject();p.scenes[0].tileProps[1]=2;assertBuildFails(p,/collision|solid|unsupported/i);});
test('Custom assembly is retained and blocks single-room generation',()=>{const p=gameplayProject();p.asmSource=fixtures.customASM;const h=fresh(p),source=h.run('S.asmSource');assert.equal(h.run('buildNesRom()',10000),null);assert.equal(h.run('S.asmSource'),source);assert.match(h.errors.at(-1),/custom|assembly|asm/i);});
test('Missing player state and looping attack fail clearly',()=>{const p=gameplayProject();p.scenes[0].entities[0].animationBinding.states.pop();assertBuildFails(p,/attack|state/i);const q=gameplayProject();q.animations.find(a=>a.id==='attack').loop=true;assertBuildFails(q,/attack|loop/i);});
test('Excluded gameplay room fails without silently choosing another scene',()=>{const p=gameplayProject();p.scenes[0].buildInclude=false;p.scenes.push({...fixtures.scene('other'),metatiles:[],metaMap:Array(240).fill(-1)});assertBuildFails(p,/excluded|include|scene|build/i);});
test('Mismatched source sprite palettes reject silent recoloring',()=>{const p=gameplayProject(),src=plain(p.scenes[0]);src.id='art-source';src.entities=[];src.sprPal[0][1]=7;p.scenes.push(src);p.metasprites.forEach(m=>m.sceneId=src.id);assertBuildFails(p,/palette|color/i);});
test('Conservative total scanline sprite overflow is rejected',()=>{const p=gameplayProject();p.scenes[0].oam=Array.from({length:7},(_,i)=>({x:16+i*8,y:184,tile:10,attr:0,height:8,active:true}));assertBuildFails(p,/scanline|eight|8|sprite/i);});
test('Game boots with rendered room, grounded actor, balanced stack and advancing ticks',()=>{
 const h=boot(),s=state(h);assert.equal(s.ready,1);assert.equal(s.playerX,40);assert.equal(s.playerY,208);assert.equal(s.grounded,1);assert.ok(h.run('emu.PC')>=0x8000&&h.run('emu.PC')<0xb800);const start=tick(h);frames(h,10);assert.equal(tick(h)-start,10);assert.ok(h.run('emu.SP')>=0xf0);assert.ok(h.run('new Set(Array.from(emu.frameBuffer)).size')>3);assert.equal(h.errors.length,0);
});
test('Directional input moves exact distance, selects walk and release returns idle',()=>{
 const h=boot(),x=value(h,'playerX');frames(h,10,['ArrowRight']);assert.equal(value(h,'playerX'),x+20);assert.equal(value(h,'playerState'),STATES.walk);frames(h,6,['ArrowLeft']);assert.equal(value(h,'playerX'),x+8);frames(h,2,[]);assert.equal(value(h,'playerX'),x+8);assert.equal(value(h,'playerState'),STATES.idle);
});
test('Opposing directions do not move and preserve last unambiguous facing',()=>{
 const h=boot();frames(h,1,['ArrowLeft']);const x=value(h,'playerX');assert.equal(value(h,'playerFacing'),1);frames(h,5,['ArrowLeft','ArrowRight']);assert.equal(value(h,'playerX'),x);assert.equal(value(h,'playerFacing'),1);
});
test('Solid wall blocks every movement pixel and prevents horizontal tunneling',()=>{
 const h=boot(gameplayProject({wall:true,playerX:168,physics:{moveSpeed:4}}));frames(h,16,['ArrowRight']);assert.equal(value(h,'playerX'),186);assert.equal(value(h,'playerY'),208);frames(h,2,['ArrowLeft']);assert.equal(value(h,'playerX'),178);
});
test('Room bounds prevent left and right coordinate byte wrapping',()=>{
 const h=boot(gameplayProject({playerX:8,noTarget:true,physics:{moveSpeed:4}}));frames(h,5,['ArrowLeft']);assert.equal(value(h,'playerX'),6);frames(h,65,['ArrowRight']);assert.equal(value(h,'playerX'),250);
});
test('Minimum two-pixel body width reaches both room edges without compare overflow',()=>{
 const h=boot(gameplayProject({playerX:3,noTarget:true,physics:{bodyWidth:2,moveSpeed:4}}));frames(h,3,['ArrowLeft']);assert.equal(value(h,'playerX'),1);frames(h,65,['ArrowRight']);assert.equal(value(h,'playerX'),255);frames(h,2);assert.equal(value(h,'playerX'),255);
});
test('Nonlooping idle and walk hold their final frame without repeated entry events',()=>{
 const p=gameplayProject({noTarget:true});for(const id of ['idle','walk']){const a=p.animations.find(a=>a.id===id);a.loop=false;a.frames=plain(p.animations.find(a=>a.id==='walk').frames);a.frames.forEach((f,i)=>{f.duration=2;f.events=[{id:id+'-event-'+i,type:'custom',name:'Entry',value:''}];});}
 const h=boot(p);frames(h,6,[]);assert.equal(value(h,'playerFrame'),1);const idleEvents=value(h,'eventCount');frames(h,8);assert.equal(value(h,'playerFrame'),1);assert.equal(value(h,'eventCount'),idleEvents);frames(h,6,['ArrowRight']);assert.equal(value(h,'playerFrame'),1);const walkEvents=value(h,'eventCount');frames(h,8);assert.equal(value(h,'playerFrame'),1);assert.equal(value(h,'eventCount'),walkEvents);
});
test('A edge jumps, reaches an apex, lands and does not automatically repeat while held',()=>{
 const h=boot(),y=value(h,'playerY');frames(h,1,['KeyZ']);assert.ok(value(h,'playerY')<y);assert.equal(value(h,'grounded'),0);assert.equal(value(h,'playerState'),STATES.jump);let low=value(h,'playerY');for(let i=0;i<45;i++){frames(h);low=Math.min(low,value(h,'playerY'));}assert.ok(low<y-24);assert.equal(value(h,'playerY'),y);assert.equal(value(h,'grounded'),1);frames(h,8);assert.equal(value(h,'playerY'),y);frames(h,1,[]);frames(h,1,['KeyZ']);assert.ok(value(h,'playerY')<y);
});
test('Ceiling contact stops rising without pushing the body into solid tiles',()=>{
 const h=boot(gameplayProject({ceiling:true}));frames(h,1,['KeyZ']);const ys=[value(h,'playerY')];for(let i=0;i<30;i++)ys.push(frames(h).playerY);assert.ok(Math.min(...ys)>=182);assert.ok(Math.min(...ys)<208);assert.equal(value(h,'playerY'),208);
});
test('Jumping over a ledge lands on its top and walking off resumes gravity',()=>{
 const h=boot(gameplayProject({platform:true,playerX:80,noTarget:true}));frames(h,12,['KeyZ','ArrowRight']);keys(h,[]);runUntil(h,s=>s.grounded===1,45);assert.equal(value(h,'playerY'),168);assert.ok(value(h,'playerX')>=90&&value(h,'playerX')<142);frames(h,24,['ArrowRight']);assert.ok(value(h,'playerY')>168);runUntil(h,s=>s.grounded===1,30);assert.equal(value(h,'playerY'),208);
});
test('Terminal fall speed is bounded while falling from a clear high spawn',()=>{
 const h=boot(gameplayProject({playerY:48,noTarget:true}));for(let i=0;i<15;i++){const s=frames(h);if(s.velocityY<128)assert.ok(s.velocityY<=6);}runUntil(h,s=>s.grounded===1,50);assert.equal(value(h,'playerY'),208);
});
test('Attack outside all target hurtboxes has no effect',()=>{
 const h=boot();frames(h,1,['KeyX']);assert.equal(value(h,'playerState'),STATES.attack);frames(h,15);assert.equal(value(h,'targetHits'),0);assert.equal(value(h,'playerState'),STATES.idle);
});
test('An attack hits once in its active frame; held B does not retrigger; new edge hits again',()=>{
 const h=boot(gameplayProject({targetX:70}));frames(h,1,['KeyX']);assert.equal(value(h,'targetHits'),0);runUntil(h,s=>s.targetHits===1,10);assert.ok(value(h,'targetHurtTimer')>0);frames(h,30);assert.equal(value(h,'targetHits'),1);assert.equal(value(h,'playerState'),STATES.idle);frames(h,1,[]);frames(h,1,['KeyX']);runUntil(h,s=>s.targetHits===2,12);assert.equal(value(h,'targetHits'),2);
});
test('Target reaction expires and restores idle without changing actor position',()=>{
 const h=boot(gameplayProject({targetX:70}));frames(h,1,['KeyX']);runUntil(h,s=>s.targetHits===1,12);assert.ok(value(h,'targetHurtTimer')>0);frames(h,60,[]);assert.equal(value(h,'targetHurtTimer'),0);assert.equal(value(h,'targetFrame'),0);assert.equal(value(h,'playerX'),40);
});
test('Left-facing attack mirrors contact geometry and cannot strike behind the player',()=>{
 const h=boot(gameplayProject({playerX:80,targetX:50,facing:'left'}));frames(h,1,['KeyX']);runUntil(h,s=>s.targetHits===1,12);const other=boot(gameplayProject({playerX:80,targetX:110,facing:'left'}));frames(other,12,['KeyX']);assert.equal(value(other,'targetHits'),0);
});
test('Frame-entry markers appear once at authored attack duration boundaries',()=>{
 const h=boot(),seen=[];frames(h,1,['KeyX']);for(let i=0;i<8;i++){seen.push([value(h,'playerState'),value(h,'playerFrame'),value(h,'eventMask')]);frames(h);}const attack=seen.filter(x=>x[0]===STATES.attack);assert.deepEqual(attack.map(x=>x[1]),[0,0,1,1,1,2,2]);assert.equal(attack[0][2]&1,1);assert.equal(attack[2][2]&24,24);assert.equal(attack[5][2]&2,2);for(const i of [1,3,4,6])assert.equal(attack[i][2],0);
});
test('Walk frame durations follow authored 2/3 tick cadence',()=>{
 const h=boot(),indices=[];frames(h,1,['ArrowRight']);for(let i=0;i<10;i++){indices.push(value(h,'playerFrame'));frames(h);}assert.deepEqual(indices,[0,0,1,1,1,0,0,1,1,1]);
});
test('Facing reflects asymmetric hardware pieces around feet origin and flips their pixels',()=>{
 const p=gameplayProject({noTarget:true});p.scenes[0].oam=[{x:252,y:80,tile:10,attr:3,height:8,active:true}];const h=boot(p);frames(h,2,[]);const decorative=h.context.spec.staticOAM[0];assert.deepEqual(h.json('Array.from(emu.oamMem.slice(0,4))'),[decorative.y-1,decorative.tile,decorative.attr,252]);const right=h.json('Array.from(emu.oamMem.slice(4,12))'),rx=value(h,'playerX');frames(h,1,['ArrowLeft']);frames(h,2,[]);const left=h.json('Array.from(emu.oamMem.slice(4,12))'),lx=value(h,'playerX');for(let i=0;i<2;i++){assert.equal(left[i*4+1],right[i*4+1]);assert.equal((left[i*4+2]^right[i*4+2])&64,64);assert.equal(left[i*4+3]-lx,-(right[i*4+3]-rx)-8);}assert.equal(left[0],right[0]);
});
test('Start edge resets position, attack and target hit state',()=>{
 const h=boot(gameplayProject({targetX:70}));frames(h,1,['KeyX']);runUntil(h,s=>s.targetHits===1,12);frames(h,10,['ArrowRight']);frames(h,2,['Enter']);assert.equal(value(h,'playerX'),40);assert.equal(value(h,'playerY'),208);assert.equal(value(h,'targetHits'),0);assert.equal(value(h,'targetHurtTimer'),0);assert.equal(value(h,'playerState'),STATES.idle);
});
test('NMI completes within a bounded DMA budget without visible-frame PPU writes',()=>{
 const h=boot();h.run(`window.trace165={nmi:[],badWrites:[],start:null};window.origNmi165=cpuNmi;window.origStep165=cpuStep;window.origWrite165=cpuWrite;
 cpuNmi=function(){trace165.start=emu.cycles;return origNmi165();};
 cpuStep=function(){const isRti=cpuRead(emu.PC)===0x40;const result=origStep165();if(isRti&&trace165.start!==null){trace165.nmi.push(emu.cycles-trace165.start);trace165.start=null;}return result;};
 cpuWrite=function(a,v){const reg=a>=0x2000&&a<0x4000?(a&7):-1;const phase=emu.cycles-(emu._nextFrameCycle||0);if((reg===6||reg===7||a===0x4014)&&(emu.ppuMask&24)&&phase<241*341/3)trace165.badWrites.push([a,phase]);return origWrite165(a,v);};`);
 frames(h,20,['ArrowRight','KeyX']);const trace=h.json('trace165');assert.equal(trace.nmi.length,20);assert.ok(Math.max(...trace.nmi)<2000,'NMI exceeds conservative vblank budget');assert.deepEqual(trace.badWrites,[]);
});
test('Identical boot and input sequence gives identical CPU RAM, OAM and framebuffer',()=>{
 const a=boot(),b=boot();for(const [n,k] of [[8,['ArrowRight']],[5,['KeyZ','ArrowRight']],[10,[]],[8,['KeyX']],[20,[]]]){frames(a,n,k);frames(b,n,k);}assert.equal(tick(a),tick(b));for(const expr of ['emu.ram','emu.oamMem','emu.frameBuffer'])assert.equal(digest(a,expr),digest(b,expr),expr);
});

module.exports={gameplayProject,compile,built,boot,frames,state,tick,keys};
if(require.main===module)(async()=>{const results=[];for(const {name,fn} of tests){if(process.env.FORGE_TEST_FILTER&&!new RegExp(process.env.FORGE_TEST_FILTER,'i').test(name))continue;const start=Date.now();try{await fn();results.push({name,passed:true,milliseconds:Date.now()-start});process.stdout.write('PASS '+name+'\n');}catch(error){results.push({name,passed:false,milliseconds:Date.now()-start,error:error.stack});process.stdout.write('FAIL '+name+'\n  '+error.message+'\n');}}const passed=results.filter(x=>x.passed).length,report={suite:'gameplay165',html:path.basename(html),scope:'Actual generated 6502 gameplay-ROM execution in bundled emulator, compiler/configuration contracts, original synthetic art and collision fixtures. Mock DOM; browser/native-dialog and hardware-accuracy QA not implied.',passed,failed:results.length-passed,total:results.length,results};if(process.env.FORGE_TEST_REPORT)fs.writeFileSync(process.env.FORGE_TEST_REPORT,JSON.stringify(report,null,2)+'\n');process.stdout.write('\n'+passed+'/'+results.length+' passed\n');process.exitCode=passed===results.length?0:1;})();
