'use strict';
// Owner-side development workflow with actual recovered resources (needs the Ninja Gaiden US cartridge; no game data is
// written to the report; screenshots, if asked for, go to the given private folder):
//   discovery   import Ninja Gaiden, register its recovered catalog and observe Stage 1-1 / 2-1 / 2-2 at runtime
//   library     in an ordinary working project, Resources › Library › Stage 1-1: pick a sprite observed there, inspect
//               its origin (typed ROM location) and use it by reference; Stage 2-2: pick a sprite not in 1-1 and copy it
//   editors     both keep their source identity in the Scene panel, the Metasprite editor, the Live Resources view
//               (with a link to their library entry) and the CODE panel
//   CODE/RE     Inspect in CODE/RE opens the source ROM at the copied sprite's data, then at the code associated with it
//               at runtime (its enemy type's actor routine); back in the Scene everything is still in place
//   guard       editing the reference asks first; declining leaves it unchanged
//   reopen      save, close the browser, reopen and load the project: provenance is intact; Inspect asks for the source
//               ROM (not stored anywhere), checks it by SHA-256 and opens it at the same location
//   node QA/library-workflow.cjs <NES_Forge.html> <report.json> <folder with the cartridge> [<screenshot folder>]
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), crypto = require('node:crypto');
const {chromium} = require('playwright');
const [editorArg, output, cartDir, shots] = process.argv.slice(2);
const editor = path.resolve(editorArg), root = path.resolve(__dirname, '..'), sha = b => crypto.createHash('sha256').update(b).digest('hex');
const report = {editorSha256: sha(fs.readFileSync(editor)), checks: [], steps: []};
const check = (name, passed, detail) => { report.checks.push({name, passed: !!passed, ...(detail === undefined ? {} : {detail})}); process.stderr.write((passed ? 'ok ' : 'not ok ') + name + '\n'); };
const NINJA = '07d9e57e35184667c7b89e30857a44c5c404b48332ad12e66be91100eccd4f5e';
(async () => {
  const cart = fs.readdirSync(cartDir).map(f => path.join(cartDir, f)).find(f => /\.nes$/i.test(f) && sha(fs.readFileSync(f)) === NINJA);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-workflow-'));
  const launch = () => chromium.launchPersistentContext(profile, {headless: true, viewport: {width: 1440, height: 900}, ...(process.env.CHROMIUM_PATH ? {executablePath: process.env.CHROMIUM_PATH} : {})});
  let ctx = await launch(), page;
  const errors = [];let dialogAnswer = true;
  const attach = async () => { page = ctx.pages()[0] || await ctx.newPage(); page.setDefaultTimeout(300000); page.on('pageerror', e => errors.push(e.message));
    page.on('dialog', d => { report.steps.push({dialog: d.message().slice(0, 240), answer: dialogAnswer}); dialogAnswer ? d.accept() : d.dismiss(); }); };
  await attach();
  const shot = async name => { if (shots) { await page.waitForTimeout(250); await page.screenshot({path: path.join(shots, name + '.png')}); } };
  const run = (name, args) => page.evaluate(async ([name, args]) => { if (args?.__b64) { args = {...args, bytes: Uint8Array.from(atob(args.__b64), c => c.charCodeAt(0))}; delete args.__b64; }
    const r = await Forge.commands.run(name, args); if (!r.ok) throw Error(name + ': ' + r.error.message); return r.result; }, [name, args]);
  const tab = async label => { await page.click('.tab:text-is("' + label + '")'); await page.waitForTimeout(500); };
  const text = sel => page.$eval(sel, el => el.textContent).catch(() => '');
  const clickIn = (sel, containing, button) => page.evaluate(([sel, containing, button]) => { const card = [...document.querySelectorAll(sel + ' .lpv-card')].find(c => c.textContent.includes(containing));
    const b = card && [...card.querySelectorAll('button')].find(x => x.textContent.includes(button)); if (!b) throw Error('no "' + button + '" for ' + containing + ' in ' + sel); b.click(); }, [sel, containing, button]);
  const reState = () => page.evaluate(() => ({tab: S.tab, sel: Forge.services.REAnalysisUI.getState().selection, origin: document.getElementById('lpvOrigin')?.textContent || '',
    hex: document.getElementById('reAnalysisHex')?.textContent.split('\n')[0] || '', code: document.getElementById('reAnalysisCode')?.textContent.split('\n')[0] || ''}));
  try {
    if (!cart) throw Error('Ninja Gaiden (US) cartridge not found');
    const rom = fs.readFileSync(cart);
    await page.goto('file://' + editor); await page.waitForFunction('window.Forge?.services?.LibraryProvenance');
    // 1. discovery
    await run('rom.import', {__b64: rom.toString('base64'), name: 'Ninja Gaiden (U).nes'});
    const reg = await run('library.registerCatalog');
    process.stderr.write('surveying Stages 1-1, 2-1 and 2-2 in the emulator\n');
    const survey = await run('library.surveyStages', {areas: '0,2,3', frames: 3000});
    report.steps.push({catalog: reg.stats, survey: survey.areas.map(a => ({stage: a.stage, poses: (a.observations || []).filter(o => o.onScreen && o.inSpawnTables).map(o => o.poseId)}))});
    check('The recovered catalog is in the library with verified stages and sprite renditions', reg.stats.entries > 500 && reg.stats.renditions > 100 && reg.stats.verifiedPlacements > 0, reg.stats);
    // 2. the working project: an ordinary Forge project
    await run('project.load', {json: fs.readFileSync(path.join(root, 'Examples/TwoStages.nesforge.json'), 'utf8')});
    const before = await page.evaluate(() => { const p = Forge.services.ProjectStore.capture(); return {scene: p.scenes[p.activeScene].name, metasprites: p.metasprites.length}; });
    await tab('SCENE'); await shot('workflow_00_working_project');
    // 3. Library › stage › sprite: inspect its origin, then use it
    const pickSprite = async (stage, avoid = []) => {
      await page.click('#frx-open'); await page.click('#frx-lib'); await page.fill('#frx-search', '');
      await page.waitForFunction(() => document.querySelectorAll('#frx-items .frx-item').length > 100);
      await page.selectOption('#frx-stage', stage); await page.waitForTimeout(300);
      const items = await page.$$eval('#frx-items .frx-item', (bs, stage) => bs.slice(0, 80).map((b, i) => ({i, text: b.textContent})).filter(x => /Library · pose/.test(x.text) && x.text.includes(stage + ' (observed)')), stage);
      const pick = items.find(x => !avoid.some(a => x.text.includes(a)));
      if (!pick) throw Error('no observed sprite listed first for ' + stage);
      await (await page.$$('#frx-items .frx-item'))[pick.i].click();
      await page.waitForFunction(() => /Mapper state/i.test(document.getElementById('frx-preview').innerText) && !!document.querySelector('#frx-preview canvas'));
      return {name: pick.text.replace(/^◆/, '').replace(/Library · pose.*$/, ''), viewer: await text('#frx-preview')};
    };
    const first = await pickSprite('Stage 1-1');
    await shot('workflow_01_stage_1-1_sprite_origin');
    check('Stage 1-1 sprite: its origin is shown with typed ROM locations before it is used', /File offset0x/.test(first.viewer) && /PRG bankphysical bank/.test(first.viewer) && /CPU address\$/.test(first.viewer) && /Stage 1-1/.test(first.viewer), first.viewer.slice(0, 400));
    await page.click('text=Use in project (reference)');
    await page.waitForFunction(() => !document.getElementById('frx-root').classList.contains('frx-visible'));
    await page.waitForFunction(name => (document.getElementById('lpvScene')?.textContent || '').includes(name), first.name);
    await shot('workflow_02_referenced_in_scene');
    const stage11 = (report.steps.find(s => s.survey)?.survey.find(a => a.stage === 'Stage 1-1')?.poses) || [];
    const names11 = await page.evaluate(async ids => { const out = []; for (const id of ids) { try { out.push((await Forge.services.ResourceLibrary.entry('rom:07d9e57e35184667:pose:' + id)).label); } catch (_) {} } return out; }, stage11);
    const second = await pickSprite('Stage 2-2', names11);
    await shot('workflow_03_stage_2-2_sprite_origin');
    await page.click('text=Copy into project (tiles + palette)');
    await page.waitForFunction(() => !document.getElementById('frx-root').classList.contains('frx-visible'));
    await page.waitForFunction(name => (document.getElementById('lpvScene')?.textContent || '').includes(name), second.name);
    const hadOutline = !!(await page.$('#frx-placed'));
    await shot('workflow_04_copied_in_scene');
    await tab('CHR SHEET'); const outlineGone = !(await page.$('#frx-placed')); await tab('SCENE');
    check('The placement outline shows the new sprite and clears as soon as the scene is left', hadOutline && outlineGone, {hadOutline, outlineGone});
    const after = await page.evaluate(() => { const p = Forge.services.ProjectStore.capture(), sc = p.scenes[p.activeScene];
      return {scene: sc.name, sprites: sc.oam.filter(o => o.active !== false).length, lib: p.metasprites.filter(m => m.library).map(m => ({id: m.id, name: m.name, mode: m.library.mode, stage: m.library.stage, derivedFrom: !!m.library.derivedFrom, location: m.library.location, pieces: m.pieces.length}))}; });
    report.steps.push({picked: [first.name, second.name], project: after});
    check('Stage 1-1 sprite referenced and Stage 2-2 sprite copied into the working scene', after.lib.length === 2 && after.lib[0].mode === 'reference' && after.lib[0].stage === 'Stage 1-1' && after.lib[1].mode === 'copy' && after.lib[1].stage === 'Stage 2-2' && after.lib[1].derivedFrom && after.scene === before.scene && after.sprites > 0, after.lib.map(l => ({id: l.id, mode: l.mode, stage: l.stage})));
    // 3b. browsing: stage grouping, the observed stage's colours, selection that follows filters, previews from the top
    await page.click('#frx-open'); await page.click('#frx-lib'); await page.fill('#frx-search', '');
    await page.waitForFunction(() => document.querySelectorAll('#frx-items .frx-item').length > 100);
    await page.selectOption('#frx-stage', 'Stage 2-2'); await page.waitForTimeout(300);
    const groups = await page.evaluate(() => ({heads: [...document.querySelectorAll('#frx-items .frx-group')].map(h => h.textContent), first: document.getElementById('frx-items').firstElementChild?.className,
      items: document.querySelectorAll('#frx-items .frx-item').length, count: document.getElementById('frx-count').textContent, option: document.getElementById('frx-stage').selectedOptions[0].textContent}));
    await shot('workflow_04b_stage_2-2_grouped');
    check('Stage view: the stage\'s resources under their own heading with a count, then everything else (unassigned included), none hidden',
      groups.first === 'frx-group' && /^In Stage 2-2 · \d+$/.test(groups.heads[0]) && /^Everything else · \d+/.test(groups.heads[1]) && groups.count === groups.items + '/' + groups.items && /^Stage 2-2 · \d+$/.test(groups.option), groups);
    await page.selectOption('#frx-stage', ''); await page.fill('#frx-search', second.name); await page.waitForTimeout(400);
    await page.evaluate(() => [...document.querySelectorAll('#frx-items .frx-item')].find(b => /Library · pose/.test(b.textContent) && !/\.(json|png)/.test(b.textContent))?.click());
    await page.waitForFunction(() => /Drawn with the palette/.test(document.getElementById('frx-preview').textContent));
    const colours = await page.$eval('#frx-preview', el => el.textContent.match(/Drawn with the palette of .*?\)/)?.[0] || '');
    check('With "All stages", a sprite is drawn with the colours of the stage where it was observed', /Area 3 · room 6 \(Stage 2-2\)/.test(colours), colours);
    await page.$eval('#frx-preview', el => { el.scrollTop = el.scrollHeight; });
    await page.fill('#frx-search', first.name); await page.waitForTimeout(400);
    const follow = await page.evaluate(() => ({selected: document.querySelector('#frx-items .frx-item[aria-current="true"]')?.textContent || '', first: document.querySelector('#frx-items .frx-item')?.textContent || '', name: document.getElementById('frx-name').textContent}));
    await page.waitForTimeout(400);
    const top = await page.$eval('#frx-preview', el => el.scrollTop);
    check('A filter that hides the selected entry selects the first listed one, and its preview starts at the top', follow.selected && follow.selected === follow.first && follow.first.includes(follow.name) && top === 0, {...follow, top});
    await page.click('#frx-close');
    // 4. the editors keep the source identity
    const scenePanel = await text('#lpvScene');
    check('Scene editor: both sprites show their library identity and ROM location', scenePanel.includes(first.name) && scenePanel.includes(second.name) && /shared reference/.test(scenePanel) && /independent copy/.test(scenePanel) && /ROM locationfile 0x/.test(scenePanel), scenePanel.slice(0, 400));
    await tab('METASPRITES'); await page.evaluate(() => Forge163.metasprites.select('lib_2'));
    await page.waitForFunction(name => (document.getElementById('msLibrary163')?.textContent || '').includes(name), second.name);
    const msPanel = await text('#msLibrary163');
    await shot('workflow_05_metasprite_editor_provenance');
    check('Metasprite editor: the copy shows where it came from, its typed location and the code associated with it', /Copied from the library/.test(msPanel) && msPanel.includes(second.name) && /Stage 2-2 \(observed at runtime\)/.test(msPanel) &&
      /physical bank \d+ of 16 KiB/.test(msPanel) && /Code ·/.test(msPanel) && /runtime: enemy slot type \d+/.test(msPanel), msPanel.slice(0, 600));
    await page.click('#frx-open'); await page.click('#frx-live'); await page.fill('#frx-search', second.name); await page.waitForTimeout(500);
    const live = await page.$$eval('#frx-items .frx-item', bs => bs.map(b => b.textContent));
    await page.evaluate(() => { const b = [...document.querySelectorAll('#frx-items .frx-item')].find(x => /Metasprite/.test(x.textContent)); b?.click(); });
    await page.waitForTimeout(400);
    const liveText = await page.$eval('#frx-root', el => el.textContent);
    await shot('workflow_06_live_resources_provenance');
    check('Live Resources: the copy is described as a library sprite and depends on its library entry', /Library sprite: an independent copy of/.test(liveText) && /copied from this library entry/.test(liveText) && live.some(t => /Library entry/.test(t)), {live: live.slice(0, 4)});
    await page.click('#frx-close');
    await tab('CODE');
    const codePanel = await text('#lpvCode');
    await shot('workflow_07_code_panel');
    check('CODE: the project\'s library resources are listed with their identity and an Inspect in CODE/RE action', codePanel.includes(first.name) && codePanel.includes(second.name) && /Inspect in CODE\/RE/.test(codePanel), codePanel.slice(0, 300));
    // 5. CODE/RE: the copied sprite's data, then the code associated with it at runtime
    await clickIn('#lpvCode', second.name, 'Inspect in CODE/RE');
    await page.waitForFunction(() => S.tab === 'disasm' && !!Forge.services.REAnalysisUI.getState().selection && /RESOURCE ORIGIN/.test(document.getElementById('lpvOrigin')?.textContent || ''));
    await page.waitForTimeout(500);
    const reData = await reState(), loc = after.lib[1].location;
    const expectHex = loc.fileOffset.toString(16).toUpperCase().padStart(6, '0') + '  ' + [...rom.subarray(loc.fileOffset, loc.fileOffset + 4)].map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
    await shot('workflow_08_inspect_data_in_re');
    check('Inspect in CODE/RE: the copied sprite\'s data in the source ROM, at its recorded offset, CPU address and bank', reData.tab === 'disasm' && reData.sel.fileOffset === loc.fileOffset && reData.sel.cpuAddress === loc.cpu &&
      reData.sel.bankLabel === 'PRG bank ' + loc.prgBank.index + ' at $8000–$BFFF' && reData.hex.startsWith(expectHex) && reData.origin.includes(second.name), {sel: reData.sel, hex: reData.hex.slice(0, 40)});
    await clickIn('#lpvOrigin', second.name, 'View code in RE');
    await page.waitForTimeout(500);
    const reCode = await reState(), prov = await run('library.provenance', {metaspriteId: 'lib_2'}), firstCode = prov.code[0];
    await shot('workflow_09_inspect_code_in_re');
    check('Inspect in CODE/RE: the routine associated at runtime (its enemy type\'s actor code), with its own bank and CPU address', !!firstCode && reCode.sel.fileOffset === firstCode.fileOffset && reCode.sel.cpuAddress === firstCode.cpu &&
      /^states\[\d+\]\.source$/.test(firstCode.role) && /runtime/.test(firstCode.basis) && reCode.code.includes(firstCode.cpu.toString(16).toUpperCase().padStart(4, '0')), {code: firstCode && {name: firstCode.name, owner: firstCode.owner, cpu: firstCode.cpu}, sel: reCode.sel});
    await tab('SCENE');
    const back = await page.evaluate(() => ({sprites: S.scenes[S.activeScene].oam.filter(o => o.active !== false).length, lib: S.metasprites.filter(m => m.library).length, panel: document.getElementById('lpvScene')?.textContent || ''}));
    await shot('workflow_10_back_in_scene');
    check('Back in the Scene: the sprites and their library identity are still there', back.sprites === after.sprites && back.lib === 2 && back.panel.includes(first.name) && back.panel.includes(second.name), {sprites: back.sprites});
    // 6. the reference is protected: decline the prompt and the edit is undone
    await page.evaluate(() => { switchTab('metasprites'); Forge163.metasprites.select('lib_1'); });
    const x0 = await page.evaluate(() => Forge163.metasprites.current.pieces[0].x);
    dialogAnswer = false;
    await page.evaluate(() => { const i = document.getElementById('msX163'); i.value = String(Number(i.value) + 3); i.dispatchEvent(new Event('change', {bubbles: true})); });
    await page.waitForTimeout(300);
    const kept = await page.evaluate(() => { const f = S.metasprites.find(m => m.id === 'lib_1'); return {mode: f.library.mode, x: f.pieces[0].x}; });
    check('Editing the shared reference asks first; declining leaves it unchanged', kept.mode === 'reference' && kept.x === x0 && report.steps.some(s => /shared reference/.test(s.dialog || '')), {kept, x0});
    dialogAnswer = true;
    // 7. save, close the browser, reopen, load: provenance intact; the ROM is asked for, checked and opened
    const saved = await page.evaluate(() => Forge.services.ProjectStore.serialize());
    await ctx.close(); ctx = await launch(); await attach();
    await page.goto('file://' + editor); await page.waitForFunction('window.Forge?.services?.LibraryProvenance');
    await run('project.load', {json: saved});
    await tab('SCENE');
    await page.waitForFunction(name => (document.getElementById('lpvScene')?.textContent || '').includes(name), second.name);
    const reopened = await page.evaluate(() => Forge.services.ProjectStore.capture().metasprites.filter(m => m.library).map(m => ({mode: m.library.mode, entryId: m.library.entryId, derivedFrom: m.library.derivedFrom?.entryId || null, location: !!m.library.location})));
    await shot('workflow_11_reopened_scene');
    check('After closing and reopening: both sprites keep their library provenance and location', reopened.length === 2 && reopened[0].mode === 'reference' && reopened[1].mode === 'copy' && reopened[1].derivedFrom === reopened[1].entryId && reopened.every(r => r.location), reopened);
    await tab('METASPRITES'); await page.evaluate(() => Forge163.metasprites.select('lib_2'));
    await page.waitForFunction(name => (document.getElementById('msLibrary163')?.textContent || '').includes(name), second.name);
    await clickIn('#msLibrary163', second.name, 'Inspect in CODE/RE');
    await page.waitForFunction(() => /Choose the source ROM file/.test(document.getElementById('lpvOrigin')?.textContent || ''));
    await shot('workflow_12_reopened_inspect_asks_for_rom');
    await page.setInputFiles('#lpvOrigin input[type=file]', cart);
    await page.waitForFunction(fo => Forge.services.REAnalysisUI.getState().selection?.fileOffset === fo, loc.fileOffset);
    const reAgain = await reState();
    await shot('workflow_13_reopened_inspect_in_re');
    check('After reopening, Inspect in CODE/RE asks for the source ROM, checks it and opens it at the same location', reAgain.tab === 'disasm' && reAgain.sel.fileOffset === loc.fileOffset && reAgain.sel.cpuAddress === loc.cpu && reAgain.hex.startsWith(expectHex), reAgain.sel);
    check('No uncaught page errors', errors.length === 0, errors.slice(0, 3));
  } catch (e) { check('run', false, String(e.stack || e.message).slice(0, 800)); if (page) await shot('workflow_error').catch(() => {}); }
  await ctx.close();
  report.passed = report.checks.length > 0 && report.checks.every(c => c.passed);
  for (const c of report.checks) console.log((c.passed ? 'PASS ' : 'FAIL ') + c.name + (c.passed || c.detail === undefined ? '' : ': ' + JSON.stringify(c.detail).slice(0, 600)));
  if (output) fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  process.exitCode = report.passed ? 0 : 1;
})();
