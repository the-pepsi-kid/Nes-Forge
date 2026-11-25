# Mega Man (U): recovery comparison and reconstruction parity

SHA-256 `1c8885892051d79db757746e2281f417cd5b156a86988b0010ad95d7bd4276c5`. Counts only; no cartridge data. Baseline: before AL-REC-01 (build `dcdb55d14f0c…`). After: this build, in the real editor.

## Library (the user's import path, plus the cartridge's extraction pack)

| | Before AL-REC-01 | After import (same path, this build) | After two recovery runs |
|---|---|---|---|
| Library entries | 856 | 856 | 872 |
| Editable projects (scenes) | 2 (9) | 2 (9) | 2 (9) |
| Runtime captures in the library (editable scenes) | — | 0 | 16 |

## Investigation

| | Before: one Agent Lab job, the plan the worker chose | After: Continue Recovery | After: second run, continuing from the first |
|---|---|---|---|
| Plan | Generic first look (any emulated mapper) | Continue Recovery | Retry Unresolved Resources |
| Frames emulated | a plan of 3 targets | 20,072 | 9,420 (resumed from 50 states) |
| New observations recorded | 3 frames captured | 16 | 0 |
| Distinct screens (nametables) | 3 | layout blocks known after both runs: 100 | |
| Palettes | 2 | 6 (both runs) | |
| Graphics | 718 CHR RAM tiles seen, 718 verbatim in PRG | 892 CHR RAM tiles seen (both runs) | |
| Sprite patterns | — | 142 (both runs) | |
| Stop reason | completed | frame budget (20000 frames) exhausted | converged: 90 steps in a row found nothing new from 68 states (not a proof that nothing is left) |

## Translated layouts (CAD-PORT)

| | Before the runs | After the runs |
|---|---|---|
| Definitions with graphics | 1 | 1 |
| Editable pages | 8 | 8 |
| Definitions drawn with captured graphics | — | 0 |

## World organization (runtime evidence)

Areas: 6; transitions between areas: 6; areas with observed scrolling: 1. Areas are palettes; screens are not stitched.

## Reconstruction parity

| Category | Captured | Decoded | Editable | Verified | Writable | State |
|---|---|---|---|---|---|---|
| CHR graphics | 16 | 283 | 16 | 0 | 0 | editable (some) |
| palettes | 16 | 283 | 16 | 0 | 0 | editable (some) |
| metatiles | 0 | 0 | 0 | 1 | 0 | verified (some) |
| screens | 16 | 284 | 17 | 1 | 0 | verified (some) |
| level layouts | 1 | 0 | 0 | 0 | 0 | captured only |
| world transitions | 6 | 0 | 0 | 0 | 0 | captured only |
| sprites | 16 | 0 | 16 | 0 | 0 | editable (some) |
| metasprites | 0 | 0 | 0 | 0 | 0 | nothing recovered |
| animations | 0 | 0 | 0 | 0 | 0 | nothing recovered |
| entities | 0 | 0 | 0 | 0 | 0 | nothing recovered |
| collision | 0 | 282 | 0 | 0 | 0 | decoded (some) |
| audio | 0 | 0 | 0 | 0 | 0 | nothing recovered |
| gameplay logic | 0 | 0 | 0 | 0 | 0 | nothing recovered |
| native ROM writeback | 0 | 1 | 1 | 0 | 1 | editable (some) |

Pixel comparison: 16 of 16 runtime captures rebuild without difference from their own data.

**Verdict:** Not reconstructed 1:1: metasprites, animations, entities, audio, gameplay logic have no recovered resources; a category counts as recovered here only with evidence, not because entries exist.

## Unresolved and stopping conditions

- CHR RAM tiles have been captured but not traced to their source; Deep Recovery traces them
- the last run stopped finding new situations (converged: 90 steps in a row found nothing new from 68 states (not a proof that nothing is left)); record gameplay past that point, or retry with other inputs
- blocked: entities, collision rules and gameplay logic need the game's own data formats; no general recovery exists for them
- Run 1 (Continue Recovery): frame budget (20000 frames) exhausted
- Run 2 (Retry Unresolved Resources): converged: 90 steps in a row found nothing new from 68 states (not a proof that nothing is left)

