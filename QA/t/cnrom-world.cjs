'use strict';
// Larger cartridge profile, step 1 (CNROM): worlds whose background graphics do not fit one 256-tile bank build with
// one 8 KB CHR bank per world group on mapper 3; projects that fit stay NROM byte-for-byte. Repository inputs only.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const {loadForge} = require('./u/harness.cjs');
const root = path.resolve(__dirname, '../..'), editor = path.resolve(process.argv[2] || path.join(root, 'NES_Forge.html')), output = process.argv[3];
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const report = {editorSha256: sha(fs.readFileSync(editor)), checks: []};
const h = loadForge(editor);
for (const k of ['DecompressionStream', 'Blob', 'Response', 'ReadableStream', 'TextDecoder', 'TextEncoder', 'atob', 'btoa']) if (!h.context[k]) h.context[k] = globalThis[k];
if (!h.context.crypto || !h.context.crypto.subtle) h.context.crypto = crypto.webcrypto;
h.context.setTimeout = (fn, ms, ...a) => setTimeout(fn, 0, ...a);
const R = async (name, args) => { h.context.__a = args === undefined ? null : args;
  const r = JSON.parse(JSON.stringify(await h.run(`Forge.commands.run(${JSON.stringify(name)},__a)`, 600000)));
  if (!r.ok) throw Error(name + ': ' + r.error.message); return r.result; };
const checks = [];
const check = (name, fn) => checks.push([name, fn]);
const example = JSON.parse(fs.readFileSync(path.join(root, 'Examples/TwoStages.nesforge.json'), 'utf8'));

// Distinct, low-entropy tiles (the embedded project source must still fit in PRG): bit b of the key sets the pixels
// whose (y*8+x) % 10 == b.
const patterned = key => Array.from({length: 8}, (_, y) => Array.from({length: 8}, (_, x) => ((key >> ((y * 8 + x) % 10)) & 1) * (1 + (x & 1))));
// Worlds 0 and 1 get their own tileset Scenes of 240 distinct tiles (60 metatiles x 4); world 2 reuses world 0's
// Scene. Worlds 0+1 cannot share a 256-tile bank, world 2 shares world 0's: two banks. (Each distinct tileset adds
// several KB to the embedded authoring source, which must still fit the 32 KB PRG.)
let seed = 7; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed >> 8; };
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
const rom = b64 => new Uint8Array(Buffer.from(b64, 'base64'));
let cnrom = null, symbols = null, plan = null;

check('A project whose worlds fit one bank still builds NROM (mapper 0, 8 KB CHR)', async () => {
  await R('project.load', {json: JSON.stringify(example)});
  const b = rom((await R('build.rom')).base64);
  assert.equal(b[6] >> 4, 0); assert.equal(b[5], 1); assert.equal(b.length, 16 + 32768 + 8192);
});
check('Worlds that need more than 256 background tiles build CNROM with one CHR bank per world group', async () => {
  await R('project.load', {json: JSON.stringify(bigWorlds())});
  const built = await R('build.rom'); cnrom = rom(built.base64);
  assert.equal(cnrom[6] >> 4, 3, 'mapper 3'); assert.ok(cnrom[5] >= 2, 'at least the two graphics banks'); assert.equal(cnrom.length, 16 + 32768 + cnrom[5] * 8192);
  assert.ok(built.diagnostics.some(d => /CNROM profile: 2 CHR banks/.test(d.message)), JSON.stringify(built.diagnostics.map(d => d.message)));
  // this project's authoring source does not fit the 32 KB PRG beside the engine: it is stored in CHR data banks
  assert.ok(built.diagnostics.some(d => /stored in \d+ CHR data bank/.test(d.message)), 'record placement reported');
  const chr = cnrom.subarray(16 + 32768);
  for (let bank = 1; bank < 2; bank++) assert.deepEqual(chr.subarray(bank * 8192 + 4096, bank * 8192 + 8192), chr.subarray(4096, 8192), 'sprite half repeated in bank ' + bank);
  symbols = JSON.parse(JSON.stringify(h.run('(()=>{const a=Forge.services.RuntimeCompiler.compile();return a.world.symbols;})()')));
  plan = JSON.parse(JSON.stringify(h.run('(()=>{const p=Forge.services.WorldCompiler.plan(Forge.services.ProjectStore.capture());return {banks:p.spec.worldChrBank,starts:p.spec.worlds.map(w=>w.screenStart)};})()')));
  assert.deepEqual(plan.banks, [0, 1, 0]);
});
check('The CNROM World ROM reopens as the editable project and rebuilds identically', async () => {
  h.context.__rom = cnrom;
  const info = JSON.parse(JSON.stringify(h.run('(()=>{const i=Forge.services.WorldRom.inspect(__rom);return {mapper:i.header.mapper,graphics:i.header.graphicsChrSize,layout:i.summary.layout,editable:i.summary.editableProject};})()')));
  assert.deepEqual(info, {mapper: 3, graphics: 2 * 8192, layout: 5, editable: true});
  const source = JSON.parse(JSON.stringify(h.run('Forge.services.WorldRom.inspect(__rom).source')));
  await R('project.load', {json: JSON.stringify(source)});
  assert.equal(sha(rom((await R('build.rom')).base64)), sha(cnrom));
});
check('Emulator: the start world shows bank 0; moving to another world switches to its bank and draws its tiles', async () => {
  await R('emulator.load', {bytes: cnrom, name: 'cnrom.nes'});
  await R('emulator.frames', {count: 30});
  assert.equal(h.run('emu.chrBank0'), 0);
  for (const world of [1, 2]) {
    h.run(`emu.ram[${symbols.screen}]=${plan.starts[world]};emu.ram[${symbols.renderedScreen}]=255`);
    await R('emulator.frames', {count: 10});
    assert.equal(h.run('emu.chrBank0'), plan.banks[world] * 8192, 'world ' + world + ' bank');
    assert.equal(h.run(`emu.ram[${symbols.worldIndex}]`), world);
  }
  // the screen really draws: some background pixel differs from the backdrop
  const shot = Buffer.from((await R('emulator.screen')).base64, 'base64');
  let colors = new Set(); for (let i = 0; i < shot.length; i += 4) colors.add(shot[i] << 16 | shot[i + 1] << 8 | shot[i + 2]);
  assert.ok(colors.size > 2, 'expected drawn background tiles');
});
check('A project that fits stays layout 4 with the record in PRG; a layout 5 ROM keeps the game data identical', async () => {
  await R('project.load', {json: JSON.stringify(example)});
  const small = rom((await R('build.rom')).base64);
  h.context.__rom = small; assert.equal(h.run('Forge.services.WorldRom.inspect(__rom).summary.layout'), 4);
});
check('A single world over 256 background tiles is refused with its bank named', async () => {
  const p = bigWorlds(), sc = p.scenes.find(s => s.id === p.worlds[0].tilesetSceneId);
  sc.metatiles = Array.from({length: 70}, (_, m) => ({...sc.metatiles[0], id: m, tiles: [(m * 4) % 256, (m * 4 + 1) % 256, (m * 4 + 2) % 256, (m * 4 + 3) % 256]}));
  sc.chr = Array.from({length: 256}, (_, t) => patterned(300 + t));
  p.worlds[0].map = p.worlds[0].map.map((id, cell) => cell % 70);
  await R('project.load', {json: JSON.stringify(p)});
  await assert.rejects(R('build.check'), /CHR bank 0\) exceeds the 256-tile bank/);
});

(async () => {
  for (const [name, fn] of checks) { try { await fn(); report.checks.push({name, passed: true}); } catch (e) { report.checks.push({name, passed: false, error: String(e.message).slice(0, 600)}); } }
  report.passed = report.checks.every(c => c.passed);
  for (const c of report.checks) console.log((c.passed ? 'PASS ' : 'FAIL ') + c.name + (c.error ? ': ' + c.error : ''));
  if (output) fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  process.exitCode = report.passed ? 0 : 1;
})();
