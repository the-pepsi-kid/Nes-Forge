#!/usr/bin/env node
'use strict';
// New 1.6.3 behavior exercised through the complete application, not copies of
// production functions. Rendering checks capture pixel rectangles and colors;
// they establish sprite math, not a browser layout or hardware PPU audit.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {loadForge} = require('./harness.cjs');
const fixtures = require('./fixtures.cjs');
const {schemaFor,foundationFor,migratedFrames} = require('./version-expectations.cjs');
const htmlPath = path.resolve(process.argv[2] || path.join(__dirname,'..',JSON.parse(fs.readFileSync(path.join(__dirname,'../source-manifest.json'))).output));
const tests=[];
const test=(name,fn)=>tests.push({name,fn});
const plain=x=>JSON.parse(JSON.stringify(x));
function project() {
  const p=fixtures.project();p.version=6;p.projectName='Metasprite fixture';
  const bank=p.scenes[0].sprChr.map(t=>t.map(r=>[...r]));
  for(const n of [219,220,237])bank[n]=fixtures.tile();
  bank[219][3][2]=2;bank[220][0][0]=1;bank[220][2][6]=2;bank[237][1][3]=3;
  p.scenes[0].sprChr=bank;
  p.metasprites=[
    {id:'ms-pair',name:'Pair — left',sceneId:'scene-a',spriteMode:16,originX:2,originY:22,pieces:[{id:'piece-pair',tile:220,tile2:237,x:-3,y:6,pal:2,flipH:true,flipV:true,behind:true}]},
    {id:'ms-single',name:'Single',sceneId:'scene-a',spriteMode:8,originX:4,originY:8,pieces:[{id:'piece-single',tile:219,tile2:219,x:8,y:-2,pal:1,flipH:false,flipV:false,behind:false}]},
  ];
  p.animations=[{id:'anim-walk',name:'Walk',state:'walk',loop:true,flipOnReverse:false,frames:[{tileIdx:12,duration:7,metaspriteId:'ms-pair'},{tileIdx:0,duration:11,metaspriteId:'ms-single'},{tileIdx:219,duration:5,sceneId:'scene-a'}]}];
  return p;
}
function fresh(p=project()) {const h=loadForge(htmlPath);h.context.fixture=p;h.run('db_deserializeState(fixture);window._buildAndRunMode=true');return h;}
function build(h) {const rom=h.run('buildNesRom()',3000);assert.ok(rom instanceof Uint8Array,'ROM failed: '+h.errors.slice(-2).join('; '));h.context.rom=rom;return rom;}
function pixels(h,expression) {const calls=[];h.context.testCtx={fillStyle:'',fillRect(x,y,w,z){calls.push([x,y,w,z,this.fillStyle]);}};h.run(expression);return calls.sort((a,b)=>a[1]-b[1]||a[0]-b[0]);}
function signedChunk(h,payload) {h.context.testPayload=Uint8Array.from(payload);return h.run('(()=>{const data=testPayload,out=new Uint8Array(13+data.length),v=new DataView(out.buffer);out.set(new TextEncoder().encode("MS16"));out[4]=1;v.setUint32(5,data.length,true);v.setUint32(9,zipCRC(data),true);out.set(data,13);return out;})()');}

test('Project v6 roundtrip retains composed frames, explicit origins, source scenes, animation IDs and mixed frame sources',()=>{
  const h=fresh();const before=h.json('projectData()');assert.equal(before.version,schemaFor(h));assert.equal(before.foundation,foundationFor(h));
  h.run('window.saved=db_serializeState();S.metasprites=[];S.animations=[];db_deserializeState(saved)');
  const after=h.json('projectData()');for(const key of ['metasprites','animations','scenes','worlds'])assert.deepEqual(after[key],before[key],key);
});
test('Legacy v5 project migrates with empty composer library and playable legacy tile references',()=>{
  const h=fresh(fixtures.project());assert.deepEqual(h.json('S.metasprites'),[]);assert.equal(h.run('projectData().version'),schemaFor(h));
  assert.deepEqual(h.json('S.animations[0].frames'),migratedFrames(h,fixtures.project().animations[0].frames));
  assert.equal(h.run('Forge163.animations.resolve(S.animations[0].frames[0]).kind'),'tile');assert.ok(h.run('S.animations[0].id'));
});
test('Composer creation and composed animation assignment undo and redo as whole project edits',()=>{
  const h=fresh();h.run('Forge163.metasprites.create({name:"Extra",sceneId:"scene-a",pieces:[]})');assert.equal(h.run('S.metasprites.length'),3);
  h.run('undo()');assert.equal(h.run('S.metasprites.length'),2);h.run('redo()');assert.equal(h.run('S.metasprites.length'),3);
  h.run('S._selAnim=0;S._animFrame=2;Forge163.animations.setMetasprite("ms-pair")');assert.equal(h.run('S.animations[0].frames[2].metaspriteId'),'ms-pair');
  h.run('undo()');assert.equal(h.run('S.animations[0].frames[2].metaspriteId'),undefined);assert.equal(h.run('S.animations[0].frames[2].tileIdx'),219);
  h.run('redo()');assert.equal(h.run('S.animations[0].frames[2].metaspriteId'),'ms-pair');
});
for(const [name,mutate] of [
  ['duplicate frame ID',p=>p.metasprites[1].id=p.metasprites[0].id],
  ['duplicate piece ID',p=>p.metasprites[0].pieces.push({...p.metasprites[0].pieces[0]})],
  ['tile outside CHR bank',p=>p.metasprites[0].pieces[0].tile=256],
  ['fractional coordinate',p=>p.metasprites[0].pieces[0].x=0.5],
  ['invalid sprite mode',p=>p.metasprites[0].spriteMode=12],
  ['nonboolean flip',p=>p.metasprites[0].pieces[0].flipV='false'],
  ['zero duration',p=>p.animations[0].frames[0].duration=0],
  ['too many pieces',p=>p.metasprites[0].pieces=Array.from({length:129},(_,i)=>({...p.metasprites[0].pieces[0],id:'p'+i}))],
])test('Invalid v6 '+name+' rejects atomically before current project or history changes',()=>{
  const h=fresh();h.run('snapshot();S.projectName="Unsaved work"');const before=h.json('projectData()'),history=h.run('undoStack.length');const bad=project();mutate(bad);h.context.bad=bad;
  assert.throws(()=>h.run('db_deserializeState(bad)'));assert.deepEqual(h.json('projectData()'),before);assert.equal(h.run('undoStack.length'),history);
});
test('Metasprite-only CHR tiles, including both nonadjacent 8x16 source tiles, survive generated ROM linking',()=>{
  const p=project(),h=fresh(p);build(h);const parsed=h.run('Forge163.build.readRomAssets(rom)');assert.equal(parsed.frames.length,2);
  h.run('window.builtSpr=decodeTiles(rom,parseRomHeader(rom).headerSize+parseRomHeader(rom).prgSize+4096)');
  for(const f of parsed.frames){const original=p.metasprites.find(x=>x.id===f.id);for(let i=0;i<f.pieces.length;i++){h.context.a=f.pieces[i].tile;assert.deepEqual(h.json('builtSpr[a]'),p.scenes[0].sprChr[original.pieces[i].tile]);if(f.spriteMode===16){h.context.a=f.pieces[i].tile2;assert.deepEqual(h.json('builtSpr[a]'),p.scenes[0].sprChr[original.pieces[i].tile2]);}}}
});
test('Custom ASM retains fixed sprite tile IDs for composed and legacy animation graphics',()=>{
  const h=fresh();h.get('codeInput').value=fixtures.customASM;build(h);const parsed=plain(h.run('Forge163.build.readRomAssets(rom)'));
  assert.equal(parsed.frames[0].pieces[0].tile,220);assert.equal(parsed.frames[0].pieces[0].tile2,237);assert.equal(parsed.frames[1].pieces[0].tile,219);assert.equal(parsed.animations[0].frames[2].tileIdx,219);
});
test('A metasprite sourced from an excluded scene fails the build explicitly',()=>{
  const p=project(),b=fixtures.scene('scene-b');b.buildInclude=false;p.scenes.push(b);p.metasprites[0].sceneId='scene-b';const h=fresh(p);
  assert.equal(h.run('buildNesRom()'),null);assert.match(h.errors.at(-1)||'',/excluded/i);
});
test('Dangling animation frame and source scene references fail the linker without producing a ROM',()=>{
  const h=fresh();h.run('S.animations[0].frames[0].metaspriteId="missing-frame"');assert.equal(h.run('buildNesRom()'),null);assert.match(h.errors.at(-1)||'',/missing metasprite/i);
  h.run('S.animations[0].frames[0].metaspriteId="ms-pair";S.metasprites[0].sceneId="missing-scene"');assert.equal(h.run('buildNesRom()'),null);assert.match(h.errors.at(-1)||'',/missing source scene/i);
});
test('MS16 checksum detects a mutated payload and length check rejects truncation',()=>{
  const h=fresh();h.run('window.chunk=Forge163.build.encodeAssets(Forge15.build.plan())');h.run('window.badChunk=chunk.slice();badChunk[badChunk.length-1]^=1');assert.throws(()=>h.run('Forge163.build.decodeAssets(badChunk)'),/checksum/i);
  assert.throws(()=>h.run('Forge163.build.decodeAssets(chunk.slice(0,-1))'),/length/i);
});
test('MS16 structural bounds reject recomputed-checksum oversized counts, short records, and trailing bytes',()=>{
  const h=fresh();for(const [payload,message] of [[[1,1],/too many.*frames/i],[[1,0,1,0,65],/truncated/i],[[0,0,0,0,99],/trailing/i]]){h.context.badChunk=signedChunk(h,payload);assert.throws(()=>h.run('Forge163.build.decodeAssets(badChunk)'),message);}
});
test('MS16 preserves Unicode names, signed geometry, attributes, mixed animation sources and durations',()=>{
  const h=fresh();build(h);const decoded=plain(h.run('Forge163.build.readRomAssets(rom)'));const source=project();
  assert.equal(decoded.frames[0].name,'Pair — left');assert.deepEqual([decoded.frames[0].originX,decoded.frames[0].originY,decoded.frames[0].pieces[0].x,decoded.frames[0].pieces[0].y],[2,22,-3,6]);
  assert.deepEqual(['pal','behind','flipH','flipV'].map(k=>decoded.frames[0].pieces[0][k]),[2,true,true,true]);assert.deepEqual(decoded.animations[0].frames.map(f=>f.duration),[7,11,5]);assert.equal(decoded.animations[0].frames[0].metaspriteId,source.metasprites[0].id);
});
test('Importing the built ROM into its original project remaps frame/animation IDs and preserves rendered pixels',()=>{
  const h=fresh();const before=pixels(h,'Forge163.metasprites.draw(testCtx,S.metasprites[0],100,120,2)');const ids=h.json('S.metasprites.map(f=>f.id)'),sceneCount=h.run('S.scenes.length');build(h);
  assert.equal(h.run('importRom(rom,"Metasprites.nes")',15000),true,h.errors.join('; '));assert.equal(h.run('S.metasprites.length'),4);assert.equal(h.run('S.animations.length'),2);
  const after=pixels(h,'Forge163.metasprites.draw(testCtx,S.metasprites[2],100,120,2)');assert.deepEqual(after,before);
  const loaded=h.json('S.metasprites');assert.deepEqual(loaded.slice(0,2).map(f=>f.id),ids);assert.equal(new Set(loaded.map(f=>f.id)).size,4);assert.equal(h.run('S.animations[1].frames[0].metaspriteId===S.metasprites[2].id'),true);assert.equal(h.run('S.animations[1].frames[1].metaspriteId===S.metasprites[3].id'),true);
  assert.equal(h.run('S.animations[1].id!==S.animations[0].id'),true);assert.equal(h.run('S.metasprites[2].sceneId===S.scenes['+sceneCount+'].id'),true);
});
test('Corrupt MS16 ROM import leaves existing scenes, worlds, frames, animations and history intact',()=>{
  const h=fresh();const rom=build(h);const signature=Buffer.from('MS16');const start=Buffer.from(rom).indexOf(signature);assert.ok(start>=0);rom[start+13]^=1;const before=h.json('projectData()'),history=h.run('undoStack.length');
  assert.equal(h.run('importRom(rom,"Corrupt.nes")',15000),false);assert.deepEqual(h.json('projectData()'),before);assert.equal(h.run('undoStack.length'),history);
});
test('Old Forge packed ROM with no MS16 metadata still imports without inventing composer assets',()=>{
  const p=fixtures.project();p.animations=[];const h=fresh(p);build(h);assert.equal(h.run('Forge163.build.readRomAssets(rom)'),null);assert.equal(h.run('importRom(rom,"Old Forge.nes")',15000),true);assert.equal(h.run('S.metasprites.length'),0);
});
test('Ordinary iNES ROM without a Forge marker stays compatible with original import path',()=>{
  const p=fixtures.project();p.animations=[];const h=fresh(p),rom=build(h);rom.fill(0,16+0xFF0,16+0x1000);
  assert.equal(h.run('Forge163.build.readRomAssets(rom)'),null);assert.equal(h.run('importRom(rom,"Original.nes")',20000),true,h.errors.join('; '));assert.equal(h.run('S.metasprites.length'),0);
});
test('Animation bounds use authored origins across differently sized composite frames',()=>{
  const h=fresh();assert.deepEqual(h.json('Forge163.animations.frameBounds(S.animations[0].frames[0])'),{x:-5,y:-16,w:8,h:16});assert.deepEqual(h.json('Forge163.animations.animationBounds(S.animations[0])'),{x:-5,y:-16,w:17,h:20});
});
test('Animation draw applies 8x16 vertical tile swap, both flips, palette and authored anchor exactly',()=>{
  const h=fresh();const colors=h.json('NP');const got=pixels(h,'Forge163.animations.drawFrame(testCtx,S.animations[0].frames[0],100,120,2)');
  const expected=[[98,100,2,2,'rgb('+colors[40].join(',')+')'],[92,114,2,2,'rgb('+colors[24].join(',')+')'],[104,118,2,2,'rgb('+colors[8].join(',')+')']];assert.deepEqual(got,expected);
  const composite=pixels(h,'Forge163.metasprites.draw(testCtx,S.metasprites[0],100,120,2)');assert.deepEqual(got,composite);
});
test('Legacy animation pixels use live active CHR and remain available after switching away from a metasprite',()=>{
  const h=fresh();h.run('S._selAnim=0;S._animFrame=0;Forge163.animations.setFrameSource("tile")');assert.equal(h.run('S.animations[0].frames[0].tileIdx'),12);assert.equal(h.run('S.animations[0].frames[0].metaspriteId'),undefined);
  h.run('S.sprChr[12]=Array.from({length:8},()=>Array(8).fill(0));S.sprChr[12][7][1]=3');const pixelsOut=pixels(h,'Forge163.animations.drawFrame(testCtx,S.animations[0].frames[0],10,20,1)');assert.equal(pixelsOut.length,1);assert.deepEqual(pixelsOut[0].slice(0,4),[7,23,1,1]);
});
test('Missing composed assets return a visible-preview error instead of silently drawing a legacy tile',()=>{
  const h=fresh();h.run('S.animations[0].frames[0].metaspriteId="missing"');assert.equal(h.run('Forge163.animations.resolve(S.animations[0].frames[0]).kind'),'missing');assert.deepEqual(pixels(h,'Forge163.animations.drawFrame(testCtx,S.animations[0].frames[0],10,20,1)'),[]);
});

test('Project saves retain long legacy animation names and sequences while ROM limits reject them explicitly',()=>{
  const h=fresh();h.run('S.animations[0].name="Long "+"x".repeat(400);S.animations[0].frames=Array.from({length:1025},()=>({...S.animations[0].frames[0]}));window.largeAnimationProject=db_serializeState();db_deserializeState(largeAnimationProject)');
  assert.equal(h.run('S.animations[0].name.length'),405);assert.equal(h.run('S.animations[0].frames.length'),1025);
  h.run('window._buildAndRunMode=true');assert.equal(h.run('buildNesRom()'),null);assert.equal(h.run('window._lastBuiltRom'),null);
});

(async()=>{const results=[];for(const {name,fn} of tests){const start=Date.now();try{await fn();results.push({name,passed:true,milliseconds:Date.now()-start});process.stdout.write('PASS '+name+'\n');}catch(error){results.push({name,passed:false,milliseconds:Date.now()-start,error:error.stack});process.stdout.write('FAIL '+name+'\n  '+error.message+'\n');}}
const passed=results.filter(x=>x.passed).length,report={html:path.basename(htmlPath),scope:'1.6.3 full-script persistence, ROM and animation regressions; Node VM with mock DOM and recorded sprite draw operations.',passed,failed:results.length-passed,total:results.length,results};if(process.env.FORGE_TEST_REPORT)fs.writeFileSync(process.env.FORGE_TEST_REPORT,JSON.stringify(report,null,2)+'\n');process.stdout.write('\n'+passed+'/'+results.length+' passed\n');process.exitCode=passed===results.length?0:1;})();
