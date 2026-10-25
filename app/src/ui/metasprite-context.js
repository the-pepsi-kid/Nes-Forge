/* NES FORGE alpha review v0.4: guarded visual context for Metasprites.
   No new project state, no schema upgrade and no inferred original-engine links. */
(()=>{
 'use strict';
 const sceneNow=()=>S.scenes?.[S.activeScene];
 const meta=()=>window.Forge163?.metasprites;
 const host=document.createElement('div');host.id='nf04-meta-context';host.setAttribute('role','status');
 host.style.cssText='font:12px/1.55 system-ui;color:#c1d9e8;background:#172739;border:1px solid #41627a;padding:10px;border-radius:6px;margin-bottom:10px';
 const status=document.createElement('div'),control=document.createElement('div');control.style.cssText='display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:7px';
 const sel=document.createElement('select');sel.id='nf04-pose-choices';sel.setAttribute('aria-label','Metasprite poses using active Scene');sel.style.cssText='max-width:100%;flex:1;background:#071a26;color:#e8f5ff;padding:6px;border:1px solid #47738c';
 const choose=document.createElement('button');choose.textContent='Open matching pose';choose.type='button';choose.style.cssText='padding:6px;background:#18516b;color:#e8f5ff;border:1px solid #5994a5;border-radius:4px';
 choose.onclick=()=>{if(!sel.value)return;meta()?.select(sel.value);refresh();};
 control.append(sel,choose);host.append(status,control);
 const frameSelect=document.getElementById('msFrames163');frameSelect?.parentElement?.before(host);
 // This banner is read-only and reflects the REAL current composer state. Poses have independent identities.
 function refresh(){
  const scene=sceneNow(),frame=meta()?.current;
  if(!scene){status.textContent='No selected Scene. Metasprite poses use their own explicit source Scene.';return;}
  const frames=(S.metasprites||[]).filter(x=>x.sceneId===scene.id);
  const same=!!frame&&frame.sceneId===scene.id;
  const source=S.scenes?.find(x=>x.id===frame?.sceneId);
  status.textContent=same?`MATCHING SOURCE · ${frame.name} uses ${scene.name}.`:
   frame?`DIFFERENT CONTEXT · Active Scene is ${scene.name}; selected pose is ${frame.name} (source: ${source?.name||'missing Scene'}). This is NOT a sprite assignment or collision binding.`:
    `NO FRAME SELECTED · Active Scene is ${scene.name}.`;
  host.style.borderColor=same?'#468d79':'#c29c52';
  const previous=sel.value;sel.replaceChildren();
  const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent=frames.length?`${frames.length} pose(s) use ${scene.name}`:'No poses use the current Scene';sel.appendChild(placeholder);
  for(const x of frames){const option=document.createElement('option');option.value=x.id;option.textContent=x.name;sel.appendChild(option);}
  sel.value=frames.some(x=>x.id===frame?.id)?frame.id:frames.some(x=>x.id===previous)?previous:'';
  sel.disabled=!frames.length;choose.disabled=!frames.length;
 }
 document.querySelector('[data-view="metasprites"]')?.addEventListener('click',()=>queueMicrotask(refresh));
 document.getElementById('sceneSel')?.addEventListener('change',()=>queueMicrotask(refresh));
 document.getElementById('msFrames163')?.addEventListener('change',()=>queueMicrotask(refresh));
 window.NFContext04=Object.freeze({refresh,describe:()=>({sceneId:sceneNow()?.id||null,poseId:meta()?.current?.id||null,poseSceneId:meta()?.current?.sceneId||null,matches:meta()?.current?.sceneId===sceneNow()?.id})});
 refresh();
})();
