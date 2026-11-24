/* AL-EXP-02: independent verification. Pure and engine-neutral (UMD): the same code runs in the editor and in the
 * development harness (tools/agent-lab/independent), so both sides normalize and compare identically.
 *
 * A verification job is what both engines run: a cartridge from power-on, the joypad masks latched at successive $4016
 * strobes, and checkpoints at the k-th entry to the NMI handler. Frame counts are not compared: engines number frames
 * differently, and the program's own events are the common clock.
 *
 * Normalization (representation only, never meaning): CPU flags B and bit 5 are not stored flags and are masked;
 * nametable RAM is taken physically (2 KiB) through the cartridge's mirroring; palette RAM mirrors ($3F10/14/18/1C)
 * are folded and values masked to 6 bits; the picture is compared as NES colour indices reduced to the classes NES
 * Forge's palette table draws identically (RGB values, overscan and emulator palettes are never compared). Differences
 * are kept and classified, never dropped: the three bytes of the interrupt frame on the stack are timing-dependent
 * (where the main loop was when NMI arrived); every other difference is semantic until explained. */
(function(root,factory){const node=typeof module!=='undefined'&&module.exports;const api=factory(node?require('./experiment-contract.js'):root.ForgeExperimentContract);if(node)module.exports=api;else root.ForgeExperimentVerification=api;})(typeof globalThis!=='undefined'?globalThis:this,function(contract){
'use strict';
const VERSION=1;
const FORMATS=Object.freeze({job:'NESForgeVerificationJob',independent:'NESForgeIndependentVerification'});
const CHANNELS=Object.freeze(['cpu','ram','nametables','attributes','palette','chr','pixels','reads']);
const NOT_COMPARED=Object.freeze({oam:'FCEUX 2.6 exposes no OAM read to Lua; the fixtures draw no sprites',apu:'audio is outside this verification'});
const VERDICTS=Object.freeze(['verified','reproduced','failed','blocked','not-applicable']);
function fail(message){throw Error('Verification: '+message);}
const bytesOf=v=>v instanceof Uint8Array?v:v&&v.type==='Buffer'?Uint8Array.from(v.data):Array.isArray(v)?Uint8Array.from(v):null;

// ---------- jobs ----------
// From a Forge frame-mode run: the masks it latched, and the NMI index at each capture (the last NMI handler entry
// before the end of the capture frame).
function deriveJob({id,kind,cartridgeSha256,mutations=[],sync,captures,trace=false,chr=false,pixels=true,margin=120}){
  if(!sync||!Array.isArray(sync.latches)||!Array.isArray(sync.nmiFrames))fail('the run carries no synchronization record');
  const checkpoints=[];
  for(const c of captures){const k=sync.nmiFrames.filter(f=>f<c.frame).length;if(k>0&&!checkpoints.some(x=>x.nmi===k))checkpoints.push({label:c.label,nmi:k});}
  const latches=sync.latches.map(l=>l[1]);
  return {format:FORMATS.job,version:VERSION,id,kind,cartridgeSha256,mutations:mutations.map(m=>({offset:m.offset,expected:m.expected,value:m.value})),
    nmiTarget:sync.nmiTarget,latches,defaultMask:0,checkpoints,maxFrames:Math.max(...captures.map(c=>c.frame))+margin,trace:!!trace,chr:!!chr,pixels:!!pixels,
    channels:['cpu','ram','nametables','palette',...(chr?['chr']:[]),...(pixels?['pixels']:[]),...(trace?['reads']:[])]};
}

// ---------- normalization ----------
function foldPalette(p){const out=new Uint8Array(32);for(let i=0;i<32;i++){let j=i;if((j&19)===16)j-=16;out[i]=p[j]&63;}return out;}
function splitCiram(ciram){const nt=new Uint8Array(1920),at=new Uint8Array(128);nt.set(ciram.subarray(0,960),0);nt.set(ciram.subarray(0x400,0x400+960),960);at.set(ciram.subarray(960,1024),0);at.set(ciram.subarray(0x400+960,0x800),64);return {nt,at};}
// logical PPU $2000-$2FFF (as an emulator's PPU bus shows it) to physical nametable RAM
function physicalFromLogical(ppu,mirroring){const out=new Uint8Array(0x800);if(mirroring==='vertical'){out.set(ppu.subarray(0,0x400),0);out.set(ppu.subarray(0x400,0x800),0x400);}else if(mirroring==='horizontal'){out.set(ppu.subarray(0,0x400),0);out.set(ppu.subarray(0x800,0xc00),0x400);}else fail('mirroring '+mirroring+' is not supported');return out;}
function pixelsToClass(px,colourClass){const out=new Uint8Array(px.length);for(let i=0;i<px.length;i++){const v=px[i]&63;out[i]=px[i]===255?255:colourClass?colourClass[v]:v;}return out;}
function readsBytes(reads){const out=new Uint8Array(reads.length*4);reads.forEach(([pc,a],i)=>{out[4*i]=pc&255;out[4*i+1]=pc>>8;out[4*i+2]=a&255;out[4*i+3]=a>>8;});return out;}
// to {channel: bytes} with one form for both engines
function normalize(capture,{engine,mirroring,colourClass}){
  const out={label:capture.label,nmi:capture.nmi,frame:capture.frame,latches:capture.latches,channels:{}};const c=out.channels;
  const regs=engine==='forge'?capture.cpu:capture.regs;
  if(regs)c.cpu=Uint8Array.from([regs.a,regs.x,regs.y,regs.s,regs.p&0xcf,regs.pc&255,regs.pc>>8]);
  const ram=bytesOf(capture.ram);if(ram)c.ram=ram;out.written=bytesOf(capture.written);
  const ciram=engine==='forge'?bytesOf(capture.ciram):capture.ppu?physicalFromLogical(bytesOf(capture.ppu),mirroring):null;
  if(ciram){const s=splitCiram(ciram);c.nametables=s.nt;c.attributes=s.at;out.ciram=ciram;}
  const pal=bytesOf(capture.palette);if(pal)c.palette=foldPalette(pal);
  const chr=bytesOf(capture.chr);if(chr)c.chr=chr;
  const px=bytesOf(capture.pixels);if(px)c.pixels=pixelsToClass(px,colourClass);
  if(capture.reads)c.reads=readsBytes(capture.reads.map(r=>[r[0],r[1]]));
  return out;
}
const digestAll=n=>Object.fromEntries(Object.entries(n.channels).map(([k,v])=>[k,contract.sha256(v)]));

// ---------- comparison ----------
function compareNormalized(a,b){
  const channels={},discrepancies=[];
  for(const ch of CHANNELS){
    const x=a.channels[ch],y=b.channels[ch];
    if(!x||!y){channels[ch]={status:'not-compared',reason:!x&&!y?'captured by neither run':!x?'not captured by NES Forge':'not captured by the independent emulator'};continue;}
    if(x.length===y.length&&x.every((v,i)=>v===y[i])){channels[ch]={status:'equal',bytes:x.length};continue;}
    const diffs=[];for(let i=0;i<Math.max(x.length,y.length);i++)if(x[i]!==y[i])diffs.push(i);
    const row={status:'differs',bytes:Math.max(x.length,y.length),count:diffs.length,first:diffs.slice(0,12).map(i=>({index:i,forge:x[i]??null,independent:y[i]??null}))};
    if(ch==='ram'){const s=a.channels.cpu?a.channels.cpu[3]:null,frame=s===null?[]:[1,2,3].map(k=>0x100+((s+k)&0xff));
      const timing=diffs.filter(i=>frame.includes(i)),semantic=diffs.filter(i=>!frame.includes(i));
      row.timing={indexes:timing,reason:'the interrupt frame on the stack: where the main loop was when NMI arrived (instruction timing)'};row.semantic=semantic.length;
      row.status=semantic.length?'differs':'equal-except-timing';}
    if(ch==='reads'){row.forgeReads=x.length/4;row.independentReads=y.length/4;row.firstDivergence=diffs.length?Math.floor(diffs[0]/4):null;}
    channels[ch]=row;
    if(row.status==='differs')discrepancies.push({channel:ch,count:row.semantic??row.count,first:row.first,classification:'semantic (unexplained)'});
  }
  for(const [ch,reason] of Object.entries(NOT_COMPARED))channels[ch]={status:'not-compared',reason};
  return {channels,discrepancies,agree:!discrepancies.length};
}

// ---------- predictions, judged on one engine's captures ----------
// the visible (unscrolled, nametable 0) 1024 bytes: 960 tiles then 64 attribute bytes
function visibleOf(n){if(n.ciram)return n.ciram.subarray(0,1024);const nt=n.channels.nametables,at=n.channels.attributes;if(!nt||!at)fail('a capture without nametable bytes cannot be judged');const v=new Uint8Array(1024);v.set(nt.subarray(0,960),0);v.set(at.subarray(0,64),960);return v;}
const visibleAt=(v,i)=>v[i];
function checkPrediction(baseline,variant,predict){
  const a=visibleOf(baseline),b=visibleOf(variant);
  const changed=[];for(let i=0;i<1024;i++)if(visibleAt(a,i)!==visibleAt(b,i))changed.push(i);
  const expect=new Map(predict.map(p=>[p.index,p.value]));
  // a prediction without a value (a private package) asks only that exactly these positions change
  const unexpected=changed.filter(i=>!expect.has(i)||(expect.get(i)!==undefined&&expect.get(i)!==visibleAt(b,i))),missing=[...expect.keys()].filter(i=>!changed.includes(i));
  return {changed:changed.length,predicted:expect.size,unexpected:unexpected.length,missing:missing.length,holds:changed.length>0&&!unexpected.length&&!missing.length};
}
function checkNoEffect(baseline,variant){
  const same=ch=>{const x=baseline.channels[ch],y=variant.channels[ch];return !x||!y||(x.length===y.length&&x.every((v,i)=>v===y[i]));};
  const differing=['nametables','attributes','palette','pixels'].filter(ch=>!same(ch));
  return {holds:!differing.length,differing};
}
// The frozen definition's claims about the withheld screen: each claimed cell's four tiles, and attribute bits
function checkClaims(holdout,claims){
  let cells=0,cellsHold=0,bits=0,bitsHold=0;const failures=[];
  const v=visibleOf(holdout);
  for(const c of claims.cells){cells++;const got=[c.index,c.index+1,c.index+32,c.index+33].map(i=>visibleAt(v,i));if(got.every((v,k)=>v===c.tiles[k]))cellsHold++;else if(failures.length<12)failures.push({cell:c.cell,claimed:c.tiles,captured:got});}
  for(const a of claims.attributes){const got=visibleAt(v,960+a.index);for(let b=0;b<8;b++)if(a.knownMask>>b&1){bits++;if(((a.value^got)>>b&1)===0)bitsHold++;}}
  return {cells,cellsHold,bits,bitsHold,holds:cells===cellsHold&&bits===bitsHold,failures};
}

// ---------- independent verification receipt ----------
const RECEIPT_FIELDS=['format','version','engine','forgeEngine','subject','jobs','comparisons','predictions','verdict','discrepancies','limitations','independent'];
function sealIndependent(body){const out={};for(const k of RECEIPT_FIELDS){if(!(k in body))fail('receipt.'+k+' is required');out[k]=body[k];}
  for(const k of Object.keys(body))if(!RECEIPT_FIELDS.includes(k)&&k!=='receiptHash'&&k!=='timing')fail('receipt.'+k+' is not a recognised field');checkIndependent(out);
  return contract.deepFreeze({...out,receiptHash:contract.hashOf(out),...(body.timing?{timing:body.timing}:{})});}
function checkIndependent(r){
  if(r.format!==FORMATS.independent||r.version!==VERSION)fail('not a '+FORMATS.independent+' v'+VERSION);
  if(!r.engine||typeof r.engine.name!=='string'||!r.engine.version)fail('the receipt names no independent engine and version');
  if(/forge/i.test(r.engine.name))fail('an NES Forge engine cannot be its own independent verifier');
  if(r.independent!==true)fail('an independent receipt says independent: true');
  if(!VERDICTS.includes(r.verdict?.result))fail('verdict.result must be one of '+VERDICTS.join(', '));
  if(!r.subject||!/^[0-9a-f]{64}$/.test(r.subject.cartridgeSha256||''))fail('the receipt names no cartridge');
}
function verifyIndependent(r){const problems=[];try{const body={};for(const k of RECEIPT_FIELDS)body[k]=r[k];checkIndependent(body);
  for(const k of Object.keys(r))if(!RECEIPT_FIELDS.includes(k)&&k!=='receiptHash'&&k!=='timing')problems.push('unrecognised field '+k);
  if(contract.hashOf(body)!==r.receiptHash)problems.push('the receipt does not match its hash');}catch(e){problems.push(e.message);}return {ok:!problems.length,problems};}

// The verdict from comparisons and predictions. "verified" needs a frozen candidate, agreement on every compared channel
// at every checkpoint (timing-classified stack bytes reported, not hidden) and every prediction holding on the
// independent engine. Without a candidate the best result is "reproduced": the observations and negative results
// recur on another engine, and nothing is claimed.
function verdictOf({comparisons,predictions,blocked=null,hasCandidate=true}){
  if(blocked)return {result:'blocked',reason:blocked};
  const disagreements=comparisons.filter(c=>!c.agree),failed=predictions.filter(p=>!p.holds);
  if(!predictions.length&&!comparisons.length)return {result:'not-applicable',reason:'nothing to verify'};
  if(disagreements.length||failed.length)return {result:'failed',reason:[disagreements.length?disagreements.length+' checkpoint(s) where the engines disagree':'',failed.length?failed.length+' prediction(s) that do not hold on the independent engine':''].filter(Boolean).join('; ')};
  if(!hasCandidate)return {result:'reproduced',reason:'no candidate to verify; the engines agree on every compared channel at '+comparisons.length+' checkpoint(s), and '+predictions.length+' negative prediction(s) hold on the independent engine'};
  return {result:'verified',reason:'the engines agree on every compared channel at '+comparisons.length+' checkpoint(s), and '+predictions.length+' prediction(s) hold on the independent engine'};
}

// ---------- the editor's own re-check of an attached receipt ----------
// A receipt carries the independent engine's normalized channels (small ones as bytes, large ones as SHA-256). NES Forge
// compares them with its own job captures and re-judges every prediction on the independent captures itself, so the
// verdict it shows is its own computation from raw data, never the harness's word.
const fromB64=t=>{const s=typeof atob==='function'?atob(t):Buffer.from(t,'base64').toString('latin1');const out=new Uint8Array(s.length);for(let i=0;i<s.length;i++)out[i]=s.charCodeAt(i);return out;};
function receiptCapture(c){return {label:c.label,nmi:c.nmi,channels:Object.fromEntries(Object.entries(c.payloads||{}).map(([ch,t])=>[ch,fromB64(t)])),digests:c.digests||{}};}
function compareByDigest(forge,independent){
  const channels={},discrepancies=[];
  for(const ch of CHANNELS){const fx=forge.channels?.[ch],ix=independent.channels[ch],fd=forge.digests?.[ch],id=independent.digests?.[ch];
    if(fx&&ix){const one=compareNormalized({channels:{[ch]:fx,...(ch==='ram'&&forge.channels.cpu?{cpu:forge.channels.cpu}:{})}},{channels:{[ch]:ix}});channels[ch]=one.channels[ch];discrepancies.push(...one.discrepancies);continue;}
    if(!fd||!id){channels[ch]={status:'not-compared',reason:!fd&&!id?'captured by neither run':!fd?'not captured by NES Forge':'not captured by the independent emulator'};continue;}
    if(fd===id)channels[ch]={status:'equal',by:'SHA-256 of the normalized bytes'};else{channels[ch]={status:'differs',by:'SHA-256 of the normalized bytes (bytes not in the receipt)'};if(ch!=='ram')discrepancies.push({channel:ch,classification:'semantic (unexplained)',by:'digest'});}}
  for(const [ch,reason] of Object.entries(NOT_COMPARED))channels[ch]={status:'not-compared',reason};
  return {channels,discrepancies,agree:!discrepancies.length};
}
// forgeJobs: [{job:{id}, expectation, captures:[{label, digests, channels(bytes, optional)}]}]
function recheck({receipt,forgeJobs}){
  const comparisons=[],predictions=[],notes=[];
  const indep=new Map(receipt.jobs.map(j=>[j.id,j]));
  const ibase=indep.get('training-baseline');const baseIndependent=ibase?ibase.captures.map(receiptCapture):[];
  for(const fj of forgeJobs){const ij=indep.get(fj.job.id);if(!ij){notes.push('the receipt has no run of job '+fj.job.id);continue;}
    if(ij.result?.missing?.length||ij.result?.stopReason){notes.push('job '+fj.job.id+' did not complete on the independent engine: '+(ij.result.stopReason||'missing '+ij.result.missing.join(', ')));}
    for(const fc of fj.captures){const ic=ij.captures.find(c=>c.label===fc.label);if(!ic){comparisons.push({job:fj.job.id,label:fc.label,agree:false,channels:{},discrepancies:[{channel:'all',classification:'checkpoint missing on the independent engine'}]});continue;}
      const r=compareByDigest(fc,receiptCapture(ic));comparisons.push({job:fj.job.id,label:fc.label,nmi:fc.nmi,...r});}
    const e=fj.expectation,icaps=ij.captures.map(receiptCapture);
    if(e.kind==='prediction'||e.kind==='no-effect')for(const c of icaps){const b=baseIndependent.find(x=>x.label===c.label);if(!b)continue;
      try{const r=e.kind==='prediction'?checkPrediction(b,c,e.predict.filter(p=>p.label===c.label)):checkNoEffect(b,c);predictions.push({job:fj.job.id,label:c.label,kind:e.kind,engine:'independent',...r});}catch(err){predictions.push({job:fj.job.id,label:c.label,kind:e.kind,holds:false,error:err.message});}}
    if(e.kind==='claims'&&icaps[0]){try{predictions.push({job:fj.job.id,label:icaps[0].label,kind:'claims',engine:'independent',...checkClaims(icaps[0],e.claims)});}catch(err){predictions.push({job:fj.job.id,kind:'claims',holds:false,error:err.message});}}
  }
  const verdict=verdictOf({comparisons,predictions,hasCandidate:!!receipt.subject?.definitionHash});
  const matchesReceipt=verdict.result===receipt.verdict?.result;
  return {comparisons,predictions,verdict,notes,matchesReceipt,receiptVerdict:receipt.verdict};
}

return Object.freeze({version:VERSION,FORMATS,CHANNELS,NOT_COMPARED,VERDICTS,deriveJob,normalize,digestAll,compareNormalized,checkPrediction,checkNoEffect,checkClaims,visibleOf,recheck,compareByDigest,receiptCapture,
  physicalFromLogical,foldPalette,sealIndependent,verifyIndependent,verdictOf,bytesOf});
});
