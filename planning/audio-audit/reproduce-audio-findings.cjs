#!/usr/bin/env node
'use strict';
// Read-only probes of the candidate's real compiler and bundled 6502 emulator.
// Usage: node reproduce-audio-findings.cjs /path/to/NES_Forge/app [report.json]
// In the portable repository, omission of the app argument uses ../../app.
// This script reproduces findings; a successful exit is NOT candidate acceptance.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const app = path.resolve(process.argv[2] || path.join(__dirname, '../../app'));
const htmlRelative = 'mainline/NES_Forge_1.9.0_Gameplay_Core.html';
const inputPaths = [htmlRelative, 'tests/harness.cjs', 'tests/fixtures/scout166.json',
  'src/audio/audio-compiler.js', 'src/audio/audio-engine.js',
  'src/legacy/00-editor.js', 'src/legacy/01-emulator.js'];
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const hashes = () => Object.fromEntries(inputPaths.map(name => [name, sha256(fs.readFileSync(path.join(app, name)))]));
const before = hashes();
const {loadForge} = require(path.join(app, 'tests/harness.cjs'));
const fixture = JSON.parse(fs.readFileSync(path.join(app, 'tests/fixtures/scout166.json'), 'utf8'));
const BUDGET = 20000;

function compiled(eventCount) {
  const project = structuredClone(fixture);
  project.audioRuntime = {enabled: true, musicEnabled: true};
  project.audRows = 128;
  project.tempo = 150;
  project.speed = 1;
  project.instruments = [{name: 'Probe', volEnv: [15], dutyEnv: [2],
    arpEnv: [0], pitchEnv: [0], loopVol: 0, loopArp: 0}];
  project.patterns = [{rows: Array.from({length: 128}, (_, row) =>
    Array.from({length: 5}, (_, channel) => ({
      note: channel === 0 && row < eventCount ? 57 : -1,
      inst: channel === 0 && row < eventCount ? 0 : -1,
      vol: -1, fx: 0, fxp: 0
    })))}];
  project.orderList = [[0, 0, 0, 0, 0]];
  project.sfx = [];
  for (const animation of project.animations || []) {
    for (const frame of animation.frames || []) {
      frame.events = (frame.events || []).filter(event => event.type !== 'sound');
    }
  }
  const harness = loadForge(path.join(app, htmlRelative));
  harness.context.probeProject = project;
  harness.run('db_deserializeState(probeProject);window._buildAndRunMode=true');
  harness.context.probeArtifact = harness.run('Forge.services.RuntimeCompiler.compile()', 30000);
  assert.equal(harness.context.probeArtifact.backend, 'single-room');
  assert.deepEqual(harness.errors, []);
  harness.context.probeRom = harness.context.probeArtifact.rom;
  harness.context.probeSymbols = harness.context.probeArtifact.gameplay.symbols;
  harness.run('emuLoadRomData(probeRom,"Read-only audio probe",0)');
  return harness;
}

function denseReaderProbe(eventCount) {
  const harness = compiled(eventCount);
  const result = harness.run(`(() => {
    const z = probeSymbols.audio, labels = probeSymbols.labels;
    // Enter the generated reader directly at the row-64 boundary. This avoids
    // treating broad boot/gameplay behavior as part of this focused evidence.
    emu.ram[z.row] = 64;
    emu.ram[z.sfxActive] = 0;
    emu.ram[z.patPos] = 252;
    emu.ram[z.patPtr] = labels.aud_pattern_0 & 255;
    emu.ram[z.patPtr + 1] = labels.aud_pattern_0 >> 8;
    // RTS sentinel: stacked $7FFF returns to $8000.
    emu.SP = 0xfd;
    emu.ram[0x1fe] = 0xff;
    emu.ram[0x1ff] = 0x7f;
    emu.PC = labels.aud_music_0;
    const initialMissed = emu.opsMissed;
    let instructions = 0;
    while (emu.PC !== 0x8000 && instructions < ${BUDGET}) {
      cpuStep();
      instructions++;
    }
    return {instructions, returned: emu.PC === 0x8000,
      finalPC: emu.PC, finalCursor: emu.ram[z.patPos],
      scanLoopAddress: labels.aud_music_0_loop,
      missedOpcodes: emu.opsMissed - initialMissed};
  })()`, 30000);
  assert.equal(result.missedOpcodes, 0);
  return {rows: 128, eventCount, probeRow: 64, initialCursor: 252,
    instructionBudget: BUDGET, compiledRomSha256: sha256(harness.context.probeRom),
    ...JSON.parse(JSON.stringify(result))};
}

function pitchProbe() {
  const harness = compiled(1);
  const result = harness.run(`(() => {
    const z = probeSymbols.audio, labels = probeSymbols.labels;
    const render = channel => {
      emu.ram[z.activeNote + channel] = 57;
      emu.ram[z.activeInst + channel] = 0;
      emu.ram[z.envVol + channel] = 0;
      emu.ram[z.envArp + channel] = 0;
      emu.ram[z.chVol + channel] = 15;
      emu.A = channel;
      emu.SP = 0xfd;
      emu.ram[0x1fe] = 0xff;
      emu.ram[0x1ff] = 0x7f;
      emu.PC = labels.aud_render_channel;
      let instructions = 0;
      while (emu.PC !== 0x8000 && instructions < ${BUDGET}) {
        cpuStep();
        instructions++;
      }
      if (emu.PC !== 0x8000) throw Error('Generated render routine did not return');
      return instructions;
    };
    const pulseInstructions = render(0), triangleInstructions = render(2);
    const pulsePeriod = apuCore.pulse[0].period;
    const trianglePeriod = apuCore.triangle.period;
    // Divisors come from the bundled APU implementation: pulse has 8 phases
    // clocked at 2*(period+1), triangle has 32 at (period+1).
    return {trackerNote: 57, note: 'A4', previewHz: aud_NOTE_FREQ[57],
      ntscCpuHz: APU_NTSC_CPU, compilerTimer: Forge.services.AudioCompiler.timer(57),
      actualAPUPulsePeriod: pulsePeriod, actualAPUTrianglePeriod: trianglePeriod,
      pulseHzFromInternalAPU: APU_NTSC_CPU / (16 * (pulsePeriod + 1)),
      triangleHzFromInternalAPU: APU_NTSC_CPU / (32 * (trianglePeriod + 1)),
      pulseInstructions, triangleInstructions,
      evidence: 'Actual emitted render routines wrote the bundled APU periods; frequencies derive from its clock/phase implementation.'};
  })()`, 30000);
  return JSON.parse(JSON.stringify(result));
}

const control63 = denseReaderProbe(63);
const dense64 = denseReaderProbe(64);
const pitch = pitchProbe();
assert.deepEqual(hashes(), before, 'Inspected input files changed during the probes');
const report = {
  format: 'NESForgeAudioAlignmentFindings', version: 1,
  recordedAt: new Date().toISOString(),
  htmlSha256: before[htmlRelative], sourceSha256: before,
  scriptSha256: sha256(fs.readFileSync(__filename)),
  scope: 'Read-only focused compiler/emulator probes, not a full regression run, frame-by-frame walkthrough, speaker test or hardware verification.',
  inputFilesUnchanged: true,
  densePattern: {control63, dense64,
    reproduced: control63.returned && !dense64.returned && dense64.instructions === BUDGET,
    conclusion: 'The accepted 64-event stream wraps its byte cursor before the sentinel and remains in the scan loop at row 64. The 63-event control returns.'},
  trianglePitch: {...pitch,
    reproduced: pitch.actualAPUPulsePeriod === pitch.actualAPUTrianglePeriod &&
      Math.abs(pitch.triangleHzFromInternalAPU / pitch.previewHz - 0.5) < 0.01,
    conclusion: 'Generated triangle uses the pulse timer and plays approximately one octave below the authored/preview A4 pitch.'},
  limitations: [
    'Dense-pattern probe exercises generated music reading only; the related SFX reader was inspected but not executed in this probe.',
    'Direct routine entry deliberately supplies valid boundary state; it does not claim a complete end-user playback walkthrough.',
    'Pitch evidence is compiler/APU register and clock-model evidence, not measured speaker or physical-console audio.',
    'No production code, project fixture or packaged report is modified. These findings do not promote or fix the candidate.'
  ]
};
const output = JSON.stringify(report, null, 2) + '\n';
if (process.argv[3]) fs.writeFileSync(path.resolve(process.argv[3]), output);
process.stdout.write(output);
// Report changed behavior honestly if this probe is rerun against a later fix.
if (!report.densePattern.reproduced || !report.trianglePitch.reproduced) process.exitCode = 2;
