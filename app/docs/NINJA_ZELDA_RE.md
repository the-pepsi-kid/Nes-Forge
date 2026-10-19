# Ninja Gaiden and Zelda II: connected native resources

This standalone, offline checkpoint adds a connected native resource catalog inside **RE / DISASM → Open spatial RE workbench**. Choose the investigated ROM once; the catalog appears above the earlier category-map controls. No Windows extraction tools, scripts or separate decoder installation are needed to use it.

This is source investigation and evidence export. It does not import a playable game, replace your authoring project or run the live emulator. Original behavior still needs further recovery.

## Quick verification

1. Extract the review kit to a short path such as `C:\NF\Ninja_Zelda_RE`. Open `START_HERE.html`, then **Open NES Forge**.
2. Select **RE / DISASM**, then **Open spatial RE workbench**. Choose `Ninja Gaiden (USA).nes` or `Zelda 2 - The Adventure of Link (U).nes`. The complete source hash authorizes the decoder, not the filename.
3. In **Scenes & objects**, select a native context and scene. **Original initial art** shows the decoded background. **Native ground / tile codes** shows the underlying categories/codes. Zoom does not alter the native data. Wide maps scroll inside the preview.
4. Click a cell to see its native value and physical source. For Zelda II, the output includes the original writer instruction, native RAM address and current command pointer/offset. These are breadcrumbs, not a complete data-flow proof.
5. Enable **Show spawn triggers**. `E` marks an enemy record and `L` a Ninja lantern trigger. Ninja markers show the trigger column; direction-dependent screen entry is retained separately. A marker is not a simulated enemy.
6. Expand **Objects, connections, native execution and limits**. Read raw commands, entrance bytes, object records, source ranges and native execution counts.
7. Open **Actors & parameters** for native health/damage/experience codes and dispatch entries. Zero and other packed codes retain their original meaning; they are not normalized HP values or translated AI.
8. Open **Scripts & poses**. Ninja's timed scripts include player, enemy and projectile readers. Zelda II provides Link pose/facing samples; its timing is not established by these display samples. The selected scene supplies initial CHR/palette context.
9. Open **CHR patterns** to inspect any of the 32 physical 4 KiB banks. The sheet uses authored grayscale. Scene previews use their stated native initial palettes instead.
10. Open **6502 & RAM** and search for a routine, table, actor or scene label. Code labels use the existing bounded physical disassembler; data labels show bytes. The reference filename/line and bank/CPU/file address stay visible. RAM names are contextual research leads; use runtime watches for actual writer evidence.
11. Read **Coverage & gaps** before exporting. **Export selected scene evidence** contains constructed geometry, art references and per-cell evidence for that selection. **Export resource catalog** contains the complete decoded tables, poses, scripts, annotations and limitations, without constructing every scene's geometry into one huge document.

Choosing another file or a malformed replacement clears the old native session and disables stale exports. The existing **Use emulator ROM** action copies the current input without advancing or replacing the running game. A changed revision produces no guessed native catalog. Unknown-ROM runtime investigation remains available.

## Exact coverage

| Domain | Ninja Gaiden US | Zelda II US |
| --- | --- | --- |
| Scene catalog | 48 rooms across 22 area contexts | Nine table/world contexts × 63 slots = 567 views; 561 have normal headers and six are explicitly unavailable |
| Geometry | Existing 37,056 native ground cells and contact-flag bytes | 400,192 constructed 16-pixel cells across the available context views |
| Original initial art | Native 32/16/8-pixel hierarchy, room/area palettes, CHR mapping | Native tile-code/TSA hierarchy, palette preparation and stated region/world/palace CHR context |
| Object records | 423 enemy records, 281 lantern records, forward/back entrance bytes, area-start cue/time codes | 9,769 object command records, 1,799 initial enemy records, four page-indexed connection entries per slot, 252 raw overworld location records |
| Actor tables | 44 selectors, including unused selectors, native parameter codes and bounded state dispatch leads | 324 context entries across nine sets, native health/attribute/damage/experience codes and initialization/update entries |
| Sprite poses | 202 player/enemy initial poses, 977 OAM pieces | 15 Link selectors × two facings = 30 executed display samples, 142 OAM pieces |
| Timed scripts | 83 nonempty streams, 226 duration/pose pairs; all 128 selector slots retain decoded/empty/unassigned status | No complete timed-script decoder; display samples do not establish animation timing |
| Physical graphics | 32 banks × 256 native CHR patterns | 32 banks × 256 native CHR patterns |
| Source annotations | 1,992 labels and contextual RAM names | 1,712 labels and contextual RAM names |
| Audio | Existing Audio tab: 85 cue selectors and native audition | Existing Audio tab: 75 cue selectors and native audition |

These are **table/context views**, not counts of unique, reachable, complete playable scenes. Shared streams and unused entries remain visible. West/east town contexts share tables but can use different constructors. Palace type A/B tables use the stated initial region/palace variant; the default palette does not prove that every slot belongs to that palace. Zelda's Candle flag is initially unset, so cave darkness can be intentional.

Ninja's twelve 16-pixel room rows begin at native Y=64 and extend to Y=255. The bottom 16 pixels are retained native definitions outside the 240-line visible screen. Native column-output comparisons cover the visible 176 pixels; they do not mislabel those final definition rows as displayed pixels. Zelda's 13 rows begin at native Y=32.

## Interpreting evidence

- **Decoded native tables** means bytes and their investigated format were read from this exact source. It does not mean the game reaches every entry.
- **Executed original construction/display** means bounded unmodified 6502 routines produced the output on detached RAM and a separate bus. It does not establish hardware timing or all game state combinations.
- **Source annotation** means a label/address from pinned public research. Address checks do not certify every label's meaning. Tentative labels remain tentative.
- **Unknown/incomplete behavior** stays explicit. Ground kind, tile code, palette group, collision response and combat hitbox are separate things.

Ninja player animation delays and nonplayer delays are not interchangeable. The player reader advances when its decrement reaches zero; enemy/projectile readers decrement and return, advancing on the following update. The catalog retains raw `duration` and effective `updateTicks`. Script preview uses the effective ticks. State logic can still interrupt, restart or withhold updates.

Zelda geometry runs the original bank/palette preparation and original fill, background-template, floor/ceiling, layer and object constructors with a bounded fresh state. A separate original initialization path is used by private verification. The optional runtime encounter variants, collected-item effects, town/NPC contexts and quest changes are not fully enumerated by the initial enemy lists.

## Zelda II playback correction

The title screen writes a new PPU address during visible rendering. Previously the frame runner retained the start-of-frame vertical scroll/nametable for all 240 lines, causing corrupted ground and tree graphics. A visible second `$2006` write now updates the vertical origin for subsequent scanlines. Runtime capture receives the same corrected coordinates.

This is a targeted scanline-renderer correction. CPU instruction code, APU, native audio drivers, compiler/runtime emitters, capture implementation and project schema are unchanged. It does not make PPU/mapper timing cycle-accurate or establish complete Zelda II compatibility. The owner's supplied title-screen case is checked at frame 835.

## What is still missing

Neither game is completely reverse engineered into a Forge project. Full player movement/physics, AI/state transitions, directional/conditional collision response, hitboxes/hurtboxes, full scene/checkpoint conditions, item/quest state, all dialogue/cutscenes, and event-to-audio links remain incomplete. Zelda enemy animation and Link animation timing need further work. Native scene import and playable conversion are not included in this checkpoint.

More ROMs are useful for method reuse, but are not a prerequisite to continue those remaining tasks on these two games. Exact source guards must not be weakened to claim generalized recognition.

## Reproduction and references

The review reports record measured checks against one identified application hash. `reviews/ninja-zelda-re-1/verify-roms.cjs` accepts a directory containing the private inputs and runs unmodified original routines on a separate bounded bus, using the shared CPU instruction implementation. No ROM, assembled reference ROM, decoded map/sprite payload or PCM is bundled.

The source index contains labels and addresses only. Ninja's pinned reference assembled byte-exact against the supplied complete ROM. Zelda's address comments were checked against the supplied bytes; two mismatched annotation lines were excluded from that address validation. Labels are still research annotations.

- [NinjaGaidenNES reference](https://github.com/0xe1f/NinjaGaidenNES/tree/32459fdf903679ce07bb372762291be3cf0d91b3), annotations by Akop Karapetyan under Apache 2.0. The original game is Tecmo's work.
- [Zelda II disassembly reference](https://github.com/FiendsOfTheElements/z2disassembly/tree/c4c3a4c7d4156b41f54f726dc40644d45812ad29), originally Trax's disassembly, maintained by FiendsOfTheElements under CC0. The original game is Nintendo's work.
- [Earlier spatial workbench guide](SPATIAL_RE.md) for the retained Mega Man 2, Castlevania II and original category-map controls.

Source labels are the only research annotations included in the new index. Format readers, bounded execution, resource records, UI and verification integration are NES Forge implementation work. See the retained research-license notice.
