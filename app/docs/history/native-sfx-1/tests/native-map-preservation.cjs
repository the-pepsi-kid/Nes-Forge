#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),html=path.resolve(process.argv[2]||path.join(root,JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'))).output)),results=[];
const name='Exact A2 source and retained-test reversal reconstructs committed native background and every earlier protected source, fixture and golden contract';
try{require('./source-preservation200.cjs').verifyRuntimeReference();results.push({name,passed:true});}catch(error){results.push({name,passed:false,error:error.stack});}
const passed=results.filter(item=>item.passed).length,report={suite:'native-map-preservation',htmlSha256:crypto.createHash('sha256').update(fs.readFileSync(html)).digest('hex'),scope:'Exact committed native-background reference, immutable 1617-case inventory and binary fixtures, nested reconstruction of every historical source guard.',passed,total:results.length,failed:results.length-passed,results};
const output=process.env.FORGE_TEST_REPORT||process.argv[3];if(output){fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');}
for(const item of results)console.log((item.passed?'PASS ':'FAIL ')+item.name+(item.error?'\n'+item.error:''));if(report.failed)process.exitCode=1;
