'use strict';
// External, editable World runtime example. Scout art is loaded from the existing
// original authoring fixture; none of these maps or assets is seeded at startup.
const scout=require('./fixtures/scout166.json');
const clone=value=>JSON.parse(JSON.stringify(value));
const IDS=Object.freeze({worldA:'world-a',worldB:'world-b',spawnA:'spawn-a',spawnB:'spawn-b',exitA:'exit-a',exitB:'exit-b',surface:170,solid:171,detailA:172,detailB:173});
function marker(id,kind,x,y,targetWorldId='',targetMarkerId=''){
 return {id,name:id,kind,x,y,targetWorldId,targetMarkerId};
}
function world(id,widthScreens,sceneId){
 const cols=widthScreens*16;
 return {id,name:id==='world-a'?'Scout Ridge':'Scout Courtyard',tilesetSceneId:sceneId,widthScreens,heightScreens:1,map:Array(cols*15).fill(-1),
 rooms:[{id:id+'-room',name:'Walkable room',x:0,y:0,w:cols,h:15}],markers:[],
 cameraRegions:[{id:id+'-camera',name:widthScreens===1?'Courtyard fixed camera':'Ridge horizontal screens',x:0,y:0,w:cols,h:15,mode:widthScreens===1?'locked':'horizontal'}]};
}
function worldProject(options={}){
 const p=clone(scout),scene=p.scenes[0];
 p.version=10;p.foundation='1.7';p.romLayout=4;p.projectName='Scout — World Runtime Example';
 // Existing room, selected player, animation bindings and source metatile map
 // remain authored exactly as in Scout. New tiles are used only by World maps.
 scene.chr[24]=Array.from({length:8},(_,y)=>Array.from({length:8},(_,x)=>y===0?2:(x+y)%4===0?3:1));
 scene.chr[25]=Array.from({length:8},(_,y)=>Array.from({length:8},(_,x)=>x===y||x===7-y?2:0));
 scene.chr[26]=Array.from({length:8},(_,y)=>Array.from({length:8},(_,x)=>x===0||y===0||x===7||y===7?3:0));
 scene.metatiles.push(
  {id:IDS.surface,name:'World ground surface',category:'terrain',tiles:[0,0,24,24],pal:1,collision:[0,0,1,1],flags:0},
  {id:IDS.solid,name:'World solid block',category:'terrain',tiles:[24,24,24,24],pal:1,collision:[1,1,1,1],flags:0},
  {id:IDS.detailA,name:'Ridge diamond',category:'decoration',tiles:[25,25,25,25],pal:2,collision:[0,0,0,0],flags:0},
  {id:IDS.detailB,name:'Courtyard window',category:'decoration',tiles:[26,26,26,26],pal:3,collision:[0,0,0,0],flags:0}
 );
 const a=world(IDS.worldA,2,scene.id),b=world(IDS.worldB,1,scene.id);
 for(const w of [a,b]){const cols=w.widthScreens*16;for(let x=0;x<cols;x++){w.map[12*cols+x]=IDS.surface;w.map[13*cols+x]=IDS.solid;w.map[14*cols+x]=IDS.solid;}}
 for(let y=3;y<8;y++)for(let x=19;x<29;x+=3)a.map[y*32+x]=IDS.detailA;
 for(let y=3;y<8;y++)for(let x=2;x<15;x+=3)b.map[y*16+x]=IDS.detailB;
 a.markers=[marker(IDS.spawnA,'spawn',options.spawnCellA??3,12),marker(IDS.exitA,'exit',25,12,IDS.worldB,IDS.spawnB)];
 b.markers=[marker(IDS.spawnB,'spawn',4,12),marker(IDS.exitB,'exit',4,12,IDS.worldA,IDS.spawnA)];
 if(options.wallCell!==undefined){for(let y=8;y<13;y++)a.map[y*32+options.wallCell]=IDS.solid;}
 if(options.ceiling){for(let x=13;x<19;x++)a.map[9*32+x]=IDS.solid;}
 p.worlds=[a,b];
 p.worldRuntime={enabled:true,worldId:IDS.worldA,spawnId:IDS.spawnA,playerSceneId:scene.id,playerId:'scout-player',moveSpeed:2,jumpSpeed:9,gravity:1,maxFallSpeed:6,bodyWidth:12,bodyHeight:22,...options.physics};
 return p;
}
module.exports={worldProject,IDS,clone,marker};
