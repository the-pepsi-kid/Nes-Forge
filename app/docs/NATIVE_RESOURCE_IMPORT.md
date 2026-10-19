# Recovered resources as editable project assets

In **RE / DISASM → Open spatial RE workbench**, open the investigated Ninja Gaiden (USA) or Zelda II (USA) ROM. Select an available scene and a pose or timed Ninja script, then click **Prepare editable assets**. The preview lists every scene page, pose, clip and limitation before any project change.

Choose one action:

| Action | Result |
| --- | --- |
| Import into current project | Appends scenes, sprite art, poses and clips with new IDs. Existing assets, audio and project settings remain. One Undo removes the whole import; Redo restores it. |
| Download editable bundle | Saves `.nfassets.json` containing actual pixels, palettes, references, source receipts and native evidence. Reopen it using **Open editable resource bundle**; the original ROM is unnecessary. |
| Download standalone project | Saves `.nesforge.json`, which opens through the ordinary project controls as a separate editable workspace. Opening a project starts its normal new history. |

Edit imported art in CHR SHEET and SCENE, poses in METASPRITES, and recovered clip frames in ANIM. Save the ordinary project to preserve these changes and each page's source receipt. Retain the editable bundle for the complete original evidence; project saves do not embed its entire investigation catalog. The earlier **Export selected scene evidence** and **Export resource catalog** buttons remain evidence exports and are not editable bundles.

## What is transferred

- Initial background CHR pixels, four palettes and per-cell palette selection.
- The entire selected room's decoded content, split left to right into 256×240 scene pages. Content starts at Y=0, with blank padding; the original content origin (Ninja Y=64, Zelda Y=32), horizontal page offset and limits are recorded. Native HUD, scrolling, offscreen visibility and palette/raster changes are not recreated.
- Selected 8×16 sprite poses, including both physical CHR banks, native OAM Y+1, palettes, flips, piece ordering and behind-background flags. Repacking changes tile numbers while preserving their pixels and bindings.
- Selected Ninja animation frame order, native **effective update ticks** and explicit loop/stop ending. Nonplayer delay+1 is preserved. Of the 83 cataloged nonempty Ninja scripts, 80 have the required poses and an established sprite-table choice. Shared selectors 15 and 16 are partial because their intended sprite-table context is unresolved. Throwing-star and windmill selectors 13 and 14 use the native player pose table, as their original draw routine requires. Selector 89 references enemy pose selectors 135 and 138 whose native shape and attribute pointers are `$FFFF` (unassigned). It is labeled partial, with playback/import disabled and evidence export retained. Whether the script is reached at runtime remains unresolved. These are engine update ticks; state-dependent cadence and automatic return-to-idle behavior remain unresolved.
- Zelda Link display poses as reusable metasprites, with no invented animation timing.

Collision starts unassigned. Cell codes, native behavior flags, spawn records, actor parameters, connections and 6502 source annotations remain evidence, not automatically created entities, physics, AI or executable code. Timing does not establish hitboxes, movement or audio event bindings. Audio recovery and existing native transcription/import controls remain separate.

## Project and ROM capacity

The first imported page is included in the Scene Build Set and supplies the imported poses' sprite art. Further pages initially remain excluded. Check Build Scene Set before building. Existing mapper, atlas, metadata and seven-page viewer limits still apply; a large room is an editable resource collection, not an automatically reconstructed game. Metasprite source scenes must remain included for the existing packed ROM linker. Gameplay/world runtime settings are preserved, so imported art does not automatically become their starting room or player.

Projects allow 64 scenes and 256 metasprite frames; this importer also bounds animations to 256. Invalid pixels, missing references, incompatible palettes, atlas overflow, changed checksums, stale previews and insufficient project capacity are refused before mutation. No asset is silently truncated. A project edit after preview requires another preview.

The bundle checksum detects accidental payload changes; it is not a signature or proof that a user-edited file came from a particular ROM. Native recovery itself retains its exact revision checks. No source 6502 or uploaded JavaScript is executed by bundle import.
