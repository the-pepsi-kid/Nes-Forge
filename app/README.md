# NES Forge — Seeded Mashup

Open `mainline/NES_Forge_2.0.0-alpha.10.html`. This is **2.0.0-alpha.10 / seeded-mashup-1**, schema 12, a review candidate under the owner's explicit mashup request and continuing roadmap authorization. The complete roadmap remains unfinished; this candidate is not promoted.

## Make a reproducible mashup

Open **SCENE → Seeded mashup**. Use the current project as a frozen base, optionally add donor **Forge project JSON** files, choose a target scene and enter a seed. Choose random eligible sources, named donor assets or Keep current for background tiles, sprite tiles, palettes and music. Lock choices you want to retain, then preview before applying. Gameplay variation is an explicit opt-in for the existing supported patrol/placement rules.

A preview produces a detached candidate and reports choices, compatibility findings and build validation. It does not change the active project or emulator. **Apply mashup** requires confirmation and records one project Undo action; ordinary editing, Save Project As and the existing build controls remain the next steps. Candidate-project and recipe downloads are explicit alternatives. A recipe identifies exact source hashes and choices; it does not embed donor projects or ROMs. Reproduction requires the same source pool and supported recipe version.

See `docs/SEEDED_MASHUP.md` and `docs/SEEDED_MASHUP_CHECKLIST.txt`. The seed is text up to 128 characters. The pool is bounded to nine sources including the current project, 8 MiB per source and 32 MiB in total. Changed current-project state invalidates the captured base; capture it again before making a new preview.

## Compatibility and limits

This checkpoint combines existing editable canonical assets. It keeps the target project's scene/World/collision structure and supported gameplay templates. It does not recover new scenes, palettes, collisions, music or game rules directly from arbitrary ROMs. Raw ROMs still use the separate General ROM Analysis and explicit supported recovery workflows before their editable content can become a donor project. Whole graphic banks retain the target scene's existing tile indices; a compatible bank can still look mismatched. Full-room assembly, new mechanics and foreign ASM/Lua translation remain later work.

Music selection appends and rebases compatible canonical patterns/instruments, preserves existing definitions and bindings, and replaces music order and global tempo/speed. Those global settings can change existing SFX timing; review the warning and listen after applying. Incompatible pattern lengths, unresolved references, unsupported capacity or custom assembly on the base are explicit refusals. Donor assembly is not executed. A valid generated ROM does not prove playability, visual coherence, musical fit or physical-device performance.

## Retained recovery and editing workflows

**RE / DISASM → General ROM Analysis → Available recovery methods → Discover recovery methods** still reports physical CHR and structural FamiTone2 applicability, operations, source evidence and limits, with routes to existing tools. Discovery does not import content or load/run the emulator. Driver recognition remains separate from readiness of a selected finite Audio transcription.

Physical CHR import, original-driver native ROM-copy editing and canonical Audio transcription retain their own previews, confirmations, Undo histories and declared limits. The native editor's isolated ROM session is not saved inside a Forge project. Finite transcription remains distinct from lossless native-engine conversion; tuning, phase/retrigger, triangle controls, looping and SFX/DPCM exclusions remain. MIDI/MusicXML interchange, Audio examples, checkpoint/input/RAM investigation, the canonical Behavior graph and bounded Forge-6502 source workspace remain available. The separate `hosted/` local draft has no cartridge bridge, wallet or public deployment.

## Evidence and reproduction

`build-inputs.json`, `test-results/candidate/Summary.json` and `checkpoints/seeded-mashup-1-clean-extraction/Reproduction.json` must identify the same frozen HTML. The complete gate retains all **1,330 alpha.9 cases across 61 suites**, plus the declared mashup suites. Read the measured Summary for actual totals and outcomes; planned or predecessor results do not certify changed bytes.

Run `python3 tools/bundle.py --check` and `node tests/run_candidate.cjs` from a disposable extracted copy. Browser runners, native dialogs, audible comparison, phone performance, USB-C/Bluetooth controllers and physical devices remain separate evidence. A blocked launch means zero browser checks. Historical owner feedback belongs to its original candidate. The complete manual/PDF has not been comprehensively updated; the new guide/checklist supplement it.

Preserve schema 12, five templates, actor/persistence budgets, Door Option B and protected emulator/capture/Save As/CHR behavior. Continue the cross-engine graphics/maps/collision dependency and remaining Audio/source-migration/gameplay work before later Hosted integration.
