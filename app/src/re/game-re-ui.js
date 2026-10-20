/* Connected native game resources inside the spatial workbench. Source state
 * is detached; no editor, Undo, live emulation or ROM mutation is performed. */
(()=>{
'use strict';
const F=window.Forge,api=window.GameRENative;
const state={session:null,report:null,scene:null,animation:null,pose:null,tick:0,timer:null,token:0,analysis:null};
let ui;
const el=(tag,id,text)=>{const n=document.createElement(tag);if(id)n.id=id;if(text!==undefined)n.textContent=text;return n;};
const hex=(n,w=4)=>'$'+Number(n).toString(16).toUpperCase().padStart(w,'0');
const address=s=>s?'PRG '+s.bank16KiB+' · CPU '+hex(s.cpu)+' · file '+hex(s.fileOffset,6):'Not established';
function option(select,value,text){const o=el('option',null,text);o.value=String(value);select.appendChild(o);}
function message(text,error=false){ui.status.textContent=text;ui.status.dataset.error=String(error);}
function pause(){if(state.timer!==null)clearInterval(state.timer);state.timer=null;if(ui)ui.play.textContent='Play native script';}
function clear(){
 pause();state.token++;state.session=state.report=state.scene=state.animation=state.pose=state.analysis=null;F.services.SceneContextUI?.refresh();
 if(ui){ui.root.hidden=true;for(const s of [ui.scenes,ui.groups,ui.actors,ui.scripts,ui.poses,ui.symbols])s.replaceChildren();ui.details.textContent='';ui.cell.textContent='';ui.code.textContent='';ui.coverage.textContent='';ui.selected.disabled=ui.catalog.disabled=true;}
}
function showPane(name){pause();for(const [key,pane]of Object.entries(ui.panes))pane.hidden=key!==name;for(const b of ui.tabs)b.classList.toggle('selected',b.dataset.pane===name);}
function drawPixels(canvas,width,height,colors){
 canvas.width=width;canvas.height=height;const cx=canvas.getContext('2d'),im=cx.createImageData(width,height);
 for(let i=0;i<colors.length;i++){const rgb=NP[colors[i]&63]||NP[15];im.data.set([...rgb,255],i*4);}cx.putImageData(im,0,0);
 canvas.style.width=width*Number(ui.zoom.value||1)+'px';canvas.style.height=height*Number(ui.zoom.value||1)+'px';
}
function drawScene(){
 const d=state.scene;if(!d)return;
 const nativeArt=ui.mode.value==='art'&&d.graphics;
 if(nativeArt){const p=state.session.raster(d.scene.id);drawPixels(ui.map,p.width,p.height,p.colors);}
 else{
  const colors=new Uint8Array(d.width*16*d.height*16),w=d.width*16;
  for(let y=0;y<d.height*16;y++)for(let x=0;x<w;x++){const v=d.cells[(y>>4)*d.width+(x>>4)];colors[y*w+x]=(x%16===0||y%16===0)?15:([1,17,33,26,38,21,40,18,35,6,29,36,44,22,42,37][v&15]);}
  drawPixels(ui.map,w,d.height*16,colors);
 }
 if(ui.overlay.checked){
  const cx=ui.map.getContext('2d');cx.font='10px monospace';cx.textBaseline='bottom';
  for(const [items,color,letter]of [[d.scene.enemies,'#ff9aaf','E'],[d.scene.lanterns||[],'#ffd67a','L']])for(const p of items){const x=p.x,y=p.y-d.originY;if(x<0||x>=ui.map.width||y<0||y>=ui.map.height)continue;cx.strokeStyle=color;cx.strokeRect(x-3,y-3,8,8);cx.fillStyle=color;cx.fillText(letter+p.id,x,y-4);}
 }
 ui.mapCaption.textContent=d.scene.label+' · '+d.width+' × '+d.height+' native cells · art '+ui.map.width+' × '+ui.map.height+' px · origin Y='+d.originY+' · '+d.evidence;
}
function listScenes(){
 pause();ui.scenes.replaceChildren();const group=ui.groups.value;
 for(const s of state.report?.scenes||[])if(!group||s.group===group)option(ui.scenes,s.id,s.label+(s.status==='unavailable-slot'?' · unavailable':''));
 if(ui.scenes.options.length)ui.scenes.value=ui.scenes.options[0].value;selectScene();
}
function selectScene(){
 pause();state.scene=null;ui.cell.textContent='';ui.details.textContent='';ui.selected.disabled=true;
 try{
  const id=ui.scenes.value,s=state.report?.scenes.find(s=>s.id===id);if(!s)return;
  ui.source.textContent=address(s.source)+'\n'+(s.header?'Header '+s.header.raw.map(v=>hex(v,2)).join(' ')+' · '+s.header.screensWide+' screens':'Area '+s.area+' · room '+s.room);
  if(s.status==='unavailable-slot'){ui.map.width=ui.map.height=1;ui.mapCaption.textContent='Unavailable native slot: no normal scene header; no geometry was inferred.';ui.details.textContent=JSON.stringify(s,null,2);return;}
  state.scene=state.session.scene(id);ui.selected.disabled=false;drawScene();drawPose();
  ui.details.textContent=JSON.stringify({entrance:s.entrance,areaStartCue:s.areaStartCue,timeCode:s.timeCode,header:s.header,enemies:s.enemies,lanterns:s.lanterns,commands:s.commands,connections:s.connections,execution:state.scene.execution,graphicsContext:state.scene.graphics?.context,limits:state.scene.limits},null,2);
  message('Decoded '+s.label+'. Source state is detached from the project and live emulator.');
 }catch(e){ui.map.width=ui.map.height=1;ui.mapCaption.textContent='No decoded output is available for this selection.';message(e.message,true);}finally{F.services.SceneContextUI?.refresh();}
}
function selectSceneById(id){
 const s=state.report?.scenes.find(s=>s.id===id);if(!s||s.status==='unavailable-slot')return false;
 ui.groups.value=s.group;ui.scenes.replaceChildren();for(const item of state.report.scenes)if(item.group===s.group)option(ui.scenes,item.id,item.label+(item.status==='unavailable-slot'?' · unavailable':''));
 ui.scenes.value=id;selectScene();showPane('scenes');return state.scene?.scene.id===id;
}
function inspectCell(event){
 const d=state.scene;if(!d)return;const rect=ui.map.getBoundingClientRect(),x=Math.floor((event.clientX-rect.left)*ui.map.width/rect.width/16),y=Math.floor((event.clientY-rect.top)*ui.map.height/rect.height/16);
 if(x<0||y<0||x>=d.width||y>=d.height)return;const i=y*d.width+x;
 ui.cell.textContent=JSON.stringify({x,y,nativeY:d.originY+y*16,nativeValue:d.cells[i],nativeMeaning:d.classes?.[d.cells[i]]||'Native tile code; collision meaning is not inferred',behaviorFlags:d.behaviorFlags?.[i],source:d.cellSources[i],graphics:d.graphics?.tileSources[(y*2)*d.graphics.width+x*2]},null,2);
}
function actorDetails(){const actor=state.report?.actors.find(a=>a.id===ui.actors.value);ui.actorDetails.textContent=actor?JSON.stringify(actor,null,2):'No decoded actor table for this source.';}
function scriptContext(a){return a?F.services.GameREAssets.scriptContext(a):{owner:null,status:'empty'};}
function missingScriptPoses(a){if(!a||!scriptContext(a).owner)return [];const owner=scriptContext(a).owner;return [...new Set(a.frames.filter(f=>!state.report.poses.some(p=>p.owner===owner&&p.selector===f.pose)).map(f=>f.pose))];}
function selectScript(){
 pause();state.animation=state.report?.animations.find(a=>a.id===ui.scripts.value)||null;state.tick=0;
 if(state.animation){const owner=scriptContext(state.animation).owner;state.pose=state.report.poses.find(p=>p.owner===owner&&p.selector===state.animation.frames[0].pose)||null;if(state.pose)ui.poses.value=state.pose.id;}
 const missing=missingScriptPoses(state.animation),context=scriptContext(state.animation);ui.play.disabled=!state.animation||!context.owner||missing.length>0;
 drawPose();if(missing.length||context.status==='partial')message('Partial script '+state.animation.selector+': '+(missing.length?'unassigned native pose references '+missing.join(', '):context.reason)+'. Playback and editable import are unavailable; frame/source evidence remains exportable. Reachability is unresolved.');
}
function selectPose(){pause();state.animation=null;ui.play.disabled=true;state.pose=state.report?.poses.find(p=>p.id===ui.poses.value)||null;drawPose();}
function drawPose(){
 const pose=state.pose,canvas=ui.sprite;canvas.width=256;canvas.height=192;const cx=canvas.getContext('2d');cx.fillStyle='#080f1c';cx.fillRect(0,0,256,192);
 if(!pose){ui.poseDetails.textContent=state.animation?JSON.stringify({status:'partial',script:state.animation,spriteContext:scriptContext(state.animation),unassignedPoseSelectors:missingScriptPoses(state.animation),limits:['Pose references or their sprite-table context are unresolved; no blank frames or replacement art were inferred. Runtime reachability remains unresolved.']},null,2):'No pose selected.';return;}
 const scene=state.scene,g=scene?.graphics,ng=state.report.profile.id==='ninja-gaiden-us';
 const chr0=ng?(scene?.scene.spriteChrBank4KiB||0):Math.max(0,(g?.chrBank4KiB||3)-1),chr1=ng?(scene?.scene.backgroundChrBank4KiB||1):(g?.chrBank4KiB||3);
 const banks=[state.session.chrBank(chr0).bytes,state.session.chrBank(chr1).bytes];
 const colors=ng?scene?.scene.palettes.sprites:g?.nativePalette?Array.from({length:4},(_,i)=>[g.nativePalette[16],...g.nativePalette.slice(17+i*4,20+i*4)]):null;
 const fallback=[[15,16,32,48],[15,1,17,33],[15,6,22,38],[15,9,25,41]],palette=colors||fallback;
 // Reverse draw order gives the first native OAM piece sprite priority.
 for(const p of [...pose.pieces].reverse()){
  const bank=banks[p.tile&1],tile=p.tile&254,at=p.attributes;
  for(let y=0;y<16;y++)for(let x=0;x<8;x++){
   const sy=at&128?15-y:y,sx=at&64?7-x:x,a=(tile+(sy>>3))*16+(sy&7),bit=7-sx,ci=((bank[a]>>bit)&1)|(((bank[a+8]>>bit)&1)<<1);if(!ci)continue;
   const rgb=NP[palette[at&3][ci]&63];cx.fillStyle='rgb('+rgb.join(',')+')';cx.fillRect(112+(p.x+x)*3,72+(p.y+y+1)*3,3,3);
  }
 }
 ui.poseDetails.textContent=JSON.stringify({pose:pose.label,selector:pose.selector,facing:pose.facing,pieces:pose.pieces,script:state.animation,chrBanks4KiB:[chr0,chr1],palette:colors?'Initial selected scene palette':'Authored fallback; select a scene for native initial colors',limits:pose.limits},null,2);
}
function play(){
 if(state.timer!==null){pause();return;}const a=state.animation;
 if(!a){message('Select a timed native script. Zelda II display poses do not establish animation timing.');return;}
 if(missingScriptPoses(a).length||!scriptContext(a).owner){message('This partial script has unresolved pose references or sprite-table context. Export its evidence for investigation.');return;}
 ui.play.textContent='Pause script';state.tick=0;
 state.timer=setInterval(()=>{
  if(document.hidden||S.tab!=='disasm'){pause();return;}
  if(state.tick>=a.ticks){if(a.end==='player-return-to-idle'){pause();return;}state.tick=0;}
  let t=state.tick++,frame=a.frames[0];for(const f of a.frames){frame=f;if(t<(f.updateTicks||f.duration))break;t-=f.updateTicks||f.duration;}
  const owner=scriptContext(a).owner;state.pose=state.report.poses.find(p=>p.owner===owner&&p.selector===frame.pose)||null;drawPose();
 },1000/60);
}
function drawChr(){
 if(!state.session)return;const b=state.session.chrBank(Number(ui.chr.value)),colors=new Uint8Array(128*128),pal=[15,16,32,48];
 for(let tile=0;tile<256;tile++)for(let y=0;y<8;y++)for(let x=0;x<8;x++){const a=tile*16+y,bit=7-x,ci=((b.bytes[a]>>bit)&1)|(((b.bytes[a+8]>>bit)&1)<<1);colors[((tile>>4)*8+y)*128+(tile&15)*8+x]=pal[ci];}
 drawPixels(ui.chrCanvas,128,128,colors);ui.chrCanvas.style.width=ui.chrCanvas.style.height='384px';ui.chrDetails.textContent='Physical CHR bank '+b.bank4KiB+' · file '+hex(b.fileOffset,6)+' · 256 native patterns · authored grayscale. Scene mappings are stated in the scene evidence.';
}
function listSymbols(){
 if(!state.report)return;const query=ui.search.value.trim().toLowerCase();ui.symbols.replaceChildren();
 for(const [i,s]of state.report.symbols.entries())if(!query||s[2].toLowerCase().includes(query))option(ui.symbols,i,s[0]+':'+hex(s[1])+' · '+s[3]+' · '+s[2]);
 if(ui.symbols.options.length)ui.symbols.value=ui.symbols.options[0].value;showCode();
}
function showCode(){
 const item=state.report?.symbols[Number(ui.symbols.value)];if(!item||!ui.symbols.options.length){ui.code.textContent='No matching source annotation.';return;}
 const [bank,cpu,label,kind,file,line]=item,length=Math.min(96,(bank===7?0x10000:0xc000)-cpu),read=state.session.readPrg(bank,cpu,length);
 const header=label+'\n'+address(read.source)+'\nReference '+file+':'+line+' · '+kind+' annotation\nLabels are research annotations; code below is a bounded linear listing.\n\n';
 if(state.analysis&&kind==='code'){const d=state.analysis.disassemble({fileOffset:read.source.fileOffset,length,cpuAddress:cpu,bankLabel:'Physical PRG '+bank});ui.code.textContent=header+d.rows.map(r=>hex(r.cpuAddress??r.cpu??0)+'  '+r.bytes?.map(v=>hex(v,2).slice(1)).join(' ')+'  '+r.mnemonic+' '+r.operand).join('\n');}
 else ui.code.textContent=header+read.bytes.map((v,i)=>(i%16===0?'\n'+hex(cpu+i)+'  ':'')+hex(v,2).slice(1)).join(' ');
}
function coverage(){
 const d=state.report,ng=d.profile.id==='ninja-gaiden-us';
 const rows=[
  ['Scene tables',ng?'48 rooms':'567 slots / nine contexts; '+d.scenes.filter(s=>s.status==='unavailable-slot').length+' unavailable slots'],
  ['Original art','Initial scene art, palettes and physical CHR source bindings'],
  ['Objects',ng?'Enemy / lantern spawn records and entrance bytes':'Object command streams, enemy records, page-indexed connections and overworld location columns'],
  ['Actors',d.actors.length+' context entries with native parameter and dispatch codes; AI not translated'],
  ['Animation',ng?d.animations.length+' nonempty scripts; '+d.poses.length+' poses':d.poses.length+' executed Link pose/facing samples; timing and enemy poses unresolved'],
  ['Collision',ng?'Native ground kinds / directional flag bytes; full movement and combat semantics incomplete':'Constructed tile codes; full directional collision response incomplete'],
  ['6502 / RAM',d.symbols.length+' source labels; contextual RAM annotations; source labels are not execution proof'],
  ['Audio','Use the existing Audio tab for the exact-revision cue library and native audition'],
  ['Playable reconstruction','Not implemented by this read-only catalog'],
  ['Still unresolved','Full physics/AI, state transitions, hitboxes/hurtboxes, quest/item conditions, all cutscenes/dialogue and event-to-audio links']
 ];
 ui.coverage.replaceChildren();const table=el('table'),body=el('tbody');for(const [name,value]of rows){const tr=el('tr');tr.append(el('th',null,name),el('td',null,value));body.appendChild(tr);}table.appendChild(body);ui.coverage.appendChild(table);
 const limits=el('ul');for(const limit of d.limits)limits.appendChild(el('li',null,limit));ui.coverage.appendChild(limits);
 ui.ram.textContent=d.ram.map(([a,name])=>hex(a)+'  '+name).join('\n')+'\n\nRAM names are source/context annotations. The runtime watch tools supply actual writer evidence.';
 ui.locations.textContent=JSON.stringify(d.locations,null,2);
}
function exportData(kind='selected'){
 if(!state.report)throw Error('Open an investigated source first.');
 if(kind==='catalog')return cloneData(state.report);
 if(!state.scene)throw Error('Select an available native scene first.');
 return cloneData({format:'NESForgeNativeGameSelection',version:1,source:state.report.source,profile:state.report.profile,scene:state.scene,pose:state.pose,animation:state.animation,limits:state.report.limits});
}
async function exportEditable(){
 if(!state.session||!state.scene)throw Error('Select an available native scene first.');
 pause();return F.services.GameREAssets.seal(F.services.GameREAssets.convert(state.session,{sceneId:state.scene.scene.id,...(state.animation?{animationId:state.animation.id}:state.pose?{poseId:state.pose.id}:{})}));
}
const cloneData=value=>JSON.parse(JSON.stringify(value));
async function download(kind){try{const data=exportData(kind),filename=kind==='catalog'?'NES_Forge_Native_Resource_Catalog.json':'NES_Forge_Native_Scene_Evidence.json';return await forgeSave.request(new TextEncoder().encode(JSON.stringify(data,null,2)),filename,'application/json');}catch(e){message(e.message,true);return false;}}
function openBytes(bytes,name){
 clear();if(!ui)return false;const token=state.token;
 try{
  state.session=api.open(bytes,name);state.report=state.session.catalog();if(state.report.status!=='supported'){state.session=state.report=null;return false;}
  ui.root.hidden=false;ui.catalog.disabled=false;ui.title.textContent=state.report.profile.name+' · connected native resources';
  ui.counts.textContent=state.report.scenes.length+' scene/context slots · '+state.report.actors.length+' actor entries · '+state.report.poses.length+' poses · '+state.report.animations.length+' timed scripts · '+state.report.symbols.length+' source labels';
  option(ui.groups,'','All native contexts');for(const group of new Set(state.report.scenes.map(s=>s.group)))option(ui.groups,group,group);ui.groups.value='';
  for(const actor of state.report.actors)option(ui.actors,actor.id,(actor.group?actor.group+' · ':'')+actor.label);if(ui.actors.options.length)ui.actors.value=ui.actors.options[0].value;
  for(const a of state.report.animations){const missing=missingScriptPoses(a);option(ui.scripts,a.id,a.label+(missing.length?' · partial: unassigned poses '+missing.join(', '):!scriptContext(a).owner?' · partial: sprite table unresolved':''));}if(ui.scripts.options.length)ui.scripts.value=ui.scripts.options[0].value;
  for(const p of state.report.poses)option(ui.poses,p.id,p.label);if(ui.poses.options.length)ui.poses.value=ui.poses.options[0].value;
  ui.scripts.disabled=ui.play.disabled=!state.report.animations.length;ui.search.value='';ui.mode.value='art';ui.zoom.value='1';ui.overlay.checked=false;
  state.pose=state.report.poses[0]||null;listScenes();actorDetails();drawChr();listSymbols();coverage();showPane('scenes');
  // Reuse the existing physical disassembler, with explicit native bank maps.
  F.services.SceneContextUI?.refresh();
  if(F.services.REAnalysis)void F.services.REAnalysis.open(bytes,{name}).then(analysis=>{if(token!==state.token)return;state.analysis=analysis;showCode();}).catch(()=>{});
  return true;
 }catch(e){clear();ui.root.hidden=false;message(e.message,true);return false;}
}
function mount(){
 if(ui)return;const results=document.getElementById('spatialREResults');if(!results)return;
 const style=el('style');style.textContent='#nativeGameRE{margin:22px 0;padding:18px;background:#10202f;border:1px solid #527b82;border-radius:10px;min-width:0}#nativeGameRE .native-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:14px 0}#nativeGameRE .native-counts{color:#95e8d4}#nativeGameRE table{border-collapse:collapse;width:100%}#nativeGameRE th,#nativeGameRE td{text-align:left;vertical-align:top;border-bottom:1px solid #304b65;padding:8px}#nativeGameRE th{width:145px;color:#a6e4d4}#nativeGameRE pre{max-height:420px;overflow:auto;background:#0a1421;padding:12px}#nativeGameRE input[type=checkbox]{min-height:18px;width:18px}#nativeGameRE .native-scroll{max-height:600px;overflow:auto;background:#060e18}#nativeGameRE select{max-width:100%;min-width:0}#nativeGameRE canvas{image-rendering:pixelated;max-width:none}#nativeGameRE [hidden]{display:none!important}@media(max-width:600px){#nativeGameRE{padding:10px}#nativeGameRE th{width:90px}}';document.head.appendChild(style);
 const root=el('section','nativeGameRE');root.hidden=true;root.setAttribute('aria-label','Connected native game resources');const title=el('h2','nativeGameRETitle'),counts=el('p','nativeGameRECounts');counts.className='native-counts';root.append(title,counts,el('p',null,'Inspect the original art, geometry, object records, sprite resources and code behind a scene. Source labels and unresolved behavior remain explicit.'));
 const status=el('p','nativeGameREStatus');status.setAttribute('role','status');root.appendChild(status);const tabs=el('div'),tabButtons=[],panes={};tabs.className='native-tabs';root.appendChild(tabs);
 const row=parent=>{const n=el('div');n.className='spatial-row';parent.appendChild(n);return n;};
 const field=(parent,label,id,tag='select')=>{const l=el('label',null,label),input=el(tag,id);l.htmlFor=id;l.appendChild(input);parent.appendChild(l);return input;};
 const button=(parent,id,text,fn)=>{const b=el('button',id,text);b.type='button';b.addEventListener('click',fn);parent.appendChild(b);return b;};
 for(const [id,label]of [['scenes','Scenes & objects'],['actors','Actors & parameters'],['animation','Scripts & poses'],['graphics','CHR patterns'],['code','6502 & RAM'],['coverage','Coverage & gaps']]){const b=button(tabs,'nativeGameRETab-'+id,label,()=>showPane(id));b.dataset.pane=id;tabButtons.push(b);const pane=el('section','nativeGameREPane-'+id);panes[id]=pane;root.appendChild(pane);}
 const sceneRow=row(panes.scenes),groups=field(sceneRow,'Native context','nativeGameREGroup'),scenes=field(sceneRow,'Scene / table slot','nativeGameREScene');groups.addEventListener('change',listScenes);scenes.addEventListener('change',selectScene);
 const controls=row(panes.scenes),mode=field(controls,'View','nativeGameREMode');option(mode,'art','Original initial art');option(mode,'codes','Native ground / tile codes');mode.addEventListener('change',drawScene);
 const zoom=field(controls,'Zoom','nativeGameREZoom');for(const z of [1,2,3])option(zoom,z,z+'×');zoom.value='1';zoom.addEventListener('change',drawScene);const overlay=field(controls,'Show spawn triggers','nativeGameREOverlay','input');overlay.type='checkbox';overlay.addEventListener('change',drawScene);
 const source=el('pre','nativeGameRESource'),mapCaption=el('p','nativeGameREMapCaption'),scroll=el('div'),map=el('canvas','nativeGameREMap');scroll.className='native-scroll';scroll.appendChild(map);map.addEventListener('click',inspectCell);const cell=el('pre','nativeGameRECell');
 const detailBox=el('details');detailBox.appendChild(el('summary',null,'Objects, connections, native execution and limits'));const details=el('pre','nativeGameREDetails');detailBox.appendChild(details);panes.scenes.append(source,mapCaption,scroll,cell,el('p',null,'E marks an enemy spawn record; L marks a lantern trigger. Markers are investigation aids. Directional spawning and runtime changes are not simulated.'),detailBox);
 const actors=field(row(panes.actors),'Native actor/context entry','nativeGameREActor');actors.addEventListener('change',actorDetails);const actorDetailsNode=el('pre','nativeGameREActorDetails');panes.actors.appendChild(actorDetailsNode);
 const animRow=row(panes.animation),scripts=field(animRow,'Timed script (Ninja Gaiden)','nativeGameREScript'),poses=field(animRow,'Pose / facing sample','nativeGameREPose');scripts.addEventListener('change',selectScript);poses.addEventListener('change',selectPose);const playButton=button(panes.animation,'nativeGameREPlay','Play native script',play),sprite=el('canvas','nativeGameRESprite'),poseDetails=el('pre','nativeGameREPoseDetails');panes.animation.append(el('p',null,'Sprite colors and CHR mapping follow the selected scene. Zelda II has executed display poses; animation timing is still unresolved.'),sprite,poseDetails);
 const chr=field(row(panes.graphics),'Physical CHR bank (4 KiB)','nativeGameREChr');for(let i=0;i<32;i++)option(chr,i,'Bank '+i);chr.value='0';chr.addEventListener('change',drawChr);const chrCanvas=el('canvas','nativeGameREChrCanvas'),chrDetails=el('p','nativeGameREChrDetails');const chrScroll=el('div');chrScroll.className='native-scroll';chrScroll.appendChild(chrCanvas);panes.graphics.append(chrScroll,chrDetails);
 const search=field(row(panes.code),'Search source labels','nativeGameRESearch','input');search.type='search';search.addEventListener('input',listSymbols);const symbols=field(row(panes.code),'Physical source annotation','nativeGameRESymbol');symbols.addEventListener('change',showCode);const code=el('pre','nativeGameRECode'),ram=el('pre','nativeGameRERAM');panes.code.append(code,el('h3',null,'RAM investigation leads'),ram);
 const coverageNode=el('div','nativeGameRECoverage'),locationsBox=el('details'),locations=el('pre','nativeGameRELocations');locationsBox.append(el('summary',null,'Raw overworld location records'),locations);panes.coverage.append(coverageNode,locationsBox);
 const exports=row(root),selected=button(exports,'nativeGameREExportSelected','Export selected scene evidence',()=>void download('selected')),catalog=button(exports,'nativeGameREExportCatalog','Export resource catalog',()=>void download('catalog'));button(exports,'nativeGameREPrepareAssets','Prepare editable assets',()=>void F.services.GameREAssetsUI.previewSelection());selected.disabled=catalog.disabled=true;root.appendChild(el('p',null,'Evidence exports retain native tables and annotations. Use Prepare editable assets to preview an importable bundle with pixels, palettes, paged layouts and the selected pose or timed script.'));
 results.insertBefore(root,document.getElementById('spatialREMaps'));
 ui={root,title,counts,status,tabs:tabButtons,panes,groups,scenes,mode,zoom,overlay,source,mapCaption,map,cell,details,actors,actorDetails:actorDetailsNode,scripts,poses,play:playButton,sprite,poseDetails,chr,chrCanvas,chrDetails,search,symbols,code,ram,coverage:coverageNode,locations,selected,catalog};
 for(const type of ['keydown','keyup'])root.addEventListener(type,e=>e.stopPropagation?.());document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
}
F.services.GameRE=api;F.services.GameREUI=Object.freeze({mount,openBytes,clear,pause,exportData,exportEditable,selectSceneById,getState:()=>({status:state.report?.status||'empty',profile:state.report?.profile.id||null,sha256:state.report?.source.sha256||null,scenes:state.report?.scenes.length||0,selectedScene:state.scene?.scene.id||null,playing:state.timer!==null})});mount();
})();
