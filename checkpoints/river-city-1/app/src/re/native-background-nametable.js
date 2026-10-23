/* Source-backed pointer-page PPU loader profile. No ROM-name/hash matching,
 * execution, authoring mutation, collision inference or native ROM patching. */
(()=>{
'use strict';
const services=window.Forge.services,owner=services.RENativeBackground,ID='nes.pointer-nametable.v1';
const limitations=Object.freeze([
 'Recognizes the declared vector-linked four-state dispatch and pointer-page nametable/palette loader routines, not arbitrary NES engines or compressed maps.',
 'Recovers the matched upload phase: 1023 nametable/attribute writes. The last attribute byte retains unknown prior PPU state and is marked unknown; zero is an explicit conversion placeholder.',
 'The native loader uses Y=$FF as its page stop without resetting Y. Source bytes at page boundaries are reordered; the exact source-index write sequence is preserved.',
 'Native PPUMASK=$18 clips the leftmost eight background pixels; an editable map can show the underlying tiles. No complete runtime frame or original gameplay behavior is promised.',
 'Sprites, collision, animation, dynamic score/text writes and subsequent runtime changes are not recovered. Original ROM bytes remain unchanged.'
]);
const NMI=[0xa9,0,0x8d,3,0x20,0xa9,2,0x8d,0x14,0x40,0x20,null,null,0x20,null,null,0x20,null,null,...Array.from({length:4},()=>[0xa5,null,0xc9,null,0xd0,3,0x20,null,null]).flat(),0x20,null,null,0x20,null,null,0x40];
const ENTRY=[0xa5,null,0xc9,1,0xf0,0x4d,0xa9,1,0x85,null,0xa9,0,0x85,null,0x85,null,0x85,null,0x20,null,null,0x20,null,null,0xad,2,0x20,0xa9,0x3f,0x8d,6,0x20,0xa9,0,0x8d,6,0x20,0xa2,0,0xbd,null,null,0x8d,7,0x20,0xe8,0xe0,0x20,0xd0,0xf5,0x20,null,null,0x20,null,null,0xa9,null,0x8d,0,0x20,0x20,null,null,0x20,null,null,0xa9,1,0x85,null,0xa9,0,0x85,null,0x85,null,0x85,null,0x85,null,0x85,null,0xa5,null,0x29,0x10,0xf0,4,0xa9,null,0x85,null,0x60];
const LOADER=[0xa0,0,0xa2,4,0xa9,null,0x85,null,0xa9,null,0x85,null,0xad,2,0x20,0xa9,0x20,0x8d,6,0x20,0xa9,0,0x8d,6,0x20,0xb1,null,0x8d,7,0x20,0xc8,0xc0,0xff,0xd0,0xf6,0xe6,null,0xca,0xe0,0,0xd0,0xef,0x60];
const WAIT=[0x2c,2,0x20,0x10,0xfb,0x60],DISABLE=[0xa9,0,0x8d,0,0x20,0x8d,1,0x20,0x60],ENABLE=[0xa9,0x18,0x8d,1,0x20,0x20,null,null,0x60],SCROLL=[0xa9,0,0x8d,5,0x20,0x8d,5,0x20,0x60],CLEAR_SPRITES=[0xa9,0xfe,0x9d,0,2,0xe8,0xe0,0xff,0xd0,0xf8,0x60];
function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
const word=(bytes,at)=>bytes[at]|bytes[at+1]<<8;
function matches(bytes,start,pattern){return Number.isSafeInteger(start)&&start>=0&&start+pattern.length<=bytes.length&&pattern.every((value,index)=>value===null||bytes[start+index]===value);}
function decode(input){
 if(!(input instanceof Uint8Array))return{status:'invalid',reason:'The pointer-page profile requires a bounded Uint8Array ROM snapshot.'};
 const bytes=input;let map;
 try{map=owner.parseNrom(bytes,{reservedByte10:0x10});}catch(error){return{status:'unsupported',reason:String(error.message||error)};}
 try{
  const at=(address,length)=>map.cpuToFile(address,length),nmiVector=at(0xfffa,2),nmiAddress=word(bytes,nmiVector),nmi=at(nmiAddress,NMI.length);
  if(!matches(bytes,nmi,NMI))return{status:'unknown',reason:'The declared vector-linked PPU dispatch structure was not found.'};
  const state=bytes[nmi+20],dispatches=Array.from({length:4},(_,index)=>({offset:nmi+19+index*9,state:bytes[nmi+22+index*9],target:word(bytes,nmi+26+index*9)}));
  if(dispatches.some(item=>bytes[item.offset+1]!==state)||new Set(dispatches.map(item=>item.state)).size!==4)return{status:'unknown',reason:'The PPU dispatch state references do not match the declared routine.'};
  const found=[];
  for(const dispatch of dispatches){
   const entry=at(dispatch.target,ENTRY.length);if(!matches(bytes,entry,ENTRY))continue;
   if(bytes[entry+1]!==bytes[entry+9]||bytes[entry+92]!==state||!dispatches.some(item=>item.state===bytes[entry+90]))continue;
   const disable=at(word(bytes,entry+19),DISABLE.length),sprites=at(word(bytes,entry+22),CLEAR_SPRITES.length),loaderAddress=word(bytes,entry+51),loader=at(loaderAddress,LOADER.length),wait=at(word(bytes,entry+54),WAIT.length),enable=at(word(bytes,entry+62),ENABLE.length);
   if(!matches(bytes,disable,DISABLE)||!matches(bytes,sprites,CLEAR_SPRITES)||!matches(bytes,loader,LOADER)||!matches(bytes,wait,WAIT)||!matches(bytes,enable,ENABLE))continue;
   const scroll=at(word(bytes,enable+6),SCROLL.length);if(!matches(bytes,scroll,SCROLL))continue;
   const zp=bytes[loader+7];if(zp>=255||bytes[loader+11]!==zp+1||bytes[loader+26]!==zp||bytes[loader+36]!==zp+1)continue;
   const ppuCtrl=bytes[entry+57];if(ppuCtrl!==0x80&&ppuCtrl!==0x90)continue;
   const nametableAddress=bytes[loader+5]|bytes[loader+9]<<8,nametableOffset=at(nametableAddress,1024),paletteAddress=word(bytes,entry+40),paletteOffset=at(paletteAddress,32),backgroundPatternTable=(ppuCtrl>>4)&1,chrOffset=map.chrStart+backgroundPatternTable*4096;
   if(chrOffset<map.chrStart||chrOffset+4096>map.chrStart+map.chrSize)throw Error('Selected background CHR bank is outside the declared physical source.');
   const rawPalette=Array.from(bytes.slice(paletteOffset,paletteOffset+32));if(rawPalette.some(value=>value>63))throw Error('Palette values outside the declared six-bit color representation are unsupported.');
   // Sequential $3F00..$3F1F writes: sprite universal slots alias the
   // corresponding background slots. Preserve both transfer bytes and final RAM.
   const palette=Array(32).fill(0);for(let index=0;index<32;index++)palette[index>=16&&index%4===0?index-16:index]=rawPalette[index];for(let index=16;index<32;index+=4)palette[index]=palette[index-16];
   const raw=Array.from(bytes.slice(nametableOffset,nametableOffset+1024)),nametable=Array(1024).fill(0),knownNametable=Array(1024).fill(false),sourceIndices=[];let y=0;
   for(let page=0;page<4;page++){do{sourceIndices.push(page*256+y);y=(y+1)&255;}while(y!==255);}
   sourceIndices.forEach((source,index)=>{nametable[index]=raw[source];knownNametable[index]=true;});
   const ranges=[{start:nmiVector,length:2},{start:nmi,length:NMI.length},{start:entry,length:ENTRY.length},{start:disable,length:DISABLE.length},{start:sprites,length:CLEAR_SPRITES.length},{start:loader,length:LOADER.length},{start:wait,length:WAIT.length},{start:enable,length:ENABLE.length},{start:scroll,length:SCROLL.length}];
   found.push({key:'pointer-page-'+loader.toString(16)+'-'+nametableOffset.toString(16),label:'Pointer-page background upload',chrBytes:Array.from(bytes.slice(chrOffset,chrOffset+4096)),nametable,palette,knownNametable,backgroundPatternTable,ppuMask:0x18,
    evidence:[{status:'decoded',claim:'Vector-linked dispatch, coherent pointer-page upload, palette transfer, PPU control and scroll routine structures identify the declared background construction.',ranges},{status:'decoded',claim:'These source bytes provide the 1024-byte native nametable record, 32-byte palette transfer and selected 4 KiB CHR bitplanes.',ranges:[{start:nametableOffset,length:1024},{start:paletteOffset,length:32},{start:chrOffset,length:4096}]},{status:'unknown',claim:'The loader leaves PPU $23FF unchanged. Its prior runtime value is not established by this profile.',ranges:[]}],
    construction:{format:'NESPointerPageBackgroundConstruction',version:1,phase:'after-matched-loader-upload',dispatch:{nmiAddress,stateVariable:state,stateValue:dispatch.state,entryAddress:dispatch.target},loader:{cpuAddress:loaderAddress,fileOffset:loader,length:LOADER.length,zeroPagePointer:zp,sourceCpuAddress:nametableAddress,sourceFileOffset:nametableOffset,sourceLength:1024,pages:4,yStop:255,resetsYBetweenPages:false},transfer:{ppuStart:0x2000,writeCount:sourceIndices.length,sourceIndices,retainedPpuAddresses:[0x23ff],unknownCanonicalPlaceholder:0},palette:{cpuAddress:paletteAddress,fileOffset:paletteOffset,length:32,ppuStart:0x3f00,rawBytes:rawPalette,mirroredSpriteUniversalWrites:[16,20,24,28]},control:{ppuCtrl,ppuMask:0x18,scrollX:0,scrollY:0,leftBackgroundPixelsClipped:8}},
    unknown:['nametable-byte-1023-prior-state','sprites','collision','gameplay','animation','later-runtime-writes'],limitations:Array.from(limitations)});
  }
  if(found.length>1)return{status:'ambiguous',reason:'Several vector-linked pointer-page background constructions match; no source was selected.'};
  if(!found.length)return{status:'unknown',reason:'No dispatch target passed the declared pointer-page, palette and PPU-control structure checks.'};
  return freeze({status:'supported',reason:'Native background records and 1023 exact PPU writes were decoded; one retained attribute byte remains unknown.',background:found[0]});
 }catch(error){return{status:'invalid',reason:('Pointer-page background: '+String(error.message||error)).slice(0,1900)};}
}
services.REPointerNametable=Object.freeze({version:1,id:ID,decode});
owner.registerAdapter({id:ID,name:'Vector-linked pointer-page nametable loader',limitations:Array.from(limitations),decode});
})();
