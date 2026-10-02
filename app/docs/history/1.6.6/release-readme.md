# NES Forge 1.6.6 — Visual Workspace

Create games using the existing CHR SHEET, SCENE, METASPRITES, ANIM and ENTITY STUDIO tools. This revision removes the popup Workflow and its starter wizard. Gameplay settings now live in the SCENE sidebar; the regular project bar has New Project, Open Forge ROM and Gameplay controls.

The useful underlying improvements remain: bound character art and feet/body placement in SCENE, clean ROM reopening without duplicate assets, and undoable project replacement. The generated runtime is unchanged.

## Open the example in the regular editor

1. Open `mainline/NES_Forge_1.6.6_No_Code_Workflow.html`. The title reads **1.6.6 VISUAL WORKSPACE**.
2. Use **Open Project** to load `examples/Scout_Authored_in_Editor_1.6.6.nesforge.json`.
3. Inspect and change the room in SCENE, pixels in CHR SHEET, pieces in METASPRITES, frames/contact boxes in ANIM and actor bindings in ENTITY STUDIO.
4. Use **Gameplay** in the project bar to open the SCENE gameplay settings. Choose **Build & Play**, or use the existing **Build & Run** toolbar button.
5. Arrows move, **Z** jumps, **X** attacks and **Enter** restarts. Release jump/attack before pressing again.

Build & Run always builds the current project. If the project is still Untitled with the old default scenes, it will build those scenes. Opening the editor or adding a scene does not automatically load Scout.

## Author from a blank project

Use **New Project** to start with one blank fixed sideview room. Confirming replacement creates the room immediately; Undo can restore the previous workspace. No template or wizard is involved.

| Existing tool | What to create |
| --- | --- |
| CHR SHEET | Background and sprite tiles; choose a tile, palette and pixel color, then draw. |
| SCENE | Paint room tiles; place and move entities using their visible art. |
| COLLISION | Mark the floor tiles Solid; leave open space Empty. |
| METASPRITES | Assemble hardware-sprite pieces into character poses and set the feet origin. |
| ANIM | Create idle, walk and attack frames, choose their poses/durations, and edit hitboxes/hurtboxes. Turn Loop off for attack. |
| ENTITY STUDIO | Place a player and assign idle, walk and attack states. Optional jump; an optional target uses its default state and nonlooping hurt. |
| SCENE → Gameplay | Choose the playable room/player/optional target and movement/body values. Build & Play. |

The example's dimensions, tile numbers and timing are listed in `docs/SCOUT_REFERENCE.md`.

The selected player's outlined movement body is separate from animation contact boxes. Its X/Y is the center of its feet. Required player state names are `idle`, `walk` and `attack`. These are ordinary editor fields, not assembly code.

`examples/Native_Authoring_Evidence.json` records the automated construction through regular editor controls and its verification. The example-generation script is developer reproduction material; users do not run it to author games. The tests do not claim a manual browser session.

## Save and reopen

Use the existing **Save Project As…** / **Export…** controls for complete authoring backups. **Build .NES ROM** saves the current generated ROM. **Open Forge ROM** opens a supported Forge playable ROM as a clean editable project after confirmation. It avoids the default-room and duplicate-asset problems caused by append import, retains original ROM bytes and provides an undo step.

The older **Import ROM** control retains append/capture behavior. Other NES ROMs can be played, captured and inspected through optional disassembly; their original maps and game logic are not automatically reconstructed. The deeper experimental reverse-engineering branch remains separate in `re_branch/`.

## Current runtime scope

One fixed 256×240 sideview room, one moving/jumping player, Empty/Solid collision, bound animation playback and one optional stationary training target. A swing can register one hit; the target flashes and recovers. There is no target HP or defeat condition. Other authored entities and event markers remain data.

Scrolling, room transitions, moving enemies/platforms, health/win conditions, ladders, one-way platforms, hazards, slopes, music and custom event execution remain future work. Builds check NES sprite, palette, CHR and metadata limits. Assembly is optional; viewer/custom mode retains the existing assembler path.

Project schema remains v8 with foundation 1.6.6. Generated ROM formats, emulator/capture/CHR and Save As implementations are retained.

## Verify and reproduce

Run `npm test` or `node tests/run_all.cjs` with Node.js 20 or newer. No npm install is required. `test-results/Summary.json` records the full suite result and tested HTML SHA-256. The prior popup-specific UI tests have been replaced with native-workspace tests; prior model/runtime tests remain. The handoff's historical 344 checks were not supplied as runnable suites and are not claimed.

Tests execute the complete application with a mock DOM and the actual bundled NES emulator. They verify registered controls, saved data, ROM reconstruction and generated 6502 behavior. Browser layout, real pointer/focus mechanics, native file dialogs, IndexedDB recovery and independent hardware compatibility remain unverified. Standalone browser access was blocked; see `docs/BROWSER_QA.md`.

```
python3 work/assemble_release.py
node tests/run_all.cjs
node work/create_native_demo.cjs
python3 work/package_release.py
```

The assembler verifies the frozen 1.6.5 baseline and appends the four current source layers. The package script requires the final HTML to match passing tests and the native-authoring evidence.
