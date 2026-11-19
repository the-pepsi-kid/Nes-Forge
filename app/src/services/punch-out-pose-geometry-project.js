/*
 * NES FORGE MODULE: src/services/punch-out-pose-geometry-project.js
 * Entry: Forge.services.PunchOutPoseGeometryProject
 * Purpose: Native writer for Punch-Out full-pose piece geometry (positions, order, tiles, palettes, flips) for any fighter.
 * Connections: PunchOutPoseStreams encodes the native streams; PunchOutContent runs the original dispatcher to verify;
 *   NativeResourceProject owns validation, spans and the build gate; ProjectStore owns history.
 * Contract: an edited pose is written as a new record and new streams in the fighter bank's trailing fill (streams may
 *   use the fixed bank's trailing fill) and its one full-pose table entry is re-pointed. Original records and streams,
 *   which other poses share, are never changed. Every build re-decodes each edited pose through the original routine
 *   and refuses unless the result is exactly the requested layout, and checks that every other full pose is unchanged.
 * Bundle order: app/source-manifest.json; regenerate with app/tools/bundle.py.
 */
(() => {
  'use strict';
  const services = Forge.services, owner = services.NativeResourceProject, codec = PunchOutPoseStreams;
  const copy = value => JSON.parse(JSON.stringify(value));
  const hex = value => value.toString(16).toUpperCase().padStart(2, '0');
  const signed = value => ((value + 128) & 255) - 128;
  const byte = value => value & 255;
  const sceneId = (fight, selector) => 'po-native-geometry-source-f' + fight + '-s' + selector;
  const frameId = (fight, selector) => 'po-native-geometry-f' + fight + '-s' + selector;
  const marker = scene => scene.captureMeta?.punchOutPoseGeometry;
  const FIXED = 16 + 131072 - 24576;               // file offset of CPU $A000 (the fixed 24 KiB)
  // Revisions whose fill space was checked on the owner side against every original full pose and a native run.
  const VERIFIED = Object.freeze(['22ce21aa9c477d87e9cdc386b185f2166b18d438257640aa1d8e75ee9960e06e']);
  let cache;

  function source(info) {
    const hash = info.descriptor.sourceSha256;
    if (cache && cache.hash === hash) return cache.model;
    const bytes = info.bytes, content = PunchOutContent.open(bytes);
    const reader = bank => a => a < 0xa000 ? bytes[16 + bank * 8192 + a - 0x8000] : bytes[FIXED + a - 0xa000];
    const fixedFill = codec.trailingFill(bytes, FIXED + 8192, 0xc000);
    const fights = content.fights.map(f => {
      const fill = codec.trailingFill(bytes, 16 + f.bank8KiB * 8192, 0x8000, 16);
      const poses = new Map();
      for (const record of f.poses) {
        if (record.status !== 'source-record') continue;
        const decoded = codec.interpret(reader(f.bank8KiB), record.address,
          {baseX: f.baseX, baseY: f.baseY, spriteMode: f.spriteMode, chrBank: 5});
        poses.set(record.selector, {record, decoded});
      }
      const slotLimit = Math.max(...[...poses.values()].map(p => p.decoded.slots.length));
      return {fight: f, fill, poses, slotLimit};
    });
    // Fill space must be unread by every original full pose of every fighter.
    const regions = [fixedFill, ...fights.map(f => f.fill)].filter(Boolean);
    const cpuFile = (bank, a) => a < 0xa000 ? 16 + bank * 8192 + a - 0x8000 : FIXED + a - 0xa000;
    for (const f of fights) for (const {decoded} of f.poses.values()) for (const a of decoded.addresses) {
      const o = cpuFile(f.fight.bank8KiB, a);
      if (regions.some(r => o >= r.fileOffset && o < r.fileOffset + r.length))
        throw Error('Punch-Out pose geometry: the fill space is read by an original pose; this revision is not supported.');
    }
    // CHR tile pairs referenced by any decoded full pose or incremental pose (by bank; an incremental stream that does
    // not name its bank counts against every bank its fighter uses).
    const usage = new Map(), mark = (bank, tile) => { if (!usage.has(bank)) usage.set(bank, new Set()); usage.get(bank).add(tile & 254); };
    for (const f of fights) {
      const banks = new Set();
      for (const {decoded} of f.poses.values()) { banks.add(decoded.chrBank4KiB); for (const s of decoded.slots) mark(decoded.chrBank4KiB, s.tile); }
      for (const t of incrementalTiles(reader(f.fight.bank8KiB), f.fight)) {
        if (t.bank !== null) mark(t.bank, t.tile); else for (const b of banks) mark(b, t.tile);
      }
    }
    const model = {content, fights, fixedFill, verified: VERIFIED.includes(hash), cpuFile, usage};
    cache = {hash, model};
    return model;
  }

  /* Tiles named by incremental pose records ($80-$BF with an attribute pointer, $C0-$FF without):
   * [0 | flag dx dy] [attribute pointer] slotOffset count tilePointer x count, in the full-pose tile stream format. */
  function incrementalTiles(read, f) {
    const word = a => read(a) | (read(a + 1) << 8), out = [], step = codec.step(f.spriteMode);
    const lowest = Math.min(...f.poses.filter(p => p.status === 'source-record').map(p => p.address));
    const tables = [[f.shapeTables[1], f.shapeTables[2], true], [f.shapeTables[2], lowest, false]];
    for (const [start, end, attributes] of tables) {
      for (let at = start; at + 1 < end && at < start + 128; at += 2) {
        const record = word(at);
        if (record < 0x8000 || record >= 0xa000) continue;
        let y = read(record) ? 3 : 1;
        if (attributes) y += 2;
        y++;                                         // slot offset
        const count = read(record + y); y++;
        for (let k = 0; k < count && k < 8; k++) {
          let q = word(record + y + k * 2), guard = 0, bank = null;
          for (;;) {
            if (++guard > 256) break;
            const op = read(q++); if (!op) break;
            const n = op & 15, hi = op & 0xf0;
            if (hi === 0) { const t = read(q++); for (let i = 0; i < n; i++) out.push({bank, tile: (t + i * step) & 255}); }
            else if (hi & 0x80) continue;
            else if (hi === 0x20) for (let i = 0; i < n; i++) out.push({bank, tile: read(q++)});
            else bank = read(q++) & 31;
          }
        }
      }
    }
    return out;
  }

  // Physical CHR banks that fighter poses select (bank 0 and the decoder's default bank 5 are not pose art banks).
  const poseBanks = model => [...new Set(model.fights.flatMap(f => [...f.poses.values()].map(p => p.decoded.chrBank4KiB)))]
    .filter(b => b !== 0 && b !== 5).sort((a, b) => a - b);
  // Reserved in every pose bank whatever the poses use: OAM slot 0 draws tile pair $00 from the fighter's current bank
  // and the frame waits for its sprite-0 hit (the status-bar split), and slots 1-2 draw the MMC2 latch tiles $FD/$FE.
  const RESERVED_PAIRS = Object.freeze([0x00, 0xfc, 0xfe]);
  const freePairs = (model, bank, extra = new Set()) => {
    const used = model.usage.get(bank) || new Set(), out = [];
    for (let t = 0; t < 256; t += 2) if (!RESERVED_PAIRS.includes(t) && !used.has(t) && !extra.has(t)) out.push(t);
    return out;
  };

  function lookup(model, fight, selector) {
    const f = model.fights[fight], pose = f?.poses.get(selector);
    if (!pose) throw Error('Select a full pose (selector below $80) of fighter 0-13.');
    return {f, pose};
  }

  // Canonical frame: one piece per visible slot, in OAM order. In 8x16 mode the tile's bit 0 (the CHR half) is kept by
  // slot id, as the ordinary metasprite piece has no field for it.
  function frame(model, fight, selector) {
    const {f, pose} = lookup(model, fight, selector), mode = f.fight.spriteMode;
    return {id: frameId(fight, selector), name: f.fight.label + ' · pose $' + hex(selector) + ' pieces',
      sceneId: sceneId(fight, selector), spriteMode: mode, originX: 0, originY: 0,
      pieces: pose.decoded.slots.filter(s => s.y < 239).map(s => ({id: 'oam-' + s.slot,
        tile: mode === 16 ? s.tile & 254 : s.tile, tile2: mode === 16 ? (s.tile & 254) + 1 : byte(s.tile + 1),
        x: signed(s.x - f.fight.baseX), y: signed(s.y - f.fight.baseY) + 1,
        pal: s.attr & 3, flipH: !!(s.attr & 64), flipV: !!(s.attr & 128), behind: !!(s.attr & 32)}))};
  }

  function entries(project, info) {
    const model = source(info);
    return project.scenes.filter(marker).map(scene => {
      const m = marker(scene);
      const keys = Object.keys(m).filter(k => k !== 'chrBank4KiB').sort().join(',');
      if (keys !== 'fight,selector,sourceSha256,version' || m.version !== 1 ||
        m.sourceSha256 !== info.descriptor.sourceSha256 || scene.id !== sceneId(m.fight, m.selector) ||
        (m.chrBank4KiB !== undefined && !poseBanks(model).includes(m.chrBank4KiB)))
        throw Error('Native pose geometry view has invalid source ownership.');
      const baseline = frame(model, m.fight, m.selector);
      const current = project.metasprites.find(item => item.id === baseline.id);
      if (!current) throw Error('A required native pose geometry frame was removed. Restore it before building.');
      return {scene, frame: current, baseline, fight: m.fight, selector: m.selector, model, chrBank: m.chrBank4KiB};
    });
  }

  const same = (a, b) => JSON.stringify([a.originX, a.originY, a.pieces]) === JSON.stringify([b.originX, b.originY, b.pieces]);

  /* Turn an edited frame into native slots. Throws with the piece and field that cannot be encoded. */
  function slotsFor(entry) {
    const {f, pose} = lookup(entry.model, entry.fight, entry.selector), mode = f.fight.spriteMode;
    const frame = entry.frame, pieces = frame.pieces || [];
    if (frame.spriteMode !== mode) throw Error('Sprite mode must stay ' + mode + ' (the fighter\'s native mode).');
    if (!pieces.length) throw Error('A pose needs at least one piece.');
    if (pieces.length > f.slotLimit) throw Error('This fighter\'s poses use at most ' + f.slotLimit +
      ' sprite slots; the pose has ' + pieces.length + ' pieces.');
    const half = new Map(pose.decoded.slots.map(s => ['oam-' + s.slot, s.tile & 1]));
    const ox = frame.originX | 0, oy = frame.originY | 0;
    const slots = pieces.map((piece, i) => {
      for (const k of ['tile', 'x', 'y', 'pal']) if (!Number.isInteger(piece[k])) throw Error('Piece ' + (i + 1) + ' ' + k + ' must be an integer.');
      if (piece.tile < 0 || piece.tile > 255 || piece.pal < 0 || piece.pal > 3) throw Error('Piece ' + (i + 1) + ' tile or palette is out of range.');
      if (mode === 16 && (piece.tile & 1)) throw Error('Piece ' + (i + 1) + ': 8x16 tiles are even numbers (the pair starts on an even tile).');
      if (mode === 16 && piece.tile2 !== undefined && piece.tile2 !== piece.tile + 1) throw Error('Piece ' + (i + 1) + ': the lower tile of an 8x16 piece is always tile + 1.');
      const x = f.fight.baseX + ox + piece.x, y = f.fight.baseY + oy + piece.y - 1;
      const tile = mode === 16 ? piece.tile | (half.get(piece.id) || 0) : piece.tile;
      // Behind-background is written as each piece says (explicit attribute bytes can express either side).
      return {x: byte(x), y: byte(y), tile, attr: piece.pal | (piece.behind ? 32 : 0) | (piece.flipH ? 64 : 0) | (piece.flipV ? 128 : 0)};
    });
    const derived = [];
    // Keep at least the original slot count so slots this pose used before are hidden, not left stale.
    while (slots.length < pose.decoded.slots.length) slots.push({hidden: true});
    return {slots, derived, chrBank: entry.chrBank ?? pose.decoded.chrBank4KiB};
  }

  function spans(project, info) {
    const list = entries(project, info);
    if (!list.length) return [];
    const model = list[0].model, out = [], seen = new Set();
    const add = (offset, length) => { const key = offset + ':' + length; if (!seen.has(key)) { seen.add(key); out.push({offset, length}); } };
    for (const e of list) {
      const {f} = lookup(model, e.fight, e.selector);
      add(model.cpuFile(f.fight.bank8KiB, f.fight.shapeTables[0] + e.selector), 2);
      if (f.fill) add(f.fill.fileOffset, f.fill.length);
    }
    if (model.fixedFill) add(model.fixedFill.fileOffset, model.fixedFill.length);
    return out;
  }

  function encode(bytes, project, info) {
    const list = entries(project, info).filter(e => !same(e.frame, e.baseline))
      .sort((a, b) => a.fight - b.fight || a.selector - b.selector);
    if (!list.length) return {bytes, diagnostics: []};
    const model = list[0].model;
    if (!model.verified) throw services.BuildDiagnostics.attach(Error('Pose geometry writing is verified for Punch-Out PRG1 only.'),
      {assetId: list[0].frame.id, assetName: list[0].frame.name, resourceKey: 'metasprite:' + list[0].frame.id,
        field: 'pieces', writerRoute: 'punch-out-pose-geometry', repair: 'Undo the piece edits, or use a PRG1 source.'});
    const out = bytes.slice(), cursors = new Map(), notes = [], written = [];
    let fixed = model.fixedFill ? {cpu: model.fixedFill.cpu, end: model.fixedFill.cpu + model.fixedFill.length} : null;
    for (const e of list) {
      const {f} = lookup(model, e.fight, e.selector), bank = f.fight.bank8KiB;
      const refuse = (message, repair) => services.BuildDiagnostics.attach(Error(message), {assetId: e.frame.id,
        assetName: e.frame.name, resourceKey: 'metasprite:' + e.frame.id, field: 'pieces', writerRoute: 'punch-out-pose-geometry', repair});
      let plan;
      try { plan = slotsFor(e); } catch (error) { throw refuse(error.message, 'Change the named piece, or Undo it.'); }
      const streams = codec.encode(plan.slots, {baseX: f.fight.baseX, baseY: f.fight.baseY, spriteMode: f.fight.spriteMode, chrBank: plan.chrBank});
      if (!f.fill) throw refuse('Fighter bank ' + bank + ' has no fill space for a new pose record.', 'Undo the piece edits for this fighter.');
      const cur = cursors.get(bank) || {cpu: f.fill.cpu, end: f.fill.cpu + f.fill.length};
      const streamBytes = streams.geometry.length + streams.attributes.length + streams.tiles.length;
      let recordAt = cur.cpu, at;
      if (cur.cpu + 9 + streamBytes <= cur.end) { at = cur.cpu + 9; cur.cpu += 9 + streamBytes; }
      else if (cur.cpu + 9 <= cur.end && fixed && fixed.cpu + streamBytes <= fixed.end) { at = fixed.cpu; fixed.cpu += streamBytes; cur.cpu += 9; }
      else throw refuse('No fill space left for this pose (' + (9 + streamBytes) + ' bytes).', 'Edit fewer poses of this fighter in one build, or use fewer pieces.');
      cursors.set(bank, cur);
      const put = (cpu, data) => { data.forEach((v, k) => { out[model.cpuFile(bank, cpu + k)] = v; }); };
      const g = at, a = g + streams.geometry.length, t = a + streams.attributes.length;
      put(g, streams.geometry); put(a, streams.attributes); put(t, streams.tiles);
      put(recordAt, [streams.dx, streams.dy, g & 255, g >> 8, a & 255, a >> 8, 1, t & 255, t >> 8]);
      put(f.fight.shapeTables[0] + e.selector, [recordAt & 255, recordAt >> 8]);
      written.push({e, plan, bytes: 9 + streamBytes});
    }
    // Verify through the original dispatcher: edited poses exactly as requested, every other full pose unchanged.
    const before = model.content, after = PunchOutContent.open(out);
    for (const {e, plan} of written) {
      const got = after.pose(e.fight, e.selector);
      plan.slots.forEach((s, i) => {
        const o = (codec.firstSlot + i) * 4, oam = got.oam;
        const ok = s.hidden ? oam[o] === 0xf8 : oam[o] === s.y && oam[o + 1] === s.tile && oam[o + 2] === s.attr && oam[o + 3] === s.x;
        if (!ok) throw services.BuildDiagnostics.attach(Error('The native routine did not reproduce piece ' + (i + 1) + ' of ' + e.frame.name + '.'),
          {assetId: e.frame.id, assetName: e.frame.name, resourceKey: 'metasprite:' + e.frame.id, field: 'pieces', writerRoute: 'punch-out-pose-geometry',
            repair: 'Undo the last piece edit and report this pose.'});
      });
    }
    const edited = new Set(written.map(w => w.e.fight + ':' + w.e.selector));
    for (const f of model.fights) for (const selector of f.poses.keys()) {
      if (edited.has(f.fight.index + ':' + selector)) continue;
      const a = before.pose(f.fight.index, selector).oam, b = after.pose(f.fight.index, selector).oam;
      if (a.some((v, k) => v !== b[k])) throw Error('Punch-Out pose geometry: writing changed another pose (' + f.fight.label + ' $' + hex(selector) + ').');
    }
    const used = written.reduce((n, w) => n + w.bytes, 0);
    return {bytes: out, diagnostics: [{severity: 'info', code: 'punch-out-native-pose-geometry', phase: 'native-encode',
      message: written.length + ' pose layout(s) re-encoded (' + used + ' bytes of fill space): ' + written.map(w => w.e.frame.name).join('; ') +
        '. Original streams are untouched. Incremental poses still patch sprite slots by number on top of the full pose before them; check native playback.' +
        (notes.length ? ' ' + notes.join('. ') + '.' : '')}]};
  }

  owner.registerSceneEncoder({
    id: 'punch-out-pose-geometry-v1',
    capability: {adapterKind: 'punch-out', title: 'Pose piece layout (every fighter)', route: 'punch-out-pose-geometry',
      scope: 'Full poses (selector below $80) of all 14 fights: piece positions, order, count, tiles, palettes, flips and behind-background. Incremental poses, animation timing, damage and collision rules have no writer here.'},
    matches: (project, info) => info.adapter.kind === 'punch-out' && project.scenes.some(marker),
    views: () => [],
    metaspriteViews(project, info) {
      return entries(project, info).map(({baseline}) => ({id: baseline.id, originX: baseline.originX, originY: baseline.originY, pieces: baseline.pieces}));
    },
    spans,
    encode
  });

  function sourceScene(info, model, fight, selector, bytes, chrBank) {
    const {f, pose} = lookup(model, fight, selector), pal = f.fight.palette;
    return makeScene({id: sceneId(fight, selector), name: f.fight.label + ' · pose $' + hex(selector) + ' source',
      chr: normalizeTiles(), sprChr: PunchOutContent.open(bytes).chr(chrBank ?? pose.decoded.chrBank4KiB),
      pal: Array.from({length: 4}, () => [15, 0, 0, 0]),
      sprPal: Array.from({length: 4}, (_, i) => [pal[16], ...pal.slice(17 + i * 4, 20 + i * 4)]),
      nt: Array(960).fill(0), attr: Array(64).fill(0), tileProps: Array(256).fill(0), oam: [], entities: [], links: [],
      buildInclude: false, buildOrder: 0, gravity: 0, scrollDir: 'none', sceneType: 'static',
      captureMeta: {mode: 'native-pose-geometry-view',
        punchOutPoseGeometry: {version: 1, sourceSha256: info.descriptor.sourceSha256, fight, selector,
          ...(chrBank === undefined ? {} : {chrBank4KiB: chrBank})}}});
  }

  function prepare(project, fight, selector) {
    const info = owner.validate(project, {build: true});
    if (info.adapter.kind !== 'punch-out') throw Error('Open a recovered Punch-Out project first.');
    const model = source(info);
    lookup(model, fight, selector);
    const sid = sceneId(fight, selector), id = frameId(fight, selector);
    if (project.scenes.some(scene => scene.id === sid)) { entries(project, info); return {project, frameId: id, sceneId: sid, added: false}; }
    if (fight === 0 && project.scenes.some(scene => scene.captureMeta?.punchOutPose?.selector === selector))
      throw Error('Glass Joe pose $' + hex(selector) + ' already has a position view. Use one writer per pose.');
    if (project.metasprites.some(item => item.id === id)) throw Error('Native pose geometry frame ID already belongs to another asset.');
    if (project.scenes.length >= 64 || project.metasprites.length >= 256) throw Error('No free Scene or Metasprite slot. Preserve existing work first.');
    const p = copy(project);
    p.scenes.push(sourceScene(info, model, fight, selector, info.sceneEncoded.bytes));
    p.metasprites.push(frame(model, fight, selector));
    p.nativeGame.projectionSha256 = owner.projectionSignature(p);
    owner.validate(p, {build: true});
    return {project: p, frameId: id, sceneId: sid, added: true};
  }

  function describe(project, id) {
    const info = owner.validate(project), entry = entries(project, info).find(e => e.frame.id === id);
    if (!entry) return null;
    const {f, pose} = lookup(entry.model, entry.fight, entry.selector);
    return {frameId: id, sceneId: entry.scene.id, fight: entry.fight, fighter: f.fight.label, selector: entry.selector,
      spriteMode: f.fight.spriteMode, chrBank4KiB: pose.decoded.chrBank4KiB, slots: pose.decoded.slots.length, slotLimit: f.slotLimit,
      changed: !same(entry.frame, entry.baseline), fillBytes: f.fill ? f.fill.length : 0,
      fixedFillBytes: entry.model.fixedFill ? entry.model.fixedFill.length : 0, verifiedRevision: entry.model.verified};
  }

  /* Replace a geometry frame's pieces in one committed change (callers commit the returned project). */
  function setPieces(project, id, pieces, origin) {
    const info = owner.validate(project, {build: true}), p = copy(project);
    const entry = entries(p, info).find(e => e.frame.id === id);
    if (!entry) throw Error('Select a native pose geometry view.');
    entry.frame.pieces = copy(pieces);
    if (origin) { entry.frame.originX = origin.x | 0; entry.frame.originY = origin.y | 0; }
    slotsFor(entry);
    owner.validate(p, {build: true});
    return p;
  }

  /* Half-size artwork: compose the pose as drawn (lower OAM slots on top), scale it to half, re-tile it per palette into
   * 8x16 pieces placed in CHR tile pairs that no decoded full or incremental pose of any fighter uses, and write the
   * pixels through the physical CHR bank view and the layout through this writer. The feet stay where they were.
   * Returns the committed-ready project; nothing else in the bank changes. */
  function halfSize(project, fight, selector) {
    let p = prepare(project, fight, selector).project;
    const info = owner.validate(p, {build: true}), model = source(info);
    const {f, pose} = lookup(model, fight, selector), mode = f.fight.spriteMode, bank = pose.decoded.chrBank4KiB;
    if (mode !== 16) throw Error('Half-size artwork supports fighters drawn with 8x16 sprites.');
    const visible = pose.decoded.slots.filter(s => s.y < 239 && s.tile !== codec.blankTile(mode));
    if (visible.some(s => s.tile & 1)) throw Error('This pose also draws from the other CHR half; pick a pose drawn from one bank.');
    // Art comes from the pose's current bank (or its view's bank), as edited so far.
    const view = entries(p, info).find(e => e.fight === fight && e.selector === selector);
    const fromBank = view.chrBank ?? bank;
    const sourceArt = p.scenes.find(sc => sc.id === services.PunchOutArtProject.sceneId('chr', fromBank))?.chr ||
      PunchOutContent.open(info.sceneEncoded.bytes).chr(fromBank);
    const bx = f.fight.baseX, by = f.fight.baseY;
    const rel = visible.map(s => ({...s, rx: signed(s.x - bx), ry: signed(s.y - by)}));
    const minX = Math.min(...rel.map(s => s.rx)), minY = Math.min(...rel.map(s => s.ry));
    const W = Math.max(...rel.map(s => s.rx)) + 8 - minX, H = Math.max(...rel.map(s => s.ry)) + 16 - minY;
    const canvas = Array.from({length: H}, () => Array(W).fill(null));
    for (const s of [...rel].reverse()) {
      const flipH = s.attr & 64, flipV = s.attr & 128;
      for (let half = 0; half < 2; half++) {
        const tile = sourceArt[(s.tile & 254) + (flipV ? 1 - half : half)];
        for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
          const v = tile[flipV ? 7 - y : y][flipH ? 7 - x : x];
          if (v) canvas[s.ry - minY + half * 8 + y][s.rx - minX + x] = {pal: s.attr & 3, v};
        }
      }
    }
    const W2 = Math.ceil(W / 2), H2 = Math.ceil(H / 2), small = Array.from({length: H2}, () => Array(W2).fill(null));
    for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) {
      const votes = new Map();
      for (const [dy, dx] of [[0, 0], [0, 1], [1, 0], [1, 1]]) {
        const c = canvas[y * 2 + dy]?.[x * 2 + dx]; if (!c) continue;
        const key = c.pal * 4 + c.v; votes.set(key, (votes.get(key) || 0) + 1);
      }
      const total = [...votes.values()].reduce((n, v) => n + v, 0);
      if (total < 2) continue;
      const [key] = [...votes.entries()].sort((a, b) => b[1] - a[1])[0];
      small[y][x] = {pal: key >> 2, v: key & 3};
    }
    // feet stay put: bottom centre of the scaled image = bottom centre of the original
    const x0 = Math.round(minX + W / 2 - W2 / 2), y0 = minY + H - H2;
    const pieces = [];
    for (let pal = 0; pal < 4; pal++) for (let cy = 0; cy < H2; cy += 16) for (let cx = 0; cx < W2; cx += 8) {
      const cell = Array.from({length: 16}, (_, y) => Array.from({length: 8}, (_, x) => {
        const c = small[cy + y]?.[cx + x]; return c && c.pal === pal ? c.v : 0; }));
      if (cell.some(row => row.some(Boolean))) pieces.push({pal, x: x0 + cx, y: y0 + cy, cell});
    }
    pieces.sort((a, b) => a.y - b.y || a.x - b.x);
    // Target bank: the pose's own, then the fighter's other banks, then other fighters' pose banks; the first with
    // enough tile pairs that no decoded pose uses, no other layout view in this project uses, and nobody has drawn on.
    const fighterBanks = [...new Set([...f.poses.values()].map(q => q.decoded.chrBank4KiB))];
    const candidates = [bank, ...fighterBanks.filter(b => b !== bank), ...poseBanks(model).filter(b => !fighterBanks.includes(b))]
      .filter(b => poseBanks(model).includes(b));
    const original = PunchOutContent.open(info.bytes);
    const freeIn = b => {
      const extra = new Set(), artView = p.scenes.find(sc => sc.id === services.PunchOutArtProject.sceneId('chr', b));
      for (const e of entries(p, info)) if ((e.chrBank ?? lookup(model, e.fight, e.selector).pose.decoded.chrBank4KiB) === b &&
        !(e.fight === fight && e.selector === selector)) for (const piece of e.frame.pieces) extra.add(piece.tile & 254);
      const chr = original.chr(b);
      return freePairs(model, b, extra).filter(t => !artView || [t, t + 1].every(i => JSON.stringify(artView.chr[i]) === JSON.stringify(chr[i])));
    };
    const ranked = candidates.map(b => ({b, free: freeIn(b)}));
    const target = ranked.find(r => r.free.length >= pieces.length);
    if (!target) throw Error('Half size needs ' + pieces.length + ' unused tile pairs in one CHR bank; the most any of this fighter\'s or other fighters\' pose banks has is ' +
      Math.max(...ranked.map(r => r.free.length)) + '.');

    const free = target.free, chrBank = target.b;
    if (chrBank !== (view.chrBank ?? bank)) {
      // Record the bank on the view (its source Scene shows that bank) and re-sign the projection.
      const sc = p.scenes.find(item => item.id === view.scene.id);
      sc.captureMeta.punchOutPoseGeometry = {...sc.captureMeta.punchOutPoseGeometry, chrBank4KiB: chrBank};
      sc.sprChr = PunchOutContent.open(info.sceneEncoded.bytes).chr(chrBank);
      p.nativeGame.projectionSha256 = owner.projectionSignature(p);
      owner.validate(p, {build: true});
    }
    p = services.PunchOutArtProject.prepare(p, 'chr', chrBank).project;
    const art = p.scenes.find(sc => sc.id === services.PunchOutArtProject.sceneId('chr', chrBank));
    const frame = p.metasprites.find(item => item.id === frameId(fight, selector));
    let low = false;
    frame.pieces = pieces.map((piece, i) => {
      const t = free[i];
      art.chr[t] = piece.cell.slice(0, 8); art.chr[t + 1] = piece.cell.slice(8);
      if (by + piece.y >= codec.lowLine) low = true;
      return {id: 'half-' + (i + 1), tile: t, tile2: t + 1, x: piece.x, y: piece.y + 1, pal: piece.pal,
        flipH: false, flipV: false, behind: low};
    });
    frame.originX = 0; frame.originY = 0;
    owner.validate(p, {build: true});
    return {project: p, frameId: frame.id, artSceneId: art.id, chrBank4KiB: chrBank, originalChrBank4KiB: bank, pieces: frame.pieces.length,
      originalPieces: visible.length, tilePairs: free.slice(0, pieces.length), unusedTilePairsLeft: free.length - pieces.length,
      bankAlsoUsedBy: model.fights.filter(x => [...x.poses.values()].some(q => q.decoded.chrBank4KiB === chrBank)).map(x => x.fight.label)};
  }

  /* Full poses per fighter, for pickers. Read-only. */
  function poses(project) {
    const info = owner.validate(project);
    if (info.adapter.kind !== 'punch-out') return [];
    return source(info).fights.map(f => ({fight: f.fight.index, label: f.fight.label,
      selectors: [...f.poses.keys()].sort((a, b) => a - b)}));
  }

  services.PunchOutPoseGeometryProject = Object.freeze({prepare, describe, setPieces, halfSize, poses, sceneId, frameId, verifiedRevisions: VERIFIED});
})();
