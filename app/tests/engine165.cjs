#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {loadForge}=require('./harness.cjs');
const htmlPath=path.resolve(process.argv[2]||path.join(__dirname,'../mainline/NES_Forge_1.8_Audio_Runtime.html'));
const tests=[];const metrics={};const test=(name,fn)=>tests.push({name,fn});
const frame=(duration=3)=>({duration,eventMask:0,pieces:[{x:-4,y:-8,tile:1,attr:0}],hitboxes:[],hurtboxes:[{x:-6,y:-22,w:12,h:22}]});
function spec(){const idle={loop:true,frames:[frame(4),frame(6)]};return{sceneAddress:0xD000,collision:Array.from({length:960},(_,i)=>i>=28*32?1:0),physics:{moveSpeed:2,jumpSpeed:9,gravity:1,maxFallSpeed:6,bodyWidth:12,bodyHeight:22},player:{x:80,y:224,facing:0,animations:{idle,walk:{loop:true,frames:[frame(2),frame(3)]},attack:{loop:false,frames:[frame(2),{...frame(3),hitboxes:[{x:5,y:-16,w:24,h:14}],eventMask:1},frame(3)]}}},target:{x:108,y:224,facing:1,animations:{idle,hurt:{loop:false,frames:[frame(3),frame(4)]}}},staticOAM:[]};}
function boot(s){const h=loadForge(htmlPath);h.context.engineSpec=s;const engine=h.run('Forge165.makeGameplayEngine(engineSpec)');const rom=new Uint8Array(16+32768+8192);rom.set([78,69,83,26,2,1]);rom.set(engine.bytes,16);for(const [off,a]of [[0x7FFA,engine.nmi],[0x7FFC,engine.reset],[0x7FFE,engine.irq]]){rom[16+off]=a&255;rom[17+off]=a>>>8;}h.context.engineROM=rom;h.context.sy=engine.symbols;assert.equal(h.run('emuLoadRomData(engineROM,"Engine boundary fixture",0);S.tab="emu";emu.loaded'),true);h.engine=engine;for(let i=0;i<5;i++){h.run('emuRunFrame()',10000);if(h.run('emu.ram[sy.ready]'))settle(h);}return h;}
function settle(h){h.run('for(let remaining=50000;!(emu.PC===sy.labels.main&&emu.ram[sy.frameReady]===0);remaining--){if(!remaining)throw Error("6502 update did not finish");cpuStep()}',10000);}
function advance(h,keys={},count=1){h.context.testKeys=keys;h.run('clearEmuKeys();Object.assign(emuKeys,testKeys)');for(let i=0;i<count;i++){h.run('emuRunFrame()',10000);settle(h);}}
function value(h,name){return h.run('emu.ram[sy.'+name+']');}
test('Maximum supported frame work completes inside an NTSC CPU-frame budget',()=>{
  const s=spec();s.physics={moveSpeed:4,jumpSpeed:12,gravity:1,maxFallSpeed:8,bodyWidth:32,bodyHeight:48};
  for(const actor of [s.player,s.target])for(const animation of Object.values(actor.animations))for(const f of animation.frames){f.pieces=Array.from({length:24},(_,i)=>({x:-16+(i%4)*8,y:-48+Math.floor(i/4)*8,tile:1,attr:0}));f.hitboxes=Array.from({length:4},()=>({x:-16,y:-64,w:64,h:1}));f.hurtboxes=Array.from({length:4},()=>({x:-16,y:0,w:64,h:1}));f.duration=255;}
  s.staticOAM=Array.from({length:16},(_,i)=>({x:8+(i%4)*8,y:16+Math.floor(i/4)*8,tile:1,attr:0}));const h=boot(s);
  let worst=0;
  // Boot and normal updates run via emuRunFrame. Cycle accounting then invokes
  // the actual ROM's main-loop instruction stream from its NMI handshake, so
  // the finish helper cannot hide an over-budget update. X residues exercise
  // aligned/misaligned 32-pixel body edges. Both actors face left.
  for(let residue=0;residue<8;residue++)for(let yResidue=0;yResidue<8;yResidue++){
    h.context.testX=136+residue;h.context.testY=224-yResidue;h.run('clearEmuKeys();emuKeys.ArrowLeft=true;emuKeys.KeyX=true;emuKeys.KeyZ=true;emu.ram[sy.playerX]=testX;emu.ram[sy.playerY]=testY;emu.ram[sy.previousButtons]=0;emu.ram[sy.playerState]=0;emu.ram[sy.grounded]=1;emu.ram[sy.velocityY]=0;emu.ram[sy.frameReady]=1;emu.PC=sy.labels.main');
    const before=h.run('emu.cycles');h.run('cpuStep()');settle(h);const elapsed=h.run('emu.cycles')-before;worst=Math.max(worst,elapsed);assert.equal(value(h,'targetHits'),0,'fixture must exercise all 16 unsuccessful contact pairs');assert.equal(value(h,'playerY'),212-yResidue);assert.equal(value(h,'oamIndex'),0,'64 sprite entries must fit without overwriting the first entry');
  }
  assert.ok(worst+700<29780,'Main update '+worst+' + 700-cycle NMI allowance exceeds NTSC frame');assert.equal(h.errors.length,0);metrics.worstMainCycles=worst;metrics.nmiAllowance=700;metrics.ntscFrameCycles=29780;
});
test('Two-pixel player body reaches both room boundaries without byte wrap',()=>{
  const s=spec();s.physics.bodyWidth=2;s.player.x=3;s.target=null;const h=boot(s);advance(h,{ArrowLeft:true},3);assert.equal(value(h,'playerX'),1);h.run('emu.ram[sy.playerX]=253');advance(h,{ArrowRight:true},3);assert.equal(value(h,'playerX'),255);assert.equal(value(h,'grounded'),1);
});
test('Nonloop idle holds its final frame without repeatedly firing entry events',()=>{
  const s=spec();s.target=null;s.player.animations.idle={loop:false,frames:[frame(2),{...frame(2),eventMask:16}]};const h=boot(s);advance(h,{},10);const entries=value(h,'eventCount');assert.equal(value(h,'playerFrame'),1);advance(h,{},10);assert.equal(value(h,'playerFrame'),1);assert.equal(value(h,'eventCount'),entries);assert.equal(value(h,'eventMask'),0);
});
test('Offscreen signed actor offsets are hidden and facing mirrors surviving OAM',()=>{
  const s=spec();s.target=null;s.player.x=6;s.player.animations.idle={loop:true,frames:[{...frame(255),pieces:[{x:-16,y:-8,tile:1,attr:0},{x:4,y:-8,tile:2,attr:2}]}]};const h=boot(s);assert.deepEqual(h.json('Array.from(emu.ram.slice(0x200,0x208))'),[215,2,2,10,255,255,255,255]);advance(h,{ArrowLeft:true});assert.equal(value(h,'playerFacing'),1);advance(h,{});assert.deepEqual(h.json('Array.from(emu.ram.slice(0x200,0x208))'),[215,1,64,14,255,255,255,255]);
});
test('Runtime table overflow fails explicitly before gameplay metadata reservation',()=>{
  const s=spec();s.player.animations.attack.frames=Array.from({length:64},()=>({...frame(1),pieces:Array.from({length:24},()=>({x:0,y:-8,tile:1,attr:0})),hitboxes:Array.from({length:4},()=>({x:0,y:0,w:1,h:1})),hurtboxes:Array.from({length:4},()=>({x:0,y:0,w:1,h:1}))}));const h=loadForge(htmlPath);h.context.engineSpec=s;assert.throws(()=>h.run('Forge165.makeGameplayEngine(engineSpec)'),/6 KB runtime data allocation/);
});
(async()=>{const results=[];for(const {name,fn}of tests){const start=Date.now();try{await fn();results.push({name,passed:true,milliseconds:Date.now()-start});process.stdout.write('PASS '+name+'\n');}catch(error){results.push({name,passed:false,milliseconds:Date.now()-start,error:error.stack});process.stdout.write('FAIL '+name+'\n  '+error.message+'\n');}}const passed=results.filter(x=>x.passed).length;const report={suite:'engine165',html:path.basename(htmlPath),scope:'Actual bundled 6502 emulator: maximum frame-cycle budget, signed OAM edges, smallest collision body, nonloop timing and reserved-memory limits.',passed,failed:results.length-passed,total:results.length,metrics,results};if(process.env.FORGE_TEST_REPORT)fs.writeFileSync(process.env.FORGE_TEST_REPORT,JSON.stringify(report,null,2)+'\n');process.stdout.write('\n'+passed+'/'+results.length+' passed\n');process.exitCode=passed===results.length?0:1;})();
