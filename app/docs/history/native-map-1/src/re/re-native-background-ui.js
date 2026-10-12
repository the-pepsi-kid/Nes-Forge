/* One scene-conversion panel shares source/project guards, cancellation,
 * evidence, import and Save As. Background element IDs and API stay stable. */
(()=>{
'use strict';
const services=window.Forge.services,copy=value=>JSON.parse(JSON.stringify(value));
let c=null,busy=false,operation=0,signal=null,staged=null,imported=false,listed=null;
const make=(tag,id,text)=>{const el=document.createElement(tag);if(id)el.id=id;if(text!==undefined)el.textContent=text;return el;};
const methods=()=>services.REMethods?.profiles().filter(method=>['background','map'].includes(method.sceneConversion)&&method.operations?.convert)||[];
function presentation(methodId=c?.method.value){
 const map=methods().find(method=>method.id===methodId)?.sceneConversion==='map';
 return map?{kind:'map',api:services.RENativeMap,noun:'map',title:'Native map and collision recovery',backend:'single-room',preview:'Preview map',project:'playable map project',summary:'This is a static solid/empty map adaptation. Native commands and collision are recovered for the declared region; the separate playable project uses an authored validation player and Forge movement. It does not recreate the original actors, physics, scrolling, audio or game engine. Import adds an excluded editable scene.',acknowledge:'I understand this map conversion uses only the declared solid/empty subset, with an authored validation player in the separate project and the limitations shown below.',build:'Independent playable map build'}:
 {kind:'background',api:services.RENativeBackground,noun:'background',title:'Native background recovery',backend:'packed',preview:'Preview background',project:'independent static background project',summary:'This is a static background adaptation. It does not restore original gameplay, scrolling, collision, sprites, audio or the original engine. Import adds an excluded editable scene; the separate downloaded project includes this background in a static viewer build.',acknowledge:'I understand this is a static background conversion with the limitations and unknowns shown below.',build:'Independent static viewer build'};
}
function message(text,error=false){if(c){c.status.textContent=text;c.status.style.color=error?'var(--err, #ff9898)':'var(--dim)';}}
function source(){
 const api=services.REAnalysisUI,state=api?.getState(),analysis=api?.currentAnalysis();
 if(state?.busy)throw Error('Wait for the selected source to finish opening.');
 if(state?.pendingSelection)throw Error('The source selection changed. Choose Open for analysis before previewing its scene.');
 if(!analysis)throw Error('Open a ROM for general analysis first.');
 return {analysis,generation:state.generation,identity:analysis.report.identity};
}
function current(item){try{const now=source();return !!item&&now.analysis===item.source.analysis&&now.generation===item.source.generation&&item.methodId===c.method.value&&(!Object.hasOwn(item,'resourceKey')||item.resourceKey===c.resource.value);}catch(_){return false;}}
function projectGuard(){const store=services.ProjectStore;return {epoch:store.state.epoch,snapshot:store.serialize()};}
function check(item,project=true){
 if(!current(item))throw Error('The inspected source, recovery method or selected map changed. Preview again.');
 if(project){const now=projectGuard();if(item.project.epoch!==now.epoch||item.project.snapshot!==now.snapshot)throw Error('The project changed after preview. Preview again before importing.');}
}
function selectedResource(){return listed&&current(listed)?listed.resources.find(item=>item.key===c.resource.value):null;}
function refreshPresentation(){
 if(!c)return;const p=presentation();c.panel.setAttribute('aria-label',p.title);c.title.textContent=p.title;c.preview.textContent=p.preview;
 c.introduction.textContent=p.kind==='map'?'Decode native maps, choose a supported solid/empty region, and review its source records and collision before adding a scene or downloading a separate playable Forge project.':'Decode a supported native background, review the static adaptation, and choose whether to add an editable scene or download an independent Forge viewer project. The original ROM engine is not recovered or played.';
 c.methodText.textContent=p.kind==='map'?'Scene recovery method':'Background recovery method';c.acknowledgeText.textContent=p.acknowledge;
 c.project.textContent='Download '+p.noun+' project';c.evidence.textContent='Download '+p.noun+' evidence';c.resources.hidden=p.kind!=='map';
}
function enable(){
 if(!c)return;const p=presentation(),resource=selectedResource();c.method.disabled=busy;c.preview.disabled=busy||!c.method.value||(p.kind==='map'&&!resource?.supported);c.cancel.disabled=!busy;
 c.find.disabled=busy;c.resource.disabled=busy||!listed;c.resourceReason.textContent=resource?.reason||'';
 c.acknowledge.disabled=busy||!staged||imported;c.import.disabled=busy||!staged||imported||!c.acknowledge.checked;
 c.project.disabled=busy||!staged;c.evidence.disabled=busy||!staged;
}
function clear(){staged=null;imported=false;if(c){c.acknowledge.checked=false;c.summary.textContent='';c.detail.textContent='';c.canvas.replaceChildren();c.canvas.hidden=true;}enable();}
function clearResources(){listed=null;if(c){c.resource.replaceChildren();c.resource.value='';c.resourceReason.textContent='';}enable();}
function cancel(announce=true){
 const was=busy;operation++;if(signal)signal.aborted=true;signal=null;busy=false;clear();
 if(announce)message(was?'Scene preview cancelled. No scene was imported.':'Scene preview cleared.');return was;
}
function sourceChanged(){cancel(false);clearResources();message('The selected source changed. Open it for analysis, then preview its scene again.');}
function selectMethod(methodId){
 try{if(!methods().some(method=>method.id===methodId))throw Error('This scene recovery method is unavailable.');if(c.method.value===methodId)return true;cancel(false);clearResources();c.method.value=methodId;refreshPresentation();enable();message('Recovery method selected. '+(presentation().kind==='map'?'Choose Find maps, select a supported region, then Preview map.':'Choose Preview background to inspect its conversion; nothing has been imported.'));return true;}
 catch(error){message(error.message||String(error),true);return false;}
}
async function findResources(){
 if(busy)return false;cancel(false);clearResources();const id=++operation,ownSignal={aborted:false};signal=ownSignal;busy=true;enable();
 try{
  const p=presentation(),methodId=c.method.value;if(p.kind!=='map'||!p.api?.listResources)throw Error('Native map inspection is unavailable in this build.');
  const item={source:source(),methodId};message('Decoding native map records and checking the supported collision subset…');
  const resources=await p.api.listResources(item.source.analysis,methodId,{signal:ownSignal});if(id!==operation||ownSignal.aborted)return false;check(item,false);
  if(!Array.isArray(resources)||resources.length>256||new Set(resources.map(value=>value?.key)).size!==resources.length||resources.some(value=>!value||typeof value.key!=='string'||!value.key||value.key.length>160||typeof value.label!=='string'||value.label.length>200||typeof value.supported!=='boolean'||typeof value.reason!=='string'||value.reason.length>2000))throw Error('Map inspection returned an invalid bounded resource list.');
  listed={...item,resources:copy(resources)};for(const resource of resources){const option=make('option',null,resource.label+(resource.supported?'':' — unsupported conversion'));option.value=resource.key;c.resource.appendChild(option);}c.resource.value=(resources.find(value=>value.supported)||resources[0])?.key||'';
  enable();message(resources.length?'Found '+resources.length+' native maps. Choose a region and review its conversion limits, then Preview map. Maps with unsupported native semantics remain listed with their refusal reasons.':'No native maps were found.');return true;
 }catch(error){if(id===operation){clearResources();message(error.name==='AbortError'?'Map inspection cancelled. No scene was imported.':error.message||String(error),error.name!=='AbortError');}return false;}
 finally{if(id===operation){busy=false;signal=null;enable();}}
}
function lines(values){return (Array.isArray(values)?values:values===undefined?[]:[values]).map(value=>typeof value==='string'?value:JSON.stringify(value));}
function describe(result,p){
 const report=result.report,build=result.previewBuild;
 c.summary.textContent=[String(report.source.name||'ROM'),'Original file SHA-256 '+report.source.sha256,report.source.byteLength+' source bytes',
 'Method: '+(report.method.name||report.method.id)+' · '+report.method.id+' · version '+report.method.version,
 'Recovered scene: '+report.sceneId,...(p.kind==='map'?['Native region and collision:',...lines(report.region),...lines(report.collision),...lines(report.adaptation)]:[]),'Limitations:',...lines(report.limitations),'Unknown or omitted:',...lines(report.unknown),
 'Construction:',...lines(report.construction),p.build+': '+build.backend+' · '+build.byteLength+' bytes · SHA-256 '+build.sha256,p.summary].join('\n');
 c.detail.textContent=JSON.stringify(report,null,2);c.canvas.replaceChildren();
 const thumbnail=renderSceneThumb(result.scene,256,240);thumbnail.setAttribute('aria-label',p.kind==='map'?'Detached recovered map preview':'Detached recovered static background preview');thumbnail.style.cssText='width:100%;max-width:256px;height:auto;image-rendering:pixelated';c.canvas.appendChild(thumbnail);c.canvas.hidden=false;
}
async function preview(){
 if(busy)return false;clear();const id=++operation,ownSignal={aborted:false};signal=ownSignal;busy=true;enable();
 try{
  const methodId=c.method.value,p=presentation(methodId),api=p.api;if(!api?.stage)throw Error('Native '+p.noun+' recovery is unavailable in this build.');
  if(!methods().some(method=>method.id===methodId))throw Error('Choose an available scene recovery method.');
  const item={source:source(),project:projectGuard(),methodId,kind:p.kind};let options={};
  if(p.kind==='map'){const resource=selectedResource();if(!resource)throw Error('Choose Find maps and select a native map before previewing.');if(!resource.supported)throw Error('This map cannot be converted: '+resource.reason);item.resourceKey=resource.key;options={resourceKey:resource.key,expectedSourceSha256:item.source.identity.sha256};}
  message('Decoding the selected native '+p.noun+' and compiling an independent '+(p.kind==='map'?'playable map':'static viewer')+'…');
  const result=await api.stage(item.source.analysis,methodId,options,{signal:ownSignal});
  if(id!==operation||ownSignal.aborted)return false;check(item);
  if(!result?.report||!result.scene||!result.project)throw Error('Recovery did not return an editable scene and independent project.');
  const report=api.validateRecovery(result.report);
  if(report.source.sha256!==item.source.identity.sha256||report.source.byteLength!==item.source.identity.byteLength||report.method.id!==methodId)throw Error('Scene recovery returned a different source or method identity.');
  if(p.kind==='map'&&report.resourceKey!==item.resourceKey)throw Error('Map recovery returned a different selected native resource.');
  const build=result.previewBuild;if(build?.backend!==p.backend||!Number.isSafeInteger(build.byteLength)||build.byteLength<1||!/^[a-f0-9]{64}$/.test(build.sha256||''))throw Error('The '+p.noun+' has not passed an independent '+(p.kind==='map'?'playable map':'static viewer')+' build.');
  describe(result,p);staged={...item,result};enable();message('Preview ready. Review the source evidence, construction and unknowns below. Acknowledge the '+(p.kind==='map'?'map adaptation':'static conversion')+' before adding this '+p.noun+' as a new scene. The current project and emulator are unchanged.');return true;
 }catch(error){if(id===operation){clear();message(error.name==='AbortError'?'Scene preview cancelled. No scene was imported.':error.message||String(error),error.name!=='AbortError');}return false;}
 finally{if(id===operation){busy=false;signal=null;enable();}}
}
async function importScene(){
 if(busy)return false;const item=staged,p=presentation();
 try{
  if(!item||imported){message('Preview a supported '+p.noun+' before importing.',true);return false;}
  if(!c.acknowledge.checked){message('Acknowledge that this is a '+(p.kind==='map'?'map adaptation':'static background conversion')+' before importing.',true);return false;}
  check(item);busy=true;enable();
  // The shared model owns stage identity, allocation, one Undo entry and append.
  // Never load the independent playable/viewer project into the active editor.
  const result=p.api.importStaged(item.result);imported=true;c.acknowledge.checked=false;const warnings=lines(result.warnings);
  message('Added the '+p.noun+' as a new editable scene, excluded from ROM builds. Existing scenes and runtime settings are preserved. One Undo removes this import.'+(warnings.length?' '+warnings.join('; '):''),!!warnings.length);return result;
 }catch(error){if(item&&staged===item){staged=null;imported=false;c.acknowledge.checked=false;}message(error.message||String(error),true);return false;}
 finally{busy=false;enable();}
}
async function download(kind){
 let item;
 try{
  const p=presentation();if(busy)throw Error('Wait for the scene operation to finish.');item=staged;if(!item)throw Error('Preview a supported '+p.noun+' before downloading.');check(item,false);
  const report=p.api.validateRecovery(item.result.report),base=String(report.source.name||'ROM').replace(/\.[^.]*$/,'').replace(/[^a-z0-9._-]/gi,'_').slice(0,70)||'ROM',name=base+'-'+p.noun+(kind==='project'?'.nesforge.json':'-evidence.json');
  const value=kind==='project'?item.result.project:report,saved=await forgeSave.request(new TextEncoder().encode(JSON.stringify(value,null,2)),name,'application/json');
  if(staged===item&&current(item)){
   const label=kind==='project'?p.project:p.noun+' recovery evidence';
   if(saved?.status==='saved')message('Saved '+label+': '+name);
   else if(saved?.status==='download-requested')message('Download requested for '+label+': '+name);
   else if(saved?.status==='cancelled')message('Save cancelled. The '+p.noun+' preview and current project are unchanged.');
   else if(saved?.status==='busy')message('Another Save As request is open. Finish it, then download again.',true);
   else message('Save was not completed: '+(saved?.error?.message||saved?.message||saved?.status||'unknown save result')+'. The '+p.noun+' preview remains available.',true);
  }
  return saved;
 }catch(error){if(!item||staged===item)message(error.message||String(error),true);return false;}
}
function mount(){
 if(c)return c.panel;const host=document.getElementById('reAnalysisWorkspace');if(!host)return null;
 const panel=make('section','reNativeBackgroundPanel'),title=make('h3'),introduction=make('p');panel.append(title,introduction);
 const label=make('label'),methodText=make('span'),method=make('select','reNativeBackgroundMethod');label.htmlFor=method.id;label.append(methodText,method);panel.appendChild(label);
 const available=methods();for(const profile of available){const option=make('option',null,profile.name);option.value=profile.id;method.appendChild(option);}method.value=available[0]?.id||'';
 const actions=make('div');actions.className='re-analysis-actions';
 const button=(id,text,fn,parent=actions)=>{const el=make('button',id,text);el.type='button';el.addEventListener('click',()=>{void fn();});parent.appendChild(el);return el;};
 const resources=make('div','reNativeMapResources'),find=button('reNativeMapFind','Find maps',findResources,resources),resourceLabel=make('label',null,'Native map / region'),resource=make('select','reNativeMapResource'),resourceReason=make('p','reNativeMapResourceReason');resourceLabel.htmlFor=resource.id;resourceLabel.appendChild(resource);resources.append(resourceLabel,resourceReason);resources.hidden=true;panel.append(resources,actions);
 const previewButton=button('reNativeBackgroundPreview','Preview background',preview),cancelButton=button('reNativeBackgroundCancel','Cancel preview',cancel);
 const acknowledgeLabel=make('label'),acknowledge=make('input','reNativeBackgroundAcknowledge'),acknowledgeText=make('span');acknowledge.type='checkbox';acknowledgeLabel.htmlFor=acknowledge.id;acknowledgeLabel.append(acknowledge,acknowledgeText);panel.appendChild(acknowledgeLabel);
 const importActions=make('div');importActions.className='re-analysis-actions';panel.appendChild(importActions);
 const importButton=button('reNativeBackgroundImport','Import as new scene',importScene,importActions),projectButton=button('reNativeBackgroundProject','Download background project',()=>download('project'),importActions),evidenceButton=button('reNativeBackgroundEvidence','Download background evidence',()=>download('evidence'),importActions);
 const summary=make('pre','reNativeBackgroundSummary'),canvas=make('div','reNativeBackgroundCanvas'),details=make('details'),detail=make('pre','reNativeBackgroundDetail'),status=make('p','reNativeBackgroundStatus');details.appendChild(make('summary',null,'Full source evidence and construction'));details.appendChild(detail);status.setAttribute('role','status');status.setAttribute('aria-live','polite');canvas.hidden=true;panel.append(summary,canvas,details,status);
 const style=make('style');style.textContent='#reNativeBackgroundPanel{border:1px solid #58627e;border-radius:4px;padding:10px;margin:10px 0;overflow-wrap:anywhere}#reNativeBackgroundPanel button,#reNativeBackgroundPanel select,#reNativeBackgroundPanel label{min-height:44px;box-sizing:border-box}#reNativeBackgroundPanel label{display:block;margin:6px 0}#reNativeBackgroundPanel select{display:block;width:100%;font-size:14px}#reNativeBackgroundPanel input[type=checkbox]{width:20px;height:20px;vertical-align:middle;margin-right:8px}#reNativeBackgroundPanel pre{white-space:pre-wrap;overflow-wrap:anywhere;max-height:320px;overflow:auto}';panel.appendChild(style);
 c={panel,title,introduction,methodText,method,resources,find,resource,resourceReason,preview:previewButton,cancel:cancelButton,acknowledge,acknowledgeText,import:importButton,project:projectButton,evidence:evidenceButton,summary,canvas,detail,status};
 method.addEventListener('change',()=>{cancel(false);clearResources();refreshPresentation();enable();message('Recovery method changed. '+(presentation().kind==='map'?'Find maps and preview a supported region before importing or downloading.':'Preview its background before importing or downloading.'));});
 resource.addEventListener('change',()=>{cancel(false);enable();message('Selected map changed. Review its conversion limits and preview again.');});acknowledge.addEventListener('change',enable);
 for(const type of ['keydown','keyup'])panel.addEventListener(type,event=>event.stopPropagation?.());
 host.appendChild(panel);window.addEventListener('forge:re-analysis-source-change',sourceChanged);refreshPresentation();enable();message(available.length?'Open a source for general analysis, choose its scene recovery method, then preview.':'No native scene conversion methods are available in this build.');return panel;
}
const api=Object.freeze({mount,selectMethod,findResources,preview,cancel,importScene,downloadProject:()=>download('project'),downloadEvidence:()=>download('evidence'),getState:()=>Object.freeze({busy,staged:!!staged,imported,sourceCurrent:!!staged&&current(staged),sourceSha256:staged?.source.identity.sha256||null,sourceGeneration:staged?.source.generation??null,sceneId:staged?.result.report.sceneId||null,methodId:c?.method.value||null,conversionKind:presentation().kind,resourceKey:presentation().kind==='map'?c?.resource.value||null:null,resources:listed?copy(listed.resources):[],report:staged?copy(staged.result.report):null,previewBuild:staged?copy(staged.result.previewBuild):null})});
services.RENativeSceneUI=api;services.RENativeBackgroundUI=api;mount();
})();
