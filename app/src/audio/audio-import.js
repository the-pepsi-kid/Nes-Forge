/* NES Forge 1.8 — bounded MIDI and uncompressed MusicXML import.
 * Both adapters end at the existing tracker/instrument representation. They do
 * not create a second score model, transcription model, or runtime format.
 */
(()=>{
'use strict';
const services=(window.Forge=window.Forge||{}).services=window.Forge.services||{};
const fail=message=>{throw Error('Audio import: '+message);};
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const blankCell=()=>({note:-1,inst:-1,vol:-1,fx:0,fxp:0});
const blankPattern=rows=>({rows:Array.from({length:rows},()=>Array.from({length:5},blankCell))});
function noteNumber(midi,label){if(!Number.isInteger(midi)||midi<12||midi>107)fail(label+' note '+midi+' is outside the tracker C0–B7 range');return midi-12;}
function vlq(bytes,state,end){let value=0;for(let count=0;count<4;count++){if(state.at>=end)fail('truncated variable-length value');const byte=bytes[state.at++];value=(value<<7)|(byte&127);if(!(byte&128))return value;}fail('variable-length value exceeds four bytes');}
function u16(bytes,at){return bytes[at]*256+bytes[at+1];}
function u32(bytes,at){return bytes[at]*0x1000000+bytes[at+1]*0x10000+bytes[at+2]*256+bytes[at+3];}
function ascii(bytes,at,length){return String.fromCharCode(...bytes.subarray(at,at+length));}
function parseMidi(input){
 const bytes=input instanceof Uint8Array?input:new Uint8Array(input||0);if(bytes.length<14||bytes.length>4*1024*1024)fail('MIDI file is missing or exceeds 4 MB');if(ascii(bytes,0,4)!=='MThd')fail('missing MThd header');
 const headerLength=u32(bytes,4);if(headerLength<6||8+headerLength>bytes.length)fail('invalid MIDI header length');const format=u16(bytes,8),trackCount=u16(bytes,10),division=u16(bytes,12);if(format>1)fail('MIDI format 2 is asynchronous and unsupported');if(!trackCount||trackCount>64)fail('MIDI requires 1–64 tracks');if(division&0x8000||!division)fail('SMPTE MIDI timing is unsupported; use pulses per quarter note');
 let at=8+headerLength,serial=0,finalTick=0;const raw=[],tempos=[],trackNames=[];
 for(let track=0;track<trackCount;track++){
  if(at+8>bytes.length||ascii(bytes,at,4)!=='MTrk')fail('missing MTrk chunk '+(track+1));const length=u32(bytes,at+4),end=at+8+length;if(end>bytes.length)fail('truncated MIDI track '+(track+1));const state={at:at+8},program=Array(16).fill(0);let tick=0,running=0,name='Track '+(track+1);
  while(state.at<end){tick+=vlq(bytes,state,end);finalTick=Math.max(finalTick,tick);if(state.at>=end)fail('truncated MIDI event');let status=bytes[state.at];if(status<0x80){if(!running)fail('running status appears before a channel message');status=running;}else{state.at++;if(status<0xF0)running=status;}
   if(status===0xFF){if(state.at>=end)fail('truncated MIDI meta event');const type=bytes[state.at++],size=vlq(bytes,state,end);if(state.at+size>end)fail('truncated MIDI meta payload');if(type===0x51&&size===3)tempos.push({tick,micros:bytes[state.at]*65536+bytes[state.at+1]*256+bytes[state.at+2]});if(type===0x03)name=new TextDecoder().decode(bytes.subarray(state.at,state.at+size)).slice(0,80)||name;state.at+=size;running=0;continue;}
   if(status===0xF0||status===0xF7){const size=vlq(bytes,state,end);if(state.at+size>end)fail('truncated MIDI system message');state.at+=size;running=0;continue;}
   const type=status&0xF0,channel=status&15,size=type===0xC0||type===0xD0?1:2;if(state.at+size>end)fail('truncated MIDI channel message');const a=bytes[state.at++],b=size===2?bytes[state.at++]:0;
   if(type===0xC0)program[channel]=a;else if(type===0x90&&b>0)raw.push({tick,on:true,track,channel,midi:a,velocity:b,program:program[channel],serial:serial++});else if(type===0x80||(type===0x90&&b===0))raw.push({tick,on:false,track,channel,midi:a,serial:serial++});
  }
  trackNames[track]=name;at=end;
 }
 const active=new Map(),notes=[],warnings=[];raw.sort((a,b)=>a.tick-b.tick||(a.on===b.on?0:a.on?1:-1)||a.serial-b.serial);
 for(const event of raw){const key=event.track+':'+event.channel+':'+event.midi,list=active.get(key)||[];if(event.on){list.push(event);active.set(key,list);}else if(list.length){const start=list.shift();notes.push({start:start.tick/division,end:Math.max(start.tick+1,event.tick)/division,note:noteNumber(start.midi,'MIDI'),velocity:start.velocity,percussion:start.channel===9,program:start.program,source:trackNames[start.track]||('Track '+(start.track+1))});}}
 for(const list of active.values())for(const start of list){notes.push({start:start.tick/division,end:Math.max(start.tick+1,finalTick)/division,note:noteNumber(start.midi,'MIDI'),velocity:start.velocity,percussion:start.channel===9,program:start.program,source:trackNames[start.track]||('Track '+(start.track+1))});warnings.push('An unterminated MIDI note was closed at the end of the file.');}
 if(!notes.length)fail('MIDI file contains no playable note-on/note-off pairs');tempos.sort((a,b)=>a.tick-b.tick);const bpm=tempos.length?60000000/tempos[0].micros:120;if(new Set(tempos.map(t=>t.micros)).size>1)warnings.push('Tempo changes were flattened to the initial tempo because the tracker has one song tempo.');
 return {format:'midi',tempo:clamp(Math.round(bpm),30,300),notes,warnings};
}
const xmlBlocks=(text,name)=>[...text.matchAll(new RegExp('<(?:[\\w.-]+:)?'+name+'(?=\\s|>)[^>]*>([\\s\\S]*?)<\\/(?:[\\w.-]+:)?'+name+'\\s*>','gi'))].map(match=>({body:match[1],tag:match[0]}));
const xmlValue=(text,name)=>{const match=text.match(new RegExp('<(?:[\\w.-]+:)?'+name+'(?=\\s|>)[^>]*>([\\s\\S]*?)<\\/(?:[\\w.-]+:)?'+name+'\\s*>','i'));return match?match[1].replace(/<[^>]+>/g,'').trim():'';};
const xmlHas=(text,name)=>new RegExp('<(?:[\\w.-]+:)?'+name+'(?:\\s|/|>)','i').test(text);
function parseMusicXml(input){
 const text=String(input||'');if(!text.trim()||text.length>4*1024*1024)fail('MusicXML file is missing or exceeds 4 MB');if(/<!DOCTYPE|<!ENTITY/i.test(text))fail('DTD/entity declarations are unsupported');if(!/<(?:[\w.-]+:)?score-partwise\b/i.test(text))fail('only uncompressed score-partwise MusicXML is supported');
 const partNames=new Map();for(const block of xmlBlocks(text,'score-part')){const id=(block.tag.match(/\bid\s*=\s*["']([^"']+)["']/i)||[])[1];if(id)partNames.set(id,xmlValue(block.body,'part-name')||id);}
 const notes=[],tempos=[],warnings=[];const parts=xmlBlocks(text,'part');if(!parts.length)fail('MusicXML contains no parts');
 parts.forEach((part,partIndex)=>{const id=(part.tag.match(/\bid\s*=\s*["']([^"']+)["']/i)||[])[1]||('part-'+(partIndex+1)),source=(partNames.get(id)||id).slice(0,80);let divisions=1,cursor=0,lastStart=0;
  const token=/<(?:[\w.-]+:)?(attributes|direction|note|backup|forward)\b[^>]*>[\s\S]*?<\/(?:[\w.-]+:)?\1\s*>/gi;for(const match of part.body.matchAll(token)){const kind=match[1].toLowerCase(),body=match[0];
   if(kind==='attributes'){const value=Number(xmlValue(body,'divisions'));if(value>0&&Number.isFinite(value))divisions=value;continue;}
   if(kind==='direction'){const sound=body.match(/<(?:[\w.-]+:)?sound\b[^>]*\btempo\s*=\s*["']([0-9.]+)["']/i),perMinute=Number(xmlValue(body,'per-minute')),tempo=sound?Number(sound[1]):perMinute;if(Number.isFinite(tempo)&&tempo>0)tempos.push({at:cursor,value:tempo});continue;}
   const duration=Number(xmlValue(body,'duration'));if(!Number.isFinite(duration)||duration<0){warnings.push('A MusicXML grace/undivided event was skipped.');continue;}const quarters=duration/divisions;
   if(kind==='backup'){cursor=Math.max(0,cursor-quarters);continue;}if(kind==='forward'){cursor+=quarters;continue;}
   const chord=xmlHas(body,'chord'),start=chord?lastStart:cursor;if(!chord){lastStart=start;cursor+=quarters;}if(xmlHas(body,'rest')||quarters<=0)continue;
   const unpitched=xmlHas(body,'unpitched');let midi;if(unpitched)midi=36;else{const step=xmlValue(body,'step').toUpperCase(),octave=Number(xmlValue(body,'octave')),alter=Number(xmlValue(body,'alter')||0),semitone={C:0,D:2,E:4,F:5,G:7,A:9,B:11}[step];if(semitone===undefined||!Number.isInteger(octave)||!Number.isInteger(alter))fail('invalid MusicXML pitch in '+source);midi=(octave+1)*12+semitone+alter;}
   notes.push({start,end:start+quarters,note:noteNumber(midi,'MusicXML'),velocity:100,percussion:unpitched,program:partIndex,source});
  }
 });
 if(!notes.length)fail('MusicXML contains no playable pitched or unpitched notes');tempos.sort((a,b)=>a.at-b.at);if(new Set(tempos.map(t=>Math.round(t.value*1000))).size>1)warnings.push('Tempo changes were flattened to the initial tempo because the tracker has one song tempo.');const bpm=tempos[0]?.value||120;
 return {format:'musicxml',tempo:clamp(Math.round(bpm),30,300),notes,warnings};
}
function materialize(parsed,rows=64){
 if(!parsed||!Array.isArray(parsed.notes)||!parsed.notes.length)fail('parsed music contains no notes');if(!Number.isInteger(rows)||rows<16||rows>128)fail('tracker row count must be 16–128');
 const quantized=parsed.notes.map((note,index)=>{const start=Math.max(0,Math.round(note.start*4)),end=Math.max(start+1,Math.round(note.end*4));return {...note,startRow:start,endRow:end,index};}).sort((a,b)=>a.startRow-b.startRow||a.percussion-b.percussion||a.note-b.note||a.index-b.index);
 const voiceEnds=[-1,-1,-1],instrumentKeys=[],instrumentMap=new Map(),events=[];let noiseEnd=-1,maxRow=0;
 for(const note of quantized){let channel;if(note.percussion){channel=3;if(note.startRow<noiseEnd)fail('percussion overlap exceeds the single NES noise channel at row '+note.startRow);noiseEnd=note.endRow;}else{channel=voiceEnds.findIndex(end=>end<=note.startRow);if(channel<0)fail('polyphony exceeds the three NES tonal channels at row '+note.startRow);voiceEnds[channel]=note.endRow;}
  const key=(note.percussion?'noise:':'tone:')+note.source+':'+note.program;let instrument=instrumentMap.get(key);if(instrument===undefined){instrument=instrumentKeys.length;instrumentMap.set(key,instrument);instrumentKeys.push({key,note,channel});}
  events.push({row:note.startRow,channel,note:note.note,inst:instrument,vol:clamp(Math.round((note.velocity??100)*15/127),1,15),cut:false});events.push({row:note.endRow,channel,cut:true});maxRow=Math.max(maxRow,note.endRow);
 }
 const count=Math.ceil((maxRow+1)/rows);if(count>255)fail('import needs '+count+' order rows; maximum 255');const patterns=Array.from({length:count},()=>blankPattern(rows));
 for(const event of events){const pi=Math.floor(event.row/rows),row=event.row%rows,target=patterns[pi].rows[row][event.channel];if(event.cut){if(target.note===-1)target.note=-2;}else Object.assign(target,{note:event.note,inst:event.inst,vol:event.vol});}
 const instruments=instrumentKeys.map(({note,channel})=>({name:(note.source+' '+(note.percussion?'Percussion':'Program '+note.program)).slice(0,80),volEnv:[15],dutyEnv:[channel===1?1:2],arpEnv:[0],pitchEnv:[0],loopVol:0,loopArp:0}));
 return {format:parsed.format,tempo:parsed.tempo,speed:6,rows,patterns,instruments,orderList:patterns.map((_,index)=>[index,index,index,index,index]),warnings:[...(parsed.warnings||[])],noteCount:quantized.length};
}
function apply(parsed){
 const imported=materialize(parsed,S.audRows),patternOffset=S.patterns.length,instrumentOffset=S.instruments.length;
 if(patternOffset+imported.patterns.length>256)fail('existing and imported patterns exceed 256');if(instrumentOffset+imported.instruments.length>255)fail('existing and imported instruments exceed 255');
 for(const pattern of imported.patterns)for(const row of pattern.rows)for(const cell of row)if(cell.inst>=0)cell.inst+=instrumentOffset;
 const orders=imported.orderList.map(row=>row.map(index=>index+patternOffset));snapshot();S.patterns.push(...imported.patterns);S.instruments.push(...imported.instruments);S.orderList=orders;S.tempo=imported.tempo;S.speed=imported.speed;notify('audioImport');render();Forge.services.AudioUI?.refresh();return {...imported,orderList:orders,patternOffset,instrumentOffset};
}
async function fromFile(input,kind){
 const file=input?.files?.[0],status=document.getElementById('audImportStatus180');if(!file)return;try{const parsed=kind==='midi'?parseMidi(new Uint8Array(await file.arrayBuffer())):parseMusicXml(await file.text());if(!confirm('Import '+parsed.notes.length+' notes from '+file.name+' into new tracker patterns? Existing SFX patterns are preserved.'))return;const result=apply(parsed),message='Imported '+result.noteCount+' notes into '+result.patterns.length+' pattern'+(result.patterns.length===1?'':'s');showToast(message);if(status){status.textContent=result.warnings.length?message+'. '+result.warnings.join(' '):message;status.style.color=result.warnings.length?'var(--ylw)':'var(--grn)';}}catch(error){if(status){status.textContent=error.message;status.style.color='var(--red)';}reportError(error);}finally{input.value='';}
}
window.audio18_importMidi=input=>fromFile(input,'midi');window.audio18_importMusicXml=input=>fromFile(input,'musicxml');
services.AudioImport=Object.freeze({parseMidi,parseMusicXml,materialize,apply});
})();
