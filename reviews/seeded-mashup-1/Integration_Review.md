# Seeded Mashup — independent integration review

This review owns the new end-to-end suite and reproducible workshop inputs, separately from the model, UI, gameplay-variation and release-infrastructure implementations.

## Reviewed contracts

- Sources are canonical schema-12 editable Forge projects. The source pool is detached and content-identified. Donor code is not executed. Raw ROM recovery is not implicit.
- The active project is the UI base. Whole graphics banks keep tile indices; maps, collision meaning, room links and original gameplay identities stay with that base. Music is appended with reference rebasing, while existing SFX definitions and source patterns remain.
- World planning and compilation accept detached project input. Inspection of `WorldCompiler`, `AudioCompiler`, `GameplayCompiler`, `WorldEngine` and the package path found no live-project swap needed. The live `BuildGraph.plan()` captures `S`, so it is deliberately not used for detached non-World preflight. Those backends still require an ordinary build to establish final allocation.
- The UI applies the bounded changed fields after replay and project/source guards. It does not replace the project through a broad loader. The emulator and native ROM investigation remain separate sessions.
- Random choices and gameplay decisions can be replayed from exact canonical source identities. Locked domains preserve their prior choices. This is a finite source pool; a new seed can choose the same item.

## Integration evidence

`app/tests/mashup-integration200.cjs` exercises the actual bundled model and UI, not a replacement mashup implementation. Twelve cases cover independent compilation of all three source inputs, two-donor art/music composition, exact seed replay and donor-order independence, variation and locks, read-only preview, one Undo/Redo, actual Save Project As with a mocked OS writable handle, exact generated-ROM rebuilding after reopen, real World and single-room CPU execution, changed framebuffer pixels and APU registers, ordinary editable CHR/tracker data, workshop checksum binding and saved-recipe import through the UI.

Focused result: **12/12 passed, zero failures** on standalone HTML SHA-256 `58e53633207e9d5c259b4cea52f1da09f113877d34a3078c5f7c3c624f98e375` (1,584,566 bytes). The source and workshop fixtures are ready for the separate complete clean-extraction release gate.

The CPU/PPU/APU observations come from the candidate's existing emulator executing emitted 6502 code. They are not browser layout, speaker/listening, mobile latency, gamepad or physical NES acceptance. The fixture actors occupy deliberately collision-clear test slots; the tests do not claim level solvability or polished gameplay.

`app/tools/build_mashup_examples.cjs` creates three explicitly Scout-derived inputs. Copper Orchard and Moonlit Circuit contain distinct indexed graphics, palettes and music. They are test donors, not unrelated recovered engines. The generator drives the same capture → donor load → saved-recipe preview → Apply → canonical capture → RuntimeCompiler path used by an owner, then writes editable projects, recipes and real ROMs. `Manifest.json` binds every input and output file to its checksum and the exact bundled HTML.

## Findings resolved during review

1. **Canonical audio ordering after Save As / Undo / Redo.** Initial integration checks reproduced identical semantic data but different serialized field ordering for instrument records and tracker cells. A reopen normalized that order, changing the embedded World source record and ROM hash. The model now uses the existing `ProjectStore.prepareLoad` audio representations before result identity and preflight. The strict tests retain exact serialized and ROM-byte equality after reopen.
2. **Example generation must use the actual commit route.** A whole-project load of the model's sorted snapshot preserved values but reordered unrelated base records compared with the UI's partial commit. The generator now uses the actual UI workflow. The shipped-recipe test compares the UI-replayed ROM with the shipped ROM byte for byte.

The initial failing report is retained as review history; current completion evidence is `Integration_Focused.json` and the later complete clean-extraction gate. No baseline production file was edited by this reviewer.

## Remaining acceptance

Use the owner checklist for visual readability, sprite appearance, music/SFX listening, mobile input, native download behavior and playability. Those checks remain separate from automated compilation and emulation. Universal source-engine semantics, automatic room stitching, arbitrary code mashups and universal ROM extraction are outside this checkpoint.
