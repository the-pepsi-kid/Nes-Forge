/* AL-EXP-01 (BL06): a layout-agnostic 2x2 metatile table finder. Independent implementation written from functional
 * requirements (Audit 02, T06); no NesBlockFinder or CadEditor code is copied or translated. Pure: it reads cartridge
 * bytes and observations (captured nametables, recorded PRG accesses) and proposes ranked, falsifiable candidates.
 * It holds no game constants and never sees fixture answers. Aliases and unknowns stay explicit: an unknown cell is
 * never given an ID, and an ambiguous cell keeps every ID it could be. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ForgeMetatileFinder=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const VERSION=1;
const QUADS=['TL','TR','BL','BR'];
const ORDERS=Object.freeze({row:Object.freeze({TL:0,TR:1,BL:2,BR:3}),column:Object.freeze({TL:0,BL:1,TR:2,BR:3})});
const DATA=4; // access role bit for a data read (bus observer)
const LIMITS=Object.freeze({observations:16,ranked:12,windows:3,minMatched:3,maxRecords:256,interventions:5});
const DECODERS=Object.freeze({low2:v=>v&3,high2:v=>v>>6});
const ENCODERS=Object.freeze({low2:(v,p)=>(v&~3)|p,high2:(v,p)=>(v&0x3f)|(p<<6)});
// absolute indexed loads/stores: their operand is a table base when the index register holds the record index
const INDEXED=new Set([0x1d,0x3d,0x5d,0x7d,0x9d,0xbd,0xdd,0xfd,0xbc,0x1e,0x3e,0x5e,0x7e,0xde,0xfe,0x19,0x39,0x59,0x79,0x99,0xb9,0xd9,0xf9,0xbe]);
function fail(message){throw Error('Metatile finder: '+message);}

// ---------- observations ----------
// mirroring: the emulator's numbering (0 horizontal, 1 vertical, 3/2 single-screen, 4 four-screen)
function physicalNametable(logical,mirroring){
  if(mirroring===4)return logical*0x400;if(mirroring===0)return (logical>>1)*0x400;if(mirroring===1)return (logical&1)*0x400;if(mirroring===3)return 0x400;return 0;
}
// The visible nametable (960 tiles + 64 attribute bytes) of a capture. Slice 1 supports an unscrolled screen only.
function visible(capture){
  const vram=capture.nametables,ppu=capture.ppu||{};
  if(!(vram instanceof Uint8Array)||vram.length<0x800)fail('a capture needs its nametable bytes');
  if((ppu.scrollX|0)!==0||(ppu.scrollY|0)!==0)return {supported:false,reason:'the screen is scrolled (partial scroll is later scope)'};
  const at=physicalNametable((ppu.ctrl|0)&3,ppu.mirroring|0);
  return {supported:true,tiles:vram.slice(at,at+960),attributes:vram.slice(at+960,at+1024),nametable:(ppu.ctrl|0)&3};
}
function paletteAt(attributes,mx,my){const byte=attributes[(my>>1)*8+(mx>>1)],shift=((my&1)<<2)|((mx&1)<<1);return (byte>>shift)&3;}
// Distinct 2x2 tuples at one grid alignment, with every cell that shows them.
function tuples(screens,grid){
  const out=new Map();
  for(const [s,screen] of screens.entries()){
    const cols=grid.x?15:16,rows=grid.y?14:15;
    for(let my=0;my<rows;my++)for(let mx=0;mx<cols;mx++){
      const x=2*mx+grid.x,y=2*my+grid.y,t=screen.tiles,tiles=[t[y*32+x],t[y*32+x+1],t[(y+1)*32+x],t[(y+1)*32+x+1]],key=tiles.join(',');
      let row=out.get(key);if(!row){row={key,tiles,cells:[],palettes:new Set()};out.set(key,row);}
      const palette=grid.x||grid.y?null:paletteAt(screen.attributes,mx,my);
      row.cells.push({screen:s,label:screen.label,mx,my,palette});if(palette!==null)row.palettes.add(palette);
    }
  }
  return out;
}

// ---------- search ----------
function positionsByValue(prg){const counts=new Uint32Array(256);for(const v of prg)counts[v]++;const lists=Array.from(counts,c=>new Int32Array(c)),fill=new Uint32Array(256);for(let i=0;i<prg.length;i++){const v=prg[i];lists[v][fill[v]++]=i;}return lists;}
function recordBytes(tiles,order){const f=ORDERS[order],r=new Array(4);QUADS.forEach((q,i)=>{r[f[q]]=tiles[i];});return r;}
// Every position p where a tuple's record lies under one hypothesis (record start for interleaved, field-0 index for split).
function matches(prg,byValue,list,h){
  const out=[];
  for(const t of list){const r=recordBytes(t.tiles,h.order),fs=h.fieldStep;
    for(const p of byValue[r[0]]){if(p+3*fs>=prg.length)continue;if(prg[p+fs]===r[1]&&prg[p+2*fs]===r[2]&&prg[p+3*fs]===r[3])out.push([p,t.key]);}}
  return out.sort((a,b)=>a[0]-b[0]);
}
// Group matches into table windows: records of one table share a residue (interleaved) and lie within 256 records.
function windows(found,h,total){
  const groups=new Map();for(const m of found){const r=h.recordStep>1?m[0]%h.recordStep:0;if(!groups.has(r))groups.set(r,[]);groups.get(r).push(m);}
  const out=[],span=LIMITS.maxRecords*h.recordStep;
  for(const [residue,rows] of groups){
    let pool=rows.slice();
    for(let round=0;round<LIMITS.windows&&pool.length;round++){
      let best=null,count=new Map(),distinct=0,j=0;
      for(let i=0;i<pool.length;i++){
        while(j<pool.length&&pool[j][0]<pool[i][0]+span){const k=pool[j][1];count.set(k,(count.get(k)||0)+1);if(count.get(k)===1)distinct++;j++;}
        if(!best||distinct>best.distinct)best={i,j,distinct};
        const k=pool[i][1];count.set(k,count.get(k)-1);if(!count.get(k))distinct--;
      }
      if(!best||best.distinct<LIMITS.minMatched)break;
      const rows2=pool.slice(best.i,best.j),byKey=new Map();for(const [p,k] of rows2){if(!byKey.has(k))byKey.set(k,[]);byKey.get(k).push(p);}
      out.push({hypothesis:h,residue,lo:rows2[0][0],hi:rows2[rows2.length-1][0],byKey,matched:byKey.size,coverage:byKey.size/total});
      const used=new Set(rows2);pool=pool.filter(m=>!used.has(m));
    }
  }
  return out;
}
function hypotheses(prgLength){
  const out=[];for(const order of ['row','column']){out.push({layout:'interleaved',order,recordStep:4,fieldStep:1});for(let s=2;s<=LIMITS.maxRecords&&3*s<prgLength;s++)out.push({layout:'split',order,recordStep:1,fieldStep:s});}return out;
}
const fieldOffsets=(w,p)=>[0,1,2,3].map(f=>p+f*w.hypothesis.fieldStep);
function traceSupport(w,access){
  if(!access)return null;let read=0,all=0;
  for(const ps of w.byKey.values())for(const p of ps)for(const o of fieldOffsets(w,p)){all++;if(access[o]&DATA)read++;}
  return all?read/all:0;
}

// Ranked candidates. options: {rom, layout (romLayout), screens:[capture], access (role bitset over PRG), events}
function propose({rom,layout,captures,access=null,events=null}){
  if(!(rom instanceof Uint8Array))fail('needs cartridge bytes');
  const prg=rom.subarray(layout.prgStart,layout.prgStart+layout.prgBytes),screens=[],skipped=[];
  for(const c of captures.slice(0,LIMITS.observations)){const v=visible(c);if(v.supported)screens.push({label:c.label,...v});else skipped.push({label:c.label,reason:v.reason});}
  if(!screens.length)fail('no supported capture to search');
  const byValue=positionsByValue(prg),all=[];let observed=null;
  for(const grid of [{x:0,y:0},{x:1,y:0},{x:0,y:1},{x:1,y:1}]){
    const map=tuples(screens,grid),list=[...map.values()];if(!observed&&!grid.x&&!grid.y)observed=map;
    for(const h of hypotheses(prg.length))for(const w of windows(matches(prg,byValue,list,h),h,list.length)){
      w.grid=grid;w.tuples=map;w.traceSupport=traceSupport(w,access);w.aliases=[...w.byKey.entries()].filter(([,ps])=>ps.length>1).map(([key,ps])=>({key,positions:ps}));all.push(w);
    }
  }
  const rank=(list,useTrace)=>list.slice().sort((a,b)=>(useTrace?(b.traceSupport||0)-(a.traceSupport||0):0)||b.coverage-a.coverage||a.aliases.length-b.aliases.length||(a.hi-a.lo)-(b.hi-b.lo)||a.lo-b.lo).slice(0,LIMITS.ranked);
  // trace support only ranks candidates that also explain the screens
  const strong=all.filter(w=>w.coverage>=0.5),weak=all.filter(w=>w.coverage<0.5);
  const ranked=[...rank(strong,true),...rank(weak,true)].slice(0,LIMITS.ranked),staticRanked=rank(all,false);
  ranked.forEach((w,i)=>{w.rank=i+1;w.id=describeId(w);});staticRanked.forEach(w=>{if(!w.id)w.id=describeId(w);});
  for(const w of ranked)w.base=inferBase(w,rom,layout,events);
  return {version:VERSION,screens:screens.map(s=>s.label),skipped,distinctTuples:observed?observed.size:0,candidates:ranked,staticRanking:staticRanked.map(w=>w.id),searched:{hypotheses:hypotheses(prg.length).length*4,windows:all.length}};
}
function describeId(w){const h=w.hypothesis;return h.layout+'/'+h.order+(h.layout==='split'?'/stride-'+h.fieldStep:'')+'/grid-'+w.grid.x+w.grid.y+'@prg+'+w.lo.toString(16);}

// ---------- index 0: from the reading instructions ----------
function cpuToPhysical(address,layout){if(address<0x8000)return -1;return layout.prgStart+((address-0x8000)%layout.prgBytes);}
function inferBase(w,rom,layout,events){
  const h=w.hypothesis,lo=layout.prgStart+w.lo,fallback={physical:lo,method:'lowest observed record (index of record 0 unknown)',votes:0,instructions:[]};
  if(!events)return fallback;
  const end=lo+(h.layout==='split'?3*h.fieldStep+LIMITS.maxRecords:LIMITS.maxRecords*4),votes=new Map(),instructions=new Map();
  for(const e of events){
    if(e[1]!==0)continue;const at=e[5];if(at<lo-LIMITS.maxRecords*h.recordStep||at>=end)continue;
    const pc=e[3];if(pc<0||pc+2>=rom.length)continue;const op=rom[pc];if(!INDEXED.has(op))continue;
    const operand=rom[pc+1]|(rom[pc+2]<<8),base=cpuToPhysical(operand,layout);if(base<0)continue;
    let k;if(h.layout==='interleaved')k=((at-lo)%4+4)%4;else k=Math.floor((at-lo)/h.fieldStep);
    if(k<0||k>3)continue;const b=base-k*h.fieldStep;
    if(b>lo||(lo-b)%h.recordStep)continue;
    votes.set(b,(votes.get(b)||0)+1);const key=pc+':'+k;if(!instructions.has(key))instructions.set(key,{pcPhysical:pc,cpuPc:e[2],opcode:op,operand,field:k,base:b});
  }
  if(!votes.size)return fallback;
  const [best,count]=[...votes.entries()].sort((a,b)=>b[1]-a[1])[0],total=[...votes.values()].reduce((a,b)=>a+b,0);
  return {physical:best,method:'operand of the indexed instructions that read the table',votes:count,agreement:count/total,
    cpuBase:[...instructions.values()].filter(i=>i.base===best).map(i=>i.operand-i.field*h.fieldStep)[0],instructions:[...instructions.values()].filter(i=>i.base===best).slice(0,8)};
}
// Record index of each matched position, under the inferred base.
function indexMap(w,layout){const B=w.base.physical-layout.prgStart,out=new Map();for(const [key,ps] of w.byKey)out.set(key,ps.map(p=>(p-B)/w.hypothesis.recordStep));return out;}

// ---------- palette (attribute) array ----------
function attributeArrays(w,rom,layout,access,events){
  if(w.grid.x||w.grid.y)return [];
  const ids=indexMap(w,layout),constraints=[];
  for(const [key,list] of ids){const t=w.tuples.get(key);if(list.length!==1||t.palettes.size!==1)continue;constraints.push([list[0],[...t.palettes][0]]);}
  if(constraints.length<3)return [];
  const maxId=Math.max(...constraints.map(c=>c[0])),start=layout.prgStart,end=layout.prgStart+layout.prgBytes,out=[];
  for(const [name,decode] of Object.entries(DECODERS))for(let a=start;a+maxId<end;a++){
    let ok=true;for(const [id,p] of constraints)if(decode(rom[a+id])!==p){ok=false;break;}
    if(!ok)continue;let read=0;for(const [id] of constraints)if(access&&access[a+id-start]&DATA)read++;
    out.push({physical:a,decode:name,constraints:constraints.length,traceSupport:access?read/constraints.length:null});
  }
  // the reading instruction's operand names the array base when the index register holds the record index
  for(const c of out){c.instructions=[];if(!events)continue;
    for(const e of events){if(e[1]!==0||e[5]<c.physical||e[5]>c.physical+maxId)continue;const pc=e[3],op=rom[pc];if(!INDEXED.has(op))continue;const operand=rom[pc+1]|(rom[pc+2]<<8);if(cpuToPhysical(operand,layout)===c.physical&&!c.instructions.some(i=>i.pcPhysical===pc))c.instructions.push({pcPhysical:pc,cpuPc:e[2],opcode:op,operand});}}
  return out.sort((a,b)=>(b.instructions.length>0)-(a.instructions.length>0)||(b.traceSupport||0)-(a.traceSupport||0)||a.physical-b.physical);
}

// ---------- interventions ----------
// A falsifiable test of one candidate: change one tile byte of one record that appears exactly once in the candidate,
// and predict exactly which nametable cells change, to what, in every capture.
function planTileIntervention(w,rom,layout){
  const keys=[...w.byKey.entries()].filter(([,ps])=>ps.length===1).map(([key])=>key);
  if(!keys.length)return null;
  const best=keys.map(k=>w.tuples.get(k)).sort((a,b)=>b.cells.length-a.cells.length||a.cells[0].screen-b.cells[0].screen||(a.key<b.key?-1:1))[0];
  const p=w.byKey.get(best.key)[0],f=ORDERS[w.hypothesis.order].TL,offset=layout.prgStart+p+f*w.hypothesis.fieldStep,expected=rom[offset];
  let value=expected^1;if(!value)value=expected^2;
  const predict=best.cells.map(c=>({label:c.label,index:(2*c.my+w.grid.y)*32+2*c.mx+w.grid.x,value}));
  return {kind:'tile',candidate:w.id,key:best.key,mutation:{offset,expected,value},predict};
}
function planAttributeIntervention(w,array,rom,layout,captureAttributes){
  const ids=indexMap(w,layout);
  const choice=[...ids.entries()].filter(([key,list])=>list.length===1&&w.tuples.get(key).palettes.size===1).map(([key,list])=>({key,id:list[0],t:w.tuples.get(key)})).sort((a,b)=>b.t.cells.length-a.t.cells.length||a.id-b.id)[0];
  if(!choice)return null;
  const offset=array.physical+choice.id,expected=rom[offset],p=DECODERS[array.decode](expected),q=(p+1)&3,value=ENCODERS[array.decode](expected,q);
  const predict=[];
  for(const c of choice.t.cells){const attrs=captureAttributes.get(c.label);if(!attrs)continue;const index=(c.my>>1)*8+(c.mx>>1),shift=((c.my&1)<<2)|((c.mx&1)<<1);
    const prior=predict.find(x=>x.label===c.label&&x.index===960+index),before=prior?prior.value:attrs[index];const v=(before&~(3<<shift))|(q<<shift);
    if(prior)prior.value=v;else predict.push({label:c.label,index:960+index,value:v});}
  return {kind:'attribute',candidate:w.id,key:choice.key,id:choice.id,mutation:{offset,expected,value},predict};
}
// Compare an intervention's prediction with what the variant run showed (visible nametable + attributes per capture).
function judge(prediction,baseline,variant){
  const changed=[],expect=new Map(prediction.predict.map(x=>[x.label+':'+x.index,x.value]));
  for(const [label,b] of baseline){const v=variant.get(label);if(!v)return {result:'inconclusive',reason:'capture '+label+' missing in the variant run'};
    for(let i=0;i<1024;i++){const before=i<960?b.tiles[i]:b.attributes[i-960],after=i<960?v.tiles[i]:v.attributes[i-960];if(before!==after)changed.push({label,index:i,before,after});}}
  if(!changed.length)return {result:'falsified',reason:'no effect: nothing on screen changed',changed:0,predicted:expect.size};
  const unexpected=changed.filter(c=>expect.get(c.label+':'+c.index)!==c.after),missing=[...expect.keys()].filter(k=>!changed.some(c=>c.label+':'+c.index===k));
  if(!unexpected.length&&!missing.length)return {result:'supported',changed:changed.length,predicted:expect.size};
  return {result:'falsified',reason:'the effect differs from the prediction',changed:changed.length,predicted:expect.size,unexpected:unexpected.slice(0,16),missing:missing.length};
}

// ---------- the candidate definition (data only) ----------
function define({w,array,interventions,repeatability,rom,layout,evidence}){
  const ids=indexMap(w,layout),known=[...new Set([...ids.values()].flat())].sort((a,b)=>a-b);
  const h=w.hypothesis,aliasGroups=[];
  for(const [key,list] of ids)if(list.length>1){const t=w.tuples.get(key);aliasGroups.push({ids:list.slice().sort((a,b)=>a-b),resolvedBy:array&&new Set(list.map(id=>DECODERS[array.decode](rom[array.physical+id]))).size===list.length?'attribute palette':'none (identical record and palette)',observedPalettes:[...t.palettes].sort()});}
  return {format:'NESForgeCandidateDefinition',version:1,kind:'metatile-table-2x2',status:'candidate',hypothesis:'supported',
    source:{sha256:evidence.sourceSha256,byteLength:rom.length},
    table:{layout:h.layout,order:h.order,physicalBase:w.base.physical,cpuBase:w.base.cpuBase??null,recordStep:h.recordStep,fieldStep:h.fieldStep,grid:{x:w.grid.x,y:w.grid.y},
      baseEvidence:{method:w.base.method,votes:w.base.votes,instructions:w.base.instructions.map(i=>({cpuPc:i.cpuPc,pcPhysical:i.pcPhysical,opcode:i.opcode,operand:i.operand,field:i.field}))}},
    attributes:array?{physicalBase:array.physical,decode:array.decode,evidence:array.instructions.length?'operand of the indexed instruction that reads it':'consistent with every observed palette',instructions:array.instructions.slice(0,4)}:null,
    extent:{knownIds:known,lowest:known[0],highest:known[known.length-1],claim:'records 0 through the highest observed ID are one table; records past it are not claimed'},
    aliases:aliasGroups,
    evidence:{plans:evidence.plans,interventions:interventions.map(i=>({kind:i.kind,candidate:i.candidate,mutation:i.mutation,result:i.judgement.result,receipt:i.receiptHash}))},
    verification:{repeatability,interventions:interventions.filter(i=>i.judgement.result==='supported').length+' supported, '+interventions.filter(i=>i.judgement.result!=='supported').length+' not',independent:'not performed'},
    limitations:['NROM, unscrolled screens and 2x2 metatiles only (slice 1)','a same-engine result: repeatability and interventions in the same emulator are not independent verification','record meanings beyond their four tiles and palette are not inferred']};
}

// ---------- reconstruction of a screen from a definition ----------
function decodeRecord(def,rom,id){const t=def.table,f=ORDERS[t.order],at=t.physicalBase+id*t.recordStep,r=QUADS.map(q=>rom[at+f[q]*t.fieldStep]);return r;}
function reconstruct(def,rom,layout,capture){
  const v=visible(capture);if(!v.supported)return {supported:false,reason:v.reason};
  const t=def.table,known=new Set(def.extent.knownIds),highest=def.extent.highest,limit=t.layout==='split'?t.fieldStep:LIMITS.maxRecords,prgEnd=layout.prgStart+layout.prgBytes;
  const fits=id=>t.physicalBase+id*t.recordStep+3*t.fieldStep<prgEnd;
  const index=new Map(),beyond=new Map();
  for(let id=0;id<=highest;id++){const key=decodeRecord(def,rom,id).join(',');if(!index.has(key))index.set(key,[]);index.get(key).push(id);}
  for(let id=highest+1;id<limit&&fits(id);id++){const key=decodeRecord(def,rom,id).join(',');if(!beyond.has(key))beyond.set(key,[]);beyond.get(key).push(id);}
  const pal=def.attributes?id=>DECODERS[def.attributes.decode](rom[def.attributes.physicalBase+id]):null;
  const cells=[],counts={observed:0,interior:0,resolved:0,ambiguous:0,extended:0,unknown:0};
  for(let my=0;my<15;my++)for(let mx=0;mx<16;mx++){
    const x=2*mx+t.grid.x,y=2*my+t.grid.y,tl=v.tiles,key=[tl[y*32+x],tl[y*32+x+1],tl[(y+1)*32+x],tl[(y+1)*32+x+1]].join(','),observedPalette=paletteAt(v.attributes,mx,my);
    let ids=index.get(key)||[],status;
    if(ids.length===1)status=known.has(ids[0])?'observed':'interior';
    else if(ids.length>1){const byPalette=pal?ids.filter(id=>pal(id)===observedPalette):ids;if(byPalette.length===1){ids=byPalette;status='resolved';}else{ids=byPalette.length?byPalette:ids;status='ambiguous';}}
    else{const more=beyond.get(key)||[];if(more.length===1){ids=more;status='extended';}else{ids=[];status='unknown';}}
    counts[status]++;cells.push({mx,my,status,ids});
  }
  // attribute bytes predicted from the definition's palette array; bits of unknown cells stay unknown
  const attributes=[];
  for(let ay=0;ay<8;ay++)for(let ax=0;ax<8;ax++){let value=0,mask=0;
    for(const [dy,dx,shift] of [[0,0,0],[0,1,2],[1,0,4],[1,1,6]]){const my=2*ay+dy,mx=2*ax+dx;if(my>=15)continue; // rows past the screen: not drawn, not claimed
      const c=cells[my*16+mx];if(!pal||!c.ids.length)continue;const ps=new Set(c.ids.map(pal));if(ps.size!==1)continue;value|=[...ps][0]<<shift;mask|=3<<shift;}
    attributes.push({index:ay*8+ax,value,knownMask:mask});}
  return {supported:true,cells,attributes,counts};
}

return Object.freeze({version:VERSION,LIMITS,ORDERS,visible,tuples,propose,attributeArrays,planTileIntervention,planAttributeIntervention,judge,define,decodeRecord,reconstruct,physicalNametable,paletteAt});
});
