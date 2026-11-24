'use strict';
// CAD-PORT-01 acceptance: the translated CadEditor catalog, the shared decoders, recognition on local cartridges, the
// import-time integration through Forge's own intake and library, the verification ledger (re-derived: structure, and
// runtime observation in FCEUX and NES Forge's emulator), and catalog coverage tracked per level.
//   node QA/cad-port-01.cjs [editor.html] [out.json] [cartridge folder] [CadEditor checkout (optional)]
// Commercial cartridges are read from the local folder only; nothing from them is written to the output.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict'), crypto = require('node:crypto'), {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const editor = process.argv[2] || path.join(root, 'NES_Forge.html'), out = process.argv[3], carts = process.argv[4], upstream = process.argv[5] || process.env.CADEDITOR_CHECKOUT || null;
const D = require('../app/src/re/cad-port-decoders.js'), CAT = require('../app/src/re/cad-port-catalog.js'), REV = require('../app/src/re/cad-port-revisions.js');
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const results = [], metrics = {};
async function check(name, fn) { const t0 = Date.now(); try { const detail = await fn(); results.push({name, ok: true, ms: Date.now() - t0, ...(detail ? {detail} : {})}); console.log('PASS', name); }
  catch (e) { results.push({name, ok: false, ms: Date.now() - t0, error: String(e && e.stack || e).slice(0, 1500)}); console.log('FAIL', name, '\n ', String(e && e.message || e).slice(0, 600)); } }
const cartridges = carts && fs.existsSync(carts) ? fs.readdirSync(carts).filter(f => /\.nes$/i.test(f)).sort().map(f => ({name: f, bytes: new Uint8Array(fs.readFileSync(path.join(carts, f)))})).map(c => ({...c, sha256: hash(c.bytes)})) : [];
const bySha = new Map(cartridges.map(c => [c.sha256, c]));

// ---------- synthetic cartridges for the decoders (no commercial data) ----------
function cart(prgBanks = 2, chrBanks = 1, fill = 0) { const r = new Uint8Array(16 + prgBanks * 16384 + chrBanks * 8192).fill(fill); r.set([0x4e, 0x45, 0x53, 0x1a, prgBanks, chrBanks, 0, 0]); return r; }
function rnd(seed) { let s = seed >>> 0; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; }

(async () => {
  await check('catalog: upstream, licence and inventory counts', () => {
    assert.equal(CAT.format, 'NESForgeCadPortCatalog'); assert.equal(CAT.upstream.license, 'MIT'); assert.match(CAT.upstream.copyright, /2018 spiiin/);
    assert.match(CAT.upstream.licenseText, /Permission is hereby granted, free of charge/); assert.match(CAT.upstream.commit, /^[0-9a-f]{40}$/);
    const defs = CAT.games.flatMap(g => g.definitions);
    assert.equal(CAT.games.length, CAT.summary.folders); assert.equal(defs.length, CAT.summary.configs);
    assert.equal(CAT.summary.decodable + CAT.summary.partial + CAT.summary.untranslated, defs.length);
    for (const d of defs) { assert.ok(['decodable', 'partial', 'untranslated'].includes(d.status), d.id); if (d.status === 'decodable') { assert.ok(d.screens && d.blocks, d.id); if (d.screens.cells === 'big-blocks') assert.ok(d.bigBlocks, d.id); assert.ok(!d.gaps.some(g => /^(dump|segaWords|screensCustom)/.test(g)), d.id); } }
    Object.assign(metrics, {titlesListed: CAT.summary.titlesListed, folders: CAT.games.length, foldersMatchedToTitles: CAT.summary.foldersMatchedToTitles, configs: defs.length, decodable: CAT.summary.decodable, partial: CAT.summary.partial, untranslated: CAT.summary.untranslated, gamesWithDecodable: CAT.summary.gamesWithDecodable});
    return {...CAT.summary, gapsText: undefined};
  });
  await check('catalog: knowledge only (no code, no dumped payloads)', () => {
    const text = fs.readFileSync(path.join(root, 'app/src/re/cad-port-catalog.js'), 'utf8');
    assert.ok(!/\bpublic\s+(static\s+)?\w+\s+\w+\s*\(/.test(text), 'C# method text'); assert.ok(!/\.bin\b/i.test(text.replace(/readPalFromBin|\.bin dumps|binary dump/gi, '')), 'a .bin reference');
    let longest = 0; (function walk(v) { if (Array.isArray(v)) { if (v.every(x => typeof x === 'number')) longest = Math.max(longest, v.length); v.forEach(walk); } else if (v && typeof v === 'object') Object.values(v).forEach(walk); })(CAT.games);
    assert.ok(longest <= 32, 'a numeric array longer than a 32-entry palette: ' + longest);
    const palettes = CAT.games.flatMap(g => g.definitions).filter(d => d.palette?.source === 'constant'); for (const p of palettes) assert.ok([16, 32].includes(p.palette.values.length) && p.palette.values.every(v => v >= 0 && v < 64));
    return {bytes: text.length, longestNumericArray: longest, constantPalettes: palettes.length};
  });
  if (upstream && fs.existsSync(path.join(upstream, 'CadEditor/settings_nes'))) await check('translation is deterministic (re-run on the upstream checkout)', () => {
    const tmp = path.join(os.tmpdir(), 'cad-port-catalog-' + process.pid + '.js');
    execFileSync(process.execPath, [path.join(root, 'tools/cad-port/translate.cjs'), upstream, '--out', tmp], {stdio: 'pipe'});
    const same = fs.readFileSync(tmp).equals(fs.readFileSync(path.join(root, 'app/src/re/cad-port-catalog.js'))); fs.unlinkSync(tmp); assert.ok(same, 'the committed catalog differs from a fresh translation'); return {upstream: 'checkout present', identical: true};
  });
  else results.push({name: 'translation is deterministic (re-run on the upstream checkout)', ok: true, skipped: 'no CadEditor checkout supplied (argument 4 or CADEDITOR_CHECKOUT)'});

  await check('decoders: every block format on synthetic data', () => {
    const r = cart(), at = 0x4010; const rng = rnd(7);
    for (let i = 0; i < 4096; i++) r[at + i] = Math.floor(rng() * 256);
    // tiles16 + attribute byte
    let b = D.blocks(r, {format: 'tiles16-attribute-byte', offset: at, count: 4, paletteOffset: at + 2048});
    assert.deepEqual(b[2].tiles, Array.from(r.subarray(at + 32, at + 48))); const a = r[at + 2048 + 2]; assert.deepEqual(b[2].palettes, [a & 3, (a >> 2) & 3, (a >> 4) & 3, a >> 6]);
    // 2x2 palette array, transposed
    b = D.blocks(r, {format: 'linear-2x2-palette-array', offset: at, count: 3, paletteOffset: at + 100, mask: 3, transpose: true});
    assert.deepEqual(b[1].tiles, [r[at + 4], r[at + 6], r[at + 5], r[at + 7]]); assert.deepEqual(b[1].palettes, [r[at + 101] & 3]);
    // linear w x h with trailing palette bytes, column-major
    b = D.blocks(r, {format: 'linear', width: 4, height: 2, transpose: true, attributes: 'trailing', offset: at, count: 2});
    const s = at + 10; assert.deepEqual(b[1].tiles, [r[s], r[s + 2], r[s + 4], r[s + 6], r[s + 1], r[s + 3], r[s + 5], r[s + 7]]); assert.deepEqual(b[1].palettes, [r[s + 8] & 3, r[s + 9] & 3]);
    // aligned arrays
    b = D.blocks(r, {format: 'aligned-arrays-2x2', offset: at, count: 10});
    assert.deepEqual(b[3].tiles, [r[at + 3], r[at + 13], r[at + 23], r[at + 33]]); assert.equal(b[3].palettes[0], r[at + 43] & 3); assert.equal(b[3].type, r[at + 43] >> 4);
    // big blocks with swapped middle and a colour byte
    const g = D.bigBlocks(r, {format: 'linear-2x2', offset: at, count: 5, swapMiddle: true, palette: 'byte-per-big-block', paletteOffset: at + 500});
    assert.deepEqual(g[4].cells, [r[at + 16], r[at + 18], r[at + 17], r[at + 19]]); const c = r[at + 504]; assert.deepEqual(g[4].palettes, [c & 3, (c >> 2) & 3, (c >> 4) & 3, c >> 6]);
    // batch 2: 17-byte interleaved records, computed blocks, masked big-block references
    b = D.blocks(r, {format: 'tiles16-attribute-interleaved', offset: at, count: 3});
    assert.deepEqual(b[2].tiles, Array.from(r.subarray(at + 35, at + 51))); const ia = r[at + 34]; assert.deepEqual(b[2].palettes, [ia & 3, (ia >> 2) & 3, (ia >> 4) & 3, ia >> 6]);
    b = D.blocks(r, {format: 'computed-2x2', count: 20, step: 4, offsets: [0, 2, 1, 3]}); assert.deepEqual(b[5].tiles, [20, 22, 21, 23]); assert.equal(b[5].palettes, null);
    b = D.blocks(r, {format: 'computed-2x2', count: 20, rowLength: 8, rowStride: 32, step: 2, offsets: [0, 16, 1, 17]}); assert.deepEqual(b[9].tiles, [34, 50, 35, 51]);
    const mk = D.bigBlocks(r, {format: 'linear-2x2', offset: at, count: 4, mask: 0x3f, swapMiddle: true});
    assert.deepEqual(mk[3].cells, [r[at + 12] & 63, r[at + 14] & 63, r[at + 13] & 63, r[at + 15] & 63]);
    // batch 3: shifted palette array, column-stored aligned arrays without palette, aligned big blocks with colour bytes after
    b = D.blocks(r, {format: 'linear-2x2-palette-array', offset: at, count: 3, paletteOffset: at + 100, mask: 3, shift: 2}); assert.deepEqual(b[2].palettes, [(r[at + 102] >> 2) & 3]);
    b = D.blocks(r, {format: 'aligned-arrays-2x2', offset: at, count: 10, transpose: true, palette: 'none'}); assert.deepEqual(b[3].tiles, [r[at + 3], r[at + 23], r[at + 13], r[at + 33]]); assert.equal(b[3].palettes, null);
    const al = D.bigBlocks(r, {format: 'aligned-2x2', offset: at, count: 6, palette: 'byte-per-big-block', paletteOffset: at + 24});
    assert.deepEqual(al[2].cells, [r[at + 2], r[at + 8], r[at + 14], r[at + 20]]); const ac = r[at + 26]; assert.deepEqual(al[2].palettes, [ac & 3, (ac >> 2) & 3, (ac >> 4) & 3, ac >> 6]);
    // out of range is refused, never clamped
    assert.throws(() => D.blocks(r, {format: 'tiles16-attribute-byte', offset: r.length - 8, count: 4, paletteOffset: at}), /outside the cartridge/);
    assert.throws(() => D.blocks(r, {format: 'no-such-format', offset: at, count: 1}), /no block decoder/);
  });
  await check('decoders: screens (vertical, word cells, stride), projection and pages', () => {
    const r = cart(), at = 0x5010; for (let i = 0; i < 64; i++) r[at + i] = i;
    let s = D.screens(r, {records: [[at, 1, 6, 2, 3]], vertical: true});   // stored column by column: 3 columns of 2 cells
    assert.equal(s[0].width, 3); assert.equal(s[0].height, 2); assert.deepEqual(s[0].cells, [0, 2, 4, 1, 3, 5]);
    s = D.screens(r, {records: [[at, 2, 4, 4, 1]], word: 2}); assert.deepEqual(s[1].cells, [8 | 9 << 8, 10 | 11 << 8, 12 | 13 << 8, 14 | 15 << 8]);
    s = D.screens(r, {records: [[at, 1, 3, 3, 1]], stride: 2}); assert.deepEqual(s[0].cells, [0, 2, 4]);
    // a 4x4-block screen projects to tiles and attribute bytes exactly
    const blocks = 0x6010, pals = 0x6810; for (let i = 0; i < 8 * 16; i++) r[blocks + i] = (i * 7) & 255; for (let i = 0; i < 8; i++) r[pals + i] = 0b11100100 ^ i;
    const scr = 0x7010; for (let i = 0; i < 8 * 7; i++) r[scr + i] = i % 8;
    const def = {blocks: {format: 'tiles16-attribute-byte', offset: blocks, count: 8, paletteOffset: pals}, screens: {records: [[scr, 1, 56, 8, 7]], cells: 'blocks'}};
    const dec = D.decodeAll(r, def), p = D.project(dec, def, dec.screens[0]), pages = D.pages(p);
    assert.equal(p.cols, 32); assert.equal(p.rows, 28); assert.equal(pages.length, 1);
    for (let cell = 0; cell < 56; cell++) { const bx = cell % 8, by = Math.floor(cell / 8), id = cell % 8; for (let k = 0; k < 16; k++) assert.equal(pages[0].nt[(by * 4 + (k >> 2)) * 32 + bx * 4 + (k & 3)], dec.blocks[id].tiles[k]); assert.equal(pages[0].attr[by * 8 + bx], r[pals + id]); }
    // a screen taller than 30 rows is cut every 28 rows, keeping attribute areas aligned
    const tall = {blocks: def.blocks, screens: {records: [[scr, 1, 16, 2, 8]], cells: 'blocks'}}, d2 = D.decodeAll(r, tall), pg = D.pages(D.project(d2, tall, d2.screens[0]));
    assert.deepEqual(pg.map(x => [x.x, x.y, x.width, x.height]), [[0, 0, 8, 28], [0, 28, 8, 4]]);
  });
  await check('observation matcher: synthetic placements and controls', () => {
    const r = cart(), at = 0x4010, rng = rnd(11); for (let i = 0; i < 4096; i++) r[at + i] = 1 + Math.floor(rng() * 200);
    const scr = 0x6010; for (let i = 0; i < 64; i++) r[scr + i] = Math.floor(rng() * 32);
    const def = {blocks: {format: 'tiles16-attribute-byte', offset: at, count: 32, paletteOffset: at + 1024}, screens: {records: [[scr, 1, 64, 8, 8]], cells: 'blocks'}};
    const dec = D.decodeAll(r, def), proj = dec.screens.map(s => D.project(dec, def, s));
    const place = (p, dx, dy, rows = p.rows) => { const nt = new Uint8Array(4096); for (let y = 0; y < rows; y++) for (let x = 0; x < Math.min(32, p.cols); x++) { const gx = (x + dx) % 64, gy = (y + dy) % 60, n = (gx >= 32 ? 1 : 0) + (gy >= 30 ? 2 : 0); nt[n * 1024 + (gy % 30) * 32 + gx % 32] = p.tiles[y * p.cols + x]; } return nt; };
    const found = D.observeScreens(place(proj[0], 40, 52), proj); assert.equal(found.length, 1); assert.equal(found[0].screen, 0); assert.equal(found[0].matched, found[0].compared);
    assert.equal(D.observeScreens(place(proj[0], 0, 0, 1), proj).length, 0, 'one row (32 tiles, under the 64-tile minimum) is not enough');
    assert.equal(D.observeScreens(place(proj[0], 0, 0, 6), proj).length, 1, 'six rows (one full band, over 64 tiles) are enough');
    const noise = new Uint8Array(4096); for (let i = 0; i < 4096; i++) noise[i] = Math.floor(rng() * 256); assert.equal(D.observeScreens(noise, proj).length, 0, 'random nametables');
    const blank = new Uint8Array(4096); assert.equal(D.observeScreens(blank, proj).length, 0, 'blank nametables');
  });

  // ---------- local cartridges ----------
  const expected = new Map(REV.revisions.map(r => [r.sha256, r.game]));
  await check('recognition on the local cartridges (title hint and structure, or an exact observed revision)', () => {
    if (!cartridges.length) return {skipped: 'no cartridge folder'};
    const rows = [];
    for (const c of cartridges) { const rev = REV.revisions.find(r => r.sha256 === c.sha256); const r = D.recognize(c.bytes, c.name, CAT, rev ? {games: [rev.game]} : {});
      const titled = D.recognize(c.bytes, c.name, CAT);
      rows.push({cartridge: c.name.replace(/\.nes$/i, ''), exact: !!rev, game: rev ? rev.game : titled.game, titleAndStructure: titled.game, candidates: titled.candidates.map(x => x.folder + ' s' + x.supported + '/c' + x.consistent + '/x' + x.contradicted)});
      if (titled.game) assert.equal(titled.game, expected.get(c.sha256), c.name + ' recognized as ' + titled.game);
      if (rev) for (const d of r.candidates[0].definitions) assert.notEqual(d.state, 'contradicted', d.id + ' contradicted on its own revision'); }
    metrics.recognition = rows; return {rows};
  });
  await check('without a title hint, structure alone is not identification (measured)', () => {
    if (!cartridges.length) return {skipped: 'no cartridge folder'};
    let tests = 0, falseSupport = 0, ownSupport = 0; const examples = [];
    for (const c of cartridges) { const r = D.recognize(c.bytes, c.name, CAT, {games: CAT.games.map(g => g.folder)});
      for (const g of r.candidates) { tests += g.definitions.length; if (g.folder === expected.get(c.sha256)) ownSupport += g.supported; else { falseSupport += g.supported; if (g.supported && examples.length < 12) examples.push(c.name.replace(/\.nes$/i, '') + ' ~ ' + g.folder); } } }
    metrics.structureOnly = {tests, falseSupport, ownSupport, rate: Math.round(falseSupport / tests * 1e5) / 1e5};
    assert.ok(falseSupport / tests < 0.01, 'false structural support above 1%');
    return {...metrics.structureOnly, examples};
  });
  await check('verification ledger: structure re-derived for every recorded revision', () => {
    const rows = [];
    for (const r of REV.revisions) { const c = bySha.get(r.sha256); if (!c) { rows.push({revision: r.name, skipped: 'cartridge not in the folder'}); continue; }
      const g = CAT.games.find(x => x.folder === r.game);
      for (const d of r.definitions) { const def = g.definitions.find(x => x.id === d.id); assert.ok(def, d.id); assert.equal(D.applicability(c.bytes, def).state, d.structural, d.id); }
      rows.push({revision: r.name, definitions: r.definitions.length}); }
    return {rows};
  });
  await check('verification ledger: FCEUX observation reproduced', () => {
    const F = require('../tools/agent-lab/independent/fceux.cjs'), s = F.open(); if (!s.available) { s.close?.(); return {blocked: s.reason}; } s.close();
    const rows = [];
    for (const r of REV.revisions.filter(x => x.definitions.some(d => d.fceux?.screens?.length))) { const c = bySha.get(r.sha256); if (!c) continue;
      const tmp = path.join(os.tmpdir(), 'cad-port-obs-' + process.pid + '.json');
      execFileSync(process.execPath, [path.join(root, 'tools/cad-port/observe.cjs'), '--cartridge', path.join(carts, c.name), '--game', r.game, '--engines', 'fceux', '--out', tmp], {stdio: 'pipe', timeout: 600000});
      const o = JSON.parse(fs.readFileSync(tmp, 'utf8')); fs.unlinkSync(tmp); const e = o.engines[0]; assert.ok(!e.blocked, e.blocked);
      for (const d of r.definitions.filter(x => x.fceux?.screens?.length)) { const now = e.definitions.find(x => x.id === d.id); assert.deepEqual(now.observedScreens.filter(v => d.fceux.screens.includes(v)), d.fceux.screens, d.id + ' screens'); }
      rows.push({revision: r.name, definitions: r.definitions.filter(x => x.fceux?.screens?.length).map(x => x.id + ' ' + x.fceux.screens.join(','))}); }
    return {rows};
  });

  // ---------- the editor ----------
  const {load} = require('../app/tests/dom-environment.cjs');
  const file = (name, bytes) => ({name, size: bytes.length, arrayBuffer: async () => Uint8Array.from(bytes).buffer});
  async function until(fn, ms = 120000) { const end = Date.now() + ms; for (;;) { const v = await fn(); if (v) return v; if (Date.now() > end) throw Error('timed out'); await new Promise(r => setTimeout(r, 50)); } }
  await check('editor: import a recognized ROM the usual way; its translated layouts reach the library through the intake', async () => {
    const c = cartridges.find(x => expected.get(x.sha256) === 'tmnt'); if (!c) return {skipped: 'no TMNT cartridge'};
    const a = load(editor), w = a.window, s = w.Forge.services; await new Promise(r => setTimeout(r, 30));
    assert.ok(await s.ProjectGatewayUI.openFile(file(c.name, c.bytes)), 'the normal ROM import');
    const receipt = s.ProjectGatewayUI.report(); assert.equal(receipt.profile, 'tmnt-us-area1-blocks-v1', 'the native profile keeps priority in the intake');
    const row = receipt.rows.find(x => x.resource === 'Translated layouts (CadEditor)'); assert.ok(row, 'the intake row'); assert.match(row.inspect, /left to the native profile/);
    await s.RomImports.record(w.Uint8Array.from(c.bytes), c.name, 'qa');
    const st = await until(() => { const v = s.CadPortRecovery.status(); return v.registered.find(x => x.game === 'tmnt') || (v.last?.error ? v.last : null); });
    assert.ok(st.registered, JSON.stringify(st)); assert.equal(st.skipped.length, 1); assert.match(st.skipped[0].reason, /native profile tmnt-us-area1/);
    const packs = (await w.Forge.commands.run('library.packs')).result, mine = packs.find(p => p.packSha256 === st.packSha256);
    assert.equal(mine.sourceSha256, c.sha256); assert.equal(mine.intake.state, 'accepted'); assert.equal(mine.state, 'complete');
    const again = await s.CadPortRecovery.register(w.Uint8Array.from(c.bytes), c.name, {quiet: true}); assert.ok(again.already, 'deterministic pack: a second import registers nothing new');
    const pack = await s.CadPortRecovery.pack(w.Uint8Array.from(c.bytes), c.name), opened = await s.ExtractionPack.open(pack.zip);
    for (const p of opened.files.resource) { const e = await opened.entry(p); assert.ok(e.data.pages.length >= 1); }
    for (const p of opened.files.project) { const e = await opened.entry(p); assert.equal(e.data.format, 'NESForge'); assert.ok(e.data.scenes.every(sc => sc.captureMeta.cadPort.sourceSha256 === c.sha256)); }
    // the native recovery path is unchanged: the native layout project still opens for this revision
    const native = await s.NativeLayoutProject.create(w.Uint8Array.from(c.bytes), c.name); assert.equal(native.nativeGame.adapter, 'tmnt-us-area1-blocks-v1');
    metrics.tmntPack = {definitions: st.definitions, screens: st.screens, withGraphics: st.withGraphics, editable: st.editable, zipBytes: pack.zip.length, files: pack.files.length};
    return metrics.tmntPack;
  });
  await check('editor: unrecognized and renamed cartridges', async () => {
    if (!cartridges.length) return {skipped: 'no cartridge folder'};
    const a = load(editor), w = a.window, s = w.Forge.services; await new Promise(r => setTimeout(r, 30));
    const rows = [];
    for (const c of cartridges) { const r = s.CadPortRecovery.recognize(w.Uint8Array.from(c.bytes), c.name), renamed = s.CadPortRecovery.recognize(w.Uint8Array.from(c.bytes), 'cartridge.nes');
      assert.equal(!!r.recognized, expected.has(c.sha256) || !!D.recognize(c.bytes, c.name, CAT).game, c.name);
      assert.equal(!!renamed.recognized, expected.has(c.sha256), c.name + ' renamed: only an exact observed revision is recognized without its title');
      rows.push({cartridge: c.name.replace(/\.nes$/i, ''), recognized: !!r.recognized, renamed: !!renamed.recognized, basis: r.basis || null}); }
    const metroid = cartridges.find(c => /metroid/i.test(c.name)); if (metroid) { const g = await s.ProjectGateway.inspect(w.Uint8Array.from(metroid.bytes), {name: metroid.name}); assert.ok(!g.rows.some(x => /Translated layouts/.test(x.resource))); }
    return {rows};
  });
  await check('coverage: tracked separately from implementation and verification', async () => {
    const a = load(editor), w = a.window; await new Promise(r => setTimeout(r, 30));
    const c = (await w.Forge.commands.run('cadport.coverage')).result;
    assert.equal(c.catalog.configs, CAT.summary.configs); assert.equal(c.translated.decodable, CAT.summary.decodable);
    assert.ok(c.structurallyConsistent >= c.runtimeObserved && c.runtimeObserved >= c.independentlyVerified);
    metrics.coverage = {catalog: c.catalog, translated: c.translated, verifiedRevisions: c.verifiedRevisions, structurallyConsistent: c.structurallyConsistent, runtimeObserved: c.runtimeObserved, independentlyVerified: c.independentlyVerified,
      games: c.games.filter(g => g.localRevisions).map(g => ({folder: g.folder, decodable: g.decodable, structurallyConsistent: g.structurallyConsistent, runtimeObserved: g.runtimeObserved, independentlyVerified: g.independentlyVerified}))};
    return metrics.coverage;
  });

  const failed = results.filter(r => !r.ok);
  const report = {suite: 'cad-port-01', editorSha256: hash(fs.readFileSync(editor)), passed: results.length - failed.length, failed: failed.length, results, metrics};
  if (out) fs.writeFileSync(out, JSON.stringify(report, null, 1) + '\n');
  console.log((failed.length ? 'FAILED ' : 'PASSED ') + (results.length - failed.length) + '/' + results.length);
  process.exit(failed.length ? 1 : 0);
})();
