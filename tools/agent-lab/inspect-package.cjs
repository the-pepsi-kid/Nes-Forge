#!/usr/bin/env node
'use strict';
// NES Forge AL-EXP-02: inspect an experiment package without the editor.
//   node tools/agent-lab/inspect-package.cjs PACKAGE.json [--cartridge FILE.nes]
// Validates the package hash, every receipt and the candidate, every embedded payload against its SHA-256, and the
// cartridge (embedded, or a locally supplied file that must have the recorded SHA-256); prints a summary as JSON.
// Exit codes: 0 valid, 1 invalid, 2 usage.
const fs = require('node:fs'), path = require('node:path');
const P = require(path.join(__dirname, '../../app/src/re/experiment-package.js'));
const args = process.argv.slice(2), opt = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const file = args.find(a => !a.startsWith('--') && a !== opt('--cartridge'));
if (!file) { console.error('usage: inspect-package.cjs PACKAGE.json [--cartridge FILE.nes]'); process.exit(2); }
const pkg = JSON.parse(fs.readFileSync(file, 'utf8')), summary = P.inspect(pkg);
try { P.cartridgeBytes(pkg, opt('--cartridge') ? new Uint8Array(fs.readFileSync(opt('--cartridge'))) : null); summary.cartridgeCheck = 'matches the recorded SHA-256'; }
catch (e) { summary.cartridgeCheck = e.message; }
console.log(JSON.stringify(summary, null, 1));
process.exit(summary.valid ? 0 : 1);
