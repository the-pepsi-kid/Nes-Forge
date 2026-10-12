#!/usr/bin/env node
'use strict';
// Real-browser supplement. Missing Chromium is blocked, with zero checks.
// This runner does not turn VM tests or viewport emulation into hardware evidence.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'source-manifest.json')));
const htmlPath = path.resolve(process.argv[2] || path.join(root, manifest.output));
const html = fs.readFileSync(htmlPath);
const out = path.resolve(process.argv[3] || path.join(root, 'test-results/browser-movement-rules'));
fs.mkdirSync(out, {recursive: true});
const report = {
  format: 'NESForgeMovementRulesBrowserQA', version: 1,
  html: path.relative(root, htmlPath), sha256: crypto.createHash('sha256').update(html).digest('hex'),
  started: new Date().toISOString(), status: 'running', browser: null,
  checks: [], screenshots: [], pageErrors: [],
  limitations: [
    'Desktop and phone viewports are Chromium automation, not physical mobile, keyboard, touchscreen or controller acceptance.',
    'This runner does not establish audible playback, movement feel, performance, real NES behavior or level solvability.',
    'Recipe reopening uses the native file input with browser automation; operating-system Save As dialogs remain a separate check.',
    'Screenshots require separate visual review.'
  ]
};
let browser, server;
function save() {
  report.passed = report.checks.filter(c => c.status === 'passed').length;
  report.failed = report.checks.filter(c => c.status === 'failed').length;
  report.finished = new Date().toISOString();
  fs.writeFileSync(path.join(out, 'Report.json'), JSON.stringify(report, null, 2) + '\n');
}
async function check(name, fn) {
  const started = Date.now();
  try { await fn(); report.checks.push({name, status: 'passed', milliseconds: Date.now() - started}); }
  catch (error) { report.checks.push({name, status: 'failed', milliseconds: Date.now() - started, error: error.stack || String(error)}); }
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
    const hash = values => { let value = 2166136261; for (const byte of values || []) value = Math.imul(value ^ byte, 16777619); return value >>> 0; };
    return {
      project: Forge.services.ProjectStore.serialize(), undo: undoStack.length, redo: redoStack.length,
      emulator: JSON.stringify({loaded: emu.loaded, running: emu.running, frame: emu.frameCount,
        PC: emu.PC, cycles: emu.cycles, ram: hash(emu.ram), vram: hash(emu.vram),
        pixels: hash(emu.frameBuffer), rom: hash(emu.lastBuiltRom)}),
      native: JSON.stringify(Forge.services.RENativeAudioUI.getState())
    };
  });
}
async function waitPreview(page) {
  await page.waitForFunction(() => {
    const state = Forge.services.MovementRulesUI.getState();
    return state.hasOutput && !state.busy;
  });
}
async function runViewport(name, viewport, mobile, baseURL, project, rom) {
  const context = await browser.newContext({viewport, isMobile: mobile, hasTouch: mobile});
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => report.pageErrors.push({viewport: name, error: error.message}));
  await page.route('**/*', route => route.request().url().startsWith(baseURL + '/') ? route.continue() : route.abort());
  try {
    await page.goto(baseURL + '/', {waitUntil: 'load'});
    await page.waitForFunction(() => !!window.Forge?.services?.MovementRulesUI);
    await page.evaluate(({project, rom}) => {
      Forge.services.ProjectStore.load(project);
      switchTab('emu');
      if (!emuLoadRomData(new Uint8Array(rom), 'Movement browser preserved-ROM fixture', 30)) throw Error('Golden ROM fixture failed to load');
      emuPause();
      switchTab('scene');
    }, {project, rom});
    const before = await snapshot(page);
    let recipe;
    await check(name + ': discoverable panel, visible file input and 44px targets', async () => {
      await page.locator('#movementRulesPanel > summary').click();
      const ids = ['movementRulesCaptureCurrent', 'movementRulesRecipeFile', 'movementRulesSeed',
        'movementRulesPreset', 'movementRulesIntensity', 'movementRulesPreview', 'movementRulesShuffle',
        'movementRulesApply', 'movementRulesDownloadProject', 'movementRulesDownloadRecipe'];
      for (const id of ids) {
        const locator = page.locator('#' + id);
        assert.equal(await locator.isVisible(), true, id + ' is visible');
        assert.ok((await locator.boundingBox()).height >= 44, id + ' target is at least 44px tall');
      }
      for (const field of ['MoveSpeed', 'JumpSpeed', 'Gravity', 'MaxFallSpeed']) {
        const label = page.locator('label[for="movementRulesLock' + field + '"]');
        assert.equal(await label.isVisible(), true);
        assert.ok((await label.boundingBox()).height >= 44, field + ' checkbox label target is at least 44px tall');
      }
      assert.equal(await page.locator('#movementRulesApply').isDisabled(), true);
      assert.equal(await page.locator('#movementRulesStatus').getAttribute('role'), 'status');
      assert.deepEqual(await snapshot(page), before);
    });
    await check(name + ': keyboard events stay inside movement controls', async () => {
      await page.evaluate(() => {
        window.__movementBrowserKeys = [];
        window.__movementBrowserKeyListener = event => window.__movementBrowserKeys.push(event.type + ':' + event.key);
        document.addEventListener('keydown', window.__movementBrowserKeyListener);
        document.addEventListener('keyup', window.__movementBrowserKeyListener);
      });
      await page.locator('#movementRulesSeed').focus();
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('Control+z');
      assert.deepEqual(await page.evaluate(() => window.__movementBrowserKeys), []);
      assert.equal(await page.evaluate(() => S.tab), 'scene');
      assert.equal(await page.evaluate(() => emuReadJoyState()), 0);
      assert.deepEqual(await snapshot(page), before);
      await page.evaluate(() => {
        document.removeEventListener('keydown', window.__movementBrowserKeyListener);
        document.removeEventListener('keyup', window.__movementBrowserKeyListener);
      });
    });
    await check(name + ': actual capture and preview preserve editor and paused runtime', async () => {
      await page.locator('#movementRulesCaptureCurrent').click();
      await page.locator('#movementRulesSeed').fill('BROWSER-MOVEMENT-001');
      await page.locator('#movementRulesPreset').selectOption('high-jump');
      await page.locator('#movementRulesIntensity').selectOption('3');
      await page.locator('#movementRulesPreview').click();
      await waitPreview(page);
      recipe = await page.evaluate(() => Forge.services.MovementRulesUI.getState().recipe);
      assert.equal(recipe.seed, 'BROWSER-MOVEMENT-001');
      assert.equal(recipe.decisions.jumpSpeed, 12);
      assert.equal(await page.locator('#movementRulesValues tr').count(), 5);
      assert.equal(await page.locator('#movementRulesApply').isDisabled(), false);
      assert.deepEqual(await snapshot(page), before);
      await page.locator('#movementRulesValues').scrollIntoViewIfNeeded();
      const file = name + '-movement-preview.png';
      await page.screenshot({path: path.join(out, file)});
      report.screenshots.push({file, viewport, visualReview: 'pending'});
    });
    await check(name + ': locked values survive shuffle and a saved recipe reopens', async () => {
      assert.ok(recipe, 'Previous preview produced a recipe');
      await page.locator('#movementRulesLockJumpSpeed').check();
      await page.locator('#movementRulesShuffle').click();
      await waitPreview(page);
      const shuffled = await page.evaluate(() => Forge.services.MovementRulesUI.getState().recipe);
      assert.equal(shuffled.preset, 'seeded-mix');
      assert.notEqual(shuffled.seed, recipe.seed);
      assert.equal(shuffled.decisions.jumpSpeed, recipe.decisions.jumpSpeed);
      await page.locator('#movementRulesRecipeFile').setInputFiles({name: 'saved-movement.recipe.json',
        mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(recipe))});
      await page.waitForFunction(seed => {
        const state = Forge.services.MovementRulesUI.getState();
        return !state.busy && state.recipe?.seed === seed;
      }, recipe.seed);
      assert.deepEqual(await page.evaluate(() => Forge.services.MovementRulesUI.getState().recipe), recipe);
      assert.equal(await page.locator('#movementRulesLockJumpSpeed').isChecked(), false);
      assert.deepEqual(await snapshot(page), before);
    });
    await check(name + ': cancelled Apply changes nothing; confirmed Apply adds one Undo', async () => {
      page.once('dialog', dialog => dialog.dismiss());
      await page.locator('#movementRulesApply').click();
      await page.waitForFunction(() => !Forge.services.MovementRulesUI.getState().busy);
      assert.deepEqual(await snapshot(page), before);
      page.once('dialog', dialog => dialog.accept());
      await page.locator('#movementRulesApply').click();
      await page.waitForFunction(() => {
        const state = Forge.services.MovementRulesUI.getState();
        return !state.busy && !state.staged;
      });
      const after = await snapshot(page);
      const expected = JSON.parse(before.project), actual = JSON.parse(after.project);
      const key = recipe.backend === 'world' ? 'worldRuntime' : 'gameplay';
      for (const field of ['moveSpeed', 'jumpSpeed', 'gravity', 'maxFallSpeed']) expected[key][field] = recipe.decisions[field];
      assert.deepEqual(actual, expected, 'Only four movement fields may change');
      assert.notEqual(after.project, before.project);
      assert.equal(after.undo, before.undo + 1);
      assert.equal(after.emulator, before.emulator);
      assert.equal(after.native, before.native);
      await page.locator('#undoBtn').click();
      const undone = await snapshot(page);
      assert.equal(undone.project, before.project);
      assert.equal(undone.emulator, before.emulator);
      assert.equal(undone.native, before.native);
    });
    await check(name + ': unrelated project edit invalidates staged Apply', async () => {
      await page.locator('#movementRulesCaptureCurrent').click();
      await page.locator('#movementRulesPreset').selectOption('sprint');
      await page.locator('#movementRulesIntensity').selectOption('3');
      await page.locator('#movementRulesPreview').click();
      await waitPreview(page);
      await page.evaluate(() => { S.projectName += ' (edited after preview)'; });
      const edited = await snapshot(page);
      await page.locator('#movementRulesApply').click();
      await page.waitForFunction(() => !Forge.services.MovementRulesUI.getState().busy);
      assert.match(await page.locator('#movementRulesStatus').textContent(), /project changed/i);
      assert.deepEqual(await snapshot(page), edited);
      assert.equal(await page.locator('#movementRulesApply').isDisabled(), true);
    });
  } finally { await context.close(); }
}
(async () => {
  try {
    const {chromium} = requirePlaywright();
    browser = await chromium.launch({headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?
      {executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH} : {})});
  } catch (error) {
    report.status = 'blocked'; report.reason = error.message; save();
    console.log('BLOCKED: Chromium unavailable; zero Movement Rules browser checks.');
    return;
  }
  report.browser = {name: 'Chromium', version: browser.version(), headless: true};
  server = http.createServer((request, response) => {
    if (request.url !== '/') { response.writeHead(404); response.end(); return; }
    response.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'}); response.end(html);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const baseURL = 'http://127.0.0.1:' + server.address().port;
  const folder = path.join(root, 'examples/Movement_Rules_' + manifest.release);
  const project = JSON.parse(fs.readFileSync(path.join(folder, 'World_Base.nesforge.json')));
  const rom = [...fs.readFileSync(path.join(root, 'tests/fixtures/golden167/single-room-poc.nes'))];
  for (const [name, viewport, mobile] of [['desktop', {width: 1280, height: 900}, false], ['phone', {width: 390, height: 844}, true]])
    await runViewport(name, viewport, mobile, baseURL, project, rom);
  await check('No uncaught browser errors', () => assert.deepEqual(report.pageErrors, []));
  report.status = report.checks.some(check => check.status === 'failed') ? 'failed' : 'passed'; save();
  if (report.status === 'failed') process.exitCode = 1;
})().catch(error => {
  report.status = 'failed'; report.error = error.stack || String(error); save(); process.exitCode = 1;
}).finally(async () => {
  if (browser) await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
});
