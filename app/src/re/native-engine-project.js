/* Native source and edit intent are canonical project data. The native backend
 * applies only declared packed-field edits and preserves all other ROM bytes.
 * Generic authoring edits are retained, but refused at build until they have a
 * verified native encoder; they can never appear to compile successfully. */
(()=>{
'use strict';
const services=window.Forge.services,cp=v=>JSON.parse(JSON.stringify(v)),format=window.NativeEngineFormat;
const fail=m=>{throw Error('Native project: '+m);};
const keys=['scenes','worlds','metasprites','animations','instruments','patterns','orderList','tempo','speed','audRows','sfx','asmSource','mapper','mirroring','hasSRAM','prgBanks','chrBanks','packScenes','gameplay','worldRuntime','audioRuntime','gameplayCore'];
const canonical=v=>JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
const signature=p=>format.sha256(new TextEncoder().encode(canonical(Object.fromEntries(keys.map(k=>[k,p[k]])))));
function source(project){if(typeof project.importedRom!=='string'||project.importedRom.length>400000)fail('Original ROM bytes are required.');const bytes=base64ToBytes(project.importedRom);if(!format.recognizes(bytes))fail('Source engine is unsupported or a protected byte changed.');return bytes;}
function validate(project,{build=false}={}){
 const n=project.nativeGame;
 if(!n||Object.keys(n).sort().join(',')!=='edits,format,profile,projectionSha256,sourceSha256,version'||n.format!=='NESForgeNativeGame'||n.version!==1||n.profile!==format.id||project.version<13||!/^[a-f0-9]{64}$/.test(n.sourceSha256)||!/^[a-f0-9]{64}$/.test(n.projectionSha256))fail('Invalid native project descriptor.');
 const bytes=source(project);if(format.sha256(bytes)!==n.sourceSha256)fail('Source SHA-256 differs from the saved project.');format.validateEdits(n.edits);
 if(build&&signature(project)!==n.projectionSha256)fail('An editor asset or runtime setting changed without a native encoder. Undo that change to build; native location edits are supported in RE → Native game edit/build.');
 return {bytes,descriptor:n};
}
function edit(project,value){
 validate(project);format.validateEdits([value]);const n=cp(project.nativeGame),original=format.decode(source(project)).find(r=>r.region===value.region&&r.index===value.index).values[value.field];
 n.edits=n.edits.filter(e=>!(e.region===value.region&&e.index===value.index&&e.field===value.field));if(value.value!==original)n.edits.push(cp(value));
 n.edits.sort((a,b)=>a.region.localeCompare(b.region)||a.index-b.index||a.field.localeCompare(b.field));format.encode(source(project),n.edits);return n;
}
function build(project){const {bytes,descriptor}=validate(project,{build:true}),result=format.encode(bytes,descriptor.edits);return {rom:result.bytes,metadata:{prgSize:131072,chrSize:131072,changes:result.changes,sourceSha256:descriptor.sourceSha256,outputSha256:format.sha256(result.bytes)},diagnostics:[{severity:'info',code:'native-preservation',phase:'native-encode',message:result.changes.length+' changed byte(s); native header, mapper, code, CHR and all unedited data preserved.'},{severity:'warning',code:'native-edit-scope',phase:'native-encode',message:'Verified packed location fields only. This is not complete game RE or generic movement-rule compilation. Edited locations/selectors still require gameplay validation.'}]};}
async function create(bytes,name){
 if(!format.recognizes(bytes))fail('This milestone supports the investigated Zelda II engine and edits restricted to its verified location fields.');
 const input=Uint8Array.from(bytes),session=window.GameRENative.open(input,name),catalog=session.catalog();if(catalog.status!=='supported')fail('The native resource decoder is unavailable.');
 const api=services.GameREAssets,bundle=await api.seal(api.convert(session,{sceneId:catalog.scenes.find(s=>s.status!=='unavailable-slot').id,poseId:catalog.poses[0]?.id}));
 const d=await api.standalone(bundle);Object.assign(d,{projectName:(String(name||'Zelda II').replace(/\.nes$/i,'')+' · native project').slice(0,120),importedRom:bytesToBase64(input),mapper:1,mirroring:(input[6]&1)?'v':'h',hasSRAM:!!(input[6]&2),prgBanks:8,chrBanks:16,packScenes:true,gameplay:services.GameplayModel?Forge165.config.defaults():{},worldRuntime:services.WorldConfig.defaults(),audioRuntime:services.AudioConfig.defaults(),gameplayCore:services.GameplayModel.defaults(),orderList:[[0,0,0,0,0]]});
 const p=services.ProjectStore.prepareLoad(d);Object.assign(d,{scenes:p.scenes,worlds:p.worlds,metasprites:p.metasprites,animations:p.animations,patterns:p.patterns,instruments:p.instruments,sfx:p.sfx});
 d.nativeGame={format:'NESForgeNativeGame',version:1,profile:format.id,sourceSha256:format.sha256(input),projectionSha256:signature(d),edits:[]};validate(d,{build:true});return d;
}
function records(project){const {bytes,descriptor}=validate(project);return format.decode(format.encode(bytes,descriptor.edits).bytes);}
services.NativeEngineProject=Object.freeze({version:1,validate,signature,create,edit,build,records});
})();
