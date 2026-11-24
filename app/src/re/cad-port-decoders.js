/* CAD-PORT-01: shared decoders for the block, big-block and screen formats CadEditor's NES configurations describe
 * (see cad-port-catalog.js). Independent implementations written from the formats' behaviour; no CadEditor code is
 * copied. Every read is bounds-checked against the cartridge; nothing is guessed: a format the catalog does not state
 * is not decoded. UMD, pure (no DOM, no storage). */
(function(root,factory){const node=typeof module!=='undefined'&&module.exports;const api=factory();if(node)module.exports=api;else root.CadPortDecoders=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const VERSION=1;
function fail(m){throw Error('CAD-PORT decoder: '+m);}
function at(rom,offset,length){if(!Number.isSafeInteger(offset)||!Number.isSafeInteger(length)||offset<16||length<0||offset+length>rom.length)fail('range $'+Number(offset).toString(16)+'+'+length+' lies outside the cartridge');return rom.subarray(offset,offset+length);}
const quads=a=>[a&3,(a>>2)&3,(a>>4)&3,(a>>6)&3];

// ---- blocks: tiles row by row, and one palette per 2x2-tile quadrant (null when the format states none) ----
const BLOCKS={
  // 16 tile bytes per block (4x4), one attribute byte per block: the four 2-bit palettes of its quadrants
  'tiles16-attribute-byte':(rom,d)=>{const t=at(rom,d.offset,d.count*16),p=at(rom,d.paletteOffset,d.count);
    return Array.from({length:d.count},(_,id)=>({id,width:4,height:4,tiles:Array.from(t.subarray(id*16,id*16+16)),palettes:quads(p[id]),raw:p[id]}));},
  // 4 tile bytes per block (2x2), one byte per block in a parallel array; the palette is its low 2 bits
  'linear-2x2-palette-array':(rom,d)=>{const t=at(rom,d.offset,d.count*4),p=at(rom,d.paletteOffset,d.count);
    return Array.from({length:d.count},(_,id)=>{let tiles=Array.from(t.subarray(id*4,id*4+4));if(d.transpose)tiles=[tiles[0],tiles[2],tiles[1],tiles[3]];
      return {id,width:2,height:2,tiles,palettes:[((p[id]>>(d.shift||0))&d.mask)&3],raw:p[id]};});},
  // w*h tile bytes per block, optionally stored column by column, optionally followed by its palette bytes
  'linear':(rom,d)=>{const w=d.width,h=d.height,n=w*h,pal=d.attributes==='trailing'?Math.ceil(w/2)*Math.ceil(h/2):0,size=n+pal,t=at(rom,d.offset,d.count*size);
    return Array.from({length:d.count},(_,id)=>{const s=t.subarray(id*size,id*size+n);let tiles=Array.from(s);
      if(d.transpose){tiles=new Array(n);for(let y=0;y<h;y++)for(let x=0;x<w;x++)tiles[y*w+x]=s[x*h+y];}
      return {id,width:w,height:h,tiles,palettes:pal?Array.from(t.subarray(id*size+n,id*size+size)).map(v=>v&3):null};});},
  // 17-byte records: one attribute byte (four 2-bit palettes), then 16 tile bytes (4x4, row by row)
  'tiles16-attribute-interleaved':(rom,d)=>{const t=at(rom,d.offset,d.count*17);
    return Array.from({length:d.count},(_,id)=>({id,width:4,height:4,tiles:Array.from(t.subarray(id*17+1,id*17+17)),palettes:quads(t[id*17]),raw:t[id*17]}));},
  // tiles computed from the block number (no table in the cartridge): base = (id / rowLength) * rowStride +
  // (id % rowLength) * step, or id * step; each quadrant (TL TR BL BR) is base + its offset
  'computed-2x2':(rom,d)=>Array.from({length:d.count},(_,id)=>{const base=d.rowLength?Math.floor(id/d.rowLength)*d.rowStride+(id%d.rowLength)*d.step:id*d.step;
    return {id,width:2,height:2,tiles:d.offsets.map(o=>(base+o)&255),palettes:null};}),
  // five arrays of one byte per block: the four quadrant tiles, then palette (low 2 bits) and type (high nibble)
  'aligned-arrays-2x2':(rom,d)=>{const a=at(rom,d.offset,d.count*5);
    // the palette is the type byte's low 2 bits, or (separatePalette) a parallel array at an optional shift
    const sp=d.separatePalette?at(rom,d.paletteOffset,d.count):null;
    return Array.from({length:d.count},(_,id)=>{const tc=a[d.count*4+id],t=[a[id],a[d.count+id],a[d.count*2+id],a[d.count*3+id]];
      return {id,width:2,height:2,tiles:d.transpose?[t[0],t[2],t[1],t[3]]:t,palettes:d.palette==='none'?null:sp?[((sp[id]>>(d.shift||0))&d.mask)&3]:[tc&3],type:tc>>4,raw:tc};});},
};
// ---- big blocks: 2x2 blocks, 4 bytes each (TL TR BL BR, or TL BL TR BR when swapMiddle; optionally only the bits of
// a mask name the block), optional palette byte ----
const BIG={
  // four aligned arrays of one block ID each (TL, TR, BL, BR), optionally a colour byte per big block
  'aligned-2x2':(rom,d)=>{const a=at(rom,d.offset,d.count*4),p=d.palette==='byte-per-big-block'?at(rom,d.paletteOffset,d.count):null;
    return Array.from({length:d.count},(_,id)=>({id,cells:[a[id],a[d.count+id],a[d.count*2+id],a[d.count*3+id]],palettes:p?quads(p[id]):null}));},
  'linear-2x2':(rom,d)=>{const a=at(rom,d.offset,d.count*4),p=d.palette==='byte-per-big-block'?at(rom,d.paletteOffset,d.count):null;
    return Array.from({length:d.count},(_,id)=>{const r=Array.from(a.subarray(id*4,id*4+4),v=>d.mask?v&d.mask:v),cells=d.swapMiddle?[r[0],r[2],r[1],r[3]]:r;return {id,cells,palettes:p?quads(p[id]):null};});},
};
function blocks(rom,d){const f=BLOCKS[d?.format];if(!f)fail('no block decoder for '+d?.format);if(!Number.isSafeInteger(d.count)||d.count<1||d.count>4096)fail('invalid block count');return f(rom,d);}
function bigBlocks(rom,d){const f=BIG[d?.format];if(!f)fail('no big-block decoder for '+d?.format);if(!Number.isSafeInteger(d.count)||d.count<1||d.count>4096)fail('invalid big-block count');return f(rom,d);}
// ---- screens: records [offset, count, size, width, height]; vertical screens are stored column by column ----
function screens(rom,s){
  const out=[],word=s.word||1,stride=s.stride||1;
  if(![1,2].includes(word))fail('unsupported cell word length '+word);
  for(const [offset,count,size,width,height] of s.records){
    if(!(count>0&&size>0&&count*size<=1<<20))fail('invalid screen record');
    const w=width||size,h=height||1;if(w*h!==size)fail('screen geometry '+w+'x'+h+' does not match its '+size+' cells');
    for(let i=0;i<count;i++){
      const base=offset+i*size*stride*word,bytes=at(rom,base,(size-1)*stride*word+word);
      const raw=Array.from({length:size},(_,c)=>word===2?bytes[c*2*stride]|(bytes[c*2*stride+1]<<8):bytes[c*stride]);
      let W=w,H=h,cells=raw;if(s.vertical){W=h;H=w;cells=new Array(size);for(let x=0;x<W;x++)for(let y=0;y<H;y++)cells[y*W+x]=raw[x*H+y];}
      out.push({index:out.length,offset:base,length:(size-1)*stride*word+word,width:W,height:H,cells});
    }
  }
  return out;
}
// ---- projection: a screen as a tile grid with one palette per 2x2-tile area (null where none is stated) ----
function decodeAll(rom,def){
  const b=def.blocks?blocks(rom,def.blocks):null,g=def.screens?.cells==='big-blocks'&&def.bigBlocks?bigBlocks(rom,def.bigBlocks):null;
  return {blocks:b,bigBlocks:g,screens:def.screens?screens(rom,def.screens):[]};
}
function project(decoded,def,screen){
  const b=decoded.blocks;if(!b)fail('the definition has no decodable blocks');
  const bw=b[0].width,bh=b[0].height,big=def.screens.cells==='big-blocks';if(big&&!decoded.bigBlocks)fail('the definition has no decodable big blocks');
  const cw=big?bw*2:bw,ch=big?bh*2:bh,cols=screen.width*cw,rows=screen.height*ch,tiles=new Array(cols*rows).fill(0),pal=new Array((cols>>1)*(rows>>1)).fill(null);
  const missing=new Set();
  const put=(blockId,tx,ty,bigPal)=>{const blk=b[blockId];if(!blk){missing.add(blockId);return;}
    for(let y=0;y<bh;y++)for(let x=0;x<bw;x++)tiles[(ty+y)*cols+tx+x]=blk.tiles[y*bw+x];
    for(let qy=0;qy<Math.ceil(bh/2);qy++)for(let qx=0;qx<Math.ceil(bw/2);qx++){const px=(tx>>1)+qx,py=(ty>>1)+qy;if(px>=(cols>>1)||py>=(rows>>1))continue;
      const p=bigPal!=null?bigPal:blk.palettes?(blk.palettes.length===1?blk.palettes[0]:blk.palettes[qy*Math.ceil(bw/2)+qx]):null;pal[py*(cols>>1)+px]=p??null;}};
  screen.cells.forEach((id,i)=>{const cx=i%screen.width,cy=Math.floor(i/screen.width);
    if(big){const bb=decoded.bigBlocks[id];if(!bb){missing.add('big:'+id);return;}bb.cells.forEach((blockId,k)=>put(blockId,cx*cw+(k&1)*bw,cy*ch+(k>>1)*bh,bb.palettes?bb.palettes[k]:null));}
    else put(id,cx*cw,cy*ch,null);});
  return {cols,rows,tiles,palettes:pal,missing:[...missing],bandRows:ch};
}
// pages of 32x30 tiles; taller content is cut every 28 rows so that attribute areas stay aligned
function pages(p){
  const out=[],stepY=p.rows<=30?30:28;
  for(let oy=0;oy<p.rows;oy+=stepY)for(let ox=0;ox<p.cols;ox+=32){
    const nt=new Array(960).fill(0),attr=new Array(64).fill(0),h=Math.min(stepY,p.rows-oy,30),w=Math.min(32,p.cols-ox);let paletted=0,quadrants=0;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++)nt[y*32+x]=p.tiles[(oy+y)*p.cols+ox+x];
    for(let y=0;y<h;y+=2)for(let x=0;x<w;x+=2){const v=p.palettes[((oy+y)>>1)*(p.cols>>1)+((ox+x)>>1)];quadrants++;if(v==null)continue;paletted++;
      const a=(y>>2)*8+(x>>2),shift=((y>>1)&1)*4+((x>>1)&1)*2;attr[a]|=(v&3)<<shift;}
    out.push({x:ox,y:oy,width:w,height:h,nt,attr,palettesStated:quadrants?paletted/quadrants:0});
  }
  return out;
}
// ---- structural evidence on one cartridge ----
// A definition applies when every range lies inside the cartridge and its screens are made of valid IDs that name
// non-uniform blocks. Two measures of how surprising a pass is:
//  - analytic: log10 P = cells * log10(share of this cartridge's PRG bytes below the ID limit), as if bytes were
//    independent. Real ROM data is not (runs, ascending tables), so this alone overstates the evidence;
//  - empirical control: the same screen geometry read at 99 shifted offsets of the same cartridge (deterministic
//    shifts). If shifted reads also pass, the stated offset is not singled out by its structure.
// "supported": analytic <= 1e-6 and no shifted read passes. "consistent": nothing contradicts, but the evidence is
// weaker (for example 256 IDs, which every byte satisfies). "contradicted": a check failed.
function prgOf(rom){const start=16+(rom[6]&4?512:0);return rom.subarray(start,Math.min(rom.length,start+rom[4]*16384));}
function hash32(s){let h=2166136261>>>0;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h;}
function screenChecks(rom,def,d,screenDef){
  const big=def.screens.cells==='big-blocks',limit=big?def.bigBlocks.count:def.blocks.count,sc=screens(rom,screenDef),cells=sc.flatMap(s=>s.cells);
  const valid=cells.filter(v=>v<limit).length,inner=big?[...new Set(cells.filter(v=>v<limit))].flatMap(id=>d.bigBlocks[id].cells):cells;
  const refsOk=!big||inner.every(v=>v<d.blocks.length),used=[...new Set(inner)].filter(v=>v<d.blocks.length).map(v=>d.blocks[v]),uniform=used.filter(b=>b.tiles.every(t=>t===b.tiles[0])).length,distinct=new Set(cells).size;
  return {cells,valid,limit,refsOk,inner:inner.length,used:used.length,uniform,distinct,pass:valid===cells.length&&refsOk&&(!used.length||uniform<used.length/2)&&distinct>=4};
}
function applicability(rom,def,{shifts=99}={}){
  const checks=[],add=(name,ok,detail)=>checks.push({name,ok,...(detail?{detail}:{})});let state='consistent',log10Chance=0,control=null;
  try{
    if(!(rom instanceof Uint8Array)||rom.length<16||rom[0]!==0x4e||rom[1]!==0x45||rom[2]!==0x53||rom[3]!==0x1a)fail('not an iNES cartridge');
    if(!def.screens)return {state:'not-decodable',checks:[{name:'screens',ok:false,detail:'the definition states no screens'}],log10Chance:0,control:null};
    const big=def.screens.cells==='big-blocks';
    if(!def.blocks||(big&&!def.bigBlocks))return {state:'not-decodable',checks:[{name:'cells',ok:false,detail:'the '+(big?'big blocks':'blocks')+' of this definition are not decodable'}],log10Chance:0,control:null};
    const d=decodeAll(rom,def);add('every stated range lies inside the cartridge',true);
    const r=screenChecks(rom,def,d,def.screens),prg=prgOf(rom),share=(lim,mask=255)=>{let n=0;for(const v of prg)if((v&mask)<lim)n++;return Math.min(0.999,Math.max(1/prg.length,n/prg.length));};
    log10Chance=(r.limit>=256?0:Math.min(r.cells.length,4096)*Math.log10(share(r.limit)))+(big&&d.blocks.length<256&&r.inner?Math.min(r.inner,4096)*Math.log10(share(d.blocks.length,def.bigBlocks.mask||255)):0); // a masked reference is valid only as often as its masked value is
    add('every screen cell is a valid '+(big?'big-block':'block')+' ID',r.valid===r.cells.length,{valid:r.valid,cells:r.cells.length,limit:r.limit});
    if(big)add('every big block used names a valid block',r.refsOk,{references:r.inner,blocks:d.blocks.length});
    add('the blocks the screens use are not mostly uniform',!r.used||r.uniform<r.used/2,{used:r.used,uniform:r.uniform});
    add('the screens use at least four distinct IDs',r.distinct>=4,{distinct:r.distinct});
    if(def.palette?.source==='cartridge'){const p=at(rom,def.palette.offset,Math.max(16,def.palette.size||16));add('the palette table holds NES colours',p.every(v=>v<64));}
    if(def.graphics){const chrStart=16+(rom[6]&4?512:0)+rom[4]*16384;add('the pattern table lies in CHR ROM',rom[5]>0&&def.graphics.offset>=chrStart&&def.graphics.offset+4096<=rom.length);}
    if(checks.every(c=>c.ok)&&log10Chance<=-6&&shifts>0){
      // the empirical control: shift every screen record by the same amount, within PRG, away from the stated data
      const prgStart=16+(rom[6]&4?512:0),prgEnd=prgStart+rom[4]*16384,span=def.screens.records.reduce((m,[o,c,s])=>Math.max(m,o+c*s*(def.screens.stride||1)*(def.screens.word||1)),0)-Math.min(...def.screens.records.map(x=>x[0]));
      let seed=hash32(def.id||'definition'),tried=0,passed=0;
      for(let k=0;k<shifts*4&&tried<shifts;k++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const base=prgStart+seed%Math.max(1,prgEnd-prgStart-span),delta=base-Math.min(...def.screens.records.map(x=>x[0]));
        if(Math.abs(delta)<span+64)continue;const moved={...def.screens,records:def.screens.records.map(([o,...rest])=>[o+delta,...rest])};
        let ok=false;try{ok=screenChecks(rom,def,d,moved).pass;}catch(_){ok=false;}tried++;if(ok)passed++;}
      control={shifts:tried,passed};
    }
    state=!checks.every(c=>c.ok)?'contradicted':log10Chance<=-6&&control&&control.passed===0?'supported':'consistent';
  }catch(e){add('decoding',false,String(e.message));state='contradicted';}
  return {state,checks,log10Chance:Math.round(log10Chance*10)/10,control};
}
// ---- runtime observation: is a decoded screen drawn in the PPU's nametables? ----
// nametables: the 4 KiB logical $2000-$2FFF as the running game exposes it (mirroring applied), arranged as a 64x60
// tile ring (nametable 0 top left, 1 top right, 2 bottom left, 3 bottom right). Scrolling games write a screen into
// this ring a row or a column at a time, and a 32-row screen wraps through 30-row nametables, so each band of cell
// rows is located on its own: its 2x2 tile groups vote for an offset (with wrap-around) and the best offset is checked
// tile by tile, one screen width (32 columns) at a time. Bands that match (>= 90% of at least 8 compared tiles) must agree on the
// horizontal offset. The screen's most common tile (its filler) is never counted. A screen is observed when the
// agreeing bands compare at least 64 tiles and match at least 90% of them.
function ring(nametables){const g=new Uint8Array(64*60);for(let n=0;n<4;n++)for(let y=0;y<30;y++)for(let x=0;x<32;x++)g[(y+(n>>1)*30)*64+x+(n&1)*32]=nametables[n*1024+y*32+x];return g;}
function attrAt(nametables,gx,gy){const n=(gy>=30?2:0)+(gx>=32?1:0),x=gx%32,y=gy%30,a=nametables[n*1024+960+(y>>2)*8+(x>>2)];return (a>>(((y>>1)&1)*4+((x>>1)&1)*2))&3;}
function observeScreens(nametables,projections,{minimum=64,fraction=0.9,band=null}={}){
  const g=ring(nametables),index=new Map(),W=64,H=60;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const k=g[y*W+x]|(g[y*W+(x+1)%W]<<8)|(g[((y+1)%H)*W+x]<<16)|(g[((y+1)%H)*W+(x+1)%W]*16777216);let l=index.get(k);if(!l)index.set(k,l=[]);if(l.length<64)l.push(y*W+x);}
  const out=[];
  projections.forEach((p,si)=>{
    const counts=new Map();for(const t of p.tiles)counts.set(t,(counts.get(t)||0)+1);let filler=0,most=-1;for(const [t,c] of counts)if(c>most){most=c;filler=t;}
    const bh=band||p.bandRows||4,bands=[];
    for(let y0=0;y0<p.rows;y0+=bh){
      const votes=new Map(),y1=Math.min(p.rows,y0+bh);
      for(let sy=y0;sy+1<y1;sy+=2)for(let sx=0;sx+1<p.cols;sx+=2){const a=p.tiles[sy*p.cols+sx],b=p.tiles[sy*p.cols+sx+1],c=p.tiles[(sy+1)*p.cols+sx],d=p.tiles[(sy+1)*p.cols+sx+1];
        if(a===b&&b===c&&c===d)continue;const hits=index.get(a|(b<<8)|(c<<16)|(d*16777216));if(!hits)continue;
        for(const pos of hits){const dx=((pos%W)-sx%W+W*64)%W,dy=((Math.floor(pos/W))-sy%H+H*64)%H,key=dy*W+dx;votes.set(key,(votes.get(key)||0)+1);}}
      let best=null;
      for(const [key] of [...votes].sort((a,b)=>b[1]-a[1]).slice(0,3)){const dx=key%W,dy=Math.floor(key/W);
        let win={c:0,m:0,x0:0,ac:0,am:0};
        // one screen's width at a time: a scrolling game holds only the visible columns and the few it draws ahead
        const span=Math.min(p.cols,32);
        for(let x0=0;x0<Math.max(1,p.cols-span+1);x0+=2){let c=0,m=0,ac=0,am=0;
          for(let sy=y0;sy<y1;sy++)for(let sx=x0;sx<Math.min(p.cols,x0+span);sx++){const t=p.tiles[sy*p.cols+sx];if(t===filler)continue;const gx=(sx+dx)%W,gy=(sy+dy)%H;c++;
            if(g[gy*W+gx]===t){m++;if(!(sx&1)&&!(sy&1)&&!(gx&1)&&!(gy&1)){const v=p.palettes[(sy>>1)*(p.cols>>1)+(sx>>1)];if(v!=null){ac++;if(attrAt(nametables,gx,gy)===v)am++;}}}}
          if(m>win.m)win={c,m,x0,ac,am};}
        if(!best||win.m>best.matched)best={y0,dx,dy,compared:win.c,matched:win.m,x0:win.x0,attributesCompared:win.ac,attributesMatched:win.am};}
      if(best&&best.compared>=8&&best.matched/best.compared>=fraction)bands.push(best);
    }
    // the bands that agree on the horizontal offset (the largest group)
    const groups=new Map();for(const b of bands){const k=(b.dx-(b.x0%W)+W)%W;let l=groups.get(b.dx);if(!l)groups.set(b.dx,l=[]);l.push(b);}
    let agree=[];for(const l of groups.values())if(l.reduce((n,b)=>n+b.compared,0)>agree.reduce((n,b)=>n+b.compared,0))agree=l;
    const compared=agree.reduce((n,b)=>n+b.compared,0),matched=agree.reduce((n,b)=>n+b.matched,0);
    if(compared>=minimum&&matched/compared>=fraction)out.push({screen:si,dx:agree[0].dx,dy:agree[0].dy,bands:agree.length,bandsTotal:Math.ceil(p.rows/bh),compared,matched,
      attributesCompared:agree.reduce((n,b)=>n+b.attributesCompared,0),attributesMatched:agree.reduce((n,b)=>n+b.attributesMatched,0)});
  });
  return out;
}
// ---- recognition: a title hint from the file name, then structure on this cartridge ----
const ROMAN={ii:'2',iii:'3',iv:'4',v:'5',vi:'6'};
const STOP=new Set(['the','of','and','a','an','unl','unlicensed','fds','prototype','nes']);
function words(s){return String(s||'').toLowerCase().replace(/\[[^\]]*\]|\([^)]*\)/g,' ').replace(/&/g,' and ').replace(/'s\b/g,'s').replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).map(w=>ROMAN[w]||w).filter(w=>w&&!STOP.has(w));}
function titleScore(name,game){
  const n=words(name),nNum=n.filter(w=>/^\d+$/.test(w)),cand=[game.title,game.folder.replace(/_/g,' ')].filter(Boolean);let best=0;
  for(const t of cand){const tw=words(t),num=tw.filter(w=>/^\d+$/.test(w)),txt=tw.filter(w=>!/^\d+$/.test(w));if(!txt.length)continue;
    // a sequel number must agree both ways: "Mega Man 2" is not "Mega Man"
    if((num[0]||null)!==(nNum[0]||null))continue;
    const joined=n.join(''),hit=txt.filter(w=>n.includes(w)).length;let s=hit===txt.length?1:txt.join('')&&joined.includes(txt.join(''))?0.95:0;
    if(!s&&txt.length===1&&txt[0].length>=3){const initials=n.filter(w=>!/^\d+$/.test(w)).map(w=>w[0]).join('');if(initials===txt[0])s=0.9;}
    best=Math.max(best,s);}
  return best;
}
function recognize(rom,name,catalog,{games=null}={}){
  const list=(games?catalog.games.filter(g=>games.includes(g.folder)):catalog.games).map(g=>({g,score:games?1:titleScore(name,g)})).filter(x=>x.score>=0.9).sort((a,b)=>b.score-a.score||a.g.folder.localeCompare(b.g.folder));
  const out=[];
  for(const {g,score} of list){
    const defs=g.definitions.filter(d=>d.status==='decodable').map(d=>({id:d.id,status:d.status,...applicability(rom,d)}));
    const supported=defs.filter(d=>d.state==='supported').length,consistent=defs.filter(d=>d.state==='consistent').length,contradicted=defs.filter(d=>d.state==='contradicted').length;
    out.push({folder:g.folder,title:g.title||g.folder,titleScore:score,supported,consistent,contradicted,recognized:supported>0,definitions:defs});
  }
  const hit=out.filter(x=>x.recognized).sort((a,b)=>b.supported-a.supported||b.titleScore-a.titleScore)[0]||null;
  return {format:'NESForgeCadPortRecognition',version:VERSION,name:String(name||''),candidates:out,game:hit?hit.folder:null,basis:hit?'title hint and structure':null};
}
return Object.freeze({version:VERSION,observeScreens,ring,blocks,bigBlocks,screens,decodeAll,project,pages,applicability,recognize,titleScore,words,BLOCK_FORMATS:Object.freeze(Object.keys(BLOCKS)),BIG_FORMATS:Object.freeze(Object.keys(BIG))});
});
