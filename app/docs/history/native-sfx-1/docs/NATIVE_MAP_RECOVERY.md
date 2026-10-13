# Native map and collision recovery

The command-metatile method recovers source-backed native map records and converts a declared static Empty/Solid subset into an editable scene. It uses the same recovery registry, guarded scene import and compiler as the existing background workflow. Schema 12 and existing runtime emitters remain unchanged.

## Try the included example

Open `examples/RE_Native_Map/DABG_Static_Map.nesforge.json` with **Open Project**, then **Build & Run**. The floor is recovered native geometry. The square player, animation bindings and movement settings are authored validation aids using Forge's existing single-room runtime.

Open `DABG_Static_Map_Floor_Opened.nesforge.json` to see the collision edit. Its floor graphics remain, but the four floor tile types have Empty collision and the player falls. The evidence still describes the original source; it does not authenticate later authored edits. Use normal Save Project As to preserve changes.

## Recover a map from the original input

1. Open `DABG-reproduced.nes` for **General Analysis**. Existing analysis recognizes its valid NES 2.0 header and NROM mapping while leaving runtime CHR-RAM contents unknown. The declared recovery method separately verifies its precise layout and graphics construction. This feature does not enable original-ROM frontend playback.
2. Discover recovery methods and open the command-metatile map conversion. In the shared native scene panel, choose **Find maps**.
3. Select the eligible static map, then **Preview map**. Review its geometry, collision summary, source ranges and adaptation notes. Preview compiles the separate playable project without changing the active project or emulator.
4. Acknowledge the displayed limitations and choose **Import as new scene**. This appends an editable scene excluded from the current build, preserving existing scenes and runtime settings. One Undo removes the import; Redo restores it.
5. **Download map project** saves the separate playable adaptation with its authored test player. **Download map evidence** saves provenance JSON. Evidence is not an editable project.

Changing the source, selected method/resource or current project invalidates an earlier import preview. Cancellation, unsupported input and failed validation do not import anything. A duplicate resource is refused rather than appended again.

## Declared supported subset

The pinned independent Double Action Blaster Guys input has 52 level configuration records. Thirty-nine reference 22 unique command maps; thirteen use procedural generation. Source research also found three unreferenced map definitions, which production discovery does not guess from nearby bytes. Of the 22 referenced resources, one fits the initial static Empty/Solid conversion subset. The others retain explicit refusal reasons.

The method follows coherent native configuration pointers, command dispatch, zero-initialization and collision lookups. It does not recognize filenames or use a whole-ROM hash allowlist. Valid data and relocation variants are tested. This establishes one declared native representation, not arbitrary-engine recovery.

Commands produce a 16×16 native metatile buffer. Conversion maps the visible 16×15 region to 32×30 Forge cells at the same origin. Every 16×16 native fixed Solid cell becomes four 8×8 Forge Solid cells; Empty becomes four Empty cells. Unknown cells, wrapping/cross-row commands, a nonempty hidden row and unsupported native semantics prevent conversion.

The conversion shows raw command geometry using the proven reset palette and actual PB53 CHR-RAM upload. Native random clouds, grass/platform decoration, later palette changes and game-state effects are omitted. The native unpacker's retained-buffer behavior is checked against executed upload bytes rather than assumed from the distributed CHR asset. CHR data with unknown initial-state dependence is refused for import.

Full-solid obstruction, one-way landing, hazards, moving/cycling blocks, teleports, scrolling and actors are separate native meanings. This subset never collapses all nonempty cells into Solid. Forge controls, jump/gravity, room bounds and the authored player are adaptations; original gameplay, goals, audio and physics are not reconstructed.

## Editing collision

For the included map, each graphic tile has a consistent collision meaning, so the ordinary **Collision** tab's tile properties are authoritative. Change the floor tiles to Empty, save/reopen and rebuild to observe falling through the drawn floor.

When identical graphics carry different cell meanings, conversion uses existing linked metatile quadrant overrides. Those overrides take precedence over raw tile properties. Edit the linked definition's collision for those cells. Raw graphics or attribute edits can detach a metatile link under existing reconciliation rules; collision then falls back to tile properties. Inspect the resulting collision after such edits. No separate hidden collision model is added.

## Evidence and boundaries

The native decoder suites compare original assembled CPU map writes and predicates. The graphics suite compares actual CHR-RAM uploads, palette writes and raw metatile rendering. Integration checks use generated Forge 6502 execution to verify collision editing and save/reopen/rebuild. Shared lifecycle tests compare A1 reports, projects, ROMs and import behavior with the frozen background candidate.

The complete current gate is recorded in `test-results/candidate/Summary.json`; clean-extraction proof and browser reports accompany the candidate. Missing browser launches record blocked status with zero checks. CPU/VM results do not establish browser layout/native dialogs, a full original-game boot, independent-emulator behavior, listening, phone/controller or physical NES acceptance. Owner acceptance remains separate.

The original cartridge and complete source/toolchain/license checkpoint are retained under `examples/RE_Native_Map/`. Its mixed upstream notices are preserved; native audio implementation is not incorporated into the Forge application. Original input bytes are unchanged, and no native encoder or patch workflow is implied by canonical conversion.
