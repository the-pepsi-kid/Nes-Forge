/* NES Forge 1.6.4 — entity animation bindings and authoring preview. */
(() => {
  'use strict';
  const F = window.Forge164 = window.Forge164 || {}, M = F.model;
  if (!M) throw Error('Entity Studio requires the 1.6.4 model.');
  const $ = id => document.getElementById(id), TAB = 'entity-studio';
  const UI = {
    sceneId:'', entityId:'', stateName:'', facing:'right', tick:0,
    playing:false, boxes:true, labels:true, log:[], notice:'',
    entered:false, frameIndex:-1, total:0, ended:false,
  };
  let raf = 0, stamp = 0, remainder = 0, memo = null, refreshing = false;
  let timelineKey = '', timelineButtons = [], timelineIndex = -2, logKey = null;
  const safe = fn => (...args) => {
    try { return fn(...args); }
    catch (error) { UI.notice=error.message; if(typeof reportError==='function')reportError(error); renderPreview(); return false; }
  };
  const selectedScene = () => S.scenes[S.activeScene] || null;
  const selectedEntity = () => selectedScene()?.entities?.[S.selEntity] || null;
  const bindingStates = e => e?.animationBinding?.states || [];
  const resolve = () => {
    const r=M.resolveEntity(selectedEntity(), UI.stateName || undefined);
    if(!r.error && r.animation?.frames?.length) {
      const frame=M.frameAt(r.animation,UI.tick).frame;
      const art=window.Forge163?.animations?.resolve(frame);
      if(art?.kind==='missing')return {...r,error:art.error};
    }
    return r;
  };
  const option = (value,text) => { const o=document.createElement('option');o.value=String(value);o.textContent=text;return o; };
  function options(el, items, value, empty) {
    el.replaceChildren();
    for (const [key,text] of items) el.appendChild(option(key,text));
    if (!items.length && empty) el.appendChild(option('',empty));
    el.value=String(value || '');
  }
  function setValue(id,value) { const el=$(id);if(document.activeElement!==el)el.value=String(value ?? ''); }
  function pause() {
    UI.playing=false;
    if (raf) cancelAnimationFrame(raf);
    raf=0;stamp=0;remainder=0;
    const button=$('esPlay164');if(button)button.textContent='Play';
    return true;
  }
  function resetPreview(notice='') {
    pause();UI.tick=0;UI.entered=false;UI.log=[];UI.frameIndex=-1;UI.total=0;UI.ended=false;UI.notice=notice;
  }
  function signature(scene,entity,animation) {
    const referenced=(animation?.frames || []).filter(f=>f.metaspriteId).map(f=>
      window.Forge163?.metasprites?.get(f.metaspriteId) || {missing:f.metaspriteId});
    return JSON.stringify([scene?.id,entity?.animationBinding,UI.stateName,animation,referenced,S.scenes.map(sc=>sc.id)]);
  }
  // Re-resolve live objects on every tick. Undo/import can replace objects while
  // retaining IDs, and animation edits can alter a frame without changing its ID.
  function synchronize() {
    M.ensure();
    const scene=selectedScene(),entity=selectedEntity(),sameEntity=memo?.scene===scene&&memo?.entity===entity;
    if (!sameEntity) {
      UI.sceneId=scene?.id || '';UI.entityId=entity?.id || '';
      UI.stateName=entity?.animationBinding?.defaultState || bindingStates(entity)[0]?.state || '';
      UI.facing=entity?.animationBinding?.facing === 'left' ? 'left' : 'right';
      resetPreview();
    } else if (!bindingStates(entity).some(s=>s.state===UI.stateName)) {
      UI.stateName=entity?.animationBinding?.defaultState || bindingStates(entity)[0]?.state || '';
    }
    const facing=entity?.animationBinding?.facing || 'right';
    if (sameEntity && memo?.bindingFacing!==facing) UI.facing=facing;
    const r=resolve(), sig=signature(scene,entity,r.animation);
    if (sameEntity && memo && (memo.animation!==r.animation || memo.signature!==sig))
      resetPreview('Selection or frame data changed. Preview restarted.');
    memo={scene,entity,animation:r.animation,signature:sig,bindingFacing:facing};
    if (UI.playing && (S.tab!==TAB || document.hidden || r.error || !r.animation?.frames?.length)) pause();
    return r;
  }
  function appendEvents(animation,from,to) {
    const entries=M.eventsBetween(animation,from,to);
    for (const entry of entries) {
      const e=entry.event;
      UI.log.push({tick:entry.tick,frameIndex:entry.frameIndex,cycle:entry.cycle,type:e.type,name:e.name || '',value:e.value || '',id:e.id});
    }
    if (UI.log.length>200) UI.log.splice(0,UI.log.length-200);
  }
  function enterInitial(animation) {
    if (UI.entered) return;
    appendEvents(animation,UI.tick===0?-1:UI.tick-1,UI.tick);
    UI.entered=true;
  }
  function advance(ticks=1) {
    if (!Number.isSafeInteger(ticks) || ticks<0) throw Error('Preview ticks must be a nonnegative safe integer.');
    const wasPlaying=UI.playing,r=synchronize(),a=r.animation;
    if(wasPlaying && !UI.playing){renderPreview();return false;}
    if (r.error || !a?.frames?.length || S.tab!==TAB || document.hidden) { pause();renderPreview();return false; }
    if (!Number.isSafeInteger(UI.tick+ticks)) throw Error('Preview tick range exceeded. Restart the preview.');
    enterInitial(a);
    const before=UI.tick, sample=M.frameAt(a,before+ticks);
    UI.tick=a.loop===false ? Math.min(before+ticks,sample.total) : before+ticks;
    appendEvents(a,before,UI.tick);
    UI.ended=sample.ended;
    if (sample.ended) pause();
    renderPreview();return true;
  }
  function onFrame(now) {
    raf=0;
    if (!UI.playing) return;
    const a=synchronize();
    if (!UI.playing || a.error) return;
    const elapsed=Math.max(0,now-stamp);stamp=now;
    remainder+=elapsed*60/1000;
    const ticks=Math.floor(remainder+1e-8);remainder-=ticks;
    if (ticks) {
      try { advance(ticks); }
      catch(error) { pause();UI.notice=error.message;renderPreview();return; }
    }
    if (UI.playing) raf=requestAnimationFrame(onFrame);
  }
  function play() {
    const r=synchronize(),a=r.animation;
    if (r.error || !a?.frames?.length || S.tab!==TAB || document.hidden) {renderPreview();return false;}
    if (UI.playing) return true;
    if (M.frameAt(a,UI.tick).ended) {UI.tick=0;UI.log=[];UI.entered=false;}
    enterInitial(a);UI.playing=true;UI.notice='';stamp=performance.now();remainder=0;
    raf=requestAnimationFrame(onFrame);renderPreview();return true;
  }
  function restart() {
    const wasPlaying=UI.playing;resetPreview();synchronize();
    if(wasPlaying)return play();renderPreview();return true;
  }
  function step(ticks=1) {pause();return advance(ticks);}
  function scrub(tick) {
    pause();const r=synchronize(),a=r.animation;
    if(r.error || !a?.frames?.length)return false;
    if(!Number.isSafeInteger(tick)||tick<0)throw Error('Choose a nonnegative whole preview tick.');
    const total=M.frameAt(a,0).total;
    UI.tick=Math.min(tick,Math.max(0,total-1));UI.entered=true;UI.log=[];UI.ended=false;
    UI.notice='Scrubbed to a pose. Playback logs events at subsequent frame entries.';
    renderPreview();return true;
  }
  function setPreviewFacing(facing) {
    if(!['left','right'].includes(facing))throw Error('Preview facing must be left or right.');
    UI.facing=facing;renderPreview();return true;
  }
  function selectState(name) {
    if(!bindingStates(selectedEntity()).some(s=>s.state===name))return false;
    resetPreview();UI.stateName=name;memo=null; // Preserve the chosen state across synchronization below.
    const scene=selectedScene(),entity=selectedEntity();
    memo={scene,entity,animation:null,signature:'',bindingFacing:entity?.animationBinding?.facing||'right'};
    refresh();return true;
  }
  function assign(state,animationId) {
    const entity=selectedEntity();if(!entity)throw Error('Place or select an entity first.');
    M.assignState(entity,state,animationId);UI.stateName=state;resetPreview();refresh();return true;
  }
  function remove(state) {
    const entity=selectedEntity();if(!entity)return false;
    M.removeState(entity,state);refresh();return true;
  }
  function setBinding(key,value) {
    const entity=selectedEntity();if(!entity)return false;
    M.setBinding(entity,key,value);refresh();return true;
  }
  function open(sceneId,entityId) {
    pause();M.ensure();
    if(sceneId!=null) {
      const index=S.scenes.findIndex(sc=>sc.id===sceneId);
      if(index<0)throw Error('Entity scene no longer exists.');
      if(index!==S.activeScene)switchScene(index);
    }
    const scene=selectedScene();
    if(entityId!=null) {
      const index=(scene?.entities || []).findIndex(e=>e.id===entityId);
      if(index<0)throw Error('Entity no longer exists in this scene.');
      S.selEntity=index;
    }
    switchTab(TAB);refresh();return selectedEntity();
  }
  function addEntity(type,x=128,y=120) {
    if(!(S.entityTypes||[]).some(t=>t.id===type))throw Error('Select an available entity type.');
    if(!Number.isInteger(x)||x<0||x>255||!Number.isInteger(y)||y<0||y>239)throw Error('Entity position must be X 0–255 and Y 0–239 in whole pixels.');
    pause();const previous=S.entPlaceTool;
    try {S.entPlaceTool=type;if(!ent_place(x,y))return false;M.ensure();}
    finally {S.entPlaceTool=previous;ent_buildToolbar();}
    notify('entityStudioPlace');refresh();return selectedEntity();
  }
  function placeInScene() {
    const type=$('esEntityType164').value;
    if(!(S.entityTypes||[]).some(t=>t.id===type))return false;
    pause();switchTab('scene');S.entPlaceTool=type;ent_buildToolbar();showToast('Click the scene to place '+type+'. Open Entity Studio from its properties.');return true;
  }
  const style=document.createElement('style');
  style.textContent=`
#esWorkspace164{display:none;flex-direction:column;gap:12px;width:100%;max-width:1180px;padding:12px;min-width:280px;box-sizing:border-box;color:#d1d9e9;font:12px 'Courier New',monospace}
#sideEntityStudio164{padding:12px;font:11px 'Courier New',monospace;color:#d1d9e9;overflow-wrap:anywhere}
.es-head164{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.es-head164 h2{font-size:17px;letter-spacing:1px;margin:0 0 7px;color:#9ad9ff}.es-note164{font-size:11px;line-height:1.65;color:#95a6bd}.es-tag164{color:#79c29f;border:1px solid #325e4f;padding:5px 8px;font-size:10px;white-space:nowrap}
.es-toolbar164,.es-actions164{display:flex;flex-wrap:wrap;align-items:center;gap:7px}.es-toolbar164{padding:9px;background:#141e2c;border:1px solid #2c3d54;border-radius:4px}.es-toolbar164 label{display:flex;align-items:center;gap:5px;font-size:11px}
#esWorkspace164 button,#sideEntityStudio164 button{background:#1d2c40;color:#d4e0f1;border:1px solid #405671;border-radius:3px;padding:7px 9px;font:11px 'Courier New',monospace;cursor:pointer;min-height:32px}
#esWorkspace164 button:hover,#sideEntityStudio164 button:hover{background:#2a415c;border-color:#71a7cf}#esWorkspace164 button:disabled,#sideEntityStudio164 button:disabled{opacity:.45;cursor:default}
#esWorkspace164 input,#esWorkspace164 select,#sideEntityStudio164 input,#sideEntityStudio164 select{min-width:0;max-width:100%;background:#121b28;color:#d4e0f1;border:1px solid #3a4d65;border-radius:3px;padding:6px;font:11px 'Courier New',monospace;box-sizing:border-box}#esWorkspace164 input[type=checkbox]{accent-color:#6bcffa}
.es-stage164{background:#0a111d;border:1px solid #2c3d54;border-radius:4px;display:flex;align-items:center;justify-content:center;min-height:260px;overflow:hidden}#esCanvas164{display:block;width:100%;max-width:800px;height:auto;image-rendering:pixelated;touch-action:manipulation}
.es-status164{font-size:11px;line-height:1.7;color:#a9bbd1;min-height:19px}.es-status164.error{color:#f6aea6}.es-timeline164{display:flex;gap:5px;overflow:auto;padding:3px 0 7px}.es-timeline164 button{min-width:80px;white-space:nowrap;text-align:left}.es-timeline164 button.selected{background:#28475c!important;border-color:#72d5ff!important}.es-timeline164 small{display:block;margin-top:4px;color:#a6b5c8}
.es-scrub164{display:flex;align-items:center;gap:9px;font-size:11px}.es-scrub164 input{flex:1;padding:0!important;accent-color:#6bcffa}
.es-row164{display:grid;grid-template-columns:85px minmax(0,1fr);gap:7px;align-items:center;margin:8px 0}.es-row164>label{font-size:11px;color:#a5b2c4}.es-pair164{display:grid;grid-template-columns:1fr 1fr;gap:6px}.es-section164{border-top:1px solid #2c3d54;margin-top:15px;padding-top:12px}.es-section164 h3{font-size:12px;color:#a4cef0;margin:0 0 9px}.es-binding164{padding:9px 0;border-bottom:1px solid #26354a}.es-binding-top164{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px}.es-binding-top164 strong{color:#a3d1ec}.es-binding164 select{width:100%}.es-empty164{border:1px dashed #42617f;border-radius:4px;padding:12px;background:#141f2e;font-size:11px;line-height:1.7;color:#a8bdd4}.es-legend164{display:flex;flex-wrap:wrap;gap:12px;font-size:10px;color:#94a9c3}.es-hit164{color:#ff767d}.es-hurt164{color:#67dcad}.es-log164{padding:9px 12px;max-height:170px;overflow:auto;margin:0;list-style:none;background:#0e1622;border:1px solid #2b3b51;border-radius:4px}.es-log164 li{font-size:11px;line-height:1.7;white-space:pre-wrap;overflow-wrap:anywhere}.es-log-title164{display:flex;justify-content:space-between;align-items:center;margin-bottom:7px}.es-log-title164 h3{font-size:12px;margin:0;color:#a5c9e7}
@media(max-width:720px){#esWorkspace164{padding:3px;gap:9px}.es-head164{flex-wrap:wrap}.es-tag164{display:none}.es-toolbar164{gap:6px;padding:6px}.es-stage164{min-height:210px}.es-toolbar164 label{font-size:10px}}
`;
  document.head.appendChild(style);
  const tab=document.createElement('button');tab.className='tab';tab.dataset.view=TAB;tab.textContent='ENTITY STUDIO';tab.onclick=()=>switchTab(TAB);tab.oncontextmenu=e=>tabCtx(e,TAB);
  const animTab=document.querySelector('[data-view="anim"]');if(animTab)animTab.after(tab);else $('tabBar').appendChild(tab);
  const workspace=document.createElement('div');workspace.id='esWorkspace164';workspace.innerHTML=`
<div class="es-head164"><div><h2>ENTITY STUDIO</h2><div class="es-note164">Bind reusable animations to scene characters and objects, then inspect each pose.</div></div><span class="es-tag164">1.6.4 · ANIMATION + ENTITY BINDING</span></div>
<div class="es-toolbar164"><label>State <select id="esPreviewState164" aria-label="Preview animation state"></select></label><button id="esPlay164">Play</button><button id="esRestart164">Restart</button><button id="esStep164" title="Advance one 1/60-second tick">Tick +1</button><label>Facing <select id="esPreviewFacing164" aria-label="Preview facing"><option value="right">Right</option><option value="left">Left</option></select></label><label><input type="checkbox" id="esBoxes164" checked> Boxes</label><label><input type="checkbox" id="esLabels164" checked> Labels</label></div>
<div class="es-stage164"><canvas id="esCanvas164" width="800" height="400" aria-label="Entity animation preview, origin cross, hitboxes and hurtboxes"></canvas></div>
<div class="es-legend164"><span class="es-hit164">Red · hitboxes</span><span class="es-hurt164">Green · hurtboxes</span><span>Cyan cross · entity origin</span><span>Facing mirrors art and boxes around that origin.</span></div>
<div id="esAiPathPanel" style="display:none;border:1px solid #34485f;background:#101c2d;padding:9px;border-radius:4px"><strong>ENEMY WAYPOINTS — WORLD-COORDINATE STRIP</strong><p class="es-note164">Scroll across screens. Click to place a waypoint or drag an existing point to move it. This is a path editor, not a rendered level preview.</p><div style="max-width:100%;overflow-x:auto;overflow-y:hidden"><canvas id="esAiPathCanvas" width="1280" height="182" style="display:block;cursor:crosshair;background:#10182a"></canvas></div><div class="es-note164" id="esAiPathStatus">No path yet.</div></div><div id="esStatus164" class="es-status164" role="status"></div>
<div class="es-scrub164"><label for="esScrub164">Timeline</label><input id="esScrub164" type="range" min="0" max="0" value="0" step="1"><span id="esTick164">0 / 0 ticks</span></div>
<div id="esTimeline164" class="es-timeline164" aria-label="Animation frame timeline"></div>
<div><div class="es-log-title164"><h3>FRAME-ENTRY EVENTS</h3><button id="esClearLog164">Clear log</button></div><ol id="esEventLog164" class="es-log164" aria-label="Frame-entry event preview log"></ol><div class="es-note164">One tick = 1/60 second. Event markers are logged when playback enters a frame. No attack, damage, or sound runs here. Latest 200 entries retained.</div></div>
`;
  $('leftP').appendChild(workspace);
  const side=document.createElement('div');side.id='sideEntityStudio164';side.style.display='none';side.innerHTML=`
<h2>ENTITY BINDINGS</h2><div class="es-row164"><label for="esScene164">Scene</label><select id="esScene164"></select></div><div class="es-row164"><label for="esEntity164">Entity</label><select id="esEntity164"></select></div><div id="esEntitySummary164" class="es-note164"></div><div class="es-actions164"><button id="esSceneEdit164">Edit in scene</button><button id="esAnimationEdit164">Edit animation</button></div>
<div id="esNoEntity164" class="es-empty164">Place an entity below, then assign an animation state such as idle or walk.</div>
<div id="esBindingEditor164"><div class="es-section164"><h3>STATES</h3><div id="esUnbound164" class="es-note164">This entity has no animation binding. Its existing scene properties are preserved.</div><div id="esBindings164"></div><div class="es-row164"><label for="esNewState164">State name</label><input id="esNewState164" value="idle" maxlength="32" placeholder="idle, walk, attack, hurt"></div><div class="es-row164"><label for="esNewAnimation164">Animation</label><select id="esNewAnimation164"></select></div><button id="esAssign164">Assign state</button><div class="es-note164">Use lowercase letters, digits, underscores, or hyphens; start with a letter. Up to 16 states. Reusing a name updates its assignment.</div></div>
<div class="es-section164"><h3>ENTITY DEFAULTS</h3><div class="es-row164"><label for="esDefaultState164">Default state</label><select id="esDefaultState164"></select></div><div class="es-row164"><label for="esDefaultFacing164">Default facing</label><select id="esDefaultFacing164"><option value="right">Right</option><option value="left">Left</option></select></div><div class="es-note164">Defaults are stored on this entity. The preview-facing control above is temporary.</div></div><div class="es-section164" id="esAiSectionBeta"><h3>WORLD ENEMY AI · BETA</h3><div class="es-row164"><label for="esAiBeta">Behavior</label><select id="esAiBeta"><option value="none">None (authoring only)</option><option value="flyingChaser">Flying Chaser (NES runtime)</option></select></div><div id="esAiEditorSettings"><div class="es-note164">NES runtime settings · frame-based · speed is one pixel every N frames. Defaults match the previous beta.</div>
<details id="esAiGuide" style="margin:9px 0;border:1px solid #415775;border-radius:4px;padding:8px;background:#13253a;font-size:11px;line-height:1.7;color:#b7cae3"><summary style="cursor:pointer;color:#a2deff;font-weight:bold">? NES FORGE AI AUTHORING — QUICK GUIDE</summary>
<p><b>Asset chain:</b> CHR SHEET (draw sprite pixels) → METASPRITES (assemble 8×8 pieces) → ANIM (loop frames) → ENTITY STUDIO (bind fly state and Flying Chaser) → WORLD (build the map) → EMULATOR (compile/test).</p>
<ol style="padding-left:18px;margin:7px 0"><li>Select your <b>Enemy</b> in Entity Studio, not the Ghost Player.</li><li>Assign a looping animation to the entity's <b>fly</b> state and choose it as the default.</li><li>Set Behavior to <b>Flying Chaser</b>, then choose speed, detection X/Y, touch X/Y, retreat and hover.</li><li>Under <b>WORLD WAYPOINT PATH</b>, click the path strip above to add points; drag to reposition, or edit the waypoint screen/X/Y fields. Screen index starts at <b>0</b>; each screen is <b>256 pixels</b> wide.</li><li>Choose <b>Loop</b>, <b>Ping-pong</b> or <b>Once / stop</b>, and a waypoint pause in <b>frames</b> (60 ticks ≈ 1 second on NTSC).</li><li><b>Save Project As…</b>, then <b>Build & Run</b>. The Entity Studio animation preview does not simulate AI movement.</li></ol>
<p><b>Behavior:</b> follow patrol path when Ghost is out of range → detect Ghost → chase in X and Y → touch feedback → retreat → recovery → wait for invulnerability and actual contact separation → detect again and resume chase or patrol. The separation phase keeps escaping if the Ghost follows the retreat. Sprite priority alternates between the Ghost and Imp when their combined row budget exceeds eight; this reduces persistent missing strips but flicker may remain. <b>Beta limits:</b> one active Flying Chaser, up to 8 waypoints, one-row smooth World; only contact flash/knockback, not health damage. The optimized 16-screen World uses lossless shared-column data.</p>
<p><b>Project safety:</b> no other entities inherit behavior automatically; Behavior = None leaves it disabled. Preserve your original 16-screen JSON before editing.</p><p><a href="AI_Editor_Tutorial.html" target="_blank" rel="noopener" style="color:#85d6fb">Open the complete offline AI tutorial + cross-tab map</a> (keep this file beside Forge.html).</p></details>
<div class="es-row164"><label for="esAiSpeed">Move every</label><select id="esAiSpeed"><option value="1">1 frame (fast)</option><option value="2">2 frames</option><option value="4">4 frames</option><option value="8">8 frames (slow)</option></select></div>
<div class="es-row164"><label for="esAiDetectX">Detect X</label><input id="esAiDetectX" type="number" min="16" max="120" step="1" aria-label="Detection distance horizontally in pixels"></div>
<div class="es-row164"><label for="esAiDetectY">Detect Y</label><input id="esAiDetectY" type="number" min="16" max="180" step="1" aria-label="Detection distance vertically in pixels"></div>
<div class="es-row164"><label for="esAiTouchX">Touch X</label><input id="esAiTouchX" type="number" min="4" max="24" step="1"></div>
<div class="es-row164"><label for="esAiTouchY">Touch Y</label><input id="esAiTouchY" type="number" min="4" max="24" step="1"></div>
<div class="es-row164"><label for="esAiRetreat">Retreat</label><input id="esAiRetreat" type="number" min="8" max="180" step="1" aria-label="Retreat frames"></div>
<div class="es-row164"><label for="esAiHurt">Invulnerable (frames)</label><input id="esAiHurt" type="number" min="8" max="120" step="1" aria-label="Ghost invulnerability frames; visible blink is limited to the first 12"></div>
<div class="es-row164"><label for="esAiBounce">Bounce Ghost on contact</label><input id="esAiBounce" type="checkbox" aria-label="Enable legacy Ghost upward bounce on Imp contact"></div>
<div class="es-note164">Patch 3: bounce defaults OFF, visual blink lasts at most 12 frames, and Imp must fully disengage before it can hit again.</div>
<div class="es-row164"><label for="esAiHover">Idle hover</label><select id="esAiHover"><option value="8">8 frames</option><option value="16">16 frames</option><option value="32">32 frames</option><option value="64">64 frames</option></select></div>
<div class="es-note164">Detection uses horizontal and vertical distances; touch distances trigger visual contact feedback only. Health and real damage remain future work.</div>
<div class="es-section164"><h3>WORLD WAYPOINT PATH · BETA</h3><div class="es-note164">Optional world-coordinate patrol. Click the path strip in the left panel to add points. Drag points to move them. Enemy patrols when Ghost is outside detection range.</div>
<div class="es-row164"><label for="esAiPathMode">Path mode</label><select id="esAiPathMode"><option value="loop">Loop</option><option value="pingpong">Ping-pong</option><option value="once">Once / stop</option></select></div>
<div class="es-row164"><label for="esAiPathWait">Pause (frames)</label><input id="esAiPathWait" type="number" min="0" max="120" step="1"></div>
<div id="esAiPathList" class="es-note164"></div><button id="esAiAddPoint" type="button">+ Waypoint</button><button id="esAiClearPath" type="button">Clear path</button></div>
<div class="es-note164">Beta restriction: one Flying Chaser per World, 0–8 waypoints, one-row smooth-scrolling Worlds only. Position begins at Enemy Scene X/Y in screen 1.</div></div></div></div>
<div class="es-section164"><h3>PLACE AN ENTITY</h3><div class="es-row164"><label for="esEntityType164">Type</label><select id="esEntityType164"></select></div><div class="es-row164"><label>Scene X / Y</label><div class="es-pair164"><input id="esPlaceX164" type="number" min="0" max="255" step="1" value="128" aria-label="New entity scene X"><input id="esPlaceY164" type="number" min="0" max="239" step="1" value="120" aria-label="New entity scene Y"></div></div><div class="es-actions164"><button id="esAddEntity164">Add at X / Y</button><button id="esPlaceScene164">Place in scene</button></div><div class="es-note164">Bindings belong to these scene entities. The packed viewer supports up to 16 entities per scene; gameplay generation comes later.</div></div>
`;
  $('rightP').appendChild(side);
  const aiDefaults=Object.freeze({speedTicks:2,detectX:112,detectY:96,touchX:12,touchY:14,retreatTicks:52,hurtTicks:42,hoverTicks:16,pathMode:'loop',pathWait:0,contactBounce:false});
  const aiUiFields={speedTicks:'esAiSpeed',detectX:'esAiDetectX',detectY:'esAiDetectY',touchX:'esAiTouchX',touchY:'esAiTouchY',retreatTicks:'esAiRetreat',hurtTicks:'esAiHurt',hoverTicks:'esAiHover',pathMode:'esAiPathMode',pathWait:'esAiPathWait'};
  function aiConfig(ai){return {...aiDefaults,...(ai?.version===1&&!ai?.config?{detectY:160}:{}),...ai?.config};}
  function updateAiConfig(key,value){const entity=selectedEntity();if(entity?.type!=='enemy'||entity.ai?.kind!=='flyingChaser')return;const spec={speedTicks:[1,2,4,8],detectX:[16,120],detectY:[16,180],touchX:[4,24],touchY:[4,24],retreatTicks:[8,180],hurtTicks:[8,120],hoverTicks:[8,16,32,64],pathWait:[0,120]};if(key==='pathMode'){if(!['loop','pingpong','once'].includes(value))throw Error('Unsupported path mode');}else{const limits=spec[key];value=Number(value);if(limits.length===2&&!['speedTicks','hoverTicks'].includes(key)){if(!Number.isInteger(value)||value<limits[0]||value>limits[1])throw Error(key+' outside permitted range '+limits.join('–'));}else if(!limits.includes(value))throw Error('Unsupported '+key+' value');}snapshot();entity.ai.config={...aiConfig(entity.ai),[key]:value};notify('worldEnemyAiConfigChanged');refresh();}
  function updateAiBounce(checked){const entity=selectedEntity();if(entity?.type!=='enemy'||entity.ai?.kind!=='flyingChaser')return;snapshot();entity.ai.config={...aiConfig(entity.ai),contactBounce:!!checked};notify('worldEnemyAiConfigChanged');refresh();}
  function aiWaypoints(entity){return Array.isArray(entity?.ai?.path)?entity.ai.path:[];}
  function changeAiPath(action){const entity=selectedEntity();if(entity?.ai?.kind!=='flyingChaser')return;const points=aiWaypoints(entity).map(p=>({...p}));action(points);if(points.length>8)throw Error('Limit: 8 waypoints per Flying Chaser');snapshot();entity.ai.path=points;notify('worldEnemyAiPathChanged');refresh();}
  function worldScreenCount(){return Math.max(1,Math.min(16,Number(S.worlds?.find(w=>w.id===S.worldRuntime?.worldId)?.widthScreens)||Number(S.worlds?.[0]?.widthScreens)||1));}
  function renderAiPath(entity,cfg){const list=$('esAiPathList');list.replaceChildren();const points=aiWaypoints(entity),maxScreens=worldScreenCount();
    points.forEach((p,i)=>{const row=document.createElement('div');row.className='es-row164';row.style.gridTemplateColumns='26px repeat(3,1fr) 32px';const title=document.createElement('span');title.textContent=String(i+1);row.appendChild(title);for(const [key,min,max] of [['screen',0,maxScreens-1],['x',0,255],['y',20,190]]){const field=document.createElement('input');field.type='number';field.min=String(min);field.max=String(max);field.value=String(p[key]);field.setAttribute('aria-label','Point '+(i+1)+' '+key);field.title=key==='screen'?'Zero-based screen index':key+' pixels';field.onchange=safe(()=>{const v=Number(field.value);if(!Number.isInteger(v)||v<min||v>max)throw Error(key+' must be '+min+'–'+max);changeAiPath(a=>{a[i][key]=v;});});row.appendChild(field);}const del=document.createElement('button');del.type='button';del.textContent='×';del.title='Remove waypoint';del.onclick=safe(()=>changeAiPath(a=>a.splice(i,1)));row.appendChild(del);list.appendChild(row);});
    const canvas=$('esAiPathCanvas'),ctx=canvas.getContext('2d');canvas.width=160*maxScreens;canvas.height=182;ctx.fillStyle='#10182a';ctx.fillRect(0,0,canvas.width,182);ctx.font='11px monospace';ctx.textAlign='left';for(let i=0;i<maxScreens;i++){ctx.fillStyle=i%2?'#18253b':'#121d31';ctx.fillRect(i*160,0,160,182);ctx.strokeStyle='#526b87';ctx.strokeRect(i*160+.5,.5,159,181);ctx.fillStyle='#adc2da';ctx.fillText('SCREEN '+(i+1),i*160+8,14);}ctx.strokeStyle='#314a66';for(const y of [48,96,144]){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(canvas.width,y);ctx.stroke();}const pos=p=>({x:p.screen*160+p.x*160/256,y:Math.max(8,Math.min(174,p.y*0.9))});if(points.length){ctx.strokeStyle='#f3b772';ctx.lineWidth=2;ctx.beginPath();points.forEach((p,i)=>{const a=pos(p);if(i)ctx.lineTo(a.x,a.y);else ctx.moveTo(a.x,a.y);});ctx.stroke();points.forEach((p,i)=>{const a=pos(p);ctx.fillStyle='#f7b66b';ctx.beginPath();ctx.arc(a.x,a.y,8,0,2*Math.PI);ctx.fill();ctx.fillStyle='#1b2334';ctx.font='bold 11px monospace';ctx.fillText(String(i+1),a.x-3,a.y+4);});}const enemyStart=pos({screen:0,x:entity.x,y:entity.y});ctx.strokeStyle='#86e9d8';ctx.lineWidth=2;ctx.beginPath();ctx.arc(enemyStart.x,enemyStart.y,6,0,2*Math.PI);ctx.moveTo(enemyStart.x-8,enemyStart.y);ctx.lineTo(enemyStart.x+8,enemyStart.y);ctx.moveTo(enemyStart.x,enemyStart.y-8);ctx.lineTo(enemyStart.x,enemyStart.y+8);ctx.stroke();$('esAiPathStatus').textContent=points.length+' / 8 waypoints · '+cfg.pathMode+' · '+cfg.pathWait+' pause frames · cyan = enemy start';$('esAiAddPoint').disabled=points.length>=8;
  }
  function canvasWaypoint(e){const c=$('esAiPathCanvas'),r=c.getBoundingClientRect();const x=(e.clientX-r.left)*(c.width/r.width),y=(e.clientY-r.top)*(c.height/r.height);return {screen:Math.max(0,Math.min(worldScreenCount()-1,Math.floor(x/160))),x:Math.max(0,Math.min(255,Math.round((x%160)*256/160))),y:Math.max(20,Math.min(190,Math.round(y/0.9)))};}
  function canvasPointIndex(e){const point=canvasWaypoint(e),x=point.screen*256+point.x;return aiWaypoints(selectedEntity()).findIndex(p=>Math.hypot((p.screen*256+p.x-x)*.625,(p.y-point.y)*.9)<12);}
  let aiDrag=-1;
  $('esAiPathCanvas').addEventListener('pointerdown',e=>{try{const entity=selectedEntity();if(entity?.ai?.kind!=='flyingChaser')return;let index=canvasPointIndex(e);if(index<0){if(aiWaypoints(entity).length>=8)throw Error('Limit: eight waypoints');const point=canvasWaypoint(e);changeAiPath(a=>a.push(point));index=aiWaypoints(entity).length-1;}aiDrag=index;$('esAiPathCanvas').setPointerCapture(e.pointerId);}catch(error){showToast(error.message||String(error));}});
  $('esAiPathCanvas').addEventListener('pointermove',e=>{if(aiDrag<0||!e.buttons)return;try{const point=canvasWaypoint(e);const entity=selectedEntity(),p=aiWaypoints(entity)[aiDrag];if(!p||p.screen===point.screen&&p.x===point.x&&p.y===point.y)return;changeAiPath(a=>{a[aiDrag]=point;});}catch(error){showToast(error.message||String(error));}});
  $('esAiPathCanvas').addEventListener('pointerup',()=>{aiDrag=-1;});$('esAiPathCanvas').addEventListener('pointercancel',()=>{aiDrag=-1;});
  function renderSidebar(r) {
    const scene=selectedScene(),entity=selectedEntity(),states=bindingStates(entity),bindings=$('esBindings164');
    options($('esScene164'),S.scenes.map(sc=>[sc.id,sc.name]),scene?.id,'No scene');
    options($('esEntity164'),(scene?.entities||[]).map((e,i)=>[e.id,'#'+i+' '+(e.name || _et(e.type).name)+' · '+e.x+','+e.y]),entity?.id,'No entity selected');
    $('esEntitySummary164').textContent=entity?(_et(entity.type).name+' · X '+entity.x+' / Y '+entity.y+' · '+(scene?.entities?.length||0)+' scene entities'):((scene?.entities?.length||0)+' scene entities. Choose one or place a new entity.');
    $('esNoEntity164').style.display=entity?'none':'block';$('esBindingEditor164').style.display=entity?'block':'none';
    $('esSceneEdit164').disabled=!scene;$('esAnimationEdit164').disabled=!r.animation;
    $('esUnbound164').style.display=states.length?'none':'block';bindings.replaceChildren();
    for(const state of states) {
      const row=document.createElement('div');row.className='es-binding164';
      const top=document.createElement('div');top.className='es-binding-top164';
      const name=document.createElement('strong');name.textContent=state.state+(state.state===entity.animationBinding.defaultState?' · default':'');
      const del=document.createElement('button');del.textContent='Remove';del.setAttribute('aria-label','Remove '+state.state+' binding');del.onclick=safe(()=>remove(state.state));top.append(name,del);
      const select=document.createElement('select');select.setAttribute('aria-label','Animation for '+state.state);
      const all=S.animations.map(a=>[a.id,a.name]);if(!M.animation(state.animationId))all.unshift([state.animationId,'Missing animation: '+state.animationId]);
      options(select,all,state.animationId,'No animations');select.onchange=safe(()=>assign(state.state,select.value));row.append(top,select);bindings.appendChild(row);
    }
    const previousAnimation=$('esNewAnimation164').value, animations=S.animations.map(a=>[a.id,a.name]);
    options($('esNewAnimation164'),animations,M.animation(previousAnimation)?previousAnimation:animations[0]?.[0],'Create an animation in ANIM');
    options($('esDefaultState164'),states.length?states.map(s=>[s.state,s.state]):[['','None']],entity?.animationBinding?.defaultState || '');
    options($('esPreviewState164'),states.map(s=>[s.state,s.state]),UI.stateName,'No bound state');
    $('esAssign164').disabled=!entity || !S.animations.length;
    $('esDefaultState164').disabled=!entity || !states.length;$('esDefaultFacing164').disabled=!entity || !entity.animationBinding;
    $('esDefaultFacing164').value=entity?.animationBinding?.facing || 'right';
    $('esAiSectionBeta').style.display=entity?.type==='enemy'?'block':'none';$('esAiBeta').value=entity?.ai?.kind==='flyingChaser'?'flyingChaser':'none';
    const aiActive=entity?.type==='enemy'&&entity?.ai?.kind==='flyingChaser';$('esAiEditorSettings').style.display=aiActive?'block':'none';$('esAiPathPanel').style.display=aiActive&&S.tab===TAB?'block':'none';
    if(aiActive){const cfg=aiConfig(entity.ai);for(const [k,id] of Object.entries(aiUiFields))$(id).value=String(cfg[k]);$('esAiBounce').checked=cfg.contactBounce===true;renderAiPath(entity,cfg);}

    const type=$('esEntityType164').value,types=(S.entityTypes||[]).map(t=>[t.id,t.icon+' '+t.name]);
    options($('esEntityType164'),types,types.some(t=>t[0]===type)?type:types[0]?.[0],'No entity types');
    $('esAddEntity164').disabled=!scene || !types.length;$('esPlaceScene164').disabled=!scene || !types.length;
  }
  function renderLog() {
    const key=JSON.stringify(UI.log);if(key===logKey)return;logKey=key;
    const log=$('esEventLog164');log.replaceChildren();
    if(!UI.log.length){const li=document.createElement('li');li.textContent='No entries yet. Play or step an animation with frame events.';li.style.color='#8095ad';log.appendChild(li);}
    for(const entry of UI.log){const li=document.createElement('li');li.textContent='t'+entry.tick+' · frame '+(entry.frameIndex+1)+' · '+entry.type+(entry.name?' · '+entry.name:'')+(entry.value?' = '+entry.value:'');log.appendChild(li);}
    log.scrollTop=log.scrollHeight;
  }
  function renderTimeline(a,sample) {
    const timeline=$('esTimeline164'),key=JSON.stringify([a?.id,(a?.frames||[]).map(f=>[f.duration,f.events?.length||0])]);
    if(key!==timelineKey){
      timelineKey=key;timelineIndex=-2;timelineButtons=[];timeline.replaceChildren();
      let start=0;
      (a?.frames||[]).forEach((frame,index)=>{
        const tick=start;start+=frame.duration;const b=document.createElement('button');b.textContent='Frame '+(index+1);
        const sub=document.createElement('small');sub.textContent=frame.duration+' ticks'+(frame.events?.length?' · '+frame.events.length+' event'+(frame.events.length===1?'':'s'):'');b.appendChild(sub);b.onclick=safe(()=>scrub(tick));timeline.appendChild(b);timelineButtons.push(b);
      });
    }
    if(timelineIndex!==sample.index){timelineIndex=sample.index;timelineButtons.forEach((b,i)=>{b.classList.toggle('selected',i===sample.index);b.setAttribute('aria-pressed',String(i===sample.index));});}
  }
  function renderPreview() {
    const r=resolve(),a=r.animation,c=$('esCanvas164');if(!c)return;
    const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
    ctx.fillStyle='#0d1726';ctx.fillRect(0,0,c.width,c.height);
    ctx.fillStyle='#122033';for(let y=0;y<c.height;y+=32)for(let x=0;x<c.width;x+=32)if(((x/32+y/32)&1)===0)ctx.fillRect(x,y,32,32);
    let error=r.error || (!a?.frames?.length?'No animation frames. Add frames in ANIM.':'');
    // Timing remains meaningful when a frame's art is missing. Keep that frame
    // selected so Edit animation opens the broken source that needs repair.
    const sample=a?.frames?.length?M.frameAt(a,UI.tick):{index:-1,total:0,ended:false};
    if(!error) {
      const b=M.bounds(a,{boxes:UI.boxes});
      // A symmetric viewport preserves a fixed origin while facing changes.
      const extentX=Math.max(12,Math.abs(b.x),Math.abs(b.x+b.w)),minY=Math.min(-8,b.y),maxY=Math.max(8,b.y+b.h);
      let scale=Math.min(8,(c.width-64)/(extentX*2),(c.height-48)/(maxY-minY));if(scale>=1)scale=Math.floor(scale);
      const anchorX=c.width/2,anchorY=(c.height-(maxY-minY)*scale)/2-minY*scale;
      const result=M.drawFrame(ctx,sample.frame,anchorX,anchorY,scale,{facing:UI.facing,boxes:UI.boxes,labels:UI.labels});
      if(result?.kind==='missing'||result?.error)error=result.error || 'The frame artwork is missing. Repair its source in ANIM.';
      ctx.strokeStyle='#68def0';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(anchorX-10,anchorY+.5);ctx.lineTo(anchorX+10,anchorY+.5);ctx.moveTo(anchorX+.5,anchorY-10);ctx.lineTo(anchorX+.5,anchorY+10);ctx.stroke();
    }
    if(error) {
      if(UI.playing)pause();
      ctx.fillStyle='#a7bdd6';ctx.font='15px monospace';ctx.textAlign='center';ctx.fillText(selectedEntity()?'Assign or repair an animation state →':'Select or place an entity →',c.width/2,c.height/2);ctx.textAlign='left';
    }
    UI.frameIndex=sample.index;UI.total=sample.total;UI.ended=!!sample.ended;
    $('esStatus164').textContent=error || (a.name+' · '+UI.stateName+' · frame '+(sample.index+1)+' / '+a.frames.length+' · '+(a.loop===false?'Play once':'Loop')+(sample.ended?' · Finished':'')+(UI.notice?' · '+UI.notice:''));
    $('esStatus164').classList.toggle('error',!!error);
    $('esPlay164').textContent=UI.playing?'Pause':'Play';
    for(const id of ['esPlay164','esRestart164','esStep164','esScrub164'])$(id).disabled=!!error;
    $('esPreviewState164').disabled=!bindingStates(selectedEntity()).length;$('esPreviewFacing164').value=UI.facing;
    $('esScrub164').max=String(Math.max(0,sample.total-1));$('esScrub164').value=String(sample.total?Math.min(UI.tick%sample.total,sample.total-1):0);
    if(sample.ended)$('esScrub164').value=String(Math.max(0,sample.total-1));
    $('esTick164').textContent=(sample.total?(sample.ended?sample.total:UI.tick%sample.total+1):0)+' / '+sample.total+' ticks';
    renderTimeline(error?null:a,sample);renderLog();
  }
  function refresh() {
    if(refreshing)return;
    refreshing=true;
    try{const r=synchronize();renderSidebar(r);if(S.tab===TAB)renderPreview();}
    finally{refreshing=false;}
  }
  $('esScene164').onchange=safe(()=>{const index=S.scenes.findIndex(sc=>sc.id===$('esScene164').value);if(index<0)return;pause();switchScene(index);S.selEntity=(selectedScene()?.entities?.length||0)?0:-1;refresh();});
  $('esEntity164').onchange=safe(()=>{pause();S.selEntity=(selectedScene()?.entities||[]).findIndex(e=>e.id===$('esEntity164').value);refresh();});
  $('esPreviewState164').onchange=safe(()=>selectState($('esPreviewState164').value));
  $('esPreviewFacing164').onchange=safe(()=>setPreviewFacing($('esPreviewFacing164').value));
  $('esPlay164').onclick=safe(()=>{if(UI.playing){pause();renderPreview();return;}play();});
  $('esRestart164').onclick=safe(restart);$('esStep164').onclick=safe(()=>step());
  $('esScrub164').oninput=safe(()=>scrub(Number($('esScrub164').value)));
  $('esBoxes164').onchange=()=>{UI.boxes=$('esBoxes164').checked;renderPreview();};$('esLabels164').onchange=()=>{UI.labels=$('esLabels164').checked;renderPreview();};
  $('esClearLog164').onclick=()=>{UI.log=[];renderLog();};
  $('esAssign164').onclick=safe(()=>assign($('esNewState164').value.trim(),$('esNewAnimation164').value));
  $('esDefaultState164').onchange=safe(()=>setBinding('defaultState',$('esDefaultState164').value));
  $('esDefaultFacing164').onchange=safe(()=>setBinding('facing',$('esDefaultFacing164').value));
  $('esAiBeta').onchange=safe(()=>{const entity=selectedEntity();if(!entity||entity.type!=='enemy')return;snapshot();if($('esAiBeta').value==='flyingChaser')entity.ai={kind:'flyingChaser',version:2,config:{...aiDefaults},path:[]};else delete entity.ai;notify('worldEnemyAiChanged');refresh();});
  for(const [key,id] of Object.entries(aiUiFields))$(id).onchange=safe(()=>updateAiConfig(key,$(id).value));
  $('esAiBounce').onchange=safe(()=>updateAiBounce($('esAiBounce').checked));
  $('esAiAddPoint').onclick=safe(()=>changeAiPath(a=>a.push({screen:0,x:Math.max(8,Math.min(247,(selectedEntity()?.x||128)+a.length*20)),y:Math.max(20,Math.min(190,selectedEntity()?.y||96))})));
  $('esAiClearPath').onclick=safe(()=>changeAiPath(a=>a.splice(0,a.length)));

  $('esAddEntity164').onclick=safe(()=>addEntity($('esEntityType164').value,Number($('esPlaceX164').value),Number($('esPlaceY164').value)));
  $('esPlaceScene164').onclick=safe(placeInScene);
  $('esSceneEdit164').onclick=()=>{pause();S.entPlaceTool=null;switchTab('scene');ent_buildToolbar();ent_buildList();render();};
  $('esAnimationEdit164').onclick=safe(()=>{const a=resolve().animation;if(!a)return;pause();S._selAnim=S.animations.indexOf(a);S._animFrame=Math.max(0,UI.frameIndex);switchTab('anim');anim_updateSidebar();F.frameEditor?.refresh();});
  const priorProps=ent_buildProps;
  ent_buildProps=function(){const result=priorProps();const e=selectedEntity();if(!e)return result;const pp=$('entProps');if(!pp)return result;const b=document.createElement('button');b.id='esOpenFromScene164';b.textContent='Open Entity Studio';b.style.gridColumn='1 / -1';b.onclick=safe(()=>open(selectedScene().id,e.id));pp.appendChild(b);return result;};
  const priorRender=render;
  render=function(){if(S.tab===TAB){refresh();updateStats();return;}return priorRender();};
  const priorSwitch=switchTab;
  switchTab=function(t){
    if(t!==TAB){pause();workspace.style.display='none';side.style.display='none';return priorSwitch(t);}
    if(S.tab!==TAB)priorSwitch('scene');
    scenePainting=false;entityDrag=null;sprDragging=false;clearEmuKeys();aud_stop();anim_stopPreview();S.tab=TAB;
    document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('on',b.dataset.view===TAB));
    for(const el of $('rightP').children)if(el.id?.startsWith('side'))el.style.display=el===side?'block':'none';
    for(const id of ['codeEditorWrap','emuView','disasmView','msWorkspace163'])$(id).style.display='none';
    cv.style.display='none';cv.classList.remove('world-canvas');$('leftP').style.display='flex';$('rightP').style.width='';workspace.style.display='flex';side.style.display='block';refresh();
    try{history.replaceState(null,'',location.href.split('#')[0]+'#'+TAB);}catch(_){}
  };
  const priorHash=getHashView;getHashView=function(){return location.hash==='#'+TAB?TAB:priorHash();};
  document.addEventListener('visibilitychange',()=>{if(document.hidden){pause();if(S.tab===TAB)renderPreview();}});
  window.addEventListener('blur',()=>{if(UI.playing){pause();renderPreview();}});
  F.studio={refresh,open,play,pause,restart,step,scrub,advance,setPreviewFacing,selectState,assign,remove,setBinding,addEntity,state:UI,render:renderPreview};
  refresh();ent_buildProps();
  if(location.hash==='#'+TAB)setTimeout(()=>switchTab(TAB),0);
})();


