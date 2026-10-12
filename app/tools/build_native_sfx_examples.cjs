#!/usr/bin/env node
'use strict';
// Shipped converters and the shared Audio transaction produce these projects.
// Scout and its B/attack binding are authored examples, not recovered gameplay.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {loadForge}=require('../tests/harness.cjs'),{worldProject,clone}=require('../tests/world-fixtures170.cjs');
const root=path.resolve(__dirname,'..'),sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const blank=()=>({note:-1,inst:-1,vol:-1,fx:0,fxp:0});
const json=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');
function record(out,file){const bytes=fs.readFileSync(path.join(out,file));return {file,byteLength:bytes.length,sha256:sha(bytes)};}
async function buildExamples(htmlInput,outInput){
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'))),html=path.resolve(htmlInput||path.join(root,manifest.output)),out=path.resolve(outInput||path.join(root,'examples/RE_Native_SFX'));
 fs.mkdirSync(out,{recursive:true});
 const sourceFile='examples/RE_Native_Audio/HonkeyPong-reproduced.nes',rom=fs.readFileSync(path.join(root,sourceFile)),sourceSha256=sha(rom),outputs=[];
 for(const effectId of [0,1]){
  const h=loadForge(html,{environment:{crypto:crypto.webcrypto}});if(h.errors.length)throw Error(h.errors.join('\n'));h.context.setTimeout=(fn,ms)=>ms===0?setImmediate(fn):1;
  const services=h.context.Forge.services,p=worldProject();p.version=12;p.foundation=manifest.release;p.projectName='Native SFX '+effectId+' — authored Scout demonstration';
  // Explicit standalone authoring choices. Normal SFX import never changes these.
  Object.assign(p,{tempo:150,speed:1,audRows:64,patterns:[{rows:Array.from({length:64},()=>Array.from({length:5},blank))}],instruments:[],orderList:[[0,0,0,0,0]],sfx:[],audioRuntime:{enabled:true,musicEnabled:false}});
  for(const animation of p.animations||[])for(const frame of animation.frames||[])frame.events=(frame.events||[]).filter(event=>event.type!=='sound');
  services.ProjectStore.load(p);
  const source={bytes:new Uint8Array(rom),token:'native-sfx-example',sourceSha256,currentSha256:sourceSha256,name:'HonkeyPong-reproduced.nes',songIndex:0},before=services.ProjectStore.serialize();
  const staged=await services.RENativeAudioImport.stage(source,{kind:'sfx',effectId,region:'NTSC',rows:64,mode:'transcription'});
  if(!staged.data||staged.result.status!=='ready')throw Error('Effect '+effectId+' did not stage: '+JSON.stringify(staged.result.diagnostics));
  if(services.ProjectStore.serialize()!==before||sha(rom)!==sourceSha256)throw Error('SFX preview changed its inputs.');
  const applied=await services.RENativeAudioImport.commit(staged,source),imported=services.ProjectStore.capture(),sfx=imported.sfx[applied.sfxOffset];
  const attack=imported.animations.find(animation=>animation.id==='attack');if(!attack?.frames[1])throw Error('Authored Scout attack frame is missing.');
  attack.frames[1].events.push({id:'native-sfx-example',type:'sound',name:'Recovered SFX demonstration',value:sfx.id});
  services.ProjectStore.load(imported);
  function save(stem,description,edit){
   const project=services.ProjectStore.capture();if(edit)edit(project);services.ProjectStore.load(project);
   const text=services.ProjectStore.serialize(),first=services.RuntimeCompiler.compile();if(first.backend!=='world')throw Error('Example must use the existing World runtime.');
   services.ProjectStore.load(text);const again=services.RuntimeCompiler.compile();if(sha(first.rom)!==sha(again.rom)||services.ProjectStore.serialize()!==text)throw Error('SFX example does not reproduce after reopening.');
   fs.writeFileSync(path.join(out,stem+'.nesforge.json'),text+'\n');fs.writeFileSync(path.join(out,stem+'.nes'),Buffer.from(first.rom));
   outputs.push({name:stem,effectId,description,backend:first.backend,sfxId:sfx.id,authoredTrigger:'Scout attack animation frame 1, entered through B',project:record(out,stem+'.nesforge.json'),rom:record(out,stem+'.nes')});
  }
  save('HonkeyPong_SFX_'+effectId,'Native single-pulse SFX transcribed into canonical Audio; Scout World/attack binding authored separately.');
  json(path.join(out,'HonkeyPong_SFX_'+effectId+'.evidence.json'),{format:'NESForgeNativeSfxExampleEvidence',version:1,source:{file:sourceFile,sha256:sourceSha256},effectId,conversion:staged.result,authoredAdaptation:'Separate Scout World project, tempo150/speed1, music disabled, B/attack binding added after import.'});
  if(effectId===0)save('HonkeyPong_SFX_0_Edited','Ordinary canonical tracker-note edit raises every sounding row one semitone; existing volume/duty remain.',project=>{
   const effect=project.sfx.find(item=>item.id===sfx.id),pattern=project.patterns[effect.pattern];let edits=0;
   for(let row=effect.startRow;row<=effect.endRow;row++){const cell=pattern.rows[row][effect.channel];if(cell.note>=0){cell.note++;edits++;}}
   if(edits!==12)throw Error('Expected twelve authored sounding rows.');project.projectName='Native SFX 0 — one-semitone canonical edit';
  });
 }
 const report={format:'NESForgeNativeSfxExamples',version:1,release:manifest.release,candidate:'native-sfx-1',html:path.relative(root,html).split(path.sep).join('/'),htmlSha256:sha(fs.readFileSync(html)),source:{file:sourceFile,sha256:sourceSha256,byteLength:rom.length},method:'famitone2-canonical-sfx-transcription-1',outputs,evidence:[0,1].map(id=>record(out,'HonkeyPong_SFX_'+id+'.evidence.json')),scope:'Actual shipped converter, shared Audio staging/import, ordinary World build and exact Save As-style serialization/reopen/rebuild. Canonical note edit and authored B/attack sound binding are explicit adaptations. No original gameplay, native mixing, speaker listening, browser, device or hardware acceptance.'};
 json(path.join(out,'Manifest.json'),report);
 fs.writeFileSync(path.join(out,'README.txt'),[
  'NES Forge '+manifest.release+' — Native SFX examples','',
  'Open a .nesforge.json with normal Open Project, then Build & Run. Press B/attack to trigger its recovered effect through an explicitly authored Scout animation binding.',
  'HonkeyPong_SFX_0 and HonkeyPong_SFX_1 use the independently authored native effects. HonkeyPong_SFX_0_Edited raises the ordinary tracker notes one semitone. All are editable schema-12 projects; paired .nes files are generated Forge World ROMs.',
  'These separate projects deliberately use tempo150/speed1 and disabled music. SFX import itself preserves music, tempo/speed, runtime settings and animation bindings. It requires the current project already have compatible150/1 timing.',
  'Original effects0/1 each occupy one pulse channel for12audibleframes. The native final mixed frame is included; terminal row12 ends the canonical effect. Source timers happen to match existing canonical notes for these originals; edited inputs may need disclosed nearest-pitch adaptation.',
  'Native mixing/arbitration and pulse phase are not recreated. Original effect2 uses multiple channels and remains refused. Forge retains its existing one-effect channel takeover/resume behavior.',
  '',
  'Use the native Audio panel to Analyze current ROM, Find SFX, Preview, review/acknowledge differences and confirm import. No native game trigger is imported. Existing authoring tools can bind the imported SFX later.',
  'The original input, full upstream notices, pinned source/build and original-driver evidence remain in examples/RE_Native_Audio. Evidence JSON records conversion and source identity; it is not a project backup.',
  'Logical original/generated CPU/APU comparisons are in tests/native-sfx-apu.cjs. Listen in Forge and an independent emulator; automated results do not establish speaker, browser or hardware acceptance.',
  '',
  'Regenerate with node tools/build_native_sfx_examples.cjs. Manifest.json identifies actual source, HTML, project and ROM bytes.',''
 ].join('\n'));
 return report;
}
module.exports={buildExamples};
if(require.main===module)buildExamples(process.argv[2],process.argv[3]).then(report=>console.log(JSON.stringify(report,null,2))).catch(error=>{console.error(error.stack||error);process.exitCode=1;});
