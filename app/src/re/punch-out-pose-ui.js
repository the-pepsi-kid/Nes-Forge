/* Native pose placement is a shortcut into existing canonical Metasprites.
 * Source ownership/encoding stays in PunchOutPoseProject/NativeResourceProject;
 * ProjectStore and the ordinary history engine own each explicit user edit.
 */
(() => {
  'use strict';
  const services = Forge.services, api = services.PunchOutPoseProject, store = services.ProjectStore;
  const make = (tag, id, text) => {const node = document.createElement(tag); if (id) node.id = id;
    if (text !== undefined) node.textContent = text; return node;};
  const launch = make('details', 'punchOutPosePanel'), choice = make('select', 'punchOutPoseChoice');
  const open = make('button', 'punchOutPoseOpen', 'Edit native Glass Joe pose position');
  for (const item of api.inventory()) {const option = make('option', null, item.label); option.value = String(item.selector); choice.appendChild(option);}
  choice.value = '0'; open.type = 'button';
  const note = make('p', 'punchOutPoseNote', 'Move a complete Glass Joe full pose in the original engine. Each view uses an ordinary Metasprite and a source-art snapshot. The two native X/Y offsets are writable; individual pieces, shared geometry, tile streams and animation timing need separate writers. Check the built game after moving a pose.');
  launch.append(make('summary', null, 'Native pose positions · Glass Joe'), note, choice, open);
  document.getElementById('punchOutContentPanel').appendChild(launch);
  const controls = make('section', 'punchOutPoseControls'), x = make('input', 'punchOutPoseX'), y = make('input', 'punchOutPoseY');
  const apply = make('button', 'punchOutPoseApply', 'Apply native pose position'), check = make('button', 'punchOutPoseCheck', 'Check native pose build');
  const status = make('p', 'punchOutPoseStatus'); status.setAttribute('role', 'status');
  for (const [input, axis] of [[x, 'X'], [y, 'Y']]) {input.type = 'number'; input.min = '-128'; input.max = '127'; input.step = '1';
    input.setAttribute('aria-label', 'Native full-pose offset ' + axis);}
  apply.type = check.type = 'button'; controls.hidden = true;
  controls.append(make('h3', null, 'NATIVE GLASS JOE POSE POSITION'), make('p', null,
    'X/Y are signed source offsets relative to the game’s moving opponent anchor. Apply moves every original piece together in one Undo step. Individual piece changes remain editable/savable but have no native geometry writer.'),
    make('label', null, 'Native X '), x, make('label', null, ' Y '), y, apply, check, status);
  document.getElementById('msEditor163').before(controls);
  controls.style.cssText = 'border:1px solid var(--bdr);padding:8px;margin:8px 0;font-size:11px';
  x.style.width = y.style.width = '65px';
  const active = () => window.Forge163?.metasprites?.current;
  function refresh() {
    const frame = active(), scene = S.scenes.find(scene => scene.id === frame?.sceneId);
    controls.hidden = !scene?.captureMeta?.punchOutPose;
    if (controls.hidden) return;
    try {
      const value = api.describe(store.capture(), frame.id);
      if (!value) throw Error('This frame is not an owned native pose view.');
      if (document.activeElement !== x) x.value = String(value.x);
      if (document.activeElement !== y) y.value = String(value.y);
      status.textContent = 'Pose $' + value.selector.toString(16).toUpperCase().padStart(2, '0') +
        ' · source offsets ' + value.x + ', ' + value.y + ' · movement ' + value.dx + ', ' + value.dy +
        '. Position changes visual placement; attack/damage rules retain their original code.';
    } catch (error) {status.textContent = error.message;}
  }
  function install(project, intent) {
    const prepared = store.prepareLoad(project);
    if (snapshot() === false) throw Error('History could not preserve this project. Save before editing.');
    store.commit(prepared, {sync: true, intent}); notify(intent);
  }
  function openPose(selector) {
    const expected = store.serialize(), epoch = store.state.epoch, result = api.prepare(store.capture(), selector);
    if (expected !== store.serialize() || epoch !== store.state.epoch) throw Error('Project changed. Select the native pose again.');
    if (result.added) install(result.project, 'nativePoseOpen');
    services.SceneContext.selectScene(result.sceneId); Forge163.metasprites.select(result.frameId); switchTab('metasprites'); refresh();
    return result.frameId;
  }
  open.onclick = () => {try {return openPose(Number(choice.value));} catch (error) {note.textContent = error.message; return false;}};
  apply.onclick = () => {try {
    const frame = active(), expected = store.serialize(), epoch = store.state.epoch;
    if (!x.value.trim() || !y.value.trim()) throw Error('Enter both signed native offsets.');
    const next = api.move(store.capture(), frame?.id, Number(x.value), Number(y.value));
    if (expected !== store.serialize() || epoch !== store.state.epoch) throw Error('Project changed. Apply again from the current pose.');
    if (JSON.stringify(next) !== JSON.stringify(store.capture())) install(next, 'nativePosePosition');
    refresh(); return true;
  } catch (error) {status.textContent = error.message; return false;}};
  check.onclick = () => {try {
    const built = services.NativeResourceProject.build(store.capture());
    status.textContent = built.metadata.changes.length + ' total native byte change(s). Download/build, then inspect this pose in the original game.'; return true;
  } catch (error) {status.textContent = error.message; return false;}};
  document.getElementById('msFrames163').addEventListener('change', () => queueMicrotask(refresh));
  document.querySelector('[data-view="metasprites"]')?.addEventListener('click', () => queueMicrotask(refresh));
  window.addEventListener('forge:metasprites-changed', refresh);
  const watch = new MutationObserver(() => queueMicrotask(refresh));
  watch.observe(document.getElementById('msFrames163'), {childList: true});
  for (const type of ['keydown', 'keyup']) controls.addEventListener(type, event => event.stopPropagation?.());
  services.PunchOutPoseUI = Object.freeze({open: openPose, refresh});
})();
