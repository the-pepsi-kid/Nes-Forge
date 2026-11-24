/* AL-EXP-01 (BL04): the paired experiment runner. A validated plan's trials run in the sandbox with identical input;
 * each variant is a private copy of the cartridge with its mutations applied (the base is never written, and its SHA-256
 * is re-checked after every trial). Each trial is compared with the plan's reference cold baseline channel by channel
 * (CPU registers, RAM, nametables, palette, OAM, CHR-RAM, pixels), with the first diverging frame and the first
 * diverging traced bus event. Outcomes keep "target not reached" apart from "no effect": a run that never reached its
 * target says nothing about the mutated byte. Every trial ends in a sealed receipt. Repeated baselines show same-engine
 * repeatability, which is never independent verification. */
(()=>{
'use strict';
const services=window.Forge.services,contract=window.ForgeExperimentContract,Evidence=window.ForgeExperimentEvidence;
function fail(message){throw Error('Experiment runner: '+message);}
const ENGINE='NES Forge emulator (same build as the editor), run in the experiment sandbox';

function diffBytes(a,b){let count=0,first=-1;const n=Math.max(a.length,b.length);for(let i=0;i<n;i++)if(a[i]!==b[i]){count++;if(first<0)first=i;}return {count,first};}
function eventsAfter(trace,frame){return trace?trace.events.filter(e=>e[0]>=frame):[];}
function compare(reference,result,plan){
  const channels={},captures=[];
  for(const ch of plan.observe.channels)channels[ch]={equalToBaseline:true,differingCaptures:0};
  for(const cap of plan.captures){
    const a=reference.captures.find(c=>c.label===cap.label),b=result.captures.find(c=>c.label===cap.label);
    if(!a||!b){captures.push({label:cap.label,missing:!b});for(const ch of plan.observe.channels)channels[ch].equalToBaseline=null;continue;}
    const row={label:cap.label,differs:[]};
    for(const ch of plan.observe.channels){if(a.digests[ch]===b.digests[ch])continue;row.differs.push(ch);channels[ch].equalToBaseline=false;channels[ch].differingCaptures++;
      if(a.payloads[ch]&&b.payloads[ch]){const d=diffBytes(a.payloads[ch],b.payloads[ch]);row[ch]={differingBytes:d.count,firstIndex:d.first};}}
    captures.push(row);
  }
  const start=result.startFrame||0;let frame=null,event=null;
  if(reference.frameDigests.length&&result.frameDigests.length){const offset=start-(reference.startFrame||0);for(let i=0;i<result.frameDigests.length;i++)if(reference.frameDigests[i+offset]!==result.frameDigests[i]){frame=start+i+1;break;}}
  if(reference.trace&&result.trace){const a=eventsAfter(reference.trace,start),b=eventsAfter(result.trace,start),n=Math.min(a.length,b.length);
    for(let i=0;i<n;i++)if(a[i].some((v,k)=>v!==b[i][k])){event={index:i,baseline:a[i].slice(),variant:b[i].slice()};break;}
    if(!event&&a.length!==b.length)event={index:n,baseline:a[n]?a[n].slice():null,variant:b[n]?b[n].slice():null};}
  return {channels,captures,firstDivergence:frame===null&&!event?null:{frame,event}};
}
function classify(result,comparison,plan){
  if(result.outcome)return result.outcome;
  if(result.outcomeHint==='crash'||result.outcomeHint==='timeout'||result.outcomeHint==='cancelled')return result.outcomeHint;
  if(result.captures.length<plan.captures.length)return 'target_not_reached';
  if(plan.target?.backgroundEnabled&&result.captures.some(c=>!c.ppu.backgroundEnabled))return 'target_not_reached';
  if(!comparison)return 'no_effect_observed';
  return Object.values(comparison.channels).some(c=>c.equalToBaseline===false)||comparison.firstDivergence?'effect_observed':'no_effect_observed';
}
const plain=v=>JSON.parse(JSON.stringify(v));

async function run(planInput,baseBytes,{store=Evidence.createStore(),session=null,keepSession=false,onProgress=null,signal=null}={}){
  const plan=contract.validatePlan(planInput);
  if(!(baseBytes instanceof Uint8Array))fail('needs cartridge bytes');
  const callerSha=contract.sha256(baseBytes),base=new Uint8Array(baseBytes),baseSha=contract.sha256(base);
  if(baseSha!==plan.source.sha256||base.length!==plan.source.byteLength)fail('the cartridge is not the plan\'s source ('+baseSha.slice(0,12)+'…)');
  const layout=contract.romLayout(base);
  if(!contract.isSynthetic(base,layout))fail('this slice runs experiments only on Forge\'s synthetic fixtures; this cartridge carries no synthetic-fixture marker');
  if(plan.privacy!=='synthetic')fail('a synthetic fixture\'s plan must declare privacy "synthetic"');
  const own=session||await services.ExperimentSandbox.open();
  if(plan.engine&&plan.engine.documentSha256!==own.identity.documentSha256)fail('the plan names another build ('+plan.engine.documentSha256.slice(0,12)+'…)');
  const inputHash=contract.hashOf(plan.input.steps),results=[],started=performance.now();let reference=null;
  try{
    for(const trial of plan.trials){
      const t0=performance.now();let mutations=[],variant=null,result,comparison=null;
      try{mutations=contract.validateMutations(base,layout,trial.mutations,plan.protect);}
      catch(error){result={captures:[],frameDigests:[],trace:null,framesRun:0,startFrame:0,outcome:'invalid',stopReason:error.message};}
      if(!result){
        if(mutations.length){variant=contract.buildVariant(base,baseSha,mutations);}
        const request={steps:plan.input.steps,captures:plan.captures,channels:plan.observe.channels,payloads:plan.observe.payloads,
          trace:trial.trace&&plan.observe.trace?{...plan.observe.trace,watchRam:plan.observe.watchRam}:null,frameDigests:plan.observe.frameDigests,
          budgets:{frames:plan.budgets.framesPerTrial,wallMs:plan.budgets.wallMsPerTrial},hangFrames:60,chunkMs:16,save:trial.saveCheckpoints?plan.checkpoints:[],
          syncCaptures:trial.fromCheckpoint?null:{captures:plan.captures,channels:['cpu','ram','nametables','palette','chr','pixels',...(trial.trace&&plan.observe.trace?['reads']:[])]}};
        if(trial.fromCheckpoint)request.restore={label:trial.fromCheckpoint,romSha:variant?variant.sha256:baseSha};
        else{request.rom=variant?variant.bytes:base;request.romSha=variant?variant.sha256:baseSha;}
        if(signal?.aborted||own.closed())result={captures:[],frameDigests:[],trace:null,framesRun:0,startFrame:0,outcome:'cancelled',stopReason:own.closed()?'the sandbox was closed before the trial started':'cancelled before the trial started'};
        else result=await own.run(request,{onProgress:p=>onProgress?.({trial:trial.id,frame:p.frame,total:p.total}),signal});
        if(own.closed()&&!result.outcome&&!result.outcomeHint)result.outcome='cancelled';
      }
      if(contract.sha256(base)!==baseSha)fail('the base cartridge changed during a trial');
      if(reference&&result.captures?.length)comparison=compare(reference.result,result,plan);
      const outcome=classify(result,comparison,plan);
      if(!reference&&trial.kind==='baseline'&&!trial.fromCheckpoint&&outcome==='no_effect_observed'){reference={trial,result};}
      // payloads: stored once per exact content; the receipt names them by SHA-256
      const captures=(result.captures||[]).map(c=>({label:c.label,frame:c.frame,backgroundEnabled:c.ppu.backgroundEnabled,digests:{...c.digests},payloads:Object.fromEntries(Object.entries(c.payloads).map(([ch,bytes])=>[ch,store.putBytes(bytes,ch)]))}));
      let trace=null;
      if(result.trace){const eventsRef=store.putBytes(new TextEncoder().encode(contract.canonical(result.trace.events)),'trace-events'),rolesRef=store.putBytes(result.trace.roles,'access-roles');
        trace={events:result.trace.events,dropped:result.trace.dropped,truncated:result.trace.truncated,complete:result.trace.complete,maxEvents:result.trace.maxEvents,counts:result.trace.counts,eventsRef,rolesRef};}
      const repeat=trial.kind==='baseline'&&reference&&reference.trial!==trial;
      const receipt=contract.sealReceipt({format:contract.FORMATS.receipt,version:contract.version,planHash:plan.planHash,planId:plan.id,trialId:trial.id,kind:trial.kind,
        engine:{documentSha256:own.identity.documentSha256,engine:ENGINE},base:{sha256:baseSha,byteLength:base.length},
        variant:variant?{sha256:variant.sha256,variantId:variant.variantId,mutations:mutations.map(m=>({offset:m.offset,expected:m.expected,value:m.value,region:m.region}))}:null,
        inputHash,checkpoint:result.checkpoint?{mode:'restored',...result.checkpoint}:result.checkpointsSaved?.length?{mode:'saved',saved:result.checkpointsSaved}:null,
        framesRun:result.framesRun||0,stopReason:result.stopReason||null,targetReached:outcome==='target_not_reached'?false:result.captures?.length?true:null,outcome,
        channels:comparison?comparison.channels:null,captures,firstDivergence:comparison?.firstDivergence?plain(comparison.firstDivergence):null,
        trace:trace?{dropped:trace.dropped,truncated:trace.truncated,complete:trace.complete,maxEvents:trace.maxEvents,counts:trace.counts,eventsRef:trace.eventsRef,rolesRef:trace.rolesRef}:null,
        limits:{...plan.budgets,traceEvents:plan.observe.trace?plan.observe.trace.maxEvents:0},
        limitations:[...(trace?.truncated?['the trace reached its event cap: absence of an event is not evidence']:[]),...(outcome==='target_not_reached'?['the target was not reached: this says nothing about the mutated bytes']:[])],
        verification:repeat?{kind:contract.VERIFICATION.repeatability,independent:false,note:'a repeat on the same engine: it shows determinism, not correctness'}:{kind:contract.VERIFICATION.none,independent:false,note:'one run on the experiment engine'},
        evidence:{reference:reference&&reference.trial!==trial?reference.trial.id:null},
        timing:{wallMs:Math.round(performance.now()-t0),sandboxMs:result.wallMs||0}});
      store.addReceipt(receipt);
      const from=variant?'variant:'+variant.variantId:'base:'+baseSha;
      for(const c of captures)store.addEdge({trial:trial.id,from,to:'capture:'+contract.hashOf(c.digests),kind:outcome,capture:c.label});
      results.push({trial,result,comparison,receipt,variant});
      if(signal?.aborted)break;
    }
  }finally{if(!session&&!keepSession)own.close();}
  const baselines=results.filter(r=>r.trial.kind==='baseline'&&r.trial!==reference?.trial&&r.receipt.outcome!=='invalid'); // a refused trial never ran: it is not a repeat
  const repeatability=!reference?'not established (no reference baseline)':baselines.length===0?'not tested (one baseline)':baselines.every(r=>r.receipt.outcome==='no_effect_observed')?'passed':'failed';
  return {plan,results,receipts:results.map(r=>r.receipt),reference:reference?{trial:reference.trial.id,result:reference.result}:null,repeatability,
    baseUnchanged:contract.sha256(baseBytes)===callerSha&&contract.sha256(base)===baseSha,identity:own.identity,session:keepSession&&!session?own:null,store,
    timing:{wallMs:Math.round(performance.now()-started)}};
}
services.ExperimentRunner=Object.freeze({run,compare,classify});
})();
