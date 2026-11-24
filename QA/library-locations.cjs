'use strict';
// Owner-side regression (needs the Ninja Gaiden US cartridge; the pack folder is optional): ROM locations recovered by
// the decoder are shown with their own address types, are re-read from the cartridge independently, and lead into
// CODE/RE. No game data is written to the report.
//   - thrower_pic_08 (pose enemy:8): file offset 0x8E4F, 16 bytes, PRG ROM, physical PRG bank 2 of 16 KiB, CPU $8E3F
//     with bank 2 at $8000-$BFFF, mapper 1 from the header, PPU address not established, layout check consistent;
//     the pose pointer table entry in the cartridge points at $8E3F and the stream holds the decoded pieces
//   - a CHR bank keeps CHR-only types (no CPU address, no PPU address substituted)
//   - every decoded location agrees with the cartridge layout
//   - Resources › Library shows those rows, not "location unknown"
//   - with the pack: the pack's pose file and the catalog pose are linked on verified identity, both kept
//   - Inspect in CODE/RE opens the ROM at the data, and at a recorded routine (the HUD stage reader at $EB45)
//   node QA/library-locations.cjs <NES_Forge.html> <report.json> <folder with the cartridge> [<folder with Ninja_Gaiden_U.zip>]
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), crypto = require('node:crypto');
const {chromium} = require('playwright');
const [editorArg, output, cartDir, packDir] = process.argv.slice(2);
const editor = path.resolve(editorArg), sha = b => crypto.createHash('sha256').update(b).digest('hex');
const report = {editorSha256: sha(fs.readFileSync(editor)), checks: []};
const check = (name, passed, detail) => { report.checks.push({name, passed: !!passed, ...(detail === undefined ? {} : {detail})}); process.stderr.write((passed ? 'ok ' : 'not ok ') + name + '\n'); };
const NINJA = '07d9e57e35184667c7b89e30857a44c5c404b48332ad12e66be91100eccd4f5e', PREFIX = 'rom:07d9e57e35184667:';
(async () => {
  const cart = fs.readdirSync(cartDir).map(f => path.join(cartDir, f)).find(f => /\.nes$/i.test(f) && sha(fs.readFileSync(f)) === NINJA);
  const pack = packDir ? path.join(packDir, 'Ninja_Gaiden_U.zip') : null;
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-locations-'));
  const ctx = await chromium.launchPersistentContext(profile, {headless: true, viewport: {width: 1440, height: 900}, ...(process.env.CHROMIUM_PATH ? {executablePath: process.env.CHROMIUM_PATH} : {})});
  const page = ctx.pages()[0] || await ctx.newPage(); page.setDefaultTimeout(300000);
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.accept());
  const run = (name, args) => page.evaluate(async ([name, args]) => { if (args?.__b64) { args = {...args, bytes: Uint8Array.from(atob(args.__b64), c => c.charCodeAt(0))}; delete args.__b64; }
    const r = await Forge.commands.run(name, args); if (!r.ok) throw Error(name + ': ' + r.error.message); return r.result; }, [name, args]);
  const record = id => page.evaluate(async id => JSON.parse(new TextDecoder().decode((await Forge.services.ResourceLibrary.readEntry(id)).bytes)), id);
  try {
    if (!cart) throw Error('Ninja Gaiden (US) cartridge not found');
    const rom = fs.readFileSync(cart);
    await page.goto('file://' + editor); await page.waitForFunction('window.Forge?.services?.LibraryProvenance');
    let packResult = null;
    if (pack && fs.existsSync(pack)) packResult = await run('library.register', {__b64: fs.readFileSync(pack).toString('base64'), name: 'Ninja_Gaiden_U.zip'});
    await run('rom.import', {__b64: rom.toString('base64'), name: 'Ninja Gaiden (U).nes'});
    // the import also adds the cartridge's translated CadEditor layouts (CAD-PORT-01) as a pack of their own
    await page.evaluate(() => Forge.services.CadPortRecovery?.settled());
    const reg = await run('library.registerCatalog');
    report.stats = reg.stats;
    check('Every decoded location agrees with the cartridge layout', reg.stats.schema >= 3 && reg.stats.locations > 10000 && reg.stats.inconsistentLocations === 0, reg.stats);
    // 1. thrower_pic_08: the stored, typed location
    const id = PREFIX + 'pose:enemy:8', prov = await run('library.provenance', {id}), p = prov.primary;
    check('thrower_pic_08: file offset 0x8E4F (16 bytes), PRG ROM, physical PRG bank 2 of 16 KiB, CPU $8E3F in $8000-$BFFF, mapper 1, no PPU address',
      p && p.role === 'source' && p.fileOffset === 0x8E4F && p.length === 16 && p.region === 'PRG ROM' && p.prgBank?.index === 2 && p.prgBank?.size === 16384 && !p.chrBank &&
      p.cpu === 0x8E3F && p.cpuWindow?.start === 0x8000 && p.cpuWindow?.end === 0xBFFF && p.ppu === null && p.check === 'consistent with the cartridge layout' && prov.rom?.mapper === 1, p);
    // 2. re-read independently from the cartridge file: the pointer table entry points at the stream, which holds the pieces
    const pose = await record(id), ptr = pose.pointerSource.fileOffset, word = rom[ptr] | rom[ptr + 1] << 8, at = p.fileOffset;
    const pieces = pose.pieces.map((q, i) => ({tile: rom[at + 1 + 3 * i], x: (rom[at + 2 + 3 * i] << 24) >> 24, y: (rom[at + 3 + 3 * i] << 24) >> 24}));
    check('Re-read from the cartridge: the pose pointer at file 0x' + ptr.toString(16).toUpperCase() + ' points to $8E3F, and the stream there holds the decoded pieces',
      word === 0x8E3F && rom[at] === pose.pieces.length && pieces.every((q, i) => q.tile === pose.pieces[i].tile && q.x === pose.pieces[i].x && q.y === pose.pieces[i].y),
      {pointer: '$' + word.toString(16), count: rom[at], pieces: pieces.length});
    // 2b. code is code: an actor's dispatch is its table of state entry pointers (data); its entries are the code
    const thrower = await run('library.provenance', {id: PREFIX + 'actor:ng-actor:2'}), actor = await record(PREFIX + 'actor:ng-actor:2');
    const words = actor.states.map((st, i) => rom[actor.dispatch.fileOffset + 2 * i] | rom[actor.dispatch.fileOffset + 2 * i + 1] << 8);
    check('Code locations are routines: the thrower\'s state pointer table is data, its words (re-read) are the recorded state entries, and only those entries are code',
      thrower.code.length === actor.states.length && thrower.code.every(c => /^states\[\d+\]\.source$/.test(c.role)) && words.every((w, i) => w === actor.states[i].entry && thrower.code[i].cpu === w),
      {code: thrower.code.map(c => c.role + ' $' + c.cpu.toString(16)), table: words.map(w => '$' + w.toString(16))});
    // 3. a CHR bank keeps CHR-only address types
    const chr = (await run('library.provenance', {id: PREFIX + 'chr:chr:2'})).primary;
    check('A CHR bank is located in CHR ROM, physical CHR bank 2 of 4 KiB, with no CPU or PPU address substituted',
      chr && chr.region === 'CHR ROM' && chr.chrBank?.index === 2 && chr.chrBank?.size === 4096 && !chr.prgBank && chr.cpu === null && chr.ppu === null && /^consistent/.test(chr.check), chr);
    // 4. Resources › Library shows the typed rows
    await page.click('#frx-open'); await page.click('#frx-lib');
    await page.waitForFunction(() => document.querySelectorAll('#frx-items .frx-item').length > 100);
    await page.fill('#frx-search', 'thrower_pic_08'); await page.waitForTimeout(400);
    const items = await page.$$eval('#frx-items .frx-item', bs => bs.map((b, i) => ({i, text: b.textContent})));
    await (await page.$$('#frx-items .frx-item'))[items.find(x => !/\.(json|png)/.test(x.text) && /pose/.test(x.text)).i].click();
    await page.waitForFunction(() => /Mapper state/i.test(document.getElementById('frx-preview').innerText));
    const text = await page.$eval('#frx-preview', el => el.textContent);
    check('Resources › Library shows the decoded location with each address type, not "location unknown"',
      /0x08E4F \(36431\) · 16 bytes/.test(text) && /physical bank 2 of 16 KiB/.test(text) && /\$8E3F/.test(text) && /needs PRG bank 2 mapped at \$8000–\$BFFF/.test(text) &&
      /PPU addressnot established/.test(text) && /consistent with the cartridge layout/.test(text) && !/Unknown\. The entry stays/.test(text), text.slice(0, 600));
    // 5. the pack's record of the same pose (only with the pack)
    if (packResult) {
      const packId = 'pack:' + packResult.packSha256.slice(0, 16) + ':Ninja_Gaiden_U/sprites/enemy_poses/pose_thrower_pic_08.json';
      const a = prov.links.find(l => l.id === packId), back = (await run('library.provenance', {id: packId})).links.find(l => l.id === id);
      const status = await run('library.status');
      const cadPort = (await run('library.packs')).filter(p => p.sourceSha256 === sha(rom) && /CadEditor-derived layouts/.test(p.name)).reduce((n, p) => n + (p.stats?.entries || 0), 0);
      check('The pack\'s pose file and the catalog pose are linked on verified identity; both records are kept',
        a && back && /decoder record pose enemy:8/.test(a.basis) && /same horizontal offsets and palettes/.test(a.basis) && reg.links?.linked === 250 && reg.links.mismatched === 0 &&
        cadPort > 0 && status.entries === packResult.stats.entries + reg.stats.entries + cadPort, {link: a?.basis, links: reg.links, entries: status.entries, cadPortPackEntries: cadPort});
      const linked = await page.$$eval('#frx-preview button', bs => bs.some(b => /Same resource: pose_thrower_pic_08\.json/.test(b.textContent)));
      check('Resources shows the linked record', linked);
    }
    await page.click('#frx-close');
    // 6. Inspect in CODE/RE: the data, then a recorded routine
    const ins = await run('library.inspectCode', {id});
    await page.waitForTimeout(400);
    const re = await page.evaluate(() => ({tab: S.tab, sel: Forge.services.REAnalysisUI.getState().selection, hex: document.getElementById('reAnalysisHex').textContent.split('\n')[0], hidden: document.getElementById('reAnalysisWorkspace').hidden,
      origin: document.getElementById('lpvOrigin')?.textContent || '', inView: (() => { const r = document.getElementById('reAnalysisRange').getBoundingClientRect(); return r.top >= 0 && r.top < innerHeight; })()}));
    const expectHex = '008E4F  ' + [...rom.subarray(0x8E4F, 0x8E4F + 16)].map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
    check('Inspect in CODE/RE opens the source ROM at file 0x8E4F with CPU origin $8E3F and PRG bank 2, showing the cartridge\'s bytes',
      ins.opened && re.tab === 'disasm' && !re.hidden && re.inView && re.sel.fileOffset === 0x8E4F && re.sel.cpuAddress === 0x8E3F && re.sel.bankLabel === 'PRG bank 2 at $8000–$BFFF' && re.hex.startsWith(expectHex) && /thrower_pic_08/.test(re.origin),
      {sel: re.sel, hex: re.hex.slice(0, 60), inView: re.inView});
    const stage = await run('library.inspectCode', {id: PREFIX + 'stage:ng-stage:1-1', code: true});
    const code = await page.evaluate(() => ({sel: Forge.services.REAnalysisUI.getState().selection, line: document.getElementById('reAnalysisCode').textContent.split('\n')[0]}));
    const readerHex = [...rom.subarray(stage.fileOffset, stage.fileOffset + 3)].map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
    check('Inspect in CODE/RE opens a recorded routine: the HUD stage reader at $EB45 in PRG bank 7 ($C000-$FFFF)',
      stage.opened && stage.code && code.sel.cpuAddress === 0xEB45 && code.sel.bankLabel === 'PRG bank 7 at $C000–$FFFF' && code.sel.fileOffset === 16 + 7 * 16384 + 0x2B45 && code.line.includes('EB45  ' + readerHex),
      {sel: code.sel, line: code.line});
    // 7. a library registered before typed locations: shown meanwhile, then upgraded in place keeping runtime observations
    await page.evaluate(async id => { const L = Forge.services.ResourceLibrary, e = await L.entry(id), rec = await L.getPack(e.packSha256); rec.stats = {...rec.stats, schema: 1};
      e.evidence = {state: 'decoded', basis: 'NES Forge ROM decoder', locations: 15, fields: {fileOffset: {first: 0x8E50, field: 'fileOffset', count: 15}, cpu: {first: 0x8E40, field: 'cpu', count: 15}, bank: {first: 2, field: 'bank16KiB', count: 15}}};
      e.placement = {verified: [{stage: 'Stage 2-2', area: 3, basis: 'runtime', enemyType: 2, route: 'qa'}]}; e.renditions = {'Stage 2-2': {...e.rendition}};
      await L.putRecords([['packs', rec], ['entries', e]]); }, id);
    const old = await run('library.provenance', {id});
    const up = await run('library.registerCatalog'), after = await page.evaluate(id => Forge.services.ResourceLibrary.entry(id), id);
    check('A library registered before typed locations shows its old location, then upgrades in place keeping runtime observations and renditions',
      old.primary?.fileOffset === 0x8E50 && old.primary.prgBank?.index === 2 && /^not checked/.test(old.primary.check) && up.stats.upgraded === true && up.stats.schema === reg.stats.schema &&
      after.evidence.primary.fileOffset === 0x8E4F && after.placement.verified.some(v => v.basis === 'runtime' && v.stage === 'Stage 2-2') && !!after.renditions?.['Stage 2-2'],
      {old: old.primary, upgraded: up.stats.upgraded, placements: after.placement?.verified?.length});
    check('No uncaught page errors', errors.length === 0, errors.slice(0, 3));
  } catch (e) { check('run', false, String(e.stack || e.message).slice(0, 800)); }
  await ctx.close();
  report.passed = report.checks.length > 0 && report.checks.every(c => c.passed);
  for (const c of report.checks) console.log((c.passed ? 'PASS ' : 'FAIL ') + c.name + (c.passed || c.detail === undefined ? '' : ': ' + JSON.stringify(c.detail).slice(0, 600)));
  if (output) fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  process.exitCode = report.passed ? 0 : 1;
})();
