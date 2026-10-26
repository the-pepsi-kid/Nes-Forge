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
  const noteText = 'Move a complete Glass Joe pose in the original engine: 30 full poses and 5 incremental poses with explicit X/Y. Incremental previews retain preceding OAM from a declared native state. Idle uses $C0/$C2/$C4; keep them together to preserve the original bob. Each physical record affects all its native uses. The C-family uses the original screen-height priority rule, so vertical moves can place pieces behind ring graphics. Position-less records inherit earlier offsets. Shared geometry, tile streams and animation timing need separate writers.';
  const note = make('p', 'punchOutPoseNote', noteText);
  launch.append(make('summary', null, 'Native pose positions · Glass Joe'), choice, open, note);
  // Keep the native writer beside the source pickers, above the tall reference
  // preview. The ordinary Pose picker below remains a source-inspection tool.
  launch.open = true;
  document.getElementById('punchOutContentInventory').after(launch);
  const controls = make('section', 'punchOutPoseControls'), x = make('input', 'punchOutPoseX'), y = make('input', 'punchOutPoseY');
  const apply = make('button', 'punchOutPoseApply', 'Apply native pose position'), check = make('button', 'punchOutPoseCheck', 'Check native pose build');
  const tiles = make('button', 'punchOutPoseTiles', 'View pose sprite tiles');
  const artwork = make('button', 'punchOutPoseArtwork', 'Edit native sprite artwork');
  const idle = make('input', 'punchOutPoseIdleGroup'), idleLabel = make('label', 'punchOutPoseIdleLabel');
  idle.type = 'checkbox'; idle.checked = false; idleLabel.hidden = true;
  idle.setAttribute('aria-label', 'Keep idle poses together');
  idleLabel.append(idle, make('span', null, ' Keep idle poses together ($C0/$C2/$C4; adds missing views)'));
  const status = make('p', 'punchOutPoseStatus'); status.setAttribute('role', 'status');
  for (const [input, axis] of [[x, 'X'], [y, 'Y']]) {input.type = 'number'; input.min = '-128'; input.max = '127'; input.step = '1';
    input.setAttribute('aria-label', 'Native pose offset ' + axis);}
  apply.type = check.type = 'button'; controls.hidden = true;
  controls.append(make('h3', null, 'NATIVE GLASS JOE POSE POSITION'), make('p', null,
    'X/Y are signed source offsets relative to the game’s moving opponent anchor. Apply moves every original piece together in one Undo step. C-family priority follows the original OAM Y=$50 divider. Individual geometry and manual flag changes have no native writer.'),
    make('label', null, 'Native X '), x, make('label', null, ' Y '), y, idleLabel, apply, check, tiles, artwork, status);
  document.getElementById('msEditor163').before(controls);
  controls.style.cssText = 'border:1px solid var(--bdr);padding:8px;margin:8px 0;font-size:11px';
  x.style.width = y.style.width = '65px';
  const active = () => window.Forge163?.metasprites?.current;

  // This strip sits with the sheet, so navigation survives a scrolled inspector.
  // It links existing owners: pose sprChr is a reference; physical-bank chr is
  // the registered ROM writer. No pixels, signatures or project recipes move
  // between those buffers merely because the user changes editor tabs.
  const chrContext = make('section', 'punchOutChrContext');
  const chrInfo = make('p', 'punchOutChrInfo');
  const chrTiles = make('button', 'punchOutChrTiles', 'Show pose sprite tiles');
  const chrArtwork = make('button', 'punchOutChrArtwork', 'Edit native sprite artwork');
  const chrPose = make('button', 'punchOutChrPose', 'Open native pose position');
  chrContext.setAttribute('aria-label', 'Punch-Out artwork context');
  chrContext.hidden = true; chrContext.append(chrInfo, chrTiles, chrArtwork, chrPose);
  document.getElementById('cv').before(chrContext);
  const css = make('style');
  css.textContent = '#punchOutChrContext[hidden]{display:none!important}#punchOutChrContext{align-self:stretch;flex:0 0 auto;box-sizing:border-box;max-width:100%;padding:10px;border:1px solid var(--bdr);background:var(--bg2);font:12px/1.5 system-ui;overflow-wrap:anywhere}#punchOutChrContext p{margin:0 0 8px}#punchOutChrContext button{margin:3px;min-height:36px;padding:6px 9px;background:var(--bg3);color:var(--txt);border:1px solid var(--bdr);cursor:pointer}#leftP.punch-out-chr-context{flex-direction:column}#leftP.punch-out-chr-context>#cv{flex-shrink:0}';
  document.head.appendChild(css);
  let chrSceneKey = '', chrSceneRef = null, metadataKey = '', metadata = null, returnPose = null;
  const poseMarker = scene => scene?.captureMeta?.punchOutPose || scene?.captureMeta?.punchOutIncrementalPose;
  function poseMetadata(scene) {
    const marker = poseMarker(scene);
    if (!marker || !S.metasprites.some(frame => frame.id === api.frameId(marker.selector) && frame.sceneId === scene.id)) return null;
    const key = marker.sourceSha256 + ':' + scene.id;
    if (key !== metadataKey) {
      metadataKey = ''; metadata = api.describe(store.capture(), api.frameId(marker.selector)); metadataKey = key;
    }
    return metadata;
  }
  function refreshChrContext() {
    const scene = S.scenes[S.activeScene], marker = poseMarker(scene), art = scene?.captureMeta?.punchOutArt;
    const physical = art?.kind === 'chr';
    const visible = S.tab === 'chr' && !!(marker || physical);
    chrContext.hidden = !visible;
    document.getElementById('leftP').classList.toggle('punch-out-chr-context', visible);
    if (!visible) {chrSceneKey = ''; chrSceneRef = null; return;}
    const key = (marker || art).sourceSha256 + ':' + scene.id;
    // Select the correct buffer on entry/Scene change, while still allowing an
    // explicit BG/Sprite toggle in the current sheet. This is editor view state.
    if (key !== chrSceneKey || scene !== chrSceneRef) {
      S.chrBank = marker ? 'spr' : 'bg'; chrSceneKey = key; chrSceneRef = scene;
      document.getElementById('bankBg').classList.toggle('on', S.chrBank === 'bg');
      document.getElementById('bankSpr').classList.toggle('on', S.chrBank === 'spr');
    }
    try {
      const value = marker ? poseMetadata(scene) : null;
      if (marker && !value) throw Error('The native pose frame is missing. Reopen its native pose shortcut.');
      const back = physical && returnPose?.sourceSha256 === art.sourceSha256 && returnPose.bank === art.index;
      chrTiles.hidden = chrArtwork.hidden = !value;
      chrPose.hidden = !value && !back;
      chrArtwork.disabled = !value;
      if (value) {
        chrArtwork.textContent = 'Edit native CHR bank ' + value.chrBank4KiB;
        chrInfo.textContent = 'Glass Joe pose $' + value.selector.toString(16).toUpperCase().padStart(2, '0') +
          ' · ' + (S.chrBank === 'spr' ? 'Sprite Bank ($1000)' : 'Background bank selected — choose Show pose sprite tiles') +
          '. These tiles are a pose-source snapshot. Use Edit native CHR bank ' + value.chrBank4KiB +
          ' to change shared game pixels; use Metasprites to change pose position.';
      } else chrInfo.textContent = 'Native artwork · physical CHR bank ' + art.index +
        '. Edit pixels in BG Bank ($0000). Build & Run uses these changes across shared game uses. Earlier pose previews retain their source snapshots.';
    } catch (error) {
      chrInfo.textContent = error.message;
      chrTiles.hidden = chrArtwork.hidden = chrPose.hidden = true;
    }
  }
  function viewTiles(id) {
    const frame = S.metasprites.find(frame => frame.id === id);
    if (!frame) throw Error('Select a native pose first.');
    services.SceneContext.selectScene(frame.sceneId); setChrBank('spr'); switchTab('chr');
    chrContext.scrollIntoView?.({block: 'nearest'});
  }
  function editArtwork(id) {
    const value = api.describe(store.capture(), id);
    if (!value) throw Error('Select a native pose first.');
    const sourceSha256 = poseMarker(S.scenes.find(scene => scene.id === value.sceneId)).sourceSha256;
    services.PunchOutArtUI.open('chr', value.chrBank4KiB);
    returnPose = {sourceSha256, selector: value.selector, bank: value.chrBank4KiB};
    refreshChrContext(); chrContext.scrollIntoView?.({block: 'nearest'});
  }
  const safeNavigation = (fn, target) => () => {try {fn();} catch (error) {target.textContent = error.message;}};
  tiles.onclick = safeNavigation(() => viewTiles(active()?.id), status);
  artwork.onclick = safeNavigation(() => editArtwork(active()?.id), status);
  chrTiles.onclick = safeNavigation(() => viewTiles(poseMetadata(S.scenes[S.activeScene])?.frameId), chrInfo);
  chrArtwork.onclick = safeNavigation(() => editArtwork(poseMetadata(S.scenes[S.activeScene])?.frameId), chrInfo);
  chrPose.onclick = safeNavigation(() => {
    const marker = poseMarker(S.scenes[S.activeScene]);
    openPose(marker ? marker.selector : returnPose.selector);
  }, chrInfo);
  for (const button of [tiles, artwork, chrTiles, chrArtwork, chrPose]) button.type = 'button';
  const previousRender = render;
  render = function() {refreshChrContext(); return previousRender();};
  const previousSwitch = switchTab;
  switchTab = function(tab) {const result = previousSwitch(tab); refreshChrContext(); return result;};
  function refresh() {
    const frame = active(), scene = S.scenes.find(scene => scene.id === frame?.sceneId);
    controls.hidden = !(scene?.captureMeta?.punchOutPose || scene?.captureMeta?.punchOutIncrementalPose);
    if (controls.hidden) return;
    try {
      const value = api.describe(store.capture(), frame.id);
      if (!value) throw Error('This frame is not an owned native pose view.');
      if (document.activeElement !== x) x.value = String(value.x);
      if (document.activeElement !== y) y.value = String(value.y);
      idleLabel.hidden = !api.idleSelectors.includes(value.selector);
      status.textContent = (value.kind === 'incremental' ? 'Incremental pose $' : 'Pose $') + value.selector.toString(16).toUpperCase().padStart(2, '0') +
        ' · source offsets ' + value.x + ', ' + value.y + ' · movement ' + value.dx + ', ' + value.dy +
        (value.context ? ' · observed state $' + value.context.state.toString(16).toUpperCase().padStart(2, '0') + ', update ' + value.context.update +
          ' · native anchor ' + value.context.anchorX + ', ' + value.context.anchorY : '') +
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
    services.SceneContext.selectScene(result.sceneId); Forge163.metasprites.select(result.frameId); setChrBank('spr'); switchTab('metasprites'); refresh();
    return result.frameId;
  }
  open.onclick = () => {try {const id = openPose(Number(choice.value)); note.textContent = noteText; return id;} catch (error) {note.textContent = error.message; return false;}};
  apply.onclick = () => {try {
    const frame = active(), expected = store.serialize(), epoch = store.state.epoch;
    if (!x.value.trim() || !y.value.trim()) throw Error('Enter both signed native offsets.');
    const project = store.capture(), value = api.describe(project, frame?.id);
    const next = idle.checked && value && api.idleSelectors.includes(value.selector)
      ? api.moveIdle(project, frame.id, Number(x.value), Number(y.value))
      : api.move(project, frame?.id, Number(x.value), Number(y.value));
    if (expected !== store.serialize() || epoch !== store.state.epoch) throw Error('Project changed. Apply again from the current pose.');
    if (JSON.stringify(next) !== JSON.stringify(store.capture())) install(next, 'nativePosePosition');
    Forge163.metasprites.select(frame.id);
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
