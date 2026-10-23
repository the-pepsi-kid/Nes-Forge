/* Room geometry adaptation. Visual metatiles are deduplicated by four source
 * pattern IDs and palette, never by guessed collision semantics. A segment is
 * split at a page boundary before either existing World capacity is exceeded. */
(()=>{
'use strict';
const services=window.Forge.services,cp=v=>JSON.parse(JSON.stringify(v));
function adapt(scenes,decoded){
 const g=decoded.graphics,rows=Math.ceil(g.height/2),cells=scenes.map((sc,page)=>Array.from({length:240},(_,i)=>{
  const x=i%16,y=Math.floor(i/16);if(page*32+x*2>=g.width||y*2>=g.height)return null;
  const at=y*64+x*2,shift=((y&1)*4)+((x&1)*2);
  const tiles=[sc.nt[at],sc.nt[at+1],sc.nt[at+32],sc.nt[at+33]],pal=(sc.attr[(y>>1)*8+(x>>1)]>>shift)&3;
  return {tiles,pal,key:tiles.join(',')+'|'+pal};
 })),segments=[];
 let start=0;
 while(start<scenes.length){
  const defs=new Map();let end=start;
  while(end<scenes.length&&end-start<16){
   const next=new Map(defs);for(const c of cells[end])if(c&&!next.has(c.key))next.set(c.key,{id:next.size,name:'Recovered art '+next.size,category:'Native art · collision unassigned',tiles:c.tiles,pal:c.pal,collision:[0,0,0,0],flags:0});
   if(next.size>255)break;for(const [key,value]of next)defs.set(key,value);end++;
  }
  if(end===start)throw Error('Native world import: one page exceeds the metatile library capacity.');
  if(segments.length>=32)throw Error('Native world import: the room exceeds 32 world segments.');
  const width=end-start,cols=width*16,map=Array(cols*15).fill(-1),index=segments.length;
  for(let page=start;page<end;page++){
   const sc=scenes[page];sc.metatiles=cp([...defs.values()]);sc.metaMap=cells[page].map(c=>c?defs.get(c.key).id:-1);
   for(let y=0;y<15;y++)for(let x=0;x<16;x++)map[y*cols+(page-start)*16+x]=sc.metaMap[y*16+x];
   sc.captureMeta.nativeAssets.world={worldId:'native-world-'+index,segment:index,startPage:start,pageCount:width,contentWidthPixels:Math.min(width*256,g.width*8-start*256),contentHeightPixels:g.height*8,geometry:'initial-art-layout',collision:'unassigned',connections:'reference-only'};
  }
  segments.push({id:'native-world-'+index,name:(decoded.scene.label+(start||end<scenes.length?' · segment '+(index+1):'')).slice(0,100),tilesetSceneId:scenes[start].id,widthScreens:width,heightScreens:1,map,rooms:[{id:'native-room-'+index,name:'Recovered room geometry',x:0,y:0,w:Math.min(cols,Math.ceil(g.width/2)-start*16),h:rows}],markers:[],cameraRegions:[]});
  start=end;
 }
 return segments;
}
services.GameREWorlds=Object.freeze({adapt});
})();
