/* NES Forge 1.9.0 — bounded generated-ROM Gameplay Core execution. */
(()=>{
'use strict';
const services=window.Forge.services;
const fail=message=>{throw Error('Gameplay Core engine: '+message);};
const A=Object.freeze({active:0x0300,generation:0x0310,definition:0x0320,state:0x0330,timer:0x0340,x:0x0350,y:0x0360,direction:0x0370,persistent:0x0380,health:0x03C0,screen:0x03D0,instance:0x03E0});
// World extras in page 6 (the stair state uses $0680-$0684): one walk-animation clock per distinct actor animation,
// scratch for the shared metasprite routine ($06B0-$06B2), a four-bullet pool, and a fire timer per actor slot.
const ANIM=0x06A0,META=Object.freeze({x:0x06B0,y:0x06B1,end:0x06B2}),BULLETS=4,B=Object.freeze({active:0x06C0,x:0x06C4,y:0x06C8,dir:0x06CC,screen:0x06D0,tile:0x06D4,attr:0x06D8,speed:0x06DC}),FIRE=0x06E0;
const keyMask={a:1,b:2,select:4,start:8,up:16,down:32,left:64,right:128};
function defaultByte(variable){if(variable.type==='boolean')return variable.default?1:0;if(variable.type==='enum')return Math.max(0,variable.values.indexOf(variable.default));return variable.default;}
function emit(plan,api,z,{world=false}={}){
  if(!plan?.enabled)return null;services.GameplayCompiler.compileSemantics(plan);
  const {e,label,abs,jsr,jmp,b,imm,ld,st,set,current}=api,base=0x60,temp=base,temp2=base+1,lastScreen=base+2;
  const lda=address=>abs(0xAD,address),sta=address=>abs(0x8D,address),inc=address=>abs(0xEE,address),dec=address=>abs(0xCE,address),cmp=value=>e(0xC9,value&255);
  const profile=services.GameplayModel.runtimeProfile;if(A.persistent+profile.persistentCapacity>A.health)fail('Persistent RAM profile overlaps Runtime Actor health storage');if(plan.variables.length>profile.persistentCapacity)fail('Persistent variable capacity exceeded before emission');
  const actorAddress=(kind,slot)=>A[kind]+slot,persistentAddress=index=>A.persistent+index;
  const value=(actor,raw,fallback=0)=>{if(typeof raw==='number')return raw;if(typeof raw==='string'&&Object.hasOwn(actor.parameters,raw))return actor.parameters[raw];return fallback;};
  const uniquePrefix='gc_'+(world?'world':'room')+'_';let fireSerial=0;
  const ops=plan.actors.flatMap(actor=>(actor.behavior?.states||[]).flatMap(state=>[...(state.onTick||[]),...(state.onEnter||[])]));
  const bulletsOn=world&&ops.some(op=>op.type==='fireProjectile');
  function overlap(actor,prefix,failed){
    lda(z.playerX);abs(0xCD,actorAddress('x',actor.slot));b(0xB0,prefix+'_x_player_ge');lda(actorAddress('x',actor.slot));e(0x38,0xE5,z.playerX);jmp(prefix+'_x_distance');label(prefix+'_x_player_ge');lda(z.playerX);e(0x38);abs(0xED,actorAddress('x',actor.slot));label(prefix+'_x_distance');cmp(Math.max(8,Math.min(32,Math.ceil(actor.collider.width/2)+6)));b(0xB0,failed);
    lda(z.playerY);abs(0xCD,actorAddress('y',actor.slot));b(0xB0,prefix+'_y_player_ge');lda(actorAddress('y',actor.slot));e(0x38,0xE5,z.playerY);jmp(prefix+'_y_distance');label(prefix+'_y_player_ge');lda(z.playerY);e(0x38);abs(0xED,actorAddress('y',actor.slot));label(prefix+'_y_distance');cmp(Math.max(12,Math.min(40,actor.collider.height)));b(0xB0,failed);
  }
  function persistentIndex(actor,id){const found=plan.variables.find(item=>item.id===id);if(!found)fail('Actor '+actor.id+' references missing persistent variable '+id);return found.index;}
  function persistentByte(actor,id,value){const variable=plan.variables.find(item=>item.id===id);if(!variable)fail('Actor '+actor.id+' references missing persistent variable '+id);if(variable.type==='boolean')return value?1:0;if(variable.type==='enum'){const index=variable.values.indexOf(value);if(index<0)fail('Actor '+actor.id+' uses an invalid enum persistent value');return index;}return value;}
  function emitCondition(actor,operation,prefix,failed){
    if(operation.type==='always')return;
    if(operation.type==='overlapPlayer'){overlap(actor,prefix,failed);return;}
    // The player is in its attack state and the actor is within reach in front of it (and within height of its feet).
    if(operation.type==='playerAttackHit'){
      const ax=actorAddress('x',actor.slot),ay=actorAddress('y',actor.slot),reach=operation.reach??32,height=operation.height??32;
      if(world){lda(actorAddress('screen',actor.slot));e(0xC5,z.screen);b(0xD0,failed);}
      lda(z.playerState);cmp(3);b(0xD0,failed);
      lda(z.playerFacing);b(0xD0,prefix+'_atk_left');
      lda(ax);e(0x38,0xE5,z.playerX);b(0x90,failed);cmp(reach);b(0xB0,failed);jmp(prefix+'_atk_y');
      label(prefix+'_atk_left');lda(z.playerX);e(0x38);abs(0xED,ax);b(0x90,failed);cmp(reach);b(0xB0,failed);
      label(prefix+'_atk_y');lda(z.playerY);abs(0xCD,ay);b(0xB0,prefix+'_atk_pge');lda(ay);e(0x38,0xE5,z.playerY);jmp(prefix+'_atk_yd');
      label(prefix+'_atk_pge');lda(z.playerY);e(0x38);abs(0xED,ay);label(prefix+'_atk_yd');cmp(height);b(0xB0,failed);return;
    }
    if(operation.type==='inputEdge'||operation.type==='inputHeld'){const mask=keyMask[operation.key];if(!mask)fail('Unsupported input key '+operation.key);ld(operation.type==='inputEdge'?z.edges:z.buttons);e(0x29,mask);b(0xF0,failed);return;}
    if(operation.type==='timerDone'){lda(actorAddress('timer',actor.slot));b(0xD0,failed);return;}
    if(operation.type==='persistentCompare'){
      const index=persistentIndex(actor,operation.variableId);lda(persistentAddress(index));cmp(persistentByte(actor,operation.variableId,operation.value));
      if(operation.operator==='eq')b(0xD0,failed);else if(operation.operator==='ne')b(0xF0,failed);else fail('Generated runtime persistent comparison supports eq/ne');return;
    }
    fail('Condition '+operation.type+' is canonical but unsupported by the 1.9.0 generated-runtime profile for generic actors');
  }
  function emitAction(actor,operation){
    if(operation.type==='persistentSet'){const index=persistentIndex(actor,operation.variableId);imm(persistentByte(actor,operation.variableId,operation.value));sta(persistentAddress(index));return;}
    if(operation.type==='despawn'){imm(0);sta(actorAddress('active',actor.slot));return;}
    if(operation.type==='setTimer'){imm(operation.ticks);sta(actorAddress('timer',actor.slot));return;}
    fail('Action '+operation.type+' is canonical but unsupported by the 1.9.0 generated-runtime profile for generic actors');
  }
  function emitOnTick(actor,operation,prefix){
    if(operation.type==='moveWithinBounds'){
      const min=value(actor,operation.minParameter,operation.minX??0),max=value(actor,operation.maxParameter,operation.maxX??255),speed=value(actor,operation.speedParameter,operation.speed??1);if(min>=max||speed<1||speed>4)fail('Actor '+actor.id+' has invalid patrol bounds/speed');
      for(let step=0;step<speed;step++){const left=prefix+'_patrol_left_'+step,done=prefix+'_patrol_done_'+step;lda(actorAddress('direction',actor.slot));b(0xD0,left);inc(actorAddress('x',actor.slot));lda(actorAddress('x',actor.slot));cmp(max);b(0x90,done);imm(1);sta(actorAddress('direction',actor.slot));jmp(done);label(left);dec(actorAddress('x',actor.slot));lda(actorAddress('x',actor.slot));cmp(min);b(0xB0,done);imm(0);sta(actorAddress('direction',actor.slot));label(done);}return;
    }
    if(operation.type==='contactDamage'){
      const done=prefix+'_damage_done',playerHealth=actorAddress('health',plan.compatibilityPlayerSlot);lda(actorAddress('timer',actor.slot));b(0xD0,done);overlap(actor,prefix+'_damage',done);lda(playerHealth);b(0xF0,done);dec(playerHealth);imm(operation.cooldown??30);sta(actorAddress('timer',actor.slot));
      // World: when the player's health runs out it restarts at the spawn with full health.
      if(world&&plan.compatibilityPlayerHealth){lda(playerHealth);b(0xD0,done);imm(plan.compatibilityPlayerHealth);sta(playerHealth);jsr('restart');}
      label(done);return;
    }
    // Fire at the player: every `interval` frames while on the player's screen, a free bullet starts at the actor's
    // muzzle height and travels horizontally toward the player at `speed` pixels per frame.
    if(operation.type==='fireProjectile'){
      if(!world)fail('fireProjectile runs in the World runtime');
      const L=uniquePrefix+'fire_'+(fireSerial++),t=FIRE+actor.slot,ax=actorAddress('x',actor.slot),ay=actorAddress('y',actor.slot);
      lda(t);b(0xF0,L+'_go');dec(t);jmp(L+'_done');
      label(L+'_go');imm(operation.interval??90);sta(t);
      e(0xA2,0);label(L+'_find');abs(0xBD,B.active);b(0xF0,L+'_slot');e(0xE8,0xE0,BULLETS);b(0xD0,L+'_find');jmp(L+'_done');
      label(L+'_slot');imm(1);abs(0x9D,B.active);ld(z.screen);abs(0x9D,B.screen);
      lda(ay);e(0x18,0x69,(operation.offsetY??-16)&255);abs(0x9D,B.y);
      imm(actor.projectileTiles?.[operation.tile]??operation.tile??0);abs(0x9D,B.tile);imm((operation.palette??0)&3);abs(0x9D,B.attr);imm(operation.speed??2);abs(0x9D,B.speed);
      lda(ax);e(0xC5,z.playerX);b(0xB0,L+'_left');
      imm(0);abs(0x9D,B.dir);lda(ax);e(0x18,0x69,8);abs(0x9D,B.x);jmp(L+'_done');
      label(L+'_left');imm(1);abs(0x9D,B.dir);lda(ax);e(0x38,0xE9,8);abs(0x9D,B.x);
      label(L+'_done');return;
    }
    if(operation.type==='syncActiveFromPersistent'){
      const index=persistentIndex(actor,operation.variableId),truth=prefix+'_sync_truth',done=prefix+'_sync_done';lda(persistentAddress(index));b(0xD0,truth);imm(operation.whenTrue?0:1);sta(actorAddress('active',actor.slot));jmp(done);label(truth);imm(operation.whenTrue?1:0);sta(actorAddress('active',actor.slot));label(done);return;
    }
    emitAction(actor,operation);
  }
  label(uniquePrefix+'init');
  for(const variable of plan.variables){imm(defaultByte(variable));sta(persistentAddress(variable.index));}
  if(world){ld(z.screen);st(lastScreen);}e(0x60);
  label(uniquePrefix+'reconstruct');
  if(bulletsOn){imm(0);for(let i=0;i<BULLETS;i++)sta(B.active+i);}
  for(const actor of plan.actors){
    const stateIndex=Math.max(0,actor.behavior.states.findIndex(item=>item.id===actor.behavior.initialStateId));imm(actor.components.includes('Input')?0:1);sta(actorAddress('active',actor.slot));inc(actorAddress('generation',actor.slot));imm(plan.identity.definitionIds.indexOf(actor.definitionId));sta(actorAddress('definition',actor.slot));imm(actor.slot);sta(actorAddress('instance',actor.slot));imm(stateIndex);sta(actorAddress('state',actor.slot));imm(0);sta(actorAddress('timer',actor.slot));imm(actor.localX);sta(actorAddress('x',actor.slot));imm(actor.localY);sta(actorAddress('y',actor.slot));imm(actor.facing);sta(actorAddress('direction',actor.slot));imm(actor.health);sta(actorAddress('health',actor.slot));imm(actor.screen??0);sta(actorAddress('screen',actor.slot));
    if(actor.behaviorEnabled){const hide=(actor.behavior.transitions||[]).flatMap(item=>item.actions||[]).find(item=>item.type==='persistentSet'&&(item.value===true||item.value===1));if(hide&&actor.components.includes('Pickup')){const visible=uniquePrefix+'pickup_visible_'+actor.slot;lda(persistentAddress(persistentIndex(actor,hide.variableId)));b(0xF0,visible);imm(0);sta(actorAddress('active',actor.slot));label(visible);}for(const operation of actor.behavior.states[stateIndex]?.onEnter||[])emitAction(actor,operation);}
  }e(0x60);
  label(uniquePrefix+'update');
  if(world){const same=uniquePrefix+'same_screen';ld(z.screen);e(0xC5,lastScreen);b(0xF0,same);st(lastScreen);jsr(uniquePrefix+'reconstruct');label(same);}
  for(const actor of plan.actors){
    if(actor.components.includes('Input')||!actor.behaviorEnabled)continue;const prefix=uniquePrefix+'actor_'+actor.slot,done=prefix+'_done';lda(actorAddress('active',actor.slot));b(0xF0,done);if(world){lda(actorAddress('screen',actor.slot));e(0xC5,z.screen);b(0xD0,done);}lda(actorAddress('timer',actor.slot));b(0xF0,prefix+'_timer_done');dec(actorAddress('timer',actor.slot));label(prefix+'_timer_done');
    const stateMap=new Map(actor.behavior.states.map((state,index)=>[state.id,index]));for(const [stateIndex,state]of actor.behavior.states.entries()){
      const nextState=prefix+'_next_state_'+stateIndex;lda(actorAddress('state',actor.slot));cmp(stateIndex);b(0xD0,nextState);for(const operation of state.onTick||[])emitOnTick(actor,operation,prefix+'_state_'+stateIndex);
      const transitions=actor.behavior.transitions.map((item,order)=>({item,order})).filter(entry=>entry.item.fromStateId===state.id).sort((a,b)=>b.item.priority-a.item.priority||a.order-b.order);
      for(const [ti,{item}]of transitions.entries()){const failed=prefix+'_transition_failed_'+stateIndex+'_'+ti;for(const operation of item.conditions||[])emitCondition(actor,operation,prefix+'_condition_'+stateIndex+'_'+ti,failed);for(const operation of state.onExit||[])emitAction(actor,operation);for(const operation of item.actions||[])emitAction(actor,operation);imm(stateMap.get(item.toStateId));sta(actorAddress('state',actor.slot));for(const operation of actor.behavior.states[stateMap.get(item.toStateId)].onEnter||[])emitAction(actor,operation);jmp(done);label(failed);}
      jmp(done);label(nextState);
    }label(done);
  }
  if(bulletsOn){
    // Bullets move, leave at the screen edge or on a screen change, and hit the player inside its body (feet up to 30 px).
    const bl=uniquePrefix+'bullet',health=plan.compatibilityPlayerSlot===null?null:actorAddress('health',plan.compatibilityPlayerSlot);
    e(0xA2,0);label(bl+'_loop');abs(0xBD,B.active);b(0xF0,bl+'_next');
    abs(0xBD,B.screen);e(0xC5,z.screen);b(0xD0,bl+'_kill');
    abs(0xBD,B.dir);b(0xD0,bl+'_left');abs(0xBD,B.x);e(0x18);abs(0x7D,B.speed);b(0xB0,bl+'_kill');abs(0x9D,B.x);jmp(bl+'_hit');
    label(bl+'_left');abs(0xBD,B.x);e(0x38);abs(0xFD,B.speed);b(0x90,bl+'_kill');abs(0x9D,B.x);
    label(bl+'_hit');abs(0xBD,B.x);e(0x38,0xE5,z.playerX);b(0xB0,bl+'_xpos');e(0x49,0xFF,0x18,0x69,1);label(bl+'_xpos');cmp(7);b(0xB0,bl+'_next');
    ld(z.playerY);e(0x38);abs(0xFD,B.y);b(0x90,bl+'_next');cmp(30);b(0xB0,bl+'_next');
    if(health!==null){lda(health);b(0xF0,bl+'_kill');dec(health);lda(health);b(0xD0,bl+'_kill');
      imm(plan.compatibilityPlayerHealth||1);sta(health);jsr('restart');e(0x60);}
    label(bl+'_kill');imm(0);abs(0x9D,B.active);
    label(bl+'_next');e(0xE8,0xE0,BULLETS);b(0xD0,bl+'_loop');
  }
  e(0x60);
  const metaRoutines=new Map(),animClocks=new Map();
  label(uniquePrefix+'draw');
  // Each distinct metasprite gets two entries in the piece tables (as drawn, and mirrored); X = entry, Y = actor slot.
  const routineFor=pieces=>{const key=JSON.stringify(pieces);if(!metaRoutines.has(key)){if(metaRoutines.size>=127)fail('At most 127 distinct actor metasprites');metaRoutines.set(key,{id:metaRoutines.size,pieces});}return metaRoutines.get(key).id*2;};
  const metaDraw=uniquePrefix+'meta_draw',drawEntry=(actor,prefix)=>{lda(actorAddress('direction',actor.slot));b(0xF0,prefix+'_plain');e(0xE8);label(prefix+'_plain');jsr(metaDraw);};
  // Walk animations: one clock per distinct animation, advanced once per frame and wrapped at its total duration.
  for(const actor of plan.actors){const frames=actor.render?.frames;if(!frames?.length||actor.components.includes('Input')||!actor.renderEnabled)continue;
    const key=JSON.stringify(frames);if(!animClocks.has(key)){if(animClocks.size>=16)fail('At most 16 distinct actor animations');animClocks.set(key,{index:animClocks.size,total:frames.reduce((n,f)=>n+f.duration,0)});}}
  for(const {index,total}of animClocks.values()){const next=uniquePrefix+'clock_'+index;inc(ANIM+index);lda(ANIM+index);cmp(total);b(0x90,next);imm(0);sta(ANIM+index);label(next);}
  if(bulletsOn){
    const bd=uniquePrefix+'bullet_draw';e(0xA0,0);label(bd+'_loop');abs(0xB9,B.active);b(0xF0,bd+'_next');ld(z.oamIndex);cmp(253);b(0xB0,bd+'_done');e(0xAA);
    abs(0xB9,B.y);e(0x38,0xE9,1);abs(0x9D,0x0200);abs(0xB9,B.tile);abs(0x9D,0x0201);abs(0xB9,B.attr);abs(0x9D,0x0202);abs(0xB9,B.x);abs(0x9D,0x0203);
    ld(z.oamIndex);e(0x18,0x69,4);st(z.oamIndex);label(bd+'_next');e(0xC8,0xC0,BULLETS);b(0xD0,bd+'_loop');label(bd+'_done');
  }
  for(const actor of plan.actors){if(actor.components.includes('Input')||!actor.renderEnabled)continue;const prefix=uniquePrefix+'draw_'+actor.slot,skip=prefix+'_skip';lda(actorAddress('active',actor.slot));b(0xF0,skip);if(world){lda(actorAddress('screen',actor.slot));e(0xC5,z.screen);b(0xD0,skip);}if(actor.render.frames?.length){
    // Animated: the frame comes from the animation's clock; each frame is a shared metasprite table entry (and mirror).
    const frames=actor.render.frames,clock=ANIM+animClocks.get(JSON.stringify(frames)).index;
    lda(actorAddress('y',actor.slot));b(0xF0,skip);e(0xA0,actor.slot);
    let threshold=0;
    frames.forEach((frame,i)=>{const entry=routineFor(frame.pieces);label(prefix+'_f'+i);threshold+=frame.duration;
      if(i<frames.length-1){lda(clock);cmp(threshold);b(0xB0,prefix+'_f'+(i+1));}
      e(0xA2,entry);if(i<frames.length-1)jmp(prefix+'_go');});
    label(prefix+'_go');drawEntry(actor,prefix);label(skip);continue;}
  if(actor.render.pieces){
    // Metasprite: a shared piece-table entry per distinct metasprite (and its mirror), drawn with the actor's slot in Y.
    const entry=routineFor(actor.render.pieces);
    lda(actorAddress('y',actor.slot));b(0xF0,skip);e(0xA0,actor.slot,0xA2,entry);drawEntry(actor,prefix);label(skip);continue;}
  ld(z.oamIndex);cmp(253);b(0xB0,skip);e(0xAA);lda(actorAddress('y',actor.slot));b(0xF0,skip);e(0x38,0xE9,1);abs(0x9D,0x0200);imm(actor.render.tile&255);abs(0x9D,0x0201);imm((actor.render.palette&3)|(actor.render.behind?32:0));abs(0x9D,0x0202);lda(actorAddress('x',actor.slot));abs(0x9D,0x0203);ld(z.oamIndex);e(0x18,0x69,4);st(z.oamIndex);label(skip);}e(0x60);
  // Shared metasprite routine: X = piece-table entry, Y = actor slot. Pieces are relative to the actor's position (its
  // feet); a mirrored entry has X flipped and the horizontal flip bit toggled. Pieces that would wrap past a screen
  // edge are skipped; a full OAM ends the routine. The tables hold every entry's pieces back to back.
  if(metaRoutines.size){
    const M=uniquePrefix+'meta',entries=[...metaRoutines.values()].flatMap(({pieces})=>[false,true].map(mirror=>pieces.map(p=>({dx:(mirror?-p.x-8:p.x)&255,dy:(p.y-1)&255,tile:p.tile&255,attr:(mirror?p.attr^0x40:p.attr)&255}))));
    const total=entries.reduce((n,list)=>n+list.length,0);if(total>255)fail('Actor metasprites use more than 255 pieces (mirrors included)');
    label(metaDraw);abs(0xB9,A.x);sta(META.x);abs(0xB9,A.y);sta(META.y);abs(0xBD,M+'_end');sta(META.end);abs(0xBC,M+'_start');
    label(M+'_loop');abs(0xCC,META.end);b(0xB0,M+'_done');e(0xA6,z.oamIndex,0xE0,253);b(0xB0,M+'_done');
    abs(0xB9,M+'_dx');b(0x10,M+'_right');e(0x18);abs(0x6D,META.x);b(0x90,M+'_next');jmp(M+'_put');
    label(M+'_right');e(0x18);abs(0x6D,META.x);b(0xB0,M+'_next');
    label(M+'_put');abs(0x9D,0x0203);abs(0xB9,M+'_dy');e(0x18);abs(0x6D,META.y);abs(0x9D,0x0200);abs(0xB9,M+'_tile');abs(0x9D,0x0201);abs(0xB9,M+'_attr');abs(0x9D,0x0202);
    e(0x8A,0x18,0x69,4);st(z.oamIndex);label(M+'_next');e(0xC8);jmp(M+'_loop');label(M+'_done');e(0x60);
    let at=0;label(M+'_start');for(const list of entries){e(at);at+=list.length;}label(M+'_end');at=0;for(const list of entries){at+=list.length;e(at);}
    for(const field of['dx','dy','tile','attr']){label(M+'_'+field);for(const list of entries)for(const piece of list)e(piece[field]);}
  }
  const codeEnd=current();if(codeEnd>0xCFF0)fail('Generated actor evaluator exceeds the current NROM code/resource region');
  return{zp:{temp,temp2,lastScreen},arrays:A,actorCount:plan.actors.length,variableCount:plan.variables.length,labels:{init:uniquePrefix+'init',reconstruct:uniquePrefix+'reconstruct',update:uniquePrefix+'update',draw:uniquePrefix+'draw'}};
}
services.GameplayEngine=Object.freeze({emit,arrays:A,keyMask});
})();
