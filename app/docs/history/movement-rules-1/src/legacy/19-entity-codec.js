/* NES Forge 1.6.4: schema v7 and checksummed MS16 v2 authoring metadata. */
(()=>{
'use strict';
const F=window.Forge164=window.Forge164||{}, M=F.model, P=window.Forge163;
const E=new TextEncoder(),D=new TextDecoder('utf-8',{fatal:true}),cp=v=>JSON.parse(JSON.stringify(v));
const kinds=['attack_start','attack_end','footstep','sound','custom'];
const oldEncode=P.build.encodeAssets,oldDecode=P.build.decodeAssets,baseImport=P.persistence.importBase;
function fail(message){throw Error(message);}
function int(v,min,max,label){if(!Number.isInteger(v)||v<min||v>max)fail(label+' must be an integer from '+min+' through '+max);}
function refresh(){P.metasprites.render();F.frameEditor?.refresh();F.studio?.refresh();if(S.tab==='anim')render();}

const previousProject=projectData;
projectData=function(){M.ensure();const d=previousProject();d.version=7;d.foundation='1.6.4';d.entityAnimationExtension=1;d.metaspriteExtension=2;d.animations=cp(S.animations);d.scenes=cp(S.scenes);return d;};
const previousLoad=db_deserializeState;
db_deserializeState=function(input,options={}){
  const raw=typeof input==='string'?JSON.parse(input):cp(input);
  if(raw?.version>7)fail('This project needs a newer NES Forge version');
  // Check all authored fields before the legacy loader can stop playback,
  // clear history, or replace live state. Missing legacy fields are migrated later.
  M.validateProject(raw,{references:false});
  const base=cp(raw);if(base.version===7)base.version=6;
  const ok=previousLoad(base,options);
  S.animations.forEach((a,i)=>a.frames.forEach((frame,j)=>{
    const from=raw.animations?.[i]?.frames?.[j];
    for(const key of ['hitboxes','hurtboxes','events'])if(from?.[key]!==undefined)frame[key]=cp(from[key]);
  }));
  // makeScene currently copies entities. Restore explicitly so the extension
  // remains independent of future legacy scene normalization changes.
  S.scenes.forEach((sc,i)=>(sc.entities||[]).forEach((ent,j)=>{
    const from=raw.scenes?.[i]?.entities?.[j];
    if(from?.id!==undefined)ent.id=from.id;
    if(from?.animationBinding!==undefined)ent.animationBinding=cp(from.animationBinding);
  }));
  M.ensure();refresh();return ok;
};

function extensionPayload(){M.ensure();saveCurrentScene();return {format:'NESForgeEntityAnimations',version:1,
  semantics:'Authoring metadata only: frame-entry events, collisions, damage, audio and animation playback are not executed by the generated scene viewer.',
  animations:cp(S.animations),entities:S.scenes.flatMap(sc=>(sc.entities||[]).map(ent=>({sceneId:sc.id,id:ent.id,...(ent.animationBinding===undefined?{}:{animationBinding:cp(ent.animationBinding)})})))};}
const previousZip=buildZip;
buildZip=function(files){if(Array.isArray(files)&&files.some(f=>f.name==='project.json')&&!files.some(f=>f.name==='entity-animations.json'))files=[...files,{name:'entity-animations.json',data:E.encode(JSON.stringify(extensionPayload()))}];return previousZip(files);};

function sign(payload,version=2){
  const out=new Uint8Array(13+payload.length),view=new DataView(out.buffer);out.set(E.encode('MS16'));out[4]=version;
  view.setUint32(5,payload.length,true);view.setUint32(9,zipCRC(payload),true);out.set(payload,13);return out;
}
function writer(){
  const out=[];const bytes=b=>{if(out.length+b.length>65535)fail('MS16 authoring metadata exceeds ROM capacity (65535 bytes); reduce animations, boxes, events, or entities');for(const v of b)out.push(v);};
  return {u8:v=>bytes([v&255]),u16:v=>bytes([v&255,(v>>8)&255]),u32:v=>bytes([v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255]),bytes,
    text:v=>{const b=E.encode(v);if(b.length>255)fail('MS16 text exceeds 255 UTF-8 bytes');bytes([b.length]);bytes(b);},result:()=>Uint8Array.from(out)};
}
function reader(data){let pos=0;const take=n=>{if(!Number.isInteger(n)||n<0||pos+n>data.length)fail('Truncated MS16 v2 record');const b=data.subarray(pos,pos+n);pos+=n;return b;};
  const u8=()=>take(1)[0],u16=()=>{const b=take(2);return b[0]|b[1]<<8;},u32=()=>{const b=take(4);return new DataView(b.buffer,b.byteOffset,4).getUint32(0,true);};
  return {take,u8,u16,u32,i16:()=>{const v=u16();return v>32767?v-65536:v;},text:()=>D.decode(take(u8())),done:()=>{if(pos!==data.length)fail('Unexpected trailing MS16 v2 bytes');}};
}
function encodeAssets(plan){
  M.ensure();M.validateProject({version:7,scenes:S.scenes,animations:S.animations,metasprites:S.metasprites},{references:true,build:true});
  if(!(S.metasprites?.length||S.animations?.length||plan.entries.some(e=>e.sc.entities?.length)))return new Uint8Array();
  const base=oldEncode(plan),w=writer(),oldBytes=base.length?base:sign(Uint8Array.from([0,0,0,0]),1);
  w.u32(oldBytes.length);w.bytes(oldBytes);w.u16(S.animations.length);
  for(const animation of S.animations){
    w.u16(animation.frames.length);
    for(const frame of animation.frames){
      for(const kind of ['hitboxes','hurtboxes']){const boxes=frame[kind]||[];w.u8(boxes.length);for(const box of boxes){w.text(box.id);w.text(box.name);w.u16(box.x);w.u16(box.y);w.u16(box.w);w.u16(box.h);}}
      const events=frame.events||[];w.u8(events.length);for(const event of events){w.text(event.id);w.u8(kinds.indexOf(event.type));w.text(event.name);w.text(event.value);}
    }
  }
  int(plan.entries.length,1,7,'MS16 build scene count');w.u8(plan.entries.length);
  const animationIndices=new Map(S.animations.map((a,i)=>[a.id,i]));
  plan.entries.forEach((entry,buildSceneIndex)=>{
    const entities=entry.sc.entities||[];int(entities.length,0,16,'MS16 entity count');
    if(entities.length!==(plan.atlas.scenes[buildSceneIndex]?.entities?.length||0))fail('Build entity order changed during metadata linking');
    w.u8(entities.length);
    for(const ent of entities){
      w.text(ent.id);const binding=ent.animationBinding;w.u8(binding===undefined?0:1);
      if(binding!==undefined){w.text(binding.defaultState);w.u8(binding.facing==='left'?1:0);w.u8(binding.states.length);
        for(const state of binding.states){const ai=animationIndices.get(state.animationId);if(ai===undefined)fail('Entity state "'+state.state+'" references a missing animation');w.text(state.state);w.u16(ai);}}
    }
  });
  return sign(w.result());
}
function validateDecoded(parsed){
  const sceneCount=parsed.sceneEntityCounts.length,scenes=Array.from({length:sceneCount},(_,i)=>({id:String(i),entities:[]}));
  for(const ent of parsed.entities)scenes[ent.buildSceneIndex].entities.push({id:ent.id,...(ent.animationBinding===undefined?{}:{animationBinding:ent.animationBinding})});
  const frames=cp(parsed.frames),animations=cp(parsed.animations);
  for(const f of frames){int(f.buildSceneIndex,0,sceneCount-1,'Metasprite build scene');f.sceneId=String(f.buildSceneIndex);}
  for(const a of animations)for(const f of a.frames)if(!f.metaspriteId){int(f.buildSceneIndex,0,sceneCount-1,'Animation build scene');f.sceneId=String(f.buildSceneIndex);}
  P.persistence.validate(frames,animations,scenes,{references:true,rom:true});
  M.validateProject({version:7,scenes,metasprites:frames,animations},{references:true,build:true});
  return parsed;
}
function decodeAssets(bytes){
  if(!(bytes instanceof Uint8Array)||bytes.length<13)fail('Unsupported or truncated MS16 metadata');
  if(bytes[4]===1)return oldDecode(bytes);
  if(D.decode(bytes.subarray(0,4))!=='MS16'||bytes[4]!==2)fail('Unsupported MS16 metadata version');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),n=view.getUint32(5,true);
  if(n!==bytes.length-13)fail('MS16 length mismatch');const data=bytes.subarray(13);
  if(zipCRC(data)!==view.getUint32(9,true))fail('MS16 checksum mismatch');
  const r=reader(data),base=r.take(r.u32());if(base[4]!==1)fail('MS16 v2 requires one nested v1 asset block');
  const parsed=oldDecode(base),animationCount=r.u16();
  if(animationCount!==parsed.animations.length)fail('MS16 animation extension count mismatch');
  for(const animation of parsed.animations){const count=r.u16();if(count!==animation.frames.length)fail('MS16 animation frame extension count mismatch');
    for(const frame of animation.frames){
      for(const kind of ['hitboxes','hurtboxes']){const n=r.u8();int(n,0,16,'MS16 frame box count');frame[kind]=[];for(let i=0;i<n;i++)frame[kind].push({id:r.text(),name:r.text(),x:r.i16(),y:r.i16(),w:r.u16(),h:r.u16()});}
      const n=r.u8();int(n,0,16,'MS16 frame event count');frame.events=[];for(let i=0;i<n;i++){const id=r.text(),type=r.u8();int(type,0,kinds.length-1,'MS16 frame event type');frame.events.push({id,type:kinds[type],name:r.text(),value:r.text()});}
    }
  }
  const sceneCount=r.u8();int(sceneCount,1,7,'MS16 scene count');parsed.entities=[];parsed.sceneEntityCounts=[];
  for(let buildSceneIndex=0;buildSceneIndex<sceneCount;buildSceneIndex++){
    const count=r.u8();int(count,0,16,'MS16 scene entity count');parsed.sceneEntityCounts.push(count);
    for(let entityIndex=0;entityIndex<count;entityIndex++){
      const ent={buildSceneIndex,entityIndex,id:r.text()},bound=r.u8();int(bound,0,1,'MS16 binding flag');
      if(bound){const defaultState=r.text(),facing=r.u8();int(facing,0,1,'MS16 facing');const count=r.u8();int(count,0,16,'MS16 binding state count');
        ent.animationBinding={defaultState,facing:facing?'left':'right',states:[]};
        for(let i=0;i<count;i++){const state=r.text(),index=r.u16();int(index,0,parsed.animations.length-1,'MS16 binding animation index');ent.animationBinding.states.push({state,animationId:parsed.animations[index].id});}
      }
      parsed.entities.push(ent);
    }
  }
  r.done();parsed.version=2;return validateDecoded(parsed);
}
function strictEntityCounts(info){
  const b=info.extension,counts=[];
  for(let i=0;i<info.sceneCount;i++){
    const q=8+i*4,start=b[q]|b[q+1]<<8,stop=start+(b[q+2]|b[q+3]<<8);let p=start+15;
    if(p>=stop)fail('Truncated NFEX scene name');const nameLength=b[p++];p+=nameLength;if(p>=stop)fail('Truncated NFEX entity count');
    const count=b[p++];int(count,0,16,'NFEX entity count');counts.push(count);
    for(let j=0;j<count;j++){if(p>=stop||b[p]<9||p+b[p]>stop)fail('Truncated NFEX entity record');p+=b[p];}
  }
  return counts;
}
function readRomAssets(rom){
  const h=parseRomHeader(rom),prg=rom.slice(h.headerSize,h.headerSize+h.prgSize),info=Forge161.build.inspectWorldRom(prg,h.prgSize);
  if(!info.extension||info.end===info.extension.length)return null;
  const bytes=info.extension.subarray(info.end);if(D.decode(bytes.subarray(0,4))!=='MS16')fail('Unknown metadata after WR16');
  const parsed=decodeAssets(bytes),sceneCount=info.sceneCount,scenes=Array.from({length:sceneCount},(_,i)=>({id:String(i)}));
  for(const frame of parsed.frames){int(frame.buildSceneIndex,0,sceneCount-1,'Metasprite build scene');frame.sceneId=String(frame.buildSceneIndex);}
  for(const a of parsed.animations)for(const frame of a.frames)if(!frame.metaspriteId){int(frame.buildSceneIndex,0,sceneCount-1,'Animation build scene');frame.sceneId=String(frame.buildSceneIndex);}
  P.persistence.validate(parsed.frames,parsed.animations,scenes,{references:true,rom:true});
  if(parsed.version===2){const counts=strictEntityCounts(info);if(counts.length!==parsed.sceneEntityCounts.length||counts.some((n,i)=>n!==parsed.sceneEntityCounts[i]))fail('MS16 entity table does not match packed NFEX scene/entity counts');
    const extracted=extractScenes(prg,h.prgSize);if(extracted.length!==counts.length||extracted.some((sc,i)=>(sc.entities?.length||0)!==counts[i]))fail('MS16 entity bindings cannot be applied to malformed packed scenes');}
  return parsed;
}
importRom=function(rom,name='Imported ROM'){
  let parsed;
  try{
    if(typeof baseImport!=='function')fail('1.6.4 ROM importer integration hook is missing');
    parsed=readRomAssets(rom);
    if(parsed&&(S.metasprites.length+parsed.frames.length>256||S.animations.length+parsed.animations.length>256))fail('ROM import would exceed metasprite or animation authoring limits');
  }catch(error){reportError(error);return false;}
  const before=S.scenes.length,ok=baseImport(rom,name);if(!ok)return ok;
  if(parsed){
    const frames=new Map(parsed.frames.map(f=>[f.id,M.uid('ms')])),animations=new Map(parsed.animations.map(a=>[a.id,M.uid('anim')]));
    for(const f of parsed.frames){f.id=frames.get(f.id);f.sceneId=S.scenes[before+f.buildSceneIndex].id;delete f.buildSceneIndex;for(const piece of f.pieces)piece.id=M.uid('piece');}
    for(const a of parsed.animations){a.id=animations.get(a.id);for(const f of a.frames){
      if(f.metaspriteId)f.metaspriteId=frames.get(f.metaspriteId);else{f.sceneId=S.scenes[before+f.buildSceneIndex].id;delete f.buildSceneIndex;}
      for(const k of ['hitboxes','hurtboxes'])for(const box of f[k]||[])box.id=M.uid('box');for(const event of f.events||[])event.id=M.uid('event');
    }}
    for(const ent of parsed.entities||[]){const target=S.scenes[before+ent.buildSceneIndex].entities[ent.entityIndex];target.id=M.uid('entity');
      if(ent.animationBinding!==undefined){target.animationBinding=cp(ent.animationBinding);for(const state of target.animationBinding.states)state.animationId=animations.get(state.animationId);}}
    S.metasprites.push(...parsed.frames);S.animations.push(...parsed.animations);
  }
  M.ensure();refresh();markEdited('entityAnimationRomImport');showToast('ROM scenes and authoring assets restored'+(parsed?.version===2?' · animation bindings, boxes and events preserved':''));return true;
};
function extension(base,plan){const extra=encodeAssets(plan),out=new Uint8Array(base.length+extra.length);out.set(base);out.set(extra,base.length);return out;}
P.build.extension=extension;P.build.encodeAssets=encodeAssets;P.build.decodeAssets=decodeAssets;P.build.readRomAssets=readRomAssets;
F.persistence={encodeAssets,decodeAssets,readRomAssets,extension,extensionPayload,validateDecoded,sign};
const previousPreflight=window.forge15_preflight;
window.forge15_preflight=function(){const p=previousPreflight();if(!p)return null;const box=document.getElementById('forge15Preflight');try{
  M.ensure();M.validateProject({version:7,scenes:S.scenes,animations:S.animations,metasprites:S.metasprites},{references:!!p.pack,build:!!p.pack});
  if(p.pack){const bytes=encodeAssets(p),wr=Forge161.build.worldPayload(p),total=p.ext16.length+wr.length+bytes.length;
    if(total>0xCFF0-0xC200)fail('Combined authoring metadata needs '+total+' bytes but at most '+(0xCFF0-0xC200)+' bytes fit before $CFF0. Reduce assets or disable scene packing.');
    box.innerHTML+='<div class="ok">✓ MS16 v2: '+bytes.length+' bytes; entity bindings, contact boxes and frame events preserved</div><div class="warn">Authoring metadata only. The generated ROM remains a scene viewer; collision, damage, event/audio execution and character animation runtime come later.</div>';
  }else box.innerHTML+='<div class="warn">Entity animation bindings, contact boxes and events are preserved in project/ZIP only while scene packing is disabled.</div>';
  return p;
}catch(error){box.innerHTML+='<div class="err">✗ '+esc(error.message)+'</div>';return null;}};
document.getElementById('forge15PreflightBtn').onclick=window.forge15_preflight;
})();


