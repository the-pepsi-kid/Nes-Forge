/*
 * NES FORGE MODULE: src/ui/investigation-panel.js
 * Entry: Forge.services.InvestigationPanel (and the "Background investigation" panel above Scene resources)
 * Purpose: a compact status of the Agent Lab worker investigating a ROM in the background, while the developer keeps
 *   working. It connects to the local worker (tools/agent-lab/capture_worker.cjs serve: 127.0.0.1 only, with its token),
 *   starts an investigation of the ROM open in Forge, shows each job's progress, discoveries (frames captured and
 *   synchronization-checked), unresolved items and failures, pauses/resumes/cancels jobs, and imports finished results
 *   into the library through library.importInvestigation (validated there). Importing never changes the project.
 *   Without a worker, Forge works exactly as before; nothing here runs unless the developer connects.
 * Bundle order: after src/services/frame-evidence.js.
 */
(()=>{
'use strict';
const F=window.Forge,services=F.services;
const anchor=document.getElementById('sceneContext');if(!anchor)return;
const el=(tag,id,text)=>{const n=document.createElement(tag);if(id)n.id=id;if(text!==undefined)n.textContent=text;return n;};
const store={get(k){try{return localStorage.getItem('forge.agentLab.'+k);}catch(_){return null;}},set(k,v){try{localStorage.setItem('forge.agentLab.'+k,v);}catch(_){/* per-viewer convenience only */}}};
const state={url:store.get('url')||'http://127.0.0.1:8787',token:store.get('token')||'',connected:false,status:null,error:'',imported:[],timer:null,busy:false};
const root=el('details','agentLabPanel'),summary=el('summary','agentLabSummary','Background investigation · not connected');root.appendChild(summary);
const body=el('div','agentLabBody');root.appendChild(body);anchor.before(root);
const css=el('style');css.textContent='#agentLabPanel{flex:1 0 100%;box-sizing:border-box;font:12px/1.45 system-ui;padding:4px 10px;border-top:1px solid var(--bdr)}#agentLabPanel summary{cursor:pointer;color:var(--acc,#7fd4ff)}'+
 '#agentLabBody .al-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:4px 0}#agentLabBody input{min-width:200px;font:inherit}#agentLabBody button{font:inherit}'+
 '#agentLabBody table{border-collapse:collapse;width:100%;margin:4px 0}#agentLabBody td,#agentLabBody th{border-bottom:1px solid var(--bdr);padding:2px 6px;text-align:left;vertical-align:top}#agentLabBody .al-note{opacity:.8}';
document.head.appendChild(css);
async function api(method,path,payload){
  const r=await fetch(state.url.replace(/\/$/,'')+path,{method,headers:{'content-type':'application/json','x-forge-agent-token':state.token},...(payload?{body:JSON.stringify(payload)}:{})});
  const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||('worker answered '+r.status));return data;
}
function currentRom(){
  try{const p=services.ProjectStore.capture();if(p.investigation){const bytes=services.NativeEngineProject.validate(p).bytes;return {bytes,name:p.investigation.source?.name||'rom.nes'};}}catch(_){}
  if(typeof emu!=='undefined'&&emu.loaded&&emu.lastBuiltRom instanceof Uint8Array)return {bytes:emu.lastBuiltRom,name:emu.romName||'rom.nes'};
  return null;
}
const b64=bytes=>{let s='';for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode.apply(null,bytes.subarray(i,i+0x8000));return btoa(s);};
async function connect(url=state.url,token=state.token){state.url=url;state.token=token;store.set('url',url);store.set('token',token);await refresh();if(state.connected)schedule();return state.connected;}
function schedule(){clearInterval(state.timer);state.timer=setInterval(()=>{if(root.open&&!document.hidden)refresh();},2000);}
async function refresh(){
  try{state.status=await api('GET','/status');state.connected=true;state.error='';}catch(e){state.connected=false;state.error=e.message;}
  try{state.imported=await services.FrameEvidence.investigations();}catch(_){state.imported=[];}
  render();return state.status;
}
async function investigate(plan='profile'){
  const rom=currentRom();if(!rom)throw Error('import a ROM or load one in the emulator first');
  let job;try{job=await api('POST','/jobs',{rom:b64(rom.bytes),name:rom.name,plan});}catch(e){if(plan==='profile'&&/no profile plan/.test(e.message))job=await api('POST','/jobs',{rom:b64(rom.bytes),name:rom.name,plan:'generic'});else throw e;}
  await refresh();return job;
}
async function control(id,action){const r=await api('POST','/jobs/'+encodeURIComponent(id)+'/'+action);await refresh();return r;}
async function importJob(id){const bundle=await api('GET','/jobs/'+encodeURIComponent(id)+'/bundle');const r=await services.FrameEvidence.importInvestigation(bundle);await refresh();return r;}
function render(){
  const s=state.status,jobs=s?.jobs||[],running=jobs.find(j=>j.state==='running'),importedIds=new Set(state.imported.map(p=>p.job?.id));
  summary.textContent='Background investigation · '+(!state.connected?(state.error&&state.token?'worker unreachable':'not connected'):running?'running '+running.progress.done+'/'+running.progress.targets+' · '+running.rom.name:jobs.length?'idle · '+jobs.filter(j=>j.state==='completed').length+' finished':'idle')+(state.imported.length?' · '+state.imported.length+' imported':'');
  body.replaceChildren();
  const conn=el('div');conn.className='al-row';const url=el('input','agentLabUrl');url.value=state.url;url.setAttribute('aria-label','Worker address');const token=el('input','agentLabToken');token.value=state.token;token.placeholder='token printed by the worker';token.setAttribute('aria-label','Worker token');
  const go=el('button','agentLabConnect',state.connected?'Reconnect':'Connect');go.type='button';go.onclick=()=>connect(url.value.trim(),token.value.trim());conn.append(url,token,go);body.appendChild(conn);
  if(!state.connected){body.appendChild(el('p','agentLabHelp','Start the local worker: node tools/agent-lab/capture_worker.cjs serve --root <private folder> --forge NES_Forge.html, then paste its token. Forge works the same without it.'+(state.error&&state.token?' Last error: '+state.error:'')));return;}
  const act=el('div');act.className='al-row';const inv=el('button','agentLabInvestigate','Investigate this ROM in the background');inv.type='button';inv.disabled=!currentRom();inv.onclick=()=>investigate().catch(e=>{state.error=e.message;render();});act.appendChild(inv);
  act.appendChild(el('span','agentLabWorker',' Worker '+(s.worker.state==='running'?'busy':'idle')+' · one job at a time · results are imported only when you choose.'));body.appendChild(act);
  if(state.error)body.appendChild(el('p','agentLabError','Problem: '+state.error));
  const table=el('table','agentLabJobs'),head=el('tr');for(const h of ['ROM · plan','State','Discoveries','Unresolved','Failures',''])head.appendChild(el('th',null,h));table.appendChild(head);
  for(const j of jobs.slice(-12).reverse()){
    const tr=el('tr');tr.dataset.job=j.id;
    tr.append(el('td',null,j.rom.name+' · '+j.plan.name),el('td',null,j.state+(j.control?' ('+j.control+' requested)':'')+' · '+j.progress.done+'/'+j.progress.targets),
      el('td',null,j.frames+' frames, '+j.synchronized+' synchronization-checked'+(j.checkpoint?.boot?' · boot '+(j.checkpoint.boot.source==='disk'?'restored from disk':'checkpoint created'):'')),
      el('td',null,j.unresolved.length?j.unresolved.slice(0,3).join(' · ')+(j.unresolved.length>3?' · …':''):'none'),el('td',null,j.failures.length?j.failures.slice(-2).map(f=>f.stage+': '+f.error).join(' · '):'none'));
    const cell=el('td');
    const button=(label,fn)=>{const b=el('button',null,label);b.type='button';b.dataset.action=label.toLowerCase();b.onclick=()=>fn().catch(e=>{state.error=e.message;render();});cell.appendChild(b);};
    if(['queued','running','interrupted'].includes(j.state))button('Pause',()=>control(j.id,'pause'));
    if(['paused','failed','interrupted'].includes(j.state))button('Resume',()=>control(j.id,'resume'));
    if(!['completed','cancelled'].includes(j.state))button('Cancel',()=>control(j.id,'cancel'));
    if(j.frames)button(importedIds.has(j.id)?'Import again':'Import',async()=>{const r=await importJob(j.id);state.error=r.rejected.length?r.rejected.length+' record(s) rejected: '+r.rejected[0].problems.join('; '):'';render();});
    tr.appendChild(cell);table.appendChild(tr);
  }
  body.appendChild(table);
  if(state.imported.length)body.appendChild(el('p','agentLabImported','In the library: '+state.imported.map(p=>p.name.replace(' · Agent Lab investigation','')+' ('+(p.stats?.imported||0)+' frames'+(p.stats?.rejected?', '+p.stats.rejected+' rejected':'')+')').join(' · ')+'. Browse them in ▣ Resources › Library (Library · frame).'));
}
root.addEventListener('toggle',()=>{if(root.open){requestAnimationFrame(()=>root.scrollIntoView({block:'nearest'}));if(state.token)connect().catch(()=>{});}else clearInterval(state.timer);});
render();
services.InvestigationPanel=Object.freeze({connect,refresh,investigate,control,importJob,state:()=>({connected:state.connected,error:state.error,jobs:state.status?.jobs||[],imported:state.imported.map(p=>({job:p.job?.id,stats:p.stats}))})});
})();
