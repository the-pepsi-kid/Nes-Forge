/*
 * NES FORGE MODULE: src/services/punch-out-replay.js
 * Bounded Glass Joe experiments on the EXISTING live emulator and Timeline.
 * No second CPU, project store, native game writer or runtime-capture path.
 * Reset/input replay is distinct from clearly recorded RAM-seeded experiments.
 * Timeline owns input, physical checkpoints, cancellation and restoration.
 * Evidence contains state summaries/hashes only, never captured art or ROM bytes.
 */
(() => {
  'use strict';
  const services = Forge.services, timeline = services.EmulatorTimeline, bridge = services.EmulatorBridge;
  const copy = v => JSON.parse(JSON.stringify(v)), hash = NativeEngineFormat.sha256;
  const kinds = ['sequence', 'opponent-down', 'mac-down', 'round'];
  const opener = [{frames: 600, buttons: []}, ...Array.from({length: 8}, () =>
    [{frames: 4, buttons: ['Start']}, {frames: 146, buttons: []}]).flat()];
  let token = 0, busy = false, report = null, checkpoint = null, session = null, expected = '', epoch = 0;
  let predicate = null, reached = false, lastFrame = -1, lastKey = '', lastApuFrame = -1;
  const listeners = new Set();
  const fnv = bytes => { let n = 2166136261; for (const v of bytes) n = Math.imul(n ^ v, 16777619); return (n >>> 0).toString(16).padStart(8, '0'); };
  function physical() {
    const r = emu.ram, selector = r[0xc1];
    return {frame: emu.frameCount, phase: r[0], round: r[6], mac: r[0x50], macStep: r[0x51],
      opponent: r[0x90], opponentStep: r[0x91], knockdown: r[5],
      clock: [r[0x302], r[0x304], r[0x305]], hp: [r[0x392], r[0x399]],
      knockdowns: [r[0x3d0], r[0x3d1]], opponentXY: [r[0xb0], r[0xb1]],
      // B393 initializes C1=$99, C2=referee X. Native count glyphs start at $9A.
      countSelector: selector, count: selector >= 0x9a && selector <= 0xa3 ? selector - 0x99 : null,
      refereeX: r[0xc2], chr: emu.mmc2?.chr?.slice() || [], missed: emu.opsMissed};
  }
  function video() { return {pixels: fnv(emu.frameBuffer), background: fnv(emu.bgFrameBuffer),
    nametables: fnv(emu.vram), oam: fnv(emu.oamMem), palette: Array.from(emu.palRam)}; }
  function state() { return {busy, canRestore: !!checkpoint && !busy && timeline.status().session === session,
    report: report ? copy(report) : null}; }
  function emit() { const value = state(); for (const fn of listeners) try { fn(value); } catch (_) {} }
  function cancel(reason = 'Stopped by the user.') {
    token++; predicate = null; busy = false; timeline.cancel(reason); bridge.pause();
    if (report?.status === 'running') { report.status = 'stopped'; report.stop = reason; }
    emit(); return true;
  }
  function currentProject() {
    if (services.ProjectStore.state.epoch !== epoch || services.ProjectStore.serialize() !== expected)
      throw Error('The project changed. Start a new replay from its current native build.');
  }
  function milestone(name, value = physical()) {
    if (!report.milestones.some(m => m.name === name)) report.milestones.push({name, ...value, video: video()});
  }
  function observe(status) {
    if (!busy || !report || !emu.loaded) return;
    if (status.session !== session || services.ProjectStore.state.epoch !== epoch || S.tab !== 'emu') {
      cancel('ROM session, project or selected editor changed.'); return;
    }
    if (emu.frameCount === lastFrame) return;
    lastFrame = emu.frameCount; const v = physical(); report.observedFrames++;
    const key = JSON.stringify([v.phase, v.round, v.mac, v.macStep, v.opponent, v.opponentStep, v.knockdown, v.countSelector, v.chr]);
    if (key !== lastKey) {
      if (report.transitions.length >= 2500) { cancel('Transition evidence budget reached.'); return; }
      report.transitions.push(v); lastKey = key;
    }
    if ((v.mac & 127) === 9) milestone('body-punch', v);
    if ((v.mac & 127) === 3) milestone('dodge-right', v);
    if (v.knockdown === 1) milestone('opponent-knockdown', v);
    if (v.knockdown === 2) milestone('mac-knockdown', v);
    if (v.knockdown && v.count) milestone('referee-count-' + v.count, v);
    if ((v.mac & 127) === 66) milestone('round-over', v);
    if (v.round === 2) milestone('round-two', v);
    report.last = v;
    if (v.missed) { cancel('The native CPU reported an unsupported instruction.'); return; }
    if (predicate?.(v)) { predicate = null; reached = true; timeline.cancel('Requested native milestone reached.'); }
    if (v.frame % 30 === 0) emit();
  }
  timeline.subscribe(observe);
  // Read-only APU evidence: delegate every original write unchanged. No host audio
  // scheduling, sample conversion or native sound ownership is replaced.
  const priorApuWrite = apuWrite;
  apuWrite = function(address, value) {
    if (busy && report && emu.mapper === 9) {
      report.audio.writes++; report.audio.digest = Math.imul(report.audio.digest ^ address ^ (value << 16), 16777619) >>> 0;
      if (lastApuFrame !== emu.frameCount) { report.audio.activeFrames++; lastApuFrame = emu.frameCount; }
    }
    return priorApuWrite(address, value);
  };
  async function run(kind = 'sequence', options = {}) {
    if (!kinds.includes(kind)) throw Error('Select a declared Glass Joe replay.');
    if (!options || typeof options !== 'object' || Object.keys(options).some(k => k !== 'reuseReady') ||
      (options.reuseReady !== undefined && typeof options.reuseReady !== 'boolean')) throw Error('Invalid replay options.');
    if (busy) throw Error('Stop the current replay first.');
    const project = services.ProjectStore.capture();
    if (!services.PunchOutContentRecovery.matches(project)) throw Error('Open a recovered Punch-Out project first.');
    const built = services.NativeResourceProject.build(project);
    const reuse = options.reuseReady && checkpoint && timeline.status().session === session &&
      report?.nativeOutputSha256 === hash(built.rom) && expected === services.ProjectStore.serialize();
    if (reuse) checkpoint.restore();
    else if (checkpoint) { try { checkpoint.release(); } catch (_) {} checkpoint = null; }
    expected = services.ProjectStore.serialize(); epoch = services.ProjectStore.state.epoch;
    switchTab('emu');
    if (!reuse && !bridge.loadRom(built.rom, 'Glass Joe · current native build', 0)) throw Error('The current native build could not load.');
    session = timeline.status().session;
    const runToken = ++token; lastFrame = -1; lastKey = ''; lastApuFrame = -1; busy = true;
    report = {format: 'NESForgePunchOutReplayEvidence', version: 1, kind, status: 'running',
      sourceSha256: project.nativeGame.sourceSha256, nativeOutputSha256: hash(built.rom), reusedReadyCheckpoint: !!reuse,
      observedFrames: 0, transitions: [], milestones: [], seeds: [], audio: {writes: 0, activeFrames: 0, digest: 2166136261},
      limits: ['Existing approximate MMC2 CPU/PPU/APU playback; not hardware timing acceptance or runtime Scene capture.',
        'Sequence uses controller input from reset. Other cases explicitly seed RAM after a real native opening.',
        'Audio register evidence does not replace browser listening; native Audio writing remains unsupported.']};
    emit();
    const check = () => { if (!busy || token !== runToken || timeline.status().session !== session) throw Error(report.stop || 'Replay interrupted.'); currentProject(); };
    async function steps(input, until = null) {
      check(); reached = false; predicate = until;
      const result = await timeline.runScript(input); observe(timeline.status()); predicate = null;
      check(); if (!result.completed && !reached) throw Error('Input replay interrupted.'); return reached;
    }
    async function wait(frames, until) {
      while (frames > 0) { const count = Math.min(600, frames); if (await steps([{frames: count, buttons: []}], until)) return true; frames -= count; }
      return false;
    }
    function seed(label, values) {
      check(); const changes = values.map(([address, value]) => ({address, value, expected: timeline.readRAM(address).value}));
      report.seeds.push({label, frame: emu.frameCount, changes: timeline.patchRAM(changes)});
    }
    try {
      if (!reuse) {
        await steps(opener);
        if (!await wait(600, v => v.round === 1 && (v.mac & 127) === 1 && (v.opponent & 127) === 1))
          throw Error('The expected Glass Joe opening did not reach a ready fight within its budget.');
        // Initialization-bit states settle on the next source update.
        await steps([{frames: 2, buttons: []}]);
        checkpoint = timeline.saveOwnedCheckpoint('Glass Joe · before experiment');
      }
      milestone('fight-ready');
      if (kind === 'sequence') {
        await steps([{frames: 4, buttons: []}, {frames: 4, buttons: ['A']}, {frames: 56, buttons: []},
          {frames: 12, buttons: ['Right']}, {frames: 90, buttons: []}]);
        if (!report.milestones.some(m => m.name === 'body-punch') || !report.milestones.some(m => m.name === 'dodge-right') || (physical().mac & 127) !== 1)
          throw Error('The declared punch/dodge/stance sequence did not complete.');
        milestone('return-to-stance');
      } else if (kind === 'opponent-down') {
        seed('One HP and clock near the native first taunt', [[0x398, 1], [0x302, 0], [0x304, 3], [0x305, 9], [0x306, 90], [0x307, 0]]);
        const punches = Array.from({length: 12}, () => [{frames: 36, buttons: []}, {frames: 4, buttons: ['Up', 'A']}]).flat();
        if (!await steps(punches, v => v.knockdown === 1)) throw Error('No native opponent knockdown within the declared input window.');
        seed('Explicit get-up target for referee count coverage', [[0xc4, 0x9d]]);
        if (!await wait(1500, v => v.knockdown === 0 && report.milestones.some(m => m.name === 'referee-count-4')))
          throw Error('The seeded referee count/get-up path did not complete.');
        milestone('opponent-get-up');
      } else if (kind === 'mac-down') {
        seed('One player HP and clock near first native attack', [[0x391, 1], [0x302, 0], [0x304, 3], [0x305, 9], [0x306, 90], [0x307, 0]]);
        if (!await wait(1000, v => v.knockdown === 2)) throw Error('No native player knockdown within the declared window.');
        if (!await wait(1600, v => v.phase === 253 && report.milestones.some(m => m.name === 'referee-count-10')))
          throw Error('The native player count/loss path did not complete.');
        milestone('player-count-out');
      } else {
        seed('Clock 2:59, before the original round-end update', [[0x302, 2], [0x304, 5], [0x305, 9], [0x306, 127], [0x307, 255]]);
        if (!await wait(360, v => v.round === 2)) throw Error('The original round controller did not advance.');
        const continuation = Array.from({length: 15}, () => [{frames: 4, buttons: ['Start']}, {frames: 116, buttons: []}]).flat();
        if (!await steps(continuation, v => v.round === 2 && (v.mac & 127) === 1 && (v.opponent & 127) === 1))
          throw Error('Round two did not reach its ready state within the bounded continuation.');
        milestone('round-two-ready');
      }
      currentProject(); report.status = 'completed'; report.last = physical(); report.finalVideo = video();
      report.projectUnchanged = true; return copy(report);
    } catch (error) { if (report.status === 'running') report.status = 'refused'; report.stop = error.message; return copy(report); }
    finally { predicate = null; if (runToken === token) { busy = false; timeline.cancel('Glass Joe replay ended.'); bridge.pause(); } emit(); }
  }
  function restore() {
    if (busy || !checkpoint || timeline.status().session !== session) throw Error('No restorable fight checkpoint in this ROM session.');
    currentProject(); checkpoint.restore(); emit(); return physical();
  }
  services.PunchOutReplay = Object.freeze({run, cancel, restore, status: state,
    subscribe(fn) { if (typeof fn !== 'function') throw Error('A replay observer must be a function.'); listeners.add(fn); fn(state()); return () => listeners.delete(fn); }});
})();
