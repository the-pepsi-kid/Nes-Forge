/* Source context is a catalog receipt, not a second asset store or a route graph.
 * Project asset IDs and World tileset references remain authoritative. */
(()=>{
'use strict';
const services=window.Forge.services,copy=value=>JSON.parse(JSON.stringify(value));
const text=value=>typeof value==='string'&&value.length>0&&value.length<=160;
function nativeKey(scene){
 const r=scene?.captureMeta?.nativeAssets;
 return r&&/^[a-f0-9]{64}$/.test(r.source?.sha256)&&text(r.profile)&&text(r.sceneId)?JSON.stringify([r.source.sha256,r.profile,r.sceneId]):null;
}
function receipt(catalog,scene){
 const field=Number.isInteger(scene.area)?'area':text(scene.set)?'set':null;
 if(!field||!Array.isArray(catalog.scenes))return null;
 const members=catalog.scenes.filter(s=>s[field]===scene[field]).map(s=>({sceneId:s.id,label:s.label,status:s.status==='unavailable-slot'?'unavailable':'catalogued'}));
 if(!members.length||members.length>1024)return null;
 return {version:1,id:field+':'+scene[field],kind:field==='area'?'native-area':'native-table',label:scene.group||String(scene[field]),members,
  scope:'Catalog membership only. Stage order, reachability, transitions and scene/event Audio bindings remain unresolved.'};
}
function read(scene){
 if(!nativeKey(scene))return null;
 const r=scene.captureMeta.nativeAssets,c=r.context;
 if(c?.version!==1||!text(c.id)||!text(c.label)||!['native-area','native-table'].includes(c.kind)||!Array.isArray(c.members)||!c.members.length||c.members.length>1024)return null;
 const seen=new Set();
 for(const m of c.members){if(!text(m?.sceneId)||!text(m.label)||!['catalogued','unavailable'].includes(m.status)||seen.has(m.sceneId))return null;seen.add(m.sceneId);}
 if(!c.members.some(m=>m.sceneId===r.sceneId&&m.status==='catalogued'))return null;
 return {id:'stage:'+JSON.stringify([r.source.sha256,r.profile,c.id]),sourceSha256:r.source.sha256,profile:r.profile,context:copy(c),nativeSceneId:r.sceneId};
}
function describe(scenes){
 const stages=new Map();
 for(const scene of scenes){
  const value=read(scene);if(!value)continue;
  let stage=stages.get(value.id);
  if(!stage){stage={id:value.id,name:value.context.label,kind:value.context.kind,sourceSha256:value.sourceSha256,profile:value.profile,contextId:value.context.id,sceneIds:[],rooms:value.context.members.map(m=>({...m,sceneIds:[]})),conflict:false};stages.set(value.id,stage);}
  const signature=c=>JSON.stringify([c.kind,c.label,c.members.map(m=>[m.sceneId,m.label,m.status])]);
  if(signature(value.context)!==JSON.stringify([stage.kind,stage.name,stage.rooms.map(m=>[m.sceneId,m.label,m.status])]))stage.conflict=true;
  stage.sceneIds.push(scene.id);stage.rooms.find(m=>m.sceneId===value.nativeSceneId)?.sceneIds.push(scene.id);
 }
 const page=id=>{const sc=scenes.find(s=>s.id===id);return Number.isInteger(sc?.captureMeta?.nativeAssets?.page)?sc.captureMeta.nativeAssets.page:Infinity;};
 for(const stage of stages.values()){
  for(const room of stage.rooms)room.sceneIds.sort((a,b)=>page(a)-page(b)||a.localeCompare(b));
  stage.coverage={catalogued:stage.rooms.length,imported:stage.rooms.filter(r=>r.sceneIds.length).length,missing:stage.rooms.filter(r=>!r.sceneIds.length&&r.status!=='unavailable').length,unavailable:stage.rooms.filter(r=>r.status==='unavailable').length};
 }
 return [...stages.values()];
}
function relatedWorlds(scene,scenes,worlds){
 const key=nativeKey(scene),r=scene?.captureMeta?.nativeAssets,span=r?.world;
 return worlds.filter(world=>{
  if(world.tilesetSceneId===scene?.id)return true;
  if(!key||!Number.isInteger(r.page)||!span)return false;
  if(span.worldId&&world.id!==span.worldId)return false;
  const tileset=scenes.find(s=>s.id===world.tilesetSceneId),other=tileset?.captureMeta?.nativeAssets,range=other?.world;
  return nativeKey(tileset)===key&&range&&(!range.worldId||range.worldId===world.id)&&Number.isInteger(range.startPage)&&Number.isInteger(range.pageCount)&&range.pageCount>0&&span.segment===range.segment&&span.startPage===range.startPage&&span.pageCount===range.pageCount&&r.page>=range.startPage&&r.page<range.startPage+range.pageCount;
 });
}
services.StageContext=Object.freeze({nativeKey,receipt,read,describe,relatedWorlds});
})();
