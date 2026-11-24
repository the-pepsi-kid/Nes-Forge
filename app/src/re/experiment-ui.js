/* AL-EXP-01: the experimental discovery panel and its commands. In this slice the panel runs only the synthetic
 * demonstration: Forge's own original test cartridge, in an isolated copy of the editor. It never uses the editor's
 * emulator, project, cartridge or library. What it finds is a candidate, shown as such; independent verification is not
 * something the editor can do for itself and is reported as not performed. */
(()=>{
'use strict';
const F=window.Forge,services=F.services,C=F.commands,contract=window.ForgeExperimentContract,Evidence=window.ForgeExperimentEvidence,demo=window.ForgeExperimentDemoFixture;
let running=null,last=null,lastStore=null,root=null,c={};
function fail(message){throw Error('Experiments: '+message);}
function bytesOfDemo(){const s=atob(demo.base64),b=new Uint8Array(s.length);for(let i=0;i<s.length;i++)b[i]=s.charCodeAt(i);if(contract.sha256(b)!==demo.sha256)fail('the embedded demonstration cartridge does not match its SHA-256');return b;}
function requireSynthetic(bytes){const layout=contract.romLayout(bytes);if(!contract.isSynthetic(bytes,layout))fail('this slice runs experiments only on Forge\'s synthetic fixtures; this cartridge carries no synthetic-fixture marker');return layout;}
async function exclusive(label,fn){
  if(running)fail('an experiment is already running ('+running.label+')');
  if(!services.ExperimentSandbox.available())fail('isolation is not available here: experiments need the standalone editor in a browser');
  const controller=new AbortController();running={label,controller,stage:null,started:Date.now()};refresh();
  try{return await fn(controller.signal,p=>{running.stage=p;refresh();});}finally{running=null;refresh();}
}
async function discover(bytes,training,holdout){
  requireSynthetic(bytes);const store=Evidence.createStore();
  return exclusive('discovery',async(signal,progress)=>{const report=await services.MetatileDiscovery.discover({rom:bytes,training,holdout,signal,onProgress:progress,store});last=report;lastStore=store;return report;});
}
function runDemo(){return discover(bytesOfDemo(),demo.training,demo.holdout);}

// ---------- panel ----------
const make=(tag,props={},text)=>{const n=document.createElement(tag);Object.assign(n,props);if(text!==undefined)n.textContent=text;return n;};
const hex=n=>'$'+n.toString(16).toUpperCase();
function mount(){
  if(root)return root;const host=document.getElementById('reRuntimeWorkspace');if(!host||!demo)return null;
  const css=make('style',{id:'reDiscoveryStyles'});css.textContent='#reDiscoveryPanel{margin:14px 0;padding:10px;border:1px solid #6b5f8a;border-radius:6px;min-width:0;overflow-wrap:anywhere}#reDiscoveryPanel .re-discovery-actions{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}#reDiscoveryPanel table{border-collapse:collapse;width:100%;font-size:12px;display:block;overflow-x:auto}#reDiscoveryPanel th,#reDiscoveryPanel td{border-bottom:1px solid #444;padding:3px 6px;text-align:left;white-space:nowrap}#reDiscoveryPanel .re-chip{display:inline-block;padding:1px 6px;border-radius:9px;border:1px solid #b08cff;color:#d9c8ff;font-size:12px}#reDiscoveryPanel [data-ok=false]{color:#ff9d8a}#reDiscoveryPanel [data-ok=true]{color:#9ee39e}';
  root=make('section',{id:'reDiscoveryPanel'});root.setAttribute('aria-labelledby','reDiscoveryTitle');
  root.append(css,make('h3',{id:'reDiscoveryTitle'},'Experimental discovery · synthetic demonstration'),
    make('p',{},'Finds an unknown metatile table in Forge\'s own synthetic test cartridge: it observes the cartridge running, proposes where the table could be, changes single bytes in private copies to test each guess, and keeps only what the game\'s own drawing confirms. It runs in an isolated copy of this editor. Your project, emulator, cartridge and library are not touched. What it finds is a candidate, not a verified resource.'));
  const actions=make('div',{className:'re-discovery-actions'});
  c.run=make('button',{id:'reDiscoveryRun',type:'button'},'Run demonstration');c.cancel=make('button',{id:'reDiscoveryCancel',type:'button',disabled:true},'Cancel');c.export=make('button',{id:'reDiscoveryExport',type:'button',disabled:true},'Export metadata');
  actions.append(c.run,c.cancel,c.export);c.status=make('p',{id:'reDiscoveryStatus'});c.status.setAttribute('role','status');c.status.setAttribute('aria-live','polite');c.result=make('div',{id:'reDiscoveryResult'});
  root.append(actions,c.status,c.result);
  c.run.addEventListener('click',()=>{runDemo().then(render).catch(e=>{c.status.textContent='Stopped: '+e.message;c.status.dataset.ok='false';});});
  c.cancel.addEventListener('click',()=>running?.controller.abort());
  c.export.addEventListener('click',()=>{if(!lastStore)return;const blob=new Blob([JSON.stringify(lastStore.exportMetadata({privacy:'synthetic'}),null,1)],{type:'application/json'}),a=make('a',{href:URL.createObjectURL(blob),download:'al-exp-01-demonstration-metadata.json'});document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);});
  for(const type of ['keydown','keyup'])root.addEventListener(type,e=>e.stopPropagation?.());
  const after=document.getElementById('reExperimentsPanel');if(after&&after.parentNode===host)after.after(root);else host.appendChild(root);
  refresh();return root;
}
function refresh(){if(!root)return;c.run.disabled=!!running;c.cancel.disabled=!running;c.export.disabled=!!running||!lastStore;
  if(running){const s=running.stage||{};c.status.dataset.ok='';c.status.textContent='Running in an isolated copy of the editor · '+(s.message||s.stage||'starting')+(s.frame?' · frame '+s.frame+'/'+s.total:'');}}
function render(report){
  if(!root)return;c.result.replaceChildren();c.status.dataset.ok='true';c.status.textContent='Finished. Result: a candidate definition (not a verified resource).';
  const d=report.definition,o=report.stages.observe,t=report.stages.test,h=report.holdout;
  const p=(text,ok)=>{const n=make('p',{},text);if(ok!==undefined)n.dataset.ok=String(ok);c.result.appendChild(n);return n;};
  p('Isolation: an identical copy of this editor build (document '+report.identity.documentSha256.slice(0,12)+'…), started in '+report.sandbox.bootMs+' ms; '+report.sandbox.runs+' runs. The editor\'s own emulator was not used.');
  p('Same-engine repeatability: '+o.repeatability+' (two cold runs and two runs restored from a checkpoint gave identical results). This shows determinism, not correctness.',o.repeatability==='passed');
  const table=make('table');table.innerHTML='<thead><tr><th>Rank</th><th>Layout</th><th>Where</th><th>Screens explained</th><th>Read by the game</th><th>Tested</th></tr></thead>';const body=make('tbody');
  for(const row of report.stages.propose.ranked.slice(0,5)){const test=t.interventions.find(i=>i.candidate===row.id&&i.kind==='tile'),tr=make('tr');
    for(const v of [row.rank,row.layout+' · '+row.order+(row.layout==='split'?' · stride '+row.fieldStep:''),'file '+hex(row.base.physical),Math.round(row.coverage*100)+'%',row.traceSupport===null?'—':Math.round(row.traceSupport*100)+'%',test?test.result:'not tested'])tr.appendChild(make('td',{},String(v)));
    if(test)tr.lastChild.dataset.ok=String(test.result==='supported');body.appendChild(tr);}
  table.appendChild(body);c.result.appendChild(table);
  p('Controls: '+t.controls.map(x=>x.trial.replace('control-','')+' → '+x.outcome.replace(/_/g,' ')).join('; ')+'.',t.controls.every(x=>x.passed));
  p('Frozen definition '+d.definitionHash.slice(0,12)+'…: a '+d.table.layout+' table ('+d.table.order+' order'+(d.table.layout==='split'?', arrays '+d.table.fieldStep+' bytes apart':'')+') at file '+hex(d.table.physicalBase)+', records 0–'+d.extent.highest+' ('+d.extent.knownIds.length+' seen); '+(d.attributes?'palette array at file '+hex(d.attributes.physicalBase)+' ('+d.attributes.decode+')':'no palette array confirmed')+'; '+d.aliases.length+' alias group(s). ').appendChild(make('span',{className:'re-chip'},'candidate'));
  const k=h.reconstruction.counts;
  p('Withheld screen, reconstructed from the frozen definition: '+k.observed+' cells from seen records, '+k.interior+' from unseen records inside the table, '+k.resolved+' aliases resolved by palette, '+k.ambiguous+' ambiguous, '+k.extended+' past the seen range, '+k.unknown+' unknown. Attribute bits predicted: '+h.selfCheck.attributeBitsPredicted+', '+h.selfCheck.agreeWithCapture+' agree with the capture (same-engine consistency).');
  p('Independent verification: not performed in the editor. The acceptance suite checks the result against the fixture generator\'s own data, outside the editor.');
}
function plain(report){return JSON.parse(JSON.stringify(report,(k,v)=>v instanceof Uint8Array?Array.from(v):v));}

// ---------- commands ----------
if(C?.register){
  const R=spec=>C.register({group:'experiment',...spec});
  R({name:'experiment.describe',title:'Experiment contract',summary:'Formats, outcome and hypothesis states, limits. Experiments in this slice run only on Forge synthetic fixtures.',run:()=>({version:contract.version,formats:contract.FORMATS,outcomes:contract.OUTCOMES,hypotheses:contract.HYPOTHESES,limits:contract.LIMITS,channels:contract.CHANNELS,trialKinds:contract.TRIAL_KINDS,isolation:services.ExperimentSandbox.available()?'available':'unavailable here'})});
  R({name:'experiment.validatePlan',title:'Validate an experiment plan',args:{plan:{type:'object',required:true}},summary:'Checks a NESForgeExperimentPlan v1. Nothing runs.',run:a=>{const p=contract.validatePlan(a.plan);return {planHash:p.planHash,totalFrames:p.totalFrames,trials:p.trials.map(t=>({id:t.id,kind:t.kind,mutations:t.mutations.length}))};}});
  R({name:'experiment.run',title:'Run an experiment plan on a synthetic fixture',args:{plan:{type:'object',required:true},bytes:{type:'bytes',required:true}},summary:'Runs the plan\'s trials in the isolated sandbox. Only cartridges carrying the synthetic-fixture marker are accepted.',
    run:a=>{requireSynthetic(a.bytes);const store=Evidence.createStore();return exclusive('plan',async(signal,progress)=>{const r=await services.ExperimentRunner.run(a.plan,a.bytes,{store,signal,onProgress:progress});lastStore=store;return {repeatability:r.repeatability,baseUnchanged:r.baseUnchanged,receipts:r.receipts,identity:r.identity,store:store.stats()};});}});
  R({name:'experiment.discoverMetatiles',title:'Discover a metatile table in a synthetic fixture',args:{bytes:{type:'bytes',required:true},training:{type:'object',required:true},holdout:{type:'object',required:true}},summary:'Observe, propose, test, freeze, then reconstruct the withheld input. Synthetic fixtures only.',run:async a=>plain(await discover(a.bytes,a.training,a.holdout))});
  R({name:'experiment.demo',title:'Run the synthetic discovery demonstration',summary:'The experimental panel\'s demonstration on the embedded synthetic cartridge.',run:async()=>{const r=await runDemo();render(r);return plain(r);}});
  R({name:'experiment.cancel',title:'Cancel the running experiment',run:()=>{if(!running)return {cancelled:false};running.controller.abort();return {cancelled:true,label:running.label};}});
  R({name:'experiment.status',title:'Experiment status',run:()=>({running:running?{label:running.label,stage:running.stage}:null,isolation:services.ExperimentSandbox.available(),sessions:services.ExperimentSandbox.sessions(),last:last?{definitionHash:last.definition?.definitionHash||null}:null})});
  R({name:'experiment.exportMetadata',title:'Export the last experiment\'s metadata',summary:'Hashes, offsets, counts and outcomes; no cartridge or screen bytes.',run:()=>{if(!lastStore)fail('no experiment has run in this session');return lastStore.exportMetadata({privacy:'synthetic'});}});
}
services.ExperimentUI=Object.freeze({mount,refresh,render,runDemo,status:()=>({running:!!running,last:!!last})});
if(!services.ExperimentSandboxAgent.inSandbox())mount();
})();
