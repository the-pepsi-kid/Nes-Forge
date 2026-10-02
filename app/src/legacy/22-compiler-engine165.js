/* NES Forge 1.6.5: compile linked authoring assets into a bounded room runtime. */
(()=>{
'use strict';
const F=window.Forge165=window.Forge165||{};
const eventBits={attack_start:1,attack_end:2,footstep:4,sound:8,custom:16};
const propertyNames=['Empty','Solid','Platform','Ladder','Hazard','Water','Slope Left','Slope Right'];
const fail=message=>{throw Error('First Playable Room: '+message);};
function integer(value,min,max,label){if(!Number.isInteger(value)||value<min||value>max)fail(label+' must be an integer from '+min+' through '+max);return value;}
function selectedEntries(){return S.scenes.map((sc,index)=>({sc,index,order:clamp(sc.buildOrder??index,0,9999,index)})).filter(e=>e.sc.buildInclude!==false).sort((a,b)=>a.order-b.order||a.index-b.index);}
function validateRoom(room){
  if(room.raster)fail('The selected room is a raster capture. Create a lossless static copy first.');
  if(room.sceneType!=='sideview')fail('The selected room must use the Sideview scene type.');
  if(room.scrollDir!=='none'||room.view?.w!==256||room.view?.h!==240||(room.view?.x||0)!==0||(room.view?.y||0)!==0||(room.view?.followEnt??-1)>=0)fail('The selected room needs a fixed 256×240 camera at 0,0, no scrolling, and no camera follow entity.');
}
function collisionMap(room,linkedRoom){
  if(!Array.isArray(room.nt)||room.nt.length!==960)fail('The selected room needs a complete 32×30 nametable.');
  const result=room.nt.map(tile=>room.tileProps?.[tile]??0),definitions=new Map((linkedRoom.metatiles||[]).map(m=>[m.id,m]));
  // Linked metatile collision is independent of raw tile properties and must win.
  for(let cell=0;cell<240;cell++){
    const id=linkedRoom.metaMap?.[cell];if(id==null||id<0)continue;
    const definition=definitions.get(id);if(!definition)fail('A linked room cell references missing metatile '+id+'.');
    if(!Array.isArray(definition.collision)||definition.collision.length!==4)fail('Metatile '+id+' needs four collision quadrants.');
    const row=Math.floor(cell/16)*2,column=(cell%16)*2;
    for(let q=0;q<4;q++)result[(row+(q>>1))*32+column+(q&1)]=definition.collision[q];
  }
  result.forEach((value,index)=>{
    if(value!==0&&value!==1)fail('Collision at tile '+(index%32)+','+Math.floor(index/32)+' uses '+(propertyNames[value]||('property '+value))+'. This runtime supports Empty and Solid tiles.');
  });
  return result;
}
function normalizeBoxes(boxes,label){
  if(!Array.isArray(boxes)||boxes.length>4)fail(label+' supports at most four boxes per frame.');
  return boxes.map((box,index)=>{
    const name=label+' box '+(index+1),x=integer(box.x,-64,63,name+' X'),y=integer(box.y,-64,63,name+' Y'),w=integer(box.w,1,64,name+' width'),h=integer(box.h,1,64,name+' height');
    if(x+w>127||y+h>127)fail(name+' extends outside the runtime range.');
    return {x,y,w,h};
  });
}
function rowCounts(pieces,offset=0){
  const rows=new Map();
  for(const piece of pieces)for(let y=offset+piece.y;y<offset+piece.y+8;y++)rows.set(y,(rows.get(y)||0)+1);
  return rows;
}
function actorFrames(actor){return actor?Object.values(actor.animations).flatMap(a=>a.frames):[];}
function validateOAM(spec){
  const playerFrames=actorFrames(spec.player),targetFrames=actorFrames(spec.target);
  const playerCount=Math.max(0,...playerFrames.map(f=>f.pieces.length)),targetCount=Math.max(0,...targetFrames.map(f=>f.pieces.length));
  if(spec.staticOAM.length+playerCount+targetCount>64)fail('Static room sprites plus player and target frames exceed 64 hardware sprites.');
  const playerPeak=Math.max(0,...playerFrames.flatMap(f=>[...rowCounts(f.pieces).values()]));
  const staticRows=rowCounts(spec.staticOAM),targetRows=new Map();
  for(const frame of targetFrames)for(const [row,count] of rowCounts(frame.pieces,spec.target.y))targetRows.set(row,Math.max(targetRows.get(row)||0,count));
  let peak=0,peakRow=0;
  for(let y=0;y<240;y++){
    const count=playerPeak+(staticRows.get(y)||0)+(targetRows.get(y)||0);
    if(count>peak){peak=count;peakRow=y;}
  }
  if(peak>8)fail('The player, target, and static room sprites can need '+peak+' sprites on scanline '+peakRow+'; NES hardware allows eight. Reduce overlapping sprite pieces.');
}
function validateSpawn(player,physics,collision){
  const left=player.x-physics.bodyWidth/2,top=player.y-physics.bodyHeight,right=left+physics.bodyWidth,bottom=player.y;
  if(left<0||right>256||top<0||bottom>240)fail('The player body must start inside the 256×240 room. Its entity X/Y is the center of its feet.');
  for(let y=Math.floor(top/8);y<=Math.floor((bottom-1)/8);y++)for(let x=Math.floor(left/8);x<=Math.floor((right-1)/8);x++)if(collision[y*32+x])fail('The player body starts inside a solid tile at '+x+','+y+'. Move the feet origin above the floor.');
}
function compileGameplay(baseRom,config,audioSpec={enabled:false}){
  if(!config||config.mode!=='single-room')fail('Select First Playable Room mode before compiling gameplay.');
  F.config?.validate(config,{references:true});
  if(document.getElementById('codeInput')?.value.trim())fail('Custom assembly is incompatible with First Playable Room mode. Keep it in Scene Viewer / Custom mode or save it separately before clearing it.');
  const header=parseRomHeader(baseRom);
  if(header.mapper!==0||header.prgSize!==16384||header.chrSize!==8192||header.trainer)fail('Gameplay compilation requires the current packed 16 KB NROM build with 8 KB CHR.');
  const entries=selectedEntries(),sceneIndex=entries.findIndex(e=>e.sc.id===config.sceneId);
  if(sceneIndex<0)fail('Include the selected gameplay room in the Build Scene Set.');
  const room=entries[sceneIndex].sc;validateRoom(room);
  const prg=baseRom.subarray(header.headerSize,header.headerSize+header.prgSize),info=Forge161.build.inspectWorldRom(prg,header.prgSize);
  if(!info.extension||info.sceneCount!==entries.length)fail('Packed ROM scenes do not match the current Build Scene Set. Rebuild the project.');
  const linked=Forge163.build.readRomAssets(baseRom);
  if(linked?.version!==2)fail('The packed ROM needs MS16 v2 entity animation bindings.');
  if(linked.sceneEntityCounts.length!==entries.length||entries.some((e,i)=>e.sc.entities.length!==linked.sceneEntityCounts[i]))fail('Packed entity counts do not match the current room entities. Rebuild the project.');
  const packedScenes=extractScenes(prg,header.prgSize);
  if(packedScenes.length!==entries.length)fail('The packed room scene records are incomplete. Rebuild the project.');
  const playerIndex=room.entities.findIndex(e=>e.id===config.playerId),targetIndex=config.targetId?room.entities.findIndex(e=>e.id===config.targetId):-1;
  if(playerIndex<0||room.entities[playerIndex].type!=='player')fail('Choose a player entity from the selected room.');
  if(config.targetId&&(targetIndex<0||targetIndex===playerIndex||!['enemy','npc'].includes(room.entities[targetIndex].type)))fail('The optional training target must be a different Enemy or NPC entity in this room.');
  const sceneAddress=0xD000+sceneIndex*0x600,sceneOffset=sceneAddress-0xC000,roomPalette=Array.from(prg.subarray(sceneOffset+0x410,sceneOffset+0x420));
  const framesById=new Map(linked.frames.map(frame=>[frame.id,frame])),animationsById=new Map(linked.animations.map(animation=>[animation.id,animation])),animationCache=new Map();
  function checkPalette(buildSceneIndex,row,label){
    integer(buildSceneIndex,0,entries.length-1,label+' source scene');integer(row,0,3,label+' palette row');
    const source=entries[buildSceneIndex].sc;
    for(let color=1;color<=3;color++)if(source.sprPal?.[row]?.[color]!==roomPalette[row*4+color])fail(label+' uses sprite palette '+row+' from "'+source.name+'" that differs from the room. Match visible colors 1–3 before building.');
  }
  function normalizePieces(frame,label){
    const result=[];
    const add=(x,y,tile,attr)=>{integer(x,-64,63,label+' piece X');integer(y,-64,63,label+' piece Y');integer(tile,0,255,label+' linked tile');result.push({x,y,tile,attr});};
    if(frame.metaspriteId){
      const asset=framesById.get(frame.metaspriteId);if(!asset)fail(label+' references a missing linked metasprite.');
      for(const piece of asset.pieces){
        checkPalette(asset.buildSceneIndex,piece.pal,label);
        const x=piece.x-asset.originX,y=piece.y-asset.originY,attr=piece.pal|(piece.behind?32:0)|(piece.flipH?64:0)|(piece.flipV?128:0);
        if(asset.spriteMode===16){add(x,y,piece.flipV?piece.tile2:piece.tile,attr);add(x,y+8,piece.flipV?piece.tile:piece.tile2,attr);}
        else add(x,y,piece.tile,attr);
      }
    }else{
      checkPalette(frame.buildSceneIndex,0,label);add(-4,-4,frame.tileIdx,0);
    }
    if(result.length>24)fail(label+' needs '+result.length+' hardware sprites; each actor frame supports at most 24.');
    return result;
  }
  function compileAnimation(id,label){
    if(animationCache.has(id))return animationCache.get(id);
    const animation=animationsById.get(id);if(!animation)fail(label+' references a missing linked animation.');
    if(!animation.frames.length||animation.frames.length>64)fail(label+' supports 1–64 animation frames.');
    const compiled={loop:animation.loop!==false,frames:animation.frames.map((frame,index)=>{
      const frameLabel=label+' frame '+(index+1);
      let eventMask=0;for(const event of frame.events||[])eventMask|=eventBits[event.type]||0;
      return {duration:integer(frame.duration,1,255,frameLabel+' duration'),pieces:normalizePieces(frame,frameLabel),hitboxes:normalizeBoxes(frame.hitboxes||[],frameLabel+' hitboxes'),hurtboxes:normalizeBoxes(frame.hurtboxes||[],frameLabel+' hurtboxes'),eventMask,sound:audioSpec.enabled?audioSpec.soundIndex(frame,frameLabel):255};
    })};
    animationCache.set(id,compiled);return compiled;
  }
  function compileActor(index,role){
    const source=room.entities[index],packed=linked.entities.find(e=>e.buildSceneIndex===sceneIndex&&e.entityIndex===index);
    if(!packed||packed.id!==source.id)fail('Packed '+role+' identity does not match the selected entity. Rebuild the project.');
    const binding=packed.animationBinding;if(!binding?.states?.length)fail('The '+role+' needs animation state bindings in Entity Studio.');
    const states=new Map(binding.states.map(state=>[state.state,state.animationId])),animations={};
    if(role==='player'){
      for(const state of ['idle','walk','attack']){if(!states.has(state))fail('The player needs an "'+state+'" animation binding.');animations[state]=compileAnimation(states.get(state),'Player '+state);}
      if(animations.attack.loop)fail('The player attack animation must be nonlooping.');
      if(states.has('jump'))animations.jump=compileAnimation(states.get('jump'),'Player jump');
    }else{
      if(!states.has(binding.defaultState))fail('The target needs a valid default animation state.');
      animations.idle=compileAnimation(states.get(binding.defaultState),'Target default');
      if(states.has('hurt')){animations.hurt=compileAnimation(states.get('hurt'),'Target hurt');if(animations.hurt.loop)fail('The target hurt animation must be nonlooping.');}
    }
    // Position bytes come from the successfully built scene record, not a new remap.
    const entityOffset=sceneOffset+0x540+index*8;
    return {x:prg[entityOffset+1],y:prg[entityOffset+2],facing:binding.facing==='left'?1:0,animations};
  }
  const physics={};for(const key of ['moveSpeed','jumpSpeed','gravity','maxFallSpeed','bodyWidth','bodyHeight'])physics[key]=config[key];
  const count=integer(prg[sceneOffset+0x420],0,64,'Static OAM count'),staticOAM=[];
  for(let index=0;index<count;index++){const at=sceneOffset+0x421+index*4;staticOAM.push({x:prg[at+3],y:prg[at]+1,tile:prg[at+1],attr:prg[at+2]});}
  const spec={sceneAddress,sceneIndex,playerIndex,targetIndex,collision:collisionMap(room,packedScenes[sceneIndex]),physics,player:compileActor(playerIndex,'player'),target:targetIndex<0?null:compileActor(targetIndex,'target'),staticOAM,warnings:[],audio:audioSpec};
  validateSpawn(spec.player,physics,spec.collision);validateOAM(spec);
  if(!spec.player.animations.attack.frames.some(frame=>frame.hitboxes.length))spec.warnings.push('The player attack has no hitboxes, so it cannot hit the training target.');
  if(spec.target&&!actorFrames(spec.target).some(frame=>frame.hurtboxes.length))spec.warnings.push('The training target has no hurtboxes, so it cannot register hits.');
  return spec;
}
F.compileGameplay=compileGameplay;
})();


(function(){
'use strict';
const F=window.Forge165=window.Forge165||{};
// This assembler is deliberately private: authored assembly and the viewer engine
// are unaffected. Every instruction emitted below is an official NMOS 6502 opcode.
F.makeGameplayEngine=function(spec){
  if(!spec||!Array.isArray(spec.collision)||spec.collision.length!==960)throw Error('Gameplay engine requires a 32 × 30 collision map');
  const physics=spec.physics, player=spec.player, target=spec.target;
  if(!physics||!player||!player.animations)throw Error('Gameplay engine is missing its player or physics');
  const Z={ready:0,tickLo:1,tickHi:2,buttons:3,previousButtons:4,edges:5,playerX:6,playerY:7,velocityY:8,grounded:9,playerState:10,playerFrame:11,playerRemaining:12,playerFacing:13,targetHits:14,targetHurtTimer:15,targetState:16,targetFrame:17,targetRemaining:18,targetFacing:19,eventMask:20,eventCount:21,attackHit:22,frameReady:23,wanted:24,moveDirection:25,steps:26,candidateX:27,candidateY:28,ptr:29,framePtr:31,playerFramePtr:33,targetFramePtr:35,animPtr:37,colLeft:39,colRight:40,rowTop:41,rowBottom:42,row:43,col:44,solid:45,temp:46,temp2:47,piecePtr:48,pieceCount:50,actorX:51,actorY:52,actorFacing:53,pieceX:54,pieceY:55,pieceTile:56,pieceAttr:57,oamIndex:58,pieceOffset:59,boxPtr:60,hitPtr:62,hurtPtr:64,hitCount:66,hurtCount:67,hitIndex:68,hurtIndex:69,boxX:70,boxY:71,boxW:72,boxH:73,rectA:74,rectB:82,rectDest:90,targetX:91,targetY:92,attackRequest:93,oamReady:94,collisionEdge:95};
  const bytes=[], labels={}, fixups=[];let pc=0x8000,serial=0;
  function e(...v){for(const b of v){if(!Number.isInteger(b)||b<0||b>255)throw Error('Invalid engine byte '+b);bytes[pc++-0x8000]=b;}}
  function word(v){e(v&255,(v>>>8)&255);}
  function label(n){if(labels[n]!==undefined)throw Error('Duplicate engine label '+n);labels[n]=pc;}
  function address(n){if(typeof n==='number')word(n);else{fixups.push({at:pc,name:n});word(0);}}
  function abs(op,n){e(op);address(n);}function jsr(n){abs(0x20,n);}function jmp(n){abs(0x4C,n);}
  // Long conditional branches have a fixed, checked three-byte local skip.
  const inverse={0xF0:0xD0,0xD0:0xF0,0x90:0xB0,0xB0:0x90,0x10:0x30,0x30:0x10};
  function b(op,n){e(inverse[op],3);jmp(n);}function uniq(s){return s+'_'+serial++;}
  function imm(a){e(0xA9,a&255);}function ld(a){e(0xA5,a);}function st(a){e(0x85,a);}function set(a,v){imm(v);st(a);}function copy(a,c){ld(a);st(c);}
  function add(v){e(0x18,0x69,v&255);}function sub(v){e(0x38,0xE9,v&255);}
  function zpadd(a){e(0x18,0x65,a);}function zpsub(a){e(0x38,0xE5,a);}
  function dataPointer(name,z){imm(0);fixups.push({at:pc-1,name,part:'lo'});st(z);imm(0);fixups.push({at:pc-1,name,part:'hi'});st(z+1);}
  function fixupByte(name,part){fixups.push({at:pc,name,part});e(0);}
  const PLAYER_ANIMS=[player.animations.idle,player.animations.walk,player.animations.jump||player.animations.idle,player.animations.attack];
  const TARGET_ANIMS=target?[target.animations.idle,target.animations.hurt||target.animations.idle]:[];
  const allAnims=[];for(const a of [...PLAYER_ANIMS,...TARGET_ANIMS]){if(!a||!Array.isArray(a.frames)||!a.frames.length||a.frames.length>64)throw Error('Gameplay engine requires animations of 1–64 frames');if(!allAnims.includes(a))allAnims.push(a);}
  for(const a of allAnims)for(const f of a.frames){if(!Number.isInteger(f.duration)||f.duration<1||f.duration>255)throw Error('Gameplay frame duration is outside 1–255');if(f.pieces.length>24||f.hitboxes.length>4||f.hurtboxes.length>4)throw Error('Gameplay frame exceeds the engine sprite or contact limit');}
  const half=physics.bodyWidth/2;
  label('reset');e(0x78,0xD8,0xA2,0xFF,0x9A);imm(0);abs(0x8D,0x2000);abs(0x8D,0x2001);abs(0x8D,0x4015);imm(0x40);abs(0x8D,0x4017);
  label('wait_vblank_one');abs(0xAD,0x2002);b(0x10,'wait_vblank_one');
  e(0xA2,0);imm(0);label('clear_ram');for(const base of [0,0x100,0x300,0x400,0x500,0x600,0x700])abs(0x9D,base);e(0xE8);b(0xD0,'clear_ram');
  jsr('hide_oam');label('wait_vblank_two');abs(0xAD,0x2002);b(0x10,'wait_vblank_two');jsr('load_room');if(spec.audio?.enabled)jsr('aud_init');if(spec.gameplayCore?.enabled)jsr('gc_room_init');jsr('restart');jsr('draw_all');
  set(Z.ready,1);imm(0);abs(0x8D,0x2003);imm(2);abs(0x8D,0x4014);imm(0x88);abs(0x8D,0x2000);imm(0x1E);abs(0x8D,0x2001);
  label('main');ld(Z.frameReady);b(0xF0,'main');set(Z.frameReady,0);jsr('update');if(spec.audio?.enabled)jsr('aud_frame');jsr('draw_all');e(0xE6,Z.tickLo);b(0xD0,'main');e(0xE6,Z.tickHi);jmp('main');
  label('nmi');e(0x48,0x8A,0x48,0x98,0x48);ld(Z.oamReady);b(0xF0,'nmi_no_dma');imm(0);abs(0x8D,0x2003);st(Z.oamReady);imm(2);abs(0x8D,0x4014);label('nmi_no_dma');imm(0);abs(0x8D,0x2005);abs(0x8D,0x2005);set(Z.frameReady,1);e(0x68,0xA8,0x68,0xAA,0x68,0x40);
  label('irq');e(0x40);
  label('load_room');abs(0xAD,0x2002);imm(0x20);abs(0x8D,0x2006);imm(0);abs(0x8D,0x2006);
  for(let page=0;page<4;page++){e(0xA2,0);const loop=uniq('nt');label(loop);abs(0xBD,spec.sceneAddress+page*256);abs(0x8D,0x2007);e(0xE8);b(0xD0,loop);}
  abs(0xAD,0x2002);imm(0x3F);abs(0x8D,0x2006);imm(0);abs(0x8D,0x2006);e(0xA2,0);label('palette');abs(0xBD,spec.sceneAddress+1024);abs(0x8D,0x2007);e(0xE8,0xE0,32);b(0xD0,'palette');imm(0);abs(0x8D,0x2005);abs(0x8D,0x2005);e(0x60);
  label('restart');set(Z.playerX,player.x);set(Z.playerY,player.y);set(Z.playerFacing,player.facing);for(const z of [Z.velocityY,Z.targetHits,Z.targetHurtTimer,Z.attackHit,Z.attackRequest,Z.eventMask,Z.eventCount])set(z,0);set(Z.playerState,0);set(Z.playerFrame,0);jsr('player_entry');
  if(target){set(Z.targetX,target.x);set(Z.targetY,target.y);set(Z.targetFacing,target.facing);set(Z.targetState,0);set(Z.targetFrame,0);jsr('target_entry');}
  jsr('ground_probe');if(spec.gameplayCore?.enabled)jsr('gc_room_reconstruct');e(0x60);
  label('read_pad');imm(1);abs(0x8D,0x4016);imm(0);abs(0x8D,0x4016);set(Z.buttons,0);e(0xA2,8);label('pad_bit');abs(0xAD,0x4016);e(0x4A,0x66,Z.buttons,0xCA);b(0xD0,'pad_bit');ld(Z.buttons);e(0x45,Z.previousButtons,0x25,Z.buttons);st(Z.edges);copy(Z.buttons,Z.previousButtons);e(0x60);
  label('update');set(Z.eventMask,0);set(Z.attackRequest,0);jsr('read_pad');ld(Z.edges);e(0x29,8);b(0xF0,'not_restart');jsr('restart');e(0x60);label('not_restart');
  if(target){ld(Z.targetHurtTimer);b(0xF0,'target_timer_done');e(0xC6,Z.targetHurtTimer);label('target_timer_done');}
  ld(Z.edges);e(0x29,2);b(0xF0,'no_attack_edge');ld(Z.playerState);e(0xC9,3);b(0xF0,'no_attack_edge');set(Z.attackRequest,1);set(Z.attackHit,0);label('no_attack_edge');
  jsr('horizontal');ld(Z.edges);e(0x29,1);b(0xF0,'no_jump');ld(Z.grounded);b(0xF0,'no_jump');set(Z.velocityY,-physics.jumpSpeed);set(Z.grounded,0);label('no_jump');jsr('vertical');jsr('choose_player');jsr('player_animate');
  if(target){jsr('target_animate');jsr('contacts');}if(spec.gameplayCore?.enabled)jsr('gc_room_update');e(0x60);
  label('horizontal');set(Z.moveDirection,0);ld(Z.buttons);e(0x29,0xC0,0xC9,0x40);b(0xF0,'move_left');e(0xC9,0x80);b(0xD0,'horizontal_done');set(Z.moveDirection,1);set(Z.playerFacing,0);jmp('horizontal_begin');label('move_left');set(Z.moveDirection,255);set(Z.playerFacing,1);
  label('horizontal_begin');set(Z.steps,physics.moveSpeed);label('horizontal_pixel');copy(Z.playerX,Z.candidateX);copy(Z.playerY,Z.candidateY);ld(Z.moveDirection);b(0x30,'left_pixel');set(Z.collisionEdge,2);e(0xE6,Z.candidateX);jmp('horizontal_check');label('left_pixel');set(Z.collisionEdge,1);e(0xC6,Z.candidateX);label('horizontal_check');jsr('body_solid');ld(Z.solid);b(0xD0,'horizontal_done');copy(Z.candidateX,Z.playerX);e(0xC6,Z.steps);b(0xD0,'horizontal_pixel');label('horizontal_done');e(0x60);
  label('vertical');ld(Z.velocityY);b(0xF0,'vertical_probe');b(0x10,'fall_steps');e(0x49,255);add(1);st(Z.steps);jmp('vertical_pixel');label('fall_steps');st(Z.steps);
  label('vertical_pixel');copy(Z.playerX,Z.candidateX);copy(Z.playerY,Z.candidateY);ld(Z.velocityY);b(0x30,'rise_pixel');set(Z.collisionEdge,4);e(0xE6,Z.candidateY);jmp('vertical_check');label('rise_pixel');set(Z.collisionEdge,3);e(0xC6,Z.candidateY);label('vertical_check');jsr('body_solid');ld(Z.solid);b(0xD0,'vertical_blocked');copy(Z.candidateY,Z.playerY);e(0xC6,Z.steps);b(0xD0,'vertical_pixel');jmp('vertical_probe');label('vertical_blocked');set(Z.velocityY,0);
  label('vertical_probe');jsr('ground_probe');ld(Z.grounded);b(0xF0,'apply_gravity');set(Z.velocityY,0);e(0x60);label('apply_gravity');ld(Z.velocityY);add(physics.gravity);b(0x30,'store_gravity');e(0xC9,physics.maxFallSpeed);b(0x90,'store_gravity');imm(physics.maxFallSpeed);label('store_gravity');st(Z.velocityY);e(0x60);
  label('ground_probe');set(Z.collisionEdge,4);copy(Z.playerX,Z.candidateX);ld(Z.playerY);add(1);st(Z.candidateY);jsr('body_solid');copy(Z.solid,Z.grounded);e(0x60);
  label('body_solid');set(Z.solid,1);ld(Z.candidateX);e(0xC9,half);b(0x90,'body_return');if(half>1){e(0xC9,257-half);b(0xB0,'body_return');}ld(Z.candidateY);e(0xC9,physics.bodyHeight);b(0x90,'body_return');e(0xC9,241);b(0xB0,'body_return');
  ld(Z.candidateX);sub(half);e(0x4A,0x4A,0x4A);st(Z.colLeft);ld(Z.candidateX);add(half-1);e(0x4A,0x4A,0x4A);st(Z.colRight);ld(Z.candidateY);sub(physics.bodyHeight);e(0x4A,0x4A,0x4A);st(Z.rowTop);st(Z.row);ld(Z.candidateY);sub(1);e(0x4A,0x4A,0x4A);st(Z.rowBottom);
  // A valid actor moves one pixel at a time, so only the entering edge can
  // encounter a new solid tile. This keeps maximum-size bodies within a frame.
  ld(Z.collisionEdge);e(0xC9,1);b(0xD0,'body_not_left');copy(Z.colLeft,Z.colRight);jmp('body_row');label('body_not_left');e(0xC9,2);b(0xD0,'body_not_right');copy(Z.colRight,Z.colLeft);jmp('body_row');label('body_not_right');e(0xC9,3);b(0xD0,'body_bottom');copy(Z.rowTop,Z.rowBottom);jmp('body_row');label('body_bottom');copy(Z.rowBottom,Z.row);
  label('body_row');ld(Z.row);e(0x29,7,0x0A,0x0A,0x0A,0x0A,0x0A);st(Z.ptr);ld(Z.row);e(0x4A,0x4A,0x4A);add(0);fixups.push({at:pc-1,name:'collision',part:'hi'});st(Z.ptr+1);e(0xA4,Z.colLeft);label('body_col');e(0xB1,Z.ptr);b(0xD0,'body_return');e(0xC4,Z.colRight);b(0xF0,'body_next_row');e(0xC8);jmp('body_col');label('body_next_row');ld(Z.row);e(0xC5,Z.rowBottom);b(0xF0,'body_empty');e(0xE6,Z.row);jmp('body_row');label('body_empty');set(Z.solid,0);label('body_return');e(0x60);
  label('choose_player');ld(Z.attackRequest);b(0xD0,'choose_attack');ld(Z.playerState);e(0xC9,3);b(0xF0,'choose_attack');label('choose_locomotion');ld(Z.grounded);b(0xF0,'choose_jump');ld(Z.moveDirection);b(0xD0,'choose_walk');set(Z.wanted,0);e(0x60);label('choose_walk');set(Z.wanted,1);e(0x60);label('choose_jump');set(Z.wanted,2);e(0x60);label('choose_attack');set(Z.wanted,3);e(0x60);
  function animationCode(prefix,state,frame,remaining,cache){
    label(prefix+'_descriptor');ld(state);e(0x0A,0xAA);abs(0xBD,prefix+'_map');st(Z.animPtr);abs(0xBD,prefix+'_map_hi');st(Z.animPtr+1);e(0x60);
    label(prefix+'_get_frame');jsr(prefix+'_descriptor');ld(frame);e(0x0A);add(2);e(0xA8,0xB1,Z.animPtr);st(cache);e(0xC8,0xB1,Z.animPtr);st(cache+1);e(0x60);
    label(prefix+'_entry');jsr(prefix+'_get_frame');e(0xA0,0,0xB1,cache);st(remaining);e(0xC8,0xB1,cache);b(0xF0,prefix+'_entry_no_event');e(0x05,Z.eventMask);st(Z.eventMask);e(0xE6,Z.eventCount);label(prefix+'_entry_no_event');if(spec.audio?.enabled){e(0xA0,11,0xB1,cache);e(0xC9,255);b(0xF0,prefix+'_entry_done');jsr('aud_play_sfx');}label(prefix+'_entry_done');e(0x60);
    label(prefix+'_animate');
    if(prefix==='player'){ld(Z.wanted);e(0xC5,state);b(0xD0,prefix+'_new_state');}
    e(0xC6,remaining);b(0xD0,prefix+'_anim_done');e(0xE6,frame);jsr(prefix+'_descriptor');e(0xA0,0,0xB1,Z.animPtr,0xC5,frame);b(0xD0,prefix+'_next');e(0xC8,0xB1,Z.animPtr);b(0xD0,prefix+'_loop');
    if(prefix==='player'){ld(state);e(0xC9,3);b(0xD0,prefix+'_hold_last');jsr('choose_locomotion');jmp(prefix+'_new_state');}else{ld(state);b(0xF0,prefix+'_hold_last');set(state,0);set(Z.targetHurtTimer,0);jmp(prefix+'_loop');}
    label(prefix+'_hold_last');e(0xC6,frame);set(remaining,1);e(0x60);
    label(prefix+'_loop');set(frame,0);label(prefix+'_next');jsr(prefix+'_entry');label(prefix+'_anim_done');e(0x60);
    if(prefix==='player'){label(prefix+'_new_state');copy(Z.wanted,state);set(frame,0);jsr(prefix+'_entry');e(0x60);}
  }
  animationCode('player',Z.playerState,Z.playerFrame,Z.playerRemaining,Z.playerFramePtr);
  if(target)animationCode('target',Z.targetState,Z.targetFrame,Z.targetRemaining,Z.targetFramePtr);
  // All OAM work is outside NMI. DMA sees only completed frame buffers.
  label('hide_oam');imm(255);e(0xA2,0);label('hide_loop');abs(0x9D,0x0200);e(0xE8);b(0xD0,'hide_loop');e(0x60);
  label('draw_all');set(Z.oamReady,0);jsr('hide_oam');set(Z.oamIndex,0);
  (spec.staticOAM||[]).forEach((p,index)=>{imm(p.y>0&&p.y<240&&p.x>=0&&p.x<=255?p.y-1:255);abs(0x8D,0x0200+index*4);imm(p.tile);abs(0x8D,0x0201+index*4);imm(p.attr);abs(0x8D,0x0202+index*4);imm(p.x);abs(0x8D,0x0203+index*4);});
  set(Z.oamIndex,(spec.staticOAM||[]).length*4);copy(Z.playerX,Z.actorX);copy(Z.playerY,Z.actorY);copy(Z.playerFacing,Z.actorFacing);copy(Z.playerFramePtr,Z.framePtr);copy(Z.playerFramePtr+1,Z.framePtr+1);jsr('draw_actor');
  if(target){ld(Z.targetHurtTimer);e(0x29,2);b(0xD0,'draw_core');copy(Z.targetX,Z.actorX);copy(Z.targetY,Z.actorY);copy(Z.targetFacing,Z.actorFacing);copy(Z.targetFramePtr,Z.framePtr);copy(Z.targetFramePtr+1,Z.framePtr+1);jsr('draw_actor');}label('draw_core');if(spec.gameplayCore?.enabled)jsr('gc_room_draw');label('draw_done');set(Z.oamReady,1);e(0x60);
  label('draw_actor');e(0xA0,2,0xB1,Z.framePtr);st(Z.pieceCount);b(0xF0,'draw_actor_done');e(0xA0,5,0xB1,Z.framePtr);st(Z.piecePtr);e(0xC8,0xB1,Z.framePtr);st(Z.piecePtr+1);set(Z.pieceOffset,0);
  label('draw_piece');e(0xA4,Z.pieceOffset,0xB1,Z.piecePtr);st(Z.pieceX);e(0xC8,0xB1,Z.piecePtr);st(Z.pieceY);e(0xC8,0xB1,Z.piecePtr);st(Z.pieceTile);e(0xC8,0xB1,Z.piecePtr);st(Z.pieceAttr);e(0xC8,0x84,Z.pieceOffset);ld(Z.actorFacing);b(0xF0,'piece_right');ld(Z.pieceX);e(0x49,255);add(249);st(Z.pieceX);ld(Z.pieceAttr);e(0x49,64);st(Z.pieceAttr);label('piece_right');
  function pieceCoordinate(offset,origin,max,dest){const pos=uniq('piece_positive'),done=uniq('piece_coord');ld(offset);b(0x10,pos);zpadd(origin);b(0x90,'piece_skip');jmp(done);label(pos);zpadd(origin);b(0xB0,'piece_skip');label(done);e(0xC9,max+1);b(0xB0,'piece_skip');st(dest);}
  pieceCoordinate(Z.pieceX,Z.actorX,248,Z.pieceX);pieceCoordinate(Z.pieceY,Z.actorY,232,Z.pieceY);ld(Z.pieceY);b(0xF0,'piece_skip');sub(1);e(0xA6,Z.oamIndex);abs(0x9D,0x0200);ld(Z.pieceTile);abs(0x9D,0x0201);ld(Z.pieceAttr);abs(0x9D,0x0202);ld(Z.pieceX);abs(0x9D,0x0203);ld(Z.oamIndex);add(4);st(Z.oamIndex);
  label('piece_skip');e(0xC6,Z.pieceCount);b(0xD0,'draw_piece');label('draw_actor_done');e(0x60);
  if(target){
    label('contacts');ld(Z.playerState);e(0xC9,3);b(0xD0,'contact_return');ld(Z.attackHit);b(0xD0,'contact_return');e(0xA0,3,0xB1,Z.playerFramePtr);st(Z.hitCount);b(0xF0,'contact_return');e(0xA0,4,0xB1,Z.targetFramePtr);st(Z.hurtCount);b(0xF0,'contact_return');e(0xA0,7,0xB1,Z.playerFramePtr);st(Z.hitPtr);e(0xC8,0xB1,Z.playerFramePtr);st(Z.hitPtr+1);e(0xA0,9,0xB1,Z.targetFramePtr);st(Z.hurtPtr);e(0xC8,0xB1,Z.targetFramePtr);st(Z.hurtPtr+1);set(Z.hitIndex,0);
    label('hit_box');copy(Z.hitPtr,Z.boxPtr);copy(Z.hitPtr+1,Z.boxPtr+1);copy(Z.playerX,Z.actorX);copy(Z.playerY,Z.actorY);copy(Z.playerFacing,Z.actorFacing);set(Z.rectDest,Z.rectA);ld(Z.hitIndex);e(0x0A,0x0A,0xA8);jsr('make_rectangle');set(Z.hurtIndex,0);
    label('hurt_box');copy(Z.hurtPtr,Z.boxPtr);copy(Z.hurtPtr+1,Z.boxPtr+1);copy(Z.targetX,Z.actorX);copy(Z.targetY,Z.actorY);copy(Z.targetFacing,Z.actorFacing);set(Z.rectDest,Z.rectB);ld(Z.hurtIndex);e(0x0A,0x0A,0xA8);jsr('make_rectangle');
    // Rectangles are [left,right,top,bottom] unsigned 16-bit with +128 bias.
    function less16(a,c){const pass=uniq('overlap_axis');ld(a+1);e(0xC5,c+1);b(0x90,pass);b(0xD0,'no_overlap');ld(a);e(0xC5,c);b(0xB0,'no_overlap');label(pass);}
    less16(Z.rectA,Z.rectB+2);less16(Z.rectB,Z.rectA+2);less16(Z.rectA+4,Z.rectB+6);less16(Z.rectB+4,Z.rectA+6);
    set(Z.attackHit,1);e(0xE6,Z.targetHits);set(Z.targetHurtTimer,18);
    if(target.animations.hurt){set(Z.targetState,1);set(Z.targetFrame,0);jsr('target_entry');}e(0x60);
    label('no_overlap');e(0xE6,Z.hurtIndex);ld(Z.hurtIndex);e(0xC5,Z.hurtCount);b(0x90,'hurt_box');e(0xE6,Z.hitIndex);ld(Z.hitIndex);e(0xC5,Z.hitCount);b(0x90,'hit_box');label('contact_return');e(0x60);
    label('make_rectangle');e(0xB1,Z.boxPtr);st(Z.boxX);e(0xC8,0xB1,Z.boxPtr);st(Z.boxY);e(0xC8,0xB1,Z.boxPtr);st(Z.boxW);e(0xC8,0xB1,Z.boxPtr);st(Z.boxH);ld(Z.actorFacing);b(0xF0,'rectangle_facing_done');ld(Z.boxX);zpadd(Z.boxW);e(0x49,255);add(1);st(Z.boxX);label('rectangle_facing_done');e(0xA6,Z.rectDest);
    function rectangleAxis(origin,offset,size){const positive=uniq('rect_positive'),signDone=uniq('rect_sign');set(Z.temp2,0);ld(offset);b(0x10,positive);set(Z.temp2,255);label(positive);ld(origin);add(128);st(Z.temp);imm(0);e(0x69,0);st(Z.solid);ld(Z.temp);zpadd(offset);e(0x95,0);ld(Z.solid);e(0x65,Z.temp2,0x95,1);e(0xB5,0);zpadd(size);e(0x95,2);e(0xB5,1,0x69,0,0x95,3);}
    rectangleAxis(Z.actorX,Z.boxX,Z.boxW);e(0xE8,0xE8,0xE8,0xE8);rectangleAxis(Z.actorY,Z.boxY,Z.boxH);e(0x60);
  }
  const gameplayRuntime=spec.gameplayCore?.enabled?Forge.services.GameplayEngine.emit(spec.gameplayCore,{e,label,address,abs,jsr,jmp,b,imm,ld,st,set,copy,current:()=>pc,fixupByte},Z,{world:false}):null;
  const audioRuntime=spec.audio?.enabled?Forge.services.AudioEngine.emit(spec.audio,{e,label,address,abs,jsr,jmp,b,imm,ld,st,set,copy,current:()=>pc,fixupByte},0xA0):null;
  const codeEnd=pc;if(codeEnd>0xA000)throw Error('Gameplay engine code and Audio Runtime exceed their 8 KB allocation');while(pc<0xA000)e(0xFF);
  label('collision');for(const v of spec.collision){if(v!==0&&v!==1)throw Error('Gameplay collision map must contain only empty or solid cells');e(v);}while(pc%256)e(0);
  function animationMap(name,list){label(name+'_map');for(const a of list)address('anim_'+allAnims.indexOf(a));labels[name+'_map_hi']=labels[name+'_map']+1;}
  animationMap('player',PLAYER_ANIMS);if(target)animationMap('target',TARGET_ANIMS);
  allAnims.forEach((a,ai)=>{label('anim_'+ai);e(a.frames.length,a.loop?1:0);a.frames.forEach((_,fi)=>address('frame_'+ai+'_'+fi));});
  allAnims.forEach((a,ai)=>a.frames.forEach((f,fi)=>{const key=ai+'_'+fi;label('frame_'+key);e(f.duration,f.eventMask||0,f.pieces.length,f.hitboxes.length,f.hurtboxes.length);address('pieces_'+key);address('hits_'+key);address('hurts_'+key);if(spec.audio?.enabled)e(f.sound??255);label('pieces_'+key);for(const p of f.pieces)e(p.x&255,p.y&255,p.tile,p.attr);label('hits_'+key);for(const r of f.hitboxes)e(r.x&255,r.y&255,r.w,r.h);label('hurts_'+key);for(const r of f.hurtboxes)e(r.x&255,r.y&255,r.w,r.h);}));
  const dataEnd=pc;if(dataEnd>0xB800)throw Error('Gameplay animations and collision tables exceed the 6 KB runtime data allocation; reduce used frames or pieces');
  for(const f of fixups){const v=labels[f.name];if(v===undefined)throw Error('Unknown engine label '+f.name);const i=f.at-0x8000;if(f.part)bytes[i]=f.part==='lo'?v&255:v>>>8;else{bytes[i]=v&255;bytes[i+1]=v>>>8;}}
  return{bytes:new Uint8Array(bytes),reset:labels.reset,nmi:labels.nmi,irq:labels.irq,symbols:{...Z,states:{idle:0,walk:1,jump:2,attack:3},targetStates:{idle:0,hurt:1},audio:audioRuntime?.zp||null,gameplay:gameplayRuntime,labels:{...labels}},codeEnd,dataEnd};
};
})();
