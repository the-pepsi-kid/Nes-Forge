/* NES Forge 1.6.6: author bound actors at their actual scene origins. */
(()=>{
  'use strict';
  const F=window.Forge166=window.Forge166||{}, M=window.Forge164?.model;
  if(!M)throw Error('Entity animation model must load before scene placement.');
  const previousDraw=ent_drawAll,previousHit=ent_hitTest;
  const inside=(r,x,y)=>!!r&&x>=r.x&&x<r.x+r.w&&y>=r.y&&y<r.y+r.h;
  function union(a,b){if(!a)return b;if(!b)return a;const x=Math.min(a.x,b.x),y=Math.min(a.y,b.y);return {x,y,w:Math.max(a.x+a.w,b.x+b.w)-x,h:Math.max(a.y+a.h,b.y+b.h)-y};}
  function markerBounds(entity){const w=entity.type==='platform'?(entity.pw||16):12;return {x:entity.x-w/2,y:entity.y-6,w,h:12};}
  function body(entity){
    const world=window.Forge?.services?.WorldConfig?.get(),legacy=window.Forge165?.config?.get(),scene=S.scenes[S.activeScene];
    const config=world?.enabled?world:legacy,sceneId=world?.enabled?world.playerSceneId:legacy?.sceneId;
    if((!world?.enabled&&legacy?.mode!=='single-room')||scene?.id!==sceneId||entity?.id!==config?.playerId||entity.type!=='player')return null;
    if(!Number.isInteger(config.bodyWidth)||!Number.isInteger(config.bodyHeight))return null;
    return {x:entity.x-config.bodyWidth/2,y:entity.y-config.bodyHeight,w:config.bodyWidth,h:config.bodyHeight};
  }
  function pose(entity){
    const binding=entity?.animationBinding,states=binding?.states;
    if(!Array.isArray(states)||!states.length)return null;
    const preferred=states.find(s=>s.state===binding.defaultState),idle=states.find(s=>s.state==='idle');
    const animation=M.animation(preferred?.animationId)||M.animation(idle?.animationId),frame=animation?.frames?.[0];
    if(!frame)return null;
    const resolved=Forge163.animations.resolve(frame);
    if(resolved.kind==='missing')return null;
    if(resolved.kind==='metasprite'){
      const warnings=Forge163.metasprites.warnings(resolved.metasprite);
      if(warnings.missingSource||warnings.missingTiles)return null;
    }
    const pixels=[],facing=binding.facing==='left'?'left':'right';let extent=null;
    // Record the existing renderer so transparent pixels, tile flips, OAM
    // overlap, source palettes and origin reflection have a single definition.
    const pen={fillStyle:'',imageSmoothingEnabled:false,fillRect(x,y,w,h){pixels.push({x,y,w,h,color:this.fillStyle});extent=union(extent,{x,y,w,h});}};
    M.drawFrame(pen,frame,entity.x,entity.y,1,{facing,boxes:false});
    return pixels.length?{animation,frame,facing,pixels,bounds:extent}:null;
  }
  function bounds(entity,{includeBody=false}={}){return union(pose(entity)?.bounds||markerBounds(entity),includeBody?body(entity):null);}
  function paintPixels(ctx,actor,z){ctx.imageSmoothingEnabled=false;for(const p of actor.pixels){ctx.fillStyle=p.color;ctx.fillRect(p.x*z,p.y*z,p.w*z,p.h*z);}}
  function paintFeet(ctx,entity,z){ctx.strokeStyle='#68def0';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo((entity.x-4)*z,entity.y*z+.5);ctx.lineTo((entity.x+4)*z,entity.y*z+.5);ctx.moveTo(entity.x*z+.5,(entity.y-4)*z);ctx.lineTo(entity.x*z+.5,(entity.y+3)*z);ctx.stroke();}
  function paintBody(ctx,box,z){ctx.fillStyle='rgba(104,222,240,.09)';ctx.fillRect(box.x*z,box.y*z,box.w*z,box.h*z);ctx.strokeStyle='#68def0';ctx.lineWidth=1;ctx.strokeRect(box.x*z+.5,box.y*z+.5,box.w*z,box.h*z);}
  // Mixed scenes retain the legacy marker geometry and per-type annotations.
  // Unbound-only scenes continue through the unchanged legacy function below.
  function paintMarker(ctx,e,index,z){
    const type=_et(e.type),box=markerBounds(e),x=e.x*z,y=e.y*z;
    if(e.sprTile>=0&&e.sprTile<256)drawSpriteTile(ctx,e.x-4,e.y-4,e.sprTile,0,z,false,false);
    ctx.fillStyle=type.color;ctx.globalAlpha=.45;ctx.fillRect(box.x*z,box.y*z,box.w*z,box.h*z);ctx.globalAlpha=1;
    ctx.strokeStyle=index===S.selEntity?'#fff':type.color;ctx.lineWidth=index===S.selEntity?2:1;ctx.strokeRect(box.x*z,box.y*z,box.w*z,box.h*z);
    ctx.fillStyle='#fff';ctx.font=Math.max(8,8*z)+'px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(type.icon,x,y);
    if(z>=2){ctx.font=Math.max(6,5*z)+'px monospace';ctx.fillStyle=type.color;ctx.fillText(e.name||type.name,x,y+box.h*z/2+4*z);}
    if(e.type==='door'&&e.targetScene!==undefined&&e.targetScene!==S.activeScene){ctx.setLineDash([3*z,3*z]);ctx.strokeStyle='#48c';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y-20*z);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#48c';ctx.font=Math.max(6,5*z)+'px monospace';ctx.fillText('→'+S.scenes[e.targetScene]?.name,x,y-22*z);}
    if(e.type==='platform'&&e.moveDir&&e.moveDir!=='none'){ctx.setLineDash([2*z,2*z]);ctx.strokeStyle='#88cccc80';ctx.lineWidth=1;const r=(e.range||32)*z;if(e.moveDir==='horizontal'){ctx.beginPath();ctx.moveTo(x-r,y);ctx.lineTo(x+r,y);ctx.stroke();}if(e.moveDir==='vertical'){ctx.beginPath();ctx.moveTo(x,y-r);ctx.lineTo(x,y+r);ctx.stroke();}ctx.setLineDash([]);}
  }
  ent_drawAll=function(ctx,z){
    const entities=ent_list(),actors=entities.map(pose),selected=entities[S.selEntity],selectedBody=selected?body(selected):null;
    if(!actors.some(Boolean)){
      const result=previousDraw(ctx,z);
      if(selectedBody){paintBody(ctx,selectedBody,z);paintFeet(ctx,selected,z);}
      return result;
    }
    entities.forEach((entity,index)=>{
      const actor=actors[index],selected=index===S.selEntity,box=selected?body(entity):null;
      if(!actor){paintMarker(ctx,entity,index,z);if(box){paintBody(ctx,box,z);paintFeet(ctx,entity,z);}return;}
      if(box)paintBody(ctx,box,z);
      paintPixels(ctx,actor,z);
      if(selected){const b=actor.bounds;ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.strokeRect(b.x*z-.5,b.y*z-.5,b.w*z+1,b.h*z+1);paintFeet(ctx,entity,z);}
      if(z>=2){ctx.fillStyle=_et(entity.type).color;ctx.font=Math.max(6,5*z)+'px monospace';ctx.textAlign='center';ctx.textBaseline='top';ctx.fillText(entity.name||_et(entity.type).name,entity.x*z,Math.max(entity.y,actor.bounds.y+actor.bounds.h)*z+4*z);}
    });
    ctx.textAlign='start';ctx.textBaseline='alphabetic';ctx.globalAlpha=1;
  };
  ent_hitTest=function(x,y){
    const entities=ent_list(),actors=entities.map(pose),selected=entities[S.selEntity],selectedBody=selected?body(selected):null;
    if(!actors.some(Boolean)&&!selectedBody)return previousHit(x,y);
    for(let i=entities.length-1;i>=0;i--){const e=entities[i];if(inside(actors[i]?.bounds||markerBounds(e),x,y)||(i===S.selEntity&&inside(body(e),x,y)))return i;}
    return -1;
  };
  F.placement={pose,bounds,body,markerBounds,inside};
})();

