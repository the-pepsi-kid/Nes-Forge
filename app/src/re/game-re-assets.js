/* Editable adaptations of investigated native resources. Bundles carry their
 * pixels and references; importing them never executes source code or needs a
 * ROM. ProjectStore alone owns the guarded, single-history-entry append. */
(()=>{
'use strict';
const services=window.Forge.services,cp=v=>JSON.parse(JSON.stringify(v)),stages=new WeakSet();
const MAX_BYTES=32*1024*1024,format='NESForgeNativeAssets';
const fail=m=>{throw Error('Native asset import: '+m);};
const int=(v,a,b)=>Number.isInteger(v)&&v>=a&&v<=b;
const canonical=v=>JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
function frozen(v){if(v&&typeof v==='object'){Object.values(v).forEach(frozen);Object.freeze(v);}return v;}
function patterns(bytes){if(!bytes||bytes.length!==4096)fail('A complete 4 KiB CHR bank is required.');return Array.from({length:256},(_,t)=>Array.from({length:8},(_,y)=>Array.from({length:8},(_,x)=>{const bit=7-x;return ((bytes[t*16+y]>>bit)&1)|(((bytes[t*16+y+8]>>bit)&1)<<1);})));}
const empty=()=>Array.from({length:256},()=>Array.from({length:8},()=>Array(8).fill(0)));
function scriptContext(script){
 // The shared stream does not identify its shape table. Actual Throw Star /
 // Windmill callers select $0D/$0E and draw_thrown_pic reads $8400/$8500.
 // Adjacent $0F/$10 streams have no established caller/table context.
 if(script.selector===15||script.selector===16)return {owner:null,status:'partial',reason:'Sprite table context is unresolved for this shared script.'};
 return {owner:script.owner==='player'||script.selector===13||script.selector===14?'player':'enemy',status:'supported',reason:script.selector===13||script.selector===14?'Native thrown-weapon reader uses the player shape/attribute tables.':'Declared native player/enemy shape table.'};
}
function convert(session,selection={}){
 const report=session.catalog();if(report.status!=='supported')fail('Open an investigated source first.');
 const decoded=session.scene(selection.sceneId),g=decoded.graphics;if(!g||!int(g.width,1,2048)||!int(g.height,1,30)||g.tiles.length!==g.width*g.height||g.paletteIds.length!==g.tiles.length)fail('The selected scene has no representable initial graphics.');
 const ng=report.profile.id==='ninja-gaiden-us',sourceChr=patterns(session.chrBank(g.chrBank4KiB).bytes),chr=cp(sourceChr);
 let blank=chr.findIndex(t=>t.every(row=>row.every(v=>v===0)));
 if(blank<0){const used=new Set(g.tiles);blank=chr.findIndex((_t,i)=>!used.has(i));if(blank<0)fail('Padding requires a blank or unused pattern; no source pattern was discarded.');chr[blank]=Array.from({length:8},()=>Array(8).fill(0));}
 const native=decoded.scene,banks=ng?[native.spriteChrBank4KiB,native.backgroundChrBank4KiB]:[g.chrBank4KiB-1,g.chrBank4KiB],spritePal=ng?native.palettes.sprites:Array.from({length:4},(_,i)=>[g.nativePalette[16],...g.nativePalette.slice(17+i*4,20+i*4)]);
 let script=null,poses=[];
 if(selection.animationId){script=report.animations.find(a=>a.id===selection.animationId);if(!script)fail('The selected timed script is unavailable.');const context=scriptContext(script);if(!context.owner)fail(context.reason);for(const f of script.frames){const pose=report.poses.find(p=>p.owner===context.owner&&p.selector===f.pose);if(!pose)fail('A timed script references an unrecovered pose.');if(!poses.some(p=>p.id===pose.id))poses.push(pose);}}
 else if(selection.poseId){const pose=report.poses.find(p=>p.id===selection.poseId);if(!pose)fail('The selected display pose is unavailable.');poses=[pose];}
 const sprChr=empty(),pairMap=new Map(),bankPixels=banks.map(b=>patterns(session.chrBank(b).bytes));
 const sceneId='native-scene-0',metasprites=poses.map((pose,i)=>({id:'native-pose-'+i,name:pose.label,sceneId,spriteMode:16,originX:0,originY:0,pieces:pose.pieces.map((p,j)=>{
  const bank=p.tile&1,tile=p.tile&254,key=bank+':'+tile;
  if(!pairMap.has(key)){if(pairMap.size>=128)fail('The selected poses exceed a 256-pattern sprite atlas.');const target=pairMap.size*2;pairMap.set(key,target);sprChr[target]=cp(bankPixels[bank][tile]);sprChr[target+1]=cp(bankPixels[bank][tile+1]);}
  const target=pairMap.get(key);return {id:'piece-'+j,tile:target,tile2:target+1,x:p.x,y:p.y+1,pal:p.attributes&3,flipH:!!(p.attributes&64),flipV:!!(p.attributes&128),behind:!!(p.attributes&32)};
 })}));
 const animations=script?[{id:'native-animation-0',name:script.label,state:'',loop:script.end!=='player-return-to-idle',frames:script.frames.map(f=>({tileIdx:0,duration:f.updateTicks,metaspriteId:metasprites[poses.findIndex(p=>p.selector===f.pose)].id,hitboxes:[],hurtboxes:[],events:[]}))}]:[];
 const limits=[
  'Editable initial art adaptation; native scrolling, HUD placement, raster effects and runtime palette changes are not recreated.',
  'Content starts at project Y=0. Native origin Y='+decoded.originY+' is recorded in each scene receipt. Wide rooms are split into 256-pixel pages; padding uses a blank pattern.',
  'Collision is unassigned. Native cell codes, spawn records, actor parameters and code are reference evidence; no physics, AI, hitboxes or event bindings are inferred.',
  'The first page is included in the ROM build set and supplies sprite art. Other pages are excluded initially. Existing ROM build limits still apply.',
  ...(script?['Durations use native script update ticks. State-dependent update cadence and the return-to-idle transition are not reconstructed.']:poses.length?['Display pose only; no animation timing was inferred.']:[])
 ];
 const pages=Math.ceil(g.width/32);if(pages>64)fail('The room exceeds the 64-scene project capacity.');
 const scenes=Array.from({length:pages},(_,page)=>{
  const nt=Array(960).fill(blank),attr=Array(64).fill(0);
  for(let y=0;y<g.height;y++)for(let x=0;x<32&&page*32+x<g.width;x++){
   const at=y*g.width+page*32+x,tile=g.tiles[at],pal=g.paletteIds[at];if(!int(tile,0,255)||!int(pal,0,3))fail('Native graphics contain invalid pattern or palette references.');nt[y*32+x]=tile;
   const ai=(y>>2)*8+(x>>2),shift=((y&2)?4:0)+((x&2)?2:0),mask=3<<shift;
   // Canonical hardware attributes allow one palette per 16 x 16 cell.
   if((x&1)||(y&1)){const ox=x&~1,oy=y&~1,origin=oy*g.width+page*32+ox;if(g.paletteIds[origin]!==pal)fail('This scene needs sub-cell palettes that the project cannot represent.');}
   attr[ai]=(attr[ai]&~mask)|(pal<<shift);
  }
  return makeScene({id:'native-scene-'+page,name:(native.label+' · page '+(page+1)).slice(0,120),nt,attr,pal:cp(g.palettes),sprPal:cp(spritePal),chr:cp(chr),sprChr:cp(sprChr),tileProps:Array(256).fill(0),oam:[],entities:[],links:[],sceneType:'static',scrollDir:'none',gravity:0,buildInclude:page===0,buildOrder:page,captureMeta:{nativeAssets:{version:1,source:cp(report.source),profile:report.profile.id,sceneId:native.id,animationId:script?.id||null,poseIds:poses.map(p=>p.id),spriteContext:script?scriptContext(script):null,page,contentX:page*256,originY:decoded.originY,contentHeight:g.height*8,limits:cp(limits)}}});
 });
 const worlds=services.GameREWorlds.adapt(scenes,decoded);
 limits.push('Worlds preserve the selected room layout at Y=0, split at page boundaries only if authoring limits require it. Collision stays unassigned; native connections remain evidence. Import does not change or enable World Runtime.');
 for(const scene of scenes)scene.captureMeta.nativeAssets.limits=cp(limits);
 return {format,version:2,source:cp(report.source),profile:cp(report.profile),selection:{sceneId:native.id,poseId:selection.poseId||null,animationId:selection.animationId||null},assets:{scenes,metasprites,animations,worlds},evidence:{scene:decoded,poses,animation:script},limits};
}
async function digest(bundle){if(!window.crypto?.subtle)fail('SHA-256 is unavailable.');const value=cp(bundle);delete value.checksum;const bytes=new TextEncoder().encode(canonical(value));if(bytes.length>MAX_BYTES)fail('Bundle exceeds 32 MiB.');return Array.from(new Uint8Array(await window.crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');}
async function seal(bundle){const value=cp(bundle);value.checksum=await digest(value);return value;}
function project(assets,name){const d={format:'NESForge',version:services.ProjectStore.schema,projectName:String(name||'Recovered resources').slice(0,120),scenes:cp(assets.scenes),activeScene:0,metasprites:cp(assets.metasprites),animations:cp(assets.animations),worlds:cp(assets.worlds||[]),asmSource:'',mapper:0,mirroring:'v',hasSRAM:false,prgBanks:1,chrBanks:1,packScenes:true,importedRom:null,instruments:[],patterns:[],orderList:[],sfx:[],tempo:150,speed:6,audRows:64};const p=services.ProjectStore.prepareLoad(d);return {...d,scenes:p.scenes,metasprites:p.metasprites,animations:p.animations,...(assets.worlds?{worlds:p.worlds}:{})};}
function validateAssets(assets){
 if(!assets||!['animations,metasprites,scenes','animations,metasprites,scenes,worlds'].includes(Object.keys(assets).sort().join(',')))fail('Expected scenes, metasprites, animations and optional worlds.');
 if(assets.worlds!==undefined&&(!Array.isArray(assets.worlds)||assets.worlds.length>32))fail('Invalid world count.');
 for(const [key,min,max]of [['scenes',1,64],['metasprites',0,256],['animations',0,256]])if(!Array.isArray(assets[key])||assets[key].length<min||assets[key].length>max)fail('Invalid '+key+' count.');
 for(const sc of assets.scenes){
  if(!sc||typeof sc.id!=='string'||!sc.id||typeof sc.name!=='string')fail('Scenes require explicit IDs and names.');
  for(const [key,length,max]of [['nt',960,255],['attr',64,255],['tileProps',256,7]])if(!Array.isArray(sc[key])||sc[key].length!==length||sc[key].some(v=>!int(v,0,max)))fail('Invalid scene '+key+'.');
  for(const key of ['chr','sprChr'])if(!Array.isArray(sc[key])||sc[key].length!==256||sc[key].some(t=>!Array.isArray(t)||t.length!==8||t.some(row=>!Array.isArray(row)||row.length!==8||row.some(v=>!int(v,0,3)))))fail('Invalid scene '+key+' pixels.');
  for(const key of ['pal','sprPal'])if(!Array.isArray(sc[key])||sc[key].length!==4||sc[key].some(p=>!Array.isArray(p)||p.length!==4||p.some(v=>!int(v,0,63))||p[0]!==sc.pal[0][0]))fail('Invalid scene '+key+'.');
  if(sc.entities?.length||sc.links?.length||sc.oam?.length||sc.raster?.length)fail('This bundle supports art layouts and composer assets; executable scene entities are unsupported.');
 }
 const p=project(assets);window.Forge164.model.validateProject(p,{references:true});
 if(assets.worlds){
  window.ForgeWorldCodec1621.validate(assets.worlds);
  for(const w of assets.worlds){const sc=assets.scenes.find(s=>s.id===w.tilesetSceneId);if(!sc)fail('World tileset scene is missing.');const ids=new Set(sc.metatiles.map(m=>m.id));if(w.map.some(id=>id>=0&&!ids.has(id)))fail('World references an undefined metatile.');}
 }
 for(const key of Object.keys(assets))if(canonical(p[key])!==canonical(assets[key]))fail('Asset '+key+' would change during canonical normalization.');
 return p;
}
async function read(input){const text=typeof input==='string'?input:JSON.stringify(input);if(!text||text.length>MAX_BYTES)fail('Bundle exceeds 32 MiB or is missing.');const b=JSON.parse(text);if(b?.format!==format||![1,2].includes(b.version))fail('Choose an editable .nfassets.json bundle. Evidence-only reports cannot be imported as assets.');if(typeof b.checksum!=='string'||b.checksum!==await digest(b))fail('Bundle checksum mismatch.');if(!b.source||!/^[a-f0-9]{64}$/.test(b.source.sha256)||!Array.isArray(b.limits)||b.limits.some(x=>typeof x!=='string'))fail('Missing source receipt or limits.');if((b.version===2)!==Object.hasOwn(b.assets||{},'worlds'))fail('Bundle version does not match its world payload.');validateAssets(b.assets);return b;}
function remap(assets,current){
 const out=cp(assets),maps={};
 for(const [key,prefix]of [['scenes','sc'],['metasprites','pose'],['animations','anim'],['worlds','world']]){
  if(!out[key])continue;const used=new Set((current[key]||[]).map(x=>x.id)),map=new Map();let n=1;
  for(const item of out[key]){let id;do{id='re_'+prefix+'_'+n++;}while(used.has(id));used.add(id);map.set(item.id,id);item.id=id;}maps[key]=map;
 }
 out.metasprites.forEach(p=>p.sceneId=maps.scenes.get(p.sceneId));
 out.animations.forEach(a=>a.frames.forEach(f=>{if(f.sceneId)f.sceneId=maps.scenes.get(f.sceneId);if(f.metaspriteId)f.metaspriteId=maps.metasprites.get(f.metaspriteId);}));
 for(const w of out.worlds||[]){w.tilesetSceneId=maps.scenes.get(w.tilesetSceneId);for(const m of w.markers)if(m.targetWorldId)m.targetWorldId=maps.worlds.get(m.targetWorldId);}
 return out;
}
async function stage(input){const store=services.ProjectStore,guard={epoch:store.state.epoch,snapshot:store.serialize()},bundle=await read(input),current=JSON.parse(guard.snapshot),assets=remap(bundle.assets,current);if(current.scenes.length+assets.scenes.length>64||(current.metasprites?.length||0)+assets.metasprites.length>256||(current.animations?.length||0)+assets.animations.length>256||(current.worlds?.length||0)+(assets.worlds?.length||0)>32)fail('The combined project exceeds scene, composer or world capacity.');if(store.state.epoch!==guard.epoch||store.serialize()!==guard.snapshot)fail('The project changed during preview. Preview again.');const value=frozen({bundle,assets,guard,summary:{scenes:assets.scenes.length,metasprites:assets.metasprites.length,animations:assets.animations.length,worlds:assets.worlds?.length||0,source:bundle.source,limits:bundle.limits}});stages.add(value);return value;}
function importStaged(value){if(!stages.has(value))fail('Preview this bundle in the current editor first.');const result=services.ProjectStore.appendAssets(value.assets,{expected:value.guard,select:true});stages.delete(value);return result;}
services.GameREAssets=Object.freeze({version:2,maxBytes:MAX_BYTES,scriptContext,convert,seal,read,stage,importStaged,standalone:async input=>{const b=await read(input);return project(b.assets,b.profile?.name+' · recovered assets');}});
})();
