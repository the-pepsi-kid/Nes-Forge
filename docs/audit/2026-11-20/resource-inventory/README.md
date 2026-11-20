# Resource inventory audit — 2026-11-20

The owner asked whether any assets were deleted, dropped during import, truncated, hidden by navigation or
miscategorised between the previous editor and alpha.12. To answer it, every input below was opened in three editor
builds. Each used the same intake services as the buttons, through `tools/audit/resource_inventory.cjs`, and each run
recorded four things:
- what the gateway offers, and which pack entries pass validation;
- every record collection before and after loading, including the investigation catalogues;
- what the resource graph (Library / Resource Explorer) and the scene selector show;
- whether save/reopen returns the identical project.

The generated tables are in [COMPARE.md](COMPARE.md) and [compare.json](compare.json). They contain counts and reasons
only. The names of resources that differ were written to a private folder.

| Label | Build | Editor SHA-256 |
|---|---|---|
| prev | 2.0.0-alpha.11 · Integrated Review 5 + Sheet Music Review 3 (the owner's previous editor) | `92558257d419d404…` |
| alpha12 | 2.0.0-alpha.12 · Integrated Review 6 (published release) | `d2b86e0f478bf7d0…` |
| branch | `dev/alpha-13-studio-restore` (alpha.13 work, restored layout, Ninja Gaiden stages) | `9ce19fa0c6f6eb7b…` |

**Inputs:**
- 20 original ROM revisions: the corpus in [the capability audit](../../2026-11-19/AUDIT.md).
- 18 private extraction packs.
- Nothing from them is published.

## Findings

| Class | Result |
|---|---|
| Deleted, dropped at load, truncated, lost on save/reopen | **None**, in any editor and for any input. Every loaded project reopens as the identical JSON. |
| alpha.12 keeps fewer resources than the previous editor | **None.** Every collection, catalogue and resource-graph count is equal or larger. |
| The previous editor cannot open it | The three Super Mario Bros packs: its intake rejects the ZIPs. It also rejects 79 Castlevania II room entries that alpha.12 accepts. |
| Hidden by navigation (UI) | alpha.12's studio layout hid several entry points: Recovered content (the Punch-Out fights, poses and arena), the Resource Explorer button, the area library, native World, project investigation, the skins and the working-context ribbon. The data underneath was intact; for Punch-Out, all three editors keep the same 20 scenes, 14 poses and 183 resource-graph entries. Fixed on the branch (`5e0a4a5`); `QA/browser_review.py` now fails if they are hidden again. |
| Filed under another category | Teenage Mutant Ninja Turtles: 12 physical CHR tile sheets, whose room layout is unresolved, are listed as CHR rather than as scenes. This is by design, and the same in all three editors. |
| Pack-only: browsable only while the pack is open, never imported into a project | The same in all three editors. Battletoads: 2 captures. Castlevania II: 79 maps, 79 rooms. Contra: 126 resource pages, 70 collision. Final Fantasy: 122 resource pages. Mega Man 2: 616 maps. Mega Man: 282 resource pages, 282 collision. Metroid: 193 resource pages, 193 collision. Punch-Out PRG0 and PRG1: 5 resource pages each. Ninja Gaiden: 48 maps, 48 rooms, 202 poses, 4 catalogues. River City Ransom: 36 resource pages. Shadowgate: 130 resource pages. Zelda II: 4 maps, 258 rooms, 258 collision, 30 poses, 4 catalogues. Super Mario Bros 1 / 2 / 3: 34 / 114 / 157 object-placement files; their 34 / 114 / 167 projects do load. Once the pack is closed these are no longer reachable: the most likely source of "missing" assets. |
| Not merged | Sheet Music Review 3's audio work is not in alpha.12 or the branch: sheet music, the Ninja Gaiden audio codec and the native audio changes, 24 source files in all. It is a separate line built on Integrated Review 5. The audio catalogues themselves are identical (Ninja Gaiden: 85 cues, 23 instruments, 203 streams in every editor); the missing part is the sheet-music editor and its exports. |

## What the source catalogues hold today

| Game | Working project on ROM import | Source catalogue | Layout units available as stages |
|---|---|---|---|
| Ninja Gaiden (US) | 12 scenes (Area 0 pages) | 48 rooms in 22 areas, 44 actors, 202 poses, 83 animations, 48 spatial maps, 85 music cues | **21 stages, Act 1-1 to 6-5**, from the game's own table (PRG bank 0 $AF6E, read at $EB45). All 22 areas were confirmed in the emulator by `QA/ninja-stage-table.cjs`. |
| Zelda II (US) | 3 scenes, 1 world | 567 room slots in 9 world/table contexts, 252 locations, 324 actor records, 30 poses, 75 cues | 9 contexts: West/East Hyrule, Death Mountain, Maze Island, West/East towns, palace tables A/B, Great Palace. Individual palaces 1–6 need their location records decoded. |
| Punch-Out!! (US PRG1) | 20 scenes: 5 screen contexts, 14 fights, the arena; 14 poses | Recovered content: 14 fights, 546 full-pose slots, 32 CHR banks | 14 fights plus the arena |
| Contra, Mega Man, Metroid, Final Fantasy, River City Ransom, Shadowgate | Native resource project (pages in the resource graph) | Pack resource pages and collision (pack-only) | None decoded. Pages would be unassigned. |
| Castlevania (US PRG0/PRG1) | 1 scene | — | Stages and sub-areas are decoded only in the private slice tool, not yet in the editor |
| Castlevania II, Double Dragon, Super Mario Bros 2 and 3, Teenage Mutant Ninja Turtles | Physical CHR tile sheets (layout unresolved) | Super Mario Bros packs: object placements for 34 / 114 / 157 areas (pack-only) | Super Mario Bros: the pack's own area index. The others: none. |

## Reproduce

```sh
node tools/audit/resource_inventory.cjs --editors prev.html,alpha12.html,branch.html --labels prev,alpha12,branch \
     --inputs <ROM folder>,<pack folder> --out <folder> --jobs 3 [--names]
```
