/* Explicit full-project intake and guarded restoration. Navigation never imports
 * tracker data, changes the editable projection, starts playback or loads a ROM. */
(()=>{
'use strict';
const services=window.Forge.services,api=services.InvestigationProject,store=services.ProjectStore;
const host=document.getElementById('spatialRE');if(!host)return;
const el=(tag,id,text)=>{const n=document.createElement(tag);if(id)n.id=id;if(text!==undefined)n.textContent=text;return n;};
const root=el('section','investigationWorkspace'),status=el('p','investigationStatus'),summary=el('p','investigationSummary'),gaps=el('pre','investigationGaps');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
root.append(el('h2',null,'ROM project workspace'),el('p',null,'Keep the original source and every recovered catalog together. Follow verified resources; prepare editable copies as needed. Import as new project replaces the current workspace; save current work first.'),status,summary);
const controls=el('div');controls.className='spatial-row';root.appendChild(controls);
let staged=null,guard=null,token=0,restoreToken=0,ownedHash=null,pending=Promise.resolve(false);
const message=(text,error=false)=>{status.textContent=text;status.dataset.error=String(error);};
const button=(id,label,fn)=>{const b=el('button',id,label);b.type='button';b.addEventListener('click',()=>void Promise.resolve().then(fn).catch(e=>message(e.message,true)));controls.appendChild(b);return b;};
const prepare=button('investigationPrepare','Prepare investigated game',preview),apply=button('investigationImport','Import as new project',importProject);apply.disabled=true;
const donorExport=button('investigationDonor','Export selected CHR donor',()=>{const p=store.capture(),d=(services.NativeLayoutProject?.matches(p)?services.NativeLayoutProject:services.ROMProject).donor(p,p.scenes[p.activeScene]?.id);return download(new TextEncoder().encode(JSON.stringify(d,null,2)),(d.projectName.replace(/[^\w-]/g,'_')||'chr-donor')+'.nesforge.json','application/json');});
 const donorNote=el('p','investigationDonorNote','CHR donor export uses the selected physical bank as background and sprite choices with an authored grayscale palette. It omits the ROM and engine; choose an authored base in Scene → Seeded mashup to combine sources.');root.appendChild(donorNote);
const navigation=[];for(const [kind,label]of [['library','Game / area library'],['scenes','Scenes & objects'],['actors','Actors & parameters'],['animation','Scripts & poses'],['graphics','CHR patterns'],['code','6502 & RAM'],['coverage','Coverage & gaps'],['maps','Overworld / maps'],['audio','Source Audio library']])navigation.push(button('investigationOpen-'+kind,label,()=>open(kind)));
root.append(el('p',null,'Saved RAM entries are investigation annotations. Live RAM requires a running debug session. Collision, AI, routes, animation timing and native write support remain incomplete; inspect Coverage & gaps before editing.'),gaps);host.insertBefore(root,host.firstChild);
for(const type of ['keydown','keyup'])root.addEventListener(type,e=>e.stopPropagation?.());
const entry=el('button','investigationOpen','Project investigation');entry.type='button';entry.addEventListener('click',()=>{services.SpatialREUI.show();switchTab('disasm');root.scrollIntoView?.({block:'start'});refresh();});document.getElementById('areaLibraryOpen')?.parentNode?.insertBefore(entry,document.getElementById('areaLibraryOpen'));
const style=el('style');style.textContent='#investigationWorkspace{padding:14px;border:1px solid #568087;border-radius:8px;margin:12px 0;overflow-wrap:anywhere}#investigationWorkspace button,#investigationOpen{min-height:44px;max-width:100%;white-space:normal}#investigationWorkspace pre{white-space:pre-wrap;overflow-wrap:anywhere}#investigationWorkspace .spatial-row{display:flex;gap:8px;margin:12px 0;flex-wrap:wrap}#investigationOpen{padding:6px 14px;background:#23485c;color:#e7fff9;border:1px solid #568087;border-radius:5px;cursor:pointer}#investigationWorkspace [data-error=true]{color:#ffbf96}#investigationSummary{line-height:1.8}';document.head.appendChild(style);
function refresh(){
 const d=api.describe(S.investigation);donorExport.hidden=donorNote.hidden=!['container','native-layout'].includes(d?.kind);donorExport.disabled=!['container','native-layout'].includes(d?.kind)||!S.nativeGame?.resources?.some(b=>b.sceneId===S.scenes[S.activeScene]?.id);for(const b of navigation)b.disabled=!d||(['container','native-layout','native-resources'].includes(d.kind)&&!['library','graphics','code','coverage',...(['native-layout','native-resources'].includes(d.kind)?['scenes']:[])].some(k=>b.id==='investigationOpen-'+k));
 summary.textContent=d?.kind==='container'?d.source.name+' · '+d.source.byteLength+' bytes · mapper declaration '+d.header.mapper+' · '+d.chrBanks+' physical CHR sheets · no decoded stage/actor/Audio catalog. '+services.NativeEngineProject.capabilities(S.nativeGame?.profile).buildScope:d?d.source.name+' · '+d.contexts+' contexts · '+d.rooms+' room / slot entries · '+d.maps+' maps · '+d.actors+' actor entries · '+d.poses+' poses · '+d.scripts+' scripts · '+d.chrBanks+' CHR banks · '+d.symbols+' source labels · '+d.ram+' RAM annotations · '+d.cues+' Audio cue / control entries. '+services.NativeEngineProject.capabilities(S.nativeGame?.profile).buildScope:'Choose Open ROM / project to prepare a portable source project. Verified engine adapters add recovered catalogs when available; existing selected-resource import remains available below.';
 gaps.textContent=d?'Source SHA-256: '+d.source.sha256+'\n'+d.gaps.concat(d.audioGaps).map(x=>typeof x==='string'?x:JSON.stringify(x)).join('\n'):'';
}
async function preview(input){
 const own=++token;staged=guard=null;apply.disabled=true;prepare.disabled=true;
 try{const source=input?.bytes?{bytes:Uint8Array.from(input.bytes),name:input.name}:services.SpatialREUI.sourceSnapshot();if(!source)throw Error('Choose the investigated ROM in the spatial RE chooser first.');const before={epoch:store.state.epoch,snapshot:store.serialize()};message('Preparing preserved source and complete recovered catalogs…');
  const project=await api.create(source.bytes,source.name);if(own!==token)return false;
  if(input?.isCurrent&&!input.isCurrent())throw Error('Intake source changed. Prepare again.');
  const current=input?.bytes?source:services.SpatialREUI.sourceSnapshot();if(!current||window.NativeEngineFormat.sha256(current.bytes)!==project.investigation.source.sha256||before.epoch!==store.state.epoch||before.snapshot!==store.serialize())throw Error('Source or project changed during preview. Prepare again.');
  staged=project;guard={...before,source:input?.bytes?{bytes:source.bytes.slice(),name:source.name}:null,isCurrent:input?.isCurrent||null};apply.disabled=false;const d=api.describe(project.investigation);message(d.kind==='container'?'Ready: preserved ROM, physical container evidence and '+project.nativeGame.resources.length+' editable CHR sheets. Stages, actors and Audio remain unresolved. Import replaces the current project. '+services.NativeEngineProject.capabilities(project.nativeGame.profile).buildScope:d.kind==='native-resources'?'Ready: '+d.rooms+' catalog entries with verified layouts and static graphics. '+services.NativeResourceProject.scope+' Import replaces the current project.':d.kind==='native-layout'?'Ready: '+d.rooms+' source screen layouts with initial background graphics and palette. '+services.NativeLayoutProject.scope+' Import replaces the current project.':'Ready: '+d.rooms+' room / slot entries, '+d.maps+' maps and all recovered actor, pose, script, CHR, code, RAM and Audio catalogs. The original ROM is retained privately in your project. '+services.NativeEngineProject.capabilities(project.nativeGame.profile).buildScope+' Import replaces the current project.');return true;
 }catch(e){message(e.message,true);return false;}finally{if(own===token)prepare.disabled=false;}
}
function importProject(){
 try{if(!staged||!guard)throw Error('Prepare the investigated game first.');if(guard.isCurrent&&!guard.isCurrent())throw Error('Intake source changed. Prepare again.');const current=guard.source||services.SpatialREUI.sourceSnapshot();if(!current||window.NativeEngineFormat.sha256(current.bytes)!==staged.investigation.source.sha256||guard.epoch!==store.state.epoch||guard.snapshot!==store.serialize())throw Error('Source or project changed. Prepare again.');const prepared=store.prepareLoad(staged);if(snapshot()===false)throw Error('Project history could not retain the previous project. Save current work before importing.');store.commit(prepared,{sync:true,replace:true,intent:'investigated-game-import'});notify('romProjectImport');staged=guard=null;apply.disabled=true;message('ROM project imported. Save Project As preserves the source and available resource evidence; reopening restores its access.');return true;}catch(e){apply.disabled=true;message(e.message,true);return false;}
}
function restore(){
 const own=++restoreToken,n=S.investigation,epoch=store.state.epoch;if(!n)return Promise.resolve(false);
 const hash=n.source.sha256,bytes=Uint8Array.from(S.importedRom),current=()=>own===restoreToken&&epoch===store.state.epoch&&S.investigation?.source.sha256===hash;
 ownedHash=hash;
 return (async()=>{try{
  if(n.version===2||n.version===3||n.version===4){const ok=await services.REAnalysisUI.openFile({name:n.source.name,size:bytes.length,arrayBuffer:async()=>bytes.slice().buffer},{allowLegacyHeaderLayout:true,isCurrent:current});if(!ok||!current())return false;refresh();services.AreaLibraryUI.refresh();return true;}
  if(services.SpatialREUI.getState().sha256!==hash){const ok=await services.SpatialREUI.openFile({name:n.source.name,size:bytes.length,arrayBuffer:async()=>bytes.slice().buffer},{reveal:false,isCurrent:current});if(!ok||!current())return false;}
  const sourceCurrent=()=>current()&&services.SpatialREUI.getState().sha256===hash;
  const audio=await services.NativeAudioLibraryUI.sourceLoaded(bytes,n.source.name,{isCurrent:sourceCurrent});if(!audio||!sourceCurrent())return false;
  refresh();services.AreaLibraryUI.refresh();return true;
 }catch(e){if(current())message('Saved investigation retained; source view could not be restored: '+e.message,true);return false;}})();
}
function projectChanged(){
 ++restoreToken;refresh();if(S.investigation){pending=restore();return pending;}
 if(ownedHash&&services.SpatialREUI.getState().sha256===ownedHash)services.SpatialREUI.clear();ownedHash=null;pending=Promise.resolve(false);return pending;
}
async function open(kind){
 if(!S.investigation)throw Error('Import an investigated game first.');if(!['library','maps','audio','scenes','actors','animation','graphics','code','coverage'].includes(kind))throw Error('Unknown investigation resource.');
 if(!await (pending=restore()))throw Error('The project or source changed during restoration. Open this resource again.');
 if(S.investigation.version===4){if(['library','scenes','graphics'].includes(kind)){services.AreaLibrary.show();services.AreaLibrary.selectScope('source');}else if(['graphics','code','coverage'].includes(kind)){switchTab('disasm');root.scrollIntoView?.({block:'start'});}else throw Error('This source domain remains unresolved. See Coverage & gaps.');return true;}
 if(S.investigation.version===3){if(kind==='library'||kind==='scenes'){services.AreaLibrary.show();services.AreaLibrary.selectScope('project');}else if(['graphics','code','coverage'].includes(kind)){switchTab('disasm');if(kind==='graphics')document.getElementById('reAnalysisChrDetails').open=true;root.scrollIntoView?.({block:'start'});}else throw Error('This source domain is not recovered in the native layout checkpoint. See Coverage & gaps.');return true;}
 if(S.investigation.version===2){if(kind==='library'){services.AreaLibrary.show();services.AreaLibrary.selectScope('project');}else if(['graphics','code','coverage'].includes(kind)){switchTab('disasm');if(kind==='graphics')document.getElementById('reAnalysisChrDetails').open=true;root.scrollIntoView?.({block:'start'});}else throw Error('No verified source '+kind+' catalog. Use the existing project authoring tools or discover recovery methods.');return true;}
 if(kind==='library'){services.AreaLibrary.show();services.AreaLibrary.selectScope('source');}
 else if(kind==='maps'){services.AreaLibrary.show();services.AreaLibrary.openMaps();}
 else if(kind==='audio'){services.NativeAudioLibraryUI.open(true);switchTab('audio');}
 else {const id=services.GameREUI.libraryView()?.selectedScene||S.investigation.catalogs.native.scenes.find(s=>s.status!=='unavailable-slot')?.id;services.GameREUI.openResource(id,kind);}return true;
}
services.InvestigationUI=Object.freeze({preview,importProject,projectChanged,open,refresh,whenReady:()=>pending,getState:()=>({ready:!!S.investigation,staged:!!staged,sourceSha256:S.investigation?.source.sha256||null})});refresh();
})();
