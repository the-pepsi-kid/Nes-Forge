/* Read-only source evidence belongs to the project, not a second asset model.
 * Existing decoders own recovery; existing asset imports own editable copies.
 * Catalogs are versioned, bounded and bound to the preserved source identity. */
(()=>{
'use strict';
const services=window.Forge.services,sha=b=>window.NativeEngineFormat.sha256(b),cp=v=>JSON.parse(JSON.stringify(v));
const digest=v=>sha(new TextEncoder().encode(JSON.stringify(v))),fail=m=>{throw Error('Investigation: '+m);};
function validate(project){
 if(services.NativeResourceProject?.matches(project))return services.NativeResourceProject.validateInvestigation(project);
 if(services.NativeLayoutProject?.matches(project))return services.NativeLayoutProject.validateInvestigation(project);
 if(services.ROMProject?.matches(project))return services.ROMProject.validateInvestigation(project);
 const n=project.investigation;if(!n||project.version<14||n.format!=='NESForgeInvestigation'||n.version!==1||Object.keys(n).sort().join(',')!=='catalogSha256,catalogs,format,source,version')fail('Invalid investigation descriptor; schema 14 is required.');
 if(!project.nativeGame)fail('A preserved native source is required.');
 const {bytes}=services.NativeEngineProject.validate(project),profile=window.GameRENative.profiles.find(p=>p.sha256===sha(bytes));
 if(!profile||n.source?.sha256!==project.nativeGame.sourceSha256||n.source.byteLength!==bytes.length||n.source.profile!==profile.id||typeof n.source.name!=='string'||!n.source.name||n.source.name.length>160)fail('Source identity does not match the investigated revision.');
 if(!n.catalogs||Object.keys(n.catalogs).sort().join(',')!=='audio,native,spatial'||!n.catalogSha256||Object.keys(n.catalogSha256).sort().join(',')!=='audio,native,spatial'||JSON.stringify(n).length>16*1024*1024)fail('Invalid or oversized recovered catalogs.');
 for(const kind of ['native','spatial','audio']){const c=n.catalogs[kind];if(!c||c.source?.sha256!==n.source.sha256||c.source.byteLength!==bytes.length||digest(c)!==n.catalogSha256[kind])fail('Recovered '+kind+' catalog is damaged or belongs to a different source.');}
 const c=n.catalogs;if(c.native.status!=='supported'||c.native.profile?.id!==profile.id||c.spatial.status!=='supported'||c.spatial.profile?.id!==profile.id||c.audio.status!=='decoded'||c.audio.profile?.sha256!==profile.sha256)fail('Recovered catalog profile is unsupported.');
 for(const key of ['scenes','actors','poses','animations','graphics','symbols','ram','limits'])if(!Array.isArray(c.native[key]))fail('Missing native '+key+' catalog.');
 if(!Array.isArray(c.spatial.maps)||!Array.isArray(c.audio.cues)||!Array.isArray(c.audio.limitations))fail('Incomplete map or Audio catalog.');return n;
}
async function create(bytes,name){
 const input=Uint8Array.from(bytes);if(services.NativeResourceProject?.recognizes(input))return services.NativeResourceProject.create(input,name);if(services.NativeLayoutProject?.recognizes(input))return services.NativeLayoutProject.create(input,name);const profile=window.GameRENative.profiles.find(p=>p.sha256===sha(input));if(!profile)return services.ROMProject.create(input,name);
 const source={name:String(name||profile.name).slice(0,160),sha256:sha(input),byteLength:input.length,profile:profile.id};
 const catalogs={native:window.GameRENative.open(input,source.name).catalog(),spatial:window.SpatialNative.inspect(input,source.name),audio:await window.NativeAudioCatalog.inspect(input)};
 const project=await services.NativeEngineProject.createPreserved(input,source.name);project.version=14;project.projectName=(source.name.replace(/\.nes$/i,'')+' · investigated game').slice(0,120);
 project.investigation={format:'NESForgeInvestigation',version:1,source,catalogs,catalogSha256:Object.fromEntries(Object.entries(catalogs).map(([k,v])=>[k,digest(v)]))};validate(project);return project;
}
function describe(n){
 if(!n)return null;if(n.version===4)return services.NativeResourceProject.describe(n);if(n.version===3)return services.NativeLayoutProject.describe(n);if(n.version===2)return services.ROMProject.describe(n);const c=n.catalogs,r=c.native;
 return {source:cp(n.source),rooms:r.scenes.length,contexts:new Set(r.scenes.map(s=>s.group)).size,maps:c.spatial.maps.length,actors:r.actors.length,poses:r.poses.length,scripts:r.animations.length,chrBanks:r.graphics.length,symbols:r.symbols.length,ram:r.ram.length,cues:c.audio.cues.length,gaps:cp(r.limits),audioGaps:cp(c.audio.limitations)};
}
services.InvestigationProject=Object.freeze({version:1,create,validate,describe});
})();
