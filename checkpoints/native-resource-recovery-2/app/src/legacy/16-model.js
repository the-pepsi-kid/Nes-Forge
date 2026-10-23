/* NES Forge 1.6.4 — animation contacts, entry events, and entity bindings. */
(()=>{
'use strict';
const F=window.Forge164=window.Forge164||{},cp=v=>JSON.parse(JSON.stringify(v));
let serial=0;
const uid=p=>p+'_'+Date.now().toString(36)+'_'+(++serial).toString(36)+'_'+Math.random().toString(36).slice(2,7);
const EVENT_TYPES=['attack_start','attack_end','footstep','sound','custom'];
const BOX_KINDS=['hitboxes','hurtboxes'];
const stateName=s=>typeof s==='string'&&/^[a-z][a-z0-9_-]{0,31}$/.test(s);
function text(v,label,empty=true){if(typeof v!=='string'||(!empty&&!v)||new TextEncoder().encode(v).length>255)throw Error(label+' must be '+(empty?'':'nonempty ')+'text of at most 255 UTF-8 bytes');}
function integer(v,lo,hi,label){if(!Number.isInteger(v)||v<lo||v>hi)throw Error(label+' must be an integer from '+lo+' through '+hi);}
function object(v,label){if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Invalid '+label);}
function ensure(){
  for(const a of S.animations||[]){
    if(a.id===undefined)a.id=uid('anim');
    for(const f of a.frames||[]){
      for(const kind of [...BOX_KINDS,'events'])if(f[kind]===undefined)f[kind]=[];
      for(const kind of BOX_KINDS)for(const b of f[kind]||[])if(b.id===undefined)b.id=uid('box');
      for(const e of f.events||[])if(e.id===undefined)e.id=uid('event');
    }
  }
  for(const sc of S.scenes||[])for(const e of sc.entities||[])if(e.id===undefined)e.id=uid('ent');
  return S;
}
const animation=id=>(S.animations||[]).find(a=>a.id===id)||null;
const entity=(sceneId,entityId)=>S.scenes.find(s=>s.id===sceneId)?.entities?.find(e=>e.id===entityId)||null;
const selectedEntity=()=>S.scenes[S.activeScene]?.entities?.[S.selEntity]||null;
function validateBox(b){object(b,'contact box');text(b.id,'Box ID',false);text(b.name,'Box name');integer(b.x,-2048,2047,'Box X');integer(b.y,-2048,2047,'Box Y');integer(b.w,1,2048,'Box width');integer(b.h,1,2048,'Box height');}
function validateEvent(e){object(e,'frame event');text(e.id,'Event ID',false);if(!EVENT_TYPES.includes(e.type))throw Error('Unknown frame event type');text(e.name,'Event name');text(e.value,'Event value');}
function validateFrame(f){
  object(f,'animation frame');const ids=new Set();
  for(const kind of BOX_KINDS){const list=f[kind]===undefined?[]:f[kind];if(!Array.isArray(list)||list.length>16)throw Error(kind+' must contain at most 16 boxes per frame');for(const b of list){validateBox(b);if(ids.has(b.id))throw Error('Duplicate box ID within animation frame');ids.add(b.id);}}
  const events=f.events===undefined?[]:f.events;if(!Array.isArray(events)||events.length>16)throw Error('At most 16 events are supported per animation frame');const eventIds=new Set();for(const e of events){validateEvent(e);if(eventIds.has(e.id))throw Error('Duplicate event ID within animation frame');eventIds.add(e.id);}
  return true;
}
function validateBinding(binding,animations,{references=false}={}){
  object(binding,'entity animation binding');if(!['left','right'].includes(binding.facing))throw Error('Binding facing must be left or right');
  if(!Array.isArray(binding.states)||binding.states.length>16)throw Error('Entity binding supports at most 16 states');
  const names=new Set(),ids=new Set(animations.map(a=>a.id));
  for(const entry of binding.states){object(entry,'bound state');if(!stateName(entry.state))throw Error('State names use lowercase letters, digits, _ or -, starting with a letter (up to 32 characters)');if(names.has(entry.state))throw Error('Duplicate entity animation state');names.add(entry.state);text(entry.animationId,'Bound animation ID',false);if(references&&!ids.has(entry.animationId))throw Error('State "'+entry.state+'" references a missing animation');}
  if(typeof binding.defaultState!=='string'||(binding.defaultState&&!names.has(binding.defaultState)))throw Error('Default state must be one of the entity binding states');
  if(binding.states.length&&!binding.defaultState)throw Error('Select a default state for this entity binding');
  return true;
}
function validateProject(raw,{references=false,build=false}={}){
  object(raw,'project');const animations=raw.animations||[],scenes=raw.scenes||[];
  if(raw.version>=7||build)Forge163.persistence.validate(raw.metasprites||[],animations,scenes,{references,rom:build});
  const animationIds=new Set(),entityIds=new Set();
  for(const a of animations){if(raw.version>=7||a.id!=null){text(a.id,'Animation ID',false);if(animationIds.has(a.id))throw Error('Duplicate animation ID');animationIds.add(a.id);}for(const f of a.frames||[])validateFrame(f);}
  for(const sc of scenes)for(const e of sc.entities||[]){
    if(raw.version>=7||e.id!=null){text(e.id,'Entity ID',false);if(entityIds.has(e.id))throw Error('Duplicate entity ID across scenes');entityIds.add(e.id);}
    if(e.animationBinding!==undefined)validateBinding(e.animationBinding,animations,{references});
  }
  return true;
}
function requireEntity(e){if(!e||!S.scenes.some(s=>(s.entities||[]).includes(e)))throw Error('Entity no longer exists in the project');return e;}
function defaultBinding(){return {defaultState:'',facing:'right',states:[]};}
function applyBinding(e,next,reason){requireEntity(e);validateBinding(next,S.animations,{references:false});if(JSON.stringify(e.animationBinding)===JSON.stringify(next))return false;snapshot();e.animationBinding=next;notify(reason);return true;}
function assignState(e,state,animationId){
  ensure();requireEntity(e);if(!stateName(state))throw Error('Invalid animation state name');if(!animation(animationId))throw Error('Cannot assign a missing animation');
  const b=cp(e.animationBinding||defaultBinding()),entry=b.states.find(x=>x.state===state);if(entry)entry.animationId=animationId;else b.states.push({state,animationId});if(!b.defaultState)b.defaultState=state;
  return applyBinding(e,b,'entityAnimationAssign');
}
function removeState(e,state){requireEntity(e);if(!e.animationBinding?.states.some(s=>s.state===state))return false;const b=cp(e.animationBinding);b.states=b.states.filter(s=>s.state!==state);if(b.defaultState===state)b.defaultState=b.states[0]?.state||'';return applyBinding(e,b,'entityAnimationRemove');}
function setBinding(e,key,value){requireEntity(e);if(!['defaultState','facing'].includes(key))throw Error('Unknown binding property');const b=cp(e.animationBinding||defaultBinding());b[key]=value;return applyBinding(e,b,'entityAnimationProperty');}
function frameFor(id,index){const a=animation(id);if(!a)throw Error('Animation no longer exists');integer(index,0,a.frames.length-1,'Animation frame');return a.frames[index];}
function kindCheck(kind){if(!BOX_KINDS.includes(kind))throw Error('Contact kind must be hitboxes or hurtboxes');}
function changeFrame(frame,next,reason){validateFrame(next);if(JSON.stringify(frame)===JSON.stringify(next))return false;snapshot();for(const k of [...BOX_KINDS,'events']){const prior=new Map((frame[k]||[]).map(item=>[item.id,item]));const values=(next[k]||[]).map(item=>{const live=prior.get(item.id);if(live){Object.assign(live,item);return live;}return item;});if(Array.isArray(frame[k]))frame[k].splice(0,frame[k].length,...values);else frame[k]=values;}notify(reason);return true;}
function addBox(id,index,kind,data={}){
  ensure();kindCheck(kind);const frame=frameFor(id,index),next=cp(frame),box={id:uid('box'),name:kind==='hitboxes'?'Attack':'Body',x:-6,y:-16,w:12,h:16,...data};
  next[kind].push(box);changeFrame(frame,next,'animationBoxAdd');return frame[kind].find(b=>b.id===box.id);
}
function updateBox(id,index,kind,boxId,patch){kindCheck(kind);const frame=frameFor(id,index),next=cp(frame),box=(next[kind]||[]).find(b=>b.id===boxId);if(!box)return false;for(const k of Object.keys(patch)){if(!['name','x','y','w','h'].includes(k))throw Error('Unknown contact box property');box[k]=patch[k];}return changeFrame(frame,next,'animationBoxEdit');}
function removeBox(id,index,kind,boxId){kindCheck(kind);const frame=frameFor(id,index),next=cp(frame);next[kind]=(next[kind]||[]).filter(b=>b.id!==boxId);return changeFrame(frame,next,'animationBoxRemove');}
function addEvent(id,index,data={}){ensure();const frame=frameFor(id,index),next=cp(frame),event={id:uid('event'),type:'custom',name:'Marker',value:'',...data};next.events.push(event);changeFrame(frame,next,'animationEventAdd');return frame.events.find(e=>e.id===event.id);}
function updateEvent(id,index,eventId,patch){const frame=frameFor(id,index),next=cp(frame),e=(next.events||[]).find(e=>e.id===eventId);if(!e)return false;for(const k of Object.keys(patch)){if(!['type','name','value'].includes(k))throw Error('Unknown frame event property');e[k]=patch[k];}return changeFrame(frame,next,'animationEventEdit');}
function removeEvent(id,index,eventId){const frame=frameFor(id,index),next=cp(frame);next.events=(next.events||[]).filter(e=>e.id!==eventId);return changeFrame(frame,next,'animationEventRemove');}
function moveEvent(id,index,eventId,delta){integer(delta,-1,1,'Event movement');const frame=frameFor(id,index),next=cp(frame),i=(next.events||[]).findIndex(e=>e.id===eventId),j=i+delta;if(i<0||j<0||j>=next.events.length||i===j)return false;[next.events[i],next.events[j]]=[next.events[j],next.events[i]];return changeFrame(frame,next,'animationEventOrder');}
function frameAt(a,tick,loop=a?.loop!==false){
  if(!a?.frames?.length)return {index:-1,frame:null,localTick:0,cycle:0,ended:true,total:0};
  if(!Number.isSafeInteger(tick)||tick<0)throw Error('Preview tick must be a nonnegative safe integer');
  const durations=a.frames.map(f=>{integer(f.duration,1,255,'Animation duration');return f.duration;}),total=durations.reduce((n,v)=>n+v,0),ended=!loop&&tick>=total,cycle=loop?Math.floor(tick/total):0;
  let local=loop?tick%total:Math.min(tick,total-1),index=0;
  while(index<durations.length-1&&local>=durations[index]){local-=durations[index];index++;}
  return {index,frame:a.frames[index],localTick:local,cycle,ended,total};
}
function eventsBetween(a,fromTick,toTick,loop=a?.loop!==false){
  if(!Number.isSafeInteger(fromTick)||fromTick< -1||!Number.isSafeInteger(toTick)||toTick<0||toTick<fromTick)throw Error('Invalid event preview tick interval');
  const sample=frameAt(a,toTick,loop);if(!sample.frame||toTick===fromTick)return [];
  const total=sample.total,firstCycle=loop?Math.floor(Math.max(0,fromTick)/total):0,lastCycle=loop?Math.floor(toTick/total):0;
  if(lastCycle-firstCycle>4096)throw Error('Preview interval is too large; restart or scrub without dispatching events');
  const result=[];
  for(let cycle=firstCycle;cycle<=lastCycle;cycle++){
    let boundary=cycle*total;
    for(let i=0;i<a.frames.length;i++){
      if(boundary>toTick)break;
      if(boundary>fromTick)for(const event of a.frames[i].events||[]){result.push({event,frameIndex:i,cycle,tick:boundary});if(result.length>4096)throw Error('Too many preview events in one update');}
      boundary+=a.frames[i].duration;
    }
  }
  return result;
}
function bounds(a,{boxes=true}={}){
  const regions=(a?.frames||[]).flatMap(frame=>{const art=Forge163.animations.frameBounds(frame),out=[art];if(boxes)for(const kind of BOX_KINDS)out.push(...(frame[kind]||[]));return out;});
  if(!regions.length)return {x:-8,y:-16,w:16,h:16};
  const x=Math.min(...regions.map(b=>b.x)),y=Math.min(...regions.map(b=>b.y));
  return {x,y,w:Math.max(1,Math.max(...regions.map(b=>b.x+b.w))-x),h:Math.max(1,Math.max(...regions.map(b=>b.y+b.h))-y)};
}
function drawFrame(ctx,frame,anchorX,anchorY,scale,{facing='right',boxes=true,labels=false}={}){
  const left=facing==='left',target=left?{
    set fillStyle(v){ctx.fillStyle=v;},get fillStyle(){return ctx.fillStyle;},
    set imageSmoothingEnabled(v){ctx.imageSmoothingEnabled=v;},
    fillRect(x,y,w,h){ctx.fillRect(2*anchorX-x-w,y,w,h);}
  }:ctx;
  const resolved=Forge163.animations.drawFrame(target,frame,anchorX,anchorY,scale);
  if(boxes&&frame)for(const kind of BOX_KINDS)for(const b of frame[kind]||[]){
    const x=anchorX+(left?-b.x-b.w:b.x)*scale,y=anchorY+b.y*scale,w=b.w*scale,h=b.h*scale;
    ctx.fillStyle=kind==='hitboxes'?'rgba(255,118,125,.16)':'rgba(103,220,173,.14)';ctx.fillRect(x,y,w,h);
    ctx.strokeStyle=kind==='hitboxes'?'#ff767d':'#67dcad';ctx.lineWidth=1;ctx.strokeRect(x,y,w,h);
    if(labels){ctx.fillStyle=ctx.strokeStyle;ctx.font='10px monospace';ctx.fillText(b.name||kind,x+2,y-3);}
  }
  return resolved;
}
function resolveEntity(e,state){
  const binding=e?.animationBinding;if(!e)return {animation:null,state:'',binding:null,error:'Select an entity.'};
  if(!binding?.states?.length)return {animation:null,state:'',binding:binding||null,error:'Assign an animation to an entity state.'};
  const selected=state??binding.defaultState,entry=binding.states.find(s=>s.state===selected);
  if(!entry)return {animation:null,state:selected,binding,error:'State "'+selected+'" is not assigned.'};
  const a=animation(entry.animationId);return {animation:a,state:selected,binding,error:a?null:'Animation for "'+selected+'" is missing. Reassign this state.'};
}
F.model={schemaVersion:7,uid,ensure,animation,entity,selectedEntity,validateProject,validateBinding,validateFrame,validateBox,validateEvent,assignState,removeState,setBinding,addBox,updateBox,removeBox,addEvent,updateEvent,removeEvent,moveEvent,frameAt,eventsBetween,bounds,drawFrame,resolveEntity,eventTypes:EVENT_TYPES,boxKinds:BOX_KINDS};
// Generate IDs before a snapshot can refer to them, then preserve them forever.
const previousProject=projectData;projectData=function(){ensure();return previousProject();};
const previousAnimAdd=anim_add;anim_add=function(){const result=previousAnimAdd();ensure();F.studio?.refresh();return result;};
anim_addFrame=function(){ensure();const a=S.animations[S._selAnim];if(!a)return;const frame=cp(a.frames[S._animFrame]||{tileIdx:0,duration:8,hitboxes:[],hurtboxes:[],events:[]});for(const kind of BOX_KINDS)for(const b of frame[kind]||[])b.id=uid('box');for(const e of frame.events||[])e.id=uid('event');snapshot();a.frames.splice(S._animFrame+1,0,frame);S._animFrame++;notify('frameAdd');};
const previousPlace=ent_place;ent_place=function(x,y){const result=previousPlace(x,y);ensure();return result;};
const previousDup=dupScene;dupScene=function(){const before=S.scenes.length,result=previousDup();if(S.scenes.length>before){for(const e of S.scenes[S.activeScene].entities||[])e.id=uid('ent');F.studio?.refresh();}return result;};
ensure();
})();


