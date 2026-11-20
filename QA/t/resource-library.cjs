'use strict';
// Resource library (repository inputs only, headless: the in-memory backend; IndexedDB persistence is covered by
// QA/library-persistence.cjs in a real browser). A synthetic pack with data the intake does not recognise:
// every file becomes a visible entry; registering again changes nothing; stated evidence and previews are kept;
// notes stay apart from evidence; data reads back exactly; integrity holds; export/discard/import restores it;
// library commands never touch the working project.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const {loadForge} = require('./u/harness.cjs');
const root = path.resolve(__dirname, '../..'), editor = path.resolve(process.argv[2] || path.join(root, 'NES_Forge.html')), output = process.argv[3];
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const report = {editorSha256: sha(fs.readFileSync(editor)), checks: []};
const h = loadForge(editor);
for (const k of ['DecompressionStream', 'CompressionStream', 'Blob', 'Response', 'ReadableStream', 'TextDecoder', 'TextEncoder', 'atob', 'btoa']) if (!h.context[k]) h.context[k] = globalThis[k];
if (!h.context.crypto || !h.context.crypto.subtle) h.context.crypto = crypto.webcrypto;
h.context.setTimeout = (fn, ms, ...a) => setTimeout(fn, 0, ...a);
const R = async (name, a) => { h.context.__a = a === undefined ? null : a; const r = JSON.parse(JSON.stringify(await h.run(`Forge.commands.run(${JSON.stringify(name)},__a)`, 600000))); if (!r.ok) throw Error(name + ': ' + r.error.message); return r.result; };
const J = c => JSON.parse(JSON.stringify(h.run(c)));
const checks = [], check = (name, fn) => checks.push([name, fn]);
const files = [['Mystery/stages_art/screen_1.json', JSON.stringify({bank16KiB: 3, cpu: 0x9abc, fileOffset: 0xdacc, tiles: [1, 2, 3]})],
  ['Mystery/stages_art/screen_1.png', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')],
  ['Mystery/stages_art/screen_2.json', JSON.stringify({bank16KiB: 3, cpu: 0x9abc, fileOffset: 0xdacc, tiles: [1, 2, 3]})],
  ['Mystery/raw/blob.bin', Buffer.from(Array.from({length: 300}, (_, i) => i * 7 & 255))], ['Mystery/readme.txt', 'found while exploring']];
let pack = null, packSha = null, ids = {};
check('Every file of a pack the intake does not recognise is a visible entry', async () => {
  h.context.__files = files.map(([name, data]) => ({name, data: typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data)}));
  pack = new Uint8Array(await h.run('(async()=>new Uint8Array(await buildZip(__files).arrayBuffer()))()', 60000));
  const before = J('Forge.services.ProjectStore.serialize()');
  const r = await R('library.register', {bytes: pack, name: 'mystery.zip'}); packSha = r.packSha256;
  assert.equal(r.stats.entries, files.length); assert.equal(r.stats.blobsShared, 1, 'the two identical JSON files share one blob');
  const l = await R('library.list', {pack: packSha}); assert.equal(l.total, files.length);
  for (const i of l.items) ids[i.path.split('/').pop()] = i;
  assert.deepEqual(Object.fromEntries(Object.entries(l.counts).sort()), {image: 1, text: 1, unknown: 3});
  assert.equal(J('Forge.services.ProjectStore.serialize()'), before, 'the working project is untouched');
});
check('Registering again changes nothing', async () => {
  const r = await R('library.register', {bytes: pack, name: 'renamed.zip'}); assert.equal(r.already, true);
  assert.equal((await R('library.status')).entries, files.length);
});
check('Unknown data keeps its stated evidence, preview and exact bytes', async () => {
  const ins = await R('library.inspect', {id: ids['screen_1.json'].id});
  assert.equal(ins.entry.evidence.state, 'stated'); assert.equal(ins.entry.evidence.fields.fileOffset.first, 0xdacc); assert.ok(ins.entry.preview);
  const raw = await R('library.read', {id: ids['blob.bin'].id}); assert.equal(Buffer.from(raw.base64, 'base64').toString('hex'), files[3][1].toString('hex'));
  const pv = await R('library.preview', {id: ids['screen_1.json'].id}); assert.match(pv.preview, /^data:image\/png;base64,iVBOR/);
});
check('Notes stay apart from evidence', async () => {
  const before = (await R('library.inspect', {id: ids['screen_1.json'].id})).entry;
  await R('library.annotate', {id: ids['screen_1.json'].id, notes: {name: 'Title?', possiblePlacements: [{stage: 'Title', confidence: 'high'}]}});
  const after = await R('library.inspect', {id: ids['screen_1.json'].id});
  assert.deepEqual(after.entry, before); assert.equal(after.notes.name, 'Title?'); assert.equal(after.notes.source, 'developer');
  await assert.rejects(R('library.annotate', {id: ids['screen_1.json'].id, notes: {evidence: 'verified'}}), /unknown note field/);
});
check('Integrity, then export, discard and import restore the shelf', async () => {
  assert.equal((await R('library.verify')).ok, true);
  const shelf = ids['screen_1.json'].shelf, ex = await R('library.export', {shelf});
  const d = await R('library.discard', {packSha256: packSha}); assert.equal(d.entriesRemoved, files.length);
  assert.equal((await R('library.list', {pack: packSha})).total, 0);
  const imp = await R('library.import', {bytes: new Uint8Array(Buffer.from(ex.base64, 'base64'))}); assert.equal(imp.entriesAdded, files.length);
  assert.equal((await R('library.list', {pack: packSha})).total, files.length); assert.equal((await R('library.verify')).ok, true);
  assert.equal((await R('library.inspect', {id: ids['screen_1.json'].id})).notes.name, 'Title?');
});
(async () => {
  for (const [name, fn] of checks) { try { await fn(); report.checks.push({name, passed: true}); } catch (e) { report.checks.push({name, passed: false, error: String(e.message).slice(0, 500)}); } }
  report.passed = report.checks.every(c => c.passed);
  for (const c of report.checks) console.log((c.passed ? 'PASS ' : 'FAIL ') + c.name + (c.error ? ': ' + c.error : ''));
  if (output) fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  process.exitCode = report.passed ? 0 : 1;
})();
