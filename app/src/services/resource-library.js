/*
 * NES FORGE MODULE: src/services/resource-library.js
 * Entry: Forge.services.ResourceLibrary, commands library.*
 * Purpose: The persistent resource library. Extraction discovers resources; the library keeps every one of them,
 *   identified or not, so it can be inspected, annotated, placed and later used in a project. Opening an extraction
 *   pack registers its complete contents: projects, maps, rooms, poses, audio, images, reports and files the intake
 *   does not recognise. Data is stored compressed and deduplicated by content hash, and is read on demand. Nothing
 *   is loaded into the working project unless a project entry is opened explicitly.
 * Storage: IndexedDB database "nesforge-library" (never localStorage). Stores:
 *   meta      schema version, import journal (interrupted imports resume or are discarded explicitly)
 *   shelves   one per source ROM SHA-256 (or per pack when its source is not declared)
 *   packs     one per pack SHA-256: identity, intake result, statistics, state
 *   entries   one per file of a pack: kind, validation, stated evidence, content hash, preview link
 *   blobs     content-addressed data (SHA-256 of the uncompressed bytes), deflate-raw where practical
 *   notes     the developer's names, categories, tags, groups and possible placements, kept apart from evidence
 *   Without IndexedDB (a headless harness) an in-memory store is used and reported as not persistent.
 * Contract: the project store and command core are unchanged; library commands never edit the working project,
 *   except library.openProject, which loads one project entry through ProjectStore.load like "Open project".
 * Bundle order: after src/services/command-core.js.
 */
(()=>{
'use strict';
const F=window.Forge,services=F.services,C=F.commands;
const SCHEMA=1,DB_NAME='nesforge-library';
const fail=message=>{throw Error('Resource library: '+message);};
const PROJECT_KINDS=new Set(['project','animationProject','nativeProject','audioProject']);
const BATCH=40;

// ---------- small helpers ----------
const hex=buffer=>Array.from(new Uint8Array(buffer),b=>b.toString(16).padStart(2,'0')).join('');
async function sha256(bytes){return hex(await crypto.subtle.digest('SHA-256',bytes));}
const CRC_TABLE=(()=>{const t=new Uint32Array(256);for(let i=0;i<256;i++){let c=i;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[i]=c>>>0;}return t;})();
function crc32(data){let c=0xFFFFFFFF;for(let i=0;i<data.length;i++)c=CRC_TABLE[(c^data[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0;}
const b64=bytes=>{let s='';for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode.apply(null,bytes.subarray(i,i+32768));return btoa(s);};
const fromB64=text=>Uint8Array.from(atob(text),c=>c.charCodeAt(0));
const ext=path=>{const m=/\.([A-Za-z0-9]+)$/.exec(path);return m?m[1].toLowerCase():'';};
const fileType=path=>{const e=ext(path);return e==='png'?'image':e==='json'?'json':['html','htm'].includes(e)?'document':['txt','md','asm','s','inc'].includes(e)?'text':['nes','bin','chr'].includes(e)?'binary':e||'binary';};
function clone(value){
  if(value instanceof Uint8Array)return value.slice();
  if(Array.isArray(value))return value.map(clone);
  if(value&&typeof value==='object'){const out={};for(const k of Object.keys(value))out[k]=clone(value[k]);return out;}
  return value;
}
async function deflate(bytes){
  if(typeof CompressionStream==='undefined')return null;
  try{const stream=new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));return new Uint8Array(await new Response(stream).arrayBuffer());}catch(_){return null;}
}
async function inflate(bytes,size){return inflateData(bytes,size);}

// Stated evidence: the pack's own fields naming a ROM location. They are recorded as stated, not verified.
const EVIDENCE={
  fileOffset:/(file_?offset|rom_?offset|prg_bank\d_(file|prg)_offset|^offset$|FileOffset$)/i,
  cpu:/(^cpu$|cpuHex|cpuAddress|romAddress|listAddress|^address$|Cpu$)/i,
  bank:/(bank16KiB|bank8KiB|bank8k|^bank$|bank4KiB|physicalBank|tableBank)/i,
  ppu:/(ppu|chr_pt\d|nametable|vram)/i,
  mapper:/^mapper$/i,
};
function statedEvidence(data){
  const found={};let budget=20000;
  (function walk(v,depth){
    if(depth>8||budget--<=0)return;
    if(Array.isArray(v)){for(let i=0;i<Math.min(v.length,64);i++)walk(v[i],depth+1);return;}
    if(!v||typeof v!=='object')return;
    for(const [k,x] of Object.entries(v)){
      for(const [name,rx] of Object.entries(EVIDENCE))if(rx.test(k)&&(typeof x==='number'||(typeof x==='string'&&x!==''))){
        const f=found[name]||(found[name]={count:0,first:x,field:k});f.count++;
      }
      if(x&&typeof x==='object')walk(x,depth+1);
    }
  })(data,0);
  return Object.keys(found).length?{state:'stated',basis:'extraction pack',fields:found}:{state:'none'};
}
function projectSummary(data){
  if(!data||typeof data!=='object')return null;
  const n=k=>Array.isArray(data[k])?data[k].length:0;
  return {name:String(data.projectName||'').slice(0,160),format:data.format||null,version:data.version??null,scenes:n('scenes'),metasprites:n('metasprites'),animations:n('animations'),worlds:n('worlds'),
    patterns:n('patterns'),sfx:n('sfx'),nativeSourceSha256:data.nativeGame?.sourceSha256||null};
}

// ---------- storage backends ----------
const STORES={meta:'key',shelves:'shelf',packs:'packSha256',entries:'id',blobs:'hash',notes:'id'};
function memoryBackend(){
  const data=Object.fromEntries(Object.keys(STORES).map(s=>[s,new Map()]));
  return {kind:'memory',persistent:false,
    async get(store,key){const v=data[store].get(key);return v===undefined?undefined:clone(v);},
    async has(store,key){return data[store].has(key);},
    async putMany(ops){for(const [store,value] of ops)data[store].set(value[STORES[store]],clone(value));},
    async deleteMany(ops){for(const [store,key] of ops)data[store].delete(key);},
    async all(store){return [...data[store].values()].map(clone);},
    async byIndex(store,index,value){return [...data[store].values()].filter(v=>v[index]===value).map(clone);},
    async count(store){return data[store].size;},
    async keys(store){return [...data[store].keys()];},
    close(){}};
}
function migrate(db,oldVersion){
  // Version 1: the initial stores. Later schema versions add their steps below and keep every earlier record.
  if(oldVersion<1){
    db.createObjectStore('meta',{keyPath:'key'});
    db.createObjectStore('shelves',{keyPath:'shelf'});
    db.createObjectStore('packs',{keyPath:'packSha256'});
    const entries=db.createObjectStore('entries',{keyPath:'id'});
    for(const field of ['packSha256','shelf','kind','contentHash'])entries.createIndex(field,field);
    db.createObjectStore('blobs',{keyPath:'hash'});
    db.createObjectStore('notes',{keyPath:'id'});
  }
}
function idbBackend(){
  let opening=null;
  const open=()=>opening||(opening=new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB_NAME,SCHEMA);
    request.onupgradeneeded=event=>{try{migrate(request.result,event.oldVersion);}catch(e){request.transaction?.abort();reject(e);}};
    request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();opening=null;};resolve(db);};
    request.onerror=()=>{opening=null;reject(request.error);};
    request.onblocked=()=>{opening=null;reject(Error('the library is open in another tab with an older version; close it and retry'));};
  }));
  // One transaction per call; every request is issued synchronously inside it.
  async function run(stores,mode,issue){
    const db=await open();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(stores,mode),results=[];
      try{issue(tx,results);}catch(e){try{tx.abort();}catch(_){/* already finished */}reject(e);return;}
      tx.oncomplete=()=>resolve(results);tx.onerror=()=>reject(tx.error||Error('library transaction failed'));tx.onabort=()=>reject(tx.error||Error('library transaction aborted'));
    });
  }
  const read=(store,make)=>run([store],'readonly',(tx,out)=>{const r=make(tx.objectStore(store));r.onsuccess=()=>{out[0]=r.result;};});
  return {kind:'indexeddb',persistent:true,
    async get(store,key){return (await read(store,s=>s.get(key)))[0];},
    async has(store,key){return ((await read(store,s=>s.count(key)))[0]||0)>0;},
    async putMany(ops){if(!ops.length)return;const stores=[...new Set(ops.map(o=>o[0]))];await run(stores,'readwrite',tx=>{for(const [store,value] of ops)tx.objectStore(store).put(value);});},
    async deleteMany(ops){if(!ops.length)return;const stores=[...new Set(ops.map(o=>o[0]))];await run(stores,'readwrite',tx=>{for(const [store,key] of ops)tx.objectStore(store).delete(key);});},
    async all(store){return (await read(store,s=>s.getAll()))[0]||[];},
    async byIndex(store,index,value){return (await read(store,s=>s.index(index).getAll(value)))[0]||[];},
    async count(store){return (await read(store,s=>s.count()))[0]||0;},
    async keys(store){return (await read(store,s=>s.getAllKeys()))[0]||[];},
    close(){opening?.then(db=>db.close()).catch(()=>{});opening=null;}};
}
let backendInstance=null;
function backend(){
  if(!backendInstance)backendInstance=typeof indexedDB!=='undefined'&&indexedDB?idbBackend():memoryBackend();
  return backendInstance;
}
async function ensureMeta(){
  const b=backend(),meta=await b.get('meta','schema');
  if(!meta)await b.putMany([['meta',{key:'schema',version:SCHEMA,created:Date.now()}]]);
  else if(meta.version>SCHEMA)fail('this library was written by a newer NES Forge (schema '+meta.version+'); this editor reads schema '+SCHEMA+'. Export it from the newer editor or use the newer editor.');
}
async function storageEstimate(){
  try{if(navigator.storage?.estimate){const e=await navigator.storage.estimate();return {usage:e.usage||0,quota:e.quota||0};}}catch(_){/* not reported */}
  return null;
}
async function persisted(){try{return navigator.storage?.persisted?await navigator.storage.persisted():null;}catch(_){return null;}}
async function requestPersistence(){try{if(navigator.storage?.persist&&!(await navigator.storage.persisted()))return await navigator.storage.persist();}catch(_){/* best effort */}return persisted();}

// ---------- registration ----------
const entryId=(packSha,path)=>'pack:'+packSha.slice(0,16)+':'+path;
function previewPathFor(path,kind,paths){
  if(/\.png$/i.test(path))return null;
  const base=path.replace(/(\.nesforge)?\.json$/i,'');
  const candidates=[base+'.png',base.replace(/_objects$/i,'')+'.png',kind==='capture'?path.replace(/state\.json$/i,'screen.png'):null].filter(Boolean);
  return candidates.find(c=>paths.has(c))||null;
}
async function register(input,{name='pack.zip',mode='full',onProgress,batch=BATCH}={}){
  if(!['full','index-only'].includes(mode))fail('mode must be full or index-only');
  const bytes=input instanceof Uint8Array?input:new Uint8Array(input);
  if(!bytes.length)fail('the file is empty');
  await ensureMeta();
  const b=backend(),packSha256=await sha256(bytes),started=Date.now();
  const existing=await b.get('packs',packSha256);
  if(existing&&existing.state==='complete'&&(existing.mode==='full'||existing.mode===mode))return {packSha256,already:true,shelf:existing.shelf,state:existing.state,mode:existing.mode,stats:existing.stats};
  let raw;try{raw=parseZip(bytes,{onDemand:true});}catch(e){fail('the file is not a readable ZIP: '+e.message);}
  const paths=Object.keys(raw).filter(p=>!p.endsWith('/')).sort();
  // The editor's own intake: kinds, validation and the declared source. A pack it rejects is still registered.
  let pack=null,intake={state:'accepted'};const kinds=new Map();
  try{const opened=await services.ExtractionPack.open(bytes);
    if(opened?.kind==='extraction'){pack=opened;for(const [kind,list] of Object.entries(opened.files||{}))for(const p of list)kinds.set(p,kind);intake={state:'accepted',kind:'extraction'};}
    else intake={state:'accepted',kind:opened?.kind||'unknown'};
  }catch(e){intake={state:'rejected',reason:String(e.message).slice(0,300)};}
  const report=pack?.report||null,source=(report?.rom?.sha256||'').toLowerCase()||null;
  const shelf=source||'pack:'+packSha256,game=report?.game||report?.title||null;
  // Storage: report a shortfall before writing anything, and offer index-only instead of dropping entries.
  const needed=paths.reduce((n,p)=>n+(mode==='full'||/\.png$/i.test(p)?raw[p].bytes.length:256),0);
  const estimate=await storageEstimate();
  if(estimate&&estimate.quota&&estimate.usage+needed>estimate.quota*0.95){
    const mb=v=>(v/1048576).toFixed(1)+' MB';
    fail('not enough browser storage to register '+name+': it needs about '+mb(needed)+' and '+mb(Math.max(0,estimate.quota-estimate.usage))+' is free. Nothing was written. '+
      (mode==='full'?'Free space (export and remove shelves you do not need), or register it index-only: every entry and preview is kept, and entry data is read from the pack when it is needed.':'Free space, then retry.'));
  }
  const persistence=await requestPersistence();
  const job={key:'job:'+packSha256,packSha256,name,mode,state:'running',total:paths.length,done:0,started};
  const packRecord={packSha256,name:String(name).slice(0,240),bytes:bytes.length,fileCount:paths.length,format:report?.format||intake.kind||null,game,sourceSha256:source,shelf,mode,
    intake,state:'importing',registered:existing?.registered||started,updated:started,stats:null};
  await b.putMany([['meta',job],['packs',packRecord]]);
  const pathSet=new Set(paths),stats={entries:0,accepted:0,rejected:0,unknown:0,notRead:0,blobsStored:0,blobsShared:0,storedBytes:0,resumed:0};
  // the pack's own reports (what the intake reads as the extraction's root and summaries)
  const reportPaths=new Set(paths.filter(p=>/(^|\/)(native_report|resources_report|smb[123]_report|audio_report)\.json$/i.test(p)));
  const hashOfPath=new Map(),pending=[];
  let ops=[];
  const flush=async(done)=>{if(ops.length){await b.putMany(ops);ops=[];}await b.putMany([['meta',{...job,done}]]);onProgress?.({done,total:paths.length});};
  for(let i=0;i<paths.length;i++){
    const path=paths[i],id=entryId(packSha256,path),z=raw[path];
    const prior=existing?await b.get('entries',id):null;
    if(prior&&prior.contentHash&&(prior.data?.state!=='stored'||await b.has('blobs',prior.contentHash))){hashOfPath.set(path,prior.contentHash);stats.entries++;stats.resumed++;
      if(prior.previewPath&&!prior.preview)pending.push(prior);
      if(prior.kind==='unknown')stats.unknown++;if(prior.validation?.state==='rejected')stats.rejected++;else if(prior.validation?.state==='accepted')stats.accepted++;continue;}
    const unsafe=path.includes('\\')||path.includes('\0')||/^[A-Za-z]:/.test(path)||path.startsWith('/')||path.split('/').some(s=>!s||s==='.'||s==='..');
    let data=null,readError=null;
    try{data=z.method===8?await inflate(z.bytes,z.size):z.method===0?z.bytes:null;if(!data)throw Error('compression method '+z.method+' is not supported');
      if(data.length!==z.size||crc32(data)!==z.crc)throw Error('checksum or length differs');}catch(e){readError=String(e.message).slice(0,200);}
    // Kinds: the intake's own kinds first; then images, the pack's report, documents and text by type. "unknown" is
    // kept for data the intake cannot identify (it stays visible and readable).
    const kind=kinds.get(path)||null,type=fileType(path);
    const fallback=type==='image'?'image':reportPaths.has(path)?'report':type==='document'?'document':type==='text'?'text':'unknown';
    const entry={id,packSha256,path,shelf,sourceSha256:source,game,kind:kind||fallback,identified:!!kind,fileType:type,loads:PROJECT_KINDS.has(kind),registered:Date.now()};
    let validation={state:'not-applicable'},evidence={state:'none'},summary=null;
    if(readError){
      // Preserve the bytes exactly as the archive holds them, and say they could not be read.
      const hash=await sha256(z.bytes);entry.size=z.size;entry.contentHash='archive:'+hash;validation={state:'rejected',reason:'unreadable: '+readError};stats.notRead++;
      if(!(await b.has('blobs',entry.contentHash))){ops.push(['blobs',{hash:entry.contentHash,encoding:'archive-method-'+z.method,size:z.size,stored:z.bytes.slice()}]);stats.blobsStored++;stats.storedBytes+=z.bytes.length;}
      entry.data={state:'stored-unreadable'};
    }else{
      const hash=await sha256(data);entry.size=data.length;entry.contentHash=hash;hashOfPath.set(path,hash);
      if(unsafe)validation={state:'rejected',reason:'unsafe archive path (kept, never written to disk)'};
      else if(kind&&pack&&!/\.png$/i.test(path)){try{await pack.entry(path);validation={state:'accepted'};}catch(e){validation={state:'rejected',reason:String(e.message).slice(0,240)};}}
      else if(kind)validation={state:'accepted'};
      if(entry.fileType==='json'){try{const parsed=JSON.parse(new TextDecoder().decode(data));evidence=statedEvidence(parsed);if(PROJECT_KINDS.has(kind))summary=projectSummary(parsed);}catch(_){evidence={state:'none',note:'not valid JSON'};}}
      const keep=mode==='full'||entry.fileType==='image';
      if(keep){
        if(await b.has('blobs',hash)||ops.some(o=>o[0]==='blobs'&&o[1].hash===hash))stats.blobsShared++;
        else{let stored=null,encoding='raw';
          if(z.method===8&&z.bytes.length<data.length){stored=z.bytes.slice();encoding='deflate-raw';}
          else if(entry.fileType!=='image'){const d=await deflate(data);if(d&&d.length<data.length*0.9){stored=d;encoding='deflate-raw';}}
          if(!stored)stored=data.slice();
          ops.push(['blobs',{hash,encoding,size:data.length,stored}]);stats.blobsStored++;stats.storedBytes+=stored.length;}
        entry.data={state:'stored'};
      }else entry.data={state:'needs-source',packSha256,note:'registered index-only: open this pack again to read the data'};
    }
    entry.validation=validation;entry.evidence=evidence;if(summary)entry.project=summary;
    const preview=previewPathFor(path,kind,pathSet);if(preview){entry.previewPath=preview;pending.push(entry);}
    stats.entries++;if(entry.kind==='unknown')stats.unknown++;if(validation.state==='accepted')stats.accepted++;if(validation.state==='rejected')stats.rejected++;
    ops.push(['entries',entry]);
    if(ops.length>=batch)await flush(i+1);
  }
  for(const entry of pending){const h=hashOfPath.get(entry.previewPath);if(h){entry.preview={hash:h,path:entry.previewPath,entryId:entryId(packSha256,entry.previewPath)};ops.push(['entries',entry]);}}
  await flush(paths.length);
  const shelfRecord=(await b.get('shelves',shelf))||{shelf,sourceSha256:source,title:game,packs:[],created:Date.now()};
  if(!shelfRecord.packs.includes(packSha256))shelfRecord.packs.push(packSha256);shelfRecord.updated=Date.now();if(!shelfRecord.title&&game)shelfRecord.title=game;
  packRecord.state='complete';packRecord.updated=Date.now();packRecord.stats=stats;
  await b.putMany([['shelves',shelfRecord],['packs',packRecord]]);await b.deleteMany([['meta',job.key]]);
  return {packSha256,already:false,shelf,state:'complete',mode,stats,persisted:persistence,ms:Date.now()-started};
}

// ---------- reading ----------
async function blobBytes(hash){
  const blob=await backend().get('blobs',hash);if(!blob)return null;
  if(blob.encoding==='raw')return blob.stored;
  if(blob.encoding==='deflate-raw')return inflate(blob.stored,blob.size);
  return blob.stored; // archive bytes kept as-is
}
async function entry(id){const e=await backend().get('entries',id);if(!e)fail('no library entry '+id);return e;}
async function readEntry(id){
  const e=await entry(id);
  if(e.data?.state==='needs-source')fail('this entry was registered index-only; open its pack ('+e.packSha256.slice(0,12)+'…) again to read it');
  const bytes=await blobBytes(e.contentHash);if(!bytes)fail('the data of '+id+' is missing from the library; run library.verify');
  return {entry:e,bytes};
}
async function notesOf(id){return (await backend().get('notes',id))||null;}
const NOTE_FIELDS=['name','category','tags','group','text','possiblePlacements'];
async function annotate(id,notes){
  await entry(id);if(!notes||typeof notes!=='object')fail('notes must be an object');
  for(const k of Object.keys(notes))if(!NOTE_FIELDS.includes(k))fail('unknown note field '+k+' (allowed: '+NOTE_FIELDS.join(', ')+')');
  const clean={};
  if('name' in notes)clean.name=String(notes.name).slice(0,160);
  if('category' in notes)clean.category=String(notes.category).slice(0,80);
  if('tags' in notes){if(!Array.isArray(notes.tags))fail('tags must be a list');clean.tags=notes.tags.slice(0,32).map(t=>String(t).slice(0,48));}
  if('group' in notes)clean.group=String(notes.group).slice(0,120);
  if('text' in notes)clean.text=String(notes.text).slice(0,8000);
  if('possiblePlacements' in notes){if(!Array.isArray(notes.possiblePlacements))fail('possiblePlacements must be a list');
    clean.possiblePlacements=notes.possiblePlacements.slice(0,32).map(p=>({stage:String(p.stage??'').slice(0,80),room:p.room==null?null:String(p.room).slice(0,80),page:p.page==null?null:String(p.page).slice(0,80),
      confidence:['low','medium','high'].includes(p.confidence)?p.confidence:'low',note:String(p.note??'').slice(0,400)}));}
  const prior=(await notesOf(id))||{id,created:Date.now()};
  const record={...prior,...clean,id,source:'developer',updated:Date.now()};
  await backend().putMany([['notes',record]]);return record;
}

// ---------- integrity, discard, export, import ----------
async function verify({pack}={}){
  const b=backend(),entries=pack?await b.byIndex('entries','packSha256',pack):await b.all('entries');
  const problems=[],checked=new Set();let blobs=0;
  for(const e of entries){
    if(e.data?.state==='needs-source')continue;
    const blob=await b.get('blobs',e.contentHash);
    if(!blob){problems.push({id:e.id,problem:'data missing'});continue;}
    if(checked.has(blob.hash))continue;checked.add(blob.hash);blobs++;
    if(blob.encoding.startsWith('archive-method-'))continue;
    let bytes;try{bytes=await blobBytes(blob.hash);}catch(err){problems.push({id:e.id,problem:'data unreadable: '+err.message});continue;}
    if(bytes.length!==blob.size||await sha256(bytes)!==blob.hash)problems.push({id:e.id,problem:'data does not match its content hash'});
  }
  const packs=pack?[await b.get('packs',pack)].filter(Boolean):await b.all('packs');
  for(const p of packs){const n=entries.filter(e=>e.packSha256===p.packSha256).length;if(p.state==='complete'&&n!==p.fileCount)problems.push({pack:p.packSha256,problem:'has '+n+' entries for '+p.fileCount+' files'});
    if(p.state!=='complete')problems.push({pack:p.packSha256,problem:'import '+p.state+' (resume with library.register, or library.discard)'});}
  return {entries:entries.length,blobsChecked:blobs,problems,ok:!problems.length};
}
async function discard(packSha256){
  const b=backend(),p=await b.get('packs',packSha256);if(!p&&!(await b.get('meta','job:'+packSha256)))fail('no pack '+packSha256);
  const entries=await b.byIndex('entries','packSha256',packSha256);
  await b.deleteMany([...entries.map(e=>['entries',e.id]),['packs',packSha256],['meta','job:'+packSha256]]);
  // drop blobs no other entry uses; developer notes are kept (they are the developer's work) unless the entry is gone
  const still=new Set((await b.all('entries')).map(e=>e.contentHash));
  const orphan=[...new Set(entries.map(e=>e.contentHash))].filter(h=>!still.has(h));
  await b.deleteMany(orphan.map(h=>['blobs',h]));
  if(p){const shelf=await b.get('shelves',p.shelf);if(shelf){shelf.packs=shelf.packs.filter(x=>x!==packSha256);if(shelf.packs.length)await b.putMany([['shelves',shelf]]);else await b.deleteMany([['shelves',p.shelf]]);}}
  return {packSha256,entriesRemoved:entries.length,blobsRemoved:orphan.length};
}
const EXPORT_FORMAT='NESForgeLibraryExport';
async function exportShelf(shelf){
  const b=backend(),s=await b.get('shelves',shelf);if(!s)fail('no shelf '+shelf);
  const packs=(await Promise.all(s.packs.map(p=>b.get('packs',p)))).filter(Boolean);
  const entries=(await b.byIndex('entries','shelf',shelf));
  const notes=(await Promise.all(entries.map(e=>b.get('notes',e.id)))).filter(Boolean);
  const files=[],seen=new Set();
  for(const e of entries){if(e.data?.state==='needs-source'||seen.has(e.contentHash))continue;seen.add(e.contentHash);
    const blob=await b.get('blobs',e.contentHash);if(blob)files.push({name:'blobs/'+e.contentHash.replace(/[^\w.-]/g,'_')+'.'+blob.encoding,data:blob.stored,meta:{hash:blob.hash,encoding:blob.encoding,size:blob.size}});}
  const manifest={format:EXPORT_FORMAT,schema:SCHEMA,exported:Date.now(),shelf:s,packs,entries,notes,blobs:files.map(f=>f.meta)};
  const built=buildZip([{name:'library.json',data:new TextEncoder().encode(JSON.stringify(manifest))},...files.map(f=>({name:f.name,data:f.data}))]);
  const zip=built instanceof Uint8Array?built:new Uint8Array(await built.arrayBuffer());
  if(zip.length>64*1024*1024)fail('this shelf exports to '+(zip.length/1048576).toFixed(1)+' MB, more than the 64 MB NES Forge can read back; export its packs separately');
  return {shelf,bytes:zip,entries:entries.length,blobs:files.length,notes:notes.length};
}
async function importLibrary(bytes){
  await ensureMeta();
  const raw=parseZip(bytes instanceof Uint8Array?bytes:new Uint8Array(bytes),{onDemand:true});
  const read=async p=>{const z=raw[p];if(!z)fail('the export is missing '+p);const d=z.method===8?await inflate(z.bytes,z.size):z.bytes;if(crc32(d)!==z.crc)fail('checksum failed for '+p);return d;};
  const manifest=JSON.parse(new TextDecoder().decode(await read('library.json')));
  if(manifest.format!==EXPORT_FORMAT)fail('not a library export');if(manifest.schema>SCHEMA)fail('written by a newer NES Forge (schema '+manifest.schema+')');
  const b=backend();let blobsAdded=0,entriesAdded=0,notesAdded=0;
  for(const meta of manifest.blobs){
    if(await b.has('blobs',meta.hash))continue;
    const stored=await read('blobs/'+meta.hash.replace(/[^\w.-]/g,'_')+'.'+meta.encoding),blob={hash:meta.hash,encoding:meta.encoding,size:meta.size,stored};
    if(!meta.encoding.startsWith('archive-method-')){const d=meta.encoding==='deflate-raw'?await inflate(stored,meta.size):stored;if(d.length!==meta.size||await sha256(d)!==meta.hash)fail('blob '+meta.hash.slice(0,12)+'… does not match its content hash');}
    await b.putMany([['blobs',blob]]);blobsAdded++;
  }
  const ops=[];
  for(const e of manifest.entries)if(!(await b.has('entries',e.id))){ops.push(['entries',e]);entriesAdded++;}
  for(const n of manifest.notes){const mine=await b.get('notes',n.id);if(!mine||mine.updated<n.updated){ops.push(['notes',n]);notesAdded++;}}
  for(const p of manifest.packs)if(!(await b.has('packs',p.packSha256)))ops.push(['packs',p]);
  const shelf=(await b.get('shelves',manifest.shelf.shelf))||{...manifest.shelf,packs:[]};
  for(const p of manifest.shelf.packs)if(!shelf.packs.includes(p))shelf.packs.push(p);ops.push(['shelves',shelf]);
  for(let i=0;i<ops.length;i+=BATCH)await b.putMany(ops.slice(i,i+BATCH));
  return {shelf:manifest.shelf.shelf,entriesAdded,blobsAdded,notesAdded};
}

// ---------- status and listing ----------
async function status(){
  await ensureMeta();const b=backend();
  const jobs=(await b.all('meta')).filter(m=>m.key.startsWith('job:'));
  const [shelves,packs,entries,blobs,notes]=await Promise.all(['shelves','packs','entries','blobs','notes'].map(s=>b.count(s)));
  return {schema:SCHEMA,backend:b.kind,persistent:b.persistent,persisted:await persisted(),storage:await storageEstimate(),shelves,packs,entries,blobs,notes,
    interrupted:jobs.map(j=>({packSha256:j.packSha256,name:j.name,done:j.done,total:j.total,started:j.started}))};
}
function summarize(e,note){
  return {id:e.id,path:e.path,label:e.label||null,origin:e.origin||'pack',kind:e.kind,identified:e.identified,fileType:e.fileType,size:e.size,shelf:e.shelf,game:e.game,packSha256:e.packSha256,sourceSha256:e.sourceSha256,loads:e.loads,
    stages:(e.placement?.verified||[]).map(p=>({stage:p.stage,basis:p.basis})).filter(p=>p.stage),rendition:!!e.rendition,
    data:e.data?.state,validation:e.validation?.state,evidence:e.evidence?.state,preview:!!e.preview,project:e.project||null,notes:note?{name:note.name||null,category:note.category||null,hasPlacements:!!note.possiblePlacements?.length}:null};
}
async function list({shelf,pack,kind,search,offset=0,limit=200}={}){
  const b=backend();let rows=pack?await b.byIndex('entries','packSha256',pack):shelf?await b.byIndex('entries','shelf',shelf):await b.all('entries');
  if(kind)rows=rows.filter(e=>e.kind===kind);
  const notes=new Map((await b.all('notes')).map(n=>[n.id,n]));
  if(search){const q=String(search).toLowerCase();rows=rows.filter(e=>(e.path+' '+e.kind+' '+(notes.get(e.id)?.name||'')+' '+(notes.get(e.id)?.text||'')).toLowerCase().includes(q));}
  rows.sort((a,c)=>a.shelf.localeCompare(c.shelf)||a.path.localeCompare(c.path));
  const counts={};for(const e of rows)counts[e.kind]=(counts[e.kind]||0)+1;
  return {total:rows.length,counts,offset,items:rows.slice(offset,offset+limit).map(e=>summarize(e,notes.get(e.id)))};
}
async function openProject(id){
  const {entry:e,bytes}=await readEntry(id);
  if(!e.loads)fail(e.path+' is a '+e.kind+' entry, not a project');
  const data=JSON.parse(new TextDecoder().decode(bytes));
  services.ProjectStore.load(data,{intent:'library-open-project'});
  return {opened:e.path,name:data.projectName||null};
}

// Building blocks for other library sources (ROM catalogs, runtime observations). They keep the same rules:
// content-addressed data, one record per entry, verified placement written only by decoders and observations.
async function storeData(bytes){
  const data=bytes instanceof Uint8Array?bytes:new TextEncoder().encode(typeof bytes==='string'?bytes:JSON.stringify(bytes));
  const hash=await sha256(data),b=backend();
  if(!(await b.has('blobs',hash))){const d=await deflate(data),packed=!!d&&d.length<data.length*0.9;
    await b.putMany([['blobs',{hash,encoding:packed?'deflate-raw':'raw',size:data.length,stored:packed?d:data.slice()}]]);}
  return {hash,size:data.length};
}
async function putRecords(ops){await ensureMeta();for(let i=0;i<ops.length;i+=BATCH)await backend().putMany(ops.slice(i,i+BATCH));}
async function getPack(key){return backend().get('packs',key);}
async function setVerifiedPlacement(id,placements,{replaceBasis}={}){
  const e=await entry(id),kept=(e.placement?.verified||[]).filter(p=>!replaceBasis||p.basis!==replaceBasis);
  e.placement={...(e.placement||{}),verified:[...kept,...placements]};await backend().putMany([['entries',e]]);return e.placement;
}
services.ResourceLibrary=Object.freeze({schema:SCHEMA,register,status,list,entry,readEntry,notesOf,annotate,verify,discard,exportShelf,importLibrary,openProject,
  storeData,blobBytes,putRecords,getPack,setVerifiedPlacement,ensureMeta,
  backend:()=>backend().kind,_resetForTests:()=>{backendInstance?.close();backendInstance=null;}});

// ---------- commands ----------
if(C?.register){
  const R=(spec)=>C.register({group:'library',...spec});
  R({name:'library.status',title:'Library status',summary:'Schema, storage backend and quota, counts, and imports that were interrupted.',run:()=>status()});
  R({name:'library.register',title:'Register an extraction pack',summary:'Keeps every file of the pack in the library (projects, unknown files and rejected entries included). Idempotent; resumes an interrupted import. Does not change the working project.',
    args:{bytes:{type:'bytes',required:true},name:{type:'string',default:'pack.zip'},mode:{type:'string',default:'full',enum:['full','index-only']}},
    run:a=>register(a.bytes,{name:a.name,mode:a.mode})});
  R({name:'library.packs',title:'Registered packs',run:async()=>(await backend().all('packs')).map(p=>({packSha256:p.packSha256,name:p.name,game:p.game,sourceSha256:p.sourceSha256,shelf:p.shelf,state:p.state,mode:p.mode,fileCount:p.fileCount,intake:p.intake,stats:p.stats}))});
  R({name:'library.shelves',title:'Library shelves (one per source ROM)',run:()=>backend().all('shelves')});
  R({name:'library.list',title:'List library entries',args:{shelf:{type:'string'},pack:{type:'string'},kind:{type:'string'},search:{type:'string'},offset:{type:'int',default:0,min:0},limit:{type:'int',default:200,min:1,max:5000}},run:a=>list(a)});
  R({name:'library.inspect',title:'Inspect a library entry',summary:'The entry with its stated evidence and validation, and the developer\'s notes (kept separate).',args:{id:{type:'string',required:true}},
    run:async a=>{const e=await entry(a.id);return {entry:e,notes:await notesOf(a.id)};}});
  R({name:'library.read',title:'Read an entry\'s data',args:{id:{type:'string',required:true},as:{type:'string',default:'base64',enum:['base64','text','json']}},
    run:async a=>{const {entry:e,bytes}=await readEntry(a.id);
      if(a.as==='text')return {id:e.id,size:bytes.length,text:new TextDecoder().decode(bytes)};
      if(a.as==='json')return {id:e.id,size:bytes.length,json:JSON.parse(new TextDecoder().decode(bytes))};
      return {id:e.id,size:bytes.length,base64:b64(bytes)};}});
  R({name:'library.preview',title:'An entry\'s preview image',args:{id:{type:'string',required:true}},
    run:async a=>{const e=await entry(a.id);const hash=e.fileType==='image'?e.contentHash:e.preview?.hash;if(!hash)return {id:e.id,preview:null};
      const bytes=await blobBytes(hash);return {id:e.id,preview:bytes?'data:image/png;base64,'+b64(bytes):null};}});
  R({name:'library.annotate',title:'Annotate an entry',summary:'The developer\'s name, category, tags, group, notes and possible placements. Stored apart from verified evidence.',mutates:false,
    args:{id:{type:'string',required:true},notes:{type:'object',required:true}},run:a=>annotate(a.id,a.notes)});
  R({name:'library.verify',title:'Check library integrity',summary:'Every stored entry\'s data is present and matches its content hash; every complete pack has an entry per file.',args:{pack:{type:'string'}},run:a=>verify(a)});
  R({name:'library.discard',title:'Remove a pack from the library',summary:'Explicit only. Removes the pack\'s entries and any data no other entry uses.',args:{packSha256:{type:'string',required:true}},run:a=>discard(a.packSha256)});
  R({name:'library.export',title:'Export a shelf',summary:'A library export file (entries, notes and data) that library.import reads back.',args:{shelf:{type:'string',required:true}},
    run:async a=>{const r=await exportShelf(a.shelf);return {shelf:r.shelf,entries:r.entries,blobs:r.blobs,notes:r.notes,bytes:r.bytes.length,base64:b64(r.bytes)};}});
  R({name:'library.import',title:'Import a library export',summary:'Merges entries, data and notes; existing entries are kept; content hashes are checked.',args:{bytes:{type:'bytes',required:true}},run:a=>importLibrary(a.bytes)});
  R({name:'library.openProject',title:'Open a project entry in the editor',summary:'Explicitly loads one project found in a pack into the working project (like "Open project").',mutates:true,args:{id:{type:'string',required:true}},run:a=>openProject(a.id)});
}
})();
