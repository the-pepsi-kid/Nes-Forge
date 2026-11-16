'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {load}=require('../app/tests/dom-environment.cjs');
const root=path.resolve(__dirname,'..');
const input=path.resolve(process.argv[2]||'.'),output=process.argv[3],editor=process.argv[4]||path.join(root,'NES_Forge.html');
const digest=data=>crypto.createHash('sha256').update(data).digest('hex');
const report={editorSha256:digest(fs.readFileSync(editor)),scope:'All supplied map and room JSON records, matching PNGs, editable room/audio projects, and the actual intake control.',packs:[]};
const pause=()=>new Promise(resolve=>setImmediate(resolve));
async function wait(check,label='file intake'){
 const until=Date.now()+30000;
 while(Date.now()<until){if(check())return;await new Promise(resolve=>setTimeout(resolve,15));}
 throw Error('Timed out waiting for '+label+'.');
}

(async()=>{
const dom=load(editor),w=dom.window,d=dom.document,services=w.Forge.services;
await new Promise(resolve=>setTimeout(resolve,15));
for(const name of fs.readdirSync(input).filter(n=>n.toLowerCase().endsWith('.zip')).sort()){
 const bytes=fs.readFileSync(path.join(input,name));
 const packResult={filename:name,archiveSha256:digest(bytes),groups:{},errors:[]};
 report.packs.push(packResult);
 try{
  const picker=d.getElementById('projectGatewayFile'),file={name,size:bytes.length,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};
  const guard=services.ProjectStore.serialize();Object.defineProperty(picker,'files',{configurable:true,value:[file]});
  picker.dispatchEvent(new w.Event('change',{bubbles:true}));await wait(()=>!services.ProjectGatewayUI.getState().busy);
  const receipt=services.ProjectGatewayUI.report();assert.equal(receipt?.kind,'extraction',d.getElementById('projectGatewayStatus').textContent);
  assert.equal(receipt.source.sha256,packResult.archiveSha256);assert.equal(services.ProjectStore.serialize(),guard);
  const pack=services.ProjectGateway.extraction(receipt);packResult.title=pack.report.game;packResult.declaredSource=pack.report.rom.sha256;
  for(const [kind,paths] of Object.entries(pack.files)){
   const group={listed:paths.length,validated:0,previews:0};packResult.groups[kind]=group;
   for(const p of paths){
    try{
     const rec=await pack.entry(p);assert.equal(rec.kind,kind);
     if(['map','room','resource','capture','collision','pose','animationProject'].includes(kind)){const image=await pack.preview(p);assert.ok(image&&image.size>24,'Missing PNG');group.previews++;}
     group.validated++;
    }catch(err){packResult.errors.push({kind,path:p,message:err.message});}
   }
  }
  assert.equal(services.ProjectStore.serialize(),guard);
  if(pack.files.map.length){
   const select=d.getElementById('extractionGroup');select.value='map';select.dispatchEvent(new w.Event('change'));
   await wait(()=>d.getElementById('extractionSummary').textContent.includes('cells'),'map summary');
   assert(d.getElementById('extractionOpenProject').disabled);packResult.mapPreviewControl=true;
  }
  for(const kind of ['project','animationProject','nativeProject','audioProject'].filter(kind=>pack.files[kind]?.length)){
   const select=d.getElementById('extractionGroup');select.value=kind;select.dispatchEvent(new w.Event('change'));
   await wait(()=>!d.getElementById('extractionOpenProject').disabled,'editable project selection');
   const target=d.getElementById('extractionResource').value,expected=(await pack.entry(target)).data.projectName;
   d.getElementById('extractionOpenProject').click();assert.equal(services.ProjectStore.capture().projectName,expected);
   assert(services.ProjectGatewayUI.getState().ready);packResult[kind+'OpenedByControl']=true;
  }
 }catch(e){packResult.errors.push({message:e.message});}
 console.log(packResult.title||name,JSON.stringify(packResult.groups),'errors',packResult.errors.length,JSON.stringify(packResult.errors.slice(0,2)));
}
await pause();
report.errors=[...dom.errors,...dom.consoleErrors,...dom.domErrors];
report.passed=report.packs.length>0&&report.packs.every(p=>!p.errors.length)&&!report.errors.length;
if(output)fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
w.close();process.exitCode=report.passed?0:1;
})().catch(err=>{console.error(err);process.exitCode=1;});
