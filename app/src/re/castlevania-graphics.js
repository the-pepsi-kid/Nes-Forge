/* UxROM CHR uploads and Stage 01 courtyard. The original ROM supplies every
 * pattern, palette and placement. Loader and directory addresses are specific
 * to the two verified fixed banks. */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(require('./famitone2-native.js').sha256);
  else root.CastlevaniaGraphics = factory(root.NativeEngineFormat.sha256);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (sha256) {
  'use strict';
  const profiles = [
    {sha256:'55bcab0d9efc33a9d9efc90f2c3c4ab12f3221a44b1f357e6c6202a456399aa8',loader:0xfcff,areaTable:0xfaff,blockTable:0xf9d6,paletteTable:0xccaa},
    {sha256:'0bf466eb3819eee34e41de076b5c1bf16375d0de5ba64ede8ade6ed599accb53',loader:0xfd23,areaTable:0xfb23,blockTable:0xf9fa,paletteTable:0xccf9}
  ];
  const check = (ok, message) => { if (!ok) throw Error('Castlevania graphics: '+message); };
  const location = (bank,cpu) => ({bank,cpu,fileOffset:16+bank*0x4000+(cpu&0x3fff)});
  const observed = {0:'Title screen',1:'Castle gate introduction',3:'Stage 01 courtyard'};
  function open(source) {
    check(source instanceof Uint8Array && source.length===131088,'Choose an original US revision.');
    const bytes=source.slice(), digest=sha256(bytes), profile=profiles.find(p=>p.sha256===digest);
    check(profile,'Choose a verified US revision.');
    const read=(bank,cpu)=>bytes[location(bank,cpu).fileOffset];
    const word=(bank,cpu)=>read(bank,cpu) | (read(bank,cpu+1)<<8);
    const directory=word(7,profile.loader+3), first=word(7,directory), count=(first-directory)/2;
    check(count===12,'Unexpected upload directory.');
    const groups=[];
    for(let index=0;index<count;index++) {
      const start=word(7,directory+2*index), records=[];
      let at=start;
      while(at<0xfffa && read(7,at)!==0xff) {
        const bank=read(7,at),cpu=word(7,at+1),ppu=word(7,at+3),length=word(7,at+5);
        check(bank<7 && cpu>=0x8000 && cpu+length<=0xc000 && length>0 &&
          ppu+length<=0x2000 && (length&15)===0 && (ppu&15)===0,'Invalid tile transfer.');
        records.push({descriptor:location(7,at),source:location(bank,cpu),ppu,length});
        at+=7;
      }
      check(records.length && at<0xfffa,'Unterminated upload list.');
      groups.push({index,label:'CHR upload '+String(index).padStart(2,'0')+(observed[index]?' · '+observed[index]:''),
        pointer:location(7,directory+2*index),list:location(7,start),records});
    }
    function patterns(index) {
      const group=groups[index];
      check(Number.isInteger(index) && group,'Select an upload.');
      const data=new Uint8Array(8192), written=new Uint8Array(8192);
      for(const r of group.records) {
        data.set(bytes.subarray(r.source.fileOffset,r.source.fileOffset+r.length),r.ppu);
        written.fill(1,r.ppu,r.ppu+r.length);
      }
      return {data,written};
    }
    function transfer(index,recordIndex) {
      const r=groups[index]?.records[recordIndex];
      check(Number.isInteger(index) && Number.isInteger(recordIndex) && r,'Select a transfer.');
      return bytes.slice(r.source.fileOffset,r.source.fileOffset+r.length);
    }
    const columns=8,rows=6,cellsPerPage=columns*rows;
    // The renderer prefetches four columns before the first visible cell.
    const layout=word(4,word(7,profile.areaTable))+4*rows;
    const end=word(4,word(7,profile.areaTable+2))+4*rows;
    const pageCount=(end-layout)/cellsPerPage,definitions=word(7,profile.blockTable);
    const command=word(7,profile.paletteTable+2*4);
    check(pageCount===3 && layout>=0x8000 && end<=definitions && read(7,command)===0x3f &&
      read(7,command+1)===0 && read(7,command+18)===0xfe,'Unknown courtyard layout or palette.');
    const pal=Array.from({length:4},(_,p)=>Array.from({length:4},(_,c)=>read(7,command+2+4*p+c)));
    const art=patterns(3);
    check(art.written.subarray(0x1000).every(Boolean),'Incomplete courtyard background pattern upload.');
    const blocks=new Map();
    for(let addr=layout;addr<end;addr++) {
      const id=read(4,addr);
      if(blocks.has(id)) continue;
      const cpu=definitions+17*id;
      check(cpu>=end && cpu+17<=0xc000,'Metatile leaves the source bank.');
      blocks.set(id,{id,source:location(4,cpu),attribute:read(4,cpu),tiles:Array.from({length:16},(_,i)=>read(4,cpu+1+i))});
    }
    function page(index) {
      check(Number.isInteger(index) && index>=0 && index<pageCount,'Select a courtyard page.');
      const start=layout+index*cellsPerPage,cells=[],nt=Array(960).fill(0),attr=Array(64).fill(0);
      for(let col=0;col<columns;col++) for(let row=0;row<rows;row++) {
        const address=start+col*rows+row,block=blocks.get(read(4,address)),tileY=4+row*4;
        cells.push({col,row,blockId:block.id,source:location(4,address)});
        // The top two rows of the first block are reserved for the HUD.
        attr[(tileY>>2)*8+col]=block.attribute | (row===0?15:0);
        for(let y=row===0?2:0;y<4;y++) for(let x=0;x<4;x++)
          nt[(tileY+y)*32+4*col+x]=block.tiles[y*4+x];
      }
      return {index,label:'Stage 01 courtyard · page '+(index+1),source:location(4,start),cells,nt,attr,
        blocks:[...new Set(cells.map(c=>c.blockId))].map(id=>blocks.get(id)),
        paletteSource:location(7,command+2),pal:pal.map(row=>row.slice()),background:art.data.slice(0x1000)};
    }
    return {sha256:digest,groups,pageCount,blockCount:blocks.size,patterns,transfer,page};
  }
  return Object.freeze({open});
});
