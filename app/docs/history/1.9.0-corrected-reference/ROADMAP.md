# NES Forge roadmap

**Governance revision:** 2026-09-15

This roadmap records product order, dependencies and authorization boundaries. A listed milestone is not authorization to begin it. Forward authoring and reverse engineering must converge on the same canonical NES Forge representations. Those representations must eventually cover both assets and the time-dependent techniques used by NES hardware to render and execute them. Reverse engineering should increasingly describe an unfamiliar ROM as a composition of reusable techniques rather than require one monolithic game-specific parser. Across every era, the game/runtime target remains **NES / 8-bit / 6502-class**.

| Milestone | Scope | Status |
| --- | --- | --- |
| 1.6.6 — Visual Workspace | Original editor/capture and single-room Player/Target reference | Frozen historical baseline |
| 1.6.7 — Architecture Convergence | ProjectStore, BuildGraph/RuntimeCompiler, blank startup, preservation semantics and current documentation | Delivered frozen baseline |
| 1.7 — World Runtime | Direct world resource linking; one authored sideview player; Empty/Solid collision; screen transitions; explicit start/entrance links; checked World ROM reopening | Completed baseline |
| 1.8 — Audio Runtime / Audio Studio | Canonical tracker/instrument/SFX compilation; runtime Pulse 1/2, Triangle and Noise; animation `sound` events; MIDI and MusicXML import into the same Audio representation | Completed baseline retained in 1.9.0 |
| 1.9 — General Gameplay Systems | Generalized actors/entities, canonical structured behaviors, explicit Room/World persistence and visually authored gameplay systems; retire Player/Target as the general architecture while preserving compatibility | 1.9.0 Gameplay Core candidate; 1.9.1 and 1.9.2 unauthorized |
| 2.0 — Runtime / Resource Linker + Live Play Foundation | Mapper-aware allocation, stable runtime identities, relocatable/streamed resources, canonical Raster Events, compatible runtime profiles, debug/release ROM policy, incremental compilation and controlled synchronization/patching | Ordered after 1.9; explicit authorization required |
| 2.1 — RE Bridge + Evidence Model | Deliberate transfer from the separate RE branch through evidence states, provenance including raster causes, and explicit conversions; no wholesale merge | Ordered after 2.0; explicit authorization required |
| 2.2 — Method Registry / Forge Knowledge Base | Reusable technique records—including Raster Methods—with signatures, evidence, codecs, canonical mappings, validation, provenance and confidence; methods, not third-party game assets | Ordered after 2.1; explicit authorization required |
| 2.3 — Integrated RE Workspace | Bank-aware disassembly, labels/xrefs, execution coverage, pointer/mapper/CHR/OAM/audio/map analysis, raster timelines/traces and Method Registry matching | Ordered after 2.2; explicit authorization required |
| 2.4 — Live Reverse Engineering / Hot Patch | Runtime inspection, watches/breakpoints, controlled resource/raster/music edits and bank-aware ROM shadow patches | Ordered after 2.3; explicit authorization required |
| 2.5+ — Continuous Knowledge Expansion | Ongoing ROM-diverse Method Registry growth, signatures, codecs and round-trip evidence | Ordered after 2.4; each tranche requires authorization |
| 3.0 — Hosted Session / Network Foundation | InputSource, deterministic-session contracts, snapshots/replay/hashes, session/player identity and canonical network envelopes | Future 3.x; not authorized |
| 3.1 — Traditional Netplay | Synchronized controllers, sessions, rollback where appropriate, reconnect, spectators and matchmaking | Future 3.x; not authorized |
| 3.2 — Hosted Network Runtime | Server-facing canonical gameplay intents/results with transport separated from gameplay meaning | Future 3.x; not authorized |
| 3.3 — Persistent Hosted Worlds | Server-authoritative persistence and streamed NES-compatible local projections | Future 3.x; not authorized |
| 3.4 — Economy, Crafting & Construction Services | Domain-owned inventory, currency, resources, recipes, equipment, structures and progression | Future 3.x; not authorized |
| 3.5 — Large Match / Competitive Systems | NES-class large-match rules, zones, elimination, spectators, scoring and history | Future 3.x; not authorized |
| 3.6 — Social / Voice | Parties, presence, text/voice and moderation outside deterministic NES simulation | Future 3.x; not authorized |
| 3.7 — Collaborative Hosted Creation | Domain-aware shared projects, World editing, history/conflicts, Build & Run and LiveLink testing | Future 3.x; not authorized |

## Hard NES platform boundary

NES Forge is an NES/Famicom-class environment: Ricoh 2A03/2A07 6502-derived execution, NES PPU graphics and palettes, CHR/tiles/metatiles, NES sprites/metasprites, NES APU-style audio, NES controller concepts and NES-compatible mapper/runtime profiles. Modern services may surround the game for development, builds, RE, hosting, networking, persistence, matchmaking, collaboration and communication, but they must not turn the client into a modern native engine, 3D engine, 16-bit runtime or cosmetic “NES-looking” game.

SNES/65C816 output, modern GPU scene graphs and Unity/Unreal-style clients are outside this product. Any future 16-bit environment must be a separate product with its own architecture and verification contract. NES Forge may become broader around the NES, not broader instead of it.

## Domain and capability-path rule

NES Forge is a domain-oriented modular monolith. Graphics, Metatiles, World, Metasprites, Animation, Gameplay, Audio, Raster behavior, RE, Method Registry, Networking, Hosted persistence, Social/Voice and Collaboration own their canonical concepts, validation and tests. Cross-domain work uses stable IDs, typed references, declared dependencies, versioned contracts, events and explicit adapters. BuildGraph coordinates dependencies without absorbing domain semantics.

Canonical object lifecycles and end-to-end capability paths must be explicit. An editor surface alone does not complete a feature: authoring/import, validation, compilation, NES execution and applicable inspection/reimport must agree. Vertical slices may prove the full path without weakening domain ownership.

## Static resources and time-dependent behavior

NES Forge must model both static resources and time-dependent NES behavior. Runtime Capture may preserve some raster-dependent scenes losslessly while correctly refusing to rebuild them through the current static NROM backend. Preserve that conservative behavior; never flatten or silently approximate unsupported raster effects.

The 2.0 architecture must establish a canonical **Raster Schedule / Raster Event** representation with this conceptual path:

**runtime observation → canonical raster events → compatible runtime/compiler profile → ROM**

The exact schema is intentionally not authorized. Governance must distinguish:

1. **Captured:** the original behavior was observed or preserved.
2. **Represented:** the behavior was understood and converted into canonical NES Forge raster/runtime events.
3. **Compilable:** the selected mapper/runtime profile can reproduce equivalent behavior.

These claims must never be conflated.

## Audio interchange policy

NES Forge Audio is the canonical editable and runtime representation. MusicXML is the preferred notation-level interchange format. MIDI remains supported as a performance/event interchange format. External music formats must normalize into canonical NES Forge Audio; they must not introduce parallel runtime models.

Future tablature and optical sheet-music recognition should preferably normalize into MusicXML and/or canonical NES Forge Audio. Future RE audio decoding must produce canonical NES Forge Audio first. Where enough musical structure is recoverable, RE-decoded music should export to MusicXML, MIDI and native NES Forge Audio. NES-specific information that MusicXML cannot represent losslessly—including driver commands, pulse duty behavior, envelopes, Noise behavior, DPCM and timing tricks—must remain preserved in native NES Forge Audio.

Further Audio Studio enhancements may continue in a later expressly authorized tranche, but do not block the next numbered milestone and are not implied 1.9 scope.

## Approved 1.9 architecture and delivery sequence

The purpose of 1.9 is to replace player-centric gameplay special cases with a generalized visual authoring/runtime architecture. The eventual combined 1.9.0–1.9.2 scope includes the following; this is not the first-tranche checklist:

1. Stable actor definitions and placed actor instances with reusable, typed components and gameplay parameters.
2. Reusable behaviors/state machines with explicit states, transitions, conditions and actions; no `enemy1`, `enemy2`, `boss` or similar role fields in `worldRuntime`.
3. A compatibility path that makes the 1.7 Player profile one configured actor use while preserving existing project behavior and golden outputs when generalized gameplay is unused.
4. Shared collision/interaction primitives for solid collision, one-way platforms, ladders, moving platforms, hazards, triggers and switches.
5. Shared combat primitives for health/damage, hitboxes/hurtboxes, melee attacks and projectiles.
6. Reusable enemy/NPC movement, pickups, doors, dialogue and checkpoints built from the shared actor/behavior/component model.
7. Explicit spawn/despawn rules and serialized Room/World persistent gameplay state.
8. Additional typed animation events that invoke the same generalized runtime actions rather than bypassing them.
9. Visual editor controls, ProjectStore/schema ownership, compiler/link validation and generated-runtime tests for the above systems in applicable single-room and World paths.

The behavior architecture uses preset templates for onboarding over a canonical structured state-table representation. States have stable IDs and entry/tick/exit actions; ordered transitions have priorities, typed conditions/actions and stable destination IDs. Templates instantiate normal canonical records and are not a runtime representation. A future visual state graph may edit those same records but is deferred from the first tranche.

Persistence is explicit rather than snapshot-based. Transient/Actor-local state is runtime-only; Room variables preserve local outcomes; World variables share progression across Rooms. A future Game/Global scope is reserved but absent. Components and behaviors reference stable, typed Room/World variables instead of serializing whole actor memory. The first runtime provides deterministic in-session persistence; SRAM/password/save-slot backends remain later work.

The milestone is internally sequenced:

| Tranche | Scope | Authorization |
| --- | --- | --- |
| 1.9.0 — Gameplay Core | Actor definitions/instances/runtime identity; typed components and parameters; canonical state tables/evaluator; explicit Room/World variables and bindings; bounded retained-Player compatibility adapter; complete table authoring; schema 12; single-room/World compiler/runtime; Sideview Player, Ground Patrol Enemy, Stationary Contact Hazard, Collectible Pickup and Switch + Door templates | Stabilized candidate; independent audit/real-browser closeout only |
| 1.9.1 — Gameplay Expansion | Projectiles, moving platforms, in-session checkpoints, minimal NPC/dialogue interaction, ladders/one-way platforms and richer combat/traversal/events | Not authorized |
| 1.9.2 — Behavior UX | Visual state graph over the same canonical records/IDs plus improved template authoring and diagnostics | Not authorized |

Dialogue first appears in 1.9.1 as minimal interaction/display/reference behavior with acknowledgement/completion; branching dialogue and a dialogue-language subsystem are excluded. No dialogue implementation is in 1.9.0. Checkpoints are in-session respawn references only: ordinary death/respawn may use them, while runtime reset or power-cycle returns to authored project defaults. Room/World values remain in the explicit scoped store, not checkpoint or actor snapshots. Cross-session saving requires an explicitly authorized future backend. Projectiles use only minimum transient source/collision-group semantics for damage filtering, not generalized factions, teams or reputation.

Actor Definition is a reusable authored archetype; Actor Instance is a persistent authored placement/reference in a Scene/Room/World; Runtime Actor is an instantiated execution object with transient state; Persistent State Record contains only explicitly declared Room/World variables keyed by stable authored identities. Runtime handles are never persistent keys, and persistent records never implicitly serialize Runtime Actor memory. Scene placement adds no new persistence scope.

The legacy Player/Target workflow remains intact behind a build-time compatibility adapter first. In 1.9.0 the canonical Sideview Player record is an explicit binding to the retained Player executor; it does not claim that the generic evaluator owns legacy Player movement, collision or animation. Full conversion/unification is deferred and requires separate authorization and parity evidence. Schema 12 owns generalized actors/behaviors/scoped variables; actual frozen-1.8 rejection and legacy byte preservation are required release evidence.

The 1.9.0 generated-runtime profile must reject any canonical condition/action it cannot execute equivalently before ROM emission. All operation operands are typed and validated before code generation. Its persistent store is explicitly bounded to 64 one-byte Room/World values, with max/max+1 evidence. The bounded table UI must author every 1.9.0 core record family, including explicit Scene/World/Room placement and Room/World variables/bindings, without external JSON editing.

The 1.9.0 Switch + Door recipe is an alpha gameplay template proving stable identity, linked persistent state, switch control, active/inactive behavior and visual state. It is not a finalized traversal or collision contract. Physical blocking and configurable NES-appropriate Door behaviors—such as solid-until-open, key locks, timed opening, destructibility, damage barriers, one-way traversal, room transitions or collision-group filtering—remain candidate 1.9.1 work and are not authorized by this clarification.

The user approved and authorized **1.9.0 Gameplay Core only**. `docs/GAMEPLAY_SYSTEMS_1.9_PLAN.md` is controlling. Stop at the tested 1.9.0 candidate for independent audit. 1.9.1 and 1.9.2 require separate authorization.

## Ordered later work

### 2.0 — Runtime / Resource Linker + Live Play Foundation

- Mapper-aware PRG/CHR resource allocation, stable runtime asset identities and relocatable resources.
- Resource streaming and a canonical Raster Schedule / Raster Event representation for understood `$2005`/`$2006` changes, visible-frame palette/CHR/scroll/mirroring/mask changes, mapper writes, sprite-0 or timed-loop splits, mapper IRQ/MMC3 scanline effects, HUD/playfield separation and other time-dependent rendering behavior.
- Runtime profiles for fixed-screen, screen-transition, horizontal scrolling, vertical scrolling, top-down scrolling, mixed room/scroll, sprite-0 split, timed raster split, mapper-IRQ/MMC3 raster, and supported mid-frame CHR/palette/scroll behavior.
- Explicit debug/editable-ROM versus release-ROM source-embedding policy.
- Incremental compilation, changed-resource detection, EmulatorBridge synchronization and initial controlled LiveLink/runtime patching.

The Raster Event schema, timing representation and instruction vocabulary require later approval during 2.0 design. Their inclusion here establishes the architectural requirement only.

### 2.1 — RE Bridge + Evidence Model

Integrate the separate RE branch deliberately rather than wholesale. Evidence states include **Observed**, **Inferred**, **Decoded**, **Round-trip validated** and **Converted**. Explicit transfer operations include Send CHR to Project, Create Metatile Library, Create Scene/World from discovered data, Create Metasprite, Import Animation, Send decoded music/SFX to Audio Studio, export decoded music to MusicXML/MIDI where representable, and convert sufficiently understood raster behavior into canonical Raster Events through a user-approved bridge. RE success requires ROM diversity and unknown-format tolerance; Ninja Gaiden alone is not a sufficient acceptance corpus.

Raster provenance must be able to answer which instruction changed scroll at a scanline, which mapper write selected a visible CHR bank, which routine changed a palette, which IRQ produced a split and which physical PRG bank contains the responsible routine. Observation alone does not imply representation or compilability.

### 2.2 — Method Registry / Forge Knowledge Base

Store reusable methods, not distributed third-party game assets. Method families may cover CHR organization; metatile, World/map, compression, metasprite, animation, entity/spawn and collision formats; audio drivers; text and palette systems; mapper/banking; state-machine/code patterns; and Raster Methods such as sprite-0 splits, MMC3 IRQ splits, timed-loop splits, NMI-assisted effects, palette swaps, mid-frame CHR banking and scrolling/status-bar techniques. Where appropriate, a record follows:

**signature → evidence → decoder → encoder → canonical NES Forge mapping → validation → provenance → confidence**

Prefer **decode → NES Forge representation → encode → reproduce original representation** whenever technically possible.

Raster Method validation may use rendered-frame comparison, PPU-write traces, mapper-write traces and timing/scanline comparison.

### 2.3 — Integrated RE Workspace

Integrate bank-aware disassembly, labels/xrefs, runtime execution coverage, pointer-table discovery, mapper state, CHR provenance, OAM/metasprite inspection, animation tracing, audio-driver inspection, map/decompression analysis, a raster-event timeline, PPU-write inspection, mapper/IRQ tracing, scanline correlation and Raster Method matching.

### 2.4 — Live Reverse Engineering / Hot Patch

Connect RE, AssetRegistry, Resource Linker, EmulatorBridge and LiveLink for runtime asset inspection; RAM watches/breakpoints/watchpoints; CHR/palette/data hot edits; bank-aware ROM shadow patches; runtime entity parameter edits; music sequence replacement; controlled raster-schedule edits; mapper-aware runtime resources; CHR/palette/scroll state; other timing-sensitive behavior; and controlled live experimentation. Raster and timing edits remain gated on the 2.0 resource/linker/runtime identity foundation.

### 2.5+ — Continuous Knowledge Expansion

RE and the Method Registry are ongoing capabilities rather than a one-ROM completion claim. Each additional ROM may match known techniques, reveal variants, improve signatures, add validated decoders/encoders or extend provenance. ROM diversity and unknown-format tolerance remain acceptance requirements; each implementation tranche still requires authorization.

## 3.x — Hosted Worlds & Networked NES Games

The 3.x era connects real NES-class games to modern hosted infrastructure. It does not turn NES Forge into a 3D/MMO engine or modern client. The player-facing game remains 8-bit, NES-compatible and 6502-class; the host may provide transport, scale, durable state, matchmaking, social services and collaboration.

Conceptually:

**Hosted World → authoritative persistent state → interest/proximity projection → NES-compatible local state → 6502 runtime**

A hosted World may contain more data than one cartridge or console can hold. Each NES client receives only its relevant map/chunks, actors, inventory, structures, combat state, players and resources. The NES remains the game client; the host owns large-scale session and persistence state.

### 3.0 — Hosted Session / Network Foundation

Establish generalized InputSource and local-controller assignment, deterministic simulation contracts where applicable, emulator snapshots, input recording/replay, state hashes, session/player identity, authoritative-versus-peer state concepts and canonical network event envelopes. Do not hard-code a Hosted World genre.

### 3.1 — Traditional Netplay

Add synchronized controller input, peer/server sessions, rollback where appropriate, reconnect, spectators, lobbies/matchmaking and compatibility with suitable existing ROMs. Internet protocol code need not live inside the ROM.

### 3.2 — Hosted Network Runtime

Introduce canonical client intents such as move, interact, attack, pickup, craft, inventory action and World modification, plus authoritative results such as actor state/spawn/despawn, World delta, persistent-state change, inventory update and session event. Gameplay owns their meaning; Networking owns transport and synchronization.

### 3.3 — Persistent Hosted Worlds

Add server-side World/player persistence, streamed or chunked NES-compatible local projections, resources, inventories, structures, construction/destruction and reconnectable sessions. This is the foundation for NES-style survival, building and RPG experiences without changing the NES client target.

### 3.4 — Economy, Crafting & Construction Services

Candidate domain capabilities include inventories, currencies, resources, recipes, crafting, equipment, spells/abilities, structures, building materials, vendors/trading and progression/XP. These remain domain abstractions; Networking must not own their gameplay semantics.

### 3.5 — Large Match / Competitive Systems

Candidate capabilities include large-match rules, teams, controlled/shrinking zones, elimination, spectators, scoring, rankings and match history, all projected into an NES-class client.

### 3.6 — Social / Voice

Keep parties, friends/invites, lobby presence, text/voice and mute/block in a separate bounded context. Voice stays outside deterministic NES simulation; voice failure cannot alter game state.

### 3.7 — Collaborative Hosted Creation

Candidate capabilities include shared project sessions, presence, domain-aware synchronization, collaborative World editing, parallel domain work, change history/conflict handling, collaborative Build & Run, shared LiveLink testing and communication. Collaboration remains inside the NES/8-bit product model.

### Hosted persistence and networking rules

Current gameplay scopes remain Transient, Room and World. Future Session, Player, Hosted World and Account scopes may be introduced deliberately in 3.x, but must not be pulled into 1.x/2.x prematurely. Current explicit persistence stays backend-neutral so later hosted storage can reuse canonical semantics.

Networking must not become Gameplay, World, Inventory, Crafting, Economy, Audio or Voice. For example, Gameplay decides why `door.stateChanged(open=true)` occurs, how collision responds and what persists; Networking may transport that typed result. Hosted persistence owns durable remote storage, not domain meaning.

## Long-term eras

- **1.x — CREATE:** build complete original NES games visually.
- **2.x — UNDERSTAND & MANIPULATE:** link, inspect, reverse engineer, catalog, debug and live-edit NES software.
- **3.x — CONNECT:** connect NES games through multiplayer sessions, persistent Hosted Worlds, social systems and collaborative creation.

All three eras remain governed by the same hard rule: **NES Forge is an NES / 8-bit / 6502-class environment.**

## Standing boundaries

- Do not autonomously expand scope or advance milestones. Interesting opportunities are not authorization.
- Preserve verified behavior unless an explicit requirement changes it. If intent is ambiguous, preserve current behavior and surface the decision.
- Do not rewrite protected emulator, runtime-capture, Save As or CHR systems for architectural aesthetics.
- Every regression total must reproduce from the supplied release package.
- Do not begin the next numbered milestone automatically.
- Whole-screen World camera transitions and mapper 0 remain the current baseline. Smooth scrolling, Raster Events and mapper/runtime profiles wait for the ordered 2.0 foundation and are not part of 1.9.
- Capture, canonical representation and profile-level compilability are separate evidence claims. Preserve lossless captures even when the current backend correctly refuses a rebuild.
- Existing supported-ROM playback/capture is not general reconstruction of game logic. The RE bridge begins at 2.1 after the linker/identity foundation.
- LiveLink remains inactive until its expressly authorized 2.0 foundation.
- Modern hosting, networking, persistence, social, voice and collaboration services must remain outside the deterministic NES client/runtime semantics they surround.
- Do not introduce Session, Player, Hosted World or Account persistence scopes before an authorized 3.x design.
- Do not implement SNES/65C816, 16-bit, 3D or modern-engine client targets inside NES Forge; a future 16-bit product is separate.

Stop at the **stabilized 1.9.0 Gameplay Core candidate** for independent audit and separate real-browser acceptance. The exact next tranche awaiting explicit authorization is **1.9.1 — Gameplay Expansion**. It is not authorized yet. 1.9.2, every 2.x milestone and every 3.x milestone remain separately gated.
