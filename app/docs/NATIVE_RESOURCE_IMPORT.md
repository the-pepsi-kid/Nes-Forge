# Recovered resources as editable project assets

In **RE / DISASM → Open spatial RE workbench**, open the investigated Ninja Gaiden (USA) or Zelda II (USA) ROM. Select an available scene and a pose or timed Ninja script, then click **Prepare editable assets**. The preview lists every scene page, pose, clip and limitation before any project change.

Choose one action:

| Action | Result |
| --- | --- |
| Import into current project | Appends scenes, metatile libraries, editable room worlds, sprite art, poses and clips with new IDs. Existing assets, audio and project settings remain. One Undo removes the whole import; Redo restores it. |
| Download editable bundle | Saves `.nfassets.json` containing actual pixels, palettes, references, source receipts and native evidence. Reopen it using **Open editable resource bundle**; the original ROM is unnecessary. |
| Download standalone project | Saves `.nesforge.json`, which opens through the ordinary project controls as a separate editable workspace. Opening a project starts its normal new history. |

Edit imported art in CHR SHEET and SCENE, room layouts in WORLD, poses in METASPRITES, and recovered clip frames in ANIM. Use **Open imported World** after import to jump to its first recovered map. Save the ordinary project to preserve these changes and each page's source receipt. Retain the editable bundle for the complete original evidence; project saves do not embed its entire investigation catalog. The earlier **Export selected scene evidence** and **Export resource catalog** buttons remain evidence exports and are not editable bundles.

## Room worlds and audio

New **NESForgeNativeAssets v2** bundles include editable World records. Every selected room page is placed left to right in a shared 16×16 metatile grid, with the original patterns and palette. The room rectangle marks adapted content geometry; padding stays unassigned. Identical art cells share a definition. Rooms exceeding 16 screens or 255 distinct visual metatiles split at page boundaries into labeled segments. This is the selected room, not an assembled overworld. Native exit conditions, spawn logic and links are retained in evidence, without invented runnable connections. The WORLD coverage panel states what remains incomplete.

Existing v1 bundles still open as scene/pose/clip imports. Prepare the room again from its source ROM to produce a v2 bundle containing World geometry. Older editors refuse v2 bundles. Ordinary projects remain schema 12 because worlds and metatiles already have canonical fields; no new authoring fields are silently added to World records.

For audio from the **same RE ROM**, choose **Recover / import audio** in the spatial workbench. This opens the Audio library without loading or replacing the live emulator ROM. Choose a native cue, set the finite update window and Music excerpt or Single-channel SFX, then **Preview editable score → Import into tracker**. Review conversion differences before importing. Patterns/instruments and supported SFX definitions become editable project data, survive Save Project As, and have a separate one-step Undo. Music replaces the music order and global tempo/speed; existing patterns/instruments and SFX definitions remain, but SFX timing follows the new tempo. SFX conversion requires one representable channel and one pattern. DPCM and short-mode noise are not transcribed. Native playback and catalog evidence remain available for those sources. A finite transcription does not recover the original full song, exact loop, driver or gameplay triggers. Switching the RE source invalidates the detached audio source; a changed project requires a new preview.

Audio remains its own preview/import transaction. It is not embedded in the spatial `.nfassets.json` bundle; save the ordinary project after importing both to keep the worlds and audio together.

## What is transferred

- Initial background CHR pixels, four palettes and per-cell palette selection.
- The entire selected room's decoded content, split left to right into 256×240 scene pages. Content starts at Y=0, with blank padding; the original content origin (Ninja Y=64, Zelda Y=32), horizontal page offset and limits are recorded. Native HUD, scrolling, offscreen visibility and palette/raster changes are not recreated.
- Selected 8×16 sprite poses, including both physical CHR banks, native OAM Y+1, palettes, flips, piece ordering and behind-background flags. Repacking changes tile numbers while preserving their pixels and bindings.
- Selected Ninja animation frame order, native **effective update ticks** and explicit loop/stop ending. Nonplayer delay+1 is preserved. Of the 83 cataloged nonempty Ninja scripts, 80 have the required poses and an established sprite-table choice. Shared selectors 15 and 16 are partial because their intended sprite-table context is unresolved. Throwing-star and windmill selectors 13 and 14 use the native player pose table, as their original draw routine requires. Selector 89 references enemy pose selectors 135 and 138 whose native shape and attribute pointers are `$FFFF` (unassigned). It is labeled partial, with playback/import disabled and evidence export retained. Whether the script is reached at runtime remains unresolved. These are engine update ticks; state-dependent cadence and automatic return-to-idle behavior remain unresolved.
- Zelda Link display poses as reusable metasprites, with no invented animation timing.

Collision starts unassigned. Cell codes, native behavior flags, spawn records, actor parameters, connections and 6502 source annotations remain evidence, not automatically created entities, physics, AI or executable code. Timing does not establish hitboxes, movement or audio event bindings. Audio recovery and existing native transcription/import controls remain separate.

## Project and ROM capacity

World authoring does not bypass the existing ROM linker. Viewer exports require every world-used metatile to appear at least once in its tileset scene and that source scene to be included. Recovered rooms can use definitions found only on later pages, so an imported room may require additional authoring before ROM export. JSON projects and v2 resource bundles preserve the complete editable geometry independently of those ROM limits.

The first imported page is included in the Scene Build Set and supplies the imported poses' sprite art. Further pages initially remain excluded. Check Build Scene Set before building. Existing mapper, atlas, metadata and seven-page viewer limits still apply; a large room is an editable resource collection, not an automatically reconstructed game. Metasprite source scenes must remain included for the existing packed ROM linker. Gameplay/world runtime settings are preserved, so imported art does not automatically become their starting room or player.

Projects allow 64 scenes and 256 metasprite frames; this importer also bounds animations to 256. Invalid pixels, missing references, incompatible palettes, atlas overflow, changed checksums, stale previews and insufficient project capacity are refused before mutation. No asset is silently truncated. A project edit after preview requires another preview.

The bundle checksum detects accidental payload changes; it is not a signature or proof that a user-edited file came from a particular ROM. Native recovery itself retains its exact revision checks. No source 6502 or uploaded JavaScript is executed by bundle import.
