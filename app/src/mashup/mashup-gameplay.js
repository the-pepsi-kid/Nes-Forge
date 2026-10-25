/* Seeded Mashup: bounded variation of existing canonical Gameplay Core actors. */
(()=>{
'use strict';
const services=window.Forge.services,VERSION='mashup-gameplay-1',cp=value=>JSON.parse(JSON.stringify(value));
const fail=message=>{throw Error('Mashup gameplay: '+message);};
const warningsBase=['Patrol speed and compatible authored placement slots can vary. This does not prove level solvability, difficulty, or complete playability.','Player/start positions, actor IDs, persistent bindings, Switch + Door logic, maps and World links remain unchanged. Door physical blocking remains deferred.'];
function stable(value){if(Array.isArray(value))return'['+value.map(stable).join(',')+']';if(value&&typeof value==='object')return'{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+stable(value[key])).join(',')+'}';return JSON.stringify(value===undefined?null:value);}
function sourceFingerprint(project){
 const geometry={gameplayCore:project.gameplayCore,gameplay:project.gameplay,worldRuntime:project.worldRuntime,scenes:(project.scenes||[]).map(s=>({id:s.id,nt:s.nt,attr:s.attr,tileProps:s.tileProps,metaMap:s.metaMap,metatiles:(s.metatiles||[]).map(m=>({id:m.id,tiles:m.tiles,pal:m.pal,collision:m.collision})),raster:s.raster,entities:s.entities})),worlds:project.worlds};
 const bytes=new TextEncoder().encode(stable(geometry));if(bytes.length>8*1024*1024)fail('Gameplay/geometry fingerprint exceeds the 8 MiB bound.');
 if(!window.FamiTone2Native?.sha256)fail('Source identity service is unavailable.');return window.FamiTone2Native.sha256(bytes);
}
function normalizedSeed(seed){if(typeof seed==='number'&&Number.isSafeInteger(seed))seed=String(seed);if(typeof seed!=='string'||!seed.length||seed.length>128)fail('Seed must be 1–128 characters or a safe integer.');return seed;}
function random(seed,domain){let state=2166136261;for(const c of VERSION+'\0'+seed+'\0'+domain){state^=c.charCodeAt(0);state=Math.imul(state,16777619);}return()=>{state=(state+0x6D2B79F5)|0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function optionsOf(options){const out={};for(const key of['enemyParameters','placement','itemValues']){if(options[key]!==undefined&&typeof options[key]!=='boolean')fail(key+' must be true or false.');out[key]=options[key]===true;}return out;}
function component(def,type){return def.components.find(c=>c.type===type&&c.enabled!==false);}
function roleOf(def,behavior,instance,core){
 if(['Input','Switch','Door'].some(type=>component(def,type))||!component(def,'Behavior')||!component(def,'Collider'))return null;
 const state=behavior.states.find(s=>s.id===behavior.initialStateId),empty=s=>!(s.onEnter||[]).length&&!(s.onExit||[]).length;
 if(component(def,'Pickup')&&component(def,'PersistenceBinding')&&behavior.states.length===1&&empty(state)&&!(state.onTick||[]).length&&behavior.transitions.length===1){
  const t=behavior.transitions[0],v=t.actions?.[0]&&core.persistentVariables.find(v=>v.id===t.actions[0].variableId);
  if(t.fromStateId===state.id&&t.toStateId===state.id&&t.conditions?.length===1&&t.conditions[0].type==='overlapPlayer'&&t.actions?.length===2&&t.actions[0].type==='persistentSet'&&t.actions[0].value===true&&t.actions[1].type==='despawn'&&v?.type==='boolean'&&v.default===false)return{kind:'pickup'};
 }
 if(component(def,'Physics')&&component(def,'ContactDamage')&&!component(def,'Pickup')&&behavior.transitions.length===0&&behavior.states.every(s=>empty(s)&&(s===state||!(s.onTick||[]).length))&&state.onTick?.length===2){
  const move=state.onTick[0],damage=state.onTick[1],speed=def.parameters.find(p=>p.id===move.speedParameter),values=services.GameplayModel.parameterValues(def,instance);
  if(move.type==='moveWithinBounds'&&damage.type==='contactDamage'&&damage.amount===1&&move.minParameter&&move.maxParameter&&new Set([move.minParameter,move.maxParameter,move.speedParameter]).size===3&&speed&&['uint','int'].includes(speed.type)&&speed.min>=1&&speed.max<=4&&values[move.minParameter]<values[move.maxParameter])return{kind:'patrol',speedParameter:move.speedParameter,speedMin:speed.min,speedMax:speed.max,minX:values[move.minParameter],maxX:values[move.maxParameter],speed:values[move.speedParameter]};
 }
 return null;
}
function contextFor(project,instance){
 const placement=instance.placement;
 if(placement.kind==='scene')return{key:'scene:'+placement.sceneId,scene:project.scenes.find(s=>s.id===placement.sceneId),x:instance.x,y:instance.y,width:256,height:240};
 const world=project.worlds.find(w=>w.id===placement.worldId),room=placement.kind==='room'?world?.rooms?.find(r=>r.id===placement.roomId):null;
 if(!world||(placement.kind==='room'&&!room))fail('Missing placement owner for '+instance.id+'.');
 return{key:stable(placement),world,scene:project.scenes.find(s=>s.id===world.tilesetSceneId),room,x:instance.x+(room?.x||0)*16,y:instance.y+(room?.y||0)*16,width:world.widthScreens*256,height:world.heightScreens*240};
}
function collisionAt(context,x,y){
 const sc=context.scene;if(!sc||sc.raster)return null;
 if(context.world){const cols=context.world.widthScreens*16,id=context.world.map?.[Math.floor(y/16)*cols+Math.floor(x/16)];if(id===-1)return 0;const m=sc.metatiles?.find(m=>m.id===id);return m?.collision?.[((Math.floor(y/8)&1)*2)+(Math.floor(x/8)&1)]??null;}
 const cell=Math.floor(y/16)*16+Math.floor(x/16),id=sc.metaMap?.[cell],m=id>=0?sc.metatiles?.find(m=>m.id===id):null;
 // The build reconciles links against visible tile IDs and attribute palette.
 // A stale link is detached before collision linking; do not trust its quadrants.
 if(m){const mc=cell%16,mr=Math.floor(cell/16),tr=mr*2,tc=mc*2,ai=(tr>>2)*8+(tc>>2),q=((tr>>1)&1)*2+((tc>>1)&1),pal=((sc.attr?.[ai]||0)>>(q*2))&3,tiles=[sc.nt?.[tr*32+tc],sc.nt?.[tr*32+tc+1],sc.nt?.[(tr+1)*32+tc],sc.nt?.[(tr+1)*32+tc+1]];if(m.pal===pal&&Array.isArray(m.tiles)&&m.tiles.length===4&&m.tiles.every((t,i)=>t===tiles[i]))return m.collision?.[((Math.floor(y/8)&1)*2)+(Math.floor(x/8)&1)]??null;}
 const tile=sc.nt?.[Math.floor(y/8)*32+Math.floor(x/8)];return Number.isInteger(tile)?sc.tileProps?.[tile]??null:null;
}
function safeSlot(project,instance,def,role){
 const c=contextFor(project,instance),body=services.GameplayModel.componentValues(component(def,'Collider'),{executable:true}),x=c.x,y=c.y;
 if(!Number.isInteger(c.width)||!Number.isInteger(c.height)||x<0||y<1||x+body.width>c.width||y+body.height>c.height)return{ok:false,reason:'actor body is outside its authored map'};
 const sx=Math.floor(x/256),sy=Math.floor(y/240),lx=x%256,ly=y%240;
 if(lx+body.width>256||ly+body.height>240)return{ok:false,reason:'actor body crosses a runtime screen edge'};
 if(c.room&&(instance.x+body.width>c.room.w*16||instance.y+body.height>c.room.h*16))return{ok:false,reason:'actor body is outside its authored Room'};
 if(role.kind==='patrol'&&(lx<role.minX||lx>role.maxX))return{ok:false,reason:'patrol slot is outside its authored horizontal bounds'};
 for(let py=Math.floor(y/8)*8;py<y+body.height;py+=8)for(let px=Math.floor(x/8)*8;px<x+body.width;px+=8)if(collisionAt(c,px,py)!==0)return{ok:false,reason:'authored slot intersects collision or has unverified collision data'};
 return{ok:true,key:stable({owner:c.key,screen:[sx,sy],role:role.kind,body,bounds:role.kind==='patrol'?[role.minX,role.maxX]:null}),body,context:c};
}
function relevantIds(project,core){
 if(project.worldRuntime?.enabled){const seen=new Set(),queue=[project.worldRuntime.worldId];while(queue.length){const id=queue.shift();if(seen.has(id))continue;const w=(project.worlds||[]).find(w=>w.id===id);if(!w)fail('Missing reachable World '+id+'.');seen.add(id);for(const m of w.markers||[])if(m.kind!=='spawn'&&m.targetWorldId)queue.push(m.targetWorldId);if(seen.size>64)fail('Reachable World bound exceeded.');}return new Set(core.actorInstances.filter(a=>a.placement.kind==='scene'?a.placement.sceneId===project.worldRuntime.playerSceneId:seen.has(a.placement.worldId)).map(a=>a.id));}
 if(project.gameplay?.mode==='single-room')return new Set(core.actorInstances.filter(a=>a.placement.kind==='scene'&&a.placement.sceneId===project.gameplay.sceneId).map(a=>a.id));
 return new Set();
}
function generate(input,options){
 if(!input||typeof input!=='object'||Array.isArray(input))fail('A canonical project is required.');
 const project=cp(input),seed=normalizedSeed(options.seed??'1'),requested=optionsOf(options),fingerprint=sourceFingerprint(project),changes=[],unavailable=[],warnings=warningsBase.slice(),decisions=[],core=project.gameplayCore;
 const unavailableDomain=(domain,reason,details={})=>unavailable.push({domain,reason,...details});
 if(requested.itemValues)unavailableDomain('itemValues','The current Collectible Pickup stores a boolean collected state; no executable item value field is available.');
 if(requested.enemyParameters||requested.placement){
  if(!core?.enabled){for(const domain of['enemyParameters','placement'])if(requested[domain])unavailableDomain(domain,'Gameplay Core is disabled; no actors or mechanics were invented.');}
  else{
   services.GameplayModel.validateProject(core,project,{references:true,executable:true});
   const relevant=relevantIds(project,core);if(relevant.size>12)fail('Executable actor count exceeds 12.');if(core.persistentVariables.length>64)fail('Persistent variable count exceeds 64.');
   const candidates=[];for(const actor of core.actorInstances){if(!relevant.has(actor.id))continue;const def=core.actorDefinitions.find(d=>d.id===actor.definitionId),behavior=core.behaviors.find(b=>b.id===def.behaviorId),role=roleOf(def,behavior,actor,core);if(role)candidates.push({actor,def,role});}
   if(requested.enemyParameters){let eligible=0;for(const{actor,role}of candidates.filter(c=>c.role.kind==='patrol')){const allowed=Array.from({length:role.speedMax-role.speedMin+1},(_,i)=>i+role.speedMin).filter(v=>v!==role.speed);if(!allowed.length){unavailableDomain('enemyParameters','Patrol speed is fixed by its authored parameter bounds.',{actorId:actor.id});continue;}eligible++;const choice=allowed[Math.floor(random(seed,'speed:'+actor.id)()*allowed.length)];actor.parameterOverrides={...(actor.parameterOverrides||{}),[role.speedParameter]:choice};const change={domain:'enemyParameters',actorId:actor.id,parameter:role.speedParameter,before:role.speed,after:choice};changes.push(change);decisions.push(change);}if(!eligible)unavailableDomain('enemyParameters','No executable canonical patrol has a variable speed range.');}
   if(requested.placement){const groups=new Map();for(const entry of candidates){const slot=safeSlot(project,entry.actor,entry.def,entry.role);if(!slot.ok){unavailableDomain('placement',slot.reason,{actorId:entry.actor.id});continue;}if(!groups.has(slot.key))groups.set(slot.key,[]);groups.get(slot.key).push(entry);}let movable=0;
    for(const[key,group]of groups){const slots=group.map(e=>({x:e.actor.x,y:e.actor.y,sourceActorId:e.actor.id}));if(group.length<2||new Set(slots.map(s=>s.x+','+s.y)).size<2)continue;
     // A permutation preserves the complete occupied footprint set; equal body and
     // role/bounds groups avoid newly introducing collision or switch/door interactions.
     const shuffled=slots.slice(),rng=random(seed,'placement:'+key);for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}if(shuffled.every((s,i)=>s.x===slots[i].x&&s.y===slots[i].y))shuffled.push(shuffled.shift());
     movable+=group.length;group.forEach((entry,i)=>{const actor=entry.actor,to=shuffled[i];if(actor.x===to.x&&actor.y===to.y)return;const change={domain:'placement',actorId:actor.id,role:entry.role.kind,before:{x:actor.x,y:actor.y},after:{x:to.x,y:to.y},sourceSlotActorId:to.sourceActorId};actor.x=to.x;actor.y=to.y;changes.push(change);decisions.push(change);});
    }if(!movable)unavailableDomain('placement','No group has two distinct collision-clear authored slots with matching role, collider, placement owner, runtime screen, and patrol bounds.');
   }
   services.GameplayModel.validateProject(core,project,{references:true,executable:true});
  }
 }
 const recipe={method:VERSION,seed,options:requested,sourceFingerprint:fingerprint,decisions:cp(decisions)};
 return{project,recipe,changes,warnings,unavailable};
}
function replay(project,recipe){if(!recipe||recipe.method!==VERSION||!/^[0-9a-f]{64}$/.test(recipe.sourceFingerprint||''))fail('A versioned gameplay recipe is required.');if(sourceFingerprint(project)!==recipe.sourceFingerprint)fail('Gameplay recipe is stale: source gameplay or map geometry changed.');const result=generate(project,{...recipe.options,seed:recipe.seed});if(stable(result.recipe)!==stable(recipe))fail('Gameplay recipe decisions do not match deterministic regeneration.');return result;}
function vary(project,options={}){if(options.locks?.gameplay){if(!options.previousRecipe)fail('Locking gameplay requires a previous recipe.');return replay(project,options.previousRecipe);}return generate(project,options);}
services.MashupGameplay=Object.freeze({vary,replay,version:1,method:VERSION});
})();
