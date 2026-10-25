/* ═══════════════════════════════════════════════════════════════
 * NES Forge 1.5.1 — INTEGRATION HOTFIX
 * Scope: fixes integration defects found in the 1.5 cross-tab audit.
 * No new world/game-runtime systems are introduced here.
 * ═══════════════════════════════════════════════════════════════ */
(()=>{
'use strict';
const F151={version:'1.5.1',hotfix:'integration',schema:3};
window.Forge151=F151;
if(window.Forge15)Forge15.version='1.5.1';
const $=id=>document.getElementById(id);
const text8=new TextEncoder();
const raster151=()=>S.scenes[S.activeScene]?.raster||null;

// ── Project state semantics ─────────────────────────────────────
// Dirty now means "differs from the most recently loaded or successfully saved portable/browser project".
function status151(message){
  if(window.Forge?.release)return Forge.release.updateStatus(message);
  const el=$('forge15State');if(!el||!window.Forge15)return;
  el.className=Forge15.dirty?'dirty':'clean';
  const clock=t=>t?new Date(t).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'}):'—';
  el.textContent=message||((Forge15.dirty?'● Modified':'✓ Saved')+' · recovery '+clock(Forge15.lastRecovery));
  el.title='Modified: '+(Forge15.dirty?'yes':'no')+'\nBrowser save: '+clock(Forge15.lastBrowserSave)+'\nRecovery: '+clock(Forge15.lastRecovery)+'\nPortable save: '+clock(Forge15.lastPortable);
}
function dirty151(reason='edit'){
  const cleanReasons=new Set(['welcome','fullSync','sceneSelect','selectTile','eyedrop','sprSelect','projectLoad','projectOpen','projectDrop','zipProject','zipAssets']);
  if(!cleanReasons.has(reason)){Forge15.dirty=true;Forge15.lastEdit=Date.now();status151();}
}
const broadcast15=broadcastState;
broadcastState=function(reason){dirty151(reason);return broadcast15(reason);};
const deserialize15=db_deserializeState;
db_deserializeState=function(json,options={}){
  const result=deserialize15(json,options);
  if(!options.history&&!options.sync){Forge15.dirty=false;status151('✓ Loaded project · recovery '+(Forge15.lastRecovery?new Date(Forge15.lastRecovery).toLocaleTimeString():'—'));}
  return result;
};
const projectData15=projectData;
projectData=function(){const d=projectData15();d.foundation='1.5.1';return d;};
for(const name of ['project_export','exportAll']){
  const old=window[name];window[name]=function(...args){
    const store=window.Forge.services.ProjectStore,token=store.saveCompletionToken(),p=old(...args);
    if(p?.then)p.then(result=>store.completePortableSave(token,result),()=>{});
    return p;
  };
}
$('cfgPackScenes')?.addEventListener('change',()=>{dirty151('buildConfig');updateBuildApplicability151();});
$('codeInput')?.addEventListener('input',()=>{dirty151('code');updateBuildApplicability151();});

// ── Custom ASM with scene packing disabled ─────────────────────
// The Build Scene Set is a packed-scene concern only. Unpacked custom ASM uses the active CHR banks directly.
const buildNesRom15=buildNesRom;
const plan15=Forge15?.build?.plan;
function customUnpacked151(){return !!$('codeInput')?.value.trim()&&S.packScenes===false;}
function unpackedPlan151(){
  saveCurrentScene();
  if(S.chr.length>256||S.sprChr.length>256)throw Error('Unpacked custom CHR exceeds one 256-tile bank. Compile/select a static bank first.');
  return {entries:[],mapped:{scenes:[],map:new Map()},atlas:{chr:S.chr,sprChr:S.sprChr,tileProps:S.tileProps,scenes:[]},custom:true,pack:false,ext:new Uint8Array()};
}
function plan151(){return customUnpacked151()?unpackedPlan151():plan15();}
function preflight151(){
  const box=$('forge15Preflight');
  try{
    const p=plan151(),lines=[];
    if(!p.pack){
      lines.push('<div class="ok">✓ Custom ASM, scene packing disabled</div>');
      lines.push('<div class="ok">✓ Build Scene Set is intentionally ignored</div>');
      lines.push('<div class="ok">✓ Active BG/Sprite CHR fit the NROM 256-tile banks</div>');
    }else{
      lines.push('<div class="ok">✓ '+p.entries.length+' scene(s) selected: '+p.entries.map(e=>esc(e.sc.name)).join(' → ')+'</div>');
      lines.push('<div class="ok">✓ Runtime metadata schema v3: '+p.ext.length.toLocaleString()+' bytes</div>');
      lines.push('<div class="ok">✓ BG/Sprite atlas capacity valid</div>');
    }
    if(S.instruments.length||S.animations.length)lines.push('<div class="warn">Audio/animation authoring is preserved in the project but still has no generated ROM playback engine.</div>');
    box.innerHTML=lines.join('');return p;
  }catch(e){box.innerHTML='<div class="err">✗ '+esc(e.message)+'</div>';return null;}
}
function buildUnpackedCustom151(){
  window._lastBuiltRom=null;const blog=$('buildLog');blog.textContent='';const log=(m,k='bl-ok')=>{const d=document.createElement('div');d.className=k;d.textContent=m;blog.appendChild(d);};
  try{
    saveCurrentScene();S.asmSource=$('codeInput').value;
    if(!asm_assemble())throw Error(S.asmErrors.length?'Assembly failed — '+S.asmErrors[0].msg:'No executable code was emitted');
    if(S.chr.length>256||S.sprChr.length>256)throw Error('Unpacked custom CHR exceeds one 256-tile bank. Compile/select a static bank first.');
    const min=Math.min(...S._asmWrites.map(x=>x[0]));if(min<0x8000)throw Error('ROM code must live at $8000–$FFFF. Use .rs for RAM variables.');
    const base=min<0xC000?0x8000:0xC000,prgSize=65536-base,PRG=new Uint8Array(prgSize),writes=new Set();
    for(const [addr,val] of S._asmWrites){if(addr<base||addr>0xFFFF)throw Error('Code address $'+addr.toString(16).toUpperCase()+' is outside the selected PRG window');PRG[addr-base]=val;writes.add(addr);}
    for(let a=0xFFFA;a<=0xFFFF;a++)if(!writes.has(a))throw Error('Missing interrupt vectors: emit NMI, RESET and IRQ words at $FFFA.');
    const header=new Uint8Array(16);header.set([0x4E,0x45,0x53,0x1A,prgSize/16384,1,(S.mirroring==='v'?1:0)|(S.hasSRAM?2:0)]);
    const rom=new Uint8Array(16+prgSize+8192);rom.set(header);rom.set(PRG,16);rom.set(encodeTiles(S.chr),16+prgSize);rom.set(encodeTiles(S.sprChr),16+prgSize+4096);window._lastBuiltRom=rom;
    log('Built unpacked custom NROM: '+prgSize/1024+' KB PRG + 8 KB CHR • '+rom.length+' bytes.');
    log('Scene packing is OFF; Build Scene Set, scene metadata and collision table are not inserted.','bl-warn');
    if(S.instruments.length||S.animations.length)log('Audio/animation authoring preserved; automatic ROM playback runtime remains a 2.0 milestone.','bl-warn');
    if(!window._buildAndRunMode)download(rom,(S.projectName||'game').replace(/[^\w-]/g,'_')+'.nes');showToast('1.5.1 custom build successful — '+rom.length+' bytes');return rom;
  }catch(e){log(e.message,'bl-err');reportError(e);return null;}
}
buildNesRom=function(){/* Final files in either branch delegate through download(...), the shared Save As flow. */return customUnpacked151()?buildUnpackedCustom151():buildNesRom15();};
if(Forge15?.build){Forge15.build.plan=plan151;Forge15.build.showPreflight=preflight151;}
window.forge15_preflight=preflight151;
$('forge15PreflightBtn').onclick=preflight151;
function updateBuildApplicability151(){
  const box=$('buildSceneSet'),note=box?.previousElementSibling,ignored=customUnpacked151();if(box){box.style.opacity=ignored?'.45':'1';box.style.pointerEvents=ignored?'none':'';box.title=ignored?'Ignored because custom ASM has scene packing disabled':'';}
  if(note&&note.tagName==='P')note.textContent=ignored?'Custom ASM + Pack Scene Data OFF: Build Scene Set is ignored; the active CHR banks are built directly.':'Workspace may contain 64 scenes. NROM viewer builds up to 7 selected scenes. Door targets are remapped to build order.';
}
updateBuildApplicability151();

// ── Raster-aware Scene background color ────────────────────────
const spUpdate15=sp_update;
sp_update=function(){
  const r=raster151();spUpdate15();
  if(r){const bg=clamp($('spBgColor').value,0,63,15);for(const state of r.palettes||[])for(let i=0;i<32;i+=4)state[i]=bg;render();}
};

// ── Raster-aware collision authoring and atlas paging ─────────
let collisionPage151=0;
const colGrid=$('colTileGrid');
const colPageWrap=document.createElement('div');colPageWrap.id='colPage151';colPageWrap.style.cssText='display:none;margin:4px 0;font-size:8px;color:var(--dim)';colPageWrap.innerHTML='<label>Tile page <select id="colPageSelect151" style="background:var(--bg3);color:var(--acc);border:1px solid var(--bdr);font:9px monospace"></select></label>';
colGrid?.parentNode?.insertBefore(colPageWrap,colGrid);
$('colPageSelect151')?.addEventListener('change',e=>{collisionPage151=+e.target.value||0;col_buildTileGrid();});
col_setTileProp=function(tileIdx){
  tileIdx=clamp(tileIdx,0,Math.max(0,S.tileProps.length-1));const prop=clamp($('colPropSel').value,0,7);if(S.tileProps[tileIdx]===prop)return;snapshot();S.tileProps[tileIdx]=prop;collisionPage151=Math.floor(tileIdx/256);notify('collision');
};
col_buildTileGrid=function(){
  const grid=$('colTileGrid');if(!grid)return;grid.innerHTML='';const colors=['transparent','#ff000080','#ffff0080','#00ff0080','#ff880080','#0088ff80','#00ffff80','#ff00ff80'];
  const total=Math.max(256,S.tileProps.length,S.chr.length),pages=Math.ceil(total/256);collisionPage151=clamp(collisionPage151,0,pages-1);
  colPageWrap.style.display=pages>1?'block':'none';const sel=$('colPageSelect151');sel.innerHTML='';for(let p=0;p<pages;p++){const o=document.createElement('option');o.value=p;o.textContent='Page '+(p+1)+' · $'+(p*256).toString(16).toUpperCase()+'–$'+Math.min(total-1,p*256+255).toString(16).toUpperCase();o.selected=p===collisionPage151;sel.appendChild(o);}
  const start=collisionPage151*256,end=Math.min(total,start+256);for(let i=start;i<end;i++){const cell=document.createElement('div');cell.className='col-tile-cell';cell.title='Tile $'+i.toString(16).toUpperCase()+' · property '+(S.tileProps[i]||0);cell.onclick=()=>col_setTileProp(i);const c=document.createElement('canvas');c.width=8;c.height=8;drawTileAt(c.getContext('2d'),0,0,i,0,1);cell.appendChild(c);const dot=document.createElement('div');dot.className='col-dot';dot.style.background=colors[S.tileProps[i]||0];cell.appendChild(dot);grid.appendChild(cell);}
};
col_updateSidebar=function(){let solid=0,plat=0,hazard=0;for(const p of S.tileProps){if(p===1)solid++;else if(p===2)plat++;else if(p===4)hazard++;}$('colSolid').textContent=solid;$('colPlatform').textContent=plat;$('colHazard').textContent=hazard;col_buildTileGrid();};
cv.addEventListener('mousedown',e=>{
  const r=raster151();if(!r||S.tab!=='collision'||e.button!==0)return;const p=canvasPoint(cv,e,256,240);if(p.x<0||p.y<0||p.x>=256||p.y>=240)return;e.preventDefault();e.stopImmediatePropagation();const sc=forgeCapture.liveScene(),ti=forgeCapture.sampledBackground(sc,p.x,p.y,forgeCapture.rasterMap(r)).ti;collisionPage151=Math.floor(ti/256);col_setTileProp(ti);
},true);

// ── Raster-aware metatile analysis ─────────────────────────────
const metaCount15=metaCount,renderMeta15=renderMeta;
function rasterMetaKey151(mr,mc){
  const sc=forgeCapture.liveScene(),r=sc.raster,map=forgeCapture.rasterMap(r),x0=mc*16,y0=mr*16;const pts=[[4,4],[12,4],[4,12],[12,12]];
  return pts.map(([dx,dy])=>{const p=forgeCapture.sampledBackground(sc,x0+dx,y0+dy,map);return p.ti+':'+p.sx+':'+p.sy;}).join('|');
}
metaCount=function(){if(!raster151())return metaCount15();const set=new Set();for(let mr=0;mr<15;mr++)for(let mc=0;mc<16;mc++)set.add(rasterMetaKey151(mr,mc));return set.size;};
renderMeta=function(){
  if(!raster151())return renderMeta15();renderScene();const z=+$('oZoom').value;cx.fillStyle='rgba(0,0,0,0.28)';cx.fillRect(0,0,cv.width,cv.height);const ids=new Map();let next=0;
  for(let mr=0;mr<15;mr++)for(let mc=0;mc<16;mc++){const k=rasterMetaKey151(mr,mc);if(!ids.has(k))ids.set(k,next++);const hue=(ids.get(k)*41)%360;cx.fillStyle='hsla('+hue+',60%,45%,0.30)';cx.fillRect(mc*16*z,mr*16*z,16*z,16*z);cx.strokeStyle='rgba(0,255,200,0.45)';cx.lineWidth=1;cx.strokeRect(mc*16*z+.5,mr*16*z+.5,16*z-1,16*z-1);}
};

// ── Camera authoring for fields already preserved by ROM v3 ───
const viewCfg=document.querySelector('#sideScene .view-cfg');
if(viewCfg&&!$('viewX')){
  const rows=document.createDocumentFragment();
  const make=(label,id,type='number')=>{const d=document.createElement('div');d.className='sp-row';const l=document.createElement('label');l.style.cssText='font-size:8px;color:var(--dim)';l.textContent=label;let c;if(type==='select'){c=document.createElement('select');}else{c=document.createElement('input');c.type='number';c.min='0';c.max='65535';c.step='1';}c.id=id;c.onchange=()=>view_update();d.append(l,c);return d;};
  rows.append(make('View X','viewX'),make('View Y','viewY'),make('Follow','viewFollow','select'));viewCfg.insertBefore(rows,viewCfg.firstChild);
}
function cameraUI151(){
  const sc=S.scenes[S.activeScene];if(!sc||!$('viewX'))return;$('viewX').value=clamp(sc.view?.x,0,65535);$('viewY').value=clamp(sc.view?.y,0,65535);const sel=$('viewFollow');sel.innerHTML='<option value="-1">None</option>';for(let i=0;i<(sc.entities||[]).length;i++){const e=sc.entities[i],o=document.createElement('option');o.value=i;o.textContent='#'+i+' '+(_et(e.type).name)+(e.name?' · '+e.name:'');o.selected=sc.view?.followEnt===i;sel.appendChild(o);}sel.value=Number.isInteger(sc.view?.followEnt)?String(sc.view.followEnt):'-1';
}
view_update=function(){
  snapshot();const sc=S.scenes[S.activeScene],follow=clamp($('viewFollow')?.value??-1,-1,(sc.entities?.length||0)-1,-1);sc.view={...sc.view,x:clamp($('viewX')?.value??sc.view?.x,0,65535,0),y:clamp($('viewY')?.value??sc.view?.y,0,65535,0),w:clamp($('viewW').value,64,512,256),h:clamp($('viewH').value,64,480,240),hBorder:clamp($('viewHB').value,0,128),vBorder:clamp($('viewVB').value,0,120),followEnt:follow};notify('camera');
};
const spLoad15=sp_loadUI;sp_loadUI=function(sc){const r=spLoad15(sc);cameraUI151();return r;};
const entList15=ent_buildList;ent_buildList=function(){const r=entList15();cameraUI151();return r;};
cameraUI151();

// ── Manual 8×16 sprite authoring ───────────────────────────────
const sprProps=$('sprPropsPanel');
if(sprProps&&!$('sprPropHeight')){
  const lh=document.createElement('label');lh.textContent='Size:';const sh=document.createElement('select');sh.id='sprPropHeight';sh.innerHTML='<option value="8">8×8</option><option value="16">8×16</option>';sh.onchange=()=>updateSprProp();
  const lb=document.createElement('label');lb.textContent='Bottom:';const sb=document.createElement('input');sb.type='number';sb.id='sprPropTile2';sb.min='0';sb.max='255';sb.value='1';sb.onchange=()=>updateSprProp();
  sprProps.append(lh,sh,lb,sb);
}
function spriteSizeUI151(){const s=S.oam[S.selSprite];if(!s||!$('sprPropHeight'))return;$('sprPropHeight').value=s.height===16?'16':'8';$('sprPropTile2').value=s.tile2??((s.tile+1)&255);$('sprPropTile2').disabled=s.height!==16;}
const populateSpr15=populateSprProps;populateSprProps=function(){const r=populateSpr15();spriteSizeUI151();return r;};
updateSprProp=function(){
  if(S.selSprite<0||S.selSprite>=S.oam.length)return;snapshot();const spr=S.oam[S.selSprite];spr.tile=clamp($('sprPropTile').value,0,255);spr.x=clamp($('sprPropX').value,0,255);spr.y=clamp($('sprPropY').value,0,239);spr.height=+$('sprPropHeight').value===16?16:8;spr.tile2=clamp($('sprPropTile2').value,0,255,(spr.tile+1)&255);const pal=+$('sprPropPal').value,fh=$('sprPropFH').checked?0x40:0,fv=$('sprPropFV').checked?0x80:0,bg=$('sprPropBG').checked?0x20:0;spr.attr=(pal&3)|fh|fv|bg;spriteSizeUI151();notify('sprProp');
};
const updateSprites15=updateSpritesSidebar;updateSpritesSidebar=function(){
  const r=updateSprites15();spriteSizeUI151();document.querySelectorAll('#sprList .spr-slot').forEach((row,i)=>{const s=S.oam[i],info=row.querySelector('span');if(s&&info&&s.height===16&&!info.textContent.includes('8×16'))info.textContent+=' · 8×16';});
  const s=S.oam[S.selSprite],canvas=$('sprTilePreview');if(s?.height===16&&canvas){const x=canvas.getContext('2d');x.clearRect(0,0,canvas.width,canvas.height);drawSpriteTileSolid(x,4,0,s.tile,s.attr&3,3);drawSpriteTileSolid(x,4,8,s.tile2??((s.tile+1)&255),s.attr&3,3);}return r;
};
const renderSprPicker15=renderSprChrPicker;renderSprChrPicker=function(){const r=renderSprPicker15();const s=S.oam[S.selSprite];if(s?.height===16){const c=$('sprChrPicker'),x=c.getContext('2d'),z=3,ti=s.tile2??((s.tile+1)&255);x.strokeStyle='#5ad4ff';x.lineWidth=2;x.strokeRect((ti%16)*8*z+2,(ti>>4)*8*z+2,8*z-4,8*z-4);}return r;};

// ── Forge-ROM import gets deterministic build order ────────────
const extractScenes15=extractScenes;
extractScenes=function(...args){const scenes=extractScenes15(...args);if(Array.isArray(scenes))for(let i=0;i<scenes.length;i++){scenes[i].buildInclude=scenes[i].buildInclude!==false;scenes[i].buildOrder=i;}return scenes;};
const importRom15=importRom;
importRom=function(rom,name='Imported ROM'){
  const before=S.scenes.length,maxBefore=S.scenes.slice(0,before).reduce((m,s)=>Math.max(m,Number.isFinite(s.buildOrder)?s.buildOrder:-1),-1),ok=importRom15(rom,name);if(ok){for(let i=before;i<S.scenes.length;i++){S.scenes[i].buildInclude=true;S.scenes[i].buildOrder=maxBefore+1+(i-before);}Forge15.dirty=true;buildSceneSel();status151();}return ok;
};

// ── Disassembler subroutine statistic ──────────────────────────
const disasmRun15=disasm_run;
disasm_run=function(){const text=disasmRun15();if(!text)return text;const subs=new Set();for(const m of text.matchAll(/\bJSR\s+(?:a:)?\$([0-9A-F]{4})/gi))subs.add(parseInt(m[1],16));const el=$('dSubCount');if(el)el.textContent=subs.size;return text;};

// ── 1.5.1 documentation / version ─────────────────────────────
const renderDocs15=renderDocs;
renderDocs=function(){renderDocs15();const doc=document.querySelector('#sideDocs .doc');if(!doc)return;const s=document.createElement('section');s.innerHTML='<h2>1.5.1 Integration Hotfix</h2><p>Cross-tab fixes: unpacked custom ASM ignores the packed Build Scene Set; exact raster captures use their sampled native tile IDs for collision and metatile analysis; Scene BG Color updates retained raster palette states; project dirty state now resets on load/successful portable save and covers direct code/envelope/capture changes; imported Forge scenes receive deterministic build order; camera X/Y/follow controls expose the v3 fields already stored in ROM metadata; manual 8×16 sprite authoring exposes size and bottom tile; Disassembler now reports unique JSR targets as subroutines.</p><p>Scope remains Foundation: audio/animation-to-ROM runtime, metasprites, world maps, true metatile authoring and mapper-backed builds are still later milestones.</p>';doc.prepend(s);};
document.querySelector('h1').innerHTML='NES FORGE <small style="color:var(--grn)">1.5.1 INTEGRATION HOTFIX</small>';
document.title='NES Forge 1.5.1 — Integration Hotfix';
// Current composition owns startup status.
})();


