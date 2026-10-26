/* NES Forge Connected Workspace v0.3 — context and supported editing routes.
 * Read-only context, health previews, workflow shortcuts & staged file inspection.
 * NO project write, schema mutation, native encoder changes or automatic imports.
 */
(()=>{
'use strict';
const svc=window.Forge?.services||{};
const esc=s=>String(s??'');
const $=id=>document.getElementById('fcw-'+id);
const el=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e;};
const css=document.createElement('style');css.id='fcw-styles';css.textContent=`
#fcw-ribbon{display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding:7px 11px;background:#101e29;color:#cce1ec;border-bottom:1px solid #345067;font:12px/1.35 system-ui,sans-serif;position:relative;z-index:5}
#fcw-ribbon strong{color:#f4fcff}#fcw-ribbon .fcw-label{color:#98acbc;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.7px}#fcw-ribbon .fcw-status{font-size:11px;padding:4px 8px;background:#1a3446;border-radius:5px;color:#bce9fb}#fcw-ribbon .fcw-status[data-kind=native]{background:#173e37;color:#a8f1d6}#fcw-ribbon .fcw-status[data-kind=inspection]{background:#44331e;color:#f9d89e}#fcw-ribbon .fcw-spacer{flex:1}
#fcw-ribbon button{background:#1a3949;border:1px solid #47738b;color:#d8f5ff;padding:7px 10px;border-radius:5px;cursor:pointer;font:600 11px system-ui;min-height:33px}#fcw-ribbon button:hover{background:#26546c}#fcw-ribbon button:focus-visible{outline:2px solid #95e8ff}
#fcw-overlay{display:none;position:fixed;inset:0;z-index:1770;background:rgba(1,6,13,.83);font:13px/1.55 system-ui,sans-serif;color:#dce8f5;padding:16px}
#fcw-overlay.show{display:flex;align-items:center;justify-content:center}#fcw-overlay *{box-sizing:border-box}
#fcw-dialog{display:flex;flex-direction:column;min-height:350px;width:min(1100px,100%);max-height:95vh;overflow:hidden;border:1px solid #385773;border-radius:12px;background:#0b1726;box-shadow:0 30px 100px rgba(0,0,0,.65)}
.fcw-header{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:15px 19px;border-bottom:1px solid #253f57;background:#102336}.fcw-header h2{font-size:19px;line-height:1.2;margin:0;color:#f0faff}.fcw-subtitle{color:#a2b8cb;font-size:11px}.fcw-flex{flex:1}
#fcw-dialog button{font:600 12px system-ui,sans-serif;color:#d2edf6;background:#19394e;border:1px solid #406782;border-radius:6px;padding:8px 11px;cursor:pointer;min-height:35px}#fcw-dialog button:hover{background:#24536d}#fcw-dialog button:focus-visible{outline:2px solid #90e5f9;outline-offset:2px}#fcw-dialog button[disabled]{cursor:not-allowed;opacity:.5}
.fcw-tabs{display:flex;gap:5px;overflow-x:auto;padding:8px 15px;background:#0e2032;border-bottom:1px solid #27425a;flex-shrink:0}.fcw-tabs button{white-space:nowrap;background:#12253b!important}.fcw-tabs button[aria-selected=true]{background:#275a72!important;border-color:#64bcd6!important}
.fcw-scroll{overflow:auto;flex:1;padding:18px;min-height:0}.fcw-panel{display:none}.fcw-panel.show{display:block}.fcw-panel h3{font-size:16px;color:#f3f9ff;margin:0 0 7px}.fcw-panel p{margin:5px 0 13px;color:#adc1d0}.fcw-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:12px 0}.fcw-card{border:1px solid #29465c;background:#101f31;border-radius:9px;padding:15px;min-width:0}.fcw-card h4{font-size:13px;color:#ecf8ff;margin:0 0 7px}.fcw-card p{font-size:12px}.fcw-card button{margin:4px 5px 0 0}.fcw-k{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#7dcedd;font-weight:800}.fcw-muted{color:#91a7ba;font-size:11px}.fcw-step{padding:11px 13px;border-left:3px solid #28758e;background:#13273b;margin:7px 0;border-radius:0 6px 6px 0}.fcw-step strong{color:#e2f4ff}.fcw-step button{margin:6px 0 0}.fcw-indicator{display:inline-block;padding:2px 8px;border-radius:20px;background:#1c3c4a;color:#a8e2ef;font-size:10px}.fcw-indicator.warn{background:#49341c;color:#f7d399}.fcw-indicator.bad{background:#502527;color:#ffc5c7}.fcw-indicator.good{background:#214334;color:#b7f7ce}.fcw-row{display:flex;align-items:center;justify-content:space-between;gap:10px;border-bottom:1px solid #254054;padding:11px 3px;flex-wrap:wrap}.fcw-row>span:first-child{max-width:75%}.fcw-foot{border-top:1px solid #294158;padding:8px 18px;font-size:11px;color:#9ab0c3}.fcw-radio{display:flex;gap:8px;align-items:center}.fcw-radio input{accent-color:#63aabf}.fcw-file{display:block;border:1px dashed #6a94a5;border-radius:9px;padding:25px;text-align:center;background:#112a3b;cursor:pointer}.fcw-file input{display:none}.fcw-file strong{display:block;font-size:14px}.fcw-file small{color:#aac0d1}.fcw-code{font-family:ui-monospace,monospace;word-break:break-all;color:#d5e9f8}#fcw-report{white-space:pre-wrap;font-size:12px;line-height:1.5;border:1px solid #34475b;padding:13px;background:#081321;border-radius:5px;max-height:250px;overflow:auto}
@media(max-width:720px){#fcw-ribbon{padding:6px;gap:5px}#fcw-ribbon button{padding:6px;font-size:10px}#fcw-ribbon .fcw-label{display:none}#fcw-overlay{padding:5px}#fcw-dialog{height:97vh;max-height:97vh}.fcw-header{padding:12px}.fcw-header h2{font-size:16px}.fcw-scroll{padding:11px}.fcw-grid{grid-template-columns:1fr}.fcw-tabs{padding:7px}#fcw-ribbon .fcw-spacer{flex-basis:30px}}
`;document.head.appendChild(css);
const ribbon=el('div');ribbon.id='fcw-ribbon';ribbon.innerHTML='<span class="fcw-label">Working context</span><strong id="fcw-project">Untitled</strong><span id="fcw-status" class="fcw-status"></span><span id="fcw-location" class="fcw-muted"></span><span class="fcw-spacer"></span><button type="button" id="fcw-z2">Native World</button><button type="button" id="fcw-relations">▣ Resources</button><button type="button" id="fcw-open">Connected Workspace</button>';
const originalTop=document.querySelector('.top');originalTop?.parentNode.insertBefore(ribbon,originalTop.nextSibling);
const overlay=el('div');overlay.id='fcw-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','NES Forge Connected Workspace');overlay.innerHTML=`<div id="fcw-dialog"><header class="fcw-header"><div><div class="fcw-k">NES Forge / Integration preview</div><h2>Connected Workspace</h2><div class="fcw-subtitle">Your project, its assets, supported operations and the next editing step</div></div><span class="fcw-flex"></span><button id="fcw-close" type="button">✕ Close</button></header><nav class="fcw-tabs" role="tablist"><button type="button" data-fcw-tab="overview" aria-selected="true">Overview</button><button type="button" data-fcw-tab="create" aria-selected="false">Create a Game</button><button type="button" data-fcw-tab="native" aria-selected="false">Native tools</button><button type="button" data-fcw-tab="health" aria-selected="false">Project Health</button><button type="button" data-fcw-tab="import" aria-selected="false">Import Preview</button></nav><div class="fcw-scroll"><section class="fcw-panel show" id="fcw-panel-overview"></section><section class="fcw-panel" id="fcw-panel-create"></section><section class="fcw-panel" id="fcw-panel-native"></section><section class="fcw-panel" id="fcw-panel-health"></section><section class="fcw-panel" id="fcw-panel-import"></section></div><footer class="fcw-foot" id="fcw-footer">Save Project As preserves your work · Preflight Build checks current output eligibility</footer></div>`;
document.body.appendChild(overlay);
let view='overview',lastFocus=null,staged=[],lastIdentity='',buildReport=null;
function button(label,handler,cls=''){const b=el('button',cls,label);b.type='button';b.addEventListener('click',()=>{try{Promise.resolve(handler()).catch(e=>{$('footer').textContent='Action unavailable: '+e.message;});}catch(e){$('footer').textContent='Action unavailable: '+e.message;}});return b;}
function line(title,detail,indicator,kind){const r=el('div','fcw-row'),left=el('span');left.append(el('strong',null,title),el('div','fcw-muted',detail));r.append(left,el('span','fcw-indicator '+(kind||''),indicator));return r;}
function card(title,desc){const c=el('div','fcw-card');c.append(el('h4',null,title),el('p',null,desc));return c;}
function current(){const nat=S.nativeGame,profile=nat?.profile||null,res=Array.isArray(nat?.resources)?nat.resources:[],capabilities=svc.ProjectCapabilities.describe(S);
 const nativeWorld=capabilities.nativeWorld;const selectedWorld=S.worlds?.[Forge161?.worlds?.state?.selected||0];
 const linked=res.find(b=>b.worldId===selectedWorld?.id&&b.mapId);
 return {mode:capabilities.label,capabilities,nativeWorld,nat,res,linked,selectedWorld,profile,scene:S.scenes?.[S.activeScene],project:S.projectName||'Untitled'};}
function refreshRibbon(){const c=current();$('project').textContent=c.project;$('status').textContent=c.mode;$('status').dataset.kind=c.capabilities.kind;const focus=S.tab==='chr'?'CHR tile '+S.editTile:S.tab==='anim'?'Animation '+(S.animations?.[S._selAnim]?.name||'none'):S.tab==='world'?'World '+(c.selectedWorld?.name||'none'):S.tab==='audio'?'Project Audio':S.tab==='code'?'6502 source':S.tab.toUpperCase();$('location').textContent=focus+' · Scene: '+(c.scene?.name||'none');$('z2').textContent=c.nativeWorld?'Edit native World':'Native tools';$('z2').title=c.nativeWorld?'Open this project’s native terrain editor.':c.nat?'See supported native writers and preserved-source limits for this project.':'Explore native project workflows.';window.Forge15?.build?.refreshScope?.();}
function gotoTab(tab){close();if(typeof window.switchTab!=='function')throw Error('The existing editor is unavailable');window.switchTab(tab);refreshRibbon();}
function openZ2(){const c=current();close();if(c.nativeWorld){const worldId=S.worlds?.[Forge161.worlds.state.selected]?.id,sceneId=S.scenes?.[S.activeScene]?.id;const bindings=S.nativeGame?.resources?.filter(r=>r.mapId)||[];const binding=bindings.find(r=>r.worldId===worldId)||bindings.find(r=>r.sceneId===sceneId)||(bindings.length===1?bindings[0]:null);if(!binding)throw Error('Several native World maps exist. Select the intended World or resource first; no map has been changed.');svc.NativeWorldUI.choose(binding.mapId);refreshRibbon();return;}
 const b=document.getElementById('nativeWorldOpen');if(!b)throw Error('Native World importer unavailable in this build.');b.click();}
function browseZ2(mapId){close();svc.NativeWorldUI.choose(mapId);refreshRibbon();}
// Resolve the actual editor selection before opening a related context. A pose
// may deliberately use a different Scene than the independently selected Scene.
function activeKey(){return svc.ResourceContext.selection().key;}

function openRelationships(){close();if(svc.ResourceRelationshipPreview?.openAt)svc.ResourceRelationshipPreview.openAt(activeKey());else document.getElementById('frx-open')?.click();}
// Routes open the existing writer or its explicit resource picker. Merely reading
// capabilities never materializes a Scene or silently picks a physical bank.
function openWriter(route){
 const c=current();if(!c.capabilities.writers.some(w=>w.route===route))throw Error('This project has no registered writer for that action.');
 if(route==='native-world')return openZ2();
 close();
 if(route==='library'||route==='project-library'){svc.AreaLibrary.show();svc.AreaLibrary.selectScope(route==='library'?'source':'project');return;}
 if(route==='native-locations')return svc.AreaLibrary.openNativeEditor();
 if(route==='punch-out-arena')return svc.PunchOutArenaUI.open();
 if(route==='punch-out-pose'||route==='punch-out-art'){
  if(!svc.PunchOutContentUI.open())throw Error('Open the current recovered source again before choosing a native resource.');
  window.switchTab('disasm');
  const panel=document.getElementById(route==='punch-out-pose'?'punchOutPosePanel':'punchOutArtPanel');
  panel.open=true;panel.scrollIntoView?.({block:'start'});
  document.getElementById(route==='punch-out-pose'?'punchOutPoseChoice':'punchOutArtBank').focus();return;
 }
 throw Error('The native writer editor is unavailable.');
}
function writerCards(host,c){for(const writer of c.capabilities.writers){const box=card(writer.title,writer.scope);const b=button('Open '+writer.title+' ↗',()=>openWriter(writer.route));b.dataset.fcwWriter=writer.id;box.appendChild(b);host.appendChild(box);}}
function buildOverview(){const c=current(),host=$('panel-overview');host.replaceChildren(el('h3',null,'What am I working on?'),el('p',null,'Choose a resource, understand its owner and consumers, then open the exact editor. The active project stays untouched until you use the original authoring tools.'));
 const grid=el('div','fcw-grid');const project=card('Current project',c.project);project.append(el('div','fcw-muted','Mode: '+c.mode),el('div','fcw-muted','Current Scene: '+(c.scene?.name||'none')),el('div','fcw-muted','Current World: '+(c.selectedWorld?.name||'none')));grid.appendChild(project);
 const graph=svc.ResourceRelationshipPreview.liveGraph(),links=card('Declared resources and links',graph.nodes.size+' resources · '+graph.edges.length+' explicit relationships · '+graph.issues.length+' diagnostic notes.');links.appendChild(button('Inspect relationships ↗',openRelationships));grid.appendChild(links);host.append(grid);
 if(c.nat){host.appendChild(card('Current output scope',c.capabilities.scope));writerCards(host,c);
  if(c.capabilities.preservationOnly)host.append(line('Preserved source','This project can output its unchanged source. Editable copies can be saved or exported separately; no native asset writer is registered.','Unchanged output','warn'));
 }else{const tools=card('Your next action','These editors author the current NES Forge project.');for(const [name,fn] of [['Draw CHR pixels',()=>gotoTab('chr')],['Edit Scene layout',()=>gotoTab('scene')],['Edit Gameplay',()=>{close();svc.SceneContext.openAsset('gameplay');}],['Compose Audio',()=>gotoTab('audio')]])tools.appendChild(button(name,fn));host.appendChild(tools);}
}
function buildCreate(){const host=$('panel-create');host.replaceChildren(el('h3',null,'Build an original NES game from scratch'),el('p',null,'These actions take you into the working NES Forge editors. This guide does not overwrite an existing project or auto-create placeholder assets. Use the existing New Project command when you want a clean slate.'));
 if(current().nat){host.appendChild(card('A separate authored project','The current project preserves an original game engine. Save it first, then use New Project to begin an original NES Forge game. Use Native tools for the supported edits in the current project.'));host.appendChild(button('View current native tools',()=>tab('native')));return;}
 const steps=[
  ['1. Project','Start a new project using NES Forge’s existing New Project command, or continue with your active project.',null],
  ['2. Draw CHR graphics','Edit pixel tiles in the CHR editor. Background and sprite graphics share the Scene’s canonical tile ownership.','chr'],
  ['3. Palettes and sprites','Choose the NES color palettes and place sprites on a Scene.','sprites'],
  ['4. Metatiles','Compose reusable 16×16 tiles from 8×8 CHR graphics.','meta'],
  ['5. Scene and collision','Paint a room and assign collision properties.','scene'],
  ['6. World','Construct a world, connect rooms and choose its Scene tileset.','world'],
  ['7. Metasprites and animation','Create composed poses, then animate them using the timeline.','metasprites'],
  ['8. Gameplay','Connect actor definitions and instances with canonical behavior components.','gameplay'],
  ['9. Audio','Compose music, instruments, patterns and sound effects.','audio'],
  ['10. Optional 6502','Write or inspect native assembly and customize the build within existing assembler constraints.','code'],
  ['11. Test and export','Build & Run and use the integrated emulator. Save Project As keeps the authoring source.','emu']];
 for(const [name,info,target] of steps){const row=el('div','fcw-step');row.append(el('strong',null,name),el('div',null,info));if(target)row.appendChild(button('Open '+target.replace(/^./,s=>s.toUpperCase())+' editor ↗',()=>{if(target==='gameplay'){close();svc.SceneContext?.openAsset?.('gameplay');}else gotoTab(target);}));host.appendChild(row);}
 host.append(line('Tutorial coverage','Guided instructions use existing controls; no claim of a complete no-code demo project in this preview.','Prototype','warn'));
}
function buildNative(){const c=current(),host=$('panel-native');host.replaceChildren(el('h3',null,c.nat?c.capabilities.title+' — native tools':'Native project workflows'),el('p',null,c.nat?c.capabilities.scope:'Open a supported ROM through Open ROM / project to discover its preserved source, recovered resources and available native writers. Current authoring tools keep their existing generated build route.'));
 if(c.nat){host.append(line('Current project type',c.mode,c.capabilities.preservationOnly?'Unchanged source output':'Bounded native editing',c.capabilities.preservationOnly?'warn':'good'));writerCards(host,c);
  if(c.nativeWorld){const box=card('Choose a native region','Each region uses its existing terrain palette and compressed-map budget.');for(const r of window.ZeldaOverworld.resources)box.appendChild(button('Edit '+r.name+' ↗',()=>browseZ2(r.id)));host.appendChild(box);}
  host.append(line('Build acceptance','Available writers describe supported fields. Unsupported edits remain savable and can block native output; use Preflight Build for the current project.','Validation required','warn'));
 }else{const box=card('Choose a source','Open ROM / project prepares the title-specific workflow. The native World importer also supports recognized Zelda II revisions. The importer validates the source and handles replacement of unsaved work.');box.append(button('Open ROM / project',()=>{close();document.getElementById('projectGatewayOpen').click();}),button('Open native Zelda II World',openZ2));host.appendChild(box);}
 const compare=card('Editing owner and reference copies','Recovered reference Scenes can be inspected or saved as copies. Native output changes only through the declared writer and its owned fields. Physical banks and source records can have shared uses.');compare.appendChild(button('Inspect current relationships',openRelationships));host.appendChild(compare);
}
function buildHealth(){const c=current(),host=$('panel-health'),g=svc.ResourceRelationshipPreview.liveGraph();host.replaceChildren(el('h3',null,'Project Health — references and current ROM build'),el('p',null,'Reference integrity and compiler acceptance are separate checks. Check current ROM build runs the existing backend without downloading or starting the game.'));host.append(line('Canonical Scene assets',String(S.scenes?.length||0)+' Scene(s) in project',S.scenes?.length?'Present':'Missing',S.scenes?.length?'good':'bad'));
 host.append(line('Declared references',g.edges.length+' relationship(s); '+g.issues.length+' issue(s) detected',g.issues.length?'Review issues':'No detected issues',g.issues.length?'warn':'good'));
 host.append(line('Build backend',c.capabilities.scope,'Compiler check below','warn'));
 let currentReport=false;try{currentReport=!!buildReport?.fingerprint&&buildReport.fingerprint===svc.BuildGraph.identity();}catch(_){}
 const state=currentReport?(buildReport.ok?'Compiler passed':'Build refused'):buildReport?'Check again':'Not checked';
 host.append(line('Current ROM build',currentReport?(buildReport.ok?buildReport.bytes.toLocaleString()+' bytes compiled. Verify the visible result in the game.':'The actual backend refused this capture. Unsupported work remains savable.'):
   'Run a fresh check after editing. A prior result does not certify the current capture.',state,currentReport&&buildReport.ok?'good':'warn'));
 const check=button('Check current ROM build',()=>{buildReport=svc.BuildGraph.checkCurrent();buildHealth();});check.id='fcw-check-build';host.append(check);
 const report=el('div','fcw-card');report.id='fcw-build-report';report.setAttribute('role','status');
 if(currentReport)svc.BuildDiagnostics.render(report,buildReport.diagnostics);else report.textContent='No current compiler result. Reference counts do not prove build eligibility.';
 host.append(report);
 host.append(line('Audio associations','Tracker audio is project-wide. Event bindings require declared references; no triggers are invented.','Not inferred','warn'));
 host.append(line('Save and round trip','Save/reopen and target emulator verification require explicit tests for this project.','Not tested here','warn'));
 const issues=card('Asset registry and relationship diagnostics',g.issues.length?g.issues.slice(0,12).join('\n'):'No issues surfaced by the current relationship graph. This does not prove the project will build.');issues.style.whiteSpace='pre-wrap';host.appendChild(issues);host.append(button('Refresh current project checks',()=>buildHealth()));
}
function detect(file,head){const name=file.name.toLowerCase(),ext=name.split('.').pop(),pfx=Array.from(head.slice(0,8)).map(x=>x.toString(16).padStart(2,'0')).join(' ');let fmt='Unknown binary / file',notes='No canonical importer has been invoked.';
 if(head[0]===0x4e&&head[1]===0x45&&head[2]===0x53&&head[3]===0x1a){fmt='iNES ROM';notes='Inspect as ROM or use the native Zelda II entry point for supported revisions.';}
 else if(head[0]===0x50&&head[1]===0x4b){fmt='ZIP archive';notes='Could contain a project or resource pack; archive content has not been inspected.';}
 else if(ext==='asm'||ext==='s'||ext==='inc'){fmt='Assembly source';notes='Preserve dialect and includes. Automatic ca65/NESASM/NESmaker migration is not implemented.';}
 else if(['chr','bin','pal','nam','map','atr'].includes(ext)){fmt='Raw graphics/map/binary';notes='Bank, palette and addressing metadata are required for reliable interpretation.';}
 else if(['png','gif','bmp','ase','aseprite'].includes(ext)){fmt='Graphics source';notes='Image import support is format-dependent; palette and NES tile conversion must be previewed.';}
 else if(['mid','midi','musicxml','xml','ftm','fms','txt','nsf','nsfe'].includes(ext)){fmt='Music / source candidate';notes='Existing audio support varies by format. No source semantics inferred by extension.';}
 else if(['ips','bps'].includes(ext)){fmt='ROM patch candidate';notes='Patch application and verified source matching not performed by this preview.';}
 else if(['json','nfassets'].includes(ext)){fmt='JSON / resource project candidate';notes='Review project/schema identity before using the existing project loader.';}
 return {filename:file.name,bytes:file.size,fmt,notes,prefix:pfx};}
async function inspect(files){staged=[];for(const f of Array.from(files).slice(0,25)){const bytes=new Uint8Array(await f.slice(0,16).arrayBuffer());staged.push(detect(f,bytes));}showImport();}
function showImport(){const result=$('report');if(!result)return;result.textContent=staged.length?staged.map(s=>`${s.filename} (${s.bytes.toLocaleString()} bytes)\n  ${s.fmt} · ${s.prefix}\n  ${s.notes}`).join('\n\n'):'No files selected. Files are read only for signature inspection. No content is saved or imported.';}
function buildImport(){const host=$('panel-import');host.replaceChildren(el('h3',null,'Import compatibility preview'),el('p',null,'Drop in local files to preview their type, size and next available workflow. This preview does NOT load, execute, translate or modify any files. It is not yet the future universal importer.'));
 const label=el('label','fcw-file');label.append(el('strong',null,'Choose source files to inspect'),el('small',null,'ROM · ASM · CHR · palettes · audio · ZIP · patches'));const input=el('input');input.type='file';input.multiple=true;input.onchange=()=>inspect(input.files).catch(e=>{$('report').textContent=e.message;});label.appendChild(input);host.appendChild(label);
 const report=el('pre');report.id='fcw-report';host.appendChild(report);showImport();const paths=card('Available working import paths','Use the application’s existing proven actions. External tool-specific source projects and format conversions remain future integration work.');paths.append(button('Import ROM',()=>{close();document.getElementById('romIn')?.click();}),button('Open NES Forge Project',()=>{close();document.getElementById('projectIn')?.click();}),button('Open Editable Z2',openZ2));host.appendChild(paths);
}
function render(){refreshRibbon();buildOverview();buildCreate();buildNative();buildHealth();buildImport();for(const b of overlay.querySelectorAll('[data-fcw-tab]'))b.setAttribute('aria-selected',String(b.dataset.fcwTab===view));for(const p of overlay.querySelectorAll('.fcw-panel'))p.classList.toggle('show',p.id==='fcw-panel-'+view);}
function tab(id){view=id;render();}
function open(id='overview'){lastFocus=document.activeElement;view=id;render();overlay.classList.add('show');document.body.dataset.fcwOpen='true';$('close').focus();}
function close(){overlay.classList.remove('show');delete document.body.dataset.fcwOpen;lastFocus?.focus?.();}
$('z2').onclick=()=>{try{if(current().nativeWorld)openZ2();else open('native');}catch(e){open('native');$('footer').textContent=e.message;}};$('relations').onclick=openRelationships;$('open').onclick=()=>open();$('close').onclick=close;
for(const b of overlay.querySelectorAll('[data-fcw-tab]'))b.addEventListener('click',()=>tab(b.dataset.fcwTab));
overlay.addEventListener('mousedown',e=>{if(e.target===overlay)close();});overlay.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}else if(e.key==='Tab'){const vis=[...overlay.querySelectorAll('button:not([disabled]),input:not([disabled])')].filter(x=>x.offsetParent!==null);if(vis.length){const first=vis[0],last=vis[vis.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}e.stopPropagation();});
// Refresh context after user interactions, rather than installing a second project lifecycle or polling snapshots.
const updateOnInteraction=e=>{if(overlay.contains(e.target)||ribbon.contains(e.target)||document.getElementById('frx-root')?.contains(e.target))return;queueMicrotask(refreshRibbon);};
document.addEventListener('click',updateOnInteraction);document.addEventListener('change',updateOnInteraction);
// Observe the existing project name / scene selector after asynchronous project loads.
// This is UI-only; ProjectStore remains the sole owner of project transactions.
const watch=new MutationObserver(()=>queueMicrotask(refreshRibbon));
for(const id of ['projName','sceneSel']){const e=document.getElementById(id);if(e)watch.observe(e,{childList:true,subtree:true,characterData:true});}
refreshRibbon();
svc.ConnectedWorkspacePreview=Object.freeze({open,close,refresh:render,context:current,staged:()=>staged.map(x=>({...x})),openZ2});
})();


