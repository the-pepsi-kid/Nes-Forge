/* One local NES port: additional browser input sources feed the existing latch.
 * Protected CPU/PPU/APU and keyboard source files remain unchanged. */
(()=>{
  'use strict';
  const services=window.Forge.services;
  const actions=['A','B','Select','Start','Up','Down','Left','Right'];
  const standard={A:'button:0',B:'button:1',Select:'button:8',Start:'button:9',Up:'button:12',Down:'button:13',Left:'button:14',Right:'button:15'};
  const directionAxes={Up:[1,-1],Down:[1,1],Left:[0,-1],Right:[0,1]};
  const deadzone=0.35,touches=new Map(),blockers=new Set(),listeners=new Set(),profiles=new Map();
  const originalRead=emuReadJoyState,originalClear=clearEmuKeys,originalPause=emuPause,originalFrame=emuRunFrame,originalStep=emuStep;
  let devices=[],pads=[],selected=null,automatic=true,bindings=emptyBindings(),overrides=new Set();
  let touchMask=0,gamepadMask=0,waitingForNeutral=true,error='',lastNotice='',lastAmbient='',stepping=0,releaseGeneration=0;
  const supported=typeof navigator!=='undefined'&&typeof navigator.getGamepads==='function';

  function emptyBindings(){return Object.fromEntries(actions.map(action=>[action,'']));}
  function neutralize(mask){mask&=255;if((mask&48)===48)mask&=~48;if((mask&192)===192)mask&=~192;return mask;}
  function hidden(){return typeof document!=='undefined'&&!!document.hidden;}
  function ambientReasons(){
    const reasons=[];if(hidden())reasons.push('hidden');
    const dialog=document.getElementById?.('forgeSaveDialog');
    if(dialog&&(dialog.open===true||dialog.hasAttribute?.('open')===true||(typeof dialog.open!=='boolean'&&dialog.getAttribute?.('open')!=null)))reasons.push('save-dialog');
    if(document.getElementById?.('projModal')?.classList?.contains('show'))reasons.push('projects-dialog');
    if(document.getElementById?.('nesPicker')?.classList?.contains('show'))reasons.push('palette-dialog');
    const target=document.activeElement,tag=String(target?.tagName||'').toUpperCase();
    if(['INPUT','TEXTAREA','SELECT'].includes(tag)||target?.isContentEditable)reasons.push('editable-focus');
    return reasons;
  }
  function blocked(){return blockers.size>0||ambientReasons().length>0;}
  function syncAmbient(){
    const key=ambientReasons().join(',');if(key===lastAmbient)return;lastAmbient=key;release('environment');
  }
  function active(){return S.tab==='emu'&&!blocked();}
  function signature(pad){return [String(pad.id||''),String(pad.mapping||''),pad.buttons?.length||0,pad.axes?.length||0].join('\n');}
  function snapshot(){return {supported,error,devices:devices.map(item=>({...item})),selectedIndex:selected?.index??null,
    bindings:{...bindings},releaseGeneration,waitingForNeutral,touchMask,gamepadMask,blocked:blocked(),blockingReasons:[...blockers,...ambientReasons()],deadzone};}
  function notify(){
    const state=snapshot(),key=JSON.stringify(state);if(key===lastNotice)return;lastNotice=key;
    for(const fn of listeners){try{fn(state);}catch(e){console.warn('Emulator input status listener failed',e);}}
  }
  function clearTouch(){releaseGeneration++;touches.clear();touchMask=0;notify();}
  function arm(){gamepadMask=0;waitingForNeutral=true;}
  function release(reason){releaseGeneration++;originalClear();touches.clear();touchMask=0;arm();notify();}
  function setBlocked(reason,value){
    if(typeof reason!=='string'||!reason)return false;
    const had=blockers.has(reason);if(value)blockers.add(reason);else blockers.delete(reason);
    if(had!==!!value)release(reason);return true;
  }
  function saveProfile(){if(selected)profiles.set(selected.signature,{bindings:{...bindings},overrides:[...overrides]});}
  function choose(pad){
    saveProfile();selected={index:pad.index,signature:signature(pad)};
    const profile=profiles.get(selected.signature);
    bindings=profile?{...profile.bindings}:pad.mapping==='standard'?{...standard}:emptyBindings();
    overrides=new Set(profile?.overrides||[]);arm();
  }
  function drop(){saveProfile();selected=null;automatic=false;bindings=emptyBindings();overrides.clear();arm();}
  function scan(){
    if(!supported){pads=[];devices=[];error='Gamepad API unavailable. Touch and keyboard controls remain available.';return;}
    try{
      pads=Array.from(navigator.getGamepads()||[]).filter(pad=>pad&&pad.connected!==false&&Number.isInteger(pad.index));
      devices=pads.map(pad=>({index:pad.index,id:String(pad.id||'Controller'),mapping:String(pad.mapping||''),buttons:pad.buttons?.length||0,axes:pad.axes?.length||0}));error='';
    }catch(e){pads=[];devices=[];error='Controller access is unavailable in this browser or page. Touch and keyboard controls remain available.';}
    if(selected&&!pads.some(pad=>pad.index===selected.index&&signature(pad)===selected.signature))drop();
    if(!selected&&automatic&&pads.length){choose(pads[0]);automatic=false;}
  }
  function pressed(pad,binding){
    if(!binding)return false;const fields=binding.split(':'),index=Number(fields[1]);
    if(fields[0]==='button'){const button=pad.buttons?.[index];return typeof button==='number'?button>0.5:!!button&&(button.pressed===true||Number(button.value)>0.5);}
    const value=Number(pad.axes?.[index]);return Number.isFinite(value)&&value*Number(fields[2])>deadzone;
  }
  function rawMask(pad){
    let mask=0;
    actions.forEach((action,index)=>{
      let down=pressed(pad,bindings[action]);
      if(pad.mapping==='standard'&&!overrides.has(action)&&directionAxes[action]){
        const [axis,direction]=directionAxes[action];down=down||pressed(pad,'axis:'+axis+':'+direction);
      }
      if(down)mask|=1<<index;
    });return mask;
  }
  function poll(){
    syncAmbient();scan();const pad=selected&&pads.find(pad=>pad.index===selected.index&&signature(pad)===selected.signature);
    // Discovery while paused must never rearm a pad held before resume. Only a
    // neutral sample observed during active play clears the release-to-neutral gate.
    if(!pad||!active()||!emu.running){arm();if(!active()||!emu.running){if(touches.size)releaseGeneration++;touches.clear();touchMask=0;}}
    else{
      const raw=rawMask(pad);
      if(waitingForNeutral){gamepadMask=0;if(raw===0)waitingForNeutral=false;}
      else gamepadMask=neutralize(raw);
    }
    notify();return snapshot();
  }
  function selectGamepad(index){
    scan();if(index===null){drop();notify();return true;}
    if(!Number.isInteger(index))return false;const pad=pads.find(item=>item.index===index);if(!pad)return false;
    automatic=false;choose(pad);notify();return true;
  }
  function setBinding(action,binding){
    if(!actions.includes(action)||typeof binding!=='string'||!selected)return false;
    const match=binding.match(/^(?:button:(\d+)|axis:(\d+):(-1|1))$/);if(binding&&!match)return false;
    const device=devices.find(item=>item.index===selected.index);
    if(binding&&(!device||(match[1]!==undefined?Number(match[1])>=device.buttons:Number(match[2])>=device.axes)))return false;
    bindings[action]=binding;overrides.add(action);saveProfile();arm();notify();return true;
  }
  function resetBindings(){
    const pad=selected&&pads.find(item=>item.index===selected.index);bindings=pad?.mapping==='standard'?{...standard}:emptyBindings();
    overrides.clear();saveProfile();arm();notify();
  }
  function setTouch(pointerId,mask){
    syncAmbient();if(!active()||!emu.running)return false;
    if(!Number.isInteger(mask))return false;
    mask&=255;if(mask)touches.set(pointerId,mask);else touches.delete(pointerId);
    touchMask=0;for(const value of touches.values())touchMask|=value;notify();return true;
  }
  function releaseTouch(pointerId){touches.delete(pointerId);touchMask=0;for(const value of touches.values())touchMask|=value;notify();}

  // Input adapters wrap named public boundaries, not CPU bus/latch code. The
  // keyboard path intentionally works during manual frame stepping when paused.
  emuReadJoyState=function(){syncAmbient();if(!active())return 0;return neutralize(originalRead()|(emu.running?(touchMask|gamepadMask):0));};
  clearEmuKeys=function(){release('clear');};
  emuPause=function(...args){
    // Frame stepping intentionally samples held keyboard keys. It still releases
    // touch/gamepad, while the ordinary Pause command releases all three sources.
    if(stepping){releaseGeneration++;touches.clear();touchMask=0;arm();notify();}else release('pause');
    return originalPause.apply(this,args);
  };
  emuStep=function(...args){stepping++;try{return originalStep.apply(this,args);}finally{stepping--;}};
  emuRunFrame=function(...args){poll();return originalFrame.apply(this,args);};
  window.addEventListener?.('blur',()=>setBlocked('focus',true));
  window.addEventListener?.('focus',()=>setBlocked('focus',false));
  document.addEventListener?.('focusin',syncAmbient);
  document.addEventListener?.('focusout',syncAmbient);
  document.addEventListener?.('visibilitychange',()=>{release('visibility');});
  window.addEventListener?.('gamepadconnected',()=>poll());
  window.addEventListener?.('gamepaddisconnected',event=>{
    if(selected&&event.gamepad?.index===selected.index)drop();poll();
  });
  services.EmulatorInput=Object.freeze({setTouch,releaseTouch,clearTouch,release,setBlocked,poll,status:snapshot,selectGamepad,setBinding,resetBindings,
    subscribe(fn){if(typeof fn!=='function')return ()=>{};listeners.add(fn);fn(snapshot());return ()=>listeners.delete(fn);}});
})();
