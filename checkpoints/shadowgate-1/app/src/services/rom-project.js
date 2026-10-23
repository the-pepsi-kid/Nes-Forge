/* A container is enough to preserve a ROM project, but never enough to infer
 * its stages or engine. Physical CHR sheets reuse the existing asset decoder.
 * The original bytes have one owner, importedRom; native output is unchanged. */
(()=>{
'use strict';
const services=window.Forge.services,format=window.NativeEngineFormat,cp=x=>JSON.parse(JSON.stringify(x));
const profile='nes-container-preserved-v1',maxBytes=16*1024*1024,maxSheets=64;
const fail=m=>{throw Error('ROM project: '+m);},digest=x=>format.sha256(new TextEncoder().encode(JSON.stringify(x)));
const matches=p=>p?.nativeGame?.profile===profile;
function container(bytes){
 if(!(bytes instanceof Uint8Array)||!bytes.length||bytes.length>maxBytes)fail('Choose NES bytes of at most 16 MiB.');
 const report=services.REAnalysis.inspectContainer(bytes,{allowLegacyHeaderLayout:true});
 if(report.header.status!=='valid')fail('No bounded NES container layout. Use general byte inspection for this input.');
 return report;
}
// Native adapters share source/inspection checks while retaining ownership
// of their own projections. CHR-backed records need no independent CHR copy.
function validateSource(p){
 const n=p?.nativeGame;
 if(!n||!/^[a-f0-9]{64}$/.test(n.sourceSha256)||typeof p.importedRom!=='string'||p.importedRom.length>Math.ceil(maxBytes/3)*4)fail('Preserved source bytes are missing or oversized.');
 const bytes=base64ToBytes(p.importedRom),c=container(bytes);
 if(format.sha256(bytes)!==n.sourceSha256)fail('Preserved source identity differs.');
 return {bytes,container:c};
}
function validate(p,{build=false}={}){
 const n=p.nativeGame;
 if(!matches(p)||p.version!==16||n.format!=='NESForgeNativeGame'||n.version!==3||Object.keys(n).sort().join(',')!=='edits,format,profile,projectionSha256,resources,sourceSha256,version'||!Array.isArray(n.edits)||n.edits.length||!/^[a-f0-9]{64}$/.test(n.sourceSha256)||!/^[a-f0-9]{64}$/.test(n.projectionSha256))fail('Invalid portable source descriptor; schema 16 is required.');
 const {bytes,container:c}=validateSource(p);
 const count=Math.min(maxSheets,Math.ceil((c.layout.chr?.length||0)/4096));
 if(!Array.isArray(n.resources)||n.resources.length!==count)fail('Physical CHR bindings differ from the source layout.');
 for(let i=0;i<count;i++){
  const b=n.resources[i],firstTile=i*256,tileCount=Math.min(256,c.layout.chr.length/16-firstTile),id='re-chr-'+n.sourceSha256+'-'+firstTile+'-'+tileCount;
  if(!b||Object.keys(b).sort().join(',')!=='firstTile,sceneId,tileCount'||b.firstTile!==firstTile||b.tileCount!==tileCount||b.sceneId!==id)fail('Physical CHR bank ownership differs.');
  const scene=p.scenes?.find(s=>s.id===id),r=scene?.captureMeta?.recovery;
  if(!scene||r?.source?.sha256!==n.sourceSha256||r.source.byteLength!==bytes.length||r.sceneId!==id||r.firstTile!==firstTile||r.tileCount!==tileCount||r.encodedSpan?.start!==c.layout.chr.start+firstTile*16)fail('A bound CHR copy is missing or belongs to another source range.');
  services.RENativeAssets.validateRecovery(r);
 }
 if(build&&services.NativeEngineProject.signature(p)!==n.projectionSha256)fail('An editable copy or runtime setting changed. No native encoder is registered for those edits. Save the project or export raw CHR; Undo the change to output the unchanged source.');
 return {bytes,descriptor:n,container:c};
}
function validateInspection(n,bytes,expectedProfile=profile){
 const c=container(bytes);
 if(n?.format!=='NESForgeInvestigation'||n.version!==2||Object.keys(n).sort().join(',')!=='catalogSha256,catalogs,format,source,version'||Object.keys(n.catalogs||{}).join(',')!=='inspection'||Object.keys(n.catalogSha256||{}).join(',')!=='inspection')fail('Invalid source inspection catalog.');
 if(n.source?.sha256!==format.sha256(bytes)||n.source.profile!==expectedProfile||n.source.byteLength!==bytes.length||typeof n.source.name!=='string'||!n.source.name||n.source.name.length>160)fail('Inspection source identity differs.');
 const report=n.catalogs.inspection;
 if(!report||JSON.stringify(report).length>131072||report.format!=='NESForgeREInspection'||report.identity?.sha256!==n.source.sha256||report.identity.byteLength!==bytes.length||digest(report)!==n.catalogSha256.inspection||JSON.stringify(report.header)!==JSON.stringify(c.header)||JSON.stringify(report.layout)!==JSON.stringify(c.layout))fail('Inspection catalog is damaged or refers to another physical layout.');
 return n;
}
function validateInvestigation(p){const {bytes}=validate(p);return validateInspection(p.investigation,bytes);}
async function create(input,name){
 const bytes=Uint8Array.from(input),c=container(bytes),source={name:String(name||'NES source').slice(0,160),sha256:format.sha256(bytes),byteLength:bytes.length,profile};
 const analysis=await services.REAnalysis.open(bytes,{name:source.name,allowLegacyHeaderLayout:true}),scenes=[],resources=[];
 const sheets=Math.min(maxSheets,Math.ceil((c.layout.chr?.length||0)/4096));
 for(let i=0;i<sheets;i++){
  const firstTile=i*256,tileCount=Math.min(256,analysis.report.chr.tileCount-firstTile),scene=services.RENativeAssets.projectScene(analysis,{firstTile,count:tileCount},i);
  scene.name='Physical CHR '+i+' · tiles '+firstTile+'–'+(firstTile+tileCount-1);
  scenes.push(scene);resources.push({sceneId:scene.id,firstTile,tileCount});
 }
 if(!scenes.length)scenes.push(makeScene({id:'source-scratchpad-'+source.sha256,name:'Scratchpad · source CHR RAM unresolved',chr:normalizeTiles(),sprChr:normalizeTiles(),tileProps:Array(256).fill(0),buildInclude:false,captureMeta:{mode:'source-scratchpad',note:'Empty authored scratchpad. The source has no stored CHR ROM; runtime graphics and game scenes remain unresolved.'}}));
 const h=c.header,p={format:'NESForge',version:12,foundation:Forge.release.version,projectName:(source.name.replace(/\.nes$/i,'')+' · ROM project').slice(0,120),scenes,activeScene:0,worlds:[],animations:[],metasprites:[],gameplay:Forge165.config.defaults(),worldRuntime:services.WorldConfig.defaults(),audioRuntime:services.AudioConfig.defaults(),gameplayCore:services.GameplayModel.defaults(),asmSource:'',instruments:[],patterns:[],orderList:[[0,0,0,0,0]],sfx:[],tempo:150,speed:6,audRows:64,mapper:h.mapper,mirroring:(bytes[6]&1)?'v':'h',hasSRAM:!!(bytes[6]&2),prgBanks:Math.ceil(h.prgSize/16384),chrBanks:Math.ceil(h.chrSize/8192),packScenes:true,importedRom:null,selTile:0,editTile:0,selSprite:-1,selEntity:-1,chrBank:'bg',_selAnim:0,_animFrame:0};
 const normalized=services.ProjectStore.prepareLoad(p);
 for(const key of ['scenes','worlds','metasprites','animations','patterns','instruments','sfx'])p[key]=cp(normalized[key]);
 p.importedRom=bytesToBase64(bytes);p.version=16;p.nativeGame={format:'NESForgeNativeGame',version:3,profile,sourceSha256:source.sha256,projectionSha256:services.NativeEngineProject.signature(p),resources,edits:[]};
 p.investigation={format:'NESForgeInvestigation',version:2,source,catalogs:{inspection:cp(analysis.report)},catalogSha256:{inspection:digest(analysis.report)}};
 validateInvestigation(p);validate(p,{build:true});return p;
}
function describe(n){
 const r=n.catalogs.inspection,h=r.header;
 return {kind:'container',source:cp(n.source),rooms:0,contexts:0,maps:0,actors:0,poses:0,scripts:0,chrBanks:Math.ceil(h.chrSize/4096),symbols:0,ram:0,cues:0,header:cp(h),layout:cp(r.layout),gaps:[...r.warnings,'Physical CHR sheets are editable copies with an authored grayscale layout; they are not decoded game scenes.','Stages, World layouts, collision, actors, animation, Audio drivers and native edit encoders remain unresolved.',...(h.chrSize?[]:['CHR RAM has no stored tile banks. The empty scratchpad is authored; runtime graphics need a verified decoder or capture.']),...(h.chrSize>maxSheets*4096?['Only the first 64 physical CHR sheets are copied; the entire original ROM is preserved.']:[])],audioGaps:[]};
}
function donor(p,sceneId){
 validate(p);const binding=p.nativeGame.resources.find(b=>b.sceneId===sceneId),source=p.scenes.find(s=>s.id===sceneId);
 if(!binding||!source)fail('Select an imported physical CHR sheet. CHR RAM needs a decoder or runtime capture first.');
 // A physical bank has no known background/sprite role. Both donor choices use
 // these same copied pixels deliberately; neither is labeled a recovered pose.
 const scene=cp(source);scene.sprChr=cp(scene.chr);scene.buildInclude=true;scene.buildOrder=0;scene.entities=[];scene.links=[];scene.oam=[];
 scene.name='CHR donor · '+binding.firstTile+'–'+(binding.firstTile+binding.tileCount-1);
 // Construct a graphics donor instead of copying unrelated authored Audio,
 // actors, notes or workspace state along with the selected physical bank.
 const d={format:'NESForge',foundation:Forge.release.version,version:12,projectName:(p.projectName+' · CHR donor '+binding.firstTile).slice(0,120),importedRom:null,scenes:[scene],activeScene:0,worlds:[],mapper:0,mirroring:'v',prgBanks:1,chrBanks:1,hasSRAM:false,packScenes:true,animations:[],metasprites:[],gameplay:Forge165.config.defaults(),worldRuntime:services.WorldConfig.defaults(),audioRuntime:services.AudioConfig.defaults(),gameplayCore:services.GameplayModel.defaults(),instruments:[],patterns:[],orderList:[[0,0,0,0,0]],sfx:[],tempo:150,speed:6,audRows:64,chrBank:'bg',asmSource:'',selTile:0,editTile:0,selSprite:-1,selEntity:-1,_selAnim:0,_animFrame:0};
 for(const key of ['chr','sprChr','nt','attr','pal','sprPal','oam','tileProps'])d[key]=cp(scene[key]);
 const prepared=services.ProjectStore.prepareLoad(d);for(const key of ['patterns','instruments','sfx'])d[key]=cp(prepared[key]);return d;
}
function build(p){const {bytes,descriptor:n,container:c}=validate(p,{build:true});return {rom:bytes.slice(),metadata:{prgSize:c.header.prgSize,chrSize:c.header.chrSize,changes:[],sourceSha256:n.sourceSha256,outputSha256:n.sourceSha256},diagnostics:[{severity:'info',code:'native-preservation',phase:'native-encode',message:'Unchanged source output. Every original byte, including legacy header and trailing data, is preserved.'},{severity:'warning',code:'native-edit-scope',phase:'native-encode',message:services.NativeEngineProject.capabilities(profile).buildScope+' Browser mapper/platform execution is checked separately.'}]};}
services.ROMProject=Object.freeze({profile,maxBytes,maxSheets,matches,container,create,validate,validateSource,validateInspection,validateInvestigation,describe,donor,build});
})();
