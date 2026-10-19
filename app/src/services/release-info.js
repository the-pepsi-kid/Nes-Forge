
/* Current release identity. Format versions are separate from the app version. */
(()=>{
  'use strict';
  const F=window.Forge=window.Forge||{};
  F.services=F.services||{};
  function updateStatus(message){
    const el=document.getElementById('forge15State');if(!el)return;
    const status=window.Forge15||{},clock=t=>t?new Date(t).toLocaleTimeString():'—';
    el.className=status.dirty?'dirty':'clean';
    el.textContent=message||((status.dirty?'● Modified':'✓ Saved')+' · recovery '+clock(status.lastRecovery));
    el.title='Modified: '+(status.dirty?'yes':'no')+'\nBrowser save: '+clock(status.lastBrowserSave)+'\nRecovery: '+clock(status.lastRecovery)+'\nPortable save: '+clock(status.lastPortable);
  }
  F.release=Object.freeze({version:'2.0.0-alpha.11',name:'Native Game RE',maturity:'alpha',candidate:'ninja-zelda-re-1',schema:12,updateStatus,
    romLayout:3,worldRomLayout:4,worldSource:1,nfex:1,metatile:1,world:3,metasprite:2,gameplay:2,audio:1});
  F.services.ReleaseInfo=F.release;
  F.version=F.release.version;
})();
