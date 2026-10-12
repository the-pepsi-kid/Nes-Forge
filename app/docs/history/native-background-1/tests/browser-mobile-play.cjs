#!/usr/bin/env node
'use strict';
// Real-browser supplement. Never counts missing Chromium as a passing test.
// Uses only a loopback HTTP server, this release's standalone HTML, and its
// original golden ROM fixture. Gamepads are simulated; no physical-device,
// Safari, native audio, real USB/Bluetooth, or owner acceptance is claimed.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'source-manifest.json'), 'utf8'));
const htmlPath = path.resolve(process.argv[2] || path.join(root, manifest.output));
const output = path.resolve(process.argv[3] || path.join(root, 'test-results/browser-mobile'));
const html = fs.readFileSync(htmlPath);
const rom = [...fs.readFileSync(path.join(root, 'tests/fixtures/golden167/single-room-poc.nes'))];
fs.mkdirSync(output, {recursive: true});
const report = {
  format: 'NESForgeMobilePlayBrowserQA', version: 1, started: new Date().toISOString(),
  html: path.relative(root, htmlPath), sha256: crypto.createHash('sha256').update(html).digest('hex'),
  status: 'running', browser: null, checks: [], screenshots: [], pageErrors: [],
  limitations: [
    'Chromium viewport emulation is not an actual Android or iPhone test.',
    'Gamepad objects are simulated. USB-C, Bluetooth and controller compatibility require actual devices.',
    'CDP touch events test Chromium input dispatch, not physical touchscreen hardware.',
    'Native audio quality, Safari fullscreen behavior and owner acceptance remain separate checks.'
  ]
};
const saveReport = () => {
  report.passed = report.checks.filter(c => c.status === 'passed').length;
  report.failed = report.checks.filter(c => c.status === 'failed').length;
  fs.writeFileSync(path.join(output, 'Report.json'), JSON.stringify(report, null, 2) + '\n');
};
let browser, server;
const pages = [];
function requirePlaywright() {
  try { return require('playwright'); }
  catch (first) {
    if (process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES)
      return require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, 'playwright'));
    throw first;
  }
}
async function check(name, fn) {
  const started = Date.now();
  try {
    const detail = await fn();
    report.checks.push({name, status: 'passed', milliseconds: Date.now() - started, ...(detail ? {detail} : {})});
    console.log('PASS ' + name);
  } catch (error) {
    report.checks.push({name, status: 'failed', milliseconds: Date.now() - started, error: error.stack || String(error)});
    console.error('FAIL ' + name + ': ' + error.message);
  }
}
async function capture(page, name) {
  const file = name + '.png';
  await page.screenshot({path: path.join(output, file), fullPage: false});
  report.screenshots.push({file, viewport: page.viewportSize(), visualReview: 'pending'});
}
async function waitFrames(page, count = 3) {
  await page.evaluate(n => new Promise(resolve => {
    const next = () => --n <= 0 ? resolve() : requestAnimationFrame(next);
    requestAnimationFrame(next);
  }), count);
}
async function joy(page, expected) {
  await page.waitForFunction(value => emuReadJoyState() === value, expected, {timeout: 4000});
}
async function fingerprint(page) {
  return page.evaluate(() => {
    const hash = values => { let h = 2166136261; for (const x of values || []) h = Math.imul(h ^ x, 16777619); return h >>> 0; };
    return {PC: emu.PC, cycles: emu.cycles, frameCount: emu.frameCount, ram: hash(emu.ram),
      vram: hash(emu.vram), pixels: hash(emu.frameBuffer), rom: hash(emu.lastBuiltRom),
      width: document.getElementById('emuCanvas').width, height: document.getElementById('emuCanvas').height,
      project: JSON.stringify(Forge.services.ProjectStore.serialize())};
  });
}
async function visibleWithin(page, selector) {
  const boxes = await page.locator(selector).evaluateAll(elements => elements.filter(el => {
    const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
  }).map(el => { const r = el.getBoundingClientRect(); return {id: el.id, text: el.textContent, x: r.x, y: r.y, w: r.width, h: r.height}; }));
  assert.ok(boxes.length, 'Expected visible controls for ' + selector);
  const viewport = page.viewportSize();
  for (const r of boxes) {
    assert.ok(r.x >= -1 && r.y >= -1 && r.x + r.w <= viewport.width + 1 && r.y + r.h <= viewport.height + 1,
      'Control outside viewport: ' + JSON.stringify(r));
  }
  return boxes;
}
async function center(page, selector) {
  const box = await page.locator(selector).boundingBox();
  assert.ok(box, 'Control missing: ' + selector);
  return {x: box.x + box.width / 2, y: box.y + box.height / 2};
}
async function loadPage(options = {}) {
  const context = await browser.newContext({viewport: {width: 390, height: 844}, hasTouch: true, isMobile: true, ...options});
  const page = await context.newPage();
  pages.push(page);
  page.on('pageerror', error => report.pageErrors.push(error.stack || String(error)));
  // The test intentionally never needs fonts, CDNs, analytics or other network dependencies.
  await page.route('**/*', route => route.request().url().startsWith(baseURL) ? route.continue() : route.abort());
  page.on('dialog', dialog => dialog.dismiss());
  await page.goto(baseURL + '/', {waitUntil: 'load'});
  await page.waitForFunction(() => window.Forge?.services?.EmulatorInput && window.Forge?.services?.EmulatorPlay);
  await page.evaluate(bytes => {
    switchTab('emu');
    if (!emuLoadRomData(new Uint8Array(bytes), 'Original NES Forge QA fixture', 30)) throw Error('Fixture failed to load');
    window.__qaOriginalCanvas = document.getElementById('emuCanvas');
  }, rom);
  return page;
}
let baseURL;
async function run() {
  try {
    const {chromium} = requirePlaywright();
    browser = await chromium.launch({headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?
      {executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH} : {})});
  } catch (error) {
    report.status = 'blocked'; report.blockedReason = report.noBrowser = error.message;
    report.finished = new Date().toISOString(); saveReport();
    console.error('BLOCKED: Chromium could not launch. No browser checks ran.\n' + error.message);
    process.exitCode = 2; return;
  }
  report.browser = {name: 'Chromium', version: browser.version(), headless: true};
  server = http.createServer((req, res) => {
    if (req.url === '/' || req.url === '/index.html') { res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'}); res.end(html); }
    else { res.writeHead(404); res.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  baseURL = 'http://127.0.0.1:' + server.address().port;
  await runChecks();
  await check('No uncaught page errors', async () => assert.deepEqual(report.pageErrors, []));
  report.status = report.checks.some(c => c.status === 'failed') ? 'failed' : 'passed';
  report.finished = new Date().toISOString();
  process.exitCode = report.status === 'passed' ? 0 : 1;
}

// Selectors and tests below follow the explicit adapter/view contracts.
async function runChecks() {
  const phone = await loadPage();
  const paused = await fingerprint(phone);
  await check('Portrait Play view retains canvas node, NES resolution, ROM, project and paused state', async () => {
    await phone.locator('#emuPlayExpand').click();
    await waitFrames(phone);
    assert.equal(await phone.evaluate(() => Forge.services.EmulatorPlay.isExpanded()), true);
    assert.equal(await phone.evaluate(() => __qaOriginalCanvas === document.getElementById('emuCanvas')), true);
    assert.deepEqual(await fingerprint(phone), paused);
    const bounds = await visibleWithin(phone, '#emuCanvas, #emuPlayPanel .emu-play-bar button, [data-emu-touch]');
    assert.deepEqual(await phone.locator('#emuCanvas').evaluate(el => [el.width, el.height]), [256, 240]);
    await capture(phone, 'portrait-play');
    return {bounds, screenshotVisualReview: 'pending'};
  });
  await check('Denied native fullscreen leaves expanded play usable without resetting the ROM', async () => {
    await phone.locator('#emuPlayPanel').evaluate(el => {
      el.requestFullscreen = async () => { throw new DOMException('QA denial', 'NotAllowedError'); };
    });
    await phone.locator('#emuPlayFullscreen').click();
    await phone.waitForFunction(() => /unavailable/.test(document.getElementById('emuPlayStatus').textContent));
    assert.equal(await phone.evaluate(() => Forge.services.EmulatorPlay.isExpanded()), true);
    await visibleWithin(phone, '#emuCanvas, #emuPlayExit, #emuPlayRun, #emuPlaySound');
    assert.deepEqual(await fingerprint(phone), paused);
    await phone.locator('#emuPlayPanel').evaluate(el => delete el.requestFullscreen);
    return {fullscreenRejection: 'Simulated DOMException; actual browser fallback layout checked'};
  });
  await check('Landscape rotation fits screen and every visible play control', async () => {
    await phone.setViewportSize({width: 844, height: 390});
    await waitFrames(phone);
    const bounds = await visibleWithin(phone, '#emuCanvas, #emuPlayPanel .emu-play-bar button, [data-emu-touch]');
    assert.deepEqual(await fingerprint(phone), paused);
    await capture(phone, 'landscape-play');
    return {bounds, screenshotVisualReview: 'pending'};
  });
  await check('Chromium multitouch holds Right+A+B together, slides direction and releases all', async () => {
    await phone.locator('#emuPlayRun').click();
    await phone.waitForFunction(() => emu.running);
    const cdp = await phone.context().newCDPSession(phone);
    const right = await center(phone, '#emuPlayRight'), up = await center(phone, '#emuPlayUp');
    const a = await center(phone, '#emuPlayA'), b = await center(phone, '#emuPlayB');
    const point = (id, p) => ({id, x: p.x, y: p.y, radiusX: 1, radiusY: 1, force: 1});
    try {
      await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [point(1, right), point(2, a), point(3, b)]});
      await joy(phone, 128 | 1 | 2);
      await cdp.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [point(1, up), point(2, a), point(3, b)]});
      await joy(phone, 16 | 1 | 2);
      await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
      await joy(phone, 0);
    } finally {
      await cdp.send('Input.dispatchTouchEvent', {type: 'touchCancel', touchPoints: []}).catch(() => {});
      await cdp.detach();
    }
    return {input: 'Chromium CDP touch dispatch; not physical phone hardware'};
  });
  await check('Touch cancellation clears input; touch release preserves a still-held keyboard button', async () => {
    const cdp = await phone.context().newCDPSession(phone), a = await center(phone, '#emuPlayA');
    try {
      await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{id: 5, ...a}]});
      await joy(phone, 1);
      await cdp.send('Input.dispatchTouchEvent', {type: 'touchCancel', touchPoints: []});
      await joy(phone, 0);
      await phone.keyboard.down('KeyZ');
      await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{id: 6, ...a}]});
      await joy(phone, 1);
      await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
      await joy(phone, 1);
      await phone.keyboard.up('KeyZ');
      await joy(phone, 0);
    } finally {
      await phone.keyboard.up('KeyZ');
      await cdp.send('Input.dispatchTouchEvent', {type: 'touchCancel', touchPoints: []}).catch(() => {});
      await cdp.detach();
    }
  });
  await check('Play Pause is accessible, clears input and requires deliberate resume', async () => {
    await phone.locator('#emuPlayRun').click();
    assert.equal(await phone.evaluate(() => emu.running), false);
    await joy(phone, 0);
    const frames = await phone.evaluate(() => emu.frameCount);
    await waitFrames(phone, 5);
    assert.equal(await phone.evaluate(() => emu.frameCount), frames);
  });
  await check('Exit returns existing canvas to editor without replacing project or resetting emulation', async () => {
    const before = await fingerprint(phone);
    await phone.locator('#emuPlayExit').click();
    assert.equal(await phone.evaluate(() => Forge.services.EmulatorPlay.isExpanded()), false);
    assert.equal(await phone.evaluate(() => __qaOriginalCanvas === document.getElementById('emuCanvas')), true);
    assert.equal(await phone.locator('#emuView #emuCanvas').count(), 1);
    assert.deepEqual(await fingerprint(phone), before);
  });

  const desktop = await loadPage({viewport: {width: 1440, height: 1000}, hasTouch: false, isMobile: false});
  await check('Desktop keyboard retains legacy NES bindings and clears on focus loss', async () => {
    await desktop.locator('#emuCanvas').focus();
    for (const [key, bit] of [['KeyZ', 1], ['KeyX', 2], ['ShiftLeft', 4], ['Enter', 8],
      ['ArrowUp', 16], ['ArrowDown', 32], ['ArrowLeft', 64], ['ArrowRight', 128]]) {
      await desktop.keyboard.down(key); await joy(desktop, bit);
      await desktop.keyboard.up(key); await joy(desktop, 0);
    }
    await desktop.keyboard.down('ArrowRight'); await joy(desktop, 128);
    // Deliberately synthetic event: actual OS app/background lifecycle remains a phone checklist item.
    await desktop.evaluate(() => window.dispatchEvent(new Event('blur')));
    await joy(desktop, 0); await desktop.keyboard.up('ArrowRight');
    await desktop.evaluate(() => window.dispatchEvent(new Event('focus')));
    await joy(desktop, 0);
    await desktop.locator('#emuPlayExpand').click();
    await capture(desktop, 'desktop-play');
    return {blur: 'Synthetic window event', screenshotVisualReview: 'pending'};
  });
  await check('Browser fullscreen request preserves state and exits cleanly, or exposes usable fallback', async () => {
    const before = await fingerprint(desktop);
    await desktop.locator('#emuPlayFullscreen').click();
    await desktop.waitForFunction(() => document.fullscreenElement === document.getElementById('emuPlayPanel') ||
      /unavailable/i.test(document.getElementById('emuPlayStatus').textContent));
    await waitFrames(desktop);
    const native = await desktop.evaluate(() => document.fullscreenElement === document.getElementById('emuPlayPanel'));
    assert.equal(await desktop.evaluate(() => Forge.services.EmulatorPlay.isExpanded()), true);
    assert.deepEqual(await fingerprint(desktop), before);
    await visibleWithin(desktop, '#emuCanvas, #emuPlayExit, #emuPlayRun');
    if (native) {
      await desktop.evaluate(() => document.exitFullscreen());
      await desktop.waitForFunction(() => !Forge.services.EmulatorPlay.isExpanded());
    } else {
      assert.match(await desktop.locator('#emuPlayStatus').textContent(), /unavailable/i);
      await desktop.locator('#emuPlayExit').click();
    }
    assert.deepEqual(await fingerprint(desktop), before);
    return {nativeFullscreenObserved: native, fallbackObserved: !native};
  });
  await check('Simulated standard gamepad uses neutral rearm, button mapping and disconnect release', async () => {
    await desktop.evaluate(() => {
      window.__qaPad = {id: 'QA simulated standard controller', index: 0, connected: true, mapping: 'standard',
        buttons: Array.from({length: 16}, () => ({pressed: false, value: 0})), axes: [0, 0, 0, 0]};
      window.__qaPads = [__qaPad];
      Object.defineProperty(navigator, 'getGamepads', {configurable: true, value: () => __qaPads});
      Forge.services.EmulatorInput.poll();
    });
    await desktop.locator('#emuPlayRun').click();
    await desktop.waitForFunction(() => emu.running && !Forge.services.EmulatorInput.status().waitingForNeutral);
    await desktop.evaluate(() => { __qaPad.buttons[0] = {pressed: true, value: 1}; __qaPad.axes[0] = 1; });
    await joy(desktop, 1 | 128);
    await desktop.evaluate(() => { __qaPad.buttons[0] = {pressed: false, value: 0}; __qaPad.axes[0] = .2; });
    await joy(desktop, 0);
    await desktop.evaluate(() => { __qaPad.buttons[1] = {pressed: true, value: 1}; });
    await joy(desktop, 2);
    await desktop.evaluate(() => { window.__qaPads = []; });
    await joy(desktop, 0);
    assert.equal(await desktop.evaluate(() => Forge.services.EmulatorInput.status().selectedIndex), null);
    return {gamepad: 'Simulated navigator.getGamepads objects; no USB-C/Bluetooth claim'};
  });
  await check('Controller settings remap a simulated input without feeding it into the game', async () => {
    await desktop.evaluate(() => { __qaPad.buttons = __qaPad.buttons.map(() => ({pressed: false, value: 0})); __qaPad.axes = [0, 0, 0, 0]; __qaPads = [__qaPad]; Forge.services.EmulatorInput.poll(); });
    await desktop.locator('#emuPlayController').click();
    await desktop.locator('#emuPlayGamepad').selectOption('0');
    await desktop.locator('#emuPlayBindA').click();
    await desktop.waitForFunction(() => /press a controller button/.test(document.getElementById('emuPlaySettingsStatus').textContent));
    await desktop.evaluate(() => { __qaPad.buttons[3] = {pressed: true, value: 1}; });
    await desktop.waitForFunction(() => Forge.services.EmulatorInput.status().bindings.A === 'button:3');
    await joy(desktop, 0);
    await desktop.locator('#emuPlaySettingsDone').click();
    await desktop.evaluate(() => { __qaPad.buttons[3] = {pressed: false, value: 0}; });
    if (!await desktop.evaluate(() => emu.running)) await desktop.locator('#emuPlayRun').click();
    await desktop.waitForFunction(() => !Forge.services.EmulatorInput.status().waitingForNeutral);
    await desktop.evaluate(() => { __qaPad.buttons[3] = {pressed: true, value: 1}; });
    await joy(desktop, 1);
    await desktop.evaluate(() => { __qaPad.buttons[3] = {pressed: false, value: 0}; });
    await joy(desktop, 0);
    await desktop.locator('#emuPlayRun').click();
  });
}

run().catch(error => {
  report.status = 'failed'; report.error = error.stack || String(error);
  report.finished = new Date().toISOString(); process.exitCode = 1; console.error(report.error);
}).finally(async () => {
  if (browser) await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
  saveReport();
});
