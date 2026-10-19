'use strict';
const fs=require('fs'),crypto=require('crypto'),{performance}=require('perf_hooks'),root=require('path').resolve(__dirname,'../..'),{loadForge}=require(root+'/app/tests/harness.cjs'),fixtures=require(root+'/app/tests/fixtures.cjs');
const parentFile=require('path').join(require('os').tmpdir(),'nf-spatial-parent.html');
fs.writeFileSync(parentFile,require('child_process').execFileSync('git',['show','387b99b5f4bec1e05568482c15ef5bbea1ae4527:app/mainline/NES_Forge_2.0.0-alpha.11.html'],{cwd:root,maxBuffer:8*1024*1024}));
const rows=[];
for(let i=0;i<8;i++)for(const [variant,file]of [['spatial-parent',parentFile],['native-game',root+'/app/mainline/NES_Forge_2.0.0-alpha.11.html']]){
 const r={iteration:i,variant},start=performance.now();try{
  const h=loadForge(file);r.startupMs=performance.now()-start;h.context.fixture=fixtures.project();let t=performance.now();h.run('db_deserializeState(fixture); window._buildAndRunMode=true;');r.loadMs=performance.now()-t;t=performance.now();h.run('snapshot();S.projectName="A";undo();snapshot();S.projectName="B";redo()');r.historyMs=performance.now()-t;r.errors=h.errors;
 }catch(e){r.error=e.message;}
 r.totalMs=performance.now()-start;r.memory=process.memoryUsage();rows.push(r);console.log(variant,i,Math.round(r.totalMs),r.error||'ok');
}
fs.writeFileSync(process.argv[2],JSON.stringify({purpose:'Diagnostic startup/history timing comparison, not a replacement for the complete gate',node:process.version,nodeOptions:process.env.NODE_OPTIONS||'',hashes:[parentFile,root+'/app/mainline/NES_Forge_2.0.0-alpha.11.html'].map(p=>({file:p,sha256:crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')})),rows},null,2)+'\n');
