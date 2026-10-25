/* Bounded source-backed PB53 upload and raw command-map rendering.
 * Instruction grammars establish pointers; ROM code is never executed here.
 * PB53 buffer behavior follows the linked native loader, including prior-state
 * dependencies. PrettyLevel and the running game are outside this conversion.
 */
(()=>{
'use strict';
const services=window.Forge.services;
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const word=(bytes,offset)=>bytes[offset]|bytes[offset+1]<<8;
const pattern=text=>text.split(/\s+/).map(value=>value==='??'?null:parseInt(value,16));
const matches=(bytes,offset,shape)=>Number.isSafeInteger(offset)&&offset>=16&&offset+shape.length<=bytes.length&&shape.every((value,index)=>value===null||value===bytes[offset+index]);
const RESET=pattern('a9 00 8d 00 20 8d 01 20 78 a2 ff 9a ad 02 20 10 fb ad 02 20 10 fb a9 00 8d 15 40 a9 3f 8d 06 20 a9 00 8d 06 20 a2 00 a9 ?? 8d 07 20 a9 ?? 8d 07 20 bd ?? ?? 8d 07 20 a9 ?? 8d 07 20 e8 e0 08 d0 e6 a9 3f 8d 06 20 a9 07 8d 06 20 a9 ?? 8d 07 20 20 ?? ?? a2 00 8a 95 00 9d 00 01 9d 00 03 9d 00 04 9d 00 05 9d 00 06 9d 00 07 e8 d0 e9 a2 01 8e 16 40 ca 8e 16 40 20 ?? ?? 20 ?? ?? 20 ?? ?? a5 16 c9 10 d0 08 a5 17 c9 20 d0 02 e6 12 a9 21 85 e4 a9 69 85 10 a9 5a 85 1c a9 a5 85 1d a9 53 85 1e a9 76 85 1f a9 ?? 8d 00 20 4c ?? ??');
const UPLOAD=pattern('a9 40 85 0f a9 00 8d 06 20 8d 06 20 a9 ?? 85 f5 a9 ?? 85 f6 a9 00 85 f9 a9 80 85 fa 20 ?? ?? a2 00 bd 00 02 8d 07 20 e8 e0 80 d0 f5 c6 0f d0 ec 60');
const JOY=pattern('a9 01 8d 17 00 ad 16 40 29 03 c9 01 2e 16 00 ad 17 40 29 03 c9 01 2e 17 00 90 ea 60');
const PB53=pattern('a6 f9 a0 00 b1 f5 e6 f5 d0 02 e6 f6 c9 82 90 3a f0 1e c9 84 b0 28 8a 38 e5 f9 a8 a9 10 85 01 b9 00 02 9d 00 02 e8 c8 c6 01 d0 f4 e4 fa 90 d3 60 8a c5 f9 d0 02 a5 fa 38 e9 10 a8 4c ?? ?? 48 20 ?? ?? 68 4a 20 ?? ?? 4c ?? ?? 20 ?? ?? a0 00 b1 f5 e6 f5 d0 02 e6 f6 c9 82 b0 06 20 ?? ?? 4c ?? ?? a0 08 29 01 f0 02 a9 ff 85 00 bd f8 01 45 00 9d 00 02 e8 88 d0 f4 4c ?? ?? 09 00 10 10 a0 08 29 01 f0 02 a9 ff 9d 00 02 e8 88 d0 f9 60 38 2a 85 00 a9 00 b0 03 b1 f5 c8 9d 00 02 e8 06 00 d0 f3 18 98 65 f5 85 f5 90 02 e6 f6 60');
const RENDER=pattern('a9 00 8d 05 20 8d 05 20 aa 9d 80 06 e8 e0 40 d0 f8 a9 20 8d 06 20 a9 00 8d 06 20 aa a9 10 85 00 bd 00 07 0a 0a a8 b9 ?? ?? 8d 07 20 b9 ?? ?? 8d 07 20 e8 c6 00 d0 e9 8a 38 e9 10 aa a9 10 85 00 8a bd 00 07 48 48 a8 b9 ?? ?? 9d 00 07 68 0a 0a a8 b9 ?? ?? 8d 07 20 b9 ?? ?? 8d 07 20 68 a8 b9 ?? ?? 48 8a a8 68 29 03 f0 05 09 80 20 ?? ?? e8 c6 00 d0 cc e0 f0 d0 a4 a2 00 bd 80 06 8d 07 20 e8 e0 40 d0 f5 a9 00 8d 05 20 8d 05 20 60');
const COLOR=pattern('86 07 85 06 29 03 aa bd ?? ?? 85 05 a2 00 98 4a 90 01 e8 98 29 10 f0 02 e8 e8 a5 05 3d ?? ?? 85 05 98 29 e0 4a 4a 85 04 98 29 0e 4a 05 04 a8 b9 80 06 3d ?? ?? 05 05 99 80 06 85 05 a6 07 24 06 10 01 60');
const limitations=Object.freeze([
 'Static command-map rendering uses the original metatile tile and palette-index tables before PrettyLevel. Random clouds, grass/platform substitutions, gameplay actors and later visual changes are omitted.',
 'The recovered palette is the reset upload, including native universal-color aliases and the explicit slot-seven write. Level-specific background changes and animated sprite colors are not recovered.',
 'PB53 is interpreted with this verified loader\'s 128-byte persistent buffer. Tile control $83 copies its existing buffer slot; it does not mean a previous 4 KiB bank in this loader configuration.',
 'Unknown initial decompression-buffer bytes remain marked unknown; a static map using such a tile cannot be converted. Native row fifteen is data outside the visible 16 by 15 metatile screen.',
 'The source resets with rendering disabled. Its final reset control selects the recovered background bank; the editor viewer supplies its own rendering state.'
]);

function decompress(bytes,start){
 const buffer=Array(128).fill(0),knownBuffer=Array(128).fill(false),chrRamBytes=[],knownChrRam=[],tokens=[];let cursor=start;
 const read=()=>{if(cursor>=bytes.length)throw Error('PB53 stream leaves the bounded PRG bytes.');return bytes[cursor++];};
 const plane=(control,index)=>{
  if(control>=0x80){for(let row=0;row<8;row++){buffer[index+row]=(control&1)?255:0;knownBuffer[index+row]=true;}return;}
  let value=0;for(let row=0;row<8;row++){if(row===0||!(control&(1<<(7-row))))value=read();buffer[index+row]=value;knownBuffer[index+row]=true;}
 };
 for(let tile=0;tile<512;tile++){
  const begin=cursor,control=read(),index=(tile%8)*16;let kind;
  if(control===0x82||control===0x83){
   kind=control===0x82?'previous-buffer-tile':'retained-buffer-slot';
   const source=control===0x83?index:(index===0?112:index-16);
   for(let i=0;i<16;i++){buffer[index+i]=buffer[source+i];knownBuffer[index+i]=knownBuffer[source+i];}
  }else if(control>=0x84){kind='solid-tile';plane(0x80|(control&1),index);plane(0x80|((control>>>1)&1),index+8);}
  else{
   kind='two-planes';plane(control,index);const second=read();
   if(second>=0x82){const invert=(second&1)?255:0;for(let i=0;i<8;i++){buffer[index+8+i]=buffer[index+i]^invert;knownBuffer[index+8+i]=knownBuffer[index+i];}}
   else plane(second,index+8);
  }
  tokens.push({fileOffset:begin,length:cursor-begin,tile,control,kind});
  // Native code uploads only after all eight tiles in each buffer are ready.
  if(tile%8===7){chrRamBytes.push(...buffer);knownChrRam.push(...knownBuffer);}
 }
 return{chrRamBytes,knownChrRam,tokens,byteLength:cursor-start};
}

function decode(input,mapDecoded){
 if(!(input instanceof Uint8Array))return{status:'invalid',reason:'Command graphics requires a bounded Uint8Array source snapshot.'};
 try{
  const owner=services.RENativeCommandMap;if(!owner)throw Error('Native command-map service is unavailable.');
  const container=owner.parseContainer(input),bytes=input,at=(address,length)=>container.cpuToFile(address,length);
  // Revalidate the source through the map owner; supplied metadata is a hint,
  // never authority to turn an unrelated instruction sequence into a renderer.
  const decoded=owner.decode(bytes);
  if(decoded.status!=='supported')return{status:decoded.status,reason:'Command graphics needs a verified native map structure: '+decoded.reason};
  if(mapDecoded&&(!mapDecoded.structure||mapDecoded.structure.renderLevelBuf!==decoded.structure.renderLevelBuf||mapDecoded.structure.metatileFlags!==decoded.structure.metatileFlags))throw Error('Map structure does not match the supplied source.');
  const resetAddress=word(bytes,at(0xfffc,2)),reset=at(resetAddress,RESET.length);
  if(!matches(bytes,reset,RESET))return{status:'unknown',reason:'The vector-linked palette and CHR upload reset grammar was not found.'};
  const ppuCtrl=bytes[reset+166];if(ppuCtrl!==0x88&&ppuCtrl!==0x98)throw Error('Reset background selection is outside the declared control variants.');
  if(word(bytes,reset+119)!==word(bytes,reset+122)||word(bytes,reset+119)!==word(bytes,reset+125))throw Error('Reset controller calls are not coherent.');
  const joy=at(word(bytes,reset+119),JOY.length);if(!matches(bytes,joy,JOY))throw Error('The reset controller helper before final PPU control does not match the verified port-only grammar.');
  const uploadAddress=word(bytes,reset+81),upload=at(uploadAddress,UPLOAD.length);
  if(!matches(bytes,upload,UPLOAD))throw Error('The reset CHR upload does not use the declared 64 by 128-byte construction.');
  const pbAddress=word(bytes,upload+29),pb=at(pbAddress,PB53.length);
  if(!matches(bytes,pb,PB53))throw Error('The linked PB53 unpacker is outside the verified instruction grammar.');
  for(const [operand,relative] of [[60,27],[64,126],[69,126],[72,43],[75,122],[92,122],[95,43],[120,43]])if(word(bytes,pb+operand)!==pbAddress+relative)throw Error('The PB53 internal targets do not match the linked routine.');
  const streamAddress=bytes[upload+13]|bytes[upload+17]<<8,stream=at(streamAddress,1),unpacked=decompress(bytes,stream);
  const colorsAddress=word(bytes,reset+50),colorsOffset=at(colorsAddress,8),colors=Array.from(bytes.slice(colorsOffset,colorsOffset+8));
  const base=bytes[reset+40],dark=bytes[reset+45],light=bytes[reset+56],override=bytes[reset+76];
  if([...colors,base,dark,light,override].some(value=>value>63))throw Error('Palette values outside the six-bit native color range are unsupported.');
  const rawPalette=[];for(const color of colors)rawPalette.push(base,dark,color,light);
  const palette=Array(32).fill(0);for(let index=0;index<32;index++)palette[index>=16&&index%4===0?index-16:index]=rawPalette[index];palette[7]=override;for(let index=16;index<32;index+=4)palette[index]=palette[index-16];
  if(decoded.structure.levelBuffer!==0x700)throw Error('The verified map and graphics renderer do not share the same native cell buffer.');
  const rendererAddress=decoded.structure.renderLevelBuf,renderer=at(rendererAddress,RENDER.length);
  if(!matches(bytes,renderer,RENDER))throw Error('The map renderer is outside the verified row-wise metatile grammar.');
  const tilesAddress=word(bytes,renderer+39),becomesAddress=word(bytes,renderer+72),flagsAddress=word(bytes,renderer+96),colorAddress=word(bytes,renderer+109),color=at(colorAddress,COLOR.length);
  if(word(bytes,renderer+45)!==tilesAddress+1||word(bytes,renderer+82)!==tilesAddress+2||word(bytes,renderer+88)!==tilesAddress+3||flagsAddress!==decoded.structure.metatileFlags)throw Error('Metatile pointers disagree across renderer and native collision evidence.');
  if(!matches(bytes,color,COLOR))throw Error('Metatile attribute construction is outside the verified grammar.');
  const colorTables=[];
  for(const [operand,expected] of [[8,[0,85,170,255]],[29,[3,12,48,192]],[51,[252,243,207,63]]]){
   const address=word(bytes,color+operand),offset=at(address,4);if(!expected.every((value,index)=>bytes[offset+index]===value))throw Error('Native attribute masks differ from the supported quadrant construction.');colorTables.push({start:offset,length:4});
  }
  const tilesOffset=at(tilesAddress,144),becomesOffset=at(becomesAddress,36),flagsOffset=at(flagsAddress,36),metatileTiles=Array.from(bytes.slice(tilesOffset,tilesOffset+144)),metatileBecomes=Array.from(bytes.slice(becomesOffset,becomesOffset+36)),metatileFlags=Array.from(bytes.slice(flagsOffset,flagsOffset+36));
  if(metatileBecomes.some(value=>value>=36))throw Error('Metatile post-render IDs leave the bounded native table.');
  const backgroundPatternTable=(ppuCtrl>>>4)&1,bankStart=backgroundPatternTable*4096;
  const construction={format:'NESCommandMapPB53Graphics',version:1,phase:'raw-command-map-before-PrettyLevel',reset:{cpuAddress:resetAddress,fileOffset:reset,length:RESET.length},upload:{cpuAddress:uploadAddress,fileOffset:upload,length:UPLOAD.length,chunks:64,chunkBytes:128,ppuStart:0,writeCount:8192},unpacker:{cpuAddress:pbAddress,fileOffset:pb,length:PB53.length},stream:{cpuAddress:streamAddress,fileOffset:stream,length:unpacked.byteLength,tokens:unpacked.tokens},palette:{cpuAddress:colorsAddress,fileOffset:colorsOffset,length:8,rawBytes:rawPalette,override:{ppuAddress:0x3f07,value:override}},renderer:{cpuAddress:rendererAddress,fileOffset:renderer,length:RENDER.length,colorRoutineAddress:colorAddress},tables:{tiles:{cpuAddress:tilesAddress,fileOffset:tilesOffset,length:144},becomes:{cpuAddress:becomesAddress,fileOffset:becomesOffset,length:36},flags:{cpuAddress:flagsAddress,fileOffset:flagsOffset,length:36}},control:{ppuCtrl,ppuMaskDuringUpload:0,backgroundPatternTable,scrollX:0,scrollY:0}};
  return freeze({status:'supported',reason:'Verified PB53 upload bytes and raw native metatile rendering tables recovered.',graphics:{chrBytes:unpacked.chrRamBytes.slice(bankStart,bankStart+4096),knownChr:unpacked.knownChrRam.slice(bankStart,bankStart+4096),chrRamBytes:unpacked.chrRamBytes,knownChrRam:unpacked.knownChrRam,palette,metatileTiles,metatileBecomes,metatileFlags,backgroundPatternTable,ppuMask:0,construction,evidence:[{status:'decoded',claim:'Reset vector, linked PB53 unpacker and fixed-size uploader establish the exact native graphics construction without executing input code.',ranges:[{start:at(0xfffc,2),length:2},{start:reset,length:RESET.length},{start:joy,length:JOY.length},{start:upload,length:UPLOAD.length},{start:pb,length:PB53.length},{start:stream,length:unpacked.byteLength},{start:colorsOffset,length:8}]},{status:'decoded',claim:'Map-linked renderer and attribute helper establish visible metatile quadrants and palette indices before PrettyLevel.',ranges:[{start:renderer,length:RENDER.length},{start:color,length:COLOR.length},...colorTables,{start:tilesOffset,length:144},{start:becomesOffset,length:36},{start:flagsOffset,length:36}]}],limitations:Array.from(limitations)}});
 }catch(error){return{status:'invalid',reason:('Native command graphics: '+String(error.message||error)).slice(0,1900)};}
}

function render(graphics,cells){
 if(!graphics||!Array.isArray(graphics.metatileTiles)||graphics.metatileTiles.length!==144||!Array.isArray(graphics.metatileFlags)||graphics.metatileFlags.length!==36||!Array.isArray(graphics.knownChr)||graphics.knownChr.length!==4096||!cells||cells.length!==256)throw Error('Raw native rendering requires verified graphics and exactly 256 cells.');
 if(Array.from(cells).some(value=>!Number.isInteger(value)||value<0||value>=36))throw Error('Raw map IDs leave the bounded metatile table.');
 const nametable=Array(1024).fill(0),knownNametable=Array(1024).fill(true),postRenderCells=Array.from(cells);
 for(let y=0;y<15;y++)for(let x=0;x<16;x++){
  const cell=y*16+x,id=cells[cell],tileBase=id*4,ntBase=y*64+x*2;
  for(let quadrant=0;quadrant<4;quadrant++){
   const tile=graphics.metatileTiles[tileBase+quadrant];if(!Number.isInteger(tile)||tile<0||tile>255)throw Error('Native tile index is outside one pattern table.');
   if(!graphics.knownChr.slice(tile*16,tile*16+16).every(Boolean))throw Error('A visible metatile uses CHR bytes that depend on unknown initial decompression-buffer state.');
   nametable[ntBase+(quadrant&1)+(quadrant>=2?32:0)]=tile;
  }
  nametable[960+(y>>>1)*8+(x>>>1)]|=(graphics.metatileFlags[id]&3)<<((x&1)*2+(y&1)*4);
  postRenderCells[cell]=graphics.metatileBecomes[id];
 }
 return freeze({nametable,knownNametable,postRenderCells,phase:'raw-command-map-before-PrettyLevel'});
}
services.RENativeCommandGraphics=Object.freeze({version:1,decode,render,limitations});
})();
