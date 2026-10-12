/* Bounded native command-map interpretation. Source-backed opcode structures
 * describe a representation; names, source hashes and graphics never select it.
 * No native code execution, project mutation or native ROM patching occurs here. */
(()=>{
'use strict';
const services=window.Forge.services,ID='nes.command-map.v1';
const pattern=text=>text.split(/\s+/).map(value=>value==='??'?null:parseInt(value,16));
const PARAM=pattern('ac ?? ?? d0 22 48 a9 00 85 01 68 0a 0a 0a 26 01 18 69 ?? 85 00 a5 01 69 ?? 85 01 a0 00 b1 00 99 ?? ?? c8 c0 08 d0 f6 ad ?? ?? 48 4a 4a 8d ?? ?? ee ?? ?? ad ?? ?? f0 0b ad ?? ?? 0a 18 6d ?? ?? 8d ?? ?? 68 29 03 8d ?? ?? ad ?? ?? 85 00 ad ?? ?? 85 01 ad ?? ?? 85 02 ad ?? ?? 85 03 ad ?? ?? 48 29 07 8d ?? ?? ee ?? ?? 68 a2 00 a0 00 29 08 aa bd ?? ?? 84 04 a8 b9 00 00 a4 04 99 ?? ?? e8 c8 c0 10 d0 ec ad ?? ?? 29 f0 c9 40 d0 04 ee ?? ?? 60 c9 10 d0 04 a9 01 85 ?? c9 20 d0 05 a9 02 85 ?? 60 c9 30 d0 05 a9 03 85 ?? 60 60');
const LOADER=pattern('ad ?? ?? 85 06 ad ?? ?? 85 07 a9 01 8d ?? ?? a0 00 b1 06 85 00 c8 b1 06 d0 11 a5 00 48 29 0f 8d ?? ?? 68 4a 4a 4a 4a 8d ?? ?? 60 c8 48 29 0f 85 01 aa bd ?? ?? 85 08 68 29 f0 4a 4a 4a 84 02 20 ?? ?? a4 02 4c ?? ?? aa 4a 85 03 bd ?? ?? 48 bd ?? ?? 48 a5 03 a6 00 60');
const ZERO=pattern('a5 08 9d ?? ?? 60'),ONE=pattern('84 ?? a4 01 b9 ?? ?? a4 ?? 9d ?? ?? 60');
const HORIZONTAL=pattern('38 e9 02 a8 b9 ?? ?? a4 01 c8 9d ?? ?? e8 88 d0 f9 60');
const VERTICAL=pattern('38 e9 09 a8 b9 ?? ?? a4 01 c8 9d ?? ?? 48 8a 38 e9 f0 aa 68 88 d0 f3 60');
const RECTANGLE=pattern('e6 02 b1 06 48 29 0f 85 04 68 4a 4a 4a 4a 85 05 e6 04 e6 05 a4 04 a5 08 86 00 9d ?? ?? e8 88 d0 f9 a5 00 a6 00 38 e9 f0 aa c6 05 d0 e7 60');
const PREDICATE=pattern('84 ?? a8 b9 ?? ?? a4 ?? 29 04 60');
const GENERATE=pattern('ad ?? ?? f0 03 4c ?? ?? a9 00 8d ?? ?? aa 9d ?? ?? e8 d0 fa ad ?? ?? f0 03 4c ?? ?? a9 0c 85 00 20 ?? ?? 29 0c f0 37 ee ?? ?? a5 00 c9 01 d0 03 4c ?? ?? 0a 0a 0a 0a 85 02 20 ?? ?? 18 6a 6a 6a 29 0f 05 02 aa a9 04 85 01 a9 17 9d ?? ?? 8a 29 f0 85 02 e8 8a 29 0f 05 02 aa c6 01 d0 eb c6 00 d0 be ad ?? ?? c9 05 b0 03 4c ?? ?? 20 ?? ?? ad ?? ?? f0 03 20 ?? ?? 20 ?? ?? 20 ?? ?? 20 ?? ?? 60');
const NEWLEVEL=pattern('ad ?? ?? d0 11 ad ?? ?? f0 03 4c ?? ?? a5 ?? c9 ?? d0 03 4c ?? ?? a5 ?? f0 09 a5 ?? c9 03 d0 03 4c ?? ?? 20 ?? ?? 20 ?? ?? 20 ?? ?? a2 00 8a 9d 00 06');
const CALLER=pattern('a9 00 8d 01 20 a5 ?? 20 ?? ?? 20 ?? ?? ad ?? ?? 0d ?? ??');
const LIMITATIONS=Object.freeze([
 'Only the declared coherent command-loader, configuration, zero-initialization and full-solid lookup structures are recognized. Unknown engines remain unsupported.',
 'Native records are expanded before PrettyLevel and RenderLevelBuf. Random clouds, grass/platform transformations and original actors, controls, physics, goals, audio and runtime effects are not recreated.',
 'The native command destination is an 8-bit 16 by 16 buffer. Command wrap and row-boundary crossings remain visible in evidence and prevent static conversion.',
 'Only fixed native empty and solid cells with verified flag values can enter the first conversion subset. One-way landing, hazards, interactions, moving/cycling cells and level scrolling remain distinct and refuse conversion.',
 'The lower native buffer row is outside the 16 by 15 visible region. Nonempty cropped cells prevent conversion. Unreferenced byte sequences are not guessed to be maps.',
 'Zero-pointer configurations use procedural generation. A nonzero pointer with a zero low byte also enters procedural generation before decoding and is not a known-empty map.'
]);
function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
function parseContainer(bytes){
 if(!(bytes instanceof Uint8Array))throw Error('A bounded Uint8Array ROM snapshot is required.');
 if(bytes.length!==32784)throw Error('This command-map profile requires exactly 32 KiB PRG and no physical CHR ROM.');
 const header=[78,69,83,26,2,0,0,8,0,0,0,7,0,0,0,0];
 if(!header.every((value,index)=>bytes[index]===value))throw Error('This profile requires the declared NES 2.0 NROM, NTSC, 8 KiB CHR-RAM container without trainer or additional memory.');
 return Object.freeze({format:'NES 2.0',mapper:0,prgStart:16,prgSize:32768,chrSize:0,chrRamSize:8192,cpuToFile(address,length=1){if(!Number.isSafeInteger(address)||!Number.isSafeInteger(length)||length<1||address<0x8000||address+length>0x10000)throw Error('Native reference is outside the bounded PRG mapping.');return address-0x8000+16;}});
}
const word=(bytes,index)=>bytes[index]|bytes[index+1]<<8;
function matches(bytes,start,shape){return Number.isInteger(start)&&start>=16&&start+shape.length<=bytes.length&&shape.every((value,index)=>value===null||bytes[start+index]===value);}
function scan(bytes,shape,start=16,end=bytes.length){const out=[];for(let index=start;index+shape.length<=end;index++)if(matches(bytes,index,shape))out.push(index);return out;}
const cpu=file=>file+0x8000-16;
function distinctNativeState(regions){
 // Accept only physical internal RAM addresses. Mirrored RAM and I/O operands
 // are not silently normalized: they leave this declared memory layout.
 const used=new Set();
 for(const [start,length] of regions){
  if(!Number.isInteger(start)||!Number.isInteger(length)||length<1||start<0||start+length>0x800)return false;
  for(let address=start;address<start+length;address++){if(used.has(address))return false;used.add(address);}
 }
 return true;
}
function decode(input){
 let container;try{container=parseContainer(input);}catch(error){return{status:'unsupported',reason:String(error.message||error)};}
 const bytes=input,at=container.cpuToFile;
 try{
  const candidates=[], roots={loader:scan(bytes,LOADER),parameter:scan(bytes,PARAM),generate:scan(bytes,GENERATE),entry:scan(bytes,NEWLEVEL),predicate:scan(bytes,PREDICATE)}, probeOffsets=scan(bytes,pattern('b9 ?? ?? 20 ?? ??'));
  if(Object.values(roots).some(list=>list.length>8)||probeOffsets.length>256)return{status:'ambiguous',reason:'The number of possible code structures exceeds this bounded profile.'};
  for(const loader of roots.loader){
   const loaderCPU=cpu(loader),mapPointer=word(bytes,loader+1),mappedFlag=word(bytes,loader+13),spawnX=word(bytes,loader+32),spawnY=word(bytes,loader+40),singleAddress=word(bytes,loader+51),tableAddress=word(bytes,loader+80);
   if(word(bytes,loader+6)!==mapPointer+1||word(bytes,loader+64)!==loaderCPU+71||word(bytes,loader+69)!==loaderCPU+17||word(bytes,loader+76)!==tableAddress+1)continue;
   const dispatch=at(tableAddress,28),targets=Array.from({length:14},(_,index)=>(word(bytes,dispatch+index*2)+1)&65535),handlers=[ZERO,ONE,HORIZONTAL,VERTICAL,RECTANGLE],addresses=[targets[0],targets[1],targets[2],targets[9],targets[13]];
   if(targets.slice(2,9).some(value=>value!==addresses[2])||targets.slice(9,13).some(value=>value!==addresses[3])||new Set(addresses).size!==5)continue;
   const offsets=addresses.map((address,index)=>at(address,handlers[index].length));if(offsets.some((offset,index)=>!matches(bytes,offset,handlers[index])))continue;
   const [zero,one,horizontal,vertical,rectangle]=offsets,levelBuffer=word(bytes,zero+3),fillAddress=word(bytes,horizontal+5);
   if(levelBuffer<0x200||levelBuffer>0x700||(levelBuffer&255)||[word(bytes,one+10),word(bytes,horizontal+11),word(bytes,vertical+11),word(bytes,rectangle+27)].some(value=>value!==levelBuffer)||word(bytes,one+5)!==singleAddress+16||bytes[one+1]!==bytes[one+8]||word(bytes,vertical+5)!==fillAddress)continue;
   const singleOffset=at(singleAddress,22),fillOffset=at(fillAddress,7),single=Array.from(bytes.slice(singleOffset,singleOffset+22)),fill=Array.from(bytes.slice(fillOffset,fillOffset+7));
   if([...single,...fill].some(value=>value>=36))continue;
   // Operation names describe the proven dispatch semantics; data values remain
   // native references, not a filename/hash recognition table.
   if(fill[0]!==single[4]||fill[1]!==single[0]||fill[2]!==single[8]||fill[3]!==single[9]||fill[4]!==single[6]||fill[5]!==single[10]||fill[6]!==single[11])continue;
   for(const parameter of roots.parameter){
    const config=word(bytes,parameter+32),editMode=word(bytes,parameter+1),table=bytes[parameter+18]|bytes[parameter+24]<<8;
    if(config+6!==mapPointer||word(bytes,parameter+40)!==config||word(bytes,parameter+74)!==config+2||word(bytes,parameter+79)!==config+3||word(bytes,parameter+84)!==config+4||word(bytes,parameter+89)!==config+5||word(bytes,parameter+94)!==config+1||word(bytes,parameter+134)!==config+1)continue;
    const goalParam=word(bytes,parameter+46),goalType=word(bytes,parameter+71),maxEnemies=word(bytes,parameter+100),enemyPool=word(bytes,parameter+125),noCycle=word(bytes,parameter+143),scrollMode=bytes[parameter+153],distribution=at(word(bytes,parameter+114),32);
    if([49,57,62,65].some(index=>word(bytes,parameter+index)!==goalParam)||word(bytes,parameter+103)!==maxEnemies||bytes[parameter+161]!==scrollMode||bytes[parameter+170]!==scrollMode||Array.from(bytes.slice(distribution,distribution+32)).some(value=>value>3))continue;
    for(const generate of roots.generate){
     const generateCPU=cpu(generate);
     if(word(bytes,generate+1)!==editMode||word(bytes,generate+6)!==generateCPU+119||word(bytes,generate+15)!==levelBuffer||word(bytes,generate+21)!==mapPointer||word(bytes,generate+26)!==generateCPU+111||word(bytes,generate+76)!==levelBuffer||word(bytes,generate+40)!==word(bytes,generate+11)||word(bytes,generate+99)!==word(bytes,generate+11)||word(bytes,generate+106)!==generateCPU||word(bytes,generate+112)!==mapPointer+1||word(bytes,generate+117)!==loaderCPU)continue;
     for(const entry of roots.entry){
      const levelVariable=bytes[entry+14],recordCount=bytes[entry+16];if(bytes[entry+27]!==levelVariable||recordCount<1||recordCount>64||word(bytes,parameter+52)!==word(bytes,entry+6))continue;
      const callers=scan(bytes,CALLER,entry+NEWLEVEL.length,Math.min(bytes.length,entry+512)).filter(caller=>bytes[caller+6]===levelVariable&&word(bytes,caller+8)===cpu(parameter)&&word(bytes,caller+11)===generateCPU&&word(bytes,caller+14)===editMode&&word(bytes,caller+17)===mappedFlag);
      if(callers.length!==1)continue;
      // The predicate must also be referenced by a native collision probe that
      // loads a cell from this same buffer, rather than merely existing as bytes.
      for(const predicate of roots.predicate){
       if(bytes[predicate+1]!==bytes[predicate+7])continue;
       // GenerateLevel clears all LevelBuf bytes before reading the map pointer;
       // aliased config/state would therefore change the native construction.
       // The loader owns scratch $00..$08, uses the CPU stack page, and writes mapped/spawn state.
       if(!distinctNativeState([[0,9],[0x100,0x100],[config,8],[levelBuffer,256],[editMode,1],[mappedFlag,1],[spawnX,1],[spawnY,1],[word(bytes,generate+11),1],[bytes[one+1],1],[bytes[predicate+1],1],[levelVariable,1],[word(bytes,entry+1),1],[word(bytes,entry+6),1],[goalParam,1],[goalType,1],[maxEnemies,1],[enemyPool,16],[noCycle,1],[scrollMode,1]]))continue;
       const predicateCPU=cpu(predicate);
       const probes=probeOffsets.filter(offset=>word(bytes,offset+1)===levelBuffer&&word(bytes,offset+4)===predicateCPU);
       if(!probes.length)continue;
       const flagsAddress=word(bytes,predicate+4),flagsOffset=at(flagsAddress,36),flags=Array.from(bytes.slice(flagsOffset,flagsOffset+36));
       if(flags.some(value=>value>7))continue;
       const tableOffset=at(table,recordCount*8),ranges=[{start:loader,length:LOADER.length},{start:dispatch,length:28},...offsets.map((offset,index)=>({start:offset,length:handlers[index].length})),{start:parameter,length:PARAM.length},{start:distribution,length:32},{start:generate,length:GENERATE.length},{start:entry,length:NEWLEVEL.length},{start:callers[0],length:CALLER.length},{start:predicate,length:PREDICATE.length},...probes.map(start=>({start,length:6})),{start:singleOffset,length:22},{start:fillOffset,length:7},{start:flagsOffset,length:36},{start:tableOffset,length:recordCount*8}];
       candidates.push({structure:{decodeLevelMap:loaderCPU,loadLevelParams:cpu(parameter),generateLevel:generateCPU,newLevel:cpu(entry),blockIsSolid:predicateCPU,levelTable:table,levelTableOffset:tableOffset,levelCount:recordCount,levelBuffer,mapPointer,spawnX,spawnY,metatileFlags:flagsAddress,preLevelScreen:word(bytes,generate+120),prettyLevel:word(bytes,generate+123),renderLevelBuf:word(bytes,generate+126),singleTable:singleAddress,fillTable:fillAddress},tables:{single,fill,flags},ranges});
      }
     }
    }
   }
  }
  if(!candidates.length)return{status:'unknown',reason:'No coherent configuration, command-loader, zero-initialization and full-solid collision structures were found.'};
  if(candidates.length!==1)return{status:'ambiguous',reason:'Several coherent native command-map structures match; no interpretation was selected.'};
  const match=candidates[0],{structure,tables}=match,configurations=[],mapByAddress=new Map();let totalWrites=0;
  for(let index=0;index<structure.levelCount;index++){
   const offset=structure.levelTableOffset+index*8,raw=Array.from(bytes.slice(offset,offset+8)),address=word(bytes,offset+6),effect=raw[1]>>>4;
   const config={index,key:'configuration-'+index,fileOffset:offset,raw,mapAddress:address||null,mapKey:address?'map-'+address.toString(16):null,effect,procedural:!address||(address&255)===0};configurations.push(config);
   if(address&&!mapByAddress.has(address)){const expanded=expand(address,tables,at,bytes);totalWrites+=expanded.orderedWrites.length;if(totalWrites>32768)throw Error('All native maps exceed the aggregate expansion budget.');mapByAddress.set(address,expanded);}
  }
  const maps=Array.from(mapByAddress.values());
  for(const map of maps){
   map.configurationIndices=configurations.filter(config=>config.mapAddress===map.cpuAddress).map(config=>config.index);
   const knownBase=map.configurationIndices.some(index=>!configurations[index].procedural);
   map.initialization=knownBase?'native-zero-fill':'unknown-procedural-base';
   if(!knownBase){map.knownCells=map.lastWriterCommands.map(index=>index>=0);map.solid=map.solid.map((value,index)=>map.knownCells[index]?value:null);}
   map.staticConfigurationIndices=map.configurationIndices.filter(index=>!configurations[index].procedural&&(configurations[index].effect===0||configurations[index].effect===4));
   if(!map.staticConfigurationIndices.length)map.conversionRefusals.push('No referenced configuration has a known-empty initial map and a supported non-scrolling effect.');
   map.staticConvertible=map.conversionRefusals.length===0;map.unsupported=map.conversionRefusals;map.configurations=map.configurationIndices;
  }
  const result={status:'supported',reason:'Native configuration pointers, ordered map commands and full-solid predicates are decoded independently of conversion.',id:ID,container:{format:container.format,mapper:0,prgStart:16,prgSize:32768,chrSize:0,chrRamSize:8192},structure,tables,configurations,maps,evidence:[{status:'decoded',claim:'Linked configuration bounds, pointer copy, dispatch handlers, zero-filled native map buffer and referenced full-solid predicate identify this command representation.',ranges:match.ranges}],limitations:Array.from(LIMITATIONS)};
  if(JSON.stringify(result).length>2*1024*1024)throw Error('Native map evidence exceeds the declared two-MiB result budget.');
  return freeze(result);
 }catch(error){return{status:'invalid',reason:('Native command map: '+String(error.message||error)).slice(0,1900)};}
}
function expand(address,tables,at,bytes){
 const fileOffset=at(address,2),cells=Array(256).fill(0),commands=[],orderedWrites=[],lastWriterCommands=Array(256).fill(-1),conversionRefusals=[],semanticIds=new Set();let cursor=0,wrap=false,crossesRow=false;
 const next=()=>{if(cursor>=256)throw Error('Native command stream has no terminator before its 8-bit source index wraps.');return bytes[at(address+cursor++,1)];};
 let spawn=null;
 while(cursor<256){
  const start=cursor,position=next(),type=next(),kind=type>>>4,param=type&15;
  if(type===0){spawn={x:position&15,y:position>>>4};break;}
  if(kind>13||kind===1&&param>=6)throw Error('Native command dispatch or metatile sub-index is outside the declared tables.');
  let tile=kind===1?tables.single[16+param]:kind===0||kind===13?tables.single[param]:kind<=8?tables.fill[kind-2]:tables.fill[kind-9],width=1,height=1,dimensions=null;
  if(kind>=2&&kind<=8)width=param+1;else if(kind>=9&&kind<=12)height=param+1;else if(kind===13){dimensions=next();width=(dimensions&15)+1;height=(dimensions>>>4)+1;}
  if((position&15)+width>16)crossesRow=true;if((position>>>4)+height>16)wrap=true;
  const command={fileOffset:fileOffset+start,byteLength:cursor-start,position,type,kind,param,tile,width,height,dimensions,firstWrite:orderedWrites.length};
  for(let row=0;row<height;row++)for(let column=0;column<width;column++){const rawIndex=position+row*16+column,index=rawIndex&255;if(rawIndex>255)wrap=true;cells[index]=tile;lastWriterCommands[index]=commands.length;orderedWrites.push([index,tile]);}
  command.writeCount=orderedWrites.length-command.firstWrite;commands.push(command);semanticIds.add(tile);
  if(orderedWrites.length>8192)throw Error('Native command expansion exceeds the declared write budget.');
 }
 if(!spawn)throw Error('Native command stream has no bounded terminator.');
 const unsupportedCells=[];for(let index=0;index<256;index++)if(cells[index]!==0&&cells[index]!==21)unsupportedCells.push(index);
 if(tables.single[0]!==0||tables.single[4]!==21||tables.flags[0]!==0||tables.flags[21]!==4)conversionRefusals.push('The proven fixed empty/solid identities or their native flag values changed.');
 if(unsupportedCells.length)conversionRefusals.push('Native cells include one-way, interactive, hazardous, moving or cycling semantics outside fixed empty/solid conversion.');
 // Overwritten stateful commands may be harmless in this loader but retaining
 // their presence avoids implying recovery of interactions beyond this subset.
 if(Array.from(semanticIds).some(tile=>tile!==0&&tile!==21))conversionRefusals.push('The command history includes metatile semantics outside the static subset.');
 if(wrap||crossesRow)conversionRefusals.push('Native command writes wrap the buffer or cross a row boundary.');
 if(cells.slice(240).some(Boolean))conversionRefusals.push('The native row outside the 16 by 15 visible region contains nonempty cells.');
 return{key:'map-'+address.toString(16),label:'Native map $'+address.toString(16).toUpperCase(),cpuAddress:address,fileOffset,byteLength:cursor,width:16,height:16,visibleWidth:16,visibleHeight:15,cellPixels:16,cells,knownCells:Array(256).fill(true),solid:cells.map(tile=>(tables.flags[tile]&4)!==0),commands,orderedWrites,lastWriterCommands,spawn,wrapsBuffer:wrap,crossesRow,unsupportedCells,conversionRefusals,evidence:[{status:'decoded',claim:'Ordered native map commands, including overwrites and terminal spawn, expand into the declared zero-filled 256-cell buffer.',ranges:[{start:fileOffset,length:cursor}]}]};
}
services.RENativeCommandMap=Object.freeze({version:1,id:ID,parseContainer,decode});
})();
