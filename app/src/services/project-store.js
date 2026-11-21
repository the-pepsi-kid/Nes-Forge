/* NES FORGE CONNECTION: src/services/project-store.js
 * Canonical lifecycle: capture -> prepareLoad -> commit/load; recovery epoch and persistence
 * stay here. Punch-Out UI materializers use these APIs plus the existing snapshot/Undo owner.
 * Native-source projects write schema 16; ordinary authored projects retain schema 12.
 */
/* NES Forge 1.9.0 — authoritative project serialization and lifecycle.
 * Schema 12 rejects older editors that cannot preserve Gameplay Core records.
 * Unresolved authored references still survive saves for deliberate repair.
 * The protected scene/raster normalizers, undo engine and Save As implementation
 * remain their existing owners. This service never invokes an old project loader.
 */
(()=>{
'use strict';
const Forge=window.Forge=window.Forge||{};
Forge.services=Forge.services||{};
const cp=value=>JSON.parse(JSON.stringify(value)), $=id=>document.getElementById(id);
const state={epoch:0,recoveryPhase:'checking',recoveryToken:0,lastIntent:'startup'};
const preparedLoads=new WeakSet();
const portableCompletions=new WeakSet();
let checkPromise=null;
let projectEditActive=false;
const fail=message=>{throw Error(message);};
S.nativeGame=null;
S.investigation=null;
function status(message){
  if(Forge.release?.updateStatus)return Forge.release.updateStatus(message);
  const el=$('forge15State');if(!el)return;
  const clock=t=>t?new Date(t).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'}):'—';
  const r=Forge15.recovery;el.className=Forge15.dirty?'dirty':'clean';el.dataset.recovery=r?.level||'';
  el.textContent=message||((Forge15.dirty?'● Unsaved changes':'✓ Saved')+' · '+(r?.text||'recovery '+clock(Forge15.lastRecovery)));
  el.title=(Forge15.dirty?'Unsaved changes: not yet saved to a project file or browser save.':'Saved: no changes since the last save.')+'\n'+(r?.detail||'')+'\nBrowser save: '+clock(Forge15.lastBrowserSave)+'\nRecovery copy: '+clock(Forge15.lastRecovery)+'\nPortable save: '+clock(Forge15.lastPortable);
}
function writeSchema(){return S.nativeGame?.version===3?16:S.nativeGame?.version===2?15:S.investigation?14:S.nativeGame?13:12;}
function assertTarget(options){const target=options?.targetVersion??options?.targetSchema,schema=writeSchema();if(target!==undefined&&target!==schema)fail('Project schema '+schema+' is required: downgrade or format changes would lose native recipes or canonical authoring records. Export with this project format or retain the original older file.');}
// The ROM's base64 is reused while its bytes are unchanged (checked by a fast checksum, not by identity alone).
const romText=new WeakMap();
function romBase64(bytes){
  let sum=2166136261;for(let i=0;i<bytes.length;i++)sum=Math.imul(sum^bytes[i],16777619);
  const hit=romText.get(bytes);if(hit&&hit.length===bytes.length&&hit.sum===sum)return hit.text;
  const text=bytesToBase64(bytes);romText.set(bytes,{length:bytes.length,sum,text});return text;
}
// The project's fields as live references (no copy). capture() is a deep copy of this; crash recovery reads it per
// section so an edit to one scene does not copy or rewrite the whole project.
function captureFields(options={}){
  assertTarget(options);
  Forge164.model.ensure();
  saveCurrentScene();
  Forge161.worlds.ensure();
  S.asmSource=$('codeInput')?.value??S.asmSource;
  return {format:'NESForge',version:writeSchema(),foundation:Forge.release.version,romLayout:Forge.services.WorldConfig.get().enabled?4:3,worldAuthoring:3,
    metatileExtension:1,metaspriteExtension:2,entityAnimationExtension:1,
    chr:S.chr,sprChr:S.sprChr,nt:S.nt,attr:S.attr,pal:S.pal,sprPal:S.sprPal,oam:S.oam,
    scenes:S.scenes,activeScene:S.activeScene,asmSource:S.asmSource,instruments:S.instruments,
    patterns:S.patterns,orderList:S.orderList,tempo:S.tempo,speed:S.speed,audRows:S.audRows,sfx:S.sfx,
    tileProps:S.tileProps,animations:S.animations,metasprites:S.metasprites,worlds:S.worlds,
    mapper:S.mapper,mirroring:S.mirroring,hasSRAM:S.hasSRAM,prgBanks:S.prgBanks,chrBanks:S.chrBanks,
    packScenes:S.packScenes!==false,projectName:S.projectName,
    importedRom:S.importedRom?romBase64(S.importedRom):null,
    ...(S.nativeGame?{nativeGame:S.nativeGame}:{}),
    ...(S.investigation?{investigation:S.investigation}:{}),
    ...(options.includeEditorView===true?{editorView:Forge.services.EditorView?.capture()||{worldId:S.worlds[Forge161.worlds.state.selected]?.id}}:{}),
    selTile:S.selTile,editTile:S.editTile,selSprite:S.selSprite,selEntity:S.selEntity,chrBank:S.chrBank,
    _selAnim:S._selAnim||0,_animFrame:S._animFrame||0,gameplay:Forge165.config.get(),worldRuntime:Forge.services.WorldConfig.get(),audioRuntime:Forge.services.AudioConfig.get(),gameplayCore:S.gameplayCore||Forge.services.GameplayModel.defaults()};
}
function capture(options={}){return cp(captureFields(options));}
function serialize(options={}){return JSON.stringify(Store.capture(options));}
// View preferences are excluded only at explicit authoring-source boundaries.
// Raw recipe v1 hashing remains unchanged and still hashes every supplied field.
function authoringData(input){const data=typeof input==='string'?JSON.parse(input):cp(input);delete data.editorView;return data;}
function uniqueIds(items,label){const ids=new Set();for(const item of items||[]){if(item?.id===undefined)continue;if(typeof item.id!=='string'||!item.id)fail('Invalid '+label+' ID');if(ids.has(item.id))fail('Duplicate '+label+' ID');ids.add(item.id);}}
function validateMetatiles(raw){for(const [si,sc] of raw.scenes.entries()){
  if(sc.metatiles!=null&&!Array.isArray(sc.metatiles))fail('Invalid metatile library in scene '+(si+1));
  if((sc.metatiles?.length||0)>255)fail('Scene '+(si+1)+' exceeds 255 metatiles');
  const ids=new Set();for(const [mi,m] of (sc.metatiles||[]).entries()){
    if(!m||typeof m!=='object'||Array.isArray(m))fail('Invalid metatile entry '+mi+' in scene '+(si+1));
    if(!Array.isArray(m.tiles)||m.tiles.length!==4)fail('Metatile '+mi+' needs four CHR tile IDs');
    if(m.collision!=null&&(!Array.isArray(m.collision)||m.collision.length!==4)&&!Number.isFinite(Number(m.collision)))fail('Metatile '+mi+' has invalid collision data');
    if(Number.isInteger(m.id)){if(m.id<0||m.id>=255||ids.has(m.id))fail('Metatile IDs must be unique 0–254');ids.add(m.id);}
  }
  if(sc.metaMap!=null){if(!Array.isArray(sc.metaMap)||sc.metaMap.length!==240)fail('Scene '+(si+1)+' metatile map must contain 240 cells');for(const v of sc.metaMap)if(v!==-1&&(!Number.isInteger(v)||!ids.has(v)))fail('Scene '+(si+1)+' metatile map references an unknown definition');}
}}
function validateWorlds(raw){
  if(raw.worlds!=null&&!Array.isArray(raw.worlds))fail('Invalid worlds collection');
  if((raw.worlds?.length||0)>32)fail('Project exceeds 32 worlds');
  uniqueIds(raw.worlds,'world');
  for(const w of raw.worlds||[]){
    if(!w||typeof w!=='object'||Array.isArray(w))fail('Invalid world');
    const sx=Number(w.widthScreens),sy=Number(w.heightScreens);
    if(!Number.isInteger(sx)||sx<1||sx>16||!Number.isInteger(sy)||sy<1||sy>16)fail('World dimensions must be 1–16 screens');
    if(!Array.isArray(w.map)||w.map.length!==sx*16*sy*15)fail('World map size does not match dimensions');
    for(const v of w.map)if(!Number.isInteger(v)||v<-1||v>254)fail('World metatile IDs must be integers from -1 through 254');
    for(const [key,max] of [['rooms',128],['markers',256],['cameraRegions',128],['stairs',128]]){
      if(w[key]!=null&&(!Array.isArray(w[key])||w[key].length>max))fail('Invalid world '+key+' collection');
      for(const item of w[key]||[])if(!item||typeof item!=='object'||Array.isArray(item))fail('Invalid world '+key+' entry');
      uniqueIds(w[key],'world '+key);
    }
  }
}
function validateShape(d){
  if(d&&typeof d==='object'&&['NESForgeREInspection','NESForgeREPreviewEvidence','NESForgeRERecovery'].includes(d.format))fail('This is an RE inspection report, not a Forge project. Open its original ROM in RE / DISASM, then use Import as new project or Download Forge project JSON for a supported recovery profile.');
  if(!d||typeof d!=='object'||Array.isArray(d)||!Array.isArray(d.scenes)||!d.scenes.length||d.scenes.length>64)fail('Invalid project: expected 1–64 scenes');
  if(d.version!==undefined&&(!Number.isInteger(d.version)||d.version<1))fail('Invalid project schema version: expected a positive integer');
  if(d.version>Forge.release.schema)fail('This project needs a newer NES Forge version');
  if(d.version===16&&d.nativeGame?.version!==3)fail('Schema 16 requires a portable ROM project descriptor.');
  if(d.format!==undefined&&d.format!=='NESForge')fail('Invalid project format');
  for(const [key,max] of [['romLayout',4],['worldAuthoring',3],['metatileExtension',1],['metaspriteExtension',2],['entityAnimationExtension',1]]){
    if(d[key]!==undefined&&(!Number.isInteger(d[key])||d[key]<1||d[key]>max))fail('Unsupported project '+key+' version');
  }
  for(const key of ['instruments','patterns','orderList','animations','metasprites','sfx'])if(d[key]!=null&&!Array.isArray(d[key]))fail('Invalid project collection: '+key);
  if((d.patterns?.length||0)>256||(d.instruments?.length||0)>256||(d.orderList?.length||0)>1024)fail('Project audio collections exceed supported limits');
  for(const key of ['instruments','patterns','animations','sfx'])for(const item of d[key]||[])if(!item||typeof item!=='object'||Array.isArray(item))fail('Invalid '+key+' entry');
  if((d.version||0)>=11){
    uniqueIds(d.sfx,'SFX');
    for(const item of d.sfx||[])if(typeof item.id!=='string'||!item.id.trim()||item.id.length>80||typeof item.name!=='string'||!item.name.trim()||item.name.length>80)fail('Schema 11 SFX require nonempty ID and name text of at most 80 characters');
  }
  for(const item of d.instruments||[])for(const key of ['volEnv','dutyEnv','arpEnv'])if(item[key]!=null&&!Array.isArray(item[key]))fail('Invalid instrument envelope');
  for(const item of d.animations||[]){if(item.frames!=null&&!Array.isArray(item.frames))fail('Invalid animation frames');for(const f of item.frames||[])if(!f||typeof f!=='object')fail('Invalid animation frame');}
  for(const row of d.orderList||[])if(!Array.isArray(row))fail('Invalid pattern order row');
  for(const sc of d.scenes){if(!sc||typeof sc!=='object'||Array.isArray(sc))fail('Invalid scene entry');for(const key of ['entities','links','oam']){if(sc[key]!=null&&!Array.isArray(sc[key]))fail('Invalid scene '+key);for(const item of sc[key]||[])if(!item||typeof item!=='object'||Array.isArray(item))fail('Invalid scene '+key+' entry');}if((sc.oam?.length||0)>64)fail('Scene exceeds 64 OAM sprites');}
  uniqueIds(d.scenes,'scene');validateMetatiles(d);validateWorlds(d);
  Forge.services.GameplayModel.validateProject(Forge.services.GameplayModel.normalize(d.gameplayCore),d,{references:true,executable:false});
  Forge164.model.validateProject(d,{references:false});
}
function prepareLoad(input){
  // All potentially rejecting parsing, validators and normalizers run before
  // playback/history/live mirrors are touched.
  const text=typeof input==='string'?input:JSON.stringify(input);
  if(!text||text.length>64*1024*1024)fail('Project is too large or missing');
  const d=JSON.parse(text);validateShape(d);
  const gameplay=d.gameplay===undefined?Forge165.config.defaults():d.gameplay;Forge165.config.validate(gameplay);
  const worldRuntime=d.worldRuntime===undefined?Forge.services.WorldConfig.defaults():d.worldRuntime;Forge.services.WorldConfig.validate(worldRuntime);
  const audioRuntime=d.audioRuntime===undefined?Forge.services.AudioConfig.defaults():d.audioRuntime;Forge.services.AudioConfig.validate(audioRuntime);
  const gameplayCore=Forge.services.GameplayModel.normalize(d.gameplayCore);Forge.services.GameplayModel.validateProject(gameplayCore,d,{references:true,executable:false});
  const rom=typeof d.importedRom==='string'?base64ToBytes(d.importedRom):Array.isArray(d.importedRom)?Uint8Array.from(d.importedRom):null;
  if(rom&&!Forge.services.ROMProject?.matches(d))parseRomHeader(rom);
  if(d.nativeGame!==undefined)Forge.services.NativeEngineProject.validate(d);
  if(d.investigation!==undefined)Forge.services.InvestigationProject.validate(d);
  let frames=d.metasprites||[];
  if(d.version===6)Forge163.persistence.validate(frames,d.animations||[],d.scenes,{references:false});
  else if((d.version||0)<6&&frames.length){
    if(!frames.every(f=>f&&Array.isArray(f.pieces)&&f.sceneId))fail('Legacy metasprite data is not a composer frame collection. Open it in its originating editor and export it before migration.');
    frames=Forge163.metasprites.normalizeAll(frames);
  }
  const scenes=d.scenes.map((sc,i)=>makeScene({...sc,chr:sc.chr||d.chr||normalizeTiles(),sprChr:sc.sprChr||d.sprChr||normalizeTiles(),tileProps:sc.tileProps||d.tileProps,buildOrder:Number.isFinite(sc.buildOrder)?sc.buildOrder:i}));
  const active=clamp(d.activeScene,0,scenes.length-1);
  if(!d.version){for(const k of ['nt','attr','pal','sprPal','oam'])if(Array.isArray(d[k]))scenes[active][k]=cp(d[k]);if(d.pal?.[0]?.[0]!==undefined)scenes[active].bgColor=d.pal[0][0];scenes[active]=makeScene(scenes[active]);}
  const patterns=Array.isArray(d.patterns)&&d.patterns.length?d.patterns.map(p=>({rows:Array.from({length:clamp(p.rows?.length||d.audRows||64,16,128,64)},(_,r)=>Array.from({length:5},(_,ch)=>({note:clamp(p.rows?.[r]?.[ch]?.note??-1,-2,95,-1),inst:clamp(p.rows?.[r]?.[ch]?.inst??-1,-1,255,-1),vol:clamp(p.rows?.[r]?.[ch]?.vol??-1,-1,15,-1),fx:clamp(p.rows?.[r]?.[ch]?.fx,0,255),fxp:clamp(p.rows?.[r]?.[ch]?.fxp,0,255)})))})):[{rows:Array.from({length:64},()=>Array.from({length:5},()=>({note:-1,inst:-1,vol:-1,fx:0,fxp:0})))}];
  const instruments=(d.instruments||[]).map(i=>({name:String(i.name||'Instrument').slice(0,80),volEnv:Array.from(i.volEnv?.length?i.volEnv:[15],v=>clamp(v,0,15)).slice(0,256),dutyEnv:[clamp(i.dutyEnv?.[0],0,3,2)],arpEnv:Array.from(i.arpEnv?.length?i.arpEnv:[0],v=>clamp(v,-24,24)).slice(0,256),pitchEnv:[0],loopVol:clamp(i.loopVol??-1,-1,255,-1),loopArp:clamp(i.loopArp??-1,-1,255,-1)}));
  const sfx=(d.sfx||[]).map((item,index)=>({...cp(item),id:String(item.id||('legacy-sfx-'+index)).slice(0,80),name:String(item.name||('SFX '+(index+1))).slice(0,80),channel:clamp(item.channel,0,3,0),pattern:clamp(item.pattern,0,255,0),startRow:clamp(item.startRow,0,127,0),endRow:clamp(item.endRow,0,127,Math.min(15,clamp(d.audRows,16,128,64)-1))}));
  const animations=(d.animations||[]).map(a=>({...a,id:a.id||Forge164.model.uid('anim'),name:String(a.name||'Animation'),frames:(a.frames?.length?a.frames:[{tileIdx:0,duration:8}]).map(f=>({tileIdx:clamp(f.tileIdx,0,255),duration:clamp(f.duration,1,255,8),...(f.metaspriteId?{metaspriteId:f.metaspriteId}:{}),...(f.sceneId?{sceneId:f.sceneId}:{}),hitboxes:cp(f.hitboxes||[]),hurtboxes:cp(f.hurtboxes||[]),events:cp(f.events||[])}))}));
  // normalizeWorld preserves numeric unresolved IDs and target strings. Unlike
  // the old loader, no reconcileWorld call may replace unresolved cells by -1.
  const worlds=(d.worlds||[]).map(w=>Forge161.worlds.normalize({...w,tilesetSceneId:w.tilesetSceneId||scenes[0].id}));
  const prepared={data:d,editorView:Forge.services.EditorView?.read(d.editorView)||null,scenes,active,rom,chrBanks:rom&&!Forge.services.ROMProject?.matches(d)?romChrBanks(rom):[],patterns,instruments,sfx,animations,metasprites:cp(frames),worlds,gameplay:cp(gameplay),worldRuntime:cp(worldRuntime),audioRuntime:Forge.services.AudioConfig.normalize(audioRuntime),gameplayCore:cp(gameplayCore)};
  preparedLoads.add(prepared);return prepared;
}
function refresh(){
  rebuildAllUI();Forge161.worlds.renderUI();Forge163.metasprites.render();
  Forge164.frameEditor?.refresh();Forge164.studio?.refresh();
  if(Forge165.ui){Forge165.ui.state.message='';Forge165.ui.refresh(true);}
  Forge166.ui?.refresh();
  Forge.services.WorldUI?.refresh(true);
  Forge.services.AudioUI?.refresh();
  Forge.services.GameplayUI?.refresh(true);
  Forge.services.NativeEngineUI?.refresh();
  Forge.services.SceneContextUI?.refresh();
  Forge.services.NativeWorldUI?.refresh();
}
function commit(prepared,options={}){
  if(!preparedLoads.has(prepared))fail('ProjectStore.commit requires a prepared project');
  const p=prepared,d=p.data,external=!options.history&&!options.sync,priorWorldId=S.worlds[Forge161.worlds.state.selected]?.id,priorView=!external&&options.replace!==true?Forge.services.EditorView?.capture():null;
  if(external||options.replace===true){
    emuPause();aud_stop();anim_stopPreview();emu.loaded=false;window._lastBuiltRom=null;disasm_output='';disasm_asmText='';
    if(external){undoStack.length=0;redoStack.length=0;undoBytes=0;}S.projectId=null;
    for(const id of ['emuRunBtn','emuStepBtn','emuResetBtn','emuCapBtn','emuCapFrameBtn','emuCapHybridBtn','emuTraceBtn'])$(id).disabled=true;
  }
  state.epoch++;state.lastIntent=options.intent||(options.history?'history':options.sync?'sync':'open');
  S.scenes=p.scenes;S.activeScene=p.active;S.importedRom=p.rom;S.allChrBanks=p.chrBanks;S.chrBankIdx=0;
  S.nativeGame=d.nativeGame?cp(d.nativeGame):null;
  S.investigation=d.investigation?cp(d.investigation):null;
  S.asmSource=String(d.asmSource||'');$('codeInput').value=S.asmSource;S.asmBinary=null;S.asmErrors=[];S.asmSymbols={};S._asmWrites=null;
  S.instruments=p.instruments;S.patterns=p.patterns;S.orderList=(d.orderList?.length?d.orderList:[[0,0,0,0,0]]).map(row=>Array.from({length:5},(_,ch)=>clamp(row[ch],0,p.patterns.length-1)));
  S.tempo=clamp(d.tempo,30,300,150);S.speed=clamp(d.speed,1,15,6);S.audRows=clamp(d.audRows,16,128,64);S.sfx=cp(p.sfx);
  S.animations=p.animations;S.metasprites=p.metasprites;S.worlds=p.worlds;S.gameplay=p.gameplay;S.worldRuntime=p.worldRuntime;S.audioRuntime=p.audioRuntime;S.gameplayCore=p.gameplayCore;
  S.mapper=clamp(d.mapper,0,4095);S.mirroring=d.mirroring==='h'?'h':'v';S.hasSRAM=!!d.hasSRAM;S.prgBanks=clamp(d.prgBanks,1,4095,1);S.chrBanks=clamp(d.chrBanks,0,4095,1);S.packScenes=d.packScenes!==false;S.projectName=String(d.projectName||'Untitled').slice(0,120);
  Forge164.model.ensure();
  loadSceneData(p.active);
  for(const k of ['selTile','editTile','selSprite','selEntity','_selAnim','_animFrame'])if(Number.isInteger(d[k]))S[k]=d[k];
  S._selAnim=clamp(S._selAnim,0,Math.max(0,S.animations.length-1));S._animFrame=clamp(S._animFrame,0,Math.max(0,(S.animations[S._selAnim]?.frames.length||1)-1));S.chrBank=d.chrBank==='spr'?'spr':'bg';
  for(const sc of S.scenes){sceneLinks(sc);Forge16.metatiles.reconcile(sc);}
  aud_selectedInst=S.instruments.length?0:-1;aud_currentRow=0;aud_currentOrder=0;
  const w=Forge161.worlds.state;
  // Optional browsing state is not gameplay ownership or runtime start. Older
  // readers may discard it; absent, malformed or stale IDs use the old default.
  const viewId=p.editorView?.worldId||null;
  const selectedId=viewId||(!external?priorWorldId:null);
  w.selected=Math.max(0,S.worlds.findIndex(world=>world.id===selectedId));w.panX=w.panY=0;
  $('undoBtn').disabled=!undoStack.length;
  if(external){Forge15.dirty=false;status('Loaded project');}
  if(Forge.services.EditorView)Forge.services.EditorView.restore(p.editorView,priorView,refresh);else refresh();
  Forge.services.InvestigationUI?.projectChanged();
  recoveryCommitted(options);return true;
}
function recoveryCommitted(options){
  if(typeof rec==='undefined'||!rec.enabled)return;
  if(options.history)return noteChange('edit','snapshot');
  if(rec.meaningful||options.intent!=='startup'){rec.meaningful=true;publishStatus();schedule();}
}
function load(input,options={}){return Store.commit(Store.prepareLoad(input),options);}
// Bounded canonical edits are not project replacement. Only private preparers
// below may declare assignments/appends; callers never supply mutation code.
// Unrelated prepared data stays detached so authoring caches are not reloaded.
function runEdit(kind,options,prepare){
  if(projectEditActive)fail('A project '+kind+' transaction is already in progress.');
  projectEditActive=true;
  try{
    const expected=options.expected;
    if(!expected||!Number.isInteger(expected.epoch)||typeof expected.snapshot!=='string')fail('A project '+kind+' edit requires its captured project guard.');
    const check=()=>{if(undoPaused)fail('Wait for the current history operation to finish before editing project '+kind+'.');if(!currentRead(expected))fail('The current project changed. Capture it and preview again.');};
    check();
    const edit=prepare(JSON.parse(expected.snapshot)),keys=Object.keys(edit.values),originals={};
    for(const key of keys){const descriptor=Object.getOwnPropertyDescriptor(S,key);if(!descriptor||!Object.hasOwn(descriptor,'value')||!descriptor.writable)fail('Project '+kind+' '+key+' cannot be edited in the current state.');originals[key]=descriptor;}
    const append=edit.append;
    if(append&&(!Array.isArray(append.list)||!Object.isExtensible(append.list)||!Object.getOwnPropertyDescriptor(append.list,'length')?.writable))fail('Project scene collection cannot be edited in the current state.');
    check();
    if(!edit.effective)return {applied:false,warnings:[]};
    const history={undo:undoStack.slice(),redo:redoStack.slice(),bytes:undoBytes,disabled:$('undoBtn').disabled,dirty:Forge15.dirty};
    const expectedUndo=history.undo.concat(expected.snapshot);let expectedBytes=history.bytes+expected.snapshot.length;
    while(expectedUndo.length>MAX_UNDO||(expectedBytes>24*1024*1024&&expectedUndo.length>1))expectedBytes-=expectedUndo.shift().length;
    let installing=false;
    try{
      const accepted=snapshot();
      if(accepted===false||undoPaused||undoBytes!==expectedBytes||redoStack.length||undoStack.length!==expectedUndo.length||undoStack.some((entry,i)=>entry!==expectedUndo[i]))fail('The history snapshot did not accept exactly one project '+kind+' edit.');
      check();installing=true;
      if(append)Array.prototype.push.call(append.list,append.scene);
      for(const key of keys)S[key]=edit.values[key];
      Forge15.dirty=true;
    }catch(error){
      if(installing){for(const key of keys)Object.defineProperty(S,key,originals[key]);if(append)append.list.length=append.index;}
      undoStack.splice(0,undoStack.length,...history.undo);redoStack.splice(0,redoStack.length,...history.redo);undoBytes=history.bytes;$('undoBtn').disabled=history.disabled;Forge15.dirty=history.dirty;
      throw error;
    }
    // Canonical data is complete before presentation runs. Its failures remain
    // explicit committed warnings, never an apparent rollback or second Undo.
    const warnings=[];
    try{notify(options.intent||edit.intent);}catch(error){warnings.push('change notification: '+(error.message||String(error)));}
    for(const refreshUI of edit.refresh||[])try{refreshUI();}catch(error){warnings.push('display refresh: '+(error.message||String(error)));}
    return {applied:true,...edit.result,warnings};
  }finally{projectEditActive=false;}
}
function applyNativeGameEdit(value,options={}){
  return runEdit('native game',options,candidate=>{
    const next=Forge.services.NativeEngineProject.edit(candidate,value);
    return {effective:JSON.stringify(next)!==JSON.stringify(candidate.nativeGame),values:{nativeGame:next},intent:'nativeGameEdit',refresh:[()=>Forge.services.NativeEngineUI?.refresh()]};
  });
}
function applyNativeLayoutEdit(sceneId,change,options={}){
  return runEdit('native layout',options,candidate=>{
    const api=Forge.services.NativeResourceProject?.matches(candidate)?Forge.services.NativeResourceProject:Forge.services.NativeLayoutProject;
    const next=api.paint(candidate,sceneId,change);
    return {effective:JSON.stringify(next.nativeGame)!==JSON.stringify(candidate.nativeGame),values:next,intent:'nativeLayoutEdit',refresh:[()=>loadSceneData(S.activeScene),()=>rebuildAllUI(),()=>Forge.services.NativeLayoutUI?.refresh()]};
  });
}
function openNativeResourcePage(resource,page,options={}){
  return runEdit('native page',options,candidate=>{
    const next=Forge.services.NativeResourceProject.addPage(candidate,resource,page);
    return {effective:next.activeScene!==candidate.activeScene||JSON.stringify(next.nativeGame)!==JSON.stringify(candidate.nativeGame),values:next,intent:'nativeResourcePage',refresh:[()=>loadSceneData(S.activeScene),()=>rebuildAllUI(),()=>Forge.services.NativeLayoutUI?.refresh()]};
  });
}
function openInvestigatedResource(request,options={}){
  return runEdit('source resource',options,candidate=>{
    const next=Forge.services.InvestigatedLibrary.prepareOpen(candidate,request),values=next.values,scene=values.scenes[values.activeScene];
    for(const key of ['nt','attr','pal','sprPal','oam','chr','sprChr','tileProps'])values[key]=cp(scene[key]);
    Object.assign(values,{selSprite:-1,selEntity:-1,entPlaceTool:null,chrBank:next.destination.kind==='pose'?'spr':'bg',selTile:0,editTile:0});
    return {effective:true,values,intent:'nativeAssetImport',result:{destination:next.destination},refresh:[()=>loadSceneData(S.activeScene),()=>rebuildAllUI(),()=>Forge163.metasprites.render(),()=>Forge161.worlds.renderUI(),()=>Forge.services.SceneContextUI?.refresh()]};
  });
}
// Library resources used in the working project: the library prepares new scenes/metasprites from a captured
// candidate; this applies them as one guarded, undoable edit (the same transaction as opening source resources).
function applyLibraryUse(prepare,options={}){
  return runEdit('library resource',options,candidate=>{
    const next=prepare(candidate);
    if(!next||!Array.isArray(next.scenes)||!Array.isArray(next.metasprites))fail('A library use must return scenes and metasprites.');
    const values={scenes:next.scenes,metasprites:next.metasprites,activeScene:candidate.activeScene},scene=values.scenes[values.activeScene];
    for(const key of ['nt','attr','pal','sprPal','oam','chr','sprChr','tileProps'])values[key]=cp(scene[key]);
    Object.assign(values,{selSprite:-1});
    return {effective:true,values,intent:'libraryUse',result:next.result,refresh:[()=>loadSceneData(S.activeScene),()=>rebuildAllUI(),()=>Forge163.metasprites.render(),()=>Forge.services.SceneContextUI?.refresh()]};
  });
}
function applyNativeWorldEdit(mapId,changes,options={}){
  return runEdit('terrain',options,candidate=>{
    const result=Forge.services.NativeWorldProject.paint(candidate,mapId,changes);
    return {effective:JSON.stringify(result.worlds)!==JSON.stringify(candidate.worlds),values:{worlds:result.worlds},intent:'nativeTerrainEdit',result:{usedBytes:result.usedBytes,budget:result.budget},refresh:[()=>Forge.services.NativeWorldUI?.refresh()]};
  });
}
function openNativeWorldResource(mapId,options={}){
  return runEdit('map import',options,candidate=>{
    const next=Forge.services.NativeWorldProject.addResource(candidate,mapId);
    return {effective:JSON.stringify(next.nativeGame)!==JSON.stringify(candidate.nativeGame),values:{worlds:next.worlds,nativeGame:next.nativeGame},intent:'nativeWorldImport',refresh:[()=>Forge.services.SceneContextUI?.refresh(),()=>Forge.services.NativeWorldUI?.refresh()]};
  });
}
function applySettingsEdit(changes,options={}){
  return runEdit('settings',options,candidate=>{
    if(!changes||typeof changes!=='object'||Array.isArray(changes))fail('Project settings changes must be an object.');
    const keys=Object.keys(changes),values={};let effective=false;
    for(const key of keys){
      if(!['gameplay','worldRuntime'].includes(key))fail('Unsupported project settings owner: '+key);
      const patch=changes[key],base=candidate[key];
      if(!patch||typeof patch!=='object'||Array.isArray(patch))fail('Project settings changes for '+key+' must be an object.');
      for(const field of Object.keys(patch)){
        const value=patch[field];
        if(!Object.hasOwn(base,field)||!['number','string','boolean'].includes(typeof value)||typeof value!==typeof base[field]||(typeof value==='number'&&!Number.isFinite(value)))fail('Unsupported project setting: '+key+'.'+field);
        if(base[field]!==value)effective=true;
        base[field]=value;
      }
      values[key]=cp(base);
    }
    const prepared=Store.prepareLoad(candidate);
    for(const key of keys)if(JSON.stringify(prepared[key])!==JSON.stringify(candidate[key]))fail('Project settings changed during normalization: '+key);
    return {effective,values,intent:'projectSettings',refresh:[()=>Forge.services.WorldUI?.refresh(true),()=>Forge165.ui?.refresh(true),()=>Forge.services.GameplayUI?.refresh(true)]};
  });
}
function appendScene(input,options={}){
  return runEdit('scene',options,candidate=>{
    if(!input||typeof input!=='object'||Array.isArray(input)||typeof input.id!=='string'||!input.id.trim())fail('An appended scene requires a nonempty explicit scene ID.');
    if(options.select!==undefined&&typeof options.select!=='boolean')fail('Scene selection must be true or false.');
    if(candidate.scenes.length>=64)fail('The project already has 64 scenes.');
    if(candidate.scenes.some(scene=>scene.id===input.id))fail('A scene with this ID is already in the project.');
    const index=candidate.scenes.length,selected=options.select!==false;
    candidate.scenes.push(cp(input));
    // Validate with the canonical project/scene owners, then install only a
    // detached copy of the appended normalized scene. Existing records retain
    // their live references and exact values; prepared audio/worlds are unused.
    const prepared=Store.prepareLoad(candidate),scene=cp(prepared.scenes[index]),values={};
    if(selected){
      for(const key of ['nt','attr','pal','sprPal','oam','chr','sprChr','tileProps'])values[key]=cp(scene[key]);
      Object.assign(values,{activeScene:index,selSprite:scene.oam.length?0:-1,selEntity:-1,entPlaceTool:null,chrBank:'bg',selTile:0,editTile:0});
    }
    return {effective:true,values,append:{list:S.scenes,index,scene},intent:'sceneAppend',result:{sceneId:scene.id,sceneIndex:index,selected},
      // Live mirrors were installed above before any UI-capable loader runs.
      // Its ordinary selection/cache work can now fail without a partial model.
      refresh:[...(selected?[()=>loadSceneData(index)]:[]),()=>rebuildAllUI(),()=>Forge166.ui?.refresh()]};
  });
}
function appendAssets(input,options={}){
  return runEdit('assets',options,candidate=>{
    if(!input||!['animations,metasprites,scenes','animations,metasprites,scenes,worlds'].includes(Object.keys(input).sort().join(',')))fail('An asset append requires scenes, metasprites, animations and optional worlds.');
    const collections=['scenes','metasprites','animations',...(input.worlds!==undefined?['worlds']:[])];
    for(const [key,min,max]of [['scenes',1,64],['metasprites',0,256],['animations',0,256]])if(!Array.isArray(input[key])||input[key].length<min||input[key].length+(candidate[key]?.length||0)>max)fail('Asset append exceeds '+key+' capacity.');
    for(const key of collections){
      const used=new Set((candidate[key]||[]).map(x=>x.id));
      for(const item of input[key]){if(!item||typeof item.id!=='string'||!item.id.trim()||used.has(item.id))fail('Asset append requires new explicit '+key+' IDs.');used.add(item.id);}
    }
    if(input.worlds!==undefined){if(!Array.isArray(input.worlds)||input.worlds.length+(candidate.worlds?.length||0)>32)fail('Asset append exceeds world capacity.');window.ForgeWorldCodec1621.validate(input.worlds);for(const w of input.worlds){const scene=input.scenes?.find(s=>s.id===w.tilesetSceneId);if(!scene)fail('World tileset scene must be appended with its world.');const ids=new Set((scene.metatiles||[]).map(m=>m.id));if(w.map.some(id=>id>=0&&!ids.has(id)))fail('World metatile reference is missing.');}}
    Forge163.persistence.validate(input.metasprites,input.animations,input.scenes,{references:true});
    const offsets=Object.fromEntries(collections.map(key=>[key,candidate[key]?.length||0]));
    for(const key of Object.keys(offsets))candidate[key]=[...(candidate[key]||[]),...cp(input[key])];
    const prepared=Store.prepareLoad(candidate),values={};
    for(const key of collections)if(JSON.stringify(prepared[key])!==JSON.stringify(candidate[key]))fail('Asset append would change '+key+' during normalization.');
    for(const key of Object.keys(offsets))values[key]=[...S[key],...cp(prepared[key].slice(offsets[key]))];
    const index=offsets.scenes,selected=options.select!==false,scene=values.scenes[index];
    if(selected){for(const key of ['nt','attr','pal','sprPal','oam','chr','sprChr','tileProps'])values[key]=cp(scene[key]);Object.assign(values,{activeScene:index,selSprite:-1,selEntity:-1,entPlaceTool:null,chrBank:'bg',selTile:0,editTile:0});}
    return {effective:true,values,intent:'nativeAssetImport',result:{sceneIds:input.scenes.map(s=>s.id),sceneIndex:index,metasprites:input.metasprites.length,animations:input.animations.length,worldIds:(input.worlds||[]).map(w=>w.id),selected},refresh:[...(selected?[()=>loadSceneData(index)]:[]),()=>rebuildAllUI(),()=>Forge163.metasprites.render(),()=>{if(selected&&input.worlds?.length){Forge161.worlds.state.selected=offsets.worlds;Forge161.worlds.state.panX=Forge161.worlds.state.panY=0;}Forge161.worlds.renderUI();},()=>Forge166.ui?.refresh()]};
  });
}
function applyAudioImport(changes,options={}){
  return runEdit('audio',options,candidate=>{
    const kind=options.kind,keys=kind==='music'?['patterns','instruments','orderList','tempo','speed']:kind==='sfx'?['patterns','instruments','sfx']:null;
    if(!keys||!changes||typeof changes!=='object'||Array.isArray(changes)||Object.keys(changes).length!==keys.length||Object.keys(changes).some(key=>!keys.includes(key)))fail('An Audio import requires only its declared music or SFX fields.');
    const canonical=value=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item);
    const offsets={patterns:candidate.patterns.length,instruments:candidate.instruments.length,sfx:candidate.sfx.length},values={};
    for(const key of keys)values[key]=cp(changes[key]);
    for(const key of ['patterns','instruments',...(kind==='sfx'?['sfx']:[])]){
      if(!Array.isArray(values[key])||values[key].length<offsets[key]||JSON.stringify(values[key].slice(0,offsets[key]))!==JSON.stringify(candidate[key]))fail('An Audio import must preserve existing '+key+' and append new records.');
      if(values[key].length>(key==='patterns'?256:255))fail('Imported '+key+' exceed the canonical Audio capacity.');
    }
    if(values.patterns.length===offsets.patterns||kind==='sfx'&&values.sfx.length===offsets.sfx)fail('An Audio import must append its new records.');
    if(kind==='sfx'&&(candidate.tempo!==150||candidate.speed!==1))fail('SFX transcription requires project tempo 150 and speed 1; existing music timing cannot be changed by SFX import.');
    if(kind==='music'){
      if(!Number.isInteger(values.tempo)||values.tempo<30||values.tempo>300||!Number.isInteger(values.speed)||values.speed<1||values.speed>15)fail('Invalid imported Audio tempo or speed.');
      if(!Array.isArray(values.orderList)||!values.orderList.length||values.orderList.length>255||values.orderList.some(row=>!Array.isArray(row)||row.length!==5||row.some(index=>!Number.isInteger(index)||index<offsets.patterns||index>=values.patterns.length)))fail('Imported music order requires five references to appended patterns.');
    }
    Object.assign(candidate,values);
    const prepared=Store.prepareLoad(candidate);
    for(const key of ['patterns','instruments',...(kind==='sfx'?['sfx']:[])])if(canonical(prepared[key].slice(offsets[key]))!==canonical(values[key].slice(offsets[key])))fail('The transcription would change during project normalization. Import was refused.');
    Forge.services.AudioCompiler.plan({...candidate,audioRuntime:{...candidate.audioRuntime,enabled:true,musicEnabled:kind==='music'?true:candidate.audioRuntime.musicEnabled}});
    return {effective:true,values,intent:kind==='music'?'nativeAudioTranscription':'nativeSfxTranscription'};
  });
}
function initializeBlank(){
  const sc=makeScene({name:'Untitled Scene',chr:normalizeTiles(),sprChr:normalizeTiles(),tileProps:Array(256).fill(0),entities:[],oam:[],buildInclude:true,buildOrder:0,scrollDir:'none'});
  Store.load({format:'NESForge',version:12,foundation:Forge.release.version,projectName:'Untitled',scenes:[sc],activeScene:0,worlds:[],animations:[],metasprites:[],gameplay:Forge165.config.defaults(),worldRuntime:Forge.services.WorldConfig.defaults(),audioRuntime:Forge.services.AudioConfig.defaults(),gameplayCore:Forge.services.GameplayModel.defaults(),asmSource:'',instruments:[],patterns:[],orderList:[],sfx:[],tempo:150,speed:6,audRows:64,mapper:0,mirroring:'v',hasSRAM:false,prgBanks:1,chrBanks:1,packScenes:true,importedRom:null,selTile:0,editTile:0,selSprite:-1,selEntity:-1,chrBank:'bg',_selAnim:0,_animFrame:0},{intent:'startup'});
  Forge15.dirty=false;status('Untitled project · recovery checking…');return true;
}
async function saveBrowser(name){
  let db;
  try{
    name=String(name||S.projectName).trim().slice(0,120)||'Untitled';
    const epoch=state.epoch,identity=S.projectId,before=Store.serialize(),data=Store.capture({includeEditorView:true}),priorName=data.projectName;data.projectName=name;
    db=await db_open();
    const id=await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readwrite'),record={name,timestamp:Date.now(),state:JSON.stringify(data)};if(identity)record.id=identity;const req=tx.objectStore(DB_STORE).put(record);let result;req.onsuccess=()=>result=req.result;tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error||Error('Save failed'));tx.onabort=()=>reject(tx.error||Error('Save aborted'));});
    if(state.epoch!==epoch||S.projectId!==identity)return id;
    const unchanged=Store.serialize()===before;
    S.projectId=id;if(S.projectName===priorName){S.projectName=name;$('projName').textContent=name;}
    if(unchanged)Forge15.dirty=false;
    Forge15.lastBrowserSave=Date.now();status();showToast('Saved: '+name);return id;
  }catch(e){reportError(Error('Browser save failed: '+e.message+'. Use Save Project As for a portable backup.'));return null;}finally{db?.close();}
}
function readGuard(){return {epoch:state.epoch,snapshot:Store.serialize()};}
function currentRead(guard){return state.epoch===guard.epoch&&Store.serialize()===guard.snapshot;}
// Portable file transport remains the protected Save As implementation. These
// tokens own only the project-status acknowledgement when that transport ends.
function saveCompletionToken(){const token=Object.freeze(readGuard());portableCompletions.add(token);return token;}
function completePortableSave(token,result){
  if(!token||!portableCompletions.has(token))return false;
  portableCompletions.delete(token);
  if(!result||!['saved','download-requested'].includes(result.status)||!currentRead(token))return false;
  Forge15.dirty=false;Forge15.lastPortable=Date.now();status();return true;
}
async function openBrowser(id){
  let db;const guard=readGuard();
  try{
    db=await db_open();
    const record=await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readonly'),request=tx.objectStore(DB_STORE).get(id);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);tx.onabort=()=>reject(tx.error||Error('Project read aborted'));});
    if(!currentRead(guard)){showToast('Workspace changed while opening — choose the saved project again');return false;}
    if(!record)fail('Saved project no longer exists');
    Store.load(record.state,{intent:'browser-open'});S.projectId=id;S.projectName=record.name;$('projName').textContent=record.name;
    db_hideLoad();broadcastState('projectLoad');showToast('Loaded: '+record.name);return true;
  }catch(error){reportError(error);return false;}finally{db?.close();}
}
async function openFile(event){
  const file=event.target.files[0];event.target.value='';if(!file)return false;
  const guard=readGuard();
  try{
    if(file.size>64*1024*1024)fail('Project exceeds 64 MB');
    const text=await file.text();
    if(!currentRead(guard)){showToast('Workspace changed while opening — choose the project file again');return false;}
    Store.load(text,{intent:'file-open'});broadcastState('projectOpen');showToast('Opened '+file.name);return true;
  }catch(error){reportError(error);return false;}
}
// ---------- crash recovery: a per-tab journal of project sections (see services/recovery-journal.js) ----------
// A recovery point is written shortly after every edit (the first write starts as soon as the edit's handler ends,
// later ones at most every MIN_GAP ms while edits continue), plus a check every few seconds for changes made without
// an edit signal. Only changed sections are written, in one atomic transaction. When the tab closes, hides or
// refreshes, the changed sections not yet committed are also written synchronously to localStorage. A restore says
// exactly which point it recovered and whether later changes existed that could not be recovered.
const Journal=Forge.services.RecoveryJournal;
const MIN_GAP=150,CLEAN_REASONS=new Set(['welcome','fullSync','sceneSelect','selectTile','eyedrop','sprSelect']),LOAD_REASONS=new Set(['projectLoad','projectOpen','projectDrop','zipProject','zipAssets']);
const rec={session:Journal?.session||null,startedAt:Date.now(),enabled:!!Journal,unavailable:Journal?null:'recovery storage is missing',meaningful:false,
  editSeq:0,actions:0,committedActions:0,lastActionAt:0,writeSeq:0,committed:new Map(),committedSeq:0,committedAt:0,lastHead:null,stored:new Set(),writing:null,again:false,timer:null,lastStart:0,
  firstUncommittedAt:0,lastError:null,retryAt:0,checkEvery:4000,lastCheck:0,offered:null,report:null,inv:null,tail:null,
  metrics:{writes:0,lastMs:0,lastComputeMs:0,lastBytes:0,lastSections:0,baselineMs:0,baselineBytes:0,emergencies:0,lastEmergencyMs:0,lastEmergencyBytes:0}};
const clockText=t=>t?new Date(t).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'}):'—';
function recoverySections(){
  const fields=captureFields({includeEditorView:true}),out=[];
  for(const key of Object.keys(fields)){
    const value=fields[key];if(value===undefined)continue;
    if(key==='scenes'&&Array.isArray(value)){out.push(['n:scenes',String(value.length)]);value.forEach((scene,i)=>out.push(['scene:'+i,JSON.stringify(scene)]));continue;}
    if(key==='investigation'&&value&&typeof value==='object'){
      // Replaced wholesale on load, never edited in place: reuse its text while the object is the same.
      if(rec.inv?.ref!==value){const text=JSON.stringify(value);rec.inv={ref:value,text,hash:Journal.hash(text)};}
      out.push(['f:investigation',rec.inv.text,rec.inv.hash]);continue;
    }
    const text=JSON.stringify(value);if(text!==undefined)out.push(['f:'+key,text]);
  }
  for(const section of out)if(section[2]===undefined)section[2]=Journal.hash(section[1]);
  return out;
}
function assembleSections(list,textOf){
  const data={};
  for(const [name,hash] of list){
    const text=textOf(name,hash);if(typeof text!=='string')fail('section '+name+' is missing');
    if(name==='n:scenes'){const n=Number(text);if(!Number.isInteger(n)||n<0)fail('scene count is invalid');data.scenes=new Array(n);continue;}
    if(name.startsWith('scene:')){const i=Number(name.slice(6));if(!data.scenes||!Number.isInteger(i)||i>=data.scenes.length)fail('scene section '+name+' is out of range');data.scenes[i]=JSON.parse(text);continue;}
    if(name.startsWith('f:'))data[name.slice(2)]=JSON.parse(text);else fail('unknown section '+name);
  }
  if(data.scenes&&data.scenes.some(scene=>scene===undefined))fail('a scene section is missing');
  return data;
}
function recoveryLabel(){
  if(!rec.enabled)return {level:'warn',text:'recovery unavailable',detail:'Crash recovery is off: '+(rec.unavailable||'storage unavailable')+'. Use Save Project As to keep your work.'};
  if(rec.lastError&&rec.committedSeq!==rec.editSeq)return {level:'warn',text:'recovery failed · use Save As',detail:'The last recovery write failed: '+rec.lastError+'. Forge retries automatically.'};
  if(!rec.meaningful)return {level:'ok',text:'recovery ready',detail:'Nothing to recover yet: the project has not been opened or edited in this tab.'};
  if(!rec.lastHead)return {level:'busy',text:'recovery preparing…',detail:'Writing the first recovery copy of this project. Until it is written, closing the tab can lose this session\'s changes.'};
  const behind=Math.max(rec.editSeq>rec.committedSeq?1:0,rec.actions-rec.committedActions);
  if(behind<=0)return {level:'ok',text:'recovery ✓ '+clockText(rec.committedAt),detail:'Every change is in the recovery copy (last written '+clockText(rec.committedAt)+').'};
  if(rec.firstUncommittedAt&&Date.now()-rec.firstUncommittedAt>2000)return {level:'warn',text:'recovery behind · '+behind+' change'+(behind===1?'':'s')+' since '+clockText(rec.firstUncommittedAt),detail:'Changes made since '+clockText(rec.firstUncommittedAt)+' are not in the recovery copy yet.'};
  return {level:'busy',text:'recovery saving…',detail:behind>0?behind+' change'+(behind===1?' is':'s are')+' being written to the recovery copy.':'Updating the recovery copy.'};
}
function publishStatus(){const l=recoveryLabel();Forge15.recovery=l;Forge15.lastRecovery=rec.committedAt||Forge15.lastRecovery;status();}
function schedule(delay){
  if(!rec.enabled||rec.timer)return;
  const wait=delay??Math.max(0,MIN_GAP-(performance.now()-rec.lastStart));
  rec.timer=setTimeout(()=>{rec.timer=null;void flush('edit');},rec.writing?Math.max(wait,MIN_GAP):wait);
}
// An edit signal (an undo snapshot or a change broadcast): record it synchronously, write soon. editSeq counts every
// signal (it decides whether a recovery point covers everything); actions counts user actions for messages: one per
// undo snapshot, or per broadcast that does not follow a snapshot within 300 ms.
function noteChange(reason,kind){
  if(CLEAN_REASONS.has(reason))return;
  rec.meaningful=true;
  if(!LOAD_REASONS.has(reason)){
    const now=Date.now();rec.editSeq++;
    if(kind==='snapshot'||now-rec.lastActionAt>300)rec.actions++;if(kind==='snapshot')rec.lastActionAt=now;
    if(!rec.firstUncommittedAt)rec.firstUncommittedAt=now;
    if(rec.session)Journal.marker.write(rec.session,{editSeq:rec.editSeq,actions:rec.actions,at:now,projectName:S.projectName});
  }
  publishStatus();schedule();
}
function flush(reason){
  if(!rec.enabled||!rec.meaningful)return Promise.resolve(false);
  if(rec.writing){rec.again=true;return rec.writing;}
  if(rec.retryAt&&Date.now()<rec.retryAt&&reason!=='explicit'&&reason!=='close'){schedule(rec.retryAt-Date.now());return Promise.resolve(false);}
  const t0=performance.now();let sections;
  try{sections=recoverySections();}catch(error){rec.lastError='the project could not be read ('+error.message+')';publishStatus();return Promise.resolve(false);}
  const computeMs=performance.now()-t0,editSeq=rec.editSeq,actions=rec.actions,at=Date.now(),list=sections.map(([n,,h])=>[n,h]),names=new Set(list.map(x=>x[0]));
  const changed=sections.filter(([n,,h])=>rec.committed.get(n)!==h),removed=[...rec.committed.keys()].some(n=>!names.has(n));
  rec.metrics.lastComputeMs=computeMs;
  if(rec.lastHead&&!changed.length&&!removed){
    if(rec.committedSeq!==editSeq){rec.committedSeq=editSeq;rec.committedActions=actions;if(rec.session)Journal.tail.clearIfCovered(rec.session,editSeq);}
    rec.firstUncommittedAt=0;rec.lastError=null;publishStatus();return Promise.resolve(true);
  }
  const prev=rec.lastHead?{seq:rec.lastHead.seq,editSeq:rec.lastHead.editSeq,actions:rec.lastHead.actions,at:rec.lastHead.at,sections:rec.lastHead.sections}:null;
  const head={session:rec.session,seq:rec.writeSeq+1,editSeq,actions,at,aliveAt:at,startedAt:rec.startedAt,projectName:S.projectName,version:Forge.release.version,offerable:true,sections:list,prev};
  const blobs=changed.filter(([,,h])=>!rec.stored.has(h)).map(([,text,h])=>({hash:h,text}));
  const keep=new Set([...list.map(x=>x[1]),...(prev?prev.sections.map(x=>x[1]):[])]);
  const drop=[...new Set((rec.lastHead?.prev?.sections||[]).map(x=>x[1]).filter(h=>!keep.has(h)&&!blobs.some(b=>b.hash===h)))];
  const bytes=blobs.reduce((n,b)=>n+b.text.length,0),baseline=!rec.lastHead;
  rec.lastStart=performance.now();
  const job=Journal.write(head,blobs,drop).then(()=>{
    for(const b of blobs)rec.stored.add(b.hash);for(const h of drop)rec.stored.delete(h);
    rec.writeSeq=head.seq;rec.lastHead=head;rec.committed=new Map(list);rec.committedSeq=Math.max(rec.committedSeq,editSeq);rec.committedActions=Math.max(rec.committedActions,actions);rec.committedAt=at;rec.lastError=null;rec.retryAt=0;
    if(rec.editSeq===editSeq)rec.firstUncommittedAt=0;
    Journal.tail.clearIfCovered(rec.session,editSeq);
    const ms=performance.now()-t0;Object.assign(rec.metrics,{writes:rec.metrics.writes+1,lastMs:ms,lastBytes:bytes,lastSections:blobs.length});if(baseline)Object.assign(rec.metrics,{baselineMs:ms,baselineBytes:bytes});
    autoSaveWarning=false;return true;
  },error=>{rec.lastError=error?.message||String(error);rec.retryAt=Date.now()+5000;return false;}).finally(()=>{
    rec.writing=null;publishStatus();
    if(rec.again||rec.editSeq!==rec.committedSeq){rec.again=false;schedule();}
  });
  rec.writing=job;publishStatus();return job;
}
// Closing, refreshing or hiding the tab: write what is not committed yet synchronously, then try a normal write too.
function closeTime(kind){
  if(!rec.enabled||!rec.meaningful||!rec.session)return;
  if(kind==='pagehide')Journal.end.write(rec.session,{editSeq:rec.editSeq,actions:rec.actions,at:Date.now()});
  const t0=performance.now();let sections;try{sections=recoverySections();}catch(_){return;}
  const list=sections.map(([n,,h])=>[n,h]),names=new Set(list.map(x=>x[0]));
  const changed=sections.filter(([n,,h])=>rec.committed.get(n)!==h);
  if(rec.lastHead&&!changed.length&&![...rec.committed.keys()].some(n=>!names.has(n))&&rec.committedSeq===rec.editSeq)return;
  const record={session:rec.session,kind,base:rec.lastHead?.seq||0,editSeq:rec.editSeq,actions:rec.actions,at:Date.now(),projectName:S.projectName,sections:list,blobs:changed.map(([,text,h])=>[h,text])};
  const ok=Journal.tail.write(rec.session,record);rec.tail={kind,ok,editSeq:rec.editSeq,bytes:record.blobs.reduce((n,b)=>n+b[1].length,0)};
  rec.metrics.emergencies++;rec.metrics.lastEmergencyMs=performance.now()-t0;rec.metrics.lastEmergencyBytes=rec.tail.bytes;
  void flush('close');
}
// ---------- offering and restoring an earlier session ----------
function localRecovery(){try{return localStorage.getItem(AUTOSAVE_KEY);}catch(_){return null;}}
function recoveryPhase(phase){state.recoveryPhase=phase;recoveryPending=phase==='offered'||phase==='restoring';$('autosaveBanner').classList.toggle('show',phase==='offered'||phase==='restoring'||phase==='notice');}
function banner(mode,text){
  const el=$('autosaveText');if(el)el.textContent=text;
  const b=$('autosaveBanner');if(!b)return;b.dataset.mode=mode;
  for(const c of b.querySelectorAll('.ab-restore,.ab-dismiss'))c.hidden=mode!=='offer';const ok=$('autosaveOk');if(ok)ok.hidden=mode!=='notice';
}
function recoveryError(error){autoSaveWarning=true;const el=$('issueStatus');if(el){el.textContent='Browser recovery unavailable — portable Save As still works';el.title=error?.message||String(error);}}
async function readLegacyRecovery(){
  let db;try{db=await db_open();return await new Promise((resolve,reject)=>{const tx=db.transaction(Forge15.recoveryStore,'readonly'),request=tx.objectStore(Forge15.recoveryStore).get(Forge15.recoveryKey);request.onsuccess=()=>resolve(request.result||null);request.onerror=()=>reject(request.error);tx.onabort=()=>reject(tx.error||Error('Recovery read aborted'));});}finally{db?.close();}
}
async function deleteLegacyRecovery(){
  let db;try{db=await db_open();await new Promise((resolve,reject)=>{const tx=db.transaction(Forge15.recoveryStore,'readwrite');tx.objectStore(Forge15.recoveryStore).delete(Forge15.recoveryKey);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Recovery deletion aborted'));});}finally{db?.close();}
  try{localStorage.removeItem(AUTOSAVE_KEY);}catch(_){}
}
// The most recent earlier session that holds work: not this tab, not another open tab. Blank sessions and sessions
// older than 14 days are pruned; at most five earlier sessions are kept.
async function findOffer(){
  let offer=null,journalHeads=[];
  if(rec.enabled){
    try{journalHeads=await Journal.heads();}catch(error){rec.enabled=false;rec.unavailable=error.message;}
  }
  if(rec.enabled){
    const live=await Journal.liveSessions(journalHeads),now=Date.now();
    const earlier=journalHeads.filter(h=>h.session!==rec.session&&!live.has(h.session));
    const candidates=[];
    for(const head of earlier){
      if(!head.offerable||now-(head.at||0)>14*86400000){await Journal.deleteSession(head.session).catch(()=>{});continue;}
      const t=Journal.tail.read(head.session),m=Journal.marker.read(head.session),ended=Journal.end.read(head.session);
      candidates.push({kind:'journal',head,tail:t.value&&t.value.session===head.session?t.value:null,tailProblem:t.problem||null,marker:m,ended,at:Math.max(head.at||0,t.value?.at||0,m?.at||0)});
    }
    candidates.sort((a,b)=>b.at-a.at);
    for(const old of candidates.slice(5))await Journal.deleteSession(old.head.session).catch(()=>{});
    // localStorage records whose session never committed a point (or was removed): nothing to restore from.
    const known=new Set(journalHeads.map(h=>h.session));for(const s of Journal.local.sessions())if(s!==rec.session&&!known.has(s)&&!live.has(s))Journal.local.clear(s);
    if(candidates.length)offer={...candidates[0],others:Math.min(4,candidates.length-1)};
  }
  const local=localRecovery();let legacy=null;
  try{legacy=await readLegacyRecovery();}catch(_){legacy=null;}
  let legacyText=null;if(local)try{if(JSON.parse(local)?.scenes)legacyText=local;}catch(_){}
  if(legacy?.state||legacyText){const at=legacy?.timestamp||0;if(!offer||at>offer.at)offer={kind:'legacy',record:legacy,local:legacyText,at,others:offer?1:0};}
  else if(local&&!legacyText){try{localStorage.removeItem(AUTOSAVE_KEY);}catch(_){}}
  return offer;
}
function offerText(offer){
  const when=offer.at?new Date(offer.at).toLocaleString():'an earlier session';
  if(offer.kind==='legacy')return 'Recovery found from '+when+' (older Forge recovery copy). Restore it or dismiss it. This tab is protected separately.';
  const h=offer.head,changes=Math.max(h.actions||0,offer.tail?.actions||0,offer.marker?.actions||0);
  return 'Recovery found: “'+(h.projectName||'Untitled')+'”, last change '+when+(changes?' · '+changes+' change'+(changes===1?'':'s')+' in that session':'')+(offer.others?' · '+offer.others+' older session'+(offer.others===1?'':'s')+' kept':'')+'. Restore it or dismiss it. This tab is protected separately.';
}
async function checkRecovery(){
  if(checkPromise&&state.recoveryPhase==='checking')return checkPromise;
  if(state.recoveryPhase==='offered'&&rec.offered)return true;
  const token=++state.recoveryToken;recoveryPhase('checking');
  checkPromise=(async()=>{
    try{
      const offer=await findOffer();if(token!==state.recoveryToken)return false;
      rec.offered=offer;if(offer)banner('offer',offerText(offer));
      recoveryPhase(offer?'offered':'ready');publishStatus();
      if(offer)status('Recovery available · restore or dismiss');else if(state.lastIntent==='startup')status('Untitled project · ready');
      return !!offer;
    }catch(error){if(token!==state.recoveryToken)return false;recoveryPhase('ready');recoveryError(error);return false;}
  })();
  return checkPromise;
}
// Read the newest readable point of an offered session: the close-time record, then the head, then the previous head.
async function readPoint(offer){
  const {head,tail,marker,ended}=offer,problems=offer.tailProblem?['close-time record: '+offer.tailProblem]:[],tries=[];
  if(tail&&tail.editSeq>head.editSeq)tries.push({source:'close',sections:tail.sections,editSeq:tail.editSeq,actions:tail.actions,at:tail.at,inline:new Map(tail.blobs||[])});
  tries.push({source:'latest',sections:head.sections,editSeq:head.editSeq,actions:head.actions,at:head.at});
  if(head.prev)tries.push({source:'previous',sections:head.prev.sections,editSeq:head.prev.editSeq,actions:head.prev.actions,at:head.prev.at});
  for(const point of tries){
    try{
      if(!Array.isArray(point.sections)||!point.sections.length)fail('it lists no sections');
      const need=point.sections.map(([,h])=>h).filter(h=>!point.inline?.has(h)),stored=await Journal.blobs(head.session,need),texts=new Map();
      for(const [name,h] of point.sections){const text=point.inline?.get(h)??stored.get(h);if(typeof text!=='string')fail('section '+name+' is missing');if(Journal.hash(text)!==h)fail('section '+name+' does not match its checksum');texts.set(name,text);}
      const data=assembleSections(point.sections,name=>texts.get(name));
      return {text:JSON.stringify(data),report:{source:point.source,editSeq:point.editSeq,actions:point.actions??null,at:point.at,markerEditSeq:marker?.editSeq??null,markerActions:marker?.actions??null,markerAt:marker?.at??null,
        endedNormally:!!ended,endEditSeq:ended?.editSeq??null,endActions:ended?.actions??null,endAt:ended?.at??null,problems,projectName:head.projectName}};
    }catch(error){problems.push(point.source+' point: '+error.message);}
  }
  fail('No recovery point of that session could be read ('+problems.join('; ')+'). It has been kept; dismiss it explicitly to remove it.');
}
function restoreMessage(r){
  const through=clockText(r.at),damaged=r.problems.length?' Note: '+r.problems.join('; ')+'.':'';
  if(r.source==='legacy')return {complete:null,text:'Restored an older Forge recovery copy from '+through+'. That format did not record later changes, so Forge cannot confirm whether any were lost.'};
  // Changes known to exist: the session's normal-end record (reliable), else the per-edit marker (may lag behind a
  // browser that was killed, so it can prove a loss but never completeness).
  const known=r.endedNormally?r.endEditSeq:r.markerEditSeq,knownActions=r.endedNormally?r.endActions:r.markerActions,knownAt=r.endedNormally?r.endAt:r.markerAt;
  if(known!==null&&known>r.editSeq){const lost=Math.max(1,(knownActions??0)-(r.actions??0));
    return {complete:false,lost,text:'Recovered changes through '+through+'. '+lost+' later change'+(lost===1?'':'s')+' (made until '+clockText(knownAt)+') could not be recovered.'+damaged};}
  if(r.endedNormally)return {complete:true,text:'Recovery restored: every change through '+through+'.'+damaged};
  return {complete:null,text:'Restored every change Forge had recorded (through '+through+'). Forge or the browser ended unexpectedly, so changes made in its last moments cannot be confirmed.'+damaged};
}
async function restoreRecovery(){
  if(!rec.offered&&!(await checkRecovery()))return false;
  const offer=rec.offered,token=++state.recoveryToken,epoch=state.epoch,before=Store.serialize();recoveryPhase('restoring');
  try{
    let text,report;
    if(offer.kind==='legacy'){text=offer.local||offer.record?.state;if(!text)fail('Recovery data could not be read. It has been preserved; dismiss it explicitly to remove it.');report={source:'legacy',at:offer.at,editSeq:null,markerEditSeq:null,problems:[]};}
    else ({text,report}=await readPoint(offer));
    if(token!==state.recoveryToken)return false;
    if(epoch!==state.epoch||Store.serialize()!==before){recoveryPhase('offered');status('Workspace changed · recovery remains available');return false;}
    const prepared=Store.prepareLoad(text);Store.commit(prepared,{intent:'recovery'});const restoredEpoch=state.epoch;Forge15.dirty=true;
    // The restored project is protected by this tab's journal before the earlier session's data is removed.
    rec.meaningful=true;const written=await flush('explicit');if(rec.writing)await rec.writing;
    if(token!==state.recoveryToken)return false;
    if(written||rec.lastHead){if(offer.kind==='legacy')await deleteLegacyRecovery();else await Journal.deleteSession(offer.head.session);}
    rec.offered=null;const message=restoreMessage(report);rec.report={...report,...message};
    if(state.epoch!==restoredEpoch){recoveryPhase('ready');return true;}
    broadcastState('restore');Forge15.dirty=true;
    banner('notice',message.text);recoveryPhase(message.complete===true?'ready':'notice');
    status(message.complete===true?'Recovered workspace · save when ready':'Partly recovered workspace · see notice');showToast(message.complete===true?'Recovery restored':'Recovery incomplete — see the notice');
    return true;
  }catch(error){if(token===state.recoveryToken){recoveryPhase('offered');banner('offer',offerText(offer));}reportError(error);return false;}
}
async function dismissRecovery(){
  if(state.recoveryPhase==='notice'){recoveryPhase('ready');return true;}
  const offer=rec.offered,token=++state.recoveryToken;recoveryPhase('deleting');
  try{
    if(offer?.kind==='legacy')await deleteLegacyRecovery();else if(offer)await Journal.deleteSession(offer.head.session);
    if(token!==state.recoveryToken)return false;
    rec.offered=null;recoveryPhase('ready');publishStatus();return true;
  }catch(error){if(token===state.recoveryToken)recoveryPhase('offered');reportError(error);return false;}
}
// The explicit "write recovery now" entry point (also used by tests and older callers).
async function autoSave(){
  if(!rec.enabled)return false;
  rec.meaningful=true;if(rec.writing)await rec.writing.catch(()=>{});
  const ok=await flush('explicit');if(rec.writing)await rec.writing.catch(()=>{});
  return ok&&rec.committedSeq===rec.editSeq;
}
function recoveryState(){
  const l=recoveryLabel();
  return {session:rec.session,enabled:rec.enabled,meaningful:rec.meaningful,editSeq:rec.editSeq,committedSeq:rec.committedSeq,actions:rec.actions,committedActions:rec.committedActions,committedAt:rec.committedAt,writing:!!rec.writing,
    baseline:!!rec.lastHead,label:l.text,level:l.level,detail:l.detail,lastError:rec.lastError,phase:state.recoveryPhase,offered:rec.offered?{kind:rec.offered.kind,at:rec.offered.at,session:rec.offered.head?.session||null}:null,
    report:rec.report,tail:rec.tail,metrics:{...rec.metrics},usesLocks:!!Journal?.usesLocks};
}
function startRecovery(){
  clearInterval(_autoSaveTimer);_autoSaveTimer=null;
  if(!rec.enabled){publishStatus();return;}
  Journal.hold();
  Journal.open().then(()=>{if(rec.session)return Journal.storedHashes(rec.session).then(set=>{rec.stored=set;});}).catch(error=>{rec.enabled=false;rec.unavailable=error.message;publishStatus();});
  const original=snapshot;snapshot=function(...args){const result=original.apply(this,args);if(!undoPaused)noteChange('edit','snapshot');return result;};
  const broadcast=broadcastState;broadcastState=function(reason,...rest){noteChange(reason||'edit');return broadcast.call(this,reason,...rest);};
  const close=kind=>()=>closeTime(kind);
  addEventListener('pagehide',close('pagehide'));addEventListener('pageshow',e=>{if(e.persisted&&rec.session)Journal.end.clear(rec.session);});addEventListener('beforeunload',close('beforeunload'));addEventListener('freeze',close('freeze'));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')closeTime('hidden');});
  setInterval(()=>{
    if(rec.writing||!rec.meaningful){publishStatus();return;}
    const due=Date.now()-rec.lastCheck>=rec.checkEvery;
    if(due){rec.lastCheck=Date.now();void flush('check').then(()=>{rec.checkEvery=Math.min(20000,Math.max(4000,Math.round(rec.metrics.lastComputeMs*150)));});}
    else if(!Journal.usesLocks&&rec.lastHead&&Date.now()-(rec.lastHead.aliveAt||0)>10000){rec.lastHead={...rec.lastHead,aliveAt:Date.now()};void Journal.write(rec.lastHead).catch(()=>{});}
    publishStatus();
  },1000);
  publishStatus();
}
const Store=Forge.services.ProjectStore={schema:12,maxSchema:Forge.release.schema,state,capture,prepareSnapshot:capture,serialize,authoringData,prepareLoad,commit,load,applyNativeGameEdit,applyNativeLayoutEdit,openNativeResourcePage,openInvestigatedResource,applyLibraryUse,applyNativeWorldEdit,openNativeWorldResource,applySettingsEdit,appendScene,appendAssets,applyAudioImport,initializeBlank,saveBrowser,saveCompletionToken,completePortableSave,openBrowser,openFile,checkRecovery,autoSave,restoreRecovery,dismissRecovery,recoveryState,flushRecovery:()=>flush('explicit'),closeTime};
startRecovery();
// These names are compatibility entry points only; active ownership is here.
// Resolve the service method at call time for instrumentable routing contracts.
projectData=function(options){return Store.capture(options);};
db_serializeState=function(options){return Store.serialize(options);};
db_deserializeState=function(input,options){return Store.load(input,options);};
db_save=function(name){return Store.saveBrowser(name);};
db_load=function(id){return Store.openBrowser(id);};
project_importFile=function(event){return Store.openFile(event);};
db_checkAutosave=function(){return Store.checkRecovery();};
db_autoSave=function(){return Store.autoSave();};
db_restoreAutosave=function(){return Store.restoreRecovery();};
db_dismissAutosave=function(){return Store.dismissRecovery();};
})();
