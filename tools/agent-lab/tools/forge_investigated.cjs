#!/usr/bin/env node
'use strict';
/* Read-only GameRENative catalog pass. Data is derived from the owner's local ROM.
 * Private catalog stays in output folder; no source ROM bytes are ever embedded here.
 * This is separate from native writable-resource support.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const romPath = process.argv[2];
const outDir = process.argv[3];
const arg = (flag) => { const i=process.argv.indexOf(flag); return i === -1 ? null : process.argv[i + 1]; };
const forgePath = arg('--forge');
const harnessPath = arg('--harness');
if (!romPath || !outDir || !forgePath || !harnessPath) {
  console.error('Usage: node forge_investigated.cjs rom.nes outdir --forge NES_Forge.html --harness QA/t/u/harness.cjs');
  process.exit(1);
}
const rom = fs.readFileSync(romPath);
if (rom.length > 64*1024*1024) throw Error('ROM exceeds investigation memory limit');
const digest = crypto.createHash('sha256').update(rom).digest('hex');
const forge = require(path.resolve(harnessPath)).loadForge(path.resolve(forgePath));
forge.context.__investigatedRom = new Uint8Array(rom);
const encoded = forge.run('JSON.stringify(GameRENative.inspect(__investigatedRom, "local-owner-ROM"))', 120000);
const catalog = JSON.parse(encoded);
if (catalog?.source?.sha256 !== digest) throw Error('GameRENative catalog source hash mismatch');
const collections = ['scenes','actors','poses','animations','graphics','symbols','ram','locations'];
const counts = Object.fromEntries(collections.map(k => [k, Array.isArray(catalog[k]) ? catalog[k].length : 0]));
const summary = {
  schema: 'NESForgeInvestigatedCatalogSummary/v1', source_sha256: digest,
  status: catalog.status === 'supported' ? 'catalogued' : 'unrecognized',
  profile_id: catalog.profile?.id || null,
  counts, evidence: 'Read-only GameRENative.inspect catalog; records are not proof of pixel parity, editability, or native writeback',
};
fs.mkdirSync(outDir, {recursive:true});
fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary,null,2)+'\n');
// This report can expose game-derived information. It is PRIVATE, never publish.
fs.writeFileSync(path.join(outDir, 'catalog.private.json'), JSON.stringify(catalog,null,2)+'\n');
console.log(JSON.stringify(summary));
