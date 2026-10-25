/* External score conversion stays detached until the existing Audio transaction
 * accepts it. A receipt retains the original UTF-8 export separately from the
 * schema-12 project, which stores only the converted editable score. */
(()=>{
'use strict';
const services=window.Forge.services,stages=new WeakSet(),copy=value=>JSON.parse(JSON.stringify(value));
const MAX_BYTES=1024*1024;
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
function integer(value,min,max,label){if(!Number.isSafeInteger(value)||value<min||value>max)throw Error(label+' must be an integer from '+min+' through '+max+'.');}
const canonical=value=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item);
function guard(){const store=services.ProjectStore;return {epoch:store.state.epoch,snapshot:store.serialize()};}
function check(item){const store=services.ProjectStore;if(item.project.epoch!==store.state.epoch||item.project.snapshot!==store.serialize())throw Error('The project changed after preview. Preview again before importing.');}
function validate(result,project){
 const imported=copy(result),p=JSON.parse(project.snapshot),patternOffset=p.patterns.length,instrumentOffset=p.instruments.length;
 if(!Array.isArray(imported.patterns)||!imported.patterns.length||!Array.isArray(imported.instruments)||!Array.isArray(imported.orderList)||!imported.orderList.length)throw Error('The import did not return a complete editable score.');
 if(imported.rows!==p.audRows)throw Error('Imported pattern size differs from the project.');
 integer(imported.rows,16,128,'Pattern rows');integer(imported.tempo,30,300,'Tempo');integer(imported.speed,1,15,'Speed');
 if(patternOffset+imported.patterns.length>256||instrumentOffset+imported.instruments.length>255||imported.orderList.length>255)throw Error('The imported score exceeds the available Audio capacity. Use a shorter song or a project with fewer records.');
 for(const pattern of imported.patterns){
  if(!Array.isArray(pattern.rows)||pattern.rows.length!==imported.rows)throw Error('Imported patterns have inconsistent row counts.');
  for(const row of pattern.rows){if(!Array.isArray(row)||row.length!==5)throw Error('Imported rows require five canonical channels.');for(const cell of row){
   integer(cell.note,-2,95,'Note');integer(cell.inst,-1,imported.instruments.length-1,'Instrument reference');integer(cell.vol,-1,15,'Volume');integer(cell.fx,0,255,'Effect');integer(cell.fxp,0,255,'Effect value');
   if(cell.inst>=0)cell.inst+=instrumentOffset;
  }}
 }
 const fields={patterns:p.patterns.concat(imported.patterns),instruments:p.instruments.concat(imported.instruments),tempo:imported.tempo,speed:imported.speed,
  orderList:imported.orderList.map(row=>{if(!Array.isArray(row)||row.length!==5)throw Error('Imported order rows require five pattern references.');return row.map(index=>{integer(index,0,imported.patterns.length-1,'Pattern reference');return index+patternOffset;});})};
 const next={...p,...fields},prepared=services.ProjectStore.prepareLoad(next);
 if(canonical(prepared.patterns.slice(patternOffset))!==canonical(imported.patterns)||canonical(prepared.instruments.slice(instrumentOffset))!==canonical(imported.instruments))throw Error('The imported score would change during project normalization. Import was refused.');
 const plan=services.AudioCompiler.plan({...next,audioRuntime:{...next.audioRuntime,enabled:true,musicEnabled:true}});
 return {...fields,patternOffset,instrumentOffset,patternCount:imported.patterns.length,instrumentCount:imported.instruments.length,estimatedBytes:plan.estimatedBytes};
}
async function stage(source,options={}){
 if(!source||typeof source.text!=='string'||typeof source.name!=='string'||!source.name||source.name.length>512)throw Error('Choose a named FamiStudio UTF-8 text export.');
 if(!options||typeof options!=='object'||Array.isArray(options)||Object.keys(options).some(key=>key!=='songIndex'))throw Error('Only a song selection is supported.');
 const text=source.text,name=source.name,bytes=new TextEncoder().encode(text);
 if(!bytes.length||bytes.length>MAX_BYTES)throw Error('FamiStudio text exports must be between 1 byte and 1 MiB.');
 const project=guard(),songIndex=options.songIndex??0;integer(songIndex,0,255,'Song index');
 const settings={songIndex,rows:JSON.parse(project.snapshot).audRows};
 if(!window.crypto?.subtle?.digest)throw Error('SHA-256 is unavailable in this browser context.');
 const hash=await window.crypto.subtle.digest('SHA-256',bytes),sha256=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
 const item={project,options:settings,source:{name,text,sha256,byteLength:bytes.length}};check(item);
 const result=window.FamiStudioText.preview(text,settings),data=validate(result,project);check(item);
 const value=freeze({...item,result:copy(result),data});stages.add(value);return value;
}
function commit(item){
 if(!stages.has(item))throw Error('Preview a supported import first.');check(item);
 const {patterns,instruments,orderList,tempo,speed}=item.data;
 const applied=services.ProjectStore.applyAudioImport({patterns,instruments,orderList,tempo,speed},{kind:'music',expected:item.project,intent:'audioToolImport'});
 stages.delete(item);return freeze({...item.data,warnings:applied.warnings});
}
function report(item,outcome='preview'){
 if(!item?.source||!item?.result||!['preview','imported'].includes(outcome))throw Error('A preview is required for an import receipt.');
 return copy({format:'NESForgeAudioImportReceipt',version:1,adapter:'famistudio-text-1',outcome,source:item.source,options:item.options,
  summary:{patterns:item.data.patternCount,instruments:item.data.instrumentCount,notes:item.result.noteCount,tempo:item.result.tempo,speed:item.result.speed},
  conversion:item.result.report,warnings:item.result.warnings,
  notice:'This receipt preserves the original UTF-8 text export and a historical conversion report. Save Project As separately preserves the editable Forge score. The source text is not embedded in the Forge project. This is not an original FamiStudio binary project, current-project proof, or audio equivalence evidence.'});
}
services.AudioToolImport=Object.freeze({version:1,maxBytes:MAX_BYTES,stage,commit,report});
})();
