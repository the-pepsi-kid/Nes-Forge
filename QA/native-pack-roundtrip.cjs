'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {load}=require('../app/tests/dom-environment.cjs');
const root=path.resolve(__dirname,'..'),editor=process.argv[2]||path.join(root,'NES_Forge.html'),output=process.argv[3],input=process.argv[4];
if(!input)throw Error('Supply the extraction ZIP folder.');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const report={editorSha256:sha(fs.readFileSync(editor)),checks:[]};
(async()=>{
 const env=load(editor),w=env.window,s=w.Forge.services,store=s.ProjectStore;
 for(const name of fs.readdirSync(input).filter(n=>n.endsWith('.zip')).sort()){
  const pack=await s.ExtractionPack.open(w.Uint8Array.from(fs.readFileSync(path.join(input,name))));
  for(const project of pack.files.nativeProject){
   const row={name,passed:false};report.checks.push(row);
   try{
    const record=await pack.entry(project);store.load(record.data,{intent:'native-pack-roundtrip'});
    const saved=store.serialize(),first=sha(s.RuntimeCompiler.compile().rom);assert.equal(first,pack.report.rom.sha256);
    store.initializeBlank();store.load(saved,{intent:'native-pack-reopen'});
    assert.equal(sha(s.RuntimeCompiler.compile().rom),first);row.passed=true;row.outputSha256=first;
   }catch(error){row.error=error.message;}
   console.log(name,row.passed,row.error||'');
  }
 }
 await new Promise(resolve=>setImmediate(resolve));
 report.domErrors=[...env.errors,...env.consoleErrors,...env.domErrors];report.passed=report.checks.filter(r=>r.passed).length;report.total=report.checks.length;
 report.ok=report.passed===report.total&&!report.domErrors.length;
 if(output)fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');w.close();process.exitCode=report.ok?0:1;
})().catch(error=>{console.error(error);process.exitCode=1;});
