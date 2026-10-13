NES Forge 2.0.0-alpha.11 — Native background examples

These are separate canonical static viewer adaptations from two independent native ROMs.
Open either *_Static_Background.nesforge.json with normal Open Project, then Build & Run.
Each project contains one editable background scene and builds the accompanying .nes file.
The scene uses ordinary CHR tiles, nametable indices, attribute bytes and NES palettes.
Edit these assets, Save Project As, reopen and rebuild through the normal editor workflow.
The *.recovery.json file records original source identity, bounded structural construction, known coverage, evidence and limitations. The same record is retained in the scene capture metadata.
Recovery evidence describes the original source. Later authored edits change the scene without rewriting that original evidence. It is not a recipe for patching the source ROM.

The application can also preview a supported original ROM in Recovery Methods and import the reviewed background into the current project. That import appends one scene, defaults it to excluded from the current build and creates one Undo entry.
These standalone examples deliberately include their sole scene in a generated viewer build. World runtime, audio runtime and generated gameplay remain disabled.

Pepsi uses the immediate PPU construction method. HonkeyPong uses the pointer/page nametable method.
HonkeyPong has a legacy header byte that strict General Analysis continues to treat as raw; its explicit structural method checks the permitted native layout without weakening General Analysis.
HonkeyPong writes 1023 nametable bytes. The unknown final attribute byte is an authored zero placeholder, disclosed in its evidence. Its native left-edge rendering mask is recorded; the static viewer uses ordinary viewer rendering defaults.
NES universal-background palette aliases are represented by the canonical editor palette rules. Unknown collision and game behavior are not inferred from graphics.
No sprites, collision, actors, links, native game engine, audio, animation or scrolling behavior are reconstructed by these static background conversions.

Manifest.json records the original and current application HTML hashes, each source-ROM hash, and actual project, ROM and recovery-file hashes.
Original source fixtures remain at the repository paths named in Manifest.json. HonkeyPong source/license provenance is retained in examples/RE_Native_Audio.
Automated integration executes the generated 6502 viewers and compares the full background pixels with independently decoded native geometry; this does not establish browser or physical NES acceptance.

Regenerate with: node tools/build_native_background_examples.cjs
