
/* Current release identity. Format versions are separate from the app version. */
(()=>{
  'use strict';
  const F=window.Forge=window.Forge||{};
  F.services=F.services||{};
  // the save and recovery state, in the classic toolbar (#forge15State) and the Studio bar (#studioState) alike
  function updateStatus(message){
    const targets=[document.getElementById('forge15State'),document.getElementById('studioState')].filter(Boolean);if(!targets.length)return;
    const status=window.Forge15||{},clock=t=>t?new Date(t).toLocaleTimeString():'—';
    const r=status.recovery,text=message||((status.dirty?'● Unsaved changes':'✓ Saved')+' · '+(r?.text||'recovery '+clock(status.lastRecovery)));
    const title=(status.dirty?'Unsaved changes: not yet saved to a project file or browser save.':'Saved: no changes since the last save.')+'\n'+(r?.detail||'')+'\nBrowser save: '+clock(status.lastBrowserSave)+'\nRecovery copy: '+clock(status.lastRecovery)+'\nPortable save: '+clock(status.lastPortable);
    for(const el of targets){el.className=(el.id==='studioState'?'sb-state ':'')+(status.dirty?'dirty':'clean');el.dataset.recovery=r?.level||'';el.textContent=text;el.title=title;}
  }
  F.release=Object.freeze({version:'2.0.0-alpha.12',name:'Integrated Review 6',maturity:'alpha',candidate:'integrated-review-6-public',schema:16,updateStatus,
    romLayout:3,worldRomLayout:4,worldSource:1,nfex:1,metatile:1,world:3,metasprite:2,gameplay:2,audio:1});
  F.services.ReleaseInfo=F.release;
  F.version=F.release.version;
})();
