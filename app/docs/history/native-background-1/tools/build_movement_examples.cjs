#!/usr/bin/env node
'use strict';
// Original editable teaching fixtures, passed through the real Movement Rules
// preview/apply handlers. These are not browser or physical NES evidence.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {loadForge}=require('../tests/harness.cjs'),{worldProject}=require('../tests/world-fixtures170.cjs'),{gameplayProject}=require('../tests/gameplay165.cjs');
const root=path.resolve(__dirname,'..'),sha=value=>crypto.createHash('sha256').update(value).digest('hex');
function fixtureProjects(html){
 return [['World',worldProject()],['Single_Room',gameplayProject({noTarget:true})]].map(([name,project])=>{
  const h=loadForge(html);h.context.movementFixture=project;h.run('db_deserializeState(movementFixture)');
  h.run('S.projectName='+JSON.stringify('Movement Workshop — '+name.replace('_',' ')));
  return h.json('Forge.services.ProjectStore.capture()');
 });
}
function file(recipe,name='Movement.recipe.json'){const text=JSON.stringify(recipe);return{name,size:Buffer.byteLength(text),text:async()=>text};}
async function commitRecipe(h,recipe){const ui=h.context.Forge.services.MovementRulesUI;if(!ui.captureCurrent())throw Error(h.get('movementRulesStatus').textContent);if(!await ui.loadRecipe(file(recipe)))throw Error(h.get('movementRulesStatus').textContent);if(!await ui.apply())throw Error(h.get('movementRulesStatus').textContent);return h.json('Forge.services.ProjectStore.capture()');}
async function buildExamples(htmlInput,outInput){
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'))),html=path.resolve(htmlInput||path.join(root,manifest.output)),out=path.resolve(outInput||path.join(root,'examples/Movement_Rules_'+manifest.release));
 const projects=fixtureProjects(html),names=['World','Single_Room'],inputs=[],outputs=[];fs.mkdirSync(out,{recursive:true});
 for(const [index,project]of projects.entries()){
  const name=names[index],h=loadForge(html);h.context.movementExample=project;h.run('db_deserializeState(movementExample);window._buildAndRunMode=true');
  const model=h.context.Forge.services.MovementRules,source=model.createSource(project),filename=name+'_Base.nesforge.json';fs.writeFileSync(path.join(out,filename),JSON.stringify(project,null,2)+'\n');
  inputs.push({filename,sha256:sha(fs.readFileSync(path.join(out,filename))),sourceSha256:source.sha256,backend:source.backend,projectName:project.projectName});
  for(const [preset,seed]of [['high-jump','FORGE-JUMP-001'],['seeded-mix','FORGE-MOVE-001']]){
   h.run('db_deserializeState(movementExample);undoStack.length=0;redoStack.length=0;undoBytes=0;');
   const result=model.preview(source,{seed,preset,intensity:3}),saved=await commitRecipe(h,result.recipe),artifact=h.run('Forge.services.RuntimeCompiler.compile()',30000),stem=name+'_'+(preset==='high-jump'?'High_Jump':'Seeded_Mix');
   for(const [suffix,value]of [['.nesforge.json',saved],['.recipe.json',result.recipe]])fs.writeFileSync(path.join(out,stem+suffix),JSON.stringify(value,null,2)+'\n');fs.writeFileSync(path.join(out,stem+'.nes'),Buffer.from(artifact.rom));
   outputs.push({source:filename,seed,preset,intensity:3,backend:artifact.backend,project:stem+'.nesforge.json',projectSha256:sha(fs.readFileSync(path.join(out,stem+'.nesforge.json'))),recipe:stem+'.recipe.json',recipeSha256:sha(fs.readFileSync(path.join(out,stem+'.recipe.json'))),rom:stem+'.nes',romSha256:sha(artifact.rom),romBytes:artifact.rom.length,decisions:result.recipe.decisions,changes:result.changes,warnings:result.warnings});
  }
 }
 const report={release:manifest.release,candidate:'movement-rules-1',html:manifest.output,htmlSha256:sha(fs.readFileSync(html)),scope:'Original Scout-derived World and synthetic single-room authoring fixtures, actual Movement Rules recipe/Apply handlers and generated ROM compilation. Browser, listening, mobile/controller/hardware and guaranteed level solvability are not established.',inputs,outputs};fs.writeFileSync(path.join(out,'Manifest.json'),JSON.stringify(report,null,2)+'\n');
 fs.writeFileSync(path.join(out,'README.txt'),[
  'NES Forge '+manifest.release+' — Movement Rules workshop','',
  'Open World_Base.nesforge.json or Single_Room_Base.nesforge.json with normal Open Project.',
  'Expand Movement rules and choose Use current project. Choose a preset, intensity and seed, then Preview.',
  'Review the four exact movement values before Apply. The changes use existing generated physics; the room art and collision data stay authored.',
  'Build & Run to compare travel speed, jump height and fall speed. A jumps; Left/Right move; Start restarts. World examples also use Up at linked exit markers.',
  'Keep uses the source movement values. Sprint changes move speed; High jump changes jump speed/gravity; Slow fall changes gravity/fall cap; Heavy fall changes gravity/fall cap; Seeded mix combines bounded choices.',
  'A lock holds that field from the last verified preview, even when seed/preset/intensity changes. Unlock it to let later previews choose it again.',
  'One Undo restores the project. Save Project As saves the editable result.',
  '',
  'The High_Jump and Seeded_Mix files are complete editable projects and runnable generated ROMs.',
  'To replay a .recipe.json, first open the matching unchanged *_Base.nesforge.json, choose Use current project, then Open saved movement recipe.',
  'Recipes require their exact original project content. They do not include the source assets. Manifest.json binds all file hashes and canonical source identities.',
  '',
  'These rules change only four existing physics settings of the active generated World or single-room runtime. They do not add friction, knockback, automatic death, health rules, timers, new actor templates or arbitrary-ROM recovery.',
  'A changed jump or fall can make an existing route easier, harder or impossible. Technical validation does not establish level solvability.',
  'The full manual remains separate. Browser/mobile controls and physical hardware still need owner testing.',
  '',
  'Regenerate with: node tools/build_movement_examples.cjs',''
 ].join('\n'));return report;
}
module.exports={fixtureProjects,commitRecipe,buildExamples};
if(require.main===module)buildExamples(process.argv[2],process.argv[3]).then(report=>console.log(JSON.stringify(report,null,2))).catch(error=>{console.error(error.stack||error);process.exitCode=1;});
