/* The ROM catalog is the library; Scenes/Metasprites/Animations are its editable
 * working copies. Decode on selection, never manufacture hundreds of empty
 * assets or infer actors/AI from parameter-table entries. ProjectStore owns edits.
 */
(()=>{
'use strict';
const s=Forge.services,cp=v=>JSON.parse(JSON.stringify(v)),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const fail=m=>{throw Error('ROM library: '+m);};
let cached=null;
const receipt=sc=>sc?.captureMeta?.nativeAssets;
const marker=sc=>sc?.captureMeta?.sourceLibrary;
const key=(kind,id,sha)=>'rom:'+sha+':'+kind+':'+id;
function identity(p=S){return p.investigation?.source||null;}
function contextScene(p=S){
 const source=identity(p),active=p.scenes[p.activeScene],r=receipt(active),m=marker(active),c=p.investigation?.catalogs.native;
 return (r?.source.sha256===source?.sha256&&c?.scenes.some(sc=>sc.id===r.sceneId&&sc.status!=='unavailable-slot')?r.sceneId:null)||
  (m?.source.sha256===source?.sha256?m.contextSceneId:null)||c?.scenes.find(sc=>sc.status!=='unavailable-slot')?.id||null;
}
function session(p){
 const id=identity(p);if(p.investigation?.version!==1)fail('No native pose/room decoder for this source.');
 // The editable project retains the exact original, not emulator or detached RE state.
 const bytes=typeof p.importedRom==='string'?base64ToBytes(p.importedRom):Uint8Array.from(p.importedRom||[]);
 if(!id||window.NativeEngineFormat.sha256(bytes)!==id.sha256)fail('The retained ROM does not match the source catalog.');
 if(!cached||cached.sha!==id.sha256){cached={sha:id.sha256,session:window.GameRENative.open(bytes,id.name)};}
 return cached.session;
}
function availableAnimation(a,c){
 const context=s.GameREAssets.scriptContext(a);if(!context.owner)return context.reason;
 return a.frames.some(f=>!c.poses.some(p=>p.owner===context.owner&&p.selector===f.pose))?'A script frame references an unrecovered pose.':null;
}
function existing(p,kind,id,contextId){
 const source=identity(p);if(!source)return null;
 if(kind==='scene'){
  const pages=p.scenes.filter(sc=>{const r=receipt(sc);return r?.source.sha256===source.sha256&&r.sceneId===id;}).sort((a,b)=>(receipt(a).page||0)-(receipt(b).page||0));
  return pages.length?{kind:'scene',sceneId:pages[0].id,sceneIds:pages.map(sc=>sc.id)}:null;
 }
 for(const sc of p.scenes){
  const r=receipt(sc),m=marker(sc),poses=p.metasprites||[],anims=p.animations||[];
  if(m?.source.sha256===source.sha256&&m.contextSceneId===contextId){
   const target=m[kind==='pose'?'poses':'animations']?.[id];
   if(kind==='pose'&&poses.some(f=>f.id===target&&f.sceneId===sc.id))return {kind:'pose',poseId:target,sceneId:sc.id};
   if(kind==='animation'&&anims.some(a=>a.id===target))return {kind:'animation',animationId:target,sceneId:sc.id};
  }
  if(r?.source.sha256!==source.sha256||r.sceneId!==contextId||r.spriteSceneId!==sc.id)continue;
  const frames=poses.filter(f=>f.sceneId===sc.id),index=(r.poseIds||[]).indexOf(id),initial=frames.find(f=>f.id==='native-pose-'+index);
  if(kind==='pose'&&index>=0&&initial&&!Object.hasOwn(m?.poses||{},id))return {kind:'pose',poseId:initial.id,sceneId:sc.id};
  if(kind==='animation'&&r.animationId===id){const a=anims.find(a=>a.frames?.some(f=>frames.some(pose=>pose.id===f.metaspriteId)));if(a)return {kind:'animation',animationId:a.id,sceneId:sc.id};}
 }
 return null;
}
function describe(p=S){
 const source=identity(p),n=p.investigation;if(!source)return {items:[],counts:null,source:null};
 const c=n.catalogs.native,items=[],contextId=contextScene(p);
 const add=(kind,type,id,name,record,summary,reason=null)=>{
  const resident=existing(p,kind,id,contextId);
  items.push({key:key(kind,id,source.sha256),kind,type,id,name,record,summary,reason,existing:resident,
   request:{kind,id,sourceSha256:source.sha256,contextSceneId:contextId}});
 };
 const audioProfile=window.NativeAudioCatalog.profiles.find(profile=>profile.sha256===source.sha256);
 if(n.version!==1&&audioProfile)add('audio-library','audio','driver-cues','Native music / SFX library',audioProfile,'Open the matching original driver catalog to inspect, audition and explicitly import supported tracker excerpts.');
 if(n.version===1){
  for(const r of c.scenes)add('scene','scene',r.id,r.label,r,'Recovered initial room art and layout. Opening creates its editable pages; source gameplay and collision rules remain partial.',r.status==='unavailable-slot'?'This native slot has no recoverable room.':null);
  for(const r of c.poses)add('pose','metasprite',r.id,r.label,r,'Recovered display pose. Sprite pixels and palettes use the selected source-room context; timing and AI are separate.');
  for(const r of c.animations)add('animation','animation',r.id,r.label,r,'Native timed sprite script. Open in Animation to edit its recovered frames and update-tick durations.',availableAnimation(r,c));
  for(const r of c.actors)add('actor-record','actor-record',r.id,(r.group?r.group+' · ':'')+r.label,r,'Native actor parameter and dispatch table entry. This is reference data, not a playable Gameplay Actor Definition or translated AI.');
  for(const r of c.graphics)add('graphics','chr',r.id,'Physical CHR bank '+r.bank4KiB,r,'Original physical CHR pixels. Grayscale preview; room/sprite palette bindings depend on context.');
  for(const r of c.locations||[])add('location','location',r.id,r.group+' · location '+r.slot,r,'Native location record; raw flags and cross-world destinations require context.');
  for(const r of n.catalogs.spatial.maps)add('map','world',r.id,r.label,r,'Recovered native map. Source inspection; editable terrain uses its registered native map workflow.');
  for(const r of n.catalogs.audio.cues)add('cue','audio',String(r.id),r.label||r.name||('Source cue '+r.id),r,'Native driver cue. Inspect or audition in ROM Audio Library; tracker copies require an explicit transcription import.');
  for(const [id,name]of [['ram','RAM labels'],['symbols','Code symbols']])add(id,'source',id,name,c[id],'Source addresses and labels, retained as read-only reference data.');
  const usable=c.scenes.filter(r=>r.status!=='unavailable-slot'),unique=new Set(usable.map(r=>r.aliasKey||r.id)).size;
  return {source,contextSceneId:contextId,contexts:c.scenes.filter(r=>r.status!=='unavailable-slot').map(r=>({id:r.id,name:r.label})),items,
   counts:{rooms:unique,roomSlots:c.scenes.length,poses:c.poses.length,animations:c.animations.length,actorRecords:c.actors.length,cues:n.catalogs.audio.cues.length},limits:cp(c.limits)};
 }
 if(n.version===4||n.version===3){
  const resources=n.catalogs.recovery.resources;
  for(const r of resources)add('scene','scene',r.id,r.label,r,'Recovered static source layout. Open a page in Scene to use the registered native editing controls.',r.status==='unavailable'?'This source slot is unavailable.':null);
  return {source,items,contexts:[],counts:{rooms:resources.filter(r=>r.status!=='unavailable').length,roomSlots:resources.length,poses:0,animations:0,actorRecords:0,cues:0},limits:[n.catalogs.recovery.scope]};
 }
 return {source,items,counts:null,contexts:[],limits:[]};
}
function requestItem(p,request){
 const d=describe(p);if(request?.sourceSha256!==d.source?.sha256)fail('The project source changed. Reopen Resources.');
 const item=d.items.find(i=>i.kind===request.kind&&i.id===request.id);if(!item)fail('This record is not in the retained source catalog.');
 return item;
}
function preview(request,{page=0,contextSceneId}={},p=S){
 const item=requestItem(p,request),d=describe(p);if(item.reason)return {kind:'record',record:item.record,reason:item.reason};
 if(p.investigation.version===4&&request.kind==='scene'){
  const project=p===S?s.ProjectStore.capture():p,pages=s.NativeResourceProject.pageList(project,item.id);
  if(!pages.some(v=>v.page===page))fail('No recovered page with this number.');
  const next=s.NativeResourceProject.addPage(project,item.id,page);
  return {kind:'scene',scene:next.scenes[next.activeScene],pages,record:item.record};
 }
 if(p.investigation.version!==1)return {kind:'record',record:item.record};
 const native=session(p);
 if(['scene','pose','animation'].includes(item.kind)){
  const sceneId=item.kind==='scene'?item.id:contextSceneId||request.contextSceneId||d.contextSceneId;
  const bundle=s.GameREAssets.convert(native,{sceneId,...(item.kind==='pose'?{poseId:item.id}:item.kind==='animation'?{animationId:item.id}:{})});
  return {kind:item.kind==='scene'?'scene':'pose',scene:bundle.assets.scenes[page]||bundle.assets.scenes[0],poses:bundle.assets.metasprites,animation:bundle.assets.animations[0],bundle,contextSceneId:sceneId,
   pages:bundle.assets.scenes.map((sc,index)=>({page:index,name:'Page '+(index+1)})),limits:bundle.limits};
 }
 if(item.kind==='graphics')return {kind:'chr',bytes:native.chrBank(item.record.bank4KiB).bytes};
 return {kind:'record',record:item.record};
}
const fresh=(p,collection,prefix)=>{const used=new Set(p[collection].map(v=>v.id));for(const sc of p.scenes)for(const id of Object.values(marker(sc)?.[collection==='metasprites'?'poses':collection]||{}))used.add(id);let i=1;return ()=>{while(used.has(prefix+i))i++;const id=prefix+i++;used.add(id);return id;};};
function appendRoom(p,bundle){
 const assets=cp(bundle.assets),maps={},collections=['scenes','worlds'];
 for(const collection of collections){maps[collection]=new Map();const id=fresh(p,collection,'library_'+collection+'_');for(const item of assets[collection]){const previous=item.id;item.id=id();maps[collection].set(previous,item.id);}}
 for(const sc of assets.scenes){const r=receipt(sc);r.spriteSceneId=maps.scenes.get(r.spriteSceneId);if(r.world?.worldId)r.world.worldId=maps.worlds.get(r.world.worldId);sc.buildInclude=false;}
 for(const w of assets.worlds){w.tilesetSceneId=maps.scenes.get(w.tilesetSceneId);for(const m of w.markers||[])if(m.targetWorldId)m.targetWorldId=maps.worlds.get(m.targetWorldId);}
 if(p.scenes.length+assets.scenes.length>64||p.worlds.length+assets.worlds.length>32)fail('This room exceeds the remaining editable working slots (64 Scenes / 32 Worlds). The full ROM library is retained; export a recovered room project from RE to work on it separately.');
 p.scenes.push(...assets.scenes);p.worlds.push(...assets.worlds);return {kind:'scene',sceneId:assets.scenes[0].id};
}
function appendSprites(p,bundle,request){
 const source=identity(p),contextId=bundle.selection.sceneId,incoming=bundle.assets.scenes[0],poseIds=bundle.evidence.poses.map(r=>r.id);
 const needed=bundle.assets.metasprites.filter((_f,i)=>!existing(p,'pose',poseIds[i],contextId));
 // Reuse source-room sprite storage. Only unreferenced, entirely blank pairs
 // are allocated; edited pixels and existing frame compositions are preserved.
 const owners=p.scenes.filter(sc=>{const r=receipt(sc),m=marker(sc);return same(sc.sprPal,incoming.sprPal)&&((m?.source.sha256===source.sha256&&m.contextSceneId===contextId)||(r?.source.sha256===source.sha256&&r.sceneId===contextId&&r.spriteSceneId===sc.id));});
 function packed(owner){
  const atlas=cp(owner.sprChr),used=new Set((p.metasprites||[]).filter(f=>f.sceneId===owner.id).flatMap(f=>f.pieces.flatMap(piece=>[piece.tile,piece.tile2].filter(Number.isInteger))).map(t=>t&254));
  for(const o of owner.oam||[])used.add(o.tile&254);
  const pairs=new Map(),remap=new Map();for(let t=0;t<256;t+=2)pairs.set(JSON.stringify([atlas[t],atlas[t+1]]),t);
  for(const frame of needed)for(const piece of frame.pieces){const t=piece.tile&254,k=JSON.stringify([incoming.sprChr[t],incoming.sprChr[t+1]]);let target=pairs.get(k);
   if(target===undefined){target=atlas.findIndex((_v,i)=>!(i&1)&&!used.has(i)&&[atlas[i],atlas[i+1]].every(tile=>tile.every(row=>row.every(v=>v===0))));if(target<0)return null;atlas[target]=cp(incoming.sprChr[t]);atlas[target+1]=cp(incoming.sprChr[t+1]);pairs.set(k,target);}used.add(target);remap.set(t,target);
  }
  return {atlas,remap};
 }
 let owner,packedAtlas;for(const candidate of owners){const result=packed(candidate);if(result){owner=candidate;packedAtlas=result;break;}}
 if(!owner){
  if(p.scenes.length>=64)fail('No editable Scene slot is free for this sprite context. The source library remains available.');
  owner=makeScene({id:fresh(p,'scenes','library_sprites_')(),name:'Sprite library · '+bundle.evidence.scene.scene.label,chr:normalizeTiles(),tileProps:Array(256).fill(0),sprChr:normalizeTiles(),sprPal:cp(incoming.sprPal),pal:cp(incoming.pal),oam:[],entities:[],links:[],buildInclude:false});
  packedAtlas=packed(owner);if(!packedAtlas)fail('The selected script exceeds one sprite atlas.');p.scenes.push(owner);
 }
 owner.sprChr=packedAtlas.atlas;
 const m=marker(owner)||{version:1,source:cp(source),profile:bundle.profile.id,contextSceneId:contextId,poses:{},animations:{}};
 owner.captureMeta={...owner.captureMeta,sourceLibrary:m};
 const newPoseId=fresh(p,'metasprites','library_pose_'),mapping=new Map();
 for(let i=0;i<bundle.assets.metasprites.length;i++){
  const old=bundle.assets.metasprites[i],nativeId=poseIds[i],resident=existing(p,'pose',nativeId,contextId);
  if(resident){mapping.set(old.id,resident.poseId);continue;}
  const frame=cp(old);frame.id=newPoseId();frame.sceneId=owner.id;
  for(const piece of frame.pieces){piece.tile=packedAtlas.remap.get(piece.tile&254);piece.tile2=piece.tile+1;}
  p.metasprites.push(frame);m.poses[nativeId]=frame.id;mapping.set(old.id,frame.id);
 }
 if(request.kind==='animation'){
  const a=cp(bundle.assets.animations[0]);a.id=fresh(p,'animations','library_animation_')();for(const f of a.frames)f.metaspriteId=mapping.get(f.metaspriteId);p.animations.push(a);m.animations[request.id]=a.id;
  return {kind:'animation',animationId:a.id,sceneId:owner.id};
 }
 return {kind:'pose',poseId:m.poses[request.id],sceneId:owner.id};
}
function prepareOpen(p,request){
 if(p.investigation?.version!==1||p.nativeGame?.version!==1)fail('Use the registered page editor for this source.');
 s.InvestigationProject.validate(p);const item=requestItem(p,request);if(item.reason)fail(item.reason);
 if(!['scene','pose','animation'].includes(item.kind))fail('This record is read-only source evidence.');
 const clean=s.NativeEngineProject.signature(p)===p.nativeGame.projectionSha256;
 const decoded=preview(request,{contextSceneId:request.contextSceneId},p),destination=request.kind==='scene'?appendRoom(p,decoded.bundle):appendSprites(p,decoded.bundle,request);
 if(p.metasprites.length>256||p.animations.length>256)fail('Editable composer capacity reached. The source catalog remains intact.');
 p.activeScene=p.scenes.findIndex(sc=>sc.id===destination.sceneId);
 const prepared=s.ProjectStore.prepareLoad(p);for(const k of ['scenes','worlds','metasprites','animations'])if(!same(prepared[k],p[k]))fail('The source copy would change during normalization: '+k);
 // Opening original source copies may extend a clean projection. Never bless
 // earlier unsupported editor work merely because the user opens another asset.
 if(clean)p.nativeGame.projectionSha256=s.NativeEngineProject.signature(p);
 return {values:{scenes:p.scenes,worlds:p.worlds,metasprites:p.metasprites,animations:p.animations,nativeGame:p.nativeGame,activeScene:p.activeScene},destination};
}
function edit(request,{page=0,contextSceneId}={}){
 const store=s.ProjectStore,p=store.capture(),item=requestItem(p,request);if(item.reason)fail(item.reason);
 const contextId=contextSceneId||request.contextSceneId||contextScene(p);
 if(p.investigation.version===4){
  const pages=s.NativeResourceProject.pageList(p,item.id),target=pages.find(v=>v.page===page);if(!target)fail('Page unavailable.');
  if(!p.scenes.some(sc=>sc.id===target.id))store.openNativeResourcePage(item.id,page,{expected:{epoch:store.state.epoch,snapshot:store.serialize()}});
  s.SceneContext.selectScene(target.id);switchTab('scene');return {kind:'scene',sceneId:target.id};
 }
 let target=existing(p,item.kind,item.id,contextId);
 if(!target){const result=store.openInvestigatedResource({...request,contextSceneId:contextId},{expected:{epoch:store.state.epoch,snapshot:store.serialize()}});target=result.destination;}
 if(!target)fail('This record has no editable copy.');
 if(item.kind==='scene'&&p.investigation.version===1){const sc=S.scenes.find(sc=>receipt(sc)?.source.sha256===request.sourceSha256&&receipt(sc).sceneId===item.id&&receipt(sc).page===page);if(sc)target={...target,sceneId:sc.id};}
 s.SceneContext.selectScene(target.sceneId);
 if(target.kind==='pose'){Forge163.metasprites.select(target.poseId);switchTab('metasprites');}
 else if(target.kind==='animation'){S._selAnim=S.animations.findIndex(a=>a.id===target.animationId);S._animFrame=0;switchTab('anim');window.anim_updateSidebar?.();}
 else switchTab('scene');
 return target;
}
s.InvestigatedLibrary=Object.freeze({describe,preview,prepareOpen,edit,contextScene,key});
})();
