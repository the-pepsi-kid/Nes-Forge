/* NES FORGE PROTOTYPE — Unified Resource Explorer v0.3
 * Read-only adapter over existing project asset owners. No schema, ProjectStore,
 * encoder, persisted state, or original app asset data is changed.
 * A guided sample lives only in this overlay, never in the actual project.
 */
(()=>{
'use strict';
const style=document.createElement('style');
style.id='frx-style';
style.textContent=`
#frx-open{background:#132c36;color:#8ce7ed;border:1px solid #367c89;border-radius:5px;padding:7px 12px;font:600 11px system-ui;cursor:pointer;margin-left:6px;min-height:33px}
#frx-open:hover,#frx-open:focus-visible{background:#194453;outline:2px solid #77e0ec;outline-offset:2px}
#frx-root{position:fixed;inset:0;z-index:1800;background:rgba(3,7,13,.78);backdrop-filter:blur(8px);display:none;font:13px/1.5 system-ui,-apple-system,'Segoe UI',sans-serif;color:#dce6f0}
#frx-root.frx-visible{display:flex;justify-content:center;align-items:center;padding:18px}
#frx-root *{box-sizing:border-box}
#frx-app{width:min(1440px,100%);height:min(920px,95vh);display:flex;flex-direction:column;overflow:hidden;background:#0b1320;border:1px solid #30445b;border-radius:13px;box-shadow:0 25px 100px rgba(0,0,0,.65)}
#frx-app button,#frx-app input,#frx-app select{font:inherit}
#frx-app button{cursor:pointer}
#frx-app button:focus-visible,#frx-app input:focus-visible,#frx-app select:focus-visible{outline:2px solid #62d4ee;outline-offset:2px}
.frx-bar{display:flex;gap:14px;align-items:center;padding:15px 20px;border-bottom:1px solid #203146;flex-shrink:0}
.frx-logo{width:34px;height:34px;border-radius:8px;background:#163c52;color:#69dcfa;display:grid;place-items:center;font-size:18px}
.frx-topline{display:flex;justify-content:space-between;gap:8px;align-items:center}
.frx-eyebrow{font-size:10px;font-weight:700;letter-spacing:1.6px;color:#60cce2;text-transform:uppercase}
.frx-title{font-size:19px;line-height:1.25;font-weight:750;color:#f4f8ff}
.frx-sub{font-size:11px;color:#8599ad}
.frx-bar .frx-spacer{flex:1}
.frx-pill{border-radius:50px;padding:5px 10px;background:#132536;border:1px solid #27445c;color:#99c7d7;font-size:11px;white-space:nowrap}
.frx-btn{border:1px solid #36536a;border-radius:7px;background:#14283b;color:#d6e8f5;padding:8px 11px;min-height:35px}
.frx-btn:hover{background:#1c3d55}
.frx-primary{background:#144960;border-color:#24849a;color:#c9faff}
.frx-alert{padding:9px 18px;color:#c5d1df;background:#132539;border-bottom:1px solid #203d52;font-size:11px;display:flex;gap:8px;align-items:center;flex-shrink:0}
.frx-alert strong{color:#8ce6f7}
.frx-toolbar{padding:10px 17px;display:flex;flex-wrap:wrap;gap:10px;align-items:center;border-bottom:1px solid #233147;background:#0c1727;flex-shrink:0}
.frx-mode{display:flex;gap:3px;background:#07101b;border-radius:8px;padding:3px;border:1px solid #20344a}
.frx-mode button{background:transparent;border:0;color:#8c9fb3;border-radius:6px;padding:7px 11px;font-size:12px}
.frx-mode button[aria-pressed=true]{background:#1b4057;color:#c1f4ff}
.frx-search{flex:1;min-width:140px;max-width:380px;border:1px solid #31475d;background:#091320;color:#d9e5f2;border-radius:6px;padding:8px 11px}
.frx-filter{border:1px solid #31475d;background:#091320;color:#d9e5f2;border-radius:6px;padding:8px;max-width:170px}
.frx-body{display:grid;grid-template-columns:265px minmax(0,1fr) 290px;flex:1;min-height:0;overflow:hidden}
.frx-nav{border-right:1px solid #203146;overflow:auto;background:#0e192a}
.frx-section-head{padding:17px 14px 8px;display:flex;align-items:center;justify-content:space-between;color:#91a6bc;font-size:10px;font-weight:750;letter-spacing:1.25px;text-transform:uppercase}
.frx-item{display:flex;width:calc(100% - 14px);margin:2px 7px;gap:10px;align-items:center;text-align:left;padding:10px 9px;border:1px solid transparent;border-radius:7px;background:transparent;color:#cddbed}
.frx-item:hover{background:#162b3f}
.frx-item[aria-current=true]{background:#173b52;border-color:#367d99}
.frx-glyph{display:grid;place-items:center;min-width:31px;height:31px;background:#1b3348;border-radius:7px;font-size:15px}
.frx-item-name{display:block;font-size:12px;font-weight:650;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:155px}
.frx-item-type{display:block;font-size:10px;color:#899eb0}
.frx-center{padding:18px 20px 22px;overflow:auto;background:radial-gradient(ellipse at 60% 20%,#14283d 0%,#0b1320 70%)}
.frx-centerhead{display:flex;gap:14px;align-items:flex-start;justify-content:space-between;margin-bottom:14px}
.frx-selected-name{font-size:21px;color:#f3f7ff;font-weight:750;line-height:1.2;margin-top:3px;word-break:break-word}
.frx-desc{font-size:12px;color:#9bb0c4;max-width:690px;margin-top:7px}
.frx-status{font-size:10px;color:#87d9e9;border:1px solid #337b85;background:#10303a;border-radius:50px;padding:5px 9px;white-space:nowrap}
.frx-stats{display:flex;gap:9px;flex-wrap:wrap;margin:13px 0 19px}
.frx-stat{background:#101f30;border:1px solid #233b51;border-radius:8px;padding:8px 13px;min-width:112px}
.frx-stat strong{font-size:17px;color:#eaf6ff;display:block}
.frx-stat span{font-size:10px;color:#90a9bf}
.frx-relgrid{display:grid;grid-template-columns:1fr 1fr;gap:15px}
.frx-relcol{min-width:0}
.frx-relhead{font-size:10px;color:#8faabe;letter-spacing:1.2px;text-transform:uppercase;font-weight:750;margin:0 0 8px;display:flex;gap:7px;align-items:center}
.frx-relationship{width:100%;background:#102236;border:1px solid #25415a;border-radius:8px;color:#e2eefb;display:flex;gap:10px;align-items:center;text-align:left;margin:0 0 7px;padding:10px;min-width:0}
.frx-relationship:hover{background:#16334b;border-color:#438eaa}
.frx-relationship .frx-relmain{flex:1;min-width:0}
.frx-relationship .frx-rt{font-size:12px;display:block;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.frx-relationship .frx-why{font-size:10px;display:block;color:#90b1c4;line-height:1.3;margin-top:3px}
.frx-linkglyph{font-size:15px;opacity:.85}
.frx-empty{font-size:12px;color:#839bb3;background:#101b2c;border:1px dashed #2a435b;border-radius:8px;padding:18px}
.frx-note{padding:13px 14px;background:#101d2c;border:1px solid #263c54;border-radius:8px;margin-top:20px;font-size:11px;color:#a8bed0;line-height:1.6}
.frx-note b{color:#dfeef7}
.frx-inspector{border-left:1px solid #203146;background:#0d1929;overflow:auto;padding:14px}
.frx-inspector h3{font-size:11px;color:#9fbbcd;text-transform:uppercase;letter-spacing:1px;margin:0 0 10px}
.frx-card{border:1px solid #29435a;background:#12253a;border-radius:9px;padding:12px;margin-bottom:13px}
.frx-label{display:block;color:#8ca9bb;font-size:10px;text-transform:uppercase;letter-spacing:.75px;margin:10px 0 3px}
.frx-value{font-size:12px;color:#ecf5ff;overflow-wrap:anywhere}
.frx-code{font:10px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;color:#92cde1;overflow-wrap:anywhere}
.frx-action{width:100%;text-align:center;margin:6px 0;border:1px solid #337b9d;background:#164964;color:#e0f7ff;border-radius:7px;padding:10px;min-height:39px;font-size:12px}
.frx-action:hover{background:#196680}
.frx-action:disabled{opacity:.42;cursor:not-allowed}
.frx-footer{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;border-top:1px solid #203146;padding:9px 18px;background:#0b1624;color:#92a9bd;font-size:11px;flex-shrink:0}
.frx-provenance{color:#b3ccdb}
#frx-root[hidden]{display:none}
@media(max-width:990px){.frx-body{grid-template-columns:200px minmax(0,1fr)}.frx-inspector{grid-column:1/-1;border-left:0;border-top:1px solid #203146;max-height:240px}.frx-bar{padding:12px}.frx-nav{min-height:260px}}

.frx-follow-label{display:flex;align-items:center;gap:8px;color:#d7eaf4;font-weight:650;font-size:12px;background:#14283c;border:1px solid #385b70;border-radius:7px;padding:7px 9px;cursor:pointer;white-space:normal}.frx-follow-label input{accent-color:#65d9ec;width:16px;height:16px}.frx-follow-badge{border-radius:30px;border:1px solid #335269;padding:5px 9px;background:#102333;color:#9db5c9;font-size:10px}.frx-follow-badge[data-mode=on]{background:#123d32;color:#9af2c9;border-color:#378b6d}.frx-follow-label:has(input:disabled){opacity:.5}.frx-viewer{margin:12px 0 20px;border:1px solid #31536a;border-radius:10px;background:#111f30;padding:13px}.frx-viewer-title{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;align-items:center;margin-bottom:10px}.frx-viewer-title strong{font-size:13px;color:#f0faff}.frx-viewer-title span{font-size:10px;color:#8daec3}.frx-viewer #frx-preview{background:#07111e;min-height:125px;border-radius:7px;padding:10px;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:9px}.frx-preview-canvas{border:1px solid #436075;image-rendering:pixelated;display:block}.frx-preview-message{font-size:12px;color:#aac4d6;padding:12px;text-align:center}.frx-viewer-legend{font-size:10px;color:#aec0cf;line-height:1.5}.frx-related-tools{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:12px}.frx-viewer-key{flex-basis:100%;color:#94b4c5;font-size:10px;font-weight:650}.frx-context-shortcut{background:#153d53;border:1px solid #39788c;border-radius:5px;color:#cef4ff;padding:6px 9px;font-size:10px}.frx-context-shortcut:hover{background:#1b5771}.frx-context-result{font-size:11px;color:#a4cadc;margin-top:10px;border-top:1px solid #2e485c;padding-top:8px}.frx-sectiontitle{margin:12px 0 10px;color:#dcecf7;font-size:13px;font-weight:700}.frx-sectiontitle span{margin-left:10px;color:#84a3b7;font-size:10px;font-weight:400}.frx-toolbar{gap:7px}.frx-viewer #frx-preview canvas{object-fit:contain;max-height:165px;width:auto!important;max-width:100%!important}.frx-viewer #frx-preview{min-height:170px;max-height:200px;overflow:hidden;flex-direction:column}.frx-viewer{padding:10px;margin:8px 0 12px}.frx-viewer-title{margin-bottom:6px}.frx-related-tools{margin-top:7px}.frx-center{padding-top:12px}.frx-stats{margin:9px 0 10px}.frx-viewer-legend{max-width:100%;text-align:center}
@media(max-width:640px){#frx-root.frx-visible{padding:0}#frx-app{border-radius:0;height:100dvh;max-height:none}.frx-bar{gap:8px;flex-wrap:wrap}.frx-bar .frx-spacer{display:none}.frx-pill{display:none}.frx-body{display:flex;flex-direction:column;overflow:auto}.frx-nav{border-right:0;border-bottom:1px solid #203146;flex:0 0 153px;overflow:auto}.frx-center{flex:0 0 auto;overflow:visible;padding:14px}.frx-relgrid{grid-template-columns:1fr}.frx-inspector{flex:0 0 auto;max-height:none;padding:14px}.frx-toolbar{padding:8px;gap:7px}.frx-filter{max-width:140px}.frx-footer{font-size:10px}.frx-selected-name{font-size:18px}}
`;
document.head.appendChild(style);
const outputStyle=document.createElement('style');outputStyle.textContent='.frx-viewer #frx-preview:has(#frx-native-output-result canvas){max-height:440px;overflow:auto}.frx-native-output-result{max-width:100%;text-align:center}.frx-native-output-result:empty{display:none}';document.head.append(outputStyle);
const button=document.createElement('button');button.id='frx-open';button.type='button';button.textContent='▣ Resources';button.title='Unified resource explorer, preview and verified relationships';
const target=document.querySelector('.top .project-bar')||document.querySelector('.top .scene-ctl')||document.querySelector('.top');
target.parentNode.insertBefore(button,target.nextSibling);
const root=document.createElement('div');root.id='frx-root';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','NES Forge resource relationships');root.innerHTML=`
<div id="frx-app">
 <header class="frx-bar"><span class="frx-logo">◎</span><div><div class="frx-eyebrow">NES Forge · Connected Workspace Prototype</div><div class="frx-title">Resources</div><div class="frx-sub">Explorer · Live preview · Relationships · Editor context</div></div><span class="frx-spacer"></span><span class="frx-pill" id="frx-project-name"></span><button class="frx-btn" id="frx-close" type="button">✕ Close</button></header>
 <div class="frx-alert" id="frx-notice" role="status"></div>
 <div class="frx-toolbar"><div class="frx-mode"><button id="frx-live" type="button" aria-pressed="true">Live project</button><button id="frx-demo" type="button" aria-pressed="false">Guided example</button></div><input class="frx-search" id="frx-search" placeholder="Search resources by name or ID…" aria-label="Search project resources"><select class="frx-filter" id="frx-kind" aria-label="Filter resource type"><option value="">All resources</option></select><button class="frx-btn" id="frx-refresh">↻ Refresh</button><button class="frx-btn" id="frx-active">◎ Active Scene</button><label class="frx-follow-label" for="frx-follow"><input type="checkbox" id="frx-follow"> Follow selection across editors</label><span id="frx-follow-badge" class="frx-follow-badge">Independent</span></div>
 <div class="frx-body"><aside class="frx-nav"><div class="frx-section-head">Project resources <span id="frx-count"></span></div><div id="frx-items"></div></aside><main class="frx-center"><div class="frx-centerhead"><div><div class="frx-eyebrow" id="frx-type"></div><div class="frx-selected-name" id="frx-name"></div><div class="frx-desc" id="frx-description"></div></div><span class="frx-status" id="frx-status"></span></div><div class="frx-stats" id="frx-stats"></div><section class="frx-viewer"><div class="frx-viewer-title"><strong>Resource Viewer</strong><span id="frx-viewer-caption">Preview of the selected resource</span></div><div id="frx-preview"></div><div id="frx-related-tools" class="frx-related-tools"></div><div id="frx-context-result" class="frx-context-result" role="status" aria-live="polite"></div></section><div class="frx-sectiontitle">Resource Relationships <span>declared references and source receipts</span></div><div class="frx-relgrid"><section class="frx-relcol"><div class="frx-relhead">↙ Depends on / reads from</div><div id="frx-deps"></div></section><section class="frx-relcol"><div class="frx-relhead">↗ Used by / feeds into</div><div id="frx-users"></div></section></div><div class="frx-note" id="frx-guidance"></div></main><aside class="frx-inspector"><h3>Resource inspector</h3><div class="frx-card" id="frx-details"></div><h3>Actions</h3><button class="frx-action" id="frx-open-editor" type="button">Open in editor ↗</button><div class="frx-card" id="frx-action-note"></div><h3>Connection notes</h3><div class="frx-card" id="frx-unknown"></div></aside></div>
 <footer class="frx-footer"><span id="frx-footer-left"></span><span class="frx-provenance">Read-only browsing · explicit editor / native writer actions</span></footer>
</div>`;
document.body.appendChild(root);
const $=id=>document.getElementById('frx-'+id);
let mode='live',active=null,graph=null,lastFocus=null,follow=false,contextNote='';
const icons={scene:'▦',world:'▤',chr:'▦',palette:'◉',sprite:'♟',tile:'▦',metasprite:'♙',animation:'▶',metatile:'◫',collision:'⬡',entity:'◆',actor:'♟',instance:'◇',behavior:'⛭',audio:'♫',source:'⇄',unresolved:'!',project:'▣',native:'▧'};
const key=(type,id)=>type+':'+String(id);
function makeGraph(){return {nodes:new Map(),edges:[],issues:[],add(n){if(!this.nodes.has(n.key))this.nodes.set(n.key,n);return this.nodes.get(n.key);},edge(from,to,why,confidence='explicit'){if(!this.edges.some(e=>e.from===from&&e.to===to&&e.why===why))this.edges.push({from,to,why,confidence});},link(from,to,why){if(!this.nodes.has(to)){this.add({key:to,name:to.split(':').slice(1).join(':'),type:'unresolved',identity:'Missing resource',summary:'An explicit resource reference does not resolve to an asset in this project.',scope:'Missing',open:null});this.issues.push('Unresolved reference '+to);}this.edge(from,to,why);}};}
const array=x=>Array.isArray(x)?x:[];
function addNode(g,type,id,name,summary,scope,open,details='',source='Current NES Forge project',derived=false){return g.add({key:key(type,id),type,id:String(id),name:String(name||id),summary,scope,open,details,source,derived});}
function nativeLinks(g, scene, from) {
 const services=window.Forge.services,source=services.ResourceContext.source(scene);
 if(!source)return;
 const src=addNode(g,'source',source.sha256,source.name||'Preserved source ROM',
  'Source identity and investigation; write support depends on registered encoders.',
  'Source evidence',S.investigation?.source.sha256===source.sha256?{kind:'source',sourceSha256:source.sha256}:null,
  'SHA-256 '+source.sha256,'Existing source receipt');
 g.edge(from,src.key,'source identity from native receipt','receipt');
 let origin;try{origin=services.ResourceContext.native(scene);}catch(_){return;}
 if(!origin)return;
 for(const writer of [origin.writer,origin.paletteWriter].filter(Boolean)){
  const rid=source.sha256+':'+writer.kind+':'+writer.index;
  const physical=addNode(g,'native',rid,writer.kind==='chr'?'Physical CHR bank '+writer.index:'Fight palette table '+writer.index,
   writer.kind==='chr'?'Shared physical ROM pixels. A copied pose preview is a snapshot; this writer changes exported native art.':'Native fight palette table. Some phases override table colors in game code.',
   'Physical native write owner',{kind:'native-art',nativeKind:writer.kind,index:writer.index,sourceSha256:source.sha256},
   (S.scenes.some(sc=>sc.id===writer.sceneId)?'Dedicated editor already open.':'Opening this writer explicitly adds its canonical Scene in one Undo step.')+' Known-use coverage is partial.',
   'Registered Punch-Out art codec',true);
  g.edge(physical.key,src.key,'physical span in preserved source','receipt');
  g.edge(from,physical.key,origin.role.endsWith('writer')?'edits this physical resource':'snapshot origin / separate native writer; no live pixel binding','receipt');
 }
}
function liveGraph(){
 const g=makeGraph(),scenes=array(S.scenes),worlds=array(S.worlds),poses=array(S.metasprites),animations=array(S.animations),core=S.gameplayCore||{actorDefinitions:[],actorInstances:[],behaviors:[]};
 for(const scene of scenes){
  const id=scene.id,scId=key('scene',id),local=scene===scenes[S.activeScene],nt=local?S.nt:scene.nt,oam=local?S.oam:scene.oam;
  const usedBg=new Set(array(nt)).size,usedSprites=new Set(array(oam).filter(s=>s.active!==false).map(s=>s.tile)).size,poseTiles=new Set(poses.filter(p=>p.sceneId===id).flatMap(p=>window.Forge.services.ResourceContext.footprint(p).tileIds)).size;
  addNode(g,'scene',id,scene.name,'Editable Scene. Owns layout and points to graphics, palettes, sprite placements and collision tables.','Canonical Scene',{kind:'scene',sceneId:id},`BG tile IDs used: ${usedBg}; Scene OAM tile IDs: ${usedSprites}; Metasprite tile IDs: ${poseTiles}; entities: ${array(scene.entities).length}; metatiles: ${array(scene.metatiles).length}`);
  const specs=[['chr','bg:'+id,'Background CHR','Background tile data '+(scene.chr?'stored on this Scene':'currently shared editor buffer'),'chr','BG CHR · '+usedBg+' used tile IDs'],['chr','spr:'+id,'Sprite CHR','Sprite tile data '+(scene.sprChr?'stored on this Scene':'currently shared editor buffer'),'chr','SPR CHR · '+usedSprites+' Scene OAM tile IDs · '+poseTiles+' Metasprite tile IDs'],['palette','bg:'+id,'Background palettes','NES background palette slots','scene','Four BG palettes'],['palette','spr:'+id,'Sprite palettes','NES sprite palette slots','sprites','Four sprite palettes'],['collision',id,'Tile collision','Collision properties and metatile collision metadata','collision','Scene collision table'],['sprite',id,'Sprite placements','Scene OAM sprite placements. Entries are slot/index based, not stable independent assets.','sprites',array(oam).length+' placements']];
  for(const [type,rid,name,summary,tab,details] of specs){const n=addNode(g,type,rid,scene.name+' · '+name,summary,'Derived view of Scene buffers',{kind:tab,sceneId:id},details,'Canonical Scene / active editor buffers',true);g.edge(scId,n.key,'uses '+name.toLowerCase());}
  // Track the currently selected physical tile without enumerating every tile
  // as a fictitious stable canonical asset. This is a live index-based view.
  if(local){
   const bank=S.chrBank==='spr'?'spr':'bg',tileId=Number.isInteger(S.editTile)?S.editTile:0;
   const tile=addNode(g,'tile',bank+':'+id+':'+tileId,
    scene.name+' · '+(bank==='spr'?'Sprite':'BG')+' tile $'+tileId.toString(16).toUpperCase().padStart(2,'0'),
    'Selected indexed CHR tile. Pixel edits can affect each placement that references this tile.',
    'Indexed tile view (not an independent asset)',{kind:'tile',sceneId:id,bank,tileId},'',
    'Selected CHR editor buffer',true);
   const uses=bank==='spr'?array(oam).filter(p=>p.active!==false&&p.tile===tileId).length:array(nt).filter(v=>v===tileId).length;
   const selectedPose=window.Forge163?.metasprites?.current,usage=window.Forge.services.ResourceContext.chrUsage();
   const poseUses=usage?.uses.filter(use=>use.tile===tileId).length||0;
   tile.details=uses+' direct '+(bank==='spr'?'OAM sprite':'nametable')+' placement(s) in active Scene'+(usage?' · '+poseUses+' selected pose piece use(s)':'');
   if(poseUses)g.edge(key('metasprite',selectedPose.id),tile.key,'selected pose references this tile ID'+(bank==='bg'?' in matching physical source bank (snapshot origin)':''),'explicit');
   g.edge(tile.key,key('chr',bank+':'+id),'pixel data comes from this CHR buffer');
   if(uses)g.edge(scId,tile.key,'references tile ID at '+uses+' placement(s)');
  }
  for(const meta of array(scene.metatiles)){
   const n=addNode(g,'metatile',id+'::'+meta.id,meta.name||'Metatile $'+Number(meta.id).toString(16),'16×16 tile definition in the selected Scene library.','Canonical Scene metatile',{kind:'meta',sceneId:id},'Metatile ID '+meta.id);
   g.edge(n.key,scId,'defined in this Scene');
  }
  for(const ent of array(scene.entities)){
   const n=addNode(g,'entity',id+'::'+ent.id,ent.name||ent.type||'Scene entity','Scene-bound entity. Distinct from Gameplay Core Actor Definitions.','Scene entity',{kind:'entity',sceneId:id,entityId:ent.id},'Entity ID '+ent.id);
   g.edge(n.key,scId,'placed in Scene');
   for(const state of array(ent.animationBinding?.states))if(state.animationId)g.link(n.key,key('animation',state.animationId),'plays bound Animation');
  }
  nativeLinks(g,scene,scId);
 }
 for(const world of worlds){const n=addNode(g,'world',world.id,world.name,'World map, room navigation, and declared tileset Scene.','Canonical World',{kind:'world',worldId:world.id},`${world.widthScreens||'?'}×${world.heightScreens||'?'} screens; ${array(world.rooms).length} rooms`);if(world.tilesetSceneId)g.link(n.key,key('scene',world.tilesetSceneId),'uses Scene as tileset');
  const usedIds=new Set(array(world.map).filter(id=>Number.isInteger(id)&&id>=0));for(const id of usedIds)if(world.tilesetSceneId)g.link(n.key,key('metatile',world.tilesetSceneId+'::'+id),'paints with metatile ID '+id);
 }
 for(const pose of poses){const n=addNode(g,'metasprite',pose.id,pose.name||pose.id,'Composed sprite pose built from a source Scene.','Canonical metasprite',{kind:'pose',poseId:pose.id,sceneId:pose.sceneId},'Sprite frame / pose ID '+pose.id);if(pose.sceneId){g.link(n.key,key('scene',pose.sceneId),'uses source Scene graphics');g.link(n.key,key('chr','spr:'+pose.sceneId),'piece tile IDs read these sprite pixels');g.link(n.key,key('palette','spr:'+pose.sceneId),'piece palette IDs read these sprite colors');const scene=scenes.find(sc=>sc.id===pose.sceneId);if(scene)nativeLinks(g,scene,n.key);}const usage=window.Forge.services.ResourceContext.footprint(pose);n.details+=' · '+usage.pieceCount+' pieces · '+usage.tileIds.length+' distinct tile IDs';}
 for(const a of animations){const n=addNode(g,'animation',a.id,a.name||a.id,'Timeline animation. Individual frames may use metasprites or Scene art.','Canonical Animation',{kind:'animation',animationId:a.id},array(a.frames).length+' animation frames');for(const frame of array(a.frames)){if(frame.metaspriteId)g.link(n.key,key('metasprite',frame.metaspriteId),'frame uses metasprite');else if(frame.sceneId)g.link(n.key,key('scene',frame.sceneId),'frame uses Scene art');}}
 for(const b of array(core.behaviors))addNode(g,'behavior',b.id,b.name||b.id,'Gameplay Core behavior state table.','Canonical Gameplay Behavior',{kind:'behavior',behaviorId:b.id},array(b.states).length+' states');
 for(const d of array(core.actorDefinitions)){const n=addNode(g,'actor',d.id,d.name||d.id,'Reusable Gameplay Core Actor Definition.','Canonical Gameplay Actor',{kind:'actor',actorId:d.id},array(d.components).length+' components');if(d.behaviorId)g.link(n.key,key('behavior',d.behaviorId),'executes Behavior');for(const comp of array(d.components))if(comp.type==='Render'&&comp.values?.sourceSceneId)g.link(n.key,key('scene',comp.values.sourceSceneId),'Render component reads Scene graphics');}
 for(const i of array(core.actorInstances)){const n=addNode(g,'instance',i.id,i.name||i.id,'Placed instance of a reusable Gameplay Core definition.','Canonical Gameplay Actor Instance',{kind:'instance',instanceId:i.id},'Placement '+(i.placement?.kind||'unknown'));if(i.definitionId)g.link(n.key,key('actor',i.definitionId),'instantiates Actor Definition');if(i.placement?.kind==='scene'&&i.placement.sceneId)g.link(n.key,key('scene',i.placement.sceneId),'placed in Scene');if((i.placement?.kind==='world'||i.placement?.kind==='room')&&i.placement.worldId)g.link(n.key,key('world',i.placement.worldId),'placed in World');}
 const audio=addNode(g,'audio','project','Audio library','Project-wide tracker instruments, patterns, songs and SFX. Source event bindings require separate verified evidence.','Project-wide authoring',{kind:'audio'},`${array(S.instruments).length} instruments · ${array(S.sfx).length} SFX · ${array(S.patterns).length} patterns`);
 if(S.nativeGame?.sourceSha256){const digest=S.nativeGame.sourceSha256;g.add({key:key('source',digest),id:digest,type:'source',name:'Preserved native ROM',scope:'Native source identity',summary:'Preserved ROM source; individual writeback capabilities depend on registered native encoders.',details:'SHA-256 '+digest,source:'Native resource project',open:null});}
 try{const project={scenes,worlds,metasprites:poses,animations};for(const issue of array(window.Forge?.services?.AssetRegistry?.validate(project))){g.issues.push(issue.path+': '+issue.message);}}catch(e){g.issues.push('Reference validation unavailable: '+e.message);}
 if(!S.scenes.length)g.issues.push('No scenes in project');
 return g;
}
function sampleGraph(){
 const g=makeGraph(),entries=[
 ['world','w1','Willowwood','World with two rooms','Canonical World','world','Designed in NES Forge'],
 ['scene','s1','Forest Clearing','Level scene and tile layout','Canonical Scene','scene','Designed in NES Forge'],
 ['chr','c1','Forest CHR Sheet','8×8 background tiles','Graphics resource','chr','Exported from YY-CHR'],
 ['palette','p1','Forest Palette','NES background palettes','Graphics resource','scene','Designed in NES Forge'],
 ['metatile','m1','Stone Platform','16×16 platform tiles','Metatile','meta','Designed in NES Forge'],
 ['actor','a1','Hero','Reusable playable character definition','Gameplay actor','gameplay','Designed in NES Forge'],
 ['instance','i1','Hero at Start','Placed character instance','Actor instance','gameplay','Designed in NES Forge'],
 ['behavior','b1','Player Controller','Input, jump and movement states','Gameplay behavior','gameplay','Designed in NES Forge'],
 ['animation','an1','Hero Walk','Four-frame walking animation','Animation','anim','Imported Aseprite sprite sheet'],
 ['metasprite','ms1','Hero Walk Pose','Composition using character tiles','Metasprite','metasprites','Imported Aseprite sprite sheet'],
 ['chr','c2','Hero Sprite CHR','Character sprite graphics','Graphics resource','chr','Imported Aseprite PNG'],
 ['palette','p2','Hero Palette','NES sprite colors','Graphics resource','sprites','Designed in NES Forge'],
 ['audio','au1','Jump SFX','Triangle/noise tracker effect','Audio asset','audio','Imported FamiStudio text']];
 for(const [type,id,name,summary,scope,tab,source] of entries)addNode(g,type,id,name,summary,scope,{kind:tab},'Demonstration-only resource; no underlying ROM or project file is modified.',source);
 for(const [a,b,why] of [['w1','s1','contains Scene'],['s1','c1','reads background CHR'],['s1','p1','uses background palette'],['s1','m1','uses platform metatile'],['a1','b1','executes state behavior'],['a1','an1','uses Animation'],['an1','ms1','frames use metasprite'],['ms1','c2','draws from Sprite CHR'],['ms1','p2','uses sprite palette'],['i1','a1','instantiates Actor Definition'],['i1','s1','placed in Scene']]){const left=entries.find(e=>e[1]===a),right=entries.find(e=>e[1]===b);g.edge(key(left[0],a),key(right[0],b),why,'demo');}
 g.issues.push('Example only: audio trigger → Hero Jump is intentionally NOT linked; it requires a verified binding.');
 return g;
}
const nodeByKey=id=>graph.nodes.get(id);
const elt=(tag,cls,content)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(content!==undefined)e.textContent=content;return e;};
function choose(id){if(!nodeByKey(id))return;active=id;if(follow&&mode==='live')syncContext(nodeByKey(active));render();}
// Follow is deliberately opt-in and scoped to RESOURCE SELECTION EVENTS only.
// It never subscribes to editor tab switches and never rewrites project resources.
function targetContext(n){
 if(!n?.open)return null;
 if(n.open.sceneId)return {sceneId:n.open.sceneId,worldId:null};
 if(n.open.worldId){const w=S.worlds?.find(w=>w.id===n.open.worldId);return w?{sceneId:w.tilesetSceneId||null,worldId:w.id}:null;}
 if(n.open.poseId){const pose=S.metasprites?.find(p=>p.id===n.open.poseId);return pose?.sceneId?{sceneId:pose.sceneId,worldId:null}:null;}
 if(n.open.animationId){const anim=S.animations?.find(a=>a.id===n.open.animationId);const refs=[...new Set((anim?.frames||[]).map(f=>f.sceneId||S.metasprites?.find(m=>m.id===f.metaspriteId)?.sceneId).filter(Boolean))];return refs.length===1?{sceneId:refs[0],worldId:null}:null;}
 return null;
}
function syncContext(n){
 const context=targetContext(n);if(!context){contextNote='No unique Scene/World binding for this resource; existing editor selections remain unchanged.';return false;}
 try{
  const service=window.Forge?.services?.SceneContext;
  if(context.worldId){if(!service?.selectWorld)throw Error('World context service unavailable');service.selectWorld(context.worldId);}
  else if(context.sceneId){if(!service?.selectScene)throw Error('Scene context service unavailable');service.selectScene(context.sceneId);}
  if(n.open?.kind==='chr'||n.open?.kind==='tile'){const bank=n.open.bank||(n.id.startsWith('spr:')?'spr':n.id.startsWith('bg:')?'bg':null);if(bank&&S.chrBank!==bank){S.chrBank=bank;rebuildAllUI();}}
  const sourceId=context.sceneId||S.scenes?.[S.activeScene]?.id;
  const frames=(S.metasprites||[]).filter(frame=>frame.sceneId===sourceId);
  const composer=window.Forge163?.metasprites;
  let frameNote='';
  if(n.open?.poseId&&frames.some(frame=>frame.id===n.open.poseId)){
   composer?.select?.(n.open.poseId);frameNote=' · selected exact metasprite pose';
  }else if(frames.length===1&&composer?.current?.sceneId!==sourceId){
   composer?.select?.(frames[0].id);frameNote=' · selected sole matching metasprite pose';
  }else if(!frames.length){frameNote=' · no matching metasprite; previous frame remains independent';}
  else if(composer?.current?.sceneId!==sourceId){frameNote=' · '+frames.length+' matching poses; choose one in Metasprites';}
  window.NFContext04?.refresh?.();
  contextNote='Linked: '+(S.scenes?.[S.activeScene]?.name||'Scene')+(context.worldId?' / '+(S.worlds?.find(w=>w.id===context.worldId)?.name||'World'):'')+' · Scene, CHR and Collision now share the selected resource context'+frameNote+'.';
  return true;
 }catch(e){contextNote='Context unchanged: '+e.message;return false;}
}
function setFollow(value){follow=!!value;$('follow').checked=follow;contextNote=follow?'Follow enabled. Select a live resource to update its uniquely declared Scene/World context.':'Independent browsing: selections in Resources will not change your editors.';render();}

function setMode(next){mode=next;contextNote='';graph=mode==='demo'?sampleGraph():liveGraph();active=mode==='demo'?key('actor','a1'):key('scene',S.scenes[S.activeScene]?.id||'');if(!graph.nodes.has(active))active=graph.nodes.keys().next().value||null;render();}
function kindLabel(type){return {chr:'CHR',metasprite:'Metasprite',actor:'Actor Definition',instance:'Actor Instance',sprite:'Sprite placements',entity:'Scene Entity'}[type]||type[0].toUpperCase()+type.slice(1);}
function render(){
 if(!graph)return;const sel=nodeByKey(active);$('project-name').textContent=mode==='demo'?'Guided example':(S.projectName||'Untitled');$('notice').innerHTML=mode==='demo'?'<strong>EXAMPLE DATA</strong> · Try clicking linked resources. This is a demonstration graph, not assets from the loaded project.':'<strong>LIVE PROJECT</strong> · Connections derive from actual resource IDs and declared references. Browsing is read-only. Explicit native-writer actions use the existing Undo transaction.';
 for(const [next,button] of [['live',$('live')],['demo',$('demo')]])button.setAttribute('aria-pressed',String(mode===next));
 $('active').disabled=mode==='demo';$('open-editor').disabled=mode==='demo'||!sel?.open;$('follow').checked=follow;$('follow').disabled=mode==='demo';$('follow-badge').textContent=mode==='demo'?'Example only':follow?'Following':'Independent';$('follow-badge').dataset.mode=mode==='demo'?'demo':follow?'on':'off';
 const types=[...new Set([...graph.nodes.values()].map(n=>n.type))].sort();const old=$('kind').value;$('kind').replaceChildren();const all=elt('option',null,'All resources');all.value='';$('kind').appendChild(all);for(const type of types){const opt=elt('option',null,kindLabel(type));opt.value=type;$('kind').appendChild(opt);}$('kind').value=types.includes(old)?old:'';
 const q=$('search').value.trim().toLowerCase(),type=$('kind').value;const list=[...graph.nodes.values()].filter(n=>(!type||n.type===type)&&(!q||(n.name+' '+n.id+' '+n.scope+' '+n.type).toLowerCase().includes(q))).sort((a,b)=>a.type.localeCompare(b.type)||a.name.localeCompare(b.name));
 $('count').textContent=list.length+'/'+graph.nodes.size;$('items').replaceChildren();for(const n of list){const b=elt('button','frx-item');b.type='button';b.setAttribute('aria-current',String(n.key===active));b.title=n.name+' · '+n.id;const glyph=elt('span','frx-glyph',icons[n.type]||'◆'),txt=elt('span');txt.style.minWidth='0';txt.append(elt('span','frx-item-name',n.name),elt('span','frx-item-type',kindLabel(n.type)));b.append(glyph,txt);b.onclick=()=>choose(n.key);$('items').appendChild(b);}if(!list.length)$('items').append(elt('div','frx-empty','No matching resources.'));
 if(!sel){$('name').textContent='No selection';return;}
 $('type').textContent=kindLabel(sel.type);$('name').textContent=sel.name;$('description').textContent=sel.summary;$('status').textContent=sel.type==='native'?'Physical source owner':sel.derived?'Derived buffer view':sel.scope;
 const deps=graph.edges.filter(e=>e.from===active),users=graph.edges.filter(e=>e.to===active);
 $('stats').replaceChildren();for(const [v,label] of [[deps.length,'Dependencies'],[users.length,'Used by'],[graph.issues.length,'Diagnostic notes']]){const box=elt('div','frx-stat');box.append(elt('strong',null,String(v)),elt('span',null,label));$('stats').appendChild(box);}
 function relations(id,edges,direction){const host=$(id);host.replaceChildren();if(!edges.length){host.append(elt('div','frx-empty',direction==='deps'?'No explicit dependencies recorded for this resource.':'No declared consumers found. This does not prove the resource is unused.'));return;}for(const e of edges){const related=nodeByKey(direction==='deps'?e.to:e.from);if(!related)continue;const b=elt('button','frx-relationship');b.type='button';const glyph=elt('span','frx-glyph',icons[related.type]||'◆'),middle=elt('span','frx-relmain');middle.append(elt('span','frx-rt',related.name),elt('span','frx-why',e.why+(e.confidence==='demo'?' · example':e.confidence==='receipt'?' · source receipt':'')));b.append(glyph,middle,elt('span','frx-linkglyph','›'));b.onclick=()=>choose(related.key);host.appendChild(b);}}
 relations('deps',deps,'deps');relations('users',users,'users');
 renderViewer(sel);$('guidance').innerHTML='<b>Reading this view:</b> “Depends on” shows explicit inputs and ownership dependencies. “Used by” shows resources that reference this one. Derived CHR/palette/sprite panels are not separately stored canonical assets. Build eligibility is not inferred from these links.';
 $('details').replaceChildren();for(const [label,value,code] of [['Resource key',sel.key,true],['Ownership / scope',sel.scope],['Provenance',sel.source],['Additional context',sel.details||'No additional metadata'],['Connection evidence',mode==='demo'?'Illustrative only':'Declared IDs and source-owner receipts; native consumer observations have partial coverage']]){$('details').append(elt('span','frx-label',label),elt('div',code?'frx-code':'frx-value',value));}
 $('open-editor').textContent=mode==='demo'?'Example view — no editor action':sel.open?'Open in '+({scene:'Scene',tile:'CHR Sheet',chr:'CHR Sheet',sprites:'Sprites',meta:'Metatiles',collision:'Collision',animation:'Animation',pose:'Metasprites',world:'World',entity:'Entity Studio',actor:'Gameplay Core',instance:'Gameplay Core',behavior:'Behavior editor',audio:'Audio','native-art':'native artwork',source:'source investigation'}[sel.open.kind]||'editor')+' ↗':'Read-only evidence · no editor';
 $('action-note').textContent=mode==='demo'?'Switch to Live project to navigate real resources.':sel.open?.kind==='native-art'?'This explicit action opens the registered native writer. If absent, its dedicated Scene is added in one Undo step; snapshots are preserved.':sel.derived?'This resource has a Scene owner. Open in editor selects that Scene explicitly; Follow only applies to resource selections inside this workspace.':sel.type==='source'?'Source investigation requires matching ROM identity; this panel does not treat recognition as a verified native encoder.':sel.open?.kind==='native-art'?'This explicit action opens the registered native writer. If absent, its dedicated Scene is added in one Undo step; snapshots are preserved.':'Navigation uses existing NES Forge editor services and selection APIs.';
 $('unknown').textContent=mode==='demo'?'The example audio has no claimed runtime jump binding. Such links must be recovered or authored explicitly.':sel.type==='audio'?'Audio data is project-wide; no Scene-to-sound gameplay trigger is assumed.':sel.type==='source'?'A native ROM source receipt does not imply a full native graphics, behavior, or audio encoder.':'Declared references and native source receipts are distinguished. Known native consumers cover bounded observations; other runtime uses remain unknown.';
 $('footer-left').textContent=`${graph.nodes.size} resources · ${graph.edges.length} relationships · ${graph.issues.length} diagnostic notes`;
}
// Previews read canonical project buffers only. No canvas is written back to a Scene.
function previewScene(n){const ctx=targetContext(n),id=ctx?.sceneId,idx=S.scenes.findIndex(sc=>sc.id===id);return idx<0?null:{scene:S.scenes[idx],live:idx===S.activeScene};}
function newCanvas(width,height,displayWidth){const c=elt('canvas','frx-preview-canvas');c.width=width;c.height=height;c.style.width=displayWidth||'100%';c.style.maxWidth='100%';c.style.height='auto';c.style.imageRendering='pixelated';c.setAttribute('role','img');return c;}
function poseCanvas(frame,source){const composer=window.Forge163.metasprites,bounds=composer.bounds(frame),c=newCanvas(256,160,'256px'),g=c.getContext('2d'),scale=Math.min(2,248/Math.max(1,bounds.w),152/Math.max(1,bounds.h));
 g.fillStyle='#172231';g.fillRect(0,0,c.width,c.height);composer.draw(g,frame,4+(frame.originX-bounds.x)*scale,4+(frame.originY-bounds.y)*scale,scale,source?{source}:{});return c;}
function renderViewer(n){
 const host=$('preview'),tools=$('related-tools');host.replaceChildren();tools.replaceChildren();if(!n)return;
 const ctx=targetContext(n),res=n.type==='world'?null:previewScene(n),caption=$('viewer-caption');caption.textContent=mode==='demo'?'Example assets are not in the project.':res?'Reading '+res.scene.name+' from '+(res.live?'live editor buffers':'stored Scene buffers')+'.':'No unique image or scene binding established.';
 if(mode==='demo'){host.append(elt('div','frx-preview-message','Guided example · select Live project to inspect real tile, palette and layout data.'));$('context-result').textContent='No editor synchronization in the demonstration graph.';return;}
 if(res){
  const preview=window.Forge.services.ResourcePreview,scene=preview.scene(res.scene.id),bank=(n.type==='chr'||n.type==='tile'||n.type==='palette')&&n.id.startsWith('spr:')?'spr':'bg';
  if(n.type==='metasprite'){
   const frame=S.metasprites.find(p=>p.id===n.open.poseId);
   if(frame?.pieces.length){const c=poseCanvas(frame);
    c.setAttribute('aria-label','Selected pose with its canonical sprite palettes, flips and piece order');host.append(c);
    const marker=scene.captureMeta?.punchOutPose||scene.captureMeta?.punchOutIncrementalPose;
    if(marker){caption.textContent='Canonical pose with its source-art snapshot. Physical native edits are separate.';
     const output=elt('button','frx-context-shortcut','Preview current native output');output.type='button';output.id='frx-native-output';
     const result=elt('div','frx-native-output-result');result.id='frx-native-output-result';result.setAttribute('role','status');
     output.onclick=()=>{result.replaceChildren();try{const value=preview.nativePose(frame.id),canvas=poseCanvas(value.frame,value.scene);
       canvas.setAttribute('aria-label','Current compiled native pose with encoded physical CHR and fight palette');
       result.append(canvas,elt('div','frx-viewer-legend','Current compiled output · physical bank '+value.bank+' · SHA-256 '+value.outputSha256+'. '+value.scope+' Source snapshot unchanged.'));
      }catch(error){result.append(elt('div','frx-preview-message','Current output unavailable: '+error.message));
       const health=elt('button','frx-context-shortcut','Check build in Project Health');health.type='button';health.onclick=()=>{close();window.Forge.services.ConnectedWorkspacePreview.open('health');};result.append(health);}};
     host.append(output,result);
    }
   }else host.append(elt('div','frx-preview-message','Empty pose.'));
  }else if(['chr','tile','palette'].includes(n.type)){
   const view=preview.chr(scene.id,bank),count=(bank==='spr'?scene.sprChr:scene.chr)?.length||256;
   const selected=n.type==='tile'?Number(n.open.tileId):view.active?S.editTile:0,page=Math.floor((Number.isInteger(selected)?selected:0)/256);
   const c=newCanvas(256,256,'min(256px, 100%)'),g=c.getContext('2d');g.fillStyle='#000e1c';g.fillRect(0,0,256,256);
   for(let j=0;j<256;j++){const i=page*256+j;if(i<count&&(!view.active||!window.forgeCHR.usageOnly||!view.pose||view.pose.tileIds.includes(i)))view.draw(g,i,(j%16)*16,(j>>4)*16,2);}
   if(n.type==='tile'){const slot=selected%256;g.strokeStyle='#5ad4ff';g.lineWidth=2;g.strokeRect((slot%16)*16+1,(slot>>4)*16+1,14,14);}
   caption.textContent+=' '+(view.active?'Current CHR color mode: '+view.mode+'.':'Scene colors (auto), independent of the displayed CHR bank.')+' Atlas page '+(page+1)+'. Transparent sprite index 0 is checkerboard; sheet pixels are unflipped.';
   c.setAttribute('aria-label',(bank==='spr'?'Sprite':'Background')+' CHR bank preview from '+scene.name);host.appendChild(c);
  }else if(n.type==='scene'||n.type==='collision'||n.type==='metatile'||n.type==='sprite'||n.type==='entity'){
   const c=newCanvas(256,240,'min(400px, 100%)'),g=c.getContext('2d');
   const image=g.createImageData(256,240);image.data.set(window.forgeCapture.scenePixels(scene,true).rgba);g.putImageData(image,0,0);
   if(n.type==='collision'){const raster=scene.raster?window.forgeCapture.rasterMap(scene.raster):null;
    for(let y=0;y<240;y++)for(let x=0;x<256;x++){const sample=window.forgeCapture.sampledBackground(scene,x,y,raster);if(scene.tileProps?.[sample.ti]){g.fillStyle='rgba(255,107,112,.38)';g.fillRect(x,y,1,1);}}}
   caption.textContent+=' Scene composite: BG and active OAM, palette states, flips, priority and scanline limits. Editor guides and entity boxes are omitted.';
   c.setAttribute('aria-label',scene.name+' layout'+(n.type==='collision'?' with collision hint overlay':''));host.appendChild(c);
  }
  if(!host.childNodes.length)host.append(elt('div','frx-preview-message','Canonical resource metadata available; no image renderer for this type.'));
  const title=elt('div','frx-viewer-legend',(n.type==='collision'?'Red overlay: declared tile properties · ':'')+'Preview is read-only; original Scene/CHR/Collision editors remain authoritative.');host.appendChild(title);
 }else if(n.type==='world'){
  const w=S.worlds?.find(w=>w.id===n.open?.worldId);if(w){const dims=[Number(w.widthScreens)||1,Number(w.heightScreens)||1],c=newCanvas(256,128,'min(400px, 100%)'),g=c.getContext('2d'),cells=Array.isArray(w.map)?w.map:[];g.fillStyle='#101b2d';g.fillRect(0,0,256,128);const columns=Math.max(1,Math.ceil(Math.sqrt(cells.length*2)));const rows=Math.max(1,Math.ceil(cells.length/columns));for(let i=0;i<cells.length;i++){const v=Number(cells[i])||0;g.fillStyle=`hsl(${(v*47)%360} 35% ${v?33:16}%)`;g.fillRect((i%columns)*256/columns,Math.floor(i/columns)*128/rows,Math.ceil(256/columns),Math.ceil(128/rows));}host.append(c,elt('div','frx-viewer-legend','Overview of declared map values; not a reconstructed native overworld render.'));}
 }else if(n.type==='audio'){host.append(elt('div','frx-preview-message',`${S.instruments?.length||0} tracker instruments · ${S.patterns?.length||0} patterns · ${S.sfx?.length||0} SFX. Audio is project-wide; no scene event binding assumed.`));}
 else host.append(elt('div','frx-preview-message','No verified visual preview for this resource. Its provenance and declared relationships are shown below.'));
 if(ctx?.sceneId){
  const sc=S.scenes.find(sc=>sc.id===ctx.sceneId);tools.append(elt('span','frx-viewer-key','Related editors · '+(sc?.name||'unknown')));
  for(const [label,kind,bank] of [['Scene','scene'],['BG CHR','chr','bg'],['Sprite CHR','chr','spr'],['Collision','collision'],['Sprites','sprites'],['Metatiles','meta']]){
   const b=elt('button','frx-context-shortcut',label);b.type='button';b.title='Open '+label+' in the existing editor with this Scene selected';b.onclick=()=>openContextEditor(ctx.sceneId,kind,bank);tools.appendChild(b);
  }
  const frame=n.open?.poseId&&S.metasprites.find(p=>p.id===n.open.poseId);
  let origin;try{origin=window.Forge.services.ResourceContext.native(sc);}catch(_){}
  if(frame){const b=elt('button','frx-context-shortcut','Used pose tiles');b.type='button';b.onclick=()=>{window.Forge163.metasprites.select(frame.id);openContextEditor(frame.sceneId,'chr','spr');window.forgeCHR.usageOnly=true;const tiles=window.Forge.services.ResourceContext.footprint(frame).tileIds;if(tiles.length&&!tiles.includes(S.editTile))S.editTile=S.selTile=tiles[0];window.render();};tools.appendChild(b);}
  for(const writer of [origin?.writer,origin?.paletteWriter].filter(Boolean)){const b=elt('button','frx-context-shortcut',writer.kind==='chr'?'Edit native CHR bank '+writer.index:'Edit native fight palette');b.type='button';b.onclick=()=>{try{window.Forge.services.PunchOutArtUI.open(writer.kind,writer.index);close();}catch(error){contextNote=error.message;render();}};tools.appendChild(b);}
  const relatedWorlds=S.worlds?.filter(w=>w.id===ctx.worldId||w.tilesetSceneId===ctx.sceneId)||[];for(const w of relatedWorlds.slice(0,6)){const b=elt('button','frx-context-shortcut','World: '+w.name);b.type='button';b.onclick=()=>openContextWorld(w.id);tools.appendChild(b);}
 }else{tools.append(elt('div','frx-preview-message','No unique Scene binding: editor context will not be changed automatically.'));}
 $('context-result').textContent=contextNote||(follow?'Follow on · choose a related asset to synchronize linked Scene/CHR/Collision.':'Independent browsing · selecting a resource does not modify editor selection.');
}
function openContextEditor(sceneId,kind,bank){try{const service=window.Forge?.services?.SceneContext;if(!service?.selectScene)throw Error('SceneContext unavailable');service.selectScene(sceneId);if(kind==='chr'&&bank){S.chrBank=bank;rebuildAllUI();}switchTab(kind);close();}catch(e){contextNote='Editor navigation refused: '+e.message;render();}}
function openContextWorld(worldId){const w=S.worlds.find(x=>x.id===worldId);if(!w)return;try{const native=S.nativeGame?.resources?.find(r=>r.worldId===worldId&&r.mapId);if(native&&window.Forge?.services?.NativeWorldUI?.choose)window.Forge.services.NativeWorldUI.choose(native.mapId);else{window.Forge.services.SceneContext.selectWorld(worldId);switchTab('world');}close();}catch(e){contextNote='World navigation refused: '+e.message;render();}}
async function navigate(){if(mode!=='live')return;const n=nodeByKey(active);if(!n?.open)return;try{const action=n.open,services=window.Forge?.services||{};if(action.sceneId){const idx=S.scenes.findIndex(s=>s.id===action.sceneId);if(idx<0)throw Error('Scene is no longer available.');if(services.SceneContext?.selectScene)services.SceneContext.selectScene(action.sceneId);else switchScene(idx);}
 switch(action.kind){case 'source':if(S.investigation?.source.sha256!==action.sourceSha256)throw Error('Source changed. Reopen Resources.');await services.InvestigationUI.open('code');break;case 'native-art':if(S.nativeGame?.sourceSha256!==action.sourceSha256)throw Error('Source changed. Reopen Resources.');services.PunchOutArtUI.open(action.nativeKind,action.index);break;case 'scene':switchTab('scene');break;case 'tile':if(Number.isInteger(action.tileId)){S.editTile=action.tileId;S.selTile=action.tileId;}
 case 'chr':switchTab('chr');if((action.bank==='spr'||n.id.startsWith('spr:'))&&S.chrBank!=='spr'){S.chrBank='spr';rebuildAllUI();}else if((action.bank==='bg'||n.id.startsWith('bg:'))&&S.chrBank==='spr'){S.chrBank='bg';rebuildAllUI();}break;case 'sprites':switchTab('sprites');break;case 'collision':switchTab('collision');break;case 'meta':switchTab('meta');break;case 'world':{const i=S.worlds.findIndex(w=>w.id===action.worldId);if(i<0)throw Error('World no longer exists.');const native=S.nativeGame?.resources?.find(r=>r.worldId===action.worldId&&r.mapId);if(native&&services.NativeWorldUI?.choose){services.NativeWorldUI.choose(native.mapId);break;}services.SceneContext?.selectWorld?.(action.worldId);Forge161.worlds.select(i);switchTab('world');break;}
 case 'pose':{const pose=action.poseId;if(!S.metasprites.some(p=>p.id===pose))throw Error('Metasprite no longer exists.');window.Forge163?.metasprites?.select?.(pose);switchTab('metasprites');break;}case 'animation':{const i=S.animations.findIndex(a=>a.id===action.animationId);if(i<0)throw Error('Animation no longer exists.');S._selAnim=i;S._animFrame=0;switchTab('anim');window.anim_updateSidebar?.();break;}case 'entity':{switchTab('scene');services.SceneContext?.openAsset?.('actors');window.Forge164?.studio?.open?.(action.sceneId,action.entityId);break;}case 'actor':case 'instance':case 'behavior':{switchTab('scene');const panel=document.getElementById('gcPanel190');if(panel)panel.open=true;if(action.kind==='actor')services.GameplayUI.state.selectedDefinition=action.actorId;else if(action.kind==='instance')services.GameplayUI.state.selectedInstance=action.instanceId;else if(action.kind==='behavior')services.GameplayUI.state.selectedBehavior=action.behaviorId;services.GameplayUI?.refresh?.(true);break;}case 'audio':switchTab('audio');break;default:throw Error('No registered editor for this resource.');}
 close();}catch(e){$('action-note').textContent='Could not navigate: '+e.message;}}
function close(){root.classList.remove('frx-visible');document.body.style.overflow='';lastFocus?.focus?.();}
function open(){const selected=window.Forge.services.ResourceContext.selection().key;lastFocus=document.activeElement;root.classList.add('frx-visible');document.body.style.overflow='hidden';setMode('live');if(graph.nodes.has(selected))choose(selected);if(graph.nodes.size<9)setMode('demo');$('close').focus();}
button.addEventListener('click',open);$('close').onclick=close;$('follow').onchange=()=>setFollow($('follow').checked);$('live').onclick=()=>setMode('live');$('demo').onclick=()=>setMode('demo');$('refresh').onclick=()=>{if(mode==='live')setMode('live');else setMode('demo');};$('active').onclick=()=>{if(mode!=='live')setMode('live');active=key('scene',S.scenes[S.activeScene]?.id);render();};$('open-editor').onclick=navigate;$('search').oninput=render;$('kind').onchange=render;
root.addEventListener('mousedown',e=>{if(e.target===root)close();});root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}else if(e.key==='Tab'){const focusable=[...root.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled])')].filter(n=>n.offsetParent!==null);if(focusable.length){const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}e.stopPropagation();});
// Legacy document keyboard handling uses capture listeners. Keep Escape a real
// close control even when another app editor has installed global key handlers.
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&root.classList.contains('frx-visible')){event.preventDefault();event.stopImmediatePropagation();close();}},true);
// Expose inspection only for synthetic browser smoke tests; never a mutation API.
window.Forge.services.ResourceRelationshipPreview=Object.freeze({open,openAt:(resourceKey)=>{open();setMode('live');if(graph.nodes.has(resourceKey))choose(resourceKey);},close,refresh:()=>{graph=mode==='live'?liveGraph():sampleGraph();render();},summary:()=>({mode,follow,nodes:graph?.nodes.size||0,edges:graph?.edges.length||0,issues:graph?.issues.length||0,selected:active,contextNote}),liveGraph});
})();

