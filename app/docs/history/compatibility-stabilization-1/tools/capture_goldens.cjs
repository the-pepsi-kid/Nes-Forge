#!/usr/bin/env node
'use strict';
// Frozen inputs and byte output, captured through the complete unmodified app.
// This utility never rewrites an app function or bypasses the active build path.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {loadForge}=require('../tests/harness.cjs');
const fixtures=require('../tests/fixtures.cjs');
const root=path.resolve(__dirname,'..');
const BASELINE_SHA256='d9e3c44d0349e50cca1be800a630486bba1ad9584623c99a81f84bf058df33cb';
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const plain=value=>JSON.parse(JSON.stringify(value));
function inputs(){
  const viewer=fixtures.project(); viewer.version=7;viewer.worlds=[];viewer.animations=[];viewer.metasprites=[];
  viewer.projectName='Golden packed viewer';
  const packedASM=plain(viewer);packedASM.projectName='Golden packed custom ASM';packedASM.asmSource=fixtures.collisionASM;
  const unpackedASM=plain(viewer);unpackedASM.projectName='Golden unpacked custom ASM';unpackedASM.asmSource=fixtures.customASM;unpackedASM.packScenes=false;
  const world=fixtures.composedProject();world.version=7;world.projectName='Golden reordered world assets';
  const second=fixtures.scene('scene-b');second.buildOrder=0;world.scenes[0].buildOrder=1;second.nt[20]=2;world.scenes.push(second);
  world.scenes[0].entities=[{id:'actor-a',type:'player',name:'Bound actor',x:32,y:48,w:16,h:24,sprTile:1,
    animationBinding:{defaultState:'walk',facing:'left',states:[{state:'walk',animationId:'walk'}]}}];
  world.scenes[0].links=[{x:1,y:1,target:1,spawnX:20,spawnY:30}];
  world.worlds[1].tilesetSceneId='scene-b';
  world.animations[0].frames[0].hitboxes=[{id:'hit-a',name:'Contact',x:-4,y:-14,w:16,h:8}];
  world.animations[0].frames[0].hurtboxes=[{id:'body-a',name:'Body',x:-4,y:-16,w:8,h:16}];
  world.animations[0].frames[0].events=[{id:'event-a',type:'sound',name:'Marker',value:'test'}];
  const poc=JSON.parse(fs.readFileSync(path.join(root,'examples/Scout_Authored_in_Editor_1.6.6.nesforge.json'),'utf8'));
  return [
    {id:'packed-viewer',description:'Generated 16 KB scene viewer, packed NFEX/MT16, CHR, palette, OAM and collision',project:viewer},
    {id:'packed-custom-asm',description:'Packed custom 6502 ASM, occupied metadata start relocates extension',project:packedASM},
    {id:'unpacked-custom-asm',description:'Unpacked custom 6502 ASM and raw CHR bank output',project:unpackedASM},
    {id:'packed-world-assets-reordered',description:'Reordered scenes, remapped links, WR16 v3 cross-world destinations, MS16 v2 poses and contacts/events',project:world},
    {id:'single-room-poc',description:'Existing authored Scout 32 KB single-room proof of concept; no runtime extension',project:poc}
  ];
}
function buildCase(htmlPath,project){
  const h=loadForge(htmlPath);assert.deepEqual(h.errors,[],'application startup error');
  h.context.goldenProject=plain(project);
  h.run('db_deserializeState(goldenProject);window._buildAndRunMode=true;',10000);
  const rom=h.run('buildNesRom()',15000);
  assert.ok(rom instanceof Uint8Array,'No ROM: '+h.errors.join('; ')+' '+h.get('buildLog').children.map(x=>x.textContent).join('; '));
  assert.deepEqual(h.metrics(),{objectURLs:0,downloadClicks:0},'building in run mode must not request export');
  h.context.goldenRom=rom;
  const header=h.json('parseRomHeader(goldenRom)');
  const bytes=Buffer.from(rom);
  const signatures={};
  for(const signature of ['NFORGE15','NFEX','MT16','WR16','MS16','GP16'])signatures[signature]=bytes.indexOf(Buffer.from(signature));
  const metadata={header,signatures,worlds:h.json('Forge161.build.inspectWorldRom(goldenRom.slice(parseRomHeader(goldenRom).headerSize,parseRomHeader(goldenRom).headerSize+parseRomHeader(goldenRom).prgSize),parseRomHeader(goldenRom).prgSize)'),
    assets:h.json('Forge163.build.readRomAssets(goldenRom)'),gameplay:h.json('Forge165.readGameplayRom(goldenRom)')};
  return {bytes,metadata};
}
function captureAll(htmlPath,outDir=path.join(root,'tests/fixtures/golden167')){
  assert.equal(hash(fs.readFileSync(htmlPath)),BASELINE_SHA256,'Capture only from the explicitly frozen 1.6.6 reference');
  fs.mkdirSync(outDir,{recursive:true});
  const records=[];
  for(const input of inputs()){
    const result=buildCase(htmlPath,input.project),repeat=buildCase(htmlPath,input.project);
    assert.ok(result.bytes.equals(repeat.bytes),input.id+' was nondeterministic across fresh app contexts');
    assert.deepEqual(result.metadata,repeat.metadata,input.id+' metadata was nondeterministic');
    const projectFile=input.id+'.project.json',romFile=input.id+'.nes',metadataFile=input.id+'.metadata.json';
    fs.writeFileSync(path.join(outDir,projectFile),JSON.stringify(input.project,null,2)+'\n');
    fs.writeFileSync(path.join(outDir,romFile),result.bytes);
    fs.writeFileSync(path.join(outDir,metadataFile),JSON.stringify(result.metadata,null,2)+'\n');
    records.push({id:input.id,description:input.description,projectFile,projectSha256:hash(fs.readFileSync(path.join(outDir,projectFile))),romFile,bytes:result.bytes.length,sha256:hash(result.bytes),metadataFile,metadataSha256:hash(fs.readFileSync(path.join(outDir,metadataFile)))});
    process.stdout.write('CAPTURE '+input.id+' '+result.bytes.length+' bytes '+hash(result.bytes)+'\n');
  }
  const manifest={format:'NESForgeGoldenBytes',version:1,referenceVersion:'1.6.6',referenceSha256:BASELINE_SHA256,
    captureRoute:'Complete HTML initialization -> db_deserializeState(frozen JSON) -> buildNesRom; each case repeated in a separate fresh application context',
    expectation:'Exact whole-ROM bytes and parsed metadata; no timestamp, identity or schema masks',cases:records};
  fs.writeFileSync(path.join(outDir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');return manifest;
}
if(require.main===module){
  const baseline=path.resolve(process.argv[2]||path.join(root,'baseline/NES_Forge_1.6.6_Visual_Workspace.html'));
  captureAll(baseline,process.argv[3]?path.resolve(process.argv[3]):undefined);
}
module.exports={BASELINE_SHA256,hash,buildCase,captureAll};
