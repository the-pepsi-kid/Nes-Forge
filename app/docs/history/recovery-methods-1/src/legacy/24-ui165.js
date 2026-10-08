/* NES Forge 1.6.5: project-owned single-room ROM build controls. */
(()=>{
  'use strict';
  const F=window.Forge165,$=id=>document.getElementById(id);
  if(!F?.config)throw Error('Gameplay configuration must load before its editor controls.');
  const state={refreshing:false,message:'',configSignature:''},fields={};
  const style=document.createElement('style');
  style.textContent=`
    #gpPanel165{margin:12px 0;padding:9px;border:1px solid #365b77;background:#101923;font:9px/1.55 monospace}
    #gpPanel165 h3{margin:0 0 5px;color:var(--cyan,#70d6ee);font-size:10px}
    #gpPanel165 p{margin:5px 0;color:var(--dim)}
    #gpPanel165 .gp-row165{display:grid;grid-template-columns:90px minmax(0,1fr);gap:7px;align-items:center;margin:5px 0}
    #gpPanel165 select,#gpPanel165 input{box-sizing:border-box;width:100%;min-width:0;background:var(--bg3);color:var(--txt);border:1px solid var(--bdr);padding:4px;font:9px monospace}
    #gpPanel165 input:disabled,#gpPanel165 select:disabled{opacity:.5}
    #gpPanel165 .gp-actions165{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}
    #gpPanel165 button{padding:6px 9px;font:9px monospace}
    #gpPanel165 #gpPlay165{border-color:#39785a;color:var(--grn)}
    #gpPanel165 #gpStatus165{margin-top:7px;border-top:1px solid var(--bdr);padding-top:6px;white-space:pre-wrap;overflow-wrap:anywhere}
    #gpPanel165 .gp-error165{color:var(--red)}#gpPanel165 .gp-ready165{color:var(--grn)}
    #gpPanel165 details{margin-top:7px}#gpPanel165 summary{cursor:pointer;color:var(--txt)}
  `;
  document.head.appendChild(style);
  function node(tag,id,text,parent){const el=document.createElement(tag);if(id)el.id=id;if(text!==undefined)el.textContent=text;if(parent)parent.appendChild(el);return el;}
  const panel=node('section','gpPanel165');panel.setAttribute('aria-label','Gameplay ROM configuration');
  node('h3',null,'FIRST PLAYABLE ROOM',panel);
  node('p',null,'Choose what the generated ROM runs. These settings travel with your project.',panel);
  function field(key,title,type,parent=panel,range){
    const row=node('div',null,undefined,parent);row.className='gp-row165';
    const id='gp'+key[0].toUpperCase()+key.slice(1)+'165',label=node('label',null,title,row);label.setAttribute('for',id);
    const input=node(type==='select'?'select':'input',id,undefined,row);fields[key]=input;
    if(type!=='select'){input.type='number';input.min=String(range[0]);input.max=String(range[1]);input.step=String(range[2]||1);input.inputMode='numeric';}
    input.onchange=()=>commit(key,type==='select'?input.value:(String(input.value).trim()===''?NaN:Number(input.value)));
    return input;
  }
  field('mode','ROM mode','select');
  field('sceneId','Playable room','select');
  field('playerId','Player','select');
  field('targetId','Training target','select');
  const physics=node('details','gpPhysics165',undefined,panel);node('summary',null,'Movement and collision body',physics);
  field('moveSpeed','Move speed','number',physics,[1,4]);
  field('jumpSpeed','Jump speed','number',physics,[1,12]);
  field('gravity','Gravity','number',physics,[1,3]);
  field('maxFallSpeed','Maximum fall','number',physics,[1,8]);
  field('bodyWidth','Body width','number',physics,[2,32,2]);
  field('bodyHeight','Body height','number',physics,[2,48]);
  node('p',null,'Speeds are pixels per 60 Hz tick; gravity is pixels per tick². Body dimensions are pixels, with an even width.',physics);
  const explanation=node('p','gpHelp165',undefined,panel);
  explanation.textContent='Player and target X/Y mark the feet and center. Use a sideview room with no scrolling and a fixed 256 × 240 camera. Add the room and every sprite source to Build Scene Set.';
  const controls=node('p','gpControls165',undefined,panel);
  controls.textContent='D-pad: move · A: jump · B: attack · Start: restart. Keyboard: ←/→, Z, X, Enter.';
  const actions=node('div',null,undefined,panel);actions.className='gp-actions165';
  const play=node('button','gpPlay165','Build & Play',actions);play.type='button';
  const editRoom=node('button','gpEditRoom165','Edit room',actions);editRoom.type='button';
  const editPlayer=node('button','gpEditPlayer165','Bind animations',actions);editPlayer.type='button';
  const status=node('div','gpStatus165',undefined,panel);status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const codeSide=$('sideCode'),packLabel=$('cfgPackScenes')?.closest('label');
  if(packLabel?.parentElement===codeSide)codeSide.insertBefore(panel,packLabel);else codeSide.appendChild(panel);

  function selectedScene(config=F.config.get()){return S.scenes.find(sc=>sc.id===config.sceneId)||null;}
  function selectedPlayer(config=F.config.get()){return selectedScene(config)?.entities?.find(e=>e.id===config.playerId&&e.type==='player')||null;}
  function optionList(select,options,value,missing){
    // Retain the select node itself, preserving keyboard focus and handlers.
    const signature=JSON.stringify(options);
    if(select._gpOptions165!==signature){
      select.replaceChildren();for(const [v,label]of options){const option=node('option',null,label,select);option.value=v;}
      select._gpOptions165=signature;
    }
    if(!options.some(item=>item[0]===value)){
      const option=node('option',null,missing+' — '+value,select);option.value=value;
      // Rebuild next time so repaired references do not leave a stale option.
      select._gpOptions165=null;
    }
    select.value=value;
  }
  function validate(){
    const config=F.config.get();
    try{F.config.validate(config,{references:config.mode==='single-room'});}
    catch(error){return {ok:false,mode:config.mode,message:error.message};}
    if(config.mode==='viewer')return {ok:true,mode:config.mode,message:$('codeInput').value.trim()?'Custom assembly selected. Build & Play uses your existing assembly and packing settings.':'Scene viewer selected. Start cycles the scenes in Build Scene Set.'};
    if($('codeInput').value.trim())return {ok:false,mode:config.mode,message:'Custom assembly is present. Use Scene viewer / custom assembly mode, or save the assembly separately before clearing it for a single-room build.'};
    // Configuration validation is inexpensive. The actual build validates the
    // linked art, animations, collision and NES resource limits in one place.
    return {ok:true,mode:config.mode,message:'Room and actor references are valid. Build & Play checks animation bindings, art, collision and ROM capacity.'};
  }
  function refresh(force=false){
    if(state.refreshing)return;
    state.refreshing=true;
    try{
      const config=F.config.get(),signature=JSON.stringify(config),room=selectedScene(config),active=config.mode==='single-room';
      if(signature!==state.configSignature){state.message='';state.configSignature=signature;}
      optionList(fields.mode,[['viewer','Scene viewer / custom assembly'],['single-room','Single-room platformer']],config.mode,'Unknown mode');
      optionList(fields.sceneId,[['','Choose a room…'],...S.scenes.map(sc=>[sc.id,sc.name+(sc.buildInclude===false?' · excluded from build':'')])],config.sceneId,'Missing room');
      optionList(fields.playerId,[['','Choose a player…'],...(room?.entities||[]).filter(e=>e.type==='player').map((e,i)=>[e.id,e.name||'Player '+(i+1)])],config.playerId,'Missing player in this room');
      optionList(fields.targetId,[['','No training target'],...(room?.entities||[]).filter(e=>['enemy','npc'].includes(e.type)&&e.id!==config.playerId).map((e,i)=>[e.id,e.name||e.type+' '+(i+1)])],config.targetId,'Missing target in this room');
      for(const [key,input]of Object.entries(fields)){
        input.disabled=key!=='mode'&&!active;
        if(!['mode','sceneId','playerId','targetId'].includes(key)&&(force||document.activeElement!==input))input.value=String(config[key]);
      }
      explanation.style.display=controls.style.display=active?'block':'none';
      editRoom.disabled=!active||!room;editPlayer.disabled=!active||!selectedPlayer(config);
      const result=validate();status.className=result.ok&&!state.message?'gp-ready165':'gp-error165';
      status.textContent=state.message||result.message;play.disabled=!result.ok;
      if(window.Forge?.services?.WorldConfig?.get().enabled){
        for(const input of Object.values(fields))input.disabled=true;
        play.disabled=editRoom.disabled=editPlayer.disabled=true;
        status.className='gp-ready165';status.textContent='World Runtime is selected. Turn it off in WORLD to use these saved viewer or single-room settings.';
      }
      // Supersede the old generic viewer-only help when gameplay is selected.
      const legacyHelp=packLabel?.nextElementSibling;
      if(legacyHelp?.tagName==='P')legacyHelp.textContent=active?'Single-room mode generates player movement, solid collision and bound animation playback. Tracker audio and custom event scripts remain authoring data.':'Viewer/custom mode uses the existing scene packing and assembly path.';
      return result;
    }finally{state.refreshing=false;}
  }
  function commit(key,value){
    try{F.config.set(key,value);state.message='';refresh(true);return true;}
    catch(error){refresh(true);state.message=error.message;status.textContent=error.message;status.className='gp-error165';return false;}
  }
  function open(){switchTab('code');refresh();panel.scrollIntoView({block:'nearest'});return panel;}
  play.onclick=()=>{
    state.message='';const result=refresh();if(!result.ok)return false;
    try{const built=buildAndRun();if(!built){state.message='Build failed. See the Build Log for the required changes.';refresh();}return built;}
    catch(error){state.message=error.message;refresh();return false;}
  };
  editRoom.onclick=()=>{const room=selectedScene();if(!room)return false;switchScene(S.scenes.indexOf(room));switchTab('scene');return true;};
  editPlayer.onclick=()=>{const config=F.config.get();if(!selectedPlayer(config))return false;Forge164.studio.open(config.sceneId,config.playerId);return true;};
  $('codeInput')?.addEventListener('input',()=>{state.message='';refresh();});
  $('cfgPackScenes')?.addEventListener('change',()=>{state.message='';refresh();});
  // No state selection is inferred from the active editor scene. Undo, project
  // reload, deletions and room switches only redraw the saved references.
  const priorRender=render;render=function(){const result=priorRender();if(S.tab==='code')refresh();return result;};
  const priorSceneList=buildSceneSel;buildSceneSel=function(){const result=priorSceneList();refresh();return result;};
  const priorLoad=db_deserializeState;db_deserializeState=function(...args){const result=priorLoad(...args);state.message='';refresh(true);return result;};
  const priorSwitch=switchTab;switchTab=function(...args){const result=priorSwitch(...args);if(S.tab==='code'){state.message='';refresh();}return result;};
  F.ui={refresh,open,validate,commit,state,fields};
  refresh();
})();

