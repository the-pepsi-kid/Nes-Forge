# NES Forge — Recovery Methods

Open `mainline/NES_Forge_2.0.0-alpha.9.html`. This is **2.0.0-alpha.9 / recovery-methods-1**, schema 12, a review candidate under the authorized item-by-item roadmap implementation. The complete roadmap remains unfinished; this candidate is not promoted.

## Find the methods available for a ROM

In **RE / DISASM → General ROM Analysis**, choose a file and **Open for analysis**, then use **Available recovery methods → Discover recovery methods**. The result identifies the inspected source and describes the declared physical CHR and FamiTone2 methods, their status, supported operations, evidence and limits. Use a method's route to reach the existing graphics or native Audio tools. Discovery and routing do not import assets, start playback, load the emulator or change the active project.

The shared contract distinguishes inspection/decoding, native encoding or patching, and conversion to canonical content. A method advertises only operations it implements. An available native Audio profile does not promise that every subsong/excerpt can be transcribed; the existing **Preview import to AUDIO** still checks the selected source and options. Finite score transcription is not a reversible native-engine encoder. Unknown, unsupported, invalid and ambiguous inputs retain explicit outcomes rather than invented resources.

See `docs/RECOVERY_METHODS.md` and `docs/RECOVERY_METHODS_CHECKLIST.txt`. This A0 foundation connects existing bounded methods. It does not add scene/collision inference, recover arbitrary engines, or guarantee that the emulator can run an inspected ROM.

## Retained editing workflows

Physical CHR import retains its explicit preview and **Import as new tile sheet** action. It recovers physical tile pixels; source palettes, scene placement, bank use and collision are not inferred. Imported sheets remain excluded from builds by default.

The native Audio editor analyzes the supported structural FamiTone2 profile and changes validated commands on an isolated ROM copy using the original driver. Native Undo/Redo and ROM/evidence exports remain separate from the authored project. The canonical Audio importer previews a finite NTSC score, describes conversion differences, and requires confirmation before appending patterns/instruments and replacing the music order and tempo/speed in one project Undo action. Save Project As preserves the canonical transcription. See `docs/NATIVE_AUDIO_IMPORT.md` and its retained I1–I7 checklist.

Canonical transcription uses tempo 150 / speed 1; existing SFX definitions/bindings remain, but their playback timing can change. Tuning, pulse retrigger/phase, triangle controls, finite looping and SFX/DPCM exclusions remain declared limits. Native original-engine editing and canonical score conversion are different operations; a discovery result does not remove these limits.

MIDI/MusicXML interchange, Audio workshop examples, checkpoint/input/RAM investigation, canonical Behavior graph and the bounded multi-file Forge-6502 source workspace remain available. The `hosted/` ordinary-item server is a separate local draft without a cartridge bridge, wallet or public deployment. See `docs/ROADMAP_IMPLEMENTATION_STATUS.md` for every remaining area.

## Evidence and reproduction

`build-inputs.json`, `test-results/candidate/Summary.json` and `checkpoints/recovery-methods-1-clean-extraction/Reproduction.json` must identify the same frozen HTML. The complete gate retains all **1,263 alpha.8 cases across 58 suites**, plus the declared recovery-method suites. Read the current measured Summary for actual totals and outcomes; a planned gate or predecessor result is not a current pass.

Run `python3 tools/bundle.py --check` and `node tests/run_candidate.cjs` from a disposable extracted copy. Browser runners, audible comparison, phone performance, USB-C/Bluetooth controllers and hardware acceptance remain separate. A blocked browser launch means zero executed checks. Historical user feedback belongs to its original candidate. The complete manual/PDF has not been comprehensively updated for alpha.9; the new guide/checklist supplement it.

Preserve schema 12, five templates, actor/persistence budgets, Door Option B, protected emulator/capture/Save As/CHR behavior and legacy builds. Continue the cross-engine graphics/maps/collision dependency and remaining Audio/source-migration/gameplay work before later Hosted integration.
