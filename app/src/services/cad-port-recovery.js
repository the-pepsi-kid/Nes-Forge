/*
 * NES FORGE MODULE: src/services/cad-port-recovery.js
 * Entry: Forge.services.CadPortRecovery
 * Purpose (CAD-PORT-01): the translated CadEditor knowledge (re/cad-port-catalog.js) as one more source of recovered
 *   resources in Forge's existing pipeline, not a parallel one. On a ROM import (the existing RomImports event), a
 *   recognized cartridge's translated block layouts are decoded by the shared decoders (re/cad-port-decoders.js), written
 *   as a standard extraction pack (native_report.json, resources/<game>/<config>.json pages, PNG previews and editable
 *   projects only where the graphics are established) and registered through ResourceLibrary.register, which runs the
 *   editor's own intake (ExtractionPack.open) and validation. Native profiles keep priority: a screen table Forge
 *   already recovers natively is left to it. Nothing is executed from the ROM; nothing leaves the browser.
 * Bundle order: after rom-imports.js, resource-library.js and the CAD-PORT catalog and decoders.
 */
(()=>{
'use strict';
const F=window.Forge,services=F.services,C=F.commands;
const CAT=()=>window.CadPortCatalog,DEC=()=>window.CadPortDecoders,REV=()=>window.CadPortRevisions||{revisions:[]};
const VERSION=1,cp=x=>JSON.parse(JSON.stringify(x)),fail=m=>{throw Error('CAD-PORT recovery: '+m);};
const hex=n=>'$'+Number(n).toString(16).toUpperCase();
const sha=bytes=>window.NativeEngineFormat.sha256(bytes);
const session={registered:new Map(),last:null,pending:0,waiters:[]};
const settle=()=>{if(session.pending>0)return;const w=session.waiters.splice(0);for(const f of w)f();};
// resolves when no import-time registration is in flight (tests and tools count the library after it)
function settled(){return session.pending?new Promise(r=>session.waiters.push(r)):Promise.resolve();}
// an editable copy holds at most this many pages (each Forge scene carries its own 256-tile sheet); the resource lists all
const PROJECT_PAGES=12;

// ---------- recognition ----------
// exact: this cartridge's SHA-256 is a revision Agent Lab examined (re/cad-port-revisions.js; each definition records
// its own structural state and runtime observations);
// otherwise a title hint from the file name plus structure on this cartridge (decoders.recognize).
function revisionOf(digest){return (REV().revisions||[]).find(r=>r.sha256===digest)||null;}
function nativeScreenTables(bytes){
  const out=[];try{const p=services.NativeLayoutProject?.recognizes(bytes);if(p)out.push({profile:p.id,offset:p.screenOffset,length:p.screens*p.columns*p.rows,label:p.label});}catch(_){/* no native layout */}
  return out;
}
function recognize(bytes,name){
  const rom=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes),digest=sha(rom),rev=revisionOf(digest),cat=CAT(),dec=DEC();
  if(!cat||!dec)fail('the translated catalog is not loaded');
  const r=dec.recognize(rom,name,cat,rev?{games:[rev.game]}:{});
  const folder=rev?rev.game:r.game;if(!folder)return {recognized:false,sha256:digest,name:String(name||''),candidates:r.candidates.map(c=>({folder:c.folder,title:c.title,supported:c.supported,consistent:c.consistent,contradicted:c.contradicted}))};
  const game=cat.games.find(g=>g.folder===folder),cand=r.candidates.find(c=>c.folder===folder),natives=nativeScreenTables(rom);
  const defs=game.definitions.filter(d=>d.status==='decodable').map(d=>{
    const s=cand.definitions.find(x=>x.id===d.id),seen=rev?.definitions?.find(x=>x.id===d.id)||null;
    const native=natives.find(n=>d.screens.records.some(([o])=>o===n.offset));
    return {id:d.id,config:d.config,structural:s.state,log10Chance:s.log10Chance,control:s.control,checks:s.checks,
      runtime:seen?{forge:seen.forge||null,fceux:seen.fceux||null}:null,graphics:seen?.graphics||null,palette:seen?.palette||null,
      native:native?{profile:native.profile,label:native.label}:null};});
  return {recognized:true,sha256:digest,name:String(name||''),game:folder,title:game.title||folder,
    basis:rev?'exact revision examined by Agent Lab':'title hint and structure',revision:rev?{name:rev.name,observed:rev.observed}:null,definitions:defs};
}
// the definitions a pack carries: decodable, not contradicted, not covered by a native profile
const usable=d=>d.structural!=='contradicted'&&!d.native;
function level(d){ // the coverage level this cartridge's evidence reaches for one definition
  if(d.runtime?.forge?.screens?.length&&d.runtime?.fceux?.screens?.length)return 'independently verified (FCEUX) on this revision';
  if(d.runtime?.forge?.screens?.length)return 'observed at runtime (NES Forge) on this revision';
  if(d.runtime?.fceux?.screens?.length)return 'observed at runtime in FCEUX only on this revision (NES Forge\'s emulator did not reach it)';
  if(d.structural==='supported')return 'structurally supported on this cartridge';
  return 'structurally consistent on this cartridge (weak: no structural evidence)';
}

// ---------- the pack ----------
const NES_RGB=()=>typeof NP!=='undefined'?NP:null;
function crc32(data){let c=~0;for(let i=0;i<data.length;i++){c^=data[i];for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;}return ~c>>>0;}
function png(width,height,indexes,colours){ // a minimal indexed PNG (stored deflate blocks)
  const raw=new Uint8Array(height*(1+width));for(let y=0;y<height;y++){raw[y*(1+width)]=0;raw.set(indexes.subarray(y*width,(y+1)*width),y*(1+width)+1);}
  const blocks=[];for(let i=0;i<raw.length;i+=65535){const part=raw.subarray(i,i+65535),last=i+65535>=raw.length,h=new Uint8Array(5);h[0]=last?1:0;h[1]=part.length&255;h[2]=part.length>>8;h[3]=~part.length&255;h[4]=(~part.length>>8)&255;blocks.push(h,part);}
  let a=1,b=0;for(const v of raw){a=(a+v)%65521;b=(b+a)%65521;}
  const z=new Uint8Array(2+blocks.reduce((n,x)=>n+x.length,0)+4);z[0]=0x78;z[1]=1;let o=2;for(const x of blocks){z.set(x,o);o+=x.length;}z[o]=b>>8;z[o+1]=b&255;z[o+2]=a>>8;z[o+3]=a&255;
  const chunk=(type,data)=>{const out=new Uint8Array(12+data.length),dv=new DataView(out.buffer);dv.setUint32(0,data.length);for(let i=0;i<4;i++)out[4+i]=type.charCodeAt(i);out.set(data,8);dv.setUint32(8+data.length,crc32(out.subarray(4,8+data.length)));return out;};
  const ihdr=new Uint8Array(13),dv=new DataView(ihdr.buffer);dv.setUint32(0,width);dv.setUint32(4,height);ihdr[8]=8;ihdr[9]=3;
  const plte=new Uint8Array(colours.length*3);colours.forEach((c,i)=>plte.set(c,i*3));
  const parts=[Uint8Array.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('PLTE',plte),chunk('IDAT',z),chunk('IEND',new Uint8Array(0))];
  const out=new Uint8Array(parts.reduce((n,x)=>n+x.length,0));let p=0;for(const x of parts){out.set(x,p);p+=x.length;}return out;
}
// the background graphics of a definition: a 4 KiB pattern table from this cartridge, either as the configuration
// states it or as Agent Lab located it in CHR ROM while the game drew the screens on this revision; and a palette,
// constant in the configuration, a cartridge table, or observed on this revision. Never guessed.
function graphicsOf(rom,def,rec){
  let chr=null,chrBasis=null,pal=null,palBasis=null;
  // what Agent Lab saw this revision use while it drew these screens comes first; the configuration's statement next
  if(rec?.graphics?.source==='chr-rom'&&Array.isArray(rec.graphics.kilobytes)&&rec.graphics.kilobytes.length===4&&rec.graphics.kilobytes.every(o=>Number.isInteger(o)&&o>=16&&o+1024<=rom.length)){
    chr=new Uint8Array(4096);rec.graphics.kilobytes.forEach((o,k)=>chr.set(rom.subarray(o,o+1024),k*1024));chrBasis='located in CHR ROM while the game drew these screens on this revision ('+rec.graphics.kilobytes.map(hex).join(', ')+')';}
  else if(rec?.graphics?.source==='chr-ram'&&Array.isArray(rec.graphics.runs)&&Array.isArray(rec.graphics.uniform)){
    // a CHR-RAM table the game uploads from PRG: every non-uniform tile was found verbatim; rebuilt from this cartridge
    const t=new Uint8Array(4096),covered=new Set();let ok=true;
    for(const [first,count,offset] of rec.graphics.runs){if(!(Number.isInteger(first)&&Number.isInteger(count)&&Number.isInteger(offset)&&offset>=16&&offset+count*16<=rom.length&&first+count<=256)){ok=false;break;}t.set(rom.subarray(offset,offset+count*16),first*16);for(let k=0;k<count;k++)covered.add(first+k);}
    for(const [tile,value] of rec.graphics.uniform){if(!(Number.isInteger(tile)&&tile>=0&&tile<256&&Number.isInteger(value))){ok=false;break;}t.fill(value&255,tile*16,tile*16+16);covered.add(tile);}
    if(ok&&covered.size===256){chr=t;chrBasis='uploaded to CHR RAM from PRG while the game drew these screens on this revision ('+rec.graphics.runs.length+' run'+(rec.graphics.runs.length===1?'':'s')+' from '+hex(rec.graphics.runs[0][2])+')';}}
  else if(def.graphics?.source==='cartridge'){const o=def.graphics.offset;if(o>=16&&o+4096<=rom.length){chr=rom.slice(o,o+4096);chrBasis='stated by the CadEditor configuration (file '+hex(o)+'), not observed on this revision';}}
  if(Array.isArray(rec?.palette)&&rec.palette.length===16&&rec.graphics){pal=rec.palette.slice();palBasis='observed while the game drew these screens on this revision';}
  else if(def.palette?.source==='constant'){pal=def.palette.values.slice(0,16);palBasis='constant in the CadEditor configuration';}
  else if(def.palette?.source==='cartridge'){const o=def.palette.offset;if(o>=16&&o+16<=rom.length){pal=Array.from(rom.subarray(o,o+16));palBasis='cartridge table at file '+hex(o)+' (CadEditor configuration)';}}
  if(pal&&pal.some(v=>!Number.isInteger(v)||v<0||v>63))pal=null;
  // graphics seen while the game drew some screens are established for those screens only; a configuration's
  // statement covers the whole definition
  const seen=[...new Set([...(rec?.runtime?.forge?.screens||[]),...(rec?.runtime?.fceux?.screens||[])])].sort((a,b)=>a-b);
  const observed=!!chr&&/while the game drew|uploaded to CHR RAM/.test(chrBasis);
  return {chr,chrBasis,pal,palBasis,screens:observed?seen:null};
}
function render(page,chr,pal){ // the page as NES colour indexes, then an indexed PNG of the colours it uses
  const rgbOf=NES_RGB();if(!rgbOf)return null;const px=new Uint8Array(256*240);
  for(let ty=0;ty<30;ty++)for(let tx=0;tx<32;tx++){const t=page.nt[ty*32+tx],a=page.attr[(ty>>2)*8+(tx>>2)],p=(a>>(((ty>>1)&1)*4+((tx>>1)&1)*2))&3;
    for(let y=0;y<8;y++){const lo=chr[t*16+y],hi=chr[t*16+y+8];for(let x=0;x<8;x++){const c=((lo>>(7-x))&1)|(((hi>>(7-x))&1)<<1);px[(ty*8+y)*256+tx*8+x]=(c?pal[p*4+c]:pal[0])&63;}}}
  const used=[...new Set(px)].sort((x,y)=>x-y),slot=new Map(used.map((c,i)=>[c,i]));for(let i=0;i<px.length;i++)px[i]=slot.get(px[i]);
  return png(256,240,px,used.map(c=>rgbOf[c]||[0,0,0]));
}
async function pack(bytes,name,{recognition=null}={}){
  const rom=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes),r=recognition||recognize(rom,name);if(!r.recognized)fail('this cartridge is not recognized by a translated definition');
  const cat=CAT(),dec=DEC(),game=cat.games.find(g=>g.folder===r.game),enc=new TextEncoder(),files=[],summary=[],up=cat.upstream;
  for(const d of r.definitions){
    if(!usable(d)){summary.push({id:d.id,included:false,reason:d.native?'recovered by the native profile '+d.native.profile:'structure contradicts it on this cartridge'});continue;}
    const def=game.definitions.find(x=>x.id===d.id),decoded=dec.decodeAll(rom,def),screens=decoded.screens,base=d.id.replace(/[^A-Za-z0-9_\-\/]/g,'_');
    const projected=screens.map(s=>dec.project(decoded,def,s)),pages=[];
    projected.forEach((p,si)=>dec.pages(p).forEach((pg,k)=>pages.push({screen:si,page:k,x:pg.x,y:pg.y,width:pg.width,height:pg.height,palettesStated:Math.round(pg.palettesStated*1000)/1000,nt:pg.nt,attr:pg.attr})));
    if(!pages.length||pages.length>4096){summary.push({id:d.id,included:false,reason:'no pages'});continue;}
    const g=graphicsOf(rom,def,d),lvl=level(d);
    const resource={resource:{id:'cad-port:'+d.id,label:(game.title||game.folder)+' · '+def.config.replace(/^Settings_|\.cs$/g,'')+' · '+screens.length+' screen'+(screens.length===1?'':'s'),
      reason:'Translated from CadEditor ('+up.repository+', '+String(up.commit).slice(0,7)+', MIT). '+lvl+'. Layout only: '+(g.chr?'graphics '+g.chrBasis+(g.screens?', established for screens '+g.screens.join(', ')+' only':'')+'.':'graphics not established for this cartridge (CadEditor reads them from an emulator dump, which is not included).')},
      pages,source:{sha256:r.sha256,blocks:{format:def.blocks.format,fileOffset:def.blocks.offset,count:def.blocks.count,...(def.blocks.paletteOffset!==undefined?{paletteFileOffset:def.blocks.paletteOffset}:{})},
        ...(def.bigBlocks?{bigBlocks:{format:def.bigBlocks.format,fileOffset:def.bigBlocks.offset,count:def.bigBlocks.count,...(def.bigBlocks.paletteOffset!==undefined?{paletteFileOffset:def.bigBlocks.paletteOffset}:{})}}:{}),
        screens:screens.map(s=>({index:s.index,fileOffset:s.offset,length:s.length,width:s.width,height:s.height}))},
      evidence:{level:lvl,structural:d.structural,log10Chance:d.log10Chance,control:d.control,runtime:d.runtime,graphics:g.chr?g.chrBasis:null,palette:g.pal?g.palBasis:null},
      translation:{definition:d.id,config:def.config,upstream:{project:up.project,repository:up.repository,commit:up.commit,license:up.license,copyright:up.copyright}}};
    files.push({name:'resources/'+base+'.json',data:enc.encode(JSON.stringify(resource))});
    let preview=false,project=false;
    const drawn=g.screens?pages.filter(pg=>g.screens.includes(pg.screen)):pages; // the pages these graphics are established for
    if(g.chr&&g.pal&&drawn.length){const img=render(drawn[0],g.chr,g.pal);if(img){files.push({name:'resources/'+base+'.png',data:img});preview=true;}
      // an editable copy: Forge scenes made by Forge's own constructor and normalization (makeScene, ProjectStore.prepareLoad)
      if(typeof makeScene==='function'&&typeof decodeTiles==='function'&&services.ProjectStore?.prepareLoad){
        const chr=decodeTiles(Array.from(g.chr)),palette=[0,1,2,3].map(i=>g.pal.slice(i*4,i*4+4)),scenes=drawn.slice(0,PROJECT_PAGES).map((pg,i)=>makeScene({id:'cad-port-'+base.replace(/\//g,'-')+'-'+i,name:'Screen '+pg.screen+(drawn.filter(x=>x.screen===pg.screen).length>1?' · page '+pg.page:''),
          nt:pg.nt,attr:pg.attr,chr,pal:palette,sceneType:'static',scrollDir:'none',gravity:0,captureMeta:{cadPort:{version:VERSION,definition:d.id,screen:pg.screen,page:pg.page,sourceSha256:r.sha256,fileOffset:screens[pg.screen].offset,level:lvl}}}));
        const doc={format:'NESForge',version:services.ProjectStore.schema,projectName:((game.title||game.folder)+' · '+def.config.replace(/^Settings_|\.cs$/g,'')+' (translated layout)').slice(0,120),scenes,activeScene:0,metasprites:[],animations:[],worlds:[],asmSource:'',mapper:0,mirroring:'v',hasSRAM:false,prgBanks:1,chrBanks:1,packScenes:true,importedRom:null,instruments:[],patterns:[],orderList:[],sfx:[],tempo:150,speed:6,audRows:64};
        const prepared=services.ProjectStore.prepareLoad(doc);files.push({name:'projects/'+base+'.nesforge.json',data:enc.encode(JSON.stringify({...doc,scenes:prepared.scenes}))});project=true;}}
    summary.push({id:d.id,included:true,screens:screens.length,pages:pages.length,level:lvl,preview,project,...(project?{projectPages:Math.min(drawn.length,PROJECT_PAGES)}:{}),graphics:g.chr?g.chrBasis:null,...(g.screens?{graphicsFor:'screens '+g.screens.join(', ')+' (seen drawn with them)'}:{})});
  }
  const included=summary.filter(s=>s.included);if(!included.length)fail('no translated definition applies to this cartridge');
  const report={format:'NESForgeNativeExtraction',game:(game.title||game.folder)+' · CadEditor-derived layouts',rom:{sha256:r.sha256,byteLength:rom.length},origin:'cad-port',
    recovery:{method:'CAD-PORT-01 translated definitions',version:VERSION,basis:r.basis,game:r.game,upstream:up,definitions:summary},
    limitations:['Layouts (blocks and screens) as CadEditor\'s configuration describes them. Objects, enemies, level order, collision and the game\'s own engine are not part of these resources.',
      'Graphics appear only where they are established for this cartridge; otherwise a resource carries tile numbers and palettes without pictures.',
      'Editable copies are Forge projects; there is no writer back into the original cartridge for translated layouts.']};
  files.unshift({name:'native_report.json',data:enc.encode(JSON.stringify(report))});
  if(typeof buildZip!=='function')fail('the archive writer is not available');
  const zip=new Uint8Array(await buildZip(files).arrayBuffer());
  return {zip,report,files:files.map(f=>({name:f.name,bytes:f.data.length})),definitions:summary};
}
async function register(bytes,name,{recognition=null,quiet=false}={}){
  const r=recognition||recognize(bytes,name);if(!r.recognized)return {registered:false,reason:'not recognized',recognition:summarize(r)};
  const p=await pack(bytes,name,{recognition:r});
  if(!services.ResourceLibrary?.register)fail('the resource library is not available');
  const result=await services.ResourceLibrary.register(p.zip,{name:(r.title)+' · CadEditor-derived layouts.zip'});
  const included=p.definitions.filter(d=>d.included),screens=included.reduce((n,d)=>n+d.screens,0);
  const out={registered:true,already:!!result.already,packSha256:result.packSha256,game:r.game,title:r.title,basis:r.basis,definitions:included.length,screens,
    withGraphics:included.filter(d=>d.preview).length,editable:included.filter(d=>d.project).length,skipped:p.definitions.filter(d=>!d.included)};
  session.registered.set(r.sha256,out);session.last=out;
  if(!quiet&&!out.already)window.showToast?.('CadEditor-derived layouts for '+r.title+': '+screens+' screens from '+included.length+' definition'+(included.length===1?'':'s')+' added to your Resource library ('+r.basis+').');
  try{window.dispatchEvent(new CustomEvent('forge:cad-port-registered',{detail:cp(out)}));}catch(_){/* no DOM events */}
  return out;
}
function summarize(r){return r.recognized?{recognized:true,game:r.game,title:r.title,basis:r.basis,definitions:r.definitions.map(d=>({id:d.id,structural:d.structural,level:level(d),native:d.native?.profile||null}))}:{recognized:false,candidates:r.candidates};}
// a row for the editor's intake report (ProjectGateway.inspect), so the import dialog says what the catalog adds
function intake(bytes,name){
  let r;try{r=recognize(bytes,name);}catch(_){return null;}if(!r.recognized)return null;
  const use=r.definitions.filter(usable),screens=use.reduce((n,d)=>{const def=CAT().games.find(g=>g.folder===r.game).definitions.find(x=>x.id===d.id);return n+def.screens.records.reduce((m,x)=>m+x[1],0);},0),native=r.definitions.filter(d=>d.native).length;
  return {recognition:summarize(r),row:{resource:'Translated layouts (CadEditor)',inspect:use.length+' translated definition'+(use.length===1?'':'s')+' · '+screens+' screens · '+r.basis+(native?' · '+native+' left to the native profile':''),
    edit:'Added to the Resource library on import; editable copies where the graphics are established',build:'No writer into the original cartridge for translated layouts'}};
}

// ---------- coverage ----------
function coverage(){
  const cat=CAT(),revs=REV().revisions||[],games=[];let configs=0,decodable=0,structural=0,observed=0,independent=0;
  for(const g of cat.games){
    const ids=new Set(),obs=new Set(),ind=new Set();
    for(const r of revs.filter(r=>r.game===g.folder))for(const d of r.definitions){if(d.structural==='supported'||d.structural==='consistent')ids.add(d.id);if(d.forge?.screens?.length)obs.add(d.id);if(d.forge?.screens?.length&&d.fceux?.screens?.length)ind.add(d.id);}
    const dec=g.definitions.filter(d=>d.status==='decodable').length;configs+=g.definitions.length;decodable+=dec;structural+=ids.size;observed+=obs.size;independent+=ind.size;
    games.push({folder:g.folder,title:g.title,configs:g.definitions.length,decodable:dec,partial:g.definitions.filter(d=>d.status==='partial').length,
      localRevisions:revs.filter(r=>r.game===g.folder).length,structurallyConsistent:ids.size,runtimeObserved:obs.size,independentlyVerified:ind.size});
  }
  return {format:'NESForgeCadPortCoverage',version:VERSION,upstream:cat.upstream,catalog:{titlesListed:cat.summary.titlesListed,folders:cat.games.length,configs},
    translated:{decodable,partial:cat.summary.partial,untranslated:cat.summary.untranslated,gamesWithDecodable:cat.summary.gamesWithDecodable},
    verifiedRevisions:revs.length,structurallyConsistent:structural,runtimeObserved:observed,independentlyVerified:independent,games};
}

// ---------- the import event (subscribed once every module has loaded) ----------
function autoEnabled(){try{return window.localStorage?.getItem('forge.cadport.auto')!=='off';}catch(_){return true;}}
setTimeout(()=>{
  services.RomImports?.subscribe(entry=>{if(!autoEnabled()||!entry.ines)return;session.pending++;void (async()=>{
    const bytes=services.RomImports.bytes(entry.sha256);if(!bytes)return;
    const r=recognize(bytes,entry.name);if(!r.recognized)return;await register(bytes,entry.name,{recognition:r});
  })().catch(error=>{session.last={registered:false,error:String(error?.message||error).slice(0,300)};}).finally(()=>{session.pending--;settle();});});
},0);

services.CadPortRecovery=Object.freeze({version:VERSION,recognize,pack,register,intake,coverage,settled,status:()=>({auto:autoEnabled(),registered:[...session.registered.values()].map(cp),last:session.last?cp(session.last):null})});
if(C?.register){
  C.register({name:'cadport.recognize',group:'cadport',title:'Recognize a ROM against the translated CadEditor catalog',summary:'Title hint and structure, or an exact revision observed at runtime; per definition: structural state, runtime observations and the coverage level.',
    args:{bytes:{type:'bytes',required:true},name:{type:'string',default:'rom.nes'}},run:a=>summarize(recognize(a.bytes,a.name))});
  C.register({name:'cadport.register',group:'cadport',title:'Add a ROM\'s translated layouts to the Resource library',summary:'The same as on import: a standard extraction pack, registered by ResourceLibrary.register (the editor\'s intake validates it).',mutates:false,
    args:{bytes:{type:'bytes',required:true},name:{type:'string',default:'rom.nes'}},run:a=>register(a.bytes,a.name,{quiet:true})});
  C.register({name:'cadport.pack',group:'cadport',title:'Build the translated-layout pack without registering it',summary:'File list and per-definition summary (the archive itself stays in memory).',
    args:{bytes:{type:'bytes',required:true},name:{type:'string',default:'rom.nes'}},run:async a=>{const p=await pack(a.bytes,a.name);return {files:p.files,definitions:p.definitions,bytes:p.zip.length};}});
  C.register({name:'cadport.coverage',group:'cadport',title:'Catalog coverage: catalog, translated, structurally consistent, runtime-observed, independently verified',summary:'Tracked separately per game.',run:()=>coverage()});
  C.register({name:'cadport.status',group:'cadport',title:'Translated layouts registered in this session',summary:'And whether import-time registration is on (localStorage forge.cadport.auto = off turns it off).',run:()=>services.CadPortRecovery.status()});
}
})();
