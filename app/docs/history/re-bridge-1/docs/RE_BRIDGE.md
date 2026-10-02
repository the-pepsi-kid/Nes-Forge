# Integrated RE example — Native Room v1

This alpha slice takes a supported, independently authored NES ROM through **analysis → editable Forge project → edit → build → play** inside NES Forge. Candidate: **1.9.0 Alpha / `re-bridge-1`**, schema **12**. The supplied example is `examples/RE_Bridge_Room/Bridge_Room.nes`.

## What this example proves

The input has its own 6502 machine code, native room/collision tables and simple Pulse 1 driver. It contains no embedded Forge project JSON. The bridge recognizes its engine fingerprint and reads its native binary structures. It does not read an existing Forge project back out of the ROM.

| Recovered content | Editable destination | Limit |
| --- | --- | --- |
| Background and sprite CHR | CHR / sprite bank | 256 tiles in each bank; static NROM |
| Nametable, attributes and palettes | SCENE / palettes | One fixed 256×240 room |
| 960 collision cells | COLLISION; metatile overrides when necessary | Only decoded Empty (0) and Solid (1) |
| Player art and spawn | Scene entity / animation bindings | Converted to the existing Forge sideview player |
| Sixteen pulse timer rows | AUDIO tracker and instrument | Pulse 1, constant duty/volume, 12 frames per row in this fixture |
| Original ROM bytes | Run Original ROM / native project backup | Preserved separately from generated builds |

The original game only supports left/right movement. Forge's rebuilt version adds its existing jump and attack animation states. The attack has no damage hitboxes or sound. Reserved fixture configuration bytes supply the adapted jump/gravity/fall settings; they do not establish original-engine behavior. The source fixture has no SFX, so this slice does not recover SFX.

This is one format-specific recovery profile, not arbitrary commercial-game reconstruction. Different engines, compressed maps, extra rooms, other sound drivers, NESmaker projects, ASM scripts and Lua APIs are unsupported by this bridge. A recovered graphics tile does not by itself reveal collision or game logic. Rebuilds use Forge runtime code and are not byte-identical recreations of the input ROM.

## First walkthrough

The steps below use the ordinary editor and are easiest to review on desktop with a keyboard. They are a requested acceptance walkthrough, not a claim that real-browser testing has already passed. Save any project you want to retain before trying a new example. Import also supports Undo.

1. Open `mainline/NES_Forge_1.9.0_Gameplay_Core.html`. In **EMULATOR**, use **Load ROM** to load `Bridge_Room.nes`, then press **Run**. Observe the room, horizontal player movement, wall blocking and melody. Stop playback after looking at the original.
2. Open **RE / DISASM**. Find **RECOVER EDITABLE PROJECT**, use **Choose ROM** to select the same file, then press **Analyze ROM**. Choosing a file alone does not replace the project.
3. Review the room preview, raw background CHR, counts and limitations. **Show recovered solid collision** overlays the actual decoded solid cells in pink. The source SHA-256 identifies the exact inspected ROM. Analysis remains separate from the active editor project.
4. Press **Import as new project**. Forge opens the recovered room in **SCENE**. **CHR**, **COLLISION**, **METATILES**, **ANIM** and **AUDIO** contain ordinary authoring data. Alternatively, use **Download Forge project JSON** and open that file through the regular project opener. The inspection report is not that project file.
5. Use the existing **Build & Run** action. Move right toward the wall and confirm it blocks the player. Left/right work in both engines; jump and attack animation controls belong to the adapted Forge build. For comparison, **Run Original ROM** always uses the preserved input bytes.
6. Stop the emulator and open **COLLISION**. Under **Active Property**, choose **0 - Empty (passable)**, then click a visible wall tile in the scene to assign that property to its tile index. Rebuild and verify that the player can pass through the wall. This changes every placement of that tile. Undo the collision edit, rebuild and verify blocking returns. Stay with properties 0 and 1: the current single-room compiler rejects Platform/Ladder/Hazard and other unimplemented values.
7. Open **CHR SHEET**, choose the background bank and a visible wall tile, change one pixel, and rebuild. Confirm the wall art changes. Changing pixel art preserves the separate collision property; changing which tile is placed can change the applicable collision. Undo the art edit if you want the original appearance back.
8. Open **AUDIO**. Select a row in the **Pulse 1** column, then press a note-entry key such as **Z** to replace that row's note. Keep the recovered instrument selected. Rebuild and listen for the changed note. Tracker preview is separate from generated-ROM playback, so verify with **Build & Run** as well. The current environment's automated tests inspect APU output; actual speaker output still needs your browser observation.
9. Use **Save Project As** to save native project JSON. Open that saved project and rebuild. Confirm room art, collision, music and **Run Original ROM** remain available. Downloaded inspection evidence cannot substitute for this authoring backup.

If the wall and floor use different tile IDs, editing the wall leaves the floor alone. If you select a tile shared by several parts of the room, its property applies to all those placements. Use Undo to restore the prior state before continuing.

## Collision editing and per-cell differences

For the supplied base fixture, collision is consistent per graphical tile, so the bridge uses the normal **COLLISION** tile-property workflow. It also supplies recovered metatile definitions as reusable assets without unnecessarily linking every cell.

A supported data variant may reuse one CHR tile with different collision at different placements. The bridge then links only the necessary 16×16 cells to metatile definitions whose four collision quadrants preserve the decoded values. The evidence report identifies `collisionMode` and `linkedCollisionCells`; those counts describe 16×16 override cells. Editing a raw tile property cannot override a linked metatile's quadrants.

For an overridden cell, use **METATILES** and its **COLLISION QUADRANTS** controls. On desktop, right-click the cell to select its linked definition; the library/Brush selector provides another selection route. Edit TL/TR/BL/BR or choose a value and **Set all 4**. Every placement linked to that definition shares the edit. Keep values at Empty or Solid for this backend. Do not regenerate/relink the library to prove recovery: the imported canonical data already carries the native collision values.

## Project JSON and evidence JSON

| Action | Result | Use |
| --- | --- | --- |
| Import as new project | Undoable replacement with native Forge data | Edit/build immediately |
| Download Forge project JSON | `NESForge`, schema 12 | Normal project opening, editing and backup |
| Download inspection report | `NESForgeRERecovery`, version 1 | Review source identity, decoded spans/counts and limitations |
| Save Project As after editing | Current native Forge project | Retain subsequent changes and original-ROM backup |

Older separate inspector reports use `NESForgeREInspection` (or `NESForgeREPreviewEvidence`). They also describe evidence rather than scenes. The regular project loader now recognizes these report formats and explains the distinction instead of reporting only “expected 1–64 scenes.” Invalid report imports do not change the current project.

## Supported input contract

The profile requires standard iNES mapper 0, 32 KiB PRG, 8 KiB CHR, horizontal mirroring, no trainer/header extensions, exact declared length, and recognized engine code/vectors. Data variations are accepted only within the documented native structures and current canonical capability. Invalid collision, unsupported palette aliases, unsupported envelope/sweep settings, ambiguous pulse periods and invalid player configurations reject before transfer.

The bridge copies bytes before hashing; changing the caller's buffer cannot alter the inspected snapshot. Evidence includes source SHA-256, engine identity, file offsets and applicable CPU addresses for the native data spans. No background analysis commits to the editor. Import performs detached validation again and calls the existing undoable project-replacement service. The current project schema and compiler remain unchanged.

## Verification and remaining acceptance

Run the complete candidate gate from a clean extraction:

```sh
python3 tools/bundle.py --check
node tests/run_all.cjs
```

The 28 retained suites remain mandatory. Four additional records in `test-results/candidate/` cover this slice:

- `re-bridge-model.json`: supported native decoding, rejection boundaries, copied evidence/project isolation and canonical transfer.
- `re-bridge-ui.json`: Analyze/import/export handlers, state guards and separation from the editor.
- `re-bridge-runtime.json`: original ROM and adapted rebuild execution, collision/art/music edits and native-project reload.
- `re-report-import.json`: actionable inspection-report rejection and atomic project state.

Read `Summary.json`, each actual report, `build-inputs.json` and `checkpoints/re-bridge-1-clean-extraction/Reproduction.json` for measured results and exact identity. A file's existence alone does not establish a pass. The historical mobile-play-2 result was 708/708 and does not certify this candidate.

Browser walkthrough remains pending because the current Chromium executable is unavailable. Mock-DOM and bundled-emulator tests do not establish visual layout, native file pickers, speakers, physical controllers, mobile performance or independent NES hardware behavior. Record those observations using `docs/BROWSER_QA.md`. General RE support and release promotion remain separate decisions.
