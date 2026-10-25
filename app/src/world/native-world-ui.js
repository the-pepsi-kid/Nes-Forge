/* Selected native maps use canonical Worlds and the ordinary project lifecycle.
 * This canvas has its own pointer ownership; legacy scene handlers never paint
 * it. A stroke is detached until one guarded ProjectStore transaction succeeds. */
(()=>{
'use strict';
const services=window.Forge.services,api=services.NativeWorldProject,adapter=window.ZeldaOverworld,store=services.ProjectStore;
const $=id=>document.getElementById(id),el=(tag,id,text)=>{const n=document.createElement(tag);if(id)n.id=id;if(text!==undefined)n.textContent=text;return n;};
let selected='',brush=5,stroke=null,busy=false,token=0,atlas=null,atlasScene=null;
const root=el('section','nativeWorldView'),bar=el('div'),select=el('select','nativeWorldMap'),canvas=el('canvas','nativeWorldCanvas'),scroll=el('div'),status=el('p','nativeWorldStatus');
root.hidden=true;bar.className='native-world-bar';select.setAttribute('aria-label','Overworld map');bar.append(el('strong',null,'Overworld'),select);root.appendChild(bar);scroll.className='native-world-scroll';canvas.setAttribute('aria-label','Editable native terrain map');canvas.tabIndex=0;scroll.appendChild(canvas);root.append(scroll,status);status.setAttribute('role','status');$('leftP').insertBefore(root,$('cv'));
const zoom=el('select','nativeWorldZoom');zoom.setAttribute('aria-label','Map zoom');for(const [id,label]of [['map','Fit map'],['width','Fit width'],['1','100%'],['2','200%']]){const o=el('option',null,label);o.value=id;zoom.appendChild(o);}zoom.value='map';bar.appendChild(zoom);
function applyZoom(){const mode=zoom.value,w=mode==='map'?Math.min(scroll.clientWidth,scroll.clientHeight*canvas.width/canvas.height):mode==='width'?scroll.clientWidth:Number(mode)*canvas.width;canvas.style.width=Math.max(1,w)+'px';}
zoom.onchange=applyZoom;if(typeof ResizeObserver==='function')new ResizeObserver(applyZoom).observe(scroll);else window.addEventListener('resize',applyZoom);
const side=el('div','sideNativeWorld');side.style.display='none';side.append(el('h2',null,'TERRAIN'),el('p',null,'Paint to change terrain. Right-click picks a terrain type. Each stroke has one Undo.'));const brushes=el('div','nativeWorldBrushes');side.appendChild(brushes);const budget=el('p','nativeWorldBudget');side.append(budget,el('p',null,'Save Project As preserves edits and source. Build & Run rebuilds the original game. Terrain retains its original engine behavior.'),el('p',null,'Native output supports terrain and four location fields. Art, actors, Audio and new rules need additional encoders. Collision and events are not inferred from the image.'));$('rightP').appendChild(side);
const nativeScopeHint=el('p','nativeWorldScopeHint','Native World editing currently requires a verified ROM-specific map decoder/writer (Zelda II supported revisions). Other imported ROMs remain inspectable, but do not automatically gain terrain editors.');nativeScopeHint.style.cssText='font:11px/1.35 system-ui;color:#c4d9e8;max-width:370px;margin:3px 8px';
const file=el('input','nativeWorldFile');file.type='file';file.accept='.nes';file.hidden=true;const open=el('button','nativeWorldOpen','Open native World');open.type='button';open.title='Open a ROM with a supported native World adapter (currently verified for specific Zelda II revisions). Other ROMs can still be investigated without a native terrain editor.';open.onclick=()=>file.click();$('areaLibraryOpen').after(open,nativeScopeHint,file);
const button=(label,fn)=>{const b=el('button',null,label);b.type='button';b.onclick=safe(fn);side.appendChild(b);return b;};
button('CHR / palettes',()=>{services.SceneContext.selectScene(binding().sceneId);switchTab('chr');});
button('Native location fields',()=>services.AreaLibrary.openNativeEditor());
function message(text,error=false){status.textContent=text;status.dataset.error=String(error);}
function safe(fn){return async()=>{try{return await fn();}catch(e){message(e.message,true);showToast(e.message);return false;}};}
function binding(){return S.nativeGame?.resources?.find(b=>b.mapId===selected);}
function current(){const b=binding();return b?{b,world:S.worlds.find(w=>w.id===b.worldId),scene:S.scenes.find(s=>s.id===b.sceneId),resource:adapter.resource(b.mapId)}:null;}
function guard(){return {epoch:store.state.epoch,snapshot:store.serialize()};}
function check(g){if(g.epoch!==store.state.epoch||g.snapshot!==store.serialize())throw Error('The project changed while opening the map. Open it again.');}
function createAtlas(scene){
 if(atlasScene===JSON.stringify([scene.chr,scene.pal,scene.metatiles]))return atlas;
 atlasScene=JSON.stringify([scene.chr,scene.pal,scene.metatiles]);atlas=el('canvas');atlas.width=256;atlas.height=16;const ctx=atlas.getContext('2d'),im=ctx.createImageData(256,16);
 for(let k=0;k<16;k++){const m=scene.metatiles.find(m=>m.id===k);if(!m)continue;for(let y=0;y<16;y++)for(let x=0;x<16;x++){
  const tile=scene.chr[m.tiles[(y>>3)*2+(x>>3)]],color=NP[scene.pal[m.pal][tile?.[y&7]?.[x&7]||0]]||[0,0,0],at=(y*256+k*16+x)*4;
  im.data.set([...color,255],at);
 }}ctx.putImageData(im,0,0);return atlas;
}
function draw(){
 const c=current();if(!c?.world||!c.scene)return;const a=createAtlas(c.scene),ctx=canvas.getContext('2d'),map=stroke?.map||c.world.map;
 canvas.width=1024;canvas.height=c.resource.height*16;ctx.imageSmoothingEnabled=false;
 for(let i=0;i<map.length;i++)ctx.drawImage(a,map[i]*16,0,16,16,(i%64)*16,Math.floor(i/64)*16,16,16);
 applyZoom();
}
function renderBrushes(scene){
 brushes.replaceChildren();const a=createAtlas(scene);
 for(let i=0;i<16;i++){const b=el('button',null,adapter.classes[i]),icon=el('canvas');icon.width=icon.height=16;icon.getContext('2d').drawImage(a,i*16,0,16,16,0,0,16,16);b.prepend(icon);b.type='button';b.setAttribute('aria-pressed',String(i===brush));b.dataset.terrain=String(i);b.onclick=()=>{brush=i;renderBrushes(scene);if(innerWidth<=850)canvas.scrollIntoView({block:'center'});};brushes.appendChild(b);}
}
function refresh(){
 const wasVisible=!root.hidden,profile=S.nativeGame?.profile===adapter.id,visible=profile?S.nativeGame.resources.find(b=>b.worldId===S.worlds[Forge161.worlds.state.selected]?.id)?.mapId:null,active=profile&&!!visible;
 document.body.classList.toggle('native-world-active',active&&S.tab==='world');
 if(!active){selected='';stroke=null;root.hidden=true;side.style.display='none';if(wasVisible&&S.tab==='world'){$('cv').style.display='block';$('sideWorld').style.display='block';Forge161.worlds.render();}return;}
 if(visible&&visible!==selected){selected=visible;stroke=null;}
 if(!binding()){selected=visible||S.nativeGame.resources[0].mapId;stroke=null;}
 root.hidden=S.tab!=='world';side.style.display=S.tab==='world'?'block':'none';
 if(S.tab==='world'){$('cv').style.display='none';$('sideWorld').style.display='none';}
 select.replaceChildren();for(const r of adapter.resources){const o=el('option',null,r.name+(S.nativeGame.resources.some(b=>b.mapId===r.id)?'':' · load on selection'));o.value=r.id;select.appendChild(o);}select.value=selected;select.disabled=busy;
 const c=current();if(!c?.world||!c.scene){canvas.width=canvas.width;brushes.replaceChildren();message('The map or its required tileset is missing. Undo the structural edit or restore its reference.',true);return;}
 try{const encoded=adapter.encode(S.importedRom,selected,c.world.map);budget.textContent=encoded.usedBytes+' / '+encoded.budget+' bytes · '+(encoded.budget-encoded.usedBytes)+' free. The native format compresses runs of equal terrain.';}catch(e){budget.textContent=e.message;}
 renderBrushes(c.scene);draw();
}
function choose(id){
 if(stroke)throw Error('Finish the current terrain stroke first.');adapter.resource(id);
 if(!S.nativeGame.resources.some(b=>b.mapId===id))store.openNativeWorldResource(id,{expected:guard()});
 selected=id;const b=binding();services.SceneContext.selectWorld(b.worldId);switchTab('world');refresh();message(adapter.resource(id).name+' · edit terrain, then Save Project As or Build & Run.');return true;
}
async function openBytes(bytes,name,id='z2:1:0',expected=guard()){
 check(expected);
 if(api.matches({nativeGame:S.nativeGame})&&window.NativeEngineFormat.sha256(bytes)===S.nativeGame.sourceSha256)return choose(id);
 let p;try{p=api.create(bytes,name,id);}catch(e){throw Error('No supported native World decoder/writer for this ROM: '+(e?.message||String(e))+'. Use Import ROM or RE / DISASM to investigate unsupported games.');}check(expected);
 if(Forge15.dirty&&!confirm('Open this overworld as a new project? Save your current project first if you want to keep its changes.'))return false;
 check(expected);store.load(p,{intent:'native-world-open'});selected=id;choose(id);return true;
}
async function openFile(input){
 if(busy)throw Error('A map source is already loading.');if(!input)return false;if(input.size>400000)throw Error('This ROM exceeds the supported native Zelda II World adapter size limit. Other game ROMs remain available for investigation.');
 const own=++token,expected=guard();busy=true;open.disabled=true;
 try{const bytes=new Uint8Array(await input.arrayBuffer());if(own!==token)return false;return await openBytes(bytes,input.name,'z2:1:0',expected);}finally{busy=false;open.disabled=false;file.value='';refresh();}
}
function point(e){const r=canvas.getBoundingClientRect(),c=current();if(!c)return null;const x=Math.floor((e.clientX-r.left)*64/r.width),y=Math.floor((e.clientY-r.top)*c.resource.height/r.height);return x>=0&&x<64&&y>=0&&y<c.resource.height?{x,y,index:y*64+x}:null;}
function dab(p){
 if(!stroke||!p)return;const prev=stroke.last||p,steps=Math.max(Math.abs(p.x-prev.x),Math.abs(p.y-prev.y),1);
 for(let n=0;n<=steps;n++){const x=Math.round(prev.x+(p.x-prev.x)*n/steps),y=Math.round(prev.y+(p.y-prev.y)*n/steps),index=y*64+x;stroke.changes.set(index,brush);stroke.map[index]=brush;}stroke.last=p;draw();
}
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('pointerdown',e=>{
 if(stroke||busy)return;const p=point(e),c=current();if(!p||!c)return;
 if(e.button===2){brush=c.world.map[p.index];renderBrushes(c.scene);return;}if(e.button!==0)return;
 e.preventDefault();canvas.focus();stroke={id:e.pointerId,expected:guard(),map:c.world.map.slice(),mapId:selected,changes:new Map(),last:null};canvas.setPointerCapture(e.pointerId);dab(p);
});
canvas.addEventListener('pointermove',e=>{if(stroke?.id===e.pointerId)dab(point(e));});
function finish(e,cancel=false){
 if(!stroke||stroke.id!==e.pointerId)return;const s=stroke;if(!cancel)dab(point(e));stroke=null;
 try{if(!cancel){const result=store.applyNativeWorldEdit(s.mapId,[...s.changes].map(([index,value])=>({index,value})),{expected:s.expected});message(result.applied?'Terrain saved in the project · '+result.usedBytes+' / '+result.budget+' bytes.':'Terrain already has that value.');}}
 catch(error){message(error.message,true);}finally{if(canvas.hasPointerCapture?.(e.pointerId))canvas.releasePointerCapture(e.pointerId);refresh();}
}
canvas.addEventListener('pointerup',e=>finish(e));canvas.addEventListener('pointercancel',e=>finish(e,true));
canvas.addEventListener('lostpointercapture',e=>finish(e,true));
select.onchange=safe(()=>choose(select.value));file.onchange=safe(()=>openFile(file.files?.[0]));
for(const node of [root,side])for(const type of ['keydown','keyup'])node.addEventListener(type,e=>{if(type==='keydown'&&(e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)){e.preventDefault();if(stroke){stroke=null;refresh();}else if(e.shiftKey)redo();else undo();}e.stopPropagation();});
const previous=switchTab;switchTab=function(tab){if(stroke&&tab!=='world')finish({pointerId:stroke.id},true);root.hidden=true;side.style.display='none';previous(tab);refresh();};
const previousSelect=Forge161.worlds.select;Forge161.worlds.select=function(...args){const result=previousSelect.apply(this,args);refresh();return result;};
$('wSelect161')?.addEventListener('change',refresh);
const previousRender=render;render=function(...args){const result=previousRender.apply(this,args);if(S.tab==='world')refresh();return result;};
const style=el('style');style.textContent='#nativeWorldView[hidden]{display:none!important}#nativeWorldView{width:100%;height:100%;min-height:0;display:flex;flex-direction:column;gap:8px;padding:10px;box-sizing:border-box;font:12px/1.5 system-ui}#nativeWorldView .native-world-bar{display:flex;gap:12px;align-items:center;flex-wrap:wrap}#nativeWorldView select,#nativeWorldOpen,#sideNativeWorld button{min-height:40px;background:var(--bg3);color:var(--txt);border:1px solid var(--bdr);padding:6px;border-radius:4px;font:inherit}#nativeWorldView .native-world-scroll{overflow:auto;min-height:0;flex:1;text-align:center;background:#080f17}#nativeWorldCanvas{width:100%;max-width:none;height:auto;image-rendering:pixelated;touch-action:none;cursor:crosshair;vertical-align:top}#nativeWorldStatus{margin:0;min-height:2em;overflow-wrap:anywhere}#nativeWorldStatus[data-error=true]{color:#ffb591}#sideNativeWorld{font:12px/1.5 system-ui;padding:12px}#nativeWorldBrushes{display:grid;grid-template-columns:1fr 1fr;gap:5px}#nativeWorldBrushes button{display:flex;align-items:center;gap:8px;text-align:left}#nativeWorldBrushes canvas{width:32px;height:32px;image-rendering:pixelated;flex-shrink:0}#nativeWorldBrushes button[aria-pressed=true]{outline:2px solid #8bedd1;background:#27434c}#nativeWorldBudget{padding:8px;background:#203442}#nativeWorldOpen{margin:4px}@media(max-width:850px){.native-world-active #leftP{height:70vh;min-height:450px;flex:0 0 auto}.native-world-active #rightP{min-width:0}}';document.head.appendChild(style);
services.NativeWorldUI=Object.freeze({refresh,choose,openFile,openBytes,getState:()=>({selected,brush,busy,painting:!!stroke})});refresh();
})();
