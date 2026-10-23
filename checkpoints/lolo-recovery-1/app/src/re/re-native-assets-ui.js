/* Explicit physical-CHR preview/import beside general analysis. */
(()=>{
'use strict';
const services=window.Forge.services;let controls=null,staged=null,source=null;
const make=(tag,id,text)=>{const node=document.createElement(tag);if(id)node.id=id;if(text!==undefined)node.textContent=text;return node;};
function status(text,error=false){if(controls){controls.status.textContent=text;controls.status.style.color=error?'var(--err, #ff9898)':'var(--dim)';}}
function preview(){
  try{const analysis=services.REAnalysisUI.currentAnalysis();if(!analysis)throw Error('Open a ROM for general analysis first.');const firstTile=services.REAnalysisUI.getState().chrFirst;staged=services.RENativeAssets.stage(analysis,{firstTile});source=analysis;controls.import.disabled=false;
    const r=staged.report;controls.summary.textContent=r.source.name+'\nSHA-256 '+r.source.sha256+'\nPhysical tiles '+r.firstTile+'–'+(r.firstTile+r.tileCount-1)+' · source file offset '+r.encodedSpan.start+' · '+r.encodedSpan.length+' bytes\nBitplane round-trip verified. Source palette, visible bank, maps, collision, gameplay and audio remain unknown.';
    status('Preview ready. Import adds an editable tile sheet and keeps the existing scenes.');return true;
  }catch(error){staged=null;source=null;controls.import.disabled=true;controls.summary.textContent='';status(error.message||String(error),true);return false;}
}
function importTiles(){try{if(!staged)throw Error('Preview the physical tile range first.');if(source!==services.REAnalysisUI.currentAnalysis())throw Error('The inspected ROM changed. Preview this tile range again.');const result=services.RENativeAssets.importStaged(staged);controls.import.disabled=true;status('Added '+result.tileCount+' editable background tiles. Open CHR to edit them; Save Project As preserves their source evidence. Undo removes this sheet. Its grayscale palette and tile layout are authored; it is excluded from ROM builds until you choose to use it.');return result;}catch(error){status(error.message||String(error),true);return false;}}
function activeScene(){const p=services.ProjectStore.capture();return p.scenes[p.activeScene||0];}
async function downloadEdited(){try{const sc=activeScene(),result=services.RENativeAssets.exportEditedChr(sc?.id);const saved=await forgeSave.request(new Uint8Array(result.bytes),'CHR-'+result.firstTile+'-'+result.tileCount+'-edited.chr','application/octet-stream');status(saved?.status==='cancelled'?'Save cancelled. Editable tiles remain available.':'Raw edited CHR export requested. Source ROM bytes are unchanged.');return saved;}catch(error){status(error.message||String(error),true);return false;}}
async function downloadReport(){try{const sc=activeScene(),candidate=sc?.captureMeta?.recovery||staged?.report;if(!candidate)throw Error('Preview or select an imported CHR sheet first.');const report=services.RENativeAssets.validateRecovery(candidate);const result=await forgeSave.request(new TextEncoder().encode(JSON.stringify(report,null,2)),'CHR-'+report.firstTile+'-recovery-evidence.json','application/json');status(result?.status==='cancelled'?'Save cancelled. Recovery evidence remains available.':'Recovery evidence export requested.');return result;}catch(error){status(error.message||String(error),true);return false;}}
function mount(){
  if(controls)return controls.panel;const host=document.getElementById('reAnalysisChrDetails');if(!host)return null;
  const panel=make('section','reNativeAssetsPanel');panel.setAttribute('aria-label','Recover native CHR graphics');panel.appendChild(make('h3',null,'Recover native CHR graphics'));
  panel.appendChild(make('p',null,'Preview the current 256-tile page, then import it as a new editable tile sheet. This works from physical CHR ROM even when an engine or mapper cannot run. CHR RAM and compressed graphics require other methods.'));
  const actions=make('div');actions.className='re-analysis-actions';panel.appendChild(actions);
  const button=(id,title,fn)=>{const el=make('button',id,title);el.type='button';el.addEventListener('click',fn);actions.appendChild(el);return el;};
  const previewButton=button('reNativeAssetsPreview','Preview native tile import',preview),importButton=button('reNativeAssetsImport','Import as new tile sheet',importTiles);importButton.disabled=true;
  button('reNativeAssetsExportChr','Download active sheet CHR',()=>{void downloadEdited();});button('reNativeAssetsExportReport','Download recovery evidence',()=>{void downloadReport();});
  const summary=make('p','reNativeAssetsSummary');summary.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere';const message=make('p','reNativeAssetsStatus');message.setAttribute('role','status');message.setAttribute('aria-live','polite');panel.append(summary,message);host.appendChild(panel);
  controls={panel,preview:previewButton,import:importButton,summary,status:message};status('Use General ROM Analysis → Raw CHR patterns → Preview native tile import.');return panel;
}
services.RENativeAssetsUI=Object.freeze({mount,preview,importTiles,downloadEdited,downloadReport,getState:()=>Object.freeze({staged:!!staged,sceneId:staged?.report.sceneId||null})});mount();
})();
