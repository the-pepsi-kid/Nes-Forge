/* NES Forge score interchange v1.
 * A bounded, one-pass transcription of the canonical tracker order, not an
 * alternate project format or a claim that MIDI instruments reproduce an APU.
 */
(()=>{
'use strict';
const services=Forge.services,channels=['Pulse 1','Pulse 2','Triangle','Noise'],partIds=['NESFORGE_PULSE1','NESFORGE_PULSE2','NESFORGE_TRIANGLE','NESFORGE_NOISE'];
const fail=message=>{throw Error('Audio export: '+message);};
const integer=(value,min,max,label)=>{if(!Number.isInteger(value)||value<min||value>max)fail(label+' must be '+min+'–'+max);return value;};
const escapeXml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function plan(source){
 if(!source||typeof source!=='object')fail('a tracker project is required');
 const tempo=integer(source.tempo,30,300,'tempo'),speed=integer(source.speed,1,15,'speed'),rows=integer(source.audRows,16,128,'row count');
 if(!Array.isArray(source.orderList)||!source.orderList.length||source.orderList.length>255)fail('music requires 1–255 order entries');
 if(!Array.isArray(source.patterns)||!Array.isArray(source.instruments))fail('patterns and instruments are required');
 const durationRows=source.orderList.length*rows,notes=[],used=new Set(),warnings=[
  'Exports one pass through the music order. Pattern sharing and looping are flattened; use Save Project As for a complete backup.',
  'NES duty, instrument envelopes and timbre are not embedded. Other players use their own instruments; Forge reimport creates plain instruments.'
 ];
 if(source.sfx?.length)warnings.push(source.sfx.length+' named SFX definition(s) and their game triggers are omitted. Only the music order is exported.');
 let hasNoise=false;
 for(let channel=0;channel<5;channel++){
  let active=null,volume=15,instrument=0;
  const close=end=>{if(active){notes.push({...active,endRow:end});active=null;}};
  for(let order=0;order<source.orderList.length;order++){
   const entry=source.orderList[order];if(!Array.isArray(entry)||entry.length<4)fail('order '+order+' needs four channel references');
   const pi=entry[channel]??0;integer(pi,0,255,'order '+order+' pattern');const pattern=source.patterns[pi];if(!pattern||!Array.isArray(pattern.rows)||pattern.rows.length<rows)fail('order '+order+' references missing or short pattern '+pi);
   for(let row=0;row<rows;row++){
    const cell=pattern.rows[row]?.[channel]||{},at=order*rows+row,note=integer(cell.note??-1,-2,95,'note at order '+order+', row '+row),vol=integer(cell.vol??-1,-1,15,'volume'),inst=integer(cell.inst??-1,-1,255,'instrument');
    if((cell.fx??0)!==0||(cell.fxp??0)!==0)fail('tracker effects are unsupported at order '+order+', row '+row+', '+(channels[channel]||'DPCM'));
    if(channel===4){if(note!==-1||vol!==-1||inst!==-1)fail('DPCM data has no supported score export');continue;}
    if(vol>=0&&vol!==volume&&note===-1&&active)fail('mid-note volume changes are unsupported at order '+order+', row '+row+', '+channels[channel]);
    if(vol>=0)volume=vol;
    if(note===-2){close(at);continue;}
    if(note<0)continue;
    if(!volume)fail('zero-volume notes cannot be represented as score note-ons at order '+order+', row '+row);
    if(inst>=0)instrument=inst;
    if(!source.instruments[instrument])fail('a note references missing instrument '+instrument);
    used.add(instrument);close(at);active={channel,note,volume,velocity:Math.max(1,Math.round(volume*127/15)),startRow:at};if(channel===3)hasNoise=true;
   }
  }
  close(durationRows);
 }
 if(!notes.length)fail('the music order contains no playable notes');
 for(const index of used){const inst=source.instruments[index];if((inst.arpEnv||[]).some(n=>n!==0)||(inst.pitchEnv||[]).some(n=>n!==0))warnings.push('Instrument '+index+' arpeggio/pitch envelope is omitted: only its base tracker pitches are exported.');}
 if(hasNoise)warnings.push('Noise is represented as percussion notes. A MIDI/MusicXML player does not reproduce NES noise periods; the Forge profile retains the original noise note values.');
 return {profile:'NESForgeScore/1',title:String(source.projectName||'NES Forge Score').slice(0,120),tempo,speed,rows,durationRows,notes,warnings};
}
const profileText=score=>'NESFORGE-SCORE:1;tempo='+score.tempo+';speed='+score.speed+';durationRows='+score.durationRows;
function vlq(value){integer(value,0,0x0fffffff,'MIDI delta');const bytes=[value&127];while((value=Math.floor(value/128)))bytes.unshift((value&127)|128);return bytes;}
const textBytes=value=>Array.from(new TextEncoder().encode(value));
const be32=value=>[(value>>>24)&255,(value>>>16)&255,(value>>>8)&255,value&255];
const chunk=(name,bytes)=>[...textBytes(name),...be32(bytes.length),...bytes];
const meta=(type,text)=>{const bytes=typeof text==='string'?textBytes(text):text;return [0xff,type,...vlq(bytes.length),...bytes];};
function toMidi(source){
 const score=plan(source),micros=Math.round(60000000/score.tempo),end=score.durationRows*score.speed*4;
 const conductor=[0,...meta(0x03,score.title),0,...meta(0x01,profileText(score)),0,...meta(0x51,[(micros>>16)&255,(micros>>8)&255,micros&255]),...vlq(end),...meta(0x2f,[])];
 const tracks=[chunk('MTrk',conductor)];
 for(let channel=0;channel<4;channel++){
  const midiChannel=channel===3?9:channel,events=[];
  for(const note of score.notes.filter(n=>n.channel===channel)){events.push({tick:note.startRow*score.speed*4,rank:1,data:[0x90|midiChannel,note.note+12,note.velocity]},{tick:note.endRow*score.speed*4,rank:0,data:[0x80|midiChannel,note.note+12,0]});}
  events.sort((a,b)=>a.tick-b.tick||a.rank-b.rank);const bytes=[0,...meta(0x03,'NES Forge '+channels[channel]),0,0xc0|midiChannel,channel===3?0:80];let tick=0;
  for(const event of events){bytes.push(...vlq(event.tick-tick),...event.data);tick=event.tick;}
  bytes.push(...vlq(end-tick),...meta(0x2f,[]));tracks.push(chunk('MTrk',bytes));
 }
 const bytes=Uint8Array.from([...chunk('MThd',[0,1,0,5,0,96]),...tracks.flat()]);return {bytes,mime:'audio/midi',extension:'.mid',warnings:score.warnings,score};
}
function pitch(note){const names=['C','C','D','D','E','F','F','G','G','A','A','B'],alter=[0,1,0,1,0,0,1,0,1,0,1,0],semitone=note%12;return '<pitch><step>'+names[semitone]+'</step>'+(alter[semitone]?'<alter>1</alter>':'')+'<octave>'+Math.floor(note/12)+'</octave></pitch>';}
function toMusicXml(source){
 const score=plan(source),out=['<?xml version="1.0" encoding="UTF-8"?>','<score-partwise version="4.0">','<work><work-title>'+escapeXml(score.title)+'</work-title></work>','<identification><creator type="composer">NES Forge</creator><miscellaneous><miscellaneous-field name="NESForgeScore">'+profileText(score)+'</miscellaneous-field></miscellaneous></identification>','<part-list>'];
 for(let channel=0;channel<4;channel++){const id=partIds[channel];out.push('<score-part id="'+id+'"><part-name>'+channels[channel]+'</part-name><score-instrument id="'+id+'_I"><instrument-name>'+channels[channel]+'</instrument-name></score-instrument><midi-instrument id="'+id+'_I"><midi-channel>'+(channel===3?10:channel+1)+'</midi-channel><midi-program>'+(channel===3?1:81)+'</midi-program></midi-instrument></score-part>');}
 out.push('</part-list>');
 for(let channel=0;channel<4;channel++){
  out.push('<part id="'+partIds[channel]+'"><measure number="1" implicit="yes"><attributes><divisions>24</divisions></attributes><direction><direction-type><words>One music order pass</words></direction-type><sound tempo="'+score.tempo+'"/></direction>');let at=0;
  const rest=rows=>{if(rows>0)out.push('<note><rest/><duration>'+rows*score.speed+'</duration></note>');};
  for(const note of score.notes.filter(n=>n.channel===channel)){rest(note.startRow-at);out.push('<note dynamics="'+(note.velocity/.9).toFixed(6)+'">'+(channel===3?'<unpitched><display-step>C</display-step><display-octave>4</display-octave></unpitched>':pitch(note.note))+'<duration>'+(note.endRow-note.startRow)*score.speed+'</duration><instrument id="'+partIds[channel]+'_I"/>'+(channel===3?'<notations><other-notation type="single">NESForgeNoise='+note.note+'</other-notation></notations>':'')+'</note>');at=note.endRow;}
  rest(score.durationRows-at);out.push('</measure></part>');
 }
 out.push('</score-partwise>');const text=out.join('\n')+'\n';if(new TextEncoder().encode(text).length>4*1024*1024)fail('MusicXML exceeds the 4 MB interchange limit; shorten the music order or export MIDI');return {text,mime:'application/vnd.recordare.musicxml+xml',extension:'.musicxml',warnings:score.warnings,score};
}
async function save(kind){
 const status=document.getElementById('audExportStatus200');
 try{
  const result=kind==='midi'?toMidi(S):kind==='musicxml'?toMusicXml(S):fail('unknown score format');
  if(!confirm('Export '+(kind==='midi'?'MIDI':'MusicXML')+'?\n\n'+result.warnings.join('\n\n'))){if(status)status.textContent='Score export cancelled; the project is unchanged.';return false;}
  const outcome=await download(result.bytes||result.text,(S.projectName||'score').replace(/[^\w-]/g,'_')+result.extension,result.mime);
  if(!outcome||!['saved','download-requested'].includes(outcome.status)){if(status)status.textContent=outcome?.status==='cancelled'?'Score save cancelled; no download requested.':'Score save did not complete; the project is unchanged.';return false;}
  if(status){status.textContent='Exported '+(kind==='midi'?'MIDI':'MusicXML')+'. '+result.warnings.join(' ');status.style.color='var(--ylw)';}return true;
 }catch(error){if(status){status.textContent=error.message;status.style.color='var(--red)';}reportError(error);return false;}
}
// Additive controls beside the existing import actions; no tracker input binding
// or canonical state is replaced.
const panel=document.getElementById('sideAudio');if(panel){
 const box=document.createElement('fieldset');box.id='audExport200';box.style.cssText='border:1px solid var(--bdr);padding:5px;margin:4px 0';
 const legend=document.createElement('legend');legend.textContent='Export Score Data';box.appendChild(legend);
 const help=document.createElement('p');help.textContent='Export one music order pass for a score editor. Save Project As keeps instruments, SFX and the complete project.';help.style.cssText='font-size:9px;color:var(--dim)';box.appendChild(help);
 for(const [kind,label]of [['midi','Export MIDI'],['musicxml','Export MusicXML']]){const button=document.createElement('button');button.type='button';button.id=kind==='midi'?'audExportMidi200':'audExportMusicXml200';button.textContent=label;button.style.margin='2px';button.addEventListener('click',()=>save(kind));box.appendChild(button);}
 const status=document.createElement('p');status.id='audExportStatus200';status.setAttribute('role','status');status.style.cssText='font-size:9px;margin:4px 0';box.appendChild(status);panel.insertBefore(box,document.getElementById('audImportStatus180').nextSibling||null);
}
window.audio20_exportScore=save;services.AudioExport=Object.freeze({plan,toMidi,toMusicXml,save});
})();
