'use strict';
// All core contracts run against the real bundled candidate, never appended source.
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const {loadForge}=require('./harness.cjs');
const app=path.resolve(__dirname,'..'),manifest=require('../source-manifest.json'),html=path.resolve(process.argv[2]||path.join(app,manifest.output)),h=loadForge(html);
assert.equal(h.run('typeof FamiTone2Native.decode'),'function','Bundled native decoder missing');
const sourceState=h.run('JSON.stringify(S)'),emuState=h.run('JSON.stringify(emu)');
const api={
 decode(bytes,options){h.context.nativeTestBytes=bytes;h.context.nativeTestOptions=options;h.run('var nativeTestResult=FamiTone2Native.decode(new Uint8Array(nativeTestBytes),nativeTestOptions)',10000);return h.json('nativeTestResult');},
 patch(bytes,evidence,edits){h.context.nativeTestBytes=bytes;h.context.nativeTestEvidence=evidence;h.context.nativeTestEdits=edits;h.run('var nativeTestPatch=FamiTone2Native.patch(new Uint8Array(nativeTestBytes),nativeTestEvidence,nativeTestEdits)',10000);const result=h.json('({rom:Array.from(nativeTestPatch.rom),sourceSha256:nativeTestPatch.sourceSha256,rebuiltSha256:nativeTestPatch.rebuiltSha256,changes:nativeTestPatch.changes,evidence:nativeTestPatch.evidence})');result.rom=Uint8Array.from(result.rom);return result;}
};
const result=require('./native-audio/native-audio-cases.cjs')(api,path.join(app,'examples/RE_Native_Audio'));
try{assert.equal(h.run('JSON.stringify(S)'),sourceState);assert.equal(h.run('JSON.stringify(emu)'),emuState);assert.deepEqual(h.errors,[]);result.results.push({name:'Bundled core leaves active project and emulator unchanged',passed:true});result.total++;}catch(e){result.results.push({name:'Bundled core leaves active project and emulator unchanged',passed:false,error:e.stack});result.failures.push(result.results.at(-1));result.total++;result.passed=false;}
const apu=require('./native-audio-apu200.cjs')(html);result.results.push(...apu.results);result.total+=apu.total;result.failures.push(...apu.results.filter(r=>!r.passed));result.passed=result.passed&&apu.failed===0;result.apuEvidence={...apu};delete result.apuEvidence.results;
result.htmlSha256=crypto.createHash('sha256').update(fs.readFileSync(html)).digest('hex');
const ok=result.passed;result.failed=result.failures.length;result.passed=result.total-result.failed;const reportPath=process.env.FORGE_TEST_REPORT||process.argv[3];if(reportPath){fs.mkdirSync(path.dirname(path.resolve(reportPath)),{recursive:true});fs.writeFileSync(reportPath,JSON.stringify(result,null,2)+'\n');}console.log(JSON.stringify(result,null,2));process.exitCode=ok?0:1;
