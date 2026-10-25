/* River City Ransom US street backgrounds. Independent interpretation of
 * C230/C41C/C599 and E692; original code/data are read from the supplied ROM.
 * Shared physical tile bytes have one recipe owner across all street views.
 * The native 20-row background is cropped from game rows 4..23; HUD excluded. */
(function(root,factory){if(typeof module!=='undefined'&&module.exports)module.exports=factory(require('./native-lolo-resources.js'));else root.NativePRGResources=factory(root.NativePRGResources);})(typeof globalThis!=='undefined'?globalThis:this,function(parent){
'use strict';
const profile=Object.freeze({"id":"river-city-us-streets-v1","kind":"river-city","sha256":"b95f8def04c0012604b7cc68cf4ed8f49b2dfe4beda6182051de4b2423bea7b1","byteLength":262160,"protectedSha256":"c88ebeb60736a78a0942f1652d74b62c67a6cfce0f5d3474366559239d3f817d","spans":[{"offset":1516,"length":448},{"offset":2028,"length":256},{"offset":2348,"length":480},{"offset":2892,"length":384},{"offset":3340,"length":384},{"offset":3788,"length":256},{"offset":4108,"length":384},{"offset":4556,"length":416},{"offset":5036,"length":448},{"offset":5548,"length":384},{"offset":5996,"length":480},{"offset":6540,"length":512},{"offset":7116,"length":416},{"offset":7596,"length":538},{"offset":8198,"length":640},{"offset":8902,"length":640},{"offset":9606,"length":640},{"offset":10310,"length":640},{"offset":11014,"length":640},{"offset":11718,"length":640},{"offset":12422,"length":416},{"offset":12902,"length":320},{"offset":13286,"length":256},{"offset":13606,"length":449},{"offset":14119,"length":434}]}),fail=m=>{throw Error('River City native streets: '+m);},int=(n,a,b)=>{if(!Number.isInteger(n)||n<a||n>b)fail('Invalid native coordinate or tile');return n;};
function inspect(bytes,p){
 if(p!==profile)return parent.inspect(bytes,p);
 if(!(bytes instanceof Uint8Array)||bytes.length!==profile.byteLength||bytes[4]!==8||bytes[5]!==16||bytes[6]!==0x40||bytes[7]!==0)fail('Unsupported source header');
 const off=(bank,cpu)=>16+int(bank,0,7)*16384+(int(cpu,0x8000,0xffff)&16383),b=(bank,cpu)=>bytes[off(bank,cpu)],w=(bank,cpu)=>b(bank,cpu)|(b(bank,cpu+1)<<8),fixed=cpu=>b(7,cpu);
 const resources=[],used=new Set(),blocked=new Set(),working=[];
 const reason='Native street background only: game rows 4–23 are shown at Scene rows 0–19; HUD and other margins are excluded. Substitute original 8×8 tile indices; physical aliases update together. Collision, exits, actors, sprites, animation and interiors are not editable. Audio is available separately in the ROM Audio Library.';
 for(let loc=0;loc<35;loc++){
  const table=0xc599+loc*3,base=w(7,table),type=fixed(table+2),group='Source location '+loc;
  if(type!==255){resources.push({id:'river-city:'+loc,label:group+' · interior/special unresolved',group,layoutId:'layout:rcr-tiles',columns:32,rows:20,blockPixels:8,width:256,height:160,available:false,reason:'This location uses a different compressed interior/special-screen path. It is retained in source; no street image is substituted.'});continue;}
  const left=w(0,0xb9ec+loc*4),right=w(0,0xb9ee+loc*4)+256;int(right-left,256,1024);
  for(let page=0;page<Math.ceil((right-left)/256);page++){
   const header=base+page*7;int(header,0xc602,0xc6f7);const rows=w(7,header),attrs=w(7,header+2),bank=fixed(header+6)&3,pal=fixed(header+4),chr=fixed(header+5);
   int(rows,0x8000,0xbfc4);int(attrs,0x8000,0xbfc0);int(chr,0,124);if(chr&1)fail('Unsupported CHR pair');
   for(let i=0;i<60;i++)blocked.add(off(bank,rows+i));for(let i=0;i<64;i++)blocked.add(off(bank,attrs+i));
   const offsets=[];for(let y=4;y<24;y++){const ptr=w(bank,rows+y*2);int(ptr,0x8000,0xbfe0);for(let x=0;x<32;x++){const o=off(bank,ptr+x);offsets.push(o);used.add(o);}}
   const palettePointer=w(7,0xe6f1+pal*2);int(palettePointer,0xe7a9,0xe9e9);const palette=Array.from({length:4},(_,i)=>Array.from({length:4},(_,j)=>fixed(palettePointer+i*4+j)));if(palette.flat().some(v=>v>63))fail('Unsupported palette');
   const attr=Array(64).fill(0);for(let i=0;i<40;i++)attr[i]=b(bank,attrs+8+i);
   const graphics=parent.bitplanes(bytes.slice(0x20010+chr*1024,0x20010+chr*1024+4096)),blocks=Array.from({length:256},(_,id)=>({id,tiles:[id],palettes:[0],label:'Tile '+id}));
   const r={id:'river-city:'+loc+':'+page,label:group+' · street segment '+page,group,layoutId:'layout:rcr-tiles',columns:32,rows:20,blockPixels:8,blocks,chr:graphics,palette,width:256,height:160,available:true,reason,loc,segment:page,header,sourceBank:bank,rowsPointer:rows,attrsPointer:attrs,chrPage:chr,paletteId:pal,projection:{nt:[...offsets.map(o=>bytes[o]),...Array(320).fill(0)],attr}};resources.push(r);working.push({r,offsets});
  }
 }
 const offsets=[...used].sort((a,b)=>a-b),index=new Map(offsets.map((o,i)=>[o,i])),writable=new Set(profile.spans.flatMap(s=>Array.from({length:s.length},(_,i)=>s.offset+i)));
 for(const {r,offsets:source}of working)r.cellMap=source.map(o=>index.get(o));
 for(const o of offsets)if(writable.has(o)&&blocked.has(o))fail('A protected metadata alias entered the writer');
 const layout={id:'layout:rcr-tiles',offset:offsets[0],length:offsets.at(-1)-offsets[0]+1,codec:'shared-physical-tiles',columns:offsets.length,rows:1,blockCount:256,cells:offsets.map(o=>bytes[o]),offsets,writable:offsets.map(o=>writable.has(o))};
 return {profile,resources,layouts:[layout],totalCells:offsets.length};
}
function projectPage(c,id,page){if(c.profile!==profile)return parent.projectPage(c,id,page);int(page,0,0);const r=c.resources.find(r=>r.id===id);if(!r?.available)fail('This source location is unresolved');return {resource:r,page:parent.pages(r)[0],nt:r.projection.nt.slice(),attr:r.projection.attr.slice()};}
function encode(bytes,c,edits){
 if(c.profile!==profile)return parent.encode(bytes,c,edits);if(!Array.isArray(edits)||edits.length>c.totalCells)fail('Invalid tile recipes');const l=c.layouts[0],out=bytes.slice(),seen=new Set();
 for(const e of edits){if(!e||Object.keys(e).sort().join(',')!=='block,cell,layoutId'||e.layoutId!==l.id)fail('Invalid tile recipe');int(e.cell,0,l.cells.length-1);int(e.block,0,255);if(!l.writable[e.cell])fail('This tile byte aliases protected metadata and is read-only');if(seen.has(e.cell))fail('Duplicate physical tile recipe');seen.add(e.cell);out[l.offsets[e.cell]]=e.block;}
 const changes=[];for(let i=0;i<out.length;i++)if(out[i]!==bytes[i])changes.push({offset:i,before:bytes[i],after:out[i]});return {bytes:out,changes};
}
return Object.freeze({...parent,profiles:Object.freeze([...parent.profiles,profile]),inspect,projectPage,encode});
});
