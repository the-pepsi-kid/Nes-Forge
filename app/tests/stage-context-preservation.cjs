'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const html=path.resolve(process.argv[2]||path.join(__dirname,'../mainline/NES_Forge_2.0.0-alpha.11.html'));
require('./stage-context-preservation-lib.cjs').verifyParent();require('./context-cleanup-preservation-lib.cjs').verifyParent();require('./native-world-import-preservation-lib.cjs').verifyParent();
const results=[{name:'Exact published parent HTML and all 118 predecessor suite inventories remain reconstructible',passed:true},{name:'Context cleanup and native World preservation continue through the Stage context source delta',passed:true}],report={suite:'stage-context-preservation',htmlSha256:crypto.createHash('sha256').update(fs.readFileSync(html)).digest('hex'),passed:2,total:2,failed:0,results},out=process.env.FORGE_TEST_REPORT||process.argv[3];if(out)fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log('2/2 Stage context preservation checks passed');
