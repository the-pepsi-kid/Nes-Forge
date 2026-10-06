'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),html=path.resolve(process.argv[2]||path.join(root,JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'))).output));
const output=path.join(root,'test-results');fs.mkdirSync(output,{recursive:true});
const summaryPath=path.join(output,'Summary.json');if(fs.existsSync(summaryPath))fs.unlinkSync(summaryPath);
const sourceHash=()=>crypto.createHash('sha256').update(fs.readFileSync(html)).digest('hex');
const initialHash=sourceHash();
const jobs=[
 ['world-codec','stabilization/tests/world_codec.test.cjs'],
 ['regression','tests/regression.cjs'],
 ['metasprites','tests/metasprites.cjs'],
 ['composer-interactions','tests/composer-interactions.cjs'],
 ['model164','tests/model164.cjs'],
 ['frame-editor164','tests/frame-editor164.cjs'],
 ['entity-studio164','tests/entity-studio164.cjs'],
 ['persistence164','tests/persistence164.cjs'],
 ['compiler165','tests/compiler165.cjs'],
 ['ui165','tests/ui165.cjs'],
 ['persistence165','tests/persistence165.cjs'],
 ['gameplay165','tests/gameplay165.cjs'],
 ['engine165','tests/engine165.cjs'],
 ['project166','tests/project166.cjs'],
 ['placement166','tests/placement166.cjs'],
 ['native-ui166','tests/native-ui166.cjs'],
 ['native-authoring166','tests/native-authoring166.cjs']
];
const suites=[];
for(const [name,script] of jobs){
 const report=path.join(output,name+'.json');
 const args=[path.join(root,script),html,report];
 const r=cp.spawnSync(process.execPath,args,{cwd:root,env:{...process.env,FORGE_TEST_REPORT:report,FORGE_TEST_FILTER:''},encoding:'utf8',timeout:script.includes('native-authoring')?360000:180000,maxBuffer:8*1024*1024});
 fs.writeFileSync(path.join(output,name+'.log'),(r.stdout||'')+(r.stderr||''));
 if(name==='world-codec'&&r.status===0)fs.writeFileSync(report,r.stdout);
 if(r.status!==0){console.error('FAIL '+name+' — see test-results/'+name+'.log');if(r.error)console.error(r.error.message);process.exit(1);}
 const data=JSON.parse(fs.readFileSync(report,'utf8'));
 const passed=data.passed,total=data.total??data.tests?.length??data.results?.length;
 suites.push({name,passed,total});console.log('PASS '+name+': '+passed+'/'+total);
}
if(sourceHash()!==initialHash)throw Error('The release HTML changed during the test run; rerun against an unchanged candidate.');
const summary={html:path.relative(root,html),sha256:initialHash,passed:suites.reduce((n,s)=>n+s.passed,0),total:suites.reduce((n,s)=>n+s.total,0),suites,browserVisualQA:'Not performed: local HTML navigation was blocked by browser policy.',historical344:'Original reported 344 checks were not supplied and are not reproduced by these suites.'};
fs.writeFileSync(summaryPath,JSON.stringify(summary,null,2)+'\n');console.log(summary.passed+'/'+summary.total+' automated cases passed.');
