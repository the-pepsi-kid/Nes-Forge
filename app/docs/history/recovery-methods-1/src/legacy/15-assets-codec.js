/* NES Forge 1.6.3: project v6 and MS16 v1 authoring preservation. */
(()=>{
'use strict';
const F=window.Forge163=window.Forge163||{}, M=F.metasprites, E=new TextEncoder(), D=new TextDecoder('utf-8',{fatal:true});
const cp=v=>JSON.parse(JSON.stringify(v)), uid=p=>p+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,10);
function integer(v,min,max,label){if(!Number.isInteger(v)||v<min||v>max)throw Error(label+' must be an integer from '+min+' through '+max);}
function str(v,label,max=255){if(typeof v!=='string'||E.encode(v).length>max)throw Error(label+' must be text of at most '+max+' UTF-8 bytes');}
function validate(frames,animations,scenes,{references=true,rom=false}={}){
  if(!Array.isArray(frames)||frames.length>256)throw Error('Metasprites must contain at most 256 frames');
  const ids=new Set(),sceneIds=new Set(scenes.map(s=>s.id));
  for(const f of frames){
    if(!f||typeof f!=='object')throw Error('Invalid metasprite frame');
    str(f.id,'Metasprite ID');if(!f.id||ids.has(f.id))throw Error('Missing or duplicate metasprite ID');ids.add(f.id);
    str(f.name,'Metasprite name');str(f.sceneId,'Metasprite source scene');
    if(references&&!sceneIds.has(f.sceneId))throw Error('Metasprite "'+f.name+'" has a missing source scene');
    if(![8,16].includes(f.spriteMode))throw Error('Metasprite size must be 8 or 16');
    integer(f.originX,-2048,2047,'Origin X');integer(f.originY,-2048,2047,'Origin Y');
    if(!Array.isArray(f.pieces)||f.pieces.length>128)throw Error('Metasprite exceeds 128 authored pieces');
    const pieces=new Set();
    for(const p of f.pieces){
      if(!p||typeof p!=='object')throw Error('Invalid metasprite piece');
      str(p.id,'Piece ID');if(!p.id||pieces.has(p.id))throw Error('Missing or duplicate piece ID');pieces.add(p.id);
      integer(p.tile,0,255,'Piece tile');integer(p.tile2,0,255,'Piece bottom tile');integer(p.x,-2048,2047,'Piece X');integer(p.y,-2048,2047,'Piece Y');integer(p.pal,0,3,'Piece palette');
      for(const k of ['flipH','flipV','behind'])if(typeof p[k]!=='boolean')throw Error('Invalid piece '+k);
    }
  }
  if(!Array.isArray(animations)||(rom&&animations.length>256))throw Error('ROM animations must contain at most 256 entries');
  const animIds=new Set();
  for(const a of animations){
    if(!a||typeof a!=='object'||!Array.isArray(a.frames)||!a.frames.length||(rom&&a.frames.length>1024))throw Error('Animation must contain 1–1024 frames');
    if(a.id!=null){str(a.id,'Animation ID');if(!a.id||animIds.has(a.id))throw Error('Missing or duplicate animation ID');animIds.add(a.id);}
    str(a.name,'Animation name',rom?255:64*1024*1024);str(a.state||'','Animation state',rom?255:64*1024*1024);
    for(const f of a.frames){
      integer(f.duration,1,255,'Animation duration');
      if(f.metaspriteId){str(f.metaspriteId,'Animation metasprite ID');if(references&&!ids.has(f.metaspriteId))throw Error('Animation "'+a.name+'" references a missing metasprite');}
      else {integer(f.tileIdx,0,255,'Animation tile');if(f.sceneId&&references&&!sceneIds.has(f.sceneId))throw Error('Animation references a missing source scene');}
    }
  }
  return true;
}
const oldProject=projectData;
projectData=function(){const d=oldProject();d.version=6;d.foundation='1.6.3';d.metaspriteExtension=1;d.metasprites=cp(S.metasprites||[]);d.animations=cp(S.animations||[]);return d;};
const oldLoad=db_deserializeState;
db_deserializeState=function(input,options={}){
  const raw=typeof input==='string'?JSON.parse(input):cp(input);
  if(raw?.version>6)throw Error('This project needs a newer NES Forge version');
  let frames=raw.metasprites||[],animations=raw.animations||[];
  if(raw.version===6)validate(frames,animations,raw.scenes||[],{references:false});
  else if(frames.length){
    // Older releases had an unused placeholder collection. Preserve its bytes;
    // only recognized composer records may become editable frame assets.
    if(!frames.every(f=>f&&Array.isArray(f.pieces)&&f.sceneId))throw Error('Legacy metasprite data is not a composer frame collection. Open it in its originating editor and export it before migration.');
    frames=M.normalizeAll(frames);
  }
  const base=cp(raw);if(base.version===6)base.version=5;
  base.metasprites=frames;
  const ok=oldLoad(base,options);
  S.metasprites=cp(frames);
  S.animations.forEach((a,i)=>{a.id=animations[i]?.id||uid('anim');a.frames.forEach((f,j)=>{const src=animations[i]?.frames?.[j];if(src?.metaspriteId)f.metaspriteId=src.metaspriteId;if(src?.sceneId)f.sceneId=src.sceneId;});});
  M.render();if(S.tab==='anim')render();return ok;
};
function exportPayload(){saveCurrentScene();return {format:'NESForgeMetasprites',version:1,metasprites:cp(S.metasprites||[]),animations:cp(S.animations||[]),sources:S.scenes.filter(sc=>(S.metasprites||[]).some(f=>f.sceneId===sc.id)).map(sc=>({id:sc.id,name:sc.name,sprChr:cp(sc.sprChr),sprPal:cp(sc.sprPal)}))};}
F.exportMetasprites=()=>download(E.encode(JSON.stringify(exportPayload(),null,2)),(S.projectName||'project').replace(/[^\w-]/g,'_')+'.metasprites.json','application/json');
const oldZip=buildZip;
buildZip=function(files){if(Array.isArray(files)&&files.some(f=>f.name==='project.json')&&!files.some(f=>f.name==='metasprites.json'))files=[...files,{name:'metasprites.json',data:E.encode(JSON.stringify(exportPayload()))}];return oldZip(files);};

function tileSource(sceneId){const sc=S.scenes.find(s=>s.id===sceneId);if(!sc)throw Error('Missing metasprite or animation source scene');return sc===S.scenes[S.activeScene]?S.sprChr:sc.sprChr;}
function linkAssets(plan){
  validate(S.metasprites||[],S.animations||[],S.scenes,{rom:true});
  const frames=cp(S.metasprites||[]),animations=cp(S.animations||[]),indices=new Map(plan.entries.map((e,i)=>[e.sc.id,i]));
  const used=new Set();
  for(const sc of plan.atlas.scenes){for(const p of sc.oam||[])if(p.active){used.add(p.tile);if(p.height===16)used.add(p.tile2??((p.tile+1)&255));}for(const e of sc.entities||[])if(e.sprTile>=0)used.add(e.sprTile);}
  const cache=new Map();
  function link(sceneId,tile){
    if(!indices.has(sceneId))throw Error('A metasprite or animation uses an excluded source scene. Include it in the Build Scene Set.');
    const key=sceneId+':'+tile;if(cache.has(key))return cache.get(key);
    const src=tileSource(sceneId)[tile];if(!src)throw Error('Metasprite source tile '+tile+' is unavailable');
    const signature=tileKeyFromData(src),bank=plan.atlas.sprChr;
    let target;
    if(plan.custom){target=tile;if(tileKeyFromData(bank[tile])!==signature)throw Error('Custom ASM requires metasprite tiles to match its fixed sprite CHR IDs');}
    else {
      target=bank.findIndex(t=>tileKeyFromData(t)===signature);
      if(target<0){target=bank.findIndex((_,i)=>!used.has(i));if(target<0)throw Error('Metasprite/animation graphics exceed 256 sprite CHR tiles; nothing was truncated');bank[target]=cp(src);}
    }
    used.add(target);cache.set(key,target);return target;
  }
  for(const f of frames){
    const sid=f.sceneId;if(!indices.has(sid))throw Error('Metasprite "'+f.name+'" uses an excluded scene');
    f.buildSceneIndex=indices.get(sid);delete f.sceneId;
    for(const p of f.pieces){p.tile=link(sid,p.tile);p.tile2=f.spriteMode===16?link(sid,p.tile2):p.tile;}
  }
  for(const a of animations)for(const f of a.frames)if(!f.metaspriteId){const sid=f.sceneId||S.scenes[S.activeScene].id;f.tileIdx=link(sid,f.tileIdx);f.buildSceneIndex=indices.get(sid);delete f.sceneId;}
  return {frames,animations};
}
function encodeAssets(plan){
  if(!(S.metasprites?.length||S.animations?.length))return new Uint8Array();
  const {frames,animations}=linkAssets(plan),out=[];
  const u8=v=>out.push(v&255),u16=v=>out.push(v&255,(v>>8)&255),text=v=>{const b=E.encode(v||'');u16(b.length);out.push(...b);};
  u16(frames.length);
  for(const f of frames){text(f.id);text(f.name);u8(f.buildSceneIndex);u8(f.spriteMode);u16(f.originX);u16(f.originY);u16(f.pieces.length);for(const p of f.pieces){text(p.id);u8(p.tile);u8(p.tile2);u16(p.x);u16(p.y);u8(p.pal|(p.behind?32:0)|(p.flipH?64:0)|(p.flipV?128:0));}}
  u16(animations.length);
  for(const a of animations){text(a.id||'');text(a.name);text(a.state||'');u8((a.loop!==false?1:0)|(a.flipOnReverse?2:0));u16(a.frames.length);for(const f of a.frames){u8(f.duration);u8(f.metaspriteId?1:0);if(f.metaspriteId)text(f.metaspriteId);else{u8(f.buildSceneIndex);u8(f.tileIdx);}}}
  const payload=Uint8Array.from(out),header=new Uint8Array(13),view=new DataView(header.buffer);header.set(E.encode('MS16'));header[4]=1;view.setUint32(5,payload.length,true);view.setUint32(9,zipCRC(payload),true);
  const bytes=new Uint8Array(header.length+payload.length);bytes.set(header);bytes.set(payload,header.length);return bytes;
}
function decodeAssets(bytes){
  if(bytes.length<13||D.decode(bytes.slice(0,4))!=='MS16'||bytes[4]!==1)throw Error('Unsupported or truncated MS16 metadata');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),length=view.getUint32(5,true);
  if(length!==bytes.length-13)throw Error('MS16 length mismatch');
  const data=bytes.slice(13);if(zipCRC(data)!==view.getUint32(9,true))throw Error('MS16 checksum mismatch');
  let pos=0;function take(n){if(pos+n>data.length)throw Error('Truncated MS16 record');const r=data.slice(pos,pos+n);pos+=n;return r;}
  const u8=()=>take(1)[0],u16=()=>{const b=take(2);return b[0]|b[1]<<8;},i16=()=>{const v=u16();return v>32767?v-65536:v;},text=()=>D.decode(take(u16()));
  const frames=[],animations=[],count=u16();if(count>256)throw Error('Too many MS16 frames');
  for(let i=0;i<count;i++){const f={id:text(),name:text(),buildSceneIndex:u8(),spriteMode:u8(),originX:i16(),originY:i16(),pieces:[]},n=u16();if(n>128)throw Error('Too many MS16 pieces');for(let j=0;j<n;j++){const p={id:text(),tile:u8(),tile2:u8(),x:i16(),y:i16()},a=u8();if(a&28)throw Error('Invalid MS16 sprite attributes');Object.assign(p,{pal:a&3,behind:!!(a&32),flipH:!!(a&64),flipV:!!(a&128)});f.pieces.push(p);}frames.push(f);}
  const ac=u16();if(ac>256)throw Error('Too many MS16 animations');
  for(let i=0;i<ac;i++){const a={id:text(),name:text(),state:text()},flags=u8();if(flags>3)throw Error('Invalid MS16 animation flags');a.loop=!!(flags&1);a.flipOnReverse=!!(flags&2);a.frames=[];const n=u16();if(!n||n>1024)throw Error('Invalid MS16 animation length');for(let j=0;j<n;j++){const f={duration:u8()},type=u8();if(type===1){f.metaspriteId=text();f.tileIdx=0;}else if(type===0){f.buildSceneIndex=u8();f.tileIdx=u8();}else throw Error('Invalid MS16 frame type');a.frames.push(f);}if(!a.id)a.id=uid('anim');animations.push(a);}
  if(pos!==data.length)throw Error('Unexpected trailing MS16 bytes');
  return {frames,animations};
}
function readRomAssets(rom){
  const h=parseRomHeader(rom),prg=rom.slice(h.headerSize,h.headerSize+h.prgSize),m=h.prgSize-16384+0xFF0;
  if(![78,70,79,82,71,69,49,53].every((v,i)=>prg[m+i]===v)||prg[m+8]!==3)return null;
  const address=prg[m+10]|prg[m+11]<<8,length=prg[m+12]|prg[m+13]<<8,offset=address-(65536-h.prgSize);
  if(offset<0||offset+length>prg.length)throw Error('Invalid Forge metadata bounds');
  const ext=prg.slice(offset,offset+length);
  // WR16 parser exposes its exact consumed boundary. Never scan magic bytes
  // inside strings or pixel data to locate an extension.
  const info=Forge161.build.inspectWorldRom?.(prg,h.prgSize);
  let start=info?.end;
  if(start==null)return null;
  if(start===ext.length)return null;
  if(D.decode(ext.slice(start,start+4))!=='MS16')throw Error('Unknown metadata after WR16');
  const parsed=decodeAssets(ext.slice(start));
  const sceneCount=prg[m+9],scenes=Array.from({length:sceneCount},(_,i)=>({id:String(i)}));
  for(const f of parsed.frames){integer(f.buildSceneIndex,0,sceneCount-1,'Metasprite build scene');f.sceneId=String(f.buildSceneIndex);}
  for(const a of parsed.animations)for(const f of a.frames)if(!f.metaspriteId){integer(f.buildSceneIndex,0,sceneCount-1,'Animation build scene');f.sceneId=String(f.buildSceneIndex);}
  validate(parsed.frames,parsed.animations,scenes);return parsed;
}
F.build={extension(base,plan){const extra=encodeAssets(plan),out=new Uint8Array(base.length+extra.length);out.set(base);out.set(extra,base.length);return out;},encodeAssets,decodeAssets,readRomAssets,linkAssets};
F.persistence={validate,exportPayload};
const oldImport=importRom;
F.persistence.importBase=oldImport;
importRom=function(rom,name='Imported ROM'){
  let parsed;try{parsed=readRomAssets(rom);}catch(e){reportError(e);return false;}
  if(parsed&&(S.metasprites.length+parsed.frames.length>256||S.animations.length+parsed.animations.length>256)){reportError(Error('ROM import would exceed metasprite or animation authoring limits'));return false;}
  const before=S.scenes.length,ok=oldImport(rom,name);if(!ok||!parsed)return ok;
  const remap=new Map(parsed.frames.map(f=>[f.id,uid('ms')]));
  for(const f of parsed.frames){f.id=remap.get(f.id);f.sceneId=S.scenes[before+f.buildSceneIndex].id;delete f.buildSceneIndex;}
  for(const a of parsed.animations){a.id=uid('anim');for(const f of a.frames){if(f.metaspriteId)f.metaspriteId=remap.get(f.metaspriteId);else{f.sceneId=S.scenes[before+f.buildSceneIndex].id;delete f.buildSceneIndex;}}}
  S.metasprites.push(...parsed.frames);S.animations.push(...parsed.animations);M.render();markEdited('metaspriteRomImport');showToast('Restored '+parsed.frames.length+' metasprite frame(s) and '+parsed.animations.length+' animation(s)');return true;
};
const oldPreflight=window.forge15_preflight;
window.forge15_preflight=function(){const p=oldPreflight();if(!p)return null;const box=document.getElementById('forge15Preflight');try{if(p.pack){const extra=encodeAssets(p);if(extra.length)box.innerHTML+='<div class="ok">✓ MS16: '+(S.metasprites?.length||0)+' metasprite frame(s) and '+(S.animations?.length||0)+' animation(s), '+extra.length+' bytes</div><div class="warn">Metasprites and animation references are preserved in ROM metadata. The scene viewer does not play them yet. Final build checks contiguous ROM space.</div>';}else if(S.metasprites.length)box.innerHTML+='<div class="warn">Metasprites are saved in the project only while scene packing is disabled.</div>';return p;}catch(e){box.innerHTML+='<div class="err">✗ '+esc(e.message)+'</div>';return null;}};
document.getElementById('forge15PreflightBtn').onclick=window.forge15_preflight;
if(window.Forge15)Forge15.version='1.6.3';if(window.Forge16)Forge16.version='1.6.3';
const oldDocs=renderDocs;renderDocs=function(){oldDocs();const doc=document.querySelector('#sideDocs .doc');if(!doc)return;const section=document.createElement('section');section.innerHTML='<h2>1.6.3 — Metasprite Composer</h2><p>METASPRITES creates named character/object frames from source-scene Sprite CHR. Drag pieces, adjust palette/flips/priority, set an anchor, duplicate and mirror. Frames use a global 8×8 or 8×16 sprite size. An 8×16 piece contains two editable source tile IDs; pairing those source tiles for a hardware gameplay runtime is a later linker task.</p><p>ANIMATION can reference a complete metasprite frame while legacy tile animations remain editable. Project schema v6 and portable ZIP preserve all authoring data. Packed ROMs link used sprite tiles and preserve frames and animation references in checksummed MS16 v1 metadata after WR16 v3. Missing source scenes or excess CHR/ROM capacity fail explicitly. The generated viewer does not execute these animation or world semantics.</p><p>1.6.2 stabilization fixes metadata allocation and preserves destination identities in WR16 v3. Legacy WR16 v1/v2 can be read, but destination IDs omitted by those formats cannot be reconstructed reliably.</p>';doc.prepend(section);};
document.title='NES Forge 1.6.3 — Metasprite Composer';document.querySelector('h1').innerHTML='NES FORGE <small style="color:var(--grn)">1.6.3 METASPRITE COMPOSER</small>';
})();


