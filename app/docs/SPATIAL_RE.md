# Spatial RE: scenes, collision and animation

The current candidate also adds the [Ninja Gaiden / Zelda II connected resource catalog](NINJA_ZELDA_RE.md), including original initial art, objects, actor parameters, more sprites/scripts and Zelda side-view construction. The original category-map controls described below remain available.

This checkpoint adds a read-only native-data workbench to the existing **RE / DISASM** tab. It reads the selected ROM in the browser. The standalone HTML works offline, and the commercial ROMs are not bundled.

## Start here

1. Open `NES_Forge.html` from the extracted review kit.
2. Select **RE / DISASM → Open spatial RE workbench**.
3. Use **Choose investigated ROM**, or **Use emulator ROM** after loading a ROM in EMULATOR.
4. Read the source title, SHA-256 and scope. Select a group/stage and native resource.
5. Switch between **Native categories** and **Map block IDs**. Click a cell for its class, physical PRG bank, CPU address and file offset.
6. For Ninja Gaiden, select a player action and use **Play script** or an individual pose button. Expand the sprite-piece list for coordinates and source bytes.
7. **Export selected evidence JSON** saves the selected map and animation, their source identity, source ranges and limitations. It does not save the entire ROM or replace your project.

Choosing a new file clears the previous result. A malformed replacement cannot leave an old report available. An unknown or modified revision displays an explicit unsupported result with no guessed maps or animations. The file workbench is independent of the emulator: loading a file here does not load or run the game. **Use emulator ROM** makes a detached copy of the loaded input; it does not follow subsequent emulator changes automatically.

## What this checkpoint recovers

| Source | Native structures available | Boundaries |
| --- | --- | --- |
| Mega Man 2 US | 256 block definitions per bank, 44 raw screen slots in each of eight physical banks, native 16-pixel collision classes, all 14 stage contexts | 616 context views reference 352 physical slots. Padding and reused slots remain visible. Reachability, screen order, scrolling transitions, graphics uploads, actors and native physics are not reconstructed. |
| Ninja Gaiden US | 48 native room layouts, 16-pixel ground kinds, contact-flag bytes, room width/entrance metadata; 13 Ryu action scripts with durations, poses, sprite pieces and attributes | Ground is directional and includes steps/exits; flags do not become a universal solid/empty grid. Enemy/boss scripts, hitboxes, behavior transitions and actor catalogs are not decoded. |
| Zelda II US | West Hyrule, Death Mountain, East Hyrule and Maze Island, each 64 × 75 terrain cells; compressed run addresses | Overworld terrain is not side-view collision or guaranteed movement permission. Items, quests, encounters and runtime terrain changes remain outside this decoder. |
| Castlevania II US | 79 layout-table entries across six environment types; screen arrangement, raw metatile tiles and native category thresholds | Raw categories precede fake/cleared-block substitution and other runtime changes. Stairs, actors, doors, quests, conditional collision and scene transitions remain unresolved. |

Support is tied to the complete source SHA-256, not the filename, mapper or resemblance to another game. Other revisions, translations, randomizers and hacks remain unknown until independently validated.

## Reading the map

**Native categories** colors each decoded collision, ground, terrain or raw-category cell. The legend shows native values, meaning where verified, and cell counts. These colors are illustrative, not original game graphics. Do not compare the same color across different engines as if it had a universal meaning.

**Map block IDs** shows the larger source blocks with an illustrative repeating color palette. At 16-pixel display zoom the block IDs are printed in hex. Colors in this view do not imply behavior. Zelda's terrain map has no separate decoded block layer, so it stays in category view.

**Cell size** changes display zoom, not the native cell dimensions. Wide rooms scroll within the map viewport. A shaded bottom strip in Mega Man 2 or Ninja Gaiden marks decoded data below the 240-line visible display; it is retained rather than silently cropped. Ninja Gaiden's map begins at native y=64, below its status area.

**Source addresses** distinguish physical PRG bank and file offset from CPU window addresses. A cell's definition byte may be reused by many source blocks. A block/source range and per-screen pointer list preserve the route back to layout data. Exported arrays use row-major display order; a block `storage` field records column-major source layouts where applicable.

Mega Man 2 classes 0 and 1 are background and solid. Classes 2 and 3 depend on stage context: ladders, spikes, water, ice, conveyors or background. The same physical screen can therefore have different meanings under different stage contexts. Slots in a context view are not proof that the game reaches them in that stage.

Ninja Gaiden retains the original 4-bit ground kind and the flag byte read by the game's contact code. Kinds at or above 10 enter the native exit-handling path. The workbench does not infer all movement rules from those bits or label every nonzero kind solid.

Castlevania category labels 1 and 3 remain numeric. The native category classifier is verified, but a tentative external label such as “probably breakable” is not promoted to a proven gameplay rule. Runtime substitution can change the tile that is actually classified.

## Reading the animation

The first 13 Ninja Gaiden player actions are Idle, Walk, Crouch, Sword, Crouching sword, Jump, Air sword, Spinning sword, Throw, Air throw, Wall hold, Knockback and Climb. These are descriptive labels for the native selector IDs.

The action script contains duration/pose pairs. A zero duration returns the player action to idle; a high-bit terminator restarts the script. The workbench preserves this distinction. Walk has three four-tick poses and restarts after 12 native animation updates.

**Play script** previews those durations at 60 update ticks per second. Original game-state logic can withhold updates, interrupt an action, restart it or choose another action. This is not a recovered gameplay state machine or a claim that every script plays uninterrupted in the original game.

The preview uses native 8 × 16 sprite pieces and their initial palette/flip attributes. The colors are an authored grayscale palette. **Sprite CHR bank (4 KiB)** explicitly chooses a source bank; bank 0 is the preview default. Actual rooms can map another bank and select different runtime color variants. Piece coordinates, tile IDs, attributes and source offsets remain visible in the expanded list. Native OAM Y storage is rendered one scanline below its stored coordinate.

Playback stops when the source changes, the page is hidden, the user leaves the RE tab or Pause is pressed. Returning to idle ends the preview; it does not silently append an invented animation transition.

## How this relates to the editor

The workbench produces evidence, not a playable conversion. It does not import native maps into SCENE or overwrite COLLISION, ANIM, actors or existing audio. Forge currently has a simpler collision representation than several of these engines. Converting ladders, hazards, directional contacts or conditional blocks into empty/solid without implementing their semantics would lose behavior.

The existing **EMULATOR capture** workflow still creates editable visual scenes from an observed frame, including source-backed graphics. Its collision placeholders are unknown evidence; they do not inherit the spatial workbench's native categories. An observed sprite pose alone does not establish an animation's timing, entity identity or collision box.

The next conversion milestone should connect validated native geometry and art to canonical scene staging, preserve unsupported behavior explicitly, and implement or reject each requested behavior rather than defaulting it to empty. Native actor catalogs, transitions and animation bindings require their own source checks.

## Unknown ROM workflow

Use the existing general analysis, source views, exact visual capture, runtime instruction coverage, RAM A/B comparisons, watches and reversible experiments. Compare one controlled action at a time. Source offsets and execution evidence can establish a new decoder; mapper IDs and visual similarity alone cannot.

This checkpoint does not include a bulk-ROM ZIP importer or automatic engine-family recognition. The workbench accepts one ROM at a time, with a 64 MiB per-file ceiling. Larger research collections can be inventoried, deduplicated and investigated in batches outside the app before verified methods are added.

## Verification and reproducibility

`reviews/spatial-re-1/verify-roms.cjs` accepts a directory containing the four private inputs. It executes the original, unpatched 6502 subroutines on a separate bounded MMC1 bus using the shared CPU implementation. It compares every Mega Man 2 collision cell, every decoded Ninja ground cell, all 13 player action sequences and their OAM pieces, all Zelda terrain runs, and Castlevania's raw category classifier. The resulting report contains counts, hashes and checks, not ROM/map/sprite payloads.

The automated candidate gate also preserves the previous 105 suites and 1,958 cases and adds spatial lifecycle and preservation checks. Browser verification uses the actual bundled HTML, native file chooser and download workflow. These checks do not establish physical NES timing, complete game behavior, native Windows extraction or every mobile device.

## Research references

The implementation is independently written against the supplied ROM bytes. Public disassemblies provided layout leads; original native code remains the verification oracle. No reference game's maps, program, sprite or audio payloads are embedded in the new source modules.

- [lsmmega/mm2](https://github.com/lsmmega/mm2/tree/94f0bf3150b9bc1032e41e0349c68c993887e73d): stage TSA/map sets, `home/tsa_collision.asm` and its callers. Assembled first 4 KiB of all eight stage banks match the supplied ROM exactly. The reference README's whole-ROM SHA-1 differs; that README hash is not used as source identity.
- [0xe1f/NinjaGaidenNES](https://github.com/0xe1f/NinjaGaidenNES/tree/32459fdf903679ce07bb372762291be3cf0d91b3): room tables and native ground/player-animation readers. Its declared SHA-1 matches the supplied revision. Reference comments/tools are Apache 2.0; the original game is Tecmo's work.
- [FiendsOfTheElements/z2disassembly](https://github.com/FiendsOfTheElements/z2disassembly/tree/c4c3a4c7d4156b41f54f726dc40644d45812ad29): overworld pointers, terrain labels, row decoder and original `$E001` token reader. The repository declares CC0 for its work.
- [FoxCunning/Castlevania2](https://github.com/FoxCunning/Castlevania2/tree/2abe12c2cbaff80fc929d5adfdfd1d7a655f29ec): labels and comments derived from Bisqwit's disassembly. This is a modified-game source, so labels/comments served as leads only. Table addresses and the category classifier were checked against the original supplied ROM; the hacked build was not used as an oracle.
