/* Bounded native PPU-immediate construction decoder. This recognizes data and
 * control structure, never a filename/hash and never executes supplied code. */
(()=>{
'use strict';
const services=window.Forge.services,shared=services.RENativeBackground;
const ID='nes.immediate-ppu-background.v1',LIMITS=Object.freeze({bytes:40976,prefixBytes:512,tokens:4096,writes:4096});
const limitations=Object.freeze([
 'One reset-linked, forced-blank initialization with immediate PPU palette writes and a literal/counted-fill nametable subroutine is supported. Arbitrary 6502 code, indirect pointers and other compression are not interpreted.',
 'This is the initialized background only. Later text, sprites, input, game logic, raster effects, collisions and audio are not recovered.',
 'Canonical conversion builds a separate Forge static scene. There is no native encoder, source-ROM patch, inverse or byte-round-trip claim.',
 'Only a proven static NROM background pattern bank, nametable zero, zero scroll and unemphasized nongrayscale background rendering are supported.'
]);
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
function decode(bytes){
 if(!(bytes instanceof Uint8Array)||bytes.length>LIMITS.bytes)return {status:'unsupported',reason:'Immediate PPU construction requires a bounded NROM file of at most '+LIMITS.bytes+' bytes.'};
 let map;try{map=shared.parseNrom(bytes);}catch(error){return {status:'unsupported',reason:error.message};}
 const end=map.prgStart+map.prgSize,match=(at,pattern)=>at>=map.prgStart&&at+pattern.length<=end&&pattern.every((value,i)=>value===null||bytes[at+i]===value);
 const word=at=>bytes[at]|bytes[at+1]<<8,fail=message=>{throw Error(message);};
 const file=address=>{const offset=map.cpuToFile(address);if(!Number.isSafeInteger(offset)||offset<map.prgStart||offset>=end)fail('A construction address lies outside the mapped PRG source.');return offset;};
 const resetAddress=word(end-4);let start;try{start=file(resetAddress);}catch(error){return {status:'unknown',reason:'No mapped reset entry for this immediate PPU construction profile.'};}
 let p=start,a=null,x=null,initialControl=null,initialMask=null,recognized=false,tokens=0,writes=0;
 const charge=()=>{if(++tokens>LIMITS.tokens)fail('Construction exceeds the bounded token budget.');};
 function address(at){
  if(!match(at,[0xad,2,0x20,0xa9,null,0x8d,6,0x20]))return null;
  if(match(at+8,[0xa9,null,0x8d,6,0x20]))return {value:bytes[at+4]<<8|bytes[at+9],end:at+13,start:at};
  if(match(at+8,[0x8d,6,0x20]))return {value:bytes[at+4]*257,end:at+11,start:at};
  return null;
 }
 function writeToken(at){
  if(match(at,[0xa9,null,0x8d,7,0x20]))return {start:at,end:at+5,value:bytes[at+1],count:1,valueFileOffset:at+1,storeFileOffset:at+2,kind:'literal'};
  if(match(at,[0xa9,null,0xa2,null,0x8d,7,0x20,0xca,0xd0,0xfa]))return {start:at,end:at+10,value:bytes[at+1],count:bytes[at+3]||256,valueFileOffset:at+1,countFileOffset:at+3,storeFileOffset:at+4,kind:'counted-fill'};
  return null;
 }
 function countWrite(){if(++writes>LIMITS.writes)fail('Construction exceeds the bounded PPU-write budget.');}
 try{
  // Bounded reset preamble. Poll and RAM-clear loops are recognized as complete
  // macros and skipped; their iteration bodies are never run by this decoder.
  let paletteSetup=null;
  while(p-start<=LIMITS.prefixBytes){
   charge();paletteSetup=address(p);if(paletteSetup?.value===0x3f00)break;
   if(match(p,[0xad,2,0x20,0x10,0xfb])){a=null;p+=5;continue;}
   if(match(p,[0xa9,null,0xa2,null,0x95,null,0xe8,0xd0,0xfb])){a=bytes[p+1];x=0;p+=9;continue;}
   if(match(p,[0xa9,null,0xa2,null,0x9d,0,null,0xe8,0xd0,0xfa])&&bytes[p+6]>=2&&bytes[p+6]<=7){a=bytes[p+1];x=0;p+=10;continue;}
   if(match(p,[0xa9,null])){a=bytes[p+1];p+=2;continue;}
   if(match(p,[0xa2,null])){x=bytes[p+1];p+=2;continue;}
   if(match(p,[0x8d,0,0x20])&&a!==null){if(a&0x80)return {status:'unknown',reason:'Initialization enables NMI before its background construction is complete.'};initialControl=a;p+=3;continue;}
   if(match(p,[0x8d,1,0x20])&&a!==null){initialMask=a;p+=3;continue;}
   if(match(p,[0x9a])&&x!==null||match(p,[0x78])||match(p,[0xd8])||match(p,[0xea])){p++;continue;}
   return {status:'unknown',reason:'Reset initialization is outside the supported immediate PPU construction grammar.'};
  }
  if(!paletteSetup||paletteSetup.value!==0x3f00)return {status:'unknown',reason:'No bounded reset-linked palette initialization was found.'};
  if(initialControl===null||initialMask===null||(initialControl&0x84)||(initialMask&0x18))return {status:'unknown',reason:'Initialization does not prove forced blank, NMI off and single-byte PPU increments.'};
  recognized=true;
  const palette=Array(32).fill(0),paletteLastWriters=Array(32).fill(null),paletteWrites=[];p=paletteSetup.end;let paletteCount=0;
  while(paletteCount<32){
   charge();const token=writeToken(p);if(!token||paletteCount+token.count>32)fail('The recognized palette must contain exactly 32 immediate PPU writes.');
   if(token.value>63)fail('Palette values outside the six-bit NES color domain are unsupported.');
   for(let i=0;i<token.count;i++){
    countWrite();const originalIndex=paletteCount++,index=(originalIndex&0x13)===0x10?originalIndex-16:originalIndex;
    palette[index]=token.value;paletteLastWriters[index]=token.valueFileOffset;
    if((index&3)===0){palette[index+16]=token.value;paletteLastWriters[index+16]=token.valueFileOffset;}
    paletteWrites.push({ppuAddress:0x3f00+originalIndex,value:token.value,valueFileOffset:token.valueFileOffset,storeFileOffset:token.storeFileOffset});
   }
   p=token.end;
  }
  const paletteEnd=p;if(!match(p,[0x20,null,null]))fail('The recognized initialization must call its background constructor directly.');
  const callFileOffset=p,routineAddress=word(p+1),routineStart=file(routineAddress),returnFileOffset=p+3;
  if(routineStart>=start&&routineStart<=returnFileOffset)fail('The background call overlaps reset initialization.');
  p=routineStart;const nametable=Array(1024).fill(0),knownNametable=Array(1024).fill(false),lastWriters=Array(1024).fill(null),segments=[],constructionTokens=[];let target=null,currentSegment=null,routineEnd=null,scrollWrites=0;
  while(p<end){
   charge();const setup=address(p);
   if(setup){
    if(setup.value!==0&&(setup.value<0x2000||setup.value>0x23ff))fail('Construction addresses leave the one supported nametable.');
    target=setup.value;currentSegment={ppuAddress:target,setupFileOffset:p,setupLength:setup.end-p,writeCount:0};segments.push(currentSegment);p=setup.end;continue;
   }
   const token=writeToken(p);
   if(token){
    if(target===null||target<0x2000||target+token.count>0x2400)fail('A constructed write leaves the bounded nametable.');
    // Indexed rows avoid repeating a full source record for every destination.
    // The exact literal/fill operand layout below determines every byte source;
    // a destination's repeat index is its PPU address minus the token address.
    const tokenId=constructionTokens.length;
    constructionTokens.push([token.start,target,token.count,token.value,token.kind==='counted-fill'?1:0]);
    for(let i=0;i<token.count;i++){
     countWrite();const index=target++-0x2000;nametable[index]=token.value;knownNametable[index]=true;lastWriters[index]=tokenId;currentSegment.writeCount++;
    }
    p=token.end;continue;
   }
   if(match(p,[0xa9,0,0x8d,5,0x20])){scrollWrites++;p+=5;continue;}
   if(match(p,[0x60])){routineEnd=p+1;break;}
   fail('A recognized constructor contains an unsupported or malformed instruction sequence.');
  }
  if(routineEnd===null)fail('The background constructor has no bounded return.');
  if(knownNametable.some(value=>!value))fail('The constructor does not establish all 960 tiles and 64 attribute bytes.');
  if(scrollWrites!==2)fail('The constructor must finish with two explicit zero-scroll writes.');
  // Prove the background bank and display setup following the direct call.
  // Both address and scroll latches are reset explicitly; no inferred state.
  p=returnFileOffset;const tailAddress=address(p);if(!tailAddress||tailAddress.value!==0)fail('Initialization lacks its explicit zero address reset.');p=tailAddress.end;
  if(!match(p,[0xa9,0,0x8d,5,0x20,0xa9,0,0x8d,5,0x20]))fail('Initialization lacks two explicit zero-scroll writes.');p+=10;
  const controlWrites={};for(let i=0;i<2;i++){
   if(!match(p,[0xa9,null,0x8d,null,0x20])||![0,1].includes(bytes[p+3])||Object.hasOwn(controlWrites,bytes[p+3]))fail('Initialization does not prove final PPU control and mask values.');
   if(i===0&&bytes[p+3]===0&&(bytes[p+1]&0x80))fail('An NMI-enabling control write must be the final initialization store.');
   controlWrites[bytes[p+3]]={value:bytes[p+1],fileOffset:p+1};p+=5;
  }
  const control=controlWrites[0].value,ppuMask=controlWrites[1].value,backgroundPatternTable=(control>>4)&1;
  if(control&3)fail('Final PPU control selects an unsupported nametable.');
  if(!(ppuMask&8)||ppuMask&0xe1)fail('Background disabled, grayscale or color-emphasis display modes are unsupported.');
  const chrStart=map.chrStart+backgroundPatternTable*4096;
  const background={key:'reset-background-'+routineStart.toString(16),label:'Initialized native background',chrBytes:Array.from(bytes.slice(chrStart,chrStart+4096)),nametable,palette,knownNametable,backgroundPatternTable,ppuMask,
   evidence:[{status:'decoded',claim:'A reset-linked initialization establishes 32 palette writes, a bounded immediate/counted-fill constructor covering every nametable byte, and explicit final background bank/mask/zero-scroll settings.',ranges:[{start,length:p-start},{start:routineStart,length:routineEnd-routineStart}]},{status:'decoded',claim:'The selected background pattern bank follows the proven final PPUCTRL bit 4 in the static NROM CHR mapping.',ranges:[{start:chrStart,length:4096},{start:controlWrites[0].fileOffset,length:1}]}],
   construction:{format:'NESForgeImmediatePPUConstruction',version:1,resetAddress,resetFileOffset:start,callFileOffset,routineAddress,routineFileOffset:routineStart,routineByteLength:routineEnd-routineStart,paletteFileOffset:paletteSetup.start,paletteByteLength:paletteEnd-paletteSetup.start,initialControl,initialMask,finalControl:control,finalControlFileOffset:controlWrites[0].fileOffset,finalMaskFileOffset:controlWrites[1].fileOffset,ppuIncrement:1,nametableWriteCount:segments.reduce((n,s)=>n+s.writeCount,0),tokenFields:['fileOffset','ppuAddress','count','value','kind'],tokenKinds:[{kind:'literal',byteLength:5,valueOffset:1,storeOffset:2},{kind:'counted-fill',byteLength:10,valueOffset:1,countOffset:3,storeOffset:4}],tokens:constructionTokens,segments,nametableLastWriterTokens:lastWriters,paletteWrites,paletteLastWriters,knownCoverage:1024,sourceChrRange:{start:chrStart,length:4096}},
   unknown:['later-background-updates','sprites','collision','gameplay','audio','runtime-timing'],limitations:[...limitations]};
  return freeze({status:'supported',reason:'A structurally validated reset initializer constructs one complete native background with known physical sources.',background});
 }catch(error){return {status:recognized?'invalid':'unknown',reason:error.message};}
}
services.REImmediatePPUBackground=Object.freeze({id:ID,limits:LIMITS,decode,limitations});
shared.registerAdapter({id:ID,name:'Immediate PPU background construction',limitations,decode});
})();
