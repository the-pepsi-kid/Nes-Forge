'use strict';
// Owner-side (needs the Ninja Gaiden (US) cartridge; Super Mario Bros. 3 is used when present): the sprites a captured
// frame drew are linked to the library's decoded poses of the same ROM, and the links agree with the game itself.
//   node QA/pose-links.cjs <editor.html> <report.json> <cartridge directory> [screenshot directory]
// 1. Ninja Gaiden, 22 areas x 3 moments: every established link agrees with the game's own pose variables within the
//    frames that built the image (Ryu: RAM $83; enemies: the eight slots' pose at $438+X), and no link contradicts them.
// 2. Coverage: whenever the pose the game reports is drawn in place (found by this test's own layout search), Forge
//    links it.
// 3. Candidates only where the rule says: a pose of 1-2 pieces whose library drawing is unconfirmed, or other graphics.
// 4. Negative cases: one sprite moved by a pixel breaks the link; a sprite pointed at another CHR bank turns an exact
//    link into a candidate; a record from before sprites were traced is not linked; a ROM without decoded poses says so.
// 5. In the library: frames registered as library entries give the same links through library.framePoses, and
//    Resources > Library's frame view lists them; a pose opens in the library from there.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const {chromium} = require('playwright');
const [editorArg, output, cartDir, shots] = process.argv.slice(2);
const editor = path.resolve(editorArg || path.join(__dirname, '..', 'NES_Forge.html'));
const NINJA = '07d9e57e35184667c7b89e30857a44c5c404b48332ad12e66be91100eccd4f5e';
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const report = {suite: 'pose-links', editorSha256: sha(fs.readFileSync(editor)), checks: []};
const check = (name, passed, detail) => { report.checks.push({name, passed: !!passed, detail}); console.log((passed ? 'PASS ' : 'FAIL ') + name + (passed ? '' : ' ' + JSON.stringify(detail).slice(0, 900))); };
const carts = cartDir && fs.existsSync(cartDir) ? fs.readdirSync(cartDir).filter(n => n.toLowerCase().endsWith('.nes')).map(n => ({name: n, file: path.join(cartDir, n), sha: sha(fs.readFileSync(path.join(cartDir, n)))})) : [];
if (shots) fs.mkdirSync(shots, {recursive: true});

// this test's own layout search (not Forge's matcher): is pose P drawn in place among the sprites, either way round?
function drawnInPlace(P, sprites) {
  const fh = a => !!(a & 64), fv = a => !!(a & 128), p0 = P.pieces[0];
  for (const mirror of P.facing != null ? [false] : [false, true]) for (const s of sprites) {
    if (s.tile !== p0.tile || s.flipH !== (fh(p0.attributes) !== mirror) || s.flipV !== fv(p0.attributes)) continue;
    const used = new Set([s.index]);
    const all = P.pieces.slice(1).every(pk => { const x = s.x + (pk.x - p0.x) * (mirror ? -1 : 1), y = s.y + (pk.y - p0.y);
      const t = sprites.find(t => !used.has(t.index) && t.tile === pk.tile && t.x === x && t.y === y && t.flipH === (fh(pk.attributes) !== mirror) && t.flipV === fv(pk.attributes)); if (t) used.add(t.index); return !!t; });
    if (all) return true;
  }
  return false;
}

(async () => {
  const ng = carts.find(c => c.sha === NINJA);
  if (!ng) { report.skipped = 'No Ninja Gaiden (US) cartridge in ' + (cartDir ? 'the supplied directory' : 'arguments'); report.passed = true; console.log('SKIP ' + report.skipped); if (output) fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n'); return; }
  const browser = await chromium.launch({headless: true, ...(process.env.CHROMIUM_PATH ? {executablePath: process.env.CHROMIUM_PATH} : {})});
  const page = await (await browser.newContext({viewport: {width: 1440, height: 900}})).newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  try {
    await page.goto('file://' + editor); await page.waitForFunction('window.Forge?.services?.PoseLinks');
    const t0 = Date.now();
    // ---------- Ninja Gaiden: 22 areas, 3 moments each, with the game's pose variables over the last three frames ----------
    const run = await page.evaluate(async b64 => {
      const C = Forge.commands, FE = Forge.services.FrameEvidence, T = Forge.services.EmulatorTimeline, PL = Forge.services.PoseLinks;
      const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      let r = await C.run('rom.import', {bytes, name: 'Ninja Gaiden (U).nes'}); if (!r.ok) throw Error(r.error.message);
      r = await C.run('library.registerCatalog'); if (!r.ok) throw Error('catalog: ' + r.error.message);
      const n = Forge.services.ProjectStore.capture().investigation.catalogs.native, areas = [...new Set(n.scenes.map(s => s.area))].sort((a, b) => a - b);
      await FE.boot(bytes, 'ng.nes', {frames: 0, pressUntil: {buttons: {start: true}, every: 30, hold: 4, conditions: [{vram: 0x97, equals: 0x18}, {address: 0x6D, equals: 0}], maxFrames: 3000, after: 60}});
      const ck = T.saveOwnedCheckpoint('pose links boot'), frames = [];
      for (const area of areas) {
        const f = n.scenes.find(s => s.area === area), room = f.areaFirstRoom ?? f.room; ck.restore();
        if (area) await FE.runTarget({ram: {0x6D: area, 0x6E: room, 0x6F: room, 0x63: 1, 0x76: 2}, until: [{address: 0x63, equals: 0}, {address: 0x63, min: 140, max: 150}], maxFrames: 6000, frames: 1});
        let done = 0;
        for (const at of [90, 150, 210]) {
          await FE.runFrames(at - done - 3); const hist = [];
          for (let i = 0; i < 3; i++) { await FE.runFrames(1); const slots = []; for (let X = 0; X < 8; X++) if (emu.ram[0x400 + X]) slots.push({X, type: emu.ram[0x400 + X], pose: emu.ram[0x438 + X]}); hist.push({ryu: emu.ram[0x83], slots}); }
          done = at;
          const record = await FE.capture({label: 'area ' + area + ' +' + at, links: false}), links = await PL.framePoses(record);
          frames.push({area, at, record: area === 4 && at === 90 || area === 1 && at === 90 ? record : null, sprites: record.sprites.filter(s => s.visible).map(s => ({index: s.index, tile: s.tile, x: s.x, y: s.y, flipH: s.flipH, flipV: s.flipV})), links, hist});
        }
      }
      ck.release();
      return {frames, poses: n.poses.map(p => ({id: p.id, owner: p.owner, facing: p.facing ?? null, pieces: p.pieces.map(q => ({tile: q.tile, x: q.x, y: q.y, attributes: q.attributes}))}))};
    }, fs.readFileSync(ng.file).toString('base64'));
    report.timing = {ninjaGaidenSeconds: Math.round((Date.now() - t0) / 1000)};
    const poseById = new Map(run.poses.map(p => [p.id, p]));
    // 1. precision: every established link is a pose the game's variables held in the frames that built the image
    let links = 0, byGraphics = 0, byLayout = 0, enemyLinks = 0; const contradictions = [];
    for (const f of run.frames) {
      const allowed = new Set(f.hist.flatMap(h => ['ryu:' + h.ryu, ...h.slots.map(s => 'enemy:' + s.pose)]));
      for (const l of f.links.links) { links++; if (l.by === 'layout') byLayout++; else byGraphics++; if (/^enemy:/.test(l.poseId)) enemyLinks++;
        if (!allowed.has(l.poseId)) contradictions.push({area: f.area, at: f.at, link: l.poseId, game: [...allowed]}); }
    }
    report.precision = {frames: run.frames.length, links, byLayoutAndGraphics: byGraphics, byLayout, enemyLinks, contradictions};
    check('Ninja Gaiden, 22 areas x 3 moments: every established link is a pose the game\'s own variables held in the frames that built the image (Ryu $83, enemy slots $438+X); none contradicts them',
      run.frames.length === 66 && contradictions.length === 0 && enemyLinks >= 30 && byGraphics > 0 && byLayout > 0, report.precision);
    // 2. coverage: the pose the game reports, when drawn in place (this test's own search), is linked
    const missed = [], covered = {player: 0, enemies: 0};
    for (const f of run.frames) {
      const linked = new Set([...f.links.links.map(l => l.poseId), ...f.links.ambiguous.flatMap(a => a.poses.map(p => p.poseId))]);
      const reported = new Set(f.hist.flatMap(h => ['ryu:' + h.ryu, ...h.slots.map(s => 'enemy:' + s.pose)]));
      for (const id of reported) { const P = poseById.get(id); if (!P || !drawnInPlace(P, f.sprites)) continue;
        if (P.pieces.length < 3 && !linked.has(id)) continue;   // small poses may be candidates by design (check 3)
        if (linked.has(id)) covered[/^ryu:/.test(id) ? 'player' : 'enemies']++; else missed.push({area: f.area, at: f.at, pose: id}); }
    }
    const playerUnlinked = run.frames.filter(f => !f.links.links.some(l => /^ryu:/.test(l.poseId))).map(f => ({area: f.area, at: f.at, ryuDrawn: f.hist.some(h => { const P = poseById.get('ryu:' + h.ryu); return P && drawnInPlace(P, f.sprites); })}));
    report.coverage = {covered, missed, playerUnlinked};
    check('Coverage: whenever a pose the game reports is drawn in place (this test\'s own layout search), Forge links it (Ryu and the enemies)',
      missed.length === 0 && covered.player >= 60 && covered.enemies >= 25 && playerUnlinked.every(p => !p.ryuDrawn), report.coverage);
    // 3. candidates only by the rule
    const cands = run.frames.flatMap(f => f.links.candidates.map(c => ({area: f.area, at: f.at, pose: c.poseId, pieces: c.pieces, state: c.state, graphics: c.graphics})));
    report.candidates = {count: cands.length, byPose: Object.entries(cands.reduce((m, c) => (m[c.pose + ' (' + c.pieces + ' pieces)'] = (m[c.pose + ' (' + c.pieces + ' pieces)'] || 0) + 1, m), {}))};
    check('Candidates only where the rule says: same layout with other graphics, never established; poses of fewer than 3 pieces whose library drawing is unconfirmed',
      cands.every(c => c.state === 'candidate' && c.graphics === 'differ') && cands.filter(c => c.pieces >= 3).length === 0, report.candidates);
    // 4. negative cases, on a frame with an exact (layout and graphics) link
    const sample = run.frames.find(f => f.record && f.links.links.some(l => l.by === 'layout and graphics')), exact = sample.links.links.find(l => l.by === 'layout and graphics');
    const neg = await page.evaluate(async ([record, link]) => {
      const PL = Forge.services.PoseLinks, copy = () => JSON.parse(JSON.stringify(record)), find = (r, i) => r.sprites.find(s => s.visible && s.index === i);
      const moved = copy(); find(moved, link.sprites[1]).x += 1;
      const otherBank = copy(), s = find(otherBank, link.sprites[0]); s.chrOffset = (s.chrOffset + 0x1000) % 0x20000;
      const older = copy(); delete older.spritesFrom;
      const a = await PL.framePoses(moved), b = await PL.framePoses(otherBank), c = await PL.framePoses(older);
      return {moved: a.links.some(l => l.poseEntry === link.poseEntry && l.sprites.join() === link.sprites.join()),
        otherBank: {established: b.links.some(l => l.poseEntry === link.poseEntry), candidate: b.candidates.some(l => l.poseEntry === link.poseEntry && l.graphics === 'differ')}, older: c.state};
    }, [sample.record, exact]);
    let noPoses = null;
    const smb3 = carts.find(c => /^Super Mario Bros 3/i.test(c.name));
    if (smb3) noPoses = await page.evaluate(async b64 => { const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0)); await Forge.services.FrameEvidence.boot(bytes, 'smb3.nes', {frames: 240, inputs: []});
      const r = await Forge.services.PoseLinks.framePoses(await Forge.services.FrameEvidence.capture({label: 'smb3', links: false})); return {state: r.state, note: r.note}; }, fs.readFileSync(smb3.file).toString('base64'));
    report.negative = {pose: exact.poseId, ...neg, noPoses};
    check('Negative cases: one sprite moved by a pixel breaks the link; a sprite pointed at another CHR bank leaves a candidate, not a link; a record from before sprites were traced is not linked; a ROM without decoded poses says so',
      neg.moved === false && neg.otherBank.established === false && neg.otherBank.candidate === true && neg.older === 'not traced' && (noPoses === null || noPoses.state === 'no poses'), report.negative);
    // 5. in the library and on screen
    const lib = await page.evaluate(async records => {
      const out = [];
      for (const record of records) { const id = (await Forge.services.FrameEvidence.registerFrame(record)).id; const viaLibrary = await Forge.commands.run('library.framePoses', {id}), direct = await Forge.services.PoseLinks.framePoses(record);
        out.push({id, same: JSON.stringify(viaLibrary.result.links.map(l => [l.poseEntry, l.sprites])) === JSON.stringify(direct.links.map(l => [l.poseEntry, l.sprites])), links: viaLibrary.result.links.length}); }
      return out;
    }, run.frames.filter(f => f.record).map(f => f.record));
    const registered = run.frames.filter(f => f.record), frameId = lib[registered.findIndex(f => f.area === 4)]?.id;   // the frame the view opens below
    await page.evaluate(id => { Forge.services.ResourceRelationshipPreview.open(); }, frameId);
    await page.waitForSelector('#frx-lib'); await page.click('#frx-lib'); await page.fill('#frx-search', 'area 4'); await page.waitForTimeout(500);
    await page.evaluate(() => [...document.querySelectorAll('#frx-items .frx-item')].find(b => /Library · frame/.test(b.textContent)).click());
    await page.waitForSelector('[data-frame="pose-links"] .frx-pose-link', {timeout: 60000});
    const view = await page.$eval('[data-frame="pose-links"]', el => ({rows: el.querySelectorAll('.frx-pose-link').length, text: el.textContent.slice(0, 600), first: el.querySelector('.frx-pose-link button')?.textContent}));
    if (shots) { await page.$eval('[data-frame="pose-links"]', el => el.scrollIntoView({block: 'center'})); await page.screenshot({path: path.join(shots, 'P1_frame_sprite_pose_links.png')}); }
    const firstPose = await page.$eval('[data-frame="pose-links"] .frx-pose-link', el => el.dataset.pose);
    await page.click('[data-frame="pose-links"] .frx-pose-link button');
    await page.waitForFunction(label => (document.querySelector('#frx-items .frx-item[aria-current="true"]')?.textContent || '').includes(label), view.first, {timeout: 30000}).catch(() => null);
    const opened = await page.evaluate(() => document.querySelector('#frx-items .frx-item[aria-current="true"]')?.textContent || '');
    // the other way round: the pose lists the captured frames that show it, and leads back to the frame
    await page.waitForSelector('[data-pose="frames"]', {timeout: 60000});
    await page.waitForTimeout(800);   // any second render of the same entry has finished
    const seen = await page.$eval('[data-pose="frames"]', el => ({text: el.textContent, buttons: [...el.querySelectorAll('button')].map(b => b.textContent), lines: document.querySelectorAll('[data-pose="frames"]').length}));
    const viaCommand = await page.evaluate(id => Forge.commands.run('library.poseFrames', {id}).then(r => r.ok ? r.result : r.error), firstPose);
    if (shots) { await page.$eval('[data-pose="frames"]', el => el.scrollIntoView({block: 'center'})); await page.screenshot({path: path.join(shots, 'P2_linked_pose_opened.png')}); }
    const frameButton = seen.buttons.find(t => /area 4 \+90/.test(t));
    if (frameButton) await page.evaluate(t => [...document.querySelectorAll('[data-pose="frames"] button')].find(b => b.textContent === t).click(), frameButton);
    await page.waitForFunction(() => /Library · frame/.test(document.querySelector('#frx-items .frx-item[aria-current="true"]')?.textContent || ''), null, {timeout: 30000}).catch(() => null);
    const back = await page.evaluate(() => document.querySelector('#frx-items .frx-item[aria-current="true"]')?.textContent || '');
    report.library = {frames: lib, view, opened: opened.slice(0, 120), pose: firstPose, seen, viaCommand: viaCommand?.frames?.map(f => f.frameEntry), back: back.slice(0, 80)};
    check('In the library: frames registered as library entries give the same links through library.framePoses; the frame view lists them, a pose opens from there, and the pose lists the captured frames that show it, leading back to the frame',
      lib.length >= 2 && lib.every(x => x.same) && view.rows >= 2 && /established by/.test(view.text) && opened.includes(view.first) &&
      /Seen in \d+ captured frame/.test(seen.text) && seen.lines === 1 && !!frameButton && viaCommand?.frames?.some(f => f.frameEntry === frameId) && /area 4 \+90/.test(back), report.library);
    check('No uncaught page errors', errors.length === 0, errors.slice(0, 3));
  } catch (e) { check('run', false, String(e.stack || e.message).slice(0, 900)); }
  await browser.close();
  report.total = report.checks.length; report.checksPassed = report.checks.filter(c => c.passed).length; report.passed = report.checksPassed === report.total;
  if (output) fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  process.exitCode = report.passed ? 0 : 1;
})();
