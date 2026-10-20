/* ═══════════════════════════════════════════════════════════════
 * NES Forge 1.5 FOUNDATION
 * Consolidation/foundation layer over the proven 1.4.4 behavior.
 * Scope: edit scheduling, recovery, build scene selection/preflight,
 * richer versioned ROM metadata, project status, and build manifest.
 * Runtime capture/emulator/audio/CHR algorithms are intentionally preserved.
 * ═══════════════════════════════════════════════════════════════ */
(()=>{
'use strict';
const F15={version:'1.5',schema:3,romLayout:3,dirty:false,lastEdit:0,lastBrowserSave:0,lastRecovery:0,lastPortable:0,thumbTimer:null,syncTimer:null,recoveryStore:'recovery',recoveryKey:'autosave'};
window.Forge15=F15;
const $15=id=>document.getElementById(id);
const copy15=v=>JSON.parse(JSON.stringify(v));
const utf8=new TextEncoder();
const decode8=new TextDecoder();
const BUILD_MAX_SCENES=7,EXT_MARKER_ADDR=0xCFF0,SCENE_BASE_ADDR=0xD000,SCENE_STRIDE=0x0600;
const ENTITY_TYPES=['player','enemy','npc','door','item','platform','trigger','spawn'];
const ACTIONS=['dialog','cutscene','sound','flag','custom'];
const MOVE_DIRS=['none','horizontal','vertical','circular'];
const SCENE_TYPES=['sideview','topdown','static'];
const SCROLL_DIRS=['none','horizontal','vertical','both'];

// ── 1.5 UI/status ──────────────────────────────────────────────
const f15Style=document.createElement('style');
f15Style.textContent=`
#forge15State{font:8px/1.25 'Courier New',monospace;padding:2px 6px;border:1px solid var(--bdr);background:#11131a;white-space:nowrap;max-width:270px;overflow:hidden;text-overflow:ellipsis}
#forge15State.dirty{color:var(--ylw);border-color:#6d5b2c}#forge15State.clean{color:var(--grn);border-color:#315b31}
#buildSceneSet{border:1px solid var(--bdr);max-height:190px;overflow:auto;margin:4px 0;background:#0b0b10}
.f15-build-row{display:grid;grid-template-columns:20px 42px 1fr;align-items:center;gap:4px;padding:3px 4px;border-bottom:1px solid #181820;font-size:8px}
.f15-build-row.active{background:#142033}.f15-build-row input[type=number]{width:38px;background:var(--bg3);color:var(--txt);border:1px solid var(--bdr);font:8px monospace;padding:1px}
#forge15Preflight{font-size:8px;line-height:1.45;padding:5px;border:1px solid var(--bdr);background:#09090d;max-height:150px;overflow:auto}
#forge15Preflight .ok{color:var(--grn)}#forge15Preflight .warn{color:var(--ylw)}#forge15Preflight .err{color:var(--red)}
.f15-mini{font:8px monospace;padding:3px 6px;background:var(--bg3);color:var(--txt);border:1px solid var(--bdr);cursor:pointer}
#forge15SceneBuild{display:grid;grid-template-columns:auto 1fr auto 50px;gap:4px;align-items:center;margin:4px 0;font-size:8px}
`;
document.head.appendChild(f15Style);
const projectBar=document.querySelector('.project-bar');
const stateEl=document.createElement('span');stateEl.id='forge15State';stateEl.className='clean';stateEl.textContent='Ready';stateEl.title='Project state';
if(projectBar)projectBar.appendChild(stateEl);
function fmtTime(t){return t?new Date(t).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'}):'—';}
function updateStateStatus(message){
  if(window.Forge?.release)return Forge.release.updateStatus(message);
  if(!stateEl)return;
  stateEl.className=F15.dirty?'dirty':'clean';
  stateEl.textContent=message||(F15.dirty?'● Modified':'✓ Saved')+' · recovery '+fmtTime(F15.lastRecovery);
  stateEl.title='Modified: '+(F15.dirty?'yes':'no')+'\nBrowser save: '+fmtTime(F15.lastBrowserSave)+'\nRecovery: '+fmtTime(F15.lastRecovery)+'\nPortable save: '+fmtTime(F15.lastPortable);
}
function setDirty(reason='edit'){
  const nondirty=new Set(['selectTile','eyedrop','sceneSelect','sprSelect','welcome','fullSync']);
  if(!nondirty.has(reason)){F15.dirty=true;F15.lastEdit=Date.now();}
  updateStateStatus();
}

// ── Scene schema extension: build membership/order survives projects ──
const makeScene14=makeScene;
makeScene=function(ov={}){
  const sc=makeScene14(ov);
  sc.buildInclude=ov.buildInclude!==false;
  sc.buildOrder=clamp(ov.buildOrder??(typeof S!=='undefined'&&S.scenes?S.scenes.length:0),0,9999,0);
  return sc;
};
for(let i=0;i<S.scenes.length;i++){S.scenes[i].buildInclude=S.scenes[i].buildInclude!==false;S.scenes[i].buildOrder=clamp(S.scenes[i].buildOrder??i,0,9999,i);}
const projectData14=projectData;
projectData=function(){const d=projectData14();d.version=3;d.foundation='1.5';d.romLayout=3;return d;};
const dbDeserialize14=db_deserializeState;
db_deserializeState=function(json,options={}){const raw=typeof json==='string'?JSON.parse(json):copy15(json),missing=Array.isArray(raw?.scenes)?raw.scenes.map(sc=>!Number.isFinite(sc?.buildOrder)):[];const result=dbDeserialize14(raw,options);for(let i=0;i<S.scenes.length;i++){if(missing[i])S.scenes[i].buildOrder=i;if(raw?.scenes?.[i]?.buildInclude===undefined)S.scenes[i].buildInclude=true;}buildSceneSetUI();return result;};

// ── Lightweight edit scheduler. Save/copy active scene only at burst end. ──
function refreshActiveThumb(){
  try{
    saveCurrentScene();
    const row=document.querySelector('.scene-thumb[data-f15-index="'+S.activeScene+'"]');if(!row)return;
    const c=renderSceneThumb(S.scenes[S.activeScene],52,46),old=row.querySelector('canvas');if(old)old.replaceWith(c);else row.prepend(c);
    const name=row.querySelector('.st-name');if(name)name.textContent=(S.activeScene+1)+': '+S.scenes[S.activeScene].name;
  }catch(e){console.warn('thumbnail refresh',e);}
}
const buildSceneSel14=buildSceneSel;
buildSceneSel=function(){
  window.Forge?.services?.SceneContextUI?.refresh();
  const sel=$15('sceneSel');if(sel){sel.innerHTML='';S.scenes.forEach((sc,i)=>{const o=document.createElement('option');o.value=i;o.textContent=(i+1)+': '+sc.name;o.selected=i===S.activeScene;sel.appendChild(o);});}
  const browser=$15('sceneBrowser');if(!browser)return;
  browser.innerHTML='';S.scenes.forEach((sc,i)=>{
    const row=document.createElement('div');row.className='scene-thumb'+(i===S.activeScene?' active':'');row.dataset.f15Index=i;row.onclick=()=>switchScene(i);
    try{row.appendChild(renderSceneThumb(sc,52,46));}catch(_){}
    const text=document.createElement('div');text.style.minWidth='0';text.style.flex='1';const name=document.createElement('div');name.className='st-name';name.textContent=(i+1)+': '+sc.name;text.appendChild(name);
    const badges=document.createElement('div');badges.innerHTML=sceneSourceBadge(sc)+' <span class="st-badge '+(sc.buildInclude!==false?'authored':'imported')+'">'+(sc.buildInclude!==false?'build':'skip')+'</span>';text.appendChild(badges);row.appendChild(text);browser.appendChild(row);
  });
  buildSceneSetUI();
};
function scheduleActiveCommit(reason){clearTimeout(F15.thumbTimer);F15.thumbTimer=setTimeout(()=>{if(reason==='renameScene'){saveCurrentScene();buildSceneSel();}else refreshActiveThumb();},140);}
markEdited=function(reason='edit'){
  findLastTile=-1;setDirty(reason);render();scheduleActiveCommit(reason);broadcastState(reason);window.Forge?.services?.SceneContextUI?.changed(reason);
};
// Full project sync is retained for compatibility, but only after an edit burst.
broadcastState=function(reason){if(!BC||syncApplying)return;clearTimeout(F15.syncTimer);F15.syncTimer=setTimeout(()=>{try{saveCurrentScene();BC.postMessage({type:'state',session:syncSession,peer:syncPeer,seq:++syncSeq,state:projectData(),reason});}catch(e){reportError(e);}},180);};

// ── Build scene-set UI and validation ───────────────────────────
const codeSide=$15('sideCode');
const packBox=$15('cfgPackScenes');
const buildSetSection=document.createElement('section');
buildSetSection.innerHTML='<h3>Build Scene Set</h3><p style="font-size:8px;color:var(--dim)">Workspace may contain 64 scenes. NROM viewer builds up to 7 selected scenes. Door targets are remapped to build order.</p><div id="buildSceneSet"></div><div style="display:flex;gap:4px;margin:4px 0"><button class="f15-mini" id="forge15PreflightBtn">Preflight Build</button><button class="f15-mini" id="forge15IncludeFirst7">Include first 7</button></div><div id="forge15Preflight"><span class="warn">Run preflight before exporting a ROM.</span></div>';
if(packBox){const parent=packBox.closest('label')?.parentElement||packBox.parentElement;parent?.after(buildSetSection);}else codeSide?.appendChild(buildSetSection);
function selectedSceneEntries(){return S.scenes.map((sc,index)=>({sc,index,order:clamp(sc.buildOrder??index,0,9999,index)})).filter(x=>x.sc.buildInclude!==false).sort((a,b)=>a.order-b.order||a.index-b.index);}
function buildSceneSetUI(){const box=$15('buildSceneSet');if(!box)return;box.innerHTML='';S.scenes.forEach((sc,i)=>{const row=document.createElement('div');row.className='f15-build-row'+(i===S.activeScene?' active':'');const check=document.createElement('input');check.type='checkbox';check.checked=sc.buildInclude!==false;check.title='Include in ROM build';check.onchange=()=>{snapshot();sc.buildInclude=check.checked;setDirty('buildSet');buildSceneSel();};const order=document.createElement('input');order.type='number';order.min=0;order.max=9999;order.value=sc.buildOrder??i;order.title='Build order';order.onchange=()=>{snapshot();sc.buildOrder=clamp(order.value,0,9999,i);setDirty('buildSet');buildSceneSetUI();};const name=document.createElement('span');name.textContent=(i+1)+': '+sc.name;name.title=sc.name;row.append(check,order,name);box.appendChild(row);});}
$15('forge15IncludeFirst7').onclick=()=>{snapshot();S.scenes.forEach((sc,i)=>{sc.buildInclude=i<7;sc.buildOrder=i;});setDirty('buildSet');buildSceneSel();};

// Also expose build membership in the active scene properties panel.
const buildFields=document.createElement('div');buildFields.id='forge15SceneBuild';buildFields.innerHTML='<label>Build</label><input id="spBuildInclude" type="checkbox"><label>Order</label><input id="spBuildOrder" type="number" min="0" max="9999">';
$15('scenePropsPanel')?.appendChild(buildFields);
$15('spBuildInclude').onchange=function(){const sc=S.scenes[S.activeScene];snapshot();sc.buildInclude=this.checked;setDirty('buildSet');buildSceneSel();};
$15('spBuildOrder').onchange=function(){const sc=S.scenes[S.activeScene];snapshot();sc.buildOrder=clamp(this.value,0,9999,S.activeScene);setDirty('buildSet');buildSceneSetUI();};
const spLoad14=sp_loadUI;
sp_loadUI=function(sc){spLoad14(sc);if($15('spBuildInclude'))$15('spBuildInclude').checked=sc.buildInclude!==false;if($15('spBuildOrder'))$15('spBuildOrder').value=sc.buildOrder??S.activeScene;};

function remapBuildScenes(entries){
  if(!entries.length)throw Error('Select at least one scene for the ROM build.');
  if(entries.length>BUILD_MAX_SCENES)throw Error('Build set contains '+entries.length+' scenes; NROM viewer maximum is '+BUILD_MAX_SCENES+'. Uncheck scenes or change the build set.');
  const map=new Map(entries.map((e,i)=>[e.index,i]));
  const copies=entries.map(e=>{const sc=makeScene({...copy15(e.sc),id:e.sc.id});sc._sourceIndex=e.index;for(const ent of sc.entities||[]){if(ent.type==='door'&&Number.isInteger(ent.targetScene)&&ent.targetScene>=0){if(!map.has(ent.targetScene))throw Error('Scene "'+e.sc.name+'" has a door to excluded scene "'+(S.scenes[ent.targetScene]?.name||ent.targetScene)+'". Include it or unlink the door.');ent.targetScene=map.get(ent.targetScene);}}sceneLinks(sc);return sc;});
  return {scenes:copies,map};
}
function strBytes15(v,label){const b=utf8.encode(String(v||''));if(b.length>255)throw Error(label+' exceeds 255 UTF-8 bytes in ROM metadata');return b;}
function push16(a,v){a.push(v&255,(v>>8)&255);}
function encodeEntityExt(e){
  const type=Math.max(0,ENTITY_TYPES.indexOf(e.type)),t=_et(e.type),base=[0,type,clamp(e.x,0,255),clamp(e.y,0,239),clamp(e.type==='platform'?(e.pw||32):(e.w||t.w),0,255),clamp(e.h||t.h,0,255),e.sprTile>=0?clamp(e.sprTile,0,255):255,0,0],extra=[];let flags=0;
  const add=(bit,...vals)=>{flags|=1<<bit;extra.push(...vals.map(v=>v&255));};
  if(e.variant!==undefined)add(0,clamp(e.variant,0,255));if(e.dir!==undefined)add(1,clamp(e.dir,0,255));if(e.speed!==undefined)add(2,clamp(e.speed,0,255));
  if(Number.isInteger(e.targetScene)&&e.targetScene>=0)add(3,clamp(e.targetScene,0,254),clamp(e.targetX,0,255),clamp(e.targetY,0,239));
  if(e.action!==undefined){const n=ACTIONS.indexOf(e.action);add(4,n>=0?n:255);}if(e.moveDir!==undefined){const n=MOVE_DIRS.indexOf(e.moveDir);add(5,n>=0?n:255);}if(e.range!==undefined)add(6,clamp(e.range,0,255));
  for(const [bit,key]of [[7,'name'],[8,'dialog'],[9,'value']]){if(e[key]){const b=strBytes15(e[key],'Entity '+key);flags|=1<<bit;extra.push(b.length,...b);}}
  base[7]=flags&255;base[8]=(flags>>8)&255;base.push(...extra);if(base.length>255)throw Error('Entity metadata record is too large');base[0]=base.length;return base;
}
function encodeSceneExt(sc){
  const rec=[];push16(rec,clamp(sc.view?.x,0,65535));push16(rec,clamp(sc.view?.y,0,65535));push16(rec,clamp(sc.view?.w,1,65535,256));push16(rec,clamp(sc.view?.h,1,65535,240));rec.push(clamp(sc.view?.hBorder,0,255),clamp(sc.view?.vBorder,0,255),Number.isInteger(sc.view?.followEnt)&&sc.view.followEnt>=0?clamp(sc.view.followEnt,0,254):255,Math.max(0,SCENE_TYPES.indexOf(sc.sceneType)),Math.max(0,SCROLL_DIRS.indexOf(sc.scrollDir)),sc.gravity&255,sc.bgColor&63);
  const name=strBytes15(sc.name,'Scene name');rec.push(name.length,...name);if((sc.entities?.length||0)>16)throw Error('Scene "'+sc.name+'" exceeds 16 runtime entities');rec.push(sc.entities.length);for(const e of sc.entities)rec.push(...encodeEntityExt(e));return Uint8Array.from(rec);
}
function buildExtension15(scenes){
  const records=scenes.map(encodeSceneExt),header=8+records.length*4,total=header+records.reduce((n,r)=>n+r.length,0),out=new Uint8Array(total);out.set(utf8.encode('NFEX'),0);out[4]=1;out[5]=records.length;let pos=header;for(let i=0;i<records.length;i++){out[8+i*4]=pos&255;out[9+i*4]=pos>>8;out[10+i*4]=records[i].length&255;out[11+i*4]=records[i].length>>8;out.set(records[i],pos);pos+=records[i].length;}return out;
}
function findExtensionAddress(length,used){if(!Number.isInteger(length)||length<0)throw Error('Runtime metadata size must be a nonnegative integer');for(let start=0xC200;start+length<=EXT_MARKER_ADDR;start+=16){let ok=true;for(let a=start;a<start+length;a++)if(used.has(a)){ok=false;break;}if(ok)return start;}throw Error('Runtime metadata needs '+length+' bytes but no contiguous space remains between code and $CFF0. Shorten code/strings, exclude scenes, or disable scene packing.');}
function planBuild15(){
  saveCurrentScene();const entries=selectedSceneEntries(),mapped=remapBuildScenes(entries),custom=!!document.getElementById('codeInput').value.trim(),pack=!custom||S.packScenes!==false;let atlas={chr:S.chr,sprChr:S.sprChr,tileProps:S.tileProps,scenes:mapped.scenes};
  if(pack)atlas=buildGraphicsAtlas(mapped.scenes,custom);
  for(let i=0;i<atlas.scenes.length;i++){const sc=atlas.scenes[i],o=expandOAM(sc.oam);if(o.length>64)throw Error('Scene "'+sc.name+'" needs '+o.length+' 8×8 OAM entries; maximum 64');for(const s of o)if(s.y===0)throw Error('Scene "'+sc.name+'" has a sprite at screen Y=0, which normal NES OAM cannot encode.');if((sc.entities?.length||0)>16||(sc.links?.length||0)>16)throw Error('Scene "'+sc.name+'" exceeds the legacy 16 entity/link scene block limit.');}
  const ext=pack?buildExtension15(atlas.scenes):new Uint8Array();return {entries,mapped,atlas,custom,pack,ext};
}
function showPreflight15(){const box=$15('forge15Preflight');try{const p=planBuild15(),lines=[];lines.push('<div class="ok">✓ '+p.entries.length+' scene(s) selected: '+p.entries.map(e=>esc(e.sc.name)).join(' → ')+'</div>');if(p.pack)lines.push('<div class="ok">✓ Runtime metadata schema v3: '+p.ext.length.toLocaleString()+' bytes</div>');lines.push('<div class="ok">✓ BG/Sprite atlas capacity valid</div>');if(S.instruments.length||S.animations.length)lines.push('<div class="warn">Audio/animation authoring is preserved in the project but still has no generated ROM playback engine.</div>');box.innerHTML=lines.join('');return p;}catch(e){box.innerHTML='<div class="err">✗ '+esc(e.message)+'</div>';return null;}}
$15('forge15PreflightBtn').onclick=showPreflight15;window.forge15_preflight=showPreflight15;

// ── ROM layout v3: keep v2 scene blocks for viewer compatibility,
//    add a versioned extension area preserving rich authoring metadata. ──
const extractScenes14=extractScenes;
function decodeEntityExt(bytes,start,end){if(start>=end)return null;const len=bytes[start],stop=Math.min(end,start+len);if(len<9||stop>bytes.length)return null;let p=start+1;const e={type:ENTITY_TYPES[bytes[p++]]||'trigger',x:bytes[p++],y:bytes[p++],w:bytes[p++],h:bytes[p++],sprTile:bytes[p++]===255?-1:bytes[p-1]},flags=bytes[p++]|(bytes[p++]<<8);const take=()=>p<stop?bytes[p++]:0;if(flags&1)e.variant=take();if(flags&2)e.dir=take();if(flags&4)e.speed=take();if(flags&8){e.targetScene=take();e.targetX=take();e.targetY=take();}if(flags&16)e.action=ACTIONS[take()]||'custom';if(flags&32)e.moveDir=MOVE_DIRS[take()]||'none';if(flags&64)e.range=take();for(const [bit,key]of [[128,'name'],[256,'dialog'],[512,'value']])if(flags&bit){const n=take();e[key]=decode8.decode(bytes.slice(p,Math.min(stop,p+n)));p+=n;}if(e.type==='platform')e.pw=e.w;if(e.type==='door'&&!Number.isInteger(e.targetScene))e.targetScene=-1;return e;}
function applyExtension15(prg,base,marker,scenes){try{const extAddr=prg[marker+10]|(prg[marker+11]<<8),extLen=prg[marker+12]|(prg[marker+13]<<8);if(!extLen)return;const off=base+(extAddr-0xC000),b=prg.slice(off,off+extLen);if(decode8.decode(b.slice(0,4))!=='NFEX'||b[4]!==1||b[5]!==scenes.length)return;for(let i=0;i<scenes.length;i++){const ro=b[8+i*4]|(b[9+i*4]<<8),rl=b[10+i*4]|(b[11+i*4]<<8);let p=ro,end=ro+rl;if(end>b.length||p+15>end)continue;const sc=scenes[i];sc.view.x=b[p]|(b[p+1]<<8);p+=2;sc.view.y=b[p]|(b[p+1]<<8);p+=2;sc.view.w=b[p]|(b[p+1]<<8);p+=2;sc.view.h=b[p]|(b[p+1]<<8);p+=2;sc.view.hBorder=b[p++];sc.view.vBorder=b[p++];sc.view.followEnt=b[p]===255?-1:b[p];p++;sc.sceneType=SCENE_TYPES[b[p++]]||sc.sceneType;sc.scrollDir=SCROLL_DIRS[b[p++]]||sc.scrollDir;sc.gravity=b[p++]>127?b[p-1]-256:b[p-1];sc.bgColor=b[p++]&63;const nameLen=b[p++];sc.name=decode8.decode(b.slice(p,p+nameLen))||sc.name;p+=nameLen;const count=b[p++];const ents=[];for(let n=0;n<count&&p<end;n++){const e=decodeEntityExt(b,p,end);if(!e)break;ents.push(e);p+=b[p];}sc.entities=ents;sceneLinks(sc);sc.captureMeta={...(sc.captureMeta||{}),mode:'forge-rom',layoutVersion:3};}}
  catch(e){console.warn('v3 extension parse failed',e);}}
extractScenes=function(prg,prgSize,palettes){const base=prgSize===32768?0x4000:0;if((prgSize===16384||prgSize===32768)){const marker=base+0xFF0;if(decode8.decode(prg.slice(marker,marker+8))==='NFORGE15'&&prg[marker+8]===3){const temp=prg.slice();temp.set(utf8.encode('NFORGE14'),marker);temp[marker+8]=2;const scenes=extractScenes14(temp,prgSize,palettes);applyExtension15(prg,base,marker,scenes);return scenes;}}return extractScenes14(prg,prgSize,palettes);};

const buildNesRom14=buildNesRom;
buildNesRom=function(){
  window._lastBuiltRom=null;const blog=$15('buildLog');blog.textContent='';const log=(m,k='bl-ok')=>{const d=document.createElement('div');d.className=k;d.textContent=m;blog.appendChild(d);};
  try{
    const plan=planBuild15(),{atlas,custom,pack,ext}=plan;S.asmSource=$15('codeInput').value;
    if(custom&&!asm_assemble())throw Error(S.asmErrors.length?'Assembly failed — '+S.asmErrors[0].msg:'No executable code was emitted');
    const min=custom?Math.min(...S._asmWrites.map(x=>x[0])):0xC000;if(min<0x8000)throw Error('ROM code must live at $8000–$FFFF. Use .rs for RAM variables.');const base=min<0xC000?0x8000:0xC000,prgSize=65536-base;let PRG=new Uint8Array(prgSize),engine=null;const writes=new Set();
    if(custom){for(const [addr,val]of S._asmWrites){if(addr<base||addr>0xFFFF)throw Error('Code address $'+addr.toString(16)+' is outside the selected PRG window');PRG[addr-base]=val;writes.add(addr);}for(let a=0xFFFA;a<=0xFFFF;a++)if(!writes.has(a))throw Error('Missing interrupt vectors: emit NMI, RESET and IRQ words at $FFFA.');}
    else{engine=makeViewerEngine(atlas.scenes.length);PRG=engine.prg;for(let a=0xC000;a<0xC000+engine.size;a++)writes.add(a);}
    function reserve(addr,bytes,label){if(addr<base||addr+bytes.length>0xFFFA)throw Error(label+' exceeds ROM capacity');for(let i=0;i<bytes.length;i++)if(writes.has(addr+i))throw Error(label+' overlaps code at $'+(addr+i).toString(16).toUpperCase());PRG.set(bytes,addr-base);for(let i=0;i<bytes.length;i++)writes.add(addr+i);}
    if(pack){for(let si=0;si<atlas.scenes.length;si++){const sc=atlas.scenes[si],oam=expandOAM(sc.oam),block=new Uint8Array(1536);block.set(sc.nt);block.set(sc.attr,960);block.set(sc.pal.flat(),1024);block.set(sc.sprPal.flat(),1040);block[1056]=oam.length;oam.forEach((s,i)=>block.set([(s.y-1)&255,s.tile,s.attr,s.x],1057+i*4));packSceneMeta(block,sc);reserve(SCENE_BASE_ADDR+si*SCENE_STRIDE,block,'Scene '+(si+1)+' data');}
      reserve(SCENE_BASE_ADDR+atlas.scenes.length*SCENE_STRIDE,Uint8Array.from(atlas.tileProps),'Collision table');
      const extAddr=findExtensionAddress(ext.length,writes);reserve(extAddr,ext,'Runtime metadata extension');
      const marker=new Uint8Array(16);marker.set(utf8.encode('NFORGE15'));marker[8]=3;marker[9]=atlas.scenes.length;marker[10]=extAddr&255;marker[11]=extAddr>>8;marker[12]=ext.length&255;marker[13]=ext.length>>8;reserve(EXT_MARKER_ADDR,marker,'NES Forge marker');
      log('Packed '+atlas.scenes.length+' selected scene(s); door targets remapped to build order.');log('Runtime metadata v3: '+ext.length+' bytes at $'+extAddr.toString(16).toUpperCase()+' — entity properties/camera fields retained.');}
    else if(S.chr.length>256||S.sprChr.length>256)throw Error('Unpacked custom CHR exceeds one 256-tile bank. Compile/select a static bank first.');
    const header=new Uint8Array(16);header.set([0x4E,0x45,0x53,0x1A,prgSize/16384,1,(S.mirroring==='v'?1:0)|(S.hasSRAM?2:0)]);const rom=new Uint8Array(16+prgSize+8192);rom.set(header);rom.set(PRG,16);rom.set(encodeTiles(atlas.chr),16+prgSize);rom.set(encodeTiles(atlas.sprChr),16+prgSize+4096);window._lastBuiltRom=rom;
    log('Built NROM: '+prgSize/1024+' KB PRG + 8 KB CHR • '+rom.length+' bytes.');log(custom?'Custom code built with overlap/resource checks.':'Scene viewer engine: START cycles only the selected build scenes.','bl-warn');if(S.instruments.length||S.animations.length)log('Audio/animation authoring preserved; automatic ROM playback runtime remains a 2.0 milestone.','bl-warn');
    if(!window._buildAndRunMode)download(rom,(S.projectName||'game').replace(/[^\w-]/g,'_')+'.nes');showToast('1.5 build successful — '+rom.length+' bytes');return rom;
  }catch(e){log(e.message,'bl-err');reportError(e);return null;}
};

F15.build={selectedSceneEntries,plan:planBuild15,encodeExtension:buildExtension15,showPreflight:showPreflight15};

// ── IndexedDB crash recovery (migrates old localStorage recovery) ──
const REC_DB_VER=2;
db_open=function(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,REC_DB_VER);req.onupgradeneeded=e=>{const db=e.target.result;if(!db.objectStoreNames.contains(DB_STORE))db.createObjectStore(DB_STORE,{keyPath:'id',autoIncrement:true});if(!db.objectStoreNames.contains(F15.recoveryStore))db.createObjectStore(F15.recoveryStore,{keyPath:'key'});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});};
async function recoveryPut(state){let db;try{db=await db_open();await new Promise((resolve,reject)=>{const tx=db.transaction(F15.recoveryStore,'readwrite');tx.objectStore(F15.recoveryStore).put({key:F15.recoveryKey,timestamp:Date.now(),state});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});return true;}finally{db?.close();}}
async function recoveryGet(){let db;try{db=await db_open();return await new Promise((resolve,reject)=>{const tx=db.transaction(F15.recoveryStore,'readonly'),r=tx.objectStore(F15.recoveryStore).get(F15.recoveryKey);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error);});}finally{db?.close();}}
async function recoveryDelete(){let db;try{db=await db_open();await new Promise((resolve,reject)=>{const tx=db.transaction(F15.recoveryStore,'readwrite');tx.objectStore(F15.recoveryStore).delete(F15.recoveryKey);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}finally{db?.close();}}
async function migrateLegacyRecovery(old){try{if(!old)return;let parsed=null;try{parsed=JSON.parse(old);}catch(_){return;}if(parsed?.indexedDB)return;if(!parsed?.scenes)return;await recoveryPut(old);localStorage.setItem(AUTOSAVE_KEY,JSON.stringify({indexedDB:true,timestamp:Date.now()}));}catch(e){console.warn('legacy recovery migration',e);}}
db_autoSave=function(){if(recoveryPending)return Promise.resolve(false);let state;try{state=db_serializeState();const now=Date.now();try{localStorage.setItem(AUTOSAVE_KEY,JSON.stringify({indexedDB:true,timestamp:now}));}catch(_){}return recoveryPut(state).then(()=>{F15.lastRecovery=now;autoSaveWarning=false;updateStateStatus();return true;}).catch(e=>{if(!autoSaveWarning){autoSaveWarning=true;const el=$15('issueStatus');if(el){el.textContent='Recovery autosave unavailable — use Save Project As';el.title=e.message;}}return false;});}catch(e){reportError(e);return Promise.resolve(false);}};
db_checkAutosave=function(){let local=null;try{local=localStorage.getItem(AUTOSAVE_KEY);}catch(_){}recoveryPending=!!local;$15('autosaveBanner').classList.toggle('show',recoveryPending);if(local){try{const p=JSON.parse(local);if(p?.timestamp)F15.lastRecovery=p.timestamp;}catch(_){}void migrateLegacyRecovery(local);}void recoveryGet().then(rec=>{if(rec){recoveryPending=true;F15.lastRecovery=rec.timestamp||F15.lastRecovery;$15('autosaveBanner').classList.add('show');}updateStateStatus();}).catch(e=>{if(!local){recoveryPending=false;autoSaveWarning=true;$15('issueStatus').textContent='Browser recovery unavailable — portable Save As still works';}});updateStateStatus();return recoveryPending;};
db_restoreAutosave=async function(){try{let state=null;const local=(()=>{try{return localStorage.getItem(AUTOSAVE_KEY);}catch(_){return null;}})();if(local){try{const p=JSON.parse(local);if(p?.scenes)state=local;}catch(_){}}const rec=state?null:await recoveryGet();if(state||rec?.state)db_deserializeState(state||rec.state);await recoveryDelete();try{localStorage.removeItem(AUTOSAVE_KEY);}catch(_){}recoveryPending=false;$15('autosaveBanner').classList.remove('show');broadcastState('restore');F15.dirty=true;updateStateStatus('Recovered workspace · save when ready');showToast('Recovery restored');}catch(e){reportError(e);}};
db_dismissAutosave=function(){recoveryPending=false;$15('autosaveBanner').classList.remove('show');try{localStorage.removeItem(AUTOSAVE_KEY);}catch(_){}void recoveryDelete().catch(reportError);};
clearInterval(_autoSaveTimer);_autoSaveTimer=setInterval(db_autoSave,30000);
const cleanCache14=cleanCache;cleanCache=async function(){if(!confirm('Clear crash-recovery data and stop temporary audio?\nYour open workspace and saved projects will NOT be deleted.'))return;try{if(!await Forge.services.ProjectStore.dismissRecovery())return;aud_stop();emuPause();if(aud_ctx){await aud_ctx.close().catch(()=>{});aud_ctx=null;aud_channels=[null,null,null,null,null];aud_gains=[null,null,null,null,null];aud_masterGain=null;aud_noiseBuffer=null;}showToast('Temporary recovery/audio state cleared. Saved projects preserved.');}catch(e){reportError(e);}};

// Save status integration.
const dbSave14=db_save;db_save=async function(name){const id=await dbSave14(name);if(id!=null){F15.dirty=false;F15.lastBrowserSave=Date.now();updateStateStatus();}return id;};
const projectExport14=project_export;
const exportAll14=exportAll;

// Append 1.5 docs without replacing the established reference.
const renderDocs14=renderDocs;renderDocs=function(){renderDocs14();const doc=document.querySelector('#sideDocs .doc');if(!doc)return;const s=document.createElement('section');s.innerHTML='<h2>1.5 Foundation</h2><p><b>Foundation release:</b> existing emulator, exact runtime capture, CHR, sprite, audio, animation, assembler and Save As behavior are preserved. Edit bursts no longer rebuild every scene thumbnail on every mousemove. Crash recovery is stored in IndexedDB instead of localStorage and a project-state indicator shows modified/recovery status.</p><p><b>Build scene set:</b> a workspace may keep up to 64 scenes while the NROM scene viewer compiles up to seven explicitly selected scenes. Build order is independent of editor order. Door targets are remapped and a door pointing to an excluded scene fails preflight instead of silently producing a bad index.</p><p><b>ROM metadata layout v3:</b> the legacy $0600 scene blocks remain readable by the viewer, while an NFORGE15/NFEX extension preserves camera X/Y/follow target and the richer entity fields authored by the editor (sprite binding, variants, direction, speed, targets, actions, movement, range, names/dialog/value strings). The default viewer still does not execute those gameplay semantics; custom code can consume them.</p><p><b>Still future work:</b> multi-screen world maps/metatile authoring, metasprite composition, generated entity/collision/animation/music runtime, mapper-backed resource linking, and a bank-aware reverse-engineering project model remain later milestones.</p>';doc.prepend(s);};

// Version and startup refresh.
document.querySelector('h1').innerHTML='NES FORGE <small style="color:var(--grn)">1.5 FOUNDATION</small>';
document.title='NES Forge 1.5 — Foundation';
buildSceneSel();sp_loadUI(S.scenes[S.activeScene]);buildSceneSetUI();// Current ProjectStore bootstrap reports recovery status.
})();


