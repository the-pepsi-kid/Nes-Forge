# Audio routine comparison benchmark 1

This read-only benchmark puts recovered audio code into a reproducible comparison corpus. It keeps NES Forge’s strict FamiTone2 decoder unchanged and adds a separate, bounded routine-feature experiment. It does not add another supported engine, a ROM importer or an automatic conversion permission.

From `app/`, with Node 20 or newer:

```sh
node research/audio-recognition-1/benchmark.cjs --out /path/to/report.json
node tests/audio-recognition-benchmark.cjs mainline/NES_Forge_2.0.0-alpha.11.html /path/to/test-report.json
```

Omit `--out` to print JSON. `--deterministic` omits elapsed timings; Node version remains recorded. The checked-in `baseline.json` is a measured research result, not a replacement for the current candidate’s test report. Corpus inputs, source records, checkpoint archives, decoder and profile are SHA-256 pinned. No network or external assembler is needed to run the benchmark. The corpus and its referenced inputs are all under `app/`, so it also runs in the source release package.

## What is measured

| Input | Role | Strict result |
| --- | --- | --- |
| Unchanged, source-reproduced HonkeyPong | One independent FamiTone2 game; reference | Decoded |
| HonkeyPong code/data relocation | Same game and engine, reassembled | Decoded |
| HonkeyPong NROM-32 layout | Same game and engine, reassembled | Decoded |
| Unchanged, source-reproduced DABG | Different engine, original NES 2.0 container | Container refused |
| DABG header-only iNES derivative | Different-engine code control; PRG unchanged | No profile |
| HonkeyPong decoder-instruction mutation | Synthetic damaged-driver control | No profile |
| Driver bytes placed only in CHR | Synthetic data-as-code decoy | No profile |
| Truncated HonkeyPong | Malformed container | Invalid |
| Original score exported by FamiStudio 4.5.3 | Official MMC5 export; mapper control | Mapper refused |

There are **two independent external game projects**, including **one** FamiTone2 project. The source reassemblies and mutations do not increase that count. There are **zero held-out independent same-family games**. FamiStudio is derived from FamiTone2; its MMC5 export cannot test engine discrimination in this NROM experiment. It remains a useful explicit capability-refusal case.

The source files `sound.s` and `music.s` retained in the DABG checkpoint identify Damian Yerrick’s 2009–2011 LJ65/Concentration Room/Thwaite sound engine. This corpus does not infer a particular later Pently version. Its original NES 2.0 header is retained in the source fixture. Only the separately labeled, in-memory header control clears the NES 2.0 discriminator and extension fields; bytes from offset 16 onward are identical. This is a static analysis control, not a claim that a modified cartridge is hardware-equivalent.

## Feature evidence

`features.cjs` follows reset/NMI/IRQ vectors, direct calls and both branch paths. Direct jump targets are followed; indirect jumps and unofficial opcodes stop a path. JSR targets and vectors seed routine candidates. Each candidate follows its own direct branches/jumps, records calls without inlining them, and retains exact physical file offsets and instruction bytes. Only candidates containing statically addressed APU stores are compared. Indexed stores explicitly report a base address rather than asserting an effective runtime address.

The normalization retains opcode and addressing mode, immediate constants, branch displacement, relative PRG operands and RAM alias/offset relationships. RAM and zero-page offsets use separate routine-local bases. Hardware/expansion operands retain exact addresses. It does not infer low/high immediate pointer pairs, relocate arbitrary data semantically, resolve bank switching or prove what executed.

Comparison uses the Jaccard overlap of sets of four consecutive normalized instruction tokens. The reference routines must lie in the driver range already established by the unchanged strict decoder. Scores are uncalibrated ranking evidence, not probabilities or family decisions. Instruction ordering is static address order, and routine tails may overlap. Full token/byte evidence is available from the pure `inspect(bytes)` API; the CLI keeps the report smaller with fingerprints and APU write evidence.

Bounds are explicit: at most 49,168 input bytes, 32,768 graph instructions, 512 routine entries, 1,024 instructions per routine and 65,536 total routine visits. Reaching a traversal budget marks results partial. Unsupported mapper/container layouts return no routine evidence. ROM bytes, project state and emulator state are never modified.

## Observed results and limits

The relocated and NROM-32 HonkeyPong variants preserve the reference update routine’s normalized fingerprint. DABG’s maximum four-token overlap in this corpus is 2/81 (about 0.0247), with no identical routine fingerprint.

The damaged-driver control is deliberately more instructive: it has a **1.0 match for an unchanged routine while strict decoding refuses the damaged driver**. Similarity alone therefore cannot enable native recovery or canonical import. The strict decoder still accepts exactly the three existing HonkeyPong inputs and refuses all six declared controls. No family acceptance threshold is introduced.

These observations establish regression behavior for this corpus. They do not establish recognition accuracy on new games, variant coverage, runtime equivalence, reduced human effort, or recovered song semantics for DABG/FamiStudio. No precision/recall or performance target is inferred from this small, selected set. Recorded timings are elapsed Node measurements on the executing host.

## Source and build provenance

`corpus.json` records exact commits, ROM hashes, source checkpoint hashes, source-record hashes and build-instruction paths. HonkeyPong’s source, pinned assembler, instructions and original notices are retained in `examples/RE_Native_Audio/NES_Forge_Native_Audio_Input_Checkpoint.zip`; its reassembly scripts and source changes are documented in that example directory and the adjacent profile research archive. Source commit: `f9ab7ad450ffebabec15623aa811a7564f079168`; assembler commit: `8873359a0913d94e56a129a6b601dfc18a6574ab`.

DABG’s complete original source and pinned cc65 toolchain are retained in `examples/RE_Native_Map/NES_Forge_A2_Native_Map_Input_Checkpoint.zip`. Its `reproduce.py` performs a clean extraction/build and verifies the ROM hash; `Input_Provenance.json` records exact commands. Source commit: `5ecc60b6af3f726851bfeb1c2555388c5953e0c0`; cc65 commit: `555282497c3ecf8b313d87d5973093af19c35bd5`. DABG is mixed-license, including GPL-3.0-or-later audio components; complete notices/source stay in the checkpoint. No upstream audio implementation is copied into this feature extractor.

The FamiStudio export and its original-score seeds, exporter identity, reproduction steps and MIT notice are in `tests/fixtures/famistudio-export/`. The benchmark retains its original mapper declaration.

Next evidence needed before broadening recognition is at least one new independently authored same-family project that was not used to define the profile/features, plus multiple independently implemented negative engines in supported mappings. A new decoder must separately validate its instruction/data structure and timing/conversion contract; a high feature score is only a place to begin that investigation.
