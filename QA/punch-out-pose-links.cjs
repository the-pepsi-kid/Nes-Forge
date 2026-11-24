'use strict';
// Owner-side (needs Mike Tyson's Punch-Out!! (U) PRG 1; PRG 0 is checked too when present): the fighters' decoded poses
// are library entries, and the sprites a captured frame drew link to them, in agreement with the game itself.
//   node QA/punch-out-pose-links.cjs <editor.html> <report.json> <cartridge directory> [screenshot directory]
// 1. The recovered catalog (each revision): registered through the library's automatic completion path, with one pose
//    entry per full-pose record, the fights, the 32 CHR banks and the RAM labels; a second completion finds it complete.
// 2. Every drawing against the cartridge (this test reads the bytes itself): each drawn piece's pattern equals the CHR
//    bank the pose selects, and the palette equals the fight's sprite palette bytes; pieces the library does not draw
//    are only those with no bank of their own or in the upper pattern table.
// 3. All 14 fights, PRG 1: Glass Joe (new game); the circuits' first bouts by passcode: Don Flamenco (005 737 5423),
//    Piston Honda's rematch (777 807 3454), King Hippo (135 792 4680, then Select+A+B), Mike Tyson (007 373 5963); the
//    other nine by setting the opponent number (RAM $01) after New Game; and the Mike Tyson bout on PRG 0:
//    every link agrees with the drawing the game made, none contradicts it, every link is to the fight being played;
//    and whenever the game's drawing is one of the fight's full poses, Forge links it. The game's drawing: every time
//    the game runs its pose routine ($C890 entered with $A0 set), the test records the selector ($A1: a full pose below
//    $80, a delta from $80, applied to the pose already drawn), the base ($B0/$B1) and the sprite mode ($80/$81). For
//    each frame it replays the applications since the last full pose with the game's routine (here in Node, from the
//    cartridge) and finds the result drawn in place (every piece at its screen position). A delta result that equals
//    no full pose is not in the library and is counted; a link in it must be a full pose drawn whole within it.
// 4. Negative cases: one sprite moved by a pixel breaks the link; a sprite pointed at another CHR bank leaves a
//    candidate, not a link.
// 5. In the library and on screen: frames registered as library entries give the same links through
//    library.framePoses; Resources > Library's frame view lists them; a pose opens from there and lists the frames that
//    show it; a pose with a complete drawing can be used in a project, one with an incomplete drawing is refused.
// 6. What the frames showed, recorded on the poses (library.recordObservedPoses, also automatic after frames are
//    registered): every registered frame is recorded on the poses it establishes; a pose drawn in another sprite mode
//    than its default drawing, or with no CHR bank of its own, gets a drawing as observed whose every pattern row equals
//    the cartridge bytes at the location its sprite was drawn from, with the frame's palette and flips; a complete
//    drawing in the same mode is kept; recording again changes nothing; it survives a reload.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const {chromium} = require('playwright');
const [editorArg, output, cartDir, shots] = process.argv.slice(2);
const editor = path.resolve(editorArg || path.join(__dirname, '..', 'NES_Forge.html'));
const PRG1 = '22ce21aa9c477d87e9cdc386b185f2166b18d438257640aa1d8e75ee9960e06e', PRG0 = '0435f6d9bcfeb474a592c3a950530a99c03a6f6cacff793dc88f822bb8cc6952';
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const report = {suite: 'punch-out-pose-links', editorSha256: sha(fs.readFileSync(editor)), checks: []};
const check = (name, passed, detail) => { report.checks.push({name, passed: !!passed, detail}); console.log((passed ? 'PASS ' : 'FAIL ') + name + (passed ? '' : ' ' + JSON.stringify(detail).slice(0, 900))); };
const carts = cartDir && fs.existsSync(cartDir) ? fs.readdirSync(cartDir).filter(n => n.toLowerCase().endsWith('.nes')).map(n => ({name: n, file: path.join(cartDir, n), sha: sha(fs.readFileSync(path.join(cartDir, n)))})) : [];
if (shots) fs.mkdirSync(shots, {recursive: true});
// the game's own pose routine, run here in Node (the same source Forge bundles), for this test's independent search
globalThis.Forge6502Core = require('../app/src/services/cpu6502-core.js');
const PunchOutContent = require('../app/src/re/punch-out-content.js');

// what the test reads from the cartridge itself
function pattern(bytes, bank, index) { const at = 16 + 8 * 16384 + bank * 4096 + index * 16;
  return Array.from({length: 8}, (_, y) => Array.from({length: 8}, (_, x) => ((bytes[at + y] >> (7 - x)) & 1) | (((bytes[at + 8 + y] >> (7 - x)) & 1) << 1))); }
const samePixels = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// one bout in Forge: route, then 1800 frames with the game's pose variables, a frame evidence record every 6 frames
// and Forge's links for it (library.framePoses on the record)
async function bout(page, cart, route) {
  return page.evaluate(async ({b64, route}) => {
    const C = Forge.commands, FE = Forge.services.FrameEvidence, PL = Forge.services.PoseLinks;
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const press = (b, hold = 4, after = 12) => FE.runFrames(hold + after, [{from: 0, to: hold - 1, buttons: {[b]: true}}]);
    const lr = await C.run('emulator.load', {bytes, name: 'punch-out.nes'}); if (!lr.ok) throw Error(lr.error.message);
    // test-only: each application of the game's pose routine (the opcode fetch at $C890 reads $C890 with the program
    // counter already at $C891; the routine starts "LDA $A0 / BEQ", so $A0 set means it draws)
    const apps = [], read = window.cpuRead;
    window.cpuRead = function (a) { if (a === 0xc890 && emu.PC === 0xc891 && emu.ram[0xa0]) apps.push({f: emu.frameCount, a1: emu.ram[0xa1], b0: emu.ram[0xb0], b1: emu.ram[0xb1], m80: emu.ram[0x80], m81: emu.ram[0x81]}); return read(a); };
    try {
    await FE.runFrames(1200);
    // a passcode (entered with A and Right) starts a circuit's first bout; one passcode also needs Select+A+B held after
    // it; a new game starts with Glass Joe
    if (route.code) { await press('start', 4, 90); await press('down', 8, 40); for (const d of route.code) { await press('a', 4, 12); for (let i = 0; i < +d; i++) await press('right', 4, 8); }
      if (route.sab) await FE.runFrames(330, [{from: 0, to: 29, buttons: {select: true, a: true, b: true}}]); else await press('start', 4, 300); await press('start', 4, 30); }
    // any other fight: New Game with the opponent number (RAM $01, which the game indexes its fight table with at
    // $AAF1) written before every frame of the first 150 after Start, between the game setting it and loading the bout
    else if (route.opponent != null) { await press('start', 4, 90); await FE.runFrames(404, [{from: 0, to: 3, buttons: {start: true}}, {from: 0, to: 149, ram: {1: route.opponent}}]); await press('start', 4, 30); }
    else { await press('start', 4, 90); await press('start', 4, 400); await press('start', 4, 30); }
    const frames = [], hist = [], keep = {};
    for (let n = 0; n < (route.frames || 1800); n++) {
      await FE.runFrames(1);
      hist.push({f: emu.frameCount, a1: emu.ram[0xA1], b0: emu.ram[0xB0], b1: emu.ram[0xB1], m80: emu.ram[0x80], m81: emu.ram[0x81]});
      if (n % 6) continue;
      const record = await FE.capture({label: route.tag + ' +' + n, links: false}), r = await PL.framePoses(record);
      const links = r.links.map(l => ({entry: l.poseEntry, poseId: l.poseId, by: l.by, mode: l.mode?.key || null, sprites: l.sprites, graphics: l.graphics, flipsToggled: !!l.flipsToggled}));
      // a record of each sprite mode linked, for the library and negative checks
      for (const l of links) if (l.by === 'layout and graphics' && !keep[l.mode]) keep[l.mode] = {record, link: l};
      for (const l of links) if (l.by === 'layout' && !keep.nobank) keep.nobank = {record, link: l};
      frames.push({frame: record.frame, state: r.state, sprites: record.sprites.filter(s => s.visible).map(s => ({index: s.index, tile: s.tile, x: s.x, y: s.y, height: s.height, flipH: s.flipH, flipV: s.flipV})),
        links, candidates: r.candidates.map(c => ({poseId: c.poseId, state: c.state, mode: c.mode?.key || null, pieces: c.pieces})), ambiguous: r.ambiguous.length});
    }
    return {frames, hist, keep, apps};
    } finally { window.cpuRead = read; }
  }, {b64: fs.readFileSync(cart.file).toString('base64'), route});
}

// the game's pose routine, replayed: applications since the last full pose, run in order on one RAM (minimal state: what
// the library's decoder sets; deltas change the OAM the earlier applications wrote). The routine ends at $D857 (deltas
// run its unrolled tail past $D800). Returns the pieces drawn (slots 3-63, y as the decoder reports it).
const cpu6502 = globalThis.Forge6502Core;
function replay(bytes, f, apps) {
  const ram = new Uint8Array(2048), off = (bank, a) => 16 + bank * 8192 + (a & 0x1fff); ram[0xa9] = 5; ram.fill(248, 512, 768);
  for (const app of apps) {
    const state = {A: 0, X: 0, Y: 0, SP: 0xfb, PC: 0xc890, C: 0, Z: 0, I: 1, D: 0, V: 0, N: 0, cycles: 0, opsMissed: 0};
    const rd = a => { a &= 65535; if (a < 0x2000) return ram[a & 2047]; if (a >= 0x8000) return bytes[a < 0xa000 ? off(f.bank8KiB, a) : 16 + 131072 - 24576 + a - 0xa000]; throw Error('the routine read ' + a.toString(16)); };
    const wr = (a, v) => { a &= 65535; if (a >= 0x2000) throw Error('the routine wrote ' + a.toString(16)); ram[a & 2047] = v & 255; };
    ram[3] = f.entryOffset; ram[0x80] = app.m80 === 16 ? 16 : 8; ram[0x81] = app.m81 === 2 ? 2 : 1; ram[0x82] = app.m81 === 2 ? 254 : 255; ram[0xb0] = app.b0; ram[0xb1] = app.b1;
    ram[0xa0] = 128; ram[0xa1] = app.a1; ram[0x1fc] = 0xee; ram[0x1fd] = 0x7f;
    const core = cpu6502.create(state, rd, wr); let steps = 0;
    while (state.PC !== 0x7fef) { if (++steps > 50000 || state.PC < 0xc88b || state.PC > 0xd857) throw Error('the routine left $C88B-$D857'); core.step(); state.PC &= 65535; if (state.opsMissed) throw Error('unsupported instruction'); }
  }
  const pieces = []; for (let slot = 3; slot < 64; slot++) { const a = 512 + slot * 4; if (ram[a] >= 239) continue; pieces.push({x: ram[a + 3], y: ram[a] + 1, tile: ram[a + 1]}); }
  return pieces;
}
const layoutKey = pieces => { const x0 = Math.min(...pieces.map(q => q.x)), y0 = Math.min(...pieces.map(q => q.y)); return pieces.map(q => (q.x - x0) + ',' + (q.y - y0) + ',' + q.tile).sort().join(' '); };

// Forge's links against the drawing the game made; coverage by this test's own search
function judge(run, content, fight, bytes) {
  const hist = new Map(run.hist.map(r => [r.f, r]));
  const lastFull = f => { for (let k = f; k > f - 6000; k--) { const r = hist.get(k); if (r && r.a1 < 128) return r.a1; } return null; };
  // a pose entry is one physical record (bank and address): every fight whose pose table names it, with its selectors
  const recordOf = poseId => { const m = /^po:f(\d+):([0-9a-f]+)$/.exec(poseId || ''); if (!m) return null; const bank = content.fights[+m[1]].bank8KiB, address = parseInt(m[2], 16);
    const uses = content.fights.filter(f => f.bank8KiB === bank).map(f => ({fight: f.index, selectors: f.poses.filter(p => p.status === 'source-record' && p.address === address).map(p => p.selector)})).filter(u => u.selectors.length);
    const mine = uses.find(u => u.fight === fight); return {fights: uses.map(u => u.fight), selectors: mine ? mine.selectors : []}; };
  const out = {frames: run.frames.length, links: 0, byLayoutAndGraphics: 0, byLayout: 0, modes: {}, agree: 0, contradictions: [], wrongFight: [], duringDelta: 0,
    candidates: run.frames.reduce((n, f) => n + f.candidates.length, 0), ambiguous: run.frames.reduce((n, f) => n + f.ambiguous, 0), drawnInPlace: 0, covered: 0, missed: [],
    game: {applications: run.apps.length, deltaApplications: run.apps.filter(a => a.a1 >= 128).length, reproduced: 0, fullPose: 0, deltaResult: 0, deltaResultLinked: [], notReproduced: 0, linksNotJudged: 0, replayErrors: 0, chains: {}}};
  // the fight's full poses by layout (relative positions and tiles), per sprite mode: which selectors a drawing equals
  const f = content.fights[fight], layouts = {};
  const fullOf = (mode, pieces) => { const k = mode.height + '/' + mode.step;
    if (!layouts[k]) { layouts[k] = new Map(); for (const r of f.poses) { if (r.status !== 'source-record') continue; let p; try { p = content.pose(fight, r.selector, {x: 128, y: 120, mode}); } catch (_) { continue; }
      if (!p.pieces.length) continue; const key = layoutKey(p.pieces); layouts[k].set(key, [...(layouts[k].get(key) || []), r.selector]); } }
    return layouts[k].get(layoutKey(pieces)) || []; };
  for (const fr of run.frames) {
    const recent = [0, 1, 2, 3].map(k => hist.get(fr.frame - k)).filter(Boolean), delta = recent.some(r => r.a1 >= 128);
    // the game's drawing: the applications since the last full pose, up to the end of this frame or of one of the two
    // before it (the image shows the OAM copied at the start of the frame; lag -1 also takes an application counted
    // with the next frame number); the most recent one drawn in place
    let drawn = null;
    for (const lag of [-1, 0, 1, 2]) {
      const upTo = run.apps.filter(a => a.f < fr.frame - lag), start = upTo.map(a => a.a1 < 128).lastIndexOf(true); if (start < 0) continue;
      const chain = upTo.slice(start); let pieces; try { pieces = replay(bytes, f, chain); } catch (e) { out.game.replayErrors++; continue; }
      if (pieces.length >= 3 && pieces.every(q => fr.sprites.some(s => s.x === q.x && s.y === q.y - 1 && s.tile === q.tile))) {
        const last = chain[0], mode = {height: last.m80 === 16 ? 16 : 8, step: last.m81 === 2 ? 2 : 1};
        drawn = {pieces, chain: chain.map(a => a.a1), equals: fullOf(mode, pieces)}; break; }
    }
    if (drawn) { out.game.reproduced++; const k = drawn.chain.length === 1 ? 'full pose' : 'full pose + ' + (drawn.chain.length - 1) + ' delta(s)'; out.game.chains[k] = (out.game.chains[k] || 0) + 1;
      if (drawn.equals.length) out.game.fullPose++; else out.game.deltaResult++; }
    else out.game.notReproduced++;
    for (const l of fr.links) {
      out.links++; if (l.by === 'layout') out.byLayout++; else out.byLayoutAndGraphics++; out.modes[l.mode] = (out.modes[l.mode] || 0) + 1;
      const r = recordOf(l.poseId); if (!r || !r.fights.includes(fight)) { out.wrongFight.push({frame: fr.frame, pose: l.poseId}); continue; }
      if (l.flipsToggled) out.flipped = (out.flipped || 0) + 1;
      if (delta) out.duringDelta++;
      if (!drawn) { out.game.linksNotJudged++; continue; }
      // agreement: the drawing is this pose; or the drawing is a delta result and every linked sprite is part of it (a
      // full pose drawn whole within what the game drew)
      const within = l.sprites.every(i => { const sp = fr.sprites.find(t => t.index === i); return sp && drawn.pieces.some(q => q.x === sp.x && q.y - 1 === sp.y && q.tile === sp.tile); });
      if (r.selectors.some(s => drawn.equals.includes(s))) out.agree++;
      else if (!drawn.equals.length && within) { out.agree++; out.game.deltaResultLinked.push({frame: fr.frame, pose: l.poseId}); }
      else out.contradictions.push({frame: fr.frame, pose: l.poseId, selectors: r.selectors, game: drawn.chain.map(v => v.toString(16)).join('>'), equals: drawn.equals, within});
    }
    // coverage: the game's drawing is one of the fight's full poses, drawn in place; Forge links it
    if (!drawn || !drawn.equals.length) continue;
    out.drawnInPlace++;
    if (fr.links.some(l => { const r = recordOf(l.poseId); return r && r.fights.includes(fight) && r.selectors.some(s => drawn.equals.includes(s)); })) out.covered++;
    else out.missed.push({frame: fr.frame, selectors: drawn.equals, chain: drawn.chain.map(v => v.toString(16)).join('>'), links: fr.links.map(l => l.poseId), candidates: fr.candidates.map(c => c.poseId + ':' + c.state)});
  }
  return out;
}

(async () => {
  const p1 = carts.find(c => c.sha === PRG1), p0 = carts.find(c => c.sha === PRG0);
  if (!p1) { report.skipped = 'No Mike Tyson\'s Punch-Out!! (U) (PRG 1) cartridge in ' + (cartDir ? 'the supplied directory' : 'arguments'); report.passed = true; console.log('SKIP ' + report.skipped); if (output) fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n'); return; }
  const browser = await chromium.launch({headless: true, ...(process.env.CHROMIUM_PATH ? {executablePath: process.env.CHROMIUM_PATH} : {})});
  const page = await (await browser.newContext({viewport: {width: 1440, height: 900}})).newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  try {
    await page.goto('file://' + editor); await page.waitForFunction('window.Forge?.services?.PoseLinks && window.Forge.services.PunchOutLibrary');
    const t0 = Date.now();
    // ---------- 1. the catalog, through the automatic completion path ----------
    report.catalog = {};
    for (const cart of [p1, p0].filter(Boolean)) {
      // PRG 0 is registered over a catalog of the provider's version 1 (planted here): one entry the new version no
      // longer has (a rematch's duplicate), and one it still has, with what frames showed recorded on it
      const bytesNow = new Uint8Array(fs.readFileSync(cart.file)), poc = PunchOutContent.open(bytesNow), tysonZero = poc.fights[13].poses.find(p => p.selector === 0).address;
      const plant = cart === p0 ? {stale: 'po:f10:' + poc.fights[10].poses.find(p => p.status === 'source-record').address.toString(16), keep: 'po:f13:' + tysonZero.toString(16)} : null;
      const r = await page.evaluate(async ({b64, name, sha256, plant}) => {
        const LC = Forge.services.LibraryCatalog, L = Forge.services.ResourceLibrary, bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
        let upgrade = null;
        if (plant) {
          await L.ensureMeta();
          const prefix = 'rom:' + sha256.slice(0, 16) + ':pose:', oldKey = 'catalog:planted-provider-version-1', blob = await L.storeData('{"pieces":[]}');
          const entry = (rid, extra) => ({id: prefix + rid, packSha256: oldKey, path: 'pose/' + rid, label: rid, origin: 'rom-catalog', shelf: sha256, sourceSha256: sha256, game: 'punch-out-us-prg0', kind: 'pose',
            identified: true, fileType: 'json', size: blob.size, contentHash: blob.hash, loads: false, registered: Date.now(), data: {state: 'stored'}, ...extra});
          await L.putRecords([['packs', {packSha256: oldKey, name: name + ' · recovered catalog', origin: 'rom-catalog', sourceSha256: sha256, shelf: sha256, state: 'complete', format: 'NESForgeInvestigation', mode: 'full', bytes: 0,
            intake: {state: 'accepted', kind: 'rom-catalog'}, registered: Date.now(), updated: Date.now(), stats: {schema: 4, provider: {id: 'punch-out', version: 1}, entries: 2}}],
            ['entries', entry(plant.stale, {})], ['entries', entry(plant.keep, {observed: {frames: [{frameEntry: 'frames:planted', frame: 1, label: 'planted observation'}], count: 1, updated: Date.now()}})]]);
          upgrade = {before: (await LC.catalogState()).find(c => c.sha === sha256)?.state};
        }
        const t = performance.now(), first = await LC.completeCatalog(sha256, {bytes, name, from: 'the test', reason: 'test'}), ms = Math.round(performance.now() - t);
        if (plant) {
          const prefix = 'rom:' + sha256.slice(0, 16) + ':pose:', stale = await L.entry(prefix + plant.stale).catch(() => null), keep = await L.entry(prefix + plant.keep).catch(() => null);
          const packs = ((await Forge.commands.run('library.packs')).result || []).filter(p => p.origin === 'rom-catalog' && p.sourceSha256 === sha256);
          upgrade = {...upgrade, after: (await LC.catalogState()).find(c => c.sha === sha256)?.state, staleGone: !stale, kept: !!keep, keptObserved: (keep?.observed?.frames || []).some(f => f.frameEntry === 'frames:planted'),
            keptInNewPack: !!keep && keep.packSha256 !== 'catalog:planted-provider-version-1', catalogPacks: packs.map(p => ({state: p.state, provider: p.stats?.provider?.version})), superseded: first.superseded ?? null};
        }
        const again = await LC.completeCatalog(sha256, {bytes, name, from: 'the test', reason: 'test'});
        const all = []; for (let offset = 0; ; offset += 1000) { const page = await L.list({shelf: sha256, offset, limit: 1000}); all.push(...page.items); if (offset + 1000 >= page.total) break; }
        const kinds = all.reduce((m, e) => (m[e.kind] = (m[e.kind] || 0) + 1, m), {});
        const poses = [];
        for (const item of all.filter(e => e.kind === 'pose')) {
          const {entry, bytes: b} = await L.readEntry(item.id), record = JSON.parse(new TextDecoder().decode(b)), layouts = {};
          for (const [k, ref] of Object.entries(entry.layoutRenditions || {})) layouts[k] = JSON.parse(new TextDecoder().decode(await L.blobBytes(ref.hash)));
          poses.push({id: entry.id, record, layouts, defaultMode: entry.rendition?.context?.mode || null, inconsistent: entry.evidence?.inconsistent || 0, locations: entry.evidence?.total || 0});
        }
        const actors = [];
        for (const item of all.filter(e => e.kind === 'actor')) actors.push(JSON.parse(new TextDecoder().decode((await L.readEntry(item.id)).bytes)));
        const chr = all.filter(e => e.kind === 'chr').map(e => e.id).sort();
        return {first: {state: first.state, entries: first.entries, chrBanks: first.chrBanks, poseContexts: first.poseContexts}, ms, again: {state: again.state, already: again.already}, kinds, poses, actors, chr, upgrade,
          status: (await LC.romStatus()).find(s => s.sha === sha256)};
      }, {b64: fs.readFileSync(cart.file).toString('base64'), name: cart.name, sha256: cart.sha, plant});
      const bytes = new Uint8Array(fs.readFileSync(cart.file)), content = PunchOutContent.open(bytes);
      const records = new Set(); for (const f of content.fights) for (const p of f.poses) if (p.status === 'source-record') records.add(f.bank8KiB + ':' + p.address);
      const byMode = {}; for (const p of r.poses) for (const k of Object.keys(p.layouts)) byMode[k] = (byMode[k] || 0) + 1;
      // 2. every drawing against the cartridge bytes
      let drawnPieces = 0, undrawnUpper = 0, undrawnNoBank = 0, wrongPattern = [], wrongPalette = [], wrongUndrawn = [];
      for (const p of r.poses) {
        const actor = r.actors.find(a => a.selector === p.record.fight), pal = Array.from(bytes.slice(actor.palette.fileOffset + 16, actor.palette.fileOffset + 32), v => v & 63);
        for (const l of p.record.layouts) {
          const d = p.layouts[l.key]; if (!d) { wrongUndrawn.push({pose: p.id, mode: l.key, why: 'no drawing'}); continue; }
          if (JSON.stringify(d.palette) !== JSON.stringify([0, 1, 2, 3].map(i => pal.slice(i * 4, i * 4 + 4)))) wrongPalette.push({pose: p.id, mode: l.key});
          l.pieces.forEach((q, i) => { const dp = d.pieces[i];
            if (dp.drawn === false) { if (l.chrBank4KiB == null) undrawnNoBank++; else if (l.height === 16 && (q.tile & 1)) undrawnUpper++; else wrongUndrawn.push({pose: p.id, mode: l.key, piece: i}); return; }
            const want = l.height === 16 ? [pattern(bytes, l.chrBank4KiB, q.tile & 254), pattern(bytes, l.chrBank4KiB, (q.tile & 254) + 1)] : [pattern(bytes, l.chrBank4KiB, q.tile)];
            const got = l.height === 16 ? [d.tiles[dp.tile], d.tiles[dp.tile2]] : [d.tiles[dp.tile]];
            drawnPieces++; if (!want.every((w, k) => samePixels(w, got[k]))) wrongPattern.push({pose: p.id, mode: l.key, piece: i}); });
        }
      }
      report.catalog[cart.sha === PRG1 ? 'PRG 1' : 'PRG 0'] = {registration: r.first, ms: r.ms, again: r.again, kinds: r.kinds, records: records.size, poseEntries: r.poses.length,
        withoutLayout: r.poses.filter(p => !p.record.layouts.length).map(p => p.id), layoutsByMode: byMode, actors: r.actors.length, chrBanks: r.chr.length,
        locations: r.poses.reduce((n, p) => n + p.locations, 0), inconsistentLocations: r.poses.reduce((n, p) => n + p.inconsistent, 0),
        drawings: {drawnPieces, undrawnUpper, undrawnNoBank, wrongPattern: wrongPattern.slice(0, 5), wrongPalette: wrongPalette.slice(0, 5), wrongUndrawn: wrongUndrawn.slice(0, 5)},
        status: r.status ? {catalog: r.status.catalog.state, entries: r.status.entries, drawing: r.status.drawing} : null, ...(r.upgrade ? {upgradeFromVersion1: r.upgrade} : {})};
    }
    report.timing = {catalogsSeconds: Math.round((Date.now() - t0) / 1000)};
    const up = report.catalog['PRG 0']?.upgradeFromVersion1;
    if (p0) check('A catalog of the provider\'s earlier version (planted for PRG 0) is outdated and is replaced on completion: the entry it no longer has is removed, the entry it still has keeps what frames showed, one complete catalog remains',
      up && up.before === 'outdated' && up.after === 'complete' && up.staleGone && up.kept && up.keptObserved && up.keptInNewPack && up.catalogPacks.length === 1 && up.catalogPacks[0].provider === 2, up);
    const cats = Object.values(report.catalog);
    check('The recovered catalog of each revision is registered through the library\'s automatic completion: one pose entry per physical full-pose record (a fight and its rematch share theirs), the 14 fights, the 32 CHR banks; a second completion finds it complete; every location is consistent with the cartridge',
      cats.length >= 1 && cats.every(c => c.registration.state === 'complete' && c.again.state === 'complete' && c.again.already && c.poseEntries === c.records && c.actors === 14 && c.chrBanks === 32 &&
        c.withoutLayout.length === 0 && c.inconsistentLocations === 0 && c.locations > 0 && c.status?.catalog === 'complete' && c.status.drawing?.fight === c.poseEntries), report.catalog);
    check('Every drawing against the cartridge bytes (read by this test): each drawn piece\'s pattern is the CHR bank its pose selects, the palette is the fight\'s sprite palette; only pieces with no bank of their own or in the upper pattern table are left undrawn',
      cats.every(c => c.drawings.drawnPieces > 20000 && !c.drawings.wrongPattern.length && !c.drawings.wrongPalette.length && !c.drawings.wrongUndrawn.length), cats.map(c => c.drawings));
    // ---------- 3. the bouts ----------
    report.bouts = {};
    // every bout reachable without winning one: a new game, and the passcodes that start a circuit
    const TYSON = {tag: 'tyson', code: '0073735963'};
    const plays = [{cart: p1, route: TYSON, fight: 13, label: 'Mike Tyson (PRG 1)'}, {cart: p1, route: {tag: 'joe'}, fight: 0, label: 'Glass Joe (PRG 1)'},
      {cart: p1, route: {tag: 'don', code: '0057375423'}, fight: 3, label: 'Don Flamenco, first fight (PRG 1)'},
      {cart: p1, route: {tag: 'piston', code: '7778073454'}, fight: 7, label: 'Piston Honda, rematch (PRG 1)'},
      {cart: p1, route: {tag: 'hippo', code: '1357924680', sab: true}, fight: 4, label: 'King Hippo (PRG 1)'},
      ...(p0 ? [{cart: p0, route: TYSON, fight: 13, label: 'Mike Tyson (PRG 0)'}] : []),
      // the nine fights a passcode does not start: the opponent number set in RAM after New Game (900 frames each)
      ...[[1, 'Von Kaiser'], [2, 'Piston Honda, first fight'], [5, 'Great Tiger'], [6, 'Bald Bull, first fight'], [8, 'Soda Popinski'], [9, 'Bald Bull, rematch'],
        [10, 'Don Flamenco, rematch'], [11, 'Mr. Sandman'], [12, 'Super Macho Man']].map(([fight, name]) => ({cart: p1, route: {tag: 'opponent ' + fight, opponent: fight, frames: 900}, fight, label: name + ' (PRG 1, opponent set in RAM)'}))];
    const kept = [];
    for (const play of plays) {
      const t = Date.now(), run = await bout(page, play.cart, play.route), cartBytes = new Uint8Array(fs.readFileSync(play.cart.file)), content = PunchOutContent.open(cartBytes);
      report.bouts[play.label] = {...judge(run, content, play.fight, cartBytes), seconds: Math.round((Date.now() - t) / 1000)};
      // a line per bout: the bouts take minutes in all, and the runner stops a suite that prints nothing for 5 minutes
      { const b = report.bouts[play.label]; console.log('  bout done: ' + play.label + ' · ' + b.links + ' links, ' + b.agree + ' agree with the game\'s drawing, ' + b.contradictions.length + ' contradict, coverage ' + b.covered + '/' + b.drawnInPlace + ', delta results ' + b.game.deltaResult + ' · ' + b.seconds + ' s'); }
      for (const [mode, k] of Object.entries(run.keep)) kept.push({bout: play.label, mode, ...k});
    }
    const B = Object.values(report.bouts);
    check('In every bout, every link agrees with the drawing the game made (its pose routine\'s applications, full poses and deltas, replayed): the linked pose is that drawing, or a full pose drawn whole within a delta result; none contradicts it; every link is to the fight being played',
      B.length >= 14 && new Set(plays.map(p => p.fight)).size === 14 && B.every(b => b.links > 20 && b.agree >= b.links - b.game.linksNotJudged && b.game.linksNotJudged <= 0.05 * b.links && !b.contradictions.length && !b.wrongFight.length && b.ambiguous === 0 && b.game.replayErrors === 0) &&
        report.bouts['Mike Tyson (PRG 1)'].modes['8x8-step2'] > 0 && report.bouts['Mike Tyson (PRG 1)'].modes['8x16'] > 0,
      Object.fromEntries(Object.entries(report.bouts).map(([k, b]) => [k, {links: b.links, agree: b.agree, notJudged: b.game.linksNotJudged, flipped: b.flipped || 0, contradictions: b.contradictions.slice(0, 3), wrongFight: b.wrongFight.slice(0, 3), modes: b.modes, ambiguous: b.ambiguous, replayErrors: b.game.replayErrors}])));
    check('Coverage: whenever the game\'s drawing (replayed) is one of the fight\'s full poses and is drawn in place, Forge links it; delta results that equal no full pose are counted, not linked',
      B.every(b => b.drawnInPlace > 10 && b.missed.length === 0), Object.fromEntries(Object.entries(report.bouts).map(([k, b]) => [k, {drawnInPlace: b.drawnInPlace, covered: b.covered, missed: b.missed.slice(0, 3), game: {...b.game, deltaResultLinked: b.game.deltaResultLinked.length}}])));
    // ---------- 4. negative cases ----------
    const sample = kept.find(k => k.mode === '8x16' && k.link.by === 'layout and graphics') || kept[0];
    const neg = await page.evaluate(async ({record, link}) => {
      const PL = Forge.services.PoseLinks, copy = () => JSON.parse(JSON.stringify(record)), find = (r, i) => r.sprites.find(s => s.visible && s.index === i);
      const moved = copy(); find(moved, link.sprites[1]).x += 1;
      const otherBank = copy(), s = find(otherBank, link.sprites[0]); s.chrOffset = (s.chrOffset + 0x1000) % 0x20000;
      const a = await PL.framePoses(moved), b = await PL.framePoses(otherBank);
      return {moved: a.links.some(l => l.poseEntry === link.entry && l.sprites.join() === link.sprites.join()),
        otherBank: {established: b.links.some(l => l.poseEntry === link.entry), candidate: b.candidates.some(l => l.poseEntry === link.entry && l.graphics === 'differ')}};
    }, {record: sample.record, link: sample.link});
    report.negative = {bout: sample.bout, pose: sample.link.poseId, ...neg};
    check('Negative cases: one sprite moved by a pixel breaks the link; a sprite pointed at another CHR bank leaves a candidate, not a link',
      neg.moved === false && neg.otherBank.established === false && neg.otherBank.candidate === true, report.negative);
    // ---------- 5. in the library and on screen ----------
    const chosen = ['8x16', '8x8-step2', '8x8'].map(m => kept.find(k => k.mode === m)).filter(Boolean);
    const lib = await page.evaluate(async items => {
      const out = [];
      for (const {record, link} of items) { const id = (await Forge.services.FrameEvidence.registerFrame(record)).id, viaLibrary = await Forge.commands.run('library.framePoses', {id}), direct = await Forge.services.PoseLinks.framePoses(record);
        out.push({id, label: record.label, same: JSON.stringify(viaLibrary.result.links.map(l => [l.poseEntry, l.sprites])) === JSON.stringify(direct.links.map(l => [l.poseEntry, l.sprites])), links: viaLibrary.result.links.length, pose: link.entry}); }
      return out;
    }, chosen.map(k => ({record: k.record, link: k.link})));
    const target = lib.find(x => /^tyson/.test(x.label)) || lib[0];
    await page.evaluate(() => Forge.services.ResourceRelationshipPreview.open());
    await page.waitForSelector('#frx-lib'); await page.click('#frx-lib'); await page.fill('#frx-search', target.label); await page.waitForTimeout(500);
    await page.evaluate(label => [...document.querySelectorAll('#frx-items .frx-item')].find(b => /Library · frame/.test(b.textContent) && b.textContent.includes(label)).click(), target.label);
    await page.waitForSelector('[data-frame="pose-links"] .frx-pose-link', {timeout: 60000});
    const view = await page.$eval('[data-frame="pose-links"]', el => ({rows: el.querySelectorAll('.frx-pose-link').length, text: el.textContent.slice(0, 700), first: el.querySelector('.frx-pose-link button')?.textContent}));
    if (shots) { await page.$eval('[data-frame="pose-links"]', el => el.scrollIntoView({block: 'center'})); await page.screenshot({path: path.join(shots, 'P3_punch_out_frame_pose_links.png')}); }
    const firstPose = await page.$eval('[data-frame="pose-links"] .frx-pose-link', el => el.dataset.pose);
    await page.click('[data-frame="pose-links"] .frx-pose-link button');
    await page.waitForSelector('[data-pose="frames"]', {timeout: 60000}); await page.waitForTimeout(800);
    const seen = await page.$eval('[data-pose="frames"]', el => ({text: el.textContent, buttons: [...el.querySelectorAll('button')].map(b => b.textContent), lines: document.querySelectorAll('[data-pose="frames"]').length}));
    const drawnText = await page.evaluate(() => [...document.querySelectorAll('.frx-lib .frx-code')].map(e => e.textContent).find(t => /Drawn as in/.test(t)) || '');
    if (shots) { await page.$eval('[data-pose="frames"]', el => el.scrollIntoView({block: 'center'})); await page.screenshot({path: path.join(shots, 'P4_punch_out_pose_opened.png')}); }
    // use in a project: a complete drawing is placed; an incomplete one (no bank of its own) is refused, nothing changes
    const use = await page.evaluate(async ({complete, sha256}) => {
      const S = Forge.services, L = S.ResourceLibrary; S.ProjectStore.initializeBlank();
      const ok = await Forge.commands.run('library.usePose', {id: complete, mode: 'copy'});
      let incomplete = null;
      for (let offset = 0; !incomplete; offset += 1000) { const page = await L.list({shelf: sha256, kind: 'pose', offset, limit: 1000});
        for (const e of page.items) { const full = await L.entry(e.id); if (full.rendition?.context?.undrawn && full.rendition.context.undrawn > 0) { incomplete = e.id; break; } }
        if (offset + 1000 >= page.total) break; }
      const before = S.ProjectStore.serialize(), refused = incomplete ? await Forge.commands.run('library.usePose', {id: incomplete, mode: 'copy'}) : null;
      return {complete: {ok: ok.ok, sprites: ok.result?.placed?.sprites, error: ok.error?.message}, incomplete: incomplete && {id: incomplete, ok: refused.ok, message: refused.error?.message, unchanged: before === S.ProjectStore.serialize()}};
    }, {complete: firstPose, sha256: PRG1});
    report.library = {frames: lib, view, pose: firstPose, seen, drawnText: drawnText.slice(0, 300), use};
    check('In the library: frames registered as library entries give the same links through library.framePoses; the frame view lists them, a pose opens from there and lists the frames that show it; a complete drawing is used in a project, an incomplete one is refused and nothing changes',
      lib.length >= 2 && lib.every(x => x.same && x.links >= 1) && view.rows >= 1 && /established by/.test(view.text) && /Seen in \d+ captured frame/.test(seen.text) && seen.lines === 1 &&
        /bout/.test(drawnText) && use.complete.ok && use.complete.sprites > 0 && use.incomplete && use.incomplete.ok === false && /incomplete/.test(use.incomplete.message) && use.incomplete.unchanged, report.library);
    // ---------- 6. what the frames showed, recorded on the poses ----------
    const tysonKept = kept.filter(k => k.bout === 'Mike Tyson (PRG 1)'), nobank = tysonKept.find(k => k.mode === 'nobank'), eight = tysonKept.find(k => k.mode === '8x8-step2'), sixteen = tysonKept.find(k => k.mode === '8x16'), joe = kept.find(k => k.bout === 'Glass Joe (PRG 1)' && k.mode === '8x8');
    const obs = await page.evaluate(async ({records, sha256}) => {
      const S = Forge.services, L = S.ResourceLibrary, ids = [];
      for (const r of records) ids.push((await S.FrameEvidence.registerFrame(r)).id);   // the frame with a no-bank pose (the others were registered above)
      const first = await Forge.commands.run('library.recordObservedPoses', {sha256}), again = await Forge.commands.run('library.recordObservedPoses', {sha256});
      return {ids, first: first.ok ? first.result : first.error, again: again.ok ? again.result : again.error};
    }, {records: [nobank].filter(Boolean).map(k => k.record), sha256: PRG1});
    const readPose = id => page.evaluate(async id => { const L = Forge.services.ResourceLibrary, e = await L.entry(id), rd = ref => ref?.hash ? L.blobBytes(ref.hash).then(b => JSON.parse(new TextDecoder().decode(b))) : null;
      return {observed: e.observed || null, rendition: await rd(e.rendition), decoded: await rd(e.decodedRendition)}; }, id);
    const cartBytes = new Uint8Array(fs.readFileSync(p1.file));
    // this test's own reading of what a frame drew: each sprite's pattern rows from the cartridge at its traced location
    const drawnRowsOf = s => { const h = s.height === 16 ? 16 : 8, out = []; for (let py = 0; py < h; py++) { const r = s.flipV ? h - 1 - py : py, g = (s.rowsFrom || []).find(g => r >= g.firstRow && r <= g.lastRow), base = (g ? g.chrOffset : s.chrOffset + (py >> 3) * 16) + 16 + 8 * 16384 + (py & 7);
      out.push(Array.from({length: 8}, (_, x) => ((cartBytes[base] >> (7 - x)) & 1) | (((cartBytes[base + 8] >> (7 - x)) & 1) << 1))); } return out; };
    const verifyObserved = (k, d) => { if (!d) return ['no drawing']; const bad = [], byIndex = new Map(k.record.sprites.filter(s => s.visible).map(s => [s.index, s]));
      const pal = k.record.palette.map(v => v & 63); if (JSON.stringify(d.palette) !== JSON.stringify([0, 1, 2, 3].map(r => [16, 17, 18, 19].map(i => pal[i + r * 4])))) bad.push('palette');
      k.link.sprites.forEach((i, n) => { const s = byIndex.get(i), p = d.pieces[n], rows = drawnRowsOf(s), got = d.spriteMode === 16 ? [...d.tiles[p.tile], ...d.tiles[p.tile2]] : d.tiles[p.tile];
        if (JSON.stringify(rows) !== JSON.stringify(got)) bad.push('piece ' + n + ' pattern'); if (p.flipH !== s.flipH || p.flipV !== s.flipV || p.pal !== s.palette) bad.push('piece ' + n + ' attributes');
        if (p.x !== d.pieces[0].x + (s.x - byIndex.get(k.link.sprites[0]).x) || p.y !== d.pieces[0].y + (s.y - byIndex.get(k.link.sprites[0]).y)) bad.push('piece ' + n + ' position'); });
      return bad; };
    const res = {};
    for (const [name, k] of Object.entries({nobank, eight, sixteen, joe})) { if (!k) continue; const e = await readPose(k.link.entry);
      res[name] = {pose: k.link.poseId, mode: k.link.mode, recorded: (e.observed?.frames || []).length, basis: e.rendition?.context?.basis, drawnMode: e.rendition?.context?.mode, decodedMode: e.decoded?.context?.mode || null,
        complete: !!e.rendition && e.rendition.pieces.every(p => p.drawn !== false), problems: e.rendition?.context?.basis === 'runtime' ? verifyObserved(k, e.rendition) : [], note: (e.rendition?.context?.note || '').slice(0, 160)}; }
    // it survives a reload, and the pose view says how it was drawn
    await page.reload(); await page.waitForFunction('window.Forge?.services?.PoseLinks && window.Forge.services.PunchOutLibrary');
    const after = eight ? await readPose(eight.link.entry) : null;
    let viewText = '';
    if (eight) { await page.evaluate(() => Forge.services.ResourceRelationshipPreview.open()); await page.waitForSelector('#frx-lib'); await page.click('#frx-lib');
      await page.fill('#frx-search', eight.link.poseId.replace(/^po:/, '')); await page.waitForTimeout(400);
      const label = await page.evaluate(id => Forge.services.ResourceLibrary.entry(id).then(e => e.label), eight.link.entry);
      await page.fill('#frx-search', label); await page.waitForTimeout(500);
      // both revisions hold a pose of this name: the PRG 1 entry (the frames are of PRG 1) names its ROM in the list
      await page.evaluate(l => [...document.querySelectorAll('#frx-items .frx-item')].find(b => b.textContent.includes(l) && b.textContent.includes('punch-out-us-prg1')).click(), label);
      await page.waitForFunction(() => /punch-out-us-prg1/.test(document.querySelector('#frx-items .frx-item[aria-current="true"]')?.textContent || '') &&
        [...document.querySelectorAll('.frx-lib .frx-code')].some(e => /seen on screen in/.test(e.textContent)), null, {timeout: 60000}).catch(() => null);
      viewText = await page.evaluate(() => [...document.querySelectorAll('.frx-lib .frx-code')].map(e => e.textContent).find(t => /Drawn as in/.test(t)) || '');
      if (shots) { await page.evaluate(() => document.querySelector('.frx-lib canvas')?.scrollIntoView({block: 'center'})); await page.screenshot({path: path.join(shots, 'P5_punch_out_pose_as_observed.png')}); } }
    const usable = nobank ? await page.evaluate(async id => { Forge.services.ProjectStore.initializeBlank(); const r = await Forge.commands.run('library.usePose', {id, mode: 'copy'}); return {ok: r.ok, sprites: r.result?.placed?.sprites, error: r.error?.message}; }, nobank.link.entry) : null;
    report.observations = {recorded: obs.first, again: obs.again, poses: res, afterReload: after && {basis: after.rendition?.context?.basis, mode: after.rendition?.context?.mode, recorded: (after.observed?.frames || []).length}, viewText: viewText.slice(0, 300), usable};
    check('What the frames showed is recorded on the poses: every registered frame on the poses it establishes; a pose drawn in another mode or with no bank of its own gets a drawing as observed, equal to the cartridge at its sprites\' traced locations with the frame\'s palette and flips; a complete drawing in the same mode is kept; recording again changes nothing; it survives a reload',
      !!nobank && !!eight && !!sixteen && res.nobank.recorded >= 1 && res.nobank.basis === 'runtime' && res.nobank.complete && !res.nobank.problems.length &&
        res.eight.basis === 'runtime' && res.eight.drawnMode === '8x8-step2' && res.eight.decodedMode === '8x16' && res.eight.complete && !res.eight.problems.length &&
        res.sixteen.recorded >= 1 && res.sixteen.basis === 'fight' && (!res.joe || res.joe.basis === 'fight' && res.joe.recorded >= 1) &&
        obs.again.observations === 0 && obs.again.drawingsUpdated === 0 && after?.rendition?.context?.basis === 'runtime' && /seen on screen in/.test(viewText) && !/in a stage/.test(viewText) && usable?.ok === true, report.observations);
    check('No uncaught page errors', errors.length === 0, errors.slice(0, 3));
  } catch (e) { check('run', false, String(e.stack || e.message).slice(0, 900)); }
  await browser.close();
  report.total = report.checks.length; report.checksPassed = report.checks.filter(c => c.passed).length; report.passed = report.checksPassed === report.total;
  if (output) fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  process.exitCode = report.passed ? 0 : 1;
})();
