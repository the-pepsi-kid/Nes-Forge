/* Canonical native pose positions use ordinary Metasprites and a source Scene.
 * The existing native resource owner validates signatures, disjoint spans and
 * source identity. Opening a view never adopts unsupported edits as a baseline.
 * ProjectStore owns save/reopen and Undo/Redo; copied recovery poses stay snapshots.
 */
(() => {
  'use strict';
  const services = Forge.services, owner = services.NativeResourceProject, codec = PunchOutPose;
  const copy = value => JSON.parse(JSON.stringify(value));
  const sceneId = selector => 'po-native-pose-source-f0-s' + selector;
  const frameId = selector => 'po-native-pose-f0-s' + selector;
  const marker = scene => scene.captureMeta?.punchOutPose;
  let cache;
  function source(info) {
    if (!cache || cache.hash !== info.descriptor.sourceSha256)
      cache = {hash: info.descriptor.sourceSha256, model: codec.open(info.bytes)};
    return cache.model;
  }
  function entries(project, info) {
    return project.scenes.filter(marker).map(scene => {
      const m = marker(scene);
      if (Object.keys(m).sort().join(',') !== 'fight,selector,sourceSha256,version' || m.version !== 1 || m.fight !== 0 ||
        m.sourceSha256 !== info.descriptor.sourceSha256 || scene.id !== sceneId(m.selector))
        throw Error('Native pose view has invalid source ownership.');
      const model = source(info), record = model.record(m.selector), baseline = model.frame(m.selector, frameId(m.selector), scene.id);
      const frame = project.metasprites.find(frame => frame.id === baseline.id);
      if (!frame) throw Error('A required native pose frame was removed. Restore it before building.');
      return {scene, frame, baseline, record, model};
    });
  }
  owner.registerSceneEncoder({
    id: 'punch-out-glass-joe-pose-placement-v1',
    matches: (project, info) => info.adapter.kind === 'punch-out' && project.scenes.some(marker),
    views: () => [],
    metaspriteViews(project, info) {return entries(project, info).map(({baseline}) =>
      ({id: baseline.id, originX: baseline.originX, originY: baseline.originY, pieces: baseline.pieces}));},
    spans(project, info) {return entries(project, info).map(({record}) => ({offset: record.offset, length: 2}));},
    encode(bytes, project, info) {
      const list = entries(project, info), edits = list.map(({frame, baseline, record, model}) => model.placement(record.selector, frame, baseline));
      const output = source(info).encode(bytes, edits);
      return {bytes: output, diagnostics: [{severity: 'info', code: 'punch-out-native-pose-position', phase: 'native-encode',
        message: edits.filter(edit => edit.dx || edit.dy).length + ' Glass Joe pose position(s) changed. Only full-pose X/Y operands are written; shared geometry, animation, damage rules and Audio remain intact. Check native playback.'}]};
    }
  });
  function prepare(project, selector) {
    const info = owner.validate(project, {build: true});
    if (info.adapter.kind !== 'punch-out') throw Error('Open a recovered Punch-Out project first.');
    const model = source(info), record = model.record(selector), id = frameId(selector), sid = sceneId(selector);
    if (project.scenes.some(scene => scene.id === sid)) {
      entries(project, info); return {project, frameId: id, sceneId: sid, added: false};
    }
    if (project.metasprites.some(frame => frame.id === id)) throw Error('Native pose frame ID already belongs to another asset.');
    if (project.scenes.length >= 64 || project.metasprites.length >= 256) throw Error('No free Scene or Metasprite slot. Preserve existing work first.');
    const p = copy(project), current = PunchOutContent.open(info.sceneEncoded.bytes), pose = current.pose(0, selector), fight = current.fights[0];
    const colors = Array.from({length: 4}, (_, i) => [fight.palette[16], ...fight.palette.slice(17 + i * 4, 20 + i * 4)]);
    p.scenes.push(makeScene({id: sid, name: 'Native Glass Joe · pose $' + selector.toString(16).toUpperCase().padStart(2, '0') + ' source',
      chr: normalizeTiles(), sprChr: current.chr(pose.chrBank4KiB), pal: Array.from({length: 4}, () => [15,0,0,0]),
      sprPal: colors, nt: Array(960).fill(0), attr: Array(64).fill(0), tileProps: Array(256).fill(0),
      oam: [], entities: [], links: [], buildInclude: false, buildOrder: 0, gravity: 0, scrollDir: 'none', sceneType: 'static',
      captureMeta: {mode: 'native-pose-placement-view', punchOutPose: {version: 1,
        sourceSha256: info.descriptor.sourceSha256, fight: 0, selector}}}));
    p.metasprites.push(model.frame(selector, id, sid));
    p.nativeGame.projectionSha256 = owner.projectionSignature(p);
    owner.validate(p, {build: true});
    return {project: p, frameId: id, sceneId: sid, added: true};
  }
  function describe(project, id) {
    const info = owner.validate(project), entry = entries(project, info).find(entry => entry.frame.id === id);
    if (!entry) return null;
    return {...entry.model.placement(entry.record.selector, entry.frame, entry.baseline), frameId: id, sceneId: entry.scene.id};
  }
  function move(project, id, x, y) {
    const info = owner.validate(project, {build: true}), entry = entries(project, info).find(entry => entry.frame.id === id);
    if (!entry) throw Error('Select a native Glass Joe pose position view.');
    if (![x,y].every(value => Number.isInteger(value) && value >= -128 && value <= 127)) throw Error('Native X/Y offsets must be -128 through 127.');
    const p = copy(project), frame = p.metasprites.find(frame => frame.id === id), dx = x - entry.record.x, dy = y - entry.record.y;
    // Change canonical positions in one project transaction. No hidden delta store.
    frame.originX = 0; frame.originY = 0;
    frame.pieces.forEach((piece, i) => {piece.x = entry.baseline.pieces[i].x + dx; piece.y = entry.baseline.pieces[i].y + dy;});
    owner.validate(p, {build: true}); return p;
  }
  services.PunchOutPoseProject = Object.freeze({prepare, describe, move, sceneId, frameId,
    inventory: () => Array.from({length: 30}, (_, i) => ({selector: i * 2, label: 'Glass Joe · pose $' + (i * 2).toString(16).toUpperCase().padStart(2, '0')}))});
})();
