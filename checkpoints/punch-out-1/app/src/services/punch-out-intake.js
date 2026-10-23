/* A completed native frame is the default scene for Punch-Out intake. Source
 * templates remain separate bounded recipes; no screenshot overlay is used. */
(()=>{
'use strict';
const s=Forge.services,previous=s.InvestigationProject,oldImport=importRom;
function supported(bytes){return s.NativeResourceProject.recognizes(bytes)?.id.startsWith('punch-out-')||false;}
async function create(bytes,name){
 if(!supported(bytes))return previous.create(bytes,name);
 const epoch=s.ProjectStore.state.epoch,before=s.ProjectStore.serialize(),source=bytes.slice();
 const p=await previous.create(source,name),check=()=>{if(epoch!==s.ProjectStore.state.epoch||before!==s.ProjectStore.serialize())throw Error('Project changed during scene preparation. Import again.');};check();
 if(!emu.loaded||NativeEngineFormat.sha256(emu.lastBuiltRom)!==NativeEngineFormat.sha256(source)){if(!s.EmulatorBridge.loadRom(source,name,0))throw Error('Original MMC2 source could not be loaded.');}
 emuPause();clearEmuKeys();const reference=emu.lastBuiltRom;
 // Startup PCM lasts ~199 frames; the stable title is visible by frame 600.
 for(let frame=emu.frameCount;frame<600;frame++){if(emu.lastBuiltRom!==reference)throw Error('The loaded ROM changed during capture.');check();emuRunFrame();if((frame&15)===15){document.getElementById('investigationStatus').textContent='Preparing pixel-exact native scene · frame '+emu.frameCount+' / 600';await new Promise(resolve=>setTimeout(resolve,0));}}
 check();const scene=forgeCapture.captureFromTrace();scene.name='Native frame '+scene.captureMeta.frame+' · 1:1 background + sprites';s.NativeResourceProject.attachCapturedScene(p,scene,NativeEngineFormat.sha256(source));
 return p;
}
s.InvestigationProject=Object.freeze({...previous,create});
importRom=function(bytes,name='Imported ROM'){
 if(!supported(bytes))return oldImport.apply(this,arguments);
 return (async()=>{if(Forge15.dirty&&!confirm('Import Punch-Out as a new source project with a pixel-exact native scene? Save the current project first to retain its changes.'))return false;const p=await create(bytes,name);const prepared=s.ProjectStore.prepareLoad(p);if(snapshot()===false)throw Error('Project history could not retain the current project. Save current work first.');s.ProjectStore.commit(prepared,{sync:true,replace:true,intent:'punch-out-pixel-exact-import'});notify('romProjectImport');await s.InvestigationUI.projectChanged();switchTab('scene');document.getElementById('issueStatus').textContent='Imported native frame: 0 background / 0 composite pixels differ. Source Audio is recognized; Save Project As retains both.';return true;})().catch(error=>{reportError(error);return false;});
};
const previousCapture=pushSceneFromCapture;
pushSceneFromCapture=function(scene,options){if(emu.mapper!==9||scene?.captureMeta?.mode!=='runtime-raster')return previousCapture.apply(this,arguments);const source=emu.lastBuiltRom,existing=S.importedRom;if(existing?.length&&NativeEngineFormat.sha256(existing)!==NativeEngineFormat.sha256(source))return reportError(Error('This frame belongs to another source. Use Import ROM to create its own source project.'));const result=previousCapture.apply(this,arguments);if(result&&!existing?.length){S.importedRom=source.slice();broadcastState('capturedSource');void s.InvestigationUI.projectChanged();}return result;};
s.PunchOutIntake=Object.freeze({create,supported,version:1});
})();
