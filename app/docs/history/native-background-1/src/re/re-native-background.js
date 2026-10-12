/* Shared native-background conversion. Format modules interpret source bytes;
 * REMethods owns discovery/dispatch, ProjectStore owns edits, and the ordinary
 * compiler owns the independent static-viewer output. No ROM code is executed. */
(()=>{
'use strict';
const services=window.Forge.services,methods=services.REMethods,stages=new WeakSet();
const copy=value=>JSON.parse(JSON.stringify(value));
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
const fail=message=>{throw Error('Native background: '+message);};
const commonLimits=Object.freeze([
  'One static background and its physical CHR bank only. Sprites, scrolling, animation, collision, actors, audio and game logic are not recovered.',
  'Import adds an editable scene excluded from the current build. Download background project creates a separate Forge static viewer; it does not recreate the original program.',
  'The source ROM is unchanged. There is no native ROM patch, inverse encoder or whole-game reconstruction claim.',
  'Forge displays the underlying 256 × 240 background with its own rendering mask. Original clipping, sprite overlays and later runtime writes are not reproduced.'
]);
function bytes(value,length,label,max=255){if(!Array.isArray(value)||value.length!==length||value.some(v=>!Number.isInteger(v)||v<0||v>max))fail(label+' must contain '+length+' bounded bytes.');return value;}
function textList(value,label){if(!Array.isArray(value)||value.length>64||value.some(v=>typeof v!=='string'||!v.trim()||v.length>2000))fail('Invalid '+label+'.');return value;}
function parseNrom(input,options={}){
  const b=input instanceof Uint8Array?input:Uint8Array.from(input||[]),reject=message=>{const e=Error(message);e.code='UNSUPPORTED_NROM';throw e;};
  if(b.length<16||b[0]!==78||b[1]!==69||b[2]!==83||b[3]!==26)reject('An iNES NROM container is required.');
  if(![1,2].includes(b[4])||b[5]!==1||(b[6]&0xfe)||b[7]||b[8]||b[9]||b[11]||b[12]||b[13]||b[14]||b[15])reject('This background method requires NTSC mapper 0 without a trainer, 16/32 KiB PRG and 8 KiB physical CHR.');
  if(b[10]!==0&&!(options.reservedByte10===0x10&&b[10]===0x10))reject('The reserved header fields are outside this method’s declared layout.');
  const prgStart=16,prgSize=b[4]*16384,chrStart=16+prgSize,chrSize=8192;
  if(b.length!==chrStart+chrSize)reject('The NROM container length does not match its declared banks.');
  function cpuToFile(address,length=1){if(!Number.isInteger(address)||!Number.isInteger(length)||length<0||address<0x8000||address+length>0x10000)reject('CPU span is outside NROM PRG.');const offset=(address-0x8000)%prgSize;if(offset+length>prgSize)reject('CPU span crosses the physical PRG mirror.');return prgStart+offset;}
  function fileToCpu(offset){if(!Number.isInteger(offset)||offset<prgStart||offset>=chrStart)reject('File address is outside NROM PRG.');return (prgSize===16384?0xc000:0x8000)+offset-prgStart;}
  return Object.freeze({prgStart,prgSize,chrStart,chrSize,cpuToFile,fileToCpu,mirroring:b[6]&1?'v':'h',reservedByte10:b[10]});
}
function validateBackground(value,source){
  if(!value||typeof value!=='object'||Array.isArray(value))fail('The decoder returned no background record.');
  const b=copy(value);if(typeof b.key!=='string'||!/^[a-z0-9][a-z0-9.-]{0,79}$/.test(b.key)||typeof b.label!=='string'||!b.label.trim()||b.label.length>160)fail('A bounded resource key and label are required.');
  bytes(b.chrBytes,4096,'Background CHR');bytes(b.nametable,1024,'Nametable');bytes(b.palette,32,'Palette',63);
  if(!Array.isArray(b.knownNametable)||b.knownNametable.length!==1024||b.knownNametable.some(v=>typeof v!=='boolean'))fail('Every nametable byte requires a known/unknown marker.');
  if(b.knownNametable.slice(0,960).some(v=>!v))fail('Unknown tile placement is not convertible by this background subset.');
  if(![0,1].includes(b.backgroundPatternTable))fail('The source background pattern bank must be proven.');
  if(b.ppuMask!==undefined&&(!Number.isInteger(b.ppuMask)||b.ppuMask<0||b.ppuMask>255||(b.ppuMask&0xe1)))fail('Greyscale/emphasis or invalid PPU masks require a separate conversion.');
  textList(b.unknown,'unknowns');textList(b.limitations,'decoder limitations');
  if(!Array.isArray(b.evidence)||!b.evidence.length||b.evidence.length>64)fail('The background requires bounded physical evidence.');
  b.evidence=b.evidence.map(item=>methods.evidence(item,source));
  const encoded=JSON.stringify(b.construction);if(!encoded||encoded.length>180000)fail('Construction evidence exceeds its bounded record.');
  for(let i=960;i<1024;i++)if(!b.knownNametable[i])b.nametable[i]=0;
  return freeze(b);
}
function decodeTiles(data){return Array.from({length:256},(_,tile)=>Array.from({length:8},(_,y)=>Array.from({length:8},(_,x)=>((data[tile*16+y]>>(7-x))&1)|(((data[tile*16+y+8]>>(7-x))&1)<<1))));}
function convert(background,source,method){
  const b=validateBackground(background,source),sceneId='re-bg-'+source.sha256+'-'+method.id+'-'+b.key;
  const missing=b.knownNametable.map((known,i)=>known?null:i).filter(i=>i!==null);
  const adaptations=[...commonLimits,...b.limitations];
  if(missing.length)adaptations.push('The native loader leaves '+missing.length+' attribute byte(s) dependent on prior PPU state (nametable indices '+missing.join(', ')+'). The Forge conversion explicitly fills them with zero; these values are authored defaults, not recovered source data.');
  if(b.palette.slice(0,16).some((v,i)=>i%4===0&&v!==b.palette[0]))adaptations.push('Unused background palette slots at indices 4, 8 and 12 normalize to the universal background color. The raw native palette remains in this evidence record.');
  const evidence=[...b.evidence,methods.evidence({status:'converted',claim:'Decoded static CHR, placement, attributes and palette become a canonical Forge scene. Listed unknown attributes use disclosed zero defaults; the generated viewer replaces the original program and rendering mask.',ranges:b.evidence.flatMap(e=>e.ranges).slice(0,128)},source)];
  const report=freeze({format:'NESForgeNativeBackgroundRecovery',version:1,method:copy(method),source:copy(source),sceneId,key:b.key,label:b.label,backgroundPatternTable:b.backgroundPatternTable,nativePalette:b.palette,knownNametable:b.knownNametable,unknownAttributeIndices:missing,sourcePpuMask:b.ppuMask??null,construction:b.construction,evidence,unknown:b.unknown,limitations:adaptations});
  const pal=Array.from({length:4},(_,i)=>[b.palette[0],...b.palette.slice(i*4+1,i*4+4)]),chr=decodeTiles(b.chrBytes);
  const scene=makeScene({id:sceneId,name:b.label,chr,sprChr:normalizeTiles(),nt:b.nametable.slice(0,960),attr:b.nametable.slice(960),pal,sprPal:pal,bgColor:b.palette[0],tileProps:Array(256).fill(0),entities:[],oam:[],links:[],sceneType:'static',scrollDir:'none',buildInclude:false,buildOrder:0,captureMeta:{mode:'native-background',note:'Static native background converted to Forge; original game behavior is not recovered.',recovery:copy(report)}});
  return {scene,report};
}
function registerAdapter(spec){
  if(!spec||typeof spec.decode!=='function')fail('A trusted format decoder is required.');
  const descriptor={id:spec.id,version:1,name:spec.name};
  async function decoded(analysis,context){
    if(context.source.byteLength>40976)return {status:'unsupported',reason:'This static NROM method is bounded to 16/32 KiB PRG and 8 KiB CHR.',evidence:[]};
    const value=Uint8Array.from(context.read(0,context.source.byteLength).bytes);context.consume(value.length*4);context.throwIfAborted();
    const result=spec.decode(value);context.throwIfAborted();
    if(result?.status!=='supported')return {status:result?.status||'invalid',reason:result?.reason||'No supported native background was decoded.',evidence:[]};
    const background=validateBackground(result.background,context.source);
    return {status:'supported',reason:result.reason,evidence:background.evidence,data:background};
  }
  function options(input,source){if(Object.keys(input).some(key=>key!=='expectedSourceSha256'))fail('Unsupported background recovery option.');if(input.expectedSourceSha256!==undefined&&input.expectedSourceSha256!==source.sha256)fail('The selected source identity changed.');}
  return methods.registerProfile({id:spec.id,version:1,contractVersion:2,name:spec.name,domains:['graphics'],limitations:[...commonLimits,...spec.limitations],limits:{maxSourceBytes:40976,maxWork:1048576},operations:{decode:{label:'Decode native background records',effect:'read-only'},convert:{label:'Preview editable background',effect:'preview',fidelity:'subset'}},probe:decoded,handlers:{decode:async(analysis,input,context)=>{options(input,context.source);return decoded(analysis,context);},convert:async(analysis,input,context)=>{options(input,context.source);const result=await decoded(analysis,context);if(result.status!=='supported')return result;const data=convert(result.data,context.source,descriptor);return {status:'supported',reason:'The declared static background can be converted to an editable Forge scene, with the listed runtime differences.',evidence:data.report.evidence,data};}}});
}
function standalone(scene,source){
  const sc=copy(scene);sc.buildInclude=true;sc.buildOrder=0;
  return {format:'NESForge',version:services.ProjectStore.schema,foundation:window.Forge.release.version,romLayout:3,worldAuthoring:3,metatileExtension:1,metaspriteExtension:2,entityAnimationExtension:1,projectName:(source.name+' — background').slice(0,120),scenes:[sc],activeScene:0,chr:sc.chr,sprChr:sc.sprChr,nt:sc.nt,attr:sc.attr,pal:sc.pal,sprPal:sc.sprPal,oam:[],tileProps:sc.tileProps,worlds:[],gameplay:Forge165.config.defaults(),worldRuntime:services.WorldConfig.defaults(),audioRuntime:services.AudioConfig.defaults(),gameplayCore:services.GameplayModel.defaults(),metasprites:[],animations:[],instruments:[],patterns:[{rows:Array.from({length:64},()=>Array.from({length:5},()=>({note:-1,inst:-1,vol:-1,fx:0,fxp:0})))}],orderList:[[0,0,0,0,0]],audRows:64,tempo:150,speed:6,sfx:[],asmSource:'',mapper:0,mirroring:'v',hasSRAM:false,prgBanks:1,chrBanks:1,packScenes:true,importedRom:null,selTile:0,editTile:0,selSprite:-1,selEntity:-1,chrBank:'bg',_selAnim:0,_animFrame:0};
}
function checkSignal(signal){if(signal?.aborted){const error=Error('Background recovery cancelled.');error.name='AbortError';throw error;}}
async function stage(analysis,methodId,options={},controls={}){
  const store=services.ProjectStore,guard=Object.freeze({epoch:store.state.epoch,snapshot:store.serialize()});
  const result=await methods.dispatch(methodId,'convert',analysis,options,controls);checkSignal(controls.signal);
  if(result.status!=='supported')fail(result.reason);
  const data=result.data;if(!data?.scene||data.report?.format!=='NESForgeNativeBackgroundRecovery')fail('This method does not produce a native background scene.');
  validateRecovery(data.report);
  if(data.report.method.id!==methodId||data.scene.id!==data.report.sceneId||JSON.stringify(data.scene.captureMeta?.recovery)!==JSON.stringify(data.report))fail('Background scene and method evidence differ.');
  if(data.report.source.sha256!==analysis.report.identity.sha256||data.report.source.byteLength!==analysis.report.identity.byteLength)fail('Background preview refers to another source.');
  const project=standalone(data.scene,result.source);store.prepareLoad(project);
  const artifact=services.RuntimeCompiler.compileDetached(project,{allowViewer:true});checkSignal(controls.signal);
  if(!window.crypto?.subtle?.digest)fail('SHA-256 is unavailable in this context.');
  const digest=await window.crypto.subtle.digest('SHA-256',artifact.rom);checkSignal(controls.signal);
  if(store.state.epoch!==guard.epoch||store.serialize()!==guard.snapshot)fail('The project changed during preview. Preview again.');
  const resultStage=freeze({report:data.report,scene:data.scene,project,guard,previewBuild:{backend:artifact.backend,byteLength:artifact.rom.length,sha256:Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('')}});stages.add(resultStage);return resultStage;
}
function importStaged(value){
  if(!stages.has(value))fail('Preview this background in the current editor before importing.');
  const result=services.ProjectStore.appendScene(value.scene,{expected:value.guard,intent:'nativeBackgroundImport',select:true});
  return Object.freeze({...result,sceneId:value.scene.id});
}
function validateRecovery(value){
  const encoded=JSON.stringify(value);if(!encoded||encoded.length>262144)fail('Recovery evidence exceeds 256 KiB.');
  const r=copy(value);if(r?.format!=='NESForgeNativeBackgroundRecovery'||r.version!==1||r.method?.version!==1||typeof r.method.id!=='string'||!/^nes\.[a-z0-9.-]+\.v1$/.test(r.method.id))fail('Unsupported background evidence format.');
  if(!/^[0-9a-f]{64}$/.test(r.source?.sha256)||!Number.isInteger(r.source.byteLength)||r.source.byteLength<16||r.source.byteLength>40976||typeof r.source.name!=='string'||r.source.name.length>512)fail('Invalid background source identity.');
  if(typeof r.key!=='string'||!/^[a-z0-9][a-z0-9.-]{0,79}$/.test(r.key)||r.sceneId!=='re-bg-'+r.source.sha256+'-'+r.method.id+'-'+r.key)fail('The background scene identity differs from its source.');
  if(typeof r.label!=='string'||!r.label.trim()||r.label.length>160||typeof r.method.name!=='string'||!r.method.name.trim()||r.method.name.length>160)fail('Invalid background evidence labels.');
  if(![0,1].includes(r.backgroundPatternTable)||r.sourcePpuMask!==null&&(!Number.isInteger(r.sourcePpuMask)||r.sourcePpuMask<0||r.sourcePpuMask>255||(r.sourcePpuMask&0xe1)))fail('Invalid background pattern bank or PPU mask evidence.');
  if(!r.construction||typeof r.construction!=='object'||Array.isArray(r.construction)||JSON.stringify(r.construction).length>180000)fail('Invalid bounded background construction evidence.');
  bytes(r.nativePalette,32,'Persisted native palette',63);
  if(!Array.isArray(r.knownNametable)||r.knownNametable.length!==1024||r.knownNametable.some(v=>typeof v!=='boolean')||r.knownNametable.slice(0,960).some(v=>!v))fail('Invalid persisted nametable coverage.');
  const unknown=r.knownNametable.map((v,i)=>v?null:i).filter(v=>v!==null);if(JSON.stringify(unknown)!==JSON.stringify(r.unknownAttributeIndices))fail('Unknown attribute evidence differs from its coverage.');
  textList(r.unknown,'persisted unknowns');textList(r.limitations,'persisted limitations');
  if(!Array.isArray(r.evidence)||!r.evidence.length||r.evidence.length>65)fail('Invalid persisted physical evidence.');r.evidence.forEach(e=>{if(e.sourceSha256!==r.source.sha256)fail('Persisted evidence refers to a different source.');methods.evidence(e,r.source);});
  return freeze(r);
}
services.RENativeBackground=Object.freeze({version:1,parseNrom,registerAdapter,stage,importStaged,validateRecovery});
})();
