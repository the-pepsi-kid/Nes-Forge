/* NES Forge 1.7 — explicit World Runtime settings; authoring IDs stay stable. */
(()=>{
  'use strict';
  const services=window.Forge.services,cp=value=>JSON.parse(JSON.stringify(value));
  const defaults=()=>({enabled:false,worldId:'',spawnId:'',playerSceneId:'',playerId:'',moveSpeed:2,jumpSpeed:9,gravity:1,maxFallSpeed:6,bodyWidth:12,bodyHeight:22});
  const limits=window.Forge165.config.limits;
  function validate(value,{references=false,project}={}){
    if(!value||typeof value!=='object'||Array.isArray(value))throw Error('World Runtime settings must be an object');
    const allowed=Object.keys(defaults());
    for(const key of Object.keys(value))if(!allowed.includes(key))throw Error('Unknown World Runtime setting: '+key);
    if(typeof value.enabled!=='boolean')throw Error('World Runtime enabled must be true or false');
    for(const key of ['worldId','spawnId','playerSceneId','playerId']){
      if(typeof value[key]!=='string'||new TextEncoder().encode(value[key]).length>255)throw Error('World Runtime '+key+' must be text of at most 255 UTF-8 bytes');
    }
    window.Forge165.config.validatePhysics(value,'World Runtime ');
    if(value.bodyWidth%2)throw Error('World Runtime body width must be even so the feet origin stays centered');
    if(references&&value.enabled){
      const source=project===undefined?{worlds:S.worlds,scenes:S.scenes}:project,world=(source?.worlds||[]).find(w=>w.id===value.worldId);
      if(!world)throw Error('Choose an existing start world in WORLD');
      const marker=(world.markers||[]).find(m=>m.id===value.spawnId);
      if(!marker||!['spawn','entrance'].includes(marker.kind))throw Error('Choose a Spawn or Entrance marker in the start world');
      const scene=(source.scenes||[]).find(sc=>sc.id===value.playerSceneId);
      if(!scene)throw Error('Choose an existing player source scene in WORLD');
      if(!(scene.entities||[]).some(e=>e.id===value.playerId&&e.type==='player'))throw Error('Choose a Player entity in the selected player source scene');
    }
    return true;
  }
  function get(){return S.worldRuntime===undefined?defaults():S.worldRuntime;}
  function setAll(value){
    validate(value);
    if(JSON.stringify(get())===JSON.stringify(value))return false;
    snapshot();S.worldRuntime=cp(value);notify('worldRuntimeSettings');
    services.WorldUI?.refresh(true);Forge165.ui?.refresh(true);return true;
  }
  function set(key,value){if(!Object.hasOwn(defaults(),key))throw Error('Unknown World Runtime setting: '+key);return setAll({...get(),[key]:value});}
  services.WorldConfig=Object.freeze({defaults,limits,validate,get,set,setAll});
})();
