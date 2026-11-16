'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {load}=require('../app/tests/dom-environment.cjs');
const root=path.resolve(__dirname,'..'),editor=process.argv[2]||path.join(root,'NES_Forge.html'),output=process.argv[3],input=process.argv[4];
if(!input)throw Error('Supply the extraction ZIP folder.');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const report={editorSha256:sha(fs.readFileSync(editor)),checks:[],animationProjects:0};
const env=load(editor),w=env.window,d=env.document,s=w.Forge.services,store=s.ProjectStore;
const file=(name,bytes)=>({name,size:bytes.length,arrayBuffer:async()=>Uint8Array.from(bytes).buffer});
async function test(name,fn){try{const evidence=await fn();report.checks.push({name,passed:true,evidence});}catch(e){report.checks.push({name,passed:false,error:e.message});}console.log(name,report.checks.at(-1).passed,report.checks.at(-1).error||'');}
async function wait(check){const end=Date.now()+30000;while(Date.now()<end){if(check())return;await new Promise(resolve=>setTimeout(resolve,15));}throw Error('Timed out waiting for an archive control.');}
const assets=()=>{const p=store.capture();return JSON.stringify({scenes:p.scenes.map(s=>s.id),metasprites:p.metasprites,animations:p.animations});};
async function archive(entries){return w.Uint8Array.from(new Uint8Array(await w.eval('buildZip')(entries.map(([name,value])=>({name,data:w.Uint8Array.from(Buffer.from(JSON.stringify(value)))}))).arrayBuffer()));}
(async()=>{
 await new Promise(resolve=>setTimeout(resolve,20));
 for(const name of fs.readdirSync(input).filter(n=>n.endsWith('.zip')).sort()){
  const bytes=fs.readFileSync(path.join(input,name)),pack=await s.ExtractionPack.open(w.Uint8Array.from(bytes));
  if(!pack.files.pose.length&&!pack.files.catalog.length&&!pack.files.animationProject.length)continue;
  await test(name+' · pose and source-record browsing preserve the active project',async()=>{
   const before=store.serialize();assert(await s.ProjectGatewayUI.openFile(file(name,bytes)));
   if(pack.files.pose.length){const group=d.getElementById('extractionGroup');group.value='pose';group.dispatchEvent(new w.Event('change'));await wait(()=>d.getElementById('extractionSummary').textContent.includes('Read-only fragment'));assert(d.getElementById('extractionOpenProject').disabled);assert(!d.getElementById('extractionRecordDetails').hidden);}
   if(pack.files.catalog.length){
    const group=d.getElementById('extractionGroup');group.value='catalog';group.dispatchEvent(new w.Event('change'));await wait(()=>d.getElementById('extractionSummary').textContent.includes('source records'));
    const selected=d.getElementById('extractionResource').value,record=await pack.entry(selected),control=d.getElementById('extractionRecord');assert.equal(control.options.length,record.data.length);
    control.value=String(record.data.length-1);control.dispatchEvent(new w.Event('change'));assert.equal(d.getElementById('extractionRecordDetails').textContent,JSON.stringify(record.data.at(-1),null,2));assert(d.getElementById('extractionOpenProject').disabled);
   }
   assert.equal(store.serialize(),before);
   const gaps=Array.isArray(pack.report.problems)?pack.report.problems:[];for(const gap of gaps)assert(s.ProjectGatewayUI.report().limitations.includes('Exported gap: '+gap));
   return {posePreviews:pack.files.pose.length,sourceCatalogs:pack.files.catalog.length,exportedGaps:gaps};
  });
  for(const p of pack.files.animationProject){
   await test(name+' · '+p.slice(pack.root.length)+' saves and reopens with all frame bindings',async()=>{
    const {data}=await pack.entry(p);store.load(data,{intent:'animation-pack-review'});const current=store.capture();
    assert.equal(current.animations.length,data.animations.length);assert.equal(current.metasprites.length,data.metasprites.length);
    const poses=new Set(current.metasprites.map(p=>p.id)),scenes=new Set(current.scenes.map(s=>s.id));
    for(const p of current.metasprites)assert(scenes.has(p.sceneId));
    for(const a of current.animations)for(const f of a.frames)if(f.metaspriteId)assert(poses.has(f.metaspriteId));
    const before=assets(),saved=store.serialize();store.load(saved,{intent:'animation-pack-reopen'});assert.equal(assets(),before);report.animationProjects++;
    return {animations:current.animations.length,poses:current.metasprites.length,frames:current.animations.reduce((n,a)=>n+a.frames.length,0)};
   });
  }
 }
 await test('A sprite project from a different source refuses without replacing the active project',async()=>{
  const current=store.capture();current.scenes[0].captureMeta=JSON.parse(JSON.stringify(current.scenes[0].captureMeta||{}));
  const metadata=current.scenes[0].captureMeta.nativeAssets;if(metadata?.source)metadata.source.sha256='1'.repeat(64);else current.scenes[0].captureMeta={nativeAssets:{source:{sha256:'1'.repeat(64)}}};
  const before=store.serialize(),raw=await archive([['fixture/native_report.json',{format:'NESForgeNativeExtraction',game:'Fixture',rom:{sha256:'0'.repeat(64)}}],['fixture/sprites/wrong.nesforge.json',current]]),pack=await s.ExtractionPack.open(raw);
  await assert.rejects(pack.entry(pack.files.animationProject[0]),/Animation project source differs/);assert.equal(store.serialize(),before);
 });
 await test('Malformed source catalogs and pose fragments refuse as read-only evidence',async()=>{
  const before=store.serialize(),raw=await archive([['fixture/native_report.json',{format:'NESForgeNativeExtraction',game:'Fixture',rom:{sha256:'0'.repeat(64)}}],['fixture/actors.json',[{label:'missing source ID'}]],['fixture/sprites/pose.json',{pose:{id:'pose'},metasprite:{id:'pose',pieces:'bad'},sprPal:[]}]]),pack=await s.ExtractionPack.open(raw);
  await assert.rejects(pack.entry(pack.files.catalog[0]),/catalog record/);await assert.rejects(pack.entry(pack.files.pose[0]),/pose fragment/);assert.equal(store.serialize(),before);
 });
 await new Promise(resolve=>setImmediate(resolve));report.domErrors=[...env.errors,...env.consoleErrors,...env.domErrors];report.passed=report.checks.filter(r=>r.passed).length;report.total=report.checks.length;report.ok=report.passed===report.total&&!report.domErrors.length;
 if(output)fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');w.close();process.exitCode=report.ok?0:1;
})().catch(error=>{console.error(error);process.exitCode=1;});
