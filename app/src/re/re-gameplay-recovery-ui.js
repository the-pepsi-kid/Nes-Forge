/* RE Gameplay Recovery Workbench v0.15: opt-in evidence import, classification,
   timeline and export. No runtime promotion without future owner approval. */
(()=>{'use strict';
 const F=window.Forge=window.Forge||{};F.services=F.services||{};
 const core=()=>F.services.REGameplayRecovery;
 let a=null,b=null,report=null,comparison=null,selected='sword',selectedIndex=0,busy=false;
 const $=id=>document.getElementById(id),el=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n;};
 const setStatus=(t,err=false)=>{const s=$('nf-recovery-status');if(s){s.textContent=t;s.style.color=err?'#ffc0a0':'#a8dbca';}};
 function safeDownload(filename,data){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1200);}
 function bytesafe(file){if(!file||file.size>5000000)throw Error('Select a JSON trace under 5 MB.');}
 async function importTrace(file,slot){if(busy)return;busy=true;try{bytesafe(file);const text=await file.text();const trace=core().validate(text);if(slot==='a')a=trace;else b=trace;setStatus('Loaded '+trace.frames.length.toLocaleString()+' continuous frames from '+trace.sourceLabel+'.');refresh();}catch(e){setStatus((slot==='a'?'Primary':'Compare')+' import rejected: '+String(e.message||e),true);}finally{busy=false;}}
 function loadCurrent(){try{const svc=F.services.NativeAnimationTrace;if(!svc)throw Error('Emulator trace service unavailable.');const t=core().validate(svc.report());a=t;setStatus('Loaded '+t.frames.length.toLocaleString()+' completed original emulator frames directly into the RE workbench.');refresh();}catch(e){setStatus('No usable trace: '+String(e.message||e),true);}}
 function choose(sel){selected=sel;selectedIndex=0;refresh();}
 const fmt=n=>Number.isFinite(n)?Math.round(n*10)/10:'—';
 function refresh(){report=a?core().analyze(a):null;comparison=a&&b?core().compare(a,b):null;
  const content=$('nf-recovery-results');if(content)content.hidden=!report;
  const meta=$('nf-recovery-meta');if(meta&&report){meta.textContent=`${report.frameCount.toLocaleString()} frames · ${report.frameRange[0]}–${report.frameRange[1]} · ${Object.keys(report.sceneCounts).length} scene IDs · profile ${report.source.profile}`;}
  const sums=$('nf-recovery-summary');if(sums&&report){sums.replaceChildren();for(const [label,value] of [['Walking windows',report.stats.walkWindows],['Walk cycles',report.stats.walkCycles],['Sword actions',report.stats.swordActions],['Full sword phases',report.stats.completeSwordStateSequences],['Sustained jumps',report.stats.sustainedJumps],['Stationary windows',report.stats.idleWindows]]){
   const row=el('div','nf-rec-stat');row.append(el('span','',label),el('strong','',String(value)));sums.appendChild(row);
  }}
  const candidates=$('nf-recovery-candidates');if(candidates&&report){candidates.replaceChildren();for(const c of report.candidates){const item=el('div','nf-rec-candidate');item.append(el('strong','',c.label),el('span','',`${c.status} · ${c.evidenceCount} episode(s)`));const note=el('div','',`Observed: ${JSON.stringify(c.candidate)}. ${c.limitations[0]}`);note.style.fontSize='11px';item.appendChild(note);candidates.appendChild(item);}}
  const cov=$('nf-recovery-coverage');if(cov){cov.replaceChildren();if(report){for(const entry of report.coverage){
   const r=el('div','nf-rec-candidate');const head=el('strong','',entry.name);const meta=el('span','',entry.group+' · '+entry.status);const detail=el('div','',entry.evidence);const next=el('div','', 'Next: '+entry.next);
   detail.style.fontSize='11px';next.style.fontSize='11px';next.style.color='#b8dbcb';r.append(head,meta,detail,next);cov.appendChild(r);
  }}}
  const comp=$('nf-recovery-compare');if(comp){comp.textContent=comparison?comparison.checks.map(q=>`${q.metric}: trace A ${q.a}, trace B ${q.b}`).join(' · ')+' — NOT parity-validated.':'Optional: import a second captured trace to compare observed episode counts and timing.';}
  const exportBtn=$('nf-recovery-export');if(exportBtn)exportBtn.disabled=!report;
  for(const id of ['walk','sword','jump','idle']){const btn=$('nf-rec-tab-'+id);if(btn){btn.disabled=!report;btn.setAttribute('aria-pressed',String(selected===id));}}
  showSelection();
 }
 function showSelection(){const table=$('nf-recovery-episodes'),detail=$('nf-recovery-detail');if(!table||!detail)return;
  table.replaceChildren();detail.textContent='';if(!report)return;
  const episodes=report.episodes[selected]||[];
  for(let i=0;i<Math.min(episodes.length,160);i++){const e=episodes[i];const b=el('button','nf-rec-episode',`${e.startFrame}–${e.endFrame} · ${e.duration}f · scene ${e.scene}`);b.type='button';b.setAttribute('aria-pressed',String(i===selectedIndex));b.addEventListener('click',()=>{selectedIndex=i;showSelection();});table.appendChild(b);}
  if(episodes.length>160)table.appendChild(el('small','',`Showing first 160 of ${episodes.length} episodes`));
  const e=episodes[selectedIndex];if(!e){detail.textContent='No episodes of this type detected with the current evidence thresholds.';return;}
  detail.textContent=`Evidence frames ${e.startFrame}–${e.endFrame}\nDuration ${e.duration} original emulation frame(s)\nScene RAM ${e.scene}\n`+
    (e.states?'State transitions: '+e.states.join(' → ')+'\n':'')+
    (e.poses?'OAM pose transitions: '+(Array.isArray(e.poses)?e.poses.join(' → '):JSON.stringify(e.poses))+'\n':'')+
    (e.direction?'Direction: '+e.direction+'\n':'')+
    (Number.isFinite(e.typicalPoseFrames)?'Median pose interval: '+fmt(e.typicalPoseFrames)+' frames\n':'')+
    (e.swordOverlap?'Sword also active in this window\n':'')+(e.jumpOverlap?'Jump also active in this window\n':'')+
    '\nOriginal RAM evidence, NOT recovered gameplay implementation.';
 }
 function showError(e){setStatus(String(e.message||e),true);}
 function mount(){if($('nf-recovery-workbench'))return;
  const host=$('disasmView');if(!host)return;
  const section=el('section','');section.id='nf-recovery-workbench';section.setAttribute('aria-label','RE Gameplay Recovery Workbench');
  section.innerHTML=`<details id="nf-recovery-details" open><summary>GAMEPLAY RECOVERY WORKBENCH · v0.15 experimental</summary>
  <div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><strong>Gameplay recovery / original ROM evidence</strong><button id="nf-recovery-close" type="button">Show disassembly</button></div>
  <p>Connect RE → EMULATOR evidence → candidate Gameplay Core state mappings. Reuses original ROM traces. <strong>Evidence-only:</strong> no changes to your project or hosted server.</p>
  <div class="nf-rec-controls"><label>Native evidence JSON A <input type="file" id="nf-recovery-input" accept=".json,application/json"/></label>
  <button id="nf-recovery-current" type="button">Analyze current emulator trace</button>
  <button id="nf-recovery-emulator" type="button">Open original emulator recorder</button></div>
  <div class="nf-rec-controls"><label>Optional second trace B <input type="file" id="nf-recovery-input-b" accept=".json,application/json"/></label>
  <button id="nf-recovery-runtime" type="button">Open RE Runtime RAM/Code tools</button>
  <button id="nf-recovery-export" type="button" disabled>Export evidence-backed mapping proposal JSON</button></div>
  <p id="nf-recovery-status" role="status">Import your v0.14 Zelda II trace, or record in EMULATOR and analyze it here.</p>
  <div id="nf-recovery-results" hidden>
    <div id="nf-recovery-meta"></div><div id="nf-recovery-summary" class="nf-rec-stats"></div>
    <h3>Candidate action-state correlations (review only)</h3>
    <div id="nf-recovery-candidates"></div>
    <h3>Gameplay asset and action recovery coverage</h3>
    <p>Original Zelda II contains more states than this trace observes. <strong>Unknown ≠ implemented.</strong> Upward stab, downward stab, crouch, damage, metasprites, collision, original enemies, spells, and scene transitions need independent validation. Input combinations do not prove actions occurred.</p>
    <div id="nf-recovery-coverage" class="nf-rec-coverage"></div>
    <h3>Guided evidence collection</h3>
    <p>To fill a gap: (1) run the original ROM in EMULATOR, (2) reach the required ability/area, (3) record a controlled action, (4) inspect RAM/OAM with RE Runtime, (5) compare a second trace, (6) approve only after collision and behavior parity. Recordings remain local until you export them.</p>
    <h3>Original frame evidence</h3><div class="nf-rec-controls">
    <button id="nf-rec-tab-walk" type="button">Walk</button><button id="nf-rec-tab-jump" type="button">Jump</button><button id="nf-rec-tab-sword" type="button">Sword</button><button id="nf-rec-tab-idle" type="button">Stationary</button></div>
    <div id="nf-recovery-episodes"></div><pre id="nf-recovery-detail"></pre>
    <h3>Two-trace comparison</h3><p id="nf-recovery-compare"></p>
    <p><strong>BLOCKED:</strong> no automatically generated animation policy may execute in Gameplay Core or hosted PvP until ROM behavior, timing, collisions, and transitions have been independently validated.</p>
  </div></details>`;
  host.appendChild(section);
  const side=$('sideDisasm');if(side&&!$('nf-recovery-toggle')){const toggle=el('button','','Open Gameplay Recovery Workbench');toggle.id='nf-recovery-toggle';toggle.type='button';toggle.addEventListener('click',()=>section.style.display='block');side.insertBefore(toggle,side.firstChild);}
  $('nf-recovery-close').addEventListener('click',()=>section.style.display='none');
  const style=el('style','');style.textContent=`#disasmView{position:relative}#nf-recovery-workbench{position:absolute;z-index:10;inset:0;overflow:auto;background:#10212a;font:12px/1.45 system-ui,sans-serif;border:1px solid #476e69;border-radius:6px;padding:14px;margin:0;color:var(--fg,#cce3da);max-width:100%;overflow-wrap:anywhere}#nf-recovery-workbench summary{font-weight:bold;cursor:pointer;color:#8ee9c9}#nf-recovery-workbench p{margin:7px 0}#nf-recovery-workbench button{min-height:30px;cursor:pointer}#nf-recovery-workbench input{display:block;max-width:100%;font:11px monospace}#nf-recovery-workbench h3{font-size:12px;margin:14px 0 7px}#nf-recovery-workbench .nf-rec-controls{display:flex;gap:8px;flex-wrap:wrap;align-items:end;margin:9px 0}#nf-recovery-workbench .nf-rec-controls label{flex:1;min-width:180px}#nf-recovery-meta{font:11px monospace;margin:8px 0}#nf-recovery-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(135px,1fr));gap:6px}#nf-recovery-summary .nf-rec-stat{display:flex;justify-content:space-between;padding:6px 9px;background:rgba(90,150,130,.12);border:1px solid #3c605c}#nf-recovery-candidates{display:grid;grid-template-columns:repeat(auto-fit,minmax(185px,1fr));gap:6px}#nf-recovery-candidates .nf-rec-candidate{padding:9px;border:1px solid #41675c;display:grid;gap:5px}#nf-recovery-candidates .nf-rec-candidate span{font:11px monospace;color:#9bcfbc}#nf-recovery-episodes{display:flex;flex-wrap:wrap;max-height:110px;overflow:auto;gap:4px;padding:4px;border:1px solid #30494b}#nf-recovery-coverage{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:6px;max-height:360px;overflow:auto}#nf-recovery-episodes button{font:10px monospace;min-height:24px}#nf-recovery-workbench button[aria-pressed=true]{outline:2px solid #8fe7c2}#nf-recovery-detail{white-space:pre-wrap;background:rgba(25,52,60,.75);padding:9px;font:11px/1.5 monospace;overflow-wrap:anywhere}`;document.head.appendChild(style);
  $('nf-recovery-input').addEventListener('change',e=>{if(e.target.files?.[0])void importTrace(e.target.files[0],'a');});
  $('nf-recovery-input-b').addEventListener('change',e=>{if(e.target.files?.[0])void importTrace(e.target.files[0],'b');});
  $('nf-recovery-current').addEventListener('click',loadCurrent);
  $('nf-recovery-emulator').addEventListener('click',()=>{try{switchTab('emu');$('nf-trace-panel')?.scrollIntoView({block:'center'});}catch(e){showError(e);}});
  $('nf-recovery-runtime').addEventListener('click',()=>{$('reRuntimePanel')?.scrollIntoView({block:'start'});F.services.RERuntimeUI?.showWorkspace?.();});
  $('nf-recovery-export').addEventListener('click',()=>{try{if(!report)throw Error('Analyze evidence before export.');safeDownload('NES_Forge_Z2_Candidate_Gameplay_Mapping_v15.json',{...report,comparison,
   mappingKind:'candidate-observation-not-executable',promoteToRuntime:false,approval:'not-authorized'});}catch(e){showError(e);}});
  for(const id of ['walk','sword','jump','idle'])$('nf-rec-tab-'+id).addEventListener('click',()=>choose(id));
  for(const type of ['keydown','keyup'])section.addEventListener(type,e=>e.stopPropagation());
  refresh();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
 F.services.REGameplayRecoveryUI=Object.freeze({mount,loadCurrent,importTrace,getState:()=>({hasA:!!a,hasB:!!b,hasReport:!!report,report,comparison})});
})();
