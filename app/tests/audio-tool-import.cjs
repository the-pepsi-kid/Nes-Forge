#!/usr/bin/env node
'use strict';
// Exercises the actual bundled importer and Audio transaction. This is a tiny
// DOM harness, not browser layout, listening, or external-engine equivalence.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {loadForge}=require('./harness.cjs'),{worldProject}=require('./world-fixtures170.cjs');
const root=path.resolve(__dirname,'..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'))),html=path.resolve(process.argv[2]||path.join(root,manifest.output));
const fixture=path.join(root,'tests/fixtures/famistudio-export/forge-four-channel-famitracker-tempo.txt');
const sourceText=fs.readFileSync(fixture,'utf8'),sha=value=>crypto.createHash('sha256').update(value).digest('hex'),plain=value=>JSON.parse(JSON.stringify(value));
const tests=[],test=(name,fn)=>tests.push({name,fn});
function source(){return {name:path.basename(fixture),text:sourceText};}
function file(text=sourceText,name=path.basename(fixture)){const bytes=new TextEncoder().encode(text);return {name,size:bytes.length,arrayBuffer:async()=>bytes.slice().buffer};}
function fresh(){const h=loadForge(html,{environment:{crypto:crypto.webcrypto}});h.context.setTimeout=(fn,ms)=>ms===0?setImmediate(fn):1;h.api=h.context.Forge.services.AudioToolImport;h.ui=h.context.Forge.services.AudioToolImportUI;h.store=h.context.Forge.services.ProjectStore;assert.ok(h.api&&h.ui,'Importer and visible workflow must be in the actual bundle');assert.deepEqual(h.errors,[]);return h;}
function guard(h){return {project:h.store.serialize(),history:h.json('({undo:undoStack,redo:redoStack,undoBytes})'),dirty:h.run('Forge15.dirty'),emulator:h.json('({loaded:emu.loaded,running:emu.running,PC:emu.PC,frame:emu.frameCount})')};}
function unchanged(h,before){assert.deepEqual(guard(h),before);}
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};}
async function clicked(h,id){h.get(id).click();for(let n=0;h.ui.getState().busy&&n<300;n++)await new Promise(r=>setImmediate(r));assert.equal(h.ui.getState().busy,false,'Visible handler must settle');}
async function preview(h){assert.equal(await h.ui.loadFile(file()),true,h.get('audioToolStatus').textContent);assert.equal(await h.ui.preview(),true,h.get('audioToolStatus').textContent);}
async function save(h){let blob;h.context.URL.createObjectURL=value=>{blob=value;return 'blob:audio-tool-save';};const pending=h.run('project_export()');h.get('forgeSaveBrowser').click();assert.equal((await pending).status,'download-requested');return blob.text();}

test('Real external export stages an immutable canonical score without editing the project',async()=>{
 const h=fresh();h.run('emu.loaded=true;emu.running=true;emu.PC=4660;emu.frameCount=73');const before=guard(h),input=source(),stage=await h.api.stage(input,{songIndex:0});
 assert.ok(Object.isFrozen(stage)&&Object.isFrozen(stage.data.patterns)&&Object.isFrozen(stage.data.patterns.at(-1).rows[0][0]));
 assert.equal(stage.source.text,sourceText);assert.equal(stage.source.sha256,sha(sourceText));assert.equal(stage.source.name,input.name);assert.ok(stage.data.patternCount>0&&stage.data.instrumentCount>0);assert.equal(stage.data.tempo,150);assert.equal(stage.data.speed,6);input.text='changed outside importer';assert.equal(stage.source.text,sourceText);unchanged(h,before);
});

test('Import appends editable data with correct references and preserves existing SFX and unrelated owners',async()=>{
 const h=fresh();h.context.seed=worldProject();h.run('Forge.services.ProjectStore.load(seed);S.sfx=[{id:"retained-effect",name:"Retained",channel:0,pattern:0,startRow:0,endRow:0}];window.retainedOwners={scenes:S.scenes,worlds:S.worlds,animations:S.animations,sfx:S.sfx,audioRuntime:S.audioRuntime};emu.loaded=true;emu.running=true');
 const before=guard(h),old=JSON.parse(before.project),stage=await h.api.stage(source(),{songIndex:0}),result=await h.api.commit(stage),after=plain(h.store.capture());
 assert.equal(result.patternOffset,old.patterns.length);assert.equal(result.instrumentOffset,old.instruments.length);assert.equal(after.patterns.length,old.patterns.length+stage.data.patternCount);assert.equal(after.instruments.length,old.instruments.length+stage.data.instrumentCount);
 assert.deepEqual(after.patterns.slice(0,old.patterns.length),old.patterns);assert.deepEqual(after.instruments.slice(0,old.instruments.length),old.instruments);
 for(const key of Object.keys(old).filter(k=>!['patterns','instruments','orderList','tempo','speed'].includes(k)))assert.deepEqual(after[key],old[key],key);
 assert.ok(after.orderList.every(row=>row.length===5&&row.every(index=>index>=old.patterns.length&&index<after.patterns.length)));
 assert.ok(after.patterns.slice(old.patterns.length).every(p=>p.rows.every(row=>row.every(cell=>cell.inst===-1||cell.inst>=old.instruments.length))));
 assert.equal(h.run('retainedOwners.scenes===S.scenes&&retainedOwners.worlds===S.worlds&&retainedOwners.animations===S.animations&&retainedOwners.sfx===S.sfx&&retainedOwners.audioRuntime===S.audioRuntime'),true);
 assert.deepEqual(guard(h).emulator,before.emulator);assert.equal(h.run('undoStack.length'),before.history.undo.length+1);assert.equal(h.run('Forge15.dirty'),true);
});

test('One Undo, Redo and actual portable Save As/reopen preserve the imported score',async()=>{
 const h=fresh(),before=h.store.serialize(),stage=await h.api.stage(source(),{songIndex:0});await h.api.commit(stage);const after=h.store.serialize();
 h.run('undo()');assert.equal(h.store.serialize(),before);h.run('redo()');assert.equal(h.store.serialize(),after);const saved=await save(h);assert.equal(saved,after);
 const event={target:{files:[{name:'reopened.nesforge.json',size:Buffer.byteLength(saved),text:async()=>saved}],value:'file'}};assert.equal(await h.store.openFile(event),true);assert.equal(h.store.serialize(),after);assert.equal(event.target.value,'');
});

test('Authenticity, consumed stages and edited or replaced projects cannot install stale imports',async()=>{
 const h=fresh(),stage=await h.api.stage(source(),{songIndex:0}),before=guard(h),other=fresh();
 await assert.rejects(async()=>h.api.commit(plain(stage)),/preview|stage/i);await assert.rejects(async()=>other.api.commit(stage),/preview|stage/i);unchanged(h,before);
 h.run('S.projectName="later edit"');const edited=guard(h);await assert.rejects(async()=>h.api.commit(stage),/project changed|stale/i);unchanged(h,edited);
 const second=await h.api.stage(source(),{songIndex:0});h.store.load(h.store.serialize());const replaced=guard(h);await assert.rejects(async()=>h.api.commit(second),/project changed|stale/i);unchanged(h,replaced);
 const current=await h.api.stage(source(),{songIndex:0});await h.api.commit(current);const committed=guard(h);await assert.rejects(async()=>h.api.commit(current),/preview|stage/i);unchanged(h,committed);
});

test('Capacity refusal and malformed source leave project and Undo untouched',async()=>{
 for(const kind of ['patterns','instruments']){const h=fresh();h.run(kind==='patterns'?'S.patterns=Array.from({length:256},()=>JSON.parse(JSON.stringify(S.patterns[0])))':'S.instruments=Array.from({length:255},()=>({name:"Existing",volEnv:[15],dutyEnv:[2],arpEnv:[0],pitchEnv:[0],loopVol:0,loopArp:0}))');const before=guard(h);await assert.rejects(async()=>h.api.stage(source(),{songIndex:0}),/exceed|capacity|limit/i);unchanged(h,before);}
 const h=fresh(),before=guard(h);await assert.rejects(async()=>h.api.stage({name:'invalid.txt',text:'not a FamiStudio export'},{songIndex:0}));unchanged(h,before);
});

test('Visible workflow requires preview and allows cancellation without changing the score',async()=>{
 const h=fresh();assert.equal(h.get('audioToolApply').disabled,true);await preview(h);const before=guard(h);assert.equal(h.ui.getState().hasStage,true);assert.equal(h.get('audioToolApply').disabled,false);assert.match(h.get('audioToolSummary').textContent,/pattern|instrument/i);
 let prompt='';h.context.confirm=text=>{prompt=text;return false;};assert.equal(await h.ui.importMusic(),false);assert.match(prompt,/music order|current music/i);assert.equal(h.ui.getState().hasStage,true);unchanged(h,before);
 h.context.confirm=()=>true;await clicked(h,'audioToolApply');assert.equal(h.ui.getState().hasStage,false);assert.equal(h.ui.getState().receiptOutcome,'imported');assert.notEqual(h.store.serialize(),before.project);
});

test('New source selection and song changes invalidate a visible preview',async()=>{
 for(const kind of ['source','song']){const h=fresh();await preview(h);if(kind==='source')await h.ui.loadFile(file(sourceText,'different.txt'));else{h.get('audioToolSong').value='1';h.get('audioToolSong').dispatchEvent({type:'change'});}const before=guard(h);h.context.confirm=()=>{throw Error('Invalidated preview must not confirm');};assert.equal(await h.ui.importMusic(),false);assert.equal(h.ui.getState().hasStage,false);unchanged(h,before);}
});

test('Project edits during confirmation refuse the import without undoing the user edit',async()=>{
 const h=fresh();await preview(h);let expected;h.context.confirm=()=>{h.run('S.projectName="edited during confirmation"');expected=guard(h);return true;};assert.equal(await h.ui.importMusic(),false);unchanged(h,expected);assert.match(h.get('audioToolStatus').textContent,/project changed|stale/i);
});

test('A slow file read cannot overwrite a later selected file',async()=>{
 const h=fresh(),wait=deferred(),before=guard(h),slow=h.ui.loadFile({name:'older.txt',size:Buffer.byteLength(sourceText),arrayBuffer:async()=>{await wait.promise;return new TextEncoder().encode(sourceText).buffer;}});
 await h.ui.loadFile(file(sourceText,'newer.txt'));wait.resolve();assert.equal(await slow,false);assert.equal(await h.ui.preview(),true);assert.match(h.get('audioToolSummary').textContent,/newer\.txt/);unchanged(h,before);
});

test('Malformed UTF-8, UTF-16, oversized and changed-size files fail before preview',async()=>{
 for(const bytes of [Uint8Array.from([0xc3,0x28]),Uint8Array.from([0xff,0xfe,0x46,0])]){const h=fresh(),before=guard(h);assert.equal(await h.ui.loadFile({name:'bad.txt',size:bytes.length,arrayBuffer:async()=>bytes.buffer}),false);assert.equal(h.ui.getState().hasSource,false);unchanged(h,before);}
 for(const mismatch of [false,true]){const h=fresh(),before=guard(h);let read=false;const bytes=new TextEncoder().encode(sourceText);assert.equal(await h.ui.loadFile({name:'bad-size.txt',size:mismatch?bytes.length+1:h.api.maxBytes+1,arrayBuffer:async()=>{read=true;return bytes.buffer;}}),false);assert.equal(read,mismatch);assert.equal(h.ui.getState().hasSource,false);unchanged(h,before);}
});

test('Receipt export preserves original text and the historical import result separately from the project',async()=>{
 const h=fresh();await preview(h);const before=guard(h),saved=[];h.context.forgeSave.request=async(data,name,mime)=>{saved.push({data,name,mime});return {status:'saved'};};await h.ui.downloadReceipt();assert.equal(saved.length,1);
 const decode=value=>typeof value==='string'?value:new TextDecoder().decode(value),receipt=JSON.parse(decode(saved[0].data));
 assert.equal(receipt.source.text,sourceText);assert.equal(receipt.source.sha256,sha(sourceText));assert.equal(receipt.outcome,'preview');assert.equal(saved[0].mime,'application/json');unchanged(h,before);
 h.context.confirm=()=>true;await h.ui.importMusic();await h.ui.downloadReceipt();const imported=JSON.parse(decode(saved[1].data));assert.equal(imported.outcome,'imported');assert.equal(imported.source.text,sourceText);assert.equal(h.store.capture().audioToolSource,undefined);
});

test('Imported ordinary note can be edited, saved, reopened and compiled to a real Audio Runtime ROM',async()=>{
 const h=fresh();h.context.seed=worldProject();h.run('Forge.services.ProjectStore.load(seed);S.audioRuntime={enabled:true,musicEnabled:true};for(const a of S.animations)for(const f of a.frames)f.events=(f.events||[]).filter(e=>e.type!=="sound")');
 const stage=await h.api.stage(source(),{songIndex:0}),result=await h.api.commit(stage);h.context.importPattern=result.patternOffset;
 const original=h.run('S.patterns[importPattern].rows[0][0].note');assert.ok(original>=0);h.run('S.patterns[importPattern].rows[0][0].note+=1');const saved=await save(h);h.store.load(saved);assert.equal(h.run('S.patterns[importPattern].rows[0][0].note'),original+1);h.run('window._buildAndRunMode=true');const artifact=h.run('Forge.services.RuntimeCompiler.compile()',30000);assert.ok(artifact?.rom?.length>16384);assert.deepEqual(Array.from(artifact.rom.slice(0,4)),[78,69,83,26]);assert.ok(Number.isInteger(artifact.world?.symbols?.labels?.aud_frame));assert.deepEqual(h.errors,[]);
});

(async()=>{const results=[];for(const{name,fn}of tests){try{await fn();results.push({name,passed:true});console.log('PASS '+name);}catch(error){results.push({name,passed:false,error:String(error.stack||error)});console.error('FAIL '+name+'\n'+String(error.stack||error));}}const passed=results.filter(x=>x.passed).length,report={suite:'audio-tool-import',htmlSha256:sha(fs.readFileSync(html)),fixtureSha256:sha(sourceText),scope:'Actual bundled FamiStudio text lifecycle and visible handlers; immutable preview, guarded append transaction, one Undo/Redo, portable Save As/reopen, source-selection races, original-text receipt and editable generated Audio Runtime ROM. Separate browser/CPU evidence is required; no external-engine or audible equivalence claim.',passed,total:results.length,failed:results.length-passed,results};const output=process.env.FORGE_TEST_REPORT||process.argv[3];if(output){fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');}console.log(passed+'/'+results.length+' passed');if(report.failed)process.exitCode=1;})();
