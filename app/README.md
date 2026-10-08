# NES Forge — Native Audio Investigation

Open `mainline/NES_Forge_2.0.0-alpha.7.html`. This is **2.0.0-alpha.7 / native-audio-1**, schema 12, a review candidate under the authorized item-by-item roadmap implementation. The complete roadmap is not done and this candidate is not promoted.

## Native Audio workflow

In **RE / DISASM → General ROM Analysis**, open a ROM and use the native Audio panel to analyze it explicitly. For the declared FamiTone2 instruction profile, Forge decodes source-backed music commands, instruments/envelopes and statically identified SFX streams. Native note/instrument edits produce a copied ROM with its original external sound driver intact. The panel has its own undo history and exports native ROM/evidence; it does not import a song into the canonical AUDIO tracker or change the active project/emulator. Follow `docs/NATIVE_AUDIO_INVESTIGATION.md`.

The first supported profile is one linked FamiTone2 variant in an iNES NROM image. Recognition validates relocatable instruction/data structure and reachable initialization evidence, not a game filename or whole-ROM allowlist. Unsupported or ambiguous engines remain available in ordinary binary analysis. SFX inventory is explicitly incomplete when only static calls are known. Native timing, envelope clocks, tuning and channel arbitration differ from Forge Audio; faithful canonical conversion remains work to do. Physical listening is separate from logical register evidence.

## Preserved alpha.6 workflows

MIDI/MusicXML score export/reimport and built-in Audio workshop examples; generic physical CHR ROM import/edit/export; named machine checkpoints, input replay and reversible RAM; the canonical Gameplay Core graph; and a separate multi-file Forge-6502/NROM source workspace remain available. See `docs/ROADMAP_REVIEW_GUIDE.md` and `docs/ROADMAP_IMPLEMENTATION_STATUS.md`. The `hosted/` ordinary-item server remains a separate local reference draft, without a cartridge bridge, wallet or public deployment.

## Evidence and reproduction

`build-inputs.json` identifies the exact bundled HTML. `test-results/candidate/Summary.json` and `checkpoints/native-audio-1-clean-extraction/Reproduction.json` must match that hash. The complete gate retains all 1,126 alpha.6 cases across 53 suites and adds the declared native Audio suites. Only actual fresh reports establish outcomes. Browser runners, phone audio/performance, controllers and hardware results remain separate; blocked runners mean zero checks.

Run `python3 tools/bundle.py --check` and `node tests/run_candidate.cjs` from an extracted disposable copy. The source manifest preserves module order. Previous applications, reports, source deltas and golden oracles remain historical references. Project schema 12, five templates, actor/persistence budgets, Door Option B, emulator/capture/Save As/CHR behavior and legacy builds remain protected.
