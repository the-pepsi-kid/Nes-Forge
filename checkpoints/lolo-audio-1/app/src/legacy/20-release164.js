/* NES Forge 1.6.4 — release identity and in-app guide. */
(()=>{
'use strict';
Forge164.version='1.6.4';
if(window.Forge15)Forge15.version='1.6.4';
if(window.Forge16)Forge16.version='1.6.4';
const previousDocs=renderDocs;
renderDocs=function(){
  previousDocs();const doc=document.querySelector('#sideDocs .doc');if(!doc)return;
  const section=document.createElement('section');
  section.innerHTML='<h2>1.6.4 — Animation + Entity Binding</h2><p>ENTITY STUDIO assigns named animation states to a scene entity. Select a scene and entity, or place one from the studio. Assign idle, walk, attack, hurt, or your own state names; choose a default state and facing. Play at 60 ticks per second, step one tick, or scrub to a frame. The facing preview mirrors the art and its contact areas around the entity origin. Changing preview state or facing does not change the saved default.</p><p>In ANIMATION, select a frame to draw, move, resize, or numerically edit red hitboxes and green hurtboxes. Coordinates are relative to the frame origin. Add ordered attack_start, attack_end, footstep, sound, or custom events. An event is logged once on each frame entry during Entity Studio playback, including each loop. Scrubbing inspects a pose without dispatching its events.</p><p>Project schema v7, portable ZIP, and packed-ROM MS16 v2 metadata preserve bindings, per-frame boxes, and event markers. Legacy projects and MS16 v1 ROMs remain readable. A packed build rejects missing animation references or exhausted metadata capacity. These are authoring and preview features: generated ROMs still run the scene viewer, and do not execute entity state changes, collisions, attacks, or sound events.</p>';
  doc.prepend(section);
};
document.title='NES Forge 1.6.4 — Animation + Entity Binding';
document.querySelector('h1').innerHTML='NES FORGE <small style="color:var(--grn)">1.6.4 ANIMATION + ENTITY BINDING</small>';
})();


