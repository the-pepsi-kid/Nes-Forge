/* Read-only, revision-bound spatial decoders. Source tables are read from the
 * selected ROM; no commercial maps, graphics or sprite data ship in this file.
 * Native cell semantics remain separate from Forge's binary collision model. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SpatialNative=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const profiles=Object.freeze([
 {id:'megaman2-us',name:'Mega Man 2',sha256:'49136b412ff61beac6e40d0bbcd8691a39a50cd2744fdcdde3401eed53d71edf',scope:'Native screen slots and stage-dependent collision'},
 {id:'ninja-gaiden-us',name:'Ninja Gaiden',sha256:'07d9e57e35184667c7b89e30857a44c5c404b48332ad12e66be91100eccd4f5e',scope:'Native rooms, ground kinds and 13 player animation scripts'},
 {id:'zelda2-us',name:'Zelda II',sha256:'ad8c0fbcf092bf84b48e69fd3964eea4ed91bfe62abc352943d537979782680c',scope:'Four overworld terrain maps; side-view collision not decoded'},
 {id:'castlevania2-us',name:'Castlevania II',sha256:'f045d72683d3156555eccbb56090888f03a15e5b25e59db49dca7a87330472d3',scope:'Native room layouts and raw tile categories; conditional collision not resolved'}
].map(Object.freeze));
const need=(ok,message)=>{if(!ok)throw Error('Spatial RE: '+message);},signed=n=>n>127?n-256:n;
const digest=b=>(typeof FamiTone2Native!=='undefined'?FamiTone2Native:require('./famitone2-native.js')).sha256(b);
function reader(rom){
 const loc=(bank,cpu,length=1)=>{need(Number.isInteger(bank)&&bank>=0&&bank<rom[4]&&Number.isInteger(cpu)&&cpu>=(bank===rom[4]-1?0xc000:0x8000)&&cpu+length<=(bank===rom[4]-1?0x10000:0xc000),'read outside a physical PRG bank');return {bank16KiB:bank,cpu,fileOffset:16+bank*16384+cpu-(bank===rom[4]-1?0xc000:0x8000),length};};
 const at=(bank,cpu)=>rom[loc(bank,cpu).fileOffset],word=(bank,cpu)=>at(bank,cpu)|(at(bank,cpu+1)<<8),span=(bank,cpu,length)=>{const p=loc(bank,cpu,length);return Array.from(rom.slice(p.fileOffset,p.fileOffset+length));};
 const anchor=(bank,cpu,bytes)=>need(span(bank,cpu,bytes.length).every((v,i)=>v===bytes[i]),'semantic anchor differs');
 return {loc,at,word,span,anchor};
}
function mm2(r){
 const names=['Heat Man','Air Man','Wood Man','Bubble Man','Quick Man','Flash Man','Metal Man','Crash Man','Wily 1','Wily 2','Wily 3','Wily 4','Wily 5','Wily 6'];
 const special=[['ladder','spikes'],['ladder','spikes'],['ladder','background'],['water','spikes'],['background','spikes'],['ladder','ice'],['conveyor-right','conveyor-left'],['ladder','spikes'],['ladder','background'],['ladder','spikes'],['water','spikes'],['ladder','spikes'],['background','background'],['background','background']];
 const maps=[];
 // 256 four-byte definitions + 256 attribute bytes + 44 sixty-four-byte slots.
 for(let stage=0;stage<14;stage++){
  const bank=stage&7,classes=['background','solid',...special[stage]];
  for(let slot=0;slot<44;slot++){
   const address=0x8500+slot*64,rawBlocks=r.span(bank,address,64),blocks=Array.from({length:64},(_,i)=>rawBlocks[(i%8)*8+Math.floor(i/8)]),cells=Array(256),cellSources=Array(256);
   for(let by=0;by<8;by++)for(let bx=0;bx<8;bx++)for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){
    const id=blocks[by*8+bx],a=0x8000+id*4+dx*2+dy,i=(by*2+dy)*16+bx*2+dx;
    cells[i]=r.at(bank,a)>>6;cellSources[i]=r.loc(bank,a);
   }
   maps.push({id:'mm2:'+stage+':'+slot,label:names[stage]+' · screen slot '+slot,group:names[stage],width:16,height:16,cellPixels:16,originY:0,visibleHeight:240,blocks:{width:8,height:8,cellPixels:32,values:blocks,source:r.loc(bank,address,64),storage:'column-major'},cells,cellSources,classes,source:r.loc(bank,address,64),context:{stage,bank,slot},certainty:'decoded-native-collision',notes:['Raw screen slot; reachability, stage ordering and scrolling transitions are not inferred. Each bank has 44 slots including padding/reuse.','The bottom 16 pixels are retained as native data and shaded outside the 240-pixel viewport.','Stage context changes the meanings of raw classes 2 and 3. Actors, moving platforms and native movement physics are not reconstructed.']});
  }
 }
 return {maps,animations:[],limits:['616 stage-context views refer to 352 physical screen slots, not 616 distinct playable rooms.','CHR upload, original scene palettes, checkpoints and full stage topology are not reconstructed.']};
}
function ninja(r,rom){
 r.anchor(7,0xe792,[0x4a,0x4a,0x4a,0x4a]);r.anchor(7,0xf5ea,[0xa9,0x00]);
 const flags=r.span(7,0xe782,16),maps=[];
 for(let room=0;room<48;room++){
  const a=r.word(0,0xac30+room*2),pages=r.at(0,0xad20+room)&127;
  need(pages<=15,'room width exceeds investigated format');
  // Area selection determines the four collision/block tables. A room can be
  // reached through different areas; retain every declared area context.
  const areas=[];for(let area=0;area<22;area++){const first=r.at(0,0xaf2c+area),next=area===21?48:r.at(0,0xaf2c+area+1);if(room>=first&&room<next)areas.push(area);}
  // Two final bosses have overlapping first-room indices. Context must not be
  // guessed for a room absent from the declared monotonic area spans.
  if(!areas.length)continue;
  for(const area of areas){
   const selector=r.at(0,0xaf00+area)&3,base=0xa430+selector*512,width=(pages+1)*16,blockWidth=width/2;
   const blocks=r.span(0,a,blockWidth*6),cells=Array(width*12),cellSources=Array(width*12),behaviorFlags=Array(width*12);
   for(let bx=0;bx<blockWidth;bx++)for(let by=0;by<6;by++)for(let dx=0;dx<2;dx++)for(let dy=0;dy<2;dy++){
    const id=blocks[bx*6+by],p=base+id*2+dx,v=r.at(0,p),kind=dy?v&15:v>>4,i=(by*2+dy)*width+bx*2+dx;
    cells[i]=kind;behaviorFlags[i]=flags[kind];cellSources[i]=r.loc(0,p);
   }
   maps.push({id:'ng:'+area+':'+room,label:'Area '+area+' · room '+room,group:'Area '+area,width,height:12,cellPixels:16,originY:64,visibleHeight:240,blocks:{width:blockWidth,height:6,cellPixels:32,values:Array.from({length:blockWidth*6},(_,i)=>blocks[(i%blockWidth)*6+Math.floor(i/blockWidth)]),source:r.loc(0,a,blocks.length),storage:'column-major'},cells,cellSources,behaviorFlags,classes:Array.from({length:16},(_,i)=>i>=10?'exit-kind-'+i:'ground-'+i+' · flags $'+flags[i].toString(16).padStart(2,'0')),source:r.loc(0,a,blocks.length),context:{area,room,selector,scrollPages:pages,entranceFromRight:!!(r.at(0,0xad20+room)&128)},certainty:'decoded-native-ground-kinds',notes:['The 64-pixel status region is excluded; twelve 16-pixel rows extend through native y=255, including the offscreen bottom row.','Ground kinds and the native behavior flag table are preserved. Directional contacts, wall holding, steps and exits are not flattened into binary solid/empty.','Actor placement, damage boxes and room transitions are not reconstructed.']});
  }
 }
 const names=['Idle','Walk','Crouch','Sword','Crouching sword','Jump','Air sword','Spinning sword','Throw','Air throw','Wall hold','Knockback','Climb'],animations=[];
 for(let id=0;id<13;id++){
  const start=r.word(2,0x8600+id*2),frames=[];let p=start,end;
  for(let step=0;step<128;step++){
   const delay=r.at(2,p);if(delay===0||delay>=128){end=delay===0?'return-to-idle':'restart';break;}
   const pose=r.at(2,p+1),shape=r.word(2,0x8400+pose*2),colors=r.word(2,0x8500+pose*2),count=r.at(2,shape);need(count<=64,'sprite piece bound');
   const pieces=Array.from({length:count},(_,i)=>({tile:r.at(2,shape+1+i*3),x:signed(r.at(2,shape+2+i*3)),y:signed(r.at(2,shape+3+i*3)),attributes:r.at(2,colors+i),source:r.loc(2,shape+1+i*3,3),attributeSource:r.loc(2,colors+i)}));
   frames.push({duration:delay,pose,pieces,source:r.loc(2,p,2),shapeSource:r.loc(2,shape,1+count*3)});p+=2;
  }
  need(end&&frames.length,'animation does not terminate within bound');
  animations.push({id:'ng-player:'+id,label:names[id],source:r.loc(2,start,p-start+1),pointerSource:r.loc(2,0x8600+id*2,2),frames,end,ticks:frames.reduce((n,f)=>n+f.duration,0),timing:'Native animation update ticks; game-state logic can interrupt, reset or withhold updates. This is not a full behavior state machine.',spriteMode:16,notes:['Piece coordinates, tile IDs, palette/flip attributes and durations are native source data.','Preview uses an authored grayscale palette and explicit CHR bank selection; it does not recover original room palettes, hitboxes or all runtime color variants.']});
 }
 return {maps,animations,limits:['Only the first 13 Ryu action scripts are decoded; enemy/boss animations and controller/state transitions are not decoded.']};
}
function zelda(r){
 const maps=[],names=['Town','Cave','Palace','Bridge','Desert','Grass','Forest','Swamp','Graveyard','Road','Lava','Mountain','Water','Walkable water','Rock','Spider'];
 for(const [bank,index,label]of [[1,0,'West Hyrule'],[1,1,'Death Mountain'],[2,0,'East Hyrule'],[2,1,'Maze Island']]){
  const start=r.word(bank,0x8508+index*2);let p=start;const cells=[],cellSources=[],runs=[];
  for(let y=0;y<75;y++){
   let x=0;while(x<64){need(p-start<1024,'overworld compressed-data bound');const v=r.at(bank,p),length=(v>>4)+1,kind=v&15;need(x+length<=64,'overworld run crosses row');runs.push({row:y,x,length,kind,source:r.loc(bank,p)});for(let i=0;i<length;i++){cells.push(kind);cellSources.push(r.loc(bank,p));}p++;x+=length;}
  }
  maps.push({id:'z2:'+bank+':'+index,label,group:'Overworld',width:64,height:75,cellPixels:16,originY:0,cells,cellSources,classes:names,source:r.loc(bank,start,p-start),runs,certainty:'decoded-native-terrain',notes:['Terrain identity is decoded, not side-view collision or movement permission. Items, quests and scripted events can change traversal.','This is the static ROM terrain before runtime changes; towns, caves, palaces and encounter interiors are not decoded.']});
 }
 return {maps,animations:[],limits:['Zelda II side-view rooms, collision, Link animation scripts and enemy layouts remain unsupported.']};
}
function cv2(r){
 const names=['Towns','Mansions','Forests and bridges','Wilderness','Wastelands','Ruins'],counts=[17,15,26,11,8,2],maps=[];
 const read=(a)=>a>=0xc000?r.at(7,a):r.at(2,a),word=a=>read(a)|(read(a+1)<<8),loc=(a,n=1)=>r.loc(a>=0xc000?7:2,a,n);
 for(let type=0;type<6;type++){
  const table=r.word(7,0xf7fb+type*2),metas=r.word(7,0xf7d1+type*4),size=r.at(4,metas),threshold=r.word(7,0xf7d3+type*4),cuts=r.span(7,threshold,3);need(size>1&&size<128,'metatile count bound');
  for(let room=0;room<counts[type];room++){
   const a=word(table+room*4),w=read(a),h=read(a+1);need(w>=1&&w<=16&&h>=1&&h<=16&&w*h<=64,'room geometry bound');
   const width=w*32,height=h*28,cells=Array(width*height),cellSources=Array(width*height),blocks=Array(w*8*h*7),screens=[];
   for(let sy=0;sy<h;sy++)for(let sx=0;sx<w;sx++){
    const pointer=word(a+2+(sy*w+sx)*2);screens.push({x:sx,y:sy,source:loc(pointer,56),pointerSource:loc(a+2+(sy*w+sx)*2,2)});
    for(let by=0;by<7;by++)for(let bx=0;bx<8;bx++){
     const id=read(pointer+by*8+bx);need(id<size-1,'metatile leaves declared definitions');blocks[(sy*7+by)*(w*8)+sx*8+bx]=id;
     for(let dy=0;dy<4;dy++)for(let dx=0;dx<4;dx++){
      const p=metas+size+id*16+dy*4+dx,tile=r.at(4,p),i=(sy*28+by*4+dy)*width+sx*32+bx*4+dx;
      cells[i]=tile<cuts[0]?0:tile<cuts[1]?3:tile<cuts[2]?2:1;cellSources[i]=r.loc(4,p);
     }
    }
   }
   maps.push({id:'cv2:'+type+':'+room,label:names[type]+' · layout '+room,group:names[type],width,height,cellPixels:8,originY:0,blocks:{width:w*8,height:h*7,cellPixels:32,values:blocks},cells,cellSources,classes:['background category','category 1','solid category','category 3'],source:loc(a,2+w*h*2),context:{type,room,screensWide:w,screensHigh:h,metatileCount:size-1,thresholds:cuts},screens,certainty:'decoded-raw-tile-categories',notes:['Raw metatile tiles are classified with native category thresholds. Conditional/fake-block substitution, stairs, doors and actors can change actual collision.','These are layout-table entries, not a reconstructed scene/quest transition graph. Original palettes, CHR selection and runtime changes are not rendered.']});
  }
 }
 return {maps,animations:[],limits:['Raw tile categories are not a complete collision reconstruction. Conditional blocks and object/script behavior remain unresolved.','Simon/enemy animation scripts are not decoded.']};
}
function inspect(input,name='ROM'){
 need(input instanceof Uint8Array&&input.length>=16&&input.length<=64*1024*1024,'choose a bounded iNES file');
 need(input[0]===78&&input[1]===69&&input[2]===83&&input[3]===26,'not an iNES ROM');
 const rom=Uint8Array.from(input),sha256=digest(rom),profile=profiles.find(p=>p.sha256===sha256),source={name:String(name).slice(0,160),sha256,byteLength:rom.length};
 if(!profile)return {format:'NESForgeSpatialEvidence',version:1,status:'unknown',source,profile:null,maps:[],animations:[],limits:['No verified spatial decoder for this exact source revision. Runtime capture and RAM investigation remain available; visual similarity does not establish collision or animation meaning.']};
 const r=reader(rom),data=profile.id==='megaman2-us'?mm2(r):profile.id==='ninja-gaiden-us'?ninja(r,rom):profile.id==='zelda2-us'?zelda(r):cv2(r);
 return {format:'NESForgeSpatialEvidence',version:1,status:'supported',source,profile:{...profile},...data,limits:[...data.limits,'Read-only evidence. This does not modify the ROM or authoring project, import a playable reconstruction, or establish complete game behavior.']};
}
return Object.freeze({profiles,inspect,limits:Object.freeze({inputBytes:64*1024*1024,animationCommands:128})});
});
