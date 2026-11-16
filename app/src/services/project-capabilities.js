/* NES FORGE CONNECTION: src/services/project-capabilities.js
 * A read-only description of the existing build route and native write owners.
 * Connected Workspace, intake and Area Library use the same projection. It
 * creates no assets, signatures, schema fields, native permissions or state.
 * BuildGraph/NativeEngineProject remain authoritative for build acceptance.
 * Native Scene encoders declare their own discoverable scope at registration;
 * an available writer is distinct from an editing view already being opened.
 */
(()=>{
'use strict';
const services=Forge.services;
const titleByKind={'punch-out':'Punch-Out',contra:'Contra',ff:'Final Fantasy',megaman:'Mega Man',metroid:'Metroid',lolo:'Adventures of Lolo','river-city':'River City Ransom',shadowgate:'Shadowgate'};
function describe(project=S){
 const backend=services.BuildGraph.backendFor(project),native=project.nativeGame;
 const buildSceneSet=backend==='packed'||backend==='single-room';
 const result={backend,kind:'author',label:'Original NES Forge game',title:'NES Forge',nativeWorld:false,locationFields:false,
  preservationOnly:false,buildSceneSet,scope:'Generated '+(backend==='world'?'World runtime':backend==='single-room'?'single-room runtime':backend==='unpacked-custom'?'custom assembly with active CHR':'Scene viewer / custom assembly')+'; existing compiler checks apply.',writers:[]};
 if(!native){
  if(project.investigation){result.kind='inspection';result.label='Investigated source · authored output';}
 }else{
  result.kind='native';
  const cap=services.NativeEngineProject.capabilities(native.profile);
  result.nativeWorld=!!cap.terrain;result.locationFields=!!cap.locationFields;
  result.scope=cap.buildScope;
  if(services.NativeResourceProject.matches(project)){
   const adapter=window.NativePRGResources.profiles.find(a=>a.id===native.adapter);
   result.title=titleByKind[adapter?.kind]||'Native resources';
   result.writers=[{id:'native-resource-blocks',title:'Native source pages',route:'library',
    scope:'Use native block controls for available recovered pages. Only verified source substitutions within the original record capacity rebuild.'},
    ...services.NativeResourceProject.writerCapabilities(project)];
   result.scope=result.writers.map(w=>w.title+': '+w.scope).join(' ');
  }else if(services.NativeLayoutProject.matches(project)){
   result.title='Native screen layout';
   result.writers=[{id:'native-layout-blocks',title:'Area 1 native screen blocks',route:'project-library',scope:cap.buildScope}];
  }else if(cap.terrain){
   result.title='Zelda II';result.writers=[{id:'z2-terrain',title:'Native overworld terrain',route:'native-world',scope:cap.buildScope},
    {id:'native-location-fields',title:'Native location fields',route:'native-locations',scope:'Location X/Y, scene selector and entry code only.'}];
  }else if(cap.locationFields){
   result.title='Zelda II';result.writers=[{id:'native-location-fields',title:'Native location fields',route:'native-locations',scope:cap.buildScope}];
  }else{
   result.kind='inspection';result.preservationOnly=true;result.title='Preserved ROM';
  }
  result.label=result.preservationOnly?'Preserved ROM · unchanged output':result.title+' · bounded native editing';
 }
 result.buildSceneSetReason=buildSceneSet?'Select and order up to seven Scenes for this generated build.':native?
  'Native output uses its verified source bindings and writers. Scene inclusion and order do not select native content.':backend==='world'?
  'World output follows saved World and player dependencies. Scene inclusion and order are not used.':
  'Unpacked custom assembly uses the active CHR buffers. Scene inclusion and order are not used.';
 return result;
}
services.ProjectCapabilities=Object.freeze({describe});
})();
