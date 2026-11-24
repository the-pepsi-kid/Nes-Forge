/* One recognizer for NES cartridge headers (iNES 1.0, NES 2.0 and archaic iNES), shared by the emulator, the intake
 * analysis and the library. Detection follows the NESdev wiki ("iNES" and "NES 2.0", identification):
 *
 *   byte 7 AND $0C = $08 and the NES 2.0 sizes fit in the file  -> NES 2.0
 *   byte 7 AND $0C = $04                                        -> archaic iNES
 *   byte 7 AND $0C = $00 and bytes 12-15 are all zero          -> iNES 1.0
 *   otherwise                                                   -> archaic iNES
 *
 * An archaic header is one written before bytes 7-15 had a meaning, or later overwritten by a dumping tool (the
 * classic "DiskDude!" text). Only bytes 0-6 are trusted then: the mapper is byte 6's high nibble and bytes 7-15 are
 * reported, never interpreted.
 *
 * Original bytes are never changed: inspect() reads, normalizedHeader() and view() return copies, and the caller keeps
 * the original's SHA-256 as the cartridge's identity. UMD, pure. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.InesHeader=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const VERSION=1;
const printable=b=>b>=0x20&&b<0x7f;
function nes2Size(low,high,unit){return high===15?Math.pow(2,low>>2)*((low&3)*2+1):((high<<8)|low)*unit;}
function inspect(input){
  const b=input instanceof Uint8Array?input:Uint8Array.from(input||[]);
  if(b.length<16||b[0]!==0x4e||b[1]!==0x45||b[2]!==0x53||b[3]!==0x1a)return {valid:false,reason:b.length<16&&b.length>=4&&b[0]===0x4e?'the header is truncated':'no NES header (the file does not start with "NES" and $1A)'};
  const trainer=!!(b[6]&4),headerSize=16+(trainer?512:0),bits=b[7]&0x0c,tail=Array.from(b.subarray(7,16));
  // NES 2.0 only when its own size fields fit in the file
  let format;
  if(bits===0x08){const prg=nes2Size(b[4],b[9]&15,16384),chr=nes2Size(b[5],b[9]>>4,8192);format=Number.isSafeInteger(prg+chr)&&headerSize+prg+chr<=b.length?'NES 2.0':'archaic iNES';}
  else if(bits===0x04)format='archaic iNES';
  else format=b[12]|b[13]|b[14]|b[15]?'archaic iNES':'iNES 1.0';
  const declaredMapper=(b[6]>>4)|(b[7]&0xf0); // what reading byte 7 as iNES 1.0 would give
  const out={valid:true,version:VERSION,format,trainer,headerSize,battery:!!(b[6]&2),
    mirroring:b[6]&8?'four-screen':b[6]&1?'vertical':'horizontal',mirror:b[6]&8?4:b[6]&1,declaredMapper};
  if(format==='NES 2.0'){
    Object.assign(out,{mapper:(b[6]>>4)|(b[7]&0xf0)|((b[8]&15)<<8),submapper:b[8]>>4,prgSize:nes2Size(b[4],b[9]&15,16384),chrSize:nes2Size(b[5],b[9]>>4,8192),
      prgRamSize:b[10]&15?64<<(b[10]&15):0,prgNvramSize:b[10]>>4?64<<(b[10]>>4):0,chrRamSize:b[11]&15?64<<(b[11]&15):0,chrNvramSize:b[11]>>4?64<<(b[11]>>4):0,
      consoleType:b[7]&3,timing:['NTSC','PAL','multiple-region','Dendy'][b[12]&3]});
  }else if(format==='iNES 1.0'){
    Object.assign(out,{mapper:declaredMapper,submapper:0,prgSize:b[4]*16384,chrSize:b[5]*8192,consoleType:b[7]&3,vsUnisystem:!!(b[7]&1),playChoice:!!(b[7]&2)});
  }else{
    // archaic: bytes 7-15 are not header fields. Report them; say whether they are a known dumping tool's text.
    const text=tail.map(v=>printable(v)?String.fromCharCode(v):'.').join(''),ascii=tail.filter(v=>v).every(printable)&&tail.some(v=>v);
    Object.assign(out,{mapper:b[6]>>4,submapper:0,prgSize:b[4]*16384,chrSize:b[5]*8192,consoleType:0,
      ignored:{bytes:'7-15',values:tail,text,...(ascii?{signature:tail.filter(v=>v&&printable(v)).map(v=>String.fromCharCode(v)).join('').trim()}:{})}});
  }
  out.mapperDiffersFromDeclared=out.mapper!==declaredMapper;
  const end=headerSize+out.prgSize+out.chrSize;out.payloadBytes=out.prgSize+out.chrSize;out.truncated=end>b.length;out.trailingBytes=Math.max(0,b.length-end);
  return out;
}
// the 16-byte header as a clean iNES 1.0 / NES 2.0 header would hold it (archaic: bytes 7-15 cleared); a copy
function normalizedHeader(input){const b=input instanceof Uint8Array?input:Uint8Array.from(input||[]),h=b.slice(0,16),i=inspect(b);if(i.valid&&i.format==='archaic iNES')h.fill(0,7,16);return h;}
// a copy of the whole file with the normalized header, for consumers that read header bytes themselves
function view(input){const b=input instanceof Uint8Array?input:Uint8Array.from(input||[]),v=b.slice();v.set(normalizedHeader(b));return v;}
function describe(i){if(!i?.valid)return i?.reason||'not an NES file';
  return i.format+' · mapper '+i.mapper+(i.submapper?'.'+i.submapper:'')+(i.format==='archaic iNES'&&i.mapperDiffersFromDeclared?' (bytes 7-15 ignored'+(i.ignored?.signature?': "'+i.ignored.signature+'"':'')+'; read naively they would declare mapper '+i.declaredMapper+')':i.format==='archaic iNES'?' (bytes 7-15 ignored'+(i.ignored?.signature?': "'+i.ignored.signature+'"':'')+')':'');}
return Object.freeze({version:VERSION,inspect,normalizedHeader,view,describe});
});
