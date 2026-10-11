/* Native background conversion remains detached until an acknowledged import.
 * Source generations, project guards and cancellation protect the preview. */
(()=>{
'use strict';
const services=window.Forge.services,copy=value=>JSON.parse(JSON.stringify(value));
let c=null,busy=false,operation=0,signal=null,staged=null,imported=false;
const make=(tag,id,text)=>{const el=document.createElement(tag);if(id)el.id=id;if(text!==undefined)el.textContent=text;return el;};
const methods=()=>services.REMethods?.profiles().filter(method=>method.domains?.includes('graphics')&&method.operations?.convert)||[];
function message(text,error=false){if(c){c.status.textContent=text;c.status.style.color=error?'var(--err, #ff9898)':'var(--dim)';}}
function source(){
 const api=services.REAnalysisUI,state=api?.getState(),analysis=api?.currentAnalysis();
 if(state?.busy)throw Error('Wait for the selected source to finish opening.');
 if(state?.pendingSelection)throw Error('The source selection changed. Choose Open for analysis before previewing its background.');
 if(!analysis)throw Error('Open a ROM for general analysis first.');
 return {analysis,generation:state.generation,identity:analysis.report.identity};
}
function current(item){try{const now=source();return !!item&&now.analysis===item.source.analysis&&now.generation===item.source.generation&&item.methodId===c.method.value;}catch(_){return false;}}
function projectGuard(){const store=services.ProjectStore;return {epoch:store.state.epoch,snapshot:store.serialize()};}
function check(item,project=true){
 if(!current(item))throw Error('The inspected source or recovery method changed. Preview again.');
 if(project){const now=projectGuard();if(item.project.epoch!==now.epoch||item.project.snapshot!==now.snapshot)throw Error('The project changed after preview. Preview again before importing.');}
}
function enable(){
 if(!c)return;c.method.disabled=busy;c.preview.disabled=busy||!c.method.value;c.cancel.disabled=!busy;
 c.acknowledge.disabled=busy||!staged||imported;c.import.disabled=busy||!staged||imported||!c.acknowledge.checked;
 c.project.disabled=busy||!staged;c.evidence.disabled=busy||!staged;
}
function clear(){staged=null;imported=false;if(c){c.acknowledge.checked=false;c.summary.textContent='';c.detail.textContent='';c.canvas.replaceChildren();c.canvas.hidden=true;}enable();}
function cancel(announce=true){
 const was=busy;operation++;if(signal)signal.aborted=true;signal=null;busy=false;clear();
 if(announce)message(was?'Background preview cancelled. No scene was imported.':'Background preview cleared.');return was;
}
function sourceChanged(){cancel(false);message('The selected source changed. Open it for analysis, then preview its background again.');}
function selectMethod(methodId){
 try{if(!methods().some(method=>method.id===methodId))throw Error('This background recovery method is unavailable.');if(c.method.value===methodId)return true;cancel(false);c.method.value=methodId;enable();message('Recovery method selected. Choose Preview background to inspect its conversion; nothing has been imported.');return true;}
 catch(error){message(error.message||String(error),true);return false;}
}
function lines(values){return (Array.isArray(values)?values:values===undefined?[]:[values]).map(value=>typeof value==='string'?value:JSON.stringify(value));}
function describe(result){
 const report=result.report,build=result.previewBuild;
 c.summary.textContent=[String(report.source.name||'ROM'),'Original file SHA-256 '+report.source.sha256,report.source.byteLength+' source bytes',
 'Method: '+(report.method.name||report.method.id)+' · '+report.method.id+' · version '+report.method.version,
 'Recovered scene: '+report.sceneId,'Limitations:',...lines(report.limitations),'Unknown or omitted:',...lines(report.unknown),
 'Construction:',...lines(report.construction),
 'Independent static viewer build: '+build.backend+' · '+build.byteLength+' bytes · SHA-256 '+build.sha256,
 'This is a static background adaptation. It does not restore original gameplay, scrolling, collision, sprites, audio or the original engine. Import adds an excluded editable scene; the separate downloaded project includes this background in a static viewer build.'].join('\n');
 c.detail.textContent=JSON.stringify(report,null,2);c.canvas.replaceChildren();
 const thumbnail=renderSceneThumb(result.scene,256,240);thumbnail.setAttribute('aria-label','Detached recovered static background preview');thumbnail.style.cssText='width:100%;max-width:256px;height:auto;image-rendering:pixelated';c.canvas.appendChild(thumbnail);c.canvas.hidden=false;
}
async function preview(){
 if(busy)return false;clear();const id=++operation,ownSignal={aborted:false};signal=ownSignal;busy=true;enable();
 try{
  const api=services.RENativeBackground;if(!api?.stage)throw Error('Native background recovery is unavailable in this build.');
  const methodId=c.method.value;if(!methods().some(method=>method.id===methodId))throw Error('Choose an available background recovery method.');
  const item={source:source(),project:projectGuard(),methodId};message('Decoding the selected native background and compiling an independent static viewer…');
  const result=await api.stage(item.source.analysis,methodId,{}, {signal:ownSignal});
  if(id!==operation||ownSignal.aborted)return false;check(item);
  if(!result?.report||!result.scene||!result.project)throw Error('Recovery did not return an editable background and independent project.');
  const report=api.validateRecovery(result.report);
  if(report.source.sha256!==item.source.identity.sha256||report.source.byteLength!==item.source.identity.byteLength||report.method.id!==methodId)throw Error('Background recovery returned a different source or method identity.');
  const build=result.previewBuild;if(build?.backend!=='packed'||!Number.isSafeInteger(build.byteLength)||build.byteLength<1||!/^[a-f0-9]{64}$/.test(build.sha256||''))throw Error('The background has not passed an independent static viewer build.');
  describe(result);staged={...item,result};enable();message('Preview ready. Review the source evidence, construction and unknowns below. Acknowledge the static conversion before adding this background as a new scene. The current project and emulator are unchanged.');return true;
 }catch(error){if(id===operation){clear();message(error.name==='AbortError'?'Background preview cancelled. No scene was imported.':error.message||String(error),error.name!=='AbortError');}return false;}
 finally{if(id===operation){busy=false;signal=null;enable();}}
}
async function importScene(){
 if(busy)return false;
 const item=staged;
 try{
  if(!item||imported){message('Preview a supported background before importing.',true);return false;}
  if(!c.acknowledge.checked){message('Acknowledge that this is a static background conversion before importing.',true);return false;}
  check(item);busy=true;enable();
  // The model owns staged-record ownership, allocation, the single Undo entry
  // and the append-only transaction. Do not load its independent viewer project.
  const result=services.RENativeBackground.importStaged(item.result);
  imported=true;c.acknowledge.checked=false;
  const warnings=lines(result.warnings);
  message('Added the background as a new editable scene, excluded from ROM builds. Existing scenes and runtime settings are preserved. One Undo removes this import.'+(warnings.length?' '+warnings.join('; '):''),!!warnings.length);
  return result;
 }catch(error){if(item&&staged===item){staged=null;imported=false;c.acknowledge.checked=false;}message(error.message||String(error),true);return false;}
 finally{busy=false;enable();}
}
async function download(kind){
 let item;
 try{
  if(busy)throw Error('Wait for the background operation to finish.');
  item=staged;if(!item)throw Error('Preview a supported background before downloading.');check(item,false);
  const report=services.RENativeBackground.validateRecovery(item.result.report),base=String(report.source.name||'ROM').replace(/\.[^.]*$/,'').replace(/[^a-z0-9._-]/gi,'_').slice(0,70)||'ROM',name=base+'-background'+(kind==='project'?'.nesforge.json':'-evidence.json');
  const value=kind==='project'?item.result.project:report,saved=await forgeSave.request(new TextEncoder().encode(JSON.stringify(value,null,2)),name,'application/json');
  if(staged===item&&current(item)){
   const label=kind==='project'?'independent static background project':'background recovery evidence';
   if(saved?.status==='saved')message('Saved '+label+': '+name);
   else if(saved?.status==='download-requested')message('Download requested for '+label+': '+name);
   else if(saved?.status==='cancelled')message('Save cancelled. The background preview and current project are unchanged.');
   else if(saved?.status==='busy')message('Another Save As request is open. Finish it, then download again.',true);
   else message('Save was not completed: '+(saved?.error?.message||saved?.message||saved?.status||'unknown save result')+'. The background preview remains available.',true);
  }
  return saved;
 }catch(error){if(!item||staged===item)message(error.message||String(error),true);return false;}
}
function mount(){
 if(c)return c.panel;const host=document.getElementById('reAnalysisWorkspace');if(!host)return null;
 const panel=make('section','reNativeBackgroundPanel');panel.setAttribute('aria-label','Native background recovery');panel.appendChild(make('h3',null,'Native background recovery'));
 panel.appendChild(make('p',null,'Decode a supported native background, review the static adaptation, and choose whether to add an editable scene or download an independent Forge viewer project. The original ROM engine is not recovered or played.'));
 const label=make('label',null,'Background recovery method'),method=make('select','reNativeBackgroundMethod');label.htmlFor=method.id;label.appendChild(method);panel.appendChild(label);
 const available=methods();for(const profile of available){const option=make('option',null,profile.name);option.value=profile.id;method.appendChild(option);}method.value=available[0]?.id||'';
 const actions=make('div');actions.className='re-analysis-actions';panel.appendChild(actions);
 const button=(id,text,fn,parent=actions)=>{const el=make('button',id,text);el.type='button';el.addEventListener('click',()=>{void fn();});parent.appendChild(el);return el;};
 const previewButton=button('reNativeBackgroundPreview','Preview background',preview),cancelButton=button('reNativeBackgroundCancel','Cancel preview',cancel);
 const acknowledgeLabel=make('label',null,'I understand this is a static background conversion with the limitations and unknowns shown below.'),acknowledge=make('input','reNativeBackgroundAcknowledge');acknowledge.type='checkbox';acknowledgeLabel.htmlFor=acknowledge.id;acknowledgeLabel.prepend(acknowledge);panel.appendChild(acknowledgeLabel);
 const importActions=make('div');importActions.className='re-analysis-actions';panel.appendChild(importActions);
 const importButton=button('reNativeBackgroundImport','Import as new scene',importScene,importActions),projectButton=button('reNativeBackgroundProject','Download background project',()=>download('project'),importActions),evidenceButton=button('reNativeBackgroundEvidence','Download background evidence',()=>download('evidence'),importActions);
 const summary=make('pre','reNativeBackgroundSummary'),canvas=make('div','reNativeBackgroundCanvas'),details=make('details'),detail=make('pre','reNativeBackgroundDetail'),status=make('p','reNativeBackgroundStatus');details.appendChild(make('summary',null,'Full source evidence and construction'));details.appendChild(detail);status.setAttribute('role','status');status.setAttribute('aria-live','polite');canvas.hidden=true;panel.append(summary,canvas,details,status);
 const style=make('style');style.textContent='#reNativeBackgroundPanel{border:1px solid #58627e;border-radius:4px;padding:10px;margin:10px 0;overflow-wrap:anywhere}#reNativeBackgroundPanel button,#reNativeBackgroundPanel select,#reNativeBackgroundPanel label{min-height:44px;box-sizing:border-box}#reNativeBackgroundPanel label{display:block;margin:6px 0}#reNativeBackgroundPanel select{display:block;width:100%;font-size:14px}#reNativeBackgroundPanel input[type=checkbox]{width:20px;height:20px;vertical-align:middle;margin-right:8px}#reNativeBackgroundPanel pre{white-space:pre-wrap;overflow-wrap:anywhere;max-height:320px;overflow:auto}';panel.appendChild(style);
 c={panel,method,preview:previewButton,cancel:cancelButton,acknowledge,import:importButton,project:projectButton,evidence:evidenceButton,summary,canvas,detail,status};
 method.addEventListener('change',()=>{cancel(false);message('Recovery method changed. Preview its background before importing or downloading.');});acknowledge.addEventListener('change',enable);
 for(const type of ['keydown','keyup'])panel.addEventListener(type,event=>event.stopPropagation?.());
 host.appendChild(panel);window.addEventListener('forge:re-analysis-source-change',sourceChanged);enable();message(available.length?'Open a source for general analysis, choose its background method, then preview.':'No native background conversion methods are available in this build.');return panel;
}
services.RENativeBackgroundUI=Object.freeze({mount,selectMethod,preview,cancel,importScene,downloadProject:()=>download('project'),downloadEvidence:()=>download('evidence'),getState:()=>Object.freeze({busy,staged:!!staged,imported,sourceCurrent:!!staged&&current(staged),sourceSha256:staged?.source.identity.sha256||null,sourceGeneration:staged?.source.generation??null,sceneId:staged?.result.report.sceneId||null,methodId:c?.method.value||null,report:staged?copy(staged.result.report):null,previewBuild:staged?copy(staged.result.previewBuild):null})});mount();
})();
