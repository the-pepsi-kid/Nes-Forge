'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict'),{loadForge}=require('../../app/tests/harness.cjs');
const html=path.resolve(__dirname,'../../app/mainline/NES_Forge_2.0.0-alpha.11.html'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{const baseline=JSON.parse(fs.readFileSync(path.join(__dirname,'Replay_Verification.json'))),results=[];
 for(let rev=0;rev<2;rev++){
  const name=`Mike Tyson's Punch-Out!! (U) (PRG ${rev}).nes`,bytes=new Uint8Array(fs.readFileSync(path.join(process.argv[2],name))),h=loadForge(html,{environment:{crypto:crypto.webcrypto,setTimeout,clearTimeout}}),s=h.context.Forge.services;
  s.ProjectStore.load(await s.NativeResourceProject.create(bytes,name),{sync:true});await s.InvestigationUI.whenReady();
  s.PunchOutArtUI.open('chr',0);h.run('snapshot();S.chr[1][0][0]^=1;notify("verifiedNativeChrEdit")');
  s.PunchOutArtUI.open('palette',0);h.run('snapshot();S.pal[0][1]=33;notify("verifiedNativeColorEdit")');
  const built=s.NativeResourceProject.build(s.ProjectStore.capture());assert.equal(built.metadata.changes.length,2);
  // Re-import exactly the bytes a user downloads, then execute that source from
  // reset through its original controller/main-loop/NMI/PPU/APU paths.
  s.ProjectStore.load(await s.NativeResourceProject.create(built.rom,'Reimported artwork output'),{sync:true});await s.InvestigationUI.whenReady();
  const out=await s.PunchOutReplay.run('sequence');assert.equal(out.status,'completed',out.stop);assert.equal(out.nativeOutputSha256,sha(built.rom));
  const ready=out.milestones.find(m=>m.name==='fight-ready'),prior=baseline.results.find(r=>r.revision===name).cases.find(c=>c.kind==='sequence').milestones.find(m=>m.name==='fight-ready');
  assert.equal(ready.video.palette[1],33);assert.notEqual(ready.video.pixels,prior.video.pixels);assert.equal(ready.frame,prior.frame);assert.deepEqual(Array.from(ready.hp),prior.hp);assert.deepEqual(Array.from(ready.opponentXY),prior.opponentXY);
  // Independent live PPU bus check of the emitted CHR bitplane. Preserve mapper
  // state around this read so even the verification read cannot leave a latch edit.
  h.context.expectedPattern=built.rom[0x20020];const bus=h.run('(()=>{const old=JSON.parse(JSON.stringify(emu.mmc2));emu.mmc2.latch[1]=0;const value=ppuBusRead(0x1010);Object.assign(emu.mmc2,old);return value;})()');assert.equal(bus,built.rom[0x20020]);
  assert.match(h.get('nativeAudioStatus').textContent,/Decoded 84/);assert(out.audio.writes>0);assert.deepEqual(h.errors,[]);
  results.push({revision:name,passed:true,changes:built.metadata.changes,outputSha256:sha(built.rom),reimportedOutput:true,execution:'Original engine from reset; unchanged phase/input path',nativePaletteEntry1:33,ppuPatternByteMatchesExport:true,pixelsDifferFromOriginal:true,readyFrame:ready.frame,hpAndOpponentPositionPreserved:true,audioEntries:84});console.log('PASS exported native CHR/palette playback '+name);
 }
 fs.writeFileSync(path.join(__dirname,'Art_Playback_Verification.json'),JSON.stringify({status:'passed',htmlSha256:sha(fs.readFileSync(html)),scope:'Exported/reimported native artwork output executed on existing MMC2 emulator; not hardware or external-emulator acceptance.',results},null,2)+'\n');
})().catch(e=>{console.error(e.stack);process.exitCode=1});
