#!/usr/bin/env node
'use strict';
// Generate canonical static viewers through the shipped structural recovery APIs.
// Source programs are never patched or embedded in the generated runtime.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {loadForge}=require('../tests/harness.cjs');
const root=path.resolve(__dirname,'..'),sha=data=>crypto.createHash('sha256').update(data).digest('hex');
const sources=[
 {name:'Pepsi',file:'tests/fixtures/re-runtime/pepsi_vending_v9e.nes',methodId:'nes.immediate-ppu-background.v1',description:'Independent Pepsi vending native ROM; bounded reset-linked immediate PPU construction.'},
 {name:'HonkeyPong',file:'examples/RE_Native_Audio/HonkeyPong-reproduced.nes',methodId:'nes.pointer-nametable.v1',description:'Independent HonkeyPong native ROM reproduced from the external source checkpoint; bounded pointer/page nametable construction.'}
];
function writeJSON(filename,value){fs.writeFileSync(filename,JSON.stringify(value,null,2)+'\n');}
function record(out,filename){const data=fs.readFileSync(path.join(out,filename));return{file:filename,sha256:sha(data),bytes:data.length};}
async function buildExamples(htmlInput,outInput){
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'))),html=path.resolve(htmlInput||path.join(root,manifest.output)),out=path.resolve(outInput||path.join(root,'examples/RE_Native_Background'));
 const reference='baseline/NES_Forge_2.0.0-alpha.11_Compatibility_Stabilization.html',referenceSha256=sha(fs.readFileSync(path.join(root,reference))),htmlSha256=sha(fs.readFileSync(html)),outputs=[];
 fs.mkdirSync(out,{recursive:true});
 for(const source of sources){
  const h=loadForge(html,{environment:{crypto:crypto.webcrypto}});if(h.errors.length)throw Error(h.errors.join('\n'));
  h.context.setTimeout=(fn,ms)=>ms===0?setImmediate(fn):1;
  const services=h.context.Forge.services,rom=new Uint8Array(fs.readFileSync(path.join(root,source.file))),sourceSha256=sha(rom),before=services.ProjectStore.serialize();
  const analysis=await services.REAnalysis.open(rom,{name:path.basename(source.file)}),stage=await services.RENativeBackground.stage(analysis,source.methodId,{expectedSourceSha256:sourceSha256});
  const artifact=services.RuntimeCompiler.compileDetached(stage.project,{allowViewer:true});
  if(stage.previewBuild.sha256!==sha(artifact.rom)||stage.previewBuild.byteLength!==artifact.rom.length)throw Error(source.name+' preview and emitted ROM differ.');
  if(services.ProjectStore.serialize()!==before||sha(rom)!==sourceSha256)throw Error(source.name+' staging changed its inputs.');
  // Ordinary project opening must yield the same generated ROM as detached staging.
  const projectText=JSON.stringify(stage.project,null,2)+'\n';services.ProjectStore.load(projectText);
  const ordinary=services.RuntimeCompiler.compile();if(sha(ordinary.rom)!==sha(artifact.rom))throw Error(source.name+' saved project rebuild differs.');
  const stem=source.name+'_Static_Background',projectFile=stem+'.nesforge.json',romFile=stem+'.nes',recoveryFile=stem+'.recovery.json';
  fs.writeFileSync(path.join(out,projectFile),projectText);fs.writeFileSync(path.join(out,romFile),Buffer.from(artifact.rom));writeJSON(path.join(out,recoveryFile),stage.report);
  outputs.push({name:source.name,classification:'canonical static viewer adaptation',source:{file:source.file,sha256:sourceSha256,bytes:rom.length,description:source.description,generalAnalysisStatus:analysis.report.header.status},method:stage.report.method,sceneId:stage.scene.id,backend:artifact.backend,previewBuild:stage.previewBuild,project:record(out,projectFile),rom:record(out,romFile),recovery:record(out,recoveryFile),unknownAttributeIndices:stage.report.unknownAttributeIndices,unknown:stage.report.unknown,limitations:stage.report.limitations});
 }
 const report={format:'NESForgeNativeBackgroundExamples',version:1,release:manifest.release,candidate:'native-background-1',html:path.relative(root,html).split(path.sep).join('/'),htmlSha256,referenceHtml:reference,referenceHtmlSha256:referenceSha256,scope:'Two independent native-source backgrounds converted through the shipped structural methods into separate editable schema-12 projects and generated NROM static viewers. Files preserve source identity and recovery evidence. Generated viewers use canonical palette normalization and rendering defaults; they do not reconstruct original game engines, collision, entities, animation, audio or native program behavior. Generation verifies detached preview and ordinary saved-project ROM equality; runtime pixel verification is in tests/re-native-background.cjs. Browser and physical hardware acceptance are not established.',outputs};
 writeJSON(path.join(out,'Manifest.json'),report);
 fs.writeFileSync(path.join(out,'README.txt'),[
  'NES Forge '+manifest.release+' — Native background examples','',
  'These are separate canonical static viewer adaptations from two independent native ROMs.',
  'Open either *_Static_Background.nesforge.json with normal Open Project, then Build & Run.',
  'Each project contains one editable background scene and builds the accompanying .nes file.',
  'The scene uses ordinary CHR tiles, nametable indices, attribute bytes and NES palettes.',
  'Edit these assets, Save Project As, reopen and rebuild through the normal editor workflow.',
  'The *.recovery.json file records original source identity, bounded structural construction, known coverage, evidence and limitations. The same record is retained in the scene capture metadata.',
  'Recovery evidence describes the original source. Later authored edits change the scene without rewriting that original evidence. It is not a recipe for patching the source ROM.',
  '',
  'The application can also preview a supported original ROM in Recovery Methods and import the reviewed background into the current project. That import appends one scene, defaults it to excluded from the current build and creates one Undo entry.',
  'These standalone examples deliberately include their sole scene in a generated viewer build. World runtime, audio runtime and generated gameplay remain disabled.',
  '',
  'Pepsi uses the immediate PPU construction method. HonkeyPong uses the pointer/page nametable method.',
  'HonkeyPong has a legacy header byte that strict General Analysis continues to treat as raw; its explicit structural method checks the permitted native layout without weakening General Analysis.',
  'HonkeyPong writes 1023 nametable bytes. The unknown final attribute byte is an authored zero placeholder, disclosed in its evidence. Its native left-edge rendering mask is recorded; the static viewer uses ordinary viewer rendering defaults.',
  'NES universal-background palette aliases are represented by the canonical editor palette rules. Unknown collision and game behavior are not inferred from graphics.',
  'No sprites, collision, actors, links, native game engine, audio, animation or scrolling behavior are reconstructed by these static background conversions.',
  '',
  'Manifest.json records the original and current application HTML hashes, each source-ROM hash, and actual project, ROM and recovery-file hashes.',
  'Original source fixtures remain at the repository paths named in Manifest.json. HonkeyPong source/license provenance is retained in examples/RE_Native_Audio.',
  'Automated integration executes the generated 6502 viewers and compares the full background pixels with independently decoded native geometry; this does not establish browser or physical NES acceptance.',
  '',
  'Regenerate with: node tools/build_native_background_examples.cjs',''
 ].join('\n'));
 return report;
}
module.exports={sources,buildExamples};
if(require.main===module)buildExamples(process.argv[2],process.argv[3]).then(report=>console.log(JSON.stringify(report,null,2))).catch(error=>{console.error(error.stack||error);process.exitCode=1;});
