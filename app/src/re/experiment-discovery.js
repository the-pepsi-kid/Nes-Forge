/* AL-EXP-01: blind metatile discovery on a synthetic cartridge, end to end. 1. Observe: cold and checkpoint-restored
 * baselines with a bus trace (repeatability). 2. Propose: ranked candidate tables from the screens and the recorded data
 * reads. 3. Test: one predicted intervention per leading candidate, with same-value and unrelated-byte controls and an
 * attribute-palette intervention. 4. Freeze the supported candidate as a sealed definition. 5. Only then run the
 * withheld input and reconstruct its screen from the frozen definition. Nothing here knows where the table is; the
 * answer for a synthetic fixture exists only outside the editor, in the acceptance suite's oracle. */
(()=>{
'use strict';
const services=window.Forge.services,contract=window.ForgeExperimentContract,Finder=window.ForgeMetatileFinder,Evidence=window.ForgeExperimentEvidence;
function fail(message){throw Error('Metatile discovery: '+message);}
const ALL=['cpu','ram','nametables','palette','oam','chr','pixels'];

function plan(id,rom,identity,input,captures,trials,{trace=false,checkpoints=[]}={}){
  const total=input.reduce((n,s)=>n+s.frames,0);
  return {format:contract.FORMATS.plan,version:1,id,privacy:'synthetic',source:{sha256:contract.sha256(rom),byteLength:rom.length},engine:{documentSha256:identity.documentSha256},
    input:{steps:input},captures:captures.map(c=>({label:c.label,frame:c.frame})),checkpoints,target:{backgroundEnabled:true},
    observe:{channels:ALL,payloads:['nametables','palette'],...(trace?{trace:{prgReads:true,ppuWrites:true,maxEvents:100000}}:{}),frameDigests:true},
    budgets:{framesPerTrial:Math.max(total,1),wallMsPerTrial:60000,maxTrials:Math.max(trials.length,1),eventsPerTrial:trace?100000:0},trials};
}
const captureView=c=>({label:c.label,nametables:c.payloads.nametables,ppu:c.ppu});
function visibleMap(result){const m=new Map();for(const c of result.captures){const v=Finder.visible(captureView(c));if(v.supported)m.set(c.label,v);}return m;}
function summary(w){return {id:w.id,rank:w.rank,layout:w.hypothesis.layout,order:w.hypothesis.order,recordStep:w.hypothesis.recordStep,fieldStep:w.hypothesis.fieldStep,grid:w.grid,
  windowPhysical:[w.lo,w.hi],matched:w.matched,coverage:Math.round(w.coverage*1000)/1000,traceSupport:w.traceSupport===null?null:Math.round(w.traceSupport*1000)/1000,aliases:w.aliases.length,base:{physical:w.base.physical,method:w.base.method,votes:w.base.votes}};}

async function discover({rom,training,holdout,interventions=Finder.LIMITS.interventions,onProgress=null,signal=null,store=Evidence.createStore()}){
  if(!(rom instanceof Uint8Array))fail('needs cartridge bytes');
  const t0=performance.now(),layout=contract.romLayout(rom),stage=(name,detail)=>onProgress?.({stage:name,...detail});
  if(!contract.isSynthetic(rom,layout))fail('this slice runs only on Forge synthetic fixtures');
  const romSha=contract.sha256(rom);
  stage('isolation',{message:'Starting an isolated copy of the editor'});
  const session=await services.ExperimentSandbox.open(),timings={bootMs:session.stats.bootMs};
  const report={format:'NESForgeMetatileDiscovery',version:1,source:{sha256:romSha,byteLength:rom.length},identity:session.identity,plans:[],stages:{}};
  try{
    // 1. observe
    stage('observe',{message:'Observing the training input: two cold runs and two runs restored from a checkpoint'});
    const first=training.captures[0].frame,ck=Math.max(1,Math.min(30,first-1));
    const p1=plan('observe',rom,session.identity,training.steps,training.captures,[
      {id:'baseline-cold-1',kind:'baseline',mutations:[],saveCheckpoints:true,trace:true},
      {id:'baseline-restored-1',kind:'baseline',mutations:[],fromCheckpoint:'after-boot',trace:true},
      {id:'baseline-restored-2',kind:'baseline',mutations:[],fromCheckpoint:'after-boot',trace:false},
      {id:'baseline-cold-2',kind:'baseline',mutations:[],trace:true}],{trace:true,checkpoints:[{label:'after-boot',frame:ck}]});
    const r1=await services.ExperimentRunner.run(p1,rom,{store,session,signal,onProgress:p=>stage('observe',p)});
    report.plans.push({id:p1.id,planHash:r1.plan.planHash,receipts:r1.receipts.map(r=>({trial:r.trialId,outcome:r.outcome,receiptHash:r.receiptHash,firstDivergence:r.firstDivergence}))});
    report.stages.observe={repeatability:r1.repeatability,trace:r1.receipts[0].trace?{events:r1.reference.result.trace.events.length,truncated:r1.reference.result.trace.truncated,counts:r1.reference.result.trace.counts}:null};
    if(!r1.reference)fail('the training input did not reach its target: '+(r1.receipts[0].stopReason||r1.receipts[0].outcome));
    if(r1.repeatability!=='passed')fail('baselines did not repeat ('+r1.repeatability+'); results would be inconclusive');
    if(signal?.aborted)return {...report,cancelled:true};
    // 2. propose
    stage('propose',{message:'Searching the cartridge for tables that explain the screens'});
    const ref=r1.reference.result,captures=ref.captures.map(captureView),tp=performance.now();
    const proposal=Finder.propose({rom,layout,captures,access:ref.trace.roles,events:ref.trace.events});
    timings.proposeMs=Math.round(performance.now()-tp);
    report.stages.propose={distinctTuples:proposal.distinctTuples,searched:proposal.searched,ranked:proposal.candidates.map(summary),staticRanking:proposal.staticRanking.slice(0,8),skipped:proposal.skipped};
    if(!proposal.candidates.length)fail('no candidate explains the screens');
    // 3. test the leading candidates
    stage('test',{message:'Testing the leading candidates with predicted interventions'});
    const tested=proposal.candidates.slice(0,interventions),tests=[];
    for(const w of tested){const t=Finder.planTileIntervention(w,rom,layout);if(t)tests.push({...t,trial:'tile-'+tests.length});}
    if(!tests.length)fail('no candidate can be tested');
    const top=tests[0],windows=tested.map(w=>[layout.prgStart+w.lo,layout.prgStart+w.hi+3*w.hypothesis.fieldStep+4]);
    let unrelated=-1;for(let i=Math.floor(layout.prgBytes/2);i<layout.prgBytes&&unrelated<0;i++){const o=layout.prgStart+i;if(!ref.trace.roles[i]&&!windows.some(([a,b])=>o>=a&&o<b)&&o<layout.vectors.start)unrelated=o;}
    const trials=[{id:'baseline',kind:'baseline',mutations:[]},...tests.map(t=>({id:t.trial,kind:'variant',mutations:[t.mutation]})),
      {id:'control-same-value',kind:'control-same-value',mutations:[{...top.mutation,value:top.mutation.expected}]},
      ...(unrelated>=0?[{id:'control-unrelated',kind:'control-unrelated',mutations:[{offset:unrelated,expected:rom[unrelated],value:rom[unrelated]^0xff}]}]:[])];
    const p2=plan('interventions',rom,session.identity,training.steps,training.captures,trials);
    const r2=await services.ExperimentRunner.run(p2,rom,{store,session,signal,onProgress:p=>stage('test',p)});
    report.plans.push({id:p2.id,planHash:r2.plan.planHash,receipts:r2.receipts.map(r=>({trial:r.trialId,outcome:r.outcome,receiptHash:r.receiptHash,firstDivergence:r.firstDivergence}))});
    if(!r2.reference)fail('the intervention baseline did not reach its target');
    const judge=(t,run)=>{const r=run.results.find(x=>x.trial.id===t.trial),b=visibleMap(run.reference.result);
      const j=['effect_observed','no_effect_observed'].includes(r.receipt.outcome)?Finder.judge(t,b,visibleMap(r.result)):{result:'inconclusive',reason:'trial outcome '+r.receipt.outcome};
      return {...t,judgement:j,receiptHash:r.receipt.receiptHash,outcome:r.receipt.outcome};};
    const judged=tests.map(t=>judge(t,r2));
    const controls=['control-same-value','control-unrelated'].map(id=>r2.results.find(x=>x.trial.id===id)).filter(Boolean).map(r=>({trial:r.trial.id,outcome:r.receipt.outcome,expected:'no_effect_observed',passed:r.receipt.outcome==='no_effect_observed',mutation:r.receipt.variant.mutations[0],receiptHash:r.receipt.receiptHash}));
    if(controls.some(c=>!c.passed))fail('a control showed an effect; the observations cannot be trusted ('+controls.filter(c=>!c.passed).map(c=>c.trial+': '+c.outcome).join(', ')+')');
    const supported=judged.filter(t=>t.judgement.result==='supported').map(t=>tested.find(w=>w.id===t.candidate));
    if(!supported.length)fail('no candidate survived its intervention');
    const w=supported[0];
    // the palette (attribute) array of the surviving candidate, tested the same way
    const arrays=Finder.attributeArrays(w,rom,layout,ref.trace.roles,ref.trace.events),baseAttrs=new Map([...visibleMap(r2.reference.result)].map(([k,v])=>[k,v.attributes]));
    const attrTest=arrays.length?Finder.planAttributeIntervention(w,arrays[0],rom,layout,baseAttrs):null;let attrJudged=null;
    if(attrTest){const pa=plan('attribute-intervention',rom,session.identity,training.steps,training.captures,[{id:'baseline',kind:'baseline',mutations:[]},{id:'attribute-0',kind:'variant',mutations:[attrTest.mutation]}]);
      const ra=await services.ExperimentRunner.run(pa,rom,{store,session,signal,onProgress:p=>stage('test',p)});
      report.plans.push({id:pa.id,planHash:ra.plan.planHash,receipts:ra.receipts.map(r=>({trial:r.trialId,outcome:r.outcome,receiptHash:r.receiptHash,firstDivergence:r.firstDivergence}))});
      if(ra.reference)attrJudged=judge({...attrTest,trial:'attribute-0'},ra);}
    const all=[...judged,...(attrJudged?[attrJudged]:[])];
    report.stages.test={interventions:all.map(t=>({trial:t.trial,kind:t.kind,candidate:t.candidate,mutation:t.mutation,predictedChanges:t.predict.length,outcome:t.outcome,result:t.judgement.result,reason:t.judgement.reason||null})),controls,
      attributeArrays:arrays.slice(0,4).map(a=>({physical:a.physical,decode:a.decode,constraints:a.constraints,instructions:a.instructions.length}))};
    // 4. freeze
    const definition=contract.sealCandidate(Finder.define({w,array:attrJudged?.judgement.result==='supported'?arrays[0]:null,interventions:all.filter(t=>t.candidate===w.id),repeatability:r1.repeatability==='passed'?'passed: two cold and two restored runs identical (same engine)':r1.repeatability,rom,layout,
      evidence:{sourceSha256:romSha,plans:report.plans.map(x=>x.planHash)}}));
    store.addCandidate(definition);
    report.stages.freeze={definitionHash:definition.definitionHash,candidate:w.id,rank:w.rank,frozenBeforeHoldout:true};
    report.definition=definition;
    if(signal?.aborted)return {...report,cancelled:true};
    // 5. withheld input, after the freeze
    stage('holdout',{message:'Running the withheld input and reconstructing it from the frozen definition'});
    const p3=plan('holdout',rom,session.identity,holdout.steps,holdout.captures,[{id:'baseline',kind:'baseline',mutations:[]}]);
    const r3=await services.ExperimentRunner.run(p3,rom,{store,session,signal,onProgress:p=>stage('holdout',p)});
    report.plans.push({id:p3.id,planHash:r3.plan.planHash,receipts:r3.receipts.map(r=>({trial:r.trialId,outcome:r.outcome,receiptHash:r.receiptHash}))});
    if(!r3.reference)fail('the withheld input did not reach its target');
    const shot=r3.reference.result.captures[0],reconstruction=Finder.reconstruct(definition,rom,layout,captureView(shot));
    report.holdout={label:shot.label,definitionHash:definition.definitionHash,reconstruction,
      observedAttributes:Array.from(Finder.visible(captureView(shot)).attributes),
      selfCheck:selfCheck(reconstruction,Finder.visible(captureView(shot)))};
    report.store=store.stats();report.baseUnchanged=r1.baseUnchanged&&r2.baseUnchanged&&r3.baseUnchanged&&contract.sha256(rom)===romSha;
    report.verification={sameEngine:'repeatability '+r1.repeatability+'; '+all.filter(t=>t.judgement.result==='supported').length+' predicted interventions supported',independent:'not performed in the editor: an independent oracle that knows the fixture is outside the editor (acceptance suite)'};
    timings.totalMs=Math.round(performance.now()-t0);report.timings=timings;report.sandbox={runs:session.stats.runs,bootMs:session.stats.bootMs};
    return report;
  }finally{session.close('discovery finished');}
}
// the definition's predicted attribute bits against the attribute bytes the capture shows: a same-engine consistency check
function selfCheck(reconstruction,visible){let known=0,agree=0;for(const a of reconstruction.attributes){const o=visible.attributes[a.index];for(let b=0;b<8;b++)if(a.knownMask>>b&1){known++;if(((a.value^o)>>b&1)===0)agree++;}}return {attributeBitsPredicted:known,agreeWithCapture:agree,kind:'same-engine consistency (not independent)'};}
services.MetatileDiscovery=Object.freeze({discover});
})();
