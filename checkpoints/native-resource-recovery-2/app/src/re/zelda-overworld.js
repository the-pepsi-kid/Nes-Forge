/* Zelda's adapter reads original graphics and fixed native allocations from the
 * supplied cartridge. No map, CHR, palette or source-ROM payload ships here. */
(function(root,factory){const api=factory(root);if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ZeldaOverworld=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const dep=(n,p)=>root[n]||(typeof require==='function'?require(p):null),format=()=>dep('NativeEngineFormat','./native-engine-format.js'),rle=()=>dep('NativeRowRLE','./native-row-rle.js');
const need=(ok,m)=>{if(!ok)throw Error('Zelda overworld: '+m);},offset=(bank,cpu)=>16+bank*16384+cpu-(bank===7?0xc000:0x8000);
const fingerprint='95eca4305789e8182fc694cbdcfaa93fc8c03682ec28123c12b7f0aa980379b7';
const resources=Object.freeze([
 {id:'z2:1:0',key:'west',name:'West Hyrule',bank:1,index:0,cpu:0x905c,capacity:801,height:75},
 {id:'z2:1:1',key:'death-mountain',name:'Death Mountain',bank:1,index:1,cpu:0xa64c,capacity:1024,height:60},
 {id:'z2:2:0',key:'east',name:'East Hyrule',bank:2,index:0,cpu:0x9046,capacity:794,height:75},
 {id:'z2:2:1',key:'maze',name:'Maze Island',bank:2,index:1,cpu:0xa64c,capacity:1024,height:60}
].map(Object.freeze));
const classes=Object.freeze(['Town','Cave','Palace','Bridge','Desert','Grass','Forest','Swamp','Graveyard','Road','Lava','Mountain','Water','Walkable water','Rock','Spider']);
function resource(id){const r=resources.find(r=>r.id===id);need(r,'unknown map');return r;}
function recognizes(bytes){
 if(!(bytes instanceof Uint8Array)||bytes.length!==262160)return false;
 const masked=Uint8Array.from(bytes);
 for(const r of resources)masked.fill(0,offset(r.bank,r.cpu),offset(r.bank,r.cpu)+r.capacity);
 for(const s of format().sets)for(let i=0;i<62;i++){masked[s.offset+i]&=128;masked[s.offset+63+i]&=192;masked[s.offset+126+i]=0;}
 return format().sha256(masked)===fingerprint;
}
function decode(bytes,id){
 need(recognizes(bytes),'unsupported engine revision or protected source change');const r=resource(id),start=offset(r.bank,r.cpu),pointer=offset(r.bank,0x8508+r.index*2);
 need((bytes[pointer]|bytes[pointer+1]<<8)===r.cpu,'map pointer differs');
 const d=rle().decode(bytes,start,start+r.capacity,64,r.height),paddingBytes=(75-r.height)*4;
 // Small maps share the engine's 75-row lookup. Their remaining rows are
 // original FF padding, not editable terrain or guessed map extent.
 if(paddingBytes)need(d.end+paddingBytes<=start+r.capacity&&bytes.slice(d.end,start+r.capacity).every(v=>v===255),'native padding is unavailable');
 return {...r,width:64,cells:d.cells,rows:d.rows,sourceBytes:d.bytes,usedBytes:rle().encode(d.cells,64,r.height).length,budget:r.capacity-paddingBytes,sourceOffset:start};
}
function encode(bytes,id,cells){
 const d=decode(bytes,id),packed=rle().encode(cells,64,d.height);need(packed.length<=d.budget,'map needs '+packed.length+' bytes; its native allocation allows '+d.budget+'. Shorten or merge terrain runs.');
 const output=Uint8Array.from(bytes);if(cells.every((v,i)=>v===d.cells[i]))return {bytes:output,changed:false,usedBytes:packed.length,budget:d.budget};
 output.fill(255,d.sourceOffset,d.sourceOffset+d.capacity);output.set(packed,d.sourceOffset);
 need(recognizes(output),'encoding changed a protected source span');const check=decode(output,id);need(check.cells.every((v,i)=>v===cells[i]),'native round trip differs');
 return {bytes:output,changed:true,usedBytes:packed.length,budget:d.budget};
}
function graphics(bytes){
 need(recognizes(bytes),'unsupported source');const read=(bank,cpu)=>bytes[offset(bank,cpu)];
 const palettes=Array.from({length:4},(_,p)=>Array.from({length:4},(_,i)=>read(7,0xc45b+p*4+i)));
 // The native overworld initialization at 7:CA0D selects 8 KiB pair 16/17
 // through SwapCHR (7:FFB1). BG uses pattern table 1. Native tile
 // mappings are column-major; canonical metatiles are TL,TR,BL,BR.
 const chrStart=16+8*16384+17*4096,chr=Array.from({length:256},(_,t)=>Array.from({length:8},(_,y)=>Array.from({length:8},(_,x)=>{const a=chrStart+t*16+y,bit=7-x;return ((bytes[a]>>bit)&1)|(((bytes[a+8]>>bit)&1)<<1);}))),metatiles=classes.map((name,i)=>({id:i,name,category:'Native terrain · '+name,tiles:[0,2,1,3].map(q=>read(0,0x87a3+i*4+q)),pal:read(0,0x87e3+i),collision:[0,0,0,0],flags:0}));
 return {chr,palettes,metatiles,chrBank4KiB:17};
}
return Object.freeze({id:'zelda2-overworld-v1',resources,classes,fingerprint,recognizes,resource,decode,encode,graphics});
});
