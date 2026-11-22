'use strict';
// CNROM (mapper 3) background investigation, on a cartridge Forge builds itself from repository inputs: the CNROM world
// project of QA/t/cnrom-world.cjs (three worlds, two 8 KB CHR banks, synthetic art). No commercial ROM is needed.
//   node QA/cnrom-investigation.cjs <editor.html> <report.json>
// 1. A capture plan visits world 0, 1 and 2 (each reached by setting the engine's own screen variable, as Ninja
//    Gaiden's plan sets its area): every frame captured from the boot checkpoint equals the cold-boot capture section by
//    section, rebuilds from its trace at 0 different pixels, and every mapped CHR window equals the cartridge's bytes at
//    its reported file offset. World 1 is drawn from the second 8 KB CHR bank, worlds 0 and 2 from the first, as the
//    build planned them.
// 2. Agent Lab runs the same plan as a background job with cold-boot verification: every frame is
//    synchronization-checked and has its scene; nothing failed.
// 3. Forge (Chromium) imports the job's results into the library: every record validates (section digests, screenshot
//    pixels, scene re-render) and none is rejected.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const {spawn, spawnSync} = require('node:child_process');
const {loadForge} = require('./t/u/harness.cjs');
const root = path.resolve(__dirname, '..'), editor = path.resolve(process.argv[2] || path.join(root, 'NES_Forge.html')), output = process.argv[3];
const WORKER = path.join(root, 'tools/agent-lab/capture_worker.cjs');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const report = {suite: 'cnrom-investigation', editorSha256: sha(fs.readFileSync(editor)), checks: []};
const checks = [];
const check = (name, fn) => checks.push([name, fn]);

const h = loadForge(editor);
for (const k of ['DecompressionStream', 'Blob', 'Response', 'ReadableStream', 'TextDecoder', 'TextEncoder', 'atob', 'btoa']) if (!h.context[k]) h.context[k] = globalThis[k];
if (!h.context.crypto || !h.context.crypto.subtle) h.context.crypto = crypto.webcrypto;
h.context.setTimeout = (fn, ms, ...a) => setTimeout(fn, 0, ...a);
const R = async (name, args) => { h.context.__a = args === undefined ? null : args;
  const r = JSON.parse(JSON.stringify(await h.run(`Forge.commands.run(${JSON.stringify(name)},__a)`, 600000)));
  if (!r.ok) throw Error(name + ': ' + r.error.message); return r.result; };

// the CNROM world project of QA/t/cnrom-world.cjs: worlds 0 and 1 have their own 240-tile tilesets, world 2 reuses
// world 0's, so the build needs two CHR banks
const example = JSON.parse(fs.readFileSync(path.join(root, 'Examples/TwoStages.nesforge.json'), 'utf8'));
const patterned = key => Array.from({length: 8}, (_, y) => Array.from({length: 8}, (_, x) => ((key >> ((y * 8 + x) % 10)) & 1) * (1 + (x & 1))));
function bigWorlds() {
  const p = structuredClone(example), base = p.scenes.find(s => s.id === p.worlds[0].tilesetSceneId);
  const art = (sc, key) => {
    sc.chr = Array.from({length: 256}, (_, t) => patterned(key + t));
    sc.metatiles = Array.from({length: 60}, (_, m) => ({...(base.metatiles[0] || {}), id: m, tiles: [m * 4, m * 4 + 1, m * 4 + 2, m * 4 + 3], pal: m & 3, collision: [0, 0, 0, 0]}));
  };
  const clone = structuredClone(base); clone.id = 'cnrom-art-1'; clone.name = 'CNROM test art 1'; clone.entities = []; clone.links = []; clone.oam = [];
  art(base, 0); art(clone, 256); p.scenes.push(clone);
  p.worlds.forEach((w, i) => { w.tilesetSceneId = i === 1 ? clone.id : base.id; w.map = w.map.map((id, cell) => id === -1 ? -1 : cell % 60); });
  return p;
}

let cart = null, plan = null, worldBanks = null;
async function build() {
  if (cart) return;
  await R('project.load', {json: JSON.stringify(bigWorlds())});
  cart = new Uint8Array(Buffer.from((await R('build.rom')).base64, 'base64'));
  const symbols = JSON.parse(JSON.stringify(h.run('(()=>Forge.services.RuntimeCompiler.compile().world.symbols)()')));
  const layout = JSON.parse(JSON.stringify(h.run('(()=>{const p=Forge.services.WorldCompiler.plan(Forge.services.ProjectStore.capture());return {banks:p.spec.worldChrBank,starts:p.spec.worlds.map(w=>w.screenStart)};})()')));
  worldBanks = layout.banks;
  const visit = w => ({[symbols.screen]: layout.starts[w], [symbols.renderedScreen]: 255});
  plan = {format: 'NESForgeCapturePlan', version: 1, name: 'NES Forge CNROM world test cartridge · each world', profile: null, match: {sha256: [sha(cart)]},
    method: 'The engine\'s own screen variable is set to each world\'s first screen (and the rendered screen cleared), as a level select would.',
    boot: {frames: 30, inputs: []},
    targets: [0, 1, 2].map(w => ({label: 'World ' + w + ' (CHR bank ' + layout.banks[w] + ')', ...(w ? {ram: visit(w)} : {}), frames: 10}))};
}

check('The test cartridge is CNROM (mapper 3) with two 8 KB CHR banks; its worlds use banks 0, 1, 0', async () => {
  await build();
  report.cartridge = {mapper: (cart[6] >> 4) | (cart[7] & 0xF0), chrBanks8KiB: cart[5], bytes: cart.length, sha256: sha(cart), worldBanks};
  assert.equal(report.cartridge.mapper, 3); assert.ok(cart[5] >= 2); assert.deepEqual(worldBanks, [0, 1, 0]);
});
check('Capture plan: each world\'s frame from the boot checkpoint equals its cold-boot capture section by section, rebuilds at 0 different pixels, and its CHR windows equal the cartridge bytes; world 1 is drawn from bank 1, worlds 0 and 2 from bank 0', async () => {
  await build();
  const warm = await R('emulator.capturePlan', {bytes: cart, name: 'cnrom.nes', plan, mode: 'checkpoint'});
  const cold = await R('emulator.capturePlan', {bytes: cart, name: 'cnrom.nes', plan, mode: 'cold'});
  const chrStart = 16 + cart[4] * 16384;
  report.plan = warm.results.map((r, i) => {
    const diff = Object.keys(r.digests).filter(k => r.digests[k] !== cold.results[i].digests[k]);
    const windows = r.banks.chr.map(w => ({ppu: w.ppu, fileOffset: w.fileOffset, bank8KiB: (w.fileOffset - chrStart) >> 13, matchesFile: w.matchesFile}));
    const bgBanks = [...new Set((r.synchronization.backgroundTileSources || []).map(s => s.chrOffset >> 13))];
    return {label: r.label, frame: r.frame, mapper: r.rom.mapper, sameAsCold: diff.length === 0, differing: diff, synchronization: r.synchronization.state,
      backgroundDifferentPixels: r.synchronization.backgroundDifferentPixels, compositeDifferentPixels: r.synchronization.compositeDifferentPixels, windowBanks: [...new Set(windows.map(w => w.bank8KiB))], bgBanks,
      windowsMatchFile: windows.every(w => w.matchesFile === true)};
  });
  report.timing = {checkpointBoots: warm.boots, coldBoots: cold.boots};
  assert.equal(report.plan.length, 3);
  for (const [i, f] of report.plan.entries()) {
    assert.equal(f.mapper, 3); assert.ok(f.sameAsCold, f.label + ' differs from the cold boot in ' + f.differing.join(','));
    assert.equal(f.synchronization, 'matched', f.label); assert.equal(f.backgroundDifferentPixels, 0); assert.equal(f.compositeDifferentPixels, 0);
    assert.ok(f.windowsMatchFile, f.label + ': CHR windows vs the cartridge');
    assert.deepEqual(f.windowBanks, [worldBanks[i]], f.label + ': mapped bank'); assert.deepEqual(f.bgBanks, [worldBanks[i]], f.label + ': the bank its background tiles came from');
  }
  assert.equal(warm.boots, 1); assert.equal(cold.boots, 3);
});

let lab = null;
check('Agent Lab: the plan as a background job with cold-boot verification: every frame synchronization-checked, with its scene; nothing failed', async () => {
  await build();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-cnrom-lab-'));
  const romFile = path.join(dir, 'cnrom-world.nes'), planFile = path.join(dir, 'cnrom-world.plan.json'), labRoot = path.join(dir, 'lab');
  fs.writeFileSync(romFile, cart); fs.writeFileSync(planFile, JSON.stringify(plan));
  const cli = (...args) => { const r = spawnSync(process.execPath, [WORKER, ...args, '--root', labRoot], {encoding: 'utf8', timeout: 600000, env: process.env});
    if (r.status !== 0) throw Error(args[0] + ': ' + (r.stderr || r.stdout).slice(-600)); return r.stdout; };
  cli('enqueue', '--rom', romFile, '--plan', planFile, '--verify', 'cold');
  const t0 = Date.now();
  await new Promise((resolve, reject) => {   // forwarded log and a heartbeat: never silent while the worker runs
    const p = spawn(process.execPath, [WORKER, 'run', '--root', labRoot, '--forge', editor, '--once'], {env: process.env}); let err = '';
    p.stdout.on('data', d => process.stdout.write(String(d).split('\n').filter(Boolean).map(l => '  agent-lab: ' + l + '\n').join('')));
    p.stderr.on('data', d => { err += d; });
    const beat = setInterval(() => console.log('  agent-lab: running · ' + Math.round((Date.now() - t0) / 1000) + ' s'), 30000);
    p.on('exit', code => { clearInterval(beat); code === 0 ? resolve() : reject(Error('run: ' + err.slice(-600))); });
  });
  const [job] = JSON.parse(cli('status'));
  lab = {dir, labRoot, job};
  report.agentLab = {ms: Date.now() - t0, state: job.state, frames: job.frames, synchronized: job.synchronized, failures: job.failures, unresolved: job.unresolved, checkpoint: job.checkpoint && {verified: job.checkpoint.verified?.method || null}};
  assert.equal(job.state, 'completed'); assert.equal(job.frames, 3); assert.equal(job.synchronized, 3); assert.equal(job.failures.length, 0);
  const full = JSON.parse(fs.readFileSync(path.join(labRoot, 'jobs', job.id, 'job.json'), 'utf8'));
  assert.ok(full.results.every(r => r.synchronization === 'matched' && r.scene), JSON.stringify(full.results.map(r => [r.label, r.synchronization, r.scene])));
  assert.ok(!job.unresolved.some(u => /not synchronization-checked/.test(u)), JSON.stringify(job.unresolved));
});
check('Forge imports the job\'s results into the library: every record validates (digests, screenshot pixels, scene re-render), none rejected', async () => {
  assert.ok(lab, 'needs the Agent Lab job');
  const {chromium} = require('playwright');
  const worker = require(WORKER), results = worker.bundle(lab.labRoot, lab.job.id);
  const browser = await chromium.launch({headless: true, ...(process.env.CHROMIUM_PATH ? {executablePath: process.env.CHROMIUM_PATH} : {})});
  try {
    const page = await (await browser.newContext()).newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto('file://' + editor); await page.waitForFunction('window.Forge?.services?.FrameEvidence');
    const r = await page.evaluate(async b => { const x = await Forge.services.FrameEvidence.importInvestigation(b); return {imported: x.imported, already: x.already, rejected: x.rejected}; }, results);
    const again = await page.evaluate(async b => { const x = await Forge.services.FrameEvidence.importInvestigation(b); return {imported: x.imported, already: x.already}; }, results);
    report.import = {first: r, again, pageErrors: errors.slice(0, 3)};
    assert.equal(r.rejected.length, 0, JSON.stringify(r.rejected)); assert.equal(r.imported, 3); assert.equal(again.imported, 0); assert.equal(again.already, 3);
    assert.equal(errors.length, 0, errors[0]);
  } finally { await browser.close(); fs.rmSync(lab.dir, {recursive: true, force: true}); }
});

(async () => {
  for (const [name, fn] of checks) { process.stderr.write('check: ' + name + '\n'); try { await fn(); report.checks.push({name, passed: true}); } catch (e) { report.checks.push({name, passed: false, error: String(e.stack || e.message).slice(0, 900)}); } }
  report.total = report.checks.length; report.checksPassed = report.checks.filter(c => c.passed).length; report.passed = report.checksPassed === report.total;
  for (const c of report.checks) console.log((c.passed ? 'PASS ' : 'FAIL ') + c.name + (c.error ? ': ' + c.error : ''));
  if (output) fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  process.exitCode = report.passed ? 0 : 1;
})();
