#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {loadForge}=require('./harness.cjs');
const root=path.resolve(__dirname,'..'),html=path.resolve(process.argv[2]||path.join(root,JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'))).output));
const tests=[];
function test(name,fn){const started=Date.now();try{fn();tests.push({name,passed:true,milliseconds:Date.now()-started});console.log('PASS '+name);}catch(error){tests.push({name,passed:false,error:error.stack});console.log('FAIL '+name+'\n'+error.message);}}
function state(h){return h.json('({project:projectData(),undo:undoStack,redo:redoStack,epoch:Forge.services.ProjectStore.state.epoch,id:S.projectId,runtime:{loaded:emu.loaded,running:emu.running,last:Array.from(window._lastBuiltRom||[])}})');}
for(const format of ['NESForgeREInspection','NESForgeREPreviewEvidence','NESForgeRERecovery'])test(format+' rejects as an inspection report before changing the active project',()=>{
  const h=loadForge(html);h.run('snapshot();S.projectId=81;emu.loaded=true;emu.running=true;window._lastBuiltRom=new Uint8Array([9,8,7])');
  const before=state(h);h.context.reportJSON=JSON.stringify({format,version:1,inspection:{},sourceFile:{name:'Bridge_Room.nes'}});
  assert.throws(()=>h.run('Forge.services.ProjectStore.load(reportJSON)'),/RE inspection report, not a Forge project.*RE \/ DISASM.*Download Forge project JSON/);
  assert.deepEqual(state(h),before);
});
test('Native Forge project JSON remains loadable through the same project importer',()=>{
  const h=loadForge(html),project=h.json('projectData()');project.projectName='Native project control';h.context.nativeJSON=JSON.stringify(project);
  assert.equal(h.run('Forge.services.ProjectStore.load(nativeJSON)'),true);assert.equal(h.run('S.projectName'),'Native project control');assert.equal(h.run('S.scenes.length'),1);
});
const passed=tests.filter(t=>t.passed).length,report={suite:'re-report-import',html:path.basename(html),htmlSha256:crypto.createHash('sha256').update(fs.readFileSync(html)).digest('hex'),scope:'Actual standalone app in the Node DOM harness; format-specific diagnostics and atomic project rejection, not browser rendering.',passed,failed:tests.length-passed,total:tests.length,results:tests};
const output=process.env.FORGE_TEST_REPORT||process.argv[3];if(output)fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(passed+'/'+tests.length+' passed');process.exitCode=report.failed?1:0;
