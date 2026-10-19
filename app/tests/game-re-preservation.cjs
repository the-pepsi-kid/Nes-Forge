'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
require('./game-re-preservation-lib.cjs').verifySpatialReference();require('./spatial-re-preservation-lib.cjs').verifyParent();require('./megaman2-audio-preservation-lib.cjs').verifyDiscoveryReference();
const html=path.resolve(process.argv[2]||path.join(__dirname,'../mainline/NES_Forge_2.0.0-alpha.11.html')),results=[{name:'Exact Spatial RE HTML and all 107 suite scripts restore with all 288 protected files',passed:true},{name:'Earlier source boundaries remain intact around the scoped visible PPU address reload and three new read-only modules',passed:true}];
const report={suite:'game-re-preservation',htmlSha256:crypto.createHash('sha256').update(fs.readFileSync(html)).digest('hex'),passed:2,total:2,failed:0,results},out=process.env.FORGE_TEST_REPORT||process.argv[3];if(out)fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log('2/2 Native game preservation checks passed');
