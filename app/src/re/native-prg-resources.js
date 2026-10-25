/* Exact-revision PRG resource decoders. Shared layout/Scene projection and
 * bounded native recipes; no captured viewports or inferred actor behavior.
 * Independent format implementation, native-loader evidence in reviews. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.NativePRGResources=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const profiles=Object.freeze([{"id":"contra-us-prg-layout-v1","kind":"contra","sha256":"26541a5550ee22deeb3d5484e4a96130219b58cff74d068fb1eb6567fa5e5519","byteLength":131088,"protectedSha256":"b2ecfcc12c9b0438f3f596f4bcf47a345862df93eada19221d937a0b432e82b5","spans":[{"offset":32813,"length":43},{"offset":32856,"length":49},{"offset":32905,"length":46},{"offset":32951,"length":40},{"offset":32991,"length":45},{"offset":33036,"length":28},{"offset":33064,"length":26},{"offset":33090,"length":23},{"offset":33113,"length":32},{"offset":33145,"length":40},{"offset":33185,"length":31},{"offset":33216,"length":38},{"offset":33254,"length":48},{"offset":33414,"length":46},{"offset":33460,"length":46},{"offset":33506,"length":46},{"offset":33552,"length":46},{"offset":33598,"length":46},{"offset":33644,"length":46},{"offset":33690,"length":54},{"offset":33744,"length":54},{"offset":33798,"length":54},{"offset":33852,"length":54},{"offset":33906,"length":54},{"offset":33960,"length":54},{"offset":34034,"length":2},{"offset":34036,"length":49},{"offset":34085,"length":28},{"offset":34113,"length":43},{"offset":34156,"length":61},{"offset":34217,"length":57},{"offset":34274,"length":59},{"offset":34333,"length":40},{"offset":34373,"length":50},{"offset":34423,"length":40},{"offset":34507,"length":38},{"offset":34545,"length":31},{"offset":34576,"length":51},{"offset":34627,"length":48},{"offset":34675,"length":47},{"offset":34722,"length":52},{"offset":34774,"length":52},{"offset":34826,"length":48},{"offset":34874,"length":39},{"offset":34913,"length":4},{"offset":34917,"length":14},{"offset":34931,"length":45},{"offset":34976,"length":52},{"offset":35028,"length":39},{"offset":35067,"length":35},{"offset":35102,"length":23},{"offset":35153,"length":50},{"offset":35203,"length":48},{"offset":35251,"length":50},{"offset":35301,"length":50},{"offset":35351,"length":54},{"offset":35405,"length":52},{"offset":35457,"length":54},{"offset":35511,"length":51},{"offset":35562,"length":52},{"offset":35614,"length":50},{"offset":35664,"length":36},{"offset":35700,"length":6},{"offset":35706,"length":23},{"offset":35761,"length":49},{"offset":35810,"length":38},{"offset":35848,"length":47},{"offset":35895,"length":49},{"offset":35944,"length":50},{"offset":35994,"length":29},{"offset":36023,"length":48},{"offset":36071,"length":44},{"offset":36115,"length":39},{"offset":36154,"length":46},{"offset":36200,"length":42},{"offset":36242,"length":52},{"offset":36294,"length":52},{"offset":36346,"length":38},{"offset":36384,"length":55},{"offset":36463,"length":47},{"offset":36510,"length":38},{"offset":36548,"length":51},{"offset":36599,"length":36},{"offset":36635,"length":38},{"offset":36673,"length":40},{"offset":36713,"length":47},{"offset":36760,"length":36},{"offset":36796,"length":45},{"offset":36841,"length":22},{"offset":36863,"length":36}]},{"id":"ff-us-prg-layout-v1","kind":"ff","sha256":"d360beeee19a69d1c92d02292167c57f2d3ca8405b79101fc8c2f39dea549667","byteLength":262160,"protectedSha256":"202068ae37c81fa7e9050110f81a7c5a3708012c492ad8bbb3ec296ff5fbbf18","spans":[{"offset":65680,"length":519},{"offset":66199,"length":945},{"offset":67144,"length":738},{"offset":67882,"length":710},{"offset":68592,"length":819},{"offset":69411,"length":1175},{"offset":70586,"length":971},{"offset":71557,"length":648},{"offset":72205,"length":633},{"offset":72838,"length":627},{"offset":73465,"length":644},{"offset":74109,"length":306},{"offset":74415,"length":714},{"offset":75129,"length":775},{"offset":75904,"length":455},{"offset":76359,"length":480},{"offset":76839,"length":919},{"offset":77758,"length":296},{"offset":78054,"length":1470},{"offset":79524,"length":487},{"offset":80011,"length":247},{"offset":80258,"length":270},{"offset":80528,"length":513},{"offset":81041,"length":629},{"offset":81670,"length":272},{"offset":81942,"length":405},{"offset":82347,"length":324},{"offset":82671,"length":1193},{"offset":83864,"length":1632},{"offset":85496,"length":860},{"offset":86356,"length":1024},{"offset":87380,"length":1106},{"offset":88486,"length":562},{"offset":89048,"length":880},{"offset":89928,"length":1324},{"offset":91252,"length":1029},{"offset":92281,"length":1480},{"offset":93761,"length":654},{"offset":94415,"length":921},{"offset":95336,"length":484},{"offset":95820,"length":702},{"offset":96522,"length":222},{"offset":96744,"length":839},{"offset":97583,"length":689},{"offset":98272,"length":819},{"offset":99091,"length":809},{"offset":99900,"length":789},{"offset":100689,"length":571},{"offset":101260,"length":717},{"offset":101977,"length":703},{"offset":102680,"length":855},{"offset":103535,"length":272},{"offset":103807,"length":646},{"offset":104453,"length":724},{"offset":105177,"length":678},{"offset":105855,"length":574},{"offset":106429,"length":998},{"offset":107427,"length":615},{"offset":108042,"length":670},{"offset":108712,"length":642},{"offset":109421,"length":317}]},{"id":"ff-us-alt-prg-layout-v1","kind":"ff","sha256":"fafb45c017ebfcc1af8149c2a61001ea2b0b134c1cbf0139c10b0597ba46c47c","byteLength":262160,"protectedSha256":"e2095b963dec723ff2018d6db9e026bbb676cd4faf329f8736173c514c458672","spans":[{"offset":65680,"length":519},{"offset":66199,"length":945},{"offset":67144,"length":738},{"offset":67882,"length":710},{"offset":68592,"length":819},{"offset":69411,"length":1175},{"offset":70586,"length":971},{"offset":71557,"length":648},{"offset":72205,"length":633},{"offset":72838,"length":627},{"offset":73465,"length":644},{"offset":74109,"length":306},{"offset":74415,"length":714},{"offset":75129,"length":775},{"offset":75904,"length":455},{"offset":76359,"length":480},{"offset":76839,"length":919},{"offset":77758,"length":296},{"offset":78054,"length":1470},{"offset":79524,"length":487},{"offset":80011,"length":247},{"offset":80258,"length":270},{"offset":80528,"length":513},{"offset":81041,"length":629},{"offset":81670,"length":272},{"offset":81942,"length":405},{"offset":82347,"length":324},{"offset":82671,"length":1193},{"offset":83864,"length":1632},{"offset":85496,"length":860},{"offset":86356,"length":1024},{"offset":87380,"length":1106},{"offset":88486,"length":562},{"offset":89048,"length":880},{"offset":89928,"length":1324},{"offset":91252,"length":1029},{"offset":92281,"length":1480},{"offset":93761,"length":654},{"offset":94415,"length":921},{"offset":95336,"length":484},{"offset":95820,"length":702},{"offset":96522,"length":222},{"offset":96744,"length":839},{"offset":97583,"length":689},{"offset":98272,"length":819},{"offset":99091,"length":809},{"offset":99900,"length":789},{"offset":100689,"length":571},{"offset":101260,"length":717},{"offset":101977,"length":703},{"offset":102680,"length":855},{"offset":103535,"length":272},{"offset":103807,"length":646},{"offset":104453,"length":724},{"offset":105177,"length":678},{"offset":105855,"length":574},{"offset":106429,"length":998},{"offset":107427,"length":615},{"offset":108042,"length":670},{"offset":108712,"length":642},{"offset":109421,"length":317}]}].map(p=>Object.freeze({...p,spans:Object.freeze(p.spans.map(Object.freeze))})));
const fail=m=>{throw Error('Native PRG resources: '+m);};
function integer(n,min,max){if(!Number.isInteger(n)||n<min||n>max)fail('invalid index');return n;}
function reader(bytes,start,end){integer(start,16,bytes.length);integer(end,start,bytes.length);let pos=start;return {get pos(){return pos;},read(){if(pos>=end)fail('compressed resource exceeds bounded source');return bytes[pos++];}};}
const word=(b,o)=>b[o]|(b[o+1]<<8);
function bitplanes(bytes){if(bytes.length%16)fail('partial pattern');return Array.from({length:bytes.length/16},(_,t)=>Array.from({length:8},(_,y)=>Array.from({length:8},(_,x)=>((bytes[t*16+y]>>(7-x))&1)|(((bytes[t*16+y+8]>>(7-x))&1)<<1))));}
function contraScreen(bytes,level,screen){
 integer(level,0,7);const h=0xb329+level*32,vertical=bytes[h+1]!==0,rows=vertical?8:7,table=word(bytes,h+2)+16;
 // Screen-table lengths are source facts from the pointer table, including
 // the final repeated sentinel record. They do not establish reachability.
 const counts=[14,24,10,32,22,14,16,12];integer(screen,0,counts[level]-1);
 const offset=word(bytes,table+screen*2)+16,r=reader(bytes,offset,0xc010),cells=[],commands=[];
 while(cells.length<8*rows){const start=r.pos,cmd=r.read();if(cmd<128){cells.push(cmd);commands.push({offset:start,kind:'literal',length:1});}
  else if(cmd<240){const n=cmd&127;if(!n)fail('unbounded repeat');const v=r.read();if(cells.length+n>8*rows)fail('screen repeat overflow');for(let k=0;k<n;k++)cells.push(v);commands.push({offset:start,kind:'repeat',length:n});}
  else{const row=(cmd&15)*8;if(row+8>cells.length)fail('screen row copy precedes source row');if(cells.length+8>8*rows)fail('screen row copy overflow');for(let k=0;k<8;k++)cells.push(cells[row+k]);commands.push({offset:start,kind:'row-copy',length:8});}}
 const blocks=0xc010+(word(bytes,h+4)-0x8000),attributes=0xc010+(word(bytes,h+6)-0x8000),nt=Array.from({length:rows*4},()=>Array(32).fill(0)),palettes=Array.from({length:rows*4},()=>Array(32).fill(0));
 for(let i=0;i<cells.length;i++){const id=cells[i],bx=(i%8)*4,by=(i>>3)*4;if(blocks+id*16+16>0x10010||attributes+id>=0x10010)fail('block definition out of bank');for(let y=0;y<4;y++)for(let x=0;x<4;x++){nt[by+y][bx+x]=bytes[blocks+id*16+y*4+x];palettes[by+y][bx+x]=(bytes[attributes+id]>>(((y>>1)*2+(x>>1))*2))&3;}}
 return {level,screen,offset,length:r.pos-offset,vertical,rows,cells,commands,nt,palettes,headerOffset:h,blockOffset:blocks,attributeOffset:attributes};
}
function contraGraphics(bytes,group){
 integer(group,0,12);const list=word(bytes,0x1c8f3+group*2)+0x10010,ppu=new Uint8Array(0x4000),written=new Uint8Array(0x4000),resources=[];
 let q=list;for(let j=0;j<32;j++){const id=bytes[q++];if(id===255)return {ppu,written,resources};integer(id,0,26);const table=0x1c960+id*3,ptr=word(bytes,table),flags=bytes[table+2],bank=(flags&7)||7,offset=bank*0x4000+(ptr&0x3fff)+16,r=reader(bytes,offset,(bank+1)*0x4000+16),flip=!!(flags&128);let dest=r.read()|(r.read()<<8),commands=0,total=0;
  if(flip){r.read();r.read();}
  const write=v=>{integer(dest,0,0x3fff);if(total++>=0x4000)fail('graphics write budget exceeded');if(flip){let a=0;for(let k=0;k<8;k++)a=(a<<1)|((v>>k)&1);v=a;}ppu[dest]=v;written[dest++]=1;};
  for(;;){if(++commands>0x4000)fail('graphics command budget exceeded');const cmd=r.read();if(cmd===255)break;if(cmd===127){dest=r.read()|(r.read()<<8);if(flip){r.read();r.read();}continue;}if(cmd&128){const n=cmd&127;if(!n)fail('zero literal graphics run');for(let k=0;k<n;k++)write(r.read());}else{const n=cmd||256,v=r.read();for(let k=0;k<n;k++)write(v);}}
  resources.push({id,offset,length:r.pos-offset,written:total});
 }fail('graphics list is unterminated');
}
function contraPalettes(bytes,level){integer(level,0,7);const h=0xb329+level*32;return Array.from({length:8},(_,i)=>[15,...bytes.slice(0x1d237+bytes[h+16+i]*3,0x1d237+bytes[h+16+i]*3+3)]);}
function ffMap(bytes,index,chrCache={}){
 integer(index,0,60);const table=0x10010,offset=table+word(bytes,table+index*2),r=reader(bytes,offset,0x20010),cells=[];let commands=0;
 for(;;){if(++commands>8192)fail('map command budget exceeded');const cmd=r.read();if(cmd===255)break;const n=(cmd&128)?(r.read()||256):1,tile=cmd&127;if(cells.length+n>4096)fail('map decompression exceeds 64 by 64');for(let i=0;i<n;i++)cells.push(tile);}
 if(cells.length!==4096)fail('map does not cover 64 by 64');const tileset=bytes[0x2cd0+index];integer(tileset,0,7);
 const chrOffset=0xc010+tileset*2048,chr=chrCache[tileset]||(chrCache[tileset]=bitplanes(Uint8Array.from([...bytes.slice(chrOffset,chrOffset+2048),...bytes.slice(0x24810,0x25010)]))),tsaOffset=0x1010+tileset*512,attrOffset=0x410+tileset*128,paletteOffset=0x2010+index*48;
 // A standard map has both outdoor and in-room BG palettes. Sprites and
 // player-class palette substitutions are separate runtime state.
 const palette=Array.from({length:3},(_,p)=>Array.from({length:4},(_,i)=>Array.from(bytes.slice(paletteOffset+p*16+i*4,paletteOffset+p*16+i*4+4))));
 return {index,offset,length:r.pos-offset,cells,tileset,chr,chrOffset,tsaOffset,attrOffset,paletteOffset,palette};
}
function ffRegion(bytes,map,x,y,width=16,height=15){
 integer(x,0,63);integer(y,0,63);integer(width,1,16);integer(height,1,15);
 const nt=Array.from({length:height*2},()=>Array(width*2).fill(0)),palettes=Array.from({length:height*2},()=>Array(width*2).fill(0));
 for(let row=0;row<height;row++)for(let col=0;col<width;col++){const tile=map.cells[((y+row)&63)*64+((x+col)&63)],at=bytes[map.attrOffset+tile];if(![0,85,170,255].includes(at))fail('nonuniform metatile palette');for(let q=0;q<4;q++){nt[row*2+(q>>1)][col*2+(q&1)]=bytes[map.tsaOffset+q*128+tile];palettes[row*2+(q>>1)][col*2+(q&1)]=at&3;}}
 return {x,y,width,height,nt,palettes};
}
function ffWorldRow(bytes,index){integer(index,0,255);const ptr=word(bytes,0x4010+index*2);integer(ptr,0x8200,0xbfff);const offset=0x4010+(ptr-0x8000),r=reader(bytes,offset,0x8010),cells=[];let commands=0;for(;;){if(++commands>512)fail('world row command budget exceeded');const cmd=r.read();if(cmd===255)break;const n=(cmd&128)?(r.read()||256):1;if(cells.length+n>256)fail('world row exceeds 256 tiles');for(let i=0;i<n;i++)cells.push(cmd&127);}if(cells.length!==256)fail('world row does not cover 256 tiles');return {index,offset,length:r.pos-offset,cells};}

function inspect(bytes,profile){
 if(!profiles.includes(profile)||!(bytes instanceof Uint8Array)||bytes.length!==profile.byteLength)fail('unsupported resource format');
 const layouts=[],resources=[],byOffset=new Map(),chrCache={};
 function layout(decoded,codec,columns,rows,blockCount){
  const span=profile.spans.find(s=>s.offset===decoded.offset);if(!span||decoded.length>span.length)fail('resource exceeds its verified record');
  let l=byOffset.get(decoded.offset);if(l){if(l.columns!==columns||l.rows!==rows||JSON.stringify(l.cells)!==JSON.stringify(decoded.cells))fail('overlapping native owners disagree');l.blockCount=Math.min(l.blockCount,blockCount);return l;}
  l={id:'layout:'+decoded.offset.toString(16),offset:span.offset,length:span.length,codec,columns,rows,blockCount,cells:decoded.cells};byOffset.set(span.offset,l);layouts.push(l);return l;
 }
 if(profile.kind==='contra'){
  const intro=contraGraphics(bytes,11),counts=[14,24,10,32,22,14,16,12];
  for(let level=0;level<8;level++){
   const h=0xb329+level*32,g=contraGraphics(bytes,level),patterns=intro.ppu.slice(0,8192),written=intro.written.slice(0,8192);for(let i=0;i<8192;i++)if(g.written[i]){patterns[i]=g.ppu[i];written[i]=1;}
   const chr=bitplanes(patterns.slice(4096)),pal=contraPalettes(bytes,level).slice(0,4);
   for(let screen=0;screen<counts[level];screen++){
    const d=contraScreen(bytes,level,screen),count=(d.attributeOffset-d.blockOffset)/16;integer(count,1,128);
    const blocks=Array.from({length:count},(_,id)=>({id,tiles:Array.from(bytes.slice(d.blockOffset+id*16,d.blockOffset+(id+1)*16)),palettes:Array.from({length:16},(_,i)=>(bytes[d.attributeOffset+id]>>((((i>>2)>>1)*2+((i&3)>>1))*2))&3)}));
    if(d.cells.some(id=>id>=count))fail('screen references an undefined source block');
    const l=layout(d,'contra',8,d.rows,count),unknown=d.cells.some(id=>blocks[id].tiles.some(tile=>Array.from({length:16},(_,k)=>written[4096+tile*16+k]).some(v=>!v))),alternate=bytes[h]===0&&screen>=bytes[h+8];
    resources.push({id:'contra:'+level+':'+screen,label:'Level '+(level+1)+' · table slot '+screen,group:'Level '+(level+1)+' · native screen table',layoutId:l.id,columns:8,rows:d.rows,blockPixels:32,blocks,chr,palette:pal,width:256,height:d.rows*32,available:!unknown&&!alternate,reason:unknown?'Referenced CHR-RAM slots lack a verified source write.':alternate?'Alternate graphics/table state requires recovery before an editable page can be opened.':'Initial level graphics and palette; runtime palette cycling, sprites and events remain unresolved.'});
   }
  }
 }else{
  for(let index=0;index<61;index++){
   const m=ffMap(bytes,index,chrCache),blocks=Array.from({length:128},(_,id)=>{const at=bytes[m.attrOffset+id];if(![0,85,170,255].includes(at))fail('nonuniform native metatile palette');return {id,tiles:Array.from({length:4},(_,q)=>bytes[m.tsaOffset+q*128+id]),palettes:Array(4).fill(at&3)};}),l=layout(m,'ff',64,64,128);
   for(const [state,pal]of [['normal',m.palette[0]],['room',m.palette[2]]])resources.push({id:'ff:'+index+':'+state,label:'Map '+index+' · '+state+' palette',group:'Standard maps · '+state+' palette',layoutId:l.id,columns:64,rows:64,blockPixels:16,blocks,chr:m.chr,palette:pal,width:1024,height:1024,available:true,reason:'Static '+state+' palette state. Room switching, objects, actors, menus, Audio and event relationships remain unresolved.'});
  }
 }
 for(const l of layouts)if(l.cells.some(v=>v>=l.blockCount))fail('shared layout references an undefined native block');
 return {profile,layouts,resources,totalCells:layouts.reduce((n,l)=>n+l.cells.length,0)};
}
function pages(resource){return Array.from({length:Math.ceil(resource.width/256)*Math.ceil(resource.height/240)},(_,page)=>{const cols=Math.ceil(resource.width/256),x=(page%cols)*256,y=Math.floor(page/cols)*240;return {page,x,y,width:Math.min(256,resource.width-x),height:Math.min(240,resource.height-y)};});}
function projectPage(catalog,resourceId,page){
 const r=catalog.resources.find(r=>r.id===resourceId);if(!r?.available)fail(r?.reason||'unknown source resource');const p=pages(r)[integer(page,0,pages(r).length-1)],layout=catalog.layouts.find(l=>l.id===r.layoutId),bt=r.blockPixels/8,nt=Array(960).fill(0),attr=Array(64).fill(0);
 for(let y=0;y<p.height/8;y++)for(let x=0;x<p.width/8;x++){
  const sx=p.x/8+x,sy=p.y/8+y,cell=Math.floor(sy/bt)*r.columns+Math.floor(sx/bt),b=r.blocks[layout.cells[cell]],i=(sy%bt)*bt+(sx%bt),pal=b.palettes[i],ai=(y>>2)*8+(x>>2),shift=(((y>>1)&1)*2+((x>>1)&1))*2;
  nt[y*32+x]=b.tiles[i];attr[ai]=(attr[ai]&~(3<<shift))|(pal<<shift);
 }
 return {resource:r,page:p,nt,attr};
}
function pack(cells,codec){
 if(!['ff','contra'].includes(codec)||!Array.isArray(cells)||!cells.length||cells.length>4096||cells.some(v=>!Number.isInteger(v)||v<0||v>127))fail('invalid cell stream or codec');
 const n=cells.length,dp=Array(n+1).fill(Infinity),next=Array(n);dp[n]=codec==='ff'?1:0;
 for(let i=n-1;i>=0;i--){dp[i]=1+dp[i+1];next[i]={count:1,bytes:[cells[i]]};
  let run=1;while(run<Math.min(codec==='ff'?256:111,n-i)&&cells[i+run]===cells[i])run++;
  if(!(codec==='ff'&&cells[i]===127))for(let k=2;k<=run;k++)if(2+dp[i+k]<dp[i]){dp[i]=2+dp[i+k];next[i]={count:k,bytes:[cells[i]|128,k===256?0:k]};if(codec==='contra')next[i].bytes=[128|k,cells[i]];}
  if(codec==='contra'&&i%8===0&&i+8<=n)for(let row=0;row<i/8;row++)if(cells.slice(row*8,row*8+8).every((v,k)=>v===cells[i+k])&&1+dp[i+8]<dp[i]){dp[i]=1+dp[i+8];next[i]={count:8,bytes:[240|row]};}
 }
 const out=[];for(let i=0;i<n;){out.push(...next[i].bytes);i+=next[i].count;}if(codec==='ff')out.push(255);return Uint8Array.from(out);
}
function encode(bytes,catalog,edits){
 if(!Array.isArray(edits)||edits.length>catalog.totalCells)fail('invalid native edit collection');const changed=new Map(),seen=new Set();
 for(const e of edits){if(!e||Object.keys(e).sort().join(',')!=='block,cell,layoutId')fail('invalid native cell recipe');const l=catalog.layouts.find(l=>l.id===e.layoutId);if(!l)fail('unknown native layout');integer(e.cell,0,l.cells.length-1);integer(e.block,0,l.blockCount-1);const key=l.id+':'+e.cell;if(seen.has(key))fail('duplicate native cell recipe');seen.add(key);let cells=changed.get(l.id);if(!cells){cells=l.cells.slice();changed.set(l.id,cells);}cells[e.cell]=e.block;}
 const output=bytes.slice();for(const [id,cells]of changed){const l=catalog.layouts.find(l=>l.id===id);if(cells.every((v,i)=>v===l.cells[i]))continue;const data=pack(cells,l.codec);if(data.length>l.length)fail('Layout needs '+data.length+' bytes; its native record holds '+l.length+'. No changes made.');output.set(data,l.offset);}
 const changes=[];for(let offset=0;offset<bytes.length;offset++)if(bytes[offset]!==output[offset])changes.push({offset,before:bytes[offset],after:output[offset]});
 return {bytes:output,changes};
}
return Object.freeze({profiles,inspect,pages,projectPage,encode,pack,bitplanes});
});
