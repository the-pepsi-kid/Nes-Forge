/* NES Forge — bounded, read-only decoding followed by explicit project import.
 * This adapter recognizes one independently authored native NROM engine. It
 * does not infer collision from pictures or recover arbitrary 6502 programs.
 */
(()=>{
'use strict';
const services=(window.Forge=window.Forge||{}).services=window.Forge.services||{};
const VERSION=1,PROFILE_ID='native-room-v1';
const ENGINE_SHA256='4bfc96c8e33bd94f738cb337d8305a6d32ec25dacf6edab991dde215ed3f16e8';
const EXPECTED_VECTORS=[0x8186,0x8000,0x8195]; // NMI, RESET, IRQ.
const cp=value=>JSON.parse(JSON.stringify(value));
function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const item of Object.values(value))freeze(item);Object.freeze(value);}return value;}
const profile=freeze({id:PROFILE_ID,name:'Native Room v1 — original NROM homebrew',version:VERSION,mapper:0,prgBytes:32768,chrBytes:8192,engineSha256:ENGINE_SHA256});
const accepted=new WeakSet();
function fail(message){throw Error('RE recovery: '+message);}
function integer(value,min,max,label){if(!Number.isInteger(value)||value<min||value>max)fail(label+' must be '+min+'–'+max+'.');return value;}
async function hash(bytes){
  if(!window.crypto?.subtle?.digest)fail('SHA-256 is unavailable in this browser context. Open Forge in a browser with Web Crypto support.');
  const digest=await window.crypto.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
}
function snapshot(input){
  if(input instanceof Uint8Array){if(typeof SharedArrayBuffer!=='undefined'&&input.buffer instanceof SharedArrayBuffer)fail('Shared memory input is unsupported; choose a normal ROM file.');return new Uint8Array(input);}
  if(input instanceof ArrayBuffer)return new Uint8Array(input.slice(0));
  fail('Choose a ROM byte array or ArrayBuffer.');
}
function header(bytes){
  if(bytes.length<16)fail('Truncated iNES header.');
  if(bytes[0]!==0x4e||bytes[1]!==0x45||bytes[2]!==0x53||bytes[3]!==0x1a)fail('Not an iNES ROM. Inspection reports are not ROMs or editable projects.');
  if((bytes[7]&12)===8)fail('NES 2.0 recovery is not supported by this profile.');
  if(bytes[4]!==2||bytes[5]!==1||bytes[6]!==0||bytes[7]!==0||bytes.slice(8,16).some(byte=>byte!==0))fail('Unsupported ROM header. This recovery profile requires standard iNES, mapper 0, 32 KiB PRG, 8 KiB CHR, horizontal mirroring, and no trainer or extensions.');
  if(bytes.length!==40976)fail('ROM length does not match the supported 32 KiB PRG + 8 KiB CHR layout; truncated or trailing data is unsupported.');
}
const offset=cpu=>16+cpu-0x8000;
function span(bytes,cpu,length,label){const start=offset(cpu);if(!Number.isInteger(length)||length<0||start<16||start+length>16+32768)fail(label+' is outside the PRG bank.');return Array.from(bytes.slice(start,start+length));}
function decodeChr(bytes,start){return Array.from({length:256},(_,tile)=>Array.from({length:8},(_,y)=>Array.from({length:8},(_,x)=>((bytes[start+tile*16+y]>>(7-x))&1)|(((bytes[start+tile*16+y+8]>>(7-x))&1)<<1))));}
function recoverMetatiles(nt,attr,collision){
  const definitions=[],metaMap=[],keys=new Map(),tileProps=Array(256).fill(0),seen=new Map();
  for(let cell=0;cell<960;cell++){const tile=nt[cell],value=collision[cell];if(!seen.has(tile))seen.set(tile,value);else if(seen.get(tile)!==value)seen.set(tile,-1);}
  for(const [tile,value] of seen)if(value>=0)tileProps[tile]=value;
  for(let cell=0;cell<240;cell++){
    const row=Math.floor(cell/16)*2,column=(cell%16)*2,positions=[row*32+column,row*32+column+1,(row+1)*32+column,(row+1)*32+column+1];
    const tiles=positions.map(at=>nt[at]),solid=positions.map(at=>collision[at]);
    const quadrant=((row>>1)&1)*2+((column>>1)&1),pal=(attr[(row>>2)*8+(column>>2)]>>(quadrant*2))&3;
    const key=tiles.join(',')+'|'+pal+'|'+solid.join(',');
    if(!keys.has(key)){const id=definitions.length;keys.set(key,id);definitions.push({id,name:'Recovered block '+id,category:'Recovered native room',tiles,pal,collision:solid,flags:0});}
    // Keep ordinary Collision-tab editing authoritative for raw tiles whose
    // meaning is consistent. Only ambiguous reuse needs per-cell overrides.
    metaMap.push(tiles.some(tile=>seen.get(tile)===-1)?keys.get(key):-1);
  }
  return {metatiles:definitions,metaMap,tileProps};
}
function recoverData(bytes){
  const nt=span(bytes,0xb000,960,'Nametable'),attr=span(bytes,0xb3c0,64,'Attributes'),collision=span(bytes,0xc000,960,'Collision map'),palette=span(bytes,0xd000,32,'Palette'),player=span(bytes,0xd020,8,'Player configuration'),audio=span(bytes,0xd030,4,'Music configuration');
  for(const value of collision)if(value!==0&&value!==1)fail('The native collision map has an unsupported value; only decoded Empty (0) and Solid (1) are supported.');
  for(const value of palette)integer(value,0,63,'Palette color');
  // NES palette mirrors and Forge's canonical palettes share one background.
  // Refuse a palette which would change meaning during canonical normalization.
  for(let row=0;row<8;row++)if(palette[row*4]!==palette[0])fail('Palette background aliases differ; lossless canonical palette recovery is unsupported.');
  const [x,y,width,height,moveSpeed,jumpSpeed,gravity,maxFallSpeed]=player;
  integer(width,2,32,'Player width');if(width%2)fail('Player width must be even.');integer(height,2,48,'Player height');integer(moveSpeed,1,4,'Move speed');integer(jumpSpeed,1,12,'Adapted jump speed');integer(gravity,1,3,'Adapted gravity');integer(maxFallSpeed,1,8,'Adapted fall speed');
  if(width!==8||height!==8||y!==208)fail('This native engine profile supports an 8×8 player with feet at Y=208; other body/row configurations are not recovered.');
  const left=x-width/2,right=left+width,top=y-height;
  if(left<0||right>256||top<0||y>240)fail('Player spawn body lies outside the supported room.');
  for(let row=Math.floor(top/8);row<=Math.floor((y-1)/8);row++)for(let col=Math.floor(left/8);col<=Math.floor((right-1)/8);col++)if(collision[row*32+col])fail('Player spawn overlaps decoded solid collision.');
  const [rows,framesPerRow,control,sweep]=audio;
  if(rows!==16)fail('Unsupported music record version/length; this engine profile requires exactly 16 pulse rows.');
  integer(framesPerRow,1,15,'Frames per music row');
  if((control&0x30)!==0x30||sweep!==0x08)fail('Unsupported pulse envelope or sweep configuration.');
  const duty=control>>6,volume=control&15,timers=span(bytes,0xd100,rows*2,'Pulse timer records'),notes=[];
  for(let row=0;row<rows;row++){
    const period=timers[row*2]|(timers[row*2+1]<<8),matches=[];
    for(let note=0;note<96;note++)if(services.AudioCompiler.timer(note)===period)matches.push(note);
    if(matches.length!==1)fail('Pulse row '+row+' has '+(matches.length?'ambiguous':'unsupported')+' timer '+period+'; it cannot be represented exactly as one canonical note.');
    notes.push(matches[0]);
  }
  return {nt,attr,collision,palette,player:{x,y,width,height,moveSpeed,jumpSpeed,gravity,maxFallSpeed},rows,framesPerRow,duty,volume,notes,timers,chr:decodeChr(bytes,32784),sprChr:decodeChr(bytes,36880),...recoverMetatiles(nt,attr,collision)};
}
function createProject(data,bytes,name){
  const sceneId='re-room-v1',playerId='re-player-v1',frameId='re-player-frame-v1',states=['idle','walk','attack'],p=data.player;
  const pal=Array.from({length:4},(_,i)=>data.palette.slice(i*4,i*4+4)),sprPal=Array.from({length:4},(_,i)=>data.palette.slice(16+i*4,20+i*4));
  const scene={id:sceneId,name:'Recovered native room',chr:data.chr,sprChr:data.sprChr,nt:data.nt,attr:data.attr,pal,sprPal,bgColor:data.palette[0],tileProps:data.tileProps,metatiles:data.metatiles,metaMap:data.metaMap,sceneType:'sideview',scrollDir:'none',gravity:p.gravity,view:{x:0,y:0,w:256,h:240,followEnt:-1,hBorder:32,vBorder:24},entities:[{id:playerId,name:'Recovered player (adapted controls)',type:'player',x:p.x,y:p.y,w:p.width,h:p.height,sprTile:0,animationBinding:{defaultState:'idle',facing:'right',states:states.map(state=>({state,animationId:'re-'+state+'-v1'}))}}],oam:[],links:[],buildInclude:true,buildOrder:0};
  const blank=()=>({note:-1,inst:-1,vol:-1,fx:0,fxp:0});
  return {format:'NESForge',version:12,foundation:'1.9.0',romLayout:3,worldAuthoring:3,metatileExtension:1,metaspriteExtension:2,entityAnimationExtension:1,projectName:(name.replace(/\.nes$/i,'')+' — recovered').slice(0,120),scenes:[scene],activeScene:0,chr:data.chr,sprChr:data.sprChr,nt:data.nt,attr:data.attr,pal,sprPal,oam:[],tileProps:data.tileProps,worlds:[],gameplay:{mode:'single-room',sceneId,playerId,targetId:'',moveSpeed:p.moveSpeed,jumpSpeed:p.jumpSpeed,gravity:p.gravity,maxFallSpeed:p.maxFallSpeed,bodyWidth:p.width,bodyHeight:p.height},worldRuntime:services.WorldConfig.defaults(),audioRuntime:{enabled:true,musicEnabled:true},gameplayCore:services.GameplayModel.defaults(),metasprites:[{id:frameId,name:'Recovered player sprite',sceneId,spriteMode:8,originX:4,originY:8,pieces:[{id:'re-player-piece-v1',tile:0,tile2:0,x:0,y:0,pal:0,flipH:false,flipV:false,behind:false}]}],animations:states.map(state=>({id:'re-'+state+'-v1',name:'Adapted '+state,state,loop:state!=='attack',frames:[{sceneId,tileIdx:0,metaspriteId:frameId,duration:8,hitboxes:[],hurtboxes:[],events:[]}]})),instruments:[{name:'Recovered constant pulse',volEnv:[data.volume],dutyEnv:[data.duty],arpEnv:[0],pitchEnv:[0],loopVol:0,loopArp:0}],patterns:[{rows:data.notes.map(note=>Array.from({length:5},(_,channel)=>channel===0?{note,inst:0,vol:15,fx:0,fxp:0}:blank()))}],orderList:[[0,0,0,0,0]],audRows:data.rows,tempo:150,speed:data.framesPerRow,sfx:[],asmSource:'',mapper:0,mirroring:'h',hasSRAM:false,prgBanks:2,chrBanks:1,packScenes:true,importedRom:bytesToBase64(bytes),selTile:0,editTile:0,selSprite:-1,selEntity:-1,chrBank:'bg',_selAnim:0,_animFrame:0};
}
async function analyze(input,name='native-room.nes'){
  // Copy before the first await: changing the caller's array cannot race hashes,
  // decoding, report evidence, or the exact original ROM retained by the project.
  const bytes=snapshot(input);header(bytes);
  if(name&&typeof name==='object')name=name.name;
  name=String(name||'native-room.nes').slice(0,240);
  const engineHash=await hash(bytes.slice(16,16+2048));
  if(engineHash!==ENGINE_SHA256)fail('Unsupported engine fingerprint. This preview recovers Native Room v1 only; collision, scenes and audio for this ROM have not been decoded. Use Load ROM for playback or the read-only inspector.');
  const vectors=span(bytes,0xfffa,6,'Vectors');
  if(EXPECTED_VECTORS.some((address,index)=>address!==(vectors[index*2]|vectors[index*2+1]<<8)))fail('Engine vectors differ from the recognized profile.');
  const sha256=await hash(bytes),data=recoverData(bytes),project=createProject(data,bytes,name);
  services.ProjectStore.prepareLoad(project);services.AudioCompiler.plan(project);
  const evidence=[['engine',0x8000,2048],['nametable',0xb000,960],['attributes',0xb3c0,64],['collision',0xc000,960],['palettes',0xd000,32],['playerConfig',0xd020,8],['musicConfig',0xd030,4],['pulseTimers',0xd100,32],['vectors',0xfffa,6]].map(([kind,cpuAddress,length])=>({kind,cpuAddress,fileOffset:offset(cpuAddress),length,sourceSha256:sha256}));
  evidence.push({kind:'backgroundCHR',fileOffset:32784,length:4096,sourceSha256:sha256},{kind:'spriteCHR',fileOffset:36880,length:4096,sourceSha256:sha256});
  const linkedCollisionCells=data.metaMap.filter(id=>id>=0).length;
  const report=freeze({format:'NESForgeRERecovery',version:VERSION,profileId:PROFILE_ID,profileName:profile.name,source:{name,sha256,byteLength:bytes.length},engine:{sha256:engineHash,verified:true},recovered:{sceneCount:1,chrTiles:512,collisionCells:960,solidCells:data.collision.reduce((sum,value)=>sum+value,0),metatiles:data.metatiles.length,collisionMode:linkedCollisionCells?'tile-properties-with-cell-overrides':'tile-properties',linkedCollisionCells,musicRows:data.rows,pulseNotes:data.notes.length},audio:{channel:'Pulse 1',framesPerRow:data.framesPerRow,canonicalNotes:data.notes,timers:Array.from({length:16},(_,row)=>data.timers[row*2]|data.timers[row*2+1]<<8)},evidence,limitations:['Supports the independently authored Native Room v1 engine only; not arbitrary commercial games or NESmaker projects.','Graphics, room layout and cell collision are decoded from native ROM data; no Forge project metadata is used.','Original gameplay code is not recovered. Spawn and art are adapted to Forge single-room controls, which add default jump and attack states; reserved jump/gravity/fall configuration bytes become Forge physics, not recovered original behavior. Attack has no damage hitboxes.','One constant-volume Pulse 1 melody is decoded to editable tracker notes. Other sound drivers, SFX and audio effects are not supported.','The imported original is retained byte-for-byte for Run Original. Builds use Forge runtime behavior and are not byte-identical reconstructions.']});
  freeze(project);
  const analysis=Object.freeze({report,exportProject:()=>cp(project)});accepted.add(analysis);return analysis;
}
function importProject(analysis){
  if(!accepted.has(analysis))fail('Import requires a successful analysis created by this editor instance. Re-analyze the ROM.');
  const project=analysis.exportProject();
  // Reject before any project, playback or history mutation. The existing
  // replacement boundary owns undo, browser identity detachment and UI refresh.
  services.ProjectStore.prepareLoad(project);services.AudioCompiler.plan(project);
  return Forge166.project.replaceProject(project);
}
services.REBridge=Object.freeze({version:VERSION,analyze,importProject,supportedProfile:()=>profile});
})();
