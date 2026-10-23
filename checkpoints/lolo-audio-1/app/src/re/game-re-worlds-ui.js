/* Coverage follows the selected world's tileset receipt. It is explanatory UI,
 * not a new runtime or a claim that native collision/AI has been translated. */
(()=>{
'use strict';
const services=window.Forge.services,side=document.getElementById('sideWorld');
const panel=document.createElement('section');panel.id='nativeWorldCoverage';panel.setAttribute('aria-label','Recovered world coverage');panel.hidden=true;
const title=document.createElement('h3');title.textContent='RECOVERED ROOM · COVERAGE';panel.appendChild(title);
const text=document.createElement('p');text.id='nativeWorldCoverageText';text.style.cssText='font-size:9px;line-height:1.6;white-space:pre-line;overflow-wrap:anywhere';panel.appendChild(text);
side.insertBefore(panel,side.firstChild);
const previous=services.WorldUI.refresh;
services.WorldUI.refresh=function(...args){
 const result=previous.apply(this,args),w=S.worlds?.[Forge161.worlds.state.selected],sc=S.scenes.find(s=>s.id===w?.tilesetSceneId),receipt=sc?.captureMeta?.nativeAssets,geometry=receipt?.world;
 panel.hidden=!geometry;
 if(geometry)text.textContent='Editable room layout · '+w.widthScreens+' × '+w.heightScreens+' screens\n'+geometry.contentWidthPixels+' × '+geometry.contentHeightPixels+' source pixels · native Y='+receipt.originY+' adapted to Y=0\nCollision: unassigned\nEntities / AI: not converted\nNative connections: reference evidence only\nAudio / code: separate RE workflows\nWorld Runtime: '+(services.WorldConfig.get().enabled?'enabled by project settings; inspect authored gameplay':'off; author player, collision and links before enabling');
 return result;
};
services.WorldUI.refresh(true);
})();
