# NES Forge ROM capability audit

Measured by importing each exact ROM through `Forge.commands` (the same path as the editor), listing every resource with its editability level, building the unchanged import and saving / reopening it. Editor SHA-256 `f35f0b5a2760445b152cb4c27eeaeaef9509251095a8118804ba8338d3c35663`.

States: **rebuild** = edits reach a built ROM (authored game, or a registered native writer); **edit copy** = editable but a native build refuses the change; **ownership unknown** = this project type does not yet publish which assets its writers own; **visible** = shown in the Library, read-only; **none** = not decoded.

| ROM | Mapper | Kind | Scenes / rooms | CHR / tiles | Palettes | Sprites / poses | Animations | Worlds / maps | Collision | Audio | Unchanged build | Save/reopen |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Battletoads (U) | 7 | inspection | edit copy (1) | edit copy (2) | edit copy (2) | none | none | none | edit copy (1) | not identified | yes, identical to source | yes |
| Castlevania 2 - Simon's Quest (U) | 1 | inspection | none | edit copy (64) | edit copy (32) | none | none | none | none | catalog 58 cues (no native writer) | yes, identical to source | yes |
| Castlevania (U) (PRG 0) | 2 | inspection | edit copy (1) | edit copy (2) | edit copy (2) | none | none | none | edit copy (1) | catalog 53 cues (no native writer) | yes, identical to source | yes |
| Castlevania (U) (PRG 1) | 2 | inspection | edit copy (1) | edit copy (2) | edit copy (2) | none | none | none | edit copy (1) | catalog 53 cues (no native writer) | yes, identical to source | yes |
| Contra (U) | 2 | native | rebuild (1 native) | edit copy (2) | edit copy (2) | none | none | none | edit copy (1) | not identified | yes, identical to source | yes |
| Double Dragon (U) | 1 | inspection | none | edit copy (64) | edit copy (32) | none | none | none | none | not identified | yes, identical to source | yes |
| Final Fantasy (U) | 1 | native | rebuild (1 native) | edit copy (2) | edit copy (2) | none | none | none | edit copy (1) | not identified | yes, identical to source | yes |
| Gun Smoke (U) | 2 | inspection | edit copy (1) | edit copy (2) | edit copy (2) | none | none | none | edit copy (1) | not identified | yes, identical to source | yes |
| Mega Man 2 (U) | 1 | inspection | edit copy (1) | edit copy (2) | edit copy (2) | none | none | none | edit copy (1) | not identified | yes, identical to source | yes |
| Mega Man (U) | 2 (header says 66) | native | rebuild (1 native) | edit copy (2) | edit copy (2) | none | none | none | edit copy (1) | not identified | yes, identical to source | yes |
| Metroid (U) | 1 | native | rebuild (1 native) | edit copy (2) | edit copy (2) | none | none | none | edit copy (1) | catalog 37 cues (no native writer) | yes, identical to source | yes |
| Mike Tyson's Punch-Out!! (U) (PRG 1) | 9 | native | rebuild (6 native) | edit copy (40) | edit copy (40) | edit copy (14) | none | none | edit copy (20) | catalog 84 cues (no native writer) | yes, identical to source | yes |
| Ninja Gaiden (U) | 1 | inspection | edit copy (60) | edit copy (56) | edit copy (24) | edit copy (202) | edit copy (83) | edit copy (49) | edit copy (12) | catalog 85 cues (no native writer) | yes, identical to source | yes |
| River City Ransom (U) | 4 | native | rebuild (1 native) | edit copy (2) | edit copy (2) | none | none | none | edit copy (1) | catalog 63 cues (no native writer) | yes, identical to source | yes |
| Shadowgate (U) | 4 (header says 68) | native | rebuild (1 native) | edit copy (2) | edit copy (2) | none | none | none | edit copy (1) | catalog 35 cues (no native writer) | yes, identical to source | yes |
| Super Mario Bros - Duck Hunt (U) | 66 | inspection | none | edit copy (8) | edit copy (4) | none | none | none | none | not identified | yes, identical to source | yes |
| Super Mario Bros 2 (U) (PRG 1) | 4 | inspection | none | edit copy (64) | edit copy (32) | none | none | none | none | not identified | yes, identical to source | yes |
| Super Mario Bros 3 (U) (PRG 1) | 4 | inspection | none | edit copy (64) | edit copy (32) | none | none | none | none | not identified | yes, identical to source | yes |
| Teenage Mutant Ninja Turtles (U) | 1 | native | ownership unknown (40) | ownership unknown (104) | ownership unknown (72) | none | none | none | ownership unknown (20) | not identified | yes, identical to source | yes |
| Zelda 2 - The Adventure of Link (U) | 1 | native | ownership unknown (570) | ownership unknown (38) | ownership unknown (6) | ownership unknown (30) | none | ownership unknown (5) | ownership unknown (3) | catalog 75 cues (no native writer) | yes, identical to source | yes |

## Backlog (gaps ranked by how many ROMs they block)

- **Not decoded: Animations** — 19 ROM(s): Battletoads (U), Castlevania 2 - Simon's Quest (U), Castlevania (U) (PRG 0), Castlevania (U) (PRG 1), Contra (U), Double Dragon (U), Final Fantasy (U), Gun Smoke (U), Mega Man 2 (U), Mega Man (U), Metroid (U), Mike Tyson's Punch-Out!! (U) (PRG 1), River City Ransom (U), Shadowgate (U), Super Mario Bros - Duck Hunt (U), Super Mario Bros 2 (U) (PRG 1), Super Mario Bros 3 (U) (PRG 1), Teenage Mutant Ninja Turtles (U), Zelda 2 - The Adventure of Link (U)
- **No native writer: CHR / tiles edits are refused at native build** — 18 ROM(s): Battletoads (U), Castlevania 2 - Simon's Quest (U), Castlevania (U) (PRG 0), Castlevania (U) (PRG 1), Contra (U), Double Dragon (U), Final Fantasy (U), Gun Smoke (U), Mega Man 2 (U), Mega Man (U), Metroid (U), Mike Tyson's Punch-Out!! (U) (PRG 1), Ninja Gaiden (U), River City Ransom (U), Shadowgate (U), Super Mario Bros - Duck Hunt (U), Super Mario Bros 2 (U) (PRG 1), Super Mario Bros 3 (U) (PRG 1)
- **No native writer: Palettes edits are refused at native build** — 18 ROM(s): Battletoads (U), Castlevania 2 - Simon's Quest (U), Castlevania (U) (PRG 0), Castlevania (U) (PRG 1), Contra (U), Double Dragon (U), Final Fantasy (U), Gun Smoke (U), Mega Man 2 (U), Mega Man (U), Metroid (U), Mike Tyson's Punch-Out!! (U) (PRG 1), Ninja Gaiden (U), River City Ransom (U), Shadowgate (U), Super Mario Bros - Duck Hunt (U), Super Mario Bros 2 (U) (PRG 1), Super Mario Bros 3 (U) (PRG 1)
- **Not decoded: Worlds / maps** — 18 ROM(s): Battletoads (U), Castlevania 2 - Simon's Quest (U), Castlevania (U) (PRG 0), Castlevania (U) (PRG 1), Contra (U), Double Dragon (U), Final Fantasy (U), Gun Smoke (U), Mega Man 2 (U), Mega Man (U), Metroid (U), Mike Tyson's Punch-Out!! (U) (PRG 1), River City Ransom (U), Shadowgate (U), Super Mario Bros - Duck Hunt (U), Super Mario Bros 2 (U) (PRG 1), Super Mario Bros 3 (U) (PRG 1), Teenage Mutant Ninja Turtles (U)
- **Not decoded: Sprites / poses** — 17 ROM(s): Battletoads (U), Castlevania 2 - Simon's Quest (U), Castlevania (U) (PRG 0), Castlevania (U) (PRG 1), Contra (U), Double Dragon (U), Final Fantasy (U), Gun Smoke (U), Mega Man 2 (U), Mega Man (U), Metroid (U), River City Ransom (U), Shadowgate (U), Super Mario Bros - Duck Hunt (U), Super Mario Bros 2 (U) (PRG 1), Super Mario Bros 3 (U) (PRG 1), Teenage Mutant Ninja Turtles (U)
- **No native writer: Collision edits are refused at native build** — 13 ROM(s): Battletoads (U), Castlevania (U) (PRG 0), Castlevania (U) (PRG 1), Contra (U), Final Fantasy (U), Gun Smoke (U), Mega Man 2 (U), Mega Man (U), Metroid (U), Mike Tyson's Punch-Out!! (U) (PRG 1), Ninja Gaiden (U), River City Ransom (U), Shadowgate (U)
- **No native audio driver profile** — 11 ROM(s): Battletoads (U), Contra (U), Double Dragon (U), Final Fantasy (U), Gun Smoke (U), Mega Man 2 (U), Mega Man (U), Super Mario Bros - Duck Hunt (U), Super Mario Bros 2 (U) (PRG 1), Super Mario Bros 3 (U) (PRG 1), Teenage Mutant Ninja Turtles (U)
- **Native audio catalog but no native audio writer** — 9 ROM(s): Castlevania 2 - Simon's Quest (U), Castlevania (U) (PRG 0), Castlevania (U) (PRG 1), Metroid (U), Mike Tyson's Punch-Out!! (U) (PRG 1), Ninja Gaiden (U), River City Ransom (U), Shadowgate (U), Zelda 2 - The Adventure of Link (U)
- **No native writer: Scenes / rooms edits are refused at native build** — 6 ROM(s): Battletoads (U), Castlevania (U) (PRG 0), Castlevania (U) (PRG 1), Gun Smoke (U), Mega Man 2 (U), Ninja Gaiden (U)
- **Not decoded: Scenes / rooms** — 5 ROM(s): Castlevania 2 - Simon's Quest (U), Double Dragon (U), Super Mario Bros - Duck Hunt (U), Super Mario Bros 2 (U) (PRG 1), Super Mario Bros 3 (U) (PRG 1)
- **Not decoded: Collision** — 5 ROM(s): Castlevania 2 - Simon's Quest (U), Double Dragon (U), Super Mario Bros - Duck Hunt (U), Super Mario Bros 2 (U) (PRG 1), Super Mario Bros 3 (U) (PRG 1)
- **No native writer: Sprites / poses edits are refused at native build** — 2 ROM(s): Mike Tyson's Punch-Out!! (U) (PRG 1), Ninja Gaiden (U)
- **Project type does not publish per-asset writer ownership** — 2 ROM(s): Teenage Mutant Ninja Turtles (U), Zelda 2 - The Adventure of Link (U)
- **No native writer: Animations edits are refused at native build** — 1 ROM(s): Ninja Gaiden (U)
- **No native writer: Worlds / maps edits are refused at native build** — 1 ROM(s): Ninja Gaiden (U)

## Native writers per ROM

- **Battletoads (U)**: — · packs: capture 2, project 1, audioProject 1, audioReport 1
- **Castlevania 2 - Simon's Quest (U)**: — · packs: map 79, room 79, project 79, audioProject 55, audioReport 1, audit 1
- **Castlevania (U) (PRG 0)**: — · packs: audioProject 49, audioReport 1
- **Castlevania (U) (PRG 1)**: — · packs: audioProject 49, audioReport 1
- **Contra (U)**: Native source pages · packs: resource 126, collision 70, nativeProject 1, audit 2
- **Double Dragon (U)**: —
- **Final Fantasy (U)**: Native source pages · packs: resource 122, nativeProject 1
- **Gun Smoke (U)**: —
- **Mega Man 2 (U)**: — · packs: map 616, project 14, audioProject 67, audioReport 1
- **Mega Man (U)**: Native source pages · packs: resource 282, collision 282, nativeProject 1, audit 2
- **Metroid (U)**: Native source pages · packs: resource 193, collision 193, nativeProject 1, audioProject 36, audioReport 1, audit 1
- **Mike Tyson's Punch-Out!! (U) (PRG 1)**: Native source pages; Physical CHR and fight palettes; Glass Joe pose positions; Shared arena layout; Glass Joe recovery tools · packs: resource 5, nativeProject 1, audioProject 68, audioReport 1
- **Ninja Gaiden (U)**: — · packs: map 48, room 48, pose 202, catalog 4, project 48, animationProject 80, audioProject 66, audioReport 1
- **River City Ransom (U)**: Native source pages · packs: resource 36, nativeProject 1, audioProject 62, audioReport 1
- **Shadowgate (U)**: Native source pages · packs: resource 130, nativeProject 1, audioProject 34, audioReport 1
- **Super Mario Bros - Duck Hunt (U)**: — · packs: project 34, object 34, audit 1
- **Super Mario Bros 2 (U) (PRG 1)**: — · packs: project 114, object 114, audit 1
- **Super Mario Bros 3 (U) (PRG 1)**: — · packs: project 167, object 157, audit 1
- **Teenage Mutant Ninja Turtles (U)**: Area 1 native screen blocks
- **Zelda 2 - The Adventure of Link (U)**: Native location fields · packs: map 4, room 258, collision 258, pose 30, catalog 4, project 258, audioProject 60, audioReport 1, audit 1
