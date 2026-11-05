/* Wallet-client native telemetry relay. OBSERVATION ONLY, never game authority. */
(()=>{'use strict';
 const CHANNEL='nesforge-native-session-v1';
 const channel=typeof BroadcastChannel==='function'?new BroadcastChannel(CHANNEL):null;
 const allowed=new Set(['type','version','sourceDigest','frame','area','scene','x','y','xLow','xPage','pose','facing']);
 const isByte=x=>Number.isInteger(x)&&x>=0&&x<=255;
 const valid=m=>m&&typeof m==='object'&&Object.keys(m).length===12&&Object.keys(m).every(k=>allowed.has(k))&&m.type==='native_observation'&&m.version===2&&/^[0-9a-f]{64}$/.test(m.sourceDigest||'')&&Number.isSafeInteger(m.frame)&&m.frame>=0&&m.frame<=2147483647&&['area','scene','y','pose','facing','xLow','xPage'].every(k=>isByte(m[k]))&&Number.isInteger(m.x)&&m.x===m.xLow+256*m.xPage;
 function create({send,getState,getPlayerId}){
   let latest=null,lastRelay=0,lastFrame=-1;
   if(channel)channel.addEventListener('message',e=>{
     const m=e.data,world=getState()?.world,me=getState()?.players?.find(p=>p.id===getPlayerId());
     if(!valid(m)||!world||m.sourceDigest!==world.sourceDigest||!me||me.mode!=='sideview')return;
     if(m.frame<=lastFrame)return;
     const clock=Date.now();if(clock-lastRelay<95)return;
     lastRelay=clock;lastFrame=m.frame;latest={...m};send(latest);
   });
   return Object.freeze({
     summary:(state,areaId)=>{
       if(!latest||Date.now()-lastRelay>2500)return 'Native original-ROM telemetry: local Forge emulator not streaming';
       const entries=(state?.nativeObservations||[]).filter(o=>o.areaId===areaId && o.playerId!==getPlayerId() && o.area===latest.area && o.scene===latest.scene);
       if(!entries.length)return 'Native original-ROM telemetry: no matching remote player in the same original area/scene';
       return 'Native original-ROM observations (read-only; remote overlays not aligned): '+entries.map(o=>o.playerId.slice(0,8)+' area '+o.area+' / scene '+o.scene+' sourceX='+o.x+' Y='+o.y+' frame '+o.frame).join(' | ');
     },
     local:()=>latest,
     linked:()=>!!channel
   });
 }
 window.ForgeNativeLink=Object.freeze({create,valid});
})();
