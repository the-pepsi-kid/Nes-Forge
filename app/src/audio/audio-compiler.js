/* NES Forge 1.8 — detached compiler for the existing tracker/instrument model.
 * SFX reuse one authored pattern channel/range; animation events resolve by ID
 * or an unambiguous name. No second note or instrument representation exists.
 */
(()=>{
'use strict';
const services=(window.Forge=window.Forge||{}).services=window.Forge.services||{};
const fail=message=>{throw Error('Audio Runtime: '+message);};
const integer=(value,min,max,label)=>{if(!Number.isInteger(value)||value<min||value>max)fail(label+' must be an integer from '+min+' through '+max);return value;};
const copy=value=>JSON.parse(JSON.stringify(value));
function timer(note){const frequency=440*Math.pow(2,(note-57)/12);return Math.max(8,Math.min(2047,Math.round(1789773/(16*frequency)-1)));}
function normalizeSfx(item,index,rows){
 if(!item||typeof item!=='object'||Array.isArray(item))fail('SFX '+(index+1)+' must be an object');
 const id=String(item.id||'').trim(),name=String(item.name||'').trim();if(!id)fail('SFX '+(index+1)+' needs a stable ID');if(!name)fail('SFX '+id+' needs a name');
 const startRow=integer(Number(item.startRow),0,rows-1,'SFX '+id+' start row'),endRow=integer(Number(item.endRow),startRow,rows-1,'SFX '+id+' end row');
 return {id,name,channel:integer(Number(item.channel),0,3,'SFX '+id+' channel'),pattern:integer(Number(item.pattern),0,255,'SFX '+id+' pattern'),startRow,endRow};
}
function plan(source){
 const config=services.AudioConfig.validate(source.audioRuntime||services.AudioConfig.defaults());if(!config.enabled)return Object.freeze({enabled:false,musicEnabled:false});
 const rows=integer(source.audRows,16,128,'row count'),tempo=integer(source.tempo,30,300,'tempo'),speed=integer(source.speed,1,15,'speed');
 if(!Array.isArray(source.patterns)||!source.patterns.length)fail('At least one tracker pattern is required');
 if(!Array.isArray(source.orderList)||!source.orderList.length)fail('At least one pattern order row is required');
 if(source.orderList.length>255)fail('At most 255 order rows fit this mapper-0 Audio Runtime');
 if(!Array.isArray(source.instruments)||source.instruments.length>255)fail('At most 255 instruments fit this Audio Runtime');
 const instruments=source.instruments.map((item,index)=>{
  if(!item||typeof item!=='object'||Array.isArray(item))fail('Instrument '+index+' is invalid');
  const volume=Array.from(item.volEnv?.length?item.volEnv:[15],(v,i)=>integer(Number(v),0,15,'Instrument '+index+' volume '+i));
  const arp=Array.from(item.arpEnv?.length?item.arpEnv:[0],(v,i)=>integer(Number(v),-24,24,'Instrument '+index+' arpeggio '+i));
  if(volume.length>255||arp.length>255)fail('Instrument '+index+' envelope exceeds 255 runtime steps');
  const loopVol=integer(Number(item.loopVol??-1),-1,volume.length-1,'Instrument '+index+' volume loop');
  const loopArp=integer(Number(item.loopArp??-1),-1,arp.length-1,'Instrument '+index+' arpeggio loop');
  return {name:String(item.name||'Instrument '+index),duty:integer(Number(item.dutyEnv?.[0]??2),0,3,'Instrument '+index+' duty'),volume,arp,loopVol,loopArp};
 });
 const sfx=(source.sfx||[]).map((item,index)=>normalizeSfx(item,index,rows));if(sfx.length>255)fail('At most 255 SFX definitions are supported');
 const ids=new Set(),names=new Map();for(const item of sfx){if(ids.has(item.id))fail('Duplicate SFX ID: '+item.id);ids.add(item.id);const list=names.get(item.name)||[];list.push(item);names.set(item.name,list);}
 const records=[],recordKeys=new Map();
 function pattern(index,channel,owner){
  integer(index,0,source.patterns.length-1,owner+' pattern');integer(channel,0,3,owner+' channel');const key=index+':'+channel;if(recordKeys.has(key))return recordKeys.get(key);
  const pattern=source.patterns[index];if(!pattern||!Array.isArray(pattern.rows))fail(owner+' references an invalid pattern '+index);
  const events=[];for(let row=0;row<rows;row++){
   const cell=pattern.rows[row]?.[channel]||{};const note=integer(Number(cell.note??-1),-2,95,owner+' row '+row+' note'),inst=integer(Number(cell.inst??-1),-1,255,owner+' row '+row+' instrument'),vol=integer(Number(cell.vol??-1),-1,15,owner+' row '+row+' volume'),fx=integer(Number(cell.fx??0),0,255,owner+' row '+row+' effect'),fxp=integer(Number(cell.fxp??0),0,255,owner+' row '+row+' effect parameter');
   if(fx||fxp)fail(owner+' row '+row+' uses tracker effects that have no 1.8 runtime meaning');
   if(note>=0){if(!instruments.length)fail(owner+' row '+row+' plays a note but no instrument exists');if(inst>=instruments.length&&inst!==-1)fail(owner+' row '+row+' references missing instrument '+inst);}
   if(note!==-1||vol!==-1)events.push({row,note,inst,vol});
  }
  const id=records.length;records.push({sourcePattern:index,channel,events});recordKeys.set(key,id);return id;
 }
 const orders=config.musicEnabled?source.orderList.map((row,index)=>{if(!Array.isArray(row))fail('Order '+index+' is invalid');return Array.from({length:4},(_,channel)=>pattern(integer(Number(row[channel]??0),0,source.patterns.length-1,'Order '+index+' channel '+channel),channel,'Music order '+index+' channel '+channel));}):[];
 for(const item of sfx)item.record=pattern(item.pattern,item.channel,'SFX '+item.id);
 // DPCM in the executable music order cannot silently disappear. Unreferenced
 // DPCM sketches remain preserved authoring data.
 if(config.musicEnabled)for(const [orderIndex,order]of source.orderList.entries()){
  const pi=integer(Number(order?.[4]??0),0,source.patterns.length-1,'Order '+orderIndex+' DPCM pattern');const p=source.patterns[pi];
  for(let row=0;row<rows;row++){const cell=p?.rows?.[row]?.[4];if(cell&&(cell.note??-1)!==-1)fail('Music order '+orderIndex+' DPCM pattern '+pi+' row '+row+' has no sample model in 1.8');}
 }
 const byId=new Map(sfx.map((item,index)=>[item.id,index])),byName=new Map([...names].map(([name,list])=>[name,list.length===1?sfx.indexOf(list[0]):-1]));
 function soundIndex(frame,label){
  const events=(frame?.events||[]).filter(event=>event?.type==='sound');if(events.length>1)fail(label+' has more than one sound event; one SFX may start per frame entry');if(!events.length)return 255;
  const value=String(events[0].value||'').trim();if(!value)fail(label+' sound event needs an SFX ID or unique name');let index=byId.get(value);if(index===undefined)index=byName.get(value);if(index===-1)fail(label+' sound event name is ambiguous: '+value);if(index===undefined)fail(label+' references missing SFX: '+value);return index;
 }
 const estimated=192+instruments.reduce((n,i)=>n+8+i.volume.length+i.arp.length,0)+records.reduce((n,r)=>n+1+r.events.length*4,0)+orders.length*8+sfx.length*7;
 return {enabled:true,musicEnabled:config.musicEnabled,tempo,speed,rows,instruments,records,orders,sfx,noteTimers:Array.from({length:96},(_,note)=>timer(note)),soundIndex,estimatedBytes:estimated,source:copy(config)};
}
services.AudioCompiler=Object.freeze({plan,normalizeSfx,timer});
})();
