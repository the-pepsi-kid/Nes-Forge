'use strict';
// tools/audit/rom_audit.cjs on the four authored test cartridges in QA/r (no commercial ROMs):
// every ROM imports, builds unchanged, survives save/reopen, and the matrix/report are written.
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '../..'), editor = path.resolve(process.argv[2] || path.join(root, 'NES_Forge.html')), output = process.argv[3];
const report = {editorSha256: crypto.createHash('sha256').update(fs.readFileSync(editor)).digest('hex'), checks: []};
const check = (name, fn) => { try { fn(); report.checks.push({name, passed: true}); } catch (e) { report.checks.push({name, passed: false, error: String(e.message).slice(0, 500)}); } };
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-rom-audit-'));
let audit = null;
check('Audit runs over the authored cartridges', () => {
  execFileSync(process.execPath, [path.join(root, 'tools/audit/rom_audit.cjs'), '--forge', editor, '--roms', path.join(root, 'QA/r'), '--out', out], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 1800000});
  audit = JSON.parse(fs.readFileSync(path.join(out, 'audit.json'), 'utf8'));
  if (audit.roms !== fs.readdirSync(path.join(root, 'QA/r')).filter(n => n.endsWith('.nes')).length) throw Error('audited ' + audit.roms + ' ROMs');
});
check('Every cartridge imports, builds unchanged and survives save/reopen', () => {
  for (const r of audit.rows) {
    if (r.fatal) throw Error(r.title + ': ' + r.fatal);
    if (!r.builds.startsWith('yes')) throw Error(r.title + ' does not build: ' + r.builds);
    if (r.roundTrip !== 'yes') throw Error(r.title + ' save/reopen: ' + r.roundTrip);
  }
});
check('Matrix and report are written with the audited editor hash', () => {
  const md = fs.readFileSync(path.join(out, 'AUDIT.md'), 'utf8'), csv = fs.readFileSync(path.join(out, 'matrix.csv'), 'utf8');
  if (!md.includes(report.editorSha256)) throw Error('report does not name the audited editor');
  if (csv.trim().split('\n').length !== audit.roms + 1) throw Error('matrix rows');
  if (!Array.isArray(audit.backlog)) throw Error('backlog missing');
});
fs.rmSync(out, {recursive: true, force: true});
report.passed = report.checks.every(c => c.passed);
for (const c of report.checks) console.log((c.passed ? 'PASS ' : 'FAIL ') + c.name + (c.error ? ': ' + c.error : ''));
if (output) fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
process.exitCode = report.passed ? 0 : 1;
