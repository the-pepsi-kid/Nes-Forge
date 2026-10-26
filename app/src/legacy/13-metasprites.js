/* NES Forge 1.6.3 — reusable metasprite frame authoring.
 * Append inside the existing runtime script, after the 1.6.2 layers.
 * Persistence and ROM trailer handling are supplied by the integration layer.
 */
(()=>{
'use strict';
const F=window.Forge163=window.Forge163||{}, $=id=>document.getElementById(id);
const MAX_FRAMES=256, MAX_PIECES=128, cp=v=>JSON.parse(JSON.stringify(v));
let serial=0;
const uid=prefix=>prefix+'_'+Date.now().toString(36)+'_'+(++serial).toString(36)+'_'+Math.random().toString(36).slice(2,6);
const int=(v,a,b,d=a)=>clamp(v,a,b,d);
const fitsPosition=n=>Number.isInteger(n)&&n>=-2048&&n<=2047;
const fitsText=s=>new TextEncoder().encode(String(s)).length<=255;
function positionError(){showToast('Position must stay between -2048 and 2047. Move the piece or origin before this operation.');return null;}
function namedCopy(name,suffix){let base=String(name);while(!fitsText(base+suffix))base=Array.from(base).slice(0,-1).join('');return base+suffix;}
const UI={frameId:'',pieceId:'',tile:0,zoom:4,grid:true,boxes:true,hardware:false,snap:1,viewport:null,drag:null,autoSelect:true,choiceReason:''};

function normalize(raw={},index=0,usedIds=new Set()){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))raw={};
  if(Array.isArray(raw.pieces)&&raw.pieces.length>MAX_PIECES)throw Error('Metasprite exceeds '+MAX_PIECES+' authored pieces');
  let id=String(raw.id||'');if(!id||usedIds.has(id))id=uid('ms');usedIds.add(id);
  const pieceIds=new Set(),mode=Number(raw.spriteMode)===16?16:8;
  return {id,name:String(raw.name||'Frame '+(index+1)),sceneId:String(raw.sceneId||S.scenes[S.activeScene]?.id||''),spriteMode:mode,originX:int(raw.originX,-2048,2047,0),originY:int(raw.originY,-2048,2047,0),pieces:(Array.isArray(raw.pieces)?raw.pieces:[]).slice(0,MAX_PIECES).map(p=>{
    if(!p||typeof p!=='object')p={};
    let pid=String(p.id||'');if(!pid||pieceIds.has(pid))pid=uid('mp');pieceIds.add(pid);
    const tile=int(p.tile,0,255);
    return {id:pid,tile,tile2:int(p.tile2,0,255,(tile+1)&255),x:int(p.x,-2048,2047,0),y:int(p.y,-2048,2047,0),pal:int(p.pal,0,3),flipH:!!p.flipH,flipV:!!p.flipV,behind:!!p.behind};
  })};
}
function normalizeAll(value){if(Array.isArray(value)&&value.length>MAX_FRAMES)throw Error('Metasprite library exceeds '+MAX_FRAMES+' frames');const used=new Set();return (Array.isArray(value)?value:[]).map((v,i)=>normalize(v,i,used));}
function ensure(){if(!Array.isArray(S.metasprites))S.metasprites=[];if(UI.frameId&&!S.metasprites.some(f=>f.id===UI.frameId))UI.frameId=S.metasprites[0]?.id||'';if(!UI.frameId&&UI.autoSelect&&S.metasprites.length)UI.frameId=S.metasprites[0].id;const f=current();if(UI.pieceId&&!f?.pieces?.some(p=>p.id===UI.pieceId))UI.pieceId=f?.pieces?.[0]?.id||'';return S.metasprites;}
function current(){return S.metasprites?.find(f=>f.id===UI.frameId)||null;}
function piece(){return current()?.pieces.find(p=>p.id===UI.pieceId)||null;}
function get(id){return S.metasprites?.find(f=>f.id===id)||null;}
// Called by ProjectStore's optional view restoration after assets are installed.
// Suppress the legacy first-frame fallback when the user needs an explicit choice.
function restoreSelection(id,pieceId,reason=''){
 UI.autoSelect=false;UI.choiceReason=reason;UI.frameId=get(id)?id:'';
 const f=current();UI.pieceId=typeof pieceId==='string'?(f?.pieces.some(p=>p.id===pieceId)?pieceId:''):(f?.pieces[0]?.id||'');
 UI.viewport=null;UI.drag=null;
}
function source(frame){const sc=S.scenes.find(s=>s.id===frame?.sceneId);if(!sc)return null;return sc===S.scenes[S.activeScene]?{...sc,sprChr:S.sprChr,sprPal:S.sprPal,oam:S.oam}:sc;}
function bounds(frame){
  const ps=frame?.pieces||[],h=frame?.spriteMode===16?16:8;
  if(!ps.length)return {x:0,y:0,w:0,h:0,right:0,bottom:0};
  const x=Math.min(...ps.map(p=>p.x)),y=Math.min(...ps.map(p=>p.y)),right=Math.max(...ps.map(p=>p.x+8)),bottom=Math.max(...ps.map(p=>p.y+h));
  return {x,y,w:right-x,h:bottom-y,right,bottom};
}
function warnings(frame){
  const ps=frame?.pieces||[],h=frame?.spriteMode===16?16:8,lines=new Map();
  for(const p of ps)for(let y=p.y;y<p.y+h;y++)lines.set(y,(lines.get(y)||0)+1);
  const overflowLines=Array.from(lines,([line,count])=>({line,count})).filter(r=>r.count>8).sort((a,b)=>a.line-b.line);
  const maxScanline=Math.max(0,...lines.values()),unpackedPairs=h===16?ps.filter(p=>(p.tile&1)||p.tile2!==p.tile+1).length:0;
  const sc=source(frame),missingTiles=sc?ps.filter(p=>!sc.sprChr?.[p.tile]||(h===16&&!sc.sprChr?.[p.tile2])).length:ps.length;
  return {oamCount:ps.length,oamOverflow:Math.max(0,ps.length-64),maxScanline,overflowLines,unpackedPairs,missingSource:!sc,missingTiles,empty:!ps.length};
}
function pixel(frame,p,px,py,sc){const h=frame.spriteMode===16?16:8,fy=p.flipV?h-1-py:py,fx=p.flipH?7-px:px;return sc.sprChr?.[fy<8?p.tile:p.tile2]?.[fy&7]?.[fx]||0;}
function draw(ctx,frame,anchorX=0,anchorY=0,scale=1,options={}){
  const sc=source(frame);if(!sc||!ctx)return false;
  const ps=frame.pieces||[],h=frame.spriteMode===16?16:8,claims=new Set(),lineCounts=new Map();
  ctx.imageSmoothingEnabled=false;
  for(let i=0;i<ps.length;i++){
    if(options.hardware&&i>=64)break;
    const p=ps[i],pal=sc.sprPal?.[p.pal]||sc.sprPal?.[0]||[15,0,16,48];
    for(let py=0;py<h;py++){
      const y=p.y+py,keyY=y-frame.originY,prev=lineCounts.get(y)||0;
      lineCounts.set(y,prev+1);if(options.hardware&&prev>=8)continue;
      for(let px=0;px<8;px++){
        const ci=pixel(frame,p,px,py,sc);if(!ci)continue;
        const key=(p.x+px)+','+y;if(claims.has(key))continue;claims.add(key);
        const rgb=NP[pal[ci]]||NP[15];ctx.fillStyle='rgb('+rgb.join(',')+')';
        ctx.fillRect(anchorX+(p.x+px-frame.originX)*scale,anchorY+keyY*scale,scale,scale);
      }
    }
  }
  return true;
}
function toOAM(frame,anchorX=0,anchorY=0){return (frame?.pieces||[]).map(p=>({x:anchorX+p.x-frame.originX,y:anchorY+p.y-frame.originY,tile:p.tile,tile2:p.tile2,attr:(p.pal&3)|(p.flipH?64:0)|(p.flipV?128:0)|(p.behind?32:0),height:frame.spriteMode===16?16:8,active:true}));}
function changed(reason){ensure();notify(reason||'metaspriteEdit');renderUI();renderCanvas();window.dispatchEvent(new CustomEvent('forge:metasprites-changed',{detail:{reason,frameId:UI.frameId}}));}
function select(id){if(id&&!get(id))return false;UI.autoSelect=false;UI.choiceReason='';UI.frameId=id;UI.pieceId=get(id)?.pieces?.[0]?.id||'';UI.viewport=null;renderUI();renderCanvas();return true;}
function create(options={}){
  ensure();if(S.metasprites.length>=MAX_FRAMES){showToast('Metasprite frame limit is '+MAX_FRAMES);return null;}
  if(options.pieces?.length>MAX_PIECES){showToast('Metasprite piece limit is '+MAX_PIECES);return null;}
  if(options.name!==undefined&&!fitsText(options.name)){showToast('Frame names may contain at most 255 UTF-8 bytes.');return null;}
  for(const k of ['originX','originY'])if(options[k]!==undefined&&!fitsPosition(options[k]))return positionError();
  for(const p of options.pieces||[])for(const k of ['x','y'])if(p[k]!==undefined&&!fitsPosition(p[k]))return positionError();
  const f=normalize(options,S.metasprites.length,new Set(S.metasprites.map(x=>x.id)));snapshot();S.metasprites.push(f);UI.frameId=f.id;UI.pieceId=f.pieces[0]?.id||'';UI.viewport=null;changed('metaspriteCreate');return f;
}
function duplicateFrame(mirror=false){const f=current();if(!f)return null;const next={...cp(f),id:null,name:namedCopy(f.name,mirror?' mirrored':' copy')};next.pieces.forEach(p=>{p.id=null;if(mirror){p.x=2*f.originX-p.x-8;p.flipH=!p.flipH;}});return create(next);}
function capture(){
  const sc=S.scenes[S.activeScene],ps=(S.oam||[]).filter(p=>p.active!==false);if(!ps.length){showToast('The active scene has no visible OAM pieces to capture.');return null;}
  const heights=new Set(ps.map(p=>p.height===16?16:8));
  // Scene captures may contain mixed synthetic sizes; split pairs into 8x8 pieces.
  // A real NES frame uses a single global PPU sprite size.
  const mode=heights.size===1&&heights.has(16)?16:8,list=[];
  const left=Math.min(...ps.map(p=>p.x)),top=Math.min(...ps.map(p=>p.y));
  for(const p of ps){
    const q={tile:p.tile,tile2:p.tile2??((p.tile+1)&255),x:p.x-left,y:p.y-top,pal:p.attr&3,flipH:!!(p.attr&64),flipV:!!(p.attr&128),behind:!!(p.attr&32)};
    if(mode===8&&p.height===16){list.push({...q,tile:q.flipV?q.tile2:q.tile},{...q,tile:q.flipV?q.tile:q.tile2,y:q.y+8});}else list.push(q);
  }
  const f=create({name:namedCopy(sc.name,' OAM'),sceneId:sc.id,spriteMode:mode,originX:0,originY:0,pieces:list});
  if(f)showToast('Captured '+list.length+' piece(s)'+(heights.size>1?' · mixed source sizes converted to 8×8':'')+' · source scene retained');return f;
}
function addPiece(){
  let f=current();if(!f){f=create();if(!f)return;}
  if(f.pieces.length>=MAX_PIECES)return showToast('Editor limit: '+MAX_PIECES+' pieces per frame. Hardware limit is 64.');
  const prev=piece(),p={id:uid('mp'),tile:UI.tile,tile2:(UI.tile+1)&255,x:prev?prev.x+8:0,y:prev?prev.y:0,pal:prev?.pal||0,flipH:false,flipV:false,behind:false};
  if(!fitsPosition(p.x))return positionError();
  snapshot();f.pieces.push(p);UI.pieceId=p.id;UI.viewport=null;changed('metaspritePieceAdd');
}
function duplicatePiece(){const f=current(),p=piece();if(!f||!p)return;if(f.pieces.length>=MAX_PIECES)return showToast('Piece limit reached');if(!fitsPosition(p.x+8))return positionError();snapshot();const q={...p,id:uid('mp'),x:p.x+8};f.pieces.push(q);UI.pieceId=q.id;UI.viewport=null;changed('metaspritePieceDuplicate');}
function removePiece(){const f=current(),p=piece();if(!f||!p)return;const idx=f.pieces.indexOf(p);snapshot();f.pieces.splice(idx,1);UI.pieceId=f.pieces[Math.min(idx,f.pieces.length-1)]?.id||'';changed('metaspritePieceDelete');}
function moveOrder(delta){const f=current(),p=piece();if(!f||!p)return;const i=f.pieces.indexOf(p),j=i+delta;if(j<0||j>=f.pieces.length)return;snapshot();[f.pieces[i],f.pieces[j]]=[f.pieces[j],f.pieces[i]];changed('metaspriteOrder');}
function mirrorPiece(axis){const f=current(),p=piece();if(!p)return;const next=axis==='x'?2*f.originX-p.x-8:2*f.originY-p.y-f.spriteMode;if(!fitsPosition(next))return positionError();snapshot();if(axis==='x'){p.x=next;p.flipH=!p.flipH;}else{p.y=next;p.flipV=!p.flipV;}UI.viewport=null;changed('metaspritePieceMirror');}
function deleteFrame(){const f=current();if(!f)return;if(!confirm('Delete frame "'+f.name+'"? Any animation references remain visible as missing until reassigned. Undo can restore it.'))return;snapshot();S.metasprites=S.metasprites.filter(x=>x.id!==f.id);UI.frameId=S.metasprites[0]?.id||'';UI.pieceId='';UI.viewport=null;changed('metaspriteDelete');}
function setOrigin(){const f=current();if(!f)return;const b=bounds(f),x=Math.floor((b.x+b.right)/2),y=b.bottom;if(!fitsPosition(x)||!fitsPosition(y))return positionError();snapshot();f.originX=x;f.originY=y;changed('metaspriteOrigin');}

const style=document.createElement('style');style.textContent=`
#msWorkspace163{display:none;width:100%;max-width:1000px;min-width:340px;flex-direction:column;gap:12px;align-self:flex-start;padding:4px 8px 20px}
.ms-header163{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.ms-header163 h2{color:var(--acc);font-size:16px;letter-spacing:.6px}.ms-sub163{color:#888ba0;font-size:10px;line-height:1.6;margin-top:5px}.ms-tag163{white-space:nowrap;color:var(--grn);background:#173026;border:1px solid #2c563e;padding:6px 8px;font-size:9px}
.ms-toolbar163{display:flex;align-items:center;flex-wrap:wrap;gap:7px;padding:9px;background:var(--bg2);border:1px solid var(--bdr)}
#msWorkspace163 button,#sideMetasprites163 button{background:#1a2230;border:1px solid #34445a;color:#b8d4ec;padding:6px 8px;font:10px 'Courier New',monospace;cursor:pointer;border-radius:3px}#sideMetasprites163 button:hover,#msWorkspace163 button:hover{border-color:var(--acc);color:#fff}#sideMetasprites163 button:disabled,#msWorkspace163 button:disabled{opacity:.35;cursor:default}
#msWorkspace163 select,#sideMetasprites163 select,#sideMetasprites163 input{background:#141722;border:1px solid #354054;color:#d1d9e9;font:11px 'Courier New',monospace;padding:5px;min-width:0;border-radius:3px}#msWorkspace163 input[type=checkbox],#sideMetasprites163 input[type=checkbox]{accent-color:var(--acc);width:auto}
.ms-stage163{overflow:auto;min-height:320px;max-height:68vh;background:#090d15;border:1px solid #2c3547;border-radius:4px;position:relative;display:flex;align-items:flex-start;justify-content:flex-start;padding:12px}#msCanvas163{flex-shrink:0;touch-action:none;image-rendering:pixelated;max-width:none;outline-offset:4px}.ms-footer163{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;color:#8e9caf;font-size:10px;line-height:1.5}
.ms-section163{border-top:1px solid #2c3444;margin-top:12px;padding-top:10px}.ms-section163 h3{font-size:11px;color:#a1c7f1;margin:0 0 8px}.ms-row163{display:grid;grid-template-columns:84px minmax(0,1fr);gap:8px;align-items:center;margin:6px 0;font-size:10px}.ms-row163>label{color:#909db2}.ms-pair163{display:grid;grid-template-columns:1fr 1fr;gap:6px}.ms-actions163{display:flex;flex-wrap:wrap;gap:5px;margin:8px 0}.ms-help163{font-size:10px;line-height:1.55;color:#939caf;margin-top:6px}.ms-good163,.ms-warn163,.ms-error163{padding:7px 8px;font-size:10px;line-height:1.5;margin:4px 0;border-left:3px solid}.ms-good163{color:#a5dca5;background:#132119;border-color:#659369}.ms-warn163{color:#e6cc90;background:#292314;border-color:#ae8d45}.ms-error163{color:#ecaaa5;background:#2a1a1d;border-color:#b7746d}
.ms-pieces163{max-height:210px;overflow:auto;display:flex;flex-direction:column;gap:3px;margin:7px 0}.ms-piece163{display:flex;align-items:center;gap:8px;width:100%;text-align:left}.ms-piece163.selected{background:#19364d!important;border-color:#5ad4ff!important}.ms-piece163 span{line-height:1.5}.ms-piece163 canvas{width:24px;height:48px;image-rendering:pixelated;flex-shrink:0}.ms-small163{font-size:9px;color:#8ba3b9}.ms-sheet163{display:block;width:256px;height:256px;max-width:100%;border:1px solid #36485a;margin:8px auto;image-rendering:pixelated;touch-action:none}.ms-flags163{display:flex;flex-wrap:wrap;gap:9px;font-size:10px;margin:8px 0}.ms-empty163{padding:12px;background:#151e2a;border:1px dashed #39546c;color:#a4b6ca;line-height:1.7;font-size:11px}
@media(max-width:720px){#msWorkspace163{padding:0;min-width:280px}.ms-header163{flex-wrap:wrap}.ms-tag163{display:none}.ms-stage163{min-height:240px}.ms-toolbar163{font-size:9px}}
`;
document.head.appendChild(style);
const tab=document.createElement('button');tab.className='tab';tab.dataset.view='metasprites';tab.textContent='METASPRITES';tab.onclick=()=>switchTab('metasprites');tab.oncontextmenu=e=>tabCtx(e,'metasprites');
const spritesTab=document.querySelector('[data-view="sprites"]');spritesTab.after(tab);
const workspace=document.createElement('div');workspace.id='msWorkspace163';workspace.innerHTML=`
<div class="ms-header163"><div><h2>METASPRITE COMPOSER</h2><div class="ms-sub163">Build reusable character and object frames from scene sprite tiles.</div></div><div class="ms-tag163">1.6.3 · FRAME AUTHORING</div></div>
<div class="ms-toolbar163"><button id="msAdd163">+ Piece</button><button id="msFit163">Fit frame</button><label>Zoom <select id="msZoom163"><option>0.25</option><option>0.5</option><option>1</option><option>2</option><option selected>4</option><option>6</option><option>8</option></select>×</label><label>Snap <select id="msSnap163"><option value="1">1 px</option><option value="8">8 px</option></select></label><label><input id="msGrid163" type="checkbox" checked> Grid</label><label><input id="msBoxes163" type="checkbox" checked> Boxes</label><label title="Preview the first 64 OAM pieces and the first eight sprites intersecting each scanline."><input id="msHardware163" type="checkbox"> Hardware limits</label></div>
<div class="ms-stage163"><canvas id="msCanvas163" width="512" height="384" tabindex="0" aria-label="Metasprite piece position editor. Drag a piece or use arrow keys to move the selected piece."></canvas></div>
<div class="ms-footer163"><span id="msGeometry163">Create a frame to begin.</span><span>Drag to move · arrows: 1 px · Shift: 8 px · Delete: remove</span></div>`;
$('leftP').appendChild(workspace);
const side=document.createElement('div');side.id='sideMetasprites163';side.style.display='none';side.innerHTML=`
<h2>FRAME LIBRARY</h2><div class="ms-row163"><label for="msFrames163">Frame</label><select id="msFrames163"></select></div><div class="ms-actions163"><button id="msNew163">+ New frame</button><button id="msCapture163">Capture scene OAM</button><button id="msDuplicate163">Duplicate</button><button id="msMirror163">Mirror copy</button><button id="msDelete163">Delete</button><button id="msExport163">Export frames</button></div><div class="ms-help163">Save Project or Export ZIP preserves every frame with its source scenes.</div>
<div id="msEmpty163" class="ms-empty163">Start with a blank frame, or capture the active scene’s OAM. Choose a tile below, then add and position pieces.</div>
<div id="msEditor163"><div class="ms-row163"><label for="msName163">Name</label><input id="msName163" maxlength="100"></div><div class="ms-row163"><label for="msSource163">Source scene</label><select id="msSource163"></select></div><div class="ms-row163"><label for="msMode163">Sprite size</label><select id="msMode163"><option value="8">8 × 8 · one tile / OAM slot</option><option value="16">8 × 16 · two tiles / OAM slot</option></select></div>
<div class="ms-row163"><label>Origin X / Y</label><div class="ms-pair163"><input id="msOriginX163" aria-label="Frame origin X" type="number" min="-2048" max="2047"><input id="msOriginY163" aria-label="Frame origin Y" type="number" min="-2048" max="2047"></div></div><button id="msFeet163">Set origin at feet</button><div class="ms-help163">The cyan cross is the frame anchor. Piece coordinates are stored in source pixels; placement subtracts the origin.</div>
<div class="ms-section163"><h3>HARDWARE BUDGET</h3><div id="msWarnings163" role="status"></div><div class="ms-help163">Eight sprites per scanline, 64 OAM slots total. Transparent pixels and offscreen X positions still consume scanline slots. Counts are for this frame; multiple actors share the same limits.</div></div>
<div class="ms-section163"><h3>PIECES · OAM ORDER</h3><div id="msPieces163" class="ms-pieces163"></div><div class="ms-actions163"><button id="msPieceDup163">Duplicate piece</button><button id="msPieceDel163">Remove</button><button id="msEarlier163" title="Earlier OAM index takes sprite overlap priority">Earlier</button><button id="msLater163">Later</button></div>
<div id="msPieceEditor163"><div class="ms-row163"><label>Tile / lower</label><div class="ms-pair163"><input id="msTile163" aria-label="Piece top CHR tile index" type="number" min="0" max="255"><input id="msTile2163" aria-label="Piece lower CHR tile index" type="number" min="0" max="255"></div></div><div class="ms-row163"><label>X / Y</label><div class="ms-pair163"><input id="msX163" aria-label="Piece X" type="number" min="-2048" max="2047"><input id="msY163" aria-label="Piece Y" type="number" min="-2048" max="2047"></div></div><div class="ms-row163"><label for="msPal163">Palette</label><select id="msPal163"><option value="0">Sprite palette 0</option><option value="1">Sprite palette 1</option><option value="2">Sprite palette 2</option><option value="3">Sprite palette 3</option></select></div><div class="ms-flags163"><label><input id="msFH163" type="checkbox"> Flip H</label><label><input id="msFV163" type="checkbox"> Flip V</label><label><input id="msBehind163" type="checkbox"> Behind BG</label></div><div class="ms-actions163"><button id="msMirrorX163">Mirror X at origin</button><button id="msMirrorY163">Mirror Y at origin</button></div><div class="ms-help163">Lower OAM index wins overlapping sprite pixels. “Behind BG” is preserved; this transparent canvas has no scene background.</div></div></div></div>
<div class="ms-section163"><h3>SOURCE SPRITE CHR</h3><div id="msTileLabel163" class="ms-help163">Click a tile to select a brush; double-click to add it.</div><canvas id="msSheet163" class="ms-sheet163" width="256" height="256" aria-label="Sprite CHR tile brush picker"></canvas><div class="ms-help163" id="msPairHelp163">Color 0 is transparent. Edit source pixels and palettes in SPRITES or CHR; every frame using that scene updates.</div></div>`;
$('rightP').appendChild(side);
// Replace the old animation placeholder without touching the legacy animation editor.
const oldPlaceholder=Array.from(document.querySelectorAll('#sideAnim p')).find(p=>p.textContent.includes('Metasprite authoring'));
if(oldPlaceholder){oldPlaceholder.textContent='Reusable character/object frames are available in the METASPRITES tab. Gameplay generation remains a later milestone.';const b=document.createElement('button');b.textContent='Open Metasprite Composer';b.onclick=()=>switchTab('metasprites');oldPlaceholder.after(b);}

function value(id,val){const el=$(id);if(el&&(document.activeElement!==el||el.tagName==='SELECT'))el.value=String(val);}
function canvasBg(ctx,w,h,step){ctx.fillStyle='#101725';ctx.fillRect(0,0,w,h);ctx.fillStyle='#141e2e';for(let y=0;y<h;y+=step)for(let x=0;x<w;x+=step)if(((x/step+y/step)&1)===0)ctx.fillRect(x,y,step,step);}
function viewBounds(frame){const b=bounds(frame),minX=Math.min(b.x,frame?.originX||0),minY=Math.min(b.y,frame?.originY||0),maxX=Math.max(b.right,frame?.originX||0),maxY=Math.max(b.bottom,frame?.originY||0);return {x:Math.floor((minX-16)/8)*8,y:Math.floor((minY-16)/8)*8,w:Math.max(128,Math.ceil((maxX-minX+40)/8)*8),h:Math.max(96,Math.ceil((maxY-minY+40)/8)*8)};}
function fitFrame(){UI.viewport=viewBounds(current());const stage=canvas.parentElement,availableW=Math.max(240,(stage?.clientWidth||768)-26),availableH=Math.max(240,Math.min(600,(window.innerHeight||900)*.55));UI.zoom=[8,6,4,2,1,.5,.25].find(z=>UI.viewport.w*z<=availableW&&UI.viewport.h*z<=availableH)||.25;value('msZoom163',UI.zoom);renderCanvas();}
function renderCanvas(){
  const c=$('msCanvas163');if(!c||S.tab!=='metasprites')return;const f=current(),v=UI.viewport||(UI.viewport=viewBounds(f)),ctx=c.getContext('2d');
  if(Math.max(v.w,v.h)*UI.zoom>4096){UI.zoom=[8,6,4,2,1,.5,.25].find(z=>Math.max(v.w,v.h)*z<=4096)||.25;value('msZoom163',UI.zoom);}const z=UI.zoom;
  const width=v.w*z,height=v.h*z;if(c.width!==width)c.width=width;if(c.height!==height)c.height=height;c.style.width=width+'px';c.style.height=height+'px';ctx.imageSmoothingEnabled=false;canvasBg(ctx,width,height,8*z);
  if(UI.grid){ctx.strokeStyle='#26354c';ctx.lineWidth=1;ctx.beginPath();for(let x=0;x<=width;x+=8*z){ctx.moveTo(x+.5,0);ctx.lineTo(x+.5,height);}for(let y=0;y<=height;y+=8*z){ctx.moveTo(0,y+.5);ctx.lineTo(width,y+.5);}ctx.stroke();}
  if(!f){ctx.fillStyle='#9bb0cb';ctx.font='13px monospace';ctx.fillText('Create a frame or capture scene OAM →',20,38);return;}
  draw(ctx,f,(f.originX-v.x)*z,(f.originY-v.y)*z,z,{hardware:UI.hardware});
  if(UI.boxes)f.pieces.forEach((p,i)=>{ctx.strokeStyle=p.id===UI.pieceId?'#ffd878':'#7591b28c';ctx.lineWidth=p.id===UI.pieceId?2:1;ctx.strokeRect((p.x-v.x)*z+.5,(p.y-v.y)*z+.5,8*z,f.spriteMode*z);if(z>=4){ctx.font='9px monospace';ctx.fillStyle=p.id===UI.pieceId?'#ffe4a2':'#90a7c6';ctx.fillText(String(i),(p.x-v.x)*z+2,(p.y-v.y)*z-3);}});
  const ox=(f.originX-v.x)*z,oy=(f.originY-v.y)*z;ctx.strokeStyle='#53dcf6';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(ox-10,oy+.5);ctx.lineTo(ox+10,oy+.5);ctx.moveTo(ox+.5,oy-10);ctx.lineTo(ox+.5,oy+10);ctx.stroke();ctx.strokeRect(ox-3,oy-3,6,6);
  if(UI.hardware){const w=warnings(f);ctx.fillStyle='#ed6e752b';for(const l of w.overflowLines)ctx.fillRect(0,(l.line-v.y)*z,width,z);}
  const b=bounds(f);$('msGeometry163').textContent=f.name+' · bounds '+b.w+' × '+b.h+' px at '+b.x+','+b.y+' · origin '+f.originX+','+f.originY;
}
function thumbnail(canvas,frame,p){const ctx=canvas.getContext('2d');canvasBg(ctx,8,16,4);const one={...frame,originX:p.x,originY:p.y,pieces:[p]};draw(ctx,one,0,0,1);}
function renderSheet(){
  const c=$('msSheet163'),ctx=c.getContext('2d'),f=current(),sc=f?source(f):{sprChr:S.sprChr,sprPal:S.sprPal};canvasBg(ctx,256,256,16);if(!sc)return;const palette=sc.sprPal?.[piece()?.pal||0]||[15,0,16,48];
  for(let t=0;t<256;t++){const tile=sc.sprChr?.[t];if(!tile)continue;for(let y=0;y<8;y++)for(let x=0;x<8;x++){const ci=tile[y][x];if(!ci)continue;ctx.fillStyle='rgb('+(NP[palette[ci]]||NP[15]).join(',')+')';ctx.fillRect((t%16)*16+x*2,(t>>4)*16+y*2,2,2);}}
  ctx.strokeStyle='#f2d585';ctx.lineWidth=2;ctx.strokeRect((UI.tile%16)*16+1,(UI.tile>>4)*16+1,14,14);$('msTileLabel163').textContent='Brush $'+UI.tile.toString(16).toUpperCase().padStart(2,'0')+' ('+UI.tile+') · click to choose, double-click to add';
}
function renderUI(){
  ensure();const f=current(),p=piece(),frames=$('msFrames163');if(!frames)return;
  const desired=(!f&&S.metasprites.length?'<option value="">Choose a pose…</option>':'')+(S.metasprites||[]).map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+' · '+x.pieces.length+' pieces</option>').join('')||'<option value="">No frames yet</option>';if(frames.innerHTML!==desired)frames.innerHTML=desired;value('msFrames163',f?.id||'');
  if(!f)$('msEmpty163').textContent=UI.choiceReason||'Start with a blank frame, or capture the active Scene OAM. Choose a pose or create one.';
  $('msEmpty163').style.display=f?'none':'block';$('msEditor163').style.display=f?'block':'none';for(const id of ['msDuplicate163','msMirror163','msDelete163'])$(id).disabled=!f;
  if(f){
    value('msName163',f.name);const scenes=S.scenes.map(sc=>'<option value="'+esc(sc.id)+'">'+esc(sc.name)+'</option>').join('');$('msSource163').innerHTML=(source(f)?'':'<option value="'+esc(f.sceneId)+'">Missing source scene</option>')+scenes;value('msSource163',f.sceneId);value('msMode163',f.spriteMode);value('msOriginX163',f.originX);value('msOriginY163',f.originY);
    const w=warnings(f),messages=[];if(w.missingSource)messages.push('<div class="ms-error163">Source scene is missing. Select a compatible scene to restore tile graphics.</div>');if(w.missingTiles&&!w.missingSource)messages.push('<div class="ms-error163">'+w.missingTiles+' piece(s) reference missing CHR tiles.</div>');
    messages.push('<div class="'+(w.oamOverflow?'ms-error163':'ms-good163')+'">'+w.oamCount+' / 64 OAM slots'+(w.oamOverflow?' · '+w.oamOverflow+' pieces exceed hardware capacity':'')+'<br>Peak '+w.maxScanline+' / 8 sprites per scanline</div>');
    if(w.overflowLines.length)messages.push('<div class="ms-warn163">'+w.overflowLines.length+' local scanlines exceed eight sprites. Hardware preview hides later OAM pieces on these lines.</div>');
    if(w.unpackedPairs)messages.push('<div class="ms-warn163">'+w.unpackedPairs+' pair(s) need CHR packing before hardware 8×16 output. Source tiles are preserved exactly.</div>');if(w.empty)messages.push('<div class="ms-warn163">This frame is empty. Add a piece from the CHR brush.</div>');$('msWarnings163').innerHTML=messages.join('');
    const list=$('msPieces163');list.innerHTML='';f.pieces.forEach((q,i)=>{const b=document.createElement('button');b.className='ms-piece163'+(q.id===UI.pieceId?' selected':'');b.dataset.pieceId=q.id;b.setAttribute('aria-pressed',String(q.id===UI.pieceId));const c=document.createElement('canvas');c.width=8;c.height=16;thumbnail(c,f,q);b.appendChild(c);const text=document.createElement('span');text.innerHTML='#'+i+' · $'+q.tile.toString(16).toUpperCase().padStart(2,'0')+(f.spriteMode===16?' / $'+q.tile2.toString(16).toUpperCase().padStart(2,'0'):'')+' · P'+q.pal+'<br><span class="ms-small163">('+q.x+', '+q.y+')'+(q.flipH?' · H':'')+(q.flipV?' · V':'')+(q.behind?' · BG':'')+'</span>';b.appendChild(text);b.onclick=()=>{UI.pieceId=q.id;UI.tile=q.tile;renderUI();renderCanvas();};list.appendChild(b);});
    $('msPieceEditor163').style.display=p?'block':'none';for(const id of ['msPieceDup163','msPieceDel163','msEarlier163','msLater163'])$(id).disabled=!p;
    if(p){value('msTile163',p.tile);value('msTile2163',p.tile2);$('msTile2163').disabled=f.spriteMode!==16;value('msX163',p.x);value('msY163',p.y);value('msPal163',p.pal);$('msFH163').checked=p.flipH;$('msFV163').checked=p.flipV;$('msBehind163').checked=p.behind;const idx=f.pieces.indexOf(p);$('msEarlier163').disabled=idx===0;$('msLater163').disabled=idx===f.pieces.length-1;}
    $('msPairHelp163').textContent=f.spriteMode===16?'8×16 uses one global hardware size and one OAM slot per pair. Flip V swaps the two tiles and flips their pixels. Tile fields refer to normalized scene assets; hardware requires even/odd pairs in a single pattern table.':'Color 0 is transparent. Edit source pixels and palettes in SPRITES or CHR; every frame using that scene updates.';
  }
  renderSheet();
  window.NFContext04?.refresh?.();
}

// Only committed edits create history; a pointer drag is one undo operation.
const canvas=$('msCanvas163');
function eventPoint(e){const p=canvasPoint(canvas,e),v=UI.viewport||viewBounds(current());return {x:Math.floor(p.x/UI.zoom)+v.x,y:Math.floor(p.y/UI.zoom)+v.y};}
canvas.addEventListener('pointerdown',e=>{if(e.button!==0||!current())return;canvas.focus();const at=eventPoint(e),f=current();const selected=piece(),hits=f.pieces.filter(p=>at.x>=p.x&&at.x<p.x+8&&at.y>=p.y&&at.y<p.y+f.spriteMode);const hit=(selected&&hits.includes(selected)?selected:hits[0]);if(!hit){UI.pieceId='';renderUI();renderCanvas();return;}e.preventDefault();UI.pieceId=hit.id;UI.tile=hit.tile;UI.drag={pointerId:e.pointerId,start:at,x:hit.x,y:hit.y,snapshotted:false,frameId:f.id,pieceId:hit.id};canvas.setPointerCapture(e.pointerId);renderUI();renderCanvas();});
canvas.addEventListener('pointermove',e=>{const d=UI.drag;if(!d||d.pointerId!==e.pointerId)return;const p=piece();if(!p||current()?.id!==d.frameId||p.id!==d.pieceId){UI.drag=null;return;}const at=eventPoint(e),snap=UI.snap,x=int(Math.round((d.x+at.x-d.start.x)/snap)*snap,-2048,2047),y=int(Math.round((d.y+at.y-d.start.y)/snap)*snap,-2048,2047);if(x===p.x&&y===p.y)return;if(!d.snapshotted){snapshot();d.snapshotted=true;}p.x=x;p.y=y;value('msX163',x);value('msY163',y);renderCanvas();});
function endDrag(e){const d=UI.drag;if(!d||e&&e.pointerId!==d.pointerId)return;UI.drag=null;if(d.snapshotted)changed('metaspritePieceMove');}
canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);canvas.addEventListener('lostpointercapture',endDrag);
canvas.addEventListener('keydown',e=>{if(inputTarget(e)||!piece())return;const steps={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};if(steps[e.key]){e.preventDefault();e.stopPropagation();const p=piece(),d=steps[e.key],amount=e.shiftKey?8:1;snapshot();p.x=int(p.x+d[0]*amount,-2048,2047);p.y=int(p.y+d[1]*amount,-2048,2047);changed('metaspriteNudge');}else if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();e.stopPropagation();removePiece();}});
$('msSheet163').addEventListener('click',e=>{const pt=canvasPoint($('msSheet163'),e);UI.tile=int(Math.floor(pt.y/16)*16+Math.floor(pt.x/16),0,255);renderSheet();});$('msSheet163').addEventListener('dblclick',()=>addPiece());
const events={msNew163:()=>create(),msCapture163:capture,msDuplicate163:()=>duplicateFrame(),msMirror163:()=>duplicateFrame(true),msDelete163:deleteFrame,msExport163:()=>F.exportMetasprites?.(),msAdd163:addPiece,msFit163:fitFrame,msFeet163:setOrigin,msPieceDup163:duplicatePiece,msPieceDel163:removePiece,msEarlier163:()=>moveOrder(-1),msLater163:()=>moveOrder(1),msMirrorX163:()=>mirrorPiece('x'),msMirrorY163:()=>mirrorPiece('y')};for(const [id,fn]of Object.entries(events))$(id).onclick=fn;
$('msFrames163').onchange=e=>select(e.target.value);
for(const [id,prop,lo,hi]of [['msName163','name'],['msSource163','sceneId'],['msMode163','spriteMode',8,16],['msOriginX163','originX',-2048,2047],['msOriginY163','originY',-2048,2047]])$(id).onchange=e=>{const f=current();if(!f)return;let next=lo===undefined?e.target.value:Number(e.target.value);if(lo!==undefined&&(!Number.isInteger(next)||next<lo||next>hi)){e.target.value=String(f[prop]);return showToast('Value must be an integer from '+lo+' to '+hi+'.');}if(prop==='name'){next=next.trim()||f.name;if(!fitsText(next)){e.target.value=f.name;return showToast('Frame names may contain at most 255 UTF-8 bytes.');}}if(prop==='spriteMode')next=next===16?16:8;if(next===f[prop])return;snapshot();f[prop]=next;UI.viewport=null;changed('metaspriteProperties');};
for(const [id,prop,lo,hi]of [['msTile163','tile',0,255],['msTile2163','tile2',0,255],['msX163','x',-2048,2047],['msY163','y',-2048,2047],['msPal163','pal',0,3],['msFH163','flipH'],['msFV163','flipV'],['msBehind163','behind']])$(id).onchange=e=>{const p=piece();if(!p)return;const next=lo===undefined?e.target.checked:Number(e.target.value);if(lo!==undefined&&(!Number.isInteger(next)||next<lo||next>hi)){e.target.value=String(p[prop]);return showToast('Value must be an integer from '+lo+' to '+hi+'.');}if(next===p[prop])return;snapshot();p[prop]=next;if(prop==='tile')UI.tile=next;UI.viewport=null;changed('metaspritePieceProperties');};
for(const [id,prop]of [['msGrid163','grid'],['msBoxes163','boxes'],['msHardware163','hardware']])$(id).onchange=e=>{UI[prop]=e.target.checked;renderCanvas();};$('msZoom163').onchange=e=>{UI.zoom=+e.target.value;renderCanvas();};$('msSnap163').onchange=e=>UI.snap=+e.target.value;

const previousRender=render;render=function(){if(S.tab==='metasprites'){ensure();renderUI();renderCanvas();updateStats();return;}return previousRender();};
const previousSwitch=switchTab;switchTab=function(t){
  if(S.tab==='metasprites'&&UI.drag)endDrag();
  if(t!=='metasprites'){workspace.style.display='none';side.style.display='none';return previousSwitch(t);}
  scenePainting=false;entityDrag=null;sprDragging=false;clearEmuKeys();aud_stop();anim_stopPreview();S.tab=t;
  document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('on',b.dataset.view===t));for(const el of $('rightP').children)if(el.id?.startsWith('side'))el.style.display=el===side?'block':'none';
  for(const id of ['codeEditorWrap','emuView','disasmView'])$(id).style.display='none';cv.style.display='none';cv.classList.remove('world-canvas');$('leftP').style.display='flex';$('rightP').style.width='';workspace.style.display='flex';ensure();renderUI();renderCanvas();
  try{history.replaceState(null,'',location.href.split('#')[0]+'#metasprites');}catch(_){}
};
const previousHash=getHashView;getHashView=function(){return location.hash==='#metasprites'?'metasprites':previousHash();};
const previousDocs=renderDocs;renderDocs=function(){previousDocs();const doc=document.querySelector('#sideDocs .doc');if(!doc)return;const s=document.createElement('section');s.innerHTML='<h2>1.6.3 — Metasprite Composer</h2><p>METASPRITES stores named reusable frames, each tied to a source scene’s sprite CHR and four sprite palettes. Pieces preserve tile IDs, position, palette, horizontal/vertical flip and background priority. Drag pieces or use numeric controls; reorder OAM overlap priority, duplicate/mirror pieces and frames, and choose an explicit origin. Scene OAM capture preserves normalized 8×16 top/bottom tile pairs, including deduplicated nonadjacent tiles.</p><p>The size selector is global to a frame, as on NES hardware. An 8×16 pair counts as one OAM slot and covers sixteen scanlines; vertical flip swaps both tile order and pixels. The hardware preview applies the 64-slot and eight-sprites-per-line limits, including transparent pieces. Background priority is stored; the isolated frame canvas has no background. Normalized pairs requiring CHR resource packing are flagged. These definitions are authoring assets; automatic gameplay and runtime animation generation remain later milestones.</p>';doc.prepend(s);};
F.metasprites={normalize,normalizeAll,ensure,get,restoreSelection,source,bounds,warnings,draw,toOAM,create,capture,select,duplicate:duplicateFrame,render:()=>{renderUI();renderCanvas();},state:UI,limits:{frames:MAX_FRAMES,pieces:MAX_PIECES},get current(){return current();}};
ensure();renderUI();if(location.hash==='#metasprites')setTimeout(()=>switchTab('metasprites'),0);
})();


