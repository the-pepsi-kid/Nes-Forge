# Independent experimental verification (AL-EXP-02)

Status: implemented and run for Forge's synthetic NROM fixtures. Acceptance: `QA/al-exp-02.cjs`, part of the full
regression. Related: [experiments](AGENT_LAB_EXPERIMENTS.md), [package format](EXPERIMENT_PACKAGE_FORMAT.md),
[lifecycle and promotion](DISCOVERY_LIFECYCLE.md).

AL-EXP-01 showed that NES Forge's emulator repeats itself. That is determinism, not correctness. AL-EXP-02 runs the same
experiments in an emulator that NES Forge did not write, compares the two engines, and checks every prediction a
candidate makes on the other engine's captures alone.

## The independent emulator

| | |
|---|---|
| Emulator | FCEUX 2.6.5 (Qt/SDL build) |
| Package | Ubuntu 24.04 `fceux` 2.6.5+dfsg1-2build3 |
| Source | https://github.com/TASVideos/fceux.git, commit `ea6ed69b874e3ae94072f1b4f14b9a8f0fdd774b` (as FCEUX reports it) |
| License | GPL-2.0-or-later. FCEUX is a separate program that the harness runs; nothing of it is copied into or shipped with NES Forge |
| Scripting | Lua 5.1, built into FCEUX |
| Display | a private Xvfb display (`Xvfb :N -screen 0 640x480x24`); FCEUX's Qt build needs one even when nothing is watched |
| Configuration | a private `HOME` per run holding `SDL.RamInitMethod = 2` (CPU RAM zero-filled at power-on, the same convention as NES Forge; real hardware leaves it undefined) and `SDL.Sound = 0`. Everything else is FCEUX's default: old PPU core, NTSC timing, no Game Genie |
| Mapper | iNES mapper 0 (NROM-128); mirroring from the cartridge header |
| Independence | FCEUX shares no code with NES Forge. A name search of Forge's emulator sources finds no FCEUX, Mesen, Nestopia or jsnes material (an inference from a search, not a proof). The comparison code is NES Forge's own, shared by the harness and the editor; the execution is FCEUX's |

Why FCEUX: it is independently implemented, installable in the test environment, scriptable (Lua), and exposes CPU
registers, CPU memory, PPU memory and per-pixel NES colour indices. Mesen 2 was the other candidate. Its releases were
not reachable from this environment, so it was not used. `jsnes`, an independent JavaScript emulator, is already a QA
dependency and could serve as a second independent engine later.

## Harness

`tools/agent-lab/independent/` (development and acceptance testing only; the editor never needs it):

| File | Role |
|---|---|
| `fceux.cjs` | Finds FCEUX and Xvfb, records FCEUX's identity, starts one display, runs one FCEUX process per job with a private config, parses the output |
| `fceux-capture.lua` | Runs one job inside FCEUX and writes what it captures. Reads only FCEUX's own state |
| `verify-package.cjs` | Package in, sealed `NESForgeIndependentVerification` receipt out |
| `../inspect-package.cjs` | Validates and summarizes a package without the editor or FCEUX |

```bash
node tools/agent-lab/independent/verify-package.cjs example.forge-experiment.json --out receipt.json
```

```bash
node tools/agent-lab/independent/verify-package.cjs private.forge-experiment.json --out receipt.json --cartridge local.nes
```

Exit codes: 0 verified or reproduced, 1 failed, 2 usage or invalid package, 3 blocked. When FCEUX cannot run, the
receipt says `blocked` and nothing is verified.

## A verification job

A job is what both engines run, written so that neither engine's frame numbering matters:

- **Cartridge:** the package's cartridge, with the job's recorded mutations applied to a private copy. Its SHA-256 must
  equal the recorded variant SHA-256.
- **Input by latch:** the joypad mask latched at each falling edge of the `$4016` strobe, in order. NES Forge records
  them during its frame-mode run. FCEUX sets the joypad before each frame to the mask of the next latch, which fits
  programs that latch at most once per frame, and reports any frame that latched twice.
- **Checkpoints by NMI:** the k-th time the CPU is about to execute the instruction at the cartridge's NMI vector target.
  FCEUX uses `memory.registerexecute`; NES Forge uses an instruction-step hook in the sandbox. A frame-mode capture at
  frame F maps to the last NMI entry before the end of frame F.

The two engines number frames differently: FCEUX's frame starts at vertical blank, Forge's at line 0, and power-on
differs. In the acceptance fixtures FCEUX reports frame numbers three higher at every checkpoint. Synchronizing on the
program's own events removes this without hiding anything.

## What is captured and compared

At each checkpoint both engines capture, and the comparison normalizes:

| Channel | Captured | Normalization (representation only) |
|---|---|---|
| CPU | A, X, Y, S, P, PC | P masked with `$CF`: B and bit 5 are not stored flags |
| RAM | `$0000-$07FF`, plus which bytes were written since power-on | none; the three stack bytes of the interrupt frame are classified (below) |
| Nametables | 2 KiB of physical nametable RAM | FCEUX's logical `$2000-$2FFF` folded through the cartridge's mirroring |
| Attributes | the 64-byte attribute area of each physical nametable | as nametables |
| Palette | `$3F00-$3F1F` | mirror entries `$3F10/14/18/1C` folded; values masked to 6 bits |
| CHR | `$0000-$1FFF` | none |
| Pixels | 256x240 NES colour indices: the frame completed before this vertical blank | reduced to the colour classes NES Forge's palette table draws identically (for example the blacks). RGB values, overscan and emulator palettes are never compared |
| Reads | every effective PRG data read, as (PC, address), up to the checkpoint | instruction level on both sides: FCEUX decodes each executed instruction from its own registers; NES Forge's core performs no dummy reads |
| OAM | not compared | FCEUX 2.6 exposes no OAM read to Lua. The fixtures draw no sprites |
| Audio | not compared | out of scope |

**Classified differences.** A difference is kept and classified, never dropped:

- **Interrupt frame (timing):** the three stack bytes NMI pushes record where the main loop was when the interrupt
  arrived. Instruction timing can differ there without any change in what the program does. These are reported as
  `equal-except-timing`, with their indexes.
- **Everything else is semantic** until explained.

**Large channels.** Pixels, CHR and reads are compared byte for byte by the harness. A receipt carries them by SHA-256,
and the small channels as bytes.

## Predictions, judged on FCEUX alone

For each job the package records what the candidate predicts:

| Job | Prediction checked on FCEUX's own baseline and variant captures |
|---|---|
| Supporting tile intervention (two record positions) | exactly the predicted nametable cells change, to the predicted values; nothing else on screen changes |
| Palette-array intervention | exactly the predicted attribute bits change |
| Controls (same value, unrelated byte) and falsified decoys | no change in nametables, attributes, palette or pixels |
| Withheld screen | every claimed cell shows its claimed four tiles and every stated attribute bit holds. The harness re-decodes each claimed cell from the frozen definition with its own decoder before comparing |
| Confounded or wrongly predicted interventions | compared between engines only (no prediction) |

## Verdicts

| Verdict | Meaning |
|---|---|
| `verified` | A frozen candidate exists, the engines agree on every compared channel at every checkpoint (timing differences reported), and every prediction holds on FCEUX |
| `reproduced` | No candidate (inconclusive, insufficient or ambiguous among several tables): the observations and negative results recur on FCEUX. Nothing is claimed |
| `failed` | An engine disagreement, or a prediction that does not hold on FCEUX |
| `blocked` | FCEUX could not run. Nothing was verified |

**Re-check in the editor.** Attaching a receipt does not trust the harness's verdict. The editor checks the seal, the
cartridge and the definition. It then re-compares every channel the receipt carries with its own job captures,
re-judges every prediction on the receipt's raw FCEUX captures, and uses its own result. A receipt whose verdict does
not match the recomputation is flagged. The acceptance suite tests a forged receipt: one nametable byte changed, then
re-sealed.

## Known differences and limitations

- **No semantic difference observed.** None were found on the synthetic fixtures in the acceptance run. The only
  differences were interrupt-frame stack bytes, classified as timing.
- **Narrow scope.** NROM, unscrolled screens, one latch per frame, programs whose NMI handler entry is a meaningful
  checkpoint. Bank switching, scrolling, sprites (OAM) and audio are not covered.
- **Representation.** FCEUX's picture is compared as colour indices, and NES Forge's as the indices its RGB output maps
  back to. Indices NES Forge's palette table draws identically cannot be told apart.
- **Same author.** The harness, the comparison and the oracle were written by the same author as the discovery code.
  The independence is in the execution engine (FCEUX) and in the oracle's data (the generator's).
- **Trust in the harness.** A receipt is a claim from an external harness. The editor checks its integrity and
  re-computes its verdict from its raw data; it cannot prove the data came from FCEUX.
