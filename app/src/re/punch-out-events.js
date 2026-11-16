/* Native event evidence for the supported Punch-Out sources.
 * RERuntime owns observation; PunchOutReplay owns execution and cancellation.
 * This decoder relates changed RAM writes to physical instruction/script bytes.
 * A generic VM handler is kept distinct from the command it interpreted. Source
 * inspection is read-only and never grants a writer, recipe or runtime binding.
 * Recovery rows use the fighter's switched bank; the shared fixed-bank health
 * store supplies Y and the packed entry. Replay joins that proof to the final
 * count store without guessing a data owner from the instruction's bank.
 */
(function(root,factory){
 const api=factory(typeof module!=='undefined'&&module.exports?require('./punch-out-content.js'):root.PunchOutContent);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PunchOutEvents=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(content){
 'use strict';
 const addresses=Object.freeze([0,5,6,0x50,0xc1,0xc4,0x39e]);
 const sample=Object.freeze([0,5,6,0x50,0x54,0x55,0x90,0xc1,0xc4,0xe6,0xe7,0x302,0x304,0x305,0x391,0x39e,0x3c9,0x3cb,0x5d5,0x5d6]);
 const fail=text=>{throw Error('Punch-Out event evidence: '+text);};
 function open(input){
  const bytes=Uint8Array.from(input),model=content.open(bytes),fight=model.fights[0];
  const offset=(bank,cpu)=>16+bank*8192+(cpu&8191);
  const verify=(bank,pc,expected)=>{const at=offset(bank,pc);if(expected.some((v,i)=>bytes[at+i]!==v))fail('Native instruction/script contract differs at $'+pc.toString(16));};
  verify(7,0x83f8,[0xa2,2,0x86,5]);verify(7,0x8414,[0xa2,1,0x86,5]);
  verify(11,0x8591,[0xf6,0]);verify(11,0x859f,[0x95,0]);
  // The count program moves between PRG revisions. Locate its bounded native
  // command signature in bank 11; instruction anchors remain independently checked.
  const countMatches=[];for(let pc=0x8000;pc<=0x9ffa;pc++)if([0xf8,0xc1,1,0x96,0xe8,0].every((v,i)=>bytes[offset(11,pc)+i]===v))countMatches.push(pc);
  if(countMatches.length!==1)fail('Count program signature is missing or ambiguous.');
  const countProgramAddress=countMatches[0];
  verify(7,0x87be,[0xad,2,3,0xc9,3,0xd0,0x11]);
  verify(13,0xb31b,[0xac,0xc9,3,0xb1,0xe6]);
  verify(13,0xb338,[0xcd,0x91,3,0xf0,2,0xb0,3]);
  verify(13,0xb342,[0xa5,0x18,0x20,0xf1,0xae,0x29,7]);
  verify(13,0xb439,[0xad,0x98,3,0x8d,0x9e,3,0xad,0x91,3]);
  verify(13,0xb445,[0xb1,0xe6,0x29,15,0x0a,0x0a,0x0a,0x9d,0x97,3,0x60]);
  verify(13,0xbf99,[0x4a,0x4a,0x4a,0x4a,0x60]);
  const source=(bank,cpu,length,kind,label)=>({bank8KiB:bank,cpuAddress:cpu,fileOffset:offset(bank,cpu),length,kind,label});
  const physical=(cpu,bank)=>cpu<0xa000?offset(bank,cpu):16+0x20000-0x6000+cpu-0xa000;
  const windowAt=(cpu,bank,length,kind,label)=>{
   if(!Number.isInteger(cpu)||cpu<0x8000||cpu+length>0x10000)return null;
   const at=physical(cpu,bank);if(at<16||at+length>0x20010)return null;
   return {bank8KiB:Math.floor((at-16)/8192),cpuAddress:cpu,fileOffset:at,length,kind,label};
  };
  const poolOffset=fight.configFileOffset+64,pool=Array.from(bytes.slice(poolOffset,poolOffset+8));
  if(pool.some(v=>v<0x9a||v>0xa3))fail('Glass Joe fallback selector pool differs.');
  // These rows live in the active fighter's switched bank, not the fixed bank
  // containing the common selector. The following configured block bounds the
  // six Glass Joe rows; no table length is inferred for another fighter.
  const recoveryAddress=fight.configBytes[53]|fight.configBytes[54]<<8;
  const followingAddress=fight.configBytes[78]|fight.configBytes[79]<<8;
  if(recoveryAddress<0x8000||recoveryAddress+48>0xa000||followingAddress!==recoveryAddress+48)
   fail('Glass Joe recovery table boundary differs.');
  const recoveryOffset=offset(fight.bank8KiB,recoveryAddress);
  const recoverySource=(index,length,label)=>source(fight.bank8KiB,recoveryAddress+index,length,'table-data',label);
  const entry=(raw,index)=>({raw,count:raw>>4,hpTarget:(raw&15)*8,route:raw===0?'exit-selector':raw>>4?'direct-count':'fallback-pool',
   source:recoverySource(index,1,'Glass Joe recovery entry')});
  const recoveryRows=Array.from({length:6},(_,row)=>{
   const index=row*8,threshold=bytes[recoveryOffset+index];
   return {attempt:row+1,index,threshold,condition:threshold===0?{kind:'mac-state',value:0x0d}:
    {kind:threshold&128?'first-minute-health':'health',minimum:threshold&127},
    preferred:entry(bytes[recoveryOffset+index+1],index+1),
    alternatives:Array.from({length:6},(_,slot)=>({...entry(bytes[recoveryOffset+index+2+slot],index+2+slot),slot:slot+1,multiplicity:slot<2?2:1})),
    conditionSource:recoverySource(index,1,'Glass Joe preferred condition'),
    source:recoverySource(index,8,'Glass Joe recovery attempt '+(row+1))};
  });
  const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
  const catalog=freeze({
   roundLimit:{value:bytes[offset(7,0x87c2)],unit:'whole minutes',scope:'Shared native fight clock; not a Glass Joe-only setting.',
    source:source(7,0x87be,7,'instruction','Clock minute comparison')},
   countProgram:{scope:'One shared count script observed on both Glass Joe and Mac knockdown paths. The handler is a general VM increment instruction.',
    source:source(11,countProgramAddress,2,'script-data','Increment the referee count selector'),
    handler:source(11,0x8591,2,'instruction','Shared VM: increment zero-page address in X')},
   fallbackGetUpPool:{counts:pool.map(v=>v-0x99),slots:pool.map((value,slot)=>({slot,count:value-0x99,source:source(fight.bank8KiB,0x8000+((poolOffset-16)&8191)+slot,1,'table-data','Glass Joe fallback count pool slot '+(slot+1))})),scope:'Glass Joe configuration fallback pool. Conditional recovery rules can choose another path; the selected target is recorded separately.',
    source:{bank8KiB:Math.floor((poolOffset-16)/8192),cpuAddress:0x8000+((poolOffset-16)&8191),fileOffset:poolOffset,length:8,kind:'table-data',label:'Glass Joe fallback count selectors'}},
   recovery:{scope:'Glass Joe rows only. The shared fixed-bank routine reads these entries from the active fighter bank. Other fight tables and unvisited consumers are not editing permissions.',
    source:recoverySource(0,48,'Glass Joe conditional recovery rows'),
    pointer:{bank8KiB:fight.bank8KiB,cpuAddress:0x8000+((fight.configFileOffset+53-16)&8191),fileOffset:fight.configFileOffset+53,length:2,kind:'table-data',label:'Glass Joe recovery table pointer'},
    selector:source(13,0xb311,71,'instruction','Shared recovery condition and slot selection'),
    hpWriter:source(13,0xb439,23,'instruction','Shared packed-entry health target'),
    countReader:source(13,0xbf99,5,'instruction','Shared high-nibble reader'),
    modeSources:[source(13,0xb366,15,'instruction','Direct counts 1, 7 and 9 set the shared reaction tag'),
      source(7,0x8414,13,'instruction','Opponent knockdown clears the shared reaction tag'),
      source(7,0x8345,33,'instruction','Tag 1/9 native hit-result branches'),
      source(14,0xc319,42,'instruction','Tag 1/7 native reaction branches'),
      source(13,0xb4c4,14,'instruction','Mac recovery can also set shared tag 1'),
      source(7,0x8190,12,'instruction','Tag 9 reaction-byte selection'),
      source(7,0x821e,12,'instruction','Tag 9 second reaction-byte selection'),
      source(7,0x82f5,19,'instruction','Tag 9 post-hit reaction-byte selection')],
    gates:source(13,0xb2fb,22,'instruction','Round knockdown and native bypass gates'),
    rows:recoveryRows,
    knownFightPointerUses:model.fights.filter(f=>f.bank8KiB===fight.bank8KiB&&
      (f.configBytes[53]|f.configBytes[54]<<8)>=recoveryAddress&&(f.configBytes[53]|f.configBytes[54]<<8)<recoveryAddress+48).map(f=>({index:f.index,label:f.label})),
    rules:['A zero packed byte exits the selector before health/count installation. Count nibble zero in a nonzero byte uses the fallback pool.',
     'The low nibble times eight is the native health refill target; the high nibble selects the count or fallback route.',
     'Alternative slot multiplicities are 2,2,1,1,1,1 over the low three input bits. No uniform native RNG distribution is assumed.',
     'The third knockdown in a round and the native $BA=$FF bypass can skip row selection.']},
   limits:['Observed native paths only; unvisited branches and other fighters remain unverified.',
    'Instruction addresses and script/table addresses identify different source owners.',
     'The separate native-field writer owns entry counts/health, five conditions, eight pool counts and the three fifth-attempt exit/fallback slots. The sixth row and instructions stay protected. Zero entries have no health-write witness; a count-out alone cannot identify which exit slot was read.']
  });
  function classify(write){
   const r=write.sampledBeforeWrite||{},pc=write.pc,at=write.fileOffset;
   if(!Number.isInteger(at)||at<16||at+2>0x20010||!Number.isInteger(pc)||
     !Array.isArray(write.bytes)||!write.bytes.length||write.bytes.some((b,i)=>bytes[at+i]!==b))return null;
   const bank=Math.floor((at-16)/8192);if(physical(pc,bank)!==at)return null;
   const instruction={bank8KiB:bank,cpuAddress:pc,fileOffset:at,
    length:Math.min(write.bytes.length,3),kind:'instruction',label:'Observed native writer'};
   let kind,label,count=null,program=null,related=null,decision=null;
   function vmCommand(opcode,length,back=length-1){
    const ptr=r[0x54]|r[0x55]<<8,y=write.registers?.y;
    if(!Number.isInteger(y))return null;
    const command=windowAt((ptr+y-back)&65535,bank,length,'script-data','Observed VM command and operands');
    if(!command||bytes[command.fileOffset]!==opcode)return null;
    return command;
   }
   if(write.address===5&&write.value===2&&at===offset(7,0x83fa)){
    kind='mac-knockdown';label='Mac knocked down';
   }else if(write.address===5&&write.value===1&&at===offset(7,0x8416)){
    kind='opponent-knockdown';label='Glass Joe knocked down';
   }else if(write.address===0xc1&&[1,2].includes(r[5])&&write.value>=0x9a&&write.value<=0xa3&&at===offset(11,0x8591)){
    program=vmCommand(0xf8,2);if(!program||bytes[program.fileOffset+1]!==0xc1||write.registers?.x!==0xc1)return null;
    count=write.value-0x99;kind='referee-count';label='Referee count '+count;
   }else if(write.address===5&&write.value===0&&[1,2].includes(write.before)&&r[0]===1&&at===offset(11,0x859f)){
    program=vmCommand(0xfa,3,3);if(!program||bytes[program.fileOffset+1]!==5||bytes[program.fileOffset+2]!==0)return null;
    kind='knockdown-cleared';label=write.before===1?'Glass Joe knockdown cleared':'Mac knockdown cleared';
   }else if(write.address===0&&write.value===253&&r[5]===2&&r[0xc1]===0xa3&&at===offset(11,0x859f)){
    program=vmCommand(0xfa,3,3);if(!program||bytes[program.fileOffset+1]!==0||bytes[program.fileOffset+2]!==253)return null;
    kind='player-count-out';label='Mac count-out / loss phase';
   }else if(write.address===0&&write.value===254&&r[5]===1&&r[0xc1]===0xa3&&at===offset(11,0x859f)){
    program=vmCommand(0xfa,3,3);if(!program||bytes[program.fileOffset+1]!==0||bytes[program.fileOffset+2]!==254)return null;
    kind='opponent-count-out';label='Glass Joe ten-count / win phase';
   }else if(write.address===0x39e&&r[5]===1&&at===offset(13,0xb44c)&&write.registers?.x===7){
    if(write.dataBank8KiB!==fight.bank8KiB)return null;
    if(![0x3c9,0xe6,0xe7,0x5d5,0x5d6,0x391,0x50,6,0x302].every(a=>Number.isInteger(r[a])&&r[a]>=0&&r[a]<=255))return null;
    const row=catalog.recovery.rows.find(row=>row.index===r[0x3c9]),column=write.registers?.y-r[0x3c9];
    if(!row||!Number.isInteger(column)||column<1||column>7||(r[0xe6]|r[0xe7]<<8)!==recoveryAddress||(r[0x5d5]|r[0x5d6]<<8)!==recoveryAddress)return null;
    const selected=column===1?row.preferred:row.alternatives[column-2];
    if(selected.route==='exit-selector'||write.value!==selected.hpTarget)return null;
    const preferred=row.condition.kind==='mac-state'?r[0x50]===0x0d:
     (row.condition.kind!=='first-minute-health'||r[6]===1&&r[0x302]===0)&&r[0x391]>=row.condition.minimum;
    if(preferred!==(column===1))return null;
    decision={attempt:row.attempt,rowOffset:row.index,column,branch:column===1?'preferred':'alternative',
     packedByte:selected.raw,count:selected.count,hpTarget:selected.hpTarget,route:selected.route,source:selected.source,
     condition:row.condition,conditionSource:row.conditionSource,macHealth:r[0x391],macState:r[0x50],round:r[6],minutes:r[0x302],observedBank8KiB:write.dataBank8KiB};
    kind='opponent-recovery-entry';label='Glass Joe recovery row '+row.attempt+' · '+decision.branch;related=selected.source;
   }else if(write.address===0xc4&&r[5]===1&&write.value>=0x9a&&write.value<=0xa3&&at===offset(13,0xb387)){
    kind='opponent-get-up-target';count=write.value-0x99;label='Native get-up target selected: '+count;related=catalog.fallbackGetUpPool.source;
   }else if(write.address===0x50&&write.value===0xc2&&at===offset(7,0x87d4)){
    kind='round-over';label='Clock requests round end';related=catalog.roundLimit.source;
   }else if(write.address===6&&write.before>=1&&write.value===write.before+1&&write.value<=3){
    kind='round-advanced';label='Round counter advanced to '+write.value;
   }else return null;
   return {kind,label,frame:write.frame,cycles:write.cycles,address:write.address,before:write.before,value:write.value,
    count,round:r[6],knockdown:r[5],instruction,script:program,related,decision,
    proof:program?'observed-script-and-writer':decision?'observed-entry-and-writer':'observed-native-writer',
    scope:kind==='referee-count'?'The script operand selects $C1; the CPU handler is shared with other VM commands.':kind==='round-over'?catalog.roundLimit.scope:'Original-engine write observed under the report’s declared inputs and interventions.'};
  }
  return Object.freeze({catalog,classify});
 }
 return Object.freeze({version:5,addresses,sample,open});
});
