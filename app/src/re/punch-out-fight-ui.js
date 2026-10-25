/*
 * NES FORGE MODULE: src/re/punch-out-fight-ui.js
 * Explicit Glass Joe reference/command/state inspection under Recovered content.
 * The old editors, source browsers, arena writer and Audio controls remain the
 * owners. A preview is detached; materialization uses one guarded transaction.
 */
(() => {
  'use strict';
  const services = Forge.services, store = services.ProjectStore, api = services.PunchOutFightRecovery;
  const $ = id => document.getElementById(id), make = (tag, id, text) => {
    const el = document.createElement(tag); if (id) el.id = id;
    if (text !== undefined) el.textContent = text; return el;
  };
  const root = make('details', 'punchOutFightPanel'), summary = make('summary', null, 'Glass Joe fight reference · Little Mac / referee / HUD');
  const status = make('p', 'punchOutFightStatus'), mac = make('select', 'punchOutFightMac');
  const referee = make('select', 'punchOutFightReferee'), opponent = make('select', 'punchOutFightOpponent');
  const compose = make('button', 'punchOutFightCompose', 'Preview pose composition');
  const state = make('select', 'punchOutFightState'), updates = make('input', 'punchOutFightUpdates');
  const trace = make('button', 'punchOutFightTrace', 'Trace player / referee state');
  const frame = make('select', 'punchOutFightFrame'), canvas = make('canvas', 'punchOutFightPreview');
  const materialize = make('button', 'punchOutFightMaterialize', 'Open selected fight reference');
  const arena = make('button', 'punchOutFightEditArena', 'Edit native arena layout');
  const audio = make('button', 'punchOutFightAudio', 'Open source Audio');
  const detail = make('pre', 'punchOutFightDetails');
  status.setAttribute('role', 'status'); updates.type = 'number'; updates.min = '1'; updates.max = '600'; updates.value = '120';
  canvas.width = 256; canvas.height = 240; canvas.style.imageRendering = 'pixelated';
  for (const button of [compose, trace, materialize, arena, audio]) button.type = 'button';
  for (const button of [materialize]) button.disabled = true;
  function label(text, control) { const el = make('label', null, text + ' '); el.appendChild(control); root.appendChild(el); }
  root.append(summary, make('p', null, 'Source-defined opening placement and selected background commands. Mac and the referee are background layers; the opponent stays separate OAM. Reference edits save, but only the existing arena layout has a native writer.'), status);
  label('Little Mac command', mac); label('Referee / speech command', referee); label('Glass Joe source pose', opponent);
  root.appendChild(compose); label('Native player state', state); label('Native updates', updates); root.appendChild(trace);
  label('Observed excerpt frame', frame); root.append(canvas, materialize, arena, audio, detail);
  $('punchOutContentPanel').appendChild(root);
  const css = make('style'); css.textContent = '#punchOutFightPanel{margin-top:12px;padding:10px;border:1px solid var(--bdr)}#punchOutFightPanel label{display:inline-block;max-width:100%;margin:4px}#punchOutFightPanel select,#punchOutFightPanel input{max-width:100%;min-height:40px}#punchOutFightPreview{display:block;width:512px;max-width:100%;height:auto;background:#101018;margin:10px 0}#punchOutFightDetails{white-space:pre-wrap;max-height:240px;overflow:auto}';
  document.head.appendChild(css);
  let sourceHash = '', current = null, guard = null, request = null;
  function option(select, value, text) { const el = make('option', null, text); el.value = String(value); select.appendChild(el); }
  function reset() { current = guard = null; materialize.disabled = true; status.textContent = 'Preview the selected commands or trace a state. No project assets change during inspection.'; }
  function refresh() {
    const p = store.capture(), context = api.source(p);
    if (sourceHash !== context.sourceHash) {
      sourceHash = context.sourceHash; mac.replaceChildren(); referee.replaceChildren(); state.replaceChildren(); opponent.replaceChildren();
      option(referee, 'none', 'No referee command');
      for (const pose of context.model.poses) option(pose.family === 'mac' ? mac : referee, pose.selector, pose.label);
      for (const entry of context.model.states.filter(s => s.available)) option(state, entry.index, entry.index + ' · ' + entry.label);
      const fights = services.PunchOutContentRecovery.source(p).fights;
      for (const pose of fights[0].poses.filter(v => v.status === 'source-record')) option(opponent, pose.selector, pose.label);
      mac.value = '0'; referee.value = '144'; opponent.value = '0'; state.value = '3'; frame.replaceChildren(); reset();
    }
    return p;
  }
  function display(result) {
    current = result;
    const pixels = forgeCapture.scenePixels(makeScene(result.assets), true), ctx = canvas.getContext('2d');
    const image = ctx.createImageData(256, 240); image.data.set(pixels.rgba); ctx.putImageData(image, 0, 0);
    status.textContent = (result.trace ? 'Observed ' + result.trace.updates + ' native updates · ' + result.trace.frames.length +
      ' visual frames · ' + result.trace.stop : 'Source pose composition · native initial HUD · opening opponent position') +
      '. This is a source reference; full fight behavior and native reference writing remain open.' + (result.context.warning ? ' ' + result.context.warning : '');
    detail.textContent = JSON.stringify({selection: result.selection, nativeOutputSha256: result.context.outputHash,
      scrollX: result.frame.scrollX, nativeChrBanks: result.frame.mapper.chr,
      sourcePatternTiles: result.assets.raster.sources.length - 1,
      sourceOamSlots: result.assets.oam.length, audioRequests: result.trace?.audioEvents || [], limits: result.limits}, null, 2);
    materialize.disabled = false;
  }
  function preview(kind = 'composition') {
    const p = refresh(); request = kind === 'player-state' ? {kind, state: Number(state.value),
      maxUpdates: Number(updates.value), opponent: Number(opponent.value), frameIndex: 0} :
      {kind, mac: Number(mac.value), referee: referee.value === 'none' ? null : Number(referee.value), opponent: Number(opponent.value)};
    const expected = store.serialize(), epoch = store.state.epoch, result = api.preview(p, request);
    frame.replaceChildren();
    if (result.trace) result.trace.frames.forEach((f, i) => option(frame, i, 'Update ' + f.update + ' · duration ' + f.duration));
    else option(frame, 0, 'Selected pose composition');
    frame.value = '0'; frame.disabled = !result.trace; guard = {expected, epoch}; display(result); return true;
  }
  function selectFrame() {
    if (!request || request.kind !== 'player-state' || !guard) throw Error('Trace the source state again.');
    if (store.state.epoch !== guard.epoch || store.serialize() !== guard.expected) { reset(); throw Error('The project changed. Trace the state again.'); }
    request = {...request, frameIndex: Number(frame.value)}; display(api.preview(store.capture(), request)); return true;
  }
  function apply() {
    if (!current || !guard || !request) throw Error('Preview a source reference first.');
    const expected = guard.expected, epoch = guard.epoch;
    if (epoch !== store.state.epoch || expected !== store.serialize()) throw Error('The project changed. Preview the source reference again.');
    const result = api.recover(store.capture(), request), prepared = store.prepareLoad(result.project);
    if (epoch !== store.state.epoch || expected !== store.serialize()) throw Error('The project changed while preparing recovery.');
    if (snapshot() === false) throw Error('History could not preserve the current project. Save it before recovering.');
    store.commit(prepared, {sync: true, intent: 'punch-out-fight-reference'}); notify('punchOutFightReference');
    services.SceneContext.selectScene(result.sceneId); switchTab('scene'); reset();
    status.textContent = 'Opened a source fight reference. Undo restores the preceding project. Native arena painting remains available through Edit native arena layout.';
    return result.sceneId;
  }
  const safe = fn => () => { try { return fn(); } catch (error) { status.textContent = error.message; return false; } };
  compose.onclick = safe(() => preview()); trace.onclick = safe(() => preview('player-state'));
  frame.onchange = safe(selectFrame); materialize.onclick = safe(apply);
  for (const control of [mac, referee, opponent, state, updates]) control.onchange = reset;
  arena.onclick = safe(() => services.PunchOutArenaUI.open());
  audio.onclick = () => services.InvestigationUI.whenReady().then(() => {
    services.NativeAudioLibraryUI.open(true); switchTab('audio'); return true;
  }).catch(error => { status.textContent = error.message; return false; });
  const previousOpen = $('punchOutContentOpen').onclick;
  $('punchOutContentOpen').onclick = () => { const ok = previousOpen(); if (ok) { try { refresh(); } catch (error) { status.textContent = error.message; } } return ok; };
  // Raster is an existing rendering representation, not evidence that this
  // source composition came from live runtime capture. Label it accordingly.
  const priorStats = updateStats;
  updateStats = function(...args) {
    const result = priorStats.apply(this, args), box = $('captureDetails');
    const heading = box?.querySelector('h3');
    const reference = S.scenes[S.activeScene]?.captureMeta?.punchOutFight;
    if (reference) {
      if (heading && !heading.dataset.fightTitle) {
        heading.dataset.fightTitle = heading.textContent; heading.textContent = 'RECOVERED SOURCE REFERENCE';
      }
      $('captureCheck').textContent = 'Source command/state composition; full fight behavior and native reference writing remain open.';
      $('captureInfo').textContent = 'Native background bank/scroll context and separate opponent OAM are retained. Use Edit native arena layout for supported ROM changes.';
    } else if (heading?.dataset.fightTitle) {
      heading.textContent = heading.dataset.fightTitle; delete heading.dataset.fightTitle;
    }
    return result;
  };
  // The existing raster owner hides its single-bank browser. Keep the old
  // "Browse all CHR banks" action useful by navigating to the source arena.
  const priorChr = $('punchOutContentChr').onclick;
  $('punchOutContentChr').onclick = () => {
    if (S.scenes[S.activeScene]?.captureMeta?.punchOutFight)
      services.SceneContext.selectScene(services.PunchOutArenaRecovery.sceneId);
    return priorChr();
  };
  for (const type of ['keydown', 'keyup']) root.addEventListener(type, event => event.stopPropagation?.());
  services.PunchOutFightUI = Object.freeze({refresh, preview, selectFrame, apply,
    getState: () => ({sourceHash, ready: !!current, selection: request ? {...request} : null})});
})();
