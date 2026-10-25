'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict'),{loadForge}=require('../../app/tests/harness.cjs');
const html=path.resolve(__dirname,'../../app/mainline/NES_Forge_2.0.0-alpha.11.html'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{const results=[];for(let rev=0;rev<2;rev++){
 const name=`Mike Tyson's Punch-Out!! (U) (PRG ${rev}).nes`,input=new Uint8Array(fs.readFileSync(path.join(process.argv[2],name))),original=sha(input);
 const h=loadForge(html,{environment:{crypto:crypto.webcrypto,setTimeout,clearTimeout}}),s=h.context.Forge.services;
 const p=await s.NativeResourceProject.create(input,name);s.ProjectStore.load(p,{sync:true});await s.InvestigationUI.whenReady();const before=s.ProjectStore.serialize();
 let latest='';s.PunchOutReplay.subscribe(v=>{if(v.report){const k=v.report.kind+':'+Math.floor((v.report.last?.frame||0)/300)+':'+v.report.status;if(k!==latest){console.log(name,k);latest=k;}}});
 const cases=[];for(const kind of ['sequence','opponent-down','mac-down','round']){
  const out=await s.PunchOutReplay.run(kind,{reuseReady:true});
  if(out.status!=='completed'){console.log(JSON.stringify(out,null,2));throw Error(kind+': '+out.stop);}
  assert(out.audio.writes>0);assert(out.audio.activeFrames>0);assert(out.projectUnchanged);assert.equal(s.ProjectStore.serialize(),before);assert.equal(out.last.missed,0);
  if(kind==='sequence'){assert.equal(out.seeds.length,0);assert(out.milestones.some(m=>m.name==='body-punch'));assert(out.milestones.some(m=>m.name==='dodge-right'));assert(out.milestones.some(m=>m.name==='return-to-stance'));}
  if(kind==='opponent-down'){for(let n=1;n<=4;n++)assert(out.milestones.some(m=>m.name==='referee-count-'+n));assert(out.milestones.some(m=>m.name==='opponent-get-up'));}
  if(kind==='mac-down'){assert(out.milestones.some(m=>m.name==='referee-count-10'));assert(out.milestones.some(m=>m.name==='player-count-out'));}
  if(kind==='round')assert(out.milestones.some(m=>m.name==='round-two-ready'));
  const restored=s.PunchOutReplay.restore();assert.equal(restored.round,1);assert.equal(restored.mac&127,1);assert.equal(restored.knockdown,0);
  cases.push({...out,transitions:undefined});console.log('PASS',name,kind,'milestones',out.milestones.map(m=>m.name).join(','));
 }
 assert.equal(sha(input),original);assert.match(h.get('nativeAudioStatus').textContent,/Decoded 84/);assert.deepEqual(h.errors,[]);
 results.push({revision:name,sourceSha256:original,passed:true,cases,audioEntries:84,projectUnchanged:true,checkpointRestore:true});
 }
 fs.writeFileSync(path.join(__dirname,'Replay_Verification.json'),JSON.stringify({status:'passed',htmlSha256:sha(fs.readFileSync(html)),scope:'Existing emulator/Timeline from reset and explicitly recorded RAM experiments. Hardware timing, runtime Scene capture and listening are not established.',results},null,2)+'\n');
})().catch(e=>{console.error(e.stack);process.exitCode=1});
