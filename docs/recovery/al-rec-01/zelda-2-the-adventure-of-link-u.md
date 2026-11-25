# Zelda 2 - The Adventure of Link (U): recovery comparison and reconstruction parity

SHA-256 `ad8c0fbcf092bf84b48e69fd3964eea4ed91bfe62abc352943d537979782680c`. Counts only; no cartridge data. Baseline: before AL-REC-01 (build `dcdb55d14f0c…`). After: this build, in the real editor.

## Library (the user's import path, plus the cartridge's extraction pack)

| | Before AL-REC-01 | After import (same path, this build) | After two recovery runs |
|---|---|---|---|
| Library entries | 1,171 | 1,171 | 1,175 |
| Editable projects (scenes) | 318 (1,006) | 318 (1,006) | 318 (1,006) |
| Runtime captures in the library (editable scenes) | — | 0 | 4 |

## Investigation

| | Before: one Agent Lab job, the plan the worker chose | After: Continue Recovery | After: second run, continuing from the first |
|---|---|---|---|
| Plan | Generic first look (any emulated mapper) | Continue Recovery | Retry Unresolved Resources |
| Frames emulated | a plan of 3 targets | 18,442 | 8,950 (resumed from 13 states) |
| New observations recorded | 3 frames captured | 4 | 0 |
| Distinct screens (nametables) | 2 | layout blocks known after both runs: 105 | |
| Palettes | 1 | 2 (both runs) | |
| Graphics | 8 of 128 CHR banks seen | 8 of 128 CHR banks seen (both runs) | |
| Sprite patterns | — | 17 (both runs) | |
| Stop reason | completed | converged: 60 steps in a row found nothing new from 13 states (not a proof that nothing is left) | converged: 90 steps in a row found nothing new from 13 states (not a proof that nothing is left) |

## World organization (runtime evidence)

Areas: 2; transitions between areas: 1; areas with observed scrolling: 1. Areas are palettes; screens are not stitched.

## Reconstruction parity

| Category | Captured | Decoded | Editable | Verified | Writable | State |
|---|---|---|---|---|---|---|
| CHR graphics | 4 | 0 | 4 | 0 | 0 | editable (some) |
| palettes | 4 | 0 | 4 | 0 | 0 | editable (some) |
| metatiles | 0 | 0 | 0 | 0 | 0 | nothing recovered |
| screens | 4 | 520 | 262 | 0 | 0 | editable (some) |
| level layouts | 1 | 4 | 0 | 0 | 0 | decoded (some) |
| world transitions | 1 | 4 | 0 | 0 | 0 | decoded (some) |
| sprites | 4 | 30 | 4 | 0 | 0 | editable (some) |
| metasprites | 0 | 30 | 0 | 0 | 0 | decoded (some) |
| animations | 0 | 0 | 0 | 0 | 0 | nothing recovered |
| entities | 0 | 0 | 0 | 0 | 0 | nothing recovered |
| collision | 0 | 258 | 0 | 0 | 0 | decoded (some) |
| audio | 0 | 61 | 60 | 0 | 0 | editable (some) |
| gameplay logic | 0 | 0 | 0 | 0 | 0 | nothing recovered |
| native ROM writeback | 0 | 0 | 0 | 0 | 0 | nothing recovered |

Pixel comparison: 4 of 4 runtime captures rebuild without difference from their own data.

**Verdict:** Not reconstructed 1:1: metatiles, animations, entities, gameplay logic, native ROM writeback have no recovered resources; a category counts as recovered here only with evidence, not because entries exist.

## Unresolved and stopping conditions

- 120 of 128 CHR ROM 1 KiB banks have not been seen in use; Investigate Missing Resources explores further, gameplay recording reaches places exploration does not
- the last run stopped finding new situations (converged: 90 steps in a row found nothing new from 13 states (not a proof that nothing is left)); record gameplay past that point, or retry with other inputs
- blocked: entities, collision rules and gameplay logic need the game's own data formats; no general recovery exists for them
- Run 1 (Continue Recovery): converged: 60 steps in a row found nothing new from 13 states (not a proof that nothing is left)
- Run 2 (Retry Unresolved Resources): converged: 90 steps in a row found nothing new from 13 states (not a proof that nothing is left)

