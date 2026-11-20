/*
 * NES FORGE MODULE: src/ui/studio-shell.js
 * Entry: Forge.services.StudioShell
 * Purpose: The desktop/touch adapter of the command core. One studio bar (Open, New, Save, Save As,
 *   Library / Edit / Play / Build, project, Learn, Tools) sits above the original rows, which all stay
 *   entry points. Library lists every resource with a thumbnail and its editability level; Build checks
 *   the project and names the asset behind a refusal. Everything goes through Forge.commands.
 * Contract: Nothing is removed or hidden. Every original row keeps its IDs, handlers and colours under the studio bar
 *   (skins, the Resource Explorer, recovered content, area library, native tools and the working-context ribbon
 *   included). Library and Build modes swap the editor for their own panels; Edit shows the original editor.
 * Bundle order: after src/services/command-core.js.
 */
(()=>{
'use strict';
const F=window.Forge,C=F.commands,services=F.services;
// The studio layout needs a real DOM (browser or jsdom). Headless harnesses keep the command core only.
if(!C||typeof document==='undefined'||!document.body||typeof document.createTextNode!=='function'||typeof window.Element!=='function'||!('prepend' in window.Element.prototype))return;
const $=id=>document.getElementById(id);
const el=(tag,props={},...kids)=>{const n=document.createElement(tag);for(const [k,v] of Object.entries(props)){if(k==='class')n.className=v;else if(k==='text')n.textContent=v;else if(k.startsWith('on'))n.addEventListener(k.slice(2),v);else if(v!==undefined&&v!==null)n.setAttribute(k,v);}for(const k of kids)if(k!=null)n.append(typeof k==='string'||typeof k==='number'?document.createTextNode(String(k)):k);return n;};
const store={get(k,d){try{const v=localStorage.getItem('forge.studio.'+k);return v===null?d:JSON.parse(v);}catch(_){return d;}},set(k,v){try{localStorage.setItem('forge.studio.'+k,JSON.stringify(v));}catch(_){/* storage is optional */}}};
const LEVELS={build:{label:'Builds into game',short:'BUILD',cls:'lv-build'},native:{label:'Writes to ROM',short:'ROM',cls:'lv-native'},copy:{label:'Copy only (not written to ROM)',short:'COPY',cls:'lv-copy'},reference:{label:'Reference',short:'REF',cls:'lv-ref'},unknown:{label:'Ownership unknown',short:'?',cls:'lv-unknown'}};

C.registerAdapter({id:'desktop',kind:'desktop',title:'Desktop editor'});
C.registerAdapter({id:'keyboard',kind:'keyboard',title:'Keyboard shortcuts'});
if('ontouchstart' in window||navigator.maxTouchPoints>0)C.registerAdapter({id:'touch',kind:'touch',title:'Touch'});
const run=(name,args)=>C.run(name,args,{adapter:'desktop'});

// ---------- styles ----------
document.head.append(el('style',{id:'studioShellStyle',text:`
#studioBar{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:5px 10px;background:var(--bg2);border-bottom:1px solid var(--bdr2);flex-shrink:0;font-size:11px}
#studioBar button,#studioPanel button{font:11px/1.2 inherit;background:var(--bg3);color:var(--txt);border:1px solid var(--bdr2);padding:5px 9px;cursor:pointer;min-height:28px}
#studioBar button:hover,#studioPanel button:hover{border-color:var(--acc2)}
#studioBar button:focus-visible,#studioPanel :focus-visible{outline:2px solid var(--acc);outline-offset:1px}
.sb-brand{color:var(--acc);font-weight:bold;letter-spacing:1px;margin-right:4px}.sb-brand small{color:var(--grn);font-weight:normal;letter-spacing:0;font-size:9px;margin-left:4px}
.sb-modes{display:flex;gap:0;margin:0 6px}.sb-modes button{border-radius:0;margin-left:-1px}
.sb-modes button[aria-selected="true"]{background:#14324a;border-color:var(--acc);color:#fff}
.sb-project{color:var(--dim);max-width:34ch;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sb-project b{color:var(--txt)}
.sb-spacer{flex:1}.sb-menu{position:relative}
#studioToolsMenu{position:absolute;right:0;top:calc(100% + 2px);z-index:400;background:var(--bg2);border:1px solid var(--bdr2);min-width:240px;max-height:70vh;overflow:auto;padding:4px;box-shadow:0 6px 18px #000a}
#studioToolsMenu button{display:block;width:100%;text-align:left;border:0;background:none;padding:7px 8px}#studioToolsMenu button:hover{background:var(--bg3)}
#studioToolsMenu .tm-h{color:var(--dim);font-size:9px;padding:6px 8px 2px;text-transform:uppercase;letter-spacing:1px}
/* Skins: the Retro Workstation look also covers the studio bar, Tools menu and Library / Build panels. */
body.nf-retro #studioBar{background:linear-gradient(180deg,#172434 0%,#101a29 100%);border-bottom-color:#38546a;box-shadow:0 2px 12px rgba(0,0,0,.25)}
body.nf-retro #studioBar button,body.nf-retro #studioPanel button,body.nf-retro #studioPanel select,body.nf-retro #studioPanel input{border:1px solid #3a5268;border-radius:3px;color:#d0e4ee;background:#1b2b3d;font:600 10px/1.25 'Courier New',monospace;min-height:var(--nf-target)}
body.nf-retro .sb-modes button[aria-selected="true"]{background:#1f4a61;border-color:#6bd9f4;color:#fff}
body.nf-retro .sb-brand{font-family:'Courier New',monospace;color:#8beaff}body.nf-retro .sb-brand small{color:#b3d3aa}
body.studio-mode-library .top,body.studio-mode-library .main,body.studio-mode-library #fcw-ribbon,
body.studio-mode-build .top,body.studio-mode-build .main,body.studio-mode-build #fcw-ribbon{display:none!important}
#studioPanel{display:none;flex:1;min-height:0;overflow:hidden;background:var(--bg)}
body.studio-mode-library #studioPanel,body.studio-mode-build #studioPanel{display:flex}
.sp-lib,.sp-build{display:flex;flex-direction:column;flex:1;min-height:0;min-width:0}
.sp-head{display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:8px 10px;border-bottom:1px solid var(--bdr)}
.sp-head input,.sp-head select{font:11px inherit;background:var(--bg3);color:var(--txt);border:1px solid var(--bdr2);padding:5px 6px;min-height:28px}
.sp-head input{flex:1;min-width:140px}
.sp-chips{display:flex;gap:4px;flex-wrap:wrap}.sp-chip[aria-pressed="true"]{border-color:var(--acc)!important;color:#fff}
.sp-body{display:flex;flex:1;min-height:0}
.sp-list{flex:1.4;overflow:auto;padding:6px;display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));grid-auto-rows:max-content;gap:6px;align-content:start}
.sp-item{display:flex;flex-direction:column;gap:3px;background:var(--bg2);border:1px solid var(--bdr);padding:5px;cursor:pointer;text-align:left;min-height:0!important}
.sp-item[aria-selected="true"]{border-color:var(--acc)}
.sp-thumb{flex-shrink:0;width:100%;aspect-ratio:256/240;background:#000;image-rendering:pixelated;display:flex;align-items:center;justify-content:center;color:var(--dim);font-size:10px}
.sp-thumb canvas{width:100%;height:100%;image-rendering:pixelated}
.sp-name{color:var(--txt);font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sp-meta{display:flex;justify-content:space-between;gap:4px;font-size:9px;color:var(--dim)}
.lv{font-size:9px;padding:1px 4px;border:1px solid;white-space:nowrap}
.lv-build{color:var(--grn);border-color:#3a6a3a}.lv-native{color:var(--acc);border-color:var(--acc2)}.lv-copy{color:var(--ylw);border-color:#7a6a3a}.lv-ref{color:var(--dim);border-color:var(--bdr2)}.lv-unknown{color:#c8a0f0;border-color:#5a3a5a}
.sp-detail{flex:1;overflow:auto;border-left:1px solid var(--bdr);padding:10px;min-width:260px}
.sp-detail h2{font-size:13px;color:#fff;margin:0 0 6px}.sp-detail p{margin:6px 0;line-height:1.45}.sp-detail .note{color:var(--dim)}
.sp-detail ul{margin:4px 0;padding-left:16px}.sp-detail li{margin:2px 0}.sp-link{background:none!important;border:0!important;color:var(--acc)!important;padding:0!important;min-height:0!important;text-decoration:underline;cursor:pointer}
.sp-actions{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}.sp-actions .primary{background:#14324a;border-color:var(--acc)}
.sp-sugg{border:1px solid var(--bdr2);padding:6px;margin:6px 0}.sp-sugg .sp-pick{margin:4px 6px 4px 0;max-width:60%}.sp-sugg .shared{color:var(--orn)}
.sp-more{grid-column:1/-1}
.sp-build .sp-body{flex-direction:column;overflow:auto;padding:10px;gap:8px}
.bd-card{border:1px solid var(--bdr2);padding:8px}.bd-ok{border-color:#3a6a3a}.bd-err{border-color:#7a3a3a}.bd-card h3{margin:0 0 4px;font-size:12px}
#studioPalette{position:fixed;inset:0;background:#0009;z-index:500;display:none;align-items:flex-start;justify-content:center;padding-top:10vh}
#studioPalette.open{display:flex}#studioPalette .pal{background:var(--bg2);border:1px solid var(--acc2);width:min(680px,94vw);max-height:76vh;display:flex;flex-direction:column}
#studioPalette input,#studioPalette textarea{font:12px inherit;background:var(--bg3);color:var(--txt);border:0;border-bottom:1px solid var(--bdr2);padding:8px}
#studioPalette ul{list-style:none;margin:0;padding:0;overflow:auto;flex:1}#studioPalette li{padding:6px 10px;cursor:pointer}#studioPalette li[aria-selected="true"]{background:#14324a}
#studioPalette pre{margin:0;padding:8px;max-height:30vh;overflow:auto;color:var(--dim);white-space:pre-wrap;border-top:1px solid var(--bdr)}
@media(max-width:850px){.sp-body{flex-direction:column}.sp-list{flex:none;max-height:58vh}.sp-detail{border-left:0;border-top:1px solid var(--bdr);min-width:0}.sp-list{grid-template-columns:repeat(auto-fill,minmax(110px,1fr))}.sb-project{max-width:100%;order:9;width:100%}}
`}));

// ---------- studio bar ----------
const clickOriginal=find=>{const n=typeof find==='function'?find():document.querySelector(find);if(!n)return false;n.click();return true;};
const byText=(selector,text)=>()=>[...document.querySelectorAll(selector)].find(b=>b.textContent.trim().replace(/\s+/g,' ')===text);
const modes=[['library','Library','Every asset, its thumbnail and what it can do'],['edit','Edit','Scene, CHR, sprites, audio and the other editors'],['play','Play','Build and run in the emulator'],['build','Build','Check the build and download the ROM']];
const modeButtons=modes.map(([id,label,title],i)=>el('button',{id:'studioMode-'+id,role:'tab','aria-selected':'false',title:title+' (Alt+'+(i+1)+')',onclick:()=>setMode(id)},label));
const projectChip=el('span',{class:'sb-project',id:'studioProject','aria-live':'polite'});
const toolsMenu=el('div',{id:'studioToolsMenu',role:'menu',hidden:''});
const toolsButton=el('button',{id:'studioTools','aria-haspopup':'menu','aria-expanded':'false',onclick:()=>toggleTools()},'Tools ▾');
const classicButton=el('button',{id:'studioClassic','aria-pressed':'false',title:'Show every original toolbar row as well',onclick:()=>setClassic(!document.body.classList.contains('studio-classic'))},'Classic layout');
const bar=el('div',{id:'studioBar',role:'toolbar','aria-label':'NES Forge studio'},
  el('span',{class:'sb-brand'},'NES FORGE',el('small',{text:(F.release?.version||'')+' · '+(F.release?.name||'')})),
  el('button',{id:'studioOpen',title:'Open a ROM, Forge project or extraction ZIP',onclick:()=>{setMode('edit');clickOriginal('#projectGatewayOpen')||clickOriginal('#projectGatewayFile');}},'Open…'),
  el('button',{id:'studioNew',onclick:()=>clickOriginal('#npNew166')},'New'),
  el('button',{id:'studioSave',title:'Save in this browser',onclick:()=>clickOriginal(byText('.project-bar button','Save'))},'Save'),
  el('button',{id:'studioSaveAs',title:'Save a portable project file',onclick:()=>clickOriginal(byText('.project-bar button','Save Project As…'))||clickOriginal(byText('.project-bar button','Download Project'))},'Save As…'),
  el('nav',{class:'sb-modes',role:'tablist','aria-label':'Studio mode'},...modeButtons),
  projectChip,el('span',{class:'sb-spacer'}),
  el('button',{id:'studioLearn',title:'Project lessons',onclick:()=>{setMode('edit');clickOriginal('#projectLessonsOpen');}},'Learn'),
  el('div',{class:'sb-menu'},toolsButton,toolsMenu));
document.body.prepend(bar);
const panel=el('section',{id:'studioPanel','aria-label':'Studio'});
const main=document.querySelector('.main');
if(main)main.before(panel);else document.body.append(panel);

const toolEntries=[
  ['Files',[['Open project file','button:not([id])',byText('.project-bar button','Open Project')],['Load from this browser',null,byText('.project-bar button','Load')],
    ['Open Forge ROM','#npOpenRom166'],['Upload image','.ctl>button[onclick*="fileIn"]'],['Load .zip pack (legacy)','.ctl>button[onclick*="zipIn"]'],['Import ROM (legacy)','.ctl>button[onclick*="romIn"]'],['Export…','.ctl>button[onclick="exportAll()"]']]],
  ['Recovery and native tools',[['Project investigation','#investigationOpen'],['Area library','#areaLibraryOpen'],['Recovered content (Punch-Out)','#punchOutContentOpen'],['Open native World','#nativeWorldOpen'],
    ['Native tools','#fcw-z2'],['Resource relationships','#fcw-relations'],['Extraction status','#fcw-coverage'],['Connected Workspace','#fcw-open']]],
  ['Game',[['Gameplay','#npGameplayOpen166'],['Build .NES ROM (download)','.ctl>button[onclick="buildNesRom()"]'],['Build & Run','.ctl>button[onclick="buildAndRun()"]']]],
  ['Workspace',[['Command palette (Ctrl+K)',null,null,()=>openPalette()],['Retro Workstation skin','#nf-skin-toggle'],['Clean cache','.ctl>button[onclick="cleanCache()"]']]]];
function renderTools(){
  toolsMenu.replaceChildren();
  for(const [heading,items] of toolEntries){
    const rows=items.filter(([, sel, find, fn])=>fn||(find?find():document.querySelector(sel)));
    if(!rows.length)continue;toolsMenu.append(el('div',{class:'tm-h',text:heading}));
    for(const [label,sel,find,fn] of rows)toolsMenu.append(el('button',{role:'menuitem',onclick:()=>{toggleTools(false);if(fn)fn();else{setMode('edit');clickOriginal(find||sel);}}},label));
  }
}
function toggleTools(force){const open=force===undefined?toolsMenu.hidden:force;if(open)renderTools();toolsMenu.hidden=!open;toolsButton.setAttribute('aria-expanded',String(open));if(open)toolsMenu.querySelector('button')?.focus();}
document.addEventListener('click',e=>{if(!toolsMenu.hidden&&!e.target.closest('.sb-menu'))toggleTools(false);});

// ---------- modes ----------
let mode='edit';
function setClassic(on){document.body.classList.toggle('studio-classic',on);classicButton.setAttribute('aria-pressed',String(on));store.set('classic',on);}
function setMode(next){
  if(!modes.some(m=>m[0]===next))next='edit';
  mode=next;for(const m of modes)document.body.classList.toggle('studio-mode-'+m[0],m[0]===next);
  modeButtons.forEach((b,i)=>b.setAttribute('aria-selected',String(modes[i][0]===next)));
  refreshProject();
  if(next==='library')renderLibrary();
  else if(next==='build')renderBuild();
  else if(next==='play'){try{switchTab('emu');}catch(_){/* emulator view optional */}if(typeof buildAndRun==='function'){try{buildAndRun();}catch(e){showToast?.(e.message);}}}
  else if(next==='edit'&&typeof S!=='undefined'&&['emu'].includes(S.tab)){try{switchTab('scene');}catch(_){}}
  store.set('mode',next==='play'?'edit':next);
}
async function refreshProject(){
  const r=await run('project.info');if(!r.ok)return;const i=r.result;
  projectChip.replaceChildren(el('b',{text:i.name||'Untitled'}),' · '+i.label);projectChip.title=i.scope||'';
}

// ---------- thumbnails ----------
const NES=typeof NP!=='undefined'?NP:null;
function sceneData(id){try{return services.ResourcePreview.scene(id);}catch(_){return (typeof S!=='undefined'?S.scenes.find(s=>s.id===id):null);}}
function drawScene(sc,canvas){
  if(!NES||!sc)return false;const ctx=canvas.getContext('2d');canvas.width=256;canvas.height=240;const img=ctx.createImageData(256,240),d=img.data;
  const chr=sc.chr||(typeof S!=='undefined'?S.chr:null),pal=sc.pal||[[15,0,16,48]],nt=sc.nt||[],attr=sc.attr||[];if(!chr)return false;
  for(let ty=0;ty<30;ty++)for(let tx=0;tx<32;tx++){const t=chr[nt[ty*32+tx]|0];if(!t)continue;const a=attr[(ty>>2)*8+(tx>>2)]|0,p=pal[(a>>(((ty>>1)&1)*4+((tx>>1)&1)*2))&3]||pal[0];
    for(let y=0;y<8;y++)for(let x=0;x<8;x++){const c=t[y][x],rgb=NES[(c?p[c]:pal[0][0])&63],i=((ty*8+y)*256+tx*8+x)*4;d[i]=rgb[0];d[i+1]=rgb[1];d[i+2]=rgb[2];d[i+3]=255;}}
  const spr=sc.sprChr||(typeof S!=='undefined'?S.sprChr:null),sp=sc.sprPal||pal;
  if(spr)for(const o of sc.oam||[]){if(o.active===false)continue;const tall=o.height===16,tiles=tall?[o.tile,o.tile2??o.tile+1]:[o.tile],a=o.attr|0,p=sp[a&3]||sp[0];
    tiles.forEach((tid,half)=>{const t=spr[tid&255];if(!t)return;for(let y=0;y<8;y++)for(let x=0;x<8;x++){const c=t[y][x];if(!c)continue;const xx=a&64?7-x:x,yy0=half*8+y,yy=a&128?(tall?15:7)-yy0:yy0,X=o.x+xx,Y=o.y+yy+1;
      if(X<0||X>255||Y<0||Y>239)continue;const rgb=NES[p[c]&63],i=(Y*256+X)*4;d[i]=rgb[0];d[i+1]=rgb[1];d[i+2]=rgb[2];d[i+3]=255;}});}
  ctx.putImageData(img,0,0);return true;
}
/* First screen of a World: 16x15 metatile IDs per screen (-1 = empty), metatiles [TL,TR,BL,BR] from its tileset Scene. */
function drawWorld(world,canvas){
  if(!NES||!world)return false;const sc=sceneData(world.tilesetSceneId);if(!sc)return false;
  const chr=sc.chr||S.chr,pal=sc.pal||[[15,0,16,48]],meta=new Map((sc.metatiles||[]).map(m=>[m.id,m])),stride=16*Math.max(1,world.widthScreens|0);
  if(!chr)return false;canvas.width=256;canvas.height=240;const ctx=canvas.getContext('2d'),img=ctx.createImageData(256,240),d=img.data,bg=NES[(sc.bgColor??pal[0][0])&63];
  for(let i=0;i<d.length;i+=4){d[i]=bg[0];d[i+1]=bg[1];d[i+2]=bg[2];d[i+3]=255;}
  for(let cy=0;cy<15;cy++)for(let cx=0;cx<16;cx++){const m=meta.get((world.map||[])[cy*stride+cx]);if(!m)continue;const p=pal[m.pal|0]||pal[0];
    (m.tiles||[]).forEach((tid,q)=>{const t=chr[tid&255];if(!t)return;const ox=cx*16+(q&1)*8,oy=cy*16+(q>>1)*8;
      for(let y=0;y<8;y++)for(let x=0;x<8;x++){const c=t[y][x],rgb=NES[(c?p[c]:pal[0][0])&63],i=((oy+y)*256+ox+x)*4;d[i]=rgb[0];d[i+1]=rgb[1];d[i+2]=rgb[2];}});}
  ctx.putImageData(img,0,0);return true;
}
function drawChr(sc,bank,canvas){
  const chr=bank==='spr'?(sc.sprChr||S.sprChr):(sc.chr||S.chr),pal=(bank==='spr'?sc.sprPal:sc.pal)||[[15,0,16,48]];if(!NES||!chr)return false;
  canvas.width=128;canvas.height=128;const ctx=canvas.getContext('2d'),img=ctx.createImageData(128,128),d=img.data;
  for(let t=0;t<256;t++){const tile=chr[t];if(!tile)continue;for(let y=0;y<8;y++)for(let x=0;x<8;x++){const rgb=NES[(pal[0][tile[y][x]]??15)&63],i=(((t>>4)*8+y)*128+(t&15)*8+x)*4;d[i]=rgb[0];d[i+1]=rgb[1];d[i+2]=rgb[2];d[i+3]=255;}}
  ctx.putImageData(img,0,0);return true;
}
function drawPose(pose,canvas){
  const sc=pose&&sceneData(pose.sceneId);if(!NES||!sc)return false;const spr=sc.sprChr||S.sprChr,sp=sc.sprPal||sc.pal;if(!spr)return false;
  const pcs=pose.pieces||[];if(!pcs.length)return false;const tall=pose.spriteMode===16||pcs.some(p=>p.tile2!==undefined);
  const xs=pcs.map(p=>p.x),ys=pcs.map(p=>p.y),x0=Math.min(...xs),y0=Math.min(...ys),w=Math.max(...xs)-x0+8,h=Math.max(...ys)-y0+(tall?16:8);
  canvas.width=Math.max(8,w);canvas.height=Math.max(8,h);const ctx=canvas.getContext('2d'),img=ctx.createImageData(canvas.width,canvas.height),d=img.data;
  for(const pc of pcs){const p=sp[pc.pal|0]||sp[0],tiles=tall?[pc.tile,pc.tile2??pc.tile+1]:[pc.tile];
    tiles.forEach((tid,half)=>{const t=spr[tid&255];if(!t)return;for(let y=0;y<8;y++)for(let x=0;x<8;x++){const c=t[y][x];if(!c)continue;const xx=pc.flipH?7-x:x,yy0=half*8+y,yy=pc.flipV?(tall?15:7)-yy0:yy0,X=pc.x-x0+xx,Y=pc.y-y0+yy;
      if(X<0||Y<0||X>=canvas.width||Y>=canvas.height)continue;const rgb=NES[p[c]&63],i=(Y*canvas.width+X)*4;d[i]=rgb[0];d[i+1]=rgb[1];d[i+2]=rgb[2];d[i+3]=255;}});}
  ctx.putImageData(img,0,0);return true;
}
function thumb(item){
  const box=el('div',{class:'sp-thumb'}),canvas=el('canvas');
  const paint=()=>{let ok=false;try{const o=item.open||{},sc=o.sceneId?sceneData(o.sceneId):null;
      if(item.type==='scene')ok=drawScene(sceneData(item.id),canvas);
      else if((item.type==='chr'||item.type==='tile')&&sc)ok=drawChr(sc,String(item.id).startsWith('spr')?'spr':'bg',canvas);
      else if(item.type==='metasprite')ok=drawPose(S.metasprites.find(m=>m.id===item.id),canvas);
      else if(item.type==='world')ok=drawWorld(S.worlds.find(w=>w.id===item.id),canvas);
      else if(['palette','sprite','collision'].includes(item.type)&&sc)ok=drawScene(sc,canvas);}catch(_){ok=false;}
    if(ok)box.replaceChildren(canvas);else box.textContent=item.type.toUpperCase();};
  if('IntersectionObserver' in window){const io=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){io.disconnect();paint();}});io.observe(box);}else paint();
  return box;
}
const badge=level=>{const l=LEVELS[level]||LEVELS.unknown;return el('span',{class:'lv '+l.cls,title:l.label,text:l.short});};

// ---------- Library ----------
const lib={search:store.get('libSearch',''),type:'',level:'',limit:120,selected:null};
async function renderLibrary(){
  const head=el('div',{class:'sp-head'}),list=el('div',{class:'sp-list',role:'listbox','aria-label':'Resources'}),detail=el('aside',{class:'sp-detail','aria-live':'polite'});
  panel.replaceChildren(el('div',{class:'sp-lib'},head,el('div',{class:'sp-body'},list,detail)));
  const all=await run('resources.list',{limit:5000});
  if(!all.ok){list.append(el('p',{text:'Resources unavailable: '+all.error.message}));return;}
  const items=all.result.items,types=[...new Set(items.map(i=>i.type))].sort();
  const search=el('input',{type:'search',placeholder:'Search assets by name or ID',value:lib.search,'aria-label':'Search assets',oninput:e=>{lib.search=e.target.value;store.set('libSearch',lib.search);lib.limit=120;fill();}});
  const typeSel=el('select',{'aria-label':'Asset type',onchange:e=>{lib.type=e.target.value;lib.limit=120;fill();}},el('option',{value:'',text:'All types'}),...types.map(t=>el('option',{value:t,text:t})));typeSel.value=lib.type;
  const chips=el('div',{class:'sp-chips',role:'group','aria-label':'Editability'});
  head.append(search,typeSel,chips,el('button',{onclick:()=>renderLibrary(),title:'Reload from the project'},'Refresh'));
  function fill(){
    const q=lib.search.toLowerCase();
    const base=items.filter(i=>(!lib.type||i.type===lib.type)&&(!q||(i.name+' '+i.key).toLowerCase().includes(q)));
    const counts={};for(const i of base)counts[i.editability.level]=(counts[i.editability.level]||0)+1;
    chips.replaceChildren(el('button',{class:'sp-chip','aria-pressed':String(!lib.level),onclick:()=>{lib.level='';fill();}},'All '+base.length),
      ...Object.keys(LEVELS).filter(l=>counts[l]).map(l=>el('button',{class:'sp-chip','aria-pressed':String(lib.level===l),title:LEVELS[l].label,onclick:()=>{lib.level=lib.level===l?'':l;fill();}},badge(l),' '+counts[l])));
    const rows=base.filter(i=>!lib.level||i.editability.level===lib.level);
    list.replaceChildren(...rows.slice(0,lib.limit).map(i=>el('button',{class:'sp-item',role:'option','aria-selected':String(lib.selected===i.key),'data-key':i.key,
      onclick:()=>{lib.selected=i.key;list.querySelectorAll('.sp-item').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.key===i.key)));inspect(i.key,detail);}},
      thumb(i),el('span',{class:'sp-name',text:i.name,title:i.name}),el('span',{class:'sp-meta'},el('span',{text:i.type}),badge(i.editability.level)))));
    if(rows.length>lib.limit)list.append(el('button',{class:'sp-more',onclick:()=>{lib.limit+=240;fill();}},'Show more ('+(rows.length-lib.limit)+' left)'));
    if(!rows.length)list.append(el('p',{class:'note',text:'No assets match.'}));
  }
  fill();
  if(lib.selected&&items.some(i=>i.key===lib.selected))inspect(lib.selected,detail);
  else detail.append(el('p',{class:'note',text:'Select an asset to see what it is, where it is used and what you can do with it. Badges: BUILD builds into your game, ROM writes into the original ROM, COPY is saved with the project but a native build refuses it, REF is read-only evidence.'}));
}
async function inspect(key,detail){
  const [info,sugg]=await Promise.all([run('resources.inspect',{key}),run('writer.suggest',{key})]);
  if(!info.ok){detail.replaceChildren(el('p',{text:info.error.message}));return;}
  const r=info.result,lv=LEVELS[r.editability.level]||LEVELS.unknown;
  const links=list=>list.length?el('ul',{},...list.slice(0,40).map(e=>{const other=e.from===key?e.to:e.from;return el('li',{},el('button',{class:'sp-link',onclick:()=>{lib.selected=other;inspect(other,detail);}},other),e.label?' — '+e.label:'');})):el('p',{class:'note',text:'None.'});
  const actions=el('div',{class:'sp-actions'},
    el('button',{class:r.editability.level==='reference'?'':'primary',onclick:async()=>{setMode('edit');const o=await run('resources.open',{key});if(!o.ok)showToast?.(o.error.message);}},'Open in editor'),
    el('button',{onclick:()=>{services.ResourceRelationshipPreview?.openAt?.(key);}},'Relationships'));
  const suggestions=sugg.ok?sugg.result.suggestions:[];
  detail.replaceChildren(el('h2',{text:r.name}),el('p',{},badge(r.editability.level),' ',lv.label),
    el('p',{class:'note',text:r.editability.note}),r.summary?el('p',{text:r.summary}):null,r.details?el('p',{class:'note',text:r.details}):null,actions,
    ...suggestions.map(s=>{
      // A suggestion may offer choices (e.g. every pose of a fighter); the button runs the selected one.
      const pick=s.choices?.length?el('select',{class:'sp-pick','aria-label':'Choose'},...s.choices.map((c,i)=>{const o=el('option',{value:String(i),text:c.label});
        if(JSON.stringify(c.args)===JSON.stringify(s.args))o.selected=true;return o;})):null;
      const args=()=>pick?s.choices[+pick.value].args:s.args;
      return el('div',{class:'sp-sugg'},el('p',{},badge(s.level),' ',s.title),el('p',{class:'note',text:s.note}),
      s.sharedWith?.length?el('p',{class:'shared',text:'Also changes: '+s.sharedWith.join(', ')}):null,pick,
      s.args?el('button',{class:'primary',onclick:async()=>{const res=await run(s.command||'writer.prepare',args());if(!res.ok){showToast?.(res.error.message);return;}
        if(res.result.resourceKey){lib.selected=res.result.resourceKey;await renderLibrary();}}},s.label||'Open writer view'):null);}),
    el('h3',{text:'Uses'}),links(r.uses),el('h3',{text:'Used by'}),links(r.usedBy),el('p',{class:'note',text:'Key: '+r.key}));
}

// ---------- Build ----------
async function renderBuild(){
  const body=el('div',{class:'sp-body'}),head=el('div',{class:'sp-head'});
  panel.replaceChildren(el('div',{class:'sp-build'},head,body));
  const info=await run('project.info'),changes=await run('build.changes');
  head.append(el('button',{class:'primary',onclick:()=>renderBuild()},'Check build'),
    el('button',{onclick:async()=>{const r=await run('build.rom');if(!r.ok){renderBuild();return;}const bytes=Uint8Array.from(atob(r.result.base64),c=>c.charCodeAt(0));
      const a=el('a',{href:URL.createObjectURL(new Blob([bytes],{type:'application/octet-stream'})),download:((S.projectName||'game').replace(/[^\w-]/g,'_'))+'.nes'});document.body.append(a);a.click();a.remove();}},'Download ROM'),
    el('button',{onclick:()=>setMode('play')},'Play'));
  const check=await run('build.check');
  if(check.ok){body.append(el('div',{class:'bd-card bd-ok'},el('h3',{text:'Build passes'}),el('p',{text:check.result.backend+' · '+check.result.bytes+' bytes · SHA-256 '+check.result.sha256.slice(0,16)+'…'}),
    ...check.result.diagnostics.slice(0,12).map(d=>el('p',{class:'note',text:d.message}))));}
  else{const d=check.error.diagnostics[0]||{};
    body.append(el('div',{class:'bd-card bd-err'},el('h3',{text:'Build refused'}),el('p',{text:check.error.message}),
      d.assetName?el('p',{},'Asset: ',el('button',{class:'sp-link',onclick:()=>{lib.selected=d.resourceKey;setMode('library');}},d.assetName),d.path?' · '+d.path:''):null,
      d.repair?el('p',{class:'note',text:d.repair}):null,
      ...(d.changedSinceLastBuildable||[]).map(c=>el('p',{},badge(c.editability?.level||'unknown'),' ',el('button',{class:'sp-link',onclick:()=>{lib.selected=c.resourceKey;setMode('library');}},c.name||c.id),' — '+c.type+', '+c.change))));}
  if(changes.ok&&changes.result.changes?.length)body.append(el('div',{class:'bd-card'},el('h3',{text:'Changed since the last buildable state'}),
    ...changes.result.changes.map(c=>el('p',{},badge(c.editability?.level||'unknown'),' ',el('button',{class:'sp-link',onclick:()=>{lib.selected=c.resourceKey;setMode('library');}},c.name||c.id),' — '+c.type+', '+c.change))));
  if(info.ok)body.append(el('div',{class:'bd-card'},el('h3',{text:info.result.label}),
    info.result.writers.length?el('p',{class:'note',text:'Edits reach the original ROM only through these writers:'}):el('p',{class:'note',text:'Authored project: everything you edit is compiled into the game.'}),
    ...info.result.writers.map(w=>el('details',{},el('summary',{},badge('native'),' ',el('b',{text:w.title})),el('p',{class:'note',text:w.scope||''})))));
}

// ---------- command palette (keyboard adapter) ----------
const palette=el('div',{id:'studioPalette',role:'dialog','aria-label':'Command palette','aria-modal':'true'});
let palCommands=[],palIndex=0;
function openPalette(){
  const q=el('input',{type:'text',placeholder:'Type a command (e.g. build.check)','aria-label':'Command'}),argsBox=el('textarea',{rows:'2','aria-label':'Arguments as JSON',placeholder:'{} arguments as JSON'}),
    listEl=el('ul',{role:'listbox'}),out=el('pre',{'aria-live':'polite'});
  const fill=()=>{const t=q.value.toLowerCase();const rows=palCommands.filter(c=>(c.name+' '+c.title).toLowerCase().includes(t));palIndex=Math.min(palIndex,Math.max(0,rows.length-1));
    listEl.replaceChildren(...rows.map((c,i)=>el('li',{role:'option','aria-selected':String(i===palIndex),onclick:()=>{palIndex=i;exec(rows);}},c.name+' — '+c.title)));return rows;};
  const exec=async rows=>{const c=rows[palIndex];if(!c)return;let a={};try{a=argsBox.value.trim()?JSON.parse(argsBox.value):{};}catch(e){out.textContent='Arguments are not valid JSON: '+e.message;return;}
    out.textContent='Running '+c.name+'…';const r=await C.run(c.name,a,{adapter:'keyboard'});const shown=JSON.parse(JSON.stringify(r,(k,v)=>k==='base64'||k==='json'?'('+String(v).length+' chars)':v));out.textContent=JSON.stringify(shown,null,1).slice(0,6000);refreshProject();};
  q.addEventListener('input',()=>{palIndex=0;fill();});
  q.addEventListener('keydown',e=>{const rows=fill();if(e.key==='ArrowDown'){palIndex=Math.min(rows.length-1,palIndex+1);fill();e.preventDefault();}else if(e.key==='ArrowUp'){palIndex=Math.max(0,palIndex-1);fill();e.preventDefault();}else if(e.key==='Enter'){exec(rows);e.preventDefault();}});
  palette.replaceChildren(el('div',{class:'pal'},q,argsBox,listEl,out));palette.classList.add('open');
  C.run('commands.list').then(r=>{palCommands=r.ok?r.result:[];fill();});q.focus();
}
palette.addEventListener('click',e=>{if(e.target===palette)palette.classList.remove('open');});
document.body.append(palette);
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&palette.classList.contains('open')){palette.classList.remove('open');return;}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openPalette();return;}
  if(e.altKey&&!e.ctrlKey&&['1','2','3','4'].includes(e.key)){e.preventDefault();setMode(modes[+e.key-1][0]);}
},true);

// ---------- start ----------
document.body.classList.add('studio-on');
setClassic(store.get('classic',false));
setMode(store.get('mode','edit'));
setInterval(()=>{if(document.visibilityState==='visible'&&typeof S!=='undefined'&&!projectChip.textContent.startsWith(S.projectName||'Untitled'))refreshProject();},2000);
C.subscribe(e=>{if(e.type==='project'){refreshProject();if(mode==='library')renderLibrary();}});
services.StudioShell=Object.freeze({setMode,mode:()=>mode,setClassic,openPalette,refresh:()=>setMode(mode),renderLibrary,renderBuild,
  drawScene:(id,canvas)=>drawScene(sceneData(id),canvas),drawWorld:(id,canvas)=>drawWorld((S.worlds||[]).find(w=>w.id===id),canvas)});
})();
