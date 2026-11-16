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
 let archivedProject=null,archiveKind=null;
 if(/\.zip$/i.test(label)||(bytes[0]===0x50&&bytes[1]===0x4b&&bytes[2]===3&&bytes[3]===4)){
  const pack=await services.ExtractionPack.open(bytes);cancelled();
  if(pack.kind==='extraction'){
   const titles={map:'Maps',room:'Room evidence',resource:'Native background layouts',capture:'Observed runtime screens',collision:'Exported collision references',pose:'Sprite pose fragments',catalog:'Actor / pose / script / location / RAM catalogs',project:'Scene / room projects',animationProject:'Animation projects',nativeProject:'Native resource project',audioProject:'Audio projects',audioReport:'Audio reports'};
   const report=freeze({format:'NESForgeProjectIntake',version:1,kind:'extraction',source:{name:label,sha256:window.NativeEngineFormat.sha256(bytes),byteLength:bytes.length},
    profile:String(pack.report.game||'Native extraction'),declaredRomSha256:pack.report.rom.sha256,
    rows:Object.entries(pack.files).filter(([,paths])=>paths.length).map(([kind,paths])=>{
     const editable=['project','animationProject','nativeProject','audioProject'].includes(kind);
     return {resource:titles[kind],inspect:paths.length+' entries',edit:editable?'Open a selected Forge project':'Read-only evidence',build:kind==='nativeProject'?'Use the selected project’s registered native adapter':editable?'Use the selected project’s authored build settings':'No native writer declared'};
    }),actions:[],limitations:[pack.report.format==='NESForgeAudioCapture'?'Observed runtime capture: the supplied scenes and finite audio transcription are editable authoring copies. This archive does not establish a native level decoder or original-engine writer.':'The ROM fingerprint is declared by the extraction report. Map and room previews carry the scopes recorded in the pack.','Collision references retain the exporter’s classes and limits. They are not automatically applied to native project physics.','Pose fragments and source catalogs are read-only evidence. Supplied animation projects open through the normal project loader.',...(Array.isArray(pack.report.problems)?pack.report.problems:[]).filter(p=>typeof p==='string').slice(0,100).map(p=>'Exported gap: '+p)]});
   sessions.set(report,{bytes,pack});return report;
  }
  archivedProject=pack.project;archiveKind=pack.kind;
 }
 if(archivedProject||/\.json$/i.test(label)){
  const project=archivedProject||JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  if(archiveKind==='source'||project.format===services.SourceWorkspace.format){
   if(!archiveKind&&bytes.length>12*1024*1024)fail('Source workspace JSON exceeds 12 MiB.');
   const workspace=services.SourceWorkspace.validate(project);cancelled();
   const report=freeze({format:'NESForgeProjectIntake',version:1,kind:'source',source:{name:label,sha256:window.NativeEngineFormat.sha256(bytes),byteLength:bytes.length},
    profile:workspace.dialect,rows:[{resource:'6502 source',inspect:workspace.files.length+' files',edit:'Open source workspace',build:'Assemble from the saved entry and cartridge settings'}],
    actions:[{id:'source',label:'Open source workspace'}],limitations:['The workspace has its own files and export controls. The active game project stays available.']});
   sessions.set(report,{bytes,project:workspace});return report;
  }
  if(project.format!=='NESForge')fail('Choose a Forge project JSON, not an inspection report or recipe.');
  services.ProjectStore.prepareLoad(project);cancelled();
  const native=project.nativeGame,scope=native?services.NativeEngineProject.capabilities(native.profile).buildScope:'Forge runtime; build validation checks the current project.';
  const report=freeze({format:'NESForgeProjectIntake',version:1,kind:'project',source:{name:label,sha256:window.NativeEngineFormat.sha256(bytes),byteLength:bytes.length},profile:archiveKind==='tiles'?'chr-tile-pack':native?.profile||'forge-project',
   rows:[{resource:'Project',inspect:'Saved canonical assets',edit:'Open the project to edit',build:scope}],actions:[{id:'project',label:'Open Forge project'}],limitations:[native?'Native output remains restricted to the saved source adapter.':'Forge output uses the authored runtime, not another game’s engine.']});
  sessions.set(report,{bytes,project:cp(project)});return report;
 }
 // Known recovered source: match by exact bytes BEFORE expensive generic RE discovery.
 // Exact-match resources are automatically prepared in the gateway UI; other ROMs use normal discovery.
 const match=services.RecoveryCatalog?.info(window.NativeEngineFormat.sha256(bytes));
 if(match){
  cancelled();
  const apu=services.RecoveryAPUSourceCatalog?.info(match.sha256);
  const audioCatalog=await services.NativeAudioCatalog.inspect(bytes);cancelled();
  const nativeAudio=audioCatalog.status==='decoded';
  const trace=apu?apu.apuWrites+' original APU writes attributed to '+apu.siteCount+' executed CPU instruction sites':match.evidence.apuWrites+' observed APU register writes';
  const report=freeze({format:'NESForgeProjectIntake',version:1,kind:'rom',
   source:{name:label,sha256:match.sha256,byteLength:bytes.length},profile:match.profile,
   rows:[
    {resource:'Source revision',inspect:match.label+' · exact SHA-256 match · Mapper 2 (UxROM)',edit:'Source stays in your local browser/project',build:'Original ROM writeback is not supported'},
    {resource:'Scenes / graphics',inspect:match.evidence.scenes+' pixel-verified runtime captures with source links',edit:'Open Scene / CHR using Resources explorer',build:'Forge authored output only; not native stage rebuild'},
    {resource:'Metasprites / animations',inspect:match.evidence.metasprites+' editable pose frames · '+match.evidence.animations+' Animation entries',edit:'Open Metasprites / Animation using Resources explorer',build:'Animation evidence is partial; original sequence logic remains unresolved'},
    {resource:'Audio',inspect:nativeAudio?audioCatalog.cues.filter(c=>c.kind!=='control').length+' sound requests. '+trace:trace,edit:nativeAudio?'Audition a cue or import a finite excerpt into the tracker':'Inspect the recorded APU events',build:'Tracker edits save in the Forge project. Native ROM audio writeback is unavailable.'},
    {resource:'World / collision / enemies',inspect:'Not source-reconstructed',edit:'No native editable world or actor behaviors yet',build:'No original engine writer'}],
   actions:[{id:'open-recovery',label:'Open source-matched recovered resources'},...(nativeAudio?[{id:'audio',label:'Open ROM Audio Library'}]:[]),{id:'analysis',label:'Run deeper ROM analysis'},{id:'methods',label:'Discover recovery methods'}],
   limitations:['The catalog contains only recovered, source-matched resources. Native stage geometry, AI, collision and original score writeback remain open.','Recovered resources load directly on Open ROM; a manual action is available if automatic loading is declined. Original ROM bytes remain local; exporting the project will include the ROM and should not be shared publicly.']});
  sessions.set(report,{bytes});return report;
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
 const catalog=services.RecoveryCatalog?.info(source.sha256)||null;
 const rows=[
  {resource:'ROM project',inspect:portable?'Preserved source and bounded physical container evidence':'No supported portable container',edit:portable?'Prepare a project; copy physical CHR when present; unknown engine resources stay unresolved':'General inspection remains available',build:portable?'Preserved source; further edits require a declared native adapter. Emulation depends on mapper support':'No source output'},
  {resource:'CHR',inspect:catalog?'12 native CHR-RAM upload lists and 26 source transfers':physical?analysis.report.chr.tileCount+' physical ROM tiles':legacyPhysical?portableContainer.layout.chr.length/16+' physical tiles via ROM project; legacy header warning':'Runtime CHR RAM or unknown layout',edit:catalog?'Open an editable pattern table in Resources or export the original transfer':physical?'Editable tile sheet; raw CHR export':legacyPhysical?'Prepare ROM project for editable physical sheets':'A verified decoder or runtime capture is required',build:'No generic patch to the source ROM'},
  {resource:'Scenes / maps',inspect:catalog?'Three original Stage 01 courtyard background pages':recoveredResource?'Verified native resource catalog; source layouts, graphics and static palette states':recoveredLayout?'Area 1 side-view screen table: 20 native layouts, initial background bank and palette':known?'Investigated source catalog':scenes?'A static recovery method is available':'No verified scene layout',edit:catalog?'Open a courtyard page in Scene or export its placed metatile data':recoveredResource?'Open pages through Area library; edit existing native blocks or structures':recoveredLayout?'Native screen blocks brush; other domains pending':recovered?'Recovered Forge room':known?'Import selected resources as editable copies':scenes?'Preview the declared static conversion':'Unresolved',build:recoveredResource?'Original engine: supported block or structure substitutions within source record capacity':recoveredLayout?'Original engine: existing block substitutions only':recovered?'Forge adaptation; original engine is not rebuilt':'Only the selected adapter’s declared scope'},
  {resource:'World / terrain',inspect:terrain?'Verified Zelda II overworld layout':'No verified native World layout',edit:terrain?'Native terrain and location fields':'Imported or authored Worlds only',build:terrain?'Original engine; bounded terrain and location writer':'No generic World encoder'},
  {resource:'Actors / behavior',inspect:known?'Catalog records with explicit gaps':'No verified actor model',edit:known?'Imported poses and scene entities; behavior gaps remain':'Author actors in the Forge project',build:'No generic source actor or AI encoder'},
  {resource:'Audio',inspect:audio?'Verified native cue catalog':domains('audio').length?'A source audio recovery method is available':'Driver unresolved',edit:audio||domains('audio').length?'Explicit preview and conversion to project Audio':'Author project Audio or investigate the source',build:'Project-wide score; no generic source audio writer'},
  {resource:'Code / bytes',inspect:valid?'Physical bytes and candidate 2A03 disassembly':'Raw bytes; platform and mapping unknown',edit:'Inspection annotations or a separate source workspace',build:'Disassembly is not a rebuildable source project'}
 ];
 if(catalog){rows.unshift({resource:'Recovered Forge resources',inspect:catalog.evidence.scenes+' original-frame Scenes · '+catalog.evidence.metasprites+' editable metasprites · '+catalog.evidence.animations+' animations, courtyard pages, CHR uploads and native audio cues',edit:'Open linked Scenes, Sprite/Metasprite and Animation tabs via Resources explorer',build:'Authored project editing only; original Castlevania ROM patch/rebuild is NOT supported.'});}
 const ledger=services.RecoveryCoverage?.match(source.sha256);
 if(ledger)rows.unshift({resource:'Recorded cartridge revision',inspect:ledger.name+' · exact SHA-256',edit:'See the extraction ledger for the recorded domains. Open a matching extraction ZIP to browse its maps.',build:'Use the writers offered for this input.'});
 const actions=[{id:'analysis',label:'Inspect bytes / CHR'},{id:'methods',label:'Discover recovery tools'}];
 if(catalog)actions.unshift({id:'open-recovery',label:'Open source-matched recovered resources'});
 if(portable)actions.push({id:'rom-project',label:recoveredResource?'Prepare recovered resources (partial)':recoveredLayout?'Prepare recovered layouts (partial)':'Prepare ROM project'});
 if(physical)actions.push({id:'tiles',label:'Preview editable CHR copy'});
 if(known)actions.push({id:'spatial',label:'Inspect source areas / actors'});
 if(['zelda2-us','ninja-gaiden-us'].includes(known?.id))actions.push({id:'investigation',label:'Prepare investigated project'});
 if(terrain)actions.push({id:'native-world',label:'Open editable native overworld'});
 if(audio)actions.push({id:'audio',label:'Open source Audio catalog'});
 if(recovered)actions.push({id:'recovery',label:'Preview recovered Forge room'});
 const report=freeze({format:'NESForgeProjectIntake',version:1,kind:'rom',source:{name:label,sha256:source.sha256,byteLength:bytes.length},container:cp(header),profile:catalog?.profile||recoveredResource?.id||recoveredLayout?.id||known?.id||(terrain?'zelda2-compatible-terrain':ledger?ledger.title+' · recorded revision':'unrecognized'),rows,actions,
  methods:discovery.results.map(r=>({id:r.method.id,status:r.status,reason:r.reason})),limitations:['Recognition, editable conversion and original-engine output are separate capabilities. A ROM project preserves source bytes and physical resources; game-specific decoding is optional.','Area selection follows imported or authored resource references. Missing resources stay unresolved; Audio remains project-wide unless verified source event evidence is available.']});
 sessions.set(report,{bytes,analysis});return report;
}
function read(report){const session=sessions.get(report);if(!session)fail('Inspect this file again; the intake receipt is not current.');return {bytes:session.bytes.slice(),project:session.project?cp(session.project):null};}
function extraction(report){
 const pack=sessions.get(report)?.pack;
 if(!pack)fail('Open an extraction ZIP first.');
 return pack;
}
services.ProjectGateway=Object.freeze({version:2,inspect,read,extraction});
})();
