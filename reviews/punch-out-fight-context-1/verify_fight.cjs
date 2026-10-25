'use strict';
// Supplied-input evidence. The oracle runs original routines through the actual
// emulator CPU/mapper/PPU bus; no commercial bytes or decoded assets are emitted.
const fs = require('fs'), path = require('path'), crypto = require('crypto'), assert = require('assert/strict');
const {loadForge} = require('../../app/tests/harness.cjs');
const contentApi = require('../../app/src/re/punch-out-content.js');
const arenaApi = require('../../app/src/re/punch-out-arena.js');
const fightApi = require('../../app/src/re/punch-out-fight.js');
const root = path.resolve(__dirname, '../..'), html = path.join(root, 'app/mainline/NES_Forge_2.0.0-alpha.11.html');
const hash = b => crypto.createHash('sha256').update(b).digest('hex'), plain = v => JSON.parse(JSON.stringify(v));
const identity = hash(fs.readFileSync(html)), results = [];
function fresh() { return loadForge(html, {environment: {crypto: crypto.webcrypto, setTimeout, clearTimeout}}); }
function oracle(bytes) {
  const h = fresh(); h.context.testRom = bytes;
  assert(h.run('emuLoadRomData(testRom,"Private native fight oracle",0)'));
  h.run(`function sourceCall(pc) {
    emu.PC=pc;emu.SP=0xfb;emu.ram[508]=0xee;emu.ram[509]=0x7f;let steps=0;
    while(emu.PC!==0x7fef){if(++steps>50000)throw Error('oracle source budget');cpuStepRaw();emu.PC&=65535;}
    if(emu.SP!==0xfd||emu.opsMissed)throw Error('oracle source return');
  }
  function sourceBank(n){mapperWrite(0xa000,n);}
  function sourcePose(n){emu.ram[0x60]=128;emu.ram[0x61]=n;sourceBank(11);sourceCall(0x8009);sourceDrawPrepared();}
  function sourceDrawPrepared(){if(emu.ram[0x60]&&!(emu.ram[0x60]&128)){sourceBank(11);sourceCall(0xaea5);sourceCall(0x8000);mapperWrite(0xe000,emu.ram[0x69]);}}
  function sourceSeed(){
    emu.ram.fill(0);emu.vram.fill(0);emu.vram.set(seedArena.rawPages);emu.oamMem.fill(248);
    emu.A=emu.X=emu.Y=emu.C=emu.Z=emu.D=emu.V=emu.N=0;emu.I=1;emu.cycles=0;emu.opsMissed=0;
    emu.mmc2=ForgeMMC2.create(131072,131072,1);emu.mmc2.chr=[5,seedPose.chrBank4KiB,0,1];emu.mirroring=1;
    emu.wLatch=false;emu.ppuStatus=0;emu.ppuCtrl=0x15;emu.vAddr=emu.tAddr=0;
    const r=emu.ram;r.set(seedFight.configBytes,0x5a0);r.set(seedFight.palette,0x480);r[0x48d]=32;
    r[1]=0;r[2]=seedFight.bank8KiB;r[3]=seedFight.entryOffset;r[4]=255;r[6]=1;
    r[0x10]=0x15;r[0x13]=r[0x15]=176;r[0x14]=r[0x16]=1;r[0x80]=8;r[0x81]=1;r[0x82]=255;
    r.set(seedPose.oam,0x200);r[0xa9]=seedPose.chrBank4KiB;
    sourceBank(seedFight.bank8KiB);sourceCall(0xaf43);sourceCall(0xb5a9);r[0x390]=0x81;r[0x3e7]=0x80;
    sourceBank(7);for(const pc of [0x8009,0x800c,0x8006,0x8003,0x8000])sourceCall(pc);
    sourceCall(0xae9b);for(let i=0;i<100;i++){sourceBank(7);sourceCall(0x8006);sourceCall(0xc041);}
    for(const pc of [0xc079,0xc09d,0xc0bb,0xc0e0])sourceCall(pc);
  }
  function sourceFrame(){const r=emu.ram;return {pages:Array.from(emu.vram.slice(0,2048)),oam:Array.from(r.slice(512,768)),palette:Array.from(r.slice(0x480,0x4a0),v=>v&63),scrollX:r[0x15],chr:emu.mmc2.chr};}`);
  const source = contentApi.open(bytes);
  h.context.seedFight = source.fights[0]; h.context.seedArena = arenaApi.open(bytes); h.context.seedPose = source.pose(0, 0);
  return h;
}
function compareFrame(h, f) {
  const expected = h.json('sourceFrame()');
  assert.deepEqual(f.pages, expected.pages); assert.deepEqual(f.palette, expected.palette);
  assert.deepEqual(f.oam, expected.oam); assert.deepEqual(f.mapper.chr, expected.chr);
  assert.equal(f.scrollX, expected.scrollX);
}
function comparePixels(h, source, frame) {
  h.context.frameCandidate = frame; h.context.assetsCandidate = source.project(frame);
  h.run(`emu.vram.set(frameCandidate.pages);emu.oamMem.set(frameCandidate.oam);emu.palRam.set(frameCandidate.palette);
    emu.ppuCtrl=frameCandidate.ppuCtrl;emu.ppuMask=frameCandidate.ppuMask;
    emu.mmc2=JSON.parse(JSON.stringify(frameCandidate.mapper));emu.mirroring=1;
    emu.tAddr=(frameCandidate.baseNametable<<10)|(frameCandidate.scrollX>>3);emu.fineX=frameCandidate.scrollX&7;
    for(let p=0;p<2;p++)for(let y=0;y<240;y++)renderEmuLine(y,0,0);
    var referenceScene=makeScene(assetsCandidate),projectedBG=forgeCapture.scenePixels(referenceScene,false),projectedFull=forgeCapture.scenePixels(referenceScene,true);`, 30000);
  assert.equal(h.run('forgeCapture.countPixelDifferences(projectedBG.rgba,emu.bgFrameBuffer)'), 0);
  assert.equal(h.run('forgeCapture.countPixelDifferences(projectedFull.rgba,emu.frameBuffer)'), 0);
}
(async () => {
  const dir = path.resolve(process.argv[2]), names = fs.readdirSync(dir).filter(n => n.includes("Mike Tyson's Punch-Out"));
  assert.equal(names.length, 2);
  for (const name of names) {
    const bytes = new Uint8Array(fs.readFileSync(path.join(dir, name))), original = hash(bytes);
    const source = fightApi.open(bytes), h = oracle(bytes);
    assert.equal(source.poses.filter(p => p.family === 'mac').length, 98);
    assert.equal(source.poses.filter(p => p.family === 'referee').length, 47);
    assert.equal(source.states.filter(s => s.available).length, 23);
    let nativePoseComparisons = 0, stateUpdates = 0, pixelComparisons = 0;
    for (const pose of source.poses) {
      h.run('sourceSeed()'); h.run('sourcePose(0)');
      const request = pose.family === 'mac' ? {mac: pose.selector, referee: null} : {mac: 0, referee: pose.selector};
      h.run('sourceSeed()'); h.run('sourcePose(' + request.mac + ')');
      if (request.referee !== null) h.run('sourcePose(' + request.referee + ')');
      compareFrame(h, source.compose(request)); nativePoseComparisons++;
    }
    for (const state of source.states.filter(s => s.available)) {
      h.run('sourceSeed();sourcePose(0);emu.ram[0x50]=' + (128 | state.index));
      const trace = source.tracePlayer(state.index, {maxUpdates: 120, onUpdate({ram, frame}) {
        h.run('sourceBank(11);sourceCall(0x8006);sourceCall(0x8009);sourceDrawPrepared()');
        assert.deepEqual(ram, h.json('Array.from(emu.ram)'), 'Native state RAM parity for ' + state.index);
        compareFrame(h, frame); h.run('emu.ram[0x1e]++'); stateUpdates++;
      }});
      assert.notEqual(trace.status, 'refused', trace.stop);
      assert.equal(trace.frames.reduce((n, f) => n + f.duration, 0), trace.updates);
      assert.deepEqual(source.tracePlayer(state.index, {maxUpdates: 120}), trace, 'Deterministic trace');
    }
    for (const options of [{}, {mac: 10, referee: 144}, {mac: 72, referee: 164}, {mac: 0, referee: 156}]) {
      comparePixels(h, source, source.compose(options)); pixelComparisons++;
    }
    const dodge = source.tracePlayer(3, {maxUpdates: 120});
    for (const frame of dodge.frames.filter(f => f.scrollX & 7).slice(0, 3)) {
      comparePixels(h, source, frame); pixelComparisons++;
    }
    for (const options of [{mac: -1}, {mac: 98}, {referee: 175}, {opponent: 999}]) assert.throws(() => source.compose(options));
    for (const args of [[0, {}], [15, {}], [1, {maxUpdates: 601}]]) assert.throws(() => source.tracePlayer(...args));
    const invalid = source.compose(); invalid.pages[0] = 256; assert.throws(() => source.project(invalid), /Invalid native/);
    assert.equal(hash(bytes), original); assert.deepEqual(h.errors, []);
    results.push({revision: name, passed: true, macCommands: 98, refereeCommands: 47,
      originalCpuMapperPpuCommandComparisons: nativePoseComparisons, playerStateEntries: 23,
      originalStateRamUpdatesCompared: stateUpdates, projectionFramesCompared: pixelComparisons,
      backgroundDifferentPixels: 0, compositeDifferentPixels: 0, sourcePreserved: true,
      scope: 'Declared opening pose/context and zero-input player-state paths; not complete fights or cycle-accurate timing.'});
    console.log(name + ': ' + nativePoseComparisons + ' native command comparisons, ' + stateUpdates + ' native state updates, ' + pixelComparisons + ' full-frame projections passed');
  }
  assert.equal(hash(fs.readFileSync(html)), identity);
  fs.writeFileSync(path.join(__dirname, 'Fight_Verification.json'), JSON.stringify({status: 'passed', htmlSha256: identity, results}, null, 2) + '\n');
})().catch(error => {console.error(error.stack); process.exitCode = 1;});
