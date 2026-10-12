/* Built-in Audio workshop: discoverable, undoable examples, no external fetch. */
(()=>{
'use strict';
const services=Forge.services;
const catalog=Object.freeze([
 Object.freeze({id:'four-notes',name:'Four-note melody',description:'Pulse 1: C4, D4, E4, G4. Edit a note, save/reopen the project, then compile Audio Runtime.'}),
 Object.freeze({id:'four-channels',name:'Four NES channels',description:'Pulse 1, pulse 2, triangle, then noise. Listen to each voice and edit its instrument envelope.'})
]);
function score(id){
 if(!catalog.some(x=>x.id===id))throw Error('Unknown Audio workshop example.');
 const channels=id==='four-notes'?[0,0,0,0]:[0,1,2,3],pitches=id==='four-notes'?[48,50,52,55]:[48,52,43,24];
 return {format:'workshop',tempo:120,scoreProfile:{tempo:120,speed:6,durationRows:16},warnings:[],notes:channels.map((ch,i)=>({start:i,end:i+.75,note:pitches[i],velocity:110,percussion:ch===3,forgeChannel:ch,program:ch,source:['Pulse 1','Pulse 2','Triangle','Noise'][ch]}))};
}
function load(id){
 const parsed=score(id); // Validate before touching playback or authoring.
 services.AudioImport.materialize(parsed,S.audRows);
 aud_stop();const result=services.AudioImport.apply(parsed);
 aud_currentOrder=0;aud_currentRow=0;aud_selectedChannel=0;aud_selectedInst=result.instrumentOffset;
 render();services.AudioUI?.refresh();
 return {id,patternOffset:result.patternOffset,instrumentOffset:result.instrumentOffset,noteCount:result.noteCount};
}
services.AudioWorkshop=Object.freeze({catalog,score,load});
const parent=document.getElementById('sideAudio');if(!parent)return;
const panel=document.createElement('details');panel.id='audWorkshop';
const summary=document.createElement('summary');summary.textContent='Audio workshop examples';panel.appendChild(summary);
const info=document.createElement('p');info.textContent='Adds editable patterns and instruments and replaces the music order. Existing patterns and SFX are retained. Undo restores the previous song. Runtime settings stay as you set them.';panel.appendChild(info);
const select=document.createElement('select');select.id='audWorkshopSelect';select.setAttribute('aria-label','Audio workshop example');for(const item of catalog){const option=document.createElement('option');option.value=item.id;option.textContent=item.name;select.appendChild(option);}select.value=catalog[0].id;panel.appendChild(select);
const status=document.createElement('p');status.id='audWorkshopStatus';status.setAttribute('role','status');
const button=document.createElement('button');button.id='audWorkshopLoad';button.textContent='Add example to this project';button.onclick=()=>{try{const item=catalog.find(x=>x.id===select.value);if(!item)throw Error('Select an Audio example.');if(!confirm('Add '+item.name+' and replace the current music order? Existing patterns and SFX remain; Undo restores the previous song.'))return;load(item.id);status.textContent=item.description+' Use Play for preview. For a ROM, enable Compile Audio Runtime in AUDIO / CODE.';}catch(error){status.textContent=error.message;}};panel.appendChild(button);panel.appendChild(status);parent.prepend(panel);
})();
