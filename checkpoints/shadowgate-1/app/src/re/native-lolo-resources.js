/* Adventures of Lolo US: one source owner for CHR-backed room streams.
 * Independent interpretation of BA18/B44A/B656/B597 and native tile tables.
 * Format lead: jadowdl/lolo_level_tool ad04f04. No ROM/assets are embedded.
 * Fixed-capacity edits never relocate a stream or overwrite CHR artwork. */
(function(root,factory){if(typeof module!=='undefined'&&module.exports)module.exports=factory(require('./native-metroid-resources.js'));else root.NativePRGResources=factory(root.NativePRGResources);})(typeof globalThis!=='undefined'?globalThis:this,function(parent){
'use strict';
const fail=message=>{throw Error('Lolo native rooms: '+message);};
const integer=(n,min,max)=>{if(!Number.isInteger(n)||n<min||n>max)fail('Invalid native room value');return n;};
const profile=Object.freeze({...{"id":"lolo-us-rooms-v1","kind":"lolo","sha256":"914c676959612fc6738a297b6b799dff848e43de4e9bd3c9f3c6783efd059e01","byteLength":65552,"protectedSha256":"4eebbb422175e3631372e6983ce7ca03ac5b3feab096fd3f4505f63b8d604b1b"},spans:Object.freeze([{"offset":53264,"length":124},{"offset":53388,"length":120},{"offset":53508,"length":123},{"offset":53631,"length":128},{"offset":53759,"length":124},{"offset":53883,"length":122},{"offset":54005,"length":139},{"offset":54144,"length":121},{"offset":54265,"length":137},{"offset":54402,"length":124},{"offset":54526,"length":144},{"offset":54670,"length":134},{"offset":54804,"length":145},{"offset":54949,"length":112},{"offset":55061,"length":144},{"offset":55205,"length":141},{"offset":55346,"length":132},{"offset":55478,"length":120},{"offset":55598,"length":131},{"offset":55729,"length":116},{"offset":55845,"length":124},{"offset":55969,"length":152},{"offset":56121,"length":160},{"offset":56281,"length":134},{"offset":56415,"length":164},{"offset":56579,"length":151},{"offset":56730,"length":130},{"offset":56860,"length":139},{"offset":56999,"length":147},{"offset":57146,"length":122},{"offset":57360,"length":176},{"offset":57536,"length":134},{"offset":57670,"length":119},{"offset":57789,"length":162},{"offset":57951,"length":141},{"offset":58092,"length":132},{"offset":58224,"length":144},{"offset":58368,"length":128},{"offset":58496,"length":137},{"offset":58633,"length":138},{"offset":58771,"length":139},{"offset":58910,"length":150},{"offset":59060,"length":118},{"offset":59178,"length":142},{"offset":59320,"length":145},{"offset":59465,"length":140},{"offset":59605,"length":153},{"offset":59758,"length":137},{"offset":59895,"length":134},{"offset":60029,"length":111}].map(Object.freeze))});
const offset=cpu=>16+integer(cpu,0x8000,0xffff)-0x8000,word=(bytes,o)=>bytes[o]|(bytes[o+1]<<8);
const editable=Object.freeze({13:'Boulder',14:'Bush',15:'Lava',64:'Floor',65:'Grass',66:'Sand',76:'Heart',77:'Heart with eggs'});
const canEdit=(cells,cell)=>{const x=cell&15,y=cell>>4;return x>=2&&x<=12&&y>=2&&y<=12&&Object.hasOwn(editable,cells[cell]);};
function decode(encoded){
 if(!(encoded instanceof Uint8Array)||!encoded.length||encoded.length>255)fail('Invalid room stream');
 const below=Array(16).fill(0),cells=Array(240);let cursor=0;
 const read=()=>{if(cursor>=encoded.length)fail('Truncated compressed room');return encoded[cursor++];};
 for(let y=14;y>=0;y--){const row=[];
  while(row.length<16){const op=read();let count=1,value=op,copy=false;
   if(op===255){count=read()+2;value=read();if(value>=240)fail('Unsupported repeated meta command');}
   else if(op>=240){count=op-238;copy=true;}
   if(row.length+count>16)fail('Compressed run crosses a native row');
   for(let i=0;i<count;i++)row.push(copy?below[row.length]:value);
  }
  for(let x=0;x<16;x++){cells[y*16+x]=row[x];below[x]=row[x];}
 }
 // The native consumer stops after 15 rows. Remaining allocated bytes are
 // preserved padding, not a second stream and not silently truncated data.
 return {cells,consumed:cursor,padding:encoded.length-cursor};
}
function pack(cells){
 if(!Array.isArray(cells)||cells.length!==240||cells.some(v=>!Number.isInteger(v)||v<0||v>=240))fail('Expected 240 native room cells');
 const encoded=[];let below=Array(16).fill(0);
 for(let y=14;y>=0;y--){const row=cells.slice(y*16,y*16+16),dp=Array(17);dp[16]=[];
  for(let x=15;x>=0;x--){let best=[row[x],...dp[x+1]];
   for(let count=2;count<=16-x;count++){
    if(row.slice(x,x+count).every((v,i)=>v===below[x+i])){const candidate=[238+count,...dp[x+count]];if(candidate.length<best.length)best=candidate;}
    if(row.slice(x,x+count).every(v=>v===row[x])){const candidate=[255,count-2,row[x],...dp[x+count]];if(candidate.length<best.length)best=candidate;}
   }dp[x]=best;
  }encoded.push(...dp[0]);below=row;
 }return Uint8Array.from(encoded);
}
function background(bytes,cells){
 const result=cells.slice();
 for(let i=0x22;i<0xcd;i++){const value=result[i];
  if(value>=0x80&&value<0xc0||value===0xc0||value===0x70||value>=0xc5&&value<0xcd)result[i]=0x40;
  else if(value>=0xd0&&value<0xd4)result[i]=value-0x96;
  else if(value>=0xd4&&value<0xd9)result[i]=0x4e;
 }
 for(let y=0;y<15;y++)result[y*16+14]=bytes[offset(0xb79f)+y];
 for(let i=0;i<3;i++){const slot=cells[0xe0+i*2]-0xc1;integer(slot,0,3);result[0x9e+i*16]=bytes[offset(0xb91a)+slot];}
 return result;
}
function project(bytes,cells){
 const visible=background(bytes,cells),nt=Array(960).fill(0),attr=Array(64).fill(0);
 for(let y=0;y<15;y++)for(let x=0;x<16;x++){
  let id=integer(visible[y*16+x],0,239);
  if(x===2)for(let k=10;k>=0;k--)if(id===bytes[offset(0xb5fb)+k]){id=bytes[offset(0xb606)+k];break;}
  for(let q=0;q<4;q++)nt[(y*2+(q>>1))*32+x*2+(q&1)]=bytes[offset(0xbb22)+q*240+id];
  const index=(y>>1)*8+(x>>1),shift=((y&1)*2+(x&1))*2,palette=integer(bytes[offset(0xbee2)+id],0,3);attr[index]=(attr[index]&~(3<<shift))|(palette<<shift);
 }
 return {nt,attr};
}
function inspect(bytes,p){
 if(p!==profile)return parent.inspect(bytes,p);
 if(!(bytes instanceof Uint8Array)||bytes.length!==profile.byteLength||bytes[4]!==2||bytes[5]!==4||bytes[6]!==16||bytes[7]!==0)fail('Unsupported source layout');
 const chr=parent.bitplanes(bytes.slice(0x9010,0xa010)),layouts=[],resources=[];
 const blocks=Array.from({length:240},(_,id)=>({id,label:editable[id]||'Source code '+id,editable:Object.hasOwn(editable,id),tiles:Array.from({length:4},(_,q)=>bytes[offset(0xbb22)+q*240+id]),palettes:Array(4).fill(integer(bytes[offset(0xbee2)+id],0,3))}));
 for(let room=0;room<50;room++){
  const start=0x8010+bytes[0x3b00+room]*4096+word(bytes,0x3a6a+room*2),length=bytes[0x3ace+room],span=profile.spans[room];
  if(start!==span.offset||length!==span.length||start<0x8010||start+length>bytes.length)fail('Room leaves its verified CHR-backed allocation');
  const {cells,consumed,padding}=decode(bytes.slice(start,start+length)),id='layout:'+start.toString(16),projection=project(bytes,cells),lava=cells.slice(0x22,0xcd).includes(15),pal=offset(lava?0x9a90:0x9a70),palette=Array.from({length:4},(_,i)=>Array.from(bytes.slice(pal+i*4,pal+i*4+4)));
  if(palette.flat().some(v=>v>63))fail('Invalid source palette');
  layouts.push({id,offset:start,length,codec:'lolo-room',columns:16,rows:15,blockCount:240,cells,consumed,padding});
  const first=Math.floor(room/5)*5+1;
  resources.push({id:'lolo:'+room,label:'Source room '+(room+1),group:'Room catalog '+first+'–'+(first+4),layoutId:id,columns:16,rows:15,blockPixels:16,blocks,defaultBlock:64,chr,palette,width:256,height:240,available:true,projection,room,
   reason:'Native background after initial object setup, including left-edge shadows and the source HUD strip. Edit only terrain/heart cells in the 11×11 interior. Player, enemy, chest, border and room-setting records stay intact. Moving sprites, HUD counters, animation and gameplay traversal are not recovered assets. Native Audio is available separately in the ROM Audio Library. Compressed edits must fit this room’s original allocation.'});
 }
 return {profile,resources,layouts,totalCells:12000};
}
function projectPage(c,id,page){
 if(c.profile!==profile)return parent.projectPage(c,id,page);integer(page,0,0);const r=c.resources.find(r=>r.id===id);if(!r)fail('Unknown source room');return {resource:r,page:parent.pages(r)[0],nt:r.projection.nt.slice(),attr:r.projection.attr.slice()};
}
function encode(bytes,c,edits){
 if(c.profile!==profile)return parent.encode(bytes,c,edits);
 if(!(bytes instanceof Uint8Array)||bytes.length!==profile.byteLength||!Array.isArray(edits)||edits.length>12000)fail('Invalid room recipe');
 const pending=new Map(),seen=new Set();
 for(const e of edits){
  if(!e||Object.keys(e).sort().join(',')!=='block,cell,layoutId')fail('Invalid room recipe fields');
  const layout=c.layouts.find(l=>l.id===e.layoutId);if(!layout)fail('Unknown source room');integer(e.cell,0,239);integer(e.block,0,239);
  if(!Object.hasOwn(editable,e.block)||!canEdit(layout.cells,e.cell))fail('This cell or tile type is read-only. Edit terrain or hearts inside the room; preserve native markers, borders and settings.');
  const key=e.layoutId+':'+e.cell;if(seen.has(key))fail('Duplicate room cell');seen.add(key);
  if(!pending.has(layout.id))pending.set(layout.id,{layout,cells:layout.cells.slice()});pending.get(layout.id).cells[e.cell]=e.block;
 }
 const writes=[];
 for(const {layout,cells}of pending.values()){
  if(cells.every((v,i)=>v===layout.cells[i]))continue;
  const encoded=pack(cells);if(encoded.length>layout.length)fail('Edited room needs '+encoded.length+' compressed bytes; its original allocation is '+layout.length+'. Undo or simplify the edit.');
  writes.push({offset:layout.offset,bytes:encoded});
 }
 const out=bytes.slice();for(const w of writes)out.set(w.bytes,w.offset);
 const changes=[];for(let i=0;i<out.length;i++)if(out[i]!==bytes[i])changes.push({offset:i,before:bytes[i],after:out[i]});
 return {bytes:out,changes};
}
return Object.freeze({...parent,profiles:Object.freeze([...parent.profiles,profile]),inspect,projectPage,encode,loloDecode:decode,loloPack:pack,loloProject:project,loloBackground:background});
});
