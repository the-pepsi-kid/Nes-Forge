/* AL-EXP-01 (BL05): the experiment evidence store. Separate from the resource library by design: nothing here writes
 * to the library, a project or a cartridge, and nothing in the library reads it. Payloads are stored once per exact
 * SHA-256 of their bytes; every trial keeps its own causal edge even when two trials produced identical payloads, so
 * identical pixels never merge two causes. Receipts and candidate definitions are verified against their hashes when
 * added or imported, so a tampered record is refused. The metadata export carries hashes, offsets, counts and
 * outcomes only: no cartridge or screen bytes, no file names or paths. */
(function(root,factory){const node=typeof module!=='undefined'&&module.exports;const api=factory(node?require('./experiment-contract.js'):root.ForgeExperimentContract);if(node)module.exports=api;else root.ForgeExperimentEvidence=api;})(typeof globalThis!=='undefined'?globalThis:this,function(contract){
'use strict';
const VERSION=1;
function fail(message){throw Error('Experiment evidence: '+message);}
const b64=bytes=>{let s='';for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode.apply(null,bytes.subarray(i,i+0x8000));return typeof btoa==='function'?btoa(s):Buffer.from(s,'latin1').toString('base64');};
const unb64=text=>{const s=typeof atob==='function'?atob(text):Buffer.from(text,'base64').toString('latin1');const out=new Uint8Array(s.length);for(let i=0;i<s.length;i++)out[i]=s.charCodeAt(i);return out;};

function createStore({maxBytes=contract.LIMITS.evidenceBytes}={}){
  const payloads=new Map(),receipts=new Map(),candidates=new Map(),evaluations=new Map(),edges=[],edgeKeys=new Set();let bytes=0;
  const store={
    putBytes(data,kind){if(!(data instanceof Uint8Array))fail('payloads are bytes');const id='sha256:'+contract.sha256(data);
      if(!payloads.has(id)){if(bytes+data.length>maxBytes)fail('the evidence budget of '+maxBytes+' bytes would be exceeded');payloads.set(id,{kind,bytes:new Uint8Array(data)});bytes+=data.length;}
      return id;},
    getBytes(id){const p=payloads.get(id);return p?new Uint8Array(p.bytes):null;},
    hasPayload:id=>payloads.has(id),
    addReceipt(receipt){const check=contract.verifyReceipt(receipt);if(!check.ok)fail('receipt refused: '+check.problems.join('; '));if(receipts.has(receipt.receiptHash))return {added:false,receiptHash:receipt.receiptHash};receipts.set(receipt.receiptHash,receipt);return {added:true,receiptHash:receipt.receiptHash};},
    // a causal edge: this trial's mutation (or none) led to this observation. Never deduplicated across trials.
    addEdge(edge){const key=[edge.trial,edge.from,edge.to,edge.kind].join('|');if(edgeKeys.has(key))return false;edgeKeys.add(key);edges.push({trial:edge.trial,from:edge.from,to:edge.to,kind:edge.kind,...(edge.capture?{capture:edge.capture}:{})});return true;},
    addCandidate(definition){const check=contract.verifyCandidate(definition);if(!check.ok)fail('candidate refused: '+check.problems.join('; '));if(definition.status!=='candidate')fail('only candidates are stored here');candidates.set(definition.definitionHash,definition);return definition.definitionHash;},
    addEvaluation(evaluation){if(!evaluation||evaluation.format!==contract.FORMATS.evaluation)fail('not an evaluation');const id=contract.hashOf(evaluation);evaluations.set(id,evaluation);return id;},
    receipts:()=>[...receipts.values()],candidates:()=>[...candidates.values()],edges:()=>edges.map(e=>({...e})),
    stats:()=>({payloads:payloads.size,payloadBytes:bytes,receipts:receipts.size,edges:edges.length,candidates:candidates.size,evaluations:evaluations.size}),
    // public-safe: hashes, offsets, counts, outcomes. Cartridge byte values (a mutation's expected/original byte) are
    // kept only for synthetic cartridges.
    exportMetadata({privacy='private'}={}){
      const redact=r=>{if(privacy==='synthetic'||!r.variant)return r;return {...r,variant:{...r.variant,mutations:r.variant.mutations.map(m=>({offset:m.offset,region:m.region}))}};};
      return {format:contract.FORMATS.evidence,version:VERSION,kind:'metadata',privacy,
        receipts:[...receipts.values()].map(r=>redact(stripTiming(r))),edges:edges.map(e=>({...e})),candidates:[...candidates.values()],
        payloads:[...payloads.entries()].map(([id,p])=>({id,kind:p.kind,byteLength:p.bytes.length})),
        note:'Metadata only: no cartridge, screen or pixel bytes, no file names or paths. Candidates are not verified resources.'};
    },
    // private: the same plus payload bytes, for keeping a local record of a run
    exportPrivate(){return {...store.exportMetadata({privacy:'synthetic'}),kind:'private',payloads:[...payloads.entries()].map(([id,p])=>({id,kind:p.kind,base64:b64(p.bytes)}))};},
    // import: every record is re-verified; payload bytes must match their ids; importing twice changes nothing
    importEvidence(doc){
      if(!doc||doc.format!==contract.FORMATS.evidence||doc.version!==VERSION)fail('not an experiment evidence export');
      const added={payloads:0,receipts:0,edges:0,candidates:0};
      for(const p of doc.payloads||[]){if(p.base64===undefined)continue;const data=unb64(p.base64);if('sha256:'+contract.sha256(data)!==p.id)fail('payload '+p.id+' does not match its bytes');if(!payloads.has(p.id)){store.putBytes(data,p.kind);added.payloads++;}}
      for(const r of doc.receipts||[])if(store.addReceipt(r).added)added.receipts++;
      for(const e of doc.edges||[])if(store.addEdge(e))added.edges++;
      for(const c of doc.candidates||[]){if(!candidates.has(c.definitionHash)){store.addCandidate(c);added.candidates++;}}
      return added;
    },
  };
  return store;
}
function stripTiming(r){const {timing,...rest}=r;return rest;}
return Object.freeze({version:VERSION,createStore,b64,unb64});
});
