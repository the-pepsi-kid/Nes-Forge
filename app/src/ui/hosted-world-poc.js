/* NES Forge 3.x localhost WORLD Live integration candidate.
 * Editor-only: reads selected canonical Z2 world; NEVER mutates S/ProjectStore/ROM.
 * Admin token is user-entered and memory-only; host requires loopback binding.
 */
(()=>{'use strict';
const API='http://127.0.0.1:8765', q=id=>document.getElementById(id), node=(name,text)=>{const el=document.createElement(name);if(text!==undefined)el.textContent=text;return el};
const style=node('style');style.id='nf-host-live-css';style.textContent=`
#nf-host-open{padding:5px 9px;background:#1e4b56;border:1px solid #4e918c;color:#c0f3e5;border-radius:4px;font:bold 10px monospace;cursor:pointer}
#nf-host-overlay{display:none;position:fixed;inset:0;z-index:2100;background:rgba(2,7,13,.87);padding:12px;font:12px/1.5 system-ui;color:#d7edf5}
#nf-host-overlay.open{display:grid;place-items:center}
#nf-host-dialog{width:min(1080px,100%);max-height:96vh;overflow:auto;border:1px solid #568b91;border-radius:8px;background:#101f2c;box-shadow:0 20px 70px #000a;padding:18px}
#nf-host-dialog h2{font-size:19px;margin:0;color:#99e9d1}#nf-host-dialog h3{font:700 13px monospace;color:#b8e8d7;margin:2px 0 8px}
.nfhost-head{display:flex;justify-content:space-between;gap:12px;align-items:center;border-bottom:1px solid #34566a;padding-bottom:12px;margin-bottom:10px}
.nfhost-actions{display:flex;gap:6px;flex-wrap:wrap;align-items:center}.nfhost-actions button,#nf-host-dialog button{font:bold 11px monospace;padding:8px 10px;color:#e8f5f8;border:1px solid #4a8190;background:#1b4155;border-radius:4px;cursor:pointer}
#nf-host-dialog button:hover{background:#29637d}#nf-host-dialog input{font:12px monospace;background:#091824;color:#eaf4ff;border:1px solid #4a8190;border-radius:4px;padding:8px;max-width:100%}
.nfhost-grid{display:grid;grid-template-columns:minmax(250px,1fr) minmax(250px,1fr);gap:13px}.nfhost-card{background:#142b3a;border:1px solid #2d5168;padding:12px;border-radius:6px;min-width:0}
#nf-host-map{display:block;width:100%;max-height:380px;object-fit:contain;image-rendering:pixelated;background:#111918}#nf-host-status{font-size:11px;color:#8edcae;padding:7px 0;white-space:pre-wrap}
#nf-host-players{font:11px monospace;max-height:175px;overflow:auto}#nf-host-audit{font:10px/1.5 monospace;white-space:pre-wrap;max-height:140px;overflow:auto;background:#091923;padding:7px}
#nf-host-dialog .nfhost-muted{color:#9bb6c2;font-size:11px}#nf-host-dialog .nfhost-danger{color:#f3bb93}
@media(max-width:760px){.nfhost-grid{grid-template-columns:1fr}#nf-host-overlay{padding:4px}#nf-host-dialog{max-height:99vh;padding:11px}}
`;document.head.appendChild(style);
const open=node('button','🌐 WORLD Live');open.id='nf-host-open';open.title='Run an optional localhost hosted-world experiment; does not modify the ROM.';open.type='button';
const tab=document.querySelector('.tab[data-view="world"]');if(tab)tab.after(open);else q('fcw-ribbon')?.appendChild(open);
const overlay=node('div');overlay.id='nf-host-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','NES Forge WORLD Live localhost pilot');
overlay.innerHTML=`<div id="nf-host-dialog"><div class="nfhost-head"><div><small>WORLD / LOCALHOST EXPERIMENT · NOT A NATIVE ROM PATCH</small><h2>Author ↔ Live ↔ Deploy</h2></div><button type="button" id="nf-host-close">Close</button></div>
<p class="nfhost-muted">Author: choose/open a supported Zelda II native World in Forge. Live: send its terrain snapshot to the localhost host and watch players/camps. Deploy: later, with explicit revision migration; no live editing of ROM or native engine in this pilot.</p>
<div class="nfhost-actions"><label>Admin token <input type="password" id="nf-host-token" autocomplete="off" placeholder="From localhost terminal" size="32"></label><button id="nf-host-health">Test localhost</button><button id="nf-host-export">Export selected Z2 snapshot</button><button id="nf-host-publish">Load selected World on host</button><button id="nf-host-patch">Publish safe terrain edits</button><button id="nf-host-refresh">Refresh Live</button><button id="nf-host-player">Open player client ↗</button></div>
<div class="nfhost-card" style="margin-top:9px"><h3>Zelda II original room records · automatic read-only recovery</h3><p class="nfhost-muted">When you load a selected Zelda II World, Forge automatically decodes the native location pointers, room headers, raw object records, and exit tables directly from your imported ROM. No emulator screenshot required. Existing source-frame capture remains OPTIONAL as a diagnostic comparison. Neither data recovery nor reference images provide original runtime graphics, collision, or gameplay.</p><div class="nfhost-actions"><button id="nf-host-native-preview">Preview recovered room catalog</button><button id="nf-host-native-publish">Publish recovered records (read-only)</button><button id="nf-host-art-verify">Verify / republish town art</button><button id="nf-host-link-publish" title="Original Link pose graphics are recovered from local ROM and are separate from collision, animation timing, and combat">Publish original Link display poses</button><button id="nf-host-art-repair" style="background:#295641;border-color:#88dbb0">Restore original town graphics (2,6) · safe for online players</button><button id="nf-host-source-select" style="display:none">Select hosted World in Forge</button></div><pre id="nf-host-native-summary" style="white-space:pre-wrap;max-height:140px;overflow:auto" class="nfhost-muted">Load a Zelda II native World to inspect its ROM-defined side-view records.</pre><h4>Optional source-frame comparison</h4><div class="nfhost-actions"><label>Overworld X <input id="nf-host-stage-x" type="number" min="0" max="63" value="2" style="width:65px"></label><label>Y <input id="nf-host-stage-y" type="number" min="0" value="6" style="width:65px"></label><button id="nf-host-stage-capture">Capture emulator frame to location</button></div><p id="nf-host-stage-status" class="nfhost-muted">Select a map cell, then capture and confirm.</p></div>
<div id="nf-host-status" role="status">Start the included Python localhost host, then enter the printed admin token.</div>
<div class="nfhost-grid"><section class="nfhost-card"><h3>Hosted World Map</h3><div id="nf-host-art-presence" class="nfhost-muted">Native town art: not checked.</div><div id="nf-host-source-identity" class="nfhost-muted" style="white-space:pre-wrap;padding:8px;border:1px solid #466277;margin:6px 0">Source identity: not checked.</div><div id="nf-host-art-help" class="nfhost-muted" style="border-left:3px solid #88dbb0;padding:6px 10px;margin:6px 0">The host must receive the source artwork from the Forge editor. If missing, use Restore original town graphics above; no World reload or player disconnect is required.</div><canvas id="nf-host-map" width="640" height="750"></canvas><p class="nfhost-muted">Administrator overview: complete edited World and current players. Connected players see separate 256×240 camera views. Original Zelda II scroll physics are not yet proven.</p></section><section class="nfhost-card"><h3>Session / World</h3><div id="nf-host-summary">No connected host.</div><hr><h3>Players / Administration</h3><div id="nf-host-players">None</div><div class="nfhost-actions"><label>Player ID <select id="nf-host-selected-player"></select></label><button id="nf-host-grant">Grant +50 Test XP</button><button id="nf-host-defeat">Simulate defeat → Fairy Camp</button></div><p class="nfhost-muted">A test-only admin command. Later: role-based authorization, operations ledger, anti-abuse controls and safe versioned live changes.</p><h3>Audit log</h3><pre id="nf-host-audit">—</pre></section></div>
<p class="nfhost-muted nfhost-danger">POC security boundary: localhost only, do not expose a port or commit the admin secret. Wallets authenticate players; the separate admin token authorizes Forge operations. Offline editing never requires the server.</p></div>`;
document.body.appendChild(overlay);
const palette=['#89b7a0','#4b4436','#9683a5','#c7bb83','#b9ab60','#6f9464','#356d44','#4d7e5b','#9d9674','#afaa70','#ce704b','#5d5c54','#47739f','#679fa1','#777475','#8f7353'];
let timer=null,last=null,stageTarget=null;
function setStatus(message,error,pinned=false){q('nf-host-status').textContent=message;q('nf-host-status').style.color=error?'#f9b3ac':'#a8ebba';q('nf-host-status').dataset.pinned=pinned?'true':''}
function compareHostedSource(world){
 if(!world)return {ok:false,kind:'host-empty',message:'No hosted World has been published.'};
 const source=S.nativeGame, selectedWorld=S.worlds?.[window.Forge161?.worlds?.state?.selected??0];
 const binding=source?.resources?.find(r=>r.worldId===selectedWorld?.id&&r.mapId);
 const localId=binding?.mapId||'(none)',localDigest=source?.sourceSha256||'(none)';
 const hostId=world.sourceWorldId,hostDigest=world.sourceDigest;
 const head='Hosted: '+hostId+' · ROM SHA-256 '+hostDigest+'\nForge:  '+localId+' · ROM SHA-256 '+localDigest;
 const sameDigest=localDigest===hostDigest, sameId=localId===hostId;
 if(sameDigest&&sameId)return {ok:true,kind:'same',message:head+'\nMATCH: selected Forge source and hosted source are identical.'};
 const canSwitch=sameDigest&&source?.resources?.some(r=>r.mapId===hostId);
 let advice;
 if(!sameDigest)advice='ROM REVISION MISMATCH. This is the original ROM SHA-256, not your painted terrain edits. Reopen the ROM used when this World was first hosted. The existing server does not retain that ROM and cannot reconstruct its missing graphics without a matching source. Nothing will be overwritten.';
 else if(canSwitch)advice='WORLD SELECTION MISMATCH. The correct map is present in Forge; use Select hosted World in Forge to switch without changing game data.';
 else advice='WORLD SELECTION MISMATCH. Open the hosted map ('+hostId+') in the native World selector.';
 return {ok:false,kind:sameDigest?'world-mismatch':'rom-mismatch',canSwitch,message:head+'\n'+advice};
}
function selected(){
 if(!S.nativeGame||S.nativeGame.profile!==window.ZeldaOverworld?.id)throw Error('Open supported Zelda II ROM with Open native World first.');
 const selectedWorld=S.worlds[window.Forge161?.worlds?.state?.selected??0];
 const b=S.nativeGame.resources.find(b=>b.worldId===selectedWorld?.id&&b.mapId);
 if(!b)throw Error('Select a decoded Zelda II World map; source inspection alone cannot be hosted.');
 const detail=window.ZeldaOverworld.resource(b.mapId),height=detail.height;
 if(!selectedWorld||selectedWorld.map.length!==height*64)throw Error('Selected World terrain dimensions do not match decoded Z2 map.');
 const atlas=document.createElement('canvas');atlas.width=256;atlas.height=16;const ctx=atlas.getContext('2d');
 for(let id=0;id<16;id++){
   const icon=document.querySelector('#nativeWorldBrushes button[data-terrain="'+id+'"] canvas');
   if(!icon||icon.width!==16||icon.height!==16)throw Error('Native Z2 CHR tile atlas is not ready. Open WORLD and let the terrain palette render before publishing.');
   ctx.drawImage(icon,id*16,0);
 }
 const png=atlas.toDataURL('image/png');
 return {format:'nesforge.hosted-world',version:2,sourceProfile:window.ZeldaOverworld.id,sourceWorldId:b.mapId,sourceDigest:S.nativeGame.sourceSha256,name:selectedWorld.name,width:64,height,terrain:Array.from(selectedWorld.map),art:{format:'png-atlas-16x16-v1',png}};
}
function recoverNativeCatalog(){
 const sel=selected(),api=window.ForgeZ2NativeRooms;
 if(!api)throw Error('Native Z2 room-record decoder module missing');
 if(!(S.importedRom instanceof Uint8Array))throw Error('The native Zelda II source is not available');
 const bytes=Uint8Array.from(S.importedRom);
 if(!window.ZeldaOverworld.recognizes(bytes))throw Error('The original Zelda II ROM revision has not been verified');
 const recordList=window.Forge.services.NativeWorldProject.records(window.Forge.services.ProjectStore.capture());
 const catalog=api.catalog(bytes,sel.sourceWorldId,recordList,sel.height);
 return {...catalog,sourceDigest:sel.sourceDigest};
}
async function publishNativeCatalog(revision){
 const catalog=recoverNativeCatalog();
 const result=await req('/api/admin/native-rooms','POST',{format:catalog.format,version:catalog.version,sourceWorldId:catalog.sourceWorldId,sourceDigest:catalog.sourceDigest,stages:catalog.stages,skipped:catalog.skipped,expectedRevision:revision});
 const message='Decoded '+result.recovered+' real ROM-defined location/room records; '+result.skipped+' unresolved or off-map. Graphics/physics not recovered; no screenshots required.';
 q('nf-host-native-summary').textContent=message;
 return result;
}
function nativeSceneTarget(catalog){
 // Bounded first target: the original West Hyrule northwestern town, not arbitrary guessed maps.
 return catalog.stages.find(r=>r.location.x===2&&r.location.y===6&&r.source.bank===3&&r.source.kind==='town')||null;
}
async function publishNativeTownArt(revision){
 const catalog=recoverNativeCatalog(),room=nativeSceneTarget(catalog);
 if(!room)throw Error('Top-left West Hyrule town at (2,6) not available in this source World');
 const game=window.GameRENative;
 if(!game?.open)throw Error('Original NES Forge GameRENative scene constructor missing');
 const session=game.open(Uint8Array.from(S.importedRom));
 const set=room.location.terrainSource==='z2:2:0'?'towns-east':'towns-west';
 const sceneId='z2-scene:'+set+':'+room.source.scene;
 const d=session.scene(sceneId);
 if(d.evidence!=='executed-original-construction'||d.scene.bank!==room.source.bank||d.scene.slot!==room.source.scene||d.scene.status!=='native-command-stream')throw Error('Recovered native room identity cannot be verified');
 const output=session.raster(sceneId);
 if(output.width<256||output.height!==208||output.colors.length!==output.width*output.height)throw Error('Unexpected recovered room dimensions');
 // Publish the ENTIRE original room raster, never silently discard its other screens.
 // This remains read-only source artwork, not recovered collision/physics/scroll timing.
 if(output.width%256!==0||output.width>2048)throw Error('Unsupported native room width: '+output.width);
 const canvas=document.createElement('canvas');canvas.width=output.width;canvas.height=240;
 const cx=canvas.getContext('2d'),im=cx.createImageData(output.width,240);
 for(let i=0;i<output.width*240;i++){const y=Math.floor(i/output.width),x=i%output.width,ci=y<32?15:output.colors[(y-32)*output.width+x];const rgb=NP[ci&63]||NP[15];im.data.set([rgb[0],rgb[1],rgb[2],255],i*4)}
 cx.putImageData(im,0,0);
 const x=room.location.x,y=room.location.y;
 const result=await req('/api/admin/native-scene-art','POST',{format:'nesforge.hosted-native-scene-art',version:2,sourceWidth:output.width,expectedRevision:revision,sourceWorldId:catalog.sourceWorldId,sourceDigest:catalog.sourceDigest,x,y,sourceBank:room.source.bank,sourceScene:room.source.scene,sourceKind:room.source.kind,evidence:'executed-original-construction:first-screen',png:canvas.toDataURL('image/png')});
 const current=await req('/api/admin/state');
 const reference=current.stageFrames?.find(f=>f.x===x&&f.y===y&&f.revision===result.sha256&&f.captureMethod==='executed-original-construction:first-screen');
 if(!reference||reference.widthPx!==output.width)throw Error('Native room upload returned but host did not confirm its original multi-screen dimensions.');
 const imageReply=await fetch(API+'/api/stage-frame?x='+x+'&y='+y,{cache:'no-store'});
 if(!imageReply.ok)throw Error('Native art upload reported success but the client cannot retrieve its image: HTTP '+imageReply.status);
 const retrieved=await imageReply.json();
 if(retrieved.sha256!==result.sha256||retrieved.widthPx!==output.width||retrieved.captureMethod!=='executed-original-construction:first-screen')throw Error('Hosted art verification returned mismatched provenance or digest.');
 q('nf-host-native-summary').textContent+='\nVERIFIED on host: native town source art '+sceneId+' · '+output.width+'×240 original multi-screen PNG, SHA '+result.sha256.slice(0,12)+'; first-screen only.';
 return result;
}
async function publishLinkPoses(revision){
 const sel=selected(),rom=S.importedRom;
 if(!(rom instanceof Uint8Array))throw Error('Open the verified Zelda II ROM in Forge first.');
 const poseAsset=window.Forge.services.HostedPlayerPoses?.build(rom);
 if(!poseAsset||sel.sourceDigest!==poseAsset.sourceDigest)throw Error('Original Link pose source differs from current World.');
 const response=await req('/api/admin/player-poses','POST',{...poseAsset,sourceWorldId:sel.sourceWorldId,expectedRevision:revision});
 const check=await req('/api/admin/state');
 if(check.playerPoses?.sha256!==response.sha256)throw Error('Host did not confirm the player pose atlas.');
 const visible=await fetch(API+'/api/player-poses',{cache:'no-store'});
 if(!visible.ok)throw Error('Published Link poses are not retrievable by player clients.');
 const actual=await visible.json();
 if(actual.sha256!==response.sha256||actual.cellWidth!==32||actual.cellHeight!==40)throw Error('Player pose asset digest or dimensions mismatch.');
 return response;
}
function download(data,name){const a=node('a'),blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob);a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2500)}
async function requireHostProtocol13(){
 const response=await fetch(API+'/api/health',{cache:'no-store'});
 if(!response.ok)throw Error('Localhost host check failed (HTTP '+response.status+'). Start the host from this review kit.');
 const info=await response.json();
 if(!info.ok||info.protocol!==13||info.maxRoomWidthPx!==2048)throw Error('Incompatible localhost host (protocol '+(info.protocol??'unknown')+', maxRoomWidthPx '+(info.maxRoomWidthPx??'unknown')+'). This Forge build requires protocol 13 with 2048px native room support. Stop the other server with Ctrl+C and start the localhost launcher from THIS review kit. Do not run two hosts.');
}
async function req(path,method='GET',body){const r=await fetch(API+path,{method,headers:{'Content-Type':'application/json','X-Forge-Admin':q('nf-host-token').value.trim()},...(body?{body:JSON.stringify(body)}:{})});if(!r.ok)throw Error((await r.text()).slice(0,250));return r.json()}
q('nf-host-map').addEventListener('click',e=>{if(!last?.world)return;const c=q('nf-host-map'),box=c.getBoundingClientRect();const x=Math.floor((e.clientX-box.left)/box.width*last.world.width),y=Math.floor((e.clientY-box.top)/box.height*last.world.height);if(x>=0&&y>=0&&x<last.world.width&&y<last.world.height){stageTarget={x,y};q('nf-host-stage-x').value=x;q('nf-host-stage-y').value=y;q('nf-host-stage-status').textContent='Selected overworld square '+x+','+y+' · now display a side-view frame in the Emulator tab.';}});
function draw(state){const c=q('nf-host-map');if(!state.world){const cx=c.getContext('2d');cx.clearRect(0,0,c.width,c.height);return;}window.ForgeHostedRenderer.draw(c,state,{onArtReady:()=>{if(last===state)draw(state)}})}
function render(state){last=state;
 const present=state.stageFrames?.find(f=>f.x===2&&f.y===6&&f.captureMethod==='executed-original-construction:first-screen');
 const sourceState=compareHostedSource(state.world);const sourceBox=q('nf-host-source-identity'),switchButton=q('nf-host-source-select');
 sourceBox.textContent=sourceState.message;
 sourceBox.style.color=sourceState.ok?'#a9e8c7':'#ffe0bb';
 switchButton.style.display=sourceState.canSwitch?'inline-block':'none';
 const presence=q('nf-host-art-presence'),help=q('nf-host-art-help');
 presence.textContent=state.world?(present?'✓ Original town art AVAILABLE on host · '+present.revision.slice(0,12)+' · '+(present.widthPx||256)+'×240 · player clients can scroll when this is 1024×240':'⚠ ORIGINAL TOWN ART MISSING from this running server. The players will see placeholders and cannot scroll past the old room limit. This is a deployment issue, not a decoder failure.'):'Native town art: publish a World first.';
 presence.style.cssText='font:bold 12px monospace;padding:9px;border:1px solid '+(present?'#407b64':'#e4a172')+';background:'+(present?'#183c33':'#453026')+';color:'+(present?'#adf3ce':'#ffe0bb');
 help.textContent=present?'If a player still sees the fallback after VERIFIED, refresh that player browser. The full original room raster is server-owned.':'Restore graphics without resetting gameplay: open your Zelda II ROM in this Forge editor, enter the localhost admin token, then click RESTORE ORIGINAL TOWN GRAPHICS (2,6). You do NOT need to re-load the World or disconnect either player.';
 q('nf-host-art-repair').disabled=!state.world||!!(present&&present.widthPx>=512);
q('nf-host-summary').textContent=state.world?`${state.world.name} · ${state.world.sourceWorldId} · revision ${state.revision.slice(0,12)} · ${state.online} online · ${state.structures.length} structures`:'No World deployed. Select the Z2 map in NES Forge then Load selected World.';
 const ps=q('nf-host-selected-player'),old=ps.value;ps.replaceChildren();q('nf-host-players').replaceChildren();for(const p of state.players){const opt=node('option',p.id.slice(0,8));opt.value=p.id;ps.appendChild(opt);const row=node('div',`${p.online?'●':'○'} ${p.id.slice(0,8)} at ${p.x},${p.y} · XP ${p.xp}/${p.earned_xp??p.xp} · A${p.attack_level??1}/M${p.magic_level??1}/L${p.life_level??1} · HP ${p.hp??64} · ${p.mode||"overworld"}${p.area_id?" · "+p.area_id:""} · spawn camp ${p.respawn_camp_id?.slice(0,8)||"none"}`);q('nf-host-players').appendChild(row);}if([...ps.options].some(o=>o.value===old))ps.value=old;
 q('nf-host-audit').textContent=(state.audit||[]).slice(0,18).map(r=>`${r.seq} ${r.action} ${r.detail}`).join('\n')||'No events';draw(state)}
async function refresh(preserveStatus=false){try{render(await req('/api/admin/state'));if(!preserveStatus&&q('nf-host-status').dataset.pinned!=='true')setStatus('Connected to localhost · host state is authoritative')}catch(e){if(q('nf-host-status').dataset.pinned!=='true')setStatus('HOST CHECK FAILED: '+e.message,true)}}
function safe(fn){return async()=>{try{await fn()}catch(e){setStatus('ACTION FAILED: '+e.message,true,true)}}}
open.onclick=()=>{overlay.classList.add('open');refresh();timer=setInterval(()=>{if(q('nf-host-token').value)refresh()},2000)};
function close(){overlay.classList.remove('open');clearInterval(timer);timer=null}
q('nf-host-close').onclick=close;overlay.addEventListener('click',e=>{if(e.target===overlay)close()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&overlay.classList.contains('open'))close()});
q('nf-host-health').onclick=safe(async()=>{await requireHostProtocol13();setStatus('Localhost protocol 13 verified · multi-screen art supported · admin authentication still required')});
q('nf-host-export').onclick=safe(async()=>{const x=selected();download(x,'NES_Forge_Hosted_'+x.sourceWorldId.replaceAll(':','_')+'.json');setStatus('Exported selected World art snapshot. It includes locally recovered CHR-derived graphics, not ROM bytes; keep it private.')});
q('nf-host-publish').onclick=safe(async()=>{await requireHostProtocol13();const x=selected();if(!confirm('Load selected '+x.name+' onto localhost? This publishes a terrain/art snapshot AND read-only native room records decoded automatically from your ROM. Existing hosted overlays reset if revision changes. No original ROM bytes are sent.'))return;const r=await req('/api/admin/world','POST',x);let message='Loaded revision '+r.revision.slice(0,16)+' · source editor unchanged';try{const c=await publishNativeCatalog(r.revision);message+=' · '+c.recovered+' native location/room records recovered';try{const art=await publishNativeTownArt(r.revision);message+=' · original multi-screen town art '+art.sha256.slice(0,9)}catch(e){message+=' · ⚠ TOWN ART FAILED: '+e.message+' · Use Verify / republish town art.';q('nf-host-native-summary').textContent=message;setStatus(message,true)}
 try{const poses=await publishLinkPoses(r.revision);message+=' · Link display poses '+poses.sha256.slice(0,9)}catch(e){message+=' · ⚠ LINK POSES NOT PUBLISHED: '+e.message}}catch(e){message+=' · native room recovery unavailable: '+e.message;q('nf-host-native-summary').textContent=message;}setStatus(message,message.includes('TOWN ART FAILED')||message.includes('LINK POSES NOT PUBLISHED')||message.includes('native room recovery unavailable'),message.includes('FAILED')||message.includes('unavailable'));await refresh(true)});
q('nf-host-link-publish').onclick=safe(async()=>{
 await requireHostProtocol13();const live=await req('/api/admin/state'),sel=selected();
 if(!live.world||live.world.sourceWorldId!==sel.sourceWorldId||live.world.sourceDigest!==sel.sourceDigest)throw Error('Select the original ROM and matching hosted World first.');
 const r=await publishLinkPoses(live.revision);
 setStatus('Published native Link display pose silhouettes · SHA '+r.sha256.slice(0,12)+' · two-player client receives art. Animation and combat remain unverified.',false,true);
 await refresh(true);
});
q('nf-host-art-verify').onclick=safe(async()=>{
 await requireHostProtocol13();
 const live=await req('/api/admin/state'),sel=selected();
 if(!live.world||live.world.sourceWorldId!==sel.sourceWorldId||live.world.sourceDigest!==sel.sourceDigest)throw Error('Load the same selected World into localhost before publishing native art.');
 const existing=live.stageFrames?.find(f=>f.x===2&&f.y===6&&f.captureMethod==='executed-original-construction:first-screen');
 if(existing){const reply=await fetch(API+'/api/stage-frame?x=2&y=6',{cache:'no-store'});if(reply.ok){const data=await reply.json();if(data.sha256===existing.revision){setStatus('Native town art already verified on host: '+data.sha256.slice(0,12)+'. Reload the player browser if its viewport still shows the source record dots.');return;}}}
 const c=await recoverNativeCatalog(); // source verification occurs locally; no ROM transmitted
 if(!confirm('Publish the original West Hyrule town multi-screen graphics to localhost now? Original ROM data never leaves Forge.'))return;
 await publishNativeCatalog(live.revision);
 const r=await publishNativeTownArt(live.revision);
 setStatus('VERIFIED original NES town graphics published on localhost (2,6) · '+r.sha256.slice(0,12)+' · refresh player client.');await refresh(true);
 });
q('nf-host-source-select').onclick=safe(async()=>{
 const live=await req('/api/admin/state'),identity=compareHostedSource(live.world);
 if(!identity.canSwitch)throw Error(identity.message);
 if(!window.Forge?.services?.NativeWorldUI?.choose)throw Error('Native World selector unavailable. Use the World dropdown manually.');
 window.Forge.services.NativeWorldUI.choose(live.world.sourceWorldId);
 const next=compareHostedSource(live.world);
 if(!next.ok)throw Error('Area selection did not resolve source identity: '+next.message);
 setStatus('Selected matching World '+live.world.sourceWorldId+' in Forge. No hosted data or ROM bytes changed. You can now restore the artwork.',false,true);
 await refresh(true);
});
q('nf-host-art-repair').onclick=safe(async()=>{
 await requireHostProtocol13();
 const live=await req('/api/admin/state');
 if(!live.world)throw Error('No hosted World exists. Load selected World on host first.');
 const identity=compareHostedSource(live.world);
 if(!identity.ok)throw Error(identity.message+'\nRESTORE ABORTED. Hosted players and data unchanged.');
 const sel=selected();
 // This is an explicit asset-only repair; the host never resets World, players, XP, camps or sessions.
 if(!live.nativeRooms?.some(r=>r.x===2&&r.y===6))await publishNativeCatalog(live.revision);
 const repaired=await publishNativeTownArt(live.revision);
 setStatus('✓ RESTORED AND VERIFIED original multi-screen town graphics (2,6) · '+repaired.widthPx+'×240 · '+repaired.sha256.slice(0,12)+' · no World reload, player disconnect, XP reset or camp reset. Player browsers should update from the server; refresh a player tab if needed.',false,true);
 await refresh(true);
});
q('nf-host-native-preview').onclick=safe(async()=>{const c=recoverNativeCatalog();q('nf-host-native-summary').textContent='Verified source: '+c.sourceWorldId+'\n'+c.stages.length+' decoded room bindings · '+c.skipped.length+' unresolved/off-map.\n'+c.stages.slice(0,12).map(r=>'Location '+r.location.index+' ('+r.location.x+','+r.location.y+'): bank '+r.source.bank+' map '+r.source.scene+' · '+r.header.screenCount+' screens · '+r.objects.length+' source objects').join('\n')+'\nRead-only; graphics and collision still unresolved.';});
q('nf-host-native-publish').onclick=safe(async()=>{await requireHostProtocol13();const live=await req('/api/admin/state'),sel=selected();if(!live.world||live.world.sourceWorldId!==sel.sourceWorldId||live.world.sourceDigest!==sel.sourceDigest)throw Error('Load the selected World first.');if(!confirm('Update the current hosted native room reference catalog? No gameplay rules or ROM bytes will be changed.'))return;const c=await publishNativeCatalog(live.revision);let message='Published '+c.recovered+' native source records';try{const art=await publishNativeTownArt(live.revision);message+=' and constructed multi-screen art '+art.sha256.slice(0,10)}catch(e){message+='; original art FAILED: '+e.message}setStatus(message,message.includes('FAILED'));await refresh(true)});
q('nf-host-patch').onclick=safe(async()=>{const x=selected();const live=await req('/api/admin/state');if(!live.world)throw Error('Load a full World snapshot first.');if(live.world.version!==2)throw Error('Loaded host is still on v1 abstract map. Reload v2 art snapshot with players disconnected first.');if(live.world.sourceWorldId!==x.sourceWorldId||live.world.sourceDigest!==x.sourceDigest)throw Error('Source World differs; a safe terrain patch cannot change project identity.');if(live.world.art?.png!==x.art.png)throw Error('Tileset/palette changed. A safe terrain patch cannot replace art while players are connected. Reload a full snapshot with players disconnected.');const changes=[];for(let i=0;i<x.terrain.length;i++)if(x.terrain[i]!==live.world.terrain[i])changes.push({index:i,value:x.terrain[i]});if(!changes.length){setStatus('No terrain differences to publish.');return;}if(changes.length>128)throw Error('This revision changes '+changes.length+' cells; the experimental patch limit is 128. Stage smaller changes or do a full reload.');if(!confirm('Publish '+changes.length+' changed terrain cells to connected players? Affected player/structure cells will be rejected. No ROM or Forge project mutation.'))return;const result=await req('/api/admin/patch','POST',{format:'nesforge.world.patch',version:1,expectedRevision:live.revision,sourceWorldId:x.sourceWorldId,changes});setStatus('Published '+result.changed+' terrain cells · revision '+result.revision.slice(0,12));await refresh()});
q('nf-host-stage-capture').onclick=safe(async()=>{
 const x=Number(q('nf-host-stage-x').value),y=Number(q('nf-host-stage-y').value);
 const live=await req('/api/admin/state');if(!live.world)throw Error('First publish your selected World.');
 const sel=selected();if(live.world.sourceWorldId!==sel.sourceWorldId||live.world.sourceDigest!==sel.sourceDigest)throw Error('Selected Forge World and hosted World must refer to the same source ROM and area.');
 if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||x>=live.world.width||y<0||y>=live.world.height)throw Error('Select a valid cell of the hosted World.');
 const canvas=q('emuCanvas');if(!canvas||canvas.width!==256||canvas.height!==240)throw Error('NES emulator 256×240 screen is not available.');
 const frame=canvas.getContext('2d').getImageData(0,0,256,240).data;
 let contrast=0;const first=frame.slice(0,4);for(let i=4;i<frame.length;i+=73*4){if(Math.abs(frame[i]-first[0])+Math.abs(frame[i+1]-first[1])+Math.abs(frame[i+2]-first[2])>24)contrast++;}
 if(contrast<5)throw Error('Emulator frame appears blank. Run your original ROM and navigate to a side-view scene first.');
 if(!confirm('Publish a STILL IMAGE of the current emulator display to hosted square ('+x+','+y+')? This is an unverified visual reference, possibly including Link/HUD, NOT native room recovery or playable Zelda II. It will be visible to all localhost players.'))return;
 const png=canvas.toDataURL('image/png');const payload={format:'nesforge.hosted-stage-frame',version:1,sourceWorldId:live.world.sourceWorldId,expectedRevision:live.revision,x,y,captureMethod:'emulator-visible-frame',png};
 const res=await req('/api/admin/stage-frame','POST',payload);
 q('nf-host-stage-status').textContent='Captured ('+x+','+y+') · SHA '+res.sha256.slice(0,12)+' · static reference · all connected player clients notified';await refresh();
 });
 q('nf-host-refresh').onclick=()=>refresh();q('nf-host-player').onclick=()=>window.open(API+'/','_blank','noopener,noreferrer');
q('nf-host-defeat').onclick=safe(async()=>{const playerId=q('nf-host-selected-player').value;if(!playerId)throw Error('Select a player first');if(!confirm('SIMULATE DEFEAT (localhost test only): send this player to their owned Fairy Camp stage or fallback overworld spawn? This is not recovered Z2 combat.'))return;const result=await req('/api/admin/command','POST',{action:'simulate_defeat',playerId});setStatus('Simulated defeat · camp '+(result.campUsed?'used':'unavailable, overworld fallback'));await refresh()});
q('nf-host-grant').onclick=safe(async()=>{const playerId=q('nf-host-selected-player').value;if(!playerId)throw Error('Select a connected wallet player first');await req('/api/admin/command','POST',{action:'grant_test_xp',playerId,amount:50});setStatus('Granted +50 PILOT build XP to '+playerId.slice(0,8));await refresh()});
window.Forge=window.Forge||{};window.Forge.services=window.Forge.services||{};window.Forge.services.HostedWorldPOC=Object.freeze({open:()=>open.click(),selected});
})();
