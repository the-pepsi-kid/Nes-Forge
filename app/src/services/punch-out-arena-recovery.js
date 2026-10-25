/*
 * NES FORGE MODULE: src/services/punch-out-arena-recovery.js
 * Entry: Forge.services.PunchOutArenaRecovery
 * Purpose: Add the ring/audience Scene to new or existing recovered projects.
 * Connections: Wraps NativeResourceProject.create; uses makeScene and the same projection signature as other recovered assets.
 * Contract: Stable Scene IDs and capture metadata preserve saved projects. Recovering over divergent local assets refuses.
 * Developer walkthrough: app/docs/NATIVE_RECOVERY_TUTORIAL.md
 * Bundle order: app/source-manifest.json; regenerate with app/tools/bundle.py.
 */
/* Add the missing arena reference through the existing Scene/source owners. */
(() => {
  'use strict';
  const services = Forge.services,
    base = services.NativeResourceProject,
    content = services.PunchOutContentRecovery,
    copy = v => JSON.parse(JSON.stringify(v)),
    id = 'po-arena-setup-ring-crowd-v1';

  function assets(p) {
    if (!content.matches(p)) throw Error('Open a recovered Punch-Out project first.');
    const info = base.validate(p),
      arena = PunchOutArena.open(info.bytes),
      scene = makeScene({
        id,
        name: 'Arena · ring and audience · source setup',
        chr: arena.chr,
        sprChr: normalizeTiles(),
        pal: arena.palette,
        sprPal: Array.from({
          length: 4
        }, () => [arena.palette[0][0], 0, 0, 0]),
        nt: arena.nt,
        attr: arena.attr,
        tileProps: Array(256).fill(0),
        oam: [],
        entities: [],
        links: [],
        buildInclude: false,
        buildOrder: 0,
        gravity: 0,
        scrollDir: 'none',
        sceneType: 'static',
        captureMeta: {
          mode: 'native-arena-source',
          punchOutArena: {
            version: 1,
            sourceSha256: p.nativeGame.sourceSha256,
            context: arena.context,
            limits: arena.limits
          }
        }
      });
    return {
      scene,
      arena
    };
  }

  function recover(project) {
    base.validate(project, {
      build: true
    });
    const p = copy(project),
      {
        scene,
        arena
      } = assets(p),
      existing = p.scenes.find(s => s.id === id);
    if (existing && JSON.stringify({
        ...existing,
        nt: scene.nt,
        attr: scene.attr
      }) !== JSON.stringify(scene)) throw Error(
      'The arena reference contains local changes. Preserve them before recovering it again.');
    if (!existing) {
      if (p.scenes.length >= 64) throw Error(
        'No free Scene slot. No existing content was removed.');
      p.scenes.push(scene);
    }
    p.nativeGame.projectionSha256 = base.projectionSignature(p);
    base.validate(p, {
      build: true
    });
    return {
      project: p,
      sceneId: id,
      limits: services.PunchOutArenaWriter?.limits || arena.limits
    };
  }
  /* The preceding creator already adds static pages and fighter samples. Extend
   * its result; do not replace its intake, Audio lifecycle, or working editor modules. */
  async function create(input, name) {
    const p = await base.create(input, name);
    return content.matches(p) ? recover(p).project : p;
  }
  services.NativeResourceProject = Object.freeze({
    ...base,
    create
  });
  services.PunchOutArenaRecovery = Object.freeze({
    assets,
    recover,
    sceneId: id
  });
})();
