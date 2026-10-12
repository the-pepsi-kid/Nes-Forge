#!/usr/bin/env node
'use strict';
// Real Chromium supplement for the integrated ROM runtime-investigation UI.
// Loaded-ROM setup and bounded frame execution use existing emulator APIs;
// investigation actions use visible controls and export uses a real download.
// Missing Chromium is blocked with zero checks, never a passing browser run.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'source-manifest.json'), 'utf8'));
const htmlPath = path.resolve(process.argv[2] || path.join(root, manifest.output));
const output = path.resolve(process.argv[3] || path.join(root, 'test-results/browser-re-runtime'));
const html = fs.readFileSync(htmlPath);
const romName = 'pepsi_vending_v9e.nes';
const rom = fs.readFileSync(path.join(root, 'tests/fixtures/re-runtime', romName));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const romSHA256 = '8fb961353e9f626bcc62b85896550ec0108addff1fb82eaf7df7aafbf9b6462a';
assert.equal(sha(rom), romSHA256, 'Browser fixture must match the owner-supplied ROM');
fs.mkdirSync(output, {recursive: true});
const report = {
  format: 'NESForgeRERuntimeBrowserQA', version: 1, started: new Date().toISOString(),
  html: path.relative(root, htmlPath), sha256: sha(html), rom: {name: romName, sha256: romSHA256},
  status: 'running', browser: null, checks: [], screenshots: [], pageErrors: [],
  limitations: [
    'Chromium viewport emulation is not a physical Android or iPhone test.',
    'The owner-supplied Pepsi fixture exercises runtime observation and RAM comparison, not universal semantic recovery.',
    'Observed PPU and APU data do not establish complete scenes, collision systems or editable music.',
    'Download fallback is exercised; the native operating-system save picker, audio listening and owner acceptance remain separate.'
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
async function capture(page, name) {
  const file = name + '.png';
  await page.screenshot({path: path.join(output, file), fullPage: false});
  report.screenshots.push({file, viewport: page.viewportSize(), visualReview: 'pending'});
}
async function clickVisible(page, selector) {
  const control = page.locator(selector);
  await control.scrollIntoViewIfNeeded();
  assert.equal(await control.isVisible(), true, 'Visible user control required: ' + selector);
  assert.equal(await control.isEnabled(), true, 'Enabled user control required: ' + selector);
  await control.click();
}
async function withinHorizontalViewport(page, selectors) {
  const width = page.viewportSize().width, bounds = [];
  for (const selector of selectors) {
    const item = page.locator(selector);
    await item.scrollIntoViewIfNeeded();
    assert.equal(await item.isVisible(), true, 'Visible control expected: ' + selector);
    const box = await item.boundingBox();
    assert.ok(box && box.width > 0, 'Nonempty control expected: ' + selector);
    assert.ok(box.x >= -1 && box.x + box.width <= width + 1,
      'Horizontal overflow: ' + selector + ' ' + JSON.stringify(box));
    bounds.push({selector, ...box});
  }
  return bounds;
}
async function fingerprint(page) {
  return page.evaluate(() => {
    const hash = values => { let h = 2166136261; for (const x of values || []) h = Math.imul(h ^ x, 16777619); return h >>> 0; };
    return {PC: emu.PC, cycles: emu.cycles, frame: emu.frameCount,
      ram: hash(emu.ram), sram: hash(emu.sram), vram: hash(emu.vram), palette: hash(emu.palRam),
      rom: hash(emu.lastBuiltRom), loaded: emu.loaded, running: emu.running,
      project: Forge.services.ProjectStore.serialize()};
  });
}
async function loadPage(mobile) {
  const context = await browser.newContext({viewport: mobile ? {width: 390, height: 844} : {width: 1440, height: 1000},
    hasTouch: !!mobile, isMobile: !!mobile, acceptDownloads: true});
  context.setDefaultTimeout(15000);
  const page = await context.newPage();
  page.on('pageerror', error => report.pageErrors.push(error.stack || String(error)));
  page.on('dialog', dialog => dialog.dismiss());
  await page.route('**/*', route => route.request().url().startsWith(baseURL) ? route.continue() : route.abort());
  await page.goto(baseURL + '/', {waitUntil: 'load'});
  await page.waitForFunction(() => window.Forge?.services?.RERuntimeUI && window.Forge?.services?.RERuntime);
  await page.evaluate(({bytes, name}) => {
    if (!emuLoadRomData(new Uint8Array(bytes), name, 0)) throw Error('Owner ROM setup failed');
  }, {bytes: [...rom], name: romName});
  await clickVisible(page, '.tab[data-view="disasm"]');
  return page;
}
async function pulseKey(page, key) {
  await clickVisible(page, '.tab[data-view="emu"]');
  await clickVisible(page, '#emuCanvas');
  await page.keyboard.down(key);
  await page.evaluate(() => { for (let i = 0; i < 2; i++) emuRunFrame(); });
  await page.keyboard.up(key);
  await page.evaluate(() => { for (let i = 0; i < 2; i++) emuRunFrame(); });
  await clickVisible(page, '.tab[data-view="disasm"]');
}
async function downloadJSON(page, selector, savedName) {
  await clickVisible(page, selector);
  await page.waitForFunction(() => document.getElementById('forgeSaveDialog')?.open === true);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    clickVisible(page, '#forgeSaveBrowser')
  ]);
  assert.equal(await download.failure(), null, 'The browser download must complete');
  const local = path.join(output, savedName);
  await download.saveAs(local);
  const bytes = fs.readFileSync(local);
  return {data: JSON.parse(bytes.toString('utf8')), evidence: {file: savedName, suggestedFilename: download.suggestedFilename(),
    byteLength: bytes.length, sha256: sha(bytes)}};
}
async function runChecks() {
  const desktop = await loadPage(false), initial = await fingerprint(desktop);
  await check('Visible Use emulator ROM action shares exact identity without changing project or paused game', async () => {
    await clickVisible(desktop, '#reRuntimeUseRom');
    await desktop.waitForFunction(() => !Forge.services.RERuntimeUI.getState().busy && !!Forge.services.RERuntime.status().identity);
    assert.equal(await desktop.locator('#reRuntimeWorkspace').isVisible(), true);
    assert.match(await desktop.locator('#reRuntimeIdentity').innerText(), new RegExp(romSHA256));
    assert.match(await desktop.locator('#reAnalysisIdentity').innerText(), new RegExp(romSHA256));
    assert.deepEqual(await fingerprint(desktop), initial);
  });
  await check('Trace from reset records executed code and original PPU writes after emulator frame execution', async () => {
    await clickVisible(desktop, '#reRuntimeResetStart');
    await desktop.waitForFunction(() => !Forge.services.RERuntimeUI.getState().busy && Forge.services.RERuntime.status().tracing);
    assert.equal(await desktop.evaluate(() => emu.frameCount), 0);
    assert.equal(await desktop.evaluate(() => emu.running), false);
    await clickVisible(desktop, '.tab[data-view="emu"]');
    await clickVisible(desktop, '#emuStepBtn');
    // Bounded fixture progression after a real Step click; no runtime analysis
    // APIs are invoked to generate, fake or replace the observed results.
    await desktop.evaluate(() => { for (let i = 0; i < 39; i++) emuRunFrame(); });
    await clickVisible(desktop, '.tab[data-view="disasm"]');
    await clickVisible(desktop, '#reRuntimeRefresh');
    const state = await desktop.evaluate(() => Forge.services.RERuntime.status());
    assert.ok(state.instructions > 0, 'Executed instructions must be observed');
    assert.ok(state.coverageCount > 0, 'Observed code locations must be present');
    assert.ok(state.eventCount >= 1024, 'Boot must observe actual graphics writes');
    assert.ok(await desktop.locator('#reRuntimeCoverage option').count() > 0);
    assert.ok(await desktop.locator('#reRuntimeEvents option').count() > 0);
    assert.match(await desktop.locator('#reRuntimeResourceStatus').innerText(), /Nametable storage: [1-9]\d* \/ \d+ bytes observed/);
    assert.deepEqual((await fingerprint(desktop)).project, initial.project);
    return {frame: await desktop.evaluate(() => emu.frameCount), observedInstructions: state.instructions,
      observedLocations: state.coverageCount, observedWrites: state.eventCount};
  });
  await check('Memory A/B comparison finds the credits byte after native keyboard coin input', async () => {
    await pulseKey(desktop, 'Enter');
    assert.equal(await desktop.evaluate(() => emu.ram[0]), 1, 'Enter must reach product selection');
    const before = await desktop.evaluate(() => emu.ram[1]);
    await clickVisible(desktop, '#reRuntimeSnapshotA');
    await pulseKey(desktop, 'KeyZ');
    const after = await desktop.evaluate(() => emu.ram[1]);
    assert.equal(after, before + 1, 'Native A-button action must add one credit');
    await clickVisible(desktop, '#reRuntimeSnapshotB');
    await desktop.locator('#reRuntimeMemoryRegion').selectOption('ram');
    await desktop.locator('#reRuntimeMemoryMode').selectOption('increased');
    await clickVisible(desktop, '#reRuntimeCompare');
    const labels = await desktop.locator('#reRuntimeMemoryResults option').allTextContents();
    const creditIndex = labels.findIndex(text => text.includes('$0001'));
    assert.ok(creditIndex >= 0, 'Visible memory results must include internal RAM $0001');
    assert.match(labels[creditIndex], new RegExp(before + ' → ' + after));
    await desktop.locator('#reRuntimeMemoryResults').selectOption(String(creditIndex));
    await clickVisible(desktop, '#reRuntimeUseCandidate');
    assert.equal(await desktop.locator('#reRuntimeWatchAddress').inputValue(), '$0001');
    await desktop.locator('#reRuntimeWatchLabel').fill('Candidate credits — owner ROM');
    await clickVisible(desktop, '#reRuntimeAddWatch');
    assert.match(await desktop.locator('#reRuntimeWatches').innerText(), /\$0001.*Candidate credits/);
    assert.deepEqual((await fingerprint(desktop)).project, initial.project);
    return {address: '$0001', before, after, interpretation: 'Credits meaning applies to this fixture, not automatically inferred by Forge'};
  });
  await check('Watched write navigates to the matching ROM source through visible controls', async () => {
    await pulseKey(desktop, 'KeyZ');
    await clickVisible(desktop, '#reRuntimeRefresh');
    await desktop.locator('#reRuntimeEventKind').selectOption('watch');
    assert.ok(await desktop.locator('#reRuntimeEvents option').count() > 0, 'Coin action must produce a watched RAM write');
    const event = await desktop.evaluate(() => Forge.services.RERuntime.events({kind: 'watch', limit: 1}).results[0]);
    assert.equal(event.address, 1);
    assert.ok(Number.isInteger(event.pc) && Number.isInteger(event.fileOffset));
    await desktop.locator('#reRuntimeEvents').selectOption('0');
    await clickVisible(desktop, '#reRuntimeViewEvent');
    assert.equal(Number(await desktop.locator('#reAnalysisOffset').inputValue()), event.fileOffset);
    assert.equal(Number(await desktop.locator('#reAnalysisOrigin').inputValue()), event.pc);
    const sourceLength = Math.min(event.sourceLength, 3, rom.length - event.fileOffset, 65536 - event.pc);
    assert.ok(Number.isInteger(sourceLength) && sourceLength >= 1 && sourceLength <= 3,
      'Source navigation requires a bounded, verified contiguous ROM byte prefix');
    assert.equal(Number(await desktop.locator('#reAnalysisLength').inputValue()), sourceLength);
    assert.deepEqual(event.bytes.slice(0, sourceLength), [...rom.subarray(event.fileOffset, event.fileOffset + sourceLength)]);
    assert.match(await desktop.locator('#reRuntimeMessage').innerText(), /Showing observed code starting at file/);
    assert.deepEqual((await fingerprint(desktop)).project, initial.project);
    await capture(desktop, 'desktop-runtime-source-jump');
    return {pc: event.pc, fileOffset: event.fileOffset, sourceLength, sourceBytes: event.bytes.slice(0, sourceLength),
      screenshotVisualReview: 'pending'};
  });
  await check('Actual runtime-evidence and resource downloads preserve identity, observations and source references', async () => {
    await clickVisible(desktop, '#reRuntimeStop');
    const before = await fingerprint(desktop);
    const evidence = await downloadJSON(desktop, '#reRuntimeExport', 'downloaded-runtime-evidence.json');
    assert.equal(evidence.data.format, 'NESForgeREInspection');
    assert.equal(evidence.data.version, 2);
    assert.equal(evidence.data.kind, 'runtime-observation');
    assert.equal(evidence.data.identity.sha256, romSHA256);
    assert.equal(evidence.data.identity.byteLength, rom.length);
    assert.ok(evidence.data.coverage.length > 0);
    assert.ok(evidence.data.events.some(event => event.kind === 'ppu'));
    assert.ok(evidence.data.events.some(event => event.kind === 'watch' && event.address === 1));
    assert.equal(evidence.data.events.filter(event => event.kind === 'apu').length, 0,
      'The supplied silent ROM must not acquire invented audio events');
    assert.ok(evidence.data.snapshots.A && evidence.data.snapshots.B);
    assert.equal(evidence.evidence.suggestedFilename, 'pepsi_vending_v9e-runtime-evidence.json');
    const resources = await downloadJSON(desktop, '#reRuntimeExportResources', 'downloaded-observed-ppu-resources.json');
    assert.equal(resources.data.format, 'NESForgeREInspection');
    assert.equal(resources.data.version, 2);
    assert.equal(resources.data.kind, 'observed-ppu-resources');
    assert.equal(resources.data.identity.sha256, romSHA256);
    assert.equal(resources.evidence.suggestedFilename, 'pepsi_vending_v9e-observed-ppu-resources.json');
    const backing = await desktop.evaluate(() => ({vram: Array.from(emu.vram), palette: Array.from(emu.palRam),
      chrRam: emu.hasChrRam ? Array.from(emu.chrRam) : []}));
    const resourceEvents = new Map(resources.data.events.map(event => [event.id, event]));
    assert.ok(resourceEvents.size > 0, 'The resource download must contain its own write-reference table');
    assert.ok(resources.data.events.every(event => event.kind === 'ppu'));
    let knownBytes = 0;
    for (const family of ['vram', 'palette', 'chrRam']) {
      const data = resources.data.resources[family];
      assert.equal(data.bytes.length, data.known.length);
      assert.equal(data.bytes.length, data.sourceEvent.length);
      for (let index = 0; index < data.bytes.length; index++) if (data.known[index]) {
        knownBytes++;
        assert.equal(data.bytes[index], backing[family][index], family + ' observed byte must match emulator storage');
        const event = resourceEvents.get(data.sourceEvent[index]);
        assert.equal(event?.kind, 'ppu', 'Known byte requires a write reference inside this resource download');
        assert.deepEqual(event, evidence.data.events[data.sourceEvent[index]], 'Resource reference must preserve the original event');
      }
    }
    assert.ok(knownBytes >= 1024);
    assert.deepEqual(await fingerprint(desktop), before, 'Exports must not mutate the paused game or active project');
    return {downloads: [evidence.evidence, resources.evidence], knownResourceBytes: knownBytes};
  });
  await check('Source jump refuses a different inspected file and preserves that inspection', async () => {
    const picker = desktop.locator('#reAnalysisFile');
    await picker.scrollIntoViewIfNeeded();
    assert.equal(await picker.isVisible(), true);
    const [chooser] = await Promise.all([desktop.waitForEvent('filechooser'), picker.click()]);
    await chooser.setFiles({name: 'Different-runtime-source.bin', mimeType: 'application/octet-stream', buffer: Buffer.from([0xa9, 0x42, 0x60])});
    await clickVisible(desktop, '#reAnalysisOpen');
    await desktop.waitForFunction(() => !Forge.services.REAnalysisUI.getState().busy &&
      Forge.services.REAnalysisUI.exportData()?.identity.name === 'Different-runtime-source.bin');
    const before = await desktop.evaluate(() => Forge.services.REAnalysisUI.exportData());
    await clickVisible(desktop, '#reRuntimeViewEvent');
    assert.match(await desktop.locator('#reRuntimeMessage').innerText(), /do not match/);
    assert.deepEqual(await desktop.evaluate(() => Forge.services.REAnalysisUI.exportData()), before);
    assert.deepEqual((await fingerprint(desktop)).project, initial.project);
  });
  const phone = await loadPage(true), mobileInitial = await fingerprint(phone);
  await check('390-pixel viewport exposes runtime investigation controls without horizontal clipping', async () => {
    await clickVisible(phone, '#reRuntimeUseRom');
    await phone.waitForFunction(() => !Forge.services.RERuntimeUI.getState().busy && !!Forge.services.RERuntime.status().identity);
    const bounds = await withinHorizontalViewport(phone, ['#reRuntimePanel', '#reRuntimeUseRom', '#reRuntimeStart',
      '#reRuntimeResetStart', '#reRuntimeStop', '#reRuntimeRefresh', '#reRuntimeIdentity', '#reRuntimeWorkspace',
      '#reRuntimeSnapshotA', '#reRuntimeSnapshotB', '#reRuntimeMemoryRegion', '#reRuntimeMemoryMode',
      '#reRuntimeMemoryResults', '#reRuntimeUseCandidate', '#reRuntimeWatchAddress', '#reRuntimeWatchLabel',
      '#reRuntimeAddWatch', '#reRuntimeCoverage', '#reRuntimeEventKind', '#reRuntimeEvents',
      '#reRuntimeExport', '#reRuntimeExportResources']);
    assert.deepEqual(await fingerprint(phone), mobileInitial);
    await phone.locator('#reRuntimeWorkspace').scrollIntoViewIfNeeded();
    await capture(phone, 'mobile-runtime-investigation');
    return {bounds, screenshotVisualReview: 'pending'};
  });
  await check('Mobile trace and memory controls are actionable and preserve the authoring project', async () => {
    await clickVisible(phone, '#reRuntimeResetStart');
    await phone.waitForFunction(() => !Forge.services.RERuntimeUI.getState().busy && Forge.services.RERuntime.status().tracing);
    await clickVisible(phone, '.tab[data-view="emu"]');
    await clickVisible(phone, '#emuStepBtn');
    await phone.evaluate(() => { for (let i = 0; i < 3; i++) emuRunFrame(); });
    await clickVisible(phone, '.tab[data-view="disasm"]');
    await clickVisible(phone, '#reRuntimeRefresh');
    assert.ok(await phone.locator('#reRuntimeCoverage option').count() > 0);
    await clickVisible(phone, '#reRuntimeSnapshotA');
    await clickVisible(phone, '#reRuntimeSnapshotB');
    await clickVisible(phone, '#reRuntimeCompare');
    assert.equal(await phone.locator('#reRuntimeMemoryResults option').count(), 0,
      'Two snapshots without intervening execution should have no changed bytes');
    await clickVisible(phone, '#reRuntimeStop');
    assert.equal(await phone.evaluate(() => Forge.services.RERuntime.status().tracing), false);
    assert.deepEqual((await fingerprint(phone)).project, mobileInitial.project);
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
