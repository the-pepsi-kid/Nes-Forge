NES Forge 2.0.0-alpha.11 — Native map and collision examples

Open DABG_Static_Map.nesforge.json with normal Open Project, then Build & Run.
The source map contains a 14-metatile floor. The separate project includes an authored square test player and existing Forge movement. Original actors, game objectives, physics, audio and decoration are not recreated.
Open DABG_Static_Map_Floor_Opened.nesforge.json to see the canonical collision edit: the floor graphics remain, but their collision is Empty and the test player falls. Recovery evidence deliberately continues to describe the original source.
Both files are schema-12 projects; edit them and use Save Project As normally. The paired .nes files are actual generated Forge single-room ROMs.

To recover from the original ROM: open DABG-reproduced.nes for General Analysis, discover recovery methods, select the command-metatile map conversion, choose Find maps, select its eligible static resource, then Preview. Review and acknowledge the adaptation before Import as new scene.
Import appends an excluded scene without a player or new runtime settings. Download map project provides the separate playable adaptation. Evidence JSON is not a project file.
There are 22 referenced unique map resources; one fits this initial binary subset. Other native behaviors have explicit refusal reasons. This is a reusable structural format method, not a game-name/hash allowlist or universal recovery.
The original NES2/CHR-RAM cartridge remains byte-for-byte intact. General Analysis recognizes its valid NES2 header and NROM mapping, with runtime CHR-RAM contents unknown; the existing frontend emulator does not gain NES2 loading from this method.
The recovered image is raw command-map geometry with proven reset palette/CHR upload, before native random clouds/grass decoration and later updates.

Source and licensing: NES_Forge_A2_Native_Map_Input_Checkpoint.zip contains all original pinned source/assets, mixed upstream notices including GPL audio components, full GPL text, pinned offline toolchain source, exact builds and independent native CPU evidence. Input_Provenance.json records immutable pins. Original native audio code is not incorporated into the Forge application.
Manifest.json records actual source, project, ROM and current HTML hashes. Regenerate: node tools/build_native_map_examples.cjs
