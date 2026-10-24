/*
 * NES FORGE MODULE: src/re/punch-out-states-ui.js
 * Entry: Forge.services.PunchOutStatesUI
 * Purpose: Preview bounded state excerpts, materialize Animation assets, and inspect linked native sound requests.
 * Connections: PunchOutStateRecovery supplies assets; existing SceneContext/Animation/Audio editors remain the owners.
 * Contract: Native sound inspection is separate from tracker conversion or native sound writing.
 * Developer walkthrough: app/docs/NATIVE_RECOVERY_TUTORIAL.md
 * Bundle order: app/source-manifest.json; regenerate with app/tools/bundle.py.
 */
/* Add state excerpts to the existing source-content browser. */
(() => {
  'use strict';
  const services = Forge.services,
    api = services.PunchOutStateRecovery,
    store = services.ProjectStore,
    $ = id => document.getElementById(id),
    el = (tag, id, text) => {
      const n = document.createElement(tag);
      if (id) n.id = id;
      if (text !== undefined) n.textContent = text;
      return n;
    };
  let session = null,
    identity = '',
    fight = -1,
    trace = null,
    bundle = null,
    guard = null,
    eventLinks = [];
  const root = el('details', 'punchOutStatesPanel'),
    title = el('summary', null, 'State animation excerpts'),
    note = el('p', null,
      'Trace the original state routines, including sprite-size changes and incremental poses. These are bounded excerpts with explicit starting conditions.'
      ),
    state = el('select', 'punchOutStateSelect'),
    updates = el('input', 'punchOutStateUpdates'),
    run = el('button', 'punchOutStateTrace', 'Trace state'),
    copy = el('button', 'punchOutStateRecover', 'Open recovered animation'),
    status = el('p', 'punchOutStateStatus'),
    frame = el('input', 'punchOutStateFrame'),
    canvas = el('canvas', 'punchOutStatePreview'),
    details = el('pre', 'punchOutStateDetails');
  const requests = el('select', 'punchOutStateAudioRequest'),
    sound = el('button', 'punchOutStateAudioOpen', 'Inspect linked sound');
  sound.type = 'button';
  sound.disabled = requests.disabled = true;
  details.style.whiteSpace = 'pre-wrap';
  details.style.maxHeight = '240px';
  details.style.overflow = 'auto';
  updates.type = 'number';
  updates.min = '1';
  updates.max = '600';
  updates.value = '240';
  frame.type = 'range';
  frame.min = '0';
  frame.max = '0';
  frame.value = '0';
  canvas.width = 256;
  canvas.height = 240;
  canvas.style.imageRendering = 'pixelated';
  copy.disabled = frame.disabled = true;
  run.type = copy.type = 'button';
  status.setAttribute('role', 'status');
  root.append(title, note, el('label', null, 'Source state '), state, el('label', null,
    ' Native updates '), updates, run, status, frame, canvas, copy, el('label', null,
    ' Source Audio requests '), requests, sound, details);
  $('punchOutContentPanel').appendChild(root);

  function reset() {
    trace = bundle = guard = null;
    eventLinks = [];
    requests.replaceChildren();
    sound.disabled = requests.disabled = true;
    copy.disabled = frame.disabled = true;
    canvas.getContext('2d').clearRect(0, 0, 256, 240);
    details.textContent = '';
  }

  function refresh() {
    const p = store.capture();
    if (!services.PunchOutContentRecovery.matches(p)) return false;
    const selected = Number($('punchOutContentFight').value) || 0;
    if (identity !== p.nativeGame.sourceSha256 || fight !== selected) {
      identity = p.nativeGame.sourceSha256;
      fight = selected;
      session = api.source(p);
      reset();
      state.replaceChildren();
      for (const item of session.states[fight]) {
        if (!item.available) continue;
        const o = el('option', null, item.label);
        o.value = String(item.index);
        state.appendChild(o);
      }
      state.value = String(session.states[fight].find(s => s.available)?.index || 0);
      status.textContent = session.states[fight].filter(s => s.available).length +
        ' primary states available for this fight.';
    }
    return true;
  }

  function draw() {
    if (!trace || !bundle) return;
    const index = Number(frame.value),
      m = bundle.metasprites[index],
      scene = bundle.scenes.find(s => s.id === m.sceneId),
      ctx = canvas.getContext('2d'),
      im = ctx.createImageData(256, 240),
      bounds = bundle.metasprites.map(m => Forge163.metasprites.bounds(m)),
      left = Math.min(...bounds.map(b => b.x)),
      top = Math.min(...bounds.map(b => b.y)),
      right = Math.max(...bounds.map(b => b.right)),
      bottom = Math.max(...bounds.map(b => b.bottom)),
      ox = Math.floor((256 - (right - left)) / 2) - left,
      oy = Math.floor((240 - (bottom - top)) / 2) - top;
    for (let p = 0; p < 256 * 240; p++) im.data.set([21, 21, 21, 255], p * 4);
    for (const piece of m.pieces.slice().reverse())
      for (let y = 0; y < m.spriteMode; y++)
        for (let x = 0; x < 8; x++) {
          const fy = piece.flipV ? m.spriteMode - 1 - y : y,
            fx = piece.flipH ? 7 - x : x,
            ci = scene.sprChr[fy < 8 ? piece.tile : piece.tile2][fy & 7][fx],
            px = ox + piece.x + x,
            py = oy + piece.y + y;
          if (ci && px >= 0 && px < 256 && py >= 0 && py < 240) im.data.set([...(NP[scene.sprPal[
            piece.pal][ci]] || [0, 0, 0]), 255], (py * 256 + px) * 4);
        }
    ctx.putImageData(im, 0, 0);
    const f = trace.frames[index];
    status.textContent = 'Frame ' + index + ' · update ' + f.update + ' · duration ' + f
      .duration + ' · ' + f.spriteMode + '-pixel sprites · CHR ' + f.chrBank4KiB +
      '. Centered excerpt preview; hardware scanline clipping is not simulated.';
  }

  function inspect() {
    if (!refresh()) throw Error('Open a Punch-Out source project first.');
    reset();
    const p = store.capture(),
      before = store.serialize(),
      epoch = store.state.epoch,
      result = api.preview(p, fight, Number(state.value), Number(updates.value));
    if (epoch !== store.state.epoch || before !== store.serialize()) throw Error(
      'The project changed. Trace again.');
    trace = result;
    const catalog = services.NativeAudioLibraryUI.catalog();
    if (catalog?.source?.sha256 === identity) {
      for (const event of trace.audioEvents) {
        const cue = catalog.cues.find(c => c.requestRegister === event.register && c
          .requestValue === event.value);
        if (cue) {
          eventLinks.push({
            cueId: cue.id,
            profile: catalog.profile.id,
            update: event.update
          });
          const o = el('option', null, 'Update ' + event.update + ' · ' + cue.label);
          o.value = String(eventLinks.length - 1);
          requests.appendChild(o);
        }
      }
    }
    if (eventLinks.length) {
      requests.value = '0';
      sound.disabled = requests.disabled = false;
    }
    details.textContent = JSON.stringify({
      updates: trace.updates,
      frames: trace.frames.length,
      stop: trace.stop,
      truncated: trace.truncated,
      spriteModes: [...new Set(trace.frames.map(f => f.spriteMode))],
      incrementalFrames: trace.frames.filter(f => f.selector >= 128).length,
      audioRequests: trace.audioEvents,
      assumptions: trace.assumptions
    }, null, 2);
    if (!trace.editable) {
      status.textContent = 'Excerpt refused: ' + trace.stop + (trace.pendingFrames ?
        ' · unresolved graphics context' : '');
      return false;
    }
    bundle = api.assets(p, trace);
    guard = {
      epoch,
      snapshot: before,
      fight,
      state: Number(state.value),
      updates: Number(updates.value)
    };
    copy.disabled = frame.disabled = false;
    frame.max = String(trace.frames.length - 1);
    frame.value = '0';
    draw();
    return true;
  }

  function materialize() {
    if (!guard || !trace?.editable) throw Error('Trace the selected state first.');
    if (guard.epoch !== store.state.epoch || guard.snapshot !== store.serialize()) throw Error(
      'The project changed. Trace again before recovering.');
    const result = api.recover(store.capture(), guard.fight, guard.state, guard.updates),
      prepared = store.prepareLoad(result.project);
    if (snapshot() === false) throw Error(
      'History could not preserve the project. Save before recovering.');
    store.commit(prepared, {
      sync: true,
      intent: 'punch-out-state-recovery'
    });
    notify('punchOutStateRecovery');
    S._selAnim = S.animations.findIndex(a => a.id === result.animationId);
    S._animFrame = 0;
    const m = S.metasprites.find(m => m.id === S.animations[S._selAnim].frames[0].metaspriteId);
    services.SceneContext.selectScene(m.sceneId);
    anim_updateSidebar();
    Forge164.frameEditor.refresh();
    switchTab('anim');
    status.textContent = 'Recovered ' + trace.frames.length +
      ' timed frames into Animation. Undo restores the prior project. Native source writing remains limited to the existing background recipes.';
    guard = null;
    copy.disabled = true;
    return result.animationId;
  }

  function openAudio() {
    const p = store.capture(),
      event = eventLinks[Number(requests.value)];
    if (!event || p.nativeGame?.sourceSha256 !== identity) throw Error(
      'Trace the matching source again.');
    return services.NativeAudioLibraryUI.selectCue(event.cueId, {
      sourceSha256: identity,
      profile: event.profile
    });
  }
  const safe = fn => () => {
    try {
      return fn();
    } catch (e) {
      status.textContent = e.message;
      return false;
    }
  };
  run.onclick = safe(inspect);
  sound.onclick = safe(openAudio);
  copy.onclick = safe(materialize);
  frame.oninput = draw;
  state.onchange = updates.onchange = reset;
  const oldOpen = $('punchOutContentOpen').onclick;
  $('punchOutContentOpen').onclick = () => {
    const ok = oldOpen();
    if (ok) refresh();
    return ok;
  };
  const oldFight = $('punchOutContentFight').onchange;
  $('punchOutContentFight').onchange = () => {
    oldFight();
    refresh();
  };
  services.PunchOutStatesUI = Object.freeze({
    refresh,
    inspect,
    materialize,
    draw,
    openAudio,
    getState: () => ({
      ready: !!guard,
      fight,
      state: Number(state.value),
      frames: trace?.frames.length || 0,
      updates: trace?.updates || 0,
      stop: trace?.stop || null
    })
  });
})();
