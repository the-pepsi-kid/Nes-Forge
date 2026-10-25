
/* Derived authoring lookups; no model mutation, caching, or runtime ID allocation. */
(()=>{
  'use strict';
  const services=window.Forge.services;
  function current(){return {scenes:S.scenes,worlds:S.worlds,metasprites:S.metasprites,animations:S.animations};}
  function index(project=current()){
    const issues=[],tables={scenes:new Map(),worlds:new Map(),metasprites:new Map(),animations:new Map(),entities:new Map(),rooms:new Map(),markers:new Map(),cameras:new Map()};
    function add(table,item,path,key=item?.id){
      if(typeof key!=='string'||!key){issues.push({code:'missing-id',path,message:'Missing authoring identity'});return;}
      if(table.has(key)){issues.push({code:'duplicate-id',path,message:'Duplicate authoring identity '+key});return;}
      table.set(key,item);
    }
    for(const [i,scene]of(project.scenes||[]).entries()){
      add(tables.scenes,scene,'scenes['+i+']');
      for(const [j,entity]of(scene.entities||[]).entries())add(tables.entities,entity,'scenes['+i+'].entities['+j+']');
    }
    for(const [i,world]of(project.worlds||[]).entries()){
      add(tables.worlds,world,'worlds['+i+']');
      for(const [field,table]of[['rooms','rooms'],['markers','markers'],['cameraRegions','cameras']])
        for(const [j,item]of(world[field]||[]).entries())add(tables[table],item,'worlds['+i+'].'+field+'['+j+']',world.id+'\0'+item.id);
    }
    for(const field of ['metasprites','animations'])for(const [i,item]of(project[field]||[]).entries())add(tables[field],item,field+'['+i+']');
    return {...tables,issues};
  }
  function validate(project=current()){
    const t=index(project),issues=t.issues.slice();
    const missing=(ok,path,message)=>{if(!ok)issues.push({code:'unresolved-reference',path,message});};
    for(const [i,frame]of(project.metasprites||[]).entries())missing(t.scenes.has(frame.sceneId),'metasprites['+i+'].sceneId','Metasprite source scene is missing');
    for(const [i,anim]of(project.animations||[]).entries())for(const [j,frame]of(anim.frames||[]).entries())if(frame.metaspriteId)missing(t.metasprites.has(frame.metaspriteId),'animations['+i+'].frames['+j+'].metaspriteId','Animation pose is missing');
    for(const [i,scene]of(project.scenes||[]).entries())for(const [j,entity]of(scene.entities||[]).entries())for(const [k,state]of(entity.animationBinding?.states||[]).entries())missing(t.animations.has(state.animationId),'scenes['+i+'].entities['+j+'].animationBinding.states['+k+']','Bound animation is missing');
    for(const [i,world]of(project.worlds||[]).entries()){
      const scene=t.scenes.get(world.tilesetSceneId),base='worlds['+i+']';
      missing(!!scene,base+'.tilesetSceneId','World tileset scene is missing');
      const ids=new Set((scene?.metatiles||[]).map(m=>m.id));
      for(const [j,id]of(world.map||[]).entries())if(id>=0)missing(ids.has(id),base+'.map['+j+']','World metatile '+id+' is unresolved');
      for(const [j,marker]of(world.markers||[]).entries()){
        if(marker.targetWorldId)missing(t.worlds.has(marker.targetWorldId),base+'.markers['+j+'].targetWorldId','Destination world is missing');
        if(marker.targetMarkerId)missing(t.markers.has((marker.targetWorldId||world.id)+'\0'+marker.targetMarkerId),base+'.markers['+j+'].targetMarkerId','Destination marker is missing');
      }
    }
    return issues;
  }
  services.AssetRegistry=Object.freeze({index,validate,
    scene:(id,project)=>index(project).scenes.get(id)||null,
    world:(id,project)=>index(project).worlds.get(id)||null,
    animation:(id,project)=>index(project).animations.get(id)||null,
    entity:(id,project)=>index(project).entities.get(id)||null,
    metasprite:(id,project)=>index(project).metasprites.get(id)||null});
})();
