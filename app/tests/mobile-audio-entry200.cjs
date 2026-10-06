#!/usr/bin/env node
'use strict';
// Complete standalone app and its real registered handlers. The test-local DOM
// adapter records document events and implements editable ancestry/focus; it
// does not simulate a browser keyboard, layout, trusted touch or audible sound.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),Module=require('node:module');
const harnessPath=require.resolve('./harness.cjs'),source=fs.readFileSync(harnessPath,'utf8'),stub='addEventListener: noop, removeEventListener: noop, dispatchEvent: noop,';
assert.equal(source.split(stub).length,2,'Expected one inherited document event stub');
const eventHarness=new Module(harnessPath,module);eventHarness.filename=harnessPath;eventHarness.paths=module.paths;
eventHarness._compile(source.replace(stub,'_testListeners: [], addEventListener(type, fn, options) { this._testListeners.push({type,fn,capture:options===true||!!options?.capture}); }, removeEventListener: noop, dispatchEvent: noop,'),harnessPath);
const root=path.resolve(__dirname,'..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'),'utf8'));
const html=path.resolve(process.argv[2]||path.join(root,manifest.output)),tests=[],test=(name,fn)=>tests.push({name,fn}),sha=data=>crypto.createHash('sha256').update(data).digest('hex');
const blank=()=>({note:-1,inst:-1,vol:-1,fx:0,fxp:0}),clone=value=>JSON.parse(JSON.stringify(value));
class AudioSink{
 constructor(){this.state='running';this.sampleRate=48000;this.currentTime=0;this.destination={};}
 createGain(){return {gain:{value:1,setValueAtTime(){}},connect(){}};}
 createOscillator(){return {frequency:{value:0,setValueAtTime(){}},connect(){},start(){},stop(){},setPeriodicWave(){}};}
 createBuffer(ch,n,rate){return {duration:n/rate,getChannelData:()=>new Float32Array(n)};}
 createBufferSource(){return {playbackRate:{value:1},connect(){},disconnect(){},start(){},stop(){}};}
 createPeriodicWave(){return {};}
 resume(){this.state='running';return Promise.resolve();}
}
function fresh(){
 const h=eventHarness.exports.loadForge(html,{environment:{AudioContext:AudioSink,innerWidth:390,navigator:{userAgent:'Mobile audio regression DOM adapter',platform:'test',clipboard:{writeText:async()=>{}}}}});
 h.context.document.activeElement=h.context.document.body;
 // The inherited static parser records IDs but assigns all nodes to body. Use
 // the actual fieldset markup to restore the ancestry needed for bubbling.
 for(const match of h.html.matchAll(/<fieldset\b[^>]*\bid="(audCellEditor|audEnvelopeEditor)"[^>]*>([\s\S]*?)<\/fieldset>/g))for(const id of match[2].matchAll(/\bid="([^"]+)"/g))h.get(match[1]).appendChild(h.get(id[1]));
 h.context.entryFixture={instruments:Array.from({length:3},(_,i)=>({name:'Instrument '+i,volEnv:[15,10,0],arpEnv:[0,4,7],pitchEnv:[0],dutyEnv:[i],loopVol:-1,loopArp:-1})),patterns:Array.from({length:4},()=>({rows:Array.from({length:16},()=>Array.from({length:5},blank))})),orderList:[[0,1,2,3,0],[3,2,1,0,3]]};
 h.run('S.instruments=entryFixture.instruments;S.patterns=entryFixture.patterns;S.orderList=entryFixture.orderList;S.audRows=16;aud_currentOrder=0;aud_currentRow=0;aud_selectedChannel=0;aud_selectedInst=1;S.tab="audio";aud_updateSidebar();render();undoStack.length=0;redoStack.length=0;undoBytes=0;Forge15.dirty=false');
 assert.deepEqual(h.errors,[]);return h;
}
function descendants(node){return [node,...(node.children||[]).flatMap(descendants)];}
function control(h,id){
 // get() creates phantom elements; only accept a node authored in static HTML
 // or found in actual dynamically attached Audio/toolbar roots.
 const staticElement=new RegExp('\\bid="'+id+'"').test(h.html);
 const actual=[h.context.document.body,h.context.document.head,h.get('sideAudio'),h.get('audioToolbar')].flatMap(descendants).find(node=>node.id===id);
 assert.ok(actual||staticElement,id+' must be an actual Audio Studio control');
 const el=actual||h.get(id);el.closest=selector=>(selector==='button'&&el.tagName==='BUTTON')||(/input|textarea|select|contenteditable/.test(selector)&&(/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)||el.isContentEditable))?el:null;
 el.focus=()=>{h.context.document.activeElement=el;};return el;
}
function dispatch(el,type,properties={}){const e={type,target:el,preventDefault(){this.defaultPrevented=true;},stopPropagation(){this.stopped=true;},stopImmediatePropagation(){this.stopped=true;this.immediate=true;},...properties};el.dispatchEvent(e);return e;}
function key(h,target,key,properties={}){
 const event={type:'keydown',target,key,code:({ArrowUp:'ArrowUp',ArrowDown:'ArrowDown',ArrowLeft:'ArrowLeft',ArrowRight:'ArrowRight',Enter:'Enter',' ':'Space'})[key]||('Key'+key.toUpperCase()),preventDefault(){this.defaultPrevented=true;},stopPropagation(){this.stopped=true;},stopImmediatePropagation(){this.stopped=true;this.immediate=true;},...properties};
 const listeners=h.context.document._testListeners;
 for(const item of listeners.filter(item=>item.type==='keydown'&&item.capture)){item.fn(event);if(event.stopped)return event;}
 for(let el=target;el;el=el.parentNode){el.dispatchEvent?.(event);if(event.stopped)return event;}
 for(const item of listeners.filter(item=>item.type==='keydown'&&!item.capture)){item.fn(event);if(event.immediate)break;}
 return event;
}
function cell(h,order=0,row=0,ch=0){return h.json('S.patterns[S.orderList['+order+']['+ch+']].rows['+row+']['+ch+']');}
function capture(h){return h.json('({project:Forge.services.ProjectStore.capture(),undo:undoStack,redo:redoStack,dirty:Forge15.dirty,playing:aud_playing,keys:emuKeys})');}
function action(h,id,type='click'){
 const el=control(h,id);assert.notEqual(el.disabled,true,id+' must be enabled');
 if(typeof el['on'+type]==='function')return el['on'+type]({target:el,currentTarget:el,preventDefault(){},stopPropagation(){}});
 const tag=[...h.html.matchAll(/<[a-z][\w-]*\b[^>]*>/gi)].map(match=>match[0]).find(tag=>tag.includes('id="'+id+'"'));
 const handler=tag?.match(new RegExp('\\bon'+type+'="([^"]+)"'))?.[1];
 if(handler){h.context.entryEvent={target:el,currentTarget:el,preventDefault(){},stopPropagation(){}};return h.run('(()=>{const event=entryEvent;'+handler+'})()');}
 assert.ok(el.listeners.get(type)?.length,id+' needs its actual registered '+type+' handler');return dispatch(el,type);
}
function fields(h,values){for(const [id,value]of Object.entries(values))control(h,id).value=String(value);}
function draft(h,values={}){fields(h,{audCellNote:'0',audCellOctave:'4',audCellInstrument:'1',audCellVolume:'',...values});}
function address(h,order,row,ch){fields(h,{audCellOrder:order,audCellRow:row,audCellChannel:ch});action(h,'audCellRow','change');}
function audioState(h){return h.json('({patterns:S.patterns,instruments:S.instruments,orderList:S.orderList,rows:S.audRows})');}

test('Desktop tracker piano keys, navigation, cut and clear still use the selected instrument',()=>{
 const h=fresh(),canvas=h.run('cv');
 assert.equal(key(h,canvas,'z').defaultPrevented,true);assert.deepEqual(cell(h),{note:36,inst:1,vol:-1,fx:0,fxp:0});
 key(h,canvas,'ArrowDown');key(h,canvas,'ArrowRight');key(h,canvas,'q');assert.deepEqual(cell(h,0,1,1),{note:48,inst:1,vol:-1,fx:0,fxp:0});
 key(h,canvas,'Backspace');assert.deepEqual(cell(h,0,1,1),{note:-2,inst:-1,vol:-1,fx:0,fxp:0});key(h,canvas,'Delete');assert.deepEqual(cell(h,0,1,1),blank());assert.deepEqual(h.errors,[]);
});
test('Desktop repeated keys and unsupported DPCM do not add unintended note edits',()=>{
 const h=fresh(),canvas=h.run('cv'),before=capture(h);key(h,canvas,'z',{repeat:true});assert.deepEqual(capture(h),before);
 h.run('aud_selectedChannel=4');key(h,canvas,'z');assert.deepEqual(capture(h),before);assert.match(h.get('toast').textContent,/DPCM|not implemented/i);
});
test('Existing instrument name and numeric fields keep native typing without tracker edits',()=>{
 const h=fresh(),before=capture(h);
 for(const id of ['instName','audTempo','audSpeed']){const field=control(h,id);field.focus();for(const value of ['z','q','2',' ','ArrowDown','Backspace','Delete','Enter']){const event=key(h,field,value);assert.notEqual(event.defaultPrevented,true,id+' keeps '+value+' native');}}
 assert.deepEqual(capture(h),before);assert.deepEqual(h.errors,[]);
});

test('Audio Studio exposes native note, octave, instrument and volume controls without a physical keyboard',()=>{
 const h=fresh();for(const id of ['audCellNote','audCellOctave','audCellInstrument','audCellChannel'])assert.equal(control(h,id).tagName,'SELECT');
 for(const id of ['audCellOrder','audCellRow','audCellVolume'])assert.equal(control(h,id).tagName,'INPUT');
 for(const id of ['audCellApply','audCellClear','audCellCut'])assert.equal(control(h,id).tagName,'BUTTON');
 draft(h,{audCellNote:'9',audCellOctave:'4',audCellVolume:'12'});action(h,'audCellApply');assert.deepEqual(cell(h),{note:57,inst:1,vol:12,fx:0,fxp:0});assert.equal(h.run('undoStack.length'),1);assert.equal(h.run('Forge15.dirty'),true);assert.deepEqual(h.errors,[]);
});
test('Mobile note entry changes exactly the chosen order, channel and row while retaining existing effect data',()=>{
 const h=fresh();h.run('S.patterns[1].rows[7][2]={note:21,inst:0,vol:3,fx:18,fxp:52,retained:"imported"};render()');address(h,1,7,2);
 const before=audioState(h),runtime=h.json('({frame:emu.frameCount,pc:emu.PC,loaded:emu.loaded,running:emu.running})');draft(h,{audCellNote:'1',audCellOctave:'5',audCellInstrument:'2',audCellVolume:'9'});action(h,'audCellApply');
 const expected=clone(before);expected.patterns[1].rows[7][2]={note:61,inst:2,vol:9,fx:18,fxp:52,retained:'imported'};assert.deepEqual(audioState(h),expected);assert.deepEqual(h.json('({frame:emu.frameCount,pc:emu.PC,loaded:emu.loaded,running:emu.running})'),runtime);assert.equal(h.run('undoStack.length'),1);assert.deepEqual(h.errors,[]);
});
test('Mobile clear and cut preserve volume and effect fields and create one undoable edit each',()=>{
 const h=fresh();h.run('S.patterns[0].rows[0][0]={note:57,inst:2,vol:8,fx:17,fxp:34};render()');
 action(h,'audCellCut');assert.deepEqual(cell(h),{note:-2,inst:-1,vol:8,fx:17,fxp:34});assert.equal(h.run('undoStack.length'),1);
 action(h,'audCellClear');assert.deepEqual(cell(h),{note:-1,inst:-1,vol:8,fx:17,fxp:34});assert.equal(h.run('undoStack.length'),2);h.run('undo()');assert.equal(cell(h).note,-2);h.run('undo()');assert.equal(cell(h).note,57);assert.deepEqual(h.errors,[]);
});
test('Mobile entry accepts canonical note endpoints and blank inherited instrument and volume values',()=>{
 const h=fresh();draft(h,{audCellNote:'0',audCellOctave:'0',audCellInstrument:'-1',audCellVolume:''});action(h,'audCellApply');assert.deepEqual(cell(h),{note:0,inst:-1,vol:-1,fx:0,fxp:0});
 draft(h,{audCellNote:'11',audCellOctave:'7',audCellInstrument:'2',audCellVolume:'15'});action(h,'audCellApply');assert.deepEqual(cell(h),{note:95,inst:2,vol:15,fx:0,fxp:0});assert.deepEqual(h.errors,[]);
});
test('Malformed mobile cell fields are rejected atomically instead of coercing or partially saving',()=>{
 for(const values of [{audCellNote:'12'},{audCellOctave:'8'},{audCellOctave:'1.5'},{audCellInstrument:'3'},{audCellVolume:'16'},{audCellVolume:'1.5'},{audCellVolume:'n/a'}]){
  const h=fresh();draft(h,values);const before=capture(h);action(h,'audCellApply');assert.deepEqual(capture(h),before,JSON.stringify(values));assert.ok(control(h,'audCellStatus').textContent.length,'Validation gives feedback');
 }
});
test('Invalid order, row and channel addresses cannot write another cell or add history',()=>{
 for(const values of [{audCellOrder:'2'},{audCellRow:'16'},{audCellRow:'-1'},{audCellRow:'1.5'},{audCellChannel:'5'},{audCellRow:'1'}]){
  const h=fresh();h.run('S.patterns[0].rows[0][0]={note:57,inst:2,vol:9,fx:18,fxp:52};render()');draft(h);fields(h,values);
  // Invalid native change must leave a rejected visible draft; a valid draft
  // without its change event must also never write the old selected address.
  if(values.audCellRow!=='1')action(h,Object.keys(values)[0],'change');
  const before=capture(h);for(const id of ['audCellApply','audCellClear','audCellCut']){action(h,id);assert.deepEqual(capture(h),before,JSON.stringify(values)+' '+id);}
 }
});
test('Mobile entry retains the no-instrument and unsupported DPCM boundaries',()=>{
 const h=fresh();h.run('S.instruments=[];aud_selectedInst=-1;render()');draft(h,{audCellInstrument:'-1'});let before=capture(h);action(h,'audCellApply');assert.deepEqual(capture(h),before);assert.match(control(h,'audCellStatus').textContent,/instrument/i);
 const d=fresh();address(d,0,0,4);draft(d);before=capture(d);for(const id of ['audCellApply','audCellCut','audCellClear']){const el=control(d,id);if(!el.disabled)action(d,id);assert.deepEqual(capture(d),before);}assert.match(control(d,'audCellStatus').textContent,/DPCM|not implemented/i);
});
test('A mobile cell edit round-trips through undo, redo and the existing portable project format',()=>{
 const h=fresh(),before=audioState(h);draft(h,{audCellNote:'7',audCellOctave:'3',audCellInstrument:'2',audCellVolume:'11'});action(h,'audCellApply');const after=audioState(h);h.run('undo()');assert.deepEqual(audioState(h),before);h.run('redo()');assert.deepEqual(audioState(h),after);
 const saved=h.run('Forge.services.ProjectStore.serialize()'),other=fresh();other.context.entrySaved=saved;other.run('Forge.services.ProjectStore.load(entrySaved)');assert.deepEqual(audioState(other),after);assert.equal(other.run('Forge.release.schema'),12);assert.deepEqual(h.errors,[]);assert.deepEqual(other.errors,[]);
});
test('Ordinary Audio sidebar refreshes preserve an unfinished native draft without mutating the project',()=>{
 const h=fresh(),before=capture(h);draft(h,{audCellNote:'6',audCellOctave:'6',audCellInstrument:'2',audCellVolume:'7'});control(h,'audCellVolume').focus();h.run('aud_updateSidebar();renderAudio();aud_updateSidebar()');
 for(const [id,value]of Object.entries({audCellNote:'6',audCellOctave:'6',audCellInstrument:'2',audCellVolume:'7'}))assert.equal(String(control(h,id).value),value,id);assert.deepEqual(capture(h),before);
});
test('Changing selected cells loads the new values and cannot apply an old draft to the old address',()=>{
 const h=fresh();h.run('S.patterns[1].rows[3][1]={note:50,inst:2,vol:5,fx:0,fxp:0};render()');draft(h,{audCellNote:'11',audCellOctave:'7'});address(h,0,3,1);
 assert.equal(String(control(h,'audCellNote').value),'2');assert.equal(String(control(h,'audCellOctave').value),'4');assert.equal(String(control(h,'audCellInstrument').value),'2');assert.equal(String(control(h,'audCellVolume').value),'5');
 draft(h,{audCellNote:'4',audCellOctave:'4',audCellInstrument:'2',audCellVolume:'5'});action(h,'audCellApply');assert.deepEqual(cell(h),blank());assert.equal(cell(h,0,3,1).note,52);
});
test('Native mobile fields keep typing, editing shortcuts and arrows isolated from tracker and emulator actions',()=>{
 const h=fresh(),before=capture(h);for(const id of ['audCellRow','audCellVolume','audCellNote','audCellInstrument','audEnvValue']){
  const el=control(h,id);el.focus();for(const value of ['z','q','2',' ','ArrowDown','Backspace','Delete','Enter']){const event=key(h,el,value);assert.notEqual(event.defaultPrevented,true,id+' native '+value);}
  for(const value of ['z','s']){const event=key(h,el,value,{ctrlKey:true});assert.notEqual(event.defaultPrevented,true,id+' keeps native Ctrl+'+value);}
 }
 assert.deepEqual(capture(h),before);h.run('S.tab="emu";emu.running=true');const el=control(h,'audCellRow');el.focus();for(const value of ['z','Enter','ArrowRight'])key(h,el,value);assert.deepEqual(h.json('emuKeys'),{});assert.equal(h.run('emuReadJoyState()'),0);assert.deepEqual(h.errors,[]);
});
test('Focused Audio entry buttons contain tracker hotkeys without suppressing normal button activation keys',()=>{
 const h=fresh(),before=capture(h);for(const id of ['audCellApply','audCellClear','audCellCut','audEnvApply']){const button=control(h,id);button.focus();for(const value of ['z','q','ArrowDown','ArrowRight',' ','Enter']){const event=key(h,button,value);assert.equal(event.stopped,true,id+' contains '+value);assert.notEqual(event.defaultPrevented,true,id+' preserves native activation');}}
 assert.deepEqual(capture(h),before);assert.deepEqual(h.errors,[]);
});
test('Browser preview playback prevents mobile edits from following a moving row',()=>{
 const h=fresh();draft(h,{audCellNote:'8'});h.run('aud_playing=true;renderAudio()');const before=capture(h);
 for(const id of ['audCellApply','audCellClear','audCellCut','audEnvApply'])assert.equal(control(h,id).disabled,true,id);
 assert.match(control(h,'audCellStatus').textContent,/stop/i);for(const method of ['apply','clear','cut','updateEnvelope'])assert.equal(h.context.Forge.services.AudioNoteEntry[method](),false);assert.deepEqual(capture(h),before);h.run('aud_stop();renderAudio()');assert.equal(control(h,'audCellApply').disabled,false);
 h.run('S.tab="scene"');const stopped=capture(h);for(const method of ['apply','clear','cut','updateEnvelope'])assert.equal(h.context.Forge.services.AudioNoteEntry[method](),false);assert.deepEqual(capture(h),stopped);assert.deepEqual(h.errors,[]);
});
test('Native envelope values update only the chosen existing instrument step and round-trip with history',()=>{
 const h=fresh(),before=audioState(h);fields(h,{audEnvKind:'volEnv',audEnvStep:'1'});action(h,'audEnvStep','change');fields(h,{audEnvValue:'6'});action(h,'audEnvApply');
 const expected=clone(before);expected.instruments[1].volEnv[1]=6;assert.deepEqual(audioState(h),expected);assert.equal(h.run('undoStack.length'),1);assert.equal(h.run('Forge15.dirty'),true);h.run('undo()');assert.deepEqual(audioState(h),before);h.run('redo()');assert.deepEqual(audioState(h),expected);
 h.run('aud_selectInst(1)');fields(h,{audEnvKind:'arpEnv'});action(h,'audEnvKind','change');fields(h,{audEnvStep:'2'});action(h,'audEnvStep','change');fields(h,{audEnvValue:'-12'});action(h,'audEnvApply');assert.equal(h.run('S.instruments[1].arpEnv[2]'),-12);assert.deepEqual(h.errors,[]);
 // Mixing the retained mouse canvas and native editor must show the value
 // actually painted, and stale out-of-band data must never be overwritten.
 dispatch(control(h,'envArp'),'mousedown',{button:0,clientX:200,clientY:12});for(const listener of h.context.document._testListeners.filter(item=>item.type==='mouseup'))listener.fn({type:'mouseup'});
 assert.equal(h.run('S.instruments[1].arpEnv[2]'),6);assert.equal(String(control(h,'audEnvValue').value),'6');
 h.run('S.instruments[1].arpEnv[2]=5');fields(h,{audEnvValue:'4'});const stale=capture(h);action(h,'audEnvApply');assert.deepEqual(capture(h),stale);assert.deepEqual(h.errors,[]);
});
test('Malformed envelope values or step addresses do not clamp, extend arrays or create history',()=>{
 for(const values of [{audEnvKind:'volEnv',audEnvStep:'1',audEnvValue:'16'},{audEnvKind:'volEnv',audEnvStep:'1',audEnvValue:'-1'},{audEnvKind:'arpEnv',audEnvStep:'1',audEnvValue:'13'},{audEnvKind:'volEnv',audEnvStep:'3',audEnvValue:'9'},{audEnvKind:'volEnv',audEnvStep:'1.5',audEnvValue:'9'},{audEnvKind:'volEnv',audEnvStep:'1',audEnvValue:'1.5'},{audEnvKind:'pitchEnv',audEnvStep:'0',audEnvValue:'1'}]){
  const h=fresh();fields(h,values);const before=capture(h);action(h,'audEnvApply');assert.deepEqual(capture(h),before,JSON.stringify(values));
 }
});

const results=[];for(const {name,fn}of tests){const start=Date.now();try{fn();results.push({name,passed:true,milliseconds:Date.now()-start});console.log('PASS '+name);}catch(error){results.push({name,passed:false,milliseconds:Date.now()-start,error:error.stack});console.log('FAIL '+name+'\n'+error.message);}}
const passed=results.filter(result=>result.passed).length,report={suite:'mobile-audio-entry200',html:path.basename(html),htmlSha256:sha(fs.readFileSync(html)),scope:'Complete standalone application and real registered Audio Studio handlers in a test-local DOM/event adapter; canonical authoring, native-input isolation, canvas/native envelope synchronization and persistence contracts. Mock AudioContext sink only. Does not establish mobile keyboard activation, browser layout, trusted pointer behavior, audible output or hardware acceptance.',passed,failed:results.length-passed,total:results.length,results};
const output=process.env.FORGE_TEST_REPORT||process.argv[3];if(output){fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');}console.log(passed+'/'+results.length+' passed');process.exitCode=report.failed?1:0;
