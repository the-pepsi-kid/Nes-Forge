/* NES Forge 1.9.0 — bounded generated-ROM Gameplay Core execution. */
(()=>{
'use strict';
const services=window.Forge.services;
const fail=message=>{throw Error('Gameplay Core engine: '+message);};
const A=Object.freeze({active:0x0300,generation:0x0310,definition:0x0320,state:0x0330,timer:0x0340,x:0x0350,y:0x0360,direction:0x0370,persistent:0x0380,health:0x03C0,screen:0x03D0,instance:0x03E0});
const keyMask={a:1,b:2,select:4,start:8,up:16,down:32,left:64,right:128};
function defaultByte(variable){if(variable.type==='boolean')return variable.default?1:0;if(variable.type==='enum')return Math.max(0,variable.values.indexOf(variable.default));return variable.default;}
function emit(plan,api,z,{world=false}={}){
  if(!plan?.enabled)return null;services.GameplayCompiler.compileSemantics(plan);
  const {e,label,abs,jsr,jmp,b,imm,ld,st,set,current}=api,base=0x60,temp=base,temp2=base+1,lastScreen=base+2;
  const lda=address=>abs(0xAD,address),sta=address=>abs(0x8D,address),inc=address=>abs(0xEE,address),dec=address=>abs(0xCE,address),cmp=value=>e(0xC9,value&255);
  const profile=services.GameplayModel.runtimeProfile;if(A.persistent+profile.persistentCapacity>A.health)fail('Persistent RAM profile overlaps Runtime Actor health storage');if(plan.variables.length>profile.persistentCapacity)fail('Persistent variable capacity exceeded before emission');
  const actorAddress=(kind,slot)=>A[kind]+slot,persistentAddress=index=>A.persistent+index;
  const value=(actor,raw,fallback=0)=>{if(typeof raw==='number')return raw;if(typeof raw==='string'&&Object.hasOwn(actor.parameters,raw))return actor.parameters[raw];return fallback;};
  const uniquePrefix='gc_'+(world?'world':'room')+'_';
  function overlap(actor,prefix,failed){
    lda(z.playerX);abs(0xCD,actorAddress('x',actor.slot));b(0xB0,prefix+'_x_player_ge');lda(actorAddress('x',actor.slot));e(0x38,0xE5,z.playerX);jmp(prefix+'_x_distance');label(prefix+'_x_player_ge');lda(z.playerX);e(0x38);abs(0xED,actorAddress('x',actor.slot));label(prefix+'_x_distance');cmp(Math.max(8,Math.min(32,Math.ceil(actor.collider.width/2)+6)));b(0xB0,failed);
    lda(z.playerY);abs(0xCD,actorAddress('y',actor.slot));b(0xB0,prefix+'_y_player_ge');lda(actorAddress('y',actor.slot));e(0x38,0xE5,z.playerY);jmp(prefix+'_y_distance');label(prefix+'_y_player_ge');lda(z.playerY);e(0x38);abs(0xED,actorAddress('y',actor.slot));label(prefix+'_y_distance');cmp(Math.max(12,Math.min(40,actor.collider.height)));b(0xB0,failed);
  }
  function persistentIndex(actor,id){const found=plan.variables.find(item=>item.id===id);if(!found)fail('Actor '+actor.id+' references missing persistent variable '+id);return found.index;}
  function persistentByte(actor,id,value){const variable=plan.variables.find(item=>item.id===id);if(!variable)fail('Actor '+actor.id+' references missing persistent variable '+id);if(variable.type==='boolean')return value?1:0;if(variable.type==='enum'){const index=variable.values.indexOf(value);if(index<0)fail('Actor '+actor.id+' uses an invalid enum persistent value');return index;}return value;}
  function emitCondition(actor,operation,prefix,failed){
    if(operation.type==='always')return;
    if(operation.type==='overlapPlayer'){overlap(actor,prefix,failed);return;}
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
      const done=prefix+'_damage_done',playerHealth=actorAddress('health',plan.compatibilityPlayerSlot);lda(actorAddress('timer',actor.slot));b(0xD0,done);overlap(actor,prefix+'_damage',done);lda(playerHealth);b(0xF0,done);dec(playerHealth);imm(operation.cooldown??30);sta(actorAddress('timer',actor.slot));label(done);return;
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
  }e(0x60);
  label(uniquePrefix+'draw');
  for(const actor of plan.actors){if(actor.components.includes('Input')||!actor.renderEnabled)continue;const prefix=uniquePrefix+'draw_'+actor.slot,skip=prefix+'_skip';lda(actorAddress('active',actor.slot));b(0xF0,skip);if(world){lda(actorAddress('screen',actor.slot));e(0xC5,z.screen);b(0xD0,skip);}ld(z.oamIndex);cmp(253);b(0xB0,skip);e(0xAA);lda(actorAddress('y',actor.slot));b(0xF0,skip);e(0x38,0xE9,1);abs(0x9D,0x0200);imm(actor.render.tile&255);abs(0x9D,0x0201);imm((actor.render.palette&3)|(actor.render.behind?32:0));abs(0x9D,0x0202);lda(actorAddress('x',actor.slot));abs(0x9D,0x0203);ld(z.oamIndex);e(0x18,0x69,4);st(z.oamIndex);label(skip);}e(0x60);
  const codeEnd=current();if(codeEnd>0xCFF0)fail('Generated actor evaluator exceeds the current NROM code/resource region');
  return{zp:{temp,temp2,lastScreen},arrays:A,actorCount:plan.actors.length,variableCount:plan.variables.length,labels:{init:uniquePrefix+'init',reconstruct:uniquePrefix+'reconstruct',update:uniquePrefix+'update',draw:uniquePrefix+'draw'}};
}
services.GameplayEngine=Object.freeze({emit,arrays:A,keyMask});
})();
