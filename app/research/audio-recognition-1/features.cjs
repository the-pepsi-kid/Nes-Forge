'use strict';
// Research-only static evidence. No imports, patches, family decisions or app state.
const crypto = require('node:crypto');
const {opcodes} = require('../../src/re/famitone2-driver-profile.js');
const LIMITS = Object.freeze({maxBytes:49168, graphInstructions:32768, routineCount:512, routineInstructions:1024, routineWork:65536});
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const hex = n => n.toString(16).padStart(4,'0');
function mapping(bytes) {
  if (!(bytes instanceof Uint8Array)) throw new TypeError('Expected Uint8Array');
  if (bytes.length > LIMITS.maxBytes) throw new Error('Input byte limit exceeded');
  if (bytes.length < 16 || bytes[0]!==78 || bytes[1]!==69 || bytes[2]!==83 || bytes[3]!==26) throw new Error('Expected iNES/NES 2.0 container');
  const nes2=(bytes[7]&12)===8;
  if ((bytes[6]>>4)||(bytes[7]&240)||(nes2&&(bytes[8]||bytes[9]))) throw new Error('Only mapper 0, submapper 0, ordinary size fields are supported');
  if ((bytes[7]&3)||![1,2].includes(bytes[4])||bytes[5]>1) throw new Error('Only static NROM-16/32 with at most one CHR bank is supported');
  const start=16+((bytes[6]&4)?512:0), size=bytes[4]*16384, base=size===16384?0xc000:0x8000;
  if (bytes.length!==start+size+bytes[5]*8192) throw new Error('Container length does not match declared layout');
  const canonical=a => a>=0x8000&&a<=0xffff ? base+(a-0x8000)%size : null;
  const offset=a => canonical(a)===null ? null : start+canonical(a)-base;
  const word=a => bytes[offset(a)]|(bytes[offset(a)+1]<<8);
  return {start,size,base,canonical,offset,word,format:nes2?'NES 2.0':'iNES'};
}
function inspect(input) {
  const bytes=input; // Never writes, even temporarily.
  const bounded=bytes instanceof Uint8Array&&bytes.length<=LIMITS.maxBytes;
  const result={format:'NESForgeAudioRoutineEvidence',version:1,sourceSha256:bounded?sha256(bytes):null,byteLength:bytes instanceof Uint8Array?bytes.length:null,limits:{...LIMITS},status:'unavailable',routines:[],limitations:[]};
  let m; try {m=mapping(bytes);} catch(e) {result.diagnostic=e.message;return result;}
  result.mapping={format:m.format,mapper:0,prgFileOffset:m.start,prgBytes:m.size,canonicalBase:m.base};
  const graph=new Map(), roots=new Set(), queue=[];
  const enqueue=(address,root=false)=>{const a=m.canonical(address);if(a!==null){queue.push(a);if(root)roots.add(a);}};
  [0xfffa,0xfffc,0xfffe].forEach(a=>enqueue(m.word(a),true));
  let unsupported=0, indirect=0, clipped=0;
  while(queue.length&&graph.size<LIMITS.graphInstructions) {
    let pc=queue.pop();
    while(pc!==null&&!graph.has(pc)&&graph.size<LIMITS.graphInstructions) {
      const off=m.offset(pc), spec=opcodes[bytes[off]];
      if (!spec) {unsupported++;break;}
      const [name,mode,length]=spec;
      if (pc+length>0x10000) {clipped++;break;}
      const operand=length===1?0:bytes[off+1]+(length===3?bytes[off+2]*256:0);
      const n={address:pc,fileOffset:off,bytes:Array.from(bytes.subarray(off,off+length)),opcode:bytes[off],name,mode,length,operand};
      graph.set(pc,n);
      const next=m.canonical(pc+length);
      if(mode==='r') enqueue(pc+length+(operand<128?operand:operand-256));
      if(name==='JSR') enqueue(operand,true);
      if(name==='JMP') {if(mode==='ind'){indirect++;break;} pc=m.canonical(operand);continue;}
      if(['BRK','RTI','RTS'].includes(name)) break;
      pc=next;
    }
  }
  let work=0, examined=0, truncated=queue.length>0||roots.size>LIMITS.routineCount;
  const rootList=[...roots].sort((a,b)=>a-b).slice(0,LIMITS.routineCount);
  for(const root of rootList) {
    examined++;
    const visited=new Map(), todo=[root]; let partial=false;
    while(todo.length&&visited.size<LIMITS.routineInstructions&&work<LIMITS.routineWork) {
      let pc=todo.pop();
      while(graph.has(pc)&&!visited.has(pc)&&visited.size<LIMITS.routineInstructions&&work<LIMITS.routineWork) {
        const n=graph.get(pc);visited.set(pc,n);work++;
        const next=m.canonical(pc+n.length);
        if(n.mode==='r') {const target=m.canonical(pc+n.length+(n.operand<128?n.operand:n.operand-256));if(target!==null)todo.push(target);}
        if(n.name==='JMP'){if(n.mode==='ind')break;pc=m.canonical(n.operand);continue;}
        if(['BRK','RTI','RTS'].includes(n.name)) break;
        pc=next;
      }
      if(visited.size>=LIMITS.routineInstructions||work>=LIMITS.routineWork) partial=true;
    }
    if(todo.length)partial=true;
    truncated ||= partial;
    const nodes=[...visited.values()].sort((a,b)=>a.address-b.address);
    const apuWrites=nodes.filter(n=>['STA','STX','STY'].includes(n.name)&&['b','bx','by'].includes(n.mode)&&((n.operand>=0x4000&&n.operand<=0x4013)||[0x4015,0x4017].includes(n.operand))).map(n=>({address:n.address,fileOffset:n.fileOffset,bytes:n.bytes,baseAddress:n.operand,mode:n.mode,certainty:n.mode==='b'?'direct-address static instruction':'indexed base only; effective address is not proven'}));
    if(!apuWrites.length)continue;
    const absoluteRam=nodes.filter(n=>['b','bx','by','ind'].includes(n.mode)&&n.operand<0x2000).map(n=>n.operand&0x7ff);
    const ram=absoluteRam.filter(a=>a>=256);
    const zp=nodes.filter(n=>['z','zx','zy','ix','iy'].includes(n.mode)).map(n=>n.operand).concat(absoluteRam.filter(a=>a<256));
    const ramBase=ram.length?Math.min(...ram):0, zpBase=zp.length?Math.min(...zp):0;
    const tokens=nodes.map(n=>{
      let operand='';
      if(n.length>1) {
        if(['z','zx','zy','ix','iy'].includes(n.mode)) operand='zp+'+(n.operand-zpBase);
        else if(n.mode==='r')operand='branch:'+(n.operand<128?n.operand:n.operand-256);
        else if(n.mode==='m')operand='literal:'+n.operand;
        else if(n.operand<0x2000){const address=n.operand&0x7ff;operand=address<256?'zp+'+(address-zpBase):'ram+'+(address-ramBase);}
        else if(n.operand>=0x8000)operand='prg-relative:'+(m.canonical(n.operand)-root);
        else operand='fixed:$'+hex(n.operand); // Hardware and expansion space never wildcarded.
      }
      return n.name+'/'+n.mode+'/'+operand;
    });
    result.routines.push({entryAddress:root,entryFileOffset:m.offset(root),instructionCount:nodes.length,partial,normalization:{ramBase,zeroPageBase:zpBase},fingerprint:sha256(tokens.join('\n')),tokens,apuWrites,spans:nodes.map(n=>({address:n.address,fileOffset:n.fileOffset,bytes:n.bytes}))});
    if(work>=LIMITS.routineWork)break;
  }
  result.status=truncated?'partial':'analyzed';
  result.work={graphInstructions:graph.size,discoveredEntries:roots.size,examinedEntries:examined,routineInstructions:work,unsupportedStops:unsupported,indirectJumpStops:indirect,boundaryStops:clipped};
  result.limitations=[
    'Static over-approximation from vectors, direct calls and branches; no execution or data-flow proof.',
    'Only official 6502 opcodes and static NROM mappings; indirect jumps terminate traversal; indirect APU writes are not discovered.',
    'A routine candidate follows branches and direct jumps but does not inline callees; entry points and tails may overlap.',
    'Address normalization preserves opcode, addressing mode, literals, hardware addresses, RAM alias/offset relationships and code-relative targets; it does not infer immediate pointer constants.',
    'Four-token set similarity is uncalibrated research evidence, not engine identification, conversion permission, semantic equivalence or a measured confidence probability.'
  ];
  return result;
}
function grams(tokens) {const out=new Set();for(let i=0;i+3<tokens.length;i++)out.add(tokens.slice(i,i+4).join('|'));return out;}
function compare(reference,candidate) {
  const pairs=[];
  for(const a of reference.routines)for(const b of candidate.routines) {
    const x=grams(a.tokens),y=grams(b.tokens);if(!x.size||!y.size)continue;
    let intersection=0;for(const token of x)if(y.has(token))intersection++;
    const union=x.size+y.size-intersection;
    pairs.push({referenceEntry:a.entryAddress,candidateEntry:b.entryAddress,candidateFileOffset:b.entryFileOffset,score:intersection/union,intersection,union,referenceInstructions:a.instructionCount,candidateInstructions:b.instructionCount,identicalFingerprint:a.fingerprint===b.fingerprint,partial:a.partial||b.partial});
  }
  return pairs.sort((a,b)=>b.score-a.score||b.intersection-a.intersection||a.candidateEntry-b.candidateEntry).slice(0,5);
}
module.exports={inspect,compare,mapping,LIMITS,sha256};
