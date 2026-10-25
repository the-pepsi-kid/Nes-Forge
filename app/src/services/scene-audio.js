/* Read-only native event receipts. Canonical Audio alone owns editable scores. */
(()=>{
'use strict';
const services=window.Forge.services;
function receipt(catalog,scene){
 return window.GameRENative.audioReceipt(catalog.profile?.id,scene.audioEvent,services.StageContext.receipt(catalog,scene)?.id);
}
function read(scene){
 const r=scene?.captureMeta?.nativeAssets,c=services.StageContext.read(scene);
 if(!r||!c)return null;
 return window.GameRENative.audioReceipt(r.profile,r.audio,c.context.id);
}
function describe(scene,scenes){
 const current=read(scene),r=scene?.captureMeta?.nativeAssets;
 if(!current)return {status:'unresolved',bindings:[],message:'Project-wide Audio. No verified source-event receipt for this scene; choosing a room does not choose a song.'};
 const related=scenes.filter(s=>{const p=s.captureMeta?.nativeAssets;return p?.source?.sha256===r.source.sha256&&p?.profile===r.profile&&p?.context?.id===r.context.id;});
 const conflict=related.some(s=>{const b=read(s);return s.captureMeta?.nativeAssets?.audio&&(!b||JSON.stringify(b)!==JSON.stringify(current));});
 if(conflict)return {status:'conflict',bindings:[],message:'Source audio receipts disagree. Reimport verified evidence before choosing a source cue. Project-wide Audio is still available.'};
 return {status:'recorded',bindings:[{...current,id:current.event,label:current.label}],sourceSha256:r.source.sha256,message:current.scope};
}
services.SceneAudio=Object.freeze({receipt,read,describe,verifySource:(profile,bytes,event)=>window.GameRENative.verifyAudioSource(profile,bytes,event)});
})();
