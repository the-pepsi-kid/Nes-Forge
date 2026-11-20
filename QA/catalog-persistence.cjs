'use strict';
// Recovered resource catalogs persist across closing and reopening NES Forge (owner-side: needs the cartridges; the
// report holds counts and digests only). In a real Chromium profile on disk:
//   session 1  import each ROM, save it in the browser (IndexedDB), let autosave write the recovery copy, and write a
//              portable project file
//   close the browser, start it again on the same profile
//   session 2  open the browser save, restore the recovery copy, and open the project file in a fresh profile
// Each reopened copy must carry the identical investigation catalogs: the same digests, counts and catalog JSON, and
// validate as the investigated revision.
//   node QA/catalog-persistence.cjs <NES_Forge.html> <report.json> <folder with the cartridges>
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), crypto = require('node:crypto');
const {chromium} = require('playwright');
const [editorArg, output, cartDir] = process.argv.slice(2);
const editor = path.resolve(editorArg), sha = b => crypto.createHash('sha256').update(b).digest('hex');
const report = {editorSha256: sha(fs.readFileSync(editor)), games: [], checks: []};
const GAMES = [['Ninja Gaiden (US)', '07d9e57e35184667c7b89e30857a44c5c404b48332ad12e66be91100eccd4f5e'], ['Zelda II (US)', null]];
const carts = fs.readdirSync(cartDir).filter(f => /\.nes$/i.test(f)).map(f => path.join(cartDir, f));
const findCart = ([title, hash]) => carts.find(f => hash ? sha(fs.readFileSync(f)) === hash : /zelda 2|adventure of link/i.test(path.basename(f)));
const launch = dir => chromium.launchPersistentContext(dir, {headless: true, ...(process.env.CHROMIUM_PATH ? {executablePath: process.env.CHROMIUM_PATH} : {})});
const open = async ctx => { const p = ctx.pages()[0] || await ctx.newPage(); p.setDefaultTimeout(600000); await p.goto('file://' + editor); await p.waitForFunction('window.Forge?.commands&&window.Forge.services?.ProjectStore'); return p; };
// fingerprint of the catalogs in the live project, computed in the page
const fingerprint = page => page.evaluate(() => {
  const p = Forge.services.ProjectStore.capture(), n = p.investigation; if (!n) return null;
  const json = JSON.stringify(n.catalogs), counts = {};
  for (const [k, c] of Object.entries(n.catalogs)) for (const [kk, v] of Object.entries(c)) if (Array.isArray(v)) counts[k + '.' + kk] = v.length;
  let valid = true; try { Forge.services.InvestigationProject.validate(p); } catch (e) { valid = e.message; }
  return {digests: n.catalogSha256, counts, jsonLength: json.length, json, valid, source: n.source.sha256};
});
const strip = f => f && ({...f, json: undefined});
(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-profile-')), fileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-files-'));
  const original = {}, saved = {};
  try {
    // ---- session 1 ----
    let ctx = await launch(profile), page = await open(ctx);
    for (const game of GAMES) {
      const cart = findCart(game); if (!cart) { report.checks.push({name: game[0] + ': cartridge present', passed: false, error: 'not found'}); continue; }
      const b64 = fs.readFileSync(cart).toString('base64');
      const r = await page.evaluate(async b64 => { const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0)); return (await Forge.commands.run('rom.import', {bytes, name: 'cart.nes'})).ok; }, b64);
      if (!r) throw Error(game[0] + ' import failed');
      original[game[0]] = await fingerprint(page);
      saved[game[0]] = {id: await page.evaluate(n => Forge.services.ProjectStore.saveBrowser(n), game[0] + ' catalog persistence')};
      const text = await page.evaluate(() => Forge.services.ProjectStore.serialize());
      const file = path.join(fileDir, game[0].replace(/\W+/g, '_') + '.nesforge.json'); fs.writeFileSync(file, text); saved[game[0]].file = file;
      report.games.push({game: game[0], sourceSha256: original[game[0]].source, catalogJsonBytes: original[game[0]].jsonLength, projectFileBytes: text.length, counts: original[game[0]].counts, digests: original[game[0]].digests, browserSaveId: saved[game[0]].id !== null});
    }
    // the recovery copy holds the last project (Zelda II): let autosave write it
    const autosaved = await page.evaluate(() => Forge.services.ProjectStore.autoSave());
    await ctx.close();
    // ---- session 2: same profile ----
    ctx = await launch(profile); page = await open(ctx);
    const recovery = await page.evaluate(async () => { const offered = await Forge.services.ProjectStore.checkRecovery(); const restored = offered ? await Forge.services.ProjectStore.restoreRecovery() : false; return {offered, restored}; });
    const restoredFp = await fingerprint(page);
    for (const game of GAMES) {
      const o = original[game[0]]; if (!o) continue;
      const opened = await page.evaluate(id => Forge.services.ProjectStore.openBrowser(id), saved[game[0]].id);
      const b = await fingerprint(page);
      report.checks.push({name: game[0] + ': browser save reopened after closing the browser', passed: !!opened && b?.json === o.json && b.valid === true, detail: strip(b)?.counts});
    }
    const last = GAMES[GAMES.length - 1][0];
    report.checks.push({name: last + ': autosave recovery restored after closing the browser', passed: autosaved === true && recovery.offered === true && restoredFp?.json === original[last]?.json && restoredFp?.valid === true, detail: {autosaved, ...recovery}});
    await ctx.close();
    // ---- project files in a fresh profile (another machine) ----
    const fresh = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-fresh-'));
    ctx = await launch(fresh); page = await open(ctx);
    for (const game of GAMES) {
      const o = original[game[0]]; if (!o) continue;
      const text = fs.readFileSync(saved[game[0]].file, 'utf8');
      await page.evaluate(t => Forge.services.ProjectStore.load(t, {intent: 'file-open'}), text);
      const f = await fingerprint(page);
      report.checks.push({name: game[0] + ': project file reopened in a fresh profile', passed: f?.json === o.json && f.valid === true && JSON.stringify(f.digests) === JSON.stringify(o.digests), detail: strip(f)?.counts});
    }
    await ctx.close();
  } catch (e) { report.checks.push({name: 'run', passed: false, error: String(e.message).slice(0, 500)}); }
  report.passed = report.checks.length > 0 && report.checks.every(c => c.passed);
  for (const c of report.checks) console.log((c.passed ? 'PASS ' : 'FAIL ') + c.name + (c.error ? ': ' + c.error : ''));
  for (const g of report.games) console.log(`  ${g.game}: catalogs ${g.catalogJsonBytes} bytes of JSON, project file ${g.projectFileBytes} bytes`);
  if (output) fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  process.exitCode = report.passed ? 0 : 1;
})();
