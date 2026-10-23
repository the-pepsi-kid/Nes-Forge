/* The same AUDIO editor receives an inspected FamiStudio export. File loading,
 * preview, commit and receipt export each own their asynchronous completion. */
(()=>{
'use strict';
const services=window.Forge.services;
let c=null,source=null,staged=null,receipt=null,busy=false,revision=0,operation=0;
const make=(tag,id,text)=>{const e=document.createElement(tag);if(id)e.id=id;if(text!==undefined)e.textContent=text;return e;};
function message(text,error=false){c.status.textContent=text;c.status.style.color=error?'var(--err, #ff9898)':'var(--dim)';}
function enable(){c.choose.disabled=busy;c.song.disabled=busy||!source;c.preview.disabled=busy||!source;c.apply.disabled=busy||!staged;c.receipt.disabled=busy||!receipt;}
function invalidate(){revision++;staged=null;receipt=null;c.summary.textContent='';enable();message('Selection changed. Preview the selected song before importing.');}
async function loadFile(file){
 if(!file)return false;const id=++operation;revision++;source=null;staged=null;receipt=null;busy=true;c.summary.textContent='';c.song.replaceChildren();enable();
 try{
  if(!Number.isSafeInteger(file.size)||file.size<1||file.size>services.AudioToolImport.maxBytes)throw Error('Choose a FamiStudio UTF-8 text export of at most 1 MiB.');
  message('Reading FamiStudio text…');
  const bytes=new Uint8Array(await file.arrayBuffer());if(bytes.length!==file.size)throw Error('The selected file changed while reading. Choose it again.');
  // Retain a possible UTF-8 BOM in the receipt, and reject malformed encoding.
  const text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);
  const info=window.FamiStudioText.inspect(text);if(id!==operation)return false;
  source={text,name:String(file.name||'FamiStudio.txt').slice(0,512)};
  for(const song of info.songs){const option=make('option',null,song.name);option.value=String(song.index);c.song.appendChild(option);}c.song.value='0';
  message(source.name+' · '+info.songs.length+' song(s). Choose a song and preview its supported content.');return true;
 }catch(error){if(id===operation){source=null;message(error.message||String(error),true);}return false;}
 finally{if(id===operation){busy=false;enable();}}
}
async function preview(){
 if(busy)return false;staged=null;receipt=null;c.summary.textContent='';const id=++operation,selection=revision;busy=true;enable();
 try{
  if(!source)throw Error('Choose a FamiStudio text export first.');
  const value=String(c.song.value);if(!/^\d+$/.test(value))throw Error('Choose a song from the export.');
  message('Checking the selected song…');const item=await services.AudioToolImport.stage(source,{songIndex:Number(value)});
  if(id!==operation||selection!==revision)throw Error('The selection changed. Preview again.');
  const r=item.result,d=item.data,lines=[source.name+' · '+(r.report?.songName||'Song '+(Number(value)+1)),d.patternCount+' new patterns · '+d.instrumentCount+' new instruments · '+r.noteCount+' notes','Tempo '+r.tempo+' · speed '+r.speed+' · '+r.rows+' rows per pattern'];
  for(const warning of r.warnings||[])lines.push(typeof warning==='string'?warning:JSON.stringify(warning));
  if(r.report){lines.push('Source duration: '+r.report.durationRows+' rows; silent padding: '+r.report.paddingRows+' rows.');for(const [title,key]of [['Converted','converted'],['Not included','omitted']])if(r.report[key]?.length)lines.push(title+': '+r.report[key].join('; ')+'.');}
  lines.push('Import appends editable patterns and instruments, and replaces the current music order and tempo/speed. Existing SFX records remain; their playback timing follows the new global tempo/speed. One Undo restores the previous song.','Audio data estimate: '+d.estimatedBytes+' bytes. Build the complete project to check ROM capacity.','Save Project As keeps the converted score. Download source + report separately to retain the original text export.');
  c.summary.textContent=lines.join('\n');staged=item;receipt=services.AudioToolImport.report(item,'preview');message('Preview ready. Review the conversion details, then choose Import selected song.');return true;
 }catch(error){if(id===operation)message(error.message||String(error),true);return false;}
 finally{if(id===operation){busy=false;enable();}}
}
async function importMusic(){
 if(busy)return false;if(!staged){message('Preview a supported song first.',true);return false;}
 const item=staged,id=++operation,selection=revision;busy=true;enable();
 try{
  if(!confirm('Import the selected FamiStudio song into AUDIO?\n\nThe current music order and global tempo/speed will be replaced. Existing patterns, instruments and SFX records remain; SFX playback timing may change. Review the preview for conversion differences. One Undo restores the previous song.')){message('Import cancelled. The project is unchanged.');return false;}
  if(id!==operation||selection!==revision||staged!==item)throw Error('The selection changed. Preview again.');
  const data=services.AudioToolImport.commit(item);staged=null;receipt=services.AudioToolImport.report(item,'imported');const issues=[...(data.warnings||[])];
  try{aud_stop();aud_currentOrder=0;aud_currentRow=0;aud_selectedInst=data.instrumentCount?data.instrumentOffset:-1;render();services.AudioUI?.refresh();}catch(error){issues.push('display refresh: '+(error.message||String(error)));}
  message('Imported '+data.patternCount+' patterns and '+data.instrumentCount+' instruments. Save Project As keeps the editable score; download source + report to keep the original export. Enable Compile Audio Runtime to include music in a ROM.'+(issues.length?' Import succeeded with warnings: '+issues.join('; '):''),!!issues.length);
  return {patternOffset:data.patternOffset,instrumentOffset:data.instrumentOffset,patternCount:data.patternCount,instrumentCount:data.instrumentCount};
 }catch(error){staged=null;message(error.message||String(error),true);return false;}
 finally{if(id===operation){busy=false;enable();}}
}
async function downloadReceipt(){
 const item=receipt;
 try{
  if(busy||!item)throw Error('Preview a supported song before downloading its source and report.');
  const name=item.source.name.replace(/\.[^.]*$/,'').replace(/[^a-z0-9._-]/gi,'_').slice(0,80)||'FamiStudio';
  const result=await forgeSave.request(new TextEncoder().encode(JSON.stringify(item,null,2)),name+'-import-receipt.json','application/json');
  if(receipt===item){if(result?.status==='saved')message('Saved original source and import report. Save Project As separately keeps the editable score.');else if(result?.status==='download-requested')message('Download requested for original source and import report.');else if(result?.status==='cancelled')message('Receipt save cancelled. The report remains available.');else if(result?.status==='busy')message('Finish the open Save As request, then download the receipt again.',true);else message('Receipt save did not complete: '+(result?.error?.message||result?.message||result?.status||'unknown result'),true);}return result;
 }catch(error){if(receipt===item)message(error.message||String(error),true);return false;}
}
function mount(){
 const anchor=document.getElementById('audImportStatus180');if(!anchor)return;
 const panel=make('fieldset','audioToolPanel'),legend=make('legend',null,'FamiStudio text import');panel.appendChild(legend);panel.style.cssText='border:1px solid var(--bdr);padding:6px;margin:6px 0;min-width:0';
 const intro=make('p',null,'Import a supported FamiStudio 4.5 text export into this tracker. Preview reports conversion limits; unsupported song features stop the import.');intro.style.cssText='font-size:9px;color:var(--dim)';panel.appendChild(intro);
 c={panel,file:make('input','audioToolFile'),choose:make('button','audioToolChoose','Import FamiStudio…'),song:make('select','audioToolSong'),preview:make('button','audioToolPreview','Preview selected song'),apply:make('button','audioToolApply','Import selected song'),receipt:make('button','audioToolReceipt','Download source + report'),summary:make('pre','audioToolSummary'),status:make('p','audioToolStatus')};
 c.file.type='file';c.file.accept='.txt,text/plain';c.file.style.display='none';c.song.setAttribute('aria-label','FamiStudio song');c.song.style.cssText='max-width:100%;width:100%;margin:4px 0;padding:5px;background:var(--bg3);color:var(--txt);border:1px solid var(--bdr)';c.status.setAttribute('role','status');c.status.style.cssText='font-size:10px;overflow-wrap:anywhere';c.summary.style.cssText='font-size:10px;line-height:1.4;white-space:pre-wrap;overflow-wrap:anywhere;max-height:240px;overflow:auto';c.summary.setAttribute('aria-label','FamiStudio conversion preview');
 for(const key of ['choose','preview','apply','receipt'])c[key].style.cssText='display:block;width:100%;margin:4px 0;padding:5px 8px;background:var(--bg3);color:var(--txt);border:1px solid var(--bdr);font:inherit;cursor:pointer';
 c.apply.style.color='var(--grn)';
 for(const key of ['file','choose','song','preview','apply','receipt','summary','status'])panel.appendChild(c[key]);
 c.choose.addEventListener('click',()=>c.file.click());c.file.addEventListener('change',()=>{const file=c.file.files?.[0];c.file.value='';void loadFile(file);});c.song.addEventListener('change',invalidate);c.preview.addEventListener('click',()=>void preview());c.apply.addEventListener('click',()=>void importMusic());c.receipt.addEventListener('click',()=>void downloadReceipt());
 anchor.parentNode.insertBefore(panel,anchor);enable();message('Choose a FamiStudio text export to inspect its songs.');
}
services.AudioToolImportUI=Object.freeze({loadFile,preview,importMusic,downloadReceipt,getState:()=>({busy,hasSource:!!source,hasStage:!!staged,receiptOutcome:receipt?.outcome||null})});mount();
})();
