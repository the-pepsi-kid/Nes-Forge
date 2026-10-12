#!/usr/bin/env node
'use strict';
// Real Chromium supplement, deliberately separate from the VM regression gate.
// No external ROMs, network dependencies, physical devices, or engine-specific
// project recovery are required for the generic-analysis checks.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'source-manifest.json'), 'utf8'));
const htmlPath = path.resolve(process.argv[2] || path.join(root, manifest.output));
const output = path.resolve(process.argv[3] || path.join(root, 'test-results/browser-re-analysis'));
const html = fs.readFileSync(htmlPath);
const seedRom = [...fs.readFileSync(path.join(root, 'tests/fixtures/golden167/single-room-poc.nes'))];
fs.mkdirSync(output, {recursive: true});
const report = {
  format: 'NESForgeREAnalysisBrowserQA', version: 1, started: new Date().toISOString(),
  html: path.relative(root, htmlPath), sha256: crypto.createHash('sha256').update(html).digest('hex'),
  status: 'running', browser: null, checks: [], screenshots: [], pageErrors: [],
  limitations: [
    'Chromium viewport emulation is not a physical Android or iPhone test.',
    'These checks cover read-only analysis, not complete automatic editable recovery.',
    'Other browser engines, hardware controllers, audio quality and owner acceptance remain separate.'
  ]
};
let browser, server, baseURL;
function saveReport() {
  report.passed = report.checks.filter(c => c.status === 'passed').length;
  report.failed = report.checks.filter(c => c.status === 'failed').length;
  fs.writeFileSync(path.join(output, 'Report.json'), JSON.stringify(report, null, 2) + '\n');
}
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
async function fingerprint(page) {
  return page.evaluate(() => {
    const hash = values => { let h = 2166136261; for (const x of values || []) h = Math.imul(h ^ x, 16777619); return h >>> 0; };
    return {PC: emu.PC, cycles: emu.cycles, frameCount: emu.frameCount,
      ram: hash(emu.ram), vram: hash(emu.vram), pixels: hash(emu.frameBuffer),
      rom: hash(emu.lastBuiltRom), loaded: emu.loaded, running: emu.running,
      project: Forge.services.ProjectStore.serialize()};
  });
}
async function capture(page, name) {
  const file = name + '.png';
  await page.screenshot({path: path.join(output, file), fullPage: false});
  report.screenshots.push({file, viewport: page.viewportSize(), visualReview: 'pending'});
}
async function loadPage(mobile) {
  const context = await browser.newContext({viewport: mobile ? {width: 390, height: 844} : {width: 1440, height: 1000},
    hasTouch: !!mobile, isMobile: !!mobile});
  context.setDefaultTimeout(10000);
  const page = await context.newPage();
  page.on('pageerror', error => report.pageErrors.push(error.stack || String(error)));
  page.on('dialog', dialog => dialog.dismiss());
  await page.route('**/*', route => route.request().url().startsWith(baseURL) ? route.continue() : route.abort());
  await page.goto(baseURL + '/', {waitUntil: 'load'});
  await page.waitForFunction(() => window.Forge?.services?.REUI && window.Forge?.services?.REAnalysisUI);
  await page.evaluate(bytes => {
    if (!emuLoadRomData(new Uint8Array(bytes), 'Existing paused ROM', 0)) throw Error('Seed ROM load failed');
    switchTab('disasm');
  }, seedRom);
  return page;
}
function unknownMapperRom() {
  const bytes = Buffer.alloc(16 + 0x4000 + 0x2000);
  bytes.set([0x4e, 0x45, 0x53, 0x1a, 1, 1, 0x80, 0xc0]); // mapper 200, valid iNES layout
  bytes.set([0xa9, 0x42, 0x85, 0x10, 0x4c, 0x00, 0x80], 16);
  bytes.write('FORGE BROWSER QA', 48, 'ascii');
  bytes.set([0x00, 0x80, 0x00, 0x80, 0x00, 0x80], 16 + 0x3ffa);
  return bytes;
}
async function runChecks() {
  const desktop = await loadPage(false), original = await fingerprint(desktop);
  const unknown = unknownMapperRom();
  async function openFile(page, name, buffer) {
    const picker = page.locator('#reAnalysisFile');
    await picker.scrollIntoViewIfNeeded();
    assert.equal(await picker.isVisible(), true, 'General analysis must expose its native ROM picker');
    assert.equal(await picker.evaluate(el => getComputedStyle(el).display), 'block');
    // A hidden input can pass setInputFiles(). Require the real user path:
    // clicking the visible input must raise its native file chooser.
    const [chooser] = await Promise.all([page.waitForEvent('filechooser', {timeout: 10000}), picker.click()]);
    assert.equal(await chooser.element().getAttribute('id'), 'reAnalysisFile');
    await chooser.setFiles({name, mimeType: 'application/octet-stream', buffer});
    await page.locator('#reAnalysisOpen').click();
    await page.waitForFunction(expected => !Forge.services.REAnalysisUI.getState().busy &&
      Forge.services.REAnalysisUI.exportData()?.identity.name === expected, name, {timeout: 10000});
  }
  async function withinHorizontalViewport(page, selectors) {
    const width = page.viewportSize().width, bounds = [];
    for (const selector of selectors) {
      const item = page.locator(selector);
      await item.scrollIntoViewIfNeeded();
      const box = await item.boundingBox();
      assert.ok(box && box.width > 0, 'Visible control expected: ' + selector);
      assert.ok(box.x >= -1 && box.x + box.width <= width + 1,
        'Horizontal overflow: ' + selector + ' ' + JSON.stringify(box));
      bounds.push({selector, ...box});
    }
    return bounds;
  }
  await check('Unknown-engine mapper 200 ROM opens independently of loaded emulator', async () => {
    await openFile(desktop, 'Unknown-Engine-Mapper-200.nes', unknown);
    assert.match(await desktop.locator('#reAnalysisCapabilities').innerText(), /mapper 200/);
    assert.equal(await desktop.locator('#reAnalysisOrigin').inputValue(), '');
    assert.equal(await desktop.locator('#reAnalysisWorkspace').isVisible(), true);
    assert.deepEqual(await fingerprint(desktop), original);
  });
  await check('Physical CHR pages remain inspectable without running the mapper', async () => {
    await desktop.locator('#reAnalysisChrDetails summary').click();
    assert.equal(await desktop.locator('#reAnalysisChrCanvas').isVisible(), true);
    assert.deepEqual(await desktop.locator('#reAnalysisChrCanvas').evaluate(el => [el.width, el.height]), [128, 128]);
    await desktop.locator('#reAnalysisChrNext').click();
    assert.equal(await desktop.evaluate(() => Forge.services.REAnalysisUI.getState().chrFirst), 256);
    assert.equal(await desktop.locator('#reAnalysisChrNext').isDisabled(), true);
    await desktop.locator('#reAnalysisChrPrevious').click();
    assert.equal(await desktop.evaluate(() => Forge.services.REAnalysisUI.getState().chrFirst), 0);
    await desktop.locator('#reAnalysisChrDetails summary').click();
    assert.deepEqual(await fingerprint(desktop), original);
  });
  await check('Physical bytes and user-mapped offline 6502 disassembly are usable', async () => {
    await desktop.locator('#reAnalysisOffset').fill('0x10');
    await desktop.locator('#reAnalysisLength').fill('32');
    await desktop.locator('#reAnalysisOrigin').fill('0x8000');
    await desktop.locator('#reAnalysisBank').fill('User bank 0');
    await desktop.locator('#reAnalysisView').click();
    assert.match(await desktop.locator('#reAnalysisHex').innerText(), /000010\s+A9 42 85 10 4C 00 80/);
    const code = await desktop.locator('#reAnalysisCode').innerText();
    assert.match(code, /8000\s+A9 42\s+LDA\s+#\$42/);
    assert.match(code, /8002\s+85 10\s+STA\s+\$10/);
    await desktop.locator('#reAnalysisSaveMapping').click();
    assert.equal(await desktop.evaluate(() => Forge.services.REAnalysisUI.getState().mappings), 1);
    assert.match(await desktop.locator('#reAnalysisStatus').innerText(), /user interpretation/);
    assert.deepEqual(await fingerprint(desktop), original);
  });
  await check('Original-byte search locates and navigates the actual file offset', async () => {
    await desktop.locator('#reAnalysisPattern').fill('A9 42 85 10');
    await desktop.locator('#reAnalysisSearchStart').fill('0');
    await desktop.locator('#reAnalysisSearch').click();
    await desktop.waitForFunction(() => /search complete/.test(document.getElementById('reAnalysisSearchStatus').textContent));
    assert.equal(await desktop.locator('#reAnalysisResults option').count(), 1);
    assert.match(await desktop.locator('#reAnalysisResults').innerText(), /000010/);
    await desktop.locator('#reAnalysisGoResult').click();
    assert.equal(await desktop.locator('#reAnalysisOffset').inputValue(), '0x000010');
    assert.deepEqual(await fingerprint(desktop), original);
  });
  await check('Labels remain explicit user evidence and input does not affect gameplay', async () => {
    await desktop.locator('#reAnalysisAnnotationDetails summary').click();
    await desktop.locator('#reAnalysisNoteOffset').fill('16');
    await desktop.locator('#reAnalysisNoteLength').fill('2');
    await desktop.locator('#reAnalysisNoteLabel').fill('Candidate entry');
    await desktop.locator('#reAnalysisNoteComment').fill('Hypothesis to verify; not recovered engine behavior.');
    await desktop.locator('#reAnalysisSaveNote').click();
    const exported = await desktop.evaluate(() => Forge.services.REAnalysisUI.exportData());
    assert.equal(exported.annotations.length, 1);
    assert.equal(exported.annotations[0].evidence, 'user');
    assert.equal(exported.annotations[0].label, 'Candidate entry');
    assert.equal(exported.mappings.length, 1);
    assert.notEqual(exported.format, 'NESForgeProject');
    await desktop.locator('#reAnalysisNoteLabel').focus();
    await desktop.keyboard.down('KeyZ');
    assert.equal(await desktop.evaluate(() => emuReadJoyState()), 0);
    await desktop.keyboard.up('KeyZ');
    assert.deepEqual(await fingerprint(desktop), original);
    await desktop.locator('#reAnalysisOffset').scrollIntoViewIfNeeded();
    await capture(desktop, 'desktop-generic-analysis');
    return {export: 'Report data inspected; native file-save picker not tested', screenshotVisualReview: 'pending'};
  });
  await check('Unsupported editable recovery leaves general inspection and current project intact', async () => {
    const before = await desktop.evaluate(() => Forge.services.REAnalysisUI.exportData());
    await desktop.locator('#reRecoveryFile').setInputFiles({name: 'Unknown-Engine-Mapper-200.nes', mimeType: 'application/octet-stream', buffer: unknown});
    await desktop.locator('#reRecoveryAnalyze').click();
    await desktop.waitForFunction(() => !Forge.services.REUI.getState().busy);
    assert.equal(await desktop.evaluate(() => Forge.services.REUI.getState().staged), false);
    assert.match(await desktop.locator('#reRecoveryStatus').innerText(), /unsupported|only|profile|mapper/i);
    assert.deepEqual(await desktop.evaluate(() => Forge.services.REAnalysisUI.exportData()), before);
    assert.deepEqual(await fingerprint(desktop), original);
  });
  await check('Raw binary opens without an engine or NES header; filename remains literal text', async () => {
    const name = '<img src=x onerror=alert(1)>.bin';
    await openFile(desktop, name, Buffer.from([0xa9, 0x07, 0x85, 0x10, 0xd0, 0xfa, 0x60]));
    assert.match(await desktop.locator('#reAnalysisCapabilities').innerText(), /raw binary; platform unknown/);
    assert.equal(await desktop.locator('#reAnalysisOrigin').inputValue(), '');
    assert.match(await desktop.locator('#reAnalysisIdentity').innerText(), /<img src=x onerror=alert\(1\)>\.bin/);
    assert.equal(await desktop.locator('#reAnalysisIdentity img').count(), 0);
    assert.match(await desktop.locator('#reAnalysisCode').innerText(), /LDA\s+#\$07/);
    assert.deepEqual(await fingerprint(desktop), original);
  });
  const phone = await loadPage(true), mobileOriginal = await fingerprint(phone);
  await check('390-pixel mobile viewport exposes general analysis and wraps its controls', async () => {
    await openFile(phone, 'Mobile-Unknown-Engine.nes', unknown);
    const bounds = await withinHorizontalViewport(phone, ['#reAnalysisFile', '#reAnalysisOpen', '#reAnalysisIdentity',
      '#reAnalysisWorkspace', '#reAnalysisOffset', '#reAnalysisLength', '#reAnalysisOrigin', '#reAnalysisBank',
      '#reAnalysisView', '#reAnalysisSaveMapping', '#reAnalysisPattern', '#reAnalysisSearch', '#reAnalysisExport']);
    await phone.locator('#reAnalysisOffset').scrollIntoViewIfNeeded();
    await capture(phone, 'mobile-generic-analysis');
    assert.deepEqual(await fingerprint(phone), mobileOriginal);
    return {bounds, screenshotVisualReview: 'pending'};
  });
  await check('Mobile byte search and raw binary opening preserve emulation and project', async () => {
    await phone.locator('#reAnalysisPattern').fill('A9 42 85 10');
    await phone.locator('#reAnalysisSearch').click();
    await phone.waitForFunction(() => /search complete/.test(document.getElementById('reAnalysisSearchStatus').textContent));
    assert.equal(await phone.locator('#reAnalysisResults option').count(), 1);
    await openFile(phone, 'Mobile-Raw-6502.bin', Buffer.from([0xa9, 0x07, 0x60]));
    assert.match(await phone.locator('#reAnalysisCode').innerText(), /LDA\s+#\$07/);
    assert.deepEqual(await fingerprint(phone), mobileOriginal);
  });
}
async function run() {
  try {
    const {chromium} = requirePlaywright();
    browser = await chromium.launch({headless: true,
      ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? {executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH} : {})});
  } catch (error) {
    report.status = 'blocked'; report.blockedReason = error.message;
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
run().catch(error => {
  report.status = 'failed'; report.fatalError = error.stack || String(error);
  report.finished = new Date().toISOString(); process.exitCode = 1; console.error(error);
}).finally(async () => {
  if (browser) await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
  saveReport();
});
