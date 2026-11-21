/*
 * NES FORGE MODULE: src/ui/library-provenance.js
 * Entry: Forge.services.LibraryProvenance, Forge.services.LibraryProvenanceUI, commands library.provenance and
 *   library.inspectCode
 * Purpose: a library resource keeps its identity wherever it is used. One shared description (where it came from,
 *   its typed ROM locations, its verified code relationships and the other records of the same resource) is shown
 *   in the Scene and Metasprite editors, CODE, Resources and RE/DISASM. "Inspect in CODE/RE" opens the source ROM in
 *   the RE analysis workspace at the recorded file offset, with the recorded bank and CPU address, so the bytes and
 *   the offline disassembly of a data table or a routine are one click from the sprite in the scene.
 *   The source ROM is only read from memory (an import in this session, or a file the developer chooses, checked
 *   against the recorded SHA-256); nothing here stores a ROM.
 * Bundle order: after src/services/library-catalog.js.
 */
(()=>{
'use strict';
const F=window.Forge,services=F.services,C=F.commands,L=services.ResourceLibrary;
if(!L)return;
const hex=(n,w=4)=>Number(n).toString(16).toUpperCase().padStart(w,'0');
const plural=(n,word)=>n+' '+word+(n===1?'':'s');
const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};

// ---------- the description of a resource ----------
// A pack's stated location keeps its own field names; it is never turned into a typed address.
function statedLocation(fields){
  const f=fields||{},loc={role:'stated',name:'location stated by the pack',stated:true,check:'stated by the pack, not re-read from the ROM'};
  if(f.fileOffset)loc.fileOffset=f.fileOffset.first;if(f.cpu)loc.cpu=f.cpu.first;if(f.bank)loc.statedBank={value:f.bank.first,field:f.bank.field};
  if(f.ppu)loc.ppu=f.ppu.first;if(f.mapper)loc.statedMapper=f.mapper.first;
  return Number.isInteger(loc.fileOffset)||Number.isInteger(loc.cpu)?loc:null;
}
// Entries registered before typed locations (schema 1) carry one location as fields; their bank field was the
// decoder's own (bank16KiB is a PRG bank, bank4KiB a CHR bank).
function legacyDecoded(ev){
  const f=ev.fields||{};if(!f.fileOffset)return null;
  const loc={role:'source',name:'first recorded location',fileOffset:f.fileOffset.first,check:'not checked: registered before typed locations; register the catalog again to check it'};
  if(f.cpu)loc.cpu=f.cpu.first;
  if(f.bank?.field==='bank16KiB')loc.prgBank={index:f.bank.first,size:16384};else if(f.bank?.field==='bank4KiB')loc.chrBank={index:f.bank.first,size:4096};
  return loc;
}
async function entryOrNull(id){try{return await L.entry(id);}catch(_){return null;}}
async function resolve(ref){
  const r=typeof ref==='string'?{entryId:ref}:{...(ref||{})};
  const e=r.entryId?await entryOrNull(r.entryId):null;
  const out={ref:r,entryId:r.entryId||null,mode:r.mode||null,stage:r.stage||null,inLibrary:!!e,label:e?.label||e?.path?.split('/').pop()||r.label||r.poseId||r.entryId||'library resource',
    game:e?.game||r.game||null,kind:e?.kind||r.kind||null,origin:e?.origin||null,investigation:e?.provenance?.job||null,sourceSha256:e?.sourceSha256||r.sourceSha256||null,
    evidenceState:e?.evidence?.state||(r.location?'recorded with the use':'none'),basis:e?.evidence?.basis||null,rom:e?.evidence?.rom||null,
    primary:null,locations:[],code:[],related:[],links:[],placements:(e?.placement?.verified||[]).map(p=>({...p})),
    changedSinceUse:!!(e&&r.contentHash&&e.contentHash!==r.contentHash),usedAt:r.at||null,derivedFrom:r.derivedFrom||null};
  const ev=e?.evidence;
  if(ev?.state==='decoded'&&ev.primary){out.primary=ev.primary;out.locations=ev.locations||[ev.primary];out.code=(ev.code||[]).map(l=>({...l,owner:out.label,basis:'decoded with this record'}));}
  else if(ev?.state==='decoded'){const l=legacyDecoded(ev);if(l){out.primary=l;out.locations=[l];}}
  else if(ev?.state==='stated'){const l=statedLocation(ev.fields);if(l){out.primary=l;out.locations=[l];}}
  else if(ev?.state==='observed'&&ev.primary){out.primary=ev.primary;out.locations=[ev.primary];if(ev.primary.code)out.code=[{...ev.primary,owner:out.label,basis:'observed at runtime (state snapshot)'}];}
  else if(!e&&r.location){out.primary={...r.location,name:'location recorded when it was used',check:'copied into the project when it was used; the library entry is not in this browser'};out.locations=[out.primary];}
  // code that draws this pose, established at runtime: the enemy slot type seen showing it on screen
  if(e?.kind==='pose'){
    const prefix=e.id.split(':').slice(0,2).join(':'),byType=new Map();
    for(const p of out.placements)if(p.basis==='runtime'&&Number.isInteger(p.enemyType)){if(!byType.has(p.enemyType))byType.set(p.enemyType,[]);byType.get(p.enemyType).push(p.stage);}
    for(const [type,stages] of byType){
      const actor=await entryOrNull(prefix+':actor:ng-actor:'+type);if(!actor)continue;
      const basis='runtime: enemy slot type '+type+' (RAM $0400+slot) showed this pose on screen in '+stages.join(', ')+'; actor record ng-actor:'+type+' is the decoder\'s record for that type';
      out.related.push({entryId:actor.id,label:actor.label,relation:'drawn by enemy type '+type,basis});
      for(const l of actor.evidence?.code||[])out.code.push({...l,owner:actor.label,basis});
    }
  }
  for(const l of e?.links||[]){const t=await entryOrNull(l.id);out.links.push({id:l.id,relation:l.relation,basis:l.basis,label:t?(t.label||t.path.split('/').pop()):l.id,origin:t?(t.origin||'pack'):null,exists:!!t});}
  return out;
}
const bankText=loc=>loc.prgBank?'PRG bank '+loc.prgBank.index+' ('+loc.prgBank.size/1024+' KiB)':loc.chrBank?'CHR bank '+loc.chrBank.index+' ('+loc.chrBank.size/1024+' KiB)':
  loc.derivedPrgBank?'in PRG bank '+loc.derivedPrgBank.index+' (16 KiB, from the offset)':loc.statedBank?'bank '+loc.statedBank.value+' (pack field "'+loc.statedBank.field+'")':'';
function short(loc){
  if(!loc)return 'ROM location unknown';
  return [Number.isInteger(loc.fileOffset)?'file 0x'+hex(loc.fileOffset,5):null,bankText(loc)||null,Number.isInteger(loc.cpu)?'CPU $'+hex(loc.cpu):null].filter(Boolean).join(' · ');
}
// Every address type on its own row; nothing is inferred from another type.
function rows(loc,rom){
  const out=[];if(!loc)return [['ROM location','Unknown. The entry stays in the library; its location can be identified later.']];
  out.push(['File offset',Number.isInteger(loc.fileOffset)?'0x'+hex(loc.fileOffset,5)+' ('+loc.fileOffset+')'+(loc.length?' · '+plural(loc.length,'byte'):''):'not recorded']);
  if(loc.region)out.push(['Region',loc.region+(Number.isInteger(loc.regionOffset)?' · +0x'+hex(loc.regionOffset,5)+' into it':'')]);
  if(loc.prgBank)out.push(['PRG bank','physical bank '+loc.prgBank.index+' of '+loc.prgBank.size/1024+' KiB']);
  if(loc.derivedPrgBank)out.push(['PRG bank','the offset lies in physical 16 KiB bank '+loc.derivedPrgBank.index+'; the decoder names no bank']);
  if(loc.chrBank)out.push(['CHR bank','physical bank '+loc.chrBank.index+' of '+loc.chrBank.size/1024+' KiB']);
  if(loc.statedBank)out.push(['Bank (as stated)',loc.statedBank.value+' · pack field "'+loc.statedBank.field+'"']);
  out.push(['CPU address',Number.isInteger(loc.cpu)?'$'+hex(loc.cpu):loc.region==='CHR ROM'?'none: CHR data is read by the PPU, not the CPU':'not recorded']);
  if(loc.cpuWindow&&loc.prgBank)out.push(['Mapper state','reading $'+hex(loc.cpu)+' needs PRG bank '+loc.prgBank.index+' mapped at $'+hex(loc.cpuWindow.start)+'–$'+hex(loc.cpuWindow.end)+(rom?' (mapper '+rom.mapper+' from the cartridge header)':'')]);
  else if(rom)out.push(['Mapper','mapper '+rom.mapper+' (from the cartridge header)']);
  if(Number.isInteger(loc.statedMapper))out.push(['Mapper (as stated)',String(loc.statedMapper)]);
  out.push(['PPU address',Number.isInteger(loc.ppu)?'$'+hex(loc.ppu):'not established']);
  out.push(['Check',loc.check||'not checked']);
  return out;
}

// ---------- RE/DISASM: open the source ROM at a location ----------
let lastInspected=null;
function bankLabel(loc){return loc.prgBank&&loc.cpuWindow?'PRG bank '+loc.prgBank.index+' at $'+hex(loc.cpuWindow.start)+'–$'+hex(loc.cpuWindow.end):bankText(loc)||'';}
async function openAt(d,loc){
  if(!loc||!Number.isInteger(loc.fileOffset))return {opened:false,reason:'this location has no file offset to open'};
  const rom=d.sourceSha256&&services.SourceROMs?.get(d.sourceSha256);
  if(!rom)return {opened:false,needsRom:true,reason:'the source ROM (SHA-256 '+String(d.sourceSha256||'unknown').slice(0,16)+'…) is not open in this session'};
  const ui=services.REAnalysisUI;if(!ui)return {opened:false,reason:'the RE analysis workspace is not available'};
  const current=ui.currentAnalysis?.();
  if(current?.report?.identity?.sha256!==d.sourceSha256){const ok=await ui.openFile(new File([rom.bytes],rom.name||'source.nes'));if(!ok)return {opened:false,reason:'the RE workspace could not open the source ROM'};}
  const room=rom.bytes.length-loc.fileOffset,cpu=Number.isInteger(loc.cpu)&&loc.region!=='CHR ROM'?loc.cpu:null;
  let length=loc.code?Math.max(loc.length||0,96):Math.max(loc.length||16,16);length=Math.min(length,room,cpu===null?Infinity:65536-cpu);
  const viewed=ui.viewRange({fileOffset:loc.fileOffset,length,cpuAddress:cpu,bankLabel:bankLabel(loc),variant:'2a03'});
  // other RE panels sit above the analysis view in the same workspace: bring the inspected range into view
  if(viewed)requestAnimationFrame(()=>document.getElementById('reAnalysisRange')?.scrollIntoView({block:'start'}));
  return {opened:!!viewed,fileOffset:loc.fileOffset,length,cpuAddress:cpu,bankLabel:bankLabel(loc),role:loc.role,code:!!loc.code};
}
async function inspect(ref,{role=null,code=false}={}){
  const d=await resolve(ref);lastInspected={ref,d};
  try{switchTab('disasm');}catch(_){}
  const loc=role?[...d.locations,...d.code].find(l=>l.role===role&&(code?!!l.code:true)):code?d.code[0]:d.primary;
  const result=await openAt(d,loc||d.primary);
  renderOrigin(d,result);
  return {resource:summary(d),location:loc?{role:loc.role,name:loc.name,code:!!loc.code,...pick(loc)}:null,...result};
}
const pick=l=>({fileOffset:l.fileOffset,length:l.length,region:l.region,prgBank:l.prgBank||null,chrBank:l.chrBank||null,cpu:l.cpu??null,cpuWindow:l.cpuWindow||null,ppu:l.ppu??null,check:l.check});
function summary(d){return {entryId:d.entryId,label:d.label,game:d.game,kind:d.kind,origin:d.origin,mode:d.mode,stage:d.stage,inLibrary:d.inLibrary,sourceSha256:d.sourceSha256,evidence:d.evidenceState,basis:d.basis,rom:d.rom,
  primary:d.primary?{role:d.primary.role,name:d.primary.name,...pick(d.primary)}:null,locations:d.locations.length,
  code:d.code.map(l=>({role:l.role,name:l.name,owner:l.owner,basis:l.basis,...pick(l)})),related:d.related,links:d.links,placements:d.placements.map(p=>({stage:p.stage||null,basis:p.basis,enemyType:p.enemyType??null})),changedSinceUse:d.changedSinceUse};}

// ---------- shared card ----------
const STYLE=`.lpv-card{font:11px/1.45 system-ui,sans-serif;color:#d7eaf4;background:#0f1d2a;border:1px solid #2f5068;border-radius:6px;padding:8px;margin:6px 0;text-align:left;overflow-wrap:anywhere}
.lpv-card h4{margin:0 0 4px;font:700 11px/1.3 system-ui,sans-serif;letter-spacing:.04em;text-transform:uppercase;color:#7fd4ff}.lpv-card .lpv-title{font-weight:700;font-size:12px;color:#fff}
.lpv-card dl{display:grid;grid-template-columns:max-content 1fr;gap:1px 8px;margin:4px 0}.lpv-card dt{color:#8fb3c8}.lpv-card dd{margin:0;font-family:ui-monospace,monospace;font-size:10.5px}
.lpv-card .lpv-sub{color:#8fb3c8;margin:4px 0 2px;font-weight:600}.lpv-card .lpv-note{color:#a9c3d3;font-size:10.5px;margin:3px 0}.lpv-card .lpv-warn{color:#ffd27a}
.lpv-card button{font:600 11px system-ui,sans-serif;background:#173248;color:#e6f4ff;border:1px solid #3f6d8c;border-radius:4px;padding:5px 8px;margin:3px 4px 0 0;cursor:pointer}.lpv-card button:hover{background:#1f4461}
.lpv-card .lpv-loc{border-top:1px solid #23394b;padding-top:3px;margin-top:3px}.lpv-list{margin:0;padding:0;list-style:none}.lpv-list li{margin:2px 0}
#lpvOrigin{margin:0 0 12px}#lpvOrigin h2{font:700 11px system-ui,sans-serif;letter-spacing:.06em;color:var(--acc,#7fd4ff);margin:0 0 4px}`;
const css=el('style');css.id='lpvStyles';css.textContent=STYLE;document.head.appendChild(css);
// where a library resource came from, by its recorded origin (never guessed from its kind)
function originLabel(d){
  if(d.origin==='rom-catalog')return 'recovered ROM catalog';
  if(d.origin==='runtime-capture')return d.investigation?'runtime capture (Agent Lab investigation '+d.investigation+')':'runtime capture';
  return d.origin?'extraction pack':null;
}
function definition(dl,label,value){dl.append(el('dt',null,label),el('dd',null,value));}
function locationBlock(loc,rom,d,{buttons=true,full=true}={}){
  const box=el('div','lpv-loc');box.append(el('div','lpv-sub',(loc.code?'Code · ':'')+(loc.name||loc.role)+(loc.owner&&loc.owner!==d.label?' · '+loc.owner:'')));
  if(full){const dl=el('dl');for(const [k,v] of rows(loc,rom))definition(dl,k,v);box.append(dl);}else box.append(el('div','lpv-note',short(loc)));
  if(loc.basis&&loc.code)box.append(el('div','lpv-note','Basis: '+loc.basis));
  if(buttons&&Number.isInteger(loc.fileOffset)){const b=el('button',null,loc.code?'View code in RE':'View bytes in RE');b.type='button';b.onclick=async()=>{const r=await openAt(d,loc);renderOrigin(d,r);};box.append(b);}
  return box;
}
function card(d,{compact=false,context=''}={}){
  const box=el('div','lpv-card');
  box.append(el('h4',null,d.mode==='reference'?'Library reference':d.mode==='copy'?'Copied from the library':'Library resource'),el('div','lpv-title',d.label));
  const dl=el('dl');
  definition(dl,'Source',[d.game,d.kind,originLabel(d)].filter(Boolean).join(' · ')||'unknown');
  definition(dl,'Source ROM',d.sourceSha256?'SHA-256 '+(compact?d.sourceSha256.slice(0,16)+'…':d.sourceSha256):'not recorded');
  if(d.entryId)definition(dl,'Library entry',d.entryId);
  if(d.stage)definition(dl,'Stage',d.stage+(d.placements.some(p=>p.stage===d.stage&&p.basis==='runtime')?' (observed at runtime)':d.placements.some(p=>p.stage===d.stage)?' (ROM table)':''));
  definition(dl,'ROM location',d.primary?short(d.primary):'unknown');
  if(d.basis)definition(dl,'Evidence',d.basis);
  box.append(dl);
  if(!d.inLibrary&&d.entryId)box.append(el('div','lpv-note lpv-warn','This library entry is not in this browser\'s library. The sprite\'s tiles and palette are in the project'+(d.primary?'; the location above was recorded when it was used':'')+'.'));
  if(d.changedSinceUse)box.append(el('div','lpv-note lpv-warn','The library entry has changed since this was used.'));
  if(!compact){
    if(d.primary)box.append(locationBlock(d.primary,d.rom,d));
    const extra=d.locations.filter(l=>l!==d.primary).slice(0,6);
    if(extra.length){box.append(el('div','lpv-sub','Other recorded locations ('+(d.locations.length-1)+')'));for(const l of extra)box.append(locationBlock(l,d.rom,d,{full:false}));}
    box.append(el('div','lpv-sub','Code'));
    if(d.code.length)for(const l of d.code.slice(0,8))box.append(locationBlock(l,d.rom,d,{full:false}));
    else box.append(el('div','lpv-note','No verified code relationship is recorded for this resource. Its raw location is shown above.'));
    if(d.related.length){box.append(el('div','lpv-sub','Related'));const ul=el('ul','lpv-list');for(const r of d.related)ul.append(el('li',null,r.label+' · '+r.relation+' — '+r.basis));box.append(ul);}
    if(d.links.length){box.append(el('div','lpv-sub','Linked records'));const ul=el('ul','lpv-list');for(const l of d.links)ul.append(el('li',null,(l.relation==='same-resource'?'Same resource: ':'Uses: ')+l.label+' ('+({'rom-catalog':'recovered catalog','runtime-capture':'runtime capture'}[l.origin]||'extraction pack')+') — '+l.basis));box.append(ul);}
  }else if(d.code.length)box.append(el('div','lpv-note',plural(d.code.length,'code location')+' recorded · first: '+(d.code[0].name||d.code[0].role)+' at '+short(d.code[0])));
  else box.append(el('div','lpv-note','No verified code relationship recorded.'));
  const actions=el('div');
  const inspectBtn=el('button',null,'Inspect in CODE/RE');inspectBtn.type='button';inspectBtn.dataset.lpv='inspect';inspectBtn.onclick=()=>inspect(d.ref||{entryId:d.entryId,mode:d.mode,stage:d.stage});actions.append(inspectBtn);
  if(d.inLibrary){const show=el('button',null,'Show in Library');show.type='button';show.dataset.lpv='library';show.onclick=()=>services.ResourceRelationshipPreview?.openLibraryEntry?.(d.entryId);actions.append(show);}
  if(context==='scene'&&d.metaspriteId){const ms=el('button',null,'Open in Metasprites');ms.type='button';ms.onclick=()=>{window.Forge163?.metasprites?.select?.(d.metaspriteId);try{switchTab('metasprites');}catch(_){}};actions.append(ms);}
  box.append(actions);
  return box;
}
async function cardFor(ref,options={}){const d=await resolve(ref);d.ref=ref;if(options.metaspriteId)d.metaspriteId=options.metaspriteId;return card(d,options);}

// ---------- panels in the editors ----------
const libraryFrames=sceneId=>(typeof S==='undefined'?[]:(S.metasprites||[]).filter(m=>m.library&&(!sceneId||m.sceneId===sceneId)));
async function fillList(host,title,frames,{context,empty}){
  const token=host._lpv=(host._lpv||0)+1;host.hidden=!frames.length&&!empty;
  const head=el('h3',null,title);head.style.cssText='font:700 10px system-ui,sans-serif;letter-spacing:.06em;color:var(--acc,#7fd4ff);margin:8px 0 2px';
  const cards=[];for(const f of frames.slice(0,12)){const c=await cardFor({...f.library},{compact:true,context,metaspriteId:f.id});const name=el('div','lpv-note',f.name+' · '+(f.library.mode==='reference'?'shared reference':'independent copy')+' · metasprite '+f.id);c.insertBefore(name,c.children[2]);cards.push(c);}
  if(token!==host._lpv)return;
  host.replaceChildren(head,...(cards.length?cards:[el('div','lpv-note',empty||'')]));
}
function panel(id,parentId,before){
  let host=document.getElementById(id);if(host)return host;const parent=document.getElementById(parentId);if(!parent)return null;
  host=el('div');host.id=id;host.className='lpv-panel';if(before&&parent.firstChild)parent.insertBefore(host,parent.firstChild);else parent.appendChild(host);return host;
}
async function refresh(tab=typeof S!=='undefined'?S.tab:''){
  try{
    if(tab==='scene'){const sc=S.scenes[S.activeScene],host=panel('lpvScene','sideScene',true);if(host)await fillList(host,'LIBRARY SPRITES IN THIS SCENE',libraryFrames(sc?.id),{context:'scene'});}
    if(tab==='code'){const host=panel('lpvCode','sideCode',true);if(host)await fillList(host,'LIBRARY RESOURCES IN THIS PROJECT',libraryFrames(),{context:'code',empty:'No library resources are used in this project.'});}
    if(tab==='disasm')await renderOrigin(lastInspected?.d||null,null);
  }catch(err){console.warn('library provenance panel',err);}
}
async function frame(f){
  const editor=document.getElementById('msEditor163');if(!editor)return;
  let host=document.getElementById('msLibrary163');if(!host){host=el('div');host.id='msLibrary163';editor.insertBefore(host,editor.firstChild);}
  if(!f?.library){host.replaceChildren();host.hidden=true;return;}
  host.hidden=false;const token=host._lpv=(host._lpv||0)+1,c=await cardFor({...f.library},{compact:false,context:'metasprites'});if(token!==host._lpv)return;host.replaceChildren(c);
}
// RE/DISASM side: the resource being inspected, and every library resource of the project to pick from
async function renderOrigin(d,result){
  const host=panel('lpvOrigin','sideDisasm',true);if(!host)return;
  const parts=[el('h2',null,'RESOURCE ORIGIN')];
  if(d){
    const c=card(d,{compact:false});parts.push(c);
    if(result&&!result.opened){
      const note=el('div','lpv-note lpv-warn','Not opened in the RE workspace: '+(result.reason||'unknown reason')+'. Its recorded location is shown above.');c.insertBefore(note,c.children[3]||null);
      if(result.needsRom){
        const label=el('label','lpv-note','Choose the source ROM file (checked against SHA-256 '+String(d.sourceSha256).slice(0,16)+'…; kept in memory for this session only) ');
        const input=el('input');input.type='file';input.accept='.nes,application/octet-stream';input.style.cssText='display:block;width:100%';
        input.onchange=async()=>{const file=input.files?.[0];if(!file)return;const bytes=new Uint8Array(await file.arrayBuffer());
          if(!(await services.SourceROMs.verify(bytes,d.sourceSha256))){label.textContent='That file is a different ROM; the resource came from SHA-256 '+d.sourceSha256+'.';return;}
          await services.SourceROMs.put(bytes,file.name);const r=await openAt(d,d.primary);renderOrigin(d,r);};
        label.append(input);c.insertBefore(label,note.nextSibling);
      }
    }else if(result?.opened)c.insertBefore(el('div','lpv-note','Showing '+(result.code?'code':'bytes')+' at file 0x'+hex(result.fileOffset,5)+(result.cpuAddress!==null?' · CPU $'+hex(result.cpuAddress)+(result.bankLabel?' · '+result.bankLabel:''):'')+' in the ROM analysis workspace.'),c.children[3]||null);
  }
  const frames=libraryFrames();
  if(frames.length){const pickHost=el('div','lpv-card');pickHost.append(el('h4',null,'Library resources in this project'));
    for(const f of frames.slice(0,16)){const b=el('button',null,f.name+' · '+(f.library.mode==='reference'?'reference':'copy'));b.type='button';b.onclick=()=>inspect({...f.library});pickHost.append(b);}
    parts.push(pickHost);}
  else if(!d)parts.push(el('div','lpv-note','No library resource is being inspected. Use "Inspect in CODE/RE" on a library resource, in Resources, the Scene or the Metasprite editor.'));
  host.replaceChildren(...parts);
}

// keep the panels current: on tab changes, metasprite edits and library uses
if(typeof switchTab==='function'){
  const previous=switchTab;
  try{switchTab=function(t){const result=previous.apply(this,arguments);queueMicrotask(()=>refresh(typeof S!=='undefined'?S.tab:t));return result;};}catch(_){/* read-only binding: panels refresh on events only */}
}
window.addEventListener('forge:metasprites-changed',()=>queueMicrotask(()=>refresh()));
window.addEventListener('forge:library-use',()=>queueMicrotask(()=>refresh()));

services.LibraryProvenance=Object.freeze({resolve,summary,rows,short,inspect,openAt});
services.LibraryProvenanceUI=Object.freeze({card,cardFor,frame,refresh,renderOrigin,last:()=>lastInspected?summary(lastInspected.d):null});
if(C?.register){
  const refOf=a=>{if(a.metaspriteId){const f=(S.metasprites||[]).find(m=>m.id===a.metaspriteId);if(!f)throw Error('no metasprite '+a.metaspriteId);if(!f.library)throw Error(f.name+' is not a library resource');return {...f.library};}if(!a.id)throw Error('give a library entry id or a metasprite id');return {entryId:a.id};};
  C.register({name:'library.provenance',group:'library',title:'Where a library resource comes from',summary:'Source identity, typed ROM locations, verified code relationships and linked records of a library entry or of a library sprite in the project.',
    args:{id:{type:'string'},metaspriteId:{type:'string'}},run:async a=>summary(await resolve(refOf(a)))});
  C.register({name:'library.inspectCode',group:'library',title:'Inspect in CODE/RE',summary:'Opens the source ROM in the RE analysis workspace at the resource\'s recorded location (its data, or a related routine with code:true).',
    args:{id:{type:'string'},metaspriteId:{type:'string'},role:{type:'string'},code:{type:'bool',default:false}},run:a=>inspect(refOf(a),{role:a.role||null,code:!!a.code})});
}
})();
