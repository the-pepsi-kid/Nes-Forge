'use strict';
// Owner-side (needs the Zelda II (US) cartridge): Zelda II's sprite → pose links agree with the game itself.
//   node QA/zelda2-pose-links.cjs <editor.html> <report.json> <cartridge directory> [screenshot directory]
// The library's Zelda II poses are Link's: 15 pose selectors × 2 facings, each the output of the game's own display
// code run with RAM $80 = pose and $9F = facing (GameRENative). The test plays the game from a fresh save (title, file
// select, a name registered, slot 1 started):
//   A. the North Palace, where the game starts: walking, crouching, attacks and jumps;
//   B. out of the palace and across the overworld until an encounter starts (side-view Link is not drawn there);
//   C. the forest battle that follows: Link fighting two Deelers, hit, blinking, dying and starting again.
// The game's answer: whenever the game draws object 0 (Link) through its display code at $EC02 ("LDX $11", then the
// object's pose $80,X; the routine at $EBF0 falls into it, and five other callers, the death sequence among them, jump
// to it), the test records $80 and $9F. This is a test-only hook on the opcode fetch; the game is not changed. The image
// a frame shows was drawn within its last three frames; when the game drew Link in none of them (a transition), the last
// pose it drew is what remains on screen.
// 1. Precision: every established link is a pose the game drew for that image; none contradicts it.
// 2. Coverage: whenever such a pose is drawn in place (this test's own layout search), Forge links it. A frame without
//    a link of Link shows none of the poses the game drew for it in place (Link blinking after a hit, transitions).
// 3. No candidates and no ambiguous matches; no link while the overworld is shown.
// 4. Negative cases on a Zelda II frame: one sprite moved by a pixel breaks the link; a sprite pointed at another CHR
//    bank leaves a candidate, not a link.
// 5. In the library: frames registered as library entries give the same links through library.framePoses, and
//    Resources > Library's frame view lists them; the inspector calls such a frame a runtime capture (an Agent Lab
//    investigation only when it was imported from one).
// 6. No uncaught page errors.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const {chromium} = require('playwright');
const [editorArg, output, cartDir, shots] = process.argv.slice(2);
const editor = path.resolve(editorArg || path.join(__dirname, '..', 'NES_Forge.html'));
const ZELDA = 'ad8c0fbcf092bf84b48e69fd3964eea4ed91bfe62abc352943d537979782680c';
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const report = {suite: 'zelda2-pose-links', editorSha256: sha(fs.readFileSync(editor)), checks: []};
const check = (name, passed, detail) => { report.checks.push({name, passed: !!passed, detail}); console.log((passed ? 'PASS ' : 'FAIL ') + name + (passed ? '' : ' ' + JSON.stringify(detail).slice(0, 900))); };
const carts = cartDir && fs.existsSync(cartDir) ? fs.readdirSync(cartDir).filter(n => n.toLowerCase().endsWith('.nes')).map(n => ({name: n, file: path.join(cartDir, n), sha: sha(fs.readFileSync(path.join(cartDir, n)))})) : [];
if (shots) fs.mkdirSync(shots, {recursive: true});

// recorded inputs: "f300" runs frames; "start:4,120" holds a button 4 frames, then 120 frames released
function spans(script) {
  let f = 0; const inputs = [];
  for (const tok of script.trim().split(/\s+/)) {
    if (/^f\d+$/.test(tok)) { f += +tok.slice(1); continue; }
    const [btn, times] = tok.split(':'), [hold, after] = (times || '4,12').split(',').map(Number);
    inputs.push({from: f, to: f + hold - 1, buttons: Object.fromEntries(btn.split('+').map(b => [b, true]))}); f += hold + (after || 0);
  }
  return {frames: f, inputs};
}
// title → file select → "Register your name" → "AAA" → END → slot 1 → the North Palace (about 1,000 frames)
const START = 'f300 start:4,120 select:4,30 select:4,30 start:4,60 a:4,12 a:4,12 a:4,12 select:4,20 select:4,20 select:4,20 start:4,90 start:4,240';
const PHASES = [
  {name: 'palace', every: 6, script: 'f30 right:60,10 left:60,10 down:30,10 b:4,20 b:4,20 down+b:12,20 a:20,40 a:10,10 b:4,40 left+a:30,40 right+a:30,40 down:20,0 down+b:8,30 right+b:4,30 f30'},
  // from the game's start again: out of the palace to the left, then right and down across the overworld until a
  // forest encounter starts
  {name: 'overworld', every: 12, fromStart: true, script: 'left:200,0 left:200,180' + ' right:60,0'.repeat(12) + ' down:60,0'.repeat(6) + ' f60'},
  {name: 'forest battle', every: 6, script: 'right:80,10 b:4,20 b:4,20 a:20,30 right+a:30,30 b:4,20 down:30,0 down+b:8,20 down:20,10 left:60,10 a:16,30 b:4,20 right:120,10 b:4,10 b:4,10 a:16,10 left+b:4,30 f60 right:60,0 down:60,0 down+b:8,30 a:30,40 right+b:4,40 f120 left:100,20 right:100,20'},
];

// this test's own layout search (not Forge's matcher): is pose P drawn in place among the sprites (Link's poses have
// a decoded facing, so no mirroring)?
function drawnInPlace(P, sprites) {
  const fh = a => !!(a & 64), fv = a => !!(a & 128), p0 = P.pieces[0];
  for (const s of sprites) {
    if (s.tile !== p0.tile || s.flipH !== fh(p0.attributes) || s.flipV !== fv(p0.attributes)) continue;
    const used = new Set([s.index]);
    const all = P.pieces.slice(1).every(pk => { const x = s.x + (pk.x - p0.x), y = s.y + (pk.y - p0.y);
      const t = sprites.find(t => !used.has(t.index) && t.tile === pk.tile && t.x === x && t.y === y && t.flipH === fh(pk.attributes) && t.flipV === fv(pk.attributes)); if (t) used.add(t.index); return !!t; });
    if (all) return true;
  }
  return false;
}

(async () => {
  const z2 = carts.find(c => c.sha === ZELDA);
  if (!z2) { report.skipped = 'No Zelda II (US) cartridge in ' + (cartDir ? 'the supplied directory' : 'arguments'); report.passed = true; console.log('SKIP ' + report.skipped); if (output) fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n'); return; }
  const browser = await chromium.launch({headless: true, ...(process.env.CHROMIUM_PATH ? {executablePath: process.env.CHROMIUM_PATH} : {})});
  const page = await (await browser.newContext({viewport: {width: 1440, height: 900}})).newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  try {
    await page.goto('file://' + editor); await page.waitForFunction('window.Forge?.services?.PoseLinks');
    const t0 = Date.now();
    await page.evaluate(async b64 => {
      const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      let r = await Forge.commands.run('rom.import', {bytes, name: 'Zelda II - The Adventure of Link (U).nes'}); if (!r.ok) throw Error(r.error.message);
      r = await Forge.commands.run('library.registerCatalog'); if (!r.ok) throw Error('catalog: ' + r.error.message);
      // the game's answer, recorded on the opcode fetch at $EC02 (an opcode fetch at A reads A with the program counter
      // already at A+1); object 0 ($11) is Link
      const read = window.cpuRead; window.__z2 = {read, calls: 0, link: [], others: 0};
      window.cpuRead = function (a) { if (a === 0xec02 && emu.PC === 0xec03) { __z2.calls++; if (emu.ram[0x11] === 0) __z2.link.push([emu.ram[0x80], emu.ram[0x9f]]); else __z2.others++; } return read(a); };
    }, fs.readFileSync(z2.file).toString('base64'));
    const frames = [];
    for (const phase of PHASES) {
      const t1 = Date.now();
      const got = await page.evaluate(async ([phase, start, act]) => {
        const FE = Forge.services.FrameEvidence, PL = Forge.services.PoseLinks, T = Forge.services.EmulatorTimeline;
        if (!window.__z2.start) { const bytes = Uint8Array.from(atob(start.b64), c => c.charCodeAt(0)); await FE.boot(bytes, 'zelda2.nes', start.route); window.__z2.start = T.saveOwnedCheckpoint('zelda2 start'); }
        else if (phase.fromStart) window.__z2.start.restore();
        const out = [], every = phase.every, mode0 = emu.ram[0x736];
        for (let f = 0; f < act.frames; f += every) {
          const window_ = act.inputs.map(s => ({...s, from: s.from - f, to: s.to - f})).filter(s => s.to >= 0 && s.from < every);
          const head = window_.map(s => ({...s, from: Math.max(0, s.from), to: Math.min(every - 4, s.to)})).filter(s => s.from <= s.to);
          await FE.runFrames(every - 3, head);
          const before = window.__z2.link.length, modes = [];
          for (let i = every - 3; i < every; i++) { await FE.runFrames(1, window_.filter(s => s.from <= i && s.to >= i).map(s => ({...s, from: 0, to: 0}))); modes.push(emu.ram[0x736]); }
          const drawn = window.__z2.link.slice(before), last = window.__z2.link[window.__z2.link.length - 1] || null;
          const record = await FE.capture({label: 'Zelda II · ' + phase.name + ' +' + (f + every), links: false}), links = await PL.framePoses(record);
          out.push({phase: phase.name, at: f + every, modes, drawn, carried: drawn.length ? null : last, record: phase.keep && phase.keep.includes(f + every) ? record : null,
            sprites: record.sprites.filter(s => s.visible).map(s => ({index: s.index, tile: s.tile, x: s.x, y: s.y, flipH: s.flipH, flipV: s.flipV})), links});
        }
        return {frames: out, modeBefore: mode0, modeAfter: emu.ram[0x736]};
      }, [{...phase, keep: phase.name === 'palace' ? [90] : phase.name === 'forest battle' ? [60] : []}, {b64: fs.readFileSync(z2.file).toString('base64'), route: spans(START)}, spans(phase.script)]);
      frames.push(...got.frames);
      (report.phases = report.phases || []).push({name: phase.name, frames: got.frames.length, modeBefore: got.modeBefore, modeAfter: got.modeAfter, seconds: Math.round((Date.now() - t1) / 1000)});
      console.log('  phase done: ' + phase.name + ' · ' + got.frames.length + ' frames · ' + Math.round((Date.now() - t1) / 1000) + ' s');
    }
    const meta = await page.evaluate(() => { const n = Forge.services.ProjectStore.capture().investigation.catalogs.native;
      return {calls: __z2.calls, link: __z2.link.length, others: __z2.others, poses: n.poses.map(p => ({id: p.id, facing: p.facing ?? null, pieces: p.pieces.map(q => ({tile: q.tile, x: q.x, y: q.y, attributes: q.attributes}))}))}; });
    await page.evaluate(() => { window.cpuRead = __z2.read; __z2.start?.release?.(); });
    report.timing = {seconds: Math.round((Date.now() - t0) / 1000)};
    report.displayCalls = {link: meta.link, otherObjects: meta.others};
    const poseById = new Map(meta.poses.map(p => [p.id, p])), idOf = ([pose, facing]) => 'z2-link:' + pose + ':' + facing;
    const allowedOf = f => new Set((f.drawn.length ? f.drawn : f.carried ? [f.carried] : []).map(idOf));
    // the route really went where it says: the game starts in side view, the overworld phase ends in a side-view
    // battle after showing the overworld
    const sideView = 11, overworld = 5, ow = report.phases.find(p => p.name === 'overworld');
    const route = {startMode: report.phases[0].modeBefore, overworldShown: frames.some(f => f.phase === 'overworld' && f.modes.every(m => m === overworld)), battleMode: ow.modeAfter};
    report.route = route;
    // 1. precision
    const precision = {}; const contradictions = [];
    for (const f of frames) {
      const p = precision[f.phase] = precision[f.phase] || {frames: 0, links: 0, agree: 0, carried: 0, byLayoutAndGraphics: 0, byLayout: 0, poses: {}};
      p.frames++; if (f.carried) p.carried++;
      const allowed = allowedOf(f);
      for (const l of f.links.links) { p.links++; if (l.by === 'layout') p.byLayout++; else p.byLayoutAndGraphics++; p.poses[l.poseId] = (p.poses[l.poseId] || 0) + 1;
        if (allowed.has(l.poseId)) p.agree++; else contradictions.push({phase: f.phase, at: f.at, link: l.poseId, game: [...allowed]}); }
    }
    const total = Object.values(precision).reduce((a, p) => ({links: a.links + p.links, agree: a.agree + p.agree}), {links: 0, agree: 0});
    const posesSeen = [...new Set(Object.values(precision).flatMap(p => Object.keys(p.poses)))].sort();
    report.precision = {byPhase: precision, ...total, contradictions, posesLinked: posesSeen};
    check('Route: the game starts in side view, the overworld is shown, and the walk ends in a side-view battle', route.startMode === sideView && route.overworldShown && route.battleMode === sideView, route);
    check('Precision: every established link is a pose the game drew (object 0 through $EC02: $80 pose, $9F facing) for the image; none contradicts it',
      contradictions.length === 0 && total.links >= 250 && precision.palace?.links >= 80 && precision['forest battle']?.links >= 150 && posesSeen.length >= 14, report.precision);
    // 2. coverage
    const missed = [], unlinkedFrames = []; let covered = 0;
    for (const f of frames) {
      const allowed = allowedOf(f), linked = new Set([...f.links.links.map(l => l.poseId), ...f.links.ambiguous.flatMap(a => a.poses.map(p => p.poseId))]);
      for (const id of allowed) { const P = poseById.get(id); if (!P || !drawnInPlace(P, f.sprites)) continue; if (linked.has(id)) covered++; else missed.push({phase: f.phase, at: f.at, pose: id}); }
      if (!f.links.links.some(l => /^z2-link:/.test(l.poseId))) unlinkedFrames.push({phase: f.phase, at: f.at, drawnInPlace: [...allowed].some(id => poseById.get(id) && drawnInPlace(poseById.get(id), f.sprites)), modes: f.modes});
    }
    const inPlay = unlinkedFrames.filter(u => u.phase !== 'overworld');
    report.coverage = {covered, missed, unlinkedFrames: {count: inPlay.length, sideView: inPlay.filter(u => u.modes.every(m => m === sideView)).length, withAPoseDrawnInPlace: inPlay.filter(u => u.drawnInPlace).length}};
    check('Coverage: whenever a pose the game drew is drawn in place (this test\'s own layout search), Forge links it; a side-view frame without a link shows none of them in place',
      missed.length === 0 && covered >= 250 && inPlay.every(u => !u.drawnInPlace), report.coverage);
    // 3. no noise
    const cands = frames.flatMap(f => f.links.candidates.map(c => ({phase: f.phase, at: f.at, pose: c.poseId}))), amb = frames.flatMap(f => f.links.ambiguous.map(a => ({phase: f.phase, at: f.at, poses: a.poses.map(p => p.poseId)})));
    const overworldLinks = frames.filter(f => f.modes.every(m => m === overworld)).flatMap(f => f.links.links.map(l => ({at: f.at, link: l.poseId})));
    report.noise = {candidates: cands, ambiguous: amb, overworldFrames: frames.filter(f => f.modes.every(m => m === overworld)).length, overworldLinks};
    check('No noise: no candidates, no ambiguous matches, and no link while the overworld is shown', cands.length === 0 && amb.length === 0 && overworldLinks.length === 0 && report.noise.overworldFrames >= 50, report.noise);
    // 4. negative cases, on frames with an exact (layout and graphics) link
    const kept = frames.filter(f => f.record), sample = kept.find(f => f.links.links.some(l => l.by === 'layout and graphics')), exact = sample?.links.links.find(l => l.by === 'layout and graphics');
    const neg = sample ? await page.evaluate(async ([record, link]) => {
      const PL = Forge.services.PoseLinks, copy = () => JSON.parse(JSON.stringify(record)), find = (r, i) => r.sprites.find(s => s.visible && s.index === i);
      const moved = copy(); find(moved, link.sprites[1]).x += 1;
      const otherBank = copy(), s = find(otherBank, link.sprites[0]); s.chrOffset = (s.chrOffset + 0x1000) % 0x20000;
      const a = await PL.framePoses(moved), b = await PL.framePoses(otherBank);
      return {moved: a.links.some(l => l.poseEntry === link.poseEntry && l.sprites.join() === link.sprites.join()),
        otherBank: {established: b.links.some(l => l.poseEntry === link.poseEntry), candidate: b.candidates.some(l => l.poseEntry === link.poseEntry && l.graphics === 'differ')}};
    }, [sample.record, exact]) : null;
    report.negative = {pose: exact?.poseId, ...neg};
    check('Negative cases: one sprite moved by a pixel breaks the link; a sprite pointed at another CHR bank leaves a candidate, not a link',
      !!neg && neg.moved === false && neg.otherBank.established === false && neg.otherBank.candidate === true, report.negative);
    // 5. in the library and on screen
    const lib = await page.evaluate(async records => {
      const out = [];
      for (const record of records) { const id = (await Forge.services.FrameEvidence.registerFrame(record)).id; const viaLibrary = await Forge.commands.run('library.framePoses', {id}), direct = await Forge.services.PoseLinks.framePoses(record);
        out.push({id, label: record.label, same: JSON.stringify(viaLibrary.result.links.map(l => [l.poseEntry, l.sprites])) === JSON.stringify(direct.links.map(l => [l.poseEntry, l.sprites])), links: viaLibrary.result.links.length}); }
      return out;
    }, kept.map(f => f.record));
    await page.evaluate(() => Forge.services.ResourceRelationshipPreview.open());
    await page.waitForSelector('#frx-lib'); await page.click('#frx-lib'); await page.fill('#frx-search', 'forest battle'); await page.waitForTimeout(500);
    await page.evaluate(() => [...document.querySelectorAll('#frx-items .frx-item')].find(b => /Library · frame/.test(b.textContent) && /forest battle/.test(b.textContent)).click());
    await page.waitForSelector('[data-frame="pose-links"] .frx-pose-link', {timeout: 60000});
    const view = await page.$eval('[data-frame="pose-links"]', el => ({rows: el.querySelectorAll('.frx-pose-link').length, text: el.textContent.slice(0, 600), first: el.querySelector('.frx-pose-link button')?.textContent}));
    if (shots) { await page.$eval('[data-frame="pose-links"]', el => el.scrollIntoView({block: 'center'})); await page.screenshot({path: path.join(shots, 'Z3_zelda2_frame_sprite_pose_links.png')}); }
    // the inspector's provenance: a frame captured in Forge is a runtime capture, not an Agent Lab investigation's
    const provenance = await page.$eval('#frx-details', el => { const labels = [...el.querySelectorAll('.frx-label')]; const i = labels.findIndex(l => l.textContent === 'Provenance'); return i < 0 ? null : labels[i].nextElementSibling?.textContent || null; });
    report.library = {frames: lib, view, provenance};
    check('In the library: registered Zelda II frames give the same links through library.framePoses, the frame view lists Link\'s pose, and its provenance says a runtime capture (no Agent Lab investigation)',
      lib.length === 2 && lib.every(x => x.same && x.links >= 1) && view.rows >= 1 && /Link pose/.test(view.text) && /established by/.test(view.text) && /runtime capture$/.test(provenance || '') && !/Agent Lab/.test(provenance || ''), report.library);
    check('No uncaught page errors', errors.length === 0, errors.slice(0, 3));
  } catch (e) { check('run', false, String(e.stack || e.message).slice(0, 900)); }
  await browser.close();
  report.total = report.checks.length; report.checksPassed = report.checks.filter(c => c.passed).length; report.passed = report.checksPassed === report.total;
  if (output) fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  process.exitCode = report.passed ? 0 : 1;
})();
