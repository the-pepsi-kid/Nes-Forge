# Adventures of Lolo — room recovery review

This checkpoint adds the supplied US revision of Adventures of Lolo to the existing native room workflow. It recovers all 50 source rooms as assembled initial backgrounds, with their original tile placement, left-edge shadows, source HUD strip, background graphics and normal/lava palettes. It does not mark the title fully recovered.

## Try this first

1. Extract the short `NF3.zip` archive to a short folder, such as `C:\NF3`. Open `NF\START_HERE.html`, then NES Forge.
2. Choose **Open ROM / project**, select the original **Adventures of Lolo (U) [!].nes**, choose **Prepare recovered resources (partial)**, then **Import as new project**.
3. Open **Area library → Investigated source**. Select a room and choose **Open selected recovered page**. Groups such as “Room catalog 1–5” organize source slots; they do not claim a reconstructed world graph.
4. In **Scene → NATIVE SCREEN BLOCKS**, select Floor, Boulder, Bush, Lava, Grass, Sand, Heart or Heart with eggs. Replace an existing terrain/heart cell in the 11×11 interior. The canvas brush and column/row controls share the native edit transaction. Row and column values cover the full source screen; border and marker cells refuse edits.
5. Undo and Redo, then **Save Project As**. Close and reopen the saved project. **Build & Run** or download the rebuilt ROM. Reimport it and confirm the edit. Check the affected room in actual gameplay or an external emulator.
6. Open another room, then return. The earlier recipe must remain. The complete 50-room source catalog remains available; only requested pages become working Scenes.

Room 1 has a simple reversible test: replace the boulder at source column 2, row 2 with Floor. Coordinates here are zero-based. If the scene is scaled, use the column and row controls to confirm the cell.

## Native edit boundary

Only substitutions among those eight terrain/heart codes are encoded, and only at positions that were already terrain/heart cells inside the original playfield. Player starts, enemy spawns, chests, borders and the bottom room-setting records stay unchanged. Moving sprites and their editable actor/animation assets are not imported by this background adapter.

Lolo stores compressed rooms inside CHR ROM. The preserved ROM has one source owner and one native recipe; this workflow does not also create independent editable “graphics sheets” from the room-data bytes. Generic unknown ROM projects still enforce their existing physical CHR ownership checks.

The encoder recompresses an edited room into its **original allocated stream**. It preserves pointers, bank selectors, length bytes, untouched padding, other rooms, program code and artwork. It never adopts the external lead editor’s relocation arithmetic. An edit that needs more bytes than its allocation is rejected before changing the project or source. Undo or simplify the edit to fit. An untouched project rebuilds byte for byte.

These edits can change the puzzle's difficulty or solvability. The editor preserves the native engine; it does not prove that a modified puzzle can be completed. Unsupported ordinary CHR, palette, actor or tracker edits remain savable and block native output until undone.

## Evidence and remaining scope

`Lolo_Verification.json` records original CPU/PPU comparisons for all 50 stream transfers, 12,000 decoded cells, all initial background tiles/attributes, CHR and palette selection. It also records one bounded rebuilt edit in every room, plus intake, source ownership, the native brush, Undo/Redo, save/reopen, distant-room navigation, reimport and rejection by the pre-Lolo reader.

`Public_Tests.json` covers independent compression fixtures, native row orientation, padding, fixed capacity, locked markers, unknown inputs and retained generic CHR validation. `gate/Summary.json` records focused compatibility checks against the final HTML hash. No complete release regression is claimed.

Browser layout, physical controllers, mobile touch and whole-game traversal remain owner acceptance checks. This environment has no Chromium executable, so no new real-browser checks are counted. Menus, moving sprites/poses, actor behavior editing, animated tiles, live HUD counters, world travel, Audio and native audio writing remain unfinished for Lolo.

The supported source is SHA-256 `914c676959612fc6738a297b6b799dff848e43de4e9bd3c9f3c6783efd059e01`, 65,552 bytes. Recognition also accepts the bounded derivatives produced by this writer, provided every protected byte remains exact. Other revisions and unrelated hacks are not silently identified as this engine.

Ordinary projects remain schema 12 and the reader ceiling remains 16. Older builds reject the new native adapter before committing a project. Existing Metroid, Mega Man and earlier native workflows remain retained. Lolo is the only new title in this checkpoint.

## Reproduction

The kit includes a deterministic current-source snapshot. Extract `Developer/Current_Source.zip`, run `python3 app/tools/bundle.py --check`, then `node app/tests/native-lolo-resources.cjs`. Supplied-input comparisons additionally require the owner's original ROM. The exact pre-Lolo reader is included as a pinned compatibility fixture:

`node reviews/lolo-recovery-1/verify_lolo.cjs /path/to/Lolo.nes /path/to/report.json`

The format lead is jadowdl/lolo_level_tool at `ad04f04e51e0ea965abb5bfa978b860795f76ffc`. Native anchors in the supplied bytes are BA18 (CHR/PPU transfer), B44A (decompression), B656 (initial object setup), B597 (background assembly), B94E (palette state), BB22–BEE2 (native tile tables) and 9A70/9A90 (palettes). The implementation and comparisons are independent. No ROM, recovered room payload, music, CHR or screenshots are included in the source checkpoint.
