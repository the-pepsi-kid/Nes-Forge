'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),html=path.resolve(process.argv[2]||path.join(root,'mainline/NES_Forge_1.6.7_Architecture_Convergence.html'));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),tests=[],test=(name,fn)=>tests.push({name,fn});
test('The supplied manifest and source hashes reproduce the exact tested standalone HTML',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'))),inputs=JSON.parse(fs.readFileSync(path.join(root,'build-inputs.json')));
 assert.equal(new Set(manifest.parts).size,manifest.parts.length);assert.equal(inputs.inputs.length,manifest.parts.length);
 const bytes=manifest.parts.map((part,index)=>{const file=path.resolve(root,part);assert.ok(file.startsWith(root+path.sep));const b=fs.readFileSync(file);assert.deepEqual(inputs.inputs[index],{path:part,sha256:hash(b),bytes:b.length});return b;});
 assert.deepEqual(Buffer.concat(bytes),fs.readFileSync(html));assert.equal(inputs.sha256,hash(fs.readFileSync(html)));
 const result=cp.spawnSync('python3',[path.join(root,'tools/bundle.py'),'--check'],{cwd:root,encoding:'utf8'});assert.equal(result.status,0,result.stderr||result.stdout);
});
for(const defect of ['missing source','duplicate source'])test('Bundling rejects '+defect+' without replacing an existing release',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'forge-bundle-'));
 try{
  fs.mkdirSync(path.join(temp,'tools'));fs.copyFileSync(path.join(root,'tools/bundle.py'),path.join(temp,'tools/bundle.py'));
  fs.writeFileSync(path.join(temp,'part.js'),'source');fs.writeFileSync(path.join(temp,'release.html'),'existing reviewed artifact');
  fs.writeFileSync(path.join(temp,'source-manifest.json'),JSON.stringify({release:'test',output:'release.html',parts:defect==='missing source'?['missing.js']:['part.js','part.js']}));
  const result=cp.spawnSync('python3',[path.join(temp,'tools/bundle.py')],{cwd:temp,encoding:'utf8'});assert.notEqual(result.status,0);assert.match(result.stderr,/Missing|Duplicate/);assert.equal(fs.readFileSync(path.join(temp,'release.html'),'utf8'),'existing reviewed artifact');
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
test('The extracted Scout fixture matches the frozen starter and is absent from production sources',()=>{
 const baseline=fs.readFileSync(path.join(root,'baseline/NES_Forge_1.6.6_Visual_Workspace.html'),'utf8'),match=baseline.match(/const STARTER=(\{[^\n]+\});/);assert.ok(match,'Frozen embedded fixture is available');
 const fixture=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/scout166.json')));assert.deepEqual(fixture,JSON.parse(match[1]));
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json')));assert.ok(manifest.parts.every(p=>!p.startsWith('tests/')&&!p.startsWith('examples/')&&!p.startsWith('work/')));
 const production=fs.readFileSync(html,'utf8');assert.doesNotMatch(production,/const\s+(?:SCOUT_)?STARTER\s*=/);assert.ok(!production.includes(match[1]));
});
const results=[];for(const {name,fn}of tests){try{fn();results.push({name,passed:true});console.log('PASS '+name);}catch(error){results.push({name,passed:false,error:error.stack});console.log('FAIL '+name+'\n'+error.message);}}
const passed=results.filter(r=>r.passed).length,report={suite:'convergence-source167',scope:'Release reproduction, fail-closed bundling and external fixture provenance.',passed,total:results.length,results};
const output=process.env.FORGE_TEST_REPORT||process.argv[3];if(output)fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(passed+'/'+results.length+' passed');process.exitCode=passed===results.length?0:1;
