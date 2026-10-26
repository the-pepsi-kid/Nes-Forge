/* NES FORGE CONNECTION: src/services/area-library.js
 * Area navigation presents the investigation catalog and its materialized pages.
 * The source catalog can exceed the 64 working Scene slots. Punch-Out Recovered content
 * adds pose/state/arena navigation while retaining this shared page library.
 */
/* A navigation view over existing project assets and detached source catalogs.
 * No second asset store, inferred route graph, runtime binding or native encoder. */
(()=>{
'use strict';
const services=window.Forge.services,cp=x=>JSON.parse(JSON.stringify(x));
const state={scope:'project',context:'',room:'',page:'',query:'',sourceKey:'',epoch:-1,busy:false};let ui,refreshing=false,returnFocus=null,lastScene='',navigating=0,inertState=[];
const navigation=fn=>{navigating++;try{return fn();}finally{navigating--;}};
const fail=m=>{throw Error('Area library: '+m);};
const el=(tag,id,text)=>{const n=document.createElement(tag);if(id)n.id=id;if(text!==undefined)n.textContent=text;return n;};
function sourceView(){
 if(S.investigation?.version===4)return services.NativeResourceProject.libraryView(services.ProjectStore.capture());
 if(S.investigation?.version===3)return {source:S.investigation.source,profile:{id:S.nativeGame.adapter},scenes:[],selected:null,selectedScene:null,maps:[]};
 if(S.investigation?.version===2){const r=services.REAnalysisUI.currentAnalysis()?.report;if(r?.identity.sha256===S.investigation.source.sha256)return {source:{name:S.investigation.source.name,sha256:r.identity.sha256},profile:null,scenes:[],selected:null,selectedScene:null,maps:[]};return null;}
 const spatial=services.SpatialREUI.libraryView(),native=services.GameREUI.libraryView();
 if(!spatial)return null;
 return {source:spatial.source,profile:native?.source.sha256===spatial.source.sha256?native.profile:null,
  scenes:native?.source.sha256===spatial.source.sha256?native.scenes:[],selected:native?.selected||null,selectedScene:native?.selectedScene||null,maps:spatial.maps};
}
const sourceKey=s=>s?JSON.stringify([s.source.sha256,s.profile?.id||null]):'';
function matchingPages(source,id){
 return S.scenes.filter(s=>{const r=s.captureMeta?.nativeAssets;return services.StageContext.nativeKey(s)&&r.source.sha256===source.source.sha256&&r.profile===source.profile?.id&&r.sceneId===id;}).sort((a,b)=>(a.captureMeta.nativeAssets.page||0)-(b.captureMeta.nativeAssets.page||0));
}
function resources(scope,scene,item,source){
 if(S.investigation?.version===4){const cap=services.ProjectCapabilities.describe(S);return [
  {name:'Background / layout / palette IDs',inspect:item?.reason||'Verified static source resource',edit:item?.status==='Unavailable native slot'?'Unavailable state':'Open a recovered page; use its native block controls',build:'Existing native block substitutions; source capacity checked'},
  ...cap.writers.filter(w=>w.id!=='native-resource-blocks').map(w=>({name:w.title,inspect:'Project-wide native writer; the selected page may be a source snapshot',edit:w.scope,build:'Open its dedicated editor through Connected Workspace → Native tools'})),
  ...['Collision / actors / native animation','Native Audio / menus / events'].map(name=>({name,inspect:'Recovery is title-specific; source inspection does not establish a writer',edit:'Authoring copies remain savable; unsupported native changes can block output',build:'No native writer in this workflow'}))];}
 const native=!!S.nativeGame,editable=scope==='project'||!!scene,recovered=scope==='source'||!!scene?.captureMeta?.nativeAssets;
 const build=services.NativeResourceProject?.matches(S)?'Existing native block substitutions; source capacity checked':scene?.captureMeta?.nativeLayout?'Native screen blocks brush only':native?'Native encoder pending':'Generated build, subject to checks';
 const terrain=services.NativeEngineProject.capabilities(S.nativeGame?.profile).terrain&&S.nativeGame?.resources?.some(b=>b.sceneId===scene?.id);
 if(item?.status==='Unavailable native slot')return [{name:'Native slot',inspect:'No normal room header',edit:'Unavailable',build:'Not supported'}];
 if(item?.kind==='map')return [{name:'Overworld / native map',inspect:'Decoded terrain / categories',edit:source?.profile?.id==='zelda2-us'?'Inspection only here; open selected terrain editor':'Inspection only',build:source?.profile?.id==='zelda2-us'?'Z2 terrain writer; capacity checked':'Native encoder pending'},{name:'Routes and collision',inspect:'Partial source evidence',edit:'Not reconstructed',build:'Not supported'}];
 return [
  {name:'Scene / CHR / palettes',inspect:scope==='source'?'Original initial art and CHR':'Selected project page',edit:editable?'Editable project copy':'Prepare an editable copy',build},
  {name:'World / room layout',inspect:scope==='source'?'Room geometry; routes incomplete':'Related World / room segment',edit:editable?'Editable project layout':'Prepare an editable copy',build:terrain?'Bound overworld terrain only; other layout fields need encoders':build},
  {name:'Collision',inspect:recovered?'Native movement rules incomplete':'Authored tile / metatile properties',edit:editable?(recovered?'Authored collision; imported values start unassigned':'Editable authored collision'):'Source evidence only',build:native?'Native encoder pending':'Authored supported collision only'},
  {name:'Actors / animation',inspect:recovered?'Partial native records and poses':'Existing project actors and animations',edit:editable?'Existing project actors / clips':'Supported poses / clips can be imported',build:native?'Native encoder pending':'Authored supported gameplay only'},
  {name:'Music / SFX',inspect:recovered?'Source Audio library; room links incomplete':'Existing project patterns and SFX',edit:'Project-wide tracker; direct imported-event return deferred',build:native?'Native encoder pending':'Existing explicit Audio Runtime settings'}
 ];
}
function describe(){
 const project=services.SceneContext.describe(),source=sourceView(),key=sourceKey(source),same=key===state.sourceKey;
 const scope=state.scope==='source'&&source?'source':'project';let contexts,context,items,selected,pages=[];
 if(scope==='source'){
  contexts=[...new Set(source.scenes.map(s=>s.group))].map(g=>({id:'rooms:'+g,name:g,kind:'rooms'}));
  if(source.maps.length)contexts.unshift({id:'maps',name:'Overworld / native maps',kind:'maps'});
  context=contexts.find(c=>c.id===state.context&&same)||contexts.find(c=>c.kind==='rooms')||contexts[0]||null;
  items=context?.kind==='maps'?source.maps.map(m=>({...m,kind:'map',name:m.label,status:'Inspection only'})):source.scenes.filter(s=>'rooms:'+s.group===context?.id).map(s=>{const count=matchingPages(source,s.id).length;return {...s,kind:'source-room',name:s.label,status:s.status==='unavailable-slot'?'Unavailable native slot':count?count+' editable page(s)':'Not imported'};});
  selected=items.find(i=>i.id===state.room&&same)||items.find(i=>i.id===source.selectedScene)||items[0]||null;
  if(selected?.kind==='source-room')pages=S.investigation?.version===4?services.NativeResourceProject.pageList(services.ProjectStore.capture(),selected.id):matchingPages(source,selected.id);
 }else{
  contexts=project.groups.map(g=>({...g,kind:'project'}));
  context=contexts.find(c=>c.id===state.context&&c.sceneIds.includes(project.scene?.id))||contexts.find(c=>c.id===project.stage?.id)||contexts[0];
  items=context?.id===project.stage?.id?project.rooms.map(r=>({...r,id:r.sceneId,name:r.label,kind:'project-room',status:r.status==='unavailable'?'Unavailable native slot':r.sceneIds.length?r.sceneIds.length+' editable page(s)':'Not imported',disabled:!r.sceneIds.length||r.status==='unavailable'||project.stage.conflict})):project.scenes.filter(s=>context.sceneIds.includes(s.id)).map(s=>({...s,kind:'project-page',status:'Editable project page'}));
  selected=items.find(i=>i.kind==='project-room'?i.sceneIds.includes(project.scene?.id):i.id===project.scene?.id)||null;
  pages=selected?.kind==='project-room'?S.scenes.filter(s=>selected.sceneIds.includes(s.id)):selected?S.scenes.filter(s=>s.id===selected.id):[];
 }
 const query=state.query.trim().toLowerCase();if(query){items=items.filter(i=>(i.name+' '+i.id).toLowerCase().includes(query));if(!items.some(i=>i.id===selected?.id)){selected=null;pages=[];}}
 const page=pages.find(s=>s.id===state.page)||pages.find(s=>s.id===project.scene?.id)||pages[0]||null;
 const conflicts=page?services.StageContext.describe(S.scenes).some(g=>g.conflict&&g.sceneIds.includes(page.id)):false;
 const related=scope==='project'?project:page?{...project,worlds:services.StageContext.relatedWorlds(page,S.scenes,S.worlds||[])}:null;
 const receipt=page?.captureMeta?.nativeAssets,owner=receipt?.spriteSceneId||page?.id;
 const shared=page?[
  'Sprite source used by '+S.scenes.filter(s=>s.id===owner||s.captureMeta?.nativeAssets?.spriteSceneId===owner).length+' project page(s).',
  (related?.worlds.length||0)+' related World(s). World rendering follows its declared tileset page; other pages do not rebind it.'
 ]:[];
 if(scope==='project')for(const clip of project.clips)if(clip.sharedSceneIds.length>1)shared.push(clip.name+' references '+clip.sharedSceneIds.length+' project scenes.');
 const bank=source?.selected&&selected&&source.selected.id===selected.id?source.selected.chrBank4KiB:selected?.backgroundChrBank4KiB;
 if(scope==='source'&&Number.isInteger(bank)){
  const known=source.scenes.filter(s=>s.backgroundChrBank4KiB===bank).length;
  shared.push('Selected source background CHR bank '+bank+'.'+(known?' Referenced by '+known+' catalog room(s).':' Shared uses beyond this selection are unresolved.'));
 }
 return {scope,sourceKey:key,source:source?{name:source.source.name,sha256:source.source.sha256,profile:source.profile?.id||null}:null,contexts,context,items,selected,pages:pages.map(s=>({id:s.id,name:s.name,...(s.resource?{resource:s.resource,page:s.page}:{})})),page:page?{id:page.id,name:page.name,...(page.resource?{resource:page.resource,page:page.page}:{})}:null,conflicts,resources:selected?resources(scope,page,selected,source):[],shared,
  imported:source?source.scenes.filter(s=>matchingPages(source,s.id).length).length:0,catalogued:source?.scenes.length||0,maps:source?.maps.length||0,
  nativeProject:!!S.nativeGame,canUseSaved:!!S.nativeGame&&!!S.importedRom?.length,busy:state.busy,
  buildScope:services.ProjectCapabilities.describe(S).scope,
  projectScene:project.scene?.name||'No scene',project};
}
function sync(){
 const epoch=services.ProjectStore.state.epoch,key=sourceKey(sourceView());
 if(state.epoch!==epoch){state.epoch=epoch;state.scope='project';state.context=null;state.room=state.page=state.query='';}
 const sceneId=S.scenes[S.activeScene]?.id||'';if(lastScene!==sceneId&&state.scope==='project'&&!navigating){state.context=null;state.query='';}lastScene=sceneId;
 if(state.sourceKey!==key){state.sourceKey=key;if(state.scope==='source'){state.context=state.room=state.page=state.query='';}}
}
function selectScope(value){if(!['project','source'].includes(value))fail('Unknown library.');if(value==='source'&&!sourceView())fail('Open an investigated ROM first.');state.scope=value;state.context=state.room=state.page=state.query='';refresh();return describe();}
function selectContext(id){const d=describe(),context=d.contexts.find(c=>c.id===id);if(!context||context.disabled)fail('This context is unavailable or conflicting.');state.context=id;state.room=state.page=state.query='';if(d.scope==='project')navigation(()=>services.SceneContext.selectGroup(id));refresh();return describe();}
function selectRoom(id){
 const d=describe(),item=d.items.find(i=>i.id===id);if(!item||item.disabled)fail('This room is not imported, unavailable or conflicting.');
 state.room=id;state.page='';
 if(d.scope==='project')navigation(()=>{if(item.kind==='project-room')services.SceneContext.selectRoom(id);else services.SceneContext.selectScene(id);});
 else if(item.kind==='source-room'&&item.status!=='Unavailable native slot'&&S.investigation?.version!==4)services.GameREUI.selectSceneById(id);
 refresh();return describe();
}
function selectPage(id){const d=describe();if(!d.pages.some(p=>p.id===id)||d.conflicts)fail('This editable page is unavailable or conflicting.');state.page=id;if(d.scope==='project')navigation(()=>services.SceneContext.selectScene(id));refresh();return describe();}
function search(value){state.query=String(value).slice(0,160);refresh();return describe();}
function close(restore=true){if(!ui)return;ui.root.hidden=true;ui.open.setAttribute('aria-expanded','false');for(const [node,previous]of inertState)node.inert=previous;inertState=[];if(restore)returnFocus?.focus?.();}
function show(){sync();refresh();if(ui.root.hidden){returnFocus=document.activeElement;inertState=[...document.body.children].filter(n=>n!==ui.root).map(n=>[n,!!n.inert]);for(const [node]of inertState)node.inert=true;}ui.root.hidden=false;ui.open.setAttribute('aria-expanded','true');ui.scope.focus?.();return describe();}
function openProject(kind){
 const d=describe();if(!d.selected||!d.page||d.conflicts)fail('Select an available, non-conflicting editable project page.');
 if(!['scene','chr','collision','actors','gameplay','audio','world'].includes(kind))fail('Unknown project resource.');
 if(d.page.resource){const store=services.ProjectStore;store.openNativeResourcePage(d.page.resource,d.page.page,{expected:{epoch:store.state.epoch,snapshot:store.serialize()}});}
 services.SceneContext.selectScene(d.page.id);
 services.SceneContext.openAsset(kind);
 state.scope='project';close(false);refresh();return true;
}
function openSource(kind){
 const d=describe();if(d.scope!=='source'||!d.selected||d.sourceKey!==state.sourceKey)fail('Select a current source resource.');
 if(S.investigation?.version===4){if(!['scenes','graphics'].includes(kind))fail('This source domain remains unresolved.');return openProject(kind==='graphics'?'chr':'scene');}
 if(d.selected.kind==='map'){if(kind!=='map')fail('This selection is a source map.');services.SpatialREUI.openMap(d.selected.id);}
 else {if(d.selected.status==='Unavailable native slot')fail('This native slot is unavailable.');services.GameREUI.openResource(d.selected.id,kind);}
 close(false);return true;
}
function openMaps(){const d=describe();if(!d.source||!d.maps)fail('Open a supported source with decoded maps first.');selectScope('source');return selectContext('maps');}
let pendingTerrain=null;
function matchingTerrainBytes(d){
 const spatial=services.SpatialREUI.sourceSnapshot?.();
 const wanted=d.source?.sha256;
 if(spatial?.bytes&&window.NativeEngineFormat.sha256(spatial.bytes)===wanted)
  return {bytes:Uint8Array.from(spatial.bytes),name:spatial.name||d.source.name};
 // Detached spatial investigation may have discarded its transient snapshot.
 // The project's original ROM may be used only if its SHA-256 EXACTLY matches.
 const retained=S.importedRom;
 if(retained?.length&&window.NativeEngineFormat.sha256(Uint8Array.from(retained))===wanted)
  return {bytes:Uint8Array.from(retained),name:d.source.name+' · preserved project ROM'};
 return null;
}
async function editMap(){
 const d=describe();
 if(d.scope!=='source'||d.selected?.kind!=='map'||d.source?.profile!=='zelda2-us')
  fail('Select a decoded Zelda II overworld map in Investigated source first.');
 const mapId=d.selected.id,source=matchingTerrainBytes(d);
 if(!source){
  pendingTerrain={mapId,sha256:d.source.sha256,epoch:services.ProjectStore.state.epoch,serialized:services.ProjectStore.serialize()};
  ui.status.textContent='The investigated map is read-only until its matching original ROM is available. Select that exact Zelda II ROM to open '+d.selected.name+' in the native editor.';
  ui.terrainFile.click();
  return false;
 }
 pendingTerrain=null;
 // Keep the library open if the native import is cancelled or rejected.
 const ok=await services.NativeWorldUI.openBytes(source.bytes,source.name,mapId);
 if(ok)close(false);
 return !!ok;
}
async function openTerrainFile(file){
 const pending=pendingTerrain;
 pendingTerrain=null;
 if(!file)return false; // File chooser cancellation is not an error.
 if(!pending)fail('Select the map again before choosing a ROM.');
 if(file.size>400000)fail('Selected ROM is too large for the native Zelda II adapter.');
 if(services.ProjectStore.state.epoch!==pending.epoch||services.ProjectStore.serialize()!==pending.serialized)
  fail('The project changed while choosing a Zelda II ROM. Select the source map again.');
 const d=describe();
 if(d.scope!=='source'||d.selected?.kind!=='map'||d.selected.id!==pending.mapId||d.source?.sha256!==pending.sha256)
  fail('The selected map or source changed. Select the intended map again.');
 const bytes=new Uint8Array(await file.arrayBuffer());
 if(window.NativeEngineFormat.sha256(bytes)!==pending.sha256)
  fail('The chosen ROM does not match this investigated Zelda II revision. Nothing was imported.');
 const ok=await services.NativeWorldUI.openBytes(bytes,file.name,pending.mapId,{epoch:pending.epoch,snapshot:pending.serialized});
 if(ok)close(false);
 return !!ok;
}
async function openFile(file){
 if(state.busy)fail('A source is already loading.');state.busy=true;refresh();
 try{const ok=await services.SpatialREUI.openFile(file);if(!ok)fail('The source could not be opened.');sync();state.scope='source';state.context=state.room=state.page=state.query='';refresh();return true;}finally{state.busy=false;refresh();}
}
async function useSavedSource(){
 if(state.busy)fail('A source is already loading.');const store=services.ProjectStore,p=store.capture();
 if(!p.nativeGame)fail('This project has no preserved native source.');
 if(services.ROMProject.matches(p)||services.NativeLayoutProject?.matches(p)||services.NativeResourceProject?.matches(p)){await services.InvestigationUI.open('coverage');sync();state.scope='source';refresh();return true;}
 const {bytes}=services.NativeEngineProject.validate(p),epoch=store.state.epoch,hash=p.nativeGame.sourceSha256;
 state.busy=true;refresh();
 try{const ok=await services.SpatialREUI.openFile({name:p.projectName+' · saved source',size:bytes.length,arrayBuffer:async()=>bytes.slice().buffer},{isCurrent:()=>store.state.epoch===epoch&&S.nativeGame?.sourceSha256===hash});
  if(!ok||store.state.epoch!==epoch||S.nativeGame?.sourceSha256!==hash)fail('The project changed during source loading. Open the intended project and try again.');
  sync();state.scope='source';state.context=state.room=state.page=state.query='';refresh();return true;
 }finally{state.busy=false;refresh();}
}
function prepareCopy(){const d=describe();if(S.investigation?.version===4)return openProject('scene');if(d.scope!=='source'||d.selected?.kind!=='source-room'||d.selected.status==='Unavailable native slot')fail('Select an available source room.');services.GameREUI.openResource(d.selected.id,'scenes');close(false);document.getElementById('nativeGameREPrepareAssets').scrollIntoView?.({block:'center'});document.getElementById('nativeGameREPrepareAssets').focus?.();return true;}
function editLinkedNativeMap(){
 if(!S.nativeGame?.resources?.length||!services.NativeWorldUI?.choose)fail('No editable native World is loaded. Use Open native World for a supported source ROM.');
 const bindings=S.nativeGame.resources.filter(x=>x.mapId),worldId=S.worlds?.[Forge161.worlds.state.selected]?.id,sceneId=S.scenes?.[S.activeScene]?.id;
 const found=bindings.find(x=>x.worldId===worldId)||bindings.find(x=>x.sceneId===sceneId)||(bindings.length===1?bindings[0]:null);
 if(!found)fail('Multiple native overworlds exist. Select the intended World or its resources first.');
 services.NativeWorldUI.choose(found.mapId);close(false);return true;
}
function openNativeEditor(){if(!S.nativeGame||!services.NativeEngineProject.capabilities(S.nativeGame.profile).locationFields)fail('Open a native project first.');close(false);services.SpatialREUI.show();switchTab('disasm');services.NativeEngineUI.refresh();document.getElementById('nativeEngineEditor').scrollIntoView?.({block:'center'});return true;}
function setOptions(node,items,value,empty){node.replaceChildren();const blank=el('option',null,empty);blank.value='!none';blank.disabled=true;node.appendChild(blank);for(const item of items){const o=el('option',null,item.name+(item.status?' · '+item.status:''));o.value=item.id;o.disabled=!!item.disabled;node.appendChild(o);}node.value=items.some(i=>i.id===value)?value:'!none';node.disabled=!items.length;}
function refresh(){
 if(!ui||refreshing)return;refreshing=true;
 try{
  sync();const d=describe();state.context=d.context?.id||'';state.room=d.selected?.id||'';
  ui.scope.value=d.scope;ui.scope.children[1].disabled=!d.source;ui.saved.disabled=!d.canUseSaved||d.busy;ui.file.disabled=d.busy;ui.maps.disabled=!d.maps||d.busy;ui.native.disabled=!d.nativeProject||!services.NativeEngineProject.capabilities(S.nativeGame?.profile).locationFields;
  setOptions(ui.context,d.contexts,d.context?.id,'No contexts available');setOptions(ui.room,d.items,d.selected?.id,'No matching room / map');setOptions(ui.page,d.pages,d.page?.id,'No editable project copy');ui.page.disabled=ui.page.disabled||d.conflicts;ui.search.value=state.query;
  ui.identity.textContent=d.scope==='source'?(d.source?.name||'No source')+' · '+d.catalogued+' catalog slots · '+d.imported+' rooms imported · '+d.maps+' decoded maps':'Project: '+(S.projectName||'Untitled')+' · '+S.scenes.length+' editable pages';
  ui.selection.textContent=d.selected?d.selected.name+' · '+d.selected.status:'No selection';
  ui.scopeNote.textContent=d.scope==='source'&&S.investigation?.version===2?'Preserved ROM source. No verified areas, stages or maps are decoded. Editable physical CHR sheets are under Editable project; use Project investigation for bytes and coverage.':d.scope==='source'?'Browsing source evidence. Active project page: '+d.projectScene+'. Open an editable copy explicitly to change project tabs.':'Project selection follows Scene, CHR, Collision and scene entities. Gameplay actors have an explicit placement destination; Audio remains project-wide.';
  ui.build.textContent=d.buildScope;
  ui.resources.replaceChildren();for(const r of d.resources){const tr=el('tr');for(const value of [r.name,r.inspect,r.edit,r.build])tr.appendChild(el('td',null,value));ui.resources.appendChild(tr);}
  ui.shared.textContent=d.shared.join(' ')+(d.conflicts?' Source context receipts conflict; editable-copy navigation is refused.':'');
  const room=d.scope==='source'&&d.selected?.kind==='source-room'&&d.selected.status!=='Unavailable native slot';
  ui.sourceActions.hidden=d.scope!=='source';for(const b of ui.sourceButtons){b.disabled=!room||d.busy||(S.investigation?.version===4&&!['areaLibrarySource-scenes','areaLibrarySource-graphics'].includes(b.id));if(['areaLibrarySource-scenes','areaLibrarySource-graphics'].includes(b.id))b.textContent=S.investigation?.version===4?(b.id.endsWith('scenes')?'Open recovered page in Scene':'Open recovered page in CHR'):(b.id.endsWith('scenes')?'Inspect source scene':'Inspect source CHR');}
  ui.map.disabled=d.scope!=='source'||d.selected?.kind!=='map'||d.busy;
  ui.editMap.disabled=ui.map.disabled||d.source?.profile!=='zelda2-us';
  ui.nativeMapButton.hidden=d.scope!=='project';
  ui.nativeMapButton.disabled=d.busy||!S.nativeGame?.resources?.some(x=>x.mapId);
  ui.copy.disabled=!room||d.busy;ui.copy.textContent=S.investigation?.version===4?'Open selected recovered page':'Prepare editable copy…';for(const b of ui.projectButtons)b.disabled=!d.page||d.conflicts||d.busy;
  document.getElementById('areaLibraryProject-world').disabled=!d.page||d.conflicts||d.busy||!(d.scope==='project'?d.project.worlds.length:d.page&&services.StageContext.relatedWorlds(S.scenes.find(s=>s.id===d.page.id),S.scenes,S.worlds||[]).length);
  ui.sharedNote.hidden=!d.source&&!d.project.source;
  ui.sharedNote.textContent='Source table membership does not establish stage order or reachability. Native entrances, conditional collision, quest state and complete event links remain incomplete.';
 }finally{refreshing=false;}
}
function mount(){
 const parent=document.getElementById('sceneContext')?.parentNode;if(!parent)return;
 const safe=fn=>async()=>{try{ui.status.textContent='';await fn();}catch(e){ui.status.textContent=e.message||String(e);}finally{refresh();}};
 const open=el('button','areaLibraryOpen','Area library');open.type='button';open.setAttribute('aria-expanded','false');open.setAttribute('aria-controls','areaLibrary');open.addEventListener('click',show);parent.insertBefore(open,document.getElementById('sceneContext'));
 const root=el('section','areaLibrary');root.hidden=true;root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-labelledby','areaLibraryTitle');
 const top=el('div');top.className='area-row';top.appendChild(el('h2','areaLibraryTitle','Game / area library'));const button=(host,id,text,fn)=>{const b=el('button',id,text);b.type='button';b.addEventListener('click',safe(fn));host.appendChild(b);return b;};button(top,'areaLibraryClose','Close',close);root.appendChild(top);
 const identity=el('p','areaLibraryIdentity'),status=el('p','areaLibraryStatus');status.setAttribute('role','status');root.append(identity,status);
 const controls=el('div');controls.className='area-controls';root.appendChild(controls);
 const field=(host,text,id,tag='select')=>{const label=el('label',null,text),input=el(tag,id);label.htmlFor=id;label.appendChild(input);host.appendChild(label);return input;};
 const scope=field(controls,'Library','areaLibraryScope');for(const [id,name]of [['project','Editable project'],['source','Investigated source']]){const o=el('option',null,name);o.value=id;scope.appendChild(o);}scope.addEventListener('change',safe(()=>selectScope(scope.value)));
 const context=field(controls,'Area / source context','areaLibraryContext');context.addEventListener('change',safe(()=>selectContext(context.value)));
 const searchInput=field(controls,'Find room / map','areaLibrarySearch','input');searchInput.type='search';searchInput.addEventListener('input',()=>search(searchInput.value));
 const room=field(controls,'Room / map','areaLibraryRoom');room.addEventListener('change',safe(()=>selectRoom(room.value)));
 const page=field(controls,'Editable scene / page','areaLibraryPage');page.addEventListener('change',safe(()=>selectPage(page.value)));
 const selection=el('h3','areaLibrarySelection'),scopeNote=el('p','areaLibraryScopeNote');root.append(selection,scopeNote);
 const actions=el('div');actions.className='area-row';root.appendChild(actions);const projectButtons=[];for(const [kind,label]of [['scene','Edit scene'],['chr','Edit CHR'],['world','Open room World'],['collision','Edit authored collision'],['actors','Edit scene entities'],['gameplay','Gameplay actors · choose placement'],['audio','Audio (project)']])projectButtons.push(button(actions,'areaLibraryProject-'+kind,label,()=>openProject(kind)));
 const nativeMapButton=button(actions,'areaLibraryProject-native-map','Edit linked native overworld',()=>editLinkedNativeMap());
 const sourceActions=el('div');sourceActions.className='area-row';root.appendChild(sourceActions);const sourceButtons=[];for(const [kind,label]of [['scenes','Inspect source scene'],['graphics','Inspect source CHR'],['actors','Inspect source actors'],['animation','Inspect source poses / scripts']])sourceButtons.push(button(sourceActions,'areaLibrarySource-'+kind,label,()=>openSource(kind)));
 const map=button(sourceActions,'areaLibraryMap','View source map',()=>openSource('map')),editMapButton=button(sourceActions,'areaLibraryEditMap','Edit selected overworld (native)',editMap),copy=button(sourceActions,'areaLibraryCopy','Prepare editable copy…',prepareCopy);
 const terrainFile=el('input','areaLibraryTerrainFile');terrainFile.type='file';terrainFile.accept='.nes';terrainFile.hidden=true;terrainFile.setAttribute('aria-label','Matching Zelda II ROM for selected overworld');terrainFile.addEventListener('change',safe(async()=>{try{await openTerrainFile(terrainFile.files?.[0]);}finally{terrainFile.value='';}}));sourceActions.appendChild(terrainFile);
 const build=el('p','areaLibraryBuild');root.appendChild(build);const scroll=el('div');scroll.className='area-table';const table=el('table'),head=el('thead'),row=el('tr');for(const text of ['Resource','Inspect','Edit','Rebuild'])row.appendChild(el('th',null,text));head.appendChild(row);const resourcesBody=el('tbody','areaLibraryResources');table.append(head,resourcesBody);scroll.appendChild(table);root.appendChild(scroll);
 const shared=el('p','areaLibraryShared'),sharedNote=el('p','areaLibraryLimits');root.append(shared,sharedNote);
 const sourceControls=el('div');sourceControls.className='area-controls';root.appendChild(sourceControls);const file=field(sourceControls,'Open investigated ROM','areaLibraryFile','input');file.type='file';file.accept='.nes';file.addEventListener('change',safe(()=>openFile(file.files?.[0])));
 const saved=button(sourceControls,'areaLibrarySaved','Browse saved native game',useSavedSource),maps=button(sourceControls,'areaLibraryMaps','Overworld / native maps',openMaps),native=button(sourceControls,'areaLibraryNative','Native location editor · 4 fields',openNativeEditor);
 document.body.appendChild(root);ui={root,open,scope,context,room,page,search:searchInput,identity,status,selection,scopeNote,build,resources:resourcesBody,shared,sharedNote,sourceButtons,sourceActions,projectButtons,nativeMapButton,map,editMap:editMapButton,terrainFile,copy,file,saved,maps,native};
 root.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault?.();close();}
  if(event.key==='Tab'){
   const focusable=[...root.querySelectorAll('button,input,select')].filter(n=>!n.disabled&&!n.hidden&&n.getClientRects().length),first=focusable[0],last=focusable.at(-1);
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  }
  event.stopPropagation?.();
 });root.addEventListener('keyup',event=>event.stopPropagation?.());
 const style=el('style');style.textContent='#areaLibraryOpen{min-height:44px;padding:6px 14px;background:#23485c;color:#e7fff9;border:1px solid #568087;border-radius:5px;cursor:pointer}#areaLibrary[hidden],#areaLibrary [hidden]{display:none!important}#areaLibrary input[type=file]{display:block}#areaLibrary{position:fixed;z-index:11000;inset:16px;max-width:1150px;margin:auto;background:#101e2d;color:#e3edf7;border:1px solid #568087;border-radius:12px;padding:20px;overflow:auto;box-shadow:0 0 0 100vmax #030810cc;font:13px/1.5 system-ui;box-sizing:border-box;overflow-wrap:anywhere}#areaLibrary *{box-sizing:border-box}#areaLibrary h2{margin:0;flex:1}#areaLibrary .area-row,#areaLibrary .area-controls{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0;align-items:end}#areaLibrary label{display:flex;flex:1 1 190px;min-width:0;flex-direction:column;gap:4px}#areaLibrary button,#areaLibrary select,#areaLibrary input{font:inherit;min-height:44px;min-width:0;max-width:100%;padding:8px;background:#20394e;color:#e7fff9;border:1px solid #527b82;border-radius:5px}#areaLibrary select,#areaLibrary input{width:100%}#areaLibrary button{cursor:pointer}#areaLibrary button:disabled{opacity:.45;cursor:default}#areaLibrary button:focus-visible,#areaLibrary select:focus-visible,#areaLibrary input:focus-visible{outline:2px solid #8bedd1;outline-offset:2px}#areaLibrary .area-table{overflow-x:auto}#areaLibrary table{width:100%;border-collapse:collapse;font-size:12px}#areaLibrary th,#areaLibrary td{text-align:left;vertical-align:top;padding:9px;border-bottom:1px solid #365268;min-width:120px}#areaLibraryBuild{padding:10px;border-left:3px solid #d8b26c;background:#26313a}#areaLibraryStatus{color:#ffbf96}#areaLibraryScopeNote,#areaLibraryShared,#areaLibraryLimits{color:#b9ccd9}@media(max-width:600px){#areaLibrary{inset:6px;padding:12px;border-radius:8px}#areaLibrary .area-controls{display:block}#areaLibrary label{margin-bottom:10px}#areaLibrary .area-row button{flex:1 1 140px}#areaLibrary h2{font-size:19px}}';document.head.appendChild(style);refresh();
}
services.AreaLibrary=Object.freeze({describe,show,close,selectScope,selectContext,selectRoom,selectPage,search,openProject,openSource,openMaps,editMap,openFile,useSavedSource,prepareCopy,openNativeEditor});services.AreaLibraryUI=Object.freeze({refresh});mount();
})();
