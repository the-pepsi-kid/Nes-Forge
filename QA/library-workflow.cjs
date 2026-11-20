'use strict';
// Owner-side workflow with actual recovered resources (needs the Ninja Gaiden US cartridge; no game data is written to
// the report, screenshots go to the given private folder):
//   import Ninja Gaiden, register its recovered catalog in the library and observe Stage 1-1 / 2-1 / 2-2 at runtime;
//   open an ordinary working project; in Resources › Library choose Stage 1-1, pick a sprite observed there and use
//   it by reference; choose Stage 2-2, pick a sprite that does not appear in 1-1 and copy it; both show in the
//   working scene at once with their tiles and palette; editing the reference asks first and declining leaves it
//   unchanged; save/reopen keeps the reference and the copy with their provenance.
//   node QA/library-workflow.cjs <NES_Forge.html> <report.json> <folder with the cartridge> [<screenshot folder>]
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), crypto = require('node:crypto');
const {chromium} = require('playwright');
const [editorArg, output, cartDir, shots] = process.argv.slice(2);
const editor = path.resolve(editorArg), root = path.resolve(__dirname, '..'), sha = b => crypto.createHash('sha256').update(b).digest('hex');
const report = {editorSha256: sha(fs.readFileSync(editor)), checks: [], steps: []};
const check = (name, passed, detail) => report.checks.push({name, passed: !!passed, ...(detail === undefined ? {} : {detail})});
const NINJA = '07d9e57e35184667c7b89e30857a44c5c404b48332ad12e66be91100eccd4f5e';
(async () => {
  const cart = fs.readdirSync(cartDir).map(f => path.join(cartDir, f)).find(f => /\.nes$/i.test(f) && sha(fs.readFileSync(f)) === NINJA);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-workflow-'));
  const ctx = await chromium.launchPersistentContext(profile, {headless: true, viewport: {width: 1440, height: 900}, ...(process.env.CHROMIUM_PATH ? {executablePath: process.env.CHROMIUM_PATH} : {})});
  const page = ctx.pages()[0] || await ctx.newPage(); page.setDefaultTimeout(3600000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  let dialogAnswer = true; page.on('dialog', d => { report.steps.push({dialog: d.message().slice(0, 240), answer: dialogAnswer}); dialogAnswer ? d.accept() : d.dismiss(); });
  const shot = async name => { if (shots) await page.screenshot({path: path.join(shots, name + '.png')}); };
  const run = (name, args) => page.evaluate(async ([name, args]) => { if (args?.__b64) { args = {...args, bytes: Uint8Array.from(atob(args.__b64), c => c.charCodeAt(0))}; delete args.__b64; }
    const r = await Forge.commands.run(name, args); if (!r.ok) throw Error(name + ': ' + r.error.message); return r.result; }, [name, args]);
  try {
    if (!cart) throw Error('Ninja Gaiden (US) cartridge not found');
    await page.goto('file://' + editor); await page.waitForFunction('window.Forge?.services?.LibraryCatalog');
    // 1. discovery: the recovered catalog and a runtime look at three stages
    await run('rom.import', {__b64: fs.readFileSync(cart).toString('base64'), name: 'Ninja Gaiden (U).nes'});
    const reg = await run('library.registerCatalog');
    const survey = await run('library.surveyStages', {areas: '0,2,3', frames: 3000});
    report.steps.push({catalog: reg.stats, survey: survey.areas.map(a => ({stage: a.stage, poses: (a.observations || []).filter(o => o.onScreen).map(o => o.poseId)}))});
    check('The recovered catalog is in the library with verified stages and sprite renditions', reg.stats.entries > 500 && reg.stats.renditions > 100 && reg.stats.verifiedPlacements > 0, reg.stats);
    // 2. the working project: an ordinary Forge project
    await run('project.load', {json: fs.readFileSync(path.join(root, 'Examples/TwoStages.nesforge.json'), 'utf8')});
    const before = await page.evaluate(() => { const p = Forge.services.ProjectStore.capture(); return {scene: p.scenes[p.activeScene].name, metasprites: p.metasprites.length}; });
    await page.click('#studioMode-edit').catch(() => {}); await shot('workflow_0_working_project');
    // 3. Library › Stage 1-1 › a sprite observed there › use it (reference)
    const pickSprite = async (stage, avoid = []) => {
      await page.click('#frx-open'); await page.click('#frx-lib');
      await page.waitForFunction(() => document.querySelectorAll('#frx-items .frx-item').length > 100);
      await page.selectOption('#frx-stage', stage);
      const items = await page.$$eval('#frx-items .frx-item', (bs, stage) => bs.slice(0, 80).map((b, i) => ({i, text: b.textContent})).filter(x => /Library · pose/.test(x.text) && x.text.includes(stage + ' (observed)')), stage);
      const pick = items.find(x => !avoid.some(a => x.text.includes(a)));
      if (!pick) throw Error('no observed sprite listed first for ' + stage);
      await (await page.$$('#frx-items .frx-item'))[pick.i].click();
      await page.waitForSelector('#frx-preview canvas');
      return pick.text;
    };
    const first = await pickSprite('Stage 1-1');
    await shot('workflow_1_stage_1-1_sprite');
    await page.click('text=Use in project (reference)');
    await page.waitForFunction(() => !document.getElementById('frx-root').classList.contains('frx-visible'));
    await page.waitForTimeout(400); await shot('workflow_2_referenced_in_scene');
    // 4. Library › Stage 2-2 › a sprite not seen in Stage 1-1 › copy it
    const stage11 = (report.steps.find(s => s.survey)?.survey.find(a => a.stage === 'Stage 1-1')?.poses) || [];
    const names11 = await page.evaluate(async ids => { const out = []; for (const id of ids) { try { const e = await Forge.services.ResourceLibrary.entry('rom:07d9e57e35184667:pose:' + id); out.push(e.label); } catch (_) {} } return out; }, stage11);
    const second = await pickSprite('Stage 2-2', names11);
    await shot('workflow_3_stage_2-2_sprite');
    await page.click('text=Copy into project (tiles + palette)');
    await page.waitForFunction(() => !document.getElementById('frx-root').classList.contains('frx-visible'));
    await page.waitForTimeout(400); await shot('workflow_4_copied_in_scene');
    const after = await page.evaluate(() => { const p = Forge.services.ProjectStore.capture(), sc = p.scenes[p.activeScene];
      return {scene: sc.name, sprites: sc.oam.filter(o => o.active !== false).length, lib: p.metasprites.filter(m => m.library).map(m => ({id: m.id, name: m.name, mode: m.library.mode, stage: m.library.stage, derivedFrom: !!m.library.derivedFrom, pieces: m.pieces.length}))}; });
    report.steps.push({picked: [first.slice(0, 80), second.slice(0, 80)], project: after});
    check('Stage 1-1 sprite referenced and Stage 2-2 sprite copied into the working scene', after.lib.length === 2 && after.lib[0].mode === 'reference' && after.lib[0].stage === 'Stage 1-1' && after.lib[1].mode === 'copy' && after.lib[1].stage === 'Stage 2-2' && after.lib[1].derivedFrom && after.scene === before.scene && after.sprites > 0, after);
    // 5. the reference is protected: decline the prompt and the edit is undone
    await page.evaluate(() => { switchTab('metasprites'); Forge163.metasprites.select('lib_1'); });
    const x0 = await page.evaluate(() => Forge163.metasprites.current.pieces[0].x);
    dialogAnswer = false;
    await page.evaluate(() => { const i = document.getElementById('msX163'); i.value = String(Number(i.value) + 3); i.dispatchEvent(new Event('change', {bubbles: true})); });
    await page.waitForTimeout(300);
    const kept = await page.evaluate(() => { const f = S.metasprites.find(m => m.id === 'lib_1'); return {mode: f.library.mode, x: f.pieces[0].x}; });
    check('Editing the shared reference asks first; declining leaves it unchanged', kept.mode === 'reference' && kept.x === x0 && report.steps.some(s => /shared reference/.test(s.dialog || '')), {kept, x0});
    dialogAnswer = true;
    // 6. save / reopen keeps the provenance
    const text = await page.evaluate(() => Forge.services.ProjectStore.serialize());
    await page.evaluate(t => Forge.services.ProjectStore.load(t, {intent: 'qa-reopen'}), text);
    const reopened = await page.evaluate(() => Forge.services.ProjectStore.capture().metasprites.filter(m => m.library).map(m => ({mode: m.library.mode, entryId: m.library.entryId, derivedFrom: m.library.derivedFrom?.entryId || null})));
    check('Save and reopen keep the reference and the copy with their library provenance', reopened.length === 2 && reopened[0].mode === 'reference' && reopened[1].mode === 'copy' && reopened[1].derivedFrom === reopened[1].entryId, reopened);
    check('No uncaught page errors', errors.length === 0, errors.slice(0, 3));
  } catch (e) { check('run', false, String(e.stack || e.message).slice(0, 800)); await shot('workflow_error'); }
  await ctx.close();
  report.passed = report.checks.length > 0 && report.checks.every(c => c.passed);
  for (const c of report.checks) console.log((c.passed ? 'PASS ' : 'FAIL ') + c.name + (c.passed || c.detail === undefined ? '' : ': ' + JSON.stringify(c.detail).slice(0, 600)));
  if (output) fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  process.exitCode = report.passed ? 0 : 1;
})();
