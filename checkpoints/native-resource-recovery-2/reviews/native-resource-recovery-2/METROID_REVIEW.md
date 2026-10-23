# Metroid — focused verification checkpoint

The recovered starting HTML is preserved. The earlier Mega Man implementation is retained. Work in this checkpoint is bounded to Metroid; the remaining batch stays queued until owner review.

## What changed

Metroid (U), exact source SHA-256 `c5eea06e1e1128b576bd789f1a4f63bb154d6d31579c2f319382fb77a72d34a6`, now imports 193 source room slots across five areas, backed by 191 physical room records. Rooms display assembled backgrounds using native structures, initial area graphics, original tile placement and native palette attributes. These are source-table slots, not a reconstructed world itinerary.

The renderer retains blank tile 255, native structure-row offsets and clipping, and ordered attribute updates. A structure using the room's default palette leaves previous overlapping attribute bits intact. All 193 slots have source-backed initial background graphics; none use a raw CHR sheet as their room layout.

The Scene tab exposes **NATIVE ROOM STRUCTURES**. Replace an existing room object's structure while retaining that object's position, palette and place in the draw order. The recipe changes only the object's original structure-index byte. Source records shared by two room slots remain one owner. A replacement may change the visible footprint, collision behavior or accessibility through the native engine; the editor does not prove that the resulting room is playable.

The existing canonical Scene/ProjectStore/history/native-build workflow remains authoritative. No second editable stage store is introduced. Ordinary projects remain schema 12; portable native-resource projects remain schema 16. Readers without this adapter reject it rather than drop the recipe.

## Try this first

1. Open `NES_Forge.html` in a desktop browser. Choose **Open ROM / project**, select your original **Metroid (U).nes**, choose **Prepare recovered resources (partial)**, then **Import as new project**.
2. In **Area library → Investigated source**, choose an area and source room; open its recovered page in **Scene**. Inspect Brinstar, Norfair, Tourian, Kraid hideout and Ridley hideout separately.
3. In **NATIVE ROOM STRUCTURES**, choose an existing object. Its label shows the native 16-pixel X/Y position, current structure index and palette. Choose another native structure ID and click **Replace selected structure**. This control replaces a whole structure, not a single tile.
4. Confirm the visible change. Undo and Redo. Use **Save Project As**, reopen the saved project, then **Build & Run**. Also download the rebuilt ROM for an external emulator check.
5. Reimport the rebuilt ROM. Confirm the intended room edit remains. Verify the actual affected room in gameplay; opening the source page does not demonstrate a safe route to it.
6. Try an unsupported ordinary Scene/CHR edit. It must remain savable and block native output until undone. Native structure replacement is the supported edit for this checkpoint.

## Verification and limits

`Metroid_Verification.json` records five passing verification groups, including every original room's tile and attribute RAM against the original 6502 loaders, all five initial graphics/palette states, intake, Undo/Redo, save/reopen, rebuilding, reimport, aliases and rejection guards. The supported example edit changes one byte. The original 6502 loader also reproduces all rooms from that edited ROM.

`targeted-gate/Summary.json` records the focused compatibility run against the exact final HTML hash. The earlier full gate was intentionally stopped at 63 suites / 1,393 checks before Metroid integration. Those partial results are historical and do not certify this build. A fresh full release regression run is not claimed.

Real browser appearance, file downloads, controllers, mobile touch, listening and full gameplay traversal require owner/device acceptance. Background room recovery and structure substitution are partial support. World-map placement and travel, menus, actors, items, doors, collision-rule editing, animation, dynamic palette states, Audio and complete behavior recovery remain unfinished. No title in the 17-title batch is complete.

## Source and continuation

`Developer/Current_Source.zip` contains every current bundle input, the deterministic bundler, a standalone built HTML, focused tests and verification scripts. Extract it, run `python3 app/tools/bundle.py --check`, and run `node app/tests/native-metroid-resources.cjs`. Private native-loader verification additionally requires the owner's original ROM directory via `FORGE_CORPUS_DIR`.

The source archive is a current rebuildable snapshot; historical Git objects and the complete historical regression fixtures remain in the recovered full repository. `Developer/Recovery_2_Source.patch` is a supplementary patch against recovered baseline `7c66042c8dde8621f042581421a584bfd959e6ea`.

The original tutorial, documentation and earlier evidence remain included in the documented kit. Review Metroid first; do not start Lolo or another title until the owner selects the next project.
