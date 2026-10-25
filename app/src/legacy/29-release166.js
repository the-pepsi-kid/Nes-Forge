/* NES Forge 1.6.6 — visual authoring in the existing workspace. */
(()=>{
  'use strict';
  const F=window.Forge166;
  F.version='1.6.6';
  if(window.Forge15)Forge15.version='1.6.6';
  if(window.Forge16)Forge16.version='1.6.6';
  const priorProjectData=projectData;
  projectData=function(){const data=priorProjectData();data.foundation='1.6.6';return data;};
  const priorDocs=renderDocs;
  renderDocs=function(){
    priorDocs();
    const doc=document.querySelector('#sideDocs .doc');if(!doc)return;
    const section=document.createElement('section');
    section.innerHTML='<h2>1.6.6 — Visual Workspace</h2><p>Author in the existing CHR SHEET, SCENE, METASPRITES, ANIM and ENTITY STUDIO tabs. New Project creates a blank fixed room. Gameplay Settings opens the settings in the SCENE sidebar. Build &amp; Run builds the current project; it does not change the project into an example.</p><p>Draw background and character art in CHR SHEET, paint the room in SCENE, and mark floor tiles Solid in COLLISION. Compose character parts in METASPRITES, with the origin at the feet. Add animation frames and contact boxes in ANIM. Place a player and bind idle, walk and a nonlooping attack in ENTITY STUDIO; jump is optional. A stationary target uses its default state and optional nonlooping hurt. Gameplay settings select the room, player, optional target, and movement/body values.</p><p>The scene canvas displays bound character art, facing, selection bounds and the selected player\u2019s movement body/feet. These are the same scene entities and animation assets that the builder uses. No assembly or hand-edited JSON is required.</p><p>To examine the included Scout example, use the ordinary Open Project control and select its project file from the release package. Every part remains editable through the regular tabs. Open Forge ROM restores a supported Forge playable ROM into a clean project, so editing and rebuilding do not accumulate duplicate rooms or assets. New Project and Open Forge ROM ask before replacing the current workspace; Undo restores its contents.</p><p>The generated runtime supports one fixed room, Empty/Solid collision, one moving/jumping player and an optional stationary training target. Other ROMs use the existing import/capture and optional disassembly tools; arbitrary game logic is not automatically recovered as visual systems. Project schema remains v8 and generated ROM formats are unchanged. Browser layout/native input and independent hardware verification remain separate from the automated control-handler and bundled-emulator checks.</p>';
    doc.prepend(section);
  };
  document.title='NES Forge 1.6.6 — Visual Workspace';
  document.querySelector('h1').innerHTML='NES FORGE <small style="color:var(--grn)">1.6.6 VISUAL WORKSPACE</small>';
})();

