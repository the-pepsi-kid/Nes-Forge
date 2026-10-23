/* NES Forge 1.7: independent mapper-0 screen-transition world runtime.
 * No editor, emulator, original compiler or persistent model mutations.
 * Positions are local feet coordinates. Collision samples resolve adjacent
 * screens before reading their bit-packed tables, including body overhang.
 */
(()=>{
'use strict';
const services=(window.Forge=window.Forge||{}).services=window.Forge.services||{};
function compile(spec){
  const fail=message=>{throw Error('World engine: '+message);};
  const integer=(v,min,max,name)=>{if(!Number.isInteger(v)||v<min||v>max)fail(name+' must be '+min+'–'+max);return v;};
  if(!spec||!Array.isArray(spec.screens)||!spec.screens.length||spec.screens.length>64)fail('Expected 1–64 screens');
  const {physics,player,start,screens}=spec;
  for(const [key,min,max]of[['moveSpeed',1,4],['jumpSpeed',1,12],['gravity',1,3],['maxFallSpeed',1,8],['bodyWidth',2,32],['bodyHeight',2,48]])integer(physics?.[key],min,max,key);
  if(physics.bodyWidth%2)fail('Body width must be even');
  integer(start?.screen,0,screens.length-1,'Start screen');integer(start?.x,0,255,'Start X');integer(start?.y,0,239,'Start Y');integer(player?.facing,0,1,'Player facing');
  const animations=[player?.animations?.idle,player?.animations?.walk,player?.animations?.jump||player?.animations?.idle,player?.animations?.attack],allAnims=[...new Set(animations)];
  if(player?.animations?.attack?.loop!==false)fail('Attack animation must be nonlooping');
  for(const animation of allAnims){
    if(!animation||!Array.isArray(animation.frames)||!animation.frames.length||animation.frames.length>64)fail('Animations require 1–64 frames');
    for(const frame of animation.frames){
      integer(frame.duration,1,255,'Frame duration');integer(frame.eventMask||0,0,31,'Frame events');
      if(!Array.isArray(frame.pieces)||frame.pieces.length>24)fail('A frame supports at most 24 sprite pieces');
      const rows=new Map();
      for(const piece of frame.pieces){for(const axis of['x','y'])integer(piece[axis],-64,63,'Piece '+axis);integer(piece.tile,0,255,'Piece tile');integer(piece.attr,0,255,'Piece attributes');for(let y=piece.y;y<piece.y+8;y++){rows.set(y,(rows.get(y)||0)+1);if(rows.get(y)>8)fail('Player frame exceeds eight sprites per scanline');}}
    }
  }
  for(const [i,screen]of screens.entries()){
    if(!screen.nt||screen.nt.length!==1024||Array.from(screen.nt).some(x=>!Number.isInteger(x)||x<0||x>255))fail('Screen '+i+' requires 1024 nametable/attribute bytes');
    if(!screen.collision||screen.collision.length!==960||Array.from(screen.collision).some(x=>x!==0&&x!==1))fail('Screen '+i+' requires 960 Empty/Solid collision values');
    if(!screen.palette||screen.palette.length!==32||Array.from(screen.palette).some(x=>!Number.isInteger(x)||x<0||x>63))fail('Screen '+i+' requires 32 palette entries');
    for(const side of['left','right','up','down'])integer(screen[side],-1,screens.length-1,'Screen '+i+' '+side);
    integer(screen.cameraScreen??i,0,screens.length-1,'Screen '+i+' camera screen');
    for(const key of['worldIndex','roomIndex','cameraIndex','screenX','screenY'])integer(screen[key]??0,0,255,key);
    if(!Array.isArray(screen.markers)||screen.markers.length>240)fail('A screen supports at most 240 markers');
    for(const marker of screen.markers){integer(marker.x,0,255,'Marker X');integer(marker.y,0,239,'Marker Y');integer(marker.targetScreen,0,screens.length-1,'Marker destination');integer(marker.targetX,0,255,'Destination X');integer(marker.targetY,0,239,'Destination Y');}
  }
  const names=['ready','tickLo','tickHi','buttons','previousButtons','edges','screen','renderedScreen','playerX','playerY','velocityY','grounded','playerState','playerFrame','playerRemaining','playerFacing','eventMask','eventCount','frameReady','oamReady','wanted','moveDirection','steps','attackRequest','collisionEdge','candidateScreen','candidateX','candidateY','blocked','solid','sampleX','sampleXHi','sampleY','sampleYHi','endX','endXHi','endY','endYHi','queryScreen','queryX','queryY','byteOffset','bitMask','temp','temp2','ptr','ptrHi','animPtr','animPtrHi','framePtr','framePtrHi','piecePtr','piecePtrHi','pieceCount','pieceOffset','pieceX','pieceY','pieceTile','pieceAttr','oamIndex','markerCount','markerPtr','markerPtrHi','transition','worldIndex','roomIndex','cameraIndex','screenX','screenY','cameraScreen','bodyPtr','bodyPtrHi'];
  const Z=Object.fromEntries(names.map((name,i)=>[name,i]));
  const bytes=[],labels={},fixups=[],resources=[];let pc=0x8000,serial=0;
  function e(...values){for(const value of values){integer(value,0,255,'Opcode/data byte');bytes[pc++-0x8000]=value;}}
  function word(v){e(v&255,v>>>8);}
  function label(name){if(labels[name]!==undefined)fail('Duplicate label '+name);labels[name]=pc;}
  function address(name){if(typeof name==='number')word(name);else{fixups.push({at:pc,name});word(0);}}
  function fixupByte(name,part){fixups.push({at:pc,name,part});e(0);}
  function abs(op,name){e(op);address(name);}const jsr=name=>abs(0x20,name),jmp=name=>abs(0x4C,name),uniq=name=>name+'_'+serial++;
  const inverse={0xF0:0xD0,0xD0:0xF0,0x90:0xB0,0xB0:0x90,0x10:0x30,0x30:0x10};
  function b(op,name){e(inverse[op],3);jmp(name);}
  const imm=value=>e(0xA9,value&255),ld=address=>e(0xA5,address),st=address=>e(0x85,address),set=(address,value)=>{imm(value);st(address);},copy=(from,to)=>{ld(from);st(to);};
  const add=value=>e(0x18,0x69,value&255),sub=value=>e(0x38,0xE9,value&255),zpadd=address=>e(0x18,0x65,address);
  function tablePointer(table,index,dest){e(0xA6,index);abs(0xBD,table+'_lo');st(dest);abs(0xBD,table+'_hi');st(dest+1);}
  function signedOffset(source,delta,dest){ld(source);if(delta<0){sub(-delta);st(dest);imm(0);e(0xE9,0);st(dest+1);}else{add(delta);st(dest);imm(0);e(0x69,0);st(dest+1);}}
  const half=physics.bodyWidth/2;

  label('reset');e(0x78,0xD8,0xA2,0xFF,0x9A);imm(0);abs(0x8D,0x2000);abs(0x8D,0x2001);abs(0x8D,0x4015);imm(0x40);abs(0x8D,0x4017);
  label('boot_vblank_one');abs(0xAD,0x2002);b(0x10,'boot_vblank_one');e(0xA2,0);imm(0);label('clear_ram');for(const base of[0,0x100,0x300,0x400,0x500,0x600,0x700])abs(0x9D,base);e(0xE8);b(0xD0,'clear_ram');jsr('hide_oam');
  label('boot_vblank_two');abs(0xAD,0x2002);b(0x10,'boot_vblank_two');set(Z.renderedScreen,255);if(spec.audio?.enabled)jsr('aud_init');if(spec.gameplayCore?.enabled)jsr('gc_world_init');jsr('restart');jsr('load_screen');jsr('draw_all');jsr('enable_screen');set(Z.ready,1);
  label('main');ld(Z.frameReady);b(0xF0,'main');set(Z.frameReady,0);jsr('update');if(spec.audio?.enabled)jsr('aud_frame');jsr('publish_screen');ld(Z.cameraScreen);e(0xC5,Z.renderedScreen);b(0xF0,'main_draw');jsr('change_screen');jmp('main_tick');label('main_draw');jsr('draw_all');label('main_tick');e(0xE6,Z.tickLo);b(0xD0,'main');e(0xE6,Z.tickHi);jmp('main');
  label('nmi');e(0x48,0x8A,0x48,0x98,0x48);ld(Z.oamReady);b(0xF0,'nmi_no_dma');imm(0);abs(0x8D,0x2003);st(Z.oamReady);imm(2);abs(0x8D,0x4014);label('nmi_no_dma');imm(0);abs(0x8D,0x2005);abs(0x8D,0x2005);set(Z.frameReady,1);e(0x68,0xA8,0x68,0xAA,0x68,0x40);label('irq');e(0x40);
  // Transition work is deliberately outside the ordinary frame budget. Blank
  // starts in vblank; NMI is disabled for complete VRAM uploads and resumes
  // only after a second vblank with complete OAM and zero scroll.
  label('change_screen');set(Z.transition,1);imm(8);abs(0x8D,0x2000);abs(0xAD,0x2002);label('transition_vblank');abs(0xAD,0x2002);b(0x10,'transition_vblank');imm(0);abs(0x8D,0x2001);jsr('load_screen');jsr('draw_all');jsr('enable_screen');set(Z.transition,0);e(0x60);
  label('load_screen');jsr('publish_screen');abs(0xAD,0x2002);imm(0x20);abs(0x8D,0x2006);imm(0);abs(0x8D,0x2006);tablePointer('nt',Z.cameraScreen,Z.ptr);e(0xA2,4,0xA0,0);label('upload_nt');e(0xB1,Z.ptr);abs(0x8D,0x2007);e(0xC8);b(0xD0,'upload_nt');e(0xE6,Z.ptr+1,0xCA);b(0xD0,'upload_nt');
  abs(0xAD,0x2002);imm(0x3F);abs(0x8D,0x2006);imm(0);abs(0x8D,0x2006);tablePointer('pal',Z.cameraScreen,Z.ptr);e(0xA0,0);label('upload_pal');e(0xB1,Z.ptr);abs(0x8D,0x2007);e(0xC8,0xC0,32);b(0xD0,'upload_pal');copy(Z.cameraScreen,Z.renderedScreen);e(0x60);
  label('enable_screen');abs(0xAD,0x2002);label('enable_vblank');abs(0xAD,0x2002);b(0x10,'enable_vblank');imm(0);abs(0x8D,0x2003);st(Z.oamReady);st(Z.frameReady);imm(2);abs(0x8D,0x4014);imm(0);abs(0x8D,0x2005);abs(0x8D,0x2005);imm(0x88);abs(0x8D,0x2000);imm(0x1E);abs(0x8D,0x2001);e(0x60);
  label('publish_screen');e(0xA6,Z.screen);for(const name of['worldIndex','roomIndex','cameraIndex','screenX','screenY','cameraScreen']){abs(0xBD,name+'_table');st(Z[name]);}e(0x60);
  label('restart');set(Z.screen,start.screen);set(Z.playerX,start.x);set(Z.playerY,start.y);set(Z.playerFacing,player.facing);set(Z.eventCount,0);jsr('reset_actor');if(spec.gameplayCore?.enabled)jsr('gc_world_reconstruct');e(0x60);
  label('reset_actor');for(const name of['velocityY','playerState','playerFrame','moveDirection','attackRequest'])set(Z[name],0);jsr('player_entry');jsr('ground_probe');e(0x60);
  label('read_pad');imm(1);abs(0x8D,0x4016);imm(0);abs(0x8D,0x4016);set(Z.buttons,0);e(0xA2,8);label('pad_bit');abs(0xAD,0x4016);e(0x4A,0x66,Z.buttons,0xCA);b(0xD0,'pad_bit');ld(Z.buttons);e(0x45,Z.previousButtons,0x25,Z.buttons);st(Z.edges);copy(Z.buttons,Z.previousButtons);e(0x60);
  label('update');set(Z.eventMask,0);set(Z.attackRequest,0);jsr('read_pad');ld(Z.edges);e(0x29,8);b(0xF0,'not_restart');jsr('restart');e(0x60);label('not_restart');ld(Z.edges);e(0x29,16);b(0xF0,'not_marker');jsr('use_marker');ld(Z.temp2);b(0xF0,'not_marker');e(0x60);label('not_marker');
  ld(Z.edges);e(0x29,2);b(0xF0,'no_attack_edge');ld(Z.playerState);e(0xC9,3);b(0xF0,'no_attack_edge');set(Z.attackRequest,1);label('no_attack_edge');jsr('horizontal');ld(Z.edges);e(0x29,1);b(0xF0,'no_jump');ld(Z.grounded);b(0xF0,'no_jump');set(Z.velocityY,-physics.jumpSpeed);set(Z.grounded,0);label('no_jump');jsr('vertical');jsr('choose_player');jsr('player_animate');if(spec.gameplayCore?.enabled)jsr('gc_world_update');e(0x60);
  // A feet origin is the exclusive body bottom: use its last occupied pixel
  // to activate the authored marker above a floor at a metatile boundary.
  // A direct cell index bounds Up processing independently of marker count.
  // Its 240 bytes precede compact three-byte destination records. The first
  // authored marker in a cell wins, matching the original ordered lookup.
  label('use_marker');set(Z.temp2,0);ld(Z.playerY);b(0xF0,'marker_done');sub(1);e(0x29,0xF0);st(Z.temp);ld(Z.playerX);e(0x4A,0x4A,0x4A,0x4A,0x05,Z.temp,0xA8);tablePointer('markers',Z.screen,Z.markerPtr);e(0xB1,Z.markerPtr,0xC9,255);b(0xF0,'marker_done');
  st(Z.temp);e(0x0A);st(Z.byteOffset);imm(0);e(0x69,0);st(Z.bitMask);ld(Z.byteOffset);zpadd(Z.temp);st(Z.byteOffset);ld(Z.bitMask);e(0x69,0);st(Z.bitMask);ld(Z.byteOffset);add(240);st(Z.byteOffset);ld(Z.bitMask);e(0x69,0);st(Z.bitMask);
  ld(Z.markerPtr);zpadd(Z.byteOffset);st(Z.ptr);ld(Z.markerPtr+1);e(0x65,Z.bitMask);st(Z.ptr+1);e(0xA0,0,0xB1,Z.ptr);st(Z.screen);e(0xC8,0xB1,Z.ptr);st(Z.playerX);e(0xC8,0xB1,Z.ptr);st(Z.playerY);jsr('reset_actor');set(Z.temp2,1);label('marker_done');e(0x60);

  label('prepare_candidate');copy(Z.screen,Z.candidateScreen);copy(Z.playerX,Z.candidateX);copy(Z.playerY,Z.candidateY);set(Z.blocked,0);e(0x60);
  // Each movement/probe is one pixel. Crossing the feet origin changes the
  // local coordinate and candidate screen; body samples can span neighbors.
  label('step_candidate');ld(Z.collisionEdge);e(0xC9,1);b(0xF0,'candidate_left');e(0xC9,2);b(0xF0,'candidate_right');e(0xC9,3);b(0xF0,'candidate_up');e(0xE6,Z.candidateY);ld(Z.candidateY);e(0xC9,240);b(0xD0,'candidate_done');set(Z.candidateY,0);e(0xA6,Z.candidateScreen);abs(0xBD,'down_table');jmp('candidate_neighbor');
  label('candidate_up');ld(Z.candidateY);b(0xF0,'candidate_up_cross');e(0xC6,Z.candidateY);e(0x60);label('candidate_up_cross');set(Z.candidateY,239);e(0xA6,Z.candidateScreen);abs(0xBD,'up_table');jmp('candidate_neighbor');
  label('candidate_left');ld(Z.candidateX);b(0xF0,'candidate_left_cross');e(0xC6,Z.candidateX);e(0x60);label('candidate_left_cross');set(Z.candidateX,255);e(0xA6,Z.candidateScreen);abs(0xBD,'left_table');jmp('candidate_neighbor');
  label('candidate_right');e(0xE6,Z.candidateX);b(0xD0,'candidate_done');e(0xA6,Z.candidateScreen);abs(0xBD,'right_table');label('candidate_neighbor');e(0xC9,255);b(0xF0,'candidate_blocked');st(Z.candidateScreen);label('candidate_done');e(0x60);label('candidate_blocked');set(Z.blocked,1);e(0x60);
  label('commit_candidate');copy(Z.candidateScreen,Z.screen);copy(Z.candidateX,Z.playerX);copy(Z.candidateY,Z.playerY);e(0x60);
  label('horizontal');set(Z.moveDirection,0);ld(Z.buttons);e(0x29,0xC0,0xC9,0x40);b(0xF0,'move_left');e(0xC9,0x80);b(0xD0,'horizontal_done');set(Z.moveDirection,1);set(Z.playerFacing,0);set(Z.collisionEdge,2);jmp('horizontal_begin');label('move_left');set(Z.moveDirection,255);set(Z.playerFacing,1);set(Z.collisionEdge,1);label('horizontal_begin');set(Z.steps,physics.moveSpeed);label('horizontal_pixel');jsr('prepare_candidate');jsr('step_candidate');jsr('body_solid');ld(Z.solid);b(0xD0,'horizontal_done');jsr('commit_candidate');e(0xC6,Z.steps);b(0xD0,'horizontal_pixel');label('horizontal_done');e(0x60);
  label('vertical');ld(Z.velocityY);b(0xF0,'vertical_probe');b(0x10,'fall_steps');e(0x49,255);add(1);st(Z.steps);set(Z.collisionEdge,3);jmp('vertical_pixel');label('fall_steps');st(Z.steps);set(Z.collisionEdge,4);label('vertical_pixel');jsr('prepare_candidate');jsr('step_candidate');jsr('body_solid');ld(Z.solid);b(0xD0,'vertical_blocked');jsr('commit_candidate');e(0xC6,Z.steps);b(0xD0,'vertical_pixel');jmp('vertical_probe');label('vertical_blocked');set(Z.velocityY,0);label('vertical_probe');jsr('ground_probe');ld(Z.grounded);b(0xF0,'apply_gravity');set(Z.velocityY,0);e(0x60);label('apply_gravity');ld(Z.velocityY);add(physics.gravity);b(0x30,'store_gravity');e(0xC9,physics.maxFallSpeed);b(0x90,'store_gravity');imm(physics.maxFallSpeed);label('store_gravity');st(Z.velocityY);e(0x60);
  label('ground_probe');set(Z.collisionEdge,4);jsr('prepare_candidate');jsr('step_candidate');jsr('body_solid');copy(Z.solid,Z.grounded);e(0x60);
  label('body_solid');set(Z.solid,1);ld(Z.blocked);b(0xD0,'body_return');tablePointer('collision',Z.candidateScreen,Z.bodyPtr);ld(Z.collisionEdge);e(0xC9,3);b(0xB0,'body_vertical');
  signedOffset(Z.candidateY,-physics.bodyHeight,Z.sampleY);signedOffset(Z.candidateY,-1,Z.endY);ld(Z.collisionEdge);e(0xC9,1);b(0xD0,'body_right_edge');signedOffset(Z.candidateX,-half,Z.sampleX);jmp('body_y_loop');label('body_right_edge');signedOffset(Z.candidateX,half-1,Z.sampleX);
  label('body_y_loop');jsr('sample_solid');ld(Z.solid);b(0xD0,'body_return');ld(Z.sampleYHi);e(0xC5,Z.endYHi);b(0xD0,'body_next_y');ld(Z.sampleY);e(0x45,Z.endY,0x29,248);b(0xF0,'body_return');label('body_next_y');ld(Z.sampleY);e(0x29,248);add(8);st(Z.sampleY);b(0x90,'body_y_loop');e(0xE6,Z.sampleYHi);jmp('body_y_loop');
  label('body_vertical');signedOffset(Z.candidateX,-half,Z.sampleX);signedOffset(Z.candidateX,half-1,Z.endX);ld(Z.collisionEdge);e(0xC9,3);b(0xD0,'body_bottom_edge');signedOffset(Z.candidateY,-physics.bodyHeight,Z.sampleY);jmp('body_x_loop');label('body_bottom_edge');signedOffset(Z.candidateY,-1,Z.sampleY);
  label('body_x_loop');jsr('sample_solid');ld(Z.solid);b(0xD0,'body_return');ld(Z.sampleXHi);e(0xC5,Z.endXHi);b(0xD0,'body_next_x');ld(Z.sampleX);e(0x45,Z.endX,0x29,248);b(0xF0,'body_return');label('body_next_x');ld(Z.sampleX);e(0x29,248);add(8);st(Z.sampleX);b(0x90,'body_x_loop');e(0xE6,Z.sampleXHi);jmp('body_x_loop');label('body_return');e(0x60);
  function collisionIndex(y){ld(Z.sampleX);e(0x4A,0x4A,0x4A,0xAA);abs(0xBD,'bit_masks');st(Z.bitMask);abs(0xBD,'byte_offsets');st(Z.temp);ld(y);e(0x29,248,0x4A,0x05,Z.temp,0xA8);}
  label('sample_solid');set(Z.solid,1);ld(Z.sampleXHi);e(0x05,Z.sampleYHi);b(0xD0,'sample_neighbor');collisionIndex(Z.sampleY);e(0xB1,Z.bodyPtr,0x25,Z.bitMask,0xD0,4);set(Z.solid,0);e(0x60);
  // Feet are normalized before checking the entering body edge, so samples
  // can overhang left/right/top but never below the normalized feet. Linked
  // neighbor pointers avoid resolving the same diagonal for every tile.
  label('sample_neighbor');copy(Z.sampleY,Z.queryY);ld(Z.sampleYHi);b(0x30,'sample_upper');ld(Z.sampleXHi);b(0x30,'sample_flat_left');tablePointer('collision_right',Z.candidateScreen,Z.ptr);jmp('sample_lookup');label('sample_flat_left');tablePointer('collision_left',Z.candidateScreen,Z.ptr);jmp('sample_lookup');
  label('sample_upper');ld(Z.sampleY);add(240);st(Z.queryY);ld(Z.sampleXHi);b(0xF0,'sample_up_only');b(0x30,'sample_up_left');tablePointer('collision_up_right',Z.candidateScreen,Z.ptr);jmp('sample_lookup');label('sample_up_left');tablePointer('collision_up_left',Z.candidateScreen,Z.ptr);jmp('sample_lookup');label('sample_up_only');tablePointer('collision_up',Z.candidateScreen,Z.ptr);
  label('sample_lookup');ld(Z.ptr+1);b(0xF0,'sample_return');collisionIndex(Z.queryY);e(0xB1,Z.ptr,0x25,Z.bitMask);b(0xD0,'sample_return');set(Z.solid,0);label('sample_return');e(0x60);

  label('choose_player');ld(Z.attackRequest);b(0xD0,'choose_attack');ld(Z.playerState);e(0xC9,3);b(0xF0,'choose_attack');label('choose_locomotion');ld(Z.grounded);b(0xF0,'choose_jump');ld(Z.moveDirection);b(0xD0,'choose_walk');set(Z.wanted,0);e(0x60);label('choose_walk');set(Z.wanted,1);e(0x60);label('choose_jump');set(Z.wanted,2);e(0x60);label('choose_attack');set(Z.wanted,3);e(0x60);
  label('player_descriptor');ld(Z.playerState);e(0x0A,0xAA);abs(0xBD,'player_map');st(Z.animPtr);abs(0xBD,'player_map_hi');st(Z.animPtr+1);e(0x60);
  label('player_get_frame');jsr('player_descriptor');ld(Z.playerFrame);e(0x0A);add(2);e(0xA8,0xB1,Z.animPtr);st(Z.framePtr);e(0xC8,0xB1,Z.animPtr);st(Z.framePtr+1);e(0x60);
  label('player_entry');jsr('player_get_frame');e(0xA0,0,0xB1,Z.framePtr);st(Z.playerRemaining);e(0xC8,0xB1,Z.framePtr);b(0xF0,'player_entry_no_event');e(0x05,Z.eventMask);st(Z.eventMask);e(0xE6,Z.eventCount);label('player_entry_no_event');if(spec.audio?.enabled){e(0xA0,5,0xB1,Z.framePtr,0xC9,255);b(0xF0,'player_entry_done');jsr('aud_play_sfx');}label('player_entry_done');e(0x60);
  label('player_animate');ld(Z.wanted);e(0xC5,Z.playerState);b(0xD0,'player_new_state');e(0xC6,Z.playerRemaining);b(0xD0,'player_anim_done');e(0xE6,Z.playerFrame);jsr('player_descriptor');e(0xA0,0,0xB1,Z.animPtr,0xC5,Z.playerFrame);b(0xD0,'player_next');e(0xC8,0xB1,Z.animPtr);b(0xD0,'player_loop');ld(Z.playerState);e(0xC9,3);b(0xD0,'player_hold_last');jsr('choose_locomotion');jmp('player_new_state');label('player_hold_last');e(0xC6,Z.playerFrame);set(Z.playerRemaining,1);e(0x60);label('player_loop');set(Z.playerFrame,0);label('player_next');jsr('player_entry');label('player_anim_done');e(0x60);label('player_new_state');copy(Z.wanted,Z.playerState);set(Z.playerFrame,0);jsr('player_entry');e(0x60);
  label('hide_oam');imm(255);e(0xA2,0);label('hide_loop');abs(0x9D,0x0200);e(0xE8,0xD0,0xFA);e(0x60); // Six-byte local loop; saves 510 cycles per OAM clear.
  label('draw_all');set(Z.oamReady,0);jsr('hide_oam');set(Z.oamIndex,0);ld(Z.screen);e(0xC5,Z.cameraScreen);b(0xD0,'draw_done');e(0xA0,2,0xB1,Z.framePtr);st(Z.pieceCount);b(0xF0,'draw_done');e(0xC8,0xB1,Z.framePtr);st(Z.piecePtr);e(0xC8,0xB1,Z.framePtr);st(Z.piecePtr+1);set(Z.pieceOffset,0);
  label('draw_piece');e(0xA4,Z.pieceOffset,0xB1,Z.piecePtr);st(Z.pieceX);e(0xC8,0xB1,Z.piecePtr);st(Z.pieceY);e(0xC8,0xB1,Z.piecePtr);st(Z.pieceTile);e(0xC8,0xB1,Z.piecePtr);st(Z.pieceAttr);e(0xC8,0x84,Z.pieceOffset);ld(Z.playerFacing);b(0xF0,'piece_right');ld(Z.pieceX);e(0x49,255);add(249);st(Z.pieceX);ld(Z.pieceAttr);e(0x49,64);st(Z.pieceAttr);label('piece_right');
  function coordinate(offset,origin,max){const positive=uniq('piece_positive'),done=uniq('piece_coordinate');ld(offset);b(0x10,positive);zpadd(origin);b(0x90,'piece_skip');jmp(done);label(positive);zpadd(origin);b(0xB0,'piece_skip');label(done);e(0xC9,max+1);b(0xB0,'piece_skip');st(offset);}
  coordinate(Z.pieceX,Z.playerX,248);coordinate(Z.pieceY,Z.playerY,232);ld(Z.pieceY);b(0xF0,'piece_skip');sub(1);e(0xA6,Z.oamIndex);abs(0x9D,0x0200);ld(Z.pieceTile);abs(0x9D,0x0201);ld(Z.pieceAttr);abs(0x9D,0x0202);ld(Z.pieceX);abs(0x9D,0x0203);ld(Z.oamIndex);add(4);st(Z.oamIndex);label('piece_skip');e(0xC6,Z.pieceCount);b(0xD0,'draw_piece');label('draw_core');if(spec.gameplayCore?.enabled)jsr('gc_world_draw');label('draw_done');set(Z.oamReady,1);e(0x60);

  const gameplayRuntime=spec.gameplayCore?.enabled?services.GameplayEngine.emit(spec.gameplayCore,{e,label,address,abs,jsr,jmp,b,imm,ld,st,set,copy,current:()=>pc,fixupByte},Z,{world:true}):null;
  const audioRuntime=spec.audio?.enabled?services.AudioEngine.emit(spec.audio,{e,label,address,abs,jsr,jmp,b,imm,ld,st,set,copy,current:()=>pc,fixupByte},0x80):null;
  const codeEnd=pc;resources.push({kind:'code',ownerId:'world-engine',address:0x8000,byteLength:codeEnd-0x8000,alignment:1,region:'PRG',bank:0});
  const dataResource=(name,kind,values)=>{label(name);const address=pc;for(const value of values)e(value);resources.push({kind,ownerId:name,address,byteLength:pc-address,alignment:1,region:'PRG',bank:0});};
  dataResource('bit_masks','lookup',Array.from({length:32},(_,i)=>1<<(i&7)));
  dataResource('byte_offsets','lookup',Array.from({length:32},(_,i)=>i>>3));
  for(const key of['left','right','up','down','worldIndex','roomIndex','cameraIndex','screenX','screenY','cameraScreen'])dataResource(key+'_table','screen-index',screens.map((screen,index)=>(screen[key]??(key==='cameraScreen'?index:0))&255));
  const refs={nt:[],collision:[],pal:[],markers:[]},data=[];
  for(const kind of Object.keys(refs)){
    const seen=new Map();screens.forEach((screen,index)=>{
      let values;if(kind==='nt')values=Array.from(screen.nt);else if(kind==='pal')values=Array.from(screen.palette);else if(kind==='markers'){values=new Array(240).fill(255);screen.markers.forEach((marker,i)=>{const cell=(marker.y>>4)*16+(marker.x>>4);if(values[cell]===255)values[cell]=i;});values.push(...screen.markers.flatMap(marker=>[marker.targetScreen,marker.targetX,marker.targetY]));}else{values=new Array(120).fill(0);screen.collision.forEach((value,i)=>{if(value)values[i>>3]|=1<<(i&7);});}
      const key=values.join(',');let name=seen.get(key);if(!name){name=kind+'_data_'+index;seen.set(key,name);data.push({name,kind,values});}refs[kind].push(name);
    });
    for(const part of['lo','hi']){label(kind+'_'+part);const address=pc;for(const name of refs[kind]){fixups.push({at:pc,name,part});e(0);}resources.push({kind:'resource-pointers',ownerId:kind+'_'+part,address,byteLength:pc-address,alignment:1,region:'PRG',bank:0});}
  }
  for(const [direction,resolve]of Object.entries({left:s=>s.left,right:s=>s.right,up:s=>s.up,up_left:s=>s.left<0?-1:screens[s.left].up,up_right:s=>s.right<0?-1:screens[s.right].up})){
    for(const part of['lo','hi']){const name='collision_'+direction+'_'+part;label(name);const address=pc;for(const screen of screens){const neighbor=resolve(screen);if(neighbor<0)e(0);else{fixups.push({at:pc,name:refs.collision[neighbor],part});e(0);}}resources.push({kind:'neighbor-collision-pointers',ownerId:name,address,byteLength:pc-address,alignment:1,region:'PRG',bank:0});}
  }
  label('player_map');for(const animation of animations)address('animation_'+allAnims.indexOf(animation));labels.player_map_hi=labels.player_map+1;resources.push({kind:'animation-map',ownerId:'player_map',address:labels.player_map,byteLength:8,alignment:1,region:'PRG',bank:0});
  allAnims.forEach((animation,ai)=>{const name='animation_'+ai;label(name);e(animation.frames.length,animation.loop!==false?1:0);animation.frames.forEach((_,fi)=>address('frame_'+ai+'_'+fi));resources.push({kind:'animation-descriptor',ownerId:name,address:labels[name],byteLength:pc-labels[name],alignment:1,region:'PRG',bank:0});});
  allAnims.forEach((animation,ai)=>animation.frames.forEach((frame,fi)=>{const name='frame_'+ai+'_'+fi;label(name);e(frame.duration,frame.eventMask||0,frame.pieces.length);address('pieces_'+ai+'_'+fi);if(spec.audio?.enabled)e(frame.sound??255);resources.push({kind:'animation-frame',ownerId:name,address:labels[name],byteLength:pc-labels[name],alignment:1,region:'PRG',bank:0});dataResource('pieces_'+ai+'_'+fi,'player-pieces',frame.pieces.flatMap(piece=>[piece.x&255,piece.y&255,piece.tile,piece.attr]));}));
  for(const record of data)dataResource(record.name,record.kind,record.values);
  const dataEnd=pc;if(dataEnd>0xCFF0)fail('World engine and screen resources require '+(dataEnd-0x8000)+' bytes; only '+(0xCFF0-0x8000)+' bytes fit before the Forge marker');
  for(const fixup of fixups){const value=labels[fixup.name];if(value===undefined)fail('Unknown engine label '+fixup.name);const i=fixup.at-0x8000;if(fixup.part)bytes[i]=fixup.part==='lo'?value&255:value>>>8;else{bytes[i]=value&255;bytes[i+1]=value>>>8;}}
  return{bytes:new Uint8Array(bytes),reset:labels.reset,nmi:labels.nmi,irq:labels.irq,symbols:{...Z,states:{idle:0,walk:1,jump:2,attack:3},audio:audioRuntime?.zp||null,gameplay:gameplayRuntime,labels:{...labels}},codeEnd,dataEnd,resources};
}
services.WorldEngine=Object.freeze({compile});
})();
