/* RE bridge experiment: staged recovery never touches the active project.
 * Only the explicit import button calls the existing undoable replacement API.
 * The two canvases belong to this panel, not the protected editor renderer.
 */
(()=>{
'use strict';
const F=window.Forge=window.Forge||{};F.services=F.services||{};
const state={file:null,generation:0,busy:false,analysis:null,guard:null,imported:false};
let panel=null,controls=null;
const store=()=>F.services.ProjectStore,bridge=()=>F.services.REBridge;
function element(tag,id,text){const node=document.createElement(tag);if(id)node.id=id;if(text!==undefined)node.textContent=text;return node;}
function message(text,error=false){if(!controls)return;controls.status.textContent=text;controls.status.style.color=error?'var(--err, #ff9898)':'var(--dim)';}
function guard(){return {epoch:store().state.epoch,snapshot:store().serialize()};}
function current(g){return !!g&&g.epoch===store().state.epoch&&g.snapshot===store().serialize();}
function enable(){if(!controls)return;controls.analyze.disabled=!state.file||state.busy;controls.import.disabled=!state.analysis||state.busy||state.imported;controls.project.disabled=!state.analysis||state.busy;controls.report.disabled=!state.analysis||state.busy;controls.overlay.disabled=!state.analysis;}
function resetPreview(){if(!controls)return;controls.result.hidden=true;controls.summary.textContent='';controls.source.textContent='';controls.notes.replaceChildren();}
function selectFile(file){state.generation++;state.file=file||null;state.busy=false;state.analysis=null;state.guard=null;state.imported=false;resetPreview();enable();message(file?'Selected '+String(file.name||'ROM')+'. Analyze to preview recovery.':'Choose a ROM to preview recovery. Your project stays open.');}
function drawScene(project){
  const sc=project.scenes?.[project.activeScene||0]||project.scenes?.[0];if(!sc)return;
  const ctx=controls.scene.getContext('2d');if(!ctx)return;
  const pixels=ctx.createImageData(256,240),palette=typeof NP!=='undefined'?NP:[];
  for(let y=0;y<240;y++)for(let x=0;x<256;x++){
    const tc=x>>3,tr=y>>3,tile=(sc.chr||project.chr)?.[sc.nt?.[tr*32+tc]||0],ci=tile?.[y&7]?.[x&7]||0;
    const attr=sc.attr?.[(tr>>2)*8+(tc>>2)]||0,p=(attr>>((((tr>>1)&1)*2+((tc>>1)&1))*2))&3;
    const index=ci?sc.pal?.[p]?.[ci]:sc.pal?.[0]?.[0],rgb=palette[index]||[0,0,0],offset=(y*256+x)*4;
    pixels.data.set([rgb[0],rgb[1],rgb[2],255],offset);
  }
  ctx.putImageData(pixels,0,0);
  if(controls.overlay.checked){
    ctx.fillStyle='rgba(255,70,170,0.45)';
    const definitions=new Map((sc.metatiles||[]).map(m=>[m.id,m]));
    for(let y=0;y<30;y++)for(let x=0;x<32;x++){
      const mi=(y>>1)*16+(x>>1),definition=definitions.get(sc.metaMap?.[mi]),quadrant=(y&1)*2+(x&1);
      const collision=definition?(Array.isArray(definition.collision)?definition.collision[quadrant]:definition.collision):(sc.tileProps||project.tileProps)?.[sc.nt?.[y*32+x]||0];
      if((Number(collision)||0)&1)ctx.fillRect(x*8,y*8,8,8);
    }
  }
  const tileCtx=controls.tiles.getContext('2d');if(!tileCtx)return;
  const image=tileCtx.createImageData(128,128),chr=sc.chr||project.chr||[],levels=[18,93,173,245];
  for(let i=0;i<256;i++)for(let y=0;y<8;y++)for(let x=0;x<8;x++){const value=levels[chr[i]?.[y]?.[x]||0],offset=(((i>>4)*8+y)*128+(i%16)*8+x)*4;image.data.set([value,value,value,255],offset);}
  tileCtx.putImageData(image,0,0);
}
function showAnalysis(analysis){
  const report=analysis.report,r=report.recovered||{};
  controls.result.hidden=false;
  controls.source.textContent=String(report.source?.name||state.file?.name||'ROM')+'\nSHA-256 '+String(report.source?.sha256||'unavailable');
  controls.summary.textContent=(r.sceneCount??0)+' scene · '+(r.chrTiles??0)+' CHR tiles\n'+(r.solidCells??0)+' solid cells / '+(r.collisionCells??0)+' collision cells\n'+(r.musicRows??0)+' music rows · '+(r.pulseNotes??0)+' pulse notes';
  controls.collisionHelp.textContent=r.collisionMode==='tile-properties-with-cell-overrides'?'After import: edit collision in COLLISION. Linked cells with exceptions use METATILES collision quadrants.':'After import: edit the room in SCENE, tile collision in COLLISION, and recovered music in AUDIO.';
  controls.notes.replaceChildren();
  for(const note of report.limitations||[]){const item=element('li',null,typeof note==='string'?note:JSON.stringify(note));controls.notes.appendChild(item);}
  drawScene(analysis.exportProject());
}
async function analyzeFile(file){
  if(file!==undefined)selectFile(file);
  if(!state.file){message('Choose a .nes ROM first.',true);return false;}
  const chosen=state.file,token=++state.generation;
  state.busy=true;state.analysis=null;state.guard=null;state.imported=false;resetPreview();enable();message('Reading ROM and checking the supported recovery profile…');
  try{
    if(chosen.size>64*1024*1024)throw Error('ROM exceeds the 64 MB input limit.');
    const initial=guard(),bytes=new Uint8Array(await chosen.arrayBuffer());
    if(token!==state.generation)return false;
    const analysis=await bridge().analyze(bytes,String(chosen.name||'ROM'));
    if(token!==state.generation)return false;
    if(!current(initial))throw Error('The active project changed during analysis. Analyze this ROM again before importing.');
    state.analysis=analysis;state.guard=initial;showAnalysis(analysis);message('Recovery staged. Inspect the room and collision overlay, then import to edit.');return true;
  }catch(error){if(token===state.generation){state.analysis=null;state.guard=null;resetPreview();message(error?.message||String(error),true);}return false;}
  finally{if(token===state.generation){state.busy=false;enable();}}
}
function importStaged(){
  if(!state.analysis||state.busy||state.imported)return false;
  try{
    if(!current(state.guard))throw Error('The active project changed after this preview. Analyze the ROM again before replacing the project.');
    bridge().importProject(state.analysis);state.imported=true;enable();message('Imported as an editable Forge project. Undo restores the previous project. Open Audio for the recovered music.');return true;
  }catch(error){message(error?.message||String(error),true);return false;}
}
async function download(kind){
  if(!state.analysis||state.busy)return false;
  const analysis=state.analysis,token=state.generation;
  try{
    const data=kind==='project'?analysis.exportProject():analysis.report;
    const base=String(analysis.report.source?.name||'recovered').replace(/\.nes$/i,'').replace(/[^a-z0-9._-]/gi,'_').slice(0,90)||'recovered';
    const result=await forgeSave.request(new TextEncoder().encode(JSON.stringify(data,null,2)),base+(kind==='project'?'-Forge-project.json':'-RE-report.json'),'application/json');
    if(token===state.generation&&result?.status==='cancelled')message('Save cancelled. The staged recovery is still available.');
    return result;
  }catch(error){if(token===state.generation)message(error?.message||String(error),true);return false;}
}
function mount(){
  if(panel)return panel;
  const host=document.getElementById('sideDisasm');if(!host)return null;
  panel=element('section','reRecoveryPanel');panel.style.cssText='border-bottom:1px solid var(--bdr);padding:0 0 14px;margin-bottom:14px;font-size:10px;line-height:1.5;overflow-wrap:anywhere';
  panel.setAttribute('aria-label','Experimental editable ROM recovery');
  panel.appendChild(element('h2',null,'RECOVER EDITABLE PROJECT'));
  const intro=element('p',null,'Experimental · Bridge Room profile only. Recover the bundled room’s graphics, scene, collision and pulse music into Forge.');intro.style.margin='6px 0';panel.appendChild(intro);
  const hint=element('p','reRecoveryHint','Try the bundled Bridge_Room.nes. Other games need their own supported decoder.');hint.style.color='var(--dim)';panel.appendChild(hint);
  const label=element('label',null,'Choose ROM');label.htmlFor='reRecoveryFile';panel.appendChild(label);
  const file=element('input','reRecoveryFile');file.type='file';file.accept='.nes,application/octet-stream';file.style.cssText='display:block;max-width:100%;font-size:10px;margin:5px 0';file.addEventListener('change',()=>selectFile(file.files?.[0]));panel.appendChild(file);
  const analyze=element('button','reRecoveryAnalyze','Preview editable recovery');analyze.type='button';analyze.style.cssText='width:100%;margin:5px 0';analyze.addEventListener('click',()=>{void analyzeFile();});panel.appendChild(analyze);
  const status=element('p','reRecoveryStatus');status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.style.margin='7px 0';panel.appendChild(status);
  const result=element('div','reRecoveryResult');result.hidden=true;panel.appendChild(result);
  const source=element('p','reRecoverySource');source.style.cssText='white-space:pre-wrap;font:9px monospace;overflow-wrap:anywhere';result.appendChild(source);
  const summary=element('p','reRecoverySummary');summary.style.whiteSpace='pre-line';result.appendChild(summary);
  const scene=element('canvas','reRecoveryScene');scene.width=256;scene.height=240;scene.style.cssText='display:block;width:100%;height:auto;image-rendering:pixelated;border:1px solid var(--bdr)';scene.setAttribute('aria-label','Recovered background scene preview');result.appendChild(scene);
  const overlayLabel=element('label',null);overlayLabel.style.cssText='display:block;margin:6px 0';const overlay=element('input','reRecoveryCollision');overlay.type='checkbox';overlay.checked=true;overlay.addEventListener('change',()=>{if(state.analysis)drawScene(state.analysis.exportProject());});overlayLabel.appendChild(overlay);overlayLabel.appendChild(document.createTextNode(' Show recovered solid collision (pink)'));result.appendChild(overlayLabel);
  const collisionHelp=element('p','reRecoveryCollisionHelp');collisionHelp.style.color='var(--dim)';result.appendChild(collisionHelp);
  const tilesLabel=element('p',null,'Raw background CHR · grayscale palette');tilesLabel.style.margin='6px 0 3px';result.appendChild(tilesLabel);
  const tiles=element('canvas','reRecoveryTiles');tiles.width=128;tiles.height=128;tiles.style.cssText='width:128px;height:128px;max-width:100%;image-rendering:pixelated;border:1px solid var(--bdr)';tiles.setAttribute('aria-label','Recovered raw background CHR tiles');result.appendChild(tiles);
  const fidelity=element('p',null,'Rebuild adapts the original left/right demo to Forge’s player runtime, including jump/attack controls. It does not recover the original engine or guarantee identical behavior.');fidelity.style.color='var(--dim)';result.appendChild(fidelity);
  const details=element('details',null);details.appendChild(element('summary',null,'Recovery limits and adaptation notes'));const notes=element('ul','reRecoveryNotes');notes.style.cssText='padding-left:16px;margin:5px 0';details.appendChild(notes);result.appendChild(details);
  const importButton=element('button','reRecoveryImport','Import as new project');importButton.type='button';importButton.style.cssText='width:100%;margin:8px 0 3px';importButton.addEventListener('click',importStaged);result.appendChild(importButton);
  result.appendChild(element('p',null,'Replaces the active workspace in one undoable step. You can save your current project first.'));
  const project=element('button','reRecoveryProject','Download Forge project JSON');project.type='button';project.style.cssText='width:100%;margin:3px 0';project.addEventListener('click',()=>{void download('project');});result.appendChild(project);
  const report=element('button','reRecoveryReport','Download inspection report');report.type='button';report.style.cssText='width:100%;margin:3px 0';report.addEventListener('click',()=>{void download('report');});result.appendChild(report);
  result.appendChild(element('p',null,'Forge project JSON opens in Forge. The inspection report contains evidence; it is not a project.'));
  controls={file,analyze,status,result,source,summary,scene,tiles,overlay,collisionHelp,notes,import:importButton,project,report};host.insertBefore(panel,host.firstChild);enable();message('Choose a ROM to preview recovery. Your project stays open.');return panel;
}
F.services.REUI=Object.freeze({mount,selectFile,analyzeFile,importStaged,downloadProject:()=>download('project'),downloadReport:()=>download('report'),getState:()=>Object.freeze({busy:state.busy,staged:!!state.analysis,imported:state.imported,generation:state.generation})});
mount();
})();
