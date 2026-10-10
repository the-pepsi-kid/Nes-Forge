/* 1.6.2.1 stabilization release identity and documentation. */
(()=>{
for(const api of [window.Forge15,window.Forge16,window.Forge161,window.Forge162])if(api)api.version='1.6.2.1';
Forge161.worldExtension=Forge162.worldExtension=3;
const previousProjectData=projectData;projectData=function(){const d=previousProjectData();d.foundation='1.6.2.1';return d};
const previousDocs=renderDocs;renderDocs=function(){previousDocs();const doc=document.querySelector('#sideDocs .doc');if(!doc)return;const section=document.createElement('section');section.innerHTML='<h2>1.6.2.1 Stabilization</h2><p>ROM metadata allocation now advances when code occupies a candidate address and fails clearly when no contiguous space fits. WR16 v3 preserves world, room, marker and camera identities, including cross-world destinations. Import validates record boundaries, counts, coordinates, UTF-8 and references before changing the project.</p><p>WR16 v1/v2 maps remain readable. Those older formats omitted world and marker identities, so existing destination links cannot be reliably reconstructed; the importer retains the references and asks you to re-select destinations. Generated world streaming remains a later milestone. Project schema remains v5.</p>';doc.prepend(section)};
document.querySelector('h1').innerHTML='NES FORGE <small style="color:var(--grn)">1.6.2.1 STABILIZED</small>';document.title='NES Forge 1.6.2.1 — Stabilized';
})();

