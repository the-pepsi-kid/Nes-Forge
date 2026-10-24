/* NES FORGE CONNECTION: src/services/project-gateway.js
 * Shared Open ROM / project gateway. Preserve this entry path when adding adapters;
 * direct service.create tests alone do not establish that the user import path works.
 */
/* Capability discovery is a view over existing adapters. It owns no editable
 * assets and never treats a recognized container as a recovered game engine. */
(()=>{
'use strict';
const services=window.Forge.services, sessions=new WeakMap();
const cp=v=>JSON.parse(JSON.stringify(v)),freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const fail=m=>{throw Error('Project intake: '+m);};
async function inspect(input,{name='ROM',signal}={}){
 if(!(input instanceof Uint8Array))fail('Expected file bytes.');
 if(input.length>64*1024*1024)fail('File exceeds the 64 MiB intake limit.');
 const bytes=input.slice(),label=String(name).slice(0,512);
 const cancelled=()=>{if(signal?.aborted){const e=Error('Intake cancelled.');e.name='AbortError';throw e;}};
 cancelled();
 if(/\.json$/i.test(label)){
  const project=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  if(project.format!=='NESForge')fail('Choose a Forge project JSON, not an inspection report or recipe.');
  services.ProjectStore.prepareLoad(project);cancelled();
  const native=project.nativeGame,scope=native?services.NativeEngineProject.capabilities(native.profile).buildScope:'Forge runtime; build validation checks the current project.';
  const report=freeze({format:'NESForgeProjectIntake',version:1,kind:'project',source:{name:label,sha256:window.NativeEngineFormat.sha256(bytes),byteLength:bytes.length},profile:native?.profile||'forge-project',
   rows:[{resource:'Project',inspect:'Saved canonical assets',edit:'Open the project to edit',build:scope}],actions:[{id:'project',label:'Open Forge project'}],limitations:[native?'Native output remains restricted to the saved source adapter.':'Forge output uses the authored runtime, not another game’s engine.']});
  sessions.set(report,{bytes,project:cp(project)});return report;
 }
 const analysis=await services.REAnalysis.open(bytes,{name:label});cancelled();
 const source=analysis.report.identity,header=analysis.report.header,known=window.GameRENative.profiles.find(p=>p.sha256===source.sha256),audio=services.NativeAudioCatalog.profiles.find(p=>p.sha256===source.sha256);
 const recoveredResource=services.NativeResourceProject?.recognizes(bytes);
 const recoveredLayout=services.NativeLayoutProject?.recognizes(bytes),terrain=window.ZeldaOverworld.recognizes(bytes),valid=header.status==='valid';
 let portable=false,portableContainer=null;try{portableContainer=services.ROMProject.container(bytes);portable=bytes.length<=services.ROMProject.maxBytes;}catch(_){}
 // A strict general container parser may leave legacy headers as raw bytes.
 // Specific methods still run their own bounded recognition contracts.
 const discovery=await services.REMethods.discover(analysis,{signal});cancelled();
 const supported=discovery.results.filter(r=>r.status==='supported'),domains=d=>supported.filter(r=>r.method.domains.includes(d)),physical=!!analysis.report.layout.chr;
 let recovered=false;
 if(valid){try{await services.REBridge.analyze(bytes,label);recovered=true;}catch(e){if(e.name==='AbortError')throw e;}}
 cancelled();
 const scenes=supported.some(r=>r.method.sceneConversion);
 const legacyPhysical=!physical&&!!portableContainer?.layout.chr;
 const rows=[
  {resource:'ROM project',inspect:portable?'Preserved source and bounded physical container evidence':'No supported portable container',edit:portable?'Prepare a project; copy physical CHR when present; unknown engine resources stay unresolved':'General inspection remains available',build:portable?'Preserved source; further edits require a declared native adapter. Emulation depends on mapper support':'No source output'},
  {resource:'CHR',inspect:physical?analysis.report.chr.tileCount+' physical ROM tiles':legacyPhysical?portableContainer.layout.chr.length/16+' physical tiles via ROM project; legacy header warning':'Runtime CHR RAM or unknown layout',edit:physical?'Editable tile sheet; raw CHR export':legacyPhysical?'Prepare ROM project for editable physical sheets':'A verified decoder or runtime capture is required',build:'No generic patch to the source ROM'},
  {resource:'Scenes / maps',inspect:recoveredResource?'Verified native resource catalog; source layouts, graphics and static palette states':recoveredLayout?'Area 1 side-view screen table: 20 native layouts, initial background bank and palette':known?'Investigated source catalog':scenes?'A static recovery method is available':'No verified scene layout',edit:recoveredResource?'Open pages through Area library; edit existing native blocks or structures':recoveredLayout?'Native screen blocks brush; other domains pending':recovered?'Recovered Forge room':known?'Import selected resources as editable copies':scenes?'Preview the declared static conversion':'Unresolved',build:recoveredResource?'Original engine: supported block or structure substitutions within source record capacity':recoveredLayout?'Original engine: existing block substitutions only':recovered?'Forge adaptation; original engine is not rebuilt':'Only the selected adapter’s declared scope'},
  {resource:'World / terrain',inspect:terrain?'Verified Zelda II overworld layout':'No verified native World layout',edit:terrain?'Native terrain and location fields':'Imported or authored Worlds only',build:terrain?'Original engine; bounded terrain and location writer':'No generic World encoder'},
  {resource:'Actors / behavior',inspect:known?'Catalog records with explicit gaps':'No verified actor model',edit:known?'Imported poses and scene entities; behavior gaps remain':'Author actors in the Forge project',build:'No generic source actor or AI encoder'},
  {resource:'Audio',inspect:audio?'Verified native cue catalog':domains('audio').length?'A source audio recovery method is available':'Driver unresolved',edit:audio||domains('audio').length?'Explicit preview and conversion to project Audio':'Author project Audio or investigate the source',build:'Project-wide score; no generic source audio writer'},
  {resource:'Code / bytes',inspect:valid?'Physical bytes and candidate 2A03 disassembly':'Raw bytes; platform and mapping unknown',edit:'Inspection annotations or a separate source workspace',build:'Disassembly is not a rebuildable source project'}
 ];
 const actions=[{id:'analysis',label:'Inspect bytes / CHR'},{id:'methods',label:'Discover recovery tools'}];
 if(portable)actions.push({id:'rom-project',label:recoveredResource?'Prepare recovered resources (partial)':recoveredLayout?'Prepare recovered layouts (partial)':'Prepare ROM project'});
 if(physical)actions.push({id:'tiles',label:'Preview editable CHR copy'});
 if(known)actions.push({id:'spatial',label:'Inspect source areas / actors'});
 if(['zelda2-us','ninja-gaiden-us'].includes(known?.id))actions.push({id:'investigation',label:'Prepare investigated project'});
 if(terrain)actions.push({id:'native-world',label:'Open editable native overworld'});
 if(audio)actions.push({id:'audio',label:'Open source Audio catalog'});
 if(recovered)actions.push({id:'recovery',label:'Preview recovered Forge room'});
 const report=freeze({format:'NESForgeProjectIntake',version:1,kind:'rom',source:{name:label,sha256:source.sha256,byteLength:bytes.length},container:cp(header),profile:recoveredResource?.id||recoveredLayout?.id||known?.id||(terrain?'zelda2-compatible-terrain':'unrecognized'),rows,actions,
  methods:discovery.results.map(r=>({id:r.method.id,status:r.status,reason:r.reason})),limitations:['Recognition, editable conversion and original-engine output are separate capabilities. A ROM project preserves source bytes and physical resources; game-specific decoding is optional.','Area selection follows imported or authored resource references. Missing resources stay unresolved; Audio remains project-wide unless verified source event evidence is available.']});
 sessions.set(report,{bytes,analysis});return report;
}
function read(report){const session=sessions.get(report);if(!session)fail('Inspect this file again; the intake receipt is not current.');return {bytes:session.bytes.slice(),project:session.project?cp(session.project):null};}
services.ProjectGateway=Object.freeze({version:1,inspect,read});
})();
