
/* Thin façade: existing verified APIs retain all emulator and capture behavior. */
(()=>{
  'use strict';
  const services=window.Forge.services;
  services.EmulatorBridge=Object.freeze({
    loadRom:(...args)=>emuLoadRomData(...args),
    loadBuilt:(bytes)=>emuLoadRomData(bytes,'Current project build'),
    buildAndRun:()=>buildAndRun(),runOriginal:()=>runImportedRom(),
    run:()=>{if(!emu.running)return emuToggleRun();},
    pause:()=>emuPause(),step:()=>emuStep(),reset:()=>emuReset(),
    releaseInput:()=>clearEmuKeys(),
    captureRuntime:()=>emuCapture(),captureHybrid:()=>emuCaptureHybrid(),bakeVisible:()=>emuCaptureVisibleFrame()
  });
  const capabilities=Object.freeze({active:false,incrementalCompilation:false,runtimePatching:false});
  services.LiveLink=Object.freeze({capabilities:()=>capabilities,
    apply:()=>{throw Error('LiveLink is inactive in NES Forge '+window.Forge.release.version+'. Runtime patching is unsupported.');}});
})();
