/* Native NES 2bpp CHR extraction. Physical CHR ROM does not require a known
 * game engine or mapper execution. Runtime usage and palettes stay unknown. */
(()=>{
'use strict';
const services=window.Forge.services,methods=services.REMethods,ID='nes.physical-chr.v1',stages=new WeakSet();
const copy=value=>JSON.parse(JSON.stringify(value)),fail=message=>{throw Error('Native CHR: '+message);};
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
const limitations=Object.freeze(['Physical CHR ROM tiles only; compressed graphics and runtime CHR RAM require their own decoder or observed capture.','Mapper bank visibility, palettes, sprite grouping, maps, collision, gameplay and audio are unknown.','Imported tile sheets use an authored grayscale palette and generated tile layout. They are not recovered game scenes.','Original ROMs are never patched. Edited CHR exports are raw planar bytes; adding them to a game requires that game’s bank/layout contract.']);
function integer(v,min,max,name){if(!Number.isSafeInteger(v)||v<min||v>max)fail(name+' must be an integer from '+min+' to '+max+'.');return v;}
function encodeTiles(data){
  const tiles=Array.isArray(data)?data:data?.tiles;if(!Array.isArray(tiles)||!tiles.length||tiles.length>256)fail('Encode 1–256 tiles.');
  const bytes=[];for(const entry of tiles){const pixels=entry.pixels||entry;if(!Array.isArray(pixels)||pixels.length!==8||pixels.some(row=>!Array.isArray(row)||row.length!==8))fail('Each tile requires 8 × 8 pixels.');const low=[],high=[];for(const row of pixels){let a=0,b=0;for(const v of row){integer(v,0,3,'Pixel');a=(a<<1)|(v&1);b=(b<<1)|(v>>1);}low.push(a);high.push(b);}bytes.push(...low,...high);}return bytes;
}
methods.register({id:ID,version:1,name:'NES physical CHR-ROM bitplanes',domains:['graphics'],limitations,
  probe:analysis=>({supported:analysis.report.header.status==='valid'&&!!analysis.report.layout.chr&&analysis.report.layout.chr.length>=16,reason:analysis.report.layout.chr?'Validated container declares physical CHR ROM; engine and mapper execution are unnecessary.':analysis.report.header.status==='valid'?'No physical CHR ROM. Runtime CHR RAM remains unknown.':'A trusted NES container CHR range is required.'}),
  decode:(analysis,options)=>{
    const first=integer(options.firstTile??0,0,analysis.report.chr.tileCount-1,'First physical tile'),count=integer(options.count??Math.min(256,analysis.report.chr.tileCount-first),1,Math.min(256,analysis.report.chr.tileCount-first),'Tile count');
    const start=analysis.report.layout.chr.start+first*16,tiles=Array.from({length:count},(_,i)=>{const t=analysis.readChrTile(first+i);return {id:'chr:'+analysis.report.identity.sha256+':'+(first+i),index:first+i,fileOffset:t.fileOffset,physicalBank4KiB:Math.floor((first+i)/256),bankTile:(first+i)%256,pixels:t.pixels,ppuMapping:t.ppuMapping};});
    return {format:'NESForgeNativeCHR',version:1,firstTile:first,tileCount:count,encodedSpan:{start,length:count*16},tiles,evidence:[{status:'decoded',claim:'NES two-plane pattern values decoded directly from declared physical CHR ROM.',ranges:[{start,length:count*16,bank:'Physical CHR tile range '+first+'–'+(first+count-1)}]}],unknown:['palette','visible-bank','tile-usage','scene','collision','audio']};
  },encode:encodeTiles});
function stage(analysis,options={}){
  const decoded=methods.decode(ID,analysis,options),roundTrip=methods.validateRoundTrip(ID,analysis,options);if(!roundTrip.passed)fail('Bitplane round-trip failed; no import is available.');
  const sceneId='re-chr-'+decoded.source.sha256+'-'+decoded.firstTile+'-'+decoded.tileCount;
  const conversion=methods.evidence({status:'converted',claim:'Source tile pixels become editable Forge tiles; the grayscale palette and sheet layout are authored inspection aids, not recovered scene data.',ranges:[decoded.encodedSpan]},decoded.source);
  const report=freeze({format:'NESForgeNativeAssetRecovery',version:1,method:decoded.method,source:decoded.source,sceneId,firstTile:decoded.firstTile,tileCount:decoded.tileCount,encodedSpan:decoded.encodedSpan,tiles:decoded.tiles.map(t=>({id:t.id,index:t.index,fileOffset:t.fileOffset,physicalBank4KiB:t.physicalBank4KiB,bankTile:t.bankTile})),evidence:[...decoded.evidence,roundTrip.evidence,conversion],unknown:decoded.unknown,limitations});
  const project=services.ProjectStore,guard=Object.freeze({epoch:project.state.epoch,snapshot:project.serialize()});
  const result=Object.freeze({report,decoded,guard});stages.add(result);return result;
}
function importStaged(staged){
  if(!stages.has(staged))fail('Preview the native tiles in this editor before importing.');
  const store=services.ProjectStore;if(staged.guard.epoch!==store.state.epoch||staged.guard.snapshot!==store.serialize())fail('The project changed after preview. Preview this tile range again.');
  const p=JSON.parse(staged.guard.snapshot),r=staged.report;if(p.scenes.length>=64)fail('The project already has 64 scenes.');if(p.scenes.some(s=>s.id===r.sceneId))fail('This physical tile range is already imported; edit the existing sheet.');
  const tiles=staged.decoded.tiles.map(t=>copy(t.pixels));while(tiles.length<256)tiles.push(Array.from({length:8},()=>Array(8).fill(0)));
  const pal=Array.from({length:4},()=>[15,0,16,48]),nt=Array.from({length:960},(_,i)=>{const x=i%32,y=Math.floor(i/32);return x<16&&y<16&&y*16+x<r.tileCount?y*16+x:0;});
  const sc=makeScene({id:r.sceneId,name:('CHR '+r.firstTile+'–'+(r.firstTile+r.tileCount-1)+' · '+r.source.name).slice(0,120),chr:tiles,sprChr:normalizeTiles(),nt,pal,sprPal:pal,tileProps:Array(256).fill(0),attr:Array(64).fill(0),entities:[],links:[],oam:[],sceneType:'static',scrollDir:'none',buildInclude:false,buildOrder:p.scenes.length,captureMeta:{mode:'native-chr',note:'Authored tile sheet; source palette, map and collision are unknown.',recovery:copy(r)}});
  p.scenes.push(sc);p.activeScene=p.scenes.length-1;p.chrBank='bg';p.selTile=0;p.editTile=0;
  const prepared=store.prepareLoad(p);snapshot();store.commit(prepared,{sync:true,intent:'native-chr-import'});notify('nativeChrImport');return Object.freeze({sceneId:sc.id,tileCount:r.tileCount});
}
function validateRecovery(r){
  let json;try{json=JSON.stringify(r);}catch(_){fail('Recovery metadata must be ordinary JSON.');}if(!json||json.length>262144)fail('Recovery metadata exceeds the 256 KiB limit.');
  if(r?.format!=='NESForgeNativeAssetRecovery'||r.version!==1||r.method?.id!==ID||r.method?.version!==1)fail('Unsupported native recovery metadata.');
  if(typeof r.source?.name!=='string'||r.source.name.length>512||! /^[0-9a-f]{64}$/.test(r.source?.sha256))fail('Invalid recovery source identity.');
  integer(r.source.byteLength,1,64*1024*1024,'Source byte length');integer(r.tileCount,1,256,'Persisted tile count');integer(r.firstTile,0,4194303,'Persisted first tile');
  if(r.sceneId!=='re-chr-'+r.source.sha256+'-'+r.firstTile+'-'+r.tileCount)fail('Recovery scene identity does not match its source range.');
  if(!r.encodedSpan||r.encodedSpan.length!==r.tileCount*16)fail('Invalid recovery encoded span.');integer(r.encodedSpan.start,16,r.source.byteLength-r.encodedSpan.length,'Source file offset');
  if(!Array.isArray(r.tiles)||r.tiles.length!==r.tileCount)fail('Recovery tile metadata count differs.');
  r.tiles.forEach((t,i)=>{const index=r.firstTile+i;if(!t||t.index!==index||t.id!=='chr:'+r.source.sha256+':'+index||t.fileOffset!==r.encodedSpan.start+i*16||t.physicalBank4KiB!==Math.floor(index/256)||t.bankTile!==index%256)fail('Recovery tile identity or physical range differs.');});
  if(!Array.isArray(r.evidence)||!r.evidence.length||r.evidence.length>8)fail('Invalid recovery evidence collection.');
  r.evidence.forEach(e=>{if(e.sourceSha256!==r.source.sha256)fail('Recovery evidence refers to a different source.');methods.evidence(e,r.source);});
  return freeze(copy(r));
}
function exportEditedChr(sceneId){
  const p=services.ProjectStore.capture(),scene=p.scenes.find(s=>s.id===sceneId),r=scene?.captureMeta?.recovery;
  if(!scene||r?.format!=='NESForgeNativeAssetRecovery'||r.method?.id!==ID||r.sceneId!==sceneId)fail('Select a native CHR import scene.');
  validateRecovery(r);
  const bytes=methods.encode(ID,scene.chr.slice(0,r.tileCount));return freeze({bytes,source:r.source,sceneId,firstTile:r.firstTile,tileCount:r.tileCount,sourceFileOffset:r.encodedSpan.start,format:'NES planar CHR',originalUnchanged:true});
}
services.RENativeAssets=Object.freeze({version:1,methodId:ID,stage,importStaged,exportEditedChr,validateRecovery,encodeTiles:tiles=>methods.encode(ID,tiles)});
})();
