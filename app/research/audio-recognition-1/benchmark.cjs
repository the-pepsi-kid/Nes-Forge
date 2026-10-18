#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {performance}=require('node:perf_hooks');
const {inspect,compare,sha256}=require('./features.cjs');
const root=path.resolve(__dirname,'../..'),corpus=require('./corpus.json');
const strict=require('../../src/re/famitone2-native.js');
function verifiedFile(relative,expected) {
  const bytes=fs.readFileSync(path.join(root,relative));
  if(sha256(bytes)!==expected)throw new Error('Pinned identity mismatch: '+relative);
  return bytes;
}
function loadCorpus() {
  verifiedFile(corpus.strictDecoder.path,corpus.strictDecoder.sha256);
  verifiedFile(corpus.strictDecoder.profilePath,corpus.strictDecoder.profileSha256);
  for(const item of corpus.provenance) {
    verifiedFile(item.record,item.sha256);
    if(item.checkpoint)verifiedFile(item.checkpoint,item.checkpointSha256);
    for(const source of item.audioSource||[])verifiedFile(source.path,source.sha256);
  }
  const loaded=new Map();
  for(const item of corpus.cases) {
    let bytes;
    if(item.path)bytes=verifiedFile(item.path,item.sha256);
    else {
      const parent=loaded.get(item.parent);if(!parent)throw new Error('Unknown corpus parent');
      bytes=Buffer.from(parent.bytes);
      if(item.transform==='ines-header'){bytes[7]&=~8;bytes.fill(0,8,16);}
      else if(item.transform==='truncate')bytes=bytes.subarray(0,bytes.length-1);
      else {
        const evidence=strict.decode(bytes),driver=evidence.recognition.driver;
        if(evidence.status!=='decoded')throw new Error('Transformation requires a decoded source');
        if(item.transform==='opcode-mutant')bytes[driver.source.fileOffset+driver.symbols._ft2channelupdate-driver.base]^=1;
        else if(item.transform==='chr-decoy') {
          const driverCopy=Buffer.from(bytes.subarray(driver.source.fileOffset,driver.source.fileOffset+driver.source.length));
          bytes.fill(0,16,16+16384);bytes.set(driverCopy,16+16384);
        } else throw new Error('Unknown transformation');
      }
    }
    loaded.set(item.id,{...item,bytes});
  }
  return loaded;
}
function run(options={}) {
  const loaded=loadCorpus(),featureResults=new Map(),cases=[];
  for(const item of loaded.values()) {
    const before=sha256(item.bytes),start=performance.now(),evidence=strict.decode(item.bytes),strictMs=performance.now()-start;
    const featureStart=performance.now(),features=inspect(item.bytes),featureMs=performance.now()-featureStart;
    if(before!==sha256(item.bytes))throw new Error('Analysis mutated input: '+item.id);
    featureResults.set(item.id,features);
    const diagnosticCodes=evidence.diagnostics.map(d=>d.code);
    cases.push({id:item.id,role:item.role,independentProject:item.independentProject||null,derivedFrom:item.parent||null,transform:item.transform||null,sha256:before,byteLength:item.bytes.length,
      strict:{status:evidence.status,diagnosticCodes,expectedStatus:item.expectedStrict,expectationMet:evidence.status===item.expectedStrict&&(!item.expectedDiagnostic||diagnosticCodes.includes(item.expectedDiagnostic)),conversionAuthorizedByBenchmark:false},
      featureStatus:features.status,routineCount:features.routines.length,work:features.work||null,timingsMs:options.timings===false?undefined:{strict:+strictMs.toFixed(3),features:+featureMs.toFixed(3)},
      evidence:features.routines.map(r=>({entryAddress:r.entryAddress,entryFileOffset:r.entryFileOffset,instructionCount:r.instructionCount,fingerprint:r.fingerprint,partial:r.partial,apuWrites:r.apuWrites})),diagnostic:features.diagnostic||null});
  }
  const reference=featureResults.get(corpus.reference),nativeReference=strict.decode(loaded.get(corpus.reference).bytes).recognition.driver;
  // The comparison reference is labeled by the existing strict decoder, not guessed from APU initialization alone.
  const audioReference={...reference,routines:reference.routines.filter(r=>r.entryAddress>=nativeReference.base&&r.entryAddress<nativeReference.base+nativeReference.source.length)};
  for(const result of cases)result.topComparisons=compare(audioReference,featureResults.get(result.id));
  const counts={independentProjects:2,independentFamiTone2Projects:1,independentDifferentEngineProjects:1,sameGameReassemblyVariants:2,syntheticOrHeaderControls:4,officialExporterMapperControls:1,heldOutIndependentSameFamilyProjects:0};
  return {format:'NESForgeAudioRecognitionBenchmark',version:1,strictDecoder:{...corpus.strictDecoder,method:strict.method},featureImplementationSha256:sha256(fs.readFileSync(path.join(__dirname,'features.cjs'))),corpusSha256:sha256(fs.readFileSync(path.join(__dirname,'corpus.json'))),node:process.version,passed:cases.every(c=>c.strict.expectationMet),counts,
    reference:{id:corpus.reference,driverAddress:nativeReference.base,routineCount:audioReference.routines.length},
    conclusions:{strictAccepted:cases.filter(c=>c.strict.status==='decoded').map(c=>c.id),falseAcceptancesInDeclaredControls:cases.filter(c=>c.role.includes('control')||c.role.includes('negative')).filter(c=>c.strict.status==='decoded').length,newFamiliesSupported:0,generalization:'Insufficient corpus: zero held-out independent games using the reference family.',manualEffortReduction:'Not measured.',similarityPolicy:'Candidate ranking only. No score or fingerprint authorizes native decoding or canonical conversion.'},
    limitations:reference.limitations,cases};
}
module.exports={run,loadCorpus,corpus};
if(require.main===module) {
  const args=process.argv.slice(2);let output=null,timings=true;
  for(let i=0;i<args.length;i++) {
    if(args[i]==='--deterministic')timings=false;
    else if(args[i]==='--out'&&args[i+1]&&!args[i+1].startsWith('--'))output=args[++i];
    else throw new Error('Usage: node benchmark.cjs [--deterministic] [--out report.json]');
  }
  const result=run({timings}),text=JSON.stringify(result,null,2)+'\n';
  if(output)fs.writeFileSync(path.resolve(output),text);else process.stdout.write(text);
  if(!result.passed)process.exitCode=1;
}
