NES Forge 2.0.0-alpha.11 — Movement Rules workshop

Open World_Base.nesforge.json or Single_Room_Base.nesforge.json with normal Open Project.
Expand Movement rules and choose Use current project. Choose a preset, intensity and seed, then Preview.
Review the four exact movement values before Apply. The changes use existing generated physics; the room art and collision data stay authored.
Build & Run to compare travel speed, jump height and fall speed. A jumps; Left/Right move; Start restarts. World examples also use Up at linked exit markers.
Keep uses the source movement values. Sprint changes move speed; High jump changes jump speed/gravity; Slow fall changes gravity/fall cap; Heavy fall changes gravity/fall cap; Seeded mix combines bounded choices.
A lock holds that field from the last verified preview, even when seed/preset/intensity changes. Unlock it to let later previews choose it again.
One Undo restores the project. Save Project As saves the editable result.

The High_Jump and Seeded_Mix files are complete editable projects and runnable generated ROMs.
To replay a .recipe.json, first open the matching unchanged *_Base.nesforge.json, choose Use current project, then Open saved movement recipe.
Recipes require their exact original project content. They do not include the source assets. Manifest.json binds all file hashes and canonical source identities.

These rules change only four existing physics settings of the active generated World or single-room runtime. They do not add friction, knockback, automatic death, health rules, timers, new actor templates or arbitrary-ROM recovery.
A changed jump or fall can make an existing route easier, harder or impossible. Technical validation does not establish level solvability.
The full manual remains separate. Browser/mobile controls and physical hardware still need owner testing.

Regenerate with: node tools/build_movement_examples.cjs
