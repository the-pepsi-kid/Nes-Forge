/* Native artwork uses the existing CHR/palette editors after explicit source
 * selection. Opening a physical resource is one ordinary ProjectStore transaction.
 * Reference snapshots remain inspectable; source-owner checks block stale rebases. */
(() => {
  'use strict';
  const services = Forge.services, store = services.ProjectStore, api = services.PunchOutArtProject;
  const make = (tag, id, text) => { const el = document.createElement(tag); if (id) el.id = id;
    if (text !== undefined) el.textContent = text; return el; };
  const root = make('details', 'punchOutArtPanel'), banks = make('select', 'punchOutArtBank');
  const palettes = make('select', 'punchOutArtPalette'), status = make('p', 'punchOutArtStatus');
  const openBank = make('button', 'punchOutArtOpenBank', 'Edit physical CHR bank');
  const openPalette = make('button', 'punchOutArtOpenPalette', 'Edit native fight palette');
  const check = make('button', 'punchOutArtCheck', 'Check native artwork build');
  for (let i = 0; i < 32; i++) { const o = make('option', null, 'Physical CHR bank ' + i); o.value = String(i); banks.appendChild(o); }
  status.setAttribute('role', 'status');
  root.append(make('summary', null, 'Native artwork · CHR banks and fight palettes'),
    make('p', null, 'Edit pixels in a dedicated physical CHR view, or colors in a dedicated fight-palette view. Shared native uses change together. Existing recovered copies remain source snapshots; new fight previews and Build & Run use the current encoded art. A CHR view uses a display palette only. Palette-table slots can be overridden by game routines in some phases.'),
    banks, openBank, palettes, openPalette, check, status);
  document.getElementById('punchOutContentPanel').appendChild(root);
  function refresh() {
    palettes.replaceChildren();
    for (const fight of api.inventory(store.capture())) {
      const o = make('option', null, fight.label); o.value = String(fight.index); palettes.appendChild(o);
    }
    palettes.value = '0';
  }
  function open(kind, index) {
    const expected = store.serialize(), epoch = store.state.epoch, result = api.prepare(store.capture(), kind, index);
    if (expected !== store.serialize() || epoch !== store.state.epoch) throw Error('The project changed. Open the artwork again.');
    if (result.added) {
      const prepared = store.prepareLoad(result.project);
      if (snapshot() === false) throw Error('History could not preserve the current project. Save it first.');
      store.commit(prepared, {sync: true, intent: 'punch-out-native-art'}); notify('punchOutNativeArt');
    }
    services.SceneContext.selectScene(result.sceneId);
    // Physical-bank views own the background CHR buffer, even when the source
    // artwork is used by sprites. Do not inherit a pose's Sprite Bank selection.
    if (kind === 'chr') setChrBank('bg');
    switchTab('chr');
    status.textContent = kind === 'chr' ? 'Edit background CHR pixels in this physical bank view. Its display palette is not a native palette edit. Save/reopen and Build & Run; shared uses change together.' :
      'Edit background/sprite palette colors in this dedicated table view. Save/reopen and Build & Run. Universal color slots are linked; game routines can override some entries.';
    return result.sceneId;
  }
  const safe = fn => () => { try { return fn(); } catch (e) { status.textContent = e.message; return false; } };
  openBank.onclick = safe(() => open('chr', Number(banks.value)));
  openPalette.onclick = safe(() => open('palette', Number(palettes.value)));
  check.onclick = safe(() => { const result = services.NativeResourceProject.build(store.capture());
    status.textContent = result.metadata.changes.length + ' native byte change(s). Check the built game and a fresh fight reference; unsupported edits still refuse.'; return true; });
  for (const b of [openBank, openPalette, check]) b.type = 'button';
  const previous = document.getElementById('punchOutContentOpen').onclick;
  document.getElementById('punchOutContentOpen').onclick = () => { const ok = previous(); if (ok) { try { refresh(); } catch (e) { status.textContent = e.message; } } return ok; };
  for (const type of ['keydown', 'keyup']) root.addEventListener(type, e => e.stopPropagation?.());
  services.PunchOutArtUI = Object.freeze({refresh, open});
})();
