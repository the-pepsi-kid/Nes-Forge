/* AL-EXP-02: reproducible experiment packages (NESForgeExperimentPackage v1). One JSON document holding everything
 * needed to inspect an investigation and reproduce it: the cartridge (embedded for Forge's synthetic fixtures; for any
 * other cartridge only its SHA-256, to be supplied locally), the inputs, the validated plans, the sealed receipts, the
 * capture payloads, the hypotheses tested and rejected, the controls, the frozen candidate and its revisions, the
 * withheld-screen reconstruction and its claims, the engine-neutral verification jobs with this engine's captures,
 * any independent receipts, the lifecycle assessment and the limitations.
 *
 * Every piece of evidence is either embedded (bytes present, checked against their SHA-256) or referenced (SHA-256
 * only, with the reason it is absent), and the manifest lists which is which. For a private (non-synthetic) cartridge,
 * the cartridge, every capture derived from it and every mutation's byte values are referenced, never embedded. The
 * metadata-only export of AL-EXP-01 stays available as the lightweight alternative. UMD, pure. */
(function(root,factory){const node=typeof module!=='undefined'&&module.exports;const api=factory(node?require('./experiment-contract.js'):root.ForgeExperimentContract,node?require('./experiment-evidence.js'):root.ForgeExperimentEvidence,node?require('./experiment-verification.js'):root.ForgeExperimentVerification);if(node)module.exports=api;else root.ForgeExperimentPackage=api;})(typeof globalThis!=='undefined'?globalThis:this,function(contract,Evidence,V){
'use strict';
const VERSION=1,FORMAT='NESForgeExperimentPackage';
const LARGE=96*1024; // a payload above this is referenced (its SHA-256 kept) rather than embedded, and says so
function fail(message){throw Error('Experiment package: '+message);}
const b64=Evidence.b64,unb64=Evidence.unb64;
// Canonical JSON holds integers only: a fraction is stored as an integer per mille under the field name + "Permille".
function perMille(v){if(Array.isArray(v))return v.map(perMille);if(v&&typeof v==='object'){const out={};for(const [k,x] of Object.entries(v)){if(typeof x==='number'&&!Number.isSafeInteger(x)){if(Number.isFinite(x))out[k+'Permille']=Math.round(x*1000);}else out[k]=perMille(x);}return out;}return v;}
const plain=v=>perMille(JSON.parse(JSON.stringify(v,(k,x)=>x instanceof Uint8Array?Array.from(x):x)));

// report: the discovery report (in memory); store: its evidence store; rom: the cartridge bytes.
function build({report,store,rom,privacy='synthetic',generation=null,independent=[],assessment=null,embedLarge=false}){
  if(!report||report.format!=='NESForgeMetatileDiscovery')fail('needs a discovery report');
  if(!(rom instanceof Uint8Array))fail('needs the cartridge bytes');
  const sha=contract.sha256(rom);if(sha!==report.source.sha256)fail('the cartridge is not the report\'s source');
  const layout=contract.romLayout(rom),synthetic=privacy==='synthetic';
  if(synthetic&&!contract.isSynthetic(rom,layout))fail('only a cartridge carrying the synthetic-fixture marker can be packaged as synthetic');
  const embedded=[],referenced=[];
  const payload=(id,kind,bytes,why)=>{const entry={id,kind,sha256:id.replace(/^sha256:/,''),byteLength:bytes.length};
    if(!synthetic){referenced.push({id,reason:'derived from a private cartridge: not embedded'});return {...entry,availability:'referenced',reason:'derived from a private cartridge'};}
    if(bytes.length>LARGE&&!embedLarge){referenced.push({id,reason:why||'larger than '+LARGE+' bytes: regenerable by replaying the recorded inputs'});return {...entry,availability:'referenced',reason:why||'large: regenerable by replaying the recorded inputs'};}
    embedded.push(id);return {...entry,availability:'embedded',base64:b64(bytes)};};
  const meta=store.exportMetadata({privacy:synthetic?'synthetic':'private'});
  const payloads=meta.payloads.map(p=>payload(p.id,p.kind,store.getBytes(p.id)));
  const cartridge={sha256:sha,byteLength:rom.length,mapper:layout.mapper,mirroring:layout.mirroring,prgBytes:layout.prgBytes,chrBytes:layout.chrBytes,
    availability:synthetic?'embedded':'reference',...(synthetic?{base64:b64(rom)}:{note:'not included: supply the cartridge locally; it must have this SHA-256'}),...(generation?{generation}:{})};
  if(synthetic)embedded.push('cartridge');else referenced.push({id:'cartridge',reason:'a private cartridge is never included; verification uses a locally supplied file with this SHA-256'});
  // verification jobs: this engine's captures, normalized; small channels embedded, large ones by SHA-256
  // a private package keeps no cartridge-derived values: a mutation becomes its offset and an XOR mask (the original byte
  // comes from the locally supplied cartridge), predictions keep positions, claims keep cell IDs (tiles and attribute
  // bits are re-derived from the definition and the local cartridge)
  const privateJob=j=>synthetic?j:{...j,mutations:(j.mutations||[]).map(m=>({offset:m.offset,xor:m.value^m.expected}))};
  const privateExpectation=e=>{if(synthetic)return e;const out={...e};if(out.predict)out.predict=out.predict.map(p=>({label:p.label,index:p.index}));
    if(out.claims)out.claims={...out.claims,cells:out.claims.cells.map(c=>({cell:c.cell,status:c.status,ids:c.ids,index:c.index})),attributes:out.claims.attributes.map(a=>({index:a.index,knownMask:a.knownMask}))};return out;};
  const jobs=(report.verification?.jobs||[]).map(j=>({job:privateJob(plain(j.job)),expectation:privateExpectation(plain(j.expectation)),forge:{...plain({...j.forge,captures:undefined}),captures:j.forge.captures.map(c=>{
    const channels={};for(const [ch,bytes] of Object.entries(c.normalized.channels)){const id='sha256:'+c.digests[ch];const big=ch==='pixels'||ch==='chr'||ch==='reads';
      channels[ch]=synthetic&&(!big||j.job.id==='training-baseline'||j.job.id==='holdout-baseline'||embedLarge)?{sha256:c.digests[ch],availability:'embedded',base64:b64(bytes)}:{sha256:c.digests[ch],availability:'referenced',reason:synthetic?'regenerable by running the job':'derived from a private cartridge'};
      if(channels[ch].availability==='embedded')embedded.push(id);else referenced.push({id,reason:channels[ch].reason});}
    return {label:c.label,nmi:c.nmi,frame:c.frame,latches:c.latches,digests:c.digests,channels,...(synthetic&&c.normalized.written?{written:b64(c.normalized.written)}:{})};})}}));
  const redact=m=>synthetic?m:{offset:m.offset,region:m.region};
  const body={format:FORMAT,version:VERSION,
    manifest:{engine:{documentSha256:report.identity.documentSha256,name:'NES Forge emulator (same build as the editor), experiment sandbox'},privacy:synthetic?'synthetic':'private',
      contents:['cartridge','inputs','plans','receipts','payloads','edges','hypotheses','interventions','controls','candidate','revisions','result','reconstruction','verification','lifecycle','limitations'],
      completeness:{kind:referenced.length?'partial':'complete',embedded:embedded.length,referenced:referenced.length,referencedItems:referenced.slice(0,200),
        meaning:'embedded items carry their bytes and are checked against their SHA-256; referenced items carry only their SHA-256 and the reason they are absent'}},
    cartridge,inputs:plain(report.inputs),
    plans:report.plans.map(p=>({id:p.id,planHash:p.planHash,plan:p.plan?plain(p.plan):null,receipts:p.receipts.map(r=>r.receiptHash)})),
    receipts:meta.receipts,payloads,edges:meta.edges,
    hypotheses:plain(report.hypotheses),interventions:plain(report.stages.test?{interventions:report.stages.test.interventions.map(i=>({...i,mutation:redact(i.mutation)})),controls:report.stages.test.controls,confirm:report.stages.test.confirm||null,attributeArrays:report.stages.test.attributeArrays||[]}:null),
    observe:plain(report.stages.observe||null),propose:plain(report.stages.propose?{distinctTuples:report.stages.propose.distinctTuples,searched:report.stages.propose.searched,ranked:report.stages.propose.ranked}:null),
    candidate:report.definition?plain(report.definition):null,revisions:report.definition?[{revision:report.definition.revision?.number??1,definitionHash:report.definition.definitionHash,previous:report.definition.revision?.previous??null}]:[],
    result:plain(report.result),
    reconstruction:report.holdout?{label:report.holdout.label,definitionHash:report.holdout.definitionHash,inputHash:report.holdout.inputHash,counts:report.holdout.reconstruction.counts,cells:report.holdout.reconstruction.cells,
      attributes:synthetic?report.holdout.reconstruction.attributes:report.holdout.reconstruction.attributes.map(a=>({index:a.index,knownMask:a.knownMask})),claims:privateExpectation({claims:report.holdout.claims}).claims,selfCheck:report.holdout.selfCheck}:null,
    verification:{mirroring:report.verification?.mirroring||layout.mirroring,colourClass:report.verification?.colourClass||null,jobs,sameEngineChecks:plain(report.verification?.sameEngineChecks||[]),independent:plain(independent),
      note:'Jobs are engine-neutral: from power-on, the joypad latches the listed masks at successive $4016 strobes; checkpoints are NMI-handler entries. Run them in an independent emulator with tools/agent-lab/independent/verify-package.cjs.'},
    lifecycle:plain(assessment),
    limitations:['NROM only, unscrolled screens, 2x2 metatiles','same-engine results (repeatability, interventions) show determinism and consistency, not correctness','independent verification is a separate receipt from another emulator; NES Forge re-compares its raw captures','record meanings beyond four tiles and a palette are not inferred']};
  return {...body,packageHash:contract.hashOf(body)};
}

// A stored plan is the validated (normalized) form; replaying it needs the input form the contract accepts.
function planInput(n){
  const trials=n.trials.map(t=>({id:t.id,kind:t.kind,mutations:t.mutations.map(m=>({offset:m.offset,expected:m.expected,value:m.value})),...(t.fromCheckpoint?{fromCheckpoint:t.fromCheckpoint}:{}),...(t.saveCheckpoints?{saveCheckpoints:true}:{}),trace:!!t.trace&&!!n.observe.trace}));
  return {format:n.format,version:n.version,id:n.id,privacy:n.privacy,source:n.source,...(n.engine?{engine:n.engine}:{}),input:n.input,captures:n.captures,...(n.checkpoints?.length?{checkpoints:n.checkpoints}:{}),...(n.target?{target:n.target}:{}),
    observe:{channels:n.observe.channels,payloads:n.observe.payloads,...(n.observe.trace?{trace:n.observe.trace}:{}),watchRam:n.observe.watchRam,frameDigests:n.observe.frameDigests},budgets:n.budgets,...(n.protect?.length?{protect:n.protect}:{}),trials,
    ...(n.description?{description:n.description}:{}),...(n.seed!==undefined?{seed:n.seed}:{})};
}
// Checks everything that can be checked without running anything.
function validate(pkg){
  const problems=[],add=m=>problems.push(m);
  if(!pkg||pkg.format!==FORMAT||pkg.version!==VERSION)return {ok:false,problems:['not a '+FORMAT+' v'+VERSION]};
  const {packageHash,...body}=pkg;try{if(contract.hashOf(body)!==packageHash)add('the package does not match its hash (edited or damaged)');}catch(e){add('not canonical JSON: '+e.message);}
  for(const r of pkg.receipts||[]){const v=contract.verifyReceipt(r);if(!v.ok&&!(pkg.manifest?.privacy==='private'&&v.problems.every(p=>/hash/.test(p))))add('receipt '+String(r.receiptHash).slice(0,12)+': '+v.problems.join('; '));}
  if(pkg.candidate){const v=contract.verifyCandidate(pkg.candidate);if(!v.ok)add('candidate: '+v.problems.join('; '));}
  for(const p of pkg.payloads||[])if(p.availability==='embedded'&&contract.sha256(unb64(p.base64))!==p.sha256)add('payload '+p.id+' does not match its bytes');
  for(const j of pkg.verification?.jobs||[])for(const c of j.forge.captures)for(const [ch,x] of Object.entries(c.channels))if(x.availability==='embedded'&&contract.sha256(unb64(x.base64))!==x.sha256)add('job '+j.job.id+' '+c.label+' '+ch+' does not match its bytes');
  if(pkg.cartridge?.availability==='embedded'){const b=unb64(pkg.cartridge.base64);if(contract.sha256(b)!==pkg.cartridge.sha256)add('the embedded cartridge does not match its SHA-256');}
  if(pkg.manifest?.privacy!=='synthetic'&&(pkg.cartridge?.base64||(pkg.payloads||[]).some(p=>p.base64)))add('a private package embeds cartridge-derived bytes');
  for(const x of pkg.verification?.independent||[]){const v=V.verifyIndependent(x);if(!v.ok)add('independent receipt: '+v.problems.join('; '));}
  return {ok:!problems.length,problems,completeness:pkg.manifest?.completeness||null};
}
// The cartridge bytes: embedded (checked), or a locally supplied file that must have the recorded SHA-256.
function cartridgeBytes(pkg,local=null){
  if(pkg.cartridge.availability==='embedded'){const b=unb64(pkg.cartridge.base64);if(contract.sha256(b)!==pkg.cartridge.sha256)fail('the embedded cartridge does not match its SHA-256');return b;}
  if(!local)fail('this package references its cartridge (SHA-256 '+pkg.cartridge.sha256+'); supply that cartridge locally');
  if(contract.sha256(local)!==pkg.cartridge.sha256)fail('the supplied cartridge has SHA-256 '+contract.sha256(local)+', not the recorded '+pkg.cartridge.sha256);
  return local;
}
function capturesOf(pkg,jobId){const j=(pkg.verification?.jobs||[]).find(x=>x.job.id===jobId);if(!j)return null;
  return j.forge.captures.map(c=>({label:c.label,nmi:c.nmi,frame:c.frame,latches:c.latches,digests:c.digests,channels:Object.fromEntries(Object.entries(c.channels).filter(([,x])=>x.availability==='embedded').map(([ch,x])=>[ch,unb64(x.base64)])),written:c.written?unb64(c.written):null}));}
// A short human-readable summary (the inspector CLI prints it).
function inspect(pkg){
  const v=validate(pkg),c=pkg.candidate;
  return {valid:v.ok,problems:v.problems,packageHash:pkg.packageHash,privacy:pkg.manifest?.privacy,completeness:pkg.manifest?.completeness?{kind:pkg.manifest.completeness.kind,embedded:pkg.manifest.completeness.embedded,referenced:pkg.manifest.completeness.referenced}:null,
    cartridge:{sha256:pkg.cartridge.sha256,availability:pkg.cartridge.availability,mapper:pkg.cartridge.mapper,generation:pkg.cartridge.generation||null},
    engine:pkg.manifest?.engine,result:pkg.result,plans:pkg.plans.length,receipts:pkg.receipts.length,payloads:{embedded:pkg.payloads.filter(p=>p.availability==='embedded').length,referenced:pkg.payloads.filter(p=>p.availability!=='embedded').length},
    hypotheses:{ranked:pkg.hypotheses?.ranked?.length||0,supported:pkg.hypotheses?.supported||[],falsified:(pkg.hypotheses?.falsified||[]).map(f=>f.id+' ('+f.classification+')'),confounded:(pkg.hypotheses?.confounded||[]).map(f=>f.id)},
    controls:(pkg.interventions?.controls||[]).map(x=>x.trial+': '+x.outcome+(x.passed?'':' (FAILED)')),
    candidate:c?{definitionHash:c.definitionHash,revision:c.revision?.number??1,layout:c.table.layout+'/'+c.table.order,physicalBase:c.table.physicalBase,numbering:c.table.numbering||'operand-evidence',records:c.extent.highest+1,decoder:c.decoder||null}:null,
    reconstruction:pkg.reconstruction?pkg.reconstruction.counts:null,jobs:(pkg.verification?.jobs||[]).map(j=>j.job.id+' ('+j.expectation.kind+', '+j.forge.captures.length+' checkpoints)'),
    independent:(pkg.verification?.independent||[]).map(x=>({engine:x.engine?.name+' '+x.engine?.version,verdict:x.verdict?.result})),lifecycle:pkg.lifecycle?{state:pkg.lifecycle.state,side:pkg.lifecycle.side}:null};
}
return Object.freeze({version:VERSION,FORMAT,build,validate,cartridgeBytes,capturesOf,inspect,planInput});
});
