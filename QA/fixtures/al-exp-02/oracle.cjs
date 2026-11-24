'use strict';
// The independent oracle for AL-EXP-02. It judges a discovery result (its classification, its tested hypotheses, its
// frozen definition and its withheld-screen reconstruction) against the fixture generator's own data (the truth file),
// with no emulator and none of the editor's code: it imports nothing from app/. It is independent of the discovery
// code and of NES Forge's emulator, not of its author.
//
// Visual equivalence and exact record identity are measured separately: a cell can show the right four tiles with the
// wrong record ID (an alias), and a definition with relative numbering claims tiles but not IDs.
const ORDERS = {row: {TL: 0, TR: 1, BL: 2, BR: 3}, column: {TL: 0, BL: 1, TR: 2, BR: 3}};
const QUADS = ['TL', 'TR', 'BL', 'BR'];
const decode = (def, rom, id) => { const t = def.table, f = ORDERS[t.order]; return QUADS.map(q => rom[t.physicalBase + id * t.recordStep + f[q] * t.fieldStep]); };
const pct = (a, b) => b ? Math.round(1000 * a / b) / 10 : null;

// truth.regions keyed by name; which of them a ranked candidate's window lies in
function regionOf(truth, physical) { for (const [name, r] of Object.entries(truth.regions)) if (physical >= r.physical && physical < r.physical + r.length) return name; return null; }

function evaluate(truth, report, rom, {independent = null} = {}) {
  const out = {format: 'NESForgeExperimentEvaluation', version: 2, oracle: 'generator truth (al-exp-02 fixture), independent of the discovery code and of the emulator', seed: truth.seed, scenario: truth.scenario, expect: truth.expect, checks: [], metrics: {}};
  const check = (name, ok, detail) => out.checks.push({name, passed: !!ok, ...(detail === undefined ? {} : {detail})});
  const cls = report.result?.classification || null, def = report.definition || null, t = truth.table, m = out.metrics;
  m.classification = cls;
  m.outcomeCorrect = cls === truth.expect;
  check('outcome: ' + truth.expect + ' expected', m.outcomeCorrect, {found: cls, reason: report.result?.reason});
  // ---- hypotheses: where every ranked candidate lies, and what happened to it ----
  const tests = report.stages?.test?.interventions || [];
  const ranked = (report.stages?.propose?.ranked || []).map(w => {
    const at = truth.prgStart + w.windowPhysical[0], region = regionOf(truth, at), test = tests.find(i => i.candidate === w.id && i.kind === 'tile');
    return {id: w.id, rank: w.rank, region, true: region === 'table' && w.layout === t.layout && w.order === t.order && w.fieldStep === t.fieldStep && w.grid.x === 0 && w.grid.y === 0,
      tested: !!test, classification: test ? test.interpretation?.classification || test.result : 'untested'};
  });
  const decoyNames = new Set([...truth.decoys, ...(truth.unrelated ? ['unrelated'] : []), ...(truth.guard ? ['backup'] : [])]);
  const decoyRows = ranked.filter(w => w.region && decoyNames.has(w.region));
  m.hypotheses = {ranked: ranked.length, trueRank: ranked.find(w => w.true)?.rank ?? null, decoysRanked: decoyRows.length,
    decoysRejected: decoyRows.filter(w => String(w.classification).startsWith('falsified')).length, decoysUnresolved: decoyRows.filter(w => !w.tested || w.classification === 'confounded' || w.classification === 'inconclusive').length,
    decoysAccepted: decoyRows.filter(w => w.classification === 'supported').length, rows: ranked};
  check('no decoy, unrelated table or backup copy was supported by an intervention', m.hypotheses.decoysAccepted === 0, decoyRows);
  // ---- the definition ----
  const offset = def && (def.table.numbering || 'operand-evidence') === 'relative' ? Math.min(...truth.ids.training) : 0;
  m.definition = def ? {numbering: def.table.numbering || 'operand-evidence', physicalBase: def.table.physicalBase, expectedBase: t.physicalBase + offset * t.recordStep} : null;
  const locationCorrect = !!def && def.table.physicalBase === t.physicalBase + offset * t.recordStep;
  const layoutCorrect = !!def && def.table.layout === t.layout && def.table.order === t.order && def.table.recordStep === t.recordStep && def.table.fieldStep === t.fieldStep && def.table.grid.x === 0 && def.table.grid.y === 0;
  m.tableLocation = def ? (locationCorrect ? 'correct' : 'incorrect') : 'none';
  m.recordLayout = def ? (layoutCorrect ? 'correct' : 'incorrect') : 'none';
  m.falsePositive = !!def && (!locationCorrect || !layoutCorrect || !['candidate', 'ambiguous'].includes(truth.expect));
  m.falseNegative = truth.expect === 'candidate' && !def;
  if (def) {
    check('definition: table location' + (offset ? ' (lowest observed record, relative numbering)' : ' (record 0)'), locationCorrect, m.definition);
    check('definition: layout, quadrant order, steps, grid', layoutCorrect, {found: [def.table.layout, def.table.order, def.table.recordStep, def.table.fieldStep], expected: [t.layout, t.order, t.recordStep, t.fieldStep]});
    let wrong = 0; for (let id = 0; id <= def.extent.highest; id++) { const truthId = id + offset; if (truthId >= t.count || decode(def, rom, id).join() !== truth.records[truthId].join()) wrong++; }
    check('definition: every claimed record equals the generator\'s record', wrong === 0, {claimed: def.extent.highest + 1, wrong});
    if (def.attributes) { const pb = truth.palette.physicalBase + offset; check('definition: palette array and decoding', def.attributes.physicalBase === pb && def.attributes.decode === (truth.palette.mode === 'low' ? 'low2' : 'high2'), {found: [def.attributes.physicalBase, def.attributes.decode], expected: [pb, truth.palette.mode]}); }
    check('definition: frozen before the withheld input ran', report.stages?.freeze?.frozenBeforeHoldout && report.holdout?.definitionHash === def.definitionHash);
  } else check('no definition claimed', ['insufficient-evidence', 'inconclusive'].includes(truth.expect), {expect: truth.expect});
  // ---- the withheld screen ----
  if (def && report.holdout?.reconstruction) {
    const ids = truth.expected[3].ids, cells = report.holdout.reconstruction.cells, exact = offset === 0;
    const sameRecordAndPalette = (a, b) => truth.records[a].join() === truth.records[b].join() && truth.palettes[a] === truth.palettes[b];
    const tally = {cells: cells.length, withId: 0, single: 0, identityCorrect: 0, visualCorrect: 0, ambiguous: 0, ambiguityCorrect: 0, unknown: 0, unknownAllowed: 0, unknownMissed: 0, paletteStated: 0, paletteCorrect: 0, wrong: []};
    const pal = def.attributes ? id => { const v = rom[def.attributes.physicalBase + id]; return def.attributes.decode === 'low2' ? v & 3 : v >> 6; } : null;
    for (const c of cells) {
      const truthId = ids[c.my * 16 + c.mx];
      if (!c.ids.length) { tally.unknown++; if (truthId - offset > def.extent.highest || truthId - offset < 0) tally.unknownAllowed++; else tally.unknownMissed++; continue; }
      tally.withId++;
      const tilesOk = c.ids.every(id => decode(def, rom, id).join() === truth.records[truthId].join()); if (tilesOk) tally.visualCorrect++;
      if (c.ids.length === 1) { tally.single++; if (exact && c.ids[0] === truthId) tally.identityCorrect++; else if (exact && tally.wrong.length < 8) tally.wrong.push({cell: [c.mx, c.my], found: c.ids, truth: truthId});
        if (pal) { tally.paletteStated++; if (pal(c.ids[0]) === truth.palettes[truthId]) tally.paletteCorrect++; } }
      else { tally.ambiguous++; const truthRel = truthId - offset; if (c.ids.includes(truthRel) && c.ids.every(id => sameRecordAndPalette(id + offset, truthId))) tally.ambiguityCorrect++; }
    }
    const expAttr = Buffer.from(truth.expected[3].attributes, 'hex'); let bits = 0, bitsOk = 0;
    for (const a of report.holdout.reconstruction.attributes) for (let b = 0; b < 8; b++) if (a.knownMask >> b & 1) { bits++; if (((a.value ^ expAttr[a.index]) >> b & 1) === 0) bitsOk++; }
    m.withheld = {coveragePct: pct(tally.withId, tally.cells), exactIdentityPct: exact ? pct(tally.identityCorrect, tally.single) : 'not claimed (relative numbering)', visualEquivalencePct: pct(tally.visualCorrect, tally.withId),
      palettePct: pct(tally.paletteCorrect, tally.paletteStated), attributeBitsStated: bits, attributeBitsCorrect: bitsOk, attributePct: pct(bitsOk, bits), ambiguous: tally.ambiguous, ambiguityCorrect: tally.ambiguityCorrect, unknown: tally.unknown, unknownMissed: tally.unknownMissed, tally};
    check('withheld screen: every claimed cell shows its claimed tiles (visual equivalence)', tally.visualCorrect === tally.withId, m.withheld);
    if (exact) check('withheld screen: every single-ID cell has the right record ID (exact identity)', tally.identityCorrect === tally.single, tally.wrong);
    check('withheld screen: every ambiguous cell includes the true record and only records it cannot be told from', tally.ambiguityCorrect === tally.ambiguous, {ambiguous: tally.ambiguous, correct: tally.ambiguityCorrect});
    check('withheld screen: no unknown cell inside the claimed table; unknown cells carry no ID', tally.unknownMissed === 0 && cells.filter(c => c.status === 'unknown').every(c => !c.ids.length));
    check('withheld screen: every stated palette and attribute bit is right', tally.paletteCorrect === tally.paletteStated && bitsOk === bits, {palette: [tally.paletteCorrect, tally.paletteStated], bits: [bitsOk, bits]});
  }
  // ---- scenario-specific expectations ----
  if (truth.guard) check('guard: the table\'s interventions are classified as confounded, never as support or falsification', tests.filter(i => regionOf(truth, i.mutation.offset) === 'table').every(i => i.interpretation?.classification === 'confounded') && tests.some(i => regionOf(truth, i.mutation.offset) === 'table'), tests.map(i => [regionOf(truth, i.mutation.offset), i.interpretation?.classification]));
  if (truth.unrelated) check('unrelated table: not chosen', !def || regionOf(truth, def.table.physicalBase) !== 'unrelated');
  if (truth.scenario === 'perfect-decoy') check('perfect decoy (an exact copy never read): not chosen, and falsified as not read when tested', !def || regionOf(truth, def.table.physicalBase) === 'table', ranked.filter(w => w.region === 'decoyCopy'));
  // ---- the independent engine ----
  if (independent) {
    const cmp = independent.comparisons || [], pr = independent.predictions || [];
    m.independent = {verdict: independent.verdict?.result, checkpoints: cmp.length, agree: cmp.filter(c => c.agree).length, timingOnly: cmp.filter(c => c.channels?.ram?.status === 'equal-except-timing').length, predictions: pr.length, hold: pr.filter(p => p.holds).length};
    check('independent engine: agrees at every checkpoint and every prediction holds', m.independent.agree === m.independent.checkpoints && m.independent.hold === m.independent.predictions && ['verified', 'reproduced'].includes(m.independent.verdict), m.independent);
  }
  out.passed = out.checks.every(c => c.passed);
  return out;
}
// A deliberately broken copy of a definition: the table shifted by one record (for the verification-failed test).
function broken(definition) { const copy = JSON.parse(JSON.stringify(definition)); copy.table.physicalBase += definition.table.recordStep; return copy; }
module.exports = {evaluate, broken, decode, regionOf};
