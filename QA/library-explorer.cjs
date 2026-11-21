'use strict';
// Library discoverability in a real browser (repository inputs only, unless a pack is given):
// opening an extraction pack through the visible intake registers it in the library; ▣ Resources › Library lists
// every entry (unidentified ones included) with its evidence or "location unknown", shows its data on demand, saves
// the developer's notes apart from evidence, and after a reload everything is still listed with the notes.
//   node QA/library-explorer.cjs <NES_Forge.html> <report.json> [<extraction pack .zip>] [<screenshot folder>]
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), crypto = require('node:crypto');
const {chromium} = require('playwright');
const [editorArg, output, packArg, shots] = process.argv.slice(2);
const editor = path.resolve(editorArg), sha = b => crypto.createHash('sha256').update(b).digest('hex');
const report = {editorSha256: sha(fs.readFileSync(editor)), checks: []};
const check = (name, passed, detail) => { report.checks.push({name, passed: !!passed, ...(detail === undefined ? {} : {detail})}); process.stderr.write((passed ? 'ok ' : 'not ok ') + name + '\n'); };
(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-libui-')), tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-pack-'));
  const ctx = await chromium.launchPersistentContext(profile, {headless: true, viewport: {width: 1440, height: 900}, ...(process.env.CHROMIUM_PATH ? {executablePath: process.env.CHROMIUM_PATH} : {})});
  const page = ctx.pages()[0] || await ctx.newPage(); page.setDefaultTimeout(600000);
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.accept());
  try {
    await page.goto('file://' + editor); await page.waitForFunction('window.Forge?.services?.ResourceLibrary');
    // the pack: a given extraction ZIP, or a synthetic one built in the page
    let packFile = packArg && fs.existsSync(packArg) ? path.resolve(packArg) : null;
    if (!packFile) {
      const b64 = await page.evaluate(async () => { const enc = s => new TextEncoder().encode(s);
        const files = [{name: 'Mystery/native_report.json', data: enc(JSON.stringify({format: 'NESForgeNativeExtraction', rom: {sha256: 'ab'.repeat(32), file: 'x.nes'}, game: 'Mystery'}))},
          {name: 'Mystery/stages_art/screen_1.json', data: enc(JSON.stringify({bank16KiB: 3, cpu: 0x9abc, fileOffset: 0xdacc}))}, {name: 'Mystery/raw/blob.bin', data: Uint8Array.from({length: 64}, (_, i) => i)}];
        const bytes = new Uint8Array(await buildZip(files).arrayBuffer()); let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s); });
      packFile = path.join(tmp, 'mystery.zip'); fs.writeFileSync(packFile, Buffer.from(b64, 'base64'));
    }
    await page.setInputFiles('#projectGatewayFile', packFile);
    await page.waitForFunction(() => /Resource library: (registered|.* is already registered)/.test(document.getElementById('projectGatewayLibrary')?.textContent || ''), null, {timeout: 900000});
    const line = await page.textContent('#projectGatewayLibrary');
    const status = await page.evaluate(async () => (await Forge.commands.run('library.status')).result);
    check('Opening a pack through the intake registers it in the library', status.packs === 1 && status.entries > 0, {line: line.slice(0, 200)});
    // ▣ Resources › Library
    await page.click('#frx-open'); await page.click('#frx-lib');
    await page.waitForFunction(() => document.querySelectorAll('#frx-items .frx-item').length > 0);
    const listed = await page.$$eval('#frx-items .frx-item', bs => bs.length), count = await page.textContent('#frx-count');
    check('Resources › Library lists every entry', listed === status.entries, {listed, entries: status.entries, count});
    if (shots) await page.screenshot({path: path.join(shots, 'library_1_list.png')});
    // an unidentified entry: select it, read its data, annotate it
    await page.selectOption('#frx-kind', 'lib · unknown').catch(() => {});
    await page.waitForTimeout(200);
    await page.click('#frx-items .frx-item');
    await page.waitForFunction(() => /Source ROM SHA-256/.test(document.getElementById('frx-preview').textContent));
    const evidenceText = await page.textContent('#frx-preview');
    check('An unidentified entry shows its stated location or says the location is unknown', /File offset|ROM location/.test(evidenceText) && /not identified by the intake/.test(evidenceText));
    const show = await page.$('#frx-preview button:has-text("Show data")'); if (show) { await show.click(); await page.waitForSelector('#frx-preview pre'); }
    check('Its data is shown on demand', !!show && (await page.$('#frx-preview pre')) !== null);
    const nameInput = await page.$('#frx-related-tools input'); await nameInput.fill('My identified screen');
    await page.click('#frx-related-tools button'); await page.waitForFunction(() => /Saved/.test(document.getElementById('frx-related-tools').textContent));
    if (shots) await page.screenshot({path: path.join(shots, 'library_2_entry.png')});
    const selectedId = await page.evaluate(() => Forge.services.ResourceRelationshipPreview.summary().selected.replace(/^lib:/, ''));
    const ins = await page.evaluate(async id => (await Forge.commands.run('library.inspect', {id})).result, selectedId);
    check('Notes are saved apart from the evidence', ins.notes?.name === 'My identified screen' && ins.notes.source === 'developer' && !('name' in (ins.entry.evidence || {})));
    // reload: still listed, notes kept
    await page.reload(); await page.waitForFunction('window.Forge?.services?.ResourceLibrary');
    await page.click('#frx-open'); await page.click('#frx-lib');
    await page.waitForFunction(() => document.querySelectorAll('#frx-items .frx-item').length > 0);
    const after = await page.$$eval('#frx-items .frx-item', bs => bs.length);
    const named = await page.$$eval('#frx-items .frx-item-name', ns => ns.some(n => n.textContent === 'My identified screen'));
    check('After a reload every entry is still listed, with the note', after === listed && named, {after, listed});
    check('No uncaught page errors', errors.length === 0, errors.slice(0, 3));
  } catch (e) { check('run', false, String(e.stack || e.message).slice(0, 600)); }
  await ctx.close();
  report.passed = report.checks.length > 0 && report.checks.every(c => c.passed);
  for (const c of report.checks) console.log((c.passed ? 'PASS ' : 'FAIL ') + c.name + (c.passed || c.detail === undefined ? '' : ': ' + JSON.stringify(c.detail).slice(0, 400)));
  if (output) fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  process.exitCode = report.passed ? 0 : 1;
})();
