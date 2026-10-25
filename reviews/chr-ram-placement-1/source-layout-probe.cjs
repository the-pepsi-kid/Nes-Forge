'use strict';
// Independent format research, deliberately outside the shipping app. Every
// pixel comes from the owner's exact input. No disassembly data is embedded.
const crypto=require('crypto');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const sources=Object.freeze({
 contra:'26541a5550ee22deeb3d5484e4a96130219b58cff74d068fb1eb6567fa5e5519',
 finalFantasy:'d360beeee19a69d1c92d02292167c57f2d3ca8405b79101fc8c2f39dea549667',
 finalFantasyAlternate:'fafb45c017ebfcc1af8149c2a61001ea2b0b134c1cbf0139c10b0597ba46c47c'
});
const fail=m=>{throw Error('Placement research: '+m);};
function integer(n,min,max){if(!Number.isInteger(n)||n<min||n>max)fail('invalid index');return n;}
function reader(bytes,start,end){integer(start,16,bytes.length);integer(end,start,bytes.length);let pos=start;return {get pos(){return pos;},read(){if(pos>=end)fail('compressed resource exceeds bounded source');return bytes[pos++];}};}
const word=(b,o)=>b[o]|(b[o+1]<<8);
function bitplanes(bytes){if(bytes.length%16)fail('partial pattern');return Array.from({length:bytes.length/16},(_,t)=>Array.from({length:8},(_,y)=>Array.from({length:8},(_,x)=>((bytes[t*16+y]>>(7-x))&1)|(((bytes[t*16+y+8]>>(7-x))&1)<<1))));}
function requireSource(bytes,allowed){if(!(bytes instanceof Uint8Array)||!allowed.includes(hash(bytes)))fail('unverified source revision');}
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
function ffMap(bytes,index){
 integer(index,0,60);const table=0x10010,offset=table+word(bytes,table+index*2),r=reader(bytes,offset,0x20010),cells=[];let commands=0;
 for(;;){if(++commands>8192)fail('map command budget exceeded');const cmd=r.read();if(cmd===255)break;const n=(cmd&128)?(r.read()||256):1,tile=cmd&127;if(cells.length+n>4096)fail('map decompression exceeds 64 by 64');for(let i=0;i<n;i++)cells.push(tile);}
 if(cells.length!==4096)fail('map does not cover 64 by 64');const tileset=bytes[0x2cd0+index];integer(tileset,0,7);
 const chrOffset=0xc010+tileset*2048,chr=bitplanes(Uint8Array.from([...bytes.slice(chrOffset,chrOffset+2048),...bytes.slice(0x24810,0x25010)])),tsaOffset=0x1010+tileset*512,attrOffset=0x410+tileset*128,paletteOffset=0x2010+index*48;
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
function open(bytes){const sha256=hash(bytes);requireSource(bytes,Object.values(sources));return sha256===sources.contra?{kind:'contra',screen:(level,screen)=>contraScreen(bytes,level,screen),graphics:group=>contraGraphics(bytes,group),palettes:level=>contraPalettes(bytes,level)}:{kind:'final-fantasy',map:index=>ffMap(bytes,index),region:(map,x,y,w,h)=>ffRegion(bytes,map,x,y,w,h),worldRow:index=>ffWorldRow(bytes,index)};}
module.exports={sources,hash,open,contraScreen,contraGraphics,contraPalettes,ffMap,ffRegion,ffWorldRow,bitplanes};
