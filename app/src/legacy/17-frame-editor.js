/* NES Forge 1.6.4 — per-frame contact areas and ordered frame-entry events. */
(() => {
  'use strict';
  const F = window.Forge164 = window.Forge164 || {}, M = F.model;
  const $ = id => document.getElementById(id);
  const KINDS = ['hitboxes', 'hurtboxes'];
  const TYPES = ['attack_start', 'attack_end', 'footstep', 'sound', 'custom'];
  const COLORS = {hitboxes:'#ff767d', hurtboxes:'#67dcad'};
  const UI = {animationId:'', frameIndex:-1, boxId:'', kind:'hurtboxes', eventId:'', tool:'select', drag:null, view:null, showBoxes:true};
  const nodes = {};
  let forceFields=false;
  const int = (n, lo, hi) => Math.max(lo, Math.min(hi, Math.round(n)));
  const current = () => {
    const animation = S.animations[S._selAnim || 0], frameIndex = S._animFrame || 0;
    return {animation, frameIndex, frame:animation?.frames[frameIndex]};
  };
  const selectedBox = () => current().frame?.[UI.kind]?.find(b => b.id === UI.boxId) || null;
  const selectedEvent = () => current().frame?.events?.find(e => e.id === UI.eventId) || null;
  function el(tag, text, className) {
    const e = document.createElement(tag);
    if (text !== undefined) e.textContent = text;
    if (className) e.className = className;
    return e;
  }
  function button(text, action, title) {
    const e = el('button', text); e.type='button'; e.onclick = () => safe(action);
    if (title) e.title=title;
    return e;
  }
  function option(value, text) { const e=el('option',text); e.value=value; return e; }
  function safe(action) {
    try { const result=action(); refresh(); return result; }
    catch (error) { if (typeof reportError === 'function') reportError(error); else showToast(error.message); forceFields=true; try{refresh();}finally{forceFields=false;} return false; }
  }
  function field(parent, key, label, type='text', min, max) {
    const l=el('label',label), input=el('input'); input.type=type; input.id='fe'+key+'164';
    l.htmlFor=input.id;
    if(min!==undefined) input.min=String(min);
    if(max!==undefined) input.max=String(max);
    if(type==='number') input.step='1';
    parent.append(l,input); nodes[key]=input; return input;
  }
  function syncValue(input, value) {
    // Rendering animation previews must not erase text the user is typing.
    if (forceFields || document.activeElement !== input) input.value=String(value ?? '');
  }
  function updateSelectedBox(patch) {
    const {animation,frameIndex}=current(), b=selectedBox();
    if(!animation || !b) return false;
    return M.updateBox(animation.id,frameIndex,UI.kind,b.id,patch);
  }
  function updateSelectedEvent(patch) {
    const {animation,frameIndex}=current(), e=selectedEvent();
    if(!animation || !e) return false;
    return M.updateEvent(animation.id,frameIndex,e.id,patch);
  }
  function addBox(kind, data={}) {
    const {animation,frameIndex}=current(); if(!animation) return null;
    anim_stopPreview();
    const box=M.addBox(animation.id,frameIndex,kind,data);
    if(box) { UI.kind=kind; UI.boxId=box.id; UI.tool='select'; UI.showBoxes=true; }
    return box;
  }
  function removeBox() {
    const {animation,frameIndex}=current(), b=selectedBox();
    if(!animation || !b) return false;
    return M.removeBox(animation.id,frameIndex,UI.kind,b.id);
  }
  function addEvent(type='custom') {
    const {animation,frameIndex}=current(); if(!animation) return null;
    anim_stopPreview();
    const event=M.addEvent(animation.id,frameIndex,{type});
    if(event) UI.eventId=event.id;
    return event;
  }
  function removeEvent() {
    const {animation,frameIndex}=current(), e=selectedEvent();
    return animation && e ? M.removeEvent(animation.id,frameIndex,e.id) : false;
  }
  function moveEvent(delta) {
    const {animation,frameIndex}=current(), e=selectedEvent();
    return animation && e ? M.moveEvent(animation.id,frameIndex,e.id,delta) : false;
  }
  function setTool(tool) {
    if(!['select','hitboxes','hurtboxes'].includes(tool)) return false;
    cancelDrag(); anim_stopPreview(); UI.tool=tool; if(tool!=='select')UI.showBoxes=true; refresh(); return true;
  }
  function selectBox(kind,id) {
    if(!KINDS.includes(kind) || !current().frame?.[kind]?.some(b=>b.id===id)) return false;
    UI.kind=kind; UI.boxId=id; UI.showBoxes=true; refresh(); return true;
  }
  function selectEvent(id) {
    if(!current().frame?.events?.some(e=>e.id===id)) return false;
    UI.eventId=id; refresh(); return true;
  }
  function ensureControls() {
    if(nodes.root) return;
    const parent=$('animEditor'); if(!parent) return;
    const style=el('style');
    style.textContent='.fe-panel164{margin-top:14px;padding-top:7px;border-top:1px solid var(--bdr);font-size:10px}.fe-panel164 h3{margin:7px 0}.fe-hint164{color:var(--dim);font-size:9px;line-height:1.55;margin:6px 0}.fe-tools164{display:flex;gap:4px;flex-wrap:wrap;margin:6px 0}.fe-tools164 button{font-size:9px;padding:5px 7px}.fe-tools164 button[aria-pressed="true"]{border-color:var(--acc);color:var(--acc)}.fe-fields164{display:grid;grid-template-columns:62px minmax(0,1fr);gap:5px;align-items:center}.fe-fields164 input,.fe-fields164 select,.fe-list164{width:100%;min-width:0;box-sizing:border-box;font:inherit}.fe-list164{margin:4px 0;min-height:65px}.fe-badge164{display:block;font-size:8px;color:#9fd4ff;white-space:nowrap}.fe-heading164{display:flex;align-items:baseline;justify-content:space-between;gap:4px}.fe-count164{font-size:9px;color:var(--dim)}';
    document.head.appendChild(style);
    const root=nodes.root=el('section',undefined,'fe-panel164'); root.id='frameEditor164';
    root.addEventListener('focusin',()=>anim_stopPreview());
    const heading=el('div',undefined,'fe-heading164');
    heading.append(el('h3','Frame contact areas'),nodes.frameLabel=el('span','','fe-count164')); root.appendChild(heading);
    root.appendChild(el('p','Areas are active only on this animation frame. Coordinates are pixels relative to the sprite origin (+). Red = hit / attack; green = hurt / vulnerable.','fe-hint164'));
    const tools=el('div',undefined,'fe-tools164');
    nodes.select=button('Select / move',()=>setTool('select'));
    nodes.drawHit=button('Draw hit',()=>setTool('hitboxes'),'Drag on the main canvas to create a red hitbox.');
    nodes.drawHurt=button('Draw hurt',()=>setTool('hurtboxes'),'Drag on the main canvas to create a green hurtbox.');
    nodes.drawHit.style.color=COLORS.hitboxes; nodes.drawHurt.style.color=COLORS.hurtboxes;
    tools.append(nodes.select,nodes.drawHit,nodes.drawHurt); root.appendChild(tools);
    const tools2=el('div',undefined,'fe-tools164');
    nodes.addHit=button('+ Hit',()=>addBox('hitboxes',{x:0,y:-16,w:16,h:16}));
    nodes.addHurt=button('+ Hurt',()=>addBox('hurtboxes',{x:-8,y:-16,w:16,h:16}));
    tools2.append(nodes.addHit,nodes.addHurt); root.appendChild(tools2);
    const list=nodes.boxList=el('select',undefined,'fe-list164'); list.id='feBoxList164'; list.size=4; list.setAttribute('aria-label','Contact areas on the selected frame');
    list.onchange=()=>{const f=current().frame; for(const kind of KINDS) if(f?.[kind]?.some(b=>b.id===list.value)){selectBox(kind,list.value);break;}};
    root.appendChild(list);
    const fields=el('div',undefined,'fe-fields164');
    field(fields,'BoxName','Name').onchange=e=>safe(()=>updateSelectedBox({name:e.target.value}));
    for(const [key,label,min,max] of [['X','X (px)',-2048,2047],['Y','Y (px)',-2048,2047],['W','Width',1,2048],['H','Height',1,2048]]) {
      field(fields,'Box'+key,label,'number',min,max).onchange=e=>safe(()=>updateSelectedBox({[key.toLowerCase()]:e.target.value===''?NaN:Number(e.target.value)}));
    }
    root.appendChild(fields);
    const row=el('div',undefined,'fe-tools164'); nodes.deleteBox=button('Delete area',removeBox); row.appendChild(nodes.deleteBox);
    const showLabel=el('label'), show=nodes.show=el('input'); show.type='checkbox'; show.checked=true;
    show.onchange=()=>{UI.showBoxes=show.checked; drawCanvas();}; showLabel.append(show,el('span',' Show areas')); row.appendChild(showLabel); root.appendChild(row);
    root.appendChild(el('p','Drag an area to move it; drag its lower-right square to resize. Arrow keys nudge (Shift = 8 px), Delete removes, Escape cancels a drag.','fe-hint164'));
    const eventHeading=el('div',undefined,'fe-heading164'); eventHeading.append(el('h3','Frame-entry events'),nodes.eventCount=el('span','','fe-count164')); root.appendChild(eventHeading);
    root.appendChild(el('p','Events are ordered markers emitted when this frame begins. Entity Studio logs them during preview. They do not apply damage or play sounds yet.','fe-hint164'));
    const eventTools=el('div',undefined,'fe-tools164'), type=nodes.newEventType=el('select'); type.setAttribute('aria-label','New event type');
    TYPES.forEach(t=>type.appendChild(option(t,t.replaceAll('_',' ')))); type.value='custom';
    nodes.addEvent=button('+ Event',()=>addEvent(type.value)); eventTools.append(type,nodes.addEvent); root.appendChild(eventTools);
    const eventList=nodes.eventList=el('select',undefined,'fe-list164'); eventList.id='feEventList164'; eventList.size=4; eventList.setAttribute('aria-label','Ordered events on the selected frame');
    eventList.onchange=()=>selectEvent(eventList.value); root.appendChild(eventList);
    const eventFields=el('div',undefined,'fe-fields164');
    const eventType=nodes.EventType=el('select'); eventType.id='feEventType164'; TYPES.forEach(t=>eventType.appendChild(option(t,t.replaceAll('_',' '))));
    const typeLabel=el('label','Type'); typeLabel.htmlFor=eventType.id; eventFields.append(typeLabel,eventType);
    eventType.onchange=e=>safe(()=>updateSelectedEvent({type:e.target.value}));
    field(eventFields,'EventName','Name').onchange=e=>safe(()=>updateSelectedEvent({name:e.target.value}));
    field(eventFields,'EventValue','Value').onchange=e=>safe(()=>updateSelectedEvent({value:e.target.value})); root.appendChild(eventFields);
    const eventActions=el('div',undefined,'fe-tools164');
    nodes.eventUp=button('↑ Earlier',()=>moveEvent(-1)); nodes.eventDown=button('↓ Later',()=>moveEvent(1)); nodes.deleteEvent=button('Delete event',removeEvent);
    eventActions.append(nodes.eventUp,nodes.eventDown,nodes.deleteEvent); root.appendChild(eventActions);
    root.appendChild(el('p','Up to 16 areas of each kind and 16 events per frame. Names and values support up to 255 UTF-8 bytes. Duplicating a frame copies these areas and events.','fe-hint164'));
    parent.appendChild(root);
  }
  function syncSelection() {
    const {animation,frame,frameIndex}=current();
    // Undo/load can replace the live frame while retaining animation ID/index.
    // A drag belongs to its original object and must never survive that restore.
    if(UI.drag && UI.drag.frame!==frame) cancelDrag();
    if(UI.animationId!==animation?.id || UI.frameIndex!==frameIndex) {
      cancelDrag(); UI.animationId=animation?.id||''; UI.frameIndex=frameIndex;
      UI.boxId=''; UI.eventId='';
    }
    if(!frame) return;
    if(!selectedBox()) {
      const kind=KINDS.find(k=>frame[k]?.length) || UI.kind;
      UI.kind=kind; UI.boxId=frame[kind]?.[0]?.id || '';
    }
    if(!selectedEvent()) UI.eventId=frame.events?.[0]?.id || '';
  }
  function refreshControls() {
    ensureControls(); if(!nodes.root) return;
    const {animation,frame,frameIndex}=current(); nodes.root.style.display=frame?'block':'none'; if(!frame) return;
    nodes.show.checked=UI.showBoxes;
    nodes.frameLabel.textContent='Frame '+(frameIndex+1)+' / '+animation.frames.length;
    for(const [node,tool] of [[nodes.select,'select'],[nodes.drawHit,'hitboxes'],[nodes.drawHurt,'hurtboxes']]) node.setAttribute('aria-pressed',String(UI.tool===tool));
    nodes.boxList.replaceChildren();
    for(const kind of KINDS) for(const b of frame[kind]||[]) {
      const o=option(b.id,(kind==='hitboxes'?'HIT':'HURT')+' · '+(b.name||'Unnamed')+' · '+b.w+'×'+b.h+' @ '+b.x+','+b.y); o.style.color=COLORS[kind]; nodes.boxList.appendChild(o);
    }
    if(!nodes.boxList.children.length) nodes.boxList.appendChild(option('','No areas on this frame'));
    nodes.boxList.value=UI.boxId; nodes.boxList.disabled=!UI.boxId;
    const box=selectedBox();
    for(const [key,prop] of [['BoxName','name'],['BoxX','x'],['BoxY','y'],['BoxW','w'],['BoxH','h']]) {syncValue(nodes[key],box?.[prop]);nodes[key].disabled=!box;}
    nodes.deleteBox.disabled=!box;
    nodes.addHit.disabled=(frame.hitboxes||[]).length>=16; nodes.addHurt.disabled=(frame.hurtboxes||[]).length>=16;
    nodes.drawHit.disabled=nodes.addHit.disabled; nodes.drawHurt.disabled=nodes.addHurt.disabled;
    const events=frame.events||[]; nodes.eventList.replaceChildren();
    events.forEach((e,i)=>nodes.eventList.appendChild(option(e.id,(i+1)+'. '+e.type.replaceAll('_',' ')+(e.name?' · '+e.name:''))));
    if(!events.length) nodes.eventList.appendChild(option('','No entry events on this frame'));
    nodes.eventList.value=UI.eventId; nodes.eventList.disabled=!events.length;
    nodes.eventCount.textContent=events.length+' / 16'; nodes.addEvent.disabled=events.length>=16;
    const event=selectedEvent(), ei=events.indexOf(event);
    for(const [key,prop] of [['EventType','type'],['EventName','name'],['EventValue','value']]) {syncValue(nodes[key],event?.[prop]);nodes[key].disabled=!event;}
    nodes.deleteEvent.disabled=!event; nodes.eventUp.disabled=ei<=0; nodes.eventDown.disabled=ei<0 || ei>=events.length-1;
  }
  function makeView(animation, width=256,height=240) {
    const b=M.bounds(animation,{boxes:true});
    // Keep the anchor visible even when all authored art lies on one side of it.
    const x=Math.min(b.x,-4), y=Math.min(b.y,-4), right=Math.max(b.x+b.w,4), bottom=Math.max(b.y+b.h,4);
    let scale=Math.min(8,(width-40)/Math.max(1,right-x),(height-48)/Math.max(1,bottom-y));
    if(scale>=1) scale=Math.floor(scale);
    return {scale,anchorX:(width-(right-x)*scale)/2-x*scale,anchorY:(height-(bottom-y)*scale)/2-y*scale,width,height};
  }
  function pointFromCanvas(x,y,view=UI.view) {
    return view?{x:Math.floor((x-view.anchorX)/view.scale),y:Math.floor((y-view.anchorY)/view.scale)}:{x:0,y:0};
  }
  function eventPoint(event) {
    const canvas=$('cv'), r=canvas.getBoundingClientRect();
    return pointFromCanvas((event.clientX-r.left)*canvas.width/r.width,(event.clientY-r.top)*canvas.height/r.height);
  }
  function previewFrame(frame) {
    const d=UI.drag;
    if(!d || !d.box) return frame;
    const boxes=(frame[d.kind]||[]).map(b=>b.id===d.boxId?d.box:b);
    if(d.mode==='create') boxes.push(d.box);
    return {...frame,[d.kind]:boxes};
  }
  function drawCanvas() {
    if(S.tab!=='anim') return;
    const {animation,frame}=current(), canvas=$('cv'); if(!canvas || !frame || !animation) return;
    canvas.width=256; canvas.height=240; canvas.style.cursor=UI.tool==='select'?'default':'crosshair';
    const view=UI.drag?.view || makeView(animation,canvas.width,canvas.height); UI.view=view;
    const ctx=canvas.getContext('2d'), {scale,anchorX,anchorY}=view;
    ctx.imageSmoothingEnabled=false; ctx.fillStyle='#08080c'; ctx.fillRect(0,0,256,240);
    if(scale>=1) {
      ctx.beginPath(); ctx.lineWidth=1; ctx.strokeStyle='#171c28';
      const unit=8*scale;
      for(let x=((anchorX%unit)+unit)%unit;x<256;x+=unit){ctx.moveTo(Math.round(x)+.5,16);ctx.lineTo(Math.round(x)+.5,223);}
      for(let y=((anchorY%unit)+unit)%unit;y<223;y+=unit){ctx.moveTo(0,Math.round(y)+.5);ctx.lineTo(256,Math.round(y)+.5);}
      ctx.stroke();
    }
    M.drawFrame(ctx,previewFrame(frame),anchorX,anchorY,scale,{facing:'right',boxes:UI.showBoxes,labels:false});
    ctx.strokeStyle='#a1b0ca';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(anchorX-5,anchorY);ctx.lineTo(anchorX+5,anchorY);ctx.moveTo(anchorX,anchorY-5);ctx.lineTo(anchorX,anchorY+5);ctx.stroke();
    const box=UI.drag?.box || selectedBox();
    if(box && UI.showBoxes) {
      const x=anchorX+box.x*scale, y=anchorY+box.y*scale, w=box.w*scale, h=box.h*scale;
      ctx.strokeStyle=COLORS[UI.drag?.kind||UI.kind];ctx.lineWidth=2;ctx.strokeRect(x,y,w,h);
      ctx.fillStyle='#ffffff';ctx.fillRect(x+w-3,y+h-3,6,6);
    }
    ctx.fillStyle='#08080ce6';ctx.fillRect(0,0,256,16);ctx.fillRect(0,224,256,16);
    ctx.fillStyle='#aeb9ce';ctx.font='9px monospace';ctx.fillText(UI.tool==='select'?'AREAS · drag to move / corner to resize':('DRAW '+(UI.tool==='hitboxes'?'HIT':'HURT')+' · drag on canvas'),5,11);
    ctx.fillText('Origin +  ·  '+(scale>=1?scale+'×':scale.toFixed(2)+'×')+'  ·  '+(frame.events||[]).length+' entry events',5,235);
  }
  function hitBox(at) {
    if(!UI.showBoxes) return null;
    const frame=current().frame; if(!frame) return null;
    const all=KINDS.flatMap(kind=>(frame[kind]||[]).map(box=>({kind,box})));
    // Selected boxes get first claim, including the handle just outside the area.
    const selected=all.find(x=>x.kind===UI.kind && x.box.id===UI.boxId);
    const ordered=selected?[selected,...all.reverse().filter(x=>x!==selected)]:all.reverse();
    const tol=Math.max(.5,4/(UI.view?.scale||1));
    for(const hit of ordered) {
      const b=hit.box;
      if(Math.abs(at.x-(b.x+b.w))<=tol && Math.abs(at.y-(b.y+b.h))<=tol) return {...hit,mode:'resize'};
      if(at.x>=b.x && at.x<b.x+b.w && at.y>=b.y && at.y<b.y+b.h) return {...hit,mode:'move'};
    }
    return null;
  }
  function rectangle(start,end) {
    const sx=int(start.x,-2048,2047), sy=int(start.y,-2048,2047), ex=int(end.x,-2048,2047), ey=int(end.y,-2048,2047);
    return {x:Math.min(sx,ex),y:Math.min(sy,ey),w:int(Math.abs(ex-sx)+1,1,2048),h:int(Math.abs(ey-sy)+1,1,2048)};
  }
  function beginDrag(at,pointerId=0) {
    const {animation,frameIndex,frame}=current(); if(!frame || !animation) return false;
    anim_stopPreview();
    const start={x:int(at.x,-2048,2047),y:int(at.y,-2048,2047)};
    let data;
    if(UI.tool!=='select') {
      if((frame[UI.tool]||[]).length>=16) {showToast('This frame already has 16 '+UI.tool+'.');return false;}
      data={kind:UI.tool,mode:'create',boxId:'',box:{id:'__preview164',name:'New area',...rectangle(start,start)}};
    } else {
      const hit=hitBox(at); if(!hit) return false;
      UI.kind=hit.kind;UI.boxId=hit.box.id;
      data={kind:hit.kind,mode:hit.mode,boxId:hit.box.id,box:{...hit.box},original:{...hit.box}};
    }
    UI.drag={...data,start,pointerId,animationId:animation.id,frameIndex,frame,view:UI.view||makeView(animation),changed:false};
    refreshControls();drawCanvas();return true;
  }
  function updateDrag(at) {
    const d=UI.drag; if(!d) return false;
    const c=current();
    if(c.animation?.id!==d.animationId || c.frameIndex!==d.frameIndex || c.frame!==d.frame) {cancelDrag();return false;}
    const dx=Math.round(at.x-d.start.x),dy=Math.round(at.y-d.start.y);
    if(d.mode==='create') Object.assign(d.box,rectangle(d.start,at));
    else if(d.mode==='resize') Object.assign(d.box,{w:int(d.original.w+dx,1,2048),h:int(d.original.h+dy,1,2048)});
    else Object.assign(d.box,{x:int(d.original.x+dx,-2048,2047),y:int(d.original.y+dy,-2048,2047)});
    d.changed=d.mode==='create' || ['x','y','w','h'].some(k=>d.box[k]!==d.original[k]);
    drawCanvas();return true;
  }
  function finishDrag() {
    const d=UI.drag; if(!d) return false; UI.drag=null;
    const c=current();
    if(c.animation?.id!==d.animationId || c.frameIndex!==d.frameIndex || c.frame!==d.frame) {refresh();return false;}
    if(d.mode==='create') {
      const {x,y,w,h}=d.box; addBox(d.kind,{x,y,w,h});
    } else if(d.changed) {
      const {x,y,w,h}=d.box; M.updateBox(d.animationId,d.frameIndex,d.kind,d.boxId,{x,y,w,h});
    }
    refresh();return d.mode==='create' || d.changed;
  }
  function cancelDrag() { const had=!!UI.drag; UI.drag=null; if(had) drawCanvas(); return had; }
  function refresh() {
    M.ensure();syncSelection();refreshControls();drawCanvas();
  }
  const previousSidebar=anim_updateSidebar;
  anim_updateSidebar=function() {
    const result=previousSidebar();refresh();
    const {animation}=current(), tl=$('animTimeline');
    if(tl && animation) Array.from(tl.children).forEach((item,index)=>{
      const f=animation.frames[index];if(!f)return;
      const h=f.hitboxes?.length||0,u=f.hurtboxes?.length||0,e=f.events?.length||0;
      if(h||u||e) item.appendChild(el('span',h+'H '+u+'U '+e+'E','fe-badge164'));
      item.title=(item.title||'')+' · '+h+' hit, '+u+' hurt, '+e+' entry events';
    });
    return result;
  };
  const canvas=$('cv');
  canvas.tabIndex=0;
  canvas.addEventListener('pointerdown',e=>{
    if(S.tab!=='anim' || e.button!==0) return;
    canvas.focus();
    if(safe(()=>beginDrag(eventPoint(e),e.pointerId))) { e.preventDefault();canvas.setPointerCapture(e.pointerId); }
  });
  canvas.addEventListener('pointermove',e=>{ if(UI.drag?.pointerId===e.pointerId) updateDrag(eventPoint(e)); });
  canvas.addEventListener('pointerup',e=>{
    if(UI.drag?.pointerId!==e.pointerId)return;
    e.preventDefault();safe(()=>{updateDrag(eventPoint(e));return finishDrag();});
    try{canvas.releasePointerCapture(e.pointerId);}catch(_){}
  });
  canvas.addEventListener('pointercancel',e=>{if(UI.drag?.pointerId===e.pointerId){cancelDrag();refresh();}});
  canvas.addEventListener('lostpointercapture',e=>{if(UI.drag?.pointerId===e.pointerId){cancelDrag();refresh();}});
  canvas.addEventListener('keydown',e=>{
    if(S.tab!=='anim') return;
    if(e.key==='Escape') {e.preventDefault();cancelDrag();UI.tool='select';refresh();return;}
    if(UI.drag) return;
    const steps={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]},d=steps[e.key],b=selectedBox();
    if(!b)return;
    if(d) {e.preventDefault();e.stopPropagation();const n=e.shiftKey?8:1;safe(()=>updateSelectedBox({x:int(b.x+d[0]*n,-2048,2047),y:int(b.y+d[1]*n,-2048,2047)}));}
    else if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();e.stopPropagation();safe(removeBox);}
  });
  F.frameEditor={refresh,current,selectedBox,selectedEvent,addBox,updateSelectedBox,removeBox,addEvent,updateSelectedEvent,removeEvent,moveEvent,selectBox,selectEvent,setTool,makeView,pointFromCanvas,rectangle,beginDrag,updateDrag,finishDrag,cancelDrag,drawCanvas,state:UI};
  ensureControls();refresh();
})();


