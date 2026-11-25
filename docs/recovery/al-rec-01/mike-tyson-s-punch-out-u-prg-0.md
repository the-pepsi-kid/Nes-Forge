# Mike Tyson's Punch-Out!! (U) (PRG 0): recovery comparison and reconstruction parity

SHA-256 `0435f6d9bcfeb474a592c3a950530a99c03a6f6cacff793dc88f822bb8cc6952`. Counts only; no cartridge data. Baseline: before AL-REC-01 (build `dcdb55d14f0c…`). After: this build, in the real editor.

## Library (the user's import path, plus the cartridge's extraction pack)

| | Before AL-REC-01 | After import (same path, this build) | After two recovery runs |
|---|---|---|---|
| Library entries | 84 | 84 | 199 |
| Editable projects (scenes) | 69 (88) | 69 (88) | 69 (88) |
| Runtime captures in the library (editable scenes) | — | 0 | 115 |

## Investigation

| | Before: one Agent Lab job, the plan the worker chose | After: Continue Recovery | After: second run, continuing from the first |
|---|---|---|---|
| Plan | Mike Tyson's Punch-Out!! (US, PRG 0) · title, passcode and all 14 fights | Continue Recovery | Retry Unresolved Resources |
| Frames emulated | a plan of 17 targets | 20,072 | 12,100 (resumed from 35 states) |
| New observations recorded | 17 frames captured | 27 | 88 |
| Distinct screens (nametables) | 16 | layout blocks known after both runs: 549 | |
| Palettes | 17 | 18 (both runs) | |
| Graphics | 56 of 128 CHR banks seen | 24 of 128 CHR banks seen (both runs) | |
| Sprite patterns | — | 150 (both runs) | |
| Stop reason | completed | frame budget (20000 frames) exhausted | frame budget (12000 frames) exhausted |

## World organization (runtime evidence)

Areas: 18; transitions between areas: 24; areas with observed scrolling: 3. Areas are palettes; screens are not stitched.

## Reconstruction parity

| Category | Captured | Decoded | Editable | Verified | Writable | State |
|---|---|---|---|---|---|---|
| CHR graphics | 115 | 5 | 115 | 0 | 0 | editable (some) |
| palettes | 115 | 5 | 115 | 0 | 0 | editable (some) |
| metatiles | 0 | 0 | 0 | 0 | 0 | nothing recovered |
| screens | 115 | 5 | 115 | 0 | 0 | editable (some) |
| level layouts | 3 | 0 | 0 | 0 | 0 | captured only |
| world transitions | 24 | 0 | 0 | 0 | 0 | captured only |
| sprites | 115 | 0 | 115 | 0 | 0 | editable (some) |
| metasprites | 0 | 0 | 0 | 0 | 0 | nothing recovered |
| animations | 0 | 0 | 0 | 0 | 0 | nothing recovered |
| entities | 0 | 0 | 0 | 0 | 0 | nothing recovered |
| collision | 0 | 0 | 0 | 0 | 0 | nothing recovered |
| audio | 0 | 69 | 68 | 0 | 0 | editable (some) |
| gameplay logic | 0 | 0 | 0 | 0 | 0 | nothing recovered |
| native ROM writeback | 0 | 1 | 1 | 0 | 1 | editable (some) |

Pixel comparison: 115 of 115 runtime captures rebuild without difference from their own data.

**Verdict:** Not reconstructed 1:1: metatiles, metasprites, animations, entities, collision, gameplay logic have no recovered resources; a category counts as recovered here only with evidence, not because entries exist.

## Unresolved and stopping conditions

- 104 of 128 CHR ROM 1 KiB banks have not been seen in use; Investigate Missing Resources explores further, gameplay recording reaches places exploration does not
- the last run used its budget while still finding new resources (frame budget (12000 frames) exhausted); continue from where it stopped
- blocked: entities, collision rules and gameplay logic need the game's own data formats; no general recovery exists for them
- Run 1 (Continue Recovery): frame budget (20000 frames) exhausted
- Run 2 (Retry Unresolved Resources): frame budget (12000 frames) exhausted

