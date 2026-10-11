#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),html=path.resolve(process.argv[2]||path.join(root,JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'))).output));
const results=[];
try{
 require('./source-preservation200.cjs').verifyRuntimeReference();
 results.push({name:'Every bounded stabilization edit reverses to exact alpha.11 and composes through every retained historical source, suite and oracle guard',passed:true});
}catch(error){results.push({name:'Every bounded stabilization edit reverses to exact alpha.11 and composes through every retained historical source, suite and oracle guard',passed:false,error:error.stack});}
const passed=results.filter(item=>item.passed).length,report={suite:'compatibility-preservation',htmlSha256:crypto.createHash('sha256').update(fs.readFileSync(html)).digest('hex'),scope:'Byte-identical reconstruction of pinned original alpha.11 and all nested source-preservation contracts; immutable retained fixtures and 1504-case inventory.',passed,total:results.length,failed:results.length-passed,results};
const output=process.env.FORGE_TEST_REPORT||process.argv[3];if(output){fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');}
for(const item of results)console.log((item.passed?'PASS ':'FAIL ')+item.name+(item.error?'\n'+item.error:''));if(report.failed)process.exitCode=1;
