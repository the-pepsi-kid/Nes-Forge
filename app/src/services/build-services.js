/* NES Forge 1.6.7 — authoritative build graph and existing-backend dispatch.
 * Live preparation commits active editor buffers and normalizes IDs once.
 * Generated builds pass their copied source explicitly to retained codecs.
 * Detached preflight uses the same pipeline without capture, commit or UI.
 * Custom assembly remains live-only and publishes diagnostics to S/UI.
 */
(()=>{
'use strict';
const Forge=window.Forge=window.Forge||{},services=Forge.services=Forge.services||{};
const $=id=>document.getElementById(id),cp=value=>JSON.parse(JSON.stringify(value));
const E=new TextEncoder();
const profile=Object.freeze({id:'nrom-existing',mapper:0,prgBytes:Object.freeze([16384,32768]),chrBytes:8192,
  chrTilesPerBank:256,maxPackedScenes:7,maxOAM:64,maxSceneEntities:16,sceneBase:0xD000,sceneStride:0x600,
  metadataStart:0xC200,markerAddress:0xCFF0,vectorsAddress:0xFFFA,gameplayBase:0x8000,gameplayConfig:0xB800,gameplayConfigCapacity:0x800});
const phaseOrder=Object.freeze(['prepare-snapshot','select-remap','atlas','metatile-metadata','world-metadata',
  'asset-link-encode','audio-link','gameplay-core-link','code-occupancy','allocation','scene-metadata-pack','chr-serialize','gameplay-compile','artifact']);
const completedPlans=new WeakSet();
function concat(...parts){const result=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let at=0;for(const p of parts){result.set(p,at);at+=p.length;}return result;}
function diagnostic(severity,code,message,phase,details={}){return {severity,code,message,phase,...details};}
function selectedSceneEntries(scenes=S.scenes){return scenes.map((sc,index)=>({sc,index,order:clamp(sc.buildOrder??index,0,9999,index)})).filter(e=>e.sc.buildInclude!==false).sort((a,b)=>a.order-b.order||a.index-b.index);}
function remapBuildScenes(entries,scenes){
  if(!entries.length)throw Error('Select at least one scene for the ROM build.');
  if(entries.length>profile.maxPackedScenes)throw Error('Build set contains '+entries.length+' scenes; NROM viewer maximum is '+profile.maxPackedScenes+'. Uncheck scenes or change the build set.');
  const map=new Map(entries.map((e,i)=>[e.index,i]));
  const copies=entries.map(e=>{
    const sc=makeScene({...cp(e.sc),id:e.sc.id});sc._sourceIndex=e.index;
    for(const ent of sc.entities||[])if(ent.type==='door'&&Number.isInteger(ent.targetScene)&&ent.targetScene>=0){
      if(!map.has(ent.targetScene))throw Error('Scene "'+e.sc.name+'" has a door to excluded scene "'+(scenes[ent.targetScene]?.name||ent.targetScene)+'". Include it or unlink the door.');
      ent.targetScene=map.get(ent.targetScene);
    }
    sceneLinks(sc);return sc;
  });
  return {scenes:copies,map};
}
function backendFor(snapshot){return snapshot.worldRuntime?.enabled?'world':snapshot.gameplay?.mode==='single-room'?'single-room':snapshot.asmSource.trim()&&snapshot.packScenes===false?'unpacked-custom':'packed';}
function plan(options={}){
  if(!services.ProjectStore?.prepareSnapshot)throw Error('ProjectStore preparation is required before building.');
  return planSource(services.ProjectStore.prepareSnapshot({intent:'build'}),options);
}
function planDetached(project,options={}){
  if(!services.ProjectStore?.prepareLoad)throw Error('ProjectStore validation is required before detached building.');
  const source=services.ProjectStore.prepareLoad(project).data;
  if(source.version!==services.ProjectStore.schema)throw Error('Detached builds require the current project schema.');
  if(typeof source.asmSource!=='string'||source.asmSource.trim())throw Error('Detached builds require generated Forge code; custom assembly remains live-only.');
  const backend=backendFor(source);
  if(!['world','single-room'].includes(backend)&&!(options.allowViewer===true&&backend==='packed'))throw Error('Detached builds require a generated World or single-room runtime; a static scene viewer requires explicit allowViewer.');
  if(backend==='packed'&&source.mapper!==0)throw Error('The detached generated scene viewer requires mapper 0 (NROM).');
  const result=planSource(source,{});result.detached=true;return result;
}
function planSource(source,options){
  const backend=options.backend||backendFor(source);
  if(!['packed','unpacked-custom','single-room','world'].includes(backend))throw Error('Unsupported build backend: '+backend);
  const gameplayCore=backend==='world'?null:services.GameplayCompiler.plan(source,{backend});
  if(backend==='world'){const p=services.WorldCompiler.plan(source,gameplayCore);completedPlans.add(p);return p;}
  const custom=!!source.asmSource.trim(),pack=backend!=='unpacked-custom',phases=['prepare-snapshot'],diagnostics=[];
  const audio=services.AudioCompiler.plan(source);if(audio.enabled&&custom)throw Error('Audio Runtime cannot be inserted into custom assembly. Disable Audio Runtime or use a generated viewer, single-room, or World runtime.');
  if(backend==='unpacked-custom'&&!custom)throw Error('Unpacked custom builds require assembly source.');
  if(backend==='single-room'){
    Forge165.config.validate(source.gameplay,{references:true,project:source});
    if(custom)throw Error('Playable room uses generated code. Save and clear custom ASM, or select Scene viewer/custom build mode.');
    if(source.mapper!==0)throw Error('First Playable Room currently builds mapper 0 (NROM)');
  }
  const entries=pack?selectedSceneEntries(source.scenes):[],mapped=pack?remapBuildScenes(entries,source.scenes):{scenes:[],map:new Map()};
  phases.push('select-remap');
  if(!pack&&(source.chr.length>256||source.sprChr.length>256))throw Error('Unpacked custom CHR exceeds one 256-tile bank. Compile/select a static bank first.');
  const gameplaySpriteSources=[];
  if(gameplayCore.enabled&&backend==='single-room')for(const actor of gameplayCore.actors){if(actor.components.includes('Input'))continue;const sceneId=actor.render.sourceSceneId||source.gameplay.sceneId,sourceScene=source.scenes.find(item=>item.id===sceneId),mappedScene=mapped.scenes.find(item=>item.id===sceneId),tile=actor.render.tile;if(!sourceScene||!mappedScene)throw Error('Gameplay Core Actor '+actor.id+' references a sprite source Scene outside the build: '+sceneId);if(!Number.isInteger(tile)||tile<0||tile>=sourceScene.sprChr.length)throw Error('Gameplay Core Actor '+actor.id+' references an invalid sprite tile');const selected=source.scenes.find(item=>item.id===source.gameplay.sceneId);for(let c=1;c<4;c++)if(sourceScene.sprPal[actor.render.palette]?.[c]!==selected.sprPal[actor.render.palette]?.[c])throw Error('Gameplay Core Actor '+actor.id+' sprite palette differs from the selected gameplay Scene');const dependency={x:0,y:1,tile,attr:actor.render.palette,active:true,height:8,_gameplayCoreDependency:actor.id};mappedScene.oam.push(dependency);gameplaySpriteSources.push({actor,sourceTile:sourceScene.sprChr[tile]});}
  // Custom atlas helpers return live banks; detach those too before asset linking.
  const atlas=pack?cp(buildGraphicsAtlas(mapped.scenes,custom)):{chr:cp(source.chr),sprChr:cp(source.sprChr),tileProps:cp(source.tileProps),scenes:[]};
  if(gameplaySpriteSources.length){for(const scene of mapped.scenes)scene.oam=scene.oam.filter(item=>!item._gameplayCoreDependency);for(const scene of atlas.scenes)scene.oam=scene.oam.filter(item=>!item._gameplayCoreDependency);}
  phases.push('atlas');
  for(const sc of atlas.scenes){
    const oam=expandOAM(sc.oam);
    if(oam.length>64)throw Error('Scene "'+sc.name+'" needs '+oam.length+' 8×8 OAM entries; maximum 64');
    for(const sprite of oam)if(sprite.y===0)throw Error('Scene "'+sc.name+'" has a sprite at screen Y=0, which normal NES OAM cannot encode.');
    if((sc.entities?.length||0)>16||(sc.links?.length||0)>16)throw Error('Scene "'+sc.name+'" exceeds the legacy 16 entity/link scene block limit.');
  }
  for(const sc of mapped.scenes)Forge16.metatiles.reconcile(sc);
  const ext16=pack?Forge16.build.encodeExtension(mapped.scenes,atlas.scenes):new Uint8Array();
  const metaDefinitions=mapped.scenes.reduce((n,sc)=>n+Forge16.metatiles.usedIds(sc).size,0),metaCells=mapped.scenes.reduce((n,sc)=>n+sc.metaMap.filter(v=>v>=0).length,0);
  const p={source,backend,profile,phaseOrder,phases,diagnostics,entries,mapped,atlas,custom,pack,ext:ext16,ext16,metaDefinitions,metaCells,audio,gameplayCore};
  phases.push('metatile-metadata');
  // Retained codecs are called once each. MS16 v2 owns its embedded v1 link.
  p.worldExtension=pack?Forge161.build.worldPayload(p):new Uint8Array();phases.push('world-metadata');
  Forge164.model.validateProject({version:7,scenes:source.scenes,animations:source.animations,metasprites:source.metasprites},{references:pack,build:pack});
  p.assetExtension=pack?Forge164.persistence.encodeAssets(p):new Uint8Array();phases.push('asset-link-encode');
  for(const item of gameplaySpriteSources){const key=JSON.stringify(item.sourceTile),linked=p.atlas.sprChr.findIndex(tile=>JSON.stringify(tile)===key);if(linked<0)throw Error('Gameplay Core Actor '+item.actor.id+' sprite dependency was not linked');item.actor.render.tile=linked;}
  phases.push('audio-link');
  phases.push('gameplay-core-link');
  p.extension=concat(ext16,p.worldExtension,p.assetExtension);
  if(pack){
    diagnostics.push(diagnostic('info','scene-selection',entries.length+' scene(s) selected: '+entries.map(e=>e.sc.name).join(' → '),'select-remap'));
    diagnostics.push(diagnostic('info','metadata-size','NFEX/MT16: '+ext16.length+' bytes; WR16 v3: '+p.worldExtension.length+' bytes; MS16 v2: '+p.assetExtension.length+' bytes.','asset-link-encode'));
    diagnostics.push(diagnostic('info','metatile-count',metaDefinitions+' linked metatile definition(s) / '+metaCells+' mapped cells.','metatile-metadata'));
    diagnostics.push(diagnostic('warning','placement-pending','Final placement checks contiguous PRG capacity against code and reserved data.','allocation'));
    if(backend!=='single-room')diagnostics.push(diagnostic('warning','viewer-limits','Scene viewer: world maps, animation bindings, contact boxes and events are preserved as authoring metadata.','artifact'));
  }else diagnostics.push(diagnostic('warning','unpacked-resources','Custom ASM, scene packing disabled: Build Scene Set and authoring metadata are ignored; active CHR banks are built directly.','select-remap'));
  if(backend==='single-room')diagnostics.push(diagnostic('info','single-room-limits','Existing single-room runtime: fixed camera, moving/jumping player, solid collision, bound animation, optional stationary training target.','gameplay-compile'));
  if(audio.enabled)diagnostics.push(diagnostic('info','audio-runtime',(audio.musicEnabled?'Tracker music and ':'')+audio.sfx.length+' named SFX compile into the generated NES runtime.','audio-link'));
  else if(source.instruments.length||source.sfx.length)diagnostics.push(diagnostic('warning','audio-authoring','Audio Runtime is disabled; tracker and SFX data remain authoring-only.','artifact'));
  if(gameplayCore.enabled){diagnostics.push(...gameplayCore.diagnostics);diagnostics.push(diagnostic('info','gameplay-core-runtime',gameplayCore.actors.length+' canonical Actor Instance(s) and '+gameplayCore.variables.length+' scoped persistent variable(s) compile into the '+backend+' runtime.','gameplay-core-link'));}
  completedPlans.add(p);return p;
}
function preflight(){
  const box=$('forge15Preflight');
  try{
    const p=BuildGraph.plan();
    if(p.pack&&p.extension.length>profile.markerAddress-profile.metadataStart)throw Error('Combined authoring metadata needs '+p.extension.length+' bytes but at most '+(profile.markerAddress-profile.metadataStart)+' bytes fit before $CFF0. Reduce assets or disable scene packing.');
    if(box)box.innerHTML=p.diagnostics.map(d=>'<div class="'+(d.severity==='warning'?'warn':d.severity==='error'?'err':'ok')+'">'+esc(d.message)+'</div>').join('');
    BuildGraph.lastDiagnostics=p.diagnostics;return p;
  }catch(error){
    BuildGraph.lastDiagnostics=[diagnostic('error','build-invalid',error.message,'validation')];
    if(box)box.innerHTML='<div class="err">✗ '+esc(error.message)+'</div>';return null;
  }
}
function codeOccupancy(p){
  if(p.detached&&p.custom)throw Error('Detached builds cannot invoke the live assembler.');
  if(p.custom&&!asm_assemble())throw Error(S.asmErrors.length?'Assembly failed — '+S.asmErrors[0].msg:'No executable code was emitted');
  const min=p.custom?Math.min(...S._asmWrites.map(x=>x[0])):0xC000;
  if(min<0x8000)throw Error('ROM code must live at $8000–$FFFF. Use .rs for RAM variables.');
  const base=min<0xC000?0x8000:0xC000,prgSize=65536-base,writes=new Set();let PRG=new Uint8Array(prgSize);
  if(p.custom){
    for(const [address,value]of S._asmWrites){if(address<base||address>0xFFFF)throw Error('Code address $'+address.toString(16).toUpperCase()+' is outside the selected PRG window');PRG[address-base]=value;writes.add(address);}
    for(let address=profile.vectorsAddress;address<=0xFFFF;address++)if(!writes.has(address))throw Error('Missing interrupt vectors: emit NMI, RESET and IRQ words at $FFFA.');
  }else{
    let engine=makeViewerEngine(p.atlas.scenes.length);if(p.audio?.enabled&&p.backend!=='single-room')engine=services.AudioEngine.enhanceViewer(engine,p.audio);PRG=engine.prg;
    for(let address=0xC000;address<0xC000+engine.size;address++)writes.add(address);
  }
  p.phases.push('code-occupancy');return {base,prgSize,writes,PRG};
}
function emitNrom(p){
  const allocation=codeOccupancy(p),{base,prgSize,writes,PRG}=allocation,reservations=[];
  const reserve=(address,length,label)=>{
    if(address<base||address+length>profile.vectorsAddress)throw Error(label+' exceeds ROM capacity');
    for(let i=0;i<length;i++)if(writes.has(address+i))throw Error(label+' overlaps code at $'+(address+i).toString(16).toUpperCase());
    for(let i=0;i<length;i++)writes.add(address+i);reservations.push({address,length,label});
  };
  let extensionAddress=null;
  if(p.pack){
    for(let i=0;i<p.atlas.scenes.length;i++)reserve(profile.sceneBase+i*profile.sceneStride,profile.sceneStride,'Scene '+(i+1)+' data');
    reserve(profile.sceneBase+p.atlas.scenes.length*profile.sceneStride,p.atlas.tileProps.length,'Collision table');
    // All actual occupied writes and fixed reservations precede first-fit allocation.
    extensionAddress=Forge161.build.findAddress(p.extension.length,writes);
    reserve(extensionAddress,p.extension.length,'Runtime metadata extension');
    reserve(profile.markerAddress,16,'NES Forge marker');
  }
  p.phases.push('allocation');
  if(p.pack){
    for(let i=0;i<p.atlas.scenes.length;i++){
      const sc=p.atlas.scenes[i],oam=expandOAM(sc.oam),block=new Uint8Array(profile.sceneStride);
      if(oam.length>64)throw Error('Scene '+(i+1)+' exceeds 64 hardware sprites');
      block.set(sc.nt);block.set(sc.attr,960);block.set(sc.pal.flat(),1024);block.set(sc.sprPal.flat(),1040);block[1056]=oam.length;
      oam.forEach((sprite,j)=>{if(sprite.y===0)throw Error('Sprite at screen Y=0 cannot be exported as normal OAM');block.set([(sprite.y-1)&255,sprite.tile,sprite.attr,sprite.x],1057+j*4);});
      packSceneMeta(block,sc);PRG.set(block,profile.sceneBase+i*profile.sceneStride-base);
    }
    PRG.set(Uint8Array.from(p.atlas.tileProps),profile.sceneBase+p.atlas.scenes.length*profile.sceneStride-base);
    PRG.set(p.extension,extensionAddress-base);
    const marker=new Uint8Array(16);marker.set(E.encode('NFORGE15'));marker[8]=3;marker[9]=p.atlas.scenes.length;
    marker[10]=extensionAddress&255;marker[11]=extensionAddress>>8;marker[12]=p.extension.length&255;marker[13]=p.extension.length>>8;
    PRG.set(marker,profile.markerAddress-base);
  }
  p.phases.push('scene-metadata-pack');
  const header=new Uint8Array(16);header.set([0x4E,0x45,0x53,0x1A,prgSize/16384,1,(p.source.mirroring==='v'?1:0)|(p.source.hasSRAM?2:0)]);
  const rom=new Uint8Array(16+prgSize+profile.chrBytes);rom.set(header);rom.set(PRG,16);
  // Final CHR serialization follows the single MS16 linking pass.
  rom.set(encodeTiles(p.atlas.chr),16+prgSize);rom.set(encodeTiles(p.atlas.sprChr),16+prgSize+4096);p.phases.push('chr-serialize');
  return {rom,metadata:{base,prgSize,extensionAddress,extensionBytes:p.extension.length,reservations}};
}
function emitGameplay(p,baseArtifact){
  const baseRom=baseArtifact.rom,config=p.source.gameplay,header=parseRomHeader(baseRom);
  if(header.prgSize!==16384||header.chrSize!==8192)throw Error('Gameplay compiler requires the generated 16 KB scene layout and 8 KB CHR');
  const spec=Forge165.compileGameplay(baseRom,config,p.audio,p.source);spec.gameplayCore=services.GameplayCompiler.locateSingleRoom(p.gameplayCore);services.GameplayCompiler.compileSemantics(spec.gameplayCore);const engine=Forge165.makeGameplayEngine(spec);
  if(!(engine.bytes instanceof Uint8Array)||engine.bytes.length>profile.gameplayConfig-profile.gameplayBase)throw Error('Gameplay engine overlaps reserved configuration metadata');
  for(const key of ['reset','nmi','irq'])if(!Number.isInteger(engine[key])||engine[key]<profile.gameplayBase||engine[key]>=profile.gameplayConfig)throw Error('Invalid gameplay '+key+' vector');
  const record={format:'NESForgeGameplay',version:1,sceneIndex:spec.sceneIndex,playerIndex:spec.playerIndex,targetIndex:spec.targetIndex};
  for(const key of ['moveSpeed','jumpSpeed','gravity','maxFallSpeed','bodyWidth','bodyHeight'])record[key]=config[key];
  const metadata=Forge165.encodeGameplayRecord(record),rom=new Uint8Array(16+32768+8192);rom.set(baseRom.subarray(0,16));rom[4]=2;
  rom.set(baseRom.subarray(header.headerSize,header.headerSize+16384),16+16384);rom.set(engine.bytes,16);rom.set(metadata,16+profile.gameplayConfig-profile.gameplayBase);
  [engine.nmi,engine.reset,engine.irq].forEach((vector,i)=>{rom[16+0x7FFA+i*2]=vector&255;rom[16+0x7FFB+i*2]=vector>>8;});
  rom.set(baseRom.subarray(header.headerSize+16384,header.headerSize+16384+8192),16+32768);
  Forge165.readGameplayRom(rom);p.phases.push('gameplay-compile');
  return {rom,metadata:{...baseArtifact.metadata,base:profile.gameplayBase,prgSize:32768,gameplayConfigAddress:profile.gameplayConfig,gameplayConfigBytes:metadata.length},gameplay:{spec,symbols:engine.symbols,codeEnd:engine.codeEnd,dataEnd:engine.dataEnd,record,rom}};
}
function compile(input){
  const p=completedPlans.has(input)?input:BuildGraph.plan(input||{});
  if(p.compiled)throw Error('A build graph is single-use. Prepare a new graph before compiling again.');
  p.compiled=true;
  let result=p.backend==='world'?services.WorldCompiler.compile(p):emitNrom(p);if(p.backend==='single-room')result=emitGameplay(p,result);
  p.phases.push('artifact');
  const diagnostics=p.diagnostics.map(d=>d.code==='placement-pending'?diagnostic('info','placement-complete','Metadata allocated at $'+result.metadata.extensionAddress.toString(16).toUpperCase()+' with code and reserved data preserved.','allocation'):d);
  return {...result,backend:p.backend,profile:p.profile,diagnostics,phases:[...p.phases],plan:p};
}
function commit(artifact){
  if(!(artifact?.rom instanceof Uint8Array))throw Error('Only a successful compiled ROM can be committed.');
  window._lastBuiltRom=artifact.rom;Forge165.lastBuild=artifact.gameplay||null;if(services.WorldCompiler)services.WorldCompiler.lastBuild=artifact.world||null;RuntimeCompiler.lastArtifact=artifact;return artifact.rom;
}
function build(options){
  window._lastBuiltRom=null;Forge165.lastBuild=null;RuntimeCompiler.lastArtifact=null;
  if(services.WorldCompiler)services.WorldCompiler.lastBuild=null;
  const blog=$('buildLog');if(blog)blog.textContent='';
  const log=(message,kind='bl-ok')=>{if(!blog)return;const row=document.createElement('div');row.className=kind;row.textContent=message;blog.appendChild(row);};
  try{
    const artifact=RuntimeCompiler.compile(options),rom=RuntimeCompiler.commit(artifact);
    log('Built '+(artifact.backend==='world'?'World Runtime':artifact.backend==='single-room'?'First Playable Room':artifact.backend==='unpacked-custom'?'unpacked custom NROM':'packed NROM')+': '+artifact.metadata.prgSize/1024+' KB PRG + 8 KB CHR • '+rom.length+' bytes.');
    for(const entry of artifact.diagnostics)log(entry.message,entry.severity==='warning'?'bl-warn':'bl-ok');
    if(artifact.gameplay){log('Left/Right: move · A: jump · B: attack · Start: restart.');for(const warning of artifact.gameplay.spec.warnings||[])log(warning,'bl-warn');}
    if(artifact.world)log('Left/Right: move · A: jump · B: attack animation · Up: enter linked marker · Start: restart.');
    if(!window._buildAndRunMode)download(rom,(S.projectName||'game').replace(/[^\w-]/g,'_')+'.nes');
    showToast('Build successful — '+rom.length+' bytes');return rom;
  }catch(error){
    window._lastBuiltRom=null;Forge165.lastBuild=null;RuntimeCompiler.lastArtifact=null;
    if(services.WorldCompiler)services.WorldCompiler.lastBuild=null;
    BuildGraph.lastDiagnostics=[diagnostic('error','build-failed',error.message,'compile')];log(error.message,'bl-err');reportError(error);return null;
  }
}
const BuildGraph=services.BuildGraph={profile,phaseOrder,selectedSceneEntries,plan,planDetached,preflight,lastDiagnostics:[],
  ownership:'Live capture or detached validation prepares the source. Generated plans pass copied sources to existing codecs once; custom assembly is live-only.'};
const RuntimeCompiler=services.RuntimeCompiler={backends:Object.freeze(['packed','unpacked-custom','single-room','world']),compile,compileDetached:(project,options)=>compile(planDetached(project,options)),commit,build,lastArtifact:null};
// These assignments replace active routes; no previous planner/builder is called.
buildNesRom=build;
window.forge15_preflight=preflight;
Forge15.build.plan=plan;Forge15.build.showPreflight=preflight;Forge15.build.preflight=preflight;
Forge16.build.plan=plan;Forge16.build.preflight=preflight;
Forge165.buildGameplay=()=>RuntimeCompiler.build({backend:'single-room'});
if($('forge15PreflightBtn'))$('forge15PreflightBtn').onclick=preflight;
})();
