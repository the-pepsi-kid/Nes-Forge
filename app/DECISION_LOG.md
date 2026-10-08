# D056 — Bounded Audio adaptive editing

Date: October 7, 2026 UTC (October 6 America/Denver). Owner: “ok, continue”, after the bounded adaptive UI audit.

Retained current-release assertions are updated from alpha.4 to alpha.5, including the displayed title; case contracts and counts remain unchanged. New alpha.5 Gameplay Core and Audio review examples are generated independently, and all historical examples and oracle files remain preserved.

Implement alpha.5 from preserved alpha.4. Keep direct native tracker entry, original desktop mouse strokes and canonical data/undo/save. Add compact Audio layout, selected-cell scrolling around viewport changes, and touch/pen envelope painting. Add the missing device-width viewport declaration; this enables existing narrow layouts across tabs and must be covered by cross-tab phone review. It does not expand the game model or engine.

Preserve all 964 alpha.4 cases and add 26 meaningful gesture/layout cases. Reverse only the exact declared delta to pinned alpha.4, retain older oracles, and run from a verified fresh extraction. Record browser launch blockers as zero checks; do not imply native keyboard, audible output or physical-device acceptance. The successful alpha.4 owner report does not accept alpha.5.

This closes the scoped implementation proposal, not the full Audio phase, manual/PDF work or cross-device UI program. Audio workflow/listening precedes native driver recovery. Existing milestone boundaries and later phases stay unchanged.

## Preserved decisions

# Decision log

Historical 1.6.7 decisions D001–D007 are preserved verbatim in `docs/history/1.6.7-current/root/DECISION_LOG.md` and the frozen release. Decisions D008–D013 below record 1.7. Their completed-milestone stop instructions are superseded only by the explicit 1.8 authority in D014. Blank startup, explicit factories, lifecycle ownership, protected boundaries and evidence discipline continue to apply.

## D008 — Proceed to bounded World Runtime

**Authority:** the user said “alright, let’s proceed” after 1.6.7 delivery. Implement the next World Runtime tranche through established service boundaries. Keep one existing-style authored player; general gameplay and audio remain later milestones. Do not add Scout-specific production behavior.

## D009 — Screen transitions

**Engineering decision:** use whole-screen camera transitions for 1.7. An optional camera preference question returned no answer. This is a bounded implementation choice, not an explicit user preference for screen stepping.

World coordinates use 16×16-pixel cells and a 16×15-cell viewport. Rooms/cameras must be screen aligned and non-overlapping within their own type. Camera records identify executable regions; smooth scrolling and dead-zone tracking are deferred. Record the exact behavior and limits in `docs/WORLD_RUNTIME.md`.

## D010 — Explicit start and traversal contract

World mode has separate saved start world, Spawn/Entrance and player source selections. Never infer them from active editor rows or first-found assets. Marker centers specify player feet at `(x×16+8,y×16+8)`. Entrance/exit traversal requires a new Up press while the feet occupy its cell; links specify both destination world and Spawn/Entrance marker. Validate clear body placement. Holding Up cannot bounce through reciprocal links. Start returns to the configured start. Screen crossings retain movement state; portal arrival resets transient player state. World mode executes attack animation without target damage.

## D011 — Schema 10 and distinct World ROM envelope

New World settings would be silently omitted by the 1.6.7 schema-9 serializer. Save schema 10 and require the actual older application to reject it. Retain supported legacy migrations, unresolved reference preservation and explicit downgrade rejection.

World ROMs use outer NFORGE15 layout 4 and WG17 v1 with deterministic LZSS-compressed authored source and CRC/length/placement validation. JSON source includes World settings and other authoring data, excluding prior imported ROM bytes to prevent recursive nesting. Clean reopening retains the newly opened ROM for original playback. Legacy layout-3 codecs and golden ROMs remain unchanged.

## D012 — Direct world resource linking

WorldCompiler follows start-world links and authored player dependencies independently of legacy Build Scene Set. World-used metatiles need no source-scene placement. Link their CHR/collision directly while preserving authoring IDs. Use deterministic build-local indices and allocation descriptors; stay on mapper 0. Format limits are upper bounds, not a promise that every authored world fits available PRG.

## D013 — Evidence and stop

The 1.7 runner must measure its own result and hash, followed by clean-package reproduction. The frozen 1.6.7 559/559 and 1.6.6 479/479 counts remain historical evidence. Browser acceptance is still unverified; the 1.7 attempt was rejected by Cloud Browser URL policy before application inspection (`checkpoints/1.7-browser-attempt.json`). Do not infer a browser pass from harness or emulator execution. Deliver 1.7 and stop; 1.8 is not authorized.

## D014 — Proceed to Audio Runtime / Audio Studio

**Authority:** after re-establishing the 1.7 governance and roadmap context, the user explicitly instructed **“Begin 1.8.”** Implement the ordered 1.8 scope only. Do not begin generalized gameplay (1.9) or linker/Live Play work (2.0).

## D015 — Existing audio representation is authoritative

Compile the current instrument envelopes, pattern cells, order list, tempo/speed/rows and animation `sound` events. An SFX is a stable ID/name plus one pattern channel and inclusive row range. Do not invent a separate SFX note sequence, score runtime or event system. Pulse 1/2, triangle and noise execute; DPCM and tracker effects reject when executable.

## D016 — Schema 11 and preserved ROM families

Add saved `audioRuntime` settings and stable SFX routing in schema 11. The actual frozen 1.7 editor must reject it atomically. Supported older projects migrate with audio disabled. Keep WG17 version 1/layout 4 and record schema 10 or 11 in its existing checked header; keep layout-3 formats and five golden ROM bytes unchanged when audio is disabled.

## D017 — Shared bounded APU engine

Use one AudioEngine emitter in generated viewer, single-room and World paths. Music follows existing tracker timing. One SFX preempts one channel and restores it; simultaneous SFX requests do not create nondeterministic channel corruption. Custom assembly remains mutually exclusive with generated Audio Runtime. Stay within current NROM allocations and report overflow.

## D018 — Import only after runtime playback

The permanent emulator suite verified runtime music, envelopes and sound-event SFX in all applicable generated paths before import expansion began. MIDI format 0/1 PPQN and uncompressed score-partwise MusicXML now adapt into existing tracker/instruments. Preserve SFX patterns, use one undo boundary, reject excess polyphony, and flatten tempo changes with warning. Compressed MXL and transcription remain out of scope.

## D019 — Evidence and stop

The 1.8 runner must retain all 606 prior cases and add explicit audio/schema/import coverage against one unchanged candidate, followed by clean-package reproduction. Mock DOM and bundled-emulator APU execution are not real-browser speaker or hardware acceptance. Deliver 1.8 and stop; 1.9 requires explicit authorization.

## D020 — Canonical Audio and interchange hierarchy

**Product decision:** NES Forge Audio remains the canonical editable and runtime audio representation. External formats are adapters at the boundary, not separate project or runtime models. MusicXML is the preferred notation-level interchange format. MIDI remains supported as a performance/event interchange format.

Future tablature and optical sheet-music recognition should preferably normalize into MusicXML and/or canonical NES Forge Audio. NES-only semantics that MusicXML cannot preserve losslessly—including driver commands, pulse duty behavior, envelopes, Noise-specific behavior, DPCM and timing tricks—remain authoritative in native NES Forge Audio. Export to MusicXML must never be treated as a lossless replacement for the native project representation.

## D021 — RE audio converges on canonical Audio

Future reverse-engineered music and SFX must decode into canonical NES Forge Audio first. Where recoverable structure is sufficient, that canonical result should support export to native NES Forge Audio, MusicXML and MIDI. Every export must distinguish represented musical structure from NES-specific information retained only in the native model. Do not create a game-specific RE audio runtime or a parallel decoded-song model.

## D022 — Forward authoring and RE share canonical representations

**Standing architecture principle:** forward authoring and reverse engineering converge on the same canonical NES Forge representations for CHR, palettes, metatiles, scenes/worlds, metasprites, animations, actors/gameplay and Audio. RE work transfers evidence into those representations through explicit conversion operations; it does not make captured or inferred data silently authoritative.

The separate RE branch enters through a deliberate 2.1 bridge after the 2.0 runtime/resource identity foundation. Do not wholesale-merge it. Evidence states are **Observed**, **Inferred**, **Decoded**, **Round-trip validated** and **Converted**. Acceptance requires ROM diversity and unknown-format tolerance; Ninja Gaiden alone cannot define success.

## D023 — Method Registry stores techniques, not third-party assets

The 2.2 Forge Knowledge Base is a reusable registry of methods and evidence, not a distribution channel for third-party game assets. A method record should support, where appropriate:

**signature → evidence → decoder → encoder → canonical NES Forge mapping → validation → provenance → confidence**

Prefer **decode → NES Forge representation → encode → reproduce original representation** whenever technically possible. Method families may cover graphics organization, maps/metatiles, compression, metasprites/animation, entities/collision, audio drivers, text/palettes, mapper/banking, raster techniques and state-machine/code patterns. An unfamiliar ROM should increasingly be explained as a composition of reusable methods rather than require a monolithic game-specific parser.

## D024 — Roadmap extension and authorization boundary

**Authority:** the user supplied the ordered roadmap through 2.4 and instructed this documentation-only reconciliation. The authoritative sequence is 1.7 completed baseline, 1.8 current candidate baseline, proposed 1.9 General Gameplay Systems, 2.0 Runtime / Resource Linker + Live Play Foundation, 2.1 RE Bridge + Evidence Model, 2.2 Method Registry / Forge Knowledge Base, 2.3 Integrated RE Workspace and 2.4 Live Reverse Engineering / Hot Patch.

This decision records order and dependencies only. It does not authorize implementation of 1.9 or any later milestone. Further Audio Studio improvements are non-blocking future work and also require express scope authorization.

## D025 — Proposed 1.9 architecture requires approval

The proposed 1.9 tranche replaces Player/Target special-case expansion with stable actor definitions and instances, reusable typed components, explicit behaviors/state machines, shared collision/combat/interaction primitives, spawn/despawn rules, typed animation actions, World/Room persistence, visual authoring, compilation and runtime verification. The existing 1.7 Player profile should become one configured actor use through a compatibility-preserving migration path.

Before implementation, the user must explicitly approve the complete 1.9 tranche and resolve three product-level choices: the visual form of behavior authoring, the granularity/lifetime of persistent state, and whether Player/Target migration is exposed immediately or initially implemented behind a compatibility adapter. No choice is made implicitly by this documentation update.

## D026 — Canonical representations include time-dependent behavior

**Product decision:** NES Forge must model both static resources and time-dependent NES behavior. Forward authoring and reverse engineering still converge on the same canonical NES Forge representations, and those representations must eventually cover both assets and the timed PPU/mapper techniques used to render and execute them.

Examples include `$2005` scroll changes, `$2006` PPU-address changes, visible-frame palette changes, CHR bank switching, nametable/mirroring and PPU-mask changes, mapper writes, sprite-0 splits, timed-loop splits, mapper IRQ/MMC3 scanline effects, HUD/playfield separation and other scanline- or frame-dependent behavior.

Runtime Capture may preserve an observed raster-dependent scene losslessly while the current static NROM backend correctly refuses to rebuild it. Preserve that conservative behavior. Never silently flatten, approximate or claim support for an unrepresented or incompatible effect.

## D027 — Captured, Represented and Compilable are distinct

Raster-dependent behavior has three separate claims:

1. **Captured:** original behavior was observed or preserved.
2. **Represented:** the behavior was understood and converted into canonical NES Forge raster/runtime events.
3. **Compilable:** the selected mapper/runtime profile can reproduce equivalent behavior.

No claim implies the next. Tests, UI and future RE evidence must name the state they establish rather than use “supported” ambiguously.

## D028 — Raster work follows the 2.0–2.4 dependency chain

The 2.0 foundation adds a canonical **Raster Schedule / Raster Event** workstream and compatible runtime profiles. Its conceptual path is **runtime observation → canonical raster events → compatible runtime/compiler profile → ROM**. The exact schema, timing unit, event vocabulary and storage design are intentionally not authorized by this roadmap clarification.

The 2.1 RE evidence model must preserve instruction/routine, scanline/frame, physical PRG bank, PPU/mapper write and IRQ provenance, with explicit user-approved conversion into canonical Raster Events. The 2.2 Method Registry adds Raster Methods and rendered-frame/trace/timing validation. The 2.3 workspace adds raster timelines, PPU writes, mapper/IRQ traces, scanline correlation and method matching. Controlled raster-schedule and timing-sensitive edits wait for 2.4 and the 2.0 linker/identity foundation.

This clarification does not change the next milestone. **1.9 remains General Gameplay Systems and is still not authorized.** Raster schedules, scrolling profiles, mapper IRQs and related runtime work are not 1.9 scope.

## D029 — Select 1.9 subject to plan approval

**Authority:** the user instructed **“Begin 1.9”**, then resolved the three product choices identified in D025 while explicitly directing that implementation not begin until the resulting plan is approved. This selects 1.9 as the next milestone but creates a plan-approval gate. No source, schema, runtime or UI implementation may change until `docs/GAMEPLAY_SYSTEMS_1.9_PLAN.md` is approved.

This supersedes D028 only as to selecting the next milestone. All raster work remains ordered under 2.0–2.4 and outside 1.9.

## D030 — Templates over one canonical structured behavior model

Preset behavior templates ship first for usability and onboarding. A structured state table is the authoritative serialized and compiled behavior representation. Templates are versioned authoring recipes that instantiate ordinary actor/component/state/transition records; the runtime compiler never consumes a separate template behavior model.

The canonical behavior contains stable IDs, typed parameters, an initial state, ordered states with entry/tick/exit actions and ordered transitions with priority, typed conditions/actions and a destination state. Evaluation is deterministic by priority then authored order. Unknown executable condition/action types fail rather than disappear.

A visual state graph is deferred from the first 1.9 tranche. If later authorized, it must be a higher-level editor/view over the same canonical records and commands. It may store optional layout metadata but cannot introduce graph-only runtime semantics or a competing serialized behavior model.

## D031 — Explicit scoped persistence, not actor snapshots

Gameplay persistence is intentional and authored. Transient/Actor-local runtime state resets when an actor or Room is reconstructed. Room-scoped variables preserve local outcomes such as defeated actors, switches, containers and destructibles. World-scoped variables share progression such as routes, boss state and keys across Rooms in one World. A Game/Global scope is reserved for future demonstrated need and is absent from the first tranche.

Actors, components and behaviors reference stable typed persistent-variable IDs. The runtime stores declared values, not complete actor memory, physics contacts, behavior stacks or arbitrary component internals. The model must remain deterministic, serializable, versionable, testable and backend-neutral for possible future SRAM/password/save systems. Automatic snapshots may later aid debugging but never become the canonical gameplay persistence model.

## D032 — Compatibility adapter first

**Historical direction; D040 narrows the implemented 1.9.0 claim.**

The existing Player/Target data and editor workflow remain intact initially. A build-time compatibility adapter maps them into the same canonical actor/component/behavior plan used by generalized gameplay without rewriting saved legacy records. A destructive or visible migration command is deferred until canonical actors are proven stable and can demonstrate behavior-preserving conversion.

Legacy builds with generalized gameplay unused must preserve verified behavior and pinned ROM bytes. Schema 12 is proposed because schema 11 cannot preserve generalized actor definitions, behavior tables and scoped variables; actual frozen-1.8 rejection is required. The precise gameplay ROM envelope/version remains an implementation-plan detail to settle through compiler-capacity analysis without changing legacy format behavior.

## D033 — First 1.9 tranche and template set await approval

**Historical proposal — superseded by D034 for sequencing and template allocation.** The nine-template first tranche below is not current scope.

The controlling proposal is `docs/GAMEPLAY_SYSTEMS_1.9_PLAN.md`. Its first tranche includes schema/project ownership, actors/instances/components, canonical state tables, explicit Room/World variables, the gameplay primitives needed by the initial templates, legacy adapters, table-oriented authoring, detached compilation, applicable single-room/World runtime execution, examples and reproducible regression evidence.

The initial templates are Sideview Player — Legacy Compatible, Ground Patrol Enemy, Stationary Contact Hazard, Collectible Pickup, Projectile, Switch + Door, NPC Interaction, Moving Platform and Checkpoint. Ladders and one-way platforms are shared environment/collision components.

The first tranche excludes the visual graph, arbitrary scripting, automatic persistence snapshots, Game/Global scope, SRAM/password/save-slot backends, destructive legacy migration, advanced pathfinding/planners, boss-specific architecture, raster/mapper/linker work, RE/Method Registry work, LiveLink, Audio expansion and protected-system rewrites. Implementation waits for explicit approval of the plan.

## D034 — Split 1.9 into architecture-proving tranches

**Authority:** the user approved the 1.9 architecture but corrected D033 because its proposed first implementation was too broad. D033 is superseded for sequencing and template allocation, not for the canonical actor/behavior/persistence architecture.

- **1.9.0 Gameplay Core:** actor definition/instance/runtime identity, typed components and parameters, canonical state tables/evaluator, explicit Room/World variables and bindings, Player/Target adapter, table authoring, schema 12/downgrade protection, applicable single-room/World compilation/runtime, and five templates: Sideview Player — Legacy Compatible, Ground Patrol Enemy, Stationary Contact Hazard, Collectible Pickup and Switch + Door.
- **1.9.1 Gameplay Expansion:** Projectiles, Moving Platforms, in-session Checkpoints, NPC/minimal dialogue interaction, ladders/one-way platforms and richer combat/traversal/events.
- **1.9.2 Behavior UX:** visual state graph over the same canonical records/IDs plus improved behavior/template authoring and diagnostics.

Each tranche requires separate authorization. The revised `docs/GAMEPLAY_SYSTEMS_1.9_PLAN.md` must be approved before 1.9.0 implementation.

## D035 — Formal actor and persistence identity boundaries

**Clarification:** D038 explicitly includes Scene placements and distinguishes authored persistence from execution memory.

- **Actor Definition:** durable reusable project asset; owns component defaults, behavior/visual references and typed parameters. It owns no placement, runtime slot or saved values.
- **Actor Instance:** durable authored placement; owns definition reference, Room/World location, authored transform, overrides, spawn rule and explicit persistence bindings. It owns no current timers, velocity or behavior state.
- **Runtime Actor:** ephemeral runtime handle/slot, generation-tagged if reused; owns mutable component and behavior state. It is not a persistent identity and may be spawned without an authored instance.
- **Persistent State Record:** one declared Room/World value keyed by stable scope owner and variable ID, plus an instance binding only when authored. It never stores a Runtime Actor handle or whole actor/component memory.

Runtime handles cannot cross reconstruction or save boundaries. Persistent values resolve only through stable authoring IDs. This preserves runtime freedom without confusing allocation identity with project or persistence identity.

## D036 — Bounded 1.9.1 dialogue, checkpoint and projectile contracts

**Clarification:** D038 controls the minimal dialogue boundary, checkpoint reset/store semantics and minimum source/collision filtering. The checkpoint wording below does not authorize copying or rolling back persistent-variable values.

The first Dialogue action is a modal ordered-page operation referencing one stable dialogue asset ID. New confirm presses advance pages; completion emits one typed event and returns control. Branching, choices, scripts, cutscenes, portraits, localization and implicit progression mutation remain outside the minimal contract.

Checkpoints store only an in-session World/Room/marker respawn reference plus existing declared persistent-variable values. Closing/reloading the ROM, rebuilding or power cycling clears checkpoint state. Checkpoints do not imply SRAM, passwords, save slots, cross-session saves or actor snapshots.

Projectiles use an ephemeral owner Runtime Actor ID to ignore the owner, then ordinary bounded collision-layer and hitbox/hurtbox masks to determine eligible hits. No faction, team, allegiance, reputation or relationship system is introduced, and no persistent state may store the runtime owner handle.

These contracts document 1.9.1 boundaries only. They are not part of 1.9.0 and are not implementation authority.

## D037 — Revised approval gate

**Superseded gate wording:** D038 requires explicit implementation authorization; canonical architecture approval is not sufficient.

The user expressly instructed that implementation remain paused while the split plan is reviewed. Approval of the revised plan authorizes only **1.9.0 Gameplay Core**. 1.9.1 Gameplay Expansion and 1.9.2 Behavior UX remain independently gated, as do 2.0 and later work.

## D038 — Confirm sequencing, identity boundaries and implementation hold

**Authority:** the user reiterated that the canonical architecture is approved, but implementation remains unauthorized, and requested the corrected three-part plan again. This is a sequencing correction, not a change to the eventual 1.9 feature set.

- **1.9.0 Gameplay Core:** Actor Definitions, Actor Instances, Runtime Actor identity, typed components/parameters, canonical state-table behaviors and deterministic evaluator, explicit Room/World persistent variables/bindings, legacy Player/Target adapter, table authoring, single-room + World compiler/runtime integration, schema 12/downgrade protection. Initial templates only: Sideview Player, Ground Patrol Enemy, Stationary Contact Hazard, Collectible Pickup and Switch + Door.
- **1.9.1 Gameplay Expansion:** Projectile, Moving Platform, Checkpoint, NPC/basic dialogue interaction, ladders, one-way platforms and richer combat/traversal/events.
- **1.9.2 Behavior UX:** visual state graph over the same canonical records/IDs, improved template/behavior authoring and diagnostics.

**Identities:** Actor Definition is a reusable authored archetype. Actor Instance is a persistent authored placement/reference in a Scene/Room/World; this means saved authoring data, not runtime memory. Runtime Actor is an instantiated execution object with transient state. Persistent State Record contains only explicitly declared Room/World variables, never implicit serialization of Runtime Actor memory. Scene placement does not add a persistence scope; runtime handles never become persistent keys or the 2.0 resource-linker identity system.

**Dialogue:** first implementation belongs to 1.9.1 and is minimal interaction/display/reference behavior with acknowledgement/completion. No dialogue implementation, branching dialogue system or dialogue-language subsystem belongs to 1.9.0; branching/language systems are also outside the minimal 1.9.1 contract. Exact operation names and panel presentation remain later implementation details.

**Checkpoint:** an in-session authored respawn reference, not a snapshot of variables or actors. Ordinary death/respawn may use that location while declared variables retain their current values in the same explicit Room/World store. Runtime reset or power-cycle clears checkpoint/session state and returns to authored project defaults. Cross-session saving remains unavailable until a future backend is explicitly authorized.

**Projectile ownership:** only the minimum transient source/collision-group semantics needed for self-hit exclusion and damage filtering; no generalized faction/team/reputation system. Reused runtime slots must not rebind ownership to an unrelated actor.

**Delivery and gate:** the standalone plan and the plan inside the release package must agree. Return the revised plan and stop. Wait for explicit authorization to implement **1.9.0 Gameplay Core only**; this decision records no implementation authority. 1.9.1, 1.9.2 and later milestones require separate authorization.

## D039 — Authorize and bound 1.9.0 Gameplay Core

**Authority:** the user approved the corrected 1.9 plan and explicitly instructed implementation of **1.9.0 Gameplay Core only**, followed by a tested, reproducible candidate release and handoff for independent audit.

The implementation therefore owns schema 12, Actor Definition/Actor Instance/Runtime Actor/Persistent State Record boundaries, typed components and parameters, canonical state tables, deterministic priority-then-authored-order evaluation, explicit Room/World variables and bindings, the legacy Player/Target adapter, table-oriented authoring and applicable single-room/World runtime integration. The template list is fixed at Sideview Player, Ground Patrol Enemy, Stationary Contact Hazard, Collectible Pickup and Switch + Door.

Required acceptance includes identity isolation and generation-safe slot reuse; transient reset with Room persistence; World-variable communication; cross-owner rejection; unknown-operation preservation with executable rejection; single-room/World semantic equivalence; unchanged legacy whole-ROM bytes when unused; and atomic rejection by the actual frozen 1.8 baseline.

This decision does not authorize 1.9.1, 1.9.2, mapper/raster work, Audio expansion, RE integration, Method Registry, LiveLink, save backends or any later milestone. Stop after the 1.9.0 candidate and handoff.

## D040 — Stabilize the audited 1.9.0 candidate in place

**Authority:** independent audit found the 1.9.0 architecture and release discipline sound but withheld baseline approval. The user authorized correction of the seven audit findings only, explicitly prohibited 1.9.1 and every new gameplay feature family, and required a new measured candidate total plus separate manual browser closeout.

Every canonical condition/action now has an explicit operand schema. Missing, malformed, out-of-range, unknown, invalid-reference and type-incompatible operands fail executable validation before code generation. Unknown operation types remain preservable authoring data but reject executable builds. Generated-runtime profiles explicitly enumerate operations they execute; canonical operations outside the selected profile reject before ROM emission and never compile as silent no-ops.

The 1.9.0 mapper-0 profile has 64 one-byte persistent slots at `$0380`–`$03BF`; a 65th variable rejects before code generation, preventing overlap with Runtime Actor health at `$03C0`. The table UI authors all approved core records and Scene/World/Room placement without external JSON editing. Room-scoped UI authoring is covered through World leave/re-entry, persistent-value retention and transient Runtime Actor reconstruction.

The Player compatibility contract is deliberately narrowed. A canonical Sideview Player binding selects the retained Player executor, which still owns movement, collision and animation. The adapter is not metadata-only—it is validated and used to bind contact damage and runtime execution—but it is also not full generic-evaluator Player unification. Any later conversion/unification requires separate authorization and parity evidence.

All five templates require executable conformance evidence: retained Sideview movement under the declared adapter, Ground Patrol movement/contact damage, Hazard enable/disable, Collectible persistence and Switch/Door persistence. The corrected candidate must retain legacy whole-ROM parity, schema/lifecycle, World, Audio and service-ownership evidence. This stabilization does not authorize 1.9.1, 1.9.2 or later roadmap work.

## D041 — Hard NES / 8-bit / 6502-class product boundary

**Authority:** the user supplied the 2026-09-15 governance update as authoritative product/architecture clarification while expressly withholding implementation authority.

NES Forge remains an NES/Famicom-class 8-bit development, runtime and reverse-engineering environment. Generated games target Ricoh 2A03/2A07 6502-derived execution, NES PPU/CHR/tile/metatile/sprite/palette concepts, NES APU-style audio, NES-compatible mapper/runtime profiles and NES controller/input concepts.

Modern infrastructure may surround the NES game for development, builds, testing, RE, Method Registry services, hosted persistence, networking, matchmaking, accounts/sessions, collaboration and voice/text communication. It must not replace the canonical game target with a modern native client, 3D engine, 16-bit runtime, modern GPU scene graph or cosmetic “NES-looking” engine.

Any future SNES/65C816 or other 16-bit environment must be a separate product with its own architecture, hardware/compiler/runtime model, canonical representations and verification baseline. NES Forge may become broader around the NES, not broader instead of it.

## D042 — Reserve 3.x for Hosted Worlds & Networked NES Games

The ordered 3.x theme is **Hosted Worlds & Networked NES Games**:

- 3.0 Hosted Session / Network Foundation;
- 3.1 Traditional Netplay;
- 3.2 Hosted Network Runtime;
- 3.3 Persistent Hosted Worlds;
- 3.4 Economy, Crafting & Construction Services;
- 3.5 Large Match / Competitive Systems;
- 3.6 Social / Voice;
- 3.7 Collaborative Hosted Creation.

The host may use modern services and retain state far beyond cartridge/RAM limits, while every player-facing client remains NES / 8-bit / 6502-class. This roadmap reservation authorizes no 3.x implementation. 1.9.1 remains the next milestone that could be authorized; 1.9.2, all 2.x work and all 3.x work remain separately gated.

## D043 — Hosted projection and domain-ownership model

Large hosted state is projected into a bounded NES-compatible local view:

**Hosted World → authoritative persistent state → interest/proximity projection → NES-compatible local state → 6502 runtime**

Each client receives only relevant map/chunks, actors, inventory, structures, combat state, players and resources. The NES remains the game client. Future Session, Player, Hosted World and Account persistence scopes belong to deliberately authorized 3.x design and must not be pulled into 1.x/2.x; current Transient, Room and World persistence remains backend-neutral.

NES Forge continues as a domain-oriented modular monolith. Domains own concepts, validation and semantics; cross-domain interaction uses stable IDs, typed references, declared dependencies, versioned contracts, events and explicit adapters. BuildGraph coordinates dependencies without owning domain semantics. Object lifecycles and end-to-end capability paths must be explicit, and vertical slices may prove those paths without erasing ownership.

Networking owns transport and synchronization, not Gameplay, World, Inventory, Crafting, Economy, Audio or Voice meaning. For example, Gameplay decides why a Door opens, how collision changes and what persists; Networking may transport the typed state change. Voice remains outside deterministic NES simulation and cannot affect game state when unavailable.

## D044 — Switch + Door remains an alpha 1.9.0 proof

The five-template limit remains unchanged. The 1.9.0 Switch + Door template proves stable identity, linked Room/World persistence, switch control, active/inactive behavior and visual state. It does not establish a finalized physical-blocking or traversal contract.

Configurable collision/traversal behaviors—solid-until-open, key locks, timed opening, destructibility, damage barriers, one-way traversal, room transitions and collision-group filtering—remain possible 1.9.1 work. Recording those possibilities does not authorize them or change the current candidate.

## D045 — Approve bounded 1.9.0 capability-path correction

**Authority:** the owner approved the bounded correction plan only for candidate HTML SHA-256 `4d4da4547c641d71e685cd688ea421158460605f9ec3b0f201c4eba56227f6a1`, including the five recorded owner decisions and stronger acceptance clauses. This does not promote the resulting candidate or authorize another milestone.

WorldCompiler owns reachability and passes the complete reachable-World set to GameplayCompiler. Actors in linked destination Worlds/Rooms compile and execute in the same bounded plan. Unreachable actors remain canonical authoring data with explicit diagnostics. The 12 executable slots include the Sideview Player compatibility binding; overflow rejects and actor streaming is not introduced.

GameplayModel owns one component-field schema consumed by GameplayUI and GameplayCompiler. Known invalid fields fail before emission rather than being coerced, clamped or masked. Only enabled components provide runtime capability. Disabled Behavior retains placement/rendering but performs no evaluator work, timer work, persistent writes or behavior damage; re-enabling uses the preserved canonical records.

Behavior-action ContactDamage operands and Actor Instance persistence bindings are authoritative. Retained component values may act only as consistency-checked mirrors. Conflicts reject rather than silently choosing a source or migrating data.

Generated overlap uses unsigned axis distances in both single-room and World backends without changing the existing strict threshold contract or World screen isolation.

Single-room GP16/layout-3 reopening is explicitly partial and cannot claim Gameplay Core restoration. Original ROM bytes remain available to Run Original; native JSON/ZIP is the full authoring backup. WG17 World reopening remains lossless. A new source-bearing single-room format is a separate future decision.

`syncActiveFromPersistent` retains one-way alpha semantics: it can deactivate an actor, but an inactive actor cannot evaluate the reverse value until reconstruction. This is separate from physical Door blocking and does not authorize a reversible gate system. Door physical blocking remains deferred under Option B.

The correction must preserve schema 12, five templates, frozen-1.8 rejection, protected emulator/capture/Save As/CHR behavior, service ownership and five legacy whole-ROM oracles. It ends at a new independently auditable 1.9.0 candidate; 1.9.1 and all later work remain unauthorized.

## D046 — Authorize Mobile Play & Controller Support inside 1.9.0 Alpha

**Authority, September 28, 2026 (America/Denver):** the owner requested mobile controls/fullscreen after a successful mobile demonstration, agreed with the bounded touch/play-view/gamepad recommendation, requested its roadmap update, and then instructed **“ok let's begin.”** That final instruction authorizes implementation of this follow-up. It does not accept/promote a build or authorize 1.9.1, 1.9.2 or later scope.

The product maturity is **functional alpha**. Keep release identity **1.9.0 — Gameplay Core**, project schema **12**, and candidate identifier **`mobile-play-1`**. The corrected input reference is HTML SHA-256 `472c4eaa427c466e204a07f0c0c30d3ecfc24c318b5ee1566dddaa2bb4903e08`; its 658/658 result remains historical. Changed bytes require their own full clean-extraction gate, focused regressions and recorded hash.

Implement touch D-pad/B/A/Select/Start, an expanded Play view, native fullscreen as available with fallback, and one OS-recognized wired/Bluetooth controller with button mapping. Keep keyboard behavior. Controller pairing is performed by the OS, not Web Bluetooth or WebUSB. All sources feed one existing local NES port. Generalized InputSource/player assignment, multiplayer, snapshots, recording/replay and hosted work remain deferred.

Use additive local input/presentation modules and explicit lifecycle wrappers. Preserve protected emulator/capture/Save As/CHR source and retained CPU/PPU/APU behavior. Release input at interruptions, pause safely, and require neutral rearm so held buttons cannot remain stuck or resume unexpectedly. Entering/exiting the play presentation preserves loaded ROM/state and returns to the editor. Fullscreen denial/unavailability must retain usable expanded play.

Preserve the five templates, 12-actor executable plan, 64 persistent bytes, NES/8-bit/6502 target, schema-12 downgrade protection, five legacy whole-ROM oracles, source recovery limits and Option B Door deferral. No gameplay or ROM-generation expansion is included.

Current evidence belongs in `build-inputs.json`, `test-results/candidate/Summary.json`, `test-results/browser-mobile/Report.json` and `checkpoints/1.9.0-clean-extraction/Reproduction.json`. Keep automated VM/browser, physical device/controller and owner acceptance separate. User-reported mobile success is qualitative feedback; headless browser/synthetic-controller checks do not certify iPhone Safari, Android Chrome, USB/Bluetooth interoperability or speakers. Physical-device acceptance remains pending until observed and recorded.

The workshop stays documentation followed in the existing NES Forge environment. The expanded comprehensive manual's printable PDF editions and combined final documentation ZIP remain a separate unfinished deliverable. After packaging/verifying this bounded candidate and reporting remaining device checks, stop for owner acceptance.


## D047 — Bounded mobile presentation stabilization and roadmap reconciliation

**Authority, September 30, 2026 (America/Denver):** after the roadmap revision identified measuring mobile lag and closing current-alpha device checks as the immediate next work, the owner instructed **“Ok, let's continue.”** This authorizes the bounded stabilization follow-up described here. It does not authorize a protected-core rewrite, future gameplay/Audio/network implementation or broader RE integration, hardware development, release promotion or public publishing.

Retain the D046 local touch/keyboard/gamepad and expanded/fullscreen contract. Produce **1.9.0 Gameplay Core — Alpha**, candidate **`mobile-play-2`**, schema **12**. The prior `mobile-play-1` HTML SHA-256 is `e7c75ccd43007c46b5e0336105f6551f4b6183cc39730802cd1fba226eb7fe12`; its 702/702 across 28 suites belongs only to that artifact. The new HTML SHA-256 is `4fc607a6cbdbdfed027db10df138c64f8bfe5fa95fc7a46063041313cb63ad62`; read `build-inputs.json` and the new `test-results/candidate/Summary.json` for exact provenance and actual measured totals. No predicted total or prior pass certifies changed bytes.

The only changed production files are `src/services/emulator-play-ui.js` and `src/services/release-info.js`. Defer obscured sidebar DOM redraw only while expanded Play is active, then call the original sidebar implementation once on exit when pending. Keep the original canvas upload, register display, input adapter, frame scheduler and CPU/PPU/APU implementation. Fit the canvas on resize events/ResizeObserver, cache identical dimensions, and retain periodic fitting when ResizeObserver is unavailable. Preserve capture, Save As, CHR, compiler/runtime, schema, five templates, 12-actor/64-byte limits and all existing acceptance guards.

The identical mock-DOM call-count probe observed 60 canvas uploads in both builds, while 60 expanded Play palette rebuilds became zero. Five stable ticks changed from five bounds reads/ten CSS writes to zero with ResizeObserver; one pending sidebar update occurs on exit. This proves avoided presentation operations, not phone throughput, audible output, measured A/V latency or resolution of the reported lag. Physical devices/controllers and browser layout remain separately pending. Re-run the complete gate and clean-extraction reproduction after freezing provenance inputs.

The owner reports prior-build touch success, tutorial steps 1–9 completed with guidance and the tutorial ROM running in another emulator. Device/browser/emulator details and the ROM hash were not recorded. Mobile A/V lag remains open; physical controllers remain untested. These observations do not promote the candidate. D046's statement that printable documents were unfinished is historical: the expanded manual PDFs and revised Alpha Review Kit were completed September 30 as separate deliverables.

The revised planning order is 1.9.0 stabilization, separately gated 1.9.1 gameplay and 1.9.2 behavior UX, **1.9.3 Audio completion**, bounded **2.x RE acceptance**, then **3.x hosted worlds/authoritative inventory and wallet-backed items**, with an eventual **4.x tech deck**. Audio and finite RE completion precede hosted/wallet integration; wider RE compatibility may continue later. The hardware track may branch after hosted foundations, with optional mesh behavior evaluated separately from Wi-Fi/cellular play. This records direction, not blanket implementation authority for those eras. Subsequent owner steering explicitly brings the bounded RE start forward as recorded below.

Retain community accessibility through approachable standalone authoring, clear documentation and tested focus/input behavior, without claiming a completed accessibility certification. A private GitHub repository is recommended after stabilization and before substantive RE development for durable source continuity and review; no repository has been created and no public release/license decision is implied. Prior active documents are archived at `docs/history/mobile-play-1/`; D046 remains unchanged historical evidence.


**Subsequent owner steering:** “Well RE needs to start happening as I feel we are in a pretty good state.” Begin a separate bounded, initially read-only RE intake/inspection track now, alongside mobile closeout and ahead of future 1.9.1–1.9.3 completion. Start with ROM inspection and evidence-backed assets/addresses before audio-driver decoding. This direction does not add RE code to mobile-play-2, authorize a wholesale RE-branch merge, or silently approve every future mapper/compiler/live-edit feature. The initial intake need not wait for a private GitHub repository; that recommendation supports substantive development and does not block the owner’s requested start. Audio completion and finite RE acceptance remain gates before hosted worlds/wallet integration.


## D048 — Integrated RE recovery for one independently authored native ROM

**Authority, September 30, 2026 (America/Denver):** after asking why RE inspection JSON could not become editable scenes/collision/audio and discussing a supported-ROM recovery milestone, the owner instructed **“Alright, let's see what that looks like then.”** Implement the bounded integrated example now. This supersedes D047's intake-only boundary for this slice; D046 and D047 remain unchanged historical records. It does not authorize every future RE, gameplay, Audio, hosted, wallet or hardware milestone.

Produce **1.9.0 Gameplay Core — Alpha**, candidate **`re-bridge-1`**, retaining schema **12**, exactly five Gameplay templates, 12 executable actor slots and 64 persistent bytes. The input reference is `mobile-play-2`, SHA-256 `4fc607a6cbdbdfed027db10df138c64f8bfe5fa95fc7a46063041313cb63ad62`, measured 708/708 across 28 suites. Freeze that reference. The changed candidate gets its own exact hash, complete clean-extraction gate and separate acceptance; no prior total certifies its bytes.

Create an independent source-available homebrew `Bridge_Room.nes` with its own 6502 machine code, native room/collision tables, CHR and Pulse 1 driver, without embedded Forge project JSON. Recognize only its checked native engine profile and decode graphics, a fixed room, palettes, actual 0/1 per-cell collision, spawn and a 16-row constant-volume Pulse 1 song. The supplied song runs at 12 frames per row. Transfer into the existing canonical scene/collision/Audio representations; preserve original ROM bytes for Run Original. This proves a supported native-format decode and authoring bridge, not a Forge metadata round trip or a general engine inference system.

The first example narrows the proposed audio demonstration to music: the source fixture has no SFX, and none is invented or claimed recovered. Other sound drivers, SFX and effects remain unimplemented. The original engine supports left/right movement. Its converted project uses the existing Forge sideview player, with added jump/attack animation states and no damage hitboxes. Clearly disclose this adaptation; do not claim original gameplay/source reconstruction or byte-identical rebuilding.

Add isolated RE service/UI modules in **RE / DISASM**. The user chooses a ROM and explicitly analyzes it, reviews decoded content/evidence, then selects **Import as new project** or **Download Forge project JSON**. Keep **Download inspection report** separate and identify it as evidence rather than a project. Inspection is read-only. Import revalidates and uses the existing undoable project-replacement path. ProjectStore may add only a format-specific inspection-report rejection with clear guidance; invalid imports must remain atomic.

Preserve the emulator, renderer, Runtime Capture, Save As, CHR engine, source protection hashes, canonical compiler/runtime, schema compatibility, five whole-ROM goldens and mobile control/presentation behavior. Do not wholesale-merge the older RE branch. General commercial-ROM support, NESmaker/other ASM migration, Lua and other language adapters, Method Registry, mapper/raster/linker work and LiveLink are separate work. ASM-first migration is proposed direction and has no implemented compatibility claim here.

Retain the 28 required suites and add `re-bridge-model`, `re-bridge-ui`, `re-bridge-runtime` and `re-report-import`. Verify native fixture reproduction, supported data recovery, explicit transfer/undo, source retention, malformed/unsupported rejection, report-import errors, and edit/build/play behavior. Current hash and measured outcomes live in `build-inputs.json`, `test-results/candidate/` and the clean-extraction record. Browser walkthrough remains pending because Chromium is unavailable; no physical controller/device, native picker, speaker or independent NES hardware pass is inferred from automated VM/emulator evidence.

Prior active documents are archived byte-identically under `docs/history/mobile-play-2/`. The comprehensive manual/PDF and Alpha Review Kit remain separate earlier deliverables; add the current bounded RE walkthrough in `docs/RE_BRIDGE.md`. Keep community access, readable controls and source continuity as goals. No GitHub repository or public release is created by this decision. Stop at the independently auditable candidate and report remaining acceptance work.


## D049 — Bounded emulator history navigation for playtesting and RE

**Authority, September 30, 2026 (America/Denver):** the owner requested: **“We also need a way to skip forward and backwards for loaded roms. Sorry, this is something that just came to mind when someone was playtesting it.”** The owner clarified: **“In the emulator, so I assume this functionality can be used to skip forward or backwards for RE analysis.”** The following direction was **“Yes, we want comprehensive RE.”** This explicitly authorizes the bounded loaded-ROM navigation slice now and records comprehensive RE as the long-term goal. It does not claim that this slice completes comprehensive RE or authorize unrelated gameplay, hosted, wallet or hardware work.

Produce **1.9.0 Gameplay Core — Alpha**, candidate **`re-navigation-1`**, schema **12**, retaining the D048 native-room recovery workflow and all existing template/actor/persistence limits. Prior decisions, artifacts and their measured reports remain historical; changed bytes require their own full clean-extraction gate and owner review. The current reproduction record belongs at `checkpoints/re-navigation-1-clean-extraction/Reproduction.json`.

Add isolated timeline and playback controls around the existing emulator. **Playback tools** exposes opt-in **Record history**, off by default; **Back 1**, **Forward 1**, **−60 frames**, **+60 frames**, and cancellation during batch work. Keep these controls inside expanded Play/fullscreen. Record actual resumable CPU/mapper/PPU/APU state, capture-trace data and completed framebuffers for the active ROM session. Keep immutable ROM identity, host audio nodes, scheduler/load tokens and live controller ownership outside restored state. Do not replay a queued speaker buffer or reapply held live controls.

Back/Forward within retained history restores recorded states without executing the CPU. Forward at the live edge executes actual muted frames with neutral input, and forward stepping remains usable with recording off. Every navigation completes paused. Run or ordinary manual Frame from a restored past state branches and discards the former future. New load, reset, CPU Trace and unload clear/reseed history as applicable. Batch execution yields so cancellation and lifecycle changes can take effect. No continuous 2× playback or instruction-by-instruction reverse 6502 engine is included.

Bound storage by both **300 states** and **32 MiB of serialized stored data**, evicting older states as necessary and showing the actual retained frame range. The serialized budget includes encoded state data, encoded/raw framebuffers and record metadata, not all JavaScript heap overhead or temporary codec memory. Do not promise five seconds or any fixed duration. Turning recording off drops history. Unsupported state must disable/clear history and report failure before a partial restore. Emulator history is transient analysis state, not a new project field, durable save-state format or Gameplay persistence scope.

Retain CPU/PPU/APU algorithms, renderer, capture implementation, Save As, CHR behavior, compile targets and original source protection hashes. Exact wrapper-aware preservation normalization may recognize the intentional adapters; it must not weaken protection or replace historical hashes. The earlier bridge gate's mobile-only normalization mismatch is corrected through that narrow mechanism and does not excuse an input/runtime regression. Underlying emulator mapper/raster/audio-timing limits remain unchanged. Capture and RE readouts after navigation must correspond to the restored state.

Retain all **32** prior suites and add **`emulator-timeline`**, **`emulator-timeline-ui`** and **`emulator-timeline-runtime`**, for **35 required suites**. Actual case totals and results are measured, not predicted. Verify complete state restoration, recorded-future restoration without CPU work, live-edge/off-record forward execution, branch truncation, bounded storage/eviction, lifecycle invalidation, cancel races, audio/input handling, capture/readout parity and expanded/fullscreen controls. Browser/device, native picker, speakers and independent hardware acceptance remain separate and unclaimed.

Comprehensive RE still needs broader supported engine/data/audio decoding, deliberate evidence/provenance, disassembly and debugging capabilities, source migration and controlled edit/build workflows. ASM/Lua compatibility, arbitrary-game recovery, Method Registry, mapper/resource/raster foundations, exported snapshots, deterministic input replay and LiveLink are not implemented by this navigation feature. Document the concrete first slice in `docs/EMULATOR_NAVIGATION.md`, preserve the supported-ROM walkthrough, and end at an independently auditable candidate. Prior bridge documents are retained under `docs/history/re-bridge-1/`. No publication, repository creation or release promotion is authorized by this decision.

## D050 — engine-independent 6502 analysis (September 30, 2026)

**Owner direction:** “All 6502 roms should be analyzable. Regardless of engine.” After the clarified roadmap and distinction between analysis and editable recovery, the owner instructed “Ok, let's implement please.” The owner subsequently confirmed “Gotcha gotcha. Thank you. Please continue.” when the distinction was explained again.

**Decision:** Build `re-analysis-1` as a separate 1.9.0 Alpha/schema-12 candidate based on frozen re-navigation-1 (`e4ac5e66dcd49aa965dab7c1c678399b47ef31ff579aa6c5d83a859855af3e16`). Implement general binary intake, immutable identity, bounded hex reads/search, physical-range provenance, explicit CPU/bank mapping, offline 6502 instruction candidates, user labels/notes and analysis-report export. Recognized NES containers may supply validated layout/mapping information; unsupported or malformed formats retain honest raw inspection. Engine recognition and emulator support never gate intake.

Keep recovery as a separate named action. It still supports Native Room v1 only and rejects unsupported conversion. Do not treat disassembly candidates as original source or executable code evidence. CPU/opcode policy, mapping assumptions, size/output limits and unknown data must be visible. Raw analysis of another 6502 platform does not add that machine's emulation or change NES authoring targets.

Preserve all 35 prior suites and their 788 measured cases; add mandatory `re-analysis-model`, `re-analysis-ui` and `re-analysis-integration` suites, for 38 required suites. Measure case totals from the final unchanged HTML after clean extraction. New browser automation has its own report tied to the same hash; a blocked launch must claim zero executed checks. No browser/device/hardware result is inferred from the VM suite.

The next gameplay-debugger work remains separately bounded: memory comparisons and candidate searches, access watches, breakpoints/traces, reusable checkpoints, controlled input and reversible experiments. Named damage/enemy/stage actions need observed or verified state/routine contracts. Frame navigation does not itself implement those semantic actions. No additional engine decoder, source migration, hosted/wallet work, publication or release promotion is part of this tranche. Prior candidate documents remain under `docs/history/re-navigation-1/`.

### D050 correction — visible intake and unmet workflow (October 1, 2026)

The owner reported that only editable recovery appeared usable, their ROM was rejected there, and stage controls/native audio/collision/scenes were absent. Source review confirmed that the general-analysis file input inherited the global hidden-file-input rule without the override present on recovery. `re-analysis-1a` repairs that input's visibility, strengthens the checks that missed it, and reruns the existing complete clean-extraction gate. No promotion or broad RE completion follows from this fix.

The remaining workflow gap is acknowledged: independent static inspection and a known-profile demonstration do not fulfill the requested gameplay investigation/native resource recovery. Loading the emulator does not start analysis. Next acceptance must use the owner's exact ROM and a specific gameplay event, keeping actual decoded structures distinct from observations and unknowns. Original ROMs and prior artifacts remain preserved.

## D051 — integrated read-only runtime investigation (October 1, 2026)

**Owner direction:** After supplying the Pepsi ROM and completing the previous scoped manual tests, the owner asked whether Forge should discover scene/collision/audio/gameplay structures across engines, then approved continuation: “Ok, can we continue with that or what do you think?” The follow-up explicitly confirmed the location: “Ok so what you are currently doing will be implemented as part of Forge right? ROM analysis”. Implement the investigation workflow inside the existing standalone Forge environment.

**Decision:** Candidate `re-runtime-1`, schema 12, adds engine-independent tools: adopt the loaded ROM into general analysis without reloading the game; opt-in execution coverage, PPU/APU writes and named RAM writes; before/after memory comparisons; checked origin-PC/file-offset links; runtime evidence and observed-PPU-resource export. The tools do not select functionality by Pepsi filename/hash or require a recognized recovery engine. Static intake still works when emulation is unavailable. Runtime investigation uses the current emulator and cannot claim hardware/mapper support it does not provide.

Observation is off by default and does not patch original ROM bytes, game RAM, project records or generated code. The distinctly labeled trace-from-reset action deliberately resets playback to observe initialization. Snapshot identity and discontinuity handling prevent mixed-ROM or mixed-history evidence. Keep at most eight RAM-write watches; cap a trace at 8,192 events, 4,096 executed-PC records and 2,000,000 instructions. Show truncation/stop reasons. Read RAM backing storage without I/O side effects. Keep mapper uncertainty explicit rather than inventing physical code locations.

Observed PPU bytes/masks and APU writes remain execution evidence, not generic recovery of native scenes, collision or tracker music. There is no general stage selector, health/enemy manipulation, breakpoint system, input replay or live patch facility. The Native Room v1 decoder retains its separate scope. Preserve schema 12, five templates, actor/persistence bounds, CPU/PPU/APU algorithms, captures, Save As, CHR behavior and all legacy ROM oracles.

Retain 38 suites and add `re-runtime`, `re-runtime-ui` and `re-runtime-integration`, for 41 mandatory suites. Measure actual totals on one frozen HTML from clean extraction. Verify trace-off inertness, bounds, watched RAM, PPU/APU provenance, mapper uncertainty, identity, lifecycle/history invalidation, snapshot comparison and UI actions. Use the owner's exact Pepsi ROM to demonstrate actual gameplay-state observation; use another fixture for sound activity because Pepsi's explored states have no observed APU writes. External scripts are evidence for expected behavior only, not a pass of the integrated UI. Browser/device and owner acceptance remain separate. Archive preceding current documents under `docs/history/re-analysis-1a/`. No promotion or later-milestone implementation follows automatically.

## D052 — bounded Audio Correction (October 4, 2026, America/Denver)

**Owner direction:** after audio prioritization, two reproduced findings and the consolidated roadmap, the owner instructed “Ok, let's continue.” Implement the bounded two-defect candidate first.

**Decision:** use 2.0.0-alpha.1 / audio-correction-1, schema 12. Correct generated music/SFX stream cursor carry for the supported 128-row range, and emit a channel-correct triangle timer table. Preserve the existing canonical tracker/instrument/SFX representation, 60-byte zero-page reservation, pulse/noise paths, emulator and protected services. Hardware timer saturation at the low end remains explicit. No new music driver, preview engine or broader feature is included.

Retain all 895 preexisting cases and add independent compiled-runtime boundary/pitch regressions. Preserve exact historical source checks through a narrowly declared correction delta, frozen reference HTML/reports and unchanged golden oracles. Measure the whole candidate from clean extraction and report browser/listening/device evidence separately. Supply editable dense-pattern and pitch-comparison examples plus a short owner checklist. Correctness evidence does not complete the broader audio-workflow/RE milestone or promote this candidate.


## D053 — bounded Mobile Playback correction (October 5, 2026, America/Denver)

**Authority:** after submitting a mobile screen recording, identifying Cricket Dream 5G with Chrome, and receiving the scheduling/capture diagnosis, the owner said “Ok, address them.” Desktop playback was owner-reported satisfactory; the video does not display an exact application hash.

**Decision:** deliver 2.0.0-alpha.2 / mobile-playback-1, schema 12. Retain frame debt within bounded catch-up safeguards, reduce duplicate native capture allocations with exact-data parity, and add a throttled Play performance readout. Do not change CPU/APU/PPU semantics, audio queue depth, generated audio/gameplay code, capture timing, project format, input isolation, Save As, CHR or undo contracts.

**Evidence:** preserve the alpha.1 reference and all 921 existing checks; add independent timing, capture and diagnostic regressions; require clean-extraction gate and exact packaging. Synthetic clocks, Node profiling, recorder measurements, real browsers, listening and physical devices are separate evidence categories. Browser blockage and device testing remain explicit. No release promotion, source publication or later-feature authorization follows from this correction.


## D054 — bounded Mobile Audio Entry correction (October 6, 2026, America/Denver)

**Scope basis:** after delivery of alpha.2, the owner reported: “On mobile i can't input values for audio notes for the instruments.” Treat this as a defect follow-up within the active audio/reliability work.

**Finding:** tracker cells are drawn on a canvas; tapping selects a cell but insertion requires physical piano-key events. Instrument volume/arpeggio envelopes separately depend on mouse dragging. Native fields are needed for touch authoring.

**Decision:** deliver 2.0.0-alpha.3 / mobile-audio-entry-1, schema 12, with native row/order/channel and note/octave/instrument/volume controls plus existing envelope step/value editing. Use canonical records, validate before mutation and preserve undo/persistence, untouched effect data and desktop shortcuts. Prevent playback cursor movement or form focus from redirecting edits or triggering emulator/site commands. Keep compiler, audio engine, scheduling, capture and input services unchanged.

**Evidence:** retain exact alpha.2 source/reports and all 940 tests; add focused authoring regressions and run all 44 suites from one unchanged clean extraction. Keep browser/phone acceptance explicit and separate from VM tests. The existing mobile playback review and full audio workshop remain open. No promotion or later milestone follows automatically.

## D055 — direct Mobile Keyboard supersedes separate forms (October 6, 2026, America/Denver)

**Owner direction:** “eh. scratch those changes. I should be able to bring up the keyboard on mobile and enter the values like I do on PC”. The separate alpha.3 tracker and envelope forms are withdrawn. D054 remains an exact historical record, not the current interface contract.

**Decision:** deliver 2.0.0-alpha.4 / mobile-keyboard-1 from the alpha.2 playback reference. Tapping an ordinary tracker cell requests the phone's native keyboard; committed input uses the existing PC piano-key mapping and canonical note-entry/undo/persistence path. Preserve the original desktop workflow and envelope painting. Do not add an Apply step, note/octave dropdown editor, new envelope editor or alternative Audio model. Handle native text/composition events, safe cancellation and input isolation without changing the compiler, audio engine, emulator or project schema.

**Evidence:** preserve all 940 alpha.2 cases / 43 suites and add `mobile-keyboard200` for 44 required suites. The 18 alpha.3 form-specific tests are superseded by the owner's explicit rejection; retain their source branch, delivered artifact and original results. Verify full gate and exact packaging on a fresh unchanged extraction. Earlier intermediate results, including lost work, do not certify restored files. Native keyboard opening and phone layout require actual device review. Browser blocked launches, VM events and physical-device evidence remain separate.

The supported Audio workshop and native driver recovery retain their existing sequence. Discussion of a capability-adaptive interface is a recommendation for a bounded audit, not authorization to implement a cross-platform UI rewrite. No release promotion, public publication or later milestone follows from this correction.


## D057 — complete roadmap implementation authorization (October 7, 2026, America/Denver)

Owner: “Implement the roadmap completely”, then “just work through each item on the road map. One at a time”. Implementation is authorized across the recorded roadmap, with dependency order and preservation of existing behavior. Earlier bounded-candidate restrictions are historical and do not require renewed coding permission. Promotion, physical-device acceptance and public/real-money deployment require their actual distinct evidence and actions.

The first implementation checkpoint is alpha.6 / roadmap-1. It adds supported Audio interchange/workshop, generic physical CHR recovery and evidence registry, checkpoint/replay/RAM investigation, canonical gameplay graph and multi-file source workspace. A separate local hosted-item service draft is included for later review; it is not integrated into NES execution or described as a completed hosted milestone. Every changed protected file is enumerated in the exact source delta; baseline bytes and golden ROMs are not regenerated. All 990 inherited cases and new mandatory suites remain required.


## D058 — native Audio structural decoding and controlled native edits (October 8, 2026 UTC)

Under full roadmap authorization and the owner's one-item-at-a-time instruction, continue the next Audio dependency inside Forge. Preserve the alpha.6 checkpoint and introduce alpha.7 / native-audio-1, schema 12. The permitted independent HonkeyPong/FamiTone2 source input was reproduced with explicit host-converter compatibility changes; its upstream game, score and sound driver remain unchanged.

Recognize one declared relocatable linked instruction variant with validated reachable initialization arguments and native PRG pointers. Decode bounded native command/instrument/envelope/SFX evidence and allow only validated same-layout note/instrument edits on a copied ROM. Preserve original bytes, source identity, aliases and executable external driver. Give the native edit session isolated Undo/Redo and explicit ROM/evidence export. Do not mutate the active project/emulator or silently create canonical Audio patterns.

Faithful canonical conversion remains a separate A3 requirement because fixed-point timing, video-frame envelopes, native timer tables and SFX arbitration differ from Forge Audio. Unknown/ambiguous variants remain inspectable; static SFX references are a partial inventory. Keep all 1,126 alpha.6 cases and exact source history. New structural, malformed-input, UI and actual rebuilt-runtime evidence must run on the integrated standalone candidate. Physical listening, browser/mobile/controller acceptance and promotion remain separate.


## D059 — explicit native music transcription into canonical AUDIO (October 8, 2026 UTC)

**Authority:** the owner's complete-roadmap authorization and one-item-at-a-time direction continue; the owner subsequently said “Ok continue” after the alpha.7 completion boundary was clarified. Implement the next Audio dependency as alpha.8 / native-audio-import-1, schema 12, while retaining the preserved alpha.7 application and all 1,191 cases / 55 suites.

**Decision:** expose a previewed, explicitly confirmed finite NTSC music transcription for the supported structural FamiTone2 profile. Append canonical patterns/instruments, replace the music order and tempo/speed in one ordinary Undo action, preserve existing assets/SFX/runtime settings, and use current project save/reopen and Audio compiler paths. Preview and refusal/cancel paths do not mutate the project. Guard the active project, source/native-edit revision, subsong and options throughout asynchronous work and before commit. Original ROM bytes and emulator state stay independent.

**Fidelity boundary:** call the result an editable score transcription. The existing Forge runtime does not reproduce the external driver's tuning, pulse phase/retrigger or triangle controls exactly. Convert only declared supported score/envelope/timing behavior and display its differences; refuse unsupported native structures or capacity limits. Do not import native SFX, DPCM, gameplay triggers or original loop topology under a lossless claim. Preserve the original-engine ROM-copy editor as a separate workflow, with separate session history and exports.

**Evidence:** require fresh full clean-extraction tests, independent input and actual canonical save/reopen/edit/rebuilt-runtime proof, plus UI stale-source/cancel/Undo/isolation checks. New measured results belong to their current reports. Browser, audible/device/controller/hardware acceptance, full manual/PDF coverage and promotion remain separate. This advances Alpha A3 without declaring it or the complete roadmap finished; continue the remaining dependencies under the existing authorization.


## D060 — shared recovery-method discovery and dispatch (October 8, 2026 UTC)

**Authority:** the owner requested complete roadmap implementation one item at a time and then said “continue”. Continue the next A0 dependency as alpha.9 / recovery-methods-1, schema 12, preserving alpha.8 and every one of its 1,263 cases across 58 suites. This is implementation authority, not promotion or a substitute for missing device/deployment evidence.

**Decision:** extend the existing recovery-method contract without breaking physical CHR callers. Declare inspection/decoding, native encoding/patching and canonical conversion as separate capabilities. Connect the existing physical CHR and structural FamiTone2 implementations through shared discovery/dispatch; do not fork their decoders or require a false inverse for lossy transcription. Validate method/source identity, evidence ranges and operation-specific budgets. Keep unsupported, ambiguous and invalid outcomes explicit.

**Workflow:** General ROM Analysis gains Available recovery methods and Discover recovery methods, reporting source-specific applicability, operations and limits with routes to existing controls. Discovery and routing do not import assets, load/run/reset the emulator, change the project or replace a native editing session. Invalidate stale source/generation results and isolate input. A native driver match does not certify the selected score/excerpt; the existing Audio preview remains the conversion gate.

**Boundary and next work:** a shared registry supplies no unknown palettes, maps, collision or game rules. Existing physical CHR, original-driver ROM editing and finite canonical score transcription retain their separate evidence and limits. Continue cross-engine native graphics/maps/collision and the remaining Audio, source-migration/gameplay and runtime dependencies before later integrated Hosted work. General A0/A1/A2/A3 acceptance and the complete roadmap remain unfinished.

**Evidence:** require the fresh full clean-extraction gate, focused registry/profile/UI regressions and unchanged predecessor cases/source guards. Browser, listening, mobile performance, physical controllers, NES/deck hardware and full manual/PDF acceptance remain separate. Do not transfer alpha.8's measured pass or its blocked browser reports to new alpha.9 bytes.
