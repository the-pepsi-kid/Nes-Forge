'use strict';
// Synthetic host-time tests of the actual release script. The CPU/PPU frame
// function is replaced only inside an isolated VM with a controlled-cost source
// of samples; no application files are changed. This is not a device benchmark.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
if(process.argv.length!==4){console.error('Usage: node probe.cjs <application.html> <tests/harness.cjs>');process.exit(2);}
const html=path.resolve(process.argv[2]);
const harnessPath=path.resolve(process.argv[3]);
const {loadForge}=require(harnessPath);
function scenario({hz,frameCost,seconds=10,state='running',renderCost=0}){
 let clock=0,resumeCalls=0,renderCalls=0;const live=new Set(),startTimes=[];
 class AC{
  constructor(){this.state=state;this.destination={};this.sampleRate=48000;}
  get currentTime(){return clock/1000;}
  createGain(){return {gain:{value:0,setValueAtTime(){}},connect(){}};}
  createBuffer(channels,count,rate){return {duration:count/rate,getChannelData(){return new Float32Array(count);}};}
  createBufferSource(){return {connect(){},disconnect(){},stop(){live.delete(this);},start(t){this.end=t+this.buffer.duration;live.add(this);startTimes.push(t);}};}
  resume(){resumeCalls++;this.state='running';return Promise.resolve();}
 }
 const h=loadForge(html,{environment:{AudioContext:AC,performance:{now:()=>clock}}});
 h.context.spend=()=>{clock+=frameCost;};h.context.renderSpend=()=>{clock+=renderCost;renderCalls++;};
 h.run(`emu.loaded=true;emu.running=true;S.tab='emu';apuStart();let probeSampleRemainder=0;emuRunFrame=function(){spend();emu.frameCount++;probeSampleRemainder+=48000/60.0988;const n=Math.floor(probeSampleRemainder);probeSampleRemainder-=n;for(let i=0;i<n;i++)apuReceiveSample(0.2);};renderEmu=function(){renderSpend();};emuLastFrameTime=null;emuAccumulator=0;emuPerf.since=0;emuPerf.frames=0;`);
 const count=Math.round(hz*seconds);
 function expire(){for(const s of [...live])if(s.end<=clock/1000){live.delete(s);s.onended?.();}}
 for(let i=0;i<=count;i++){clock=i*1000/hz;expire();h.context.probeNow=clock;h.run('emuLoop(probeNow)');expire();}
 const actual=h.json('({frameCount:emu.frameCount,frameMs:emuPerf.frameMs,dropped:emuPerf.dropped,underruns:apuStats.underruns,resyncs:apuStats.resyncs,maxQueueMs:apuStats.maxQueueMs,scheduled:apuStats.scheduled,contextState:apuCtx.state})');
 return {hz,frameCostMs:frameCost,renderCostMs:renderCost,seconds,...actual,achievedFps:actual.frameCount/seconds,idealFrames:Math.floor(seconds*60.0988),resumeCalls,renderCalls,firstAudioStartMs:startTimes.length?startTimes[0]*1000:null,errors:h.errors};
}
const scenarios=[{hz:30,frameCost:4},{hz:30,frameCost:11},{hz:50,frameCost:4},{hz:50,frameCost:11},{hz:60,frameCost:4},{hz:60,frameCost:11},{hz:90,frameCost:4},{hz:120,frameCost:4},{hz:144,frameCost:4},{hz:60,frameCost:4,renderCost:5},{hz:60,frameCost:4,state:'suspended'},{hz:60,frameCost:4,state:'interrupted'}].map(scenario);
const h=loadForge(html);h.run('emu.running=true;emu.loaded=true;emuRunFrame=function(){emu.frameCount++;};emuLastFrameTime=null;emuAccumulator=0;emuLoop(0);emuLoop(250)');
const stalled=h.json('({elapsedMs:250,frameCount:emu.frameCount,reportedDropped:emuPerf.dropped,accumulatorMs:emuAccumulator})');
const report={kind:'Synthetic execution of shipped host scheduler and Web Audio queue, not browser/hardware test',applicationSha256:crypto.createHash('sha256').update(fs.readFileSync(html)).digest('hex'),harnessSha256:crypto.createHash('sha256').update(fs.readFileSync(harnessPath)).digest('hex'),scenarios,stalled};
fs.writeFileSync(path.join(__dirname,'probe-results.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
