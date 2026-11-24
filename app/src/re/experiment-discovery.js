/* AL-EXP-01/02: blind metatile discovery on a synthetic cartridge, end to end. 1. Observe: cold and checkpoint-restored
 * baselines with a bus trace (repeatability). 2. Propose: ranked candidate tables from the screens and the recorded data
 * reads. 3. Test: one predicted intervention per leading candidate, with same-value and unrelated-byte controls and a
 * restoration baseline after the variants; every intervention is interpreted (was the byte read, did the program's path
 * change, did the predicted effect occur). The surviving candidate is tested again at a second record position and
 * repeated, and its palette array is tested. 4. Freeze the survivor as a sealed definition (revision 1). 5. Only then
 * run the withheld input and reconstruct its screen from the frozen definition. 6. Run engine-neutral verification jobs
 * in this engine, so an independent emulator can run the same jobs outside the editor.
 *
 * The result is classified, never forced: "candidate", "ambiguous" (several hypotheses survive, or record numbering is
 * undetermined), "insufficient-evidence" (the observations cannot fix a table's geometry) or "inconclusive" (nothing
 * survived, a control showed an effect, or an intervention changed the program's execution and so is confounded).
 * Nothing here knows where the table is; the answer for a synthetic fixture exists only outside the editor, with the
 * acceptance suite's oracle. */
(()=>{
'use strict';
const services=window.Forge.services,contract=window.ForgeExperimentContract,Finder=window.ForgeMetatileFinder,Evidence=window.ForgeExperimentEvidence,V=window.ForgeExperimentVerification;
function fail(message){throw Error('Metatile discovery: '+message);}
const ALL=['cpu','ram','nametables','palette','oam','chr','pixels'];
const DATA=4;

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
const recordOf=r=>({id:r.plan.id,planHash:r.plan.planHash,plan:r.plan,receipts:r.receipts.map(x=>({trial:x.trialId,outcome:x.outcome,receiptHash:x.receiptHash,firstDivergence:x.firstDivergence}))});
const sameTable=(a,b)=>a.base.physical===b.base.physical&&a.hypothesis.layout===b.hypothesis.layout&&a.hypothesis.order===b.hypothesis.order&&a.hypothesis.fieldStep===b.hypothesis.fieldStep&&a.hypothesis.recordStep===b.hypothesis.recordStep;
function pathDivergence(a,b){if(!a||!b)return null;const n=Math.min(a.length,b.length);for(let i=0;i<n;i++)if(a[i]!==b[i])return i+1;return a.length===b.length?null:n+1;}

// What one intervention showed. "Not read" (with a complete trace) means irrelevant for this input only; "read, no
// observed effect" is not the same thing; a change in the program's path makes the result confounded.
function interpret(test,run,refSync,roles,traceComplete,layout){
  const r=run.results.find(x=>x.trial.id===test.trial),b=visibleMap(run.reference.result);
  const outcome=r.receipt.outcome,idx=test.mutation.offset-layout.prgStart;
  const read=roles?(roles[idx]&DATA?'read':traceComplete?'not-read':'unknown (the trace was truncated)'):'unknown (no trace)';
  const pathFrame=pathDivergence(refSync?.pathDigests,r.result.sync?.pathDigests);
  if(!['effect_observed','no_effect_observed'].includes(outcome))return {judgement:{result:'inconclusive',reason:'trial outcome '+outcome},interpretation:{classification:'inconclusive',read,path:null,reason:'the trial did not complete ('+outcome+')'},receipt:r.receipt,result:r.result};
  const j=Finder.judge(test,b,visibleMap(r.result));
  let classification,reason;
  if(pathFrame!==null){classification='confounded';reason='the change altered the program\'s execution from frame '+pathFrame+' (its path differs from the baseline), so the screen effect cannot be attributed to the table';}
  else if(j.result==='supported'){classification='supported';reason='the predicted cells changed to the predicted values, and nothing else on screen changed';}
  else if(outcome==='no_effect_observed'||j.reason==='no effect: nothing on screen changed')classification=read==='not-read'?'falsified-not-read':'falsified-no-observed-effect',reason=read==='not-read'?'the program never read this byte under this input (complete trace): irrelevant for this input, not shown irrelevant in general':'the byte was read but nothing observed changed: no observed effect, which is not the same as irrelevant';
  else{classification='falsified-unpredicted-effect';reason='something changed, but not what this hypothesis predicts';}
  const judgement=classification==='confounded'?{...j,result:'inconclusive',reason:'confounded: '+reason}:j;
  return {judgement,interpretation:{classification,read,path:pathFrame===null?'same':'diverged at frame '+pathFrame,reason},receipt:r.receipt,result:r.result};
}

async function discover({rom,training,holdout,interventions=Finder.LIMITS.interventions,onProgress=null,signal=null,store=Evidence.createStore(),prepareVerification=true}){
  if(!(rom instanceof Uint8Array))fail('needs cartridge bytes');
  const t0=performance.now(),layout=contract.romLayout(rom),stage=(name,detail)=>onProgress?.({stage:name,...detail});
  if(!contract.isSynthetic(rom,layout))fail('this slice runs only on Forge synthetic fixtures');
  const romSha=contract.sha256(rom);
  stage('isolation',{message:'Starting an isolated copy of the editor'});
  const session=await services.ExperimentSandbox.open(),timings={bootMs:session.stats.bootMs};
  const report={format:'NESForgeMetatileDiscovery',version:2,source:{sha256:romSha,byteLength:rom.length},identity:session.identity,plans:[],stages:{},inputs:{training,holdout},
    result:null,hypotheses:{ranked:[],supported:[],falsified:[],confounded:[],untested:[]},definition:null,holdout:null,verification:null};
  const finish=(classification,reason,extra={})=>{report.result={classification,reason,...extra};report.store=store.stats();timings.totalMs=Math.round(performance.now()-t0);report.timings=timings;report.sandbox={runs:session.stats.runs,bootMs:session.stats.bootMs};return report;};
  const runs=[];const runPlan=async(p,label)=>{const r=await services.ExperimentRunner.run(p,rom,{store,session,signal,onProgress:x=>stage(label,x)});report.plans.push(recordOf(r));runs.push(r);return r;};
  try{
    // 1. observe
    stage('observe',{message:'Observing the training input: two cold runs and two runs restored from a checkpoint'});
    const first=training.captures[0].frame,ck=Math.max(1,Math.min(30,first-1));
    const r1=await runPlan(plan('observe',rom,session.identity,training.steps,training.captures,[
      {id:'baseline-cold-1',kind:'baseline',mutations:[],saveCheckpoints:true,trace:true},
      {id:'baseline-restored-1',kind:'baseline',mutations:[],fromCheckpoint:'after-boot',trace:true},
      {id:'baseline-restored-2',kind:'baseline',mutations:[],fromCheckpoint:'after-boot',trace:false},
      {id:'baseline-cold-2',kind:'baseline',mutations:[],trace:true}],{trace:true,checkpoints:[{label:'after-boot',frame:ck}]}),'observe');
    report.stages.observe={repeatability:r1.repeatability,trace:r1.reference?{events:r1.reference.result.trace.events.length,truncated:r1.reference.result.trace.truncated,complete:!r1.reference.result.trace.truncated,counts:r1.reference.result.trace.counts}:null};
    if(!r1.reference)return finish('inconclusive','the training input did not reach its target: '+(r1.receipts[0].stopReason||r1.receipts[0].outcome));
    if(r1.repeatability!=='passed')return finish('inconclusive','the baselines did not repeat ('+r1.repeatability+'): the engine is not deterministic for this input');
    if(signal?.aborted)return {...finish('inconclusive','cancelled'),cancelled:true};
    const ref=r1.reference.result,roles=ref.trace.roles,traceComplete=!ref.trace.truncated;
    // 2. propose
    stage('propose',{message:'Searching the cartridge for tables that explain the screens'});
    const captures=ref.captures.map(captureView),tp=performance.now();
    const pause=()=>new Promise(resolve=>{const c=new MessageChannel();c.port1.onmessage=()=>{c.port1.close();resolve();};c.port2.postMessage(0);});
    const proposal=await Finder.proposeAsync({rom,layout,captures,access:roles,events:ref.trace.events},pause); // yields to the editor between slices
    timings.proposeMs=Math.round(performance.now()-tp);
    report.stages.propose={distinctTuples:proposal.distinctTuples,searched:proposal.searched,ranked:proposal.candidates.map(summary),staticRanking:proposal.staticRanking.slice(0,8),skipped:proposal.skipped};
    report.hypotheses.ranked=report.stages.propose.ranked;
    if(proposal.distinctTuples<Finder.LIMITS.minMatched)return finish('insufficient-evidence','the training screens show '+proposal.distinctTuples+' distinct 2x2 record(s); at least '+Finder.LIMITS.minMatched+' are needed to fix a table\'s geometry (stride, order and record numbering cannot be told apart with fewer)');
    if(!proposal.candidates.length)return finish('insufficient-evidence','no table in the cartridge explains at least '+Finder.LIMITS.minMatched+' of the observed records');
    // 3. test the leading candidates
    stage('test',{message:'Testing the leading candidates with predicted interventions'});
    const tested=proposal.candidates.slice(0,interventions),tests=[];
    for(const w of tested){const t=Finder.planTileIntervention(w,rom,layout);if(t)tests.push({...t,trial:'tile-'+tests.length});}
    report.hypotheses.untested=proposal.candidates.slice(interventions).map(w=>w.id).concat(tested.filter(w=>!tests.some(t=>t.candidate===w.id)).map(w=>w.id));
    if(!tests.length)return finish('insufficient-evidence','no candidate has a record that appears exactly once, so none can be tested by a single-byte change');
    const top=tests[0],windows=tested.map(w=>[layout.prgStart+w.lo,layout.prgStart+w.hi+3*w.hypothesis.fieldStep+4]);
    let unrelated=-1;for(let i=Math.floor(layout.prgBytes/2);i<layout.prgBytes&&unrelated<0;i++){const o=layout.prgStart+i;if(!roles[i]&&!windows.some(([a,b])=>o>=a&&o<b)&&o<layout.vectors.start)unrelated=o;}
    const trials=[{id:'baseline',kind:'baseline',mutations:[]},...tests.map(t=>({id:t.trial,kind:'variant',mutations:[t.mutation]})),
      {id:'control-same-value',kind:'control-same-value',mutations:[{...top.mutation,value:top.mutation.expected}]},
      ...(unrelated>=0?[{id:'control-unrelated',kind:'control-unrelated',mutations:[{offset:unrelated,expected:rom[unrelated],value:rom[unrelated]^0xff}]}]:[]),
      {id:'baseline-after-variants',kind:'baseline',mutations:[]}];
    const r2=await runPlan(plan('interventions',rom,session.identity,training.steps,training.captures,trials),'test');
    if(!r2.reference)return finish('inconclusive','the intervention baseline did not reach its target');
    const refSync=r2.reference.result.sync;
    const judged=tests.map(t=>{const x=interpret(t,r2,refSync,roles,traceComplete,layout);return {...t,judgement:x.judgement,interpretation:x.interpretation,receiptHash:x.receipt.receiptHash,outcome:x.receipt.outcome};});
    const controlOf=(id,expectation)=>{const r=r2.results.find(x=>x.trial.id===id);if(!r)return null;const path=pathDivergence(refSync.pathDigests,r.result.sync?.pathDigests);
      return {trial:id,expectation,outcome:r.receipt.outcome,expected:'no_effect_observed',path:path===null?'same':'diverged at frame '+path,passed:r.receipt.outcome==='no_effect_observed'&&path===null,mutation:r.receipt.variant?r.receipt.variant.mutations[0]:null,receiptHash:r.receipt.receiptHash};};
    const controls=[controlOf('control-same-value','writing the byte\'s own value changes nothing'),controlOf('control-unrelated','changing a byte the program never read changes nothing'),
      controlOf('baseline-after-variants','after every variant, the original cartridge gives the original result again (restoration)')].filter(Boolean);
    report.stages.test={interventions:judged.map(t=>({trial:t.trial,kind:t.kind,candidate:t.candidate,quadrant:t.quadrant,mutation:t.mutation,predictedChanges:t.predict.length,outcome:t.outcome,result:t.judgement.result,reason:t.judgement.reason||null,interpretation:t.interpretation,receiptHash:t.receiptHash})),controls};
    for(const t of judged){const i=t.interpretation;if(i.classification==='confounded')report.hypotheses.confounded.push({id:t.candidate,reason:i.reason});else if(i.classification.startsWith('falsified'))report.hypotheses.falsified.push({id:t.candidate,classification:i.classification,reason:i.reason});}
    if(controls.some(c=>!c.passed))return finish('inconclusive','a control did not behave as expected, so the observations cannot be trusted ('+controls.filter(c=>!c.passed).map(c=>c.trial+': '+c.outcome+', path '+c.path).join('; ')+')');
    const supportedTests=judged.filter(t=>t.interpretation.classification==='supported'),supported=supportedTests.map(t=>tested.find(w=>w.id===t.candidate));
    report.hypotheses.supported=supported.map(w=>w.id);
    if(!supported.length){const conf=judged.filter(t=>t.interpretation.classification==='confounded');
      return finish('inconclusive',conf.length?'no hypothesis was supported: the intervention on '+conf.map(t=>t.candidate).join(', ')+' changed the program\'s execution (confounded), so the plausible candidates cannot be told apart by this experiment':'every tested hypothesis was falsified',{unresolved:conf.map(t=>t.candidate)});}
    const distinct=supported.filter((w,i)=>supported.findIndex(x=>sameTable(x,w))===i);
    if(distinct.length>1)return finish('ambiguous','several hypotheses survived their interventions and describe different tables: '+distinct.map(w=>w.id).join(', '),{unresolved:distinct.map(w=>w.id)});
    const w=supported[0],first0=supportedTests[0];
    // the survivor again: a second record and quadrant (a positive control at another position) and the first change repeated
    const second=Finder.planTileIntervention(w,rom,layout,{skipKeys:[first0.key],quadrant:'BR'});
    const confirmTrials=[{id:'baseline',kind:'baseline',mutations:[]},{id:'tile-repeat',kind:'variant',mutations:[first0.mutation]},...(second?[{id:'tile-second-position',kind:'variant',mutations:[second.mutation]}]:[])];
    const rc=await runPlan(plan('confirm',rom,session.identity,training.steps,training.captures,confirmTrials),'test');
    const repeat=rc.reference?interpret({...first0,trial:'tile-repeat'},rc,rc.reference.result.sync,roles,traceComplete,layout):null;
    const secondJ=rc.reference&&second?interpret({...second,trial:'tile-second-position'},rc,rc.reference.result.sync,roles,traceComplete,layout):null;
    const firstResult=r2.results.find(x=>x.trial.id===first0.trial).result,repeatResult=repeat?.result;
    const repeatIdentical=!!repeatResult&&firstResult.captures.every(c=>{const d=repeatResult.captures.find(x=>x.label===c.label);return d&&contract.hashOf(c.digests)===contract.hashOf(d.digests);});
    const confirm={repeat:repeat?{classification:repeat.interpretation.classification,identicalToFirst:repeatIdentical,receiptHash:repeat.receipt.receiptHash}:null,
      secondPosition:secondJ?{key:second.key,quadrant:second.quadrant,mutation:second.mutation,predictedChanges:second.predict.length,classification:secondJ.interpretation.classification,result:secondJ.judgement.result,receiptHash:secondJ.receipt.receiptHash}:{classification:'not available',reason:'the candidate has no second record that appears exactly once'}};
    report.stages.test.confirm=confirm;
    if(!repeat||repeat.interpretation.classification!=='supported'||!repeatIdentical)return finish('inconclusive','the supported intervention did not repeat identically on the same engine');
    if(secondJ&&secondJ.interpretation.classification!=='supported')return finish('inconclusive','the survivor\'s prediction failed at a second record position ('+secondJ.interpretation.classification+')');
    // the palette (attribute) array of the surviving candidate, tested the same way
    const arrays=Finder.attributeArrays(w,rom,layout,roles,ref.trace.events),baseAttrs=new Map([...visibleMap(r2.reference.result)].map(([k,v])=>[k,v.attributes]));
    const attrTest=arrays.length?Finder.planAttributeIntervention(w,arrays[0],rom,layout,baseAttrs):null;let attrJudged=null,ra=null;
    if(attrTest){ra=await runPlan(plan('attribute-intervention',rom,session.identity,training.steps,training.captures,[{id:'baseline',kind:'baseline',mutations:[]},{id:'attribute-0',kind:'variant',mutations:[attrTest.mutation]}]),'test');
      if(ra.reference){const x=interpret({...attrTest,trial:'attribute-0'},ra,ra.reference.result.sync,roles,traceComplete,layout);attrJudged={...attrTest,trial:'attribute-0',judgement:x.judgement,interpretation:x.interpretation,receiptHash:x.receipt.receiptHash,outcome:x.receipt.outcome};}}
    const all=[...judged,...(attrJudged?[attrJudged]:[])];
    report.stages.test.interventions=all.map(t=>({trial:t.trial,kind:t.kind,candidate:t.candidate,quadrant:t.quadrant,mutation:t.mutation,predictedChanges:t.predict.length,outcome:t.outcome,result:t.judgement.result,reason:t.judgement.reason||null,interpretation:t.interpretation,receiptHash:t.receiptHash}));
    report.stages.test.attributeArrays=arrays.slice(0,4).map(a=>({physical:a.physical,decode:a.decode,constraints:a.constraints,instructions:a.instructions.length}));
    // 4. freeze
    const ownTests=[...all.filter(t=>t.candidate===w.id),...(secondJ?[{...second,judgement:secondJ.judgement,receiptHash:secondJ.receipt.receiptHash}]:[])];
    const definition=contract.sealCandidate(Finder.define({w,array:attrJudged?.interpretation.classification==='supported'?arrays[0]:null,interventions:ownTests,repeatability:'passed: two cold and two restored runs identical; the supporting intervention repeated identically (same engine)',rom,layout,
      evidence:{sourceSha256:romSha,plans:report.plans.map(x=>x.planHash)}}));
    store.addCandidate(definition);
    report.stages.freeze={definitionHash:definition.definitionHash,candidate:w.id,rank:w.rank,revision:definition.revision?.number??1,numbering:definition.table.numbering||'operand-evidence',frozenBeforeHoldout:true};
    report.definition=definition;
    if(signal?.aborted)return {...finish('inconclusive','cancelled'),cancelled:true};
    // 5. withheld input, after the freeze
    stage('holdout',{message:'Running the withheld input and reconstructing it from the frozen definition'});
    const r3=await runPlan(plan('holdout',rom,session.identity,holdout.steps,holdout.captures,[{id:'baseline',kind:'baseline',mutations:[]}]),'holdout');
    if(!r3.reference)return finish('inconclusive','the withheld input did not reach its target',{definitionFrozen:true});
    const shot=r3.reference.result.captures[0],reconstruction=Finder.reconstruct(definition,rom,layout,captureView(shot));
    report.holdout={label:shot.label,definitionHash:definition.definitionHash,inputHash:contract.hashOf(holdout.steps),reconstruction,
      observedAttributes:Array.from(Finder.visible(captureView(shot)).attributes),selfCheck:selfCheck(reconstruction,Finder.visible(captureView(shot))),claims:claimsOf(definition,rom,reconstruction,shot.label)};
    report.baseUnchanged=runs.every(r=>r.baseUnchanged)&&contract.sha256(rom)===romSha;
    // 6. verification jobs in this engine (the independent emulator runs the same jobs outside the editor)
    if(prepareVerification){stage('verification',{message:'Running the engine-neutral verification jobs in this engine'});
      report.verification=await verificationJobs({session,rom,romSha,layout,r1,r2,rc,ra,r3,judged,attrJudged,repeat,secondJ,second,first0,controls,claims:report.holdout.claims,training,holdout,signal});}
    report.verification={...(report.verification||{}),sameEngine:'repeatability '+r1.repeatability+'; '+ownTests.filter(t=>t.judgement.result==='supported').length+' predicted interventions supported',
      independent:'not performed in the editor: run the jobs in an independent emulator (tools/agent-lab/independent/verify-package.cjs) and attach its receipt'};
    const numbering=definition.table.numbering||'operand-evidence';
    if(numbering==='relative')return finish('ambiguous','the table\'s location and layout are supported, but no instruction names record 0, so record numbering is undetermined: IDs are relative to the lowest observed record and exact record identity is not claimed',{definitionFrozen:true,numbering});
    return finish('candidate','one hypothesis survived its predicted interventions, at two record positions, repeated identically, with every control and decoy behaving as expected',{definitionFrozen:true,numbering});
  }finally{session.close('discovery finished');}
}
// the definition's predicted attribute bits against the attribute bytes the capture shows: a same-engine consistency check
function selfCheck(reconstruction,visible){let known=0,agree=0;for(const a of reconstruction.attributes){const o=visible.attributes[a.index];for(let b=0;b<8;b++)if(a.knownMask>>b&1){known++;if(((a.value^o)>>b&1)===0)agree++;}}return {attributeBitsPredicted:known,agreeWithCapture:agree,kind:'same-engine consistency (not independent)'};}
// What the frozen definition claims about the withheld screen, in engine-neutral form: each claimed cell's four tiles
// (decoded from the cartridge with the definition) and every stated attribute bit.
function claimsOf(definition,rom,reconstruction,label){
  const t=definition.table,cells=[];
  for(const c of reconstruction.cells){if(!c.ids.length)continue;const tiles=Finder.decodeRecord(definition,rom,c.ids[0]);cells.push({cell:[c.mx,c.my],status:c.status,ids:c.ids.slice(),index:(2*c.my+t.grid.y)*32+2*c.mx+t.grid.x,tiles});}
  return {label,definitionHash:definition.definitionHash,cells,attributes:reconstruction.attributes.filter(a=>a.knownMask).map(a=>({index:a.index,value:a.value,knownMask:a.knownMask}))};
}
// Each verification job runs from power-on with the masks the frame-mode run latched; captures at NMI-handler entries.
async function verificationJobs({session,rom,romSha,layout,r1,r2,rc,ra,r3,judged,attrJudged,repeat,secondJ,second,first0,controls,claims,training,holdout,signal}){
  const specs=[],add=(id,kind,result,mutations,captures,expectation,extra={})=>{if(result?.sync)specs.push({id,kind,result,mutations,captures,expectation,...extra});};
  const resultOf=(run,trial)=>run?.results.find(x=>x.trial.id===trial)?.result;
  add('training-baseline','baseline',r1.reference.result,[],training.captures,{kind:'reference'},{trace:true,chr:true});
  add('holdout-baseline','holdout',r3.reference.result,[],holdout.captures,{kind:'claims',claims});
  for(const t of judged){const c=t.interpretation.classification;
    add(t.trial,'intervention',resultOf(r2,t.trial),[t.mutation],training.captures,c==='supported'?{kind:'prediction',predict:t.predict,candidate:t.candidate}:c==='falsified-not-read'||c==='falsified-no-observed-effect'?{kind:'no-effect',candidate:t.candidate,reason:c}:{kind:'compare-only',candidate:t.candidate,reason:c});}
  if(second&&secondJ?.interpretation.classification==='supported')add('tile-second-position','intervention',resultOf(rc,'tile-second-position'),[second.mutation],training.captures,{kind:'prediction',predict:second.predict,candidate:second.candidate});
  if(attrJudged&&attrJudged.interpretation.classification==='supported')add('attribute-0','intervention',resultOf(ra,'attribute-0'),[attrJudged.mutation],training.captures,{kind:'prediction',predict:attrJudged.predict,candidate:attrJudged.candidate});
  for(const c of controls)if(c.mutation)add(c.trial,'control',resultOf(r2,c.trial),[{offset:c.mutation.offset,expected:c.mutation.expected,value:c.mutation.value}],training.captures,{kind:'no-effect',reason:c.expectation});
  const jobs=[];let colourClass=null;
  for(const s of specs){
    if(signal?.aborted)break;
    const job=V.deriveJob({id:s.id,kind:s.kind,cartridgeSha256:romSha,mutations:s.mutations,sync:s.result.sync,captures:s.captures,trace:!!s.trace,chr:!!s.chr,pixels:true});
    const variant=s.mutations.length?contract.buildVariant(rom,romSha,contract.validateMutations(rom,layout,s.mutations)):{bytes:rom,sha256:romSha};
    const out=await session.run({job,rom:variant.bytes,romSha:variant.sha256,budgets:{wallMs:60000}},{signal});
    for(const c of out.job?.captures||[])if(c.colourClass&&!colourClass)colourClass=Array.from(c.colourClass);
    const captures=(out.job?.captures||[]).map(c=>{const n=V.normalize(c,{engine:'forge',mirroring:layout.mirroring,colourClass:c.colourClass});return {label:c.label,nmi:c.nmi,frame:c.frame,latches:c.latches,line:c.line,digests:V.digestAll(n),normalized:n};});
    jobs.push({job:{...job,variantSha256:variant.sha256},expectation:s.expectation,forge:{captures,frames:out.job?.frames??null,nmis:out.job?.nmis??null,latches:out.job?.latches??null,multiLatchFrames:out.job?.multiLatchFrames??null,missing:out.job?.missing??null,stopReason:out.job?.stopReason||out.stopReason||null}});
  }
  // the same predictions judged on this engine's job captures (same-engine; the independent receipt repeats them on another engine)
  const byId=id=>jobs.find(j=>j.job.id===id),base=byId('training-baseline'),checks=[];
  for(const j of jobs){const e=j.expectation;if(!base)break;
    if(e.kind==='prediction'||e.kind==='no-effect')for(const c of j.forge.captures){const b=base.forge.captures.find(x=>x.label===c.label);if(!b)continue;
      const r=e.kind==='prediction'?V.checkPrediction(b.normalized,c.normalized,e.predict.filter(p=>p.label===c.label)):V.checkNoEffect(b.normalized,c.normalized);checks.push({job:j.job.id,label:c.label,kind:e.kind,...r});}
    if(e.kind==='claims'){const h=j.forge.captures[0];if(h)checks.push({job:j.job.id,label:h.label,kind:'claims',...V.checkClaims(h.normalized,e.claims)});}}
  return {jobs,sameEngineChecks:checks,mirroring:layout.mirroring,colourClass};
}
services.MetatileDiscovery=Object.freeze({discover});
})();
