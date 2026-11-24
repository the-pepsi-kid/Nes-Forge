#!/usr/bin/env node
'use strict';
// CAD-PORT-01: writes app/src/re/cad-port-revisions.js, the verification ledger, from observation reports
// (tools/cad-port/observe.cjs). Per local cartridge revision (by SHA-256): every translated definition's structural
// state, the screens NES Forge's emulator and FCEUX each saw the game draw, and where the background graphics came from.
//   node tools/cad-port/ledger.cjs observation.json... [--out app/src/re/cad-port-revisions.js]
const fs = require('node:fs'), path = require('node:path');
const args = process.argv.slice(2), oi = args.indexOf('--out'), OUT = oi >= 0 ? args[oi + 1] : path.join(__dirname, '../../app/src/re/cad-port-revisions.js');
const inputs = args.filter((a, i) => a !== '--out' && args[i - 1] !== '--out');
const bySha = new Map();
for (const f of inputs.filter(f => !/divergence/.test(f))) {
  const o = JSON.parse(fs.readFileSync(f, 'utf8'));
  if (o.format !== 'NESForgeCadPortObservation') throw Error(f + ' is not an observation report');
  let r = bySha.get(o.cartridge.sha256);
  if (!r) bySha.set(o.cartridge.sha256, r = {sha256: o.cartridge.sha256, name: o.cartridge.name, bytes: o.cartridge.bytes, game: o.game, upstream: o.upstream, observed: [], definitions: new Map(), emulators: {}});
  if (r.game !== o.game) throw Error('one cartridge, two games: ' + f);
  for (const s of o.structural) { const d = r.definitions.get(s.id) || {id: s.id}; d.structural = s.state; r.definitions.set(s.id, d); }
  for (const e of o.engines) {
    r.observed.push({engine: e.engine, identity: e.identity || null, script: o.script.name + ' (' + o.script.frames + ' frames, sha ' + o.script.sha256 + ')', captures: e.captures || 0, blocked: e.blocked || null, ...(e.explained ? {explainedByTranslatedBlocks: {meanShare: e.explained.meanShare, captures: e.explained.captures, capturesBelowHalf: e.explained.capturesBelowHalf}} : {})});
    // emulator compatibility, kept apart from what the definitions decode: did this engine run the whole script?
    const expected = Math.floor(o.script.frames / o.script.every), ran = e.blocked ? 0 : e.captures || 0;
    r.emulators[e.engine] = {identity: e.identity || null, script: o.script.name, checkpoints: ran, expected,
      status: e.blocked ? 'blocked' : ran >= expected - 2 ? 'ran the whole script' : 'stopped early', ...(e.blocked ? {reason: e.blocked} : {}), ...(e.header ? {header: e.header} : {})};
    if (e.header && !r.header) r.header = e.header;
    if (e.blocked) continue;
    for (const x of e.definitions) {
      const d = r.definitions.get(x.id) || {id: x.id}; r.definitions.set(x.id, d);
      const prev = d[e.engine], screens = [...new Set([...(prev?.screens || []), ...x.observedScreens])].sort((a, b) => a - b);
      d[e.engine] = {screens, firstFrame: prev?.firstFrame != null && x.firstFrame != null ? Math.min(prev.firstFrame, x.firstFrame) : prev?.firstFrame ?? x.firstFrame};
      if (x.graphics && x.observedScreens.length) {
        const g = {table: x.graphics.table, source: x.graphics.source, ...(x.graphics.kilobytes ? {kilobytes: x.graphics.kilobytes} : {}), ...(x.graphics.runs ? {runs: x.graphics.runs, uniform: x.graphics.uniform} : {}), located: x.graphics.located};
        // graphics are recorded when an engine located them; when both engines did, they must agree
        if (!d.graphics) { d.graphics = g; d.graphicsBy = [e.engine]; d.palette = x.graphics.backgroundPalette || null; }
        else if (JSON.stringify(d.graphics) === JSON.stringify(g)) d.graphicsBy.push(e.engine);
        else d.graphicsDisagree = (d.graphicsDisagree || []).concat([{engine: e.engine, graphics: g}]);
      }
    }
  }
}
// graphics the engines located differently are not established: both candidates are kept, none is used
for (const r of bySha.values()) for (const d of r.definitions.values()) if (d.graphicsDisagree) {
  d.graphicsCandidates = [{engines: d.graphicsBy, ...d.graphics}, ...d.graphicsDisagree.map(x => ({engines: [x.engine], ...x.graphics}))];
  delete d.graphics; delete d.palette; delete d.graphicsBy; delete d.graphicsDisagree; }
// what each emulator's run means for each definition's runtime verification (kept apart from decoding and recovery)
const findings = new Map();
for (const f of inputs.filter(f => /divergence/.test(f))) { const d = JSON.parse(fs.readFileSync(f, 'utf8')); findings.set(d.cartridge.sha256, d); }
function runtimeStatus(r, d) {
  const f = d.forge?.screens?.length, c = d.fceux?.screens?.length, fe = r.emulators.forge, ce = r.emulators.fceux;
  if (f && c) return 'independently verified';
  if (c && fe?.status === 'stopped early') return 'blocked: NES Forge\'s emulator stopped before this area (observed in FCEUX only)';
  if (c) return 'observed in FCEUX only';
  if (f) return 'observed in NES Forge only';
  if (!fe && !ce) return 'not attempted';
  return 'not reached by the script';
}
const revisions = [...bySha.values()].sort((a, b) => a.game.localeCompare(b.game) || a.sha256.localeCompare(b.sha256)).map(r => ({...r,
  definitions: [...r.definitions.values()].sort((a, b) => a.id.localeCompare(b.id)).map(d => ({...d, forge: d.forge || null, fceux: d.fceux || null, runtime: runtimeStatus(r, d)})),
  ...(findings.has(r.sha256) ? {emulatorFinding: (({first, agree, engines}) => ({first, agreeingCheckpoints: agree, engines}))(findings.get(r.sha256))} : {})}));
const data = {format: 'NESForgeCadPortRevisions', version: 1,
  about: 'Local cartridge revisions Agent Lab examined. Kept apart: identity (SHA-256, header reading), decoder compatibility (structural state of every translated definition), runtime verification (the screens each engine observed the game drawing), emulator compatibility (whether each engine ran the whole script) and where the background graphics came from. Hashes, offsets and colour numbers only.',
  revisions};
fs.writeFileSync(OUT, '/* GENERATED by tools/cad-port/ledger.cjs from Agent Lab observation reports. Do not edit by hand. UMD, data only. */\n' +
  '(function(root,data){if(typeof module!==\'undefined\'&&module.exports)module.exports=data;else root.CadPortRevisions=data;})(typeof globalThis!==\'undefined\'?globalThis:this,Object.freeze(' + JSON.stringify(data) + '));\n');
for (const r of revisions) console.log(r.game.padEnd(16), r.name.padEnd(40), r.definitions.filter(d => d.forge?.screens?.length).length, 'observed (forge)', r.definitions.filter(d => d.fceux?.screens?.length).length, 'observed (fceux)', r.definitions.length, 'definitions');
console.log('wrote', OUT, fs.statSync(OUT).size, 'bytes');
