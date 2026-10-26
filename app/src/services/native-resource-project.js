/*
 * NES FORGE MODULE: src/services/native-resource-project.js
 * Entry: Forge.services.NativeResourceProject
 * Purpose: Shared owner of preserved native source, resource bindings, recipes and registered Scene encoders.
 * Connections: InvestigationProject routes recognized sources here; ProjectStore persists; RuntimeCompiler calls build().
 * Contract: Catalogs are evidence, Scenes are working assets, importedRom is the source. Recognition masks never grant write ownership.
 * Developer walkthrough: app/docs/NATIVE_RECOVERY_TUTORIAL.md
 * Bundle order: app/source-manifest.json; regenerate with app/tools/bundle.py.
 */
/* One source and native recipe owner. Catalogs are read-only evidence;
 * materialized pages are ordinary Scene assets, never a second Stage store. */
(() => {
  'use strict';
  const s = Forge.services,
    api = window.NativePRGResources,
    f = window.NativeEngineFormat,
    cp = x => JSON.parse(JSON.stringify(x)),
    digest = x => f.sha256(new TextEncoder().encode(JSON.stringify(x)));
  const profile = 'native-resource-project-v1',
    scope =
    'Partial native resources. Existing block substitutions are encoded within each source record’s fixed capacity. Additional edits require a registered title-specific writer. Unsupported fields and runtime changes remain blocked.',
    fail = m => {
      throw Error('Native resource project: ' + m);
    },
    matches = p => p?.nativeGame?.profile === profile;
  const catalogs = new Map(),
    sceneEncoders = [];

  /* Register once during module loading. No additional project store is created. */
  function registerSceneEncoder(codec) {
    if (!codec || typeof codec.id !== 'string' || sceneEncoders.some(c => c.id === codec.id) || [
        'matches', 'views', 'encode', 'spans'
      ].some(k => typeof codec[k] !== 'function')) fail(
      'Invalid or duplicate native Scene encoder');
    sceneEncoders.push(Object.freeze({
      ...codec,
      ...(codec.capability ? {capability: Object.freeze({...codec.capability})} : {})
    }));
  }

  /* Read-only discovery, separate from matches(): a writer can be available
   * before its explicit editing view has been opened. This metadata grants no
   * write permission; validate/build still enforce the original spans/recipes. */
  function writerCapabilities(p) {
    if (!matches(p)) return [];
    const adapter = api.profiles.find(a => a.id === p.nativeGame.adapter);
    if (!adapter) return [];
    return sceneEncoders.filter(c => c.capability?.adapterKind === adapter.kind)
      .map(c => ({id: c.id, ...c.capability}));
  }

  function freeze(v, seen = new WeakSet()) {
    if (v && typeof v === 'object' && !seen.has(v)) {
      seen.add(v);
      for (const x of Object.values(v)) freeze(x, seen);
      Object.freeze(v);
    }
    return v;
  }

  function decoded(bytes, a) {
    const key = a.id + ':' + f.sha256(bytes);
    if (!catalogs.has(key)) {
      if (catalogs.size >= 4) catalogs.delete(catalogs.keys().next().value);
      catalogs.set(key, freeze(api.inspect(bytes, a)));
    }
    return catalogs.get(key);
  }

  function recognizes(bytes) {
    if (!(bytes instanceof Uint8Array)) return null;
    const hash = f.sha256(bytes);
    for (const a of api.profiles) {
      if (bytes.length !== a.byteLength) continue;
      if (hash !== a.sha256) {
        // Recognition ranges describe verified derivatives, not permission to write.
        // Recipe writes still use a.spans; Scene encoders declare separate spans.
        const identities = [{
          spans: a.spans,
          sha256: a.protectedSha256
        }];
        if (a.derivativeIdentity) identities.push({
          spans: [...a.spans, ...a.derivativeIdentity.spans],
          sha256: a.derivativeIdentity.protectedSha256
        });
        if (a.artDerivativeIdentity) identities.push({
          spans: [...a.spans, ...(a.derivativeIdentity?.spans || []), ...a.artDerivativeIdentity.spans],
          sha256: a.artDerivativeIdentity.protectedSha256
        });
        if (a.poseDerivativeIdentity) identities.push({
          spans: [...a.spans, ...(a.derivativeIdentity?.spans || []), ...(a.artDerivativeIdentity?.spans || []), ...a.poseDerivativeIdentity.spans],
          sha256: a.poseDerivativeIdentity.protectedSha256
        });
        if (!identities.some(identity => {
            const masked = bytes.slice();
            for (const r of identity.spans) {
              if (r.mask === undefined) masked.fill(0, r.offset, r.offset + r.length);
              else for (let i = r.offset; i < r.offset + r.length; i++) masked[i] &= 255 ^ r.mask;
            }
            return f.sha256(masked) === identity.sha256;
          })) continue;
      }
      // A masked hash is necessary but insufficient: the native adapter must still
      // decode the current records and reject malformed pointers/command streams.
      try {
        decoded(bytes, a);
        return a;
      } catch (_) {}
    }
    return null;
  }
  const sceneId = (a, b) => 'native-prg-' + a.id + '-' + b.resource.replace(/:/g, '_') + '-' + b
    .page;

  function evidence(bytes, a) {
    const c = decoded(bytes, a);
    return {
      format: 'NESForgePRGResourceCatalog',
      version: 1,
      adapter: a.id,
      sourceSha256: f.sha256(bytes),
      scope,
      resources: c.resources.map(r => ({
        id: r.id,
        label: r.label,
        group: r.group,
        layoutId: r.layoutId,
        width: r.width,
        height: r.height,
        pages: api.pages(r).length,
        status: r.available ? 'catalogued' : 'unavailable',
        reason: r.reason
      })),
      layouts: c.layouts.map(l => ({
        id: l.id,
        offset: l.offset,
        length: l.length,
        columns: l.columns,
        rows: l.rows,
        blockCount: l.blockCount
      })),
      domains: {
        areas: 'partial',
        graphics: 'partial',
        nativeWriter: 'partial',
        lifecycle: 'partial',
        relationships: 'partial',
        menus: 'unresolved',
        animation: 'unresolved',
        collision: 'unresolved',
        actors: 'unresolved',
        audio: 'unresolved',
        objectsTextFlags: 'unresolved',
        execution: 'partial'
      }
    };
  }

  function inspect(p) {
    const n = p.nativeGame,
      a = api.profiles.find(a => a.id === n?.adapter);
    if (!matches(p) || !a || p.version !== 16 || n.version !== 3 || n.format !==
      'NESForgeNativeGame' || Object.keys(n).sort().join(',') !==
      'adapter,bindings,edits,format,profile,projectionSha256,resources,sourceSha256,version' || !
      /^[a-f0-9]{64}$/.test(n.projectionSha256) || !Array.isArray(n.resources) || n.resources
      .length || !Array.isArray(n.bindings) || !n.bindings.length || n.bindings.length > 64) fail(
      'Invalid native source descriptor.');
    const {
      bytes,
      container
    } = s.ROMProject.validateSource(p);
    if (recognizes(bytes)?.id !== a.id) fail(
      'Protected source data changed or a resource record is invalid.');
    const c = decoded(bytes, a),
      seen = new Set();
    for (const b of n.bindings) {
      if (!b || Object.keys(b).sort().join(',') !== 'page,resource' || !Number.isInteger(b.page))
        fail('Invalid page binding');
      const r = c.resources.find(r => r.id === b.resource);
      if (!r?.available || !api.pages(r)[b.page]) fail('Unavailable source page');
      const id = sceneId(a, b);
      if (seen.has(id)) fail('Duplicate page binding');
      seen.add(id);
      const scene = p.scenes.find(sc => sc.id === id);
      if (!scene || JSON.stringify(scene.captureMeta?.nativeResource) !== JSON.stringify({
          version: 1,
          adapter: a.id,
          sourceSha256: n.sourceSha256,
          resource: b.resource,
          page: b.page
        })) fail('A required source page was removed or replaced.');
    }
    const encoded = api.encode(bytes, c, n.edits);
    return {
      bytes,
      container,
      adapter: a,
      catalog: c,
      encoded,
      descriptor: n
    };
  }

  /* Substitute only explicitly registered, bounded fields. A field claim is unique
   * per Scene. New CHR/palette writers share this gate rather than re-signing edits
   * or adding another source/recipe store. All other asset fields stay protected. */
  function baseSignature(p, info = inspect(p)) {
    let scenes = p.scenes.filter(sc => !p.nativeGame.bindings.some(b => sceneId({
      id: p.nativeGame.adapter
    }, b) === sc.id));
    const seen = new Set();
    for (const codec of sceneEncoders.filter(c => c.matches(p, info)))
      for (const view of codec.views(p, info)) {
        const fields = view && Object.keys(view).filter(k => k !== 'id');
        if (!view || typeof view.id !== 'string' || !fields.length) fail('Invalid native Scene projection');
        for (const field of fields) {
          const v = view[field], integer = (n, max) => Number.isInteger(n) && n >= 0 && n <= max;
          const valid = field === 'nt' || field === 'attr' ? Array.isArray(v) &&
            v.length === (field === 'nt' ? 960 : 64) && v.every(n => integer(n, 255)) :
            field === 'chr' || field === 'sprChr' ? Array.isArray(v) && v.length === 256 &&
              v.every(tile => Array.isArray(tile) && tile.length === 8 && tile.every(row =>
                Array.isArray(row) && row.length === 8 && row.every(n => integer(n, 3)))) :
            field === 'pal' || field === 'sprPal' ? Array.isArray(v) && v.length === 4 &&
              v.every(row => Array.isArray(row) && row.length === 4 && row.every(n => integer(n, 63))) :
            field === 'bgColor' && integer(v, 63);
          const key = view.id + ':' + field;
          if (!valid || seen.has(key)) fail('Invalid or duplicate native Scene field projection');
          seen.add(key);
        }
        const index = scenes.findIndex(sc => sc.id === view.id);
        if (index < 0) fail('Native Scene encoder cannot mask a missing or recipe-owned Scene');
        scenes = scenes.slice();
        scenes[index] = {...scenes[index], ...Object.fromEntries(fields.map(k => [k, cp(view[k])]))};
      }
    // Optional canonical metasprite views share this same native build owner.
    // A codec may mask only position fields and original piece coordinates;
    // its encoder must still prove the actual edit maps to its bounded spans.
    // Frames without a registered owner remain protected, including snapshots.
    let metasprites = p.metasprites;
    const frameFields = new Set();
    for (const codec of sceneEncoders.filter(c => c.matches(p, info))) {
      if (!codec.metaspriteViews) continue;
      for (const view of codec.metaspriteViews(p, info)) {
        if (!view || Object.keys(view).sort().join(',') !== 'id,originX,originY,pieces' || frameFields.has(view.id))
          fail('Invalid or duplicate native metasprite projection');
        const index = metasprites.findIndex(frame => frame.id === view.id);
        if (index < 0) fail('Native metasprite encoder cannot mask a missing frame');
        const baseline = {...metasprites[index], ...cp(view)};
        Forge163.persistence.validate([baseline], [], p.scenes);
        frameFields.add(view.id); metasprites = metasprites.slice(); metasprites[index] = baseline;
      }
    }
    return s.NativeEngineProject.signature({
      ...p,
      scenes,
      metasprites
    });
  }

  /* Compose native recipes and Scene writers deterministically. Refuse overlapping
   * claims or writes beyond declared spans, including overlap with existing recipes. */
  function encodeScenes(p, info) {
    let bytes = info.encoded.bytes;
    const diagnostics = [],
      claimed = new Set();
    for (const codec of sceneEncoders.filter(c => c.matches(p, info))) {
      const spans = codec.spans(p, info),
        allowed = new Set();
      for (const span of spans) {
        if (!Number.isInteger(span.offset) || !Number.isInteger(span.length) || span.offset <
          16 || span.length < 1 || span.offset + span.length > bytes.length) fail(
          'Invalid native encoder span');
        for (let i = span.offset; i < span.offset + span.length; i++) {
          if (allowed.has(i) || claimed.has(i) || info.adapter.spans.some(v => i >= v.offset &&
              i < v.offset + v.length)) fail('Native Scene encoder ownership overlaps a recipe');
          allowed.add(i);
          claimed.add(i);
        }
      }
      const result = codec.encode(bytes.slice(), p, info);
      if (!(result?.bytes instanceof Uint8Array) || result.bytes.length !== bytes.length) fail(
        'Native Scene encoder changed the container');
      for (let i = 0; i < bytes.length; i++)
        if (result.bytes[i] !== bytes[i] && !allowed.has(i)) fail(
          'Native Scene encoder leaves its declared data spans');
      bytes = result.bytes;
      diagnostics.push(...(result.diagnostics || []));
    }
    const changes = [];
    for (let i = 0; i < bytes.length; i++)
      if (bytes[i] !== info.bytes[i]) changes.push({
        offset: i,
        before: info.bytes[i],
        after: bytes[i]
      });
    return {
      bytes,
      changes,
      diagnostics
    };
  }

  function make(p, c, b) {
    const {
      resource: r,
      page: v,
      nt,
      attr
    } = api.projectPage(c, b.resource, b.page), source = {
      name: p.investigation.source.name,
      sha256: p.nativeGame.sourceSha256,
      byteLength: c.profile.byteLength
    }, members = c.resources.filter(x => x.group === r.group).map(x => ({
      sceneId: x.id,
      label: x.label,
      status: x.available ? 'catalogued' : 'unavailable'
    }));
    return makeScene({
      id: sceneId(c.profile, b),
      name: r.label + ' · page ' + b.page,
      nt,
      attr,
      chr: cp(r.chr),
      sprChr: normalizeTiles(),
      pal: cp(r.palette),
      sprPal: Array.from({
        length: 4
      }, () => [r.palette[0][0], 0, 0, 0]),
      tileProps: Array(256).fill(0),
      sceneType: 'static',
      scrollDir: 'none',
      gravity: 0,
      buildInclude: false,
      buildOrder: 0,
      entities: [],
      oam: [],
      links: [],
      captureMeta: {
        nativeResource: {
          version: 1,
          adapter: c.profile.id,
          sourceSha256: source.sha256,
          resource: b.resource,
          page: b.page
        },
        nativeAssets: {
          version: 1,
          source,
          profile: c.profile.id,
          sceneId: r.id,
          page: b.page,
          originX: v.x,
          originY: v.y,
          contentWidth: v.width,
          contentHeight: v.height,
          context: {
            version: 1,
            id: r.group,
            kind: 'native-table',
            label: r.group,
            members,
            scope: 'Source table membership and static palette state only; stage order, reachability and runtime events remain unresolved.'
          },
          limits: [scope, r.reason, 'Only ' + v.width + '×' + v.height +
            ' pixels belong to this resource page. Remaining canvas pixels are unused.'
          ]
        }
      }
    });
  }

  function currentCatalog(info) {
    return info.descriptor.edits.length ? decoded(info.encoded.bytes, info.adapter) : info
    .catalog;
  }

  function sameScene(a, b) {
    return digest(a) === digest(b);
  }

  /* Loading preserves unsupported work. build:true additionally requires that all
   * differences have an encoder and that the resulting native bytes pass its checks. */
  function validate(p, {
    build = false
  } = {}) {
    const info = inspect(p);
    if (build) {
      const c = currentCatalog(info);
      for (const b of p.nativeGame.bindings)
        if (!sameScene(p.scenes.find(sc => sc.id === sceneId(info.adapter, b)), make(p, c, b)))
          fail(
            'A recovered Scene differs from its native recipe. Undo unsupported Scene, CHR, palette, actor or collision edits to build.'
            );
      if (baseSignature(p, info) !== p.nativeGame.projectionSha256) fail(
        'An asset or runtime setting changed without a native encoder. Unsupported work remains savable.'
        );
      info.sceneEncoded = encodeScenes(p, info);
    }
    return info;
  }

  function validateInvestigation(p) {
    const info = validate(p),
      n = p.investigation;
    if (n?.format !== 'NESForgeInvestigation' || n.version !== 4 || Object.keys(n).sort().join(
        ',') !== 'catalogSha256,catalogs,format,source,version' || Object.keys(n.catalogs || {})
      .sort().join(',') !== 'inspection,recovery' || Object.keys(n.catalogSha256 || {}).sort()
      .join(',') !== 'inspection,recovery' || n.source?.profile !== profile || n.source.sha256 !==
      p.nativeGame.sourceSha256) fail('Invalid resource investigation');
    const old = {
      format: n.format,
      version: 2,
      source: {
        ...n.source,
        profile: s.ROMProject.profile
      },
      catalogs: {
        inspection: n.catalogs.inspection
      },
      catalogSha256: {
        inspection: n.catalogSha256.inspection
      }
    };
    s.ROMProject.validateInspection(old, info.bytes);
    if (JSON.stringify(n.catalogs.recovery) !== JSON.stringify(evidence(info.bytes, info
      .adapter)) || digest(n.catalogs.recovery) !== n.catalogSha256.recovery) fail(
      'Resource catalog differs from its source');
    return n;
  }
  async function create(input, name) {
    const bytes = Uint8Array.from(input),
      a = recognizes(bytes);
    if (!a) fail('No verified native resource adapter');
    const p = await s.ROMProject.create(bytes, name),
      c = decoded(bytes, a),
      first = c.resources.find(r => r.available),
      binding = {
        resource: first.id,
        page: 0
      };
    p.nativeGame = {
      ...p.nativeGame,
      profile,
      adapter: a.id,
      resources: [],
      bindings: [binding]
    };
    p.investigation.source.profile = profile;
    p.investigation.version = 4;
    p.investigation.catalogs.recovery = evidence(bytes, a);
    p.investigation.catalogSha256.recovery = digest(p.investigation.catalogs.recovery);
    p.scenes = [make(p, c, binding)];
    p.activeScene = 0;
    p.projectName = (String(name || 'NES').replace(/\.nes$/i, '') +
      ' · partial native resources').slice(0, 120);
    p.nativeGame.projectionSha256 = baseSignature(p);
    validateInvestigation(p);
    validate(p, {
      build: true
    });
    return p;
  }

  /* The native brush edits a physical operand recipe. All resident views of that
   * operand are regenerated together; ordinary arena paint uses its separate Scene encoder. */
  function paint(p, id, change) {
    const info = validate(p),
      binding = p.nativeGame.bindings.find(b => sceneId(info.adapter, b) === id);
    if (!binding) fail('Select a recovered source page');
    const c = currentCatalog(info),
      r = c.resources.find(r => r.id === binding.resource),
      l = c.layouts.find(l => l.id === r.layoutId),
      entry = {
        layoutId: l.id,
        cell: change?.cell,
        block: change?.block
      };
    api.encode(info.bytes, info.catalog, [entry]);
    // All resident views of a shared native owner must agree before projection.
    const related = p.nativeGame.bindings.filter(b => c.resources.find(r => r.id === b.resource)
      ?.layoutId === l.id);
    for (const b of related)
      if (!sameScene(p.scenes.find(sc => sc.id === sceneId(info.adapter, b)), make(p, c, b)))
        fail('Undo local edits on this layout’s pages before using the native brush');
    const nativeGame = cp(p.nativeGame);
    nativeGame.edits = nativeGame.edits.filter(e => e.layoutId !== entry.layoutId || e.cell !==
      entry.cell);
    if (entry.block !== info.catalog.layouts.find(v => v.id === l.id).cells[entry.cell])
      nativeGame.edits.push(entry);
    nativeGame.edits.sort((a, b) => a.layoutId.localeCompare(b.layoutId) || a.cell - b.cell);
    const encoded = api.encode(info.bytes, info.catalog, nativeGame.edits),
      next = decoded(encoded.bytes, info.adapter),
      scenes = cp(p.scenes);
    for (const b of related) scenes[scenes.findIndex(sc => sc.id === sceneId(info.adapter, b))] =
      make({
        ...p,
        nativeGame
      }, next, b);
    return {
      nativeGame,
      scenes
    };
  }

  function addPage(p, resource, page) {
    const info = validate(p),
      binding = {
        resource,
        page
      },
      c = currentCatalog(info);
    api.projectPage(c, resource, page);
    const id = sceneId(info.adapter, binding),
      existing = p.scenes.findIndex(sc => sc.id === id);
    if (existing >= 0) return {
      nativeGame: cp(p.nativeGame),
      scenes: cp(p.scenes),
      activeScene: existing
    };
    const scenes = cp(p.scenes),
      nativeGame = cp(p.nativeGame);
    if (scenes.length >= 64) {
      const external = (p.worlds || []).length || (p.metasprites || []).length || (p.animations ||
        []).length || p.scenes.some(sc => (sc.entities || []).length || (sc.links || []).length);
      const referenced = id => external || (p.worlds || []).some(w => w.tilesetSceneId === id) ||
        (p.metasprites || []).some(m => m.sceneId === id) || (p.animations || []).some(a => (a
          .frames || []).some(f => f.sceneId === id)) || p.scenes.some(sc => (sc.entities || [])
          .some(e => e.targetScene === p.scenes.findIndex(v => v.id === id)) || (sc.links || [])
          .some(l => l.targetSceneId === id));
      const victim = nativeGame.bindings.find(b => {
        const sid = sceneId(info.adapter, b),
          sc = scenes.find(sc => sc.id === sid);
        return sid !== p.scenes[p.activeScene]?.id && !referenced(sid) && sameScene(sc, make(
          p, c, b));
      });
      if (!victim) fail(
        'The 64 Scene working slots contain local edits or references. Preserve that work before opening another page.'
        );
      const sid = sceneId(info.adapter, victim);
      const index = scenes.findIndex(sc => sc.id === sid);
      scenes[index] = make(p, c, binding);
      nativeGame.bindings = nativeGame.bindings.filter(b => sceneId(info.adapter, b) !== sid);
      nativeGame.bindings.push(binding);
      return {
        nativeGame,
        scenes,
        activeScene: index
      };
    }
    scenes.push(make(p, c, binding));
    nativeGame.bindings.push(binding);
    return {
      nativeGame,
      scenes,
      activeScene: scenes.length - 1
    };
  }

  function build(p) {
    const info = validate(p, {
        build: true
      }),
      encoded = info.sceneEncoded;
    return {
      rom: encoded.bytes,
      metadata: {
        prgSize: info.container.header.prgSize,
        chrSize: info.container.header.chrSize,
        changes: encoded.changes,
        sourceSha256: p.nativeGame.sourceSha256,
        outputSha256: f.sha256(encoded.bytes)
      },
      diagnostics: [{
        severity: 'info',
        code: 'native-resource-layout',
        phase: 'native-encode',
        message: encoded.changes.length +
          ' byte(s) changed within verified native layout records; every other source byte is preserved.'
      }, {
        severity: 'warning',
        code: 'native-edit-scope',
        phase: 'native-encode',
        message: scope
      }, ...encoded.diagnostics]
    };
  }

  function describe(n) {
    const r = n.catalogs.recovery;
    return {
      kind: 'native-resources',
      source: cp(n.source),
      rooms: r.resources.length,
      contexts: new Set(r.resources.map(v => v.group)).size,
      maps: r.adapter.startsWith('ff-') ? 61 : 0,
      actors: 0,
      poses: 0,
      scripts: 0,
      chrBanks: 0,
      symbols: 0,
      ram: 0,
      cues: 0,
      gaps: [scope,
        'Open all catalogued pages through Area library → Investigated source. Unavailable states are refused rather than filled with guessed assets.',
        'The 64 Scene working slots do not truncate the source catalog. Clean unreferenced recovered views can be replaced; native recipes persist.'
      ],
      audioGaps: [],
      domains: cp(r.domains)
    };
  }

  function libraryView(p) {
    const info = validate(p),
      c = info.catalog;
    return {
      source: cp(p.investigation.source),
      profile: {
        id: info.adapter.id
      },
      scenes: c.resources.map(r => ({
        id: r.id,
        label: r.label,
        group: r.group,
        status: r.available ? 'catalogued' : 'unavailable-slot',
        reason: r.reason
      })),
      maps: [],
      selected: null,
      selectedScene: null
    };
  }

  function pageList(p, resource) {
    const info = validate(p),
      r = info.catalog.resources.find(r => r.id === resource);
    if (!r?.available) return [];
    return api.pages(r).map(v => ({
      id: sceneId(info.adapter, {
        resource,
        page: v.page
      }),
      name: 'Page ' + v.page + ' · (' + v.x + ', ' + v.y + ')',
      resource,
      page: v.page
    }));
  }

  function brush(p, id) {
    const info = validate(p),
      b = p.nativeGame.bindings.find(b => sceneId(info.adapter, b) === id);
    if (!b) return null;
    const c = currentCatalog(info),
      v = api.projectPage(c, b.resource, b.page),
      r = v.resource;
    return {
      binding: b,
      resource: r,
      viewport: v.page,
      catalog: c,
      columns: Math.ceil(v.page.width / r.blockPixels),
      rows: Math.ceil((v.page.height + v.page.y % r.blockPixels) / r.blockPixels),
      blockCount: r.blocks.length
    };
  }
  const requiredScene = (p, id) => matches(p) && p.nativeGame.bindings.some(b => sceneId({
    id: p.nativeGame.adapter
  }, b) === id);
  s.NativeResourceProject = Object.freeze({
    profile,
    scope,
    matches,
    recognizes,
    create,
    validate,
    validateInvestigation,
    paint,
    addPage,
    build,
    describe,
    libraryView,
    pageList,
    brush,
    requiredScene,
    registerSceneEncoder,
    writerCapabilities,
    projectionSignature: baseSignature
  });
})();
