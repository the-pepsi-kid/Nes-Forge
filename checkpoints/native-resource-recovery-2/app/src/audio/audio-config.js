/* NES Forge 1.8 — explicit Audio Runtime configuration.
 * Tracker data remains ordinary authoring data until this saved switch is on.
 */
(()=>{
'use strict';
const services=(window.Forge=window.Forge||{}).services=window.Forge.services||{};
const defaults=()=>({enabled:false,musicEnabled:true});
function normalize(value){const base=defaults(),v=value&&typeof value==='object'&&!Array.isArray(value)?value:{};return {enabled:v.enabled===true,musicEnabled:v.musicEnabled!==false};}
function validate(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Audio Runtime settings must be an object');
 for(const key of Object.keys(value))if(!['enabled','musicEnabled'].includes(key))throw Error('Unknown Audio Runtime setting: '+key);
 for(const key of ['enabled','musicEnabled'])if(value[key]!==undefined&&typeof value[key]!=='boolean')throw Error('Audio Runtime '+key+' must be true or false');
 return normalize(value);
}
function get(){return normalize(S.audioRuntime);}
services.AudioConfig=Object.freeze({defaults,normalize,validate,get});
})();
