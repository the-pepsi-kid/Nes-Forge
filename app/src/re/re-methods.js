/* Versioned recovery methods operate on immutable physical-file inspections.
 * Registration is a trusted application-code boundary, never ROM execution. */
(()=>{
'use strict';
const services=(window.Forge=window.Forge||{}).services=window.Forge.services||{};
const levels=Object.freeze(['unknown','observed','inferred','decoded','round-trip-validated','converted']);
const statuses=Object.freeze(['supported','unknown','unsupported','ambiguous','invalid']);
const LIMITS=Object.freeze({source:64*1024*1024,result:2*1024*1024,methods:32,evidence:1024,ranges:4096,work:64*1024*1024});
const operations=Object.freeze({inspect:'read-only',decode:'read-only',patch:'native-copy',encode:'native-copy',convert:'preview'});
function integer(value,min,max,label){if(!Number.isSafeInteger(value)||value<min||value>max)fail(label+' is outside its bounded integer range.');return value;}
function ordinary(value,label){if(!value||typeof value!=='object'||Array.isArray(value))fail(label+' must be an object.');return value;}
function boundedJSON(value,label){let result;try{result=JSON.stringify(value,(_,v)=>{if(typeof v==='function'||typeof v==='symbol'||typeof v==='bigint'||typeof v==='number'&&!Number.isFinite(v))fail(label+' must contain ordinary finite JSON values.');return v;});}catch(error){fail(label+' must contain bounded ordinary JSON: '+error.message);}if(result===undefined||result.length>LIMITS.result)fail(label+' exceeds 2 MiB.');return JSON.parse(result);}
function abort(signal){if(signal?.aborted){const error=Error('Recovery discovery or operation cancelled.');error.name='AbortError';throw error;}}
const yieldTask=()=>new Promise(resolve=>setTimeout(resolve,0));
const copy=value=>JSON.parse(JSON.stringify(value));
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
const fail=message=>{throw Error('RE methods: '+message);};
function identity(source){if(!source||! /^[0-9a-f]{64}$/.test(source.sha256)||!Number.isSafeInteger(source.byteLength)||source.byteLength<0||source.byteLength>LIMITS.source)fail('A SHA-256 physical source identity is required.');if(source.algorithm!==undefined&&source.algorithm!=='SHA-256')fail('Source algorithm must be SHA-256.');if(source.name!==undefined&&(typeof source.name!=='string'||source.name.length>512))fail('Source name must be bounded text.');return {sha256:source.sha256,byteLength:source.byteLength,...(source.name!==undefined?{name:source.name}:{}),...(source.algorithm!==undefined?{algorithm:source.algorithm}:{})};}
function sameSource(actual,expected){const checked=identity(actual);if(checked.sha256!==expected.sha256||checked.byteLength!==expected.byteLength)fail('Result refers to a different physical source.');}
function evidence(input,source){
  const original=identity(source);if(input?.sourceSha256!==undefined&&input.sourceSha256!==original.sha256)fail('Evidence refers to a different physical source.');if(input?.source!==undefined)sameSource(input.source,original);if(!input||typeof input!=='object'||!levels.includes(input.status))fail('Unknown evidence status.');
  if(typeof input.claim!=='string'||!input.claim.trim()||input.claim.length>2000)fail('Evidence requires a bounded claim.');
  if(!Array.isArray(input.ranges)||input.ranges.length>1024)fail('Evidence requires at most 1024 physical ranges.');
  const ranges=input.ranges.map(r=>{if(!r||!Number.isSafeInteger(r.start)||!Number.isSafeInteger(r.length)||r.start<0||r.length<1||r.start+r.length>original.byteLength||(r.endExclusive!==undefined&&r.endExclusive!==r.start+r.length))fail('Evidence range falls outside the original source.');return {start:r.start,length:r.length,endExclusive:r.start+r.length,...(r.bank!==undefined?{bank:String(r.bank).slice(0,160)}:{})};});
  if(input.status!=='unknown'&&!ranges.length)fail('Known evidence must identify its original bytes.');
  return freeze({status:input.status,claim:input.claim,sourceSha256:original.sha256,ranges,...(input.detail?{detail:String(input.detail).slice(0,4000)}:{})});
}
function createRegistry(){
  const methods=new Map();
  function get(id){const m=methods.get(id);if(!m)fail('Unknown recovery method '+String(id));return m;}
  function register(method){
    if(!method||typeof method.id!=='string'||! /^[a-z][a-z0-9.-]{2,79}$/.test(method.id)||!Number.isInteger(method.version)||method.version<1)fail('Method ID and positive version are required.');
    if(methods.has(method.id))fail('Duplicate method ID.');if(methods.size>=LIMITS.methods)fail('At most 32 trusted recovery methods may be registered.');
    if(typeof method.name!=='string'||!method.name||method.name.length>160||!Array.isArray(method.domains)||!method.domains.length||!method.domains.every(x=>['graphics','maps','collision','audio','code','gameplay'].includes(x)))fail('Method name and supported domains are required.');
    if(typeof method.probe!=='function'||typeof method.decode!=='function'||typeof method.encode!=='function')fail('A recovery method requires probe, decoder and encoder functions.');
    if(!Array.isArray(method.limitations)||!method.limitations.length||method.limitations.some(x=>typeof x!=='string'||x.length>2000))fail('Declare method limitations.');
    const descriptor=freeze({id:method.id,version:method.version,name:method.name,domains:copy(method.domains),limitations:copy(method.limitations)});
    const profile=freeze({...descriptor,contractVersion:1,limits:{maxSourceBytes:LIMITS.source,maxWork:4*1024*1024},operations:{decode:{label:'Decode source assets',effect:'read-only'},encode:{label:'Encode selected assets',effect:'native-copy'}}});
    methods.set(method.id,{descriptor,profile,legacy:true,probe:method.probe,decode:method.decode,encode:method.encode});return descriptor;
  }
  function inspection(value){identity(value?.report?.identity);if(typeof value.read!=='function')fail('An immutable physical inspection is required.');return value;}
  function probe(id,analysis){const m=get(id);if(!m.legacy)fail('Version 2 profiles require asynchronous discovery or dispatch.');const result=m.probe(inspection(analysis));if(!result||typeof result.supported!=='boolean'||typeof result.reason!=='string')fail('Method probe returned an invalid result.');return freeze({method:m.descriptor,source:identity(analysis.report.identity),supported:result.supported,reason:result.reason});}
  function decode(id,analysis,options={}){
    const match=probe(id,analysis);if(!match.supported)fail(match.reason);
    const m=get(id),result=m.decode(analysis,options);
    if(!result||!Array.isArray(result.evidence)||!result.evidence.length)fail('Decoder must return source evidence.');
    const encoded=JSON.stringify(result);if(encoded.length>2*1024*1024)fail('Decoded result exceeds 2 MiB.');
    return freeze({...copy(result),method:m.descriptor,source:identity(analysis.report.identity),evidence:result.evidence.map(item=>evidence(item,analysis.report.identity))});
  }
  function encode(id,data){const m=get(id);if(!m.legacy)fail('Version 2 profiles declare encoding separately; use dispatch.');const result=m.encode(data);if(!Array.isArray(result)&&!(result instanceof Uint8Array))fail('Encoder must return bytes.');if(result.length>65536||Array.from(result).some(v=>!Number.isInteger(v)||v<0||v>255))fail('Encoder returned invalid or excessive bytes.');return freeze(Array.from(result));}
  function validateRoundTrip(id,analysis,options={}){
    const decoded=decode(id,analysis,options),span=decoded.encodedSpan;if(!span||!Number.isSafeInteger(span.start)||span.start<0||!Number.isInteger(span.length)||span.length<1||span.length>65536||span.start+span.length>decoded.source.byteLength)fail('Decoder must declare a bounded encoded span for round-trip validation.');
    const original=analysis.read(span.start,span.length).bytes,encoded=encode(id,decoded),equal=encoded.length===original.length&&encoded.every((v,i)=>v===original[i]);
    return freeze({method:decoded.method,source:decoded.source,passed:equal,byteLength:original.length,evidence:evidence({status:equal?'round-trip-validated':'decoded',claim:equal?'Decoded assets encode to the identical selected source bytes.':'Decoded asset encoding differs from its selected source bytes.',ranges:[span]},analysis.report.identity)});
  }
  // Profile v2 describes independent operations. In particular a canonical
  // conversion never implies an encoder, inverse, or native round trip.
  function registerProfile(method){
    ordinary(method,'Profile');if(method.contractVersion!==2)fail('Profile contractVersion must be 2.');
    if(typeof method.id!=='string'||!/^[a-z][a-z0-9.-]{2,79}$/.test(method.id)||!Number.isSafeInteger(method.version)||method.version<1)fail('Method ID and positive version are required.');
    if(methods.has(method.id))fail('Duplicate method ID.');if(methods.size>=LIMITS.methods)fail('At most 32 trusted recovery methods may be registered.');
    if(typeof method.name!=='string'||!method.name.trim()||method.name.length>160||!Array.isArray(method.domains)||!method.domains.length||method.domains.length>6||new Set(method.domains).size!==method.domains.length||!method.domains.every(x=>['graphics','maps','collision','audio','code','gameplay'].includes(x)))fail('Method name and supported domains are required.');
    if(!Array.isArray(method.limitations)||!method.limitations.length||method.limitations.length>32||method.limitations.some(x=>typeof x!=='string'||!x.trim()||x.length>2000))fail('Declare bounded method limitations.');
    ordinary(method.limits,'Profile limits');integer(method.limits.maxSourceBytes,1,LIMITS.source,'Maximum source bytes');integer(method.limits.maxWork,1,LIMITS.work,'Maximum cooperative work');
    ordinary(method.operations,'Profile operations');ordinary(method.handlers,'Profile handlers');const names=Object.keys(method.operations);if(!names.length||names.length>5)fail('Declare one or more independent operations.');
    const declared={};for(const name of names){const op=method.operations[name];if(!Object.hasOwn(operations,name))fail('Unknown profile operation.');ordinary(op,'Operation');if(op.effect!==operations[name])fail('Operation effect differs from the contract.');if(typeof op.label!=='string'||!op.label.trim()||op.label.length>160)fail('Operation requires a bounded label.');if(op.fidelity!==undefined&&!['exact','native','lossy','subset'].includes(op.fidelity))fail('Unknown operation fidelity.');if(name==='convert'&&!['exact','lossy','subset'].includes(op.fidelity))fail('Canonical conversion must declare its fidelity.');if(op.inverse!==undefined||op.roundTrip!==undefined)fail('An operation descriptor cannot imply an inverse or native round trip.');if(typeof method.handlers[name]!=='function')fail('Every declared operation requires its own trusted handler.');declared[name]={label:op.label,effect:op.effect,...(op.fidelity!==undefined?{fidelity:op.fidelity}:{})};}
    if(Object.keys(method.handlers).some(name=>!Object.hasOwn(declared,name)))fail('Do not register undeclared operation handlers.');if(typeof method.probe!=='function')fail('A profile requires a trusted recognition probe.');
    if(method.sceneConversion!==undefined&&(!['background','map'].includes(method.sceneConversion)||!declared.convert))fail('Scene conversion must identify background or map and declare convert.');
    const descriptor=freeze({id:method.id,version:method.version,contractVersion:2,name:method.name,domains:copy(method.domains),limitations:copy(method.limitations),limits:{maxSourceBytes:method.limits.maxSourceBytes,maxWork:method.limits.maxWork},operations:declared,...(method.sceneConversion!==undefined?{sceneConversion:method.sceneConversion}:{})});
    methods.set(method.id,{descriptor,profile:descriptor,legacy:false,probe:method.probe,handlers:Object.fromEntries(names.map(name=>[name,method.handlers[name]]))});return descriptor;
  }
  function controls(configuration={}){
    ordinary(configuration,'Execution controls');const signal=configuration.signal;if(signal!==undefined&&(!signal||typeof signal.aborted!=='boolean'))fail('Cancellation signal requires a boolean aborted state.');
    return {signal,limit:integer(configuration.workBudget??16*1024*1024,1,LIMITS.work,'Work budget'),used:0};
  }
  function contextFor(method,analysis,control,source){
    let used=0;const check=()=>{abort(control.signal);sameSource(analysis.report.identity,source);};
    function consume(amount=1){check();integer(amount,0,LIMITS.work,'Work charge');if(amount>method.profile.limits.maxWork-used||amount>control.limit-control.used){const error=Error('Recovery method cooperative work budget exhausted.');error.code='WORK_LIMIT';throw error;}used+=amount;control.used+=amount;}
    function read(start,length){integer(start,0,source.byteLength,'File offset');integer(length,0,Math.min(65536,source.byteLength-start),'Read length');consume(length);const result=analysis.read(start,length);if(!result||result.fileOffset!==start||!Array.isArray(result.bytes)||result.bytes.length!==length||result.bytes.some(v=>!Number.isInteger(v)||v<0||v>255)||result.provenance?.sha256!==source.sha256||result.provenance?.file?.start!==start||result.provenance?.file?.length!==length)fail('Physical read returned mismatched source bytes or provenance.');return result;}
    return Object.freeze({source:freeze(copy(source)),consume,read,throwIfAborted:check,checkpoint:async(amount=0)=>{consume(amount);await yieldTask();check();},get workUsed(){return used;}});
  }
  function normalizeResult(method,result,source){
    const clean=boundedJSON(result,'Method result');if(!clean||!statuses.includes(clean.status)||typeof clean.reason!=='string'||!clean.reason.trim()||clean.reason.length>2000)fail('Method returned an invalid status or reason.');
    if(clean.source!==undefined)sameSource(clean.source,source);if(clean.sourceSha256!==undefined&&clean.sourceSha256!==source.sha256)fail('Result refers to a different physical source.');
    if(!Array.isArray(clean.evidence)||clean.evidence.length>LIMITS.evidence)fail('Method requires a bounded evidence array.');if(clean.status==='supported'&&!clean.evidence.length)fail('Supported methods must identify source evidence.');let ranges=0;for(const item of clean.evidence){if(!Array.isArray(item?.ranges))fail('Evidence requires source ranges.');ranges+=item.ranges.length;if(ranges>LIMITS.ranges)fail('Method evidence exceeds the aggregate physical-range budget.');}
    return freeze({method:method.profile,source:copy(source),status:clean.status,reason:clean.reason,evidence:clean.evidence.map(item=>evidence(item,source)),...(clean.data!==undefined?{data:clean.data}:{})});
  }
  function unavailable(method,source,status,reason){return freeze({method:method.profile,source:copy(source),status,reason:String(reason).slice(0,2000),evidence:[]});}
  async function recognize(method,analysis,control,source,context){
    abort(control.signal);if(source.byteLength>method.profile.limits.maxSourceBytes)return unavailable(method,source,'unsupported','Source exceeds this method’s '+method.profile.limits.maxSourceBytes+'-byte limit; no probe was run.');
    try{
      context.consume(1);const value=await method.probe(analysis,context);context.throwIfAborted();
      if(method.legacy){if(!value||typeof value.supported!=='boolean'||typeof value.reason!=='string')fail('Method probe returned an invalid result.');return normalizeResult(method,{status:value.supported?'supported':'unsupported',reason:value.reason,evidence:value.supported?[{status:'inferred',claim:'Trusted legacy method reports applicability to this identified physical file. This file-wide reference is not a claim that every byte was examined; asset decoding and byte round-trip validation remain separate checks.',ranges:source.byteLength?[{start:0,length:source.byteLength}]:[]}]:[]},source);}
      return normalizeResult(method,value,source);
    }catch(error){if(error.name==='AbortError')throw error;return unavailable(method,source,error.code==='WORK_LIMIT'?'unsupported':'invalid',error.message);}
  }
  async function discover(analysis,configuration={}){
    inspection(analysis);const source=identity(analysis.report.identity),control=controls(configuration),ids=configuration.ids??[...methods.keys()];if(!Array.isArray(ids)||ids.length>LIMITS.methods||new Set(ids).size!==ids.length||ids.some(id=>typeof id!=='string'))fail('Discovery requires up to 32 unique method IDs.');const selected=ids.map(get),results=[];
    abort(control.signal);for(const method of selected){await yieldTask();abort(control.signal);const context=contextFor(method,analysis,control,source);results.push(await recognize(method,analysis,control,source,context));}abort(control.signal);sameSource(analysis.report.identity,source);
    return freeze({status:'completed',source,results,work:{used:control.used,limit:control.limit}});
  }
  async function dispatch(id,operation,analysis,options={},configuration={}){
    const method=get(id);inspection(analysis);ordinary(options,'Operation options');const input=boundedJSON(options,'Operation options'),source=identity(analysis.report.identity),control=controls(configuration);abort(control.signal);
    if(!Object.hasOwn(method.profile.operations,operation))return unavailable(method,source,'unsupported','This method does not declare the '+String(operation)+' operation.');
    const context=contextFor(method,analysis,control,source);await context.checkpoint();const match=await recognize(method,analysis,control,source,context);if(match.status!=='supported')return match;
    try{
      context.consume(1);let result;
      if(method.legacy){
        if(operation==='decode'){const data=decode(id,analysis,input);context.consume(data.encodedSpan?.length??1);result={status:'supported',reason:'Selected assets decoded from physical source bytes.',evidence:data.evidence,data};}
        else{
          const data=input.data,span=data?.encodedSpan;if(!data?.source)fail('Encoding dispatch requires decoded data with its original source identity.');sameSource(data.source,source);if(data.sourceSha256!==undefined&&data.sourceSha256!==source.sha256)fail('Encoded data refers to a different physical source.');
          if(!data.method||data.method.id!==method.descriptor.id||data.method.version!==method.descriptor.version)fail('Encoded data must identify its decoding method and version.');
          if(!span||!Number.isSafeInteger(span.start)||!Number.isSafeInteger(span.length)||span.start<0||span.length<1||span.length>65536||span.start+span.length>source.byteLength||(span.endExclusive!==undefined&&span.endExclusive!==span.start+span.length))fail('Encoding dispatch requires a bounded original encodedSpan.');
          if(input.encodedSpan!==undefined&&(input.encodedSpan.start!==span.start||input.encodedSpan.length!==span.length||(input.encodedSpan.endExclusive!==undefined&&input.encodedSpan.endExclusive!==span.start+span.length)))fail('An encodedSpan override cannot change the selected source span.');
          if(!Array.isArray(data.evidence)||!data.evidence.length||data.evidence.length>LIMITS.evidence)fail('Encoded data must retain its original source evidence.');const checkedEvidence=data.evidence.map(item=>evidence(item,source));if(!checkedEvidence.some(item=>item.status!=='unknown'&&item.ranges.some(range=>range.start===span.start&&range.length===span.length)))fail('Encoded span must match retained physical source evidence.');if(checkedEvidence.reduce((count,item)=>count+item.ranges.length,0)>LIMITS.ranges)fail('Encoded evidence exceeds the aggregate physical-range budget.');
          const bytes=encode(id,data);if(bytes.length!==span.length)fail('Encoded bytes must retain the selected source span length.');context.consume(bytes.length);result={status:'supported',reason:'Raw asset bytes encoded as a separate copy; no ROM patch or inverse verification is implied.',evidence:[{status:'converted',claim:'Selected source-related assets encoded as raw bytes; original ROM remains unchanged.',ranges:[span]}],data:{bytes,encodedSpan:span}};
        }
      }else result=await method.handlers[operation](analysis,input,context);
      context.throwIfAborted();return normalizeResult(method,result,source);
    }catch(error){if(error.name==='AbortError')throw error;return unavailable(method,source,error.code==='WORK_LIMIT'?'unsupported':'invalid',error.message);}
  }
  return Object.freeze({register,registerProfile,list:()=>freeze([...methods.values()].map(m=>m.descriptor)),profiles:()=>freeze([...methods.values()].map(m=>m.profile)),probe,decode,encode,validateRoundTrip,discover,dispatch});
}
services.REMethods=Object.freeze({...createRegistry(),createRegistry,evidence,levels,statuses,limits:LIMITS,version:2});
})();
