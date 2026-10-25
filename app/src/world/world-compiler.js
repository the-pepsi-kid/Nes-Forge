/* World Runtime 1.7: detached dependency planning and a dedicated NROM backend.
 * Authoring IDs are never runtime addresses. Legacy scene-build paths are not used.
 */
(()=>{
'use strict';
const services=window.Forge.services,copy=v=>JSON.parse(JSON.stringify(v));
const fail=message=>{throw Error('World Runtime: '+message);};
const profile=Object.freeze({id:'nrom-world-screen-transitions',mapper:0,prgBytes:32768,chrBytes:8192,maxWorlds:32,maxScreens:64,maxTilesPerBank:256,maxPlayerPieces:24,maxScanlineSprites:8,viewportWidth:256,viewportHeight:240});
const phaseOrder=Object.freeze(['prepare-snapshot','world-dependencies','world-validation','world-asset-link','world-screen-pack','world-code','world-allocation','world-source-record','artifact']);
const physical=['moveSpeed','jumpSpeed','gravity','maxFallSpeed','bodyWidth','bodyHeight'];
const eventBits={attack_start:1,attack_end:2,footstep:4,sound:8,custom:16};
const plans=new WeakSet();
function integer(v,min,max,label){if(!Number.isInteger(v)||v<min||v>max)fail(label+' must be an integer from '+min+' through '+max);return v;}
function unique(items,label){const table=new Map();for(const item of items||[]){if(!item||typeof item.id!=='string'||!item.id||table.has(item.id))fail(label+' IDs must be nonempty and unique');table.set(item.id,item);}return table;}
function diagnostic(severity,code,message,phase){return {severity,code,message,phase};}
function validTile(tile,label){if(!Array.isArray(tile)||tile.length!==8||tile.some(row=>!Array.isArray(row)||row.length!==8||row.some(v=>!Number.isInteger(v)||v<0||v>3)))fail(label+' needs an 8×8 tile of pixel values 0–3');return tile;}
function tileBank(label){
 const tiles=[],keys=new Map();
 function add(tile,owner){validTile(tile,owner);const key=tile.map(row=>row.join('')).join('');if(keys.has(key))return keys.get(key);if(tiles.length>=256)fail(label+' exceeds the 256-tile NROM bank after linking; reduce distinct used graphics');const index=tiles.length;tiles.push(copy(tile));keys.set(key,index);return index;}
 add(Array.from({length:8},()=>Array(8).fill(0)),'Blank tile');return {tiles,add};
}
function palette(value,label){if(!Array.isArray(value)||value.length!==4||value.some(row=>!Array.isArray(row)||row.length!==4||row.some(c=>!Number.isInteger(c)||c<0||c>63)))fail(label+' needs four NES palette rows');return copy(value);}
function rectangles(world,key){
 const list=world[key]||[],width=world.widthScreens*16,height=world.heightScreens*15;
 unique(list,world.name+' '+key);
 for(const r of list){for(const k of ['x','y','w','h'])integer(r[k],k==='w'||k==='h'?1:0,k==='x'||k==='w'?width:height,world.name+' '+key+' '+r.id+' '+k);
  if(r.x+r.w>width||r.y+r.h>height)fail(world.name+' '+key+' '+r.id+' extends outside the world');
  if(r.x%16||r.w%16||r.y%15||r.h%15)fail(world.name+' '+key+' '+r.id+' must be screen-aligned: X/width multiples of 16 cells and Y/height multiples of 15 cells');
  if(key==='cameraRegions'){
   if(!['follow','horizontal','vertical','locked'].includes(r.mode))fail('Unknown camera mode in '+world.name);
  }
 }
 for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){const a=list[i],b=list[j];if(a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h)fail(world.name+' has overlapping '+key+'; separate the executable regions');}
 return list;
}
function plan(input,gameplayCore){
 const source=copy(input),config=source.worldRuntime;
 const audio=services.AudioCompiler.plan(source);
 services.WorldConfig.validate(config);
 if(!config.enabled)fail('Enable World Runtime and select a starting world, spawn, and player');
 if(source.mapper!==0)fail('This profile requires mapper 0 (NROM)');
 if(String(source.asmSource||'').trim())fail('World mode generates its own code. Save and clear custom assembly, or turn off World Runtime');
 const sceneMap=unique(source.scenes,'Scene'),worldMap=unique(source.worlds,'World'),animationMap=unique(source.animations,'Animation'),frameMap=unique(source.metasprites,'Metasprite');
 const startWorld=worldMap.get(config.worldId);if(!startWorld)fail('Choose an existing starting world');
 const selectedScene=sceneMap.get(config.playerSceneId),player=selectedScene?.entities?.find(e=>e.id===config.playerId);
 if(!player||player.type!=='player')fail('Choose an existing Player entity from the selected sprite source scene');
 const physics={};for(const key of physical)physics[key]=config[key];
 const reached=new Set(),queue=[startWorld.id],markersByWorld=new Map();
 while(queue.length){const id=queue.shift();if(reached.has(id))continue;const w=worldMap.get(id);if(!w)fail('A linked destination world is missing: '+id);reached.add(id);
  const markers=unique(w.markers,'Marker in '+w.name);markersByWorld.set(id,markers);
  for(const marker of markers.values()){
   if(!['entrance','exit','spawn'].includes(marker.kind))fail('Unsupported marker kind in '+w.name);
   if(marker.kind==='spawn')continue;
   const tw=marker.targetWorldId||'',tm=marker.targetMarkerId||'';
   if(!!tw!==!!tm)fail('Marker '+marker.id+' must select both a destination world and marker, or neither');
   if(!tw)continue;
   const destination=worldMap.get(tw),target=destination?.markers?.find(m=>m.id===tm);
   if(!destination||!target)fail('Marker '+marker.id+' has an unresolved destination');
   if(!['spawn','entrance'].includes(target.kind))fail('Marker '+marker.id+' must arrive at a Spawn or Entrance marker');
   queue.push(tw);
  }
 }
 const worlds=source.worlds.filter(w=>reached.has(w.id));if(worlds.length>profile.maxWorlds)fail('More than '+profile.maxWorlds+' reachable worlds');
 const startMarker=markersByWorld.get(startWorld.id)?.get(config.spawnId);
 if(!startMarker||!['spawn','entrance'].includes(startMarker.kind))fail('Choose an explicit Spawn or Entrance marker in the starting world');
 const phases=['prepare-snapshot','world-dependencies'],diagnostics=[];
 const background=tileBank('Background graphics'),sprites=tileBank('Player sprite graphics'),spritePalette=palette(selectedScene.sprPal,'Player sprite palette');
 const linkedWorlds=[],worldById=new Map(),rooms=[],cameras=[],screens=[];
 for(const [worldIndex,w] of worlds.entries()){
  integer(w.widthScreens,1,16,w.name+' width');integer(w.heightScreens,1,16,w.name+' height');
  const cols=w.widthScreens*16,rows=w.heightScreens*15;
  if(!Array.isArray(w.map)||w.map.length!==cols*rows)fail(w.name+' map does not match its dimensions');
  if(screens.length+w.widthScreens*w.heightScreens>profile.maxScreens)fail('This screen-transition profile supports at most '+profile.maxScreens+' reachable screens; actual NROM byte capacity may be smaller');
  const sc=sceneMap.get(w.tilesetSceneId);if(!sc)fail(w.name+' references a missing metatile source scene');
  const definitions=new Map();for(const m of sc.metatiles||[]){integer(m.id,0,254,'Metatile ID');if(definitions.has(m.id))fail('Duplicate metatile ID in '+sc.name);definitions.set(m.id,m);}
  const used=[...new Set(w.map.filter(id=>id!==-1))].sort((a,b)=>a-b),linkedDefinitions=new Map();
  for(const id of used){integer(id,0,254,w.name+' map metatile');const m=definitions.get(id);if(!m)fail(w.name+' references missing metatile '+id+' in '+sc.name);
   if(!Array.isArray(m.tiles)||m.tiles.length!==4||!Array.isArray(m.collision)||m.collision.length!==4)fail('Metatile '+id+' needs four tile and collision quadrants');
   integer(m.pal,0,3,'Metatile '+id+' palette');
   for(const c of m.collision)if(c!==0&&c!==1)fail('Metatile '+id+' uses unsupported collision; World Runtime executes Empty and Solid only');
   const tiles=m.tiles.map(t=>{integer(t,0,(sc.chr?.length||0)-1,'Metatile '+id+' source CHR tile');return background.add(sc.chr[t],sc.name+' CHR '+t);});
   linkedDefinitions.set(id,{id,tiles,pal:m.pal,collision:[...m.collision]});
  }
  for(const id of w.map)if(id!==-1&&!linkedDefinitions.has(id))fail(w.name+' has an invalid or unresolved map cell');
  const wr=rectangles(w,'rooms'),wc=rectangles(w,'cameraRegions');
  const roomIndices=new Map(wr.map(r=>{const index=rooms.length;rooms.push({worldId:w.id,...copy(r)});return [r.id,index];}));
  const cameraIndices=new Map(wc.map(r=>{const index=cameras.length;cameras.push({worldId:w.id,...copy(r)});return [r.id,index];}));
  if(rooms.length>254||cameras.length>254)fail('World Runtime region indices exceed their byte-sized profile');
  const worldPalette=palette(sc.pal,w.name+' background palette').flat(),actorPalette=spritePalette.flat();
  // Universal-background mirrors in sprite palette RAM must retain this world's backdrop.
  for(const i of [0,4,8,12]){worldPalette[i]=worldPalette[0];actorPalette[i]=worldPalette[0];}
  const linked={id:w.id,name:w.name,worldIndex,widthScreens:w.widthScreens,heightScreens:w.heightScreens,screenStart:screens.length,source:w,definitions:linkedDefinitions};
  linkedWorlds.push(linked);worldById.set(w.id,linked);
  for(let sy=0;sy<w.heightScreens;sy++)for(let sx=0;sx<w.widthScreens;sx++){
   const index=screens.length,nt=Array(1024).fill(0),collision=Array(960).fill(0);
   for(let my=0;my<15;my++)for(let mx=0;mx<16;mx++){
    const id=w.map[(sy*15+my)*cols+sx*16+mx];if(id===-1)continue;const m=linkedDefinitions.get(id);
    for(let q=0;q<4;q++){const at=(my*2+(q>>1))*32+mx*2+(q&1);nt[at]=m.tiles[q];collision[at]=m.collision[q];}
    const ai=960+(my>>1)*8+(mx>>1),shift=((my&1)*2+(mx&1))*2;nt[ai]=(nt[ai]&~(3<<shift))|(m.pal<<shift);
   }
   const contains=r=>sx*16>=r.x&&sx*16<r.x+r.w&&sy*15>=r.y&&sy*15<r.y+r.h;
   const room=wr.find(contains),camera=wc.find(contains);
   const cameraX=camera&&['locked','vertical'].includes(camera.mode)?camera.x/16:sx;
   const cameraY=camera&&['locked','horizontal'].includes(camera.mode)?camera.y/15:sy;
   screens.push({id:w.id+':'+sx+','+sy,index,worldIndex,roomIndex:room?roomIndices.get(room.id):255,cameraIndex:camera?cameraIndices.get(camera.id):255,
    screenX:sx,screenY:sy,cameraScreen:linked.screenStart+cameraY*w.widthScreens+cameraX,nt,collision,palette:[...worldPalette,...actorPalette],left:sx?index-1:-1,right:sx<w.widthScreens-1?index+1:-1,
    up:sy?index-w.widthScreens:-1,down:sy<w.heightScreens-1?index+w.widthScreens:-1,markers:[]});
  }
  for(const m of markersByWorld.get(w.id).values()){integer(m.x,0,cols-1,'Marker '+m.id+' X');integer(m.y,0,rows-1,'Marker '+m.id+' Y');}
 }
 phases.push('world-validation');
 function paletteMatch(sc,row,label){integer(row,0,3,label+' palette row');const p=palette(sc?.sprPal,label+' source sprite palette');for(let c=1;c<4;c++)if(p[row][c]!==spritePalette[row][c])fail(label+' visible sprite palette differs from the selected player source');}
 function spriteTile(sc,index,label){integer(index,0,(sc?.sprChr?.length||0)-1,label+' source sprite tile');return sprites.add(sc.sprChr[index],label);}
 function pieces(frame,label){const out=[];const add=(x,y,tile,attr)=>{integer(x,-64,63,label+' piece X');integer(y,-64,63,label+' piece Y');out.push({x,y,tile,attr});};
  if(frame.metaspriteId){const asset=frameMap.get(frame.metaspriteId),sc=sceneMap.get(asset?.sceneId);if(!asset||!sc)fail(label+' references a missing metasprite or source scene');
   if(![8,16].includes(asset.spriteMode)||!Array.isArray(asset.pieces))fail(label+' has an invalid metasprite');
   for(const p of asset.pieces){paletteMatch(sc,p.pal,label);const attr=p.pal|(p.behind?32:0)|(p.flipH?64:0)|(p.flipV?128:0),x=p.x-asset.originX,y=p.y-asset.originY;
    if(asset.spriteMode===16){const a=spriteTile(sc,p.tile,label),b=spriteTile(sc,p.tile2,label);add(x,y,p.flipV?b:a,attr);add(x,y+8,p.flipV?a:b,attr);}else add(x,y,spriteTile(sc,p.tile,label),attr);
   }
  }else{const sc=sceneMap.get(frame.sceneId);if(!sc)fail(label+' references a missing sprite source scene');paletteMatch(sc,0,label);add(-4,-4,spriteTile(sc,frame.tileIdx,label),0);}
  if(out.length>profile.maxPlayerPieces)fail(label+' exceeds '+profile.maxPlayerPieces+' player sprite pieces');
  const counts=new Map();for(const p of out)for(let y=p.y;y<p.y+8;y++)counts.set(y,(counts.get(y)||0)+1);
  if(Math.max(0,...counts.values())>8)fail(label+' exceeds eight sprites on a scanline');return out;
 }
 const binding=player.animationBinding;if(!binding||!Array.isArray(binding.states))fail('The player needs authored animation bindings in Entity Studio');
 const states=new Map();for(const state of binding.states){if(states.has(state.state))fail('Duplicate player animation state: '+state.state);states.set(state.state,state.animationId);}
 const animations={},compiledAnimations=new Map();
 function animation(id,state){if(compiledAnimations.has(id))return compiledAnimations.get(id);const a=animationMap.get(id);if(!a||!Array.isArray(a.frames)||a.frames.length<1||a.frames.length>64)fail('Player '+state+' needs an existing animation with 1–64 frames');
  const result={id,loop:a.loop!==false,frames:a.frames.map((f,i)=>{const label='Player '+state+' frame '+(i+1);return {duration:integer(f.duration,1,255,label+' duration'),pieces:pieces(f,label),hitboxes:copy(f.hitboxes||[]),hurtboxes:copy(f.hurtboxes||[]),eventMask:(f.events||[]).reduce((bits,event)=>bits|(eventBits[event.type]||0),0),sound:audio.enabled?audio.soundIndex(f,label):255};})};compiledAnimations.set(id,result);return result;
 }
 for(const state of ['idle','walk','attack']){if(!states.has(state))fail('The player needs an "'+state+'" animation binding');animations[state]=animation(states.get(state),state);}
 if(states.has('jump'))animations.jump=animation(states.get('jump'),'jump');if(animations.attack.loop)fail('The player attack animation must be nonlooping');
 phases.push('world-asset-link');
 function location(worldId,marker){const w=worldById.get(worldId),sx=Math.floor(marker.x/16),sy=Math.floor(marker.y/15);return {screen:w.screenStart+sy*w.widthScreens+sx,x:(marker.x%16)*16+8,y:(marker.y%15)*16+8};}
 function solid(w,x,y){const width=w.widthScreens*256,height=w.heightScreens*240;if(x<0||y<0||x>=width||y>=height)return true;const sx=Math.floor(x/256),sy=Math.floor(y/240),screen=screens[w.screenStart+sy*w.widthScreens+sx];return screen.collision[Math.floor((y%240)/8)*32+Math.floor((x%256)/8)]===1;}
 function clearMarker(worldId,marker,label){const w=worldById.get(worldId),x=marker.x*16+8,y=marker.y*16+8,left=x-physics.bodyWidth/2,top=y-physics.bodyHeight;
  if(left<0||top<0||x+physics.bodyWidth/2>w.widthScreens*256||y>w.heightScreens*240)fail(label+' player body extends beyond the world');
  for(let ty=Math.floor(top/8);ty<=Math.floor((y-1)/8);ty++)for(let tx=Math.floor(left/8);tx<=Math.floor((x+physics.bodyWidth/2-1)/8);tx++)if(solid(w,tx*8,ty*8))fail(label+' player body intersects solid collision');
 }
 clearMarker(startWorld.id,startMarker,'Starting spawn');
 for(const w of worlds){const occupied=new Set();for(const marker of markersByWorld.get(w.id).values()){
  if(marker.kind==='spawn'||!marker.targetWorldId)continue;
  const key=marker.x+','+marker.y;if(occupied.has(key))fail(w.name+' has multiple traversable markers in one cell');occupied.add(key);
  clearMarker(w.id,marker,'Entrance/exit '+marker.id);
  const target=markersByWorld.get(marker.targetWorldId)?.get(marker.targetMarkerId);if(!target)fail('A destination marker is missing from the reachable world plan');
  clearMarker(marker.targetWorldId,target,'Destination '+target.id);
  const from=location(w.id,marker),to=location(marker.targetWorldId,target);
  screens[from.screen].markers.push({id:marker.id,x:from.x,y:from.y,targetScreen:to.screen,targetX:to.x,targetY:to.y});
 }}
 const worldRecords=linkedWorlds.map(w=>({id:w.id,name:w.name,worldIndex:w.worldIndex,widthScreens:w.widthScreens,heightScreens:w.heightScreens,screenStart:w.screenStart})),startLocation=location(startWorld.id,startMarker);
 gameplayCore=gameplayCore||services.GameplayCompiler.plan(source,{backend:'world',executionContext:{reachableWorldIds:[...reached]}});services.GameplayCompiler.locateWorld(gameplayCore,{worlds:worldRecords,rooms,start:startLocation});services.GameplayCompiler.compileSemantics(gameplayCore);
 if(gameplayCore.enabled)for(const actor of gameplayCore.actors){if(actor.components.includes('Input'))continue;const sc=sceneMap.get(actor.render.sourceSceneId||config.playerSceneId);if(!sc)fail('Gameplay Core Actor '+actor.id+' references a missing sprite source Scene');paletteMatch(sc,actor.render.palette,'Gameplay Core Actor '+actor.id);actor.render.tile=spriteTile(sc,actor.render.tile,'Gameplay Core Actor '+actor.id);}
 const chr=new Uint8Array(8192),pad=tiles=>{while(tiles.length<256)tiles.push(Array.from({length:8},()=>Array(8).fill(0)));return tiles;};
 const backgroundTileCount=background.tiles.length,spriteTileCount=sprites.tiles.length;chr.set(encodeTiles(pad(background.tiles)),0);chr.set(encodeTiles(pad(sprites.tiles)),4096);
 const spec={physics,player:{facing:binding.facing==='left'?1:0,animations},start:startLocation,screens,audio,worlds:worldRecords,rooms,cameras,warnings:[],gameplayCore};
 const resources=screens.flatMap(sc=>[{kind:'nametable',ownerId:sc.id,byteLength:1024,alignment:1,region:'PRG',bank:0,address:null},{kind:'collision',ownerId:sc.id,byteLength:120,alignment:1,region:'PRG',bank:0,address:null},{kind:'palette',ownerId:sc.id,byteLength:32,alignment:1,region:'PRG',bank:0,address:null}]);
 const minimumBytes=[['nt',1024],['collision',120],['palette',32]].reduce((sum,[key,size])=>sum+new Set(screens.map(sc=>sc[key].join(','))).size*size,0);
 if(minimumBytes>0x4FF0)fail('Reachable screen resources alone need '+minimumBytes+' bytes and exceed the '+0x4FF0+'-byte code/resource region; reduce the executable world set');
 phases.push('world-screen-pack');
 diagnostics.push(diagnostic('info','world-selection',worlds.length+' reachable world(s), '+screens.length+' screen(s), '+rooms.length+' room region(s), '+cameras.length+' camera region(s).','world-dependencies'));
 diagnostics.push(diagnostic('info','world-graphics',backgroundTileCount+'/256 background tiles and '+spriteTileCount+'/256 sprite tiles linked from actual world/animation/gameplay dependencies.','world-asset-link'));
 diagnostics.push(diagnostic('info','world-traversal','Screen transitions; Empty/Solid collision; Up enters a linked entrance/exit; Start returns to the selected spawn.','world-screen-pack'));
 diagnostics.push(diagnostic('warning','world-capacity-pending',minimumBytes+' screen-data bytes planned; final code, animation, and compressed authoring sizes are checked during ROM allocation.','world-allocation'));
 diagnostics.push(diagnostic('warning','world-authoring-limits','One bound player executes. Other scene entities, attack contacts and custom events remain authoring data. Scene Build Set applies to viewer/single-room builds; World mode follows saved world and player dependencies.','world-dependencies'));
 if(audio.enabled)diagnostics.push(diagnostic('info','audio-runtime',(audio.musicEnabled?'Tracker music and ':'')+audio.sfx.length+' named SFX compile into World Runtime; linked sound events execute on frame entry.','world-asset-link'));
 else if(source.instruments.length||source.sfx.length)diagnostics.push(diagnostic('warning','audio-authoring','Audio Runtime is disabled; tracker and SFX data remain authoring-only.','world-asset-link'));
 if(gameplayCore.enabled){diagnostics.push(...gameplayCore.diagnostics);diagnostics.push(diagnostic('info','gameplay-core-runtime',gameplayCore.actors.length+' canonical Actor Instance(s) and '+gameplayCore.variables.length+' scoped persistent variable(s) compile into World Runtime.','world-asset-link'));}
 const result={backend:'world',source,profile,phaseOrder,phases,diagnostics,spec,chr,resources,worlds:spec.worlds,pack:false,custom:false,backgroundTileCount,spriteTileCount,gameplayCore};plans.add(result);return result;
}
function compile(p){
 if(!plans.has(p))fail('Compile requires a prepared World Runtime plan');if(p.worldCompiled)fail('A world plan is single-use');p.worldCompiled=true;
 const engine=services.WorldEngine.compile(p.spec);p.phases.push('world-code');
 const artifact=services.WorldRom.package({source:p.source,engine,chr:p.chr,worldCount:p.worlds.length});p.phases.push('world-allocation','world-source-record');
 p.diagnostics=p.diagnostics.filter(d=>d.code!=='world-capacity-pending');
 p.diagnostics.push(diagnostic('info','world-capacity','World code/resources: '+engine.bytes.length+' bytes; authoring record: '+artifact.metadata.sourceRecordBytes+' bytes; 32 KB PRG + 8 KB CHR.','world-allocation'));
 return {...artifact,world:{spec:p.spec,symbols:engine.symbols,codeEnd:engine.codeEnd,dataEnd:engine.dataEnd,resources:engine.resources,rom:artifact.rom}};
}
services.WorldCompiler={profile,phaseOrder,plan,compile,lastBuild:null};
})();
