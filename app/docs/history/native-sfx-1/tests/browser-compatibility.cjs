#!/usr/bin/env node
'use strict';
// Real-browser compatibility supplement. Missing Chromium is blocked with zero
// checks; Node/VM coverage never substitutes for native browser handlers here.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'source-manifest.json')));
const htmlPath = path.resolve(process.argv[2] || path.join(root, manifest.output));
const html = fs.readFileSync(htmlPath);
const out = path.resolve(process.argv[3] || path.join(root, 'test-results/browser-compatibility'));
fs.mkdirSync(out, {recursive: true});
const report = {
  format: 'NESForgeCompatibilityBrowserQA', version: 1,
  html: path.relative(root, htmlPath), sha256: crypto.createHash('sha256').update(html).digest('hex'),
  started: new Date().toISOString(), status: 'running', browser: null,
  checks: [], screenshots: [], pageErrors: [],
  limitations: [
    'Desktop and phone viewports are Chromium automation, not physical keyboard, touchscreen, mobile device or controller acceptance.',
    'Save checks exercise the real explicit browser-download fallback with the native Save As capability disabled for this test context. Operating-system Save As dialogs remain separate acceptance.',
    'Project and recipe reopening use actual browser file inputs and their application handlers.',
    'The detached compiler probe delegates to the real compiler without substituting its result. No generated ROM is played by the test.',
    'Screenshots require separate visual review; these checks do not establish audible playback, movement feel, game solvability or NES hardware compatibility.'
  ]
};
let browser, server;
function save() {
  report.passed = report.checks.filter(item => item.status === 'passed').length;
  report.failed = report.checks.filter(item => item.status === 'failed').length;
  report.finished = new Date().toISOString();
  fs.writeFileSync(path.join(out, 'Report.json'), JSON.stringify(report, null, 2) + '\n');
}
async function check(name, fn) {
  const start = Date.now();
  try { await fn(); report.checks.push({name, status: 'passed', milliseconds: Date.now() - start}); }
  catch (error) { report.checks.push({name, status: 'failed', milliseconds: Date.now() - start, error: error.stack || String(error)}); }
}
function requirePlaywright() {
  try { return require('playwright'); }
  catch (error) {
    if (process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES)
      return require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, 'playwright'));
    throw error;
  }
}
async function snapshot(page) {
  return page.evaluate(() => {
    const hash = values => {
      let value = 2166136261;
      for (const byte of values || []) value = Math.imul(value ^ byte, 16777619);
      return value >>> 0;
    };
    return {
      project: Forge.services.ProjectStore.serialize(), undo: undoStack.length, redo: redoStack.length,
      emulator: JSON.stringify({loaded: emu.loaded, running: emu.running, frame: emu.frameCount,
        PC: emu.PC, cycles: emu.cycles, ram: hash(emu.ram), vram: hash(emu.vram),
        pixels: hash(emu.frameBuffer), rom: hash(emu.lastBuiltRom)}),
      builds: JSON.stringify({lastRom: hash(window._lastBuiltRom),
        runtime: hash(Forge.services.RuntimeCompiler.lastArtifact?.rom),
        room: hash(Forge165.lastBuild?.rom), world: hash(Forge.services.WorldCompiler.lastBuild?.rom)}),
      native: JSON.stringify(Forge.services.RENativeAudioUI.getState())
    };
  });
}
function unchangedRuntime(actual, expected) {
  assert.equal(actual.emulator, expected.emulator, 'Paused emulator state and memory remain unchanged');
  assert.equal(actual.builds, expected.builds, 'Detached authoring does not commit build artifacts');
  assert.equal(actual.native, expected.native, 'Native analysis session remains unchanged');
}
async function openProject(page, file) {
  const epoch = await page.evaluate(() => Forge.services.ProjectStore.state.epoch);
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', {name: 'Open Project', exact: true}).click();
  const chooser = await chooserPromise;
  await chooser.setFiles(file);
  await page.waitForFunction(value => Forge.services.ProjectStore.state.epoch > value, epoch);
}
async function saveDownload(page, selector, fileName) {
  await page.locator(selector).click();
  await page.locator('#forgeSaveDialog').waitFor({state: 'visible'});
  await page.locator('#forgeSaveName').fill(fileName);
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#forgeSaveBrowser').click();
  const download = await downloadPromise;
  assert.equal(download.suggestedFilename(), fileName);
  assert.equal(await download.failure(), null);
  const destination = path.join(out, fileName);
  await download.saveAs(destination);
  await page.locator('#forgeSaveDialog').waitFor({state: 'hidden'});
  const result = await page.evaluate(() => forgeSave.lastResult);
  assert.equal(result.status, 'download-requested');
  assert.equal(result.method, 'browser-download');
  return destination;
}
async function newPage(name, viewport, mobile, baseURL) {
  const context = await browser.newContext({viewport, isMobile: mobile, hasTouch: mobile, acceptDownloads: true});
  // Select the supported browser-download branch, without mocking the save
  // service, download bytes, file input, model or compiler implementation.
  await context.addInitScript(() => {
    Object.defineProperty(window, 'showSaveFilePicker', {value: undefined, configurable: true});
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => report.pageErrors.push({viewport: name, error: error.message}));
  await page.route('**/*', route => {
    const url = route.request().url();
    return url.startsWith(baseURL + '/') || url.startsWith('blob:') ? route.continue() : route.abort();
  });
  await page.goto(baseURL + '/', {waitUntil: 'load'});
  await page.waitForFunction(() => !!window.Forge?.services?.RecipeIdentity && !!Forge.services.MovementRulesUI);
  return {context, page};
}
async function pauseFixture(page, rom) {
  await page.evaluate(rom => {
    switchTab('emu');
    if (!emuLoadRomData(new Uint8Array(rom), 'Compatibility preserved-ROM fixture', 30))
      throw Error('Golden paused-ROM fixture failed to load');
    emuPause();
    switchTab('scene');
  }, rom);
}
async function runViewport(name, viewport, mobile, baseURL, fixtures) {
  const {context, page} = await newPage(name, viewport, mobile, baseURL);
  let before, migratedRecipe, savedRecipe, savedProject, appliedProject;
  try {
    await check(name + ': historical base and donors open through actual file controls', async () => {
      await openProject(page, fixtures.base);
      await pauseFixture(page, fixtures.rom);
      before = await snapshot(page);
      assert.equal(JSON.parse(before.project).foundation, manifest.release);
      await page.locator('#mashupPanel > summary').click();
      assert.equal(await page.locator('#mashupRecipeFile').isVisible(), true);
      await page.locator('#mashupCaptureCurrent').click();
      await page.locator('#mashupDonorFiles').setInputFiles(fixtures.donors);
      await page.waitForFunction(() => {
        const state = Forge.services.MashupUI.getState();
        return !state.busy && state.donorCount === 2;
      });
      assert.deepEqual(await snapshot(page), before);
    });
    await check(name + ': alpha.10 native recipe input displays explicit verified migration', async () => {
      assert.ok(before, 'Historical source setup completed');
      await page.locator('#mashupRecipeFile').setInputFiles(fixtures.recipe);
      await page.waitForFunction(() => {
        const state = Forge.services.MashupUI.getState();
        return !state.busy && state.hasOutput && state.recipe?.seed === 'FORGE-001';
      });
      const state = await page.evaluate(() => Forge.services.MashupUI.getState());
      assert.equal(state.staged, true);
      assert.equal(state.migration?.method, 'exact-v1-foundation-reissue-1');
      assert.ok(state.migration.sources.length >= 1, 'At least the loaded base identity was migrated');
      assert.equal(state.migration.originalResultSha256, fixtures.originalRecipe.resultSha256);
      assert.match(await page.locator('#mashupStatus').textContent(), /verified and migrated/i);
      assert.match(await page.locator('#mashupSummary').textContent(), /original source and the original result passed exact SHA-256 verification/);
      assert.equal(await page.locator('#mashupApply').isDisabled(), false);
      migratedRecipe = state.recipe;
      assert.notEqual(migratedRecipe.baseSourceId, fixtures.originalRecipe.baseSourceId);
      assert.deepEqual(await snapshot(page), before);
      await page.locator('#mashupStatus').scrollIntoViewIfNeeded();
      const file = name + '-recipe-migration.png';
      await page.screenshot({path: path.join(out, file)});
      report.screenshots.push({file, viewport, visualReview: 'pending'});
    });
    await check(name + ': reissued recipe downloads and reopens with exact current identity', async () => {
      assert.ok(migratedRecipe, 'Migration preview completed');
      savedRecipe = await saveDownload(page, '#mashupDownloadRecipe', name + '-current.recipe.json');
      assert.deepEqual(JSON.parse(fs.readFileSync(savedRecipe)), migratedRecipe);
      await page.locator('#mashupRecipeFile').setInputFiles(savedRecipe);
      await page.waitForFunction(() => {
        const state = Forge.services.MashupUI.getState();
        return !state.busy && state.hasOutput && !state.migration;
      });
      const state = await page.evaluate(() => Forge.services.MashupUI.getState());
      assert.deepEqual(state.recipe, migratedRecipe);
      assert.match(await page.locator('#mashupStatus').textContent(), /every exact source identity/);
      assert.deepEqual(await snapshot(page), before);
    });
    await check(name + ': cancelled Apply is inert; accepted Apply adds one Undo and saves exact project', async () => {
      assert.ok(migratedRecipe, 'Migration preview completed');
      page.once('dialog', dialog => dialog.dismiss());
      await page.locator('#mashupApply').click();
      await page.waitForFunction(() => !Forge.services.MashupUI.getState().busy);
      assert.deepEqual(await snapshot(page), before);
      page.once('dialog', dialog => dialog.accept());
      await page.locator('#mashupApply').click();
      await page.waitForFunction(() => {
        const state = Forge.services.MashupUI.getState();
        return !state.busy && !state.staged;
      });
      const after = await snapshot(page);
      assert.notEqual(after.project, before.project);
      assert.equal(after.undo, before.undo + 1);
      assert.equal(after.redo, 0);
      unchangedRuntime(after, before);
      appliedProject = JSON.parse(after.project);
      const expected = JSON.parse(JSON.stringify(fixtures.historicalResult));
      expected.foundation = manifest.release;
      assert.deepEqual(appliedProject, expected, 'Migration changes only foundation in the historical expected result');
      savedProject = await saveDownload(page, '.project-bar button[onclick="project_export()"]', name + '-compatibility.nesforge.json');
      assert.deepEqual(JSON.parse(fs.readFileSync(savedProject)), appliedProject);
      assert.deepEqual(await snapshot(page), after, 'Portable save does not alter project, history or runtime');
      await page.locator('#undoBtn').click();
      const undone = await snapshot(page);
      assert.equal(undone.project, before.project);
      assert.equal(undone.undo, before.undo);
      assert.equal(undone.redo, before.redo + 1);
      unchangedRuntime(undone, before);
    });
    await check(name + ': downloaded applied project reopens through Open Project in a clean browser context', async () => {
      assert.ok(savedProject && appliedProject, 'Applied project was downloaded');
      const reopened = await newPage(name + '-reopen', viewport, mobile, baseURL);
      try {
        await openProject(reopened.page, savedProject);
        const current = await snapshot(reopened.page);
        assert.deepEqual(JSON.parse(current.project), appliedProject);
        assert.equal(await reopened.page.evaluate(() => emu.loaded || emu.running), false,
          'Opening an editable project does not play its ROM');
      } finally { await reopened.context.close(); }
      unchangedRuntime(await snapshot(page), before);
    });
  } finally { await context.close(); }
  const room = await newPage(name + '-room', viewport, mobile, baseURL);
  try {
    await check(name + ': single-room UI preview runs the complete detached compiler without commit or playback', async () => {
      await openProject(room.page, fixtures.room);
      await pauseFixture(room.page, fixtures.rom);
      const beforeRoom = await snapshot(room.page);
      await room.page.evaluate(() => {
        const compiler = Forge.services.RuntimeCompiler, original = compiler.compileDetached;
        window.__compatibilityCompilerCalls = [];
        compiler.compileDetached = function(...args) {
          const artifact = original.apply(this, args);
          window.__compatibilityCompilerCalls.push({backend: artifact.backend, phases: [...artifact.phases],
            sha256: FamiTone2Native.sha256(artifact.rom), bytes: artifact.rom.length,
            record: JSON.parse(JSON.stringify(artifact.gameplay?.record || null))});
          return artifact;
        };
        window.__compatibilityRestoreCompiler = () => { compiler.compileDetached = original; };
      });
      try {
        await room.page.locator('#movementRulesPanel > summary').click();
        await room.page.locator('#movementRulesCaptureCurrent').click();
        await room.page.locator('#movementRulesSeed').fill('BROWSER-COMPATIBILITY-ROOM');
        await room.page.locator('#movementRulesPreset').selectOption('high-jump');
        await room.page.locator('#movementRulesIntensity').selectOption('3');
        await room.page.locator('#movementRulesPreview').click();
        await room.page.waitForFunction(() => {
          const state = Forge.services.MovementRulesUI.getState();
          return !state.busy && state.hasOutput;
        });
        const state = await room.page.evaluate(() => Forge.services.MovementRulesUI.getState());
        assert.equal(state.backend, 'single-room');
        assert.equal(state.recipe.decisions.jumpSpeed, 12);
        assert.equal(state.staged, true);
        const calls = await room.page.evaluate(() => window.__compatibilityCompilerCalls);
        assert.equal(calls.length, 1, 'The UI preview invokes the real complete compiler once');
        assert.equal(calls[0].backend, 'single-room');
        assert.equal(calls[0].bytes, 40976);
        assert.match(calls[0].sha256, /^[a-f0-9]{64}$/);
        assert.equal(calls[0].record.jumpSpeed, 12);
        for (const phase of ['allocation', 'chr-serialize', 'gameplay-compile', 'artifact'])
          assert.ok(calls[0].phases.includes(phase), 'Complete compiler includes ' + phase);
        const summary = await room.page.locator('#movementRulesSummary').textContent();
        assert.match(summary, /compiled-single-room/);
        assert.ok(summary.includes(calls[0].sha256), 'Displayed evidence identifies the compiled ROM');
        assert.equal(await room.page.locator('#movementRulesApply').isDisabled(), false);
        assert.deepEqual(await snapshot(room.page), beforeRoom);
        await room.page.locator('#movementRulesSummary').scrollIntoViewIfNeeded();
        const file = name + '-single-room-compiled-preview.png';
        await room.page.screenshot({path: path.join(out, file)});
        report.screenshots.push({file, viewport, visualReview: 'pending'});
      } finally { await room.page.evaluate(() => window.__compatibilityRestoreCompiler()); }
    });
  } finally { await room.context.close(); }
}
(async () => {
  try {
    const {chromium} = requirePlaywright();
    browser = await chromium.launch({headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?
      {executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH} : {})});
  } catch (error) {
    report.status = 'blocked'; report.reason = error.message; save();
    console.log('BLOCKED: Chromium unavailable; zero Compatibility browser checks.');
    return;
  }
  report.browser = {name: 'Chromium', version: browser.version(), headless: true};
  server = http.createServer((request, response) => {
    if (request.url !== '/') { response.writeHead(404); response.end(); return; }
    response.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'}); response.end(html);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const baseURL = 'http://127.0.0.1:' + server.address().port;
  const historical = path.join(root, 'examples/Seeded_Mashup_2.0.0-alpha.10');
  const fixtures = {
    base: path.join(historical, 'Scout_Base.nesforge.json'),
    donors: ['Copper_Orchard_Donor.nesforge.json', 'Moonlit_Circuit_Donor.nesforge.json'].map(file => path.join(historical, file)),
    recipe: path.join(historical, 'Mashup_FORGE-001.recipe.json'),
    historicalResult: JSON.parse(fs.readFileSync(path.join(historical, 'Mashup_FORGE-001.nesforge.json'))),
    originalRecipe: JSON.parse(fs.readFileSync(path.join(historical, 'Mashup_FORGE-001.recipe.json'))),
    room: path.join(root, 'examples/Movement_Rules_2.0.0-alpha.11/Single_Room_Base.nesforge.json'),
    rom: [...fs.readFileSync(path.join(root, 'tests/fixtures/golden167/single-room-poc.nes'))]
  };
  for (const [name, viewport, mobile] of [['desktop', {width: 1280, height: 900}, false], ['phone', {width: 390, height: 844}, true]])
    await runViewport(name, viewport, mobile, baseURL, fixtures);
  await check('No uncaught browser errors', () => assert.deepEqual(report.pageErrors, []));
  report.status = report.checks.some(item => item.status === 'failed') ? 'failed' : 'passed';
  save();
  if (report.status === 'failed') process.exitCode = 1;
})().catch(error => {
  report.status = 'failed'; report.error = error.stack || String(error); save(); process.exitCode = 1;
}).finally(async () => {
  if (browser) await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
});
