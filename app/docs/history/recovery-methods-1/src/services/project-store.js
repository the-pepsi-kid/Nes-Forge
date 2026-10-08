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
let recoveryWrite=Promise.resolve(),checkPromise=null;
const fail=message=>{throw Error(message);};
function status(message){
  if(Forge.release?.updateStatus)return Forge.release.updateStatus(message);
  const el=$('forge15State');if(!el)return;
  const clock=t=>t?new Date(t).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'}):'—';
  el.className=Forge15.dirty?'dirty':'clean';
  el.textContent=message||((Forge15.dirty?'● Modified':'✓ Saved')+' · recovery '+clock(Forge15.lastRecovery));
  el.title='Modified: '+(Forge15.dirty?'yes':'no')+'\nBrowser save: '+clock(Forge15.lastBrowserSave)+'\nRecovery: '+clock(Forge15.lastRecovery)+'\nPortable save: '+clock(Forge15.lastPortable);
}
function assertTarget(options){const target=options?.targetVersion??options?.targetSchema;if(target!==undefined&&target!==Forge.release.schema)fail('Project schema '+Forge.release.schema+' is required: downgrade would lose Gameplay Core, Audio Runtime, World Runtime, or unresolved authoring records. Export with this editor or retain the original older file.');}
function capture(options={}){
  assertTarget(options);
  Forge164.model.ensure();
  saveCurrentScene();
  Forge161.worlds.ensure();
  S.asmSource=$('codeInput')?.value??S.asmSource;
  return cp({format:'NESForge',version:Forge.release.schema,foundation:Forge.release.version,romLayout:Forge.services.WorldConfig.get().enabled?4:3,worldAuthoring:3,
    metatileExtension:1,metaspriteExtension:2,entityAnimationExtension:1,
    chr:S.chr,sprChr:S.sprChr,nt:S.nt,attr:S.attr,pal:S.pal,sprPal:S.sprPal,oam:S.oam,
    scenes:S.scenes,activeScene:S.activeScene,asmSource:S.asmSource,instruments:S.instruments,
    patterns:S.patterns,orderList:S.orderList,tempo:S.tempo,speed:S.speed,audRows:S.audRows,sfx:S.sfx,
    tileProps:S.tileProps,animations:S.animations,metasprites:S.metasprites,worlds:S.worlds,
    mapper:S.mapper,mirroring:S.mirroring,hasSRAM:S.hasSRAM,prgBanks:S.prgBanks,chrBanks:S.chrBanks,
    packScenes:S.packScenes!==false,projectName:S.projectName,
    importedRom:S.importedRom?bytesToBase64(S.importedRom):null,
    selTile:S.selTile,editTile:S.editTile,selSprite:S.selSprite,selEntity:S.selEntity,chrBank:S.chrBank,
    _selAnim:S._selAnim||0,_animFrame:S._animFrame||0,gameplay:Forge165.config.get(),worldRuntime:Forge.services.WorldConfig.get(),audioRuntime:Forge.services.AudioConfig.get(),gameplayCore:cp(S.gameplayCore||Forge.services.GameplayModel.defaults())});
}
function serialize(options={}){return JSON.stringify(Store.capture(options));}
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
    for(const [key,max] of [['rooms',128],['markers',256],['cameraRegions',128]]){
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
  if(rom)parseRomHeader(rom);
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
  const prepared={data:d,scenes,active,rom,chrBanks:rom?romChrBanks(rom):[],patterns,instruments,sfx,animations,metasprites:cp(frames),worlds,gameplay:cp(gameplay),worldRuntime:cp(worldRuntime),audioRuntime:Forge.services.AudioConfig.normalize(audioRuntime),gameplayCore:cp(gameplayCore)};
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
}
function commit(prepared,options={}){
  if(!preparedLoads.has(prepared))fail('ProjectStore.commit requires a prepared project');
  const p=prepared,d=p.data,external=!options.history&&!options.sync;
  if(external){
    emuPause();aud_stop();anim_stopPreview();emu.loaded=false;window._lastBuiltRom=null;disasm_output='';disasm_asmText='';
    undoStack.length=0;redoStack.length=0;undoBytes=0;S.projectId=null;
    for(const id of ['emuRunBtn','emuStepBtn','emuResetBtn','emuCapBtn','emuCapFrameBtn','emuCapHybridBtn','emuTraceBtn'])$(id).disabled=true;
  }
  state.epoch++;state.lastIntent=options.intent||(options.history?'history':options.sync?'sync':'open');
  S.scenes=p.scenes;S.activeScene=p.active;S.importedRom=p.rom;S.allChrBanks=p.chrBanks;S.chrBankIdx=0;
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
  const w=Forge161.worlds.state;w.selected=0;w.panX=w.panY=0;
  $('undoBtn').disabled=!undoStack.length;
  if(external){Forge15.dirty=false;status('Loaded project');}
  refresh();return true;
}
function load(input,options={}){return Store.commit(Store.prepareLoad(input),options);}
function initializeBlank(){
  const sc=makeScene({name:'Untitled Scene',chr:normalizeTiles(),sprChr:normalizeTiles(),tileProps:Array(256).fill(0),entities:[],oam:[],buildInclude:true,buildOrder:0,scrollDir:'none'});
  Store.load({format:'NESForge',version:Forge.release.schema,foundation:Forge.release.version,projectName:'Untitled',scenes:[sc],activeScene:0,worlds:[],animations:[],metasprites:[],gameplay:Forge165.config.defaults(),worldRuntime:Forge.services.WorldConfig.defaults(),audioRuntime:Forge.services.AudioConfig.defaults(),gameplayCore:Forge.services.GameplayModel.defaults(),asmSource:'',instruments:[],patterns:[],orderList:[],sfx:[],tempo:150,speed:6,audRows:64,mapper:0,mirroring:'v',hasSRAM:false,prgBanks:1,chrBanks:1,packScenes:true,importedRom:null,selTile:0,editTile:0,selSprite:-1,selEntity:-1,chrBank:'bg',_selAnim:0,_animFrame:0},{intent:'startup'});
  Forge15.dirty=false;status('Untitled project · recovery checking…');return true;
}
async function saveBrowser(name){
  let db;
  try{
    name=String(name||S.projectName).trim().slice(0,120)||'Untitled';
    const epoch=state.epoch,identity=S.projectId,before=Store.serialize(),data=JSON.parse(before),priorName=data.projectName;data.projectName=name;
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
function localRecovery(){try{return localStorage.getItem(AUTOSAVE_KEY);}catch(_){return null;}}
function recoveryPhase(phase){state.recoveryPhase=phase;recoveryPending=phase!=='ready';$('autosaveBanner').classList.toggle('show',phase==='offered'||phase==='restoring');}
function recoveryError(error){autoSaveWarning=true;const el=$('issueStatus');if(el){el.textContent='Browser recovery unavailable — portable Save As still works';el.title=error?.message||String(error);}}
async function readRecovery(){
  let db;try{db=await db_open();return await new Promise((resolve,reject)=>{const tx=db.transaction(Forge15.recoveryStore,'readonly'),request=tx.objectStore(Forge15.recoveryStore).get(Forge15.recoveryKey);request.onsuccess=()=>resolve(request.result||null);request.onerror=()=>reject(request.error);tx.onabort=()=>reject(tx.error||Error('Recovery read aborted'));});}finally{db?.close();}
}
async function deleteRecovery(token){
  let db;try{db=await db_open();if(token!==state.recoveryToken)return false;await new Promise((resolve,reject)=>{const tx=db.transaction(Forge15.recoveryStore,'readwrite');tx.objectStore(Forge15.recoveryStore).delete(Forge15.recoveryKey);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Recovery deletion aborted'));});return true;}finally{db?.close();}
}
async function checkRecovery(){
  if(checkPromise&&state.recoveryPhase==='checking')return checkPromise;
  const token=++state.recoveryToken;recoveryPhase('checking');
  checkPromise=(async()=>{
    const local=localRecovery();let legacy=null,localTime=0;
    if(local)try{const value=JSON.parse(local);if(value?.scenes)legacy=local;localTime=value?.timestamp||0;}catch(_){}
    try{
      const record=await readRecovery();if(token!==state.recoveryToken)return false;
      // A corrupt/unknown record is still the user's recovery data. Only an
      // explicit dismissal may remove it; startup must never overwrite it.
      const offered=local!==null||record!==null;Forge15.lastRecovery=record?.timestamp||localTime||Forge15.lastRecovery;
      recoveryPhase(offered?'offered':'ready');status(offered?'Recovery available · restore or dismiss':state.lastIntent==='startup'?'Untitled project · ready':undefined);return offered;
    }catch(error){if(token!==state.recoveryToken)return false;recoveryPhase(local!==null?'offered':'unavailable');recoveryError(error);return local!==null;}
  })();
  return checkPromise;
}
async function writeRecovery(text,epoch,token,now){
  let db;try{
    db=await db_open();
    if(state.epoch!==epoch||state.recoveryToken!==token||state.recoveryPhase!=='ready')return false;
    await new Promise((resolve,reject)=>{const tx=db.transaction(Forge15.recoveryStore,'readwrite');tx.objectStore(Forge15.recoveryStore).put({key:Forge15.recoveryKey,timestamp:now,state:text});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});
    if(state.epoch!==epoch||state.recoveryToken!==token)return false;
    try{localStorage.setItem(AUTOSAVE_KEY,JSON.stringify({indexedDB:true,timestamp:now}));}catch(_){}
    Forge15.lastRecovery=now;autoSaveWarning=false;status();return true;
  }finally{db?.close();}
}
function autoSave(){
  if(state.recoveryPhase!=='ready'||recoveryPending)return Promise.resolve(false);
  const epoch=state.epoch,token=state.recoveryToken,now=Date.now();let text;
  try{text=Store.serialize();}catch(error){reportError(error);return Promise.resolve(false);}
  // Serialize writers so an earlier async open cannot finish after a later save.
  const job=recoveryWrite.catch(()=>{}).then(()=>writeRecovery(text,epoch,token,now));
  recoveryWrite=job;return job.catch(error=>{recoveryError(error);return false;});
}
async function restoreRecovery(){
  const token=++state.recoveryToken,epoch=state.epoch,before=Store.serialize();recoveryPhase('restoring');
  try{
    const local=localRecovery();let text=null;
    if(local)try{if(JSON.parse(local)?.scenes)text=local;}catch(_){}
    const record=text?null:await readRecovery();text=text||record?.state;
    if(token!==state.recoveryToken)return false;
    if(epoch!==state.epoch||Store.serialize()!==before){recoveryPhase('offered');status('Workspace changed · recovery remains available');return false;}
    if(!text)fail('Recovery data could not be read. It has been preserved; dismiss it explicitly to start a new recovery copy.');
    const prepared=Store.prepareLoad(text);Store.commit(prepared,{intent:'recovery'});const restoredEpoch=state.epoch;Forge15.dirty=true;
    await recoveryWrite.catch(()=>{});if(token!==state.recoveryToken)return false;
    await deleteRecovery(token);if(token!==state.recoveryToken)return false;
    try{localStorage.removeItem(AUTOSAVE_KEY);}catch(_){}
    recoveryPhase('ready');if(state.epoch!==restoredEpoch)return true;
    broadcastState('restore');Forge15.dirty=true;status('Recovered workspace · save when ready');showToast('Recovery restored');return true;
  }catch(error){if(token===state.recoveryToken)recoveryPhase('offered');reportError(error);return false;}
}
async function dismissRecovery(){
  const token=++state.recoveryToken;recoveryPhase('deleting');
  try{
    await recoveryWrite.catch(()=>{});if(token!==state.recoveryToken)return false;
    await deleteRecovery(token);if(token!==state.recoveryToken)return false;
    try{localStorage.removeItem(AUTOSAVE_KEY);}catch(_){}
    recoveryPhase('ready');status();return true;
  }catch(error){if(token===state.recoveryToken)recoveryPhase('offered');reportError(error);return false;}
}
const Store=Forge.services.ProjectStore={schema:Forge.release.schema,state,capture,prepareSnapshot:capture,serialize,prepareLoad,commit,load,initializeBlank,saveBrowser,saveCompletionToken,completePortableSave,openBrowser,openFile,checkRecovery,autoSave,restoreRecovery,dismissRecovery};
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
