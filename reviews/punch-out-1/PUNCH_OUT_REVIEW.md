# Punch-Out static backgrounds and Audio

This bounded checkpoint adds both supplied US PRG0 and PRG1 revisions. It does not recover a complete boxing game. The source files remain private and are never embedded in Forge.

## Scene

Five 256×240 static staging backgrounds use the original PPU command programs, background CHR and initial palette. The decoder interprets 84 available programs out of 95 table slots; the five views use only their declared staging combinations. These are source staging contexts, not five complete fights or a claim that all menus are recovered.

MMC2 switches background CHR during pattern reads. Each projected tile keeps its source bank per pixel row, including latch transitions. The fighter sprite bank is separate. A physical literal/repeat operand has one recipe owner, so shared occurrences update together. There are 711 writable bytes in 97 declared spans per revision. Generated/inherited cells, command/header/attribute aliases and latch-control tile IDs are read-only. Source CHR and palettes are preserved, not newly writable.

Scene supports source intake, all five views, native tile substitutions, Undo/Redo, save/reopen, exact unchanged native output and bounded derivative recognition/building. Fighter layers, sprites, dynamic UI, alternate runtime states, animation, collision and game logic remain unresolved.

## Audio

The original bank-8 driver is installed for both revisions: 83 bank-8 catalog entries comprise 23 sounding music requests, six empty slots, two stop controls, 45 procedural SQ1/SQ2 effects and seven DPCM requests. An additional Startup PCM + native bell entry runs the bank-6 one-shot routine continuously with instruction-clocked DAC writes. Each revision has 76 sounding selections in total. Request IDs are used without guessed song names. Structural music decoding retains section/header/token provenance; procedural effects retain native dispatch evidence rather than invented static scores.

The isolated machine maps selected 8 KiB bank 8 (or bank 6 for startup PCM) at $8000–$9FFF plus fixed banks 13–15 at $A000–$FFFF. Original code owns timing, envelopes, sweeps, noise, DPCM and channel arbitration. Both revisions share the bank-6 and bank-8 audio bytes. Sample descriptors/hashes are reported, while sample payloads remain source-owned. The startup PCM cue resumes the original bank-6 routine across selected windows without restarting it each frame. It includes the original bell, returns after 5,897,296 CPU cycles (about 3.3 seconds), and makes 50,177 direct DAC writes. Choose at least 199 updates for full isolated execution; shorter windows report truncation. Source bytes remain private and native builds preserve them. PCM sample/tracker editing remains unavailable.

Audio loads immediately from the native project and after reopening. Native audition and finite editable music/SFX adaptation use the existing Audio Library. DPCM-only conversion refuses; DPCM and short-mode noise are omitted from canonical scores. Frame-end adaptation does not preserve the original driver structure, sub-frame events, loops or instruments. No native Audio encoder is installed: imported tracker edits save/reopen, but native ROM output refuses until those unsupported edits are undone.

## Execution and evidence

Standard MMC2 CPU/CHR/mirroring mapping is added in a wrapper. All prior mapper branches delegate to their preceding implementation. Existing CPU/APU instruction cores, prior native adapter modules, ProjectStore and RuntimeCompiler remain byte-identical. MMC2 uses Forge's approximate scanline renderer; bus-cycle accuracy and full fights are not established. Runtime capture explicitly refuses MMC2 until capture provenance is implemented; use the recovered source views for native editing.

`Source_Preservation.json` checks all predecessor bundle parts, six reviewed shared seams and five additions. `gate/Summary.json` records the eight public suites available in the restored source snapshot. The prior 25-suite/386-case checkpoint is retained as historical evidence, not represented as a rerun: 17 historical suite scripts were absent from the recovered source snapshot. The full release gate and alpha promotion remain open.

`Screens_Verification.json` compares all 84 original PPU programs, all five placements/attributes/palettes and latch-selected pixel rows, one edit per context, native builds and project lifecycle for both revisions, plus actual predecessor rejection. `Audio_Verification.json` checks every sounding bank-8 request, independent live-driver register parity, source provenance and Audio UI/edit lifecycle. `PCM_Verification.json` compares every startup DAC/bell write and CPU-cycle position with uninterrupted live MMC2 execution, plus truncation, cancellation and UI playback. `Boot_Verification.json` checks 600 headless frames per original and derivative. Retained supplied-input Scene/Audio reports are named in `Supplied_Summary.json`.

Headless verification does not establish owner browser listening, physical input, controller behavior, complete menus/fights or hardware acceptance. These remain explicit owner checks.

## Reproduce

Build/check the standalone file with `python3 app/tools/bundle.py --check`. Run `python3 reviews/punch-out-1/run_checks.py`. Supplied-input checks require private originals at a local directory: `python3 reviews/punch-out-1/run_supplied.py /path/to/private-roms`. No ROM, recovered commercial score/sample payload, screenshot or source-bearing commercial project is distributed.
