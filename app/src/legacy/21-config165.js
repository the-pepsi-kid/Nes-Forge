/* NES Forge 1.6.5 — explicit generated gameplay configuration, project v8. */
(()=>{
'use strict';
const F=window.Forge165=window.Forge165||{},cp=v=>JSON.parse(JSON.stringify(v));
const defaults=()=>({mode:'viewer',sceneId:'',playerId:'',targetId:'',moveSpeed:2,jumpSpeed:9,gravity:1,maxFallSpeed:6,bodyWidth:12,bodyHeight:22});
// Both generated runtimes use this one immutable physical-domain contract.
const limits=Object.freeze(Object.fromEntries(Object.entries({moveSpeed:[1,4],jumpSpeed:[1,12],gravity:[1,3],maxFallSpeed:[1,8],bodyWidth:[2,32],bodyHeight:[2,48]}).map(([key,range])=>[key,Object.freeze(range)])));
function validatePhysics(value,prefix=''){for(const [key,[min,max]]of Object.entries(limits))if(!Number.isInteger(value[key])||value[key]<min||value[key]>max)throw Error(prefix+key+' must be a whole number from '+min+' through '+max);}
function validate(value,{references=false,project}={}){
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Gameplay settings must be an object');
  const allowed=Object.keys(defaults());for(const key of Object.keys(value))if(!allowed.includes(key))throw Error('Unknown gameplay setting: '+key);
  if(!['viewer','single-room'].includes(value.mode))throw Error('Select Scene viewer or Playable room build mode');
  for(const key of ['sceneId','playerId','targetId'])if(typeof value[key]!=='string'||new TextEncoder().encode(value[key]).length>255)throw Error('Gameplay '+key+' must be text of at most 255 UTF-8 bytes');
  validatePhysics(value);
  if(value.bodyWidth%2)throw Error('Gameplay body width must be even so the feet origin stays centered');
  if(references&&value.mode==='single-room'){
    const scene=((project===undefined?S:project)?.scenes||[]).find(sc=>sc.id===value.sceneId);if(!scene)throw Error('Select an existing room for gameplay');
    if(scene.buildInclude===false)throw Error('Include the playable room in the Build Scene Set');
    const player=(scene.entities||[]).find(e=>e.id===value.playerId);if(!player||player.type!=='player')throw Error('Choose a player entity in the playable room');
    if(value.targetId){const target=(scene.entities||[]).find(e=>e.id===value.targetId);if(!target||!['npc','enemy'].includes(target.type)||target===player)throw Error('Choose a distinct NPC or enemy as the training target');}
  }
  return true;
}
function get(){if(S.gameplay===undefined)S.gameplay=defaults();return S.gameplay;}
function setAll(value){validate(value);if(JSON.stringify(get())===JSON.stringify(value))return false;snapshot();S.gameplay=cp(value);notify('gameplaySettings');F.ui?.refresh();return true;}
function set(key,value){if(!Object.hasOwn(defaults(),key))throw Error('Unknown gameplay setting: '+key);return setAll({...get(),[key]:value});}
F.config={schemaVersion:8,defaults,validate,validatePhysics,get,set,setAll,limits};
get();
const previousProject=projectData;
projectData=function(){const out=previousProject();out.version=8;out.foundation='1.6.5';out.gameplay=cp(get());return out;};
const previousLoad=db_deserializeState;
db_deserializeState=function(input,options={}){
  const raw=typeof input==='string'?JSON.parse(input):cp(input);
  if(raw?.version>8)throw Error('This project needs a newer NES Forge version');
  const config=raw?.gameplay===undefined?defaults():raw.gameplay;validate(config);
  const base=cp(raw);if(base.version===8)base.version=7;
  const result=previousLoad(base,options);S.gameplay=cp(config);F.ui?.refresh();return result;
};
const previousZip=buildZip;
buildZip=function(files){if(Array.isArray(files)&&files.some(f=>f.name==='project.json')&&!files.some(f=>f.name==='gameplay.json'))files=[...files,{name:'gameplay.json',data:new TextEncoder().encode(JSON.stringify({format:'NESForgeGameplay',version:1,gameplay:cp(get())}))}];return previousZip(files);};
})();


