/* AL-EXP-01/02: the experimental discovery panel and its commands. The panel runs only the synthetic demonstration:
 * Forge's own original test cartridge, in an isolated copy of the editor. It never uses the editor's emulator, project,
 * cartridge or library. What it finds is a candidate, shown as such. Independent verification needs an emulator that is
 * not NES Forge: the panel prepares the engine-neutral jobs, exports them in a reproducible evidence package, and
 * re-checks a receipt from the development harness (FCEUX) itself; without one it says verification was not performed.
 * Nothing here can promote, register or write a resource. */
(()=>{
'use strict';
const F=window.Forge,services=F.services,C=F.commands,contract=window.ForgeExperimentContract,Evidence=window.ForgeExperimentEvidence,demo=window.ForgeExperimentDemoFixture;
const V=window.ForgeExperimentVerification,Pkg=window.ForgeExperimentPackage,Life=window.ForgeExperimentLifecycle,Promo=window.ForgeExperimentPromotion;
let running=null,last=null,lastStore=null,lastRom=null,attached=null,root=null,c={},inspecting=null;
function fail(message){throw Error('Experiments: '+message);}
function bytesOfDemo(){const s=atob(demo.base64),b=new Uint8Array(s.length);for(let i=0;i<s.length;i++)b[i]=s.charCodeAt(i);if(contract.sha256(b)!==demo.sha256)fail('the embedded demonstration cartridge does not match its SHA-256');return b;}
function requireSynthetic(bytes){const layout=contract.romLayout(bytes);if(!contract.isSynthetic(bytes,layout))fail('experiments run only on Forge\'s synthetic fixtures; this cartridge carries no synthetic-fixture marker');return layout;}
async function exclusive(label,fn){
  if(running)fail('an experiment is already running ('+running.label+')');
  if(!services.ExperimentSandbox.available())fail('isolation is not available here: experiments need the standalone editor in a browser');
  const controller=new AbortController();running={label,controller,stage:null,started:Date.now()};refresh();
  try{return await fn(controller.signal,p=>{running.stage=p;refresh();});}finally{running=null;refresh();}
}
async function discover(bytes,training,holdout){
  requireSynthetic(bytes);const store=Evidence.createStore();
  return exclusive('discovery',async(signal,progress)=>{const report=await services.MetatileDiscovery.discover({rom:bytes,training,holdout,signal,onProgress:progress,store});last=report;lastStore=store;lastRom=new Uint8Array(bytes);attached=null;return report;});
}
function runDemo(){return discover(bytesOfDemo(),demo.training,demo.holdout);}
function assessment(){return last?Life.assess({discovery:last,independent:attached?.effective||null}):Life.assess({});}
function packageOf({privacy='synthetic'}={}){if(!last||!lastStore)fail('no experiment has run in this session');
  return Pkg.build({report:last,store:lastStore,rom:lastRom,privacy,independent:attached?[attached.receipt]:[],assessment:assessment(),
    generation:last.source.sha256===demo.sha256?{generator:demo.generator,seed:demo.seed,note:'regenerate with the AL-EXP-01 fixture generator (QA/fixtures/al-exp-01/generate.cjs) in the NES Forge repository'}:null});}
// The receipt from an independent emulator: its seal checked, its subject matched, its comparisons and predictions
// recomputed here from its raw captures. The verdict used is NES Forge's recomputation.
function attach(receipt){
  if(!last)fail('run the demonstration first');if(!last.verification?.jobs?.length)fail('this result has no verification jobs to compare with');
  const seal=V.verifyIndependent(receipt);if(!seal.ok)fail('the receipt is refused: '+seal.problems.join('; '));
  if(receipt.subject.cartridgeSha256!==last.source.sha256)fail('the receipt is about another cartridge');
  if(last.definition&&receipt.subject.definitionHash!==last.definition.definitionHash)fail('the receipt is about another definition ('+String(receipt.subject.definitionHash).slice(0,12)+'…)');
  const forgeJobs=last.verification.jobs.map(j=>({job:j.job,expectation:j.expectation,captures:j.forge.captures.map(x=>({label:x.label,nmi:x.nmi,digests:x.digests,channels:x.normalized.channels}))}));
  const blocked=receipt.verdict.result==='blocked';
  const re=blocked?{comparisons:[],predictions:[],verdict:receipt.verdict,notes:['the independent emulator could not run'],matchesReceipt:true}:V.recheck({receipt,forgeJobs});
  attached={receipt,recheck:re,effective:{...receipt,verdict:re.verdict}};
  return {verdict:re.verdict,matchesReceipt:re.matchesReceipt,checkpoints:re.comparisons.length,agree:re.comparisons.filter(x=>x.agree).length,predictions:re.predictions.length,predictionsHold:re.predictions.filter(p=>p.holds).length,notes:re.notes,lifecycle:assessment()};
}
// Re-run a package's plans and jobs from its recorded inputs and compare every capture digest with the recorded one.
async function replay(pkg,local=null){
  const v=Pkg.validate(pkg);if(!v.ok)fail('the package does not validate: '+v.problems.join('; '));
  const rom=Pkg.cartridgeBytes(pkg,local);requireSynthetic(rom);
  return exclusive('replay',async(signal,progress)=>{
    const session=await services.ExperimentSandbox.open(),out={build:{recorded:pkg.manifest.engine.documentSha256,now:session.identity.documentSha256},trials:[],jobs:[]};
    try{
      for(const p of pkg.plans){if(!p.plan||signal.aborted)continue;const {engine,planHash,totalFrames,...body}=p.plan;
        const r=await services.ExperimentRunner.run(body,rom,{session,signal,onProgress:x=>progress({stage:'replay '+p.id,...x})});
        for(const rec of r.receipts){const old=pkg.receipts.find(x=>x.receiptHash===p.receipts[r.receipts.indexOf(rec)]||(x.planId===p.id&&x.trialId===rec.trialId));
          const same=!!old&&old.outcome===rec.outcome&&old.captures.length===rec.captures.length&&old.captures.every((cc,i)=>contract.hashOf(cc.digests)===contract.hashOf(rec.captures[i].digests));
          out.trials.push({plan:p.id,trial:rec.trialId,outcome:rec.outcome,recorded:old?.outcome??null,reproduced:same});}}
      for(const j of pkg.verification?.jobs||[]){if(signal.aborted)break;const muts=contract.validateMutations(rom,contract.romLayout(rom),j.job.mutations||[]),variant=muts.length?contract.buildVariant(rom,pkg.cartridge.sha256,muts):{bytes:rom,sha256:pkg.cartridge.sha256};
        const res=await session.run({job:j.job,rom:variant.bytes,romSha:variant.sha256,budgets:{wallMs:60000}},{signal});
        const caps=(res.job?.captures||[]).map(x=>({label:x.label,digests:V.digestAll(V.normalize(x,{engine:'forge',mirroring:pkg.verification.mirroring,colourClass:x.colourClass}))}));
        out.jobs.push({job:j.job.id,reproduced:j.forge.captures.every(fc=>{const n=caps.find(x=>x.label===fc.label);return n&&Object.keys(fc.digests).every(ch=>fc.digests[ch]===n.digests[ch]);})});}
    }finally{session.close('replay finished');}
    out.summary={trials:out.trials.length,reproduced:out.trials.filter(t=>t.reproduced).length,jobs:out.jobs.length,jobsReproduced:out.jobs.filter(t=>t.reproduced).length,sameBuild:out.build.recorded===out.build.now};
    return out;});
}

// ---------- panel ----------
const make=(tag,props={},text)=>{const n=document.createElement(tag);Object.assign(n,props);if(text!==undefined)n.textContent=text;return n;};
const hex=n=>'$'+n.toString(16).toUpperCase();
const download=(name,data)=>{const blob=new Blob([JSON.stringify(data,null,1)],{type:'application/json'}),a=make('a',{href:URL.createObjectURL(blob),download:name});document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
function mount(){
  if(root)return root;const host=document.getElementById('reRuntimeWorkspace');if(!host||!demo)return null;
  const css=make('style',{id:'reDiscoveryStyles'});css.textContent='#reDiscoveryPanel{margin:14px 0;padding:10px;border:1px solid #6b5f8a;border-radius:6px;min-width:0;overflow-wrap:anywhere}#reDiscoveryPanel .re-discovery-actions{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}#reDiscoveryPanel table{border-collapse:collapse;width:100%;font-size:12px;display:block;overflow-x:auto}#reDiscoveryPanel th,#reDiscoveryPanel td{border-bottom:1px solid #444;padding:3px 6px;text-align:left;white-space:nowrap}#reDiscoveryPanel .re-chip,#reDiscoveryPanel .re-state{display:inline-block;padding:1px 6px;border-radius:9px;border:1px solid #b08cff;color:#d9c8ff;font-size:12px;margin-left:4px}#reDiscoveryPanel .re-state{border-color:#7fb3d5;color:#cfe6f5}#reDiscoveryPanel [data-ok=false]{color:#ff9d8a}#reDiscoveryPanel [data-ok=true]{color:#9ee39e}#reDiscoveryPanel pre{max-height:260px;overflow:auto;font-size:11px;background:#1b1830;padding:6px;white-space:pre-wrap}#reDiscoveryPanel h4{margin:10px 0 4px;font-size:13px}';
  root=make('section',{id:'reDiscoveryPanel'});root.setAttribute('aria-labelledby','reDiscoveryTitle');
  root.append(css,make('h3',{id:'reDiscoveryTitle'},'Experimental discovery · synthetic demonstration'),
    make('p',{},'Finds an unknown metatile table in Forge\'s own synthetic test cartridge: it observes the cartridge running, proposes where the table could be, changes single bytes in private copies to test each guess, and keeps only what the game\'s own drawing confirms. It runs in an isolated copy of this editor. Your project, emulator, cartridge and library are not touched. What it finds is a candidate, not a verified resource.'));
  const actions=make('div',{className:'re-discovery-actions'});
  c.run=make('button',{id:'reDiscoveryRun',type:'button'},'Run demonstration');c.cancel=make('button',{id:'reDiscoveryCancel',type:'button',disabled:true},'Cancel');c.export=make('button',{id:'reDiscoveryExport',type:'button',disabled:true},'Export metadata');
  c.package=make('button',{id:'reDiscoveryPackage',type:'button',disabled:true},'Export evidence package');c.attach=make('button',{id:'reDiscoveryAttach',type:'button',disabled:true},'Attach verification receipt…');
  c.replay=make('button',{id:'reDiscoveryReplay',type:'button',disabled:true},'Reproduce from recorded inputs');
  c.inspectDef=make('button',{id:'reDiscoveryInspectDefinition',type:'button',disabled:true},'Inspect definition');c.inspectHyp=make('button',{id:'reDiscoveryInspectHypotheses',type:'button',disabled:true},'Inspect hypotheses');c.inspectDisc=make('button',{id:'reDiscoveryInspectDiscrepancies',type:'button',disabled:true},'Inspect discrepancies');
  actions.append(c.run,c.cancel,c.export,c.package,c.attach,c.replay,c.inspectDef,c.inspectHyp,c.inspectDisc);c.status=make('p',{id:'reDiscoveryStatus'});c.status.setAttribute('role','status');c.status.setAttribute('aria-live','polite');c.result=make('div',{id:'reDiscoveryResult'});c.detail=make('div',{id:'reDiscoveryDetail'});
  root.append(actions,c.status,c.result,c.detail);
  c.run.addEventListener('click',()=>{runDemo().then(render).catch(e=>{c.status.textContent='Stopped: '+e.message;c.status.dataset.ok='false';});});
  c.cancel.addEventListener('click',()=>running?.controller.abort());
  c.export.addEventListener('click',()=>{if(lastStore)download('al-exp-demonstration-metadata.json',lastStore.exportMetadata({privacy:'synthetic'}));});
  c.package.addEventListener('click',()=>{try{const p=packageOf();download('al-exp-demonstration.forge-experiment.json',p);c.status.textContent='Exported an evidence package ('+p.manifest.completeness.kind+': '+p.manifest.completeness.embedded+' embedded, '+p.manifest.completeness.referenced+' referenced).';}catch(e){c.status.textContent='Stopped: '+e.message;}});
  c.attach.addEventListener('click',()=>{const input=make('input',{type:'file',accept:'.json,application/json'});input.addEventListener('change',async()=>{const f=input.files?.[0];if(!f)return;try{attach(JSON.parse(await f.text()));render(last);}catch(e){c.status.textContent='Stopped: '+e.message;c.status.dataset.ok='false';}});input.click();});
  c.replay.addEventListener('click',()=>{try{const p=packageOf();replay(p).then(r=>{c.status.textContent='Reproduced from recorded inputs: '+r.summary.reproduced+' of '+r.summary.trials+' trials and '+r.summary.jobsReproduced+' of '+r.summary.jobs+' verification jobs gave identical captures'+(r.summary.sameBuild?'':' (a different build)')+'.';c.status.dataset.ok=String(r.summary.reproduced===r.summary.trials&&r.summary.jobsReproduced===r.summary.jobs);}).catch(e=>{c.status.textContent='Stopped: '+e.message;});}catch(e){c.status.textContent='Stopped: '+e.message;}});
  const show=(what,data)=>{inspecting=inspecting===what?null:what;c.detail.replaceChildren();if(inspecting){c.detail.append(make('h4',{},what),make('pre',{},JSON.stringify(data,(k,v)=>v instanceof Uint8Array?'['+v.length+' bytes]':v,1)));}};
  c.inspectDef.addEventListener('click',()=>show('Candidate definition',last?.definition||{note:'no definition was frozen',result:last?.result}));
  c.inspectHyp.addEventListener('click',()=>show('Competing hypotheses',{...last?.hypotheses,tests:last?.stages?.test?.interventions,confirm:last?.stages?.test?.confirm}));
  c.inspectDisc.addEventListener('click',()=>show('Discrepancies',attached?{verdict:attached.recheck.verdict,notes:attached.recheck.notes,disagreements:attached.recheck.comparisons.filter(x=>!x.agree),failedPredictions:attached.recheck.predictions.filter(p=>!p.holds),timingOnly:attached.recheck.comparisons.filter(x=>x.channels?.ram?.status==='equal-except-timing').map(x=>x.job+' '+x.label)}:{note:'no independent receipt attached: nothing to compare yet'}));
  for(const type of ['keydown','keyup'])root.addEventListener(type,e=>e.stopPropagation?.());
  const after=document.getElementById('reExperimentsPanel');if(after&&after.parentNode===host)after.after(root);else host.appendChild(root);
  refresh();return root;
}
function refresh(){if(!root)return;const busy=!!running,has=!!last;c.run.disabled=busy;c.cancel.disabled=!busy;c.export.disabled=busy||!lastStore;
  for(const b of [c.package,c.replay])b.disabled=busy||!has;c.attach.disabled=busy||!has||!last?.verification?.jobs?.length;for(const b of [c.inspectDef,c.inspectHyp,c.inspectDisc])b.disabled=!has;
  if(running){const s=running.stage||{};c.status.dataset.ok='';c.status.textContent='Running in an isolated copy of the editor · '+(s.message||s.stage||'starting')+(s.frame?' · frame '+s.frame+'/'+s.total:'');}}
const CLASS_TEXT={candidate:'a candidate definition (not a verified resource)',ambiguous:'ambiguous (no single answer is claimed)','insufficient-evidence':'insufficient evidence (nothing is claimed)',inconclusive:'inconclusive (nothing is claimed)'};
function render(report){
  if(!root||!report)return;c.result.replaceChildren();const cls=report.result?.classification||'candidate';
  c.status.dataset.ok=String(cls==='candidate');c.status.textContent='Finished. Result: '+(CLASS_TEXT[cls]||cls)+'.';
  const d=report.definition,o=report.stages.observe,t=report.stages.test,h=report.holdout,life=assessment();
  const p=(text,ok)=>{const n=make('p',{},text);if(ok!==undefined)n.dataset.ok=String(ok);c.result.appendChild(n);return n;};
  const head=text=>c.result.appendChild(make('h4',{},text));
  p('Isolation: an identical copy of this editor build (document '+report.identity.documentSha256.slice(0,12)+'…), started in '+report.sandbox.bootMs+' ms; '+report.sandbox.runs+' runs. The editor\'s own emulator was not used. Experiment engine: '+report.identity.engine+'.');
  if(o)p('Same-engine repeatability: '+o.repeatability+' (two cold runs and two runs restored from a checkpoint gave identical results). This shows determinism, not correctness.',o.repeatability==='passed');
  if(report.stages.propose){const table=make('table');table.innerHTML='<thead><tr><th>Rank</th><th>Layout</th><th>Where</th><th>Screens explained</th><th>Read by the game</th><th>Tested</th></tr></thead>';const body=make('tbody');
    for(const row of report.stages.propose.ranked.slice(0,5)){const test=t?.interventions.find(i=>i.candidate===row.id&&i.kind==='tile'),tr=make('tr');
      for(const v of [row.rank,row.layout+' · '+row.order+(row.layout==='split'?' · stride '+row.fieldStep:''),'file '+hex(row.base.physical),Math.round(row.coverage*100)+'%',row.traceSupport===null?'—':Math.round(row.traceSupport*100)+'%',test?test.result:'not tested'])tr.appendChild(make('td',{},String(v)));
      if(test){tr.lastChild.dataset.ok=String(test.result==='supported');tr.lastChild.title=test.interpretation?.reason||'';}body.appendChild(tr);}
    table.appendChild(body);c.result.appendChild(table);}
  if(t){p('Interventions: '+t.interventions.map(i=>i.trial+' → '+(i.interpretation?.classification||i.result)).join('; ')+'.');
    p('Controls: '+t.controls.map(x=>x.trial.replace('control-','')+' → '+x.outcome.replace(/_/g,' ')+(x.path&&x.path!=='same'?' (path '+x.path+')':'')).join('; ')+'.',t.controls.every(x=>x.passed));
    if(t.confirm)p('Second record position: '+(t.confirm.secondPosition?.classification||'—')+'; supporting change repeated: '+(t.confirm.repeat?(t.confirm.repeat.identicalToFirst?'identical captures':'different captures'):'—')+'.');}
  p('Result: '+(CLASS_TEXT[cls]||cls)+'. '+(report.result?.reason||''),cls==='candidate');
  if(d){p('Frozen definition '+d.definitionHash.slice(0,12)+'… (revision '+(d.revision?.number??1)+', decoder '+(d.decoder?d.decoder.name+' v'+d.decoder.version:'—')+'): '+(/^[aeiou]/.test(d.table.layout)?'an ':'a ')+d.table.layout+' table ('+d.table.order+' order'+(d.table.layout==='split'?', arrays '+d.table.fieldStep+' bytes apart':'')+') at file '+hex(d.table.physicalBase)+', records 0–'+d.extent.highest+' ('+d.extent.knownIds.length+' seen; numbering '+(d.table.numbering||'operand-evidence')+'); '+(d.attributes?'palette array at file '+hex(d.attributes.physicalBase)+' ('+d.attributes.decode+')':'no palette array confirmed')+'; '+d.aliases.length+' alias group(s). ').appendChild(make('span',{className:'re-chip'},'candidate'));}
  if(h){const k=h.reconstruction.counts;
    p('Withheld screen, reconstructed from the frozen definition: '+k.observed+' cells from seen records, '+k.interior+' from unseen records inside the table, '+k.resolved+' aliases resolved by palette, '+k.ambiguous+' ambiguous, '+k.extended+' past the seen range, '+k.unknown+' unknown. Attribute bits predicted: '+h.selfCheck.attributeBitsPredicted+', '+h.selfCheck.agreeWithCapture+' agree with the capture (same-engine consistency).');}
  head('Lifecycle');
  const lp=p('State: '+life.state.replace(/-/g,' ')+(life.side?' · '+life.side.replace(/-/g,' '):'')+'. ');lp.appendChild(make('span',{className:'re-state',id:'reDiscoveryLifecycle'},life.side||life.state));
  if(life.sideReason)p(life.sideReason);
  if(life.nextRequires)p('Next ('+life.next.replace(/-/g,' ')+') requires: '+life.nextRequires);
  head('Verification');
  const jobs=report.verification?.jobs||[];
  p('Verification jobs prepared: '+jobs.length+' engine-neutral jobs ('+jobs.reduce((n,j)=>n+j.forge.captures.length,0)+' NMI-synchronized checkpoints) run in this engine; same-engine checks: '+(report.verification?.sameEngineChecks||[]).filter(x=>x.holds).length+' of '+(report.verification?.sameEngineChecks||[]).length+' hold.');
  if(!attached){p('Independent verification: not performed in the editor. It needs an emulator that is not NES Forge: export the evidence package and run tools/agent-lab/independent/verify-package.cjs (FCEUX) from the NES Forge repository, then attach its receipt here. The acceptance suite also checks the result against the fixture generator\'s own data, outside the editor.');}
  else{const r=attached.recheck,e=attached.receipt.engine;
    p('Independent engine: '+e.name+' '+e.version+(e.commit?' ('+e.source+' @ '+e.commit.slice(0,10)+')':'')+(e.license?', '+e.license:'')+'.');
    p('Independent verification (recomputed here from the receipt\'s raw captures): '+r.verdict.result+' — '+r.verdict.reason+(r.matchesReceipt?'':' (the receipt itself claimed '+attached.receipt.verdict.result+')'),r.verdict.result==='verified');
    const agree=r.comparisons.filter(x=>x.agree).length,timing=r.comparisons.filter(x=>x.channels?.ram?.status==='equal-except-timing').length;
    p('Cross-emulator comparison: '+agree+' of '+r.comparisons.length+' checkpoints agree on every compared channel'+(timing?'; '+timing+' differ only in the interrupt frame on the stack (timing, reported)':'')+'. Predictions on the independent engine: '+r.predictions.filter(x=>x.holds).length+' of '+r.predictions.length+' hold.',agree===r.comparisons.length);
    p('Not compared: '+Object.entries(V.NOT_COMPARED).map(([k,v])=>k+' ('+v+')').join('; ')+'.');}
  p('Limitations: NROM only, unscrolled screens, 2x2 metatiles; same-engine results show determinism, not correctness; nothing is promoted or written to the library in this phase.');
}
// command results are JSON: captured bytes stay in the editor (export a package for them) and are reported by length
function plain(report){return JSON.parse(JSON.stringify(report,(k,v)=>v instanceof Uint8Array?{bytes:v.length}:v));}

// ---------- commands ----------
if(C?.register){
  const R=spec=>C.register({group:'experiment',...spec});
  R({name:'experiment.describe',title:'Experiment contract',summary:'Formats, outcome and hypothesis states, lifecycle, limits. Experiments run only on Forge synthetic fixtures.',run:()=>({version:contract.version,formats:contract.FORMATS,outcomes:contract.OUTCOMES,hypotheses:contract.HYPOTHESES,limits:contract.LIMITS,channels:contract.CHANNELS,trialKinds:contract.TRIAL_KINDS,
    lifecycle:{states:Life.STATES,side:Life.SIDE,requirements:Life.REQUIREMENTS},verification:{formats:V.FORMATS,channels:V.CHANNELS,notCompared:V.NOT_COMPARED},promotion:{destinations:Promo.DESTINATIONS},isolation:services.ExperimentSandbox.available()?'available':'unavailable here'})});
  R({name:'experiment.validatePlan',title:'Validate an experiment plan',args:{plan:{type:'object',required:true}},summary:'Checks a NESForgeExperimentPlan v1. Nothing runs.',run:a=>{const p=contract.validatePlan(a.plan);return {planHash:p.planHash,totalFrames:p.totalFrames,trials:p.trials.map(t=>({id:t.id,kind:t.kind,mutations:t.mutations.length}))};}});
  R({name:'experiment.run',title:'Run an experiment plan on a synthetic fixture',args:{plan:{type:'object',required:true},bytes:{type:'bytes',required:true}},summary:'Runs the plan\'s trials in the isolated sandbox. Only cartridges carrying the synthetic-fixture marker are accepted.',
    run:a=>{requireSynthetic(a.bytes);const store=Evidence.createStore();return exclusive('plan',async(signal,progress)=>{const r=await services.ExperimentRunner.run(a.plan,a.bytes,{store,signal,onProgress:progress});lastStore=store;return {repeatability:r.repeatability,baseUnchanged:r.baseUnchanged,receipts:r.receipts,identity:r.identity,store:store.stats(),results:r.results.map(x=>({trial:x.trial.id,sync:x.result.sync?{nmis:x.result.sync.nmiFrames.length,latches:x.result.sync.latches.length,pathDigests:x.result.sync.pathDigests}:null}))};});}});
  R({name:'experiment.discoverMetatiles',title:'Discover a metatile table in a synthetic fixture',args:{bytes:{type:'bytes',required:true},training:{type:'object',required:true},holdout:{type:'object',required:true}},summary:'Observe, propose, test, freeze, reconstruct the withheld input, prepare verification jobs. Synthetic fixtures only.',run:async a=>plain(await discover(a.bytes,a.training,a.holdout))});
  R({name:'experiment.demo',title:'Run the synthetic discovery demonstration',summary:'The experimental panel\'s demonstration on the embedded synthetic cartridge.',run:async()=>{const r=await runDemo();render(r);return plain(r);}});
  R({name:'experiment.cancel',title:'Cancel the running experiment',run:()=>{if(!running)return {cancelled:false};running.controller.abort();return {cancelled:true,label:running.label};}});
  R({name:'experiment.status',title:'Experiment status',run:()=>({running:running?{label:running.label,stage:running.stage}:null,isolation:services.ExperimentSandbox.available(),sessions:services.ExperimentSandbox.sessions(),last:last?{definitionHash:last.definition?.definitionHash||null,classification:last.result?.classification||null}:null,attached:!!attached})});
  R({name:'experiment.exportMetadata',title:'Export the last experiment\'s metadata',summary:'Hashes, offsets, counts and outcomes; no cartridge or screen bytes.',run:()=>{if(!lastStore)fail('no experiment has run in this session');return lastStore.exportMetadata({privacy:'synthetic'});}});
  R({name:'experiment.exportPackage',title:'Export the last experiment as a reproducible evidence package',args:{privacy:{type:'string'}},summary:'NESForgeExperimentPackage v1: cartridge (synthetic only), inputs, plans, receipts, payloads, hypotheses, controls, candidate, reconstruction, verification jobs, lifecycle. privacy "private" keeps every cartridge-derived byte out.',run:a=>packageOf({privacy:a.privacy||'synthetic'})});
  R({name:'experiment.inspectPackage',title:'Inspect an evidence package',args:{package:{type:'object',required:true}},summary:'Validates hashes, receipts, payloads and the cartridge; summarizes completeness. Nothing runs.',run:a=>Pkg.inspect(a.package)});
  R({name:'experiment.replayPackage',title:'Reproduce a package from its recorded inputs',args:{package:{type:'object',required:true},bytes:{type:'bytes'}},summary:'Re-runs every plan and verification job in the sandbox and compares each capture with the recorded one. A referenced cartridge must be supplied (its SHA-256 is checked).',run:a=>replay(a.package,a.bytes||null)});
  R({name:'experiment.attachVerification',title:'Attach an independent emulator\'s verification receipt',args:{receipt:{type:'object',required:true}},summary:'Checks the seal and subject, recomputes every comparison and prediction from the receipt\'s raw captures, and reassesses the lifecycle. The library is not touched.',run:a=>{const r=attach(a.receipt);render(last);return r;}});
  R({name:'experiment.lifecycle',title:'Lifecycle assessment of the last experiment',summary:'The state the evidence supports, its side state, and what the next state requires.',run:()=>assessment()});
  R({name:'experiment.reviseDefinition',title:'Make a new revision of the frozen definition (for review)',args:{changes:{type:'object',required:true},reason:{type:'string',required:true}},summary:'A revision starts untested and names the one it replaces; nothing carries over.',run:a=>{if(!last?.definition)fail('no frozen definition');const rev=contract.reviseCandidate(last.definition,a.changes,a.reason);
    return {definition:rev,lifecycle:Life.assess({discovery:{...last,definition:rev,stages:{...last.stages,freeze:{...last.stages.freeze,definitionHash:rev.definitionHash}}},independent:null,priorEvaluations:last.holdout?[{definitionHash:last.definition.definitionHash,inputHash:last.holdout.inputHash}]:[]})};}});
  R({name:'experiment.promotionPreview',title:'Preview what the candidate would become (no writes)',args:{destination:{type:'string'}},summary:'Eligibility rules and a data-only preview; refused unless the lifecycle reached independent verification. Nothing is written.',run:a=>{if(!last)fail('no experiment has run');const life=assessment();
    return {eligibility:Promo.eligibility({definition:last.definition,assessment:life,destination:a.destination||'metatiles'}),preview:last.definition?Promo.preview({definition:last.definition,rom:lastRom,assessment:life,destination:a.destination||'metatiles'}):null};}});
}
services.ExperimentUI=Object.freeze({mount,refresh,render,runDemo,status:()=>({running:!!running,last:!!last,attached:!!attached})});
if(!services.ExperimentSandboxAgent.inSandbox())mount();
})();
