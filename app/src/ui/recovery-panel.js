/* NES FORGE MODULE: src/ui/recovery-panel.js
 * Entry: the "ROM recovery" panel above Scene resources (next to Background investigation)
 * AL-REC-01: the user's controls for persistent, incremental recovery of an imported cartridge, over
 * Forge.services.RecoveryLedger: Continue Recovery, Investigate Missing Resources, Deep Recovery, Investigate Current
 * Emulator State, Record Gameplay for Recovery, Retry Unresolved Resources, Pause, Resume and Cancel. It shows the
 * ledger (what is known, every run and why it stopped, the next investigations) and the reconstruction report.
 * Importing ROMs is unchanged: this panel works on cartridges imported the usual way.
 */
(()=>{
'use strict';
const services=window.Forge.services,R=services.RecoveryLedger;
const anchor=document.getElementById('sceneContext');if(!anchor||!R)return;
const el=(tag,id,text)=>{const n=document.createElement(tag);if(id)n.id=id;if(text!==undefined)n.textContent=text;return n;};
const root=el('details','recoveryPanel'),sum=el('summary','recoverySummary','ROM recovery');root.appendChild(sum);
const body=el('div','recoveryBody');root.appendChild(body);anchor.before(root);
const css=el('style');css.textContent='#recoveryPanel{flex:1 0 100%;box-sizing:border-box;font:12px/1.45 system-ui;padding:4px 10px;border-top:1px solid var(--bdr)}#recoveryPanel summary{cursor:pointer;color:var(--acc,#7fd4ff)}'+
  '#recoveryBody .rc-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:4px 0}#recoveryBody button,#recoveryBody select{font:inherit}#recoveryBody table{border-collapse:collapse;margin:4px 0}'+
  '#recoveryBody td,#recoveryBody th{border:1px solid var(--bdr);padding:1px 5px;text-align:left}#recoveryBody .rc-note{opacity:.8}#recoveryBody ul{margin:2px 0 2px 18px;padding:0}';
document.head.appendChild(css);
const state={sha:null,ledger:null,report:null,busy:false,message:'',showReport:false};
function cartridges(){const list=services.RomImports?.list?.()||[];return list.filter(r=>r.ines).reverse();}
async function bytesOf(sha){const b=R.romBytes(sha);if(!b)throw Error('import this ROM again to continue recovering it (cartridge bytes are not kept between sessions)');return b;}
async function refresh(){if(!state.sha){state.ledger=null;state.report=null;render();return;}
  try{state.ledger=await R.ledger(state.sha);if(state.showReport)state.report=await R.assess(state.sha);}catch(e){state.message=e.message;}render();}
async function act(fn){if(state.busy&&fn!==stopNow)return;state.busy=true;render();try{const r=await fn();if(r?.run)state.message=r.run.label+': '+r.run.stopReason+'; '+(r.registered??0)+' new observation'+(r.registered===1?'':'s')+' added to the library.';else if(r?.entryId)state.message='Captured into the library ('+(r.matched?'rebuilt without difference':'not rebuilt')+').';}
  catch(e){state.message=e.message;}finally{state.busy=false;await refresh();}}
const name=sha=>cartridges().find(c=>c.sha256===sha)?.name||'cartridge.nes';
const start=mode=>act(async()=>R.run(await bytesOf(state.sha),name(state.sha),{mode}));
function stopNow(){}
function button(text,title,fn,disabled){const b=el('button',null,text);b.title=title;b.disabled=!!disabled;b.addEventListener('click',fn);return b;}
function render(){
  body.textContent='';const list=cartridges();
  if(!state.sha&&list.length)state.sha=list[0].sha256;
  const running=R.status().running.find(r=>r.sha256===state.sha),rec=R.recording();
  sum.textContent='ROM recovery'+(running?' · '+running.label+' running'+(running.progress?' ('+running.progress.observations+' new, '+running.progress.frames+' frames)':''):rec.on?' · recording gameplay':'');
  if(!list.length){body.appendChild(el('div','recoveryEmpty','Import a ROM (Open ROM / project / ZIP, Import ROM, or the emulator\'s Load ROM) to recover its resources.'));return;}
  const row=el('div',null);row.className='rc-row';const sel=el('select','recoveryRom');for(const c of list){const o=el('option',null,c.name);o.value=c.sha256;if(c.sha256===state.sha)o.selected=true;sel.appendChild(o);}
  sel.addEventListener('change',()=>{state.sha=sel.value;state.report=null;void refresh();});row.appendChild(sel);body.appendChild(row);
  const b1=el('div',null);b1.className='rc-row';const busy=state.busy||!!running;
  b1.append(button('Continue Recovery','Explore from where earlier runs stopped; add what is new',()=>start('continue'),busy),
    button('Investigate Missing Resources','A longer run aimed at what the ledger lists as missing',()=>start('missing'),busy),
    button('Deep Recovery','A long run, with CHR RAM tracing for cartridges that build their graphics at runtime',()=>start('deep'),busy),
    button('Retry Unresolved Resources','Retry with other inputs where the last run stopped finding anything',()=>start('retry'),busy));
  const b2=el('div',null);b2.className='rc-row';
  b2.append(button('Investigate Current Emulator State','Capture what the emulator shows now, and keep it as a starting point',()=>act(()=>R.current()),state.busy||typeof emu==='undefined'||!emu.loaded),
    button(rec.on?'Stop Recording Gameplay':'Record Gameplay for Recovery','While you play, new situations are captured and kept as starting points',()=>act(()=>R.recordGameplay(!rec.on)),state.busy&&!rec.on),
    button('Pause','Stop the running recovery; Resume continues from the same states',()=>{R.pause(state.sha);render();},!running),
    button('Resume','Continue a paused recovery',()=>act(async()=>{const l=await R.ledger(state.sha);const p=l?.lastRun;return R.run(await bytesOf(state.sha),name(state.sha),{mode:p?.mode&&R.MODES[p.mode]?p.mode:'continue'});}),busy||!state.ledger?.paused),
    button('Cancel','Stop the running recovery; what it found is kept',()=>{R.cancel(state.sha);render();},!running));
  body.append(b1,b2);
  if(state.message)body.appendChild(el('div','recoveryMessage',state.message));
  const l=state.ledger;
  if(!l){body.appendChild(el('div',null,'Not investigated by recovery yet. Earlier imports and investigations are counted in the reconstruction report.'));}
  else{
    const k=l.known;body.appendChild(el('div','recoveryKnown','Known: '+k.blocks+' layout blocks, '+(l.cartridge.chrRam?k.tiles+' CHR RAM tiles':k.banks+' of '+l.cartridge.chrKiB+' CHR banks')+', '+k.palettes+' palettes, '+k.sprites+' sprite patterns · '+l.observations+' observations ('+l.editable+' editable scenes)'+(l.traced?' · '+l.traced+' traced CHR captures, '+l.writableTiles+' tiles writable to PRG':'')+'.'));
    if(l.lastRun)body.appendChild(el('div','recoveryLast','Last run: '+l.lastRun.label+' · '+l.lastRun.state+' · '+(l.lastRun.stopReason||'')+(l.lastRun.gained?' · added '+l.lastRun.recorded+' observations':'')));
    body.appendChild(el('div','recoveryNote',l.note)).className='rc-note';
    if(l.next?.length){body.appendChild(el('div',null,'Next investigations:'));const ul=el('ul','recoveryNext');for(const n of l.next){const li=el('li',null,(n.blocked?'Blocked: ':'')+n.reason);ul.appendChild(li);}body.appendChild(ul);}
  }
  const t=el('div',null);t.className='rc-row';t.appendChild(button(state.showReport?'Hide reconstruction report':'Reconstruction report','Per resource category: captured, decoded, editable, independently verified, writable',()=>{state.showReport=!state.showReport;void refresh();}));body.appendChild(t);
  if(state.showReport&&state.report){const r=state.report,tb=el('table','recoveryReport'),h=el('tr');for(const c of ['Category','Captured','Decoded','Editable','Verified','Writable','State'])h.appendChild(el('th',null,c));tb.appendChild(h);
    for(const x of r.table){const tr=el('tr');for(const v of [x.category,x.captured,x.decoded,x.editable,x.verified,x.writable,x.state])tr.appendChild(el('td',null,String(v)));tb.appendChild(tr);}
    body.appendChild(tb);body.appendChild(el('div','recoveryVerdict',r.verdict));
    body.appendChild(el('div',null,'Pixel comparison: '+r.parity.rebuiltWithoutDifference+' of '+r.parity.frames+' runtime captures rebuild without difference. '+(r.graphics?r.graphics.source==='CHR ROM'?r.graphics.observed+' of '+r.graphics.banks+' CHR banks seen in use.':r.graphics.tilesSeen+' CHR RAM tiles seen.':'')));}
}
R.subscribe(()=>render());services.RomImports?.subscribe?.(()=>{if(!state.sha)void refresh();else render();});
root.addEventListener('toggle',()=>{if(root.open)void refresh();});
services.RecoveryPanel=Object.freeze({refresh,select:sha=>{state.sha=sha;return refresh();}});
render();
})();
