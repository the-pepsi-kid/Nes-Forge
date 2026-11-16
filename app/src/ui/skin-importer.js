/* NES Forge skin import/export — appearance only; schema 1.
 * No custom JS/CSS, network, external fonts, ROM/project writes, or HTML injection.
 * Keeps existing Retro Workstation as the verified default and uses its UI density.
 */
(()=>{
 'use strict';
 const format='nesforge.skin', version=1, storePrefix='nesforge.skins.v1.';
 const colorKeys=['background','top','topEnd','panel','panelRaised','border','borderStrong',
   'text','muted','accent','accentText','active','activeBorder','success','warning',
   'danger','button','buttonHover','input','selected','header','headerText','canvasBackdrop'];
 const optional=new Set(['author','description']);
 const allowed=new Set(['format','version','id','name','density','colors',...optional]);
 const color=/^#[0-9a-fA-F]{6}$/;
 const validId=/^[a-z][a-z0-9-]{2,47}$/;
 const MAX_TEXT=16000,MAX_SKINS=8;
 const storage=(key,value)=>{try{if(value===undefined)return localStorage.getItem(storePrefix+key);localStorage.setItem(storePrefix+key,value);return true;}catch(_){return false;}};
 function validate(input){
   if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Skin must be a JSON object.');
   for(const key of Object.keys(input))if(!allowed.has(key))throw Error('Unsupported skin field: '+key);
   if(input.format!==format||input.version!==version)throw Error('Unsupported skin format or version (expected nesforge.skin v1).');
   if(typeof input.id!=='string'||!validId.test(input.id)||['original','retro-workstation','builtin'].includes(input.id))throw Error('Invalid or reserved skin ID.');
   if(typeof input.name!=='string'||input.name.trim().length<2||input.name.length>64)throw Error('Skin name must be 2–64 characters.');
   if(!['compact','comfortable'].includes(input.density))throw Error('Skin density must be compact or comfortable.');
   for(const key of optional)if(input[key]!==undefined&&(typeof input[key]!=='string'||input[key].length>(key==='description'?350:80)))throw Error('Invalid '+key+' metadata.');
   if(!input.colors||typeof input.colors!=='object'||Array.isArray(input.colors))throw Error('Skin needs a colors object.');
   const actual=Object.keys(input.colors);
   if(actual.length!==colorKeys.length||actual.some(key=>!colorKeys.includes(key)))throw Error('Skin must specify exactly the 23 documented color tokens.');
   for(const key of colorKeys)if(typeof input.colors[key]!=='string'||!color.test(input.colors[key]))throw Error('Invalid hexadecimal color: '+key);
   const safe={format,version,id:input.id,name:input.name.trim(),density:input.density,
     colors:Object.fromEntries(colorKeys.map(key=>[key,input.colors[key].toUpperCase()]))};
   for(const key of optional)if(input[key]!==undefined)safe[key]=input[key];
   if(JSON.stringify(safe).length>MAX_TEXT)throw Error('Skin exceeds the supported size.');
   return safe;
 }
 function cssFor(skin){
   const c=skin.colors,root='body.nf-retro.nf-external-skin',out=[];
   // Every selector is authored here. Imported strings only ever become validated #RRGGBB tokens.
   function rule(selectors,decl){
     out.push(selectors.split(',').map(s=>root+(s.trim()?' '+s.trim():'')).join(',')+'{'+decl+'}');
   }
   rule('',`--bg:${c.background};--bg2:${c.panel};--bg3:${c.panelRaised};--bdr:${c.border};--bdr2:${c.borderStrong};--txt:${c.text};--dim:${c.muted};--acc:${c.accent};--acc2:${c.activeBorder};--grn:${c.success};--red:${c.danger};--ylw:${c.warning};--orn:${c.warning};background:${c.background}!important;color:${c.text}!important;scrollbar-color:${c.borderStrong} ${c.background}`);
   rule('.top',`background:linear-gradient(180deg,${c.top},${c.topEnd})!important;border-color:${c.borderStrong}!important;box-shadow:0 2px 10px #0002!important`);
   rule('.top h1',`color:${c.accent}!important;text-shadow:none!important`);
   rule('.top h1 small',`color:${c.success}!important`);
   rule('.tabs',`background:${c.panel}!important;border-color:${c.border}!important`);
   rule('.tab',`color:${c.muted}!important;background:${c.panel}!important`);
   rule('.tab:hover',`background:${c.buttonHover}!important;color:${c.text}!important;border-color:${c.borderStrong}!important`);
   rule('.tab.on',`background:${c.active}!important;color:${c.headerText}!important;border-color:${c.activeBorder}!important;box-shadow:inset 0 2px ${c.accent}!important`);
   rule('.main, .left-panel',`background:${c.background}!important`);
   rule('.right-panel, .disasm-side',`background:${c.panel}!important;border-color:${c.borderStrong}!important`);
   rule('#rightP h2',`background:${c.header}!important;color:${c.headerText}!important;border-color:${c.borderStrong}!important;border-left-color:${c.accent}!important`);
   rule('#rightP h3',`color:${c.accent}!important`);
   rule('#rightP p, .repair-note',`color:${c.muted}!important`);
   rule('.st, .spr-slot, .ent-slot, .inst-slot, .anim-slot, .project-item, .sym-row, .order-row',`border-color:${c.border}!important`);
   rule('.st .v, .sym-row .sym-addr',`color:${c.success}!important`);
   rule('.bar',`background:${c.panel}!important;border-color:${c.borderStrong}!important;color:${c.muted}!important`);
   rule('.bar span',`color:${c.accent}!important`);
   rule('.scene-ctl, .project-bar, .code-toolbar, .tracker-toolbar, .emu-toolbar',`background:${c.panel}!important;border-color:${c.border}!important`);
   rule('.scene-ctl select, .project-bar span',`color:${c.accent}!important`);
   rule('.ctl label, .scene-props label, .spr-props label, .ent-props label',`color:${c.muted}!important`);
   rule('.ctl button, .ctl select, .scene-ctl button, .scene-ctl select, .project-bar button, .code-toolbar button, .tracker-toolbar button, .emu-btn, .top > button, #areaLibrary button, #nativeWorldOpen, #areaLibraryOpen',`background:${c.button}!important;color:${c.text}!important;border-color:${c.borderStrong}!important`);
   rule('.ctl button:hover, .scene-ctl button:hover, .project-bar button:hover, .code-toolbar button:hover, .tracker-toolbar button:hover, .emu-btn:hover, .top > button:hover, #areaLibrary button:hover, #nativeWorldOpen:hover, #areaLibraryOpen:hover',`background:${c.buttonHover}!important;color:${c.text}!important`);
   rule('.ctl .upload-btn, .emu-btn.run',`background:${c.selected}!important;color:${c.success}!important;border-color:${c.success}!important`);
   rule('.ctl .export-btn, #nativeWorldOpen, .scene-ctl .sc-add',`background:${c.active}!important;color:${c.headerText}!important;border-color:${c.activeBorder}!important`);
   rule('.scene-props input, .scene-props select, .spr-props input, .spr-props select, .ent-props input, .ent-props select, .rom-cfg input, .rom-cfg select, .col-props select, .code-toolbar select, .tracker-toolbar select',`background:${c.input}!important;color:${c.text}!important;border-color:${c.borderStrong}!important`);
   rule('.scene-thumb, .project-item',`background:${c.panel}!important;border-color:${c.border}!important`);
   rule('.scene-thumb:hover, .spr-slot:hover, .ent-slot:hover, .inst-slot:hover, .anim-slot:hover',`background:${c.buttonHover}!important`);
   rule('.scene-thumb.active, .spr-slot.sel, .ent-slot.sel, .inst-slot.sel, .anim-slot.sel, .order-row.sel',`background:${c.selected}!important;border-color:${c.activeBorder}!important;color:${c.text}!important`);
   rule('.scene-thumb .st-name',`color:${c.text}!important`);
   rule('.code-lines, .code-highlight, .disasm-code, .hex-dump, .build-log, .emu-log',`background:${c.canvasBackdrop}!important;border-color:${c.border}!important`);
   rule('.doc h2, .doc th',`color:${c.accent}!important;border-color:${c.border}!important`);
   rule('.doc th',`background:${c.header}!important;color:${c.headerText}!important`);
   rule('.doc p, .doc td',`color:${c.text}!important`);
   rule('.project-modal-inner, .nes-picker, #tileEditor, #areaLibrary, #nativeWorldDialog',`background:${c.panel}!important;color:${c.text}!important;border-color:${c.borderStrong}!important`);
   rule('.autosave-banner',`background:${c.selected}!important;color:${c.text}!important;border-color:${c.success}!important`);
   rule('#fcw-ribbon, #fcw-dialog, #frx-app',`background:${c.panel}!important;color:${c.text}!important;border-color:${c.borderStrong}!important`);
   rule('#fcw-ribbon strong, #fcw-location, #fcw-ribbon .fcw-label',`color:${c.text}!important`);
   rule('#fcw-status',`background:${c.selected}!important;color:${c.text}!important`);
   rule('#nativeWorldScopeHint',`color:${c.muted}!important`);
   rule('#sceneResourcesSummary, #sceneResourcesSummary *',`color:${c.muted}!important`);
   rule('#fcw-ribbon button, #fcw-dialog button, #frx-app button, #frx-app select, #frx-app input',`background:${c.button}!important;color:${c.text}!important;border-color:${c.borderStrong}!important`);
   rule('.fcw-header, .frx-bar',`background:${c.header}!important;color:${c.headerText}!important`);
   rule('.fcw-card',`background:${c.panelRaised}!important;color:${c.text}!important;border-color:${c.border}!important`);
   rule('#nf-skin-controls',`background:${c.panel}!important;border-color:${c.borderStrong}!important;color:${c.text}!important`);
   rule('#nf-skin-toggle, #nf-skin-select, #nf-skin-import, #nf-skin-export, #nf-density',`background:${c.button}!important;color:${c.text}!important;border:1px solid ${c.borderStrong}!important`);
   rule('#nf-skin-toggle[aria-pressed=true]',`background:${c.active}!important;color:${c.headerText}!important;border-color:${c.activeBorder}!important`);
   rule('button:focus-visible, select:focus-visible, input:focus-visible, textarea:focus-visible, canvas:focus-visible',`outline:2px solid ${c.accent}!important`);
   // NES graphics canvases are intentionally not recolored, resized, or filtered.
   return out.join('\n');
 }
 const controls=document.getElementById('nf-skin-controls'),toggle=document.getElementById('nf-skin-toggle'),density=document.getElementById('nf-density');
 if(!controls||!toggle||!density)return;
 const selector=document.createElement('select');selector.id='nf-skin-select';selector.setAttribute('aria-label','Selected appearance');
 const importButton=document.createElement('button');importButton.id='nf-skin-import';importButton.type='button';importButton.textContent='Import Skin';
 const exportButton=document.createElement('button');exportButton.id='nf-skin-export';exportButton.type='button';exportButton.textContent='Export Skin';exportButton.title='Export the selected imported skin as a portable .nfskin.json file';
 const input=document.createElement('input');input.type='file';input.id='nf-skin-file';input.accept='.nfskin.json,.json,application/json';input.hidden=true;
 const result=document.createElement('span');result.id='nf-skin-message';result.setAttribute('role','status');result.setAttribute('aria-live','polite');result.hidden=true;
 result.style.cssText='font:10px/1.3 monospace;max-width:180px;white-space:normal';
 const modalCSS=document.createElement('style');modalCSS.id='nf-skin-importer-ui';
 modalCSS.textContent=`#nf-skin-controls{flex-wrap:wrap;white-space:normal}#nf-skin-select,#nf-skin-import,#nf-skin-export{border:1px solid #456077;border-radius:3px;background:#213648;color:#d2e9f2;min-height:27px;padding:4px 6px;font:600 10px 'Courier New',monospace;cursor:pointer}#nf-skin-select{max-width:220px}#nf-skin-export:disabled{opacity:.5;cursor:default}#nf-skin-message{color:var(--grn)}#nf-skin-message[data-error=true]{color:var(--red)}`;
 document.head.append(modalCSS);
 const themeStyle=document.createElement('style');themeStyle.id='nf-external-skin-css';document.head.append(themeStyle);
 const installed=new Map();
 try{
   const saved=JSON.parse(storage('catalog')||'[]');
   if(Array.isArray(saved))for(const entry of saved.slice(0,MAX_SKINS))try{const safe=validate(entry);installed.set(safe.id,safe);}catch(_){}
 }catch(_){}
 let selected='original';let suppress=false;
 const options=()=>{
   selector.replaceChildren();
   for(const [id,label] of [['original','Original NES Forge'],['retro-workstation','Retro Workstation'],...Array.from(installed.values(),skin=>[skin.id,skin.name])]){
     const item=document.createElement('option');item.value=id;item.textContent=label;selector.append(item);
   }
 };
 function tell(msg,error=false){result.hidden=false;result.textContent=msg;result.dataset.error=String(error);}
 function apply(id,remember=true){
   if(id!=='original'&&id!=='retro-workstation'&&!installed.has(id))throw Error('Skin is not installed.');
   selected=id;
   const wanted=id!=='original',current=toggle.getAttribute('aria-pressed')==='true';
   suppress=true;
   try{if(current!==wanted)toggle.click();}finally{suppress=false;}
   const skin=installed.get(id);
   document.body.classList.toggle('nf-external-skin',!!skin);
   themeStyle.textContent=skin?cssFor(skin):'';
   if(skin){density.value=skin.density;density.dispatchEvent(new Event('change',{bubbles:true}));toggle.textContent='✓ Skin Active';toggle.title='Turn off the selected skin and return to Original NES Forge';}else{toggle.textContent=wanted?'✓ Retro Workstation':'Retro Workstation';toggle.title='Toggle the built-in Retro Workstation appearance';}
   selector.value=id;
   exportButton.disabled=!skin;
   if(remember)storage('active',id);
   return id;
 }
 function importSkin(source){
   const raw=typeof source==='string'?source:JSON.stringify(source);
   if(raw.length>MAX_TEXT)throw Error('Skin file is too large.');
   const skin=validate(typeof source==='string'?JSON.parse(source):source);
   if(!installed.has(skin.id)&&installed.size>=MAX_SKINS)throw Error('Maximum of 8 imported skins reached.');
   installed.set(skin.id,skin);
   storage('catalog',JSON.stringify([...installed.values()]));
   options();apply(skin.id);tell('Imported '+skin.name);return skin;
 }
 function exportSkin(){
   const skin=installed.get(selected);if(!skin)throw Error('Select an imported skin to export.');
   const content=JSON.stringify(skin,null,2)+'\n',blob=new Blob([content],{type:'application/json'}),url=URL.createObjectURL(blob);
   const anchor=document.createElement('a');anchor.href=url;anchor.download='NES_Forge_'+skin.id+'.nfskin.json';
   document.body.append(anchor);try{anchor.click();}finally{anchor.remove();URL.revokeObjectURL(url);}
   tell('Exported '+skin.name);return content;
 }
 options();
 const stored=storage('active');
 try{apply(stored&&[...installed.keys(),'original','retro-workstation'].includes(stored)?stored:(toggle.getAttribute('aria-pressed')==='true'?'retro-workstation':'original'),false);}catch(_){apply('original',false);}
 selector.addEventListener('change',()=>{try{apply(selector.value);tell('Appearance: '+selector.options[selector.selectedIndex].textContent);}catch(e){tell(e.message,true);}});
 toggle.addEventListener('click',()=>{if(suppress)return;selected=toggle.getAttribute('aria-pressed')==='true'?'retro-workstation':'original';document.body.classList.remove('nf-external-skin');themeStyle.textContent='';selector.value=selected;exportButton.disabled=true;storage('active',selected);});
 importButton.addEventListener('click',()=>input.click());
 input.addEventListener('change',async()=>{
   const file=input.files?.[0];if(!file)return;
   try{if(file.size>MAX_TEXT)throw Error('Skin file exceeds 16 KB.');await importSkin(await file.text());}
   catch(e){tell('Import rejected: '+(e.message||String(e)),true);}finally{input.value='';}
 });
 exportButton.addEventListener('click',()=>{try{exportSkin();}catch(e){tell(e.message,true);}});
 controls.append(selector,importButton,exportButton,input,result);
 // Public API for tests/extensions; cannot mutate imported project state.
 window.NFSkinManager=Object.freeze({validate,importSkin,apply,exportSkin,
   status:()=>Object.freeze({selected,installed:[...installed.keys()],density:density.value,enabled:toggle.getAttribute('aria-pressed')==='true'})});
})();
