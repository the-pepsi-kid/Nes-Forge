/* NES Forge 1.6.6 — project actions and gameplay settings in the original editor. */
(()=>{
  'use strict';
  const F=window.Forge166=window.Forge166||{},G=window.Forge165,$=id=>document.getElementById(id);
  if(!F.project||!G?.ui)throw Error('Project actions require the project model and gameplay controls.');
  const state={reading:false,readToken:0,message:'',error:false,refreshing:false};
  function node(tag,id,text,parent){const el=document.createElement(tag);if(id)el.id=id;if(text!==undefined)el.textContent=text;if(parent)parent.appendChild(el);return el;}
  function button(id,label,parent,action){const el=node('button',id,label,parent);el.type='button';el.onclick=action;return el;}
  const style=node('style');style.textContent=`
    #npGameplay166{margin:10px 0;border:1px solid var(--bdr);background:var(--bg2);font:9px/1.6 monospace}
    #npGameplay166>summary{padding:7px 9px;cursor:pointer;color:var(--cyan,#70d6ee);font-weight:bold}
    #npGameplay166 #gpPanel165{margin:0;border:0;border-top:1px solid var(--bdr);background:transparent}
    #npRomInput166{display:none}#npBindings166{font-size:10px;line-height:1.6;color:#a4b6c9}
    #npBuildLog166{white-space:pre-wrap;overflow-wrap:anywhere;max-height:180px;overflow:auto;font:9px/1.6 monospace}
  `;document.head.appendChild(style);

  const projectBar=document.querySelector('.project-bar');
  const newButton=button('npNew166','New Project',projectBar,()=>newProject());newButton.title='Start a blank project with the existing scene, art and animation tools';projectBar.prepend(newButton);
  button('npOpenRom166','Open Forge ROM',projectBar,()=>$('npRomInput166').click()).title='Open a supported Forge playable ROM as an editable project';
  button('npGameplayOpen166','Gameplay',projectBar,()=>openGameplay()).title='Configure the ROM mode, room, actors and movement in SCENE';
  const romInput=node('input','npRomInput166',undefined,projectBar);romInput.type='file';romInput.accept='.nes';romInput.setAttribute('aria-label','Open Forge ROM as editable project');
  romInput.onchange=event=>{const file=event.target.files?.[0];event.target.value='';return file?readRomFile(file):false;};

  // These are the same saved gameplay fields and event handlers introduced in
  // 1.6.5. They now belong to the existing SCENE sidebar, outside assembly.
  const gameplay=node('details','npGameplay166');node('summary',null,'Gameplay',gameplay);
  const panel=$('gpPanel165');gameplay.appendChild(panel);$('sideScene').prepend(gameplay);
  const buildDetails=node('details','npBuildDetails166',undefined,panel);node('summary',null,'Latest build details',buildDetails);
  const buildLog=node('pre','npBuildLog166',undefined,buildDetails);
  const bindings=node('p','npBindings166','Generated player states: idle, walk and attack; jump is optional. Turn Loop off for attack in ANIM. A training target uses its default state and an optional nonlooping hurt animation. Add attack hitboxes and target hurtboxes in ANIM.',$('esBindingEditor164'));
  bindings.className='es-note164';

  function message(text,error=false){state.message=text;state.error=error;$('issueStatus').textContent=text;showToast(text);return !error;}
  function cancelRead(){state.readToken++;state.reading=false;$('npOpenRom166').disabled=false;}
  function newProject(){
    if(!window.confirm('Create a blank project and replace the current workspace? Undo restores the previous workspace. Save Project As keeps a portable copy.'))return false;
    cancelRead();
    try{const result=F.project.create('blank');if(!result)throw Error('The blank project could not be created.');return message('Blank project created. Draw tiles in CHR SHEET, paint in SCENE, and place actors in ENTITY STUDIO.');}
    catch(error){return message(error.message,true);}
  }
  async function readRomFile(file){
    const token=++state.readToken;state.reading=true;$('npOpenRom166').disabled=true;message('Reading '+file.name+'…');
    try{
      if(file.size>64*1024*1024)throw Error('File exceeds 64 MB.');
      const bytes=new Uint8Array(await file.arrayBuffer());if(token!==state.readToken)return false;
      const summary=F.project.classifyRom(bytes);
      if(!summary.editableProject)return message(summary.label+'. Use Import ROM for playback, capture and inspection. The current workspace was kept.',true);
      if(!window.confirm('Open '+file.name+' as an editable project and replace the current workspace? Undo restores the previous workspace. Save Project As keeps a portable copy.')){message('The current workspace was kept.');return false;}
      const result=F.project.openRom(bytes,file.name);if(!result)throw Error('The ROM could not be opened as an editable project.');
      return message('Forge ROM opened as an editable project. Edit it with the existing tabs, then Build & Run.');
    }catch(error){if(token!==state.readToken)return false;return message(error.message,true);}
    finally{if(token===state.readToken){state.reading=false;$('npOpenRom166').disabled=false;}}
  }
  function openGameplay(){switchTab('scene');gameplay.open=true;G.ui.refresh();gameplay.scrollIntoView({block:'nearest'});return panel;}
  function refreshGameplay(){if(state.refreshing)return;state.refreshing=true;try{return G.ui.refresh();}finally{state.refreshing=false;}}
  function captureBuildLog(){const source=$('buildLog');buildLog.textContent=Array.from(source.children||[]).map(el=>el.textContent).join('\n')||source.textContent||'';return buildLog.textContent;}
  G.ui.open=openGameplay;
  const priorRender=render;render=function(...args){const result=priorRender(...args);if(S.tab==='scene')refreshGameplay();return result;};
  const priorSwitch=switchTab;switchTab=function(...args){const result=priorSwitch(...args);if(S.tab==='scene')refreshGameplay();return result;};
  const priorPlay=$('gpPlay165').onclick;$('gpPlay165').onclick=function(...args){const result=priorPlay.apply(this,args);captureBuildLog();if(!result)buildDetails.open=true;return result;};
  const collisionNote=$('mtCollisionBridge16');if(collisionNote)collisionNote.textContent='COLLISION edits per-tile properties. Linked metatile quadrants are edited in METATILES. The single-room runtime uses Empty and Solid; other properties are retained as authoring data.';
  for(const p of document.querySelectorAll('#sideAnim p'))if(p.textContent.includes('Gameplay generation remains a later milestone.'))p.textContent='Compose reusable frames in METASPRITES and bind animations in ENTITY STUDIO. Configure Gameplay in SCENE, then Build & Run.';
  for(const note of document.querySelectorAll('#sideEntityStudio164 .es-note164'))if(note.textContent.includes('gameplay generation comes later.'))note.textContent='Bindings belong to these scene entities. Gameplay in SCENE generates one fixed room with a player and an optional stationary target. Other entities remain authoring data.';
  F.workspace={newProject,readRomFile,openGameplay,state};refreshGameplay();
})();


