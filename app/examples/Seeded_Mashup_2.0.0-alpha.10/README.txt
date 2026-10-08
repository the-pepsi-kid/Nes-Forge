NES Forge 2.0.0-alpha.10 — Seeded Mashup workshop

Open Scout_Base.nesforge.json with the normal Open Project command.
In SCENE, expand Seeded mashup and choose Use current project.
Add Copper_Orchard_Donor.nesforge.json and Moonlit_Circuit_Donor.nesforge.json as donor files.
Try a seed, Preview mashup, lock the parts you like, and Shuffle unlocked.
For an explicit two-donor result choose Copper background/palettes and Moonlit sprite tiles/music.
Enable patrol speed variation and placement shuffle to vary the existing actors.
Apply is one Undo. Save Project As preserves the editable result; Build & Run runs the generated game.

The original base has one player, two patrols, two pickups, a music order and a sword_swing SFX.
Patrol/pickup slots are deliberately clear of collision. These are test arrangements, not a promise of level quality.
Copper uses orange/brown palettes and its own pulse/triangle melody. Moonlit uses blue palettes and a different melody.
CHR swaps retain tile indices; scene layouts, map geometry and collision semantics stay with the base.
A selected music donor replaces the music order, tempo and speed; existing SFX definitions stay and share that timing.

Mashup_FORGE-001 and Mashup_FORGE-002 are generated from all three source projects with random asset choices and enabled gameplay variations.
To open a saved recipe, reload the unchanged Scout Base, capture it again and add BOTH original donors before choosing Open saved mashup recipe.
A recipe requires the complete original source pool. It is not a portable project by itself.
Manifest.json records exact project/recipe/ROM file hashes and canonical project source identities.

All three inputs are explicit derivatives of the existing Scout authoring fixture; they are not independent ROM engines or automatic commercial-ROM recovery evidence.
The tool tools/build_mashup_examples.cjs deterministically regenerates these files using the bundled candidate.
Automated build/runtime evidence does not replace browser, listening, mobile, controller or physical NES review.
