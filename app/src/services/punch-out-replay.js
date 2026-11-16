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
  const kinds = ['sequence', 'opponent-down', 'opponent-fifth', 'mac-down', 'round', 'natural-opponent-down', 'natural-opponent-late', 'natural-mac-down', 'natural-round'];
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
  function state() { return {busy, canRestore: !!checkpoint && !busy && timeline.status().session === session&&services.ProjectStore.state.epoch===epoch,
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
    // $05=3 is the round-end flag. Speech selectors in that phase are not
    // knockdown counts even when they reuse a count glyph value in $C1.
    if ([1,2].includes(v.knockdown) && v.count) milestone('referee-count-' + v.count, v);
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
    const eventModel = PunchOutEvents.open(built.rom);
    const sourceCatalog=PunchOutEvents.open(services.NativeResourceProject.validate(project).bytes).catalog;
    const reuse = options.reuseReady && checkpoint && timeline.status().session === session &&
      report?.nativeOutputSha256 === hash(built.rom) && expected === services.ProjectStore.serialize();
    if (reuse) checkpoint.restore();
    else if (checkpoint) { try { checkpoint.release(); } catch (_) {} checkpoint = null; }
    expected = services.ProjectStore.serialize(); epoch = services.ProjectStore.state.epoch;
    switchTab('emu');
    if (!reuse && !bridge.loadRom(built.rom, 'Glass Joe · current native build', 0)) throw Error('The current native build could not load.');
    session = timeline.status().session;
    const runToken = ++token; lastFrame = -1; lastKey = ''; lastApuFrame = -1; busy = true;
    report = {format: 'NESForgePunchOutReplayEvidence', version: 2, runId:runToken, kind, experimentType:['opponent-down','opponent-fifth','mac-down','round'].includes(kind)?'ram-seeded-experiment':'controller-input', status: 'running',
      sourceSha256: project.nativeGame.sourceSha256, nativeOutputSha256: hash(built.rom),projectEpoch:epoch,reusedReadyCheckpoint: !!reuse,
      observedFrames: 0, transitions: [], milestones: [], seeds: [], input: [], sourceEvents: [], eventCatalog: copy(eventModel.catalog),eventCatalogRole:'native-output',sourceCatalog:copy(sourceCatalog),audio: {writes: 0, activeFrames: 0, digest: 2166136261},
      limits: ['Existing approximate MMC2 CPU/PPU/APU playback; not hardware timing acceptance or runtime Scene capture.',
        'Sequence and natural cases use controller input from reset or an explicitly reused original opening checkpoint. Seeded cases record every RAM intervention.',
        'Native event proof covers only observed writes/branches. A shared VM instruction is distinct from its script/data. The native writer includes three fifth-attempt exit/fallback slots; the sixth row and code remain protected. A zero entry has no health-write witness, and a ten-count does not identify its source slot.',
        'Audio register evidence does not replace browser listening; native Audio writing remains unsupported.']};
    emit();
    let eventObservation=null,pendingRecovery=null;
    const check = () => { if (!busy || token !== runToken || timeline.status().session !== session) throw Error(report.stop || 'Replay interrupted.');
      if(eventObservation&&!eventObservation.status().active)throw Error('Native event observation stopped: '+eventObservation.status().stopReason);currentProject(); };
    async function steps(input, until = null) {
      check(); reached = false; predicate = until;
      const result = await timeline.runScript(input);
      let left=result.executedFrames,frame=result.startFrame;
      for(const step of input){if(!left)break;const frames=Math.min(left,step.frames);report.input.push({frame,frames,buttons:step.buttons.slice()});frame+=frames;left-=frames;}
      if(report.input.length>4096)throw Error('Input evidence budget exceeded.');
      observe(timeline.status()); predicate = null;
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
      eventObservation=services.RERuntime.observeRAMWrites({addresses:[...PunchOutEvents.addresses],sample:[...PunchOutEvents.sample],limit:4096,
        onWrite(write){
          if(!busy||runToken!==token)return;
          // Resolve the live switched window through the existing mapper owner.
          // No CPU read is added, and fixed-bank instruction provenance stays
          // distinct from the bank that supplied the fighter's data.
          const dataBank8KiB=Math.floor(ForgeMMC2.cpu(emu.mmc2,0x8000)/8192);
          const event=eventModel.classify({...write,dataBank8KiB});if(!event)return;
          if(event.kind==='opponent-knockdown')pendingRecovery=null;
          if(event.kind==='opponent-recovery-entry')pendingRecovery={event,index:report.sourceEvents.length};
          // Join two proven writes from this selector call. The first supplies
          // Y/the packed entry; the final store supplies the actual count. A
          // fixed-bank writer alone cannot locate data in the fighter bank.
          if(event.kind==='opponent-get-up-target'&&pendingRecovery){
            const {decision}=pendingRecovery.event,r=write.sampledBeforeWrite,slot=write.registers?.y;
            const close=event.frame>=pendingRecovery.event.frame&&event.frame<=pendingRecovery.event.frame+2&&r[0x3c9]===decision.rowOffset&&r[0x39e]===decision.hpTarget;
            const direct=decision.route==='direct-count'&&event.count===decision.count;
            const fallback=decision.route==='fallback-pool'&&Number.isInteger(slot)&&slot>=0&&slot<8&&event.count===eventModel.catalog.fallbackGetUpPool.counts[slot];
            if(close&&(direct||fallback)){
              event.recovery={...copy(decision),evidenceEntryIndex:pendingRecovery.index,fallbackSlot:fallback?slot:null,modeTag:r[0x3cb]};
              const pool=eventModel.catalog.fallbackGetUpPool.source;
              event.related=fallback?{...pool,fileOffset:pool.fileOffset+slot,cpuAddress:pool.cpuAddress+slot,length:1,label:'Selected Glass Joe fallback slot '+slot}:copy(decision.source);
            }
            pendingRecovery=null;
          }
          report.sourceEvents.push({...event,ramSeedsApplied:report.seeds.length>0});
        }});
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
      } else if (kind === 'natural-opponent-down'||kind==='natural-opponent-late') {
        // Wait for the original clock, then submit ordinary face-punch inputs.
        // Neither health, clock, count target nor state is injected.
        if(kind==='natural-opponent-late'){
          // Leave the first-minute conditional window with real controller
          // inputs. Recovery mashing, if needed, uses the native Mac routine.
          await steps([{frames:56,buttons:[]}]);
          for(let i=0;i<150&&physical().clock[0]===0;i++){
            if(physical().knockdown===2){for(let j=0;j<100&&physical().knockdown===2;j++)await steps([{frames:4,buttons:['A']},{frames:4,buttons:['B']}]);}
            else await steps([{frames:12,buttons:['Right']},{frames:6,buttons:[]},{frames:12,buttons:['Left']},{frames:6,buttons:[]}]);
            if([251,253].includes(physical().phase))throw Error('Mac lost before the later native attack window.');
          }
          if(physical().clock[0]!==1)throw Error('The original clock did not reach minute one.');
        }else if(!await wait(1600,v=>v.clock[0]>0||v.clock[1]*10+v.clock[2]>=39))throw Error('Native first attack window was not reached.');
        for(let i=0;i<60&&physical().knockdown!==1;i++){
          if(physical().knockdown===2)throw Error('Mac fell before the requested opponent knockdown.');
          await steps([{frames:4,buttons:['Up',i%2?'B':'A']},{frames:36,buttons:[]}],v=>v.knockdown===1);
        }
        if(physical().knockdown!==1)throw Error('No natural opponent knockdown within the declared punch budget.');
        if(!await wait(1800,v=>v.knockdown===0&&(v.mac&127)===1&&(v.opponent&127)===1))throw Error('The native opponent get-up did not return to an active fight.');
        milestone('opponent-get-up');
      } else if (kind === 'natural-mac-down') {
        if(!await wait(3600,v=>v.knockdown===2))throw Error('No natural Mac knockdown within the native wait budget.');
        if(!await wait(1600,v=>v.phase===253&&report.milestones.some(m=>m.name==='referee-count-10')))throw Error('The native ten-count did not complete.');
        milestone('player-count-out');
      } else if (kind === 'natural-round') {
        // Controller-only survival: alternate dodges, mash A/B if Mac is down,
        // and use Start through the original break. No health/clock/state seed.
        const activeSecondRound=v=>v.round===2&&v.phase===1&&v.knockdown===0&&(v.mac&127)>=1&&(v.mac&127)<=21&&(v.opponent&127)>=1&&(v.opponent&127)<64&&v.clock[0]===0&&(v.clock[1]>0||v.clock[2]>0);
        await steps([{frames:56,buttons:[]}]);
        let ready=false;
        for(let i=0;i<250&&!ready;i++){
          const v=physical();if(v.phase===253||v.phase===251&&v.knockdown===2)throw Error('Mac lost before the requested round continuation.');
          if(v.knockdown===2){
            for(let j=0;j<100&&physical().knockdown===2;j++)await steps([{frames:4,buttons:['A']},{frames:4,buttons:['B']}]);
          }else if(v.round!==1||v.knockdown===3||v.phase===255){
            await steps([{frames:4,buttons:['Start']},{frames:116,buttons:[]}],activeSecondRound);
          }else await steps([{frames:12,buttons:['Right']},{frames:6,buttons:[]},{frames:12,buttons:['Left']},{frames:6,buttons:[]}]);
          const now=physical();ready=activeSecondRound(now);
        }
        if(!ready)throw Error('Natural round two did not reach its active state within the declared input budget.');
        milestone('round-two-active');
      } else if (kind === 'opponent-down'||kind==='opponent-fifth') {
        const fifth=kind==='opponent-fifth';
        // The fifth-row experiment declares cursor/RNG-state interventions.
        // Native bank 7 $86A6 regenerates $18 from state including $19, so this
        // fixture seeds $19. It never seeds the count target or claims five
        // natural knockdowns. The original selector and count script run.
        seed(fifth?'Fifth recovery row, one opponent HP, clock and declared RNG seed':'One HP and clock near the native first taunt',
          [[0x398, 1], [0x302, 0], [0x304, 3], [0x305, 9], [0x306, 90], [0x307, 0],...(fifth?[[0x3c9,32],[0x19,1]]:[])]);
        if(fifth)await steps([{frames:1,buttons:[]}]);
        const punches = Array.from({length: 12}, () => [{frames: 36, buttons: []}, {frames: 4, buttons: ['Up', 'A']}]).flat();
        if (!await steps(punches, v => v.knockdown === 1)) throw Error('No native opponent knockdown within the declared input window.');
        if(fifth){
          if(!await wait(1800,v=>v.knockdown===0&&v.phase===1&&(v.mac&127)===1&&(v.opponent&127)===1||report.sourceEvents.some(e=>e.kind==='opponent-count-out')))
            throw Error('The seeded fifth-row get-up/ten-count path did not complete.');
          const countOut=report.sourceEvents.some(e=>e.kind==='opponent-count-out');
          milestone(countOut?'opponent-count-out':'opponent-get-up');
          report.recoveryFixture={attempt:5,cursor:32,rngSeed:{address:0x19,value:1},outcome:countOut?'native-ten-count':'native-get-up',targetSeeded:false};
        }else{
          seed('Explicit get-up target for referee count coverage', [[0xc4, 0x9d]]);
          if (!await wait(1500, v => v.knockdown === 0 && report.milestones.some(m => m.name === 'referee-count-4')))
            throw Error('The seeded referee count/get-up path did not complete.');
          milestone('opponent-get-up');
        }
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
    finally { eventObservation?.stop();predicate = null; if (runToken === token) { busy = false; timeline.cancel('Glass Joe replay ended.'); bridge.pause(); } emit(); }
  }
  function restore() {
    if (busy || !checkpoint || timeline.status().session !== session) throw Error('No restorable fight checkpoint in this ROM session.');
    currentProject(); checkpoint.restore(); emit(); return physical();
  }
  function inventory(){
    const p=services.ProjectStore.capture(),info=services.NativeResourceProject.validate(p);
    if(info.adapter.kind!=='punch-out')throw Error('Open a recovered Punch-Out project first.');
    return {sourceSha256:info.descriptor.sourceSha256,catalog:copy(PunchOutEvents.open(info.bytes).catalog)};
  }
  async function inspectSource(target,sourceSha256){
    if(busy)throw Error('Stop or finish the replay before inspecting its source.');
    const p=services.ProjectStore.capture(),info=services.NativeResourceProject.validate(p),ownEpoch=services.ProjectStore.state.epoch;
    if(info.adapter.kind!=='punch-out'||info.descriptor.sourceSha256!==sourceSha256)throw Error('This evidence belongs to another source. Reopen its Punch-Out project first.');
    const catalog=PunchOutEvents.open(info.bytes).catalog,recovery=catalog.recovery,
      allowed=[catalog.roundLimit.source,catalog.countProgram.source,catalog.countProgram.handler,catalog.fallbackGetUpPool.source,...catalog.fallbackGetUpPool.slots.map(slot=>slot.source),
        recovery.source,recovery.pointer,recovery.selector,recovery.hpWriter,recovery.countReader,recovery.gates,...recovery.modeSources,...recovery.rows.flatMap(row=>[row.source,row.conditionSource,row.preferred.source,...row.alternatives.map(entry=>entry.source)])];
    if(report?.sourceSha256===sourceSha256)for(const event of report.sourceEvents)allowed.push(event.instruction,event.script,event.related,event.decision?.conditionSource,event.recovery?.conditionSource);
    const fields=['bank8KiB','cpuAddress','fileOffset','length','kind'];
    if(!target||!allowed.some(row=>row&&fields.every(k=>row[k]===target[k])))throw Error('Choose a retained native event source link.');
    const isCurrent=()=>services.ProjectStore.state.epoch===ownEpoch&&S.nativeGame?.sourceSha256===sourceSha256;
    const bytes=info.bytes.slice(),loaded=await services.REAnalysisUI.openFile({name:p.investigation?.source?.name||'Punch-Out preserved source',size:bytes.length,arrayBuffer:async()=>bytes.slice().buffer},{isCurrent});
    if(!loaded||!isCurrent())throw Error('The source/project changed during inspection. Open the link again.');
    switchTab('disasm');services.REAnalysisUI.showWorkspace();
    return services.REAnalysisUI.viewRange({fileOffset:target.fileOffset,length:target.length,cpuAddress:target.cpuAddress,
      bankLabel:'PRG 8 KiB bank '+target.bank8KiB+' · '+target.kind,variant:'2a03'});
  }
  async function inspectOutput(target,sourceSha256,outputSha256){
    if(busy)throw Error('Stop or finish the replay before inspecting its output.');
    if(!report||report.sourceSha256!==sourceSha256||report.nativeOutputSha256!==outputSha256||
      report.projectEpoch!==services.ProjectStore.state.epoch)throw Error('Replay output is detached. Run the current project again.');
    const p=services.ProjectStore.capture(),info=services.NativeResourceProject.validate(p),ownEpoch=services.ProjectStore.state.epoch,
      expectedProject=services.ProjectStore.serialize();
    if(info.adapter.kind!=='punch-out'||info.descriptor.sourceSha256!==sourceSha256)throw Error('Open this replay’s source project first.');
    const allowed=report.sourceEvents.flatMap(event=>[event.instruction,event.script,event.related,event.decision?.conditionSource,event.recovery?.conditionSource]),fields=['bank8KiB','cpuAddress','fileOffset','length','kind'];
    if(!target||!allowed.some(row=>row&&fields.every(k=>row[k]===target[k])))throw Error('Choose a retained replay event output link.');
    const built=services.NativeResourceProject.build(p);
    if(hash(built.rom)!==outputSha256)throw Error('The native output changed. Run a new replay before following its output.');
    const isCurrent=()=>services.ProjectStore.state.epoch===ownEpoch&&services.ProjectStore.serialize()===expectedProject;
    const bytes=built.rom.slice(),loaded=await services.REAnalysisUI.openFile({name:'Punch-Out matching replay output',size:bytes.length,arrayBuffer:async()=>bytes.slice().buffer},{isCurrent});
    if(!loaded||!isCurrent())throw Error('The project changed during output inspection.');
    switchTab('disasm');services.REAnalysisUI.showWorkspace();
    return services.REAnalysisUI.viewRange({fileOffset:target.fileOffset,length:target.length,cpuAddress:target.cpuAddress,
      bankLabel:'PRG 8 KiB bank '+target.bank8KiB+' · replay-output · '+target.kind,variant:'2a03'});
  }
  services.PunchOutReplay = Object.freeze({run, cancel, restore, status: state,
    inventory,inspectSource,inspectOutput,
    subscribe(fn) { if (typeof fn !== 'function') throw Error('A replay observer must be a function.'); listeners.add(fn); fn(state()); return () => listeners.delete(fn); }});
})();
