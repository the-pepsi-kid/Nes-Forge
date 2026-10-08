# NES Forge — Native Audio Score Import

Open `mainline/NES_Forge_2.0.0-alpha.8.html`. This is **2.0.0-alpha.8 / native-audio-import-1**, schema 12, a review candidate under the authorized item-by-item roadmap implementation. The complete roadmap remains unfinished; this candidate is not promoted.

## Native music into editable AUDIO

In **RE / DISASM → General ROM Analysis**, open the included `examples/RE_Native_Audio/HonkeyPong-reproduced.nes`, then choose **Analyze current ROM** in the native Audio panel. Choose a **Native subsong** and use **Preview import to AUDIO** to inspect a finite NTSC music excerpt and its conversion differences. **Transcribe music into AUDIO** asks before replacing the current music order. It appends editable patterns/instruments, preserves existing patterns/instruments/SFX and runtime settings, and uses the ordinary project Undo/Redo. Save Project As preserves the converted score. See `docs/NATIVE_AUDIO_IMPORT.md` and `docs/NATIVE_AUDIO_IMPORT_CHECKLIST.txt`.

This is an **editable score transcription**, not lossless recovery of the native sound engine. The preview describes tuning, envelope, channel-control, retrigger and timing differences or refuses an unsupported excerpt. Native SFX, gameplay triggers and the original song loop are not imported. Analysis and preview leave the project unchanged; confirmation changes only the supported canonical music records. The original ROM and emulator remain unchanged. Compile Audio Runtime remains an explicit author choice when building a Forge ROM.

The retained alpha.7 native note/instrument editor still changes an isolated ROM copy using the original sound driver. Its native Undo/Redo and ROM/evidence exports are distinct from this new canonical project import. Unknown or ambiguous engines still open for ordinary binary inspection. Neither workflow implies universal engine recovery.

## Earlier workflows

MIDI/MusicXML score interchange and Audio workshop examples; generic physical CHR recovery; machine checkpoints/input replay/reversible RAM; the existing Gameplay Core graph; and the separate multi-file Forge-6502 source workspace remain available. See `docs/ROADMAP_REVIEW_GUIDE.md` and `docs/ROADMAP_IMPLEMENTATION_STATUS.md`. The `hosted/` ordinary-item server remains a separate local reference draft without a cartridge bridge, wallet or public deployment.

## Evidence and reproduction

`build-inputs.json`, `test-results/candidate/Summary.json` and `checkpoints/native-audio-import-1-clean-extraction/Reproduction.json` must identify the same frozen HTML. The complete gate retains every alpha.7 case: **1,191 across 55 suites**, plus the current declared import suites. Read the measured Summary for actual new totals and outcomes; the planned gate is not a pass.

Run `python3 tools/bundle.py --check` and `node tests/run_candidate.cjs` from a disposable extracted copy. Browser runners, audible comparison, phone performance, controllers and hardware acceptance remain separate. A blocked browser launch means zero checks. Earlier user feedback belongs to its original candidate. The full manual/PDF editions have not been comprehensively updated for alpha.8; the new guide/checklist are supplements.

Schema 12, five templates, actor/persistence budgets, Door Option B, protected emulator/capture/Save As/CHR behavior and legacy builds remain preserved requirements. Continue the remaining roadmap in dependency order without treating this bounded Audio result as complete A3 acceptance or whole-roadmap completion.

The transcription uses global tempo 150 and speed 1. Existing SFX definitions and bindings are preserved, but their playback timing can change with those global settings. Review existing SFX after import; Undo restores the previous music settings.

**Download transcription evidence** saves the last successful preview/import report, including source identities, options and conversion evidence. It is a historical snapshot, not an importable project, native edit session or proof that the current workspace still matches it. Save Project As is the editable-score backup; the evidence report does not embed the full ROM or project. A new preview clears/replaces the previous report.
