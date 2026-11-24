/*
 * NES FORGE MODULE: src/services/pose-links.js
 * Entry: Forge.services.PoseLinks, command library.framePoses
 * Purpose: link the sprites a captured frame drew to the decoded poses the library holds for the same ROM, so a frame
 *   points straight to the reusable pose. ROM-agnostic: any ROM whose catalog has pose records (pieces with tile,
 *   relative x/y and attributes) is matched the same way. Read-only: nothing in the library or the project changes.
 *
 *   A link is "established" only when every piece of a pose is drawn (its tile, its position relative to the other
 *   pieces, its flips; mirrored as a whole when the pose has no decoded facing) AND each drawn sprite's graphics (the
 *   cartridge's CHR bytes at the location the sprite was drawn from) equal the library's drawing of that piece.
 *   The same layout and tile numbers with other graphics is a "candidate" (for example the same layout in another
 *   room's sprite bank). Where the graphics cannot be compared (CHR RAM, no drawing in the library) a full layout match
 *   is "layout only". Everything else stays not established. A smaller pose whose pieces all lie inside a larger
 *   matched pose is not reported; several poses with the very same drawn sprites are reported as ambiguous.
 *   Frames recorded before sprites were traced (their sprite list is OAM at the snapshot, usually one frame ahead of
 *   the image) are not linked.
 *   A pose record may carry several layouts (record.layouts: the same record drawn in each sprite mode the game uses,
 *   Punch-Out!!); each is matched only against sprites of its height, with its own drawing, and a link names the mode.
 *   Pieces the library cannot draw (record drawing marks them drawn: false) are matched by layout and not compared. A
 *   pose whose drawing the library has not established (an unconfirmed room, or a record that does not select its own
 *   CHR bank) is established by a complete layout of 3 or more pieces; the frame shows the bank. A layout of 1-2 pieces
 *   with nothing to compare is not reported.
 *   A frame can also be drawn as the game's pose routine left it: a full pose changed by delta poses (Punch-Out!!). Where
 *   the frame carries what the routine applied (recorded while the game ran, replayed when the frame was captured:
 *   record.poseRoutine.drawing), and every piece of that result is drawn in place, the frame links that full pose, the
 *   link naming the deltas (by "pose routine"). Such a link does not give the pose an observed drawing: the result is
 *   not the pose's own drawing.
 * Bundle order: after src/services/frame-evidence.js.
 */
(()=>{
'use strict';
const F=window.Forge,services=F.services,C=F.commands;
const fail=message=>{throw Error('Pose links: '+message);};
const flipH=a=>!!(a&64),flipV=a=>!!(a&128);
// a pose with this many pieces, all drawn in place, is specific enough to establish by its layout alone (used only when
// the library's drawing of the pose cannot serve as the graphics reference)
const MIN_PIECES_BY_LAYOUT=3;
const pixels=(bytes,at)=>Array.from({length:8},(_,y)=>Array.from({length:8},(_,x)=>((bytes[at+y]>>(7-x))&1)|(((bytes[at+8+y]>>(7-x))&1)<<1)));
const same=(a,b)=>!!a&&!!b&&a.length===b.length&&a.every((row,y)=>row.length===b[y]?.length&&row.every((v,x)=>v===b[y][x]));

// ---------- the library's poses for a ROM (cached until the library's pose entries change) ----------
const poseCache=new Map(),chrCache=new Map();
async function posesOf(sha){
  const L=services.ResourceLibrary,items=[];
  for(let offset=0;;offset+=1000){const page=await L.list({shelf:sha,kind:'pose',offset,limit:1000});items.push(...page.items);if(offset+1000>=page.total)break;}
  const key=items.map(i=>i.id).sort().join('|');const hit=poseCache.get(sha);if(hit&&hit.key===key)return hit.poses;
  const poses=[];
  for(const item of items){
    try{
      const {entry,bytes}=await L.readEntry(item.id),record=JSON.parse(new TextDecoder().decode(bytes));
      if(!(Array.isArray(record.layouts)&&record.layouts.length)&&(!Array.isArray(record.pieces)||!record.pieces.length||!record.pieces.every(p=>Number.isInteger(p.tile)&&Number.isInteger(p.x)&&Number.isInteger(p.y))))continue;
      let drawing=null;
      if(entry.rendition?.hash){try{drawing=JSON.parse(new TextDecoder().decode(await L.blobBytes(entry.rendition.hash)));}catch(_){drawing=null;}}
      // a piece whose attribute byte the game leaves as the previous pose wrote it has no flips of its own: any match
      const piecesOf=list=>list.map(p=>({tile:p.tile,x:p.x,y:p.y,attributes:p.inheritsAttributes?null:p.attributes|0}));
      if(Array.isArray(record.layouts)&&record.layouts.length){
        for(const l of record.layouts){
          if(!Array.isArray(l.pieces)||!l.pieces.length||!l.pieces.every(p=>Number.isInteger(p.tile)&&Number.isInteger(p.x)&&Number.isInteger(p.y)))continue;
          const ref=entry.layoutRenditions?.[l.key];let d=null;
          if(ref?.hash){try{d=JSON.parse(new TextDecoder().decode(await L.blobBytes(ref.hash)));}catch(_){d=null;}}
          poses.push({entryId:entry.id,id:record.id??null,label:entry.label||record.label||entry.id,owner:record.owner??null,facing:record.facing??null,pieces:piecesOf(l.pieces),
            height:l.height,mode:{key:l.key,label:l.label},drawing:d,context:ref?.context||entry.rendition?.context||null,mirror:record.mirror!==false,flipToggle:!!record.flipToggle});
        }
        continue;
      }
      poses.push({entryId:entry.id,id:record.id??null,label:entry.label||record.label||entry.id,owner:record.owner??null,facing:record.facing??null,pieces:piecesOf(record.pieces),drawing,context:entry.rendition?.context||null,
        mirror:record.mirror!==false,flipToggle:!!record.flipToggle});
    }catch(_){/* not a pose record this matcher reads */}
  }
  poseCache.set(sha,{key,poses});return poses;
}
// the cartridge's CHR as the library holds it (4 KiB bank entries of the recovered catalog)
async function chrBank(sha,bank){
  const id='rom:'+sha.slice(0,16)+':chr:chr:'+bank;if(chrCache.has(id))return chrCache.get(id);
  let bytes=null;try{bytes=(await services.ResourceLibrary.readEntry(id)).bytes;}catch(_){bytes=null;}
  chrCache.set(id,bytes);return bytes;
}

// ---------- layout ----------
// every placement of a pose among the drawn sprites: piece 0 anchors it, every other piece must be drawn at its
// offset from piece 0 with its tile and flips (all offsets and horizontal flips reversed when mirrored)
function layoutMatches(sprites,poses){
  const at=new Map(),any=new Map(),keyOf=(tile,x,y,h,v)=>tile+':'+x+':'+y+':'+(h?1:0)+(v?1:0),anyKey=(tile,x,y)=>tile+':'+x+':'+y;
  for(const s of sprites){const k=keyOf(s.tile,s.x,s.y,s.flipH,s.flipV);if(!at.has(k))at.set(k,[]);at.get(k).push(s);
    const a=anyKey(s.tile,s.x,s.y);if(!any.has(a))any.set(a,[]);any.get(a).push(s);}
  const out=[];
  for(const pose of poses){
    const p0=pose.pieces[0],fits=s=>!pose.height||s.height===pose.height;
    // mirror: the whole pose drawn the other way round (positions and flips), unless the pose has a decoded facing or
    // its game draws each facing from its own record; toggle: every piece's horizontal flip inverted, positions as they
    // are (a game that flips a whole pose after drawing it)
    for(const mirror of pose.facing!=null||pose.mirror===false?[false]:[false,true])for(const toggle of pose.flipToggle?[false,true]:[false]){
      const h=a=>flipH(a)!==(mirror!==toggle);
      for(const s of sprites){
        if(!fits(s)||s.tile!==p0.tile||p0.attributes!=null&&(s.flipH!==h(p0.attributes)||s.flipV!==flipV(p0.attributes)))continue;
        const used=[s];let ok=true;
        for(const pk of pose.pieces.slice(1)){
          const dx=(pk.x-p0.x)*(mirror?-1:1),dy=pk.y-p0.y,list=(pk.attributes==null?any.get(anyKey(pk.tile,s.x+dx,s.y+dy)):at.get(keyOf(pk.tile,s.x+dx,s.y+dy,h(pk.attributes),flipV(pk.attributes))))||[];
          const t=list.find(t=>!used.includes(t)&&fits(t));if(!t){ok=false;break;}used.push(t);
        }
        if(ok)out.push({pose,mirror,toggle,sprites:used});
      }
    }
  }
  // a pose whose sprites all lie inside a larger matched pose is part of it, not a pose of its own
  const kept=out.filter(m=>!out.some(o=>o!==m&&o.sprites.length>m.sprites.length&&m.sprites.every(s=>o.sprites.includes(s))));
  // the same drawn sprites matched by several poses (or by one pose both ways): one group, ambiguous unless one remains
  const groups=new Map();
  for(const m of kept){const k=m.sprites.map(s=>s.index).sort((a,b)=>a-b).join(',');if(!groups.has(k))groups.set(k,[]);
    // a symmetric pose matches its sprites both ways: one match per pose (the unmirrored one first)
    if(!groups.get(k).some(o=>o.pose.entryId===m.pose.entryId))groups.get(k).push(m);}
  return [...groups.values()];
}

// ---------- graphics ----------
// each drawn sprite's pattern (cartridge CHR at its draw-time location) against the library's drawing of that piece
async function compareGraphics(sha,m){
  const d=m.pose.drawing;
  if(!d?.pieces||d.pieces.length!==m.pose.pieces.length)return {graphics:'unchecked',why:'the library holds no drawing of this pose'};
  const banks=new Set();let skipped=0;
  for(const s of m.sprites)if(Number.isInteger(s.chrOffset)&&s.chrOffsetAt==='fetch')banks.add(s.chrOffset>>12);
  for(const [k,s] of m.sprites.entries()){
    if(!Number.isInteger(s.chrOffset)||s.chrOffsetAt!=='fetch')return {graphics:'unchecked',why:s.chrOffsetAt==='chr-ram'?'patterns in CHR RAM (no cartridge location)':'a sprite has no traced location'};
    const rp=d.pieces[k];
    // a piece the library cannot draw (its pattern bank is set elsewhere) is matched by layout only
    if(rp.drawn===false){skipped++;continue;}
    const offsets=s.height===16?[[s.chrOffset,rp.tile],[s.chrOffset+16,rp.tile2]]:[[s.chrOffset,rp.tile]];
    for(const [off,tile] of offsets){
      const bank=off>>12,bytes=await chrBank(sha,bank);banks.add(bank);
      if(!bytes)return {graphics:'unchecked',why:'CHR bank '+bank+' is not in the library'};
      if(!same(pixels(bytes,off&4095),d.tiles?.[tile]))return {graphics:'differ',banks:[...banks],why:'drawn from CHR bank '+bank+'; the library draws this pose '+(m.pose.context?.label?'in '+m.pose.context.label:'with other graphics')};
    }
  }
  if(skipped===m.sprites.length)return {graphics:'unchecked',noDrawing:true,banks:[...banks],why:'the library cannot draw any of its pieces'};
  return {graphics:'equal',banks:[...banks],...(skipped?{notCompared:skipped}:{})};
}

// ---------- a frame ----------
async function framePoses(record,{sourceSha256}={}){
  if(record?.format!=='NESForgeFrameEvidence')fail('give a frame evidence record');
  const sha=sourceSha256||record.rom?.sha256;if(!/^[0-9a-f]{64}$/.test(sha||''))fail('the frame names no ROM');
  const sprites=(record.sprites||[]).filter(s=>s.visible);
  const base={frame:record.frame,label:record.label||null,sourceSha256:sha,sprites:sprites.length};
  if(!/as drawn/.test(record.spritesFrom||''))return {...base,state:'not traced',note:'This record lists OAM at the snapshot (recorded before frames traced their sprites); it is usually one frame ahead of the image, so no links are made. Investigate the ROM again to link its sprites.',links:[],candidates:[],ambiguous:[],notEstablished:sprites.map(s=>s.index)};
  const poses=await posesOf(sha);
  if(!poses.length)return {...base,state:'no poses',note:'The library holds no decoded poses for this ROM, so its sprites cannot be linked.',links:[],candidates:[],ambiguous:[],notEstablished:sprites.map(s=>s.index)};
  const groups=layoutMatches(sprites,poses),links=[],candidates=[],ambiguous=[],linked=new Set();
  for(const group of groups){
    const checked=[];for(const m of group)checked.push({m,...await compareGraphics(sha,m)});
    const equal=checked.filter(c=>c.graphics==='equal'),pick=equal.length?equal:checked.filter(c=>c.graphics==='unchecked').length?checked.filter(c=>c.graphics==='unchecked'):checked;
    const describe=c=>({poseEntry:c.m.pose.entryId,poseId:c.m.pose.id,label:c.m.pose.label,owner:c.m.pose.owner,mirrored:c.m.mirror,sprites:c.m.sprites.map(s=>s.index),pieces:c.m.pose.pieces.length,
      at:{x:c.m.sprites[0].x-(c.m.mirror?-c.m.pose.pieces[0].x-8:c.m.pose.pieces[0].x),y:c.m.sprites[0].y-c.m.pose.pieces[0].y},
      ...(c.m.pose.mode?{mode:c.m.pose.mode}:{}),...(c.m.toggle?{flipsToggled:true}:{}),
      graphics:c.graphics,banks:c.banks||[],evidence:(c.graphics==='equal'?'every piece drawn in place (tile, relative position, flips'+(c.m.mirror?', mirrored':'')+') with the graphics of the library\'s drawing'+(c.notCompared?' ('+c.notCompared+' pieces with no drawing in the library matched by layout only)':''):c.graphics==='differ'?'same layout and tile numbers; '+c.why:'layout matches; graphics not compared: '+c.why)+
        (c.m.pose.mode?'; drawn as '+c.m.pose.mode.label:'')+(c.m.toggle?'; flipped horizontally by the game after its pose routine (every piece\'s flip inverted)':'')});
    if(pick.length>1){ambiguous.push({sprites:group[0].sprites.map(s=>s.index),poses:pick.map(describe)});continue;}
    const one=describe(pick[0]),drawingUnconfirmed=pick[0].m.pose.context?.confirmed===false||pick[0].m.pose.context?.basis==='default';
    if(one.graphics==='equal'){links.push({...one,state:'established',by:'layout and graphics'});one.sprites.forEach(i=>linked.add(i));}
    else if((one.graphics==='differ'||pick[0].noDrawing)&&drawingUnconfirmed&&one.pieces>=MIN_PIECES_BY_LAYOUT){
      // the library has not established which graphics this pose is drawn with (Ninja Gaiden: the room; Punch-Out!!: a
      // record that does not select its CHR bank), so other graphics are no evidence against it: a complete layout of
      // several pieces establishes the pose, and this frame shows the bank it is drawn from
      const why=pick[0].noDrawing?'The pose\'s record does not select its CHR bank, so the library cannot draw it':'The library has not established the room this pose is drawn in, so its drawing is not compared';
      links.push({...one,state:'established',by:'layout',evidence:'every piece drawn in place (tile, relative position, flips'+(one.mirrored?', mirrored':'')+')'+(one.mode?' as '+one.mode.label:'')+'; drawn from CHR bank '+one.banks.join(', ')+'. '+why+'; this frame shows the bank.'});
      one.sprites.forEach(i=>linked.add(i));}
    // a layout of one or two pieces with nothing to compare says nothing: it is not reported
    else if(one.graphics==='unchecked'&&one.pieces<MIN_PIECES_BY_LAYOUT)continue;
    else candidates.push({...one,state:one.graphics==='differ'?'candidate':'layout only'});
  }
  const routine=routineLink(record.poseRoutine?.drawing,sprites,poses);
  if(routine&&!links.some(l=>l.sprites.length===routine.sprites.length&&l.sprites.every(i=>routine.sprites.includes(i)))){
    // the result is one drawing: poses matched inside it are part of it (a smaller pose inside a larger match is not
    // reported); a full pose drawn with exactly these sprites already accounts for them
    const inside=list=>list.filter(x=>!x.sprites.every(i=>routine.sprites.includes(i)));
    for(const l of links)if(l.sprites.every(i=>routine.sprites.includes(i)))l.sprites.forEach(i=>linked.delete(i));
    links.splice(0,links.length,...inside(links));candidates.splice(0,candidates.length,...inside(candidates));ambiguous.splice(0,ambiguous.length,...inside(ambiguous));
    links.push(routine);routine.sprites.forEach(i=>linked.add(i));
  }
  return {...base,state:'linked',poses:poses.length,links,candidates,ambiguous,notEstablished:sprites.map(s=>s.index).filter(i=>!linked.has(i)),
    note:links.length?links.length+' pose'+(links.length===1?'':'s')+' established':'no pose established'};
}
// the link for a frame drawn as the game's pose routine left it (a full pose, then deltas), when the library holds that
// full pose and every piece of the replayed result is drawn in place (tile and screen position; checked here again)
function routineLink(d,sprites,poses){
  if(d?.state!=='drawn'||!Array.isArray(d.deltas)||!d.deltas.length||!Array.isArray(d.pieces)||d.pieces.length<MIN_PIECES_BY_LAYOUT)return null;
  const used=new Set(),idx=d.pieces.map(q=>{const s=sprites.find(t=>!used.has(t.index)&&t.x===q.x&&t.y===q.y-1&&t.tile===q.tile);if(s)used.add(s.index);return s?s.index:null;});
  if(idx.some(i=>i===null))return null;
  const base=poses.find(p=>p.id===d.base?.poseId&&p.mode?.key===d.modeKey)||poses.find(p=>p.id===d.base?.poseId);if(!base)return null;
  const n=d.deltas.length,list=d.deltas.map(v=>'$'+v.toString(16).toUpperCase().padStart(2,'0')).join(', ');
  const banks=[...new Set(idx.map(i=>sprites.find(s=>s.index===i)?.chrOffset).filter(Number.isInteger).map(o=>o>>12))].sort((a,b)=>a-b);
  return {poseEntry:base.entryId,poseId:base.id,label:base.label,owner:base.owner,mirrored:false,sprites:idx,pieces:idx.length,at:d.at||null,...(base.mode?{mode:base.mode}:{}),
    deltas:d.deltas.slice(),graphics:'not compared',banks,state:'established',by:'pose routine',
    evidence:'drawn as the game\'s pose routine left it: this pose, then '+n+' delta pose'+(n>1?'s':'')+' ('+list+') applied by the game before the frame, recorded while it ran and replayed with the game\'s routine when the frame was captured; every piece of the result is drawn in place (tile and screen position)'+(base.mode?'; drawn as '+base.mode.label:'')+'. The result is not the pose\'s own drawing.'};
}
async function frameEntryPoses(id){
  const L=services.ResourceLibrary,{entry,bytes}=await L.readEntry(id);
  if(entry.kind!=='frame')fail(id+' is not a frame entry');
  return {entry:entry.id,...await framePoses(JSON.parse(new TextDecoder().decode(bytes)),{sourceSha256:entry.sourceSha256})};
}

// the other way round: the captured frames of the same ROM in which a pose is established (each frame's links are
// computed once per frame entry and pose set)
const frameCache=new Map();
async function poseFrames(poseEntryId){
  const L=services.ResourceLibrary,pose=await L.entry(poseEntryId);
  if(pose.kind!=='pose')fail(poseEntryId+' is not a pose entry');
  const sha=pose.sourceSha256,frames=[];for(let offset=0;;offset+=1000){const page=await L.list({shelf:sha,kind:'frame',offset,limit:1000});frames.push(...page.items);if(offset+1000>=page.total)break;}
  const poseKey=(poseCache.get(sha)?.key||'')+'#'+(await posesOf(sha)).length,out=[];
  for(const f of frames){
    const ck=f.id+'|'+poseKey;let r=frameCache.get(ck);
    if(!r){try{r=await frameEntryPoses(f.id);}catch(_){r=null;}frameCache.set(ck,r);}
    const link=r?.links?.find(l=>l.poseEntry===poseEntryId);
    if(link)out.push({frameEntry:f.id,label:f.label||f.id,frame:r.frame,by:link.by,mirrored:link.mirrored,sprites:link.sprites,...(link.mode?{mode:link.mode.label}:{}),...(link.deltas?{deltas:link.deltas}:{})});
  }
  return {pose:poseEntryId,frames:out,framesChecked:frames.length};
}
// ---------- what the frames showed, recorded on the poses ----------
// A pose whose library drawing comes in sprite-mode layouts (Punch-Out!!) records each captured frame that establishes
// it (entry.observed). Where its default drawing is incomplete (pieces the library cannot draw), unconfirmed (no CHR
// bank of its own), guesses palette and flips (inherited attribute bytes) or is in another sprite mode than the game
// drew, the first frame that establishes it gives it a drawing as observed: each piece's pattern read from the
// cartridge at the location its sprite was drawn from (row by row where a sprite's rows came from several banks), the
// frame's sprite palette and the flips as drawn. That becomes the entry's drawing (basis "runtime"); the decoded one
// is kept (entry.decodedRendition). Ninja Gaiden's and Zelda II's drawings depend on the room and stage, which the
// stage survey records; frames do not change them here.
async function drawnRows(sha,s){
  const h=s.height===16?16:8,rows=[];
  for(let py=0;py<h;py++){
    const r=s.flipV?h-1-py:py,g=(s.rowsFrom||[]).find(g=>r>=g.firstRow&&r<=g.lastRow),base=g?g.chrOffset:s.chrOffset+(py>>3)*16;
    const bytes=await chrBank(sha,base>>12);if(!bytes)return null;const at=(base&4095)+(py&7);
    rows.push(Array.from({length:8},(_,x)=>((bytes[at]>>(7-x))&1)|(((bytes[at+8]>>(7-x))&1)<<1)));
  }
  return rows;
}
async function observedDrawing(sha,record,link,entry,frameLabel){
  const byIndex=new Map((record.sprites||[]).filter(s=>s.visible).map(s=>[s.index,s])),tall=link.sprites.length&&byIndex.get(link.sprites[0])?.height===16;
  const tiles={},keys=new Map(),pieces=[],banks=new Set();let next=0;
  for(const i of link.sprites){
    const s=byIndex.get(i);if(!s||!Number.isInteger(s.chrOffset)||s.chrOffsetAt!=='fetch')return null;
    const rows=await drawnRows(sha,s);if(!rows)return null;
    for(const g of s.rowsFrom||[{chrOffset:s.chrOffset}])banks.add(g.chrOffset>>12);
    // identical patterns share a tile (8x16: identical pairs share a pair)
    const sig=JSON.stringify(rows);let k=keys.get(sig);
    if(k===undefined){k=next;next+=tall?2:1;keys.set(sig,k);tiles[k]=rows.slice(0,8);if(tall)tiles[k+1]=rows.slice(8,16);}
    pieces.push({tile:k,...(tall?{tile2:k+1}:{}),x:s.x-link.at.x,y:s.y-link.at.y,pal:s.palette,flipH:s.flipH,flipV:s.flipV,behind:s.behind});
  }
  const pal=(record.palette||[]).map(v=>v&63),palette=[0,1,2,3].map(r=>[16,17,18,19].map(k=>pal[k+r*4]??15));
  const prior=entry.rendition?.context||{},mode=link.mode;
  return {format:'NESForgeLibraryPose',version:1,poseId:link.poseId,name:entry.label||link.label,spriteMode:tall?16:8,originX:0,originY:0,pieces,tiles,palette,
    context:{roomId:null,label:prior.label||null,stage:null,basis:'runtime',confirmed:true,mode:mode?.key||null,chrBanks:[...banks].sort((a,b)=>a-b),
      observedIn:{frameEntry:link.frameEntry,frame:record.frame,label:frameLabel},
      note:'seen on screen in '+frameLabel+(mode?' as '+mode.label:'')+': each piece\'s pattern from the cartridge at the location its sprite was drawn from (CHR bank '+[...banks].sort((a,b)=>a-b).join(', ')+
        '), the frame\'s sprite palette and the flips as drawn; the decoded drawing is kept'}};
}
function needsObservedDrawing(entry,link){
  const c=entry.rendition?.context;
  return !c||c.confirmed===false||(c.undrawn||0)>0||(c.inherited||0)>0||!!(link.mode&&c.mode&&c.mode!==link.mode.key)||!!link.flipsToggled;
}
// frames already gone through against the current set of poses (per ROM, this session): a frame registered later does
// not make every earlier frame be read again
const observing=new Map(),observeTimers=new Map(),observedFrames=new Map();
async function recordObservations(sha){
  if(!/^[0-9a-f]{64}$/.test(sha||''))fail('recordObservations needs a ROM SHA-256');
  while(observing.has(sha))await observing.get(sha).catch(()=>{});
  const job=(async()=>{
    const L=services.ResourceLibrary,frames=[];
    // only poses drawn in sprite-mode layouts record frames: a ROM without them has nothing to do
    const poses=await posesOf(sha),key=poseCache.get(sha)?.key||'';
    if(!poses.some(p=>p.mode))return {sourceSha256:sha,skipped:'no poses with sprite-mode layouts',frames:0,links:0,poses:0,observations:0,alreadyRecorded:0,drawingsUpdated:0,updated:[]};
    let done=observedFrames.get(sha);if(!done||done.key!==key){done={key,ids:new Set()};observedFrames.set(sha,done);}
    for(let offset=0;;offset+=1000){const page=await L.list({shelf:sha,kind:'frame',offset,limit:1000});frames.push(...page.items);if(offset+1000>=page.total)break;}
    const stats={sourceSha256:sha,frames:frames.length,framesSkipped:0,links:0,poses:new Set(),observations:0,alreadyRecorded:0,drawingsUpdated:0,notLayoutPoses:0,updated:[]};
    for(const f of frames){
      if(done.ids.has(f.id)){stats.framesSkipped++;continue;}
      let r;try{r=await frameEntryPoses(f.id);}catch(_){continue;}
      let record=null;
      for(const l of r.links){
        stats.links++;
        // a full pose changed by deltas: the frame does not show the pose's own drawing
        if(l.by==='pose routine'){stats.routineLinks=(stats.routineLinks||0)+1;continue;}
        const e=await L.entry(l.poseEntry).catch(()=>null);if(!e)continue;
        if(!e.layoutRenditions){stats.notLayoutPoses++;continue;}
        stats.poses.add(e.id);
        const seen=e.observed?.frames||[];if(seen.some(o=>o.frameEntry===f.id)){stats.alreadyRecorded++;continue;}
        const label=f.label||f.id,obs={frameEntry:f.id,frame:r.frame,label,mode:l.mode?.key||null,by:l.by,banks:l.banks||[],sprites:l.sprites.length};
        e.observed={frames:[...seen,obs].slice(-200),count:seen.length+1,updated:Date.now()};stats.observations++;
        if(!e.observedRendition&&needsObservedDrawing(e,l)){
          record??=JSON.parse(new TextDecoder().decode((await L.readEntry(f.id)).bytes));
          const d=await observedDrawing(sha,record,{...l,frameEntry:f.id},e,label);
          if(d){const st=await L.storeData(JSON.stringify(d));e.observedRendition={hash:st.hash,context:d.context};if(!e.decodedRendition&&e.rendition)e.decodedRendition=e.rendition;e.rendition=e.observedRendition;
            stats.drawingsUpdated++;stats.updated.push({pose:e.id,label:e.label,mode:d.context.mode,banks:d.context.chrBanks,frame:label});}
        }
        await L.putRecords([['entries',e]]);
      }
      done.ids.add(f.id);
    }
    return {...stats,poses:stats.poses.size};
  })();
  observing.set(sha,job);
  try{return await job;}finally{if(observing.get(sha)===job)observing.delete(sha);}
}
// after frames or a catalog are registered (FrameEvidence.registerFrame, LibraryCatalog.registerCatalog)
function scheduleObservations(sha){
  if(!/^[0-9a-f]{64}$/.test(sha||''))return;
  clearTimeout(observeTimers.get(sha));
  observeTimers.set(sha,setTimeout(()=>{observeTimers.delete(sha);void recordObservations(sha).then(r=>{if(r.drawingsUpdated||r.observations)try{window.dispatchEvent(new CustomEvent('forge:pose-observations',{detail:r}));}catch(_){}}).catch(()=>{});},400));
}
services.PoseLinks=Object.freeze({framePoses,frameEntryPoses,poseFrames,layoutMatches,posesOf,recordObservations,scheduleObservations});
if(C?.register){
  C.register({name:'library.framePoses',group:'library',title:'Link a frame\'s sprites to library poses',
    summary:'For a frame entry (id) or a frame evidence record (record): the decoded poses of the same ROM drawn in it. Established only when every piece is drawn in place and its graphics equal the library\'s drawing; same layout with other graphics is a candidate. Read-only.',
    args:{id:{type:'string'},record:{type:'object'}},run:a=>a.id?frameEntryPoses(a.id):framePoses(a.record)});
  C.register({name:'library.recordObservedPoses',group:'library',title:'Record on the poses what captured frames showed',
    summary:'For a ROM (sha256): each frame that establishes a pose with sprite-mode layouts (Punch-Out!!) is recorded on the pose; a pose whose drawing is incomplete, unconfirmed or in another mode gets a drawing as observed. Idempotent; runs on its own after frames or a catalog are registered.',
    args:{sha256:{type:'string',required:true}},run:a=>recordObservations(String(a.sha256))});
  C.register({name:'library.poseFrames',group:'library',title:'Captured frames that show a pose',
    summary:'For a pose entry (id): the captured frames of the same ROM in which this pose is established (by library.framePoses). Read-only.',
    args:{id:{type:'string',required:true}},run:a=>poseFrames(a.id)});
}
})();
