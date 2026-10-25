/* FamiStudio 4.5 text -> existing Forge tracker data, without project mutation.
 * Format reference: BleuBleu/FamiStudio commit 70625dd09d8acaef831bbce468d416fb0b596be1,
 * IO/FamistudioTextFile.cs, ChannelStates/ChannelState.cs and ChannelStateNoise.cs.
 * This is a bounded score/instrument conversion, not the original sound driver.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root){root.FamiStudioText=api;const forge=root.Forge=root.Forge||{};(forge.services=forge.services||{}).FamiStudioText=api;}
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const PROFILE='famistudio-text-4.5-2a03-v1';
 const CHANNELS=['Square1','Square2','Triangle','Noise','DPCM'];
 const MAX_TEXT=4*1024*1024,MAX_LINES=65536,MAX_EVENTS=131072,MAX_ROWS=32640;
 const fail=(message,line)=>{throw Error('FamiStudio import: '+(line?'line '+line+': ':'')+message);};
 const fields={
  Project:'Version TempoMode Name Author Copyright PAL Tuning Expansions',
  Instrument:'Name Color Folder Expansion',
  Envelope:'Type Length Loop Release Relative Values',
  Song:'Name Color Folder Length LoopPoint PatternLength BeatLength NoteLength Groove GroovePaddingMode FamiTrackerTempo FamiTrackerSpeed',
  PatternCustomSettings:'Time Length BeatLength NoteLength Groove GroovePaddingMode',
  Channel:'Type',Pattern:'Name Color',PatternInstance:'Time Pattern',
  Note:'Time Value Duration Instrument Volume Attack Release Arpeggio SlideTarget VolumeSlideTarget VibratoSpeed VibratoDepth Speed FinePitch DutyCycle NoteDelay CutDelay DeltaCounter PhaseReset EnvelopePeriod FdsModSpeed FdsModDepth'
 };
 const allowed=Object.fromEntries(Object.entries(fields).map(([key,value])=>[key,new Set(value.split(' '))]));
 function integer(value,min,max,label,line){
  if(typeof value!=='string'||!/^\d+$/.test(value))fail(label+' must be an integer from '+min+' through '+max,line);
  const n=Number(value);if(!Number.isSafeInteger(n)||n<min||n>max)fail(label+' must be an integer from '+min+' through '+max,line);return n;
 }
 function signed(value,min,max,label,line){
  if(typeof value!=='string'||! /^-?\d+$/.test(value))fail(label+' must be an integer from '+min+' through '+max,line);
  const n=Number(value);if(!Number.isSafeInteger(n)||n<min||n>max)fail(label+' must be an integer from '+min+' through '+max,line);return n;
 }
 function required(record,key){if(record.a[key]===undefined||record.a[key]==='')fail(record.type+' requires '+key,record.line);return record.a[key];}
 function name(record,key='Name'){const value=required(record,key);if(value.length>256)fail(key+' exceeds 256 characters',record.line);return value;}
 function boolean(value,label,line){if(value!=='True'&&value!=='False')fail(label+' must be True or False',line);return value==='True';}
 function records(input){
  if(typeof input!=='string'||!input.trim())fail('expected a FamiStudio text export');if(input.length>MAX_TEXT)fail('text exceeds 4 MiB');
  if(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(input))fail('text contains invalid control characters');
  const lines=input.replace(/^\uFEFF/,'').split(/\r\n|\n|\r/);if(lines.length>MAX_LINES)fail('text exceeds '+MAX_LINES+' lines');
  const result=[];
  lines.forEach((raw,i)=>{
   const text=raw.trim(),line=i+1;if(!text)return;if(text.length>8192)fail('line exceeds 8192 characters',line);
   const start=/^([A-Za-z][A-Za-z0-9]*)\b/.exec(text);if(!start)fail('invalid object name',line);
   const type=start[1];if(!allowed[type])fail('unsupported object '+type,line);
   const a=Object.create(null);let at=start[0].length;
   while(at<text.length){
    const gap=/^\s+/.exec(text.slice(at));if(!gap)fail('attributes must be separated by whitespace',line);at+=gap[0].length;if(at===text.length)break;
    const keyMatch=/^([A-Za-z][A-Za-z0-9]*)\s*=\s*"/.exec(text.slice(at));if(!keyMatch)fail('malformed quoted attribute',line);
    const key=keyMatch[1];if(!allowed[type].has(key))fail('unsupported '+type+' attribute '+key,line);if(Object.hasOwn(a,key))fail('duplicate attribute '+key,line);at+=keyMatch[0].length;
    let value='',closed=false;
    while(at<text.length){if(text[at]==='"'){if(text[at+1]==='"'){value+='"';at+=2;}else{at++;closed=true;break;}}else value+=text[at++];}
    if(!closed)fail('unterminated '+key+' value',line);a[key]=value;
   }
   result.push({type,a,line});
  });return result;
 }
 function parse(text){
  const list=records(text);if(list[0]?.type!=='Project')fail('Project must be the first object');
  const project=list[0];required(project,'Version');required(project,'TempoMode');
  const result={project,instruments:[],songs:[]};let inst=null,song=null,channel=null,pattern=null;
  const names=new Set();
  for(const record of list.slice(1)){
   switch(record.type){
    case 'Project':fail('duplicate Project',record.line);break;
    case 'Instrument':
     if(song)fail('Instrument must appear before songs',record.line);name(record);if(names.has(record.a.Name))fail('duplicate instrument '+record.a.Name,record.line);names.add(record.a.Name);inst={...record,name:record.a.Name,envelopes:[]};result.instruments.push(inst);if(result.instruments.length>255)fail('more than 255 instruments',record.line);break;
    case 'Envelope':
     if(!inst||song)fail('Envelope must follow its Instrument',record.line);required(record,'Type');required(record,'Length');required(record,'Values');if(inst.envelopes.some(e=>e.a.Type===record.a.Type))fail('duplicate '+record.a.Type+' envelope',record.line);inst.envelopes.push(record);break;
    case 'Song':
     name(record);song={...record,name:record.a.Name,channels:[],custom:[]};result.songs.push(song);if(result.songs.length>256)fail('more than 256 songs',record.line);inst=channel=pattern=null;break;
    case 'PatternCustomSettings':
     if(!song||channel)fail('PatternCustomSettings must precede song channels',record.line);song.custom.push(record);break;
    case 'Channel':
     if(!song)fail('Channel requires a Song',record.line);required(record,'Type');if(song.channels.some(c=>c.a.Type===record.a.Type))fail('duplicate channel '+record.a.Type,record.line);channel={...record,patterns:[],instances:[]};song.channels.push(channel);pattern=null;break;
    case 'Pattern':
     if(!channel)fail('Pattern requires a Channel',record.line);name(record);if(channel.patterns.some(p=>p.a.Name===record.a.Name))fail('duplicate pattern '+record.a.Name,record.line);pattern={...record,notes:[]};channel.patterns.push(pattern);if(channel.patterns.length>256)fail('more than 256 patterns in a channel',record.line);break;
    case 'Note':
     if(!pattern)fail('Note requires a Pattern',record.line);pattern.notes.push(record);break;
    case 'PatternInstance':
     if(!channel)fail('PatternInstance requires a Channel',record.line);required(record,'Time');required(record,'Pattern');channel.instances.push(record);pattern=null;break;
   }
  }
  if(!result.songs.length)fail('project contains no songs');return result;
 }
 function inspect(text){const p=parse(text);return {format:'FamiStudioText',version:p.project.a.Version,projectName:p.project.a.Name||'',tempoMode:p.project.a.TempoMode,songs:p.songs.map((song,index)=>({index,name:song.name}))};}
 function noAttributes(record,names){for(const key of names)if(record.a[key]!==undefined)fail('unsupported '+record.type+' attribute '+key,record.line);}
 function timing(record,mode,custom=false){
  const a=record.a,length=integer(required(record,custom?'Length':'PatternLength'),1,4096,'pattern length',record.line);
  if(a.BeatLength!==undefined)integer(a.BeatLength,1,4096,'BeatLength',record.line);
  if(mode==='FamiTracker'){
   noAttributes(record,['NoteLength','Groove','GroovePaddingMode']);
   return {length,noteLength:1,tempo:custom?null:integer(required(record,'FamiTrackerTempo'),30,300,'FamiTrackerTempo',record.line),speed:custom?null:integer(required(record,'FamiTrackerSpeed'),1,15,'FamiTrackerSpeed',record.line)};
  }
  noAttributes(record,['FamiTrackerTempo','FamiTrackerSpeed']);
  const noteLength=integer(required(record,'NoteLength'),1,18,'NoteLength',record.line),groove=required(record,'Groove').split('-').map(v=>integer(v,1,18,'Groove value',record.line));
  if(groove.length>16||groove.some(v=>v!==noteLength))fail('only constant Groove equal to NoteLength is supported',record.line);
  if(!['Beginning','Middle','End'].includes(required(record,'GroovePaddingMode')))fail('unknown GroovePaddingMode',record.line);
  return {length:length*noteLength,noteLength,tempo:150,speed:1};
 }
 function instrument(item,tempo){
  noAttributes(item,['Expansion']);const envs=new Map();
  for(const env of item.envelopes){
   const type=env.a.Type;if(!['Volume','DutyCycle','Arpeggio','Pitch'].includes(type))fail('unsupported envelope '+type,env.line);
   noAttributes(env,['Release']);if(env.a.Relative!==undefined&&boolean(env.a.Relative,'Relative',env.line))fail('relative envelopes are unsupported',env.line);
   const length=integer(env.a.Length,1,255,'envelope length',env.line),values=env.a.Values.split(',').map(v=>signed(v,type==='Volume'||type==='DutyCycle'?0:-127,type==='Volume'?15:type==='DutyCycle'?3:127,type+' value',env.line));
   if(values.length!==length)fail(type+' Length differs from Values count',env.line);
   const loop=env.a.Loop===undefined?length-1:integer(env.a.Loop,0,length-1,'envelope loop',env.line);
   if(type==='DutyCycle'&&values.some(v=>v!==values[0]))fail('changing duty envelopes are unsupported',env.line);
   if((type==='Arpeggio'||type==='Pitch')&&values.some(v=>v!==0))fail(type+' envelopes are unsupported except all-zero values',env.line);
   if(type==='Volume'&&tempo!==150&&values.some(v=>v!==values[0]))fail('changing volume envelopes require tempo 150 (one envelope tick per NTSC frame)',env.line);
   envs.set(type,{values,loop});
  }
  const volume=envs.get('Volume')||{values:[15],loop:0};
  return {name:item.name,volEnv:volume.values,dutyEnv:[envs.get('DutyCycle')?.values[0]??0],arpEnv:[0],pitchEnv:[0],loopVol:volume.loop,loopArp:0};
 }
 function noteValue(value,line){const m=/^([A-G])(#?)([0-7])$/.exec(value||'');if(!m)fail('unsupported note '+value,line);const pitch={C:0,D:2,E:4,F:5,G:7,A:9,B:11}[m[1]]+(m[2]?1:0);if(pitch>11||m[2]&&['E','B'].includes(m[1]))fail('invalid note '+value,line);return Number(m[3])*12+pitch;}
 const blank=()=>({note:-1,inst:-1,vol:-1,fx:0,fxp:0});
 function preview(text,options={}){
  const parsed=parse(text),p=parsed.project.a;
  if(!/^4\.5\.\d+$/.test(p.Version))fail('supported text version is 4.5.x; received '+p.Version);
  if(!['FamiStudio','FamiTracker'].includes(p.TempoMode))fail('unknown TempoMode '+p.TempoMode);
  if(p.PAL!==undefined&&boolean(p.PAL,'PAL',parsed.project.line))fail('PAL conversion is unsupported');
  if(p.Tuning!==undefined&&integer(p.Tuning,1,1000,'Tuning',parsed.project.line)!==440)fail('only A440 tuning is supported');
  if(p.Expansions!==undefined)fail('expansion audio is unsupported');
  const songIndex=options.songIndex??0,rows=options.rows??64;
  if(!Number.isInteger(songIndex)||songIndex<0||songIndex>=parsed.songs.length)fail('songIndex is outside the song inventory');
  if(!Number.isInteger(rows)||rows<16||rows>128)fail('tracker row count must be 16–128');
  const song=parsed.songs[songIndex],length=integer(required(song,'Length'),1,256,'song length',song.line),loop=signed(required(song,'LoopPoint'),-1,length-1,'LoopPoint',song.line);
  if(loop>0)fail('nonzero song loop points are unsupported; Forge loops the complete arrangement',song.line);
  const base=timing(song,p.TempoMode),sizes=Array(length).fill(base.length),seenCustom=new Set();
  for(const custom of song.custom){const at=integer(required(custom,'Time'),0,length-1,'custom pattern time',custom.line);if(seenCustom.has(at))fail('duplicate custom pattern time '+at,custom.line);seenCustom.add(at);sizes[at]=timing(custom,p.TempoMode,true).length;}
  const starts=[0];for(const size of sizes)starts.push(starts.at(-1)+size);const durationRows=starts.at(-1);
  if(durationRows>MAX_ROWS||Math.ceil(durationRows/rows)>255)fail('song exceeds 255 orders / '+MAX_ROWS+' tracker rows');
  const warnings=['Converted score and supported instruments use the Forge sound engine; original-driver waveform and cycle equivalence are not claimed.','One finite pass is converted. Forge repeats from row zero with initial channel volume and silence reset; FamiStudio can carry channel state across its loop.'];
  if(loop===-1)warnings.push('The source song has no loop. Forge playback repeats the complete imported arrangement.');
  if(parsed.songs.length>1)warnings.push('Only selected song '+(songIndex+1)+' of '+parsed.songs.length+' is imported.');
  const instruments=[],instByName=new Map(),sourceInstruments=new Map(parsed.instruments.map(i=>[i.name,i]));
  function getInstrument(key,line){if(instByName.has(key))return instByName.get(key);const item=sourceInstruments.get(key);if(!item)fail('unknown instrument '+key,line);const index=instruments.length;instruments.push(instrument(item,base.tempo));instByName.set(key,index);return index;}
  const channels=Array.from({length:4},()=>[]);let noteCount=0,expandedCount=0,unusedPatterns=0;
  for(const ch of song.channels){
   const ci=CHANNELS.indexOf(ch.a.Type);if(ci<0)fail('unsupported channel '+ch.a.Type,ch.line);
   if(ci===4){if(ch.patterns.some(pat=>pat.notes.length)||ch.instances.length)fail('DPCM content is unsupported',ch.line);continue;}
   const patternMap=new Map(),times=new Set(),used=new Set();
   for(const pattern of ch.patterns){const notes=[],noteTimes=new Set();for(const record of pattern.notes){
    const a=record.a,time=integer(required(record,'Time'),0,MAX_ROWS-1,'note time',record.line);if(noteTimes.has(time))fail('duplicate note time '+time,record.line);noteTimes.add(time);
    noAttributes(record,['Release','Arpeggio','SlideTarget','VolumeSlideTarget','VibratoSpeed','VibratoDepth','Speed','FinePitch','DutyCycle','NoteDelay','CutDelay','DeltaCounter','PhaseReset','EnvelopePeriod','FdsModSpeed','FdsModDepth']);
    if(a.Attack!==undefined&&!boolean(a.Attack,'Attack',record.line))fail('legato / Attack=False is unsupported',record.line);
    const note=a.Value===undefined?-1:a.Value==='Stop'?-2:noteValue(a.Value,record.line);
    if(note<0&&(a.Duration!==undefined||a.Instrument!==undefined||a.Attack!==undefined))fail('non-musical note has musical attributes',record.line);
    if(note===-1&&a.Volume===undefined)fail('empty Note has no supported event',record.line);
    notes.push({time,note,duration:note>=0?integer(required(record,'Duration'),1,MAX_ROWS,'Duration',record.line):0,instrument:a.Instrument,volume:a.Volume===undefined?-1:integer(a.Volume,0,15,'Volume',record.line),line:record.line});
   }patternMap.set(pattern.a.Name,notes.sort((a,b)=>a.time-b.time));}
   for(const instance of ch.instances){const index=integer(instance.a.Time,0,length-1,'pattern instance time',instance.line);if(times.has(index))fail('duplicate pattern instance time '+index,instance.line);times.add(index);const notes=patternMap.get(instance.a.Pattern);if(!notes)fail('unknown pattern '+instance.a.Pattern,instance.line);used.add(instance.a.Pattern);
    for(const note of notes){if(note.time>=sizes[index])fail('note lies beyond its pattern instance; hidden notes are unsupported',note.line);const row=starts[index]+note.time;if(note.note>=0&&row+note.duration>durationRows)fail('note duration extends beyond the song end',note.line);channels[ci].push({...note,row});if(++expandedCount>MAX_EVENTS)fail('expanded event budget exceeded');}
   }unusedPatterns+=ch.patterns.length-used.size;
  }
  const count=Math.ceil(durationRows/rows),patterns=Array.from({length:count},()=>({rows:Array.from({length:rows},()=>Array.from({length:5},blank))}));
  const at=(row,channel)=>patterns[Math.floor(row/rows)].rows[row%rows][channel];
  for(let ci=0;ci<4;ci++){
   const events=channels[ci].sort((a,b)=>a.row-b.row);let activeEnd=-1,currentInst=-1,currentVolume=15;
   // Explicit initial state also makes full-song repeats deterministic.
   Object.assign(at(0,ci),{note:-2,vol:15});
   const checkVolume=(inst,volume,line)=>{if(inst>=0&&instruments[inst].volEnv.some(v=>v>0&&volume>0&&Math.round(v*volume/15)===0))fail('this envelope/volume combination needs FamiStudio minimum-volume behavior that Forge does not represent',line);};
   for(const event of events){
    if(activeEnd>=0&&activeEnd<=event.row){if(activeEnd<durationRows)at(activeEnd,ci).note=-2;activeEnd=-1;}
    const cell=at(event.row,ci);
    if(event.volume>=0){currentVolume=event.volume;cell.vol=currentVolume;}
    if(event.note>=0){
     if(event.instrument!==undefined)currentInst=getInstrument(event.instrument,event.line);if(currentInst<0)fail('first musical note on '+CHANNELS[ci]+' needs an Instrument',event.line);
     if(ci===3&&instruments[currentInst].dutyEnv[0]%2)fail('short-mode noise is unsupported',event.line);
     cell.note=ci===3?((event.note+1)&15)*6:event.note;cell.inst=currentInst;cell.vol=currentVolume;activeEnd=event.row+event.duration;noteCount++;
    }else if(event.note===-2){cell.note=-2;activeEnd=-1;}
    checkVolume(currentInst,currentVolume,event.line);
   }
   if(activeEnd>=0&&activeEnd<count*rows)at(activeEnd,ci).note=-2;
   // Empty tail is truly silent, even when imported source sustains to its end.
   if(durationRows<count*rows)at(durationRows,ci).note=-2;
  }
  if(!noteCount)fail('selected song contains no playable notes');
  if(unusedPatterns)warnings.push(unusedPatterns+' unreferenced channel patterns were not converted; keep the original text export.');
  if(count*rows>durationRows)warnings.push('Added '+(count*rows-durationRows)+' silent padding rows to fit '+rows+'-row Forge patterns.');
  if(parsed.instruments.length>instruments.length)warnings.push('Only instruments used by the selected arrangement were converted.');
  const report={profile:PROFILE,sourceVersion:p.Version,songIndex,songName:song.name,sourceRows:durationRows,durationRows,paddingRows:count*rows-durationRows,sourceLoopPoint:loop,converted:['Note pitches, starts, durations and channel assignments','Supported volume envelopes and constant duty','Selected arrangement expanded into Forge patterns'],omitted:['Editor colors and folder organization','Unselected songs and unreferenced patterns'],warnings:[...warnings]};
  return {format:'famistudio-text',tempo:base.tempo,speed:base.speed,rows,patterns,instruments,orderList:patterns.map((_,i)=>[i,i,i,i,i]),warnings,noteCount,report,songName:song.name,durationRows};
 }
 return Object.freeze({profile:PROFILE,parse,inspect,preview});
});
