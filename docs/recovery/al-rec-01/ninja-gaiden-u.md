# Ninja Gaiden (U): recovery comparison and reconstruction parity

SHA-256 `07d9e57e35184667c7b89e30857a44c5c404b48332ad12e66be91100eccd4f5e`. Counts only; no cartridge data. Baseline: before AL-REC-01 (build `dcdb55d14f0c…`). After: this build, in the real editor.

## Library (the user's import path, plus the cartridge's extraction pack)

| | Before AL-REC-01 | After import (same path, this build) | After two recovery runs |
|---|---|---|---|
| Library entries | 902 | 902 | 1,030 |
| Editable projects (scenes) | 195 (1,231) | 195 (1,231) | 195 (1,231) |
| Runtime captures in the library (editable scenes) | — | 0 | 128 |

## Investigation

| | Before: one Agent Lab job, the plan the worker chose | After: Continue Recovery | After: second run, continuing from the first |
|---|---|---|---|
| Plan | Ninja Gaiden (US) · every area from its first room | Continue Recovery | Retry Unresolved Resources |
| Frames emulated | a plan of 22 targets | 20,072 | 12,030 (resumed from 213 states) |
| New observations recorded | 22 frames captured | 104 | 24 |
| Distinct screens (nametables) | 21 | layout blocks known after both runs: 436 | |
| Palettes | 22 | 52 (both runs) | |
| Graphics | 36 of 128 CHR banks seen | 36 of 128 CHR banks seen (both runs) | |
| Sprite patterns | — | 104 (both runs) | |
| Stop reason | completed | frame budget (20000 frames) exhausted | frame budget (12000 frames) exhausted |

## Translated layouts (CAD-PORT)

| | Before the runs | After the runs |
|---|---|---|
| Definitions with graphics | 1 | 1 |
| Editable pages | 12 | 12 |
| Definitions drawn with captured graphics | — | 0 |

## World organization (runtime evidence)

Areas: 50; transitions between areas: 54; areas with observed scrolling: 7. Areas are palettes; screens are not stitched.

## Reconstruction parity

| Category | Captured | Decoded | Editable | Verified | Writable | State |
|---|---|---|---|---|---|---|
| CHR graphics | 128 | 3 | 128 | 0 | 0 | editable (some) |
| palettes | 128 | 1 | 128 | 0 | 0 | editable (some) |
| metatiles | 0 | 0 | 0 | 1 | 0 | verified (some) |
| screens | 128 | 165 | 177 | 1 | 0 | verified (some) |
| level layouts | 7 | 48 | 0 | 0 | 0 | decoded (some) |
| world transitions | 54 | 3 | 0 | 0 | 0 | decoded (some) |
| sprites | 128 | 202 | 128 | 0 | 0 | editable (some) |
| metasprites | 0 | 202 | 0 | 0 | 0 | decoded (some) |
| animations | 0 | 81 | 80 | 0 | 0 | editable (some) |
| entities | 0 | 0 | 0 | 0 | 0 | nothing recovered |
| collision | 0 | 0 | 0 | 0 | 0 | nothing recovered |
| audio | 0 | 67 | 66 | 0 | 0 | editable (some) |
| gameplay logic | 0 | 0 | 0 | 0 | 0 | nothing recovered |
| native ROM writeback | 0 | 0 | 0 | 0 | 0 | nothing recovered |

Pixel comparison: 128 of 128 runtime captures rebuild without difference from their own data.

**Verdict:** Not reconstructed 1:1: entities, collision, gameplay logic, native ROM writeback have no recovered resources; a category counts as recovered here only with evidence, not because entries exist.

## Unresolved and stopping conditions

- 92 of 128 CHR ROM 1 KiB banks have not been seen in use; Investigate Missing Resources explores further, gameplay recording reaches places exploration does not
- the last run used its budget while still finding new resources (frame budget (12000 frames) exhausted); continue from where it stopped
- blocked: entities, collision rules and gameplay logic need the game's own data formats; no general recovery exists for them
- Run 1 (Continue Recovery): frame budget (20000 frames) exhausted
- Run 2 (Retry Unresolved Resources): frame budget (12000 frames) exhausted

