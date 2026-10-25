/* On-demand source adapter into canonical Worlds and metatiles. Terrain cells
 * have one editable owner: World.map. Native bindings record provenance and
 * approved output fields; they are not another asset or rules registry. */
(()=>{
'use strict';
const services=window.Forge.services,adapter=window.ZeldaOverworld,format=window.NativeEngineFormat;
const cp=v=>JSON.parse(JSON.stringify(v)),fail=m=>{throw Error('Native World: '+m);};
const sceneId='native-tiles-z2-overworld';
const matches=p=>p?.nativeGame?.profile===adapter.id;
function bindings(p){
 const list=p.nativeGame.resources;
 if(!Array.isArray(list)||!list.length||list.length>4)fail('Choose one to four supported maps.');
 const maps=new Set(),worlds=new Set();
 for(const b of list){
  if(!b||Object.keys(b).sort().join(',')!=='mapId,sceneId,worldId'||maps.has(b.mapId)||worlds.has(b.worldId)||typeof b.worldId!=='string'||b.sceneId!==sceneId)fail('Invalid or duplicate resource binding.');
  const r=adapter.resource(b.mapId),w=p.worlds?.find(w=>w.id===b.worldId),s=p.scenes?.find(s=>s.id===b.sceneId);
  if(b.worldId!=='native-world-z2-'+r.key)fail('The source map does not own this World binding.');
  if(!w||!s||w.tilesetSceneId!==b.sceneId||w.widthScreens!==4||w.heightScreens!==r.height/15||!Array.isArray(w.map)||w.map.length!==64*r.height||w.map.some(v=>!Number.isInteger(v)||v<0||v>15))fail('The bound map dimensions, terrain or tileset differ.');
  maps.add(b.mapId);worlds.add(b.worldId);
 }
 return list;
}
function signature(p){
 const ids=new Set(bindings(p).map(b=>b.worldId)),copy={...p,worlds:p.worlds.map(w=>ids.has(w.id)?{...w,map:[]}:w)};
 return services.NativeEngineProject.signature(copy);
}
function validate(p,{build=false}={}){
 const n=p.nativeGame;
 if(!matches(p)||p.version<15||n.format!=='NESForgeNativeGame'||n.version!==2||Object.keys(n).sort().join(',')!=='edits,format,profile,projectionSha256,resources,sourceSha256,version'||!/^[a-f0-9]{64}$/.test(n.sourceSha256)||!/^[a-f0-9]{64}$/.test(n.projectionSha256)||typeof p.importedRom!=='string'||p.importedRom.length>400000)fail('Invalid schema-15 resource descriptor.');
 const bytes=base64ToBytes(p.importedRom);
 if(!adapter.recognizes(bytes)||format.sha256(bytes)!==n.sourceSha256)fail('Source revision or saved source hash differs.');
 format.validateTargets(bytes,n.edits);
 for(const b of bindings(p))adapter.encode(bytes,b.mapId,p.worlds.find(w=>w.id===b.worldId).map);
 if(build&&signature(p)!==n.projectionSha256)fail('An asset or runtime setting has no native encoder. Undo that change to rebuild. Supported: selected overworld terrain and four location fields.');
 return {bytes,descriptor:n};
}
function packLocations(bytes,edits){
 format.validateTargets(bytes,edits);let result=bytes.slice();
 for(const set of format.sets)result=window.NativeRecords.encode(result,format.layout(set),edits.filter(e=>e.region===set.id).map(({region,...e})=>e)).bytes;
 return result;
}
function build(p){
 const {bytes,descriptor:n}=validate(p,{build:true});let output=packLocations(bytes,n.edits);
 for(const b of bindings(p))output=adapter.encode(output,b.mapId,p.worlds.find(w=>w.id===b.worldId).map).bytes;
 const changes=[];for(let i=0;i<output.length;i++)if(bytes[i]!==output[i])changes.push({fileOffset:i,before:bytes[i],after:output[i]});
 return {rom:output,metadata:{prgSize:131072,chrSize:131072,changes,sourceSha256:n.sourceSha256,outputSha256:format.sha256(output)},diagnostics:[
  {severity:'info',code:'native-preservation',phase:'native-encode',message:changes.length+' changed byte(s) in approved terrain allocations or location fields. Engine, graphics and other data preserved.'},
  {severity:'warning',code:'native-edit-scope',phase:'native-encode',message:'Terrain types retain the original engine behavior. Reachability, events and quest progression require gameplay verification. Art, actor, Audio and runtime rule encoders remain pending.'}
 ]};
}
function materialize(p,id,bytes){
 const d=adapter.decode(bytes,id),worldId='native-world-z2-'+d.key;
 if(p.worlds.some(w=>w.id===worldId))fail('Resource World ID already exists.');
 p.worlds.push(Forge161.worlds.normalize({id:worldId,name:d.name,tilesetSceneId:sceneId,widthScreens:4,heightScreens:d.height/15,map:d.cells,rooms:[],markers:[],cameraRegions:[]}));
 p.nativeGame.resources.push({mapId:id,worldId,sceneId});
}
function create(bytes,name,id='z2:1:0'){
 if(!adapter.recognizes(bytes))fail('Choose the supported Zelda II engine revision.');
 const input=Uint8Array.from(bytes),g=adapter.graphics(input),sc=makeScene({id:sceneId,name:'Overworld terrain tileset',chr:g.chr,sprChr:normalizeTiles(),pal:g.palettes,bgColor:g.palettes[0][0],metatiles:g.metatiles,metaMap:Array(240).fill(-1),tileProps:Array(256).fill(0),entities:[],oam:[],buildInclude:true,buildOrder:0,scrollDir:'none'});
 const p={format:'NESForge',version:15,foundation:Forge.release.version,projectName:(String(name||'Zelda II').replace(/\.nes$/i,'')+' · overworld').slice(0,120),scenes:[sc],activeScene:0,worlds:[],animations:[],metasprites:[],gameplay:Forge165.config.defaults(),worldRuntime:services.WorldConfig.defaults(),audioRuntime:services.AudioConfig.defaults(),gameplayCore:services.GameplayModel.defaults(),asmSource:'',instruments:[],patterns:[],orderList:[[0,0,0,0,0]],sfx:[],tempo:150,speed:6,audRows:64,mapper:1,mirroring:(input[6]&1)?'v':'h',hasSRAM:!!(input[6]&2),prgBanks:8,chrBanks:16,packScenes:true,importedRom:bytesToBase64(input),selTile:0,editTile:0,selSprite:-1,selEntity:-1,chrBank:'bg',_selAnim:0,_animFrame:0};
 const prepared=services.ProjectStore.prepareLoad(p);
 for(const key of ['scenes','worlds','metasprites','animations','patterns','instruments','sfx'])p[key]=cp(prepared[key]);
 p.nativeGame={format:'NESForgeNativeGame',version:2,profile:adapter.id,sourceSha256:format.sha256(input),projectionSha256:'0'.repeat(64),resources:[],edits:[]};
 materialize(p,id,input);p.nativeGame.projectionSha256=signature(p);validate(p,{build:true});return p;
}
function addResource(project,id){
 const {bytes}=validate(project,{build:true});adapter.resource(id);const p=cp(project);
 if(p.nativeGame.resources.some(b=>b.mapId===id))return p;
 materialize(p,id,bytes);p.nativeGame.projectionSha256=signature(p);validate(p,{build:true});return p;
}
function paint(project,id,changes){
 const {bytes}=validate(project),b=bindings(project).find(b=>b.mapId===id);
 if(!b)fail('Open this map before editing it.');
 if(!Array.isArray(changes)||changes.length>4800)fail('Invalid terrain stroke.');
 const worlds=cp(project.worlds),world=worlds.find(w=>w.id===b.worldId);
 for(const c of changes){if(!c||Object.keys(c).sort().join(',')!=='index,value'||!Number.isInteger(c.index)||c.index<0||c.index>=world.map.length||!Number.isInteger(c.value)||c.value<0||c.value>15)fail('Invalid terrain cell.');world.map[c.index]=c.value;}
 const budget=adapter.encode(bytes,id,world.map);return {worlds,usedBytes:budget.usedBytes,budget:budget.budget};
}
function records(p){const {bytes,descriptor}=validate(p),output=packLocations(bytes,descriptor.edits);return format.sets.flatMap(s=>window.NativeRecords.decode(output,format.layout(s)).map(r=>({...r,region:s.id,regionName:s.name,editable:r.index<62,sourceBank:s.bank})));}
function edit(p,value){
 const {bytes}=validate(p);format.validateEdits([value]);const n=cp(p.nativeGame),original=records({...p,nativeGame:{...n,edits:[]}}).find(r=>r.region===value.region&&r.index===value.index).values[value.field];
 n.edits=n.edits.filter(e=>!(e.region===value.region&&e.index===value.index&&e.field===value.field));if(value.value!==original)n.edits.push(cp(value));
 n.edits.sort((a,b)=>a.region.localeCompare(b.region)||a.index-b.index||a.field.localeCompare(b.field));packLocations(bytes,n.edits);return n;
}
services.NativeWorldProject=Object.freeze({matches,validate,signature,create,addResource,paint,build,records,edit});
})();
