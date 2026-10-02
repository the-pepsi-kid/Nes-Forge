#!/usr/bin/env node
'use strict';
// Verify original native engine with the released Forge emulator, without
// compiling/importing a Forge project. This is not a browser or console test.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(process.argv[2]||path.join(__dirname,'../../mobile-stabilization-2026-09-30/NES_Forge_1.9.0'));
const {loadForge}=require(path.join(root,'tests/harness.cjs'));
const html=path.join(root,'mainline/NES_Forge_1.9.0_Gameplay_Core.html');
const rom=new Uint8Array(fs.readFileSync(path.join(__dirname,'Bridge_Room.nes'))),manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'manifest.json')));
const checks=[];
function check(name,fn){fn();checks.push({name,passed:true});}
function boot(bytes=rom){const h=loadForge(html);h.context.fixture=bytes;assert.equal(h.run('emuLoadRomData(fixture,"Courtyard original",0)'),true);h.run('clearEmuKeys();S.tab="emu"');for(let i=0;i<20;i++)h.run('emuRunFrame()',20000);return h;}
const h=boot();
check('Original authored ROM boots with native CPU and zero missed opcodes',()=>{assert.equal(h.run('emu.ram[8]'),1);assert.equal(h.run('emu.opsMissed'),0);assert.equal(h.run('emu.ram[1]'),40);assert.equal(rom.length,40976);assert.equal(crypto.createHash('sha256').update(rom).digest('hex'),manifest.romSha256);});
check('Room and palette bytes are actually uploaded by original CPU code',()=>{assert.deepEqual(h.json('Array.from(emu.vram.slice(0,1024))'),Array.from(rom.slice(16+0x3000,16+0x3400)));assert.equal(h.run('emu.ppuCtrl'),0x88);assert.equal(h.run('emu.oamMem[3]'),36);assert.equal(h.run('emu.oamMem[0]'),199);});
fs.writeFileSync(path.join(__dirname,'original-frame.rgba'),Buffer.from(h.run('emu.frameBuffer')));
h.run('emuKeys.ArrowRight=true');for(let i=0;i<100;i++)h.run('emuRunFrame()',20000);
check('Right input stops native player at center x188 against the real solid table',()=>{assert.equal(h.run('emu.ram[1]'),188);});
h.run('clearEmuKeys();emuKeys.ArrowLeft=true');for(let i=0;i<10;i++)h.run('emuRunFrame()',20000);
check('Left input moves away from the wall at two pixels per frame',()=>{assert.equal(h.run('emu.ram[1]'),168);});
const cleared=new Uint8Array(rom);for(let y=16;y<26;y++)for(let x=24;x<26;x++)cleared[16+0x4000+y*32+x]=0;
const modified=boot(cleared);modified.run('emuKeys.ArrowRight=true');for(let i=0;i<100;i++)modified.run('emuRunFrame()',20000);
check('Clearing collision bytes alone allows original player through unchanged wall graphics',()=>{assert.equal(modified.run('emu.ram[1]'),240);assert.equal(modified.run('emu.opsMissed'),0);});
const seen=[];for(let i=0;i<200;i++){h.run('emuRunFrame()',20000);const row=h.run('emu.ram[5]'),timer=h.run('emu.apuRegs[2]|((emu.apuRegs[3]&7)<<8)');assert.equal(timer,manifest.originalSongTimers[row]);if(!seen.includes(timer))seen.push(timer);}
check('Native 16-step driver writes expected pulse periods and constant duty/volume',()=>{assert.equal(h.run('emu.apuRegs[0]'),0xbc);assert.ok(seen.length>=6);assert.equal(h.run('emu.opsMissed'),0);});
const report={format:'CourtyardNativeVerification',version:1,romSha256:manifest.romSha256,emulatorHtmlSha256:crypto.createHash('sha256').update(fs.readFileSync(html)).digest('hex'),checks,passed:checks.length,total:checks.length,observedPulseTimers:seen,frameExport:{file:'original-frame.rgba',width:256,height:240,encoding:'RGBA8888'},limits:['Bundled emulator command harness; not a real-browser, audible-output or physical-console test.','Original engine is horizontal only; rebuild deliberately uses Forge sideview behavior.']};
fs.writeFileSync(path.join(__dirname,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
