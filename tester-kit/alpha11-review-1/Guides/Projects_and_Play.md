# Projects, navigation, building and play

This guide describes the current **2.0.0-alpha.11 / Audio Tool Import** application. It covers the shared controls you use around every art, gameplay, audio and reverse-engineering task. Continue with [Art and Scenes](Art_and_Scenes.md), [Gameplay and World](Gameplay_and_World.md), [Audio](Audio.md), or [RE and Code](RE_and_Code.md) for the detailed tools. The longer [blank-project tutorial](../Tutorial.html) remains the path for building a first World.

## Open the application and find the controls

On Windows, extract the complete review-kit ZIP first. Open `START_HERE.html`, then **Open NES Forge**, or open [NES_Forge.html](../NES_Forge.html) directly in a browser. Keep this guide in another window. The application is a standalone HTML file; the tutorial is a companion document. Opening a documentation page alone does not open an editor project.

The top strip contains authoring tabs and project/build controls. The main canvas or editor is on the left, with tools and properties in the sidebar. On narrower screens the panels stack vertically. Scroll both the upper controls and the sidebar when needed; expandable headings such as **Gameplay** and **Latest build details** may be closed. On a phone, use **EMULATOR → Play view** for playing; the desktop layout gives more room for authoring.

The tabs are views of related project data, not separate saved documents:

| Tab or panel | What it is for |
| --- | --- |
| SCENE | Paint an individual screen, choose scene palettes, place retained entities, and configure scene properties and Gameplay. |
| CHR SHEET | Draw or inspect the background and sprite tile pixels owned by the selected Scene. |
| METATILES | Define reusable 16×16 blocks from four background tiles, with a palette and quadrant collision. |
| WORLD | Arrange metatiles across screens; author rooms, markers and camera regions; configure World Runtime. |
| ATTR MAP | Inspect and edit background palette assignments. |
| SPRITES | Place and edit the Scene's hardware sprite/OAM entries. |
| METASPRITES | Assemble reusable multi-piece poses. |
| ANIM | Sequence poses or tiles, set durations, contact boxes and frame-entry events. |
| ENTITY STUDIO | Bind animations to retained scene entities and preview their states. |
| AUDIO | Compose tracker music and SFX, edit instruments, preview sound, import/export supported scores and configure Audio Runtime. |
| CODE | Edit and assemble the project's single assembly text; open the separate multi-file Source Workspace. |
| COLLISION | Assign tile collision properties. Metatile quadrant overrides are edited in METATILES. |
| TECH DOCS | Read the built-in capability overview. Use these current guides for detailed procedures and corrections to older wording. |
| EMULATOR | Run a generated or loaded ROM; use touch/controller input, frame history and capture tools. |
| RE / DISASM | Inspect original files and runtime evidence, use supported recovery methods, and investigate code/data. |
| GAMEPLAY CORE / BEHAVIOR GRAPH | Panels reached through Gameplay; edit canonical actor and behavior records. They are not additional project files. |

A pose in METASPRITES, a Scene canvas and the running ROM can show different things because each represents a different stage of the work. **Build & Run** compiles current authoring changes. Switching tabs does not update the already running ROM.

### Shared toolbar and status controls

| Control | Purpose and practical effect |
| --- | --- |
| Grid | Toggle a grid overlay in applicable editor views. It does not add lines to exported artwork. |
| Attr | Show the attribute/palette overlay where supported. |
| Meta | Show metatile boundaries where supported. |
| Zoom, 2x/3x/4x | Change editor canvas magnification. It is not emulator speed or ROM resolution. |
| Upload Image | Convert a browser-supported image into a new constrained NES Scene. Conversion can change colors and pixels; inspect its result. |
| Load .zip Pack | Restore a Forge export ZIP or supported raw tile pack. A complete `project.json` in the ZIP takes precedence over individual asset files. |
| Export | Save a portable project-and-assets ZIP. |
| Build .NES ROM | Compile the current project and offer the executable ROM through Save As. |
| Build & Run | Compile the current project and load/run that result in EMULATOR. It does not substitute an old successful build if compilation fails. |
| Import ROM | Append supported Forge assets or a runtime capture to the workspace and retain original ROM bytes. It is not a universal native-project importer. |
| Clean Cache | After confirmation, dismiss crash-recovery data and stop temporary audio/playback. It preserves the open project and named browser saves. |
| Scene selector | Change the active Scene; art tools use that Scene's assets. |
| Scene `+` / duplicate / delete / rename icons | Add a blank Scene, create an independent copy, remove the selected Scene, or change its name. Read deletion warnings and check references afterward. |
| Undo / Redo | Move through recorded editor changes. New edits after Undo replace the redo future. |
| Copy / Paste | Copy/paste the selected tile in supported art views. These buttons do not copy an entire project. |
| Gameplay | Open the SCENE Gameplay panel and its build-mode settings. |

The bottom bar reports the selected **Tile**, use count, **Pal** palette, pointer **Pos**, **Zone**, undo depth, tile clipboard, unique/free tiles and metatile count as applicable. Error/status text appears on the left. Hover a shortened message to read its tooltip. The **Modified/Saved** status has separate timestamps for browser save, recovery and portable save; these are different destinations.

### Keyboard and linked windows

Outside editable text fields, **Ctrl+Z** undoes, **Ctrl+Shift+Z** or **Ctrl+Y** redoes, and **Ctrl+S** opens portable **Save Project As…**. Ctrl+C/V operate on tiles only in applicable art views. Text inputs retain normal text-editing shortcuts. On macOS the corresponding modifier is Command. Escape closes the palette picker and clears the retained entity placement tool.

Right-click an authoring tab for **Open in new tab**, **Open all views in tabs**, or **Detach as popup window**. Middle-click also opens the selected view. These explicitly linked windows share whole-project edits within the same browser session; they are useful for keeping CHR and SCENE visible together. The small dot beside the tabs reports linked peers. Browser popup restrictions or unavailable cross-window messaging can prevent linking. The retained “Open all” command opens its configured view set; open any omitted newer view individually. This is not collaborative Git synchronization, and it does not stream edits into a running ROM. **LiveLink is inactive** in this candidate. Save portable checkpoints before editing from multiple linked windows.

## Start, save and reopen a project

### Fresh launch and New Project are different starting points

| Start | Result |
| --- | --- |
| Fresh page launch without a restored project | `Untitled`, one blank `Untitled Scene`, **Scene viewer / custom assembly** mode, no example loaded. Recovery may be offered separately. |
| New Project, then confirm | `My First NES Game`, one blank `My First Room`, **Single-room platformer** mode, no Player, art, animations or Worlds. World Runtime, Audio Runtime and Gameplay Core start disabled. |

**New Project does not create a finished playable room.** It prepares the single-room settings; add and select the required Player and animation bindings before that mode can build. For a simple art or music demonstration, switch **Gameplay → ROM mode → Scene viewer / custom assembly**, leave CODE empty, and build the viewer instead.

New Project replaces the workspace with an undoable boundary. Undo can restore the previous project while this page session and its history remain available. **Open Project**, ZIP restoration and normal browser **Load** instead begin a new project history. Save a portable copy before either route; history is not a backup after closing the page.

### Choose the right save or open action

| Action | What it saves or opens | Use it for |
| --- | --- | --- |
| Save | A named record in this browser's local project database. Saving a loaded browser record updates that record. | Convenient local checkpoints. This is not a file on disk or a Git commit. |
| Load | The browser's named project list, newest first. Select a name to open it; the `×` deletes that saved record after confirmation. | Returning to a project in the same browser/storage context. Deleting a saved record leaves the currently open workspace. |
| Save Project As… | Complete native `.nesforge.json` through the Save As dialog. | Portable editing backup, moving machines, review and source history. |
| Open Project | Native project JSON selected in the file picker. | Reopen a portable `.nesforge.json` or `project.json`. The visible picker accepts JSON; use Load .zip Pack for a ZIP. |
| Export | `.nesforge.zip` with complete `project.json` and exported assets. | Native backup plus assets for another workflow. Individual binary files mainly reflect the active Scene; `project.json` carries the whole project. |
| Load .zip Pack | Complete Forge export ZIP, or the supported tile-pack layout. | Restore the whole exported project, or start from supplied binary art. It replaces the loaded project rather than merging all possible file types. |
| Open Forge ROM | Supported generated Forge `.nes`, replacing the workspace after confirmation. | Backend-specific editable recovery. Keep native JSON/ZIP as the primary backup. |
| EMULATOR → Load ROM | A ROM in the emulator. | Play/investigate a file without converting it into the active editable project. |

You can also drop a project JSON, supported ZIP, image, or `.nes` onto the application. A dropped `.nes` follows **Import ROM**, not Open Forge ROM. Use the explicit buttons when the difference matters.

For raw tile packs without `project.json`, the retained loader expects a background CHR file of at least 4,096 bytes and recognizes names such as `tiles.chr`, `sprites.chr`, `nametable.bin`, `attributes.bin`, `palettes.pal`, `sprite_palettes.pal`, `oam.bin` and `scenes.json`. This is a bounded asset layout, not arbitrary ZIP interchange. Duplicate ambiguous names, damaged ZIP checksums and malformed assets reject with an error.

### Tutorial: make a portable checkpoint and prove that it opens

1. Finish the current edit and choose **Save Project As…**.
2. Give the file a useful name such as `MyGame_terrain-01.nesforge.json`.
3. Choose **Choose location & save…** if available. In the operating-system picker, select a folder you can find again and save.
4. If the picker is unavailable, choose **Use browser download**. Check your browser's Downloads list and confirm the downloaded file is present.
5. Open a separate, independent application window for verification, or finish saving before replacing the current workspace.
6. Choose **Open Project** and select that JSON. Check the Scene name, a visible edit and any important AUDIO/World settings.

**Expected result:** the project opens as editable data, including the saved art and project settings. No ROM recovery or reconstruction is needed. A download-requested message means the browser was asked to save a file; verify its completion in Downloads. Renaming the output file is not the same as renaming the project's internal name; **Save** offers the project-name prompt.

The Save As dialog also serves ZIP, ROM, ASM and supported report downloads. **Cancel** does not start a fallback download. In an embedded preview, the location picker may open a helper window; if the host blocks it, open the HTML directly or use browser download. The app cannot tell you the browser-controlled destination folder. A canceled or failed save leaves the workspace available.

### Recovery and temporary state

If **Recovery found** appears, choose **Restore** to recover the retained workspace, then save it normally. **Dismiss** discards that recovery copy and allows a new one to be created. While that decision is pending, autosave is held so the old recovery is not silently overwritten. If recovery cannot be read, the app preserves it and reports the problem; do not dismiss it until you have decided it is no longer needed.

Browser saves and recovery can depend on browser profile, site/file context and storage permissions. Clearing browser data, private browsing, moving to another browser, or opening from a different context can make them unavailable. A portable JSON/ZIP is the reliable transfer between these contexts.

The native project contains Scenes, art, Worlds, metasprites, animations, Gameplay Core, tracker/instrument/SFX data, runtime switches, single-file CODE and retained original ROM bytes when present. It does **not** save the currently executing emulator state, frame-history buffer, controller mappings, RE runtime checkpoints/trace session, or the separate multi-file Source Workspace. Save source-workspace exports and import-source receipts separately. MIDI/MusicXML exports are score conversions, not complete project backups.

### Compatibility and ROM recovery boundaries

Current native projects use **schema 12**. Supported older projects migrate into this model, with newer features disabled when absent. A future/unsupported schema, invalid format or malformed data is rejected before the active project is replaced. An RE inspection or evidence JSON is not a project JSON. Explicit downgrade export to an older schema is unsupported.

| File or route | Recovery boundary |
| --- | --- |
| Native project JSON / exported ZIP | Complete supported authoring representation, including records that may still need repair before building. |
| World Runtime ROM, layout 4 / WG17 | Restores its checked embedded authoring source. A previously imported ROM is omitted from that embedded source to avoid recursion; the newly opened ROM becomes the retained original. |
| Single-room ROM, layout 3 / GP16 | Partial editable recovery: scene/art/retained bindings and legacy gameplay settings. Gameplay Core source is not embedded and reopens disabled/empty. It is not a complete music/game source backup. |
| Other ROM | Playback, inspection, capture and specifically supported recovery profiles only. Importing a ROM does not generally recover original maps, code or music authoring. |

World ROMs require **Open Forge ROM**, rather than append-style Import ROM. A supported ROM opening is undoable; ordinary project JSON opening starts new history. Keep the original source files and project backup alongside executable output.

## Build, inspect errors and test the result

### Choose the output you mean

| Route | Result and prerequisites |
| --- | --- |
| Scene viewer / custom assembly, CODE empty | Generated viewer of selected Scenes. Start cycles the selected scenes. A viewer does not automatically provide Player movement. |
| Single-room platformer | Fixed 256×240 room with selected Player, required animation bindings, solid terrain and optional training target. |
| World Runtime enabled in WORLD | Generated World traversal with an explicit starting World, start marker and Player. It follows World resource dependencies. |
| Authored CODE | Your assembly controls the program. Generated gameplay and Audio Runtime are not silently inserted into arbitrary custom assembly. |
| CODE → Source Workspace → Build source ROM | Independent bounded source build with separate exports. It does not replace the active project or automatically load the emulator. |

For packed viewer/single-room work, **Build Scene Set** in the shared lower sidebar determines included Scenes and their order. It is visible from multiple tabs, including SCENE and CODE. **Include first 7** is a quick selection aid for the seven-scene packed limit; it is not an automatic choice of all dependencies. **Preflight Build** checks the current plan and shows diagnostics without downloading or running a ROM. A workspace may contain more Scenes than its selected output can hold. World Runtime uses its own reachable dependencies, so changing the viewer's Build Scene Set does not choose the World start.

The generated profiles use mapper 0/NROM with fixed PRG/CHR capacity. A large project can exceed code, metadata, atlas, actor, audio or compressed-source limits before reaching a visible editor collection limit. Build errors identify the failed requirement; output is not silently truncated. Passing preflight does not replace compiling and testing the ROM.

### Tutorial: build a blank viewer without inventing a Player

1. Save existing work, choose **New Project**, and confirm.
2. Choose **Gameplay**, then **ROM mode → Scene viewer / custom assembly**.
3. Leave CODE empty and World Runtime, Audio Runtime and Gameplay Core disabled for this first test.
4. Choose **Build & Run**.
5. In EMULATOR, check the loaded result and frame count. A blank screen is expected because no art has been drawn.
6. Draw a visible tile and paint it in SCENE using [Art and Scenes](Art_and_Scenes.md), then choose **Build & Run** again.

**Expected result:** the second ROM displays the edited Scene. This proves the art-to-build path without requiring single-room gameplay. Choose **Build .NES ROM** when you also want the executable file for another emulator or a tester.

**Assemble (Ctrl+Enter)** in CODE checks/assembles the code editor text; it is not equivalent to building the complete project ROM. **Reset** in EMULATOR resets the loaded program and pauses it. It does not compile new editor changes. **Run Original ROM** loads retained original cartridge bytes, so it deliberately ignores subsequent authoring edits.

### When a build fails

Open **CODE → Build Log** to read the complete failure. Gameplay also exposes **Latest build details** for its **Build & Play** route. Correct the named reference, runtime setting, unsupported operation or capacity issue, then build again. A failed build clears the current build result so a previous ROM cannot masquerade as the new one. Do not interpret a still-visible old emulator picture as proof that a new build succeeded.

Common fixes include selecting a Player for single-room mode, including a needed source Scene, completing animation bindings, turning off an unintended runtime, or saving and clearing custom CODE before using a generated gameplay mode. Use the relevant guide to fix the source requirement rather than disabling unrelated validation.

## Play with the bundled emulator

### Emulator toolbar and readouts

| Control | What it does |
| --- | --- |
| Load ROM | Load supported `.nes` bytes for emulation. It does not author a native project. |
| Run Original ROM | Load/run the original ROM retained by an import/open. An error is shown if the project has none. |
| Run / Pause | Start or pause execution of the loaded machine. |
| Stop | Pause execution or interrupt ROM initialization; it does not delete the project. |
| Frame | Execute an ordinary frame while paused. This differs from timeline Forward when revisiting stored history. |
| Reset | Restart the loaded machine and leave it paused; choose Run to continue. History and session-dependent RE state are reset. |
| Capture Runtime Scene | Recover the current logical PPU/CHR/OAM scene representation; it can differ from the scrolled visible picture. |
| Bake Visible Frame | Convert the rendered picture into a constrained static background. This can approximate the image and removes separate sprite placements in the capture. |
| Hybrid Capture | Capture background and editable sprites through the existing hybrid route. Read its report and limits in [RE and Code](RE_and_Code.md). |
| New Scene / Replace Current / Merge Fields | Choose capture destination. Merge exposes explicit `nt`, `attr`, `pal`, `sprPal`, `oam`, `chr` and `sprChr` field switches. Save before replacing or merging. |
| Trace 20 | Execute/log a small CPU instruction trace. It invalidates incompatible frame history and is not a 20-frame playback button. |
| Audio / Sound on/off | Mute/unmute emulator output. It does not change the project's Compile Audio Runtime setting. |
| Play view / ▶ Play view | Expand the existing canvas and controls without rebuilding, reloading or resetting the ROM. |

Below the screen, **A/X/Y** are CPU registers, **SP** is the stack pointer, **PC** the instruction address, **P** processor flags, **CYC** executed CPU cycles and **FRM** completed frames. The sidebar shows PPU control/mask/status, VRAM address, Fine X scroll, mapper/bank/mirroring information, palette RAM and active OAM count. These are observations of the loaded machine, not editable project settings.

### Keyboard, touch and controller use

Click the emulator display before using keyboard controls so an editor text field or button does not receive them.

| NES button | Keyboard |
| --- | --- |
| A | Z or A |
| B | X or S |
| Select | Shift |
| Start | Enter |
| Direction pad | Arrow keys |

**Run** starts emulation; **Start** is a button sent to the game. In the generated single-room game, Left/Right moves, A jumps, B attacks and Start restarts. World Runtime also uses Up at a linked marker. Other loaded ROMs define their own controls.

On touch screens, hold a D-pad direction and A/B with separate fingers. Slide inside the D-pad to change direction or select a diagonal. **Hide touch / Show touch** changes visibility. Opposing horizontal or vertical directions cancel to neutral when input sources are combined.

For a USB/Bluetooth controller:

1. Connect or pair it through the device's operating-system settings.
2. Focus the browser and press a controller button so the browser can expose it.
3. Open **Controller** and choose the listed device, or **No controller** to disable it.
4. For each NES action, select its mapping button, release all physical controls, then press the desired button or move a stick axis.
5. **Cancel mapping** stops capture; **Reset mapping** restores standard defaults or an empty mapping for a nonstandard device.
6. Choose **Done**, release controls, then **Run** to resume.

The standard browser mapping uses the south face button for A, east for B, Back/Select for Select, Start/Menu for Start, and D-pad or left stick for directions. Physical printed letters vary. One controller feeds one local NES port; this is not multiplayer. Mappings last only for the page session. After disconnection, select the controller again. Browser/device exposure determines whether a particular controller works; a USB-C connector alone is not a compatibility promise.

Controller settings pause play. Input is released when the page loses focus, playback pauses, tabs change, ROMs reset/replace, or expanded view/settings changes. Return controls to neutral before resuming; held keys/sticks should not be assumed to carry through an interruption.

### Fullscreen, performance and speed

**Fullscreen** asks the browser for native fullscreen. If unavailable or declined, expanded Play remains usable in the page. **Exit to editor** returns the same loaded machine to the ordinary layout. Entering/exiting Play view preserves the ROM and running/paused state while releasing input.

The performance readout shows emulation FPS (target about 60.1), frame processing time, scheduled audio queue, gaps/resyncs, backlog and timing discards. The audio queue is not measured speaker latency. If play lags, compare the same ROM in ordinary and expanded Play with history recording and RE tracing off; record the device, browser, view, sound state and these readings. “Frame exceeded 200 ms safety budget” means execution paused to protect the page; retain that error for a report.

There is no continuous fast-forward/2× playback-speed control here. **+60 frames** advances a batch; **AUDIO → Speed** changes tracker timing; editor **Zoom** changes magnification. These controls do not change real-time emulator speed. The emulator supports selected mappers and remains approximate for raster/IRQ/DMC timing. Use an independent emulator or hardware when verifying output compatibility beyond the bundled player.

## Revisit a frame with Playback tools

1. Load or build a ROM, open **Playback tools**, and turn **Record history: off** to **on** before the event you want to inspect.
2. Choose **Run** and play through the event normally.
3. Pause, then select **Back 1** or **−60 frames**.
4. Read the displayed history range and current frame. Use **Forward 1** or **+60 frames** to return through retained future states.
5. Choose **Run** explicitly when ready to play again.

**Expected result:** retained machine state and the displayed frame move together. Back/Forward pauses playback, releases live controls and discards queued host audio. Navigating is muted. At the live edge, Forward executes real frames with neutral controls; it does not press Start, force a stage, damage an enemy or reconstruct game meaning. Timed events may still happen through the ROM's own program.

History is bounded by both **300 stored states** and **32 MiB of encoded stored data**. Older states are evicted, so read the actual range rather than assuming a fixed number of seconds. **Record history: off** drops the buffer. Reset, another ROM, CPU Trace and page reload invalidate or clear history. **Cancel navigation** interrupts a running batch without resuming play. Running or using ordinary Frame from a past state discards its old future and creates a new execution branch.

History is temporary emulator state. It is separate from editor Undo/Redo and is not saved in project JSON. For named machine checkpoints, scripted input and reversible RAM experiments, use [RE and Code](RE_and_Code.md); timeline navigation is not the complete debugger workflow.

## Keep the right evidence and troubleshoot

Project files answer “what can I edit?” ROMs answer “what executes?” Reports answer “what did the tool inspect or convert?” Keep each kind with its purpose.

The ordinary build route displays **Preflight Build**, **Build Log** and **Latest build details**; it has no general “Export all diagnostics” button. Copy the exact relevant log text into [Feedback_Template.txt](../Feedback_Template.txt). Specialized RE, source-intake, recovery, score-import and mashup panels have their own report/recipe downloads. Export those from the panel that produced them and keep the original input. An evidence/report JSON does not reopen through Open Project. After FamiStudio import, save both the native project and **source + report** if you need the imported original text later.

| Symptom | Check and next action |
| --- | --- |
| Open NES Forge link fails | Confirm the ZIP was fully extracted and `NES_Forge.html` exists beside the entry page. Re-extract the complete kit; a docs-only folder cannot launch the app. |
| A sidebar control seems absent | Scroll the sidebar and upper toolbar; expand its section. On a narrow display, the sidebar can be below the canvas. |
| New Project will not build | It selects single-room mode but has no Player. Complete the gameplay setup, or explicitly select viewer mode for an art/music test. |
| The emulator shows old art | Choose Build & Run and verify its build log. Reset and Run Original do not compile editor changes. |
| A saved project is missing from Load | Load lists browser storage only. Use Open Project for a downloaded JSON, or Load .zip Pack for an exported ZIP. |
| The file picker does not show a ZIP | Open Project selects JSON. Use Load .zip Pack instead. |
| Save was clicked but no file is on disk | Plain Save writes browser storage. Save Project As writes a file; check its status and the browser Downloads list. |
| A JSON says it is an inspection report | Keep it as evidence. Use the appropriate recovery action to generate a native Forge project, or reopen the original ROM in RE. |
| Keyboard Start/arrows do nothing | Close text/settings dialogs, click the emulator screen, release controls and choose Run. Start and Run have different jobs. |
| No sound | Check emulator Sound, browser/tab/device output, and whether the loaded ROM has music. Authored tracker notes need Compile Audio Runtime and the relevant music setting before being included in a generated ROM. Browser tracker Play is separate. |
| Back is disabled | History must have been enabled before earlier frames were recorded. Reset, load, Trace or eviction may have removed them. |
| Forward stays on the title screen | Forward uses neutral controls. Run and press the game's Start input normally. |
| Controller is not listed | Connect it through the OS, focus the page and press a button. If the browser does not expose it, use keyboard/touch and report the device/browser combination. |
| ROM opens but authoring data is missing | Check its recovery backend. Single-room and foreign ROMs do not promise complete native source recovery; reopen the saved JSON/ZIP. |

For a useful issue report, include the candidate name, the relevant project/ROM/input file, exact button sequence, expected and observed result, full error/log text, and device/browser details. A screenshot helps with layout, but it cannot replace the project or exact error. The current guides document intended and source-checked behavior; previous test counts and old manual screenshots are historical evidence, not proof of every device scenario.

## Source audit for this guide

Reviewed against active source at candidate `audio-tool-import-1`, application commit `ffb57ea`. Key owners are `app/src/shell-prefix.html`; `services/project-store.js`, `services/release-info.js`, `services/build-services.js`, `services/emulator-play-ui.js`, `services/emulator-input.js` and `services/emulator-timeline.js`; retained `legacy/00-editor.js`, `02-interaction-bootstrap.js`, `04-saveas-chr.js`, `05-foundation.js`, `24-ui165.js`, `26-project166.js` and `28-ui166.js`; and `source/source-workspace-ui.js`. The existing Manual, format notes and mobile/navigation guides were cross-checked, with active services taking precedence over obsolete release identities and replaced documentation functions. This audit did not add new application behavior or establish new physical-controller/hardware acceptance.
