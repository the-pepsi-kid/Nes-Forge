/* NES Forge 1.6.6 — clean no-code projects and lossless Forge ROM reopening. */
(()=>{
'use strict';
const F=window.Forge166=window.Forge166||{},cp=value=>JSON.parse(JSON.stringify(value));

const physical=['moveSpeed','jumpSpeed','gravity','maxFallSpeed','bodyWidth','bodyHeight'];
function blankProject(){
  const scene=makeScene({id:Forge164.model.uid('scene'),name:'My First Room',chr:normalizeTiles(),sprChr:normalizeTiles(),tileProps:Array(256).fill(0),
    sceneType:'sideview',scrollDir:'none',view:{x:0,y:0,w:256,h:240,followEnt:-1,hBorder:32,vBorder:24},entities:[],oam:[],buildInclude:true,buildOrder:0});
  const gameplay={...Forge165.config.defaults(),mode:'single-room',sceneId:scene.id};
  return {format:'NESForge',version:window.Forge?.services?.ProjectStore?.schema||12,foundation:window.Forge?.release?.version||'1.7',projectName:'My First NES Game',scenes:[scene],activeScene:0,worlds:[],animations:[],metasprites:[],
    gameplay,asmSource:'',instruments:[],patterns:[],orderList:[],sfx:[],tempo:150,speed:6,audRows:64,
    mapper:0,mirroring:'v',hasSRAM:false,prgBanks:2,chrBanks:1,packScenes:true,importedRom:null,
    selTile:0,editTile:0,selSprite:0,selEntity:-1,chrBank:'bg',_selAnim:0,_animFrame:0};
}
function inspect(bytes){
  if(!(bytes instanceof Uint8Array))throw Error('Open ROM requires NES ROM bytes');
  const header=parseRomHeader(bytes),prg=bytes.subarray(header.headerSize,header.headerSize+header.prgSize);
  // Recognized Forge data must not fall through to foreign-ROM capture when a
  // newer outer layout would be ignored by the retained v3 metadata decoder.
  if(header.prgSize===16384||header.prgSize===32768){
    const marker=(header.prgSize===32768?0x4000:0)+0x0ff0;
    if([... 'NFORGE15'].every((c,i)=>prg[marker+i]===c.charCodeAt(0))&&prg[marker+8]!==3)
      throw Error('Unsupported Forge ROM layout '+prg[marker+8]+'; this editor supports layout 3. Open it in a compatible NES Forge version.');
  }
  // These decoders validate checksums, lengths and every cross-record identity.
  // No emulator load, snapshot, project mutation, or playback change occurs here.
  const worlds=Forge161.build.inspectWorldRom(prg,header.prgSize),assets=Forge164.persistence.readRomAssets(bytes),gameplay=Forge165.readGameplayRom(bytes);
  const playable=!!gameplay,forge=!!worlds.extension;
  if(playable&&(header.mapper!==0||header.chrSize!==8192||assets?.version!==2))throw Error('Open as editable project requires a supported mapper 0 Forge gameplay ROM with MS16 v2 assets');
  return {header,prg,worlds,assets,gameplay,summary:{kind:playable?'playable':forge?'forge':'rom',
    label:playable?'Forge single-room ROM — partial editable recovery':forge?'Forge authoring ROM — scenes and assets':'Other NES ROM — runtime capture and original playback',
    mapper:header.mapper,sceneCount:worlds.sceneCount||0,editableProject:playable,captureOnly:!forge,...(playable?{restoration:'partial',gameplayCoreRecovered:false}:{})}};
}
function classifyRom(bytes){return {...inspect(bytes).summary};}
function projectFromRom(bytes,name){
  const info=inspect(bytes);if(!info.gameplay)throw Error('Open as editable project currently requires a Forge First Playable Room ROM. Use Import / Capture for other NES ROMs.');
  const {header,prg,assets,worlds,gameplay}=info,data=blankProject(),scenes=extractScenes(prg,header.prgSize);
  if(!scenes.length||scenes.length!==worlds.sceneCount)throw Error('Forge ROM scenes could not be restored');
  const bg=decodeTiles(bytes,header.headerSize+header.prgSize),sprite=decodeTiles(bytes,header.headerSize+header.prgSize+4096);
  scenes.forEach((scene,index)=>{scene.chr=cp(bg);scene.sprChr=cp(sprite);scene.buildInclude=true;scene.buildOrder=index;});
  data.scenes=scenes;data.activeScene=gameplay.sceneIndex;data.metasprites=cp(assets.frames);data.animations=cp(assets.animations);
  // IDs can remain stable because this opens a new project rather than appending
  // into an existing namespace. Repeated build/open cycles do not grow records.
  for(const frame of data.metasprites){frame.sceneId=scenes[frame.buildSceneIndex].id;delete frame.buildSceneIndex;}
  for(const animation of data.animations)for(const frame of animation.frames)if(!frame.metaspriteId){frame.sceneId=scenes[frame.buildSceneIndex].id;delete frame.buildSceneIndex;}
  for(const saved of assets.entities){const entity=scenes[saved.buildSceneIndex].entities[saved.entityIndex];entity.id=saved.id;
    if(saved.animationBinding!==undefined)entity.animationBinding=cp(saved.animationBinding);}
  data.worlds=cp(worlds.worlds||[]).map(world=>{if(worlds.version<2)throw Error('Editable gameplay ROM requires world source identities');const scene=scenes[world.buildSceneIndex];if(!scene)throw Error('Forge world references a missing source scene');const out={...world,tilesetSceneId:scene.id};delete out.buildSceneIndex;return out;});
  const room=scenes[gameplay.sceneIndex];data.gameplay={...Forge165.config.defaults(),mode:'single-room',sceneId:room.id,
    playerId:room.entities[gameplay.playerIndex].id,targetId:gameplay.targetIndex<0?'':room.entities[gameplay.targetIndex].id};
  for(const key of physical)data.gameplay[key]=gameplay[key];
  data.projectName=String(name||'Reopened Forge Game').replace(/\.nes$/i,'').slice(0,120)||'Reopened Forge Game';
  data.mapper=header.mapper;data.mirroring=header.mirror===1?'v':'h';data.hasSRAM=header.battery;data.prgBanks=2;data.chrBanks=1;data.importedRom=bytesToBase64(bytes);
  Forge164.model.validateProject(data,{references:true});Forge165.config.validate(data.gameplay);
  return data;
}
function stopPlayback(){
  emuPause();clearEmuKeys();aud_stop();anim_stopPreview();Forge164.studio?.pause();Forge164.frameEditor?.cancelDrag();
  emu.loaded=false;emu.lastBuiltRom=null;window._lastBuiltRom=null;Forge165.lastBuild=null;disasm_output='';disasm_asmText='';
  scenePainting=false;entityDrag=null;sprDragging=false;
  for(const id of ['emuRunBtn','emuStepBtn','emuResetBtn','emuCapBtn','emuCapFrameBtn','emuCapHybridBtn','emuTraceBtn'])document.getElementById(id).disabled=true;
}
// History entries are JSON strings. Unique trailing JSON whitespace marks only
// project-replacement boundaries, without adding fields to portable projects.
// The registry stores short tags, never retained copies of large old projects.
let boundaryCounter=0;const boundaryTags=new Set();
function tagHistory(text){const tag='\n'+(++boundaryCounter).toString(2).replace(/0/g,' ').replace(/1/g,'\t')+'\n';boundaryTags.add(tag);return text+tag;}
function isBoundary(text){if(typeof text!=='string')return false;const tag=text.match(/\n[ \t]+\n$/)?.[0];return !!tag&&boundaryTags.has(tag);}
function replaceProject(data){
  Forge164.model.validateProject(data,{references:false});Forge165.config.validate(data.gameplay);
  const before=db_serializeState(),identity=S.projectId,history=undoStack.slice(),future=redoStack.slice(),bytes=undoBytes;
  try{
    // history:true loads through all existing migrations without clearing history.
    // Only the completed replacement receives an undo entry.
    db_deserializeState(data,{history:true});
    const boundary=tagHistory(before);undoStack.push(boundary);undoBytes+=boundary.length;redoStack.length=0;
    while(undoStack.length>MAX_UNDO||(undoBytes>24*1024*1024&&undoStack.length>1))undoBytes-=undoStack.shift().length;
  }catch(error){
    db_deserializeState(before,{history:true});S.projectId=identity;undoStack.splice(0,undoStack.length,...history);redoStack.splice(0,redoStack.length,...future);undoBytes=bytes;throw error;
  }
  S.projectId=null;stopPlayback();S.asmSource='';document.getElementById('codeInput').value='';
  S.entPlaceTool=null;S.selEntity=-1;S.selSprite=S.oam.length?0:-1;S.selPal=0;ent_buildToolbar();
  document.getElementById('undoBtn').disabled=false;switchTab('scene');notify('newEditableProject');F.ui?.refresh();return true;
}
function create(kind='blank'){
  if(kind!=='blank')throw Error('Choose a blank project');
  const data=blankProject();data.foundation=window.Forge?.release?.version||'1.7';
  replaceProject(data);showToast('Blank playable room created — add art, a player and animation states');return true;
}
function openRom(bytes,name){const data=projectFromRom(bytes,name);replaceProject(data);const message='Forge single-room ROM opened with partial editable recovery — Gameplay Core source is not embedded in GP16/layout 3. Original ROM retained for Run Original; use native JSON/ZIP for full authoring recovery.';showToast(message);const status=document.getElementById('issueStatus');if(status)status.textContent=message;return true;}
// Crossing a replacement boundary detaches the browser save identity and stops
// obsolete playback. Ordinary edits retain their existing undo/redo behavior.
const priorUndo=undo,priorRedo=redo;
undo=function(){const boundary=isBoundary(undoStack.at(-1)),result=priorUndo();if(boundary){const i=redoStack.length-1;redoStack[i]=tagHistory(redoStack[i]);S.projectId=null;stopPlayback();}return result;};
redo=function(){const boundary=isBoundary(redoStack.at(-1)),result=priorRedo();if(boundary){const i=undoStack.length-1,old=undoStack[i];undoStack[i]=tagHistory(old);undoBytes+=undoStack[i].length-old.length;S.projectId=null;stopPlayback();}return result;};
const priorImport=importRom;
importRom=function(bytes,name='Imported ROM'){
  let info;try{info=inspect(bytes);}catch(error){reportError(error);return false;}
  const result=priorImport(bytes,name);if(result){const message=info.summary.captureOnly?
    'Original ROM preserved and runtime scene captured. Original maps and game logic were not reconstructed.':
    'Forge scenes and authoring assets appended. Open as editable project for a clean playable-ROM rebuild.';
    showToast(message);document.getElementById('issueStatus').textContent=message;}
  return result;
};
F.project={create,openRom,classifyRom,replaceProject};
})();
