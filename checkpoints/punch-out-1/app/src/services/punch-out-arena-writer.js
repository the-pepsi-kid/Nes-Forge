/*
 * NES FORGE MODULE: src/services/punch-out-arena-writer.js
 * Entry: Forge.services.PunchOutArenaWriter
 * Purpose: Bridge canonical arena edits to the shared native build owner and expose a read-only capacity check.
 * Connections: registerSceneEncoder supplies matches/views/spans/encode to NativeResourceProject; RuntimeCompiler dispatch is unchanged.
 * Contract: views() masks only nt/attr for signatures. encode() must account for every changed byte within its exclusive spans.
 * Developer walkthrough: app/docs/NATIVE_RECOVERY_TUTORIAL.md
 * Bundle order: app/source-manifest.json; regenerate with app/tools/bundle.py.
 */
/* Canonical arena Scene arrays are the edit intent; the preserved ROM remains
 * the only source. The shared native owner masks only fields with this encoder. */
(() => {
  'use strict';
  const services = Forge.services,
    owner = services.NativeResourceProject,
    encoder = PunchOutArenaEncoder,
    id = services.PunchOutArenaRecovery.sceneId,
    cache = new Map(),
    limits = [
      'Arena tile placement and attribute palette IDs now rebuild in the original engine, within 381 compressed bytes shared by both background pages.',
      'The arena layout is shared by fights. Live HUD/player drawing may overwrite some cells.',
      'CHR artwork, palette colors, sprites, collision, Audio and gameplay edits still require their own native encoders.',
      'Tiles $FD/$FE control MMC2 CHR latches. Changing them may affect graphics during a live fight. Keep a saved project copy and check the rebuilt game.'
    ];
  const source = info => {
    const key = info.descriptor.sourceSha256;
    if (!cache.has(key)) {
      if (cache.size >= 2) cache.delete(cache.keys().next().value);
      cache.set(key, PunchOutArena.open(info.bytes));
    }
    return cache.get(key);
  };
  const scene = p => p.scenes.find(v => v.id === id),
    matches = (p, info) => info.adapter.kind === 'punch-out' && !!scene(p);

  function check(p, info) {
    const sc = scene(p);
    if (sc.captureMeta?.punchOutArena?.sourceSha256 !== info.descriptor.sourceSha256) throw Error(
      'Punch-Out arena build: Scene belongs to another source.');
    return sc;
  }
  owner.registerSceneEncoder({
    id: 'punch-out-arena-layout-v1',
    matches,
    /* Only these fields have an inverse encoder. Returning the unedited source view
     * for signature checks does not rewrite or discard the edited Scene. */
    views(p, info) {
      check(p, info);
      const a = source(info),
        sc = scene(p);
      if (JSON.stringify(sc.chr) !== JSON.stringify(a.chr) || JSON.stringify(sc.pal) !== JSON
        .stringify(a.palette)) throw Error(
        'Punch-Out arena: CHR artwork or palette colors changed without a native encoder. Tile placement and attribute palette IDs are supported.'
        );
      return [{
        id,
        nt: a.nt,
        attr: a.attr
      }];
    },
    spans: () => encoder.spans,
    /* bytes already includes native brush recipes. The encoder composes its disjoint
     * arena writes over that candidate and preserves all preceding changes. */
    encode(bytes, p, info) {
      const result = encoder.encode(bytes, check(p, info), source(info)),
        diagnostics = [{
          severity: 'info',
          code: 'punch-out-arena-layout',
          phase: 'native-encode',
          message: result.changed ? 'Arena: ' + result.changedCells + ' tile cell(s), ' +
            result.changedAttributes + ' attribute byte(s); ' + result.used + '/' + result
            .capacity + ' compressed bytes. Original engine and CHR preserved.' :
            'Arena layout unchanged; original bytes preserved.'
        }];
      if (result.latchChanges) diagnostics.push({
        severity: 'warning',
        code: 'punch-out-arena-latches',
        phase: 'native-encode',
        message: result.latchChanges +
          ' changed cell(s) involve $FD/$FE CHR-latch controls. Check live fight graphics.'
      });
      return {
        bytes: result.bytes,
        diagnostics
      };
    }
  });

  function preview(p) {
    const info = owner.validate(p);
    if (!matches(p, info)) throw Error('Select a recovered Punch-Out arena first.');
    return encoder.encode(info.encoded.bytes, check(p, info), source(info));
  }
  services.PunchOutArenaWriter = Object.freeze({
    preview,
    limits
  });
  const status = document.getElementById('punchOutArenaStatus'),
    button = document.createElement('button');
  button.id = 'punchOutArenaBuildCheck';
  button.type = 'button';
  button.textContent = 'Check arena build';
  status.textContent = limits.join(' ');
  status.before(button);
  button.onclick = () => {
    try {
      const p = services.ProjectStore.capture();
      owner.validate(p, {
        build: true
      });
      const r = preview(p);
      status.textContent = (r.changed ? 'Ready: ' + r.changedCells + ' changed tiles · ' + r
          .used + '/' + r.capacity + ' compressed bytes.' : 'Ready: arena unchanged.') + ' ' +
        limits.join(' ');
      return true;
    } catch (e) {
      status.textContent = e.message;
      showToast(e.message);
      return false;
    }
  };
})();
