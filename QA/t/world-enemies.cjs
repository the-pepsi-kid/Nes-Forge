'use strict';
// World Runtime enemies (repository inputs only): a Ground Patrol Enemy drawn from a metasprite patrols, faces its
// walking direction, is defeated by the player's attack (playerAttackHit -> despawn), and contact damage that empties
// the player's health restarts the player at the spawn. Enemies can walk with an animation and fire at the player.
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
const J = c => JSON.parse(JSON.stringify(h.run(c)));
const checks = [], check = (name, fn) => checks.push([name, fn]);
const example = JSON.parse(fs.readFileSync(path.join(root, 'Examples/TwoStages.nesforge.json'), 'utf8'));

function withEnemy({minX = 120, maxX = 200} = {}) {
  const p = structuredClone(example), scene = p.worldRuntime.playerSceneId;
  // a two-piece enemy metasprite (tiles 0 and 1 of the player scene's sprite tiles), feet origin
  p.metasprites.push({id: 'qa-enemy', name: 'QA enemy', sceneId: scene, spriteMode: 8, originX: 0, originY: 0,
    pieces: [{id: 'a', tile: 0, tile2: 1, x: -8, y: -8, pal: 0, flipH: false, flipV: false, behind: false},
      {id: 'b', tile: 0, tile2: 1, x: 0, y: -8, pal: 0, flipH: false, flipV: false, behind: false}]});
  h.context.__scene = scene;
  const player = J(`Forge.services.GameplayModel.template('Sideview Player',{idPrefix:'qa-player',sourceSceneId:__scene,placement:{kind:'scene',sceneId:__scene}})`);
  const enemy = J(`Forge.services.GameplayModel.template('Ground Patrol Enemy',{idPrefix:'qa-enemy',sourceSceneId:__scene,placement:{kind:'world',worldId:'st1'},x:150,y:208})`);
  const render = enemy.actorDefinitions[0].components.find(c => c.type === 'Render');
  render.values = {...render.values, metaspriteId: 'qa-enemy', palette: 0};
  enemy.actorDefinitions[0].parameters.find(q => q.id === 'minX').default = minX;
  enemy.actorDefinitions[0].parameters.find(q => q.id === 'maxX').default = maxX;
  enemy.behaviors[0].transitions = [{id: 'qa-enemy-hit', fromStateId: 'patrol', toStateId: 'dead', priority: 10,
    conditions: [{type: 'playerAttackHit', reach: 32, height: 32}], actions: [{type: 'despawn'}]}];
  const merge = (...parts) => Object.fromEntries(['actorDefinitions', 'behaviors', 'actorInstances', 'persistentVariables'].map(k => [k, parts.flatMap(x => x[k])]));
  p.gameplayCore = {enabled: true, ...merge(player, enemy)};
  return p;
}
let Z = null, A = null, rom = null;
check('An enemy with a metasprite builds; projects without one are unchanged', async () => {
  await R('project.load', {json: JSON.stringify(withEnemy())});
  const built = await R('build.rom'); rom = Buffer.from(built.base64, 'base64');
  const sym = J('Forge.services.RuntimeCompiler.compile().world.symbols'); Z = sym; A = sym.gameplay.arrays;
  assert.ok(A && Number.isInteger(A.x), 'actor arrays');
});
check('Emulator: the enemy patrols with two pieces and mirrors when it walks left', async () => {
  await R('emulator.load', {bytes: rom, name: 'enemy.nes'}); await R('emulator.frames', {count: 20});
  const slot = 1, x = () => J(`emu.ram[${A.x + slot}]`), dir = () => J(`emu.ram[${A.direction + slot}]`);
  const x0 = x(); await R('emulator.frames', {count: 20}); assert.notEqual(x(), x0, 'moves');
  // count sprites at the enemy's row near its x
  const near = () => { const oam = J('[...emu.oamMem]'), ex = x(), out = []; for (let i = 0; i < 64; i++) { const [yy, t, a, xx] = oam.slice(i * 4, i * 4 + 4); if (yy < 239 && Math.abs(xx - ex) <= 9 && yy >= 190 && yy <= 205) out.push({xx, a}); } return out; };
  const seen = new Set();
  for (let f = 0; f < 200; f++) { await R('emulator.frames', {count: 2}); const n = near(); if (n.length >= 2) seen.add(dir() + ':' + (n.some(s => s.a & 0x40) ? 'flip' : 'plain')); if (seen.size >= 2) break; }
  assert.ok(seen.has('0:plain') && [...seen].some(k => k.startsWith('1') || k.startsWith('255')), 'saw both directions: ' + [...seen].join(' '));
  assert.ok([...seen].some(k => /^(1|255):flip$/.test(k)), 'mirrored when walking left: ' + [...seen].join(' '));
});
check('Emulator: the player\'s attack in front of the enemy despawns it', async () => {
  const slot = 1, active = () => J(`emu.ram[${A.active + slot}]`);
  assert.equal(active(), 1);
  // stand just left of the enemy, facing right, and attack (B)
  for (let f = 0; f < 120 && active(); f += 2) {
    const ex = J(`emu.ram[${A.x + slot}]`);
    h.run(`emu.ram[${Z.playerX}]=${Math.max(8, ex - 16)};emu.ram[${Z.playerY}]=208;emu.ram[${Z.playerFacing}]=0`);
    await R('input.set', {buttons: {b: true}}); await R('emulator.frames', {count: 1}); await R('input.set', {buttons: {b: false}}); await R('emulator.frames', {count: 1});
  }
  assert.equal(active(), 0, 'defeated');
});
check('Emulator: contact damage that empties the player\'s health restarts at the spawn', async () => {
  await R('emulator.load', {bytes: rom, name: 'enemy.nes'}); await R('emulator.frames', {count: 20});
  const spawn = [J(`emu.ram[${Z.playerX}]`), J(`emu.ram[${Z.playerY}]`)], health = () => J(`emu.ram[${A.health}]`);
  const h0 = health(); assert.ok(h0 > 0, 'player health');
  let restarted = false;
  for (let f = 0; f < 600 && !restarted; f += 2) {
    const ex = J(`emu.ram[${A.x + 1}]`); h.run(`emu.ram[${Z.playerX}]=${ex};emu.ram[${Z.playerY}]=208`);
    await R('emulator.frames', {count: 2});
    if (health() === h0 && J(`emu.ram[${Z.playerX}]`) === spawn[0] && f > 40) restarted = true;
  }
  assert.ok(restarted, 'back at the spawn with full health');
});

check('Emulator: an enemy with a walk animation changes frames on screen', async () => {
  const p = withEnemy(); const r = p.gameplayCore.actorDefinitions.find(d => d.name === 'Ground Patrol Enemy').components.find(c => c.type === 'Render');
  r.values = {...r.values, metaspriteId: '', animationId: 'awalk'};
  await R('project.load', {json: JSON.stringify(p)});
  const sym = J('Forge.services.RuntimeCompiler.compile().world.symbols'), arr = sym.gameplay.arrays, rom2 = Buffer.from((await R('build.rom')).base64, 'base64');
  await R('emulator.load', {bytes: rom2, name: 'anim.nes'}); await R('emulator.frames', {count: 20});
  const tiles = new Set();
  for (let f = 0; f < 40; f++) { await R('emulator.frames', {count: 1}); const oam = J('[...emu.oamMem]'), ex = J(`emu.ram[${arr.x + 1}]`);
    for (let i = 0; i < 64; i++) { const [y, t, a, x] = oam.slice(i * 4, i * 4 + 4); if (y < 239 && Math.abs(x - ex) <= 12 && y >= 180 && y <= 215) tiles.add(t); } }
  assert.ok(tiles.size >= 2, 'tiles seen at the enemy: ' + [...tiles].join(','));
});
check('Emulator: a firing enemy shoots toward the player and a hit costs health', async () => {
  const p = withEnemy({minX: 150, maxX: 210});
  const beh = p.gameplayCore.behaviors.find(b => b.name === 'Ground Patrol Behavior');
  beh.states.find(st => st.id === 'patrol').onTick.push({type: 'fireProjectile', interval: 30, speed: 2, tile: 0, palette: 0, offsetY: -4});
  await R('project.load', {json: JSON.stringify(p)});
  const sym = J('Forge.services.RuntimeCompiler.compile().world.symbols'), arr = sym.gameplay.arrays, rom3 = Buffer.from((await R('build.rom')).base64, 'base64');
  await R('emulator.load', {bytes: rom3, name: 'fire.nes'}); await R('emulator.frames', {count: 10});
  // keep the player at x 40 on the floor, left of the patrol (150-210) and out of contact range; the bullet must come left
  const hold = () => h.run(`emu.ram[${sym.playerX}]=40;emu.ram[${sym.playerY}]=208`);
  const health0 = J(`emu.ram[${arr.health}]`); let firstX = null, laterX = null;
  for (let f = 0; f < 120 && laterX === null; f++) { hold(); await R('emulator.frames', {count: 1});
    const active = J('[0,1,2,3].map(i=>emu.ram[0x06C0+i])'), xs = J('[0,1,2,3].map(i=>emu.ram[0x06C4+i])'), i = active.indexOf(1);
    if (i >= 0 && firstX === null) firstX = xs[i]; else if (i >= 0 && firstX !== null && Math.abs(xs[i] - firstX) >= 20) laterX = xs[i]; }
  assert.ok(firstX !== null, 'a bullet was fired'); assert.ok(laterX !== null && laterX < firstX, 'it travels toward the player (' + firstX + ' -> ' + laterX + ')');
  let hit = false; for (let f = 0; f < 200 && !hit; f++) { hold(); await R('emulator.frames', {count: 1}); if (J(`emu.ram[${arr.health}]`) < health0) hit = true; }
  assert.ok(hit, 'a bullet hit cost health');
});

(async () => {
  for (const [name, fn] of checks) { try { await fn(); report.checks.push({name, passed: true}); } catch (e) { report.checks.push({name, passed: false, error: String(e.message).slice(0, 500)}); } }
  report.passed = report.checks.every(c => c.passed);
  for (const c of report.checks) console.log((c.passed ? 'PASS ' : 'FAIL ') + c.name + (c.error ? ': ' + c.error : ''));
  if (output) fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  process.exitCode = report.passed ? 0 : 1;
})();
