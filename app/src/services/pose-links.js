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
      if(!Array.isArray(record.pieces)||!record.pieces.length||!record.pieces.every(p=>Number.isInteger(p.tile)&&Number.isInteger(p.x)&&Number.isInteger(p.y)))continue;
      let drawing=null;
      if(entry.rendition?.hash){try{drawing=JSON.parse(new TextDecoder().decode(await L.blobBytes(entry.rendition.hash)));}catch(_){drawing=null;}}
      poses.push({entryId:entry.id,id:record.id??null,label:entry.label||record.label||entry.id,owner:record.owner??null,facing:record.facing??null,pieces:record.pieces.map(p=>({tile:p.tile,x:p.x,y:p.y,attributes:p.attributes|0})),drawing,context:entry.rendition?.context||null});
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
  const at=new Map(),keyOf=(tile,x,y,h,v)=>tile+':'+x+':'+y+':'+(h?1:0)+(v?1:0);
  for(const s of sprites){const k=keyOf(s.tile,s.x,s.y,s.flipH,s.flipV);if(!at.has(k))at.set(k,[]);at.get(k).push(s);}
  const out=[];
  for(const pose of poses){
    const p0=pose.pieces[0];
    for(const mirror of pose.facing!=null?[false]:[false,true]){
      for(const s of sprites){
        if(s.tile!==p0.tile||s.flipH!==(flipH(p0.attributes)!==mirror)||s.flipV!==flipV(p0.attributes))continue;
        const used=[s];let ok=true;
        for(const pk of pose.pieces.slice(1)){
          const dx=(pk.x-p0.x)*(mirror?-1:1),dy=pk.y-p0.y,list=at.get(keyOf(pk.tile,s.x+dx,s.y+dy,flipH(pk.attributes)!==mirror,flipV(pk.attributes)))||[];
          const t=list.find(t=>!used.includes(t));if(!t){ok=false;break;}used.push(t);
        }
        if(ok)out.push({pose,mirror,sprites:used});
      }
    }
  }
  // a pose whose sprites all lie inside a larger matched pose is part of it, not a pose of its own
  const kept=out.filter(m=>!out.some(o=>o!==m&&o.sprites.length>m.sprites.length&&m.sprites.every(s=>o.sprites.includes(s))));
  // the same drawn sprites matched by several poses (or by one pose both ways): one group, ambiguous unless one remains
  const groups=new Map();
  for(const m of kept){const k=m.sprites.map(s=>s.index).sort((a,b)=>a-b).join(',');if(!groups.has(k))groups.set(k,[]);
    // a symmetric pose matches its sprites both ways: one match per pose (the unmirrored one first)
    if(!groups.get(k).some(o=>o.pose===m.pose))groups.get(k).push(m);}
  return [...groups.values()];
}

// ---------- graphics ----------
// each drawn sprite's pattern (cartridge CHR at its draw-time location) against the library's drawing of that piece
async function compareGraphics(sha,m){
  const d=m.pose.drawing;
  if(!d?.pieces||d.pieces.length!==m.pose.pieces.length)return {graphics:'unchecked',why:'the library holds no drawing of this pose'};
  const banks=new Set();
  for(const [k,s] of m.sprites.entries()){
    if(!Number.isInteger(s.chrOffset)||s.chrOffsetAt!=='fetch')return {graphics:'unchecked',why:s.chrOffsetAt==='chr-ram'?'patterns in CHR RAM (no cartridge location)':'a sprite has no traced location'};
    const rp=d.pieces[k],offsets=s.height===16?[[s.chrOffset,rp.tile],[s.chrOffset+16,rp.tile2]]:[[s.chrOffset,rp.tile]];
    for(const [off,tile] of offsets){
      const bank=off>>12,bytes=await chrBank(sha,bank);banks.add(bank);
      if(!bytes)return {graphics:'unchecked',why:'CHR bank '+bank+' is not in the library'};
      if(!same(pixels(bytes,off&4095),d.tiles?.[tile]))return {graphics:'differ',banks:[...banks],why:'drawn from CHR bank '+bank+'; the library draws this pose '+(m.pose.context?.label?'in '+m.pose.context.label:'with other graphics')};
    }
  }
  return {graphics:'equal',banks:[...banks]};
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
      graphics:c.graphics,banks:c.banks||[],evidence:c.graphics==='equal'?'every piece drawn in place (tile, relative position, flips'+(c.m.mirror?', mirrored':'')+') with the graphics of the library\'s drawing':c.graphics==='differ'?'same layout and tile numbers; '+c.why:'layout matches; graphics not compared: '+c.why});
    if(pick.length>1){ambiguous.push({sprites:group[0].sprites.map(s=>s.index),poses:pick.map(describe)});continue;}
    const one=describe(pick[0]),drawingUnconfirmed=pick[0].m.pose.context?.confirmed===false||pick[0].m.pose.context?.basis==='default';
    if(one.graphics==='equal'){links.push({...one,state:'established',by:'layout and graphics'});one.sprites.forEach(i=>linked.add(i));}
    else if(one.graphics==='differ'&&drawingUnconfirmed&&one.pieces>=MIN_PIECES_BY_LAYOUT){
      // the library's own drawing of this pose uses a room it has not established, so other graphics are no evidence
      // against it: a complete layout of several pieces establishes the pose, and this frame shows the bank it is drawn from
      links.push({...one,state:'established',by:'layout',evidence:'every piece drawn in place (tile, relative position, flips'+(one.mirrored?', mirrored':'')+'); drawn from CHR bank '+one.banks.join(', ')+'. The library has not established the room this pose is drawn in, so its drawing is not compared; this frame shows the bank.'});
      one.sprites.forEach(i=>linked.add(i));}
    else candidates.push({...one,state:one.graphics==='differ'?'candidate':'layout only'});
  }
  return {...base,state:'linked',poses:poses.length,links,candidates,ambiguous,notEstablished:sprites.map(s=>s.index).filter(i=>!linked.has(i)),
    note:links.length?links.length+' pose'+(links.length===1?'':'s')+' established':'no pose established'};
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
    if(link)out.push({frameEntry:f.id,label:f.label||f.id,frame:r.frame,by:link.by,mirrored:link.mirrored,sprites:link.sprites});
  }
  return {pose:poseEntryId,frames:out,framesChecked:frames.length};
}
services.PoseLinks=Object.freeze({framePoses,frameEntryPoses,poseFrames,layoutMatches,posesOf});
if(C?.register){
  C.register({name:'library.framePoses',group:'library',title:'Link a frame\'s sprites to library poses',
    summary:'For a frame entry (id) or a frame evidence record (record): the decoded poses of the same ROM drawn in it. Established only when every piece is drawn in place and its graphics equal the library\'s drawing; same layout with other graphics is a candidate. Read-only.',
    args:{id:{type:'string'},record:{type:'object'}},run:a=>a.id?frameEntryPoses(a.id):framePoses(a.record)});
  C.register({name:'library.poseFrames',group:'library',title:'Captured frames that show a pose',
    summary:'For a pose entry (id): the captured frames of the same ROM in which this pose is established (by library.framePoses). Read-only.',
    args:{id:{type:'string',required:true}},run:a=>poseFrames(a.id)});
}
})();
