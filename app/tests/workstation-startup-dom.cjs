'use strict';
// Parse and execute the delivered HTML in jsdom. Unlike harness.cjs, this
// environment enforces DOM ancestry and never creates missing queried elements.
// Canvas rendering and timers are stubbed; this is not a browser/layout test.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {JSDOM, VirtualConsole} = require('jsdom');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const noop = () => {};
const htmlPath = path.resolve(process.argv[2] || path.join(__dirname, '../mainline/NES_Forge_2.0.0-alpha.11.html'));
const reportPath = process.argv[3] && path.resolve(process.argv[3]);
const baselinePath = process.argv[4] && path.resolve(process.argv[4]);
const checks = [], report = {htmlSha256: sha(fs.readFileSync(htmlPath)), engine: 'jsdom ' + require('jsdom/package.json').version,
  scope: 'Full delivered HTML parsing/execution, strict DOM ancestry and actual control events. Canvas/timers stubbed; no browser layout/device acceptance.', checks};
let activeDOM;
function load(file, url = 'https://forge.test/', storedAppearance = false) {
  const errors = [], consoleErrors = [], domErrors = [];
  const canvas = new Proxy({createImageData: (w, h) => ({width: w, height: h, data: new Uint8ClampedArray(w * h * 4)}),
    getImageData: (x, y, w, h) => ({width: w, height: h, data: new Uint8ClampedArray(w * h * 4)}),
    measureText: value => ({width: String(value).length * 6}), createLinearGradient: () => ({addColorStop: noop})},
  {get: (object, key) => key in object ? object[key] : noop});
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('error', (...values) => consoleErrors.push(values.join(' ')));
  virtualConsole.on('jsdomError', error => domErrors.push({type: error.type, message: error.message}));
  const dom = new JSDOM(fs.readFileSync(file, 'utf8'), {url, runScripts: 'dangerously', virtualConsole,
    beforeParse(window) {
      window.addEventListener('error', event => errors.push({name: event.error?.name, message: event.message}));
      window.HTMLCanvasElement.prototype.getContext = () => canvas;
      window.HTMLCanvasElement.prototype.toDataURL = () => '';
      window.ResizeObserver = class {observe() {} disconnect() {}};
      window.requestAnimationFrame = () => 1; window.cancelAnimationFrame = noop;
      window.setTimeout = () => 1; window.setInterval = () => 1;
      window.URL.createObjectURL = () => '';
      window.TextEncoder = TextEncoder; window.TextDecoder = TextDecoder;
      window.alert = noop; window.confirm = () => true;
      if (storedAppearance) {
        window.localStorage.setItem('nesforge.appearance.skin', 'on');
        window.localStorage.setItem('nesforge.appearance.density', 'comfortable');
      }
    }});
  return {dom, window: dom.window, document: dom.window.document, errors, consoleErrors, domErrors};
}
function check(name, fn) {fn(); checks.push({name, passed: true});}
try {
  if (baselinePath) {
    const old = load(baselinePath), ids = ['nf-skin-toggle', 'frx-open', 'fcw-ribbon'];
    report.before = {htmlSha256: sha(fs.readFileSync(baselinePath)), errors: old.errors,
      controls: Object.fromEntries(ids.map(id => [id, !!old.document.getElementById(id)])),
      canvasParentClass: old.document.getElementById('emuCanvas').parentElement.className};
    check('Previous delivered HTML reproduces NotFoundError and all three missing entry controls', () => {
      assert(old.errors.some(error => error.name === 'NotFoundError'));
      for (const id of ids) assert.equal(report.before.controls[id], false);
    });
    old.dom.window.close();
  }
  const current = load(htmlPath); activeDOM = current.dom;
  const w = current.window, d = current.document, services = w.Forge.services;
  const get = id => {const node = d.getElementById(id); assert(node?.isConnected, id + ' must exist in the parsed document'); return node;};
  const project = services.ProjectStore.serialize(), rom = services.RuntimeCompiler.compile().rom;
  check('Full application startup completes without exceptions', () => {
    assert.deepEqual(current.errors, []); assert.deepEqual(current.consoleErrors, []); assert.deepEqual(current.domErrors, []);
    assert.equal(services.ProjectStore.state.epoch > 0, true);
  });
  check('All adopted UI mounts in the document after the existing canvas wrapper', () => {
    for (const id of ['nf-skin-toggle', 'nf-density', 'frx-open', 'fcw-ribbon', 'fcw-open', 'nf04-meta-context',
      'nativeWorldOpen', 'areaLibraryOpen', 'punchOutReplayOpen']) get(id);
    const view = get('emuView'), panel = get('emuPlayPanel'), replay = get('punchOutReplayPanel'), canvas = get('emuCanvas');
    assert.equal(panel.parentElement, view); assert.equal(replay.parentElement, view);
    assert.equal(replay.nextElementSibling, panel); assert.equal(canvas.closest('#emuPlayPanel'), panel);
    // A permissive fake DOM would accept the broken insertion and miss this bug.
    assert.throws(() => view.insertBefore(d.createElement('div'), canvas), {name: 'NotFoundError'});
  });
  check('Original appearance, Retro toggle and both densities preserve project and starter ROM', () => {
    assert.equal(w.NFWorkstationAppearance.status().enabled, false);
    get('nf-skin-toggle').click(); assert(d.body.classList.contains('nf-retro'));
    for (const mode of ['comfortable', 'compact']) {
      get('nf-density').value = mode; get('nf-density').dispatchEvent(new w.Event('change', {bubbles: true}));
      assert.equal(w.NFWorkstationAppearance.status().density, mode);
      assert.equal(services.ProjectStore.serialize(), project);
    }
    get('nf-skin-toggle').click(); assert.equal(d.body.classList.contains('nf-retro'), false);
    assert.equal(services.ProjectStore.serialize(), project);
    assert.equal(rom.length, 24592); assert.equal(sha(rom), '08c95a83d9137dc349b70d20afbf3d1a3f3c3daf8f0cd85a1cd9bbc00e2615f7');
    assert.equal(sha(services.RuntimeCompiler.compile().rom), sha(rom));
  });
  check('Resources opens, renders live previews/relationships, and closes from its controls', () => {
    get('frx-open').click(); assert(get('frx-root').classList.contains('frx-visible'));
    assert(get('frx-items').children.length > 0); assert(get('frx-preview').children.length > 0);
    get('frx-live').click(); assert.equal(services.ResourceRelationshipPreview.summary().mode, 'live');
    get('frx-close').click(); assert.equal(get('frx-root').classList.contains('frx-visible'), false);
    assert.equal(services.ProjectStore.serialize(), project);
  });
  check('Connected Workspace opens all five panels and closes without editing the project', () => {
    get('fcw-open').click(); assert(get('fcw-overlay').classList.contains('show'));
    for (const tab of ['overview', 'create', 'native', 'health', 'import']) {
      d.querySelector('[data-fcw-tab="' + tab + '"]').click();
      assert(get('fcw-panel-' + tab).classList.contains('show'));
      assert(get('fcw-panel-' + tab).textContent.length > 20);
    }
    get('fcw-close').click(); assert.equal(get('fcw-overlay').classList.contains('show'), false);
    assert.equal(services.ProjectStore.serialize(), project);
  });
  check('Follow selection and matching metasprite controls use the selected Scene', () => {
    const fixture = services.ProjectStore.capture(), scene = JSON.parse(JSON.stringify(fixture.scenes[0]));
    scene.id = 'startup-second-scene'; scene.name = 'Startup second Scene'; fixture.scenes.push(scene);
    fixture.metasprites.push({id: 'startup-pose', name: 'Startup matching pose', sceneId: scene.id, spriteMode: 8, originX: 0, originY: 0, pieces: []});
    services.ProjectStore.commit(services.ProjectStore.prepareLoad(fixture), {sync: true, intent: 'startup-test-fixture'});
    get('frx-open').click(); get('frx-live').click();
    get('frx-follow').checked = true; get('frx-follow').dispatchEvent(new w.Event('change', {bubbles: true}));
    const entry = [...get('frx-items').querySelectorAll('button')].find(button => button.querySelector('.frx-item-name')?.textContent === scene.name);
    assert(entry, 'Second Scene must be a real selectable Resources entry'); entry.click();
    assert.equal(w.eval('S.scenes[S.activeScene].id'), scene.id);
    get('frx-close').click(); d.querySelector('[data-view="metasprites"]').click();
    get('nf04-pose-choices').value = 'startup-pose'; get('nf04-meta-context').querySelector('button').click();
    assert.equal(w.NFContext04.describe().matches, true);
    assert.match(get('nf04-meta-context').textContent, /MATCHING SOURCE/);
  });
  check('Replay shortcut opens its mounted controls and retains the canvas owner', () => {
    get('punchOutReplayOpen').click(); assert.equal(w.eval('S.tab'), 'emu');
    assert.equal(get('punchOutReplayPanel').open, true);
    assert.equal(get('emuCanvas').closest('#emuPlayPanel'), get('emuPlayPanel'));
    assert.equal(get('punchOutReplayRun').disabled, false);
  });
  check('No application/DOM errors occur during the control interactions', () => {
    assert.deepEqual(current.errors, []); assert.deepEqual(current.consoleErrors, []); assert.deepEqual(current.domErrors, []);
  });
  activeDOM.window.close(); activeDOM = null;
  for (const [url, stored] of [['file:///nes-forge.html', false], ['https://forge.test/', true]]) {
    const instance = load(htmlPath, url, stored); activeDOM = instance.dom;
    check(stored ? 'Stored Retro/Comfortable preference restores on a new document' : 'Local-file startup works when preference storage is unavailable', () => {
      assert.deepEqual(instance.errors, []); assert.deepEqual(instance.consoleErrors, []); assert.deepEqual(instance.domErrors, []);
      const status = instance.window.NFWorkstationAppearance.status(); assert.equal(status.enabled, stored);
      if (stored) assert.equal(status.density, 'comfortable');
      for (const id of ['nf-skin-toggle', 'frx-open', 'fcw-open']) assert(instance.document.getElementById(id)?.isConnected);
      instance.document.getElementById('nf-skin-toggle').click();
      assert.equal(instance.window.NFWorkstationAppearance.status().enabled, !stored);
    });
    activeDOM.window.close(); activeDOM = null;
  }
  report.status = 'passed';
} catch (error) {
  report.status = 'failed'; report.error = error.stack; process.exitCode = 1;
} finally {
  activeDOM?.window.close(); report.passed = checks.filter(check => check.passed).length;
  if (reportPath) fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
