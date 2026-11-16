'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {NES,Controller}=require('jsnes');
const {load}=require('../app/tests/dom-environment.cjs');
const root=path.resolve(__dirname,'..'),editor=process.argv[2]||path.join(root,'NES_Forge.html'),destination=process.argv[3];
const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
const report={editorSha256:hash(fs.readFileSync(editor)),dom:'jsdom '+require('jsdom/package.json').version,independentEmulator:'JSNES 2.0.0',checks:[],projects:[]};
const pause=()=>new Promise(resolve=>setImmediate(resolve));
async function wait(check){for(let i=0;i<300;i++){if(check())return;await pause();}throw Error('Action did not complete.');}
async function test(name,fn){console.log("Checking",name);try{const evidence=await fn();report.checks.push({name,passed:true,evidence});}catch(e){report.checks.push({name,passed:false,error:e.message});console.error(name,e.message);}}
function independent(bytes){
 const frames=new Set(), frameSequence=crypto.createHash("sha256"),audioSequence=crypto.createHash("sha256");let frameCount=0,maxColors=0,samples=0,low=Infinity,high=-Infinity;
 const nes=new NES({onFrame:buffer=>{
  frameCount++;maxColors=Math.max(maxColors,new Set(buffer).size);
  const pixels=Buffer.from(Uint32Array.from(buffer).buffer);frames.add(hash(pixels));frameSequence.update(pixels);
 },onAudioSample:(left,right)=>{samples++;low=Math.min(low,left,right);high=Math.max(high,left,right);const pair=Buffer.allocUnsafe(8);pair.writeFloatLE(left,0);pair.writeFloatLE(right,4);audioSequence.update(pair);}});
 nes.loadROM(bytes);
 for(let frame=0;frame<100;frame++){
  if(frame===30)nes.buttonDown(1,Controller.BUTTON_RIGHT);
  if(frame===45)nes.buttonDown(1,Controller.BUTTON_A);
  if(frame===49)nes.buttonUp(1,Controller.BUTTON_A);
  if(frame===62)nes.buttonDown(1,Controller.BUTTON_B);
  if(frame===68)nes.buttonUp(1,Controller.BUTTON_B);
  if(frame===75)nes.buttonUp(1,Controller.BUTTON_RIGHT);
  nes.frame();
 }
 assert.equal(frameCount,100);return {frameSequenceSha256:frameSequence.digest("hex"),audioSequenceSha256:audioSequence.digest("hex"),frames:frameCount,distinctFrames:frames.size,maxColors,audioSamples:samples,audioRange:samples?high-low:null};
}
(async()=>{
 const dom=load(editor),{window:w,document:d}=dom,services=w.Forge.services;
 await new Promise(resolve=>setTimeout(resolve,15));
 const store=services.ProjectStore,rom=()=>Buffer.from(services.RuntimeCompiler.compile().rom);
 const get=id=>d.getElementById(id);
 async function intake(name,bytes){
  const file={name,size:bytes.length,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};
  const chooser=get('projectGatewayFile');Object.defineProperty(chooser,'files',{configurable:true,value:[file]});
  chooser.dispatchEvent(new w.Event('change',{bubbles:true}));await wait(()=>!services.ProjectGatewayUI.getState().busy);
  const action=get('projectGateway-project');assert.ok(action,get('projectGatewayStatus').textContent);action.click();
  assert.ok(services.ProjectGatewayUI.getState().ready,'Accepted project was detached from intake.');
 }
 async function save(){
  const count=dom.downloads.length;d.querySelector('button[onclick="project_export()"]').click();
  get('forgeSaveBrowser').click();await wait(()=>dom.downloads.length===count+1);
  const download=dom.downloads.at(-1);return Buffer.from(await download.blob.arrayBuffer());
 }
 await test('All visible editor tabs open and select their named views',()=>{
  const tabs=[...d.querySelectorAll('button.tab[data-view]')];assert(tabs.length>=15);
  const names=[];for(const tab of tabs){tab.click();assert.equal(w.eval('S.tab'),tab.dataset.view);names.push(tab.dataset.view);}
  return names;
 });
 await test('Connected Workspace, Resources, cartridge workshop and hosted setup live in the same editor',()=>{
  for(const name of ['ConnectedWorkspacePreview','ResourceRelationshipPreview','EightStageWorkshop','HostedWorldSetupGuide','AudioUI','SourceWorkspace','WorldCompiler','RuntimeCompiler'])assert(services[name],name);
  get('fcw-open').click();assert(get('fcw-overlay').classList.contains('show'));get('fcw-close').click();
  get('frx-open').click();assert(get('frx-root').classList.contains('frx-visible'));get('frx-close').click();
  get('nf-host-open').click();assert.ok(get('nf-host-overlay'));get('nf-host-close').click();
  assert(services.EightStageWorkshop.choices());return {registeredServices:Object.keys(services).length,title:d.title};
 });
 await test('New project, Scene edit, Undo, Redo, Save As, reopen and deterministic rebuild',async()=>{
  get('npNew166').click();const original=store.capture(),name=original.scenes[original.activeScene].name;
  w.prompt=()=>'Review scene';d.querySelector('button[onclick="renameScene()"]').click();
  assert.equal(store.capture().scenes[original.activeScene].name,'Review scene');
  get('undoBtn').click();assert.equal(store.capture().scenes[original.activeScene].name,name);
  w.eval('redo()');assert.equal(store.capture().scenes[original.activeScene].name,'Review scene');
  assert.throws(rom,/Choose a player/);const mode=get('gpMode165');mode.value='viewer';mode.dispatchEvent(new w.Event('change'));
  assert.equal(store.capture().gameplay.mode,'viewer');
  const before=rom(),saved=await save();get('npNew166').click();await intake('roundtrip.nesforge.json',saved);
  assert.equal(store.capture().scenes[original.activeScene].name,'Review scene');assert.equal(hash(rom()),hash(before));
  return {bytes:before.length,romSha256:hash(before),independent:independent(before)};
 });
 for(const filename of fs.readdirSync(path.join(root,'Examples')).filter(n=>n.endsWith('.nesforge.json')).sort()){
  await test(filename+' opens, builds, runs, saves and reopens',async()=>{
   const bytes=fs.readFileSync(path.join(root,'Examples',filename)),input=JSON.parse(bytes);
   await intake(filename,bytes);assert.equal(store.capture().projectName,input.projectName);
   const first=rom();assert.equal(first.readUInt32BE(0),0x4e45531a);
   d.querySelector('button[onclick="buildAndRun()"]').click();assert(w.eval('emu.loaded'),'Build & Run did not load a cartridge');
   const frames=w.eval('(()=>{const before=emu.frameCount;for(let i=0;i<6;i++)emuRunFrame();return emu.frameCount-before;})()');assert.equal(frames,6);
   const exported=await save();get('npNew166').click();await intake('saved.nesforge.json',exported);
   assert.equal(hash(rom()),hash(first));
   const boot=independent(first),result={name:filename,romBytes:first.length,romSha256:hash(first),forgeFrames:frames,independent:boot};
   const referenceName=filename.startsWith('DigiGhosts')?'game.nes':filename.replace('.nesforge.json','.nes');
   const historical=path.join(root,'QA','r',referenceName);
   if(fs.existsSync(historical)){
    const original=fs.readFileSync(historical),old=hash(original)===hash(first)?boot:independent(original);
    result.reference={sha256:hash(original),bytesMatch:hash(original)===hash(first),
     differingBytes:original.length===first.length?first.reduce((count,value,i)=>count+Number(value!==original[i]),0):null,
     framesMatch:boot.frameSequenceSha256===old.frameSequenceSha256,audioMatches:boot.audioSequenceSha256===old.audioSequenceSha256,
     frameSequenceSha256:old.frameSequenceSha256,audioSequenceSha256:old.audioSequenceSha256};
   }
   report.projects.push(result);assert(boot.maxColors>1,'Only one visible color across 100 independent frames');return result;
  });
 }
 await test('Unknown ROM input stays an inspection and leaves the working project intact',async()=>{
  const before=store.serialize(),blob=w.Uint8Array.from([...Buffer.alloc(16)]);
  const result=await services.ProjectGateway.inspect(blob,{name:'unknown.bin'});
  assert.equal(result.kind,'rom');assert(!result.actions.some(a=>a.id==='open-recovery'));assert.equal(store.serialize(),before);
  return {profile:result.profile};
 });
 await pause();
 report.domErrors=[...dom.errors,...dom.consoleErrors,...dom.domErrors];
 report.passed=report.checks.filter(c=>c.passed).length;report.total=report.checks.length;
 report.ok=report.passed===report.total&&!report.domErrors.length;
 if(destination)fs.writeFileSync(destination,JSON.stringify(report,null,2)+'\n');
 console.log(report.passed+'/'+report.total,'projects',report.projects.map(p=>[p.name,p.independent.maxColors]),'domErrors',JSON.stringify(report.domErrors).slice(0,520));
 w.close();process.exitCode=report.ok?0:1;
})().catch(e=>{console.error(e);process.exitCode=1;});
