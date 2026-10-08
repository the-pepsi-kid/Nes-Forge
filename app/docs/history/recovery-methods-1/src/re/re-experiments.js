/* Reversible, explicitly requested runtime experiments. No game meanings are
 * inferred from RAM addresses; edits never call CPU bus or mapper writers. */
(()=>{
'use strict';
const services=window.Forge.services,timeline=services.EmulatorTimeline,listeners=new Set();
let active=null,checkpointOwner=null,journal=[],session=timeline.status().session,nextId=1;
function fail(message){throw Error('RE experiment: '+message);}
function copy(value){return JSON.parse(JSON.stringify(value));}
function sync(){const now=timeline.status().session;if(now!==session){session=now;active=null;checkpointOwner=null;journal=[];}}
function status(){sync();return Object.freeze({session,active:active?copy(active):null,journal:copy(journal),limits:{changes:256,journal:32},meaning:'RAM labels are user hypotheses. Restoring an experiment rewinds the complete machine to its checkpoint.'});}
function notify(){const state=status();for(const fn of listeners)try{fn(state);}catch(error){/* UI cannot interrupt runtime work. */}}
function event(value){journal.push({...value,session});if(journal.length>32)journal.shift();}
function begin(options){
 sync();if(active)fail('Restore or keep the current experiment before starting another.');if(!options||typeof options!=='object'||typeof options.label!=='string'||!options.label.trim()||options.label.trim().length>64)fail('Provide a label of 1–64 characters.');
 if(!Array.isArray(options.changes)||!options.changes.length||options.changes.length>256)fail('Provide 1–256 RAM changes.');
 // Read and validate every proposed byte before saving a checkpoint. patchRAM
 // repeats validation at the actual mutation boundary for fail-closed writes.
 const seen=new Set(),changes=options.changes.map(change=>{if(!change||typeof change!=='object')fail('Each RAM change must be an object.');const cell=timeline.readRAM(change.address);if(!Number.isInteger(change.value)||change.value<0||change.value>255)fail('RAM values must be integers from 0 through 255.');if(change.expected!==undefined&&change.expected!==cell.value)fail('RAM no longer matches the expected value.');if(seen.has(cell.address))fail('Duplicate RAM address, including mirrors.');seen.add(cell.address);return {address:cell.address,value:change.value,expected:cell.value};});
 const checkpoint=timeline.saveOwnedCheckpoint('Before: '+options.label.trim().slice(0,56));
 try{const applied=timeline.patchRAM(changes);checkpointOwner=checkpoint;active={id:'experiment-'+session+'-'+nextId++,label:options.label.trim(),checkpointId:checkpoint.id,frame:checkpoint.frame,changes:applied};event({kind:'applied',...copy(active)});notify();return copy(active);}
 catch(error){checkpoint.release();throw error;}
}
function restore(){sync();if(!active)fail('No reversible experiment is active.');const previous=active;checkpointOwner.restore();checkpointOwner.release();checkpointOwner=null;active=null;event({kind:'restored',id:previous.id,label:previous.label,frame:previous.frame});notify();return true;}
function keep(){sync();if(!active)fail('No reversible experiment is active.');const previous=active;checkpointOwner.release();checkpointOwner=null;active=null;event({kind:'kept',id:previous.id,label:previous.label,frame:previous.frame});notify();return true;}
function exportData(){const state=status();return {format:'NESForgeREInspection',version:2,kind:'ram-experiment-log',identity:services.RERuntime?.status().identity||null,...state,warnings:['Experiment labels and address meanings are user supplied, not verified gameplay semantics.','The log does not contain checkpoint state and cannot restore an emulator session.','Keeping an experiment changes only the loaded emulator RAM, not project JSON or ROM bytes.']};}
// Session changes invalidate reversible operations; ordinary frame navigation
// keeps their original checkpoint so restoring can still rewind the experiment.
let observedSession=session;
timeline.subscribe(state=>{if(state.session!==observedSession){observedSession=state.session;session=state.session;active=null;checkpointOwner=null;journal=[];notify();}});
services.REExperiments=Object.freeze({begin,restore,keep,status,exportData,subscribe(fn){if(typeof fn!=='function')return ()=>{};listeners.add(fn);fn(status());return ()=>listeners.delete(fn);}});
})();
