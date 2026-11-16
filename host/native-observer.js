/* NES Forge original-ROM observer, experimental and READ ONLY.
 * Served with Forge's existing editor at /native-editor, not a new emulator.
 * Never transmits ROM bytes, SRAM, screenshots, wallet credentials or inputs.
 */
(()=>{'use strict';
  const CHANNEL='nesforge-native-session-v1',INTERVAL_MS=120;
  const channel=typeof BroadcastChannel==='function'?new BroadcastChannel(CHANNEL):null;
  const panel=document.createElement('div');
  panel.id='nf-original-observer';
  Object.assign(panel.style,{position:'fixed',right:'10px',bottom:'10px',zIndex:'100000',padding:'10px',maxWidth:'300px',border:'1px solid #577d8e',background:'#0b1720',color:'#e5f4fc',font:'12px/1.4 monospace',boxShadow:'0 3px 14px #0009'});
  panel.innerHTML='<strong>Native NES → multiplayer observation</strong><div id="nf-obs-status">Read-only · OFF</div><label><input type="checkbox" id="nf-obs-enable"> Share original-game state with wallet client in this browser profile</label><div style="font-size:11px;opacity:.8">ROM stays in this tab. No gameplay authority or remote overlay yet.</div>';
  const install=()=>document.body.appendChild(panel);
  if(document.body)install();else document.addEventListener('DOMContentLoaded',install,{once:true});
  const status=panel.querySelector('#nf-obs-status');
  const enabled=panel.querySelector('#nf-obs-enable');
  let cachedROM=null,cachedDigest='',pendingROM=null,lastFrame=-1,lastError='';
  const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  const machine=()=>{try{return typeof emu!=='undefined'?emu:null;}catch{return null;}};
  const recognized=(e)=>{try{return !!window.ZeldaOverworld?.recognizes?.(e.lastBuiltRom);}catch{return false;}};
  async function identifyROM(rom){
    if(!rom||!(rom instanceof Uint8Array)||rom.length<16)return;
    if(rom===cachedROM||rom===pendingROM)return;
    cachedROM=null;cachedDigest='';pendingROM=rom;
    try{
      if(!crypto.subtle)throw Error('Secure-context SHA-256 unavailable');
      const hash=await crypto.subtle.digest('SHA-256',rom);
      if(pendingROM!==rom)return;
      cachedROM=rom;cachedDigest=hex(new Uint8Array(hash));lastFrame=-1;
    }catch(error){lastError=String(error?.message||error);}
    finally{if(pendingROM===rom)pendingROM=null;}
  }
  function sample(){
    if(!enabled.checked||!channel)return;
    const e=machine();
    if(!e?.loaded||!(e.ram instanceof Uint8Array)||e.ram.length<2048||!recognized(e)){
      status.textContent='Load the original Zelda II US ROM in Forge Emulator';return;
    }
    if(e.lastBuiltRom!==cachedROM){identifyROM(e.lastBuiltRom);status.textContent='Checking local ROM source identity…';return;}
    if(!cachedDigest)return;
    if(!Number.isSafeInteger(e.frameCount)||e.frameCount===lastFrame)return;
    lastFrame=e.frameCount;
    const r=e.ram;
    const observed={type:'native_observation',version:2,sourceDigest:cachedDigest,
      frame:e.frameCount,area:r[0x748],scene:r[0x561],x:r[0x4d]+r[0x3b]*256,y:r[0x29],
      xLow:r[0x4d],xPage:r[0x3b],pose:r[0x80],facing:r[0x9f]};
    // Only ordinary 8-bit RAM readings and monotonically increasing frame number.
    channel.postMessage(observed);
    status.textContent='Original ROM · frame '+observed.frame+' · area '+observed.area+' / scene '+observed.scene+' · Link source X='+observed.x+' (page '+observed.xPage+') Y='+observed.y;
  }
  setInterval(()=>{try{sample()}catch(error){lastError=String(error?.message||error);status.textContent='Observer paused: '+lastError;}},INTERVAL_MS);
  enabled.addEventListener('change',()=>{lastFrame=-1;status.textContent=enabled.checked?(channel?'Waiting for original ROM…':'BroadcastChannel unavailable'):'Read-only · OFF';});
  // Test/status surface; does not expose ROM or machine object.
  window.ForgeNativeObserver=Object.freeze({status:()=>({enabled:enabled.checked,linked:!!channel,sourceDigest:cachedDigest,lastFrame,error:lastError})});
})();
