/* AL-EXP-01 (BL01): the experiment contract. Plans, receipts and candidate definitions are declarative data: nothing in
 * them is executed, and unknown fields, kinds or commands are rejected rather than ignored. Identities are full SHA-256
 * of canonical JSON (object keys sorted, integers only) or of exact bytes. Physical file offsets are zero-based and
 * ranges are end-exclusive. A same-engine repeat is repeatability, never independent verification. */
(function(root,factory){const node=typeof module!=='undefined'&&module.exports;const api=factory(node?require('node:crypto'):null,root,node?require('./ines-header.js'):root.InesHeader);if(node)module.exports=api;else root.ForgeExperimentContract=api;})(typeof globalThis!=='undefined'?globalThis:this,function(nodeCrypto,root,InesHeader){
'use strict';
const VERSION=1;
const FORMATS=Object.freeze({plan:'NESForgeExperimentPlan',receipt:'NESForgeExperimentReceipt',candidate:'NESForgeCandidateDefinition',evaluation:'NESForgeExperimentEvaluation',evidence:'NESForgeExperimentEvidence'});
// Trial outcomes. None of them alone proves native semantics.
const OUTCOMES=Object.freeze(['no_effect_observed','effect_observed','target_not_reached','crash','timeout','cancelled','unsupported','inconclusive','invalid']);
// Hypothesis states. "independently_verified" needs an oracle that is not this engine; "reviewed" needs a person.
const HYPOTHESES=Object.freeze(['proposed','supported','falsified','inconclusive','independently_verified','reviewed']);
const VERIFICATION=Object.freeze({none:'none',repeatability:'same-engine repeatability',independent:'independent oracle'});
const LIMITS=Object.freeze({steps:256,stepFrames:600,totalFrames:1800,captures:32,checkpoints:4,trials:128,mutations:16,protect:32,watchRam:32,events:100000,wallMs:120000,evidenceBytes:256*1024*1024,depth:64,id:64,label:80,description:400});
const BUTTONS=Object.freeze(['A','B','Select','Start','Up','Down','Left','Right']); // EmulatorTimeline script names
const CHANNELS=Object.freeze(['cpu','ram','nametables','palette','oam','chr','pixels']);
const TRIAL_KINDS=Object.freeze(['baseline','variant','control-same-value','control-unrelated']);
const PRIVACY=Object.freeze(['synthetic','private']);
// Slice 1 runs only on Forge's own synthetic fixtures: the last 256 bytes of PRG start with this marker.
const SYNTHETIC_MARKER='NESFORGE-SYNTHETIC/1 ';

function fail(path,message){const error=Error('Experiment contract: '+(path?path+' ':'')+message);error.code='EXPERIMENT_CONTRACT';error.path=path||'';throw error;}
const isObject=v=>!!v&&typeof v==='object'&&!Array.isArray(v)&&!(v instanceof Uint8Array);

// ---------- canonical JSON and hashing ----------
function canonical(value,depth=0,path='$'){
  if(depth>LIMITS.depth)fail(path,'nests deeper than '+LIMITS.depth+' levels');
  if(value===null||typeof value==='boolean')return JSON.stringify(value);
  if(typeof value==='string')return JSON.stringify(value);
  if(typeof value==='number'){if(!Number.isSafeInteger(value))fail(path,'is not a safe integer (canonical JSON holds integers only)');return JSON.stringify(value);}
  if(Array.isArray(value))return '['+value.map((v,i)=>canonical(v,depth+1,path+'['+i+']')).join(',')+']';
  if(isObject(value)&&Object.getPrototypeOf(value)===Object.prototype||isObject(value)&&Object.getPrototypeOf(value)===null){
    return '{'+Object.keys(value).sort().map(k=>{const v=value[k];if(v===undefined)fail(path+'.'+k,'is undefined');return JSON.stringify(k)+':'+canonical(v,depth+1,path+'.'+k);}).join(',')+'}';
  }
  fail(path,'is not plain JSON data (bytes must be hex or base64 first)');
}
const encoder=typeof TextEncoder!=='undefined'?new TextEncoder():null;
function utf8(text){if(encoder)return encoder.encode(text);return new Uint8Array(Buffer.from(text,'utf8'));}
function sha256(input){
  const bytes=typeof input==='string'?utf8(input):input instanceof Uint8Array?input:fail('sha256','needs a string or bytes');
  if(nodeCrypto)return nodeCrypto.createHash('sha256').update(bytes).digest('hex');
  const impl=root&&root.FamiTone2Native&&root.FamiTone2Native.sha256;if(!impl)fail('sha256','no SHA-256 implementation is available');
  return impl(bytes);
}
const hashOf=value=>sha256(canonical(value));
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
function fromHex(text,path){if(typeof text!=='string'||text.length%2||/[^0-9a-f]/.test(text))fail(path,'is not lower-case hex');const out=new Uint8Array(text.length/2);for(let i=0;i<out.length;i++)out[i]=parseInt(text.slice(2*i,2*i+2),16);return out;}

// ---------- field checks ----------
function keys(value,path,required,optional=[]){
  if(!isObject(value))fail(path,'must be an object');
  for(const k of Object.keys(value))if(!required.includes(k)&&!optional.includes(k))fail(path+'.'+k,'is not a recognised field');
  for(const k of required)if(!(k in value))fail(path+'.'+k,'is required');
}
function int(value,path,min,max){if(!Number.isSafeInteger(value)||value<min||value>max)fail(path,'must be an integer from '+min+' through '+max);return value;}
function bool(value,path){if(typeof value!=='boolean')fail(path,'must be true or false');return value;}
function text(value,path,max){if(typeof value!=='string'||!value.length||value.length>max||/[\u0000-\u001f\u007f]/.test(value))fail(path,'must be 1–'+max+' printable characters');return value;}
function ident(value,path){if(typeof value!=='string'||!/^[a-z0-9][a-z0-9._-]{0,63}$/.test(value))fail(path,'must be a lower-case identifier (a–z, 0–9, . _ -; at most 64)');return value;}
function hex64(value,path){if(typeof value!=='string'||!/^[0-9a-f]{64}$/.test(value))fail(path,'must be a full lower-case SHA-256');return value;}
function oneOf(value,path,list){if(!list.includes(value))fail(path,'must be one of '+list.join(', '));return value;}
function list(value,path,min,max){if(!Array.isArray(value)||value.length<min||value.length>max)fail(path,'must be a list of '+min+'–'+max+' items');return value;}

// ---------- cartridge layout ----------
// iNES 1.0, and (AL-REC-01) archaic iNES headers read by the shared rule (src/re/ines-header.js: bytes 7-15 ignored,
// the mapper from byte 6). Nothing is repaired: the cartridge's bytes stay as they are. NES 2.0 is not supported here.
function romLayout(bytes){
  if(!(bytes instanceof Uint8Array))fail('rom','must be bytes');
  if(bytes.length<16||bytes[0]!==0x4e||bytes[1]!==0x45||bytes[2]!==0x53||bytes[3]!==0x1a)fail('rom','is not an iNES file');
  if((bytes[7]&0x0c)===0x08)fail('rom','is NES 2.0, which this slice does not support');
  const reading=InesHeader?InesHeader.inspect(bytes):null,archaic=reading?reading.format==='archaic iNES':bytes.subarray(11,16).some(b=>b!==0);
  if(archaic&&!reading)fail('rom','has a non-zero iNES 1.0 header tail and the shared header reader is not available');
  const trainerBytes=bytes[6]&4?512:0,prgBytes=bytes[4]*16384,chrBytes=bytes[5]*8192,mapper=archaic?reading.mapper:(bytes[6]>>4)|(bytes[7]&0xf0);
  if(!prgBytes)fail('rom','declares no PRG');
  const prgStart=16+trainerBytes,chrStart=prgStart+prgBytes,end=chrStart+chrBytes;
  if(bytes.length!==end)fail('rom','is '+bytes.length+' bytes; its header declares '+end+' (not repaired)');
  return Object.freeze({byteLength:bytes.length,headerBytes:16,trainerStart:16,trainerBytes,prgStart,prgBytes,chrStart,chrBytes,mapper,header:archaic?'archaic iNES':'iNES 1.0',
    mirroring:bytes[6]&8?'four-screen':bytes[6]&1?'vertical':'horizontal',vectors:Object.freeze({start:chrStart-6,end:chrStart})});
}
function isSynthetic(bytes,layout=romLayout(bytes)){
  const at=layout.prgStart+layout.prgBytes-256,marker=SYNTHETIC_MARKER;
  for(let i=0;i<marker.length;i++)if(bytes[at+i]!==marker.charCodeAt(i))return false;return true;
}
// AL-REC-01: who may run experiments on which cartridge. Forge's synthetic fixtures (marker in PRG, privacy
// "synthetic"), as before; and a cartridge the user supplied locally, only with privacy "private" (its bytes and
// captures never leave this browser: exported evidence carries hashes, offsets and outcomes), a mapper whose PRG banking
// the bus observer translates to file offsets, and the user's explicit approval for this cartridge (by SHA-256). The
// original bytes are never written: every trial runs a temporary variant.
const SUPPORTED_MAPPERS=Object.freeze([0,1,2,3,4,7]);
function approval(bytes,{by='user',at=Date.now()}={}){return deepFreeze({kind:'local-cartridge',sha256:sha256(bytes),by:String(by).slice(0,80),at});}
function authorize(bytes,layout=romLayout(bytes),{privacy,approval:granted=null}={}){
  if(isSynthetic(bytes,layout)){if(privacy!=='synthetic')fail('plan.privacy','a synthetic fixture\'s plan must declare privacy "synthetic"');return {kind:'synthetic fixture'};}
  if(privacy!=='private')fail('plan.privacy','an experiment on a locally supplied cartridge must declare privacy "private" (its data never leaves this browser)');
  if(!SUPPORTED_MAPPERS.includes(layout.mapper))fail('rom','uses mapper '+layout.mapper+'; experiments support mappers '+SUPPORTED_MAPPERS.join(', ')+' (their PRG banking is translated to file offsets)');
  if(!granted||granted.kind!=='local-cartridge'||granted.sha256!==sha256(bytes))fail('approval','experiments on a locally supplied cartridge need your explicit approval for this cartridge (SHA-256 '+sha256(bytes).slice(0,12)+'…)');
  return {kind:'locally supplied cartridge',mapper:layout.mapper,header:layout.header,approvedBy:granted.by,approvedAt:granted.at};
}
function defaultProtected(layout){
  const out=[{start:0,end:16,reason:'iNES header'}];
  if(layout.trainerBytes)out.push({start:16,end:16+layout.trainerBytes,reason:'trainer'});
  out.push({start:layout.vectors.start,end:layout.vectors.end,reason:'CPU vectors (NMI, reset, IRQ)'});
  return out;
}

// ---------- plans ----------
function validateSteps(steps,path){
  list(steps,path,1,LIMITS.steps);let total=0;
  const out=steps.map((s,i)=>{const p=path+'['+i+']';keys(s,p,['frames','buttons']);int(s.frames,p+'.frames',1,LIMITS.stepFrames);list(s.buttons,p+'.buttons',0,8);
    const seen=new Set();for(const [j,b] of s.buttons.entries()){oneOf(b,p+'.buttons['+j+']',BUTTONS);if(seen.has(b))fail(p+'.buttons','repeats '+b);seen.add(b);}
    if(seen.has('Up')&&seen.has('Down')||seen.has('Left')&&seen.has('Right'))fail(p+'.buttons','holds opposite directions');
    total+=s.frames;return {frames:s.frames,buttons:BUTTONS.filter(b=>seen.has(b))};});
  if(total>LIMITS.totalFrames)fail(path,'runs '+total+' frames; at most '+LIMITS.totalFrames);
  return {steps:out,total};
}
function validatePlan(plan){
  keys(plan,'plan',['format','version','id','source','input','captures','trials','observe','budgets','privacy'],['engine','protect','checkpoints','target','description','seed']);
  if(plan.format!==FORMATS.plan)fail('plan.format','must be '+FORMATS.plan);if(plan.version!==VERSION)fail('plan.version','must be '+VERSION);
  ident(plan.id,'plan.id');oneOf(plan.privacy,'plan.privacy',PRIVACY);
  if(plan.description!==undefined)text(plan.description,'plan.description',LIMITS.description);
  if(plan.seed!==undefined)int(plan.seed,'plan.seed',0,0x7fffffff);
  keys(plan.source,'plan.source',['sha256','byteLength']);hex64(plan.source.sha256,'plan.source.sha256');int(plan.source.byteLength,'plan.source.byteLength',16,8*1024*1024);
  if(plan.engine!==undefined){keys(plan.engine,'plan.engine',['documentSha256']);hex64(plan.engine.documentSha256,'plan.engine.documentSha256');}
  keys(plan.input,'plan.input',['steps']);const input=validateSteps(plan.input.steps,'plan.input.steps');
  const labels=new Set();
  const frameLabel=(row,p,kind)=>{keys(row,p,['label','frame']);ident(row.label,p+'.label');if(labels.has(row.label))fail(p+'.label','repeats '+row.label);labels.add(row.label);int(row.frame,p+'.frame',1,input.total);return {label:row.label,frame:row.frame};};
  const captures=list(plan.captures,'plan.captures',1,LIMITS.captures).map((c,i)=>frameLabel(c,'plan.captures['+i+']'));
  for(let i=1;i<captures.length;i++)if(captures[i].frame<=captures[i-1].frame)fail('plan.captures','must be in increasing frame order');
  const checkpoints=plan.checkpoints===undefined?[]:list(plan.checkpoints,'plan.checkpoints',0,LIMITS.checkpoints).map((c,i)=>frameLabel(c,'plan.checkpoints['+i+']'));
  if(plan.target!==undefined){keys(plan.target,'plan.target',['backgroundEnabled']);bool(plan.target.backgroundEnabled,'plan.target.backgroundEnabled');}
  keys(plan.observe,'plan.observe',['channels'],['payloads','trace','watchRam','frameDigests']);
  const channels=list(plan.observe.channels,'plan.observe.channels',1,CHANNELS.length).map((c,i)=>oneOf(c,'plan.observe.channels['+i+']',CHANNELS));
  if(new Set(channels).size!==channels.length)fail('plan.observe.channels','repeats a channel');
  const payloads=plan.observe.payloads===undefined?[]:list(plan.observe.payloads,'plan.observe.payloads',0,CHANNELS.length).map((c,i)=>{oneOf(c,'plan.observe.payloads['+i+']',CHANNELS);if(!channels.includes(c))fail('plan.observe.payloads['+i+']','is not an observed channel');return c;});
  let trace=null;if(plan.observe.trace!==undefined){keys(plan.observe.trace,'plan.observe.trace',['prgReads','ppuWrites','maxEvents']);trace={prgReads:bool(plan.observe.trace.prgReads,'plan.observe.trace.prgReads'),ppuWrites:bool(plan.observe.trace.ppuWrites,'plan.observe.trace.ppuWrites'),maxEvents:int(plan.observe.trace.maxEvents,'plan.observe.trace.maxEvents',1,LIMITS.events)};}
  const watchRam=plan.observe.watchRam===undefined?[]:list(plan.observe.watchRam,'plan.observe.watchRam',0,LIMITS.watchRam).map((a,i)=>int(a,'plan.observe.watchRam['+i+']',0,0x7ff));
  const frameDigests=plan.observe.frameDigests===undefined?false:bool(plan.observe.frameDigests,'plan.observe.frameDigests');
  keys(plan.budgets,'plan.budgets',['framesPerTrial','wallMsPerTrial','maxTrials','eventsPerTrial']);
  const budgets={framesPerTrial:int(plan.budgets.framesPerTrial,'plan.budgets.framesPerTrial',1,LIMITS.totalFrames),wallMsPerTrial:int(plan.budgets.wallMsPerTrial,'plan.budgets.wallMsPerTrial',10,LIMITS.wallMs),maxTrials:int(plan.budgets.maxTrials,'plan.budgets.maxTrials',1,LIMITS.trials),eventsPerTrial:int(plan.budgets.eventsPerTrial,'plan.budgets.eventsPerTrial',0,LIMITS.events)};
  if(input.total>budgets.framesPerTrial)fail('plan.budgets.framesPerTrial','is below the '+input.total+' frames the input runs');
  if(trace&&trace.maxEvents>budgets.eventsPerTrial)fail('plan.observe.trace.maxEvents','exceeds plan.budgets.eventsPerTrial');
  const protect=plan.protect===undefined?[]:list(plan.protect,'plan.protect',0,LIMITS.protect).map((r,i)=>{const p='plan.protect['+i+']';keys(r,p,['start','end','reason']);int(r.start,p+'.start',0,8*1024*1024);int(r.end,p+'.end',r.start+1,8*1024*1024);text(r.reason,p+'.reason',LIMITS.label);return {start:r.start,end:r.end,reason:r.reason};});
  const ids=new Set();
  const trials=list(plan.trials,'plan.trials',1,Math.min(LIMITS.trials,budgets.maxTrials)).map((t,i)=>{const p='plan.trials['+i+']';
    keys(t,p,['id','kind','mutations'],['fromCheckpoint','saveCheckpoints','trace']);ident(t.id,p+'.id');if(ids.has(t.id))fail(p+'.id','repeats '+t.id);ids.add(t.id);oneOf(t.kind,p+'.kind',TRIAL_KINDS);
    const mutations=list(t.mutations,p+'.mutations',0,LIMITS.mutations).map((m,j)=>{const q=p+'.mutations['+j+']';keys(m,q,['offset','expected','value']);return {offset:int(m.offset,q+'.offset',0,8*1024*1024),expected:int(m.expected,q+'.expected',0,255),value:int(m.value,q+'.value',0,255)};});
    if(t.kind==='baseline'&&mutations.length)fail(p+'.mutations','must be empty for a baseline');
    if(t.kind!=='baseline'&&!mutations.length)fail(p+'.mutations','needs at least one mutation');
    if(t.kind==='control-same-value'&&mutations.some(m=>m.value!==m.expected))fail(p+'.mutations','must keep every value for a same-value control');
    if((t.kind==='variant'||t.kind==='control-unrelated')&&mutations.some(m=>m.value===m.expected))fail(p+'.mutations','changes nothing; use a same-value control');
    let fromCheckpoint=null;if(t.fromCheckpoint!==undefined){ident(t.fromCheckpoint,p+'.fromCheckpoint');if(!checkpoints.some(c=>c.label===t.fromCheckpoint))fail(p+'.fromCheckpoint','names no plan checkpoint');if(captures.some(c=>c.frame<=checkpoints.find(k=>k.label===t.fromCheckpoint).frame))fail(p+'.fromCheckpoint','is not before every capture');fromCheckpoint=t.fromCheckpoint;}
    const saveCheckpoints=t.saveCheckpoints===undefined?false:bool(t.saveCheckpoints,p+'.saveCheckpoints');if(saveCheckpoints&&t.kind!=='baseline')fail(p+'.saveCheckpoints','only a baseline saves checkpoints');if(saveCheckpoints&&fromCheckpoint)fail(p+'.saveCheckpoints','cannot be set on a restored run');
    const traceOn=t.trace===undefined?!!trace:bool(t.trace,p+'.trace');if(traceOn&&!trace)fail(p+'.trace','needs plan.observe.trace');
    return {id:t.id,kind:t.kind,mutations,fromCheckpoint,saveCheckpoints,trace:traceOn};});
  if(!trials.some(t=>t.kind==='baseline'&&!t.fromCheckpoint))fail('plan.trials','needs a cold baseline');
  const normalized={format:FORMATS.plan,version:VERSION,id:plan.id,privacy:plan.privacy,source:{sha256:plan.source.sha256,byteLength:plan.source.byteLength},
    ...(plan.engine?{engine:{documentSha256:plan.engine.documentSha256}}:{}),input:{steps:input.steps},captures,checkpoints,target:plan.target?{backgroundEnabled:plan.target.backgroundEnabled}:null,
    observe:{channels,payloads,trace,watchRam,frameDigests},budgets,protect,trials,...(plan.description?{description:plan.description}:{}),...(plan.seed!==undefined?{seed:plan.seed}:{})};
  return deepFreeze({...normalized,totalFrames:input.total,planHash:hashOf(normalized)});
}

// ---------- mutations and variants ----------
function validateMutations(bytes,layout,mutations,protect=[]){
  const ranges=[...defaultProtected(layout),...protect],seen=new Set();
  return mutations.map((m,i)=>{const p='mutations['+i+']';
    if(m.offset<layout.prgStart||m.offset>=layout.chrStart+layout.chrBytes)fail(p+'.offset','lies outside PRG and CHR');
    const hit=ranges.find(r=>m.offset>=r.start&&m.offset<r.end);if(hit)fail(p+'.offset','is protected ('+hit.reason+')');
    if(seen.has(m.offset))fail(p+'.offset','is mutated twice');seen.add(m.offset);
    if(bytes[m.offset]!==m.expected)fail(p+'.expected','is '+m.expected+' but the cartridge holds '+bytes[m.offset]+' there');
    return {offset:m.offset,expected:m.expected,value:m.value,region:m.offset<layout.chrStart?'prg':'chr'};});
}
// A variant is always a new array; the base is never written.
function buildVariant(base,baseSha256,mutations){
  const bytes=new Uint8Array(base);for(const m of mutations)bytes[m.offset]=m.value;
  return {bytes,sha256:sha256(bytes),variantId:hashOf({base:baseSha256,mutations:mutations.map(m=>({offset:m.offset,expected:m.expected,value:m.value}))})};
}

// ---------- receipts ----------
const RECEIPT_FIELDS=['format','version','planHash','planId','trialId','kind','engine','base','variant','inputHash','checkpoint','framesRun','stopReason','targetReached','outcome','channels','captures','firstDivergence','trace','limits','limitations','verification','evidence'];
function sealReceipt(receipt){
  const body={};for(const k of RECEIPT_FIELDS){if(!(k in receipt))fail('receipt.'+k,'is required');body[k]=receipt[k];}
  for(const k of Object.keys(receipt))if(!RECEIPT_FIELDS.includes(k)&&k!=='timing'&&k!=='receiptHash')fail('receipt.'+k,'is not a recognised field');
  checkReceiptBody(body);
  return deepFreeze({...body,receiptHash:hashOf(body),...(receipt.timing?{timing:receipt.timing}:{})});
}
function checkReceiptBody(r){
  if(r.format!==FORMATS.receipt||r.version!==VERSION)fail('receipt','is not a '+FORMATS.receipt+' v'+VERSION);
  hex64(r.planHash,'receipt.planHash');ident(r.planId,'receipt.planId');ident(r.trialId,'receipt.trialId');oneOf(r.kind,'receipt.kind',TRIAL_KINDS);oneOf(r.outcome,'receipt.outcome',OUTCOMES);
  keys(r.base,'receipt.base',['sha256','byteLength']);hex64(r.base.sha256,'receipt.base.sha256');
  if(r.variant!==null){keys(r.variant,'receipt.variant',['sha256','variantId','mutations']);hex64(r.variant.sha256,'receipt.variant.sha256');hex64(r.variant.variantId,'receipt.variant.variantId');}
  keys(r.verification,'receipt.verification',['kind','independent','note']);oneOf(r.verification.kind,'receipt.verification.kind',Object.values(VERIFICATION));
  if(r.verification.independent!==false)fail('receipt.verification.independent','must be false: the experiment engine is never its own independent oracle');
}
function verifyReceipt(receipt){
  const problems=[];
  try{if(!isObject(receipt))fail('receipt','must be an object');const body={};for(const k of RECEIPT_FIELDS)body[k]=receipt[k];checkReceiptBody(body);
    for(const k of Object.keys(receipt))if(!RECEIPT_FIELDS.includes(k)&&k!=='timing'&&k!=='receiptHash')problems.push('unrecognised field '+k);
    if(hashOf(body)!==receipt.receiptHash)problems.push('the receipt does not match its hash');}
  catch(error){problems.push(error.message);}
  return {ok:!problems.length,problems};
}

// ---------- candidate definitions ----------
// A candidate stays a candidate: nothing here can mark it verified for the library. Version 1 (AL-EXP-01) stays
// readable; version 2 (AL-EXP-02) adds the revision chain, the decoder it is written for, its assumptions, what it does
// not support, and how record 0 was established (record numbering).
const CANDIDATE_FIELDS=['format','version','kind','status','hypothesis','source','table','attributes','extent','aliases','evidence','verification','limitations'];
const CANDIDATE_FIELDS_V2=[...CANDIDATE_FIELDS,'revision','decoder','assumptions','unsupported'];
const NUMBERING=Object.freeze(['operand-evidence','relative']);
const candidateFields=d=>d&&d.version===2?CANDIDATE_FIELDS_V2:CANDIDATE_FIELDS;
function sealCandidate(definition){
  const fields=candidateFields(definition),body={};for(const k of fields){if(!(k in definition))fail('candidate.'+k,'is required');body[k]=definition[k];}
  for(const k of Object.keys(definition))if(!fields.includes(k)&&k!=='definitionHash')fail('candidate.'+k,'is not a recognised field');
  checkCandidateBody(body);return deepFreeze({...body,definitionHash:hashOf(body)});
}
function checkCandidateBody(c){
  if(c.format!==FORMATS.candidate||(c.version!==1&&c.version!==2))fail('candidate','is not a '+FORMATS.candidate+' v1 or v2');
  if(c.kind!=='metatile-table-2x2')fail('candidate.kind','must be metatile-table-2x2');
  if(c.status!=='candidate')fail('candidate.status','must be "candidate"; experimental findings are never verified library resources');
  oneOf(c.hypothesis,'candidate.hypothesis',HYPOTHESES);if(c.hypothesis==='reviewed')fail('candidate.hypothesis','"reviewed" needs a person; an experiment cannot set it');
  if(c.hypothesis==='independently_verified')fail('candidate.hypothesis','independent verification is an evaluation record about a definition, never part of the definition');
  keys(c.source,'candidate.source',['sha256','byteLength']);hex64(c.source.sha256,'candidate.source.sha256');
  keys(c.table,'candidate.table',['layout','order','physicalBase','cpuBase','recordStep','fieldStep','grid','baseEvidence'],c.version===2?['numbering']:[]);keys(c.table.grid,'candidate.table.grid',['x','y']);int(c.table.grid.x,'candidate.table.grid.x',0,1);int(c.table.grid.y,'candidate.table.grid.y',0,1);
  oneOf(c.table.layout,'candidate.table.layout',['interleaved','split']);oneOf(c.table.order,'candidate.table.order',['row','column']);
  int(c.table.physicalBase,'candidate.table.physicalBase',16,8*1024*1024);int(c.table.recordStep,'candidate.table.recordStep',1,4);int(c.table.fieldStep,'candidate.table.fieldStep',1,256);
  keys(c.verification,'candidate.verification',['repeatability','interventions','independent']);
  if(c.verification.independent!=='not performed')fail('candidate.verification.independent','must be "not performed" in the definition; an evaluation is a separate record');
  if(c.version===2){
    oneOf(c.table.numbering,'candidate.table.numbering',NUMBERING);
    keys(c.revision,'candidate.revision',['number','previous','reason']);int(c.revision.number,'candidate.revision.number',1,10000);
    if(c.revision.number===1?c.revision.previous!==null:!/^[0-9a-f]{64}$/.test(c.revision.previous||''))fail('candidate.revision.previous','must be null for revision 1 and the previous revision\'s hash after it');
    text(c.revision.reason,'candidate.revision.reason',LIMITS.description);
    keys(c.decoder,'candidate.decoder',['name','version']);ident(c.decoder.name,'candidate.decoder.name');int(c.decoder.version,'candidate.decoder.version',1,1000);
    keys(c.assumptions,'candidate.assumptions',['mapper','banking','mirroring','screen']);
    list(c.unsupported,'candidate.unsupported',0,32).forEach((u,i)=>text(u,'candidate.unsupported['+i+']',LIMITS.description));
  }
}
function verifyCandidate(definition){
  const problems=[];
  try{if(!isObject(definition))fail('candidate','must be an object');const fields=candidateFields(definition),body={};for(const k of fields)body[k]=definition[k];checkCandidateBody(body);
    for(const k of Object.keys(definition))if(!fields.includes(k)&&k!=='definitionHash')problems.push('unrecognised field '+k);
    if(hashOf(body)!==definition.definitionHash)problems.push('the definition does not match its hash');}
  catch(error){problems.push(error.message);}
  return {ok:!problems.length,problems};
}
// A changed definition is a new revision: it starts untested (its predecessor's interventions, withheld evaluation and
// independent verification do not carry over), and it names the revision it replaces.
function reviseCandidate(definition,changes,reason){
  const v=verifyCandidate(definition);if(!v.ok)fail('candidate','cannot be revised: '+v.problems.join('; '));
  if(definition.version!==2)fail('candidate','only a v2 definition can be revised');
  for(const k of Object.keys(changes||{}))if(!['table','attributes','extent','aliases','limitations','unsupported'].includes(k))fail('changes.'+k,'cannot be revised (identity, status and evidence are not editable)');
  const copy=JSON.parse(JSON.stringify(definition));delete copy.definitionHash;Object.assign(copy,JSON.parse(JSON.stringify(changes||{})));
  copy.revision={number:definition.revision.number+1,previous:definition.definitionHash,reason};copy.hypothesis='proposed';
  copy.evidence={plans:[],interventions:[],revisedFrom:definition.definitionHash};
  copy.verification={repeatability:'not tested (new revision)',interventions:'not tested (new revision)',independent:'not performed'};
  return sealCandidate(copy);
}

function deepFreeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)&&!(value instanceof Uint8Array)){Object.freeze(value);for(const v of Object.values(value))deepFreeze(v);}return value;}

return Object.freeze({version:VERSION,FORMATS,OUTCOMES,HYPOTHESES,VERIFICATION,LIMITS,BUTTONS,CHANNELS,TRIAL_KINDS,PRIVACY,SYNTHETIC_MARKER,
  canonical,sha256,hashOf,hex,fromHex,romLayout,isSynthetic,SUPPORTED_MAPPERS,approval,authorize,defaultProtected,validateSteps,validatePlan,validateMutations,buildVariant,
  sealReceipt,verifyReceipt,sealCandidate,verifyCandidate,reviseCandidate,NUMBERING,deepFreeze,fail});
});
