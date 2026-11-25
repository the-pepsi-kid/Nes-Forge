# Teenage Mutant Ninja Turtles (U): recovery comparison and reconstruction parity

SHA-256 `9ff2693fdafb0c454d571b34bae6623a806db4a317ce2fcb2fea0f721bc04083`. Counts only; no cartridge data. Baseline: before AL-REC-01 (build `dcdb55d14f0c…`). After: this build, in the real editor.

## Library (the user's import path, plus the cartridge's extraction pack)

| | Before AL-REC-01 | After import (same path, this build) | After two recovery runs |
|---|---|---|---|
| Library entries | 55 | 73 | 151 |
| Editable projects (scenes) | 18 (157) | 36 (308) | 36 (308) |
| Runtime captures in the library (editable scenes) | — | 0 | 78 |

## Investigation

| | Before: one Agent Lab job, the plan the worker chose | After: Continue Recovery | After: second run, continuing from the first |
|---|---|---|---|
| Plan | Generic first look (any emulated mapper) | Continue Recovery | Retry Unresolved Resources |
| Frames emulated | a plan of 3 targets | 20,072 | 12,030 (resumed from 77 states) |
| New observations recorded | 3 frames captured | 62 | 16 |
| Distinct screens (nametables) | 2 | layout blocks known after both runs: 405 | |
| Palettes | 1 | 21 (both runs) | |
| Graphics | 8 of 128 CHR banks seen | 32 of 128 CHR banks seen (both runs) | |
| Sprite patterns | — | 103 (both runs) | |
| Stop reason | completed | frame budget (20000 frames) exhausted | frame budget (12000 frames) exhausted |

## Translated layouts (CAD-PORT)

| | Before the runs | After the runs |
|---|---|---|
| Definitions with graphics | 18 | 18 |
| Editable pages | 308 | 308 |
| Definitions drawn with captured graphics | — | 0 |

## World organization (runtime evidence)

Areas: 21; transitions between areas: 30; areas with observed scrolling: 5. Areas are palettes; screens are not stitched.

## Reconstruction parity

| Category | Captured | Decoded | Editable | Verified | Writable | State |
|---|---|---|---|---|---|---|
| CHR graphics | 78 | 18 | 78 | 0 | 0 | editable (some) |
| palettes | 78 | 18 | 78 | 0 | 0 | editable (some) |
| metatiles | 0 | 0 | 0 | 1 | 0 | verified (some) |
| screens | 78 | 54 | 114 | 1 | 0 | verified (some) |
| level layouts | 5 | 0 | 0 | 0 | 0 | captured only |
| world transitions | 30 | 0 | 0 | 0 | 0 | captured only |
| sprites | 78 | 0 | 78 | 0 | 0 | editable (some) |
| metasprites | 0 | 0 | 0 | 0 | 0 | nothing recovered |
| animations | 0 | 0 | 0 | 0 | 0 | nothing recovered |
| entities | 0 | 0 | 0 | 0 | 0 | nothing recovered |
| collision | 0 | 0 | 0 | 0 | 0 | nothing recovered |
| audio | 0 | 0 | 0 | 0 | 0 | nothing recovered |
| gameplay logic | 0 | 0 | 0 | 0 | 0 | nothing recovered |
| native ROM writeback | 0 | 0 | 0 | 0 | 0 | nothing recovered |

Pixel comparison: 78 of 78 runtime captures rebuild without difference from their own data.

**Verdict:** Not reconstructed 1:1: metasprites, animations, entities, collision, audio, gameplay logic, native ROM writeback have no recovered resources; a category counts as recovered here only with evidence, not because entries exist.

## Unresolved and stopping conditions

- 96 of 128 CHR ROM 1 KiB banks have not been seen in use; Investigate Missing Resources explores further, gameplay recording reaches places exploration does not
- the last run used its budget while still finding new resources (frame budget (12000 frames) exhausted); continue from where it stopped
- blocked: entities, collision rules and gameplay logic need the game's own data formats; no general recovery exists for them
- Run 1 (Continue Recovery): frame budget (20000 frames) exhausted
- Run 2 (Retry Unresolved Resources): frame budget (12000 frames) exhausted

