#!/usr/bin/env node
'use strict';
// Strict release gate: one unchanged standalone candidate, all retained suites,
// fresh reports, no filters, module repair, source fallback, or inferred passes.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const fileHash=file=>hash(fs.readFileSync(file));
const manifestPath=path.join(root,'source-manifest.json');
let release='unverified',html=path.resolve(process.argv[2]||root);
function loadCandidateManifest(){
  requireFile(manifestPath);const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  assert.equal(manifest.format,'NESForgeSourceManifest','Candidate source manifest format');
  assert.equal(manifest.version,1,'Candidate source manifest version');
  assert.ok(typeof manifest.release==='string'&&manifest.release.trim(),'Candidate source manifest needs a release');
  assert.ok(typeof manifest.output==='string'&&manifest.output.trim()&&!path.isAbsolute(manifest.output),'Candidate source manifest needs a relative output');
  const bundled=path.resolve(root,manifest.output);assert.ok(bundled.startsWith(root+path.sep),'Candidate output must remain within the package');
  release=manifest.release;html=path.resolve(process.argv[2]||bundled);
}
const output=path.resolve(process.argv[3]||path.join(root,'test-results/candidate'));
const summaryPath=path.join(output,'Summary.json');
const expectedBaseline=['world-codec','regression','metasprites','composer-interactions','model164','frame-editor164','entity-studio164','persistence164','compiler165','ui165','persistence165','gameplay165','engine165','project166','placement166','native-ui166','native-authoring166'];
const additional=[['project-store167','tests/project-store167.cjs'],['lifecycle167','tests/lifecycle167.cjs'],['golden-parity167','tests/golden-parity167.cjs'],['services167','tests/services167.cjs'],['rom-compat167','tests/rom-compat167.cjs'],['convergence-source167','tests/convergence-source167.cjs'],['world-runtime170','tests/world-runtime170.cjs'],['audio-runtime180','tests/audio-runtime180.cjs'],['gameplay-core190','tests/gameplay-core190.cjs'],['emulator-input-mobile','tests/emulator-input-mobile.cjs'],['emulator-play-ui-mobile','tests/emulator-play-ui-mobile.cjs'],['re-bridge-model','tests/re-bridge-model.cjs'],['re-bridge-ui','tests/re-bridge-ui.cjs'],['re-bridge-runtime','tests/re-bridge-runtime.cjs'],['re-report-import','tests/re-report-import.cjs'],['emulator-timeline','tests/emulator-timeline.cjs'],['emulator-timeline-ui','tests/emulator-timeline-ui.cjs'],['emulator-timeline-runtime','tests/emulator-timeline-runtime.cjs'],['re-analysis-model','tests/re-analysis-model.cjs'],['re-analysis-ui','tests/re-analysis-ui.cjs'],['re-analysis-integration','tests/re-analysis-integration.cjs'],['re-runtime','tests/re-runtime.cjs'],['re-runtime-ui','tests/re-runtime-ui.cjs'],['re-runtime-integration','tests/re-runtime-integration.cjs'],['audio-correction200','tests/audio-correction200.cjs'],['mobile-playback200','tests/mobile-playback200.cjs'],['mobile-keyboard200','tests/mobile-keyboard200.cjs'],['audio-adaptive200','tests/audio-adaptive200.cjs']];
additional.push(...JSON.parse(fs.readFileSync(path.join(root,'roadmap-suites.json'),'utf8')));
const nativeAudioSuites=JSON.parse(fs.readFileSync(path.join(root,'native-audio-suites.json'),'utf8'));
additional.push(...nativeAudioSuites);
const nativeAudioImportSuites=JSON.parse(fs.readFileSync(path.join(root,'native-audio-import-suites.json'),'utf8'));
additional.push(...nativeAudioImportSuites);
const recoveryMethodsSuites=JSON.parse(fs.readFileSync(path.join(root,'recovery-methods-suites.json'),'utf8'));
additional.push(...recoveryMethodsSuites);
const seededMashupSuites=JSON.parse(fs.readFileSync(path.join(root,'seeded-mashup-suites.json'),'utf8'));
additional.push(...seededMashupSuites);
const movementRulesSuites=JSON.parse(fs.readFileSync(path.join(root,'movement-rules-suites.json'),'utf8'));
additional.push(...movementRulesSuites);
const compatibilitySuites=JSON.parse(fs.readFileSync(path.join(root,'compatibility-stabilization-suites.json'),'utf8'));
additional.push(...compatibilitySuites);
function requireFile(file){assert.ok(fs.existsSync(file)&&fs.statSync(file).isFile(),'Required package file is missing: '+path.relative(root,file));}
function discoverBaselineJobs(){
  const runner=path.join(__dirname,'run_frozen.cjs');requireFile(runner);
  const match=fs.readFileSync(runner,'utf8').match(/const jobs=\[([\s\S]*?)\n\];/);
  assert.ok(match,'Retained runner must contain its explicit baseline jobs manifest');
  const jobs=[...match[1].matchAll(/\[\s*'([^']+)'\s*,\s*'([^']+)'\s*\]/g)].map(m=>[m[1],m[2]]);
  assert.deepEqual(jobs.map(j=>j[0]),expectedBaseline,'All 17 retained baseline suites must remain present and ordered');return jobs;
}
function walk(dir){
  requireDirectory(dir);const result=[];for(const item of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const file=path.join(dir,item.name);if(item.isDirectory())result.push(...walk(file));else if(item.isFile())result.push(file);}return result;
}
function requireDirectory(dir){assert.ok(fs.existsSync(dir)&&fs.statSync(dir).isDirectory(),'Required package directory is missing: '+path.relative(root,dir));}
function inputProvenance(jobs){
  const files=new Set([__filename,path.join(__dirname,'run_all.cjs'),path.join(__dirname,'run_frozen.cjs'),path.join(__dirname,'harness.cjs'),path.join(__dirname,'fixtures.cjs'),path.join(__dirname,'composer-cases.cjs'),path.join(__dirname,'version-expectations.cjs'),path.join(__dirname,'preserved-source.json'),path.join(__dirname,'source-preservation200.cjs'),path.join(__dirname,'world-fixtures170.cjs'),path.join(root,'source-manifest.json'),path.join(root,'build-inputs.json'),path.join(root,'roadmap-modules.json'),path.join(root,'roadmap-suites.json'),path.join(__dirname,'roadmap-preservation.cjs'),path.join(__dirname,'retained-suite-counts.json'),path.join(__dirname,'retained-alpha6-suite-counts.json'),path.join(__dirname,'native-audio-preservation.cjs'),path.join(root,'native-audio-modules.json'),path.join(root,'native-audio-suites.json'),path.join(root,'browser-suites.json'),path.join(root,'native-audio-import-modules.json'),path.join(root,'native-audio-import-suites.json'),path.join(__dirname,'retained-alpha8-suite-counts.json'),path.join(__dirname,'native-audio-import-preservation.cjs'),path.join(root,'checkpoints/native-audio-import-1-reference/test-results/candidate/Summary.json'),path.join(root,'checkpoints/roadmap-1-reference/test-results/candidate/Summary.json'),...JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'),'utf8')).parts.map(part=>path.join(root,part)),path.join(root,'tools/capture_goldens.cjs'),path.join(root,'tools/build_world_example.cjs'),path.join(root,'tools/build_audio_example.cjs'),path.join(root,'tools/build_audio_correction_examples.cjs'),path.join(root,'tools/build_gameplay_example.cjs'),...jobs.map(j=>path.join(root,j[1]))]);
  for(const file of ['compatibility-stabilization-modules.json','compatibility-stabilization-suites.json','tests/retained-alpha11-suite-counts.json','tests/compatibility-stabilization-preservation.cjs','tools/generate_compatibility_stabilization_delta.py','tools/build_movement_examples.cjs','movement-rules-modules.json','movement-rules-suites.json','tests/retained-alpha10-suite-counts.json','tests/movement-rules-preservation.cjs','tools/generate_movement_rules_delta.py','tests/browser-movement-rules.cjs','tests/browser-compatibility.cjs','tools/build_mashup_examples.cjs','seeded-mashup-modules.json','seeded-mashup-suites.json','tests/retained-alpha9-suite-counts.json','tests/seeded-mashup-preservation.cjs','tools/generate_seeded_mashup_delta.py','tests/browser-seeded-mashup.cjs','tests/retained-alpha7-suite-counts.json','recovery-methods-modules.json','recovery-methods-suites.json','tests/retained-alpha8-suite-counts.json','tests/recovery-methods-preservation.cjs','tools/generate_recovery_methods_delta.py','tests/browser-recovery-methods.cjs','README.md','PROJECT_CHARTER.md','ARCHITECTURE_CONTRACT.md','DECISION_LOG.md','ROADMAP.md','CURRENT_BASELINE.md','TEST_POLICY.md','HANDOFF.md','package.json','tools/package_release.py','tools/generate_mobile_keyboard_delta.py','tools/generate_audio_adaptive_delta.py','tools/generate_roadmap_delta.py','tests/browser-roadmap.cjs','tests/browser-audio-adaptive.cjs','tests/browser-mobile-play.cjs','tests/browser-re-analysis.cjs','tests/browser-re-runtime.cjs','tests/native-audio-apu200.cjs','tests/browser-native-audio.cjs','tools/generate_native_audio_delta.py','tools/generate_native_audio_import_delta.py','tests/browser-native-audio-import.cjs','tests/native-audio-import-apu200.cjs'])files.add(path.join(root,file));
  for(const dir of ['baseline','examples','tests/fixtures','tests/native-audio','docs','hosted','checkpoints/native-audio-1-reference','checkpoints/native-audio-import-1-reference','checkpoints/recovery-methods-1-reference','checkpoints/seeded-mashup-1-reference','checkpoints/movement-rules-1-reference'])for(const file of walk(path.join(root,dir)))files.add(file);
  // The lifecycle suite uses an independent deterministic browser-storage harness.
  for(const file of fs.readdirSync(__dirname))if(/harness.*\.cjs$/.test(file))files.add(path.join(__dirname,file));
  return [...files].sort().map(file=>{requireFile(file);return {path:path.relative(root,file),bytes:fs.statSync(file).size,sha256:fileHash(file)};});
}
function unchangedInputs(initial){for(const input of initial)assert.equal(fileHash(path.join(root,input.path)),input.sha256,'Test input changed during the run: '+input.path);}
function noSkipped(value,where){
  if(!value||typeof value!=='object')return;
  for(const [key,item]of Object.entries(value)){
    if(/^(?:skip|skipped|todo|pending|filtered|filterApplied)$/i.test(key))assert.ok(item===false||item===0||item===null||item==='',where+' reports '+key);
    if(key==='status'&&typeof item==='string')assert.doesNotMatch(item,/skip|todo|pending|filtered/i,where+' status');
  }
}
function validateReport(name,data,initialHash){
  assert.ok(data&&typeof data==='object'&&!Array.isArray(data),name+' report must be an object');
  assert.equal(data.appendedModule,undefined,name+' must not repair the app by injecting a missing module');
  assert.equal(data.moduleSha256,undefined,name+' must test the standalone candidate alone');
  noSkipped(data,name);
  const cases=Array.isArray(data.results)?data.results:Array.isArray(data.tests)?data.tests:null;
  assert.ok(cases&&cases.length>0,name+' has no explicit measured cases');
  assert.ok(Number.isInteger(data.total)&&data.total>0,name+' needs an explicit positive measured total');
  assert.ok(Number.isInteger(data.passed)&&data.passed>=0,name+' needs an explicit passed count');
  assert.equal(data.total,cases.length,name+' total must equal its case records');
  for(const [i,result]of cases.entries()){assert.ok(result&&typeof result.name==='string'&&result.name.trim(),name+' case '+i+' needs a name');noSkipped(result,name+'/'+result.name);assert.equal(result.passed,true,name+'/'+result.name+' did not pass');}
  const measured=cases.filter(c=>c.passed===true).length;
  assert.equal(data.passed,measured,name+' claimed passed count differs from case records');assert.equal(data.passed,data.total,name+' has failures');
  if(data.failed!==undefined){assert.ok(Number.isInteger(data.failed),name+' failed must be an integer');assert.equal(data.failed,0,name+' reports failures');}
  for(const key of ['sha256','htmlSha256'])if(data[key]!==undefined)assert.equal(data[key],initialHash,name+' tested a different HTML hash');
  for(const key of ['html','source'])if(data[key]!==undefined)assert.equal(path.basename(data[key]),path.basename(html),name+' reports a different candidate');
  return {passed:measured,total:cases.length,failed:0};
}
function main(){
  fs.mkdirSync(output,{recursive:true});
  // Clear owned reports even if required inputs or suite discovery later fail.
  for(const file of [summaryPath,...[...expectedBaseline,...additional.map(j=>j[0])].flatMap(name=>[path.join(output,name+'.json'),path.join(output,name+'.log')])])if(fs.existsSync(file))fs.unlinkSync(file);
  loadCandidateManifest();
  assert.ok(!process.env.FORGE_TEST_FILTER,'FORGE_TEST_FILTER is not permitted by the complete release gate');
  assert.ok(process.argv.length<=4,'Usage: node tests/run_candidate.cjs [candidate.html] [report-directory]');
  requireFile(html);const jobs=[...discoverBaselineJobs(),...additional];
  const retained=JSON.parse(fs.readFileSync(path.join(__dirname,'retained-alpha11-suite-counts.json'))),reference=JSON.parse(fs.readFileSync(path.join(root,'checkpoints/movement-rules-1-reference/test-results/candidate/Summary.json')));
  assert.equal(reference.sha256,'cb216a470954ac8898dcb410eadf1de0eb267287b88c4e757bec3a80284946f1');assert.equal(reference.status,'passed');assert.equal(reference.total,1504);assert.equal(reference.suiteCount,68);assert.deepEqual(retained,Object.fromEntries(reference.suites.map(s=>[s.name,s.total])));
  assert.equal(Object.keys(retained).length,68);assert.equal(Object.values(retained).reduce((n,value)=>n+value,0),1504);assert.equal(new Set(jobs.map(j=>j[0])).size,jobs.length,'Duplicate mandatory suite name');assert.deepEqual(jobs.slice(0,68).map(j=>j[0]),Object.keys(retained),'Every retained alpha.11 suite must remain ordered');assert.equal(jobs.length,68+compatibilitySuites.length);
  require('./compatibility-stabilization-preservation.cjs').verifyMovementRulesReference();
  for(const [,script]of jobs)requireFile(path.join(root,script));
  requireFile(path.join(root,'tests/fixtures/golden167/manifest.json'));requireFile(path.join(root,'baseline/NES_Forge_1.6.6_Visual_Workspace.html'));
  const initialHash=fileHash(html),inputs=inputProvenance(jobs),startedAt=new Date().toISOString(),suites=[];
  const runtime={node:process.version,platform:process.platform,architecture:process.arch};
  let failedSuite=null;
  try{
    for(const [name,script]of jobs){
      failedSuite=name;assert.equal(fileHash(html),initialHash,'The release HTML changed between suites');unchangedInputs(inputs);
      const report=path.join(output,name+'.json'),log=path.join(output,name+'.log'),start=Date.now();
      // Movement previews now perform the complete detached compiler for each case, matching the retained runtime-suite budget.
      const result=cp.spawnSync(process.execPath,[path.join(root,script),html,report],{cwd:root,env:{...process.env,FORGE_TEST_REPORT:report,FORGE_TEST_FILTER:''},encoding:'utf8',timeout:name==='world-runtime170'||name==='audio-correction200'?900000:name==='movement-rules200'||name==='audio-runtime180'||name==='gameplay-core190'||name==='re-bridge-runtime'||name==='emulator-timeline-runtime'||name==='emulator-timeline'?360000:name==='native-authoring166'?360000:180000,maxBuffer:8*1024*1024});
      fs.writeFileSync(log,(result.stdout||'')+(result.stderr||''));
      if(result.error)throw Error(name+' process error: '+result.error.message);
      assert.equal(result.signal,null,name+' was terminated by '+result.signal);assert.equal(result.status,0,name+' exited '+result.status+'; see '+path.relative(root,log));
      if(name==='world-codec')fs.writeFileSync(report,result.stdout);
      requireFile(report);const data=JSON.parse(fs.readFileSync(report,'utf8')),counts=validateReport(name,data,initialHash);
      assert.equal(fileHash(html),initialHash,name+' changed the release HTML');unchangedInputs(inputs);
      suites.push({name,script,...counts,milliseconds:Date.now()-start,scriptSha256:fileHash(path.join(root,script)),report:path.relative(root,report),reportSha256:fileHash(report),log:path.relative(root,log)});
      process.stdout.write('PASS '+name+': '+counts.passed+'/'+counts.total+'\n');
    }
    failedSuite=null;assert.equal(suites.length,expectedBaseline.length+additional.length,'Every required suite must complete');
  }catch(error){
    fs.writeFileSync(summaryPath,JSON.stringify({release,status:'failed',html:path.relative(root,html),sha256:initialHash,startedAt,finishedAt:new Date().toISOString(),runtime,failedSuite,error:error.message,completedSuites:suites,requiredSuites:jobs.map(j=>j[0]),provenance:inputs},null,2)+'\n');throw error;
  }
  const retainedCounts=JSON.parse(fs.readFileSync(path.join(__dirname,'retained-alpha11-suite-counts.json')));for(const [name,count]of Object.entries(retainedCounts))assert.equal(suites.find(s=>s.name===name)?.total,count,'Retained case inventory: '+name);
  const summary={release,status:'passed',html:path.relative(root,html),sha256:initialHash,unchangedCandidate:true,startedAt,finishedAt:new Date().toISOString(),runtime,
    passed:suites.reduce((n,s)=>n+s.passed,0),failed:0,total:suites.reduce((n,s)=>n+s.total,0),suiteCount:suites.length,suites,
    policy:'All 68 retained alpha.11 suites (1504 measured cases), plus every declared Compatibility Stabilization suite, with no filters or skipped cases; totals measured from fresh explicit case records',
    provenance:inputs,browserAcceptance:'Separate evidence is required. This automated VM runner makes no real-browser, native picker, or browser rendering claim.'};
  fs.writeFileSync(summaryPath,JSON.stringify(summary,null,2)+'\n');process.stdout.write(summary.passed+'/'+summary.total+' automated cases passed against unchanged '+initialHash+'\n');
}
module.exports={expectedBaseline,additional,discoverBaselineJobs,validateReport,jobs:()=>[...discoverBaselineJobs(),...additional]};
if(require.main===module)try{main();}catch(error){
  // A missing file, filtered invocation, or malformed manifest cannot leave an
  // older successful Summary.json in place to masquerade as this run's result.
  if(!fs.existsSync(summaryPath)){fs.mkdirSync(output,{recursive:true});fs.writeFileSync(summaryPath,JSON.stringify({release,status:'failed',html:path.relative(root,html),error:error.message,finishedAt:new Date().toISOString()},null,2)+'\n');}
  console.error('FAIL release gate: '+error.message);process.exitCode=1;
}
