/* Native edits use ProjectStore transactions and the ordinary Build & Run.
 * The reference room is an editable projection with no inverse art encoder yet;
 * build refuses changes to that projection instead of silently ignoring them. */
(()=>{
'use strict';
const services=window.Forge.services,api=services.NativeEngineProject,host=document.getElementById('spatialRE');if(!host)return;
const el=(tag,id,text)=>{const n=document.createElement(tag);if(id)n.id=id;if(text!==undefined)n.textContent=text;return n;};
const root=el('section','nativeEngineWorkspace'),title=el('h3',null,'Native game edit / build');root.append(title,el('p',null,'Preserve the native game engine and edit verified packed location fields. This milestone supports the investigated Zelda II revision and outputs modified only in those fields. Full game RE and generic movement-rule authoring remain unfinished.'));
const status=el('p','nativeEngineStatus');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
const row=el('div');row.className='spatial-row';root.appendChild(row);
const button=(id,label,fn)=>{const b=el('button',id,label);b.type='button';b.addEventListener('click',fn);row.appendChild(b);return b;};
let staged=null,guard=null,token=0;
const prepare=button('nativeEnginePrepare','Prepare native edit/build project',()=>void preview());
const apply=button('nativeEngineImport','Import native game as new project',importProject);apply.disabled=true;
const openWorld=button('nativeEngineWorld','Open reference room World',()=>{if(!S.nativeGame||!S.worlds.length)return;Forge161.worlds.select(0);switchTab('world');});openWorld.disabled=true;
root.appendChild(status);
const editor=el('div','nativeEngineEditor');editor.hidden=true;root.appendChild(editor);
const group=el('select','nativeEngineRegion'),slot=el('select','nativeEngineSlot');
for(const set of window.NativeEngineFormat.sets){const o=el('option',null,set.name);o.value=set.id;group.appendChild(o);}group.value='west';
for(let i=0;i<63;i++){const o=el('option',null,'Location '+i+(i===62?' · transient slot, read only':''));o.value=String(i);slot.appendChild(o);}slot.value='0';
const field=(caption,input)=>{const label=el('label',null,caption);label.htmlFor=input.id;label.appendChild(input);editor.appendChild(label);};field('Native region / table',group);field('Location record',slot);
const inputs={};for(const [name,label,max]of [['x','Overworld X (native coordinate)',63],['y','Overworld Y (native coordinate)',127],['scene','Native scene selector',62],['entry','Native entry code',3]]){const input=el('input','nativeEngine_'+name);input.type='number';input.min='0';input.max=String(max);input.step='1';field(label,input);inputs[name]=input;input.addEventListener('change',()=>edit(name,input.value));}
const detail=el('pre','nativeEngineDetails');editor.appendChild(detail);for(const input of [group,slot])input.addEventListener('change',refresh);
const guide=el('details','nativeEngineGuide');guide.append(el('summary',null,'Tutorial: import → one edit → native build'),el('p',null,'1. Choose Zelda II in the spatial RE ROM chooser. 2. Prepare native edit/build project and review the source identity. 3. Import native game as new project replaces the active workspace; save your current work first. 4. Build & Run with no edits: the ROM is byte-identical to this source. 5. Return to RE and change a location field; each change has one Undo. 6. Build & Run again, then save the ordinary project using Save Project As. Reopening preserves the source and edit recipe. The reference room is not the whole overworld. Art/runtime edits without a native encoder are preserved but block native builds. Moving a location does not repaint its terrain/icon. Coordinates and packed entry codes do not prove a reachable or safe destination. Scene edits require an available stream in a verified destination context; special unresolved contexts are refused. The original travel, quest, camera, music and movement code stays intact.'));
root.appendChild(guide);host.insertBefore(root,host.firstChild);for(const type of ['keydown','keyup'])root.addEventListener(type,e=>e.stopPropagation?.());
function message(text,error=false){status.textContent=text;status.dataset.error=String(error);}
async function preview(){
 const own=++token;staged=null;guard=null;apply.disabled=true;
 try{const source=services.SpatialREUI.sourceSnapshot();if(!source)throw Error('Choose a ROM in the spatial RE workbench first.');
  const before={epoch:services.ProjectStore.state.epoch,snapshot:services.ProjectStore.serialize()};message('Preparing the preserved source, reference room and native edit contract…');
  const p=await api.create(source.bytes,source.name);if(own!==token)return false;
  const current=services.SpatialREUI.sourceSnapshot();if(!current||window.NativeEngineFormat.sha256(current.bytes)!==p.nativeGame.sourceSha256||before.epoch!==services.ProjectStore.state.epoch||before.snapshot!==services.ProjectStore.serialize())throw Error('Source or project changed during preview. Prepare again.');
  staged=p;guard=before;apply.disabled=false;message('Ready: full native ROM retained · 4 location tables · 248 static editable records · 4 transient read-only slots · '+p.worlds.length+' reference room World. Import replaces the current project. Source SHA-256: '+p.nativeGame.sourceSha256);return true;
 }catch(e){message(e.message,true);return false;}
}
function importProject(){
 try{if(!staged||!guard)throw Error('Prepare the native project first.');const current=services.SpatialREUI.sourceSnapshot();if(!current||window.NativeEngineFormat.sha256(current.bytes)!==staged.nativeGame.sourceSha256||guard.epoch!==services.ProjectStore.state.epoch||guard.snapshot!==services.ProjectStore.serialize())throw Error('Source or project changed. Prepare again.');services.ProjectStore.load(staged,{intent:'native-game-import'});staged=guard=null;apply.disabled=true;refresh();message('Native project imported. Build & Run uses its preserved banked engine. Make supported location edits here; save with Save Project As.');return true;}catch(e){apply.disabled=true;message(e.message,true);return false;}
}
function edit(name,text){
 try{if(String(text).trim()==='')throw Error('Enter an integer field value.');const value=Number(text),store=services.ProjectStore,expected={epoch:store.state.epoch,snapshot:store.serialize()};const result=store.applyNativeGameEdit({region:group.value,index:Number(slot.value),field:name,value},{expected});message(result.applied?'Location edit saved in the project. Build & Run applies it to a copy of the native source.':'This field already has that value.');refresh();return result;}catch(e){message(e.message,true);refresh();return false;}
}
function refresh(){
 editor.hidden=!S.nativeGame||!api.capabilities(S.nativeGame.profile).locationFields;openWorld.disabled=!S.nativeGame||!S.worlds?.length;if(editor.hidden)return;
 try{const p=services.ProjectStore.capture(),r=api.records(p).find(r=>r.region===group.value&&r.index===Number(slot.value));if(!r)throw Error('Location record unavailable.');for(const [key,input]of Object.entries(inputs)){input.value=String(r.values[key]);input.disabled=!r.editable;}
 detail.textContent='Native engine: '+p.nativeGame.profile+'\nSaved field edits: '+p.nativeGame.edits.length+'\nExternal flag: '+r.values.external+' · return-record offset: '+r.values.returnOffset+'\nDestination region/world bits: '+r.values.destinationRegion+' / '+r.values.destinationWorld+' · travel flags: '+r.values.travelFlags+'\nAll flags remain unchanged. Native routines interpret special cases.\n'+r.sources.map(s=>s.field+' → file $'+s.fileOffset.toString(16).toUpperCase()+' mask $'+s.mask.toString(16).toUpperCase()).join('\n');
 }catch(e){message(e.message,true);}
}
services.NativeEngineUI=Object.freeze({preview,importProject,edit,refresh});message('Choose Zelda II above, then prepare a native edit/build project.');refresh();
})();
