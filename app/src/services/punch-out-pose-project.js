/* Native pose positions are ordinary Metasprites plus a source-art Scene.
 * NativeResourceProject owns source/signature/span validation. ProjectStore
 * owns saving and history; the UI commits each returned detached project once.
 *
 * Incremental views use a distinct marker so a previous full-pose-only reader
 * can preserve their ordinary assets and refuse unsupported native building.
 * The idle helper edits three canonical frames; it stores no parallel recipe.
 */
(() => {
  'use strict';
  const services = Forge.services, owner = services.NativeResourceProject, codec = PunchOutPose;
  const copy = value => JSON.parse(JSON.stringify(value));
  const prefix = selector => selector >= 128 ? 'po-native-incremental-pose' : 'po-native-pose';
  const sceneId = selector => prefix(selector) + '-source-f0-s' + selector;
  const frameId = selector => prefix(selector) + '-f0-s' + selector;
  const marker = scene => scene.captureMeta?.punchOutPose || scene.captureMeta?.punchOutIncrementalPose;
  let cache;

  function source(info) {
    if (!cache || cache.hash !== info.descriptor.sourceSha256)
      cache = {hash: info.descriptor.sourceSha256, model: codec.open(info.bytes)};
    return cache.model;
  }

  function entries(project, info) {
    return project.scenes.filter(marker).map(scene => {
      const m = marker(scene);
      if (scene.captureMeta.punchOutPose && scene.captureMeta.punchOutIncrementalPose ||
        Object.keys(m).sort().join(',') !== 'fight,selector,sourceSha256,version' ||
        m.version !== 1 || m.fight !== 0 || m.sourceSha256 !== info.descriptor.sourceSha256 ||
        scene.id !== sceneId(m.selector)) throw Error('Native pose view has invalid source ownership.');
      const model = source(info), record = model.record(m.selector);
      if ((record.kind === 'incremental') !== !!scene.captureMeta.punchOutIncrementalPose)
        throw Error('The native pose marker does not match its full/incremental source record.');
      const baseline = model.frame(m.selector, frameId(m.selector), scene.id);
      const frame = project.metasprites.find(frame => frame.id === baseline.id);
      if (!frame) throw Error('A required native pose frame was removed. Restore it before building.');
      return {scene, frame, baseline, record, model};
    });
  }

  owner.registerSceneEncoder({
    id: 'punch-out-glass-joe-pose-placement-v1',
    capability: {adapterKind: 'punch-out', title: 'Glass Joe pose positions', route: 'punch-out-pose',
      scope: 'Whole-pose X/Y for 30 full poses and five explicit incremental poses; grouped idle $C0/$C2/$C4. Piece geometry, native animation, attack and collision rules have no writer here.'},
    matches: (project, info) => info.adapter.kind === 'punch-out' && project.scenes.some(marker),
    views: () => [],
    metaspriteViews(project, info) {
      return entries(project, info).map(({baseline}) => ({id: baseline.id,
        originX: baseline.originX, originY: baseline.originY, pieces: baseline.pieces}));
    },
    spans(project, info) {
      return entries(project, info).map(({record}) => ({offset: record.offset, length: 2}));
    },
    encode(bytes, project, info) {
      const edits = entries(project, info).map(({frame, baseline, record, model}) =>
        model.placement(record.selector, frame, baseline));
      return {bytes: source(info).encode(bytes, edits), diagnostics: [{severity: 'info',
        code: 'punch-out-native-pose-position', phase: 'native-encode',
        message: edits.filter(edit => edit.dx || edit.dy).length +
          ' Glass Joe pose position(s) changed. Only owned full/incremental X/Y operands are written; source flags, inherited tile streams, timing, damage rules and Audio remain intact. Native priority follows the original position rule. Check native playback.'}]};
    }
  });

  // Called only after validating the old project. Each new source view receives
  // current encoded CHR/colors, while its canonical position baseline comes from
  // the preserved source. Copied source artwork is not another native art writer.
  function addView(project, info, selector, current) {
    const model = source(info), record = model.record(selector);
    const id = frameId(selector), sid = sceneId(selector);
    if (project.scenes.some(scene => scene.id === sid)) {
      entries(project, info); return {frameId: id, sceneId: sid, added: false};
    }
    if (project.metasprites.some(frame => frame.id === id))
      throw Error('Native pose frame ID already belongs to another asset.');
    if (project.scenes.length >= 64 || project.metasprites.length >= 256)
      throw Error('No free Scene or Metasprite slot. Preserve existing work first.');
    const pose = current.record(selector).pose;
    const colors = Array.from({length: 4}, (_, i) =>
      [pose.palette[0], ...pose.palette.slice(i * 4 + 1, i * 4 + 4)]);
    const baseline = model.frame(selector, id, sid);
    const key = record.kind === 'incremental' ? 'punchOutIncrementalPose' : 'punchOutPose';
    project.scenes.push(makeScene({id: sid, name: baseline.name + ' source',
      chr: normalizeTiles(), sprChr: PunchOutContent.open(info.sceneEncoded.bytes).chr(pose.chrBank4KiB),
      pal: Array.from({length: 4}, () => [15,0,0,0]), sprPal: colors,
      nt: Array(960).fill(0), attr: Array(64).fill(0), tileProps: Array(256).fill(0),
      oam: [], entities: [], links: [], buildInclude: false, buildOrder: 0, gravity: 0,
      scrollDir: 'none', sceneType: 'static', captureMeta: {
        mode: record.kind === 'incremental' ? 'native-incremental-pose-placement-view' : 'native-pose-placement-view',
        [key]: {version: 1, sourceSha256: info.descriptor.sourceSha256, fight: 0, selector}}}));
    project.metasprites.push(baseline);
    return {frameId: id, sceneId: sid, added: true};
  }

  function prepare(project, selector) {
    const info = owner.validate(project, {build: true});
    if (info.adapter.kind !== 'punch-out') throw Error('Open a recovered Punch-Out project first.');
    source(info).record(selector);
    const p = copy(project), result = addView(p, info, selector, codec.open(info.sceneEncoded.bytes));
    if (!result.added) return {project, ...result};
    p.nativeGame.projectionSha256 = owner.projectionSignature(p);
    owner.validate(p, {build: true});
    return {project: p, ...result};
  }

  function describe(project, id) {
    const info = owner.validate(project), entry = entries(project, info).find(entry => entry.frame.id === id);
    if (!entry) return null;
    return {...entry.model.placement(entry.record.selector, entry.frame, entry.baseline),
      frameId: id, sceneId: entry.scene.id, chrBank4KiB: entry.record.pose.chrBank4KiB};
  }

  function setPosition(entry, x, y) {
    if (![x,y].every(value => Number.isInteger(value) && value >= -128 && value <= 127))
      throw Error('Native X/Y offsets must be -128 through 127.');
    // The codec also derives the C-family priority flags from the original
    // screen divider, keeping the canonical preview aligned with source logic.
    Object.assign(entry.frame, entry.model.moveFrame(entry.record.selector, entry.frame, x, y));
  }

  function move(project, id, x, y) {
    const info = owner.validate(project, {build: true}), p = copy(project);
    const entry = entries(p, info).find(entry => entry.frame.id === id);
    if (!entry) throw Error('Select a native Glass Joe pose position view.');
    setPosition(entry, x, y);
    owner.validate(p, {build: true});
    return p;
  }

  function moveIdle(project, id, x, y) {
    const info = owner.validate(project, {build: true});
    const active = entries(project, info).find(entry => entry.frame.id === id);
    if (!active || !codec.idleSelectors.includes(active.record.selector))
      throw Error('Select idle pose $C0, $C2 or $C4 before moving the idle set.');
    const old = active.model.placement(active.record.selector, active.frame, active.baseline);
    const dx = x - old.x, dy = y - old.y, p = copy(project);
    const current = codec.open(info.sceneEncoded.bytes);
    let added = false;
    for (const selector of codec.idleSelectors) added = addView(p, info, selector, current).added || added;
    for (const entry of entries(p, info).filter(entry => codec.idleSelectors.includes(entry.record.selector))) {
      const before = entry.model.placement(entry.record.selector, entry.frame, entry.baseline);
      setPosition(entry, before.x + dx, before.y + dy);
    }
    // Only derived new views and owned position fields changed after the initial
    // validation. Re-sign additions, then independently validate actual encoding.
    if (added) p.nativeGame.projectionSha256 = owner.projectionSignature(p);
    owner.validate(p, {build: true});
    return p;
  }

  services.PunchOutPoseProject = Object.freeze({prepare, describe, move, moveIdle, sceneId, frameId,
    idleSelectors: codec.idleSelectors, inventory: () => codec.inventory()});
})();
