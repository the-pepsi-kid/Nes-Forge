/* DigiGhosts / NES Forge — Non-destructive Metasprite Scale Copies (beta)
 * Work is performed against the canonical sprite-CHR, metasprite and animation
 * assets, in a single Undo transaction. Generated tiles remain ordinary editable
 * 2-bit CHR tiles; NES hardware does not scale sprites at runtime.
 */
(()=>{
'use strict';
const api = window.ForgeMetaspriteScale = {};
const $ = id => document.getElementById(id);
const SCALE = {'half':0.5,'twoThirds':2/3,'oneHalf':1.5,'double':2};
const clone = x => JSON.parse(JSON.stringify(x));
const emptyTile = () => Array.from({length:8},()=>Array(8).fill(0));
const tileKey = tile => tile.map(row=>row.join('')).join('');
const isEmpty = tile => !tile || tile.every(row=>row.every(c=>!c));
const uniqueId = prefix => prefix+'_scaled_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,9);
function uniqueName(base, names){let name=base,n=2;while(names.has(name)){name=base+' '+n++;}names.add(name);return name;}
function getSource(frame){const sc=window.Forge163?.metasprites?.source(frame);if(!sc || !Array.isArray(sc.sprChr))throw Error('Missing sprite CHR source for '+frame.name);return sc;}
function getBounds(frame){const ps=frame.pieces||[];if(!ps.length)throw Error('Cannot scale an empty frame: '+frame.name);
 const h=frame.spriteMode===16?16:8;
 const x=Math.min(...ps.map(p=>p.x)),y=Math.min(...ps.map(p=>p.y));
 const w=Math.max(...ps.map(p=>p.x+8))-x,hh=Math.max(...ps.map(p=>p.y+h))-y;
 if(w>256||hh>256)throw Error('Frame '+frame.name+' exceeds the 256×256 pixel scaling workspace.');
 return {x,y,w,h:hh};
}
function rasterize(frame, source){
 const box=getBounds(frame),raster=new Uint8Array(box.w*box.h),h=frame.spriteMode===16?16:8;
 // Respect the existing first-opaque-sprite-wins OAM compositor.
 for(const p of frame.pieces){
  for(let iy=0;iy<h;iy++)for(let ix=0;ix<8;ix++){
   const px=p.x-box.x+ix,py=p.y-box.y+iy;
   if(px<0||px>=box.w||py<0||py>=box.h)continue;
   const at=py*box.w+px;if(raster[at])continue;
   const fx=p.flipH?7-ix:ix,fy=p.flipV?h-1-iy:iy;
   const tile=source.sprChr[fy<8?p.tile:p.tile2];
   const ci=tile?.[fy%8]?.[fx]||0;
   if(ci)raster[at]=(ci&3)|((p.pal&3)<<2)|(p.behind?16:0);
  }
 }
 return {box,raster};
}
function makePool(sceneId){
 const sc=S.scenes.find(s=>s.id===sceneId);
 if(!sc)throw Error('Missing scene '+sceneId);
 const src=sc===S.scenes[S.activeScene]?S.sprChr:sc.sprChr;
 if(!Array.isArray(src)||src.length!==256)throw Error('This beta requires one 256-tile sprite CHR bank per source scene.');
 const reserved=new Set([0]);
 for(const m of S.metasprites||[])if(m.sceneId===sceneId)for(const p of m.pieces||[]){reserved.add(p.tile);if(m.spriteMode===16)reserved.add(p.tile2);}
 for(const p of (sc===S.scenes[S.activeScene]?S.oam:sc.oam)||[]){reserved.add(p.tile);if(p.height===16)reserved.add(p.tile2??((p.tile+1)&255));}
 for(const a of S.animations||[])for(const f of a.frames||[])if(f.tileIdx!=null && !f.metaspriteId)reserved.add(f.tileIdx);
 const free=[];const byKey=new Map();
 for(let i=0;i<256;i++){
  if(isEmpty(src[i])){if(!reserved.has(i))free.push(i);}
  else {const key=tileKey(src[i]);if(!byKey.has(key))byKey.set(key,i);}
 }
 return {sceneId,free,byKey,newTiles:[]};
}
function useTile(pool,tile){
 const key=tileKey(tile);
 if(pool.byKey.has(key))return pool.byKey.get(key);
 if(!pool.free.length)throw Error('Sprite CHR capacity exceeded in scene: '+S.scenes.find(s=>s.id===pool.sceneId)?.name+'. Try a smaller size or remove unused sprite tiles. Nothing was changed.');
 const id=pool.free.shift();pool.byKey.set(key,id);pool.newTiles.push({id,tile});return id;
}
function scaleOne(frame,factor,pool,frameNames){
 const {box,raster}=rasterize(frame,getSource(frame));
 const w=Math.round(box.w*factor),h=Math.round(box.h*factor);
 if(!w||!h||w>256||h>256)throw Error('Scaled frame would be outside 1–256 pixels.');
 const out={id:uniqueId('ms'),name:uniqueName(frame.name+' ('+(factor===2/3?'0.667':factor)+'×)',frameNames),sceneId:frame.sceneId,spriteMode:8,
 originX:Math.round((frame.originX-box.x)*factor),originY:Math.round((frame.originY-box.y)*factor),pieces:[]};
 // Resample color *indices*, never RGB; no colors are introduced.
 // Split destination tiles by sprite palette and behind-background flag.
 for(let ty=0;ty<h;ty+=8)for(let tx=0;tx<w;tx+=8){
  const tiles=new Map();
  for(let iy=0;iy<8&&ty+iy<h;iy++)for(let ix=0;ix<8&&tx+ix<w;ix++){
   const sy=Math.min(box.h-1,Math.floor((ty+iy)/factor));
   const sx=Math.min(box.w-1,Math.floor((tx+ix)/factor));
   const value=raster[sy*box.w+sx];if(!value)continue;
   const pal=(value>>2)&3,behind=!!(value&16),key=(pal<<1)|(behind?1:0);
   if(!tiles.has(key))tiles.set(key,emptyTile());
   tiles.get(key)[iy][ix]=value&3;
  }
  for(const [key,tile] of tiles){
   const ti=useTile(pool,tile);
   out.pieces.push({id:uniqueId('mp'),tile:ti,tile2:(ti+1)&255,x:tx,y:ty,pal:(key>>1),flipH:false,flipV:false,behind:!!(key&1)});
  }
 }
 if(out.pieces.length>64)throw Error('Scaled frame '+frame.name+' needs '+out.pieces.length+' sprite pieces; NES hardware permits only 64. Nothing was changed.');
 if(out.pieces.length>128)throw Error('Metasprite editor piece limit exceeded.');
 return {frame:out,size:{w,h},source:frame.name};
}
function prepare(frameIds,factor,animationId=''){
 if(![0.5,2/3,1.5,2].includes(factor))throw Error('Select 0.5×, ⅔×, 1.5× or 2×.');
 const existing=window.Forge163?.metasprites;if(!existing)throw Error('Metasprite editor is not loaded.');
 const frames=frameIds.map(id=>{const f=existing.get(id);if(!f)throw Error('Missing metasprite '+id);return f;});
 if(S.metasprites.length+frames.length>256)throw Error('Frame library limit (256) exceeded. Nothing was changed.');
 const pools=new Map(),frameNames=new Set(S.metasprites.map(f=>f.name)),made=[],map=new Map();
 for(const f of frames){
  if(!pools.has(f.sceneId))pools.set(f.sceneId,makePool(f.sceneId));
  const result=scaleOne(f,factor,pools.get(f.sceneId),frameNames);made.push(result);map.set(f.id,result.frame.id);
 }
 let animation=null;
 if(animationId){
  const original=S.animations.find(a=>a.id===animationId);if(!original)throw Error('Animation not found.');
  if((original.frames||[]).some(f=>!map.has(f.metaspriteId)))throw Error('Animation must use existing composed metasprite frames.');
  const names=new Set(S.animations.map(a=>a.name));
  animation={...clone(original),id:uniqueId('anim'),name:uniqueName(original.name+' ('+(factor===2/3?'0.667':factor)+'×)',names),frames:original.frames.map(f=>({...clone(f),metaspriteId:map.get(f.metaspriteId)}))};
 }
 return {factor,frames:made,animation,pools:[...pools.values()],tileCount:[...pools.values()].reduce((n,p)=>n+p.newTiles.length,0)};
}
function apply(plan){
 // Atomic preflight is complete. Commit only now, as one Undo step.
 snapshot();
 for(const pool of plan.pools){
  const sc=S.scenes.find(s=>s.id===pool.sceneId);const live=sc===S.scenes[S.activeScene];
  for(const {id,tile} of pool.newTiles){
   if(live)S.sprChr[id]=clone(tile);
   else sc.sprChr[id]=clone(tile);
  }
 }
 for(const m of plan.frames)S.metasprites.push(m.frame);
 if(plan.animation){S.animations.push(plan.animation);S._selAnim=S.animations.length-1;S._animFrame=0;}
 const first=plan.frames[0]?.frame;
 if(first)window.Forge163.metasprites.select(first.id);
 notify('metaspriteScaleCopies');
 window.Forge163.metasprites.render();
 window.dispatchEvent(new CustomEvent('forge:metasprites-changed',{detail:{reason:'metaspriteScaleCopies',frameId:first?.id}}));
 const details=plan.animation?' and animation '+plan.animation.name:'';
 showToast('Created '+plan.frames.length+' scaled frame(s)'+details+' · '+plan.tileCount+' new CHR tile(s)');
 return plan;
}
api.prepare = prepare;
api.scaleFrame = (id,factor) => apply(prepare([id],factor));
api.scaleAnimation = (animationId,factor) => {
 const animation=S.animations.find(a=>a.id===animationId);if(!animation)throw Error('Animation not found.');
 return apply(prepare([...new Set(animation.frames.map(f=>f.metaspriteId))],factor,animationId));
};
const host=document.createElement('section');host.className='ms-section163';host.id='msScaleGuide';host.innerHTML=`
 <h3>SCALE ARTWORK · NEW EDITABLE COPIES</h3>
 <div class="ms-row163"><label for="msScaleFactor">Factor</label><select id="msScaleFactor">
 <option value="0.5">0.5× — half size</option>
 <option value="0.6666666666666666">⅔× — reverse 1.5×</option>
 <option value="1.5" selected>1.5× — 50% larger</option>
 <option value="2">2× — double size</option>
 </select></div>
 <button id="msScaleFrame">Scale selected frame</button>
 <div class="ms-row163"><label for="msScaleAnimation">Source animation</label><select id="msScaleAnimation"></select></div>
 <label class="ms-help163" style="display:block;margin:4px 0"><input id="msScaleAdvanced" type="checkbox"> Advanced: allow rescaling generated copies</label>
 <button id="msScaleAll">Scale all animation poses</button>
 <div id="msScaleStatus" role="status" class="ms-help163">Select an ORIGINAL source animation. Scaling creates new CHR tiles, editable frames and a new animation without overwriting originals. Reassign the resulting animation in ENTITY STUDIO.</div>
 <details class="ms-help163"><summary>How scaling works in Forge</summary><p>The NES cannot scale OAM in hardware. Forge resamples your 2-bit pixel colors and builds 8×8 sprite pieces. 0.5× and ⅔× shrink; 1.5× and 2× enlarge. The original sprites and animations are preserved. Check the 8-sprites-per-scanline limit and reassign your new animation to the entity. The actor collision box does not resize automatically. Undo reverses a scale operation.</p></details>`;
const editor=$('msEditor163');
editor?.insertBefore(host,editor.querySelector('.ms-section163'));
// Generated copies are explicitly marked. By default, offer only original
// animations so repeated size experiments cannot unintentionally compound.
const scaledSuffix = /\s*\((?:0\.5|0\.666(?:666)?|0\.667|1\.5|2)×\)$/;
const isScaledName = name => scaledSuffix.test(name||'');
const originalName = name => {let result=name||'';while(scaledSuffix.test(result))result=result.replace(scaledSuffix,'');return result;};
function refresh(){
 const list=$('msScaleAnimation');if(!list)return;
 const current=window.Forge163.metasprites.current;
 const previous=list.value;
 const eligible=S.animations.filter(a=>(a.frames||[]).length&&(a.frames||[]).every(f=>!!f.metaspriteId&&!!window.Forge163.metasprites.get(f.metaspriteId)));
 const originals=eligible.filter(a=>!isScaledName(a.name));
 const advanced=$('msScaleAdvanced').checked;
 const offered=advanced?eligible:originals;
 list.replaceChildren();
 if(advanced){
  for(const [title,items] of [['Original animations',originals],['Generated copies (advanced)',eligible.filter(a=>isScaledName(a.name))]]){
   if(!items.length)continue;
   const group=document.createElement('optgroup');group.label=title;
   for(const a of items){const opt=document.createElement('option');opt.value=a.id;opt.textContent=a.name+' · '+a.frames.length+' poses';group.append(opt);}
   list.append(group);
  }
 }else for(const a of originals){const opt=document.createElement('option');opt.value=a.id;opt.textContent=a.name+' · '+a.frames.length+' poses';list.append(opt);}
 const matching=eligible.find(a=>a.frames.some(f=>f.metaspriteId===current?.id));
 const matchedOriginal=matching&&originals.find(a=>a.name===originalName(matching.name));
 // Prefer the unscaled origin of the selected frame, even after scaling
 // has selected a newly-created metasprite automatically.
 const preferred=advanced?matching:(matchedOriginal||(!isScaledName(matching?.name)?matching:null));
 list.value=preferred&&offered.some(a=>a.id===preferred.id)?preferred.id:
  (offered.some(a=>a.id===previous)?previous:offered[0]?.id||'');
 $('msScaleFrame').disabled=!current;
 $('msScaleAll').disabled=!offered.length;
}
$('msScaleAdvanced').addEventListener('change',refresh);
$('msFrames163')?.addEventListener('change',()=>queueMicrotask(refresh));
// Project imports and tab switches can rebuild the old frame dropdown without
// sending a DOM change event. Always resync when re-entering the editor.
const priorSwitchTab= switchTab;
switchTab=function(tab){const result=priorSwitchTab(tab);if(tab==='metasprites')refresh();return result;};
let lastSignature='';
const signature=()=>S.animations.map(a=>a.id+':'+a.frames?.length).join('|')+'|'+S.metasprites.length;
const priorRender=render;
render=function(...args){const result=priorRender(...args);if(S.tab==='metasprites'&&signature()!==lastSignature){refresh();lastSignature=signature();}return result;};
window.addEventListener('forge:metasprites-changed',()=>queueMicrotask(refresh));
const onAction=(fn)=>{try{const plan=fn();const status=$('msScaleStatus');if(status){const sizes=plan.frames.map(f=>f.size.w+'×'+f.size.h).join(', ');status.textContent='Created '+plan.frames.length+' editable frame(s) · '+sizes+' px · '+plan.tileCount+' new CHR tiles. Choose the new animation in Entity Studio to use it.';}refresh();}catch(e){$('msScaleStatus').textContent='Could not scale: '+e.message;showToast(e.message);}};
$('msScaleFrame').onclick=()=>onAction(()=>api.scaleFrame(window.Forge163.metasprites.current?.id,Number($('msScaleFactor').value)));
$('msScaleAll').onclick=()=>onAction(()=>api.scaleAnimation($('msScaleAnimation').value,Number($('msScaleFactor').value)));
refresh();lastSignature=signature();
})();


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


