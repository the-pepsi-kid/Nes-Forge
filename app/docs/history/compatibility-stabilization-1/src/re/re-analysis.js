/* NES Forge general ROM inspection. Physical bytes are authoritative; neither
 * an engine profile nor a working emulator is required. No editor/emulator API
 * is called here. References: MOS/Synertek MCS6500 Programming Manual, Appendix
 * D (https://syncopate.us/books/Synertek6502ProgrammingManual.html), and the
 * container specifications https://www.nesdev.org/wiki/INES and /wiki/NES_2.0.
 */
(()=>{
'use strict';
const services=(window.Forge=window.Forge||{}).services=window.Forge.services||{};
const LIMITS=Object.freeze({input:64*1024*1024,read:65536,disassembly:4096,searchScan:1048576,searchResults:256,searchPattern:256});
const span=(start,length)=>({start,length,endExclusive:start+length});
function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
function fail(message){throw Error('RE analysis: '+message);}
function integer(value,min,max,label){if(!Number.isSafeInteger(value)||value<min||value>max)fail(label+' must be an integer from '+min+' to '+max+'.');return value;}
function label(value,name,max=256){if(typeof value!=='string')fail(name+' must be text.');if(value.length>max)fail(name+' must be at most '+max+' characters.');return value;}
function options(value){if(!value||typeof value!=='object'||Array.isArray(value))fail('Options must be an object.');return value;}
function snapshot(input){
  if(input instanceof Uint8Array){
    if(typeof SharedArrayBuffer!=='undefined'&&input.buffer instanceof SharedArrayBuffer)fail('Shared memory input is unsupported; supply an ordinary copied buffer.');
    integer(input.byteLength,0,LIMITS.input,'Input byte length');return new Uint8Array(input);
  }
  if(input instanceof ArrayBuffer){integer(input.byteLength,0,LIMITS.input,'Input byte length');return new Uint8Array(input.slice(0));}
  fail('Supply a Uint8Array or ArrayBuffer.');
}
async function hash(bytes){
  if(!window.crypto?.subtle?.digest)fail('SHA-256 is unavailable in this browser context.');
  const result=await window.crypto.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(result),byte=>byte.toString(16).padStart(2,'0')).join('');
}
function parseContainer(bytes){
  const rawBytes=Array.from(bytes.slice(0,16));
  const raw=reason=>({header:{status:'raw',format:'raw',rawBytes,mapper:null,submapper:null,prgSize:null,chrSize:null},layout:{header:null,trainer:null,prg:null,chr:null,trailing:null,raw:span(0,bytes.length)},warnings:[reason+' All original bytes remain available for physical inspection.']});
  if(bytes.length<4||bytes[0]!==0x4e||bytes[1]!==0x45||bytes[2]!==0x53||bytes[3]!==0x1a)return raw('No recognized NES container header; platform, CPU variant, load address and bank layout are unknown.');
  if(bytes.length<16)return raw('The NES header is truncated.');
  const formatBits=bytes[7]&12,nes2=formatBits===8;
  if(formatBits!==0&&!nes2)return raw('Unsupported NES header format bits.');
  if(!nes2&&((bytes[9]&0xfe)||bytes.slice(10,16).some(value=>value!==0)))return raw('The iNES header has unsupported extensions or reserved bytes; its bank declarations are not trusted.');
  if(nes2&&((bytes[12]&0xfc)||(bytes[14]&0xfc)||(bytes[15]&0xc0)))return raw('The NES 2.0 header has unsupported reserved bits.');
  const size=(low,high,unit)=>high===15?Math.pow(2,low>>2)*((low&3)*2+1):((high<<8)|low)*unit;
  const prgSize=nes2?size(bytes[4],bytes[9]&15,16384):bytes[4]*16384;
  const chrSize=nes2?size(bytes[5],bytes[9]>>4,8192):bytes[5]*8192;
  if(!Number.isSafeInteger(prgSize)||!Number.isSafeInteger(chrSize)||prgSize>LIMITS.input||chrSize>LIMITS.input)return raw('Declared NES ROM sizes exceed the bounded inspection range.');
  if(!prgSize)return raw('The NES header declares no PRG ROM.');
  const trainerSize=bytes[6]&4?512:0,prgStart=16+trainerSize,chrStart=prgStart+prgSize,end=chrStart+chrSize;
  if(end>bytes.length)return raw('The NES header declares '+end+' bytes but this file has '+bytes.length+'; its payload is truncated.');
  const mapper=(bytes[6]>>4)|(bytes[7]&0xf0)|(nes2?(bytes[8]&15)<<8:0),submapper=nes2?bytes[8]>>4:0,consoleType=bytes[7]&3;
  if(nes2&&((consoleType===0||consoleType===2)&&bytes[13]!==0))return raw('The NES 2.0 header uses reserved console-detail data.');
  if(nes2&&consoleType===3&&(bytes[13]&0xf0))return raw('The NES 2.0 extended console header uses reserved high bits.');
  const warnings=['Header values are declarations; no hardware behavior has been observed.'];
  if(consoleType!==0)warnings.push('This container declares a nonstandard NES console type; generic byte inspection is available, but no platform execution or static CPU map is claimed.');
  if(end<bytes.length)warnings.push('Trailing bytes are preserved and inspectable; miscellaneous ROMs, console data or other trailing structure are not decoded.');
  return {header:{status:'valid',format:nes2?'NES 2.0':'iNES 1.0',rawBytes,mapper,submapper,prgSize,chrSize,trainer:!!trainerSize,consoleType,batteryFlag:!!(bytes[6]&2),nametableLayoutFlag:bytes[6]&8?'four-screen':bytes[6]&1?'vertical':'horizontal'},layout:{header:span(0,16),trainer:trainerSize?span(16,trainerSize):null,prg:span(prgStart,prgSize),chr:chrSize?span(chrStart,chrSize):null,trailing:end<bytes.length?span(end,bytes.length-end):null,raw:span(0,bytes.length)},warnings};
}
// Only documented NMOS encodings. An unrecognized opcode is one unclassified
// byte, not an assertion that it is an invalid CPU instruction. Linear sweeps
// cannot establish code/data boundaries, especially after an unknown opcode.
const OPCODES=(
  'BRK:imp ORA:izx - - - ORA:zp ASL:zp - PHP:imp ORA:imm ASL:acc - - ORA:abs ASL:abs - '+
  'BPL:rel ORA:izy - - - ORA:zpx ASL:zpx - CLC:imp ORA:aby - - - ORA:abx ASL:abx - '+
  'JSR:abs AND:izx - - BIT:zp AND:zp ROL:zp - PLP:imp AND:imm ROL:acc - BIT:abs AND:abs ROL:abs - '+
  'BMI:rel AND:izy - - - AND:zpx ROL:zpx - SEC:imp AND:aby - - - AND:abx ROL:abx - '+
  'RTI:imp EOR:izx - - - EOR:zp LSR:zp - PHA:imp EOR:imm LSR:acc - JMP:abs EOR:abs LSR:abs - '+
  'BVC:rel EOR:izy - - - EOR:zpx LSR:zpx - CLI:imp EOR:aby - - - EOR:abx LSR:abx - '+
  'RTS:imp ADC:izx - - - ADC:zp ROR:zp - PLA:imp ADC:imm ROR:acc - JMP:ind ADC:abs ROR:abs - '+
  'BVS:rel ADC:izy - - - ADC:zpx ROR:zpx - SEI:imp ADC:aby - - - ADC:abx ROR:abx - '+
  '- STA:izx - - STY:zp STA:zp STX:zp - DEY:imp - TXA:imp - STY:abs STA:abs STX:abs - '+
  'BCC:rel STA:izy - - STY:zpx STA:zpx STX:zpy - TYA:imp STA:aby TXS:imp - - STA:abx - - '+
  'LDY:imm LDA:izx LDX:imm - LDY:zp LDA:zp LDX:zp - TAY:imp LDA:imm TAX:imp - LDY:abs LDA:abs LDX:abs - '+
  'BCS:rel LDA:izy - - LDY:zpx LDA:zpx LDX:zpy - CLV:imp LDA:aby TSX:imp - LDY:abx LDA:abx LDX:aby - '+
  'CPY:imm CMP:izx - - CPY:zp CMP:zp DEC:zp - INY:imp CMP:imm DEX:imp - CPY:abs CMP:abs DEC:abs - '+
  'BNE:rel CMP:izy - - - CMP:zpx DEC:zpx - CLD:imp CMP:aby - - - CMP:abx DEC:abx - '+
  'CPX:imm SBC:izx - - CPX:zp SBC:zp INC:zp - INX:imp SBC:imm NOP:imp - CPX:abs SBC:abs INC:abs - '+
  'BEQ:rel SBC:izy - - - SBC:zpx INC:zpx - SED:imp SBC:aby - - - SBC:abx INC:abx -'
).split(' ').map(entry=>entry==='-'?null:entry.split(':'));
const LENGTHS={imp:1,acc:1,imm:2,zp:2,zpx:2,zpy:2,izx:2,izy:2,rel:2,abs:3,abx:3,aby:3,ind:3};
const hex=(value,width)=>'$'+value.toString(16).toUpperCase().padStart(width,'0');
async function open(input,configuration={}){
  options(configuration);const name=label(configuration.name===undefined?'ROM bytes':configuration.name,'File name',512);
  // Copy before the first await. Caller mutation cannot change the digest or
  // any later inspection, even while Web Crypto is still running.
  const bytes=snapshot(input),sha256=await hash(bytes),container=parseContainer(bytes),{header,layout}=container;
  const source=(offset,length)=>({sha256,file:span(offset,length),evidence:'original-file-bytes'});
  function range(offset,length,max,labelText){integer(offset,0,bytes.length,'File offset');integer(length,0,Math.min(max,bytes.length-offset),labelText);}
  const staticNrom=header.status==='valid'&&header.mapper===0&&header.submapper===0&&header.consoleType===0&&(header.prgSize===16384||header.prgSize===32768)&&(header.chrSize===0||header.chrSize===8192);
  const windows=staticNrom?[{cpu:span(0x8000,16384),file:span(layout.prg.start,16384),bankLabel:header.prgSize===16384?'NROM mirrored PRG':'NROM lower PRG',evidence:'header-derived-static-map'},{cpu:span(0xc000,16384),file:span(layout.prg.start+(header.prgSize===16384?0:16384),16384),bankLabel:header.prgSize===16384?'NROM mirrored PRG':'NROM upper PRG',evidence:'header-derived-static-map'}]:[];
  const cpuMapping=staticNrom?{status:'known-static',profile:header.prgSize===16384?'NROM-128':'NROM-256',windows}:{status:'unknown',reason:header.status==='raw'?'platform-and-bank-layout-unknown':'mapper-or-platform-state-not-modeled',windows};
  const vectors=['NMI','RESET','IRQ/BRK'].map((name,index)=>{
    const cpuAddress=0xfffa+index*2;
    if(!staticNrom)return {name,cpuAddress,status:'unknown',reason:'No verified static CPU mapping or observed mapper state.'};
    const fileOffset=layout.prg.start+((cpuAddress-0x8000)%header.prgSize),rawBytes=[bytes[fileOffset],bytes[fileOffset+1]],target=rawBytes[0]|rawBytes[1]<<8;
    return {name,cpuAddress,status:'read',fileOffset,rawBytes,target,provenance:source(fileOffset,2),interpretation:'Header-derived vector value; not proof of executed code.'};
  });
  const report=freeze({format:'NESForgeREInspection',version:2,modelVersion:'re-analysis-1',identity:{name,algorithm:'SHA-256',sha256,byteLength:bytes.length},header,layout,cpuMapping,vectors,
    chr:{status:layout.chr?'physical-ROM-patterns-available':header.status==='valid'?'runtime-CHR-RAM-unknown':'layout-unknown',tileCount:layout.chr?Math.floor(layout.chr.length/16):0},
    capabilities:{generalInspection:{status:'available'},addressMapping:{status:staticNrom?'known-static':'user-required',reason:staticNrom?'Header-derived NROM map; explicit mappings remain user interpretations.':'Physical bytes remain available; provide a CPU address and bank label where known.'},emulation:{status:'not-evaluated',reason:'Inspection does not load or execute a ROM.'},recovery:{status:'not-checked',reason:'Check supported recovery profiles separately.'}},
    limits:LIMITS,variants:['6502','2a03'],opcodePolicy:'151 documented NMOS 6502 encodings; unrecognized opcodes remain .byte. No 65C02 or 65816 decoding.',
    warnings:[...container.warnings,...(!staticNrom?['No CPU bank mapping has been inferred. User mappings are annotations, not observed hardware state.']:[]),'Disassembly is a linear interpretation from your selected start, not proof of code or instruction boundaries.','Palette, scene, collision, gameplay and audio meanings are not inferred from physical bytes.']});
  function read(fileOffset,length){range(fileOffset,length,LIMITS.read,'Read length');return freeze({fileOffset,bytes:Array.from(bytes.slice(fileOffset,fileOffset+length)),provenance:source(fileOffset,length)});}
  function mapRange(configuration){
    options(configuration);const {fileOffset,length,cpuAddress}=configuration,bankLabel=label(configuration.bankLabel===undefined?'':configuration.bankLabel,'Bank label');
    range(fileOffset,length,LIMITS.input,'Mapping length');integer(length,1,65536,'Mapping length');integer(cpuAddress,0,65535,'CPU address');
    if(cpuAddress+length>65536)fail('Mapping crosses CPU address $FFFF.');
    return freeze({fileOffset,length,cpuAddress,bankLabel,file:span(fileOffset,length),cpu:span(cpuAddress,length),provenance:source(fileOffset,length),evidence:'user-supplied-mapping'});
  }
  function disassemble(configuration){
    options(configuration);const {fileOffset,length}=configuration,cpuAddress=configuration.cpuAddress===undefined?null:configuration.cpuAddress,variant=configuration.variant===undefined?'6502':configuration.variant,bankLabel=label(configuration.bankLabel===undefined?'':configuration.bankLabel,'Bank label');
    range(fileOffset,length,LIMITS.disassembly,'Disassembly length');
    if(variant!=='6502'&&variant!=='2a03')fail('Unsupported CPU variant; choose 6502 or 2a03.');
    if(cpuAddress!==null){integer(cpuAddress,0,65535,'CPU address');if(cpuAddress+length>65536)fail('Disassembly mapping crosses CPU address $FFFF.');}
    const mapping=cpuAddress===null?null:(length?mapRange({fileOffset,length,cpuAddress,bankLabel}):null),rows=[];
    for(let cursor=fileOffset;cursor<fileOffset+length;){
      const entry=OPCODES[bytes[cursor]],pc=cpuAddress===null?null:cpuAddress+cursor-fileOffset,expected=entry?LENGTHS[entry[1]]:1,remaining=fileOffset+length-cursor;
      let size=expected,status='candidate-instruction',mnemonic=entry?entry[0]:'.byte',mode=entry?entry[1]:null,operand='',target=null,note='';
      if(!entry||expected>remaining){size=1;mnemonic='.byte';status=entry?'truncated-instruction':'unclassified-byte';operand=hex(bytes[cursor],2);note=entry?'Insufficient selected bytes to decode this candidate instruction.':'Undocumented or unsupported encoding; subsequent instruction boundaries remain unverified.';}
      else{
        const low=bytes[cursor+1],word=low|(bytes[cursor+2]<<8),byteText=hex(low||0,2),wordText=hex(word,4);
        if(mode==='acc')operand='A';else if(mode==='imm')operand='#'+byteText;else if(mode==='zp')operand=byteText;else if(mode==='zpx')operand=byteText+',X';else if(mode==='zpy')operand=byteText+',Y';
        else if(mode==='abs')operand=wordText;else if(mode==='abx')operand=wordText+',X';else if(mode==='aby')operand=wordText+',Y';else if(mode==='ind')operand='('+wordText+')';else if(mode==='izx')operand='('+byteText+',X)';else if(mode==='izy')operand='('+byteText+'),Y';
        else if(mode==='rel'){const displacement=low<128?low:low-256;target=pc===null?null:(pc+2+displacement)&65535;operand=target===null?(displacement>=0?'+':'')+displacement+' from next PC':hex(target,4);}
        if((mnemonic==='JMP'||mnemonic==='JSR')&&mode==='abs')target=word;
        if(mnemonic==='BRK')note='BRK encodes one opcode byte; execution skips the following padding byte. This is a linear byte listing, not an execution trace.';
      }
      rows.push({fileOffset:cursor,cpuAddress:pc,bytes:Array.from(bytes.slice(cursor,cursor+size)),mnemonic,operand,text:mnemonic+(operand?' '+operand:''),mode,length:size,status,target,bankLabel,note});cursor+=size;
    }
    return freeze({rows,variant,mapping,provenance:source(fileOffset,length),warnings:['Candidate instructions only: data can decode as instructions. The selected start and CPU variant are user interpretations.','Undocumented encodings are .byte; linear instruction alignment may become uncertain.',...(variant==='2a03'?['2A03 uses the documented NMOS encodings here; this is not a CPU execution model.']:[])]});
  }
  function search(pattern,configuration={}){
    options(configuration);if(!Array.isArray(pattern)&&!(pattern instanceof Uint8Array))fail('Search pattern must be a byte array.');
    integer(pattern.length,1,LIMITS.searchPattern,'Search pattern length');const needle=Array.from(pattern);needle.forEach(value=>integer(value,0,255,'Pattern byte'));
    const start=configuration.start===undefined?0:configuration.start,maxResults=configuration.maxResults===undefined?LIMITS.searchResults:configuration.maxResults,maxScan=configuration.maxScan===undefined?LIMITS.searchScan:configuration.maxScan;
    integer(start,0,bytes.length,'Search start');integer(maxResults,1,LIMITS.searchResults,'Maximum results');integer(maxScan,needle.length,LIMITS.searchScan,'Maximum scanned bytes');
    const end=Math.min(bytes.length,start+maxScan),matches=[],prefix=Array(needle.length).fill(0);let matched=0,scannedEnd=start,capped=false;
    // KMP keeps repeated patterns linear in the scan bound rather than O(n*m).
    for(let i=1,j=0;i<needle.length;i++){while(j&&needle[i]!==needle[j])j=prefix[j-1];if(needle[i]===needle[j])j++;prefix[i]=j;}
    for(let cursor=start;cursor<end;cursor++){
      while(matched&&bytes[cursor]!==needle[matched])matched=prefix[matched-1];if(bytes[cursor]===needle[matched])matched++;scannedEnd=cursor+1;
      if(matched===needle.length){matches.push({fileOffset:cursor-needle.length+1});matched=prefix[matched-1];if(matches.length===maxResults){capped=true;break;}}
    }
    let nextStart=capped?matches[matches.length-1].fileOffset+1:(end<bytes.length?Math.max(start+1,end-needle.length+1):bytes.length);
    if(nextStart>bytes.length-needle.length)nextStart=bytes.length;
    const hasMore=nextStart<bytes.length;
    return freeze({matches,scannedBytes:scannedEnd-start,nextStart,hasMore,truncated:hasMore,limitReached:capped?'results':hasMore?'scan':null,provenance:source(start,scannedEnd-start)});
  }
  function readChrTile(index){
    if(!layout.chr)fail(header.status==='valid'?'No CHR ROM exists in this file; runtime CHR RAM contents are unknown.':'CHR layout is unknown; inspect physical bytes or supply a known container.');
    integer(index,0,Math.floor(layout.chr.length/16)-1,'Physical CHR tile index');const fileOffset=layout.chr.start+index*16,rawBytes=Array.from(bytes.slice(fileOffset,fileOffset+16));
    const pixels=Array.from({length:8},(_,y)=>Array.from({length:8},(_,x)=>((rawBytes[y]>>(7-x))&1)|(((rawBytes[y+8]>>(7-x))&1)<<1)));
    return freeze({index,fileOffset,rawBytes,pixels,width:8,height:8,values:'2-bit pattern values; palette and scene usage unknown',ppuMapping:staticNrom?{status:'mapped',ppuAddress:index*16}:{status:'unknown',reason:'mapper-state-not-modeled'},provenance:source(fileOffset,16)});
  }
  return Object.freeze({report,read,disassemble,search,mapRange,readChrTile});
}
services.REAnalysis=Object.freeze({open,limits:LIMITS,version:2});
})();
