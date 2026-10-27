/* Read-only connections between the current editor, canonical assets and native
 * source receipts. ProjectStore/AssetRegistry still own the assets; native codecs
 * still own validation and writes. Nothing here is serialized or re-signed.
 *
 * Pose usage comes from Metasprite pieces, never fabricated Scene OAM. Native
 * consumers are observations of bounded original shape execution, not a complete
 * runtime dependency graph. The cache contains disposable decoded source evidence.
 */
(() => {
  'use strict';
  const services = Forge.services;
  const copy = value => JSON.parse(JSON.stringify(value));
  const hash = value => /^[a-f0-9]{64}$/.test(value || '');
  const markers = ['nativeResource', 'punchOutContent', 'punchOutState', 'punchOutPose',
    'punchOutIncrementalPose', 'punchOutArt', 'punchOutArena', 'punchOutFight'];
  let cached = null;

  function source(scene, project = S) {
    const meta = scene?.captureMeta, receipt = meta?.nativeAssets || meta?.recovery;
    if (hash(receipt?.source?.sha256)) return {sha256: receipt.source.sha256,
      name: receipt.source.name, profile: receipt.profile || receipt.source.profile,
      sceneId: receipt.sceneId || null, page: receipt.page};
    const marker = markers.map(key => meta?.[key]).find(value => hash(value?.sourceSha256));
    const identity = project.investigation?.source;
    if (!marker || marker.sourceSha256 !== project.nativeGame?.sourceSha256 ||
      identity?.sha256 !== marker.sourceSha256) return null;
    return {sha256: marker.sourceSha256, name: identity.name, profile: identity.profile,
      sceneId: null, page: marker.page};
  }

  function models(project = S) {
    // Cache only while the preserved ROM object and its declared identity match.
    // Buildability is always rechecked by the existing writer at explicit edits.
    if (!cached || cached.rom !== project.importedRom || cached.sha !== project.nativeGame?.sourceSha256) {
      const info = services.NativeResourceProject.validate(project === S ? services.ProjectStore.capture() : project);
      if (info.adapter.kind !== 'punch-out') throw Error('No Punch-Out source evidence for this project.');
      cached = {rom: project.importedRom, sha: info.descriptor.sourceSha256,
        content: PunchOutContent.open(info.bytes), pose: PunchOutPose.open(info.bytes), consumers: null};
    }
    return cached;
  }

  function native(scene, project = S) {
    const identity = source(scene, project), meta = scene?.captureMeta;
    if (!identity || !project.nativeGame?.adapter?.startsWith('punch-out-')) return null;
    const pose = meta.punchOutPose || meta.punchOutIncrementalPose;
    const art = meta.punchOutArt, sprite = meta.punchOutContent || meta.punchOutState;
    let bank = null, fight = null, role = 'source-reference';
    if (pose) {bank = models(project).pose.record(pose.selector).pose.chrBank4KiB; fight = pose.fight; role = 'pose-snapshot';}
    else if (sprite) {bank = sprite.chrBank4KiB; fight = sprite.fight; role = 'sprite-snapshot';}
    else if (art) {role = art.kind === 'chr' ? 'physical-chr-writer' : 'palette-writer';
      if (art.kind === 'chr') bank = art.index; else fight = art.index;}
    const writer = Number.isInteger(bank) ? {kind: 'chr', index: bank,
      sceneId: services.PunchOutArtProject.sceneId('chr', bank)} : null;
    const paletteWriter = Number.isInteger(fight) ? {kind: 'palette', index: fight,
      sceneId: services.PunchOutArtProject.sceneId('palette', fight)} : null;
    return {source: identity, role, bank, fight, selector: pose?.selector ?? null, writer, paletteWriter};
  }

  function selection() {
    const scene = S.scenes?.[S.activeScene], sid = scene?.id || '';
    if (S.tab === 'metasprites') {
      const frame = window.Forge163?.metasprites?.current;
      if (frame) return {key: 'metasprite:' + frame.id, sceneId: frame.sceneId, poseId: frame.id};
    }
    if (S.tab === 'chr') return {key: 'tile:' + (S.chrBank === 'spr' ? 'spr' : 'bg') + ':' + sid + ':' + S.editTile, sceneId: sid};
    if (S.tab === 'anim') return {key: 'animation:' + (S.animations?.[S._selAnim]?.id || '')};
    if (S.tab === 'world') return {key: 'world:' + (window.Forge161?.worlds?.current?.id || '')};
    if (S.tab === 'audio') return {key: 'audio:project'};
    return {key: (S.tab === 'sprites' ? 'sprite:' : S.tab === 'collision' ? 'collision:' : 'scene:') + sid, sceneId: sid};
  }

  function footprint(frame) {
    const uses = [], tiles = new Set(), height = frame?.spriteMode === 16 ? 16 : 8;
    for (const [index, piece] of (frame?.pieces || []).entries()) {
      for (let half = 0; half < height / 8; half++) {
        const tile = half ? piece.tile2 : piece.tile;
        if (!Number.isInteger(tile)) continue;
        tiles.add(tile);
        uses.push({tile, pieceId: piece.id, pieceIndex: index, pal: piece.pal & 3,
          flipH: !!piece.flipH, flipV: !!piece.flipV, behind: !!piece.behind,
          half, displayHalf: piece.flipV ? height / 8 - 1 - half : half});
      }
    }
    return {pieceCount: frame?.pieces?.length || 0, tileIds: [...tiles].sort((a, b) => a - b), uses};
  }

  function chrUsage() {
    const scene = S.scenes?.[S.activeScene], frame = window.Forge163?.metasprites?.current;
    if (!scene || !frame) return null;
    const owner = S.scenes.find(value => value.id === frame.sceneId);
    let origin = null;
    if (S.chrBank === 'spr' && frame.sceneId === scene.id) {
      try {origin = native(owner);} catch (_) {}
    } else {
      const art = scene.captureMeta?.punchOutArt;
      if (S.chrBank !== 'bg' || art?.kind !== 'chr') return null;
      try {origin = native(owner);} catch (_) {return null;}
      if (origin?.bank !== art.index || origin.source.sha256 !== art.sourceSha256) return null;
    }
    return {frame, scene, paletteScene: owner, origin, ...footprint(frame)};
  }

  // Native tile ID mapping is only claimed for known, un-repacked source views.
  // Imported captures and arbitrary authored Scenes remain project-local usage.
  function consumers(bank, tile, project = S) {
    const model = models(project);
    if (!model.consumers) {
      const observations = [], coverage = {decoded: 0, contextRequired: 0, unavailable: 0};
      for (const fight of model.content.fights) for (const record of fight.poses) {
        if (record.status !== 'source-record') {coverage.unavailable++; continue;}
        const pose = model.content.pose(fight.index, record.selector);
        if (pose.status !== 'decoded') {coverage.contextRequired++; continue;}
        coverage.decoded++;
        const tiles = new Set();
        for (const piece of pose.pieces) {
          const first = pose.spriteMode === 16 ? piece.tile & 254 : piece.tile;
          tiles.add(first); if (pose.spriteMode === 16) tiles.add(first + 1);
        }
        observations.push({fight: fight.index, label: fight.label, selector: record.selector,
          bank: pose.chrBank4KiB, tiles: [...tiles]});
      }
      model.consumers = {observations, coverage};
    }
    const byFight = new Map();
    for (const observation of model.consumers.observations) {
      if (observation.bank !== bank || Number.isInteger(tile) && !observation.tiles.includes(tile)) continue;
      const entry = byFight.get(observation.fight) || {fight: observation.fight, label: observation.label, selectors: []};
      entry.selectors.push(observation.selector); byFight.set(entry.fight, entry);
    }
    return {bank, tile: Number.isInteger(tile) ? tile : null, consumers: copy([...byFight.values()]),
      coverage: copy(model.consumers.coverage),
      scope: 'Known initial-mode full poses only. Incremental states, other banking contexts, backgrounds and hidden uses are not exhaustively covered. No observed use does not prove unused.'};
  }

  services.ResourceContext = Object.freeze({source, native, selection, footprint, chrUsage, consumers});
})();
