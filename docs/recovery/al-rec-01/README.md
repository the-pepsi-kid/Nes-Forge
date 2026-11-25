# AL-REC-01: per-ROM recovery comparison

Before: build `dcdb55d14f0c…` (baseline (5aee66b, before AL-REC-01)). After: AL-REC-01 builds (CHR ROM cartridges measured with `37fceb7da822…`; CHR RAM cartridges, whose traces the final tracer changes, with `d3a8919b74e6…` (identical exploration counts on both builds)), two recovery runs per cartridge: Continue Recovery, then Retry Unresolved Resources continuing from the first run's states. One page per cartridge links below.

The graphics column compares different things: *before* is what one Agent Lab job showed (the profile plan where the worker has one, else the generic plan); *after* is what the two recovery runs saw. Punch-Out's profile plan visits all 14 fights and saw more CHR banks (56) than 32,000 frames of general exploration (24): exploration adds to game-specific plans, it does not replace them.

| Cartridge | Library entries before → after | Investigation before: frames / screens | After: observations (run 1 + run 2) | Graphics before → after | Run 2 stop reason |
|---|---|---|---|---|---|
| [Battletoads (U)](battletoads-u.md) | 23 → 115 | 3 / 3 | 76 + 13 | 646 tiles → 3,017 | frame budget (12000 frames) exhausted |
| [Castlevania (U) (PRG 0)](castlevania-u-prg-0.md) | 56 → 118 | 3 / 3 | 54 + 8 | 610 tiles → 981 | frame budget (12000 frames) exhausted |
| [Castlevania (U) (PRG 1)](castlevania-u-prg-1.md) | 56 → 115 | 3 / 3 | 55 + 4 | 610 tiles → 981 | frame budget (12000 frames) exhausted |
| [Mega Man (U)](mega-man-u.md) | 856 → 872 | 3 / 3 | 16 + 0 | 718 tiles → 892 | converged: 90 steps in a row found nothing new from 68 states (not a proof that nothing is left) |
| [Mega Man 2 (U)](mega-man-2-u.md) | 1,941 → 1,974 | 3 / 1 | 27 + 6 | 398 tiles → 1,446 | frame budget (12000 frames) exhausted |
| [Metroid (U)](metroid-u.md) | 623 → 692 | 3 / 3 | 67 + 2 | 399 tiles → 498 | frame budget (12000 frames) exhausted |
| [Mike Tyson's Punch-Out!! (U) (PRG 0)](mike-tyson-s-punch-out-u-prg-0.md) | 84 → 199 | 17 / 16 | 27 + 88 | 56/128 banks → 24/128 | frame budget (12000 frames) exhausted |
| [Mike Tyson's Punch-Out!! (U) (PRG 1)](mike-tyson-s-punch-out-u-prg-1.md) | 84 → 199 | 17 / 16 | 27 + 88 | 56/128 banks → 24/128 | frame budget (12000 frames) exhausted |
| [Ninja Gaiden (U)](ninja-gaiden-u.md) | 902 → 1,030 | 22 / 21 | 104 + 24 | 36/128 banks → 36/128 | frame budget (12000 frames) exhausted |
| [Teenage Mutant Ninja Turtles (U)](teenage-mutant-ninja-turtles-u.md) | 55 → 151 | 3 / 2 | 62 + 16 | 8/128 banks → 32/128 | frame budget (12000 frames) exhausted |
| [Zelda 2 - The Adventure of Link (U)](zelda-2-the-adventure-of-link-u.md) | 1,171 → 1,175 | 3 / 2 | 4 + 0 | 8/128 banks → 8/128 | converged: 90 steps in a row found nothing new from 13 states (not a proof that nothing is left) |

