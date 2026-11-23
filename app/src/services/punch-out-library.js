/*
 * NES FORGE MODULE: src/services/punch-out-library.js
 * Entry: Forge.services.PunchOutLibrary (a recovered-catalog provider for LibraryCatalog)
 * Purpose: Mike Tyson's Punch-Out!! (US, PRG 0 and PRG 1) fighter poses as library entries, so captured frames link to
 *   them (Resources › Library: a frame's "Sprite → pose", a pose's "Seen in captured frames") and they can be used in
 *   a project like any library sprite.
 *   - One pose entry per full-pose record of each fight. Several selectors of a fight's pose table can name the same
 *     record; the entry lists them all.
 *   - Each record is drawn by running the game's own pose routine (PunchOutContent, $C890) in the three sprite modes
 *     the game uses: row height and tile step from RAM $80/$81 (8x16, step 2; 8x8, step 2; 8x8, step 1). The game
 *     selects the mode per pose: Mike Tyson's special poses are 8x8 in a fight configured for 8x16. A captured frame
 *     links the record in the mode it was drawn in. The fight's configured mode is the entry's default drawing.
 *   - A layout is kept only where every piece moves with the fighter's base position ($B0/$B1): screen coordinates are
 *     8-bit, so a pose drawn near an edge wraps, and some tall poses pin their top rows. Each layout is drawn from the
 *     base where the most pieces move together (searched over a grid), and is stored relative to that base.
 *   - Drawings: each piece's pattern from the CHR bank the pose's tile stream selects ($A9), pattern table $0000, with
 *     the fight's sprite palette. An 8x16 piece whose tile is in the upper pattern table uses a bank the game sets
 *     elsewhere: it is not drawn (the drawing says so, and such a pose cannot be used in a project).
 *   - The 32 CHR banks (4 KiB) as entries: the graphics reference that frame links compare drawn sprites with.
 *   - The fights (as actors) and the RAM bytes the routine reads.
 *   Delta poses (selectors $80-$FF) change the previous full pose and are not catalogued.
 * Bundle order: after src/services/library-catalog.js (and src/re/punch-out-content.js).
 */
(()=>{
'use strict';
const F=window.Forge,services=F.services,LC=services.LibraryCatalog;
if(!LC?.registerProvider||!window.PunchOutContent)return;
const PROFILES=Object.freeze([
  {sha256:'22ce21aa9c477d87e9cdc386b185f2166b18d438257640aa1d8e75ee9960e06e',id:'punch-out-us-prg1',name:"Mike Tyson's Punch-Out!! (U) (PRG 1)"},
  {sha256:'0435f6d9bcfeb474a592c3a950530a99c03a6f6cacff793dc88f822bb8cc6952',id:'punch-out-us-prg0',name:"Mike Tyson's Punch-Out!! (U) (PRG 0)"}]);
// the sprite modes the pose routine is run in ($80 row height, $81 tile step; $82 follows the step)
const MODES=Object.freeze([{key:'8x16',height:16,step:2,label:'8×16 sprites'},{key:'8x8-step2',height:8,step:2,label:'8×8 sprites, tiles stepping by 2'},{key:'8x8',height:8,step:1,label:'8×8 sprites'}]);
const BASES=[];for(const y of [104,136,168,200])for(const x of [96,128,160])BASES.push({x,y});
const CHR_START=16+8*16384;
const hex2=v=>'$'+v.toString(16).toUpperCase().padStart(2,'0'),hex4=v=>'$'+v.toString(16).toUpperCase().padStart(4,'0');
const tick=()=>new Promise(r=>setTimeout(r,0));
async function sha256(text){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');}

// the record drawn in one mode at the base where every piece moves with the base, the most pieces kept
function layoutOf(content,fight,selector,mode){
  let best=null;
  for(const b of BASES){
    let d,e;try{d=content.pose(fight,selector,{...b,mode});e=content.pose(fight,selector,{x:b.x+8,y:b.y+8,mode});}catch(_){continue;}
    if(!d.pieces.length||d.pieces.length!==e.pieces.length)continue;
    const by=new Map(e.pieces.map(p=>[p.slot,p]));
    // (bit 5, behind the background, depends on the screen line the routine reaches: it is not part of the shape)
    if(!d.pieces.every(p=>{const q=by.get(p.slot);return q&&q.tile===p.tile&&q.x===p.x+8&&q.y===p.y+8&&(q.attributes&0xdf)===(p.attributes&0xdf);}))continue;
    if(!best||d.pieces.length>best.d.pieces.length)best={d,base:b};
  }
  if(!best)return null;
  const {d,base}=best;
  return {key:mode.key,label:mode.label,height:mode.height,step:mode.step,base,chrBank4KiB:d.chrBankSelected?d.chrBank4KiB:null,status:d.status,gaps:d.gaps,
    // positions relative to the base; y as the game writes it to OAM (one less than the line the sprite starts on)
    pieces:d.pieces.map(p=>({slot:p.slot,tile:p.tile,x:p.x-base.x,y:p.y-1-base.y,attributes:p.attributes,...(p.inheritsAttributes?{inheritsAttributes:true}:{})}))};
}
function recordLength(bytes,fileOffset){return 7+2*bytes[fileOffset+6];}

async function catalog(bytes,name){
  const input=Uint8Array.from(bytes),sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',input)),x=>x.toString(16).padStart(2,'0')).join('');
  const profile=PROFILES.find(p=>p.sha256===sha);if(!profile)throw Error('Punch-Out library: not a supported revision');
  const content=window.PunchOutContent.open(input),poses=[],actors=[],stats={records:0,selectors:0,layouts:{},noLayout:0};
  for(const f of content.fights){
    const pointer=(sel)=>{const at=f.shapeTables[0]+sel;return {fileOffset:16+f.bank8KiB*8192+at-0x8000,length:2,bank8KiB:f.bank8KiB,cpu:at};};
    const byAddress=new Map();
    for(const r of f.poses){if(r.status!=='source-record')continue;if(!byAddress.has(r.address))byAddress.set(r.address,[]);byAddress.get(r.address).push(r);}
    for(const [address,list] of byAddress){
      const first=list[0],layouts=[];
      for(const m of MODES){const l=layoutOf(content,f.index,first.selector,m);if(l){layouts.push(l);stats.layouts[m.key]=(stats.layouts[m.key]||0)+1;}}
      if(!layouts.length)stats.noLayout++;
      const configured=MODES.find(m=>m.height===f.spriteMode&&m.step===f.spriteMode/8).key,primary=layouts.find(l=>l.key===configured)||layouts[0]||null;
      const sels=list.map(r=>r.selector);
      poses.push({id:'po:f'+f.index+':'+address.toString(16),label:f.label+' · pose '+hex2(sels[0])+(sels.length>1?' (also '+sels.slice(1).map(hex2).join(', ')+')':''),
        owner:f.label,fight:f.index,selectors:sels,address,configuredMode:configured,
        source:{fileOffset:first.fileOffset,length:recordLength(input,first.fileOffset),bank8KiB:f.bank8KiB,cpu:address},
        pointerSources:sels.map(pointer),
        pieces:primary?primary.pieces:[],layouts,
        limits:['Drawn by the game\'s own pose routine in each sprite mode the game uses; which mode the game draws a pose in is established when a captured frame links it.',
          'Delta poses ($80-$FF) that change this pose are not included.']});
      stats.records++;stats.selectors+=sels.length;
    }
    actors.push({id:'po-fight:'+f.index,selector:f.index,label:f.label,owner:'opponent',bank8KiB:f.bank8KiB,spriteMode:f.spriteMode,base:{x:f.baseX,y:f.baseY},
      record:{fileOffset:f.entryFileOffset,length:16,bank8KiB:f.bank8KiB,cpu:0x8000+f.entryOffset},
      palette:{fileOffset:f.paletteFileOffset,length:32,bank8KiB:f.bank8KiB},config:{fileOffset:f.configFileOffset,length:96,bank8KiB:f.bank8KiB},
      fullPoses:f.poses.filter(p=>p.status==='source-record').length});
    await tick();
  }
  const graphics=Array.from({length:32},(_,bank)=>({id:'chr:'+bank,bank4KiB:bank,tiles:256,fileOffset:CHR_START+bank*4096,length:4096,meaning:'Physical CHR ROM patterns. Which bank a pose draws from is stated with the pose.'}));
  const ram=[[0x80,'sprite row height (8 or 16) the pose routine draws with'],[0x81,'tile step (1 or 2) the pose routine draws with'],[0x82,'tile mask for the step'],
    [0xA0,'pose draw request'],[0xA1,'pose selector being drawn (full poses below $80, delta poses from $80)'],[0xA9,'sprite CHR bank the pose\'s tile stream selects'],
    [0xB0,'fighter base X'],[0xB1,'fighter base Y']].map(([address,meaning])=>({address,label:hex4(address),meaning,basis:'read by the pose routine at $C890 (decoder initial state)'}));
  const native={format:'NESForgeNativeGameEvidence',version:1,status:'supported',source:{sha256:sha,byteLength:input.length,name},profile:{...profile},
    scenes:[],stages:[],poses,animations:[],actors,locations:[],graphics,symbols:[],ram,
    limits:['Full poses of the 14 fights, from the game\'s own pose routine. Delta poses, animation timing, fight behaviour and Little Mac are not catalogued.']};
  const n={format:'NESForgeInvestigation',version:1,source:{name:String(name||profile.name).slice(0,160),sha256:sha,byteLength:input.length,profile:profile.id},
    catalogs:{native},catalogSha256:{native:await sha256(JSON.stringify(native))}};
  return {n,stats};
}

// the drawing of one layout: pieces, the patterns they use (top and bottom halves of 8x16 sprites), the sprite palette
function drawing(record,layout,bytes,fight){
  const content=window.PunchOutContent.open(bytes),f=content.fights[record.fight],bankKnown=Number.isInteger(layout.chrBank4KiB),bank=bankKnown?content.chr(layout.chrBank4KiB):null,tiles={};
  const pal=f.palette.slice(16),palette=[0,1,2,3].map(i=>pal.slice(i*4,i*4+4));
  let undrawn=0,inherited=0;
  const pieces=layout.pieces.map(p=>{
    // a piece whose attribute byte the routine does not write keeps the previous pose's: drawn with palette 0, unflipped
    if(p.inheritsAttributes){inherited++;p={...p,attributes:0};}
    const flipH=!!(p.attributes&64),flipV=!!(p.attributes&128),behind=!!(p.attributes&32);
    if(layout.height===16){
      const upper=p.tile&1,top=(upper<<8)|(p.tile&254);
      if(upper||!bankKnown){undrawn++;return {tile:top,tile2:top+1,x:p.x,y:p.y,pal:p.attributes&3,flipH,flipV,behind,drawn:false};}
      tiles[top]=bank[p.tile&254];tiles[top+1]=bank[(p.tile&254)+1];
      return {tile:top,tile2:top+1,x:p.x,y:p.y,pal:p.attributes&3,flipH,flipV,behind};
    }
    if(!bankKnown){undrawn++;return {tile:p.tile,x:p.x,y:p.y,pal:p.attributes&3,flipH,flipV,behind,drawn:false};}
    tiles[p.tile]=bank[p.tile];return {tile:p.tile,x:p.x,y:p.y,pal:p.attributes&3,flipH,flipV,behind};
  });
  const sels=record.selectors.map(hex2).join(', ');
  const note=!bankKnown?'its fight\'s pose table selects it ('+sels+'); its record does not select a CHR bank ($A9), so the game draws it from the bank set before it: the library cannot draw it (a captured frame that links it shows the bank); '+layout.label:
    'its fight\'s pose table selects it ('+sels+'); tiles from CHR bank '+layout.chrBank4KiB+', which its tile stream selects ($A9), pattern table $0000; the fight\'s sprite palette; drawn as '+layout.label+
    (layout.key===record.configuredMode?', the fight\'s configured sprite mode':'')+(undrawn?'; '+undrawn+' of its '+pieces.length+' pieces use the upper pattern table, whose bank the game sets elsewhere: not drawn':'')+
    (bankKnown&&inherited?'; '+inherited+' of its pieces keep the palette and flips of the pose before it (the routine does not write them): drawn with palette 0, unflipped':'');
  return {format:'NESForgeLibraryPose',version:1,poseId:record.id,name:record.label,spriteMode:layout.height,originX:0,originY:0,pieces,tiles,palette,
    context:{roomId:null,label:fight+' bout',stage:null,basis:'fight',confirmed:bankKnown,mode:layout.key,chrBank4KiB:layout.chrBank4KiB,undrawn,inherited,note}};
}
function poseDrawings(record,bytes){
  const fight=record.owner,out={layouts:{}};
  for(const l of record.layouts||[])out.layouts[l.key]=drawing(record,l,bytes,fight);
  out.rendition=out.layouts[record.configuredMode]||Object.values(out.layouts)[0]||null;
  return out;
}

const provider=Object.freeze({id:'punch-out',profiles:PROFILES,catalog,poseDrawings,MODES});
LC.registerProvider(provider);
services.PunchOutLibrary=provider;
})();
