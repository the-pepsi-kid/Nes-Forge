'use strict';
// Forge.commands (UI-agnostic command core) on repository inputs only: schema and argument checking,
// project load/replace/save through ProjectStore, editability levels, build check vs build ROM,
// emulator + input path shared by every adapter, events, and the command-line adapter.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const {loadForge} = require('./u/harness.cjs');
const root = path.resolve(__dirname, '../..'), editor = path.resolve(process.argv[2] || path.join(root, 'NES_Forge.html')), output = process.argv[3];
const report = {editorSha256: crypto.createHash('sha256').update(fs.readFileSync(editor)).digest('hex'), checks: []};
const h = loadForge(editor);
for (const k of ['DecompressionStream', 'Blob', 'Response', 'ReadableStream', 'TextDecoder', 'TextEncoder', 'atob', 'btoa']) if (!h.context[k]) h.context[k] = globalThis[k];
if (!h.context.crypto || !h.context.crypto.subtle) h.context.crypto = crypto.webcrypto;
const R = async (name, args) => { h.context.__a = args === undefined ? null : args; return JSON.parse(JSON.stringify(await h.run(`Forge.commands.run(${JSON.stringify(name)},__a)`, 600000))); };
const checks = [];
const check = (name, fn) => checks.push([name, fn]);
const example = fs.readFileSync(path.join(root, 'Examples/TwoStages.nesforge.json'), 'utf8');

check('Command list publishes schemas for every group', async () => {
  const r = await R('commands.list'); assert.ok(r.ok);
  const names = r.result.map(c => c.name);
  for (const n of ['project.load', 'project.replace', 'resources.list', 'resources.inspect', 'build.check', 'build.rom', 'build.changes', 'writer.prepare', 'emulator.frames', 'input.set', 'pack.open'])
    assert.ok(names.includes(n), 'missing ' + n);
  const d = (await R('commands.describe', {name: 'resources.list'})).result;
  assert.equal(d.args.level.enum.join(','), 'build,native,copy,reference,unknown');
});
check('Arguments are checked before anything runs', async () => {
  const unknown = await R('resources.list', {nope: 1}); assert.equal(unknown.ok, false); assert.match(unknown.error.message, /Unknown argument "nope"/);
  const missing = await R('project.load', {}); assert.equal(missing.ok, false); assert.match(missing.error.message, /Missing argument "json"/);
  const missingCmd = await R('no.such'); assert.equal(missingCmd.ok, false);
});
check('Project load, info and save go through ProjectStore', async () => {
  assert.ok((await R('project.load', {json: example})).ok);
  const info = (await R('project.info')).result;
  assert.equal(info.kind, 'author'); assert.equal(info.counts.worlds, 3);
  const saved = JSON.parse((await R('project.save')).result.json);
  assert.equal(saved.projectName, info.name);
});
check('Authored project: every resource is build or reference level', async () => {
  const l = (await R('resources.list', {limit: 5000})).result;
  assert.ok(l.total > 50);
  assert.deepEqual(Object.keys(l.counts).filter(k => !['build', 'reference'].includes(k)), []);
  const scene = l.items.find(i => i.type === 'scene');
  const detail = (await R('resources.inspect', {key: scene.key})).result;
  assert.equal(detail.key, scene.key); assert.ok(Array.isArray(detail.usedBy));
});
check('Build check and build ROM agree; no native ownership on authored projects', async () => {
  const c = (await R('build.check')).result, b = (await R('build.rom')).result;
  assert.equal(c.sha256, b.sha256); assert.equal(c.bytes, b.bytes);
  const rom = Buffer.from(b.base64, 'base64');
  assert.equal(crypto.createHash('sha256').update(rom).digest('hex'), b.sha256);
  assert.equal(rom.subarray(0, 4).toString('latin1'), 'NES\x1a');
  assert.equal((await R('writer.list')).result.ownership, null);
});
check('Scripted edit is one committed change and is reported by build.changes', async () => {
  const p = JSON.parse((await R('project.save')).result.json);
  p.scenes[0].name = 'Renamed by command test';
  assert.ok((await R('project.replace', {json: JSON.stringify(p), intent: 'test'})).ok);
  const ch = (await R('build.changes')).result.changes;
  assert.ok(ch.some(c => c.type === 'scene' && c.id === p.scenes[0].id && c.change === 'edited'), JSON.stringify(ch));
  assert.ok((await R('build.check')).ok);
  assert.deepEqual((await R('build.changes')).result.changes, [], 'a passing check becomes the new buildable state');
});
check('Emulator and input: the same button path moves the player', async () => {
  const run = async right => {
    await R('project.load', {json: example}); assert.ok((await R('emulator.loadBuilt')).ok);
    await R('emulator.frames', {count: 120});
    await R('input.set', {buttons: {right}});
    await R('emulator.frames', {count: 60});
    await R('input.set', {buttons: {right: false}});
    return Buffer.from((await R('emulator.screen')).result.base64, 'base64');
  };
  const still = await run(false), moved = await run(true);
  let differ = 0; for (let i = 0; i < still.length; i += 4) if (still[i] !== moved[i] || still[i + 1] !== moved[i + 1] || still[i + 2] !== moved[i + 2]) differ++;
  assert.ok(differ > 20, 'holding Right changed ' + differ + ' pixels');
});
check('Events reach subscribers from every adapter', async () => {
  h.run('globalThis.__events=[];globalThis.__off=Forge.commands.subscribe(e=>__events.push(e))');
  h.run("Forge.commands.registerAdapter({id:'qa-touch',kind:'touch',title:'QA touch'})");
  await h.run("Forge.commands.run('project.info',null,{adapter:'qa-touch'})");
  const events = JSON.parse(JSON.stringify(h.run('__events')));h.run('__off()');
  assert.ok(events.some(e => e.type === 'command' && e.name === 'project.info' && e.adapter === 'qa-touch' && e.ok));
  assert.ok(JSON.parse(JSON.stringify(h.run('Forge.commands.adapters()'))).some(a => a.id === 'qa-touch' && a.kind === 'touch'));
});
check('Command line adapter runs the same commands', async () => {
  const out = execFileSync(process.execPath, [path.join(root, 'tools/forge-cli.cjs'), '--forge', editor, 'run', 'project.load',
    JSON.stringify({json: '@text:' + path.join(root, 'Examples/TwoStages.nesforge.json')}), 'build.check'], {encoding: 'utf8'});
  const lines = out.trim().split('\n').map(l => JSON.parse(l));
  assert.equal(lines.length, 2); assert.ok(lines.every(l => l.ok));
  assert.equal(lines[1].result.sha256.length, 64);
});

(async () => {
  for (const [name, fn] of checks) { try { await fn(); report.checks.push({name, passed: true}); } catch (e) { report.checks.push({name, passed: false, error: String(e.message).slice(0, 500)}); } }
  report.passed = report.checks.every(c => c.passed);
  for (const c of report.checks) console.log((c.passed ? 'PASS ' : 'FAIL ') + c.name + (c.error ? ': ' + c.error : ''));
  if (output) fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  process.exitCode = report.passed ? 0 : 1;
})();
