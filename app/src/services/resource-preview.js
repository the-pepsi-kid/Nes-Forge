/* Resources renders the same canonical inputs as the editors. Scene pixels are
 * owned by forgeCapture, CHR appearances by forgeCHR, and poses by Metasprites.
 * This service supplies explicit read-only context; it owns no assets or cache.
 * Native output is an explicit snapshot compile through BuildGraph/RuntimeCompiler
 * followed by the existing title codec. It never patches a source snapshot,
 * commits a build, downloads a ROM, or touches the emulator.
 */
(() => {
  'use strict';
  const services=Forge.services;
  function scene(id) {
    const stored=S.scenes.find(item=>item.id===id);
    if(!stored)throw Error('The preview Scene is no longer available.');
    return stored===S.scenes[S.activeScene]?forgeCapture.liveScene():stored;
  }
  function chr(id,bank) {
    const sc=scene(id),active=S.scenes[S.activeScene]?.id===id&&S.chrBank===bank;
    const frame=Forge163.metasprites.current;
    let pose=null;
    if(active)pose=services.ResourceContext.chrUsage();
    else if(bank==='spr'&&frame?.sceneId===id)
      pose={frame,paletteScene:sc,...services.ResourceContext.footprint(frame)};
    return {...forgeCHR.previewFor(sc,bank,{pose,live:active}),scene:sc,pose,active};
  }
  function nativePose(id) {
    const project=services.ProjectStore.capture(),frame=project.metasprites.find(item=>item.id===id);
    const sc=project.scenes.find(item=>item.id===frame?.sceneId);
    const origin=sc?.captureMeta?.punchOutPose||sc?.captureMeta?.punchOutIncrementalPose;
    if(!origin||origin.fight!==0)throw Error('Current-output pose preview requires a supported native Glass Joe position view.');
    // Compile every current edit, including independent physical CHR/palette
    // writers. A refusal is surfaced; no original-ROM fallback can hide it.
    // Use the exact live compiler entry, whose plan captures a detached source.
    // Reloading through prepareLoad could normalize an invalid edited value and
    // hide a refusal that Build & Run would correctly report.
    const artifact=services.RuntimeCompiler.compile();
    const model=PunchOutPose.open(artifact.rom),record=model.record(origin.selector);
    const outputFrame=model.frame(origin.selector,frame.id,frame.sceneId),palette=record.pose.palette;
    const outputScene={sprChr:PunchOutContent.open(artifact.rom).chr(record.pose.chrBank4KiB),
      sprPal:Array.from({length:4},(_,i)=>[palette[0],...palette.slice(i*4+1,i*4+4)])};
    return {frame:outputFrame,scene:outputScene,bank:record.pose.chrBank4KiB,
      outputSha256:NativeEngineFormat.sha256(artifact.rom),diagnostics:artifact.diagnostics,
      scope:record.kind==='incremental'?'Declared native state path; not a live fight frame.':'Decoded full native pose; not a live fight frame.'};
  }
  services.ResourcePreview=Object.freeze({scene,chr,nativePose});
})();
