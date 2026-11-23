/* Unified Resource Explorer: canonical working assets and retained ROM catalogs.
 * Browsing is read-only. Explicit source-copy actions use ProjectStore.
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
.frx-relationship:disabled{opacity:.45;cursor:not-allowed;border-style:dashed;background:transparent}.frx-unavailable{font-size:10px;color:#ffb35a;font-style:italic}
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
const outputStyle=document.createElement('style');outputStyle.textContent='.frx-viewer #frx-preview.frx-lib{max-height:60vh;overflow:auto;justify-content:flex-start;align-items:stretch}.frx-viewer #frx-preview.frx-lib>*{flex-shrink:0}.frx-viewer #frx-preview:has(#frx-native-output-result canvas){max-height:440px;overflow:auto}.frx-native-output-result{max-width:100%;text-align:center}.frx-native-output-result:empty{display:none}';document.head.append(outputStyle);
const button=document.createElement('button');button.id='frx-open';button.type='button';button.textContent='▣ Resources';button.title='Unified resource explorer, preview and verified relationships';
const target=document.querySelector('.top .project-bar')||document.querySelector('.top .scene-ctl')||document.querySelector('.top');
target.parentNode.insertBefore(button,target.nextSibling);
const root=document.createElement('div');root.id='frx-root';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','NES Forge resource relationships');root.innerHTML=`
<div id="frx-app">
 <header class="frx-bar"><span class="frx-logo">◎</span><div><div class="frx-eyebrow">NES Forge · Connected Workspace Prototype</div><div class="frx-title">Resources</div><div class="frx-sub">Explorer · Live preview · Relationships · Editor context</div></div><span class="frx-spacer"></span><span class="frx-pill" id="frx-project-name"></span><button class="frx-btn" id="frx-close" type="button">✕ Close</button></header>
 <div class="frx-alert" id="frx-notice" role="status"></div>
 <div class="frx-toolbar"><div class="frx-mode"><button id="frx-live" type="button" aria-pressed="true">Live project</button><button id="frx-demo" type="button" aria-pressed="false">Guided example</button><button id="frx-lib" type="button" aria-pressed="false" title="Every resource registered from extraction packs, identified or not">Library</button></div><input class="frx-search" id="frx-search" placeholder="Search resources by name or ID…" aria-label="Search project resources"><select class="frx-filter" id="frx-scope" aria-label="Filter resource availability"><option value="">All resources</option><option value="source">ROM library</option><option value="working">Editable working copies</option></select><select class="frx-filter" id="frx-kind" aria-label="Filter resource type"><option value="">All types</option></select><select class="frx-filter" id="frx-stage" aria-label="Stage" hidden title="Resources placed in this stage come first; the rest follow"><option value="">All stages</option></select><button class="frx-btn" id="frx-refresh">↻ Refresh</button><button class="frx-btn" id="frx-active">◎ Active Scene</button><label class="frx-follow-label" for="frx-follow"><input type="checkbox" id="frx-follow"> Follow selection across editors</label><span id="frx-follow-badge" class="frx-follow-badge">Independent</span></div>
 <div id="frx-library-summary" class="frx-alert" role="status"></div>
 <div class="frx-body"><aside class="frx-nav"><div class="frx-section-head">Project resources <span id="frx-count"></span></div><div id="frx-items"></div></aside><main class="frx-center"><div class="frx-centerhead"><div><div class="frx-eyebrow" id="frx-type"></div><div class="frx-selected-name" id="frx-name"></div><div class="frx-desc" id="frx-description"></div></div><span class="frx-status" id="frx-status"></span></div><div class="frx-stats" id="frx-stats"></div><section class="frx-viewer"><div class="frx-viewer-title"><strong>Resource Viewer</strong><span id="frx-viewer-caption">Preview of the selected resource</span></div><div id="frx-preview"></div><div id="frx-related-tools" class="frx-related-tools"></div><div id="frx-context-result" class="frx-context-result" role="status" aria-live="polite"></div></section><div class="frx-sectiontitle">Resource Relationships <span>declared references and source receipts</span></div><div class="frx-relgrid"><section class="frx-relcol"><div class="frx-relhead">↙ Depends on / reads from</div><div id="frx-deps"></div></section><section class="frx-relcol"><div class="frx-relhead">↗ Used by / feeds into</div><div id="frx-users"></div></section></div><div class="frx-note" id="frx-guidance"></div></main><aside class="frx-inspector"><h3>Resource inspector</h3><div class="frx-card" id="frx-details"></div><h3>Actions</h3><button class="frx-action" id="frx-open-editor" type="button">Open in editor ↗</button><div class="frx-card" id="frx-action-note"></div><h3>Connection notes</h3><div class="frx-card" id="frx-unknown"></div></aside></div>
 <footer class="frx-footer"><span id="frx-footer-left"></span><span class="frx-provenance">Read-only browsing · explicit editor / native writer actions</span></footer>
</div>`;
document.body.appendChild(root);
const $=id=>document.getElementById('frx-'+id);
let mode='live',active=null,graph=null,lastFocus=null,follow=false,contextNote='';
const sourceViews=new Map();
const icons={library:'◈',scene:'▦',world:'▤',chr:'▦',palette:'◉',sprite:'♟',tile:'▦',metasprite:'♙',animation:'▶',metatile:'◫',collision:'⬡',entity:'◆',actor:'♟',instance:'◇',behavior:'⛭',audio:'♫',source:'⇄',unresolved:'!',project:'▣',native:'▧'};
const key=(type,id)=>type+':'+String(id);
function makeGraph(){
 const nodes=new Map(),edges=[],issues=[],references=new Set();
 return {nodes,edges,issues,
  add(node){
   if(!nodes.has(node.key))nodes.set(node.key,node);
   return nodes.get(node.key);
  },
  edge(from,to,why,confidence='explicit'){
   if(!edges.some(e=>e.from===from&&e.to===to&&e.why===why))edges.push({from,to,why,confidence});
  },
  link(from,to,why){
   references.add(to);
   this.edge(from,to,why);
  },
  finish(){
   // Every owner has registered its assets. Only now can a reference be missing.
   for(const target of references){
    if(nodes.has(target))continue;
    const id=target.slice(target.indexOf(':')+1);
    this.add({key:target,id,name:id,type:'unresolved',
     identity:'Missing resource',summary:'An explicit resource reference does not resolve to an asset in this project.',
     scope:'Missing',open:null});
    issues.push('Unresolved reference '+target);
   }
   return this;
  }
 };
}
const array=x=>Array.isArray(x)?x:[];
// A Scene buffer can be the storage owner of an imported tile sheet. Its
// generated atlas is not evidence of the source game's room placement.
const isTileSheet=scene=>scene?.captureMeta?.mode==='native-chr'&&scene.buildInclude===false;
// What the relationships shown for a resource rest on: illustrative, observed at runtime, decoded, or stated by a pack.
function connectionEvidence(sel){
 if(mode==='demo')return 'Illustrative only';
 const origin=sel.libraryEntry?.origin;
 if(origin==='runtime-capture')return 'Observed at runtime (a synchronized emulator snapshot): sprite and background CHR links are cartridge offsets read through the mapper at that frame; its sprites are linked to the library\'s decoded poses where every piece is drawn in place (see Sprite → pose)';
 if(origin==='rom-catalog')return 'Decoded by the NES Forge decoder for this exact ROM; locations are checked against the cartridge layout';
 if(sel.libraryEntry)return 'Stated by the extraction pack that registered it; Forge validated the pack, not each relationship';
 return 'Declared IDs and source-owner receipts; native consumer observations have partial coverage';
}
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
  const sheet=isTileSheet(scene);
  const owner=addNode(g,sheet?'chr':'scene',id,scene.name,
   sheet?'Physical CHR tile sheet. Tile order and grayscale colors are generated for inspection; source room placement, palettes and sprite roles remain unresolved.':'Editable Scene. Owns layout and points to graphics, palettes, sprite placements and collision tables.',
   sheet?'Physical tile sheet · layout unresolved':'Canonical Scene',sheet?{kind:'chr',sceneId:id,bank:'bg'}:{kind:'scene',sceneId:id},
   sheet?'Source tiles '+scene.captureMeta.recovery.firstTile+'–'+(scene.captureMeta.recovery.firstTile+scene.captureMeta.recovery.tileCount-1)+'; no recovered room layout':`BG tile IDs used: ${usedBg}; Scene OAM tile IDs: ${usedSprites}; Metasprite tile IDs: ${poseTiles}; entities: ${array(scene.entities).length}; metatiles: ${array(scene.metatiles).length}`);
  // Keep the existing owner key so World references and active selection resolve.
  if(sheet){g.nodes.delete(owner.key);owner.key=scId;g.nodes.set(scId,owner);}
  const specs=sheet?[['chr','bg:'+id,'Physical CHR pixels','Physical source tiles; their background or sprite role is unknown.','chr','Editable tile pixels'],['palette','bg:'+id,'Tile sheet grayscale','Generated inspection colors; the source game palette is unresolved.','chr','Authored grayscale palette']]:[['chr','bg:'+id,'Background CHR','Background tile data '+(scene.chr?'stored on this Scene':'currently shared editor buffer'),'chr','BG CHR · '+usedBg+' used tile IDs'],['chr','spr:'+id,'Sprite CHR','Sprite tile data '+(scene.sprChr?'stored on this Scene':'currently shared editor buffer'),'chr','SPR CHR · '+usedSprites+' Scene OAM tile IDs · '+poseTiles+' Metasprite tile IDs'],['palette','bg:'+id,'Background palettes','NES background palette slots','scene','Four BG palettes'],['palette','spr:'+id,'Sprite palettes','NES sprite palette slots','sprites','Four sprite palettes'],['collision',id,'Tile collision','Collision properties and metatile collision metadata','collision','Scene collision table'],['sprite',id,'Sprite placements','Scene OAM sprite placements. Entries are slot/index based, not stable independent assets.','sprites',array(oam).length+' placements']];
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
   const n=addNode(g,'metatile',id+'::'+meta.id,meta.name||'Metatile $'+Number(meta.id).toString(16),'16×16 tile definition in the selected Scene library.','Canonical Scene metatile',{kind:'meta',sceneId:id,metatileId:meta.id},'Metatile ID '+meta.id);
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
 for(const pose of poses){const n=addNode(g,'metasprite',pose.id,pose.name||pose.id,'Composed sprite pose built from a source Scene.','Canonical metasprite',{kind:'pose',poseId:pose.id,sceneId:pose.sceneId},'Sprite frame / pose ID '+pose.id);
  if(pose.library?.entryId){const lib=pose.library,P=window.Forge.services.LibraryProvenance,where=lib.location&&P?P.short(lib.location):'';
   n.summary='Library sprite: '+(lib.mode==='reference'?'a shared reference to ':'an independent copy of ')+(lib.label||lib.poseId||'a library entry')+(lib.game?' from '+lib.game:'')+(lib.stage?' ('+lib.stage+')':'')+'.';
   n.source='Resource library · '+(lib.mode==='reference'?'shared reference':'copy')+' of '+lib.entryId;n.libraryRef={...lib};n.details+=(lib.sourceSha256?' · source ROM '+lib.sourceSha256.slice(0,12)+'…':'')+(where?' · '+where:'');
   const ln=addNode(g,'library',lib.entryId,lib.label||lib.entryId,'The library entry this sprite '+(lib.mode==='reference'?'references':'was copied from')+'. Its ROM evidence and code relationships stay in the library.','Resource library',{kind:'library-entry',entryId:lib.entryId},where,'Resource library');
   ln.libraryRef={entryId:lib.entryId,sourceSha256:lib.sourceSha256,label:lib.label,game:lib.game,kind:lib.kind,location:lib.location};g.edge(n.key,ln.key,lib.mode==='reference'?'shared reference to this library entry':'copied from this library entry');}if(pose.sceneId){g.link(n.key,key('scene',pose.sceneId),'uses source Scene graphics');g.link(n.key,key('chr','spr:'+pose.sceneId),'piece tile IDs read these sprite pixels');g.link(n.key,key('palette','spr:'+pose.sceneId),'piece palette IDs read these sprite colors');const scene=scenes.find(sc=>sc.id===pose.sceneId);if(scene)nativeLinks(g,scene,n.key);}const usage=window.Forge.services.ResourceContext.footprint(pose);n.details+=' · '+usage.pieceCount+' pieces · '+usage.tileIds.length+' distinct tile IDs';}
 for(const a of animations){const n=addNode(g,'animation',a.id,a.name||a.id,'Timeline animation. Individual frames may use metasprites or Scene art.','Canonical Animation',{kind:'animation',animationId:a.id},array(a.frames).length+' animation frames');for(const frame of array(a.frames)){if(frame.metaspriteId)g.link(n.key,key('metasprite',frame.metaspriteId),'frame uses metasprite');else if(frame.sceneId)g.link(n.key,key('scene',frame.sceneId),'frame uses Scene art');}}
 for(const b of array(core.behaviors))addNode(g,'behavior',b.id,b.name||b.id,'Gameplay Core behavior state table.','Canonical Gameplay Behavior',{kind:'behavior',behaviorId:b.id},array(b.states).length+' states');
 for(const d of array(core.actorDefinitions)){const n=addNode(g,'actor',d.id,d.name||d.id,'Reusable Gameplay Core Actor Definition.','Canonical Gameplay Actor',{kind:'actor',actorId:d.id},array(d.components).length+' components');if(d.behaviorId)g.link(n.key,key('behavior',d.behaviorId),'executes Behavior');for(const comp of array(d.components))if(comp.type==='Render'&&comp.values?.sourceSceneId)g.link(n.key,key('scene',comp.values.sourceSceneId),'Render component reads Scene graphics');}
 for(const i of array(core.actorInstances)){const n=addNode(g,'instance',i.id,i.name||i.id,'Placed instance of a reusable Gameplay Core definition.','Canonical Gameplay Actor Instance',{kind:'instance',instanceId:i.id},'Placement '+(i.placement?.kind||'unknown'));if(i.definitionId)g.link(n.key,key('actor',i.definitionId),'instantiates Actor Definition');if(i.placement?.kind==='scene'&&i.placement.sceneId)g.link(n.key,key('scene',i.placement.sceneId),'placed in Scene');if((i.placement?.kind==='world'||i.placement?.kind==='room')&&i.placement.worldId)g.link(n.key,key('world',i.placement.worldId),'placed in World');}
 const audio=addNode(g,'audio','project','Audio library','Project-wide tracker instruments, patterns, songs and SFX. Source event bindings require separate verified evidence.','Project-wide authoring',{kind:'audio'},`${array(S.instruments).length} instruments · ${array(S.sfx).length} SFX · ${array(S.patterns).length} patterns`);
 // A source-matched recovery catalog may contain valuable non-editable evidence.
 // Present it honestly; it must NOT fabricate authoring assets or affect gameplay.
 const recoveryDigest=window.Forge.services.SourceContext.project()?.sha256;
 const profile=window.Forge.services.RecoveryCatalog.info(recoveryDigest);
 const recoveryInfo=profile && S.importedRom && window.NativeEngineFormat.sha256(S.importedRom)===recoveryDigest ? profile : null;
 if(recoveryInfo){
   const graphics=window.Forge.services.CastlevaniaGraphicsProject.catalog(recoveryDigest);
   const sourceKey=key('source',recoveryDigest);
   if(!g.nodes.has(sourceKey))addNode(g,'source',recoveryDigest,recoveryInfo.label,'Original ROM attached to this project.','Exact source revision',null,recoveryDigest);
   for(const group of graphics.groups){
     const n=addNode(g,'chr','cv-upload-'+group.index,group.label,'Preview both pattern tables, open an editable CHR copy or export an original transfer.','Original CHR-RAM upload list',
       {kind:'cv-upload',index:group.index,sourceSha256:recoveryDigest},group.records.length+' ordered PRG-to-PPU transfers.','Original fixed-bank graphics loader');
     g.edge(n.key,sourceKey,'reads graphics from the attached original');
   }
   for(let index=0;index<graphics.pageCount;index++){
     const n=addNode(g,'scene','cv-courtyard-'+index,'Stage 01 courtyard · page '+(index+1),'Open the placed background in Scene or export its metatile layout.','Original stage background',
       {kind:'cv-courtyard',index,sourceSha256:recoveryDigest},'8 × 6 native metatiles. Editable copies retain their original source reference.','Bank 4 layout, block records and the original palette command');
     g.edge(n.key,key('chr','cv-upload-3'),'uses the courtyard background pattern table');
     g.edge(n.key,sourceKey,'reads placement and color from this ROM');
   }
   if(window.Forge.services.NativeAudioCatalog.profiles.some(p=>p.sha256===recoveryDigest)){
    const nativeAudio=addNode(g,'audio','native-cues-'+recoveryDigest,
     recoveryInfo.label+' · native audio cues',
     'Inspect channel commands and source offsets, audition a request, or preview a tracker excerpt.',
     'Original driver and cue table',{kind:'native-cues',sourceSha256:recoveryDigest},
     'Tracker patterns become editable after you choose Import.','Exact original US revision');
    g.edge(nativeAudio.key,key('source',recoveryDigest),'decodes this ROM’s sound request table');
   }
   const apu=addNode(g,'audio','apu-evidence-'+recoveryDigest,
     recoveryInfo.label+' · original APU observations',
     recoveryInfo.evidence.apuWrites+' NES APU register-write events observed during a bounded emulator replay. This is NOT a recovered song, sound effect or playable pattern.',
     'Source-linked analysis evidence',null,
     'The recovery kit includes the register trace in Recovery_Evidence/Castlevania_Recovery_02/results/. Open native audio cues for the decoded driver streams.',
     'Recovery 02 emulator trace');
   g.edge(apu.key,key('source',recoveryDigest),'observed from this original ROM revision');
   const note=addNode(g,'source','inventory-'+recoveryDigest,
     recoveryInfo.label+' · recovery status',
     recoveryInfo.evidence.scenes+' Scene captures, '+recoveryInfo.evidence.metasprites+' editable pose frames and '+recoveryInfo.evidence.animations+' Animation entries. The Stage 01 courtyard is available as three native background pages. Further stage layouts, collision, actor AI and score writeback remain open.',
     'Source-linked recovery inventory',null,
     'Exact ROM SHA-256: '+recoveryDigest+'; observed ROM graphics and audio evidence are linked to source, but no original Castlevania ROM writer is registered.',
     'Recovery catalog · source validated');
   g.edge(note.key,key('source',recoveryDigest),'tracks evidence and outstanding recovery');
   // Recovery 04: evidence-linked CPU execution, never promoted to live physics.
   const motion=window.Forge?.services?.RecoveryTraceCatalog?.info(recoveryDigest);
   if(motion){
     const n=addNode(g,'source','motion-'+recoveryDigest,
       recoveryInfo.label+' · CPU actor motion integrator',
       'Verified original 6502 fixed-point coordinate update: '+motion.verifiedConsecutiveMotionUpdates+' consecutive updates, with actual RAM writer sites. This is NOT a recovered controller or collision system.',
       'Source-backed executable evidence · read-only',null,
       'Bank '+motion.source.prgBank16K+' CPU $'+motion.source.cpuAddress.toString(16).toUpperCase()+
       ', physical PRG $'+motion.source.physicalPrgStart.toString(16).toUpperCase()+
       '–$'+motion.source.physicalPrgWriter.toString(16).toUpperCase()+
       '; high position '+motion.registers.positionHigh+', fraction '+motion.registers.positionFraction+
       ', high velocity '+motion.registers.velocityHigh+', fraction '+motion.registers.velocityFraction+
       '. No player-control, entity-identity, or native collision authority inferred.',
       'Recovery 04 source-backed CPU writer and 16-bit arithmetic replay');
     g.edge(n.key,key('source',recoveryDigest),'executed original code from exact ROM revision');
   }
   // Recovery 05: CPU instruction writers to the APU, verified against the
   // original ROM bytes. This creates only source evidence, NEVER audio tracks.
   const sound=window.Forge?.services?.RecoveryAPUSourceCatalog?.info(recoveryDigest);
   if(sound){
     const audit=addNode(g,'audio','apu-cpu-writers-'+recoveryDigest,
       recoveryInfo.label+' · original APU CPU writer map',
       sound.apuWrites+' executed APU register writes across '+sound.frameCount+' emulator frames, traced to '+sound.siteCount+' original 6502 instruction sites. Source evidence, NOT decoded music or SFX.',
       'Verified read-only CPU/audio evidence',null,
       'Source ROM SHA-256: '+sound.sourceRomSha256+'; '+sound.timerObservations+' APU timer-derived pitch observations (NOT source song notes). Use native audio cues to inspect the source sequences and audition them.',
       'Recovery 05 original CPU instruction and APU register instrumentation');
     audit.apuAuditDigest=recoveryDigest; // exportable source-linked evidence
     g.edge(audit.key,key('source',recoveryDigest),'original CPU wrote NES APU registers');
     for(const site of sound.writerSites){
       const id='apu-writer-'+site.physicalPrgOffset+'-'+recoveryDigest;
       const regs=Object.entries(site.registerCounts).map(([addr,n])=>addr+' ×'+n).join(', ');
       const actor=addNode(g,'source',id,
         recoveryInfo.label+' · APU writer '+site.physicalPrgOffset,
         site.writeCount+' original CPU write(s), bank '+site.bank16K+', CPU '+site.cpuPC+', opcode '+site.opcode+'. Source-linked APU register writer (not a decoded music event).',
         'Original CPU instruction · read-only',null,
         'Physical PRG offset '+site.physicalPrgOffset+'; register writes: '+regs+'. No song/SFX identity proven.',
         'Recovery 05 observed original 6502 instruction');
       g.edge(actor.key,audit.key,'writes sound registers in observed replay');
       g.edge(actor.key,key('source',recoveryDigest),'original code in exact ROM revision');
     }
   }
 }
 // Raw source observations are embedded in this standalone HTML, with exact
 // revision hashes. They are exportable evidence, never gameplay authority.
 if(recoveryInfo){
  const evidence=window.Forge?.services?.RecoveryEvidenceCatalog;
  for(const entry of evidence?.list(recoveryDigest)||[]){
   const type=entry.kind.startsWith('apu-')?'audio':'source';
   const n=addNode(g,type,'raw-'+entry.kind+'-'+recoveryDigest,
     recoveryInfo.label+' · '+entry.label,
     'Original-emulator observation retained for this exact ROM revision. Export the raw JSON from Resources. This is not a decoded game mechanic or authored asset.',
     'Original-ROM read-only evidence',null,
     'Exact SHA-256 '+recoveryDigest+' · record: '+entry.kind+'. Unknown actor identities, collision, music arrangement and native writeback remain unresolved.',
     'Recovery 01–04 source traces, bundled in Forge');
   n.evidenceDigest=recoveryDigest;n.evidenceKind=entry.kind;
   g.edge(n.key,key('source',recoveryDigest),'recorded from this exact ROM revision');
  }
 }
 if(S.nativeGame?.sourceSha256){const digest=S.nativeGame.sourceSha256;g.add({key:key('source',digest),id:digest,type:'source',name:'Preserved native ROM',scope:'Native source identity',summary:'Preserved ROM source; individual writeback capabilities depend on registered native encoders.',details:'SHA-256 '+digest,source:'Native resource project',open:null});}
 const library=window.Forge.services.InvestigatedLibrary.describe();g.library=library;
 for(const item of library.items){
  const resident=item.existing,type=item.type,editable=['scene','pose','animation'].includes(item.kind)&&!item.reason;
  const canonicalKey=resident&&item.kind!=='scene'?key(type,item.kind==='pose'?resident.poseId:resident.animationId):null;
  let node=canonicalKey&&g.nodes.get(canonicalKey);
  if(!node){
   const action=item.reason?null:editable?{kind:'rom-library',resource:item.request}:['cue','audio-library'].includes(item.kind)?{kind:'native-cues',sourceSha256:library.source.sha256,...(item.kind==='cue'?{cueId:item.record.id}:{})}:['graphics','map'].includes(item.kind)?{kind:'rom-inspect',resource:item.request}:null;
   node=g.add({key:item.key,id:item.id,name:item.name,type,scope:item.reason?'Unrecovered source slot':resident?'ROM library · editable copy open':'ROM library · '+(editable?'available to edit':'read-only reference'),summary:item.reason||item.summary,
    details:(item.record.group?item.record.group+' · ':'')+(item.record.pages?item.record.pages+' source page(s). ':'')+'Source ID '+item.id+(resident?' · working copy retained.':''),source:library.source.name,open:action,libraryOnly:true});
  }
  node.sourceResource=item;
  g.edge(node.key,key('source',library.source.sha256),'retained ROM catalog record','receipt');
  if(item.kind==='scene'&&resident)for(const sceneId of resident.sceneIds)g.edge(key('scene',sceneId),node.key,'editable page of this recovered source room','receipt');
 }
 try{const project={scenes,worlds,metasprites:poses,animations};for(const issue of array(window.Forge?.services?.AssetRegistry?.validate(project))){g.issues.push(issue.path+': '+issue.message);}}catch(e){g.issues.push('Reference validation unavailable: '+e.message);}
 if(!S.scenes.length)g.issues.push('No scenes in project');
 return g.finish();
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
 return g.finish();
}
const nodeByKey=id=>graph.nodes.get(id);
const elt=(tag,cls,content)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(content!==undefined)e.textContent=content;return e;};
function choose(id){if(!nodeByKey(id))return;if(active!==id)contextNote='';active=id;if(follow&&mode==='live')syncContext(nodeByKey(active));render();
 // following a link to a resource the current filters hide clears the filters, so the target is shown in the list
 if(active===id&&!document.querySelector('#frx-items .frx-item[aria-current="true"]')){$('search').value='';$('kind').value='';$('stage').value='';render();
  document.querySelector('#frx-items .frx-item[aria-current="true"]')?.scrollIntoView?.({block:'nearest'});}}
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

// Library mode: every entry of the persistent resource library (services.ResourceLibrary), identified or not.
// Nodes are read-only views of library records; the developer's notes are edited through library.annotate.
async function libraryGraph(){
 const g=makeGraph(),lib=window.Forge.services.ResourceLibrary;if(!lib)return g.finish();
 // every page: a library can hold more entries than one listing returns
 const packs=await window.Forge.commands.run('library.packs'),items=[];
 for(let offset=0;;offset+=5000){const page=await window.Forge.commands.run('library.list',{offset,limit:5000});if(!page.ok)break;items.push(...page.result.items);if(offset+5000>=page.result.total)break;}
 const packName=new Map((packs?.ok?packs.result:[]).map(p=>[p.packSha256,p.name+(p.game?' · '+p.game:'')]));
 // the same name and kind from more than one ROM (two revisions of a game): each item names its ROM
 const roms=new Map();for(const e of items){const k=e.kind+'|'+(e.notes?.name||e.path.split('/').pop());if(!roms.has(k))roms.set(k,new Set());roms.get(k).add(e.sourceSha256||'');}
 for(const e of items){
  const n=g.add({key:key('lib',e.id),type:'lib · '+e.kind,id:e.id,name:e.notes?.name||e.path.split('/').pop(),summary:(e.identified===false||e.kind==='unknown'?'Unidentified ':'')+e.kind+' from '+(packName.get(e.packSha256)||'a registered pack')+'. '+
   (e.data==='needs-source'?'Registered index-only: its data is read from the pack when opened again.':e.data==='stored-unreadable'?'Stored exactly as archived; the archive entry could not be read.':'Stored in the library.')+(e.validation==='rejected'?' The intake rejected it; it is kept anyway.':''),
   scope:(e.game||'Unknown source')+' · '+e.path,open:e.loads?{kind:'library-project'}:e.kind==='pose'&&e.rendition?{kind:'library-pose'}:null,details:'',source:'Resource library · '+(e.origin==='rom-catalog'?'recovered ROM catalog':e.origin==='runtime-capture'?'runtime capture'+(e.provenance?.job?' (Agent Lab investigation '+e.provenance.job+')':''):'pack '+e.packSha256.slice(0,12)+'…'),libraryEntry:e,
   romBadge:roms.get(e.kind+'|'+(e.notes?.name||e.path.split('/').pop()))?.size>1?(e.game||String(e.sourceSha256||'').slice(0,12)):null,
   stageNames:[...new Set((e.stages||[]).map(s=>s.stage))],stageBadge:[...new Set((e.stages||[]).map(s=>s.stage+(s.basis==='runtime'?' (observed)':s.basis==='rom-table'?' (ROM table)':'')))].join(', ')});
  if(e.preview)g.edge(n.key,key('lib','pack:'+e.packSha256.slice(0,16)+':'+(e.previewPath||'')),'preview image');
 }
 // each recovered catalog's registration state: an incomplete one explains missing CHR entries
 try{g.catalogs=new Map(((await window.Forge.services.LibraryCatalog?.catalogState?.())||[]).map(c=>[c.sha,c]));}catch(_){g.catalogs=new Map();}
 // every ROM the library knows, for the status list at the top of the library view
 try{g.roms=(await window.Forge.services.LibraryCatalog?.romStatus?.())||[];}catch(_){g.roms=[];}
 return g;
}
function setMode(next){
 if(next==='library'){mode='library';contextNote='';graph=makeGraph().finish();active=null;render();
  libraryGraph().then(g=>{if(mode!=='library')return;graph=g;active=pendingSelect&&graph.nodes.has(pendingSelect)?pendingSelect:graph.nodes.keys().next().value||null;pendingSelect=null;render();}).catch(e=>{contextNote='Library unavailable: '+e.message;render();});return;}
 mode=next;contextNote='';graph=mode==='demo'?sampleGraph():liveGraph();active=mode==='demo'?key('actor','a1'):key('scene',S.scenes[S.activeScene]?.id||'');if(!graph.nodes.has(active))active=graph.nodes.keys().next().value||null;render();}
function kindLabel(type){if(type.startsWith('lib · '))return 'Library · '+type.slice(6);return {library:'Library entry',chr:'CHR',metasprite:'Metasprite',actor:'Actor Definition','actor-record':'Native actor record',instance:'Actor Instance',sprite:'Sprite placements',entity:'Scene Entity'}[type]||type[0].toUpperCase()+type.slice(1);}
let filterSignature='';
function render(){
 if(!graph)return;let sel=nodeByKey(active);$('project-name').textContent=mode==='demo'?'Guided example':mode==='library'?'Resource library':(S.projectName||'Untitled');$('notice').innerHTML=mode==='library'?'<strong>LIBRARY</strong> · Every resource registered from extraction packs, identified or not. Locations are as the pack states them; your notes are kept apart from that evidence. Nothing here changes your project unless you open it explicitly.':mode==='demo'?'<strong>EXAMPLE DATA</strong> · Try clicking linked resources. This is a demonstration graph, not assets from the loaded project.':'<strong>LIVE PROJECT</strong> · Connections derive from actual resource IDs and declared references. Browsing is read-only. Explicit native-writer actions use the existing Undo transaction.';renderCatalogStatus();renderRomStatus();
 for(const [next,button] of [['live',$('live')],['demo',$('demo')],['library',$('lib')]])button.setAttribute('aria-pressed',String(mode===next));
 {const head=$('count').parentNode.firstChild;if(head&&head.nodeType===3)head.textContent=mode==='library'?'Library entries ':mode==='demo'?'Example resources ':'Project resources ';}
 const counts=mode==='live'&&graph.library?.counts;
 $('library-summary').hidden=!counts;
 $('library-summary').textContent=counts?'ROM library: '+counts.rooms+' recovered room streams / '+counts.roomSlots+' table slots · '+counts.poses+' poses · '+counts.animations+' scripts · '+counts.actorRecords+' native actor records. Editable working copies: '+S.scenes.length+'/64 Scenes · '+S.metasprites.length+'/256 poses · '+S.animations.length+'/256 animations. Select an available source asset to open a working copy.':'';
 $('active').disabled=mode!=='live';$('open-editor').disabled=mode==='demo'||!(sel?.open||sel?.evidenceKind||sel?.apuAuditDigest);$('follow').checked=follow;$('follow').disabled=mode==='demo';$('follow-badge').textContent=mode==='demo'?'Example only':follow?'Following':'Independent';$('follow-badge').dataset.mode=mode==='demo'?'demo':follow?'on':'off';
 const types=[...new Set([...graph.nodes.values()].map(n=>n.type))].sort();const old=$('kind').value;$('kind').replaceChildren();const all=elt('option',null,'All resources');all.value='';$('kind').appendChild(all);for(const type of types){const opt=elt('option',null,kindLabel(type));opt.value=type;$('kind').appendChild(opt);}$('kind').value=types.includes(old)?old:'';
 // Library: the chosen stage's resources first (stage, rooms, sprites, actors), every other resource after them.
 const stageSel=$('stage');stageSel.hidden=mode!=='library';
 if(mode==='library'){const names=[...new Set([...graph.nodes.values()].flatMap(n=>n.stageNames||[]))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})),was=stageSel.value;
  const perStage=new Map();for(const n of graph.nodes.values())for(const st of n.stageNames||[])perStage.set(st,(perStage.get(st)||0)+1);
  stageSel.replaceChildren(Object.assign(elt('option',null,'All stages'),{value:''}),...names.map(v=>Object.assign(elt('option',null,v+' · '+perStage.get(v)),{value:v})));stageSel.value=names.includes(was)?was:'';}
 const stage=mode==='library'?stageSel.value:'',kindRank=t=>['lib · stage','lib · room','lib · pose','lib · actor','lib · animation'].indexOf(t)>=0?['lib · stage','lib · room','lib · pose','lib · actor','lib · animation'].indexOf(t):9;
 const q=$('search').value.trim().toLowerCase(),type=$('kind').value,scope=$('scope').value;const list=[...graph.nodes.values()].filter(n=>(scope!=='source'||!!n.sourceResource)&&(scope!=='working'||!n.libraryOnly)&&(!type||n.type===type)&&(!q||(n.name+' '+n.id+' '+n.scope+' '+n.type+' '+(n.stageBadge||'')).toLowerCase().includes(q))).sort((a,b)=>{
  if(stage){const ia=a.stageNames?.includes(stage)?0:1,ib=b.stageNames?.includes(stage)?0:1;if(ia!==ib)return ia-ib;if(!ia)return kindRank(a.type)-kindRank(b.type)||a.name.localeCompare(b.name,undefined,{numeric:true});}
  return a.type.localeCompare(b.type)||a.name.localeCompare(b.name,undefined,{numeric:true});});
 // a filter that hides the selected resource moves the selection to the first listed one, so the details always
 // describe something in the list (a missing direct link still clears the selection, with its explanation)
 const signature=[mode,q,type,scope,stage].join('\u0001');
 if(signature!==filterSignature){const was=filterSignature;filterSignature=signature;
  if(was&&!list.some(n=>n.key===active)){active=list[0]?.key||null;if(!active)contextNote='No resource matches these filters.';sel=nodeByKey(active);
   $('open-editor').disabled=mode==='demo'||!(sel?.open||sel?.evidenceKind||sel?.apuAuditDigest);}}
 const inStage=stage?list.filter(n=>n.stageNames?.includes(stage)).length:0,groupHead=text=>{const h=elt('div','frx-group',text);h.style.cssText='font:700 10px/1.4 system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#8fd3ff;padding:8px 6px 3px';return h;};
 $('count').textContent=list.length+'/'+graph.nodes.size;$('items').replaceChildren();
 if(stage&&list.length)$('items').appendChild(groupHead(inStage?'In '+stage+' · '+inStage:'Nothing placed in '+stage+' matches'));
 let otherHead=false;
 for(const n of list){
  if(stage&&!otherHead&&!n.stageNames?.includes(stage)){otherHead=true;$('items').appendChild(groupHead('Everything else · '+(list.length-inStage)+' (other stages, unassigned, unidentified)'));}const b=elt('button','frx-item');b.type='button';b.setAttribute('aria-current',String(n.key===active));b.title=n.name+' · '+n.id;const glyph=elt('span','frx-glyph',icons[n.type]||'◆'),txt=elt('span');txt.style.minWidth='0';txt.append(elt('span','frx-item-name',n.name),elt('span','frx-item-type',kindLabel(n.type)+(n.libraryOnly?' · '+(n.sourceResource.reason?'unavailable':n.sourceResource.existing?'copy open':'ROM library'):'')+(n.romBadge?' · '+n.romBadge:'')+(n.stageBadge?' · '+n.stageBadge:'')));b.append(glyph,txt);b.onclick=()=>choose(n.key);$('items').appendChild(b);}if(!list.length)$('items').append(elt('div','frx-empty','No matching resources.'));
 if(!sel){
  const message=active===null&&contextNote?contextNote:'This resource is no longer in the live project. Select a resource to continue.';
  active=null;contextNote=message;
  for(const id of ['type','description','status','stats','preview','related-tools','deps','users','guidance','details','unknown','action-note'])$(id).replaceChildren();
  $('name').textContent='No selection';$('open-editor').textContent='Open in editor ↗';
  $('context-result').textContent=message;$('viewer-caption').textContent='No resource selected';
  $('footer-left').textContent=graph.nodes.size+' resources · '+graph.edges.length+' relationships · '+graph.issues.length+' diagnostic notes';
  return;
 }
 $('type').textContent=kindLabel(sel.type);$('name').textContent=sel.name;$('description').textContent=sel.summary;$('status').textContent=sel.type==='native'?'Physical source owner':sel.derived?'Derived buffer view':sel.scope;
 const deps=graph.edges.filter(e=>e.from===active),users=graph.edges.filter(e=>e.to===active);
 $('stats').replaceChildren();for(const [v,label] of [[deps.length,'Dependencies'],[users.length,'Used by'],[graph.issues.length,'Diagnostic notes']]){const box=elt('div','frx-stat');box.append(elt('strong',null,String(v)),elt('span',null,label));$('stats').appendChild(box);}
 function relations(id,edges,direction){const host=$(id);host.replaceChildren();if(!edges.length){host.append(elt('div','frx-empty',direction==='deps'?'No explicit dependencies recorded for this resource.':'No declared consumers found. This does not prove the resource is unused.'));return;}for(const e of edges){const related=nodeByKey(direction==='deps'?e.to:e.from);if(!related)continue;const b=elt('button','frx-relationship');b.type='button';const glyph=elt('span','frx-glyph',icons[related.type]||'◆'),middle=elt('span','frx-relmain');middle.append(elt('span','frx-rt',related.name),elt('span','frx-why',e.why+(e.confidence==='demo'?' · example':e.confidence==='receipt'?' · source receipt':'')));b.append(glyph,middle,elt('span','frx-linkglyph','›'));b.onclick=()=>choose(related.key);host.appendChild(b);}}
 relations('deps',deps,'deps');relations('users',users,'users');
 renderViewer(sel);$('guidance').innerHTML='<b>Reading this view:</b> “Depends on” shows explicit inputs and ownership dependencies. “Used by” shows resources that reference this one. Derived CHR/palette/sprite panels are not separately stored canonical assets. Build eligibility is not inferred from these links.';
 $('details').replaceChildren();for(const [label,value,code] of [['Resource key',sel.key,true],['Ownership / scope',sel.scope],['Provenance',sel.source],['Additional context',sel.details||'No additional metadata'],['Connection evidence',connectionEvidence(sel)]]){$('details').append(elt('span','frx-label',label),elt('div',code?'frx-code':'frx-value',value));}
 $('open-editor').textContent=mode==='demo'?'Example view — no editor action':(sel.evidenceKind||sel.apuAuditDigest)?'Export source evidence JSON ↓':sel.open?'Open in '+({scene:'Scene',tile:'CHR Sheet',chr:'CHR Sheet',sprites:'Sprites',meta:'Metatiles',collision:'Collision',animation:'Animation',pose:'Metasprites',world:'World',entity:'Entity Studio',actor:'Gameplay Core',instance:'Gameplay Core',behavior:'Behavior editor',audio:'Audio','cv-courtyard':'Scene','cv-upload':'CHR Sheet','native-cues':'ROM Audio Library','native-art':'native artwork',source:'source investigation','library-entry':'Library'}[sel.open.kind]||'editor')+' ↗':'Read-only evidence · no editor';
 $('action-note').textContent=mode==='demo'?'Switch to Live project to navigate real resources.':sel.open?.kind==='native-art'?'This explicit action opens the registered native writer. If absent, its dedicated Scene is added in one Undo step; snapshots are preserved.':sel.derived?'This resource has a Scene owner. Open in editor selects that Scene explicitly; Follow only applies to resource selections inside this workspace.':sel.type==='source'?'Source investigation requires matching ROM identity; this panel does not treat recognition as a verified native encoder.':sel.open?.kind==='native-art'?'This explicit action opens the registered native writer. If absent, its dedicated Scene is added in one Undo step; snapshots are preserved.':'Navigation uses existing NES Forge editor services and selection APIs.';
 $('unknown').textContent=mode==='demo'?'The example audio has no claimed runtime jump binding. Such links must be recovered or authored explicitly.':sel.type==='audio'?'Audio data is project-wide; no Scene-to-sound gameplay trigger is assumed.':sel.type==='source'?'A native ROM source receipt does not imply a full native graphics, behavior, or audio encoder.':'Declared references and native source receipts are distinguished. Known native consumers cover bounded observations; other runtime uses remain unknown.';
 if(sel.open?.kind==='rom-library'){
  $('open-editor').textContent=(sel.sourceResource.existing?'Open editable copy in ':'Edit source copy in ')+({pose:'Metasprites',animation:'Animation',scene:'Scene'}[sel.sourceResource.kind])+' ↗';
  $('action-note').textContent='Creates or selects an ordinary editable working copy. Creating source copies is one Undo step. Local work is preserved; native writeback still requires the registered encoder.';
 }
 if(sel.open?.kind==='rom-inspect')$('open-editor').textContent='Inspect matching ROM source ↗';
 if(mode==='library'){
  $('open-editor').textContent=sel.open?.kind==='library-project'?'Open project from library ↗':sel.open?.kind==='library-pose'?'Use in project (reference) ↗':'Library entry · read-only';
  $('action-note').textContent=sel.open?.kind==='library-project'?'Loads this project, found inside the pack, as your working project (like Open project). The library keeps its copy.':'Library entries stay in the library until you use them. Your notes are saved with "Save notes" and never change the stated evidence.';
  $('unknown').textContent='Pack locations are as the pack states them. Recovered-catalog locations are decoded from the ROM and checked against the cartridge layout. An entry without a location is kept and can be identified later.';
  $('follow').disabled=true;
 }
 if(sel.type==='actor-record')$('unknown').textContent='Contextual table entries can share the same enemy type across areas. Parameter codes and routine addresses do not establish recovered enemy poses, AI or playable actor definitions.';
 $('footer-left').textContent=`${graph.nodes.size} resources · ${graph.edges.length} relationships · ${graph.issues.length} diagnostic notes`;
}
// Previews read canonical project buffers only. No canvas is written back to a Scene.
function previewScene(n){const ctx=targetContext(n),id=ctx?.sceneId,idx=S.scenes.findIndex(sc=>sc.id===id);return idx<0?null:{scene:S.scenes[idx],live:idx===S.activeScene};}
function newCanvas(width,height,displayWidth){const c=elt('canvas','frx-preview-canvas');c.width=width;c.height=height;c.style.width=displayWidth||'100%';c.style.maxWidth='100%';c.style.height='auto';c.style.imageRendering='pixelated';c.setAttribute('role','img');return c;}
function poseCanvas(frame,source){const composer=window.Forge163.metasprites,bounds=composer.bounds(frame),c=newCanvas(256,160,'256px'),g=c.getContext('2d'),scale=Math.min(2,248/Math.max(1,bounds.w),152/Math.max(1,bounds.h));
 g.fillStyle='#172231';g.fillRect(0,0,c.width,c.height);composer.draw(g,frame,4+(frame.originX-bounds.x)*scale,4+(frame.originY-bounds.y)*scale,scale,source?{source}:{});return c;}
let previewKey=null;
function renderViewer(n){
 const host=$('preview'),tools=$('related-tools');host.replaceChildren();tools.replaceChildren();host.classList.remove('frx-lib');if(!n)return;
 // a newly selected resource starts at the top of its preview
 if(previewKey!==n.key){previewKey=n.key;host.scrollTop=0;requestAnimationFrame(()=>{if(previewKey===n.key)host.scrollTop=0;});}
 const ctx=targetContext(n),res=n.type==='world'?null:previewScene(n),caption=$('viewer-caption');caption.textContent=mode==='demo'?'Example assets are not in the project.':res?'Reading '+res.scene.name+' from '+(res.live?'live editor buffers':'stored Scene buffers')+'.':'No unique image or scene binding established.';
 if(mode==='demo'){host.append(elt('div','frx-preview-message','Guided example · select Live project to inspect real tile, palette and layout data.'));$('context-result').textContent='No editor synchronization in the demonstration graph.';return;}
 if(n.libraryEntry){renderLibraryViewer(n,host,tools,caption);return;}
 if(n.type==='library'&&n.libraryRef){host.classList.add('frx-lib');caption.textContent='Library entry used by this project';const UI=window.Forge.services.LibraryProvenanceUI;host.append(elt('div','frx-preview-message','Loading…'));
  UI?.cardFor({...n.libraryRef},{compact:false}).then(c=>{if(active===n.key)host.replaceChildren(c);}).catch(err=>{host.replaceChildren(elt('div','frx-preview-message',err.message));});
  $('context-result').textContent='Read-only · the library entry is unchanged by using it';return;}
 if(n.libraryOnly&&n.sourceResource){renderSourceViewer(n,host,tools,caption);return;}
 if(n.open?.kind==='cv-upload'||n.open?.kind==='cv-courtyard'){
   caption.textContent='Original ROM preview. Opening this resource creates or selects its editable project copy.';
   $('context-result').textContent='Source preview';
   window.Forge.services.CastlevaniaGraphicsProject.preview(n.open,host,newCanvas);return;
 }
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
   caption.textContent+=isTileSheet(scene)?' Physical tile order with generated grayscale colors. Source room placement and palettes are unresolved.':' '+(view.active?'Current CHR color mode: '+view.mode+'.':'Scene colors (auto), independent of the displayed CHR bank.')+' Atlas page '+(page+1)+'. Transparent sprite index 0 is checkerboard; sheet pixels are unflipped.';
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
  const title=elt('div','frx-viewer-legend',isTileSheet(scene)?'Raw CHR sheet · no recovered level layout. Open an extracted room project to inspect its placement.':(n.type==='collision'?'Red overlay: declared tile properties · ':'')+'Preview is read-only; original Scene/CHR/Collision editors remain authoritative.');host.appendChild(title);
 }else if(n.type==='world'){
  const w=S.worlds?.find(w=>w.id===n.open?.worldId);if(w){const dims=[Number(w.widthScreens)||1,Number(w.heightScreens)||1],c=newCanvas(256,128,'min(400px, 100%)'),g=c.getContext('2d'),cells=Array.isArray(w.map)?w.map:[];g.fillStyle='#101b2d';g.fillRect(0,0,256,128);const columns=Math.max(1,Math.ceil(Math.sqrt(cells.length*2)));const rows=Math.max(1,Math.ceil(cells.length/columns));for(let i=0;i<cells.length;i++){const v=Number(cells[i])||0;g.fillStyle=`hsl(${(v*47)%360} 35% ${v?33:16}%)`;g.fillRect((i%columns)*256/columns,Math.floor(i/columns)*128/rows,Math.ceil(256/columns),Math.ceil(128/rows));}host.append(c,elt('div','frx-viewer-legend','Overview of declared map values; not a reconstructed native overworld render.'));}
 }else if(n.type==='audio'){host.append(elt('div','frx-preview-message',`${S.instruments?.length||0} tracker instruments · ${S.patterns?.length||0} patterns · ${S.sfx?.length||0} SFX. Audio is project-wide; no scene event binding assumed.`));}
 else host.append(elt('div','frx-preview-message','No verified visual preview for this resource. Its provenance and declared relationships are shown below.'));
 if(ctx?.sceneId){
  const sc=S.scenes.find(sc=>sc.id===ctx.sceneId);tools.append(elt('span','frx-viewer-key','Related editors · '+(sc?.name||'unknown')));
  for(const [label,kind,bank] of (isTileSheet(sc)?[['CHR tiles','chr','bg']]:[['Scene','scene'],['BG CHR','chr','bg'],['Sprite CHR','chr','spr'],['Collision','collision'],['Sprites','sprites'],['Metatiles','meta']])){
   const b=elt('button','frx-context-shortcut',label);b.type='button';b.title='Open '+label+' in the existing editor with this Scene selected';b.onclick=()=>openContextEditor(ctx.sceneId,kind,bank);tools.appendChild(b);
  }
  const frame=n.open?.poseId&&S.metasprites.find(p=>p.id===n.open.poseId);
  if(n.libraryRef)libraryCard(n,tools);
  let origin;try{origin=window.Forge.services.ResourceContext.native(sc);}catch(_){}
  if(frame){const b=elt('button','frx-context-shortcut','Used pose tiles');b.type='button';b.onclick=()=>{window.Forge163.metasprites.select(frame.id);openContextEditor(frame.sceneId,'chr','spr');window.forgeCHR.usageOnly=true;const tiles=window.Forge.services.ResourceContext.footprint(frame).tileIds;if(tiles.length&&!tiles.includes(S.editTile))S.editTile=S.selTile=tiles[0];window.render();};tools.appendChild(b);}
  for(const writer of [origin?.writer,origin?.paletteWriter].filter(Boolean)){const b=elt('button','frx-context-shortcut',writer.kind==='chr'?'Edit native CHR bank '+writer.index:'Edit native fight palette');b.type='button';b.onclick=()=>{try{window.Forge.services.PunchOutArtUI.open(writer.kind,writer.index);close();}catch(error){contextNote=error.message;render();}};tools.appendChild(b);}
  const relatedWorlds=S.worlds?.filter(w=>w.id===ctx.worldId||w.tilesetSceneId===ctx.sceneId)||[];for(const w of relatedWorlds.slice(0,6)){const b=elt('button','frx-context-shortcut','World: '+w.name);b.type='button';b.onclick=()=>openContextWorld(w.id);tools.appendChild(b);}
 }else{tools.append(elt('div','frx-preview-message','No unique Scene binding: editor context will not be changed automatically.'));}
 window.Forge.services.ProjectLessons?.shortcut(tools,{...n.open,resourceKey:n.key});
 $('context-result').textContent=contextNote||(follow?'Follow on · choose a related asset to synchronize linked Scene/CHR/Collision.':'Independent browsing · selecting a resource does not modify editor selection.');
}
// A captured frame: Scene -> Sprite -> CHR -> ROM location -> Code/RE, each link with the evidence it rests on
const hx=(v,w=2)=>Number(v).toString(16).toUpperCase().padStart(w,'0');
// Recovered catalogs that are not complete, in the library view: what Forge is doing about each and, where automatic
// completion has stopped or failed, a Retry. Complete catalogs are not listed.
function renderCatalogStatus(){
 const host=$('notice');let box=document.getElementById('frx-catalog-status');
 const list=mode==='library'?(window.Forge.services.LibraryCatalog?.recoveryStatus?.()||[]).filter(s=>s.state&&!['complete','unsupported'].includes(s.state)):[];
 if(!list.length){box?.remove();return;}
 if(!box){box=elt('div');box.id='frx-catalog-status';box.style.cssText='margin-top:4px;color:#ffb35a';}
 if(box.parentNode!==host)host.append(box);
 box.replaceChildren(...list.map(st=>{const row=elt('div',null,'Recovered catalog of '+(st.name||st.sha.slice(0,12))+': '+st.text+(st.lastError?' ('+st.lastError+')':'')+(st.attempts&&st.state!=='failed'?' · attempts '+st.attempts+' of '+(window.Forge.services.LibraryCatalog.AUTO_ATTEMPTS||3):''));row.dataset.catalog=st.sha;
  if(['needs-retry','failed','needs-source','incomplete'].includes(st.state)){const b=elt('button','frx-context-shortcut','Retry');b.type='button';b.dataset.action='retry-catalog';
   b.onclick=async()=>{b.disabled=true;await window.Forge.services.LibraryCatalog.completeCatalog(st.sha,{manual:true,reason:'retry'});reloadLibrary();};row.append(' ',b);}
  return row;}));
}
// Every ROM in the library at a glance: its recovered catalog (and what Forge is doing about it), verified frames,
// investigations and how its sprites are drawn. Shown in the library view only.
function renderRomStatus(){
 const host=$('notice');let box=document.getElementById('frx-rom-status');
 const roms=mode==='library'?graph?.roms||[]:[];
 if(!roms.length){box?.remove();return;}
 if(!box){box=elt('details');box.id='frx-rom-status';box.open=true;box.style.cssText='margin-top:6px;font-size:11px;color:#cfe3ee';}
 if(box.parentNode!==host)host.append(box);
 const CAT={complete:'catalog complete',incomplete:'catalog incomplete',failed:'catalog: last attempt failed','needs-retry':'catalog stopped: use Retry','needs-source':'catalog incomplete: needs its cartridge',
  missing:'catalog not registered yet',outdated:'catalog from an earlier Forge (updated automatically)',completing:'catalog completing…',updating:'catalog updating…',waiting:'catalog: retrying soon',none:'no recovered catalog',unsupported:'no recovered catalog'};
 const rows=roms.map(r=>{const row=elt('div');row.dataset.rom=r.sha;row.style.cssText='margin:2px 0';
  const bad=['failed','needs-retry','needs-source','incomplete','missing'].includes(r.catalog.state);
  const d=r.drawing,parts=[r.entries+' entries',(CAT[r.catalog.state]||r.catalog.state)+(r.catalog.entries?' ('+r.catalog.entries+')':'')+(bad&&r.catalog.attempts?' · '+r.catalog.attempts+' of 3 attempts':''),
   r.frames+' verified frame'+(r.frames===1?'':'s'),r.investigations+' investigation'+(r.investigations===1?'':'s')];
  const drawn=d?[d.decoded&&d.decoded+' in their room',d.fight&&d.fight+' in their fight',d.runtime&&d.runtime+' seen at runtime',d['same-everywhere']&&d['same-everywhere']+' same in every room',d.default&&d.default+' room not established'].filter(Boolean):[];
  if(drawn.length)parts.push('sprites: '+drawn.join(', '));
  for(const p of r.otherPacks||[])parts.push(p.name);
  const name=elt('strong',null,r.name);name.style.color=bad?'#ffb35a':'#e8f4fa';row.append(name,' · '+parts.join(' · ')+(bad&&r.catalog.lastError?' · last error: '+r.catalog.lastError:''));
  if(r.open){const b=elt('button','frx-context-shortcut','Open');b.type='button';b.dataset.action='open-rom';b.onclick=()=>{pendingSelect=key('lib',r.open);setMode('library');};row.append(' ',b);}
  return row;});
 box.replaceChildren(elt('summary',null,'ROMs in your library · '+roms.length),...rows);
}
// a completed catalog adds entries: reload the library view, keeping the selection
function reloadLibrary(){if(mode!=='library')return;pendingSelect=active;setMode('library');}
addEventListener('forge:catalog-recovery',e=>{if(mode!=='library')return;renderCatalogStatus();
 void window.Forge.services.LibraryCatalog?.romStatus?.().then(r=>{if(graph&&mode==='library'){graph.roms=r;renderRomStatus();}}).catch(()=>{});if(e.detail?.state==='complete'&&!e.detail.already&&root.classList.contains('frx-visible'))reloadLibrary();});
// why a ROM's cartridge tile data is not (all) linked: its recovered catalog is still incomplete, or there is none
function catalogGap(sha){const c=graph?.catalogs?.get(sha);
 if(c&&!['complete','outdated'].includes(c.state))return 'this ROM\'s recovered catalog is incomplete ('+(c.state==='failed'?'its last completion attempt failed':c.state==='missing'?'it was never registered':'its registration was interrupted')+'; Forge completes it when the cartridge is available)';
 return null;}
// which room a library sprite is drawn in, and on what evidence (an unestablished room is said, not hidden)
function drawnAs(c){
 const room=(c?.label||'its room')+(c?.stage?' ('+c.stage+')':'');
 if(!c?.basis)return 'Drawn with the tile banks and palette of '+room+' (recorded before the drawing room was checked)';
 if(c.basis==='same-everywhere')return 'Same tiles in every room; drawn with the palette of '+room;
 if(c.basis==='default')return '⚠ Room not established: drawn with the tile banks and palette of '+room+'. '+c.note[0].toUpperCase()+c.note.slice(1);
 return 'Drawn as in '+room+': '+c.note;
}
function hasChrEntries(sourceSha256){const prefix=key('lib','rom:'+String(sourceSha256||'').slice(0,16)+':chr:');for(const k of graph.nodes.keys())if(k.startsWith(prefix))return true;return false;}
async function renderFrameDetails(entry,host){
 const C=window.Forge.commands,P=window.Forge.services.LibraryProvenance,UI=window.Forge.services.LibraryProvenanceUI;
 const r=await C.run('library.read',{id:entry.id,as:'base64'});if(!r.ok)return;
 const rec=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(r.result.base64),c=>c.charCodeAt(0))));
 const box=elt('div','frx-frame');box.style.cssText='text-align:left;font-size:11px;margin:6px 0;border-top:1px solid #2c4458;padding-top:6px';
 const head=t=>box.append(elt('span','frx-label',t)),note=t=>box.append(elt('div','frx-code',t));
 const button=(label,fn,title)=>{const b=elt('button','frx-relationship',label);b.type='button';if(title)b.title=title;b.onclick=fn;return b;};
 const chrEntry=bank=>'rom:'+entry.sourceSha256.slice(0,16)+':chr:chr:'+bank,inLibrary=id=>graph.nodes.has(key('lib',id));
 const anyChr=hasChrEntries(entry.sourceSha256),why=catalogGap(entry.sourceSha256)||(anyChr?'this CHR bank has no library entry':'this ROM has no recovered catalog in the library');
 // an unavailable link stays visible, looks unavailable, and says why next to it (not only in a tooltip)
 const chrLink=(bank,title)=>{const id=chrEntry(bank),b=button('CHR bank '+bank,()=>choose(key('lib',id)),title);if(inLibrary(id))return [b];
  b.disabled=true;b.title='Unavailable: '+why;b.dataset.unavailable='true';const r=elt('span','frx-unavailable','unavailable: '+why);return [b,r];};
 // where the cartridge's CHR ROM starts in the file: any mapped window gives it (file offset minus CHR offset)
 const chrBase=(rec.banks?.chr||[]).find(x=>Number.isInteger(x.fileOffset)&&Number.isInteger(x.offset)),fileOf=chrOffset=>chrBase?chrBase.fileOffset-chrBase.offset+chrOffset:null;
 const openBytes=loc=>{close();try{switchTab('disasm');}catch(_){}P.openAt({sourceSha256:entry.sourceSha256},loc).then(res=>UI.renderOrigin(null,res));};
 head('Scene');
 if(entry.artifacts?.scene){const b=button('Open as a new Scene',async()=>{const u=await C.run('library.openFrameScene',{id:entry.id});if(!u.ok){$('context-result').textContent=u.error.message;return;}close();try{switchTab('scene');}catch(_){}window.showToast?.('Added “'+u.result.name+'” as a new Scene. Undo removes it.');},
   'The verified runtime capture of this frame (native tiles with their CHR offsets); it re-renders to the recorded framebuffer');b.dataset.frame='open-scene';box.append(b);note('Observed and verified: rebuilt from the frame\'s own tiles with 0 different pixels.');}
 else note('No scene artifact: '+(rec.synchronization?.state==='matched'?'not stored with this record.':'the frame could not be synchronization-checked ('+(rec.synchronization?.reason||'unknown reason')+').'));
 const visible=(rec.sprites||[]).filter(sp=>sp.visible),split=rec.ppu?.split;
 head('Sprites · '+visible.length+(/as drawn/.test(rec.spritesFrom||'')?' drawn in frame '+rec.frame+' (from its trace)':' on screen (OAM at frame '+rec.frame+')'));
 if(!anyChr)note('CHR library entries: none for this ROM, so CHR bank links are unavailable. The cartridge file offsets below are observed; "Bytes in RE" opens them in the ROM.');
 // a record that traced its drawn sprites gives each one's location as it was drawn (checked against the cartridge);
 // older records, and frames whose sprites could not be traced to one location, use the banks at the end of the frame
 const traced=rec.spritePatternsAt==='fetch';
 if(split&&traced)note('This frame switches CHR banks or scroll mid-frame (sprite 0 at line '+split.sprite0Line+'). Each sprite\'s location is the bank in effect when it was drawn, from the frame\'s trace; its rows equal the cartridge bytes there.');
 else if(split&&rec.spritePatternsAt!=='chr-ram')note('Unverified: this frame switches CHR banks or scroll mid-frame (sprite 0 at line '+split.sprite0Line+'); sprite pattern locations use the banks at the end of the frame.');
 for(const sp of visible.slice(0,32)){
  const atFetch=sp.chrOffsetAt==='fetch'&&Number.isInteger(sp.chrOffset)&&fileOf(sp.chrOffset)!==null;
  const w=(rec.banks?.chr||[]).find(x=>sp.pattern>=x.ppu&&sp.pattern<=x.ppuEnd),fo=atFetch?fileOf(sp.chrOffset):w&&Number.isInteger(w.fileOffset)?w.fileOffset+(sp.pattern-w.ppu):null;
  const bank4KiB=atFetch?sp.chrOffset>>12:w?.chrBank4KiB;
  const row=elt('div');row.className='frx-frame-sprite';row.style.cssText='display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:2px 0';
  row.append(elt('span','frx-code','#'+sp.index+' at '+sp.x+','+sp.y+' · tile $'+hx(sp.tile)+' · palette '+sp.palette+(sp.flipH?' · flipped':'')+' · '+(fo!==null?'CHR file 0x'+hx(fo,5):w?.source==='CHR RAM'?'CHR RAM (no cartridge offset)':'pattern location unknown')));
  if(atFetch&&sp.rowsFrom)row.append(elt('span','frx-code','rows from '+sp.rowsFrom.length+' locations: '+sp.rowsFrom.map(g=>'rows '+g.firstRow+(g.lastRow>g.firstRow?'-'+g.lastRow:'')+' bank '+(g.chrOffset>>12)).join(', ')));
  if(fo!==null){row.append(...chrLink(bank4KiB,atFetch?'Observed: the bank in effect when this sprite was drawn (from the frame\'s trace; its rows equal the cartridge bytes there)':'Observed: OAM tile through the CHR mapping'+(split?'; unverified for this frame (mid-frame switch)':'')),button('Bytes in RE',()=>openBytes({fileOffset:fo,length:sp.height===16?32:16,region:'CHR ROM',chrBank:{index:bank4KiB,size:4096},name:'sprite #'+sp.index+' tile'}),'The tile\'s bytes in the cartridge'));}
  box.append(row);
 }
 if(visible.length>32)note('… '+(visible.length-32)+' more sprites.');
 // the library's decoded poses of this ROM drawn in the frame: established, candidates, ambiguous, not established
 head('Sprite → pose');
 const lp=await C.run('library.framePoses',{id:entry.id}),pl=lp.ok?lp.result:null;
 if(!pl)note('Not available: '+(lp.error?.message||'unknown reason')+'.');
 else if(pl.state!=='linked')note(pl.note);
 else{
  const list=elt('div');list.dataset.frame='pose-links';
  const line=(cls,parts)=>{const row=elt('div');row.className=cls;row.style.cssText='display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:2px 0';row.append(...parts);list.append(row);return row;};
  const poseButton=(id,label)=>{const b=button(label,()=>choose(key('lib',id)),'Open this pose in the library');if(!inLibrary(id)){b.disabled=true;b.title='Unavailable: this pose is not among the library entries shown';}return b;};
  const sprites=ids=>'sprites #'+ids.join(', #');
  for(const l of pl.links){const row=line('frx-pose-link',[poseButton(l.poseEntry,l.label),elt('span','frx-code',sprites(l.sprites)+(l.mirrored?' · mirrored':'')+' · established by '+l.by+': '+l.evidence)]);row.dataset.pose=l.poseEntry;}
  for(const c of pl.candidates)line('frx-pose-candidate',[poseButton(c.poseEntry,c.label),elt('span','frx-code',sprites(c.sprites)+' · '+c.state+', not established: '+c.evidence)]);
  for(const a of pl.ambiguous)line('frx-pose-ambiguous',[elt('span','frx-code',sprites(a.sprites)+' · ambiguous, not established: drawn exactly as '+a.poses.map(p=>p.label).join(' and '))]);
  line('frx-pose-rest',[elt('span','frx-code',pl.notEstablished.length?'Not established: '+pl.notEstablished.length+' of '+pl.sprites+' drawn sprite'+(pl.sprites===1?'':'s')+' belong to no established pose.':'Every drawn sprite belongs to an established pose.')]);
  box.append(list);
 }
 head('Background tiles');
 const regions=rec.synchronization?.backgroundTileSources||[];
 if(!regions.length)note('Not available for this frame.');
 for(const src of regions){
  if(src.source!=='CHR-ROM'){note(src.tiles+' tiles from CHR RAM (written by the game; no cartridge offset)');continue;}
  const win=(rec.banks?.chr||[]).find(x=>x.offset!==undefined&&src.chrOffset>=x.offset&&src.chrOffset<x.offset+1024),bank=src.chrOffset>>12,id=chrEntry(bank);
  const row=elt('div');row.style.cssText='display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:2px 0';
  row.append(elt('span','frx-code',src.tiles+' tiles from CHR ROM +0x'+hx(src.chrOffset,5)+' (bank '+bank+')'));
  row.append(...chrLink(bank,'Observed through the renderer and verified by the 0-pixel rebuild'));
  const fo=win?win.fileOffset+(src.chrOffset-win.offset):fileOf(src.chrOffset);
  if(fo!==null)row.append(button('Bytes in RE',()=>openBytes({fileOffset:fo,length:1024,region:'CHR ROM',chrBank:{index:bank,size:4096},name:'background CHR'}),'The cartridge bytes of these tiles'));
  else row.append(elt('span','frx-unavailable','bytes unavailable: the CHR ROM position in the file is unknown for this frame'));
  if(!win&&fo!==null)row.append(elt('span','frx-code','(loaded by a mid-frame bank switch: not in the end-of-frame windows)'));
  box.append(row);
 }
 head('Code at the snapshot');
 const pc=rec.cpu?.pcLocation;
 if(Number.isInteger(pc?.fileOffset)){const row=elt('div');row.style.cssText='display:flex;gap:6px;align-items:center;flex-wrap:wrap';row.append(elt('span','frx-code','PC $'+hx(pc.cpu,4)+' · file 0x'+hx(pc.fileOffset,5)+' · PRG bank '+pc.prgBank8KiB+' (8 KiB) · observed'),button('Inspect in CODE/RE',()=>{close();P.inspect({entryId:entry.id});}));box.append(row);}
 else note('The PC is not in a uniquely located PRG window ('+(pc?.state||'unknown')+').');
 note('How the machine reached this frame is not part of a snapshot; a trace can be replayed from the job\'s checkpoint.');
 head('Provenance');
 const pv=entry.provenance;
 note(pv?'Agent Lab job '+pv.job+' · plan "'+pv.plan?.name+'" ('+String(pv.plan?.sha256).slice(0,12)+'…, target '+pv.plan?.target+') · emulator build '+String(pv.emulatorBuild).slice(0,12)+'… · '+(pv.execution?.source||'')+(pv.checkpoint?' · boot checkpoint '+pv.checkpoint.source:''):'Captured in this session (library.registerFrame).');
 note('Frame '+rec.frame+' · evidence '+String(rec.digests?.all).slice(0,16)+'… · ROM '+entry.sourceSha256.slice(0,12)+'…');
 host.append(box);
}
function libraryCard(n,tools){const UI=window.Forge.services.LibraryProvenanceUI;if(!UI)return;const holder=elt('div');holder.style.cssText='flex-basis:100%;width:100%';tools.appendChild(holder);
 UI.cardFor({...n.libraryRef},{compact:false}).then(c=>{if(active===n.key)holder.replaceChildren(c);}).catch(()=>{});}
const hexDump=bytes=>{const lines=[];for(let i=0;i<Math.min(bytes.length,4096);i+=16){const row=[...bytes.subarray(i,i+16)];lines.push(i.toString(16).padStart(6,'0')+'  '+row.map(b=>b.toString(16).padStart(2,'0')).join(' ').padEnd(48)+'  '+row.map(b=>b>=32&&b<127?String.fromCharCode(b):'.').join(''));}return lines.join('\n')+(bytes.length>4096?'\n… '+(bytes.length-4096)+' more bytes':'');};
// A library sprite drawn from its rendition: 8×8 or 8×16 pieces, NES colours, transparent colour 0.
function drawRendition(rend,scale=3){
 const h=rend.spriteMode===16?16:8,xs=rend.pieces.map(p=>p.x),ys=rend.pieces.map(p=>p.y),x0=Math.min(...xs,0),y0=Math.min(...ys,0),w=Math.max(...xs.map(x=>x+8),8)-x0,ht=Math.max(...ys.map(y=>y+h),h)-y0;
 const c=document.createElement('canvas');c.width=w*scale;c.height=ht*scale;c.style.cssText='image-rendering:pixelated;background:#1d2b38;display:block;margin:4px auto;max-width:100%';
 const g=c.getContext('2d');
 for(const p of rend.pieces){const pal=rend.palette[p.pal&3]||[15,0,16,48];
  for(let py=0;py<h;py++)for(let px=0;px<8;px++){
   const sy=p.flipV?h-1-py:py,tile=rend.tiles[sy<8?p.tile:p.tile2],row=tile?.[sy&7];if(!row)continue;const v=row[p.flipH?7-px:px];if(!v)continue;
   const rgb=NP[pal[v]&63]||[255,0,255];g.fillStyle='rgb('+rgb.join(',')+')';g.fillRect((p.x-x0+px)*scale,(p.y-y0+py)*scale,scale,scale);}}
 return c;
}
function renderLibraryViewer(n,host,tools,caption){
 host.classList.add('frx-lib');
 const e=n.libraryEntry,C=window.Forge.commands,id=e.id;caption.textContent='Library entry · '+e.path;$('context-result').textContent='Read-only library view';
 host.append(elt('div','frx-preview-message','Loading…'));
 // only the latest render of this view writes into it (two renders of the same entry can overlap)
 const token={};host._renderToken=token;const stale=()=>active!==n.key||host._renderToken!==token;
 (async()=>{
  const [ins,pv]=await Promise.all([C.run('library.inspect',{id}),C.run('library.preview',{id})]);if(stale())return;host.replaceChildren();
  if(!ins.ok){host.append(elt('div','frx-preview-message',ins.error.message));return;}
  const entry=ins.result.entry,notes=ins.result.notes||{};
  if(entry.kind==='pose'&&entry.rendition){
   // the chosen stage's colours where the sprite was observed there, else a stage where it was observed
   const chosen=$('stage').value,observed=Object.keys(entry.renditions||{}),use=chosen&&entry.renditions?.[chosen]?chosen:observed[0]||'';
   const r=await C.run('library.rendition',{id,stage:use});if(stale())return;
   if(r.ok){const rend=r.result.rendition,canvas=drawRendition(rend,4);host.append(canvas,elt('div','frx-code',drawnAs(rend.context)+' · '+rend.pieces.length+' pieces · 8×'+rend.spriteMode+
     (chosen&&use!==chosen&&!rend.context?.mode?' · not observed in '+chosen+(use?'; these are the colours of '+use+', where it was observed':''):'')+(!use&&!rend.context?.mode?' · not yet observed in a stage: the game may show it in other colours':'')));
    const row=elt('div');row.style.cssText='display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin:6px 0';
    for(const [mode,label] of [['reference','Use in project (reference)'],['copy','Copy into project (tiles + palette)']]){
     const b=elt('button','frx-relationship',label);b.type='button';b.onclick=async()=>{b.disabled=true;
      const u=await C.run('library.usePose',{id,mode,...(r.result.stage?{stage:r.result.stage}:{})});
      if(!u.ok){contextNote=u.error.message;$('context-result').textContent=u.error.message;b.disabled=false;return;}
      const d=u.result.dependencies,msg=(mode==='reference'?'Referenced':'Copied')+' “'+rend.name+'” into this scene: '+d.tilesAdded+' tiles added'+(d.tilesShared?', '+d.tilesShared+' shared':'')+
       ', palette rows '+d.palettes.map(p=>p.row+(p.reused?' (reused)':' (set)')).join(', ')+(mode==='reference'?'. It stays linked to the library; editing it asks to make a copy.':'. It is an independent copy.');
      showPlaced(u.result,msg);};row.append(b);}
    host.append(row);
    // the captured frames of this ROM that show this pose (established links), each opening the frame
    // a newer render of the same entry may have replaced this one while it waited: then this one stops
    const seen=await C.run('library.poseFrames',{id});if(stale())return;
    if(seen.ok){const line=elt('div');line.dataset.pose='frames';line.style.cssText='display:flex;gap:6px;flex-wrap:wrap;align-items:center;justify-content:center;margin:4px 0';
     if(!seen.result.frames.length)line.append(elt('span','frx-code',seen.result.framesChecked?'Not established in any of the '+seen.result.framesChecked+' captured frames of this ROM.':'No captured frames of this ROM in the library yet.'));
     else{line.append(elt('span','frx-code','Seen in '+seen.result.frames.length+' captured frame'+(seen.result.frames.length===1?'':'s')+':'));
      for(const f of seen.result.frames.slice(0,12)){const b=elt('button','frx-relationship',f.label);b.type='button';b.title='Established by '+f.by+(f.mirrored?', mirrored':'')+(f.mode?', drawn as '+f.mode:'')+' · sprites #'+f.sprites.join(', #');b.onclick=()=>choose(key('lib',f.frameEntry));line.append(b);}
      if(seen.result.frames.length>12)line.append(elt('span','frx-code','… '+(seen.result.frames.length-12)+' more'));}
     host.append(line);}
   }
  }
  if(pv.ok&&pv.result.preview){const img=elt('img');img.src=pv.result.preview;img.alt='Preview of '+e.path;img.style.cssText='image-rendering:pixelated;max-width:100%;max-height:300px;display:block;margin:0 auto 8px';host.append(img);
   if(entry.preview?.derivation)host.append(elt('div','frx-code','Preview: '+entry.preview.derivation+'. '+(entry.kind!=='frame'?'':catalogGap(entry.sourceSha256)?'The cartridge tile data is not all linked yet: '+catalogGap(entry.sourceSha256)+'. The file offsets below locate it in the ROM.':hasChrEntries(entry.sourceSha256)?'The original cartridge tile data is in this ROM\'s CHR library entries, linked below.':'This ROM has no recovered catalog in the library, so the cartridge tile data is not linked here; the file offsets below locate it in the ROM.')));}
  // evidence: decoded or stated locations, each address type on its own row, or that the location is unknown
  const ev=entry.evidence||{state:'none'},box=elt('div');box.style.cssText='text-align:left;font-size:11px;margin:6px 0';
  const row=(label,value)=>{box.append(elt('span','frx-label',label),elt('div','frx-code',value));};
  row('Source ROM SHA-256',entry.sourceSha256||'Not declared by the pack');
  const P=window.Forge.services.LibraryProvenance,d=P?await P.resolve({entryId:id}):null;if(stale())return;
  if(d?.primary){
   row('Evidence',ev.state==='decoded'?d.basis+(ev.total?' · '+ev.total+' recorded locations'+(ev.code?.length?', '+ev.code.length+' in code':''):''):ev.state==='observed'?(ev.basis||'observed at runtime'):'stated by the pack, not re-read from the ROM');
   row('Location',d.primary.name||d.primary.role);for(const [k,v] of P.rows(d.primary,d.rom))row(k,v);
  }else row('ROM location','Unknown. The entry stays in the library; its location can be identified later.');
  if(d){
   row('Code',d.code.length?d.code.slice(0,6).map(l=>(l.name||l.role)+(l.owner&&l.owner!==d.label?' ('+l.owner+')':'')+': '+P.short(l)).join('\n')+(d.code.length>6?'\n… '+(d.code.length-6)+' more':'')+(d.code[0].basis&&d.code[0].basis!=='decoded with this record'?'\nBasis: '+d.code[0].basis:''):'No verified code relationship is recorded for this resource.');
   for(const l of d.links){const b=elt('button','frx-relationship',(l.relation==='same-resource'?'Same resource: ':'Uses: ')+l.label+' ('+({'rom-catalog':'recovered catalog','runtime-capture':'runtime capture'}[l.origin]||'extraction pack')+')');b.type='button';b.title=l.basis;b.onclick=()=>choose(key('lib',l.id));box.append(elt('span','frx-label','Linked record'),b,elt('div','frx-code','Basis: '+l.basis));}
   if(d.primary||d.code.length){const b=elt('button','frx-relationship','Inspect in CODE/RE');b.type='button';b.dataset.lpv='inspect';b.onclick=()=>{close();P.inspect({entryId:id});};box.append(b);}
  }
  row('Kind',entry.kind+(entry.identified===false?' (not identified by the intake)':'')+' · '+entry.fileType+' · '+entry.size+' bytes');
  row('Intake validation',entry.validation?.state+(entry.validation?.reason?': '+entry.validation.reason:''));
  row('Data',entry.data?.state+' · content '+String(entry.contentHash).slice(0,16)+'…');
  row('Pack',entry.packSha256.slice(0,16)+'… · '+entry.path);
  if(entry.project)row('Project inside the pack',JSON.stringify(entry.project));
  host.append(box);
  if(entry.kind==='frame'){await renderFrameDetails(entry,host);if(stale())return;}
  // data on demand
  if(entry.data?.state==='stored'&&entry.fileType!=='image'){
   const show=elt('button','frx-relationship','Show data');show.type='button';show.onclick=async()=>{show.disabled=true;
    const r=await C.run('library.read',{id,as:'base64'});if(!r.ok){show.textContent=r.error.message;return;}
    const bytes=Uint8Array.from(atob(r.result.base64),c=>c.charCodeAt(0)),pre=elt('pre','frx-code');pre.style.cssText='max-height:260px;overflow:auto;text-align:left;white-space:pre-wrap';
    if(['json','text','document'].includes(entry.fileType)){const text=new TextDecoder().decode(bytes);pre.textContent=text.length>65536?text.slice(0,65536)+'\n… '+(text.length-65536)+' more characters':text;}else pre.textContent=hexDump(bytes);
    show.replaceWith(pre);};host.append(show);
  }
  // the developer's notes: separate from evidence
  const form=elt('div');form.style.cssText='text-align:left;border-top:1px solid #2c4458;margin-top:8px;padding-top:6px;font-size:11px';
  form.append(elt('span','frx-label','Your notes (not evidence)'));
  const field=(label,value,multi)=>{const w=elt('label');w.style.cssText='display:block;margin:3px 0';w.append(elt('span',null,label+' '));const i=elt(multi?'textarea':'input');i.value=value||'';i.style.cssText='width:100%;box-sizing:border-box;background:#0d1a26;color:#d7eaf4;border:1px solid #385b70';if(multi)i.rows=3;w.append(i);form.append(w);return i;};
  const fName=field('Name',notes.name),fCat=field('Category',notes.category),fTags=field('Tags (comma separated)',(notes.tags||[]).join(', ')),fGroup=field('Group',notes.group),fText=field('Notes',notes.text,true);
  const place=(notes.possiblePlacements||[])[0]||{},fStage=field('Possible stage / scene (your guess)',place.stage),fConf=elt('select');for(const c of ['low','medium','high']){const o=elt('option',null,'Confidence: '+c);o.value=c;fConf.append(o);}fConf.value=place.confidence||'low';form.append(fConf);
  const save=elt('button','frx-relationship','Save notes'),said=elt('span',null,'');save.type='button';
  save.onclick=async()=>{const r=await C.run('library.annotate',{id,notes:{name:fName.value,category:fCat.value,tags:fTags.value.split(',').map(t=>t.trim()).filter(Boolean),group:fGroup.value,text:fText.value,
    possiblePlacements:fStage.value.trim()?[{stage:fStage.value.trim(),confidence:fConf.value,note:''}]:[]}});said.textContent=r.ok?' Saved.':' '+r.error.message;if(r.ok){n.name=fName.value||n.name;}};
  form.append(save,said);tools.append(form);
 })().catch(err=>{host.replaceChildren(elt('div','frx-preview-message',err.message));});
}
function renderSourceViewer(n,host,tools,caption){
 const service=window.Forge.services.InvestigatedLibrary,item=n.sourceResource;
 let view=sourceViews.get(n.key);if(!view){if(sourceViews.size>=256)sourceViews.delete(sourceViews.keys().next().value);view={page:0,frame:0,contextSceneId:item.request.contextSceneId};sourceViews.set(n.key,view);}
 caption.textContent='Retained ROM library · preview does not import or modify assets.';
 const field=(label,values,current,change)=>{const box=elt('label','frx-viewer-key',label+' '),select=elt('select','frx-filter');select.setAttribute('aria-label',label);for(const v of values){const o=elt('option',null,v.name);o.value=String(v.id);select.append(o);}select.value=String(current);select.onchange=()=>{change(select.value);render();};box.append(select);tools.append(box);return select;};
 if(['pose','animation'].includes(item.kind))field('Source graphics context',graph.library.contexts,view.contextSceneId,id=>{view.contextSceneId=id;view.frame=0;});
 try{
  const value=service.preview(item.request,view);
  if(value.kind==='scene'){
   if(value.pages.length>1)field('Source page',value.pages.map(p=>({id:p.page,name:p.name})),view.page,id=>view.page=Number(id));
   const c=newCanvas(256,240,'min(400px, 100%)'),g=c.getContext('2d'),image=g.createImageData(256,240);image.data.set(window.forgeCapture.scenePixels(value.scene,true).rgba);g.putImageData(image,0,0);c.setAttribute('aria-label',item.name+' source page '+view.page);host.append(c);
   host.append(elt('div','frx-viewer-legend','Recovered initial background placement and colors. Native gameplay, scrolling and collision behavior remain separately scoped.'));
  }else if(value.kind==='pose'){
   const frames=value.animation?.frames,poses=value.poses,frame=frames?poses.find(p=>p.id===frames[Math.min(view.frame,frames.length-1)]?.metaspriteId):poses[0];
   if(frames)field('Script frame',frames.map((f,i)=>({id:i,name:'Frame '+(i+1)+' · '+f.duration+' native update ticks'})),view.frame,id=>view.frame=Number(id));
   if(frame)host.append(poseCanvas(frame,value.scene));
   host.append(elt('div','frx-viewer-legend',frames?frames.length+' native script frames. Update cadence and gameplay state transitions are not inferred.':'Source display pose · selected room’s sprite graphics/palettes · animation timing is not inferred.'));
  }else if(value.kind==='chr'){
   const c=newCanvas(128,128,'256px'),g=c.getContext('2d'),colors=['#101820','#526477','#9badbf','#edf6ff'];for(let t=0;t<256;t++)for(let y=0;y<8;y++)for(let x=0;x<8;x++){const bit=7-x,v=((value.bytes[t*16+y]>>bit)&1)|(((value.bytes[t*16+y+8]>>bit)&1)<<1);g.fillStyle=colors[v];g.fillRect(t%16*8+x,(t>>4)*8+y,1,1);}host.append(c,elt('div','frx-viewer-legend','Physical tile order. These grayscale colors are for inspection.'));
  }else{
   if(value.reason)host.append(elt('div','frx-preview-message',value.reason));
   const pre=elt('pre','frx-code',JSON.stringify(value.record,null,2));pre.style.cssText='max-height:155px;max-width:100%;overflow:auto;white-space:pre-wrap;text-align:left';host.style.alignItems='stretch';host.append(pre);
  }
  $('context-result').textContent=contextNote||(item.reason?'Unrecovered source slot.':item.kind==='actor-record'?'Read-only native table record. No Gameplay Actor or enemy animation was fabricated.':'Source browsing is read-only. Use the explicit editor action to create or open a working copy.');
 }catch(error){host.append(elt('div','frx-preview-message','Source preview unavailable: '+error.message));$('context-result').textContent=error.message;}
}
function openContextEditor(sceneId,kind,bank){try{const service=window.Forge?.services?.SceneContext;if(!service?.selectScene)throw Error('SceneContext unavailable');service.selectScene(sceneId);if(kind==='chr'&&bank){S.chrBank=bank;rebuildAllUI();}switchTab(kind);close();}catch(e){contextNote='Editor navigation refused: '+e.message;render();}}
function openContextWorld(worldId){const w=S.worlds.find(x=>x.id===worldId);if(!w)return;try{const native=S.nativeGame?.resources?.find(r=>r.worldId===worldId&&r.mapId);if(native&&window.Forge?.services?.NativeWorldUI?.choose)window.Forge.services.NativeWorldUI.choose(native.mapId);else{window.Forge.services.SceneContext.selectWorld(worldId);switchTab('world');}close();}catch(e){contextNote='World navigation refused: '+e.message;render();}}
function unavailable(message){
 graph=liveGraph();active=null;contextNote=message;render();
}
async function navigate(){
 if(mode==='live'){const n=nodeByKey(active);if(n?.open?.kind==='library-entry'){openLibraryEntry(n.open.entryId);return;}}
 if(mode==='library'){const n=nodeByKey(active);
  if(n?.open?.kind==='library-pose'){const stage=$('stage').value,e=n.libraryEntry;const u=await window.Forge.commands.run('library.usePose',{id:e.id,mode:'reference',...(stage&&e.stages?.some(s=>s.stage===stage)?{stage}:{})});
   if(!u.ok){contextNote=u.error.message;render();return;}showPlaced(u.result,'Referenced “'+n.name+'” into this scene ('+u.result.dependencies.tilesAdded+' tiles).');return;}
  if(!n?.libraryEntry?.loads)return;
  if(window.Forge15?.dirty&&!confirm('Open this project from the library? Save your current project first to keep its changes.'))return;
  const r=await window.Forge.commands.run('library.openProject',{id:n.libraryEntry.id});if(!r.ok){contextNote=r.error.message;render();return;}close();return;}
 if(mode!=='live')return;const n=nodeByKey(active);
 if(n?.apuAuditDigest){
  try{
   const evidence=window.Forge.services.RecoveryAPUSourceCatalog.info(n.apuAuditDigest);
   if(!evidence)throw Error('No matching ROM-backed source record');
   const url=URL.createObjectURL(new Blob([JSON.stringify(evidence,null,2)+'\n'],{type:'application/json'}));
   const a=document.createElement('a');a.href=url;a.download='Forge_APU_Source_'+n.apuAuditDigest.slice(0,12)+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
   $('action-note').textContent='Exported observed APU instruction sites; original ROM bytes and decoded music are not included.';
  }catch(e){$('action-note').textContent='APU evidence export failed: '+e.message;}
  return;
 }
 if(n?.evidenceKind){
  try{
   const evidence=await window.Forge.services.RecoveryEvidenceCatalog.get(n.evidenceDigest,n.evidenceKind);
   const text=JSON.stringify(evidence,null,2)+'\n';
   const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));
   const a=document.createElement('a');a.href=url;a.download='Forge_Recovery_'+n.evidenceDigest.slice(0,12)+'_'+n.evidenceKind+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
   $('action-note').textContent='Exported read-only source evidence. Original ROM bytes are not in this record.';
  }catch(e){$('action-note').textContent='Evidence export failed: '+e.message;}
  return;
 }
if(!n?.open)return;try{const action=n.open,services=window.Forge?.services||{};
 if(action.kind==='rom-library'){services.InvestigatedLibrary.edit(action.resource,sourceViews.get(n.key)||{});close();return;}
 if(action.kind==='rom-inspect'){
  if(S.investigation?.source.sha256!==action.resource.sourceSha256)throw Error('The source changed. Reopen Resources.');
  await services.InvestigationUI.open(action.resource.kind==='map'?'library':'graphics');
  if(action.resource.kind==='map'){services.AreaLibrary.close(false);services.SpatialREUI.openMap(action.resource.id);}
  close();return;
 }
 if(action.sceneId){const idx=S.scenes.findIndex(s=>s.id===action.sceneId);if(idx<0)return unavailable('The Scene for this resource is no longer available. Select another resource.');
 if(action.kind==='meta'&&!window.Forge16.metatiles.byId(S.scenes[idx],action.metatileId))
  return unavailable('This metatile no longer exists in its Scene. Select another resource.');
 if(services.SceneContext?.selectScene)services.SceneContext.selectScene(action.sceneId);else switchScene(idx);}
 switch(action.kind){case 'cv-courtyard':case 'cv-upload':services.CastlevaniaGraphicsProject.edit(action,Number($('upload-table')?.value));break;case 'source':if(S.investigation?.source.sha256!==action.sourceSha256)throw Error('Source changed. Reopen Resources.');await services.InvestigationUI.open('code');break;case 'native-art':if(S.nativeGame?.sourceSha256!==action.sourceSha256)throw Error('Source changed. Reopen Resources.');services.PunchOutArtUI.open(action.nativeKind,action.index);break;case 'scene':switchTab('scene');break;case 'tile':if(Number.isInteger(action.tileId)){S.editTile=action.tileId;S.selTile=action.tileId;}
 case 'chr':switchTab('chr');if((action.bank==='spr'||n.id.startsWith('spr:'))&&S.chrBank!=='spr'){S.chrBank='spr';rebuildAllUI();}else if((action.bank==='bg'||n.id.startsWith('bg:'))&&S.chrBank==='spr'){S.chrBank='bg';rebuildAllUI();}break;case 'sprites':switchTab('sprites');break;case 'collision':switchTab('collision');break;case 'meta':
  switchTab('meta');
  window.Forge16.metatiles.select(action.metatileId);
  break;case 'world':{const i=S.worlds.findIndex(w=>w.id===action.worldId);if(i<0)throw Error('World no longer exists.');const native=S.nativeGame?.resources?.find(r=>r.worldId===action.worldId&&r.mapId);if(native&&services.NativeWorldUI?.choose){services.NativeWorldUI.choose(native.mapId);break;}services.SceneContext?.selectWorld?.(action.worldId);Forge161.worlds.select(i);switchTab('world');break;}
 case 'pose':{const pose=action.poseId;if(!S.metasprites.some(p=>p.id===pose))throw Error('Metasprite no longer exists.');window.Forge163?.metasprites?.select?.(pose);switchTab('metasprites');break;}case 'animation':{const i=S.animations.findIndex(a=>a.id===action.animationId);if(i<0)throw Error('Animation no longer exists.');S._selAnim=i;S._animFrame=0;switchTab('anim');window.anim_updateSidebar?.();break;}case 'entity':{switchTab('scene');services.SceneContext?.openAsset?.('actors');window.Forge164?.studio?.open?.(action.sceneId,action.entityId);break;}case 'actor':case 'instance':case 'behavior':{switchTab('scene');const panel=document.getElementById('gcPanel190');if(panel)panel.open=true;if(action.kind==='actor')services.GameplayUI.state.selectedDefinition=action.actorId;else if(action.kind==='instance')services.GameplayUI.state.selectedInstance=action.instanceId;else if(action.kind==='behavior')services.GameplayUI.state.selectedBehavior=action.behaviorId;services.GameplayUI?.refresh?.(true);break;}case 'native-cues':{
  if(services.SourceContext.project()?.sha256!==action.sourceSha256||!await services.NativeAudioLibraryUI.useProjectSource())throw Error('Reopen the matching project source.');
  if(action.cueId!==undefined){const catalog=services.NativeAudioLibraryUI.catalog();services.NativeAudioLibraryUI.selectCue(action.cueId,{sourceSha256:action.sourceSha256,profile:catalog.profile.id});}
  services.NativeAudioLibraryUI.open(true);switchTab('audio');break;
 }case 'audio':switchTab('audio');break;default:throw Error('No registered editor for this resource.');}
 close();}catch(e){contextNote='Could not navigate: '+e.message;render();$('action-note').textContent=contextNote;}}
// after a library sprite is used: back to the scene, scroll to where it was placed and outline it for a moment
function showPlaced(result,msg){
 close();try{switchTab('scene');}catch(_){}
 const t=document.getElementById('toast');if(t){t.textContent=msg;t.classList.add('show');clearTimeout(t._tm);t._tm=setTimeout(()=>t.classList.remove('show'),6000);}else window.showToast?.(msg);
 const box=result?.placed?.box;if(!box)return;
 document.getElementById('frx-placed')?.remove();const m=document.createElement('div');m.id='frx-placed';m.setAttribute('aria-hidden','true');
 m.style.cssText='position:fixed;pointer-events:none;z-index:50;border:2px solid #ffd84a;box-shadow:0 0 0 2px #000,0 0 14px #ffd84a;border-radius:2px;transition:opacity .6s';
 document.body.append(m);
 // the outline follows the scene canvas while it scrolls and disappears as soon as the scene is left
 const until=performance.now()+3500;let scrolled=false;
 const place=()=>{const cv=document.getElementById('cv');if(!m.isConnected)return;
  if(!cv||(typeof S!=='undefined'&&S.tab!=='scene')||cv.style.display==='none'||root.classList.contains('frx-visible')){m.remove();return;}
  const r=cv.getBoundingClientRect(),k=r.width/256;if(!k){m.remove();return;}
  Object.assign(m.style,{left:(r.left+(box.x-2)*k)+'px',top:(r.top+(box.y-2)*k)+'px',width:((box.w+4)*k)+'px',height:((box.h+4)*k)+'px'});
  if(!scrolled){scrolled=true;const mid=r.top+(box.y+box.h/2)*k;if(mid<0||mid>innerHeight)window.scrollBy({top:mid-innerHeight/2});}
  if(performance.now()<until)requestAnimationFrame(place);else{m.style.opacity='0';setTimeout(()=>m.remove(),700);}};
 requestAnimationFrame(place);
}
// Resources › Library with one entry selected (its filters cleared so it is listed)
let pendingSelect=null;
function openLibraryEntry(entryId){
 if(!root.classList.contains('frx-visible')){lastFocus=document.activeElement;root.classList.add('frx-visible');document.body.style.overflow='hidden';}
 $('search').value='';$('kind').value='';$('stage').value='';pendingSelect=key('lib',entryId);setMode('library');
}
function close(){root.classList.remove('frx-visible');document.body.style.overflow='';lastFocus?.focus?.();}
function open(resourceKey){
 const exact=typeof resourceKey==='string';
 const selected=exact?resourceKey:window.Forge.services.ResourceContext.selection().key;
 lastFocus=document.activeElement;root.classList.add('frx-visible');document.body.style.overflow='hidden';
 setMode('live');
 if(graph.nodes.has(selected))choose(selected);
 else if(exact){active=null;render();}
 if(!exact&&graph.nodes.size<9)setMode('demo');
 $('close').focus();
}
button.addEventListener('click',open);$('close').onclick=close;$('follow').onchange=()=>setFollow($('follow').checked);$('live').onclick=()=>setMode('live');$('demo').onclick=()=>setMode('demo');$('lib').onclick=()=>setMode('library');$('refresh').onclick=()=>{if(mode==='live')setMode('live');else setMode('demo');};$('active').onclick=()=>{if(mode!=='live')setMode('live');active=key('scene',S.scenes[S.activeScene]?.id);render();};$('open-editor').onclick=navigate;$('search').oninput=render;$('kind').onchange=render;$('stage').onchange=render;$('scope').onchange=render;
root.addEventListener('mousedown',e=>{if(e.target===root)close();});root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}else if(e.key==='Tab'){const focusable=[...root.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled])')].filter(n=>n.offsetParent!==null);if(focusable.length){const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}e.stopPropagation();});
// Legacy document keyboard handling uses capture listeners. Keep Escape a real
// close control even when another app editor has installed global key handlers.
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&root.classList.contains('frx-visible')){event.preventDefault();event.stopImmediatePropagation();close();}},true);
// Expose inspection only for synthetic browser smoke tests; never a mutation API.
window.Forge.services.ResourceRelationshipPreview=Object.freeze({open,openLibraryEntry,openAt:resourceKey=>open(String(resourceKey)),close,refresh:()=>{graph=mode==='live'?liveGraph():sampleGraph();render();},summary:()=>({mode,follow,nodes:graph?.nodes.size||0,edges:graph?.edges.length||0,issues:graph?.issues.length||0,selected:active,contextNote}),liveGraph});
})();

