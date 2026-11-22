'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {load}=require('../app/tests/dom-environment.cjs');
const root=path.resolve(__dirname,'..'),editor=process.argv[2]||path.join(root,'NES_Forge.html'),out=process.argv[3],corpus=process.argv[4],packs=process.argv[5];
if(!corpus)throw Error('Supply the folder containing the original cartridges.');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const report={editorSha256:hash(fs.readFileSync(editor)),cartridges:[],packMatches:[]};
const list=(base,ext)=>fs.readdirSync(base,{withFileTypes:true}).flatMap(item=>item.isDirectory()?list(path.join(base,item.name),ext):item.name.toLowerCase().endsWith(ext)?[path.join(base,item.name)]:[]);
const sources=list(corpus,'.nes').sort().map(p=>({name:path.basename(p),bytes:fs.readFileSync(p)}));
const file=(name,bytes)=>({name,size:bytes.length,arrayBuffer:async()=>Uint8Array.from(bytes).buffer});
async function wait(check){const end=Date.now()+60000;while(Date.now()<end){if(check())return;await new Promise(r=>setTimeout(r,15));}throw Error('Timed out waiting for the project action.');}
// Opening a pack also registers it in the resource library, in the background (it never changes the project). Wait for
// that to finish, and say so, so that no work is left running when the window closes: unfinished registrations kept
// the process busy for minutes after the report was written.
async function libraryRegistered(doc,name){
 const line=doc.document.getElementById('projectGatewayLibrary'),end=Date.now()+600000;let said=Date.now();
 while(Date.now()<end){const t=line?.textContent||'';if(t.includes(name)&&!/registering /.test(t))return t.replace(/^.*Resource library: /,'');
  if(Date.now()-said>20000){said=Date.now();console.log('  library: '+t.replace(/^.*Resource library: /,'').slice(0,160));}await new Promise(r=>setTimeout(r,50));}
 throw Error('The library registration of '+name+' did not finish: '+(line?.textContent||'(no status)'));
}
async function verifyCart(cart){
 const a=load(editor),w=a.window,d=a.document,s=w.Forge.services,store=s.ProjectStore,g=s.ProjectGatewayUI,original=cart.bytes;
 const result={name:cart.name,sha256:hash(original),prgChrSha256:hash(original.subarray(16))};report.cartridges.push(result);
 try{
  await new Promise(r=>setTimeout(r,15));assert(await g.openFile(file(cart.name,original)),d.getElementById('projectGatewayStatus').textContent);
  const receipt=g.report();assert.equal(receipt.source.sha256,result.sha256);
  result.profile=receipt.profile;
  const listed=s.RecoveryCoverage.match(result.sha256);
  if(listed)assert.notEqual(result.profile,'unrecognized','An exact ledger match must be identified in the file picker.');
  result.availableActions=receipt.actions.map(a=>a.id);
  result.mapper=(original[6]>>>4)|(original[7]&0xf0);
  const rom=w.Uint8Array.from(original);
  assert(w.eval('emuLoadRomData')(rom,cart.name));const delta=w.eval('(()=>{const before=emu.frameCount;for(let n=0;n<45;n++)emuRunFrame();return emu.frameCount-before;})()');assert.equal(delta,45);
  result.originalForgeFrames=delta;
  if(result.availableActions.includes('open-recovery')){
    const project=store.capture();assert.equal(project.scenes.length,6);assert.equal(project.metasprites.length,9);assert.equal(project.animations.length,6);
    const details=s.RecoveryAPUSourceCatalog.info(result.sha256);assert.equal(details.siteCount,12);assert.equal(details.apuWrites,649);
    result.recovery={scenes:project.scenes.length,poses:project.metasprites.length,animations:project.animations.length,recordedApuSites:details.siteCount,recordedApuWrites:details.apuWrites};
    const receiver=JSON.parse(fs.readFileSync(path.join(root,'Examples/TwoStages.nesforge.json'),'utf8'));
    store.load(receiver,{intent:'workshop-receiver'});
    const workshop=s.EightStageWorkshop;
    assert(await workshop.openFile(file(cart.name,original)),workshop.choices().status.textContent);
    const controls=workshop.choices();controls.source.value='0';controls.destination.value=receiver.worlds[0].id;controls.area.value='detail';
    const transferred=workshop.addPage();assert(transferred,controls.status.textContent);assert.equal(transferred.receipt.sourceSha256,result.sha256);
    const first=Buffer.from(s.RuntimeCompiler.compile().rom),saved=store.serialize();store.initializeBlank();store.load(saved,{intent:'workshop-reopen'});
    assert.equal(hash(s.RuntimeCompiler.compile().rom),hash(first));d.querySelector('button[onclick="buildAndRun()"]').click();assert(w.eval('emu.loaded'));
    assert.deepEqual(JSON.parse(JSON.stringify(store.capture().worlds[0].markers)),receiver.worlds[0].markers);
    const beforeRetry=store.serialize();workshop.refresh();assert.equal(workshop.addPage(),null);assert.equal(beforeRetry,store.serialize());
    result.workshopTransfer={verifiedDonor:true,region:'center detail',destination:transferred.world,patterns:transferred.tiles,metatiles:transferred.blocks,romBytes:first.length,romSha256:hash(first),repeatRejected:true,reopened:true,markersPreserved:true};

  }
  if(result.mapper===9){
    assert(await g.route('rom-project'));d.getElementById('investigationImport').click();
    await wait(()=>store.capture().nativeGame?.adapter?.startsWith('punch-out-'));
    d.getElementById('fcw-open').click();d.querySelector('[data-fcw-tab="native"]').click();
    d.querySelector('[data-fcw-writer="punch-out.glass-joe.first-preferred-count"]').click();
    d.getElementById('punchOutRecoveryCount').value='2';d.getElementById('punchOutRecoveryHealth').value='64';
    d.getElementById('punchOutRecoveryApply').click();
    const edited=store.capture();assert.equal(edited.nativeGame.edits.length,2);assert.equal(edited.nativeGame.sourceSha256,result.sha256);
    const saved=store.serialize();store.initializeBlank();store.load(saved,{intent:'native-test-reopen'});
    const compiled=Buffer.from(s.RuntimeCompiler.compile().rom),diff=[];
    for(let i=0;i<compiled.length;i++)if(compiled[i]!==original[i])diff.push(i);
    assert.deepEqual(diff,[0x13d7]);assert.equal(compiled[diff[0]],0x28);
    d.querySelector('button[onclick="buildAndRun()"]').click();assert.equal(w.eval('emu.mapper'),9);
    result.nativeWriter={reopened:true,changedOffsets:diff,before:original[diff[0]],after:compiled[diff[0]],outputSha256:hash(compiled)};
  }
  if(result.availableActions.includes('native-world')){
    await g.route('native-world');
    const project=store.capture(),n=project.nativeGame,resource=n.resources[0],world=project.worlds.find(x=>x.id===resource.worldId);
    const current=s.NativeWorldProject.build(project);assert.equal(hash(current.rom),result.sha256);
    const index=world.map.findIndex((value,i)=>i%64>0&&value!==world.map[i-1]);
    assert(index>=0);const changedValue=world.map[index-1];
    const changed=s.NativeWorldProject.paint(project,resource.mapId,[{index,value:changedValue}]);
    project.worlds=changed.worlds;store.load(project,{intent:'native-terrain-edit'});store.load(store.serialize(),{intent:'native-terrain-reopen'});
    const built=s.NativeWorldProject.build(store.capture());const diffs=built.metadata.changes;
    assert(diffs.length>0&&diffs.length<original.length/4);const restored=s.NativeWorldProject.create(w.Uint8Array.from(built.rom),cart.name,resource.mapId);
    assert.equal(restored.worlds.find(x=>x.id===resource.worldId).map[index],changedValue);
    result.nativeWorld={noEditIdentical:true,editedCells:1,decodedChangeSurvived:true,differingBytes:diffs.length,outputSha256:hash(built.rom)};
  }
  result.domErrors=[...a.errors,...a.consoleErrors,...a.domErrors];assert.equal(result.domErrors.length,0,JSON.stringify(result.domErrors));result.passed=true;
 }catch(e){result.passed=false;result.error=e.message;}
 finally{await new Promise(r=>setImmediate(r));w.close();}
 console.log(cart.name,result.passed,result.error||'');
}
(async()=>{
 for(const cart of sources)await verifyCart(cart);
 if(packs){
  const doc=load(editor),w=doc.window,s=w.Forge.services;
  for(const p of list(packs,'.zip')){
   const bytes=fs.readFileSync(p),pack=await s.ExtractionPack.open(w.Uint8Array.from(bytes)),declared=pack.report.rom.sha256;
   const match=sources.find(c=>hash(c.bytes)===declared);
   let row={name:pack.report.game,declared,match:match?'exact':null};
   if(match){row.ownerCartridgeSha256=hash(match.bytes);}
   else {
    const headers=String(pack.report.header_note||'').match(/\b[0-9a-f]{32}\b/ig)||[];
    if(headers.length===2)for(const cart of sources){
     if(cart.bytes.subarray(0,16).toString('hex')!==headers[1])continue;
     if(hash(Buffer.concat([Buffer.from(headers[0],'hex'),cart.bytes.subarray(16)]))===declared){
      row={...row,match:'same payload; recorded header substitution reproduced',ownerCartridgeSha256:hash(cart.bytes),payloadSha256:hash(cart.bytes.subarray(16)),reportedHeader:headers[0],actualHeader:headers[1]};break;
     }
    }
   }
   const source=sources.find(c=>hash(c.bytes)===row.ownerCartridgeSha256);
   if(!source)row.sourceCheck='not-run-original-unavailable';
   const before=s.ProjectStore.serialize();
   if(source){
    const g=s.ProjectGatewayUI;assert(await g.openFile(file(path.basename(p),bytes)));
    const picker=doc.document.getElementById('extractionSourceFile'),status=doc.document.getElementById('extractionSourceStatus');
    Object.defineProperty(picker,'files',{configurable:true,value:[file(source.name,source.bytes)]});picker.dispatchEvent(new w.Event('change'));
    await wait(()=>status.dataset.status&&status.dataset.status!=='reading');
    const expected=row.match==='exact'?'exact':'same-payload';assert.equal(status.dataset.status,expected);row.inEditorStatus=expected;
    row.library=(await libraryRegistered(doc,path.basename(p))).slice(0,240);assert(/^(registered |.* is already registered)/.test(row.library),row.library);
    console.log('pack',row.name,row.inEditorStatus,'· library:',row.library.slice(0,120));
   }
   assert.equal(pack.verifySource(w.Uint8Array.from([0,1,2,3])).status,'mismatch');assert.equal(before,s.ProjectStore.serialize());
   report.packMatches.push(row);
  }
  await new Promise(r=>setImmediate(r));w.close();
 }
 report.unverifiedPacks=report.packMatches.filter(p=>!p.match).map(p=>({name:p.name,declared:p.declared,reason:p.sourceCheck}));
 report.allPacksSourceVerified=report.unverifiedPacks.length===0;
 report.ok=report.cartridges.length>0&&report.cartridges.every(c=>c.passed)&&report.packMatches.every(p=>p.match||p.sourceCheck==='not-run-original-unavailable');
 report.total=report.cartridges.length;report.passed=report.cartridges.filter(c=>c.passed).length;
 if(out)fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
 process.exitCode=report.ok?0:1;
})().catch(e=>{console.error(e);process.exitCode=1;});
