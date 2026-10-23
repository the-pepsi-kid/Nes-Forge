/* One preserved source owner, existing scene assets, bounded native recipes.
 * New schema-16 profile: older readers reject its unknown descriptor/profile
 * before any mutation. No constructor or reader ceiling is raised. */
(()=>{
'use strict';
const s=window.Forge.services,api=window.NativeBlockLayout,format=window.NativeEngineFormat,cp=x=>JSON.parse(JSON.stringify(x));
const profile='native-linear-block-project-v1',fail=m=>{throw Error('Native layout project: '+m);},digest=x=>format.sha256(new TextEncoder().encode(JSON.stringify(x)));
const scope='Partial native recovery: Area 1 side-view screen table (20 screens), initial background bank and palette. Native rebuild supports existing 32×32 block substitutions only. Menus, animation, collision semantics, actors, Audio and other areas remain unresolved.';
const matches=p=>p?.nativeGame?.profile===profile;
function recognizes(bytes){if(!(bytes instanceof Uint8Array))return null;const hash=format.sha256(bytes);for(const p of api.profiles){if(bytes.length!==p.byteLength)continue;if(hash===p.sha256)return p;const protectedBytes=bytes.slice();protectedBytes.fill(0,p.screenOffset,p.screenOffset+p.screens*p.columns*p.rows);if(format.sha256(protectedBytes)!==p.protectedSha256)continue;try{api.inspect(bytes,p);return p;}catch(_){}}return null;}
const pageId=(a,i)=>'native-layout-'+a.id+'-'+i;
const bindings=a=>Array.from({length:a.screens},(_,index)=>({sceneId:pageId(a,index),screen:index}));
function catalog(bytes,a){const c=api.inspect(bytes,a);return {format:'NESForgeNativeBlockCatalog',version:1,profile:a.id,sourceSha256:format.sha256(bytes),scope,resources:c.screens.map(v=>({id:v.id,label:v.label,index:v.index,fileOffset:v.offset,length:v.cells.length})),sources:{blocks:{offset:a.blockOffset,length:a.blockCount*16},attributes:{offset:a.attributeOffset,length:a.blockCount},chr:{offset:a.chrOffset,length:4096},palette:{offset:a.paletteOffset,length:12}},domains:{areas:'partial',menus:'unresolved',graphics:'partial',animation:'unresolved',collision:'unresolved',actors:'unresolved',audio:'unresolved',objectsTextFlags:'unresolved',relationships:'partial',lifecycle:'partial',nativeWriter:'partial',execution:'partial'}};}
function inspect(p){
 const n=p.nativeGame,a=api.profiles.find(a=>a.id===n?.adapter);
 if(!matches(p)||!a||p.version!==16||n.format!=='NESForgeNativeGame'||n.version!==3||Object.keys(n).sort().join(',')!=='adapter,areas,edits,format,profile,projectionSha256,resources,sourceSha256,version'||typeof n.sourceSha256!=='string'||!/^[a-f0-9]{64}$/.test(n.projectionSha256)||JSON.stringify(n.areas)!==JSON.stringify(bindings(a)))fail('Invalid source adapter or resource bindings.');
 // Reuse the original physical-sheet ownership validator without claiming
 // the new profile is its old unchanged-only format.
 const raw={...p,nativeGame:{format:n.format,version:3,profile:s.ROMProject.profile,sourceSha256:n.sourceSha256,projectionSha256:n.projectionSha256,resources:n.resources,edits:[]}};
 const {bytes,container}=s.ROMProject.validate(raw);if(recognizes(bytes)?.id!==a.id)fail('A protected source byte changed or the native screen records are invalid.');const c=api.inspect(bytes,a);api.encode(bytes,c,n.edits);
 for(const b of n.areas){const sc=p.scenes.find(v=>v.id===b.sceneId),r=sc?.captureMeta?.nativeLayout;if(!sc||JSON.stringify(r)!==JSON.stringify({version:1,adapter:a.id,screen:b.screen,sourceSha256:n.sourceSha256,fileOffset:c.screens[b.screen].offset,length:a.columns*a.rows}))fail('A required recovered screen was removed or replaced.');}
 return {bytes,container,descriptor:n,adapter:a,catalog:c};
}
function validate(p,{build=false}={}){
 const info=inspect(p);if(build){
  const masked=cp(p),encoded=api.encode(info.bytes,info.catalog,p.nativeGame.edits),decoded=api.inspect(encoded.bytes,info.adapter);
  for(const b of p.nativeGame.areas){const sc=p.scenes.find(v=>v.id===b.sceneId),expected=api.projectScreen(decoded,b.screen),old=api.projectScreen(info.catalog,b.screen);
   if(JSON.stringify(sc.nt)!==JSON.stringify(expected.nt)||JSON.stringify(sc.attr)!==JSON.stringify(expected.attr))fail('Scene painting differs from its native block recipe. Use the Native screen blocks brush for encodable layout changes. Other edits remain savable.');
   const target=masked.scenes.find(v=>v.id===b.sceneId);target.nt=old.nt;target.attr=old.attr;
  }
  if(s.NativeEngineProject.signature(masked)!==p.nativeGame.projectionSha256)fail('An editor asset or setting changed without a native encoder. This checkpoint writes existing native block substitutions only. Undo unsupported changes to build.');
 }return info;
}
function validateInvestigation(p){
 const info=validate(p),n=p.investigation;
 if(n?.format!=='NESForgeInvestigation'||n.version!==3||Object.keys(n).sort().join(',')!=='catalogSha256,catalogs,format,source,version'||Object.keys(n.catalogs||{}).sort().join(',')!=='inspection,recovery'||Object.keys(n.catalogSha256||{}).sort().join(',')!=='inspection,recovery'||n.source?.sha256!==p.nativeGame.sourceSha256||n.source.profile!==profile||n.source.byteLength!==info.bytes.length||typeof n.source.name!=='string'||!n.source.name||n.source.name.length>160)fail('Invalid recovered source catalogs.');
 const raw=cp(p);raw.nativeGame={format:'NESForgeNativeGame',version:3,profile:s.ROMProject.profile,sourceSha256:p.nativeGame.sourceSha256,projectionSha256:p.nativeGame.projectionSha256,resources:p.nativeGame.resources,edits:[]};raw.investigation={format:n.format,version:2,source:{...n.source,profile:s.ROMProject.profile},catalogs:{inspection:n.catalogs.inspection},catalogSha256:{inspection:n.catalogSha256.inspection}};s.ROMProject.validateInvestigation(raw);
 if(JSON.stringify(n.catalogs.recovery)!==JSON.stringify(catalog(info.bytes,info.adapter))||digest(n.catalogs.recovery)!==n.catalogSha256.recovery)fail('Recovered catalog differs from the verified source format.');return n;
}
async function create(input,name){
 const bytes=Uint8Array.from(input),a=recognizes(bytes);if(!a)fail('This source revision has no verified native block adapter.');
 const p=await s.ROMProject.create(bytes,name),c=api.inspect(bytes,a),source={...p.investigation.source,profile},members=c.screens.map(v=>({sceneId:v.id,label:v.label,status:'catalogued'}));
 const scenes=c.screens.map((v,index)=>makeScene({id:pageId(a,index),name:v.label,...api.projectScreen(c,index),chr:cp(c.chr),sprChr:normalizeTiles(),sceneType:'static',scrollDir:'none',gravity:0,pal:cp(c.palette),tileProps:Array(256).fill(0),oam:[],entities:[],links:[],buildInclude:false,captureMeta:{nativeLayout:{version:1,adapter:a.id,screen:index,sourceSha256:source.sha256,fileOffset:v.offset,length:v.cells.length},nativeAssets:{version:1,source:{name:source.name,sha256:source.sha256,byteLength:bytes.length},profile:a.id,sceneId:v.id,page:0,originY:0,contentHeight:192,context:{version:1,id:'area1-sideview-table',kind:'native-table',label:a.label,members:cp(members),scope:'Native screen table membership only. Route order and reachability unresolved.'},limits:[scope,'Only the top 192 pixels belong to this resource; the remaining canvas is unused. No recovered sprites, HUD or authored collision is claimed.']}}}));
 p.scenes=[...scenes,...p.scenes];p.activeScene=0;p.projectName=(String(name||'NES').replace(/\.nes$/i,'')+' · partial recovered project').slice(0,120);
 p.nativeGame={...p.nativeGame,profile,adapter:a.id,areas:bindings(a)};p.investigation.source=source;p.investigation.version=3;p.investigation.catalogs.recovery=catalog(bytes,a);p.investigation.catalogSha256.recovery=digest(p.investigation.catalogs.recovery);
 const prepared=s.ProjectStore.prepareLoad(p);for(const key of ['scenes','worlds','metasprites','animations','patterns','instruments','sfx'])p[key]=cp(prepared[key]);p.nativeGame.projectionSha256=s.NativeEngineProject.signature(p);validateInvestigation(p);validate(p,{build:true});return p;
}
function paint(p,sceneId,change){
 const info=validate(p),binding=p.nativeGame.areas.find(v=>v.sceneId===sceneId);if(!binding)fail('Select a recovered source screen.');
 const entry={screen:binding.screen,cell:change?.cell,block:change?.block};api.encode(info.bytes,info.catalog,[entry]);
 // Unsupported local painting is not silently thrown away by this action.
 const prior=api.inspect(api.encode(info.bytes,info.catalog,p.nativeGame.edits).bytes,info.adapter),old=api.projectScreen(prior,binding.screen),scene=p.scenes.find(v=>v.id===sceneId);
 if(JSON.stringify(scene.nt)!==JSON.stringify(old.nt)||JSON.stringify(scene.attr)!==JSON.stringify(old.attr))fail('Undo local Scene/attribute painting before using the native block brush.');
 const n=cp(p.nativeGame);n.edits=n.edits.filter(e=>e.screen!==entry.screen||e.cell!==entry.cell);if(entry.block!==info.catalog.screens[entry.screen].cells[entry.cell])n.edits.push(entry);n.edits.sort((a,b)=>a.screen-b.screen||a.cell-b.cell);
 const decoded=api.inspect(api.encode(info.bytes,info.catalog,n.edits).bytes,info.adapter),scenes=cp(p.scenes),target=scenes.find(v=>v.id===sceneId);Object.assign(target,api.projectScreen(decoded,binding.screen));return {nativeGame:n,scenes};
}
function build(p){const {bytes,container,catalog:c}=validate(p,{build:true}),out=api.encode(bytes,c,p.nativeGame.edits);return {rom:out.bytes,metadata:{prgSize:container.header.prgSize,chrSize:container.header.chrSize,changes:out.changes,sourceSha256:p.nativeGame.sourceSha256,outputSha256:format.sha256(out.bytes)},diagnostics:[{severity:'info',code:'native-block-layout',phase:'native-encode',message:out.changes.length+' native screen byte(s) changed; all other original bytes preserved.'},{severity:'warning',code:'native-edit-scope',phase:'native-encode',message:scope}]};}
function describe(n){return {kind:'native-layout',source:cp(n.source),rooms:n.catalogs.recovery.resources.length,contexts:1,maps:0,actors:0,poses:0,scripts:0,chrBanks:32,symbols:0,ram:0,cues:0,gaps:[scope,'Only Area 1 side-view table membership is decoded; this is not complete game recovery.','Collision values remain unassigned in the editor. Native block substitution retains the original engine’s handling of that block; its rules are not translated.'],audioGaps:[],domains:cp(n.catalogs.recovery.domains)};}
function donor(p,sceneId){validate(p);const raw=cp(p);raw.nativeGame={format:'NESForgeNativeGame',version:3,profile:s.ROMProject.profile,sourceSha256:p.nativeGame.sourceSha256,projectionSha256:p.nativeGame.projectionSha256,resources:p.nativeGame.resources,edits:[]};return s.ROMProject.donor(raw,sceneId);}
const requiredScene=(p,id)=>matches(p)&&(p.nativeGame.resources.some(b=>b.sceneId===id)||p.nativeGame.areas.some(b=>b.sceneId===id));
s.NativeLayoutProject=Object.freeze({profile,scope,matches,recognizes,create,validate,validateInvestigation,paint,build,describe,donor,requiredScene});
})();
