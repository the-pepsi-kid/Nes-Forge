/*
 * NES FORGE MODULE: src/ui/investigation-panel.js
 * Entry: Forge.services.InvestigationPanel (and the "Background investigation" panel above Scene resources)
 * Purpose: the developer's view of the local Agent Lab worker (tools/agent-lab/capture_worker.cjs serve), so ROMs are
 *   investigated in the background while they keep building.
 *   - Pairing: the worker prints a single-use code; Forge exchanges it once for a client id and secret, keeps the
 *     secret only as a non-extractable WebCrypto HMAC key in IndexedDB, and signs every request. No token is shown,
 *     typed after pairing, or kept in localStorage (see docs/architecture/AGENT_LAB_SECURITY.md).
 *   - Opt-in automation (remembered): "Investigate ROMs I import" queues the ROM named by each import event
 *     (Forge.services.RomImports) — never a guess between the project's and the emulator's ROM; the worker returns
 *     the existing job for a ROM already investigated with the same plan and emulator build. "Add verified results
 *     to the library" imports a job's results when it finishes, through the validated FrameEvidence import, and
 *     registers the ROM's recovered catalog through LibraryCatalog.registerCatalog when Forge has one.
 *   - Manual controls stay: investigate a chosen ROM, pause, resume, cancel, import, import again.
 *   Importing never changes the project. Without a worker, Forge works exactly as before.
 * Bundle order: after src/services/frame-evidence.js and src/services/rom-imports.js.
 */
(()=>{
'use strict';
const F=window.Forge,services=F.services;
const anchor=document.getElementById('sceneContext');if(!anchor)return;
const el=(tag,id,text)=>{const n=document.createElement(tag);if(id)n.id=id;if(text!==undefined)n.textContent=text;return n;};
const store={get(k){try{return localStorage.getItem('forge.agentLab.'+k);}catch(_){return null;}},set(k,v){try{localStorage.setItem('forge.agentLab.'+k,v);}catch(_){/* per-viewer convenience */}},del(k){try{localStorage.removeItem('forge.agentLab.'+k);}catch(_){}}};
store.del('token');// earlier versions kept a plain token here
const enc=new TextEncoder(),hex=buf=>[...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
const b64url=bytes=>{let s='';for(const b of new Uint8Array(bytes))s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');};
// ---------- pairing: the key lives in IndexedDB as a non-extractable CryptoKey ----------
const PDB='nes-forge-agent-lab',PSTORE='pairing';
function pdb(){return new Promise((resolve,reject)=>{const r=indexedDB.open(PDB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(PSTORE))r.result.createObjectStore(PSTORE,{keyPath:'id'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function pairingOp(mode,value){const db=await pdb();try{return await new Promise((resolve,reject)=>{const tx=db.transaction(PSTORE,mode==='get'?'readonly':'readwrite'),st=tx.objectStore(PSTORE);
  const q=mode==='get'?st.get('current'):mode==='put'?st.put({id:'current',...value}):st.delete('current');let out=null;q.onsuccess=()=>{out=q.result??null;};tx.oncomplete=()=>resolve(out);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}finally{db.close();}}
const settings={autoInvestigate:store.get('autoInvestigate')==='1',autoImport:store.get('autoImport')==='1',autoImportSince:Number(store.get('autoImportSince')||0)};
const state={url:store.get('url')||'http://127.0.0.1:8787',pairing:null,connected:false,status:null,error:'',imported:[],timer:null,notices:[],pendingAuto:new Map(),requested:new Set(),autoTried:new Set(),catalogs:new Map(),catalogNoticed:new Map(),supplying:new Set(),busy:false,lastPoll:0,ready:null};
const notice=(text,extra={})=>{state.notices.unshift({at:Date.now(),text,...extra});state.notices=state.notices.slice(0,6);render();};
const root=el('details','agentLabPanel'),summary=el('summary','agentLabSummary','Background investigation · not paired');root.appendChild(summary);
const body=el('div','agentLabBody');root.appendChild(body);anchor.before(root);
const css=el('style');css.textContent='#agentLabPanel{flex:1 0 100%;box-sizing:border-box;font:12px/1.45 system-ui;padding:4px 10px;border-top:1px solid var(--bdr)}#agentLabPanel summary{cursor:pointer;color:var(--acc,#7fd4ff)}'+
 '#agentLabBody .al-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:4px 0}#agentLabBody input[type=text]{min-width:180px;font:inherit}#agentLabBody button,#agentLabBody select{font:inherit}'+
 '#agentLabBody table{border-collapse:collapse;width:100%;margin:4px 0}#agentLabBody td,#agentLabBody th{border-bottom:1px solid var(--bdr);padding:2px 6px;text-align:left;vertical-align:top}#agentLabBody .al-note{opacity:.8}'+
 '#agentLabBody .al-state{font-weight:600;white-space:nowrap}#agentLabBody [data-state=running] .al-state{color:#7fd4ff}#agentLabBody [data-state=queued] .al-state{color:#c8c8ff}#agentLabBody [data-state=paused] .al-state{color:#ffd27f}'+
 '#agentLabBody [data-state=failed] .al-state,#agentLabBody [data-state=cancelled] .al-state{color:#ff8a8a}#agentLabBody [data-state=completed] .al-state{color:#8be28b}#agentLabBody [data-state=interrupted] .al-state{color:#ffb35a}'+
 '#agentLabBody .al-recovered{color:#ffd27f}#agentLabBody .al-unresolved{color:#d8c8ff}#agentLabBody .al-failure{color:#ff9a9a}#agentLabNotices{margin:4px 0;padding:0;list-style:none}#agentLabNotices li{margin:2px 0}';
document.head.appendChild(css);
// ---------- requests ----------
async function signedFetch(method,pathName,payload){
  const p=state.pairing;if(!p)throw Error('not paired with a worker');
  const text=payload===undefined?'':JSON.stringify(payload),time=Date.now(),nonce=b64url(crypto.getRandomValues(new Uint8Array(18)));
  const msg=[method,pathName,String(time),nonce,hex(await crypto.subtle.digest('SHA-256',enc.encode(text)))].join('\n');
  const sig=b64url(await crypto.subtle.sign('HMAC',p.key,enc.encode(msg)));
  const r=await fetch(state.url.replace(/\/$/,'')+pathName,{method,headers:{'content-type':'application/json','x-forge-client':p.clientId,'x-forge-time':String(time),'x-forge-nonce':nonce,'x-forge-signature':sig},...(payload===undefined?{}:{body:text})});
  const data=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(Error(data.error||('worker answered '+r.status)),{status:r.status});return data;
}
async function pair(url,code){
  url=String(url||state.url).trim();
  const r=await fetch(url.replace(/\/$/,'')+'/pair',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code:String(code||'').trim(),name:'NES Forge'})});
  const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||('pairing failed ('+r.status+')'));
  const raw=Uint8Array.from(atob(data.secret),c=>c.charCodeAt(0));
  const key=await crypto.subtle.importKey('raw',raw,{name:'HMAC',hash:'SHA-256'},false,['sign']);raw.fill(0);
  const pairing={url,clientId:data.clientId,workerId:data.workerId,key,pairedAt:Date.now()};
  await pairingOp('put',pairing);state.pairing=pairing;state.url=url;store.set('url',url);
  notice('Paired with worker '+data.workerId+'. The key stays in this browser and cannot be read back.');
  await refresh();schedule();drainAuto();return true;
}
async function forget(){
  try{if(state.pairing)await signedFetch('DELETE','/clients/'+encodeURIComponent(state.pairing.clientId));}catch(_){/* the worker may be offline; the local key is removed anyway */}
  await pairingOp('delete');state.pairing=null;state.connected=false;state.status=null;clearInterval(state.timer);notice('Pairing removed from this browser.');render();
}
// ---------- the worker's state ----------
async function refresh(){
  state.lastPoll=Date.now();
  if(state.pairing){try{state.status=await signedFetch('GET','/status');state.connected=true;state.error='';}catch(e){state.connected=false;state.error=e.message;if(e.status===401&&/revoked|unknown/.test(e.message))state.error+=' — pair again';}}
  try{state.imported=await services.FrameEvidence.investigations();}catch(_){state.imported=[];}
  render();
  if(state.connected){await drainAuto();await autoImport();
    for(const st of services.LibraryCatalog?.recoveryStatus?.()||[])if(st.state==='needs-source')await supplyCartridge(st.sha,{manual:!!st.manual});}
  return state.status;
}
function schedule(){
  clearInterval(state.timer);
  state.timer=setInterval(()=>{
    if(!state.pairing||state.busy)return;
    const jobs=state.status?.jobs||[],active=jobs.some(j=>['queued','running','interrupted'].includes(j.state))||state.pendingAuto.size;
    const every=root.open&&!document.hidden?2000:(settings.autoImport||settings.autoInvestigate)&&active?4000:document.hidden?20000:10000;
    if(Date.now()-state.lastPoll>=every){state.busy=true;refresh().finally(()=>{state.busy=false;});}
  },1000);
}
// ---------- which ROM ----------
function candidates(){
  const out=[];
  for(const r of (services.RomImports?.list()||[]).slice().reverse())out.push({key:'import:'+r.sha256,label:'Imported '+new Date(r.at).toLocaleTimeString()+': '+r.name+' · '+r.sha256.slice(0,12),sha256:r.sha256,name:r.name,bytes:()=>services.RomImports.bytes(r.sha256)});
  try{const p=services.ProjectStore.capture();if(p.investigation||p.nativeGame){const bytes=services.NativeEngineProject.validate(p).bytes,name=p.investigation?.source?.name||p.projectName||'rom.nes';
    out.push({key:'project',label:'Project source ROM: '+name,name,bytes:()=>bytes});}}catch(_){/* no preserved source ROM */}
  if(typeof emu!=='undefined'&&emu.loaded&&emu.lastBuiltRom instanceof Uint8Array)out.push({key:'emulator',label:'Emulator ROM: '+(emu.romName||'rom.nes'),name:emu.romName||'rom.nes',bytes:()=>emu.lastBuiltRom});
  return out;
}
const b64=bytes=>{let s='';for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode.apply(null,bytes.subarray(i,i+0x8000));return btoa(s);};
async function enqueue(rom,reason){
  const bytes=rom.bytes instanceof Uint8Array?rom.bytes:rom.bytes();if(!bytes)throw Error('the ROM bytes are no longer available; import it again');
  let job;try{job=await signedFetch('POST','/jobs',{rom:b64(bytes),name:rom.name,plan:'profile',reason});}
  catch(e){if(/no profile plan/.test(e.message))job=await signedFetch('POST','/jobs',{rom:b64(bytes),name:rom.name,plan:'generic',reason});else throw e;}
  state.requested.add(job.id);return job;
}
async function investigate(choice){
  const all=candidates(),rom=typeof choice==='object'&&choice?.bytes?choice:all.find(c=>c.key===(choice||document.getElementById('agentLabRom')?.value))||all[0];
  if(!rom)throw Error('import a ROM first (Open ROM / project / ZIP, Import ROM, or the emulator\'s Load ROM)');
  const job=await enqueue(rom,'manual');
  notice(job.duplicate?rom.name+' is already '+(job.state==='completed'?'investigated':job.state)+' with the same plan and emulator build (job '+job.id+'); no new job was queued.':'Queued '+rom.name+' for investigation ('+job.plan.name+').');
  await refresh();return job;
}
// imports announced by RomImports: queued while paired, kept for this tab until then
services.RomImports?.subscribe(entry=>{
  if(!settings.autoInvestigate)return;
  if(!entry.ines){notice(entry.name+' is not an iNES ROM; it was not investigated.');return;}
  state.pendingAuto.set(entry.sha256,entry);
  if(!state.pairing||!state.connected)notice(entry.name+' will be investigated when the worker is '+(state.pairing?'reachable':'paired')+'.');
  void drainAuto();
});
async function drainAuto(){
  if(!state.pairing||!state.connected||state.draining)return;state.draining=true;
  try{for(const [sha,entry] of [...state.pendingAuto]){
    try{const job=await enqueue({name:entry.name,bytes:()=>services.RomImports.bytes(sha)},'import');state.pendingAuto.delete(sha);
      notice(job.duplicate?'Imported '+entry.name+': already '+(job.state==='completed'?'investigated':job.state)+' with this plan and emulator build (job '+job.id+'); reusing it.':'Imported '+entry.name+': queued for background investigation ('+job.plan.name+').');}
    catch(e){if(e.status===401||e instanceof TypeError)break;state.pendingAuto.delete(sha);notice('Could not queue '+entry.name+': '+e.message);}
  }}finally{state.draining=false;}
}
// ---------- results into the library ----------
async function romBytesFor(job){
  const local=services.RomImports?.bytes(job.rom.sha256);if(local)return local;
  const r=await signedFetch('GET','/jobs/'+encodeURIComponent(job.id)+'/rom'),bytes=Uint8Array.from(atob(r.rom),c=>c.charCodeAt(0));
  if(await services.RomImports.sha256(bytes)!==job.rom.sha256)throw Error('the worker returned different ROM bytes');return bytes;
}
// The ROM's recovered catalog, through the library's validated registration (LibraryCatalog.completeCatalog), which
// also finishes a registration that was interrupted and bounds automatic attempts. Only a success (or "no catalog for
// this ROM") is remembered here; a failure is not, so the next pass asks the library again, which decides whether an
// attempt is due, waits, or needs a visible manual Retry.
const catalogText=(job,st)=>st.state==='complete'?(st.already?'The recovered catalog of '+job.rom.name+' is already in the library.':(st.resumed?'Completed the interrupted registration of the recovered catalog of ':'Registered the recovered catalog of ')+job.rom.name+': '+st.entries+' entries ('+st.chrBanks+' CHR banks'+(st.resumed?'; '+st.kept+' kept, '+st.written+' written':'')+').')
  :'The recovered catalog of '+job.rom.name+': '+st.text+(st.lastError?' ('+st.lastError+')':'')+'.';
async function registerCatalog(job){
  const sha=job.rom.sha256;if(state.catalogs.has(sha))return state.catalogs.get(sha);
  if(!window.GameRENative?.profiles?.some(p=>p.sha256===sha)){const none={state:'none',text:'No recovered catalog for '+job.rom.name+': Forge has no verified profile for this ROM. Its frames keep CHR file offsets; CHR library entries stay unavailable.'};state.catalogs.set(sha,none);return none;}
  const Lc=services.LibraryCatalog;let st=await Lc.completeCatalog(sha,{name:job.rom.name,reason:'investigation'});
  // the cartridge is not open in Forge: the worker that investigated it has a copy
  if(st.state==='needs-source'){try{st=await Lc.completeCatalog(sha,{bytes:await romBytesFor(job),name:job.rom.name,from:'the paired worker',reason:'investigation'});}catch(e){st={state:'failed',text:'the cartridge could not be fetched from the worker',lastError:e.message};}}
  const result={state:st.state==='complete'?(st.already?'already':'registered'):st.state,text:catalogText(job,st),resumed:!!st.resumed};
  if(st.state==='complete')state.catalogs.set(sha,result);
  return result;
}
async function importJob(id,{auto=false}={}){
  const job=(state.status?.jobs||[]).find(j=>j.id===id)||{id,rom:{name:'ROM'}};
  const bundle=await signedFetch('GET','/jobs/'+encodeURIComponent(id)+'/bundle');
  const r=await services.FrameEvidence.importInvestigation(bundle);
  const catalog=bundle.job?.rom?await registerCatalog({id,rom:bundle.job.rom}):null;
  await refresh();
  const what=r.imported?r.imported+' verified frame'+(r.imported===1?'':'s')+' from '+bundle.job.rom.name+' added to the library':'All '+r.already+' frames from '+bundle.job.rom.name+' were already in the library';
  // a catalog that is not complete is reported by the library's own notice (one per attempt), not repeated here
  const catalogNote=catalog&&['registered','already','none'].includes(catalog.state)?' '+catalog.text:catalog?' Its recovered catalog is not complete yet (see the next notice).':'';
  notice((auto?'Job finished · ':'')+what+(r.rejected.length?' · '+r.rejected.length+' record(s) rejected: '+r.rejected[0].problems.join('; '):'')+'.'+catalogNote,{open:r.entries?.[0]||null});
  return {...r,catalog};
}
async function autoImport(){
  if(!settings.autoImport||state.autoImporting)return;state.autoImporting=true;
  try{
    const done=new Set(state.imported.map(p=>p.job?.id));
    for(const j of state.status?.jobs||[]){
      // results already in the library (imported here or in an earlier session): their catalog must be complete too
      if(j.state==='completed'&&done.has(j.id)&&!state.catalogs.has(j.rom.sha256)&&window.GameRENative?.profiles?.some(p=>p.sha256===j.rom.sha256)){
        try{const c=await registerCatalog(j);if(c.state==='registered'&&state.catalogNoticed.get(j.rom.sha256)!==c.text){state.catalogNoticed.set(j.rom.sha256,c.text);notice(c.text);}}
        catch(e){notice('The recovered catalog of '+j.rom.name+' could not be checked: '+e.message);}
        continue;
      }
      if(j.state!=='completed'||done.has(j.id)||state.autoTried.has(j.id)||!j.frames)continue;
      if(!(state.requested.has(j.id)||Date.parse(j.completed||j.updated)>=settings.autoImportSince))continue;
      state.autoTried.add(j.id);
      try{await importJob(j.id,{auto:true});}catch(e){notice('Automatic import of '+j.rom.name+' failed: '+e.message+' · use Import to retry.');}
    }
  }finally{state.autoImporting=false;}
}
async function control(id,action){const r=await signedFetch('POST','/jobs/'+encodeURIComponent(id)+'/'+action);await refresh();return r;}
function setOptions({autoInvestigate,autoImport:imp}={}){
  if(typeof autoInvestigate==='boolean'){settings.autoInvestigate=autoInvestigate;store.set('autoInvestigate',autoInvestigate?'1':'0');}
  if(typeof imp==='boolean'){if(imp&&!settings.autoImport){settings.autoImportSince=Date.now();store.set('autoImportSince',String(settings.autoImportSince));}settings.autoImport=imp;store.set('autoImport',imp?'1':'0');}
  render();schedule();void refresh();return {...settings};
}
// ---------- presentation ----------
function stateText(j){
  const p=j.progress||{done:0,targets:0},n=p.done+'/'+p.targets;
  switch(j.state){
    case 'queued':return j.recovered?'queued · resumes at '+n:'queued · waiting for the worker';
    case 'running':return 'running '+n+(p.current?' · '+p.current:'')+(j.control?' · '+j.control+' requested':'');
    case 'paused':return 'paused at '+n+(j.failures.some(f=>f.stage==='limit')?' · time limit':'');
    case 'interrupted':return 'interrupted at '+n+' · worker stopped; resumes automatically';
    case 'completed':return 'completed '+n+(j.recovered?' · recovered after '+j.interruptions.length+' worker restart'+(j.interruptions.length===1?'':'s'):'');
    case 'failed':return 'failed at '+n;
    case 'cancelled':return 'cancelled at '+n;
    default:return j.state+' '+n;
  }
}
function render(){
  const s=state.status,jobs=s?.jobs||[],running=jobs.find(j=>j.state==='running'),queued=jobs.filter(j=>j.state==='queued'||j.state==='interrupted').length,importedIds=new Set(state.imported.map(p=>p.job?.id));
  summary.textContent='Background investigation · '+(!state.pairing?'not paired':!state.connected?'worker unreachable':running?'running '+running.progress.done+'/'+running.progress.targets+' · '+running.rom.name+(queued?' · '+queued+' queued':''):queued?queued+' queued':jobs.length?'idle · '+jobs.filter(j=>j.state==='completed').length+' finished':'idle')+
    (state.imported.length?' · '+state.imported.length+' in library':'')+(settings.autoInvestigate||settings.autoImport?' · auto':'');
  body.replaceChildren();
  const conn=el('div');conn.className='al-row';
  if(!state.pairing){
    const url=el('input','agentLabUrl');url.type='text';url.value=state.url;url.setAttribute('aria-label','Worker address');
    const code=el('input','agentLabCode');code.type='text';code.placeholder='pairing code, e.g. ABCD-EFGH';code.autocomplete='off';code.setAttribute('aria-label','Pairing code');code.size=14;
    const go=el('button','agentLabPair','Pair');go.type='button';go.onclick=()=>pair(url.value,code.value).catch(e=>{state.error=e.message;render();});
    conn.append(url,code,go);body.appendChild(conn);
    body.appendChild(el('p','agentLabHelp','Start the local worker: node tools/agent-lab/capture_worker.cjs serve --root <private folder> --forge NES_Forge.html. It prints a single-use pairing code; enter it here once. Forge works the same without it.'+(state.error?' Last error: '+state.error:'')));
    renderNotices();return;
  }
  conn.append(el('span','agentLabPaired','Paired with worker '+(state.pairing.workerId||'?')+' at '+state.url+(state.connected?'':' · unreachable: '+state.error)));
  const forgetBtn=el('button','agentLabForget','Forget pairing');forgetBtn.type='button';forgetBtn.onclick=()=>forget();conn.append(forgetBtn);body.appendChild(conn);
  const opts=el('div');opts.className='al-row';
  const opt=(id,label,value,fn)=>{const l=el('label');const c=el('input',id);c.type='checkbox';c.checked=value;c.onchange=()=>fn(c.checked);l.append(c,' '+label);opts.appendChild(l);};
  opt('agentLabAutoInvestigate','Investigate ROMs I import',settings.autoInvestigate,v=>setOptions({autoInvestigate:v}));
  opt('agentLabAutoImport','Add verified results to the library when a job finishes',settings.autoImport,v=>setOptions({autoImport:v}));
  opts.appendChild(el('span','agentLabOptsNote','Remembered in this browser. Results are validated on import; your project is never changed.'));opts.lastChild.className='al-note';body.appendChild(opts);
  const act=el('div');act.className='al-row';const sel=el('select','agentLabRom');sel.setAttribute('aria-label','ROM to investigate');
  const cands=candidates();for(const c of cands){const o=el('option',null,c.label);o.value=c.key;sel.appendChild(o);}
  if(!cands.length){const o=el('option',null,'No ROM imported in this tab yet');o.value='';sel.appendChild(o);sel.disabled=true;}
  const inv=el('button','agentLabInvestigate','Investigate selected ROM');inv.type='button';inv.disabled=!cands.length||!state.connected;inv.onclick=()=>investigate().catch(e=>{state.error=e.message;notice('Could not queue: '+e.message);});
  act.append(sel,inv);if(s)act.appendChild(el('span','agentLabWorker','Worker '+(s.worker.state==='running'?'busy':'idle')+' · one job at a time'));body.appendChild(act);
  renderNotices();
  const table=el('table','agentLabJobs'),head=el('tr');for(const h of ['ROM · plan','State','Discoveries','Unresolved evidence','Failures',''])head.appendChild(el('th',null,h));table.appendChild(head);
  for(const j of jobs.slice(-12).reverse()){
    const tr=el('tr');tr.dataset.job=j.id;tr.dataset.state=j.state;
    const stateCell=el('td');const st=el('span',null,stateText(j));st.className='al-state';stateCell.appendChild(st);
    if(j.recovered&&j.state!=='completed'){const r=el('div',null,'recovered from '+j.interruptions.length+' worker restart'+(j.interruptions.length===1?'':'s'));r.className='al-recovered';stateCell.appendChild(r);}
    if(importedIds.has(j.id))stateCell.appendChild(el('div',null,'✓ in the library'));
    const unresolved=el('td');unresolved.className='al-unresolved';unresolved.textContent=j.unresolved.length?j.unresolved.slice(0,3).join(' · ')+(j.unresolved.length>3?' · …':''):'none';
    const failures=el('td');failures.className='al-failure';failures.textContent=j.failures.length?j.failures.slice(-2).map(f=>f.stage+': '+f.error).join(' · '):'none';
    tr.append(el('td',null,j.rom.name+' · '+j.plan.name),stateCell,el('td',null,j.frames+' frames, '+j.synchronized+' synchronization-checked'+(j.checkpoint?.boot?' · boot '+(j.checkpoint.boot.source==='disk'?'restored from disk':'checkpoint created'):'')),unresolved,failures);
    const cell=el('td');
    const button=(label,action,fn)=>{const b=el('button',null,label);b.type='button';b.dataset.action=action;b.onclick=()=>fn().catch(e=>{state.error=e.message;notice(label+' failed: '+e.message);});cell.appendChild(b);};
    if(['queued','running','interrupted'].includes(j.state))button('Pause','pause',()=>control(j.id,'pause'));
    if(['paused','failed','interrupted'].includes(j.state))button('Resume','resume',()=>control(j.id,'resume'));
    if(!['completed','cancelled'].includes(j.state))button('Cancel','cancel',()=>control(j.id,'cancel'));
    if(j.frames)button(importedIds.has(j.id)?'Import again':'Import','import',()=>importJob(j.id));
    tr.appendChild(cell);table.appendChild(tr);
  }
  body.appendChild(table);
}
function renderNotices(){
  if(!state.notices.length)return;
  const ul=el('ul','agentLabNotices');
  for(const n of state.notices){const li=el('li',null,new Date(n.at).toLocaleTimeString()+' · '+n.text);
    if(n.open){const b=el('button',null,'Open in Library');b.type='button';b.dataset.action='open-library';b.onclick=()=>services.ResourceRelationshipPreview?.openLibraryEntry(n.open);li.append(' ',b);}
    ul.appendChild(li);}
  body.appendChild(ul);
}
// The library needs a cartridge to finish a catalog and the worker that investigated it has a copy: supply it (for a
// manual Retry too). Attempts stay bounded by the library.
async function supplyCartridge(sha,{manual=false}={}){
  if(!state.connected||state.supplying.has(sha))return null;
  const job=(state.status?.jobs||[]).find(j=>j.rom.sha256===sha&&j.state==='completed');if(!job)return null;
  state.supplying.add(sha);
  try{return await services.LibraryCatalog.completeCatalog(sha,{bytes:await romBytesFor(job),name:job.rom.name,from:'the paired worker',manual,reason:manual?'retry':'worker cartridge'});}
  catch(e){notice('The cartridge of '+job.rom.name+' could not be fetched from the worker: '+e.message);return null;}
  finally{state.supplying.delete(sha);}
}
addEventListener('forge:catalog-recovery',e=>{if(e.detail?.state==='needs-source')void supplyCartridge(e.detail.sha,{manual:!!e.detail.manual});});
// what the library does on its own (startup, a project or ROM opened) appears here too, once per state
addEventListener('forge:catalog-recovery',e=>{const d=e.detail||{};
  if(!['complete','failed','needs-retry','needs-source'].includes(d.state)||d.state==='complete'&&(d.already||!d.resumed))return;
  const text='Recovered catalog of '+(d.name||'a ROM')+': '+(d.state==='complete'?'complete after an interrupted registration · '+d.entries+' entries ('+d.kept+' kept, '+d.written+' written)':d.text+(d.lastError?' ('+d.lastError+')':''))+'.';
  if(state.catalogNoticed.get(d.sha)===text)return;state.catalogNoticed.set(d.sha,text);notice(text);});
root.addEventListener('toggle',()=>{if(root.open){requestAnimationFrame(()=>root.scrollIntoView({block:'nearest'}));if(state.pairing)void refresh();}});
render();
state.ready=pairingOp('get').then(p=>{if(p?.key){state.pairing=p;state.url=p.url||state.url;schedule();return refresh();}render();}).catch(e=>{state.error='pairing storage unavailable: '+e.message;render();});
services.InvestigationPanel=Object.freeze({pair,forget,refresh,investigate,control,importJob,setOptions,candidates:()=>candidates().map(({bytes,...c})=>c),whenReady:()=>state.ready,
  state:()=>({paired:!!state.pairing,connected:state.connected,error:state.error,settings:{...settings},jobs:state.status?.jobs||[],pending:[...state.pendingAuto.keys()],notices:state.notices.map(n=>n.text),
    imported:state.imported.map(p=>({job:p.job?.id,stats:p.stats})),catalogs:Object.fromEntries(state.catalogs)})});
})();
