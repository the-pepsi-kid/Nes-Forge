/* NES Forge Retro Workstation display preferences.
 * This module toggles body CSS classes only. It does not read or modify ProjectStore,
 * AssetRegistry, Scene, any emulator, native source, or build state.
 */
(()=>{
  'use strict';
  const controls=document.createElement('div');
  controls.id='nf-skin-controls';
  controls.setAttribute('aria-label','Appearance');
  controls.title='Visual-only theme. Editor resources and builds are not modified.';
  const toggle=document.createElement('button');
  toggle.id='nf-skin-toggle';toggle.type='button';
  toggle.textContent='Retro Workstation';
  toggle.setAttribute('aria-pressed','false');
  toggle.title='Turn on/off the optional Retro Workstation skin';
  const density=document.createElement('select');
  density.id='nf-density';density.setAttribute('aria-label','Workspace density');
  for(const [value,title] of [['compact','Compact'],['comfortable','Comfortable']]){
    const option=document.createElement('option');option.value=value;option.textContent=title;density.append(option);
  }
  const store=(key,value)=>{try{localStorage.setItem('nesforge.appearance.'+key,value);}catch(_){}};
  const restore=(key,defaultValue)=>{try{return localStorage.getItem('nesforge.appearance.'+key)||defaultValue;}catch(_){return defaultValue;}};
  let enabled=restore('skin','off')==='on';
  let mode=restore('density','compact')==='comfortable'?'comfortable':'compact';
  function apply(){
    document.body.classList.toggle('nf-retro',enabled);
    document.body.classList.toggle('nf-comfort',mode==='comfortable');
    toggle.setAttribute('aria-pressed',String(enabled));
    toggle.textContent=enabled?'✓ Retro Workstation':'Retro Workstation';
    density.disabled=!enabled;density.value=mode;
  }
  toggle.addEventListener('click',()=>{enabled=!enabled;store('skin',enabled?'on':'off');apply();});
  density.addEventListener('change',()=>{mode=density.value==='comfortable'?'comfortable':'compact';store('density',mode);apply();});
  controls.append(toggle,density);
  const tool=document.querySelector('.top .ctl');
  if(tool){tool.prepend(controls);}else{document.querySelector('.top')?.append(controls);}
  apply();
  window.NFWorkstationAppearance=Object.freeze({status:()=>({enabled,density:mode})});
})();
