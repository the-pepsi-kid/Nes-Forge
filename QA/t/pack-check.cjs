'use strict';
// tools/check_extraction_pack.cjs on synthetic packs (no commercial data): a valid pack passes, a project
// entity without an id fails with the editor's own message, and an over-limit archive names the limit.
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const {loadForge} = require('./u/harness.cjs');
const root = path.resolve(__dirname, '../..'), editor = path.resolve(process.argv[2] || path.join(root, 'NES_Forge.html')), output = process.argv[3];
const checker = path.join(root, 'tools/check_extraction_pack.cjs');
const report = {editorSha256: crypto.createHash('sha256').update(fs.readFileSync(editor)).digest('hex'), checks: []};

const crcTable = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = b => { let c = 0xFFFFFFFF; for (const x of b) c = crcTable[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function storedZip(files) {
  const locals = [], central = []; let offset = 0;
  for (const [name, data] of files) {
    const n = Buffer.from(name), d = Buffer.from(data), c = crc32(d);
    const l = Buffer.alloc(30); l.writeUInt32LE(0x04034B50, 0); l.writeUInt16LE(20, 4); l.writeUInt32LE(c, 14); l.writeUInt32LE(d.length, 18); l.writeUInt32LE(d.length, 22); l.writeUInt16LE(n.length, 26);
    const h = Buffer.alloc(46); h.writeUInt32LE(0x02014B50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(20, 6); h.writeUInt32LE(c, 16); h.writeUInt32LE(d.length, 20); h.writeUInt32LE(d.length, 24); h.writeUInt16LE(n.length, 28); h.writeUInt32LE(offset, 42);
    locals.push(l, n, d); central.push(h, n); offset += 30 + n.length + d.length;
  }
  const cd = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054B50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}
// A blank project made by the editor itself, with one enemy entity.
const h = loadForge(editor);
const project = JSON.parse(h.run('(()=>{const PS=Forge.services.ProjectStore;PS.initializeBlank();S.projectName="Pack check fixture";return db_serializeState({includeEditorView:true})})()'));
project.scenes[0].entities = [{id: 'obj_0001', type: 'enemy', x: 64, y: 120, name: 'Fixture enemy', variant: 0, dir: 0, speed: 1, sprTile: -1}];
const report1 = JSON.stringify({format: 'NESForgeSMB1Extraction', rom: {sha256: 'a'.repeat(64), file: 'fixture.nes'}});
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-pack-check-'));
const write = (name, files) => { const p = path.join(dir, name); fs.writeFileSync(p, storedZip(files)); return p; };
const good = write('good.zip', [['Fixture/smb1_report.json', report1], ['Fixture/projects/area_00.nesforge.json', JSON.stringify(project)]]);
const noId = JSON.parse(JSON.stringify(project)); delete noId.scenes[0].entities[0].id;
const bad = write('missing_id.zip', [['Fixture/smb1_report.json', report1], ['Fixture/projects/area_00.nesforge.json', JSON.stringify(noId)]]);
const big = write('too_many.zip', [['Fixture/smb1_report.json', report1], ...Array.from({length: 2049}, (_, i) => ['Fixture/extra/f' + i + '.txt', 'x'])]);
function run(zip) { try { return {code: 0, out: execFileSync(process.execPath, [checker, zip, '--forge', editor], {encoding: 'utf8'})}; } catch (e) { return {code: e.status, out: String(e.stdout)}; } }
function check(name, fn) { try { fn(); report.checks.push({name, passed: true}); } catch (e) { report.checks.push({name, passed: false, error: e.message}); } }
check('Valid synthetic pack passes', () => { const r = run(good); if (r.code !== 0 || !/ALL PASS/.test(r.out)) throw Error(r.out); });
check('Entity without id fails with the editor message', () => { const r = run(bad); if (r.code !== 2 || !/Entity ID must be nonempty/.test(r.out)) throw Error(r.out); });
check('Over 2,048 files fails and names the limit', () => { const r = run(big); if (r.code !== 2 || !/2,048 files per ZIP/.test(r.out)) throw Error(r.out); });
fs.rmSync(dir, {recursive: true, force: true});
report.passed = report.checks.every(c => c.passed);
for (const c of report.checks) console.log((c.passed ? 'PASS ' : 'FAIL ') + c.name + (c.error ? ': ' + c.error.slice(0, 300) : ''));
if (output) fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
process.exitCode = report.passed ? 0 : 1;
