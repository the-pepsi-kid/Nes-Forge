/* Revision-bound Mega Man resource adapter. Independent implementation from
 * original loader behavior; no external graphics, palettes or engine code.
 * References: TheRealQuantam/mm1dasm c567d8c, bank7.s C39C/C483/C75B/CCDF/CED7;
 * CadEditor b28316d Settings_MegaMan-1.cs supplied an initial format lead.
 * The physical source header is retained; runtime mapper selection is separate. */
(function(root,factory){
 if(typeof module!=='undefined'&&module.exports)module.exports=factory(require('./native-prg-resources.js'));
 else root.NativePRGResources=factory(root.NativePRGResources);
})(typeof globalThis!=='undefined'?globalThis:this,function(parent){
'use strict';
const fail=m=>{throw Error('Mega Man native resources: '+m);};
const profile=Object.freeze({id:'megaman-us-prg-layout-v1',kind:'megaman',
 sha256:'1c8885892051d79db757746e2281f417cd5b156a86988b0010ad95d7bd4276c5',
 protectedSha256:'56a3e42f75bae78df607a50c6ed1ab8b0794533d5c05aca487b8c4e2c590cb64',byteLength:131088,
 spans:Object.freeze([32,29,24,30,26,26].map((count,bank)=>Object.freeze({offset:16+bank*16384+0x3c0,length:count*64})))});
function integer(v,min,max){if(!Number.isInteger(v)||v<min||v>max)fail('Invalid source index');return v;}
function range(bytes,offset,length){integer(offset,16,bytes.length);integer(length,0,bytes.length-offset);return bytes.slice(offset,offset+length);}
function graphics(bytes,stage){
 integer(stage,0,9);const bank=stage<6?stage:stage-6,table=16+bank*16384+(stage<6?0xd00:0xd20),count=bytes[table];integer(count,1,15);
 const patterns=new Uint8Array(8192),spans=[];let dest=0;
 for(let i=0;i<count;i++){
  const tag=bytes[table+1+i*2],length=bytes[table+2+i*2]*256;
  integer(length,256,8192-dest);const offset=16+(tag&3)*16384+(tag>>2)*256;
  if((tag>>2)*256+length>16384)fail('Pattern read crosses its native bank');
  patterns.set(range(bytes,offset,length),dest);spans.push({offset,length,destination:dest});dest+=length;
 }
 if(dest!==8192)fail('Initial pattern state does not fill both native pattern tables');
 const paletteOffset=16+bank*16384+(stage<6?0xca0:0xcd0),palette=Array.from({length:4},(_,i)=>Array.from(range(bytes,paletteOffset+i*4,4)));
 if(palette.flat().some(v=>v>63)||palette.some(p=>p[0]!==palette[0][0]))fail('Unsupported initial palette state');
 return {patterns,spans,palette,paletteOffset,chr:parent.bitplanes(patterns.slice(4096))};
}
function inspect(bytes,p){
 if(p!==profile)return parent.inspect(bytes,p);
 if(!(bytes instanceof Uint8Array)||bytes.length!==p.byteLength)fail('Unsupported source format');
 const layouts=[],resources=[],banks=[];
 for(let bank=0;bank<6;bank++){
  const base=16+bank*16384,blocks=Array.from({length:192},(_,id)=>{
   const tiles=[],palettes=[],at=bytes[base+0x300+id];
   for(let y=0;y<4;y++)for(let x=0;x<4;x++){
    // Native 16-pixel quadrants and their 8-pixel tiles are column-major.
    const q=(x>>1)*2+(y>>1),small=bytes[base+id*4+q]&63;
    tiles.push(small*4+(x&1)*2+(y&1));palettes.push((at>>(((y>>1)*2+(x>>1))*2))&3);
   }
   return {id,tiles,palettes};
  }),rooms=[],owners=new Map();
  for(let room=0;room<32;room++){
   const pointer=bytes[base+0xc30+room*2]|(bytes[base+0xc31+room*2]<<8);
   integer(pointer,0x83c0,0x8b80);if((pointer-0x83c0)%64)fail('Unaligned room pointer');
   const offset=base+pointer-0x8000,cells=Array.from({length:64},(_,i)=>bytes[offset+(i%8)*8+Math.floor(i/8)]);
   if(cells.some(v=>v>=blocks.length)){rooms.push({room,layoutId:'unavailable:'+bank+':'+room,available:false});continue;}
   let l=owners.get(offset);if(!l){l={id:'layout:'+offset.toString(16),offset,length:64,codec:'megaman-column',columns:8,rows:8,blockCount:192,cells};owners.set(offset,l);layouts.push(l);}
   rooms.push({room,layoutId:l.id,available:true});
  }
  banks.push({blocks,rooms});
 }
 const names=['Cut Man','Ice Man','Bomb Man','Fire Man','Elec Man','Guts Man','Wily 1','Wily 2','Wily 3','Wily 4'];
 for(let stage=0;stage<10;stage++){
  const bank=stage<6?stage:stage-6,g=graphics(bytes,stage),b=banks[bank];
  for(const r of b.rooms)resources.push({id:'megaman:'+stage+':'+r.room,
   label:names[stage]+' · source room '+r.room,group:names[stage]+' · initial graphics state',
   layoutId:r.layoutId,columns:8,rows:8,blockPixels:32,blocks:b.blocks,chr:g.chr,palette:g.palette,
   width:256,height:256,available:r.available,
   reason:r.available?'Source room pointer and initial stage graphics/palette. Pointer slots include aliases and unused rooms; route order, dynamic objects, palette changes, collision semantics, sprites, menus and Audio remain unresolved. The original legacy header is preserved; playback mapping requires separate verification.':'Unused or unresolved pointer slot references data outside the verified native block set; materialization is refused.'});
 }
 return {profile:p,layouts,resources,totalCells:layouts.reduce((n,l)=>n+l.cells.length,0)};
}
function encode(bytes,catalog,edits){
 if(catalog.profile!==profile)return parent.encode(bytes,catalog,edits);
 if(!(bytes instanceof Uint8Array)||bytes.length!==profile.byteLength||!Array.isArray(edits)||edits.length>catalog.totalCells)fail('Invalid native edit collection');
 const output=bytes.slice(),seen=new Set();
 for(const e of edits){
  if(!e||Object.keys(e).sort().join(',')!=='block,cell,layoutId')fail('Invalid native cell recipe');
  const l=catalog.layouts.find(v=>v.id===e.layoutId);if(!l)fail('Unknown native layout');
  integer(e.cell,0,63);integer(e.block,0,191);const key=l.id+':'+e.cell;if(seen.has(key))fail('Duplicate native cell recipe');seen.add(key);
  const offset=l.offset+(e.cell%8)*8+Math.floor(e.cell/8);output[offset]=e.block;
 }
 const changes=[];for(let offset=0;offset<bytes.length;offset++)if(bytes[offset]!==output[offset])changes.push({offset,before:bytes[offset],after:output[offset]});
 return {bytes:output,changes};
}
return Object.freeze({...parent,profiles:Object.freeze([...parent.profiles,profile]),inspect,encode,megaManGraphics:graphics});
});
