'use strict';
// Standalone host profile, kept separate from NES cartridge execution.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),html=path.resolve(process.argv[2]||path.join(root,JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'))).output));
require('../hosted/test.cjs').run().then(report=>{report.candidateHtmlSha256=crypto.createHash('sha256').update(fs.readFileSync(html)).digest('hex');report.relationship='Included standalone host-service draft. This suite exercises HTTP/domain/storage; it does not execute the HTML or a cartridge bridge.';const output=process.env.FORGE_TEST_REPORT||process.argv[3];if(output)fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');}).catch(error=>{console.error(error);process.exitCode=1;});
