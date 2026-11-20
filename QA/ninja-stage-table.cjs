'use strict';
// Ninja Gaiden (US) stage table, owner-side (needs the cartridge; nothing from it is written to the report):
// the native catalog's stages come from PRG bank 0 $AF6E (one BCD act/stage byte per area, read by $EB45 when the HUD
// is drawn), cover every room, survive save/reopen, and match what the game itself draws: for every area, from a fresh
// start, the game's own time-over restart draws the catalog's "STAGE x-y" at VRAM $2096.
//   node QA/ninja-stage-table.cjs <NES_Forge.html> <report.json> <folder with the cartridge>
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const {loadForge} = require('./t/u/harness.cjs');
const [editorArg, output, cartDir] = process.argv.slice(2);
const editor = path.resolve(editorArg), sha = b => crypto.createHash('sha256').update(b).digest('hex');
const report = {editorSha256: sha(fs.readFileSync(editor)), checks: []};
const NINJA = '07d9e57e35184667c7b89e30857a44c5c404b48332ad12e66be91100eccd4f5e';
const cart = fs.readdirSync(cartDir).map(f => path.join(cartDir, f)).find(f => /\.nes$/i.test(f) && sha(fs.readFileSync(f)) === NINJA);
const h = loadForge(editor);
for (const k of ['DecompressionStream', 'Blob', 'Response', 'ReadableStream', 'TextDecoder', 'TextEncoder', 'atob', 'btoa']) if (!h.context[k]) h.context[k] = globalThis[k];
if (!h.context.crypto || !h.context.crypto.subtle) h.context.crypto = crypto.webcrypto;
h.context.setTimeout = (fn, ms, ...a) => setTimeout(fn, 0, ...a);
const R = async (name, a) => { h.context.__a = a === undefined ? null : a; const r = JSON.parse(JSON.stringify(await h.run(`Forge.commands.run(${JSON.stringify(name)},__a)`, 900000))); if (!r.ok) throw Error(name + ': ' + r.error.message); return r.result; };
const J = c => JSON.parse(JSON.stringify(h.run(c)));
const checks = [], check = (name, fn) => checks.push([name, fn]);
let stages = null, scenes = null;
check('The catalog has the game\'s stages from bank 0 $AF6E and every room has one', async () => {
  assert.ok(cart, 'Ninja Gaiden (US) cartridge ' + NINJA.slice(0, 12) + '… not found in ' + cartDir);
  h.context.__b = new Uint8Array(fs.readFileSync(cart));
  const r = JSON.parse(await h.run(`(async()=>{const p=await Forge.services.InvestigationProject.create(__b,'Ninja Gaiden (U).nes');window.__p=p;const n=p.investigation.catalogs.native;
    return JSON.stringify({stages:n.stages,scenes:n.scenes.map(s=>({area:s.area,room:s.room,stage:s.stage}))});})()`, 900000));
  stages = r.stages; scenes = r.scenes;
  assert.equal(stages.length, 21); assert.equal(scenes.length, 48);
  assert.deepEqual(stages.map(s => s.label), ['1-1', '1-2', '2-1', '2-2', '2-3', '3-1', '3-2', '3-3', '4-1', '4-2', '4-3', '4-4', '5-1', '5-2', '5-3', '5-4', '6-1', '6-2', '6-3', '6-4', '6-5'].map(x => 'Stage ' + x));
  assert.deepEqual(stages.find(s => s.label === 'Stage 6-4').areas, [19, 20]);
  assert.equal(stages.reduce((n, s) => n + s.rooms.length, 0), 48, 'every room in exactly one stage');
  for (const s of scenes) { assert.equal(s.stage.basis, 'rom-table'); assert.equal(s.stage.source.bank16KiB, 0); assert.equal(s.stage.source.cpu, 0xAF6E + s.area); assert.equal(s.stage.reader.cpu, 0xEB45); }
});
check('The stages survive save/reopen', async () => {
  await R('project.replace', {json: J('JSON.stringify(window.__p)')}).catch(async () => { await h.run('Forge.services.ProjectStore.load(window.__p,{intent:"qa"})'); });
  const before = J('JSON.stringify(Forge.services.ProjectStore.capture().investigation.catalogs.native.stages)');
  const text = J('Forge.services.ProjectStore.serialize()'); await h.run(`Forge.services.ProjectStore.load(JSON.parse(${JSON.stringify(text)}),{intent:'qa-reopen'})`);
  assert.equal(J('JSON.stringify(Forge.services.ProjectStore.capture().investigation.catalogs.native.stages)'), before);
});
check('Emulator: for every area the game draws the catalog\'s stage on the HUD', async () => {
  const bytes = new Uint8Array(fs.readFileSync(cart)), press = async b => { await R('input.set', {buttons: {[b]: true}}); await R('emulator.frames', {count: 4}); await R('input.set', {buttons: {[b]: false}}); };
  const hud = () => J('[...emu.vram.slice(0x96,0x99)]'), seen = [];
  for (let area = 0; area < 22; area++) {
    await R('emulator.load', {bytes, name: 'ng.nes'});
    for (let f = 0; f < 3000; f += 30) { await R('emulator.frames', {count: 26}); await press('start'); if (hud()[1] === 0x18 && J('emu.ram[0x6D]') === 0) break; }
    await R('emulator.frames', {count: 60});
    if (area) { // time over: the game's own death routine restarts the area ($6D) and redraws the HUD
      h.run(`emu.ram[0x6D]=${area};emu.ram[0x63]=1;emu.ram[0x76]=Math.max(emu.ram[0x76],2)`);
      let zero = false, restarted = false;
      for (let f = 0; f < 6000 && !restarted; f += 10) { await R('emulator.frames', {count: 10}); const t = J('emu.ram[0x63]'); if (t === 0) zero = true; else if (zero && t >= 140 && t <= 150) restarted = true; }
      assert.ok(restarted, 'area ' + area + ' restarted'); await R('emulator.frames', {count: 60});
    }
    const d = hud(), stage = scenes.find(s => s.area === area).stage; seen.push(d[0] + '-' + d[2]);
    assert.equal(J('emu.ram[0x6D]'), area); assert.deepEqual(d, [stage.act, 0x18, stage.number], 'area ' + area + ' HUD');
  }
  return seen;
});
(async () => {
  for (const [name, fn] of checks) { try { const r = await fn(); report.checks.push({name, passed: true, ...(r ? {observed: r} : {})}); } catch (e) { report.checks.push({name, passed: false, error: String(e.message).slice(0, 500)}); } }
  report.passed = report.checks.every(c => c.passed);
  for (const c of report.checks) console.log((c.passed ? 'PASS ' : 'FAIL ') + c.name + (c.error ? ': ' + c.error : ''));
  if (output) fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  process.exitCode = report.passed ? 0 : 1;
})();
