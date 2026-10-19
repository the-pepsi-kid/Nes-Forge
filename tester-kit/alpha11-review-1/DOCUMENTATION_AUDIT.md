# Documentation coverage review

This audit concerns the `audio-tool-import-1` application, commit `ffb57eab61d2e69ae0b92838c7b55748423b3140`, and the documentation assembled around it. It checks feature groups, workflow boundaries and the existing first-session instructions against current source. It does not certify every dynamically created button, hardware combination or tutorial action.

The application has 15 editor tabs. A fresh headless Chromium launch confirmed their current labels and the dynamically mounted panel headings. Source inspection supplied the behavioral distinctions below. That launch was an inventory check, not a complete browser replay of the tutorial.

## Coverage map

Guide names below identify the current user-guide chapters. Historical reference chapters remain useful supporting material, but are not the current feature inventory.

| Visible area or workflow | Current guide | Source ownership checked | Essential distinction |
| --- | --- | --- | --- |
| Project bar and global toolbar | Projects and Play | `legacy/28-ui166.js`, `services/project-store.js`, shell | New Project, portable Save As, browser Save/Load and Open Forge ROM have different effects. |
| Portable files, recovery and cache | Projects and Play | `services/project-store.js`, `legacy/04-saveas-chr.js` | Downloaded project JSON/ZIP is the editable backup; recovery and browser storage are local conveniences. |
| Linked editor views | Projects and Play | `legacy/00-editor.js` | Linked tabs synchronize whole projects; LiveLink is inactive. |
| Build and ROM-opening choices | Projects and Play | `services/build-services.js`, `world/world-rom.js` | Build & Run compiles current edits; Run Original plays retained bytes; source recovery depends on the ROM backend. |
| EMULATOR playback and controls | Projects and Play | `services/emulator-play-ui.js`, `services/emulator-input.js`, shell | Run/Pause differs from NES Start; input is released on interruption; actual device acceptance is separate. |
| SCENE and scene properties | Art and Scenes | `legacy/00-editor.js`, shell | Source Scene art is separate from World placements. Scene metadata does not promise a matching generated runtime. |
| CHR SHEET and palettes | Art and Scenes | `legacy/00-editor.js`, `legacy/04-saveas-chr.js`, shell | Tile pixels, palette indices and displayed colors differ; sprite color zero is transparent. |
| Image and CHR import | Art and Scenes | `legacy/00-editor.js`, `legacy/04-saveas-chr.js`, `re/re-native-assets-ui.js` | Image quantization or physical CHR recovery does not recover original map semantics. |
| METATILES | Art and Scenes | `legacy/07-metatiles.js` | Definitions are shared; linked Scene cells and World cells reference them. Detaching is different from deleting a definition. |
| ATTR MAP | Art and Scenes | `legacy/00-editor.js`, shell | Attribute palettes color groups of background tiles; they do not repaint CHR pixels. |
| SPRITES and METASPRITES | Art and Scenes | `legacy/13-metasprites.js`, shell | Hardware OAM placement and reusable composed poses are separate editors. |
| COLLISION | Art and Scenes | `legacy/00-editor.js`, `legacy/07-metatiles.js` | Authorable property names do not imply runtime support; generated profiles execute the supported Empty/Solid paths. |
| ANIM and frame events | Art and Scenes | `legacy/17-frame-editor.js`, `legacy/14-composed-animation.js` | Poses, timing, contact areas and frame-entry events are separate authored data. |
| ENTITY STUDIO | Art and Scenes | `legacy/18-entity-studio.js` | Named animation states must be assigned to an entity; preview is not the generated game. |
| Runtime capture and static adaptation | Art and Scenes; RE and Code | `legacy/03-runtime-capture.js`, `legacy/05-foundation.js` | Logical capture, visible-frame baking, hybrid capture and static conversion are different operations. |
| WORLD tools, regions and navigation | Gameplay and World | `legacy/08-world.js`, `legacy/11-world-interaction.js` | Maps use metatile cells; rooms/cameras/markers are distinct records. Rooms do not create walls. |
| WORLD RUNTIME | Gameplay and World | `world/world-config.js`, `world/world-ui.js`, `world/world-engine.js` | Explicit start references, body size and screen transitions are required; Scene Build Set does not choose World dependencies. |
| Retained single-room Gameplay | Gameplay and World | `legacy/24-ui165.js`, `legacy/28-ui166.js` | A fresh blank project selects a generated single room but does not yet contain a valid player. |
| Gameplay Core tables and Behavior Graph | Gameplay and World | `gameplay/gameplay-ui.js`, `gameplay/gameplay-graph.js` | Graph and tables edit the same records; executable operations and capacity are bounded. |
| Seeded mashup and Movement rules | Gameplay and World | `mashup/mashup-ui.js`, `gameplay/movement-rules-ui.js` | Preview precedes explicit application; reproducible recipes require their exact source projects. |
| AUDIO authoring and runtime | Audio | `legacy/00-editor.js`, `audio/audio-ui.js`, `services/workshop.js` | Audio currently lives in a normal Forge project; browser preview and ROM playback are separate. |
| Audio interchange and FamiStudio import | Audio | `audio/audio-import.js`, `audio/audio-export.js`, `audio/audio-tool-import-ui.js` | Supported score conversion is not a full sound-project backup. FamiStudio text import is a bounded subset. |
| RE / DISASM general analysis | RE and Code | `re/re-analysis-ui.js`, shell | Physical-file analysis and mapped emulator disassembly are different views; candidate instructions are not proven original source. |
| Recovery discovery and native assets | RE and Code | `re/recovery-methods-ui.js`, native recovery UI modules | Recognition, conversion readiness, native-copy editing and project import are separate checks. |
| Recover editable project | RE and Code | `re/re-ui.js` | This panel is the bundled Bridge Room profile, not universal game recovery. |
| Runtime investigation, history and experiments | RE and Code | `re/re-runtime-ui.js`, `re/re-experiments-ui.js`, `services/emulator-timeline.js` | Observations and checkpoints are session state; restoring an experiment rewinds the whole machine. |
| CODE and isolated source workspace | RE and Code | `source/source-workspace-ui.js`, `source/source-intake.js`, shell | Source intake is inspection; source workspace builds and backups are separate from the ordinary project. |
| TECH DOCS | Projects and Play; guide index | `services/documentation.js` | Read-only abbreviated overview; current external guides supply newer detail and take precedence over historical references. |

## Existing first-session tutorial review

The established nine desktop steps remain the first-session path. Their teaching sequence and style should be retained. The following checks were made against source, not asserted as a new end-to-end acceptance run.

| Tutorial part | Source check or pitfall |
| --- | --- |
| Before starting | New Project replaces the workspace and starts one blank scene. Compile Audio Runtime and Gameplay Core are separate switches outside CODE. |
| 1. Background tile | `$01` is tile 1; `$00` remains blank. Pixel colors change stored tile indices, while Preview Palette chooses how they display. |
| 2. Collision | Tile 1 Solid and tile 0 Empty is compatible with this generated World exercise. |
| 3. Metatiles | Capturing a selected 16×16 cell preserves quadrant collision. Detach the source cell before creating a World to avoid seeding unwanted source placements. |
| 4. World and spawn | Width and Height are separate fields. Two horizontal screens have 32×15 metatile cells. Spawn cell `(3,12)` supplies feet pixel `(56,200)`. |
| 5. Sprite and pose | Sprite `$10` is decimal tile 16. One 8×8 piece at `(0,0)` has a centered-feet origin of `(4,8)`. |
| 6. Animations | Idle/walk/attack can share a first pose, but attack must be nonlooping. Art alone does not supply the collision body. |
| 7. Player bindings | Assign exact lowercase states to the Player. Naming an animation is not an entity binding. |
| 8. Runtime | Select World, Spawn, Player source scene and Player explicitly. Change the default 12×22 body to 8×8 for this exercise. Build & Run is required after edits. |
| 9. Save/reopen | Native JSON is the editable backup. ROM recovery has backend-specific limits and does not replace that backup. |
| Optional phone step | Delivery, physical controls, actual sound and device performance require separate observations; the silent tutorial cannot prove audio works. |

## Historical wording and current precedence

The restored long manual and operator tables intentionally retain 1.9.0 material. The current guide, manual introduction, operator-reference introduction, alpha update page and source-snapshot banner now give precedence to the five current chapters. In particular, old statements about an unavailable Behavior Graph, incomplete RE integration, unavailable score export, historical test totals or future version promises must not be read as the current application contract.

The preserved `Reference/Control_Index.csv` contains 439 historical rows. `Reference/Alpha11_Controls.csv` was a selected supplement, not an exhaustive current control inventory. Their row counts must not be reported as newly tested controls.

The source-package `app/docs/CURRENT_GUIDE.md` still carries a 1.9.0 identity, and in-app TECH DOCS remains a short overview with older “Roadmap Workbench” wording. They are documentation limitations in the unchanged runtime/source package. Copied source documents remain byte-exact snapshots, with a rendered warning directing readers to the current guide; this update does not claim those source texts or the app's help have been rewritten.

## New-guide review status

| Chapter | Independent content review |
| --- | --- |
| Audio | Reviewed against current handlers and compiler boundaries. Decimal tracker rows, timing, default envelopes, shared pattern references, sound-project limits and SFX execution distinctions match source. |
| Art and Scenes | Reviewed against current authoring handlers. Spot checks covered CHR controls, sprite placement, origin arithmetic, animation-frame duplication, image/ZIP import and static-capture conversion. |
| Projects and Play | Reviewed against source and cross-checked with sibling chapters. Fresh launch versus New Project, JSON-only Open Project picker, browser versus portable saves, reset/paused behavior, cache and bounded history are distinguished. |
| Gameplay and World | Reviewed against runtime/configuration/UI sources and the supplied Scout JSON. Marker names and positions, runtime start, movement presets, body constraints, shared behavior/instance overrides and current operation limits are covered. |
| RE and Code | Reviewed across static analysis, discovery, Bridge/native recovery, native-copy versus transcription, runtime evidence, checkpoints/scripts/RAM edits, assembly, source workspace and source intake. Referenced full-checkout examples and benchmark command exist. |

All identified main workspaces and the dynamic feature groups in the coverage map now have a current chapter. No material feature-group omission was found in this independent pass. One shared-control location was clarified: **Build Scene Set** is mounted in the lower shared sidebar and is visible from multiple tabs, rather than belonging exclusively to SCENE or CODE. The Audio chapter correctly documents decimal tracker rows (`012`); its instrument/order/pattern identifiers use hexadecimal.

This is source and content review, with a fresh browser inventory check. It does not replace the separate packaging/link/browser verification record or claim that every tutorial was replayed end to end. Physical-controller, listening, native OS file-dialog and hardware acceptance remain separate. Final packaging must include the actual `NES_Forge.html`, all linked examples and current application identity; a documentation launcher alone is not a usable test kit.
