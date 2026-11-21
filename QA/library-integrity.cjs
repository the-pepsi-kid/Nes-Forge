#!/usr/bin/env node
// Recovered asset integrity and cross-session recognition: one canonical library, checked against the cartridge.
// Owner-side (needs the Ninja Gaiden (US) and Zelda II (US) cartridges).
//   node QA/library-integrity.cjs <NES_Forge.html> <report.json> <folder with cartridges> [<screenshot folder>]
// S  setup: Ninja Gaiden investigated in the background; its frames and recovered catalog enter the library
// I  a recovered pose copied into a new project: every tile (sprite bank), palette row and piece checked against the
//    cartridge's CHR ROM and the pose's own ROM bytes, independently of Forge's conversion; also on the CHR Sheet
// K  project copies are independent: editing one changes neither the library entry nor a second copy
// X  later sessions: Forge closed, the worker restarted, the ROM opened again: recognized from the library before any
//    investigation; visual and code-oriented resources (frames, poses, CHR, rooms, symbols, RAM map, CODE/RE) open;
//    the copies and the edit come back; recognition also works with the worker stopped
// Z  Zelda II: catalog registration interrupted after 1120 entries (more than one page of the resume scan), browser
//    killed; completed by the same generic recovery after the project is restored; checked against the cartridge
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), {spawn, execSync} = require('child_process');
const {chromium} = require('playwright');
const [editorArg, output, cartDir, shots] = process.argv.slice(2);
if (!editorArg || !output || !cartDir) { console.error('usage: node QA/library-integrity.cjs <NES_Forge.html> <report.json> <cartridges> [<shots>]'); process.exit(2); }
const editor = path.resolve(editorArg), sha = b => crypto.createHash('sha256').update(b).digest('hex');
const WORKER = path.join(path.resolve(__dirname, '..'), 'tools/agent-lab/capture_worker.cjs');
const NINJA = '07d9e57e35184667c7b89e30857a44c5c404b48332ad12e66be91100eccd4f5e', ZELDA = 'ad8c0fbcf092bf84b48e69fd3964eea4ed91bfe62abc352943d537979782680c';
const carts = fs.readdirSync(cartDir).filter(f => /\.nes$/i.test(f)).map(f => path.join(cartDir, f)), find = h => carts.find(f => sha(fs.readFileSync(f)) === h);
const NG = find(NINJA), Z2 = find(ZELDA), ROM = NG ? fs.readFileSync(NG) : null, ZROM = Z2 ? fs.readFileSync(Z2) : null;
const report = {suite: 'library-integrity', editorSha256: sha(fs.readFileSync(editor)), checks: [], phases: {}};
const check = (name, passed, detail) => { report.checks.push({name, passed: !!passed, detail}); console.log((passed ? 'PASS ' : 'FAIL ') + name + (passed ? '' : ' ' + JSON.stringify(detail).slice(0, 1200))); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-integrity-')), PORT = 8797, ADMIN = crypto.randomBytes(16).toString('hex');
let worker = null, pairingCode = null;
function startWorker() {
  return new Promise((resolve, reject) => {
    worker = spawn(process.execPath, [WORKER, 'serve', '--root', root, '--forge', editor, '--port', String(PORT), '--token', ADMIN], {stdio: ['ignore', 'pipe', 'pipe']});
    const t = setTimeout(() => reject(Error('worker did not start')), 15000);
    worker.stdout.on('data', d => { const m = /pairing code ([A-Z2-9]{4}-[A-Z2-9]{4})/.exec(String(d)); if (m) pairingCode = m[1]; if (/listening|pairing code/i.test(String(d))) { clearTimeout(t); resolve(); } });
    worker.stderr.on('data', d => process.stderr.write('[worker] ' + d));
  });
}
const stopWorker = async () => { if (worker) { worker.kill('SIGTERM'); await new Promise(r => worker.once('exit', r)); worker = null; } };
const jobs = () => { const dir = path.join(root, 'jobs'); return fs.existsSync(dir) ? fs.readdirSync(dir).map(id => JSON.parse(fs.readFileSync(path.join(dir, id, 'job.json'), 'utf8'))) : []; };
async function until(fn, ms = 600000, every = 300, why = null) {
  const t = Date.now();
  for (;;) { const v = await fn(); if (v) return v; if (Date.now() - t > ms) { let d = ''; try { d = why ? ': ' + JSON.stringify(await why()).slice(0, 3000) : ''; } catch (e) { d = ': (diagnostics failed: ' + e.message + ')'; } throw Error('timed out after ' + ms + ' ms' + d); } await sleep(every); }
}
// Counts recovered-catalog entries as they are written; after K the entry store is held by another transaction
const HOLD = ({k}) => {
  const put0 = IDBObjectStore.prototype.put; let n = 0, fired = false;
  IDBObjectStore.prototype.put = function (v, ...rest) {
    if (this.name === 'entries' && v && v.origin === 'rom-catalog' && this.transaction.db.name === 'nesforge-library') {
      n++; window.__qaCatalogPuts = n;
      if (n >= k && !fired) { fired = true; const r = indexedDB.open('nesforge-library');
        r.onsuccess = () => { const st = r.result.transaction(['entries'], 'readwrite').objectStore('entries'); const spin = () => { st.get('qa-none').onsuccess = spin; }; spin(); window.__qaMidCatalog?.(n); }; }
    }
    return put0.call(this, v, ...rest);
  };
};
async function open(profile, {hook} = {}) {
  const ctx = await chromium.launchPersistentContext(profile, {headless: true, viewport: {width: 1440, height: 900}});
  const page = ctx.pages()[0] || await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.accept()); page.setDefaultTimeout(600000);
  if (hook) await page.addInitScript(HOLD, hook);
  await page.goto('file://' + editor); await page.waitForFunction('window.Forge?.services?.InvestigationPanel && window.Forge.services.LibraryCatalog?.recognize');
  await page.waitForFunction(() => Forge.services.ProjectStore.state.recoveryPhase !== 'checking');
  return {ctx, page, errors};
}
const shotOf = page => async name => { if (!shots) return; await page.waitForTimeout(300); await page.screenshot({path: path.join(shots, name + '.png')}); };
function newPairingCode() { const out = execSync(JSON.stringify(process.execPath) + ' ' + JSON.stringify(WORKER) + ' pair --root ' + JSON.stringify(root)).toString(); const m = /pairing code ([A-Z2-9]{4}-[A-Z2-9]{4})/.exec(out); if (!m) throw Error('no pairing code: ' + out); pairingCode = m[1]; }
async function pair(page) { await page.evaluate(([u, c]) => Forge.services.InvestigationPanel.pair(u, c), ['http://127.0.0.1:' + PORT, pairingCode]); await page.evaluate(() => Forge.services.InvestigationPanel.setOptions({autoInvestigate: true, autoImport: true})); }
async function importInvestigated(page, file) {
  await page.setInputFiles('#projectGatewayFile', file);
  await page.waitForFunction(() => [...document.querySelectorAll('#projectGatewayPanel button')].some(b => /investigated project/i.test(b.textContent)));
  await page.evaluate(() => [...document.querySelectorAll('#projectGatewayPanel button')].find(b => /investigated project/i.test(b.textContent)).click());
  await page.waitForFunction(() => document.getElementById('investigationPrepare') || document.getElementById('investigationImport'));
  await page.evaluate(() => { const p = document.getElementById('investigationPrepare'); if (p && !p.disabled) p.click(); });
  await page.waitForFunction(() => !document.getElementById('investigationImport')?.disabled); await page.click('#investigationImport'); await page.waitForFunction(() => !!S.investigation);
}
const committed = page => page.waitForFunction(() => { const r = Forge.services.ProjectStore.recoveryState(); return r.baseline && !r.writing && r.committedSeq === r.editSeq && r.committedChangeSeq === r.changeSeq; }, null, {timeout: 60000});
const status = (page, h) => page.evaluate(x => Forge.services.LibraryCatalog.recoveryStatus().find(s => s.sha === x) || null, h);
const readJson = (page, id) => page.evaluate(async x => { const r = await Forge.commands.run('library.read', {id: x, as: 'base64'}); if (!r.ok) throw Error(r.error.message); return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(r.result.base64), c => c.charCodeAt(0)))); }, id);
const project = page => page.evaluate(() => Forge.services.ProjectStore.capture());
const inventory = (page, h) => page.evaluate(async x => {
  const L = Forge.services.ResourceLibrary, all = []; for (let o = 0; ; o += 5000) { const p = await L.list({shelf: x, offset: o, limit: 5000}); all.push(...p.items); if (o + 5000 >= p.total) break; }
  const by = f => all.filter(f).length;
  return {total: all.length, uniqueIds: new Set(all.map(e => e.id)).size, catalog: by(e => e.origin === 'rom-catalog'), chr: by(e => e.origin === 'rom-catalog' && e.kind === 'chr'), poses: by(e => e.kind === 'pose'), rooms: by(e => e.kind === 'room'),
    frames: by(e => e.kind === 'frame'), symbols: by(e => e.kind === 'symbols'), ramMap: by(e => e.kind === 'ram-map')};
}, h);
// a 2bpp NES pattern at a file offset, as 8 rows of colour indices
const tileAt = (rom, off) => Array.from({length: 8}, (_, y) => Array.from({length: 8}, (_, x) => ((rom[off + y] >> (7 - x)) & 1) | (((rom[off + 8 + y] >> (7 - x)) & 1) << 1)));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const s8 = v => (v & 0x80 ? v - 256 : v);
// What the CHR Sheet shows for a tile of the sprite bank: the canvas draws index i as grey i*85 (red channel; a usage
// tint adds at most 25 to other channels or 20 to red), 3 screen pixels per tile pixel, 16 tiles per row
async function sheetTiles(page, tiles) {
  return page.evaluate(list => { const cv = document.getElementById('cv'), cx = cv.getContext('2d'), z = cv.width / 128, img = cx.getImageData(0, 0, cv.width, cv.height).data;
    return list.map(t => Array.from({length: 8}, (_, py) => Array.from({length: 8}, (_, px) => { const x = Math.floor(((t % 16) * 8 + px) * z + 1), y = Math.floor((Math.floor(t / 16) * 8 + py) * z + 1); return Math.round(img[(y * cv.width + x) * 4] / 85); }))); }, tiles);
}
(async () => {
  if (!NG || !Z2) throw Error('needs the Ninja Gaiden (US) and Zelda II (US) cartridges');
  if (shots) fs.mkdirSync(shots, {recursive: true});
  const chrStart = 16 + ROM[4] * 16384;
  await startWorker();
  const P1 = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-integrity-p1-'));
  // ---------------- S: Ninja Gaiden recovered once ----------------
  let s = await open(P1), shot = shotOf(s.page);
  await pair(s.page); await importInvestigated(s.page, NG);
  const ngJob = await until(() => jobs().find(j => j.rom.sha256 === NINJA && j.state === 'completed'), 600000);
  await until(() => s.page.evaluate(x => Forge.services.LibraryCatalog.catalogState().then(l => l.find(c => c.sha === x && c.state === 'complete') || null), NINJA), 600000, 500,
    () => s.page.evaluate(() => ({statuses: Forge.services.LibraryCatalog.recoveryStatus(), notices: Forge.services.InvestigationPanel.state().notices})));
  await until(() => inventory(s.page, NINJA).then(i => i.frames === 22 ? i : null), 300000);
  const invS = await inventory(s.page, NINJA);
  report.phases.S = {job: ngJob.id, inventory: invS};
  check('S: Ninja Gaiden investigated once in the background; its 22 verified frames and its recovered catalog (590 entries, 32 CHR banks) are in the library',
    invS.frames === 22 && invS.catalog === 590 && invS.chr === 32 && invS.uniqueIds === invS.total, invS);
  // ---------------- I: a recovered pose copied into a new project, checked against the cartridge ----------------
  await s.page.evaluate(() => Forge.commands.run('project.new')); await s.page.evaluate(() => switchTab('scene')); await committed(s.page);
  const poseId = 'rom:' + NINJA.slice(0, 16) + ':pose:ryu:19';
  const libBefore = await s.page.evaluate(async id => { const L = Forge.services.ResourceLibrary, e = await L.entry(id), b = await L.blobBytes(e.rendition.hash); return {entry: JSON.stringify(e), rendition: Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', b))).map(x => x.toString(16).padStart(2, '0')).join('')}; }, poseId);
  const used1 = await s.page.evaluate(async id => { const r = await Forge.commands.run('library.usePose', {id, mode: 'copy'}); if (!r.ok) throw Error(r.error.message); return {id: S.metasprites[S.metasprites.length - 1].id, deps: r.result.dependencies}; }, poseId);
  await committed(s.page);
  const poseRec = await readJson(s.page, poseId), poseEntry = JSON.parse(libBefore.entry);
  let p1 = await project(s.page);
  const copy1 = p1.metasprites.find(m => m.id === used1.id), scene1 = p1.scenes.find(sc => sc.id === copy1.sceneId);
  const room = await readJson(s.page, 'rom:' + NINJA.slice(0, 16) + ':room:' + copy1.library.context.roomId);
  const banks = [room.spriteChrBank4KiB, room.backgroundChrBank4KiB];
  // the CHR banks as the library holds them start where the cartridge's CHR ROM says they do
  const chrEntries = await s.page.evaluate(async ids => { const out = []; for (const id of ids) { try { out.push((await Forge.services.ResourceLibrary.entry(id)).record || null); } catch (_) { out.push(null); } } return out; },
    banks.map(b => 'rom:' + NINJA.slice(0, 16) + ':chr:chr:' + b));
  const expected = poseRec.pieces.map(rp => { const bank = banks[rp.tile & 1], base = chrStart + bank * 4096 + (rp.tile & 254) * 16;
    return {bank, base, top: tileAt(ROM, base), bottom: tileAt(ROM, base + 16), x: rp.x, y: rp.y + 1, flipH: !!(rp.attributes & 64), flipV: !!(rp.attributes & 128), behind: !!(rp.attributes & 32), colours: room.palettes.sprites[rp.attributes & 3].slice(1)}; });
  const pieceChecks = copy1.pieces.map((cp, i) => { const e = expected[i]; return {i, top: same(scene1.sprChr[cp.tile], e.top), bottom: same(scene1.sprChr[cp.tile2], e.bottom), x: cp.x === e.x, y: cp.y === e.y,
    flips: cp.flipH === e.flipH && cp.flipV === e.flipV && cp.behind === e.behind, palette: same(scene1.sprPal[cp.pal].slice(1), e.colours)}; });
  // the pose's own bytes: each piece is [tile, x, y] at its recorded offset, its attributes at another
  const bytesChecks = poseRec.pieces.map(rp => { const b = ROM.subarray(rp.source.fileOffset, rp.source.fileOffset + 3); return b[0] === rp.tile && s8(b[1]) === rp.x && s8(b[2]) === rp.y && ROM[rp.attributeSource.fileOffset] === rp.attributes; });
  const primary = poseEntry.evidence.primary, inPrimary = poseRec.pieces.every(rp => rp.source.fileOffset >= primary.fileOffset && rp.source.fileOffset + 3 <= primary.fileOffset + primary.length);
  const rendition = await s.page.evaluate(async h => JSON.parse(new TextDecoder().decode(await Forge.services.ResourceLibrary.blobBytes(h))), poseEntry.rendition.hash);
  const renditionTiles = poseRec.pieces.every((rp, i) => same(rendition.tiles[rendition.pieces[i].tile], expected[i].top) && same(rendition.tiles[rendition.pieces[i].tile2], expected[i].bottom));
  report.phases.I = {pose: poseId, label: poseRec.label, room: room.id, banks, pieces: poseRec.pieces.length, chrStart, pieceChecks, bytesChecks, inPrimary, primary: {fileOffset: primary.fileOffset, length: primary.length},
    chrEntryOffsets: chrEntries.map(c => c?.fileOffset), deps: used1.deps};
  check('I: every piece of the copied pose matches the cartridge: both 8x16 tiles equal the CHR ROM patterns (sprite or background bank by the tile\'s low bit), x, y (+1, OAM), flips, priority and palette colours equal the ROM records',
    copy1.pieces.length === poseRec.pieces.length && copy1.spriteMode === 16 && pieceChecks.every(c => c.top && c.bottom && c.x && c.y && c.flips && c.palette), {pieceChecks, deps: used1.deps});
  check('I: the library\'s records are the cartridge\'s bytes: each piece is [tile, x, y] at its recorded file offset with its attribute byte, inside the pose\'s primary location; the CHR bank entries start at the cartridge\'s CHR offsets; the stored rendition equals the CHR ROM',
    bytesChecks.every(Boolean) && inPrimary && chrEntries.every((c, i) => c && c.fileOffset === chrStart + banks[i] * 4096) && renditionTiles, {bytesChecks, inPrimary, chrEntryOffsets: report.phases.I.chrEntryOffsets, renditionTiles});
  // the CHR Sheet's sprite bank shows those tiles
  await s.page.click('.tab:text-is("METASPRITES")'); await s.page.evaluate(id => Forge163.metasprites.select(id), copy1.id); await shot('I1_copied_pose_in_metasprites');
  await s.page.click('.tab:text-is("CHR SHEET")'); await s.page.click('#bankSpr'); await s.page.waitForTimeout(300);
  await shot('I2_chr_sheet_sprite_bank_copied_tiles');
  const tileIds = [...new Set(copy1.pieces.flatMap(p => [p.tile, p.tile2]))];
  // read back in the sheet's "Pixel values (grayscale)" preview (index i drawn as grey i*85), with the selection
  // outline on a tile that is not under test
  await s.page.selectOption('#chrPreviewMode', 'indices'); await s.page.evaluate(() => { S.editTile = 0; render(); }); await s.page.waitForTimeout(200);
  const shown = await sheetTiles(s.page, tileIds), byTile = new Map(); copy1.pieces.forEach((p, i) => { byTile.set(p.tile, expected[i].top); byTile.set(p.tile2, expected[i].bottom); });
  const sheetDiff = tileIds.map((t, i) => ({tile: t, differing: shown[i].flat().filter((v, k) => v !== byTile.get(t).flat()[k]).length}));
  const sheetOk = sheetDiff.every(d => d.differing === 0);
  await shot('I3_chr_sheet_sprite_bank_pixel_values');
  await s.page.selectOption('#chrPreviewMode', 'scene');
  check('I: the CHR Sheet\'s sprite bank ($1000) shows each copied tile with the cartridge\'s pattern (read back from the screen in its pixel-value preview)', sheetOk && await s.page.evaluate(() => S.chrBank === 'spr'), {sheetDiff});
  // ---------------- K: project copies are independent ----------------
  const editTile = copy1.pieces[0].tile, original = scene1.sprChr[editTile][0][0], colour = (original + 1) % 4;
  // the editor's own path: select the tile on the sheet, choose the colour, paint the pixel (each control scrolled into view)
  const box = await s.page.$eval('#cv', c => { const r = c.getBoundingClientRect(); return {w: r.width, h: r.height}; });
  await s.page.locator('#cv').click({position: {x: ((editTile % 16) * 8 + 4) * box.w / 128, y: (Math.floor(editTile / 16) * 8 + 4) * box.h / 128}});
  await s.page.waitForFunction(t => S.editTile === t, editTile);
  await s.page.keyboard.press(String(colour + 1));
  const ed = await s.page.$eval('#chrEditCanvas', c => c.getBoundingClientRect().width);
  await s.page.locator('#chrEditCanvas').click({position: {x: ed / 16, y: ed / 16}}); await committed(s.page);
  await shot('K1_copy_edited_in_chr_sheet');
  const used2 = await s.page.evaluate(async id => { const r = await Forge.commands.run('library.usePose', {id, mode: 'copy'}); if (!r.ok) throw Error(r.error.message); return {id: S.metasprites[S.metasprites.length - 1].id}; }, poseId);
  await committed(s.page);
  p1 = await project(s.page);
  const c1 = p1.metasprites.find(m => m.id === used1.id), c2 = p1.metasprites.find(m => m.id === used2.id), sc = p1.scenes.find(x => x.id === c1.sceneId);
  const libAfter = await s.page.evaluate(async id => { const L = Forge.services.ResourceLibrary, e = await L.entry(id), b = await L.blobBytes(e.rendition.hash); return {entry: JSON.stringify(e), rendition: Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', b))).map(x => x.toString(16).padStart(2, '0')).join('')}; }, poseId);
  const c2Tiles = c2.pieces.every((cp, i) => same(sc.sprChr[cp.tile], expected[i].top) && same(sc.sprChr[cp.tile2], expected[i].bottom));
  const c1Edited = sc.sprChr[editTile][0][0] === colour && same(sc.sprChr[editTile].slice(1), expected[0].top.slice(1)) && same(sc.sprChr[editTile][0].slice(1), expected[0].top[0].slice(1));
  const separate = !c2.pieces.some(p => c1.pieces.some(q => q.tile === p.tile || q.tile2 === p.tile2));
  const prov = m => m.library && m.library.mode === 'copy' && m.library.entryId === poseId && m.library.contentHash === poseEntry.contentHash && m.library.sourceSha256 === NINJA && m.library.location?.fileOffset === primary.fileOffset &&
    m.library.derivedFrom?.entryId === poseId;
  const editedPixels = []; for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if (sc.sprChr[editTile][y][x] !== expected[0].top[y][x]) editedPixels.push({x, y, from: expected[0].top[y][x], to: sc.sprChr[editTile][y][x]});
  const c2Diff = c2.pieces.map((cp, i) => ({i, top: same(sc.sprChr[cp.tile], expected[i].top), bottom: same(sc.sprChr[cp.tile2], expected[i].bottom)})).filter(d => !d.top || !d.bottom);
  report.phases.K = {editTile, from: original, to: colour, editedPixels, copy1Edited: c1Edited, copy2: c2.id, copy2TilesMatch: c2Tiles, copy2Diff: c2Diff, separateTiles: separate, libraryEntryUnchanged: libAfter.entry === libBefore.entry, renditionUnchanged: libAfter.rendition === libBefore.rendition,
    pixelColour: await s.page.evaluate(() => S.selPixColor)};
  check('K: editing a pixel of one copy changes that copy only: the library entry and its stored rendition are unchanged, and a second copy of the same pose gets its own tiles, equal to the cartridge',
    c1Edited && c2Tiles && separate && libAfter.entry === libBefore.entry && libAfter.rendition === libBefore.rendition, report.phases.K);
  check('K: both copies keep their provenance: library entry, content hash, source ROM SHA-256 and the pose\'s original ROM offset', prov(c1) && prov(c2), {copy1: c1.library, copy2: c2.library && {entryId: c2.library.entryId, location: c2.library.location}});
  const projectAtClose = JSON.stringify({metasprites: p1.metasprites, scene: sc});
  await s.page.close({runBeforeUnload: true}); await sleep(800); await s.ctx.close();
  // ---------------- X: later sessions ----------------
  await stopWorker(); await startWorker();
  s = await open(P1); shot = shotOf(s.page);
  await s.page.evaluate(() => Forge.services.InvestigationPanel.whenReady()); await s.page.waitForFunction(() => Forge.services.InvestigationPanel.state().connected, null, {timeout: 20000});
  if (await s.page.$('#autosaveBanner .ab-restore')) { await s.page.click('#autosaveBanner .ab-restore'); await s.page.waitForFunction(() => Forge.services.ProjectStore.recoveryState().report); }
  const jobsBefore = jobs().length, invX0 = await inventory(s.page, NINJA);
  await s.page.setInputFiles('#projectGatewayFile', NG);
  const recognizedNotice = await until(() => s.page.evaluate(() => Forge.services.InvestigationPanel.state().notices.find(n => /^Recognized Ninja Gaiden/.test(n)) || null), 30000, 300,
    () => s.page.evaluate(() => Forge.services.InvestigationPanel.state()));
  await s.page.waitForTimeout(1500);
  const recognized = await s.page.evaluate(x => Forge.services.LibraryCatalog.recognize(x), NINJA), panelX = await s.page.evaluate(() => Forge.services.InvestigationPanel.state());
  await s.page.evaluate(() => { const d = document.getElementById('agentLabPanel'); if (!d.open) d.querySelector('summary').click(); d.scrollIntoView({block: 'start'}); }); await shot('X1_rom_recognized_no_investigation');
  report.phases.X = {jobsBefore, jobsAfter: jobs().length, recognizedNotice, recognized: {catalog: recognized.catalog, frames: recognized.frames, investigations: recognized.investigations.length, recovered: recognized.recovered}, pending: panelX.pending};
  check('X: after closing Forge and restarting the worker, opening the same ROM is recognized from the library before any investigation: no job is requested, the notice names what is known',
    jobs().length === jobsBefore && panelX.pending.length === 0 && /No new investigation was queued/.test(recognizedNotice || '') && recognized.recovered && recognized.catalog.state === 'complete' && recognized.catalog.entries === 590 && recognized.frames === 22,
    report.phases.X);
  // visual resources
  const invX = await inventory(s.page, NINJA), px = await project(s.page);
  const pc1 = px.metasprites.find(m => m.id === used1.id), psc = pc1 && px.scenes.find(x => x.id === pc1.sceneId);
  const sceneCount = px.scenes.length, framePick = await s.page.evaluate(async x => (await Forge.services.ResourceLibrary.list({shelf: x, kind: 'frame', search: 'Stage 1-1', limit: 5})).items[0].id, NINJA);
  const openedFrame = await s.page.evaluate(id => Forge.commands.run('library.openFrameScene', {id}), framePick);
  const copy3 = await s.page.evaluate(async id => { const r = await Forge.commands.run('library.usePose', {id, mode: 'copy'}); return r.ok ? {ok: true, id: S.metasprites[S.metasprites.length - 1].id} : {ok: false, error: r.error.message}; }, poseId);
  const px2 = await project(s.page), c3 = copy3.ok && px2.metasprites.find(m => m.id === copy3.id), sc3 = c3 && px2.scenes.find(x => x.id === c3.sceneId);
  const c3Tiles = !!c3 && c3.pieces.every((cp, i) => same(sc3.sprChr[cp.tile], expected[i].top) && same(sc3.sprChr[cp.tile2], expected[i].bottom));
  report.phases.X.visual = {inventory: invX, projectCopiesBack: !!psc && JSON.stringify({metasprites: px.metasprites, scene: psc}) === projectAtClose, frameScene: openedFrame.ok ? openedFrame.result.name : openedFrame.error?.message, copyAgain: copy3.ok, copyAgainTiles: c3Tiles};
  check('X: visual resources are all there and usable: 590 catalog entries (202 poses, 48 rooms, 32 CHR banks), 22 frames; the project\'s copies and the edited pixel came back unchanged; a frame opens as a new Scene; the pose copies again with the cartridge\'s tiles',
    JSON.stringify(invX) === JSON.stringify(invX0) && invX.catalog === 590 && invX.poses === 202 && invX.rooms === 48 && invX.chr === 32 && invX.frames === 22 && report.phases.X.visual.projectCopiesBack && openedFrame.ok && px2.scenes.length === sceneCount + 1 && c3Tiles,
    report.phases.X.visual);
  // code-oriented resources: symbols, RAM map, and CODE/RE at recorded offsets (bytes read back from the RE workspace)
  const symbols = await readJson(s.page, 'rom:' + NINJA.slice(0, 16) + ':symbols:symbols'), ram = await readJson(s.page, 'rom:' + NINJA.slice(0, 16) + ':ram-map:ram');
  const reAt = async (id, opts = {}) => s.page.evaluate(async ([x, o]) => { const r = await Forge.commands.run('library.inspectCode', {id: x, ...o}); if (!r.ok) return {error: r.error.message};
    const RE = Forge.services.REAnalysisUI; for (let t = Date.now(); Date.now() - t < 60000; await new Promise(res => setTimeout(res, 200))) { const g = RE.getState(); if (g.opened && !g.busy && !g.pendingSelection && g.selection) break; }
    const a = RE.currentAnalysis(), sel = RE.getState().selection; if (!r.result.opened || !a || !sel) return {error: 'the RE workspace did not open the location: ' + (r.result.reason || ''), state: RE.getState()}; const len = Math.min(sel.length, 256);
    let dis = null; try { dis = a.disassemble({fileOffset: sel.fileOffset, length: Math.min(sel.length, 64), cpuAddress: sel.cpuAddress ?? undefined, variant: sel.variant}); } catch (e) { dis = {error: e.message}; }
    return {fileOffset: r.result.fileOffset, cpu: r.result.cpuAddress, code: r.result.code, selection: sel, bytes: a.read(sel.fileOffset, len).bytes, lines: Array.isArray(dis?.lines) ? dis.lines.length : Array.isArray(dis?.instructions) ? dis.instructions.length : null}; }, [id, opts]);
  const rePose = await reAt(poseId), reRoom = await reAt('rom:' + NINJA.slice(0, 16) + ':room:ng:0:0'), reFrame = await reAt(framePick, {code: true});
  await shot('X2_frame_code_location_in_code_re');
  const romBytes = r => r && !r.error && Buffer.from(r.bytes).equals(ROM.subarray(r.selection.fileOffset, r.selection.fileOffset + r.bytes.length));
  const symMapped = (symbols.items || []).filter(t => Array.isArray(t) && Number.isInteger(t[0]) && Number.isInteger(t[1])).length;
  report.phases.X.code = {symbols: (symbols.items || []).length, symbolsWithAddress: symMapped, ramLabels: (ram.items || []).length, pose: rePose && {fileOffset: rePose.fileOffset, bytes: romBytes(rePose), error: rePose.error},
    room: reRoom && {fileOffset: reRoom.fileOffset, length: reRoom.selection?.length, bytes: romBytes(reRoom), error: reRoom.error}, frameCode: reFrame && {fileOffset: reFrame.fileOffset, cpu: reFrame.cpu, code: reFrame.code, bytes: romBytes(reFrame), lines: reFrame.lines, error: reFrame.error}};
  check('X: code-oriented resources are all there and open in CODE/RE: 1992 symbols and 89 RAM labels; the pose\'s piece stream, room 0\'s data and the frame\'s code location open at their recorded offsets, and the RE workspace shows the cartridge\'s bytes there',
    (symbols.items || []).length === 1992 && (ram.items || []).length === 89 && rePose.fileOffset === primary.fileOffset && romBytes(rePose) && reRoom.fileOffset === 16 && romBytes(reRoom) &&
    reFrame && !reFrame.error && reFrame.code === true && Number.isInteger(reFrame.cpu) && romBytes(reFrame), report.phases.X.code);
  check('No uncaught page errors (sessions S, I, K, X)', s.errors.length === 0, s.errors.slice(0, 3));
  await committed(s.page).catch(() => {});
  await s.page.close({runBeforeUnload: true}); await sleep(800); await s.ctx.close();
  // recognition does not need the worker
  await stopWorker();
  s = await open(P1); shot = shotOf(s.page);
  await s.page.setInputFiles('#projectGatewayFile', NG);
  const offlineNotice = await until(() => s.page.evaluate(() => Forge.services.InvestigationPanel.state().notices.find(n => /^Recognized Ninja Gaiden/.test(n)) || null), 30000).catch(() => null);
  const offlinePanel = await s.page.evaluate(() => Forge.services.InvestigationPanel.state());
  report.phases.X.workerStopped = {notice: offlineNotice, pending: offlinePanel.pending, connected: offlinePanel.connected, waitingNotice: offlinePanel.notices.find(n => /will be investigated when/.test(n)) || null};
  check('X: with the worker stopped, the ROM is still recognized from the library; nothing is left waiting to be investigated', !!offlineNotice && offlinePanel.pending.length === 0 && !report.phases.X.workerStopped.waitingNotice, report.phases.X.workerStopped);
  await s.ctx.close();
  // ---------------- Z: Zelda II, interrupted and completed by the same recovery ----------------
  const PZ = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-integrity-pz-'));
  s = await open(PZ, {hook: {k: 1120}}); shot = shotOf(s.page);
  let midway = null; const reached = new Promise(r => { midway = r; });
  await s.ctx.exposeBinding('__qaMidCatalog', (_, n) => midway(n));
  await importInvestigated(s.page, Z2); await s.page.evaluate(() => switchTab('scene')); await committed(s.page);
  const zExpected = await s.page.evaluate(() => { const c = Forge.services.ProjectStore.capture().investigation.catalogs, n = c.native || {}, len = v => (Array.isArray(v) ? v.length : 0);
    return len(n.scenes) + len(n.stages) + len(n.poses) + len(n.animations) + len(n.actors) + len(n.locations) + len(n.graphics) + len(c.spatial?.maps) + len(c.audio?.cues) + len(c.audio?.instruments) + len(c.audio?.samples) + 2; });
  await s.page.evaluate(() => { void Forge.commands.run('library.registerCatalog'); });
  const zPuts = await reached; await sleep(800);
  const zAtKill = await s.page.evaluate(x => Forge.commands.run('library.catalogs').then(r => r.result.find(c => c.sha === x)), ZELDA);
  const pids = execSync('pgrep -f -- "--user-data-dir=' + PZ + '" || true').toString().split(/\s+/).filter(Boolean); for (const pid of pids) { try { process.kill(Number(pid), 'SIGKILL'); } catch (_) {} } await sleep(1500);
  s = await open(PZ); shot = shotOf(s.page);
  await until(() => status(s.page, ZELDA).then(x => x && x.state === 'needs-source'), 30000, 300, () => s.page.evaluate(() => Forge.services.LibraryCatalog.recoveryStatus()));
  const zBefore = await inventory(s.page, ZELDA);
  await s.page.click('#frx-open'); await s.page.click('#frx-lib'); await s.page.waitForSelector('#frx-catalog-status'); await shot('Z1_zelda_catalog_incomplete_after_kill'); await s.page.click('#frx-close');
  await s.page.click('#autosaveBanner .ab-restore'); await s.page.waitForFunction(() => Forge.services.ProjectStore.recoveryState().report);
  const zDone = await until(() => status(s.page, ZELDA).then(x => x && ['complete', 'failed', 'needs-retry'].includes(x.state) ? x : null), 300000, 500, () => s.page.evaluate(() => Forge.services.LibraryCatalog.recoveryStatus()));
  const zAfter = await inventory(s.page, ZELDA), zPack = await s.page.evaluate(async x => { const c = (await Forge.commands.run('library.catalogs')).result.find(v => v.sha === x); return (await Forge.services.ResourceLibrary.getPack(c.packKey)); }, ZELDA);
  const zChr = await s.page.evaluate(async x => { const L = Forge.services.ResourceLibrary, list = (await L.list({shelf: x, kind: 'chr', limit: 100})).items.filter(e => e.origin === 'rom-catalog'), out = [];
    for (const item of list) { const e = await L.entry(item.id), r = await Forge.commands.run('library.read', {id: e.id, as: 'base64'}); out.push({fileOffset: e.record?.fileOffset, length: e.record?.length, data: r.result.base64}); } return out; }, ZELDA);
  const zChrStart = 16 + ZROM[4] * 16384, zOffsets = zChr.map(c => c.fileOffset).sort((a, b) => a - b);
  const zVerify = await s.page.evaluate(() => Forge.commands.run('library.verify', {}).then(r => r.result));
  await s.page.click('#frx-open'); await s.page.click('#frx-lib'); await s.page.waitForTimeout(1500); await shot('Z2_zelda_catalog_completed');
  report.phases.Z = {expectedRecords: zExpected, putsAtHold: zPuts, atKill: zAtKill && {state: zAtKill.state, attempts: zAtKill.attempts}, before: zBefore, completion: {state: zDone.state, kept: zDone.kept, written: zDone.written, source: zDone.source, attempts: zDone.attempts},
    after: zAfter, scan: {pagesRead: zPack?.stats?.pagesRead, alreadyStored: zPack?.stats?.alreadyStored}, chr: {banks: zChr.length, contiguous: zOffsets.every((o, i) => o === zChrStart + i * 4096), bytes: zChr.every(c => Buffer.from(c.data, 'base64').equals(ZROM.subarray(c.fileOffset, c.fileOffset + c.length)))},
    verify: {ok: zVerify.ok, problems: zVerify.problems.slice(0, 3)}};
  check('Z: Zelda II\'s registration, interrupted after 1120 entries by killing the browser, is detected as incomplete on reopening with what was written kept',
    zAtKill?.state === 'incomplete' && zBefore.catalog === 1120 && zBefore.uniqueIds === zBefore.total, report.phases.Z);
  check('Z: the same generic recovery completes it from the restored project: the 1120 entries are kept (read back in two pages of the resume scan), the rest written; every recovered record is in the library once; its 32 CHR banks hold the cartridge\'s bytes; the library verifies clean',
    zDone.state === 'complete' && zDone.kept === 1120 && zDone.kept + zDone.written === zExpected && zAfter.catalog === zExpected && zAfter.uniqueIds === zAfter.total && zPack?.stats?.pagesRead === 2 && zPack?.stats?.alreadyStored === 1120 &&
    zChr.length === 32 && report.phases.Z.chr.contiguous && report.phases.Z.chr.bytes && zVerify.ok, report.phases.Z);
  check('No uncaught page errors (Zelda II session)', s.errors.length === 0, s.errors.slice(0, 3));
  await s.ctx.close();
  await stopWorker();
  report.passed = report.checks.length > 0 && report.checks.every(c => c.passed);
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(report.passed ? 'library-integrity: all checks passed' : 'library-integrity: FAILED');
  setTimeout(() => { if (report.passed) for (const d of [root, P1, PZ]) fs.rmSync(d, {recursive: true, force: true}); process.exit(report.passed ? 0 : 1); }, 500);
})().catch(async e => { console.log('FAILED', e.stack); report.passed = false; report.error = e.message; try { fs.writeFileSync(output, JSON.stringify(report, null, 2)); } catch (_) {} try { worker?.kill('SIGKILL'); } catch (_) {} process.exit(1); });
