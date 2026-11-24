'use strict';
// The independent oracle for AL-EXP-01. It judges a frozen candidate definition and its withheld-screen reconstruction
// against the fixture generator's own data (truth file), with no emulator and none of the editor's code: it imports
// nothing from app/. The expected screens it uses are computed by the generator from its tables, not captured.
// It is independent of the discovery code, not of its author; a second emulator is later scope.
const ORDERS = {row: {TL: 0, TR: 1, BL: 2, BR: 3}, column: {TL: 0, BL: 1, TR: 2, BR: 3}};
const QUADS = ['TL', 'TR', 'BL', 'BR'];

// The record bytes a definition claims for an ID, read straight from the cartridge with the definition's geometry.
function claimedRecord(definition, rom, id) {
  const t = definition.table, f = ORDERS[t.order];
  return QUADS.map(q => rom[t.physicalBase + id * t.recordStep + f[q] * t.fieldStep]);
}
function evaluate(truth, definition, reconstruction, rom) {
  const out = {format: 'NESForgeExperimentEvaluation', version: 1, oracle: 'generator truth (al-exp-01 fixture), independent of the discovery code and of the emulator', seed: truth.seed, definitionHash: definition.definitionHash, checks: [], cells: {}, attributes: {}};
  const check = (name, ok, detail) => out.checks.push({name, passed: !!ok, ...(detail === undefined ? {} : {detail})});
  const t = truth.table, d = definition.table;
  check('source is the fixture', definition.source.sha256 === truth.rom.sha256);
  check('table location (physical offset of record 0)', d.physicalBase === t.physicalBase, {found: d.physicalBase, expected: t.physicalBase});
  check('layout and quadrant order', d.layout === t.layout && d.order === t.order, {found: d.layout + '/' + d.order, expected: t.layout + '/' + t.order});
  check('record and field steps', d.recordStep === t.recordStep && d.fieldStep === t.fieldStep, {found: [d.recordStep, d.fieldStep], expected: [t.recordStep, t.fieldStep]});
  check('grid alignment', d.grid.x === 0 && d.grid.y === 0);
  const pal = truth.palette;
  check('palette array location and decoding', !!definition.attributes && definition.attributes.physicalBase === pal.physicalBase && definition.attributes.decode === (pal.mode === 'low' ? 'low2' : 'high2'),
    definition.attributes ? {found: [definition.attributes.physicalBase, definition.attributes.decode], expected: [pal.physicalBase, pal.mode]} : {found: null});
  // every record the definition claims (0..highest) must be the generator's record
  let wrongRecords = 0; const claimed = definition.extent.highest + 1;
  for (let id = 0; id < claimed; id++) { const r = claimedRecord(definition, rom, id); if (id >= t.count || r.join() !== truth.records[id].join()) wrongRecords++; }
  check('every claimed record equals the generator\'s record', wrongRecords === 0 && claimed <= t.count, {claimed, tableSize: t.count, wrong: wrongRecords});
  // aliases among the known IDs
  const known = new Set(definition.extent.knownIds);
  const expectedAliases = truth.aliases.filter(a => a.ids.every(id => known.has(id))).map(a => a.ids.slice().sort((x, y) => x - y).join(',')).sort();
  const foundAliases = definition.aliases.map(a => a.ids.join(',')).sort();
  check('alias groups kept (none merged or lost)', JSON.stringify(foundAliases) === JSON.stringify(expectedAliases), {found: foundAliases, expected: expectedAliases});
  // the withheld screen, cell by cell
  const ids = truth.expected[3].ids, sameRecordAndPalette = (a, b) => truth.records[a].join() === truth.records[b].join() && truth.palettes[a] === truth.palettes[b];
  const tally = {correct: 0, correctAmbiguity: 0, wrong: 0, unknownAllowed: 0, unknownMissed: 0}, wrong = [];
  for (const c of reconstruction.cells) {
    const truthId = ids[c.my * 16 + c.mx];
    if (c.status === 'unknown') { if (truthId > definition.extent.highest) tally.unknownAllowed++; else { tally.unknownMissed++; wrong.push({cell: [c.mx, c.my], status: c.status, truth: truthId}); } continue; }
    if (c.ids.length === 1) { if (c.ids[0] === truthId) tally.correct++; else { tally.wrong++; wrong.push({cell: [c.mx, c.my], status: c.status, found: c.ids, truth: truthId}); } continue; }
    // ambiguous: the truth must be among the IDs, and every ID must be indistinguishable from it on screen
    if (c.ids.includes(truthId) && c.ids.every(id => sameRecordAndPalette(id, truthId))) tally.correctAmbiguity++;
    else { tally.wrong++; wrong.push({cell: [c.mx, c.my], status: c.status, found: c.ids, truth: truthId}); }
  }
  out.cells = {...tally, total: reconstruction.cells.length, statuses: reconstruction.counts, examples: wrong.slice(0, 8)};
  check('withheld screen: no wrong block ID, no unknown inside the claimed table', tally.wrong === 0 && tally.unknownMissed === 0, out.cells);
  // attribute bytes: every bit the reconstruction states must match the generator's attribute byte
  const expectedAttributes = Buffer.from(truth.expected[3].attributes, 'hex');
  let bitsStated = 0, bitsWrong = 0, bytesExact = 0;
  for (const a of reconstruction.attributes) { const e = expectedAttributes[a.index]; for (let b = 0; b < 8; b++) if (a.knownMask >> b & 1) { bitsStated++; if (((a.value ^ e) >> b) & 1) bitsWrong++; } if (a.knownMask === 0xff && a.value === e) bytesExact++; }
  out.attributes = {bitsStated, bitsWrong, bytesExact, bytes: reconstruction.attributes.length};
  check('withheld screen: every stated attribute bit equals the generator\'s', bitsWrong === 0 && bitsStated > 0, out.attributes);
  out.passed = out.checks.every(c => c.passed);
  return out;
}
// A deliberately broken copy of a definition (for the oracle's own negative test): the table shifted by one record.
function broken(definition) {
  const copy = JSON.parse(JSON.stringify(definition));
  copy.table.physicalBase += definition.table.recordStep;
  return copy;
}
module.exports = {evaluate, broken, claimedRecord};
