/*
 * NES FORGE MODULE: src/services/library-catalog.js
 * Entry: Forge.services.LibraryCatalog, commands library.registerCatalog, library.surveyStages, library.usePose
 * Purpose: Recovered ROM catalogs become library entries, and library sprites can be used in the working project.
 *   - registerCatalog: every record of an imported ROM's investigation catalog (rooms, stages, poses, animations,
 *     actors, locations, CHR banks, maps, audio cues, symbols, RAM labels) becomes an entry on the ROM's shelf, with
 *     its decoded ROM location and, where decoded, its verified stage (basis rom-table). Each pose stores a
 *     rendition made by the editor's own converter (pieces, the tiles they use and the room palette it was drawn
 *     with), so it can be used in any project without the source ROM open.
 *   - surveyStages (Ninja Gaiden US): plays each area from its first room in the emulator (walking, running jumps,
 *     turning around when blocked) and records which enemy types and poses appear, confirmed against the sprites
 *     on screen and against the area's own spawn tables. Results are verified placements with
 *     basis "runtime" and their route; they never become developer notes or guesses.
 *   - usePose: puts a library sprite in the active scene. "reference" (default) links it to the library entry and
 *     warns before it is edited; "copy" makes an independent asset that records what it was derived from. Its
 *     tiles go into free sprite tile pairs and its palette rows into matching or unused rows; a conflict stops the
 *     change with an explanation. One undoable project edit.
 * Bundle order: after src/services/resource-library.js.
 */
(()=>{
'use strict';
const F=window.Forge,services=F.services,C=F.commands,L=services.ResourceLibrary;
if(!L)return;
const fail=message=>{throw Error('Library: '+message);};
const cp=value=>JSON.parse(JSON.stringify(value));
const RECORDS=[['native','scenes','room'],['native','stages','stage'],['native','poses','pose'],['native','animations','animation'],['native','actors','actor'],['native','locations','location'],
  ['native','graphics','chr'],['spatial','maps','map'],['audio','cues','cue'],['audio','instruments','instrument'],['audio','samples','sample']];
const idOf=(romSha,kind,rid)=>'rom:'+romSha.slice(0,16)+':'+kind+':'+rid;
async function sha(text){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');}

// ---------- typed ROM locations ----------
// A decoded record names its ROM locations. Each keeps its own address types: the offset into the .nes file, the
// region and physical PRG/CHR bank it lies in, and the CPU address the decoder recorded. The CPU window is the one
// that bank occupies when the address is read; a PPU address is only shown where the decoder recorded one (a CHR bank
// number never becomes a PPU address here). Every location is checked against the cartridge layout in the header.
const CATALOG_SCHEMA=3;
// code: the routines a record names (its state entry points, the code that reads or writes it). An actor's
// "dispatch" is the table of state entry pointers, which is data.
const CODE_ROLE=/(^|\.)(reader|writer)$|^states\[\d+\]\.source$/;
function romLayout(rom){
  if(!rom||rom.length<16||rom[0]!==0x4e||rom[1]!==0x45||rom[2]!==0x53||rom[3]!==0x1a)return null;
  const trainer=rom[6]&4?512:0,prgBytes=rom[4]*16384,chrBytes=rom[5]*8192;
  return {mapper:(rom[6]>>4)|(rom[7]&0xf0),trainer,prgStart:16+trainer,prgBytes,chrStart:16+trainer+prgBytes,chrBytes,byteLength:rom.length};
}
const ROLE_NAMES={source:'data',pointerSource:'pointer table entry',attributesSource:'attribute bytes','extent.source':'horizontal extent code','extent.verticalSource':'vertical extent code',
  dispatch:'state pointer table',reader:'code that reads it',writer:'code that writes it','audioEvent.writer':'area-start audio writer (code)','audioEvent.source':'area-start cue byte',record:'record',
  table:'command table entry',header:'cue header',sample:'DPCM sample bytes'};
const KIND_DATA={pose:'pose piece stream',room:'room record',stage:'stage table',animation:'animation script',location:'location record',chr:'CHR pattern bank'};
function roleName(kind,role,record){
  if(role==='source'||role==='record')return KIND_DATA[kind]||ROLE_NAMES[role];
  let m=/^states\[(\d+)\]\.source$/.exec(role);if(m){const st=record?.states?.[+m[1]];return 'state '+(st?.state??m[1])+' entry code'+(st?.label?' ('+st.label+')':'');}
  m=/^pieces\[(\d+)\]\.(source|attributeSource)$/.exec(role);if(m)return 'piece '+m[1]+(m[2]==='source'?' bytes':' attribute');
  m=/^parameterSources\[(\d+)\]$/.exec(role);if(m)return 'parameter byte '+m[1];
  return ROLE_NAMES[role]||role.replace(/\[(\d+)\]/g,' $1').replace(/\./g,' · ');
}
function walkLocations(record){
  const out=[];
  (function walk(v,path,depth){
    if(depth>6||!v||typeof v!=='object'||out.length>=600)return;
    if(Array.isArray(v)){v.slice(0,64).forEach((x,i)=>walk(x,path+'['+i+']',depth+1));return;}
    if(Number.isInteger(v.fileOffset))out.push({raw:v,role:path||'record'});
    // paired fields: tableCPU + tableFileOffset, headerCPU + headerFileOffset (+ headerBytes), sampleCPU + sampleFileOffset
    for(const k of Object.keys(v)){const m=/^(.+)FileOffset$/.exec(k);if(!m||!Number.isInteger(v[k]))continue;
      out.push({raw:{fileOffset:v[k],cpu:v[m[1]+'CPU'],length:v[m[1]+'Bytes']},role:(path?path+'.':'')+m[1]});}
    for(const [k,x] of Object.entries(v))if(x&&typeof x==='object')walk(x,path?path+'.'+k:k,depth+1);
  })(record,'',0);
  return out;
}
function typedLocation(raw,role,layout){
  const loc={role,fileOffset:raw.fileOffset,length:Number.isInteger(raw.length)?raw.length:null,code:CODE_ROLE.test(role)};
  if(Number.isInteger(raw.bank16KiB))loc.prgBank={index:raw.bank16KiB,size:16384};else if(Number.isInteger(raw.bank8KiB))loc.prgBank={index:raw.bank8KiB,size:8192};
  if(Number.isInteger(raw.bank4KiB))loc.chrBank={index:raw.bank4KiB,size:4096};
  if(Number.isInteger(raw.cpu))loc.cpu=raw.cpu;
  if(Number.isInteger(raw.ppu))loc.ppu=raw.ppu;
  if(!layout){loc.check='not checked: the cartridge header was not available';return loc;}
  const f=raw.fileOffset;
  if(f<layout.prgStart)loc.region='header';
  else if(f<layout.chrStart){loc.region='PRG ROM';loc.regionOffset=f-layout.prgStart;}
  else if(f<layout.chrStart+layout.chrBytes){loc.region='CHR ROM';loc.regionOffset=f-layout.chrStart;}
  else loc.region='outside the cartridge data';
  const problems=[];
  if(loc.prgBank){
    if(loc.region!=='PRG ROM')problems.push('a PRG bank is named but the offset is in '+loc.region);
    else if(Math.floor(loc.regionOffset/loc.prgBank.size)!==loc.prgBank.index)problems.push('the offset lies in PRG bank '+Math.floor(loc.regionOffset/loc.prgBank.size)+', not '+loc.prgBank.index);
    if(Number.isInteger(loc.cpu)&&loc.cpu>=0x8000){
      const base=loc.cpu-(loc.cpu-0x8000)%loc.prgBank.size;loc.cpuWindow={start:base,end:base+loc.prgBank.size-1};
      if(loc.region==='PRG ROM'&&loc.regionOffset!==loc.prgBank.index*loc.prgBank.size+(loc.cpu-base))problems.push('file offset, bank and CPU address disagree');
    }
  }
  if(loc.chrBank){
    if(loc.region!=='CHR ROM')problems.push('a CHR bank is named but the offset is in '+loc.region);
    else if(Math.floor(loc.regionOffset/loc.chrBank.size)!==loc.chrBank.index)problems.push('the offset lies in CHR bank '+Math.floor(loc.regionOffset/loc.chrBank.size)+', not '+loc.chrBank.index);
  }
  if(!loc.prgBank&&!loc.chrBank&&loc.region==='PRG ROM'){
    // no bank named: report the physical 16 KiB bank the offset lies in, marked as derived from the offset
    loc.derivedPrgBank={index:Math.floor(loc.regionOffset/16384),size:16384};
  }
  if(loc.length&&f+loc.length>layout.byteLength)problems.push('the range runs past the end of the file');
  loc.check=problems.length?'inconsistent: '+problems.join('; '):'consistent with the cartridge layout';
  return loc;
}
function decodedEvidence(kind,record,layout,profile){
  const found=walkLocations(record);
  if(!found.length)return {state:'none'};
  const all=found.map(x=>({...typedLocation(x.raw,x.role,layout),name:roleName(kind,x.role,record)}));
  const primary=all.find(l=>l.role==='source')||all.find(l=>l.role==='record')||all.find(l=>l.role==='header')||all.find(l=>!l.code)||all[0];
  const code=all.filter(l=>l.code).slice(0,24),data=[primary,...all.filter(l=>l!==primary&&!l.code)].slice(0,48);
  return {state:'decoded',schema:CATALOG_SCHEMA,basis:'NES Forge ROM decoder'+(profile?' ('+profile+')':''),
    rom:layout?{mapper:layout.mapper,prgBytes:layout.prgBytes,chrBytes:layout.chrBytes,trainer:layout.trainer}:null,
    primary,locations:data,code,total:all.length,inconsistent:all.filter(l=>/^inconsistent/.test(l.check)).length};
}
// A pose drawn by the editor's own converter in a room's graphics context.
function rendition(project,poseId,contextRoomId,d=services.InvestigatedLibrary.describe(project)){
  const IL=services.InvestigatedLibrary;
  const item=d.items.find(i=>i.kind==='pose'&&i.id===poseId);if(!item)return null;
  const context=contextRoomId||d.contextSceneId,pv=IL.preview(item.request,{contextSceneId:context},project);
  const m=pv.poses?.[0],sc=pv.scene;if(!m||!sc)return null;
  const used=new Set();for(const p of m.pieces){used.add(p.tile);if(m.spriteMode===16&&Number.isInteger(p.tile2))used.add(p.tile2);}
  const room=project.investigation.catalogs.native.scenes.find(r=>r.id===context);
  return {format:'NESForgeLibraryPose',version:1,poseId,name:m.name,spriteMode:m.spriteMode,originX:m.originX,originY:m.originY,
    pieces:m.pieces.map(p=>({tile:p.tile,tile2:p.tile2,x:p.x,y:p.y,pal:p.pal,flipH:!!p.flipH,flipV:!!p.flipV,behind:!!p.behind})),
    tiles:Object.fromEntries([...used].map(t=>[t,cp(sc.sprChr[t])])),palette:cp(sc.sprPal),
    context:{roomId:context,label:room?.label||context,stage:room?.stage?.label||null}};
}

// ---------- registration ----------
async function registerCatalog(project=services.ProjectStore.capture(),{onProgress,pageSize=1000}={}){
  const n=project?.investigation;
  if(!n||n.version!==1||!n.catalogs?.native)fail('the open project has no recovered ROM catalog; import a ROM with a verified profile first');
  await L.ensureMeta();
  const source=n.source,romSha=source.sha256,shelf=romSha,profile=n.catalogs.native.profile?.id||source.profile;
  const packKey='catalog:'+await sha(JSON.stringify(n.catalogSha256));
  const prior=await L.getPack(packKey);
  let rom=null;try{rom=services.NativeEngineProject.validate(project).bytes;}catch(_){rom=null;}
  if(rom)await SourceROMs.put(rom,source.name);
  if(prior?.state==='complete'&&prior.stats?.schema===CATALOG_SCHEMA)return {packSha256:packKey,already:true,shelf,stats:prior.stats,links:await linkSameResources(romSha)};
  // an earlier registration of this catalog is upgraded in place: what was observed at runtime, the per-stage
  // renditions and the links found since are kept
  const upgrade=prior?.state==='complete';
  // A registration that did not finish (Forge closed, the browser ended, or a write failed) left its marker and the
  // entries written so far. They are kept: an entry already stored with identical content (and, for a pose, its
  // rendition) is not written or rendered again; the rest is written now.
  const resuming=!upgrade&&!!prior&&prior.stats?.schema===CATALOG_SCHEMA;
  const attempt=(prior&&prior.state!=='complete'?prior.attempts||0:0)+1;
  const marker={packSha256:packKey,name:source.name+' · recovered catalog',origin:'rom-catalog',bytes:0,format:'NESForgeInvestigation',game:profile,sourceSha256:romSha,shelf,mode:'full',
    intake:{state:'accepted',kind:'rom-catalog'},state:'registering',registered:prior?.registered||Date.now(),updated:Date.now(),attempts:attempt,lastAttemptAt:Date.now(),lastError:null,stats:{schema:CATALOG_SCHEMA}};
  if(!upgrade)await L.putRecords([['packs',marker]]);
  try{return await registerRecords();}
  catch(error){if(!upgrade)await L.putRecords([['packs',{...marker,state:'failed',updated:Date.now(),lastError:String(error?.message||error).slice(0,300)}]]).catch(()=>{});throw error;}
  async function registerRecords(){
  const layout=romLayout(rom);
  const records=[];
  for(const [cat,coll,kind] of RECORDS){const list=n.catalogs[cat]?.[coll];if(Array.isArray(list))list.forEach((r,i)=>records.push({kind,r,rid:String(r.id??i)}));}
  records.push({kind:'symbols',r:{id:'symbols',label:'Code symbols',items:n.catalogs.native.symbols||[]},rid:'symbols'},{kind:'ram-map',r:{id:'ram',label:'RAM labels',items:n.catalogs.native.ram||[]},rid:'ram'});
  const started=Date.now(),stats={schema:CATALOG_SCHEMA,entries:0,renditions:0,chrBanks:0,verifiedPlacements:0,locations:0,inconsistentLocations:0,upgraded:upgrade,resumed:resuming,kept:0,written:0,attempts:attempt};let ops=[];
  const already=new Map();
  // every entry already written, read page by page (no listing limit): a catalog of any size is resumed, not rewritten
  if(resuming)for(let offset=0;;offset+=pageSize){const page=await L.entriesPage({pack:packKey,offset,limit:pageSize});stats.pagesRead=(stats.pagesRead||0)+1;
    for(const item of page.items)already.set(item.id,item);if(offset+pageSize>=page.total)break;}
  stats.alreadyStored=already.size;
  const described=services.InvestigatedLibrary.describe(project);
  for(const [i,{kind,r,rid}] of records.entries()){
    const id=idOf(romSha,kind,rid),label=String(r.label||r.name||(kind+' '+rid)).slice(0,160);
    let data,fileType='json';
    if(kind==='chr'&&rom&&Number.isInteger(r.fileOffset)){data=rom.slice(r.fileOffset,r.fileOffset+r.length);fileType='binary';stats.chrBanks++;}
    else data=JSON.stringify(r);
    const stored=await L.storeData(data);
    const before=already.get(idOf(romSha,kind,rid));
    if(before&&before.contentHash===stored.hash&&before.packSha256===packKey&&before.evidence?.state===decodedEvidence(kind,r,layout,profile).state&&(kind!=='pose'||before.rendition||before.renditionError)){
      stats.entries++;stats.kept++;if(kind==='chr')stats.chrBanks++;if(before.rendition)stats.renditions++;stats.locations+=before.evidence?.total||0;stats.inconsistentLocations+=before.evidence?.inconsistent||0;
      stats.verifiedPlacements+=(before.placement?.verified||[]).length;continue;
    }
    const e={id,packSha256:packKey,path:kind+'/'+label,label,origin:'rom-catalog',shelf,sourceSha256:romSha,game:profile,kind,identified:true,fileType,size:stored.size,contentHash:stored.hash,loads:false,
      registered:Date.now(),data:{state:'stored'},validation:{state:'accepted',reason:'decoded by the NES Forge decoder for '+profile},
      evidence:decodedEvidence(kind,r,layout,profile)};
    stats.locations+=e.evidence.total||0;stats.inconsistentLocations+=e.evidence.inconsistent||0;
    if(kind==='chr')e.record=cp(r);
    let kept=null;if(upgrade){try{kept=await L.entry(id);}catch(_){kept=null;}}
    const verified=(kept?.placement?.verified||[]).filter(p=>p.basis==='runtime');
    if(kept?.renditions)e.renditions=kept.renditions;if(kept?.links)e.links=kept.links;
    if(kind==='room'&&r.stage)verified.push({stage:r.stage.label,area:r.area,room:r.room,basis:'rom-table',source:r.stage.source});
    else if((kind==='room'||kind==='location')&&r.group)verified.push({context:r.group,basis:'rom-table'});
    if(kind==='stage')verified.push({stage:r.label,areas:r.areas,basis:'rom-table',source:r.source});
    if(verified.length){e.placement={verified};stats.verifiedPlacements+=verified.length;}
    if(kind==='pose'){try{const rend=rendition(project,r.id,null,described);if(rend){const st=await L.storeData(JSON.stringify(rend));e.rendition={hash:st.hash,context:rend.context};stats.renditions++;}}
      catch(err){e.renditionError=String(err.message).slice(0,200);}}
    ops.push(['entries',e]);stats.entries++;stats.written++;
    if(ops.length>=40){await L.putRecords(ops);ops=[];onProgress?.({done:i+1,total:records.length});}
  }
  await L.putRecords(ops);
  const shelves=(await C.run('library.shelves')).result||[];
  const shelfRecord=shelves.find(s=>s.shelf===shelf)||{shelf,sourceSha256:romSha,title:source.name.replace(/\.nes$/i,''),packs:[],created:Date.now()};
  if(!shelfRecord.packs.includes(packKey))shelfRecord.packs.push(packKey);shelfRecord.updated=Date.now();
  await L.putRecords([['shelves',shelfRecord],['packs',{packSha256:packKey,name:source.name+' · recovered catalog',origin:'rom-catalog',bytes:0,fileCount:records.length,
    format:'NESForgeInvestigation',game:profile,sourceSha256:romSha,shelf,mode:'full',intake:{state:'accepted',kind:'rom-catalog'},state:'complete',registered:prior?.registered||started,updated:Date.now(),
    attempts:upgrade?prior.attempts||1:attempt,lastAttemptAt:started,lastError:null,stats}]]);
  const links=await linkSameResources(romSha);
  return {packSha256:packKey,already:false,shelf,stats,links,ms:Date.now()-started};
  }
}

// ---------- source ROMs open in this session ----------
// Bytes of the original cartridges are only ever held in memory, for this session: the library stores no ROM.
const SourceROMs=(()=>{const map=new Map();
  const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
  return Object.freeze({
    async put(bytes,name){if(!(bytes instanceof Uint8Array)||!bytes.length)return null;const sha256=await digest(bytes);if(!map.has(sha256))map.set(sha256,{bytes,name:String(name||'cartridge.nes')});return sha256;},
    get(sha256){const hit=map.get(sha256);if(hit)return hit;
      // the open investigated project carries its own cartridge
      try{const p=services.ProjectStore.capture();if(p?.investigation?.source?.sha256===sha256){const bytes=services.NativeEngineProject.validate(p).bytes;map.set(sha256,{bytes,name:p.investigation.source.name});return map.get(sha256);}}catch(_){}
      // a ROM opened in this session (Open ROM / project / ZIP, Import ROM, the emulator's Load ROM): identified by its
      // SHA-256 when it was imported
      try{const bytes=services.RomImports?.bytes?.(sha256);if(bytes){map.set(sha256,{bytes,name:services.RomImports.list().find(r=>r.sha256===sha256)?.name||'cartridge.nes'});return map.get(sha256);}}catch(_){}
      return null;},
    async verify(bytes,sha256){return (await digest(bytes))===sha256;},
    list:()=>[...map.entries()].map(([sha256,v])=>({sha256,name:v.name,bytes:v.bytes.length}))});})();

// ---------- the same resource, recorded twice ----------
// An extraction pack and the recovered catalog can both hold one resource. They are linked only on verified source
// identity: the same source ROM (SHA-256), the decoder record id the pack file names, and matching content (pose
// pieces, or the identical room location). Names never link records. Both records, their observations, previews and
// notes stay as they are; each gains a link to the other with the basis.
async function linkSameResources(romSha){
  const all=[];for(let offset=0;;offset+=5000){const page=await L.list({offset,limit:5000});all.push(...page.items);if(offset+5000>=page.total)break;}
  const mine=all.filter(e=>e.sourceSha256===romSha);
  const catalog=new Map(mine.filter(e=>e.origin==='rom-catalog').map(e=>[e.id,e]));
  if(!catalog.size)return {checked:0,linked:0};
  const prefix='rom:'+romSha.slice(0,16)+':';let checked=0,linked=0,mismatched=0;const ops=[];
  for(const p of mine.filter(e=>e.origin!=='rom-catalog'&&e.fileType==='json'&&['pose','room'].includes(e.kind))){
    let data;try{data=JSON.parse(new TextDecoder().decode((await L.readEntry(p.id)).bytes));}catch(_){continue;}
    const kind=data?.pose?.id?'pose':data?.format==='NESForgeNativeSceneEvidence'&&data.scene?.id?'room':null;if(!kind)continue;
    const rid=kind==='pose'?data.pose.id:data.scene.id,target=catalog.get(prefix+kind+':'+rid);if(!target)continue;checked++;
    let record;try{record=JSON.parse(new TextDecoder().decode((await L.readEntry(target.id)).bytes));}catch(_){continue;}
    let match=false,detail='';
    if(kind==='pose'){
      const a=data.metasprite?.pieces||[],b=record.pieces||[];
      match=a.length===b.length&&a.length>0&&a.every((x,i)=>x.x===b[i].x&&(x.pal&3)===(b[i].attributes&3));
      detail=match?a.length+' pieces with the same horizontal offsets and palettes':'piece offsets or palettes differ';
    }else{
      const s=data.source,t=record.source;match=!!s&&!!t&&s.fileOffset===t.fileOffset&&s.length===t.length;
      detail=match?'the same room record at file offset 0x'+s.fileOffset.toString(16).toUpperCase()+' ('+s.length+' bytes)':'room locations differ';
    }
    if(!match){mismatched++;continue;}
    const basis='same source ROM (SHA-256 '+romSha.slice(0,12)+'…), decoder record '+kind+' '+rid+', '+detail;
    for(const [from,to] of [[p.id,target.id],[target.id,p.id]]){
      const e=await L.entry(from),links=(e.links||[]).filter(l=>l.id!==to);links.push({id:to,relation:'same-resource',basis,verified:true});
      e.links=links;ops.push(['entries',e]);}
    linked++;
    if(ops.length>=40){await L.putRecords(ops.splice(0));}
  }
  if(ops.length)await L.putRecords(ops);
  return {checked,linked,mismatched};
}

// ---------- runtime stage survey (Ninja Gaiden US) ----------
async function surveyStages({areas,frames=1500,boot='checkpoint'}={}){
  const project=services.ProjectStore.capture(),n=project.investigation;
  if(n?.catalogs?.native?.profile?.id!=='ninja-gaiden-us')fail('the runtime stage survey is written for Ninja Gaiden (US); open its investigated project first');
  const rom=services.NativeEngineProject.validate(project).bytes,scenes=n.catalogs.native.scenes,romSha=n.source.sha256;
  const enemyPoses=new Map(n.catalogs.native.poses.filter(p=>p.owner==='enemy').map(p=>[p.selector,p]));
  const run=async(name,args)=>{const r=await C.run(name,args);if(!r.ok)fail(name+': '+r.error.message);return r.result;};
  const press=async button=>{await run('input.set',{buttons:{[button]:true}});await run('emulator.frames',{count:4});await run('input.set',{buttons:{[button]:false}});};
  const list=areas||[...new Set(scenes.map(s=>s.area))],results=[],t0=performance.now();
  if(!['checkpoint','cold'].includes(boot))fail('boot must be checkpoint or cold');
  // the game boots once; every area starts from a restored physical checkpoint of that state ("cold" boots per area,
  // kept as the reference the checkpoint path is compared with)
  const startGame=async()=>{await run('emulator.load',{bytes:rom,name:'survey.nes'});
    let ready=false;for(let f=0;f<3000&&!ready;f+=30){await run('emulator.frames',{count:26});await press('start');ready=emu.vram[0x97]===0x18&&emu.ram[0x6D]===0;}
    if(ready)await run('emulator.frames',{count:60});return ready;};
  let checkpoint=null,boots=0;
  if(boot==='checkpoint'){boots++;if(!(await startGame()))fail('the game did not reach its first stage');checkpoint=services.EmulatorTimeline.saveOwnedCheckpoint('stage survey boot');}
  try{
  for(const area of list){
    const stage=scenes.find(s=>s.area===area)?.stage?.label||null,rooms=scenes.filter(s=>s.area===area),firstRoom=rooms[0]?.areaFirstRoom??rooms[0]?.room;
    // enemy types the ROM's own spawn tables place in this area's rooms; observations are checked against them
    const tableTypes=new Set(rooms.flatMap(r=>(r.enemies||[]).map(e=>e.type)));
    if(checkpoint)checkpoint.restore();else{boots++;if(!(await startGame())){results.push({area,stage,error:'the game did not reach its first stage'});continue;}}
    if(area){
      // time over: the game's own death routine restarts at the area ($6D) and room ($6E, checkpoint $6F) held in RAM;
      // both are set to the area's first room (PRG bank 0 $AF2C), and the restart must land there
      emu.ram[0x6D]=area;emu.ram[0x6E]=firstRoom;emu.ram[0x6F]=firstRoom;emu.ram[0x63]=1;emu.ram[0x76]=Math.max(emu.ram[0x76],2);let zero=false,restarted=false;
      for(let f=0;f<6000&&!restarted;f+=10){await run('emulator.frames',{count:10});const t=emu.ram[0x63];if(t===0)zero=true;else if(zero&&t>=140&&t<=150)restarted=true;}
      if(!restarted||emu.ram[0x6D]!==area||emu.ram[0x6E]!==firstRoom){results.push({area,stage,error:'the game did not restart in this area\'s first room (area '+emu.ram[0x6D]+', room '+emu.ram[0x6E]+')'});continue;}
      await run('emulator.frames',{count:30});
    }
    // route: walk one way swinging the sword; when blocked, take a running jump (leaping off a wall when clinging to
    // one) with a different run-up each try; turn around only when a direction makes no headway at all. The full
    // button state is sent every step (input.set merges what it is given).
    const seen=new Map();let left=false,f=0,dir='right',turns=0,deaths=0,died=false;
    const pos=()=>(emu.ram[0x52]<<8|emu.ram[0x51])+emu.ram[0x86];
    const tick=async(buttons,steps=1)=>{for(let k=0;k<steps&&!left&&f<frames;k++,f+=4){
      await run('input.set',{buttons:{left:false,right:false,up:false,down:false,a:false,b:false,...buttons}});await run('emulator.frames',{count:4});
      if(emu.ram[0x6D]!==area){left=true;break;}
      if(emu.ram[0x76]<2){emu.ram[0x76]=2;deaths++;died=true;} // keep the survey out of the game-over screen
      const oam=emu.oamMem,onScreen=new Set();for(let s=0;s<64;s++)if(oam[s*4]<239)onScreen.add(oam[s*4+1]);
      for(let i=0;i<8;i++){
        if(!emu.ram[0x498+i])continue; // slot flags: zero when the slot holds no live enemy
        const type=emu.ram[0x400+i],pose=emu.ram[0x438+i],key=type+':'+pose,rec=seen.get(key)||{type,pose,samples:0,onScreen:0};
        rec.samples++;const cat=enemyPoses.get(pose);if(cat?.pieces?.length&&cat.pieces.every(pc=>onScreen.has(pc.tile)))rec.onScreen++;seen.set(key,rec);
      }
    }};
    let origin=pos(),best=origin,still=0,tries=0;
    while(f<frames&&!left){
      await tick({[dir]:true,b:f%32===0});
      if(died){died=false;best=pos();still=0;tries=0;continue;} // back at the checkpoint: headway counts from there
      const q=pos();if(dir==='right'?q>best:q<best){best=q;still=0;tries=0;}else still++;
      if(still<12)continue;
      still=0;const back=dir==='right'?'left':'right';tries++;
      if(tries>3&&Math.abs(best-origin)<48){dir=back;origin=best=pos();tries=0;turns++;continue;}
      await tick({[back]:true,a:emu.ram[0x80]===10},[4,8,2,12][tries%4]);await tick({},2);await tick({[dir]:true},3);await tick({[dir]:true,a:true},8);
    }
    await run('input.set',{buttons:{left:false,right:false,a:false}});
    results.push({area,stage,room:firstRoom,frames,leftArea:left,turns,deaths,route:'area start (room '+firstRoom+'): walking with the sword, running jumps over obstacles, turning around when a direction is closed; up to '+frames+' frames',
      tableTypes:[...tableTypes].sort((a,b)=>a-b),
      observations:[...seen.values()].map(o=>({...o,poseId:enemyPoses.has(o.pose)?'enemy:'+o.pose:null,inSpawnTables:tableTypes.has(o.type)})).sort((a,b)=>a.type-b.type||a.pose-b.pose)});
  }
  }finally{checkpoint?.release();}
  const timing={boot,boots,ms:Math.round(performance.now()-t0)};
  // record: a pose seen on screen in an area is a verified (runtime) placement, with its route and sample counts
  const firstRoom=new Map();for(const s of scenes)if(s.stage&&!firstRoom.has(s.stage.label))firstRoom.set(s.stage.label,s.id);
  const described=services.InvestigatedLibrary.describe(project);
  let recorded=0;
  for(const r of results)for(const o of r.observations||[]){
    // verified only when seen on screen AND its enemy type is one the ROM's spawn tables place in this area;
    // anything else (projectiles, spawned helpers) is reported in the results but not recorded as placement
    if(!o.poseId||!o.onScreen||!o.inSpawnTables)continue;
    const place={stage:r.stage,area:r.area,basis:'runtime',route:r.route,samples:o.samples,onScreen:o.onScreen,enemyType:o.type,romSha256:romSha};
    for(const [kind,rid] of [['pose',o.poseId],['actor','ng-actor:'+o.type]]){
      const id=idOf(romSha,kind,rid);let e;try{e=await L.entry(id);}catch(_){continue;}
      const kept=(e.placement?.verified||[]).filter(p=>!(p.basis==='runtime'&&p.area===r.area));
      e.placement={...(e.placement||{}),verified:[...kept,place]};
      if(kind==='pose'&&r.stage&&!e.renditions?.[r.stage]){try{const rend=rendition(project,o.poseId,firstRoom.get(r.stage),described);if(rend){const st=await L.storeData(JSON.stringify(rend));e.renditions={...(e.renditions||{}),[r.stage]:{hash:st.hash,context:rend.context}};}}catch(_){/* rendition stays default */}}
      await L.putRecords([['entries',e]]);recorded++;
    }
  }
  return {areas:results,recorded,timing};
}

// ---------- using a library sprite in the working project ----------
// The project keeps the source identity and the primary ROM location with the sprite, so they stay visible where the
// library entry is not available.
function primaryOf(e){const p=e.evidence?.primary;if(!p)return null;const out={role:p.role,name:p.name,fileOffset:p.fileOffset,length:p.length,region:p.region||null,check:p.check||null};
  for(const k of ['regionOffset','prgBank','chrBank','cpu','cpuWindow','ppu','derivedPrgBank'])if(p[k]!==undefined)out[k]=cp(p[k]);return out;}
let guardOff=0;
async function usePose(id,{mode='reference',stage=null,x=null,y=null}={}){
  if(!['reference','copy'].includes(mode))fail('mode must be reference or copy');
  const e=await L.entry(id);if(e.kind!=='pose')fail('only sprite poses can be used this way so far');
  const ref=(stage&&e.renditions?.[stage])||e.rendition;if(!ref)fail('this sprite has no stored rendition; register its ROM catalog again');
  const rend=JSON.parse(new TextDecoder().decode(await L.blobBytes(ref.hash)));
  const store=services.ProjectStore,expected={epoch:store.state.epoch,snapshot:store.serialize()};
  guardOff++;
  try{
    return store.applyLibraryUse(candidate=>{
      const scenes=candidate.scenes,scene=scenes[candidate.activeScene];if(!scene)fail('open a scene first');
      const tall=rend.spriteMode===16,mine=(candidate.metasprites||[]).filter(m=>m.sceneId===scene.id);
      // sprite tiles this scene already uses: its placements and its metasprites
      const used=new Set();
      for(const o of scene.oam||[])if(o.active!==false){used.add(o.tile);if(o.height===16)used.add(Number.isInteger(o.tile2)?o.tile2:o.tile+1);}
      for(const m of mine)for(const p of m.pieces){used.add(p.tile);if(Number.isInteger(p.tile2))used.add(p.tile2);}
      const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),tileMap=new Map(),added=[],reused=[];
      const freeSlot=()=>{for(let t=tall?254:255;t>=0;t-=tall?2:1)if(!used.has(t)&&(!tall||!used.has(t+1))){used.add(t);if(tall)used.add(t+1);return t;}
        fail('no free sprite tiles left in "'+scene.name+'": this sprite needs '+(tall?'tile pairs':'tiles')+' for '+rend.pieces.length+' pieces. Free some sprite tiles or use another scene.');};
      const place=(src,dest)=>{scene.sprChr[dest]=cp(rend.tiles[src]);tileMap.set(src,dest);added.push(dest);};
      for(const p of rend.pieces){
        if(tileMap.has(p.tile))continue;
        // a reference may share an identical tile already in the scene; a copy always gets its own pixels
        const existing=mode==='reference'?[...used].find(t=>same(scene.sprChr[t],rend.tiles[p.tile])&&(!tall||same(scene.sprChr[t+1],rend.tiles[p.tile2]))):undefined;
        if(existing!==undefined){tileMap.set(p.tile,existing);if(tall)tileMap.set(p.tile2,existing+1);reused.push(existing);continue;}
        const slot=freeSlot();place(p.tile,slot);if(tall)place(p.tile2,slot+1);
      }
      // palette rows: an identical row, else a row no sprite in this scene uses; never recolour other sprites silently
      const usedRows=new Set();for(const o of scene.oam||[])if(o.active!==false)usedRows.add(o.attr&3);for(const m of mine)for(const p of m.pieces)usedRows.add(p.pal&3);
      const palMap=new Map(),palettes=[];
      for(const pi of [...new Set(rend.pieces.map(p=>p.pal&3))]){
        const want=rend.palette[pi],match=scene.sprPal.findIndex(row=>row[1]===want[1]&&row[2]===want[2]&&row[3]===want[3]);
        if(match>=0){palMap.set(pi,match);palettes.push({row:match,reused:true});continue;}
        const free=[0,1,2,3].find(r=>!usedRows.has(r)&&![...palMap.values()].includes(r));
        if(free===undefined)fail('palette conflict in "'+scene.name+'": this sprite needs the colours '+want.slice(1).map(c=>'$'+c.toString(16).padStart(2,'0')).join(' ')+
          ', and all four sprite palettes are used by other sprites here. Free a sprite palette or use another scene; nothing was changed.');
        scene.sprPal[free]=[scene.sprPal[free][0],want[1],want[2],want[3]];usedRows.add(free);palMap.set(pi,free);palettes.push({row:free,reused:false,colours:want.slice(1)});
      }
      const ids=new Set(candidate.metasprites.map(m=>m.id));let n=1;while(ids.has('lib_'+n))n++;
      const frame={id:'lib_'+n,name:(rend.name||'Library sprite')+(mode==='copy'?' (copy)':''),sceneId:scene.id,spriteMode:rend.spriteMode,originX:rend.originX||0,originY:rend.originY||0,
        pieces:rend.pieces.map((p,i)=>({id:'piece-'+i,tile:tileMap.get(p.tile),tile2:tall?tileMap.get(p.tile2):undefined,x:p.x,y:p.y,pal:palMap.get(p.pal&3),flipH:p.flipH,flipV:p.flipV,behind:p.behind})),
        library:{mode,entryId:e.id,contentHash:e.contentHash,renditionHash:ref.hash,sourceSha256:e.sourceSha256,poseId:rend.poseId,stage:stage||ref.context?.stage||null,context:ref.context,at:Date.now(),
          label:e.label||null,game:e.game||null,kind:e.kind,location:primaryOf(e),
          ...(mode==='copy'?{derivedFrom:{entryId:e.id,contentHash:e.contentHash,sourceSha256:e.sourceSha256}}:{})}};
      candidate.metasprites.push(frame);
      // place it in the scene so it is visible at once: the given spot, else the first spot near the middle of the
      // screen where it overlaps no sprite already placed
      const toOAM=window.Forge163?.metasprites?.toOAM;if(!toOAM)fail('the metasprite editor is not loaded');
      const boxes=(scene.oam||[]).filter(o=>o.active!==false).map(o=>[o.x,o.y,8,o.height===16?16:8]);
      const clear=(ax,ay)=>toOAM(frame,ax,ay).every(s=>s.x>=0&&s.x<=248&&s.y>=8&&s.y<=224-(s.height||8)&&!boxes.some(([bx,by,bw,bh])=>s.x<bx+bw&&bx<s.x+8&&s.y<by+bh&&by<s.y+(s.height||8)));
      let ax=x,ay=y;
      if(ax==null||ay==null){
        spot:for(const cy of [104,72,136,40,168])for(const cx of [112,80,144,48,176,16,208]){if(clear(cx,cy)){ax=cx;ay=cy;break spot;}}
        if(ax==null){ax=112;ay=104;}
      }
      const oam=toOAM(frame,ax,ay);
      const room=64-(scene.oam||[]).filter(o=>o.active!==false).length;
      if(oam.length>room)fail('"'+scene.name+'" has room for '+room+' more hardware sprites; this sprite needs '+oam.length+'.');
      scene.oam=[...(scene.oam||[]).filter(o=>o.active!==false),...oam];
      return {scenes,metasprites:candidate.metasprites,result:{metaspriteId:frame.id,mode,sceneId:scene.id,placed:{x:ax,y:ay,sprites:oam.length,box:{x:Math.min(...oam.map(s=>s.x)),y:Math.min(...oam.map(s=>s.y)),w:Math.max(...oam.map(s=>s.x+8))-Math.min(...oam.map(s=>s.x)),h:Math.max(...oam.map(s=>s.y+(s.height||8)))-Math.min(...oam.map(s=>s.y))}},
        dependencies:{tilesAdded:added.length,tilesShared:reused.length,palettes},library:frame.library}};
    },{expected,intent:'libraryUse'});
  }finally{guardOff--;queueMicrotask(()=>window.dispatchEvent(new CustomEvent('forge:library-use',{detail:{entryId:id,mode}})));}
}

// ---------- shared-reference guard ----------
// Editing a sprite that references a library entry first asks to make it an independent copy. Declining reverts the
// edit through the normal Undo, so the shared reference never changes silently.
if(typeof snapshot==='function'){
  const original=snapshot;
  const guarded=function(){
    const result=original.apply(this,arguments);
    if(guardOff||typeof S==='undefined')return result;
    let frames=[];
    try{
      const composer=window.Forge163?.metasprites,current=composer?.current;
      if(S.tab==='metasprites'&&current?.library?.mode==='reference')frames=[current];
      else if(S.tab==='chr'&&S.chrBank==='spr'){const sc=S.scenes[S.activeScene];frames=(S.metasprites||[]).filter(m=>m.sceneId===sc?.id&&m.library?.mode==='reference'&&m.pieces.some(p=>p.tile===S.editTile||p.tile2===S.editTile));}
    }catch(_){frames=[];}
    if(!frames.length)return result;
    const names=frames.map(f=>'"'+f.name+'"').join(', ');
    const ok=confirm(names+(frames.length>1?' are shared references':' is a shared reference')+' to a library sprite. Editing makes '+(frames.length>1?'them independent copies':'it an independent copy')+
      ' in this project; the library resource and any other references stay unchanged. Continue?');
    if(ok){for(const f of frames)f.library={...f.library,mode:'copy',derivedFrom:{entryId:f.library.entryId,contentHash:f.library.contentHash,sourceSha256:f.library.sourceSha256},convertedAt:Date.now()};}
    else setTimeout(()=>{try{undo();showToast?.('The shared library reference was left unchanged.');}catch(_){/* nothing to revert */}},0);
    return result;
  };
  try{snapshot=guarded;}catch(_){/* read-only binding: references stay protected by their library marker only */}
}


// ---------- recovered catalogs that did not finish ----------
// A catalog whose registration stopped (Forge closed, the browser ended, a write failed) keeps its marker and the
// entries written so far. Forge completes it on its own, from whichever copy of the cartridge it can reach: the open
// project (an investigated project carries its cartridge), a ROM opened in this session, or bytes the caller supplies
// (the background-investigation panel fetches the job's ROM from the paired worker). The library itself still stores
// no ROM. Attempts are bounded: at most 3 automatic attempts per catalog, across sessions: a registration counts on
// the catalog's marker, a failure before any registration starts (no marker yet) on a library meta record
// ("catalog-failures:<sha>"), cleared on success. They are
// spaced 0 s, 30 s and 2 min apart within a tab; after that a visible Retry is needed. Every state change is announced
// (event "forge:catalog-recovery", a toast for the important ones) and listed by recoveryStatus().
const AUTO_ATTEMPTS=3,BACKOFF=[0,30000,120000],FAILURES='catalog-failures:';
const recovery={status:new Map(),running:new Map(),failures:new Map(),nextAt:new Map(),timers:new Map()};
const profileOf=sha=>window.GameRENative?.profiles?.find(p=>p.sha256===sha)||null;
const STATE_TEXT={complete:'complete',completing:'completing…','completing-elsewhere':'being completed in another Forge tab',incomplete:'incomplete (registration was interrupted)',
  'needs-source':'incomplete: waiting for its cartridge (open its ROM; a paired background worker supplies it automatically)',failed:'a completion attempt failed; Forge retries automatically',
  'needs-retry':'automatic completion stopped after 3 failed attempts; use Retry',waiting:'the last completion attempt failed; Forge tries again automatically',unsupported:'no recovered catalog exists for this ROM'};
function setStatus(sha,value){
  const next={...(recovery.status.get(sha)||{}),sha,...value,at:Date.now()};next.text=STATE_TEXT[next.state]||next.state;
  if(next.state==='waiting'&&next.retryAt)next.text+=' in about '+Math.max(1,Math.ceil((next.retryAt-Date.now())/1000))+' s';
  if(next.state==='failed'&&next.attempts)next.text+=' (attempt '+next.attempts+' of '+AUTO_ATTEMPTS+' failed)';
  recovery.status.set(sha,next);
  try{window.dispatchEvent(new CustomEvent('forge:catalog-recovery',{detail:{...next}}));}catch(_){/* no DOM events */}
  const label=next.name||'this ROM';
  if(value.state==='completing'&&value.resuming)window.showToast?.('Completing the recovered catalog of '+label+' (its registration was interrupted)…');
  if(value.state==='complete'&&value.written!==undefined&&!value.already)window.showToast?.('Recovered catalog of '+label+' complete: '+next.entries+' entries'+(value.kept?' ('+value.kept+' kept, '+value.written+' written)':''));
  if(value.state==='failed'||value.state==='needs-retry')window.showToast?.('The recovered catalog of '+label+' could not be completed: '+(next.lastError||'unknown error')+(value.state==='needs-retry'?' · Retry it in Resources › Library':''));
  return next;
}
// Catalog state per source ROM, from the library: complete, incomplete (a marker without completion), failed, or
// missing (runtime evidence of a profiled ROM exists but no catalog was ever started).
async function catalogState(){
  const r=await C.run('library.packs'),packs=r.ok?r.result:[],out=new Map();
  for(const p of packs){
    if(p.origin!=='rom-catalog'||!p.sourceSha256)continue;
    const cur=out.get(p.sourceSha256);
    if(!cur||p.state==='complete'&&cur.state!=='complete'||cur.state!=='complete'&&(p.updated||0)>(cur.updated||0))
      out.set(p.sourceSha256,{sha:p.sourceSha256,name:String(p.name||'').replace(/ · recovered catalog$/,''),state:p.state==='complete'?'complete':p.state==='failed'?'failed':'incomplete',packKey:p.packSha256,updated:p.updated||0,entries:p.stats?.entries??null});
  }
  for(const p of packs)if(p.origin==='runtime-capture'&&p.sourceSha256&&profileOf(p.sourceSha256)&&!out.has(p.sourceSha256))
    out.set(p.sourceSha256,{sha:p.sourceSha256,name:String(p.name||'').replace(/ · runtime captures$/,''),state:'missing',packKey:null,updated:p.updated||0,entries:null});
  for(const c of out.values())if(c.state!=='complete'){
    const pack=c.packKey?await L.getPack(c.packKey):null,pre=await L.getMeta(FAILURES+c.sha).catch(()=>null);
    c.markerAttempts=pack?.attempts||0;c.preFailures=pre?.failures||0;c.attempts=c.markerAttempts+c.preFailures;
    c.lastError=(pre?.at||0)>(pack?.lastAttemptAt||0)?pre.lastError:(pack?.lastError||pre?.lastError||null);
  }
  return [...out.values()];
}
async function sourceProject(sha,{bytes,name,from}){
  try{const p=services.ProjectStore.capture();if(p?.investigation?.version===1&&p.investigation.source?.sha256===sha)return {project:p,source:'the open project'};}catch(_){/* no project */}
  const known=bytes instanceof Uint8Array?{bytes,name}:SourceROMs.get(sha);
  if(!known)return null;
  if(!(await SourceROMs.verify(known.bytes,sha)))fail('the supplied cartridge does not match the catalog\'s SHA-256');
  return {project:await services.InvestigationProject.create(known.bytes,known.name||name||'cartridge.nes'),source:bytes?'a cartridge from '+(from||'the caller'):'a cartridge open in this session'};
}
function completeCatalog(sha,{bytes=null,name=null,from=null,manual=false,reason='automatic'}={}){
  if(recovery.running.has(sha))return recovery.running.get(sha);
  const job=(async()=>{
    const st=(await catalogState()).find(c=>c.sha===sha)||null,label=st?.name||name||null;
    if(st?.state==='complete'){await L.deleteMeta(FAILURES+sha).catch(()=>{});return setStatus(sha,{state:'complete',name:label,entries:st.entries,already:true});}
    if(!profileOf(sha))return setStatus(sha,{state:'unsupported',name:label});
    const persisted=st?st.attempts||0:((await L.getMeta(FAILURES+sha).catch(()=>null))?.failures||0),inTab=recovery.failures.get(sha)||0;
    if(!manual&&(persisted>=AUTO_ATTEMPTS||inTab>=AUTO_ATTEMPTS))return setStatus(sha,{state:'needs-retry',name:label,attempts:Math.max(persisted,inTab),lastError:st?.lastError||recovery.status.get(sha)?.lastError||null});
    // during the backoff after a failure the failure stays the visible state (no churn); the scheduled attempt follows
    if(!manual&&Date.now()<(recovery.nextAt.get(sha)||0)){const cur=recovery.status.get(sha);if(cur?.state==='failed')return {...cur};return setStatus(sha,{state:'waiting',name:label,retryAt:recovery.nextAt.get(sha)});}
    let src;
    const markerBefore=st?.markerAttempts||0;
    try{src=await sourceProject(sha,{bytes,name,from});}catch(error){return failed(error,label,markerBefore);}
    if(!src)return setStatus(sha,{state:'needs-source',name:label,attempts:persisted,lastError:st?.lastError||null,manual});
    const resuming=!!st&&st.state!=='missing';
    setStatus(sha,{state:'completing',name:label,reason,resuming,source:src.source});
    const run=()=>registerCatalog(src.project);
    try{
      const r=typeof navigator!=='undefined'&&navigator.locks?await navigator.locks.request('nes-forge-catalog:'+sha,{ifAvailable:true},lock=>lock?run():null):await run();
      if(r===null)return setStatus(sha,{state:'completing-elsewhere',name:label});
      recovery.failures.delete(sha);recovery.nextAt.delete(sha);clearTimeout(recovery.timers.get(sha));recovery.timers.delete(sha);await L.deleteMeta(FAILURES+sha).catch(()=>{});
      return setStatus(sha,{state:'complete',name:label,entries:r.stats.entries,chrBanks:r.stats.chrBanks,kept:r.stats.kept||0,written:r.already?0:r.stats.written??r.stats.entries,already:!!r.already,resumed:!!r.stats.resumed,attempts:r.stats.attempts||null,source:src.source,lastError:null});
    }catch(error){return failed(error,label,markerBefore);}
  })().finally(()=>recovery.running.delete(sha));
  async function failed(error,label,markerBefore){
    const n=(recovery.failures.get(sha)||0)+1,delay=BACKOFF[Math.min(n,BACKOFF.length-1)],message=String(error?.message||error).slice(0,300);recovery.failures.set(sha,n);recovery.nextAt.set(sha,Date.now()+delay);
    let st=(await catalogState().catch(()=>[])).find(c=>c.sha===sha);
    // it failed before a registration started (the marker did not count it): count it where later sessions see it
    if((st?.markerAttempts||0)===markerBefore){const pre=await L.getMeta(FAILURES+sha).catch(()=>null);
      await L.putRecords([['meta',{key:FAILURES+sha,sha,failures:(pre?.failures||0)+1,lastError:message,at:Date.now()}]]).catch(()=>{});
      st=(await catalogState().catch(()=>[])).find(c=>c.sha===sha)||st;}
    const attempts=Math.max(n,st?.attempts||0);
    recovery.nextAt.set(sha,Date.now()+delay);
    // the next automatic attempt is scheduled here, once, so it does not depend on anything else polling; the limit
    // is checked again when it runs
    clearTimeout(recovery.timers.get(sha));
    if(attempts<AUTO_ATTEMPTS)recovery.timers.set(sha,setTimeout(()=>{recovery.timers.delete(sha);void completeCatalog(sha,{reason:'retry after a failure'}).catch(()=>{});},delay+50));
    return setStatus(sha,{state:attempts>=AUTO_ATTEMPTS?'needs-retry':'failed',name:label,attempts,retryAt:attempts<AUTO_ATTEMPTS?recovery.nextAt.get(sha):null,lastError:message});
  }
  recovery.running.set(sha,job);return job;
}
// Every catalog that is not complete, once (automatic triggers: startup, a project change, a ROM import).
async function resumeCatalogs({reason='automatic'}={}){
  const out=[];
  for(const c of await catalogState())if(c.state!=='complete')out.push(await completeCatalog(c.sha,{reason}));
  return out;
}
function recoveryStatus(){return [...recovery.status.values()].map(s=>({...s}));}
let projectTimer=null;
function projectChanged(){clearTimeout(projectTimer);projectTimer=setTimeout(()=>{void resumeCatalogs({reason:'project'}).catch(()=>{});},600);}
// ---------- recognizing a ROM that was recovered before ----------
// What the library already holds for a ROM (by SHA-256): its recovered catalog, verified frames, the investigations they
// came from and other packs of the same cartridge. Read from the library only: no worker, no ROM bytes, nothing redone.
async function recognize(sha){
  sha=String(sha||'').toLowerCase();if(!/^[0-9a-f]{64}$/.test(sha))fail('recognize needs a ROM SHA-256');
  const r=await C.run('library.packs'),packs=(r.ok?r.result:[]).filter(p=>p.sourceSha256===sha);
  const onShelf=await L.list({shelf:sha,limit:1}),catalog=(await catalogState()).find(c=>c.sha===sha)||null;
  const frames=packs.filter(p=>p.origin==='runtime-capture').reduce((n,p)=>n+(p.fileCount||0),0);
  const investigations=packs.filter(p=>p.origin==='agent-lab'&&p.state==='complete').map(p=>({jobId:p.job?.id||null,plan:p.job?.plan?.name||p.job?.plan?.id||null,
    imported:p.stats?.imported||0,completed:p.job?.completed||null,editorSha256:p.job?.editorSha256||null}));
  const other=packs.filter(p=>!['agent-lab','runtime-capture','rom-catalog'].includes(p.origin)).map(p=>({name:p.name,origin:p.origin,files:p.fileCount||0}));
  const firstFrame=frames?(await L.list({shelf:sha,kind:'frame',limit:1})).items[0]?.id||null:null;
  return {sha,known:onShelf.total>0||other.length>0,entries:onShelf.total,counts:onShelf.counts,
    catalog:catalog?{state:catalog.state,entries:catalog.entries}:{state:profileOf(sha)?'none':'unsupported'},frames,investigations,otherPacks:other,
    // recovered: verified results of an investigation are in the library, so investigating again would redo that work
    recovered:investigations.length>0&&frames>0,open:firstFrame||onShelf.items[0]?.id||null};
}
function recognitionText(name,r,{job=null}={}){
  const parts=[];
  if(r.catalog.state==='complete')parts.push('recovered catalog complete ('+r.catalog.entries+' entries)');
  else if(['incomplete','failed','missing'].includes(r.catalog.state))parts.push('recovered catalog incomplete (Forge completes it)');
  if(r.frames)parts.push(r.frames+' verified frame'+(r.frames===1?'':'s'));
  for(const p of r.otherPacks)parts.push(p.name+' ('+p.files+' files)');
  return 'Recognized '+name+': already in your library · '+(parts.join(' · ')||r.entries+' entries')+(job?' (from job '+job+')':'')+'. Nothing is extracted again.';
}
// imports: recognize first, then finish an incomplete catalog with the imported cartridge (subscribed once every
// module has loaded, so no import is missed)
setTimeout(()=>{
  services.RomImports?.subscribe(entry=>{void (async()=>{
    const r=await recognize(entry.sha256);
    if(r.known){window.showToast?.(recognitionText(entry.name,r));try{window.dispatchEvent(new CustomEvent('forge:rom-recognized',{detail:{...r,name:entry.name}}));}catch(_){/* no DOM events */}}
    if(['incomplete','failed','missing'].includes(r.catalog.state))await completeCatalog(entry.sha256,{bytes:services.RomImports.bytes(entry.sha256),name:entry.name,from:'the ROM import',reason:'rom import'});
  })().catch(()=>{});});
},0);
setTimeout(()=>{void resumeCatalogs({reason:'startup'}).catch(()=>{});},1500);

services.SourceROMs=SourceROMs;
services.LibraryCatalog=Object.freeze({registerCatalog,surveyStages,usePose,rendition,linkSameResources,romLayout,decodedEvidence,typedLocation,
  catalogState,completeCatalog,resumeCatalogs,recoveryStatus,projectChanged,recognize,recognitionText,AUTO_ATTEMPTS});
if(C?.register){
  C.register({name:'library.recognize',group:'library',title:'What the library already holds for a ROM',summary:'By SHA-256: recovered catalog, verified frames, investigations and other packs; read from the library only.',
    args:{sha256:{type:'string',required:true}},run:a=>recognize(String(a.sha256))});
  C.register({name:'library.catalogs',group:'library',title:'Recovered catalogs and their registration state',summary:'complete, incomplete (interrupted), failed or missing, with attempts and the last error.',run:()=>catalogState()});
  C.register({name:'library.completeCatalog',group:'library',title:'Complete an interrupted catalog registration',summary:'Uses the open project or a ROM opened in this session; manual: true ignores the automatic attempt limit.',
    args:{sha256:{type:'string',required:true},manual:{type:'boolean',default:false}},run:a=>completeCatalog(String(a.sha256),{manual:!!a.manual,reason:'command'})});
  C.register({name:'library.registerCatalog',group:'library',title:'Register the open ROM\'s recovered catalog',summary:'Every recovered record of the imported ROM becomes a library entry with its decoded location; poses get renditions.',run:()=>registerCatalog()});
  C.register({name:'library.surveyStages',group:'library',title:'Observe which sprites appear in each stage (runtime)',summary:'Ninja Gaiden (US): plays each area from its start and records enemy poses seen on screen as verified runtime placements.',
    args:{areas:{type:'string'},frames:{type:'int',default:1500,min:60,max:20000},boot:{type:'string',default:'checkpoint'}},
    run:a=>surveyStages({areas:a.areas?String(a.areas).split(',').map(v=>Number(v.trim())).filter(Number.isInteger):undefined,frames:a.frames,boot:a.boot})});
  C.register({name:'library.rendition',group:'library',title:'A library sprite\'s stored rendition',summary:'Pieces, the tiles they use and the palette of the room it was drawn in; per stage when observed there.',
    args:{id:{type:'string',required:true},stage:{type:'string'}},
    run:async a=>{const e=await L.entry(a.id),ref=(a.stage&&e.renditions?.[a.stage])||e.rendition;if(!ref)fail('this entry has no rendition');
      return {id:e.id,stage:a.stage&&e.renditions?.[a.stage]?a.stage:ref.context?.stage||null,rendition:JSON.parse(new TextDecoder().decode(await L.blobBytes(ref.hash)))};}});
  C.register({name:'library.usePose',group:'library',title:'Use a library sprite in the active scene',summary:'mode "reference" (default) links it to the library entry; "copy" makes an independent asset. One undoable edit.',mutates:false,
    args:{id:{type:'string',required:true},mode:{type:'string',default:'reference',enum:['reference','copy']},stage:{type:'string'},x:{type:'int'},y:{type:'int'}},run:a=>usePose(a.id,a)});
}
})();
