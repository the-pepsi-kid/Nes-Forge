# NES Forge — second-engine audio recovery proof

A source-specific DABG investigation now produces an editable Forge Audio project and rebuilt ROM for the first 32 source rows of its Pulse 1 lead. All **214 compared frames** match the original driver’s volume, sounding duty and period; a deliberate note edit changes the generated pitch. Two independent reproductions are byte-identical, and six browser checks reopen and rebuild both delivered projects.

Open [the reproduction and usage notes](research/native-audio-dabg-1/README.txt). This is a partial research recovery: one lead passage, source-oracle addresses, no production engine recognition, and no whole-track or listening-equivalence claim. The existing application is unchanged. The complete documentation/tester-kit checkpoint follows below.

# NES Forge — current user guide and tester kit

Open `tester-kit/alpha11-review-1/START_HERE.html` after extracting the entire GitHub download. The folder includes the full verified **audio-tool-import-1** application.

The [current user guide](tester-kit/alpha11-review-1/Guide.md) explains projects/play, art/scenes, Gameplay/World, Audio, and RE/code, with control descriptions, tutorials, expected results and limits. The original nine-step game tutorial, design, extended manuals and historical references remain available. [Compose a sound project](tester-kit/alpha11-review-1/Guides/Audio.md) is the direct Audio starting point.

This documentation branch adds Alpha Test Kit RC3; it retains the application bytes from `ffb57ea` and does not publish a release. Application validation below belongs to that unchanged app; documentation verification is recorded separately in the kit source. See [kit build and verification instructions](tester-kit/alpha11-review-1/README.md).

## Preserved application implementation handoff

# NES Forge — Audio Tool Import candidate

**2.0.0-alpha.11 / audio-tool-import-1**, schema 12, on `implementation/audio-interchange-2026-10-18`. Open `app/mainline/NES_Forge_2.0.0-alpha.11.html`.

**AUDIO → Import FamiStudio…** imports a bounded FamiStudio 4.5 text-export subset into the existing editable tracker. Preview lists conversion limits before a guarded, one-Undo import. Save Project As preserves the converted score; a separate source-and-report receipt preserves the original export. See [the import guide](app/docs/AUDIO_TOOL_IMPORT.md).

The read-only [audio recognition benchmark](app/research/audio-recognition-1/README.md) compares source-backed 6502 driver routines and strict-decoder outcomes. Similarity does not enable recovery or import. The current corpus does not establish broad recognition accuracy.

Current validation and exact identity are in `CANDIDATE.json`. Prior candidate results below retain their original scope. This development branch does not change the existing tester kit or publish a release.

## Previous source-intake record

# NES Forge — Source Intake candidate

**2.0.0-alpha.11 / source-intake-1**, schema 12. Open `app/mainline/NES_Forge_2.0.0-alpha.11.html`.

Supplied-source intake now produces a bounded, read-only lexical report through the existing CODE source workspace. It inventories original/current bytes, records explicit dialect and engine declarations, observes literal dependencies and reports unresolved paths, cycles and unsupported constructs. Reports disclose incomplete inspection and unresolved macro expansion, conditionals, toolchain search paths and linker semantics. Inspection does not execute supplied scripts, assemble, translate or establish runtime compatibility.

`SourceWorkspace` remains the owner of source documents, byte-preserving edits, workspace v1 validation, archives and the existing assembler/NROM builder. `SourceIntake` adds diagnosis through `SourceWorkspace.analyze`; `SourceWorkspaceUI` guards asynchronous analysis, report export and declared-foreign Build Source attempts. Declarations remain session/report metadata and must be selected again after reopening a source workspace. No schema, runtime emitter, recipe algorithm, gameplay template, project mutation or integration hook changed. Native Audio, map/background and all five recovery methods retain their existing contracts.

Fresh clean-extraction gate: **1833/1833 cases across 93 suites**, retaining all **1,769 parent cases / 89 suites**. Every one of **6,873 staging payload hashes** was verified against the archive, clean extraction and unchanged working inputs. Across 6 retained example families, **14 generated ROMs, 1 original input ROM, 19 projects and 6 recipes remain byte-identical**; only 6 build-receipt HTML identity fields changed.

All 15 browser supplements are **blocked / not attempted for the corrected candidate: zero browser launches and 0 browser checks**. A filesystem-only observation confirms the required Chromium executable remains absent; no browser runner or installation was retried. All 15 previous launch-failure reports are retained byte-for-byte with their original HTML identity `38d2ed3731949252c0173bd4835188f1e53ad88f1fd1a23807e7ce9ac6a2d879`. They are historical evidence of the missing prerequisite, not execution results for this corrected HTML. VM cases and retained logical CPU/APU results do not establish real-browser rendering, file pickers, native download dialogs, listening, independent-emulator playback, device/controller or physical NES acceptance. The candidate is not promoted or published.

Read `app/docs/SOURCE_INTAKE.md`, its checklist and `app/examples/Source_Intake/`. Open `Forge_Multifile.nesforge-source.json` or `DABG_ca65.nesforge-source.json` through the saved source workspace flow; these are source workspaces, separate from authored game projects. Select Forge 6502 or ca65 as appropriate, then analyze. Paired reports and source ZIP archives reproduce after reopening with the same declarations. All 44 original DABG files (281,267 bytes) remain exact; this new example generator produces no ROM.

The DABG report's measured assessment is **incomplete**: it inventories **44 files**, scans **27 assembly files / 13,830 lines**, and records **27 literal dependency edges**. It contains **1024 diagnostics** against a **1024 diagnostic limit**; `truncated` is `true` and coverage `complete` is `false`. Complete file preservation does not mean complete diagnostic coverage or a validated dependency graph. Exact assessment and coverage are recorded per example in CANDIDATE.json.

The independently supplied ca65 DABG corpus retains source assets, build/linker inputs and upstream notices at commit `5ecc60b6af3f726851bfeb1c2555388c5953e0c0`. Its configured entry is `dabg.s`. Mixed upstream licenses, including GPL audio components, remain attached to the corpus; no original implementation is inserted into Forge. The application license remains UNDECIDED. The application parent is `9769a3b9e8f622da73f6ffa3904e6856b01fc7ab`; historical release evidence remains retained.

This completes the bounded source-intake implementation and automated gate, with owner/browser acceptance still open. Next: choose a source routine and define an independently tested integration hook covering inputs/results, registers and flags, RAM/zero-page ownership, code placement, hook timing and resource budgets. Remaining Audio formats/fidelity, runtime and comprehensive manual requirements precede integrated Hosted/network/wallet/deck work. The full roadmap is unfinished.

Run `python3 tools/verify_reference.py` for delivered-app verification, or `--full-gate` for disposable reproduction. `tools/package_source.py` packages clean committed source with portable Git history and retained refs. Exact identities and outcomes are in CANDIDATE.json and the clean-extraction proof.
