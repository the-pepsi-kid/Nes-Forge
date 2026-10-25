/*
 * NES FORGE MODULE: src/services/punch-out-art-project.js
 * Dedicated canonical Scenes own physical CHR banks or one fight palette table.
 * Existing reference Scenes remain snapshots; new fight previews and the native
 * player consume the encoded output. No copied pose/reference is silently patched.
 * ProjectStore owns history/persistence; NativeResourceProject owns build/signature
 * validation and enforces disjoint physical spans for this registered writer.
 */
(() => {
  'use strict';
  const services = Forge.services, owner = services.NativeResourceProject, art = PunchOutArt;
  const copy = value => JSON.parse(JSON.stringify(value));
  let cache = null;
  const sceneId = (kind, index) => 'po-native-art-' + kind + '-' + index;
  const marker = sc => sc.captureMeta?.punchOutArt;
  function source(info) {
    if (!cache || cache.hash !== info.descriptor.sourceSha256)
      cache = {hash: info.descriptor.sourceSha256, model: art.open(info.bytes)};
    return cache.model;
  }
  function make(info, kind, index) {
    const model = source(info), record = kind === 'chr' ? model.bank(index) : kind === 'palette' ? model.palette(index) : null;
    if (!record) throw Error('Select a native CHR bank or fight palette.');
    const tiles = kind === 'chr' ? record.chr : model.bank(0).chr;
    return makeScene({id: sceneId(kind, index), name: kind === 'chr' ? 'Native artwork · physical CHR bank ' + index :
      'Native palette · ' + record.label, chr: tiles, sprChr: normalizeTiles(),
      pal: kind === 'palette' ? record.pal : [[15, 0, 16, 48], [15, 0, 16, 48], [15, 0, 16, 48], [15, 0, 16, 48]],
      ...(kind === 'palette' ? {sprPal: record.sprPal, bgColor: record.bgColor} : {}),
      // Selection installs a concrete collision buffer. Initialize the canonical
      // zero properties here so merely opening this view cannot change its signature.
      tileProps: Array(256).fill(0),
      nt: Array.from({length: 960}, (_, cell) => (cell % 32 < 16 && cell < 512) ?
        Math.floor(cell / 32) * 16 + cell % 32 : 0), attr: Array(64).fill(0), oam: [], entities: [], links: [],
      sceneType: 'static', scrollDir: 'none', gravity: 0, buildInclude: false, buildOrder: 0,
      captureMeta: {mode: 'native-art-edit-view', punchOutArt: {version: 1,
        sourceSha256: info.descriptor.sourceSha256, kind, index}}});
  }
  function entries(p, info) {
    return p.scenes.filter(marker).map(sc => {
      const m = marker(sc);
      if (Object.keys(m).sort().join(',') !== 'index,kind,sourceSha256,version' || m.version !== 1 ||
        m.sourceSha256 !== info.descriptor.sourceSha256 || sc.id !== sceneId(m.kind, m.index))
        throw Error('Native artwork Scene has invalid source ownership.');
      const baseline = make(info, m.kind, m.index), record = m.kind === 'chr' ? source(info).bank(m.index) : source(info).palette(m.index);
      return {sc, baseline, record, kind: m.kind};
    });
  }
  const matches = (p, info) => info.adapter.kind === 'punch-out' && p.scenes.some(marker);
  owner.registerSceneEncoder({
    id: 'punch-out-physical-art-v1', matches,
    views(p, info) { return entries(p, info).map(({sc, baseline, kind}) => kind === 'chr' ?
      {id: sc.id, chr: baseline.chr} : {id: sc.id, pal: baseline.pal, sprPal: baseline.sprPal, bgColor: baseline.bgColor}); },
    spans(p, info) { return entries(p, info).map(({record, kind}) => ({offset: record.offset, length: kind === 'chr' ? 4096 : 32})); },
    encode(bytes, p, info) {
      const output = bytes.slice(); let changed = 0;
      for (const {sc, record, kind} of entries(p, info)) {
        const data = kind === 'chr' ? art.packChr(sc.chr) : art.paletteBytes(sc, info.bytes.slice(record.offset, record.offset + 32));
        for (let i = 0; i < data.length; i++) if (output[record.offset + i] !== data[i]) changed++;
        output.set(data, record.offset);
      }
      return {bytes: output, diagnostics: [{severity: 'info', code: 'punch-out-native-art', phase: 'native-encode',
        message: changed + ' CHR/palette byte(s) changed in explicitly opened physical art resources. Shared game uses change together; existing reference Scenes retain their source snapshot.'}]};
    }
  });
  function prepare(project, kind, index) {
    const info = owner.validate(project, {build: true});
    if (info.adapter.kind !== 'punch-out') throw Error('Open a recovered Punch-Out project first.');
    const sc = make(info, kind, index), old = project.scenes.find(s => s.id === sc.id);
    if (old) return {project, sceneId: old.id, added: false};
    if (project.scenes.length >= 64) throw Error('No free Scene slot. Preserve existing work before opening another art resource.');
    const p = copy(project); p.scenes.push(sc);
    p.nativeGame.projectionSha256 = owner.projectionSignature(p);
    owner.validate(p, {build: true});
    return {project: p, sceneId: sc.id, added: true};
  }
  services.PunchOutArtProject = Object.freeze({prepare, sceneId,
    inventory(p) { const info = owner.validate(p); if (info.adapter.kind !== 'punch-out') throw Error('Open Punch-Out first.'); return source(info).fights; }});
})();
