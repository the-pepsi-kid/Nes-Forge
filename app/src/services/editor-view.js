/* Optional project browsing preferences, not canonical assets or runtime state.
 * ProjectStore includes this metadata only for portable/browser/recovery saves.
 * Default captures, native signatures and build serialization exclude it.
 * Restoring IDs never changes a pose's source Scene or the runtime start World.
 */
(() => {
  'use strict';
  const services = Forge.services;
  const tabs = new Set(['scene','chr','meta','attr','sprites','metasprites','code',
    'audio','collision','anim','world','docs','emu','disasm']);
  const id = value => typeof value === 'string' && value.length <= 255;
  function read(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const view = {};
    if (id(raw.worldId) && raw.worldId) view.worldId = raw.worldId;
    // Older files contain only worldId. Unknown future versions can still give
    // the old World hint, but cannot introduce new selection or navigation rules.
    if (raw.version === 1) {
      view.version = 1;
      for (const key of ['metaspriteId','pieceId']) if (id(raw[key])) view[key] = raw[key];
      if (tabs.has(raw.tab)) view.tab = raw.tab;
      if (['pose','whole'].includes(raw.chrUsage)) view.chrUsage = raw.chrUsage;
    }
    return view;
  }
  function capture() {
    const composer = window.Forge163?.metasprites, frame = composer?.current;
    const world = S.worlds?.[window.Forge161?.worlds?.state.selected];
    const piece = frame?.pieces.find(piece => piece.id === composer.state.pieceId);
    return {version: 1, ...(world ? {worldId: world.id} : {}),
      metaspriteId: frame?.id || '', pieceId: piece?.id || '',
      tab: tabs.has(S.tab) ? S.tab : 'scene', chrUsage: window.forgeCHR?.usageOnly ? 'pose' : 'whole'};
  }
  function restore(view, prior, refresh) {
    const composer = window.Forge163?.metasprites, frames = S.metasprites || [];
    const explicit = view?.version === 1 && Object.hasOwn(view, 'metaspriteId');
    let frame = frames.find(frame => frame.id === (explicit ? view.metaspriteId : prior?.metaspriteId));
    let reason = '', pieceId;
    if (frame) pieceId = (explicit ? view.pieceId : prior?.pieceId);
    else if (explicit && view.metaspriteId === '') reason = 'Saved without a selected pose. Choose a pose to inspect.';
    else {
      const matching = frames.filter(frame => frame.sceneId === S.scenes[S.activeScene]?.id);
      if (matching.length === 1) frame = matching[0];
      else reason = matching.length ? matching.length + ' poses use the active Scene. Choose a pose; no unrelated frame was selected.' :
        frames.length ? 'No pose uses the active Scene. Choose a pose to inspect independently.' : 'No poses in this project.';
    }
    composer?.restoreSelection(frame?.id || '', pieceId, reason);
    if (window.forgeCHR) window.forgeCHR.usageOnly = (view?.chrUsage || prior?.chrUsage) === 'pose';
    const bank = S.chrBank, editTile = S.editTile, selectedTile = S.selTile;
    refresh();
    if (view?.tab) switchTab(view.tab);
    // A native view deliberately chooses its usual buffer on first entry. A
    // versioned resume restores the user's saved explicit buffer after that entry,
    // using the existing renderer. No CHR bytes or Scene references are copied.
    if (view?.version === 1) {
      S.chrBank = bank;
      S.editTile = clamp(editTile, 0, Math.max(0, activeChr().length - 1));
      S.selTile = selectedTile;
      document.getElementById('bankBg').classList.toggle('on', bank === 'bg');
      document.getElementById('bankSpr').classList.toggle('on', bank === 'spr');
      render();
    }
    // Context refresh can initially follow the active Scene's sole World. Reapply
    // the saved independent World selection after that refresh without rebinding
    // either asset. Future explicit Scene navigation still uses SceneContext.
    const worldId = view?.worldId || prior?.worldId;
    const index = S.worlds.findIndex(world => world.id === worldId);
    if (index >= 0) {
      Forge161.worlds.state.selected = index;
      Forge161.worlds.renderUI();
      if (S.tab === 'world') Forge161.worlds.render();
    }
    services.SceneContextUI?.refresh();
    services.ResourceUsageUI?.refresh();
    window.NFContext04?.refresh();
  }
  services.EditorView = Object.freeze({read, capture, restore});
})();
