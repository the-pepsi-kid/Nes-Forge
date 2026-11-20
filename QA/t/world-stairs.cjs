'use strict';
// World Runtime stairs (repository inputs only): a stair in the two-stage example is kept through save/open, compiled
// into its screen, and in the emulator Up at its foot climbs it one pixel diagonally per frame without gravity, the
// top end steps off, Down at the top end climbs back down, and projects without stairs build exactly as before.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const {loadForge} = require('./u/harness.cjs');
const root = path.resolve(__dirname, '../..'), editor = path.resolve(process.argv[2] || path.join(root, 'NES_Forge.html')), output = process.argv[3];
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const report = {editorSha256: sha(fs.readFileSync(editor)), checks: []};
const h = loadForge(editor);
for (const k of ['DecompressionStream', 'Blob', 'Response', 'ReadableStream', 'TextDecoder', 'TextEncoder', 'atob', 'btoa']) if (!h.context[k]) h.context[k] = globalThis[k];
if (!h.context.crypto || !h.context.crypto.subtle) h.context.crypto = crypto.webcrypto;
h.context.setTimeout = (fn, ms, ...a) => setTimeout(fn, 0, ...a);
const R = async (name, a) => { h.context.__a = a === undefined ? null : a; const r = JSON.parse(JSON.stringify(await h.run(`Forge.commands.run(${JSON.stringify(name)},__a)`, 600000))); if (!r.ok) throw Error(name + ': ' + r.error.message); return r.result; };
const checks = [], check = (name, fn) => checks.push([name, fn]);
const example = JSON.parse(fs.readFileSync(path.join(root, 'Examples/TwoStages.nesforge.json'), 'utf8'));
// The example's first world is one screen with its floor top at y 208 (spawn row 12). A 48 px stair climbing right
// from (100, 208) ends at (148, 160).
const withStair = () => { const p = structuredClone(example); p.worlds[0].stairs = [{id: 'qa-stair', name: 'QA stair', x: 100, y: 208, length: 48, direction: 'right'}]; return p; };
let Z = null;

check('Projects without stairs are unchanged: no stairs field is added on save', async () => {
  await R('project.load', {json: JSON.stringify(example)});
  const saved = JSON.parse((await R('project.save')).json);
  assert.ok(saved.worlds.every(w => !('stairs' in w)));
});
check('A stair survives save/open and is compiled into its screen', async () => {
  await R('project.load', {json: JSON.stringify(withStair())});
  const saved = JSON.parse((await R('project.save')).json);
  assert.deepEqual(saved.worlds[0].stairs, [{id: 'qa-stair', name: 'QA stair', x: 100, y: 208, length: 48, direction: 'right'}]);
  const screen = JSON.parse(JSON.stringify(h.run('Forge.services.WorldCompiler.plan(Forge.services.ProjectStore.capture()).spec.screens[0].stairs')));
  assert.deepEqual(screen, [{x: 100, y: 208, len: 48, dir: 0}]);
  Z = JSON.parse(JSON.stringify(h.run('Forge.services.RuntimeCompiler.compile().world.symbols')));
});
check('Emulator: Up at the foot climbs diagonally without gravity; Down at the top climbs back', async () => {
  const rom = Buffer.from((await R('build.rom')).base64, 'base64');
  await R('emulator.load', {bytes: rom, name: 'stairs.nes'}); await R('emulator.frames', {count: 30});
  const v = () => JSON.parse(JSON.stringify(h.run(`[emu.ram[${Z.playerX}],emu.ram[${Z.playerY}],emu.ram[0x680]]`)));
  h.run(`emu.ram[${Z.playerX}]=98;emu.ram[${Z.playerY}]=200;emu.ram[${Z.velocityY}]=0`); await R('emulator.frames', {count: 30});
  assert.deepEqual(v(), [98, 208, 0], 'standing at the foot');
  await R('input.set', {buttons: {up: true}}); await R('emulator.frames', {count: 21});
  const [x, y, on] = v(); assert.equal(on, 1, 'on the stair'); assert.equal(x - 100, 208 - y, 'diagonal'); assert.ok(y < 208 && y > 160);
  // step frame by frame until the player steps off: that frame is exactly the top end
  let top = v(); for (let f = 0; f < 60 && top[2] === 1; f++) { await R('emulator.frames', {count: 1}); top = v(); }
  await R('input.set', {buttons: {up: false}});
  assert.equal(top[2], 0, 'stepped off at the top'); assert.deepEqual(top.slice(0, 2), [148, 160]);
  // nothing below the top end in this example: gravity resumes and the player lands back on the floor
  await R('emulator.frames', {count: 60}); assert.equal(v()[1], 208, 'falls back to the floor');
  // walk to the foot again and test the top-end entry by placing the player at the top with ground under it
  h.run(`emu.ram[${Z.playerX}]=148;emu.ram[${Z.playerY}]=160;emu.ram[${Z.velocityY}]=0;emu.ram[${Z.grounded}]=1`);
  await R('input.set', {buttons: {down: true}}); await R('emulator.frames', {count: 1});
  assert.equal(v()[2], 1, 'Down at the top end enters the stair');
  await R('emulator.frames', {count: 60}); await R('input.set', {buttons: {down: false}}); await R('emulator.frames', {count: 5});
  assert.deepEqual(v(), [100, 208, 0], 'back at the foot');
});
check('Stairs that leave their screen are refused', async () => {
  const p = withStair(); p.worlds[0].stairs[0].x = 230;
  await R('project.load', {json: JSON.stringify(p)});
  await assert.rejects(R('build.check'), /must stay within one screen/);
});

(async () => {
  for (const [name, fn] of checks) { try { await fn(); report.checks.push({name, passed: true}); } catch (e) { report.checks.push({name, passed: false, error: String(e.message).slice(0, 500)}); } }
  report.passed = report.checks.every(c => c.passed);
  for (const c of report.checks) console.log((c.passed ? 'PASS ' : 'FAIL ') + c.name + (c.error ? ': ' + c.error : ''));
  if (output) fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  process.exitCode = report.passed ? 0 : 1;
})();
