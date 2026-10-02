#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {loadForge} = require('./harness.cjs');
const fixtures = require('./fixtures.cjs');
const {migratedFrames} = require('./version-expectations.cjs');

const htmlPath = path.resolve(process.argv[2] || path.join(__dirname, '../mainline/NES_Forge_1.8_Audio_Runtime.html'));
const tests = [];
const test = (name, fn) => tests.push({name, fn});
function fresh(data = fixtures.project()) {
  const h = loadForge(htmlPath); h.context.fixture = data;
  h.run('db_deserializeState(fixture); window._buildAndRunMode = true;');
  return h;
}
function build(h, timeout = 2500) {
  const rom = h.run('buildNesRom()', timeout);
  assert.ok(rom instanceof Uint8Array, 'Build returned no ROM: ' + h.errors.slice(-2).join('; '));
  return rom;
}
function plain(x) { return JSON.parse(JSON.stringify(x)); }
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => {resolve = a; reject = b;}); return {promise,resolve,reject}; };

test('Emulator, provenance capture, and Save As/CHR source blocks match supplied 1.6.2 baseline exactly', () => {
  const source=fs.readFileSync(htmlPath,'utf8');
  for(const expected of require('./preserved-source.json').sections){
    const start=source.indexOf(expected.start),end=source.indexOf(expected.end,start+1);assert.ok(start>=0&&end>start,expected.name+' bounds');
    const block=source.slice(start,end);assert.equal(Buffer.byteLength(block),expected.bytes,expected.name+' length');
    assert.equal(crypto.createHash('sha256').update(block).digest('hex'),expected.sha256,expected.name+' SHA-256');
  }
});

test('Complete application script initializes without an application error', () => {
  const h = loadForge(htmlPath);
  assert.equal(h.errors.length, 0, h.errors.join('\n'));
  assert.equal(h.run('S.scenes.length'), 1);
  assert.ok(h.context.Forge161.worlds && h.context.Forge16.metatiles && h.context.forgeSave);
});
test('CHR bitplanes roundtrip every pixel value and preserve bank offsets', () => {
  const h = fresh();
  h.run('window.testTiles=Array.from({length:256},(_,i)=>Array.from({length:8},(_,y)=>Array.from({length:8},(_,x)=>(i+x+y)%4))); window.bytes=encodeTiles(testTiles); window.twoBanks=new Uint8Array(8192); twoBanks.set(bytes,4096);');
  assert.deepEqual(h.json('decodeTiles(twoBanks,4096)'), h.json('testTiles'));
  assert.equal(h.run('bytes.length'), 4096);
});
test('Palette normalization shares universal background and clamps NES colors', () => {
  const h = fresh();
  assert.deepEqual(h.json('normalizePal([[1,-3,77,20]],15)[0]'), [15,0,63,20]);
  assert.ok(h.json('normalizePal(null,9)').every(p => p[0] === 9 && p.length === 4));
});
test('Portable project roundtrip retains worlds, definitions, links, CHR, and animation', () => {
  const h = fresh();
  const before = h.json('projectData()');
  h.run('window.savedProject=db_serializeState(); S.projectName="Changed"; S.worlds=[]; db_deserializeState(savedProject)');
  const after = h.json('projectData()');
  for (const key of ['projectName','worlds','scenes','animations','chr','sprChr']) assert.deepEqual(after[key], before[key], key);
});
for (const version of [undefined, 2, 3, 4]) test('Legacy schema ' + (version ?? 'unversioned') + ' loads with absent worlds and valid empty metatile defaults', () => {
  const p = fixtures.project(); p.version = version; delete p.worlds;
  if (version !== 4) { delete p.scenes[0].metatiles; delete p.scenes[0].metaMap; }
  if (!version) { p.nt = Array(960).fill(3); }
  const h = fresh(p);
  assert.equal(h.run('S.worlds.length'), 0);
  assert.equal(h.run('S.scenes[0].metaMap.length'), 240);
  assert.deepEqual(h.json('S.animations[0].frames'), migratedFrames(h,p.animations[0].frames));
  if (!version) assert.equal(h.run('S.nt[400]'), 3);
});
test('Future schemas and malformed collections fail before replacing current project', () => {
  const h = fresh(); const name = h.state().projectName;
  for (const bad of [{...fixtures.project(), version: 999}, {...fixtures.project(), worlds: {}}, {...fixtures.project(), animations: {}}]) {
    h.context.bad = bad; assert.throws(() => h.run('db_deserializeState(bad)'));
    assert.equal(h.state().projectName, name);
  }
});
test('Malformed map dimensions and unknown metatile references are rejected', () => {
  const h = fresh();
  const a = fixtures.project(); a.worlds[0].map.pop(); h.context.bad = a;
  assert.throws(() => h.run('db_deserializeState(bad)'), /map size/i);
  const b = fixtures.project(); b.scenes[0].metaMap[10] = 99; h.context.bad = b;
  assert.throws(() => h.run('db_deserializeState(bad)'), /unknown definition/i);
});
test('Undo and redo restore project data including world destinations', () => {
  const h = fresh(); const before = h.json('S.worlds');
  h.run('snapshot(); S.worlds[0].map[20]=7; S.worlds[0].markers[0].targetMarkerId=""; S.projectName="Edited"; undo()');
  assert.deepEqual(h.json('S.worlds'), before); assert.equal(h.state().projectName, 'Regression fixture');
  h.run('redo()'); assert.equal(h.run('S.worlds[0].map[20]'), 7); assert.equal(h.state().projectName, 'Edited');
  assert.equal(h.run('S.worlds[0].markers[0].targetMarkerId'), '');
});
test('New edits clear redo while history stays isolated from new project load', () => {
  const h = fresh(); h.run('snapshot(); S.projectName="A"; undo(); snapshot(); S.projectName="B"; redo()');
  assert.equal(h.state().projectName, 'B');
  h.run('db_deserializeState(fixture); undo()'); assert.equal(h.state().projectName, 'Regression fixture');
});
test('Metatile brush writes four nametable quadrants and survives serialization', () => {
  const h = fresh();
  h.run('Forge16.metatiles.paint(18,7)');
  assert.deepEqual(h.json('[S.nt[68],S.nt[69],S.nt[100],S.nt[101]]'), [1,2,3,1]);
  assert.equal(h.run('S.scenes[0].metaMap[18]'), 7);
  h.run('db_deserializeState(db_serializeState())'); assert.equal(h.run('S.scenes[0].metaMap[18]'), 7);
});
test('Raw tile changes detach a mismatching metatile without changing its definition', () => {
  const h = fresh(); h.run('S.nt[0]=0; saveCurrentScene()');
  assert.equal(h.run('S.scenes[0].metaMap[0]'), -1);
  assert.deepEqual(h.json('S.scenes[0].metatiles[0].tiles'), [1,2,3,1]);
});
test('World resize preserves coordinate positions and fills new area with empty cells', () => {
  const h = fresh(); h.run('S.worlds[0].map[17]=7; Forge161.worlds.resize(S.worlds[0],2,2)');
  assert.equal(h.run('S.worlds[0].map.length'), 960);
  assert.equal(h.run('S.worlds[0].map[33]'), 7);
  assert.equal(h.run('S.worlds[0].map[17]'), -1);
  h.run('Forge161.worlds.resize(S.worlds[0],1,1)'); assert.equal(h.run('S.worlds[0].map[17]'), 7);
});
test('World creation selects an existing metatile scene when the active scene has no library', () => {
  const p = fixtures.project(); const empty = fixtures.scene('scene-empty'); empty.metatiles=[];empty.metaMap=Array(240).fill(-1);p.scenes.push(empty);p.activeScene=1;
  const h=fresh(p);h.run('Forge161.worlds.create(true)');
  assert.equal(h.run('S.worlds[2].tilesetSceneId'), 'scene-a');
  assert.equal(h.run('Forge161.worlds.state.brush'),7);
});
test('Assembler emits known 6502 bytes, labels, branches, strings, and vectors', () => {
  const h=fresh(); h.get('codeInput').value='.org $C000\nstart:\n lda #$2A\n sta $0200\n bne start\n .byte "A;B", $FF\n.org $FFFA\n .word start,start,start';
  assert.equal(h.run('asm_assemble()'), true, JSON.stringify(h.json('S.asmErrors')));
  assert.deepEqual(h.json('S._asmWrites.filter(x=>x[0]<0xC007).map(x=>x[1])'), [0xA9,0x2A,0x8D,0,2,0xD0,0xF9]);
  assert.deepEqual(h.json('S._asmWrites.filter(x=>x[0]>=0xFFFA).map(x=>x[1])'), [0,0xC0,0,0xC0,0,0xC0]);
  assert.equal(h.run('S.asmSymbols.start'), 0xC000);
});
test('Assembler reports out-of-range branches and undefined symbols', () => {
  const h=fresh();
  for (const source of ['.org $C000\n bne distant\n.org $C200\ndistant: nop', '.org $C000\n jmp missing']) {
    h.get('codeInput').value=source; assert.equal(h.run('asm_assemble()'), false); assert.ok(h.run('S.asmErrors.length')>0);
  }
});
test('Default generated ROM has a valid NROM header, vectors, and Forge marker', () => {
  const h=fresh();const rom=build(h);h.context.rom=rom;
  assert.equal(rom.length,24592);assert.deepEqual(Array.from(rom.slice(0,7)),[78,69,83,26,1,1,1]);
  assert.equal(h.run('parseRomHeader(rom).mapper'),0);
  assert.equal(Buffer.from(rom.slice(16+0xFF0,16+0xFF8)).toString(),'NFORGE15');
  const reset=rom[16+0x3FFC] | rom[16+0x3FFD]<<8;assert.ok(reset>=0xC000&&reset<0xCFF0);
});
test('Custom ASM occupying $C200 advances metadata placement and preserves code', () => {
  const h=fresh();h.get('codeInput').value=fixtures.collisionASM;const rom=build(h,1500);
  const ext=rom[16+0xFFA]|rom[16+0xFFB]<<8;assert.ok(ext>0xC200,'Extension must move past occupied byte');
  assert.equal(rom[16+0x200],0xAA);
});
test('Exhausted metadata space fails promptly with a capacity message', () => {
  const h=fresh();h.get('codeInput').value=fixtures.customASM.replace('.org $FFFA','.org $C200\n .byte '+Array(0xDF0).fill('0').join(',')+'\n.org $FFFA');
  assert.equal(h.run('buildNesRom()',2000),null);
  assert.match(h.errors.at(-1)||'',/contiguous|capacity|space/i);
});
test('Missing interrupt vectors fail custom ROM generation', () => {
  const h=fresh();h.get('codeInput').value='.org $C000\n nop';assert.equal(h.run('buildNesRom()'),null);
  assert.match(h.errors.at(-1)||'',/vectors/i);
});
test('Build excludes unselected scenes and rejects a world using an excluded tileset', () => {
  const p=fixtures.project();p.scenes[0].buildInclude=false;const s=fixtures.scene('scene-b');s.buildOrder=1;p.scenes.push(s);
  const h=fresh(p);assert.equal(h.run('buildNesRom()'),null);assert.match(h.errors.at(-1)||'',/excluded/i);
});
test('World-only metatiles fail preflight when their definition cannot be included in MT16', () => {
  const p=fixtures.project();p.scenes[0].metaMap=Array(240).fill(-1);const h=fresh(p);
  assert.equal(h.run('buildNesRom()'),null);assert.match(h.errors.at(-1)||'',/not linked/i);
});
test('ROM re-import restores world coordinates, rooms, camera modes, and valid tileset references', () => {
  const h=fresh();h.context.rom=build(h);assert.equal(h.run('importRom(rom,"Fixture.nes")',15000),true,h.errors.join('; '));
  assert.equal(h.run('S.worlds.length'),2);
  assert.equal(h.run('S.worlds[0].map[0]'),7);
  assert.equal(h.run('S.worlds[0].rooms[0].w'),8);
  assert.equal(h.run('S.worlds[0].cameraRegions[0].mode'),'locked');
  assert.equal(h.run('S.worlds.every(w=>S.scenes.some(sc=>sc.id===w.tilesetSceneId))'),true);
});
test('ROM re-import keeps cross-world and same-world marker destinations resolvable', () => {
  const h=fresh();h.context.rom=build(h);assert.equal(h.run('importRom(rom,"Fixture.nes")',15000),true,h.errors.join('; '));
  assert.equal(h.run('S.worlds.every(w=>w.markers.every(m=>!m.targetWorldId||S.worlds.some(t=>t.id===m.targetWorldId&&(!m.targetMarkerId||t.markers.some(q=>q.id===m.targetMarkerId)))))'),true);
  assert.equal(h.run('S.worlds[0].markers[0].targetMarkerId'),'entrance-b');
  assert.equal(h.run('S.worlds[1].markers[0].targetWorldId'),'world-a');
});
test('Generated scene viewer boots and produces nonempty framebuffer through actual emulator', () => {
  const h=fresh();h.context.rom=build(h);assert.equal(h.run('emuLoadRomData(rom,"Fixture",4)',10000),true,h.errors.join('; '));
  assert.equal(h.run('emu.frameCount'),4);
  assert.ok(h.run('new Set(Array.from({length:256*240},(_,i)=>emu.frameBuffer[i*4]+","+emu.frameBuffer[i*4+1]+","+emu.frameBuffer[i*4+2])).size')>1);
  assert.ok(h.run('emu.PC')>=0xC000);
});
test('iNES parser rejects bad signature, unsupported NES 2.0, and truncated image', () => {
  const h=fresh();h.context.rom=build(h);
  for(const source of ['rom.slice(0,30)','Uint8Array.from(rom,(v,i)=>i===0?0:v)','Uint8Array.from(rom,(v,i)=>i===7?8:v)'])assert.throws(()=>h.run('parseRomHeader('+source+')'));
});
test('Save As request and explicit cancellation produce no download', async () => {
  const h=fresh();const before=h.metrics();const request=h.context.forgeSave.request('payload','cancel.nes');
  assert.deepEqual(h.metrics(),before);h.context.forgeSave.cancel();assert.equal((await request).status,'cancelled');assert.deepEqual(h.metrics(),before);
});
test('Native picker cancellation never triggers fallback browser download', async () => {
  const h=fresh();h.context.showSaveFilePicker=async()=>{const e=new Error('cancelled');e.name='AbortError';throw e;};
  const request=h.context.forgeSave.request('payload','cancel.nes');await h.get('forgeSaveChoose').onclick();
  assert.equal((await request).status,'cancelled');assert.deepEqual(h.metrics(),{objectURLs:0,downloadClicks:0});
});
test('Native save resolves successfully only after writable stream close completes', async () => {
  const h=fresh();const closing=deferred();let written=null,closeCalled=false,resolved=false;
  h.context.showSaveFilePicker=async()=>({name:'chosen.nes',createWritable:async()=>({write:async b=>{written=await b.text();},close:()=>{closeCalled=true;return closing.promise;}})});
  const request=h.context.forgeSave.request('payload','test.nes');request.then(()=>resolved=true);const choosing=h.get('forgeSaveChoose').onclick();
  for(let i=0;i<12;i++)await Promise.resolve();
  assert.equal(written,'payload');assert.equal(closeCalled,true);assert.equal(resolved,false);
  closing.resolve();await choosing;assert.equal((await request).status,'saved');assert.deepEqual(h.metrics(),{objectURLs:0,downloadClicks:0});
});
test('Writable close failure aborts stream, leaves Save As retryable, and never downloads', async () => {
  const h=fresh();let aborted=0;
  h.context.showSaveFilePicker=async()=>({name:'broken.nes',createWritable:async()=>({write:async()=>{},close:async()=>{throw new Error('disk full');},abort:async()=>aborted++})});
  const request=h.context.forgeSave.request('payload','test.nes');await h.get('forgeSaveChoose').onclick();
  assert.equal(aborted,1);assert.equal(h.context.forgeSave.lastError.message,'disk full');assert.equal(h.get('forgeSaveChoose').disabled,false);
  assert.deepEqual(h.metrics(),{objectURLs:0,downloadClicks:0});h.context.forgeSave.cancel();assert.equal((await request).status,'cancelled');
});
test('Explicit browser download is reported as requested, with sanitized filename', async () => {
  const h=fresh();const request=h.context.forgeSave.request('payload','bad/name?.nes');h.get('forgeSaveBrowser').onclick();
  const result=await request;assert.equal(result.status,'download-requested');assert.equal(result.name,'bad_name_.nes');assert.deepEqual(h.metrics(),{objectURLs:1,downloadClicks:1});
});
test('A concurrent Save As request cannot replace the pending export', async () => {
  const h=fresh();const first=h.context.forgeSave.request('one','one.nes');
  assert.equal((await h.context.forgeSave.request('two','two.nes')).status,'busy');
  h.context.forgeSave.cancel();assert.equal((await first).name,'one.nes');
});

if (fs.readFileSync(htmlPath,'utf8').includes('MS16 v1 authoring preservation')) {
  require('./composer-cases.cjs')({test,fresh,fixtures,assert,build});
}

(async () => {
  const results=[];
  for(const {name,fn} of tests){const start=Date.now();try{await fn();results.push({name,passed:true,milliseconds:Date.now()-start});process.stdout.write('PASS '+name+'\n');}catch(error){results.push({name,passed:false,milliseconds:Date.now()-start,error:error.stack});process.stdout.write('FAIL '+name+'\n  '+error.message+'\n');}}
  const passed=results.filter(r=>r.passed).length;
  const report={html:path.basename(htmlPath),sha256:crypto.createHash('sha256').update(fs.readFileSync(htmlPath)).digest('hex'),scope:'Reconstructed regression suite; not a reproduction of the historical 344-check report. Full inline script executed in Node VM with lightweight DOM/canvas/timer mocks.',passed,failed:results.length-passed,total:results.length,results};
  if(process.env.FORGE_TEST_REPORT)fs.writeFileSync(process.env.FORGE_TEST_REPORT,JSON.stringify(report,null,2)+'\n');
  process.stdout.write(`\n${passed}/${results.length} passed\n`);process.exitCode=passed===results.length?0:1;
})();
