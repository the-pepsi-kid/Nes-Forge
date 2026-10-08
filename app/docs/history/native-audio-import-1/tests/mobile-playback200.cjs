#!/usr/bin/env node
'use strict';
// Real standalone application; deterministic host clocks/audio sink exercise the
// scheduler. Only that scheduler fixture substitutes emuRunFrame with a declared
// fixed-cost frame producer. Capture contracts use the real CPU/PPU/capture paths.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {loadForge}=require('./harness.cjs');
const root=path.resolve(__dirname,'..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'),'utf8'));
const html=path.resolve(process.argv[2]||path.join(root,manifest.output)),baseline=path.join(root,'baseline/NES_Forge_2.0.0-alpha.1_Audio_Correction.html');
const sha=data=>crypto.createHash('sha256').update(Buffer.from(data)).digest('hex'),baselineSha='4cdf7167c0c141e516416c8acabd6854cd979c5fd10e8f8b248514a3ba999aa0';
assert.equal(sha(fs.readFileSync(baseline)),baselineSha,'Capture oracle must be the exact previously delivered application');
const tests=[],metrics={},test=(name,fn)=>tests.push({name,fn});
const FRAME=1000/60.0988;
function rom(mapper=0,chrBanks=1){const b=new Uint8Array(16+32768+chrBanks*8192);b.set([78,69,83,26,2,chrBanks,(mapper&15)<<4,mapper&240]);b.fill(0xea,16,16+32768);b.set([0x4c,0,0x80],16);for(const p of[0x7ffa,0x7ffc,0x7ffe])b.set([0,0x80],16+p);for(let i=0;i<chrBanks*8192;i++)b[16+32768+i]=((i*29)^(i>>4)^(i>>9)*73)&255;return b;}
function fresh(file=html,options={}){const h=loadForge(file,{environment:{crypto:crypto.webcrypto,...options}});assert.deepEqual(h.errors,[]);return h;}
function load(h,bytes=rom(),name='Mobile regression'){h.context.mobileROM=Uint8Array.from(bytes);assert.equal(h.run('emuLoadRomData(mobileROM,"'+name+'",0);S.tab="emu";emu.loaded'),true);}
function clocked(cost=11,file=html){
 const clock={now:0,nextId:0,raf:new Map(),pendingSources:new Set(),audioStarts:[],cost};
 const reap=()=>{for(const s of [...clock.pendingSources])if(s.end<=clock.now/1000){clock.pendingSources.delete(s);s.onended?.();}};
 class AC{constructor(){this.state='running';this.destination={};}get currentTime(){reap();return clock.now/1000;}createGain(){return {gain:{value:1,setValueAtTime(){}},connect(){}};}createBuffer(ch,n,rate){return {duration:n/rate,getChannelData:()=>new Float32Array(n)};}createBufferSource(){const s={connect(){},disconnect(){},stop(){clock.pendingSources.delete(s);},start(at){s.end=at+s.buffer.duration;clock.pendingSources.add(s);clock.audioStarts.push({start:at,end:s.end,host:clock.now/1000});}};return s;}resume(){this.state='running';return Promise.resolve();}}
 const h=fresh(file,{performance:{now:()=>clock.now},AudioContext:AC,requestAnimationFrame:fn=>{const id=++clock.nextId;clock.raf.set(id,fn);return id;},cancelAnimationFrame:id=>clock.raf.delete(id)});load(h);
 h.context.mobileClock=clock;
 // Controlled frame completion cost isolates scheduling from machine speed;
 // actual apuReceiveSample/apuFlush and audio source lifetime remain untouched.
 h.run('emuRunFrame=function(){emu.frameCount++;mobileClock.now+=mobileClock.cost;for(var i=0;i<Math.round(APU_SAMPLE_RATE/60.0988);i++)apuReceiveSample(0.05);};');
 h.run('emuToggleRun()');
 const fire=(timestamp)=>{clock.now=Math.max(clock.now,timestamp);reap();const id=h.run('emu.rafId'),fn=clock.raf.get(id);assert.ok(fn,'Running emulator must own one queued animation callback');clock.raf.delete(id);fn(timestamp);return h.run('emu.frameCount');};
 return {h,clock,fire,state:()=>h.json('({frame:emu.frameCount,running:emu.running,perf:emuPerf,audio:apuStats,backlog:emuAccumulator,queued:apuNextTime-(apuCtx?apuCtx.currentTime:0),sources:apuSources.size})')};
}

test('30 Hz host callbacks with 11 ms complete frames sustain NTSC progress and continuous audio',()=>{
 const c=clocked(11);c.fire(0);for(let i=1;i<=150;i++)c.fire(i*1000/30);const s=c.state();metrics.scheduler30Hz=s;
 assert.ok(s.frame>=299&&s.frame<=301,'Five seconds at 30 host callbacks/s must advance about 300 NES frames; got '+s.frame);assert.equal(s.perf.dropped,0);assert.equal(s.audio.underruns,0,'Affordable workload must not repeatedly exhaust its audio queue');assert.equal(s.audio.resyncs,0);assert.ok(s.queued>0&&s.queued<0.15);assert.ok(s.sources<=12);assert.ok(Math.abs(s.frame/5-60.0988)<0.5);for(let i=1;i<c.clock.audioStarts.length;i++)assert.ok(Math.abs(c.clock.audioStarts[i].start-c.clock.audioStarts[i-1].end)<1e-9,'Scheduled audio intervals must remain contiguous');
});
test('60 Hz host control remains near real time without extra frames or queue growth',()=>{
 const c=clocked(4);c.fire(0);for(let i=1;i<=180;i++)c.fire(i*1000/60);const s=c.state();metrics.scheduler60Hz=s;
 assert.ok(s.frame>=179&&s.frame<=181);assert.equal(s.perf.dropped,0);assert.equal(s.audio.underruns,0);assert.equal(s.audio.resyncs,0);assert.ok(s.queued<0.15);assert.ok(s.sources<=12);
});
test('One second stall is bounded and all discarded emulation time is accounted for',()=>{
 const c=clocked(2);c.fire(0);c.fire(1000);const s=c.state();metrics.stall=s;
 assert.ok(s.frame>0&&s.frame<=4,'Stall recovery must not monopolize the host callback');assert.ok(s.backlog>=0&&s.backlog<FRAME*5);assert.equal(s.frame+s.perf.dropped+Math.floor((s.backlog+1e-6)/FRAME),60,'Completed, retained and discarded whole frames must account for elapsed time');assert.ok(s.perf.dropped>=56);assert.ok(s.sources<=12);assert.ok(s.queued<0.15);
});
test('Sustained overload yields bounded callbacks, retains debt, and reports lost time',()=>{
 const c=clocked(45);c.fire(0);let maximum=0;for(let i=0;i<30;i++){const before=c.state().frame;c.fire(c.clock.now+1000/30);const s=c.state();maximum=Math.max(maximum,s.frame-before);assert.ok(s.frame-before<=2);assert.ok(s.backlog>=0&&s.backlog<FRAME*5);assert.ok(s.sources<=12);assert.ok(s.queued<0.15);}const s=c.state();metrics.overload={...s,maxFramesPerCallback:maximum};assert.equal(s.running,true);assert.ok(s.perf.dropped>0);assert.ok(s.backlog>=FRAME,'Budget exhaustion must retain feasible outstanding work');assert.deepEqual(c.h.errors,[]);
});
test('Out-of-order timestamps do not consume debt; invalid timestamps stop safely',()=>{
 const c=clocked(4);c.fire(100);c.fire(100+FRAME*2);const before=c.state();c.fire(90);assert.equal(c.state().frame,before.frame);assert.equal(c.state().backlog,before.backlog);c.fire(NaN);assert.equal(c.state().running,false);assert.ok(c.h.errors.some(e=>/Invalid animation timestamp/.test(e)));
});
test('Pause/resume rejects stale callback generations and clears queued host audio',()=>{
 const c=clocked(4);c.fire(0);c.fire(1000/30);const stale=c.clock.raf.get(c.h.run('emu.rafId'));c.h.run('emuPause()');assert.equal(c.state().sources,0);assert.equal(c.h.run('apuBufferUsed'),0);const before=c.state().frame;c.h.run('emuToggleRun()');const current=c.h.run('emu.rafId');stale(1000);assert.equal(c.state().frame,before);assert.equal(c.h.run('emu.rafId'),current);c.fire(2000);assert.equal(c.state().frame,before,'Resume anchors a fresh host clock');c.fire(2000+1000/30);assert.equal(c.state().frame,before+2);assert.deepEqual(c.h.errors,[]);
});

const setup=`
 emu.ppuCtrl=0;emu.ppuMask=30;emu.tAddr=0;emu.fineX=3;
 for(var n=0;n<4096;n++)emu.vram[n]=n%1024<960?1+((n+(n>>5))%63):0xe4;
 for(var p=0;p<32;p++)ppuBusWrite(0x3f00+p,(p*3+1)&63);
 emu.oamMem.fill(255);for(var s=0;s<8;s++){emu.oamMem[s*4]=40+s*16;emu.oamMem[s*4+1]=s+5;emu.oamMem[s*4+2]=(s%4)|((s&1)?64:0);emu.oamMem[s*4+3]=16+s*24;}
 if(emu.hasChrRam)for(var c=0;c<8192;c++)ppuBusWrite(c,((c*29)^(c>>4)^(c>>9)*73)&255);
`;
const variants={
 'ordinary scrolled background and sprites':{mapper:0,chr:1,changes:''},
 'CNROM bank switches during visible rendering':{mapper:3,chr:4,changes:'if(y===70)cpuWrite(0x8000,1);if(y===145)cpuWrite(0x8000,3);'},
 'MMC3 individual pages and bank inversion':{mapper:4,chr:4,changes:'if(y===60){cpuWrite(0x8000,0);cpuWrite(0x8001,6);}if(y===140){cpuWrite(0x8000,0x82);cpuWrite(0x8001,12);}'},
 'raster palette mirrors, grayscale and scroll changes':{mapper:0,chr:1,changes:'if(y===50){ppuBusWrite(0x3f10,0x30);ppuBusWrite(0x3f01,0x16);}if(y===120){cpuWrite(0x2001,31);emu.fineX=6;emu.tAddr=7;}if(y===190)cpuWrite(0x2001,30);'},
 'CHR-RAM writes during the visible frame':{mapper:0,chr:0,changes:'if(y===60||y===125)for(var t=1;t<65;t++)for(var b=0;b<16;b++)ppuBusWrite(t*16+b,(b+y+t)&255);'},
 'CHR-ROM in-place mutation does not reuse stale tiles':{mapper:0,chr:1,changes:'if(y===100)for(var t=1;t<65;t++)for(var b=0;b<16;b++)emu.chrRom[t*16+b]^=255;'},
 'CHR-ROM replacement invalidates source identity':{mapper:0,chr:1,changes:'if(y===100){emu.chrRom=new Uint8Array(emu.chrRom);for(var t=1;t<65;t++)for(var b=0;b<16;b++)emu.chrRom[t*16+b]^=170;}'}
};
function raster(h,v){load(h,rom(v.mapper,v.chr),'Raster contract');h.run(setup);h.run('for(var y=0;y<240;y++){'+v.changes+'renderEmuLine(y,0,0);}emu.frameCount=1;',20000);}
function capture(h){const out=h.json('captureRuntimeData()');delete out.id;return out;}
function parity(h,oracle,label){const b=capture(oracle),a=capture(h);assert.deepEqual(a,b,'Exact editable native asset/provenance/palette content must match frozen baseline');assert.deepEqual(Buffer.from(h.run('emu.frameBuffer')),Buffer.from(oracle.run('emu.frameBuffer')));assert.deepEqual(Buffer.from(h.run('emu.bgFrameBuffer')),Buffer.from(oracle.run('emu.bgFrameBuffer')));assert.equal(a.captureMeta.validation.backgroundDifferentPixels,0);assert.equal(a.captureMeta.validation.compositeDifferentPixels,0);metrics[label]={framebufferSha256:sha(h.run('emu.frameBuffer')),captureSha256:sha(JSON.stringify(a)),nativeTiles:a.captureMeta.nativeTiles,paletteSets:a.captureMeta.paletteSets};return a;}
for(const [name,v]of Object.entries(variants))test('Capture parity: '+name,()=>{const h=fresh(),b=fresh(baseline);raster(h,v);raster(b,v);parity(h,b,name);assert.deepEqual(h.errors,[]);});
test('Repeated capture is stable and does not advance CPU or mutate authoring data',()=>{
 const h=fresh();raster(h,variants['CNROM bank switches during visible rendering']);const before=h.json('({frame:emu.frameCount,pc:emu.PC,cycles:emu.cycles,project:Forge.services.ProjectStore.capture(),undo:undoStack,redo:redoStack})');const a=capture(h),b=capture(h);assert.deepEqual(a,b);assert.deepEqual(h.json('({frame:emu.frameCount,pc:emu.PC,cycles:emu.cycles,project:Forge.services.ProjectStore.capture(),undo:undoStack,redo:redoStack})'),before);
});
test('Unsafe mid-frame sprite geometry still rejects capture atomically',()=>{
 const h=fresh();raster(h,{mapper:0,chr:1,changes:'if(y===45)emu.oamMem[3]=220;'});const before=h.json('Forge.services.ProjectStore.capture()');assert.throws(()=>h.run('captureRuntimeData()'),/OAM positions\/attributes/);assert.deepEqual(h.json('Forge.services.ProjectStore.capture()'),before);
});
test('Actual native ROM frames preserve complete captures while reducing 16-byte tile allocations',()=>{
 function observed(file){const count={tiles:0},U8=new Proxy(Uint8Array,{construct(target,args){if(args.length===1&&args[0]===16)count.tiles++;return Reflect.construct(target,args);}}),h=fresh(file,{Uint8Array:U8});load(h,new Uint8Array(fs.readFileSync(path.join(root,'examples/RE_Bridge_Room/Bridge_Room.nes'))),'Native allocation contract');h.run('for(var i=0;i<8;i++)emuRunFrame()',20000);count.tiles=0;h.run('for(var i=0;i<4;i++)emuRunFrame()',20000);return {h,allocations:count.tiles};}
 const a=observed(html),b=observed(baseline);parity(a.h,b.h,'nativeROM');metrics.nativeTileAllocations={baseline:b.allocations,candidate:a.allocations,reduction:1-a.allocations/b.allocations};assert.ok(b.allocations>20000,'Control must exercise dense capture work');assert.ok(a.allocations<b.allocations*0.15,'Repeated CHR-ROM references should avoid at least 85% of prior 16-byte temporary arrays');
});
test('History restoration and resumed real CPU execution preserve native capture data',async()=>{
 const h=fresh(),b=fresh(baseline),bytes=new Uint8Array(fs.readFileSync(path.join(root,'examples/RE_Bridge_Room/Bridge_Room.nes')));for(const f of[h,b]){load(f,bytes,'History capture contract');f.run('for(var i=0;i<8;i++)emuRunFrame()',20000);f.context.Forge.services.EmulatorTimeline.setEnabled(true);f.run('for(var i=0;i<3;i++)emuRunFrame()',20000);}parity(h,b,'historyAnchor');for(const f of[h,b]){f.run('emuKeys.ArrowRight=true;for(var i=0;i<4;i++)emuRunFrame()',20000);assert.equal(await f.context.Forge.services.EmulatorTimeline.back(4),true);}parity(h,b,'historyRestored');for(const f of[h,b])f.run('emuKeys.ArrowRight=true;for(var i=0;i<4;i++)emuRunFrame()',20000);parity(h,b,'historyResumed');
});

test('Play performance readout reflects measured counters without changing emulation or input',()=>{
 const h=fresh(html,{innerWidth:390});load(h);const play=h.context.Forge.services.EmulatorPlay;play.enter();h.run('emu.running=true;emuPerf.fps=59.75;emuPerf.frameMs=11.25;emuPerf.dropped=7;emuPerf.backlogMs=12;apuStats.underruns=3;apuStats.resyncs=2;');const before=h.json('({frame:emu.frameCount,pc:emu.PC,cycles:emu.cycles,keys:emuKeys,project:Forge.services.ProjectStore.capture()})');play.refresh();const el=h.get('emuPlayPerformance');assert.ok(el.parentNode,'Readout must be a real child in the Play panel');assert.equal(el.parentNode,h.get('emuPlayPanel'));assert.match(el.textContent,/59\.8/);assert.match(el.textContent,/60\.1/);assert.match(el.textContent,/11\.3/);assert.match(el.textContent,/gaps\s+3/i);assert.match(el.textContent,/resyncs\s+2/i);assert.match(el.textContent,/7/);assert.notEqual(el.getAttribute('aria-live'),'polite');assert.notEqual(el.getAttribute('aria-live'),'assertive');assert.deepEqual(h.json('({frame:emu.frameCount,pc:emu.PC,cycles:emu.cycles,keys:emuKeys,project:Forge.services.ProjectStore.capture()})'),before);assert.equal(h.context.Forge.services.EmulatorInput.status().blocked,false);
});
test('Play readout reacts immediately to pause and unload within its normal refresh throttle',()=>{
 const h=fresh(html,{innerWidth:390});load(h);const p=h.context.Forge.services.EmulatorPlay;p.enter();h.run('emu.running=true');p.refresh();assert.match(h.get('emuPlayPerformance').textContent,/running/i);h.run('emuPause()');p.refresh();assert.match(h.get('emuPlayPerformance').textContent,/paused/i);h.run('emu.loaded=false');p.refresh();assert.equal(h.get('emuPlayPerformance').hidden,true);
});

(async()=>{const results=[];for(const {name,fn}of tests){const start=Date.now();try{await fn();results.push({name,passed:true,milliseconds:Date.now()-start});console.log('PASS '+name);}catch(error){results.push({name,passed:false,milliseconds:Date.now()-start,error:error.stack});console.log('FAIL '+name+'\n'+error.message);}}const passed=results.filter(r=>r.passed).length,report={suite:'mobile-playback200',html:path.basename(html),htmlSha256:sha(fs.readFileSync(html)),baselineHtmlSha256:baselineSha,scope:'Deterministic 30/60 Hz synthetic host scheduler and AudioContext sink (fixed-cost complete frame producer declared); actual PPU/capture rendering and native CPU ROM execution compared with pinned alpha.1. DOM readout semantics only; no browser compositor, physical phone, speaker, thermal or real latency claim.',passed,failed:results.length-passed,total:results.length,metrics,results};const output=process.env.FORGE_TEST_REPORT||process.argv[3];if(output){fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');}console.log(passed+'/'+results.length+' passed');process.exitCode=report.failed?1:0;})();
