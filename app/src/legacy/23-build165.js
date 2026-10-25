/* NES Forge 1.6.5 — gameplay ROM packaging and checked configuration restore. */
(()=>{
'use strict';
const F=window.Forge165,E=new TextEncoder(),D=new TextDecoder('utf-8',{fatal:true}),cp=v=>JSON.parse(JSON.stringify(v));
const BASE=0x8000,CONFIG_ADDR=0xB800,CONFIG_CAPACITY=0x800;
const physical=['moveSpeed','jumpSpeed','gravity','maxFallSpeed','bodyWidth','bodyHeight'];
function bounded(value,min,max,label){if(!Number.isInteger(value)||value<min||value>max)throw Error('Invalid gameplay '+label);}
function validateRecord(record){
  if(!record||record.format!=='NESForgeGameplay'||record.version!==1)throw Error('Unsupported gameplay configuration record');
  bounded(record.sceneIndex,0,6,'room index');bounded(record.playerIndex,0,15,'player index');bounded(record.targetIndex,-1,15,'target index');
  if(record.targetIndex===record.playerIndex)throw Error('Gameplay player and target cannot be the same entity');
  const config=F.config.defaults();config.mode='single-room';for(const key of physical)config[key]=record[key];F.config.validate(config);
  return record;
}
function encodeRecord(record){
  validateRecord(record);const payload=E.encode(JSON.stringify(record));
  if(payload.length+13>CONFIG_CAPACITY)throw Error('Gameplay configuration exceeds its reserved ROM region');
  const bytes=new Uint8Array(13+payload.length),view=new DataView(bytes.buffer);bytes.set(E.encode('GP16'));bytes[4]=1;view.setUint32(5,payload.length,true);view.setUint32(9,zipCRC(payload),true);bytes.set(payload,13);return bytes;
}
function readGameplayRom(rom){
  const header=parseRomHeader(rom);if(header.prgSize!==32768)return null;
  const prg=rom.subarray(header.headerSize,header.headerSize+header.prgSize),at=CONFIG_ADDR-BASE;
  if(![71,80,49,54].every((byte,i)=>prg[at+i]===byte))return null;
  if(prg[at+4]!==1)throw Error('Unsupported GP16 gameplay metadata version');
  if(D.decode(prg.subarray(0x4FF0,0x4FF8))!=='NFORGE15'||prg[0x4FF8]!==3)throw Error('GP16 gameplay metadata requires a compatible packed Forge ROM');
  const view=new DataView(prg.buffer,prg.byteOffset+at,CONFIG_CAPACITY),length=view.getUint32(5,true);
  if(!length||length+13>CONFIG_CAPACITY)throw Error('Invalid GP16 gameplay metadata length');
  const payload=prg.subarray(at+13,at+13+length);if(zipCRC(payload)!==view.getUint32(9,true))throw Error('GP16 gameplay metadata checksum mismatch');
  const record=validateRecord(JSON.parse(D.decode(payload)));
  const assets=Forge164.persistence.readRomAssets(rom);if(!assets)throw Error('Gameplay ROM is missing its animation/entity authoring metadata');
  const scenes=extractScenes(prg,header.prgSize),scene=scenes[record.sceneIndex];
  if(!scene||scene.entities[record.playerIndex]?.type!=='player')throw Error('Gameplay metadata references a missing player');
  if(record.targetIndex>=0&&!['npc','enemy'].includes(scene.entities[record.targetIndex]?.type))throw Error('Gameplay metadata references a missing training target');
  const find=index=>assets.entities.find(e=>e.buildSceneIndex===record.sceneIndex&&e.entityIndex===index);
  if(!find(record.playerIndex)||(record.targetIndex>=0&&!find(record.targetIndex)))throw Error('Gameplay entity identities are missing from authoring metadata');
  return record;
}
const previousBuild=buildNesRom;
function buildGameplay(){
  window._lastBuiltRom=null;F.lastBuild=null;
  const blog=document.getElementById('buildLog');
  const log=(message,kind='bl-ok')=>{const row=document.createElement('div');row.className=kind;row.textContent=message;blog.appendChild(row);};
  try{
    saveCurrentScene();const config=cp(F.config.get());F.config.validate(config,{references:true});
    if(document.getElementById('codeInput').value.trim())throw Error('Playable room uses generated code. Save and clear custom ASM, or select Scene viewer/custom build mode.');
    if(S.mapper!==0)throw Error('First Playable Room currently builds mapper 0 (NROM)');
    const mode=window._buildAndRunMode;let baseRom;
    try{window._buildAndRunMode=true;baseRom=previousBuild();}finally{window._buildAndRunMode=mode;}
    if(!baseRom){window._lastBuiltRom=null;return null;}
    const header=parseRomHeader(baseRom);if(header.prgSize!==16384||header.chrSize!==8192)throw Error('Gameplay compiler requires the generated 16 KB scene layout and 8 KB CHR');
    const spec=F.compileGameplay(baseRom,config),engine=F.makeGameplayEngine(spec);
    if(!(engine.bytes instanceof Uint8Array)||engine.bytes.length>CONFIG_ADDR-BASE)throw Error('Gameplay engine overlaps reserved configuration metadata');
    for(const key of ['reset','nmi','irq'])bounded(engine[key],BASE,CONFIG_ADDR-1,key+' vector');
    const record={format:'NESForgeGameplay',version:1,sceneIndex:spec.sceneIndex,playerIndex:spec.playerIndex,targetIndex:spec.targetIndex};
    for(const key of physical)record[key]=config[key];const metadata=encodeRecord(record);
    const rom=new Uint8Array(16+32768+8192);rom.set(baseRom.subarray(0,16));rom[4]=2;
    rom.set(baseRom.subarray(header.headerSize,header.headerSize+16384),16+16384);
    rom.set(engine.bytes,16);rom.set(metadata,16+CONFIG_ADDR-BASE);
    const vectors=[engine.nmi,engine.reset,engine.irq];vectors.forEach((v,i)=>{rom[16+0x7FFA+i*2]=v&255;rom[16+0x7FFB+i*2]=v>>8;});
    rom.set(baseRom.subarray(header.headerSize+16384,header.headerSize+16384+8192),16+32768);
    // The same strict path used before import also checks every freshly written record.
    readGameplayRom(rom);
    window._lastBuiltRom=rom;F.lastBuild={spec,symbols:engine.symbols,codeEnd:engine.codeEnd,dataEnd:engine.dataEnd,record,rom};
    blog.textContent='';log('Built First Playable Room: 32 KB NROM PRG + 8 KB CHR.');
    log('Left/Right: move · A: jump · B: attack · Start: restart.');
    log('Solid collision, bound animation poses, and one hit per attack execute in the ROM.');
    log('Authoring scenes, worlds, frames, boxes, events, and bindings remain preserved for re-import.');
    for(const warning of spec.warnings||[])log(warning,'bl-warn');
    log('One room, fixed camera, stationary training target. Music and custom event execution remain future work.','bl-warn');
    if(!window._buildAndRunMode)download(rom,(S.projectName||'game').replace(/[^\w-]/g,'_')+'.nes');
    showToast('Playable room built — '+rom.length+' bytes');return rom;
  }catch(error){window._lastBuiltRom=null;F.lastBuild=null;log(error.message,'bl-err');reportError(error);return null;}
}
buildNesRom=function(){return F.config.get().mode==='single-room'?buildGameplay():previousBuild();};
const previousImport=importRom;
importRom=function(rom,name){
  let record;try{record=readGameplayRom(rom);}catch(error){reportError(error);return false;}
  const before=S.scenes.length,result=previousImport(rom,name);if(!result||!record)return result;
  const scene=S.scenes[before+record.sceneIndex],config=F.config.defaults();
  config.mode='single-room';config.sceneId=scene.id;config.playerId=scene.entities[record.playerIndex].id;config.targetId=record.targetIndex<0?'':scene.entities[record.targetIndex].id;
  for(const key of physical)config[key]=record[key];S.gameplay=config;F.ui?.refresh();notify('gameplayRomImport');return result;
};
F.readGameplayRom=readGameplayRom;F.encodeGameplayRecord=encodeRecord;F.buildGameplay=buildGameplay;
})();


