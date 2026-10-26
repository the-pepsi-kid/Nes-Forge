'use strict';
// Source-derived usage summaries only. No pattern pixels, pose geometry, ROM
// bytes, snapshots or game media are written into the review deliverables.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),Content=require('../../app/src/re/punch-out-content.js');
const sha=data=>crypto.createHash('sha256').update(data).digest('hex'),results=[];
for(let revision=0;revision<2;revision++){
 const bytes=new Uint8Array(fs.readFileSync(path.join(process.argv[2],`Mike Tyson's Punch-Out!! (U) (PRG ${revision}).nes`))),model=Content.open(bytes),groups=new Map(),usage=new Map();
 let decoded=0,needsContext=0;
 for(const fight of model.fights){
  const first=model.pose(fight.index,0),group=groups.get(first.chrBank4KiB)||[];group.push(fight.label);groups.set(first.chrBank4KiB,group);
  for(const slot of fight.poses){
   if(slot.status!=='source-record')continue;
   const pose=model.pose(fight.index,slot.selector);
   if(pose.status!=='decoded'){needsContext++;continue;}
   decoded++;
   if(pose.chrBank4KiB!==29)continue;
   for(const tile of [8,83,221,255])if(pose.pieces.some(p=>p.tile===tile)){
    const key=tile+':'+fight.index;usage.set(key,{tile,fight:fight.label,fullPoseCount:(usage.get(key)?.fullPoseCount||0)+1});
   }
  }
 }
 results.push({revision,initialFullPoseBanks:Array.from(groups,([physicalBank4KiB,fights])=>({physicalBank4KiB,fights})),
  decodedInitialModeFullPoses:decoded,fullPosesNeedingFurtherContext:needsContext,
  bank29Examples:Array.from(usage.values()),
  limits:'First-pose bank groups and decodable initial-mode full-pose examples only. State-dependent banking, incremental updates, hidden uses and byte-level consumers are not exhaustively covered. A shared bank does not mean every tile edit affects every character.'});
}
const root=path.resolve(__dirname,'../..');fs.writeFileSync(path.join(__dirname,'Shared_Resource_Observations.json'),JSON.stringify({status:'completed',htmlSha256:sha(fs.readFileSync(path.join(root,'nes-forge.html'))),scope:'Read-only source-model usage summaries; not a complete native consumer map.',results},null,2)+'\n');
console.log('Completed shared-bank and selected tile-use summaries for both supported revisions.');
