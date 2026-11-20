'use strict';
// ZIP intake limits: the editor's parseZip() must name the limit that was hit (file count, size) instead of a
// generic "Invalid ZIP directory", and must still open an ordinary archive. Synthetic archives only.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const {loadForge} = require('./u/harness.cjs');
const editor = path.resolve(process.argv[2] || path.join(__dirname, '../../NES_Forge.html')), output = process.argv[3];
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const report = {editorSha256: sha(fs.readFileSync(editor)), checks: []};

// Minimal stored (method 0) ZIP writer with correct CRC-32.
const crcTable = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = b => { let c = 0xFFFFFFFF; for (const x of b) c = crcTable[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function storedZip(files) {
  const locals = [], central = []; let offset = 0;
  for (const [name, text] of files) {
    const n = Buffer.from(name), d = Buffer.from(text), c = crc32(d);
    const l = Buffer.alloc(30); l.writeUInt32LE(0x04034B50, 0); l.writeUInt16LE(20, 4); l.writeUInt32LE(c, 14); l.writeUInt32LE(d.length, 18); l.writeUInt32LE(d.length, 22); l.writeUInt16LE(n.length, 26);
    const h = Buffer.alloc(46); h.writeUInt32LE(0x02014B50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(20, 6); h.writeUInt32LE(c, 16); h.writeUInt32LE(d.length, 20); h.writeUInt32LE(d.length, 24); h.writeUInt16LE(n.length, 28); h.writeUInt32LE(offset, 42);
    locals.push(l, n, d); central.push(h, n); offset += 30 + n.length + d.length;
  }
  const cd = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054B50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([...locals, cd, end]));
}
function check(name, fn) { try { fn(); report.checks.push({name, passed: true}); } catch (e) { report.checks.push({name, passed: false, error: e.message}); } }

const h = loadForge(editor);
const parse = bytes => { h.context.__zip = bytes; return h.run('(()=>{try{return {ok:Object.keys(parseZip(__zip)).length}}catch(e){return {error:e.message}}})()'); };
check('Ordinary archive opens', () => { const r = parse(storedZip([['a/report.json', '{}'], ['a/maps/x.json', '{}']])); assert.equal(r.ok, 2, JSON.stringify(r)); });
check('2,048 files is still accepted', () => { const r = parse(storedZip(Array.from({length: 2048}, (_, i) => ['p/f' + i + '.json', '{}']))); assert.equal(r.ok, 2048, JSON.stringify(r)); });
check('2,049 files names the file limit', () => { const r = parse(storedZip(Array.from({length: 2049}, (_, i) => ['p/f' + i + '.json', '{}'])));
  assert.ok(r.error && /2,049 files/.test(r.error) && /2,048/.test(r.error), JSON.stringify(r)); });
check('Over 64 MB names the size limit', () => { const r = parse(new Uint8Array(64 * 1024 * 1024 + 1));
  assert.ok(r.error && /64 MB/.test(r.error) && /64\.0 MB/.test(r.error), JSON.stringify(r)); });
check('Truncated directory is still reported as corrupt', () => { const z = storedZip([['a/x.json', '{}']]); const bad = z.slice(); new DataView(bad.buffer).setUint32(bad.length - 6, 999999, true);
  const r = parse(bad); assert.ok(r.error && !/files per ZIP/.test(r.error), JSON.stringify(r)); });

report.passed = report.checks.every(c => c.passed);
for (const c of report.checks) console.log((c.passed ? 'PASS ' : 'FAIL ') + c.name + (c.error ? ': ' + c.error : ''));
if (output) fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
process.exitCode = report.passed ? 0 : 1;
