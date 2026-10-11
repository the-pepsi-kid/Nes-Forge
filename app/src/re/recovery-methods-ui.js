/* Recovery discovery only inspects the currently opened physical file. Routes
 * reveal existing tools; they never import assets, reset native edits, or run a ROM. */
(()=>{
'use strict';
const services=window.Forge.services;
let c=null,operation=0,busy=false,signal=null,staged=null;
const routes=Object.freeze({
 'nes.physical-chr.v1':[{id:'chr',label:'Open tile recovery tools',target:'reNativeAssetsPanel',focus:'reNativeAssetsPreview',details:'reAnalysisChrDetails'}],
 'nes.pointer-nametable.v1':[{id:'pointer-background',label:'Open native background recovery',target:'reNativeBackgroundPanel',focus:'reNativeBackgroundPreview',methodId:'nes.pointer-nametable.v1'}],
 'nes.immediate-ppu-background.v1':[{id:'immediate-background',label:'Open native background recovery',target:'reNativeBackgroundPanel',focus:'reNativeBackgroundPreview',methodId:'nes.immediate-ppu-background.v1'}],
 'nes.famitone2-native.v1':[
  {id:'audio',label:'Open native Audio tools',target:'reNativeAudioPanel',focus:'reNativeAudioPanel'},
  {id:'transcription',label:'Open AUDIO transcription tools',target:'reNativeAudioImportPanel',focus:'reNativeAudioImportPanel'}
 ]
});
const make=(tag,id,text)=>{const el=document.createElement(tag);if(id)el.id=id;if(text!==undefined)el.textContent=text;return el;};
function message(text,error=false){if(c){c.status.textContent=text;c.status.style.color=error?'var(--err, #ff9898)':'var(--dim)';}}
function capture(){
 const api=services.REAnalysisUI,state=api?.getState(),analysis=api?.currentAnalysis();
 if(state?.busy)throw Error('Wait for the selected file to finish opening.');
 if(state?.pendingSelection)throw Error('The file selection changed. Choose Open for analysis before discovering recovery methods.');
 if(!analysis)throw Error('Open a ROM or binary for general analysis first.');
 return {analysis,generation:state.generation,identity:analysis.report.identity};
}
function matches(item){try{const now=capture();return !!item&&now.analysis===item.analysis&&now.generation===item.generation;}catch(_){return false;}}
function enable(){if(!c)return;c.discover.disabled=busy;c.cancel.disabled=!busy;c.export.disabled=busy||!staged;for(const button of c.routes)button.disabled=busy||!staged;}
function cancel(announce=true){
 const was=busy;operation++;if(signal)signal.aborted=true;signal=null;busy=false;staged=null;
 if(c){c.results.replaceChildren();c.routes=[];c.identity.textContent='';c.nativeNotice.textContent='';enable();if(announce)message(was?'Discovery cancelled. No recovery result was applied.':'Discovery results cleared.');}
 return was;
}
function sourceChanged(){cancel(false);message('The selected source changed. Open it for analysis, then discover recovery methods again.');}
function nativeNotice(){
 const native=services.RENativeAudioUI?.getState();
 if(native?.hasSession&&native.sourceCurrent){
  const edited=native.currentSha256!==native.sourceSha256;
  c.nativeNotice.textContent=(edited?'Native Audio has an edited ROM copy.':'Native Audio has an existing inspected ROM copy.')+' Current copy SHA-256 '+native.currentSha256+'. Discovery below describes the original file opened for analysis. Opening these tools preserves this copy; choosing Analyze current ROM again starts a new native session from the original file.';
 }else c.nativeNotice.textContent='Discovery describes the original file opened for analysis. An existing native edit session is not reset or replaced.';
}
function appendLines(parent,title,values){if(!values?.length)return;parent.appendChild(make('p',null,title));const list=make('ul');for(const value of values)list.appendChild(make('li',null,String(value)));parent.appendChild(list);}
function render(item){
 const result=item.result;const identity=result.source;
 c.identity.textContent=String(identity.name||item.identity.name||'binary')+'\n'+identity.byteLength+' bytes\nOriginal file SHA-256 '+identity.sha256;
 c.results.replaceChildren();c.routes=[];nativeNotice();
 for(const found of result.results){
  const method=found.method,article=make('article');article.className='recovery-method-result';article.dataset.method=method.id;
  article.appendChild(make('h4',null,method.name+' · '+found.status));
  article.appendChild(make('p',null,'Method '+method.id+' · version '+method.version+' · '+(method.domains||[]).join(', ')));
  article.appendChild(make('p',null,found.reason));
  appendLines(article,'Available operations in this method (each has its own checks):',Object.entries(method.operations||{}).map(([id,op])=>(op.label||id)+' · '+({'read-only':'inspection only',preview:'preview only','native-copy':'edits a ROM copy'}[op.effect]||op.effect)+(op.fidelity?' · '+({exact:'exact representation',lossy:'conversion can change sound or data',native:'native engine format'}[op.fidelity]||op.fidelity):'')+(id==='convert'?' · conversion readiness is not checked by discovery':'')));
  appendLines(article,'Limits:',[...(Number.isFinite(method.limits?.maxSourceBytes)?['Source size limit: '+method.limits.maxSourceBytes+' bytes.']:[]),...(method.limitations||[])]);
  const evidence=found.evidence||[];appendLines(article,'Recognition evidence:',evidence.map(e=>(e.status?e.status+' · ':'')+(e.claim||e.reason||JSON.stringify(e))));
  if(found.status==='supported'){
   const actions=make('div');actions.className='re-analysis-actions';
   for(const path of routes[method.id]||[]){const button=make('button','recoveryMethodsRoute-'+path.id,path.label);button.type='button';button.addEventListener('click',()=>route(method.id,path.id));actions.appendChild(button);c.routes.push(button);}
   if(actions.children.length)article.appendChild(actions);
  }
  c.results.appendChild(article);
 }
 if(!result.results.length)c.results.appendChild(make('p',null,'No recovery methods are registered in this build.'));
}
async function discover(){
 if(busy)return false;
 let item;try{item=capture();}catch(error){cancel(false);message(error.message||String(error),true);return false;}
 const id=++operation,ownSignal={aborted:false};signal=ownSignal;busy=true;staged=null;c.results.replaceChildren();c.routes=[];c.identity.textContent='';c.nativeNotice.textContent='';enable();message('Checking the available bounded recovery methods…');
 try{
  const api=services.REMethods;if(!api?.discover)throw Error('Recovery method discovery is unavailable in this build.');
  const result=await api.discover(item.analysis,{signal:ownSignal});
  if(id!==operation||ownSignal.aborted)return false;
  if(!matches(item))throw Error('The inspected source changed during discovery. Open the selected file and discover again.');
  if(result.source?.sha256!==item.identity.sha256||result.source?.byteLength!==item.identity.byteLength)throw Error('Recovery discovery returned a different source identity.');
  item={...item,result};staged=item;render(item);
  message('Discovery finished. Results describe recognition of the original source; supported does not mean that every song or asset can be converted. Open a tool and explicitly preview its proposed recovery. The project and emulator are unchanged.');return true;
 }catch(error){if(id===operation){staged=null;message(error.name==='AbortError'?'Discovery cancelled. No recovery result was applied.':error.message||String(error),error.name!=='AbortError');}return false;}
 finally{if(id===operation){busy=false;signal=null;enable();}}
}
function route(methodId,routeId){
 try{
  if(busy)throw Error('Wait for discovery to finish.');
  if(!staged||!matches(staged)){cancel(false);throw Error('Discovery results no longer match the selected source. Discover recovery methods again.');}
  const found=staged.result.results.find(item=>item.method.id===methodId),path=routes[methodId]?.find(item=>item.id===routeId);
  if(found?.status!=='supported'||!path)throw Error('This recovery route is not supported by the current discovery result.');
  const target=document.getElementById(path.target),focus=document.getElementById(path.focus);if(!target||!focus)throw Error('The recovery tools are unavailable in this build.');
  if(path.methodId&&!services.RENativeBackgroundUI?.selectMethod(path.methodId))throw Error('The background recovery method is unavailable in this build.');
  services.REAnalysisUI.showWorkspace(true);if(path.details){const details=document.getElementById(path.details);if(!details)throw Error('The recovery tools are unavailable in this build.');details.open=true;}
  target.tabIndex=-1;target.scrollIntoView?.({block:'start',behavior:'auto'});focus.focus?.();nativeNotice();
  const native=services.RENativeAudioUI?.getState();
  message(path.methodId?'Native background recovery opened. Choose Preview background and review its evidence, construction and unknowns before explicitly importing a static scene. Discovery has not converted or imported it.':path.id==='chr'?'Tile recovery tools opened. Choose Preview native tile import, inspect the result, then explicitly import it.':path.id==='transcription'?(native?.hasSession&&native.sourceCurrent?'Transcription tools opened for the existing native ROM copy. Choose its subsong above, then Preview import to AUDIO; conversion may still be refused.':'Transcription tools opened. First use Analyze current ROM in Native Audio and choose a subsong, then Preview import to AUDIO. Discovery has not checked conversion readiness.'):'Native Audio tools opened. An existing edited copy is preserved. Analyze current ROM starts a new native session from the original opened file; export any edits you want to keep first.');
  return true;
 }catch(error){message(error.message||String(error),true);return false;}
}
async function downloadEvidence(){
 if(busy)return false;
 let item;
 try{
  if(!staged||!matches(staged)){cancel(false);throw Error('Discover recovery methods for the current opened source before exporting its report.');}
  item=staged;
  const report={format:'NESForgeRecoveryMethodDiscovery',version:1,source:item.result.source,results:item.result.results,work:item.result.work,notice:'Historical recognition evidence for the original file opened for analysis. This is not a project, native edit session, converted score, complete game recovery, playback test, or import-readiness proof.'};
  const base=String(item.identity.name||'binary').replace(/\.[^.]*$/,'').replace(/[^a-z0-9._-]/gi,'_').slice(0,80)||'binary',name=base+'-recovery-methods.json';
  const saved=await forgeSave.request(new TextEncoder().encode(JSON.stringify(report,null,2)),name,'application/json');
  if(staged===item&&matches(item)){
   if(saved?.status==='saved')message('Saved recovery method evidence: '+name);
   else if(saved?.status==='download-requested')message('Download requested for recovery method evidence: '+name);
   else if(saved?.status==='cancelled')message('Evidence save cancelled. Discovery results remain available.');
   else if(saved?.status==='busy')message('Another Save As request is open. Finish it, then export the evidence again.',true);
   else message('Evidence export was not completed: '+(saved?.error?.message||saved?.message||saved?.status||'unknown save result')+'. The report remains available.',true);
  }
  return saved;
 }catch(error){if(!item||staged===item)message(error.message||String(error),true);return false;}
}
function mount(){
 if(c)return c.panel;const host=document.getElementById('reAnalysisWorkspace');if(!host)return null;
 const panel=make('section','recoveryMethodsPanel');panel.setAttribute('aria-label','Available recovery methods');panel.appendChild(make('h3',null,'Available recovery methods'));
 panel.appendChild(make('p',null,'Discover which installed methods recognize this opened file. Recognition, native editing and conversion are separate checks. Unknown engines and unsupported assets remain available for general byte analysis.'));
 const actions=make('div');actions.className='re-analysis-actions';panel.appendChild(actions);
 const button=(id,text,fn)=>{const el=make('button',id,text);el.type='button';el.addEventListener('click',()=>{void fn();});actions.appendChild(el);return el;};
 const discoverButton=button('recoveryMethodsDiscover','Discover recovery methods',discover),cancelButton=button('recoveryMethodsCancel','Cancel discovery',cancel),exportButton=button('recoveryMethodsExport','Download method evidence',downloadEvidence);
 const identity=make('pre','recoveryMethodsIdentity'),notice=make('p','recoveryMethodsNativeNotice'),results=make('div','recoveryMethodsResults'),status=make('p','recoveryMethodsStatus');status.setAttribute('role','status');status.setAttribute('aria-live','polite');panel.append(identity,notice,results,status);
 panel.style.cssText='border:1px solid #58627e;border-radius:4px;padding:10px;margin:10px 0;overflow-wrap:anywhere';
 c={panel,discover:discoverButton,cancel:cancelButton,export:exportButton,identity,nativeNotice:notice,results,status,routes:[]};
 for(const type of ['keydown','keyup'])panel.addEventListener(type,event=>event.stopPropagation?.());
 host.insertBefore(panel,host.children[2]||null);window.addEventListener('forge:re-analysis-source-change',sourceChanged);enable();message('Open a source for general analysis, then discover its available recovery methods.');return panel;
}
services.RERecoveryMethodsUI=Object.freeze({mount,discover,cancel,route,downloadEvidence,getState:()=>Object.freeze({busy,hasResults:!!staged,sourceSha256:staged?.identity.sha256||null,sourceGeneration:staged?.generation??null,sourceCurrent:!!staged&&matches(staged),resultCount:staged?.result.results.length||0})});mount();
})();
