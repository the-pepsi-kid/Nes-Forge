#!/usr/bin/env node
'use strict';
// Registered project-bar and gameplay handlers in the complete app VM.
// The DOM stub verifies construction/ownership and command effects; it does
// not establish browser layout, native confirmation, input or file-picker QA.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {loadForge}=require('./harness.cjs');
const root=path.resolve(__dirname,'..');
const htmlPath=path.resolve(process.argv[2]||path.join(root,'mainline/NES_Forge_1.6.6_No_Code_Workflow.html'));
const tests=[],test=(name,fn)=>tests.push({name,fn});
const fixtureRom=Uint8Array.from(fs.readFileSync(path.join(root,'examples/Forge_Scout_Demo_1.6.5.nes')));
function fresh(){const h=loadForge(htmlPath);assert.ok(h.context.Forge166?.workspace,'Candidate must include the native workspace module');assert.deepEqual(h.errors,[]);return h;}
function children(node){return [node,...(node.children||[]).flatMap(children)];}
function constructed(h,id){
  // Access known roots only. get() itself creates phantom nodes, so lookup of
  // each tested control instead walks nodes actually appended by the app.
  const roots=[h.context.document.body,h.context.document.head,h.context.document.querySelector('.project-bar'),h.get('sideScene'),h.get('sideCode')];
  const found=roots.flatMap(children).find(node=>node.id===id);
  assert.ok(found,id+' must be an actually constructed and attached node');return found;
}
function click(h,id){const node=constructed(h,id);assert.equal(typeof node.onclick,'function',id+' needs a registered click handler');assert.notEqual(node.disabled,true);return node.onclick({target:node,currentTarget:node,preventDefault(){},stopPropagation(){}});}
function selectFile(h,file){const input=constructed(h,'npRomInput166');assert.equal(typeof input.onchange,'function');input.value='C:\\fakepath\\'+file.name;input.files=[file];return input.onchange({target:input,currentTarget:input});}
function romFile(name='Scout.nes',bytes=fixtureRom){const copy=Uint8Array.from(bytes);return {name,size:copy.length,arrayBuffer:async()=>copy.buffer};}
function deferredFile(name='Late.nes'){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {file:{name,size:fixtureRom.length,arrayBuffer:()=>promise},resolve:bytes=>resolve(Uint8Array.from(bytes).buffer),reject};}
function prime(h){h.run('snapshot();S.projectId=44;emu.loaded=true;emu.running=true;emu.frameCount=91;emu.romName="Previous runtime";emu.lastBuiltRom=new Uint8Array([1,2,3]);window._lastBuiltRom=emu.lastBuiltRom;Forge165.lastBuild={retained:true}');}
function capture(h){return {data:h.json('projectData()'),history:h.json('({undo:undoStack,redo:redoStack,bytes:undoBytes})'),runtime:h.json('({id:S.projectId,loaded:emu.loaded,running:emu.running,frame:emu.frameCount,name:emu.romName})'),refs:h.run('[S.scenes,S.chr,S.animations,S.metasprites,S.worlds,S.gameplay,S.importedRom,window._lastBuiltRom,emu.lastBuiltRom,Forge165.lastBuild]')};}
function unchanged(h,before){const after=capture(h);assert.deepEqual(after.data,before.data);assert.deepEqual(after.history,before.history);assert.deepEqual(after.runtime,before.runtime);after.refs.forEach((ref,i)=>assert.equal(ref,before.refs[i],'Reference '+i+' must remain unchanged'));}

test('Project actions are attached to the existing project bar and no workflow popup is constructed',()=>{
  const h=fresh(),bar=h.context.document.querySelector('.project-bar');
  for(const id of ['npNew166','npOpenRom166','npGameplayOpen166','npRomInput166'])assert.equal(constructed(h,id).parentElement,bar);
  const input=constructed(h,'npRomInput166');assert.equal(input.type,'file');assert.equal(input.accept,'.nes');
  const roots=[h.context.document.body,h.context.document.head,bar,h.get('sideScene'),h.get('sideCode')];
  assert.equal(roots.flatMap(children).some(node=>/^wf(?:Open|Overlay|NewScout|Checklist|Confirm)/.test(node.id||'')),false);
  assert.equal(h.context.Forge166.workflow,undefined);
});

test('Gameplay navigation opens the existing Scene settings without replacing controls or compiling',()=>{
  const h=fresh(),panel=constructed(h,'gpPanel165'),details=constructed(h,'npGameplay166'),fields=h.run('Forge165.ui.fields'),history=h.run('undoStack.length');
  assert.equal(panel.parentElement,details);assert.equal(details.parentElement,h.get('sideScene'));
  let scrolls=0,compiles=0;details.scrollIntoView=()=>{scrolls++;};const compile=h.context.Forge165.compileGameplay;h.context.Forge165.compileGameplay=()=>{compiles++;throw Error('Navigation must not compile');};
  try{h.run('switchTab("code")');assert.equal(click(h,'npGameplayOpen166'),panel);h.run('switchTab("chr");Forge165.ui.open();render();render();');}
  finally{h.context.Forge165.compileGameplay=compile;}
  assert.equal(h.run('S.tab'),'scene');assert.equal(details.open,true);assert.equal(scrolls,2);assert.equal(compiles,0);assert.equal(h.run('undoStack.length'),history);
  assert.equal(h.run('Forge165.ui.fields'),fields);assert.equal(constructed(h,'gpPanel165'),panel);assert.deepEqual(h.errors,[]);
});

test('Cancelling New Project preserves project references, undo history, save identity and running ROM',()=>{
  const h=fresh();prime(h);const before=capture(h);let confirms=0;h.context.confirm=()=>{confirms++;return false;};
  assert.equal(click(h,'npNew166'),false);assert.equal(confirms,1);unchanged(h,before);assert.deepEqual(h.errors,[]);
});

test('Confirming New Project creates a blank Scene in one undo step with no inherited runtime',()=>{
  const h=fresh();prime(h);const history=h.run('undoStack.length');let confirms=0;h.context.confirm=()=>{confirms++;return true;};
  assert.equal(click(h,'npNew166'),true);assert.equal(confirms,1);assert.equal(h.run('undoStack.length'),history+1);
  assert.deepEqual(h.json('({tab:S.tab,scenes:S.scenes.length,entities:S.scenes[0].entities.length,frames:S.metasprites.length,animations:S.animations.length,mode:S.gameplay.mode,player:S.gameplay.playerId,asm:S.asmSource,loaded:emu.loaded,running:emu.running,built:window._lastBuiltRom,id:S.projectId})'),{tab:'scene',scenes:1,entities:0,frames:0,animations:0,mode:'single-room',player:'',asm:'',loaded:false,running:false,built:null,id:null});
  assert.equal(h.run('S.gameplay.sceneId===S.scenes[0].id'),true);assert.deepEqual(h.errors,[]);
});

test('Open Forge ROM uses its registered file input and cancellation retains the entire workspace',async()=>{
  const h=fresh();prime(h);const before=capture(h),input=constructed(h,'npRomInput166');let picked=0,confirms=0;input.onclick=()=>{picked++;};h.context.confirm=()=>{confirms++;return false;};
  click(h,'npOpenRom166');assert.equal(picked,1);assert.equal(await selectFile(h,romFile()),false);assert.equal(confirms,1);assert.equal(input.value,'');
  assert.equal(h.context.Forge166.workspace.state.reading,false);assert.equal(constructed(h,'npOpenRom166').disabled,false);unchanged(h,before);assert.deepEqual(h.errors,[]);
});

test('Malformed and unrelated ROM files are rejected before replacement confirmation or mutation',async()=>{
  const h=fresh();prime(h);const before=capture(h);let confirms=0;h.context.confirm=()=>{confirms++;return true;};
  const badChecksum=fixtureRom.slice();badChecksum[16+0x3800+20]^=1;
  const foreign=new Uint8Array(16+16384+8192);foreign.set([78,69,83,26,1,1]);foreign.set([0x4c,0,0xc0],16);foreign.set([0,0xc0,0,0xc0,0,0xc0],16+0x3ffa);
  for(const [name,bytes] of [['Truncated.nes',new Uint8Array([78,69,83])],['Corrupt.nes',badChecksum],['Other.nes',foreign]]){
    assert.equal(await selectFile(h,romFile(name,bytes)),false);unchanged(h,before);assert.equal(h.context.Forge166.workspace.state.reading,false);assert.equal(constructed(h,'npOpenRom166').disabled,false);
  }
  assert.equal(confirms,0);assert.match(h.context.Forge166.workspace.state.message,/capture|inspection/i);assert.deepEqual(h.errors,[]);
});

test('Confirmed Forge ROM input opens one editable project and keeps the Scene gameplay controls live',async()=>{
  const h=fresh(),history=h.run('undoStack.length'),panel=constructed(h,'gpPanel165');let confirms=0;h.context.confirm=()=>{confirms++;return true;};
  assert.equal(await selectFile(h,romFile('Reopened.nes')),true);assert.equal(confirms,1);assert.equal(h.run('undoStack.length'),history+1);
  assert.deepEqual(h.json('({name:S.projectName,tab:S.tab,scenes:S.scenes.length,frames:S.metasprites.length,animations:S.animations.length,asm:S.asmSource,mode:S.gameplay.mode})'),{name:'Reopened',tab:'scene',scenes:1,frames:4,animations:4,asm:'',mode:'single-room'});
  assert.deepEqual(Uint8Array.from(h.run('S.importedRom')),fixtureRom);assert.equal(constructed(h,'gpPanel165'),panel);
  const speed=h.run('Forge165.ui.fields.moveSpeed');speed.value='3';speed.onchange();assert.equal(h.run('S.gameplay.moveSpeed'),3);assert.equal(h.run('undoStack.length'),history+2);assert.deepEqual(h.errors,[]);
});

test('A newer ROM selection wins and a late older read cannot replace it or add history',async()=>{
  const h=fresh(),late=deferredFile('Older.nes');let confirms=0;h.context.confirm=()=>{confirms++;return true;};
  const reading=selectFile(h,late.file);assert.equal(h.context.Forge166.workspace.state.reading,true);assert.equal(constructed(h,'npOpenRom166').disabled,true);
  assert.equal(await selectFile(h,romFile('Newest.nes')),true);const before=capture(h);late.resolve(fixtureRom);assert.equal(await reading,false);
  assert.equal(confirms,1);assert.equal(h.run('S.projectName'),'Newest');unchanged(h,before);assert.equal(h.context.Forge166.workspace.state.reading,false);assert.equal(constructed(h,'npOpenRom166').disabled,false);assert.deepEqual(h.errors,[]);
});

test('Confirming a blank project invalidates an outstanding ROM read before it can prompt or import',async()=>{
  const h=fresh(),late=deferredFile();let confirms=0;h.context.confirm=()=>{confirms++;return true;};
  const reading=selectFile(h,late.file);assert.equal(click(h,'npNew166'),true);const before=capture(h);
  late.resolve(fixtureRom);assert.equal(await reading,false);assert.equal(confirms,1);unchanged(h,before);assert.equal(h.context.Forge166.workspace.state.reading,false);assert.equal(constructed(h,'npOpenRom166').disabled,false);assert.deepEqual(h.errors,[]);
});

test('Cancelling New Project does not silently discard an already selected ROM file',async()=>{
  const h=fresh(),late=deferredFile('Retained.nes'),before=capture(h);let confirms=0;h.context.confirm=()=>++confirms>1;
  const reading=selectFile(h,late.file);assert.equal(click(h,'npNew166'),false);unchanged(h,before);assert.equal(h.context.Forge166.workspace.state.reading,true);
  late.resolve(fixtureRom);assert.equal(await reading,true);assert.equal(confirms,2);assert.equal(h.run('S.projectName'),'Retained');assert.equal(h.context.Forge166.workspace.state.reading,false);assert.deepEqual(h.errors,[]);
});

test('Read failures and oversized files release the input without confirming or changing project state',async()=>{
  const h=fresh();prime(h);const before=capture(h);let confirms=0,oversizedReads=0;h.context.confirm=()=>{confirms++;return true;};
  const late=deferredFile();const reading=selectFile(h,late.file);late.reject(Error('The file could not be read'));assert.equal(await reading,false);unchanged(h,before);assert.match(h.context.Forge166.workspace.state.message,/could not be read/);
  assert.equal(await selectFile(h,{name:'TooBig.nes',size:64*1024*1024+1,arrayBuffer:async()=>{oversizedReads++;return new ArrayBuffer(0);}}),false);
  assert.equal(oversizedReads,0);assert.equal(confirms,0);unchanged(h,before);assert.equal(h.context.Forge166.workspace.state.reading,false);assert.equal(constructed(h,'npOpenRom166').disabled,false);assert.deepEqual(h.errors,[]);
});

test('A failed Scene gameplay build exposes the shared build log beside the same settings',()=>{
  const h=fresh();click(h,'npGameplayOpen166');const build=h.run('buildAndRun');h.context.testBuildFailure=()=>{const log=h.get('buildLog');log.replaceChildren();const line=h.context.document.createElement('div');line.textContent='Player animation needs a nonlooping attack.';log.appendChild(line);return false;};
  h.run('buildAndRun=testBuildFailure');try{assert.equal(constructed(h,'gpPlay165').onclick(),false);}finally{h.context.savedBuild=build;h.run('buildAndRun=savedBuild');}
  assert.equal(constructed(h,'npBuildDetails166').open,true);assert.match(constructed(h,'npBuildLog166').textContent,/nonlooping attack/);assert.equal(h.run('S.tab'),'scene');assert.deepEqual(h.errors,[]);
});

(async()=>{const results=[];for(const {name,fn} of tests){const start=Date.now();try{await fn();results.push({name,passed:true,milliseconds:Date.now()-start});console.log('PASS '+name);}catch(error){results.push({name,passed:false,error:error.stack});console.log('FAIL '+name+'\n'+error.message);}}
  const passed=results.filter(result=>result.passed).length,report={suite:'native-ui166',source:path.basename(htmlPath),sha256:crypto.createHash('sha256').update(fs.readFileSync(htmlPath)).digest('hex'),environment:'Node.js complete application VM and shared DOM stub',limitations:'No browser layout, physical input, native confirmation, file picker or Save As verification.',total:results.length,passed,failed:results.length-passed,results};
  const output=process.env.FORGE_TEST_REPORT||process.argv[3];if(output)fs.writeFileSync(path.resolve(output),JSON.stringify(report,null,2)+'\n');console.log(passed+'/'+results.length+' passed');if(report.failed)process.exitCode=1;
})();
