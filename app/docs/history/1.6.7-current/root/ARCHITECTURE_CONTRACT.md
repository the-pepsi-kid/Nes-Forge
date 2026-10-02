# Architecture contract — 1.6.7

This document defines the accepted convergence tranche. `CURRENT_BASELINE.md` records measured completion; a contract alone is not proof that a route has converged.

## State and service ownership

Keep `S` as the existing editor model, including its active-scene mirrors. Do not introduce a competing state store or a stale persistent lookup cache. Services compose the existing implementation through one installation boundary; legacy public names may remain thin compatibility entrypoints.

| Boundary | Required active ownership | Limits |
| --- | --- | --- |
| ProjectStore | Blank construction, envelope/schema validation and migration, active-scene commit, detached serialization, load intents, recovery/save lifecycle and identity guards | No undo-engine or Save As rewrite; explicit preparation may mutate model defaults, copying must not pretend that preparation is pure |
| AssetRegistry | Fresh lookup and reference validation for scenes, worlds/rooms/markers, metasprites, animations and entities | Reads must not create IDs, repair authored references, allocate runtime addresses or create another asset database |
| BuildGraph | Current scene selection/remapping, ordered dependency/link plan and authoritative diagnostics | Existing NROM limits; no incremental compiler, mapper allocator or generalized world execution |
| RuntimeCompiler | One dispatch to existing packed viewer/custom, unpacked custom, and single-room backends; one final artifact | Existing emitter/codec behavior and exact reference ROM bytes; no Player/Target extension |
| ReleaseInfo | Current release identity, capability text, status and one current Tech Docs renderer | Historical inert strings may remain inside protected source; current docs must not invoke the historical renderer chain |
| EmulatorBridge | Thin delegation to existing load/run/pause/step/reset/input/capture APIs | No CPU/PPU/APU, frame scheduling, capture, or state-migration rewrite |
| LiveLink | Inactive capability contract; unsupported requests fail explicitly | No listeners, timers, transport, automatic reload, editor mutation or emulator/ROM/RAM writes |

After composition, the authoritative serializer, project-load coordinator, preflight, build dispatcher and docs renderer must be directly owned by their services. Installing another wrapper that invokes the entire predecessor chain does not meet this contract. Retained adapters must be named and their remaining global reads/side effects documented. Rendering and repeated service access must not reinstall listeners or compile a ROM.

## Project lifecycle and compatibility

Project schema **9** is deliberate: unresolved authored references now survive load/save for repair. Schema 8 would let the frozen 1.6.6 loader accept and silently erase those values. Schema 9 relies on the actual older editor's newer-schema rejection. Do not relabel schema 9 as v8, and do not add a lossy downgrade mode.

Decode and validate before pausing a runtime, changing state, adding history, or attaching a save identity. Preserve the distinct existing intents:

- Ordinary full-project load clears history and preserves authored assembly.
- New Project and clean Open Forge ROM are undoable replacements, pause stale runtime, and detach the browser save identity.
- History and existing linked-view synchronization retain their own policies; ordinary undo must not gain replacement side effects.
- Append-ROM reconstruction stays a named legacy adapter, separate from clean project replacement and protected runtime capture.

Snapshot preparation explicitly commits active edits. Asynchronous saves capture identity, name, generation and revision before awaiting storage; late completion must not rebind or mark a different/edited project clean. Recovery has an explicit checking state: autosave and unload writes remain blocked until the check/decision permits them. A late recovery result must not overwrite newer work. Reject invalid/future recovery without deleting it.

Cold startup is one empty viewer scene, blank graphics/maps/collision, empty authored assets/worlds/entities/assembly, no original ROM, no history, and no saved-project identity. Inert tracker defaults are permitted. The existing New Project action retains its explicit blank single-room factory and replacement boundary, delegating project loading to ProjectStore. Cold startup must not execute the user-facing New Project command.

ROM formats remain separate from project schema: Forge ROM layout/NFORGE15 marker v3; NFEX payload v1; MT16 v1; WR16 v3; MS16 v2; GP16 v1. Recognized unsupported formats reject before state changes. Project JSON/ZIP are authoring backups; ROM reopening remains bounded by the existing format's representable data.

## Build order and output

The current dependency order is contractual:

1. Commit active edits and prepare the snapshot.
2. Validate references; select and remap scenes in the existing order.
3. Derive metatile/world dependencies and construct the atlas.
4. Link metasprites/animation assets into that atlas; encode existing metadata.
5. Assemble custom ASM or select the unchanged built-in engine so occupied writes/vectors and PRG base are known.
6. Allocate metadata against those writes and the existing NROM reservations.
7. Pack scenes, metadata and headers; serialize final CHR after asset linking.
8. When selected, compile the existing single-room runtime from the linked ROM.
9. Emit one successful artifact; only then hand it to download or Build & Run.

The v2 MS16 codec retains its nested v1 payload. Metadata allocation follows code/vector occupancy discovery. The single-room path suppresses the intermediate viewer download and resets build/run mode after success or failure. A failed build must not run stale output. Public preflight aliases share one diagnostic owner and must not independently relink assets or mutate project/history.

Keep current mapper-0 output, 16/32 KB PRG and 8 KB CHR constraints, seven packed viewer scenes, `$D000` scene base/`$0600` stride, current atlas/OAM limits, metadata/vector reservations and single-room `$B800` GP16 reservation. World-used metatiles still require the existing source-scene linkage.

## Protected boundaries

Keep exact source guards from `tests/preserved-source.json`: emulator core/renderer, provenance capture, and Save As/scene-aware CHR. Preserve the existing single-room emitter and wire codec behavior with additional source/byte evidence. Do not change a guard to excuse an unapproved rewrite.

Do not rewrite the undo engine, editor rendering architecture, CHR rendering, append-ROM reconstruction, emulator, capture pipeline, or Save As for aesthetic convergence. Hash-protected historical docs/wrappers may remain inert; active current routing must bypass their obsolete ownership. Existing whole-project BroadcastChannel linked views are preserved and are not LiveLink.

## Change control

The staged gates in `TEST_POLICY.md` are mandatory. Fix parity failures at their stage before adding further changes. Any proposed World, Audio, mapper, RE, gameplay or Live Edit work remains deferred. **No autonomous scope expansion or milestone advancement is allowed.**
