/* One file entry; all edits remain with the established transactional owners. */
(()=>{
'use strict';
const services=window.Forge.services,store=services.ProjectStore,$=id=>document.getElementById(id),el=(tag,id,text)=>{const n=document.createElement(tag);if(id)n.id=id;if(text!==undefined)n.textContent=text;return n;};
let generation=0,busy=false,current=null,expected=null,signal=null;
let lastContext='',invalidated=false,disposeExtraction=null;
const open=el('button','projectGatewayOpen','Open ROM / project / ZIP'),file=el('input','projectGatewayFile');open.type='button';file.type='file';file.accept='.nes,.bin,.json,.zip';file.hidden=true;
$('areaLibraryOpen').before(open,file);open.onclick=()=>file.click();
const panel=el('details','projectGatewayPanel'),summary=el('summary',null,'Project intake'),status=el('p','projectGatewayStatus'),identity=el('p','projectGatewayIdentity'),scroll=el('div'),table=el('table','projectGatewayCapabilities'),actions=el('div','projectGatewayActions'),notes=el('p','projectGatewayNotes'),coverage=el('div','projectGatewayCoverage');
panel.hidden=true;status.setAttribute('role','status');scroll.className='gateway-scroll';scroll.appendChild(table);panel.append(summary,status,identity,scroll,coverage,actions,notes);$('sceneContext').before(panel);
const style=el('style');style.textContent='#projectGatewayPanel{flex:1 0 100%;width:100%;box-sizing:border-box;font:12px/1.5 system-ui;padding:8px 10px;border-top:1px solid var(--bdr);overflow-wrap:anywhere}#projectGatewayPanel[hidden]{display:none}#projectGatewayPanel summary{cursor:pointer;color:#a6e4d4}#projectGatewayPanel .gateway-scroll{max-height:260px;overflow:auto}#projectGatewayPanel table{border-collapse:collapse;width:100%;min-width:600px}#projectGatewayPanel td,#projectGatewayPanel th{text-align:left;vertical-align:top;border:1px solid var(--bdr);padding:6px}#projectGatewayActions{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}#projectGatewayActions button{min-height:44px;max-width:100%;white-space:normal}#projectGatewayIdentity{font-family:monospace;font-size:10px}';document.head.appendChild(style);
const guard=()=>({epoch:store.state.epoch,snapshot:store.serialize()});
function fresh(){
 if(!current||busy||invalidated)return false;
 try{const valid=expected?.epoch===store.state.epoch&&expected.snapshot===store.serialize();if(!valid)invalidated=true;return valid;}
 catch(_){invalidated=true;return false;}
}
function refreshContext(){
 if(!current||busy)return;
 const ready=fresh(),context=services.SourceContext.describe(current.source,{valid:ready,kind:current.kind==='project'?'project-file':'rom'});
 panel.dataset.sourceRole=context.role;summary.textContent=ready?'Project intake · inspected input':'Project intake · detached previous input';
 for(const button of actions.querySelectorAll('button'))button.disabled=!ready;
 identity.textContent=context.label+' · '+current.source.name+' · '+current.source.byteLength+' bytes · '+current.profile+' · SHA-256 '+current.source.sha256+'\n'+context.detail;
 const key=generation+':'+context.role;
 if(key!==lastContext){lastContext=key;if(!ready){panel.open=false;message('The active project or intake context changed. Previous capabilities are retained for reference. Open the input again before using its actions.');}}
 return context;
}
function check(){if(!current||busy)throw Error('Wait for intake to finish or open a file first.');if(!fresh())throw Error('The active project changed. Open the input again before continuing.');}
function message(text){status.textContent=text;}
function cachedFile(bytes,name){return {name,size:bytes.length,arrayBuffer:async()=>bytes.slice().buffer};}
function render(){
 if(disposeExtraction){disposeExtraction();disposeExtraction=null;}
 table.replaceChildren();actions.replaceChildren();coverage.replaceChildren();notes.textContent='';if(!current)return;
 identity.textContent=current.source.name+' · '+current.source.byteLength+' bytes · '+current.profile+' · SHA-256 '+current.source.sha256;
 const head=el('tr');for(const label of ['Resource','Inspect','Edit','Rebuild'])head.appendChild(el('th',null,label));table.appendChild(head);
 for(const row of current.rows){const tr=el('tr');for(const key of ['resource','inspect','edit','build'])tr.appendChild(el('td',null,row[key]));table.appendChild(tr);}
 for(const action of current.actions){const button=el('button','projectGateway-'+action.id,action.label);button.type='button';button.onclick=()=>route(action.id).catch(e=>message(e.message));actions.appendChild(button);}
 if(current.kind==='extraction'){
  const receipt=current,pack=services.ProjectGateway.extraction(receipt);
  coverage.append(el('p',null,'Source ROM SHA-256 from the report · '+receipt.declaredRomSha256));
  disposeExtraction=services.ExtractionPackUI.mount(coverage,pack,{
   isCurrent:()=>current===receipt,
   openProject:project=>{
    check();
    if(Forge15.dirty&&!confirm('Open the selected project? Save your current changes first to keep them.'))return false;
    check();store.load(project,{intent:'extraction-project'});expected=guard();invalidated=false;refreshContext();return true;
   }
  });
  notes.textContent=current.limitations.join(' ');refreshContext();return;
 }
 const record=services.RecoveryCoverage.match(current.source.sha256);
 coverage.dataset.matched=String(!!record);coverage.dataset.sourceSha256=current.source.sha256;
 coverage.append(el('strong',null,record?'Recorded extraction — '+record.title:'Extraction coverage — unlisted source'));
 coverage.append(el('p',null,record?record.integratedScope:'This exact source has no ledger entry. Use the capabilities discovered above to inspect available methods.'));
 if(record)coverage.append(el('p',null,'Remaining work — '+record.gaps.join(' · ')),el('p',null,'Next recorded task — '+record.nextWork));
 const show=el('button',null,'View extraction ledger');show.type='button';show.onclick=()=>services.ConnectedWorkspacePreview.open('coverage');
 coverage.append(show);
 notes.textContent=current.limitations.join(' ');refreshContext();
}
async function openFile(input){
 const own=++generation;if(signal)signal.aborted=true;signal={aborted:false};current=null;expected=guard();invalidated=false;busy=true;panel.hidden=false;panel.open=true;render();identity.textContent='';message('Checking source capabilities…');
 let autoRecovery=false;
 try{
  if(!input||!Number.isSafeInteger(input.size)||input.size<0||input.size>64*1024*1024)throw Error('Choose a file of at most 64 MiB.');
  const bytes=new Uint8Array(await input.arrayBuffer());if(own!==generation)return false;if(bytes.length!==input.size)throw Error('The input changed while reading. Open it again.');
  const result=await services.ProjectGateway.inspect(bytes,{name:input.name,signal});if(own!==generation)return false;
  current=result;render();
  // When exact bytes match an embedded, validated catalog, open its canonical
  // resources by default. This is the same ProjectStore transaction as the
  // existing manual action; it never applies unverified data to gameplay.
  autoRecovery=result.kind==='rom'&&result.actions.some(a=>a.id==='open-recovery');
  message(autoRecovery?'Recognized recovery catalog. Loading source-matched resources…':'Capabilities checked. Choose a tool.');
 }catch(e){if(own===generation){current=null;render();message(e.message);}return false;}
 finally{if(own===generation){busy=false;file.value='';refreshContext();}}
 if(autoRecovery&&own===generation){
  try{
   const loaded=await route('open-recovery');
   if(loaded!==true)return false; // user declined replacing unsaved work
   if(own!==generation)return false;
   // The established Resources explorer already owns all editor navigation.
   // Open it rather than offering a second, Castlevania-specific workspace.
   services.ResourceRelationshipPreview?.open?.();
  }catch(e){if(own!==generation)return false;message('Automatic recovery import failed: '+e.message+' · The manual import action remains available.');return false;}
 }
 return true;
}
async function route(id){
 check();if(!current.actions.some(a=>a.id===id))throw Error('This source does not support that action.');
 const receipt=current,own=generation,{bytes,project}=services.ProjectGateway.read(receipt),input=cachedFile(bytes,receipt.source.name),valid=()=>generation===own&&current===receipt;
 const verify=()=>{if(!valid())throw Error('The intake source changed. Choose the tool again.');check();};
 if(id==='open-recovery'){
  verify();const catalog=services.RecoveryCatalog?.info(receipt.source.sha256);
  if(!catalog)throw Error('No exact recovery catalog exists for these ROM bytes.');
  if(Forge15.dirty&&!confirm('Open source-matched recovered resources? Save your current project first to retain changes.'))return false;
  message('Validating source and preparing editable recovered resources…');
  const recovered=await services.RecoveryCatalog.project(receipt.source.sha256,bytes);verify();
  store.load(recovered,{intent:'source-matched-recovery'});
  // This transaction replaced the inspected document with the matching ROM's
  // recovered project. Later edits still invalidate the normal intake guard.
  if(!valid())return false;
  if(services.SourceContext.project()?.sha256===receipt.source.sha256){
   expected=guard();invalidated=false;refreshContext();
  }
  message('Recovered '+catalog.evidence.scenes+' Scenes, '+catalog.evidence.metasprites+' Metasprites, '+catalog.evidence.animations+' Animations from '+catalog.label+'. Resources also includes three Stage 01 courtyard background pages and 12 CHR uploads.'+(receipt.actions.some(a=>a.id==='audio')?' Open ROM Audio Library to audition a recovered cue.':''));
  return true;
 }
 if(id==='rom-project'){verify();const result=await services.InvestigationUI.preview({bytes,name:receipt.source.name,isCurrent:valid});verify();switchTab('disasm');services.SpatialREUI.show();document.getElementById('investigationWorkspace').scrollIntoView?.({block:'start'});return result;}
 if(id==='source'){
  verify();const loaded=services.SourceWorkspaceUI.openDocument(project);
  if(loaded){switchTab('code');services.SourceWorkspaceUI.show();message('6502 source workspace opened.');}return loaded;
 }
 if(id==='project'){
  if(Forge15.dirty&&!confirm('Open this Forge project? Save your current project first to retain its changes.'))return false;
  verify();store.load(project,{intent:'project-gateway-open'});expected=guard();invalidated=false;refreshContext();message('Forge project opened. Use Scene resources or Area library to follow its imported and authored references.');return true;
 }
 if(id==='native-world'){verify();return services.NativeWorldUI.openBytes(bytes,receipt.source.name,'z2:1:0',expected);}
 if(['analysis','methods','tiles'].includes(id)){
  switchTab('disasm');if(!await services.REAnalysisUI.openFile(input))throw Error('The source could not be opened for analysis.');verify();
  if(id==='methods')return services.RERecoveryMethodsUI.discover();
  if(id==='tiles'){
   const result=services.RENativeAssetsUI.preview();
   if(result){$('reAnalysisChrDetails').open=true;$('reNativeAssetsPanel').scrollIntoView?.({block:'start'});}
   return result;
  }
  return true;
 }
 if(id==='spatial'||id==='investigation'){
  switchTab('disasm');if(!await services.SpatialREUI.openFile(input))throw Error('The source catalog could not be opened.');verify();
  if(id==='investigation')return services.InvestigationUI.preview();return true;
 }
 if(id==='audio'){
  const audio=services.NativeAudioLibraryUI;
  const loaded=services.SourceContext.project()?.sha256===receipt.source.sha256
   ?await audio.useProjectSource():await audio.sourceLoaded(bytes,receipt.source.name,{isCurrent:()=>valid()&&fresh()});
  verify();if(!loaded)throw Error('The audio catalog could not be opened.');services.NativeAudioLibraryUI.open(true);switchTab('audio');return true;
 }
 if(id==='recovery'){switchTab('disasm');return services.REUI.analyzeFile(input);}
 throw Error('Unknown intake action.');
}
file.onchange=()=>{if(file.files[0])void openFile(file.files[0]);};
for(const type of ['keydown','keyup'])panel.addEventListener(type,e=>e.stopPropagation());
services.ProjectGatewayUI=Object.freeze({openFile,route,refresh:refreshContext,getState:()=>({busy,generation,ready:fresh(),hasInput:!!current,sourceRole:current?services.SourceContext.describe(current.source,{valid:fresh(),kind:current.kind==='project'?'project-file':'rom'}).role:'empty',sourceSha256:current?.source.sha256||null}),report:()=>current});
})();
