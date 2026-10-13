## October 12, 2026 — source intake diagnostics candidate

Current implementation: **2.0.0-alpha.11 / source-intake-1**, schema 12. Source Workspace now provides explicit, read-only intake reports for supplied assembly trees. Reports preserve declared dialect/engine/version separately from the workspace build profile, identify current and original bytes, list literal include/binary dependencies with file/line evidence, and expose unsupported or uncertain constructs. The complete pinned DABG ca65 input and existing Forge multi-file example provide independent foreign and supported controls.

`SourceWorkspace` remains the owner of file validation, paths, preserved originals, editing, preprocessing and builds. Its new analysis facade delegates bounded inspection to `SourceIntake`; the existing CODE panel owns declarations, explicit analysis, cancellation and report download. Workspace v1 and project schema 12 remain unchanged. Reports do not execute scripts, expand foreign macros, resolve linker allocation, translate source or insert gameplay hooks. Unsupported source declarations remain ineligible for the UI build action; new workspaces reset declarations, preserving the existing default build workflow.

Retain all **1,769 parent cases across 89 suites** and append four intake suites: **93 mandatory suites**, plus 15 declared browser supplements. Current measured outcomes require matching `test-results/candidate/Summary.json` and `checkpoints/source-intake-1-clean-extraction/Reproduction.json`. Before those records agree, verification is pending. Existing six example families must regenerate with identical projects, recipes and ROMs; HTML identity receipts are the only permitted changes. See `docs/SOURCE_INTAKE.md`, its checklist and `examples/Source_Intake/` within the application package.

Next coding dependency: select one bounded source routine and document its integration hook, ABI, registers/flags, RAM/zero-page ownership, placement and timing budget before implementation and independent runtime verification. This diagnostic slice does not establish executable foreign-engine migration. Representative NESmaker source plus engine/module version and dependencies are still needed for that specific claim. Retain remaining Audio fidelity/formats, browser/listening/device acceptance, linker/runtime/raster/LiveLink/debugging and comprehensive manual work before integrated Hosted/network/wallet/deck milestones. The full roadmap remains unfinished.

Earlier entries retain their historical scope.

---

## October 12, 2026 — native SFX recovery candidate

Current implementation: **2.0.0-alpha.11 / native-sfx-1**, schema 12. The existing structural FamiTone2 profile now offers explicit single-pulse SFX transcription as well as its retained music workflow. The independent HonkeyPong input provides two supported effects and a multichannel refusal case. Conversion follows native register data and preserves the final mixed frame; nearest-pitch, retrigger and mixing differences remain explicit.

Music and SFX imports now share `RENativeAudioImport`; `ProjectStore.applyAudioImport` owns their guarded Audio-only transaction and one Undo. SFX appends patterns, instruments and definitions while preserving existing music, tempo/speed, runtime settings and event bindings. It requires an already compatible 150/1 project. Standalone Scout examples choose that timing and add an authored attack binding separately. No schema, runtime emitter, recipe algorithm or template change is needed.

All **1,694 parent cases / 84 suites** remain mandatory. Five additional suites bring the required inventory to **89**, with 14 declared browser supplements. Actual outcomes belong to the matching current `app/test-results/candidate/Summary.json` and native-sfx-1 clean-extraction proof; application-local paths omit `app/`. Browser/owner/listening/device acceptance is separate. See `app/docs/NATIVE_SFX_IMPORT.md`, its checklist and `app/examples/RE_Native_SFX/`.

Next coding direction: strengthen supplied-source migration with explicit dialect/dependency diagnostics and then a documented, independently tested integration hook. Additional native Audio fidelity/formats remain separate bounded extensions; nonzero pitch envelopes, PAL, DPCM and multichannel SFX are not implied by this checkpoint. Retain linker/runtime/raster/LiveLink/debugging and comprehensive manual requirements before integrated Hosted/network/wallet/deck work. The complete roadmap remains unfinished.

Earlier dated entries below retain their historical scope.

---

## October 12, 2026 — native map/collision candidate

Current implementation: **2.0.0-alpha.11 / native-map-1**, schema 12. The independent DABG command representation now feeds the existing recovery registry, shared scene preview/import lifecycle and unchanged single-room compiler. Source-backed structural decoding finds 22 referenced native map resources; one fits the initial static Empty/Solid conversion subset. Refusal reasons preserve the distinction between full-solid geometry, one-way landing, interactions, scrolling and procedural maps.

The same native-scene lifecycle now serves A1 background and A2 map conversions. Existing background APIs/outputs, guarded scene transactions, runtime emitters, recipe compatibility and project schema are retained. Exact source reversal and the full retained 1,617-case/78-suite gate remain mandatory; six new suites bring the required inventory to 84. Current measured outcomes are recorded in `app/test-results/candidate/Summary.json` (or `test-results/candidate/Summary.json` inside the application package), with matching clean-extraction and browser reports. Browser/owner acceptance is separate.

Use `app/docs/NATIVE_MAP_RECOVERY.md` and its checklist; application-local paths omit `app/`. The included original input and canonical static-map/floor-edit examples preserve complete source/license provenance. Original NES2 frontend emulation is not enabled. The native raw map image and binary collision are recovered; Forge physics and the validation player are explicitly authored adaptations.

Next: review the finite A2 workflow, then continue remaining native formats/Audio fidelity, source migration/gameplay, linker/runtime/raster/LiveLink/debugging and comprehensive manual requirements before integrated Hosted/network/wallet/deck milestones. The full roadmap remains unfinished. Broad debugger work is not a newly introduced prerequisite.

Earlier dated entries below retain their historical scope.

---

# NES Forge — Native Background Recovery candidate

**2.0.0-alpha.11 / native-background-1**, schema 12. Open `mainline/NES_Forge_2.0.0-alpha.11.html`. This adds shared recovery of two declared native background constructions through General ROM Analysis, editable scene import and separate static viewer projects. It preserves the compatibility checkpoint and existing runtime behavior.

Start with `docs/NATIVE_BACKGROUND_RECOVERY.md`, its checklist and `examples/RE_Native_Background/`. Pepsi and source-backed HonkeyPong exercise different native representations through one workflow. Review the displayed adaptations: graphics recovery does not recreate sprites, collision or original game logic, and the pointer loader's final attribute remains explicitly unknown.

Current Summary, `build-inputs.json` and `checkpoints/native-background-1-clean-extraction/Reproduction.json` establish actual identity/results. The parent passed 1,541 cases across 72 suites; retain all. Browser/device and owner acceptance remain separate; the full roadmap and manual remain unfinished.

## Preserved previous README

---

# NES Forge — Compatibility Stabilization

Open `mainline/NES_Forge_2.0.0-alpha.11.html`. Current candidate: **2.0.0-alpha.11 / compatibility-stabilization-1**, schema 12. This checkpoint repairs compatibility and shared-service integration before further feature expansion. It is not a promoted release.

The movement presets and existing Seeded mashup workflow remain. Historical alpha.10 recipes receive explicit, exact-source-verified foundation migration in the current UI. Movement settings share the existing configuration limits/validators and apply through ProjectStore. Both generated World and single-room movement previews compile the full detached ROM, including capacity validation, before application.

See `docs/COMPATIBILITY_STABILIZATION.md` for the contract and review steps, and `ROADMAP.md` for the reordered milestone. Current evidence belongs to the fresh Summary and compatibility-stabilization clean-extraction proof. Browser/mobile/listening/controller/hardware acceptance remains separate; the full roadmap is unfinished.

## Preserved Movement Rules guide

The following original overview remains a description of the parent; current compatibility behavior and evidence above supersede its limitations.

---

# NES Forge — Movement Rules

Open `mainline/NES_Forge_2.0.0-alpha.11.html`. This is **2.0.0-alpha.11 / movement-rules-1**, schema 12, a review candidate under the owner's continuing implementation direction. The complete roadmap remains unfinished; this candidate is not promoted.

## Vary familiar movement

Open **SCENE → Movement rules** with an editable project already configured for generated World or generated single-room gameplay. Choose **Use current project**, select a preset and intensity, enter a seed, then preview. The result shows exact before/after values for movement speed, jump speed, gravity and maximum fall speed. Keep preserves the captured values; Sprint, High jump, Slow fall, Heavy fall and Seeded mix choose bounded values using the existing runtime. Four field locks retain choices through later previews. See `docs/MOVEMENT_RULES.md` and `docs/MOVEMENT_RULES_CHECKLIST.txt`.

Preview validates a detached candidate without changing the active project or emulator. Confirmed Apply records one ordinary project Undo action. Candidate-project and recipe downloads are explicit alternatives; reopening a recipe requires its exact unchanged source project. A recipe records choices and source identity but does not embed source assets. Save/reopen and the ordinary build controls remain the authoring and test path.

Only four existing physics fields of the active generated backend can change: movement speed **1–4**, jump speed **1–12**, gravity **1–3** and maximum fall speed **1–8**. Body size, spawn, art, layout, collision data, Audio, actors and inactive runtime configuration remain unchanged. The feature does not enable a runtime mode. Viewer-only and custom-ASM projects are refused. Altered movement can make an existing route easier, harder or impossible; build validity does not prove level solvability.

This checkpoint does not add friction, knockback, automatic death, timers or new actor templates. In particular, the existing player's health reaching zero is not a demonstrated one-hit-death rule. The exaggerated-mechanics discussion describes a broader possible direction; only the four declared movement settings are implemented here.

## Retained mashup and recovery workflows

**SCENE → Seeded mashup** remains the separate alpha.10 asset mixer with its existing version-1 recipe contract, donors, locks, compatible patrol/placement choices and limits. Apply a mashup first, then capture that resulting current project in Movement rules to vary movement. The two stages have separate recipes and Undo actions. Movement rules does not accept donor pools or rewrite a mashup recipe.

Existing General ROM Analysis, shared recovery discovery, physical CHR import, native ROM-copy Audio editing, finite canonical Audio transcription, MIDI/MusicXML interchange, source workspace and runtime investigation remain available. Their source identities, format limits and confirmations still apply. This authoring feature adds no raw-ROM semantic decoder. The separate `hosted/` draft remains unintegrated with NES execution and wallets.

## Evidence and reproduction

`build-inputs.json`, `test-results/candidate/Summary.json` and `checkpoints/movement-rules-1-clean-extraction/Reproduction.json` must identify the same frozen HTML. The full gate retains every **1,430 alpha.10 case across 65 suites**, plus the declared Movement Rules suites. Read the fresh Summary for actual totals and outcomes; predecessor results do not certify changed bytes.

Run `python3 tools/bundle.py --check` and `node tests/run_candidate.cjs` from a disposable extracted copy. Browser runners, native dialogs/layout, listening, phone performance, USB-C/Bluetooth controllers and physical devices remain separate evidence; a blocked browser launch means zero checks. Historical owner feedback keeps its original candidate scope. The full manual/PDF has not been comprehensively updated; the guide and checklist are supplements.

Preserve schema 12, five templates, actor/persistence budgets, Door Option B and protected emulator/capture/Save As/CHR behavior. Resume A1 shared native-background recovery and editable import on independent inputs, then A2 native map/collision work, with remaining Audio, migration/gameplay and runtime dependencies before integrated Hosted/networking/wallet/deck work.
