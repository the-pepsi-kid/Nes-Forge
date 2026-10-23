/* NES Forge 1.6.3 — composed animation frames. Preview timing stays in the
 * existing anim_playPreview/anim_stopPreview implementation. */
(() => {
  'use strict';
  const api = window.Forge163 = window.Forge163 || {};
  const byId = id => document.getElementById(id);
  const selectedFrame = () => S.animations[S._selAnim]?.frames[S._animFrame];
  const library = () => Array.isArray(S.metasprites) ? S.metasprites : [];
  const isComposed = frame => typeof frame?.metaspriteId === 'string' && !!frame.metaspriteId;

  function resolve(frame) {
    if (!frame) return {kind:'missing', error:'No animation frame selected.'};
    if (isComposed(frame)) {
      const metasprite = api.metasprites?.get(frame.metaspriteId);
      if (!metasprite) return {kind:'missing', error:'Missing metasprite: '+frame.metaspriteId};
      const scene = S.scenes.find(sc => sc.id === metasprite.sceneId);
      if (!scene) return {kind:'missing', error:'Missing source scene for '+metasprite.name};
      return {kind:'metasprite', metasprite, scene};
    }
    const scene = frame.sceneId ? S.scenes.find(sc => sc.id === frame.sceneId) : S.scenes[S.activeScene];
    if (!scene) return {kind:'missing', error:'Missing legacy tile source scene: '+frame.sceneId};
    // The active scene has live edits which may not yet be copied into scenes[].
    const source = scene === S.scenes[S.activeScene] ? S : scene;
    return {kind:'tile', scene, tile:source.sprChr?.[clamp(frame.tileIdx,0,255)], palette:source.sprPal?.[0]};
  }

  function frameBounds(frame) {
    const r = resolve(frame);
    if (r.kind !== 'metasprite') return {x:-4,y:-4,w:8,h:8};
    // Coordinates are relative to the reusable frame's explicitly authored origin.
    const m = r.metasprite, pieces = m.pieces || [];
    if (!pieces.length) return {x:-4,y:-4,w:8,h:8};
    const x = Math.min(...pieces.map(p => p.x)) - m.originX;
    const y = Math.min(...pieces.map(p => p.y)) - m.originY;
    const right = Math.max(...pieces.map(p => p.x + 8)) - m.originX;
    const bottom = Math.max(...pieces.map(p => p.y + (m.spriteMode === 16 ? 16 : 8))) - m.originY;
    return {x,y,w:Math.max(1,right-x),h:Math.max(1,bottom-y)};
  }

  function animationBounds(anim) {
    const bounds = (anim?.frames || []).map(frameBounds);
    if (!bounds.length) return {x:-4,y:-4,w:8,h:8};
    const x = Math.min(...bounds.map(b => b.x));
    const y = Math.min(...bounds.map(b => b.y));
    return {x,y,w:Math.max(...bounds.map(b => b.x+b.w))-x,h:Math.max(...bounds.map(b => b.y+b.h))-y};
  }

  function drawFrame(ctx, frame, anchorX, anchorY, scale) {
    const r = resolve(frame);
    if (r.kind === 'metasprite') {
      api.metasprites.draw(ctx,r.metasprite,anchorX,anchorY,scale);
      return r;
    }
    if (r.kind !== 'tile' || !r.tile || !r.palette) return r;
    for (let y=0;y<8;y++) for (let x=0;x<8;x++) {
      const color = r.tile[y]?.[x] || 0;
      if (!color) continue;
      const rgb = NP[r.palette[color]] || [0,0,0];
      ctx.fillStyle = 'rgb('+rgb.join(',')+')';
      ctx.fillRect(anchorX+(x-4)*scale,anchorY+(y-4)*scale,scale,scale);
    }
    return r;
  }

  function paintPreview(canvas, frame, bounds, maxScale, padding=3) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#08080c';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    let scale = Math.min(maxScale,(canvas.width-padding*2)/Math.max(1,bounds.w),(canvas.height-padding*2)/Math.max(1,bounds.h));
    if (scale>=1) scale=Math.floor(scale);
    const x = Math.floor((canvas.width-bounds.w*scale)/2)-bounds.x*scale;
    const y = Math.floor((canvas.height-bounds.h*scale)/2)-bounds.y*scale;
    const r = drawFrame(ctx,frame,x,y,scale);
    if (r.kind==='missing') {
      ctx.strokeStyle='#ff7b72';ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(6,6);ctx.lineTo(canvas.width-6,canvas.height-6);
      ctx.moveTo(canvas.width-6,6);ctx.lineTo(6,canvas.height-6);ctx.stroke();
    }
    return r;
  }

  function setMetasprite(id) {
    const frame = selectedFrame();
    if (!frame || !api.metasprites?.get(id)) return false;
    if (frame.metaspriteId === id) return true;
    snapshot();
    frame.metaspriteId = id;
    notify('animationMetasprite');
    return true;
  }

  function setFrameSource(kind,id) {
    const frame = selectedFrame();
    if (!frame) return false;
    if (kind === 'metasprite') {
      const target = id || (api.metasprites?.get(frame.metaspriteId) ? frame.metaspriteId : library()[0]?.id);
      if (!target || !api.metasprites?.get(target)) {
        showToast('Create a metasprite in the composer first.');
        anim_updateSidebar();
        return false;
      }
      return setMetasprite(target);
    }
    if (kind !== 'tile') return false;
    if (!isComposed(frame)) return true;
    snapshot();
    delete frame.metaspriteId;
    notify('animationTileSource');
    return true;
  }

  function ensureControls() {
    const props = byId('frameProps');
    if (!props || byId('frameSource163')) return;
    const sourceLabel = document.createElement('label');sourceLabel.textContent='Frame source';sourceLabel.htmlFor='frameSource163';
    const source = document.createElement('select');source.id='frameSource163';
    for (const [value,text] of [['tile','Legacy tile'],['metasprite','Metasprite']]) {
      const o=document.createElement('option');o.value=value;o.textContent=text;source.appendChild(o);
    }
    source.onchange = () => setFrameSource(source.value);
    const metaLabel = document.createElement('label');metaLabel.id='frameMetaspriteLabel163';metaLabel.textContent='Metasprite';metaLabel.htmlFor='frameMetasprite163';
    const meta = document.createElement('select');meta.id='frameMetasprite163';meta.onchange=()=>setMetasprite(meta.value);
    const note = document.createElement('div');note.id='frameSourceNote163';note.style.cssText='grid-column:1 / -1;font-size:8px;line-height:1.5;color:var(--dim);overflow-wrap:anywhere';
    props.prepend(sourceLabel,source,metaLabel,meta);
    props.appendChild(note);
  }

  function refreshControls(frame) {
    ensureControls();
    const source=byId('frameSource163'), select=byId('frameMetasprite163');
    if (!source || !select || !frame) return;
    const composed=isComposed(frame);
    source.value=composed?'metasprite':'tile';
    select.replaceChildren();
    if (composed && !api.metasprites?.get(frame.metaspriteId)) {
      const o=document.createElement('option');o.value=frame.metaspriteId;o.textContent='Missing: '+frame.metaspriteId;select.appendChild(o);
    }
    for (const m of library()) {
      const o=document.createElement('option');o.value=m.id;o.textContent=m.name;select.appendChild(o);
    }
    if (!select.options.length) {
      const o=document.createElement('option');o.value='';o.textContent='Create a metasprite first';select.appendChild(o);
    }
    if (composed) select.value=frame.metaspriteId;
    select.disabled=!composed;
    byId('frameTile').disabled=composed;
    byId('frameTile').title=composed?'Legacy tile index is retained when you switch frame sources.':'';
    const r=resolve(frame), note=byId('frameSourceNote163');
    note.textContent=r.kind==='missing'?r.error:r.kind==='metasprite'
      ?r.metasprite.pieces.length+' pieces · '+r.scene.name+' · shared origin across the animation'
      :'Tile from '+r.scene.name+(frame.sceneId?' (stored source)':' (active scene)');
    note.style.color=r.kind==='missing'?'#ff7b72':'var(--dim)';
  }

  const previousSidebar = anim_updateSidebar;
  anim_updateSidebar = function() {
    const result=previousSidebar();
    const anim=S.animations[S._selAnim], frame=selectedFrame();
    if (!anim || !frame) return result;
    refreshControls(frame);
    const bounds=animationBounds(anim), timeline=byId('animTimeline');
    if (timeline) {
      timeline.replaceChildren();
      anim.frames.forEach((f,index)=>{
        const item=document.createElement('div');
        item.className='anim-frame'+(index===S._animFrame?' sel':'');
        item.onclick=()=>anim_selectFrame(index);
        const cv=document.createElement('canvas');cv.width=32;cv.height=32;
        const r=paintPreview(cv,f,bounds,4,2);
        const label=document.createElement('span');
        label.textContent=isComposed(f)?'MS':'$'+clamp(f.tileIdx,0,255).toString(16).toUpperCase().padStart(2,'0');
        const duration=document.createElement('span');duration.textContent=f.duration+'f';
        item.title=r.kind==='missing'?r.error:r.kind==='metasprite'?r.metasprite.name:'Legacy tile '+clamp(f.tileIdx,0,255);
        item.append(cv,label,document.createElement('br'),duration);timeline.appendChild(item);
      });
    }
    paintPreview(byId('animPreviewCv'),frame,bounds,8);
    return result;
  };

  renderAnim = function() {
    const cv=byId('cv');cv.width=256;cv.height=240;
    const anim=S.animations[S._selAnim||0], frame=anim?.frames[S._animFrame||0];
    if (anim && frame) {
      paintPreview(cv,frame,animationBounds(anim),8,18);
    } else {
      const ctx=cv.getContext('2d');ctx.fillStyle='#08080c';ctx.fillRect(0,0,256,240);
      ctx.fillStyle='#778';ctx.font='11px Courier New';
      ctx.fillText('No animations defined.',54,116);
      ctx.fillText('Add one in the sidebar.',51,132);
    }
    anim_updateSidebar();
  };

  api.animations={resolve,frameBounds,animationBounds,drawFrame,paintPreview,setFrameSource,setMetasprite,selectedFrame};
})();


