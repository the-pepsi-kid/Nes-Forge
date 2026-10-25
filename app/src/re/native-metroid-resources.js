/* Original ordered structure projection; exact source revision only.
 * Independent implementation of nmikstas/metroid-disassembly 4270d57
 * Bank07 EA60/EF13/EF9E/EFF8 and C604..C6BF. No ROM data is embedded. */
(function(root,factory){if(typeof module!=='undefined'&&module.exports)module.exports=factory(require('./native-megaman-resources.js'));else root.NativePRGResources=factory(root.NativePRGResources);})(typeof globalThis!=='undefined'?globalThis:this,function(parent){
'use strict';
const fail=m=>{throw Error('Metroid native resources: '+m);};
const integer=(v,min,max)=>{if(!Number.isInteger(v)||v<min||v>max)fail('Invalid native index');return v;};
const profile=Object.freeze({...{"id":"metroid-us-structures-v1","kind":"metroid","sha256":"c5eea06e1e1128b576bd789f1a4f63bb154d6d31579c2f319382fb77a72d34a6","byteLength":131088,"protectedSha256":"423ddb56014468509c7745e7550fb620e5b3e27b8ef95494636a9b305144e6dc"},spans:Object.freeze([[25682,12],[25701,6],[25709,18],[25745,36],[25804,36],[25854,39],[25909,33],[25963,33],[26008,48],[26058,27],[26094,51],[26150,27],[26182,33],[26226,33],[26270,21],[26306,27],[26348,45],[26406,27],[26445,24],[26489,24],[26524,12],[26548,30],[26593,24],[26626,36],[26668,48],[26732,36],[26780,27],[26818,42],[26872,36],[26913,21],[26940,51],[27004,27],[27048,30],[27095,33],[27143,33],[27185,36],[27239,60],[27317,51],[27383,33],[27434,36],[27481,30],[27522,21],[27555,33],[27600,93],[27701,36],[27742,24],[27771,21],[41916,12],[41935,6],[41943,48],[41993,48],[42048,63],[42116,51],[42172,72],[42246,48],[42296,42],[42352,45],[42409,54],[42474,51],[42536,30],[42575,48],[42633,36],[42683,39],[42736,33],[42783,54],[42842,39],[42895,36],[42948,42],[42999,54],[43068,24],[43107,30],[43152,36],[43203,36],[43245,30],[43290,45],[43352,39],[43402,39],[43452,30],[43494,33],[43536,45],[43598,33],[43648,39],[43704,30],[43749,45],[43806,30],[43845,45],[43905,45],[43958,39],[44011,36],[44062,36],[44115,33],[44163,33],[44202,30],[59584,12],[59598,6],[59606,51],[59659,45],[59706,51],[59759,21],[59782,15],[59809,18],[59836,24],[59872,30],[59907,51],[59972,54],[60038,48],[60095,48],[60148,45],[60195,54],[60251,48],[60301,36],[60342,36],[60383,24],[60416,30],[74440,12],[74454,6],[74462,57],[74521,51],[74582,54],[74649,36],[74697,60],[74770,51],[74835,51],[74895,36],[74942,42],[74995,48],[75045,57],[75113,51],[75169,45],[75216,27],[75257,36],[75352,48],[75412,36],[75462,21],[75498,48],[75556,36],[75606,45],[75665,33],[75715,66],[75783,63],[75856,90],[75956,21],[75992,84],[76084,36],[76128,24],[76163,21],[76193,36],[76239,54],[76303,45],[76356,42],[90704,6],[90712,42],[90756,36],[90799,18],[90819,48],[90869,36],[90912,45],[90974,39],[91028,42],[91081,45],[91146,33],[91194,33],[91238,48],[91293,48],[91348,39],[91399,33],[91446,39],[91494,66],[91570,48],[91638,33],[91689,42],[91748,27],[91789,33],[91834,33],[91879,27],[91920,30],[91965,54],[92028,33],[92078,33],[92128,30],[92173,30],[92215,21],[92250,18],[92280,21],[92318,33],[92368,27],[92413,45],[92475,36],[92526,21],[92556,30],[92598,21]].map(([offset,length])=>Object.freeze({offset,length})))});
const tables=[[1,"Brinstar",41748,41842,41942,44784],[2,"Norfair",41499,41591,41689,44780],[3,"Tourian",42961,43003,43067,44617],[4,"Kraid hideout",41429,41503,41581,44082],[5,"Ridley hideout",41343,41427,41485,43811]];
const initialGfx=[[3,4,5,6,25,22],[4,5,7,8,9,25,22],[5,10,11,12,13,14,26,28,25,22],[4,5,10,15,16,17,25,22],[4,5,10,18,19,25,22]];
const offset=(bank,addr)=>16+bank*16384+integer(addr,0x8000,0xbfff)-0x8000;
const word=(b,o)=>b[o]|(b[o+1]<<8);
function graphics(bytes,bank){
 integer(bank,1,5);const patterns=new Uint8Array(8192),written=new Uint8Array(8192);
 for(const id of initialGfx[bank-1]){const t=16+7*16384+0x6e0+id*7,src=offset(bytes[t],word(bytes,t+1)),dst=word(bytes,t+3),n=word(bytes,t+5);integer(dst,0,8191);integer(n,1,8192-dst);if((src-16)%16384+n>16384)fail('Graphics cross a source bank');patterns.set(bytes.slice(src,src+n),dst);written.fill(1,dst,dst+n);}
 const p=offset(bank,word(bytes,offset(bank,0x9560)));
 // All five exact initial streams are a single literal 32-color palette.
 if(bytes[p]!==0x3f||bytes[p+1]!==0||bytes[p+2]!==32||bytes[p+35]!==0)fail('Unsupported initial palette command');
 const palette=Array.from({length:4},(_,i)=>Array.from(bytes.slice(p+3+i*4,p+7+i*4)));
 if(palette.flat().some(v=>v>63)||palette.some(v=>v[0]!==palette[0][0]))fail('Invalid palette');
 return {patterns,written,palette,chr:parent.bitplanes(patterns.slice(4096))};
}
function draw(bytes,bank,objects,structures,macroAddress,basePalette){
 const ram=Array(1024).fill(255);ram.fill(basePalette*85,960);let overlapRetentions=0;
 for(const o of objects){let work=(o.position>>4)*64+(o.position&15)*2,ptr=structures[o.structure],rows=0;
  for(;;){if(++rows>128)fail('Unbounded structure');const head=bytes[ptr];if(head===255)break;const count=(head&15)||16;let at=work+(head>>4)*2;
   for(let j=0;j<count;j++){
    if(at>=928){ptr=-1;break;}
    const macro=bytes[ptr+1+j];integer(macro,0,63);const m=offset(bank,macroAddress)+macro*4;
    for(const [k,d]of [0,1,32,33].entries())ram[at+d]=bytes[m+k];
    const x=at&31,y=at>>5,ai=960+(y>>2)*8+(x>>2),shift=(((y>>1)&1)*2+((x>>1)&1))*2;
    if(o.palette!==basePalette)ram[ai]=(ram[ai]&~(3<<shift))|(o.palette<<shift);
    else if(((ram[ai]>>shift)&3)!==basePalette)overlapRetentions++;
    at+=2;if(!(at&31))break;
   }
   if(ptr===-1)break;ptr+=count+1;work+=64;
  }
 }
 return {nt:ram.slice(0,960),attr:ram.slice(960),overlapRetentions};
}
function inspect(bytes,p){
 if(p!==profile)return parent.inspect(bytes,p);if(!(bytes instanceof Uint8Array)||bytes.length!==p.byteLength)fail('Unsupported input');
 const layouts=[],resources=[];
 for(const [bank,name,rp,sp,ip,mp]of tables){
  const base=16+bank*16384-0x8000,g=graphics(bytes,bank),structures=Array.from({length:(ip-sp)/2},(_,i)=>base+word(bytes,base+sp+i*2)),owners=new Map();
  for(let room=0;room<(sp-rp)/2;room++){
   const start=base+word(bytes,base+rp+room*2),pal=integer(bytes[start],0,3),objects=[];let q=start+1;
   while(bytes[q]<253){if(objects.length>=128||q+3>Math.min(...structures))fail('Unbounded room');integer(bytes[q]>>4,0,14);integer(bytes[q+1],0,structures.length-1);integer(bytes[q+2],0,3);objects.push({position:bytes[q],structure:bytes[q+1],palette:bytes[q+2],offset:q});q+=3;}
   if(![253,255].includes(bytes[q]))fail('Unsupported room object terminator');
   const span=p.spans.find(s=>s.offset===start+1);if(!span||span.length!==q-start-1)fail('Room exceeds verified object span');
   let l=owners.get(start);if(!l){l={id:'layout:'+start.toString(16),offset:start+1,length:q-start-1,codec:'metroid-objects',columns:objects.length,rows:1,blockCount:structures.length,cells:objects.map(o=>o.structure)};owners.set(start,l);layouts.push(l);}
   const projection=draw(bytes,bank,objects,structures,mp,pal),available=projection.nt.every(t=>Array.from({length:16},(_,i)=>g.written[4096+t*16+i]).every(Boolean));
   resources.push({id:'metroid:'+bank+':'+room,label:name+' · source room '+room,group:name+' · initial background',layoutId:l.id,columns:16,rows:15,blockPixels:16,blocks:Array.from({length:structures.length},(_,id)=>({id})),editMode:'objects',objects,chr:g.chr,palette:g.palette,width:256,height:240,available,projection,bank,room,reason:available?'Ordered native structures with original clipping and palette overlap. Replace a listed structure at its preserved position and palette. Aliased room slots share edits. Doors, items, enemies, world placement, collision rules, animation and Audio remain unresolved.':'A referenced background tile has no verified initial graphics write; this room is unavailable.'});
  }
 }
 return {profile:p,layouts,resources,totalCells:layouts.reduce((n,l)=>n+l.cells.length,0)};
}
function projectPage(c,id,page){if(c.profile!==profile)return parent.projectPage(c,id,page);const r=c.resources.find(r=>r.id===id);if(!r?.available)fail(r?.reason||'Unknown room');integer(page,0,0);return {resource:r,page:parent.pages(r)[0],nt:r.projection.nt.slice(),attr:r.projection.attr.slice()};}
function encode(bytes,c,edits){
 if(c.profile!==profile)return parent.encode(bytes,c,edits);if(!Array.isArray(edits)||edits.length>c.totalCells)fail('Invalid recipe');const out=bytes.slice(),seen=new Set();
 for(const e of edits){if(!e||Object.keys(e).sort().join(',')!=='block,cell,layoutId')fail('Invalid structure recipe');const l=c.layouts.find(l=>l.id===e.layoutId);if(!l)fail('Unknown native room');integer(e.cell,0,l.cells.length-1);integer(e.block,0,l.blockCount-1);const key=l.id+':'+e.cell;if(seen.has(key))fail('Duplicate native object');seen.add(key);out[l.offset+e.cell*3+1]=e.block;}
 const changes=[];for(let i=0;i<out.length;i++)if(out[i]!==bytes[i])changes.push({offset:i,before:bytes[i],after:out[i]});return {bytes:out,changes};
}
return Object.freeze({...parent,profiles:Object.freeze([...parent.profiles,profile]),inspect,projectPage,encode,metroidGraphics:graphics,metroidDraw:draw});
});
