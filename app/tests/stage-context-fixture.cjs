'use strict';
// Authored catalog and pixels: no commercial source or extracted payload.
const setup=String.raw`
window.stageFixture=function(){
 const palettes=Array.from({length:4},(_,i)=>[15,i+1,i+17,i+33]);
 const scenes=Array.from({length:4},(_,i)=>({id:'ng:0:'+i,label:'Authored room '+i,group:'Authored area',area:0,room:i,spriteChrBank4KiB:0,backgroundChrBank4KiB:1,palettes:{sprites:palettes},...(i===3?{status:'unavailable-slot'}:{})}));
 const report={status:'supported',source:{sha256:'b'.repeat(64),byteLength:8208,name:'Authored source'},profile:{id:'ninja-gaiden-us',name:'Authored native area'},scenes,animations:[{id:'script:0',selector:0,label:'Shared authored clip',owner:'player',end:'player-restart-marker',frames:[{pose:0,duration:4,updateTicks:4}]}],poses:[{id:'pose:0',selector:0,owner:'player',label:'Shared authored pose',pieces:[{tile:2,x:0,y:0,attributes:0}]}]};
 const banks=Array.from({length:2},()=>Array(4096).fill(0));for(let y=0;y<8;y++){banks[0][32+y]=255;banks[1][16+y]=255;}
 return {report,catalog(){return JSON.parse(JSON.stringify(report));},scene(id){const scene=report.scenes.find(s=>s.id===id);return {scene,width:32,height:12,originY:64,graphics:{width:64,height:24,chrBank4KiB:1,palettes,tiles:Array(1536).fill(1),paletteIds:Array(1536).fill(0)}};},chrBank(b){return {bytes:banks[b]};}};
};`;
async function importRoom(h,id='ng:0:0',session){
 const api=h.context.Forge.services.GameREAssets,f=session||h.run('stageFixture()');
 const bundle=await api.seal(api.convert(f,{sceneId:id,animationId:'script:0'}));
 return {bundle,result:api.importStaged(await api.stage(bundle)),session:f};
}
module.exports={setup,importRoom};
