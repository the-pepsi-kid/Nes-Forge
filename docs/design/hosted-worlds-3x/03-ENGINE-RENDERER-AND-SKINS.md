# 03 — Assetless game simulation, browser renderers, skins and rulesets

**Status:** architecture direction / testable requirements; not a claim that the full skin system is implemented in 3.0.0-alpha.1.

## Origin and architectural insight

The original NES Forge Pepsi vending-machine game evolved into an authoring and ROM-analysis platform. Early Hosted Worlds trials demonstrated **room entry, movement and multiplayer state without recognizable game artwork**. This is important evidence for the desired separation: **the simulation exists independently of the assets used to depict it**.

Forge is the **canonical project/engine**. A selected renderer and skin depict events from that project. A deliberately enabled ruleset may modify the gameplay. None of these are synonyms.

## Layer boundary and direction of data

\`\`\`text
 NES ROM / authored project (source identity, compatibility coverage)
                 |
                 v
   Canonical Forge World / Actor / Event / Audio model
                 |
                 v
   Deterministic rules/runtime, authority & persistence
            |                     |
            | gameplay snapshots  | server-authorized action/event stream
            v                     v
  Presenter / Skin Resolver    Diagnostics / Replay / Debug
            |
         +--+--------------------------+
         |                             |
         v                             v
 Native-hardware-compatible       Enhanced browser
 NES renderer / exporter          renderer (Canvas/WebGL/etc.)
\`\`\`

The **server** is authoritative for position, attacks, damage, health/magic, XP, inventory, quests, ownership, construction, and persistent World state in Hosted Worlds. Clients can request legitimate actions; they cannot submit arbitrary damage/XP, mint success, territory ownership, or invisible hitbox changes. The **renderer** consumes a stable scene/animation/event model. The **skin resolver** maps semantic asset IDs, states, poses and cues to presentation resources and visual effects. Input and presentation behavior must not mutate core state.

A future offline authored game may run the same deterministic core locally; authority and persistence deployment modes must be declared, not inferred from a skin.

## A skin versus a ruleset

| Concern | Visual/audio skin | Explicit ruleset modifier |
| --- | --- | --- |
| Player/enemy graphics | Replace sprites, proportions, palette, animation presentation | Changes spawn/rules/AI only by explicit authorization |
| Terrain/scene art | Repaint/swap backgrounds, tiles, lighting, effects | Change collision, hazard or traversal only if enabled |
| Attack animation | Retiming visually via interpolation permitted if hit window stays fixed | Change hit windows / damage only by versioned mechanic |
| Audio | Replace music/SFX, synchronize cues | Alter gameplay consequences of a cue only via mechanics |
| UI | Different HUD/menu styles, item rarity badges | Character stats/progression only via ruleset |
| Debug mode | Assetless hitboxes, entry markers, room geometry | Does not turn on developer powers or skip constraints |

A title-specific recovered native adapter (e.g. Zelda II) supplies **meaningful canonical identities**: actor/class/variant, pose state, facing, collision extent, frame/event timing, tile/terrain type, NPC/action binding, source context and unknown/uncertain recovery ranges. Support for *any imported game* requires adapters and confidence coverage; raw CHR bytes alone are not semantic actors.

Never infer or silently flatten mid-frame PPU/mapper effects, palette changes, sprite priority, animation timing or raster-dependent logic into misleading static assets. Display and export diagnostic coverage when fidelity is incomplete.

## Sample semantic binding (illustrative, not deployed schema)

\`\`\`json
{
  "entityId": "actor-instance-42",
  "source": {"project": "imported-project", "actorKey": "player", "confidence": "verified"},
  "runtime": {"pose": "attack", "facing": "right", "x": 72, "y": 120,
              "hitboxId": "source-authoritative-attack-window"},
  "skin": {"assetKey": "player.attack.right", "theme": "illustrated"},
  "events": [{"kind": "attack-frame", "id": "event-314"}]
}
\`\`\`

The runtime's \`hitboxId\`, positions and action event IDs determine gameplay. A skin may provide a frame mapping/visual offset, but must not push a larger or smaller attack hitbox to the server. Bind to source identities and validity ranges; unknown frames should fail clearly or fall back without fabricating recovered native behavior.

## Multiple presentations of one World

- **NES Authentic:** original source pixels, palettes, native animation and visible limitations where requested and verified.
- **Enhanced Pixel:** scaled/up-reworked pixels, more colors/layers/effects, same authoritative gameplay.
- **Illustrated/HD:** manually authored or otherwise rights-cleared replacement sprites, environments, character frames, sound and UI.
- **Debug/Assetless:** geometry, collision lines, actor IDs, entrances, spawn zones, attack windows, World graph and event overlays.

Two simultaneously connected players may use **different client-side skins while observing identical server-owned state, event ordering, fairness and interactions**. Avoid skins hiding opponents/projectiles/objectives, masking warnings, changing meaningful silhouette/hitbox readability or altering attack telegraphs advantageously; define competitive readability standards and a server option for approved skin lists.

Switch skins during a live session without restarting simulation or resetting persistent state. Only visual/audio bindings and presentation caches should change.

## Native-versus-browser capabilities

The NES PPU's sprite/scanline and palette limitations apply to **native ROM export**; they do not automatically bound a modern **browser-hosted** renderer. For reference, 64 sprite OAM entries and 8 sprites/scanline are native hardware limits (with historically significant flicker), and only four sprite palettes are available concurrently; each has three opaque colors plus transparency.

Enhanced browsers can draw large crowds and additional animations, but the server still needs **room-based interest management**, collision budgeting, snapshot cadence, efficient event replication and deterministic ordering. Client frame rate, event dropouts, bandwidth and server update load must be load-tested; do not claim a specific concurrent-player count without measurements.

The editor must visibly distinguish:
- Native-safe art/logic that can be built into a compatible ROM;
- Native-derived project content with incomplete recovery/patchability;
- Browser-only art, multi-player systems, FX or ruleset extensions.

Reject native ROM export when a required browser-only capability cannot be faithfully expressed on hardware. Do not silently flatten it. Retain the existing byte-for-byte legacy/no-feature path when no extension is in use.

## Reskin authoring workflow

1. Import/recover a source project or author new content; log source hash, mapper/ROM knowledge, semantic recovery coverage and exact unknowns.
2. Select a World/area/scene/actor via one connected resource workspace, with original tiles, pose states, animation and audio linked.
3. Create a skin manifest mapping semantic IDs to spritesheets/frame sequences, tilesets, layer variants, palette/effect/audio bindings and fallback assets.
4. Preview authentic/debug/alternate skins side by side using the **same simulation trace**.
5. Validate animation event alignment, opacity/contrast, hitbox/pose correspondence, source/fallback rules and no gameplay changes.
6. Package original project + optional skin and ruleset separately; browser launch may select among published skins. Native ROM export follows strict compatibility policy.

### Reskinning mechanics is **not** a skin

A different move speed, new boulder HP, modified attack damage, player-made bridge or 8-tier construction strength belongs to an opt-in **ruleset package**, even if distributed alongside a matching visual theme. Version/pin the ruleset at the server; publish a migration policy for persisted player/world state.

## Browser/security and rights

Do not distribute proprietary Zelda II ROM bytes or Nintendo source-derived sprite/audio files in public example skins without a separate rights review. Redrawing a copyrighted character may still implicate rights; supply independently created or appropriately licensed skins for public release. Validate media MIME/files/sizes, avoid remote arbitrary script execution through theme fields, and sanitize imported metadata. Wallet credentials remain outside skins.

## Acceptance

1. Assetless world movement, collision and room-entry replay matches a skinned world byte-for-byte in authoritative events.
2. NES/classic and HD clients in the same room observe identical player positions, damage, NPC interactions, XP and World revisions.
3. Switching skins live does not change collision, attack windows, server snapshots or spawn validity.
4. Unmapped assets have deterministic fallbacks and clear recovery-confidence diagnostics.
5. 3+ view modes (authentic, alternate, debug) remain perceptually/semantically aligned in scenes, audio cues and animation transitions.
6. Native exporter detects unsupported browser-only capabilities rather than outputting a misleading ROM.
7. 20/50/100+ synthetic player load tests measure server authority, room-interest filtering and client drawing capacity before promising real capacity; these numbers are *test scenarios*, not published performance claims.
