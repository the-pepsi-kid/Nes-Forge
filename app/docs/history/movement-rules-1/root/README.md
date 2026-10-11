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
