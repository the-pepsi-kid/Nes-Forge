# Native source pages: supported edits and independent workflows

This lesson covers the registered partial native page/layout adapters. The project-specific capability strip names the active adapter and its actual writers. A catalogued page is a view of a source record, not proof that the whole game, collision, actors, menus or Audio has been recovered. Use the exact supported revision; a filename does not identify it.

## Open, choose a page and make one encodable edit

1. Save your current work. **Open ROM / project** checks a chosen input without replacing the project. Review its capabilities and source SHA-256.
2. Choose **Prepare recovered resources (partial)** or **Prepare recovered layouts (partial)**, then **Import as new project**. This explicit action replaces the workspace and preserves the ROM, source catalog and native recipe. Save Project As includes those privately in your project file.
3. Open **Area library**, choose the source context, available room/table slot and page. Open a recovered page in Scene. Unavailable source slots remain unavailable; the 64 working Scene slots are not the size of the source game catalog.
4. In Scene, use **NATIVE SCREEN BLOCKS**. Choose an original block and column/row, then **Replace selected cell**. **Paint native blocks on Scene** routes canvas clicks through that same recipe. In **NATIVE ROOM STRUCTURES**, choose an existing object and replacement structure, then **Replace selected structure**. This does not add/move native objects.
5. Inspect the page and any shared uses. Undo and Redo. Open **Connected Workspace → Project Health → Check current ROM build** to run the actual encoder/compiler. Source allocation, protected cells, visibility and shared-record constraints can refuse an edit.
6. **Save Project As**, reopen in a fresh app and build again. Compare output bytes, reimport the exported ROM, and inspect the same source record. Finally reach it in the original engine and an independent emulator. Recorded checks do not replace your gameplay/listening/controller/hardware pass.

## Methods differ by title

| Installed adapter | Source and editing method | Boundary to inspect |
|---|---|---|
| Contra | Compressed 32×32 blocks and row-copy commands; explicit initial CHR-RAM loads | Alternate graphics contexts can refuse. A source record is not a universal scene or actor encoder. |
| Final Fantasy | Compressed 64×64 standard maps; existing 16×16 block substitutions | Normal/room palette views share map data; page edges can split blocks. This is not a native overworld writer. |
| Mega Man | Column-major room storage with shared pointer slots; existing 32×32 blocks | A 256-pixel room spans view boundaries. Initial graphics do not cover every transition. Mega Man 2 Audio is a different source/profile. |
| TMNT | Bounded Area 1 side-view screen table; existing 32×32 block substitutions | Other areas, object behavior and collision semantics need their own recovery. |
| Metroid | Ordered room objects and whole-structure substitutions | Positions/palettes and overlap effects remain native. Use its dedicated room and Audio lessons. |
| Adventures of Lolo | Bottom-up compressed terrain rows in CHR-backed storage | Only allowed interior cells/codes; actor/settings cells and per-room capacity are protected. |
| River City Ransom | Existing tile substitutions in a recovered street-background crop | Physical row bytes can be shared. Interiors/special screens have a separate unresolved path. |
| Shadowgate | Existing tile substitutions in a 112×112 picture crop | Objects, doors, alternate states and puzzle behavior are separate resources. |
| Punch-Out | Native PPU staging records plus dedicated arena, physical artwork and Glass Joe position writers | A staging page or pose-art copy is not the dedicated writer. Use the complete Punch-Out lesson for those controls. |

The table describes installed methods, not fresh whole-game acceptance for every title. Follow the current encoder message and source evidence. Unknown revisions retain independent analysis and preserved-source workflows; they do not inherit another title's writer.

## Graphics, Audio and other assets

CHR pixels, palette colors, palette IDs, Scene layout, Scene OAM, Metasprite pieces, collision properties and native recipes are distinct owners. A displayed buffer can be a protected reference copy. Check **Resources**, **Scene resources**, and **Native tools** before painting generic pixels. A supported block/structure substitution does not grant arbitrary pixel, palette, object, animation or runtime-rule writeback.

Audio is project-wide unless explicit source-event evidence exists. **ROM Audio Library** identifies a separate revision-bound catalog, offers supported isolated native audition, and can preview an editable finite tracker transcription. Import is a separate action. Unsupported profiles, PCM/DPCM or timing limits stay visible. Transcription into tracker assets does not provide native Audio writeback.

Project intake labels its last input separately from the current project source. A detached catalog is retained evidence with stale actions disabled. **Continue independent Audio inspection** explicitly reopens a retained ROM through the existing source loader without replacing your project or emulator. An independent source can be useful for another project; its hash/name and scope must stay visible.

## Independent RE, code and hex work

Keep the source ROM and native JSON backup. Use **RE / DISASM** to inspect physical offsets, declared CPU mappings and original bytes; disassembly candidates are not a complete source project. Export your annotations. A standalone **6502 Source Workspace** retains multi-file code and `.include`/`.incbin` data separately and builds only its declared Forge NROM profile; it does not translate arbitrary game engines.

To patch externally, work on a copy, identify the exact source revision, source bank/offset, command/compression rules and shared consumers, then compare the changed byte range. Reimport the derivative only through a method that explicitly recognizes it. Do not turn a wider recognition mask into write permission, flatten raster states, or overwrite a protected signature to force a build.

For application changes, locate `services/native-resource-project.js`, the title's `re/native-*-resources.js`, `services/native-layout-project.js`, `re/native-layout-ui.js`, ProjectStore and BuildGraph comments. Edit modular `app/src`, run the existing bundle/root synchronization commands, and regenerate the optional hosted output from the same source. An HTML-only experiment can search those module comments in a copied standalone file. Changing the application HTML is distinct from editing game assets.

The developer/asset guide explains these paths in full. Each expanded title still needs its own precise format, consumers, byte ownership, Audio and original-engine acceptance lesson as new methods are recovered.
