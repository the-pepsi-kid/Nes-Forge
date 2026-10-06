# Architecture contract — 2.0 Alpha continuation and preserved boundaries


## D054 — Mobile Audio Entry boundary

The alpha.3 correction adds native tracker-cell and envelope controls through the existing Audio UI service. They edit the same `S.patterns` and `S.instruments` records, use established snapshot/notify ownership and preserve untouched effect fields. Validate complete edits before mutation; never redirect an unfinished draft to a different playback row. Preserve native text/select focus, desktop piano shortcuts and emulator input isolation. No second Audio model, runtime/compiler change, schema change or emulator rewrite is included. The D053 playback implementation is the preserved reference for this correction.

D053 changes host scheduling and capture implementation work, preserving the same CPU/APU/PPU behavior and exact completed-frame capture contract. A transient, per-trace CHR-ROM lookup stays outside serialized state and verifies source bytes/mapping. Play diagnostics observe existing counters; they do not start emulation or audio. Schema 12 and generated runtime/compiler contracts remain unchanged.

The audio-correction-1 continuation changes only AudioCompiler/AudioEngine runtime correctness and release metadata. The event-stream cursor retains existing zero-page allocation; pointer carry supports all accepted rows. Triangle has a dedicated timer table. Project/Audio schema and service ownership remain unchanged.

## Ownership

| Boundary | Active responsibility | Limit |
| --- | --- | --- |
| ProjectStore | Schema 12 capture, migration, validation/commit and lifecycle | Existing state `S`, undo and Save As transport remain |
| AudioConfig / AudioUI | Explicit saved runtime switches and pattern-backed SFX controls | No hidden enablement or second note model |
| AudioCompiler | Detached validation and linking of tracker orders, instruments, patterns, SFX and sound-event references | No mutation; no DPCM/effect interpretation |
| AudioEngine | Shared compact 6502/APU sequencer emitted into generated viewer, single-room and World paths | NROM only; one SFX at a time |
| AudioImport | MIDI and uncompressed score-partwise MusicXML adapters into existing tracker/instruments | Sixteenth-note quantization; one tempo; bounded NES polyphony |
| BuildGraph / RuntimeCompiler | Select backend, run `audio-link`, allocate and publish one artifact | Failed builds clear stale success; custom ASM stays authored |
| WorldCompiler / WorldEngine / WorldRom | Retained 1.7 traversal plus optional shared audio/gameplay and schema-10/11/12 WG17 source reopening | World geometry/camera limits unchanged |
| AssetRegistry | Existing authoring lookups/reference diagnostics | No persistent runtime addresses or competing store |
| REAnalysis / REAnalysisUI | Immutable binary identity, validated file ranges or raw fallback, explicit mappings, offline code candidates, searches and user notes | No emulator execution or project mutation; engine recognition is not an intake requirement |
| RERuntime / RERuntimeUI | Opt-in executed-code, PPU/APU and watched RAM writes; ROM identity, bounded snapshots/diffs, physical source references and evidence export | Read-only observation; no game-semantic labels without evidence, no automatic recovery or ROM/RAM patching |
| REBridge / RE UI | Copy and verify one supported native ROM; decode tables/CHR/audio; explicit export/import into existing project models | Native Room v1 only; evidence is separate; no source/engine reconstruction or general driver support |
| EmulatorBridge / LiveLink | Existing emulator facade / inactive capability contract | No hot reload or background synchronization |
| Emulator timeline / playback UI | Opt-in bounded machine-state history; frame/batch restore and forward stepping; lifecycle invalidation | Transient, active-ROM only; no reverse CPU instruction engine, project changes or stored save-state format |

## Authorized local mobile-play adapter

D046 established the additive local input and presentation boundary for `mobile-play-1`; D047 carries it forward into the bounded `mobile-play-2` stabilization candidate. Touch controls, the retained keyboard and one OS-recognized controller supply the existing NES controller-port state. Controller pairing belongs to the operating system. Button mapping and view preferences are browser-side behavior, not new authored project/ROM data.

Native fullscreen is progressive enhancement of an expanded player that includes canvas, controls and accessible pause/sound/exit. Entry/exit must not replace, reset, rebuild or capture the ROM. Existing CPU/PPU/APU and capture/Save As/CHR source remain intact. Explicit wrapper integration may coordinate input release, deliberate resume and neutral rearm across interruption/lifecycle events; preserve the original implementations and verify behavior.

This is one local controller port. Generalized InputSource/player assignment, exported resumable machine snapshots, deterministic input recording/replay, networking, new persistence scopes and LiveLink remain in their separately gated future work. D049 separately authorizes the transient emulator history described below. No schema, generated-ROM, actor, compiler, mapper or authored gameplay semantics change is introduced.

The D047 presentation wrapper may defer `updateEmuSidebar` while expanded Play obscures that sidebar, then invoke its original implementation once on exit if work is pending. The original `renderEmu` canvas upload and register display remain active. Canvas fitting uses resize events/ResizeObserver and caches unchanged CSS dimensions; periodic fitting remains available without ResizeObserver. The input safety scans, frame scheduler and CPU/PPU/APU implementation remain unchanged. Fewer DOM calls do not prove mobile A/V latency or throughput improvement.

## D049 bounded emulator navigation

The timeline is an isolated emulator-analysis service with additive playback controls. Recording is off by default. Stored snapshots include full resumable machine/APU state and the capture-trace/completed-frame data required to keep rendered output, registers and captures aligned. Snapshot data belongs to one active ROM session and does not serialize into projects or introduce Gameplay persistence scopes.

Back restores an earlier retained frame; Forward restores recorded future without CPU execution. At the newest state, Forward executes actual muted frames with neutral input, including when recording is off. Navigation leaves the emulator paused and input safely released. Batch −60/+60 work yields for cancellation. This is neither continuous 2× playback nor reverse execution of individual 6502 instructions.

Store at most 300 states and at most 32 MiB of serialized snapshot data, enforcing both limits by dropping older entries. This budget measures stored serialized data, not total browser heap. Report the actual retained oldest/newest frame range; state size can reduce history to a few seconds or less, so no fixed five-second promise is made. Turning recording off discards the buffer.

Normal Run or manual Frame execution after restoring the past discards the previous future and creates a new branch. ROM replacement, reset, CPU Trace and unload must invalidate/reseed timeline state so snapshots cannot cross identities or untracked CPU execution. Navigation cancellation must not leave hidden work or permit stale task completion after a lifecycle change. Snapshot/restore errors must remain explicit rather than partially restoring an untrusted state.

Restore emulator/APU state and corresponding capture/readout state together, suppressing stale queued speaker output. Existing CPU/PPU/APU algorithms, renderer and capture implementations remain authoritative. This feature does not improve underlying mapper, raster, DMC or timing accuracy. Preserve original implementation hashes and use exact wrapper-aware normalization in the preservation guard. Expanded Play/fullscreen must host the same navigation controls and retain safe focus/input behavior.

## D051 runtime observation boundary

Runtime investigation is a separate transient analysis service. The observation path is off by default, records only actual execution/writes and leaves CPU/PPU/APU algorithms authoritative. Immutable ROM identity connects the runtime report to static analysis; the UI must refuse a source-code jump when the inspected and loaded ROM hashes differ. A CPU address with an unknown mapper translation has no invented physical offset.

Capture up to 8,192 events, 4,096 unique executed-PC records and 2,000,000 observed instructions; show the reached limit and stop recording rather than silently replacing old evidence. Permit at most eight named RAM-write watches. Memory comparison copies internal/cartridge RAM backing arrays directly, never a side-effecting sweep over CPU I/O. Snapshot identity must prevent comparison across ROM loads, resets and history discontinuities. Loaded-ROM adoption copies bytes into general analysis and neither reloads playback nor replaces authoring data.

An explicit trace-from-reset action restarts the game and observes initialization. Ordinary load/reset/history discontinuities clear incompatible observations. Exported evidence includes source identity, mapping confidence, observed writes and bounds. Exported PPU resources include observation masks; unobserved bytes cannot be presented as original native tables. No automatic tracker reconstruction, collision discovery, stage selection or game-memory mutation is included. Keep original protected hashes and narrowly recognize the intended instrumentation in preservation checks.

## Project and authoring model

Top-level `audioRuntime` contains `enabled` and `musicEnabled`. Top-level `sfx` entries contain stable `id`, display `name`, channel 0–3, source pattern and inclusive start/end rows. Patterns retain five authored columns; only pulse 1, pulse 2, triangle and noise execute. Instruments retain volume, duty and arpeggio envelopes and loop points. `sound` animation events retain their existing event shape and resolve an SFX ID first, then an unambiguous name.

Schema 11 introduced Audio Runtime because schema 10 cannot preserve Audio Runtime enablement or stable SFX routing. Schema 12 is the current project schema and adds Gameplay Core without changing the canonical Audio representation. The actual frozen 1.7 editor must reject schema 11 before mutation, and the actual frozen 1.8 editor must reject schema 12 atomically. Supported older projects migrate with their newer subsystems disabled. Existing World and Audio settings remain preserved. Schema-11+ SFX IDs are nonempty and unique; unresolved sound references remain authoring data while disabled and fail when an executable audio build needs them.

## Runtime contract

Music follows the existing order list, global tempo, speed and row count. A compact per-channel event stream updates note, instrument and volume. The runtime applies pulse duty, volume/arpeggio envelopes, triangle pitch and noise period through NES APU registers. A nonlooping volume envelope becomes silent after its final step. Pattern rows and order rows loop.

One named SFX may play at a time. It temporarily preempts its selected music channel, advances with tracker speed, then restores the saved music note/instrument/envelope/volume state. A sound event fires only on animation-frame entry; held input or a held terminal frame cannot retrigger it. A new SFX request while one is active is ignored deterministically.

The generated scene viewer autoplays music but has no animation executor, so it does not originate sound events. Single-room player/target frames and World player frames execute linked sound events. Audio-disabled emission must use the exact retained code/data layouts and ROM bytes.

## Import contract

MIDI format 0/1 with pulses-per-quarter timing is accepted. Format 2 and SMPTE timing reject. MIDI pitch maps A4 (69) to tracker note 57; velocity becomes tracker volume; program/track sources become ordinary instruments. Channel 10 percussion targets noise. MusicXML accepts uncompressed `score-partwise` pitched notes, rests, chord timing, backup/forward timing, divisions and initial tempo. Compressed MXL is not accepted.

Imports append ordinary patterns/instruments, preserve existing SFX pattern indices, replace only the music order, and remain one undoable edit. Notes quantize to sixteenth-note rows. More than three simultaneous pitched voices or overlapping noise voices reject instead of being discarded. Tempo changes flatten to the initial tempo with an explicit warning because the current tracker has one song tempo.

NES Forge Audio is the canonical editable/runtime representation. MusicXML is the preferred notation-level interchange format, while MIDI remains a performance/event interchange format. Future tablature, optical recognition and RE audio decoders are adapters into MusicXML and/or canonical NES Forge Audio; they must not create independent runtime models. MusicXML/MIDI exports are projections only. Native Audio must retain NES-only driver commands, duty/envelope/Noise/DPCM behavior and timing information that cannot round-trip through notation formats.

## Forward-authoring / reverse-engineering convergence

Forward authoring and reverse engineering must target the same canonical NES Forge representations. Those representations must eventually cover both static assets and the time-dependent techniques used by NES hardware to render and execute them. RE-derived information carries an explicit evidence state and becomes ordinary editable project data only through an explicit conversion/transfer. The RE bridge must not silently make an observation or inference authoritative, and the separate RE branch must not be wholesale-merged.

The future Method Registry owns reusable technique signatures, decoders/encoders, mappings, validation, provenance and confidence—not third-party game assets. Where technically possible, validation follows decode → canonical NES Forge representation → encode → reproduce the original representation. Game-specific orchestration may compose registered methods, but must not become the only reusable decoding architecture.

## D048 integrated RE example

Candidate `re-bridge-1` adds `src/re/re-bridge.js` and `src/re/re-ui.js`. Analysis copies input before asynchronous SHA-256 work; header, engine fingerprint and vectors bound the decoder to Native Room v1. Native nametable/attributes, CHR, palettes, 960 collision cells, spawn and 16 Pulse 1 timer rows become ordinary scene/metatile/Audio records. A separate versioned `NESForgeRERecovery` report carries source identity, byte spans, recovered counts and explicit limitations. No Forge JSON is read from the input ROM.

Inspection never replaces the active project. `analyze` returns detached export data; explicit `importProject` validates again and delegates to the existing undoable `Forge166.project.replaceProject` path. Native JSON/ZIP serialization and build dispatch stay authoritative. Original bytes remain in the standard imported-ROM backup. Unknown engines and unsupported data fail before project mutation.

ProjectStore adds only a format-specific rejection for `NESForgeREInspection`, `NESForgeREPreviewEvidence` and `NESForgeRERecovery` mistakenly opened as projects. Its schema and normal validation/commit ownership remain unchanged. Report export and native Forge project export have distinct labels and formats.

Decoded collision must retain each native Empty/Solid cell even when one graphical tile has different collision at different placements. Use canonical raw tile properties when globally consistent, with linked metatile quadrant overrides where required. The display of a wall alone is never collision evidence. Supported pulse periods must map exactly and unambiguously into existing AudioCompiler notes; unsupported envelope/sweep/timer semantics reject rather than approximate.

The supplied source game moves left/right only. Forge rebuilds reuse its existing sideview player and add jump/attack animation states. This adaptation is disclosed, contains no damage hitboxes, and is not original behavior/source reconstruction. The fixture has no SFX. One known constant-volume Pulse 1 driver does not establish general audio-driver support. ASM/Lua migration, broader engine adapters, trace inference, Method Registry and live editing remain separate work.

## Time-dependent runtime behavior

NES Forge must model both static resources and time-dependent NES behavior. The 2.0 architecture therefore requires a canonical **Raster Schedule / Raster Event** representation for understood mid-frame PPU and mapper activity. The intended boundary is:

**runtime observation → canonical raster events → compatible runtime/compiler profile → ROM**

The exact schema, timing unit, instruction vocabulary and storage layout are intentionally undecided and are not authorized by this contract. Event coverage must eventually be capable of representing `$2005` scroll changes, `$2006` PPU-address changes, visible-frame palette updates, CHR bank switching, nametable/mirroring changes, PPU mask changes, mapper register writes, sprite-0 splits, timed-loop splits, mapper IRQ/MMC3 scanline IRQ effects, HUD/playfield separation and other scanline- or frame-dependent behavior.

Runtime Capture may losslessly preserve observed raster-dependent scenes while correctly refusing to rebuild them through the current static NROM backend. Preserve that conservative behavior. Unsupported raster effects must not be flattened, approximated or advertised as rebuildable without an explicit approved conversion.

Keep these claims distinct:

1. **Captured:** original behavior was observed or preserved.
2. **Represented:** behavior was sufficiently understood and converted into canonical NES Forge raster/runtime events.
3. **Compilable:** the selected mapper/runtime profile can reproduce equivalent behavior.

No one state implies either later state. The future Runtime Profile contract must declare the rendering strategies and raster-event capabilities it can compile, including fixed-screen, screen-transition, horizontal, vertical and top-down scrolling, mixed room/scroll, sprite-0 split, timed raster split, mapper-IRQ/MMC3 raster, and supported mid-frame CHR/palette/scroll behavior.

The 2.1 evidence model must retain instruction, routine, scanline/frame, physical PRG bank, PPU register, mapper register, IRQ and visible-resource provenance needed to explain each raster observation. Conversion to canonical Raster Events is an explicit user-approved bridge operation. Raster Methods belong to the 2.2 Method Registry and may be validated with rendered-frame, PPU-write, mapper-write and timing/scanline comparisons. The 2.3 workspace owns raster timelines and trace correlation; controlled raster-schedule edits wait for 2.4 and the 2.0 identity/linker foundation.

## Canonical generalized gameplay boundary

ProjectStore and the compiler/runtime own stable actor definitions and instances, reusable typed components, explicit behavior/state-machine data and serialized Room/World gameplay state. Collision, combat, interaction, spawn/despawn and animation actions compose through that model. Do not expand `worldRuntime` with enumerated enemy/boss fields or treat the Player profile as the universal actor architecture. Preserve the 1.7 Player/Target workflow through a compatibility adapter first.

Identity boundaries are strict. Actor Definition is a reusable authored archetype. Actor Instance is a persistent authored placement/reference in a Scene/Room/World, not saved execution memory. Runtime Actor is an instantiated execution object with transient state and an ephemeral handle/slot; that handle cannot serve as a persistence key. Persistent State Record contains only explicitly declared Room/World variables keyed by stable authored scope/variable identity, with an instance binding only when explicitly authored; it never implicitly serializes Runtime Actor memory. Scene placement adds no Scene or Game/Global persistence scope. Gameplay runtime handles do not bring forward the 2.0 resource-linker identity foundation.

Preset templates are authoring recipes over one canonical structured state-table model. The canonical representation contains stable behavior/state/transition IDs, typed bounded parameters, one initial state, ordered entry/tick/exit actions and deterministic priority-then-authored-order transitions with typed conditions/actions. Templates instantiate normal canonical records. The compiler does not accept a second template model. A future visual graph may edit and display the same records but is deferred from the first tranche and cannot add graph-only runtime semantics.

Every canonical condition and action has an explicit operand schema. Required, malformed, out-of-range, unknown, invalid-reference and type-incompatible operands fail executable validation before code generation. Unknown operation records may be preserved for authoring, but cannot enter an executable build. Each generated-runtime profile declares the canonical operations it executes; an operation outside that profile fails before ROM emission and may never compile as a silent no-op. The 1.9.0 mapper-0 Gameplay Core profile executes `always`, `inputHeld`, `inputEdge`, `timerDone`, `overlapPlayer` and `persistentCompare` conditions, and `persistentSet`, `despawn`, `setTimer`, `moveWithinBounds`, `contactDamage` and `syncActiveFromPersistent` actions. Other canonical operations remain authorable for future profiles but are not advertised as executable by this profile.

Runtime working state is separate from persistent authored state. Transient/Actor-local values reset on reconstruction. Explicit Room variables preserve Room-local outcomes; explicit World variables share progression across Rooms in one World. Game/Global scope and automatic actor snapshots are absent from the first tranche. Conditions, actions and components reference stable typed variables by ID and scope. The persistence representation must remain deterministic, serializable, versionable, testable and independent of a future SRAM/password/save backend. The 1.9.0 mapper-0 profile has 64 one-byte persistent slots at `$0380` through `$03BF`; 65 declarations reject before code generation, so persistent storage cannot overlap Runtime Actor health at `$03C0`.

The existing Player/Target records remain readable and editable. In 1.9.0, the compatibility adapter emits an explicit canonical Sideview Player binding and stable compatibility metadata without mutating saved projects, while movement, collision and animation still execute in the retained Player runtime. It is therefore a compatibility boundary, not full Player execution by the generic evaluator. Generic Gameplay Core actors use the bounded generalized runtime. A later Player conversion/unification requires separate authorization and behavioral parity evidence. Generalized gameplay is opt-in, and its absence must retain legacy byte layouts and pinned ROM outputs. Schema 12 owns Gameplay Core and the actual frozen 1.8 application must reject it atomically.

Gameplay Core's table editor must be sufficient to create, edit and remove definitions, instances, components, parameters, states, transitions, conditions, actions, Room/World variables and bindings without external JSON editing. Instance placement exposes the applicable Scene, World and Room owners. Raw JSON remains an advanced interchange/debug representation, not the only authoring route.

The corrected 1.9.0 profile uses one canonical component-field schema in GameplayModel for UI controls and executable validation. Known malformed, missing-required, out-of-range, invalid-reference and type-incompatible component values reject before emission; they are not clamped, masked or byte-wrapped. Only enabled components form the executable capability set. In particular, a disabled Behavior component leaves the Actor Instance placed and renderable but performs no entry/tick/exit actions, transitions, behavior-timer work, persistent writes or behavior-driven damage during initialization, update or reconstruction.

WorldCompiler owns the reachable-World set and passes it as typed execution context to GameplayCompiler. All actors in reachable destination Worlds/Rooms are planned, linked, instantiated and evaluated in their correct screen context. Unreachable Actor Instances remain canonical authoring data and receive an explicit authoring-only diagnostic; they do not count toward the 12-actor executable plan limit. The retained Sideview Player compatibility binding does count toward that limit. Actor streaming is not part of this profile.

Behavior `contactDamage` action operands are the runtime authority. Legacy ContactDamage component values are preserved only as validated mirrors and may not conflict with the actions. Actor Instance persistence bindings are authoritative; a legacy PersistenceBinding component variable mirror must agree and cannot become a second runtime source.

Single-room layout-3/GP16 ROM opening is partial reconstruction: scenes, art, legacy bindings and retained gameplay configuration are recoverable, but schema-12 Gameplay Core source is not embedded and reopens disabled/empty. The original ROM bytes remain available to Run Original, and native JSON/ZIP remains the complete authoring backup. World layout-4/WG17 source reopening remains lossless for its checked embedded project. A full single-room source-bearing format requires a separate owner decision.

`syncActiveFromPersistent` remains a one-way alpha/profile operation. An active actor may deactivate itself from the scoped value; once inactive, its evaluator is skipped, so the reverse value takes effect only after Room/World reconstruction. This is distinct from physical Door blocking, traversal or a reversible gate system, all of which remain deferred.

1.9 is internally gated. **1.9.0 Gameplay Core** proves identities, components, structured behaviors, Room/World variables, legacy adaptation, table authoring and single-room/World integration with only Sideview Player, Ground Patrol Enemy, Stationary Contact Hazard, Collectible Pickup and Switch + Door templates. **1.9.1 Gameplay Expansion** later adds projectiles, moving platforms, in-session checkpoints, minimal dialogue/NPC interaction, ladders/one-way platforms and richer combat/traversal/events. **1.9.2 Behavior UX** later adds a graph and improved diagnostics over the same canonical records.

Dialogue begins only in 1.9.1 as minimal interaction/display/reference behavior with acknowledgement/completion, not a branching system or dialogue language. No dialogue implementation is in 1.9.0. Checkpoints hold an in-session authored respawn reference; declared Room/World values remain in the explicit scoped store, without implicit checkpoint snapshots or rollback. In-session death/respawn may use the checkpoint, but runtime reset or power-cycle clears session state and returns to authored project defaults until a future save backend is explicitly authorized. Projectile ownership/collision uses only minimum transient source and collision-group/mask semantics for damage filtering; no generalized faction/team/reputation system exists.

`docs/GAMEPLAY_SYSTEMS_1.9_PLAN.md` is the controlling contract. 1.9.0 is the current candidate. Later tranches remain separately gated.

## Preserved runtime and release boundaries

World movement, collision, screen/camera transitions, markers, source envelope and mapper-0 limits remain as documented in `docs/WORLD_RUNTIME.md`. Layout 4 / WG17 version 1 remains the World ROM envelope; its source-schema field accepts 10, 11 or 12 and the embedded JSON must match. Layout-3 legacy codecs remain unchanged. All five legacy whole-ROM goldens must stay byte-identical.

Retain recovery/save generation guards, active-scene preparation, Build & Run versus Run Original, protected emulator/capture/Save As/CHR spans, blank startup, explicit New Project, and inactive LiveLink. Mapper/runtime profiles, canonical Raster Events, streaming, incremental compilation and LiveLink wait for the ordered 2.0 foundation. The bounded D048 native-room bridge and D049 emulator-navigation slice are the current exceptions to the earlier RE-intake-only boundary; comprehensive RE architecture remains future work. 1.9.1 requires separate authorization.

The revised future sequence includes 1.9.3 Audio completion and finite supported RE acceptance before 3.x hosted/world/wallet services. The eventual 4.x tech deck surrounds the same NES target with development/deployment, client/server and separately evaluated Wi-Fi/cellular/mesh capabilities. Community accessibility and a recommended private GitHub review home support continuity; neither a repository nor a completed accessibility certification is supplied here.

## D050 independent analysis boundary

`REAnalysis` receives a copied byte sequence and creates an immutable report plus bounded readers/decoders. It must not call CPU reads, ROM load, project import, compiler or source-editor mutation to analyze bytes. Physical file offsets are primary; a CPU address exists only under a declared mapping. Distinct banks may overlap in CPU space without merging physical identities. Raw bytes remain inspectable when container validation or hardware interpretation is unavailable.

`REAnalysisUI` owns its file-selection epochs, viewed ranges, mapping labels, user notes and bounded search tasks. Async work may publish only to its current selected file. It uses the existing Save As transport for evidence export and keeps arbitrary text literal. General inspection, mapping, emulation and editable recovery have separate statuses. Failed or unavailable recovery never invalidates a general analysis. The existing REBridge retains its explicit validated undoable import boundary.

The existing project schema, source editor, emulator, history, input routing, capture, renderer and build models are unchanged. New source modules are appended at the declared composition boundary; only the release identity and exact recovery-button label change in preceding source. Tests compare against the complete re-navigation-1 build-input hashes in addition to retained original protection guards.
