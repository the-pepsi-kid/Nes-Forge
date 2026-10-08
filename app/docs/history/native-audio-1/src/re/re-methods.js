/* Versioned recovery methods operate on immutable physical-file inspections.
 * Registration is a trusted application-code boundary, never ROM execution. */
(()=>{
'use strict';
const services=(window.Forge=window.Forge||{}).services=window.Forge.services||{};
const levels=Object.freeze(['unknown','observed','inferred','decoded','round-trip-validated','converted']);
const copy=value=>JSON.parse(JSON.stringify(value));
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
const fail=message=>{throw Error('RE methods: '+message);};
function identity(source){if(!source||! /^[0-9a-f]{64}$/.test(source.sha256)||!Number.isSafeInteger(source.byteLength)||source.byteLength<0||source.byteLength>64*1024*1024)fail('A SHA-256 physical source identity is required.');return copy(source);}
function evidence(input,source){
  const original=identity(source);if(!input||typeof input!=='object'||!levels.includes(input.status))fail('Unknown evidence status.');
  if(typeof input.claim!=='string'||!input.claim.trim()||input.claim.length>2000)fail('Evidence requires a bounded claim.');
  if(!Array.isArray(input.ranges)||input.ranges.length>1024)fail('Evidence requires at most 1024 physical ranges.');
  const ranges=input.ranges.map(r=>{if(!r||!Number.isSafeInteger(r.start)||!Number.isSafeInteger(r.length)||r.start<0||r.length<1||r.start+r.length>original.byteLength)fail('Evidence range falls outside the original source.');return {start:r.start,length:r.length,endExclusive:r.start+r.length,...(r.bank!==undefined?{bank:String(r.bank).slice(0,160)}:{})};});
  if(input.status!=='unknown'&&!ranges.length)fail('Known evidence must identify its original bytes.');
  return freeze({status:input.status,claim:input.claim,sourceSha256:original.sha256,ranges,...(input.detail?{detail:String(input.detail).slice(0,4000)}:{})});
}
function createRegistry(){
  const methods=new Map();
  function get(id){const m=methods.get(id);if(!m)fail('Unknown recovery method '+String(id));return m;}
  function register(method){
    if(!method||typeof method.id!=='string'||! /^[a-z][a-z0-9.-]{2,79}$/.test(method.id)||!Number.isInteger(method.version)||method.version<1)fail('Method ID and positive version are required.');
    if(methods.has(method.id))fail('Duplicate method ID.');
    if(typeof method.name!=='string'||!method.name||method.name.length>160||!Array.isArray(method.domains)||!method.domains.length||!method.domains.every(x=>['graphics','maps','collision','audio','code','gameplay'].includes(x)))fail('Method name and supported domains are required.');
    if(typeof method.probe!=='function'||typeof method.decode!=='function'||typeof method.encode!=='function')fail('A recovery method requires probe, decoder and encoder functions.');
    if(!Array.isArray(method.limitations)||!method.limitations.length||method.limitations.some(x=>typeof x!=='string'||x.length>2000))fail('Declare method limitations.');
    const descriptor=freeze({id:method.id,version:method.version,name:method.name,domains:copy(method.domains),limitations:copy(method.limitations)});
    methods.set(method.id,{descriptor,probe:method.probe,decode:method.decode,encode:method.encode});return descriptor;
  }
  function inspection(value){identity(value?.report?.identity);if(typeof value.read!=='function')fail('An immutable physical inspection is required.');return value;}
  function probe(id,analysis){const m=get(id),result=m.probe(inspection(analysis));if(!result||typeof result.supported!=='boolean'||typeof result.reason!=='string')fail('Method probe returned an invalid result.');return freeze({method:m.descriptor,source:identity(analysis.report.identity),supported:result.supported,reason:result.reason});}
  function decode(id,analysis,options={}){
    const match=probe(id,analysis);if(!match.supported)fail(match.reason);
    const m=get(id),result=m.decode(analysis,options);
    if(!result||!Array.isArray(result.evidence)||!result.evidence.length)fail('Decoder must return source evidence.');
    const encoded=JSON.stringify(result);if(encoded.length>2*1024*1024)fail('Decoded result exceeds 2 MiB.');
    return freeze({...copy(result),method:m.descriptor,source:identity(analysis.report.identity),evidence:result.evidence.map(item=>evidence(item,analysis.report.identity))});
  }
  function encode(id,data){const result=get(id).encode(data);if(!Array.isArray(result)&&!(result instanceof Uint8Array))fail('Encoder must return bytes.');if(result.length>65536||Array.from(result).some(v=>!Number.isInteger(v)||v<0||v>255))fail('Encoder returned invalid or excessive bytes.');return freeze(Array.from(result));}
  function validateRoundTrip(id,analysis,options={}){
    const decoded=decode(id,analysis,options),span=decoded.encodedSpan;if(!span||!Number.isInteger(span.length)||span.length<1||span.length>65536)fail('Decoder must declare a bounded encoded span for round-trip validation.');
    const original=analysis.read(span.start,span.length).bytes,encoded=encode(id,decoded),equal=encoded.length===original.length&&encoded.every((v,i)=>v===original[i]);
    return freeze({method:decoded.method,source:decoded.source,passed:equal,byteLength:original.length,evidence:evidence({status:equal?'round-trip-validated':'decoded',claim:equal?'Decoded assets encode to the identical selected source bytes.':'Decoded asset encoding differs from its selected source bytes.',ranges:[span]},analysis.report.identity)});
  }
  return Object.freeze({register,list:()=>freeze([...methods.values()].map(m=>m.descriptor)),probe,decode,encode,validateRoundTrip});
}
services.REMethods=Object.freeze({...createRegistry(),createRegistry,evidence,levels,version:1});
})();
