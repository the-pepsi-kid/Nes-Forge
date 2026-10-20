/* A navigation view over canonical assets. No Stage store, schema or encoder. */
(()=>{
'use strict';
const services=window.Forge.services;
let ui=null,group='',epoch=-1,renderKey='';
const nativeKey=sc=>{const r=sc?.captureMeta?.nativeAssets;return r&&/^[a-f0-9]{64}$/.test(r.source?.sha256)&&typeof r.sceneId==='string'?r.source.sha256+':'+r.profile+':'+r.sceneId:null;};
const fail=message=>{throw Error('Scene context: '+message);};
function describe(){
 const sc=S.scenes[S.activeScene],scenes=S.scenes.map(s=>({id:s.id,name:s.name})),groups=[{id:'',name:'All project scenes',sceneIds:scenes.map(s=>s.id)}];
 for(const w of S.worlds||[])groups.push({id:'world:'+w.id,name:'World: '+w.name,worldId:w.id,sceneIds:S.scenes.filter(s=>s.id===w.tilesetSceneId).map(s=>s.id)});
 const recovered=new Map();
 for(const s of S.scenes){const key=nativeKey(s);if(!key)continue;if(!recovered.has(key)){const r=s.captureMeta.nativeAssets;recovered.set(key,{id:'native:'+key,name:'Recovered room: '+s.name.replace(/ · page \d+$/,''),sceneIds:[]});}recovered.get(key).sceneIds.push(s.id);}
 groups.push(...recovered.values());
 const poses=(S.metasprites||[]).filter(p=>p.sceneId===sc?.id),poseIds=new Set(poses.map(p=>p.id));
 const clips=(S.animations||[]).filter(a=>a.frames?.some(f=>f.metaspriteId?poseIds.has(f.metaspriteId):!f.sceneId||f.sceneId===sc?.id)).map(a=>({id:a.id,name:a.name,usesActiveScene:a.frames.some(f=>!f.metaspriteId&&!f.sceneId),sharedSceneIds:[...new Set(a.frames.flatMap(f=>f.metaspriteId?[(S.metasprites||[]).find(p=>p.id===f.metaspriteId)?.sceneId]:[f.sceneId]).filter(Boolean))]}));
 const worlds=(S.worlds||[]).filter(w=>w.tilesetSceneId===sc?.id).map(w=>({id:w.id,name:w.name}));
 const receipt=sc?.captureMeta?.nativeAssets,source=nativeKey(sc)?{sha256:receipt.source.sha256,name:receipt.source.name,profile:receipt.profile,sceneId:receipt.sceneId,page:receipt.page}:null;
 const loaded=services.GameREUI?.getState();
 return {scene:sc?{id:sc.id,name:sc.name}:null,scenes,groups,worlds,poses:poses.map(p=>({id:p.id,name:p.name})),clips,source,canOpenSource:!!source&&loaded?.sha256===source.sha256,
  audioScope:'Project-wide Audio; scene/event-to-cue bindings are not recovered by this navigator.',nativeProject:!!S.nativeGame};
}
function selectScene(id){const index=S.scenes.findIndex(s=>s.id===id);if(index<0)fail('Scene is no longer present.');switchScene(index);refresh();return describe();}
function selectGroup(id){const item=describe().groups.find(g=>g.id===id);if(!item)fail('Context is no longer present.');if(!item.sceneIds.length)fail('This World has no available tileset scene.');group=id;if(item.worldId)return selectWorld(item.worldId);if(!item.sceneIds.includes(S.scenes[S.activeScene]?.id))selectScene(item.sceneIds[0]);refresh();return describe();}
function selectWorld(id){const w=(S.worlds||[]).find(w=>w.id===id);if(!w)fail('World is no longer present.');if(!S.scenes.some(s=>s.id===w.tilesetSceneId))fail('World tileset scene is unavailable.');selectScene(w.tilesetSceneId);Forge161.worlds.select(S.worlds.indexOf(w));refresh();return describe();}
function openAsset(kind,id){
 const d=describe();
 if(kind==='world'){if(!d.worlds.some(w=>w.id===id))fail('World does not use this scene as its tileset.');selectWorld(id);switchTab('world');}
 else if(kind==='pose'){if(!d.poses.some(p=>p.id===id))fail('Pose does not use this scene.');Forge163.metasprites.select(id);switchTab('metasprites');}
 else if(kind==='clip'){if(!d.clips.some(a=>a.id===id))fail('Animation has no reference to this scene.');anim_stopPreview();S._selAnim=S.animations.findIndex(a=>a.id===id);S._animFrame=Math.max(0,S.animations[S._selAnim].frames.findIndex(f=>f.metaspriteId?S.metasprites.some(p=>p.id===f.metaspriteId&&p.sceneId===d.scene.id):!f.sceneId||f.sceneId===d.scene.id));anim_updateSidebar();Forge164.frameEditor.refresh();switchTab('anim');}
 else if(kind==='actors'){Forge164.studio.open(d.scene.id);}
 else if(kind==='source'){if(!d.canOpenSource)fail('Open the matching investigated ROM in RE first.');if(!services.GameREUI.selectSceneById(d.source.sceneId))fail('Source scene is unavailable in the loaded catalog.');services.SpatialREUI.show();switchTab('disasm');}
 else if(['scene','chr','collision','audio'].includes(kind))switchTab(kind);
 else fail('Unsupported resource view.');
 refresh();return true;
}
function options(node,items,value,empty){node.replaceChildren();if(!items.length){const o=document.createElement('option');o.value='';o.textContent=empty;node.appendChild(o);}for(const item of items){const o=document.createElement('option');o.value=item.id;o.textContent=item.name;node.appendChild(o);}node.value=items.some(i=>i.id===value)?value:items[0]?.id||'';node.disabled=!items.length;}
function refresh(){
 if(!ui)return;const d=describe(),currentEpoch=services.ProjectStore.state.epoch;
 if(epoch!==currentEpoch){epoch=currentEpoch;group=d.source?'native:'+nativeKey(S.scenes[S.activeScene]):'';}
 let selected=d.groups.find(g=>g.id===group);if(!selected?.sceneIds.includes(d.scene?.id)){group='';selected=d.groups[0];}
 const key=JSON.stringify({d,group});if(key===renderKey)return;renderKey=key;
 options(ui.group,d.groups,group);options(ui.scene,d.scenes.filter(s=>selected.sceneIds.includes(s.id)),d.scene?.id);
 options(ui.world,d.worlds,ui.world.value,'No World uses this tileset');ui.openWorld.disabled=!d.worlds.length;
 options(ui.pose,d.poses,ui.pose.value,'No pose uses this scene');ui.openPose.disabled=!d.poses.length;
 options(ui.clip,d.clips,ui.clip.value,'No animation references this scene');ui.openClip.disabled=!d.clips.length;
 ui.source.disabled=!d.canOpenSource;
 ui.summary.textContent='Scene resources · '+d.scene?.name+' · '+d.poses.length+' pose(s) · '+d.clips.length+' animation(s) · '+d.worlds.length+' World tileset use(s)';
 ui.notes.textContent=d.audioScope+(d.clips.some(a=>a.sharedSceneIds.some(id=>id!==d.scene.id))?' Animations can share resources across scenes.':'')+(d.clips.some(a=>a.usesActiveScene)?' Legacy tile frames without a source scene follow the active scene.':'')+(d.source?' Source: '+d.source.sceneId+' · SHA-256 '+d.source.sha256+(d.canOpenSource?' · matching RE source loaded.':' · open the matching ROM in RE to inspect its source.'):'')+(d.nativeProject?' Native project: only supported location fields can currently rebuild; this room is a reference view.':'');
}
function mount(){
 const tabs=document.getElementById('tabBar');if(!tabs?.parentNode)return;
 const el=(tag,id,text)=>{const n=document.createElement(tag);if(id)n.id=id;if(text!==undefined)n.textContent=text;return n;};
 const root=el('details','sceneContext');root.setAttribute('aria-label','Scene resource context');const summary=el('summary','sceneContextSummary','Scene resources');root.appendChild(summary);
 const controls=el('div');controls.className='context-controls';const field=(text,id)=>{const label=el('label',null,text),select=el('select',id);label.htmlFor=id;label.appendChild(select);controls.appendChild(label);return select;};
 const safe=fn=>()=>{try{fn();}catch(e){renderKey='';refresh();ui.notes.textContent=e.message;}};
 const contexts=field('World / recovered room','sceneContextGroup'),scene=field('Scene / page','sceneContextScene');contexts.onchange=safe(()=>selectGroup(contexts.value));scene.onchange=safe(()=>selectScene(scene.value));
 const button=(id,text,fn)=>{const b=el('button',id,text);b.type='button';b.onclick=safe(fn);controls.appendChild(b);return b;};
 const world=field('World tileset uses','sceneContextWorld'),openWorld=button('sceneContextOpenWorld','Open World',()=>openAsset('world',world.value));
 const pose=field('Sprite poses using this scene','sceneContextPose'),openPose=button('sceneContextOpenPose','Open pose',()=>openAsset('pose',pose.value));
 const clip=field('Animations referencing this scene','sceneContextClip'),openClip=button('sceneContextOpenClip','Open animation',()=>openAsset('clip',clip.value));
 for(const [kind,label]of [['scene','Scene'],['chr','CHR'],['collision','Collision'],['actors','Actors'],['audio','Audio (project)']])button('sceneContext-'+kind,label,()=>openAsset(kind));
 const source=button('sceneContextOpenSource','Open matching RE scene',()=>openAsset('source')),notes=el('p','sceneContextNotes');notes.setAttribute('role','status');root.append(controls,notes);
 const style=el('style');style.textContent='#sceneContext{flex:1 0 100%;width:100%;max-width:100%;box-sizing:border-box;padding:6px 10px;border-top:1px solid var(--bdr);font:11px/1.5 system-ui;overflow-wrap:anywhere}#sceneContext summary{cursor:pointer;color:#a6e4d4}#sceneContext .context-controls{display:flex;flex-wrap:wrap;align-items:end;gap:6px;padding-top:6px}#sceneContext label{display:flex;flex-direction:column;flex:1 1 180px;min-width:0}#sceneContext select{width:100%;min-width:0}#sceneContext button,#sceneContext select{min-height:44px;font:inherit;background:var(--bg3);color:var(--txt);border:1px solid var(--bdr);border-radius:4px;padding:4px 8px}#sceneContextNotes{margin:5px 0;color:var(--dim)}';document.head.appendChild(style);
 tabs.parentNode.appendChild(root);ui={root,summary,group:contexts,scene,world,openWorld,pose,openPose,clip,openClip,source,notes};
 for(const type of ['keydown','keyup'])root.addEventListener(type,e=>e.stopPropagation());refresh();
}
services.SceneContext=Object.freeze({describe,selectScene,selectGroup,selectWorld,openAsset});services.SceneContextUI=Object.freeze({refresh});mount();
})();
