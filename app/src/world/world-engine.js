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
  const enemy=spec.flyingEnemy||null;
  const aiConfig=enemy?{speedTicks:2,detectX:112,detectY:96,touchX:12,touchY:14,retreatTicks:52,hurtTicks:42,hoverTicks:16,pathMode:'loop',pathWait:0,contactBounce:false,...(enemy.config||{})}:null;
  const aiPath=enemy?(enemy.path||[]):[];
  const aiLegacy=!!enemy?.legacyProfile;
  const smooth=spec.cameraMode==='smoothHorizontal';
  if(smooth){if(screens.length<2||screens.length>16||screens.some((sc,i)=>sc.screenX!==i||sc.screenY!==0||sc.left!==(i?i-1:-1)||sc.right!==(i<screens.length-1?i+1:-1)))fail('Smooth streaming needs 2–16 contiguous screens in one horizontal row');
    if(screens.some(sc=>sc.palette.some((c,i)=>c!==screens[0].palette[i])))fail('Smooth streaming requires one shared 32-color NES palette for all screens');
  }
  for(const [key,min,max]of[['moveSpeed',1,4],['jumpSpeed',1,12],['gravity',1,3],['maxFallSpeed',1,8],['bodyWidth',2,32],['bodyHeight',2,48]])integer(physics?.[key],min,max,key);
  if(physics.bodyWidth%2)fail('Body width must be even');
  integer(start?.screen,0,screens.length-1,'Start screen');integer(start?.x,0,255,'Start X');integer(start?.y,0,239,'Start Y');integer(player?.facing,0,1,'Player facing');
  const animations=[player?.animations?.idle,player?.animations?.walk,player?.animations?.jump||player?.animations?.idle,player?.animations?.attack],allAnims=[...new Set(animations)];
  if(player?.animations?.attack?.loop!==false)fail('Attack animation must be nonlooping');
  if(enemy){
   if(typeof aiConfig.contactBounce!=='boolean')fail('Enemy contactBounce must be boolean');
   if(![1,2,4,8].includes(aiConfig.speedTicks)||![8,16,32,64].includes(aiConfig.hoverTicks)||!['loop','pingpong','once'].includes(aiConfig.pathMode))fail('Enemy AI speed, hover or path mode is invalid');
   for(const [key,min,max] of [['detectX',16,120],['detectY',16,180],['touchX',4,24],['touchY',4,24],['retreatTicks',8,180],['hurtTicks',8,120],['pathWait',0,120]])integer(aiConfig[key],min,max,key);
   if(!Array.isArray(aiPath)||aiPath.length>8)fail('Enemy AI supports 0–8 waypoints');for(const point of aiPath){integer(point.screen,0,screens.length-1,'Waypoint screen');integer(point.x,0,255,'Waypoint X');integer(point.y,20,190,'Waypoint Y');}
   if(!smooth)fail('Flying Chaser requires smooth World mode');integer(enemy.start.screen,0,screens.length-1,'Enemy screen');integer(enemy.start.x,8,247,'Enemy X');integer(enemy.start.y,20,190,'Enemy Y');if(!Array.isArray(enemy.frames)||!enemy.frames.length||enemy.frames.length>8)fail('Flying Chaser requires 1–8 frames');for(const f of enemy.frames){integer(f.duration,1,255,'Enemy frame duration');if(!Array.isArray(f.pieces)||f.pieces.length>24)fail('Enemy frame exceeds 24 OAM slots');for(const p of f.pieces){integer(p.x,-64,63,'Enemy piece X');integer(p.y,-64,63,'Enemy piece Y');integer(p.tile,0,255,'Enemy piece tile');integer(p.attr,0,255,'Enemy piece attr');}}}
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
  // chrSelect: the engine selects each world's CHR bank on screen loads (mapper 3). It is needed with several graphics
  // banks, and with one bank when the authoring record is stored in CHR data banks (layout 5).
  const chrSelect=(spec.chrBanks||1)>1||spec.chrSelect===true;
  if(spec.chrBanks!==undefined||chrSelect){
    integer(spec.chrBanks??1,1,4,'CHR bank count');
    if(chrSelect){
      const worldsUsed=Math.max(...screens.map(sc=>sc.worldIndex??0))+1;
      if(!Array.isArray(spec.worldChrBank)||spec.worldChrBank.length<worldsUsed)fail('Every world needs a CHR bank');
      spec.worldChrBank.forEach((bank,i)=>integer(bank,0,(spec.chrBanks??1)-1,'World '+i+' CHR bank'));
      if(spec.cameraMode==='smoothHorizontal')fail('Per-world CHR banks need screen transitions between worlds');
    }
  }
  // Stairs: per-screen diagonal segments {x, y (feet at the bottom end), len (pixels), dir (0 up-right, 1 up-left)}.
  let stairTotal=0;
  for(const [i,screen]of screens.entries()){
    if(screen.stairs===undefined)continue;
    if(!Array.isArray(screen.stairs)||screen.stairs.length>8)fail('Screen '+i+' supports at most 8 stairs');
    for(const st of screen.stairs){integer(st.x,0,255,'Stair X');integer(st.y,1,239,'Stair Y');integer(st.len,2,200,'Stair length');integer(st.dir,0,1,'Stair direction');
      const tx=st.x+(st.dir?-st.len:st.len);if(tx<0||tx>255||st.y-st.len<1)fail('Screen '+i+' stair leaves its screen');}
    stairTotal+=screen.stairs.length;
  }
  if(stairTotal>255)fail('At most 255 stairs');
  // Lossless, automatically selected column-dictionary storage for smooth Worlds.
  // The PPU receives the original exact tile and attribute bytes. The engine's
  // discrete-screen path retains its previous raw nametable representation.
  const colPool=[],colKeys=new Map();
  const pooledNt=screens.map(screen=>{
    const ids=[];
    for(let col=0;col<32;col++){
      const values=Array.from({length:30},(_,row)=>screen.nt[row*32+col]);
      const key=values.join(',');let id=colKeys.get(key);
      if(id===undefined){id=colPool.length;colPool.push(values);colKeys.set(key,id);}
      ids.push(id);
    }
    return ids.concat(Array.from(screen.nt).slice(960));
  });
  // Include a generous runtime code allowance in the storage decision.
  const pooled=smooth&&colPool.length<=255&&colPool.length*32+screens.length*96+600<screens.length*1024;
  const rowPeak=pieces=>{const rows=new Map();for(const p of pieces)for(let y=p.y;y<p.y+8;y++)rows.set(y,(rows.get(y)||0)+1);return Math.max(0,...rows.values());};
  const rotateOam=!!enemy && Math.max(...allAnims.flatMap(a=>a.frames.map(f=>rowPeak(f.pieces))))+Math.max(...enemy.frames.map(f=>rowPeak(f.pieces)))>8;
  const names=['ready','tickLo','tickHi','buttons','previousButtons','edges','screen','renderedScreen','playerX','playerY','velocityY','grounded','playerState','playerFrame','playerRemaining','playerFacing','eventMask','eventCount','frameReady','oamReady','wanted','moveDirection','steps','attackRequest','collisionEdge','candidateScreen','candidateX','candidateY','blocked','solid','sampleX','sampleXHi','sampleY','sampleYHi','endX','endXHi','endY','endYHi','queryScreen','queryX','queryY','byteOffset','bitMask','temp','temp2','ptr','ptrHi','animPtr','animPtrHi','framePtr','framePtrHi','piecePtr','piecePtrHi','pieceCount','pieceOffset','pieceX','pieceY','pieceTile','pieceAttr','oamIndex','markerCount','markerPtr','markerPtrHi','transition','worldIndex','roomIndex','cameraIndex','screenX','screenY','cameraScreen','bodyPtr','bodyPtrHi','viewLo','viewHi','renderX','renderHi','wishLo','wishHi','scrollCommit','streamPending','streamScreen','streamColumn','streamDir','streamPtr','streamPtrHi','streamRows','streamAttrOffset','streamAttrMask','streamAttrInverse','streamScratch','streamDestHi','upload0','upload1','enemyScreen','enemyX','enemyY','enemyFacing','enemyFrame','enemyRemaining','enemyTimer','enemyBob','enemyPhase','enemyPieceCount','enemyPieceOffset','enemyFramePtr','enemyFramePtrHi','enemyPiecePtr','enemyPiecePtrHi','enemyPieceX','enemyPieceY','enemyPieceTile','enemyPieceAttr','enemyRenderX','enemyRenderHi','hurtTimer','enemyPathIndex','enemyPathDirection','enemyPathWait','enemyTargetScreen','enemyTargetX','enemyTargetY','enemyRetreatSteps','enemyRetreatVertical','enemyContactScreen','enemyContactX','enemyContactY','enemyPieceHi','oamPriority'];
  if(names.length>0x80)fail('World zero-page allocation overlaps the audio runtime');
  const Z=Object.fromEntries(names.map((name,i)=>[name,i]));
  // Stair state lives in absolute RAM (zero page is full): on-stair flag, position along the stair, length, direction.
  const stairsOn=screens.some(sc=>(sc.stairs||[]).length),SR={on:0x0680,pos:0x0681,len:0x0682,dir:0x0683,cnt:0x0684};
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
  label('main');ld(Z.frameReady);b(0xF0,'main');set(Z.frameReady,0);jsr('update');if(smooth)jsr('scroll_schedule');if(spec.audio?.enabled)jsr('aud_frame');jsr('publish_screen');if(smooth){jsr('draw_all');}else{ld(Z.cameraScreen);e(0xC5,Z.renderedScreen);b(0xF0,'main_draw');jsr('change_screen');jmp('main_tick');label('main_draw');jsr('draw_all');}label('main_tick');e(0xE6,Z.tickLo);b(0xD0,'main');e(0xE6,Z.tickHi);jmp('main');
  label('nmi');e(0x48,0x8A,0x48,0x98,0x48);
  if(smooth){
    // Do column/attribute work before publishing the newly scrolled camera.
    // Skip DMA on a streaming frame to stay inside the NTSC vblank budget.
    ld(Z.scrollCommit);b(0xF0,'nmi_scroll_idle');ld(Z.streamPending);b(0xF0,'nmi_scroll_no_stream');jsr('stream_column');
    label('nmi_scroll_no_stream');copy(Z.wishLo,Z.viewLo);copy(Z.wishHi,Z.viewHi);set(Z.streamPending,0);set(Z.scrollCommit,0);
    label('nmi_scroll_idle');ld(Z.streamPending); // cleared after a successful stream; use a separate skip flag below
    // DMA is skipped whenever this NMI actually did work, not on an ordinary camera frame.
    // streamBusy is set by stream_column and cleared at the end of the interrupt.
    ld(Z.streamRows);b(0xD0,'nmi_no_dma');
  }
  ld(Z.oamReady);b(0xF0,'nmi_no_dma');imm(0);abs(0x8D,0x2003);st(Z.oamReady);imm(2);abs(0x8D,0x4014);if(rotateOam){ld(Z.oamPriority);e(0x49,1);st(Z.oamPriority);}
  label('nmi_no_dma');if(smooth){ld(Z.viewHi);e(0x29,1,0x09,0x88);abs(0x8D,0x2000);ld(Z.viewLo);abs(0x8D,0x2005);imm(0);abs(0x8D,0x2005);set(Z.streamRows,0);}else{imm(0);abs(0x8D,0x2005);abs(0x8D,0x2005);}set(Z.frameReady,1);e(0x68,0xA8,0x68,0xAA,0x68,0x40);label('irq');e(0x40);
  // Transition work is deliberately outside the ordinary frame budget. Blank
  // starts in vblank; NMI is disabled for complete VRAM uploads and resumes
  // only after a second vblank with complete OAM and zero scroll.
  label('change_screen');set(Z.transition,1);imm(8);abs(0x8D,0x2000);abs(0xAD,0x2002);label('transition_vblank');abs(0xAD,0x2002);b(0x10,'transition_vblank');imm(0);abs(0x8D,0x2001);jsr('load_screen');jsr('draw_all');jsr('enable_screen');set(Z.transition,0);e(0x60);
  label('load_screen');jsr('publish_screen');
  // CNROM profile: one 8 KB CHR bank per world group. Rendering is off here (boot or change_screen). The value is
  // written to a ROM byte holding the same value, so the write is safe on boards with bus conflicts.
  if(chrSelect){e(0xA6,Z.worldIndex);abs(0xBD,'world_chr_table');e(0xAA);abs(0x9D,'chr_lut_table');}
  if(smooth){
    // Slot 0 owns even world screens, slot 1 owns odd screens.
    copy(Z.viewHi,Z.upload0);ld(Z.viewHi);add(1);e(0xC9,screens.length);b(0x90,'load_next_valid');copy(Z.viewHi,Z.upload1);jmp('load_parity');label('load_next_valid');st(Z.upload1);
    label('load_parity');ld(Z.viewHi);e(0x29,1);b(0xF0,'load_slots_ready');copy(Z.upload0,Z.streamScratch);copy(Z.upload1,Z.upload0);copy(Z.streamScratch,Z.upload1);label('load_slots_ready');
    set(Z.cameraScreen,0);tablePointer('nt',Z.upload0,Z.ptr);
  }
  if(pooled){
    // Both physical nametable slots are uploaded with rendering disabled.
    // Column-wise writes use PPU increment=32; raw attributes use increment=1.
    copy(Z.upload0,Z.streamScreen);set(Z.streamDestHi,0x20);set(Z.streamScratch,0);jsr('upload_pooled_screen');
    copy(Z.upload1,Z.streamScreen);set(Z.streamDestHi,0x24);set(Z.streamScratch,64);jsr('upload_pooled_screen');
  }else{
  abs(0xAD,0x2002);imm(0x20);abs(0x8D,0x2006);imm(0);abs(0x8D,0x2006);
  if(!smooth)tablePointer('nt',Z.cameraScreen,Z.ptr);
  e(0xA2,4,0xA0,0);label('upload_nt');e(0xB1,Z.ptr);abs(0x8D,0x2007);e(0xC8);b(0xD0,'upload_nt');e(0xE6,Z.ptr+1,0xCA);b(0xD0,'upload_nt');
  if(smooth){
    // Copy final 64 attribute bytes to RAM shadow, used for quadrant masking.
    ld(Z.ptr);sub(64);st(Z.ptr);ld(Z.ptr+1);e(0xE9,0);st(Z.ptr+1);e(0xA0,0);label('shadow_nt0');e(0xB1,Z.ptr);abs(0x99,0x0300);e(0xC8,0xC0,64);b(0xD0,'shadow_nt0');
    abs(0xAD,0x2002);imm(0x24);abs(0x8D,0x2006);imm(0);abs(0x8D,0x2006);tablePointer('nt',Z.upload1,Z.ptr);
    e(0xA2,4,0xA0,0);label('upload_nt_right');e(0xB1,Z.ptr);abs(0x8D,0x2007);e(0xC8);b(0xD0,'upload_nt_right');e(0xE6,Z.ptr+1,0xCA);b(0xD0,'upload_nt_right');
    ld(Z.ptr);sub(64);st(Z.ptr);ld(Z.ptr+1);e(0xE9,0);st(Z.ptr+1);e(0xA0,0);label('shadow_nt1');e(0xB1,Z.ptr);abs(0x99,0x0340);e(0xC8,0xC0,64);b(0xD0,'shadow_nt1');
  }
  }
  abs(0xAD,0x2002);imm(0x3F);abs(0x8D,0x2006);imm(0);abs(0x8D,0x2006);tablePointer('pal',Z.cameraScreen,Z.ptr);e(0xA0,0);label('upload_pal');e(0xB1,Z.ptr);abs(0x8D,0x2007);e(0xC8,0xC0,32);b(0xD0,'upload_pal');copy(Z.cameraScreen,Z.renderedScreen);e(0x60);
  if(pooled){
    label('upload_pooled_screen');
    imm(0x04);abs(0x8D,0x2000); // PPU increment by 32, NMI disabled during bulk upload
    tablePointer('nt',Z.streamScreen,Z.ptr);set(Z.streamColumn,0);
    label('pool_upload_next_col');
    abs(0xAD,0x2002);ld(Z.streamDestHi);abs(0x8D,0x2006);ld(Z.streamColumn);abs(0x8D,0x2006);
    e(0xA4,Z.streamColumn,0xB1,Z.ptr,0xAA); // dict ID from screen's column indices
    abs(0xBD,'column_lo');st(Z.streamPtr);abs(0xBD,'column_hi');st(Z.streamPtr+1);
    e(0xA0,0,0xA2,30);
    label('pool_upload_col_rows');e(0xB1,Z.streamPtr);abs(0x8D,0x2007);e(0xC8,0xCA);b(0xD0,'pool_upload_col_rows');
    e(0xE6,Z.streamColumn);ld(Z.streamColumn);e(0xC9,32);b(0xD0,'pool_upload_next_col');
    // Attribute bytes remain byte-for-byte original. Copy to the physical
    // nametable shadow for half-quadrant masking in incremental streaming.
    imm(0x00);abs(0x8D,0x2000);abs(0xAD,0x2002); // PPU increment by 1, NMI disabled
    ld(Z.streamDestHi);add(3);abs(0x8D,0x2006);imm(0xC0);abs(0x8D,0x2006);
    e(0xA0,32);
    label('pool_upload_attrs');e(0xB1,Z.ptr);abs(0x8D,0x2007);e(0xA6,Z.streamScratch);abs(0x9D,0x0300);e(0xE6,Z.streamScratch,0xC8,0xC0,96);b(0xD0,'pool_upload_attrs');
    e(0x60);
  }
  label('enable_screen');abs(0xAD,0x2002);label('enable_vblank');abs(0xAD,0x2002);b(0x10,'enable_vblank');imm(0);abs(0x8D,0x2003);st(Z.oamReady);st(Z.frameReady);imm(2);abs(0x8D,0x4014);imm(0);abs(0x8D,0x2005);abs(0x8D,0x2005);if(smooth){ld(Z.viewHi);e(0x29,1,0x09,0x88);abs(0x8D,0x2000);ld(Z.viewLo);abs(0x8D,0x2005);imm(0);abs(0x8D,0x2005);}else{imm(0x88);abs(0x8D,0x2000);}imm(0x1E);abs(0x8D,0x2001);e(0x60);
  label('publish_screen');e(0xA6,Z.screen);for(const name of['worldIndex','roomIndex','cameraIndex','screenX','screenY','cameraScreen']){abs(0xBD,name+'_table');st(Z[name]);}e(0x60);
  label('restart');set(Z.screen,start.screen);set(Z.playerX,start.x);set(Z.playerY,start.y);set(Z.playerFacing,player.facing);set(Z.eventCount,0);jsr('reset_actor');if(enemy)jsr('enemy_reset');if(smooth){jsr('scroll_follow');copy(Z.wishLo,Z.viewLo);copy(Z.wishHi,Z.viewHi);}if(spec.gameplayCore?.enabled)jsr('gc_world_reconstruct');e(0x60);
  label('reset_actor');for(const name of['velocityY','playerState','playerFrame','moveDirection','attackRequest'])set(Z[name],0);if(stairsOn){imm(0);abs(0x8D,SR.on);}jsr('player_entry');jsr('ground_probe');e(0x60);
  if(smooth){
    // wish = max(0, min(playerWorldX-128, (width-1)*256)).
    label('scroll_follow');ld(Z.playerX);sub(128);st(Z.wishLo);ld(Z.screen);e(0xE9,0);st(Z.wishHi);
    ld(Z.wishHi);e(0xC9,255);b(0xD0,'scroll_not_negative');set(Z.wishHi,0);set(Z.wishLo,0);e(0x60);
    label('scroll_not_negative');ld(Z.wishHi);e(0xC9,screens.length-1);b(0x90,'scroll_follow_done');set(Z.wishHi,screens.length-1);set(Z.wishLo,0);label('scroll_follow_done');e(0x60);

    // At most one 8px column boundary per frame (movement <=4px).
    // Advance: recycle the column that disappeared from the left for +64 tiles.
    // Reverse: restore the newly exposed column from its actual source screen.
    label('scroll_schedule');set(Z.scrollCommit,0);set(Z.streamPending,0);jsr('scroll_follow');
    ld(Z.edges);e(0x29,8);b(0xF0,'scroll_regular');copy(Z.wishLo,Z.viewLo);copy(Z.wishHi,Z.viewHi);jsr('change_screen');e(0x60);
    label('scroll_regular');ld(Z.viewHi);e(0xC5,Z.wishHi);b(0xD0,'scroll_boundary');ld(Z.viewLo);e(0x29,248);st(Z.streamScratch);ld(Z.wishLo);e(0x29,248,0xC5,Z.streamScratch);b(0xF0,'scroll_schedule_done');
    label('scroll_boundary');ld(Z.wishHi);e(0xC5,Z.viewHi);b(0x90,'scroll_left');b(0xD0,'scroll_right');ld(Z.wishLo);e(0xC5,Z.viewLo);b(0x90,'scroll_left');
    label('scroll_right');ld(Z.viewHi);add(2);e(0xC9,screens.length);b(0xB0,'scroll_schedule_done');st(Z.streamScreen);ld(Z.viewLo);e(0x4A,0x4A,0x4A);st(Z.streamColumn);set(Z.streamDir,1);set(Z.streamPending,1);jmp('scroll_schedule_done');
    label('scroll_left');copy(Z.wishHi,Z.streamScreen);ld(Z.wishLo);e(0x4A,0x4A,0x4A);st(Z.streamColumn);set(Z.streamDir,0);set(Z.streamPending,1);
    label('scroll_schedule_done');set(Z.scrollCommit,1);e(0x60);

    // Run only during NMI/vblank. Source NT is row-major; PPU destination
    // increments by 32 while source pointer advances 32 bytes per row.
    label('stream_column');
    imm(0x8C);abs(0x8D,0x2000);abs(0xAD,0x2002);
    ld(Z.streamScreen);e(0x29,1,0x0A,0x0A);add(0x20);abs(0x8D,0x2006);ld(Z.streamColumn);abs(0x8D,0x2006);
    if(pooled){
      tablePointer('nt',Z.streamScreen,Z.streamPtr);
      ld(Z.streamPtr);zpadd(Z.streamColumn);st(Z.streamPtr);b(0x90,'stream_col_ptr_ready');e(0xE6,Z.streamPtr+1);label('stream_col_ptr_ready');
      e(0xA0,0,0xB1,Z.streamPtr,0xAA);abs(0xBD,'column_lo');st(Z.streamPtr);abs(0xBD,'column_hi');st(Z.streamPtr+1);
      set(Z.streamRows,30);e(0xA0,0);
      label('stream_tile_loop');e(0xB1,Z.streamPtr);abs(0x8D,0x2007);e(0xC8,0xC6,Z.streamRows);b(0xD0,'stream_tile_loop');
    }else{
    tablePointer('nt',Z.streamScreen,Z.streamPtr);ld(Z.streamPtr);zpadd(Z.streamColumn);st(Z.streamPtr);b(0x90,'stream_ptr_ready');e(0xE6,Z.streamPtr+1);label('stream_ptr_ready');
    set(Z.streamRows,30);e(0xA0,0);label('stream_tile_loop');e(0xB1,Z.streamPtr);abs(0x8D,0x2007);ld(Z.streamPtr);add(32);st(Z.streamPtr);b(0x90,'stream_ptr_no_carry');e(0xE6,Z.streamPtr+1);label('stream_ptr_no_carry');e(0xC6,Z.streamRows);b(0xD0,'stream_tile_loop');
    }
    // Two adjacent 8px columns share one 2-bit palette quadrant.
    // Commit that quadrant only after its second column leaves view.
    ld(Z.streamDir);b(0xF0,'stream_attr_prepare');ld(Z.streamColumn);e(0x29,1);b(0xF0,'stream_attr_skip');label('stream_attr_prepare');
    ld(Z.streamColumn);e(0x29,2);b(0xF0,'stream_attr_left');set(Z.streamAttrMask,0xCC);set(Z.streamAttrInverse,0x33);jmp('stream_attr_setup');
    label('stream_attr_left');set(Z.streamAttrMask,0x33);set(Z.streamAttrInverse,0xCC);
    label('stream_attr_setup');
    if(pooled){
      // Attribute section follows the 32 index bytes. Each attribute row
      // remains 8 bytes wide (exact original hardware palette representation).
      ld(Z.streamColumn);e(0x4A,0x4A);add(32);st(Z.streamAttrOffset);
      tablePointer('nt',Z.streamScreen,Z.streamPtr);
      ld(Z.streamPtr);zpadd(Z.streamAttrOffset);st(Z.streamPtr);b(0x90,'pool_attr_ptr_ready');e(0xE6,Z.streamPtr+1);label('pool_attr_ptr_ready');
      ld(Z.streamColumn);e(0x4A,0x4A);st(Z.streamAttrOffset);
    }else{
    // Pointer now equals NT +960 +tileCol. Correct to attr group (col>>2).
    ld(Z.streamPtr);sub(0);e(0xE5,Z.streamColumn);st(Z.streamPtr);ld(Z.streamPtr+1);e(0xE9,0);st(Z.streamPtr+1);
    ld(Z.streamColumn);e(0x4A,0x4A);st(Z.streamAttrOffset);ld(Z.streamPtr);zpadd(Z.streamAttrOffset);st(Z.streamPtr);b(0x90,'stream_attr_ptr_done');e(0xE6,Z.streamPtr+1);label('stream_attr_ptr_done');
    }
    // attrOffset indexes 0..63 in physical nametable attribute shadow.
    ld(Z.streamScreen);e(0x29,1);b(0xF0,'stream_attr_slot0');ld(Z.streamAttrOffset);add(64);st(Z.streamAttrOffset);set(Z.streamDestHi,0x27);jmp('stream_attr_loop_init');
    label('stream_attr_slot0');set(Z.streamDestHi,0x23);
    label('stream_attr_loop_init');set(Z.streamRows,8);e(0xA0,0);
    label('stream_attr_loop');
    abs(0xAD,0x2002);ld(Z.streamDestHi);abs(0x8D,0x2006);ld(Z.streamAttrOffset);e(0x29,63);add(0xC0);abs(0x8D,0x2006);
    e(0xA6,Z.streamAttrOffset);abs(0xBD,0x0300);e(0x25,Z.streamAttrInverse);st(Z.streamScratch);e(0xB1,Z.streamPtr,0x25,Z.streamAttrMask,0x05,Z.streamScratch);abs(0x9D,0x0300);abs(0x8D,0x2007);
    ld(Z.streamPtr);add(8);st(Z.streamPtr);b(0x90,'stream_attr_ptr_ok');e(0xE6,Z.streamPtr+1);label('stream_attr_ptr_ok');ld(Z.streamAttrOffset);add(8);st(Z.streamAttrOffset);e(0xC6,Z.streamRows);b(0xD0,'stream_attr_loop');
    label('stream_attr_skip');set(Z.streamRows,1);e(0x60);
  }
  label('read_pad');imm(1);abs(0x8D,0x4016);imm(0);abs(0x8D,0x4016);set(Z.buttons,0);e(0xA2,8);label('pad_bit');abs(0xAD,0x4016);e(0x4A,0x66,Z.buttons,0xCA);b(0xD0,'pad_bit');ld(Z.buttons);e(0x45,Z.previousButtons,0x25,Z.buttons);st(Z.edges);copy(Z.buttons,Z.previousButtons);e(0x60);
  label('update');set(Z.eventMask,0);set(Z.attackRequest,0);jsr('read_pad');ld(Z.edges);e(0x29,8);b(0xF0,'not_restart');jsr('restart');e(0x60);label('not_restart');ld(Z.edges);e(0x29,16);b(0xF0,'not_marker');jsr('use_marker');ld(Z.temp2);b(0xF0,'not_marker');e(0x60);label('not_marker');
  if(stairsOn){jsr('stair_update');abs(0xAD,SR.on);b(0xF0,'stair_free');jmp('after_physics');label('stair_free');}
  ld(Z.edges);e(0x29,2);b(0xF0,'no_attack_edge');ld(Z.playerState);e(0xC9,3);b(0xF0,'no_attack_edge');set(Z.attackRequest,1);label('no_attack_edge');jsr('horizontal');ld(Z.edges);e(0x29,1);b(0xF0,'no_jump');ld(Z.grounded);b(0xF0,'no_jump');set(Z.velocityY,-physics.jumpSpeed);set(Z.grounded,0);label('no_jump');jsr('vertical');label('after_physics');jsr('choose_player');jsr('player_animate');if(enemy)jsr('enemy_update');if(spec.gameplayCore?.enabled)jsr('gc_world_update');e(0x60);
  // A feet origin is the exclusive body bottom: use its last occupied pixel
  // to activate the authored marker above a floor at a metatile boundary.
  // A direct cell index bounds Up processing independently of marker count.
  // Its 240 bytes precede compact three-byte destination records. The first
  // authored marker in a cell wins, matching the original ordered lookup.
  if(stairsOn){
    // Enter: standing, on an Up press near a stair's bottom end or a Down press near its top end (within 6 px).
    label('stair_update');abs(0xAD,SR.on);b(0xF0,'stair_enter_check');jmp('stair_move');
    label('stair_enter_check');ld(Z.grounded);b(0xF0,'stair_rts');ld(Z.edges);e(0x29,0x30);b(0xF0,'stair_rts');
    e(0xA6,Z.screen);abs(0xBD,'stair_count_table');b(0xF0,'stair_rts');abs(0x8D,SR.cnt);abs(0xBD,'stair_first_table');e(0xAA);
    label('stair_scan');ld(Z.edges);e(0x29,0x10);b(0xF0,'stair_try_top');
    ld(Z.playerY);abs(0xDD,'stair_by');b(0xD0,'stair_next');ld(Z.playerX);e(0x38);abs(0xFD,'stair_bx');add(6);e(0xC9,13);b(0xB0,'stair_next');
    abs(0xBD,'stair_bx');st(Z.playerX);imm(0);abs(0x8D,SR.pos);jmp('stair_enter');
    label('stair_try_top');ld(Z.playerY);abs(0xDD,'stair_ty');b(0xD0,'stair_next');ld(Z.playerX);e(0x38);abs(0xFD,'stair_tx');add(6);e(0xC9,13);b(0xB0,'stair_next');
    abs(0xBD,'stair_tx');st(Z.playerX);abs(0xBD,'stair_len');abs(0x8D,SR.pos);jmp('stair_enter');
    label('stair_next');e(0xE8);abs(0xCE,SR.cnt);b(0xD0,'stair_scan');label('stair_rts');e(0x60);
    label('stair_enter');abs(0xBD,'stair_len');abs(0x8D,SR.len);abs(0xBD,'stair_dir');abs(0x8D,SR.dir);imm(1);abs(0x8D,SR.on);set(Z.velocityY,0);set(Z.grounded,1);e(0x60);
    // Move: Up or the stair's horizontal direction climbs, Down or the opposite descends, one pixel diagonally per
    // frame; reaching either end steps off (gravity resumes on the landing or floor).
    label('stair_move');set(Z.moveDirection,0);set(Z.grounded,1);set(Z.velocityY,0);
    ld(Z.buttons);e(0x29,0x10);b(0xD0,'stair_up');
    abs(0xAD,SR.dir);b(0xD0,'stair_upkey_left');ld(Z.buttons);e(0x29,0x80);b(0xD0,'stair_up');jmp('stair_downkeys');
    label('stair_upkey_left');ld(Z.buttons);e(0x29,0x40);b(0xD0,'stair_up');
    label('stair_downkeys');ld(Z.buttons);e(0x29,0x20);b(0xD0,'stair_down');
    abs(0xAD,SR.dir);b(0xD0,'stair_downkey_right');ld(Z.buttons);e(0x29,0x40);b(0xD0,'stair_down');e(0x60);
    label('stair_downkey_right');ld(Z.buttons);e(0x29,0x80);b(0xD0,'stair_down');e(0x60);
    label('stair_up');abs(0xAD,SR.pos);abs(0xCD,SR.len);b(0xB0,'stair_exit');abs(0xEE,SR.pos);e(0xC6,Z.playerY);
    abs(0xAD,SR.dir);b(0xD0,'stair_up_left');e(0xE6,Z.playerX);set(Z.playerFacing,0);set(Z.moveDirection,1);jmp('stair_moved_up');
    label('stair_up_left');e(0xC6,Z.playerX);set(Z.playerFacing,1);set(Z.moveDirection,255);
    label('stair_moved_up');abs(0xAD,SR.pos);abs(0xCD,SR.len);b(0xD0,'stair_rts2');jmp('stair_exit');
    label('stair_down');abs(0xAD,SR.pos);b(0xF0,'stair_exit');abs(0xCE,SR.pos);e(0xE6,Z.playerY);
    abs(0xAD,SR.dir);b(0xD0,'stair_down_right');e(0xC6,Z.playerX);set(Z.playerFacing,1);set(Z.moveDirection,255);jmp('stair_moved_down');
    label('stair_down_right');e(0xE6,Z.playerX);set(Z.playerFacing,0);set(Z.moveDirection,1);
    label('stair_moved_down');abs(0xAD,SR.pos);b(0xD0,'stair_rts2');
    label('stair_exit');imm(0);abs(0x8D,SR.on);label('stair_rts2');e(0x60);
  }
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
  label('draw_all');set(Z.oamReady,0);jsr('hide_oam');set(Z.oamIndex,0);if(rotateOam){ld(Z.oamPriority);b(0xF0,'draw_player_first');jsr('enemy_draw');label('draw_player_first');}if(smooth){
    ld(Z.playerX);e(0x38,0xE5,Z.viewLo);st(Z.renderX);e(0xA6,Z.screen);abs(0xBD,'screenX_table');e(0xE5,Z.viewHi);st(Z.renderHi);ld(Z.renderHi);b(0xD0,enemy?'draw_core':'draw_done');
  }else{ld(Z.screen);e(0xC5,Z.cameraScreen);b(0xD0,'draw_done');}if(enemy){ld(Z.hurtTimer);b(0xF0,'draw_ghost_normal');e(0xC9,Math.max(1,aiConfig.hurtTicks-12));b(0x90,'draw_ghost_normal');ld(Z.tickLo);e(0x29,4);b(0xD0,'draw_core');label('draw_ghost_normal');}e(0xA0,2,0xB1,Z.framePtr);st(Z.pieceCount);b(0xF0,enemy?'draw_core':'draw_done');e(0xC8,0xB1,Z.framePtr);st(Z.piecePtr);e(0xC8,0xB1,Z.framePtr);st(Z.piecePtr+1);set(Z.pieceOffset,0);
  label('draw_piece');e(0xA4,Z.pieceOffset,0xB1,Z.piecePtr);st(Z.pieceX);e(0xC8,0xB1,Z.piecePtr);st(Z.pieceY);e(0xC8,0xB1,Z.piecePtr);st(Z.pieceTile);e(0xC8,0xB1,Z.piecePtr);st(Z.pieceAttr);e(0xC8,0x84,Z.pieceOffset);ld(Z.playerFacing);b(0xF0,'piece_right');ld(Z.pieceX);e(0x49,255);add(249);st(Z.pieceX);ld(Z.pieceAttr);e(0x49,64);st(Z.pieceAttr);label('piece_right');
  function coordinate(offset,origin,max){const positive=uniq('piece_positive'),done=uniq('piece_coordinate');ld(offset);b(0x10,positive);zpadd(origin);b(0x90,'piece_skip');jmp(done);label(positive);zpadd(origin);b(0xB0,'piece_skip');label(done);e(0xC9,max+1);b(0xB0,'piece_skip');st(offset);}
  coordinate(Z.pieceX,smooth?Z.renderX:Z.playerX,248);coordinate(Z.pieceY,Z.playerY,232);ld(Z.pieceY);b(0xF0,'piece_skip');sub(1);e(0xA6,Z.oamIndex);abs(0x9D,0x0200);ld(Z.pieceTile);abs(0x9D,0x0201);ld(Z.pieceAttr);abs(0x9D,0x0202);ld(Z.pieceX);abs(0x9D,0x0203);ld(Z.oamIndex);add(4);st(Z.oamIndex);label('piece_skip');e(0xC6,Z.pieceCount);b(0xD0,'draw_piece');label('draw_core');if(enemy){if(rotateOam){ld(Z.oamPriority);b(0xD0,'draw_enemy_already');}jsr('enemy_draw');if(rotateOam)label('draw_enemy_already');}if(spec.gameplayCore?.enabled)jsr('gc_world_draw');label('draw_done');set(Z.oamReady,1);e(0x60);

  if(enemy){
    // Patch 2: contact envelope grows with the largest referenced enemy pose.
    // These are hardware-sprite bounds, not a lossy change to project artwork.
    // Authored Touch X/Y values remain minimum thresholds (not silently replaced).
    const enemyBounds=enemy.frames.flatMap(frame=>frame.pieces);
    const enemyExtentX=Math.max(...enemyBounds.map(piece=>Math.max(-piece.x,piece.x+8)));
    const enemyExtentY=Math.max(...enemyBounds.map(piece=>Math.max(-piece.y,piece.y+8)));
    const enemyContactX=Math.min(64,Math.max(aiConfig.touchX,Math.ceil(enemyExtentX+physics.bodyWidth/2-2)));
    const enemyContactY=Math.min(64,Math.max(aiConfig.touchY,Math.ceil(enemyExtentY+physics.bodyHeight/2-2)));
    // Rearm after retreat/recovery, invulnerability and physical separation.
    // A 2px margin prevents immediate re-hits at the contact boundary. Detection
    // range is unrelated to this latch: nearby movement must not freeze pursuit.
    const enemyRearmX=enemyContactX+2;
    const enemyRearmY=enemyContactY+2;
    // Explicit recover phase after retreat. Keeps AI from dive-bombing the
    // player again on the very frame the previous retreat finishes.
    const enemyRecoveryTicks=Math.max(24,Math.min(48,Math.round(aiConfig.retreatTicks/2)));
    // Make enough actual 1px steps to escape the enlarged sprite rectangle,
    // even when horizontal travel is obstructed at a World edge.
    const enemyRetreatSteps=Math.min(80,Math.max(8,enemyContactX+10,(enemyContactY+4)*2));
    const enemyRetreatDuration=Math.max(aiConfig.retreatTicks,enemyRetreatSteps);
    label('enemy_reset');set(Z.enemyScreen,enemy.start.screen);set(Z.enemyX,enemy.start.x);set(Z.enemyY,enemy.start.y);set(Z.enemyFacing,enemy.facing);set(Z.enemyFrame,0);set(Z.enemyRemaining,enemy.frames[0].duration);set(Z.enemyTimer,0);set(Z.enemyPhase,0);set(Z.enemyRetreatSteps,0);set(Z.enemyRetreatVertical,0);set(Z.enemyContactScreen,0);set(Z.enemyContactX,0);set(Z.enemyContactY,0);set(Z.hurtTimer,0);if(aiPath.length){set(Z.enemyPathIndex,0);set(Z.enemyPathDirection,0);set(Z.enemyPathWait,0);}e(0x60);
    // Collision uses the flying actor center and Ghost's body center at feetY-18.
    // Hurt currently grants 42 ticks of blinking/bounce, not a health decrement.
    // AI phase: 0 patrol, 1 chase, 2 retreat, 3 recover, 4 separate. The phase persists
    // between ticks; enemy_notice is only allowed during patrol/chase.
    label('enemy_update');ld(Z.hurtTimer);b(0xF0,'enemy_no_hurt');e(0xC6,Z.hurtTimer);label('enemy_no_hurt');
    e(0xC6,Z.enemyRemaining);b(0xD0,'enemy_animation_ready');e(0xE6,Z.enemyFrame);ld(Z.enemyFrame);e(0xC9,enemy.frames.length);b(0x90,'enemy_animation_new');set(Z.enemyFrame,0);label('enemy_animation_new');e(0xA6,Z.enemyFrame);abs(0xBD,'enemy_duration_table');st(Z.enemyRemaining);label('enemy_animation_ready');
    ld(Z.enemyPhase);e(0xC9,2);b(0xF0,'enemy_phase_retreat');e(0xC9,3);b(0xF0,'enemy_phase_recover');e(0xC9,4);b(0xF0,'enemy_phase_disarmed');
    jsr('enemy_notice');ld(Z.enemyPhase);b(0xF0,'enemy_idle');
    // Check before movement as well as after. Without the early check a fast
    // chaser can visually run through Ghost on the collision tick.
    jsr('enemy_contact');ld(Z.enemyPhase);e(0xC9,2);b(0xF0,'enemy_update_done');
    ld(Z.tickLo);e(0x29,aiConfig.speedTicks-1);b(0xD0,'enemy_update_done');jsr('enemy_chase');jsr('enemy_contact');jmp('enemy_update_done');
    label('enemy_phase_retreat');ld(Z.enemyTimer);b(0xF0,'enemy_retreat_finished');
    // Retreat is 1px/frame independent of chase speed. The configured
    // retreat duration remains a minimum, not a distance counter.
    e(0xC6,Z.enemyTimer);ld(Z.enemyRetreatSteps);b(0xF0,'enemy_update_done');e(0xC6,Z.enemyRetreatSteps);jsr('enemy_retreat');jmp('enemy_update_done');
    label('enemy_retreat_finished');set(Z.enemyPhase,3);set(Z.enemyTimer,enemyRecoveryTicks);jmp('enemy_update_done');
    label('enemy_phase_recover');ld(Z.enemyTimer);b(0xF0,'enemy_recovery_finished');e(0xC6,Z.enemyTimer);jmp('enemy_update_done');
    label('enemy_recovery_finished');set(Z.enemyPhase,4);jmp('enemy_update_done');

    // Phase 4 is a separation latch. It never deals damage. If the player
    // followed the retreat, keep escaping until clear instead of freezing.
    label('enemy_phase_disarmed');ld(Z.hurtTimer);b(0xD0,'enemy_update_done');jsr('enemy_disengagement');ld(Z.enemyPhase);b(0xF0,'enemy_update_done');jsr('enemy_retreat');jmp('enemy_update_done');
    label('enemy_idle');if(aiPath.length){jsr('enemy_patrol');jmp('enemy_update_done');}ld(Z.tickLo);e(0x29,aiConfig.hoverTicks-1);b(0xD0,'enemy_update_done');ld(Z.tickLo);e(0x29,32);b(0xF0,'enemy_idle_up');ld(Z.enemyY);e(0xC9,189);b(0xB0,'enemy_update_done');e(0xE6,Z.enemyY);jmp('enemy_update_done');label('enemy_idle_up');ld(Z.enemyY);e(0xC9,28);b(0x90,'enemy_update_done');e(0xC6,Z.enemyY);
    label('enemy_update_done');e(0x60);
    // Compare the *total* horizontal gap across a screen seam, not two
    // independent edge distances (which previously allowed ~2x detectX).
    // The 6502 carry from X + range tells us whether the allowed interval
    // reaches into the following 256px screen. After overflow, A is exactly
    // the number of permitted pixels into that screen. Range is exclusive,
    // matching the same-screen CMP/BCS check. No 16-bit scratch RAM needed.
    const chaseRangeX=aiLegacy?80:aiConfig.detectX;
    label('enemy_notice');set(Z.enemyPhase,0);ld(Z.enemyScreen);e(0xC5,Z.screen);b(0xD0,'enemy_notice_neighbor');ld(Z.enemyX);e(0xC5,Z.playerX);b(0xB0,'enemy_notice_same_ge');ld(Z.playerX);e(0x38,0xE5,Z.enemyX);jmp('enemy_notice_same_cmp');label('enemy_notice_same_ge');ld(Z.enemyX);e(0x38,0xE5,Z.playerX);label('enemy_notice_same_cmp');e(0xC9,aiConfig.detectX);b(0xB0,'enemy_notice_done');jmp('enemy_notice_y');
    // Enemy occupies the left screen, player occupies the right screen.
    label('enemy_notice_neighbor');ld(Z.enemyScreen);add(1);e(0xC5,Z.screen);b(0xD0,'enemy_notice_from_right');ld(Z.enemyX);add(chaseRangeX);b(0x90,'enemy_notice_done');e(0xC5,Z.playerX);b(0x90,'enemy_notice_done');b(0xF0,'enemy_notice_done');jmp('enemy_notice_y');
    // Player occupies the left screen, enemy occupies the right screen.
    label('enemy_notice_from_right');ld(Z.screen);add(1);e(0xC5,Z.enemyScreen);b(0xD0,'enemy_notice_done');ld(Z.playerX);add(chaseRangeX);b(0x90,'enemy_notice_done');e(0xC5,Z.enemyX);b(0x90,'enemy_notice_done');b(0xF0,'enemy_notice_done');
    label('enemy_notice_y');if(aiLegacy){ld(Z.enemyY);e(0x38,0xE5,Z.playerY);}else{ld(Z.playerY);sub(18);e(0x38,0xE5,Z.enemyY);}b(0xB0,'enemy_notice_yabs');e(0x49,255);add(1);label('enemy_notice_yabs');e(0xC9,aiConfig.detectY);b(0xB0,'enemy_notice_done');set(Z.enemyPhase,1);label('enemy_notice_done');e(0x60);
    label('enemy_chase');ld(Z.enemyScreen);e(0xC5,Z.screen);b(0xF0,'enemy_chase_same_screen');b(0x90,'enemy_move_right');jmp('enemy_move_left');
    label('enemy_chase_same_screen');ld(Z.enemyX);e(0xC5,Z.playerX);b(0xF0,'enemy_chase_y');b(0x90,'enemy_move_right');jmp('enemy_move_left');
    label('enemy_move_right');set(Z.enemyFacing,0);ld(Z.enemyX);e(0xC9,255);b(0xD0,'enemy_move_right_local');ld(Z.enemyScreen);e(0xC9,screens.length-1);b(0xB0,'enemy_chase_y');e(0xE6,Z.enemyScreen);set(Z.enemyX,0);jmp('enemy_chase_y');label('enemy_move_right_local');e(0xE6,Z.enemyX);jmp('enemy_chase_y');
    label('enemy_move_left');set(Z.enemyFacing,1);ld(Z.enemyX);b(0xD0,'enemy_move_left_local');ld(Z.enemyScreen);b(0xF0,'enemy_chase_y');e(0xC6,Z.enemyScreen);set(Z.enemyX,255);jmp('enemy_chase_y');label('enemy_move_left_local');e(0xC6,Z.enemyX);
    label('enemy_chase_y');ld(Z.playerY);sub(18);e(0xC5,Z.enemyY);b(0xF0,'enemy_chase_done');b(0x90,'enemy_y_up');ld(Z.enemyY);e(0xC9,195);b(0xB0,'enemy_chase_done');e(0xE6,Z.enemyY);jmp('enemy_chase_done');label('enemy_y_up');ld(Z.enemyY);e(0xC9,24);b(0x90,'enemy_chase_done');e(0xC6,Z.enemyY);label('enemy_chase_done');e(0x60);
    label('enemy_retreat');copy(Z.enemyX,Z.temp);ld(Z.enemyFacing);b(0xF0,'enemy_retreat_left');jsr('enemy_move_right_only');jmp('enemy_retreat_vertical');label('enemy_retreat_left');jsr('enemy_move_left_only');
    // Move vertically on alternate retreat steps; face and vertical direction
    // are frozen at contact, so the Imp does not jitter toward Ghost.
    label('enemy_retreat_vertical');ld(Z.enemyX);e(0xC5,Z.temp);b(0xF0,'enemy_retreat_vertical_go');ld(Z.enemyRetreatSteps);e(0x29,1);b(0xF0,'enemy_retreat_done');label('enemy_retreat_vertical_go');ld(Z.enemyRetreatVertical);b(0xD0,'enemy_retreat_down');
    ld(Z.enemyY);e(0xC9,31);b(0x90,'enemy_retreat_switch_down');e(0xC6,Z.enemyY);jmp('enemy_retreat_done');
    label('enemy_retreat_switch_down');set(Z.enemyRetreatVertical,1);jmp('enemy_retreat_down');
    label('enemy_retreat_down');ld(Z.enemyY);e(0xC9,190);b(0xB0,'enemy_retreat_switch_up');e(0xE6,Z.enemyY);jmp('enemy_retreat_done');
    label('enemy_retreat_switch_up');set(Z.enemyRetreatVertical,0);e(0xC6,Z.enemyY);
    label('enemy_retreat_done');e(0x60);
    label('enemy_move_right_only');ld(Z.enemyX);e(0xC9,255);b(0xD0,'enemy_right_local');ld(Z.enemyScreen);e(0xC9,screens.length-1);b(0xB0,'enemy_right_done');e(0xE6,Z.enemyScreen);set(Z.enemyX,0);jmp('enemy_right_done');label('enemy_right_local');e(0xE6,Z.enemyX);label('enemy_right_done');e(0x60);
    label('enemy_move_left_only');ld(Z.enemyX);b(0xD0,'enemy_left_local');ld(Z.enemyScreen);b(0xF0,'enemy_left_done');e(0xC6,Z.enemyScreen);set(Z.enemyX,255);jmp('enemy_left_done');label('enemy_left_local');e(0xC6,Z.enemyX);label('enemy_left_done');e(0x60);
    if(aiPath.length){
      label('enemy_patrol');ld(Z.enemyPathWait);b(0xF0,'enemy_patrol_move');e(0xC6,Z.enemyPathWait);e(0x60);
      label('enemy_patrol_move');ld(Z.tickLo);e(0x29,aiConfig.speedTicks-1);b(0xD0,'enemy_patrol_done');
      e(0xA6,Z.enemyPathIndex);abs(0xBD,'enemy_path_screens');st(Z.enemyTargetScreen);abs(0xBD,'enemy_path_x');st(Z.enemyTargetX);abs(0xBD,'enemy_path_y');st(Z.enemyTargetY);
      ld(Z.enemyScreen);e(0xC5,Z.enemyTargetScreen);b(0xF0,'enemy_patrol_same_screen');b(0x90,'enemy_patrol_right');jmp('enemy_patrol_left');
      label('enemy_patrol_same_screen');ld(Z.enemyX);e(0xC5,Z.enemyTargetX);b(0xF0,'enemy_patrol_y');b(0x90,'enemy_patrol_right');jmp('enemy_patrol_left');
      label('enemy_patrol_right');set(Z.enemyFacing,0);jsr('enemy_move_right_only');jmp('enemy_patrol_y');
      label('enemy_patrol_left');set(Z.enemyFacing,1);jsr('enemy_move_left_only');
      label('enemy_patrol_y');ld(Z.enemyY);e(0xC5,Z.enemyTargetY);b(0xF0,'enemy_patrol_check_arrival');b(0x90,'enemy_patrol_down');ld(Z.enemyY);e(0xC9,20);b(0x90,'enemy_patrol_check_arrival');e(0xC6,Z.enemyY);jmp('enemy_patrol_check_arrival');
      label('enemy_patrol_down');ld(Z.enemyY);e(0xC9,190);b(0xB0,'enemy_patrol_check_arrival');e(0xE6,Z.enemyY);
      label('enemy_patrol_check_arrival');ld(Z.enemyScreen);e(0xC5,Z.enemyTargetScreen);b(0xD0,'enemy_patrol_done');ld(Z.enemyX);e(0xC5,Z.enemyTargetX);b(0xD0,'enemy_patrol_done');ld(Z.enemyY);e(0xC5,Z.enemyTargetY);b(0xD0,'enemy_patrol_done');set(Z.enemyPathWait,aiConfig.pathWait);jsr('enemy_path_advance');
      label('enemy_patrol_done');e(0x60);
      label('enemy_path_advance');
      if(aiPath.length<2){e(0x60);}else if(aiConfig.pathMode==='loop'){
        e(0xE6,Z.enemyPathIndex);ld(Z.enemyPathIndex);e(0xC9,aiPath.length);b(0x90,'enemy_path_advance_done');set(Z.enemyPathIndex,0);label('enemy_path_advance_done');e(0x60);
      }else if(aiConfig.pathMode==='once'){
        ld(Z.enemyPathIndex);e(0xC9,aiPath.length-1);b(0xB0,'enemy_path_advance_done');e(0xE6,Z.enemyPathIndex);label('enemy_path_advance_done');e(0x60);
      }else{
        ld(Z.enemyPathDirection);b(0xF0,'enemy_path_forward');ld(Z.enemyPathIndex);b(0xF0,'enemy_path_at_start');e(0xC6,Z.enemyPathIndex);e(0x60);
        label('enemy_path_at_start');set(Z.enemyPathDirection,0);e(0xE6,Z.enemyPathIndex);e(0x60);
        label('enemy_path_forward');ld(Z.enemyPathIndex);e(0xC9,aiPath.length-1);b(0xB0,'enemy_path_at_end');e(0xE6,Z.enemyPathIndex);e(0x60);
        label('enemy_path_at_end');set(Z.enemyPathDirection,1);e(0xC6,Z.enemyPathIndex);e(0x60);
      }
    }
    // Inclusive-of-shape contact: the effective threshold conservatively
    // encloses the scaled art plus Ghost's authored collision body. Compare
    // unsigned gaps to avoid 8-bit subtraction wrapping at distances >127px.
    // Adjacent-screen contact is handled explicitly at the 256px seam.
    label('enemy_contact');ld(Z.hurtTimer);b(0xD0,'enemy_contact_done');
    ld(Z.enemyScreen);e(0xC5,Z.screen);b(0xF0,'enemy_contact_same_screen');b(0x90,'enemy_contact_left_screen');jmp('enemy_contact_right_screen');
    label('enemy_contact_same_screen');ld(Z.enemyX);e(0xC5,Z.playerX);b(0xB0,'enemy_contact_same_ge');ld(Z.playerX);e(0x38,0xE5,Z.enemyX);jmp('enemy_contact_x_compare');
    label('enemy_contact_same_ge');ld(Z.enemyX);e(0x38,0xE5,Z.playerX);jmp('enemy_contact_x_compare');
    label('enemy_contact_left_screen');ld(Z.enemyScreen);add(1);e(0xC5,Z.screen);b(0xD0,'enemy_contact_done');ld(Z.enemyX);add(enemyContactX);b(0x90,'enemy_contact_done');e(0x38,0xE5,Z.playerX);jmp('enemy_contact_seam_compare');
    label('enemy_contact_right_screen');ld(Z.screen);add(1);e(0xC5,Z.enemyScreen);b(0xD0,'enemy_contact_done');ld(Z.playerX);add(enemyContactX);b(0x90,'enemy_contact_done');e(0x38,0xE5,Z.enemyX);
    label('enemy_contact_seam_compare');b(0xF0,'enemy_contact_done');b(0x90,'enemy_contact_done');jmp('enemy_contact_y');
    label('enemy_contact_x_compare');e(0xC9,enemyContactX);b(0xB0,'enemy_contact_done');
    label('enemy_contact_y');ld(Z.playerY);sub(18);st(Z.temp2);e(0xC5,Z.enemyY);b(0xB0,'enemy_contact_y_ge');ld(Z.enemyY);e(0x38,0xE5,Z.temp2);jmp('enemy_contact_y_compare');
    label('enemy_contact_y_ge');ld(Z.temp2);e(0x38,0xE5,Z.enemyY);
    label('enemy_contact_y_compare');e(0xC9,enemyContactY);b(0xB0,'enemy_contact_done');
    // Contact has succeeded. Face the player before retreating *away* from
    // them; unlike the former code this also works for contact on patrol.
    ld(Z.enemyScreen);e(0xC5,Z.screen);b(0xF0,'enemy_contact_facing_same');b(0x90,'enemy_contact_face_right');jmp('enemy_contact_face_left');
    label('enemy_contact_facing_same');ld(Z.enemyX);e(0xC5,Z.playerX);b(0x90,'enemy_contact_face_right');b(0xF0,'enemy_contact_apply');jmp('enemy_contact_face_left');
    label('enemy_contact_face_right');set(Z.enemyFacing,0);jmp('enemy_contact_apply');label('enemy_contact_face_left');set(Z.enemyFacing,1);
    label('enemy_contact_apply');copy(Z.screen,Z.enemyContactScreen);copy(Z.playerX,Z.enemyContactX);copy(Z.temp2,Z.enemyContactY);ld(Z.enemyY);e(0xC5,Z.temp2);b(0xF0,'enemy_contact_retreat_up');b(0x90,'enemy_contact_retreat_up');set(Z.enemyRetreatVertical,1);jmp('enemy_contact_retreat_set');
    label('enemy_contact_retreat_up');set(Z.enemyRetreatVertical,0);label('enemy_contact_retreat_set');
    ld(Z.enemyY);e(0xC9,Math.max(31,190-Math.min(56,enemyContactY+8)));b(0xB0,'enemy_retreat_force_up');e(0xC9,Math.min(189,31+Math.min(56,enemyContactY+8)));b(0x90,'enemy_retreat_force_down');jmp('enemy_retreat_direction_ready');
    label('enemy_retreat_force_up');set(Z.enemyRetreatVertical,0);jmp('enemy_retreat_direction_ready');
    label('enemy_retreat_force_down');set(Z.enemyRetreatVertical,1);
    label('enemy_retreat_direction_ready');set(Z.enemyRetreatSteps,enemyRetreatSteps);
    set(Z.hurtTimer,aiConfig.hurtTicks);    set(Z.enemyTimer,enemyRetreatDuration);set(Z.enemyPhase,2);
    // Keep the original hop available only as an explicit optional choice.
    // Default contact feedback is a short blink; the Ghost stays controllable.
    if(aiConfig.contactBounce){set(Z.velocityY,252);set(Z.grounded,0);}
    label('enemy_contact_done');e(0x60);
    // Reusable unsigned separation test across screen seams. The larger
    // thresholds are intentionally distinct from the actual hit thresholds.
    label('enemy_disengagement');
    ld(Z.enemyScreen);e(0xC5,Z.screen);b(0xF0,'enemy_disengagement_same_screen');b(0x90,'enemy_disengagement_left_screen');jmp('enemy_disengagement_right_screen');
    label('enemy_disengagement_same_screen');ld(Z.enemyX);e(0xC5,Z.playerX);b(0xB0,'enemy_disengagement_same_ge');ld(Z.playerX);e(0x38,0xE5,Z.enemyX);jmp('enemy_disengagement_x_compare');
    label('enemy_disengagement_same_ge');ld(Z.enemyX);e(0x38,0xE5,Z.playerX);jmp('enemy_disengagement_x_compare');
    label('enemy_disengagement_left_screen');ld(Z.enemyScreen);add(1);e(0xC5,Z.screen);b(0xD0,'enemy_disengagement_clear');ld(Z.enemyX);add(enemyRearmX);b(0x90,'enemy_disengagement_clear');e(0x38,0xE5,Z.playerX);jmp('enemy_disengagement_seam_compare');
    label('enemy_disengagement_right_screen');ld(Z.screen);add(1);e(0xC5,Z.enemyScreen);b(0xD0,'enemy_disengagement_clear');ld(Z.playerX);add(enemyRearmX);b(0x90,'enemy_disengagement_clear');e(0x38,0xE5,Z.enemyX);
    label('enemy_disengagement_seam_compare');b(0xF0,'enemy_disengagement_clear');b(0x90,'enemy_disengagement_clear');jmp('enemy_disengagement_y');
    label('enemy_disengagement_x_compare');e(0xC9,enemyRearmX);b(0xB0,'enemy_disengagement_clear');
    label('enemy_disengagement_y');ld(Z.playerY);sub(18);st(Z.temp2);e(0xC5,Z.enemyY);b(0xB0,'enemy_disengagement_y_ge');ld(Z.enemyY);e(0x38,0xE5,Z.temp2);jmp('enemy_disengagement_y_compare');
    label('enemy_disengagement_y_ge');ld(Z.temp2);e(0x38,0xE5,Z.enemyY);
    label('enemy_disengagement_y_compare');e(0xC9,enemyRearmY);b(0xB0,'enemy_disengagement_clear');
    e(0x60); // Still touching: keep the contact latch closed and continue escaping.
    label('enemy_disengagement_clear');set(Z.enemyPhase,0);e(0x60);

    // Render animated 8x8 metasprite pieces into the same OAM page as Ghost.
    label('enemy_draw');ld(Z.enemyX);e(0x38,0xE5,Z.viewLo);st(Z.enemyRenderX);ld(Z.enemyScreen);e(0xE5,Z.viewHi);st(Z.enemyRenderHi);
    e(0xA6,Z.enemyFrame);abs(0xBD,'enemy_frame_lo');st(Z.enemyFramePtr);abs(0xBD,'enemy_frame_hi');st(Z.enemyFramePtr+1);e(0xA0,2,0xB1,Z.enemyFramePtr);st(Z.enemyPieceCount);b(0xF0,'enemy_draw_done');e(0xC8,0xB1,Z.enemyFramePtr);st(Z.enemyPiecePtr);e(0xC8,0xB1,Z.enemyFramePtr);st(Z.enemyPiecePtr+1);set(Z.enemyPieceOffset,0);
    label('enemy_draw_piece');e(0xA4,Z.enemyPieceOffset,0xB1,Z.enemyPiecePtr);st(Z.enemyPieceX);e(0xC8,0xB1,Z.enemyPiecePtr);st(Z.enemyPieceY);e(0xC8,0xB1,Z.enemyPiecePtr);st(Z.enemyPieceTile);e(0xC8,0xB1,Z.enemyPiecePtr);st(Z.enemyPieceAttr);e(0xC8,0x84,Z.enemyPieceOffset);ld(Z.enemyFacing);b(0xF0,'enemy_piece_forward');ld(Z.enemyPieceX);e(0x49,255);add(249);st(Z.enemyPieceX);ld(Z.enemyPieceAttr);e(0x49,64);st(Z.enemyPieceAttr);label('enemy_piece_forward');
    function enemyCoordinate(offset,origin,max){const positive=uniq('enemy_positive'),done=uniq('enemy_coordinate');ld(offset);b(0x10,positive);zpadd(origin);b(0x90,'enemy_piece_skip');jmp(done);label(positive);zpadd(origin);b(0xB0,'enemy_piece_skip');label(done);e(0xC9,max+1);b(0xB0,'enemy_piece_skip');st(offset);}
    // Signed piece offset + signed 16-bit camera-space actor origin.  An
    // origin beyond the viewport may still have visible negative-offset
    // pieces.  The NES itself clips sprites drawn at X=249..255.
    label('enemy_piece_x');ld(Z.enemyPieceX);b(0x10,'enemy_piece_positive');e(0x18,0x65,Z.enemyRenderX);st(Z.enemyPieceX);ld(Z.enemyRenderHi);e(0x69,255);jmp('enemy_piece_high');
    label('enemy_piece_positive');e(0x18,0x65,Z.enemyRenderX);st(Z.enemyPieceX);ld(Z.enemyRenderHi);e(0x69,0);
    label('enemy_piece_high');st(Z.enemyPieceHi);b(0xD0,'enemy_piece_skip');enemyCoordinate(Z.enemyPieceY,Z.enemyY,232);ld(Z.enemyPieceY);b(0xF0,'enemy_piece_skip');sub(1);e(0xA6,Z.oamIndex);abs(0x9D,0x0200);ld(Z.enemyPieceTile);abs(0x9D,0x0201);ld(Z.enemyPieceAttr);abs(0x9D,0x0202);ld(Z.enemyPieceX);abs(0x9D,0x0203);ld(Z.oamIndex);add(4);st(Z.oamIndex);
    label('enemy_piece_skip');e(0xC6,Z.enemyPieceCount);b(0xD0,'enemy_draw_piece');label('enemy_draw_done');e(0x60);
  }
  const gameplayRuntime=spec.gameplayCore?.enabled?services.GameplayEngine.emit(spec.gameplayCore,{e,label,address,abs,jsr,jmp,b,imm,ld,st,set,copy,current:()=>pc,fixupByte},Z,{world:true}):null;
  const audioRuntime=spec.audio?.enabled?services.AudioEngine.emit(spec.audio,{e,label,address,abs,jsr,jmp,b,imm,ld,st,set,copy,current:()=>pc,fixupByte},0x80):null;
  const codeEnd=pc;resources.push({kind:'code',ownerId:'world-engine',address:0x8000,byteLength:codeEnd-0x8000,alignment:1,region:'PRG',bank:0});
  const dataResource=(name,kind,values)=>{label(name);const address=pc;for(const value of values)e(value);resources.push({kind,ownerId:name,address,byteLength:pc-address,alignment:1,region:'PRG',bank:0});};
  dataResource('bit_masks','lookup',Array.from({length:32},(_,i)=>1<<(i&7)));
  dataResource('byte_offsets','lookup',Array.from({length:32},(_,i)=>i>>3));
  if(stairsOn){const all=[],first=[],count=[];for(const sc of screens){first.push(all.length&255);count.push((sc.stairs||[]).length);all.push(...(sc.stairs||[]));}
    dataResource('stair_count_table','stairs',count);dataResource('stair_first_table','stairs',first);
    for(const [k,f] of [['bx',st=>st.x],['by',st=>st.y],['tx',st=>st.x+(st.dir?-st.len:st.len)],['ty',st=>st.y-st.len],['len',st=>st.len],['dir',st=>st.dir]])dataResource('stair_'+k,'stairs',all.map(st=>f(st)&255));}
  if(chrSelect){dataResource('world_chr_table','chr-bank',spec.worldChrBank);dataResource('chr_lut_table','chr-bank-lut',Array.from({length:spec.chrBanks||1},(_,i)=>i));}
  for(const key of['left','right','up','down','worldIndex','roomIndex','cameraIndex','screenX','screenY','cameraScreen'])dataResource(key+'_table','screen-index',screens.map((screen,index)=>(screen[key]??(key==='cameraScreen'?index:0))&255));
  const refs={nt:[],collision:[],pal:[],markers:[]},data=[];
  for(const kind of Object.keys(refs)){
    const seen=new Map();screens.forEach((screen,index)=>{
      let values;if(kind==='nt')values=pooled?pooledNt[index]:Array.from(screen.nt);else if(kind==='pal')values=Array.from(screen.palette);else if(kind==='markers'){values=new Array(240).fill(255);screen.markers.forEach((marker,i)=>{const cell=(marker.y>>4)*16+(marker.x>>4);if(values[cell]===255)values[cell]=i;});values.push(...screen.markers.flatMap(marker=>[marker.targetScreen,marker.targetX,marker.targetY]));}else{values=new Array(120).fill(0);screen.collision.forEach((value,i)=>{if(value)values[i>>3]|=1<<(i&7);});}
      const key=values.join(',');let name=seen.get(key);if(!name){name=kind+'_data_'+index;seen.set(key,name);data.push({name,kind,values});}refs[kind].push(name);
    });
    for(const part of['lo','hi']){label(kind+'_'+part);const address=pc;for(const name of refs[kind]){fixups.push({at:pc,name,part});e(0);}resources.push({kind:'resource-pointers',ownerId:kind+'_'+part,address,byteLength:pc-address,alignment:1,region:'PRG',bank:0});}
  }
  if(pooled){
    for(const part of ['lo','hi']){
      label('column_'+part);const address=pc;
      colPool.forEach((_,i)=>{fixups.push({at:pc,name:'column_data_'+i,part});e(0);});
      resources.push({kind:'nt-column-pointers',ownerId:'column_'+part,address,byteLength:pc-address,alignment:1,region:'PRG',bank:0});
    }
    colPool.forEach((values,i)=>data.push({name:'column_data_'+i,kind:'nt-column-dictionary',values}));
  }
  for(const [direction,resolve]of Object.entries({left:s=>s.left,right:s=>s.right,up:s=>s.up,up_left:s=>s.left<0?-1:screens[s.left].up,up_right:s=>s.right<0?-1:screens[s.right].up})){
    for(const part of['lo','hi']){const name='collision_'+direction+'_'+part;label(name);const address=pc;for(const screen of screens){const neighbor=resolve(screen);if(neighbor<0)e(0);else{fixups.push({at:pc,name:refs.collision[neighbor],part});e(0);}}resources.push({kind:'neighbor-collision-pointers',ownerId:name,address,byteLength:pc-address,alignment:1,region:'PRG',bank:0});}
  }
  label('player_map');for(const animation of animations)address('animation_'+allAnims.indexOf(animation));labels.player_map_hi=labels.player_map+1;resources.push({kind:'animation-map',ownerId:'player_map',address:labels.player_map,byteLength:8,alignment:1,region:'PRG',bank:0});
  allAnims.forEach((animation,ai)=>{const name='animation_'+ai;label(name);e(animation.frames.length,animation.loop!==false?1:0);animation.frames.forEach((_,fi)=>address('frame_'+ai+'_'+fi));resources.push({kind:'animation-descriptor',ownerId:name,address:labels[name],byteLength:pc-labels[name],alignment:1,region:'PRG',bank:0});});
  allAnims.forEach((animation,ai)=>animation.frames.forEach((frame,fi)=>{const name='frame_'+ai+'_'+fi;label(name);e(frame.duration,frame.eventMask||0,frame.pieces.length);address('pieces_'+ai+'_'+fi);if(spec.audio?.enabled)e(frame.sound??255);resources.push({kind:'animation-frame',ownerId:name,address:labels[name],byteLength:pc-labels[name],alignment:1,region:'PRG',bank:0});dataResource('pieces_'+ai+'_'+fi,'player-pieces',frame.pieces.flatMap(piece=>[piece.x&255,piece.y&255,piece.tile,piece.attr]));}));
  if(enemy){dataResource('enemy_duration_table','enemy-animation',enemy.frames.map(f=>f.duration));for(const part of ['lo','hi']){label('enemy_frame_'+part);for(let i=0;i<enemy.frames.length;i++){fixups.push({at:pc,name:'enemy_frame_'+i,part});e(0);}}enemy.frames.forEach((f,i)=>{label('enemy_frame_'+i);e(f.duration,0,f.pieces.length);address('enemy_pieces_'+i);dataResource('enemy_pieces_'+i,'enemy-pieces',f.pieces.flatMap(q=>[q.x&255,q.y&255,q.tile,q.attr]));});if(aiPath.length){dataResource('enemy_path_screens','enemy-patrol-path',aiPath.map(p=>p.screen));dataResource('enemy_path_x','enemy-patrol-path',aiPath.map(p=>p.x));dataResource('enemy_path_y','enemy-patrol-path',aiPath.map(p=>p.y));}}

  for(const record of data)dataResource(record.name,record.kind,record.values);
  const dataEnd=pc;if(dataEnd>0xCFF0){const required=dataEnd-0x8000,available=0xCFF0-0x8000;fail('NROM / Mapper 0 PRG allocation exceeded by '+(required-available)+' bytes (required '+required+', available '+available+'). The full World and all authored assets remain unchanged. This build needs resource/code optimization or a future banked-mapper backend; reducing the World is not automatic.');}
  for(const fixup of fixups){const value=labels[fixup.name];if(value===undefined)fail('Unknown engine label '+fixup.name);const i=fixup.at-0x8000;if(fixup.part)bytes[i]=fixup.part==='lo'?value&255:value>>>8;else{bytes[i]=value&255;bytes[i+1]=value>>>8;}}
  return{bytes:new Uint8Array(bytes),chrSelect,reset:labels.reset,nmi:labels.nmi,irq:labels.irq,symbols:{...Z,states:{idle:0,walk:1,jump:2,attack:3},audio:audioRuntime?.zp||null,gameplay:gameplayRuntime,labels:{...labels}},codeEnd,dataEnd,resources};
}
services.WorldEngine=Object.freeze({compile});
})();
