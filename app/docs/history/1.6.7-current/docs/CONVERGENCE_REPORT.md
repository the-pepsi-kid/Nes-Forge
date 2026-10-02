# 1.6.7 convergence report

## Result and evidence boundary

The required tranche now has explicit active ownership of project lifecycle/serialization, current build planning/dispatch, and release/documentation identity. The editor model, protected implementation blocks and existing runtime backends remain in place. This report describes the candidate's current routes; it does not claim that every historical wrapper or factory was removed.

Final candidate HTML SHA-256: `4fbe63a0676b903850e72004dba2ea66ae18df7f45bb366ca2688b63a8346b07`. The build checkpoint was `41babd1f2e317cf21c0777884175a31e175e78fd61c10621c4e9edbf7d09a6d5`; the final change removes three obsolete startup version toasts only.

The build checkpoint passed the full strict runner: **559/559 across 23 suites**, exit 0. The final candidate then passed **559/559 across 23 suites from a clean package extraction**, with zero failures/skips and exit 0. `../CURRENT_BASELINE.md` owns the final evidence status; `../test-results/candidate/Summary.json` is the final required-runner report. Do not sum separate checkpoint totals into one claimed release result.

## Active runtime ownership

| Operation | Active owner and routing | Retained boundary/limitation |
| --- | --- | --- |
| Project snapshots/serialization | `ProjectStore.capture` / `serialize`; `projectData` and `db_serializeState` resolve those methods at call time | Explicit preparation commits active edits and existing model defaults before copying; capture is not presented as a pure model read |
| Project decode/commit | `ProjectStore.prepareLoad`, `commit`, `load`; `db_deserializeState` delegates directly without invoking the historical loader chain | Existing scene/model normalizers and render refresh remain; ordinary full-project load clears history |
| Browser saves/opens and recovery | ProjectStore owns captured identity/generation/snapshot guards, asynchronous reads/writes, checking/offered recovery phases and Restore/Dismiss | Existing storage provider remains; portable Save As transport is protected, with current-project completion acknowledgment guarded separately |
| New Project / Open Forge ROM | Existing `src/legacy/26-project166.js` factory/reconstruction/replacement functions call the authoritative serialization/load entrypoints | The blank single-room factory and tagged undoable replacement boundary remain here; they have not all moved into ProjectStore. Ordinary undo/redo engine remains unchanged |
| Cold startup | Composition calls `ProjectStore.initializeBlank` and recovery checking | Startup does not invoke the user-facing New Project action or its undo boundary; cold mode remains blank viewer |
| Build plan and preflight | `BuildGraph.plan` / `preflight`; active global and Forge15/Forge16 compatibility aliases use that owner | Plans copy selected scene/atlas data; retained codecs still read current `S` synchronously. No cache or incremental graph is introduced |
| Build/compile result | `RuntimeCompiler.compile`, `commit`, `build`; `buildNesRom` points to this dispatch and the legacy gameplay entry delegates to the same owner | Existing codecs, assembler, viewer and single-room engine are used. Assembler retains derived diagnostics/global writes; this is not a pure, offline or asynchronous compiler |
| Current identity and Tech Docs | `ReleaseInfo` and `Documentation.render`; `renderDocs` is the current renderer | Protected historical strings/wrappers may remain in source but are not invoked as the current docs chain |
| Asset lookups | `AssetRegistry` builds fresh lookup tables and unresolved/duplicate diagnostics | No mutation, cached competing model, new persistent runtime IDs or allocation |
| Emulator boundary | `EmulatorBridge` delegates to verified existing load/play/input/capture APIs | Existing Build & Run/Run Original APIs retain their behavior; façade presence is not a rewritten emulator pipeline |
| LiveLink | Inactive capability report and explicit unsupported apply operation | No timers, listeners, transport, editor/emulator/ROM/RAM writes or hot reload |

Tests inspect actual entrypoint identity/delegation and count preparation, linking, compilation, commit and output effects. Textual definition counts are not the convergence metric. Retained source is either a directly used low-level/adapter implementation or displaced historical ownership; it is not justification to restore an active predecessor ladder.

## Deliberate behavior and compatibility changes

The production Scout literal and Scout creation branch are removed. The exact external fixture remains in `tests/fixtures/scout166.json`; editable examples remain under `examples/`. New Project's existing blank factory remains available. Cold startup no longer seeds the old image and uses blank viewer data while recovery is checked.

Project schema **9** was chosen before implementation because schema 8 would be unsafe under the actual frozen 1.6.6 loader: it accepts a saved unresolved world cell then silently replaces that reference with empty data. Schema 9 instead triggers that actual editor's newer-version rejection before state/history changes. Tests exercise the frozen HTML itself. Current loading preserves unresolved world values for repair; builds that require those references reject until resolved. Explicit downgrade to v8 is unsupported; changing `foundation` alone does not make a schema compatible.

The old recovery/autosave race and save-after-project-replacement race are corrected at the lifecycle boundary. Current guards also prevent stale opens and portable-save completion from acknowledging a changed workspace. Invalid or unsupported recovery is retained until an explicit permitted decision; it is not deleted merely because decoding failed.

Forge ROM layout v3, NFEX payload v1, MT16 v1, WR16 v3, MS16 v2 and GP16 v1 are unchanged. Checked recognized-format rejection happens before state replacement. JSON/ZIP remain authoring backups. Clean Forge-ROM reconstruction remains bounded by existing packed formats; append import remains separate and is not generalized reverse engineering.

## Build order and golden bytes

The active phase sequence is explicit: prepare snapshot; select/remap; construct atlas; encode metatile metadata; encode world metadata; link/encode composed assets; discover code occupancy; allocate; pack scene/metadata; serialize CHR; optionally compile the existing single-room runtime; emit the artifact.

This preserves the important dependencies: MS16 v2 owns its nested v1 asset linking; final CHR follows linking; metadata allocation follows actual code/vector occupancy; and the single-room compiler consumes the already linked ROM. A plan is single-use. Compilation does not publish/download an intermediate viewer ROM. One successful artifact is committed/output; failure clears stale result state. Current NROM capacities and reservations remain unchanged.

All five whole-ROM cases match the frozen reference without byte masks or revised expected output:

| Golden case | Existing backend/data coverage |
| --- | --- |
| packed-viewer | Generated viewer, scene metadata, art/palettes/OAM/collision |
| packed-custom-asm | Custom assembly with packed scenes and metadata relocation |
| unpacked-custom-asm | Custom assembly and direct CHR banks without scene packing |
| packed-world-assets-reordered | Reordered scenes/links, WR16 v3 destinations, MS16 v2 art/animation/contact/event records |
| single-room-poc | Existing 32 KB Player/Target proof of concept; no new gameplay |

Input, ROM and parsed-metadata hashes are pinned in `../tests/fixtures/golden167/manifest.json`.

## Protected and deliberately retained implementation

`tests/preserved-source.json` still guards the exact emulator core/renderer, provenance capture and Save As/scene-aware CHR sections. Golden-byte and runtime checks cover codec/emitter outputs; source/bundle checks verify the identity of supplied source inputs. Source-module boundaries may divide a historical guard; guard evaluation uses its original complete span in the assembled HTML.

Do not rewrite the emulator, runtime-capture pipeline, Save As, CHR rendering, undo engine, editor rendering architecture or append-ROM reconstruction to remove remaining source complexity. The existing editor still mutates `S`; services have not introduced an immutable UI rewrite. Existing whole-project linked-view BroadcastChannel behavior remains separate from inactive LiveLink.

These retained adapters and synchronous globals are documented limitations of this tranche. Future extraction requires authorization and the same parity discipline; they are not an invitation to expand this release.

## Staged verification

| Stage | Measured result |
| --- | --- |
| Extraction | Byte-exact 1.6.6 reassembly, 479/479 inherited checks and separate golden/downgrade 7/7; `../checkpoints/01-source-extraction/` |
| ProjectStore | HTML `e58566195ff5f997025f638e76af122987047b0e68622dc4d3046960bf574a46`; inherited 479/479, ProjectStore 21/21, lifecycle 26/26, golden/downgrade 7/7; `../checkpoints/02-project-store/` |
| Build convergence | HTML `41babd1f2e317cf21c0777884175a31e175e78fd61c10621c4e9edbf7d09a6d5`; full strict runner **559/559 across 23 suites**, exit 0; `../checkpoints/03-build-convergence/` |
| Final strict candidate/package | **559/559 across 23 suites**, final hash above; fresh input extraction, 279 input checksums, exact source/bundle reproduction, no preexisting candidate reports; `../checkpoints/04-clean-extraction/` and `../test-results/candidate/Summary.json` |

The full frozen 1.6.6 release ZIP under `baseline/` preserves original runnable tests, dependencies, source tools and separate RE branch. Selected changed-test comparison copies are in `tests/historical166/`. The current package uses authoritative `src/` plus `tools/` and one standalone HTML.

## Real-browser acceptance and stop condition

Cloud Browser URL security policy rejected approved standalone-file navigation and prohibited alternate surfaces/workarounds. No workaround was attempted. All eight requested acceptance items remain **unverified**: blank startup, recovery banner, Save, Save As, project opening, Build & Run, Run Original and runtime capture. `BROWSER_QA.md` lists the required observations. VM/controlled-storage/source/ROM/emulator results are separate evidence and do not prove native browser interaction.

No new gameplay, World Runtime, Audio Runtime, mapper target, RE functionality or Live Edit was added as part of this convergence. Deliver the tested/packageable 1.6.7 candidate and handoff, then stop. **Do not autonomously expand scope or begin 1.7.**
