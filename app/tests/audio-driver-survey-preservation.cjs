#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),html=path.resolve(process.argv[2]||path.join(root,JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'))).output)),results=[];
function test(name,fn){try{fn();results.push({name,passed:true});}catch(error){results.push({name,passed:false,error:error.stack});}}
test('Audio driver survey exactly reconstructs parent standalone HTML, 97 suites and all 1872 retained case assertions',()=>require('./audio-driver-survey-preservation-lib.cjs').verifyAudioToolImportReference());
test('All earlier source, test, fixture and golden contracts survive nested exact reversal',()=>require('./source-preservation200.cjs').verifyRuntimeReference());
const passed=results.filter(item=>item.passed).length,report={suite:'audio-driver-survey-preservation',htmlSha256:crypto.createHash('sha256').update(fs.readFileSync(html)).digest('hex'),scope:'Pinned Audio Tool Import parent; no changed project, compiler, emulator, audio import or export source; all historical protections retained.',passed,total:results.length,failed:results.length-passed,results};
const output=process.env.FORGE_TEST_REPORT||process.argv[3];if(output){fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');}
for(const item of results)console.log((item.passed?'PASS ':'FAIL ')+item.name+(item.error?'\n'+item.error:''));if(report.failed)process.exitCode=1;
