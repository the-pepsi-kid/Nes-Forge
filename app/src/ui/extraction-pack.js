/* Selection stays local to the inspected archive. No extracted HTML is executed. */
(()=>{
'use strict';
const labels={map:'Maps',room:'Room evidence',resource:'Native background layouts',capture:'Observed runtime screens',collision:'Collision references',pose:'Sprite pose previews',catalog:'Source catalogs',project:'Editable scenes / rooms',animationProject:'Editable animation projects',nativeProject:'Editable native resource project',audioProject:'Editable audio projects',audioReport:'Audio reports'};
function mount(container,pack,options){
  const make=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
  const groups=make('select'),filter=make('input'),resources=make('select'),status=make('p'),preview=make('img'),open=make('button','Open selected project');
  groups.id='extractionGroup';filter.id='extractionFilter';filter.type='search';resources.id='extractionResource';
  open.id='extractionOpenProject';open.type='button';status.id='extractionSummary';status.setAttribute('role','status');
  preview.alt='Selected extraction preview';preview.style.cssText='max-width:min(100%,600px);max-height:320px;object-fit:contain;image-rendering:pixelated;';
  preview.hidden=true;open.disabled=true;
  function field(text,input){const label=make('label',text+' ');label.append(input);return label;}
  const toolbar=make('div');toolbar.style.cssText='display:flex;flex-wrap:wrap;gap:8px;align-items:center';
  resources.style.maxWidth='min(100%,32rem)';
  toolbar.append(field('Resource type',groups),field('Filter',filter),field('Resource',resources),open);
  const sourcePicker=make('input'),sourceStatus=make('p');
  sourcePicker.id='extractionSourceFile';sourcePicker.type='file';sourcePicker.accept='.nes,.bin';
  sourceStatus.id='extractionSourceStatus';sourceStatus.setAttribute('role','status');
  sourceStatus.textContent='Source ROM has not been checked in this session.';
  let sourceRequest=0;
  sourcePicker.onchange=async()=>{
    const myRequest=++sourceRequest,file=sourcePicker.files?.[0];if(!file)return;
    const active=()=>!closed&&sourceRequest===myRequest&&options.isCurrent();
    sourceStatus.dataset.status='reading';sourceStatus.textContent='Checking local ROM…';
    try{
      if(!file.size||file.size>64*1024*1024)throw Error('Choose a ROM of at most 64 MiB.');
      const original=new Uint8Array(await file.arrayBuffer());if(!active())return;
      const result=pack.verifySource(original);
      const labels={exact:'Exact source ROM verified.', 'same-payload':'Cartridge payload verified. The 16-byte header differs as recorded in the pack.', mismatch:'This ROM does not match the extraction.'};
      sourceStatus.dataset.status=result.status;sourceStatus.textContent=labels[result.status]+' SHA-256 '+result.sha256;
    }catch(error){if(active()){sourceStatus.dataset.status='error';sourceStatus.textContent=error.message;}}
    finally{if(active())sourcePicker.value='';}
  };
  const recordSelect=make('select'),recordDetails=make('pre'),recordLabel=field('Source record',recordSelect);
  recordSelect.id='extractionRecord';recordDetails.id='extractionRecordDetails';recordLabel.hidden=true;recordDetails.hidden=true;
  recordDetails.style.cssText='max-height:280px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;font:11px/1.5 monospace;padding:10px;border:1px solid #36536a;';
  container.append(field('Check original ROM',sourcePicker),sourceStatus,toolbar,status,preview,recordLabel,recordDetails);
  for(const [key,paths] of Object.entries(pack.files)){
    if(!paths.length)continue;
    const option=make('option',labels[key]+' ('+paths.length+')');option.value=key;groups.append(option);
  }
  let selection=0,closed=false,loaded=null,url=null;
  function clearPreview(){
    if(url){URL.revokeObjectURL(url);url=null;}
    preview.hidden=true;preview.removeAttribute('src');
  }
  function describe(kind,data,record){
    if(['project','animationProject','nativeProject','audioProject'].includes(kind)){
      return (data.projectName||'Forge project')+' · '+(data.scenes?.length||0)+' scenes · '+(data.metasprites?.length||0)+' poses · '+(data.animations?.length||0)+' animations · '+(data.patterns?.length||0)+' audio patterns.';
    }
    if(kind==='pose')return data.pose.label+' · '+data.metasprite.pieces.length+' sprite pieces · Read-only fragment: its CHR pixels are not embedded here. Use a complete animation project or the matching ROM to edit.';
    if(kind==='catalog')return record.catalogType+' · '+data.length+' source records. Select a record to inspect its fields. Native routines and source tables do not automatically become authored actor behavior.';
    if(kind==='resource')return data.resource.label+' · '+data.pages.length+' background page(s) · '+(data.resource.reason||'Partial source background layout.');
    if(kind==='capture')return 'Observed frame '+data.frame+' · captured background / sprite state. Stage logic and native writeback are not established by this snapshot.';
    if(kind==='collision')return 'Collision reference · '+data.collision.width+' × '+data.collision.height+' cells · '+(data.collision.rule||'Exported source categories')+' · Reference only; native project physics are not assigned by this preview.';
    if(kind==='audioReport')return 'Audio evidence · '+(data.patterns??0)+' patterns reported · '+(data.status||'status unavailable')+'.';
    const source=data.source||{},description=[data.label||data.scene?.label||'Room evidence',
      data.width+' × '+data.height+' cells',data.certainty||'Source-linked evidence'];
    if(Number.isInteger(source.bank16KiB))description.push('bank '+source.bank16KiB);
    if(Number.isInteger(source.fileOffset))description.push('file $'+source.fileOffset.toString(16).toUpperCase());
    if(Array.isArray(data.notes)&&typeof data.notes[0]==='string')description.push(data.notes[0]);
    return description.join(' · ');
  }
  async function choose(){
    const mine=++selection,path=resources.value;
    loaded=null;open.disabled=true;clearPreview();recordSelect.replaceChildren();recordLabel.hidden=true;recordDetails.hidden=true;recordDetails.textContent='';
    if(!path){status.textContent='No matching resources.';return;}
    const active=()=>!closed&&selection===mine&&options.isCurrent();
    status.textContent='Reading selected resource…';
    try{
      const record=await pack.entry(path);if(!active())return;
      loaded=record;status.textContent=describe(record.kind,record.data,record);
      open.disabled=!['project','animationProject','nativeProject','audioProject'].includes(record.kind);
      if(record.kind==='pose'){recordDetails.textContent=JSON.stringify(record.data,null,2);recordDetails.hidden=false;}
      if(record.kind==='catalog'){
        for(const [index,item]of record.data.entries()){
          const option=make('option',Array.isArray(item)?'$'+item[0].toString(16).toUpperCase()+' · '+item[1]:(item.label||item.name||item.id)+' · '+item.id);option.value=String(index);recordSelect.append(option);
        }
        recordLabel.hidden=false;recordDetails.hidden=false;
        recordDetails.textContent=record.data.length?JSON.stringify(record.data[0],null,2):'Empty source catalog.';
      }
      if(['map','room','resource','capture','collision','pose','animationProject'].includes(record.kind)){
        const image=await pack.preview(path);if(!active()||!image)return;
        if(typeof URL.createObjectURL==='function'){
          url=URL.createObjectURL(image);preview.src=url;preview.hidden=false;
        }
      }
    }catch(error){if(active())status.textContent=error.message;}
  }
  function list(){
    const query=filter.value.toLowerCase().trim();
    resources.replaceChildren();
    for(const path of pack.files[groups.value]||[]){
      const name=path.slice(pack.root.length);
      if(!name.toLowerCase().includes(query))continue;
      const option=make('option',name);option.value=path;resources.append(option);
    }
    void choose();
  }
  open.onclick=()=>{
    if(closed||!options.isCurrent()||!loaded||open.disabled)return;
    try{if(options.openProject(loaded.data))status.textContent='Opened '+(loaded.data.projectName||'Forge project')+' in the editor.';}
    catch(error){status.textContent=error.message;}
  };
  groups.onchange=list;filter.oninput=list;resources.onchange=()=>void choose();
  recordSelect.onchange=()=>{if(closed||!options.isCurrent()||loaded?.kind!=='catalog')return;const item=loaded.data[Number(recordSelect.value)];recordDetails.textContent=item===undefined?'No source record selected.':JSON.stringify(item,null,2);};
  list();
  return ()=>{closed=true;selection++;loaded=null;clearPreview();};
}
window.Forge.services.ExtractionPackUI=Object.freeze({mount});
})();
