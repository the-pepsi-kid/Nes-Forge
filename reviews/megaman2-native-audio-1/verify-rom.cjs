#!/usr/bin/env node
'use strict';
// Explicitly supplied-input supplement. Stores addresses/counts/hashes only;
// excludes original ROM, decoded command bytes, sample payloads and PCM.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),cp=require('node:child_process'),os=require('node:os');
const root=path.resolve(__dirname,'../..'),{loadForge}=require(root+'/app/tests/harness.cjs'),dir=process.env.NES_FORGE_ROM_DIR;if(!dir)throw Error('Set NES_FORGE_ROM_DIR to the supplied ROM directory.');
const html=root+'/app/mainline/NES_Forge_2.0.0-alpha.11.html',bytes=new Uint8Array(fs.readFileSync(path.join(dir,'Mega Man 2 (USA).nes'))),hash=b=>crypto.createHash('sha256').update(b).digest('hex'),environment={crypto:crypto.webcrypto,structuredClone,setTimeout,clearTimeout},h=loadForge(html,{environment}),plain=x=>JSON.parse(JSON.stringify(x));
const parent=cp.execFileSync('git',['show','819838b3920987c7a47677fd40552bf5a57d5e38:app/mainline/NES_Forge_2.0.0-alpha.11.html'],{cwd:root,maxBuffer:4*1024*1024}),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'nf-mm2-oracle-')),parentPath=path.join(tmp,'parent.html');fs.writeFileSync(parentPath,parent);
const report={format:'NESForgeMegaMan2SuppliedInputVerification',version:1,htmlSha256:hash(fs.readFileSync(html)),parentHtmlSha256:hash(parent),sourceSha256:hash(bytes),started:new Date().toISOString(),checks:[],windows:[],parity:[],scope:'All cue selectors in bounded controlled execution, with exact APU/PCM parity against the unmodified parent live CPU/APU under the same controlled initial state. No listening/hardware or full song duration acceptance.'};
function check(name,fn){fn();report.checks.push({name,passed:true});console.log('PASS',name);}
(async()=>{
 assert.deepEqual(h.errors,[]);assert.equal(report.sourceSha256,'49136b412ff61beac6e40d0bbcd8691a39a50cd2744fdcdde3401eed53d71edf');assert.equal(report.parentHtmlSha256,'1ffaf54d1d25e5988cfac324018711d29fee51336ac9722b9375d413d61ea1c6');
 const catalog=await h.context.Forge.services.NativeAudioCatalog.inspect(bytes);report.catalog=plain(catalog.summary);
 check('Current source resolves 67 selectors, 24 distinct music headers, 34 effects and all aliases',()=>{assert.equal(catalog.status,'decoded');assert.equal(catalog.cues.length,67);assert.equal(catalog.summary.uniqueMusicHeaders,24);assert.equal(catalog.summary.musicSelectors,33);assert.equal(catalog.summary.effectSelectors,34);for(let id=24;id<=32;id++)assert.ok(catalog.cues[id].aliases.includes('15'));assert.equal(catalog.native.streams.length,124);assert.ok(catalog.native.streams.every(s=>['native-stop','structural-cycle'].includes(s.stopReason)));});
 const unchanged=h.context.Forge.services.ProjectStore.serialize();
 for(const cue of catalog.cues){
  const trace=await h.context.Forge.services.NativeAudioRecovery.run(bytes,{cueId:cue.id,frames:1024,samples:false});assert.equal(trace.stats.opsMissed,0);assert.ok(trace.writes.every(w=>w.fileOffset===null||w.fileOffset>=0x30010&&w.fileOffset<0x34010));
  let converted=false,reason=null;try{h.context.Forge.services.NativeAudioRecovery.transcribe(trace,{rows:64});converted=true;}catch(e){reason=e.message;}
  report.windows.push({cue:cue.id,updates:trace.frames,instructions:trace.stats.instructions,writes:trace.writes.length,unsupportedOpcodes:0,editableMusicExcerpt:converted,reason});console.log('CUE',cue.id,trace.writes.length,'writes');
 }
 check('All 67 selectors execute for 1024 native updates within bounds without mutating the project',()=>{assert.equal(report.windows.length,67);assert.ok(report.windows.every(w=>w.updates===1024));assert.equal(h.context.Forge.services.ProjectStore.serialize(),unchanged);});
 // Observe every source-data read at the original driver readers. This checks
 // static graph coverage against native execution, independently of our walker.
 const oracle=loadForge(parentPath,{environment});oracle.context.mmBytes=bytes;
 oracle.run(`emuLoadRomData(mmBytes,'Supplied MM2 oracle',0);var mmOrigRead=cpuRead,mmReads=[],mmReaderPC=null;cpuRead=function(a){if((mmReaderPC===0x8941||mmReaderPC===0x86a2)&&a>=0x8000&&a!==mmReaderPC&&a!==mmReaderPC+1)mmReads.push({pc:mmReaderPC,address:a});return mmOrigRead(a);};var mmOldRaw=cpuStepRaw;cpuStepRaw=function(){mmReaderPC=emu.PC;try{return mmOldRaw();}finally{mmReaderPC=null;}};`);
 for(const id of [0,2,15,24,33,34,42,52,66]){
  const trace=await h.context.Forge.services.NativeAudioRecovery.run(bytes,{cueId:String(id),frames:64}),selection=await h.context.Forge.services.NativeAudioCatalog.selection(bytes,String(id));oracle.context.mmCue=id;
  oracle.run(`emu.prgBank0=12*16384;emu.prgBank1=15*16384;emu.ram.fill(0);emu.sram.fill(0);emu.A=emu.X=emu.Y=emu.C=emu.Z=emu.N=emu.V=emu.D=0;emu.I=1;emu.SP=253;emu.cycles=0;apuCore.reset();var mmPCM=[],mmWrites=[],mmFrame=-1,mmOrigin=null,mmBaseWrite=cpuWrite;apuCore.onSample=v=>mmPCM.push(v);mmReads=[];
   cpuWrite=function(a,v){if((a>=0x4000&&a<=0x4013)||a===0x4015||a===0x4017)mmWrites.push({frame:mmFrame,cycles:apuCore.cycles,address:a,value:v&255,pc:mmOrigin,fileOffset:mmOrigin>=0x8000?16+(mmOrigin<0xc000?12:15)*16384+(mmOrigin&0x3fff):null});return mmBaseWrite(a,v);};
   var mmSavedRaw=cpuStepRaw;cpuStepRaw=function(){let before=mmOrigin;mmOrigin=emu.PC;try{return mmSavedRaw();}finally{mmOrigin=before;}};
   function mmCall(pc,a=0){emu.PC=pc;emu.A=a;emu.SP=253;cpuPush(0x7f);cpuPush(0xee);let steps=0;while(emu.PC!==0x7fef){if(++steps>50000)throw Error('Oracle instruction cap');cpuStep();}if(emu.SP!==253)throw Error('Oracle stack imbalance');}
   cpuWrite(0x4015,15);cpuWrite(0x4017,0xc0);mmCall(0x8003,mmCue);
   for(mmFrame=0;mmFrame<64;mmFrame++){let before=apuCore.cycles;mmCall(0x8000);apuClock(29780-(apuCore.cycles-before));}
   cpuStepRaw=mmSavedRaw;cpuWrite=mmBaseWrite;`,300000);
  assert.deepEqual(plain(trace.writes),oracle.json('mmWrites'),'Exact parent writes for cue '+id);const pcm=Buffer.from(trace.samples.buffer,trace.samples.byteOffset,trace.samples.byteLength),expected=Buffer.from(Float32Array.from(oracle.run('mmPCM')).buffer);assert.equal(hash(pcm),hash(expected));
  const covered=new Set(selection.streams.flatMap(s=>s.events.flatMap(e=>Array.from({length:e.byteLength},(_,i)=>e.cpu+i))));const reads=oracle.json('mmReads');assert.ok(reads.length>0);for(const read of reads)assert.ok(covered.has(read.address),'Static stream does not cover native source read '+read.address.toString(16)+' cue '+id);
  report.parity.push({cue:id,updates:64,writes:trace.writes.length,exactWrites:true,samples:trace.samples.length,PCMFloat32Sha256:hash(pcm),exactPCM:true,sourceReaderEvents:reads.length,allReaderAddressesCovered:true});console.log('PARITY',id,trace.writes.length);
 }
 check('Nine representative music, alias and effect windows match the unchanged parent APU writes and PCM exactly',()=>assert.equal(report.parity.length,9));
 check('Static command spans cover every native reader address in those nine independent execution windows',()=>assert.ok(report.parity.every(p=>p.allReaderAddressesCovered&&p.sourceReaderEvents>0)));
 const altered=bytes.slice();altered[altered.length-1]^=1;const unknown=await h.context.Forge.services.NativeAudioCatalog.inspect(altered);check('A one-byte ROM variant remains unknown and cannot authorize this decoder',()=>{assert.equal(unknown.status,'unknown');assert.equal(unknown.cues.length,0);assert.throws(()=>h.context.MegaMan2Audio.decode(altered,report.sourceSha256),/revision/);});
 assert.deepEqual(h.errors,[]);assert.deepEqual(oracle.errors,[]);report.status='passed';
})().catch(e=>{report.status='failed';report.error=e.stack;console.error(e.stack);process.exitCode=1}).finally(()=>{report.finished=new Date().toISOString();report.passed=report.checks.filter(c=>c.passed).length;report.failed=report.checks.filter(c=>!c.passed).length;fs.writeFileSync(path.join(__dirname,'ROM_Verification.json'),JSON.stringify(report,null,2)+'\n');fs.rmSync(tmp,{recursive:true,force:true});});
