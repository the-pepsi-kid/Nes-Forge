/* NES Forge 3.x: Rev8 bounded frame-continuous presentation.
 * Latest host position + at most one NES-frame of source-observed velocity.
 * No 88ms restarting smoothstep. Vertical display uses the current source
 * frame and a host-supplied next-frame endpoint (never an arbitrary parabola).
 * The host remains authoritative for movement, collisions, HP, XP, attacks.
 * Visual predictions are clamped and never written into WebSocket messages.
 */
(()=>{'use strict';
 function create(clock=()=>performance.now(), legacyDuration=88){
  const tracks=new Map(),FRAME=1000/60.0988;
  function ingest(state){
   const alive=new Set();
   for(const p of state.players||[]){
    alive.add(p.id);
    if(p.mode!=='sideview'||!p.area_id){tracks.delete(p.id);continue;}
    const previous=tracks.get(p.id),px=Number.isFinite(p.side_px)?p.side_px:p.side_x*8;
    const newArea=!previous||previous.area!==p.area_id;
    tracks.set(p.id,{area:p.area_id,at:clock(),x: p.side_x,px,
     // Velocity is a signed /16-px-per-NES-frame value computed by the host.
     vx:Number.isFinite(p.side_velocity_observed_adapter)?Math.max(-24,Math.min(24,p.side_velocity_observed_adapter)):0,
     air:Number.isFinite(p.side_air_px)?p.side_air_px:0,
     nextAir:Number.isFinite(p.side_air_next_px)?p.side_air_next_px:null,
     // On respawns/teleports, never interpolate across the discontinuity.
     discontinuity: !!(previous&&(newArea||Math.abs(px-previous.px)>48))});
   }
   for(const id of tracks.keys())if(!alive.has(id))tracks.delete(id);
  }
  function sample(p){
   const t=tracks.get(p.id);
   if(!t||t.area!==p.area_id)return {side_x:p.side_x,side_px:p.side_px??p.side_x*8,side_air_px:p.side_air_px||0};
   const age=Math.max(0,clock()-t.at);
   // At most one source frame ahead: suppress stale-socket runaway and
   // avoid the 88ms trailing camera / player rubber-band.
   const fraction=t.discontinuity?0:Math.min(1,age/FRAME);
   const position=t.px+(t.vx/16)*fraction;
   // When no source frame endpoint is supplied, render the authoritative
   // height immediately (Rev7 compatibility, never smooth toward stale Y).
   const air=t.nextAir===null?t.air:t.air+(t.nextAir-t.air)*fraction;
   return {side_x:position/8,side_px:position,side_air_px:Math.max(0,air)};
  }
  return Object.freeze({ingest,sample});
 }
 window.ForgePlayableMotion=Object.freeze({create});
})();
