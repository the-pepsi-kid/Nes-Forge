/* One file entry; all edits remain with the established transactional owners. */
(()=>{
'use strict';
const services=window.Forge.services,store=services.ProjectStore,$=id=>document.getElementById(id),el=(tag,id,text)=>{const n=document.createElement(tag);if(id)n.id=id;if(text!==undefined)n.textContent=text;return n;};
let generation=0,busy=false,current=null,expected=null,signal=null;
let lastContext='',invalidated=false;
const open=el('button','projectGatewayOpen','Open ROM / project'),file=el('input','projectGatewayFile');open.type='button';file.type='file';file.accept='.nes,.bin,.json';file.hidden=true;
$('areaLibraryOpen').before(open,file);open.onclick=()=>file.click();
const panel=el('details','projectGatewayPanel'),summary=el('summary',null,'Project intake'),status=el('p','projectGatewayStatus'),identity=el('p','projectGatewayIdentity'),scroll=el('div'),table=el('table','projectGatewayCapabilities'),actions=el('div','projectGatewayActions'),notes=el('p','projectGatewayNotes');
panel.hidden=true;status.setAttribute('role','status');scroll.className='gateway-scroll';scroll.appendChild(table);panel.append(summary,status,identity,scroll,actions,notes);$('sceneContext').before(panel);
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
 table.replaceChildren();actions.replaceChildren();notes.textContent='';if(!current)return;
 identity.textContent=current.source.name+' · '+current.source.byteLength+' bytes · '+current.profile+' · SHA-256 '+current.source.sha256;
 const head=el('tr');for(const label of ['Resource','Inspect','Edit','Rebuild'])head.appendChild(el('th',null,label));table.appendChild(head);
 for(const row of current.rows){const tr=el('tr');for(const key of ['resource','inspect','edit','build'])tr.appendChild(el('td',null,row[key]));table.appendChild(tr);}
 for(const action of current.actions){const button=el('button','projectGateway-'+action.id,action.label);button.type='button';button.onclick=()=>route(action.id).catch(e=>message(e.message));actions.appendChild(button);}
 notes.textContent=current.limitations.join(' ');refreshContext();
}
async function openFile(input){
 const own=++generation;if(signal)signal.aborted=true;signal={aborted:false};current=null;expected=guard();invalidated=false;busy=true;panel.hidden=false;panel.open=true;render();identity.textContent='';message('Checking source capabilities…');
 try{
  if(!input||!Number.isSafeInteger(input.size)||input.size<0||input.size>64*1024*1024)throw Error('Choose a file of at most 64 MiB.');
  const bytes=new Uint8Array(await input.arrayBuffer());if(own!==generation)return false;if(bytes.length!==input.size)throw Error('The input changed while reading. Open it again.');
  const result=await services.ProjectGateway.inspect(bytes,{name:input.name,signal});if(own!==generation)return false;
  current=result;render();message('Capabilities checked. Choose a tool; importing remains a separate action.');return true;
 }catch(e){if(own===generation){current=null;render();message(e.message);}return false;}
 finally{if(own===generation){busy=false;file.value='';refreshContext();}}
}
async function route(id){
 check();if(!current.actions.some(a=>a.id===id))throw Error('This source does not support that action.');
 const receipt=current,own=generation,{bytes,project}=services.ProjectGateway.read(receipt),input=cachedFile(bytes,receipt.source.name),valid=()=>generation===own&&current===receipt;
 const verify=()=>{if(!valid())throw Error('The intake source changed. Choose the tool again.');check();};
 if(id==='rom-project'){verify();const result=await services.InvestigationUI.preview({bytes,name:receipt.source.name,isCurrent:valid});verify();switchTab('disasm');services.SpatialREUI.show();document.getElementById('investigationWorkspace').scrollIntoView?.({block:'start'});return result;}
 if(id==='project'){
  if(Forge15.dirty&&!confirm('Open this Forge project? Save your current project first to retain its changes.'))return false;
  verify();store.load(project,{intent:'project-gateway-open'});message('Forge project opened. Use Scene resources or Area library to follow its imported and authored references.');return true;
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
  const loaded=await services.NativeAudioLibraryUI.sourceLoaded(bytes,receipt.source.name,{isCurrent:()=>valid()&&fresh()});verify();if(!loaded)throw Error('The audio catalog could not be opened.');services.NativeAudioLibraryUI.open(true);switchTab('audio');return true;
 }
 if(id==='recovery'){switchTab('disasm');return services.REUI.analyzeFile(input);}
 throw Error('Unknown intake action.');
}
file.onchange=()=>{if(file.files[0])void openFile(file.files[0]);};
for(const type of ['keydown','keyup'])panel.addEventListener(type,e=>e.stopPropagation());
services.ProjectGatewayUI=Object.freeze({openFile,route,refresh:refreshContext,getState:()=>({busy,generation,ready:fresh(),hasInput:!!current,sourceRole:current?services.SourceContext.describe(current.source,{valid:fresh(),kind:current.kind==='project'?'project-file':'rom'}).role:'empty',sourceSha256:current?.source.sha256||null}),report:()=>current});
})();
