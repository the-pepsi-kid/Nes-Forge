/*
 * NES FORGE MODULE: src/services/punch-out-fight-recovery.js
 * Connect private source recovery to canonical Scenes through the existing
 * ProjectStore/native-resource owners. Reference copies never own ROM writes.
 * Before re-signing any recovered addition, require a valid preceding build;
 * unsupported user edits must never become an accepted native baseline.
 */
(() => {
  'use strict';
  const services = Forge.services, owner = services.NativeResourceProject;
  const copy = value => JSON.parse(JSON.stringify(value)), sha = NativeEngineFormat.sha256;
  let cached = null, traceCache = null;
  const freeze = value => {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      for (const child of Object.values(value)) freeze(child);
      Object.freeze(value);
    }
    return value;
  };
  function source(project, strict = false) {
    if (!services.PunchOutContentRecovery.matches(project)) throw Error('Open a recovered Punch-Out project first.');
    const info = owner.validate(project);
    let bytes, warning = '';
    try { bytes = owner.build(project).rom; }
    catch (error) {
      if (strict) throw error;
      bytes = info.encoded.bytes;
      warning = 'The current native build refuses: ' + error.message +
        ' This inspection uses the preserved source plus native literal recipes; unsupported Scene work is not included.';
    }
    const outputHash = sha(bytes);
    if (!cached || cached.outputHash !== outputHash) {
      cached = {outputHash, model: PunchOutFight.open(bytes)}; traceCache = null;
    }
    return {...cached, sourceHash: project.nativeGame.sourceSha256, warning};
  }
  function preview(project, selection = {}) {
    const context = source(project), model = context.model;
    const request = selection.kind === 'player-state' ? {
      kind: 'player-state', state: selection.state, maxUpdates: selection.maxUpdates,
      opponent: selection.opponent ?? 0
    } : {kind: 'composition', mac: selection.mac ?? 0, referee: selection.referee === null ? null : selection.referee ?? 144,
      opponent: selection.opponent ?? 0};
    let frame, trace = null, frameIndex = 0;
    if (request.kind === 'player-state') {
      const key = context.outputHash + JSON.stringify(request);
      // Inspection callers must not be able to mutate a cached source frame and
      // have a later recovery re-sign that mutation as source-derived content.
      if (!traceCache || traceCache.key !== key) traceCache = {key,
        result: freeze(model.tracePlayer(request.state, {maxUpdates: request.maxUpdates, opponent: request.opponent}))};
      trace = traceCache.result;
      if (trace.status === 'refused' || !trace.frames.length) throw Error('Native excerpt refused: ' + trace.stop);
      frameIndex = selection.frameIndex ?? 0;
      if (!Number.isInteger(frameIndex) || frameIndex < 0 || frameIndex >= trace.frames.length)
        throw Error('Select an observed excerpt frame.');
      frame = trace.frames[frameIndex];
    } else frame = model.compose(request);
    return {context, selection: {...request, ...(trace ? {frameIndex} : {})}, frame, trace,
      assets: model.project(frame), limits: [...model.limits, ...(context.warning ? [context.warning] : [])]};
  }
  function recover(project, selection) {
    owner.validate(project, {build: true});
    const result = preview(project, selection), p = copy(project);
    const key = sha(new TextEncoder().encode(JSON.stringify([result.context.outputHash, result.selection])));
    const id = 'po-fight-gj-' + key.slice(0, 24);
    const scene = makeScene({...result.assets, id,
      name: 'Glass Joe · fight reference · ' + (result.trace ? 'state ' + result.selection.state + ' update ' + result.frame.update :
        'Mac ' + result.selection.mac + ' / referee ' + (result.selection.referee ?? 'none')),
      entities: [], links: [], sceneType: 'static', scrollDir: 'none', gravity: 0, buildInclude: false,
      buildOrder: 0, captureMeta: {mode: 'native-fight-source-reference', punchOutFight: {
        version: 1, sourceSha256: result.context.sourceHash, nativeOutputSha256: result.context.outputHash,
        selection: result.selection, scrollX: result.frame.scrollX, baseNametable: result.frame.baseNametable,
        mapper: result.frame.mapper, spriteSources: result.assets.spriteSources,
        limits: result.limits, ...(result.trace ? {observedUpdates: result.trace.updates,
          stop: result.trace.stop, audioRequests: copy(result.trace.audioEvents)} : {})
      }}});
    const old = p.scenes.find(s => s.id === id);
    if (old && JSON.stringify(old) !== JSON.stringify(scene)) throw Error('This recovered reference has local changes. Preserve it before recovering again.');
    if (!old) {
      if (p.scenes.length >= 64) throw Error('No free Scene slot. No existing asset was removed.');
      p.scenes.push(scene);
    }
    p.nativeGame.projectionSha256 = owner.projectionSignature(p);
    owner.validate(p, {build: true});
    return {project: p, sceneId: id, limits: result.limits};
  }
  services.PunchOutFightRecovery = Object.freeze({source, preview, recover});
})();
