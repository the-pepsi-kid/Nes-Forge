# NES Forge 1.9.0 Alpha — re-runtime-1 handoff

## Current scope

The owner approved continuing the ROM investigation inside Forge after supplying Pepsi and reporting the previous six manual tests successful. Candidate **re-runtime-1**, **1.9.0 Alpha / schema 12**, implements D051: loaded-ROM adoption, opt-in runtime coverage and PPU/APU events, RAM snapshot comparisons, named RAM-write watches and source references where mapping is known. Static analysis and runtime observation share a checked ROM identity. This is engine-independent tooling, not a Pepsi allowlist.

Read `docs/RE_RUNTIME.md` and perform `docs/RE_RUNTIME_CHECKLIST.txt`. New services are `src/re/re-runtime.js` and `src/re/re-runtime-ui.js`; the source manifest remains authoritative. Current exact bytes are in `build-inputs.json`, automated results in `test-results/candidate/Summary.json`, and reproduction in `checkpoints/re-runtime-1-clean-extraction/Reproduction.json`.

Trace observation is off by default and read-only. The explicit **Trace from reset (resets game)** action restarts the loaded game. ROM replacement, reset and timeline discontinuities clear incompatible observations. Bounds are 8,192 events, 4,096 executed-PC records and 2,000,000 instructions; at most eight named RAM-write watches. No input replay, breakpoints, ROM/RAM patching, stage/health/enemy command, generic collision recovery or automatic audio/scene reconstruction is included. PPU-resource exports identify observed bytes and unobserved positions; sound-register writes do not prove a song was recovered.

The previous hidden-picker defect is fixed in the retained re-analysis-1a source. Its 846/846 automated checks and owner-reported T1–T6 results belong to that historical candidate. The original Bridge Room decoder still recovers only its declared profile. General analysis remains usable for unknown engines and unsupported emulator mappers, while runtime observation requires working playback. Physical controllers, mobile lag, hardware and changed-candidate browser acceptance remain separate.

Preserve the existing mobile controls, history navigation, Bridge Room import, canonical authoring, schema 12, five templates, 12-actor executable plan, 64 persistent bytes and legacy ROM oracles. Do not promote, publish or start unrelated roadmap work.

## Implemented contract

Schema 12 owns `gameplayCore`. Supported older projects load with Gameplay Core disabled. The actual frozen 1.8 standalone rejects schema 12 atomically; downgrade export is unsupported.

The canonical identities are distinct:

- **Actor Definition:** reusable authored archetype with typed parameters/components and a behavior reference.
- **Actor Instance:** stable authored Scene/Room/World placement/reference with overrides and explicit persistence bindings.
- **Runtime Actor:** ephemeral execution slot with a generation value and transient state.
- **Persistent State Record:** one explicitly declared Room/World variable keyed by stable authored owner/variable identity; never a Runtime Actor snapshot.

The structured state table is authoritative. States and transitions use stable IDs and ordered typed operations. At most one transition commits per tick, chosen by priority then authored order. Templates are authoring recipes that create these records. Every condition/action has an explicit operand schema; invalid operands fail before code generation. Unknown operations survive authoring but reject executable builds. Each runtime profile enumerates its executable operations, and unsupported canonical operations fail before ROM emission rather than becoming no-ops.

The only templates are Sideview Player, Ground Patrol Enemy, Stationary Contact Hazard, Collectible Pickup and Switch + Door. The compatibility adapter leaves legacy Player/Target authoring intact. Its canonical Sideview Player binding explicitly delegates movement, collision and animation to the retained Player executor; 1.9.0 does not claim full generic-runtime Player unification. With Gameplay Core unused, the five pinned legacy ROMs remain byte-identical.

Generated single-room and World runtimes execute the bounded generic actor evaluator, in-session persistent variables, pickups, switches/doors, contact hazards and patrol movement. The mapper-0 profile permits 64 one-byte persistent values at `$0380`–`$03BF`; max+1 rejects before emission and cannot overlap actor health at `$03C0`. Reconstruction resets Runtime Actor working state and increments slot generations while preserving declared Room/World values. Reset/power-cycle returns persistence to authored defaults because no save backend exists.

The corrected executable path includes generic Actor Instances from every World reachable through authored links, not only the starting World. WorldCompiler owns that reachability set; GameplayCompiler retains unreachable records as authoring data with diagnostics. The 12 executable slots cover the whole plan, including the compatibility Player. Overflow rejects; actor streaming is not part of 1.9.0.

GameplayModel's component schema is consumed by GameplayUI and GameplayCompiler. Invalid known fields reject before emission, including after supported defaults/overrides. Behavior-action ContactDamage operands and Actor Instance persistence bindings are authoritative; component mirrors cannot silently compete. Disabled Behavior is fully inert at initialization, update and reconstruction while the Actor and supported rendering remain intact. Generated overlap uses unsigned axis distances, preserving strict threshold and World screen-isolation semantics.

Gameplay Core provides typed table controls to create, edit and remove Actor Definitions, Actor Instances, components, parameters, states, transitions, conditions/actions, Room/World variables and bindings. Instance placement exposes applicable Scene, World and Room owners. Raw JSON is not required for core authoring.

## Preserved architecture

1.8 Audio remains canonical and unchanged: tracker/instruments/SFX feed AudioCompiler and NES playback; MIDI and MusicXML are boundary formats into the same representation. 1.7 World traversal remains on mapper 0 with whole-screen transitions. ProjectStore, BuildGraph/RuntimeCompiler, emulator, Runtime Capture, Save As and CHR ownership remain protected.

Forward authoring and reverse engineering converge on canonical NES Forge representations. This bridge normalizes one supported static room and pulse driver into existing scene, collision and Audio records. It carries source hashes/byte spans in a separate report and makes project transfer explicit. General file analysis now supplies an independent static evidence surface. Future canonical Raster Events, runtime profiles, mapper/resource linking, Method Registry, broader tracing, breakpoints and live edits remain separately gated. Captured, Represented and Compilable are separate claims.

## Hard product boundary and future eras

NES Forge remains an **NES / 8-bit / 6502-class environment**. Its canonical client/game target is NES/Famicom-class CPU, PPU, APU, resources, input and mapper/runtime behavior. Modern infrastructure may surround that client for builds, RE, hosting, networking, persistence, matchmaking, collaboration and communication, but must not replace it with a modern native engine, 3D runtime, 16-bit target or cosmetic “NES-looking” client. A future SNES/65C816 environment would be a separate product.

The authoritative roadmap eras are:

- **1.x — Create:** stabilize 1.9.0, then separately authorize 1.9.1 gameplay, 1.9.2 behavior UX and 1.9.3 Audio completion. Preserve the delivered 1.8 Audio capabilities and prove the complete authoring/import-to-ROM-and-reopen workflow.
- **2.x — Understand & Manipulate:** mapper/resource linking, runtime profiles and Raster Events, then deliberate RE/evidence, Method Registry, integrated analysis and controlled live manipulation. A finite supported-example RE acceptance gate precedes hosted worlds/wallet integration; broader compatibility can continue later. D048 brings one supported native-ROM decode/import/edit/build example forward, D049 provides frame history, and D050 adds general static binary analysis and D051 adds read-only runtime investigation ahead of the larger 2.x implementation. Full engine coverage, runtime/linker foundations, Method Registry and live integration remain separately gated.
- **3.x — Connect:** authoritative hosted sessions/worlds and inventories, gameplay-earned items, then test-network minting, wallet ownership and explicitly consented loot-loss settlement, alongside separately scoped networking/social features. Audio/RE completion gates precede this era; no 3.x implementation is authorized.
- **4.x — Tech deck:** prove development/deployment, client and server roles on existing hardware, then a physical prototype using Wi-Fi/cellular with a separately constrained optional mesh mode. Hardware investigation may branch once hosted foundations work; no 4.x implementation is authorized.

A large Hosted World may retain state far beyond one NES instance, but each client receives only an interest/proximity-filtered NES-compatible local projection. The NES remains the game client. Networking transports typed domain events and does not own Gameplay, World, Inventory, Economy, Audio or Voice semantics. Future Session, Player, Hosted World and Account persistence scopes wait for 3.x and must not alter current Transient/Room/World semantics prematurely.

The five-template limit remains unchanged. Switch + Door is an alpha proof of identity, linked persistence, switch control, active/inactive behavior and visual state—not a finalized blocking/traversal contract. Configurable physical Door behavior remains candidate 1.9.1 scope and is not authorized.

## Explicitly outside this candidate

- 1.9.1: projectiles, moving platforms, in-session checkpoints, NPC/basic dialogue interaction, ladders, one-way platforms and richer combat/traversal/events;
- 1.9.2: visual state graph and expanded behavior/template UX;
- 1.9.3: Audio completion and end-to-end acceptance;
- Game/Global persistence, actor snapshots, SRAM/password/save slots or other save backends;
- mapper/runtime profiles, smooth scrolling, Raster Events, incremental compilation, LiveLink or hot reload;
- persistent/exported save states, 6502 instruction-level reverse execution, continuous accelerated playback, deterministic input replay or a general trace debugger;
- Audio expansion, editable recovery beyond the D048 native-room profile, Method Registry and later milestones;
- breakpoints, verified stage/health/enemy actions and automatic semantic classification of executed code/data;
- NESmaker/other ASM project migration, Lua script APIs or other language adapters;
- Hosted Worlds, networking/netplay, remote persistence, economy/crafting/construction, large matches, social/voice and collaborative creation;
- SNES/65C816, 16-bit, 3D or modern-engine game targets;
- wallet/minting/loot-loss services, physical tech-deck development or Meshtastic integration;
- protected-system rewrites.

The editable-recovery slice remains tied to its supported engine. General analysis must accept unknown engines without promising arbitrary editable game recovery. Static instruction decoding alone cannot establish that a byte span is executable code. The next numbered gameplay tranche awaiting authorization remains **1.9.1 — Gameplay Expansion**. Its first dialogue behavior remains minimal display/reference/acknowledgement with no branching language; checkpoints remain in-session; projectile ownership adds no faction/team/reputation system.

## Emulator history boundary

Timeline snapshots are transient emulator execution state, not Actor Instances, canonical persistent variables or an authoring-project history. Restoring a frame must restore the corresponding machine/APU/render/capture state without rewriting editor assets. Navigation holds audio output muted and releases live controls; stale speaker queues and held input cannot resume from the restored state. Capture and RE readouts must correspond to that state. Existing CPU/PPU/APU correctness and unsupported-mapper/timing limits are unchanged.

Retain protected source implementations and original hashes. Wrapper-aware preservation guards may recognize only the explicit current adapter shape; do not weaken them or replace historical hashes. The prior bridge gate's mobile-only source guard required an exact normalization adjustment, not a runtime/input behavior relaxation. Current evidence must include the full retained gate, including all three timeline suites, plus the new general-analysis suites.

## General analysis boundaries

General analysis has its own copied byte source and report identity; it must not call emulator load/run, import a project, create editor undo entries or mutate original ROM bytes. Every result identifies a physical file offset. CPU addresses require a stated static or user mapping, and overlapping bank mappings remain distinct. Uncertainty about a container, bank, code/data role or engine stays explicit.

The implemented instruction interpretations are official NMOS 6502 and NES 2A03 opcodes. Unsupported/unofficial opcodes and truncated instructions remain visible as `.byte`; they cannot reject the whole file or silently use a different CPU's opcode semantics. File/range/search/resource limits must be enforced at API and UI boundaries and stated in `docs/RE_ANALYSIS.md`. A large file may be refused with an actionable limit; that is not an engine-recognition restriction.

Notes and mappings are user evidence, not recovered source symbols. Exported `NESForgeREInspection` evidence remains distinct from the canonical schema-12 project. A hash associates it with the original file. This layer does not claim to discover health, stage or enemy semantics, run other hardware, infer runtime bank selection, or reconstruct arbitrary scenes/collision/audio.

## RE bridge boundaries

`Forge.services.REBridge.analyze(bytes, name)` copies ROM bytes before asynchronous hashing and returns frozen evidence plus a detached native-project export. It checks the iNES profile, engine fingerprint/vectors, decoded collision, palette normalization and supported pulse timers before exposing import. `Forge.services.REBridge.importProject(analysis)` revalidates and uses `Forge166.project.replaceProject` for the existing undoable replacement path. Scene/collision/Audio models and compilers stay authoritative; the bridge does not patch original machine code or introduce a parallel asset store.

ProjectStore's bounded change rejects known inspection-report formats with actionable guidance before checking project scenes. Invalid reports must leave project, history, identity and playback unchanged. The evidence report is not a Forge project. `Download Forge project JSON` is a real portable schema-12 authoring document.

The recovered collision representation uses native 0/1 cell data, not visual inference. The supplied 16-row Pulse 1 song has a constant-volume instrument and 12 frames per row. No original source, general sound driver, SFX or executable behavior model is reconstructed. Preserve the separate original ROM for direct comparison.

## Mobile follow-up boundaries

`docs/MOBILE_PLAY.md` documents the user-facing input and play-view contract. Additive adapters and explicit wrappers may read local input, release it on lifecycle events, pause safely, and change the surrounding presentation. Existing protected emulator/capture/Save As/CHR source remains intact; do not replace protection hashes to excuse source changes. The one-port adapter is not a generalized networking input or multi-player assignment system.

No gameplay schema, template, generated-ROM engine, CPU/PPU/APU algorithm, capture format, save transport, mapper, raster, LiveLink or hosted feature change is part of this analysis candidate. Preserve schema 12, the five-template limit, 12-actor plan and 64 persistent-byte profile.

## Evidence and next operator action

Read `docs/RE_RUNTIME.md` for runtime investigation, `docs/RE_ANALYSIS.md` for general binary analysis, `docs/EMULATOR_NAVIGATION.md` for loaded-ROM frame navigation, and `docs/RE_BRIDGE.md` for supported editable recovery. Start original playback separately with Load ROM followed by Run. General analysis must work with no emulator ROM loaded.

All 38 prior suites remain required, including `re-bridge-model`, `re-bridge-ui`, `re-bridge-runtime`, `re-report-import`, `emulator-timeline`, `emulator-timeline-ui` and `emulator-timeline-runtime`; the three runtime suites are additional, for 41 required suites. Use the current runner and matching `test-results/candidate/Summary.json` for the complete required suite list and actual measured outcomes. `build-inputs.json`, the candidate reports, `test-results/browser-mobile/Report.json` and `checkpoints/re-runtime-1-clean-extraction/Reproduction.json` must identify the delivered application. Missing/stale reports are not a pass. No current total is inferred from an earlier build.

The corrected input is retained at `baseline/NES_Forge_1.9.0_Corrected_Reference.html`. Its reference was SHA-256 `472c4eaa427c466e204a07f0c0c30d3ecfc24c318b5ee1566dddaa2bb4903e08` and measured 658/658 across 26 suites. That result, the D045 correction report, and `docs/history/1.9.0-corrected-reference/` remain historical reference evidence only.

Next: review the new reports and changes, perform `docs/RE_RUNTIME_CHECKLIST.txt` with the exact supplied inputs, retain the general analysis/navigation/supported-recovery checks, complete actual-device checks in `docs/BROWSER_QA.md`, record residual limitations, and request owner acceptance of this exact candidate. Automated browser/VM results do not establish physical iPhone/Android behavior, USB/Bluetooth interoperability, native file-picker behavior, audible speaker output or independent NES hardware timing. No physical-device pass is claimed. Browser walkthrough remains pending: the available Chromium executable is missing.

The workshop is still instructions performed in the existing environment. Expanded manual PDF editions and the revised Alpha Review Kit were completed September 30 as separate deliverables. The owner completed tutorial steps 1–9 with guidance and reports its ROM running in another emulator; those prior-build observations do not certify this candidate. Preserve clear accessible community workflows. Recommend a private GitHub repository after stabilization and before substantive RE development; these bounded RE/navigation slices need not wait, and no repository has been created or publication authorized.
