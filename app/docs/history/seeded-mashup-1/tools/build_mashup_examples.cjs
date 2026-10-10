#!/usr/bin/env node
'use strict';
// Reproducible authoring inputs for Seeded Mashup. These are original Scout
// derivatives, not independently recovered ROM engines or listening evidence.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {loadForge}=require('../tests/harness.cjs'),{worldProject,clone}=require('../tests/world-fixtures170.cjs');
const root=path.resolve(__dirname,'..'),sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const cell=()=>({note:-1,inst:-1,vol:-1,fx:0,fxp:0});
function fixtureProjects(html){
 const h=loadForge(html),p=worldProject();p.version=12;p.projectName='Mashup Workshop — Scout Base';
 h.context.mashupExample=p;h.run('db_deserializeState(mashupExample);S.gameplayCore.enabled=true;S.audioRuntime={enabled:true,musicEnabled:true};');
 const recipes=[['Sideview Player','mashup-player',56,200],['Ground Patrol Enemy','mashup-patrol-a',104,176],['Ground Patrol Enemy','mashup-patrol-b',168,176],['Collectible Pickup','mashup-pickup-a',72,160],['Collectible Pickup','mashup-pickup-b',208,160]];
 for(const [name,idPrefix,x,y] of recipes){h.context.mashupActor={name,idPrefix,x,y};h.run(`(()=>{const r=mashupActor,q=Forge.services.GameplayModel.template(r.name,{idPrefix:r.idPrefix,placement:{kind:'world',worldId:S.worlds[0].id},x:r.x,y:r.y});S.gameplayCore.actorDefinitions.push(...q.actorDefinitions);S.gameplayCore.behaviors.push(...q.behaviors);S.gameplayCore.actorInstances.push(...q.actorInstances);S.gameplayCore.persistentVariables.push(...q.persistentVariables);})()`);}
 const base=h.json('Forge.services.ProjectStore.capture()');
 // Preserve any base SFX definitions and use explicit music instrument cells.
 base.tempo=150;base.speed=6;base.audRows=64;
 if(!base.instruments.length)base.instruments=[{name:'Scout workshop pulse',volEnv:[12],dutyEnv:[2],arpEnv:[0],pitchEnv:[0],loopVol:0,loopArp:0}];
 base.patterns[0]={rows:Array.from({length:64},()=>Array.from({length:5},cell))};
 base.patterns[0].rows[0][0]={note:76,inst:0,vol:15,fx:0,fxp:0};base.patterns[0].rows[4][0]={note:-2,inst:-1,vol:-1,fx:0,fxp:0};
 base.sfx=[{id:'sword_swing',name:'Workshop sword swing',channel:0,pattern:0,startRow:0,endRow:7}];
 base.patterns.push({rows:Array.from({length:64},()=>Array.from({length:5},cell))});
 const music=base.patterns.length-1;for(let row=0;row<64;row+=8)base.patterns[music].rows[row][0]={note:45+(row/8)%4*3,inst:0,vol:12,fx:0,fxp:0};
 base.patterns[music].rows[63][0]={note:-2,inst:-1,vol:-1,fx:0,fxp:0};base.orderList=[[music,music,music,music,music]];
 const projects=[base];
 for(const [index,name,colors] of [[1,'Copper Orchard',[0x0f,0x07,0x17,0x27]],[2,'Moonlit Circuit',[0x0f,0x02,0x12,0x22]]]){
  const donor=clone(base);donor.projectName='Mashup Workshop — '+name;
  for(const scene of donor.scenes){scene.name=name+' tiles';for(const bank of ['chr','sprChr'])scene[bank]=scene[bank].map((tile,ti)=>tile.map((row,y)=>row.map((pixel,x)=>pixel===0?0:1+(pixel+index-1+(ti>23&&(x+y)%3===0?index:0))%3)));
   scene.pal=Array.from({length:4},(_,row)=>[colors[0],colors[1],colors[2],row===3?0x30:colors[3]]);scene.sprPal=clone(scene.pal);scene.bgColor=colors[0];}
  // These donors supply a coherent new song/instrument rather than arbitrary
  // tracker cell fragments. Explicit instruments make inheritance unambiguous.
  donor.instruments=[{name:name+' pulse',volEnv:[15,12,9],dutyEnv:[index],arpEnv:[0],pitchEnv:[0],loopVol:2,loopArp:0}];
  donor.patterns=[{rows:Array.from({length:64},()=>Array.from({length:5},cell))}];donor.sfx=[];
  for(let row=0;row<64;row+=8){donor.patterns[0].rows[row][0]={note:45+index*5+((row/8)%4)*2,inst:0,vol:13,fx:0,fxp:0};donor.patterns[0].rows[row][2]={note:33+index*5,inst:0,vol:10,fx:0,fxp:0};}
  for(const channel of [0,2])donor.patterns[0].rows[63][channel]={note:-2,inst:-1,vol:-1,fx:0,fxp:0};donor.orderList=[[0,0,0,0,0]];
  for(const animation of donor.animations||[])for(const frame of animation.frames||[])frame.events=(frame.events||[]).filter(event=>event.type!=='sound');
  // Keep each active editor mirror consistent with its saved scene.
  for(const key of ['chr','sprChr','nt','attr','pal','sprPal','oam','tileProps'])donor[key]=clone(donor.scenes[donor.activeScene||0][key]);
  projects.push(donor);
 }
 return projects;
}
async function buildExamples(htmlInput,outInput){
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'))),html=path.resolve(htmlInput||path.join(root,manifest.output)),out=path.resolve(outInput||path.join(root,'examples/Seeded_Mashup_'+manifest.release));
 const projects=fixtureProjects(html),h=loadForge(html),names=['Scout_Base','Copper_Orchard_Donor','Moonlit_Circuit_Donor'];fs.mkdirSync(out,{recursive:true});
 h.context.mashupSourcesInput=projects;h.run('var exampleMashupSources=mashupSourcesInput.map(project=>Forge.services.MashupModel.createSource(project,{name:project.projectName}));');
 const inputs=projects.map((project,index)=>{const filename=names[index]+'.nesforge.json',target=path.join(out,filename);fs.writeFileSync(target,JSON.stringify(project,null,2)+'\n');return {filename,sha256:sha(fs.readFileSync(target)),projectName:project.projectName,sourceId:h.run('exampleMashupSources['+index+'].id')};});
 const outputs=[];
 for(const seed of ['FORGE-001','FORGE-002']){
  h.context.mashupSeedInput=seed;
  const preview=h.json('Forge.services.MashupModel.preview(exampleMashupSources,{seed:mashupSeedInput,baseSourceId:exampleMashupSources[0].id,targetSceneId:exampleMashupSources[0].project.scenes[0].id,choices:{background:"random",sprites:"random",palettes:"random",music:"random"},gameplay:{enemyParameters:true,placement:true}})',30000);
  // Exercise the same partial canonical commit as an owner. A wholesale
  // project load can reorder protected base JSON fields in the embedded source
  // record even when all values are equivalent; it is not the mashup UI route.
  h.context.mashupBaseInput=projects[0];h.run('db_deserializeState(mashupBaseInput);window._buildAndRunMode=true');
  const ui=h.context.Forge.services.MashupUI;ui.clearDonors();if(!ui.captureCurrent())throw Error(h.get('mashupStatus').textContent);
  const donorFiles=projects.slice(1).map((project,index)=>{const text=JSON.stringify(project);return{name:names[index+1]+'.nesforge.json',size:Buffer.byteLength(text),text:async()=>text};});
  if(!await ui.loadDonors(donorFiles))throw Error(h.get('mashupStatus').textContent);
  const recipeText=JSON.stringify(preview.recipe);if(!await ui.loadRecipe({name:'Mashup_'+seed+'.recipe.json',size:Buffer.byteLength(recipeText),text:async()=>recipeText}))throw Error(h.get('mashupStatus').textContent);
  if(!await ui.apply())throw Error(h.get('mashupStatus').textContent);
  const saved=h.json('Forge.services.ProjectStore.capture()'),artifact=h.run('Forge.services.RuntimeCompiler.compile()',30000),stem='Mashup_'+seed;
  for(const [suffix,value] of [['.nesforge.json',saved],['.recipe.json',preview.recipe]])fs.writeFileSync(path.join(out,stem+suffix),JSON.stringify(value,null,2)+'\n');fs.writeFileSync(path.join(out,stem+'.nes'),Buffer.from(artifact.rom));
  outputs.push({seed,project:stem+'.nesforge.json',projectSha256:sha(fs.readFileSync(path.join(out,stem+'.nesforge.json'))),recipe:stem+'.recipe.json',recipeSha256:sha(fs.readFileSync(path.join(out,stem+'.recipe.json'))),rom:stem+'.nes',romSha256:sha(artifact.rom),romBytes:artifact.rom.length,backend:artifact.backend,changes:preview.changes,warnings:preview.warnings});
 }
 const report={release:manifest.release,candidate:'seeded-mashup-1',html:manifest.output,htmlSha256:sha(fs.readFileSync(html)),scope:'Scout-derived canonical World projects. Multiple source graphic/music donors, deterministic seeded selection and bounded existing actor variation. Actual generated ROM compilation; no browser, audible output, physical hardware, arbitrary-ROM recovery, or playability guarantee.',inputs,outputs};
 fs.writeFileSync(path.join(out,'Manifest.json'),JSON.stringify(report,null,2)+'\n');
 fs.writeFileSync(path.join(out,'README.txt'),[
  'NES Forge '+manifest.release+' — Seeded Mashup workshop',
  '',
  'Open Scout_Base.nesforge.json with the normal Open Project command.',
  'In SCENE, expand Seeded mashup and choose Use current project.',
  'Add Copper_Orchard_Donor.nesforge.json and Moonlit_Circuit_Donor.nesforge.json as donor files.',
  'Try a seed, Preview mashup, lock the parts you like, and Shuffle unlocked.',
  'For an explicit two-donor result choose Copper background/palettes and Moonlit sprite tiles/music.',
  'Enable patrol speed variation and placement shuffle to vary the existing actors.',
  'Apply is one Undo. Save Project As preserves the editable result; Build & Run runs the generated game.',
  '',
  'The original base has one player, two patrols, two pickups, a music order and a sword_swing SFX.',
  'Patrol/pickup slots are deliberately clear of collision. These are test arrangements, not a promise of level quality.',
  'Copper uses orange/brown palettes and its own pulse/triangle melody. Moonlit uses blue palettes and a different melody.',
  'CHR swaps retain tile indices; scene layouts, map geometry and collision semantics stay with the base.',
  'A selected music donor replaces the music order, tempo and speed; existing SFX definitions stay and share that timing.',
  '',
  'Mashup_FORGE-001 and Mashup_FORGE-002 are generated from all three source projects with random asset choices and enabled gameplay variations.',
  'To open a saved recipe, reload the unchanged Scout Base, capture it again and add BOTH original donors before choosing Open saved mashup recipe.',
  'A recipe requires the complete original source pool. It is not a portable project by itself.',
  'Manifest.json records exact project/recipe/ROM file hashes and canonical project source identities.',
  '',
  'All three inputs are explicit derivatives of the existing Scout authoring fixture; they are not independent ROM engines or automatic commercial-ROM recovery evidence.',
  'The tool tools/build_mashup_examples.cjs deterministically regenerates these files using the bundled candidate.',
  'Automated build/runtime evidence does not replace browser, listening, mobile, controller or physical NES review.',
  ''
 ].join('\n'));return report;
}
module.exports={fixtureProjects,buildExamples};
if(require.main===module)buildExamples(process.argv[2],process.argv[3]).then(report=>console.log(JSON.stringify(report,null,2))).catch(error=>{console.error(error.stack||error);process.exitCode=1;});
