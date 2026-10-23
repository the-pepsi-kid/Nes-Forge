/* NES Forge 1.7 — World Runtime controls in the existing WORLD sidebar. */
(()=>{
  'use strict';
  const services=window.Forge.services,config=services.WorldConfig,$=id=>document.getElementById(id);
  if(services.WorldUI)return;
  if(!config)throw Error('World Runtime configuration must load before its controls');
  const side=$('sideWorld'),fields={},state={refreshing:false,message:'',signature:''};
  function node(tag,id,text,parent){const el=document.createElement(tag);if(id)el.id=id;if(text!==undefined)el.textContent=text;if(parent)parent.appendChild(el);return el;}
  const panel=node('section','wrPanel170',undefined,side);panel.setAttribute('aria-label','World Runtime configuration');
  node('h3',null,'WORLD RUNTIME',panel);
  const enabledRow=node('label',null,undefined,panel),enabled=node('input','wrEnabled170',undefined,enabledRow);enabled.type='checkbox';fields.enabled=enabled;
  node('span',null,' Build this project as World Runtime',enabledRow);
  enabled.onchange=()=>commit('enabled',enabled.checked);
  node('p',null,'Choose the start marker and a player authored in ENTITY STUDIO. These choices are saved with the project.',panel);
  function field(key,label,type,parent=panel){
    const row=node('div',null,undefined,parent);row.className='wr-row170';
    const id='wr'+key[0].toUpperCase()+key.slice(1)+'170',caption=node('label',null,label,row);caption.setAttribute('for',id);
    const input=node(type==='select'?'select':'input',id,undefined,row);fields[key]=input;
    if(type!=='select'){const [min,max]=config.limits[key];input.type='number';input.min=String(min);input.max=String(max);input.step=key==='bodyWidth'?'2':'1';input.inputMode='numeric';}
    input.onchange=()=>commit(key,type==='select'?input.value:(String(input.value).trim()===''?NaN:Number(input.value)));return input;
  }
  field('worldId','Start world','select');field('spawnId','Start marker','select');
  field('playerSceneId','Player source scene','select');field('playerId','Player','select');
  const physics=node('details','wrPhysics170',undefined,panel);node('summary',null,'Movement and collision body',physics);
  for(const [key,label]of [['moveSpeed','Move speed'],['jumpSpeed','Jump speed'],['gravity','Gravity'],['maxFallSpeed','Maximum fall'],['bodyWidth','Body width'],['bodyHeight','Body height']])field(key,label,'number',physics);
  node('p',null,'Speeds are pixels per 60 Hz tick. Body dimensions are pixels; player coordinates mark the center of the feet.',physics);
  node('p','wrHelp170','World Runtime uses screen transitions with rooms and cameras aligned to NES screens. Camera regions select the screen shown: follow tracks both axes, horizontal fixes the row, vertical fixes the column, and locked holds the region’s first screen. Movement can continue off that camera screen.',panel);
  node('p',null,'Keyboard: Left/Right move · Z jumps · X plays attack · Up enters a linked entrance or exit · Enter restarts.',panel);
  const play=node('button','wrPlay170','Build & Run',panel);play.type='button';
  const status=node('div','wrStatus170',undefined,panel);status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const style=node('style','wrStyle170',undefined,document.head);style.textContent='#wrPanel170{border-top:1px solid var(--bdr);margin-top:10px;padding-top:4px}#wrPanel170 p{font-size:9px;line-height:1.5;color:var(--dim)}#wrPanel170 .wr-row170{display:grid;grid-template-columns:92px minmax(0,1fr);align-items:center;gap:5px;margin:5px 0;font-size:9px}#wrPanel170 select,#wrPanel170 input[type=number]{width:100%;min-width:0}#wrStatus170{font-size:9px;line-height:1.5;margin-top:6px}.wr-ready170{color:var(--grn)}.wr-error170{color:var(--red)}';
  function options(select,items,value,missing){
    const signature=JSON.stringify(items);
    if(select._worldOptions170!==signature){select.replaceChildren();for(const [id,title]of items){const item=node('option',null,title,select);item.value=id;}select._worldOptions170=signature;}
    if(!items.some(item=>item[0]===value)){const item=node('option',null,missing+' — '+value,select);item.value=value;select._worldOptions170=null;}
    select.value=value;
  }
  function validate(){
    const value=config.get();
    try{config.validate(value,{references:value.enabled});}catch(error){return {ok:false,message:error.message};}
    if(!value.enabled)return {ok:true,message:'World Runtime is off. The saved viewer or single-room mode controls Build & Run.'};
    if($('codeInput')?.value.trim())return {ok:false,message:'World Runtime generates its own code. Save and clear custom assembly before building.'};
    if(S.mapper!==0)return {ok:false,message:'World Runtime currently builds mapper 0 (NROM).'};
    return {ok:true,message:'Start and player references are valid. Build & Run checks world geometry, collision, animations and ROM capacity.'};
  }
  function refresh(force=false){
    if(state.refreshing)return;state.refreshing=true;
    try{
      const value=config.get(),signature=JSON.stringify(value),world=(S.worlds||[]).find(w=>w.id===value.worldId),scene=S.scenes.find(sc=>sc.id===value.playerSceneId);
      if(state.signature!==signature){state.signature=signature;state.message='';}
      enabled.checked=value.enabled;
      options(fields.worldId,[['','Choose a world…'],...(S.worlds||[]).map(w=>[w.id,w.name])],value.worldId,'Missing world');
      options(fields.spawnId,[['','Choose a Spawn or Entrance…'],...(world?.markers||[]).filter(m=>['spawn','entrance'].includes(m.kind)).map(m=>[m.id,m.name+' ['+m.kind+']'])],value.spawnId,'Missing start marker');
      options(fields.playerSceneId,[['','Choose a player source scene…'],...S.scenes.map(sc=>[sc.id,sc.name])],value.playerSceneId,'Missing player source scene');
      options(fields.playerId,[['','Choose a Player…'],...(scene?.entities||[]).filter(e=>e.type==='player').map((e,i)=>[e.id,e.name||'Player '+(i+1)])],value.playerId,'Missing Player');
      for(const [key,input]of Object.entries(fields)){
        input.disabled=key!=='enabled'&&!value.enabled;
        if(Object.hasOwn(config.limits,key)&&(force||document.activeElement!==input))input.value=String(value[key]);
      }
      const result=validate();status.textContent=state.message||result.message;status.className=result.ok&&!state.message?'wr-ready170':'wr-error170';play.disabled=!value.enabled||!result.ok;
      return result;
    }finally{state.refreshing=false;}
  }
  function commit(key,value){
    try{config.set(key,value);state.message='';refresh(true);return true;}
    catch(error){refresh(true);state.message=error.message;status.textContent=error.message;status.className='wr-error170';return false;}
  }
  play.onclick=()=>{
    state.message='';const result=refresh();if(!config.get().enabled||!result?.ok)return false;
    try{const built=buildAndRun();if(!built){state.message='Build failed. See the Build Log for the required changes.';refresh();}return built;}
    catch(error){state.message=error.message;refresh();return false;}
  };
  $('codeInput')?.addEventListener('input',()=>{state.message='';refresh();});
  services.WorldUI={refresh,validate,commit,fields,state,panel};refresh();
})();
