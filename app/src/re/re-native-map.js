/* Native command maps convert to existing canonical scenes and binary collision.
 * The format decoders own source meaning. Shared native-scene staging,
 * ProjectStore and RuntimeCompiler own preview, edits and generated behavior. */
(()=>{
'use strict';
const services=window.Forge.services,methods=services.REMethods,ID='nes.command-metatile-map.v1';
const copy=value=>JSON.parse(JSON.stringify(value));
const fail=message=>{throw Error('Native map: '+message);};
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
const limits=Object.freeze([
 'Static command-map geometry before native decoration only. Random maps, clouds, grass/platform decoration, scrolling, wrapping, cycling blocks, hazards, one-way platforms, actors, audio and original game logic are not reconstructed.',
 'Only declared native Empty and fixed Solid cells convert. Unknown or unsupported collision never defaults to Empty. The visible 16 × 15 metatile region maps exactly to 32 × 30 Forge tiles; a nonempty hidden native row prevents conversion.',
 'Import appends an excluded editable scene through one Undo transaction. Download map project creates a separate Forge single-room adaptation with an authored test player and default Forge movement; it does not recreate native physics or gameplay.',
 'Graphics use the proven reset palette and raw command-map metatiles, before PrettyLevel decoration and later palette updates. Source sprites, clipping and later runtime writes are not reproduced.',
 'Uniform tile collision uses existing tile properties. Ambiguous reuse uses linked metatile overrides. Raw visual edits can detach links and fall back to tile properties under the existing editor rules.',
 'The original ROM is unchanged. This method does not supply a native encoder, ROM patch or whole-game reconstruction.'
]);
function byteArray(value,length,label,max=255){if(!Array.isArray(value)||value.length!==length||value.some(v=>!Number.isInteger(v)||v<0||v>max))fail('Invalid '+label+'.');return value;}
function textList(value,label){if(!Array.isArray(value)||value.length>64||value.some(v=>typeof v!=='string'||!v.trim()||v.length>2000))fail('Invalid '+label+'.');}
function options(input,source,convert=false){if(Object.keys(input).some(k=>!['expectedSourceSha256',...(convert?['resourceKey']:[])].includes(k)))fail('Unsupported recovery option.');if(input.expectedSourceSha256!==undefined&&input.expectedSourceSha256!==source.sha256)fail('The selected source identity changed.');if(convert&&(typeof input.resourceKey!=='string'||!input.resourceKey||input.resourceKey.length>160))fail('Select a native map resource before previewing.');}
function decodeSource(context,graphics=false){
 const bytes=Uint8Array.from(context.read(0,context.source.byteLength).bytes);context.consume(bytes.length*12);context.throwIfAborted();
 const native=services.RENativeCommandMap.decode(bytes);context.throwIfAborted();
 if(native.status!=='supported')return native;
 if(graphics){const graphicsResult=services.RENativeCommandGraphics.decode(bytes,native);context.throwIfAborted();return {...native,graphicsResult};}
 return native;
}
function resourceKey(map){return map.key||'map-'+map.cpuAddress.toString(16).padStart(4,'0');}
function resourceLabel(map){return map.label||'Native map at $'+map.cpuAddress.toString(16).toUpperCase().padStart(4,'0');}
function unsupported(map){return map.unsupported||map.limitations||[];}
function convertible(map){return map.staticConvertible===true;}
function canonicalCollision(scene){
 const definitions=new Map(scene.metatiles.map(m=>[m.id,m]));return scene.nt.map((tile,index)=>{const x=index%32,y=Math.floor(index/32),id=scene.metaMap[(y>>1)*16+(x>>1)];return id>=0?definitions.get(id).collision[(y&1)*2+(x&1)]:scene.tileProps[tile];});
}
function materialize(nt,attr,collision){
 const seen=new Map(),tileProps=Array(256).fill(0),metatiles=[],metaMap=[],keys=new Map();
 nt.forEach((tile,i)=>{if(!seen.has(tile))seen.set(tile,collision[i]);else if(seen.get(tile)!==collision[i])seen.set(tile,-1);});
 for(const [tile,value] of seen)if(value>=0)tileProps[tile]=value;
 for(let cell=0;cell<240;cell++){
  const x=(cell%16)*2,y=Math.floor(cell/16)*2,positions=[y*32+x,y*32+x+1,(y+1)*32+x,(y+1)*32+x+1],tiles=positions.map(i=>nt[i]),solid=positions.map(i=>collision[i]),pal=(attr[(y>>2)*8+(x>>2)]>>((((y>>1)&1)*2+((x>>1)&1))*2))&3;
  if(!tiles.some(tile=>seen.get(tile)===-1)){metaMap.push(-1);continue;}
  const key=tiles.join(',')+'|'+pal+'|'+solid.join(',');if(!keys.has(key)){const id=metatiles.length;keys.set(key,id);metatiles.push({id,name:'Native collision block '+id,category:'Recovered static map',tiles,pal,collision:solid,flags:0});}metaMap.push(keys.get(key));
 }
 return {tileProps,metatiles,metaMap};
}
function tiles(data){return Array.from({length:256},(_,tile)=>Array.from({length:8},(_,y)=>Array.from({length:8},(_,x)=>((data[tile*16+y]>>(7-x))&1)|(((data[tile*16+y+8]>>(7-x))&1)<<1))));}
function convert(native,map,source){
 if(!convertible(map))fail(unsupported(map).join(' ')||'This map contains unsupported native semantics.');
 byteArray(map.cells,256,'native map cells');if(map.cells.some(v=>v!==0&&v!==21)||map.cells.slice(240).some(v=>v!==0))fail('Only Empty/Solid in the declared visible region can convert.');
 const gr=native.graphicsResult;if(gr?.status!=='supported')fail(gr?.reason||'Native graphics construction is unsupported.');const g=gr.graphics;
 if(!Array.isArray(g.knownChr)||g.knownChr.length!==4096||g.knownChr.some(value=>value!==true))fail('The imported CHR bank depends on unknown initial decompression state.');
 if(g.metatileBecomes?.[0]!==0||g.metatileBecomes?.[21]!==21)fail('The native renderer changes fixed Empty/Solid collision identities.');
 const rendered=services.RENativeCommandGraphics.render(g,map.cells),nametable=Array.isArray(rendered)?rendered:rendered.nametable;
 byteArray(nametable,1024,'rendered nametable');byteArray(g.chrBytes,4096,'background CHR');byteArray(g.palette,32,'reset palette',63);
 const collision=Array.from({length:960},(_,i)=>map.cells[(Math.floor(i/32)>>1)*16+((i%32)>>1)]===21?1:0);
 const key=resourceKey(map),label=resourceLabel(map),sceneId='re-map-'+source.sha256+'-'+key;
 const evidence=[...(native.evidence||[]),...(g.evidence||gr.evidence||[])].map(e=>methods.evidence(e,source));
 evidence.push(methods.evidence({status:'converted',claim:'The selected raw static map, decoded metatile graphics and native full-solid cell meaning become a canonical Forge scene. The separate generated project uses authored test-player assets and Forge physics.',ranges:[{start:map.fileOffset,length:map.byteLength}]},source));
 const adaptedSpawn={x:map.spawn.x*16+8,y:map.spawn.y*16+16,width:8,height:8};
 const report={format:'NESForgeNativeMapRecovery',version:1,method:{id:ID,version:1,name:'NES command metatile maps'},source:copy(source),sceneId,resourceKey:key,label,
  region:{nativeWidth:16,nativeHeight:16,visibleWidth:16,visibleHeight:15,nativeCellPixels:16,originX:0,originY:0,forgeWidth:32,forgeHeight:30,omittedRow:15,omittedRowEmpty:true},
  nativeCells:copy(map.cells),nativeSpawn:copy(map.spawn),nativePalette:copy(g.palette),
  collision:{knownCells:960,solidCells:collision.reduce((s,v)=>s+v,0),emptyCells:collision.filter(v=>v===0).length,values:collision,meaning:'Native fixed Solid becomes four Forge Solid cells; native Empty becomes four Forge Empty cells.'},
  adaptation:{backend:'single-room',authoredPlayer:true,player:adaptedSpawn,physics:{moveSpeed:2,jumpSpeed:4,gravity:1,maxFallSpeed:4},sourceStage:'raw command output before PrettyLevel',graphics:'reset palette and source metatile tiles; random and later visual transformations omitted'},
  construction:{map:{cpuAddress:map.cpuAddress,fileOffset:map.fileOffset,byteLength:map.byteLength,configurationIndices:copy(map.configurationIndices||[]),staticConfigurationIndices:copy(map.staticConfigurationIndices||[]),commands:copy(map.commands||[]),orderedWrites:copy(map.orderedWrites||[])},graphics:copy(g.construction||{}),sourceStructure:copy(native.structure||{})},
  evidence,unknown:['original actor behavior','original movement physics','audio','random decoration','later palette changes','full-game topology'],limitations:[...limits,...(g.limitations||gr.limitations||[])]};
 validateRecovery(report);freeze(report);
 const pal=Array.from({length:4},(_,i)=>[g.palette[0],...g.palette.slice(i*4+1,i*4+4)]),chr=tiles(g.chrBytes),nt=nametable.slice(0,960),attr=nametable.slice(960),properties=materialize(nt,attr,collision);
 const scene=makeScene({id:sceneId,name:label,chr,sprChr:normalizeTiles(),nt,attr,pal,sprPal:pal,bgColor:g.palette[0],...properties,entities:[],oam:[],links:[],sceneType:'sideview',scrollDir:'none',view:{x:0,y:0,w:256,h:240,followEnt:-1,hBorder:32,vBorder:24},buildInclude:false,buildOrder:0,captureMeta:{mode:'native-map',note:'Native raw static map and fixed binary collision; separate playable project uses authored controls and player.',recovery:copy(report)}});
 if(JSON.stringify(canonicalCollision(scene))!==JSON.stringify(collision))fail('Canonical normalization changed decoded collision.');
 return {scene,report};
}
function standalone(scene,source){
 const sc=copy(scene),r=sc.captureMeta.recovery,p=r.adaptation.player,playerId='native-map-test-player',frameId='native-map-test-frame',states=['idle','walk','attack'];sc.buildInclude=true;sc.buildOrder=0;
 // Authored validation glyph lives only in the separate playable project.
 sc.sprChr=normalizeTiles();sc.sprChr[0]=Array.from({length:8},(_,y)=>Array.from({length:8},(_,x)=>x===0||x===7||y===0||y===7?2:3));
 sc.entities=[{id:playerId,name:'Authored collision test player',type:'player',x:p.x,y:p.y,w:8,h:8,sprTile:0,animationBinding:{defaultState:'idle',facing:'right',states:states.map(state=>({state,animationId:'native-map-test-'+state}))}}];
 const gameplay={...Forge165.config.defaults(),mode:'single-room',sceneId:sc.id,playerId,targetId:'',...r.adaptation.physics,bodyWidth:8,bodyHeight:8};
 return {format:'NESForge',version:services.ProjectStore.schema,foundation:window.Forge.release.version,romLayout:3,worldAuthoring:3,metatileExtension:1,metaspriteExtension:2,entityAnimationExtension:1,projectName:(source.name+' — static map').slice(0,120),scenes:[sc],activeScene:0,chr:sc.chr,sprChr:sc.sprChr,nt:sc.nt,attr:sc.attr,pal:sc.pal,sprPal:sc.sprPal,oam:[],tileProps:sc.tileProps,worlds:[],gameplay,worldRuntime:services.WorldConfig.defaults(),audioRuntime:services.AudioConfig.defaults(),gameplayCore:services.GameplayModel.defaults(),metasprites:[{id:frameId,name:'Authored collision test glyph',sceneId:sc.id,spriteMode:8,originX:4,originY:8,pieces:[{id:'native-map-test-piece',tile:0,tile2:0,x:0,y:0,pal:0,flipH:false,flipV:false,behind:false}]}],animations:states.map(state=>({id:'native-map-test-'+state,name:'Authored '+state,state,loop:state!=='attack',frames:[{sceneId:sc.id,tileIdx:0,metaspriteId:frameId,duration:8,hitboxes:[],hurtboxes:[],events:[]}]})),instruments:[],patterns:[{rows:Array.from({length:64},()=>Array.from({length:5},()=>({note:-1,inst:-1,vol:-1,fx:0,fxp:0})))}],orderList:[[0,0,0,0,0]],audRows:64,tempo:150,speed:6,sfx:[],asmSource:'',mapper:0,mirroring:'h',hasSRAM:false,prgBanks:1,chrBanks:1,packScenes:true,importedRom:null,selTile:0,editTile:0,selSprite:-1,selEntity:-1,chrBank:'bg',_selAnim:0,_animFrame:0};
}
function validateRecovery(value){
 const encoded=JSON.stringify(value);if(!encoded||encoded.length>262144)fail('Recovery evidence exceeds 256 KiB.');const r=copy(value);
 if(r.format!=='NESForgeNativeMapRecovery'||r.version!==1||r.method?.id!==ID||r.method?.version!==1)fail('Unsupported map evidence format.');
 if(typeof r.source?.name!=='string'||r.source.name.length>512||!/^[a-f0-9]{64}$/.test(r.source.sha256)||r.source.byteLength!==32784)fail('Invalid map source identity.');
 if(typeof r.resourceKey!=='string'||!/^[a-z0-9][a-z0-9.-]{0,159}$/.test(r.resourceKey)||r.sceneId!=='re-map-'+r.source.sha256+'-'+r.resourceKey||typeof r.label!=='string'||!r.label||r.label.length>200)fail('Invalid map resource identity.');
 if(JSON.stringify(r.region)!==JSON.stringify({nativeWidth:16,nativeHeight:16,visibleWidth:16,visibleHeight:15,nativeCellPixels:16,originX:0,originY:0,forgeWidth:32,forgeHeight:30,omittedRow:15,omittedRowEmpty:true}))fail('Unsupported map region.');
 byteArray(r.nativeCells,256,'persisted native cells');if(r.nativeCells.some(v=>v!==0&&v!==21)||r.nativeCells.slice(240).some(v=>v))fail('Unsupported persisted native cell meaning.');byteArray(r.nativePalette,32,'persisted palette',63);
 const spawn=r.nativeSpawn;if(!spawn||!Number.isInteger(spawn.x)||spawn.x<0||spawn.x>15||!Number.isInteger(spawn.y)||spawn.y<0||spawn.y>14)fail('Invalid native spawn.');
 const collision=byteArray(r.collision?.values,960,'persisted binary collision',1),expected=Array.from({length:960},(_,i)=>r.nativeCells[(Math.floor(i/32)>>1)*16+((i%32)>>1)]===21?1:0),solid=expected.reduce((s,v)=>s+v,0);
 if(JSON.stringify(collision)!==JSON.stringify(expected)||r.collision.knownCells!==960||r.collision.solidCells!==solid||r.collision.emptyCells!==960-solid)fail('Persisted collision coverage differs from native records.');
 if(r.adaptation?.backend!=='single-room'||r.adaptation.authoredPlayer!==true||JSON.stringify(r.adaptation.player)!==JSON.stringify({x:spawn.x*16+8,y:spawn.y*16+16,width:8,height:8})||JSON.stringify(r.adaptation.physics)!==JSON.stringify({moveSpeed:2,jumpSpeed:4,gravity:1,maxFallSpeed:4}))fail('Invalid declared playable adaptation.');
 const c=r.construction;if(!c||typeof c!=='object'||Array.isArray(c)||JSON.stringify(c).length>180000||!Number.isInteger(c.map?.fileOffset)||!Number.isInteger(c.map.byteLength)||c.map.fileOffset<16||c.map.byteLength<2||c.map.fileOffset+c.map.byteLength>r.source.byteLength)fail('Invalid map construction evidence.');
 if(!Array.isArray(r.evidence)||!r.evidence.length||r.evidence.length>128)fail('Invalid map evidence.');r.evidence.forEach(e=>{if(e.sourceSha256!==r.source.sha256)fail('Map evidence refers to another source.');methods.evidence(e,r.source);});textList(r.unknown,'unknowns');textList(r.limitations,'limitations');return freeze(r);
}
methods.registerProfile({id:ID,version:1,contractVersion:2,name:'NES command metatile maps',domains:['graphics','maps','collision'],sceneConversion:'map',limitations:limits,limits:{maxSourceBytes:32784,maxWork:4194304},operations:{decode:{label:'Decode native map records',effect:'read-only'},convert:{label:'Preview static map and collision',effect:'preview',fidelity:'subset'}},
 probe:async(analysis,context)=>{const result=decodeSource(context);return{status:result.status,reason:result.reason||'Source-linked command maps and collision records decoded.',evidence:result.evidence||[]};},
 handlers:{decode:async(analysis,input,context)=>{options(input,context.source);const result=decodeSource(context,true);return{status:result.status,reason:result.reason||'Native map records decoded; each resource declares conversion limits.',evidence:result.evidence||[],data:result};},convert:async(analysis,input,context)=>{options(input,context.source,true);const result=decodeSource(context,true);if(result.status!=='supported')return{status:result.status,reason:result.reason,evidence:result.evidence||[]};const map=result.maps.find(m=>resourceKey(m)===input.resourceKey);if(!map)fail('The selected map does not belong to this source.');const data=convert(result,map,context.source);return{status:'supported',reason:'The declared static map can be adapted to existing Forge binary collision and gameplay.',evidence:data.report.evidence,data};}}});
async function listResources(analysis,methodId,controls={}){
 if(methodId!==ID)fail('This method does not produce native command maps.');const result=await methods.dispatch(methodId,'decode',analysis,{},controls);if(result.status!=='supported')fail(result.reason);
 const native=result.data,graphics=native.graphicsResult;return freeze(native.maps.map(map=>({key:resourceKey(map),label:resourceLabel(map),supported:convertible(map)&&graphics?.status==='supported',reason:convertible(map)?(graphics?.status==='supported'?'Static Empty/Solid geometry; preview validates the playable adaptation.':graphics?.reason||'Graphics construction unsupported.'):(unsupported(map).join(' ')||'Unsupported native map semantics.')})));
}
const lifecycle=services.RENativeScene.createLifecycle({label:'Native map',format:'NESForgeNativeMapRecovery',validateRecovery,standalone,expectedBackend:'single-room',importIntent:'nativeMapImport'});
services.RENativeMap=Object.freeze({version:1,methodId:ID,listResources,stage:lifecycle.stage,importStaged:lifecycle.importStaged,validateRecovery});
})();
