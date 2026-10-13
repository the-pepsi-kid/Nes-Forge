/* NES Forge 1.9.0 — bounded world ROM envelope and lossless source reopening.
 * This layout has its own decoder. Legacy ROM codecs and append import remain
 * unchanged; the old editor rejects the layout-4 marker before loading data.
 */
(()=>{
'use strict';
const Forge=window.Forge=window.Forge||{},services=Forge.services=Forge.services||{};
const BASE=0x8000,PRG_BYTES=32768,CHR_BYTES=8192,MARKER=0xCFF0,VECTORS=0xFFFA;
const RECORD_HEADER=64,MAX_DECODED=8*1024*1024,LAYOUT=4,FORMAT=1;
const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true});
const fail=message=>{throw Error('World ROM: '+message);};
const own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
const u16=(bytes,at)=>bytes[at]|bytes[at+1]<<8;
const u32=(bytes,at)=>(bytes[at]|bytes[at+1]<<8|bytes[at+2]<<16|bytes[at+3]<<24)>>>0;
const put16=(bytes,at,value)=>{bytes[at]=value&255;bytes[at+1]=value>>>8;};
const put32=(bytes,at,value)=>{bytes[at]=value&255;bytes[at+1]=value>>>8;bytes[at+2]=value>>>16;bytes[at+3]=value>>>24;};
const hasMagic=(bytes,at,text)=>Number.isInteger(at)&&at>=0&&at+text.length<=bytes.length&&[...text].every((c,i)=>bytes[at+i]===c.charCodeAt(0));
const crcTable=Uint32Array.from({length:256},(_,index)=>{let value=index;for(let bit=0;bit<8;bit++)value=value&1?0xEDB88320^(value>>>1):value>>>1;return value>>>0;});
function crc32(bytes){if(!(bytes instanceof Uint8Array))fail('CRC requires bytes');let crc=0xFFFFFFFF;for(const byte of bytes)crc=crcTable[(crc^byte)&255]^(crc>>>8);return (crc^0xFFFFFFFF)>>>0;}
function count(value){if(!Number.isInteger(value)||value<1||value>32)fail('world count must be 1–32');return value;}

// Deterministic LZSS: one flag byte for up to eight tokens (1 = literal).
// A two-byte little-endian match stores (distance-1)<<4 | (length-3).
// Length code 15 has a canonical 1–3 byte base-128 extension for length-18.
// The 4 KB window, 65,553-byte match and capped hash search bound encoder work;
// the expected output length and strict final-token check bound decoding.
function compress(bytes){
  if(!(bytes instanceof Uint8Array)||bytes.length>MAX_DECODED)fail('authoring source exceeds the 8 MB limit');
  const output=new Uint8Array(bytes.length+Math.ceil(bytes.length/8)),heads=new Int32Array(65536),previous=new Int32Array(4096);
  heads.fill(-1);previous.fill(-1);let at=0,out=0;
  const hash=i=>((bytes[i]*251+bytes[i+1])*251+bytes[i+2])&65535;
  const remember=i=>{if(i+2>=bytes.length)return;const key=hash(i);previous[i&4095]=heads[key];heads[key]=i;};
  while(at<bytes.length){
    const flagAt=out++;let flags=0;
    for(let bit=0;bit<8&&at<bytes.length;bit++){
      let bestLength=0,bestDistance=0;
      if(at+2<bytes.length){
        let candidate=heads[hash(at)],tries=0;const limit=Math.min(65553,bytes.length-at);
        while(candidate>=0&&at-candidate<=4096&&tries++<64){
          let length=0;while(length<limit&&bytes[candidate+length]===bytes[at+length])length++;
          if(length>bestLength&&length>=3){bestLength=length;bestDistance=at-candidate;if(length===limit)break;}
          const next=previous[candidate&4095];if(next>=candidate)break;candidate=next;
        }
      }
      if(bestLength>=3){
        const token=((bestDistance-1)<<4)|Math.min(15,bestLength-3);output[out++]=token&255;output[out++]=token>>>8;
        if(bestLength>=18){let extension=bestLength-18;do{const low=extension&127;extension>>>=7;output[out++]=low|(extension?128:0);}while(extension);}
        for(let i=0;i<bestLength;i++)remember(at++);
      }
      else{flags|=1<<bit;output[out++]=bytes[at];remember(at++);}
    }
    output[flagAt]=flags;
  }
  return output.slice(0,out);
}
function decompress(bytes,expectedLength){
  if(!(bytes instanceof Uint8Array)||!Number.isInteger(expectedLength)||expectedLength<0||expectedLength>MAX_DECODED)fail('invalid decoded source length (maximum 8 MB)');
  if(bytes.length>MAX_DECODED+Math.ceil(MAX_DECODED/8))fail('compressed source exceeds the codec limit');
  const output=new Uint8Array(expectedLength);let at=0,out=0;
  while(out<expectedLength){
    if(at>=bytes.length)fail('truncated compressed source');const flags=bytes[at++];
    for(let bit=0;bit<8;bit++){
      if(out===expectedLength){if((flags>>>bit)!==0)fail('nonzero unused compression flags');break;}
      if(flags&(1<<bit)){if(at>=bytes.length)fail('truncated source literal');output[out++]=bytes[at++];}
      else{
        if(at+2>bytes.length)fail('truncated source match');const token=u16(bytes,at);at+=2;
        const distance=(token>>>4)+1;let length=(token&15)+3;
        if(length===18){
          let extension=0,shift=0,byte;
          do{
            if(at>=bytes.length||shift>14)fail('invalid or truncated source match length');byte=bytes[at++];
            extension|=(byte&127)<<shift;if(shift>0&&byte===0)fail('noncanonical source match length');shift+=7;
          }while(byte&128);
          if(extension>65535)fail('source match exceeds the codec length limit');length+=extension;
        }
        if(distance>out)fail('source match points before decoded data');
        if(out+length>expectedLength)fail('source match exceeds declared decoded length');
        for(let i=0;i<length;i++){output[out]=output[out-distance];out++;}
      }
    }
  }
  if(at!==bytes.length)fail('compressed source has trailing data');return output;
}
function validateSource(source){
  if(!source||typeof source!=='object'||Array.isArray(source)||source.format!=='NESForge'||![10,11,12].includes(source.version))fail('authoring source requires supported project schema 10, 11, or 12');
  if(source.importedRom!==null)fail('embedded source must omit original ROM bytes');
  if(source.worldRuntime?.enabled!==true)fail('authoring source does not enable world runtime');
  if(source.mapper!==0)fail('authoring source must target mapper 0');
  if(!services.ProjectStore?.prepareLoad)fail('ProjectStore validation is unavailable');
  return services.ProjectStore.prepareLoad(source);
}
function validateEngine(engine){
  if(!(engine?.bytes instanceof Uint8Array)||!engine.bytes.length||BASE+engine.bytes.length>MARKER)fail('engine exceeds the $8000–$CFEF code/data window');
  const end=BASE+engine.bytes.length,codeEnd=engine.codeEnd??end,dataEnd=engine.dataEnd??end;
  if(!Number.isInteger(codeEnd)||!Number.isInteger(dataEnd)||codeEnd<=BASE||codeEnd>dataEnd||dataEnd>end)fail('invalid engine code/data boundaries');
  for(const key of ['nmi','reset','irq'])if(!Number.isInteger(engine[key])||engine[key]<BASE||engine[key]>=codeEnd)fail('invalid '+key+' vector');
  return {end,codeEnd,dataEnd};
}
function sourceParts(source){
  // Omit imported bytes before cloning/stringifying: opened ROMs cannot grow
  // recursively inside subsequent build/open/build authoring records.
  const snapshot={...source,importedRom:null},text=JSON.stringify(snapshot);
  if(!text||text.length>MAX_DECODED)fail('authoring source exceeds the 8 MB limit');
  const raw=encoder.encode(text);if(raw.length>MAX_DECODED)fail('authoring source exceeds the 8 MB limit');
  const detached=JSON.parse(text);validateSource(detached);
  return {source:detached,raw,payload:compress(raw),schema:detached.version};
}
function writeRecord(parts,engine,chr,options){
  const bounds=validateEngine(engine),worldCount=count(options.worldCount),address=options.address,flags=options.flags;
  if(!(chr instanceof Uint8Array)||chr.length!==CHR_BYTES)fail('expected exactly 8 KB CHR');
  if(!Number.isInteger(flags)||flags<0||flags>3)fail('invalid NROM mirroring/battery flags');
  const length=RECORD_HEADER+parts.payload.length;
  if(!Number.isInteger(address)||address<BASE||address+length>VECTORS)fail('authoring record exceeds PRG capacity');
  if(address<bounds.end||(address<MARKER+16&&address+length>MARKER))fail('authoring record overlaps engine or marker');
  const record=new Uint8Array(length);record.set(encoder.encode('WG17'));record[4]=FORMAT;record[5]=1;put16(record,6,RECORD_HEADER);
  put32(record,8,parts.raw.length);put32(record,12,parts.payload.length);put32(record,16,engine.bytes.length);
  put16(record,20,bounds.codeEnd);put16(record,22,bounds.dataEnd);put16(record,24,engine.nmi);put16(record,26,engine.reset);put16(record,28,engine.irq);
  record[30]=worldCount;record[31]=flags;put32(record,32,crc32(parts.payload));put32(record,36,crc32(parts.raw));
  put32(record,40,crc32(engine.bytes));put32(record,44,crc32(chr));put32(record,48,length);put16(record,52,address);record[54]=LAYOUT;put16(record,56,parts.schema);
  put32(record,60,crc32(record.subarray(0,60)));record.set(parts.payload,RECORD_HEADER);return record;
}
function encodeSourceRecord(source,engine,chr,options){
  const flags=(source.mirroring==='v'?1:0)|(source.hasSRAM?2:0);
  return writeRecord(sourceParts(source),engine,chr,{...options,flags:options?.flags??flags});
}
function decodeSourceRecord(record,context={}){
  if(!(record instanceof Uint8Array)||record.length<RECORD_HEADER||!hasMagic(record,0,'WG17'))fail('missing or truncated WG17 authoring record');
  if(record[4]!==FORMAT)fail('unsupported WG17 source record version '+record[4]);
  if(record[5]!==1||u16(record,6)!==RECORD_HEADER)fail('unsupported source compression/header format');
  const schema=u16(record,56);if(record[54]!==LAYOUT||record[55]!==0||![10,11,12].includes(schema)||u16(record,58)!==0)fail('unsupported source schema/layout or nonzero reserved fields');
  if(crc32(record.subarray(0,60))!==u32(record,60))fail('source header checksum mismatch');
  const decodedLength=u32(record,8),payloadLength=u32(record,12),engineLength=u32(record,16),codeEnd=u16(record,20),dataEnd=u16(record,22);
  const worldCount=count(record[30]),flags=record[31],address=u16(record,52),vectors=[u16(record,24),u16(record,26),u16(record,28)];
  if(decodedLength<2||decodedLength>MAX_DECODED)fail('invalid decoded source length (maximum 8 MB)');
  if(payloadLength!==record.length-RECORD_HEADER||u32(record,48)!==record.length)fail('source record length mismatch');
  if(!engineLength||BASE+engineLength>MARKER||codeEnd<=BASE||codeEnd>dataEnd||dataEnd>BASE+engineLength)fail('invalid engine code/data boundaries');
  if(flags>3||vectors.some(vector=>vector<BASE||vector>=codeEnd))fail('invalid engine vectors or NROM flags');
  if(address<BASE+engineLength||address+record.length>VECTORS||(address<MARKER+16&&address+record.length>MARKER))fail('source record overlaps engine, marker or vectors');
  for(const key of ['address','worldCount','flags'])if(own(context,key)&&context[key]!==({address,worldCount,flags})[key])fail('source '+key+' does not match ROM envelope');
  if(context.engineBytes&&(!(context.engineBytes instanceof Uint8Array)||context.engineBytes.length!==engineLength||crc32(context.engineBytes)!==u32(record,40)))fail('engine checksum mismatch');
  if(context.chr&&(!(context.chr instanceof Uint8Array)||context.chr.length!==CHR_BYTES||crc32(context.chr)!==u32(record,44)))fail('CHR checksum mismatch');
  if(context.vectors&&(!Array.isArray(context.vectors)||context.vectors.length!==3||context.vectors.some((value,index)=>value!==vectors[index])))fail('interrupt vectors do not match source record');
  const payload=record.subarray(RECORD_HEADER);if(crc32(payload)!==u32(record,32))fail('compressed source checksum mismatch');
  const raw=decompress(payload,decodedLength);if(crc32(raw)!==u32(record,36))fail('decoded source checksum mismatch');
  let source;try{source=JSON.parse(decoder.decode(raw));}catch(_){fail('source is not valid UTF-8 project JSON');}
  if(source?.version!==schema)fail('source schema does not match its record header');
  const prepared=validateSource(source);
  if(((source.mirroring==='v'?1:0)|(source.hasSRAM?2:0))!==flags)fail('source mirroring/battery flags differ from ROM header');
  return {source,prepared,address,worldCount,flags,schema,engineLength,codeEnd,dataEnd,vectors,decodedLength,payloadLength,recordLength:record.length,
    engineCRC:u32(record,40),chrCRC:u32(record,44),sourceCRC:u32(record,36)};
}
function packageWorldRom({source,engine,chr,worldCount}){
  const bounds=validateEngine(engine);count(worldCount);
  const parts=sourceParts(source),recordBytes=RECORD_HEADER+parts.payload.length,aligned=(bounds.end+15)&~15;
  const address=aligned+recordBytes<=MARKER?aligned:0xD000;
  if(address+recordBytes>VECTORS)fail('compressed authoring record needs '+recordBytes+' contiguous bytes; available space is '+Math.max(MARKER-aligned,VECTORS-0xD000)+' bytes. Reduce authored data before building.');
  const flags=(source.mirroring==='v'?1:0)|(source.hasSRAM?2:0),record=writeRecord(parts,engine,chr,{worldCount,address,flags});
  const rom=new Uint8Array(16+PRG_BYTES+CHR_BYTES);rom.set([0x4E,0x45,0x53,0x1A,2,1,flags]);rom.set(engine.bytes,16);
  rom.set(record,16+address-BASE);const markerAt=16+MARKER-BASE;
  rom.set(encoder.encode('NFORGE15'),markerAt);rom[markerAt+8]=LAYOUT;rom[markerAt+9]=worldCount;put16(rom,markerAt+10,address);put16(rom,markerAt+12,record.length);rom[markerAt+14]=FORMAT;
  [engine.nmi,engine.reset,engine.irq].forEach((vector,index)=>put16(rom,16+VECTORS-BASE+index*2,vector));rom.set(chr,16+PRG_BYTES);
  const reservations=[{address:BASE,length:engine.bytes.length,label:'World runtime code and data'},
    {address,length:record.length,label:'WG17 full authoring source'},{address:MARKER,length:16,label:'NES Forge layout 4 marker'},
    {address:VECTORS,length:6,label:'Interrupt vectors'}];
  const resources={allocations:Array.isArray(engine.resources)?engine.resources.map(resource=>({...resource})):[],
    prgBytes:PRG_BYTES,chrBytes:CHR_BYTES,engineBytes:engine.bytes.length,sourceRecordBytes:record.length,sourceDecodedBytes:parts.raw.length,sourceCompressedBytes:parts.payload.length};
  // Validate the complete emitted envelope before exposing an artifact to the
  // RuntimeCompiler commit boundary. Inspection never compiles or mutates S.
  WorldRom.inspect(rom);
  return {rom,metadata:{base:BASE,prgSize:PRG_BYTES,sourceRecordAddress:address,sourceRecordBytes:record.length,
    extensionAddress:address,extensionBytes:record.length,resources,reservations},resources,sourceRecord:record};
}
function recognized(bytes){
  if(!(bytes instanceof Uint8Array))return false;
  // Look at both legal historical marker positions, with/without a trainer,
  // before trusting the header. Corrupted bank/trainer fields must not cause a
  // recognized new world ROM to fall through to an old append/capture decoder.
  for(const headerSize of [16,528])for(const prgSize of [32768,16384]){
    const base=65536-prgSize,at=headerSize+MARKER-base;
    if(at<0||at+16>bytes.length)continue;
    const magic=hasMagic(bytes,at,'NFORGE15'),sourceAt=headerSize+u16(bytes,at+10)-base;
    if((magic&&(bytes[at+8]>=LAYOUT||bytes[at+14]===FORMAT))||hasMagic(bytes,sourceAt,'WG17'))return true;
  }
  return false;
}
function inspect(bytes){
  if(!recognized(bytes))return null;
  if(bytes.length!==16+PRG_BYTES+CHR_BYTES)fail('expected exactly 32 KB PRG and 8 KB CHR without trainer or trailing bytes');
  if(!hasMagic(bytes,0,'NES\x1A')||bytes[4]!==2||bytes[5]!==1||bytes[6]&~3||bytes.subarray(7,16).some(value=>value!==0))fail('unsupported iNES header; world ROM requires mapper 0, 32 KB PRG, 8 KB CHR and no trainer');
  const markerAt=16+MARKER-BASE;
  if(!hasMagic(bytes,markerAt,'NFORGE15'))fail('missing layout 4 marker');
  if(bytes[markerAt+8]!==LAYOUT)fail('unsupported Forge world ROM layout '+bytes[markerAt+8]);
  if(bytes[markerAt+14]!==FORMAT||bytes[markerAt+15]!==0)fail('unsupported world source format or nonzero reserved marker byte');
  const worldCount=count(bytes[markerAt+9]),address=u16(bytes,markerAt+10),length=u16(bytes,markerAt+12);
  if(length<RECORD_HEADER||address<BASE||address+length>VECTORS||(address<MARKER+16&&address+length>MARKER))fail('invalid or overlapping authoring record placement');
  const recordBytes=bytes.subarray(16+address-BASE,16+address-BASE+length);
  if(!hasMagic(recordBytes,0,'WG17'))fail('missing WG17 source record');
  const engineLength=u32(recordBytes,16);if(!engineLength||BASE+engineLength>MARKER)fail('engine length exceeds its reserved window');
  const vectors=[0,1,2].map(index=>u16(bytes,16+VECTORS-BASE+index*2));
  const record=decodeSourceRecord(recordBytes,{address,worldCount,flags:bytes[6],engineBytes:bytes.subarray(16,16+engineLength),chr:bytes.subarray(16+PRG_BYTES),vectors});
  const header={prgSize:PRG_BYTES,chrSize:CHR_BYTES,headerSize:16,mapper:0,mirror:bytes[6]&1,battery:!!(bytes[6]&2),trainer:false};
  const metadata={base:BASE,prgSize:PRG_BYTES,sourceRecordAddress:address,sourceRecordBytes:length,extensionAddress:address,extensionBytes:length};
  return {header,source:record.source,prepared:record.prepared,record,metadata,
    summary:{kind:'world-playable',label:'Forge playable World ROM — editable project',mapper:0,worldCount,
      sceneCount:record.source.scenes.length,editableProject:true,captureOnly:false,layout:LAYOUT,sourceFormat:'WG17',sourceVersion:FORMAT}};
}

const WorldRom=services.WorldRom={package:packageWorldRom,inspect,recognized,encodeSourceRecord,decodeSourceRecord,compress,decompress,crc32,
  constants:Object.freeze({base:BASE,prgBytes:PRG_BYTES,chrBytes:CHR_BYTES,markerAddress:MARKER,vectorsAddress:VECTORS,layout:LAYOUT,format:FORMAT,recordHeaderBytes:RECORD_HEADER,maxDecodedBytes:MAX_DECODED})};
// Thin adapters own only this new format. Each legacy route is called once for
// other ROMs, preserving old append reconstruction and the existing undo owner.
const project=window.Forge166?.project;
if(project){
  const previousClassify=project.classifyRom,previousOpen=project.openRom;
  project.classifyRom=function(bytes){const info=WorldRom.inspect(bytes);return info?{...info.summary}:previousClassify.apply(this,arguments);};
  project.openRom=function(bytes,name){
    const info=WorldRom.inspect(bytes);if(!info)return previousOpen.apply(this,arguments);
    const projectName=String(name||info.source.projectName||'Reopened World Game').replace(/\.nes$/i,'').slice(0,120)||'Reopened World Game';
    const data={...info.source,projectName,importedRom:bytesToBase64(bytes)},prepared=services.ProjectStore.prepareLoad(data);
    const result=project.replaceProject(prepared.data);
    // The retained new-project UI boundary clears ASM and editor selections.
    // They are authoring source here, so put those saved values back afterward.
    S.asmSource=String(prepared.data.asmSource||'');document.getElementById('codeInput').value=S.asmSource;
    for(const key of ['selEntity','selSprite'])if(Number.isInteger(prepared.data[key]))S[key]=prepared.data[key];
    ent_buildToolbar();window.Forge166.ui?.refresh();
    showToast('World ROM opened — full authored project restored; generated ROM retained for original playback');return result;
  };
}
const previousImport=importRom;
importRom=function(bytes,name){
  try{if(WorldRom.inspect(bytes)){reportError(Error('Use Open Forge ROM to restore this World ROM as an editable project. Append Import does not support WG17 authoring data.'));return false;}}
  catch(error){reportError(error);return false;}
  return previousImport.apply(this,arguments);
};
})();
