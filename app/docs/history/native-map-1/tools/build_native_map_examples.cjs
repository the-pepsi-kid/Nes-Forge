#!/usr/bin/env node
'use strict';
// Reproduce both projects through the shipped decoder, canonical editor and compiler.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {loadForge}=require('../tests/harness.cjs');
const root=path.resolve(__dirname,'..'),sha=data=>crypto.createHash('sha256').update(data).digest('hex');
function writeJSON(file,value){fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');}
function record(out,file){const bytes=fs.readFileSync(path.join(out,file));return{file,byteLength:bytes.length,sha256:sha(bytes)};}
async function buildExamples(htmlInput,outInput){
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'))),html=path.resolve(htmlInput||path.join(root,manifest.output)),out=path.resolve(outInput||path.join(root,'examples/RE_Native_Map'));
 fs.mkdirSync(out,{recursive:true});
 const h=loadForge(html,{environment:{crypto:crypto.webcrypto}});if(h.errors.length)throw Error(h.errors.join('\n'));h.context.setTimeout=(fn,ms)=>ms===0?setImmediate(fn):1;
 const s=h.context.Forge.services,inputFile='examples/RE_Native_Map/DABG-reproduced.nes',rom=new Uint8Array(fs.readFileSync(path.join(root,inputFile))),originalHash=sha(rom),before=s.ProjectStore.serialize();
 const analysis=await s.REAnalysis.open(rom,{name:'DABG-reproduced.nes'}),resources=await s.RENativeMap.listResources(analysis,s.RENativeMap.methodId),eligible=resources.filter(r=>r.supported);
 if(eligible.length!==1)throw Error('The pinned original input must retain its single declared static map subset.');
 const stage=await s.RENativeMap.stage(analysis,s.RENativeMap.methodId,{resourceKey:eligible[0].key,expectedSourceSha256:originalHash});
 if(s.ProjectStore.serialize()!==before||sha(rom)!==originalHash)throw Error('Staging changed its inputs.');
 const outputs=[];
 s.ProjectStore.load(stage.project);
 const first=s.RuntimeCompiler.compile();if(sha(first.rom)!==stage.previewBuild.sha256)throw Error('Ordinary compilation differs from the detached preview.');
 function save(stem,description){
  const text=s.ProjectStore.serialize(),artifact=s.RuntimeCompiler.compile();s.ProjectStore.load(text);const again=s.RuntimeCompiler.compile();if(sha(again.rom)!==sha(artifact.rom)||s.ProjectStore.serialize()!==text)throw Error('Saved example does not reproduce.');
  fs.writeFileSync(path.join(out,stem+'.nesforge.json'),text+'\n');fs.writeFileSync(path.join(out,stem+'.nes'),Buffer.from(artifact.rom));
  outputs.push({name:stem,description,backend:artifact.backend,project:record(out,stem+'.nesforge.json'),rom:record(out,stem+'.nes')});
 }
 save('DABG_Static_Map','Recovered raw static geometry and fixed binary collision; authored 8×8 test player and Forge physics.');
 // These are canonical Collision-tab operations, not a native-ROM patch.
 const floorTiles=[...new Set(stage.scene.nt.filter((tile,index)=>stage.report.collision.values[index]===1))];
 h.get('colPropSel').value='0';for(const tile of floorTiles)h.run('col_setTileProp('+tile+')');
 save('DABG_Static_Map_Floor_Opened','Canonical Collision-tab edit clears the recovered floor tiles. The test player falls under Forge physics; retained recovery evidence still describes the original source.');
 writeJSON(path.join(out,'DABG_Static_Map.recovery.json'),stage.report);
 const report={format:'NESForgeNativeMapExamples',version:1,release:manifest.release,candidate:'native-map-1',html:path.relative(root,html).split(path.sep).join('/'),htmlSha256:sha(fs.readFileSync(html)),source:{file:inputFile,sha256:originalHash,byteLength:rom.length,generalAnalysisStatus:analysis.report.header.status},method:stage.report.method,resourceKey:stage.report.resourceKey,referencedResources:resources.length,convertibleResources:eligible.length,region:stage.report.region,solidCells:stage.report.collision.solidCells,previewBuild:stage.previewBuild,editedCollisionTileIds:floorTiles,outputs,evidence:record(out,'DABG_Static_Map.recovery.json'),limitations:stage.report.limitations,scope:'Generation verifies actual decoder/stage, ordinary build parity, canonical Collision-tab edit and exact save/reopen/rebuild. Native CPU proof and generated movement checks are in the test suites. No original-game reconstruction, browser or hardware acceptance.'};
 writeJSON(path.join(out,'Manifest.json'),report);
 fs.writeFileSync(path.join(out,'README.txt'),[
  'NES Forge '+manifest.release+' — Native map and collision examples','',
  'Open DABG_Static_Map.nesforge.json with normal Open Project, then Build & Run.',
  'The source map contains a 14-metatile floor. The separate project includes an authored square test player and existing Forge movement. Original actors, game objectives, physics, audio and decoration are not recreated.',
  'Open DABG_Static_Map_Floor_Opened.nesforge.json to see the canonical collision edit: the floor graphics remain, but their collision is Empty and the test player falls. Recovery evidence deliberately continues to describe the original source.',
  'Both files are schema-12 projects; edit them and use Save Project As normally. The paired .nes files are actual generated Forge single-room ROMs.',
  '',
  'To recover from the original ROM: open DABG-reproduced.nes for General Analysis, discover recovery methods, select the command-metatile map conversion, choose Find maps, select its eligible static resource, then Preview. Review and acknowledge the adaptation before Import as new scene.',
  'Import appends an excluded scene without a player or new runtime settings. Download map project provides the separate playable adaptation. Evidence JSON is not a project file.',
  'There are 22 referenced unique map resources; one fits this initial binary subset. Other native behaviors have explicit refusal reasons. This is a reusable structural format method, not a game-name/hash allowlist or universal recovery.',
  'The original NES2/CHR-RAM cartridge remains byte-for-byte intact. General Analysis recognizes its valid NES2 header and NROM mapping, with runtime CHR-RAM contents unknown; the existing frontend emulator does not gain NES2 loading from this method.',
  'The recovered image is raw command-map geometry with proven reset palette/CHR upload, before native random clouds/grass decoration and later updates.',
  '',
  'Source and licensing: NES_Forge_A2_Native_Map_Input_Checkpoint.zip contains all original pinned source/assets, mixed upstream notices including GPL audio components, full GPL text, pinned offline toolchain source, exact builds and independent native CPU evidence. Input_Provenance.json records immutable pins. Original native audio code is not incorporated into the Forge application.',
  'Manifest.json records actual source, project, ROM and current HTML hashes. Regenerate: node tools/build_native_map_examples.cjs',''
 ].join('\n'));
 return report;
}
module.exports={buildExamples};
if(require.main===module)buildExamples(process.argv[2],process.argv[3]).then(report=>console.log(JSON.stringify(report,null,2))).catch(error=>{console.error(error.stack||error);process.exitCode=1;});
