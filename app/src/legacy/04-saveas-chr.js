/* NES Forge 1.4.4 — Save-context-safe Save As and a shared, scene-aware CHR preview.
 * Editor/export UI only. The CPU, PPU, audio, scheduler, native capture,
 * binary encoders and static-conversion validation are unchanged.
 */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const hex=n=>'$'+Number(n).toString(16).toUpperCase().padStart(2,'0');
const style=document.createElement('style');
style.textContent=`
#forgeSaveDialog{position:fixed;inset:0;margin:auto;width:min(520px,94vw);max-height:90vh;overflow:auto;background:var(--bg2);color:var(--txt);border:2px solid var(--acc2);padding:20px;font:12px/1.55 'Courier New',monospace;box-shadow:0 12px 50px #000a}
#forgeSaveDialog::backdrop{background:#000b}
#forgeSaveDialog h2{font-size:16px;color:var(--acc);margin-bottom:12px}
#forgeSaveDialog label{display:block;color:var(--dim);margin-top:10px}
#forgeSaveDialog input{width:100%;background:var(--bg);color:var(--txt);border:1px solid var(--bdr2);padding:8px;font:12px monospace}
#forgeSaveDialog p{margin:10px 0;overflow-wrap:anywhere}
#forgeSaveDialog .save-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}
#forgeSaveDialog button{background:var(--bg3);color:var(--txt);border:1px solid var(--bdr2);padding:8px;font:11px monospace;cursor:pointer}
#forgeSaveDialog #forgeSaveChoose{background:#142e24;border-color:#387855;color:var(--grn)}
#forgeSaveDialog button:disabled{opacity:.5;cursor:default}
#forgeSaveDialog .save-help{font-size:10px;color:var(--dim)}
#forgeSaveStatus{max-width:340px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--acc);cursor:default}
#chrPreviewControls{padding:7px;border:1px solid var(--bdr2);margin:6px 0;font-size:9px;line-height:1.5}
#chrPreviewControls label{display:block;margin:3px 0;color:var(--dim)}
#chrPreviewControls select{width:100%;background:var(--bg3);color:var(--acc);border:1px solid var(--bdr);font:10px monospace;padding:3px}
#chrPreviewInfo{margin:4px 0;color:var(--grn);overflow-wrap:anywhere}
#chrPreviewHint{color:var(--dim);font-size:8px}
#chrEditCanvas{width:128px;height:128px;flex:0 0 128px}
#sideChr .pr .pl{width:36px;flex:0 0 36px}
#sideChr #pixColorSel{gap:3px;flex-wrap:wrap}
#sideChr #pixColorSel button{padding:0}
#sideChr .pal-edit:disabled{opacity:.35;cursor:default}
#chrPalEditor .pr.active{background:#172739;outline:1px solid var(--acc2)}
`;
document.head.appendChild(style);

// One save request at a time; native-dialog cancellation is NEVER a download.
const dialog=document.createElement('dialog');dialog.id='forgeSaveDialog';
dialog.setAttribute('aria-labelledby','forgeSaveTitle');
dialog.innerHTML=`<h2 id="forgeSaveTitle">Save As</h2>
<label for="forgeSaveName">File name</label><input id="forgeSaveName" autocomplete="off" spellcheck="false">
<p id="forgeSaveSize"></p><p id="forgeSaveMessage" role="status" aria-live="polite"></p>
<div class="save-actions"><button id="forgeSaveChoose" type="button">Choose location &amp; save…</button><button id="forgeSaveBrowser" type="button">Use browser download</button><button id="forgeSaveCancel" type="button">Cancel</button></div>
<p class="save-help">Browser download uses your browser’s download settings; this app cannot see that folder. In Edge/Chrome, enable “Ask where to save each file” in Settings → Downloads. Embedded previews cannot invoke the picker directly; NES Forge will open a top-level helper window instead. If the host blocks pop-ups too, open the HTML directly in the browser.</p>`;
document.body.appendChild(dialog);
const status=document.createElement('div');status.id='forgeSaveStatus';status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.textContent='';document.querySelector('.bar').prepend(status);
let pending=null;
function cleanName(name){return String(name||'export.bin').replace(/[<>:"/\\|?*\x00-\x1f\x7f]/g,'_').replace(/[. ]+$/,'').trim().slice(0,180)||'export.bin';}
function setSaveStatus(message){status.textContent=message;status.title=message;}
function isTopLevel(){try{return window.top===window.self;}catch(_){return false;}}
function canChooseNative(){return isTopLevel()&&window.isSecureContext&&typeof window.showSaveFilePicker==='function';}
function canLaunchSaveHelper(){return !isTopLevel()&&typeof window.open==='function';}
function canChoose(){return canChooseNative()||canLaunchSaveHelper();}
function pickerOptions(name){
  const ext=(name.match(/\.[A-Za-z0-9]+$/)||['.bin'])[0].toLowerCase();
  const type=ext==='.zip'?'application/zip':ext==='.json'?'application/json':ext==='.asm'?'text/plain':'application/octet-stream';
  return {id:'nesforge-'+ext.slice(1),suggestedName:name,types:[{description:ext==='.zip'?'NES Forge project and assets':ext==='.json'?'NES Forge project':ext==='.nes'?'NES ROM':ext==='.asm'?'6502 assembly':'Exported file',accept:{[type]:[ext]}}]};
}
function saveBusy(value){
  if(pending)pending.busy=value;
  $('forgeSaveName').disabled=value;$('forgeSaveChoose').disabled=value||!canChoose();$('forgeSaveBrowser').disabled=value;$('forgeSaveCancel').disabled=value;
}
function finishSave(outcome){
  const job=pending;if(!job)return outcome;
  pending=null;window.forgeSave.lastResult=outcome;
  if(dialog.open)dialog.close();else dialog.removeAttribute('open');
  const message=outcome.status==='saved'?'Saved: '+outcome.name+' — in the location you selected':outcome.status==='download-requested'?'Download requested: '+outcome.name+' — check your browser’s Downloads':outcome.status==='cancelled'?'Save cancelled — no download requested':'Save failed: '+outcome.name;
  setSaveStatus(message);showToast(message);job.resolve(outcome);return outcome;
}
let saveHelper=null,saveHelperPoll=null;
function clearSaveHelper(closeIt=false){
  if(saveHelperPoll){clearInterval(saveHelperPoll);saveHelperPoll=null;}
  if(closeIt&&saveHelper&&!saveHelper.closed)try{saveHelper.close();}catch(_){}
  saveHelper=null;
}
function saveHelperHtml(){return `<!doctype html><html><head><meta charset="utf-8"><title>NES Forge — Save As</title><style>
:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#0c0c10;color:#b8b8c8;font:13px/1.55 'Courier New',monospace;min-height:100vh;display:grid;place-items:center}.box{width:min(560px,92vw);background:#101018;border:2px solid #3a9abf;padding:22px;box-shadow:0 14px 50px #0009}h1{font-size:17px;color:#5ad4ff;margin:0 0 12px}p{overflow-wrap:anywhere}.name{color:#8df57a;font-weight:bold}.actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:16px}button{background:#16161e;color:#b8b8c8;border:1px solid #3a3a4a;padding:9px 12px;font:12px 'Courier New',monospace;cursor:pointer}#save{background:#142e24;border-color:#387855;color:#8df57a}button:disabled{opacity:.5;cursor:default}.small{font-size:10px;color:#778}#msg{min-height:42px;color:#f5d07a}</style></head><body><div class="box"><h1>NES Forge — Save As</h1><p>This top-level helper exists because browsers block the system file picker inside embedded frames.</p><p>File: <span class="name" id="name"></span></p><p id="msg">Click below to open the real system Save As window.</p><div class="actions"><button id="save">Choose location &amp; save…</button><button id="cancel">Cancel</button></div><p class="small">Nothing is downloaded automatically. Closing this window cancels the helper.</p></div></body></html>`;}
function openSaveHelper(){
  const job=pending;if(!job||job.busy)return;
  const name=cleanName($('forgeSaveName').value);$('forgeSaveName').value=name;
  let pop=null;
  try{pop=window.open('about:blank','nesforge_save_'+Date.now(),'popup=yes,width=640,height=480,resizable=yes,scrollbars=yes');}catch(error){window.forgeSave.lastError={name:error?.name||'Error',message:error?.message||String(error)};}
  if(!pop){$('forgeSaveMessage').textContent='This embedded preview blocked the Save As helper window. No file was saved or downloaded. Allow pop-ups for this preview, open the HTML directly in Edge/Chrome, or use browser download.';setSaveStatus('Save As helper blocked: '+name);return;}
  saveHelper=pop;
  try{
    pop.document.open();pop.document.write(saveHelperHtml());pop.document.close();
    pop.__NES_FORGE_SAVE_PAYLOAD={blob:job.blob,name,options:pickerOptions(name)};
    pop.document.getElementById('name').textContent=name+' · '+job.blob.size.toLocaleString()+' bytes';
    pop.document.getElementById('save').onclick=async function(){
      const btn=pop.document.getElementById('save'),cancel=pop.document.getElementById('cancel'),msg=pop.document.getElementById('msg'),p=pop.__NES_FORGE_SAVE_PAYLOAD;
      btn.disabled=true;cancel.disabled=true;
      if(!pop.isSecureContext||typeof pop.showSaveFilePicker!=='function'){
        msg.textContent='The system picker is unavailable in this helper context. Open the NES Forge HTML directly in Edge/Chrome, or return and use browser download.';
        btn.disabled=false;cancel.disabled=false;
        try{if(pop.opener)pop.opener.postMessage({type:'nesforge-save-helper',status:'error',name:p.name,errorName:'NotSupportedError',message:'showSaveFilePicker unavailable in top-level helper'},'*');}catch(_){}
        return;
      }
      let stream=null,selected=false;
      try{
        msg.textContent='Opening system Save As…';
        const handle=await pop.showSaveFilePicker(p.options);selected=true;
        msg.textContent='Writing '+(handle.name||p.name)+'…';
        stream=await handle.createWritable();await stream.write(p.blob);await stream.close();stream=null;
        if(pop.opener)pop.opener.postMessage({type:'nesforge-save-helper',status:'saved',name:handle.name||p.name,bytes:p.blob.size},'*');
        msg.textContent='Saved. You may close this window.';setTimeout(()=>{try{pop.close();}catch(_){}},350);
      }catch(error){
        if(stream)try{await stream.abort();}catch(_){}
        if(!selected&&error?.name==='AbortError'){
          if(pop.opener)pop.opener.postMessage({type:'nesforge-save-helper',status:'cancelled',name:p.name},'*');
          try{pop.close();}catch(_){};return;
        }
        msg.textContent='Save failed: '+(error?.message||String(error));
        btn.disabled=false;cancel.disabled=false;
        if(pop.opener)pop.opener.postMessage({type:'nesforge-save-helper',status:'error',name:p.name,errorName:error?.name||'Error',message:error?.message||String(error)},'*');
      }
    };
    pop.document.getElementById('cancel').onclick=function(){const p=pop.__NES_FORGE_SAVE_PAYLOAD;if(pop.opener)pop.opener.postMessage({type:'nesforge-save-helper',status:'cancelled',name:p?.name||name},'*');try{pop.close();}catch(_){}};
  }catch(error){
    try{pop.close();}catch(_){};clearSaveHelper(false);
    $('forgeSaveMessage').textContent='Could not create the Save As helper: '+(error?.message||String(error))+'. No file was saved or downloaded.';setSaveStatus('Save As helper failed: '+name);return;
  }
  saveBusy(true);setSaveStatus('Save As helper opened: '+name);$('forgeSaveMessage').textContent='A top-level Save As helper window opened. Click “Choose location & save…” there to open the system file picker.';
  saveHelperPoll=setInterval(()=>{
    if(!pending){clearSaveHelper(false);return;}
    if(!saveHelper||saveHelper.closed){clearSaveHelper(false);if(pending){saveBusy(false);$('forgeSaveMessage').textContent='Save As helper closed. Nothing was saved or downloaded. Retry, use browser download, or cancel.';setSaveStatus('Not saved: '+name);}}
  },300);
}
window.addEventListener('message',e=>{
  if(!saveHelper||e.source!==saveHelper||!e.data||e.data.type!=='nesforge-save-helper')return;
  const d=e.data,name=cleanName(d.name||$('forgeSaveName').value);
  if(d.status==='saved'){clearSaveHelper(false);finishSave({status:'saved',method:'top-level-save-helper',name,bytes:d.bytes||pending?.blob?.size||0});}
  else if(d.status==='cancelled'){clearSaveHelper(false);finishSave({status:'cancelled',method:'top-level-save-helper',name});}
  else if(d.status==='error'){clearSaveHelper(false);if(pending){saveBusy(false);$('forgeSaveMessage').textContent='The Save As helper could not use the system picker: '+(d.message||'Unknown error')+'. No fallback download was started. Retry, use browser download, or cancel.';setSaveStatus('Not saved: '+name);window.forgeSave.lastError={name:d.errorName||'Error',message:d.message||'Unknown error'};}}
});
async function chooseSaveLocation(){
  const job=pending;if(!job||job.busy)return;
  const name=cleanName($('forgeSaveName').value);$('forgeSaveName').value=name;
  // Embedded frames are not allowed to invoke showSaveFilePicker directly.
  // Move that user action into a real top-level helper window instead.
  if(!isTopLevel()){openSaveHelper();return;}
  if(!canChooseNative()){$('forgeSaveMessage').textContent='The system Save As picker is unavailable in this browser/context. No file has been downloaded. Use browser download below or open this HTML directly in current Edge/Chrome.';return;}
  saveBusy(true);setSaveStatus('Choosing save location: '+name);$('forgeSaveMessage').textContent='Choose a folder and file name in the system Save As dialog.';
  let stream=null,selected=false;
  try{
    const handle=await window.showSaveFilePicker(pickerOptions(name));selected=true;
    $('forgeSaveMessage').textContent='Writing '+handle.name+'…';setSaveStatus('Saving: '+handle.name);
    stream=await handle.createWritable();await stream.write(job.blob);await stream.close();stream=null;
    finishSave({status:'saved',method:'file-system-access',name:handle.name||name,bytes:job.blob.size});
  }catch(error){
    if(stream)try{await stream.abort();}catch(_){}
    if(!selected&&error?.name==='AbortError'){finishSave({status:'cancelled',method:'file-system-access',name});return;}
    const denied=error?.name==='SecurityError'||error?.name==='NotAllowedError';
    $('forgeSaveMessage').textContent=(denied?'This browser blocked the system picker. ':'The file could not be saved. ')+(error?.message||'Unknown error')+' No fallback download was started. Retry, choose Use browser download, or cancel.';
    setSaveStatus('Not saved: '+name);saveBusy(false);
    window.forgeSave.lastError={name:error?.name||'Error',message:error?.message||String(error)};
  }
}
function browserSave(){
  const job=pending;if(!job||job.busy)return;
  const name=cleanName($('forgeSaveName').value),url=URL.createObjectURL(job.blob),a=document.createElement('a');
  try{a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);finishSave({status:'download-requested',method:'browser-download',name,bytes:job.blob.size});}
  catch(error){a.remove();URL.revokeObjectURL(url);$('forgeSaveMessage').textContent='Browser download could not start: '+error.message;setSaveStatus('Not saved: '+name);}
}
function cancelSave(){if(pending&&!pending.busy)finishSave({status:'cancelled',method:'none',name:cleanName($('forgeSaveName').value)});}
function requestSave(data,name,type='application/octet-stream'){
  if(pending){setSaveStatus('Finish or cancel the current Save As request first');dialog.focus();return Promise.resolve({status:'busy',name:cleanName(name)});}
  let blob;try{blob=data instanceof Blob?data:new Blob([data],{type});}catch(error){reportError(error);return Promise.resolve({status:'error',name:cleanName(name)});}
  const promise=new Promise(resolve=>{pending={blob,resolve,busy:false};});
  $('forgeSaveName').value=cleanName(name);$('forgeSaveSize').textContent=blob.size.toLocaleString()+' bytes · '+(blob.type||type);
  $('forgeSaveChoose').textContent=isTopLevel()?'Choose location & save…':'Open Save As window…';
  $('forgeSaveMessage').textContent=canChooseNative()?'Choose a location to save this file. Nothing is saved until you confirm.':(!isTopLevel()?'This app is running inside an embedded preview. Browsers forbid system file pickers inside embedded frames, so Choose will open a top-level Save As helper window. Nothing has been downloaded.':'The system Save As picker is unavailable in this browser/context. Nothing has been downloaded. Use browser download only when you are ready.');
  saveBusy(false);setSaveStatus('Ready to save: '+cleanName(name));clearEmuKeys();
  if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
  window.forgeSave.lastPromise=promise;
  // Only a true top-level page may auto-open the native picker from this click.
  // Embedded previews wait for the explicit helper-window button click.
  if(canChooseNative()&&navigator.userActivation?.isActive)void chooseSaveLocation();
  return promise;
}
$('forgeSaveChoose').onclick=chooseSaveLocation;$('forgeSaveBrowser').onclick=browserSave;$('forgeSaveCancel').onclick=cancelSave;
dialog.addEventListener('cancel',e=>{e.preventDefault();cancelSave();});
// Stop editor/game shortcuts behind the modal without blocking native text editing.
window.addEventListener('keydown',e=>{if(dialog.open){e.stopImmediatePropagation();if(e.key==='Escape'){e.preventDefault();cancelSave();}}},true);
window.forgeSave={request:requestSave,cancel:cancelSave,lastResult:null,lastError:null,lastPromise:null,canChoose,canChooseNative,isTopLevel};
download=requestSave;
disasm_exportAsm=function(){if(disasm_asmText)return download(disasm_asmText,'disasm.asm','text/plain');};
// These two are browser storage, not file-system saves; label that distinction.
const localSave=document.querySelector('.project-bar button[onclick="db_savePrompt()"]');if(localSave)localSave.title='Save to this browser’s local project database (not a file)';
const projectButton=document.querySelector('.project-bar button[onclick="project_export()"]');if(projectButton){projectButton.textContent='Save Project As…';projectButton.title='Save a complete portable project JSON; choose a location';}
const exportButton=document.querySelector('button[onclick="exportAll()"]');if(exportButton){exportButton.innerHTML='&#x1F4BE; Export…';exportButton.title='Save As: complete project ZIP and binary assets';}

// The sheet and pixel editor share ONE palette/appearance resolver.
// NES tiles store 2-bit indices, not RGB colors; color depends on the use site.
const controls=document.createElement('section');controls.id='chrPreviewControls';
controls.innerHTML=`<label for="chrPreviewMode">Color preview</label><select id="chrPreviewMode"><option value="scene">Scene colors (auto)</option><option value="manual">Selected palette</option><option value="indices">Pixel values (grayscale)</option></select><div id="chrAppearanceRow"><label for="chrAppearance">Tile appearance</label><select id="chrAppearance"></select></div><div id="chrManualStateRow"><label for="chrManualState">Captured palette state</label><select id="chrManualState"></select></div><div id="chrPreviewInfo"></div><p id="chrPreviewHint">The sheet and editor use the same colors. Changing a preview does not recolor the scene. Pencil buttons edit the actual palette.</p>`;
$('sideChr').insertBefore(controls,$('chrBankBrowser').nextSibling);
let mode='scene',manualState=0,usageIndex=new Map(),indexScene=null,indexBank='',selectedContext=null,poseUsageActive=false;
const preferred=new Map();
function scene(){return forgeCapture.liveScene();}
function contextKey(ctx){return [ctx.set,ctx.pal,ctx.gray?1:0].join(':');}
function preferenceKey(ti){return [S.scenes[S.activeScene]?.id,S.chrBank,ti].join(':');}
function manualPal(){return clamp(S.chrBank==='spr'?S.selSprPal:S.selPal,0,3);}
function putManualPal(value){if(S.chrBank==='spr')S.selSprPal=value;else S.selPal=value;}
function palette(ctx,sc=scene(),bank=S.chrBank){
  // A selected pose can read this sheet through Metasprite pieces even when
  // Scene OAM is empty. Its palette is display context, not another native writer.
  if(ctx.poseColors)return ctx.poseColors.slice();
  const row=bank==='spr'?sc.sprPal:sc.pal,r=sc.raster;
  const bytes=ctx.set>0?r?.palettes?.[ctx.set]:null,off=(bank==='spr'?16:0)+ctx.pal*4;
  return Array.from({length:4},(_,i)=>{
    let n=i===0?sc.pal[0][0]:row[ctx.pal]?.[i]??15;
    if(bytes)n=bytes[i===0?0:off+i];
    return ctx.gray?(n&48):n;
  });
}
function buildIndex(){
  const sc=scene(),r=sc.raster;indexScene=S.scenes[S.activeScene];indexBank=S.chrBank;usageIndex=new Map();
  function add(ti,pal,set,gray,count,y){
    let group=usageIndex.get(ti);if(!group){group=new Map();usageIndex.set(ti,group);}
    const key=[set,pal,gray?1:0].join(':');let c=group.get(key);if(!c){c={pal,set,gray:!!gray,count:0,firstY:y,key};group.set(key,c);}c.count+=count;
  }
  const pose=window.Forge?.services?.ResourceContext?.chrUsage();poseUsageActive=!!pose;
  if(pose){
    for(const use of pose.uses)add(use.tile,use.pal,0,false,64,use.displayHalf*8);
    for(const [ti,group]of usageIndex)usageIndex.set(ti,Array.from(group.values()).map(c=>({...c,poseId:pose.frame.id,poseColors:Array.from(pose.paletteScene?.sprPal?.[c.pal]||[15,0,16,48]),transparent:true})).sort((a,b)=>b.count-a.count||a.pal-b.pal));
    return;
  }
  if(S.chrBank==='spr'){
    for(const spr of S.oam){if(!spr.active)continue;const height=spr.height===16?16:8;
      for(let py=0;py<height;py++){const y=spr.y+py;if(y<0||y>=240)continue;const mask=r&&r.useMask!==false?r.masks[y]:30;if(!(mask&16))continue;
        const fy=spr.attr&128?height-1-py:py,ti=fy>=8?(spr.tile2??((spr.tile+1)&255)):spr.tile;
        const w=Math.max(0,Math.min(256,spr.x+8)-Math.max(spr.x,(mask&4)?0:8));if(w)add(ti,spr.attr&3,r?r.linePal[y]:0,mask&1,w,y);
      }
    }
  }else if(r){
    const map=forgeCapture.rasterMap(r);
    // Honor native scrolling plus authored screen-cell and attribute overrides.
    for(let y=0;y<240;y++)for(let x=0;x<256;x++){
      const at=forgeCapture.sampledBackground(sc,x,y,map);
      add(at.ti,at.pi,r.linePal[y],r.useMask!==false&&(r.masks[y]&1),1,y);
    }
  }else{
    for(let y=0;y<30;y++)for(let x=0;x<32;x++)add(S.nt[y*32+x],getPal(x,y),0,false,64,y*8);
  }
  for(const [ti,group]of usageIndex)usageIndex.set(ti,Array.from(group.values()).sort((a,b)=>b.count-a.count||a.firstY-b.firstY||a.set-b.set||a.pal-b.pal));
}
function appearances(ti){if(indexScene!==S.scenes[S.activeScene]||indexBank!==S.chrBank)buildIndex();return usageIndex.get(ti)||[];}
function resolve(ti){
  const r=S.scenes[S.activeScene]?.raster,contexts=appearances(ti),fallback={pal:manualPal(),set:clamp(manualState,0,(r?.palettes?.length||1)-1),gray:false,count:0,unused:true};
  if(mode==='manual')return fallback;
  const wanted=preferred.get(preferenceKey(ti));return contexts.find(c=>c.key===wanted)||contexts[0]||fallback;
}
function pixelRGB(ci,x,y,context,colors){
  if(mode==='indices')return [ci*85,ci*85,ci*85];
  if((S.chrBank==='spr'||context.transparent)&&ci===0){const c=(x+y)%2?38:57;return [c,c,c];}
  return NP[colors[ci]]||NP[15];
}
function drawPreview(ctx,tile,context,ox,oy,scale,grid=false){
  const colors=palette(context);
  for(let y=0;y<8;y++)for(let x=0;x<8;x++){
    const ci=tile?.[y]?.[x]||0,rgb=pixelRGB(ci,x,y,context,colors);ctx.fillStyle='rgb('+rgb.join(',')+')';ctx.fillRect(ox+x*scale,oy+y*scale,scale,scale);
    if(grid){ctx.strokeStyle='rgba(255,255,255,0.1)';ctx.lineWidth=1;ctx.strokeRect(ox+x*scale+.5,oy+y*scale+.5,scale-1,scale-1);}
  }
}
function contextLabel(c){return (S.chrBank==='spr'||c.poseId?'SP':'P')+c.pal+' · state '+c.set+(c.gray?' · grayscale':'');}
function updateControls(context){
  $('chrPreviewMode').value=mode;const list=appearances(S.editTile),sel=$('chrAppearance');sel.innerHTML='';
  for(const c of list){const o=document.createElement('option');o.value=c.key;o.textContent=contextLabel(c)+' · '+c.count.toLocaleString()+(poseUsageActive?' source pixel positions in pose pieces':' source px');o.selected=c.key===contextKey(context);sel.appendChild(o);}
  $('chrAppearanceRow').style.display=mode==='scene'&&list.length>1?'block':'none';
  const r=S.scenes[S.activeScene]?.raster,states=$('chrManualState');states.innerHTML='';
  for(let i=0;i<(r?.palettes?.length||1);i++){const o=document.createElement('option');o.value=i;o.textContent='State '+i+(r?' · first Y='+r.linePal.indexOf(i):'');o.selected=i===context.set;states.appendChild(o);}
  $('chrManualStateRow').style.display=mode==='manual'&&(r?.palettes?.length||0)>1?'block':'none';
  $('chrPreviewInfo').textContent=mode==='indices'?'Raw pixel values 0–3. Palette-independent; no usage tint.':(mode==='manual'?'Preview: ':list.length?(context.poseId?'Pose use: ':'Scene use: '):'No use recorded in this view: ')+contextLabel(context)+(mode==='scene'&&list.length>1?' · '+list.length+' appearances; choose above':'')+(S.chrBank==='spr'?' · index 0 is transparent':'');
}
function chooseManual(pal,set=selectedContext?.set||0,pix){
  mode='manual';manualState=set;putManualPal(clamp(pal,0,3));if(pix!==undefined)S.selPixColor=pix;render();
}
function editorSwatch(pi,i,context,previewRow=false){
  const c={...context,pal:pi};if(c.poseId){const u=window.Forge.services.ResourceContext.chrUsage();c.poseColors=Array.from(u?.paletteScene?.sprPal?.[pi]||[15,0,16,48]);}const colors=palette(c),sw=document.createElement('div');sw.className='ps'+(pi===context.pal&&i===S.selPixColor?' sel':'');
  sw.dataset.palette=pi;sw.dataset.color=i;
  const rgb=mode==='indices'&&!previewRow?[i*85,i*85,i*85]:NP[colors[i]]||NP[15];sw.style.background='rgb('+rgb.join(',')+')';
  sw.title=(S.chrBank==='spr'&&i===0?'Transparent index 0':'Pixel index '+i)+' · '+hex(colors[i]);
  sw.onclick=previewRow?()=>chooseManual(pi,context.set,i):()=>{S.selPixColor=i;updateCHREditor();};
  return sw;
}
function palettePencil(context,pi){
  const button=document.createElement('button');button.type='button';button.className='pal-edit';button.textContent='✎';button.disabled=mode==='indices';
  if(context.poseId&&S.chrBank==='bg'){button.disabled=true;button.title='Pose colors are read-only display context. Open the native fight palette writer to edit exported colors.';return button;}
  button.title='Edit actual '+contextLabel({...context,pal:pi})+' color '+S.selPixColor+' (changes every use of this palette slot)';
  button.onclick=()=>openPicker(pi,S.selPixColor,button,S.chrBank==='spr',context.set);return button;
}
updateCHREditor=function(){
  const tiles=activeChr();S.editTile=clamp(S.editTile,0,tiles.length-1);const context=resolve(S.editTile);selectedContext=context;
  const canvas=$('chrEditCanvas'),ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=false;
  drawPreview(ctx,tiles[S.editTile],context,0,0,16,true);$('chrEditId').textContent=(S.chrBank==='spr'?'SPR ':'BG ')+'Tile '+hex(S.editTile);
  const colors=$('pixColorSel');colors.innerHTML='';for(let i=0;i<4;i++)colors.appendChild(editorSwatch(context.pal,i,context));colors.appendChild(palettePencil(context,context.pal));
  let hr=$('pixHexRow');if(!hr){hr=document.createElement('div');hr.id='pixHexRow';hr.style.cssText='font-size:8px;color:var(--dim);margin-top:3px';colors.after(hr);}
  hr.textContent=mode==='indices'?'Indices 0 1 2 3':palette(context).map(hex).join(' ');
  const pe=$('chrPalEditor');pe.innerHTML='';for(let p=0;p<4;p++){
    const row=document.createElement('div');row.className='pr'+(p===context.pal?' active':'');const label=document.createElement('span');label.className='pl';label.textContent=(S.chrBank==='spr'?'SP':'P')+p;label.style.cursor='pointer';label.onclick=()=>chooseManual(p,context.set);row.appendChild(label);
    for(let c=0;c<4;c++)row.appendChild(editorSwatch(p,c,context,true));row.appendChild(palettePencil(context,p));pe.appendChild(row);
  }
  updateControls(context);
};
renderCHR=function(){
  updateChrBankBrowser();const tiles=activeChr();S.editTile=clamp(S.editTile,0,tiles.length-1);buildIndex();
  const page=Math.floor(S.editTile/256);cv.width=cv.height=384;cx.imageSmoothingEnabled=false;cx.fillStyle='#0c0c10';cx.fillRect(0,0,384,384);
  for(let j=0;j<256;j++){const i=page*256+j,tile=tiles[i],x=(j%16)*24,y=(j>>4)*24;if(tile&&(!window.forgeCHR?.usageOnly||!poseUsageActive||usageIndex.has(i)))drawPreview(cx,tile,resolve(i),x,y,3);}
  cx.strokeStyle='rgba(100,160,190,0.15)';cx.lineWidth=1;for(let i=0;i<=16;i++){cx.beginPath();cx.moveTo(i*24,0);cx.lineTo(i*24,384);cx.stroke();cx.beginPath();cx.moveTo(0,i*24);cx.lineTo(384,i*24);cx.stroke();}
  const selected=S.editTile%256;cx.strokeStyle='#5ad4ff';cx.lineWidth=2;cx.strokeRect((selected%16)*24+1,(selected>>4)*24+1,22,22);
  const panel=$('captureChrPages');panel.style.display=tiles.length>256?'block':'none';const select=$('captureChrPage');select.innerHTML='';
  for(let p=0;p<Math.ceil(tiles.length/256);p++){const o=document.createElement('option');o.value=p;o.textContent='Atlas '+(p+1)+' · '+hex(p*256)+'–'+hex(Math.min(tiles.length-1,p*256+255));o.selected=p===page;select.appendChild(o);}
};
window.chooseCaptureChrPage=function(n){const page=clamp(n,0,Math.ceil(activeChr().length/256)-1);S.selTile=S.editTile=page*256;render();};
// One hit-test for both the 256-slot sheet and larger capture atlas pages.
document.addEventListener('mousedown',e=>{
  if(e.target!==cv||S.tab!=='chr')return;e.preventDefault();e.stopImmediatePropagation();
  const p=canvasPoint(cv,e,128,128);if(p.x<0||p.y<0||p.x>=128||p.y>=128)return;
  const ti=Math.floor(S.editTile/256)*256+(p.y>>3)*16+(p.x>>3);if(ti<activeChr().length&&(!window.forgeCHR?.usageOnly||!poseUsageActive||usageIndex.has(ti))){S.editTile=S.selTile=ti;render();}
},true);
$('chrPreviewMode').onchange=function(){mode=this.value;if(mode==='manual'&&selectedContext){manualState=selectedContext.set;putManualPal(selectedContext.pal);}render();};
$('chrAppearance').onchange=function(){preferred.set(preferenceKey(S.editTile),this.value);render();};
$('chrManualState').onchange=function(){manualState=+this.value;render();};
const oldLoadScene=loadSceneData;loadSceneData=function(i){oldLoadScene(i);manualState=0;selectedContext=null;indexScene=null;findLastTile=-1;};
const oldBank=setChrBank;setChrBank=function(bank){indexScene=null;findLastTile=-1;oldBank(bank);};
// Find-in-scene used to search BG even while editing sprite CHR.
const oldFind=findTileInScene;findTileInScene=function(){
  const pose=window.Forge?.services?.ResourceContext?.chrUsage();
  if(pose){const uses=pose.uses.filter(use=>use.tile===S.editTile);$('findMiniScene').getContext('2d').clearRect(0,0,256,240);$('findTileHex').textContent=hex(S.editTile).slice(1);$('findResults').textContent=uses.length+' selected pose piece use(s). See the pose tile context for palettes and flips; Scene OAM is separate.';findLastTile=S.editTile;return;}
  if(S.chrBank!=='spr')return oldFind();
  const sc=scene(),image=forgeCapture.scenePixels(sc,true).rgba,used=new Uint8Array(256*240);let count=0;
  for(const s of S.oam){if(!s.active)continue;const h=s.height===16?16:8;let matched=false;
    for(let py=0;py<h;py++){const fy=s.attr&128?h-1-py:py,ti=fy>=8?(s.tile2??((s.tile+1)&255)):s.tile;if(ti!==S.editTile)continue;matched=true;
      for(let px=0;px<8;px++){const x=s.x+px,y=s.y+py;if(x>=0&&x<256&&y>=0&&y<240)used[y*256+x]=1;}}
    if(matched)count++;
  }
  for(let i=0;i<used.length;i++)if(!used[i]){image[i*4]*=.25;image[i*4+1]*=.25;image[i*4+2]*=.25;}
  $('findMiniScene').getContext('2d').putImageData(new ImageData(image,256,240),0,0);$('findTileHex').textContent=hex(S.editTile).slice(1);$('findResults').textContent=count+' active sprite placement(s) use this tile';findLastTile=S.editTile;
};
// Keep usage counts numerical instead of tinting the tile's artwork.
const oldStats=updateStats;updateStats=function(){oldStats();if(S.tab!=='chr')return;const top=Array.from(usageIndex,([ti,cs])=>[ti,cs.reduce((n,c)=>n+c.count,0)]).sort((a,b)=>b[1]-a[1]).slice(0,10);$('chrUsageStats').innerHTML='<h3>Top used '+(S.chrBank==='spr'?'sprite':'background')+' assets</h3>'+top.map(([i,n])=>'<div class="st"><span>'+hex(i)+'</span><span class="v">'+(poseUsageActive?(n/64).toLocaleString()+' piece references':n.toLocaleString()+' source px')+'</span></div>').join('');if($('findAutoTrack').checked)findTileInScene();};
const oldDocs=renderDocs;renderDocs=function(){oldDocs();const section=document.createElement('section');section.innerHTML='<h2>1.4.3 — Save As &amp; CHR colors</h2><p>Export, Save Project As, Build .NES ROM and assembly download share one Save As flow. Supported secure browser contexts open the system picker from a direct click. In blocked/unsupported previews the app offers an explicit browser-download fallback and explains the browser-controlled destination. Cancelling never starts a fallback download. “Saved” appears only after the writable file is closed successfully. Browser database Save/Load remains separate.</p><p>CHR Sheet defaults to Scene colors (auto), selecting the most-used palette appearance for each native tile. Sheet, selected pixel editor and swatches use one palette resolver, including captured raster palette states. A tile can have multiple legitimate appearances; the appearance dropdown selects among them. Choosing a palette row switches to Selected palette mode for a uniform sheet preview. Pixel values mode displays raw 0–3 indices in grayscale. Usage counts no longer tint artwork. Preview changes do not modify assets. Pencil controls edit the real palette slot and support Undo.</p><p>Native sprite tiles are shown unflipped; transparent index 0 is checkerboard. Find in Scene searches active OAM when Sprite Bank is selected. Existing 1.4.2 project JSON/ZIP captures open without recapture; CPU, PPU, audio, scheduling and capture validation are unchanged.</p>';document.querySelector('#sideDocs .doc').prepend(section);};
window.forgeCHR={usageOnly:false,resolve,palette,buildIndex,appearances,drawPreview,get mode(){return mode;},get context(){return selectedContext;}};
document.querySelector('h1').innerHTML='NES FORGE <small style="color:var(--grn)">1.4.4 SAVE CONTEXT FIX</small>';
document.title='NES Forge 1.4.3 — Save As & CHR Colors';
render();
})();





