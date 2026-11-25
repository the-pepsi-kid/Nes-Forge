# Mega Man 2 (U): recovery comparison and reconstruction parity

SHA-256 `27b5a635df33ed57ed339dfc7fd62fc603b39c1d1603adb5cdc3562a0b0d555b`. Counts only; no cartridge data. Baseline: before AL-REC-01 (build `dcdb55d14f0c…`). After: this build, in the real editor.

## Library (the user's import path, plus the cartridge's extraction pack)

| | Before AL-REC-01 | After import (same path, this build) | After two recovery runs |
|---|---|---|---|
| Library entries | 1,941 | 1,941 | 1,974 |
| Editable projects (scenes) | 82 (381) | 82 (381) | 82 (381) |
| Runtime captures in the library (editable scenes) | — | 0 | 33 |

## Investigation

| | Before: one Agent Lab job, the plan the worker chose | After: Continue Recovery | After: second run, continuing from the first |
|---|---|---|---|
| Plan | Generic first look (any emulated mapper) | Continue Recovery | Retry Unresolved Resources |
| Frames emulated | a plan of 3 targets | 20,072 | 12,030 (resumed from 21 states) |
| New observations recorded | 3 frames captured | 27 | 6 |
| Distinct screens (nametables) | 1 | layout blocks known after both runs: 148 | |
| Palettes | 1 | 23 (both runs) | |
| Graphics | 398 CHR RAM tiles seen, 398 verbatim in PRG | 1,446 CHR RAM tiles seen (both runs) | |
| Sprite patterns | — | 112 (both runs) | |
| Stop reason | completed | frame budget (20000 frames) exhausted | frame budget (12000 frames) exhausted |

## Translated layouts (CAD-PORT)

| | Before the runs | After the runs |
|---|---|---|
| Definitions with graphics | 1 | 1 |
| Editable pages | 6 | 6 |
| Definitions drawn with captured graphics | — | 0 |

## World organization (runtime evidence)

Areas: 23; transitions between areas: 24; areas with observed scrolling: 2. Areas are palettes; screens are not stitched.

## Reconstruction parity

| Category | Captured | Decoded | Editable | Verified | Writable | State |
|---|---|---|---|---|---|---|
| CHR graphics | 33 | 1 | 33 | 0 | 0 | editable (some) |
| palettes | 33 | 1 | 33 | 0 | 0 | editable (some) |
| metatiles | 0 | 0 | 0 | 1 | 0 | verified (some) |
| screens | 33 | 632 | 48 | 1 | 0 | verified (some) |
| level layouts | 2 | 616 | 0 | 0 | 0 | decoded (some) |
| world transitions | 24 | 0 | 0 | 0 | 0 | captured only |
| sprites | 33 | 0 | 33 | 0 | 0 | editable (some) |
| metasprites | 0 | 0 | 0 | 0 | 0 | nothing recovered |
| animations | 0 | 0 | 0 | 0 | 0 | nothing recovered |
| entities | 0 | 0 | 0 | 0 | 0 | nothing recovered |
| collision | 0 | 0 | 0 | 0 | 0 | nothing recovered |
| audio | 0 | 68 | 67 | 0 | 0 | editable (some) |
| gameplay logic | 0 | 0 | 0 | 0 | 0 | nothing recovered |
| native ROM writeback | 0 | 0 | 0 | 0 | 0 | nothing recovered |

Pixel comparison: 33 of 33 runtime captures rebuild without difference from their own data.

**Verdict:** Not reconstructed 1:1: metasprites, animations, entities, collision, gameplay logic, native ROM writeback have no recovered resources; a category counts as recovered here only with evidence, not because entries exist.

## Unresolved and stopping conditions

- CHR RAM tiles have been captured but not traced to their source; Deep Recovery traces them
- the last run used its budget while still finding new resources (frame budget (12000 frames) exhausted); continue from where it stopped
- blocked: entities, collision rules and gameplay logic need the game's own data formats; no general recovery exists for them
- Run 1 (Continue Recovery): frame budget (20000 frames) exhausted
- Run 2 (Retry Unresolved Resources): frame budget (12000 frames) exhausted

