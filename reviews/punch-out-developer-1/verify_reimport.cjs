'use strict';
// Supplied-input regression for the owner workflow: source -> edit -> native
// build -> re-import -> further edit -> save/reopen. No ROM bytes are reported.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const assert = require('assert/strict');
const {loadForge} = require('../../app/tests/harness.cjs');
const arena = require('../../app/src/re/punch-out-arena.js');
const commands = require('../../app/src/re/punch-out-layout.js');
const encoder = require('../../app/src/re/punch-out-arena-encoder.js');
const root = path.resolve(__dirname, '../..');
const html = path.join(root, 'app/mainline/NES_Forge_2.0.0-alpha.11.html');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const copy = value => JSON.parse(JSON.stringify(value));
const fresh = () => loadForge(html, {environment: {crypto: crypto.webcrypto, setTimeout, clearTimeout}});
const results = [];
const frozen = sha(fs.readFileSync(html));
(async () => {
  const dir = path.resolve(process.argv[2]);
  const names = fs.readdirSync(dir).filter(n => n.includes("Mike Tyson's Punch-Out"));
  assert.equal(names.length, 2, 'Both supplied US revisions are required');
  for (const name of names) {
    const source = new Uint8Array(fs.readFileSync(path.join(dir, name)));
    const identity = sha(source);
    const h = fresh(), s = h.context.Forge.services;
    const p = await s.InvestigationProject.create(source, name);
    const id = s.PunchOutArenaRecovery.sceneId;
    const scene = p.scenes.find(v => v.id === id);
    scene.nt[0] = (scene.nt[0] + 1) % 253;
    scene.attr[0] ^= 1;
    // Compose a preceding literal recipe with the independent arena writer.
    const info = s.NativeResourceProject.validate(p), layout = info.catalog.layouts[0];
    const cell = layout.writable.findIndex(Boolean);
    const binding = p.scenes.find(sc => s.NativeResourceProject.requiredScene(p, sc.id));
    Object.assign(p, s.NativeResourceProject.paint(p, binding.id, {
      cell, block: (layout.cells[cell] + 1) % 250
    }));
    const built = s.NativeResourceProject.build(p).rom;
    assert(s.NativeResourceProject.recognizes(built));
    assert.equal(commands.arenaPrograms(built).length, 2048);
    // These negative cases mutate only masked arena bytes; a masked hash alone
    // must not admit invalid pointers, Y wrap, or incomplete native page output.
    const invalidPointer = built.slice();
    invalidPointer[0x1918b] = 0; invalidPointer[0x1918c] = 0x80;
    assert.equal(s.NativeResourceProject.recognizes(invalidPointer), null);
    const unterminated = built.slice();
    unterminated.fill(0x90, 0x191a0, 0x191a0 + 381);
    assert.equal(s.NativeResourceProject.recognizes(unterminated), null);
    const incomplete = built.slice();
    const pointer = incomplete[0x1918b] | incomplete[0x1918c] << 8;
    incomplete[0x18010 + pointer - 0x8000] = 0;
    assert.equal(s.NativeResourceProject.recognizes(incomplete), null);
    for (const at of [0, 0x10010, 0x1c890, 0x20010]) {
      const changed = built.slice(); changed[at] ^= 1;
      assert.equal(s.NativeResourceProject.recognizes(changed), null, 'Protected byte ' + at);
    }
    const h2 = fresh(), t = h2.context.Forge.services;
    // Exercise the actual shared gateway, not only the direct adapter creator.
    assert(await t.ProjectGatewayUI.openFile({name: 'Arena derivative.nes', size: built.length, arrayBuffer: async () => built.slice().buffer}));
    assert(t.ProjectGatewayUI.report().actions.some(a => a.id === 'rom-project'));
    await t.ProjectGatewayUI.route('rom-project');
    assert(t.InvestigationUI.importProject());
    await t.InvestigationUI.whenReady();
    const imported = t.ProjectStore.capture();
    assert.equal(imported.nativeGame.adapter, p.nativeGame.adapter);
    const reScene = imported.scenes.find(v => v.id === id);
    assert.deepEqual(copy(reScene.nt), copy(scene.nt));
    assert.deepEqual(copy(reScene.attr), copy(scene.attr));
    assert.equal(sha(t.NativeResourceProject.build(imported).rom), sha(built));
    assert.match(h2.get('nativeAudioStatus').textContent, /Decoded 84/);
    assert.equal(imported.metasprites.length, p.metasprites.length);
    // Further edits still use the derivative as the sole preserved source.
    reScene.nt[9] = (reScene.nt[9] + 1) % 253;
    const second = t.NativeResourceProject.build(imported).rom;
    assert(t.NativeResourceProject.recognizes(second));
    assert.deepEqual(arena.open(second).nt, copy(reScene.nt));
    t.ProjectStore.load(imported, {sync: true});
    const serialized = t.ProjectStore.serialize();
    const h3 = fresh(), u = h3.context.Forge.services;
    u.ProjectStore.load(serialized, {sync: true});
    await u.InvestigationUI.whenReady();
    assert.equal(sha(u.NativeResourceProject.build(u.ProjectStore.capture()).rom), sha(second));
    assert.match(h3.get('nativeAudioStatus').textContent, /Decoded 84/);
    assert.equal(sha(source), identity);
    assert.deepEqual(h.errors, []); assert.deepEqual(h2.errors, []); assert.deepEqual(h3.errors, []);
    assert.deepEqual(copy(info.adapter.derivativeIdentity.spans), copy(encoder.spans));
    results.push({revision: name, passed: true, sharedGatewayReimport: true,
      combinedRecipeAndArenaEdits: true, furtherEditBuild: true, saveReopen: true,
      unchangedDerivativeOutput: true, audioEntries: 84, fighterSamplesRetained: true,
      malformedArenaCasesRejected: 3, protectedByteCasesRejected: 4});
    console.log(name + ': derivative workflow and negative cases passed');
  }
  assert.equal(sha(fs.readFileSync(html)), frozen);
  const report = {status: 'passed', htmlSha256: frozen,
    scope: 'Both supplied revisions; bounded arena derivative identity, shared Open ROM gateway, further editing, native output, saved projects and Audio restoration. Browser listening and complete fight coverage are separate.', results};
  fs.writeFileSync(path.join(__dirname, 'Reimport_Verification.json'), JSON.stringify(report, null, 2) + '\n');
})().catch(error => {console.error(error.stack); process.exitCode = 1;});
