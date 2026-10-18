#!/usr/bin/env node
/* Candidate-bundle parser/conversion acceptance and refusal cases. The separate
 * UMD case checks packaging only; it never repairs the bundled application. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),{loadForge}=require('./harness.cjs');
const root=path.resolve(__dirname,'..');
const html=path.resolve(process.argv[2]||path.join(root,JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'))).output));
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex'),copy=value=>JSON.parse(JSON.stringify(value));
const text=fs.readFileSync(path.join(__dirname,'fixtures/famistudio-text/edge-score.txt'),'utf8');
let assertions=0,h,api;
const tests=[],test=(name,fn)=>tests.push({name,fn});
const equal=(a,b)=>{assert.deepEqual(copy(a),copy(b));assertions++;};
const ok=(v,msg)=>{assert.ok(v,msg);assertions++;};
const refuse=(input,pattern=/FamiStudio import:/,options)=>{assert.throws(()=>api.preview(input,options),pattern);assertions++;};
const cell=(result,row,ch=0)=>result.patterns[Math.floor(row/result.rows)].rows[row%result.rows][ch];
test('Actual candidate HTML initializes and registers the parser and canonical compiler',()=>{
 h=loadForge(html);api=h.context.Forge.services.FamiStudioText;
 equal(h.errors,[]);ok(api&&typeof api.preview==='function','Candidate HTML is missing FamiStudioText');
 ok(api===h.context.FamiStudioText,'Candidate service and global parser must be the same API');
 ok(typeof h.context.Forge.services.AudioCompiler.plan==='function','Candidate is missing AudioCompiler');
});
test('Selected song timing, repeated patterns, interruption cuts, envelopes, padding, independent previews and quoted metadata',()=>{
const result=api.preview(text,{rows:16});
equal(api.inspect(text).songs,[{index:0,name:'Repeats and interruptions'},{index:1,name:'Second song'}]);
equal([result.tempo,result.speed,result.durationRows,result.patterns.length,result.noteCount],[150,1,60,4,7]);
equal([0,6,12,24,36,42,48].map(r=>cell(result,r).note),[57,60,62,64,57,60,62]);
equal([9,14,30,45,50,60].map(r=>cell(result,r).note),[-2,-2,-2,-2,-2,-2]);
// The cut at18 for the old A4 must not survive an interruption at6.
equal(cell(result,18).note,-1);equal(cell(result,54).note,-1);
equal(cell(result,30).vol,12);equal(cell(result,36).vol,12);
equal(result.instruments[0],{name:'Held tail',volEnv:[15,10,5],dutyEnv:[2],arpEnv:[0],pitchEnv:[0],loopVol:2,loopArp:0});
equal(result.orderList,[[0,0,0,0,0],[1,1,1,1,1],[2,2,2,2,2],[3,3,3,3,3]]);
for(let ch=1;ch<4;ch++)equal(cell(result,0,ch),{note:-2,inst:-1,vol:15,fx:0,fxp:0});
for(const pattern of result.patterns)for(const row of pattern.rows)equal(row[4],{note:-1,inst:-1,vol:-1,fx:0,fxp:0});
ok(result.warnings.some(w=>w.includes('4 silent padding')));ok(result.warnings.some(w=>w.includes('Only selected song')));
const second=api.preview(text,{songIndex:1,rows:16});equal([second.noteCount,second.durationRows,cell(second,0).note],[1,16,42]);ok(second.warnings.some(w=>w.includes('no loop')));
// Fresh independent data on each preview; parser does not retain mutable state.
result.patterns[0].rows[0][0].note=1;result.instruments[0].volEnv[0]=0;
equal(cell(api.preview(text,{rows:16}),0).note,57);equal(api.preview(text).instruments[0].volEnv[0],15);
equal(api.inspect('\uFEFF'+text.replace(/\n/g,'\r\n')).version,'4.5.3');
const quoted=text.replaceAll('Held tail','Held ""quoted"" tail');equal(api.preview(quoted).instruments[0].name,'Held "quoted" tail');
const looped=text.replace('Length="3" Values="15,10,5"','Length="3" Loop="1" Values="15,10,5"');equal(api.preview(looped).instruments[0].loopVol,1);
const whitespace=text.replaceAll('\n','\n  ').replaceAll(' =','=').replaceAll('Version=','Version = ');equal(api.preview(whitespace).noteCount,7);
});
test('Malformed exports, unsupported project versions and ambiguous attributes are refused',()=>{
refuse('');refuse('Project Version="4.5.3" TempoMode="FamiStudio"');refuse('Note Time="0"');
refuse(text.replace('Version="4.5.3"','Version="4.4.4"'),/version is 4\.5/);
refuse(text.replace('TempoMode="FamiStudio"','TempoMode="Other"'),/unknown TempoMode/);
refuse(text.replace('TempoMode="FamiStudio"','TempoMode="FamiStudio" PAL="True"'),/PAL/);
refuse(text.replace('TempoMode="FamiStudio"','TempoMode="FamiStudio" Tuning="432"'),/A440/);
refuse(text.replace('TempoMode="FamiStudio"','TempoMode="FamiStudio" Expansions="VRC6"'),/expansion/);
refuse(text.replace('TempoMode="FamiStudio"','TempoMode="FamiStudio" Nonsense="True"'),/unsupported Project attribute/);
refuse(text.replace('Version="4.5.3"','Version="4.5.3" Version="4.5.3"'),/duplicate attribute/);
refuse(text.replace('Name="Unit edge cases"','Name="Unterminated'),/unterminated/);
refuse(text.replace('Name="Unit edge cases"','Name=Unquoted'),/malformed/);
refuse(text.replace('Version="4.5.3"','Version="4.5.3"junk="x"'),/separated/);
});
test('Unsupported loops, variable groove, invalid tempo settings and oversized arrangements are refused',()=>{
refuse(text.replace('LoopPoint="0"','LoopPoint="1"'),/loop points/);
refuse(text.replace('Groove="6"','Groove="6-7"'),/constant Groove/);
refuse(text.replace('Groove="6"','Groove="7"'),/constant Groove/);
refuse(text.replace('GroovePaddingMode="Middle"','GroovePaddingMode="Elsewhere"'),/GroovePaddingMode/);
refuse(text.replace('NoteLength="6"','NoteLength="0"'),/NoteLength/);
refuse(text.replace('Length="3" LoopPoint="0"','Length="256" LoopPoint="0"').replace('PatternLength="4"','PatternLength="4096"'),/255 orders/);
});
test('Pattern instances, hidden notes and event identity are validated',()=>{
refuse(text.replace('Pattern Name="Long"','Pattern Name="Long"\n  Pattern Name="Long"'),/duplicate pattern/);
refuse(text.replace('Time="1" Pattern="Short"','Time="0" Pattern="Short"'),/duplicate pattern instance/);
refuse(text.replace('Time="1" Pattern="Short"','Time="1" Pattern="Missing"'),/unknown pattern/);
refuse(text.replace('Time="1" Pattern="Short"','Time="3" Pattern="Short"'),/pattern instance time/);
refuse(text.replace('Time="6" Value="C5"','Time="0" Value="C5"'),/duplicate note/);
refuse(text.replace('Time="12" Value="D5"','Time="24" Value="D5"'),/beyond its pattern/);
refuse(text.replace('Value="F#3" Duration="16"','Value="F#3" Duration="17"'),/beyond the song end/,{songIndex:1});
});
test('Invalid musical notes, unsupported effects and broken instrument references are refused',()=>{
refuse(text.replace('Value="A4"','Value="B#4"'),/invalid note/);
refuse(text.replace('Value="A4"','Value="C8"'),/unsupported note/);
refuse(text.replace('Value="A4"','Value="Release"'),/unsupported note/);
refuse(text.replace('Duration="18"','Duration="0"'),/Duration/);
refuse(text.replace('Duration="18"','Duration="1.5"'),/Duration/);
refuse(text.replace('Duration="18"','Duration="18" Attack="False"'),/legato/);
refuse(text.replace('Duration="18"','Duration="18" Attack="no"'),/True or False/);
for(const key of ['Release','Arpeggio','SlideTarget','VolumeSlideTarget','VibratoSpeed','VibratoDepth','Speed','FinePitch','DutyCycle','NoteDelay','CutDelay','DeltaCounter','PhaseReset','EnvelopePeriod','FdsModSpeed','FdsModDepth'])refuse(text.replace('Duration="18"','Duration="18" '+key+'="1"'),new RegExp('unsupported Note attribute '+key));
refuse(text.replace('Instrument="Held tail"','Instrument="Missing"'),/unknown instrument/);
refuse(text.replace('Duration="18" Instrument="Held tail"','Duration="18"'),/first musical note/);
refuse(text.replace('Value="Stop"','Value="Stop" Duration="1"'),/non-musical/);
refuse(text.replace('Time="6" Volume="12"','Time="6"'),/empty Note/);
});
test('Duplicate channels, DPCM and expansion content are refused',()=>{
refuse(text.replace('Type="Square2"','Type="Square1"'),/duplicate channel/);
refuse(text.replace('Type="Square2"','Type="VRC6Square1"'),/unsupported channel/);
refuse(text.replace('Channel Type="DPCM"','Channel Type="DPCM"\n Pattern Name="Bad"\n Note Time="0" Value="C4" Duration="1"'),/DPCM/);
refuse(text.replace('Instrument Name="Held tail"','Instrument Name="Held tail" Expansion="VRC6"'),/Expansion/);
refuse(text.replace('Instrument Name="Held tail"','DPCMSample Name="Sample" Data="00"\nInstrument Name="Held tail"'),/unsupported object DPCMSample/);
});
test('Envelope shape, values, loops, modulation and volume scaling are validated',()=>{
refuse(text.replace('Values="15,10,5"','Values="15,10"'),/Length differs/);
refuse(text.replace('Values="15,10,5"','Values="15,10,16"'),/Volume value/);
refuse(text.replace('Values="15,10,5"','Loop="3" Values="15,10,5"'),/envelope loop/);
refuse(text.replace('Values="15,10,5"','Release="1" Values="15,10,5"'),/Release/);
refuse(text.replace('Values="15,10,5"','Relative="True" Values="15,10,5"'),/relative envelopes/);
refuse(text.replace('Type="DutyCycle" Length="1" Values="2"','Type="DutyCycle" Length="2" Values="1,2"'),/changing duty/);
refuse(text.replace('Type="DutyCycle" Length="1" Values="2"','Type="Arpeggio" Length="1" Values="2"'),/Arpeggio envelopes/);
refuse(text.replace('Type="DutyCycle" Length="1" Values="2"','Type="Pitch" Length="1" Values="2"'),/Pitch envelopes/);
refuse(text.replace('Type="DutyCycle" Length="1" Values="2"','Type="FDSWaveform" Length="1" Values="2"'),/unsupported envelope/);
refuse(text.replace('Volume="12"','Volume="1"').replace('Values="15,10,5"','Values="15,10,1"'),/minimum-volume behavior/);
});
test('Options, control characters and file-size limits are enforced',()=>{
refuse(text,undefined,{rows:15});refuse(text,undefined,{rows:129});refuse(text,undefined,{songIndex:-1});refuse(text,undefined,{songIndex:2});refuse(text+'\0');refuse('x'.repeat(4*1024*1024+1),/4 MiB/);
});
test('Fixed FamiTracker tempo, dynamic-envelope timing and noise-mode boundaries are enforced',()=>{
// FamiTracker tempo uses its declared rows/speed. Non-150 tempo with a dynamic
// envelope is refused because Forge envelopes advance on tempo-scaled ticks.
const ft=fs.readFileSync(path.join(__dirname,'fixtures/famistudio-export/forge-four-channel-famitracker-tempo.txt'),'utf8');
const otherTempo=ft.replace('FamiTrackerTempo="150"','FamiTrackerTempo="120"');
equal([api.preview(otherTempo).tempo,api.preview(otherTempo).speed],[120,6]);
refuse(otherTempo.replace('Length="1" Loop="0" Values="12"','Length="2" Values="12,6"'),/changing volume envelopes require tempo 150/);
const noiseShort=ft.replace('Instrument Name="Noise tick" Color="42a5f5"','Instrument Name="Noise tick" Color="42a5f5"\n Envelope Type="DutyCycle" Length="1" Values="1"');
refuse(noiseShort,/short-mode noise/);
ok(api.preview(text).warnings.some(w=>w.includes('One finite pass')));
});
test('Standalone UMD registers without editor globals and agrees with the bundled parser',()=>{
const context={window:{Forge:{services:{sentinel:1}}}};vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(root,'src/audio/famistudio-text.js'),'utf8'),context);equal(context.window.Forge.services.sentinel,1);ok(context.window.Forge.services.FamiStudioText===context.window.FamiStudioText);equal(context.window.FamiStudioText.preview(text).noteCount,7);
const pure=require('../src/audio/famistudio-text.js');equal(pure.preview(text),api.preview(text));
});
test('Bundled canonical compiler accepts the bundled parser output without normalization loss',()=>{
const converted=api.preview(text,{rows:16});
const plan=h.context.Forge.services.AudioCompiler.plan({...converted,audRows:converted.rows,audioRuntime:{enabled:true,musicEnabled:true},sfx:[]});
equal(plan.orders.length,4);equal(plan.instruments[0].loopVol,2);equal(Array.from(plan.instruments[0].volume),[15,10,5]);
});

(async()=>{
 const results=[];
 for(const {name,fn} of tests){
  const before=assertions;
  try{await fn();results.push({name,passed:true,assertions:assertions-before});console.log('PASS '+name);}
  catch(error){results.push({name,passed:false,assertions:assertions-before,error:String(error.stack||error)});console.error('FAIL '+name+'\n'+String(error.stack||error).slice(0,6000));}
 }
 const passed=results.filter(item=>item.passed).length;
 const report={suite:'famistudio-text',htmlSha256:sha(fs.readFileSync(html)),scope:'Actual candidate bundled FamiStudio text parser and canonical AudioCompiler: musical values, finite-pass timing, cuts, repeated/custom patterns, envelopes, warnings, strict refusal boundaries and separate pure-module packaging parity. No browser, audible or hardware equivalence acceptance.',passed,total:results.length,failed:results.length-passed,assertions,results};
 const output=process.env.FORGE_TEST_REPORT||process.argv[3];
 if(output){fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');}
 console.log(passed+'/'+results.length+' cases passed; '+assertions+' assertions');if(report.failed)process.exitCode=1;
})();
