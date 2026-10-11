#!/usr/bin/env node
'use strict';
// Build the external editable Audio Runtime example through the complete app.
// The example remains package data and is never embedded as a startup fixture.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),{loadForge}=require('../tests/harness.cjs'),{worldProject}=require('../tests/world-fixtures170.cjs');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'),'utf8')),h=loadForge(path.join(root,manifest.output)),rows=32;
const cell=()=>({note:-1,inst:-1,vol:-1,fx:0,fxp:0}),pattern=()=>({rows:Array.from({length:rows},()=>Array.from({length:5},cell))}),patterns=[pattern(),pattern(),pattern()];
const put=(patternIndex,row,channel,note,inst,vol=15)=>patterns[patternIndex].rows[row][channel]={note,inst,vol,fx:0,fxp:0};
// Two short tracker phrases plus a noise-channel sword SFX.
[[0,57],[4,60],[8,64],[12,69],[16,67],[20,64],[24,60],[28,57]].forEach(([row,note])=>put(0,row,0,note,0));
[[0,57],[4,62],[8,65],[12,69],[16,65],[20,62],[24,59],[28,57]].forEach(([row,note])=>put(1,row,0,note,0));
for(const row of[0,8,16,24]){put(0,row,1,45,1,12);put(1,row,1,row===16?43:45,1,12);put(0,row,2,33,1,11);put(1,row,2,row===16?31:33,1,11);put(0,row,3,row===8||row===24?36:48,2,10);put(1,row,3,row===8||row===24?36:48,2,10);}
put(2,0,3,60,2);put(2,2,3,48,2,12);put(2,4,3,36,2,8);patterns[2].rows[5][3]={note:-2,inst:-1,vol:-1,fx:0,fxp:0};
const project=worldProject();project.projectName='Scout Audio Runtime';project.audioRuntime={enabled:true,musicEnabled:true};project.audRows=rows;project.tempo=150;project.speed=6;project.patterns=patterns;project.orderList=[[0,0,0,0,0],[1,1,1,1,0]];
project.instruments=[
 {name:'Scout Lead',volEnv:[15,13,11,9,7],dutyEnv:[2],arpEnv:[0],pitchEnv:[0],loopVol:2,loopArp:0},
 {name:'Bass',volEnv:[13,11,9],dutyEnv:[1],arpEnv:[0],pitchEnv:[0],loopVol:1,loopArp:0},
 {name:'Noise',volEnv:[15,10,6,3,0],dutyEnv:[2],arpEnv:[0],pitchEnv:[0],loopVol:-1,loopArp:0}
];
project.sfx=[{id:'sword_swing',name:'Sword Swing',channel:3,pattern:2,startRow:0,endRow:5}];
h.context.example180=project;h.run('db_deserializeState(example180)');const source=h.json('Forge.services.ProjectStore.capture()'),artifact=h.run('Forge.services.RuntimeCompiler.compile()',30000),base=path.join(root,'examples/Scout_Audio_Runtime_1.8');
fs.writeFileSync(base+'.nesforge.json',JSON.stringify(source,null,2)+'\n');fs.writeFileSync(base+'.nes',artifact.rom);
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex'),report={release:'1.8',htmlSha256:hash(fs.readFileSync(path.join(root,manifest.output))),project:path.relative(root,base+'.nesforge.json'),projectSha256:hash(fs.readFileSync(base+'.nesforge.json')),rom:path.relative(root,base+'.nes'),romSha256:hash(artifact.rom),romBytes:artifact.rom.length,engineBytes:artifact.world.dataEnd-0x8000,sourceRecordBytes:artifact.metadata.sourceRecordBytes,worlds:artifact.world.spec.worlds.length,screens:artifact.world.spec.screens.length,instruments:source.instruments.length,patterns:source.patterns.length,sfx:source.sfx.length};
fs.writeFileSync(base+'.build.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
