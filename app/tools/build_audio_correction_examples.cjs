#!/usr/bin/env node
'use strict';
// Reproducible review inputs. This creates examples, not listening evidence.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {loadForge}=require('../tests/harness.cjs');
const root=path.resolve(__dirname,'..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json')));
const html=path.join(root,manifest.output),out=path.join(root,'examples/Audio_Correction_'+manifest.release);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const cell=()=>({note:-1,inst:-1,vol:-1,fx:0,fxp:0});
const pattern=n=>({rows:Array.from({length:n},()=>Array.from({length:5},cell))});
const put=(p,row,ch,note)=>p.rows[row][ch]={note,inst:0,vol:15,fx:0,fxp:0};
const instrument={name:'Constant tone',volEnv:[15],dutyEnv:[2],arpEnv:[0],pitchEnv:[0],loopVol:0,loopArp:0};
const base=()=>{const p=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/scout166.json')));p.audioRuntime={enabled:true,musicEnabled:true};p.tempo=150;p.speed=2;p.instruments=[structuredClone(instrument)];delete p.worldRuntime;return p;};
const dense=base();dense.projectName='Audio Correction — Dense 128';dense.audRows=128;dense.patterns=[pattern(128),pattern(128)];
for(let row=0;row<128;row++){put(dense.patterns[0],row,0,45+(row%12));put(dense.patterns[1],row,0,69+(row%12));}
dense.orderList=[[0,0,0,0,0]];dense.sfx=[{id:'sword_swing',name:'Dense 128-row SFX',channel:0,pattern:1,startRow:0,endRow:127}];
const pitch=base();pitch.projectName='Audio Correction — Pulse and Triangle';pitch.audRows=64;pitch.speed=6;pitch.patterns=[pattern(64)];
put(pitch.patterns[0],0,0,57);put(pitch.patterns[0],16,0,-2);put(pitch.patterns[0],16,2,57);
put(pitch.patterns[0],32,2,-2);put(pitch.patterns[0],32,0,69);put(pitch.patterns[0],48,0,-2);put(pitch.patterns[0],48,2,69);
put(pitch.patterns[0],63,2,-2);pitch.orderList=[[0,0,0,0,0]];pitch.sfx=[];
for(const animation of pitch.animations||[])for(const frame of animation.frames||[])frame.events=(frame.events||[]).filter(e=>e.type!=='sound');
fs.mkdirSync(out,{recursive:true});const examples=[];
for(const [name,p,expected] of [['Dense_128',dense,'128 authored rows loop; B triggers the 128-row SFX, then music resumes.'],['Pulse_Triangle',pitch,'Pulse A4, triangle A4, pulse A5, triangle A5; same pitch within each pair, different timbre.']]){
 const h=loadForge(html);h.context.audioExample200=p;h.run('db_deserializeState(audioExample200);window._buildAndRunMode=true');
 const saved=h.json('Forge.services.ProjectStore.capture()'),artifact=h.run('Forge.services.RuntimeCompiler.compile()',30000);
 if(!artifact?.rom||h.errors.length)throw Error(h.errors.join('; ')||'Example failed to build');
 const project=path.join(out,name+'.nesforge.json'),rom=path.join(out,name+'.nes');
 fs.writeFileSync(project,JSON.stringify(saved,null,2)+'\n');fs.writeFileSync(rom,Buffer.from(artifact.rom));
 examples.push({name,expected,backend:artifact.backend,project:path.relative(root,project),projectSha256:sha(fs.readFileSync(project)),rom:path.relative(root,rom),romSha256:sha(fs.readFileSync(rom)),romBytes:artifact.rom.length});
}
const report={release:manifest.release,candidate:'roadmap-1',html:manifest.output,htmlSha256:sha(fs.readFileSync(html)),scope:'Reproducibly compiled review examples; no browser/speaker/device acceptance claimed.',examples};
fs.writeFileSync(path.join(out,'Manifest.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
