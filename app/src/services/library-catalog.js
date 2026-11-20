/*
 * NES FORGE MODULE: src/services/library-catalog.js
 * Entry: Forge.services.LibraryCatalog, commands library.registerCatalog, library.surveyStages, library.usePose
 * Purpose: Recovered ROM catalogs become library entries, and library sprites can be used in the working project.
 *   - registerCatalog: every record of an imported ROM's investigation catalog (rooms, stages, poses, animations,
 *     actors, locations, CHR banks, maps, audio cues, symbols, RAM labels) becomes an entry on the ROM's shelf, with
 *     its decoded ROM location and, where decoded, its verified stage (basis rom-table). Each pose stores a
 *     rendition made by the editor's own converter (pieces, the tiles they use and the room palette it was drawn
 *     with), so it can be used in any project without the source ROM open.
 *   - surveyStages (Ninja Gaiden US): plays each area from its first room in the emulator (walking, running jumps,
 *     turning around when blocked) and records which enemy types and poses appear, confirmed against the sprites
 *     on screen and against the area's own spawn tables. Results are verified placements with
 *     basis "runtime" and their route; they never become developer notes or guesses.
 *   - usePose: puts a library sprite in the active scene. "reference" (default) links it to the library entry and
 *     warns before it is edited; "copy" makes an independent asset that records what it was derived from. Its
 *     tiles go into free sprite tile pairs and its palette rows into matching or unused rows; a conflict stops the
 *     change with an explanation. One undoable project edit.
 * Bundle order: after src/services/resource-library.js.
 */
(()=>{
'use strict';
const F=window.Forge,services=F.services,C=F.commands,L=services.ResourceLibrary;
if(!L)return;
const fail=message=>{throw Error('Library: '+message);};
const cp=value=>JSON.parse(JSON.stringify(value));
const RECORDS=[['native','scenes','room'],['native','stages','stage'],['native','poses','pose'],['native','animations','animation'],['native','actors','actor'],['native','locations','location'],
  ['native','graphics','chr'],['spatial','maps','map'],['audio','cues','cue'],['audio','instruments','instrument'],['audio','samples','sample']];
const idOf=(romSha,kind,rid)=>'rom:'+romSha.slice(0,16)+':'+kind+':'+rid;
async function sha(text){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');}

// The first ROM location a decoded record names, and how many it names.
function decodedEvidence(record){
  let first=null,count=0;
  (function walk(v,depth){
    if(depth>5||!v||typeof v!=='object')return;
    if(Array.isArray(v)){for(const x of v.slice(0,64))walk(x,depth+1);return;}
    if(Number.isInteger(v.fileOffset)&&'length' in v){count++;if(!first)first=v;return;}
    for(const x of Object.values(v))walk(x,depth+1);
  })(record,0);
  if(!first)return {state:'none'};
  const fields={fileOffset:{first:first.fileOffset,field:'fileOffset',count}};
  if(Number.isInteger(first.cpu))fields.cpu={first:first.cpu,field:'cpu',count};
  if(Number.isInteger(first.bank16KiB))fields.bank={first:first.bank16KiB,field:'bank16KiB',count};
  else if(Number.isInteger(first.bank4KiB))fields.bank={first:first.bank4KiB,field:'bank4KiB',count};
  return {state:'decoded',basis:'NES Forge ROM decoder',locations:count,fields};
}
// A pose drawn by the editor's own converter in a room's graphics context.
function rendition(project,poseId,contextRoomId,d=services.InvestigatedLibrary.describe(project)){
  const IL=services.InvestigatedLibrary;
  const item=d.items.find(i=>i.kind==='pose'&&i.id===poseId);if(!item)return null;
  const context=contextRoomId||d.contextSceneId,pv=IL.preview(item.request,{contextSceneId:context},project);
  const m=pv.poses?.[0],sc=pv.scene;if(!m||!sc)return null;
  const used=new Set();for(const p of m.pieces){used.add(p.tile);if(m.spriteMode===16&&Number.isInteger(p.tile2))used.add(p.tile2);}
  const room=project.investigation.catalogs.native.scenes.find(r=>r.id===context);
  return {format:'NESForgeLibraryPose',version:1,poseId,name:m.name,spriteMode:m.spriteMode,originX:m.originX,originY:m.originY,
    pieces:m.pieces.map(p=>({tile:p.tile,tile2:p.tile2,x:p.x,y:p.y,pal:p.pal,flipH:!!p.flipH,flipV:!!p.flipV,behind:!!p.behind})),
    tiles:Object.fromEntries([...used].map(t=>[t,cp(sc.sprChr[t])])),palette:cp(sc.sprPal),
    context:{roomId:context,label:room?.label||context,stage:room?.stage?.label||null}};
}

// ---------- registration ----------
async function registerCatalog(project=services.ProjectStore.capture(),{onProgress}={}){
  const n=project?.investigation;
  if(!n||n.version!==1||!n.catalogs?.native)fail('the open project has no recovered ROM catalog; import a ROM with a verified profile first');
  await L.ensureMeta();
  const source=n.source,romSha=source.sha256,shelf=romSha,profile=n.catalogs.native.profile?.id||source.profile;
  const packKey='catalog:'+await sha(JSON.stringify(n.catalogSha256));
  const prior=await L.getPack(packKey);
  if(prior?.state==='complete')return {packSha256:packKey,already:true,shelf,stats:prior.stats};
  let rom=null;try{rom=services.NativeEngineProject.validate(project).bytes;}catch(_){rom=null;}
  const records=[];
  for(const [cat,coll,kind] of RECORDS){const list=n.catalogs[cat]?.[coll];if(Array.isArray(list))list.forEach((r,i)=>records.push({kind,r,rid:String(r.id??i)}));}
  records.push({kind:'symbols',r:{id:'symbols',label:'Code symbols',items:n.catalogs.native.symbols||[]},rid:'symbols'},{kind:'ram-map',r:{id:'ram',label:'RAM labels',items:n.catalogs.native.ram||[]},rid:'ram'});
  const started=Date.now(),stats={entries:0,renditions:0,chrBanks:0,verifiedPlacements:0};let ops=[];
  const described=services.InvestigatedLibrary.describe(project);
  for(const [i,{kind,r,rid}] of records.entries()){
    const id=idOf(romSha,kind,rid),label=String(r.label||r.name||(kind+' '+rid)).slice(0,160);
    let data,fileType='json';
    if(kind==='chr'&&rom&&Number.isInteger(r.fileOffset)){data=rom.slice(r.fileOffset,r.fileOffset+r.length);fileType='binary';stats.chrBanks++;}
    else data=JSON.stringify(r);
    const stored=await L.storeData(data);
    const e={id,packSha256:packKey,path:kind+'/'+label,label,origin:'rom-catalog',shelf,sourceSha256:romSha,game:profile,kind,identified:true,fileType,size:stored.size,contentHash:stored.hash,loads:false,
      registered:Date.now(),data:{state:'stored'},validation:{state:'accepted',reason:'decoded by the NES Forge decoder for '+profile},
      evidence:decodedEvidence(kind==='cue'?{loc:{fileOffset:r.headerFileOffset,cpu:r.headerCPU,length:r.headerBytes||1}}:r)};
    if(kind==='chr')e.record=cp(r);
    const verified=[];
    if(kind==='room'&&r.stage)verified.push({stage:r.stage.label,area:r.area,room:r.room,basis:'rom-table',source:r.stage.source});
    else if((kind==='room'||kind==='location')&&r.group)verified.push({context:r.group,basis:'rom-table'});
    if(kind==='stage')verified.push({stage:r.label,areas:r.areas,basis:'rom-table',source:r.source});
    if(verified.length){e.placement={verified};stats.verifiedPlacements+=verified.length;}
    if(kind==='pose'){try{const rend=rendition(project,r.id,null,described);if(rend){const st=await L.storeData(JSON.stringify(rend));e.rendition={hash:st.hash,context:rend.context};stats.renditions++;}}
      catch(err){e.renditionError=String(err.message).slice(0,200);}}
    ops.push(['entries',e]);stats.entries++;
    if(ops.length>=40){await L.putRecords(ops);ops=[];onProgress?.({done:i+1,total:records.length});}
  }
  await L.putRecords(ops);
  const shelves=(await C.run('library.shelves')).result||[];
  const shelfRecord=shelves.find(s=>s.shelf===shelf)||{shelf,sourceSha256:romSha,title:source.name.replace(/\.nes$/i,''),packs:[],created:Date.now()};
  if(!shelfRecord.packs.includes(packKey))shelfRecord.packs.push(packKey);shelfRecord.updated=Date.now();
  await L.putRecords([['shelves',shelfRecord],['packs',{packSha256:packKey,name:source.name+' · recovered catalog',origin:'rom-catalog',bytes:0,fileCount:records.length,
    format:'NESForgeInvestigation',game:profile,sourceSha256:romSha,shelf,mode:'full',intake:{state:'accepted',kind:'rom-catalog'},state:'complete',registered:started,updated:Date.now(),stats}]]);
  return {packSha256:packKey,already:false,shelf,stats,ms:Date.now()-started};
}

// ---------- runtime stage survey (Ninja Gaiden US) ----------
async function surveyStages({areas,frames=1500}={}){
  const project=services.ProjectStore.capture(),n=project.investigation;
  if(n?.catalogs?.native?.profile?.id!=='ninja-gaiden-us')fail('the runtime stage survey is written for Ninja Gaiden (US); open its investigated project first');
  const rom=services.NativeEngineProject.validate(project).bytes,scenes=n.catalogs.native.scenes,romSha=n.source.sha256;
  const enemyPoses=new Map(n.catalogs.native.poses.filter(p=>p.owner==='enemy').map(p=>[p.selector,p]));
  const run=async(name,args)=>{const r=await C.run(name,args);if(!r.ok)fail(name+': '+r.error.message);return r.result;};
  const press=async button=>{await run('input.set',{buttons:{[button]:true}});await run('emulator.frames',{count:4});await run('input.set',{buttons:{[button]:false}});};
  const list=areas||[...new Set(scenes.map(s=>s.area))],results=[];
  for(const area of list){
    const stage=scenes.find(s=>s.area===area)?.stage?.label||null,rooms=scenes.filter(s=>s.area===area),firstRoom=rooms[0]?.areaFirstRoom??rooms[0]?.room;
    // enemy types the ROM's own spawn tables place in this area's rooms; observations are checked against them
    const tableTypes=new Set(rooms.flatMap(r=>(r.enemies||[]).map(e=>e.type)));
    await run('emulator.load',{bytes:rom,name:'survey.nes'});
    let ready=false;for(let f=0;f<3000&&!ready;f+=30){await run('emulator.frames',{count:26});await press('start');ready=emu.vram[0x97]===0x18&&emu.ram[0x6D]===0;}
    if(!ready){results.push({area,stage,error:'the game did not reach its first stage'});continue;}
    await run('emulator.frames',{count:60});
    if(area){
      // time over: the game's own death routine restarts at the area ($6D) and room ($6E, checkpoint $6F) held in RAM;
      // both are set to the area's first room (PRG bank 0 $AF2C), and the restart must land there
      emu.ram[0x6D]=area;emu.ram[0x6E]=firstRoom;emu.ram[0x6F]=firstRoom;emu.ram[0x63]=1;emu.ram[0x76]=Math.max(emu.ram[0x76],2);let zero=false,restarted=false;
      for(let f=0;f<6000&&!restarted;f+=10){await run('emulator.frames',{count:10});const t=emu.ram[0x63];if(t===0)zero=true;else if(zero&&t>=140&&t<=150)restarted=true;}
      if(!restarted||emu.ram[0x6D]!==area||emu.ram[0x6E]!==firstRoom){results.push({area,stage,error:'the game did not restart in this area\'s first room (area '+emu.ram[0x6D]+', room '+emu.ram[0x6E]+')'});continue;}
      await run('emulator.frames',{count:30});
    }
    // route: walk one way swinging the sword; when blocked, take a running jump (leaping off a wall when clinging to
    // one) with a different run-up each try; turn around only when a direction makes no headway at all. The full
    // button state is sent every step (input.set merges what it is given).
    const seen=new Map();let left=false,f=0,dir='right',turns=0,deaths=0,died=false;
    const pos=()=>(emu.ram[0x52]<<8|emu.ram[0x51])+emu.ram[0x86];
    const tick=async(buttons,steps=1)=>{for(let k=0;k<steps&&!left&&f<frames;k++,f+=4){
      await run('input.set',{buttons:{left:false,right:false,up:false,down:false,a:false,b:false,...buttons}});await run('emulator.frames',{count:4});
      if(emu.ram[0x6D]!==area){left=true;break;}
      if(emu.ram[0x76]<2){emu.ram[0x76]=2;deaths++;died=true;} // keep the survey out of the game-over screen
      const oam=emu.oamMem,onScreen=new Set();for(let s=0;s<64;s++)if(oam[s*4]<239)onScreen.add(oam[s*4+1]);
      for(let i=0;i<8;i++){
        if(!emu.ram[0x498+i])continue; // slot flags: zero when the slot holds no live enemy
        const type=emu.ram[0x400+i],pose=emu.ram[0x438+i],key=type+':'+pose,rec=seen.get(key)||{type,pose,samples:0,onScreen:0};
        rec.samples++;const cat=enemyPoses.get(pose);if(cat?.pieces?.length&&cat.pieces.every(pc=>onScreen.has(pc.tile)))rec.onScreen++;seen.set(key,rec);
      }
    }};
    let origin=pos(),best=origin,still=0,tries=0;
    while(f<frames&&!left){
      await tick({[dir]:true,b:f%32===0});
      if(died){died=false;best=pos();still=0;tries=0;continue;} // back at the checkpoint: headway counts from there
      const q=pos();if(dir==='right'?q>best:q<best){best=q;still=0;tries=0;}else still++;
      if(still<12)continue;
      still=0;const back=dir==='right'?'left':'right';tries++;
      if(tries>3&&Math.abs(best-origin)<48){dir=back;origin=best=pos();tries=0;turns++;continue;}
      await tick({[back]:true,a:emu.ram[0x80]===10},[4,8,2,12][tries%4]);await tick({},2);await tick({[dir]:true},3);await tick({[dir]:true,a:true},8);
    }
    await run('input.set',{buttons:{left:false,right:false,a:false}});
    results.push({area,stage,room:firstRoom,frames,leftArea:left,turns,deaths,route:'area start (room '+firstRoom+'): walking with the sword, running jumps over obstacles, turning around when a direction is closed; up to '+frames+' frames',
      tableTypes:[...tableTypes].sort((a,b)=>a-b),
      observations:[...seen.values()].map(o=>({...o,poseId:enemyPoses.has(o.pose)?'enemy:'+o.pose:null,inSpawnTables:tableTypes.has(o.type)})).sort((a,b)=>a.type-b.type||a.pose-b.pose)});
  }
  // record: a pose seen on screen in an area is a verified (runtime) placement, with its route and sample counts
  const firstRoom=new Map();for(const s of scenes)if(s.stage&&!firstRoom.has(s.stage.label))firstRoom.set(s.stage.label,s.id);
  const described=services.InvestigatedLibrary.describe(project);
  let recorded=0;
  for(const r of results)for(const o of r.observations||[]){
    // verified only when seen on screen AND its enemy type is one the ROM's spawn tables place in this area;
    // anything else (projectiles, spawned helpers) is reported in the results but not recorded as placement
    if(!o.poseId||!o.onScreen||!o.inSpawnTables)continue;
    const place={stage:r.stage,area:r.area,basis:'runtime',route:r.route,samples:o.samples,onScreen:o.onScreen,enemyType:o.type,romSha256:romSha};
    for(const [kind,rid] of [['pose',o.poseId],['actor','ng-actor:'+o.type]]){
      const id=idOf(romSha,kind,rid);let e;try{e=await L.entry(id);}catch(_){continue;}
      const kept=(e.placement?.verified||[]).filter(p=>!(p.basis==='runtime'&&p.area===r.area));
      e.placement={...(e.placement||{}),verified:[...kept,place]};
      if(kind==='pose'&&r.stage&&!e.renditions?.[r.stage]){try{const rend=rendition(project,o.poseId,firstRoom.get(r.stage),described);if(rend){const st=await L.storeData(JSON.stringify(rend));e.renditions={...(e.renditions||{}),[r.stage]:{hash:st.hash,context:rend.context}};}}catch(_){/* rendition stays default */}}
      await L.putRecords([['entries',e]]);recorded++;
    }
  }
  return {areas:results,recorded};
}

// ---------- using a library sprite in the working project ----------
let guardOff=0;
async function usePose(id,{mode='reference',stage=null,x=null,y=null}={}){
  if(!['reference','copy'].includes(mode))fail('mode must be reference or copy');
  const e=await L.entry(id);if(e.kind!=='pose')fail('only sprite poses can be used this way so far');
  const ref=(stage&&e.renditions?.[stage])||e.rendition;if(!ref)fail('this sprite has no stored rendition; register its ROM catalog again');
  const rend=JSON.parse(new TextDecoder().decode(await L.blobBytes(ref.hash)));
  const store=services.ProjectStore,expected={epoch:store.state.epoch,snapshot:store.serialize()};
  guardOff++;
  try{
    return store.applyLibraryUse(candidate=>{
      const scenes=candidate.scenes,scene=scenes[candidate.activeScene];if(!scene)fail('open a scene first');
      const tall=rend.spriteMode===16,mine=(candidate.metasprites||[]).filter(m=>m.sceneId===scene.id);
      // sprite tiles this scene already uses: its placements and its metasprites
      const used=new Set();
      for(const o of scene.oam||[])if(o.active!==false){used.add(o.tile);if(o.height===16)used.add(Number.isInteger(o.tile2)?o.tile2:o.tile+1);}
      for(const m of mine)for(const p of m.pieces){used.add(p.tile);if(Number.isInteger(p.tile2))used.add(p.tile2);}
      const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),tileMap=new Map(),added=[],reused=[];
      const freeSlot=()=>{for(let t=tall?254:255;t>=0;t-=tall?2:1)if(!used.has(t)&&(!tall||!used.has(t+1))){used.add(t);if(tall)used.add(t+1);return t;}
        fail('no free sprite tiles left in "'+scene.name+'": this sprite needs '+(tall?'tile pairs':'tiles')+' for '+rend.pieces.length+' pieces. Free some sprite tiles or use another scene.');};
      const place=(src,dest)=>{scene.sprChr[dest]=cp(rend.tiles[src]);tileMap.set(src,dest);added.push(dest);};
      for(const p of rend.pieces){
        if(tileMap.has(p.tile))continue;
        // a reference may share an identical tile already in the scene; a copy always gets its own pixels
        const existing=mode==='reference'?[...used].find(t=>same(scene.sprChr[t],rend.tiles[p.tile])&&(!tall||same(scene.sprChr[t+1],rend.tiles[p.tile2]))):undefined;
        if(existing!==undefined){tileMap.set(p.tile,existing);if(tall)tileMap.set(p.tile2,existing+1);reused.push(existing);continue;}
        const slot=freeSlot();place(p.tile,slot);if(tall)place(p.tile2,slot+1);
      }
      // palette rows: an identical row, else a row no sprite in this scene uses; never recolour other sprites silently
      const usedRows=new Set();for(const o of scene.oam||[])if(o.active!==false)usedRows.add(o.attr&3);for(const m of mine)for(const p of m.pieces)usedRows.add(p.pal&3);
      const palMap=new Map(),palettes=[];
      for(const pi of [...new Set(rend.pieces.map(p=>p.pal&3))]){
        const want=rend.palette[pi],match=scene.sprPal.findIndex(row=>row[1]===want[1]&&row[2]===want[2]&&row[3]===want[3]);
        if(match>=0){palMap.set(pi,match);palettes.push({row:match,reused:true});continue;}
        const free=[0,1,2,3].find(r=>!usedRows.has(r)&&![...palMap.values()].includes(r));
        if(free===undefined)fail('palette conflict in "'+scene.name+'": this sprite needs the colours '+want.slice(1).map(c=>'$'+c.toString(16).padStart(2,'0')).join(' ')+
          ', and all four sprite palettes are used by other sprites here. Free a sprite palette or use another scene; nothing was changed.');
        scene.sprPal[free]=[scene.sprPal[free][0],want[1],want[2],want[3]];usedRows.add(free);palMap.set(pi,free);palettes.push({row:free,reused:false,colours:want.slice(1)});
      }
      const ids=new Set(candidate.metasprites.map(m=>m.id));let n=1;while(ids.has('lib_'+n))n++;
      const frame={id:'lib_'+n,name:(rend.name||'Library sprite')+(mode==='copy'?' (copy)':''),sceneId:scene.id,spriteMode:rend.spriteMode,originX:rend.originX||0,originY:rend.originY||0,
        pieces:rend.pieces.map((p,i)=>({id:'piece-'+i,tile:tileMap.get(p.tile),tile2:tall?tileMap.get(p.tile2):undefined,x:p.x,y:p.y,pal:palMap.get(p.pal&3),flipH:p.flipH,flipV:p.flipV,behind:p.behind})),
        library:{mode,entryId:e.id,contentHash:e.contentHash,renditionHash:ref.hash,sourceSha256:e.sourceSha256,poseId:rend.poseId,stage:stage||ref.context?.stage||null,context:ref.context,at:Date.now(),
          ...(mode==='copy'?{derivedFrom:{entryId:e.id,contentHash:e.contentHash,sourceSha256:e.sourceSha256}}:{})}};
      candidate.metasprites.push(frame);
      // place it in the scene so it is visible at once: the given spot, else the first spot near the middle of the
      // screen where it overlaps no sprite already placed
      const toOAM=window.Forge163?.metasprites?.toOAM;if(!toOAM)fail('the metasprite editor is not loaded');
      const boxes=(scene.oam||[]).filter(o=>o.active!==false).map(o=>[o.x,o.y,8,o.height===16?16:8]);
      const clear=(ax,ay)=>toOAM(frame,ax,ay).every(s=>s.x>=0&&s.x<=248&&s.y>=8&&s.y<=224-(s.height||8)&&!boxes.some(([bx,by,bw,bh])=>s.x<bx+bw&&bx<s.x+8&&s.y<by+bh&&by<s.y+(s.height||8)));
      let ax=x,ay=y;
      if(ax==null||ay==null){
        spot:for(const cy of [104,72,136,40,168])for(const cx of [112,80,144,48,176,16,208]){if(clear(cx,cy)){ax=cx;ay=cy;break spot;}}
        if(ax==null){ax=112;ay=104;}
      }
      const oam=toOAM(frame,ax,ay);
      const room=64-(scene.oam||[]).filter(o=>o.active!==false).length;
      if(oam.length>room)fail('"'+scene.name+'" has room for '+room+' more hardware sprites; this sprite needs '+oam.length+'.');
      scene.oam=[...(scene.oam||[]).filter(o=>o.active!==false),...oam];
      return {scenes,metasprites:candidate.metasprites,result:{metaspriteId:frame.id,mode,sceneId:scene.id,placed:{x:ax,y:ay,sprites:oam.length,box:{x:Math.min(...oam.map(s=>s.x)),y:Math.min(...oam.map(s=>s.y)),w:Math.max(...oam.map(s=>s.x+8))-Math.min(...oam.map(s=>s.x)),h:Math.max(...oam.map(s=>s.y+(s.height||8)))-Math.min(...oam.map(s=>s.y))}},
        dependencies:{tilesAdded:added.length,tilesShared:reused.length,palettes},library:frame.library}};
    },{expected,intent:'libraryUse'});
  }finally{guardOff--;}
}

// ---------- shared-reference guard ----------
// Editing a sprite that references a library entry first asks to make it an independent copy. Declining reverts the
// edit through the normal Undo, so the shared reference never changes silently.
if(typeof snapshot==='function'){
  const original=snapshot;
  const guarded=function(){
    const result=original.apply(this,arguments);
    if(guardOff||typeof S==='undefined')return result;
    let frames=[];
    try{
      const composer=window.Forge163?.metasprites,current=composer?.current;
      if(S.tab==='metasprites'&&current?.library?.mode==='reference')frames=[current];
      else if(S.tab==='chr'&&S.chrBank==='spr'){const sc=S.scenes[S.activeScene];frames=(S.metasprites||[]).filter(m=>m.sceneId===sc?.id&&m.library?.mode==='reference'&&m.pieces.some(p=>p.tile===S.editTile||p.tile2===S.editTile));}
    }catch(_){frames=[];}
    if(!frames.length)return result;
    const names=frames.map(f=>'"'+f.name+'"').join(', ');
    const ok=confirm(names+(frames.length>1?' are shared references':' is a shared reference')+' to a library sprite. Editing makes '+(frames.length>1?'them independent copies':'it an independent copy')+
      ' in this project; the library resource and any other references stay unchanged. Continue?');
    if(ok){for(const f of frames)f.library={...f.library,mode:'copy',derivedFrom:{entryId:f.library.entryId,contentHash:f.library.contentHash,sourceSha256:f.library.sourceSha256},convertedAt:Date.now()};}
    else setTimeout(()=>{try{undo();showToast?.('The shared library reference was left unchanged.');}catch(_){/* nothing to revert */}},0);
    return result;
  };
  try{snapshot=guarded;}catch(_){/* read-only binding: references stay protected by their library marker only */}
}

services.LibraryCatalog=Object.freeze({registerCatalog,surveyStages,usePose,rendition});
if(C?.register){
  C.register({name:'library.registerCatalog',group:'library',title:'Register the open ROM\'s recovered catalog',summary:'Every recovered record of the imported ROM becomes a library entry with its decoded location; poses get renditions.',run:()=>registerCatalog()});
  C.register({name:'library.surveyStages',group:'library',title:'Observe which sprites appear in each stage (runtime)',summary:'Ninja Gaiden (US): plays each area from its start and records enemy poses seen on screen as verified runtime placements.',
    args:{areas:{type:'string'},frames:{type:'int',default:1500,min:60,max:20000}},
    run:a=>surveyStages({areas:a.areas?String(a.areas).split(',').map(v=>Number(v.trim())).filter(Number.isInteger):undefined,frames:a.frames})});
  C.register({name:'library.rendition',group:'library',title:'A library sprite\'s stored rendition',summary:'Pieces, the tiles they use and the palette of the room it was drawn in; per stage when observed there.',
    args:{id:{type:'string',required:true},stage:{type:'string'}},
    run:async a=>{const e=await L.entry(a.id),ref=(a.stage&&e.renditions?.[a.stage])||e.rendition;if(!ref)fail('this entry has no rendition');
      return {id:e.id,stage:a.stage&&e.renditions?.[a.stage]?a.stage:ref.context?.stage||null,rendition:JSON.parse(new TextDecoder().decode(await L.blobBytes(ref.hash)))};}});
  C.register({name:'library.usePose',group:'library',title:'Use a library sprite in the active scene',summary:'mode "reference" (default) links it to the library entry; "copy" makes an independent asset. One undoable edit.',mutates:false,
    args:{id:{type:'string',required:true},mode:{type:'string',default:'reference',enum:['reference','copy']},stage:{type:'string'},x:{type:'int'},y:{type:'int'}},run:a=>usePose(a.id,a)});
}
})();
